// Runtime clothing recolour (window.DollRecolor): the "tonal Oklab" recolour.
// tools/recolor/recolor.py is the matching Python reference used to make the
// review images; tools/recolor/README.md explains the masks and outfits.json.
// Pure functions over RGBA byte arrays, so it runs on ImageData in the browser
// or under node (tools/recolor/render_node.js).
//
//   pixels : Uint8ClampedArray RGBA of the original sheet/portrait
//   mask   : Uint8ClampedArray RGBA of the mask WebP (R = clothing weight,
//            G = fantasy-hair weight; B/A unused). Same size as pixels.
//   stats  : per-doll reference {h, L, C, beta?, warmBeta?} from outfits.json
//            (Oklab, h in rad; beta = lightness follow, warmBeta = the same for
//            yellow/orange targets on dark clothes)
//   target : [r, g, b] 0..255 of the variant colour
// Writes the result into `out` (may be the same array as pixels).

(function () {
"use strict";

const BETA = 0.55;      // how far garment lightness moves toward target lightness
const HUE_KEEP = 0.25;  // fraction of each pixel's hue offset (vs. the doll's main hue) kept
const HUE_CLAMP = 0.35; // max kept hue offset in radians

const toLin = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  toLin[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linToByte(c) {
  if (c <= 0) return 0;
  if (c >= 1) return 255;
  return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
}
function rgbLinToOklab(r, g, b, o) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  o[0] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  o[1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  o[2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
}
function oklabToLin(L, a, b, o) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  o[0] = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  o[1] = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  o[2] = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
}
const inGamut = c => c[0] >= -1e-4 && c[0] <= 1.0001 && c[1] >= -1e-4 && c[1] <= 1.0001 && c[2] >= -1e-4 && c[2] <= 1.0001;
// LCh -> linear RGB, reducing chroma until it fits sRGB (keeps L and hue)
function lchToLinClipped(L, C, h, o) {
  const ch = Math.cos(h), sh = Math.sin(h);
  oklabToLin(L, C * ch, C * sh, o);
  if (inGamut(o)) return;
  let lo = 0, hi = C;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    oklabToLin(L, mid * ch, mid * sh, o);
    if (inGamut(o)) lo = mid; else hi = mid;
  }
  oklabToLin(L, lo * ch, lo * sh, o);
}
const wrap = x => ((x + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
function colourful(L, C) {
  const r = C / (Math.min(L, 1.05 - L) + 0.12);
  return Math.max(0, Math.min(1, (r - 0.06) / 0.10));
}

function recolorPixels(pixels, mask, stats, target, out = pixels) {
  const lab = [0, 0, 0], lin = [0, 0, 0], t = [0, 0, 0];
  rgbLinToOklab(toLin[target[0]], toLin[target[1]], toLin[target[2]], t);
  const tL = t[0], tC = Math.hypot(t[1], t[2]), th = Math.atan2(t[2], t[1]);
  const k = Math.max(0.6, Math.min(3, tC / Math.max(stats.C, 1e-3)));
  // Yellow/orange/gold on dark clothing goes olive unless lightness is lifted.
  const warm = Math.cos(th - 1.2) > 0.6;
  const beta = warm && stats.L < 0.45 ? (stats.warmBeta ?? 0.95) : (stats.beta ?? BETA);
  const dL = beta * (tL - stats.L);
  for (let i = 0; i < pixels.length; i += 4) {
    const w = mask[i] / 255, fh = mask[i + 1] / 255;
    if ((w === 0 && fh === 0) || pixels[i + 3] === 0) { if (out !== pixels) { out[i] = pixels[i]; out[i + 1] = pixels[i + 1]; out[i + 2] = pixels[i + 2]; out[i + 3] = pixels[i + 3]; } continue; }
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    rgbLinToOklab(toLin[r], toLin[g], toLin[b], lab);
    const L = lab[0], C = Math.hypot(lab[1], lab[2]), h = Math.atan2(lab[2], lab[1]);
    let nr = r, ng = g, nb = b;
    if (w > 0) {
      const cf = colourful(L, C);
      const dh = Math.max(-HUE_CLAMP, Math.min(HUE_CLAMP, wrap(h - stats.h) * HUE_KEEP));
      const L2 = Math.max(0.02, Math.min(0.98, L + dL));
      const C2 = Math.max(C * k, cf * 0.35 * tC);
      lchToLinClipped(L2, C2, th + dh, lin);
      const a = w * (0.15 + 0.85 * cf);
      nr = r * (1 - a) + linToByte(lin[0]) * a;
      ng = g * (1 - a) + linToByte(lin[1]) * a;
      nb = b * (1 - a) + linToByte(lin[2]) * a;
    }
    if (fh > 0) {   // dyed / fantasy hair: same lightness, target hue
      lchToLinClipped(L, Math.max(C, 0.06), th, lin);
      nr = nr * (1 - fh) + linToByte(lin[0]) * fh;
      ng = ng * (1 - fh) + linToByte(lin[1]) * fh;
      nb = nb * (1 - fh) + linToByte(lin[2]) * fh;
    }
    out[i] = nr; out[i + 1] = ng; out[i + 2] = nb; out[i + 3] = pixels[i + 3];
  }
  return out;
}



// ---------------------------------------------------------------------------
// Fast path: the transform depends only on the source colour, so evaluate it on
// a 33^3 RGB lattice once per (doll, variant) and trilinearly interpolate.
// ~36k colour evaluations instead of ~1M, then a cheap per-pixel lookup.
// The lattice is spaced on a power curve (finer in the darks, where near-black
// pixels sit next to very saturated lattice colours), and POS maps a byte to its
// fractional lattice coordinate.
const N = 33, LUT_GAMMA = 1.4;
const LV = new Uint8Array(N), POS = new Float32Array(256);
for (let i = 0; i < N; i++) LV[i] = Math.max(i && LV[i - 1] + 1, Math.round(255 * Math.pow(i / (N - 1), LUT_GAMMA)));
for (let v = 0, i = 0; v < 256; v++) {
  while (i < N - 2 && v > LV[i + 1]) i++;
  POS[v] = i + Math.min(1, (v - LV[i]) / (LV[i + 1] - LV[i]));
}
function buildLut(stats, target) {
  const cloth = new Float32Array(N * N * N * 3), hair = new Float32Array(N * N * N * 3);
  const px = new Uint8ClampedArray(4), mC = new Uint8ClampedArray([255, 0, 0, 255]), mH = new Uint8ClampedArray([0, 255, 0, 255]);
  const o = new Uint8ClampedArray(4);
  let j = 0;
  for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++, j += 3) {
    px[0] = LV[r]; px[1] = LV[g]; px[2] = LV[b]; px[3] = 255;
    recolorPixels(px, mC, stats, target, o); cloth[j] = o[0]; cloth[j + 1] = o[1]; cloth[j + 2] = o[2];
    recolorPixels(px, mH, stats, target, o); hair[j] = o[0]; hair[j + 1] = o[1]; hair[j + 2] = o[2];
  }
  return { cloth, hair };
}
function lutSample(lut, r, g, b, res) {
  const fr = POS[r], fg = POS[g], fb = POS[b];
  const r0 = Math.min(N - 2, fr | 0), g0 = Math.min(N - 2, fg | 0), b0 = Math.min(N - 2, fb | 0);
  const dr = fr - r0, dg = fg - g0, db = fb - b0;
  const i000 = ((b0 * N + g0) * N + r0) * 3, dR = 3, dG = N * 3, dB = N * N * 3;
  for (let c = 0; c < 3; c++) {
    const i = i000 + c;
    const c00 = lut[i] * (1 - dr) + lut[i + dR] * dr;
    const c10 = lut[i + dG] * (1 - dr) + lut[i + dG + dR] * dr;
    const c01 = lut[i + dB] * (1 - dr) + lut[i + dB + dR] * dr;
    const c11 = lut[i + dB + dG] * (1 - dr) + lut[i + dB + dG + dR] * dr;
    res[c] = (c00 * (1 - dg) + c10 * dg) * (1 - db) + (c01 * (1 - dg) + c11 * dg) * db;
  }
}
function recolorPixelsLut(pixels, mask, stats, target, out = pixels, lut = buildLut(stats, target)) {
  const t = [0, 0, 0];
  for (let i = 0; i < pixels.length; i += 4) {
    const w = mask[i] / 255, fh = mask[i + 1] / 255;
    let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if ((w > 0 || fh > 0) && pixels[i + 3] > 0) {
      if (w > 0) { lutSample(lut.cloth, pixels[i], pixels[i + 1], pixels[i + 2], t); r += w * (t[0] - r); g += w * (t[1] - g); b += w * (t[2] - b); }
      if (fh > 0) { lutSample(lut.hair, pixels[i], pixels[i + 1], pixels[i + 2], t); r += fh * (t[0] - r); g += fh * (t[1] - g); b += fh * (t[2] - b); }
    }
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = pixels[i + 3];
  }
  return out;
}

(typeof window !== "undefined" ? window : globalThis).DollRecolor = { recolorPixels, recolorPixelsLut, buildLut };
})();
