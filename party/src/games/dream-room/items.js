// Dream Room item catalog: every piece of furniture, light, toy and decoration,
// each with a procedural drawing (what ships today) and an optional art key
// (prop/room-<id>, see image-requests-history.md) that replaces it when it exists.
//
// Item drawings use local coordinates at scale 1:
//   cat 'floor' / 'small'  (0, 0) = bottom centre, the item stands on y = 0
//   cat 'wall' / 'rug'     (0, 0) = centre
// The game applies position, depth scale, flip and squash before calling.
//
// Def fields: id, name, cat, group, w, h, colors (hex list, or character ids
// when charItem), draw(g, col, it, env), optional glow(g, col, it, env)
// (drawn again on top at night: lamp shades, bulbs), lights [[x, y, r]]
// (night glow pools), surface { y, hw } (small items can sit on it),
// seat { y } / bed { y } (where characters sit or bounce in the room tour),
// front(g, ...) (drawn after a pet curled in it), unique (CPUs place one).
import { getBaseImage, drawPortrait } from '../../engine/sprites.js';
import { art } from '../../engine/art.js';
import * as ui from '../../engine/ui.js';
import { TAU, clamp } from '../../engine/util.js';
import { drawHeartShape, drawStarShape, drawSparkleShape } from '../../engine/emotes.js';
import { CHARACTERS, charById } from '../../data/characters.js';

export const NAVY = '#24163f';
const OUT = 4;

// --- colour helpers ----------------------------------------------------------
const shadeCache = new Map();
/** k > 0 mixes toward white, k < 0 toward black. */
export function shade(c, k) {
  const key = c + k;
  let s = shadeCache.get(key);
  if (s) return s;
  const v = parseInt(c.slice(1), 16), r = (v >> 16) & 255, gg = (v >> 8) & 255, b = v & 255;
  const f = (x) => Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k));
  s = `rgb(${f(r)},${f(gg)},${f(b)})`;
  shadeCache.set(key, s);
  return s;
}
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }

// --- drawing helpers -------------------------------------------------------------
function fs(g, fill, lw = OUT) { if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = NAVY; g.stroke(); } }
function rr(g, x, y, w, h, r, fill, lw = OUT) { ui.roundRect(g, x, y, w, h, r); fs(g, fill, lw); }
function el(g, x, y, rx, ry, fill, lw = OUT, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); fs(g, fill, lw); }
function poly(g, pts, fill, lw = OUT) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); fs(g, fill, lw); }
function shine(g, x, y, rx, ry, rot = -0.5, a = 0.55) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); }
function at(g, x, y, fn) { g.save(); g.translate(x, y); fn(); g.restore(); }
function rng(seed) { let s = Math.floor((seed || 0.5) * 2147483646) + 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

const FABRIC = ['#ff8fc2', '#7cc7ff', '#b79aff', '#78dcae', '#ffd05e', '#ff8a7a'];
const PAINT = ['#fff1e2', '#f7b8d2', '#a8e6d4', '#cdbcff', '#e3ac74', '#a9d8ff'];
const POTS = ['#ff9ec4', '#7cc7ff', '#ffd05e', '#c79bff', '#ff9a6b', '#ffffff'];
const RUGS = ['#ff9ec4', '#a98bff', '#7fd3ff', '#7fe0b4', '#ffc861'];
const BALLOONS = [['red', '#ff4d6d'], ['orange', '#ff9f1c'], ['yellow', '#ffd23f'], ['green', '#5ddc6a'], ['teal', '#25d0c8'], ['blue', '#3fa7ff'], ['purple', '#9b5cff'], ['pink', '#ff6fd0']];
const SCHEMES = {
  rainbow: ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'],
  warm: ['#ffd27a', '#ffb347', '#fff1a8', '#ffcf8a'],
  pink: ['#ff8fc2', '#ffc4dc', '#ff6fb1', '#ffd6ea'],
  sea: ['#7fd3ff', '#5ae0d0', '#b5f0ff', '#8fb8ff'],
  candy: ['#ffb3d9', '#b8a6ff', '#a8f0d8', '#fff1a8'],
};
const CHAR_IDS = CHARACTERS.map((c) => c.id);

// Plushie sprites: base art with a soft white "stitched" outline (cached).
const plushCache = new Map();
export function plushSprite(charId) {
  let c = plushCache.get(charId);
  if (c) return c;
  const ch = charById(charId);
  const img = ch && getBaseImage(ch.members[0].asset);
  if (!img) return null;
  const H0 = 150, sc = H0 / img.height, w = Math.ceil(img.width * sc), pad = 12;
  const sil = mk(w, H0), sx = sil.getContext('2d');
  sx.drawImage(img, 0, 0, w, H0);
  sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#ffffff'; sx.fillRect(0, 0, w, H0);
  const nav = mk(w, H0), nx = nav.getContext('2d');
  nx.drawImage(img, 0, 0, w, H0); nx.globalCompositeOperation = 'source-in'; nx.fillStyle = NAVY; nx.fillRect(0, 0, w, H0);
  c = mk(w + pad * 2, H0 + pad * 2);
  const x = c.getContext('2d');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; x.drawImage(nav, pad + Math.cos(a) * 9, pad + Math.sin(a) * 9); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; x.drawImage(sil, pad + Math.cos(a) * 6, pad + Math.sin(a) * 6); }
  x.drawImage(img, pad, pad, w, H0);
  plushCache.set(charId, c);
  return c;
}
function charImage(id) { const ch = charById(id); return ch ? getBaseImage(ch.members[0].asset) : null; }

// Recoloured copies of optional art (hue/saturation of the colour, the art's own shading).
const tintCache = new WeakMap();
function tinted(img, col) {
  let m = tintCache.get(img);
  if (!m) { m = new Map(); tintCache.set(img, m); }
  let c = m.get(col);
  if (!c) {
    c = mk(img.width, img.height);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'color'; x.globalAlpha = 0.85; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0);
    m.set(col, c);
  }
  return c;
}
/** Draw art fitted to the item's box (bottom-anchored or centred). */
function drawFit(g, img, def, { tint = null, box = null } = {}) {
  const b = box || { w: def.w, h: def.h };
  const s = Math.min(b.w / img.width, b.h / img.height), w = img.width * s, h = img.height * s;
  const src = tint ? tinted(img, tint) : img;
  const bottom = def.cat === 'floor' || def.cat === 'small';
  g.drawImage(src, -w / 2 + (b.x || 0), (bottom ? -h : -h / 2) + (b.y || 0), w, h);
}

// =============================================================================
// Catalog
// =============================================================================

const D = [];
const def = (o) => { D.push({ cpu: 1, ...o }); return o; };

// --- Furniture ------------------------------------------------------------------
def({
  id: 'bed', name: 'Bed', cat: 'floor', group: 'furniture', w: 360, h: 212, colors: FABRIC, unique: true, cpu: 3,
  surface: { y: -114, hw: 108 }, bed: { y: -112 },
  draw(g, col) {
    const frame = '#fff1e2', wood = '#c98a5a';
    rr(g, -170, -30, 18, 30, 5, wood); rr(g, 152, -30, 18, 30, 5, wood);
    g.beginPath(); g.moveTo(-178, -24); g.lineTo(-178, -172); g.arc(-146, -172, 32, Math.PI, 0); g.lineTo(-114, -24); g.closePath(); fs(g, frame);
    at(g, -146, -160, () => drawHeartShape(g, 30, col));
    g.beginPath(); g.moveTo(114, -24); g.lineTo(114, -116); g.arc(142, -116, 28, Math.PI, 0); g.lineTo(170, -24); g.closePath(); fs(g, frame);
    rr(g, -178, -66, 348, 44, 12, frame);
    rr(g, -116, -112, 232, 50, 18, '#ffffff');
    el(g, -82, -118, 38, 20, '#ffffff'); el(g, -82, -118, 24, 7, shade(col, 0.6), 0);
    g.beginPath(); g.moveTo(-44, -118); g.lineTo(118, -118); g.quadraticCurveTo(130, -118, 130, -104); g.lineTo(130, -44); g.quadraticCurveTo(40, -28, -44, -44); g.closePath(); fs(g, col);
    rr(g, -58, -122, 30, 82, 12, shade(col, 0.35));
    g.fillStyle = shade(col, 0.5);
    for (const [x, y] of [[10, -96], [60, -88], [104, -68], [30, -60], [84, -106], [-6, -74]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
    shine(g, 60, -110, 40, 4, 0, 0.4);
  },
});
def({
  id: 'nightstand', name: 'Nightstand', cat: 'floor', group: 'furniture', w: 116, h: 126, colors: PAINT, cpu: 2,
  surface: { y: -124, hw: 48 },
  draw(g, col) {
    rr(g, -44, -16, 12, 16, 3, '#b07a4f'); rr(g, 32, -16, 12, 16, 3, '#b07a4f');
    rr(g, -50, -112, 100, 98, 10, col);
    rr(g, -58, -126, 116, 16, 6, shade(col, -0.1));
    rr(g, -38, -98, 76, 36, 7, shade(col, 0.35)); el(g, 0, -80, 6, 6, '#ffd23f', 3);
    rr(g, -38, -56, 76, 32, 7, shade(col, 0.35)); el(g, 0, -40, 6, 6, '#ffd23f', 3);
  },
});
def({
  id: 'armchair', name: 'Armchair', cat: 'floor', group: 'furniture', w: 190, h: 166, colors: FABRIC, cpu: 2,
  seat: { y: -84 },
  draw(g, col) {
    rr(g, -70, -16, 14, 16, 4, '#b07a4f'); rr(g, 56, -16, 14, 16, 4, '#b07a4f');
    rr(g, -66, -162, 132, 112, 36, col);
    g.fillStyle = shade(col, -0.18); for (const [x, y] of [[-30, -126], [0, -132], [30, -126]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
    rr(g, -84, -60, 168, 48, 16, shade(col, -0.08));
    rr(g, -60, -88, 120, 38, 15, shade(col, 0.28));
    rr(g, -95, -112, 40, 98, 19, col); rr(g, 55, -112, 40, 98, 19, col);
    shine(g, -76, -100, 8, 5); shine(g, 74, -100, 8, 5);
  },
});
def({
  id: 'beanbag', name: 'Beanbag', cat: 'floor', group: 'furniture', w: 160, h: 112, colors: FABRIC, cpu: 2,
  seat: { y: -50 },
  draw(g, col) {
    g.beginPath(); g.moveTo(-76, -8); g.bezierCurveTo(-92, -62, -52, -114, 0, -106); g.bezierCurveTo(52, -114, 92, -64, 76, -8); g.quadraticCurveTo(0, 6, -76, -8); g.closePath(); fs(g, col);
    el(g, 0, -50, 46, 16, shade(col, -0.15), 0);
    g.strokeStyle = shade(col, -0.25); g.lineWidth = 3; g.beginPath(); g.moveTo(-40, -96); g.quadraticCurveTo(-10, -70, -30, -30); g.stroke();
    shine(g, -38, -82, 16, 8);
  },
});
def({
  id: 'dresser', name: 'Dresser', cat: 'floor', group: 'furniture', w: 214, h: 166, colors: PAINT, cpu: 1.5,
  surface: { y: -164, hw: 94 },
  draw(g, col) {
    rr(g, -92, -16, 14, 16, 4, '#b07a4f'); rr(g, 78, -16, 14, 16, 4, '#b07a4f');
    rr(g, -98, -152, 196, 138, 12, col);
    rr(g, -107, -166, 214, 16, 7, shade(col, -0.1));
    for (let i = 0; i < 3; i++) {
      const y = -140 + i * 42;
      rr(g, -84, y, 168, 34, 8, shade(col, 0.35));
      el(g, -40, y + 17, 6, 6, '#ffd23f', 3); el(g, 40, y + 17, 6, 6, '#ffd23f', 3);
    }
  },
});
def({
  id: 'bookshelf', name: 'Bookshelf', cat: 'floor', group: 'furniture', w: 160, h: 256, colors: PAINT, cpu: 1.5,
  surface: { y: -252, hw: 64 },
  draw(g, col, it) {
    rr(g, -78, -252, 156, 248, 10, col);
    rr(g, -64, -238, 128, 222, 6, shade(col, -0.28));
    const R = rng(it.seed || 0.3), cols = SCHEMES.rainbow;
    for (const [bottom, top] of [[-168, -236], [-96, -164], [-20, -92]]) {
      let x = -60;
      while (x < 50) {
        const bw = 10 + Math.floor(R() * 8), bh = Math.min(top - bottom - 4, -(30 + R() * 24));
        if (x + bw > 60) break;
        const c = cols[Math.floor(R() * cols.length)];
        if (R() < 0.12 && x > -40) { g.save(); g.translate(x, bottom); g.rotate(0.3); rr(g, 0, bh, bw, -bh, 2, c, 2.5); g.restore(); x += bw + 12; continue; }
        rr(g, x, bottom + bh, bw, -bh, 2, c, 2.5);
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + 2, bottom + bh + 6, bw - 4, 3);
        x += bw + 1;
      }
      rr(g, -64, bottom, 128, 10, 3, col, 3);
    }
  },
});
def({
  id: 'toychest', name: 'Toy chest', cat: 'floor', group: 'furniture', w: 186, h: 120, colors: PAINT, cpu: 1.5,
  surface: { y: -106, hw: 70 },
  draw(g, col) {
    rr(g, -86, -78, 172, 74, 12, col);
    g.beginPath(); g.moveTo(-92, -76); g.lineTo(-92, -88); g.quadraticCurveTo(0, -126, 92, -88); g.lineTo(92, -76); g.closePath(); fs(g, shade(col, 0.25));
    rr(g, -62, -80, 14, 76, 4, '#c98a5a', 3); rr(g, 48, -80, 14, 76, 4, '#c98a5a', 3);
    at(g, 0, -42, () => drawStarShape(g, 40, '#ffd23f'));
    shine(g, -40, -96, 22, 5, -0.1, 0.5);
  },
});
def({
  id: 'desk', name: 'Desk', cat: 'floor', group: 'furniture', w: 236, h: 148, colors: PAINT, cpu: 1,
  surface: { y: -146, hw: 106 },
  draw(g, col) {
    rr(g, -106, -132, 14, 132, 4, shade(col, -0.15)); rr(g, 92, -132, 14, 132, 4, shade(col, -0.15));
    rr(g, 22, -132, 76, 76, 8, col); rr(g, 30, -122, 60, 26, 6, shade(col, 0.35)); el(g, 60, -109, 5, 5, '#ffd23f', 3);
    rr(g, 30, -90, 60, 26, 6, shade(col, 0.35)); el(g, 60, -77, 5, 5, '#ffd23f', 3);
    rr(g, -118, -148, 236, 18, 6, col);
  },
});
def({
  id: 'rockinghorse', name: 'Rocking horse', cat: 'floor', group: 'furniture', w: 220, h: 170, colors: FABRIC, cpu: 1,
  rock: true,
  draw(g, col) {
    g.save();
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(-88, -26); g.quadraticCurveTo(0, 16, 88, -26);
    g.lineWidth = 18; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 11; g.strokeStyle = '#c98a5a'; g.stroke();
    g.lineWidth = 10;
    for (const [x0, x1] of [[-46, -52], [-22, -30], [24, 30], [46, 54]]) { g.beginPath(); g.moveTo(x0, -74); g.lineTo(x1, -8); g.strokeStyle = NAVY; g.lineWidth = 14; g.stroke(); g.strokeStyle = '#fff1e2'; g.lineWidth = 8; g.stroke(); }
    // tail
    g.beginPath(); g.moveTo(-60, -84); g.quadraticCurveTo(-96, -86, -86, -46); g.quadraticCurveTo(-74, -70, -58, -72); g.closePath(); fs(g, col, 3);
    el(g, 0, -80, 62, 28, '#fff1e2');
    // neck + head
    poly(g, [[30, -96], [62, -140], [86, -128], [58, -78]], '#fff1e2');
    el(g, 84, -128, 30, 18, '#fff1e2', OUT, 0.35);
    el(g, 76, -136, 4, 4, NAVY, 0);
    g.beginPath(); g.moveTo(60, -150); g.lineTo(66, -166); g.lineTo(72, -146); fs(g, '#fff1e2', 3);
    // mane
    for (let i = 0; i < 4; i++) el(g, 48 - i * 8, -142 + i * 14, 11, 9, col, 3);
    rr(g, -22, -110, 46, 18, 7, col);
    g.restore();
  },
});
def({
  id: 'dollhouse', name: 'Dollhouse', cat: 'floor', group: 'furniture', w: 150, h: 160, colors: FABRIC, cpu: 1,
  draw(g, col) {
    rr(g, -62, -104, 124, 100, 6, '#fff1e2');
    poly(g, [[-76, -100], [0, -158], [76, -100]], col);
    at(g, 0, -122, () => drawHeartShape(g, 22, '#ffffff'));
    rr(g, -48, -86, 26, 24, 4, '#bfe6ff', 3); rr(g, 22, -86, 26, 24, 4, '#bfe6ff', 3);
    rr(g, -13, -52, 26, 48, 8, shade(col, -0.1), 3);
    el(g, 7, -28, 3, 3, '#ffd23f', 0);
    rr(g, -48, -50, 26, 22, 4, '#bfe6ff', 3); rr(g, 22, -50, 26, 22, 4, '#bfe6ff', 3);
  },
});

// --- Lights -------------------------------------------------------------------------
def({
  id: 'lamp', name: 'Lamp', cat: 'small', group: 'lights', w: 72, h: 106, colors: FABRIC, cpu: 2.5,
  lights: [[0, -80, 190]],
  draw(g, col) {
    el(g, 0, -6, 24, 7, '#fff1e2');
    rr(g, -4, -60, 8, 54, 3, '#ffd23f', 3);
    poly(g, [[-35, -56], [35, -56], [23, -102], [-23, -102]], col);
    g.strokeStyle = shade(col, -0.2); g.lineWidth = 3; g.beginPath(); g.moveTo(-32, -64); g.lineTo(32, -64); g.stroke();
  },
  glow(g, col) { g.globalAlpha *= 0.85; poly(g, [[-35, -56], [35, -56], [23, -102], [-23, -102]], shade(col, 0.7), 0); },
});
def({
  id: 'floorlamp', name: 'Floor lamp', cat: 'floor', group: 'lights', w: 100, h: 262, colors: FABRIC, cpu: 1.5,
  lights: [[0, -226, 260]],
  draw(g, col) {
    el(g, 0, -8, 36, 10, '#fff1e2');
    rr(g, -5, -204, 10, 196, 4, '#d8c8b8', 3);
    poly(g, [[-48, -198], [48, -198], [32, -258], [-32, -258]], col);
    g.strokeStyle = shade(col, -0.2); g.lineWidth = 3; g.beginPath(); g.moveTo(-44, -208); g.lineTo(44, -208); g.stroke();
  },
  glow(g, col) { g.globalAlpha *= 0.85; poly(g, [[-48, -198], [48, -198], [32, -258], [-32, -258]], shade(col, 0.7), 0); },
});
function swagPoints(w, sag, n) {
  // two drooping swags across the width, returns [x, y] points
  const pts = [];
  for (const [x0, x1] of [[-w / 2, 0], [0, w / 2]]) {
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = x0 + (x1 - x0) * u, y = -sag * 0.5 + sag * 4 * u * (1 - u);
      if (x0 === 0 && i === 0) continue;
      pts.push([x, y]);
    }
  }
  return pts;
}
def({
  id: 'fairylights', name: 'Fairy lights', cat: 'wall', group: 'lights', w: 400, h: 90, colors: ['rainbow', 'warm', 'pink', 'sea'], cpu: 2.5, live: true, noArt: true,
  lights: swagPoints(380, 60, 5).filter((_, i) => i % 2 === 1).map(([x, y]) => [x, y + 16, 90]),
  draw(g, col, it, env) { drawBulbs(g, col, env, false); },
  glow(g, col, it, env) { drawBulbs(g, col, env, true); },
});
function drawBulbs(g, scheme, env, glow) {
  const cols = SCHEMES[scheme] || SCHEMES.rainbow;
  const pts = swagPoints(380, 60, 5);
  if (!glow) {
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineWidth = 3; g.strokeStyle = '#3a6b3a'; g.stroke();
    for (const x of [-190, 0, 190]) el(g, x, -30, 5, 5, '#ffd23f', 2.5);
  }
  pts.forEach(([x, y], i) => {
    if (i === 0 || i === pts.length - 1) return;
    const c = cols[i % cols.length];
    const tw = glow ? 0.55 + 0.45 * Math.sin(env.t * 3 + i * 1.7) : 1;
    g.save(); g.translate(x, y + 10); g.globalAlpha *= tw;
    if (glow) el(g, 0, 4, 9, 12, shade(c, 0.6), 0);
    else { rr(g, -4, -10, 8, 7, 2, '#5b6b5b', 2); el(g, 0, 4, 8, 11, c, 3); shine(g, -2, 0, 2.5, 4, 0); }
    g.restore();
  });
}
def({
  id: 'nightlight', name: 'Star nightlight', cat: 'small', group: 'lights', w: 64, h: 72, colors: ['#ffd23f', '#ff9ec4', '#9fe6ff', '#c9b2ff'], cpu: 1.5,
  lights: [[0, -42, 150]],
  draw(g, col) {
    rr(g, -22, -12, 44, 12, 5, '#fff1e2');
    at(g, 0, -40, () => {
      drawStarShape(g, 58, col);
      g.strokeStyle = NAVY; g.lineWidth = 2.5; g.lineCap = 'round';
      g.beginPath(); g.arc(-8, -2, 4, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(4, -2); g.arc(8, -2, 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.beginPath(); g.arc(0, 4, 5, 0.2, Math.PI - 0.2); g.stroke();
    });
  },
  glow(g, col) { at(g, 0, -40, () => { g.globalAlpha *= 0.7; drawStarShape(g, 58, shade(col, 0.75)); }); },
});
def({
  id: 'lavalamp', name: 'Lava lamp', cat: 'small', group: 'lights', w: 52, h: 126, colors: ['#ff6fb1', '#9b5cff', '#3fd0e0', '#ff9f1c'], cpu: 1.5, live: true, noArt: true,
  lights: [[0, -72, 150]],
  draw(g, col, it, env) { lava(g, col, it, env, false); },
  glow(g, col, it, env) { lava(g, col, it, env, true); },
});
function lava(g, col, it, env, glow) {
  const glass = () => { g.beginPath(); g.moveTo(-15, -34); g.quadraticCurveTo(-24, -72, -9, -110); g.lineTo(9, -110); g.quadraticCurveTo(24, -72, 15, -34); g.closePath(); };
  if (!glow) {
    poly(g, [[-24, 0], [24, 0], [15, -34], [-15, -34]], '#b7b7d6');
    glass(); fs(g, shade(col, 0.55));
    poly(g, [[-9, -110], [9, -110], [5, -124], [-5, -124]], '#b7b7d6', 3);
  } else { g.globalAlpha *= 0.6; glass(); fs(g, shade(col, 0.75), 0); g.globalAlpha /= 0.6; }
  g.save(); glass(); g.clip();
  for (let i = 0; i < 3; i++) {
    const p = ((env.t * 0.12 + i * 0.37 + (it.seed || 0)) % 1);
    const y = -40 - Math.sin(p * Math.PI) * 60, r = 6 + i * 2;
    el(g, Math.sin(env.t + i) * 3, y, r, r * 1.2, glow ? shade(col, 0.2) : col, 0);
  }
  g.restore();
  if (!glow) { glass(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); shine(g, -8, -78, 3, 14, 0.15); }
}

// --- Toys, pets and plushies -------------------------------------------------------------
def({
  id: 'plushie', name: 'Plushie', cat: 'small', group: 'toys', w: 78, h: 92, colors: CHAR_IDS, charItem: true, cpu: 3, live: true,
  draw(g, ch) {
    const sp = plushSprite(ch);
    if (sp) {
      const s = Math.min(78 / sp.width, 92 / sp.height);
      el(g, 0, -2, sp.width * s * 0.36, 6, 'rgba(36,22,63,0.18)', 0);
      g.drawImage(sp, -sp.width * s / 2, -sp.height * s + 4, sp.width * s, sp.height * s);
    } else { el(g, 0, -40, 30, 36, (charById(ch) || {}).color || '#ff9ec4'); }
    at(g, 22, -18, () => drawHeartShape(g, 16, '#ff4f8b'));
  },
});
def({
  id: 'teddy', name: 'Teddy bear', cat: 'small', group: 'toys', w: 86, h: 94, colors: ['#c98a5a', '#ffd6a8', '#ff9ec4', '#b9a6e8'], cpu: 2,
  draw(g, col) {
    const light = shade(col, 0.45);
    el(g, -22, -10, 14, 11, col); el(g, 22, -10, 14, 11, col);
    el(g, 0, -32, 30, 27, col);
    el(g, 0, -28, 16, 15, light, 0);
    el(g, -30, -40, 10, 16, col, OUT, 0.5); el(g, 30, -40, 10, 16, col, OUT, -0.5);
    el(g, -20, -88, 10, 10, col); el(g, 20, -88, 10, 10, col); el(g, -20, -88, 5, 5, light, 0); el(g, 20, -88, 5, 5, light, 0);
    el(g, 0, -68, 27, 24, col);
    el(g, 0, -60, 12, 9, light, 3);
    el(g, 0, -64, 4, 3, NAVY, 0); el(g, -10, -74, 3, 3.5, NAVY, 0); el(g, 10, -74, 3, 3.5, NAVY, 0);
    at(g, 0, -46, () => { poly(g, [[0, 0], [-14, -8], [-14, 8]], '#ff6fb1', 2.5); poly(g, [[0, 0], [14, -8], [14, 8]], '#ff6fb1', 2.5); });
  },
});
def({
  id: 'petbed', name: 'Pet bed', cat: 'floor', group: 'toys', w: 160, h: 70, colors: FABRIC, cpu: 2.5,
  draw(g, col) {
    el(g, 0, -30, 78, 30, col);
    el(g, 0, -26, 60, 18, shade(col, 0.55), 3);
  },
  front(g, col) {
    g.beginPath(); g.ellipse(0, -24, 78, 26, 0, 0.12, Math.PI - 0.12); g.lineTo(-60, -10); g.ellipse(0, -10, 62, 12, 0, Math.PI, 0, true); g.closePath();
    fs(g, col);
    at(g, 0, -10, () => { g.fillStyle = shade(col, 0.6); el(g, 0, 2, 6, 5, shade(col, 0.6), 0); for (const [x, y] of [[-7, -6], [0, -9], [7, -6]]) el(g, x, y, 2.6, 2.6, shade(col, 0.6), 0); });
  },
});
def({
  id: 'fishbowl', name: 'Fish bowl', cat: 'small', group: 'toys', w: 86, h: 88, colors: ['#ff9a3c', '#ff6fb1', '#7cc7ff', '#ffd23f'], cpu: 1.5, live: true, noArt: true,
  draw(g, col, it, env) {
    const cx = 0, cy = -40, r = 38;
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
    g.fillStyle = 'rgba(220,245,255,0.7)'; g.fillRect(-r, cy - r, r * 2, r * 2);
    g.fillStyle = 'rgba(110,200,255,0.75)'; g.fillRect(-r, cy - r * 0.45, r * 2, r * 2);
    for (let i = 0; i < 7; i++) el(g, -26 + i * 9, cy + r - 6, 6, 5, ['#ff9ec4', '#ffd23f', '#9fe6ff', '#c9b2ff'][i % 4], 0);
    const ph = env.t * 0.8 + (it.seed || 0) * 6, fx = Math.sin(ph) * 16, dir = Math.cos(ph) >= 0 ? 1 : -1;
    at(g, fx, cy + 8 + Math.sin(ph * 2.3) * 4, () => {
      g.scale(dir, 1);
      poly(g, [[-10, 0], [-22, -9], [-22, 9]], shade(col, -0.1), 2.5);
      el(g, 0, 0, 13, 9, col, 2.5); el(g, 6, -2, 2, 2, NAVY, 0);
    });
    for (let i = 0; i < 3; i++) { const p = (env.t * 0.5 + i / 3) % 1; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(10 + i * 6, cy + 20 - p * 40, 2.5 + i, 0, TAU); g.stroke(); }
    g.restore();
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.lineWidth = OUT; g.strokeStyle = NAVY; g.stroke();
    el(g, 0, cy - r + 6, 22, 6, 'rgba(220,245,255,0.8)', 3);
    shine(g, -18, cy - 14, 6, 12, 0.4);
  },
});
def({
  id: 'balloon', name: 'Balloon', cat: 'small', group: 'toys', w: 90, h: 240, colors: BALLOONS.map((b) => b[1]), cpu: 1.5, live: true, noArt: true,
  draw(g, col, it, env) {
    const s = it.seed || 0, bx = Math.sin(env.t * 1.3 + s * 7) * 7, by = Math.sin(env.t * 1.7 + s * 5) * 5;
    const top = -176 + by;
    g.beginPath(); g.moveTo(0, -10);
    g.bezierCurveTo(10, -50, -10, -90, bx * 0.6, -128 + by); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    rr(g, -10, -14, 20, 14, 4, '#ffd23f', 3);
    const name = (BALLOONS.find((b) => b[1] === col) || BALLOONS[0])[0];
    const img = art('prop/balloon-' + name);
    if (img) { const h = 128, w = h * img.width / img.height; g.drawImage(img, bx - w / 2, top - h * 0.42, w, h); return; }
    poly(g, [[bx, -132 + by], [bx - 7, -122 + by], [bx + 7, -122 + by]], col, 3);
    el(g, bx, top, 40, 48, col);
    shine(g, bx - 14, top - 18, 9, 15, 0.4, 0.6);
  },
});
def({
  id: 'musicbox', name: 'Music box', cat: 'small', group: 'toys', w: 76, h: 96, colors: FABRIC, cpu: 1.5, live: true, noArt: true,
  draw(g, col, it, env) {
    poly(g, [[-32, -40], [-26, -76], [30, -76], [32, -40]], shade(col, 0.35));
    rr(g, -34, -42, 68, 42, 6, col);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.moveTo(-30, -22); g.lineTo(30, -22); g.stroke();
    at(g, 0, -42, () => {
      // the dancer sways and bobs in the picture plane (no paper-flip spin)
      const on = it.playing > 0, ph = env.t * (on ? 7 : 2);
      g.translate(0, on ? -Math.abs(Math.sin(ph)) * 4 : 0); g.rotate(Math.sin(ph) * (on ? 0.22 : 0.08));
      g.lineWidth = 3; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -16); g.stroke();
      el(g, 0, -16, 14, 5, '#ffc4dc', 2.5);
      rr(g, -4, -32, 8, 16, 3, '#ffc4dc', 2.5);
      el(g, 0, -38, 6, 6, '#ffe0c4', 2.5);
      g.beginPath(); g.moveTo(-4, -28); g.lineTo(-12, -40); g.moveTo(4, -28); g.lineTo(12, -40); g.stroke();
    });
  },
});
def({
  id: 'ball', name: 'Ball', cat: 'small', group: 'toys', w: 60, h: 60, colors: ['#ff4d6d', '#3fa7ff', '#9b5cff', '#36d17a'], cpu: 1,
  draw(g, col) {
    at(g, 0, -29, () => {
      g.save(); g.beginPath(); g.arc(0, 0, 28, 0, TAU); g.clip();
      const cs = [col, '#ffffff', '#ffd23f', '#ffffff'];
      for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30, (i / 8) * TAU - 0.3, ((i + 1) / 8) * TAU - 0.3); g.fillStyle = cs[i % 4]; g.fill(); }
      g.restore();
      el(g, 0, 0, 28, 28, null); el(g, 0, 0, 6, 6, '#ffffff', 2.5);
      shine(g, -11, -11, 7, 4);
    });
  },
});
def({
  id: 'blocks', name: 'Blocks', cat: 'small', group: 'toys', w: 100, h: 90, colors: ['#ff6fb1', '#3fa7ff', '#36d17a', '#ffb627'], cpu: 1,
  draw(g, col) {
    const order = ['#ff6fb1', '#3fa7ff', '#36d17a', '#ffb627'];
    const k = order.indexOf(col) < 0 ? 0 : order.indexOf(col);
    const c = (i) => order[(k + i) % 4];
    const blk = (x, y, color, sym) => {
      rr(g, x, y, 42, 42, 6, color);
      at(g, x + 21, y + 21, () => { if (sym === 0) drawHeartShape(g, 22, '#ffffff'); else if (sym === 1) drawStarShape(g, 26, '#ffffff'); else el(g, 0, 0, 9, 9, '#ffffff', 0); });
    };
    blk(-46, -42, c(0), 0); blk(4, -42, c(1), 1); g.save(); g.translate(0, -62); g.rotate(-0.08); blk(-21, -21, c(2), 2); g.restore();
  },
});
def({
  id: 'duck', name: 'Rubber duck', cat: 'small', group: 'toys', w: 64, h: 60, colors: ['#ffd23f', '#ff9ec4', '#7cc7ff'], cpu: 0.6, noArt: true,
  draw(g, col) {
    const img = art('prop/rubber-duck');
    if (img) { drawFit(g, img, this, { tint: col === '#ffd23f' ? null : col }); return; }
    el(g, -2, -20, 28, 18, col);
    el(g, 14, -42, 15, 14, col);
    poly(g, [[26, -42], [38, -38], [26, -34]], '#ff9f1c', 2.5);
    el(g, 17, -45, 2.5, 2.5, NAVY, 0);
    g.beginPath(); g.ellipse(-6, -22, 12, 7, -0.3, 0, Math.PI); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
  },
});
def({
  id: 'present', name: 'Present', cat: 'small', group: 'toys', w: 70, h: 70, colors: ['#ff6fb1', '#3fa7ff', '#9b5cff', '#36d17a', '#ff4d6d'], cpu: 0.8, noArt: true,
  draw(g, col) {
    const img = art('prop/present');
    if (img) { drawFit(g, img, this, { tint: col }); return; }
    rr(g, -30, -50, 60, 50, 6, col);
    rr(g, -34, -58, 68, 14, 5, shade(col, 0.2));
    rr(g, -6, -58, 12, 58, 2, '#ffd23f', 3);
    el(g, -12, -64, 12, 8, '#ffd23f', 3, -0.4); el(g, 12, -64, 12, 8, '#ffd23f', 3, 0.4);
  },
});

// --- Wall decorations ------------------------------------------------------------------
def({
  id: 'window', name: 'Window', cat: 'wall', group: 'wall', w: 256, h: 232, colors: FABRIC, unique: true, cpu: 3, live: true,
  lights: [[0, 0, 170]], lightColor: '#a9c2ff',
  draw(g, col, it, env) {
    rr(g, -98, -96, 196, 184, 10, '#ffffff');
    this.under(g, col, it, env);
    g.fillStyle = '#ffffff'; g.fillRect(-5, -86, 10, 164); g.fillRect(-86, -8, 172, 10);
    g.strokeStyle = NAVY; g.lineWidth = 2.5; g.strokeRect(-5, -86, 10, 164); g.strokeRect(-86, -8, 172, 10);
    rr(g, -112, 84, 224, 16, 6, '#ffffff');
    // curtains
    const sw = Math.sin(env.t * 1.3 + (it.seed || 0) * 5) * 4;
    g.lineWidth = 6; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(-126, -104); g.lineTo(126, -104); g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#ffd23f'; g.stroke();
    el(g, -126, -104, 7, 7, '#ffd23f', 3); el(g, 126, -104, 7, 7, '#ffd23f', 3);
    for (const side of [-1, 1]) {
      g.save(); g.scale(side, 1);
      g.beginPath(); g.moveTo(-122, -100); g.lineTo(-62, -100);
      g.quadraticCurveTo(-70, -30, -88 + sw * side, 10); g.quadraticCurveTo(-70, 60, -84 + sw * side * 1.5, 100);
      g.lineTo(-124 + sw * side * 1.5, 100); g.quadraticCurveTo(-112, 50, -118, 10); g.quadraticCurveTo(-124, -40, -122, -100); g.closePath();
      fs(g, col);
      g.strokeStyle = shade(col, -0.2); g.lineWidth = 3; g.beginPath(); g.moveTo(-100, -96); g.quadraticCurveTo(-96, -40, -104, 6); g.moveTo(-104, 18); g.quadraticCurveTo(-98, 60, -104, 96); g.stroke();
      rr(g, -124, 2, 40, 12, 6, '#ffd23f', 3);
      g.restore();
    }
  },
  under(g, col, it, env) {
    const n = env.night || 0;
    g.save(); ui.roundRect(g, -86, -84, 172, 160, 6); g.clip();
    let gr = g.createLinearGradient(0, -84, 0, 76); gr.addColorStop(0, '#8fd3ff'); gr.addColorStop(1, '#e3f6ff');
    g.fillStyle = gr; g.fillRect(-86, -84, 172, 160);
    if (n < 1) {
      g.globalAlpha = 1 - n;
      el(g, 46, -46, 18, 18, '#ffe066', 0);
      const cx = (((env.t * 10 + (it.seed || 0) * 200) % 260) - 130);
      g.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[-18, 4, 14], [0, -6, 18], [18, 2, 13]]) { g.beginPath(); g.arc(cx + dx, 10 + dy, r, 0, TAU); g.fill(); }
      g.fillStyle = '#9fe08a'; g.beginPath(); g.ellipse(-30, 82, 90, 34, 0, 0, TAU); g.ellipse(60, 86, 80, 28, 0, 0, TAU); g.fill();
    }
    if (n > 0) {
      g.globalAlpha = n;
      gr = g.createLinearGradient(0, -84, 0, 76); gr.addColorStop(0, '#16195a'); gr.addColorStop(1, '#3d3a8e');
      g.fillStyle = gr; g.fillRect(-86, -84, 172, 160);
      g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(44, -44, 18, 0, TAU); g.fill();
      g.fillStyle = '#16195a'; g.beginPath(); g.arc(52, -50, 16, 0, TAU); g.fill();
      for (let i = 0; i < 9; i++) { const x = -76 + ((i * 53) % 150), y = -70 + ((i * 37) % 110); g.globalAlpha = n * (0.5 + 0.5 * Math.sin(env.t * 3 + i)); at(g, x, y, () => drawSparkleShape(g, 10, '#ffffff')); }
      g.globalAlpha = n; g.fillStyle = '#2d4a4a'; g.beginPath(); g.ellipse(-30, 82, 90, 34, 0, 0, TAU); g.ellipse(60, 86, 80, 28, 0, 0, TAU); g.fill();
    }
    g.restore();
  },
  glow(g, col, it, env) {
    g.globalAlpha *= 0.55; g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(44, -44, 18, 0, TAU); g.fill();
  },
});
def({
  id: 'poster', name: 'Rainbow poster', cat: 'wall', group: 'wall', w: 150, h: 196, colors: ['#fffaf0', '#e9f6ff', '#fff0f7', '#f1ffe9'], cpu: 1.5,
  draw(g, col) {
    rr(g, -70, -92, 140, 184, 8, col);
    const cs = SCHEMES.rainbow;
    cs.forEach((c, i) => { g.beginPath(); g.arc(0, 36, 56 - i * 7, Math.PI, TAU); g.lineWidth = 8; g.strokeStyle = c; g.stroke(); });
    for (const x of [-48, 48]) { g.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[-12, 0, 11], [0, -6, 13], [12, 0, 11]]) { g.beginPath(); g.arc(x + dx, 38 + dy, r, 0, TAU); g.fill(); } }
    at(g, -36, -54, () => drawSparkleShape(g, 26, '#ffd23f')); at(g, 34, -36, () => drawStarShape(g, 26, '#ff9ec4')); at(g, 6, -70, () => drawHeartShape(g, 18, '#ff6fb1'));
    tape(g);
  },
});
function tape(g) {
  g.fillStyle = 'rgba(255,240,180,0.85)';
  for (const [x, y, r] of [[-66, -88, -0.7], [66, -88, 0.7]]) { g.save(); g.translate(x, y); g.rotate(r); g.fillRect(-16, -6, 32, 12); g.restore(); }
}
def({
  id: 'starposter', name: 'Star poster', cat: 'wall', group: 'wall', w: 150, h: 196, colors: CHAR_IDS, charItem: true, cpu: 2,
  draw(g, ch) {
    const c = (charById(ch) || {}).color || '#ff9ec4';
    ui.roundRect(g, -70, -92, 140, 184, 8);
    const gr = g.createLinearGradient(0, -92, 0, 92); gr.addColorStop(0, shade(c, 0.55)); gr.addColorStop(1, shade(c, 0.1));
    g.fillStyle = gr; g.fill();
    for (const [x, y, s] of [[-46, -66, 22], [44, -56, 18], [-40, 10, 14], [48, 20, 16], [0, -78, 12]]) at(g, x, y, () => drawStarShape(g, s, '#fff6a8'));
    const img = charImage(ch);
    if (img) {
      g.save(); ui.roundRect(g, -70, -92, 140, 184, 8); g.clip();
      const h = 150, w = Math.min(130, h * img.width / img.height), hh = w * img.height / img.width;
      g.drawImage(img, -w / 2, 88 - hh, w, hh);
      g.restore();
    }
    ui.roundRect(g, -70, -92, 140, 184, 8); g.lineWidth = OUT; g.strokeStyle = NAVY; g.stroke();
    tape(g);
  },
});
def({
  id: 'picture', name: 'Picture', cat: 'wall', group: 'wall', w: 134, h: 154, colors: CHAR_IDS, charItem: true, cpu: 1.5, live: true,
  draw(g, ch) {
    rr(g, -62, -72, 124, 144, 16, '#ffd23f');
    rr(g, -48, -58, 96, 116, 8, '#fff8ec', 3);
    drawPortrait(g, ch, 0, -2, 40, { expr: 'happy', bg: shade((charById(ch) || {}).color || '#ff9ec4', 0.6) });
    for (const [x, y] of [[-62, -72], [62, -72], [-62, 72], [62, 72]]) el(g, x, y, 7, 7, '#ff6fb1', 3);
  },
});
def({
  id: 'mirror', name: 'Mirror', cat: 'wall', group: 'wall', w: 144, h: 190, colors: ['#ffd23f', '#ff9ec4', '#b79aff', '#ffffff'], cpu: 1, live: true,
  draw(g, col, it, env) {
    el(g, 0, 4, 64, 86, col);
    g.save(); g.beginPath(); g.ellipse(0, 4, 50, 72, 0, 0, TAU); g.clip();
    const gr = g.createLinearGradient(-50, -70, 50, 70); gr.addColorStop(0, '#e9f8ff'); gr.addColorStop(1, '#b8dcf2');
    g.fillStyle = gr; g.fillRect(-50, -70, 100, 150);
    const p = ((env.t * 0.35 + (it.seed || 0)) % 1.6) - 0.5;
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.save(); g.translate(p * 160, 0); g.rotate(0.5); g.fillRect(-10, -120, 18, 240); g.fillRect(16, -120, 7, 240); g.restore();
    g.restore();
    el(g, 0, 4, 50, 72, null, 3);
    at(g, 0, -86, () => drawHeartShape(g, 30, '#ff6fb1'));
  },
});
def({
  id: 'clock', name: 'Clock', cat: 'wall', group: 'wall', w: 116, h: 124, colors: ['#ff9ec4', '#7cc7ff', '#ffd05e', '#b79aff'], cpu: 1, live: true,
  draw(g, col) {
    el(g, -32, -46, 14, 12, '#ffd23f'); el(g, 32, -46, 14, 12, '#ffd23f');
    el(g, 0, 6, 50, 50, col);
    el(g, 0, 6, 38, 38, '#ffffff', 3);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; el(g, Math.cos(a) * 30, 6 + Math.sin(a) * 30, i % 3 ? 2 : 3.5, i % 3 ? 2 : 3.5, NAVY, 0); }
    this.overlay(g, col);
    rr(g, -30, 50, 12, 12, 4, col, 3); rr(g, 18, 50, 12, 12, 4, col, 3);
  },
  overlay(g) {
    const d = new Date(), m = d.getMinutes() + d.getSeconds() / 60, h = (d.getHours() % 12) + m / 60;
    g.lineCap = 'round'; g.strokeStyle = NAVY;
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, 6); g.lineTo(Math.sin(h / 12 * TAU) * 18, 6 - Math.cos(h / 12 * TAU) * 18); g.stroke();
    g.lineWidth = 3.5; g.beginPath(); g.moveTo(0, 6); g.lineTo(Math.sin(m / 60 * TAU) * 27, 6 - Math.cos(m / 60 * TAU) * 27); g.stroke();
    el(g, 0, 6, 4, 4, '#ff4d6d', 0);
  },
});
def({
  id: 'shelf', name: 'Wall shelf', cat: 'wall', group: 'wall', w: 214, h: 60, colors: PAINT, cpu: 1.5,
  surface: { y: -12, hw: 96 },
  draw(g, col) {
    for (const x of [-66, 66]) poly(g, [[x - 10, 6], [x + 10, 6], [x + 10, 30], [x - 4, 6]], shade(col, -0.15), 3);
    rr(g, -104, -12, 208, 18, 6, col);
  },
});
def({
  id: 'bunting', name: 'Bunting', cat: 'wall', group: 'wall', w: 404, h: 100, colors: ['rainbow', 'candy', 'pink', 'sea'], cpu: 1.5, noArt: true,
  draw(g, scheme) {
    const cols = SCHEMES[scheme] || SCHEMES.rainbow;
    const pts = swagPoints(390, 54, 6);
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    pts.forEach(([x, y], i) => {
      if (i === pts.length - 1) return;
      const [x2, y2] = pts[i + 1], mx = (x + x2) / 2, my = (y + y2) / 2;
      poly(g, [[x + 3, y + 1], [x2 - 3, y2 + 1], [mx, my + 36]], cols[i % cols.length], 3);
    });
  },
});
def({
  id: 'butterflies', name: 'Butterflies', cat: 'wall', group: 'wall', w: 196, h: 150, colors: ['#ff8fc2', '#7cc7ff', '#b79aff', '#ffd05e'], cpu: 1, live: true, noArt: true,
  draw(g, col, it, env) {
    [[-56, -28, 1], [44, -48, 0.8], [14, 40, 0.9]].forEach(([x, y, s], i) => {
      at(g, x, y + Math.sin(env.t * 1.5 + i * 2) * 5, () => {
        g.scale(s, s);
        const f = 0.35 + 0.65 * Math.abs(Math.cos(env.t * 4 + i * 1.3 + (it.seed || 0) * 4));
        const c = i === 1 ? shade(col, 0.35) : col;
        for (const sx of [-1, 1]) {
          g.save(); g.scale(sx * f, 1);
          el(g, 20, -12, 22, 17, c, 3, 0.5); el(g, 16, 14, 14, 11, shade(c, 0.4), 3, -0.4);
          el(g, 22, -12, 6, 6, '#ffffff', 0);
          g.restore();
        }
        el(g, 0, 0, 5, 22, NAVY, 0);
        g.strokeStyle = NAVY; g.lineWidth = 2; g.beginPath(); g.moveTo(-2, -20); g.quadraticCurveTo(-8, -32, -14, -34); g.moveTo(2, -20); g.quadraticCurveTo(8, -32, 14, -34); g.stroke();
      });
    });
  },
});

// --- Plants -----------------------------------------------------------------------------
def({
  id: 'plant', name: 'Plant', cat: 'floor', group: 'plants', w: 130, h: 206, colors: POTS, cpu: 2, live: true,
  draw(g, col, it, env) {
    const sway = Math.sin(env.t * 1.1 + (it.seed || 0) * 6) * 0.03;
    g.save(); g.translate(0, -76); g.rotate(sway);
    const leaves = [[-1.9, 112], [-1.35, 128], [-0.8, 118], [-0.25, 104], [0.3, 116], [0.85, 120], [1.3, 104], [-0.55, 70], [0.5, 74]];
    for (const [a, L] of leaves) {
      g.save(); g.rotate(a * 0.6);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-L * 0.36, -L * 0.55, 0, -L); g.quadraticCurveTo(L * 0.36, -L * 0.55, 0, 0); g.closePath();
      fs(g, a > 0 ? '#4cc274' : '#3aad62', 3);
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -6); g.lineTo(0, -L * 0.85); g.stroke();
      g.restore();
    }
    g.restore();
    poly(g, [[-42, -72], [42, -72], [32, 0], [-32, 0]], col);
    rr(g, -48, -84, 96, 18, 7, shade(col, 0.25));
    at(g, 0, -40, () => drawHeartShape(g, 22, '#ffffff'));
  },
});
def({
  id: 'flowers', name: 'Flower vase', cat: 'small', group: 'plants', w: 70, h: 108, colors: POTS, cpu: 2,
  draw(g, col) {
    g.lineWidth = 4; g.strokeStyle = '#3aad62';
    for (const [x, y] of [[-20, -88], [2, -100], [22, -84]]) { g.beginPath(); g.moveTo(0, -40); g.quadraticCurveTo(x * 0.4, -60, x, y); g.stroke(); }
    at(g, -20, -88, () => { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; el(g, Math.cos(a) * 8, Math.sin(a) * 8, 7, 5, '#ffffff', 2, a); } el(g, 0, 0, 5, 5, '#ffb627', 2); });
    at(g, 2, -102, () => { poly(g, [[-11, 8], [-12, -8], [-5, -2], [0, -12], [5, -2], [12, -8], [11, 8]], '#ff6fb1', 2.5); });
    at(g, 22, -84, () => { for (let i = 0; i < 5; i++) { const a = i * TAU / 5; el(g, Math.cos(a) * 7, Math.sin(a) * 7, 6, 6, '#b79aff', 2); } el(g, 0, 0, 4, 4, '#ffd23f', 2); });
    g.beginPath(); g.moveTo(-14, -44); g.quadraticCurveTo(-30, -18, -18, 0); g.lineTo(18, 0); g.quadraticCurveTo(30, -18, 14, -44); g.closePath(); fs(g, col);
    shine(g, -10, -20, 4, 10, 0.2);
  },
});
def({
  id: 'cactus', name: 'Cactus', cat: 'small', group: 'plants', w: 64, h: 96, colors: POTS, cpu: 1,
  draw(g, col) {
    rr(g, -34, -64, 16, 30, 8, '#5cc77a', 3); rr(g, 18, -76, 16, 30, 8, '#5cc77a', 3);
    rr(g, -16, -88, 32, 60, 16, '#5cc77a');
    el(g, -6, -64, 2.5, 3, NAVY, 0); el(g, 6, -64, 2.5, 3, NAVY, 0);
    g.strokeStyle = NAVY; g.lineWidth = 2; g.beginPath(); g.arc(0, -60, 4, 0.3, Math.PI - 0.3); g.stroke();
    el(g, -10, -58, 3.5, 2, 'rgba(255,111,177,0.6)', 0); el(g, 10, -58, 3.5, 2, 'rgba(255,111,177,0.6)', 0);
    at(g, 0, -90, () => { for (let i = 0; i < 5; i++) { const a = i * TAU / 5; el(g, Math.cos(a) * 5, Math.sin(a) * 5, 5, 5, '#ff6fb1', 2); } });
    poly(g, [[-26, -32], [26, -32], [20, 0], [-20, 0]], col);
    rr(g, -29, -38, 58, 10, 4, shade(col, 0.25), 3);
  },
});

// --- Rugs ---------------------------------------------------------------------------------
const FLAT = 0.42;
function heartPath(g, s) {
  g.beginPath(); g.moveTo(0, s * 0.35);
  g.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.95, 0, -s * 0.45);
  g.bezierCurveTo(s * 0.45, -s * 0.95, s * 0.9, -s * 0.25, 0, s * 0.35); g.closePath();
}
function starPath(g, r, inner = 0.48) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * inner : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath();
}
def({
  id: 'rug-round', name: 'Round rug', cat: 'rug', group: 'rugs', w: 330, h: 140, colors: RUGS, cpu: 2,
  draw(g, col) {
    g.save(); g.scale(1, FLAT);
    el(g, 0, 0, 165, 165, col, OUT / FLAT * 0.7);
    el(g, 0, 0, 128, 128, '#ffffff', 0); el(g, 0, 0, 104, 104, shade(col, 0.4), 0); el(g, 0, 0, 60, 60, '#ffffff', 0); el(g, 0, 0, 36, 36, col, 0);
    g.restore();
  },
});
def({
  id: 'rug-heart', name: 'Heart rug', cat: 'rug', group: 'rugs', w: 330, h: 150, colors: RUGS, cpu: 1.5,
  draw(g, col) {
    g.save(); g.scale(1, FLAT * 1.05); g.translate(0, 16);
    heartPath(g, 300); fs(g, col, OUT / FLAT * 0.7);
    heartPath(g, 220); fs(g, shade(col, 0.45), 0);
    heartPath(g, 120); fs(g, '#ffffff', 0);
    g.restore();
  },
});
def({
  id: 'rug-star', name: 'Star rug', cat: 'rug', group: 'rugs', w: 370, h: 160, colors: RUGS, cpu: 1,
  draw(g, col) {
    g.save(); g.scale(1, FLAT);
    starPath(g, 190); fs(g, col, OUT / FLAT * 0.7);
    starPath(g, 128); fs(g, shade(col, 0.45), 0);
    starPath(g, 64); fs(g, '#ffffff', 0);
    g.restore();
  },
});
def({
  id: 'rug-rainbow', name: 'Rainbow rug', cat: 'rug', group: 'rugs', w: 360, h: 140, colors: ['rainbow', 'candy', 'pink', 'sea'], cpu: 1.5, noArt: true,
  draw(g, scheme) {
    const cols = SCHEMES[scheme] || SCHEMES.rainbow;
    g.save(); g.scale(1, FLAT * 0.92);
    g.save(); g.beginPath(); g.ellipse(0, 0, 180, 170, 0, 0, TAU); g.clip();
    for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(-180 + i * 40, -170, 40, 340); }
    g.restore();
    g.beginPath(); g.ellipse(0, 0, 180, 170, 0, 0, TAU); g.lineWidth = OUT / FLAT * 0.7; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.ellipse(0, 0, 166, 156, 0, 0, TAU); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.setLineDash([10, 10]); g.stroke(); g.setLineDash([]);
    g.restore();
  },
});

// =============================================================================
// Palette order: furniture, lights, toys, wall, plants, rugs (then the
// floors and wallpapers, which wrap around to the left of the bed).
export const GROUPS = {
  furniture: { name: 'Furniture', color: '#ff9f1c' },
  lights: { name: 'Lights', color: '#ffc12e' },
  toys: { name: 'Toys & pets', color: '#ff6fb1' },
  wall: { name: 'On the wall', color: '#3fa7ff' },
  plants: { name: 'Plants', color: '#36d17a' },
  rugs: { name: 'Rugs', color: '#9b5cff' },
  floors: { name: 'Floors', color: '#c98a4b' },
  walls: { name: 'Wallpaper', color: '#25d0c8' },
};
export const ITEMS = D;
export const ITEM = Object.fromEntries(D.map((d) => [d.id, d]));

/** Draw an item's art (or procedural drawing) at the current transform's anchor. */
export function drawItem(g, d, it, env) {
  const col = d.colors[(it.color || 0) % d.colors.length];
  const img = !d.noArt && !d.charItem && art('prop/room-' + d.id);
  if (img) {
    // Optional art is painted in the first colour; other colours are recoloured.
    const tint = it.color && typeof col === 'string' && col[0] === '#' ? col : null;
    if (d.under) d.under(g, col, it, env);
    drawFit(g, img, d, { tint });
    if (d.overlay) d.overlay(g, col, it, env);
    return;
  }
  d.draw(g, col, it, env);
}
export function drawItemGlow(g, d, it, env) {
  if (!d.glow || art('prop/room-' + d.id)) return;
  const col = d.colors[(it.color || 0) % d.colors.length];
  d.glow(g, col, it, env);
}
export function drawItemFront(g, d, it, env) {
  if (!d.front) return;
  if (art('prop/room-' + d.id + '-front')) {
    const img = art('prop/room-' + d.id + '-front'), col = d.colors[(it.color || 0) % d.colors.length];
    drawFit(g, img, d, { tint: it.color ? col : null });
    return;
  }
  d.front(g, d.colors[(it.color || 0) % d.colors.length], it, env);
}

/** Local bounding box of an item (x0, y0, x1, y1) around its anchor. */
export function localBox(d) {
  if (d.cat === 'wall' || d.cat === 'rug') return { x0: -d.w / 2, y0: -d.h / 2, x1: d.w / 2, y1: d.h / 2 };
  return { x0: -d.w / 2, y0: -d.h, x1: d.w / 2, y1: 0 };
}

// Static items are drawn once into a sprite (1.5x) and blitted after that;
// animated ones (live: true) and generated art are drawn directly.
const SPR = 1.5, spriteCache = new Map();
function itemSprite(d, it) {
  const color = (it.color || 0) % d.colors.length;
  const bucket = d.id === 'bookshelf' ? Math.floor((it.seed || 0.3) * 6) : 0;
  const key = d.id + '|' + color + '|' + bucket;
  let c = spriteCache.get(key);
  if (!c) {
    const b = localBox(d), pad = 26;
    c = mk(Math.ceil((b.x1 - b.x0 + pad * 2) * SPR), Math.ceil((b.y1 - b.y0 + pad * 2) * SPR));
    const x = c.getContext('2d');
    x.scale(SPR, SPR); x.translate(-b.x0 + pad, -b.y0 + pad);
    d.draw(x, d.colors[color], { color, seed: (bucket + 0.5) / 6 }, { t: 0, night: 0 });
    c.ox = b.x0 - pad; c.oy = b.y0 - pad;
    spriteCache.set(key, c);
  }
  return c;
}

/** Draw an item the fastest way available (art, cached sprite or live drawing). */
export function paintItem(g, d, it, env) {
  if (!d.live && !it.ghostLive && !(!d.noArt && !d.charItem && art('prop/room-' + d.id))) {
    const c = itemSprite(d, it);
    g.drawImage(c, c.ox, c.oy, c.width / SPR, c.height / SPR);
    return;
  }
  drawItem(g, d, it, env);
}

/** Palette / menu icon: the item fitted into a size x size box centred on (x, y). */
export function drawIconOf(g, d, x, y, size, color = 0, env = { t: 0, night: 0 }) {
  const b = localBox(d);
  const s = size / Math.max(b.x1 - b.x0, b.y1 - b.y0);
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-(b.x0 + b.x1) / 2, -(b.y0 + b.y1) / 2);
  paintItem(g, d, { color, seed: 0.4, icon: true }, env);
  if (d.front) drawItemFront(g, d, { color }, env);
  g.restore();
}

export { SCHEMES, BALLOONS, CHAR_IDS, clamp };
