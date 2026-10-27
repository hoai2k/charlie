"""Beat analysis, stretching, loop cutting and loudness for generated music."""
import subprocess, json, re, os
import numpy as np
from scipy import signal

SR = 44100


def decode(path, sr=SR, ch=2):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', str(ch), '-ar', str(sr), '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(out, dtype=np.float32).copy()
    return x.reshape(-1, ch) if ch > 1 else x


def write_wav(path, x, sr=SR):
    x = np.asarray(x, dtype=np.float32)
    ch = 1 if x.ndim == 1 else x.shape[1]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', str(ch), '-ar', str(sr), '-i', '-',
                    '-c:a', 'pcm_f32le', path], input=x.tobytes(), check=True)


def mono(x):
    return x.mean(1) if x.ndim > 1 else x


# ---------------------------------------------------------------- onset envelopes
HOP = 128


def stft_mag(x, sr, n=1024, hop=HOP):
    pad = np.concatenate([np.zeros(n // 2, np.float32), x, np.zeros(n // 2, np.float32)])
    fr = np.lib.stride_tricks.sliding_window_view(pad, n)[::hop] * np.hanning(n).astype(np.float32)
    return np.abs(np.fft.rfft(fr, axis=1)), np.fft.rfftfreq(n, 1 / sr)
    # frame i is centred at time i*hop/sr


def flux_bands(x, sr, bands):
    """Onset envelopes (log spectral flux, half-wave rectified, local mean removed)."""
    S, f = stft_mag(x, sr)
    L = np.log1p(20 * S)
    out = {}
    for name, (lo, hi) in bands.items():
        b = (f >= lo) & (f < hi)
        d = np.diff(L[:, b], axis=0, prepend=L[:1, b])
        e = np.maximum(d, 0).sum(1)
        e = e - np.convolve(e, np.ones(32) / 32, 'same')
        out[name] = np.maximum(e, 0)
    return out, sr / HOP


def env_for_beats(x, sr=22050):
    fb, fps = flux_bands(x, sr, {'full': (30, 8000), 'low': (30, 160)})
    e = fb['full'] / (fb['full'].mean() + 1e-9) + fb['low'] / (fb['low'].mean() + 1e-9)
    return e, fps, fb


def zbeat(env, fps, bpm, a=0, b=None):
    """Complex beat-frequency component of the envelope over frames [a, b)."""
    b = len(env) if b is None else b
    n = np.arange(a, b)
    w = 2 * np.pi * bpm / 60 / fps
    return np.sum(env[a:b] * np.exp(-1j * w * n))


def tempo_scan(env, fps, lo, hi, step=0.01):
    bpms = np.arange(lo, hi, step)
    n = np.arange(len(env))
    mags = []
    for T in bpms:
        w = 2 * np.pi * T / 60 / fps
        mags.append(abs(np.sum(env * np.exp(-1j * w * n))) + 0.5 * abs(np.sum(env * np.exp(-2j * w * n))))
    mags = np.array(mags)
    return bpms, mags


def phase_track(env, fps, bpm, win=12.0, hopw=6.0, skip=0.0):
    """Beat phase (seconds, mod period) per window plus pulse clarity."""
    W, H = int(win * fps), int(hopw * fps)
    per = 60 / bpm
    res = []
    for a in range(int(skip * fps), len(env) - W + 1, H):
        z = zbeat(env, fps, bpm, a, a + W)
        clar = abs(z) / (env[a:a + W].sum() + 1e-9)
        t0 = (-np.angle(z) / (2 * np.pi) * per) % per
        res.append(((a + W / 2) / fps, t0, clar))
    return res


def unwrap_ms(t0s, per):
    ph = np.unwrap(np.array(t0s) / per * 2 * np.pi)
    return ph / (2 * np.pi) * per


def estimate_tempo(x22, target, rng=0.10):
    env, fps, fb = env_for_beats(x22)
    # coarse: free tempo 60-200 bpm (dominant pulse)
    bp, mg = tempo_scan(env, fps, 60, 200, 0.1)
    free = bp[np.argmax(mg)]
    bp, mg = tempo_scan(env, fps, target * (1 - rng), target * (1 + rng), 0.01)
    T = bp[np.argmax(mg)]
    # refine using phase drift over windows (skip first/last 8 s)
    for _ in range(3):
        tr = phase_track(env, fps, T)
        tr = [r for r in tr if 8 < r[0] < len(env) / fps - 8]
        per = 60 / T
        ts = np.array([r[0] for r in tr]); ph = unwrap_ms([r[1] for r in tr], per)
        wts = np.array([r[2] for r in tr])
        slope = np.polyfit(ts, ph, 1, w=wts)[0]  # seconds of phase per second
        # beat times t0 + k*per; phase increasing => actual period longer
        T = T / (1 + slope / 1.0 * 1.0) if False else 60 / (per * (1 + slope))
    tr = phase_track(env, fps, T)
    return dict(free=float(free), bpm=float(T), track=tr, env=env, fps=fps)


def stability(x22, bpm, win=12.0):
    env, fps, _ = env_for_beats(x22)
    tr = phase_track(env, fps, bpm, win=win, hopw=win / 2)
    per = 60 / bpm
    ts = np.array([r[0] for r in tr]); ph = unwrap_ms([r[1] for r in tr], per)
    cl = np.array([r[2] for r in tr])
    return ts, ph, cl


# ---------------------------------------------------------------- stretching
def stretch(src, dst, ratio):
    """ratio = target_bpm / measured_bpm (>1 speeds up)."""
    af = f'rubberband=tempo={ratio:.8f}:transients=crisp:detector=compound:pitchq=quality:channels=together:window=standard'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_f32le', dst], check=True)


# ---------------------------------------------------------------- precise kick onsets
def lowband_onsets(xm, sr, times, search=0.045, fc=160):
    """For each nominal beat time, the time of steepest rise of the <fc Hz envelope (kick attack)."""
    sos = signal.butter(4, fc, 'low', fs=sr, output='sos')
    lo = signal.sosfiltfilt(sos, xm)
    e = np.sqrt(np.convolve(lo ** 2, np.ones(int(0.004 * sr)) / int(0.004 * sr), 'same'))
    de = np.diff(e, prepend=e[0])
    out, strength = [], []
    for t in times:
        a, b = int((t - search) * sr), int((t + search) * sr)
        if a < 1 or b >= len(de):
            out.append(np.nan); strength.append(0); continue
        i = a + int(np.argmax(de[a:b]))
        out.append(i / sr); strength.append(de[i])
    return np.array(out), np.array(strength)


def broadband_onsets(xm, sr, times, search=0.045):
    """Steepest rise of the broadband 2 ms energy envelope near each time."""
    sos = signal.butter(2, 40, 'high', fs=sr, output='sos')
    hp = signal.sosfiltfilt(sos, xm)
    k = int(0.002 * sr)
    e = np.sqrt(np.convolve(hp ** 2, np.ones(k) / k, 'same'))
    le = np.log(e + 1e-5)
    de = np.diff(np.convolve(le, np.ones(k) / k, 'same'), prepend=le[0])
    out = []
    for t in times:
        a, b = int((t - search) * sr), int((t + search) * sr)
        if a < 1 or b >= len(de): out.append(np.nan); continue
        out.append((a + int(np.argmax(de[a:b]))) / sr)
    return np.array(out)


# ---------------------------------------------------------------- features for bars
def chroma_bands(xm, sr=SR, hop=1024, n=8192):
    pad = np.concatenate([np.zeros(n // 2, np.float32), xm.astype(np.float32), np.zeros(n // 2, np.float32)])
    fr = np.lib.stride_tricks.sliding_window_view(pad, n)[::hop] * np.hanning(n).astype(np.float32)
    S = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    f = np.fft.rfftfreq(n, 1 / sr)
    m = (f > 55) & (f < 4000)
    pc = (np.round(12 * np.log2(f[m] / 440)) % 12).astype(int)
    C = np.zeros((len(S), 12))
    for k in range(12): C[:, k] = S[:, m][:, pc == k].sum(1)
    C = C / (C.sum(1, keepdims=True) + 1e-12)
    edges = np.geomspace(40, 16000, 25)
    B = np.stack([S[:, (f >= edges[i]) & (f < edges[i + 1])].sum(1) for i in range(24)], 1)
    B = 10 * np.log10(B + 1e-10)
    return C, B, sr / hop


def beat_features(xm, beat_times, sr=SR):
    C, B, fps = chroma_bands(xm, sr)
    feats = []
    for i in range(len(beat_times) - 1):
        a, b = int(beat_times[i] * fps), int(beat_times[i + 1] * fps)
        b = max(b, a + 1)
        feats.append((C[a:b].mean(0), B[a:b].mean(0)))
    return feats


def downbeat_phase(xm, beat_times, lowstr):
    feats = beat_features(xm, beat_times)
    n = len(feats)
    change = np.zeros(n)
    for k in range(2, n - 2):
        c1 = feats[k - 2][0] + feats[k - 1][0]; c2 = feats[k][0] + feats[k + 1][0]
        change[k] = 1 - np.dot(c1, c2) / (np.linalg.norm(c1) * np.linalg.norm(c2) + 1e-12)
        b1 = (feats[k - 2][1] + feats[k - 1][1]) / 2; b2 = (feats[k][1] + feats[k + 1][1]) / 2
        change[k] += 0.02 * np.abs(b2 - b1).mean()
    ls = np.asarray(lowstr[:n]); ls = ls / (np.nanmean(ls) + 1e-12)
    scores = []
    for p in range(4):
        idx = np.arange(p, n, 4)
        idx = idx[(idx >= 4) & (idx < n - 4)]
        scores.append((change[idx].mean(), np.nanmean(ls[idx])))
    hc = np.array([s[0] for s in scores]); hc = hc / hc.mean()
    lk = np.array([s[1] for s in scores]); lk = lk / lk.mean()
    tot = hc + 0.3 * lk
    return int(np.argmax(tot)), hc, lk


# ---------------------------------------------------------------- loudness
def ebur128(path):
    r = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    tail = r[r.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', tail).group(1))
    LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', tail).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', tail).group(1))
    return I, tp, LRA


def true_peak_env(x, os_=4):
    """|x| oversampled 4x (per channel max), returned at the original rate (max over the 4 phases)."""
    up = signal.resample_poly(x, os_, 1, axis=0)
    a = np.abs(up).max(1) if up.ndim > 1 else np.abs(up)
    a = a[:len(x) * os_].reshape(-1, os_).max(1)
    return a


def circular_limiter(x, ceiling_db, look=0.003, rel=0.060):
    """Seamless (circular) peak limiter: gain never exceeds what's needed for a 4x-oversampled ceiling."""
    c = 10 ** (ceiling_db / 20)
    pk = true_peak_env(x)
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    if need.min() >= 1.0: return x, 0.0
    n = len(x); W = int(look * SR); R = int(rel * SR)
    ext = np.concatenate([need[-(W + R):], need, need[:W + R]])
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    g = minimum_filter1d(ext, 2 * W + 1 + R // 2)
    g = uniform_filter1d(g, R // 2 + 1)
    g = np.minimum(g, ext)  # guarantee
    g = g[W + R: W + R + n]
    return x * g[:, None], float(20 * np.log10(g.min()))


# ---------------------------------------------------------------- beat folding
def amp_env(xm, sr, band=None, win=0.002):
    if band:
        lo, hi = band
        sos = signal.butter(4, [lo, hi], 'band', fs=sr, output='sos') if lo else signal.butter(4, hi, 'low', fs=sr, output='sos')
        xm = signal.sosfiltfilt(sos, xm)
    else:
        xm = signal.sosfiltfilt(signal.butter(2, 30, 'high', fs=sr, output='sos'), xm)
    k = max(1, int(win * sr))
    return np.sqrt(np.convolve(xm.astype(np.float64) ** 2, np.ones(k) / k, 'same'))


def fold(e, sr, period, a=0, b=None, nb=None):
    """Average envelope over beats: returns folded curve (nb bins over one period) for samples [a,b)."""
    b = len(e) if b is None else b
    nb = nb or int(round(period * 1000))  # 1 ms bins
    t = np.arange(a, b) / sr
    ph = ((t % period) / period * nb).astype(int) % nb
    s = np.bincount(ph, e[a:b], nb); c = np.bincount(ph, None, nb)
    f = s / np.maximum(c, 1)
    k = 3
    return np.convolve(np.concatenate([f[-k:], f, f[:k]]), np.ones(k) / k, 'same')[k:-k]


def attack_of(f, period, frac=0.25):
    """Circular folded curve -> time (s, mod period) of the main attack: crossing of frac between
    the pre-attack minimum and the peak, on the edge with the largest 20 ms rise."""
    nb = len(f)
    ff = np.concatenate([f, f, f])
    w = max(2, int(nb * 0.020 / period))
    i = np.arange(nb, 2 * nb)
    rise = ff[i] - ff[i - w]
    i_end = nb + int(np.argmax(rise))
    pk = i_end + int(np.argmax(ff[i_end:i_end + w + 1]))
    lo_i = pk - 2 * w + int(np.argmin(ff[pk - 2 * w:pk + 1]))
    lo, hi = ff[lo_i], ff[pk]
    thr = lo + frac * (hi - lo)
    j = lo_i
    while j < pk and ff[j] < thr: j += 1
    jj = j - 1 + (thr - ff[j - 1]) / (ff[j] - ff[j - 1]) if (j > lo_i and ff[j] != ff[j - 1]) else j
    return (jj % nb) / nb * period, (hi - lo) / (np.median(f) + 1e-12)


def fold_track(e, sr, bpm, win=10.0, hopw=5.0, t_lo=0, t_hi=None):
    per = 60 / bpm
    t_hi = len(e) / sr if t_hi is None else t_hi
    out = []
    t = t_lo
    while t + win <= t_hi + 1e-9:
        f = fold(e, sr, per, int(t * sr), int((t + win) * sr))
        at, contrast = attack_of(f, per)
        out.append((t + win / 2, at, contrast))
        t += hopw
    return out


def refine_bpm_fold(e, sr, bpm, t_lo, t_hi, iters=3):
    for _ in range(iters):
        tr = fold_track(e, sr, bpm, t_lo=t_lo, t_hi=t_hi)
        per = 60 / bpm
        ts = np.array([r[0] for r in tr]); at = unwrap_ms([r[1] for r in tr], per)
        sl = np.polyfit(ts, at, 1)[0]
        bpm = 60 / (per * (1 + sl))
    return bpm, tr
