// Sandcastle Beach: castle pieces, decorations, crabs and tool icons.
//
// Everything is drawn in a plot's local units (the caller has translated to
// the plot's ground centre and scaled by the plot zoom k). A piece stands on
// its ground point (x, y); y is already foreshortened (the top of a round mold
// is an ellipse KY as deep as it is wide). `z` lifts a stacked piece off the
// ground. Every piece looks up generated art first (bottom-centre anchored at
// the front edge of its footprint) and falls back to procedural drawing.
import { art, drawArt } from '../../engine/art.js';
import * as ui from '../../engine/ui.js';
import { starPath } from '../../engine/emotes.js';
import { TAU, clamp } from '../../engine/util.js';

export const NAVY = '#24163f';
export const KY = 0.45;
export const SAND = '#f3cf86', SAND_L = '#fde6b0', SAND_D = '#d9a65a', SAND_DD = '#b98543';
export const FLAG_COLORS = [
  { id: 'pink', c: '#ff6fb1', name: 'Pink' }, { id: 'blue', c: '#3fa7ff', name: 'Blue' },
  { id: 'yellow', c: '#ffd23f', name: 'Yellow' }, { id: 'mint', c: '#4fd98a', name: 'Mint' },
];
export const STAR_COLORS = [
  { id: 'orange', c: '#ff8a3d', d: '#e0612a', name: 'Orange' },
  { id: 'pink', c: '#ff7ac6', d: '#e0509e', name: 'Pink' },
  { id: 'purple', c: '#b48cff', d: '#8c62e0', name: 'Purple' },
];
export const SHELLS = [
  { id: 'scallop', name: 'Scallop' }, { id: 'conch', name: 'Conch' }, { id: 'clam', name: 'Clam' },
];

// Piece kinds. r = round footprint radius; hw/hd = rectangular footprint half
// width / half (foreshortened) depth; h = body height; top = stacking surface
// height (null: nothing stacks on it); box = art box; vh = silhouette height.
export const DEFS = {
  tower: { kind: 'mold', name: 'Tower', r: 40, h: 92, top: 92, topHW: 22, box: [96, 128], vh: 106, styles: ['Plain', 'Window', 'Door'] },
  pointy: { kind: 'mold', name: 'Pointy', r: 28, h: 58, top: null, box: [70, 150], vh: 150, styles: ['Pointy'] },
  wall: { kind: 'mold', name: 'Wall', hw: 60, hd: 8, h: 58, top: 58, topHW: 50, box: [128, 84], vh: 72, styles: ['Across', 'Long'] },
  dome: { kind: 'mold', name: 'Dome', r: 50, h: 52, top: 50, topHW: 12, box: [110, 80], vh: 54, styles: ['Dome'] },
  shell: { kind: 'deco', name: 'Shell', r: 18, h: 18, top: null, box: [40, 34], vh: 30, styles: SHELLS.map((s) => s.name) },
  star: { kind: 'deco', name: 'Starfish', r: 20, h: 20, top: null, box: [44, 44], vh: 40, styles: STAR_COLORS.map((s) => s.name) },
  flag: { kind: 'deco', name: 'Flag', r: 10, h: 80, top: null, box: [40, 80], vh: 82, styles: FLAG_COLORS.map((s) => s.name) },
};
export const SIDE_WALL = { hw: 17, hd: 22, box: [60, 100] };

/** Footprint of a placed piece (walls turn with style 1). */
export function foot(p) {
  const d = DEFS[p.type];
  if (p.type === 'wall') return p.style === 1 ? { hw: SIDE_WALL.hw, hd: SIDE_WALL.hd } : { hw: d.hw, hd: d.hd };
  return { hw: d.r, hd: d.r * KY };
}
/** Silhouette box (for hover / pick-up), relative to the ground point: [x0, x1, y0, y1]. */
export function silhouette(p) {
  const d = DEFS[p.type], f = foot(p);
  const hw = Math.max(f.hw, d.kind === 'deco' ? 18 : 0) + 4;
  const vh = p.type === 'wall' && p.style === 1 ? d.vh + SIDE_WALL.hd : d.vh;
  return [p.x - hw, p.x + hw, p.y - p.z - vh - (p.type === 'wall' && p.style === 1 ? 0 : f.hd), p.y - p.z + f.hd + 4];
}
export function topHeight(p) {
  // Authored tower: surface y=64/256; its front footprint is drawn 18 units below the ground point.
  if (p.type === 'tower' && art(artKey(p))) return 128 - 64 / 2 - foot(p).hd;
  return DEFS[p.type].top;
}
export function canStack(p) { return DEFS[p.type].top !== null; }

// --- helpers ----------------------------------------------------------------------
function sandGrad(g, x0, x1, light = SAND_L, mid = SAND, dark = SAND_D) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, light); gr.addColorStop(0.45, mid); gr.addColorStop(1, dark);
  return gr;
}
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function speckles(g, seed, x0, y0, w, h, n = 6) {
  g.fillStyle = 'rgba(150,100,40,0.35)';
  for (let i = 0; i < n; i++) {
    const x = x0 + hash(seed + i * 3.1) * w, y = y0 + hash(seed + i * 7.7) * h;
    g.beginPath(); g.arc(x, y, 1.6 + hash(seed + i) * 1.4, 0, TAU); g.fill();
  }
}
function stroke(g, w = 3) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }

/** A cylinder body + top for round molds. by = base centre y. */
function cylinder(g, cx, by, r, h, seed) {
  const ry = r * KY;
  g.beginPath();
  g.moveTo(cx - r, by - h);
  g.lineTo(cx - r, by);
  g.ellipse(cx, by, r, ry, 0, Math.PI, 0, true);
  g.lineTo(cx + r, by - h);
  g.ellipse(cx, by - h, r, ry, 0, 0, Math.PI, false);
  g.closePath();
  g.fillStyle = sandGrad(g, cx - r, cx + r); g.fill();
  // bucket ridges
  g.save(); g.clip();
  g.strokeStyle = 'rgba(150,95,35,0.32)'; g.lineWidth = 2.2;
  for (const f of [0.28, 0.56, 0.8]) { g.beginPath(); g.ellipse(cx, by - h * f, r, ry, 0, 0, Math.PI); g.stroke(); }
  speckles(g, seed, cx - r, by - h, r * 2, h, 7);
  g.restore();
  g.beginPath();
  g.moveTo(cx - r, by - h); g.lineTo(cx - r, by); g.ellipse(cx, by, r, ry, 0, Math.PI, 0, true); g.lineTo(cx + r, by - h);
  stroke(g, 3);
}
function topEllipse(g, cx, y, r, fill = SAND_L) {
  g.beginPath(); g.ellipse(cx, y, r, r * KY, 0, 0, TAU);
  g.fillStyle = fill; g.fill(); stroke(g, 3);
}
function merlons(g, cx, y, r, n, size) {
  const list = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + Math.PI / n; list.push(a); }
  list.sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const a of list) {
    const mx = cx + Math.cos(a) * r * 0.82, my = y + Math.sin(a) * r * KY * 0.82;
    const w = size * (0.75 + 0.25 * Math.abs(Math.sin(a)));
    g.fillStyle = Math.cos(a) > 0.3 ? SAND : SAND_L;
    g.beginPath(); g.rect(mx - w / 2, my - size, w, size); g.fill(); stroke(g, 2.5);
  }
}
function arch(g, x, y, w, h, fill) {
  g.beginPath();
  g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h + w / 2); g.arc(x, y - h + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y); g.closePath();
  g.fillStyle = fill; g.fill(); stroke(g, 2.5);
}

// --- molds ------------------------------------------------------------------------------
function drawTower(g, p, by) {
  const d = DEFS.tower, r = d.r, h = d.h, cx = p.x;
  cylinder(g, cx, by, r, h, p.seed);
  if (p.style === 1) {
    arch(g, cx - 4, by - h * 0.38, 14, 22, '#5b3a6e');
    // a shell pressed above the window
    g.save(); g.translate(cx - 4, by - h * 0.72); g.scale(0.45, 0.45); shellScallop(g, '#ffb3cf'); g.restore();
  } else if (p.style === 2) {
    arch(g, cx - 3, by + r * KY * 0.7, 24, 40, '#b0703f');
    g.fillStyle = NAVY; g.beginPath(); g.arc(cx + 4, by - 6, 2.2, 0, TAU); g.fill();
    arch(g, cx - 18, by - h * 0.66, 9, 14, '#5b3a6e'); arch(g, cx + 14, by - h * 0.66, 9, 14, '#5b3a6e');
  }
  topEllipse(g, cx, by - h, r);
  g.beginPath(); g.ellipse(cx, by - h, r * 0.62, r * 0.62 * KY, 0, 0, TAU); g.fillStyle = 'rgba(185,133,67,0.35)'; g.fill();
  merlons(g, cx, by - h, r, 8, 13);
}

function drawPointy(g, p, by) {
  const d = DEFS.pointy, r = d.r, h = d.h, cx = p.x, apex = by - 150;
  cylinder(g, cx, by, r, h, p.seed);
  // cone roof
  g.beginPath();
  g.moveTo(cx - r - 3, by - h);
  g.quadraticCurveTo(cx - r * 0.35, by - h - 40, cx, apex);
  g.quadraticCurveTo(cx + r * 0.35, by - h - 40, cx + r + 3, by - h);
  g.ellipse(cx, by - h, r + 3, (r + 3) * KY, 0, 0, Math.PI, false);
  g.closePath();
  g.fillStyle = sandGrad(g, cx - r, cx + r, '#ffeec4', SAND_L, SAND); g.fill();
  g.save(); g.clip();
  g.strokeStyle = 'rgba(150,95,35,0.35)'; g.lineWidth = 2.2;
  for (const f of [0.25, 0.5, 0.72]) { const yy = lerpN(by - h, apex, f), rr = (r + 3) * (1 - f) ; g.beginPath(); g.ellipse(cx, yy, rr, rr * KY, 0, 0, Math.PI); g.stroke(); }
  g.restore();
  g.beginPath();
  g.moveTo(cx - r - 3, by - h);
  g.quadraticCurveTo(cx - r * 0.35, by - h - 40, cx, apex);
  g.quadraticCurveTo(cx + r * 0.35, by - h - 40, cx + r + 3, by - h);
  g.ellipse(cx, by - h, r + 3, (r + 3) * KY, 0, 0, Math.PI, false);
  stroke(g, 3);
  // drippy sand blobs on the rim
  g.fillStyle = SAND_L;
  for (const dx of [-16, -4, 9, 20]) { g.beginPath(); g.arc(cx + dx, by - h + (r + 3) * KY * Math.sqrt(1 - (dx / (r + 3)) ** 2), 4, 0, TAU); g.fill(); stroke(g, 2); }
  g.fillStyle = '#5b3a6e'; g.beginPath(); g.arc(cx - 3, by - h * 0.5, 6, 0, TAU); g.fill(); stroke(g, 2.5);
  g.fillStyle = SAND_L; g.beginPath(); g.arc(cx, apex + 1, 4.5, 0, TAU); g.fill(); stroke(g, 2);
}
function lerpN(a, b, t) { return a + (b - a) * t; }

function drawWall(g, p, by) {
  const side = p.style === 1, d = DEFS.wall, h = d.h;
  const hw = side ? SIDE_WALL.hw : d.hw, hd = side ? SIDE_WALL.hd : d.hd, cx = p.x;
  const fy = by + hd, ty = by - hd;
  // front face
  g.beginPath(); g.rect(cx - hw, fy - h, hw * 2, h);
  g.fillStyle = sandGrad(g, cx - hw, cx + hw); g.fill();
  g.save(); g.clip();
  g.strokeStyle = 'rgba(150,95,35,0.3)'; g.lineWidth = 2;
  for (const f of [0.35, 0.68]) { g.beginPath(); g.moveTo(cx - hw, fy - h * f); g.lineTo(cx + hw, fy - h * f); g.stroke(); }
  speckles(g, p.seed, cx - hw, fy - h, hw * 2, h, side ? 3 : 8);
  // pebbles pressed in
  if (!side) for (let i = 0; i < 3; i++) { g.fillStyle = ['#c9b9a6', '#9fb4c8', '#e3c4b0'][i]; g.beginPath(); g.ellipse(cx - hw * 0.6 + i * hw * 0.6, fy - h * (0.5 + 0.12 * (i % 2)), 4.5, 3.5, 0, 0, TAU); g.fill(); g.lineWidth = 1.5; g.strokeStyle = NAVY; g.stroke(); }
  g.restore();
  g.beginPath(); g.rect(cx - hw, fy - h, hw * 2, h); stroke(g, 3);
  // top
  g.beginPath(); g.rect(cx - hw, ty - h, hw * 2, hd * 2); g.fillStyle = SAND_L; g.fill(); stroke(g, 3);
  // battlements: back edge, then front edge
  const n = Math.max(2, Math.round((hw * 2) / 22)), mw = Math.min(12, (hw * 2) / (n * 1.6));
  for (const [yy, fill] of [[ty - h, SAND_L], [fy - h, SAND]]) {
    for (let i = 0; i < n; i++) {
      const mx = cx - hw + mw / 2 + 1 + (i * (hw * 2 - mw - 2)) / (n - 1);
      g.beginPath(); g.rect(mx - mw / 2, yy - 11, mw, 11); g.fillStyle = fill; g.fill(); stroke(g, 2.5);
    }
  }
  if (side) {
    // side merlons along the length so it reads as a long wall going back
    for (let i = 1; i < 3; i++) { const yy = ty - h + (i * hd * 2) / 3; g.beginPath(); g.rect(cx - hw + 1, yy - 9, 9, 9); g.rect(cx + hw - 10, yy - 9, 9, 9); g.fillStyle = SAND_L; g.fill(); stroke(g, 2); }
  }
}

function drawDome(g, p, by) {
  const d = DEFS.dome, r = d.r, h = d.h, cx = p.x, ry = r * KY;
  g.beginPath();
  g.ellipse(cx, by, r, ry, 0, 0, Math.PI, false);
  g.ellipse(cx, by, r, h, 0, Math.PI, TAU, false);
  g.closePath();
  const gr = g.createRadialGradient(cx - r * 0.35, by - h * 0.7, 4, cx, by - h * 0.2, r * 1.3);
  gr.addColorStop(0, '#fff1c8'); gr.addColorStop(0.5, SAND); gr.addColorStop(1, SAND_D);
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  // scallop band pressed around the middle
  g.strokeStyle = 'rgba(150,95,35,0.45)'; g.lineWidth = 2.2;
  const by2 = by - h * 0.32;
  for (let i = 0; i < 9; i++) {
    const a0 = Math.PI * (i / 9), a1 = Math.PI * ((i + 1) / 9);
    const x0 = cx - Math.cos(a0) * r * 0.98, x1 = cx - Math.cos(a1) * r * 0.98;
    const y0 = by2 + Math.sin(a0) * ry * 0.9, y1 = by2 + Math.sin(a1) * ry * 0.9;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 9, x1, y1); g.stroke();
  }
  speckles(g, p.seed, cx - r, by - h, r * 2, h, 7);
  g.restore();
  g.beginPath();
  g.ellipse(cx, by, r, ry, 0, 0, Math.PI, false);
  g.ellipse(cx, by, r, h, 0, Math.PI, TAU, false);
  g.closePath(); stroke(g, 3);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(cx - r * 0.38, by - h * 0.7, r * 0.18, h * 0.12, -0.5, 0, TAU); g.fill();
}

// --- decorations --------------------------------------------------------------------------
export function shellScallop(g, c = '#ff9ec4') {
  g.beginPath();
  g.moveTo(0, 0);
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const x = Math.cos(a) * 18, y = Math.sin(a) * 17 - 4;
    if (i === 0) g.lineTo(x, y); else { const pa = Math.PI + ((i - 0.5) / 6) * Math.PI; g.quadraticCurveTo(Math.cos(pa) * 22, Math.sin(pa) * 21 - 4, x, y); }
  }
  g.closePath();
  g.fillStyle = c; g.fill();
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 1.6;
  for (let i = 1; i < 6; i++) { const a = Math.PI + (i / 6) * Math.PI; g.beginPath(); g.moveTo(0, -1); g.lineTo(Math.cos(a) * 16, Math.sin(a) * 15 - 4); g.stroke(); }
  g.beginPath();
  g.moveTo(0, 0);
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const x = Math.cos(a) * 18, y = Math.sin(a) * 17 - 4;
    if (i === 0) g.lineTo(x, y); else { const pa = Math.PI + ((i - 0.5) / 6) * Math.PI; g.quadraticCurveTo(Math.cos(pa) * 22, Math.sin(pa) * 21 - 4, x, y); }
  }
  g.closePath(); stroke(g, 2.5);
  g.fillStyle = c; g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill(); stroke(g, 2.2);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-6, -12, 4, 2.5, -0.5, 0, TAU); g.fill();
}
function shellConch(g) {
  g.beginPath();
  g.moveTo(-18, 2); g.quadraticCurveTo(-16, -16, 2, -20); g.quadraticCurveTo(16, -18, 20, -4); g.quadraticCurveTo(14, 4, -2, 4); g.closePath();
  g.fillStyle = '#ffe2c4'; g.fill(); stroke(g, 2.5);
  g.strokeStyle = 'rgba(214,120,90,0.8)'; g.lineWidth = 2.4;
  g.beginPath(); g.arc(6, -10, 8, 0.3, 5.2); g.stroke();
  g.beginPath(); g.arc(7, -10, 3.5, 0.3, 5.0); g.stroke();
  g.fillStyle = '#ff9f8a'; g.beginPath(); g.moveTo(-18, 2); g.quadraticCurveTo(-8, -6, -2, 4); g.closePath(); g.fill(); stroke(g, 2);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-4, -12, 4, 2, -0.6, 0, TAU); g.fill();
}
function shellClam(g, t) {
  g.beginPath(); g.ellipse(0, -4, 17, 9, 0, 0, Math.PI); g.closePath(); g.fillStyle = '#c9a5ff'; g.fill(); stroke(g, 2.5);
  g.fillStyle = '#fff6fb'; g.beginPath(); g.arc(0, -6, 5.5, 0, TAU); g.fill(); stroke(g, 2);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(-1.8, -7.8, 1.8, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(0, -8, 17, 14, 0, Math.PI, TAU); g.lineTo(17, -6); g.lineTo(-17, -6); g.closePath();
  g.fillStyle = '#d9bcff'; g.save(); g.translate(0, -6); g.rotate(-0.25 - Math.sin(t * 2) * 0.05); g.translate(0, 6); g.fill(); stroke(g, 2.5);
  g.strokeStyle = 'rgba(36,22,63,0.3)'; g.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) { const a = Math.PI + (i / 5) * Math.PI; g.beginPath(); g.moveTo(0, -7); g.lineTo(Math.cos(a) * 15, -8 + Math.sin(a) * 12); g.stroke(); }
  g.restore();
}
export function drawStarfish(g, col, t = 0, wiggle = 0) {
  g.save(); g.scale(1, 0.82); g.rotate(-0.12 + Math.sin(t * 3) * wiggle);
  g.beginPath(); starPath(g, 21, 0.48, 5);
  g.fillStyle = col.c; g.fill(); g.lineWidth = 3.2; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i / 5) * TAU; for (const f of [0.38, 0.62]) { g.beginPath(); g.arc(Math.cos(a) * 21 * f, Math.sin(a) * 21 * f, 1.9, 0, TAU); g.fill(); } }
  g.fillStyle = col.d; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill();
  g.restore();
}
export function drawFlag(g, col, t, seed = 0, h = 80) {
  // stick
  g.fillStyle = '#c98a4b'; g.beginPath(); g.rect(-2.2, -h, 4.4, h); g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
  const w = Math.sin(t * 6 + seed * 5) * 4;
  g.beginPath(); g.moveTo(2, -h + 2); g.quadraticCurveTo(16, -h + 6 + w, 32, -h + 13 + w * 1.4); g.quadraticCurveTo(16, -h + 20 + w, 2, -h + 26); g.closePath();
  g.fillStyle = col.c; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
  g.save(); g.translate(13, -h + 14 + w * 0.8); g.fillStyle = '#ffffff'; g.beginPath(); starPath(g, 4.5, 0.45, 5); g.fill(); g.restore();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -h - 1, 3.5, 0, TAU); g.fill(); g.lineWidth = 1.8; g.strokeStyle = NAVY; g.stroke();
}

/** Art key for a placed piece. */
export function artKey(p) {
  switch (p.type) {
    case 'tower': return ['prop/sandcastle-tower', 'prop/sandcastle-tower-window', 'prop/sandcastle-tower-door'][p.style] || 'prop/sandcastle-tower';
    case 'pointy': return 'prop/sandcastle-pointy';
    case 'wall': return p.style === 1 ? 'prop/sandcastle-wall-side' : 'prop/sandcastle-wall';
    case 'dome': return 'prop/sandcastle-dome';
    case 'shell': return `prop/beach-shell-${SHELLS[p.style % 3].id}`;
    case 'star': return `prop/beach-starfish-${STAR_COLORS[p.style % 3].id}`;
    case 'flag': return `prop/sandcastle-flag-${FLAG_COLORS[p.style % 4].id}`;
    default: return null;
  }
}

/**
 * Draw a piece at its ground point, lifted by z. opts: alpha, ghost, t, wet (0..1 shine).
 * Squash: p.bump (0..1) springs it on placement.
 */
export function drawPiece(g, p, t, opts = {}) {
  const d = DEFS[p.type], f = foot(p);
  const by = p.y - p.z;
  g.save();
  if (opts.alpha !== undefined) g.globalAlpha *= opts.alpha;
  const b = p.bump || 0;
  if (b > 0) {
    const sx = 1 + Math.sin(b * 22) * b * 0.22, sy = 1 - Math.sin(b * 22) * b * 0.2;
    g.translate(p.x, by + f.hd); g.scale(sx, sy); g.translate(-p.x, -by - f.hd);
  }
  if (p.type === 'flag') {
    // flags wave by skewing (art too)
    g.translate(p.x, by + 2);
    const box = d.box;
    if (!drawArtSkew(g, artKey(p), box, t, p.seed)) drawFlag(g, FLAG_COLORS[p.style % 4], t, p.seed);
    g.restore(); return;
  }
  const box = p.type === 'wall' && p.style === 1 ? SIDE_WALL.box : d.box;
  const key = artKey(p);
  // The receding wall's front footprint is at source x=30, rather than canvas centre x=64.
  const artX = p.x + (p.type === 'wall' && p.style === 1 ? (64 - 30) / 128 * box[0] : 0);
  if (!drawArt(g, key, artX, by + f.hd, box[0], box[1], { anchor: 'bottom' })) {
    switch (p.type) {
      case 'tower': drawTower(g, p, by); break;
      case 'pointy': drawPointy(g, p, by); break;
      case 'wall': drawWall(g, p, by); break;
      case 'dome': drawDome(g, p, by); break;
      case 'shell': {
        g.translate(p.x, by + 4); g.rotate((hash(p.seed) - 0.5) * 0.5);
        if (p.style === 0) shellScallop(g); else if (p.style === 1) shellConch(g); else shellClam(g, t);
        break;
      }
      case 'star': g.translate(p.x, by - 10); drawStarfish(g, STAR_COLORS[p.style % 3], t, p.held ? 0.15 : 0); break;
      default: break;
    }
  }
  g.restore();
  if (opts.wet > 0.01 && d.kind === 'mold') {
    // wet sand shine after the wave
    g.save(); g.globalAlpha = opts.wet * 0.5;
    g.fillStyle = 'rgba(120,80,40,0.5)';
    const hw = f.hw;
    g.beginPath(); g.ellipse(p.x, by + f.hd * 0.4, hw, Math.max(f.hd, 6) + 4, 0, 0, TAU); g.fill();
    g.restore();
  }
}
function drawArtSkew(g, key, box, t, seed) {
  const w = Math.sin(t * 6 + seed * 5) * 0.06;
  g.save(); g.transform(1, 0, w, 1, 0, 0);
  // Measured pole-tip x coordinates on the 96px flag canvases; the pennant makes their bounds asymmetric.
  const poleX = { pink: 26.513, blue: 26.885, yellow: 27.394, mint: 26.696 }[key?.split('-').pop()];
  const dx = poleX === undefined ? 0 : (48 - poleX) / 96 * box[0];
  const ok = drawArt(g, key, dx, 0, box[0], box[1], { anchor: 'bottom' });
  g.restore();
  return ok;
}

/** The soft contact shadow / ground ring under a piece (drawn with the ground layer). */
export function drawPieceShadow(g, p) {
  if (p.z > 0) return;
  const f = foot(p);
  g.fillStyle = 'rgba(150,100,40,0.22)';
  g.beginPath(); g.ellipse(p.x + 4, p.y + 3, f.hw + 6, f.hd + 5, 0, 0, TAU); g.fill();
}

// --- crab ------------------------------------------------------------------------------------
/** A friendly crab, feet at (0, 0), ~64 units wide. walk = leg phase, happy = 0..1 dance. */
export function drawCrab(g, t, { walk = 0, happy = 0, look = 0, swim = false, scale = 1 } = {}) {
  g.save(); g.scale(scale, scale);
  const bob = Math.abs(Math.sin(walk * 2)) * 3 + happy * Math.abs(Math.sin(t * 14)) * 6;
  if (!drawArt(g, 'prop/beach-crab', 0, -bob, 64, 48, { anchor: 'bottom' })) {
    g.translate(0, -bob);
    // legs
    g.strokeStyle = NAVY; g.lineWidth = 3; g.lineCap = 'round';
    if (!swim) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const ph = walk * 2 + i * 1.3 + (s > 0 ? Math.PI : 0);
      const x0 = s * (10 + i * 5), y0 = -10;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + s * 10, y0 - 6, x0 + s * (14 + Math.sin(ph) * 3), 0 - Math.max(0, Math.sin(ph)) * 3); g.stroke();
      g.strokeStyle = '#e8503f'; g.lineWidth = 1.6; g.stroke(); g.strokeStyle = NAVY; g.lineWidth = 3;
    }
    // claws
    const wave = happy > 0 ? Math.sin(t * 16) * 0.5 : Math.sin(t * 3) * 0.12;
    for (const s of [-1, 1]) {
      g.save(); g.translate(s * 20, -20); g.rotate(s * (-0.5 + wave * s));
      g.fillStyle = '#ff6f5e'; g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 4, -12); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = '#ff6f5e'; g.stroke();
      g.translate(s * 5, -18);
      g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fillStyle = '#ff6f5e'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.moveTo(0, -1); g.lineTo(s * 3, -9); g.lineWidth = 3; g.stroke();
      g.restore();
    }
    // body
    g.beginPath(); g.ellipse(0, -14, 22, 14, 0, 0, TAU);
    const gr = g.createLinearGradient(0, -28, 0, 0); gr.addColorStop(0, '#ff8a75'); gr.addColorStop(1, '#e8503f');
    g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    // eye stalks
    for (const s of [-1, 1]) {
      const ex = s * 7 + look * 3, ey = -34;
      g.strokeStyle = NAVY; g.lineWidth = 2.5; g.beginPath(); g.moveTo(s * 6, -24); g.lineTo(ex, ey + 4); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 5.5, 0, TAU); g.fill(); g.stroke();
      if (happy > 0.3) { g.beginPath(); g.arc(ex, ey + 1, 2.6, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 2; g.stroke(); }
      else { g.fillStyle = NAVY; g.beginPath(); g.arc(ex + look * 1.5, ey + 0.5, 2.6, 0, TAU); g.fill(); }
    }
    // cheeks + smile
    g.fillStyle = 'rgba(255,190,200,0.85)'; g.beginPath(); g.ellipse(-12, -12, 4, 2.5, 0, 0, TAU); g.ellipse(12, -12, 4, 2.5, 0, 0, TAU); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 2.2; g.beginPath(); g.arc(0, -15, happy > 0.3 ? 6 : 4.5, 0.2, Math.PI - 0.2); g.stroke();
  }
  g.restore();
}

// --- tool icons ----------------------------------------------------------------------------
export function drawSpade(g, s = 1) {
  g.save(); g.scale(s, s); g.rotate(0.5);
  g.fillStyle = '#ffd23f'; ui.roundRect(g, -4, -34, 8, 30, 3); g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
  g.beginPath(); g.ellipse(0, -36, 8, 5, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-13, -4); g.lineTo(13, -4); g.quadraticCurveTo(14, 16, 0, 24); g.quadraticCurveTo(-14, 16, -13, -4); g.closePath();
  g.fillStyle = '#3fa7ff'; g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-5, 4, 2.5, 7, 0.2, 0, TAU); g.fill();
  g.restore();
}
export function drawBucket(g, s = 1, c = '#ff6fb1') {
  g.save(); g.scale(s, s);
  g.lineWidth = 2.5; g.strokeStyle = NAVY;
  g.beginPath(); g.arc(0, -16, 18, Math.PI, 0); g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = NAVY;
  g.beginPath(); g.moveTo(-17, -16); g.lineTo(-12, 16); g.quadraticCurveTo(0, 21, 12, 16); g.lineTo(17, -16); g.closePath();
  g.fillStyle = c; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, -16, 17, 6, 0, 0, TAU); g.fillStyle = SAND; g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-11, -8, 4, 18);
  g.restore();
}
export function drawHand(g, s = 1) {
  // a friendly open mitten hand
  g.save(); g.scale(s, s);
  g.beginPath();
  g.moveTo(-12, 16); g.lineTo(-14, -2); g.quadraticCurveTo(-22, -6, -20, -12); g.quadraticCurveTo(-17, -16, -10, -8);
  g.lineTo(-10, -22); g.quadraticCurveTo(-10, -28, -5, -28); g.quadraticCurveTo(0, -28, 0, -22);
  g.lineTo(0, -26); g.quadraticCurveTo(0, -31, 5, -31); g.quadraticCurveTo(10, -31, 10, -26);
  g.lineTo(10, -22); g.quadraticCurveTo(10, -26, 15, -25); g.quadraticCurveTo(19, -24, 18, -18);
  g.lineTo(16, 16); g.closePath();
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = '#ff9ec4'; ui.roundRect(g, -14, 12, 32, 9, 4); g.fill(); g.stroke();
  g.restore();
}

/** Tool bar icon / cursor icon. id: hand | moat | tower | pointy | wall | dome | shell | star | flag */
export function drawToolIcon(g, id, x, y, size, t, style = 0) {
  g.save(); g.translate(x, y);
  const s = size / 60;
  g.scale(s, s);
  switch (id) {
    case 'hand': drawHand(g, 1.05); break;
    case 'moat':
      if (!drawArt(g, 'prop/sand-spade', 0, 0, 52, 60)) drawSpade(g, 0.95);
      break;
    case 'tower': case 'pointy': case 'wall': case 'dome': {
      const p = { type: id, x: 0, y: 0, z: 0, style, seed: 3 };
      const f = foot(p), d = DEFS[id];
      const box = id === 'wall' && style === 1 ? SIDE_WALL.box : d.box;
      const k = Math.min(52 / box[0], 54 / (box[1] + f.hd));
      g.translate(0, 26); g.scale(k, k); g.translate(0, -f.hd);
      drawPiece(g, p, t);
      break;
    }
    case 'shell': g.scale(1.3, 1.3); g.translate(0, 8); drawPiece(g, { type: 'shell', x: 0, y: 0, z: 0, style, seed: 0.4 }, t); break;
    case 'star': g.scale(1.2, 1.2); g.translate(0, 10); drawPiece(g, { type: 'star', x: 0, y: 0, z: 0, style, seed: 1 }, t); break;
    case 'flag': g.scale(0.62, 0.62); g.translate(-8, 44); drawPiece(g, { type: 'flag', x: 0, y: 0, z: 0, style, seed: 2 }, t); break;
    default: break;
  }
  g.restore();
}

export { clamp };
