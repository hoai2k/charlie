"""Install only the eight requested purse cells; preserve four interaction cells exactly."""
from pathlib import Path
import json,hashlib,importlib.util
from PIL import Image
H=Path(__file__).resolve().parent;T=H.parent;G=T.parents[2]
s=importlib.util.spec_from_file_location('toys',T/'build.py');t=importlib.util.module_from_spec(s);s.loader.exec_module(t)
report=json.loads((T/'reports/juliette.json').read_text());meta=json.loads((T/'overrides/juliette.json').read_text());source=t.full_cells(t.packing.clean(Image.open(H/'source.webp')),required_slots={0,1,2,3,6,7,8,9});sheet=Image.open(H/'before-sheet.webp').convert('RGBA');mask=Image.open(H/'before-mask.webp').convert('RGB');verification={}
for n in [0,1,2,3,6,7,8,9]:
 xy=(n%3*418,n//3*418);old=sheet.crop((*xy,xy[0]+418,xy[1]+418));ob=t.packing.bounds(old);c=source[n];b=t.packing.bounds(c);factor=(ob[3]-ob[1])/(b[3]-b[1]);size=(round((b[2]-b[0])*factor),round((b[3]-b[1])*factor))
 pivot=t.face_info(c)[0] if n<6 else t.tip_centre(c);target=t.face_info(old)[0] if n<6 else t.tip_centre(old);x=round(target-(pivot-b[0])*factor);y=409-size[1];assert x>=4 and x+size[0]<=414 and y>=4,(n,x,y,size)
 frame=Image.new('RGBA',(418,418));frame.alpha_composite(c.crop(b).resize(size,Image.Resampling.LANCZOS),(x,y));m=Image.new('RGB',(418,418));m.paste(t.learned_mask(c,'juliette',n).crop(b).resize(size,Image.Resampling.LANCZOS),(x,y));sheet.paste(frame,xy);mask.paste(m,xy)
 for im,suffix in [(frame,''),(m,'-mask')]:t.packing.save(im,T/f'overrides/juliette-{n}{suffix}.webp')
 record=dict(report['frames'][n]);record['bounds']=t.packing.bounds(frame);record['purseRedo']={'sourceScale':factor,'sourcePivot':pivot,'targetPivot':target};meta[str(n)]=record;report['frames'][n]=record
for n in [4,5,10,11]:
 xy=(n%3*418,n//3*418);box=(*xy,xy[0]+418,xy[1]+418)
 for kind,im in [('sheet',sheet),('mask',mask)]:verification[f'{kind}:{n}']=hashlib.sha256(im.crop(box).tobytes()).hexdigest()
target=G/'assets/doll_juliette_toys.webp';t.packing.save(sheet,target,exact=True);t.packing.save(mask,G/'assets/masks/juliette_toys_mask.webp');report['sha256']=hashlib.sha256(target.read_bytes()).hexdigest();(T/'reports/juliette.json').write_text(json.dumps(report,indent=2)+'\n');(T/'overrides/juliette.json').write_text(json.dumps(meta,indent=2)+'\n');(H/'verification.json').write_text(json.dumps(verification,indent=2)+'\n');print('Juliette purse: 8 cells replaced, 4 interaction cells preserved')
