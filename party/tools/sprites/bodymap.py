#!/usr/bin/env python3
"""Body map: measure extra body-part points on every built sprite frame.

    python3 party/tools/sprites/bodymap.py              # every indexed set
    python3 party/tools/sprites/bodymap.py fox unicorn  # some sets
    python3 party/tools/sprites/bodymap.py --check      # exit 1 if any manifest is out of date

The intake landmarks (`anchor` `head` `eyes` `neck` `back` `hand`) are
authored or audited by hand. This tool adds the rest of the body map so
attachments (bows, stickers, dress-up items) can stick to the nearest body
part and ride every pose (src/engine/sprites.js `nearestPart` / `attachTo`):

    belly      middle of the torso (the cake's middle, a mermaid's waist)
    footFront  the forward foot / front paws on the ground (lowest body part)
    footBack   the back foot / hind paws (same as footFront when only one shows)
    earFront   ears, for characters with visible ears (front = the ear further
    earBack    in the direction the frame faces, so it stays right when mirrored)
    tail       middle of the tail (animals, fox girl, imps' wisp, mermaid fins)

Points are measured from each frame's own alpha (deterministic heuristics
guided by the authored head/eyes/neck/back points; see PLANS) and written
into sprites.json as frame-pixel fields beside the intake landmarks. A part a
frame does not show is absent. Reviewed corrections for frames the
heuristics get wrong live in bodymap-overrides.json, keyed by set and frame
file, in frame pixels; each records the frame's artHash and is ignored (with
a warning) once that frame's art changes. `null` removes a part.

build.py runs this on its output, so a rebuild keeps the body map. Landmark
edits never touch pixels: an optimized copy or colour mask that was current
stays current (its fingerprint is refreshed, as apply-workbench-edits does).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SPRITES = ROOT / 'assets' / 'sprites'
OVERRIDES = HERE / 'bodymap-overrides.json'
PARTS = ('belly', 'footFront', 'footBack', 'earFront', 'earBack', 'tail')

# Body plan per set. torso: where the belly is looked for. ears: 'top' (pointed
# ears on top of the head), 'side' (big ears out to the sides) or None.
# tail: 'back' (behind the body), 'bottom' (mermaid fin / ghost wisp) or None;
# tailSide: image direction of a 'back' tail on front-facing (facing 0) frames.
PLANS = {
    'felicity': {'torso': 'biped', 'ears': 'top', 'tail': 'back', 'tailSide': -1},
    'fellowfox': {'torso': 'quad', 'ears': 'top', 'tail': 'back'},
    'troll': {'torso': 'biped', 'ears': None, 'tail': None},
    'glimmer': {'torso': 'biped', 'ears': None, 'tail': None},
    'bronze': {'torso': 'biped', 'ears': None, 'tail': None},
    'professor-hoot': {'torso': 'biped', 'ears': None, 'tail': None},
    'shadow-imp': {'torso': 'imp', 'ears': 'top', 'tail': 'bottom'},
    'shadow-imp-blue': {'torso': 'imp', 'ears': 'top', 'tail': 'bottom'},
    'shadow-imp-pink': {'torso': 'imp', 'ears': 'top', 'tail': 'bottom'},
    'garden-fairy-pink': {'torso': 'biped', 'ears': None, 'tail': None},
    'garden-fairy-blue': {'torso': 'biped', 'ears': None, 'tail': None},
    'garden-fairy-yellow': {'torso': 'biped', 'ears': None, 'tail': None},
    'garden-fairy-green': {'torso': 'biped', 'ears': None, 'tail': None},
    'garden-fairy-purple': {'torso': 'biped', 'ears': None, 'tail': None},
    'marina': {'torso': 'mermaid', 'ears': None, 'tail': 'bottom'},
    'scale': {'torso': 'mermaid', 'ears': None, 'tail': 'bottom'},
    'kpop-girl-left': {'torso': 'biped', 'ears': None, 'tail': None},
    'kpop-girl-center': {'torso': 'biped', 'ears': None, 'tail': None},
    'kpop-girl-right': {'torso': 'biped', 'ears': None, 'tail': None},
    'cotton-candy': {'torso': 'quad', 'ears': 'top', 'tail': 'back'},
    'fox': {'torso': 'quad', 'ears': 'top', 'tail': 'back'},
    'princess-amber': {'torso': 'biped', 'ears': None, 'tail': None},
    'snowstar': {'torso': 'biped', 'ears': None, 'tail': None},
    'marshmallow-birthday-cake': {'torso': 'blob', 'ears': None, 'tail': None},
    'unicorn': {'torso': 'quad', 'ears': 'top', 'tail': 'back', 'horn': True},
    'hotdog': {'torso': 'pet', 'ears': 'side', 'tail': 'back', 'tailSide': 1},
}
DEFAULT_PLAN = {'torso': 'biped', 'ears': None, 'tail': None}


def depth_map(mask):
    """City-block distance (px) from each opaque pixel to the nearest transparent one."""
    d = np.zeros(mask.shape, np.int32)
    cur = mask.copy()
    n = 0
    while cur.any() and n < 400:
        n += 1
        d[cur] = n
        nxt = cur.copy()
        nxt[1:, :] &= cur[:-1, :]; nxt[:-1, :] &= cur[1:, :]
        nxt[:, 1:] &= cur[:, :-1]; nxt[:, :-1] &= cur[:, 1:]
        nxt[0, :] = nxt[-1, :] = False; nxt[:, 0] = nxt[:, -1] = False
        cur = nxt
    return d


def pt(v):
    return None if v is None else np.array(v, float)


def snap_thick(depth, guess, radius, pull=0.35):
    """The thickest body pixel near guess (the middle of a limb or torso), pulled toward guess."""
    h, w = depth.shape
    gx, gy = guess
    r = max(2, int(radius))
    x0, x1 = max(0, int(gx) - r), min(w, int(gx) + r + 1)
    y0, y1 = max(0, int(gy) - r), min(h, int(gy) + r + 1)
    if x0 >= x1 or y0 >= y1:
        return None
    sub = depth[y0:y1, x0:x1].astype(float)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    dist = np.hypot(xx - gx, yy - gy)
    score = np.where((sub > 0) & (dist <= r), sub - pull * dist, -1e9)
    i = np.unravel_index(np.argmax(score), score.shape)
    if score[i] <= -1e8:
        return None
    return np.array([xx[i], yy[i]], float)


def nearest_opaque(mask, p):
    ys, xs = np.nonzero(mask)
    i = np.argmin((xs - p[0]) ** 2 + (ys - p[1]) ** 2)
    return np.array([xs[i], ys[i]], float)


def measure(img, frame, facing, plan, body_h):
    """Measured parts {name: [x, y]} for one frame (frame pixels)."""
    a = np.asarray(img.getchannel('A'))
    mask = a >= 96
    if mask.sum() < 50:
        return {}
    depth = depth_map(mask)
    ys, xs = np.nonzero(mask)
    anchor, head, eyes, neck, back = (pt(frame.get(k)) for k in ('anchor', 'head', 'eyes', 'neck', 'back'))
    if head is None or neck is None or anchor is None:
        return {}
    face = eyes if eyes is not None else head + (neck - head) * 0.45
    # Head scale: eyes-to-neck (about half a head), bounded by the body size.
    hs = float(np.clip(np.linalg.norm(face - neck), 0.07 * body_h, 0.3 * body_h))
    fx = 1 if facing >= 0 else -1
    out = {}
    bottom = ys.max()

    # --- belly -------------------------------------------------------------
    torso = plan['torso']
    if torso == 'quad' and back is not None:
        g = (neck + back) / 2 + np.array([0, 0.55 * hs])
        b = snap_thick(depth, g, 0.8 * hs)
    elif torso == 'blob':
        g = face + (anchor - face) * 0.55
        b = snap_thick(depth, g, 0.4 * hs, pull=1.0)
    elif torso == 'pet':
        g = neck + (anchor - neck) * 0.4
        b = snap_thick(depth, g, 0.6 * hs, pull=0.8)
    else:   # biped, mermaid, imp: the waist, a third of the way from the neck to the ground
        g = neck + (anchor - neck) * (0.36 if torso == 'imp' else 0.3)
        b = snap_thick(depth, g, 0.55 * hs, pull=0.8)
    if b is not None:
        out['belly'] = b

    # --- tail ----------------------------------------------------------------
    tail_tip = None
    if plan['tail'] == 'bottom':
        sel = ys >= bottom - 0.16 * body_h
        if sel.any():
            c = np.array([xs[sel].mean(), ys[sel].mean()])
            out['tail'] = snap_thick(depth, c, 0.15 * body_h, pull=0.6) if mask[int(c[1]), int(c[0])] == 0 else c
    elif plan['tail'] == 'back':
        side = fx if facing != 0 else plan.get('tailSide', -1) * -1
        # backward = against the facing direction; ignore the feet band
        keep = ys < bottom - 0.1 * body_h
        far = -(xs - neck[0]) * side
        cand = np.where(keep, far, -1e9)
        k = np.argmax(cand)
        if cand[k] > 1.2 * hs:
            tip = np.array([xs[k], ys[k]], float)
            near = np.hypot(xs - tip[0], ys - tip[1]) <= 1.3 * hs
            c = np.array([xs[near].mean(), ys[near].mean()])
            t = snap_thick(depth, c, 0.5 * hs, pull=0.6)
            if t is not None:
                out['tail'] = t
                tail_tip = tip
    # --- feet: lowest body pixels, split into the front and back foot ----------
    if torso not in ('mermaid', 'imp'):
        body = np.ones(len(xs), bool)
        if tail_tip is not None:   # a drooping tail tip is not a foot
            body = np.hypot(xs - tail_tip[0], ys - tail_tip[1]) > 1.0 * hs
        fbottom = ys[body].max() if body.any() else bottom
        band = body & (ys >= fbottom - max(3, 0.05 * body_h))
        fxs = np.sort(xs[band])
        if len(fxs):
            gaps = np.nonzero(np.diff(fxs) > max(3, 0.04 * body_h))[0]
            groups = np.split(fxs, gaps + 1)
            centres = sorted((float(np.median(gp)) for gp in groups if len(gp) >= 2), key=lambda x: x * fx)
            if not centres:
                centres = [float(np.median(fxs))]
            fy = fbottom - max(2, 0.02 * body_h)
            for name, cx in (('footFront', centres[-1]), ('footBack', centres[0])):
                p = nearest_opaque(mask, np.array([cx, fy]))
                out[name] = p

    # --- ears ----------------------------------------------------------------
    if plan['ears'] == 'top':
        ears = top_ears(mask, face, hs, plan.get('horn'))
        if ears:
            ears.sort(key=lambda p: p[0] * fx)
            out['earFront'] = ears[-1]
            if len(ears) > 1:
                out['earBack'] = ears[0]
    elif plan['ears'] == 'side':
        top = head[1] - 0.2 * hs
        band = (ys >= top) & (ys <= face[1] + 0.4 * hs)
        if band.any():
            ex = []
            for side in (-1, 1):
                sel = band & ((xs - face[0]) * side > 0)
                if not sel.any():
                    continue
                k = np.argmax((xs[sel] - face[0]) * side)
                tip = np.array([xs[sel][k], ys[sel][k]], float)
                if abs(tip[0] - face[0]) > 1.3 * hs:
                    ex.append(tip + (face - tip) * 0.3)
            ex.sort(key=lambda p: p[0] * fx)
            if ex:
                out['earFront'] = ex[-1]
                if len(ex) > 1:
                    out['earBack'] = ex[0]

    return {k: [int(round(v[0])), int(round(v[1]))] for k, v in out.items() if v is not None}


def top_ears(mask, face, hs, horn=False):
    """The two tallest pointed bumps on the head's outline above the eyes."""
    h, w = mask.shape
    x0, x1 = max(0, int(face[0] - 1.7 * hs)), min(w, int(face[0] + 1.7 * hs) + 1)
    ylim = int(face[1])
    if x0 >= x1 or ylim <= 0:
        return []
    sub = mask[:ylim, x0:x1]
    has = sub.any(axis=0)
    top = np.where(has, sub.argmax(axis=0), ylim).astype(float)
    win = max(2, int(0.22 * hs))
    peaks = []
    for i in range(len(top)):
        if not has[i]:
            continue
        lo, hi = max(0, i - win), min(len(top), i + win + 1)
        if top[i] > top[lo:hi].min():
            continue
        # prominence: the outline must drop on both sides
        span = int(0.6 * hs)
        left = top[max(0, i - span):i]
        right = top[i + 1:i + 1 + span]
        drop = min(left.max() if len(left) else ylim, right.max() if len(right) else ylim) - top[i]
        if drop < 0.22 * hs:
            continue
        # width just below the tip (a horn is thin, an ear is broad)
        yy = int(top[i] + 0.25 * hs)
        row = mask[min(yy, h - 1), x0:x1]
        j0 = i
        while j0 > 0 and row[j0 - 1]:
            j0 -= 1
        j1 = i
        while j1 < len(row) - 1 and row[j1 + 1]:
            j1 += 1
        width = j1 - j0
        if horn and width < 0.22 * hs:
            continue
        if any(abs(i - p[0]) < 0.5 * hs for p in peaks):
            continue
        peaks.append((i, top[i]))
    peaks.sort(key=lambda p: p[1])
    ears = []
    for i, ty in peaks[:2]:
        tip = np.array([x0 + i, ty], float)
        ears.append(tip + (face - tip) * 0.3)
    return ears


def frames(manifest):
    for pose, d in manifest.get('poses', {}).items():
        if isinstance(d, str) or 'alias' in d:
            continue
        for i, f in enumerate(d.get('frames', [])):
            if isinstance(f, dict) and f.get('src'):
                yield pose, i, d, f


def load_overrides():
    try:
        return json.loads(OVERRIDES.read_text())
    except FileNotFoundError:
        return {}


def apply(manifest, folder, asset, warn=print):
    """Measure every frame of a manifest (in place). Returns how many points changed."""
    plan = PLANS.get(asset, DEFAULT_PLAN)
    over = load_overrides().get(asset, {})
    changed = 0
    for pose, i, d, f in frames(manifest):
        facing = d.get('facing', manifest.get('facing', 1))
        body_h = f.get('bodyHeight') or d.get('bodyHeight') or manifest['bodyHeight']
        with Image.open(folder / f['src']) as im:
            parts = measure(im.convert('RGBA'), {**{k: d.get(k) for k in ('head', 'eyes', 'neck', 'back')}, 'anchor': manifest.get('anchor'), **f}, facing, plan, body_h)
        o = over.get(f['src'])
        if o:
            if o.get('artHash') and o['artHash'] != f.get('artHash'):
                warn(f'{asset} {f["src"]}: body-map override was made for other art; ignored (re-check it)')
            else:
                for k, v in o.items():
                    if k in PARTS:
                        if v is None:
                            parts.pop(k, None)
                        else:
                            parts[k] = [int(round(v[0])), int(round(v[1]))]
        for k in PARTS:
            if f.get(k) != parts.get(k):
                changed += 1
                if k in parts:
                    f[k] = parts[k]
                else:
                    f.pop(k, None)
    manifest['bodyMap'] = {'parts': list(PARTS), 'tool': 'tools/sprites/bodymap.py',
                           'note': 'measured from frame alpha + bodymap-overrides.json; re-run after changing frames'}
    return changed


def _fingerprints(assets):
    sys.path.insert(0, str(HERE))
    import optimize
    return {a: optimize.fingerprint(a) for a in assets}


def main(argv):
    check = '--check' in argv
    names = [a for a in argv if not a.startswith('--')]
    sets = json.loads((SPRITES / 'index.json').read_text())['sets']
    names = names or sets
    before = _fingerprints(names)
    stale = []
    touched = []
    for asset in names:
        path = SPRITES / asset / 'sprites.json'
        text = path.read_text()
        m = json.loads(text)
        n = apply(m, path.parent, asset)
        new = json.dumps(m, indent=2) + '\n'
        if new != text:
            if check:
                stale.append(asset)
            else:
                path.write_text(new)
                touched.append(asset)
        print(f'{asset}: {n} body-map points changed')
    if check:
        if stale:
            print('body map out of date:', ', '.join(stale), '- run python3 party/tools/sprites/bodymap.py')
            return 1
        return 0
    # Pixels did not change: an optimized copy / mask that was current stays current.
    after = _fingerprints(touched)
    for idx in [SPRITES.parent / 'sprites-opt' / 'index.json'] + [SPRITES / a / 'masks' / 'index.json' for a in touched]:
        if not idx.exists():
            continue
        text = idx.read_text()
        for a in touched:
            if before[a] != after[a] and text.count(f'"{before[a]}"') == 1:
                text = text.replace(f'"{before[a]}"', f'"{after[a]}"')
        idx.write_text(text)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
