from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,json
from scipy.ndimage import label
def isolate(p):
 a=np.array(p);labs,n=label(a[:,:,3]>20);counts=np.bincount(labs.ravel());counts[0]=0
 keep=counts>=max(counts)*.025;keep[0]=False;mask=Image.fromarray(np.uint8(keep[labs])*255).filter(ImageFilter.MaxFilter(3));a[:,:,3]=np.where(np.array(mask)>0,a[:,:,3],0);return Image.fromarray(a)

ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).resolve().parent

def save(name,out,rects,notes):
 dest=ROOT/'assets/art/prop'/f'plushie-{name}-v1.webp';out.save(dest,lossless=True,exact=True,method=6)
 p=ROOT/f'reference/pending/OCT28-PLUSHIE-{name}.json';d=json.loads(p.read_text());d.update(source=f'reference/sources/oct28-plushie/{name}-native.webp',runtime=str(dest.relative_to(ROOT)),nativeSize=Image.open(SRC/f'{name}-native.webp').size,outputSize=out.size,sourceRects=rects,processing=notes,status='repacked-awaiting-contact-review',decodedBytes=out.width*out.height*4);p.write_text(json.dumps(d,indent=2)+'\n');print(name,out.size,dest.stat().st_size)
for name,cols,rows,cw,ch,ycuts,fill in [('face',8,3,128,128,[0,320,540,768],.76),('patches',8,2,128,128,[0,390,793],.80)]:
 im=Image.open(SRC/f'{name}-native.webp').convert('RGBA');out=Image.new('RGBA',(cols*cw,rows*ch));rects=[]
 for row in range(rows):
  for col in range(cols):
   rect=(round(col*im.width/cols),ycuts[row],round((col+1)*im.width/cols),ycuts[row+1]);p=isolate(im.crop(rect));a=p.getchannel('A').point(lambda v:255 if v>20 else 0);box=a.getbbox();assert box,(name,row,col);p=p.crop(box)
   sc=min(cw*fill/p.width,ch*fill/p.height);p=p.resize((max(1,round(p.width*sc)),max(1,round(p.height*sc))),Image.Resampling.LANCZOS);out.alpha_composite(p,(col*cw+(cw-p.width)//2,row*ch+(ch-p.height)//2));rects.append(dict(cell=[col,row],crop=rect,alphaBounds=box,scale=sc))
 save(name,out,rects,'Manually checked row boundaries and fixed nominal column regions; alpha-bound crop retains every disconnected part in its source cell; each whole item fitted and centered into exact runtime grid. No art painted.')
# Clothes retain asymmetric scarf tails: registration uses the wrap opening's
# center and the front waistband midpoint, with target anchors from the brief.
im=Image.open(SRC/'clothes-native.webp').convert('RGBA');out=Image.new('RGBA',(1024,512));rects=[]
for row in range(2):
 for col in range(4):
  rect=(round(col*im.width/4),0 if row==0 else 485,round((col+1)*im.width/4),470 if row==0 else im.height)
  p=im.crop(rect); box=p.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox();assert box;p=p.crop(box)
  if row==0:
   # Register the wrap opening at neck y96 and compress only its thickness.
   # Without this measured remap a generic bbox fit covers the sewn mouth.
   source=im.crop(rect);q=Image.new('RGBA',(256,256));sx0=box[0];sx1=box[2];xc=220
   xmap=[(sx0,24),(xc,128),(sx1,240)];ymap=[(0,0),(75,70),(175,96),(250,128),(440,245),(470,256)]
   for (xa,oa),(xb,ob) in zip(xmap,xmap[1:]):
    for (ya,pa),(yb,pb) in zip(ymap,ymap[1:]):
     seg=source.transform((ob-oa,pb-pa),Image.Transform.AFFINE,((xb-xa)/(ob-oa),0,xa,0,(yb-ya)/(pb-pa),ya),Image.Resampling.BICUBIC);q.paste(seg,(oa,pa))
   p=q;x=0;y=0
  else:
   w=240;h=122;p=p.resize((w,h),Image.Resampling.LANCZOS);x=8;y=68
  out.alpha_composite(p,(col*256+x,row*256+y));rects.append(dict(cell=[col,row],crop=rect,alphaBounds=box,outputPlacement=[x,y,p.width,p.height],anchor=[128,96 if row==0 else 80]))
save('clothes',out,rects,'Separate whole-garment alpha crops on exact 4x2 grid. Scarves aligned at measured wrap center (128,96) with upper edge near70 and lower wrap128 to leave sewn mouth visible, tails viewer-right; tutu front waistband top midpoint (128,80), skirt ends y190. No recentering of attachment anchors; no art painted.')
