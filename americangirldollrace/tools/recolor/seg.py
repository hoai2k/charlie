"""Step 1: run the SegFormer human-parsing model on every sheet frame and portrait.

    pip install torch transformers pillow numpy scipy scikit-image
    python seg.py [--work-dir /tmp/dollrecolor-work] [--dolls kaya,lily]

Writes <work-dir>/seg/<key>_<kind>.npy: float16 (H, W, 18) class probabilities
(~850 MB for all dolls; ~9 min on a 4-core CPU). The model
(mattmdjaga/segformer_b2_clothes, ~110 MB) is downloaded to the Hugging Face cache.
Classes: 0 bg, 1 hat, 2 hair, 3 sunglasses, 4 upper, 5 skirt, 6 pants, 7 dress,
8 belt, 9 l-shoe, 10 r-shoe, 11 face, 12 l-leg, 13 r-leg, 14 l-arm, 15 r-arm, 16 bag, 17 scarf.
"""
import os
import numpy as np
from common import *

MODEL = 'mattmdjaga/segformer_b2_clothes'


def main():
    a = work_args(__doc__)
    import torch
    from transformers import SegformerImageProcessor, AutoModelForSemanticSegmentation
    torch.set_num_threads(os.cpu_count() or 4)
    proc = SegformerImageProcessor.from_pretrained(MODEL)
    model = AutoModelForSemanticSegmentation.from_pretrained(MODEL).eval()

    def seg(rgba, bg):
        inp = proc(images=to_img(on_bg(rgba, bg)), return_tensors='pt')
        with torch.no_grad(): lg = model(**inp).logits
        up = torch.nn.functional.interpolate(lg, size=rgba.shape[:2], mode='bilinear', align_corners=False)
        return torch.softmax(up[0], 0).permute(1, 2, 0).numpy()

    out = os.path.join(a.work_dir, 'seg'); os.makedirs(out, exist_ok=True)
    for k in a.dolls:
        for kind in KINDS:
            img = load_asset(k, kind)
            P = np.zeros(img.shape[:2] + (18,), np.float16)
            for _, rs, cs in frames(kind):
                sub = img[rs, cs]   # average over a white and a light-grey backdrop
                P[rs, cs] = (seg(sub, (1, 1, 1)) + seg(sub, (0.85, 0.87, 0.9))) / 2
            np.save(os.path.join(out, f'{k}_{kind}.npy'), P)
        print(k, flush=True)


if __name__ == '__main__':
    main()
