"""Review images: recolour every asset with every outfit using the shipped JS
runtime (render_node.js -> ../../recolor.js) and tile the results.

    python render.py [--work-dir ...] [--dolls ...] [--what lineup,sheets,portraits,overlay] [--mode lut|exact]

Writes into <work-dir>/review/:
  lineup.png               every doll, idle frame: original + outfits 1..7
  sheet_<key>.png          all 12 sheet frames (columns) x original + 7 outfits (rows)
  portraits_<key>.png      portrait / cheer / wave / ride x original + 7 outfits
  overlay_<key>_<kind>.png mask overlay: magenta = clothing (R), cyan = dyed hair (G),
                           yellow = hair accessory, green = protected skin
Recoloured raw RGBA buffers are cached in <work-dir>/raw/.
"""
import json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw
from common import *


def outfits():
    return json.load(open(os.path.join(MASK_DIR, 'outfits.json')))


def run_jobs(work, jobs):
    p = os.path.join(work, 'raw', 'jobs.json'); json.dump(jobs, open(p, 'w'))
    subprocess.run(['node', os.path.join(HERE, 'render_node.js'), p], check=True)


def recolour_all(work, keys, kinds, mode='lut'):
    """returns {(key, kind, i): float RGBA}, i = 0 (original) .. 7"""
    cfg = outfits(); raw = os.path.join(work, 'raw'); os.makedirs(raw, exist_ok=True)
    jobs, res, shapes = [], {}, {}
    for k in keys:
        d = cfg['dolls'][k]
        for kind in kinds:
            img = (load_asset(k, kind) * 255 + .5).astype(np.uint8)
            msk = np.asarray(Image.open(mask_path(k, kind)).convert('RGBA'))
            src = os.path.join(raw, f'{k}_{kind}.rgba'); mp = os.path.join(raw, f'{k}_{kind}_mask.rgba')
            img.tofile(src); msk.tofile(mp); shapes[(k, kind)] = img.shape
            res[(k, kind, 0)] = img.astype(np.float32) / 255
            for i, name in enumerate(d['outfits'], 1):
                rgb = [int(round(x * 255)) for x in hex2rgb(cfg['palette'][name])]
                jobs.append(dict(src=src, mask=mp, out=os.path.join(raw, f'{k}_{kind}_{i}.rgba'),
                                 stats=d['stats'], target=rgb, mode=mode))
    run_jobs(work, jobs)
    for j in jobs:
        k, kind, i = os.path.basename(j['out'])[:-5].rsplit('_', 2)
        res[(k, kind, int(i))] = np.fromfile(j['out'], np.uint8).reshape(shapes[(k, kind)]).astype(np.float32) / 255
    return res


def tile(rows, scale, labels=None):
    im = to_img(np.concatenate([np.concatenate(r, 1) for r in rows], 0))
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    if labels:
        d = ImageDraw.Draw(im); h = im.height / len(rows)
        for j, t in enumerate(labels): d.text((3, j * h + 2), t, fill=(0, 0, 0))
    return im


def fit(a, h=418, w=418):
    out = np.zeros((h, w, 4), np.float32); y = (h - a.shape[0]) // 2; x = (w - a.shape[1]) // 2
    out[y:y + a.shape[0], x:x + a.shape[1]] = a; return out


def main():
    a = work_args(__doc__, lambda ap: (ap.add_argument('--what', default='lineup,sheets,portraits,overlay'),
                                       ap.add_argument('--mode', default='lut')))
    what = a.what.split(','); rv = os.path.join(a.work_dir, 'review'); os.makedirs(rv, exist_ok=True)
    cfg = outfits()
    kinds = ['sheet'] + (KINDS[1:] if 'portraits' in what else [])
    R = recolour_all(a.work_dir, a.dolls, kinds, a.mode) if {'lineup', 'sheets', 'portraits'} & set(what) else {}
    names = lambda k: ['original'] + [f'{i}: {n}' for i, n in enumerate(cfg['dolls'][k]['outfits'], 1)]
    if 'lineup' in what:
        rows = [[on_bg(R[(k, 'sheet', i)][:F, :F]) for i in range(8)] for k in a.dolls]
        im = tile(rows, 0.42)
        d = ImageDraw.Draw(im); c = im.width / 8; h = im.height / len(a.dolls)
        for j, k in enumerate(a.dolls):
            for i, t in enumerate(names(k)): d.text((i * c + 3, j * h + 2), (k + ' ' if i == 0 else '') + t, fill=(0, 0, 0))
        im.save(os.path.join(rv, 'lineup.png'))
    for k in a.dolls:
        if 'sheets' in what:
            rows = []
            for i in range(8):
                s = R[(k, 'sheet', i)]
                rows.append([on_bg(s[r * F:(r + 1) * F, c * F:(c + 1) * F]) for r in range(ROWS) for c in range(COLS)])
            tile(rows, 0.36, [f'{k} {n}' for n in names(k)]).save(os.path.join(rv, f'sheet_{k}.png'))
        if 'portraits' in what:
            rows = [[on_bg(fit(R[(k, kind, i)])) for kind in KINDS[1:]] for i in range(8)]
            # transpose: kinds as rows, outfits as columns
            rows = [list(col) for col in zip(*rows)]
            tile(rows, 0.5, [f'{k} {kind}' for kind in KINDS[1:]]).save(os.path.join(rv, f'portraits_{k}.png'))
        if 'overlay' in what:
            for kind in KINDS:
                img = load_asset(k, kind); M = np.load(os.path.join(a.work_dir, 'masks', f'{k}_{kind}.npz'))
                w = M['w'].astype(np.float32)[..., None]; fh = M['fh'].astype(np.float32)[..., None]
                v = on_bg(img) * 0.55 + 0.45 * on_bg(img).mean(-1, keepdims=True)
                v = v * (1 - w * 0.7) + np.array([1, 0, 1]) * w * 0.7
                v = v * (1 - fh * 0.8) + np.array([0, 1, 1]) * fh * 0.8
                v[M['acc']] = v[M['acc']] * 0.3 + np.array([1, 1, 0]) * 0.7
                pr = M['protect'] | M['face']; v[pr] = v[pr] * 0.5 + np.array([0, 0.7, 0]) * 0.5
                im = to_img(np.concatenate([on_bg(img), v], 1))
                if kind == 'sheet': im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
                im.save(os.path.join(rv, f'overlay_{k}_{kind}.png'))
        print(k, flush=True)


if __name__ == '__main__':
    main()
