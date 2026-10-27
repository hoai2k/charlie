"""chart.py <take> <id> <name> : 16th-step chart data from the Chromium-decoded final loop."""
import sys, os, json
import numpy as np
from scipy.ndimage import median_filter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
D = os.path.dirname(os.path.abspath(__file__)); SR = 44100


def onsets(e, fps, step, a0, a1, k=2.0):
    """Peaks of a (3-frame smoothed) flux envelope above local median + k*MAD, at least 0.6 step apart.
    Returns times relative to frame a0 and peak strengths."""
    e = np.convolve(e, np.ones(3) / 3, 'same')
    seg = e[a0:a1]; med = np.median(seg); mad = np.median(np.abs(seg - med)) * 1.4826
    thr = median_filter(e, size=int(0.5 * fps)) + k * mad
    g = int(0.6 * step * fps); pk = []
    for i in range(a0 - 50, a1 + 50):
        if e[i] >= e[i - 1] and e[i] > e[i + 1] and e[i] > thr[i]:
            if pk and i - pk[-1][0] < g:
                if e[i] > pk[-1][1]: pk[-1] = (i, e[i])
                continue
            pk.append((i, e[i]))
    return np.array([p[0] - a0 for p in pk]) / fps, np.array([p[1] - thr[p[0]] for p in pk])


def kick_steps(lm, bpm, steps):
    """Per 16th step: kick strength = steepest 10 ms rise of the 40-130 Hz amplitude envelope (16 ms RMS,
    relative to the loop's max) within +-0.4 step; kick time = broadband attack (25 % point, 2 ms envelope)
    nearest the low-band rise (the low band itself peaks 10-40 ms after the click)."""
    sys.path.insert(0, D); import mlib
    from verify import local_attack
    step = 60 / bpm / 4
    x = np.concatenate([lm[-SR:], lm, lm[:SR]])
    hop = 32; fps = SR / hop
    e = mlib.amp_env(x, SR, (40, 130), win=0.016)[::hop]; e = e / e.max()
    sl = int(0.010 * fps); d = np.zeros_like(e); d[sl:] = e[sl:] - e[:-sl]
    eb = mlib.amp_env(x, SR)
    times, rises = [], []
    for k in range(steps):
        c = (SR + k * step * SR) / hop; a, b = int(c - 0.4 * step * fps), int(c + 0.4 * step * fps)
        j = a + int(np.argmax(d[a:b]))
        tj = (j - sl) * hop / SR  # start of the steepest low-band rise (absolute, in x)
        ta, _ = local_attack(eb, tj, search=0.03)
        times.append((ta * SR - SR) / SR); rises.append(d[j])
    return np.array(times), np.array(rises)


def main(take, sid, name, key=None):
    r = json.load(open(os.path.join(D, 'results', take + '.json')))
    bpm, bars = r['bpm'], r['bars']; per = 60 / bpm; step = per / 4; steps = bars * 16
    buf = np.fromfile(os.path.join(D, 'chrome', take + '.f32'), dtype=np.float32).reshape(-1, 2)
    ls = int(round(r['loopStart'] * SR)); L = int(round(r['loop_seconds'] * SR))
    lm = buf[ls:ls + L].mean(1).astype(np.float64)
    # analyse 3 cycles, keep the middle one (no edge effects at the seam)
    x = np.concatenate([lm, lm, lm])
    n, hop = 1024, 128
    pad = np.concatenate([np.zeros(n // 2), x, np.zeros(n // 2)])
    fr = np.lib.stride_tricks.sliding_window_view(pad, n)[::hop] * np.hanning(n)
    S = np.abs(np.fft.rfft(fr, axis=1)).astype(np.float32)
    f = np.fft.rfftfreq(n, 1 / SR); fps = SR / hop
    # harmonic/percussive separation (median filtering, Fitzgerald 2010), soft masks
    Hm = median_filter(S, size=(31, 1)); Pm = median_filter(S, size=(1, 31))
    Mp = Pm ** 2 / (Hm ** 2 + Pm ** 2 + 1e-12); Mh = 1 - Mp
    P, H = S * Mp, S * Mh

    def flux(M, lo, hi):
        b = (f >= lo) & (f < hi)
        Lg = np.log1p(100 * M[:, b] / (M[:, b].max() + 1e-12))
        d = np.diff(Lg, axis=0, prepend=Lg[:1]); e = np.maximum(d, 0).sum(1)
        return e
    env = {'snare': flux(P, 1500, 5000), 'melody': flux(H, 400, 3000)}
    nfr = len(lm) / hop
    a0, a1 = int(round(nfr)), int(round(2 * nfr))  # middle cycle
    out = {'div': 4, 'steps': steps}
    stats = {}
    # kick: per-step rise
    kt, kr = kick_steps(lm, bpm, steps)
    lo = float(np.median(kr)); hi = float(np.percentile(kr, 95))
    kv = np.clip((kr - lo) / max(hi - lo, 1e-6), 0, 1)
    kv = np.where(kv < 0.1, 0, kv)  # noise floor
    kdev = (kt - np.arange(steps) * step) * 1000
    on = kv >= 0.25
    out['kick'] = [round(float(v), 2) for v in kv]
    stats['kick'] = dict(onsets=int(on.sum()), floor=round(lo, 3), full=round(hi, 3),
                         median_dev_ms=round(float(np.median(kdev[on])), 1) if on.any() else None,
                         within25_raw_pct=round(float(np.mean(np.abs(kdev[on]) <= 25) * 100), 1) if on.any() else None,
                         onbeat_pct=round(float(np.mean(np.arange(steps)[on] % 4 == 0) * 100), 1) if on.any() else None,
                         strong_onsets=int((kv >= 0.5).sum()), counted_at='value>=0.25')
    for band, e in env.items():
        t, s_ = onsets(e, fps, step, a0, a1)
        keep = (t >= -step / 2) & (t < len(lm) / SR - step / 2)
        t, s_ = t[keep], s_[keep]
        q = np.round(t / step).astype(int)
        dev = (t - q * step) * 1000
        off = float(np.median(dev)) if len(dev) else 0.0
        vals = np.zeros(steps)
        norm = np.percentile(s_, 95) if len(s_) else 1
        for qi, si in zip(q % steps, s_):
            vals[qi] = max(vals[qi], min(1.0, si / norm))
        vals = np.where(vals > 0, np.maximum(vals, 0.01), 0)
        out[band] = [round(float(v), 2) for v in vals]
        stats[band] = dict(onsets=int(len(t)), median_dev_ms=round(off, 1),
                           within25_raw_pct=round(float(np.mean(np.abs(dev) <= 25) * 100), 1) if len(dev) else None,
                           within25_calibrated_pct=round(float(np.mean(np.abs(dev - off) <= 25) * 100), 1) if len(dev) else None,
                           onbeat_pct=round(float(np.mean(q % 4 == 0) * 100), 1) if len(q) else None)
    # pitch: harmonic salience in the melody band at each melody-onset step
    midi = np.arange(55, 97)
    fpitch = 440 * 2 ** ((midi - 69) / 12)
    Hn = H[a0:a1 + 10]
    pitch = [None] * steps
    sal_all = []
    for k in range(steps):
        if out['melody'][k] <= 0: continue
        i0 = int(k * step * fps); i1 = int((k * step + min(0.12, 2 * step)) * fps)
        spec = Hn[i0:i1].mean(0)
        sal = np.zeros(len(midi))
        for h, w in [(1, 1.0), (2, 0.6), (3, 0.4), (4, 0.25)]:
            fb = np.clip(np.round(fpitch * h / (SR / n)).astype(int), 0, len(f) - 1)
            sal += w * np.maximum(spec[fb], np.maximum(spec[np.maximum(fb - 1, 0)], spec[np.minimum(fb + 1, len(f) - 1)]))
        # restrict fundamental to the melody band
        sal[(fpitch < 200) | (fpitch > 2000)] = 0
        j = int(np.argmax(sal)); sal_all.append(sal[j] / (np.median(sal[sal > 0]) + 1e-12))
        if sal_all[-1] > 2.0: pitch[k] = int(midi[j])
    out['pitch'] = pitch
    # sections: 8-bar blocks
    secs = []
    blk = 8 * 16
    rms = [float(np.sqrt(np.mean(lm[int(b * step * SR):int(min(b + blk, steps) * step * SR)] ** 2))) for b in range(0, steps, blk)]
    for i, b in enumerate(range(0, steps, blk)):
        secs.append({'startStep': b, 'endStep': min(b + blk, steps), 'energy': round(rms[i] / max(rms), 2)})
    # pitch stats
    pv = [p for p in pitch if p is not None]
    stats['pitch'] = dict(steps_with_pitch=len(pv), range=[min(pv), max(pv)] if pv else None)
    song = {'id': sid, 'name': name, 'file': r['file'], 'bpm': bpm, 'bars': bars,
            'loopStart': r['loopStart'], 'loopEnd': r['loopEnd'], 
            'lufs': None, 'grid': out, 'sections': secs}
    if key: song['key'] = key
    return song, stats


if __name__ == '__main__':
    take, sid, name = sys.argv[1:4]
    key = sys.argv[4] if len(sys.argv) > 4 else None
    song, stats = main(take, sid, name, key)
    v = json.load(open(os.path.join(D, 'results', 'verify.json')))[take]
    song['lufs'] = v['lufs']
    json.dump(song, open(os.path.join(D, 'results', f'chart-{sid}.json'), 'w'))
    json.dump(stats, open(os.path.join(D, 'results', f'chartstats-{sid}.json'), 'w'), indent=1)
    print(json.dumps(stats, indent=1))
    g = song['grid']
    for b in range(2):
        print('bar', b)
        for band in ['kick', 'snare', 'melody']:
            print(f'  {band:6s}', ' '.join(f'{v:.1f}' if v else ' . ' for v in g[band][b * 16:(b + 1) * 16]))
        print('  pitch ', ' '.join(f'{p:3d}' if p else ' . ' for p in g['pitch'][b * 16:(b + 1) * 16]))
    print(song['sections'])
