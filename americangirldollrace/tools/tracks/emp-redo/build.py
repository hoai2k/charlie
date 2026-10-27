"""Pack one reviewed EMP trigger per track; keep all four other cells exact."""
from pathlib import Path
import json,sys,hashlib
from PIL import Image
H=Path(__file__).resolve().parent;G=H.parents[2]

def build(key):
 before=Image.open(H/f'before/{key}.webp').convert('RGBA');src=Image.open(H/f'sources/{key}.webp').convert('RGBA');src.putalpha(src.getchannel('A').point(lambda a:0 if a<4 else a));b=src.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox();assert b and min(b[:2])>0 and b[2]<src.width and b[3]<src.height,(key,'clipped source',b)
 scale=232/max(b[2]-b[0],b[3]-b[1]);size=(round((b[2]-b[0])*scale),round((b[3]-b[1])*scale));art=src.crop(b).resize(size,Image.Resampling.LANCZOS);cell=Image.new('RGBA',(256,256));cell.alpha_composite(art,((256-size[0])//2,(256-size[1])//2));out=before.copy();out.paste(cell,(512,0));target=G/f'assets/tracks/{key}/powerups.webp';out.save(target,lossless=True,method=6,exact=True)
 untouched={str(n):hashlib.sha256(before.crop((n*256,0,(n+1)*256,256)).tobytes()).hexdigest() for n in [0,1,3,4]};report={'key':key,'path':str(target.relative_to(G)),'size':[1280,256],'cell':2,'bounds':list(cell.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()),'unchanged':untouched,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()};(H/'reports').mkdir(exist_ok=True);(H/f'reports/{key}.json').write_text(json.dumps(report,indent=2)+'\n');print(key,report['bounds'])
if __name__=='__main__':
 for key in sys.argv[1:] or [j['key'] for j in json.loads((H/'generation.json').read_text())]:build(key)
