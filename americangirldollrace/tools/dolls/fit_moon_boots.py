"""Fit the game's moon boot guesses over each pose's shoes and write
../../moon-boot-guesses.js.

The owner's rules for a moon boot (the workbench's verification queue):
line it up with the shin, and cover the whole foot and shoe, so nothing of
her own shoes or boots shows round it, with as small a boot as does that.
The game guesses each boot from the measured feet, the rules and the owner's
look-alike poses (game-draw.js moonBootPlacements, run here through
moon_boot_guesses.mjs); this draws each guessed boot over the pose's pixels
and moves, sizes and turns it a little until it covers her foot: the leg
within FIT_REACH of the foot's middle, along her figure. Turning stays
within FIT_TURN of the guess (the shin), and the boot as narrow as covers.

Run after taking in hand-placed boots, or after measure_feet.py:
    python3 tools/dolls/fit_moon_boots.py           writes moon-boot-guesses.js
    python3 tools/dolls/fit_moon_boots.py --check   how close fitted guesses come
                                                    to the owner's own boots
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import signal
from measure_feet import legs, geodesic, LOOSE, LOOSE_ACTIONS

GAME = Path(__file__).resolve().parents[2]
F = 418
CELL = 256
# game.js and game-draw.js: each boot view's width in its cell, and the
# height above the sole (cell px) that sits on the foot's middle.
CELL_WIDTHS = [150, 130, 110, 150, 92, 120, 150]
FOOT_MID = 34
SOLE = 244

FIT_REACH = 0.13   # her foot: the leg this far (share of her height) round the figure from its middle
FIT_COVER = 0.985  # share of it a boot must cover (anti-aliased edges aside)
FIT_MOVE = 14      # half-size px the boot may move from the guess
FIT_TURN = [-0.1, -0.05, 0, 0.05, 0.1]  # radians it may turn from the guess
FIT_WIDTHS = np.arange(1, 1.61, 0.05)  # times the guessed width (never narrower: the guessed widths are the owner's)


def game_constants():
    source = (GAME / 'game.js').read_text() + (GAME / 'game-draw.js').read_text()
    widths = json.loads(re.search(r'const MOON_BOOT_CELL_WIDTHS = (\[[^\]]*\])', source).group(1))
    mid = int(re.search(r'const MOON_BOOT_FOOT_MID = (\d+)', source).group(1))
    return widths, mid


def boot_mask(sheet, cell, width, angle, mirror, size):
    """The boot's solid pixels at half size, its foot's middle at the centre
    of a size x size square, drawn as game-draw.js drawMoonBootsOn draws it."""
    k = width / 2 / CELL_WIDTHS[cell]
    c = size // 2
    s = -1 if mirror else 1
    cos, sin = np.cos(angle), np.sin(angle)
    a, b = s * cos / k, s * sin / k
    d, e = -sin / k, cos / k
    art = sheet.crop((cell * CELL, 0, (cell + 1) * CELL, CELL)).getchannel('A')
    data = (a, b, CELL / 2 - (a + b) * c, d, e, SOLE - FOOT_MID - (d + e) * c)
    return np.asarray(art.transform((size, size), Image.AFFINE, data, Image.BILINEAR)) > 100


def foot_targets(cell_image, boots, forward):
    """For each boot, the pixels of the foot it's on: her leg within
    FIT_REACH of the nearest point of it, nearer this boot's foot than any
    other boot's (half size)."""
    found = legs(cell_image, forward)
    if found is None:
        return None
    below, height = found['below'], found['height']
    solid = found['rgba'][..., 3] > 200
    ys, xs = np.nonzero(below)
    if not len(xs):
        return None
    rings = []
    for boot in boots:
        n = np.argmin((xs - boot['x'] / 2) ** 2 + (ys - boot['y'] / 2) ** 2)
        rings.append(geodesic(below, (ys[n], xs[n])))
    nearest = np.argmin(np.stack(rings), axis=0)
    return [solid & below & (ring <= FIT_REACH * height) & (nearest == i) for i, ring in enumerate(rings)]


def fit(sheet, target, boot):
    """The boot moved, sized and turned to cover target, the smallest that
    does (or that covers most), and how much it covers."""
    total = target.sum()
    if total == 0:
        return dict(boot), 1.0
    bx, by = boot['x'] / 2, boot['y'] / 2
    best = None
    size = 161
    yy, xx = np.mgrid[0:target.shape[0], 0:target.shape[1]]
    near = (yy - by) ** 2 + (xx - bx) ** 2 <= FIT_MOVE ** 2
    for turn in FIT_TURN:
        for grow in FIT_WIDTHS:
            mask = boot_mask(sheet, boot['cell'], boot['width'] * grow, boot['angle'] + turn, boot['mirror'], size).astype(float)
            cover = signal.correlate(target.astype(float), mask, mode='same', method='fft') / total
            cover = np.where(near, cover, -1)
            i, j = np.unravel_index(np.argmax(cover), cover.shape)
            share = cover[i, j]
            moved = np.hypot(j - bx, i - by) * 2
            # Covered: the smallest boot, then the least moved and turned;
            # otherwise whichever covers most.
            key = (0, grow + moved * 0.004 + abs(turn) * 0.8) if share >= FIT_COVER else (1, -share)
            if best is None or key < best[0]:
                best = (key, dict(boot, x=round(float(j * 2), 1), y=round(float(i * 2), 1), width=round(float(boot['width'] * grow), 1),
                                  angle=round(float(boot['angle'] + turn), 3)), float(share))
    return best[1], best[2]


def coverage(sheet, target, boot):
    total = target.sum()
    if total == 0:
        return 1.0
    size = 161
    mask = boot_mask(sheet, boot['cell'], boot['width'], boot['angle'], boot['mirror'], size)
    c = size // 2
    y, x = int(round(boot['y'] / 2)), int(round(boot['x'] / 2))
    h, w = target.shape
    canvas = np.zeros((h + 2 * size, w + 2 * size), bool)
    canvas[y - c + size:y - c + 2 * size, x - c + size:x - c + 2 * size] = mask
    return float((target & canvas[size:size + h, size:size + w]).sum() / total)


def guesses(check):
    out = subprocess.run(['node', str(GAME / 'tools/dolls/moon_boot_guesses.mjs')] + (['--check'] if check else []),
                         check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def pose_image(key, kind, index):
    sheet = Image.open(GAME / f'assets/doll_{key}_{kind}.webp')
    cols = sheet.width // F
    r, c = divmod(index, cols)
    return sheet.crop((c * F, r * F, (c + 1) * F, (r + 1) * F))


def fit_all(raw):
    sheet = Image.open(GAME / 'assets/moon_boot_sprites.webp').convert('RGBA')
    fitted, shares = {}, []
    for pose, boots in raw.items():
        key, kind, index = pose.split('/')
        index = int(index)
        forward = index in (LOOSE if kind == 'sprites' else LOOSE_ACTIONS)
        targets = foot_targets(pose_image(key, kind, index), boots, forward)
        if not boots or targets is None:
            continue
        fitted[pose] = []
        for boot, target in zip(boots, targets):
            boot = {k: boot[k] for k in ('cell', 'x', 'y', 'angle', 'width', 'mirror')}
            better, share = fit(sheet, target, boot)
            fitted[pose].append(better)
            shares.append(share)
    return fitted, shares


def check():
    """The owner's poses, each guessed with that doll's boots left out, as
    guessed and as fitted, against the boots the owner placed."""
    owner = json.loads(re.search(r'window.MOON_BOOT_OVERRIDES = (\{.*?\n\});', (GAME / 'moon-boot-overrides.js').read_text(), re.S).group(1))
    raw = guesses(True)
    fitted, _ = fit_all(raw)
    sheet = Image.open(GAME / 'assets/moon_boot_sprites.webp').convert('RGBA')
    owner_cover = []
    for pose in raw:
        key, kind, index = pose.split('/')
        index = int(index)
        forward = index in (LOOSE if kind == 'sprites' else LOOSE_ACTIONS)
        targets = foot_targets(pose_image(key, kind, index), owner[pose], forward) or []
        owner_cover += [coverage(sheet, t, b) for t, b in zip(targets, owner[pose])]
    print(f'owner boots cover their feet: median {np.median(owner_cover):.3f}, lowest {min(owner_cover):.3f}')
    for name, got in (('guessed', raw), ('fitted', fitted)):
        angle, place, width = [], [], []
        for pose, truth in owner.items():
            if pose not in got:
                continue
            free = list(got[pose])
            for t in truth:
                if not free:
                    break
                p = min(free, key=lambda b: np.hypot(b['x'] - t['x'], b['y'] - t['y']))
                free.remove(p)
                angle.append(abs(p['angle'] - t['angle']))
                place.append(np.hypot(p['x'] - t['x'], p['y'] - t['y']))
                width.append(abs(p['width'] - t['width']))
        print(f'{name}: angle median {np.median(angle):.3f} mean {np.mean(angle):.3f} | place median {np.median(place):.1f} mean {np.mean(place):.1f}'
              f' | width median {np.median(width):.1f} mean {np.mean(width):.1f}')


if __name__ == '__main__':
    CELL_WIDTHS, FOOT_MID = game_constants()
    if '--check' in sys.argv:
        check()
        sys.exit()
    fitted, shares = fit_all(guesses(False))
    (GAME / 'moon-boot-guesses.js').write_text(
        '// Generated by tools/dolls/fit_moon_boots.py: the game\'s moon boot guesses for\n'
        '// every pose the owner hasn\'t placed by hand, each fitted to cover her foot\n'
        '// ("<asset key>/<sprites|actions>/<frame>" -> boots, as in moon-boot-overrides.js).\n'
        'window.MOON_BOOT_GUESSES = {\n' + ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k, v in sorted(fitted.items())) + '\n};\n')
    print(f'{len(fitted)} poses; feet covered: median {np.median(shares):.3f}, {sum(s >= FIT_COVER for s in shares)} of {len(shares)} fully')
