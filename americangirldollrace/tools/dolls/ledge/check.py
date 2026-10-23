"""Validate the delivered ledge image contract and source/frame scale invariants."""
from pathlib import Path
from PIL import Image
import json,hashlib,numpy as np
H=Path(__file__).resolve().parent;G=H.parents[2]
for path in sorted((H/'reports').glob('*.json')):
 if path.name.startswith('._'):continue
 report=json.loads(path.read_text());key=report['assetKey'];artpath=G/f'assets/doll_{key}_ledge.webp';maskpath=G/f'assets/masks/{key}_ledge_mask.webp'
 art=Image.open(artpath).convert('RGBA');mask=Image.open(maskpath).convert('RGB');assert art.size==mask.size==(1254,418)
 assert hashlib.sha256(artpath.read_bytes()).hexdigest()==report['sha256'];assert hashlib.sha256(maskpath.read_bytes()).hexdigest()==report['maskSha256']
 scales=set()
 for n,r in enumerate(report['frames']):
  a=np.array(art.crop((n*418,0,(n+1)*418,418)));b=r['bounds'];assert min(b[:2])>=4 and max(b[2:])<=414,(key,n,b)
  x,y=r['ledgeContact'];assert 0<x<418 and 0<y<418
  scales.add(r['sourceScale']);assert max(a[0,:,3].max(),a[-1,:,3].max(),a[:,0,3].max(),a[:,-1,3].max())==0
  m=np.array(mask.crop((n*418,0,(n+1)*418,418)));assert m.max()>40,(key,n,'empty mask')
 assert len(scales)==1,key
 src=np.array(Image.open(H/f'sources/{key}.webp').convert('RGBA'))[:,:,3];assert max(src[0].max(),src[-1].max(),src[:,0].max(),src[:,-1].max())<128,key
 print(key,'3 poses, masks, anchors, common scale, alpha margins and hashes passed')
