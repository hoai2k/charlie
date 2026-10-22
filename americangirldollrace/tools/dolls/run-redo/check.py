from pathlib import Path
import json,hashlib
from PIL import Image
H=Path(__file__).resolve().parent;G=H.parents[2]
for p in H.glob('*-verification.json'):
 if p.name.startswith('.'):continue
 key=p.name.split('-verification')[0];asset='claudia-v2' if key=='claudia' else key;data=json.loads(p.read_text())
 for token,expected in data['unchanged'].items():
  kind,n=token.split(':');n=int(n);im=Image.open(G/(f'assets/doll_{asset}_sprites.webp' if kind=='sheet' else f'assets/masks/{asset}_sheet_mask.webp')).convert('RGBA' if kind=='sheet' else 'RGB');x=n%3*418;y=n//3*418
  assert hashlib.sha256(im.crop((x,y,x+418,y+418)).tobytes()).hexdigest()==expected,(key,token)
 assert data['shoeFootprints'][1]<max(data['shoeFootprints'][0],data['shoeFootprints'][2])*.7
 print(key,'18 unchanged image/mask cells and narrow passing footprint passed')
