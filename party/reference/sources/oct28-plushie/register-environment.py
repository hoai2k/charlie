from pathlib import Path
from PIL import Image
import json,numpy as np
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).resolve().parent

def finish(name,key,out,geometry,notes):
 dest=ROOT/'assets/art'/f'{key}-v1.webp';out.save(dest,lossless=True,exact=True,method=6)
 p=ROOT/f'reference/pending/OCT28-PLUSHIE-{name}.json';d=json.loads(p.read_text());d.update(source=f'reference/sources/oct28-plushie/{name}-native.webp',runtime=str(dest.relative_to(ROOT)),nativeSize=Image.open(SRC/f'{name}-native.webp').size,outputSize=out.size,geometry=geometry,processing=notes,status='registered-awaiting-contact-review',decodedBytes=out.width*out.height*4);p.write_text(json.dumps(d,indent=2)+'\n');print(key,out.size,dest.stat().st_size)

def warp(im,w,h,xs,ys):
 out=Image.new('RGBA',(w,h))
 for (sx0,dx0),(sx1,dx1) in zip(xs,xs[1:]):
  for (sy0,dy0),(sy1,dy1) in zip(ys,ys[1:]):
   p=im.transform((dx1-dx0,dy1-dy0),Image.Transform.AFFINE,((sx1-sx0)/(dx1-dx0),0,sx0,0,(sy1-sy0)/(dy1-dy0),sy0),Image.Resampling.BICUBIC);out.paste(p,(dx0,dy0))
 return out
im=Image.open(SRC/'workshop-native.webp').convert('RGBA');xs=[(0,0),(im.width,1920)];ys=[(0,0),(695,780),(im.height,1080)];finish('workshop','bg/plushie-workshop',warp(im,1920,1080,xs,ys),dict(xCorrespondences=xs,yCorrespondences=ys,tableEdge=780),'Authored background resampled to exact output; measured table rear edge y695 maps to y780.')
im=Image.open(SRC/'shelf-native.webp').convert('RGBA');xs=[(0,0),(330,330),(1300,1590),(1672,1920)];ys=[(0,0),(414,430),(642,760),(941,1080)];finish('shelf','bg/plushie-shelf',warp(im,1920,1080,xs,ys),dict(xCorrespondences=xs,yCorrespondences=ys,shelfSeatY=[430,760],clearShelfX=[330,1590]),'Whole authored background piecewise affine registration: front support edges y414/642 to430/760; ends compressed to keep books/yarn outside central display span. No pixels creatively painted.')
im=Image.open(SRC/'thumb-native.webp').convert('RGBA');finish('thumb','thumb/plushie-workshop',im.resize((800,500),Image.Resampling.LANCZOS),dict(size=[800,500]),'Whole image downsampled to requested thumbnail size.')
im=Image.open(SRC/'stuffing-native.webp').convert('RGBA');box=im.getchannel('A').point(lambda a:255 if a>20 else 0).getbbox();p=im.crop(box);s=210/max(p.size);p=p.resize((round(p.width*s),round(p.height*s)),Image.Resampling.LANCZOS);out=Image.new('RGBA',(256,256));out.alpha_composite(p,((256-p.width)//2,(256-p.height)//2));finish('stuffing','prop/plushie-stuffing',out,dict(sourceBounds=box), 'Alpha-bound whole tuft fitted in210px square centered in256px canvas.')
im=Image.open(SRC/'stuffer-native.webp').convert('RGBA');# native nozzle center (100,945)
# Uniform scalar keeps source silhouette; translation lands the exact outlet anchor.
s=.28;anchor=(100,945);xy=(40,300);p=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS);out=Image.new('RGBA',(384,384));out.alpha_composite(p,(round(xy[0]-anchor[0]*s),round(xy[1]-anchor[1]*s)));finish('stuffer','prop/plushie-stuffer',out,dict(sourceNozzleTip=anchor,nozzleTip=xy,scale=s),'Whole source uniformly scaled and translated about measured nozzle opening center to requested anchor.')
im=Image.open(SRC/'needle-native.webp').convert('RGBA');s=.188;anchor=(91,1166);xy=(28,228);p=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS);out=Image.new('RGBA',(256,256));out.alpha_composite(p,(round(xy[0]-anchor[0]*s),round(xy[1]-anchor[1]*s)));finish('needle','prop/plushie-needle',out,dict(sourceNeedlePoint=anchor,needlePoint=xy,scale=s),'Whole source uniformly scaled and translated about measured sharp point to requested anchor.')
im=Image.open(SRC/'tag-native.webp').convert('RGBA');finish('tag','prop/plushie-tag',warp(im,384,160,[(0,0),(600,80),(1942,384)],[(0,0),(809,160)]),dict(writingArea=[80,30,360,130],xCorrespondences=[(0,0),(600,80),(1942,384)]),'Whole image registered to requested384x160; left ribbon area compressed to keep blank paper clear fromx80 through360.')
