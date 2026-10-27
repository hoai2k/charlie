"""Replace only reviewed run cells, preserving all other normal/menu art exactly."""
from pathlib import Path
import importlib.util,json,hashlib,sys
from PIL import Image
import numpy as np
H=Path(__file__).resolve().parent;D=H.parent;G=D.parents[1]
s=importlib.util.spec_from_file_location('normal',D/'build.py');N=importlib.util.module_from_spec(s);s.loader.exec_module(N)
s=importlib.util.spec_from_file_location('toys',D/'toys/build.py');T=importlib.util.module_from_spec(s);s.loader.exec_module(T)

def build(manifest):
 key=manifest['key'];asset=manifest.get('assetKey',key);before=json.loads((H/f'{key}-manifest-before.json').read_text());old=Image.open(H/f'{key}-source-before.webp').convert('RGBA');new=Image.open(D/f'sources/{key}/run.webp').convert('RGBA');sheet=Image.open(H/f'{key}-sheet-before.webp').convert('RGBA');mask=Image.open(H/f'{key}-mask-before.webp').convert('RGB');report=json.loads((D/f'reports/{key}.json').read_text());base,_=N.source_frame(manifest,'idle-0');b=N.bounds(base);common=manifest['standingHeight']/(b[3]-b[1]);footprints=[]
 for i in range(3):
  pose=f'run-{i}';oldspec=before['poses'][pose]
  spec=dict(oldspec);spec['hipX']={'felicity':[480,410,370],'claudia':[480,410,355],'barbie':[450,420,330]}[key][i];spec['chin']=oldspec['chin'];spec['target']=[209,409];manifest['poses'][pose]=spec
  src,spec=N.source_frame(manifest,pose);m=N.clothing_mask(src,spec,manifest['mask']['mode']);frame,mm,record=N.place(src,m,spec,common);sheet.paste(frame,(i*418,418));mask.paste(mm.convert('RGB'),(i*418,418));report['frames'][pose]=record
  # A narrow passing footprint is a required visible change, not just metadata.
  a=np.array(src).astype(float);r,g,b=[a[:,:,j] for j in range(3)];yy,xx=np.indices(a.shape[:2]);lower=yy>src.height*.55;opaque=a[:,:,3]>128
  shoe=((r>g+30)&(b>g+5)) if key=='felicity' else ((a[:,:,:3].max(2)-a[:,:,:3].min(2)<40)&(a[:,:,:3].max(2)>140)) if key=='claudia' else (a[:,:,:3].max(2)<90)
  ys,xs=np.where(shoe&lower&opaque);assert len(xs);footprints.append(int(xs.max()-xs.min()+1))
 assert footprints[1]<max(footprints[0],footprints[2])*.7,(key,'Passing pose too wide',footprints)
 verification={}
 for n in [0,1,2,6,7,8,9,10,11]:
  x=n%3*418;y=n//3*418;box=(x,y,x+418,y+418)
  for kind,im in [('sheet',sheet),('mask',mask)]:verification[f'{kind}:{n}']=hashlib.sha256(im.crop(box).tobytes()).hexdigest()
 for path,im in [(f'assets/doll_{asset}_sprites.webp',sheet),(f'assets/masks/{asset}_sheet_mask.webp',mask)]:
  im.save(G/path,lossless=True,method=6,exact=True);report['sha256'][path]=hashlib.sha256((G/path).read_bytes()).hexdigest()
 (D/f'manifests/{key}.json').write_text(json.dumps(manifest,indent=2)+'\n');(D/f'reports/{key}.json').write_text(json.dumps(report,indent=2)+'\n');(H/f'{key}-verification.json').write_text(json.dumps({'unchanged':verification,'shoeFootprints':footprints},indent=2)+'\n');print(key,'run footprint widths:',footprints)
 return report['runtime']
if __name__=='__main__':
 for key in sys.argv[1:] or ['felicity','claudia','barbie']:build(json.loads((D/f'manifests/{key}.json').read_text()))
