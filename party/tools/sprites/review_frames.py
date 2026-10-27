"""Compare built frames at their actual size, with one shared ground baseline.

python3 party/tools/sprites/review_frames.py marina --poses idle water photo paint \
    --points --out /tmp/marina-review.png
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2] / 'assets' / 'sprites'
COLORS = {'head': '#ff4b4b', 'eyes': '#00d5ea', 'neck': '#ffff00',
          'hand': '#39ff37', 'back': '#ff9b26', 'anchor': '#ffffff'}


def review(asset, poses, output, points=False):
    folder = ROOT / asset
    manifest = json.loads((folder / 'sprites.json').read_text())
    frames = []
    for pose in poses:
        definition = manifest['poses'][pose]
        seen = set()
        while 'alias' in definition:
            alias = definition['alias']
            if alias in seen:
                raise ValueError(f'Alias cycle in {pose}')
            seen.add(alias)
            definition = manifest['poses'][alias]
        for i, frame in enumerate(definition['frames']):
            frames.append((f'{pose} {i}', frame, Image.open(folder / frame['src']).convert('RGBA')))
    left = max(max(f['anchor'][0], 0) for _, f, _ in frames) + 24
    right = max(max(im.width - f['anchor'][0], 0) for _, f, im in frames) + 24
    top = max(max(f['anchor'][1], 0) for _, f, _ in frames) + 36
    bottom = max(max(im.height - f['anchor'][1], 0) for _, f, im in frames) + 24
    width, height = int(left + right), int(top + bottom)
    cols = min(4, len(frames))
    image = Image.new('RGB', (width * cols, height * ((len(frames) + cols - 1) // cols)), '#bcc4d2')
    draw = ImageDraw.Draw(image)
    for n, (label, frame, pixels) in enumerate(frames):
        x, y = (n % cols) * width, (n // cols) * height
        ox, oy = int(x + left - frame['anchor'][0]), int(y + top - frame['anchor'][1])
        image.paste(pixels, (ox, oy), pixels)
        draw.text((x + 8, y + 8), label, fill='#182139')
        if points:
            for key, color in COLORS.items():
                if key not in frame:
                    continue
                px, py = frame[key][0] + ox, frame[key][1] + oy
                draw.ellipse((px - 3, py - 3, px + 3, py + 3), fill=color, outline='black')
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
    print(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('asset')
    parser.add_argument('--poses', nargs='+', default=['idle', 'walk', 'ride', 'carry', 'dance'])
    parser.add_argument('--points', action='store_true')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    review(args.asset, args.poses, args.out, args.points)
