#!/usr/bin/env python3
"""Reproducible native archive and whole-art intake for October 28 Leaf Pile Leap."""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
ap = argparse.ArgumentParser()
ap.add_argument('name')
ap.add_argument('native')
ap.add_argument('--size', nargs=2, type=int, required=True)
ap.add_argument('--fit', nargs=2, type=int)
ap.add_argument('--opaque', action='store_true')
ap.add_argument('--atlas', action='store_true')
ap.add_argument('--runtime-name')
args = ap.parse_args()
name, size = args.name, tuple(args.size)
native = Image.open(args.native).convert('RGBA')
source = Path(__file__).parent / f'{name}-native.webp'
native.save(source, 'WEBP', lossless=True, exact=True, method=6)
assert Image.open(source).convert('RGBA').tobytes() == native.tobytes()
record_path = ROOT / 'reference/pending' / f'OCT28-LEAF-ENV-{name}.json'
record = json.loads(record_path.read_text())
kind = 'bg' if args.opaque else 'prop'
runtime = ROOT / 'assets/art' / kind / f'{args.runtime_name or ("leaf-pile-leap" if args.opaque else name)}.webp'
if args.atlas:
    assert native.getchannel('A').getextrema()[0] == 0
    output = native.resize(size, Image.Resampling.LANCZOS)
    geometry = {'columns':4,'rows':4,'cellSize':[128,128]}
elif args.opaque:
    output = native.resize(size, Image.Resampling.LANCZOS).convert('RGB')
    geometry = {'designSpace': list(size)}
else:
    assert native.getchannel('A').getextrema()[0] == 0, 'Native must contain genuine alpha'
    bounds = native.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
    art = native.crop(bounds)
    fit = args.fit or [size[0]-12,size[1]-12]
    scale = min(fit[0]/art.width, fit[1]/art.height)
    art = art.resize((round(art.width*scale),round(art.height*scale)),Image.Resampling.LANCZOS)
    xy = ((size[0]-art.width)//2, size[1]-art.height)
    output = Image.new('RGBA', size)
    output.alpha_composite(art,xy)
    geometry = {'sourceBounds': list(bounds), 'boundsAlphaThreshold':16, 'uniformScale': scale, 'placement': list(xy), 'bottomCentreAnchor': [size[0]/2,size[1]], 'alphaBounds': list(output.getchannel('A').point(lambda a:255 if a > 16 else 0).getbbox())}
runtime.parent.mkdir(parents=True,exist_ok=True)
output.save(runtime,'WEBP',quality=88,method=6,exact=True)
if args.atlas:
    subprocess.run([sys.executable,str(ROOT/'tools/sprites/repack_atlas.py'),str(runtime),'--cols','4','--rows','4','--margin','0.1'],check=True)
    output = Image.open(runtime).convert('RGBA')
    px = output.load()
    for y in range(output.height):
        for x in range(output.width):
            if px[x,y][3] == 0:
                px[x,y] = (0,0,0,0)
    output.save(runtime,'WEBP',lossless=True,exact=True,method=6)
record.update({'nativePath':args.native,'nativeSize':list(native.size),'source':str(source.relative_to(ROOT)),'runtime':str(runtime.relative_to(ROOT)),'outputSize':list(size),'geometry':geometry,'status':'generated-and-intaken-pending-runtime-review','processing':'Native RGBA lossless WebP exact=True archive; whole-art uniform fit and bottom-centre placement.' if not args.opaque else 'Native RGBA lossless WebP exact=True archive; resized to requested opaque design canvas.','runtimeSha256':hashlib.sha256(runtime.read_bytes()).hexdigest(),'runtimeBytes':runtime.stat().st_size,'decodedBytes':size[0]*size[1]*4,'alphaExtrema':list(output.convert('RGBA').getchannel('A').getextrema())})
record_path.write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'runtime':str(runtime),'geometry':geometry,'bytes':runtime.stat().st_size}))
