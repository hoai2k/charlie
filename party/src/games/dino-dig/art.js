// Dino Dig drawings: the dig site, the jointed silly dinosaur skeleton, mounds, bones,
// surprises, the explorer hat and the spade. Every piece of art is optional: each
// drawing uses its prop/<key> from assets/art/index.json once it exists (see the
// dino-dig section of image-requests.md) and a procedural stand-in until then.
//
// The skeleton lives on one TEMPLATE (1200 x 520 px, facing right, feet on y = 480).
// Each piece has a box in template px; generated art is one image per piece of exactly
// that box, so it lines up with no measuring. The code dances the dino by rotating
// pieces around the JOINTS.
import { W, H } from '../../engine/canvas.js';
import { art } from '../../engine/art.js';
import { clamp, lerp, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
const CREAM = '#f6ecd2', SHADE = '#d9c7a0', FAR_CREAM = '#ddcfae', FAR_SHADE = '#bfae88';
export const SAND = ['#f3d394', '#e8c27e', '#d9ae66', '#fbe6b8'];

// Where the template sits on screen: template (600, 480) -> screen (DINO.x, DINO.y), scale k.
export const DINO = { x: 960, y: 462, k: 0.8, ox: 600, oy: 480 };
export const toScreen = (tx, ty) => ({ x: DINO.x + (tx - DINO.ox) * DINO.k, y: DINO.y + (ty - DINO.oy) * DINO.k });
// The plinth the dino stands on (painted by bg/dino-dig, drawn here without it).
export const PLINTH = { x0: 470, x1: 1450, top: 462, front: 515 };
export const ARENA = { x0: 150, x1: 1770, y0: 600, y1: 1010 };

export const J = {
  hip: [440, 285], sh: [730, 285], neck: [760, 255], neck2: [845, 165], head: [905, 100],
  tail: [410, 268], tail2: [285, 312], tail3: [165, 360], tip: [45, 410],
};
const ARCH = [[400, 262], [585, 194], [760, 262]];   // quadratic control points of the back (passes (585, 228))
const arch = (t) => {
  const u = 1 - t;
  return [u * u * ARCH[0][0] + 2 * u * t * ARCH[1][0] + t * t * ARCH[2][0], u * u * ARCH[0][1] + 2 * u * t * ARCH[1][1] + t * t * ARCH[2][1]];
};
const FAR_OFF = [38, -6];

// id -> art key, box [x0, y0, x1, y1], how a part-built piece fills in (grow), rig part
export const PIECES = {
  'leg-back-far':  { key: 'prop/dino-leg-back', box: [380, 255, 520, 485], grow: 'up', rig: 'legBF', far: true },
  'leg-front-far': { key: 'prop/dino-leg-front', box: [670, 255, 800, 485], grow: 'up', rig: 'legFF', far: true },
  'leg-back':      { key: 'prop/dino-leg-back', box: [380, 255, 520, 485], grow: 'up', rig: 'legB' },
  'leg-front':     { key: 'prop/dino-leg-front', box: [670, 255, 800, 485], grow: 'up', rig: 'legF' },
  hips:            { key: 'prop/dino-hips', box: [365, 225, 515, 335], grow: 'up', rig: 'body' },
  'spine-1':       { key: 'prop/dino-spine-1', box: [395, 225, 535, 285], grow: 'right', rig: 'body' },
  'spine-2':       { key: 'prop/dino-spine-2', box: [520, 200, 660, 260], grow: 'right', rig: 'body' },
  'spine-3':       { key: 'prop/dino-spine-3', box: [645, 210, 785, 285], grow: 'right', rig: 'body' },
  'rib-1':         { key: 'prop/dino-rib-1', box: [520, 235, 580, 375], grow: 'down', rig: 'body', renderOffset: [0, -8] },
  'rib-2':         { key: 'prop/dino-rib-2', box: [575, 228, 640, 395], grow: 'down', rig: 'body', renderOffset: [6, -3] },
  'rib-3':         { key: 'prop/dino-rib-3', box: [635, 230, 700, 395], grow: 'down', rig: 'body', renderOffset: [15, -3] },
  'rib-4':         { key: 'prop/dino-rib-4', box: [690, 240, 750, 370], grow: 'down', rig: 'body', renderOffset: [2, -2] },
  'neck-1':        { key: 'prop/dino-neck-1', box: [735, 150, 870, 285], grow: 'up', rig: 'neck1' },
  'neck-2':        { key: 'prop/dino-neck-2', box: [820, 70, 935, 190], grow: 'up', rig: 'neck2' },
  head:            { key: 'prop/dino-skull', box: [870, 20, 1090, 175], grow: 'right', rig: 'head' },
  'tail-1':        { key: 'prop/dino-tail-1', box: [270, 240, 440, 335], grow: 'left', rig: 'tail1' },
  'tail-2':        { key: 'prop/dino-tail-2', box: [145, 285, 305, 385], grow: 'left', rig: 'tail2' },
  'tail-3':        { key: 'prop/dino-tail-3', box: [25, 335, 185, 430], grow: 'left', rig: 'tail3' },
};
// The order the dino is built in (feet first, the tail tip last).
export const ORDER = ['leg-back-far', 'leg-front-far', 'leg-back', 'leg-front', 'hips', 'spine-1', 'spine-2', 'spine-3',
  'neck-1', 'neck-2', 'head', 'rib-1', 'rib-2', 'rib-3', 'rib-4', 'tail-1', 'tail-2', 'tail-3'];
// Back-to-front draw order.
const DRAW = ['leg-back-far', 'leg-front-far', 'tail-1', 'tail-2', 'tail-3', 'hips', 'rib-1', 'rib-2', 'rib-3', 'rib-4',
  'spine-1', 'spine-2', 'spine-3', 'neck-1', 'neck-2', 'head', 'leg-back', 'leg-front'];
/** Template point where a bone heading for this piece lands (the middle of its box). */
export function pieceTarget(id) {
  const b = PIECES[id].box, far = PIECES[id].far ? FAR_OFF : [0, 0];
  return toScreen((b[0] + b[2]) / 2 + far[0], (b[1] + b[3]) / 2 + far[1]);
}

// Silly parts: where each sits on the template (bottom centre unless noted), width.
export const SILLY = {
  duck:   { at: [975, 95], w: 190, center: true },
  teapot: { at: [95, 385], w: 170, center: true },
  sock:   { at: [766, 488], w: 92 },
  crown:  { at: [952, 34], w: 92, rot: -0.18 },
  teacup: { at: [588, 228], w: 88 },
};
export const SILLY_HOST = { duck: 'head', teapot: 'tail-3', sock: 'leg-front', crown: 'head', teacup: 'spine-2' };
export function sillyTarget(id) { const s = SILLY[id]; return toScreen(s.at[0], s.at[1] - (s.center ? 0 : s.w * 0.4)); }

/** Conservative world-space top of the head and its crown through the actual rig. */
export function dinoHeadTop(p, head = 'skull', crowned = false) {
  const rotations = [
    [J.head, p.head || 0], [J.neck2, (p.neck || 0) * 0.7],
    [J.neck, p.neck || 0], [[585, 300], (p.sway || 0) + (p.lean || 0)],
  ].map(([at, a]) => ({ at, c: Math.cos(a), s: Math.sin(a) }));
  const points = [];
  const rect = (x, y, w, h, angle = 0) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (const dx of [-w / 2, w / 2]) for (const dy of [-h, 0]) points.push([x + dx * c - dy * s, y + dx * s + dy * c]);
  };
  if (head === 'duck') rect(975, 190, 190, 190);
  else rect(980, 175, 220, 155);
  // A square encloses both the painted crown and the procedural crown.
  if (crowned) {
    const a = SILLY.crown.rot, dx = head === 'duck' ? 14 : 0, dy = head === 'duck' ? -10 : 0;
    rect(952 + dx * Math.cos(a) - dy * Math.sin(a), 34 + dx * Math.sin(a) + dy * Math.cos(a), 92, 92, a);
  }
  return Math.min(...points.map(([x, y]) => {
    for (const r of rotations) {
      const dx = x - r.at[0], dy = y - r.at[1];
      x = r.at[0] + dx * r.c - dy * r.s; y = r.at[1] + dx * r.s + dy * r.c;
    }
    return DINO.y + (y - (p.bob || 0) - (p.hop || 0) - DINO.oy) * DINO.k;
  }));
}

/** Bound finale lift/tilt at the viewport top, retaining leg and tail dancing. */
export function fitDinoHead(pose, head, crowned, minY = 12) {
  if (dinoHeadTop(pose, head, crowned) >= minY) return pose;
  const fields = ['bob', 'hop', 'sway', 'neck', 'head', 'lean'];
  let nod = 0;
  const scaled = (k) => {
    const p = { ...pose };
    for (const field of fields) p[field] = (pose[field] || 0) * k;
    p.neck += nod * (1 - k);
    return p;
  };
  // The sneeze punch can put the viewport top below a tall crown even at rest.
  // A small forward nod keeps it visible without moving the feet or the camera.
  if (dinoHeadTop(scaled(0), head, crowned) < minY) {
    let lo = 0, hi = 0.6;
    for (let i = 0; i < 14; i++) {
      nod = (lo + hi) / 2;
      if (dinoHeadTop(scaled(0), head, crowned) >= minY) hi = nod; else lo = nod;
    }
    nod = hi;
  }
  let lo = 0, hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (dinoHeadTop(scaled(mid), head, crowned) >= minY) lo = mid; else hi = mid;
  }
  return scaled(lo);
}

// ---------------------------------------------------------------- small path helpers
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** Stroke the current path thick in navy, then fill it: one outline around the union. */
function inkFill(g, fill, lw = 8) {
  g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = fill; g.fill();
}
function circle(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }

/** A cartoon bone from (x1, y1) to (x2, y2), w thick, knobby ends. */
export function boneSeg(g, x1, y1, x2, y2, w, far = false) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
  g.save(); g.translate(x1, y1); g.rotate(a);
  g.beginPath();
  rr(g, 0, -w * 0.34, L, w * 0.68, w * 0.3);
  circle(g, 0, -w * 0.3, w * 0.42); circle(g, 0, w * 0.3, w * 0.42);
  circle(g, L, -w * 0.3, w * 0.42); circle(g, L, w * 0.3, w * 0.42);
  inkFill(g, far ? FAR_CREAM : CREAM, Math.max(6, w * 0.3));
  g.fillStyle = far ? FAR_SHADE : SHADE; g.globalAlpha *= 0.7;
  g.beginPath(); rr(g, w * 0.2, w * 0.08, L - w * 0.4, w * 0.18, w * 0.09); g.fill();
  g.restore();
}
function knob(g, x, y, r, far) { g.beginPath(); circle(g, x, y, r); inkFill(g, far ? FAR_CREAM : CREAM, 7); }
function vertebra(g, x, y, r, ang, plate = true, far = false) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath();
  rr(g, -r, -r * 0.72, r * 2, r * 1.44, r * 0.5);
  if (plate) { g.moveTo(-r * 0.55, -r * 0.6); g.quadraticCurveTo(-r * 0.2, -r * 1.75, r * 0.15, -r * 1.55); g.quadraticCurveTo(r * 0.6, -r * 1.2, r * 0.55, -r * 0.6); g.closePath(); }
  inkFill(g, far ? FAR_CREAM : CREAM, Math.max(5, r * 0.3));
  g.strokeStyle = far ? FAR_SHADE : SHADE; g.lineWidth = Math.max(2, r * 0.14); g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 0.45, r * 0.25); g.lineTo(r * 0.45, r * 0.25); g.stroke();
  g.restore();
}
function chain(g, a, b, n, r0, r1, plate = true, startKnob = true) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  if (startKnob) knob(g, a[0], a[1], r0 * 0.85);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.55) / n;
    vertebra(g, lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(r0, r1, t), ang, plate);
  }
}
function rib(g, top, len, bulge) {
  const [x, y] = top, by = y + len;
  const path = () => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + bulge, y + len * 0.55, x - 6, by); };
  g.lineCap = 'round';
  path(); g.strokeStyle = NAVY; g.lineWidth = 22; g.stroke();
  path(); g.strokeStyle = CREAM; g.lineWidth = 13; g.stroke();
  g.beginPath(); g.moveTo(x + bulge * 0.3 + 3, y + len * 0.3); g.quadraticCurveTo(x + bulge * 0.55, y + len * 0.55, x + bulge * 0.2, y + len * 0.8);
  g.strokeStyle = SHADE; g.lineWidth = 3; g.stroke();
  knob(g, x, y + 2, 10);
}

// ---------------------------------------------------------------- procedural pieces
function drawLegBack(g, far) {
  boneSeg(g, 440, 290, 472, 378, 30, far);
  boneSeg(g, 472, 378, 446, 452, 25, far);
  boneSeg(g, 446, 462, 512, 470, 13, far); boneSeg(g, 444, 466, 498, 475, 12, far);
  knob(g, 448, 458, 14, far);
  knob(g, J.hip[0], J.hip[1], 25, far);
}
function drawLegFront(g, far) {
  boneSeg(g, 730, 290, 714, 374, 27, far);
  boneSeg(g, 714, 374, 740, 448, 22, far);
  boneSeg(g, 742, 460, 795, 466, 12, far); boneSeg(g, 740, 465, 784, 475, 11, far);
  knob(g, 744, 456, 13, far);
  knob(g, J.sh[0], J.sh[1], 23, far);
}
const PROC = {
  'leg-back-far': (g) => drawLegBack(g, true),
  'leg-front-far': (g) => drawLegFront(g, true),
  'leg-back': (g) => drawLegBack(g, false),
  'leg-front': (g) => drawLegFront(g, false),
  hips: (g) => {
    g.beginPath();
    g.ellipse(440, 270, 64, 38, -0.15, 0, TAU);
    g.moveTo(400, 300); g.ellipse(410, 300, 30, 22, 0.5, 0, TAU);
    g.moveTo(500, 300); g.ellipse(472, 304, 30, 22, -0.4, 0, TAU);
    inkFill(g, CREAM, 8);
    g.fillStyle = '#b9a6c9'; g.beginPath(); g.ellipse(446, 272, 20, 13, -0.15, 0, TAU); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 4; g.stroke();
    g.strokeStyle = SHADE; g.lineWidth = 4; g.beginPath(); g.ellipse(440, 270, 46, 24, -0.15, 0.3, 1.6); g.stroke();
  },
  'spine-1': (g) => spineRun(g, 0, 0.36),
  'spine-2': (g) => spineRun(g, 0.36, 0.68),
  'spine-3': (g) => spineRun(g, 0.68, 1),
  'rib-1': (g) => rib(g, [545, 242], 128, 26),
  'rib-2': (g) => rib(g, [602, 236], 152, 30),
  'rib-3': (g) => rib(g, [662, 240], 150, 28),
  'rib-4': (g) => rib(g, [716, 250], 112, 22),
  'neck-1': (g) => chain(g, J.neck, J.neck2, 3, 22, 19),
  'neck-2': (g) => chain(g, J.neck2, J.head, 3, 18, 15),
  'tail-1': (g) => chain(g, J.tail, J.tail2, 4, 19, 15),
  'tail-2': (g) => chain(g, J.tail2, J.tail3, 4, 14, 11),
  'tail-3': (g) => { chain(g, J.tail3, J.tip, 4, 10, 7); knob(g, J.tip[0] - 4, J.tip[1] + 2, 7); },
};
function spineRun(g, t0, t1) {
  const n = 3;
  for (let i = 0; i < n; i++) {
    const t = lerp(t0, t1, (i + 0.5) / n), p = arch(t), q = arch(Math.min(1, t + 0.02)), o = arch(Math.max(0, t - 0.02));
    vertebra(g, p[0], p[1], 21, Math.atan2(q[1] - o[1], q[0] - o[0]));
  }
}

/** The skull. face: 'calm' (sleepy dot eye), 'alive' (big bright eye), 'ahh' (eye squinting), 'sneeze'. */
export function drawSkull(g, face = 'calm', t = 0) {
  const key = face === 'sneeze' || face === 'ahh' ? 'prop/dino-skull-sneeze' : 'prop/dino-skull';
  const im = art(key) || art('prop/dino-skull');
  const b = PIECES.head.box;
  if (im) {
    g.drawImage(im, b[0], b[1], b[2] - b[0], b[3] - b[1]);
    if (face === 'alive' && !art('prop/dino-skull-alive')) {   // a twinkle in the socket
      g.fillStyle = '#ffffff'; g.globalAlpha *= 0.9; g.beginPath(); g.arc(972, 66, 6 + Math.sin(t * 8) * 1.5, 0, TAU); g.fill();
    }
    return;
  }
  const open = face === 'sneeze' ? 1 : face === 'ahh' ? 0.25 : 0;
  knob(g, J.head[0], J.head[1], 18);
  // lower jaw (drops open for the sneeze)
  g.save(); g.translate(948, 122); g.rotate(open * 0.42);
  g.beginPath(); g.ellipse(64, 14, 70, 17, 0.02, 0, TAU); inkFill(g, CREAM, 8);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) { const x = 30 + i * 18; g.beginPath(); g.moveTo(x - 7, 2); g.lineTo(x, -9); g.lineTo(x + 7, 2); g.closePath(); g.fill(); g.strokeStyle = NAVY; g.lineWidth = 2.5; g.stroke(); }
  g.restore();
  // cranium + snout
  g.beginPath();
  g.ellipse(958, 82, 64, 54, -0.1, 0, TAU);
  g.moveTo(1088, 104); g.ellipse(1032, 104, 56, 30, 0.08, 0, TAU);
  inkFill(g, CREAM, 8);
  g.strokeStyle = SHADE; g.lineWidth = 4; g.beginPath(); g.arc(950, 92, 44, 1.9, 2.9); g.stroke();
  if (open > 0.5) { g.fillStyle = '#7a3b5a'; g.beginPath(); g.ellipse(1000, 128, 46, 14, 0.25, 0, Math.PI); g.fill(); }
  // upper teeth
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 2.5;
  for (let i = 0; i < 5; i++) { const x = 990 + i * 18, y = 124 - i * 1.2; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x, y + 10); g.lineTo(x + 7, y); g.closePath(); g.fill(); g.stroke(); }
  // smile line
  g.strokeStyle = NAVY; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(978, 122); g.quadraticCurveTo(1030, 132, 1084, 112); g.stroke();
  // nostril
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(1070, 92, 7, 4.5, 0.3, 0, TAU); g.fill();
  // eye
  if (face === 'sneeze' || face === 'ahh') {
    g.strokeStyle = NAVY; g.lineWidth = 6; g.beginPath(); g.arc(964, 78, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  } else {
    g.fillStyle = '#6b5577'; g.beginPath(); g.arc(964, 72, 25, 0, TAU); g.fill(); g.strokeStyle = NAVY; g.lineWidth = 5; g.stroke();
    if (face === 'alive') {
      const blink = (t % 3.2) < 0.12;
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(968, 72, 16, blink ? 2 : 16, 0, 0, TAU); g.fill();
      if (!blink) { g.fillStyle = NAVY; g.beginPath(); g.arc(973, 74, 8, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(976, 70, 3, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,140,170,0.45)'; g.beginPath(); g.ellipse(1010, 112, 14, 8, 0, 0, TAU); g.fill();
    } else { g.fillStyle = '#f6ecd2'; g.beginPath(); g.arc(970, 70, 5, 0, TAU); g.fill(); }
  }
}

// ---------------------------------------------------------------- silly parts
export function drawDuckHead(g, face = 'calm', t = 0) {
  const s = SILLY.duck, im = art('prop/rubber-duck');
  if (im) {
    const w = s.w, h = w * im.height / im.width;
    g.save(); g.translate(s.at[0], s.at[1]);
    if (face === 'sneeze') g.scale(1.12, 0.9); else if (face === 'ahh') { g.rotate(-0.25); g.scale(0.95, 1.08); }
    g.drawImage(im, -w / 2, -h / 2, w, h);
    g.restore();
    return;
  }
  g.save(); g.translate(s.at[0], s.at[1]);
  g.beginPath(); g.ellipse(-10, 18, 80, 62, 0, 0, TAU); g.moveTo(40, -30); g.arc(12, -32, 46, 0, TAU); inkFill(g, '#ffd23f', 7);
  g.beginPath(); g.ellipse(70, -22, 34, 15, 0.1, 0, TAU); inkFill(g, '#ff9f1c', 6);
  g.fillStyle = NAVY; g.beginPath(); g.arc(24, -44, 7, 0, TAU); g.fill();
  g.restore();
}
export function drawTeapot(g) {
  const s = SILLY.teapot, im = art('prop/fhs-teapot');
  g.save(); g.translate(s.at[0], s.at[1]); g.scale(-1, 1);   // spout out to the left, handle on the tail
  if (im) { const w = s.w, h = w * im.height / im.width; g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); return; }
  g.beginPath(); g.ellipse(0, 10, 58, 46, 0, 0, TAU);
  g.moveTo(52, 0); g.quadraticCurveTo(92, -6, 98, -40); g.lineTo(84, -40); g.quadraticCurveTo(80, -14, 52, 14);
  inkFill(g, '#ffffff', 7);
  g.beginPath(); g.arc(-62, 8, 24, Math.PI * 0.5, Math.PI * 1.5); g.lineWidth = 12; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke();
  g.beginPath(); g.ellipse(0, -36, 30, 10, 0, 0, TAU); g.moveTo(10, -48); g.arc(0, -48, 10, 0, TAU); inkFill(g, '#ff9fd8', 6);
  g.fillStyle = '#ff7ac6'; for (const [x, y] of [[-20, 10], [18, 18], [0, -6]]) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); }
  g.restore();
}
export function drawSock(g) {
  const s = SILLY.sock, im = art('prop/beach-sock');
  g.save(); g.translate(s.at[0], s.at[1]); g.scale(-1, 1);   // the toe points the way the dino faces
  if (im) { const w = s.w, h = w * im.height / im.width; g.drawImage(im, -w / 2, -h, w, h); g.restore(); return; }
  g.beginPath(); g.moveTo(-20, -90); g.lineTo(18, -90); g.lineTo(18, -30); g.quadraticCurveTo(18, 0, -10, 0); g.lineTo(-38, 0); g.quadraticCurveTo(-50, -18, -24, -28); g.closePath();
  inkFill(g, '#ff9fd8', 6);
  g.fillStyle = '#3fa7ff'; for (let i = 0; i < 3; i++) g.fillRect(-18, -84 + i * 18, 34, 8);
  g.restore();
}
export function drawCrown(g, w = SILLY.crown.w) {
  const im = art('prop/treasure-crown');
  if (im) { const h = w * im.height / im.width; g.drawImage(im, -w / 2, -h, w, h); return; }
  g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -w * 0.45); g.lineTo(-w / 4, -w * 0.2); g.lineTo(0, -w * 0.55); g.lineTo(w / 4, -w * 0.2); g.lineTo(w / 2, -w * 0.45); g.lineTo(w / 2, 0); g.closePath();
  inkFill(g, '#ffd23f', 6);
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, -w * 0.14, w * 0.08, 0, TAU); g.fill();
}
export function drawTeacup(g, w = SILLY.teacup.w) {
  const im = art('prop/dino-teacup');
  if (im) { const h = w * im.height / im.width; g.drawImage(im, -w / 2, -h, w, h); return; }
  g.beginPath(); g.ellipse(0, -6, w * 0.55, w * 0.1, 0, 0, TAU); inkFill(g, '#ffffff', 5);
  g.beginPath(); g.moveTo(-w * 0.38, -w * 0.5); g.lineTo(w * 0.38, -w * 0.5); g.quadraticCurveTo(w * 0.36, -w * 0.08, 0, -w * 0.1); g.quadraticCurveTo(-w * 0.36, -w * 0.08, -w * 0.38, -w * 0.5); g.closePath();
  inkFill(g, '#ffffff', 5);
  g.beginPath(); g.arc(w * 0.42, -w * 0.33, w * 0.12, -1.4, 1.4); g.lineWidth = 8; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(-w * 0.1, -w * 0.3, w * 0.08, 0, TAU); g.fill(); g.beginPath(); g.arc(w * 0.16, -w * 0.26, w * 0.06, 0, TAU); g.fill();
  g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.moveTo(-w * 0.38, -w * 0.5); g.lineTo(w * 0.38, -w * 0.5); g.stroke();
}
/** A silly part as a loose item (popping out of the sand / flying), centred, about `size` wide. */
export function drawSillyItem(g, id, size) {
  g.save();
  if (id === 'duck') { const k = size / SILLY.duck.w; g.scale(k, k); g.translate(-SILLY.duck.at[0], -SILLY.duck.at[1]); drawDuckHead(g); }
  else if (id === 'teapot') { const k = size / SILLY.teapot.w; g.scale(-k, k); g.translate(-SILLY.teapot.at[0], -SILLY.teapot.at[1]); drawTeapot(g); }
  else if (id === 'sock') { const k = size / SILLY.sock.w; g.scale(-k, k); g.translate(-SILLY.sock.at[0], -SILLY.sock.at[1] + 45); drawSock(g); }
  else if (id === 'crown') { g.translate(0, size * 0.4); drawCrown(g, size); }
  else if (id === 'teacup') { g.translate(0, size * 0.4); drawTeacup(g, size); }
  g.restore();
}

// ---------------------------------------------------------------- the whole dino
/** Draw one piece (template space). f: 0..1 built (unbuilt part as a faint ghost), pop: 0..1 click-in bounce. */
function drawPiece(g, id, f, pop, opts) {
  const P = PIECES[id], b = P.box;
  const raw = () => {
    if (id === 'head') { if (opts.head === 'duck') drawDuckHead(g, opts.face, opts.t); else drawSkull(g, opts.face, opts.t); return; }
    if (id === 'tail-3' && opts.tail === 'teapot') { drawTeapot(g); return; }
    const im = art(P.key);
    if (im) {
      // Register painted rib caps inside the existing rig transform; keep logical joints fixed.
      const x = b[0] + (P.renderOffset?.[0] || 0), y = b[1] + (P.renderOffset?.[1] || 0);
      if (P.far) { g.save(); try { g.filter = 'brightness(0.82)'; } catch (e) { /* older Safari */ } g.drawImage(im, x, y, b[2] - b[0], b[3] - b[1]); g.restore(); }
      else g.drawImage(im, x, y, b[2] - b[0], b[3] - b[1]);
    } else PROC[id](g);
  };
  g.save();
  if (P.far) g.translate(FAR_OFF[0], FAR_OFF[1]);
  if (pop > 0) {
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, k = 1 + Math.sin(pop * Math.PI) * 0.18;
    g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy);
  }
  if (f < 1 && opts.ghost) {
    g.save(); g.globalAlpha *= 0.17; raw(); g.restore();
  }
  if (f > 0) {
    g.save();
    if (f < 1) {
      const pad = 30, x0 = b[0] - pad, y0 = b[1] - pad, w = b[2] - b[0] + pad * 2, h = b[3] - b[1] + pad * 2;
      g.beginPath();
      if (P.grow === 'up') g.rect(x0, y0 + h * (1 - f), w, h * f);
      else if (P.grow === 'down') g.rect(x0, y0, w, h * f);
      else if (P.grow === 'right') g.rect(x0, y0, w * f, h);
      else g.rect(x0 + w * (1 - f), y0, w * f, h);
      g.clip();
    }
    raw();
    g.restore();
  }
  g.restore();
}

/**
 * The skeleton. st = {
 *   built: { id: 0..1 }, pop: { id: 0..1 }, head: 'skull'|'duck', tail: 'tail'|'teapot',
 *   extras: { sock, crown, teacup: 0..1 (shown when > 0, pop while < 1) }, face, t, ghost,
 *   pose: { bob, sway, hop, legs: [bf, ff, b, f], neck, head, tail, lean }
 * }
 */
export function drawDino(g, st) {
  const p = st.pose || {}, legs = p.legs || [0, 0, 0, 0];
  g.save();
  g.translate(DINO.x, DINO.y); g.scale(DINO.k, DINO.k); g.translate(-DINO.ox, -DINO.oy);
  const lean = p.lean || 0;
  g.translate(0, -(p.hop || 0));
  // shadow on the plinth
  g.save(); g.globalAlpha = 0.18 * (st.shadow ?? 1); g.fillStyle = NAVY; g.beginPath(); g.ellipse(600, 486, 330 - (p.hop || 0) * 0.4, 18, 0, 0, TAU); g.fill(); g.restore();
  const bodyT = () => { g.translate(0, -(p.bob || 0)); g.translate(585, 300); g.rotate((p.sway || 0) + lean); g.translate(-585, -300); };
  const rot = (j, a) => { g.translate(j[0], j[1]); g.rotate(a); g.translate(-j[0], -j[1]); };
  const xf = {
    legBF: () => { g.translate(0, -(p.bob || 0) * 0.5); rot(J.hip, legs[0]); },
    legFF: () => { g.translate(0, -(p.bob || 0) * 0.5); rot(J.sh, legs[1]); },
    legB: () => { g.translate(0, -(p.bob || 0) * 0.5); rot(J.hip, legs[2]); },
    legF: () => { g.translate(0, -(p.bob || 0) * 0.5); rot(J.sh, legs[3]); },
    body: bodyT,
    neck1: () => { bodyT(); rot(J.neck, p.neck || 0); },
    neck2: () => { bodyT(); rot(J.neck, p.neck || 0); rot(J.neck2, (p.neck || 0) * 0.7); },
    head: () => { bodyT(); rot(J.neck, p.neck || 0); rot(J.neck2, (p.neck || 0) * 0.7); rot(J.head, p.head || 0); },
    tail1: () => { bodyT(); rot(J.tail, p.tail || 0); },
    tail2: () => { bodyT(); rot(J.tail, p.tail || 0); rot(J.tail2, (p.tail || 0) * 1.25); },
    tail3: () => { bodyT(); rot(J.tail, p.tail || 0); rot(J.tail2, (p.tail || 0) * 1.25); rot(J.tail3, (p.tail || 0) * 1.5); },
  };
  const ex = st.extras || {};
  const extra = (id, fn) => {
    const v = ex[id] || 0; if (v <= 0) return;
    const s = SILLY[id], k = v < 1 ? 1 + Math.sin(v * Math.PI) * 0.35 : 1;
    g.save(); g.translate(s.at[0], s.at[1]); if (s.rot) g.rotate(s.rot); g.scale(k, k); fn(); g.restore();
  };
  for (const id of DRAW) {
    const f = st.built[id] || 0;
    if (f <= 0 && !st.ghost) continue;
    g.save();
    xf[PIECES[id].rig]();
    drawPiece(g, id, f, st.pop?.[id] || 0, st);
    if (id === 'spine-2' && (st.built['spine-2'] || 0) >= 1) extra('teacup', () => drawTeacup(g));
    if (id === 'head' && f >= 1) extra('crown', () => { if (st.head === 'duck') g.translate(14, -10); drawCrown(g); });
    if (id === 'leg-front' && f >= 1) extra('sock', () => { g.translate(-SILLY.sock.at[0], -SILLY.sock.at[1]); drawSock(g); });
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- bones, mounds, holes
const BONE_CELLS = 8;
/** One loose bone (atlas cell idx), centred, `size` px long. */
export function drawBone(g, idx, size) {
  const im = art('prop/dino-bones');
  if (im) {
    const cw = im.width / 4, ch = im.height / 2, i = ((idx % BONE_CELLS) + BONE_CELLS) % BONE_CELLS;
    g.drawImage(im, (i % 4) * cw, Math.floor(i / 4) * ch, cw, ch, -size / 2, -size / 2, size, size);
    return;
  }
  const L = size * 0.62, w = size * 0.3;
  boneSeg(g, -L / 2, 0, L / 2, 0, w);
}

/** A sand mound at (x, y) (bottom centre), dug d = 0..1; hint 'bone' | 'sparkle'. */
export function drawMound(g, m, t) {
  const d = clamp(m.dug, 0, 1), w = 172 * m.s, sq = m.sq || 0;
  // the hole (behind the shrinking heap, it opens in front)
  if (d > 0) drawHole(g, m.x, m.y + 6, (60 + 110 * d) * m.s, d);
  const hk = (1 - d * 0.75) * (1 + sq * 0.15), wk = 1 - sq * 0.08;
  const im = art('prop/dino-mound');
  g.save(); g.translate(m.x, m.y - 4);
  g.scale(wk, hk);
  if (im) { const h = w * im.height / im.width; g.drawImage(im, -w / 2, -h, w, h); }
  else {
    g.beginPath();
    g.moveTo(-w / 2, 0);
    g.bezierCurveTo(-w * 0.45, -w * 0.28, -w * 0.18, -w * 0.4, 0, -w * 0.38);
    g.bezierCurveTo(w * 0.2, -w * 0.42, w * 0.46, -w * 0.25, w / 2, 0);
    g.closePath();
    g.fillStyle = '#e9c27a'; g.fill();
    g.strokeStyle = 'rgba(122,84,40,0.55)'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#f7dc9e';
    g.beginPath(); g.ellipse(-w * 0.12, -w * 0.27, w * 0.2, w * 0.07, -0.2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(160,110,60,0.45)';
    for (const [px, py, r] of [[-0.3, -0.08, 0.025], [0.22, -0.12, 0.02], [0.05, -0.2, 0.018], [0.33, -0.05, 0.022]]) { g.beginPath(); g.arc(px * w, py * w, r * w, 0, TAU); g.fill(); }
  }
  g.restore();
  // the hint on top
  // The authored mound rises 80 px inside its 320 px canvas; the fallback is taller.
  const topY = m.y - 4 - w * (im ? 80 / 320 : 0.36) * hk;
  if (d < 0.9) {
    if (m.hint === 'bone') {
      g.save(); g.translate(m.x + w * 0.12, topY + 6); g.rotate(-0.7 + Math.sin(t * 2 + m.ph) * 0.05);
      g.beginPath(); g.rect(-60, -60, 120, 60); g.clip();
      drawBone(g, m.bone, 62 * m.s);
      g.restore();
    } else {
      const tw = (Math.sin(t * 4 + m.ph) + 1) / 2;
      g.save(); g.translate(m.x - w * 0.08, topY - 4); g.rotate(t * 0.8 + m.ph); g.globalAlpha = 0.5 + tw * 0.5;
      const r = (10 + tw * 9) * m.s;
      g.fillStyle = '#fff8c8';
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? r * 0.32 : r; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); g.fill();
      g.restore();
    }
  }
}
export function drawHole(g, x, y, w, depth = 1, alpha = 1) {
  const im = art('prop/sand-hole');
  g.save(); g.globalAlpha *= alpha;
  if (im) { const h = w * im.height / im.width; g.drawImage(im, x - w / 2, y - h / 2, w, h); g.restore(); return; }
  g.fillStyle = '#d9ae66'; g.beginPath(); g.ellipse(x, y, w * 0.56, w * 0.24, 0, 0, TAU); g.fill();
  g.fillStyle = `rgba(110,70,30,${0.4 + depth * 0.35})`; g.beginPath(); g.ellipse(x, y + 2, w * 0.42, w * 0.16, 0, 0, TAU); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- worn & held
/** Explorer hat, origin = top of the head, S = head width, facing right. */
export function drawHat(g, S) {
  const w = S * 1.25, im = art('prop/dino-explorer-hat');
  if (im) {
    const h = w * im.height / im.width;
    // Measured central brim underside: (120, 134) on the 240 x 160 art canvas.
    g.drawImage(im, -w / 2, -h * (134 / 160), w, h);
    return;
  }
  g.beginPath(); g.ellipse(0, -w * 0.02, w * 0.5, w * 0.1, 0, 0, TAU); inkFill(g, '#c9a463', Math.max(3, w * 0.035));
  g.beginPath(); g.moveTo(-w * 0.33, -w * 0.04); g.bezierCurveTo(-w * 0.33, -w * 0.48, w * 0.33, -w * 0.48, w * 0.33, -w * 0.04); g.closePath();
  inkFill(g, '#dcbb7a', Math.max(3, w * 0.035));
  g.fillStyle = '#e0533d'; g.fillRect(-w * 0.32, -w * 0.13, w * 0.64, w * 0.07);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-w * 0.1, -w * 0.3, w * 0.1, w * 0.05, -0.4, 0, TAU); g.fill();
}
/** The spade, gripped at the origin, blade down and forward; L = length in px, a = scoop angle. */
export function drawSpade(g, L, a = 0) {
  const im = art('prop/sand-spade');
  g.save(); g.rotate(a);
  if (im) {
    // the art stands up with the blade at the bottom left: mirror it so the blade leads forward
    const h = L, w = h * im.width / im.height;
    g.scale(-1, 1); g.rotate(-0.35);
    g.drawImage(im, -w * 0.72, -h * 0.14, w, h);
  } else {
    g.rotate(0.35);
    g.lineCap = 'round';
    g.strokeStyle = NAVY; g.lineWidth = L * 0.1; g.beginPath(); g.moveTo(0, -L * 0.08); g.lineTo(0, L * 0.6); g.stroke();
    g.strokeStyle = '#ffd23f'; g.lineWidth = L * 0.06; g.stroke();
    g.beginPath(); g.moveTo(-L * 0.17, L * 0.58); g.lineTo(L * 0.17, L * 0.58); g.lineTo(L * 0.12, L * 0.92); g.quadraticCurveTo(0, L * 1.02, -L * 0.12, L * 0.92); g.closePath();
    inkFill(g, '#3fa7ff', Math.max(3, L * 0.04));
  }
  g.restore();
}

// ---------------------------------------------------------------- the dig site
let bgCache = null;
export function drawSite(g, t) {
  const bg = art('bg/dino-dig');
  if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
  if (!bgCache) bgCache = buildSite();
  if (bgCache) g.drawImage(bgCache, 0, 0); else paintSite(g);
}
function buildSite() {
  try {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    paintSite(c.getContext('2d'));
    return c;
  } catch (e) { return null; }
}
function paintSite(g) {
  // sky
  const sky = g.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#d9f1ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, 430);
  // clouds
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y, s] of [[260, 120, 1], [1580, 90, 1.2], [760, 60, 0.7], [1240, 170, 0.8]]) {
    g.beginPath(); g.ellipse(x, y, 70 * s, 26 * s, 0, 0, TAU); g.ellipse(x + 50 * s, y - 14 * s, 46 * s, 30 * s, 0, 0, TAU); g.ellipse(x - 46 * s, y - 6 * s, 36 * s, 22 * s, 0, 0, TAU); g.fill();
  }
  // far mesas
  const mesa = (x0, x1, top, col) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(x0 - 60, 430); g.lineTo(x0, top + 20); g.quadraticCurveTo(x0 + 10, top, x0 + 40, top); g.lineTo(x1 - 40, top); g.quadraticCurveTo(x1 - 10, top, x1, top + 20); g.lineTo(x1 + 60, 430); g.closePath(); g.fill();
  };
  mesa(-40, 380, 250, '#f0a978'); mesa(1500, 1960, 230, '#f0a978'); mesa(300, 640, 300, '#e9b48c'); mesa(1250, 1620, 290, '#e9b48c');
  g.fillStyle = '#f2c99a'; g.fillRect(0, 380, W, 60);
  // the desert floor behind the plinth, down to the sandbox
  const floor = g.createLinearGradient(0, 430, 0, 560);
  floor.addColorStop(0, '#f0c48e'); floor.addColorStop(1, '#e5b47a');
  g.fillStyle = floor; g.fillRect(0, 430, W, 140);
  // cacti
  const cactus = (x, y, s) => {
    g.fillStyle = '#6cc47a'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); rr(g, x - 12 * s, y - 90 * s, 24 * s, 90 * s, 12 * s); rr(g, x - 38 * s, y - 62 * s, 16 * s, 34 * s, 8 * s); rr(g, x + 22 * s, y - 72 * s, 16 * s, 30 * s, 8 * s);
    g.rect(x - 30 * s, y - 36 * s, 20 * s, 10 * s); g.rect(x + 10 * s, y - 50 * s, 20 * s, 10 * s);
    g.fill();
  };
  cactus(170, 440, 1); cactus(1790, 445, 1.15); cactus(330, 420, 0.6);
  // the plinth
  const P = PLINTH;
  g.fillStyle = '#c98c55'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); rr(g, P.x0, P.top - 12, P.x1 - P.x0, 24, 10); g.fill(); g.stroke();
  g.fillStyle = '#a86d3d'; g.beginPath(); rr(g, P.x0 + 14, P.top + 8, P.x1 - P.x0 - 28, P.front - P.top - 8, 6); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 3;
  for (let x = P.x0 + 120; x < P.x1 - 40; x += 160) { g.beginPath(); g.moveTo(x, P.top + 12); g.lineTo(x, P.front - 4); g.stroke(); }
  // the sandbox
  const sand = g.createLinearGradient(0, 540, 0, H);
  sand.addColorStop(0, '#efcd8d'); sand.addColorStop(1, '#f6dca6');
  g.fillStyle = sand; g.fillRect(0, 540, W, H - 540);
  g.strokeStyle = 'rgba(190,140,80,0.28)'; g.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const y = 580 + i * 19 + (i % 3) * 3, x = 120 + ((i * 397) % 1500);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 60, y - 8, x + 130, y); g.stroke();
  }
  // plank frame
  g.fillStyle = '#c98c55'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); rr(g, 40, 528, W - 80, 30, 8); g.fill(); g.stroke();
  g.beginPath(); rr(g, 40, 540, 40, H - 520, 8); g.fill(); g.stroke();
  g.beginPath(); rr(g, W - 80, 540, 40, H - 520, 8); g.fill(); g.stroke();
  // flag stakes in the corners
  for (const [x, y, c] of [[110, 620, '#ff4d6d'], [1810, 640, '#3fa7ff'], [100, 1000, '#ffd23f'], [1820, 1010, '#5ddc6a']]) {
    g.strokeStyle = '#7a5230'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 70); g.stroke();
    g.fillStyle = c; g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - 70); g.lineTo(x + 34, y - 58); g.lineTo(x, y - 46); g.closePath(); g.fill(); g.stroke();
  }
}

/** The "bones found" pips on the plinth's front face: one per piece, filling as it's built. */
export function drawPips(g, slots, t) {
  const n = slots.length, gap = 48, x0 = DINO.x - ((n - 1) / 2) * gap, y = PLINTH.top + 27;
  slots.forEach((s, i) => {
    const x = x0 + i * gap, f = s.quota ? s.have / s.quota : 0;
    g.save(); g.translate(x, y);
    const k = 1 + Math.sin(clamp(s.pop || 0, 0, 1) * Math.PI) * 0.4;
    g.scale(k, k);
    if (s.kind === 'duck' || s.kind === 'teapot') {
      g.globalAlpha = f >= 1 ? 1 : 0.3; drawSillyItem(g, s.kind, 34);
    } else {
      g.save(); g.globalAlpha = 0.28; boneSeg(g, -14, 0, 14, 0, 12); g.restore();
      if (f > 0) { g.save(); g.beginPath(); g.rect(-24, -14, 48 * f, 28); g.clip(); boneSeg(g, -14, 0, 14, 0, 12); g.restore(); }
    }
    g.restore();
  });
}
