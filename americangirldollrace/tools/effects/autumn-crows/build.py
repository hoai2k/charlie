"""Export the two reviewed crow assets, retaining untouched pickup pixels."""
from pathlib import Path
from PIL import Image
import numpy as np
import json, hashlib, importlib.util
HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
spec = importlib.util.spec_from_file_location('packing', GAME/'tools/tracks/build.py')
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
icon = p.clean(Image.open(HERE/'icon-source.webp'))
button = p.icon(icon, (256,256), (228,228))
before = Image.open(HERE/'powerups-before.webp').convert('RGBA')
after = before.copy(); after.paste(button, (512,0))
for n in [0,1,3,4]:
    box=(n*256,0,(n+1)*256,256)
    assert before.crop(box).tobytes() == after.crop(box).tobytes()
after.save(GAME/'assets/tracks/autumn/powerups.webp', lossless=True, exact=True, method=6)
source = p.clean(Image.open(HERE/'flight-source.webp'))
occupied=(np.asarray(source.getchannel('A'))>8).any(axis=0)
cuts=[0]+[p.gap_cut(occupied,round(source.width*n/4),round(source.width*.04)) for n in [1,2,3]]+[source.width]
items=[]
for n in range(4):
    im=source.crop((cuts[n],0,cuts[n+1],source.height));b=p.bounds(im)
    assert b and b[0]>0 and b[1]>0 and b[2]<im.width and b[3]<im.height,b
    a=np.asarray(im);mask=(a[:,:,0]>180)&(a[:,:,1]>130)&(a[:,:,2]<110)&(a[:,:,3]>64)
    yy,xx=np.nonzero(mask);assert len(xx)>30
    # The yellow eye is the same rigid head landmark in all four poses.
    eye=[float(xx.mean()),float(yy.mean())]
    items.append((im,b,eye))
scale=min(90/max(b[2]-b[0] for _,b,_ in items),54/max(e[1]-b[1] for _,b,e in items),60/max(b[3]-e[1] for _,b,e in items))
sheet=Image.new('RGBA',(512,128));frames=[]
for n,(im,b,eye) in enumerate(items):
    art=im.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
    x=round(94-(eye[0]-b[0])*scale);y=round(62-(eye[1]-b[1])*scale)
    assert x>0 and y>0 and x+art.width<128 and y+art.height<128,(n,x,y,art.size)
    frame=Image.new('RGBA',(128,128));frame.alpha_composite(art,(x,y));sheet.paste(frame,(n*128,0))
    frames.append({'bounds':p.bounds(frame),'eye':[94,62],'sourceEye':eye})
sheet.save(GAME/'assets/crow_sprites.webp',lossless=True,exact=True,method=6)
review=Image.new('RGB',(768,512))
for y,c in [(0,'#fff9ed'),(256,'#18233c')]:
    bg=Image.new('RGBA',(768,256),c);bg.alpha_composite(button,(0,0));bg.alpha_composite(sheet,(256,64));review.paste(bg.convert('RGB'),(0,y))
review.save(HERE/'alpha-review.webp',quality=90,method=6)
report={'flightScale':scale,'frames':frames,'unchangedPickupCells':[0,1,3,4],'assets':{}}
for name in ['assets/crow_sprites.webp','assets/tracks/autumn/powerups.webp']:
    path=GAME/name;report['assets'][name]={'size':Image.open(path).size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(HERE/'report.json').write_text(json.dumps(report,indent=2)+'\n')
