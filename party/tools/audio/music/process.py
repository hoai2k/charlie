"""process.py <song>-<take> [--bars N] [--start BAR]
Raw generated MP3 -> exact-tempo seamless loop MP3 + metrics json."""
import sys, os, json, subprocess, argparse
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mlib
class NpEnc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.generic): return o.item()
        if isinstance(o, np.ndarray): return o.tolist()
        return super().default(o)
from prompts import SONGS

D = os.path.dirname(os.path.abspath(__file__))
REPO_AUDIO = '/home/user/charlie/party/assets/audio'
BARS = {'dance': [32, 16], 'menu': [24, 32, 16], 'chill': [24, 16], 'chase': [32, 40, 24], 'tense': [24, 32, 16],
        'bouncy': [24, 32, 16], 'victory': [16, 24, 32], 'title': [24, 32, 16], 'rhythm-1': [32, 16]}
PREF = {'dance': 32, 'menu': 24, 'chill': 24, 'chase': 32, 'bouncy': 24, 'tense': 24, 'victory': 24, 'title': 24}
PRE, POST = 0.2, 0.2   # wrap-around padding (s) before loopStart / after loopEnd
TARGET_LUFS, CEIL = -16.0, -2.0

ap = argparse.ArgumentParser()
ap.add_argument('name'); ap.add_argument('--bars', type=int); ap.add_argument('--start', type=int)
ap.add_argument('--dry', action='store_true'); ap.add_argument('--out')
A = ap.parse_args()
name = A.name; song = name.rsplit('-', 1)[0]; tgt = SONGS[song]['bpm']
SR = mlib.SR
log = {}
raw = os.path.join(D, 'raw', name + '.mp3')
x = mlib.decode(raw, SR, 2)
xm = mlib.mono(x); dur = len(xm) / SR

# ---- 1. tempo
def measure_bpm(xm, guess):
    res = {}
    dur_ = len(xm) / SR
    for lab, band in [('full', None), ('hf', (2000, 8000))]:
        e = mlib.amp_env(xm, SR, band)
        # 1) coarse: maximise fold contrast (20 s windows) over +-1.5 %
        grid = np.arange(guess * 0.985, guess * 1.015, guess * 0.0002)
        con = [np.mean([r[2] for r in mlib.fold_track(e, SR, T, win=20, hopw=20, t_lo=6, t_hi=dur_ - 6)]) for T in grid]
        T0 = float(grid[int(np.argmax(con))])
        # 2) fine: phase slope, accepted only if the residual stays small
        bpm, tr = mlib.refine_bpm_fold(e, SR, T0, 6, dur_ - 6, iters=4)
        per = 60 / bpm
        at = mlib.unwrap_ms([r[1] for r in tr], per); ts = np.array([r[0] for r in tr])
        resid = float(np.abs(at - np.polyval(np.polyfit(ts, at, 1), ts)).max() * 1000)
        if resid > 10 or abs(bpm / T0 - 1) > 0.0005:
            bpm, resid_used = T0, None
        res[lab] = dict(bpm=bpm, coarse=T0, resid_ms=resid, contrast=float(np.mean([r[2] for r in tr])))
    best = max(res, key=lambda k: res[k]['contrast'] / (1 + res[k]['resid_ms']))
    return res, best

res, best = measure_bpm(xm, tgt)
bpm0 = res[best]['bpm']
log['bpm_measured'] = round(bpm0, 4); log['tempo_detail'] = {k: {kk: round(vv, 4) for kk, vv in v.items()} for k, v in res.items()}
print(f'{name}: measured {bpm0:.4f} bpm ({best}), resid {res[best]["resid_ms"]:.1f} ms, target {tgt}')
if abs(bpm0 / tgt - 1) > 0.06:
    print('REJECT: tempo off by more than 6%'); sys.exit(2)
loop_guess = max(BARS[song]) * 4 * 60 / tgt
drift_over_loop = abs(1 - tgt / bpm0) * loop_guess * 1000
if drift_over_loop > 3.0:
    ratio = tgt / bpm0
    st = os.path.join(D, 'work', name + '-stretch.wav'); os.makedirs(os.path.dirname(st), exist_ok=True)
    mlib.stretch(raw, st, ratio)
    x = mlib.decode(st, SR, 2); xm = mlib.mono(x); dur = len(xm) / SR
    res2, best2 = measure_bpm(xm, tgt)
    log['stretch_ratio'] = ratio; log['bpm_after_stretch'] = round(res2[best2]['bpm'], 4)
    print(f'  stretched x{ratio:.5f} -> {res2[best2]["bpm"]:.4f}')
else:
    log['stretch_ratio'] = 1.0
    log['bpm_after_stretch'] = None
    print(f'  no stretch needed (drift over a {loop_guess:.0f} s loop would be {drift_over_loop:.2f} ms)')
bpm = float(tgt); per = 60 / bpm

# ---- 2. beat phase (attack of the folded envelope over the whole steady part)
e_full = mlib.amp_env(xm, SR); e_hf = mlib.amp_env(xm, SR, (2000, 8000)); e_low = mlib.amp_env(xm, SR, (0, 160))
cands = {}
for lab, e in [('full', e_full), ('hf', e_hf), ('low', e_low)]:
    f = mlib.fold(e, SR, per, int(4 * SR), int((dur - 4) * SR))
    cands[lab] = mlib.attack_of(f, per)
# per-beat (mod period) choose: hf attack is sharpest; resolve half-beat ambiguity with low+full energy
ph_hf = cands['hf'][0]
def lowscore(ph):
    f = mlib.fold(e_low + 0.5 * e_full / e_full.mean() * e_low.mean(), SR, per, int(4 * SR), int((dur - 4) * SR))
    nb = len(f); i = int(ph / per * nb)
    return f[(i + np.arange(0, int(0.08 * nb / per * 1))) % nb].mean() - f[(i - np.arange(1, int(0.04 * nb / per) + 1)) % nb].mean()
alts = [ph_hf, (ph_hf + per / 2) % per]
sc = [lowscore(p) for p in alts]
phase = alts[int(np.argmax(sc))]
if song == 'dance':  # kick on every beat: use the full-band attack directly
    phase = cands['full'][0]
log['phase_candidates_ms'] = {k: round(v[0] * 1000, 1) for k, v in cands.items()}
log['phase_ms'] = round(phase * 1000, 1)
print('  attack phase candidates (ms):', log['phase_candidates_ms'], 'half-beat scores', [round(s, 4) for s in sc], '-> phase', round(phase * 1000, 1))

# ---- 3. downbeat
beat_times = np.arange(phase, dur - per, per)
_, lowstr = mlib.lowband_onsets(xm, SR, beat_times, search=0.03)
db, hc, lk = mlib.downbeat_phase(xm, beat_times, lowstr)
log['downbeat'] = dict(choice=db, harm_change=[round(v, 2) for v in hc], low=[round(v, 2) for v in lk])
print('  downbeat scores harm', np.round(hc, 2), 'low', np.round(lk, 2), '->', db)
bar0 = phase + db * per
bar_times = np.arange(bar0, dur, 4 * per)
nbars = len(bar_times) - 1

# ---- 4. per-bar features
feats = mlib.beat_features(xm, beat_times)
def barfeat(b):
    k = db + 4 * b
    if k < 0 or k + 4 > len(feats): return None
    C = np.concatenate([feats[k + i][0] for i in range(4)]); B = np.concatenate([feats[k + i][1] for i in range(4)])
    return C, B
bf = [barfeat(b) for b in range(nbars)]
bar_db = np.array([10 * np.log10(np.mean(xm[int(bar_times[b] * SR):int(bar_times[b + 1] * SR)] ** 2) + 1e-12) for b in range(nbars)])
med = np.median(bar_db)
steady = np.ones(nbars, bool)
steady[:2] = False; steady[-3:] = False
# trailing fade / ending
for b in range(nbars - 1, -1, -1):
    if bar_db[b] < med - 3: steady[b] = False
    else: break
for b in range(nbars):
    if bar_db[b] < med - 6: steady[b] = False
    else: break
log['bar_db'] = [round(v - med, 1) for v in bar_db]

def bdist(a, b):
    if bf[a] is None or bf[b] is None: return 9.0
    Ca, Ba = bf[a]; Cb, Bb = bf[b]
    c = 1 - np.dot(Ca, Cb) / (np.linalg.norm(Ca) * np.linalg.norm(Cb) + 1e-12)
    s = np.abs(Ba - Bb).mean() / 6.0
    return c + s

# typical neighbour distance (for normalization)
typical = np.median([bdist(b, b + 1) for b in range(2, nbars - 4)])
cand = []
for N in ([A.bars] if A.bars else BARS[song]):
    for s in range(1, nbars):
        e = s + N
        if e + 2 > nbars: break
        if A.start is not None and s != A.start: continue
        if not (steady[s - 1:e + 2].all()): continue
        cost = (bdist(e - 1, s - 1) + bdist(e, s) + 0.5 * bdist(e + 1, s + 1)) / 2.5 / typical
        # loudness steadiness inside the loop (no deep dips)
        inner = bar_db[s:e]
        lenpen = 0 if N == PREF.get(song, N) else 0.25
        Sx = int(round(bar_times[s] * SR)); Ex = Sx + int(round(N * 4 * per * SR)); Xx = int(round(per * SR))
        ta = xm[Sx - Xx:Sx].astype(np.float64); tb = xm[Ex - Xx:Ex].astype(np.float64)
        rr = float(np.sum(ta * tb) / np.sqrt(np.sum(ta * ta) * np.sum(tb * tb)))
        cand.append((cost + lenpen + 0.15 * (1 - max(rr, 0)), cost, N, s, float(inner.min() - med), rr))
cand.sort()
if os.environ.get('SSM'):
    print('  bar dB rel median:', ' '.join(f'{v:.0f}' for v in bar_db - med))
    print('  steady:', ''.join('1' if v else '0' for v in steady))
    for i in range(nbars):
        print('   %2d ' % i + ''.join(' .:-=+*#%@'[min(9, int(bdist(i, j) / typical * 3))] for j in range(nbars)))
print('  best candidates (score, seamcost, bars, startbar, min bar dB):')
for c in cand[:6]: print('   ', [round(v, 3) if isinstance(v, float) else v for v in c])
if not cand: print('NO CANDIDATE'); sys.exit(3)
_, seamcost, N, s, _, _ = cand[0]
log['loop'] = dict(bars=N, start_bar=s, seam_cost=round(seamcost, 3), typical_bar_dist=round(float(typical), 4))

# ---- 5. build loop with crossfade of the material past the end into the head
S = int(round(bar_times[s] * SR))
L = int(round(N * 4 * per * SR))
E = S + L
X = int(round(per * SR))  # one beat, at the END of the loop: tail -> material that preceded the start
a = x[S - X:S].astype(np.float64); b = x[E - X:E].astype(np.float64)
rho = float(np.sum(a * b) / np.sqrt(np.sum(a * a) * np.sum(b * b)))
t = (np.arange(X) + 0.5) / X
th = t * np.pi / 2; gi0, go0 = np.sin(th), np.cos(th)
r = max(0.0, rho)
norm = np.sqrt(gi0 ** 2 + go0 ** 2 + 2 * r * gi0 * go0)
gi, go = gi0 / norm, go0 / norm
loop = x[S:E].astype(np.float64).copy()
loop[L - X:] = b * go[:, None] + a * gi[:, None]
log['xfade'] = dict(samples=X, rho=round(rho, 3))
print(f'  loop bars {N} start bar {s} ({S / SR:.3f} s) len {L} samples ({L / SR:.4f} s), xfade {X} smp rho {rho:.3f}')

# ---- 6. loudness + circular limiter
tmpw = os.path.join(D, 'work', (A.out or name) + '-tmp.wav'); os.makedirs(os.path.dirname(tmpw), exist_ok=True)
g = 1.0
for it in range(4):
    y, gr = mlib.circular_limiter(loop * g, CEIL)
    mlib.write_wav(tmpw, np.concatenate([y, y]))  # 2 cycles for stable gating
    I, tp, lra = mlib.ebur128(tmpw)
    print(f'  iter {it}: gain {20 * np.log10(g):+.2f} dB, limiter {gr:.2f} dB -> {I:.2f} LUFS, TP {tp:.2f}')
    if abs(I - TARGET_LUFS) < 0.1: break
    g *= 10 ** ((TARGET_LUFS - I) / 20)
log['gain_db'] = round(20 * np.log10(g), 2); log['limiter_max_gr_db'] = round(gr, 2)
y = y.astype(np.float32)
# loop master (exact length, downbeat at sample 0)
master = os.path.join(D, 'work', (A.out or name) + '-loop.wav'); mlib.write_wav(master, y)
P, Q = int(PRE * SR), int(POST * SR)
padded = np.concatenate([y[-P:], y, y[:Q]])
pw = os.path.join(D, 'work', (A.out or name) + '-padded.wav'); mlib.write_wav(pw, padded)
if A.dry: print(json.dumps(log, cls=NpEnc)); sys.exit(0)

# ---- 7. encode + measure the decoder offset
oname = A.out or name
out = os.path.join(REPO_AUDIO, 'music', 'takes', f'{oname}.mp3'); os.makedirs(os.path.dirname(out), exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pw, '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100', '-ac', '2',
                '-map_metadata', '-1', '-id3v2_version', '0', '-write_id3v1', '0', out], check=True)
dec = mlib.decode(out, SR, 2)
ref = padded.mean(1)[:SR]; dm = dec.mean(1)[:SR + 4096]
cc = np.correlate(dm, ref[2048:2048 + SR // 2], 'valid')
off = int(np.argmax(cc)) - 2048
log['ffmpeg_decode_offset_samples'] = off
loopStart = (P + off) / SR; loopEnd = loopStart + L / SR
I2, tp2, lra2 = mlib.ebur128(out)
log.update(source=name, file=f'music/takes/{oname}.mp3', bpm=tgt, bars=N, loop_seconds=round(L / SR, 6),
           pre=PRE, post=POST, loopStart=round(loopStart, 6), loopEnd=round(loopEnd, 6),
           lufs_wav=round(I, 2), tp_wav=round(tp, 2), lufs_mp3=round(I2, 2), tp_mp3=round(tp2, 2), lra=lra2,
           bytes=os.path.getsize(out), decoded_len=len(dec))
os.makedirs(os.path.join(D, 'results'), exist_ok=True)
json.dump(log, cls=NpEnc, fp=open(os.path.join(D, 'results', oname + '.json'), 'w'), indent=1)
print(f'  -> {out} {os.path.getsize(out)} B, ffmpeg offset {off} smp, loopStart {loopStart:.6f} loopEnd {loopEnd:.6f}, MP3 {I2:.2f} LUFS TP {tp2:.2f}')
