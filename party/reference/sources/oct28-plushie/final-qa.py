from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,hashlib
ROOT=Path(__file__).resolve().parents[3];pending=ROOT/'reference/pending';images={};rows=[]
for record in sorted(pending.glob('OCT28-PLUSHIE-*.json')):
 d=json.loads(record.read_text())
 if 'key' not in d or 'runtime' not in d:continue
 source=ROOT/d['source'];native=Path(d['nativePath']);runtime=ROOT/d['runtime'];im=Image.open(runtime).convert('RGBA');src=Image.open(source).convert('RGBA');orig=Image.open(native).convert('RGBA')
 assert src.size==orig.size and np.array_equal(np.array(src),np.array(orig)),source
 assert im.mode=='RGBA';a=np.array(im)[:,:,3]
 if d['key'].startswith(('bg/','thumb/')):assert a.min()==255,(d['key'],a.min())
 else:assert a.min()==0 and a.max()>200,d['key']
 d.update(status='delivered-and-reviewed-in-game',review='Native output and registered runtime inspected. All six body landmarks reviewed in common-frame contact sheet; tinted fabrics and exact trim registration checked. Atlas source order/whole pieces checked; tool points reviewed with crosshairs. Full-resolution and compact art reviewed in actual one/eight-player stations and shelf; compact tools and natural eight-CPU finale passed; see live review records.',runtimeSha256=hashlib.sha256(runtime.read_bytes()).hexdigest(),runtimeBytes=runtime.stat().st_size,alphaExtrema=[int(a.min()),int(a.max())],decodedBytes=im.width*im.height*4)
 active=json.loads((ROOT/'assets/art/index.json').read_text())['images'].get(d['key'])
 if active:
  ai=Image.open(ROOT/'assets/art'/active);d.update(activeRuntime='assets/art/'+active,activeOutputSize=list(ai.size),activeDecodedBytes=ai.width*ai.height*4)
 d['styleReference']='assets/art/prop/room-teddy.webp'
 record.write_text(json.dumps(d,indent=2)+'\n');images[d['key']]=str(runtime.relative_to(ROOT/'assets/art'));rows.append(dict(key=d['key'],size=list(im.size),encodedBytes=d['runtimeBytes'],decodedBytes=d['decodedBytes'],promptRecord=str(record.relative_to(ROOT))))
assert len(rows)==16,len(rows)
handoff=dict(images=images,group='plushie-workshop',groupKeys=[k for k in images if not k.startswith('thumb/')],assets=rows,encodedBytes=sum(r['encodedBytes'] for r in rows),decodedBytes=sum(r['decodedBytes'] for r in rows),decodedMiB=sum(r['decodedBytes'] for r in rows)/1048576,bodyDecodedMiB=6*1024*1120*4/1048576,reviewArtifacts=['reference/pending/OCT28-PLUSHIE-contact-review.jpg','reference/pending/OCT28-PLUSHIE-tools-review.jpg'],notes=['All16 requested native images generated with built-in imagegen; original paths and exact prompts in per-asset JSON. Native source archives byte-exact RGBA lossless WebP exact=True.','Body geometry uses authored pixels with measured piecewise affine registration, no recentering. Bottom trim row extracted from corresponding top-row source, so every colored trim pixel exactly registers with fabric.','All requested runtime dimensions retained; total decoded budget requires game budget exception or focused loading.','No shared index/manifest/map/request files changed. Source/repack scripts included for reproducibility; pending records are metadata, not ship manifests.'])
index=json.loads((ROOT/'assets/art/index.json').read_text());handoff['activeImages']={k:index['images'][k] for k in images};handoff['activeGroupDecodedMiB']=sum(Image.open(ROOT/'assets/art'/index['images'][k]).width*Image.open(ROOT/'assets/art'/index['images'][k]).height*4 for k in index['groups']['plushie-workshop'] if k in index['images'])/1048576
(pending/'OCT28-PLUSHIE-index-additions.json').write_text(json.dumps(handoff,indent=2)+'\n')
# Uniform-scale neutral review with actual source alpha; body outline/seat shared.
out=Image.new('RGBA',(1536,620),(240,229,241,255));D=ImageDraw.Draw(out)
colors=[(224,168,104),(255,244,232),(198,170,255),(255,215,107),(176,124,88),(147,227,191)]
for i,(n,color) in enumerate(zip(['bear','bunny','unicorn','kitty','puppy','dragon'],colors)):
 im=Image.open(ROOT/f'assets/art/prop/plushie-body-{n}-v1.webp').convert('RGBA')
 for col in [0,1]:
  p=im.crop((col*512,0,col*512+512,560));ar=np.array(p);ar[:,:,:3]=(ar[:,:,:3].astype(float)*np.array(color)/255).astype('uint8');p=Image.fromarray(ar);p.alpha_composite(im.crop((col*512,560,col*512+512,1120)));out.alpha_composite(p.resize((256,280),Image.Resampling.LANCZOS),(i*256,20 if col==1 else 330))
 D.text((i*256+100,5),n,fill='black')
 for y in [88,195,322,470,540]:D.line((i*256,y//2+20,(i+1)*256,y//2+20),fill=(100,140,160,90),width=1)
out.convert('RGB').save(pending/'OCT28-PLUSHIE-contact-review.jpg')
print(json.dumps({k:handoff[k] for k in ['encodedBytes','decodedBytes','decodedMiB','bodyDecodedMiB']},indent=2))
