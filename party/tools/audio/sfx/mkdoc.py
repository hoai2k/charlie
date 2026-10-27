import json, collections
F = json.load(open('final.json')); V = {r['file']: r for r in json.load(open('verify.json'))}
by = collections.defaultdict(list)
for f, v in F.items(): by[v['key']].append(f)
LOOP = {'fuse-sizzle', 'broom-whoosh', 'broom-glide', 'wing-twinkle', 'sprinkle-shake', 'night-crickets'}
order = ['fuse-sizzle', 'golden-chime', 'cake-blorp', 'rubber-bounce', 'boing', 'frosting-crumble', 'wheee-fall', 'hose-sputter',
         'note-u', 'note-d', 'note-l', 'note-r', 'note-star', 'sparkle-beam', 'cookie-snap', 'crumble-plop', 'paint-splat-wet', 'roller-ding',
         'crown-sting', 'crown-land', 'bonk', 'ring-combo', 'broom-whoosh', 'broom-glide', 'wing-twinkle', 'count-chime', 'double-time',
         'cauldron-plop', 'hic', 'giant-stomp', 'tiny-squeak', 'card-flip', 'card-whoosh', 'match-chime', 'camera-flash', 'sprinkle-shake',
         'candle-blow', 'crowd-aww', 'jingle/happy-birthday', 'scrub', 'shower', 'pet-shake', 'note-hit-a', 'note-hit-b', 'note-hit-x',
         'note-hit-y', 'fever', 'big-imp-poof', 'plant-seed', 'firefly-catch', 'petal-firework', 'night-crickets']
assert set(order) == set(by), set(by) ^ set(order)
def kind(k):
    v = F[sorted(by[k])[0]]
    if k in LOOP: return f"loop {v['loop_len_s']} s" + (', 22.05 kHz' if v.get('sr') == 22050 else '')
    if 'midi' in v: return f"pitched, MIDI {v['midi']}"
    if 'notes_midi' in v: return 'two-note chime, MIDI ' + '→'.join(map(str, v['notes_midi']))
    if k.startswith('jingle/'): return 'jingle (rendered)'
    return 'one-shot'
lines = ['| Key | Files | Seconds | Type | Level |', '| --- | --- | --- | --- | --- |']
for k in order:
    fs = sorted(by[k]); ds = [V[f]['dur'] for f in fs]
    d = f'{min(ds):.2f}' if len(ds) == 1 else f'{min(ds):.2f}–{max(ds):.2f}'
    lv = []
    for f in fs:
        r = V[f]
        lv.append(f"{r['I']:.0f} LUFS" if r['I'] > -60 and (k in LOOP or F[f].get('source', {}).get('rendered') or r['dur'] >= 0.9) else f"pk {r['pk']:.1f}")
    lvs = lv[0] if len(set(lv)) == 1 else ', '.join(lv)
    lines.append(f"| `{k}` | " + ', '.join(f'`{f}`' for f in fs) + f" | {d} | {kind(k)} | {lvs} |")
open('doc_table.md', 'w').write('\n'.join(lines) + '\n')
# prompts table
P = ['| File | s | Peak | Prompt |', '| --- | --- | --- | --- |']
for k in order:
    for f in sorted(by[k]):
        v = F[f]; r = V[f]; src = v['source']
        if 'rendered' in src: pr = '*(rendered in Python/numpy, no prompt; see §11.3)*'
        else:
            pr = src['prompt']
            if 'derived_from' in src and k != 'broom-glide': pr = f"*(tone repitched to MIDI {v.get('midi', '/'.join(map(str, v.get('notes_midi', []))))})* " + pr
            if k == 'broom-glide': pr = '*(cut from the `broom-whoosh` take, filtered 120 Hz–1.6 kHz, 5 dB quieter)* ' + pr
            cut = v.get('cut_at_s', src.get('cut_at_s'))
            if cut is not None: pr = f"*(hit cut at {cut} s of one multi-hit take" + (', plus saturation and crunch layers' if k == 'giant-stomp' else '') + ')* ' + pr
        P.append(f"| `{f}` | {r['dur']:.2f} | {r['pk']:.1f} | {pr} |")
open('doc_prompts.md', 'w').write('\n'.join(P) + '\n')
print(len(lines) - 2, 'keys', len(P) - 2, 'files')
