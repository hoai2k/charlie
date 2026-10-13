// Choo-Choo Shapes: procedural art (shapes, toy animals, the engine with a
// face, carriages, the cow, the station backdrop). Every piece first tries a
// generated image (`art()` / `drawArt()`) and falls back to the drawing here.
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { starPath } from '../../engine/emotes.js';
import { clamp, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';

// Rail and platform geometry shared with the game (and the bg art request).
export const TRACK_Y = 486;     // foreground rail top: train wheels sit here
export const FAR_Y = 318;       // the far loop track
export const TUNNEL = [1370, 1590];
export const COW = { x: 560, y: 300 };
export const RIVER = [820, 1080];

export const SHAPES = {
  circle:   { color: '#ff5a5f', light: '#ffc9cb', car: '#ff8f8f', dark: '#c93a46' },
  square:   { color: '#3fa2ff', light: '#c4e3ff', car: '#7cc0ff', dark: '#2a72c9' },
  triangle: { color: '#3fcf6e', light: '#c4f2d4', car: '#7fe09e', dark: '#25995a' },
  star:     { color: '#ffcf2e', light: '#fff1b3', car: '#ffdf6e', dark: '#d9a100' },
  heart:    { color: '#ff6fbf', light: '#ffd3ec', car: '#ff9fd3', dark: '#d1458f' },
};
export const SHAPE_IDS = Object.keys(SHAPES);
const CAR_ART = { circle: 'red', square: 'blue', triangle: 'green', star: 'yellow', heart: 'pink' };

// --- shapes -------------------------------------------------------------------------------
/** Path of a shape centred on 0,0 with "radius" r. */
export function shapePath(g, kind, r) {
  g.beginPath();
  if (kind === 'circle') g.arc(0, 0, r, 0, TAU);
  else if (kind === 'square') {
    const s = r * 0.86, c = r * 0.2;
    g.moveTo(-s + c, -s); g.arcTo(s, -s, s, s, c); g.arcTo(s, s, -s, s, c); g.arcTo(-s, s, -s, -s, c); g.arcTo(-s, -s, s, -s, c); g.closePath();
  } else if (kind === 'triangle') {
    const p = [[0, -r * 1.02], [r * 1.0, r * 0.78], [-r * 1.0, r * 0.78]], c = r * 0.18;
    g.moveTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2);
    g.arcTo(p[1][0], p[1][1], p[2][0], p[2][1], c); g.arcTo(p[2][0], p[2][1], p[0][0], p[0][1], c); g.arcTo(p[0][0], p[0][1], p[1][0], p[1][1], c); g.closePath();
  } else if (kind === 'star') {
    starPath(g, r * 1.12, 0.5);
  } else {
    // heart
    const s = r * 1.05;
    g.moveTo(0, s * 0.82);
    g.bezierCurveTo(-s * 1.25, -s * 0.05, -s * 0.72, -s * 1.05, 0, -s * 0.45);
    g.bezierCurveTo(s * 0.72, -s * 1.05, s * 1.25, -s * 0.05, 0, s * 0.82);
    g.closePath();
  }
}

/** A glossy shape badge (the placards the animals hold, HUD pips). */
export function drawShape(g, kind, r, { fill, line = Math.max(2, r * 0.16), glow = 0 } = {}) {
  const S = SHAPES[kind];
  if (glow > 0) {
    g.save(); g.globalAlpha *= glow; g.shadowColor = S.color; g.shadowBlur = r * 0.9;
    shapePath(g, kind, r); g.fillStyle = S.color; g.fill(); g.restore();
  }
  shapePath(g, kind, r);
  g.fillStyle = fill || S.color; g.fill();
  g.lineJoin = 'round'; g.lineWidth = line; g.strokeStyle = NAVY; g.stroke();
  g.save(); shapePath(g, kind, r); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath(); g.ellipse(-r * 0.32, -r * 0.42, r * 0.36, r * 0.18, -0.5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(36,22,63,0.14)';
  g.beginPath(); g.ellipse(r * 0.1, r * 1.05, r * 1.2, r * 0.45, 0, 0, TAU); g.fill();
  g.restore();
}

// --- toy animals --------------------------------------------------------------------------
export const ANIMALS = {
  bunny:    { body: '#f4eefc', shade: '#d9cdee', inner: '#ffb3d1', scarf: '#ff6fbf' },
  bear:     { body: '#c98a55', shade: '#a86c3d', inner: '#f2cfa2', scarf: '#3fa2ff' },
  duck:     { body: '#ffe066', shade: '#f2c230', inner: '#ff9f1c', scarf: '#ff5a5f' },
  pig:      { body: '#ffb8cf', shade: '#f08fb0', inner: '#ff8fb4', scarf: '#3fcf6e' },
  cat:      { body: '#ffae5c', shade: '#e88a36', inner: '#ffd6e4', scarf: '#9b5cff' },
  frog:     { body: '#78d66b', shade: '#53b04a', inner: '#ffb3c6', scarf: '#ffcf2e' },
  elephant: { body: '#a9bde0', shade: '#8399c4', inner: '#ffc1d6', scarf: '#ff9f1c' },
  penguin:  { body: '#3e4a6e', shade: '#2b3452', inner: '#ffffff', scarf: '#ff5a5f' },
};
export const ANIMAL_IDS = Object.keys(ANIMALS);

/**
 * A chubby toy animal standing with its feet at 0,0, about `h` tall.
 * o.arms: 'up' (holding a placard), 'down', 'wave'; o.blink 0..1; o.face 'happy'|'o'|'squint'.
 * Returns the paw-top y (where a placard goes) in local units.
 */
export function drawAnimal(g, kind, h, t = 0, o = {}) {
  const A = ANIMALS[kind] || ANIMALS.bunny;
  const key = 'prop/shape-train-animal-' + kind;
  if (art(key)) { drawArt(g, key, 0, 0, h * 1.15, h * 1.15, { anchor: 'bottom' }); return -h * 1.02; }
  const s = h / 100;
  g.save(); g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const line = 4.5;
  g.strokeStyle = NAVY; g.lineWidth = line;
  // feet
  g.fillStyle = kind === 'duck' || kind === 'penguin' ? '#ff9f1c' : A.shade;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 13, -4, 11, 6.5, 0, 0, TAU); g.fill(); g.stroke(); }
  // body
  g.fillStyle = A.body;
  g.beginPath(); g.ellipse(0, -26, 23, 24, 0, 0, TAU); g.fill(); g.stroke();
  if (kind === 'penguin' || kind === 'duck' || kind === 'frog') {
    g.fillStyle = kind === 'penguin' ? '#ffffff' : 'rgba(255,255,255,0.45)';
    g.beginPath(); g.ellipse(0, -22, 14, 17, 0, 0, TAU); g.fill();
  }
  // arms
  const arms = o.arms || 'down';
  g.fillStyle = A.body;
  const arm = (sx, up) => {
    g.save(); g.translate(sx * 19, -36);
    g.rotate(sx * (up === 2 ? -2.2 + Math.sin(t * 14) * 0.35 : up ? -2.55 : -0.5));
    g.beginPath(); g.ellipse(0, 13, 7.5, 14, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  };
  arm(-1, arms === 'up' ? 1 : 0); arm(1, arms === 'up' ? 1 : arms === 'wave' ? 2 : 0);
  // scarf
  g.fillStyle = A.scarf;
  g.beginPath(); g.ellipse(0, -46, 20, 6.5, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(8, -44); g.lineTo(16, -30 + Math.sin(t * 6) * 2); g.lineTo(22, -34); g.closePath(); g.fill(); g.stroke();
  // head
  const hy = -70;
  drawHeadFeatures(g, kind, A, hy, t, 'back');
  g.fillStyle = A.body;
  g.beginPath(); g.ellipse(0, hy, 27, 25, 0, 0, TAU); g.fill(); g.stroke();
  drawHeadFeatures(g, kind, A, hy, t, 'front');
  drawFace(g, kind, A, hy, o);
  g.restore();
  return (arms === 'up' ? -112 : -100) * s;
}

function drawHeadFeatures(g, kind, A, hy, t, layer) {
  g.fillStyle = A.body; g.strokeStyle = NAVY;
  if (layer === 'back') {
    if (kind === 'bunny') {
      for (const sx of [-1, 1]) {
        g.save(); g.translate(sx * 11, hy - 18); g.rotate(sx * (0.18 + Math.sin(t * 3 + sx) * 0.06));
        g.fillStyle = A.body; g.beginPath(); g.ellipse(0, -20, 8.5, 22, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = A.inner; g.beginPath(); g.ellipse(0, -19, 4, 15, 0, 0, TAU); g.fill();
        g.restore();
      }
    } else if (kind === 'bear') {
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 20, hy - 18, 9.5, 0, TAU); g.fill(); g.stroke(); g.fillStyle = A.inner; g.beginPath(); g.arc(sx * 20, hy - 18, 4.5, 0, TAU); g.fill(); g.fillStyle = A.body; }
    } else if (kind === 'cat' || kind === 'pig') {
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(sx * 8, hy - 20); g.lineTo(sx * 24, hy - (kind === 'cat' ? 40 : 32)); g.lineTo(sx * 26, hy - 10); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = A.inner; g.beginPath(); g.moveTo(sx * 13, hy - 19); g.lineTo(sx * 22, hy - (kind === 'cat' ? 33 : 27)); g.lineTo(sx * 22, hy - 15); g.closePath(); g.fill(); g.fillStyle = A.body;
      }
    } else if (kind === 'elephant') {
      for (const sx of [-1, 1]) {
        g.save(); g.translate(sx * 25, hy + 2); g.rotate(sx * Math.sin(t * 4) * 0.12);
        g.beginPath(); g.ellipse(sx * 6, 0, 16, 20, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = A.inner; g.beginPath(); g.ellipse(sx * 7, 0, 9, 12, 0, 0, TAU); g.fill();
        g.restore(); g.fillStyle = A.body;
      }
    } else if (kind === 'frog') {
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 13, hy - 20, 11, 0, TAU); g.fill(); g.stroke(); }
    } else if (kind === 'duck') {
      g.beginPath(); g.ellipse(2, hy - 25, 4, 9, 0.4, 0, TAU); g.fill(); g.stroke();
    }
  } else {
    if (kind === 'penguin') {
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(-8, hy + 2, 11, 13, 0, 0, TAU); g.ellipse(8, hy + 2, 11, 13, 0, 0, TAU); g.fill();
    }
    if (kind === 'bear') { g.fillStyle = A.inner; g.beginPath(); g.ellipse(0, hy + 9, 11, 8, 0, 0, TAU); g.fill(); }
  }
}

function drawFace(g, kind, A, hy, o) {
  const blink = o.blink || 0, face = o.face || 'happy';
  const ey = kind === 'frog' ? hy - 20 : hy - 2, ex = kind === 'frog' ? 13 : 9.5;
  // eyes
  for (const sx of [-1, 1]) {
    g.save(); g.translate(sx * ex, ey);
    if (face === 'squint' || blink > 0.5) {
      g.strokeStyle = NAVY; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 2, 5, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else {
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, 0, 4.6, face === 'o' ? 6.5 : 5.6, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-1.4, -2, 1.8, 0, TAU); g.fill();
    }
    g.restore();
  }
  // cheeks
  g.fillStyle = 'rgba(255,110,150,0.45)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 17, hy + 8, 5, 3.2, 0, 0, TAU); g.fill(); }
  // nose / beak / snout / trunk + mouth
  g.strokeStyle = NAVY; g.lineWidth = 3;
  if (kind === 'duck' || kind === 'penguin') {
    g.fillStyle = '#ff9f1c'; g.beginPath(); g.ellipse(0, hy + 8, 9, 5, 0, 0, TAU); g.fill(); g.stroke();
    if (face === 'o') { g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, hy + 10, 3, 3, 0, 0, TAU); g.fill(); }
    return;
  }
  if (kind === 'pig') {
    g.fillStyle = A.inner; g.beginPath(); g.ellipse(0, hy + 7, 9, 6.5, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(-3, hy + 7, 1.6, 0, TAU); g.arc(3, hy + 7, 1.6, 0, TAU); g.fill();
  } else if (kind === 'elephant') {
    g.fillStyle = A.body; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(-5, hy + 4); g.quadraticCurveTo(-7, hy + 22, 2, hy + 27); g.quadraticCurveTo(10, hy + 22, 5, hy + 4); g.fill(); g.stroke();
  } else {
    g.fillStyle = kind === 'frog' ? '#3c8f37' : '#ff7aa8';
    g.beginPath(); g.ellipse(0, hy + 5, 3.6, 2.6, 0, 0, TAU); g.fill();
  }
  g.strokeStyle = NAVY; g.lineWidth = 3;
  const my = kind === 'elephant' ? hy + 12 : hy + 11;
  const mx = kind === 'elephant' ? 10 : 0;
  if (face === 'o') { g.fillStyle = NAVY; g.beginPath(); g.ellipse(mx, my + 1, 3.5, 4.5, 0, 0, TAU); g.fill(); }
  else if (kind === 'frog') { g.beginPath(); g.arc(0, hy + 2, 14, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); }
  else { g.beginPath(); g.arc(mx - 3.5, my, 3.5, 0.1 * Math.PI, 0.9 * Math.PI); g.arc(mx + 3.5, my, 3.5, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
  if (kind === 'cat') {
    g.lineWidth = 2; g.beginPath();
    for (const sx of [-1, 1]) { g.moveTo(sx * 9, hy + 7); g.lineTo(sx * 22, hy + 4); g.moveTo(sx * 9, hy + 10); g.lineTo(sx * 22, hy + 11); }
    g.stroke();
  }
}

/** Animal holding its shape placard above its head. */
export function drawPassenger(g, kind, shape, h, t, o = {}) {
  const top = drawAnimal(g, kind, h, t, { ...o, arms: 'up' });
  const r = h * 0.27 * (o.shapeScale || 1);
  g.save(); g.translate(0, top - r * 0.75 + (o.lift || 0)); g.rotate(o.shapeTilt || 0);
  drawShape(g, shape, r, { glow: o.glow || 0 });
  g.restore();
}

// --- train ----------------------------------------------------------------------------------
export const ENGINE_W = 330, ENGINE_H = 250;
export const CAR_W = 262, CAR_H = 196, GAP = 16;
export const ENGINE_COLORS = [
  { body: '#ff5a5f', dark: '#c93a46', trim: '#ffd23f', cab: '#3fa2ff' },
  { body: '#3fa2ff', dark: '#2a72c9', trim: '#ffd23f', cab: '#ff6fbf' },
  { body: '#9b5cff', dark: '#6c3bd6', trim: '#ffd23f', cab: '#3fcf6e' },
];

function wheel(g, x, y, r, rot, color) {
  g.save(); g.translate(x, y);
  g.fillStyle = color; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.16);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
  g.rotate(rot);
  g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = Math.max(1.5, r * 0.1);
  g.beginPath(); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; g.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); g.lineTo(-Math.cos(a) * r * 0.75, -Math.sin(a) * r * 0.75); } g.stroke();
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = Math.max(1.5, r * 0.1);
  g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/**
 * Engine, side view facing right; origin = bottom-left (rail level).
 * face: { look: -1..1, blink, mouth: 'smile'|'o'|'grin', cheeks }. Returns { funnel:{x,y}, face:{x,y,r} }.
 */
export function drawEngine(g, C, t, rot, face = {}) {
  const w = ENGINE_W, h = ENGINE_H;
  const out = { funnel: { x: w * 0.66, y: -h * 1.0 }, face: { x: w * 0.86, y: -h * 0.5, r: w * 0.16 } };
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  const hasArt = !!art('prop/shape-train-engine');
  if (hasArt) {
    drawArt(g, 'prop/shape-train-engine', w / 2, 0, w, h * 1.0, { anchor: 'bottom', fit: 'stretch' });
  } else {
    g.strokeStyle = NAVY; g.lineWidth = 6;
    // chassis
    g.fillStyle = '#4a3d6b'; roundRectPath(g, w * 0.02, -h * 0.3, w * 0.92, h * 0.12, 8); g.fill(); g.stroke();
    // cowcatcher
    g.fillStyle = C.trim; g.beginPath(); g.moveTo(w * 0.9, -h * 0.26); g.lineTo(w * 1.04, -h * 0.03); g.lineTo(w * 0.88, -h * 0.03); g.closePath(); g.fill(); g.stroke();
    // boiler
    const by = -h * 0.72, bh = h * 0.44;
    g.fillStyle = C.body; roundRectPath(g, w * 0.3, by, w * 0.58, bh, bh / 2.2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; roundRectPath(g, w * 0.36, by + bh * 0.12, w * 0.44, bh * 0.16, 8); g.fill();
    g.strokeStyle = C.trim; g.lineWidth = 7;
    for (const k of [0.46, 0.62]) { g.beginPath(); g.moveTo(w * k, by + 4); g.lineTo(w * k, by + bh - 4); g.stroke(); }
    g.strokeStyle = NAVY; g.lineWidth = 6;
    // funnel
    g.fillStyle = '#3a3150';
    g.beginPath(); g.moveTo(w * 0.61, by + 4); g.lineTo(w * 0.6, -h * 0.9); g.lineTo(w * 0.56, -h * 0.98); g.lineTo(w * 0.76, -h * 0.98); g.lineTo(w * 0.72, -h * 0.9); g.lineTo(w * 0.71, by + 4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.trim; roundRectPath(g, w * 0.55, -h * 1.02, w * 0.22, h * 0.07, 6); g.fill(); g.stroke();
    // dome + bell
    g.fillStyle = C.trim; g.beginPath(); g.ellipse(w * 0.45, by + 2, w * 0.06, h * 0.08, 0, Math.PI, TAU); g.fill(); g.stroke();
    // cab
    g.fillStyle = C.body; roundRectPath(g, w * 0.02, -h * 0.98, w * 0.32, h * 0.72, 14); g.fill(); g.stroke();
    g.fillStyle = C.dark; roundRectPath(g, -w * 0.02, -h * 1.06, w * 0.4, h * 0.12, 10); g.fill(); g.stroke();
    g.fillStyle = '#d8f2ff'; g.beginPath(); g.arc(w * 0.18, -h * 0.72, w * 0.075, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(w * 0.165, -h * 0.74, w * 0.025, 0, TAU); g.fill();
    g.fillStyle = C.trim; roundRectPath(g, w * 0.06, -h * 0.46, w * 0.24, h * 0.06, 5); g.fill(); g.stroke();
    // smokebox front (the face disc)
    g.fillStyle = '#5b4d80'; g.beginPath(); g.ellipse(out.face.x, out.face.y, out.face.r * 0.9, out.face.r * 1.12, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#f1e9ff'; g.beginPath(); g.ellipse(out.face.x + 3, out.face.y, out.face.r * 0.78, out.face.r * 0.98, 0, 0, TAU); g.fill(); g.stroke();
  }
  // wheels + rod (always live so they spin)
  g.strokeStyle = NAVY; g.lineWidth = 5;
  wheel(g, w * 0.19, -h * 0.17, h * 0.17, rot, C.body);
  wheel(g, w * 0.52, -h * 0.12, h * 0.12, rot * 1.4, C.body);
  wheel(g, w * 0.76, -h * 0.12, h * 0.12, rot * 1.4, C.body);
  const rx = Math.cos(rot * 1.4) * h * 0.07, ry = Math.sin(rot * 1.4) * h * 0.07;
  g.strokeStyle = '#d7d2e6'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(w * 0.52 + rx, -h * 0.12 + ry); g.lineTo(w * 0.76 + rx, -h * 0.12 + ry); g.stroke();
  g.strokeStyle = NAVY; g.lineWidth = 2.5; g.stroke();
  // the face
  drawEngineFace(g, out.face.x + 3, out.face.y, out.face.r * 0.85, t, face);
  g.restore();
  return out;
}

function drawEngineFace(g, x, y, r, t, f) {
  const look = clamp(f.look || 0, -1, 1) * r * 0.12, lookY = (f.lookY || 0) * r * 0.08;
  g.save(); g.translate(x, y);
  // eyes
  const blink = f.blink || 0;
  for (const sx of [-1, 1]) {
    const ex = sx * r * 0.36, ey = -r * 0.2;
    if (blink > 0.5 || f.mouth === 'grin') {
      g.strokeStyle = NAVY; g.lineWidth = r * 0.09; g.beginPath(); g.arc(ex, ey + r * 0.05, r * 0.16, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      continue;
    }
    g.fillStyle = '#fff'; g.strokeStyle = NAVY; g.lineWidth = r * 0.06;
    g.beginPath(); g.ellipse(ex, ey, r * 0.21, r * 0.26 * (f.mouth === 'o' ? 1.12 : 1), 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(ex + look, ey + lookY + r * 0.03, r * 0.12, r * 0.15, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + look - r * 0.04, ey + lookY - r * 0.04, r * 0.045, 0, TAU); g.fill();
  }
  // cheeks
  g.fillStyle = `rgba(255,100,140,${0.45 + (f.cheeks || 0) * 0.4})`;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * r * 0.56, r * 0.22, r * (0.15 + (f.cheeks || 0) * 0.06), r * 0.1, 0, 0, TAU); g.fill(); }
  // mouth
  g.strokeStyle = NAVY; g.lineWidth = r * 0.08; g.lineCap = 'round';
  if (f.mouth === 'o') {
    g.fillStyle = '#7a2d4f'; g.beginPath(); g.ellipse(0, r * 0.38, r * 0.17, r * 0.2, 0, 0, TAU); g.fill(); g.stroke();
  } else {
    const wide = f.mouth === 'grin' ? 0.42 : 0.3;
    g.fillStyle = '#7a2d4f';
    g.beginPath(); g.moveTo(-r * wide, r * 0.22); g.quadraticCurveTo(0, r * (f.mouth === 'grin' ? 0.75 : 0.55), r * wide, r * 0.22); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff8fb0'; g.beginPath(); g.ellipse(0, r * 0.4, r * 0.1, r * 0.05, 0, 0, TAU); g.fill();
  }
  g.restore();
}

/** Carriage side view; origin = bottom-left (rail level). */
export function drawCar(g, shape, t, rot, { rainbow = false } = {}) {
  const S = SHAPES[shape], w = CAR_W, h = CAR_H;
  g.save(); g.lineJoin = 'round';
  // coupler
  g.fillStyle = '#4a3d6b'; g.strokeStyle = NAVY; g.lineWidth = 4;
  roundRectPath(g, -GAP - 4, -h * 0.26, w + GAP * 2 + 8, 14, 5); g.fill(); g.stroke();
  const key = 'prop/shape-train-car-' + CAR_ART[shape];
  if (!rainbow && art(key)) {
    drawArt(g, key, w / 2, 0, w, h, { anchor: 'bottom', fit: 'stretch' });
  } else {
    g.lineWidth = 6;
    // body
    const top = -h * 0.88, bot = -h * 0.2;
    let fill = S.car;
    if (rainbow) {
      const gr = g.createLinearGradient(0, top, 0, bot);
      ['#ff8f8f', '#ffc46b', '#ffe86e', '#8fe6a3', '#8fd0ff', '#c4a3ff'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c));
      fill = gr;
    }
    g.fillStyle = fill; g.strokeStyle = NAVY;
    roundRectPath(g, 0, top, w, bot - top, 18); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.3)'; roundRectPath(g, 12, top + 10, w - 24, 14, 7); g.fill();
    g.fillStyle = 'rgba(36,22,63,0.12)'; roundRectPath(g, 6, bot - 22, w - 12, 16, 8); g.fill();
    // rivets
    g.fillStyle = 'rgba(36,22,63,0.25)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(18 + i * ((w - 36) / 8), bot - 12, 2.6, 0, TAU); g.fill(); }
    // roof
    g.fillStyle = S.dark; g.strokeStyle = NAVY;
    g.beginPath(); g.moveTo(-8, top + 6); g.quadraticCurveTo(w / 2, top - 30, w + 8, top + 6); g.lineTo(w + 8, top + 12); g.lineTo(-8, top + 12); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; roundRectPath(g, -6, top + 6, w + 12, 10, 5); g.fill(); g.stroke();
    // chassis
    g.fillStyle = '#4a3d6b'; roundRectPath(g, 8, -h * 0.24, w - 16, h * 0.08, 6); g.fill(); g.stroke();
  }
  wheel(g, w * 0.2, -h * 0.12, h * 0.12, rot * 1.4, S.color);
  wheel(g, w * 0.8, -h * 0.12, h * 0.12, rot * 1.4, S.color);
  g.restore();
}

/** The window frame for a seat at local (x, y). filled = someone is in it. */
export function windowPath(g, shape, r) { shapePath(g, shape, r); }
export function drawWindowBack(g, shape, r, lit) {
  const S = SHAPES[shape];
  shapePath(g, shape, r);
  const gr = g.createLinearGradient(0, -r, 0, r);
  gr.addColorStop(0, lit ? '#fff6d6' : '#5a4f86'); gr.addColorStop(1, lit ? '#ffe39a' : '#2f2752');
  g.fillStyle = gr; g.fill();
  if (!lit) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.35, r * 0.25, r * 0.12, -0.6, 0, TAU); g.fill(); }
  void S;
}
export function drawWindowFrame(g, shape, r, glow = 0) {
  const S = SHAPES[shape];
  if (glow > 0) {
    g.save(); g.globalAlpha *= glow; g.shadowColor = '#ffffff'; g.shadowBlur = 30;
    g.strokeStyle = '#ffffff'; g.lineWidth = r * 0.42; shapePath(g, shape, r * 1.06); g.stroke(); g.restore();
  }
  g.lineJoin = 'round';
  g.strokeStyle = NAVY; g.lineWidth = r * 0.36; shapePath(g, shape, r * 1.04); g.stroke();
  g.strokeStyle = S.color; g.lineWidth = r * 0.22; shapePath(g, shape, r * 1.04); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = r * 0.06; shapePath(g, shape, r * 1.1); g.stroke();
}

// --- cow and tunnel ------------------------------------------------------------------------
export function drawCow(g, h, t, wave) {
  if (drawArt(g, 'prop/shape-train-cow', 0, 0, h * 1.25, h, { anchor: 'bottom' })) return;
  const s = h / 100;
  g.save(); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 4;
  // legs
  g.fillStyle = '#fff';
  for (const lx of [-34, -18, 16, 30]) { g.beginPath(); roundRectPath(g, lx - 6, -30, 12, 30, 5); g.fill(); g.stroke(); }
  // body
  g.beginPath(); g.ellipse(-2, -44, 46, 26, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY;
  g.beginPath(); g.ellipse(-18, -50, 12, 9, 0.4, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(14, -36, 9, 7, -0.3, 0, TAU); g.fill();
  // tail
  g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(-46, -50); g.quadraticCurveTo(-60, -40 + Math.sin(t * 5) * 6, -56, -24); g.stroke();
  // waving front leg
  g.save(); g.translate(36, -46); g.rotate(wave ? -2.2 + Math.sin(t * 12) * 0.5 : -0.2);
  g.fillStyle = '#fff'; g.beginPath(); roundRectPath(g, -6, 0, 12, 28, 5); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.fillRect(-6, 22, 12, 6);
  g.restore();
  // head
  g.save(); g.translate(42, -66); g.rotate(Math.sin(t * 2) * 0.06);
  g.fillStyle = '#fff'; g.strokeStyle = NAVY;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 20, -10, 9, 5, sx * 0.4, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = '#ffe9a8'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 9, -16); g.lineTo(sx * 13, -28); g.lineTo(sx * 15, -15); g.fill(); g.stroke(); }
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -4, 18, 20, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffb3c6'; g.beginPath(); g.ellipse(0, 8, 15, 10, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-5, 8, 2, 0, TAU); g.arc(5, 8, 2, 0, TAU); g.fill();
  g.beginPath(); g.arc(-7, -8, 3, 0, TAU); g.arc(7, -8, 3, 0, TAU); g.fill();
  g.fillStyle = '#ff6fbf'; g.beginPath(); g.arc(-15, -22, 5, 0, TAU); g.fill();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(-15, -22, 2, 0, TAU); g.fill();
  g.restore();
  g.restore();
}

export function drawTunnelPortal(g, x, y, mirror) {
  g.save(); g.translate(x, y); if (mirror) g.scale(-1, 1);
  if (drawArt(g, 'prop/shape-train-tunnel', 0, 6, 130, 110, { anchor: 'bottom' })) { g.restore(); return; }
  g.strokeStyle = NAVY; g.lineWidth = 3;
  g.fillStyle = '#b9b0cf';
  g.beginPath(); g.moveTo(-50, 6); g.lineTo(-50, -44); g.arc(0, -44, 50, Math.PI, 0); g.lineTo(50, 6); g.lineTo(34, 6); g.lineTo(34, -40); g.arc(0, -40, 34, 0, Math.PI, true); g.lineTo(-34, 6); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 2;
  for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) * (Math.PI / 7); g.beginPath(); g.moveTo(Math.cos(a) * 34, -40 + Math.sin(a) * 34); g.lineTo(Math.cos(a) * 50, -44 + Math.sin(a) * 50); g.stroke(); }
  g.fillStyle = '#5cbf5a'; for (const [vx, vy] of [[-44, -70], [-28, -88], [30, -86]]) { g.beginPath(); g.arc(vx, vy, 9, 0, TAU); g.fill(); }
  g.fillStyle = '#ff6fbf'; g.beginPath(); g.arc(-30, -90, 4, 0, TAU); g.fill();
  g.restore();
}

// --- backdrop --------------------------------------------------------------------------------
let BG = null;
export function buildBackdrop() {
  if (BG) return BG;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.lineJoin = 'round'; g.lineCap = 'round';
  // sky
  const sky = g.createLinearGradient(0, 0, 0, 360);
  sky.addColorStop(0, '#7fd0ff'); sky.addColorStop(1, '#d9f3ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, 420);
  // sun
  g.fillStyle = 'rgba(255,240,170,0.5)'; g.beginPath(); g.arc(1700, 120, 90, 0, TAU); g.fill();
  g.fillStyle = '#ffe36e'; g.strokeStyle = '#ffb92e'; g.lineWidth = 6; g.beginPath(); g.arc(1700, 120, 58, 0, TAU); g.fill(); g.stroke();
  // far hills
  const hill = (y, amp, f, ph, col) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 420);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph) * amp * 0.3);
    g.lineTo(W, 420); g.closePath(); g.fill();
  };
  hill(205, 30, 0.004, 1.2, '#a8e3a0');
  hill(245, 24, 0.006, 3.1, '#8fd889');
  // the tunnel hill
  g.fillStyle = '#6cc46a'; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(1290, FAR_Y + 4); g.bezierCurveTo(1340, 150, 1620, 140, 1680, FAR_Y + 4); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(1440, 200, 90, 26, -0.15, 0, TAU); g.fill();
  for (const [fx, fy, fc] of [[1400, 230, '#ff6fbf'], [1470, 205, '#ffd23f'], [1540, 240, '#fff'], [1500, 270, '#ff9f1c']]) { g.fillStyle = fc; g.beginPath(); g.arc(fx, fy, 6, 0, TAU); g.fill(); }
  // meadow (left) + mid ground
  g.fillStyle = '#9fe08f'; g.fillRect(0, 290, W, 140);
  // river
  g.fillStyle = '#5cc0f2';
  g.beginPath(); g.moveTo(RIVER[0] + 30, 248); g.bezierCurveTo(RIVER[0] - 10, 320, RIVER[0] + 40, 380, RIVER[0] - 20, 440);
  g.lineTo(RIVER[1] + 30, 440); g.bezierCurveTo(RIVER[1] - 20, 380, RIVER[1] + 30, 320, RIVER[1] - 50, 248); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4;
  for (let i = 0; i < 6; i++) { const y = 360 + i * 14, x = RIVER[0] + 40 + (i * 37) % 160; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 34, y); g.stroke(); }
  // bridge
  g.fillStyle = '#c98a55'; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.moveTo(RIVER[0] - 40, FAR_Y + 2); g.lineTo(RIVER[1] + 40, FAR_Y + 2); g.lineTo(RIVER[1] + 40, FAR_Y + 18); g.lineTo(RIVER[0] - 40, FAR_Y + 18); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#5cc0f2';
  for (let i = 0; i < 3; i++) { const cx = RIVER[0] + 20 + i * ((RIVER[1] - RIVER[0] - 40) / 2) + (i === 1 ? 0 : 0); g.beginPath(); g.arc(cx + (i - 1) * 10, FAR_Y + 46, 34, Math.PI, 0); g.fill(); }
  g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath(); g.moveTo(RIVER[0] - 40, FAR_Y - 22); g.lineTo(RIVER[1] + 40, FAR_Y - 22); g.stroke();
  for (let x = RIVER[0] - 40; x <= RIVER[1] + 40; x += 30) { g.beginPath(); g.moveTo(x, FAR_Y - 22); g.lineTo(x, FAR_Y + 2); g.stroke(); }
  // far track
  g.fillStyle = '#b89b7a'; g.fillRect(0, FAR_Y + 2, RIVER[0] - 40, 10); g.fillRect(RIVER[1] + 40, FAR_Y + 2, W, 10);
  g.fillStyle = '#7a5a3a'; for (let x = 0; x < W; x += 22) if (x < RIVER[0] - 40 || x > RIVER[1] + 40) g.fillRect(x, FAR_Y + 2, 10, 8);
  g.strokeStyle = '#6b6680'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, FAR_Y); g.lineTo(W, FAR_Y); g.stroke();
  // tunnel mouths (dark holes; portals are drawn live over the little train)
  g.fillStyle = '#2b2440';
  for (const x of TUNNEL) { g.beginPath(); g.moveTo(x - 34, FAR_Y + 6); g.lineTo(x - 34, FAR_Y - 40); g.arc(x, FAR_Y - 40, 34, Math.PI, 0); g.lineTo(x + 34, FAR_Y + 6); g.closePath(); g.fill(); }
  // meadow flowers
  for (let i = 0; i < 60; i++) {
    const x = (i * 131) % 760 + 10, y = 340 + ((i * 53) % 80);
    g.fillStyle = ['#ff6fbf', '#ffd23f', '#ffffff', '#9b5cff'][i % 4]; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
  }
  // station house (far left)
  g.save(); g.translate(150, 446);
  g.fillStyle = '#fff3e0'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.fillRect(-110, -120, 220, 120); g.strokeRect(-110, -120, 220, 120);
  g.fillStyle = '#ff6b6b'; g.beginPath(); g.moveTo(-135, -116); g.lineTo(0, -190); g.lineTo(135, -116); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#8fd0ff'; for (const x of [-80, 40]) { g.fillRect(x, -92, 40, 40); g.strokeRect(x, -92, 40, 40); }
  g.fillStyle = '#c98a55'; g.fillRect(-20, -70, 40, 70); g.strokeRect(-20, -70, 40, 70);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -140, 18, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(0, -140); g.lineTo(0, -152); g.moveTo(0, -140); g.lineTo(9, -140); g.stroke();
  g.restore();
  // bushes along the back fence
  for (let x = 300; x < W; x += 140) {
    if (x > RIVER[0] - 60 && x < RIVER[1] + 60) continue;
    g.fillStyle = '#5cbf5a'; g.beginPath(); g.arc(x, 438, 34, Math.PI, 0); g.arc(x + 40, 440, 26, Math.PI, 0); g.fill();
  }
  // foreground track bed
  g.fillStyle = '#b8a48a'; g.fillRect(0, 446, W, 72);
  g.fillStyle = 'rgba(36,22,63,0.12)'; for (let i = 0; i < 300; i++) { g.beginPath(); g.arc((i * 97) % W, 450 + (i * 37) % 64, 2 + (i % 3), 0, TAU); g.fill(); }
  g.fillStyle = '#8a6440'; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineWidth = 2;
  for (let x = -10; x < W; x += 46) { g.beginPath(); g.moveTo(x, 470); g.lineTo(x + 24, 470); g.lineTo(x + 30, 500); g.lineTo(x + 2, 500); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = '#9aa0b8'; g.fillRect(0, 466, W, 6); g.fillStyle = '#c9cede'; g.fillRect(0, TRACK_Y - 2, W, 8);
  g.strokeStyle = NAVY; g.lineWidth = 2; g.beginPath(); g.moveTo(0, TRACK_Y - 2); g.lineTo(W, TRACK_Y - 2); g.moveTo(0, TRACK_Y + 6); g.lineTo(W, TRACK_Y + 6); g.stroke();
  // platform
  const pl = g.createLinearGradient(0, 520, 0, H);
  pl.addColorStop(0, '#f2e6d8'); pl.addColorStop(1, '#e6d3c0');
  g.fillStyle = pl; g.fillRect(0, 520, W, H - 520);
  g.fillStyle = '#d9c4ad'; g.fillRect(0, 512, W, 18);
  g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 512); g.lineTo(W, 512); g.stroke();
  g.fillStyle = '#ffd23f'; g.fillRect(0, 538, W, 16);
  g.fillStyle = 'rgba(36,22,63,0.18)'; for (let x = 0; x < W; x += 24) { g.beginPath(); g.arc(x + 12, 546, 3, 0, TAU); g.fill(); }
  // tiles with a touch of perspective
  g.strokeStyle = 'rgba(160,130,100,0.35)'; g.lineWidth = 2;
  const rows = [560, 610, 668, 734, 808, 890, 980];
  for (const y of rows) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 110, 556); g.lineTo(W / 2 + i * 165, H); g.stroke(); }
  // pots and a bench along the bottom/right edges
  const pot = (x, y, fc) => {
    g.fillStyle = '#e07a4f'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x - 30, y - 50); g.lineTo(x + 30, y - 50); g.lineTo(x + 22, y); g.lineTo(x - 22, y); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#5cbf5a'; g.beginPath(); g.arc(x - 14, y - 62, 16, 0, TAU); g.arc(x + 14, y - 62, 16, 0, TAU); g.arc(x, y - 76, 18, 0, TAU); g.fill();
    g.fillStyle = fc; for (const [dx, dy] of [[-14, -70], [12, -78], [2, -62]]) { g.beginPath(); g.arc(x + dx, y + dy, 7, 0, TAU); g.fill(); }
  };
  pot(1860, 700, '#ff6fbf'); pot(1860, 900, '#ffd23f'); pot(60, 760, '#9b5cff');
  BG = c;
  return c;
}

export function roundRectPath(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
