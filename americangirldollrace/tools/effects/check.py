"""Validate reviewed shared sprites against their frame and alpha contracts."""
from pathlib import Path
import hashlib,json
from PIL import Image
H=Path(__file__).resolve().parent;G=H.parents[1]
for p in sorted((H/'reports').glob('*.json')):
 if p.name.startswith('.'):continue
 d=json.loads(p.read_text());target=G/d['path'];im=Image.open(target).convert('RGBA');assert list(im.size)==d['size'];assert hashlib.sha256(target.read_bytes()).hexdigest()==d['sha256'];w,h=d['frameSize']
 for i,b in enumerate(d['frames']):
  assert b[0]>0 and b[1]>0 and b[2]<w and b[3]<h,(p,i,b)
  assert b[3] == (409 if w==418 else h-1),(p,i,b)
 print(p.stem,len(d['frames']),'frames: dimensions, alpha gutters, baseline and hash passed')

robot=json.loads((H/'reports/robot.json').read_text())
ref=Image.open(G/'assets/monster_sprites.webp').convert('RGBA')
rb=ref.crop((0,0,418,418)).getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
b=robot['frames'][0];assert abs((b[3]-b[1])-(rb[3]-rb[1]))<=2
b=robot['frames'][11];assert b[2]-b[0]>2*(b[3]-b[1]),'Defeated robot must lie flat'
print('robot: original-troll standing height and flat defeated silhouette passed')
