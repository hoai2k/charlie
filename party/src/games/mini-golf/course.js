// Candy Mini-Golf: the three holes, the ball physics shared by the live game,
// the aim guide and the CPU shot search, and the CPU's path-distance field.
//
// World units are the 1920x1080 stage. The course is seen top-down: rails
// are candy-cane segments, gumdrops are round bumpers, the lollipop spinner
// turns at a fixed speed (so its blades are a pure function of time).
import { clamp, TAU } from '../../engine/util.js';

export const BALL_R = 15;
export const CUP_R = 23;
export const WALL_R = 10;          // half thickness of a candy-cane rail
export const VMIN = 110, VMAX = 1700;
const FRIC_K = 0.9, FRIC_A = 150;  // speed' = speed * e^(-K dt) - A dt
const STOP_V = 7;
const WALL_E = 0.78, BALL_E = 0.93, BUMP_BOOST = 170;
const SINK_V = 640;                // faster than this over the cup: lip-out
const MAGNET_R = 70;
const JELLY_VZ = 520, GRAV = 1800;

const box = (x0, y0, x1, y1, c) => [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];

// Each hole: outline (closed rail polygon), inner rails, tee, cup, obstacles.
// tee: centre of the tee spots (players line up in one column 'sp1' apart, or
// two staggered columns 'sp' apart above 4 players).
// gallery: where finished players stand and cheer (x of the first spot, step).
export const HOLES = [
  {
    name: 'Gumdrop Garden',
    tip: 'Bounce off the gumdrops - watch out for the spinning lollipops!',
    outline: box(110, 250, 1810, 920, 90),
    walls: [],
    tee: { x: 370, y: 585, sp: 80, sp1: 130 },
    cup: { x: 1630, y: 585 },
    gallery: { x: 1630, step: -118 },
    bumpers: [
      { x: 690, y: 420, r: 36, c: 0 }, { x: 690, y: 750, r: 36, c: 1 }, { x: 900, y: 585, r: 40, c: 2 },
      { x: 1090, y: 395, r: 36, c: 3 }, { x: 1090, y: 775, r: 36, c: 4 },
    ],
    spinner: { x: 1350, y: 470, L: 150, w: 1.25 },
  },
  {
    name: 'Chocolate River',
    tip: 'Cross on the cookie bridge - or bounce over on the jelly!',
    outline: box(110, 250, 1810, 920, 90),
    walls: [],
    tee: { x: 370, y: 585, sp: 80, sp1: 130 },
    cup: { x: 1610, y: 600 },
    gallery: { x: 1630, step: -118 },
    bumpers: [{ x: 1430, y: 470, r: 34, c: 1 }, { x: 1430, y: 740, r: 34, c: 3 }, { x: 1250, y: 860, r: 30, c: 0 }],
    river: { cx: 960, w: 150, amp: 22, freq: 0.011 },
    bridge: { x0: 850, x1: 1070, y0: 330, y1: 445 },
    jelly: { x: 690, y: 770, r: 60 },
  },
  {
    name: 'Donut Shortcut',
    tip: 'Roll into the pink donut to pop out by the cup!',
    outline: box(110, 250, 1810, 920, 90),
    walls: [[110, 585, 1240, 585]],
    tee: { x: 340, y: 752, sp: 66, sp1: 88 },
    cup: { x: 330, y: 418 },
    gallery: { x: 330, step: 118 },
    bumpers: [{ x: 560, y: 335, r: 32, c: 2 }, { x: 560, y: 505, r: 32, c: 4 }, { x: 1000, y: 330, r: 36, c: 0 }, { x: 1150, y: 480, r: 34, c: 1 }, { x: 1120, y: 690, r: 32, c: 3 }],
    slope: { x0: 1265, y0: 600, x1: 1810, y1: 920, ax: 0, ay: -330 },
    donut: { a: { x: 930, y: 805 }, b: { x: 780, y: 418, dir: Math.PI } },
  },
];

// --- geometry helpers -----------------------------------------------------------
export function segments(hole) {
  if (hole._segs) return hole._segs;
  const s = [];
  const o = hole.outline;
  for (let i = 0; i < o.length; i++) { const a = o[i], b = o[(i + 1) % o.length]; s.push([a[0], a[1], b[0], b[1]]); }
  for (const w of hole.walls) s.push(w);
  hole._segs = s;
  return s;
}

export function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return [ax + dx * t, ay + dy * t];
}

export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const riverX = (rv, y) => rv.cx + Math.sin(y * rv.freq) * rv.amp;
export function inRiver(hole, x, y) {
  const rv = hole.river;
  if (!rv) return false;
  if (Math.abs(x - riverX(rv, y)) > rv.w / 2) return false;
  const b = hole.bridge;
  return !(b && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);
}
export const onSlope = (hole, x, y) => { const s = hole.slope; return !!s && x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1; };

/** Spinner blade angle at time t (blade k adds k * 90 degrees). */
export const spinAngle = (sp, t) => t * sp.w;
export const HUB_R = 30, BLADE_W = 8, POP_R = 28;

/** Roll distance on flat felt for a putt at speed v0 (closed form of the friction model). */
export function rollDistance(v0) {
  const c = FRIC_A / FRIC_K;
  const ts = Math.log((v0 + c) / c) / FRIC_K;
  return ((v0 + c) * (1 - Math.exp(-FRIC_K * ts))) / FRIC_K - c * ts;
}
export const powerToSpeed = (p) => VMIN + (VMAX - VMIN) * clamp(p, 0, 1);
/** Meter power that rolls `d` px on flat felt. */
export function powerForDistance(d) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (rollDistance(powerToSpeed(m)) < d) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// --- the ball step --------------------------------------------------------------
// A ball: { x, y, vx, vy, z, vz, jellyLock }. `ctx` = { hole, t (spinner time),
// spinner: bool, ev(type, x, y, strength, extra) | null, rng() }.
// Returns null, or an event that ends normal rolling: 'sink' | 'splash' | 'warp'.
// (Leaving the course is checked once per frame by the caller: pointInPoly.)

function bounceCircle(b, cx, cy, r, e, boost, ctx, kind) {
  const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
  const min = r + BALL_R;
  if (d >= min || d < 0.0001) return;
  const nx = dx / d, ny = dy / d;
  b.x = cx + nx * min; b.y = cy + ny * min;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    if (boost) { b.vx += nx * boost; b.vy += ny * boost; }
    if (ctx.ev) ctx.ev(kind, cx + nx * r, cy + ny * r, -vn, { cx, cy });
  }
}

function bounceMoving(b, px, py, rad, bvx, bvy, e, ctx, kind) {
  // collide against a point/segment-closest-point (px, py) of thickness rad that moves at (bvx, bvy)
  const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy);
  const min = rad + BALL_R;
  if (d >= min) return;
  const nx = d > 0.0001 ? dx / d : 1, ny = d > 0.0001 ? dy / d : 0;
  b.x = px + nx * min; b.y = py + ny * min;
  const rvx = b.vx - bvx, rvy = b.vy - bvy, vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    if (ctx.ev) ctx.ev(kind, px + nx * rad, py + ny * rad, -vn);
  }
}

export function stepBall(b, h, ctx) {
  const hole = ctx.hole;
  const air = b.z > 0 || b.vz > 0;
  // forces
  if (!air) {
    if (hole.slope && !b.pinned && onSlope(hole, b.x, b.y)) { b.vx += hole.slope.ax * h; b.vy += hole.slope.ay * h; }
    const cdx = hole.cup.x - b.x, cdy = hole.cup.y - b.y, cd = Math.hypot(cdx, cdy);
    if (cd < MAGNET_R && cd > 0.5 && Math.hypot(b.vx, b.vy) < 300) {
      const k = (260 + 900 * (1 - cd / MAGNET_R)) * h;
      b.vx += (cdx / cd) * k; b.vy += (cdy / cd) * k;
    }
  }
  b.x += b.vx * h; b.y += b.vy * h;
  // rails
  for (const s of segments(hole)) {
    const [cx, cy] = closestOnSeg(b.x, b.y, s[0], s[1], s[2], s[3]);
    const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), min = WALL_R + BALL_R;
    if (d < min && d > 0.0001) {
      const nx = dx / d, ny = dy / d;
      b.x = cx + nx * min; b.y = cy + ny * min;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + WALL_E) * vn * nx; b.vy -= (1 + WALL_E) * vn * ny;
        b.vx *= 0.97; b.vy *= 0.97;
        if (ctx.ev) ctx.ev('rail', cx, cy, -vn);
      }
    }
  }
  if (!air) {
    for (const bp of hole.bumpers) bounceCircle(b, bp.x, bp.y, bp.r, 1.0, BUMP_BOOST, ctx, 'bumper');
    const sp = hole.spinner;
    if (sp && ctx.spinner !== false) {
      bounceCircle(b, sp.x, sp.y, HUB_R, 0.6, 0, ctx, 'hub');
      const a0 = spinAngle(sp, ctx.t);
      for (let k = 0; k < 4; k++) {
        const a = a0 + (k * TAU) / 4, ca = Math.cos(a), sa = Math.sin(a);
        const tx = sp.x + ca * (sp.L - POP_R), ty = sp.y + sa * (sp.L - POP_R);
        const [px, py] = closestOnSeg(b.x, b.y, sp.x, sp.y, tx, ty);
        // blade point velocity = w x r
        bounceMoving(b, px, py, BLADE_W, -sp.w * (py - sp.y), sp.w * (px - sp.x), 0.75, ctx, 'blade');
        bounceMoving(b, tx, ty, POP_R, -sp.w * (ty - sp.y), sp.w * (tx - sp.x), 0.85, ctx, 'blade');
      }
    }
  }
  // flight (jelly hop)
  if (air) {
    b.vz -= GRAV * h; b.z += b.vz * h;
    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -160) { b.vz = -b.vz * 0.3; if (ctx.ev) ctx.ev('land', b.x, b.y, 1); }
      else b.vz = 0;
    }
  } else {
    // friction
    const s = Math.hypot(b.vx, b.vy);
    if (s > 0) {
      const ns = Math.max(0, s * Math.exp(-FRIC_K * h) - FRIC_A * h);
      const cd = Math.hypot(hole.cup.x - b.x, hole.cup.y - b.y);
      if (ns < STOP_V && (b.pinned || !(hole.slope && onSlope(hole, b.x, b.y))) && cd > CUP_R + 6) { b.vx = 0; b.vy = 0; }
      else { b.vx *= ns / s; b.vy *= ns / s; }
    }
  }
  // hazards and specials (only while rolling on the felt)
  if (!(b.z > 0)) {
    const cd = Math.hypot(hole.cup.x - b.x, hole.cup.y - b.y);
    const s = Math.hypot(b.vx, b.vy);
    if (cd < CUP_R - 3) {
      if (s < SINK_V) return 'sink';
      if (!b.lipLock) {
        // too fast: rattle over the lip and hop out
        b.lipLock = true;
        const a = Math.atan2(b.vy, b.vx) + (ctx.rng ? (ctx.rng() - 0.5) : 0.25);
        b.vx = Math.cos(a) * s * 0.72; b.vy = Math.sin(a) * s * 0.72; b.vz = 160;
        if (ctx.ev) ctx.ev('lip', b.x, b.y, s);
      }
    } else if (cd > CUP_R + 10) b.lipLock = false;
    if (hole.river && inRiver(hole, b.x, b.y)) return 'splash';
    const j = hole.jelly;
    if (j) {
      const jd = Math.hypot(b.x - j.x, b.y - j.y);
      if (jd < j.r - 14 && !b.jellyLock && s > 30) {
        b.jellyLock = true;
        const ns = clamp(Math.max(s * 1.1, 840), 0, 1500);
        b.vx *= ns / s; b.vy *= ns / s; b.vz = JELLY_VZ; b.z = 0.01;
        if (ctx.ev) ctx.ev('jelly', j.x, j.y, ns);
      } else if (jd > j.r + 4) b.jellyLock = false;
    }
    const dn = hole.donut;
    if (dn && Math.hypot(b.x - dn.a.x, b.y - dn.a.y) < 32) return 'warp';
  }
  return null;
}

/** Substep count for a frame of length dt at speed s (max ~6 px per substep). */
export const substeps = (s, dt, px = 6) => clamp(Math.ceil((s * dt) / px), 1, 12);

/** Warp a ball out of the exit donut. */
export function warpOut(b, hole, jitter = 0) {
  const dn = hole.donut, s = Math.hypot(b.vx, b.vy);
  const ns = clamp(s * 0.8, 420, 900);
  const a = Math.atan2(hole.cup.y - dn.b.y, hole.cup.x - dn.b.x) * 0.5 + dn.b.dir * 0.5 + jitter;
  b.x = dn.b.x + Math.cos(a) * 30; b.y = dn.b.y + Math.sin(a) * 30;
  b.vx = Math.cos(a) * ns; b.vy = Math.sin(a) * ns; b.z = 0; b.vz = 0;
}

/**
 * Simulate one putt from (x, y) with velocity (vx, vy), ignoring other balls.
 * opts: { t0 (spinner time at the start), spinner (collide with it), record
 * (spacing in px for path points), maxT }. Returns { x, y, end, path, dist }.
 */
export function simulate(hole, x, y, vx, vy, opts = {}) {
  const b = { x, y, vx, vy, z: 0, vz: 0, jellyLock: false, lipLock: false };
  const dt = opts.dt || 1 / 60, maxT = opts.maxT ?? 4.5;
  const ctx = { hole, t: opts.t0 || 0, spinner: !!opts.spinner, ev: null, rng: null };
  const path = opts.record ? [{ x, y, z: 0 }] : null;
  let acc = 0, dist = 0, lx = x, ly = y, end = null, warped = false;
  for (let t = 0; t < maxT; t += dt) {
    const s = Math.hypot(b.vx, b.vy);
    if (s === 0 && !(b.z > 0) && !(hole.slope && onSlope(hole, b.x, b.y))) break;
    const n = substeps(s, dt, opts.px || 6), h = dt / n;
    for (let i = 0; i < n && !end; i++) {
      ctx.t = (opts.t0 || 0) + t + i * h;
      const e = stepBall(b, h, ctx);
      if (e === 'warp' && !warped) {
        warped = true; warpOut(b, hole, 0);
        if (path) path.push({ x: NaN, y: NaN, z: 0 });
        lx = b.x; ly = b.y;
      } else if (e) end = e;
    }
    const step = Math.hypot(b.x - lx, b.y - ly);
    dist += step; acc += step; lx = b.x; ly = b.y;
    if (path && acc >= opts.record) { acc = 0; path.push({ x: b.x, y: b.y, z: b.z }); }
    if (!end && !pointInPoly(b.x, b.y, hole.outline)) end = 'oob';
    if (end) break;
  }
  if (path) path.push({ x: b.x, y: b.y, z: b.z });
  return { x: b.x, y: b.y, end, path, dist, warped };
}

// --- CPU helper: grid distance-to-cup field --------------------------------------
const CELL = 24;
export function buildField(hole) {
  const cols = Math.ceil(1920 / CELL), rows = Math.ceil(1080 / CELL);
  const blocked = new Uint8Array(cols * rows);
  const segs = segments(hole);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2;
    let bad = !pointInPoly(x, y, hole.outline) || inRiver(hole, x, y);
    if (!bad) for (const s of segs) { const [px, py] = closestOnSeg(x, y, s[0], s[1], s[2], s[3]); if (Math.hypot(x - px, y - py) < WALL_R + BALL_R) { bad = true; break; } }
    if (!bad) for (const bp of hole.bumpers) if (Math.hypot(x - bp.x, y - bp.y) < bp.r + BALL_R) { bad = true; break; }
    if (!bad && hole.spinner && Math.hypot(x - hole.spinner.x, y - hole.spinner.y) < HUB_R + BALL_R) bad = true;
    blocked[r * cols + c] = bad ? 1 : 0;
  }
  // Float64: a Float32 store rounds some sums down, so `d > dist[i]` skipped those cells
  // and only straight runs from the cup were ever reached.
  const dist = new Float64Array(cols * rows).fill(1e9);
  const ci = (x, y) => clamp(Math.floor(y / CELL), 0, rows - 1) * cols + clamp(Math.floor(x / CELL), 0, cols - 1);
  const start = ci(hole.cup.x, hole.cup.y);
  dist[start] = 0;
  // Dijkstra with a small binary heap
  const heap = [[0, start]];
  const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    const c = i % cols, r = (i / cols) | 0;
    for (const [dc, dr, w] of N8) {
      const c2 = c + dc, r2 = r + dr;
      if (c2 < 0 || r2 < 0 || c2 >= cols || r2 >= rows) continue;
      const j = r2 * cols + c2;
      if (blocked[j]) continue;
      const nd = d + w * CELL;
      if (nd < dist[j]) { dist[j] = nd; push([nd, j]); }
    }
  }
  return {
    cols, rows, blocked, dist,
    at(x, y) {
      const c = clamp(Math.floor(x / CELL), 0, cols - 1), r = clamp(Math.floor(y / CELL), 0, rows - 1);
      let best = dist[r * cols + c];
      if (best >= 1e9) {
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
          const c2 = c + dc, r2 = r + dr;
          if (c2 < 0 || r2 < 0 || c2 >= cols || r2 >= rows) continue;
          best = Math.min(best, dist[r2 * cols + c2] + Math.hypot(dc, dr) * CELL);
        }
      }
      if (best >= 1e9) return 5000;
      // near the cup the straight-line distance is finer than the grid
      return best < 200 ? Math.min(best, Math.hypot(x - hole.cup.x, y - hole.cup.y)) : best;
    },
    /** Walk downhill from (x, y); returns points along the shortest route. */
    route(x, y, steps = 140) {
      const pts = [];
      let c = clamp(Math.floor(x / CELL), 0, cols - 1), r = clamp(Math.floor(y / CELL), 0, rows - 1);
      for (let k = 0; k < steps; k++) {
        let bi = -1, bd = dist[r * cols + c];
        for (const [dc, dr] of N8) {
          const c2 = c + dc, r2 = r + dr;
          if (c2 < 0 || r2 < 0 || c2 >= cols || r2 >= rows) continue;
          const j = r2 * cols + c2;
          if (dist[j] < bd) { bd = dist[j]; bi = j; }
        }
        if (bi < 0) break;
        c = bi % cols; r = (bi / cols) | 0;
        pts.push({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
        if (bd === 0) break;
      }
      return pts;
    },
    /** True if a ball could roll straight from a to b without touching anything blocked. */
    clear(ax, ay, bx, by) {
      const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 12);
      for (let i = 1; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n, y = ay + ((by - ay) * i) / n;
        const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
        if (c < 0 || r < 0 || c >= cols || r >= rows || blocked[r * cols + c]) return false;
      }
      return true;
    },
  };
}

/** Tee spots for n balls: one column for up to 4, two staggered columns above that. */
export function teeSpots(hole, n) {
  const T = hole.tee, out = [];
  const cols = n <= 4 ? 1 : 2, perCol = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const col = cols === 1 ? 0 : i % 2, row = cols === 1 ? i : Math.floor(i / 2);
    // 7-8 players: columns and rows a bit further apart (still on the tee mat)
    const big = n > 6, dx = big ? 66 : 48;
    const x = T.x + (cols === 1 ? 0 : col === 0 ? -dx : dx);
    const sp = cols === 1 ? T.sp1 : T.sp * (big ? 1.25 : 1);
    const y = T.y + (row - (perCol - 1) / 2) * sp + (cols === 2 ? (col === 0 ? -sp * 0.25 : sp * 0.25) : 0);
    out.push({ x, y });
  }
  return out;
}
