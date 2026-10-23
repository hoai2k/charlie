"""FW2: register ImageGen's twilight repaint to FW1's exact silhouettes.

Preserve existing geometry/anchors/phase layout. Generated RGB supplies the
new painted material; use FW1's reviewed alpha support with75% membrane
opacity. No halo/particles can be added outside the existing wing edges.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from scipy import ndimage
import json,hashlib,numpy as np
H=Path(__file__).resolve().parent;G=H.parents[2];OLD=H.parent/'fairy-wings'
meta=json.loads((OLD/'report.json').read_text());frames={};report={}
old_hashes={f:hashlib.sha256((G/f'assets/{f}.webp').read_bytes()).hexdigest() for f in ['fairy_wings_sprites','fairy_wing_single_sprites']}
for kind in ['side','quarter','single']:
 original=Image.open(OLD/f'{kind}-source.webp').convert('RGBA');oa=np.array(original)
 edit=Image.open(H/f'{kind}-source.webp').convert('RGBA');assert edit.size==original.size,(kind,edit.size)
 ea=np.array(edit);valid=ea[:,:,3]>16;distance,indices=ndimage.distance_transform_edt(~valid,return_indices=True)
 missing=(oa[:,:,3]>8)&~valid
 # Generated edges may drift slightly; sampling nearest generated wing RGB
 # in those tiny edge regions avoids introducing transparent RGB fringes.
 rgb=ea[:,:,:3].copy();rgb[missing]=rgb[indices[0][missing],indices[1][missing]]
 assert not missing.any() or np.quantile(distance[missing],.99)<25,(kind,'repaint moved too far')
 labels,count=ndimage.label(oa[:,:,3]>8);areas=np.bincount(labels.ravel());areas[0]=0
 ids=sorted(np.argsort(areas)[-6:],key=lambda i:ndimage.center_of_mass(labels==i)[0]);ids=sorted(ids[:3],key=lambda i:ndimage.center_of_mass(labels==i)[1])+sorted(ids[3:],key=lambda i:ndimage.center_of_mass(labels==i)[1])
 results=[];records=[]
 for n,(i,cal) in enumerate(zip(ids,meta[kind])):
  mask=ndimage.binary_dilation(labels==i,iterations=2);v=oa.copy();v[:,:,:3]=rgb;v[~mask,3]=0;src=Image.fromarray(v);b=src.getchannel('A').getbbox();factor=cal['scale'];rx,ry=cal['sourceRoot']
  art=src.crop(b).resize((round((b[2]-b[0])*factor),round((b[3]-b[1])*factor)),Image.Resampling.LANCZOS)
  x=round(330-(rx-b[0])*factor);y=round(300-(ry-b[1])*factor);frame=Image.new('RGBA',(512,512));frame.alpha_composite(art,(x,y))
  filename='fairy_wing_single_sprites' if kind=='single' else 'fairy_wings_sprites';row=512 if kind=='quarter' else 0
  template=Image.open(G/f'assets/{filename}.webp').convert('RGBA').crop((n*512,row,(n+1)*512,row+512));alpha=template.getchannel('A').point(lambda a:round(a*.75/.62));frame.putalpha(alpha)
  assert np.array_equal(np.array(frame.getchannel('A'))>0,np.array(template.getchannel('A'))>0),(kind,n)
  results.append(frame);records.append({'root':[330,300],'bounds':frame.getchannel('A').getbbox(),'alphaSupportMatchesFW1':True})
 frames[kind]=results;report[kind]={'frames':records,'repaintEdgeFillPixels':int(missing.sum()),'edgeFillDistance99':float(np.quantile(distance[missing],.99)) if missing.any() else 0}
pair=Image.new('RGBA',(3072,1024));single=Image.new('RGBA',(3072,512))
for n in range(6):pair.paste(frames['side'][n],(n*512,0));pair.paste(frames['quarter'][n],(n*512,512));single.paste(frames['single'][n],(n*512,0))
for name,im in [('fairy_wings_twilight_sprites',pair),('fairy_wing_single_twilight_sprites',single)]:
 target=G/f'assets/{name}.webp';im.save(target,lossless=True,exact=True,method=6);report[name]={'size':im.size,'alphaRange':im.getchannel('A').getextrema(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
for filename,sha in old_hashes.items():assert hashlib.sha256((G/f'assets/{filename}.webp').read_bytes()).hexdigest()==sha
report['unchangedFW1']=old_hashes
review=Image.new('RGB',(1536,1536),'#142333')
for row,kind in enumerate(frames):
 for n,f in enumerate(frames[kind]):
  tile=Image.new('RGBA',(256,256),'#142333');tile.alpha_composite(f.resize((256,256),Image.Resampling.LANCZOS));review.paste(tile.convert('RGB'),(n*256,row*512));ImageDraw.Draw(review).text((n*256+4,row*512+260),f'{kind} phase{n+1}',fill='white')
review.save(H/'review.webp',quality=90,method=6);(H/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k.endswith('sprites')},indent=2))
