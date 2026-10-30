"""Periodic-plus-smooth Fourier boundary synthesis; no mirrored source pixels."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).resolve().parent
record=json.loads((SRC/'input.json').read_text());native=Image.open(record['native']).convert('RGBA');native.save(SRC/'native.webp',lossless=True,exact=True,method=6)
assert native.tobytes()==Image.open(SRC/'native.webp').convert('RGBA').tobytes()
u=np.asarray(native.convert('RGB').resize((512,512),Image.Resampling.LANCZOS)).astype(float)
v=np.zeros_like(u);v[0]+=u[-1]-u[0];v[-1]+=u[0]-u[-1];v[:,0]+=u[:,-1]-u[:,0];v[:,-1]+=u[:,0]-u[:,-1]
y,x=np.mgrid[:512,:512];den=2*np.cos(2*np.pi*x/512)+2*np.cos(2*np.pi*y/512)-4;den[0,0]=1
smooth=np.fft.ifft2(np.fft.fft2(v,axes=(0,1))/den[:,:,None],axes=(0,1)).real;smooth-=smooth.mean(axis=(0,1));periodic=u-smooth
# Restrained palette/contrast match: keep generated organic clumps, reduce saturation and contrast.
periodic=(periodic-periodic.mean(axis=(0,1)))*.72+np.array([190,146,86]);out=Image.fromarray(np.uint8(np.clip(np.rint(periodic),0,255)))
f=ROOT/'assets/art/prop/dino-dug-sand-v2.webp';out.save(f,quality=82,method=6)
a=np.asarray(Image.open(f).convert('RGB')).astype(float);old=np.asarray(Image.open(ROOT/'assets/art/prop/dino-dug-sand.webp').convert('RGB')).astype(float)
def metrics(a):
 return dict(horizontalSeamMean=float(np.abs(a[:,0]-a[:,-1]).mean()),verticalSeamMean=float(np.abs(a[0]-a[-1]).mean()),interiorHorizontalMean=float(np.abs(a[:,1:]-a[:,:-1]).mean()),interiorVerticalMean=float(np.abs(a[1:]-a[:-1]).mean()),meanRGB=a.mean(axis=(0,1)).tolist(),stdRGB=a.std(axis=(0,1)).tolist(),mirrorXMeanDifference=float(np.abs(a-a[:,::-1]).mean()),mirrorYMeanDifference=float(np.abs(a-a[::-1]).mean()))
record.update(tool='built-in imagegen',archive='party/reference/sources/oct30-dug-sand/native.webp',sourceRGBAExact=True,runtime=str(f.relative_to(ROOT.parent)),key='prop/dino-dug-sand',size=[512,512],intake='Periodic-plus-smooth FFT removes boundary-discontinuity field without reflection or duplicated quadrants; then gentle palette/contrast normalization. quality82.',metrics=metrics(a),previousMetrics=metrics(old),sha256=hashlib.sha256(f.read_bytes()).hexdigest())
(ROOT/'reference/pending/OCT30-DUG-SAND.json').write_text(json.dumps(record,indent=2)+'\n')
review=Image.new('RGB',(1536,1536));
for row in range(3):
 for col in range(3):review.paste(Image.open(f),(col*512,row*512))
review.resize((1000,1000)).save(ROOT/'reference/pending/OCT30-DUG-SAND-TILED.jpg',quality=88)
print(json.dumps(record['metrics']))
