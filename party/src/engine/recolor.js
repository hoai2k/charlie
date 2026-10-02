// Colour variants: palette remap of cel-shaded sprite frames (runtime, per pixel).
//
// A *rule* selects pixels by a soft colour gate (hue range + saturation +
// lightness, feathered), optionally limited by landmark gates (protect a circle
// around the eyes, only below the neck...) and/or an offline region mask
// (assets/sprites/<asset>/masks, R/G/B = region 1/2/3), and maps them from a
// source key colour to a target key colour while keeping the cel shading:
//   H' = Ht + (H - Hk)   S' = S * St / Sk   L' = piecewise map Lk -> Lt (0 and 1 fixed)
// so the navy outline stays dark and highlights stay light. Result =
// mix(original, mapped, weight). No ctx.filter, so it works on every Safari.
// Cel-shaded frames have few distinct colours, so the colour part of every
// rule is computed once per distinct RGB; only the position gates run per pixel.
// Palettes and rules live in src/data/variants.js.

export function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  return rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
}
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  const d = mx - mn;
  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
const ramp = (x, a, b) => (x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a));
function hueDist(h, a, b) {
  // distance (deg) from h to the arc [a, b] (a > b means it wraps through 0)
  const inArc = a <= b ? h >= a && h <= b : h >= a || h <= b;
  if (inArc) return 0;
  const d = (x, y) => { const v = Math.abs(x - y) % 360; return v > 180 ? 360 - v : v; };
  return Math.min(d(h, a), d(h, b));
}
function hue2(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** Pre-compute rule constants. */
export function compileRules(rules) {
  return rules.map((r) => {
    const k = hexToHsl(r.from), t = hexToHsl(r.to);
    return {
      ...r, kh: k[0], ks: k[1], kl: k[2], th: t[0], ts: t[1], tl: t[2],
      hue: r.hue || null, feather: r.feather ?? 8,
      sat: r.sat ?? [0, 1], lit: r.lit ?? [0, 1], sf: r.satFeather ?? 0.08, lf: r.litFeather ?? 0.06,
      lmode: r.lmode || 'key', // 'key' piecewise map, 'keep' leaves lightness alone
      satMode: r.satMode || 'ratio',
    };
  });
}

/** In-place recolour of RGBA pixel data d (w x h). md: mask RGBA data or null. */
export function recolorPixels(d, w, h, rules, land = {}, md = null) {
  if (rules[0].kh === undefined) rules = compileRules(rules);
  const bodyH = land.bodyH || h, NR = rules.length;
  const R = rules.map((r) => {
    const g = { ...r };
    g.protect = (r.protect || []).map((p) => { const pt = land[p.at]; return pt ? { x: pt[0] + (p.dx || 0) * bodyH, y: pt[1] + (p.dy || 0) * bodyH, r: p.r * bodyH } : null; }).filter(Boolean);
    // row gates as lookup tables
    g.row = new Float32Array(h).fill(1);
    if (r.below) { const pt = land[r.below.at]; if (pt) { const y0 = pt[1] + (r.below.dy || 0) * bodyH, f = (r.below.f ?? 0.03) * bodyH; for (let y = 0; y < h; y++) g.row[y] *= ramp(y, y0 - f, y0 + f); } }
    if (r.above) { const pt = land[r.above.at]; if (pt) { const y0 = pt[1] + (r.above.dy || 0) * bodyH, f = (r.above.f ?? 0.03) * bodyH; for (let y = 0; y < h; y++) g.row[y] *= 1 - ramp(y, y0 - f, y0 + f); } }
    return g;
  });
  // colour memo: rgb24 -> slot; per slot: colour weight per rule + mapped rgb per rule
  // open-addressing hash rgb24 -> slot (much cheaper than a Map)
  const HB = 1 << Math.max(12, Math.ceil(Math.log2(w * h * 2))), hk = new Int32Array(HB).fill(-1), hv = new Int32Array(HB);
  let cw = new Float32Array(4096 * NR), mapped = new Uint8ClampedArray(4096 * NR * 3), slots = 0;
  const slotOf = (r0, g0, b0) => {
    const key = (r0 << 16) | (g0 << 8) | b0;
    let hpos = Math.imul(key, 0x9E3779B1) >>> 16;
    while (hk[hpos] !== -1) { if (hk[hpos] === key) return hv[hpos]; hpos = (hpos + 1) & (HB - 1); }
    const s = slots++;
    hk[hpos] = key; hv[hpos] = s;
    if (s * NR >= cw.length) {
      const c2 = new Float32Array(cw.length * 2); c2.set(cw); cw = c2;
      const m2 = new Uint8ClampedArray(mapped.length * 2); m2.set(mapped); mapped = m2;
    }
    // inline rgb -> hsl (no allocation)
    const rf = r0 / 255, gf = g0 / 255, bf = b0 / 255;
    const mx = rf > gf ? (rf > bf ? rf : bf) : (gf > bf ? gf : bf), mn = rf < gf ? (rf < bf ? rf : bf) : (gf < bf ? gf : bf);
    const L = (mx + mn) / 2, dl = mx - mn;
    let H = 0, S = 0;
    if (dl > 1e-6) {
      S = L > 0.5 ? dl / (2 - mx - mn) : dl / (mx + mn);
      H = (mx === rf ? (gf - bf) / dl + (gf < bf ? 6 : 0) : mx === gf ? (bf - rf) / dl + 2 : (rf - gf) / dl + 4) * 60;
    }
    for (let ri = 0; ri < NR; ri++) {
      const r = R[ri];
      let wgt = 1;
      if (r.hue) { const hd = hueDist(H, r.hue[0], r.hue[1]); wgt = hd >= r.feather ? 0 : 1 - hd / r.feather; }
      if (wgt > 0) {
        wgt *= ramp(S, r.sat[0] - r.sf, r.sat[0]) * (1 - ramp(S, r.sat[1], r.sat[1] + r.sf));
        wgt *= ramp(L, r.lit[0] - r.lf, r.lit[0]) * (1 - ramp(L, r.lit[1], r.lit[1] + r.lf));
      }
      cw[s * NR + ri] = wgt;
      if (wgt <= 0) continue;
      const nh = (((r.hueMode === 'set' ? r.th : r.th + (H - r.kh)) % 360) + 360) % 360 / 360;
      const ns = r.satMode === 'set' ? r.ts : Math.min(1, r.ks > 0.02 ? S * r.ts / r.ks : r.ts);
      let nl = L;
      if (r.lmode === 'key') nl = L <= r.kl ? L * r.tl / r.kl : r.tl + (L - r.kl) * (1 - r.tl) / (1 - r.kl);
      const o = (s * NR + ri) * 3;
      if (ns <= 0) { mapped[o] = mapped[o + 1] = mapped[o + 2] = nl * 255; continue; }
      const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns, p = 2 * nl - q;
      mapped[o] = hue2(p, q, nh + 1 / 3) * 255; mapped[o + 1] = hue2(p, q, nh) * 255; mapped[o + 2] = hue2(p, q, nh - 1 / 3) * 255;
    }
    return s;
  };
  const n = w * h, ruleOf = new Uint8Array(n), wOf = new Float32Array(n), slotAt = new Int32Array(n);
  for (let py = 0, i = 0, p = 0; py < h; py++) {
    for (let px = 0; px < w; px++, i += 4, p++) {
      if (d[i + 3] < 8) continue;
      const s = slotOf(d[i], d[i + 1], d[i + 2]);
      slotAt[p] = s;
      for (let ri = 0; ri < NR; ri++) {
        let wgt = cw[s * NR + ri];
        if (wgt <= 0) continue;
        const r = R[ri];
        if (r.mask) { wgt *= md ? md[i + r.mask - 1] / 255 : 0; if (wgt <= 0) continue; }
        wgt *= r.row[py];
        if (wgt <= 0) continue;
        for (const q of r.protect) { const dd = Math.hypot(px - q.x, py - q.y); if (dd < q.r * 1.1) wgt *= ramp(dd, q.r * 0.85, q.r * 1.1); }
        if (wgt <= 0.002) continue;
        ruleOf[p] = ri + 1; wOf[p] = wgt;
        break;
      }
    }
  }
  if (R.some((r) => r.minArea)) dropSmall(ruleOf, wOf, w, h, R, (land.k || 1) ** 2);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const ri = ruleOf[p];
    if (!ri) continue;
    const o = (slotAt[p] * NR + ri - 1) * 3, wgt = wOf[p];
    d[i] += (mapped[o] - d[i]) * wgt; d[i + 1] += (mapped[o + 1] - d[i + 1]) * wgt; d[i + 2] += (mapped[o + 2] - d[i + 2]) * wgt;
  }
  return { colors: slots };
}

function dropSmall(ruleOf, wOf, w, h, R, areaScale) {
  const seen = new Uint8Array(w * h), stack = new Int32Array(w * h), comp = [];
  for (let start = 0; start < w * h; start++) {
    const ri = ruleOf[start];
    if (!ri || seen[start] || !R[ri - 1].minArea) continue;
    let top = 0; stack[top++] = start; seen[start] = 1; comp.length = 0;
    while (top) {
      const p = stack[--top]; comp.push(p);
      const x = p % w;
      if (x > 0 && !seen[p - 1] && ruleOf[p - 1] === ri) { seen[p - 1] = 1; stack[top++] = p - 1; }
      if (x < w - 1 && !seen[p + 1] && ruleOf[p + 1] === ri) { seen[p + 1] = 1; stack[top++] = p + 1; }
      if (p >= w && !seen[p - w] && ruleOf[p - w] === ri) { seen[p - w] = 1; stack[top++] = p - w; }
      if (p < w * (h - 1) && !seen[p + w] && ruleOf[p + w] === ri) { seen[p + w] = 1; stack[top++] = p + w; }
    }
    if (comp.length < R[ri - 1].minArea * areaScale) for (const p of comp) { ruleOf[p] = 0; wOf[p] = 0; }
  }
}

/**
 * Recolour one frame into a new canvas. img: drawable; rect: atlas rect or null;
 * land: { eyes, neck, head, anchor: [x,y], bodyH, k } in frame pixels (already
 * scaled for optimized frames); mask: region mask (R/G/B = mask 1/2/3) or null.
 */
export function recolorFrame(img, rect, rules, land = {}, mask = null) {
  const w = rect ? rect[2] : (img.naturalWidth || img.width), h = rect ? rect[3] : (img.naturalHeight || img.height);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  if (rect) x.drawImage(img, rect[0], rect[1], w, h, 0, 0, w, h); else x.drawImage(img, 0, 0);
  if (!rules || !rules.length) return c;
  const id = x.getImageData(0, 0, w, h);
  let md = null;
  if (mask) {
    const mc = document.createElement('canvas'); mc.width = w; mc.height = h;
    const mx = mc.getContext('2d', { willReadFrequently: true }); mx.drawImage(mask, 0, 0, w, h);
    md = mx.getImageData(0, 0, w, h).data;
  }
  const st = recolorPixels(id.data, w, h, rules, land, md);
  x.putImageData(id, 0, 0);
  // Draw from a plain canvas: read-optimized ones are slow to draw on the GPU.
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  out.getContext('2d').drawImage(c, 0, 0);
  out._colors = st.colors;
  return out;
}
