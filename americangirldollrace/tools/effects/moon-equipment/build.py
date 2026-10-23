"""Pack reviewed Moon Base props; keep untouched pickup pixels exact."""
from pathlib import Path
from PIL import Image
import importlib.util, json, hashlib
import numpy as np
HERE=Path(__file__).resolve().parent; GAME=HERE.parents[2]
spec=importlib.util.spec_from_file_location('packing',GAME/'tools/tracks/build.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
source=p.clean(Image.open(HERE/'laser-source.webp'))
icon=p.icon(source,(256,256),(228,228))
before=Image.open(HERE/'space-powerups-before.webp').convert('RGBA');sheet=before.copy();sheet.paste(icon,(512,0))
for n in [0,1,3,4]:
 box=(n*256,0,(n+1)*256,256);assert before.crop(box).tobytes()==sheet.crop(box).tobytes()
sheet.save(GAME/'assets/tracks/space/powerups.webp',lossless=True,exact=True,method=6)
source=p.clean(Image.open(HERE/'boots-source.webp'));boots=Image.new('RGBA',(768,256));frames=[]
occ=(np.asarray(source.getchannel('A'))>8).any(axis=0)
cuts=[0]+[p.gap_cut(occ,round(source.width*n/3),round(source.width*.12)) for n in [1,2]]+[source.width]
for n,width in enumerate([150,130,110]):
 cell=source.crop((cuts[n],0,cuts[n+1],source.height));b=p.bounds(cell)
 assert b and b[0]>0 and b[1]>0 and b[2]<cell.width and b[3]<cell.height,b
 art=cell.crop(b).resize((width,170),Image.Resampling.LANCZOS)
 frame=Image.new('RGBA',(256,256));frame.alpha_composite(art,(128-width//2,244-170))
 assert p.bounds(frame)[3]==244
 boots.paste(frame,(n*256,0));frames.append({'bounds':p.bounds(frame),'sole':[128,244]})
boots.save(GAME/'assets/moon_boot_sprites.webp',lossless=True,exact=True,method=6)
review=Image.new('RGB',(1024,512))
for y,color in [(0,'#fff9ed'),(256,'#18233c')]:
 bg=Image.new('RGBA',(1024,256),color);bg.alpha_composite(icon,(0,0));bg.alpha_composite(boots,(256,0));review.paste(bg.convert('RGB'),(0,y))
review.save(HERE/'alpha-review.webp',quality=90,method=6)
report={'unchangedCells':[0,1,3,4],'boots':frames,'assets':{}}
for name in ['assets/tracks/space/powerups.webp','assets/moon_boot_sprites.webp']:
 path=GAME/name;report['assets'][name]={'size':Image.open(path).size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(HERE/'report.json').write_text(json.dumps(report,indent=2)+'\n')
