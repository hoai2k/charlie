"""Check packed dimensions, alpha gutters, baseline and reproducible frame calibration."""
from pathlib import Path
import json,hashlib
from PIL import Image
import numpy as np
HERE=Path(__file__).resolve().parent;GAME=HERE.parents[2]
for report in sorted((HERE/'reports').glob('*.json')):
 if report.name.startswith('.'):continue
 d=json.loads(report.read_text());key=d['assetKey'];p=GAME/f'assets/doll_{key}_toys.webp';im=Image.open(p).convert('RGBA');mask=Image.open(GAME/f'assets/masks/{key}_toys_mask.webp')
 assert im.size==mask.size==(1254,1672)
 assert hashlib.sha256(p.read_bytes()).hexdigest()==d['sha256']
 for n,f in enumerate(d['frames']):
  x=n%3*418;y=n//3*418;cell=im.crop((x,y,x+418,y+418));a=np.array(cell)[:,:,3];ys,xs=np.where(a>8)
  assert ys.max()+1==409 and ys.min()>=4 and xs.min()>=4 and xs.max()<414,(key,n)
  assert abs(f['scale']*f['renderScale']-d['scale']*(d['actionScaleRatio'] if n in [3,4,5,9,10,11] else 1))<1e-8
 print(key,'12 frames, masks, gutters, foot/tip baseline409 and anatomical scale passed')
