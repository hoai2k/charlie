"""Measured section structure on a bar grid."""
import numpy as np
import mlib

SRA = 22050


def bar_features(x22, t_first, per, nbars):
    """Per bar: level dB, onset count, 16-step x 3-band onset pattern."""
    fb, fps = mlib.flux_bands(x22.astype(np.float32), SRA, {'all': (60, 8000), 'low': (30, 150), 'hi': (2000, 8000)})
    thr = np.percentile(fb['all'], 85)
    pk = np.array([i for i in range(1, len(fb['all']) - 1) if fb['all'][i] > thr and fb['all'][i] >= fb['all'][i - 1] and fb['all'][i] > fb['all'][i + 1]]) / fps
    lev, den, pat, bnd = [], [], [], []
    Sx, fx = mlib.stft_mag(x22.astype(np.float32), SRA, n=2048, hop=512); bfps = SRA / 512
    edges = np.geomspace(40, 10000, 25)
    for b in range(nbars):
        t0 = t_first + b * 4 * per; t1 = t0 + 4 * per
        seg = x22[max(0, int(t0 * SRA)):int(t1 * SRA)]
        lev.append(10 * np.log10(np.mean(seg ** 2) + 1e-12) if len(seg) else -120)
        den.append(int(np.sum((pk >= t0) & (pk < t1))))
        row = []
        for k in range(16):
            a = max(0, int((t0 + k * per / 4 - 0.02) * fps)); c = max(a + 1, int((t0 + k * per / 4 + 0.04) * fps))
            row += [fb[n][a:c].max() if c <= len(fb[n]) else 0 for n in ('low', 'hi', 'all')]
        pat.append(row)
        sb = Sx[int(t0 * bfps):max(int(t0 * bfps) + 1, int(t1 * bfps))] ** 2
        bnd.append([10 * np.log10(sb[:, (fx >= edges[i]) & (fx < edges[i + 1])].sum() + 1e-9) for i in range(24)])
    pat = np.array(pat); pat = np.log1p(pat / (np.median(pat, 0) + 1e-9))
    bnd = np.array(bnd); bnd = (bnd - bnd.mean(0)) / (bnd.std(0) + 1e-6)
    pz = (pat - pat.mean(0)) / (pat.std(0) + 1e-6)
    return np.array(lev), np.array(den), np.hstack([pz, 1.5 * bnd])


def downbeat_vote(x22, t_beat0, per, dur):
    """Rhythm-pattern novelty per beat (bar before vs bar after); returns mean of the top-10% novelty
    beats' counts per beat position mod 4 (section changes happen at bar lines)."""
    nbeats = int((dur - t_beat0) / per) - 8
    fb, fps = mlib.flux_bands(x22.astype(np.float32), SRA, {'low': (30, 150), 'hi': (2000, 8000), 'all': (60, 8000)})
    def vec(t0):
        row = []
        for k in range(16):
            a = max(0, int((t0 + k * per / 4 - 0.02) * fps)); c = max(a + 1, int((t0 + k * per / 4 + 0.04) * fps))
            row += [fb[n][a:c].max() for n in ('low', 'hi', 'all')]
        return np.log1p(np.array(row))
    V = [vec(t_beat0 + k * per) for k in range(nbeats + 4)]
    nov = np.array([np.abs(V[k] - V[k - 4]).mean() if k >= 4 else 0 for k in range(nbeats)])
    # also level change
    top = np.argsort(nov)[-max(4, nbeats // 10):]
    votes = np.bincount(top % 4, minlength=4)
    return votes, nov


def segment(lev, den, pat, plan_secs, end_bar):
    """Return list of (name, startBar, endBar, kind). end_bar = bar index after the final hit's bar."""
    nb = min(len(lev), end_bar)
    lev, den, pat = lev[:nb], den[:nb], pat[:nb]
    hi_ref = np.percentile(lev, 75); dref = np.percentile(den, 75)
    breath = (lev < hi_ref - 6) | (den < 0.45 * dref)
    nov = np.zeros(nb)
    for b in range(2, nb - 1):
        nov[b] = np.sqrt(np.mean((pat[b - 2:b].mean(0) - pat[b:b + 2].mean(0)) ** 2))
    bounds = {0, nb}
    for b in range(1, nb):
        if breath[b] != breath[b - 1]: bounds.add(b)
    inner = nov[2:nb - 1]
    med = np.median(inner); mad = np.median(np.abs(inner - med)) * 1.4826 + 1e-9
    peaks = [b for b in range(2, nb - 1) if not breath[b] and not breath[b - 1] and nov[b] >= nov[b - 1] and nov[b] >= nov[b + 1] and nov[b] > med + 1.5 * mad]
    for b in sorted(peaks, key=lambda b: -nov[b]):
        if all(abs(b - o) >= 6 for o in bounds if o not in (0, nb)) and b >= 4 and b <= nb - 4:
            bounds.add(b)
    bounds = sorted(bounds)
    # merge segments shorter than 2 bars (breath) / 4 bars (groove) into the neighbour with smaller novelty jump
    segs = [[bounds[i], bounds[i + 1]] for i in range(len(bounds) - 1)]
    def kind_of(s): return 'breath' if breath[s[0]:s[1]].mean() >= 0.5 else 'groove'
    changed = True
    while changed:
        changed = False
        for i, s in enumerate(segs):
            L = s[1] - s[0]; k = kind_of(s)
            if (k == 'groove' and L < 4 and len(segs) > 1) or (k == 'breath' and L < 1):
                if i == 0: j = 1
                elif i == len(segs) - 1: j = i - 1
                else: j = i - 1 if nov[s[0]] < nov[s[1]] else i + 1
                a, b = sorted([i, j]); segs[a] = [segs[a][0], segs[b][1]]; del segs[b]; changed = True; break
    # merge adjacent same-kind breath segments
    out = []
    for s in segs:
        if out and kind_of(out[-1]) == kind_of(s) == 'breath': out[-1][1] = s[1]
        else: out.append(list(s))
    names = []; g = 0
    for i, s in enumerate(out):
        k = kind_of(s)
        if i == 0 and k == 'breath': names.append('intro')
        elif i == len(out) - 1 and k == 'breath': names.append('ending')
        elif k == 'breath': names.append('breath')
        else: names.append('ABCDEFGH'[g]); g += 1
    return [(n, s[0], s[1], kind_of(s)) for n, s in zip(names, out)], breath, nov
