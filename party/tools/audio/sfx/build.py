import json, os, sys, numpy as np
import lib2 as L, catalog, seg, hbday
SR = L.SR
OUTS = L.OUT + '/sfx'
RES = L.D + '/results.json'
res = json.load(open(RES)) if os.path.exists(RES) else {}
sel = sys.argv[1:]
want = lambda k: not sel or k in sel
MODE = {'hit': dict(peak_db=-3.3), 'ui': dict(peak_db=-6.3), 'loud': dict(peak_db=-3.3, lufs_target=-16)}
P = {e['stem']: e for e in catalog.E}

def cap(x, maxd, fo=0.08):
    n = int(maxd * SR)
    if len(x) <= n: return x, None
    return x[:n], fo

def save(key, stem, path, gain, info, source, extra=None):
    r = dict(key=key, file=os.path.relpath(path, L.OUT), gain=round(float(gain), 1), source=source, info={k: (float(v) if isinstance(v, (np.floating,)) else v) for k, v in info.items()})
    if extra: r.update(extra)
    res[stem] = r
    print(f"{stem:26s} -> {r['file']:32s} {os.path.getsize(path)/1024:6.1f} KB  g{r['gain']:+.1f}  " + ' '.join(f'{k}={info[k]}' for k in ('cen', 'hi', 'lead', 'trail') if k in info) + (' SHRILL-3dB' if info.get('shrill') else ''), flush=True)

SPECIAL = {'golden-chime', 'match-chime', 'plant-seed', 'giant-stomp'} | {e['key'] for e in catalog.E if e['kind'] in ('tone', 'loopsrc')}

# Takes dropped after measurement (shrillest / weakest take, or a 2nd take of a key that needs only one), to stay in budget
DROP = {'sfx/rubber-bounce-1', 'sfx/cookie-snap-1', 'sfx/card-flip-2', 'sfx/scrub-3', 'sfx/tiny-squeak-1', 'sfx/crumble-plop-2',
        'sfx/paint-splat-wet-2', 'sfx/boing-3', 'sfx/bonk-2', 'sfx/cake-blorp-2', 'sfx/crown-land-1', 'sfx/cauldron-plop-2',
        'sfx/card-whoosh-1', 'sfx/hic-2', 'sfx/candle-blow-2', 'sfx/frosting-crumble-2', 'sfx/camera-flash-3'}
for st in DROP | {'sfx/giant-stomp-3'}:
    for ext in ('.wav', '.mp3'):
        if os.path.exists(f'{L.OUT}/{st}{ext}'): os.remove(f'{L.OUT}/{st}{ext}')
    res.pop(st, None)
# 1. plain one-shots
for e in catalog.E:
    if e['key'] in SPECIAL or not want(e['key']) or e['stem'] in DROP: continue
    x = L.trim(L.load(f"{L.RAW}/{e['stem']}.mp3"), tail_rel=45 if e['key'] in ('roller-ding',) else 36 if e['kind'] != 'loud' else 40)
    x, fo = cap(x, e['maxd'])
    path, g, info = L.finish(x, f"{L.OUT}/{e['stem']}", fade_out=fo, **MODE[e['kind']])
    save(e['key'], e['stem'], path, g, info, {'prompt': e['prompt']})

# 2. pitched sets (single source tone, tape-style repitch to exact MIDI pitches)
def tone_src(stem):
    x = L.trim(L.load(f'{L.RAW}/sfx/{stem}.mp3'), tail_rel=45); return x, L.f0(x)
def pitched(key, stem_src, midi, maxd=0.27, fo=0.08, lo=150):
    x, f = tone_src(stem_src)
    y = L.repitch(x, L.mtof(midi) / f)
    y = L.trim(y, tail_rel=40); y, fo2 = cap(y, maxd, fo)
    path, g, info = L.finish(y, f'{OUTS}/{key}', peak_db=-6.3, fade_out=fo2 if fo2 else None, fmt='wav')
    ff = L.f0(L.load(path, hp=0), lo=lo)
    cents = 1200 * np.log2(ff / L.mtof(midi))
    save(key, f'sfx/{key}', path, g, info, {'derived_from': f'sfx/{stem_src}', 'prompt': P[f'sfx/{stem_src}']['prompt']},
         {'midi': midi, 'f0_measured': round(float(ff), 2), 'cents_off': round(float(cents), 1), 'source_f0': round(float(f), 2)})
for k, m in (('note-u', 72), ('note-d', 67), ('note-l', 70), ('note-r', 75), ('note-star', 79)):
    if want(k) or want('notes'): pitched(k, 'tone-marimba-2', m)
for k, m in (('note-hit-a', 72), ('note-hit-b', 75), ('note-hit-x', 79), ('note-hit-y', 82)):
    if want(k) or want('notes'): pitched(k, 'tone-vibe-1', m)
if want('count-chime'): pitched('count-chime', 'tone-chime-2', 79, maxd=0.34, fo=0.12)
if want('ring-combo'): pitched('ring-combo', 'tone-ding-1', 79, maxd=0.34, fo=0.12)

# 3. two-note chimes assembled from generated single tones
def two_note(key, stem_src, notes, gap, maxd):
    x, f = tone_src(stem_src)
    parts = [L.repitch(x, L.mtof(m) / f) for m in notes]
    n = int(gap * SR) * (len(parts) - 1) + max(len(p) for p in parts)
    y = np.zeros(n)
    for i, p in enumerate(parts): y[i * int(gap * SR): i * int(gap * SR) + len(p)] += p * (0.8 if i == 0 else 1.0)
    y = L.trim(y, tail_rel=48); y, fo = cap(y, maxd, 0.12)
    path, g, info = L.finish(y, f'{OUTS}/{key}', peak_db=-6.3, fade_out=fo)
    save(key, f'sfx/{key}', path, g, info, {'derived_from': f'sfx/{stem_src}', 'prompt': P[f'sfx/{stem_src}']['prompt']}, {'notes_midi': notes})
if want('golden-chime'): two_note('golden-chime', 'tone-ding-2', [83, 88], 0.10, 0.75)     # B5 -> E6
if want('match-chime'): two_note('match-chime', 'tone-marimba-2', [79, 84], 0.11, 0.6)    # G5 -> C6

# 4. plant-seed: three pats cut from one generated take of several soil pats
PATS_PROMPT = 'Hand patting soft garden soil, five separate gentle pats with pauses, crunchy earthy pat, close up'
if want('plant-seed'):
    segs = {round(t, 2): s for t, s in seg.segments(L.load(f'{L.RAW}/multi/pats.mp3'), rel_db=-20)}
    for i, t in enumerate((0.70, 1.77, 2.69)):
        y = L.trim(segs[t]); y, fo = cap(y, 0.3)
        path, g, info = L.finish(y, f'{OUTS}/plant-seed-{i+1}', peak_db=-3.3, fade_out=fo)
        save('plant-seed', f'sfx/plant-seed-{i+1}', path, g, info, {'prompt': PATS_PROMPT, 'cut_at_s': t})

# 5. giant-stomp: wooden clunks cut from one take, plus a soft-saturation layer above 250 Hz so the hit
#    reads on tablet speakers, plus a 50 ms crunch from frosting-crumble-1 under the attack
STOMP_PROMPT = 'Heavy wooden boxes dropped one at a time on a wooden floor, four separate thick clunks with pauses, punchy, crunchy, cartoon'
if want('giant-stomp'):
    segs = {round(t, 2): s for t, s in seg.segments(L.load(f'{L.RAW}/multi/stomps-b.mp3'), rel_db=-20)}
    cr = L.trim(L.load(f'{L.RAW}/sfx/frosting-crumble-1.mp3'))
    h = int(0.005 * SR); rr = np.sqrt((cr[:len(cr)//h*h].reshape(-1, h) ** 2).mean(1)); c0 = int(np.argmax(rr)) * h
    crunch = cr[max(0, c0 - int(0.005 * SR)): c0 + int(0.05 * SR)].astype(np.float64)
    crunch *= np.linspace(1, 0, len(crunch)) ** 2
    for i, t in enumerate((0.43, 0.92)):
        x = L.trim(segs[t]).astype(np.float64); x, _ = cap(x, 0.5)
        pk = np.abs(x).max()
        sat = L.ffilter(np.tanh(5 * x / pk) * pk, 'highpass=f=250:poles=2,lowpass=f=3500').astype(np.float64)[:len(x)]
        y = x.copy(); y[:len(sat)] += 0.7 * sat
        cc = crunch / np.abs(crunch).max() * pk * 0.35; y[:len(cc)] += cc[:len(y)]
        path, g, info = L.finish(y, f'{OUTS}/giant-stomp-{i+1}', peak_db=-3.3, fade_out=0.08)
        save('giant-stomp', f'sfx/giant-stomp-{i+1}', path, g, info, {'prompt': STOMP_PROMPT, 'cut_at_s': t, 'layers': 'soft-saturation harmonics >250 Hz + 50 ms crunch from frosting-crumble-1'})

# 6. seamless loops (16-bit WAV, equal-power crossfade of the tail into the head)
def best_start(x, length, xf, step=0.01):
    h = int(0.05 * SR); best = (1e9, 0)
    for s in np.arange(0.1, len(x) / SR - length - xf - 0.05, step):
        a = int(s * SR); seg_ = x[a:a + int((length + xf) * SR)]
        n = len(seg_) // h; db = 20 * np.log10(np.sqrt((seg_[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
        k = max(1, int(0.15 / 0.05))
        w2 = int(0.02 * SR); Ls = int(length * SR)
        seam = 20 * np.log10(np.sqrt((seg_[max(0, Ls - w2):Ls + w2] ** 2).mean()) + 1e-9)
        cost = db.std() + abs(db[:k].mean() - db[-k:].mean()) + 0.3 * max(0.0, seam - np.median(db))  # prefer a seam in a quieter moment
        best = min(best, (cost, s))
    return best[1]
def period(x, lo=0.08, hi=0.6):
    h = int(0.005 * SR); n = len(x) // h
    env = np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1)); env = env - env.mean()
    ac = np.correlate(env, env, 'full')[n - 1:]; ac /= ac[0]
    a, b = int(lo / 0.005), int(hi / 0.005); k = a + int(np.argmax(ac[a:b])); return k * 0.005, float(ac[k])
LOOPS = {  # key: (raw stem, length s, crossfade s, LUFS target, filter, sample rate)
    'fuse-sizzle': ('sfx/fuse-sizzle', 0.8, 0.15, -19, 'lowpass=f=11000', SR),
    'broom-whoosh': ('sfx/broom-whoosh', 1.0, 0.15, -18, 'lowpass=f=9000', 22050),   # no content above 4 kHz: 22.05 kHz halves the size
    'broom-glide': ('sfx/broom-whoosh', 1.0, 0.2, -23, 'highpass=f=120,lowpass=f=1600', 22050),
    'wing-twinkle': ('sfx/wing-twinkle', 0.8, 0.15, -21, 'lowpass=f=10000', SR),
    'sprinkle-shake': ('sfx/sprinkle-shake', None, 0.06, -19, 'lowpass=f=11000', SR),
    'night-crickets': ('sfx/night-crickets', 2.5, 0.25, -24, 'lowpass=f=9500', 22050),
}
for key, (stem, length, xf, lt, af, sr) in LOOPS.items():
    if not want(key): continue
    x = L.load(f'{L.RAW}/{stem}.mp3', sr=sr).astype(np.float64)
    if af: x = L.ffilter(x, af, sr).astype(np.float64)
    extra = {}
    if length is None:   # rhythmic: loop length = whole number of shake periods near 1.2 s
        p, conf = period(x); nper = max(1, round(1.0 / p)); length = nper * p; extra = {'period_s': round(p, 3), 'periods': nper, 'period_conf': round(conf, 2)}
    if key == 'broom-glide': s0 = best_start(x[int(0.3 * sr):], length, xf) + 0.3 + 0.9  # a different stretch than broom-whoosh
    else: s0 = best_start(x, length, xf)
    s0 = min(s0, len(x) / sr - length - xf - 0.01)
    y = L.make_loop(x, length, xf, sr=sr, start=s0)
    info = L.analyze(y.astype(np.float32), sr)
    tmp = L.D + '/_l.wav'; L.write_wav(tmp, y / np.abs(y).max() * 0.5, sr); I, _ = L.ebur(tmp); os.remove(tmp); I += 20 * np.log10(2)
    g = min(10 ** ((lt - I) / 20) / np.abs(y).max(), 10 ** (-3.3 / 20) / np.abs(y).max())
    if info.get('hi', 0) > 0.6: g *= 10 ** (-3 / 20); info['shrill'] = True
    path = f'{OUTS}/{key}.wav'
    for ext in ('.mp3', '.wav'):
        if os.path.exists(f'{OUTS}/{key}{ext}'): os.remove(f'{OUTS}/{key}{ext}')
    L.write_wav(path, y * g, sr)
    extra.update({'loop_len_s': round(length, 3), 'xfade_s': xf, 'start_s': round(float(s0), 2), 'lufs_target': lt, 'filter': af, 'sr': sr})
    src = {'prompt': P[stem]['prompt']}
    if key == 'broom-glide': src['derived_from'] = 'sfx/broom-whoosh'
    save(key, f'sfx/{key}', path, 20 * np.log10(g), info, src, extra)

# 7. Happy Birthday: rendered in numpy, not generated
if want('jingle/happy-birthday'):
    y, on = hbday.render()
    tmp = L.D + '/_j.wav'; L.write_wav(tmp, y * 0.5); I0, _ = L.ebur(tmp); os.remove(tmp); I0 += 20 * np.log10(2)
    y = L.ffilter(y * 10 ** ((-15.8 - I0) / 20), 'alimiter=limit=0.66:attack=4:release=60:level=0').astype(np.float64)  # ~2 dB of soft limiting on bell attacks
    os.makedirs(L.OUT + '/jingle', exist_ok=True)
    path, g, info = L.finish(y, L.OUT + '/jingle/happy-birthday', peak_db=-3.3, lufs_target=-16, fade_out=0.6, fmt='mp3', shrill_cut=False)
    save('jingle/happy-birthday', 'jingle/happy-birthday', path, g, info, {'rendered': 'hbday.py: additive music-box/celesta partials, 112 BPM 3/4, C major, waltz bass + chords, small synthetic room'})

json.dump(res, open(RES, 'w'), indent=1)
