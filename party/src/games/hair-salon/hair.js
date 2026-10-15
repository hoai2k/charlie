// Hair Salon: the live hair model. A client's hair is a set of strands in
// "head space" (head centre at 0,0; the head is an ellipse HEAD_RX x HEAD_RY).
// Each strand has a root on the scalp, a length, curl, messiness and a colour
// per SEG units along its length. Tools change those numbers; the geometry is
// rebuilt only for the strands that changed, and the drawn hair is cached in
// an offscreen canvas until something changes.
//
// Styles: loose hair falls from the scalp around the head; the tied styles
// (ponytail, pigtails, bun, space buns, braid) comb every strand along the
// scalp to an anchor and then hang/coil/weave the rest from there. Bangs are
// separate short strands over the forehead that keep their own shape.
import { clamp, lerp, rand, TAU } from '../../engine/util.js';
import { RAINBOW } from '../../engine/particles.js';

export const NAVY = '#24163f';
export const HEAD_RX = 118, HEAD_RY = 132;
export const SEG = 30;              // colour segment length (head units)
export const MAXL = 600;           // longest a main strand can grow
export const MAXB = 230;           // longest bangs
export const MINL = 34;            // shortest a main strand can be cut
const NSEG = Math.ceil(MAXL / SEG) + 2;
const STRAND_W = 30, BANG_W = 22;

export const HAIR_COLORS = [
  { id: 'brown', name: 'Brown', c: '#8a5a3c', word: 'Chocolate' },
  { id: 'blonde', name: 'Blonde', c: '#ffd36e', word: 'Golden' },
  { id: 'black', name: 'Black', c: '#41335a', word: 'Midnight' },
  { id: 'ginger', name: 'Ginger', c: '#ff8a3d', word: 'Ginger' },
  { id: 'pink', name: 'Pink', c: '#ff7ac6', word: 'Bubblegum' },
  { id: 'purple', name: 'Purple', c: '#a77bff', word: 'Purple' },
  { id: 'blue', name: 'Blue', c: '#4fb8ff', word: 'Ocean' },
  { id: 'mint', name: 'Mint', c: '#4fd98a', word: 'Minty' },
  { id: 'red', name: 'Red', c: '#ff4d5e', word: 'Ruby' },
  { id: 'white', name: 'Silver', c: '#eef0fb', word: 'Snowy' },
  { id: 'rainbow', name: 'Rainbow', c: null, word: 'Rainbow' },
  { id: 'glitter', name: 'Glitter', c: null, word: 'Sparkly' },
];
export const NATURAL = ['#8a5a3c', '#ffd36e', '#41335a', '#ff8a3d', '#b07a52', '#5e3d2b'];

export const STYLES = [
  { id: 'loose', name: 'Loose', pop: 'Hair down!' },
  { id: 'ponytail', name: 'Ponytail', pop: 'Ponytail!' },
  { id: 'pigtails', name: 'Pigtails', pop: 'Pigtails!' },
  { id: 'bun', name: 'Bun', pop: 'Top bun!' },
  { id: 'spacebuns', name: 'Space buns', pop: 'Space buns!' },
  { id: 'braid', name: 'Braid', pop: 'Braid!' },
];

// ---- colour helpers -----------------------------------------------------------
const shadeCache = new Map();
/** Mix a #rrggbb colour toward black (k < 0) or white (k > 0). */
export function shade(hex, k) {
  const key = hex + k;
  let v = shadeCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; gg *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; }
  v = `rgb(${r | 0},${gg | 0},${b | 0})`;
  shadeCache.set(key, v);
  return v;
}

// ---- the hairline over the forehead (head units) -----------------------------
/** y of the hairline at x (the cap of hair covers the head above it). */
export function hairlineY(x) {
  const u = clamp(Math.abs(x) / HEAD_RX, 0, 1);
  return lerp(-HEAD_RY * 0.5, -HEAD_RY * 0.02, u * u) + Math.max(0, 0.12 - Math.abs(x) / HEAD_RX) * 30;
}

/** Point on the head ellipse at angle a (0 = top, + = right), scaled by r. */
function ell(a, r = 1) { return [Math.sin(a) * HEAD_RX * r, -Math.cos(a) * HEAD_RY * r]; }

// ---- strands -----------------------------------------------------------------
function makeStrand(i, opts) {
  return {
    i, bang: !!opts.bang, a: opts.a, bx: opts.bx || 0,
    L: opts.L, curl: opts.curl, messy: opts.messy,
    segs: new Array(NSEG).fill(opts.color), glit: new Uint8Array(NSEG),
    ph: rand(TAU), ph2: rand(TAU), ph3: rand(TAU), nf: rand(0.018, 0.03), jit: rand(-1, 1),
    pts: [], dirty: true, fan: 0,
  };
}

export class Hair {
  /** opts: { color, length, curl, messy, bangs } */
  constructor(opts) {
    this.style = 'loose';
    this.strands = [];
    const N = 34;
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1);
      const a = lerp(-1.78, 1.78, u);
      this.strands.push(makeStrand(this.strands.length, { a, L: clamp(opts.length * rand(0.92, 1.08) * (0.86 + 0.14 * Math.cos(a * 0.6)), MINL, MAXL), curl: opts.curl, messy: opts.messy, color: opts.color }));
    }
    const NB = 7;
    for (let k = 0; k < NB; k++) {
      const bx = lerp(-0.6, 0.6, k / (NB - 1)) * HEAD_RX;
      this.strands.push(makeStrand(this.strands.length, { bang: true, a: 0, bx, L: opts.bangs * rand(0.85, 1.15) * (1 - Math.abs(bx) / HEAD_RX * 0.35), curl: opts.curl * 0.2, messy: opts.messy, color: opts.color }));
    }
    this.version = 0;       // bumps on every visual change (drives the cache)
    this.cache = null;
    this.layout();
  }

  get main() { return this.strands.filter((s) => !s.bang); }
  touch(s) { if (s) s.dirty = true; this.version++; }
  touchAll() { for (const s of this.strands) s.dirty = true; this.version++; }

  setStyle(id) { if (this.style !== id) { this.style = id; this.touchAll(); this.layout(); } }

  /** Rebuild the geometry of dirty strands (plus style-wide numbers). */
  layout() {
    const main = this.strands.filter((s) => !s.bang);
    // style-wide numbers: bun size from how much hair there is
    let sum = 0; for (const s of main) sum += s.L;
    this.avgL = sum / main.length;
    for (const s of this.strands) if (s.dirty) { this.build(s); s.dirty = false; }
  }

  build(s) {
    const pts = [];
    const curl = s.curl, messy = s.messy;
    const ds = 9 - 3 * curl;
    if (s.bang) {
      const y0 = hairlineY(s.bx) - 12;
      let x = s.bx, y = y0, dx = s.bx / HEAD_RX * 0.35, dy = 1;
      const Lf = s.L * (1 - 0.3 * curl);
      for (let d = 0; d <= Lf + 0.01; d += ds) {
        pts.push(x, y, d / (1 - 0.3 * curl));
        dx += (s.bx / HEAD_RX) * 0.004 * ds; const m = Math.hypot(dx, dy); dx /= m; dy /= m;
        x += dx * ds; y += dy * ds;
      }
      s.pts = this.wiggle(s, pts, 0);
      return;
    }
    const st = this.style;
    if (st === 'loose') {
      const RX = HEAD_RX * (1.1 + 0.22 * messy + 0.12 * curl), RY = HEAD_RY * (1.08 + 0.16 * messy + 0.06 * curl);
      let [x, y] = ell(s.a, 1);
      x *= RX / HEAD_RX; y *= RY / HEAD_RY;
      // outward normal, nudged up for volume and jittered when messy
      let dx = Math.sin(s.a) / HEAD_RX, dy = -Math.cos(s.a) / HEAD_RY;
      let m = Math.hypot(dx, dy); dx /= m; dy /= m;
      const ja = s.jit * messy * 0.45;
      [dx, dy] = [dx * Math.cos(ja) - dy * Math.sin(ja), dx * Math.sin(ja) + dy * Math.cos(ja)];
      const k = 1 - 0.3 * curl, Lf = s.L * k;
      const G = 0.022 + 0.012 * (1 - messy);
      for (let d = 0; d <= Lf + 0.01; d += ds) {
        pts.push(x, y, d / k);
        dy += G * ds; m = Math.hypot(dx, dy); dx /= m; dy /= m;
        let nx = x + dx * ds, ny = y + dy * ds;
        const e = (nx / RX) ** 2 + (ny / RY) ** 2;
        if (e < 1 && ny < RY * 0.4) {
          const q = 1 / Math.sqrt(e); nx *= q; ny *= q;
          dx = nx - x; dy = ny - y; m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
        }
        // keep the falling curtain outside the face
        if (ny > -10 && Math.abs(nx) < RX * 0.97) nx = Math.sign(nx || s.a) * RX * 0.97;
        x = nx; y = ny;
      }
      s.pts = this.wiggle(s, pts, 0);
      return;
    }
    // Tied styles: comb along the scalp to the anchor, then the free part.
    let A;   // { a: angle, r: radius factor, free: fn }
    const side = s.a < 0 ? -1 : 1;
    if (st === 'ponytail') A = { a: 0.22, r: 1.14 };
    else if (st === 'pigtails') A = { a: side * 1.62, r: 1.06 };
    else if (st === 'bun') A = { a: 0, r: 1.16 };
    else if (st === 'spacebuns') A = { a: side * 0.72, r: 1.1 };
    else A = { a: 1.95, r: 1.05 };   // braid: over the right shoulder
    const a0 = s.a, steps = Math.max(4, Math.ceil(Math.abs(A.a - a0) * 14));
    let used = 0, px = null, py = null;
    for (let j = 0; j <= steps; j++) {
      const u = j / steps;
      const [x, y] = ell(lerp(a0, A.a, u), lerp(1.04, A.r, u * u));
      if (px !== null) used += Math.hypot(x - px, y - py);
      pts.push(x, y, used);
      px = x; py = y;
    }
    s.scalpN = pts.length / 3;
    const free = Math.max(26, s.L - used * 0.65);
    const [ax, ay] = ell(A.a, A.r);
    const nIdx = s.i;
    const cur = (d) => used + d;
    if (st === 'ponytail' || st === 'pigtails') {
      let dx, dy;
      if (st === 'ponytail') { const f = (s.a / 1.78); dx = 0.85 + f * 0.25; dy = -0.75 - f * 0.15; }
      else { dx = side * (0.95 + (Math.abs(s.a) - 0.9) * 0.2); dy = -0.25 + (Math.abs(s.a) - 0.9) * 0.3; }
      let m = Math.hypot(dx, dy); dx /= m; dy /= m;
      let x = ax, y = ay;
      const RX = HEAD_RX * 1.12, RY = HEAD_RY * 1.1;
      const k = 1 - 0.3 * curl, Lf = free * k;
      for (let d = ds; d <= Lf + 0.01; d += ds) {
        dy += 0.02 * ds; m = Math.hypot(dx, dy); dx /= m; dy /= m;
        let nx = x + dx * ds, ny = y + dy * ds;
        const e = (nx / RX) ** 2 + (ny / RY) ** 2;
        if (e < 1) { const q = 1 / Math.sqrt(e); nx *= q; ny *= q; }
        if (ny > -10 && Math.abs(nx) < RX * 0.98) nx = Math.sign(nx || side) * RX * 0.98;
        x = nx; y = ny;
        pts.push(x, y, cur(d / k));
      }
    } else if (st === 'bun' || st === 'spacebuns') {
      const big = st === 'bun' ? 1 : 0.72;
      const Rb = clamp(Math.sqrt(this.avgL) * 3.1 * big, 24, 78 * big);
      const turns = 0.05 / big;
      const a00 = nIdx * 2.39996;
      for (let d = ds; d <= free + 0.01; d += ds) {
        const u = d / (free + 1);
        const R = Rb * (1 - 0.82 * u) * (0.55 + 0.45 * Math.min(1, d / 30));
        const an = a00 + d * turns;
        const cy = ay - Rb * 0.55;
        pts.push(ax + Math.cos(an) * R, cy + Math.sin(an) * R * 0.85, cur(d));
      }
      this.bunR = Rb;
    } else {   // braid
      const g = nIdx % 3;
      const Lb = this.avgL - 120;
      for (let d = ds; d <= free + 0.01; d += ds) {
        const w = 24 * clamp(1 - d / (Math.max(80, Lb) + 60), 0.25, 1);
        const bxp = ax + 6 + Math.sin(d * 0.01) * 8 + w * Math.sin(d * 0.12 + g * 2.094);
        pts.push(bxp, ay + d * 0.95, cur(d));
      }
    }
    s.pts = this.wiggle(s, pts, s.scalpN * 3, st === 'bun' || st === 'spacebuns' || st === 'braid' ? 0.35 : 1);
  }

  /** Add curl loops and messy frizz to a centre-line (from index `from` on). */
  wiggle(s, pts, from = 0, curlK = 1) {
    const n = pts.length / 3;
    const out = new Float32Array(pts.length);
    const curl = s.curl * curlK, messy = s.messy;
    for (let j = 0; j < n; j++) {
      let x = pts[j * 3], y = pts[j * 3 + 1];
      const d = pts[j * 3 + 2];
      if (j * 3 >= from && (curl > 0.02 || messy > 0.02)) {
        const j0 = Math.max(0, j - 1), j1 = Math.min(n - 1, j + 1);
        let tx = pts[j1 * 3] - pts[j0 * 3], ty = pts[j1 * 3 + 1] - pts[j0 * 3 + 1];
        const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        const nx = -ty, ny = tx;
        const dd = d - (from ? pts[from + 2] || 0 : 0);
        const ramp = Math.min(1, dd / 50);
        const amp = curl * 30 * ramp;
        const an = dd * 0.062 + s.ph;
        const mess = messy * (16 * Math.sin(dd * s.nf + s.ph2) + 9 * Math.sin(dd * s.nf * 2.7 + s.ph3)) * Math.min(1, dd / 35);
        x += nx * (amp * Math.sin(an) + mess) + tx * amp * 0.6 * Math.cos(an);
        y += ny * (amp * Math.sin(an) + mess) + ty * amp * 0.9 * Math.cos(an);
      }
      out[j * 3] = x; out[j * 3 + 1] = y; out[j * 3 + 2] = d;
    }
    return out;
  }

  // ---- queries -----------------------------------------------------------------
  colorAt(s, d) { return s.segs[Math.min(NSEG - 1, Math.max(0, Math.floor(d / SEG)))]; }

  /** Is (x, y) on the hair or the cap (head units)? */
  hitAny(x, y, r = 30) {
    if (this.onCap(x, y)) return true;
    const r2 = r * r;
    for (const s of this.strands) {
      const p = s.pts;
      for (let j = 0; j < p.length; j += 6) { const dx = p[j] - x, dy = p[j + 1] - y; if (dx * dx + dy * dy < r2) return true; }
    }
    return false;
  }
  onCap(x, y) {
    if ((x / HEAD_RX) ** 2 + (y / HEAD_RY) ** 2 > 1.1) return false;
    return y < hairlineY(x);
  }
  onHead(x, y, k = 1) { return (x / (HEAD_RX * k)) ** 2 + (y / (HEAD_RY * k)) ** 2 < 1; }

  /** Call fn(strand, pointIndex, d) for the points within r of (x, y). */
  near(x, y, r, fn, step = 1) {
    const r2 = r * r;
    for (const s of this.strands) {
      const p = s.pts;
      for (let j = 0; j < p.length; j += 3 * step) {
        const dx = p[j] - x, dy = p[j + 1] - y;
        if (dx * dx + dy * dy < r2) { if (fn(s, j / 3, p[j + 2]) === false) break; }
      }
    }
  }

  tip(s) { const p = s.pts, n = p.length; return n ? { x: p[n - 3], y: p[n - 2] } : { x: 0, y: 0 }; }

  // ---- stats -------------------------------------------------------------------
  avg(key, bangs = false) { let a = 0, n = 0; for (const s of this.strands) if (bangs ? s.bang : !s.bang) { a += s[key]; n++; } return n ? a / n : 0; }
  /** Share of visible segments by colour (for naming the look). */
  colourShare() {
    const m = new Map(); let total = 0, glit = 0, rainbow = 0;
    for (const s of this.strands) {
      const n = Math.ceil(s.L / SEG);
      for (let k = 0; k < n && k < NSEG; k++) {
        const c = s.segs[k]; m.set(c, (m.get(c) || 0) + 1); total++;
        if (s.glit[k]) glit++;
        if (s.rainbowSeg && s.rainbowSeg[k]) rainbow++;
      }
    }
    let best = null, bn = 0; for (const [c, n] of m) if (n > bn) { bn = n; best = c; }
    return { best, share: total ? bn / total : 0, glit: total ? glit / total : 0, rainbow: total ? rainbow / total : 0, colours: m.size };
  }

  // ---- drawing -----------------------------------------------------------------
  /** Draw layer 'back' (behind the head) or 'front' (over it) in head units. */
  drawLayer(g, layer, o = {}) {
    const list = [];
    for (const s of this.strands) {
      if (s.L < 10 || s.pts.length < 6) continue;
      if (layer === 'bangs') { if (s.bang) list.push([s, 0]); continue; }
      if (s.bang) continue;
      const back = this.style === 'ponytail';
      if (layer === 'back') { if (back) list.push([s, (s.scalpN || 1) - 1]); }
      else list.push([s, 0, back ? s.scalpN : 0]);
    }
    if (!list.length) return;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const wOf = (s) => (s.bang ? BANG_W : STRAND_W) * (o.thin || 1);
    const path = (s, from, to) => {
      const p = s.pts, end = to ? Math.min(p.length / 3, to + 1) : p.length / 3;
      g.beginPath(); g.moveTo(p[from * 3], p[from * 3 + 1]);
      for (let j = from + 1; j < end; j++) g.lineTo(p[j * 3], p[j * 3 + 1]);
      if (end - from === 1) g.lineTo(p[from * 3] + 0.1, p[from * 3 + 1]);
    };
    // 1. outline of the whole mass
    g.strokeStyle = NAVY;
    for (const [s, from, to] of list) { g.lineWidth = wOf(s) + 8; path(s, from, to); g.stroke(); }
    // 2. colour, run by run
    for (const [s, from, to] of list) {
      g.lineWidth = wOf(s);
      const p = s.pts, end = to ? Math.min(p.length / 3, to + 1) : p.length / 3;
      let j = from, c = this.colorAt(s, p[j * 3 + 2]);
      while (j < end - 1) {
        g.beginPath(); g.moveTo(p[j * 3], p[j * 3 + 1]);
        let k = j + 1;
        for (; k < end; k++) {
          g.lineTo(p[k * 3], p[k * 3 + 1]);
          const c2 = this.colorAt(s, p[k * 3 + 2]);
          if (c2 !== c) break;
        }
        g.strokeStyle = c; g.stroke();
        if (k >= end) break;
        j = k; c = this.colorAt(s, p[k * 3 + 2]);
      }
      if (end - from === 1) { g.strokeStyle = c; path(s, from, to); g.stroke(); }
    }
    // 3. strand lines (darker) and shine (brighter when brushed)
    for (const [s, from, to] of list) {
      g.lineWidth = Math.max(1.5, wOf(s) * 0.09);
      g.strokeStyle = 'rgba(36,22,63,0.22)';
      path(s, from, to); g.stroke();
    }
    for (const [s, from, to] of list) {
      const shine = 0.12 + 0.4 * (1 - s.messy);
      g.lineWidth = wOf(s) * 0.22;
      g.strokeStyle = `rgba(255,255,255,${shine.toFixed(2)})`;
      const p = s.pts, end = to ? Math.min(p.length / 3, to + 1) : p.length / 3;
      const a = from + Math.floor((end - from) * 0.15), b = from + Math.floor((end - from) * 0.55);
      if (b - a < 2) continue;
      g.beginPath(); g.moveTo(p[a * 3] - 5, p[a * 3 + 1]);
      for (let j = a + 1; j <= b; j++) g.lineTo(p[j * 3] - 5, p[j * 3 + 1]);
      g.stroke();
    }
  }

  /** A solid disc under each bun's coils so the bun reads as one round knot. */
  drawBunBase(g) {
    const st = this.style;
    if (st !== 'bun' && st !== 'spacebuns') return;
    const big = st === 'bun' ? 1 : 0.72;
    const Rb = clamp(Math.sqrt(this.avgL) * 3.1 * big, 24, 78 * big);
    const anchors = st === 'bun' ? [ell(0, 1.16)] : [ell(-0.72, 1.1), ell(0.72, 1.1)];
    const main = this.main;
    const col = main[Math.floor(main.length / 2)].segs[4];
    g.save(); g.lineWidth = 8; g.strokeStyle = NAVY; g.fillStyle = col;
    for (const [x, y] of anchors) { g.beginPath(); g.ellipse(x, y - Rb * 0.55, Rb * 0.95, Rb * 0.85, 0, 0, TAU); g.fill(); g.stroke(); }
    g.restore();
  }

  /** The cap of hair over the top of the head (drawn over the face, under the strands). */
  drawCap(g) {
    g.save();
    // cap shape: head ellipse above the hairline
    g.beginPath();
    const N = 28;
    for (let k = 0; k <= N; k++) { const x = lerp(-HEAD_RX * 1.02, HEAD_RX * 1.02, k / N); const y = hairlineY(x); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.ellipse(0, 0, HEAD_RX * 1.02, HEAD_RY * 1.02, 0, 0, -Math.PI, true);
    g.closePath();
    g.save(); g.clip();
    const main = this.strands.filter((s) => !s.bang);
    const xs = main.map((s) => Math.sin(s.a) * HEAD_RX);
    for (let k = 0; k < main.length; k++) {
      const x0 = k ? (xs[k - 1] + xs[k]) / 2 : -HEAD_RX * 1.2, x1 = k < main.length - 1 ? (xs[k] + xs[k + 1]) / 2 : HEAD_RX * 1.2;
      g.fillStyle = main[k].segs[0];
      g.fillRect(x0 - 0.5, -HEAD_RY * 1.2, x1 - x0 + 1, HEAD_RY * 1.4);
    }
    // combed lines from the parting (or toward the tie)
    g.strokeStyle = 'rgba(36,22,63,0.22)'; g.lineWidth = 2.5; g.lineCap = 'round';
    const st = this.style;
    const to = st === 'ponytail' ? ell(0.22, 1.1) : st === 'bun' ? ell(0, 1.1) : st === 'braid' ? ell(1.6, 1.02) : null;
    for (let k = 0; k < main.length; k += 2) {
      const s = main[k], rx = Math.sin(s.a) * HEAD_RX;
      const hy = hairlineY(rx);
      g.beginPath();
      if (to) { g.moveTo(rx * 0.9, hy - 4); g.quadraticCurveTo(rx * 0.5, -HEAD_RY * 0.75, to[0], to[1]); }
      else if (st === 'pigtails' || st === 'spacebuns') { const t2 = ell(st === 'pigtails' ? Math.sign(rx || 1) * 1.62 : Math.sign(rx || 1) * 0.72, 1.05); g.moveTo(rx * 0.9, hy - 4); g.quadraticCurveTo(rx * 0.7, -HEAD_RY * 0.6, t2[0], t2[1]); }
      else { g.moveTo(Math.sign(rx) * 6, -HEAD_RY * 0.98); g.quadraticCurveTo(rx * 0.95, -HEAD_RY * 0.9, rx * 0.95, hy - 4); }
      g.stroke();
    }
    // shine band
    const shine = 0.12 + 0.35 * (1 - this.avg('messy'));
    g.strokeStyle = `rgba(255,255,255,${(shine * 0.7).toFixed(2)})`; g.lineWidth = 7;
    g.beginPath(); g.ellipse(0, -HEAD_RY * 0.2, HEAD_RX * 0.8, HEAD_RY * 0.72, 0, -Math.PI * 0.78, -Math.PI * 0.6); g.stroke();
    g.restore();
    // hairline edge
    g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath();
    for (let k = 0; k <= N; k++) { const x = lerp(-HEAD_RX * 1.0, HEAD_RX * 1.0, k / N); const y = hairlineY(x); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    g.restore();
  }

  /** Hair ties at the anchors of the tied styles. */
  drawTies(g, tieColor = '#ff6fb1') {
    const st = this.style;
    const ties = st === 'ponytail' ? [ell(0.22, 1.14)] : st === 'pigtails' ? [ell(-1.62, 1.06), ell(1.62, 1.06)]
      : st === 'braid' ? [ell(1.95, 1.05)] : [];
    g.save(); g.strokeStyle = NAVY; g.lineWidth = 4;
    for (const [x, y] of ties) {
      g.fillStyle = tieColor;
      g.beginPath(); g.ellipse(x, y, 17, 11, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(x - 5, y - 4, 5, 3, -0.4, 0, TAU); g.fill();
    }
    if (st === 'braid') {
      // a bobble near the end of the braid
      const main = this.main;
      const lens = main.map((s) => s.pts.length / 3).sort((a, b) => a - b);
      const s = main.find((m) => m.pts.length / 3 === lens[Math.floor(lens.length * 0.3)]);
      if (s && s.pts.length / 3 > s.scalpN + 4) {
        const j = Math.max(s.scalpN, s.pts.length / 3 - 3);
        g.fillStyle = tieColor;
        g.beginPath(); g.arc(s.pts[j * 3], s.pts[j * 3 + 1], 13, 0, TAU); g.fill(); g.stroke();
      }
    }
    g.restore();
  }

  /** Twinkles on glittery segments (live, not cached). */
  drawGlitter(g, t) {
    for (const s of this.strands) {
      const p = s.pts;
      for (let j = 0, q = 0; j < p.length; j += 9, q++) {
        const k = Math.min(NSEG - 1, Math.floor(p[j + 2] / SEG));
        if (!s.glit[k]) continue;
        const tw = Math.sin(t * 5 + s.ph + q * 1.7);
        if (tw < 0.3) continue;
        const r = 3 + tw * 6;
        g.fillStyle = q % 2 ? '#ffffff' : '#fff6a8';
        g.beginPath();
        g.moveTo(p[j], p[j + 1] - r); g.lineTo(p[j] + r * 0.28, p[j + 1]); g.lineTo(p[j], p[j + 1] + r); g.lineTo(p[j] - r * 0.28, p[j + 1]); g.closePath();
        g.moveTo(p[j] - r, p[j + 1]); g.lineTo(p[j], p[j + 1] + r * 0.28); g.lineTo(p[j] + r, p[j + 1]); g.lineTo(p[j], p[j + 1] - r * 0.28); g.closePath();
        g.fill();
      }
    }
  }
}

/** A strand grew from oldL: the new length takes the colour of its old tip (glitter and rainbow too). */
export function extendColour(s, oldL) {
  const from = Math.max(0, Math.floor((oldL - 1) / SEG)), to = Math.min(s.segs.length - 1, Math.floor((s.L - 1) / SEG));
  for (let k = from + 1; k <= to; k++) {
    s.segs[k] = s.segs[from]; s.glit[k] = s.glit[from];
    if (s.rainbowSeg) s.rainbowSeg[k] = s.rainbowSeg[from];
  }
}

/** Paint one segment-range of a strand with a hair colour id. */
export function paintSeg(s, k, col) {
  if (k < 0 || k >= s.segs.length) return false;
  if (col.id === 'glitter') { if (s.glit[k]) return false; s.glit[k] = 1; return true; }
  const c = col.id === 'rainbow' ? RAINBOW[s.i % RAINBOW.length] : col.c;
  if (!s.rainbowSeg) s.rainbowSeg = new Uint8Array(s.segs.length);
  const was = s.segs[k];
  s.segs[k] = c;
  s.rainbowSeg[k] = col.id === 'rainbow' ? 1 : 0;
  return was !== c;
}
