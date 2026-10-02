"""Close-up review: original vs one outfit for every sheet frame (after render.py).
    python pairs.py --dolls kaya --outfit 1 [--scale 0.6] [--kind sheet]
-> <work-dir>/review/pairs_<key>_<kind>_<i>.png"""
import os
import numpy as np
from PIL import Image
from common import *

def main():
    a = work_args(__doc__, lambda ap: (ap.add_argument('--outfit', type=int, default=1), ap.add_argument('--scale', type=float, default=0.6),
                                       ap.add_argument('--kind', default='sheet')))
    for k in a.dolls:
        shp = load_asset(k, a.kind).shape
        o = np.fromfile(os.path.join(a.work_dir, 'raw', f'{k}_{a.kind}.rgba'), np.uint8).reshape(shp).astype(np.float32) / 255
        v = np.fromfile(os.path.join(a.work_dir, 'raw', f'{k}_{a.kind}_{a.outfit}.rgba'), np.uint8).reshape(shp).astype(np.float32) / 255
        rows = []
        if a.kind == 'sheet':
            for r in range(ROWS):
                rows.append(np.concatenate([np.concatenate([on_bg(x[r*F:(r+1)*F, c*F:(c+1)*F]) for x in (o, v)], 1) for c in range(COLS)], 1))
        else:
            rows = [np.concatenate([on_bg(o), on_bg(v)], 1)]
        im = to_img(np.concatenate(rows, 0))
        im.resize((int(im.width * a.scale), int(im.height * a.scale)), Image.LANCZOS).save(
            os.path.join(a.work_dir, 'review', f'pairs_{k}_{a.kind}_{a.outfit}.png'))

if __name__ == '__main__':
    main()
