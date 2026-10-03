"""verify.py name... : checks on the Chromium-decoded PCM (chrome/<name>.f32) against work/<name>-padded.wav."""
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mlib
D = os.path.dirname(os.path.abspath(__file__)); SR = 44100


def local_attack(e, t, sr=SR, search=0.05):
    w = int(0.020 * sr)
    a, b = int((t - search) * sr), int((t + search) * sr)
    if a - 3 * w < 0 or b + w >= len(e): return np.nan, 0
    i = np.arange(a, b)
    rise = e[i] - e[i - w]
    ie = a + int(np.argmax(rise))
    pk = ie + int(np.argmax(e[ie:ie + w + 1]))
    lo_i = pk - 2 * w + int(np.argmin(e[pk - 2 * w:pk + 1]))
    lo, hi = e[lo_i], e[pk]
    thr = lo + 0.25 * (hi - lo)
    j = lo_i
    while j < pk and e[j] < thr: j += 1
    jj = j - 1 + (thr - e[j - 1]) / (e[j] - e[j - 1]) if j > lo_i and e[j] != e[j - 1] else j
    return jj / sr, (hi - lo)


def bandspec(seg):
    S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    f = np.fft.rfftfreq(len(seg), 1 / SR)
    edges = np.geomspace(40, 16000, 25)
    return np.array([10 * np.log10(S[(f >= edges[k]) & (f < edges[k + 1])].sum() + 1e-12) for k in range(24)])


def rms_db(seg): return 10 * np.log10(np.mean(seg ** 2) + 1e-12)


def check(name):
    r = json.load(open(os.path.join(D, 'results', name + '.json')))
    bpm = r['bpm']; per = 60 / bpm; bars = r['bars']
    buf = np.fromfile(os.path.join(D, 'chrome', name + '.f32'), dtype=np.float32).reshape(-1, 2).astype(np.float64)
    pad = mlib.decode(os.path.join(D, 'work', name + '-padded.wav'), SR, 2).astype(np.float64)
    # decoder offset (Chromium) by cross-correlation of the first second
    ref = pad.mean(1)[2048:2048 + SR // 2]; dm = buf.mean(1)[:SR + 4096]
    cc = np.correlate(dm, ref, 'valid'); off = int(np.argmax(cc)) - 2048
    n = min(len(buf), len(pad)) - max(off, 0)
    err = buf[max(off, 0):max(off, 0) + n] - pad[:n] if off >= 0 else None
    snr = 10 * np.log10(np.mean(pad[:n] ** 2) / np.mean(err ** 2))
    ls = int(round(r['pre'] * SR)) + off; L = int(round(r['loop_seconds'] * SR)); le = ls + L
    loopStart, loopEnd = ls / SR, le / SR
    loop = buf[ls:le]; lm = loop.mean(1)
    out = dict(name=name, chrome_len=len(buf), chrome_offset=off, mp3_snr_db=round(snr, 1),
               loopStart=round(loopStart, 6), loopEnd=round(loopEnd, 6))
    # ---- seam: wrap = loop[-W:] + loop[:W]
    W = int(0.1 * SR); w20 = int(0.02 * SR)
    wrap = np.concatenate([buf[le - W:le], buf[ls:ls + W]]).mean(1)
    d = np.abs(np.diff(lm)); jump = abs(wrap[W] - wrap[W - 1])
    out['seam_jump_pct'] = round(float((d < jump).mean() * 100), 1)
    # compare across every bar line inside the loop (same musical position) -> distribution
    def edge_stats(sig, i):
        return (rms_db(sig[i:i + w20]) - rms_db(sig[i - w20:i]),
                np.abs(bandspec(sig[i:i + W]) - bandspec(sig[i - W:i])).mean())
    ext = np.concatenate([lm, lm[:W + w20]])
    seam_rms, seam_spec = edge_stats(ext, len(lm))
    others = [edge_stats(lm, int(round(b * 4 * per * SR))) for b in range(1, bars)]
    orms = np.array([o[0] for o in others]); ospec = np.array([o[1] for o in others])
    out['seam_rms_step_db'] = round(seam_rms, 2)
    out['barline_rms_step_db_range'] = [round(float(np.percentile(orms, 5)), 2), round(float(np.percentile(orms, 95)), 2)]
    out['seam_spec_dist'] = round(seam_spec, 2)
    out['seam_score'] = round(float(seam_spec / np.median(ospec)), 2)  # 1.0 = like a typical bar line
    out['seam_spec_pct'] = round(float((ospec < seam_spec).mean() * 100), 0)
    # crossfade region (last beat) level vs rest, 1-beat windows
    beats_db = np.array([rms_db(lm[int(k * per * SR):int((k + 1) * per * SR)]) for k in range(bars * 4)])
    out['xfade_beat_db_vs_5_95'] = [round(float(beats_db[-1]), 1), round(float(np.percentile(beats_db, 5)), 1), round(float(np.percentile(beats_db, 95)), 1)]
    # ---- beat grid on the decoded loop (2 cycles so the seam is included), per band
    two = np.concatenate([lm, lm])
    beats = np.arange(0, 2 * bars * 4) * per
    out['beat_dev_ms'] = {}
    for lab, band in [('full', None), ('hf', (2000, 8000)), ('low', (0, 160))]:
        e = mlib.amp_env(two, SR, band)
        aa = [local_attack(e, t) for t in beats[1:]]
        at = np.array([a[0] for a in aa]); con = np.array([a[1] for a in aa])
        dev = (at - beats[1:]) * 1000
        strong = con > 0.5 * np.median(con)
        out['beat_dev_ms'][lab] = dict(beats=int(len(dev)), strong=int(strong.sum()),
                              median=round(float(np.nanmedian(dev[strong])), 1),
                              p95_abs=round(float(np.nanpercentile(np.abs(dev[strong]), 95)), 1),
                              max_abs=round(float(np.nanmax(np.abs(dev[strong]))), 1),
                              within10=round(float(np.mean(np.abs(dev[strong]) <= 10) * 100), 1))
        if lab == 'full':
            out['first_attack_ms'] = round(float((local_attack(e, len(lm) / SR)[0] - len(lm) / SR) * 1000), 1)
        if lab == 'hf':
            out['first_attack_hf_ms'] = round(float((local_attack(e, len(lm) / SR)[0] - len(lm) / SR) * 1000), 1)
    # kick presence on every beat
    el = mlib.amp_env(np.concatenate([lm[-SR:], lm, lm[:SR]]), SR, (0, 160), win=0.01)
    ti = SR + (np.arange(bars * 4) * per * SR).astype(int)
    on = np.array([el[i + int(.01 * SR):i + int(.06 * SR)].max() for i in ti])
    pre = np.array([el[i - int(.06 * SR):i - int(.005 * SR)].min() for i in ti])
    rise = 20 * np.log10(on / np.maximum(pre, 1e-9))
    out['kick_rise_db_p5'] = round(float(np.percentile(rise, 5)), 1)
    out['beats_without_kick'] = int((rise < 6).sum())
    # fold phase per 10 s on the loop (drift), hf band
    tr = mlib.fold_track(mlib.amp_env(lm, SR, (2000, 8000)), SR, bpm, win=10, hopw=10)
    ph = mlib.unwrap_ms([t[1] for t in tr], per) * 1000
    out['fold_phase_hf_ms'] = [round(float(p), 1) for p in ph]
    # measured bpm on the final loop (3 cycles): max fold contrast, then phase-slope refine
    three = np.concatenate([lm, lm, lm]); best = None
    for lab, band in [('full', None), ('hf', (2000, 8000))]:
        e3 = mlib.amp_env(three, SR, band)
        grid = np.arange(bpm * 0.99, bpm * 1.01, bpm * 0.0001)
        con = [np.mean([r[2] for r in mlib.fold_track(e3, SR, T, win=20, hopw=20)]) for T in grid]
        T0 = float(grid[int(np.argmax(con))])
        b2, tr2 = mlib.refine_bpm_fold(e3, SR, T0, 0, len(three) / SR, iters=3)
        at2 = mlib.unwrap_ms([r[1] for r in tr2], 60 / b2); ts2 = np.array([r[0] for r in tr2])
        res2 = float(np.abs(at2 - np.polyval(np.polyfit(ts2, at2, 1), ts2)).max() * 1000)
        val = b2 if (res2 < 10 and abs(b2 / T0 - 1) < 5e-4) else T0
        if best is None or max(con) > best[0]: best = (max(con), val, lab, res2)
    out['bpm_final'] = round(best[1], 4); out['bpm_final_band'] = best[2]
    # loudness of the loop as decoded (2 cycles)
    tmp = os.path.join(D, 'work', name + '-chk.wav'); mlib.write_wav(tmp, np.concatenate([loop, loop]).astype(np.float32))
    I, tp, lra = mlib.ebur128(tmp); out.update(lufs=I, true_peak=tp, lra=lra)
    # spectrum harshness: share of energy 2-5 kHz and >5 kHz, centroid
    S = np.abs(np.fft.rfft(lm[:SR * 30])) ** 2; f = np.fft.rfftfreq(min(len(lm), SR * 30), 1 / SR)
    out['energy_2_5k_pct'] = round(float(S[(f >= 2000) & (f < 5000)].sum() / S.sum() * 100), 1)
    out['energy_5k_pct'] = round(float(S[f >= 5000].sum() / S.sum() * 100), 1)
    out['centroid_hz'] = round(float((S * f).sum() / S.sum()))
    return out


if __name__ == '__main__':
    allr = {}
    for nme in sys.argv[1:]:
        o = check(nme); allr[nme] = o
        print(json.dumps(o))
    p = os.path.join(D, 'results', 'verify.json')
    old = json.load(open(p)) if os.path.exists(p) else {}
    old.update(allr); json.dump(old, open(p, 'w'), indent=1)
