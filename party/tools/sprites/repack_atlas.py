#!/usr/bin/env python3
"""Repack a generated sprite sheet into a clean, even grid.

Generated sheets ("8 columns x 6 rows, one item per cell") rarely come back on an
exact grid: rows drift, so cutting them into equal cells clips the items that
straddle a line (the bead shop's moons and flowers). This finds every item by
its alpha (connected opaque pixels), orders them into the requested rows and
columns by position, and redraws each one centred in its own cell with a clear
margin, all at one common scale (so relative sizes are kept).

    python3 party/tools/sprites/repack_atlas.py party/assets/art/prop/bead-atlas-v2.webp --cols 8 --rows 6
    (--out PATH to write elsewhere; --margin 0.08 = 8% of a cell kept clear each side)

It refuses to write when it doesn't find exactly cols x rows items.
"""
import argparse
import sys

import numpy as np
from PIL import Image


def components(alpha, thresh=24, min_px=40):
    """Connected opaque regions (8-connected) as (y0, x0, y1, x1, count); small specks are dropped."""
    h, w = alpha.shape
    on = alpha > thresh
    seen = np.zeros_like(on)
    out = []
    for y in range(h):
        row = on[y]
        for x in np.flatnonzero(row & ~seen[y]):
            if seen[y, x]:
                continue
            stack = [(y, x)]
            seen[y, x] = True
            y0 = y1 = y; x0 = x1 = x; n = 0
            while stack:
                cy, cx = stack.pop(); n += 1
                if cy < y0: y0 = cy
                if cy > y1: y1 = cy
                if cx < x0: x0 = cx
                if cx > x1: x1 = cx
                for dy in (-1, 0, 1):
                    ny = cy + dy
                    if ny < 0 or ny >= h:
                        continue
                    for dx in (-1, 0, 1):
                        nx = cx + dx
                        if 0 <= nx < w and on[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            if n >= min_px:
                out.append((y0, x0, y1 + 1, x1 + 1, n))
    return out


def merge_overlapping(boxes):
    """Merge boxes whose bounds overlap (a highlight or hole edge split off its item)."""
    boxes = [list(b) for b in boxes]
    changed = True
    while changed:
        changed = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                    boxes[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]), a[4] + b[4]]
                    del boxes[j]
                    changed = True
                    break
            if changed:
                break
    return [tuple(b) for b in boxes]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('path')
    ap.add_argument('--cols', type=int, required=True)
    ap.add_argument('--rows', type=int, required=True)
    ap.add_argument('--out')
    ap.add_argument('--margin', type=float, default=0.08)
    a = ap.parse_args()

    im = Image.open(a.path).convert('RGBA')
    W, H = im.size
    boxes = merge_overlapping(components(np.array(im)[:, :, 3]))
    want = a.cols * a.rows
    if len(boxes) != want:
        sys.exit(f'found {len(boxes)} items, expected {want}: not writing')
    # rows: sort by centre y and take them `cols` at a time; then left to right
    boxes.sort(key=lambda b: (b[0] + b[2]) / 2)
    grid = [sorted(boxes[r * a.cols:(r + 1) * a.cols], key=lambda b: (b[1] + b[3]) / 2) for r in range(a.rows)]
    cw, ch = W / a.cols, H / a.rows
    biggest = max(max(b[2] - b[0], b[3] - b[1]) for b in boxes)
    room = min(cw, ch) * (1 - 2 * a.margin)
    s = min(1.0, room / biggest)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for r, row in enumerate(grid):
        for c, (y0, x0, y1, x1, _) in enumerate(row):
            piece = im.crop((x0, y0, x1, y1))
            if s < 1:
                piece = piece.resize((max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s))), Image.LANCZOS)
            px = round(c * cw + (cw - piece.width) / 2)
            py = round(r * ch + (ch - piece.height) / 2)
            out.alpha_composite(piece, (px, py))
    dst = a.out or a.path
    out.save(dst, 'WEBP', lossless=True, method=6)
    print(f'repacked {want} items into {a.cols}x{a.rows} cells of {cw:.0f}x{ch:.0f} (scale {s:.3f}) -> {dst}')


if __name__ == '__main__':
    main()
