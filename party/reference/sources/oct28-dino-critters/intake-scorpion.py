from PIL import Image, ImageDraw
from pathlib import Path
import json, hashlib
root=Path(__file__).resolve().parents[3]
p=Path(__file__).parent
im=Image.open(p/'scorpion-repacked.webp').convert('RGBA')
parts=[]; boxes=[]
for i in range(4):
 cell=im.crop((i*543,0,(i+1)*543,724));bbox=cell.getchannel('A').getbbox();boxes.append(bbox);parts.append(cell.crop(bbox))
scale=min(232/max(c.width for c in parts),208/max(c.height for c in parts))
out=Image.new('RGBA',(1024,256));bounds=[]
for i,part in enumerate(parts):
 part=part.resize((round(part.width*scale),round(part.height*scale)),Image.Resampling.LANCZOS)
 x=i*256+128-part.width//2;y=224-part.height
 out.alpha_composite(part,(x,y));bounds.append((x-i*256,y,x-i*256+part.width,224))
f=root/'assets/art/prop/dino-scorpion.webp';out.save(f,'WEBP',lossless=True,exact=True,method=6)
assert out.size==(1024,256)
for i in range(4):
 b=out.crop((i*256,0,(i+1)*256,256)).getchannel('A').getbbox();assert b[3]==224 and b[0]>0 and b[2]<256 and b[1]>0,b
bg=Image.new('RGB',out.size,'#d8b779');bg.paste(out,mask=out.getchannel('A'));dr=ImageDraw.Draw(bg)
for i in range(4):dr.line((i*256,224,(i+1)*256-1,224),fill='#546c49',width=1)
review=root/'reference/pending/OCT28-DINO-SCORPION-REVIEW.jpg';bg.save(review,quality=92)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
record=dict(key='prop/dino-scorpion',tool='built-in image_gen.imagegen',prompt=(p/'scorpion-prompt.txt').read_text().strip(),nativePath='/Users/hoai/.codex/generated_images/01a184eb-911f-7d63-80e3-7132b6277022/exec-33017811-df37-497e-98ea-7c5879d0ed7b.png',source='party/reference/sources/oct28-dino-critters/scorpion-native.webp',sourceSize=[2172,724],sourceArchiveRGBAExact=True,runtime='party/assets/art/prop/dino-scorpion.webp',runtimeSize=[1024,256],cellSize=[256,256],anchor=[128,224],bounds=bounds,scale=scale,sourceSHA256=sha(p/'scorpion-native.webp'),runtimeSHA256=sha(f),review='party/reference/pending/OCT28-DINO-SCORPION-REVIEW.jpg',poseOrder=['surprised-pincers-up','surprised-other-pincer-wave','scuttle-step-a','scuttle-step-b'],checks={'alpha':out.getchannel('A').getextrema(),'sharedGroundExclusiveBottom':224,'unclipped':True,'authoredDistinctFrames':4},intake='Run repack_atlas.py on native with --cols4 --rows1, then this script. One common scaling preserves relative authored proportions; align full-alpha bounds to ground224 and horizontal centre128. No limb/body repainting.')
(root/'reference/pending/OCT28-DINO-SCORPION.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record['bounds']))
