"""Round 3 SFX: Sparkle Bead Shop (bead-click, bead-zip) and Melody Maker
instrument samples (inst/*). Uses lib2 (key read inside the process only).
  python3 round3.py gen      -> generate raw takes (cached)
  python3 round3.py build    -> process chosen takes into assets/audio/sfx and print a report
"""
import json, os, sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import lib2 as L

R = 'r3'   # raw subfolder
SPECS = [
    # key, takes, prompt, gen duration, influence, kind, maxd, base midi (pitched) or None
    ('bead-click', 4, 'A single crisp click of two small plastic craft beads tapping together, close-up, dry, quiet, isolated, no reverb', 0.5, 0.75, 'ui', 0.12, None),
    ('bead-zip', 3, 'A short soft zip of a small glass bead sliding down a cotton string, gentle slightly rising swish, close-up, isolated, no squeak, no music', 0.6, 0.7, 'ui', 0.35, None),
    ('inst/bells', 3, 'A single glockenspiel music box bell note, bright and clear, one strike only, ringing out for one and a half seconds, isolated, dry, no melody', 2.0, 0.7, 'hit', 1.6, 72),
    ('inst/piano', 3, 'A single soft upright piano note, middle C, medium velocity, one key press only, dry, isolated, no melody', 1.6, 0.7, 'hit', 1.3, 60),
    ('inst/marimba', 3, 'A single warm marimba note struck once with a soft mallet, dry, isolated, no melody', 1.0, 0.7, 'hit', 0.7, 60),
    ('inst/choir', 4, 'A single child-like voice singing one short la syllable on one steady pitch, gentle vibrato, soft release, dry studio, no words, no melody', 1.2, 0.75, 'hit', 0.9, 72),
    ('inst/kick', 3, 'A single soft round kick drum hit, warm and short, not boomy, dry, isolated', 0.5, 0.7, 'hit', 0.3, None),
    ('inst/clap', 3, 'A single light hand clap, dry, close, isolated, one clap only', 0.5, 0.7, 'hit', 0.25, None),
    ('inst/shaker', 3, 'A single short egg shaker shake, one quick shh, dry, isolated', 0.5, 0.7, 'hit', 0.14, None),
]
MODE = {'hit': -3.3, 'ui': -6.3}


def stem(key, i): return f"{R}/{key.replace('/', '_')}-{i}"


def gen():
    jobs = [(k, i, p, d, inf) for k, n, p, d, inf, *_ in SPECS for i in range(1, n + 1)]
    def do(j):
        k, i, p, d, inf = j
        s = stem(k, i)
        if os.path.exists(f'{L.RAW}/{s}.mp3'): return s, 'cached'
        return s, L.generate(s, p, d, inf)
    with ThreadPoolExecutor(4) as ex:
        for s, r in ex.map(do, jobs): print(s, r, flush=True)


def take_report():
    """Per take: duration after trim, pitch (and how steady), loudness balance."""
    rep = {}
    for k, n, p, d, inf, kind, maxd, base in SPECS:
        for i in range(1, n + 1):
            f = f'{L.RAW}/{stem(k, i)}.mp3'
            if not os.path.exists(f): continue
            x = L.trim(L.load(f), tail_rel=40)
            info = {'dur': round(len(x) / L.SR, 3)}
            if base:
                seg = x[: int(0.4 * L.SR)]
                f1 = L.f0(seg[: len(seg) // 2]); f2 = L.f0(seg[len(seg) // 2:])
                info.update(f0=round(float(f1), 1), steady_cents=round(float(1200 * abs(np.log2(f2 / f1))), 1) if f1 > 0 and f2 > 0 else None)
            a = L.analyze(x); info.update({kk: a[kk] for kk in ('cen', 'hi') if kk in a})
            rep[f'{k}-{i}'] = info
    return rep


def build(choice):
    """choice: {key: [take numbers]} -> files + manifest entries."""
    man_p = f'{L.OUT}/manifest.json'; man = json.load(open(man_p))
    out = {}
    for k, n, p, d, inf, kind, maxd, base in SPECS:
        takes = choice.get(k)
        if not takes: continue
        files = []
        for j, i in enumerate(takes, 1):
            x = L.trim(L.load(f'{L.RAW}/{stem(k, i)}.mp3'), tail_rel=40)
            if base:
                f = L.f0(x[: int(0.4 * L.SR)])
                x = L.trim(L.repitch(x, L.mtof(base) / f), tail_rel=40)
            fo = None
            if len(x) > maxd * L.SR: x = x[: int(maxd * L.SR)]; fo = min(0.25, maxd * 0.35) if base else 0.04
            dst = f"{L.OUT}/sfx/{k}" + (f'-{j}' if len(takes) > 1 else '')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            path, g, info = L.finish(x, dst, peak_db=MODE[kind], fade_out=fo, fmt='mp3' if len(x) / L.SR >= 0.4 else 'wav')
            rel = os.path.relpath(path, L.OUT)
            files.append(rel)
            chk = ''
            if base:
                ff = L.f0(L.load(path, hp=0)[: int(0.4 * L.SR)])
                chk = f' pitch {1200 * np.log2(ff / L.mtof(base)):+.0f} cents'
            print(f'{k:14s} take {i} -> {rel:28s} {os.path.getsize(path) / 1024:5.1f} KB  {len(x) / L.SR:.2f} s{chk}', flush=True)
        man['sfx'][k] = files if len(files) > 1 else files[0]
        out[k] = files
    json.dump(man, open(man_p, 'w'), indent=1); open(man_p, 'a').write('\n')
    return out


if __name__ == '__main__':
    if sys.argv[1] == 'gen': gen()
    elif sys.argv[1] == 'report': print(json.dumps(take_report(), indent=0))
    elif sys.argv[1] == 'build': build(json.loads(sys.argv[2]))
