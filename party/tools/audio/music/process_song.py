"""process_song.py rh-xxx-N : full (non-loop) rhythm song -> exact-tempo, levelled, -16 LUFS MP3 + metrics."""
import sys, os, json, subprocess
import numpy as np
from scipy.ndimage import uniform_filter1d
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mlib
from plans import SONGS
D = os.path.dirname(os.path.abspath(__file__)); SR = mlib.SR
REPO = '/home/user/charlie/party/assets/audio'
PRE = 0.2
name = sys.argv[1]; sid = name.rsplit('-', 1)[0]; take = int(name.rsplit('-', 1)[1])
S = SONGS[sid]; tgt = S['bpm']; secs = S['takes'][take - 1]['sections']
log = dict(id=sid, take=take)
raw = os.path.join(D, 'raw', name + '.mp3')
x = mlib.decode(raw, SR, 2); xm = mlib.mono(x); dur = len(xm) / SR


def tempo(xm, guess, rng=0.04):
    """Best fold-contrast tempo (16 s windows), using full and 2-8 kHz envelopes."""
    best = None
    for lab, band in [('full', None), ('hf', (2000, 8000))]:
        e = mlib.amp_env(xm, SR, band)
        grid = np.arange(guess * (1 - rng), guess * (1 + rng), guess * 0.0001)
        con = np.array([np.mean([r[2] for r in mlib.fold_track(e, SR, T, win=16, hopw=16, t_lo=2, t_hi=len(xm) / SR - 2)]) for T in grid])
        i = int(np.argmax(con))
        # parabolic refinement
        if 0 < i < len(con) - 1:
            a, b, c = con[i - 1], con[i], con[i + 1]; d = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0
        else: d = 0
        T = grid[i] + d * guess * 0.0001
        if best is None or con[i] > best[1]: best = (T, con[i], lab)
    return best


def phase_windows(xm, bpm, win=6.0, hop=3.0):
    """Attack phase (mod half a beat, ms) per window, 2-8 kHz + full envelopes, with contrast."""
    per = 60 / bpm; out = []
    e = mlib.amp_env(xm, SR, (2000, 8000)) + mlib.amp_env(xm, SR) * 0.5
    for r in mlib.fold_track(e, SR, bpm, win=win, hopw=hop):
        out.append((r[0], r[1] % (per / 2), r[2]))
    return out


T0, con0, band0 = tempo(xm, tgt)
log['bpm_raw'] = round(float(T0), 4); log['bpm_raw_band'] = band0
print(f'{name}: raw tempo {T0:.4f} ({band0}), target {tgt}')
if abs(T0 / tgt - 1) > 0.06: print('REJECT tempo'); sys.exit(2)
drift_ms = abs(1 - tgt / T0) * dur * 1000
if drift_ms > 4:
    st = os.path.join(D, 'work', name + '-stretch.wav'); os.makedirs(os.path.dirname(st), exist_ok=True)
    mlib.stretch(raw, st, tgt / T0)
    x = mlib.decode(st, SR, 2); xm = mlib.mono(x); dur = len(xm) / SR
    T1 = tempo(xm, tgt, 0.01)[0]
    log['stretch_ratio'] = round(tgt / T0, 6); log['bpm_after_stretch'] = round(float(T1), 4)
    print(f'  stretched x{tgt / T0:.5f} -> {T1:.4f}')
else:
    log['stretch_ratio'] = 1.0; log['bpm_after_stretch'] = None
    print(f'  no stretch (drift over the song would be {drift_ms:.1f} ms)')
bpm = float(tgt); per = 60 / bpm

# ---- phase stability over the whole song (mod half beat, so off-beat accents don't count as drift)
pw = phase_windows(xm, bpm)
cons = np.array([p[2] for p in pw]); good = cons > np.percentile(cons, 20)
ph = mlib.unwrap_ms([p[1] for p in pw], per / 2) * 1000
ref = np.median(ph[good]); dev = ph - ref
log['phase_windows'] = [[round(p[0], 1), round(float(d), 1), round(float(p[2]), 1)] for p, d in zip(pw, dev)]
log['phase_spread_ms'] = round(float(np.ptp(dev[good])), 1)
print(f'  phase spread over song (6 s windows, mod half-beat, top 80% contrast): {np.ptp(dev[good]):.1f} ms')

# ---- beat phase: attack of the folded envelope; on-beat vs off-beat by low band + chroma change
e_hf = mlib.amp_env(xm, SR, (2000, 8000)); e_full = mlib.amp_env(xm, SR); e_low = mlib.amp_env(xm, SR, (30, 150))
f = mlib.fold(e_full + e_hf * (e_full.mean() / e_hf.mean()), SR, per)
ph0, _ = mlib.attack_of(f, per)
cands = [ph0, (ph0 + per / 2) % per]
def lowscore(p):
    fl = mlib.fold(e_low, SR, per); nb = len(fl); i = int(p / per * nb)
    return fl[(i + np.arange(0, int(0.06 * nb / per))) % nb].mean() / (fl[(i - np.arange(1, int(0.04 * nb / per) + 1)) % nb].mean() + 1e-12)
ls = [lowscore(p) for p in cands]
def chroma_score(p):
    bt = np.arange(p, dur - per, per)
    _, low = mlib.lowband_onsets(xm, SR, bt, search=0.03)
    db, hc, lk = mlib.downbeat_phase(xm, bt, low)
    return db, hc
cs = [chroma_score(p) for p in cands]
log['beat_phase_candidates_ms'] = [round(c * 1000, 1) for c in cands]
log['lowband_on_vs_pre'] = [round(float(v), 2) for v in ls]
if max(ls) / min(ls) > 1.1: k = int(np.argmax(ls))
else: k = int(np.argmax([c[1].max() for c in cs]))
phase = cands[k]
import sections as SEC
x22 = xm[::2].astype(np.float64)
b0t = phase
while b0t - per > -0.1: b0t -= per
votes, bnov = SEC.downbeat_vote(x22, b0t, per, dur)
hc = cs[k][1]
# section changes (pattern novelty) decide the bar line; chord change breaks ties
db = 0  # plan prior: the generated bar grid starts at the file start
if votes.max() >= 5 and votes.max() >= 2 * max(votes[0], 1): db = int(np.argmax(votes))
log['downbeat_votes_novelty'] = votes.tolist(); log['downbeat_votes_chroma'] = [round(float(v), 2) for v in hc]
t_down = b0t + db * per
if t_down > 4 * per - 0.1: t_down -= 4 * per
log['beat_phase_ms'] = round(phase * 1000, 1)
log['first_downbeat_raw_s'] = round(t_down, 4)
print(f'  beat phase {phase*1000:.1f} ms (cands {log["beat_phase_candidates_ms"]}, low {log["lowband_on_vs_pre"]}); bar-line votes {votes.tolist()} chroma {np.round(hc,2).tolist()} -> first downbeat {t_down:.4f} s')

# ---- final hit: last strong attack in the last 30 % of the song
from verify import local_attack
e10 = mlib.amp_env(xm, SR, win=0.010); edb = 20 * np.log10(e10 + 1e-7)
hop = int(0.005 * SR); E = edb[::hop]; tt = np.arange(len(E)) * hop / SR
w = int(0.03 / 0.005); rise = np.zeros_like(E); rise[w:] = E[w:] - E[:-w]
peakref = np.percentile(E[(tt > t_down) & (tt < 0.8 * dur)], 95)
cand = [i for i in range(1, len(E) - 1) if tt[i] > 0.7 * dur and rise[i] > 6 and E[i] >= E[i - 1] and E[i] > E[i + 1] and E[i] > peakref - 10]
hit_t = tt[cand[-1]] - 0.015 if cand else dur - 1
ha, _ = local_attack(e_full, hit_t, search=0.05)
hit_t = ha if np.isfinite(ha) else hit_t
hit_beat = (hit_t - t_down) / per
length_beats = int(np.floor(hit_beat / 4 + 1e-6) * 4 + 4)
log.update(final_hit_s=round(hit_t, 3), final_hit_beat=round(hit_beat, 2), lengthBeats=length_beats)
after = np.where((tt > hit_t + 0.3) & (E < peakref - 50))[0]
t_end = min(tt[after[0]] if len(after) else dur, hit_t + 6.0, dur)
log['tail_s'] = round(t_end - hit_t, 2)
print(f'  final hit at {hit_t:.3f} s = beat {hit_beat:.2f} -> lengthBeats {length_beats}; audio kept to {t_end:.2f} s')

# ---- measured sections on the bar grid
nbars = length_beats // 4
lev, den, pat = SEC.bar_features(x22, t_down, per, nbars)
segs, breath, nov = SEC.segment(lev, den, pat, secs, nbars)
plan_b = []; pb = 0
for nm, bars, kind, text, pos in secs: plan_b.append((nm, pb, pb + bars, kind, pos)); pb += bars
sections = []
for nm, sb, eb, kd in segs:
    sec = dict(name=nm, startBar=sb, endBar=eb, kind=kd, level_db=round(float(np.mean(lev[sb:eb])), 1),
               onsets_per_bar=round(float(np.mean(den[sb:eb])), 1))
    best = max(plan_b, key=lambda p: max(0, min(eb, p[2]) - max(sb, p[1])))
    ov = max(0, min(eb, best[2]) - max(sb, best[1])) / (eb - sb)
    if ov >= 0.6 and best[3] == kd and kd == 'groove': sec['pattern'] = ' + '.join(best[4][:2]); sec['plan'] = best[0]
    sections.append(sec)
log['sections'] = sections
log['plan_bars'] = [(p[0], p[1], p[2], p[3]) for p in plan_b]
log['bar_level_db'] = [round(float(v), 1) for v in lev]; log['bar_onsets'] = den.tolist(); log['bar_novelty'] = [round(float(v), 2) for v in nov]
gl = np.median(lev[~breath[:len(lev)]]) if (~breath).any() else np.median(lev)
print('  measured sections:', ' | '.join(f"{s['name']} bars {s['startBar']}-{s['endBar']} {s['kind']} {s['level_db'] - gl:+.1f}dB {s['onsets_per_bar']}/bar" for s in sections))
print('  planned          :', ' | '.join(f"{p[0]} {p[1]}-{p[2]}" for p in plan_b))

# ---- cut: [PRE s before the first downbeat] .. t_end (+ fade 0.3 s if the source is still sounding)
a = int(round((t_down - PRE) * SR)); bidx = int(round(t_end * SR))
y = x[max(a, 0):bidx].astype(np.float64)
if a < 0: y = np.concatenate([np.zeros((-a, 2)), y])
fo = int(0.3 * SR); y[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))[:, None] ** 2
start = PRE

# ---- gentle levelling: raise bars far below the groove level (breathers), never above it
ym = y.mean(1)
bars_t = start + np.arange(0, length_beats // 4 + 1) * 4 * per
Lb = np.array([10 * np.log10(np.mean(ym[int(bars_t[i] * SR):int(bars_t[i + 1] * SR)] ** 2) + 1e-12) for i in range(len(bars_t) - 1)])
groove_bars = np.concatenate([np.arange(s['startBar'], s['endBar']) for s in sections if s['kind'] == 'groove'] or [np.arange(len(Lb))])
groove_bars = groove_bars[groove_bars < len(Lb)]
gmed = float(np.median(Lb[groove_bars])); floor = gmed - 7.0
gain_bar = np.where(Lb < floor, np.minimum(6.0, 0.6 * (floor - Lb)), 0.0)
last_bar = int(np.floor(hit_beat / 4))
gain_bar[last_bar:] = 0  # never lift the ending's decay
g = np.zeros(len(ym))
for i, gb in enumerate(gain_bar):
    g[int(bars_t[i] * SR):int(bars_t[i + 1] * SR)] = gb
g = uniform_filter1d(g, int(0.4 * SR))
y = y * (10 ** (g / 20))[:, None]
Lb2 = np.array([10 * np.log10(np.mean(y.mean(1)[int(bars_t[i] * SR):int(bars_t[i + 1] * SR)] ** 2) + 1e-12) for i in range(len(bars_t) - 1)])
log['level_bars_before_db'] = [round(float(v - gmed), 1) for v in Lb]
log['level_bars_after_db'] = [round(float(v - gmed), 1) for v in Lb2]
log['levelling_max_gain_db'] = round(float(gain_bar.max()), 1)

# ---- loudness -16 LUFS, peak limiter -2 dBTP (zero-padded so it's not circular)
tmpw = os.path.join(D, 'work', name + '-tmp.wav'); os.makedirs(os.path.dirname(tmpw), exist_ok=True)
gg = 1.0; padn = int(0.1 * SR)
for it in range(5):
    z = np.concatenate([np.zeros((padn, 2)), y * gg, np.zeros((padn, 2))])
    z, gr = mlib.circular_limiter(z, -2.0)
    z = z[padn:-padn]
    mlib.write_wav(tmpw, z.astype(np.float32))
    I, tp, lra = mlib.ebur128(tmpw)
    if abs(I + 16) < 0.1: break
    gg *= 10 ** ((-16 - I) / 20)
log.update(gain_db=round(20 * np.log10(gg), 2), limiter_gr_db=round(gr, 2), lufs_wav=I, tp_wav=tp, lra=lra)
print(f'  loudness {I} LUFS, TP {tp}, LRA {lra}, gain {20*np.log10(gg):+.1f} dB, limiter {gr:.1f} dB, levelling max +{gain_bar.max():.1f} dB')
final = z.astype(np.float32)
fw = os.path.join(D, 'work', name + '-final.wav'); mlib.write_wav(fw, final)
out = os.path.join(REPO, 'music', 'takes', f'{name}.mp3')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', fw, '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100', '-ac', '2',
                '-map_metadata', '-1', '-id3v2_version', '0', '-write_id3v1', '0', out], check=True)
I2, tp2, _ = mlib.ebur128(out)
log.update(file=f'music/takes/{name}.mp3', bpm=tgt, start=start, duration=round(len(final) / SR, 3), lufs_mp3=I2, tp_mp3=tp2,
           bytes=os.path.getsize(out))
os.makedirs(os.path.join(D, 'results'), exist_ok=True)
json.dump(log, open(os.path.join(D, 'results', name + '.json'), 'w'), indent=1, default=float)
print(f'  -> {out} {os.path.getsize(out)/1e6:.2f} MB, {len(final)/SR:.2f} s, MP3 {I2} LUFS TP {tp2}')
