"""Replace only the Beach oil cell with reviewed seaweed art."""
from pathlib import Path
from PIL import Image
import importlib.util,json,hashlib
HERE=Path(__file__).resolve().parent;GAME=HERE.parents[2]
spec=importlib.util.spec_from_file_location('packing',GAME/'tools/tracks/build.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
art=p.icon(p.clean(Image.open(HERE/'source.webp')),(256,256),(228,150))
before=Image.open(HERE/'before.webp').convert('RGBA');sheet=before.copy();sheet.paste(art,(768,0))
for n in [0,1,2,4]:
 box=(n*256,0,(n+1)*256,256);assert before.crop(box).tobytes()==sheet.crop(box).tobytes()
target=GAME/'assets/tracks/beach/powerups.webp';sheet.save(target,lossless=True,exact=True,method=6)
review=Image.new('RGB',(324,512))
for y,color in [(0,'#f6ddaa'),(256,'#18233c')]:
 bg=Image.new('RGBA',(324,256),color);bg.alpha_composite(art);bg.alpha_composite(art.resize((68,68),Image.Resampling.LANCZOS),(256,94));review.paste(bg.convert('RGB'),(0,y))
review.save(HERE/'review.webp',quality=90,method=6)
(HERE/'report.json').write_text(json.dumps({'size':sheet.size,'bounds':p.bounds(art),'unchangedCells':[0,1,2,4],'sha256':hashlib.sha256(target.read_bytes()).hexdigest()},indent=2)+'\n')
