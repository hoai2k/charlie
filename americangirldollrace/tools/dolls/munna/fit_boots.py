"""Fit Munna's initial boots without changing existing racers' guesses."""
from pathlib import Path
import json
import re
import sys
import subprocess

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import fit_moon_boots as F

if __name__=='__main__':
    F.CELL_WIDTHS,F.FOOT_MID=F.game_constants()
    # Human leg transfers can put both boots on one of this plump plush's
    # legs. Keep the game's learned views, rooted on Munna's measured feet.
    raw=json.loads(subprocess.run(['node',str(F.GAME/'tools/dolls/moon_boot_guesses.mjs')],check=True,capture_output=True,text=True).stdout)
    raw={k:v for k,v in raw.items() if k.startswith('munna/')}
    fitted,shares=F.fit_all(raw)
    assert len(fitted)==20, f'Expected every applicable pose, got {len(fitted)}'
    path=F.GAME/'moon-boot-guesses.js';text=path.read_text()
    match=re.search(r'window.MOON_BOOT_GUESSES\s*=\s*',text)
    current,end=json.JSONDecoder().raw_decode(text[match.end():])
    current={k:v for k,v in current.items() if not k.startswith('munna/')}
    current.update(fitted)
    body=',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k,v in sorted(current.items()))
    path.write_text(text[:match.end()]+'{\n'+body+'\n}'+text[match.end()+end:])
    print(f'Munna: {len(fitted)} poses, {sum(s>=F.FIT_COVER for s in shares)}/{len(shares)} feet fully covered; awaiting owner verification')
