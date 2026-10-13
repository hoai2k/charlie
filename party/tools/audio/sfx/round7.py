"""Round 7 SFX: sounds requested by the cheeky Molly Party games (specs in round7-specs.txt:
'key | prompt | dur | kind | fallback'). Uses lib2 (the key is read inside the process only).
  python3 round7.py gen [game ...]   -> generate raw takes (cached)
  python3 round7.py build [game ...] -> pick the best take per key, write assets/audio/sfx/<key>, update manifest
"""
import json, os, sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import lib2 as L

R = 'r7'
TAKES = 3
SPEC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'round7-specs.txt')
MODE = {'hit': -3.3, 'ui': -6.3}
SUFFIX = '. One single sound effect, isolated, close-up, clean, no music, no voices, no speech, no words, no reverb tail.'

def specs(games=None):
    out, game = [], None
    for line in open(SPEC):
        line = line.strip()
        if line.startswith('## '): game = line[3:].split()[0]; continue
        if not line or line.startswith('#'): continue
        k, prompt, dur, kind, fb = [p.strip() for p in line.split('|')]
        if games and game not in games: continue
        out.append(dict(game=game, key=k, prompt=prompt, dur=float(dur), kind=kind, fb=fb))
    return out

def stem(key, i): return f"{R}/{key.replace('/', '_')}-{i}"

def gen(games):
    jobs = [(s, i) for s in specs(games) for i in range(1, TAKES + 1)]
    def do(j):
        s, i = j
        st = stem(s['key'], i)
        if os.path.exists(f'{L.RAW}/{st}.mp3'): return st, 'cached'
        # ask for a little more than the target so the sound isn't cut off; the build trims
        return st, L.generate(st, s['prompt'] + SUFFIX, max(0.5, s['dur'] + 0.4), 0.7)
    with ThreadPoolExecutor(4) as ex:
        for st, r in ex.map(do, jobs): print(st, r, flush=True)

def score(x, target):
    d = len(x) / L.SR
    a = L.analyze(x)
    # closest to the requested length, not shrill, not near-silent
    return abs(np.log((d + 0.05) / (target + 0.05))) + 0.6 * max(0, a.get('hi', 0) - 0.45) + (5 if d < 0.04 else 0)

def build(games):
    man_p = f'{L.OUT}/manifest.json'; man = json.load(open(man_p))
    for s in specs(games):
        cands = []
        for i in range(1, TAKES + 1):
            f = f"{L.RAW}/{stem(s['key'], i)}.mp3"
            if not os.path.exists(f): continue
            try: x = L.trim(L.load(f), tail_rel=40)
            except (IndexError, ValueError): continue   # silent take
            if len(x) == 0: continue
            cands.append((score(x, s['dur']), i, x))
        if not cands: print('MISSING', s['key']); continue
        sc, i, x = min(cands, key=lambda c: c[0])
        maxd = s['dur'] * 1.6 + 0.1
        fo = None
        if len(x) > maxd * L.SR: x = x[: int(maxd * L.SR)]; fo = min(0.12, maxd * 0.3)
        dst = f"{L.OUT}/sfx/{s['key']}"
        path, g, info = L.finish(x, dst, peak_db=MODE[s['kind']], fade_out=fo)
        rel = os.path.relpath(path, L.OUT)
        man['sfx'][s['key']] = rel
        print(f"{s['key']:20s} take {i} -> {rel:30s} {os.path.getsize(path) / 1024:5.1f} KB  {len(x) / L.SR:.2f} s (asked {s['dur']})", flush=True)
    json.dump(man, open(man_p, 'w'), indent=1); open(man_p, 'a').write('\n')

if __name__ == '__main__':
    games = sys.argv[2:] or None
    {'gen': gen, 'build': build}[sys.argv[1]](games)
