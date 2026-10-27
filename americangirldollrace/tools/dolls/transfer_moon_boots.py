"""Carry the owner's hand-placed moon boots over to another doll's pose.

Every doll is drawn in the same poses (the sheets' frames), so the boots the
owner placed on one doll's pose are anchors for that pose on any other: the
patch of her figure round each boot (her shin and foot) is looked for in the
new doll's frame, turned and sized a little to fit how her leg is drawn
there, and the boot goes where it matches, turned and sized with it. The
dolls whose legs match best are averaged. fit_moon_boots.py then fits the
result to cover her shoe.
"""
import json, re
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import signal

GAME = Path(__file__).resolve().parents[2]
F = 418
PATCH = 34                     # half-size px either side of the boot: her foot and shin
SEARCH = 30                    # half-size px the match may move from where the boot sat on the other doll
TURNS = np.arange(-0.3, 0.31, 0.075)  # radians her leg may be turned against the other doll's
SIZES = [0.92, 1, 1.08]        # and its size, on top of the two dolls' heights
BEST = 5                       # the best-matching dolls averaged
GOOD = 0.6                     # a match at least this good (normalised correlation) counts
ASTRAY = 24                    # frame px from the middle of the matches beyond which one has gone astray


def owner_boots():
    text = (GAME / 'moon-boot-overrides.js').read_text()
    owner = json.loads(re.search(r'window.MOON_BOOT_OVERRIDES = (\{.*?\n\});', text, re.S).group(1))
    skip = re.search(r'window.MOON_BOOT_NOT_LESSONS = (\[.*?\]);', text, re.S)
    for pose in json.loads(skip.group(1)) if skip else []:
        owner.pop(pose, None)
    return owner


_frames = {}
def frame(key, kind, index):
    """Her figure (alpha, half size, 0-1) in that frame, or None."""
    name = (key, kind, index)
    if name not in _frames:
        path = GAME / f'assets/doll_{key}_{kind}.webp'
        if not path.exists():
            _frames[name] = None
        else:
            sheet = Image.open(path)
            cols, rows = sheet.width // F, sheet.height // F
            if index >= cols * rows:
                _frames[name] = None
            else:
                r, c = divmod(index, cols)
                cell = sheet.crop((c * F, r * F, (c + 1) * F, (r + 1) * F)).getchannel('A')
                _frames[name] = np.asarray(cell.resize((F // 2, F // 2), Image.BILINEAR), float) / 255
    return _frames[name]


_heights = {}
def height(key):
    """Her height standing (sprites frame 0), half-size px: dolls are drawn at different sizes."""
    if key not in _heights:
        a = frame(key, 'sprites', 0)
        ys = np.nonzero(a.max(1) > 0.25)[0] if a is not None else []
        _heights[key] = (ys[-1] - ys[0]) if len(ys) else None
    return _heights[key]


def match(ref, boot, target, scale):
    """Where the patch of ref round boot best matches in target: (score, x, y, turn, size), half size px."""
    bx, by = boot['x'] / 2, boot['y'] / 2
    size = 2 * PATCH + 1
    patch = Image.fromarray((ref * 255).astype(np.uint8)).crop((int(bx) - PATCH, int(by) - PATCH, int(bx) + PATCH + 1, int(by) + PATCH + 1))
    # Where to look: the same spot on her, scaled about the frame's foot of the figure (bottom middle).
    ex, ey = F / 4 + (bx - F / 4) * scale, F / 2 - (F / 2 - by) * scale
    x0, y0 = int(ex) - SEARCH - PATCH, int(ey) - SEARCH - PATCH
    window = np.zeros((2 * (SEARCH + PATCH) + 1,) * 2)
    h, w = target.shape
    ys, xs = slice(max(0, y0), min(h, y0 + window.shape[0])), slice(max(0, x0), min(w, x0 + window.shape[1]))
    window[ys.start - y0:ys.stop - y0, xs.start - x0:xs.stop - x0] = target[ys, xs]
    best = None
    for turn in TURNS:
        for grow in SIZES:
            k = scale * grow
            # (PIL turns anticlockwise; a boot's angle is clockwise.)
            p = patch.rotate(-np.degrees(turn), Image.BILINEAR).resize((max(9, int(size * k)),) * 2, Image.BILINEAR)
            p = np.asarray(p, float) / 255
            p -= p.mean()
            norm = np.sqrt((p ** 2).sum())
            if norm < 1e-6:
                continue
            ones = np.ones_like(p)
            num = signal.correlate(window, p, mode='valid', method='fft')
            local = signal.correlate(window ** 2, ones, mode='valid', method='fft') - signal.correlate(window, ones, mode='valid', method='fft') ** 2 / p.size
            score = num / (norm * np.sqrt(np.maximum(local, 1e-6)))
            i, j = np.unravel_index(np.argmax(score), score.shape)
            if best is None or score[i, j] > best[0]:
                half = p.shape[0] / 2
                best = (float(score[i, j]), x0 + j + half, y0 + i + half, float(turn), k)
    return best


def transfer(key, kind, index, owner, leave_out=None):
    """Boots for this doll's pose from the owner's on the same pose of other
    dolls (not leave_out), or None when no doll's legs match well enough."""
    target = frame(key, kind, index)
    if target is None or height(key) is None:
        return None
    found = []
    for pose, boots in owner.items():
        doll, sheet, n = pose.split('/')
        if doll in (key, leave_out) or sheet != kind or int(n) != index:
            continue
        ref = frame(doll, sheet, index)
        if ref is None or height(doll) is None:
            continue
        scale = height(key) / height(doll)
        moved = []
        for boot in boots:
            m = match(ref, boot, target, scale)
            if m is None:
                break
            score, x, y, turn, k = m
            moved.append(dict(boot, x=x * 2, y=y * 2, angle=boot['angle'] + turn, width=boot['width'] * k, score=score))
        if len(moved) == len(boots):
            found.append((np.mean([b['score'] for b in moved]), moved))
    found = [f for f in sorted(found, key=lambda f: -f[0]) if f[0] >= GOOD][:BEST]
    if not found:
        return None
    # Line each doll's boots up with the best match's, then average them.
    lead = found[0][1]
    out = []
    for n, anchor in enumerate(lead):
        # (Then again round the middle of them all, leaving out any that
        # landed well away from it: a match gone astray.)
        centre = (anchor['x'], anchor['y'])
        for _ in range(2):
            group = []
            for score, boots in found:
                if len(boots) != len(lead):
                    continue
                boot = min(boots, key=lambda b: np.hypot(b['x'] - centre[0], b['y'] - centre[1]))
                group.append((score, boot))
            centre = (np.median([b['x'] for _, b in group]), np.median([b['y'] for _, b in group]))
        group = [(s, b) for s, b in group if np.hypot(b['x'] - centre[0], b['y'] - centre[1]) <= ASTRAY] or group
        weights = np.array([s for s, _ in group])
        views = {}
        for s, b in group:
            views[(b['cell'], b['mirror'])] = views.get((b['cell'], b['mirror']), 0) + s
        cell, mirror = max(views, key=views.get)
        mean = lambda field: float(np.average([b[field] for _, b in group], weights=weights))
        boot = dict(cell=cell, x=round(mean('x'), 1), y=round(mean('y'), 1), angle=round(mean('angle'), 3), width=round(mean('width'), 1), mirror=mirror)
        if sum(s for s, b in group if b.get('layer')) > weights.sum() / 2:
            boot['layer'] = 1
        out.append(boot)
    return out
