#!/usr/bin/env python3
"""Recolour region masks for colour variants (see src/data/variants.js).

Some outfits share their hue with skin or fur (Felicity's dress, the KPop
Center girl's jacket and boots, Princess Amber's gown), so colour gates alone
can't pick them out. For each frame of those sprite sets this splits the art
into flat-colour regions bounded by the navy outline, classifies each region
with a per-character rule (median colour + position relative to the frame
landmarks) and writes an RGB mask where R/G/B = recolourable region 1/2/3
(lossless WebP, same size as the original frame; optimized frames reuse it).

    python3 party/tools/sprites/make_masks.py                 # every mask set
    python3 party/tools/sprites/make_masks.py felicity --review /tmp/review

Writes assets/sprites/<asset>/masks/<frame>.webp plus masks/index.json with
the set's source fingerprint; validate.py warns when a set changed since.
Re-run it whenever one of these sets gets new or changed frames.
"""
import json, sys, time
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
SPR = HERE.parent.parent / 'assets' / 'sprites'
MASK_SETS = ['felicity', 'kpop-girl-center', 'princess-amber']


def hsl(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a[..., :3].max(-1), a[..., :3].min(-1)
    l = (mx + mn) / 2
    d = mx - mn
    s = np.where(d < 1e-6, 0, np.where(l > 0.5, d / np.maximum(2 - mx - mn, 1e-6), d / np.maximum(mx + mn, 1e-6)))
    h = np.zeros_like(l)
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, h)
    h = np.where(mx == g, (b - r) / dd + 2, h)
    h = np.where(mx == b, (r - g) / dd + 4, h)
    h = np.where(d < 1e-6, 0, h) * 60
    return h, s, l


def label(region):
    """4-connected components of a boolean array -> (labels, count)."""
    H, W = region.shape
    lab = np.zeros((H, W), np.int32)
    n = 0
    reg = region.tolist()
    labl = lab  # numpy writes are slow per pixel; use python lists
    L = [[0] * W for _ in range(H)]
    for y in range(H):
        row = reg[y]
        for x in range(W):
            if row[x] and not L[y][x]:
                n += 1
                L[y][x] = n
                q = deque([(y, x)])
                while q:
                    cy, cx = q.popleft()
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < H and 0 <= nx < W and reg[ny][nx] and not L[ny][nx]:
                            L[ny][nx] = n
                            q.append((ny, nx))
    return np.array(L, np.int32), n


def classify_felicity(st, fr, bodyH):
    """Dress/shoe regions: orange, mid-light, below the neck, near the body axis."""
    neck, anc = fr['neck'], fr['anchor']
    out = {}
    for k, c in st.items():
        if c['area'] < 6: continue
        # dress ~L0.48 flat; skin ~L0.70; tail/face fur include their white tip/muzzle (high l75)
        orange = 12 <= c['h'] <= 42 and c['s'] > 0.6 and 0.28 < c['l'] < 0.55 and c['l75'] < 0.62
        if not orange: continue
        below = c['cy'] > neck[1] + 0.03 * bodyH
        feet = c['cy'] > anc[1] - 0.12 * bodyH  # shoes may sit wide of the body axis
        axis = abs(c['cx'] - (neck[0] + anc[0]) / 2) < (0.34 if feet else 0.2) * bodyH
        if below and axis: out[k] = 1
    return out


def classify_amber(st, fr, bodyH):
    neck = fr['neck']
    head = fr['head']
    dx, dy = neck[0] - head[0], neck[1] - head[1]
    length = float(np.hypot(dx, dy))
    dx, dy = (dx / length, dy / length) if length else (0, 1)
    out = {}
    for k, c in st.items():
        if c['area'] < 6: continue
        # Follow the torso direction, including sideways and upside-down flips.
        depth = (c['cx'] - neck[0]) * dx + (c['cy'] - neck[1]) * dy
        if 27 <= c['h'] <= 45 and c['s'] > 0.75 and depth > 0.02 * bodyH: out[k] = 1
        # the petticoat/underside: a little redder than the gown but much lighter
        # than her copper hair (hair: hue ~17, lightness ~0.3)
        elif 21 <= c['h'] < 27 and c['s'] > 0.85 and c['l'] > 0.4 and depth > 0.2 * bodyH: out[k] = 1
    return out


def classify_kpopc(st, fr, bodyH, skinL=0.62):
    """Jacket/skirt vs tan skin: same hue, skin saturation drifts per frame, but
    skin regions sit at L~0.62 while the jacket's flat colour is L~0.50."""
    neck = fr['neck']
    out = {}
    for k, c in st.items():
        ex, ey = fr.get('eyes') or fr['head']
        if c['area'] < 6 or ((c['cx'] - ex) ** 2 + (c['cy'] - ey) ** 2) ** 0.5 < 0.15 * bodyH: continue
        if 10 <= c['h'] <= 46 and c['s'] > 0.62 and c['l'] < skinL - 0.07: out[k] = 1     # jacket + skirt
        elif 245 <= c['h'] <= 300 and c['s'] > 0.3 and c['cy'] > neck[1] + 0.25 * bodyH: out[k] = 2  # boots
    return out


def pixel_kpopc(mask, h, s, l, opaque, fr, bodyH):
    """Jacket/skirt vs tan skin: per-frame adaptive saturation threshold from a
    cheek sample, face circle protected, small specks dropped."""
    H, W = h.shape
    yy, xx = np.mgrid[0:H, 0:W]
    ex, ey = fr.get('eyes') or fr['head']; neck = fr['neck']
    cheek = (np.abs(xx - ex) < 0.06 * bodyH) & (yy > ey + 0.03 * bodyH) & (yy < ey + 0.1 * bodyH) & opaque & (l > 0.3) & (h > 10) & (h < 45)
    skin_s = np.percentile(s[cheek], 95) if cheek.sum() > 20 else 0.8
    thr = max(0.84, skin_s + 0.05)
    face = np.hypot(xx - ex, yy - ey) < 0.16 * bodyH
    warm = opaque & (h >= 10) & (h <= 46) & (s > thr) & (l < 0.64) & (l > 0.12) & ~face & (yy > neck[1] - 0.02 * bodyH)
    lab, n = label(warm)
    if n:
        sizes = np.bincount(lab.ravel())
        keep = sizes >= 25; keep[0] = False
        warm = keep[lab]
    mask[warm, 0] = 255
    boots = opaque & (h >= 245) & (h <= 300) & (s > 0.25) & (yy > neck[1] + 0.25 * bodyH)
    mask[boots, 1] = 255


def add_kpopc_pixels(mask, h, s, l, opaque, fr, bodyH, skinL):
    H, W = h.shape
    yy, xx = np.mgrid[0:H, 0:W]
    ex, ey = fr.get('eyes') or fr['head']; neck = fr['neck']
    cheek = (np.abs(xx - ex) < 0.06 * bodyH) & (yy > ey + 0.03 * bodyH) & (yy < ey + 0.1 * bodyH) & opaque & (l > 0.3) & (h > 10) & (h < 45)
    skin_s = float(np.median(s[cheek])) if cheek.sum() > 20 else 0.8
    face = np.hypot(xx - ex, yy - ey) < 0.17 * bodyH
    jacket = opaque & (h >= 10) & (h <= 46) & (s > max(0.84, skin_s + 0.01)) & (l < skinL - 0.08) & (l > 0.18) & ~face  # raised sleeves can be above the neck
    lab, n = label(jacket)
    if n:
        sizes = np.bincount(lab.ravel())
        keep = sizes >= 30; keep[0] = False
        jacket = keep[lab]
    mask[jacket, 0] = 255


PIXEL = {}

CLASSIFY = {'felicity': classify_felicity, 'princess-amber': classify_amber, 'kpop-girl-center': classify_kpopc}


def frames_of(m):
    for pose, d in m['poses'].items():
        if not isinstance(d, dict) or 'frames' not in d: continue
        for f in d['frames']:
            fo = {'src': f} if isinstance(f, str) else f
            yield pose, {**{k: d.get(k) for k in ('anchor', 'neck', 'eyes', 'head')}, **{k: v for k, v in fo.items() if v is not None}}


def build(asset, review=None):
    m = json.loads((SPR / asset / 'sprites.json').read_text())
    bodyH = m['bodyHeight']
    outdir = SPR / asset / 'masks'
    outdir.mkdir(parents=True, exist_ok=True)
    keep = set()
    tiles, total, t0 = [], 0, time.time()
    sys.path.insert(0, str(HERE))
    for pose, fr in frames_of(m):
        im = Image.open(SPR / asset / fr['src']).convert('RGBA')
        a = np.asarray(im).astype(np.float32) / 255
        h, s, l = hsl(a)
        opaque = a[..., 3] > 0.5
        region = opaque & (l > 0.2)
        lab, n = label(region)
        st = {}
        ys, xs = np.nonzero(lab)
        ids = lab[ys, xs]
        order = np.argsort(ids)
        ids, ys, xs = ids[order], ys[order], xs[order]
        cuts = np.flatnonzero(np.diff(ids)) + 1
        for grp_y, grp_x, grp_i in zip(np.split(ys, cuts), np.split(xs, cuts), np.split(ids, cuts)):
            if not len(grp_i): continue
            hh = h[grp_y, grp_x]
            # circular median-ish: use median of hue shifted so wrap is at 180 for warm colours
            st[int(grp_i[0])] = dict(area=len(grp_i), cx=float(grp_x.mean()), cy=float(grp_y.mean()),
                                     h=float(np.median(hh)), s=float(np.median(s[grp_y, grp_x])), l=float(np.median(l[grp_y, grp_x])), l75=float(np.percentile(l[grp_y, grp_x], 75)))
        mask = np.zeros(a.shape[:2] + (3,), np.uint8)
        if asset in PIXEL:
            PIXEL[asset](mask, h, s, l, opaque, fr, bodyH)
        else:
            kw = {}
            if asset == 'kpop-girl-center':
                H_, W_ = h.shape; yy, xx = np.mgrid[0:H_, 0:W_]; ex, ey = fr.get('eyes') or fr['head']
                cheek = opaque & (h > 10) & (h < 45) & (l > 0.3) & (np.abs(xx - ex) < 0.06 * bodyH) & (yy > ey + 0.03 * bodyH) & (yy < ey + 0.1 * bodyH)
                if cheek.sum() > 20: kw['skinL'] = float(np.median(l[cheek]))
            cls = CLASSIFY[asset](st, fr, bodyH, **kw)
            for k, c in cls.items():
                mask[lab == k, c - 1] = 255
            if asset == 'kpop-girl-center':
                # Sleeves whose region merged with a hand: add jacket-coloured
                # pixels (darker and more saturated than this frame's skin).
                add_kpopc_pixels(mask, h, s, l, opaque, fr, bodyH, kw.get('skinL', 0.62))
        mimg = Image.fromarray(mask, 'RGB').filter(ImageFilter.MaxFilter(3))  # cover anti-aliased outline edge
        path = outdir / fr['src']
        keep.add(path.name)
        mimg.save(path, 'WEBP', lossless=True, quality=100, method=6)
        total += path.stat().st_size
        # review tile: frame with mask tinted magenta
        rv = im.copy()
        ov = Image.new('RGBA', im.size, (255, 0, 255, 0))
        mr = np.asarray(mimg)
        ova = np.zeros(a.shape[:2] + (4,), np.uint8)
        ova[mr[..., 0] > 0] = (255, 0, 200, 170)
        ova[mr[..., 1] > 0] = (0, 220, 255, 170)
        rv.alpha_composite(Image.fromarray(ova, 'RGBA'))
        if review: tiles.append(rv)
    for f in outdir.glob('*.webp'):
        if f.name not in keep: f.unlink()
    from optimize import fingerprint
    (outdir / 'index.json').write_text(json.dumps({'source': fingerprint(asset), 'note': 'made by tools/sprites/make_masks.py'}) + '\n')
    print(f'{asset}: {len(keep)} masks, {total/1024:.1f} KB total, {time.time()-t0:.1f}s')
    if not review: return
    # contact sheet
    cols = 12
    tw = max(t.width for t in tiles); th = max(t.height for t in tiles)
    sheet = Image.new('RGBA', (cols * tw, ((len(tiles) + cols - 1) // cols) * th), (235, 240, 250, 255))
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, ((i % cols) * tw, (i // cols) * th))
    Path(review).mkdir(parents=True, exist_ok=True)
    sheet.convert('RGB').resize((sheet.width // 2, sheet.height // 2)).save(Path(review) / f'{asset}-masks.png')


def stale(asset):
    """None if the masks match the set, else why not."""
    from optimize import fingerprint
    idx = SPR / asset / 'masks' / 'index.json'
    if not idx.exists(): return 'no masks'
    return None if json.loads(idx.read_text()).get('source') == fingerprint(asset) else 'masks are stale'


if __name__ == '__main__':
    args = sys.argv[1:]
    review = None
    if '--review' in args:
        i = args.index('--review'); review = args[i + 1]; del args[i:i + 2]
    for a in args or MASK_SETS:
        build(a, review)
