"""Step 3: per-doll recolour stats and the ordered outfit list -> outfits.json.

    python outfits.py [--work-dir ...] [--dolls ...]

Reads the shipped sheet masks (../../assets/masks/<key>_sheet_mask.webp) and
writes ../../assets/masks/outfits.json:
  {"version":1, "palette":{name:"#rrggbb"}, "dolls":{key:{"stats":{h,L,C[,beta][,warmBeta]},
   "outfits":[7 palette names]}}}
Outfit 0 in the game is the original art; outfits 1..7 are the list, in order.

Choosing the list: every candidate colour is rendered on the doll's clothes with
the runtime maths (recolor.py) and measured in Oklab. The colour family closest
to the doll's own clothing hue is dropped; from each remaining family one colour
is used. Greedy max-min: the next outfit is the candidate whose rendered colour
is furthest from the original and from every outfit already chosen (and whose
family is still unused). FIXED pins a hand-picked list for a doll.
"""
import json, os
import numpy as np
from common import *
from oklab import rgb2ok, ok2lch
from recolor import recolor_rgb, colourful, wrap

PALETTE = {
    'red': '#d8262f', 'orange': '#f08a1c', 'yellow': '#f2c230',
    'lime': '#8cc63f', 'green': '#2fa84f', 'mint': '#5fd3a4', 'teal': '#14a3b8',
    'sky': '#5bb8f0', 'blue': '#2f6fe0', 'navy': '#2b3f8f', 'purple': '#8e44c9',
    'lilac': '#b48ff0', 'pink': '#e85aa8', 'berry': '#b0175f',
}
# per-doll overrides of the recolour parameters (see recolor.js)
PARAMS = {
    # red top + navy skirt: the default warm lift (0.95) turns yellow into pale cream
    'amanda': dict(warmBeta=0.7),
    # pale pastel clothes: follow the target lightness more, so red / orange / pink
    # do not all come out as similar pastels
    'claudia': dict(beta=0.7),
    'penelope': dict(beta=0.7),
}
# Colour families: each doll gets at most one colour per family, so the seven
# duplicates read as seven different colour names (not purple + lilac, navy + sky).
# The family nearest the doll's own main clothing hue is skipped, leaving 7.
FAMILIES = [['red'], ['pink', 'berry'], ['orange'], ['yellow'], ['green', 'lime'],
            ['teal', 'mint'], ['blue', 'sky', 'navy'], ['purple', 'lilac']]
DOLL_EXCLUDE = {'penelope': ['mint']}   # renders too close to her green
FIXED = {}          # e.g. 'lily': ['orange', ...] to pin a hand-picked order
MIN_FROM_ORIGINAL = 0.10    # Oklab distance a candidate must keep from the original clothes


def doll_stats(rgba, w):
    """reference (h, L, C) = the doll's main garment colour"""
    sel = (w > 0.6) & (rgba[..., 3] > 0.9); L, C, h = ok2lch(rgb2ok(rgba[..., :3][sel]))
    cs = colourful(L, C) > 0.5
    hist, edges = np.histogram(h[cs], bins=36, range=(-np.pi, np.pi))
    hist = np.convolve(np.r_[hist[-1], hist, hist[0]], [1, 2, 1], 'valid'); i = hist.argmax()
    hm = (edges[i] + edges[i + 1]) / 2
    near = cs & (np.abs(wrap(h - hm)) < 0.6)
    return dict(h=round(float(hm), 4), L=round(float(np.median(L[cs])), 4), C=round(float(np.median(C[near])), 4))


def garment_colour(rgb, w, cf):
    """weighted mean Oklab of the colourful clothing pixels"""
    ok = rgb2ok(rgb); wt = (w * cf)[:, None]
    return (ok * wt).sum(0) / wt.sum()


def plan(rgb, w, stats, n=7, excl=()):
    cf = colourful(*ok2lch(rgb2ok(rgb))[:2])
    orig = garment_colour(rgb, w, cf)
    rendered = {c: garment_colour(recolor_rgb(rgb, w, np.zeros_like(w), stats, hx), w, cf)
                for c, hx in PALETTE.items()}
    dist = lambda p, q: float(np.linalg.norm((p - q) * [1.2, 1, 1]))   # lightness a bit heavier
    fam = {c: i for i, f in enumerate(FAMILIES) for c in f}
    hdist = lambda c: abs(wrap(ok2lch(rgb2ok(hex2rgb(PALETTE[c])))[2] - stats['h']))
    skip = fam[min(fam, key=hdist)]
    pool = [c for c in rendered if fam.get(c, -1) not in (skip, -1) and c not in excl]
    # drop members that render too close to the original, unless that empties their family
    pool = [c for c in pool if dist(rendered[c], orig) > MIN_FROM_ORIGINAL
            or all(dist(rendered[x], orig) <= MIN_FROM_ORIGINAL for x in FAMILIES[fam[c]])]
    pts = [orig]; chosen = []
    while len(chosen) < n:
        best = max(pool, key=lambda c: min(dist(rendered[c], p) for p in pts))
        chosen.append(best); pts.append(rendered[best])
        pool = [c for c in pool if fam[c] != fam[best]]
    mind = [round(min(dist(rendered[c], p) for p in [orig] + [rendered[x] for x in chosen[:i]]), 3) for i, c in enumerate(chosen)]
    return chosen, mind


def main():
    a = work_args(__doc__)
    p = os.path.join(MASK_DIR, 'outfits.json')
    out = json.load(open(p)) if os.path.exists(p) else {}
    dolls = {k: v for k, v in out.get('dolls', {}).items() if k in KEYS}
    for k in a.dolls:
        img = load_asset(k, 'sheet'); w, _ = load_mask(k, 'sheet')
        st = doll_stats(img, w); st.update(PARAMS.get(k, {}))
        sel = (w > 0.6) & (img[..., 3] > 0.9)
        rs = np.random.RandomState(1); idx = rs.choice(sel.sum(), min(30000, sel.sum()), replace=False)
        rgb = img[..., :3][sel][idx]; ww = w[sel][idx]
        if k in FIXED: chosen, mind = FIXED[k], []
        else: chosen, mind = plan(rgb, ww, st, excl=DOLL_EXCLUDE.get(k, ()))
        dolls[k] = dict(stats=st, outfits=chosen)
        print(k, st, chosen, mind, flush=True)
    used = sorted({c for d in dolls.values() for c in d['outfits']}, key=list(PALETTE).index)
    res = dict(version=1, palette={c: PALETTE[c] for c in used},
               dolls={k: dolls[k] for k in KEYS if k in dolls})
    json.dump(res, open(p, 'w'), indent=1)


if __name__ == '__main__':
    main()
