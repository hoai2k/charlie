"""Pack six floor slabs, removing only near-zero-alpha generation noise."""
from pathlib import Path
from PIL import Image
import importlib.util,json,hashlib
HERE=Path(__file__).resolve().parent;GAME=HERE.parents[2]
spec=importlib.util.spec_from_file_location('packing',GAME/'tools/tracks/build.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
source=p.clean(Image.open(HERE/'source.webp'));cells=p.atlas_cells(source)
sheet=Image.new('RGBA',(2304,640));frames=[]
for n,cell in enumerate(cells):
 b=p.bounds(cell);assert b and b[0]>0 and b[1]>0 and b[2]<cell.width and b[3]<cell.height,b
 # The art is a floor cross-section: crop inside its straight bottom cut.
 art=cell.crop((b[0],b[1],b[2],b[3]-3)).resize((756,280),Image.Resampling.LANCZOS)
 frame=Image.new('RGBA',(768,320));frame.alpha_composite(art,(6,40));sheet.paste(frame,(n%3*768,n//3*320))
 frames.append({'bounds':p.bounds(frame),'backEdge':40})
target=GAME/'assets/tracks/clouds/floor.webp';sheet.save(target,lossless=True,exact=True,method=6)
(HERE/'report.json').write_text(json.dumps({'size':sheet.size,'frames':frames,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()},indent=2)+'\n')
review=Image.new('RGB',(2304,1280))
for y,c in [(0,'#94c8ee'),(640,'#18233c')]:
 bg=Image.new('RGBA',sheet.size,c);bg.alpha_composite(sheet);review.paste(bg.convert('RGB'),(0,y))
review.save(HERE/'alpha-review.webp',quality=90,method=6)

# CL2 shares this tile palette; retain soft generated alpha at its edges.
puff=p.icon(p.clean(Image.open(HERE/'puff-source.webp')),(128,128),(112,88))
puff.save(GAME/'assets/tracks/clouds/puff.webp',lossless=True,exact=True,method=6)
(HERE/'puff-report.json').write_text(json.dumps({'size':[128,128],'bounds':p.bounds(puff),'sha256':hashlib.sha256((GAME/'assets/tracks/clouds/puff.webp').read_bytes()).hexdigest()},indent=2)+'\n')
