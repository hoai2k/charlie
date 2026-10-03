import json, os, collections, re
import lib2 as L
r = json.load(open('results.json'))
by = collections.defaultdict(list)
for stem, v in r.items(): by[v['key']].append((stem, v))
final = {}
for key, takes in by.items():
    takes.sort(key=lambda t: t[0])
    for i, (stem, v) in enumerate(takes):
        ext = os.path.splitext(v['file'])[1]
        base = ('jingle/' + key.split('/')[1]) if key.startswith('jingle/') else 'sfx/' + key
        new = f'{base}{ext}' if len(takes) == 1 else f'{base}-{i+1}{ext}'
        if new != v['file']:
            assert not os.path.exists(f'{L.OUT}/{new}') or new in [t[1]['file'] for t in takes], new
            os.rename(f'{L.OUT}/{v["file"]}', f'{L.OUT}/{new}.tmp')
            v['tmp'] = True
        v['take'] = stem; v['final'] = new
        final[new] = v
for new, v in final.items():
    if v.pop('tmp', False): os.rename(f'{L.OUT}/{new}.tmp', f'{L.OUT}/{new}')
    v['file'] = new
json.dump(final, open('final.json', 'w'), indent=1)
# manifest merge (re-read the live file; only sfx keys are added; music untouched)
mp = L.OUT + '/manifest.json'
m = json.load(open(mp))
keys = collections.defaultdict(list)
for f, v in final.items(): keys[v['key']].append(f)
added = []
for k, fs in keys.items():
    fs.sort(); m['sfx'][k] = fs[0] if len(fs) == 1 else fs; added.append(k)
def order(k):
    g = 0
    if k.startswith('npc/'): g = 2
    elif k.startswith('jingle/'): g = 3
    elif k.startswith('voice/'): g = 4
    elif k.startswith('host/'): g = 5
    elif '/' in k: g = 1
    return (g, k)
m['sfx'] = {k: m['sfx'][k] for k in sorted(m['sfx'], key=order)}
s = json.dumps(m, indent=1) + '\n'
open(mp, 'w').write(s)
print('added', len(added), 'keys;', len(final), 'files; manifest sfx keys', len(m['sfx']))
