"""Export reviewed side/quarter pairs and the mirrorable single wing.

No drawn geometry: preserve ImageGen colors and alpha shape, calibrating
membrane opacity to gauze. All joints land at330,300. Components separate
neighboring silhouettes even when their rectangular source bounds overlap.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,numpy as np
from scipy import ndimage
H=Path(__file__).resolve().parent;G=H.parents[2]
ROOT=[330,300]
SPECS={
'single':[[465,340],[979,342],[1468,340],[542,718],[1009,657],[1495,773]],
'side':[[466,341],[980,342],[1471,340],[542,718],[1011,657],[1497,774]],
'quarter':[[373,318],[899,317],[1395,326],[372,738],[853,629],[1375,779]],
}
def frames(kind):
 im=Image.open(H/f'{kind}-source.webp').convert('RGBA');a=np.array(im)
 labels,count=ndimage.label(a[:,:,3]>8);areas=np.bincount(labels.ravel());areas[0]=0
 ids=sorted(np.argsort(areas)[-6:],key=lambda i:ndimage.center_of_mass(labels==i)[0])
 ids=sorted(ids[:3],key=lambda i:ndimage.center_of_mass(labels==i)[1])+sorted(ids[3:],key=lambda i:ndimage.center_of_mass(labels==i)[1])
 assert sum(areas[ids])/sum(areas)>.98,(kind,'lost component')
 output=[];records=[]
 for n,(i,root) in enumerate(zip(ids,SPECS[kind])):
  mask=ndimage.binary_dilation(labels==i,iterations=2);v=a.copy();v[~mask,3]=0
  src=Image.fromarray(v);b=src.getchannel('A').getbbox();rx,ry=root
  assert a[ry,rx,3]>8,(kind,n,'source joint',a[ry,rx,3])
  factor=min(340/(b[3]-b[1]),320/max(1,rx-b[0]),170/max(1,b[2]-rx),290/max(1,ry-b[1]),200/max(1,b[3]-ry))
  art=src.crop(b).resize((round((b[2]-b[0])*factor),round((b[3]-b[1])*factor)),Image.Resampling.LANCZOS)
  art.putalpha(art.getchannel('A').point(lambda v:round(v*.62)))
  x=round(330-(rx-b[0])*factor);y=round(300-(ry-b[1])*factor)
  f=Image.new('RGBA',(512,512));f.alpha_composite(art,(x,y));bb=f.getchannel('A').getbbox()
  assert min(bb[:2])>0 and max(bb[2:])<512,(kind,n,bb)
  output.append(f);records.append({'sourceRoot':root,'root':ROOT,'bounds':bb,'scale':factor})
 return output,records
allframes={};report={}
for kind in SPECS:allframes[kind],report[kind]=frames(kind)
pair=Image.new('RGBA',(3072,1024));single=Image.new('RGBA',(3072,512))
for n in range(6):
 pair.paste(allframes['side'][n],(512*n,0));pair.paste(allframes['quarter'][n],(512*n,512));single.paste(allframes['single'][n],(512*n,0))
for name,im in [('fairy_wings_sprites',pair),('fairy_wing_single_sprites',single)]:
 path=G/f'assets/{name}.webp';im.save(path,lossless=True,exact=True,method=6)
 report[name]={'size':im.size,'alphaRange':im.getchannel('A').getextrema(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
# Compact review: three views, six phases, light/dark backgrounds.
review=Image.new('RGB',(1536,3072))
for row,kind in enumerate(SPECS):
 for n,f in enumerate(allframes[kind]):
  bg=Image.new('RGBA',(512,512),'#61bad7' if n<3 else '#20273f');d=ImageDraw.Draw(bg)
  for xx in range(0,512,64):d.line((xx,0,xx,512),fill='#818a99',width=2)
  bg.alpha_composite(f);ImageDraw.Draw(bg).text((12,12),f'{kind} phase{n+1}',fill='white')
  review.paste(bg.convert('RGB'),(n%3*512,(row*2+n//3)*512))
review.save(H/'review.webp',quality=90,method=6)
(H/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if isinstance(v,dict)},indent=2))
