"""Verify generated source fidelity, complete affine bounds and exact template joints; assemble QA art."""
import json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[2];PENDING=ROOT/'reference/pending'
records={}
for p in sorted(PENDING.glob('OCT28-DINO-SKELETON-dino-*.json')):
 r=json.loads(p.read_text());name=r['key'].split('/')[1];g=r['registration'];src=Image.open(ROOT/r['source']).convert('RGBA');native=Image.open(r['nativePath']).convert('RGBA');runtime=Image.open(ROOT/r['runtime']).convert('RGBA');assert src.tobytes()==native.tobytes() and src.size==native.size;assert list(runtime.size)==r['size'];assert hashlib.sha256((ROOT/r['runtime']).read_bytes()).hexdigest()==r['runtimeSha256'];M=np.array(g['sourceToLocal']);inv=np.linalg.inv(M);actual=src.transform(tuple(r['size']),Image.Transform.AFFINE,inv[:2].reshape(-1),resample=Image.Resampling.BICUBIC);assert actual.tobytes()==runtime.tobytes();w,h=r['size'];shift=np.eye(3);shift[:2,2]=64;iv=np.linalg.inv(shift@M);proof=src.transform((w+128,h+128),Image.Transform.AFFINE,iv[:2].reshape(-1),resample=Image.Resampling.BICUBIC);mask=np.asarray(proof)[:,:,3]>16;yy,xx=np.where(mask);g['unclippedAlphaBounds']=[int(xx.min()-64),int(yy.min()-64),int(xx.max()+1-64),int(yy.max()+1-64)];outside=mask.copy();outside[64:64+h,64:64+w]=False;g['clippedSignificantPixels']=int(outside.sum());assert g['clippedSignificantPixels']==0,(name,g['unclippedAlphaBounds']);g['sourceAlphaBounds']=list(src.getchannel('A').point(lambda v:255 if v>16 else 0).getbbox());g.setdefault('renderOffset',[0,0]);assert r['alphaExtrema']==[0,255]
 if name.startswith('dino-rib-'):
  aligned=[g['targetPoints'][0][i]+g['renderOffset'][i] for i in range(2)];assert aligned==r['localPoints'][0];g['alignedKnobCentre']=aligned
 if name.startswith('dino-leg-'):assert g['alphaBounds'][3]+r['box'][1]==480
 r['nativeArchivePixelsIdentical']=True;r['runtimePixelsReproducedExactly']=True;records[name]=r;p.write_text(json.dumps(r,indent=2)+'\n')
assert len(records)==17
images={r['key']:r['runtime'].replace('assets/art/','') for r in records.values()}
(PENDING/'OCT28-DINO-SKELETON-index-additions.json').write_text(json.dumps({'images':images,'group':'dino-dig','keys':list(images),'renderOffsets':{r['key']:r['registration']['renderOffset'] for r in records.values() if r['registration']['renderOffset']!=[0,0]}},indent=2)+'\n')
def part(n):return Image.open(ROOT/records[n]['runtime']).convert('RGBA')
def render(sneeze=False,markers=False):
 out=Image.new('RGBA',(1200,520),'#b4cbd3');d=ImageDraw.Draw(out);d.line((0,480,1200,480),fill='#5a7686')
 for n in ['dino-leg-back','dino-leg-front']:
  im=part(n);pixels=np.array(im);pixels[:,:,:3]=(pixels[:,:,:3].astype(float)*.72).astype('uint8');im=Image.fromarray(pixels);x,y=records[n]['box'][:2];out.alpha_composite(im,(x+38,y-6))
 order=['dino-tail-3','dino-tail-2','dino-tail-1','dino-rib-1','dino-rib-2','dino-rib-3','dino-rib-4','dino-leg-back','dino-leg-front','dino-hips','dino-spine-1','dino-spine-2','dino-spine-3','dino-neck-1','dino-neck-2','dino-skull-sneeze' if sneeze else 'dino-skull']
 for n in order:
  r=records[n];x,y=r['box'][:2];dx,dy=r['registration']['renderOffset'];out.alpha_composite(part(n),(x+dx,y+dy))
 if markers:
  for x,y in [(440,285),(730,285),(760,255),(845,165),(905,100),(410,268),(285,312),(165,360),(545,240),(600,232),(660,236),(715,246)]:d.ellipse((x-3,y-3,x+3,y+3),outline='#eb287d',width=1)
 return out
normal=render();normal.convert('RGB').save(PENDING/'OCT28-DINO-SKELETON-assembled-normal.png');render(True).convert('RGB').save(PENDING/'OCT28-DINO-SKELETON-assembled-sneeze.png');render(markers=True).convert('RGB').save(PENDING/'OCT28-DINO-SKELETON-joint-review.png')
joined=Image.new('RGB',(1200,1040));joined.paste(normal,(0,0));joined.paste(render(True),(0,520));joined.save(PENDING/'OCT28-DINO-SKELETON-contact-review.jpg',quality=92)
qa={'status':'sources-and-intake-validated-pending-final-visual-check','count':17,'nativeArchives':'All17 native RGBA archives pixel-identical to generatedPNG','runtimeReproducibility':'All17 runtimeRGBA rasters reproduced exactly from source and recorded affine matrices','clipping':'Zero pixels alpha>16 outside all17 requestedboxcanvases in64px padded transformproof','feetBaseline':480,'renderOffsets':{r['key']:r['registration']['renderOffset'] for r in records.values() if r['registration']['renderOffset']!=[0,0]},'reviewFiles':['reference/pending/OCT28-DINO-SKELETON-assembled-normal.png','reference/pending/OCT28-DINO-SKELETON-assembled-sneeze.png','reference/pending/OCT28-DINO-SKELETON-joint-review.png','reference/pending/OCT28-DINO-SKELETON-contact-review.jpg'],'consumerCheck':'Root/extras agent handles real game dance/sneeze review; no shared code edits by skeletonworker.'}
(PENDING/'OCT28-DINO-SKELETON-QA.json').write_text(json.dumps(qa,indent=2)+'\n');print(json.dumps(qa,indent=2))
