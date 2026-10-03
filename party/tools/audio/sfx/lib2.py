"""Round-2 SFX pipeline. Same chain as round 1 (sfx/sfxlib.py) with a 5 ms fade-in
and the shrill -3 dB rule applied to every mode. The API key is read from the
key file inside this process only and never printed or logged."""
import json, os, re, subprocess, sys, time, threading, urllib.request, urllib.error, tempfile, wave
import numpy as np
S = '/tmp/claude-0/-home-user-charlie/d9e11baa-4571-5c8e-89eb-f20e313d6ff3/scratchpad'
D = S + '/sfx2'
RAW = D + '/raw'
OUT = '/home/user/charlie/party/assets/audio'
LOG = D + '/log.jsonl'
lock = threading.Lock()
SR = 44100

def _key():
    with open(S + '/.elevenlabs_key') as f: return f.read().strip()

def log(rec):
    with lock:
        with open(LOG, 'a') as f: f.write(json.dumps(rec) + '\n')

def generate(path, prompt, dur=None, infl=0.6, loop=False, tries=5):
    dst = f'{RAW}/{path}.mp3'
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    body = {'text': prompt, 'prompt_influence': infl}
    if dur: body['duration_seconds'] = max(0.5, min(22, dur))
    if loop: body['loop'] = True
    data = json.dumps(body).encode()
    last = ''
    for k in range(tries):
        req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', data=data,
                                     headers={'xi-api-key': _key(), 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                audio = r.read()
            if len(audio) < 500: return False, 'tiny response'
            open(dst, 'wb').write(audio)
            log({'path': path, 'prompt': prompt, 'dur': dur, 'infl': infl, 'loop': loop, 'ok': True})
            return True, 'ok'
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf8', 'ignore')[:300]
            log({'path': path, 'prompt': prompt, 'http': e.code, 'msg': msg})
            if e.code == 429 or e.code >= 500:
                time.sleep(3 * (k + 1)); continue
            return False, f'http {e.code}: {msg}'
        except Exception as e:
            last = type(e).__name__; time.sleep(2 * (k + 1))
    return False, 'retries exhausted ' + last

def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)
def ff(args): return run(['ffmpeg', '-hide_banner', '-nostats', '-y'] + args)

def dur_of(f):
    r = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f])
    try: return float(r.stdout.strip())
    except: return 0.0

def load(f, sr=SR, hp=30):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(sr)] + (['-af', f'highpass=f={hp}'] if hp else []) + ['-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()

def write_wav(path, y, sr=SR):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(np.round(np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()); w.close()

def volstats(f):
    r = ff(['-i', f, '-af', 'volumedetect', '-f', 'null', '-'])
    mx = re.search(r'max_volume: (-?[\d.]+|-inf) dB', r.stderr)
    mean = re.search(r'mean_volume: (-?[\d.]+|-inf) dB', r.stderr)
    g = lambda m: float(m.group(1)) if m and m.group(1) != '-inf' else -99.0
    return g(mx), g(mean)

def ebur(f):
    r = ff(['-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    s = r.stderr[r.stderr.rfind('Summary'):]
    I = re.search(r'I:\s+(-?[\d.]+) LUFS', s); tp = re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', s)
    return (float(I.group(1)) if I else -70.0), (float(tp.group(1)) if tp and tp.group(1) != '-inf' else -99.0)

def analyze(x, sr=SR):
    if len(x) < 256: return {}
    X = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / sr)
    tot = X.sum() + 1e-12
    band = lambda a, b: float(X[(fr >= a) & (fr < b)].sum() / tot)
    cen = float((fr * X).sum() / tot)
    h = int(sr * 0.01); n = len(x) // h
    rms = np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(axis=1)) if n else np.array([0])
    # spectral flatness (noisiness), 0..1
    Xa = X[(fr > 100) & (fr < 12000)] + 1e-18
    flat = float(np.exp(np.log(Xa).mean()) / Xa.mean())
    lead = 0.0
    thr = rms.max() * 10 ** (-40 / 20)
    above = np.where(rms > thr)[0]
    lead = above[0] * 0.01 if len(above) else 0
    trail = (n - 1 - above[-1]) * 0.01 if len(above) else 0
    # fraction of 10ms frames > 40 dB below peak (dead air)
    dead = float((rms < rms.max() * 10 ** (-40 / 20)).mean())
    return dict(low=round(band(0, 300), 2), lomid=round(band(300, 1000), 2), mid=round(band(1000, 4000), 2),
                hi=round(band(4000, sr / 2), 2), cen=round(cen), flat=round(flat, 3), lead=round(lead, 3), trail=round(trail, 3), dead=round(dead, 2),
                peak_t=round(int(np.argmax(rms)) * 0.01, 2))

def f0(x, sr=SR, lo=150, hi=2500):
    """Fundamental of a pitched tone: strongest spectral peak in [lo,hi] over the
    first 250 ms after onset, refined by parabolic interpolation, then checked
    against sub-harmonics (if a peak at f/2 holds >25% of the energy, take it)."""
    a = int(np.argmax(np.abs(x) > np.abs(x).max() * 0.3))
    seg = x[a + int(0.01 * sr): a + int(0.26 * sr)]
    N = 1 << 16
    X = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), N))
    fr = np.fft.rfftfreq(N, 1 / sr)
    m = (fr >= lo) & (fr <= hi)
    idx = np.where(m)[0]
    k = idx[np.argmax(X[idx])]
    def refine(k):
        al, be, ga = np.log(X[k - 1] + 1e-12), np.log(X[k] + 1e-12), np.log(X[k + 1] + 1e-12)
        p = 0.5 * (al - ga) / (al - 2 * be + ga)
        return (k + p) * sr / N
    f = refine(k)
    # sub-harmonic check
    for div in (2, 3):
        kk = int(round(f / div * N / sr))
        if f / div >= lo:
            w = X[kk - 3:kk + 4]; j = kk - 3 + int(np.argmax(w))
            if X[j] > 0.25 * X[k]: f = refine(j); k = j
    return f

def midi_of(f): return 69 + 12 * np.log2(f / 440.0)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def finish(x, dst, peak_db=-3.3, lufs_target=None, shrill_cut=True, fade_out=None, fmt=None, sr=SR, mp3_kbps=96):
    """x: float mono, already trimmed. Applies 5 ms fade-in, fade-out, gain, writes WAV (<0.4 s) or MP3.
    Returns (path, gain_db, info)."""
    x = x.astype(np.float64).copy()
    d = len(x) / sr
    fi = int(0.005 * sr); x[:fi] *= np.linspace(0, 1, fi)
    fo = fade_out if fade_out is not None else min(0.06, d * 0.2)
    n = int(fo * sr)
    if n > 1: x[-n:] *= np.linspace(1, 0, n) ** 1.5
    info = analyze(x.astype(np.float32), sr)
    pk = np.abs(x).max()
    g = 10 ** (peak_db / 20) / pk
    if lufs_target is not None:
        tmp = tempfile.mktemp(suffix='.wav', dir=D); write_wav(tmp, x * g * 0.5, sr)
        L, _ = ebur(tmp); os.remove(tmp)
        L += 20 * np.log10(2)   # undo 0.5 safety factor
        if L > -60: g = min(g, g * 10 ** ((lufs_target - L) / 20))
    if lufs_target is None and d >= 0.4:   # sustained peak-normalized sounds: keep integrated loudness at or below -14 LUFS
        tmp = tempfile.mktemp(suffix='.wav', dir=D); write_wav(tmp, x * g * 0.5, sr)
        L2, _ = ebur(tmp); os.remove(tmp); L2 += 20 * np.log10(2)
        if L2 > -14: g *= 10 ** ((-14 - L2) / 20); info['lufs_capped'] = True
    if shrill_cut and info.get('hi', 0) > 0.6: g *= 10 ** (-3 / 20); info['shrill'] = True
    y = x * g
    for ext in ('.mp3', '.wav'):
        if os.path.exists(dst + ext): os.remove(dst + ext)
    if fmt is None: fmt = 'wav' if d < 0.4 else 'mp3'
    if fmt == 'wav':
        path = dst + '.wav'; write_wav(path, y, sr)
    else:
        path = dst + '.mp3'
        tmp = tempfile.mktemp(suffix='.wav', dir=D); write_wav(tmp, y, sr)
        ff(['-i', tmp, '-ac', '1', '-ar', str(sr), '-c:a', 'libmp3lame', '-b:a', f'{mp3_kbps}k', '-write_xing', '0', path]); os.remove(tmp)
    return path, 20 * np.log10(g), info

def trim(x, sr=SR, head_rel=30, tail_rel=36, pad=0.002, gap_cut=True):
    """Trim leading silence/pre-noise (first 5 ms frame within head_rel dB of the loudest frame)
    and the trailing tail below loudest-frame minus tail_rel dB."""
    if len(x) == 0 or np.abs(x).max() <= 0: return x[:0]
    h = int(0.005 * sr); n = len(x) // h
    if n < 2: return x
    rms = np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(axis=1)); top = rms.max()
    i0 = int(np.argmax(rms > top * 10 ** (-head_rel / 20)))
    # back up to where the onset starts rising (within the previous 3 frames), then pad
    if gap_cut:
        # skip a stray click before the main sound: a >=100 ms quiet run between onset and the loudest frame
        quiet = rms < top * 10 ** (-40 / 20); ipk = int(np.argmax(rms)); run = 0
        for i in range(ipk, i0 - 1, -1):
            run = run + 1 if quiet[i] else 0
            if run * h >= int(0.1 * sr): i0 = i + run; break
    a = max(0, i0 * h - int(pad * sr))
    above = np.where(rms > max(top * 10 ** (-tail_rel / 20), 10 ** (-62 / 20)))[0]
    b = min(len(x), (above[-1] + 2) * h)
    if gap_cut:
        # cut at a >=100 ms gap (all frames 40 dB under the peak) after the main hit when what follows is a stray blip
        quiet = rms < top * 10 ** (-40 / 20); ipk = int(np.argmax(rms)); run = 0
        for i in range(ipk, b // h):
            run = run + 1 if quiet[i] else 0
            if run * h >= int(0.1 * sr):
                st = i - run + 1
                if (rms[st:b // h] ** 2).sum() < 0.01 * (rms[:b // h] ** 2).sum(): b = (st + 2) * h
                break
    return x[a:b]

def make_loop(x, length, xfade, sr=SR, start=None):
    """Cut `length + xfade` seconds from x (starting at `start`, default the loudest steady middle)
    and equal-power crossfade the extra tail into the head. Result is exactly `length` s."""
    L = int(length * sr); c = int(xfade * sr)
    if start is None: start = max(0, (len(x) - L - c) // 2)
    else: start = int(start * sr)
    seg = x[start:start + L + c].astype(np.float64)
    assert len(seg) == L + c, 'source too short for loop'
    t = np.linspace(0, 1, c, endpoint=False)
    fin, fout = np.sin(t * np.pi / 2), np.cos(t * np.pi / 2)
    out = seg[:L].copy()
    out[:c] = seg[:c] * fin + seg[L:L + c] * fout
    return out

def seam_check(y, sr=SR):
    """Compare the wrap point with normal sample-to-sample behaviour."""
    d = np.abs(np.diff(y)); wrap = abs(y[0] - y[-1])
    w = int(0.02 * sr)
    r_end = np.sqrt((y[-w:] ** 2).mean()); r_start = np.sqrt((y[:w] ** 2).mean())
    return dict(wrap_jump=round(float(wrap), 4), p99_step=round(float(np.percentile(d, 99)), 4), max_step=round(float(d.max()), 4),
                rms_ratio_db=round(float(20 * np.log10((r_start + 1e-9) / (r_end + 1e-9))), 2))

def ffilter(x, af, sr=SR, out_sr=None):
    """Run a float mono signal through an ffmpeg filter chain."""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-af', af] +
                       (['-ar', str(out_sr)] if out_sr else []) + ['-f', 'f32le', '-'], input=x.astype(np.float32).tobytes(), capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()

def repitch(x, ratio, sr=SR):
    """Tape-style pitch change by `ratio` (>1 = higher and shorter), high-quality resampler."""
    return ffilter(x, f'asetrate={sr * ratio:.6f},aresample={sr}:resampler=soxr:precision=28', sr)
