import json, os, re, numpy as np
import lib2 as L
r = json.load(open('final.json'))
rows = []; flags_all = []
for stem, v in sorted(r.items()):
    f = L.OUT + '/' + v['file']
    pr = L.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels,bits_per_sample:format=duration', '-of', 'json', f])
    j = json.loads(pr.stdout); st = j['streams'][0]; d = float(j['format']['duration'])
    I, tp = L.ebur(f)
    x = L.load(f, sr=int(st['sample_rate']), hp=0); sr = int(st['sample_rate'])
    a = L.analyze(x, sr)
    pk = 20 * np.log10(np.abs(x).max())
    fl = []
    if st['channels'] != 1: fl.append('not mono')
    if v['file'].endswith('.wav') and st['codec_name'] != 'pcm_s16le': fl.append('wav not 16-bit')
    is_loop = 'loop_len_s' in v
    if not is_loop and d < 0.4 and not v['file'].endswith('.wav'): fl.append('short mp3')
    if not is_loop and d >= 0.4 and v['file'].endswith('.wav'): fl.append('long wav')
    if is_loop and not v['file'].endswith('.wav'): fl.append('loop not wav')
    if tp > -2.9: fl.append(f'true peak {tp}')
    if a['lead'] > 0.02: fl.append(f"lead {a['lead']}")
    if not is_loop and a['trail'] > 0.1: fl.append(f"trail {a['trail']}")
    if not is_loop and a['dead'] > 0.5: fl.append(f"mostly quiet {a['dead']}")
    if a['hi'] > 0.6 and a['flat'] > 0.3: fl.append('noisy hiss?')
    if a['hi'] > 0.6: fl.append('bright (placed -3 dB)' if v['info'].get('shrill') else 'BRIGHT, not reduced')
    if a['low'] > 0.85: fl.append('mostly sub-300 Hz')
    extra = ''
    if 'midi' in v:
        f0 = L.f0(x, sr); c = 1200 * np.log2(f0 / L.mtof(v['midi'])); extra = f"MIDI {v['midi']} f0 {f0:.1f} ({c:+.1f}c)"
        if abs(c) > 15: fl.append('PITCH OFF')
    if 'notes_midi' in v: extra = 'notes ' + '/'.join(map(str, v['notes_midi']))
    if is_loop:
        sc = L.seam_check(x.astype(np.float64), sr)
        # RMS continuity across the wrap: 20 ms windows straddling the seam vs neighbours
        w = int(0.02 * sr); xx = np.concatenate([x[-3 * w:], x[:3 * w]])
        win = [20 * np.log10(np.sqrt((xx[i * w:(i + 1) * w] ** 2).mean()) + 1e-9) for i in range(6)]
        jump_db = abs(win[3] - win[2])
        allw = [20 * np.log10(np.sqrt((x[i:i + w] ** 2).mean()) + 1e-9) for i in range(0, len(x) - w, w)]
        typ = np.percentile(np.abs(np.diff(allw)), 99)
        extra = f"loop {v['loop_len_s']}s xf {v['xfade_s']}s wrap|dx| {sc['wrap_jump']} (p99 step {sc['p99_step']}) seam dRMS {jump_db:.1f} dB (p99 elsewhere {typ:.1f})"
        # crossfade region level vs the rest of the loop (equal-power should keep it flat for noise-like sound)
        c = int(v['xfade_s'] * sr); rx = 20 * np.log10(np.sqrt((x[:c] ** 2).mean()) + 1e-9)
        others = [20 * np.log10(np.sqrt((x[i:i + c] ** 2).mean()) + 1e-9) for i in range(c, len(x) - c, max(1, c // 4))]
        lo_, hi_ = np.percentile(others, 5), np.percentile(others, 95)
        mx = max(abs(a_ - b_) for a_, b_ in zip(allw[1:], allw[:-1]))
        extra += f" xfade-region {rx:.1f} dB (other windows p5..p95 {lo_:.1f}..{hi_:.1f}); max dRMS elsewhere {mx:.1f}"
        if sc['wrap_jump'] > max(2 * sc['p99_step'], 0.01) or jump_db > max(3, mx) or not (lo_ - 1.5 <= rx <= hi_ + 1.5): fl.append('SEAM')
    rows.append((stem, v['file'], st['codec_name'], sr, round(d, 3), I, tp, round(pk, 1), a['cen'], a['hi'], a['flat'], extra, fl, os.path.getsize(f)))
for row in rows:
    print(f"{row[1]:30s} {row[2]:10s} {row[3]:5d} {row[4]:6.3f}s I {row[5]:6.1f} TP {row[6]:5.1f} pk {row[7]:5.1f} cen {row[8]:5d} hi {row[9]:.2f} fl {row[10]:.2f} {row[13]/1024:6.1f}K {row[11]} {'| ' + '; '.join(row[12]) if row[12] else ''}")
json.dump([dict(zip(['stem','file','codec','sr','dur','I','tp','pk','cen','hi','flat','extra','flags','size'], [x if not isinstance(x, np.floating) else float(x) for x in row])) for row in rows], open('verify.json', 'w'), indent=1, default=float)
print('files', len(rows), 'total KB', sum(r[13] for r in rows) / 1024)
