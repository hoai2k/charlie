// Dream Room: the dollhouse room itself. A cut-away room seen from the front
// and a little above: back wall, two side walls in perspective (the door and
// light switch are on the right one) and a floor. Wallpapers and floors are
// procedural patterns rendered once into cached canvases.
//
// Floor-plane projection (world X across, z depth, h height above the floor):
//   screen x = 960 + X / z,   screen y = -633 + (1563 - h) / z
// z = 1 at the front edge of the floor (y 930), z = ZB at the back wall (y 590).
import { TAU } from '../../engine/util.js';
import { drawHeartShape, drawStarShape } from '../../engine/emotes.js';

export const NAVY = '#24163f';
export const ZB = 1.278, ZF = 1, HALF = 690, WALL_H = 498;
export const proj = (X, h, z) => ({ x: 960 + X / z, y: -633 + (1563 - h) / z });
/** Scale of things standing on the floor at screen y (1 at the front edge). */
export const depthAt = (y) => (y + 633) / 1563;
export const FLOOR_Y0 = 590, FLOOR_Y1 = 930;
export const WALL = { x0: 420, x1: 1500, y0: 200, y1: 590 };
export const WALL_S = depthAt(FLOOR_Y0);   // scale of things on the back wall (~0.78)
/** Half-width of the floor at screen y. */
export const floorHalf = (y) => HALF * depthAt(y);

// Polygons (screen space).
export const POLY = {
  floor: [[420, 590], [1500, 590], [1650, 930], [270, 930]],
  left: [[420, 590], [420, 200], [270, 432], [270, 930]],
  right: [[1500, 590], [1500, 200], [1650, 432], [1650, 930]],
  back: [[420, 200], [1500, 200], [1500, 590], [420, 590]],
};
export function polyPath(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
/** All of the room interior (for night tinting). */
export function roomPath(g) {
  g.beginPath();
  for (const k of ['back', 'left', 'right', 'floor']) POLY[k].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
}

// Door and light switch on the right wall.
export const DOOR = { z0: 1.05, z1: 1.2, h: 330 };
export const DOOR_FOOT = proj(HALF, 0, 1.125);           // where visitors step in (≈1573, 756)
export const SWITCH = proj(HALF, 240, 1.235);            // light switch plate centre (between the corner and the door)
export const SWITCH_HIT = { x: SWITCH.x - 46, y: SWITCH.y - 56, w: 92, h: 112 };

// ---------------------------------------------------------------------------
// Wallpapers (1080 x 390 canvases, also used as a pattern on the side walls)

const WP_W = 1080, WP_H = 390;
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export const WALLPAPERS = [
  {
    id: 'wp-stripes', name: 'Candy stripes', base: '#ffd9e8', swatch: ['#ffd9e8', '#ffb3d1'],
    draw(g, w, h) {
      g.fillStyle = this.base; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 60) { g.fillStyle = '#ffbcd6'; g.fillRect(x, 0, 26, h); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(x + 38, 0, 4, h); }
    },
  },
  {
    id: 'wp-dots', name: 'Mint dots', base: '#cff3e4', swatch: ['#cff3e4', '#8fe0c0'],
    draw(g, w, h) {
      g.fillStyle = this.base; g.fillRect(0, 0, w, h);
      for (let y = 0, r = 0; y < h + 40; y += 44, r++) for (let x = (r % 2) * 30; x < w + 40; x += 60) {
        g.fillStyle = '#9fe6c8'; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x + 30, y + 22, 4, 0, TAU); g.fill();
      }
    },
  },
  {
    id: 'wp-hearts', name: 'Lilac hearts', base: '#ebe0ff', swatch: ['#ebe0ff', '#c9a8ff'],
    draw(g, w, h) {
      g.fillStyle = this.base; g.fillRect(0, 0, w, h);
      for (let y = 20, r = 0; y < h + 40; y += 56, r++) for (let x = (r % 2) * 40 + 20; x < w + 40; x += 80) {
        g.save(); g.translate(x, y); g.rotate((r % 2 ? -1 : 1) * 0.25); drawHeartShape(g, 26, r % 3 ? '#cfb2ff' : '#ffb3d9'); g.restore();
      }
    },
  },
  {
    id: 'wp-clouds', name: 'Sky clouds', base: '#b6e2ff', swatch: ['#b6e2ff', '#ffffff'],
    draw(g, w, h) {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd6ff'); gr.addColorStop(1, '#e2f4ff');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const spots = [[90, 70, 1], [330, 150, 0.8], [560, 60, 1.1], [800, 170, 0.9], [990, 80, 0.8], [200, 290, 0.9], [470, 300, 0.7], [720, 310, 1], [960, 300, 0.8]];
      for (const [x, y, s] of spots) {
        g.fillStyle = 'rgba(255,255,255,0.92)';
        for (const [dx, dy, r] of [[-40, 6, 26], [-12, -10, 34], [22, -4, 30], [46, 8, 22], [0, 12, 28]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); }
      }
    },
  },
  {
    id: 'wp-stars', name: 'Starry night', base: '#3f3c93', swatch: ['#3f3c93', '#ffe58a'],
    draw(g, w, h) {
      g.fillStyle = this.base; g.fillRect(0, 0, w, h);
      for (let y = 26, r = 0; y < h + 30; y += 60, r++) for (let x = (r % 2) * 45 + 24; x < w + 40; x += 90) {
        g.save(); g.translate(x, y); g.rotate(r * 0.3); drawStarShape(g, 22, r % 2 ? '#ffe58a' : '#ffd0f0'); g.restore();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x + 40, y + 26, 3, 0, TAU); g.fill();
      }
    },
  },
  {
    id: 'wp-daisies', name: 'Sunny daisies', base: '#fff2bf', swatch: ['#fff2bf', '#ffffff'],
    draw(g, w, h) {
      g.fillStyle = this.base; g.fillRect(0, 0, w, h);
      for (let y = 30, r = 0; y < h + 40; y += 64, r++) for (let x = (r % 2) * 48 + 28; x < w + 40; x += 96) {
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.beginPath(); g.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 8, 5, a, 0, TAU); g.fill(); }
        g.fillStyle = '#ffb627'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
        g.fillStyle = '#b8e39a'; g.beginPath(); g.ellipse(x + 30, y + 26, 8, 4, 0.6, 0, TAU); g.fill();
      }
    },
  },
  {
    id: 'wp-rainbow', name: 'Rainbow waves', base: '#fff7fb', swatch: ['#ffc4dc', '#bfe4ff'],
    draw(g, w, h) {
      g.fillStyle = this.base; g.fillRect(0, 0, w, h);
      const cols = ['#ffc4dc', '#ffdcb5', '#fff1a8', '#c9f2c0', '#bfe4ff', '#dccbff'];
      for (let k = -2; k < 14; k++) {
        g.beginPath();
        for (let x = 0; x <= w; x += 20) { const y = k * 36 + Math.sin(x / 90) * 16; x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.lineWidth = 18; g.strokeStyle = cols[((k % 6) + 6) % 6]; g.stroke();
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Floors (canvases covering the floor polygon's bounding box 270..1650 x 590..930)

export const FLOOR_BOX = { x: 270, y: 590, w: 1380, h: 340 };
function quad(g, X0, z0, X1, z1) {
  const a = proj(X0, 0, z0), b = proj(X1, 0, z0), c = proj(X1, 0, z1), d = proj(X0, 0, z1);
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath();
}
// rows evenly spaced in world depth
const zAt = (v) => ZF + (ZB - ZF) * v;

export const FLOORS = [
  {
    id: 'fl-honey', name: 'Honey wood', swatch: ['#e5b27a', '#c98a4b'],
    draw(g) {
      const rows = 9;
      for (let r = 0; r < rows; r++) {
        const z0 = zAt(r / rows), z1 = zAt((r + 1) / rows);
        let X = -HALF - (r % 3) * 150;
        let k = r;
        while (X < HALF) {
          const X1 = Math.min(HALF, X + 420 + ((k * 97) % 130));
          quad(g, Math.max(-HALF, X), z0, X1, z1);
          g.fillStyle = ['#e9b97f', '#e2ad6f', '#edc48f'][k % 3]; g.fill();
          g.strokeStyle = 'rgba(120,70,30,0.45)'; g.lineWidth = 2; g.stroke();
          X = X1; k++;
        }
      }
    },
  },
  {
    id: 'fl-cherry', name: 'Cozy cherry', swatch: ['#a8644a', '#8a4e39'],
    draw(g) {
      const cols = 16;
      for (let c = 0; c < cols; c++) {
        const X0 = -HALF + (2 * HALF * c) / cols, X1 = -HALF + (2 * HALF * (c + 1)) / cols;
        let v = ((c * 37) % 5) / 10;
        quad(g, X0, ZF, X1, ZB); g.fillStyle = c % 2 ? '#a8644a' : '#b26e52'; g.fill();
        g.strokeStyle = 'rgba(60,25,15,0.45)'; g.lineWidth = 2; g.stroke();
        while (v < 1) { const z = zAt(v); const a = proj(X0, 0, z), b = proj(X1, 0, z); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); v += 0.42; }
      }
    },
  },
  {
    id: 'fl-carpet', name: 'Lilac carpet', swatch: ['#d8c4ff', '#c2a6ff'],
    draw(g) {
      quad(g, -HALF, ZF, HALF, ZB); g.fillStyle = '#d6c2ff'; g.fill();
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 1600; i++) {
        const p = proj((rnd() * 2 - 1) * HALF, 0, zAt(rnd()));
        g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(150,110,220,0.3)';
        g.fillRect(p.x, p.y, 3, 2);
      }
    },
  },
  {
    id: 'fl-checker', name: 'Mint checks', swatch: ['#bff0dc', '#ffffff'],
    draw(g) {
      const nx = 12, nz = 6;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        quad(g, -HALF + (2 * HALF * i) / nx, zAt(j / nz), -HALF + (2 * HALF * (i + 1)) / nx, zAt((j + 1) / nz));
        g.fillStyle = (i + j) % 2 ? '#ffffff' : '#a9ead0'; g.fill();
      }
    },
  },
  {
    id: 'fl-cloud', name: 'Cloud carpet', swatch: ['#bfe3ff', '#ffffff'],
    draw(g) {
      quad(g, -HALF, ZF, HALF, ZB); g.fillStyle = '#c4e6ff'; g.fill();
      const puffs = [[-520, 0.15], [-260, 0.55], [40, 0.25], [300, 0.7], [560, 0.3], [-560, 0.8], [120, 0.85], [-80, 0.5], [420, 0.05]];
      for (const [X, v] of puffs) {
        const z = zAt(v), s = 1 / z;
        const p = proj(X, 0, z);
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [dx, r] of [[-50, 30], [-15, 40], [25, 34], [58, 26]]) { g.beginPath(); g.ellipse(p.x + dx * s, p.y, r * s, r * s * 0.42, 0, 0, TAU); g.fill(); }
      }
    },
  },
];

const wallCache = new Map(), floorCache = new Map();
export function wallCanvas(i) {
  let c = wallCache.get(i);
  if (!c) { c = mk(WP_W, WP_H); WALLPAPERS[i].draw(c.getContext('2d'), WP_W, WP_H); wallCache.set(i, c); }
  return c;
}
export function floorCanvas(i) {
  let c = floorCache.get(i);
  if (!c) {
    c = mk(FLOOR_BOX.w, FLOOR_BOX.h);
    const g = c.getContext('2d');
    g.translate(-FLOOR_BOX.x, -FLOOR_BOX.y);
    g.save(); polyPath(g, POLY.floor); g.clip();
    FLOORS[i].draw(g);
    // soft darkening toward the back wall for depth
    const gr = g.createLinearGradient(0, FLOOR_Y0, 0, FLOOR_Y1);
    gr.addColorStop(0, 'rgba(60,30,80,0.22)'); gr.addColorStop(0.5, 'rgba(60,30,80,0)');
    g.fillStyle = gr; g.fillRect(FLOOR_BOX.x, FLOOR_BOX.y, FLOOR_BOX.w, FLOOR_BOX.h);
    g.restore();
    floorCache.set(i, c);
  }
  return c;
}

/** Small square swatch of a wallpaper/floor for the palette (cached). */
const swatchCache = new Map();
export function swatch(kind, i) {
  const key = kind + i;
  let c = swatchCache.get(key);
  if (!c) {
    c = mk(120, 120);
    const g = c.getContext('2d');
    if (kind === 'wall') g.drawImage(wallCanvas(i), 60, 40, 240, 240, 0, 0, 120, 120);
    else {
      const f = floorCanvas(i);
      g.drawImage(f, f.width / 2 - 150, f.height - 160, 300, 160, -40, 0, 200, 120);
    }
    swatchCache.set(key, c);
  }
  return c;
}
