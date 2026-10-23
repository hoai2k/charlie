"""Pack the Apollo-style rover; measure each open seat rather than warp its chassis."""
from pathlib import Path
from PIL import Image
import importlib.util,json,hashlib
H=Path(__file__).resolve().parent;G=H.parents[2]
spec=importlib.util.spec_from_file_location('packing',G/'tools/tracks/build.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
source=p.clean(Image.open(H/'source.webp'))
split=p.mount_cells(source)
# Seat cushion centres in original source pixels. The generated source faces
# right; retain its level chassis. Runtime rotates rider and rover together.
seats=[[300,241],[800,241],[1300,241],[300,572],[800,579],[1300,575],[300,910],[800,910],[1300,917]]
items=[]
for (cell,box),seat in zip(split,seats):
 b=p.bounds(cell);assert b and min(b[:2])>0 and b[2]<cell.width and b[3]<cell.height,('clipped source',box,b)
 local=[seat[0]-box[0],seat[1]-box[1]];items.append((cell,b,local))
scale=min(360/max(b[2]-b[0] for _,b,_ in items),375/max(b[3]-b[1] for _,b,_ in items),220/max(seat[0]-b[0] for _,b,seat in items),186/max(b[2]-seat[0] for _,b,seat in items))
sheet=Image.new('RGBA',(1254,1254));frames=[]
for n,(cell,b,seat) in enumerate(items):
 art=cell.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
 seatX=(seat[0]-b[0])*scale
 x=round(226-seatX);y=409-p.bounds(art)[3]
 assert x>0 and x+art.width<418 and y>0,(n,x,y,art.size)
 frame=Image.new('RGBA',(418,418));frame.alpha_composite(art,(x,y));sheet.paste(frame,(n%3*418,n//3*418))
 frames.append({'bounds':p.bounds(frame),'seat':[226,round(y+(seat[1]-b[1])*scale,2)],'groundShift':0})
target=G/'assets/moon_buggy_sprites.webp';sheet.save(target,lossless=True,exact=True,method=6)
meta={'asset':str(target.relative_to(G)),'size':[1254,1254],'frameSize':[418,418],'scale':scale,'frames':frames,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
(H/'calibration.json').write_text(json.dumps(meta,indent=2)+'\n')
mounts=G/'mounts.js';text=mounts.read_text();data=json.loads(text[text.index('{'):text.rindex('}')+1]);data['moon_buggy']={'calibration':[[frames[r*3+c]['seat']+[0] for c in range(3)] for r in range(3)],'riddenScale':1.2,'riderShift':[-22,-24]};mounts.write_text('// Generated mount calibration: griffon and Apollo-style moon buggy.\nwindow.MOUNT_ART = '+json.dumps(data,indent=2)+';\n')
print(meta)
