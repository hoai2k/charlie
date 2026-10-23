"""Append MB2 views without changing any decoded MB1 pixels."""
from pathlib import Path
from PIL import Image
import importlib.util,json,hashlib,numpy as np
HERE=Path(__file__).resolve().parent;GAME=HERE.parents[2]
spec=importlib.util.spec_from_file_location('packing',GAME/'tools/tracks/build.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
before=Image.open(HERE/'before.webp').convert('RGBA');assert before.size==(768,256)
source=p.clean(Image.open(HERE/'source.webp'));occupied=(np.asarray(source.getchannel('A'))>8).any(axis=0)
cuts=[0]+[p.gap_cut(occupied,round(source.width*n/4),round(source.width*.09)) for n in [1,2,3]]+[source.width]
sheet=Image.new('RGBA',(1792,256));sheet.paste(before,(0,0));frames=[]
for n,(width,name) in enumerate([(150,'back-quarter'),(92,'sole'),(120,'pointed'),(150,'inside')]):
 cell=source.crop((cuts[n],0,cuts[n+1],source.height));b=p.bounds(cell)
 assert b and b[0]>0 and b[1]>0 and b[2]<cell.width and b[3]<cell.height,b
 art=cell.crop(b).resize((width,170),Image.Resampling.LANCZOS)
 ab=p.bounds(art);a=np.asarray(art.getchannel('A'));yy,xx=np.nonzero(a[max(0,ab[3]-2):ab[3]]>8)
 anchorX=float(xx.mean());x=round(128-anchorX);y=244-ab[3]
 frame=Image.new('RGBA',(256,256));frame.alpha_composite(art,(x,y));fb=p.bounds(frame)
 assert min(fb[:2])>0 and fb[2]<256 and fb[3]==244,(name,fb)
 sheet.paste(frame,((n+3)*256,0));frames.append({'name':name,'bounds':fb,'sole':[128,244]})
assert sheet.crop((0,0,768,256)).tobytes()==before.tobytes()
target=GAME/'assets/moon_boot_sprites.webp';sheet.save(target,lossless=True,exact=True,method=6)
assert Image.open(target).convert('RGBA').crop((0,0,768,256)).tobytes()==before.tobytes()
review=Image.new('RGB',(1792,512))
for y,c in [(0,'#f4ecd9'),(256,'#18233c')]:
 bg=Image.new('RGBA',sheet.size,c);bg.alpha_composite(sheet);review.paste(bg.convert('RGB'),(0,y))
review.save(HERE/'review.webp',quality=90,method=6)
(HERE/'report.json').write_text(json.dumps({'size':sheet.size,'unchangedCells':[0,1,2],'frames':frames,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()},indent=2)+'\n')
