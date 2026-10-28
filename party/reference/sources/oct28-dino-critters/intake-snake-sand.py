"""Reproducible authored atlas registration and periodic material intake. No new art drawn."""
import json,hashlib,subprocess
from pathlib import Path
import numpy as np
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parents[3]
SRC=ROOT/'reference/sources/oct28-dino-critters';P=ROOT/'reference/pending';ART=ROOT/'assets/art/prop'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
inputs=json.loads((SRC/'snake-sand-inputs.json').read_text())
for name,data in inputs.items():
 im=Image.open(data['native']).convert('RGBA'); archive=SRC/(name+'-native.webp');im.save(archive,lossless=True,exact=True,method=6);assert np.array_equal(np.asarray(im),np.asarray(Image.open(archive).convert('RGBA')))
original=Image.open(SRC/'snake-initial-native.webp').convert('RGBA')
im=Image.open(SRC/'snake-native.webp').convert('RGBA')
# Measured semantic bounds preserve detached eyebrow in frame2. Common scale keeps head sizes stable.
boxes=[(34,89,445,649),(497,120,872,649),(892,344,1548,644),(1573,341,2164,662)]
scale=min(224/max(b[2]-b[0] for b in boxes),208/max(b[3]-b[1] for b in boxes))
out=Image.new('RGBA',(1024,256));bounds=[]
for i,b in enumerate(boxes):
 crop=im.crop(b);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 x=i*256+128-crop.width//2;y=224-crop.height;out.alpha_composite(crop,(x,y));a=out.crop((i*256,0,(i+1)*256,256)).getchannel('A');bb=a.getbbox();assert bb[1]>0 and bb[0]>0 and bb[2]<256 and bb[3]==224;bounds.append(bb)
out.save(ART/'dino-snake.webp',lossless=True,exact=True,method=6)
# A square material's mirrored periodic extension guarantees seamless decoded borders on both axes.
base=Image.open(SRC/'sand-native.webp').convert('RGB').resize((256,256),Image.Resampling.LANCZOS)
tile=Image.new('RGB',(512,512));tile.paste(base,(0,0));tile.paste(ImageOps.mirror(base),(256,0));tile.paste(ImageOps.flip(base),(0,256));tile.paste(ImageOps.flip(ImageOps.mirror(base)),(256,256));tile.save(ART/'dino-dug-sand.webp',quality=82,method=6)
a=np.asarray(Image.open(ART/'dino-dug-sand.webp').convert('RGB')); # lossy codec may perturb the previously identical borders slightly
sandSeams={'leftRightMeanAbs':float(np.abs(a[:,0].astype(float)-a[:,-1]).mean()),'topBottomMeanAbs':float(np.abs(a[0].astype(float)-a[-1]).mean()),'leftRightMax':int(np.abs(a[:,0].astype(int)-a[:,-1]).max()),'topBottomMax':int(np.abs(a[0].astype(int)-a[-1]).max())}
for name,file in [('snake','dino-snake.webp'),('sand','dino-dug-sand.webp')]:
 f=ART/file;entry={'key':'prop/'+file[:-5],'tool':'built-in imagegen','prompt':inputs[name]['prompt'],'native':inputs[name]['native'],'archive':str((SRC/(name+'-native.webp')).relative_to(ROOT.parent)),'runtime':str(f.relative_to(ROOT.parent)),'sha256':sha(f),'size':list(Image.open(f).size),'intakeScript':str(Path(__file__).relative_to(ROOT.parent))}
 if name=='snake':entry.update(initial=inputs['snake-initial'],semanticSourceBoxes=boxes,commonScale=scale,frameBounds=bounds,anchor=[128,224],repack='Generic repack found5connecteditems due to detached eyebrow; measured four semantic crops preserve it; all frames share scale and bottom224.')
 else:entry.update(periodicIntake='2x2 mirrored periodic extension of256x256 native derivative; no synthesized art or painting; requested lossy quality82',seams=sandSeams)
 (P/('OCT28-DINO-'+name.upper()+'.json')).write_text(json.dumps(entry,indent=2)+'\n')
print(bounds,sandSeams)
