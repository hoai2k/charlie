"""Validate reviewed shared sprites against their frame and alpha contracts."""
from pathlib import Path
import hashlib,json
from PIL import Image
H=Path(__file__).resolve().parent;G=H.parents[1]
for p in sorted((H/'reports').glob('*.json')):
 if p.name.startswith('.'):continue
 d=json.loads(p.read_text());target=G/d['path'];im=Image.open(target).convert('RGBA');assert list(im.size)==d['size'];assert hashlib.sha256(target.read_bytes()).hexdigest()==d['sha256'];w,h=d['frameSize']
 for i,b in enumerate(d['frames']):
  if b is None:
   assert p.stem=='cloudtroll' and i==11 and not im.crop((836,1254,1254,1672)).getchannel('A').getbbox();continue
  assert b[0]>0 and b[1]>0 and b[2]<w and b[3]<h,(p,i,b)
  assert b[3] == (409 if w==418 else h-1),(p,i,b)
 print(p.stem,len(d['frames']),'frames: dimensions, alpha gutters, baseline and hash passed')

robot=json.loads((H/'reports/robot.json').read_text())
ref=Image.open(G/'assets/monster_sprites.webp').convert('RGBA')
rb=ref.crop((0,0,418,418)).getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
b=robot['frames'][0];assert abs((b[3]-b[1])-(rb[3]-rb[1]))<=2
b=robot['frames'][11];assert b[2]-b[0]>2*(b[3]-b[1]),'Defeated robot must lie flat'
print('robot: original-troll standing height and flat defeated silhouette passed')

# Measured anchors must match runtime and land on real palm pixels.
import re
calibration=json.loads((H/'monster-calibration.json').read_text())
game=(G/'monsters.js').read_text()
for key,cal in calibration.items():
 hands=json.loads(re.search(r'  '+key+r': \{[^}]*?grabHands: (\[\[.*?\]\])',game)[1])
 assert hands==cal['grabHands'],(key,'runtime calibration drift')
 im=Image.open(G/f'assets/{key}_sprites.webp').convert('RGBA')
 for n,(x,y) in enumerate(hands):assert im.getpixel((418*n+x,836+y))[3]>128,(key,n,'hand outside art')
 b=json.loads((H/f'reports/{key}.json').read_text())['frames'][11]
 if b is not None:assert b[2]-b[0]>1.8*(b[3]-b[1]),(key,'final pose must be a low silhouette')
 print(key,'runtime hand anchors and defeated silhouette passed')
