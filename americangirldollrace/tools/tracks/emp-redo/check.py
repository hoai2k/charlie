from pathlib import Path
import json,hashlib
from PIL import Image
H=Path(__file__).resolve().parent;G=H.parents[2]
for p in sorted((H/'reports').glob('*.json')):
 if p.name.startswith('.'):continue
 d=json.loads(p.read_text());im=Image.open(G/d['path']).convert('RGBA');assert list(im.size)==d['size'];assert hashlib.sha256((G/d['path']).read_bytes()).hexdigest()==d['sha256']
 for n,sha in d['unchanged'].items():
  n=int(n);assert hashlib.sha256(im.crop((n*256,0,(n+1)*256,256)).tobytes()).hexdigest()==sha,(d['key'],n)
 b=d['bounds'];assert min(b[:2])>=10 and max(b[2:])<=246,(d['key'],b)
 print(d['key'],'EMP gutter, alpha, dimensions and four untouched cells passed')
