"""Shared paths and helpers for the clothing-recolour build tools.

Run every script from this folder (americangirldollrace/tools/recolor/).
Inputs are read from ../../assets, the shipped masks + outfits.json are written
to ../../assets/masks, and everything large (model probabilities, review images)
goes to --work-dir (default /tmp/dollrecolor-work), never into the repo.
"""
import argparse, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.normpath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(GAME, 'assets')
MASK_DIR = os.path.join(ASSETS, 'masks')
KEYS = 'whirlpool juliette claudia kaya lily marisol amanda rumi penelope'.split()
KINDS = ['sheet', 'portrait', 'cheer', 'wave', 'ride']   # 'sheet' = 4x3 sprite sheet
F = 418            # sprite sheet frame size
ROWS, COLS = 4, 3


def work_args(desc, extra=None):
    ap = argparse.ArgumentParser(description=desc)
    ap.add_argument('--work-dir', default=os.environ.get('DOLLRECOLOR_WORK', '/tmp/dollrecolor-work'),
                    help='scratch dir for model outputs and review images (outside the repo)')
    ap.add_argument('--dolls', default=','.join(KEYS), help='comma-separated doll keys')
    if extra: extra(ap)
    a = ap.parse_args()
    a.dolls = [k for k in a.dolls.split(',') if k]
    os.makedirs(a.work_dir, exist_ok=True)
    return a


def asset_path(key, kind):
    if kind == 'sheet': return os.path.join(ASSETS, f'doll_{key}_sprites.webp')
    if kind == 'portrait': return os.path.join(ASSETS, 'portraits', f'{key}.webp')
    return os.path.join(ASSETS, 'portraits', f'{key}_{kind}.webp')


def mask_path(key, kind): return os.path.join(MASK_DIR, f'{key}_{kind}_mask.webp')


def load(path):
    return np.asarray(Image.open(path).convert('RGBA')).astype(np.float32) / 255.


def load_asset(key, kind): return load(asset_path(key, kind))


def load_mask(key, kind):
    """returns (cloth weight, dyed-hair weight) as float32 0..1"""
    m = np.asarray(Image.open(mask_path(key, kind)).convert('RGBA')).astype(np.float32) / 255.
    return m[..., 0], m[..., 1]


def frames(kind):
    """list of (name, row-slice, col-slice) sub-images that are segmented independently"""
    if kind == 'sheet':
        return [(f'r{r}c{c}', slice(r * F, (r + 1) * F), slice(c * F, (c + 1) * F))
                for r in range(ROWS) for c in range(COLS)]
    return [('all', slice(None), slice(None))]


def to_img(a): return Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8))


def on_bg(a, bg=(0.82, 0.84, 0.86)):
    return a[..., :3] * a[..., 3:4] + np.array(bg) * (1 - a[..., 3:4])


def hex2rgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])
