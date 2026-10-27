"""onsets2.py <take> : v2 rhythm data (onset events on a 1/12-beat grid) from the Chromium-decoded file.
Writes results/rh2-<take>.json (song entry) and results/rh2stats-<take>.json."""
import sys, os, json
import numpy as np
from scipy.ndimage import median_filter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mlib
from verify import local_attack
D = os.path.dirname(os.path.abspath(__file__)); SR = 44100
N, HOP = 1024, 128; FPS = SR / HOP


def hpss(x):
    pad = np.concatenate([np.zeros(N // 2), x, np.zeros(N // 2)])
    S = np.abs(np.fft.rfft(np.lib.stride_tricks.sliding_window_view(pad, N)[::HOP] * np.hanning(N), axis=1)).astype(np.float32)
    Hm = median_filter(S, size=(31, 1)); Pm = median_filter(S, size=(1, 31))
    Mp = Pm ** 2 / (Hm ** 2 + Pm ** 2 + 1e-12)
    return S * Mp, S * (1 - Mp), np.fft.rfftfreq(N, 1 / SR)


def flux(M, f, lo, hi):
    b = (f >= lo) & (f < hi)
    L = np.log1p(100 * M[:, b] / (M[:, b].max() + 1e-12))
    d = np.diff(L, axis=0, prepend=L[:1]); return np.convolve(np.maximum(d, 0).sum(1), np.ones(3) / 3, 'same')


def band_db(M, f, lo, hi):
    b = (f >= lo) & (f < hi)
    return 10 * np.log10((M[:, b] ** 2).sum(1) + 1e-10)


def peaks(e, a0, a1, k, gap_s):
    seg = e[a0:a1]; med = np.median(seg); mad = np.median(np.abs(seg - med)) * 1.4826 + 1e-12
    thr = median_filter(e, size=int(0.5 * FPS)) + k * mad
    g = int(gap_s * FPS); pk = []
    for i in range(max(a0, 1), min(a1, len(e) - 1)):
        if e[i] >= e[i - 1] and e[i] > e[i + 1] and e[i] > thr[i]:
            if pk and i - pk[-1][0] < g:
                if e[i] > pk[-1][1]: pk[-1] = (i, e[i])
                continue
            pk.append((i, e[i]))
    return pk


def pitch_at(H, f, i0, i1):
    midi = np.arange(55, 97); fp = 440 * 2 ** ((midi - 69) / 12)
    spec = H[i0:i1].mean(0); sal = np.zeros(len(midi))
    for h, w in [(1, 1.0), (2, 0.6), (3, 0.4), (4, 0.25)]:
        fb = np.clip(np.round(fp * h / (SR / N)).astype(int), 1, len(f) - 2)
        sal += w * np.maximum(spec[fb], np.maximum(spec[fb - 1], spec[fb + 1]))
    sal[(fp < 200) | (fp > 2000)] = 0
    j = int(np.argmax(sal)); ratio = sal[j] / (np.median(sal[sal > 0]) + 1e-12)
    return (int(midi[j]) if ratio > 2.0 else None), ratio


def analyse(x, t_first, bpm, n_beats, a_t, b_t):
    """x: mono signal; beat 0 at t_first (s); analyse onsets with t in [a_t, b_t)."""
    per = 60 / bpm
    P, H, f = hpss(x)
    fp_all = flux(P, f, 30, 8000); fm = flux(H, f, 400, 3000)
    lowdb = band_db(P, f, 40, 150); hidb = band_db(P, f, 1500, 8000)
    a0, a1 = int(a_t * FPS), int(b_t * FPS)
    e2 = mlib.amp_env(x, SR)
    ev = []
    w = int(0.04 * FPS)
    for i, v in peaks(fp_all, a0, a1, 2.0, 0.045):
        t, _ = local_attack(e2, i / FPS, search=0.02)
        t = t if np.isfinite(t) else i / FPS
        lo = lowdb[i:i + w].max() - lowdb[max(0, i - w):i + 1].min()
        hi = hidb[i:i + w].max() - hidb[max(0, i - w):i + 1].min()
        ev.append(dict(t=t, low=max(lo, 0), high=max(hi, 0), mel=0.0, src='p', fi=i))
    mel_pk = peaks(fm, a0, a1, 2.0, 0.06)
    # constant lag of the harmonic flux vs the broadband attack, from melody peaks that coincide with an attack
    lags = []
    for i, v in mel_pk:
        t, _ = local_attack(e2, i / FPS, search=0.03)
        if np.isfinite(t): lags.append(i / FPS - t)
    lag = float(np.median(lags)) if lags else 0.0
    pt = np.array([e['t'] for e in ev])
    for i, v in mel_pk:
        tm = i / FPS - lag
        j = int(np.argmin(np.abs(pt - tm))) if len(pt) else -1
        if j >= 0 and abs(pt[j] - tm) <= 0.025:
            ev[j]['mel'] = max(ev[j]['mel'], v); ev[j]['mfi'] = i
        else:
            ev.append(dict(t=tm, low=0.0, high=0.0, mel=v, src='m', fi=i, mfi=i))
    ev.sort(key=lambda e: e['t'])
    # merge anything still within 25 ms
    merged = []
    for e in ev:
        if merged and e['t'] - merged[-1]['t'] <= 0.025:
            m = merged[-1]
            for k in ('low', 'high', 'mel'): m[k] = max(m[k], e[k])
            if 'mfi' in e: m['mfi'] = e['mfi']
        else: merged.append(dict(e))
    ev = merged
    for k in ('low', 'high', 'mel'):
        vals = np.array([e[k] for e in ev if e[k] > 0])
        ref = np.percentile(vals, 95) if len(vals) else 1
        for e in ev: e[k] = float(min(1.0, e[k] / ref))
    out = []
    for e in ev:
        if max(e['low'], e['high'], e['mel']) < 0.15: continue
        beat = (e['t'] - t_first) / per
        if beat < -1 / 24 or beat >= n_beats: continue
        pos = int(round(beat * 12)); err = (beat * 12 - pos) / 12 * per * 1000
        p = None
        if e['mel'] >= 0.15:
            i0 = e.get('mfi', e['fi']); p, _ = pitch_at(H, f, i0, i0 + int(0.1 * FPS))
        out.append(dict(pos=pos, err=err, low=round(e['low'], 2), high=round(e['high'], 2), mel=round(e['mel'], 2), pitch=p, beat=beat))
    return out, lag


def feel(evs):
    """straight | triplet | swing (swung 8ths: '&' at >= 0.6 beat; swung 16ths: 'e' at >= 0.29 beat)."""
    fr = np.array([e['beat'] % 1 for e in evs if max(e['low'], e['high'], e['mel']) >= 0.3])
    near = lambda c: int(np.sum(np.abs(((fr - c + 0.5) % 1) - 0.5) < 0.06))
    c = {q: near(q) for q in (0.25, 0.5, 0.75, 1 / 3, 2 / 3)}
    ew = fr[(fr > 0.18) & (fr < 0.42)]; aw = fr[(fr > 0.42) & (fr < 0.72)]
    e_pos = float(np.median(ew)) if len(ew) >= 5 else None
    a_pos = float(np.median(aw)) if len(aw) >= 5 else None
    straight = c[0.25] + c[0.5] + c[0.75]; trip = c[1 / 3] + c[2 / 3]
    if trip > 1.5 * straight and c[1 / 3] >= 0.5 * c[2 / 3] and c[0.5] < 0.5 * trip: fl = 'triplet'
    elif (a_pos is not None and a_pos >= 0.6) or (e_pos is not None and e_pos >= 0.29): fl = 'swing'
    else: fl = 'straight'
    info = {('1/3' if abs(k - 1 / 3) < 1e-6 else '2/3' if abs(k - 2 / 3) < 1e-6 else str(k)): v for k, v in c.items()}
    info['e_pos'] = round(e_pos, 3) if e_pos is not None else None; info['and_pos'] = round(a_pos, 3) if a_pos is not None else None
    return fl, info


def swing_grid(evs):
    _, info = feel(evs)
    e = info['e_pos'] if info['e_pos'] is not None else 0.25
    a = info['and_pos'] if info['and_pos'] is not None else 0.5
    # swung pairs: first 16th of each 8th on time, second one late by the measured ratio
    return [0.0, e, a, a + e * (1 - a) / 0.5, 1.0]


def err_to_grid(beat, per, fl, grid=None):
    if fl == 'swing' and grid is not None:
        f = beat % 1
        return min(abs(f - g) for g in grid) * per * 1000
    div = 4 if fl == 'straight' else 3
    return abs(beat * div - round(beat * div)) / div * per * 1000


def microtiming(evs, per, fl):
    """Median signed offset (ms) of onsets per grid class, and % within 25 ms after removing those offsets."""
    if len(evs) < 8: return {}, None
    div = 4 if fl in ('straight', 'swing') else 3
    cls = {}
    for e in evs:
        q = round(e['beat'] * div); c = q % div; err = (e['beat'] * div - q) / div * per * 1000
        cls.setdefault(c, []).append(err)
    med = {c: float(np.median(v)) for c, v in cls.items() if len(v) >= 4}
    ok = [abs(err - med.get(c, 0)) <= 25 for c, v in cls.items() for err in v]
    return {c: round(m, 1) for c, m in med.items()}, round(float(np.mean(ok) * 100), 1)


def grid_fit(evs, per, fl):
    """% of onsets within 25 ms of the section's own grid (16ths for straight, 1/3 beat for triplet/swing)."""
    if not evs: return None
    g = swing_grid(evs) if fl == 'swing' else None
    errs = [err_to_grid(e['beat'], per, fl, g) for e in evs]
    return round(float(np.mean(np.array(errs) <= 25) * 100), 1)


if __name__ == '__main__':
    take = sys.argv[1]
    r = json.load(open(os.path.join(D, 'results', take + '.json')))
    buf = np.fromfile(os.path.join(D, 'chrome', take + '.f32'), dtype=np.float32).reshape(-1, 2).astype(np.float64)
    x = buf.mean(1); bpm = r['bpm']; per = 60 / bpm
    loop = 'loop_seconds' in r
    if loop:  # Shadow Banish: analyse the middle of three cycles
        ls = int(round(r['loopStart'] * SR)); L = int(round(r['loop_seconds'] * SR)); lm = x[ls:ls + L]
        xx = np.concatenate([lm, lm, lm]); t_first = L / SR; nbeats = int(round(r['loop_seconds'] / per))
        evs, lag = analyse(xx, t_first, bpm, nbeats, t_first - per / 24, 2 * L / SR - per / 24)
        start = r['loopStart']
    else:
        start = r['start']; nbeats = r['lengthBeats']
        evs, lag = analyse(x, start, bpm, nbeats, 0.0, len(x) / SR)
        # calibrate the grid start on strong percussive on-beat onsets (median offset -> 0)
        ob = np.array([(e['beat'] - round(e['beat'])) * per for e in evs if max(e['low'], e['high']) >= 0.4 and abs(e['beat'] - round(e['beat'])) < 0.12])
        cal = 0.0
        for _ in range(3):  # median of the main cluster around the current estimate (+-30 ms)
            m = ob[np.abs(ob - cal) < 0.030]
            if len(m) >= 20: cal = float(np.median(m))
        if abs(cal) > 0.008:
            start += cal
            for e in evs:
                e['beat'] -= cal / per
                e['pos'] = int(round(e['beat'] * 12)); e['err'] = (e['beat'] * 12 - e['pos']) / 12 * per * 1000
            evs = [e for e in evs if -1 / 24 <= e['beat'] < nbeats]
        r['start_calibration_ms'] = round(cal * 1000, 1)
    # sections (beats) with measured feel
    secs = r.get('sections_v2') or r['sections']
    sec_out = []; stats_sec = []
    for s in secs:
        sb, eb = s['startBar'] * 4, min(s['endBar'] * 4, nbeats)
        se = [e for e in evs if sb <= e['beat'] < eb]
        fl, counts = feel(se) if s['kind'] == 'groove' else (feel(se)[0] if len(se) >= 12 else 'straight', None)
        if s['kind'] == 'groove' and counts is None: counts = {}
        d = dict(name=s['name'], start=sb, end=eb, kind=s['kind'], feel=fl)
        mt, fit_c = microtiming(se, per, fl)
        if s['kind'] == 'groove' and fl == 'straight' and mt:
            d['late16'] = round(np.mean([mt.get(1, 0), mt.get(3, 0)]), 0); d['late8'] = round(mt.get(2, 0), 0)
        if s['kind'] == 'groove' and fl == 'swing' and isinstance(counts, dict):
            if counts.get('e_pos') is not None: d['swing16'] = counts['e_pos']
            if counts.get('and_pos') is not None: d['swing8'] = counts['and_pos']
        if s.get('pattern'): d['pattern'] = s['pattern']
        sec_out.append(d)
        stats_sec.append(dict(name=s['name'], bars=(eb - sb) // 4, kind=s['kind'], feel=fl, onsets=len(se),
                              beat_offset_ms=(round(float(np.median([(e['beat'] - round(e['beat'])) * per * 1000 for e in se if abs(e['beat'] - round(e['beat'])) * per < 0.06 and max(e['low'], e['high']) >= 0.3])), 1) if sum(abs(e['beat'] - round(e['beat'])) * per < 0.06 and max(e['low'], e['high']) >= 0.3 for e in se) >= 4 else None), n_beat_onsets=int(sum(abs(e['beat'] - round(e['beat'])) * per < 0.06 and max(e['low'], e['high']) >= 0.3 for e in se)), grid_fit_pct=grid_fit(se, per, fl), fit_after_microtiming_pct=fit_c, microtiming_ms=mt, offbeat_counts=counts if s['kind'] == 'groove' else None))
    # summary tags over strong onsets
    strong = [e for e in evs if max(e['low'], e['high'], e['mel']) >= 0.5]
    on = np.mean([e['pos'] % 12 == 0 for e in strong]); off = np.mean([e['pos'] % 12 == 6 for e in strong])
    mel = np.mean([e['mel'] >= 0.5 for e in strong])
    errs = np.array([abs(e['err']) for e in evs])
    feel_of = lambda b: next((s['feel'] for s in sec_out if s['start'] <= b < s['end']), 'straight')
    sgrid = {sd['name'] + str(sd['start']): swing_grid([e for e in evs if sd['start'] <= e['beat'] < sd['end']]) for sd in sec_out if sd['feel'] == 'swing'}
    sec_of = lambda b: next((sd for sd in sec_out if sd['start'] <= b < sd['end']), None)
    own = [err_to_grid(e['beat'], per, feel_of(e['beat']), sgrid.get((sec_of(e['beat']) or {}).get('name', '') + str((sec_of(e['beat']) or {}).get('start', '')))) for e in evs]
    allfit = []
    for sd in sec_out:
        se = [e for e in evs if sd['start'] <= e['beat'] < sd['end']]
        mt, _ = microtiming(se, per, sd['feel'])
        div = 4 if sd['feel'] in ('straight', 'swing') else 3
        for e in se:
            q = round(e['beat'] * div); allfit.append(abs((e['beat'] * div - q) / div * per * 1000 - mt.get(q % div, 0)) <= 25)
    sfit = []
    for e in strong:
        sd_ = sec_of(e['beat']) or {}
        sfit.append(err_to_grid(e['beat'], per, feel_of(e['beat']), sgrid.get(sd_.get('name', '') + str(sd_.get('start', '')))) <= 25)
    stats = dict(start_calibration_ms=r.get('start_calibration_ms', 0.0), strong_within25_of_section_grid_pct=round(float(np.mean(sfit) * 100), 1) if sfit else None,
                 strong_onbeat_within25_pct=round(float(np.mean([abs(e['beat'] - round(e['beat'])) * per * 1000 <= 25 for e in strong if abs(e['beat'] - round(e['beat'])) < 0.2]) * 100), 1),
                 within25_section_grid_after_microtiming_pct=round(float(np.mean(allfit) * 100), 1) if allfit else None, onsets=len(evs), within25_of_12th_pct=round(float(np.mean(errs <= 25) * 100), 1),
                 median_abs_err_ms=round(float(np.median(errs)), 1), within25_of_section_grid_pct=round(float(np.mean(np.array(own) <= 25) * 100), 1),
                 within15_of_section_grid_pct=round(float(np.mean(np.array(own) <= 15) * 100), 1),
                 per_band={k: int(sum(e[k] >= 0.15 for e in evs)) for k in ('low', 'high', 'mel')},
                 with_pitch=int(sum(e['pitch'] is not None for e in evs)), melody_lag_ms=round(lag * 1000, 1),
                 strong=len(strong), sections=stats_sec)
    song = dict(start=round(start, 6), lengthBeats=nbeats, beatsPerBar=4, loop=loop, sections=sec_out, div=12,
                onsets=[[e['pos'], e['low'], e['high'], e['mel'], e['pitch']] for e in evs],
                tags=dict(onBeat=round(float(on), 2), offBeat=round(float(off), 2), melodic=round(float(mel), 2)))
    json.dump(song, open(os.path.join(D, 'results', f'rh2-{take}.json'), 'w'))
    json.dump(stats, open(os.path.join(D, 'results', f'rh2stats-{take}.json'), 'w'), indent=1)
    print(take, json.dumps({k: v for k, v in stats.items() if k != 'sections'}))
    for s in stats_sec: print('   ', s)
    print('   tags', song['tags'])
