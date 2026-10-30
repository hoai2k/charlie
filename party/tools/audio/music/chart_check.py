"""chart_check.py notes.json : do the charts' notes land on audible attacks in the audio?
notes.json comes from `node chart_report.mjs --json notes.json` (each note's time in the file).
Per song x level: the attack nearest each note (25 % point of the rise of the full-band 2 ms envelope,
searched within +-60 ms), its signed offset (median, ms), the share within +-25 / +-50 ms, and
how strong the note's attack is: its median percentile among the attack rises found at 400 random
times in the same song (50 % = no better than chance; on-beat kicks score 80-95 %)."""
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mlib
from verify import local_attack
SR = mlib.SR
A = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'assets', 'audio'))

data = json.load(open(sys.argv[1]))
cache = {}
rng = np.random.default_rng(1)
print('| Song | Level | Notes | Median offset | Within ±25 ms | Within ±50 ms | Attack strength (percentile) |')
print('| --- | --- | --- | --- | --- | --- | --- |')
for d in data:
    if d['file'] not in cache:
        x = mlib.mono(mlib.decode(os.path.join(A, d['file']), SR, 2)).astype(np.float64)
        e = mlib.amp_env(x, SR) + mlib.amp_env(x, SR, (2000, 8000))
        dur = len(x) / SR
        base = np.sort([local_attack(e, t, search=0.025)[1] for t in rng.uniform(1, dur - 1, 400)])
        cache[d['file']] = (e, base)
    e, base = cache[d['file']]
    offs, rises = [], []
    for n in d['notes']:
        t, _ = local_attack(e, n['t'], search=0.06)
        if np.isfinite(t): offs.append((t - n['t']) * 1000)
        rises.append(np.searchsorted(base, local_attack(e, n['t'], search=0.025)[1]) / len(base))
    offs = np.array(offs); rises = np.array(rises)
    lv = ['Easy', 'Normal', 'Hard'][d['level']]
    print(f"| `{d['id']}` | {lv} | {len(d['notes'])} | {np.median(offs):+.1f} ms | {np.mean(np.abs(offs) <= 25) * 100:.0f}% | "
          f"{np.mean(np.abs(offs) <= 50) * 100:.0f}% | {np.median(rises) * 100:.0f}% |")
