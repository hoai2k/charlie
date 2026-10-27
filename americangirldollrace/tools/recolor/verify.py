"""Step 5: numeric checks (run after render.py, which caches the JS output).

    python verify.py [--work-dir ...] [--dolls ...]

1. Protected pixels (skin incl. the whole face, and natural hair, as classified
   by masks.py) are byte-identical to the original in every recoloured asset.
2. Independent skin check: pixels whose colour matches the image's skin model
   (from the model's confident skin, not from our mask) that changed by > 8.
3. Parity: JS exact path vs JS LUT path vs Python reference (recolor.py) on the
   idle frame of every sheet, for every outfit.
"""
import json, os, subprocess
import numpy as np
from scipy import ndimage as ndi
from skimage import color as skc
from common import *
from recolor import recolor


def main():
    a = work_args(__doc__)
    cfg = json.load(open(os.path.join(MASK_DIR, 'outfits.json')))
    raw = os.path.join(a.work_dir, 'raw'); bad = 0
    print('%-10s %-9s %9s %9s %8s %10s' % ('doll', 'kind', 'protected', 'changed', 'skin-col', 'skin-col>8'))
    for k in a.dolls:
        for kind in KINDS:
            img = load_asset(k, kind); sh = img.shape
            M = np.load(os.path.join(a.work_dir, 'masks', f'{k}_{kind}.npz'))
            prot = (M['protect'] | M['face'] | M['natural_hair']) & (img[..., 3] > 0)
            o = np.fromfile(os.path.join(raw, f'{k}_{kind}.rgba'), np.uint8).reshape(sh)
            P = np.load(os.path.join(a.work_dir, 'seg', f'{k}_{kind}.npy')).astype(np.float32)
            lab = skc.rgb2lab(img[..., :3]); ps = P[..., [11, 12, 13, 14, 15]].sum(-1)
            core = ndi.binary_erosion((ps > 0.9) & (img[..., 3] > 0.95), iterations=2)
            mu = lab[core].mean(0); icov = np.linalg.inv(np.cov(lab[core].T) + np.eye(3) * 4)
            d = lab - mu; skin_col = (np.sqrt(np.einsum('...i,ij,...j->...', d, icov, d)) < 2.0) & (img[..., 3] > 0.5) & (ps > 0.5)
            ch = 0; sk = 0
            for i in range(1, 8):
                v = np.fromfile(os.path.join(raw, f'{k}_{kind}_{i}.rgba'), np.uint8).reshape(sh)
                diff = np.abs(v.astype(int) - o).max(-1)
                ch = max(ch, int((diff[prot] > 0).sum())); sk = max(sk, int((diff[skin_col] > 8).sum()))
            bad += ch
            print('%-10s %-9s %9d %9d %8d %10d' % (k, kind, prot.sum(), ch, skin_col.sum(), sk))
    print('protected pixels changed (max over outfits, summed):', bad)
    # parity
    jobs = []; F0 = (slice(0, F), slice(0, F))
    for k in a.dolls:
        img = (load_asset(k, 'sheet')[F0] * 255 + .5).astype(np.uint8)
        msk = np.ascontiguousarray(np.asarray(Image.open(mask_path(k, 'sheet')).convert('RGBA'))[F0])
        src = os.path.join(raw, f'par_{k}.rgba'); mp = os.path.join(raw, f'par_{k}_m.rgba'); img.tofile(src); msk.tofile(mp)
        for i, n in enumerate(cfg['dolls'][k]['outfits'], 1):
            rgb = [int(round(x * 255)) for x in hex2rgb(cfg['palette'][n])]
            for mode in ('exact', 'lut'):
                jobs.append(dict(src=src, mask=mp, out=os.path.join(raw, f'par_{k}_{i}_{mode}.rgba'), stats=cfg['dolls'][k]['stats'], target=rgb, mode=mode))
    p = os.path.join(raw, 'par_jobs.json'); json.dump(jobs, open(p, 'w'))
    subprocess.run(['node', os.path.join(HERE, 'render_node.js'), p], check=True)
    worst = dict(py=0, lut=0, lut_n=0, n=0)
    for k in a.dolls:
        img = load_asset(k, 'sheet')[F0]; w, fh = (x[F0] for x in load_mask(k, 'sheet'))
        w = np.round(w * 255) / 255; fh = np.round(fh * 255) / 255
        for i, n in enumerate(cfg['dolls'][k]['outfits'], 1):
            py = (recolor(img, w, fh, cfg['dolls'][k]['stats'], cfg['palette'][n])[..., :3] * 255 + .5).astype(int)
            ex = np.fromfile(os.path.join(raw, f'par_{k}_{i}_exact.rgba'), np.uint8).reshape(F, F, 4)[..., :3].astype(int)
            lu = np.fromfile(os.path.join(raw, f'par_{k}_{i}_lut.rgba'), np.uint8).reshape(F, F, 4)[..., :3].astype(int)
            vis = img[..., 3] > 0.06
            worst['py'] = max(worst['py'], int(np.abs(py - ex)[vis].max()))
            dl = np.abs(lu - ex)[vis]; worst['lut'] = max(worst['lut'], int(dl.max())); worst['lut_n'] += int((dl > 8).sum()); worst['n'] += dl.size
    print('parity: max |python - js exact| = %d/255; max |js lut - js exact| = %d/255, channels > 8: %d of %d'
          % (worst['py'], worst['lut'], worst['lut_n'], worst['n']))


if __name__ == '__main__':
    from PIL import Image
    main()
