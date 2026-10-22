"""Pack action art, measured anatomical calibration, prop-safe outfit masks and wand tips."""
from pathlib import Path
import importlib.util,json,hashlib,sys
from PIL import Image
import numpy as np
from scipy import ndimage
H=Path(__file__).resolve().parent;G=H.parents[2]
s=importlib.util.spec_from_file_location('toys',G/'tools/dolls/toys/build.py');T=importlib.util.module_from_spec(s);s.loader.exec_module(T)

def face(c):
 a=np.array(c).astype(float);r,g,b=[a[:,:,i] for i in range(3)]
 m=(r>105)&(g>55)&(b>25)&(g>b+12)&(r>g+18)&(r-b>45)&(a[:,:,3]>200);m[round(c.height*.5):]=False
 lab,n=ndimage.label(m);counts=np.bincount(lab.ravel());counts[0]=0;assert n and counts.max()>30
 ys,xs=np.where(lab==counts.argmax());return float(np.median(xs)),float(ys.max()),float(ys.min()),len(xs)

def mask(c,key,n):
 a=np.array(c).astype(float);b=T.packing.bounds(c);yy,xx=np.indices(a.shape[:2]);ys,xs=np.where(a[:,:,3]>8)
 feat=np.column_stack([a[ys,xs,:3]/40.,(xs-b[0])/(b[2]-b[0])*1.5,(ys-b[1])/(b[3]-b[1])*3.])
 tree,weights=T.outfit_classifier(key);dist,idx=tree.query(feat,k=7);v=1/(dist+.04)**2;value=(weights[idx]*v[:,:,None]).sum(1)/v.sum(1)[:,None];value=np.clip((value-.25)/.5,0,1)
 out=np.zeros((*a.shape[:2],3),dtype='uint8');out[ys,xs,:2]=np.round(value*255)
 if n in [3,4,5]:
  lower=yy>b[1]+(b[3]-b[1])*.62
  turquoise=(a[:,:,1]>a[:,:,0]+15)&(a[:,:,2]>a[:,:,0]+10)
  coral=(a[:,:,0]>a[:,:,1]+20)&(a[:,:,0]>a[:,:,2]+15)
  out[lower&(turquoise|coral)]=0
  out[yy>b[3]-(b[3]-b[1])*.22]=0
 if n==8:out[yy>b[3]-(b[3]-b[1])*.32]=0
 if n<3:
  # Gold star and wooden shaft are never selected clothing.
  gold=(a[:,:,0]>140)&(a[:,:,1]>85)&(a[:,:,2]<a[:,:,1]*.75)
  out[gold]=0
 return Image.fromarray(out)

def build(key):
 asset={'claudia':'claudia-v2','rumi':'rumi-v2','marisol':'marisol-v2'}.get(key,key)
 src=T.packing.clean(Image.open(H/f'sources/{key}.webp'));cells=T.full_cells(src,rows=3)
 ref=Image.open(G/f'assets/doll_{asset}_sprites.webp').convert('RGBA');rf=face(ref.crop((0,0,418,418)))
 faces=[face(c) for c in cells];common=(rf[1]-rf[2])/np.median([f[1]-f[2] for f in faces]);sheet=Image.new('RGBA',(1254,1254));masks=Image.new('RGB',sheet.size);records=[]
 for n,(c,f) in enumerate(zip(cells,faces)):
  b=T.packing.bounds(c);factor=min(common,402/(b[2]-b[0]),402/(b[3]-b[1]));render=common/factor
  pivot=f[0];target=209;target=max(target,5+(pivot-b[0])*factor);target=min(target,413-(b[2]-pivot)*factor)
  size=(round((b[2]-b[0])*factor),round((b[3]-b[1])*factor));x=round(target+(b[0]-pivot)*factor);y=409-size[1]
  # Rider source is aligned by its face to the existing rider, retaining its exact seating registration.
  target_y=409;offset_x=0
  if n==6:
   ride=ref.crop((0,1254,418,1672));rr=face(ride);target_y=rr[1]+(b[3]-f[1])*common;offset_x=rr[0]-209
  frame=Image.new('RGBA',(418,418));frame.alpha_composite(c.crop(b).resize(size,Image.Resampling.LANCZOS),(x,y));sheet.paste(frame,(n%3*418,n//3*418))
  m=mask(c,key,n).crop(b).resize(size,Image.Resampling.LANCZOS);masks.paste(m,(n%3*418+x,n//3*418+y))
  tip=None
  if n<3:
   a=np.array(c).astype(float);gold=(a[:,:,0]>150)&(a[:,:,1]>95)&(a[:,:,2]<a[:,:,1]*.75)&(a[:,:,0]>a[:,:,1]+15)&(a[:,:,3]>128);ys,xs=np.where(gold);assert len(xs)
   chosen=ys<ys.min()+8 if n==0 else xs>xs.max()-8
   tip=[round(x+(float(np.mean(xs[chosen]))-b[0])*factor,2),round(y+(float(np.mean(ys[chosen]))-b[1])*factor,2)]
  records.append({'anchorX':target+16,'offsetX':offset_x,'scale':render,'baseline':409,'targetY':target_y,'bounds':T.packing.bounds(frame),'wandTip':tip,'sourceScale':common,'packedScale':factor})
 target=G/f'assets/doll_{asset}_actions.webp';T.packing.save(sheet,target);T.packing.save(masks,G/f'assets/masks/{asset}_actions_mask.webp')
 report={'assetKey':asset,'frames':records,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()};(H/'reports').mkdir(exist_ok=True);(H/f'reports/{key}.json').write_text(json.dumps(report,indent=2)+'\n');print(key,common)
 return report
if __name__=='__main__':
 for key in sys.argv[1:] or ['hermione','lily','mira']:build(key)
