#!/usr/bin/env python3
"""Crop/resize/encode imagegen output and register an explicit JSON intake record.
Review generated artwork before marking its record inspected; image edits use imagegen.
"""
import json, sys
from pathlib import Path
from PIL import Image
base = Path(__file__).resolve().parents[2] / 'assets' / 'art'
record = json.loads(Path(sys.argv[1]).read_text())
im = Image.open(record['source']).convert('RGBA')
alpha = im.getchannel('A')
if alpha.getextrema()[0] != 0:
    raise SystemExit('Source must have transparent pixels')
box = alpha.point(lambda v: 255 if v >= 16 else 0).getbbox()
box = (max(0, box[0]-2), max(0, box[1]-2), min(im.width, box[2]+2), min(im.height, box[3]+2))
if not record.get('preserveCanvas'):
    im = im.crop(box)
if record.get('exactSize'):
    im = im.resize(tuple(record['exactSize']), Image.Resampling.LANCZOS)
elif record.get('preserveCanvas'):
    im = im.resize(tuple(record['maxSize']), Image.Resampling.LANCZOS)
else:
    im.thumbnail(tuple(record['maxSize']), Image.Resampling.LANCZOS)
path = base / (record['key'] + record.get('suffix', '') + '.webp')
path.parent.mkdir(parents=True, exist_ok=True)
im.save(path, 'WEBP', quality=86, method=6)
index_path = base / 'index.json'
index = json.loads(index_path.read_text())
index['images'][record['key']] = str(path.relative_to(base))
index_path.write_text(json.dumps(index, indent=2)+'\n')
manifest_path = base / 'generation-manifest.json'
manifest = json.loads(manifest_path.read_text())
record.update(tool='built-in imagegen', width=im.width, height=im.height,
              bytes=path.stat().st_size, status=record.get('status', 'generated; pending review'))
manifest['generated'].append(record)
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
print(record['key'], im.size, record['bytes'])
