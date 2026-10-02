#!/usr/bin/env python3
"""Register a reviewed 2–4 pose sheet using isolated connected figures.

Requires Pillow, numpy, scipy. Saves a lossless source and updates intake spec.
Manual source-local anchor/landmark review remains mandatory after this step.
"""
import argparse
import json
from pathlib import Path
import numpy as np
from scipy import ndimage
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('asset')
parser.add_argument('source', type=Path)
parser.add_argument('sheet_name')
parser.add_argument('poses', help='Comma-separated, left-to-right pose names')
parser.add_argument('--facing', type=int, default=1)
parser.add_argument('--scale', type=float, default=1)
args = parser.parse_args()
base = Path(__file__).resolve().parent
im = Image.open(args.source).convert('RGBA')
a = np.array(im)[:, :, 3]
labels, _ = ndimage.label(a >= 32)
objects = ndimage.find_objects(labels)
figures = []
for i, obj in enumerate(objects):
    area = int((labels[obj] == i + 1).sum())
    if area > 1000:
        figures.append((area, (obj[1].start, obj[0].start, obj[1].stop, obj[0].stop)))
poses = args.poses.split(',')
figures = sorted(sorted(figures, reverse=True)[:len(poses)], key=lambda x: (x[1][0] + x[1][2]) / 2)
if len(figures) != len(poses):
    raise SystemExit(f'Expected {len(poses)} figures, found {len(figures)}')
im.save(base / 'sources' / f'{args.asset}-{args.sheet_name}.webp', 'WEBP', lossless=True, method=6)
p = base / 'specs' / f'{args.asset}.json'
spec = json.loads(p.read_text())
loops = {'idle', 'walk', 'run', 'celebrate', 'pout', 'sad', 'dizzy', 'think', 'wave', 'carry', 'dance', 'paint', 'sleep', 'clap', 'ride', 'stir', 'look-around'}
for name, (_, (left, top, right, bottom)) in zip(poses, figures):
    left, top, right, bottom = max(0, left-4), max(0, top-4), min(im.width, right+4), min(im.height, bottom+4)
    w, h = right-left, bottom-top
    anchor = [round(w * (.58 if args.asset == 'felicity' else .52)), h-4]
    frame = {'source':f'../sources/{args.asset}-{args.sheet_name}.webp', 'rect':[left, top, w, h], 'isolate':True, 'anchor':anchor, 'scale':args.scale}
    spec['poses'][name] = {'frames':[frame], 'fps':5, 'loop':name in loops, 'motion':.85, 'facing':args.facing}
    print(name, frame['rect'], 'anchor', anchor)
p.write_text(json.dumps(spec, indent=2)+'\n')
