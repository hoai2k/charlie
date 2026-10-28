// Gingerbread House: the houses (shapes, pieces, icing edges), candy and drawing.
// Everything is in house units: (0, 0) is the middle of the house's base, up is -y.
// Art (image-requests.md, "gingerbread-house"): each piece key is a 960x880 canvas drawn at
// the box BOX (2 px per unit, unit (0, 0) at pixel (480, 880)); windows and doors are holes in
// it, so the glass and the door are drawn behind the piece. Every key has a drawn fallback.
import * as ui from '../../engine/ui.js';
import { art } from '../../engine/art.js';
import { RAINBOW } from '../../engine/particles.js';
import { clamp, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
const GB = '#c98345', GB_ROOF = '#b9713a', GB_EDGE = 'rgba(120,56,20,0.45)';
export const BOX = { x: -240, y: -440, w: 480, h: 440 };
export const BOARD_W = 540;
export const CANDY_S = 1.5;   // candies are drawn this much bigger than their units below
const STEP = 7;   // icing samples along an edge, in units

// --- geometry -----------------------------------------------------------------------------
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
const rectPoly = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** A roof plank lying on the slope p0 (eave) -> p1 (ridge), overhanging the eave by `ov`. */
function slab(p0, p1, ov, th) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy), d = [dx / L, dy / L];
  let n = [d[1], -d[0]];
  if (n[1] > 0) n = [-n[0], -n[1]];
  const ovR = (th * Math.abs(n[0])) / Math.abs(d[0]);   // the outer corners meet over the ridge
  const a = [p0[0] - d[0] * ov, p0[1] - d[1] * ov], b = [p1[0] + d[0] * ovR, p1[1] + d[1] * ovR];
  const c = [b[0] + n[0] * th, b[1] + n[1] * th], e = [a[0] + n[0] * th, a[1] + n[1] * th];
  return { poly: [a, b, c, e], top: [e, c], seam: [p0, p1] };
}
function roofPair(p0, p1, ov, th) {
  const L = slab(p0, p1, ov, th);
  const R = { poly: mirror(L.poly), top: mirror(L.top), seam: mirror(L.seam) };
  return [L, R];
}

// holes: rect {x, y, w, h}, arch {x, y, w, h} (top is a half circle), round {cx, cy, r}
const win = (x, y, w, h) => ({ t: 'rect', x, y, w, h });
const arch = (x, y, w, h, door = false) => ({ t: 'arch', x, y, w, h, door });
const round = (cx, cy, r) => ({ t: 'round', cx, cy, r });

function holeOutline(h, closed = true) {
  if (h.t === 'rect') return { pts: rectPoly(h.x, h.y, h.x + h.w, h.y + h.h), closed: true };
  if (h.t === 'round') return { pts: Array.from({ length: 24 }, (_, i) => [h.cx + Math.cos((i / 24) * TAU) * h.r, h.cy + Math.sin((i / 24) * TAU) * h.r]), closed: true };
  const r = h.w / 2, cx = h.x + r, cy = h.y + r, pts = [[h.x, h.y + h.h]];
  for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  pts.push([h.x + h.w, h.y + h.h]);
  return { pts, closed: closed && !h.door };
}
export function holePath(g, h) {
  if (h.t === 'rect') { g.rect(h.x, h.y, h.w, h.h); return; }
  if (h.t === 'round') { g.moveTo(h.cx + h.r, h.cy); g.arc(h.cx, h.cy, h.r, 0, TAU); return; }
  const r = h.w / 2;
  g.moveTo(h.x, h.y + h.h); g.lineTo(h.x, h.y + r); g.arc(h.x + r, h.y + r, r, Math.PI, 0); g.lineTo(h.x + h.w, h.y + h.h); g.closePath();
}

function cottage() {
  const [rl, rr] = roofPair([-150, -170], [0, -300], 34, 30);
  const wall = [[-150, 0], [150, 0], [150, -170], [0, -300], [-150, -170]];
  return {
    id: 'cottage', name: 'Cottage',
    pieces: [
      { id: 'wall', name: 'Wall', poly: wall, z: 1, holes: [arch(-36, -112, 72, 112, true), win(-118, -150, 52, 54), win(66, -150, 52, 54), round(0, -218, 24)],
        seam: [[-150, 0], [150, 0]], edges: [{ pts: [[-150, 0], [150, 0]] }, { pts: [[-150, 0], [-150, -170]] }, { pts: [[150, 0], [150, -170]] }] },
      { id: 'roof-left', name: 'Roof', poly: rl.poly, z: 2, roof: true, seam: rl.seam, edges: [{ pts: rl.top, roof: true }] },
      { id: 'roof-right', name: 'Roof', poly: rr.poly, z: 3, roof: true, seam: rr.seam, edges: [{ pts: rr.top, roof: true }] },
      { id: 'chimney', name: 'Chimney', poly: rectPoly(62, -318, 104, -200), z: 0, seam: null, edges: [{ pts: [[60, -318], [106, -318]] }] },
    ],
  };
}
function tall() {
  const [rl, rr] = roofPair([-105, -300], [0, -410], 30, 28);
  // Keep the entire roof inside the shared 960x880 art canvas (top = -440).
  // Apply the same correction to collision, glue seams and icing paths.
  for (const roof of [rl, rr]) for (const field of ['poly', 'top', 'seam']) {
    roof[field] = roof[field].map(([x, y]) => [x, y + 13]);
  }
  return {
    id: 'tall', name: 'Tall House',
    pieces: [
      { id: 'wall', name: 'Wall', poly: [[-105, 0], [105, 0], [105, -300], [0, -410], [-105, -300]], z: 1,
        holes: [arch(-30, -104, 60, 104, true), win(-78, -196, 48, 56), win(30, -196, 48, 56), win(-78, -280, 48, 52), win(30, -280, 48, 52), round(0, -338, 20)],
        seam: [[-105, 0], [105, 0]], edges: [{ pts: [[-105, 0], [105, 0]] }, { pts: [[-105, 0], [-105, -300]] }, { pts: [[105, 0], [105, -300]] }] },
      { id: 'roof-left', name: 'Roof', poly: rl.poly, z: 2, roof: true, seam: rl.seam, edges: [{ pts: rl.top, roof: true }] },
      { id: 'roof-right', name: 'Roof', poly: rr.poly, z: 3, roof: true, seam: rr.seam, edges: [{ pts: rr.top, roof: true }] },
      { id: 'porch', name: 'Porch', poly: rectPoly(-50, -124, 50, -106), z: 4, roof: true, seam: [[-34, -106], [34, -106]], edges: [{ pts: [[-52, -124], [52, -124]], roof: true }] },
    ],
  };
}
function castle() {
  const keep = [[-126, 0], [126, 0], [126, -200]];
  for (const cx of [100, 50, 0, -50, -100]) keep.push([cx + 15, -200], [cx + 15, -228], [cx - 15, -228], [cx - 15, -200]);
  keep.push([-126, -200]);
  const top = keep.slice(2);
  const cone = [[-226, -282], [-106, -282], [-166, -420]];
  return {
    id: 'castle', name: 'Castle',
    pieces: [
      { id: 'tower-left', name: 'Tower', poly: rectPoly(-210, -290, -122, 0), z: 0, holes: [arch(-176, -250, 20, 54)],
        seam: [[-210, 0], [-122, 0]], edges: [{ pts: [[-210, 0], [-210, -284]] }] },
      { id: 'tower-right', name: 'Tower', poly: rectPoly(122, -290, 210, 0), z: 0, holes: [arch(156, -250, 20, 54)],
        seam: [[122, 0], [210, 0]], edges: [{ pts: [[210, 0], [210, -284]] }] },
      { id: 'keep', name: 'Wall', poly: keep, z: 1, holes: [arch(-40, -128, 80, 128, true), arch(-104, -170, 30, 52), arch(74, -170, 30, 52)],
        seam: [[-126, 0], [126, 0]], edges: [{ pts: top, roof: true }, { pts: [[-126, 0], [126, 0]] }] },
      { id: 'cone-left', name: 'Tower roof', poly: cone, z: 2, roof: true, seam: [[-210, -290], [-122, -290]], edges: [{ pts: [cone[0], cone[2], cone[1]], roof: true }] },
      { id: 'cone-right', name: 'Tower roof', poly: mirror(cone), z: 2, roof: true, seam: [[122, -290], [210, -290]], edges: [{ pts: mirror([cone[0], cone[2], cone[1]]), roof: true }] },
    ],
  };
}

/** Points every STEP units along a polyline (closed loops come back to their start). */
function resample(pts, closed) {
  const P = closed ? [...pts, pts[0]] : pts, out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / STEP));
    for (let j = 0; j < n; j++) out.push([x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n]);
  }
  out.push(P[P.length - 1]);
  return out;
}

function finish(shape) {
  shape.edges = [];
  shape.windows = [];
  shape.pieces.forEach((pc, i) => {
    pc.index = i;
    pc.holes = pc.holes || [];
    pc.art = `prop/gh-${shape.id}-${pc.id}`;
    for (const e of pc.edges) shape.edges.push({ piece: i, roof: !!e.roof, closed: false, pts: resample(e.pts, false) });
    for (const h of pc.holes) {
      const o = holeOutline(h);
      shape.edges.push({ piece: i, hole: true, closed: o.closed, pts: resample(o.pts, o.closed) });
      if (!h.door) shape.windows.push({ piece: i, h });
      else shape.door = { piece: i, h };
    }
    const xs = pc.poly.map((p) => p[0]), ys = pc.poly.map((p) => p[1]);
    pc.bb = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  shape.order = shape.pieces.slice().sort((a, b) => a.z - b.z || a.index - b.index);
  shape.top = Math.min(...shape.pieces.map((p) => p.bb.y0));
  return shape;
}
export const SHAPES = [finish(cottage()), finish(tall()), finish(castle())];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inHole(x, y, h) {
  if (h.t === 'rect') return x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h;
  if (h.t === 'round') return Math.hypot(x - h.cx, y - h.cy) < h.r;
  const r = h.w / 2;
  if (x < h.x || x > h.x + h.w || y > h.y + h.h) return false;
  return y > h.y + r || Math.hypot(x - h.x - r, y - h.y - r) < r;
}
/** Is (x, y) on a placed piece of this house (not in a window or the door)? */
export function onHouse(shape, built, x, y) {
  let hit = false;
  for (const pc of shape.order) {
    if (pc.index >= built) continue;
    if (!inPoly(x, y, pc.poly)) continue;
    hit = !pc.holes.some((h) => inHole(x, y, h));   // a later (front) piece decides
  }
  return hit;
}
/** Where something let go of at (x, y) ends up: stuck where it is on the house, else down on the board. */
export function landing(shape, built, x, y) {
  if (onHouse(shape, built, x, y)) return { x, y, stuck: true };
  return { x, y: Math.max(y, 10), stuck: y >= 10 };
}

/** The nearest icing edge point to (x, y) within r: { e, j, d }. */
export function nearestEdge(shape, built, x, y, r) {
  let best = null;
  shape.edges.forEach((e, ei) => {
    if (e.piece >= built) return;
    e.pts.forEach(([px, py], j) => {
      const d = Math.hypot(px - x, py - y);
      if (d < r && (!best || d < best.d)) best = { e: ei, j, d };
    });
  });
  return best;
}

// --- icing -------------------------------------------------------------------------------
export const ICINGS = [
  { id: 'white', name: 'Snow white', c: '#ffffff', style: 'line' },
  { id: 'drips', name: 'Snowy drips', c: '#ffffff', style: 'drips' },
  { id: 'pearls', name: 'Pearl dots', c: '#fff4e6', style: 'dots' },
  { id: 'pink', name: 'Pink', c: '#ff8fc8', style: 'line' },
  { id: 'mint', name: 'Mint', c: '#86e6bd', style: 'line' },
  { id: 'lemon', name: 'Lemon dots', c: '#ffe066', style: 'dots' },
  { id: 'choc', name: 'Chocolate', c: '#7a4426', style: 'line' },
  { id: 'rainbow', name: 'Rainbow', c: '#ff6fb1', style: 'line', rainbow: true },
];
export const icingColor = (k, j = 0) => (ICINGS[k].rainbow ? RAINBOW[Math.floor(j / 3) % RAINBOW.length] : ICINGS[k].c);
const hash = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

export function newIcing(shape) { return shape.edges.map((e) => new Uint8Array(e.pts.length)); }

function strokeRun(g, pts, a, b, k) {
  const ic = ICINGS[k];
  g.lineCap = 'round'; g.lineJoin = 'round';
  const path = () => { g.beginPath(); g.moveTo(pts[a][0], pts[a][1]); for (let j = a + 1; j <= b; j++) g.lineTo(pts[j][0], pts[j][1]); };
  if (ic.style === 'dots') {
    for (let j = a; j <= b; j += 2) {
      const [x, y] = pts[j];
      g.beginPath(); g.arc(x, y, 5.4, 0, TAU); g.fillStyle = icingColor(k, j); g.fill();
      g.lineWidth = 1.6; g.strokeStyle = 'rgba(36,22,63,0.55)'; g.stroke();
      g.beginPath(); g.arc(x - 1.6, y - 1.8, 1.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
    }
    return;
  }
  if (ic.style === 'drips') {
    for (let j = a; j <= b; j++) {
      if (hash(j * 7.3 + a) > 0.34) continue;
      const [x, y] = pts[j], len = 6 + hash(j + 3.1) * 12;
      g.beginPath(); g.moveTo(x - 3.6, y); g.lineTo(x - 3.6, y + len); g.arc(x, y + len, 3.6, Math.PI, 0, true); g.lineTo(x + 3.6, y); g.closePath();
      g.fillStyle = ic.c; g.fill(); g.lineWidth = 1.6; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.stroke();
    }
  }
  path(); g.lineWidth = 11; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.stroke();
  if (ic.rainbow) {
    g.lineWidth = 8;
    for (let j = a; j < b; j++) { g.beginPath(); g.moveTo(pts[j][0], pts[j][1]); g.lineTo(pts[j + 1][0], pts[j + 1][1]); g.strokeStyle = icingColor(k, j); g.stroke(); }
  } else { path(); g.lineWidth = 8; g.strokeStyle = ic.c; g.stroke(); }
  g.save(); g.translate(-1.2, -1.6); path(); g.lineWidth = 2.4; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke(); g.restore();
}

/** Every iced run of every edge whose piece is placed. */
export function drawIcing(g, shape, built, icing) {
  shape.edges.forEach((e, ei) => {
    if (e.piece >= built) return;
    const arr = icing[ei];
    let j = 0;
    while (j < arr.length) {
      if (!arr[j]) { j++; continue; }
      const k = arr[j] - 1;
      let b = j;
      while (b + 1 < arr.length && arr[b + 1] === arr[j]) b++;
      if (b === j && b + 1 < arr.length && arr[b + 1]) b++;   // a single sample joins its neighbour
      strokeRun(g, e.pts, j, b, k);
      j = b + 1;
    }
  });
}
export function drawDots(g, dots) {
  for (const d of dots) {
    g.beginPath(); g.arc(d.x, d.y, 6, 0, TAU); g.fillStyle = icingColor(d.k, d.j || 0); g.fill();
    g.lineWidth = 1.8; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.stroke();
    g.beginPath(); g.arc(d.x - 1.8, d.y - 2, 1.8, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
  }
}

// --- candy -------------------------------------------------------------------------------
export const CANDIES = [
  { id: 'gumdrop', name: 'Gumdrops', r: 15, colors: ['#ff4d6d', '#3fcf74', '#ffd23f', '#a66bff'], cells: [0, 1, 2, 3] },
  { id: 'peppermint', name: 'Peppermints', r: 15, colors: ['#e8213f', '#23a957'], cells: [4, 5] },
  { id: 'cane', name: 'Candy canes', r: 16, w: 24, h: 56, key: 'prop/topper-candy-cane' },
  { id: 'lolli', name: 'Lollipops', r: 16, w: 30, h: 64, key: 'prop/topper-lollipop', colors: ['#ff6fb1', '#5fb8ff', '#ffd23f'] },
  { id: 'button', name: 'Choc buttons', r: 13, cells: [6], colors: ['#7a4426'] },
  { id: 'heart', name: 'Candy hearts', r: 13, cells: [7], colors: ['#ff8fc8', '#ffffff', '#c9a7ff'] },
  { id: 'sprinkles', name: 'Sprinkles', r: 14, spray: true },
];
export const CANDY = Object.fromEntries(CANDIES.map((c, i) => [c.id, i]));
const SPRINKLE_COLORS = ['#ff6fb1', '#ffd23f', '#5fb8ff', '#7ee08a', '#c9a7ff', '#ff9f43', '#ffffff'];
export const sprinkleColor = () => SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)];

function atlasCell(g, cell, x, y, s) {
  const img = art('prop/gh-candy');
  if (!img) return false;
  const cw = img.width / 4, ch = img.height / 2;
  g.drawImage(img, (cell % 4) * cw, Math.floor(cell / 4) * ch, cw, ch, x - s / 2, y - s / 2, s, s);
  return true;
}

/** One candy centred on (x, y); `v` picks its colour; `flip` mirrors it (candy canes). */
export function drawCandy(g, kind, x, y, v = 0, flip = false, s = CANDY_S) {
  const def = CANDIES[CANDY[kind]];
  g.save(); g.translate(x, y); g.scale(s * (flip ? -1 : 1), s);
  g.lineWidth = 2.4; g.strokeStyle = NAVY; g.lineJoin = 'round';
  const col = def.colors ? def.colors[v % def.colors.length] : null;
  switch (kind) {
    case 'gumdrop': {
      if (atlasCell(g, def.cells[v % 4], 0, 0, 36)) break;
      g.beginPath(); g.moveTo(-15, 9); g.bezierCurveTo(-16, -14, 16, -14, 15, 9); g.closePath();
      g.fillStyle = col; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(-9 + hash(i + v) * 18, -6 + hash(i * 3 + v) * 12, 1.2, 0, TAU); g.fill(); }
      g.beginPath(); g.ellipse(-6, -5, 3, 5, -0.5, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
      break;
    }
    case 'peppermint': {
      if (atlasCell(g, def.cells[v % 2], 0, 0, 34)) break;
      g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
      g.fillStyle = col;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 14, a, a + 0.5); g.closePath(); g.fill(); }
      g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.stroke();
      g.beginPath(); g.arc(-4, -5, 3, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
      break;
    }
    case 'button': {
      if (atlasCell(g, 6, 0, 0, 30)) break;
      g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fillStyle = '#7a4426'; g.fill(); g.stroke();
      g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(-4, -4, 2.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
      break;
    }
    case 'heart': {
      if (atlasCell(g, 7, 0, 0, 30)) break;
      g.beginPath(); g.moveTo(0, 11); g.bezierCurveTo(-18, -2, -9, -16, 0, -6); g.bezierCurveTo(9, -16, 18, -2, 0, 11); g.closePath();
      g.fillStyle = col; g.fill(); g.stroke();
      g.beginPath(); g.arc(-5, -5, 2.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
      break;
    }
    case 'cane': {
      const img = art(def.key);
      if (img) { const sc = Math.min(def.w / img.width, def.h / img.height); g.drawImage(img, -img.width * sc / 2, -img.height * sc / 2, img.width * sc, img.height * sc); break; }
      const path = () => { g.beginPath(); g.moveTo(-2, 27); g.lineTo(-2, -16); g.arc(6, -16, 8, Math.PI, 0); g.lineTo(14, -10); };
      g.lineCap = 'round'; path(); g.lineWidth = 9; g.strokeStyle = NAVY; g.stroke();
      path(); g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke();
      g.setLineDash([4, 5]); path(); g.strokeStyle = '#e8213f'; g.stroke(); g.setLineDash([]);
      break;
    }
    case 'lolli': {
      const img = art(def.key);
      if (img) { const sc = Math.min(def.w / img.width, def.h / img.height); g.drawImage(img, -img.width * sc / 2, -img.height * sc / 2, img.width * sc, img.height * sc); break; }
      g.fillStyle = '#ffffff'; g.fillRect(-2, -4, 4, 36); g.strokeRect(-2, -4, 4, 36);
      g.beginPath(); g.arc(0, -16, 15, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
      g.strokeStyle = col; g.lineWidth = 4; g.beginPath();
      for (let a = 0; a < 12; a += 0.3) { const rr = a * 1.1; g.lineTo(Math.cos(a) * rr, -16 + Math.sin(a) * rr); }
      g.stroke(); g.lineWidth = 2.4; g.strokeStyle = NAVY; g.beginPath(); g.arc(0, -16, 15, 0, TAU); g.stroke();
      break;
    }
    case 'sprinkles': {
      for (let i = 0; i < 9; i++) {
        g.save(); g.translate(-10 + hash(i) * 20, -10 + hash(i + 5) * 20); g.rotate(hash(i + 9) * 3);
        g.fillStyle = SPRINKLE_COLORS[i % SPRINKLE_COLORS.length]; ui.roundRect(g, -1.6, -4.5, 3.2, 9, 1.6); g.fill(); g.lineWidth = 1; g.stroke();
        g.restore();
      }
      break;
    }
    default: break;
  }
  g.restore();
}

export function drawSprinkles(g, list) {
  g.lineWidth = 0.9; g.strokeStyle = 'rgba(36,22,63,0.6)';
  for (const s of list) {
    g.save(); g.translate(s.x, s.y); g.rotate(s.rot);
    g.fillStyle = s.c; ui.roundRect(g, -1.4, -4, 2.8, 8, 1.4); g.fill(); g.stroke();
    g.restore();
  }
}

// --- the house -----------------------------------------------------------------------------
function piecePath(g, pc) {
  g.beginPath(); pc.poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
}

/** A window pane: day glass, or lit warm at night (lit 0..1). */
function drawGlass(g, h, lit) {
  g.save(); g.beginPath(); holePath(g, h); g.clip();
  const bx = h.t === 'round' ? h.cx - h.r : h.x, by = h.t === 'round' ? h.cy - h.r : h.y;
  const bw = h.t === 'round' ? h.r * 2 : h.w, bh = h.t === 'round' ? h.r * 2 : h.h;
  g.fillStyle = '#7fb6e6'; g.fillRect(bx, by, bw, bh);
  if (lit > 0) {
    g.globalAlpha = lit;
    const gr = g.createRadialGradient(bx + bw / 2, by + bh * 0.6, 2, bx + bw / 2, by + bh / 2, Math.max(bw, bh));
    gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.6, '#ffc95a'); gr.addColorStop(1, '#f59a2f');
    g.fillStyle = gr; g.fillRect(bx, by, bw, bh);
    g.globalAlpha = 1;
  }
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(bx + bw * 0.2, by + bh * 0.75); g.lineTo(bx + bw * 0.55, by + bh * 0.2); g.stroke();
  // a little sugar cross
  g.strokeStyle = lit > 0.5 ? 'rgba(122,68,38,0.8)' : 'rgba(255,255,255,0.8)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(bx + bw / 2, by); g.lineTo(bx + bw / 2, by + bh); g.moveTo(bx, by + bh / 2); g.lineTo(bx + bw, by + bh / 2); g.stroke();
  g.restore();
}

/** The doorway: a chocolate door, or (open) warm inside with a gingerbread person peeking out. */
function drawDoorway(g, h, H) {
  g.save(); g.beginPath(); holePath(g, h); g.clip();
  const open = H.doorOpen || 0;
  if (open > 0) {
    const gr = g.createLinearGradient(0, h.y, 0, h.y + h.h);
    gr.addColorStop(0, H.lit > 0 ? '#ffd27a' : '#5a321c'); gr.addColorStop(1, H.lit > 0 ? '#f59a2f' : '#3a2014');
    g.fillStyle = gr; g.fillRect(h.x, h.y, h.w, h.h);
    if (H.person) drawPersonIn(g, h, H.person);
    // the open door stands against the left jamb
    g.fillStyle = '#6b3a1f'; g.beginPath(); g.moveTo(h.x, h.y + h.w * 0.3); g.lineTo(h.x + h.w * 0.22, h.y + h.w * 0.42); g.lineTo(h.x + h.w * 0.22, h.y + h.h); g.lineTo(h.x, h.y + h.h); g.closePath(); g.fill();
    g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
  } else {
    g.fillStyle = '#6b3a1f'; g.fillRect(h.x, h.y, h.w, h.h);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3;
    for (let x = h.x + h.w / 4; x < h.x + h.w; x += h.w / 4) { g.beginPath(); g.moveTo(x, h.y); g.lineTo(x, h.y + h.h); g.stroke(); }
    g.beginPath(); g.arc(h.x + h.w * 0.78, h.y + h.h * 0.62, 4, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = NAVY; g.stroke();
  }
  g.restore();
}

/** The gingerbread person rising up in the doorway, waving (person = { up 0..1, t }). */
function drawPersonIn(g, h, P) {
  const ph = h.h * 0.78, x = h.x + h.w * 0.58, y = h.y + h.h + ph * (1 - P.up) * 0.9;
  g.save(); g.translate(x, y); g.rotate(Math.sin(P.t * 5) * 0.12 * P.up);
  drawGingerPerson(g, 0, 0, ph, P.t);
  g.restore();
}

/** A little gingerbread person standing on (x, y), `h` tall (art or drawn), waving. */
export function drawGingerPerson(g, x, y, h, t = 0) {
  const img = art('prop/gh-gingerbread-person');
  if (img) { const s = h / img.height; g.drawImage(img, x - (img.width * s) / 2, y - h, img.width * s, h); return; }
  const u = h / 100;
  g.save(); g.translate(x, y); g.scale(u, u);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const limb = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = 22; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 17; g.strokeStyle = GB; g.stroke(); };
  limb(-10, -40, -18, -8); limb(10, -40, 18, -8);   // legs
  limb(-12, -60, -32, -48);                           // arm down
  const wv = Math.sin(t * 8) * 6;
  limb(12, -60, 32 + wv * 0.3, -82 + wv);            // waving arm
  g.beginPath(); g.ellipse(0, -52, 19, 22, 0, 0, TAU); g.fillStyle = GB; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
  g.beginPath(); g.arc(0, -82, 16, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-5, -85, 2.4, 0, TAU); g.arc(5, -85, 2.4, 0, TAU); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.6; g.beginPath(); g.arc(0, -80, 7, 0.3, Math.PI - 0.3); g.stroke();
  g.fillStyle = 'rgba(255,111,177,0.6)'; g.beginPath(); g.arc(-10, -78, 3, 0, TAU); g.arc(10, -78, 3, 0, TAU); g.fill();
  ['#e8213f', '#3fcf74', '#ffd23f'].forEach((c, i) => { g.beginPath(); g.arc(0, -62 + i * 10, 3.4, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 1.2; g.strokeStyle = NAVY; g.stroke(); });
  g.restore();
}

function drawPiece(g, shape, pc) {
  const img = art(pc.art);
  if (img) { g.drawImage(img, BOX.x, BOX.y, BOX.w, BOX.h); return; }
  g.save();
  piecePath(g, pc);
  for (const h of pc.holes) holePath(g, h);
  g.fillStyle = pc.roof ? GB_ROOF : GB; g.fill('evenodd');
  g.save(); g.clip('evenodd');
  // a darker baked rim, and a few dimples
  piecePath(g, pc); for (const h of pc.holes) holePath(g, h);
  g.lineWidth = 12; g.strokeStyle = GB_EDGE; g.stroke();
  g.fillStyle = 'rgba(120,56,20,0.35)';
  const { x0, x1, y0, y1 } = pc.bb;
  for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(x0 + hash(i + pc.index * 31) * (x1 - x0), y0 + hash(i * 7 + pc.index) * (y1 - y0), 1.8, 0, TAU); g.fill(); }
  g.restore();
  piecePath(g, pc); for (const h of pc.holes) holePath(g, h);
  g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
  g.restore();
}

/** The glue: a squished line of white icing along a placed piece's seam (grows in over 0.3 s). */
function drawSeam(g, pc, t) {
  if (!pc.seam || t <= 0) return;
  const [[x0, y0], [x1, y1]] = pc.seam, k = clamp(t / 0.3, 0, 1);
  const n = Math.max(2, Math.round((Math.hypot(x1 - x0, y1 - y0) * k) / 6));
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * k, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(i * 1.9) * 1.6;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = 8; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.stroke();
  g.lineWidth = 5.5; g.strokeStyle = '#fffaf2'; g.stroke();
}

/** The cake board the house stands on. */
export function drawBoard(g) {
  const w = BOARD_W / 2;
  g.lineWidth = 3.5; g.strokeStyle = NAVY;
  g.fillStyle = '#e9e2f5'; ui.roundRect(g, -w, 0, w * 2, 30, 12); g.fill(); g.stroke();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(-w + 4, 2);
  for (let x = -w + 4; x <= w - 4; x += 18) g.quadraticCurveTo(x + 9, 16 + hash(x) * 6, x + 18, 2);
  g.lineTo(w - 4, 0); g.lineTo(-w + 4, 0); g.closePath(); g.fill();
}

/**
 * The whole house in house units. H: { shape, built, drop: [dy per piece], seamT: [], icing, dots,
 * sprinkles, candies, lit (0..1), doorOpen, person, wobble }.
 */
export function drawHouse(g, H, { board = true, ghost = -1, t = 0 } = {}) {
  const shape = SHAPES[H.shape];
  if (board) drawBoard(g);
  const wob = H.wobble || 0;
  g.save();
  if (wob > 0) { g.rotate(Math.sin(t * 40) * wob * 0.06); }
  // the next piece's spot: a dashed outline where it will land
  if (ghost >= 0 && ghost < shape.pieces.length) {
    const pc = shape.pieces[ghost];
    g.save(); piecePath(g, pc); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    g.setLineDash([10, 8]); g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.6)'; g.stroke(); g.restore();
  }
  const nWin = shape.windows.length;
  for (const pc of shape.order) {
    if (pc.index >= H.built) continue;
    const dy = H.drop?.[pc.index] || 0;
    g.save(); g.translate(0, dy);
    for (const h of pc.holes) {
      if (h.door) drawDoorway(g, h, H);
      else { const wi = shape.windows.findIndex((w) => w.h === h); drawGlass(g, h, clamp((H.lit || 0) * (nWin + 1) - wi, 0, 1)); }
    }
    drawPiece(g, shape, pc);
    g.restore();
  }
  for (const pc of shape.pieces) if (pc.index < H.built && !(H.drop?.[pc.index])) drawSeam(g, pc, H.seamT?.[pc.index] ?? 1);
  drawIcing(g, shape, H.built, H.icing);
  drawDots(g, H.dots);
  drawSprinkles(g, H.sprinkles);
  for (const c of H.candies) drawCandy(g, c.kind, c.x, c.y, c.v, c.flip);
  g.restore();
}

/** Warm light spilling from lit windows (draw with 'lighter', same transform as the house). */
export function drawGlow(g, H, k = 1) {
  const shape = SHAPES[H.shape], nWin = shape.windows.length;
  g.save(); g.globalCompositeOperation = 'lighter';
  shape.windows.forEach((w, wi) => {
    if (w.piece >= H.built) return;
    const lit = clamp((H.lit || 0) * (nWin + 1) - wi, 0, 1) * k;
    if (lit <= 0) return;
    const h = w.h, cx = h.t === 'round' ? h.cx : h.x + h.w / 2, cy = h.t === 'round' ? h.cy : h.y + h.h / 2;
    const r = (h.t === 'round' ? h.r * 2 : Math.max(h.w, h.h)) * 1.4;
    const gr = g.createRadialGradient(cx, cy, 2, cx, cy, r);
    gr.addColorStop(0, `rgba(255,190,90,${0.45 * lit})`); gr.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  });
  g.restore();
}

/** A small icon of a house shape (lists and tabs). */
export function drawShapeIcon(g, i, x, y, sz) {
  const shape = SHAPES[i];
  g.save(); g.translate(x, y + sz * 0.36); const s = (sz * 0.8) / 460; g.scale(s, s);
  for (const pc of shape.order) drawPiece(g, shape, pc);
  g.restore();
}
