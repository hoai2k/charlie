// Occluders for Hide & Seek Picnic: the bushes, trees, baskets and toy-shop
// furniture that hidden things peek out from behind.
//
// Each painter draws in local coordinates with (0, 0) at its base (bottom
// center), unflipped and unscaled; the scene places it with translate/scale.
//   front(g, o)  drawn OVER the hidden things (it hides them)
//   back(g, o)   optional, drawn UNDER them (insides of baskets, chests...)
//   spots(o)     hiding spots: { x, y, dx, dy, t, size, tags, layer }
//                  (x, y) where a thing starts mostly hidden; (dx, dy) the
//                  direction that reveals it, up to t px; size = max height;
//                  layer 'top' = sits on top, fully visible (perches, holes)
//   box          [x0, y0, x1, y1] local bounds (culling, art box)
// Art: `prop/seek-<type>` (and `prop/seek-<type>-back`; `-night` versions for
// the night scene) replace the drawn versions, fitted to `box` with the
// bottom edge on the base.
import { TAU } from '../../engine/util.js';
import { drawArt } from '../../engine/art.js';
import { drawSparkleShape, starPath } from '../../engine/emotes.js';

export const NAVY = '#24163f';
const LW = 4;

export const PALETTES = {
  day: {
    leaf: ['#4fae47', '#6cc95a', '#a5e48a'], bush: ['#3f9e4a', '#5cbf55', '#98e07f'],
    trunk: ['#8a5230', '#a8693f', '#c98d5e'], rock: ['#8f89aa', '#b4aec9', '#dcd7ec'],
    grass: ['#3f9e3c', '#5dbb47', '#8fd86a'], berry: ['#ff4d6d', '#ffd23f', '#ffffff'], moss: null,
    reed: ['#4f9a44', '#7cc05e'], cattail: '#8a5230', fern: ['#3f9e4a', '#6cc95a'],
  },
  night: {
    leaf: ['#1f4a58', '#2b6470', '#3f8580'], bush: ['#1f4a50', '#2c6464', '#418a7e'],
    trunk: ['#3d2a4a', '#55405f', '#715a7c'], rock: ['#4b4870', '#666391', '#8783b3'],
    grass: ['#1f4a46', '#2e6660', '#468c7a'], berry: ['#7ff3ff', '#ffe680', '#ffffff'], moss: '#4fbf8a',
    reed: ['#24564f', '#3a7a68'], cattail: '#5c3f5e', fern: ['#1f5a52', '#3b8a74'],
  },
};

// --- helpers ---------------------------------------------------------------------
function circlesPath(g, cs, k = 1, ox = 0, oy = 0) {
  g.beginPath();
  for (const [x, y, r] of cs) { g.moveTo(x + ox + r * k, y + oy); g.arc(x + ox, y + oy, r * k, 0, TAU); }
}
/** Cel-shaded union of circles with one clean outer outline. */
export function blob(g, cs, [dark, base, light], { lw = LW, texture = null } = {}) {
  g.save();
  g.lineJoin = 'round';
  circlesPath(g, cs); g.lineWidth = lw * 2; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = dark; g.fill();
  g.clip();
  g.fillStyle = base;
  g.beginPath(); for (const [x, y, r] of cs) { g.moveTo(x - r * 0.1 + r * 0.95, y - r * 0.16); g.arc(x - r * 0.1, y - r * 0.16, r * 0.95, 0, TAU); } g.fill();
  g.globalAlpha = 0.55; g.fillStyle = light;
  g.beginPath(); for (const [x, y, r] of cs) { g.moveTo(x - r * 0.32 + r * 0.42, y - r * 0.4); g.arc(x - r * 0.32, y - r * 0.4, r * 0.42, 0, TAU); } g.fill();
  g.globalAlpha = 1;
  if (texture) texture(g);
  g.restore();
}
function poly(g, pts, close = true) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); }
function fs(g, c, lw = LW) { g.fillStyle = c; g.fill(); g.lineWidth = lw; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke(); }
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
function leafMarks(g, cs, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = 3; g.lineCap = 'round';
  for (const [x, y, r] of cs) {
    for (let i = 0; i < 3; i++) {
      const a = 0.6 + i * 1.7 + x * 0.01, px = x + Math.cos(a) * r * 0.5, py = y + Math.sin(a) * r * 0.45;
      g.beginPath(); g.arc(px, py, r * 0.18, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    }
  }
  g.restore();
}
function tinyFlower(g, x, y, r, petal, center = '#ffd23f') {
  g.save(); g.translate(x, y);
  g.fillStyle = petal; g.strokeStyle = NAVY; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.5, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = center; g.beginPath(); g.arc(0, 0, r * 0.38, 0, TAU); g.fill(); g.stroke();
  g.restore();
}
const spot = (x, y, dx, dy, t, size, tags, layer = 'mid') => ({ x, y, dx, dy, t, size, tags, layer });

// --- outdoor ------------------------------------------------------------------------
const TREE_CANOPY = [[0, -330, 120], [-110, -290, 92], [110, -300, 96], [-70, -400, 96], [70, -410, 92], [0, -460, 70], [-150, -230, 60], [150, -235, 62], [0, -250, 90]];
const tree = {
  box: [-215, -540, 215, 12],
  front(g, o) {
    const P = o.pal;
    // trunk with roots
    poly(g, [[-40, 0], [-62, 8], [-36, -14], [-30, -120], [-26, -235], [26, -235], [30, -120], [36, -14], [62, 8], [40, 0]]);
    fs(g, P.trunk[1]);
    g.save(); g.clip();
    g.fillStyle = P.trunk[0]; g.fillRect(10, -240, 60, 260);
    g.strokeStyle = P.trunk[0]; g.lineWidth = 3;
    for (const [x, y, l] of [[-14, -60, 40], [-4, -170, 50], [6, -110, 30], [-18, -200, 24]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - l / 2, x, y - l); g.stroke(); }
    g.restore();
    // hollow
    g.beginPath(); g.ellipse(6, -150, 24, 30, 0, 0, TAU); g.fillStyle = '#2a1830'; g.fill(); g.lineWidth = LW; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.ellipse(6, -150, 24, 30, 0, 0.2, Math.PI - 0.2); g.lineWidth = 5; g.strokeStyle = P.trunk[2]; g.stroke();
    // canopy
    blob(g, TREE_CANOPY, P.leaf, { texture: (gg) => leafMarks(gg, TREE_CANOPY, P.leaf[0]) });
    if (o.v % 2 === 0) for (const [x, y] of [[-80, -330], [60, -360], [-20, -420], [110, -260], [-130, -250]]) {
      g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fillStyle = o.night ? '#ffe680' : '#ff4d6d'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.arc(x - 3, y - 3, 3, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
    }
  },
  spots: () => [
    spot(-30, -100, -1, 0, 80, 160, ['peek']), spot(30, -100, 1, 0, 80, 160, ['peek']),
    spot(-190, -270, -1, -0.15, 50, 64, ['tree']), spot(190, -280, 1, -0.2, 50, 64, ['tree']),
    spot(-100, -470, -0.45, -1, 50, 64, ['tree']), spot(90, -480, 0.4, -1, 50, 64, ['tree']), spot(0, -520, 0, -1, 40, 60, ['tree']),
    spot(6, -150, 0, 0, 0, 46, ['hole'], 'top'),
    spot(-150, -300, 0, 0, 0, 42, ['tree'], 'top'), spot(130, -380, 0, 0, 0, 42, ['tree'], 'top'),
    spot(-70, -6, -1, -0.3, 30, 36, ['ground', 'small']),
  ],
};

const BUSH = [[-70, -50, 52], [0, -72, 62], [72, -48, 50], [-30, -40, 50], [36, -40, 50], [-100, -26, 30], [102, -26, 30]];
const bush = {
  box: [-138, -142, 138, 6],
  front(g, o) {
    const P = o.pal;
    blob(g, BUSH, P.bush, { texture: (gg) => leafMarks(gg, BUSH, P.bush[0]) });
    const berry = P.berry[o.v % P.berry.length];
    if (o.v % 3 !== 2) for (const [x, y] of [[-70, -64], [-20, -100], [30, -84], [80, -58], [0, -44], [-48, -30], [56, -26]]) {
      if (o.v % 3 === 0) tinyFlower(g, x, y, 11, berry === '#ffffff' ? '#ffffff' : '#ffb3d9');
      else { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fillStyle = berry; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke(); }
    }
  },
  spots: () => [
    spot(-62, -96, -0.35, -1, 70, 84, ['ground', 'peek']), spot(60, -100, 0.35, -1, 70, 84, ['ground', 'peek']),
    spot(0, -110, 0, -1, 70, 96, ['ground', 'peek']),
    spot(-118, -40, -1, -0.15, 60, 96, ['ground', 'peek']), spot(120, -40, 1, -0.15, 60, 96, ['ground', 'peek']),
    spot(-30, -126, 0, 0, 0, 36, ['perch', 'small'], 'top'), spot(64, -100, 0, 0, 0, 36, ['perch', 'small'], 'top'),
  ],
};

const rock = {
  box: [-92, -86, 92, 6],
  front(g, o) {
    const P = o.pal;
    poly(g, [[-84, 0], [-80, -30], [-56, -62], [-14, -80], [30, -74], [66, -50], [86, -18], [84, 0]]);
    g.lineJoin = 'round';
    fs(g, P.rock[1]);
    g.save(); g.clip();
    g.fillStyle = P.rock[0]; poly(g, [[10, 0], [40, -40], [90, -50], [90, 10]]); g.fill();
    g.fillStyle = P.rock[2]; g.globalAlpha = 0.7; poly(g, [[-60, -50], [-20, -72], [10, -66], [-36, -46]]); g.fill();
    g.restore();
    g.lineWidth = 3; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(-30, -20); g.lineTo(-12, -34); g.moveTo(30, -18); g.lineTo(44, -6); g.stroke();
    if (P.moss) { g.fillStyle = P.moss; g.beginPath(); g.ellipse(-24, -74, 34, 10, 0.2, Math.PI, TAU); g.fill(); }
  },
  spots: () => [
    spot(0, -66, 0, -1, 50, 64, ['ground']), spot(-78, -30, -1, -0.2, 50, 64, ['ground']), spot(80, -26, 1, -0.2, 50, 64, ['ground']),
    spot(-14, -92, 0, 0, 0, 40, ['perch', 'small'], 'top'),
  ],
};

const log = {
  box: [-128, -78, 128, 6],
  front(g, o) {
    const P = o.pal;
    rr(g, -120, -66, 220, 64, 30); fs(g, P.trunk[1]);
    g.save(); rr(g, -120, -66, 220, 64, 30); g.clip();
    g.fillStyle = P.trunk[0]; g.fillRect(-120, -26, 220, 30);
    g.strokeStyle = P.trunk[0]; g.lineWidth = 3;
    for (const x of [-80, -30, 30]) { g.beginPath(); g.moveTo(x, -56); g.quadraticCurveTo(x + 20, -50, x + 40, -56); g.stroke(); }
    g.restore();
    g.beginPath(); g.ellipse(100, -34, 22, 32, 0, 0, TAU); fs(g, P.trunk[2]);
    g.beginPath(); g.ellipse(100, -34, 14, 22, 0, 0, TAU); g.fillStyle = '#2a1830'; g.fill(); g.lineWidth = 3; g.stroke();
    if (P.moss) { g.fillStyle = P.moss; g.beginPath(); g.ellipse(-40, -64, 50, 10, 0, Math.PI, TAU); g.fill(); }
    // little mushrooms
    for (const [x, c] of [[-70, o.night ? '#7ff3ff' : '#ff6b6b'], [-48, o.night ? '#c9a6ff' : '#ffb3c9']]) {
      g.fillStyle = '#fff4e6'; g.lineWidth = 2.5; g.strokeStyle = NAVY; rr(g, x - 4, -78, 8, 14, 3); g.fill(); g.stroke();
      g.beginPath(); g.arc(x, -78, 11, Math.PI, TAU); g.closePath(); g.fillStyle = c; g.fill(); g.stroke();
    }
  },
  spots: () => [
    spot(-30, -70, 0, -1, 50, 70, ['ground']), spot(40, -70, 0, -1, 50, 70, ['ground']), spot(-130, -30, -1, -0.2, 50, 60, ['ground']),
    spot(100, -34, 0, 0, 0, 32, ['hole', 'small'], 'top'), spot(10, -80, 0, 0, 0, 36, ['perch', 'small'], 'top'),
  ],
};

const tuft = {
  box: [-48, -58, 48, 4],
  front(g, o) {
    const P = o.pal;
    const blades = [[-40, -30, -0.5], [-24, -50, -0.25], [-8, -56, -0.05], [8, -54, 0.1], [24, -46, 0.3], [38, -30, 0.55]];
    g.lineJoin = 'round';
    for (const [i, [x, h, lean]] of blades.entries()) {
      poly(g, [[x - 9, 2], [x + lean * 40 - 1, h], [x + 9, 2]]);
      g.fillStyle = P.grass[i % 2 ? 1 : 2]; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    }
  },
  spots: () => [spot(0, -22, 0, -1, 30, 40, ['ground', 'small'])],
};

/** A clump of flowers: existing plant art when available, else drawn daisies. */
const FLOWER_ART = ['prop/plant-rose-bloom', 'prop/plant-sunflower-bloom', 'prop/plant-rainbow-tulip-bloom'];
const flowers = {
  box: [-70, -128, 70, 6],
  front(g, o) {
    const P = o.pal;
    const kinds = o.night ? ['prop/plant-crystal-flower-glow', 'prop/plant-star-bloom-glow', 'prop/plant-glow-mushroom-glow'] : FLOWER_ART;
    const k = o.v % kinds.length;
    const pos = [[-34, 0, 0.82], [30, 0, 0.72], [0, 6, 1]];
    for (const [i, [x, y, s]] of pos.entries()) {
      const key = kinds[(k + i) % kinds.length];
      if (drawArt(g, key, x, y, 90 * s, 128 * s, { anchor: 'bottom' })) continue;
      // drawn fallback daisy
      g.lineWidth = 5; g.strokeStyle = P.grass[0]; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 50 * s, x, y - 100 * s); g.stroke();
      g.save(); g.translate(x + 10, y - 40 * s); g.rotate(-0.5); g.beginPath(); g.ellipse(10, 0, 14, 6, 0, 0, TAU); g.fillStyle = P.grass[1]; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke(); g.restore();
      tinyFlower(g, x, y - 100 * s, 26 * s, ['#ff8fc7', '#ffffff', '#b98bff', '#7fd3ff'][(k + i) % 4]);
    }
  },
  spots: () => [spot(0, -40, 0, -1, 40, 50, ['ground', 'small']), spot(-34, -100, 0, 0, 0, 30, ['perch', 'small'], 'top'), spot(30, -88, 0, 0, 0, 30, ['perch', 'small'], 'top')],
};

const reeds = {
  box: [-110, -150, 110, 6],
  front(g, o) {
    const P = o.pal;
    const stalks = [[-90, -96], [-60, -130], [-34, -110], [-8, -142], [20, -118], [48, -136], [76, -104], [98, -84]];
    for (const [i, [x, h]] of stalks.entries()) {
      poly(g, [[x - 7, 4], [x + (i % 2 ? 8 : -8), h], [x + 7, 4]]);
      g.fillStyle = P.reed[i % 2]; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      if (i % 2 === 0) { rr(g, x - 6 + (i % 2 ? 8 : -8) * 0.6, h * 0.82, 12, 30, 6); g.fillStyle = P.cattail; g.fill(); g.stroke(); }
    }
  },
  spots: () => [spot(-50, -60, 0, -1, 50, 60, ['water']), spot(50, -60, 0, -1, 50, 60, ['water']), spot(-104, -30, -1, -0.3, 40, 50, ['water'])],
};

const fern = {
  box: [-100, -120, 100, 6],
  front(g, o) {
    const P = o.pal;
    for (const [i, a] of [-1.15, -0.7, -0.25, 0.25, 0.7, 1.15].entries()) {
      g.save(); g.rotate(a);
      const len = 110 - Math.abs(a) * 22;
      g.beginPath(); g.moveTo(0, 0);
      for (let k = 0; k <= 10; k++) { const y = -len * k / 10, w = 18 * Math.sin(Math.PI * k / 10) + 4; g.lineTo(-w, y + 4); g.lineTo(0, y); }
      for (let k = 10; k >= 0; k--) { const y = -len * k / 10, w = 18 * Math.sin(Math.PI * k / 10) + 4; g.lineTo(w, y + 4); g.lineTo(0, y); }
      g.closePath(); g.fillStyle = P.fern[i % 2]; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
      g.restore();
    }
  },
  spots: () => [spot(0, -50, 0, -1, 50, 70, ['ground']), spot(-90, -40, -1, -0.3, 40, 56, ['ground']), spot(90, -40, 1, -0.3, 40, 56, ['ground'])],
};

const bigshroom = {
  box: [-90, -170, 90, 6],
  front(g, o) {
    if (drawArt(g, 'prop/plant-glow-mushroom-glow', 0, 4, 176, 178, { anchor: 'bottom' })) return;
    rr(g, -22, -90, 44, 92, 16); fs(g, '#f2e9ff');
    g.beginPath(); g.moveTo(-86, -70); g.quadraticCurveTo(-80, -168, 0, -168); g.quadraticCurveTo(80, -168, 86, -70); g.quadraticCurveTo(0, -56, -86, -70); g.closePath(); fs(g, '#8e6bff');
    for (const [x, y, r] of [[-40, -120, 14], [10, -146, 11], [44, -100, 12], [-6, -96, 9]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#9ff3ff'; g.fill(); }
  },
  spots: () => [spot(-70, -110, -1, -0.4, 50, 70, ['ground']), spot(70, -110, 1, -0.4, 50, 70, ['ground']), spot(0, -150, 0, -1, 40, 66, ['ground']), spot(-30, -170, 0, 0, 0, 36, ['perch', 'small'], 'top')],
};

// --- picnic -------------------------------------------------------------------------
const basket = {
  box: [-100, -130, 100, 6],
  back(g) {
    g.beginPath(); g.ellipse(0, -74, 76, 20, 0, 0, TAU); g.fillStyle = '#5b3a29'; g.fill(); g.lineWidth = LW; g.strokeStyle = NAVY; g.stroke();
    // a checked napkin peeking out
    g.beginPath(); g.moveTo(-60, -74); g.quadraticCurveTo(-40, -100, -10, -82); g.lineTo(-20, -70); g.closePath(); g.fillStyle = '#ff8fa8'; g.fill(); g.stroke();
  },
  front(g) {
    g.lineWidth = 9; g.strokeStyle = NAVY; g.beginPath(); g.ellipse(0, -76, 66, 52, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.lineWidth = 5; g.strokeStyle = '#d9a066'; g.stroke();
    poly(g, [[-80, -74], [80, -74], [66, 0], [-66, 0]]); fs(g, '#d9a066');
    g.save(); poly(g, [[-80, -74], [80, -74], [66, 0], [-66, 0]]); g.clip();
    g.strokeStyle = '#b07a43'; g.lineWidth = 3;
    for (let y = -60; y < 0; y += 14) { g.beginPath(); g.moveTo(-90, y); g.lineTo(90, y); g.stroke(); }
    for (let x = -80; x <= 80; x += 18) { g.beginPath(); g.moveTo(x, -74); g.lineTo(x * 0.85, 0); g.stroke(); }
    g.restore();
    g.beginPath(); g.ellipse(0, -74, 80, 12, 0, 0, Math.PI); g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#e8b57a'; g.stroke();
  },
  spots: () => [spot(-24, -66, 0, -1, 40, 60, ['basket']), spot(28, -64, 0, -1, 40, 60, ['basket']), spot(96, -40, 1, -0.3, 40, 56, ['ground'])],
};

// --- toy shop ------------------------------------------------------------------------
const books = {
  box: [-80, -96, 80, 4],
  front(g, o) {
    const cols = ['#ff6b8b', '#5aaef5', '#ffd23f', '#7fe08a', '#b36bff', '#ff9f1c', '#25d0c8'];
    let x = -76;
    const hs = [80, 92, 70, 86, 76, 94, 72, 84];
    for (let i = 0; i < 8 && x < 70; i++) {
      const w = 16 + ((i * 7 + o.v * 3) % 10), h = hs[(i + o.v) % hs.length];
      rr(g, x, -h, w, h, 3); fs(g, cols[(i + o.v) % cols.length], 3);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 3, -h + 10, w - 6, 4); g.fillRect(x + 3, -16, w - 6, 4);
      x += w + 1;
    }
  },
  spots: () => [spot(-30, -76, 0, -1, 45, 52, ['shelf']), spot(30, -80, 0, -1, 45, 52, ['shelf'])],
};

const blocks = {
  box: [-90, -150, 90, 4],
  front(g, o) {
    const cols = [['#ff6b8b', '#ffd23f'], ['#5aaef5', '#ff9f1c'], ['#7fe08a', '#b36bff'], ['#ffd23f', '#ff6b8b']];
    const S = 50;
    const place = [[-75, 0], [-25, 0], [25, 0], [-50, -S], [0, -S], [-25, -2 * S]];
    for (const [i, [x, y]] of place.entries()) {
      const [c, d] = cols[(i + o.v) % cols.length];
      rr(g, x, y - S, S, S, 6); fs(g, c, 3.5);
      g.save(); g.translate(x + S / 2, y - S / 2);
      if (i % 2) { starPath(g, 15, 0.48); g.fillStyle = d; g.fill(); g.lineWidth = 2.5; g.stroke(); }
      else { g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fillStyle = d; g.fill(); g.lineWidth = 2.5; g.stroke(); }
      g.restore();
    }
  },
  spots: () => [spot(50, -110, 0.6, -1, 50, 60, ['shelf', 'ground']), spot(80, -40, 1, 0, 50, 60, ['shelf', 'ground']), spot(-90, -60, -1, -0.5, 40, 50, ['shelf', 'ground'])],
};

const jar = {
  box: [-44, -112, 44, 4],
  back(g, o) { g.beginPath(); g.ellipse(0, -46, 34, 42, 0, 0, TAU); g.fillStyle = 'rgba(200,235,255,0.35)'; g.fill(); },
  front(g, o) {
    rr(g, -38, -92, 76, 92, 26);
    g.fillStyle = 'rgba(220,245,255,0.42)'; g.fill(); g.lineWidth = LW; g.strokeStyle = NAVY; g.stroke();
    rr(g, -30, -112, 60, 22, 6); fs(g, ['#ff6fb1', '#5aaef5', '#ffd23f'][o.v % 3]);
    g.save(); g.globalAlpha = 0.75; g.fillStyle = '#ffffff'; rr(g, -28, -80, 9, 56, 5); g.fill(); g.restore();
    // a few sweets at the bottom
    for (const [x, c] of [[-16, '#ff6b8b'], [2, '#7fe08a'], [18, '#ffd23f']]) { g.beginPath(); g.arc(x, -12, 9, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 2; g.stroke(); }
  },
  spots: () => [spot(0, -50, 0, 0, 0, 44, ['shelf'])],
};

const chest = {
  box: [-130, -210, 130, 6],
  back(g, o) {
    // open lid leaning back
    poly(g, [[-118, -110], [118, -110], [104, -200], [-104, -200]]); fs(g, '#c47a4a');
    g.fillStyle = '#5b3a29'; poly(g, [[-104, -118], [104, -118], [94, -184], [-94, -184]]); g.fill();
    g.beginPath(); g.ellipse(0, -112, 112, 16, 0, 0, TAU); g.fillStyle = '#3d2618'; g.fill(); g.lineWidth = LW; g.strokeStyle = NAVY; g.stroke();
  },
  front(g, o) {
    rr(g, -120, -116, 240, 116, 14); fs(g, ['#ff8fb6', '#7fc8ff', '#a8e07a'][o.v % 3]);
    g.save(); rr(g, -120, -116, 240, 116, 14); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = -120; x < 130; x += 40) g.fillRect(x, -116, 20, 116);
    g.restore();
    rr(g, -126, -124, 252, 22, 8); fs(g, '#ffd23f');
    rr(g, -18, -84, 36, 30, 6); fs(g, '#ffd23f');
    g.save(); g.translate(0, -50); starPath(g, 26, 0.48); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3; g.stroke(); g.restore();
  },
  spots: () => [spot(-60, -120, 0, -1, 55, 90, ['ground', 'basket', 'peek']), spot(56, -120, 0, -1, 55, 90, ['ground', 'basket', 'peek']), spot(126, -50, 1, -0.2, 50, 70, ['ground'])],
};

const curtain = {
  box: [-80, -600, 100, 4],
  front(g, o) {
    const c = ['#ff7fae', '#b38bff'][o.v % 2], d = ['#e05592', '#8a63d8'][o.v % 2];
    g.beginPath(); g.moveTo(-80, -600); g.lineTo(90, -600); g.quadraticCurveTo(60, -420, 30, -330);
    g.quadraticCurveTo(70, -180, 100, 0); g.lineTo(-80, 0); g.closePath(); fs(g, c);
    g.save(); g.clip(); g.strokeStyle = d; g.lineWidth = 8;
    for (const x of [-50, -10, 30]) { g.beginPath(); g.moveTo(x, -600); g.quadraticCurveTo(x + 30, -420, x + 10, -330); g.quadraticCurveTo(x + 30, -160, x + 40, 0); g.stroke(); }
    g.restore();
    rr(g, -86, -350, 150, 26, 12); fs(g, '#ffd23f');
  },
  spots: () => [spot(50, -230, 1, 0, 70, 150, ['peek']), spot(70, -110, 1, 0, 60, 120, ['peek', 'ground'])],
};

const dollhouse = {
  box: [-150, -330, 150, 4],
  back(g) { rr(g, -130, -230, 260, 230, 4); g.fillStyle = '#ffe1b0'; g.fill(); g.fillStyle = '#f7c98a'; g.fillRect(-130, -120, 260, 6); },
  front(g, o) {
    const wall = ['#fff4e0', '#ffe6f2'][o.v % 2];
    g.beginPath(); g.rect(-130, -230, 260, 230);
    // window and door holes (evenodd)
    g.rect(-100, -200, 64, 56); g.rect(36, -200, 64, 56); g.rect(-100, -96, 64, 56);
    g.rect(32, -100, 56, 100);
    g.fillStyle = wall; g.fill('evenodd'); g.lineWidth = LW; g.strokeStyle = NAVY; g.stroke();
    // window frames
    g.lineWidth = 3;
    for (const [x, y] of [[-100, -200], [36, -200], [-100, -96]]) { g.beginPath(); g.moveTo(x + 32, y); g.lineTo(x + 32, y + 56); g.stroke(); rr(g, x - 6, y + 52, 76, 10, 3); g.fillStyle = '#ff8fb6'; g.fill(); g.stroke(); }
    // roof
    poly(g, [[-160, -224], [0, -330], [160, -224]]); fs(g, ['#ff6b8b', '#7f8cff'][o.v % 2]);
    g.save(); g.translate(0, -268); g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fillStyle = '#ffe680'; g.fill(); g.lineWidth = 3; g.stroke(); g.restore();
  },
  spots: () => [spot(-68, -172, 0, 0, 0, 44, ['hole', 'shelf']), spot(68, -172, 0, 0, 0, 44, ['hole', 'shelf']), spot(-68, -68, 0, 0, 0, 44, ['hole', 'shelf']), spot(60, -46, 0, 0, 0, 70, ['hole', 'ground']), spot(-150, -60, -1, 0, 50, 80, ['ground'])],
};

const bigteddy = {
  box: [-120, -250, 120, 6],
  front(g, o) {
    const c = ['#c98b5a', '#f0b8d0', '#e3c08f'][o.v % 3], d = ['#e8bf91', '#ffe1ee', '#fff1d6'][o.v % 3];
    const parts = [[-56, -196, 30], [56, -196, 30]];
    blob(g, parts, [shadeOf(c), c, d]);
    for (const [x, y] of parts) { g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fillStyle = d; g.fill(); }
    blob(g, [[-60, -26, 34], [60, -26, 34]], [shadeOf(c), c, d]);
    blob(g, [[0, -80, 76]], [shadeOf(c), c, d]);
    g.beginPath(); g.ellipse(0, -70, 44, 40, 0, 0, TAU); g.fillStyle = d; g.fill();
    blob(g, [[-82, -96, 26], [82, -96, 26]], [shadeOf(c), c, d]);
    blob(g, [[0, -170, 64]], [shadeOf(c), c, d]);
    g.beginPath(); g.ellipse(0, -150, 28, 22, 0, 0, TAU); g.fillStyle = d; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.ellipse(0, -158, 11, 8, 0, 0, TAU); g.fillStyle = NAVY; g.fill();
    for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 24, -186, 7, 0, TAU); g.fillStyle = NAVY; g.fill(); g.beginPath(); g.arc(sd * 24 - 2, -188, 2.5, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
    g.beginPath(); g.moveTo(-10, -140); g.quadraticCurveTo(0, -132, 10, -140); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    // bow tie
    poly(g, [[0, -110], [-30, -124], [-30, -96]]); fs(g, '#ff4d6d', 3); poly(g, [[0, -110], [30, -124], [30, -96]]); fs(g, '#ff4d6d', 3);
  },
  spots: () => [spot(-100, -150, -1, -0.2, 50, 110, ['ground', 'peek']), spot(100, -150, 1, -0.2, 50, 110, ['ground', 'peek']), spot(0, -230, 0, -1, 40, 70, ['ground']), spot(-84, -130, 0, 0, 0, 36, ['perch', 'small'], 'top')],
};

const presents = {
  box: [-120, -170, 120, 4],
  front(g, o) {
    const boxes = [[-110, 0, 110, 80, '#7fc8ff', '#ffd23f'], [6, 0, 104, 96, '#ff8fb6', '#ffffff'], [-60, -80, 96, 74, '#b38bff', '#7fe08a']];
    for (const [x, y, w, h, c, r] of boxes) {
      rr(g, x, y - h, w, h, 6); fs(g, c);
      g.fillStyle = r; g.fillRect(x + w / 2 - 8, y - h, 16, h); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.strokeRect(x + w / 2 - 8, y - h, 16, h);
      g.beginPath(); g.ellipse(x + w / 2 - 14, y - h - 8, 15, 9, 0.3, 0, TAU); g.fillStyle = r; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(x + w / 2 + 14, y - h - 8, 15, 9, -0.3, 0, TAU); g.fill(); g.stroke();
    }
  },
  spots: () => [spot(60, -110, 0.4, -1, 50, 70, ['ground', 'shelf']), spot(-118, -60, -1, -0.3, 50, 70, ['ground']), spot(116, -50, 1, -0.3, 50, 70, ['ground'])],
};

const drum = {
  box: [-80, -110, 80, 4],
  front(g, o) {
    rr(g, -70, -84, 140, 84, 10); fs(g, ['#ff4d6d', '#3fa7ff'][o.v % 2]);
    g.save(); rr(g, -70, -84, 140, 84, 10); g.clip();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 5;
    g.beginPath(); for (let x = -70; x <= 70; x += 35) { g.lineTo(x, -78); g.lineTo(x + 17, -8); } g.stroke();
    g.restore();
    g.beginPath(); g.ellipse(0, -84, 72, 18, 0, 0, TAU); fs(g, '#fff4e6');
    g.lineWidth = 6; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(30, -96); g.lineTo(76, -106); g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#ffd23f'; g.stroke();
    g.beginPath(); g.arc(78, -106, 7, 0, TAU); g.fillStyle = '#ff8fb6'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
  },
  spots: () => [spot(-20, -96, 0, -1, 40, 60, ['ground']), spot(-76, -40, -1, -0.2, 40, 56, ['ground']), spot(30, -110, 0, 0, 0, 34, ['perch', 'small'], 'top')],
};

const balloons = {
  box: [-110, -330, 110, 4],
  front(g, o) {
    const cols = ['balloon-pink', 'balloon-blue', 'balloon-yellow', 'balloon-purple', 'balloon-green'];
    const pos = [[-60, -230], [10, -270], [70, -220], [-20, -180], [40, -160]];
    g.lineWidth = 2; g.strokeStyle = NAVY;
    for (const [x, y] of pos) { g.beginPath(); g.moveTo(x, y + 40); g.quadraticCurveTo(x * 0.5 + 6, y * 0.4, 0, 0); g.stroke(); }
    for (const [i, [x, y]] of pos.entries()) {
      const k = cols[(i + o.v) % cols.length];
      if (drawArt(g, 'prop/' + k, x, y + 48, 84, 105, { anchor: 'bottom' })) continue;
      g.beginPath(); g.ellipse(x, y, 34, 42, 0, 0, TAU); fs(g, ['#ff8fc7', '#7fc8ff', '#ffe066', '#c49bff', '#8fe08a'][(i + o.v) % 5]);
    }
  },
  spots: () => [spot(-30, -240, 0, -1, 50, 50, ['air']), spot(40, -200, 1, -0.3, 50, 50, ['air'])],
};

function shadeOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${((n >> 16) & 255) * 0.78 | 0},${((n >> 8) & 255) * 0.78 | 0},${(n & 255) * 0.78 | 0})`;
}

export const PAINTERS = { tree, bush, rock, log, tuft, flowers, reeds, fern, bigshroom, basket, books, blocks, jar, chest, curtain, dollhouse, bigteddy, presents, drum, balloons };

// Occluders used in both the day and the night scene take a `-night` art key at night.
const DAY_AND_NIGHT = new Set(['tree', 'bush', 'rock', 'log', 'tuft', 'reeds', 'flowers']);

/** Draw an occluder layer ('front' | 'back'); generated art replaces the drawing. */
export function drawOccluder(g, oc, layer) {
  const P = PAINTERS[oc.type];
  if (!P[layer]) return;
  g.save();
  g.translate(oc.x, oc.y);
  g.scale(oc.s * oc.flip, oc.s);
  const [x0, y0, x1, y1] = P.box;
  const key = `prop/seek-${oc.type}${oc.night && DAY_AND_NIGHT.has(oc.type) ? '-night' : ''}${layer === 'back' ? '-back' : ''}`;
  if (!drawArt(g, key, (x0 + x1) / 2, y1, x1 - x0, y1 - y0, { anchor: 'bottom' })) P[layer](g, oc);
  g.restore();
}

/** Occluder bounds in scene coordinates. */
export function occluderBox(oc) {
  const [x0, y0, x1, y1] = PAINTERS[oc.type].box;
  const xa = oc.x + x0 * oc.s * oc.flip, xb = oc.x + x1 * oc.s * oc.flip;
  return [Math.min(xa, xb), oc.y + y0 * oc.s, Math.max(xa, xb), oc.y + y1 * oc.s];
}

/** Hiding spots of an occluder in scene coordinates. */
export function occluderSpots(oc) {
  return PAINTERS[oc.type].spots(oc).map((sp) => ({
    ...sp, x: oc.x + sp.x * oc.s * oc.flip, y: oc.y + sp.y * oc.s, dx: sp.dx * oc.flip, t: sp.t * oc.s, size: sp.size * oc.s, oc,
  }));
}

export { tinyFlower, poly, rr, fs as fillStroke };
export const sparkle = drawSparkleShape;
