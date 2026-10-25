"""Measure each doll's feet in every pose and write ../../feet.js.

With MOON BOOTS on, the game draws a boot over each foot (game-draw.js
drawMoonBoots). For every frame of a doll's sprites sheet and actions sheet
this finds her feet: the separate blobs in the bottom band of her figure.
Each foot is [x, y, width, angle, view, turn, cy, shin]: the sole's bottom centre
(frame pixels, facing right), how wide the foot is, the tilt of its sole in
the picture in radians (toe down positive), which way it faces us as a view
("side", "three" for three-quarter, or "front") and as degrees (90 side on,
0 toe towards us), from its shape, the foot's middle height (cy), and
which way her shin runs up from it (radians clockwise from up, or null). Frames
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
SKIP = {'sprites': set(), 'actions': {8}}  # the actions sheet's moon-boots jump has its own boots
# Riding and the tumble: her legs stick out sideways or up, so feet are looked
# for low down and in front of her.
LOOSE = {9, 11}
LOOSE_ZONE = 0.55
LOOSE_ACTIONS = {6}  # pushing from the saddle: sitting, feet out in front
# In the air (sprites row 3, middle) her feet are tucked low: anything
# higher (a purse she swings, a dress fringe) isn't one.
JUMP = {7}
JUMP_ZONE = 0.72
# A foot is at least this share of her height along the figure from her hips,
# and further along it than anything within END_WINDOW of her height. (Less
# of either takes knees and dress fringes for feet; EXTRA_FEET covers the
# odd foot that tucks in against her other leg.)
MIN_LEG = 0.25
END_WINDOW = 0.12

# The shin, for the boot's angle (shin_angle): the leg's middle this far
# along it from the foot's end (shares of her height), the lower band just
# above the shoe and the upper one near the knee; points up to SHIN_PATH off
# the shortest way from her hips count as on the way.
SHIN_BANDS = [(0.09, 0.13), (0.17, 0.23)]
SHIN_PATH = 0.03

# Feet measured by hand where the figure can't show them: a foot touching
# her other leg, so it's no leg end of its own (key, sheet, frame).
EXTRA_FEET = {
    ('barbie', 'sprites', 4): [170, 342, 48, 0.3, 'three', 50, 320, None],  # back foot kicked up against her shin
}


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


def shin_angle(dist, from_tip, tip_reach, height):
    """Which way her shin runs from the ankle up to the knee, in radians
    clockwise from straight up (so a boot turned by it lines up with her
    leg): from the middle of the leg just above the shoe to the middle of
    it further up, along the way from her hips to this foot (not the other
    leg). None where the leg is too short or hidden to tell."""
    on_leg = np.isfinite(from_tip) & (dist + from_tip <= tip_reach + SHIN_PATH * height)
    points = []
    for near, far in SHIN_BANDS:
        ys, xs = np.nonzero(on_leg & (from_tip >= near * height) & (from_tip < far * height))
        if len(xs) < 4:
            return None
        points.append((xs.mean(), ys.mean()))
    (x0, y0), (x1, y1) = points
    return round(float(np.arctan2(x1 - x0, y0 - y1)), 3)


def legs(cell, forward=False):
    """Her figure at half size (plenty, and much quicker) and her legs: what
    lies below her hips joined to them, with the distance along it from her
    hips. None for an empty or broken frame."""
    rgba = np.asarray(cell.convert('RGBA'))[::2, ::2].astype(float)
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
    # (Sitting or tumbling, her seat is back from her middle.)
    seat_x = np.percentile(xs, 35) if forward else np.median(xs)
    hip = (hip_y, int(row[np.argmin(np.abs(row - seat_x))]))
    below = a.copy()
    below[:int(top + 0.4 * height)] = False  # no arms or hair above the hips
    labels, _ = ndimage.label(below)
    below &= labels == labels[hip]
    return dict(rgba=rgba, a=a, xs=xs, top=top, bottom=bottom, height=height, seat_x=seat_x, below=below, dist=geodesic(below, hip))


def feet(cell, zone=None, forward=False):
    """Her feet: the two far ends of her legs, measured along the figure from
    her hips, so a foot lifted mid-stride counts as well as one on the ground."""
    found = legs(cell, forward)
    if found is None:
        return None
    rgba, a, xs, top, bottom, height, seat_x, below, dist = (found[k] for k in ('rgba', 'a', 'xs', 'top', 'bottom', 'height', 'seat_x', 'below', 'dist'))
    finite = np.isfinite(dist)
    out = []
    shoe = max(8, 0.075 * height)  # half-size px of a shoe's length
    # Feet are low down (a foot lifted mid-stride reaches up to FOOT_ZONE).
    low = np.indices(a.shape)[0] > top + (zone or FOOT_ZONE) * height
    if forward:  # sitting or tumbling, her feet stick out in front (right)
        low &= np.indices(a.shape)[1] > np.percentile(xs, 55)
    # Leg ends: points further along the figure than anything round them.
    reach = np.where(finite, dist, -1)
    ends = (reach >= ndimage.maximum_filter(reach, size=max(5, int(END_WINDOW * height)))) & finite & low & (reach > MIN_LEG * height)
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
        from_tip = geodesic(below, tip)
        if not tips:
            from_first = from_tip
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
        out.append([int(round(cx * 2)), int(round(fy.max() * 2)), int(round(max(length, across) * 2)), round(angle, 3), view, turn, int(round(cy * 2)),
                    shin_angle(dist, from_tip, reach[tip], height)])
    if forward and len(out) < 2:
        # Sitting, her feet are also simply her lowest points: the separate
        # shapes along her bottom edge, in front of her seat.
        band = a & (np.indices(a.shape)[0] > bottom - 0.13 * height) & (np.indices(a.shape)[1] > seat_x)
        labels, count = ndimage.label(band)
        blobs = []
        for n in range(1, count + 1):
            by, bx = np.nonzero(labels == n)
            # Feet side by side make one wide shape: split it down the middle.
            if np.ptp(bx) > 0.22 * height:
                mid = (bx.min() + bx.max()) / 2
                blobs += [(by[bx < mid], bx[bx < mid]), (by[bx >= mid], bx[bx >= mid])]
            else:
                blobs.append((by, bx))
        for by, bx in sorted(blobs, key=lambda b: -len(b[0])):
            if len(out) == 2 or len(bx) < 20:
                break
            cx, cy = bx.mean(), by.mean()
            if any(abs(cx * 2 - f[0]) < 0.12 * height * 2 for f in out):
                continue
            width = (np.ptp(bx) + 1) * 2
            out.append([int(round(cx * 2)), int(by.max() * 2), int(width), 0.0, 'side', 80, int(round(cy * 2)), None])
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
        zone = CROUCH_ZONE if kind == 'sprites' and i in CROUCHES else JUMP_ZONE if kind == 'sprites' and i in JUMP else None
        loose = i in (LOOSE if kind == 'sprites' else LOOSE_ACTIONS)
        frames.append(None if i in SKIP[kind] else feet(cell, LOOSE_ZONE if loose else zone, loose))
    return frames


def with_extra_feet(key, kind, frames):
    for i, frame in enumerate(frames or []):
        extra = EXTRA_FEET.get((key, kind, i))
        if extra and frame is not None and len(frame) < 2:
            frames[i] = sorted(frame + [extra])
    return frames


def asset_keys():
    keys = ['whirlpool', 'juliette', 'claudia', 'kaya', 'lily', 'marisol', 'amanda', 'penelope', 'rumi']
    dolls = json.loads(re.search(r'window\.EXTRA_DOLLS = (\{.*?\n\});', (GAME / 'dolls.js').read_text(), re.S).group(1))
    keys += [d.get('assetKey', k) for k, d in dolls.items()]
    return sorted(set(keys))


if __name__ == '__main__':
    out = {}
    for key in asset_keys():
        entry = {kind: with_extra_feet(key, kind, sheet_feet(GAME / f'assets/doll_{key}_{kind}.webp', kind)) for kind in ('sprites', 'actions')}
        manifest = GAME / f'tools/dolls/manifests/{key}.json'
        if manifest.exists():
            # A board or other attached prop is not a foot. Explicit source
            # measurements preserve these exceptional poses on every rebuild.
            for kind, frames in json.loads(manifest.read_text()).get('footAnchorsFrame', {}).items():
                for index, anchors in frames.items():
                    assert kind in entry and 0 <= int(index) < len(entry[kind])
                    entry[kind][int(index)] = anchors
        if entry['sprites']:
            out[key] = entry
    (GAME / 'feet.js').write_text(
        '// Generated by tools/dolls/measure_feet.py: each doll\'s feet per frame\n'
        '// ([x, y, width, angle, view, turn, cy, shin], frame pixels facing right), where the game\n'
        '// draws moon boots.\n'
        'window.DOLL_FEET = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    print(len(out), 'dolls')
