"""Build new dolls directly from generated pose strips and explicit anchor metadata.

No image service or ML segmentation is run by this script. Requires Pillow/numpy.
Run from anywhere: python3 americangirldollrace/tools/dolls/build.py [--check]
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[1]
FRAME = 418
BASELINE = 409  # exclusive alpha bottom, matching existing race sheets
POSES = ['idle-0', 'idle-1', 'idle-2', 'run-0', 'run-1', 'run-2',
         'jump-0', 'jump-1', 'jump-2', 'ride', 'push', 'fall']


def bounds(im):
    return im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()


def split_strip(src):
    """Find empty column cuts near thirds instead of clipping an off-grid boot/wing."""
    assert src.width == src.height * 3, 'Expected a 3:1 source strip'
    occupied = (np.asarray(src.getchannel('A')) > 8).any(axis=0)
    cuts = [0]
    for cell in [1, 2]:
        expected = cell * src.height
        reach = round(src.height * .24)
        options = np.flatnonzero(~occupied[max(1, expected-reach):expected+reach]) + max(1, expected-reach)
        if not len(options):
            raise ValueError('Figures overlap across a cell boundary; regenerate with more separation')
        nearest = int(min(options, key=lambda x: abs(x-expected)))
        lo, hi = nearest, nearest
        while lo > 0 and not occupied[lo-1]:
            lo -= 1
        while hi < src.width-1 and not occupied[hi+1]:
            hi += 1
        cuts.append((lo + hi) // 2)
    cuts.append(src.width)
    return [(cuts[i], 0, cuts[i+1], src.height) for i in range(3)]


def source_frame(manifest, pose):
    spec = dict(manifest['poses'][pose])
    src = Image.open(HERE / spec['source']).convert('RGBA')
    if 'cell' in spec:
        assert src.width == src.height * 3, 'Pose strips must be 3 square cells'
        x = spec['cell'] * src.height
        box = split_strip(src)[spec['cell']] if spec.get('separate') else (x, 0, x + src.height, src.height)
        offset = x - box[0]
        if 'hipX' in spec:
            spec['hipX'] += offset
        if 'anchor' in spec:
            spec['anchor'] = [spec['anchor'][0] + offset, spec['anchor'][1]]
        if 'raisedSleeves' in spec:
            spec['raisedSleeves'] = [[x0+offset,y0,x1+offset,y1] for x0,y0,x1,y1 in spec['raisedSleeves']]
        if 'protectedRegions' in spec:
            spec['protectedRegions'] = [[x0+offset,y0,x1+offset,y1] for x0,y0,x1,y1 in spec['protectedRegions']]
        src = src.crop(box)
    # Remove effectively invisible generated RGB spill (alpha 1..3), preserving
    # all meaningful alpha and soft hair edges. Never replace alpha with a key.
    src.putalpha(src.getchannel('A').point(lambda a: 0 if a < 4 else a))
    box = bounds(src)
    assert box, f'Empty source for {pose}'
    assert box[0] > 0 and box[1] > 0 and box[2] < src.width and box[3] < src.height, f'{pose}: source reaches a cell edge; regenerate with margin'
    return src, spec


def neutral_mask(src, chin, raised_sleeves=()):
    """Explicit opt-in for neutral grey uniforms + warm skin/natural brown hair.

    This conservative colour gate is NOT a general clothes segmenter. The face
    is fully protected by its source-space chin line, and warm pixels are never
    selected. Preserve source texture with soft weights at the colour boundary.
    """
    a = np.asarray(src).astype(np.float32)
    rgb = a[:, :, :3]
    spread = rgb.max(2) - rgb.min(2)
    weight = np.clip((22 - spread) / 6, 0, 1)
    weight *= (rgb.max(2) < 180) & (rgb.min(2) > 16) & (a[:, :, 3] > 16)
    candidate = weight.copy()
    weight[:round(chin)] = 0
    for x0, y0, x1, y1 in raised_sleeves:
        weight[y0:y1, x0:x1] = candidate[y0:y1, x0:x1]
    out = np.zeros_like(a, dtype=np.uint8)
    out[:, :, 0] = np.round(weight * 255).astype(np.uint8)
    out[:, :, 3] = 255
    return Image.fromarray(out)


def clothing_mask(src, spec, mode):
    if mode == 'pink-cardigan':
        # Explicit Luna palette: pink knit, warm blonde hair/skin, blue skirt.
        # Bound the garment vertically so pink sock stripes stay unchanged.
        a = np.asarray(src).astype(np.float32)
        r, g, b, alpha = [a[:, :, i] for i in range(4)]
        weight = np.clip((r-g-14)/8, 0, 1) * np.clip((b-g-5)/8, 0, 1)
        weight *= (r > b-20) & (b > 70) & (alpha > 16)
        candidate = weight.copy()
        weight[:round(spec['chin'])] = 0
        for x0, y0, x1, y1 in spec.get('raisedSleeves', []):
            weight[y0:y1, x0:x1] = candidate[y0:y1, x0:x1]
        weight[round(spec['garmentBottom']):] = 0
        for x0, y0, x1, y1 in spec.get('protectedRegions', []):
            weight[y0:y1, x0:x1] = 0
        out = np.zeros_like(a, dtype=np.uint8)
        out[:, :, 0] = np.round(weight * 255).astype(np.uint8)
        out[:, :, 3] = 255
        return Image.fromarray(out)
    if mode != 'neutral-uniform':
        raise ValueError(f'Unknown mask strategy: {mode}')
    return neutral_mask(src, spec['chin'], spec.get('raisedSleeves', []))


def place(src, mask, spec, scale):
    """One scale per source strip, no independent fit-to-bounds per pose."""
    factor = scale * spec.get('scale', 1)
    box = bounds(src)
    # Position relative to an anatomical pivot, not the changing hair silhouette.
    anchor = spec['anchor'] if 'anchor' in spec else [spec['hipX'], box[3]]
    target = spec.get('target', [FRAME / 2, BASELINE])
    xy = [round(target[i] + (box[i] - anchor[i]) * factor) for i in (0, 1)]
    size = [round((box[i + 2] - box[i]) * factor) for i in (0, 1)]
    if min(xy) < 5 or xy[0] + size[0] > FRAME - 5 or xy[1] + size[1] > FRAME - 5:
        raise ValueError(f'Clipping at {xy}, {size}: fix source/anchor/scale, never silently shrink a pose')
    frame = Image.new('RGBA', (FRAME, FRAME))
    frame.alpha_composite(src.crop(box).resize(size, Image.Resampling.LANCZOS), xy)
    # Masks are opaque RGB weights; outside the sprite stays zero weight.
    outmask = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 255))
    outmask.paste(mask.crop(box).resize(size, Image.Resampling.LANCZOS), xy)
    return frame, outmask, {'bounds': bounds(frame), 'scale': factor,
                          'anchor': target, 'sourceAnchor': anchor}


def save_webp(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, 'WEBP', lossless=True, quality=88, method=6)


def build(manifest):
    key = manifest['key']
    assert set(manifest['poses']) == set(POSES + ['wave', 'cheer'])
    reference, _ = source_frame(manifest, 'idle-0')
    b = bounds(reference)
    scale = manifest['standingHeight'] / (b[3] - b[1])
    frames, masks, report = {}, {}, {}
    for pose in POSES + ['wave', 'cheer']:
        src, spec = source_frame(manifest, pose)
        mask = clothing_mask(src, spec, manifest['mask']['mode'])
        frames[pose], masks[pose], report[pose] = place(src, mask, spec, scale)
    # Crop the portrait from the SAME identity source, instead of regenerating a face.
    src, spec = source_frame(manifest, 'idle-0')
    portrait_box = manifest['portraitBox']
    frames['portrait'] = src.crop(portrait_box).resize((320, 400), Image.Resampling.LANCZOS)
    masks['portrait'] = clothing_mask(src, spec, manifest['mask']['mode']).crop(portrait_box).resize((320, 400), Image.Resampling.LANCZOS)
    sheet = Image.new('RGBA', (FRAME * 3, FRAME * 4))
    sheetmask = Image.new('RGBA', sheet.size, (0, 0, 0, 255))
    for n, pose in enumerate(POSES):
        xy = (n % 3 * FRAME, n // 3 * FRAME)
        sheet.paste(frames[pose], xy)
        sheetmask.paste(masks[pose], xy)
    assets = {f'assets/doll_{key}_sprites.webp': sheet,
              f'assets/masks/{key}_sheet_mask.webp': sheetmask}
    for kind in ['portrait', 'wave', 'cheer', 'ride']:
        suffix = '' if kind == 'portrait' else '_' + kind
        assets[f'assets/portraits/{key}{suffix}.webp'] = frames[kind]
        assets[f'assets/masks/{key}_{kind}_mask.webp'] = masks[kind]
    for file, im in assets.items():
        save_webp(im, GAME / file)
    # Registry values follow directly from the source riding seat anchor.
    seat = report['ride']['anchor']
    runtime = {k: manifest[k] for k in ['name', 'color']}
    runtime.update(spriteKey=key, jumpScale=1,
                   riderXOffset=round((225 - 209) * 1.08 - 9 - (seat[0] - 209) * .7, 3),
                   riderYOffset=round(228.67 * 1.08 + 60 - seat[1] * .7, 3),
                   outfitData=manifest['outfitData'])
    for file in assets:
        validate_asset(GAME / file)
    report = {'key': key, 'standingHeight': manifest['standingHeight'],
              'baseline': BASELINE, 'frames': report, 'runtime': runtime,
              'sha256': {f: hashlib.sha256((GAME/f).read_bytes()).hexdigest() for f in assets}}
    (HERE / 'reports').mkdir(exist_ok=True)
    (HERE / 'reports' / f'{key}.json').write_text(json.dumps(report, indent=2) + '\n')
    review(manifest, frames, masks)
    return runtime


def validate_asset(path):
    im = Image.open(path)
    im.load()
    assert im.format == 'WEBP', path
    assert im.mode == ('RGB' if '_mask' in path.stem else 'RGBA'), path
    if '_mask' not in path.stem:
        assert im.getchannel('A').getextrema()[0] == 0, f'No transparency: {path}'
        assert im.getchannel('A').getextrema()[1] >= 250, f'No solid subject: {path}'


def review(manifest, frames, masks):
    # Same-size race cells, alternating backgrounds; baseline is a green guide.
    out = Image.new('RGB', (FRAME * 4, (FRAME + 24) * 4), '#eee8db')
    d = ImageDraw.Draw(out)
    order = POSES + ['wave', 'cheer', 'ride', 'portrait']
    for n, pose in enumerate(order):
        x, y = n % 4 * FRAME, n // 4 * (FRAME + 24)
        d.rectangle((x, y, x+FRAME-1, y+FRAME+23), fill='#344c5b' if n%2 else '#eee8db')
        d.text((x+6, y+5), pose, fill='#ffb24a')
        im = frames[pose]
        out.paste(im, (x, y+24), im)
        d.line((x, y+24+BASELINE, x+FRAME-1, y+24+BASELINE), fill='#31ad73')
    out.save(HERE / 'reports' / f"{manifest['key']}-poses.jpg", quality=90)
    # Source and mask side by side, for spotting any accidental face/hair tint.
    overlay = Image.new('RGB', (FRAME*4, FRAME*4), '#ddd')
    for n, pose in enumerate(order[:-1]):
        im = frames[pose].copy()
        red = masks[pose].getchannel('R')
        tint = Image.new('RGBA', im.size, '#ff33bb')
        tint.putalpha(red.point(lambda p: round(p*.55)))
        im = Image.alpha_composite(im, tint)
        overlay.paste(im, (n%4*FRAME,n//4*FRAME), im)
    overlay.save(HERE / 'reports' / f"{manifest['key']}-masks.jpg", quality=88)


def check(manifest):
    report = json.loads((HERE / 'reports' / f"{manifest['key']}.json").read_text())
    for file, sha in report['sha256'].items():
        validate_asset(GAME / file)
        assert hashlib.sha256((GAME/file).read_bytes()).hexdigest() == sha, file
    im = Image.open(GAME / f"assets/doll_{manifest['key']}_sprites.webp")
    assert im.size == (1254, 1672)
    im.close()
    for pose in POSES + ['wave', 'cheer']:
        frame = report['frames'][pose]
        x0,y0,x1,y1 = frame['bounds']
        assert x0 >= 5 and y0 >= 5 and x1 <= FRAME-5 and y1 <= FRAME-5, pose
        if pose not in ['ride']:
            assert abs(y1-BASELINE) <= 1, f'{pose}: foot baseline {y1}'
    print(f"{manifest['key']}: 12 race frames, portrait + wave/cheer/ride, 5 masks, hashes and alignment passed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifests = [json.loads(p.read_text()) for p in sorted((HERE/'manifests').glob('*.json')) if not p.name.startswith('._')]
    if args.check:
        for manifest in manifests:
            check(manifest)
    else:
        registry = {m['key']: build(m) for m in manifests}
        (GAME/'dolls.js').write_text('// Generated by tools/dolls/build.py; edit its manifests instead.\n'
                                    'window.EXTRA_DOLLS = '+json.dumps(registry,indent=2)+';\n')
        for manifest in manifests:
            check(manifest)


if __name__ == '__main__':
    main()
