#!/usr/bin/env python3
"""Extract actual generated art into anchored WebP sprite frames.

Usage: python3 party/tools/sprites/build.py path/to/spec.json [--output DIR]
Only crops, alpha cleanup, scales, places, and encodes supplied artwork.
See README.md for the reproducible input spec and manual landmark overrides.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

POINTS = ('head', 'hand', 'eyes', 'neck', 'back')


def read_image(spec, base, sources=None):
    path = (base / spec['source']).resolve()
    if sources is None:
        image = Image.open(path).convert('RGBA')
    else:
        if path not in sources:
            with Image.open(path) as source:
                sources[path] = source.convert('RGBA')
        # Alpha cleanup must never alter the cached full sheet.
        image = sources[path].copy()
    if 'rect' in spec:
        x, y, w, h = spec['rect']
        if min(x, y) < 0 or min(w, h) <= 0 or x + w > image.width or y + h > image.height:
            raise ValueError(f"Crop outside source: {spec}")
        image = image.crop((x, y, x + w, y + h))
    elif 'cell' in spec:
        cols, rows = spec.get('grid', [1, 1])
        cell = spec['cell']
        if not 0 <= cell < cols * rows:
            raise ValueError(f'Cell outside grid: {cell}')
        x, y = cell % cols, cell // cols
        image = image.crop((round(x * image.width / cols), round(y * image.height / rows),
                            round((x + 1) * image.width / cols), round((y + 1) * image.height / rows)))
    alpha = image.getchannel('A').point(lambda a: a if a >= 8 else 0)
    if spec.get('isolate'):
        # Irregular sheets can overlap in x while remaining separate in 2D.
        # Isolate the largest connected figure inside the supplied crop, keeping
        # its antialias fringe. Requires scipy/numpy only for this optional mode.
        import numpy as np
        from scipy import ndimage
        values = np.array(alpha)
        separation = int(spec.get('separate', 0))
        core = values >= 32
        if separation:
            core = ndimage.binary_erosion(core, iterations=separation)
        labels, count = ndimage.label(core)
        if count:
            counts = np.bincount(labels.ravel()); counts[0] = 0
            mask = ndimage.binary_dilation(labels == counts.argmax(), iterations=2 + separation)
            alpha = Image.fromarray(np.where(mask, values, 0).astype('uint8'))
    image.putalpha(alpha)
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError(f'Empty artwork: {spec}')
    # Opaque/checkerboard backgrounds are NOT automatically removed: that can
    # erase white pony fur, eyes, clothes or pale mane. Regenerate with alpha.
    transparent = sum(n for n, a in alpha.getcolors(image.width * image.height) if a < 8)
    if transparent < image.width * image.height * 0.015:
        raise ValueError(f"Source needs real transparency: {spec['source']}")
    return image, bbox


def contact(image, bbox):
    """Ground midpoint estimate. Supply anchor to override tails/raised feet."""
    alpha = image.getchannel('A')
    y0 = max(bbox[1], bbox[3] - max(2, round((bbox[3] - bbox[1]) * .04)))
    support = alpha.crop((bbox[0], y0, bbox[2], bbox[3])).getbbox()
    return [(bbox[0] + (support[0] + support[2]) / 2), bbox[3]]


def build(spec, base, output):
    output.mkdir(parents=True, exist_ok=True)
    quality = int(spec.get('quality', 86))
    prepared = {}
    sources = {}
    for pose, definition in spec['poses'].items():
        if isinstance(definition, str) or 'alias' in definition:
            continue
        items = []
        for frame in definition['frames']:
            item = {**spec.get('sourceDefaults', {}), **definition.get('sourceDefaults', {}), **frame}
            image, bbox = read_image(item, base, sources)
            items.append((item, image, bbox))
        if not items:
            raise ValueError(f'{pose} has no frames')
        prepared[pose] = items
    sources.clear()
    if 'idle' not in prepared:
        raise ValueError('A real idle frame is required to establish the shared scale')
    idle_bbox = prepared['idle'][0][2]
    body_height = spec.get('bodyHeight', 320)
    common_scale = body_height / (idle_bbox[3] - idle_bbox[1])
    size = spec.get('frameSize', [max(440, round(body_height * 1.6)), round(body_height * 1.5)])
    anchor = spec.get('anchor', [size[0] // 2, size[1] - 20])
    manifest = {'frameSize': size, 'anchor': anchor, 'bodyHeight': body_height,
                'facing': spec.get('facing', 1), 'poses': {}, 'portraits': {},
                'provenance': spec.get('provenance', 'Generated from approved canonical; normalized by tools/sprites/build.py')}
    qa = []
    idle_normalized = None
    for pose, definition in spec['poses'].items():
        if isinstance(definition, str) or 'alias' in definition:
            manifest['poses'][pose] = definition
            continue
        dest = {k: v for k, v in definition.items() if k not in ('frames', 'sourceDefaults')}
        dest.setdefault('motion', .3 if len(prepared[pose]) > 1 else .85)
        dest.setdefault('fps', 8)
        dest['frames'] = []
        for i, (item, image, bbox) in enumerate(prepared[pose]):
            scale = common_scale * item.get('scale', 1)
            source_anchor = item.get('anchor', contact(image, bbox))
            # Source anchor may lie below an airborne character. Never pull
            # airborne frames down to the opaque bottom; mark anchor explicitly.
            resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
            offset = [round(anchor[j] - source_anchor[j] * scale) for j in range(2)]
            rb = resized.getchannel('A').getbbox()
            if any((rb[0] + offset[0] < 0, rb[1] + offset[1] < 0,
                    rb[2] + offset[0] > size[0], rb[3] + offset[1] > size[1])):
                raise ValueError(f'{pose}/{i} clips frame canvas. Enlarge frameSize or correct source anchor/scale.')
            canvas = Image.new('RGBA', size)
            canvas.alpha_composite(resized, tuple(offset))
            # Trim for decode memory. Anchor remains frame-local and may lie
            # outside a trimmed airborne frame (valid and intentional).
            crop = canvas.getchannel('A').getbbox()
            frame_image = canvas.crop(crop)
            filename = f'{pose}-{i:02}.webp'
            frame_image.save(output / filename, 'WEBP', quality=quality, method=6)
            frame = {'src': filename, 'anchor': [anchor[0] - crop[0], anchor[1] - crop[1]]}
            for point in POINTS:
                pt = item.get(point)
                if pt is not None:
                    frame[point] = [round(pt[j] * scale + offset[j] - crop[j]) for j in range(2)]
            for prop in ('dur', 'headAngle'):
                if prop in item:
                    frame[prop] = item[prop]
            dest['frames'].append(frame)
            if pose == 'idle' and i == 0:
                idle_normalized = canvas.copy()
            qa.append((pose, i, canvas))
        manifest['poses'][pose] = dest
    for expr, item in spec.get('portraits', {}).items():
        image, bbox = read_image({**spec.get('portraitDefaults', {}), **item}, base)
        # Preserve face proportions, fit the selected bust crop to a square,
        # and align shoulders to the bottom so the HUD circle frames the face.
        if item.get('trim', False):
            image = image.crop(bbox)
        image.thumbnail((384, 384), Image.Resampling.LANCZOS)
        portrait = Image.new('RGBA', (384, 384))
        portrait.alpha_composite(image, ((384 - image.width) // 2, 384 - image.height))
        image = portrait
        filename = f'portrait-{expr}.webp'
        image.save(output / filename, 'WEBP', quality=quality, method=6)
        manifest['portraits'][expr] = filename
    (output / 'sprites.json').write_text(json.dumps(manifest, indent=2) + '\n')
    # QA generated separately from shipped art; optional and easy to inspect.
    cell_w, cell_h = 220, 250
    qa_image = Image.new('RGB', (cell_w * 4, cell_h * ((len(qa) + 3) // 4)), '#bcc4d2')
    draw = ImageDraw.Draw(qa_image)
    for n, (pose, i, canvas) in enumerate(qa):
        overlay = idle_normalized.copy()
        overlay.putalpha(overlay.getchannel('A').point(lambda a: round(a * .22)))
        overlay.alpha_composite(canvas)
        overlay.thumbnail((cell_w, cell_h - 25), Image.Resampling.LANCZOS)
        x, y = (n % 4) * cell_w, (n // 4) * cell_h
        qa_image.paste(overlay, (x + (cell_w - overlay.width) // 2, y), overlay)
        draw.text((x + 6, y + cell_h - 20), f'{pose} {i}', fill='#182139')
    qa_path = output / 'qa-contact-sheet.jpg'
    qa_image.save(qa_path, quality=88)
    print(f'Built {len(qa)} frames, {len(manifest["portraits"])} portraits: {output}')
    print(f'Inspect {qa_path}; update assets/sprites/index.json only after visual approval.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('spec', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    data = json.loads(args.spec.read_text())
    target = args.output or Path(__file__).resolve().parents[2] / 'assets' / 'sprites' / data['asset']
    build(data, args.spec.resolve().parent, target)
