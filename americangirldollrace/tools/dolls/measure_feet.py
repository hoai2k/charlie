"""Measure each doll's feet in every pose and write ../../feet.js.

With MOON BOOTS on, the game draws a boot over each foot (game-draw.js
drawMoonBoots). For every frame of a doll's sprites sheet and actions sheet
this finds her feet: the separate blobs in the bottom band of her figure.
Each foot is [x, y, width, angle, view, turn]: the sole's bottom centre
(frame pixels, facing right), how wide the foot is, the tilt of its sole in
the picture in radians (toe down positive), which way it faces us as a view
("side", "three" for three-quarter, or "front") and as degrees (90 side on,
0 toe towards us), from its shape. Frames
with no clear feet (riding, the tumble, the actions sheet's own moon-boots
jump) are null.

Run after adding a doll or redrawing poses:  python3 tools/dolls/measure_feet.py
"""
import json, re
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage, sparse
from scipy.sparse import csgraph

GAME = Path(__file__).resolve().parents[2]
F = 418
FOOT_ZONE = 0.55  # feet are below this share of her height
SOLID_FOOT = 0.7  # share of solid pixels round a leg's end for it to be a foot, not hair
# Crouching to jump and landing (sprites row 3, first and last): both feet
# are planted, so they're only looked for along the bottom.
CROUCHES = {6, 8}
CROUCH_ZONE = 0.84
SKIP = {'sprites': {9, 11}, 'actions': {8}}  # ride, tumble; the moon-boots jump


def geodesic(mask, seed):
    """Distance along the figure from seed to every pixel of mask (8-way)."""
    h, w = mask.shape
    index = -np.ones(mask.shape, int)
    ys, xs = np.nonzero(mask)
    index[ys, xs] = np.arange(len(xs))
    rows, cols, weights = [], [], []
    for dy, dx, cost in [(0, 1, 1), (1, 0, 1), (1, 1, 1.414), (1, -1, 1.414)]:
        y2, x2 = ys + dy, xs + dx
        ok = (y2 >= 0) & (y2 < h) & (x2 >= 0) & (x2 < w)
        ok[ok] &= mask[y2[ok], x2[ok]]
        rows += list(index[ys[ok], xs[ok]]); cols += list(index[y2[ok], x2[ok]]); weights += [cost] * int(ok.sum())
    graph = sparse.coo_matrix((weights, (rows, cols)), shape=(len(xs), len(xs))).tocsr()
    dist = csgraph.dijkstra(graph, directed=False, indices=index[seed])
    out = np.full(mask.shape, np.inf)
    out[ys, xs] = dist
    return out


def feet(cell, zone=None):
    """Her feet: the two far ends of her legs, measured along the figure from
    her hips, so a foot lifted mid-stride counts as well as one on the ground."""
    rgba = np.asarray(cell.convert('RGBA'))[::2, ::2].astype(float)  # half size is plenty and much quicker
    a = rgba[..., 3] > 60
    ys, xs = np.nonzero(a)
    if len(xs) == 0:
        return None
    top, bottom = ys.min(), ys.max()
    height = bottom - top
    # The hips: the figure's middle, a little over half way down.
    hip_y = int(top + 0.55 * height)
    row = np.nonzero(a[hip_y])[0]
    if len(row) == 0:
        return None
    hip = (hip_y, int(row[np.argmin(np.abs(row - np.median(xs)))]))
    below = a.copy()
    below[:int(top + 0.4 * height)] = False  # no arms or hair above the hips
    labels, _ = ndimage.label(below)
    below &= labels == labels[hip]
    dist = geodesic(below, hip)
    finite = np.isfinite(dist)
    out = []
    shoe = max(8, 0.075 * height)  # half-size px of a shoe's length
    # Feet are low down (a foot lifted mid-stride reaches up to FOOT_ZONE).
    low = np.indices(a.shape)[0] > top + (zone or FOOT_ZONE) * height
    # Leg ends: points further along the figure than anything round them.
    reach = np.where(finite, dist, -1)
    ends = (reach >= ndimage.maximum_filter(reach, size=max(5, int(0.12 * height)))) & finite & low & (reach > 0.25 * height)
    tips = []
    for tip in sorted(zip(*np.nonzero(ends)), key=lambda t: -reach[t]):
        if len(tips) == 2:
            break
        # The other foot is far round the figure from the first (up one leg
        # and down the other), unlike the heel and toe of the same foot.
        if tips and from_first[tip] < 0.35 * height:
            continue
        near_tip = np.hypot(*(np.indices(a.shape) - np.array(tip)[:, None, None]))
        # Hair ends are wispy (soft, see-through edges); shoes are solid.
        around = rgba[..., 3][near_tip < 7]
        if (around[around > 20] > 240).mean() < SOLID_FOOT:
            continue
        # The foot: what lies within a shoe's length of the tip, along the leg.
        near = finite & (dist >= reach[tip] - shoe) & (near_tip < shoe * 1.6)
        fy, fx = np.nonzero(near)
        if len(fx) < 6:
            continue
        if not tips:
            from_first = geodesic(below, tip)
        tips.append(tip)
        # Its main axis (pointing right) and size.
        cx, cy = fx.mean(), fy.mean()
        cov = np.cov(np.vstack([fx - cx, fy - cy]))
        vals, vecs = np.linalg.eigh(cov)
        major = vecs[:, 1] if vecs[0, 1] >= 0 else -vecs[:, 1]
        angle = float(np.clip(np.arctan2(major[1], major[0]), -1.0, 1.0))
        length = 4 * np.sqrt(max(vals[1], 1e-6))
        across = 4 * np.sqrt(max(vals[0], 1e-6))
        # Which way the foot faces us: a long, thin foot is seen from the side
        # (90 degrees), a short, round one from the front (0).
        ratio = length / max(across, 1e-6)
        turn = int(round(float(np.clip((ratio - 1) / 1.2, 0, 1)) * 90))
        view = 'side' if turn > 60 else 'three' if turn > 20 else 'front'
        # Frame px: where the sole sits (the bottom of the foot), and its size.
        out.append([int(round(cx * 2)), int(round(fy.max() * 2)), int(round(max(length, across) * 2)), round(angle, 3), view, turn])
    return sorted(out) or None


def sheet_feet(path, kind):
    if not path.exists():
        return None
    sheet = Image.open(path)
    rows, cols = sheet.height // F, sheet.width // F
    frames = []
    for i in range(rows * cols):
        r, c = divmod(i, cols)
        cell = sheet.crop((c * F, r * F, (c + 1) * F, (r + 1) * F))
        frames.append(None if i in SKIP[kind] else feet(cell, CROUCH_ZONE if kind == 'sprites' and i in CROUCHES else None))
    return frames


def asset_keys():
    keys = ['whirlpool', 'juliette', 'claudia', 'kaya', 'lily', 'marisol', 'amanda', 'penelope', 'rumi']
    dolls = json.loads(re.search(r'window\.EXTRA_DOLLS = (\{.*?\n\});', (GAME / 'dolls.js').read_text(), re.S).group(1))
    keys += [d.get('assetKey', k) for k, d in dolls.items()]
    return sorted(set(keys))


if __name__ == '__main__':
    out = {}
    for key in asset_keys():
        entry = {'sprites': sheet_feet(GAME / f'assets/doll_{key}_sprites.webp', 'sprites'),
                 'actions': sheet_feet(GAME / f'assets/doll_{key}_actions.webp', 'actions')}
        if entry['sprites']:
            out[key] = entry
    (GAME / 'feet.js').write_text(
        '// Generated by tools/dolls/measure_feet.py: each doll\'s feet per frame\n'
        '// ([x, y, width, angle, view, turn], frame pixels facing right), where the game\n'
        '// draws moon boots.\n'
        'window.DOLL_FEET = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    print(len(out), 'dolls')
