import sys, os
from concurrent.futures import ThreadPoolExecutor
import lib2 as L, catalog
sel = [a for a in sys.argv[1:] if not a.startswith('--')]
force = '--force' in sys.argv
es = [e for e in catalog.E if not sel or e['key'] in sel or e['stem'] in sel]
def do(e):
    if not force and os.path.exists(f"{L.RAW}/{e['stem']}.mp3"): return e['stem'], 'cached'
    return e['stem'], L.generate(e['stem'], e['prompt'], e['dur'], e['infl'], e['loop'])
with ThreadPoolExecutor(4) as ex:
    for stem, r in ex.map(do, es): print(stem, r, flush=True)
