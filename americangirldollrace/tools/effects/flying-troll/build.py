"""Pack flying poses with one scale and measured hip joints, no wings painted."""
from pathlib import Path
from PIL import Image,ImageDraw
from scipy import ndimage
import json,numpy as np,hashlib
H=Path(__file__).resolve().parent;G=H.parents[2]
im=Image.open(H/'source.webp').convert('RGBA');a=np.array(im);labels,n=ndimage.label(a[:,:,3]>8);areas=np.bincount(labels.ravel());areas[0]=0;ids=sorted(np.argsort(areas)[-3:],key=lambda i:ndimage.center_of_mass(labels==i)[1])
assert sum(areas[ids])/sum(areas)>.99
hips=[[340,450],[1100,450],[1770,370]];factor=.44
sheet=Image.new('RGBA',(1254,418));records=[]
for col,(i,hip) in enumerate(zip(ids,hips)):
 v=a.copy();v[~ndimage.binary_dilation(labels==i,iterations=2),3]=0;src=Image.fromarray(v);b=src.getchannel('A').getbbox();art=src.crop(b).resize((round((b[2]-b[0])*factor),round((b[3]-b[1])*factor)),Image.Resampling.LANCZOS)
 x=round(205-(hip[0]-b[0])*factor);y=round(250-(hip[1]-b[1])*factor)
 frame=Image.new('RGBA',(418,418));frame.alpha_composite(art,(x,y));bb=frame.getchannel('A').getbbox();assert x>0 and y>0 and x+art.width<418 and y+art.height<418,(col,x,y,art.size)
 sheet.paste(frame,(col*418,0));records.append({'hip':[205,250],'sourceHip':hip,'sourceScale':factor,'bounds':bb})
target=G/'assets/troll_flying_sprites.webp';sheet.save(target,lossless=True,exact=True,method=6)
review=Image.new('RGB',(1672,418),'#b9d0cf');ref=Image.open(G/'assets/monster_sprites.webp').convert('RGBA').crop((0,418,418,836));review.paste(ref,(0,0),ref)
review.paste(sheet,(418,0),sheet);d=ImageDraw.Draw(review)
for n in range(4):d.ellipse((n*418+201,246,n*418+209,254),outline='red',width=2)
review.save(H/'review.webp',quality=90,method=6)
(H/'report.json').write_text(json.dumps({'size':sheet.size,'frames':records,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()},indent=2)+'\n')
