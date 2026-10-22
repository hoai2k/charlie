"""Validate calibrated action sheets and painted prop protection."""
from pathlib import Path
import json,hashlib
from PIL import Image
import numpy as np
H=Path(__file__).resolve().parent;G=H.parents[2]
for p in sorted((H/'reports').glob('*.json')):
 if p.name.startswith('.'):continue
 d=json.loads(p.read_text());k=d['assetKey'];path=G/f'assets/doll_{k}_actions.webp';im=Image.open(path).convert('RGBA');m=Image.open(G/f'assets/masks/{k}_actions_mask.webp').convert('RGB');assert im.size==m.size==(1254,1254);assert hashlib.sha256(path.read_bytes()).hexdigest()==d['sha256']
 assert hashlib.sha256((G/f'assets/masks/{k}_actions_mask.webp').read_bytes()).hexdigest()==d['maskSha256']
 for n,f in enumerate(d['frames']):
  x=n%3*418;y=n//3*418;a=np.array(im.crop((x,y,x+418,y+418)));
  assert f['bounds'][3]==409 and min(f['bounds'][:2])>=4 and f['bounds'][2]<414
  if n<3:
   tx,ty=map(round,f['wandTip']);assert a[ty,tx,3]>16,(k,n,'wand tip missing')
   mm=np.array(m.crop((x,y,x+418,y+418)));assert mm[ty,tx,:2].max()<20,(k,n,'wand star was tinted')
  assert f['scale']>0 and abs(f['scale']*f['packedScale']-f['sourceScale'])<1e-8
 print(k,'9 poses: masks, alpha, baseline, measured wand tips and restored anatomy passed')

for key in ['kaya','barbie','cinnamon']:
 folder=H/'follow-through'
 for kind,path in [('sheet',G/f'assets/doll_{key}_actions.webp'),('mask',G/f'assets/masks/{key}_actions_mask.webp')]:
  before=Image.open(folder/f'{key}-{kind}-before.webp').convert('RGBA' if kind=='sheet' else 'RGB')
  after=Image.open(path).convert(before.mode)
  for n in range(9):
   if n==2:continue
   x=n%3*418;y=n//3*418;box=(x,y,x+418,y+418)
   assert before.crop(box).tobytes()==after.crop(box).tobytes(),(key,kind,n,'unrequested cell changed')
 print(key,'forward-wand redo: other eight art and mask cells pixel-identical')
