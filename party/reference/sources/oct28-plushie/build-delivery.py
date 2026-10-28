"""Deterministic crop/registration of authored imagegen pixels; no creative drawing."""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
import json
ROOT=Path(__file__).resolve().parents[3]
SRC=Path(__file__).resolve().parent
OUT=ROOT/'assets/art/prop'
# Every y correspondence is manually measured on native source: top appendage,
# skull/hat line, neck seam and seat. Both layers use the identical transform.
BODIES={
 'bear':dict(size=(1199,1312),top=710,split=640,cols=[dict(cx=330,sx=.65,ys=[(0,140),(215,269),(470,409),(675,540),(710,560)]),dict(cx=923,sx=.61,ys=[(0,22),(62,88),(354,322),(685,540),(710,560)])]),
 'bunny':dict(size=(1199,1312),top=844,split=625,cols=[dict(cx=325,sx=.64,ys=[(0,12),(285,226),(358,269),(643,409),(826,540),(844,560)]),dict(cx=894,sx=.63,ys=[(0,12),(220,88),(520,322),(826,540),(844,560)])]),
 'unicorn':dict(size=(1199,1312),top=710,split=641,cols=[dict(cx=296,sx=.69,ys=[(0,160),(205,223),(280,269),(510,409),(701,540),(710,560)]),dict(cx=915,sx=.63,ys=[(0,2),(140,88),(414,322),(704,540),(710,560)])]),
 'kitty':dict(size=(1199,1312),top=744,split=606,cols=[dict(cx=320,sx=.64,ys=[(0,100),(285,269),(520,409),(722,540),(744,560)]),dict(cx=928,sx=.60,ys=[(0,6),(94,88),(414,322),(726,540),(744,560)])]),
 'puppy':dict(size=(1692,929),top=625,split=933,cols=[dict(cx=485,sx=.58,ys=[(0,100),(178,269),(413,409),(601,540),(625,560)]),dict(cx=1296,sx=.69,ys=[(0,65),(32,88),(326,322),(617,540),(625,560)])]),
 'dragon':dict(size=(1199,1312),top=712,split=646,cols=[dict(cx=360,sx=.66,ys=[(0,100),(205,221),(300,269),(490,409),(697,540),(712,560)]),dict(cx=930,sx=.63,ys=[(0,10),(100,88),(390,322),(704,540),(712,560)])]),
}
def warp(im,cfg,col):
    x0=0 if col==0 else cfg['split'];x1=cfg['split'] if col==0 else im.width
    p=im.crop((x0,0,x1,cfg['top']))
    cc=cfg['cols'][col]; cx=cc['cx']-x0;sx=cc['sx']; out=Image.new('RGBA',(512,560))
    pairs=cc['ys']
    for (sy0,dy0),(sy1,dy1) in zip(pairs,pairs[1:]):
      # Inverse affine mapping; Pillow samples the same authored source pixels.
      strip=p.transform((512,dy1-dy0),Image.Transform.AFFINE,(1/sx,0,cx-256/sx,0,(sy1-sy0)/(dy1-dy0),sy0),Image.Resampling.BICUBIC)
      out.paste(strip,(0,dy0))
    return out

def split_layers(p,name,colidx):
    a=np.array(p);rgb=a[:,:,:3].astype(int)
    col=((rgb.max(2)-rgb.min(2))/np.maximum(1,rgb.max(2))>.15)&(rgb.max(2)>170)&(a[:,:,3]>0)
    if name=='bunny':
      # Measured visible cotton-tail region; its white source pixels must keep
      # their color too. Restrict to the exposed tail beyond the arm/torso.
      yy,xx=np.indices(col.shape)
      if colidx==1:col|=(xx>=388)&(yy>=376)&(yy<=447)&(a[:,:,3]>0)
      else:col|=(xx>=396)&(yy>=443)&(yy<=493)&(a[:,:,3]>0)
    mask=Image.fromarray(np.uint8(col)*255).filter(ImageFilter.MaxFilter(5))
    # Small color-separated highlight holes belong to the same sewn patch.
    from scipy.ndimage import binary_fill_holes
    mask=Image.fromarray(np.uint8(binary_fill_holes(np.array(mask)>0))*255)
    m=np.array(mask)>0
    trim=a.copy();trim[:,:,3]=np.where(m,a[:,:,3],0)
    fabric=a.copy();lum=np.round(rgb[:,:,0]*.299+rgb[:,:,1]*.587+rgb[:,:,2]*.114).astype('uint8')
    for c in range(3):fabric[:,:,c]=np.where(m,lum,fabric[:,:,c])
    return Image.fromarray(fabric),Image.fromarray(trim)

def build_body(name,cfg):
    source=SRC/f'body-{name}-native.webp'; im=Image.open(source).convert('RGBA')
    assert im.size==tuple(cfg['size']),(name,im.size,cfg['size'])
    result=Image.new('RGBA',(1024,1120)); review=Image.new('RGBA',(1024,560))
    for col in range(2):
      p=warp(im,cfg,col);fabric,trim=split_layers(p,name,col)
      result.paste(fabric,(col*512,0));result.paste(trim,(col*512,560));review.paste(p,(col*512,0))
      # Every nontransparent trim pixel is a bit-identical authored pixel at its
      # fabric position; no independently generated bottom-row positions used.
      ar=np.array(p);tr=np.array(trim);assert np.array_equal(ar[tr[:,:,3]>0],tr[tr[:,:,3]>0])
    dest=OUT/f'plushie-body-{name}-v1.webp'; result.save(dest,lossless=True,exact=True,method=6)
    review.save(SRC/f'body-{name}-registered-review.webp',lossless=True,exact=True,method=6)
    record=ROOT/f'reference/pending/OCT28-PLUSHIE-body-{name}.json'
    d=json.loads(record.read_text());d.update(runtime=str(dest.relative_to(ROOT)),source=str(source.relative_to(ROOT)),nativeSize=im.size,geometry=cfg,processing='Top-row authored figures only. Piecewise affine crop maps measured skull, neck and seat lines to shared frame; colored source pixels and their two-pixel outline fringe extracted as trim; trim area neutralized in fabric. Identical transform and pixels guarantee registration. Generated bottom row unused.',status='registered-awaiting-contact-review',decodedBytes=1024*1120*4)
    record.write_text(json.dumps(d,indent=2)+'\n')
    print(name,im.size,'->',result.size,dest.stat().st_size)
if __name__=='__main__':
 import sys
 for name in (sys.argv[1:] or BODIES):build_body(name,BODIES[name])
