"""Python reference of the runtime recolour in ../../recolor.js (same maths).

Used by outfits.py to measure how each candidate colour actually renders, and by
verify.py for a JS/Python parity check. Arrays are float RGBA 0..1.
"""
import numpy as np
from oklab import rgb2ok, ok2rgb, ok2lch, lch2ok, gamut_clip
from common import hex2rgb

BETA, WARM_BETA, HUE_KEEP, HUE_CLAMP = 0.55, 0.95, 0.25, 0.35


def wrap(x): return (x + np.pi) % (2 * np.pi) - np.pi


def colourful(L, C):
    """0 for blacks / whites / greys, 1 for real colours (incl. dark navy)"""
    return np.clip((C / (np.minimum(L, 1.05 - L) + 0.12) - 0.06) / 0.10, 0, 1)


def target_lch(hexcol):
    return ok2lch(rgb2ok(hex2rgb(hexcol)))


def beta_for(stats, th):
    warm = np.cos(th - 1.2) > 0.6     # yellow / orange / gold
    if warm and stats['L'] < 0.45: return stats.get('warmBeta', WARM_BETA)
    return stats.get('beta', BETA)


def recolor_rgb(rgb, w, fh, stats, hexcol):
    """rgb (...,3) 0..1, w / fh weights (...) -> new rgb"""
    tL, tC, th = target_lch(hexcol)
    L, C, h = ok2lch(rgb2ok(rgb))
    cf = colourful(L, C)
    k = np.clip(tC / max(stats['C'], 1e-3), 0.6, 3.0)
    dh = np.clip(wrap(h - stats['h']) * HUE_KEEP, -HUE_CLAMP, HUE_CLAMP)
    L2 = np.clip(L + beta_for(stats, th) * (tL - stats['L']), 0.02, 0.98)
    C2 = np.maximum(C * k, cf * 0.35 * tC)
    h2 = th + dh
    new = ok2rgb(lch2ok(L2, gamut_clip(L2, C2, h2, iters=8), h2))
    new = np.round(new * 255) / 255
    a = (w * (0.15 + 0.85 * cf))[..., None]
    res = rgb * (1 - a) + new * a
    if np.any(fh > 0):
        hC = gamut_clip(L, np.maximum(C, 0.06), np.full_like(L, th), iters=8)
        hn = np.round(ok2rgb(lch2ok(L, hC, np.full_like(L, th))) * 255) / 255
        res = res * (1 - fh[..., None]) + hn * fh[..., None]
    return res


def recolor(rgba, w, fh, stats, hexcol):
    out = rgba.copy(); sel = ((w > 0) | (fh > 0)) & (rgba[..., 3] > 0)
    out[..., :3][sel] = recolor_rgb(rgba[..., :3][sel], w[sel], fh[sel], stats, hexcol)
    return out
