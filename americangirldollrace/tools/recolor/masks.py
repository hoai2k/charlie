"""Step 2: turn SegFormer probabilities into the shipped clothing masks.

    python masks.py [--work-dir /tmp/dollrecolor-work] [--dolls claudia]

Reads  <work-dir>/seg/<key>_<kind>.npy        (from seg.py)
Writes ../../assets/masks/<key>_<kind>_mask.webp  (lossless; R = clothing/accessory
       weight, G = dyed-hair weight, B = 0, A = 255; same size as the source art)
       <work-dir>/masks/<key>_<kind>.npz      (debug: w, fh, protect, hair, acc)

Rules (see README.md): skin and natural hair are hard-protected; per-doll colour
rules add hair accessories (bows, ribbons, headbands, braid wraps) to R and dyed
hair (Whirlpool streaks, Rumi's purple) to G; a per-doll colour vote over the
whole sheet makes every frame and portrait agree; patches.json applies hand fixes.
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.cluster.vq import kmeans2
from skimage import color as skc
from common import *
from oklab import rgb2ok, ok2lch

CLOTH = [1, 4, 5, 6, 7, 8, 9, 10, 16, 17]; SKIN = [11, 12, 13, 14, 15]; HAIR = 2; HAT = 1

# Dyed hair that follows the outfit colour (G channel). CIELab LCh hue range in
# degrees and minimum chroma; only within 3 px of hair-labelled pixels.
FANTASY_HAIR = {
    'whirlpool': dict(h=(220, 300), c=18),   # blue / violet streaks
    'rumi': dict(h=(255, 345), c=15),        # purple braid
}

# Natural hair the model sometimes calls clothing (Kaya's braids in front of her
# dress): pixels close to this image's hair colour (CIELab Mahalanobis < maha to
# the confident-hair pixels), in blobs of at least min_px, are treated as hair.
HAIR_COLOUR = {
    'kaya': dict(maha=3.0, min_px=120),
}

# Hair accessories that follow the outfit colour (R channel). Oklab LCh: hue range
# in degrees (may wrap), chroma / lightness ranges; only inside the hair/hat zone.
# 'close' fills small gaps (polka dots, plaid lines) inside the accessory;
# 'hair_gap' searches only the gaps a closing of the natural hair fills (a band
# around a braid); 'force' lets it override skin protection (never the face).
ACCESSORIES = {
    'claudia': [dict(name='hair bow', h=(140, 235), C=(0.025, 1), L=(0.45, 1), close=2)],
    'lily': [dict(name='hair ribbons', h=(345, 42), C=(0.125, 1), L=(0.2, 0.85), close=3)],
    # the tan wrap is close to Kaya's skin colour (the model even calls it 'arm'),
    # so it is found geometrically: tan pixels in the gap of a closing of her hair.
    'kaya': [dict(name='braid wrap', h=(40, 105), C=(0.11, 1), L=(0.48, 0.95), hair_gap=14, force=True, max_px=900)],
    'penelope': [dict(name='headband', h=(285, 30), C=(0.03, 1), L=(0.36, 1), close=3),
                 dict(name='headband light', h=(0, 360), C=(0, 1), L=(0.62, 1), close=3)],
}


# Garment colours the skin protection sometimes swallows (Penelope's pink socks are
# labelled 'leg'): pixels in this Oklab gate, inside the y-band `band` of the
# figure (0 = top, 1 = bottom), become clothing even where skin-protected (never
# the face). The hue is chosen far from the doll's own skin hue.
GARMENT_FORCE = {
    'penelope': [dict(name='pink socks', h=(345, 28), C=(0.035, 1), L=(0.5, 0.97), band=(0.6, 1.0))],
}


def cielch(lab):
    return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360


def hue_in(h, rng):
    a, b = rng
    return (h >= a) & (h <= b) if a <= b else (h >= a) | (h <= b)


def build(rgba, P, key, kind):
    """per-image rules -> dict(w, fh, protect, hair, soft, acc, lab)"""
    alpha = rgba[..., 3]; op = alpha > 0.02
    lab = skc.rgb2lab(rgba[..., :3]); L, C, H = cielch(lab)
    lbl = P.argmax(-1)
    # shoe sanity rule: a 'shoe' in the upper 55% of a full-body figure is a hand
    if kind != 'portrait':
        ys = np.where(op.any(1))[0]
        top, bot = ys[0], ys[-1]; yy = np.arange(rgba.shape[0])[:, None]
        bad = np.isin(lbl, [9, 10]) & (yy < top + 0.55 * (bot - top))
        P = P.copy(); P[bad, 9] = 0; P[bad, 10] = 0; P[bad, 12] += 0.5
        lbl = P.argmax(-1)
    pc = P[..., CLOTH].sum(-1); ps = P[..., SKIN].sum(-1); ph = P[..., HAIR]
    # per-image skin colour model (CIELab mean/cov of confident skin)
    core = ndi.binary_erosion((ps > 0.9) & (alpha > 0.95), iterations=2)
    X = lab[core]; mu = X.mean(0); icov = np.linalg.inv(np.cov(X.T) + np.eye(3) * 4)
    d = lab - mu; maha = np.sqrt(np.einsum('...i,ij,...j->...', d, icov, d))
    face = ndi.binary_fill_holes(ndi.binary_closing(P[..., 11] > 0.25, iterations=3))
    skin_hard = ((ps > 0.25) & (maha < 6)) | face
    skin_soft = (ps > 0.25) & ~skin_hard
    near_skin = ndi.binary_dilation(ps > 0.5, iterations=10)
    seed = (ps > 0.6) & op; tight = (maha < 2.2) & op; grown = seed.copy()
    for _ in range(30):   # geodesic flood from skin through skin-coloured pixels
        nxt = ndi.binary_dilation(grown) & (tight | seed)
        if (nxt == grown).all(): break
        grown = nxt
    protect = ndi.binary_dilation(skin_hard | ((maha < 3) & near_skin) | grown, iterations=2) & op
    soft = skin_soft & ~protect
    unk = op & (lbl == 0)   # opaque but 'background': nearest label
    if unk.any():
        idx = ndi.distance_transform_edt(unk, return_distances=False, return_indices=True)
        lbl = lbl[idx[0], idx[1]]
    cloth_hard = np.isin(lbl, CLOTH)
    w = np.maximum(np.clip((pc - 0.15) / 0.5, 0, 1), cloth_hard * 1.0)
    w = ndi.gaussian_filter(w, 0.8)
    w[protect] = 0; w[soft] = 0
    hair = ((lbl == HAIR) | (ph > 0.5)) & ~cloth_hard
    if key in HAIR_COLOUR:
        hc = HAIR_COLOUR[key]
        hcore = ndi.binary_erosion((ph > 0.85) & (alpha > 0.95), iterations=2)
        Xh = lab[hcore]; hmu = Xh.mean(0); hicov = np.linalg.inv(np.cov(Xh.T) + np.eye(3) * 4)
        dh = lab - hmu; hmaha = np.sqrt(np.einsum('...i,ij,...j->...', dh, hicov, dh))
        hl = (hmaha < hc['maha']) & (alpha > 0.5) & ~protect
        lab_h, n = ndi.label(hl)
        if n:
            sz = ndi.sum(hl, lab_h, np.arange(1, n + 1))
            hair |= np.r_[False, sz >= hc['min_px']][lab_h]
    w[hair] = 0
    # dyed hair (G)
    fh = np.zeros_like(w)
    cfg = FANTASY_HAIR.get(key)
    if cfg:
        inhue = (H >= cfg['h'][0]) & (H <= cfg['h'][1])
        hairish = ndi.binary_dilation(lbl == HAIR, iterations=3)
        fh = np.where(inhue & hairish & ~protect, np.clip((C - cfg['c']) / 12, 0, 1), 0.)
        fh = ndi.gaussian_filter(fh, 0.6); fh[protect] = 0
    # hair accessories (R): colour rule inside the hair / hat zone
    acc = np.zeros(w.shape, bool); acc_force = np.zeros(w.shape, bool)
    if key in ACCESSORIES:
        oL, oC, oh = ok2lch(rgb2ok(rgba[..., :3])); oh = np.degrees(oh) % 360
        for r in ACCESSORIES[key]:
            if r.get('hair_gap'):
                g = r['hair_gap']
                zone = ndi.binary_closing(np.pad(hair, g), iterations=g)[g:-g, g:-g] & ~hair & (alpha > 0.3)
            else:
                zone = ndi.binary_dilation(np.isin(lbl, [HAIR, HAT]), iterations=4) & (alpha > 0.3)
            m = zone & hue_in(oh, r['h']) & (oC >= r['C'][0]) & (oC <= r['C'][1]) & (oL >= r['L'][0]) & (oL <= r['L'][1])
            m = ndi.binary_opening(m, iterations=1)
            if r.get('close'):
                m = ndi.binary_closing(m, iterations=r['close'], border_value=0) & zone
            if r.get('max_px'):
                lab_c, n = ndi.label(m)
                if n: m = np.r_[False, ndi.sum(m, lab_c, np.arange(1, n + 1)) <= r['max_px']][lab_c]
            if r.get('force'):   # never next to confident skin (hands holding the braid)
                m &= ~ndi.binary_dilation(core, iterations=4)
                acc_force |= m
            acc |= m
        # drop specks: keep components of a reasonable size
        lab_c, n = ndi.label(acc)
        if n:
            sz = ndi.sum(acc, lab_c, np.arange(1, n + 1))
            acc = np.r_[False, sz >= 25][lab_c]
        acc &= ~face; acc_force &= acc
    if key in GARMENT_FORCE:
        oL, oC, oh = ok2lch(rgb2ok(rgba[..., :3])); oh = np.degrees(oh) % 360
        ys = np.where(op.any(1))[0]; yy = (np.arange(rgba.shape[0])[:, None] - ys[0]) / max(1, ys[-1] - ys[0])
        for r in GARMENT_FORCE[key]:
            g = hue_in(oh, r['h']) & (oC >= r['C'][0]) & (oC <= r['C'][1]) & (oL >= r['L'][0]) & (oL <= r['L'][1])
            g &= (yy >= r['band'][0]) & (yy <= r['band'][1]) & (alpha > 0.3) & ~face & ~hair
            g = ndi.binary_opening(g, iterations=1)
            acc |= g; acc_force |= g
    protect &= ~acc_force
    return dict(w=w * op, fh=fh * op, protect=protect, hair=hair, soft=soft, acc=acc, lab=lab, face=face)


NV = 40


def assign(lab, c):
    best = np.full(lab.shape[:2], 1e9); a = np.zeros(lab.shape[:2], int)
    for i, ci in enumerate(c):
        d = ((lab - ci) ** 2).sum(-1); m = d < best; best[m] = d[m]; a[m] = i
    return a


def vote_fit(lab, w, op, excl):
    sel = op & ~excl; X = lab[sel]
    rs = np.random.RandomState(0); idx = rs.choice(len(X), min(80000, len(X)), replace=False)
    c, _ = kmeans2(X[idx].astype(np.float64), NV, minit='++', seed=3, iter=30)
    a = assign(lab, c)
    v = np.array([w[sel & (a == i)].mean() if (sel & (a == i)).sum() > 50 else 0.5 for i in range(NV)])
    return c, v


def apply_vote(m, c, v, op):
    """colours (Lab clusters) that are almost always / never clothing across the
    sheet pull every frame along; each connected blob of one cluster is all-or-nothing."""
    a = assign(m['lab'], c); vv = v[a]; w = m['w'].copy()
    free = op & ~m['protect'] & ~m['hair']
    up = free & (vv > 0.8); w[up] = np.maximum(w[up], vv[up])
    dn = free & (vv < 0.12) & ~m['soft']; w[dn] = np.minimum(w[dn], vv[dn])
    free2 = (free & ~m['soft']) | (free & (vv > 0.8))
    out = w.copy()
    for ci in np.unique(a[free2]):
        lab_c, n = ndi.label(free2 & (a == ci))
        if n == 0: continue
        idx = np.arange(1, n + 1)
        mm = np.r_[0, ndi.mean(w, lab_c, idx)][lab_c]; big = np.r_[0, ndi.sum(np.ones_like(w), lab_c, idx)][lab_c] >= 30
        sel = (lab_c > 0) & big
        out[sel & (mm >= 0.5)] = 1.0
        out[sel & (mm < 0.5)] = 0
    m['w'] = out
    return m


def finish(m, op):
    """accessories on, soften edges, then hard-zero skin, natural hair and cleared patches"""
    w = m['w']; w[m['acc']] = 1.0; w[m['_fill']] = 1.0
    w = ndi.gaussian_filter(w, 0.7)
    natural_hair = m['hair'] & ~m['acc'] & ~m['_fill']
    m['protect'] = m['protect'] & ~m['_force']
    w[m['protect'] | natural_hair | m['face'] | m['_clear']] = 0
    m['w'] = w * op
    m['fh'][m['protect'] | m['face'] | (m['fh'] < 0.02)] = 0   # no faint dyed-hair halo on natural hair
    m['natural_hair'] = natural_hair & (m['fh'] == 0)
    m['w'][m['natural_hair']] = 0
    return m


def load_patches():
    p = os.path.join(HERE, 'patches.json')
    return json.load(open(p)) if os.path.exists(p) else []


def apply_patches(key, kind, img_shape, m, patches):
    """patches.json entries: {"doll","kind","frame" (e.g. "r2c1", optional),
    "rect":[x0,y0,x1,y1] (frame-relative px), "op":"clear"|"fill", "channel":"R"|"G" (default R),
    "where": optional colour gate {"h":[a,b],"C":[a,b],"L":[a,b]} (Oklab, degrees),
    "force": true lets a fill override skin protection (never the face) - always
    combine it with a tight rect and a "where" colour gate}"""
    for p in patches:
        if p['doll'] != key or p['kind'] != kind: continue
        oy = ox = 0
        if kind == 'sheet' and p.get('frame'):
            r, c = int(p['frame'][1]), int(p['frame'][3]); oy, ox = r * F, c * F
        x0, y0, x1, y1 = p.get('rect', [0, 0, F if kind == 'sheet' else img_shape[1], F if kind == 'sheet' else img_shape[0]])
        sl = (slice(oy + y0, oy + y1), slice(ox + x0, ox + x1))
        sel = np.zeros(img_shape[:2], bool); sel[sl] = True
        if 'where' in p:
            g = p['where']; L, C, h = m['_oklch']; h = np.degrees(h) % 360
            sel &= hue_in(h, g.get('h', [0, 360])) & (C >= g.get('C', [0, 9])[0]) & (C <= g.get('C', [0, 9])[1]) \
                & (L >= g.get('L', [0, 9])[0]) & (L <= g.get('L', [0, 9])[1])
        sel &= m['_op'] & ~m['face']
        if not (p.get('force') and p['op'] == 'fill'): sel &= ~m['protect']
        elif p.get('channel', 'R') == 'R': m['_force'] |= sel
        if p.get('channel', 'R') == 'G':
            m['fh'][sel] = 0 if p['op'] == 'clear' else 1.0
        elif p['op'] == 'clear':
            m['_clear'] |= sel; m['acc'] &= ~sel; m['_fill'] &= ~sel
        else:
            m['_fill'] |= sel; m['_clear'] &= ~sel
        p['_used'] = True
    return m


def save(key, kind, m, work):
    R = (np.clip(m['w'], 0, 1) * 255 + .5).astype(np.uint8)
    G = (np.clip(m['fh'], 0, 1) * 255 + .5).astype(np.uint8)
    rgba = np.dstack([R, G, np.zeros_like(R), np.full_like(R, 255)])
    os.makedirs(MASK_DIR, exist_ok=True)
    Image.fromarray(rgba, 'RGBA').save(mask_path(key, kind), lossless=True, quality=100, method=6, exact=True)
    os.makedirs(os.path.join(work, 'masks'), exist_ok=True)
    np.savez_compressed(os.path.join(work, 'masks', f'{key}_{kind}.npz'), w=m['w'].astype(np.float16), fh=m['fh'].astype(np.float16),
                        protect=m['protect'], natural_hair=m['natural_hair'], acc=m['acc'], face=m['face'])


def merge(parts, shape, kind):
    """stitch per-frame dicts into one full-image dict"""
    out = {}
    for n in ('w', 'fh', 'protect', 'hair', 'soft', 'acc', 'face', 'lab'):
        z = parts[0][1][n]
        out[n] = np.zeros(shape[:2] + z.shape[2:], z.dtype)
        for (rs, cs), m in parts: out[n][rs, cs] = m[n]
    return out


def main():
    a = work_args(__doc__)
    patches = load_patches()
    for k in a.dolls:
        vote = None
        for kind in KINDS:   # 'sheet' first: its colour vote is reused by the portraits
            img = load_asset(k, kind); op = img[..., 3] > 0.02
            P = np.load(os.path.join(a.work_dir, 'seg', f'{k}_{kind}.npy')).astype(np.float32)
            parts = [((rs, cs), build(img[rs, cs], P[rs, cs], k, kind)) for _, rs, cs in frames(kind)]
            m = merge(parts, img.shape, kind)
            if vote is None:
                vote = vote_fit(m['lab'], m['w'], img[..., 3] > 0.5, m['protect'] | m['hair'] | m['soft'])
            m = apply_vote(m, *vote, op)
            m['_oklch'] = ok2lch(rgb2ok(img[..., :3])); m['_op'] = op
            m['_fill'] = np.zeros(op.shape, bool); m['_clear'] = np.zeros(op.shape, bool)
            m['_force'] = np.zeros(op.shape, bool)
            m = apply_patches(k, kind, img.shape, m, patches)
            m = finish(m, op)
            save(k, kind, m, a.work_dir)
        print(k, flush=True)
    for p in patches:
        if not p.get('_used') and p['doll'] in a.dolls: print('WARNING unused patch', p)


if __name__ == '__main__':
    main()
