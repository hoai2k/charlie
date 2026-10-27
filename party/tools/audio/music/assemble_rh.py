"""assemble_rh.py score            -> print per-take selection metrics
   assemble_rh.py write id=n ...  -> move chosen takes into rhythm/, write rhythm/index.json v2 + takes/index.json"""
import sys, os, json, glob, shutil
import numpy as np
D = os.path.dirname(os.path.abspath(__file__)); A = '/home/user/charlie/party/assets/audio'
sys.path.insert(0, D)
from plans import SONGS


def metrics(t):
    r = json.load(open(f'{D}/results/{t}.json')); st = json.load(open(f'{D}/results/rh2stats-{t}.json'))
    g = [s for s in st['sections'] if s['kind'] == 'groove']
    offs = [s['beat_offset_ms'] for s in g if s.get('beat_offset_ms') is not None]
    spread = (max(offs) - min(offs)) if len(offs) > 1 else 0
    ng = len(g); nb = sum(s['kind'] == 'breath' for s in st['sections'])
    score = (st['strong_within25_of_section_grid_pct'] or 0) / 100 + 0.4 * min(ng, 3) / 3 + 0.3 * min(nb, 3) / 3
    if spread > 15: score -= 1
    if r['phase_spread_ms'] > 20: score -= 0.3
    return dict(take=t, score=round(score, 3), ng=ng, nb=nb, offs=offs, spread=round(spread, 1), phase_spread=r['phase_spread_ms'],
                strong_fit=st['strong_within25_of_section_grid_pct'], fit16=st['within25_of_section_grid_pct'], fit12=st['within25_of_12th_pct'],
                onsets=st['onsets'], lufs=r['lufs_mp3'], tp=r['tp_mp3'], lengthBeats=r['lengthBeats'], dur=r['duration'],
                secs=' '.join(f"{s['name']}:{s['bars']}b/{s['feel'][0]}" for s in st['sections']))


if sys.argv[1] == 'score':
    for sid in SONGS:
        for k in (1, 2):
            t = f'{sid}-{k}'
            if os.path.exists(f'{D}/results/rh2stats-{t}.json'): print(json.dumps(metrics(t)))
    sys.exit()

chosen = dict(a.split('=') for a in sys.argv[2:])
notes = json.load(open(f'{D}/rh_notes.json'))
songs = []
tk = json.load(open(f'{A}/music/takes/index.json'))
tk['takes'] = [e for e in tk['takes'] if e['song'] not in chosen]
os.makedirs(f'{A}/music/rhythm', exist_ok=True)
for sid, S in SONGS.items():
    if sid not in chosen: continue
    for k in (1, 2, 3):
        if not os.path.exists(f'{D}/results/rh2-{sid}-{k}.json'): continue
        t = f'{sid}-{k}'
        r = json.load(open(f'{D}/results/{t}.json')); v2 = json.load(open(f'{D}/results/rh2-{t}.json'))
        st = json.load(open(f'{D}/results/rh2stats-{t}.json'))
        src = f'{A}/music/takes/{t}.mp3'
        ing = chosen.get(sid) == str(k)
        if ing:
            dst = f'{A}/music/rhythm/{sid}.mp3'
            if os.path.exists(src): shutil.move(src, dst)
            file = f'music/rhythm/{sid}.mp3'
            e = dict(id=sid, name=S['name'], style=S['style'], file=file, bpm=S['bpm'], key=S['key'])
            e.update(v2)
            e['lufs'] = r['lufs_mp3']
            # order keys as in the spec
            order = ['id', 'name', 'style', 'file', 'bpm', 'start', 'lengthBeats', 'beatsPerBar', 'loop', 'sections', 'div', 'onsets', 'tags', 'key', 'lufs']
            songs.append({kk: e[kk] for kk in order})
        else:
            file = f'music/takes/{t}.mp3'
        dec = json.load(open(f'{D}/chrome/decode.json'))['results']
        tk['takes'].append(dict(song=sid, take=k, kind='song', name=S['name'], style=S['style'], file=file, bpm=S['bpm'],
                                bars=r['lengthBeats'] // 4, lengthBeats=r['lengthBeats'], loopStart=r['start'], loopEnd=r['duration'],
                                lufs=r['lufs_mp3'], truePeak=r['tp_mp3'], onsetFit12=st['within25_of_12th_pct'],
                                onsetFit16=st['within25_of_section_grid_pct'], notes=notes[t], **({'inGame': True} if ing else {})))
# Shadow Banish (dance loop) in v2
dr = json.load(open(f'{D}/results/dance-1.json')); dv = json.load(open(f'{D}/results/rh2-dance-1.json'))
vv = json.load(open(f'{D}/results/verify.json'))['dance-1']
dance = dict(id='dance', name='Shadow Banish', style='K-pop dance', file='music/takes/dance-1.mp3', bpm=120, start=vv['loopStart'],
             lengthBeats=128, beatsPerBar=4, loop=True, loopStart=vv['loopStart'], loopEnd=vv['loopEnd'], sections=dv['sections'],
             div=12, onsets=dv['onsets'], tags=dv['tags'], key='C minor', lufs=vv['lufs'])
prev = {}
try:
    pj = json.load(open(f'{A}/music/rhythm/index.json'))
    if pj.get('version') == 2: prev = {x['id']: x for x in pj['songs'] if x['id'] != 'dance' and x['id'] not in chosen}
except Exception: pass
allsongs = list(prev.values()) + songs
allsongs.sort(key=lambda x: list(SONGS).index(x['id']))
out = {'version': 2, 'songs': [dance] + allsongs}
s = json.dumps(out, separators=(',', ':'))
open(f'{A}/music/rhythm/index.json', 'w').write(s + '\n')
json.dump(tk, open(f'{A}/music/takes/index.json', 'w'), indent=1); open(f'{A}/music/takes/index.json', 'a').write('\n')
print('rhythm index', len(s), 'bytes,', len(out['songs']), 'songs; takes index', len(tk['takes']), 'entries')
