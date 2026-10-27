"""Fit Cornsilk's initial boots without changing existing racers' guesses."""
from pathlib import Path
import json
import re
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import fit_moon_boots as F

if __name__=='__main__':
    F.CELL_WIDTHS,F.FOOT_MID=F.game_constants()
    raw={k:v for k,v in F.guesses(False).items() if k.startswith('cornsilk/')}
    fitted,shares=F.fit_all(raw)
    assert len(fitted)==20, f'Expected every applicable pose, got {len(fitted)}'
    path=F.GAME/'moon-boot-guesses.js';text=path.read_text()
    match=re.search(r'window.MOON_BOOT_GUESSES\s*=\s*',text)
    current,end=json.JSONDecoder().raw_decode(text[match.end():])
    current={k:v for k,v in current.items() if not k.startswith('cornsilk/')}
    current.update(fitted)
    body=',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k,v in sorted(current.items()))
    path.write_text(text[:match.end()]+'{\n'+body+'\n}'+text[match.end()+end:])
    print(f'Cornsilk: {len(fitted)} poses, {sum(s>=F.FIT_COVER for s in shares)}/{len(shares)} feet fully covered; awaiting owner verification')
