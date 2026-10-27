#!/usr/bin/env python3
"""Apply reviewed source-local skin guards from make_masks.py automatically.

Normal command: python3 party/tools/sprites/make_masks.py CHARACTER
The override data owns only named new-action frames; other masks are untouched.
"""
import json
import hashlib
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from build import read_image
from make_masks import hsl
from optimize import fingerprint


def apply(asset):
    here = Path(__file__).resolve().parent
    data = json.loads((here / 'mask_overrides' / f'{asset}-new-games.json').read_text())
    spec_path = here / 'specs' / f'{asset}.json'
    spec = json.loads(spec_path.read_text())
    folder = here.parent.parent / 'assets' / 'sprites' / asset
    manifest = json.loads((folder / 'sprites.json').read_text())
    revision = hashlib.sha256((here / 'mask_overrides' / f'{asset}-new-games.json').read_bytes()).hexdigest()[:16]
    assert manifest.get('maskOverrideRevision') == revision, 'Rebuild sprites after mask metadata changes'
    index_path = folder / 'masks' / 'index.json'
    index = json.loads(index_path.read_text())
    assert index['source'] == fingerprint(asset), 'Run make_masks.py first'
    _, bbox = read_image(spec['poses']['idle']['frames'][0], spec_path.parent)
    common = spec['bodyHeight'] / (bbox[3] - bbox[1])
    for pose, definition in spec['poses'].items():
        if not isinstance(definition, dict) or 'frames' not in definition:
            continue
        for i, frame in enumerate(definition.get('frames', [])):
            runtime = manifest['poses'][pose]['frames'][i]
            name = runtime['src']
            if name not in data['polygons']:
                continue
            assert '-new-games-' in frame['source'], 'Override must target reviewed source'
            path = folder / 'masks' / name
            mask = np.asarray(Image.open(path).convert('RGB')).copy()
            image = np.asarray(Image.open(folder / name).convert('RGBA')).astype(np.float32) / 255
            hue, sat, light = hsl(image)
            # Boots cannot include tan skin or gray placket regions even if an
            # antialiased outline allowed one connected region to merge them.
            mask[..., 1][~((hue >= 235) & (hue <= 310) & (sat > .15))] = 0
            protection = Image.new('L', (mask.shape[1], mask.shape[0]))
            draw = ImageDraw.Draw(protection)
            factor = common * frame.get('scale', 1)
            def transform(polygon):
                return [(round(runtime['anchor'][0] + (x - frame['anchor'][0]) * factor),
                         round(runtime['anchor'][1] + (y - frame['anchor'][1]) * factor))
                        for x, y in polygon]
            # Two bright sleeves merged with their fists and escaped the
            # region median. Fill only their reviewed source-local polygons.
            sleeve = Image.new('L', protection.size)
            sd = ImageDraw.Draw(sleeve)
            for polygon in data.get('sleeveFill', {}).get(name, []):
                sd.polygon(transform(polygon), fill=255)
            outfit = ((hue >= 8) & (hue <= 50) & (sat > .55) &
                      (light > .15) & (light < data.get('fillMaxLight', .94)) & (image[..., 3] > .5))
            mask[outfit & (np.asarray(sleeve) > 0), 0] = 255
            for polygon in data['polygons'][name]:
                draw.polygon(transform(polygon), fill=255)
            mask[np.asarray(protection) > 0] = 0
            Image.fromarray(mask).save(path, 'WEBP', lossless=True, method=6)
    index['reviewedOverrides'] = str((here / 'mask_overrides' / f'{asset}-new-games.json').relative_to(here.parent.parent))
    index_path.write_text(json.dumps(index) + '\n')
    print(f'{asset}: applied {len(data["polygons"])} reviewed skin guards')


if __name__ == '__main__':
    for asset in sys.argv[1:]:
        apply(asset)
