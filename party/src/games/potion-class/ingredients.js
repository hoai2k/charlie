// Potion Class: magical ingredients, potion bottles and the cauldron, all
// drawn procedurally (a generated prop image is used when it exists).
import { art, drawArt } from '../../engine/art.js';
import { drawStarShape, drawSparkleShape } from '../../engine/emotes.js';
import { TAU } from '../../engine/util.js';

const NAVY = '#24163f';

export const INGREDIENTS = [
  { id: 'moonberry', name: 'Moonberries', color: '#6a55e0' },
  { id: 'starflower', name: 'Starflower', color: '#ffd23f' },
  { id: 'unicornhair', name: 'Unicorn Hair', color: '#ff8ad8' },
  { id: 'dragonpepper', name: 'Dragon Pepper', color: '#ff4a3a' },
  { id: 'bubbleroot', name: 'Bubble Root', color: '#3fd6c0' },
  { id: 'rainbowdew', name: 'Rainbow Dew', color: '#8fdcff' },
  { id: 'snowcrystal', name: 'Snow Crystal', color: '#e9f6ff' },
  { id: 'mushroom', name: 'Giggle Mushroom', color: '#ff9f6a' },
];

const RAINBOW = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'];

// Cached bitmaps so 8 shelves of icons stay cheap to draw.
const cache = new Map();
const CACHE_PX = 160;

/** Draw ingredient `id` centered at (x, y), about `s` px across. */
export function drawIngredient(g, id, x, y, s) {
  if (drawArt(g, 'prop/ingredient-' + id, x, y, s, s)) return;
  let c = cache.get(id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = CACHE_PX;
    const cg = c.getContext('2d');
    cg.translate(CACHE_PX / 2, CACHE_PX / 2);
    cg.scale(CACHE_PX / 120, CACHE_PX / 120);
    paintIngredient(cg, id);
    cache.set(id, c);
  }
  const d = s * 1.2;
  g.drawImage(c, x - d / 2, y - d / 2, d, d);
}

// Paints into a 100 x 100 box centered on the origin.
function paintIngredient(g, id) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 5;
  switch (id) {
    case 'moonberry': {
      g.fillStyle = '#4fc36a';
      g.beginPath(); g.ellipse(-12, -36, 18, 8, -0.5, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(12, -38, 16, 7, 0.6, 0, TAU); g.fill(); g.stroke();
      for (const [bx, by] of [[-19, 10], [19, 12], [0, -14]]) {
        const gr = g.createRadialGradient(bx - 7, by - 8, 3, bx, by, 24);
        gr.addColorStop(0, '#a99bff'); gr.addColorStop(1, '#4128b0');
        g.fillStyle = gr; g.beginPath(); g.arc(bx, by, 22, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(bx - 8, by - 9, 6, 4, -0.6, 0, TAU); g.fill();
      }
      // crescent moon mark
      g.fillStyle = '#fff6c2'; g.beginPath(); g.arc(4, -12, 10, 0, TAU); g.fill();
      g.fillStyle = '#5a40c8'; g.beginPath(); g.arc(9, -16, 9, 0, TAU); g.fill();
      break;
    }
    case 'starflower': {
      for (let i = 0; i < 5; i++) {
        g.save(); g.rotate((i * TAU) / 5);
        g.fillStyle = i % 2 ? '#ffb3e1' : '#ff8fd0';
        g.beginPath(); g.ellipse(0, -26, 17, 25, 0, 0, TAU); g.fill(); g.stroke();
        g.restore();
      }
      g.save(); drawStarShape(g, 54, '#ffd23f'); g.restore();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(-5, -6, 4, 0, TAU); g.fill();
      break;
    }
    case 'unicornhair': {
      const cols = ['#ff7ad9', '#b48cff', '#7fd3ff', '#ffd23f'];
      cols.forEach((col, i) => {
        const ox = -15 + i * 10;
        const path = () => {
          g.beginPath(); g.moveTo(ox * 0.5, -34);
          g.bezierCurveTo(ox - 26, -8, ox + 26, 6, ox - 6, 26);
          g.bezierCurveTo(ox - 16, 34, ox - 2, 46, ox + 10, 38);
        };
        path(); g.lineWidth = 15; g.strokeStyle = NAVY; g.stroke();
        path(); g.lineWidth = 9; g.strokeStyle = col; g.stroke();
      });
      g.fillStyle = '#ffd23f'; g.lineWidth = 4; g.strokeStyle = NAVY;
      g.beginPath(); g.roundRect ? g.roundRect(-22, -46, 44, 16, 6) : g.rect(-22, -46, 44, 16); g.fill(); g.stroke();
      g.save(); g.translate(30, -30); drawSparkleShape(g, 26, '#ffffff'); g.restore();
      break;
    }
    case 'dragonpepper': {
      g.fillStyle = '#ff4a3a';
      g.beginPath(); g.moveTo(-26, -22);
      g.bezierCurveTo(-38, 12, -8, 38, 30, 34);
      g.bezierCurveTo(8, 22, -2, 4, -2, -24);
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(-24, -8); g.quadraticCurveTo(-24, 12, -8, 22); g.stroke();
      g.strokeStyle = NAVY; g.lineWidth = 5;
      g.fillStyle = '#3fae4a';
      g.beginPath(); g.ellipse(-14, -25, 16, 8, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-14, -30); g.quadraticCurveTo(-14, -46, -2, -48); g.lineWidth = 6; g.stroke();
      g.strokeStyle = '#3fae4a'; g.lineWidth = 3; g.stroke();
      // tiny flame at the tip
      g.save(); g.translate(38, 38); g.rotate(-0.9);
      g.strokeStyle = NAVY; g.lineWidth = 4; g.fillStyle = '#ff9f1c';
      g.beginPath(); g.moveTo(0, -20); g.bezierCurveTo(12, -6, 10, 10, 0, 10); g.bezierCurveTo(-10, 10, -12, -6, 0, -20); g.fill(); g.stroke();
      g.fillStyle = '#ffe14d'; g.beginPath(); g.moveTo(0, -8); g.bezierCurveTo(6, 0, 5, 7, 0, 7); g.bezierCurveTo(-5, 7, -6, 0, 0, -8); g.fill();
      g.restore();
      break;
    }
    case 'bubbleroot': {
      g.fillStyle = '#5bd36a';
      for (const a of [-0.5, 0, 0.5]) {
        g.save(); g.translate(0, -24); g.rotate(a);
        g.beginPath(); g.ellipse(0, -14, 7, 16, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
      }
      g.fillStyle = '#4fd8c8';
      g.beginPath(); g.moveTo(-20, -24);
      g.bezierCurveTo(-20, 4, -6, 26, 2, 44);
      g.bezierCurveTo(8, 26, 22, 4, 20, -24);
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(36,22,63,0.45)'; g.lineWidth = 3;
      for (const [y, w] of [[-8, 12], [8, 9], [22, 6]]) { g.beginPath(); g.moveTo(-w, y); g.lineTo(w * 0.4, y + 2); g.stroke(); }
      g.strokeStyle = NAVY; g.lineWidth = 3.5;
      for (const [bx, by, r] of [[30, -6, 10], [38, 16, 6], [-32, 6, 8], [-28, 28, 5]]) {
        g.fillStyle = 'rgba(200,245,255,0.75)'; g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(bx - r * 0.35, by - r * 0.35, r * 0.25, 0, TAU); g.fill();
      }
      break;
    }
    case 'rainbowdew': {
      const drop = () => {
        g.beginPath(); g.moveTo(0, -44);
        g.bezierCurveTo(16, -18, 34, 0, 34, 16);
        g.arc(0, 16, 34, 0, Math.PI);
        g.bezierCurveTo(-34, 0, -16, -18, 0, -44);
        g.closePath();
      };
      g.save(); drop(); g.clip();
      RAINBOW.forEach((c, i) => { g.fillStyle = c; g.fillRect(-36 + i * 12, -50, 13, 110); });
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-40, -50, 80, 110);
      g.restore();
      drop(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.ellipse(-14, 8, 6, 14, 0.3, 0, TAU); g.fill();
      g.beginPath(); g.arc(-9, -12, 4, 0, TAU); g.fill();
      break;
    }
    case 'snowcrystal': {
      const arms = (w, col) => {
        g.strokeStyle = col; g.lineWidth = w;
        for (let i = 0; i < 6; i++) {
          g.save(); g.rotate((i * TAU) / 6);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -42);
          g.moveTo(0, -24); g.lineTo(-12, -34); g.moveTo(0, -24); g.lineTo(12, -34);
          g.moveTo(0, -12); g.lineTo(-8, -18); g.moveTo(0, -12); g.lineTo(8, -18);
          g.stroke(); g.restore();
        }
      };
      arms(13, NAVY); arms(7, '#9fdcff'); arms(2.5, '#ffffff');
      g.fillStyle = '#e9f8ff'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6 + Math.PI / 6; g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); }
      g.closePath(); g.fill(); g.stroke();
      break;
    }
    case 'mushroom': {
      g.fillStyle = '#fff3df';
      g.beginPath(); g.moveTo(-16, -4); g.quadraticCurveTo(-20, 38, 0, 40); g.quadraticCurveTo(20, 38, 16, -4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = NAVY;
      g.beginPath(); g.arc(-6, 14, 3.5, 0, TAU); g.arc(6, 14, 3.5, 0, TAU); g.fill();
      g.lineWidth = 3; g.beginPath(); g.arc(0, 19, 6, 0.2, Math.PI - 0.2); g.stroke();
      g.fillStyle = '#ff9fc4'; g.beginPath(); g.arc(-11, 20, 3.5, 0, TAU); g.arc(11, 20, 3.5, 0, TAU); g.fill();
      g.lineWidth = 5;
      g.fillStyle = '#ff5fa8';
      g.beginPath(); g.moveTo(-42, 0); g.bezierCurveTo(-42, -46, 42, -46, 42, 0); g.quadraticCurveTo(0, 10, -42, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffffff';
      for (const [sx, sy, r] of [[-22, -14, 7], [4, -26, 8], [24, -10, 6], [-4, -8, 4]]) { g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill(); }
      break;
    }
    default: break;
  }
}

// --- recolored art ---------------------------------------------------------
// The delivered potion art has a fixed liquid color (purple bottle, lime
// bubbles). Recolor just those pixels once per color (hue -> target, keep the
// shading, nudge lightness) and cache the bitmap; outlines, glass and
// highlights are untouched. Small LRU so a long session can't pile up canvases.
const tints = new Map();
const TINT_MAX = 40;
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
/**
 * `img` with every pixel whose hue is in [h0, h1] (and s > 0.25, l in 0.2..0.93)
 * moved to `rgb`'s hue. lAvg = the source's average lightness for those pixels.
 * Returns the cached canvas, or `img` itself if pixels can't be read.
 */
function tinted(key, img, rgb, h0, h1, lAvg, lLift = 0) {
  const k = key + '|' + rgb.join(',');
  let c = tints.get(k);
  if (c) { tints.delete(k); tints.set(k, c); return c; }
  c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const cg = c.getContext('2d');
  cg.drawImage(img, 0, 0);
  try {
    const d = cg.getImageData(0, 0, c.width, c.height), px = d.data;
    const [th, ts, tl] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    const dl = (tl - lAvg) * 0.8 + lLift;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue;
      const [h, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
      if (h < h0 || h > h1 || s < 0.25 || l < 0.2 || l > 0.93) continue;
      const out = hslToRgb(th, clamp01(Math.max(ts * 0.9, s * 0.6)), clamp01(l + dl));
      px[i] = out[0]; px[i + 1] = out[1]; px[i + 2] = out[2];
    }
    cg.putImageData(d, 0, 0);
  } catch (e) { return img; }
  tints.set(k, c);
  if (tints.size > TINT_MAX) tints.delete(tints.keys().next().value);
  return c;
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** A round potion bottle with liquid `color`, centered at (x, y), ~s px tall. */
export function drawBottle(g, x, y, s, color, { glow = 0, t = 0 } = {}) {
  g.save(); g.translate(x, y); g.scale(s / 100, s / 100);
  g.lineJoin = 'round';
  if (glow > 0) {
    const gr = g.createRadialGradient(0, 12, 4, 0, 12, 70);
    gr.addColorStop(0, hexA(color, 0.6 * glow)); gr.addColorStop(1, hexA(color, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 12, 70, 0, TAU); g.fill();
  }
  // Generated bottle (purple liquid recolored to `color`); 100 units ~ its height.
  const img = art('prop/potion-bottle');
  if (img) {
    const bmp = tinted('bottle', img, hexRgb(color), 0.69, 0.92, 0.6);
    const sc = 104 / img.height;
    g.drawImage(bmp, -img.width * sc / 2 - 2, -img.height * sc / 2 + 2, img.width * sc, img.height * sc);
    g.restore();
    return;
  }
  g.strokeStyle = NAVY; g.lineWidth = 5;
  // glass
  g.fillStyle = 'rgba(230,245,255,0.85)';
  g.beginPath(); g.moveTo(-12, -34); g.lineTo(-12, -16); g.arc(0, 16, 34, -Math.PI / 2 - 0.36, Math.PI * 1.5 + 0.36, false); g.lineTo(12, -34); g.closePath(); g.fill();
  // liquid
  g.save(); g.beginPath(); g.arc(0, 16, 31, 0, TAU); g.clip();
  g.fillStyle = color; g.fillRect(-40, 2 + Math.sin(t * 3) * 2, 80, 60);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(0, 3 + Math.sin(t * 3) * 2, 31, 5, 0, 0, TAU); g.fill();
  g.restore();
  g.beginPath(); g.moveTo(-12, -34); g.lineTo(-12, -16); g.arc(0, 16, 34, -Math.PI / 2 - 0.36, Math.PI * 1.5 + 0.36, false); g.lineTo(12, -34); g.closePath(); g.stroke();
  // cork
  g.fillStyle = '#c98a4b'; g.beginPath(); g.rect(-14, -46, 28, 14); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(-16, 8, 5, 11, 0.3, 0, TAU); g.fill();
  g.save(); g.translate(14, 20); drawSparkleShape(g, 18, '#ffffff'); g.restore();
  g.restore();
}

export function hexA(hex, a) {
  const [r, gg, b] = hexRgb(hex);
  return `rgba(${r},${gg},${b},${a})`;
}
export function hexRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbStr = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const shade = (c, k) => (k >= 0 ? c.map((v) => v + (255 - v) * k) : c.map((v) => v * (1 + k)));

/**
 * The cauldron, centered on its rim at (x, y), `s` = scale (1 = ~210 px wide).
 * o: { brew: [r,g,b], stir (angle), bubbling 0..1, t, fizz, spoon }
 */
export function drawCauldron(g, x, y, s, o = {}) {
  const t = o.t || 0;
  const brew = o.brew || [140, 210, 255];
  const img = art('prop/cauldron');
  if (img) { drawCauldronArt(g, img, x, y, s, o, t, brew); return; }
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // magic flames underneath
  for (let i = -2; i <= 2; i++) {
    const fh = 26 + Math.sin(t * 9 + i * 1.7) * 7 + (o.bubbling || 0) * 10;
    const fx = i * 22;
    g.fillStyle = i % 2 ? '#b36bff' : '#5fb8ff';
    g.beginPath(); g.moveTo(fx - 12, 108); g.quadraticCurveTo(fx - 10, 108 - fh * 0.6, fx + Math.sin(t * 7 + i) * 4, 108 - fh); g.quadraticCurveTo(fx + 10, 108 - fh * 0.6, fx + 12, 108); g.closePath(); g.fill();
    g.fillStyle = '#e8f6ff';
    g.beginPath(); g.moveTo(fx - 5, 108); g.quadraticCurveTo(fx, 108 - fh * 0.5, fx + 5, 108); g.closePath(); g.fill();
  }
  // legs
  g.fillStyle = '#2c2148'; g.strokeStyle = NAVY; g.lineWidth = 5;
  for (const lx of [-70, 70]) { g.beginPath(); g.moveTo(lx - 10, 70); g.lineTo(lx + (lx < 0 ? -14 : 14), 112); g.lineTo(lx + (lx < 0 ? 4 : -4), 112); g.lineTo(lx + 10, 70); g.closePath(); g.fill(); g.stroke(); }
  // pot body
  const gr = g.createLinearGradient(-105, 0, 105, 0);
  gr.addColorStop(0, '#2a2045'); gr.addColorStop(0.35, '#4d3e7a'); gr.addColorStop(1, '#231a3b');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(-98, 4); g.bezierCurveTo(-118, 70, -70, 104, 0, 104); g.bezierCurveTo(70, 104, 118, 70, 98, 4); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(-82, 26); g.quadraticCurveTo(-80, 64, -48, 84); g.stroke();
  // little rune stars on the pot
  g.save(); g.globalAlpha = 0.6; g.translate(30, 56); drawStarShape(g, 22, '#ffd23f'); g.restore();
  g.save(); g.globalAlpha = 0.45; g.translate(58, 36); drawStarShape(g, 14, '#ffd23f'); g.restore();
  // rim
  g.strokeStyle = NAVY; g.lineWidth = 5;
  g.fillStyle = '#5a4b8c'; g.beginPath(); g.ellipse(0, 0, 108, 30, 0, 0, TAU); g.fill(); g.stroke();
  // brew surface
  const lift = Math.sin(t * 2.2) * 1.5;
  const br = g.createRadialGradient(-20, lift - 6, 6, 0, lift, 96);
  br.addColorStop(0, rgbStr(shade(brew, 0.45))); br.addColorStop(1, rgbStr(shade(brew, -0.15)));
  g.fillStyle = br;
  g.beginPath(); g.ellipse(0, lift + 2, 92, 22, 0, 0, TAU); g.fill();
  // swirl
  g.save(); g.beginPath(); g.ellipse(0, lift + 2, 92, 22, 0, 0, TAU); g.clip();
  g.strokeStyle = rgbStr(shade(brew, 0.65), 0.75); g.lineWidth = 4;
  const sa = o.stir || 0;
  g.beginPath();
  for (let k = 0; k < 40; k++) {
    const a = sa + k * 0.32, r = 6 + k * 2.1;
    g.lineTo(Math.cos(a) * r, lift + 2 + Math.sin(a) * r * 0.24);
  }
  g.stroke();
  g.restore();
  // bubbles on the surface
  const nb = 3 + Math.round((o.bubbling || 0) * 5);
  for (let i = 0; i < nb; i++) {
    const ph = (t * (0.9 + (i % 3) * 0.35) + i * 0.37) % 1;
    const bx = Math.sin(i * 2.7 + 1) * 64, by = lift + Math.cos(i * 1.9) * 9;
    const r = (3 + (i % 3) * 3) * Math.sin(ph * Math.PI) * (1 + (o.bubbling || 0) * 0.6);
    if (r < 0.5) continue;
    g.fillStyle = rgbStr(shade(brew, 0.55)); g.strokeStyle = rgbStr(shade(brew, -0.35)); g.lineWidth = 2;
    g.beginPath(); g.arc(bx, by - r * 0.6, r, 0, TAU); g.fill(); g.stroke();
  }
  // spoon
  if (o.spoon !== false) {
    const a = o.spoonAngle ?? 2.3;
    const sx = Math.cos(a) * 46, sy = Math.sin(a) * 10 + lift;
    g.strokeStyle = NAVY; g.lineWidth = 13;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 26, sy - 96); g.stroke();
    g.strokeStyle = '#d29a5c'; g.lineWidth = 7; g.stroke();
    g.fillStyle = rgbStr(shade(brew, -0.2), 0.8); g.beginPath(); g.ellipse(sx, sy + 2, 12, 5, 0, 0, TAU); g.fill();
  }
  // front lip of the rim over the spoon
  g.strokeStyle = NAVY; g.lineWidth = 5;
  g.fillStyle = '#5a4b8c';
  g.beginPath(); g.ellipse(0, 0, 108, 30, 0, 0.15, Math.PI - 0.15); g.ellipse(0, 4, 96, 22, 0, Math.PI - 0.1, 0.1, true); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(0, 0, 108, 30, 0, 0, Math.PI); g.stroke();
  g.restore();
}

// Generated cauldron: art px -> cauldron units. The painted water (center
// 180,87; radii 105x25 in the 358x360 image) sits on the brew point (x, y),
// which is where ingredients land. The pot is rounder/taller than the
// procedural one, so it is drawn a little smaller to keep its feet near the
// shelf.
const CA = 0.68;
const CW = { x: 180, y: 87, rx: 105, ry: 25 };
const bubbleKey = (c) => c.map((v) => Math.min(255, Math.round(v / 32) * 32));

function drawCauldronArt(g, img, x, y, s, o, t, brew) {
  const bubbling = o.bubbling || 0;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.drawImage(img, -CW.x * CA, -CW.y * CA, img.width * CA, img.height * CA);
  // brew surface over the painted water, in the mix color
  const lift = Math.sin(t * 2.2) * 1;
  const rx = (CW.rx + 2) * CA, ry = (CW.ry + 2) * CA;
  g.fillStyle = rgbStr(shade(brew, -0.12));
  g.beginPath(); g.ellipse(0, lift * 0.4, rx, ry, 0, 0, TAU); g.fill();
  g.fillStyle = rgbStr(shade(brew, 0.3));
  g.beginPath(); g.ellipse(-rx * 0.08, lift * 0.4 + ry * 0.12, rx * 0.86, ry * 0.7, 0, 0, TAU); g.fill();
  // swirl + surface bubbles (procedural design in 92x22 units, squeezed onto the water)
  g.save(); g.scale(rx / 92, ry / 22);
  g.beginPath(); g.ellipse(0, lift, 92, 22, 0, 0, TAU); g.clip();
  g.strokeStyle = rgbStr(shade(brew, 0.65), 0.75); g.lineWidth = 4;
  const sa = o.stir || 0;
  g.beginPath();
  for (let k = 0; k < 40; k++) { const a = sa + k * 0.32, r = 6 + k * 2.1; g.lineTo(Math.cos(a) * r, lift + Math.sin(a) * r * 0.24); }
  g.stroke();
  const nb = 3 + Math.round(bubbling * 5);
  g.fillStyle = rgbStr(shade(brew, 0.55)); g.strokeStyle = rgbStr(shade(brew, -0.35)); g.lineWidth = 2;
  for (let i = 0; i < nb; i++) {
    const ph = (t * (0.9 + (i % 3) * 0.35) + i * 0.37) % 1;
    const r = (3 + (i % 3) * 3) * Math.sin(ph * Math.PI) * (1 + bubbling * 0.6);
    if (r < 0.5) continue;
    g.beginPath(); g.arc(Math.sin(i * 2.7 + 1) * 64, lift + Math.cos(i * 1.9) * 9 - r * 0.6, r, 0, TAU); g.fill(); g.stroke();
  }
  g.restore();
  // wooden spoon: bowl under the surface, handle leaning up and to the right
  const spoon = o.spoon !== false && art('prop/spoon');
  if (spoon) {
    const a = o.spoonAngle ?? 2.3;
    const sx = Math.cos(a) * rx * 0.5, sy = Math.sin(a) * ry * 0.45 + lift * 0.4;
    const ss = 0.8;                    // spoon px -> cauldron units
    g.save();
    g.beginPath(); g.rect(-400, -400, 800, 400 + sy); g.clip();
    g.translate(sx, sy); g.rotate(Math.PI + 0.26);
    // image point (48, 62) = where the neck meets the bowl, on the surface
    g.drawImage(spoon, -48 * ss, -62 * ss, spoon.width * ss, spoon.height * ss);
    g.restore();
    g.fillStyle = rgbStr(shade(brew, -0.2), 0.85);
    g.beginPath(); g.ellipse(sx, sy + 1, 11, 4, 0, 0, TAU); g.fill();
  }
  // foam bubbling over while stirring / ready (lime art recolored to the brew)
  const fa = clamp01((bubbling - 0.25) / 0.5);
  const foam = fa > 0 && art('prop/cauldron-bubbles');
  if (foam) {
    const bmp = tinted('foam', foam, bubbleKey(brew), 0.12, 0.45, 0.64, 0.12);
    const fw = rx * 2.05, fh = fw * foam.height / foam.width;
    const pul = 1 + Math.sin(t * 7) * 0.04 * bubbling;
    g.save(); g.globalAlpha *= fa;
    g.translate(0, ry * 0.55); g.scale(pul * (0.8 + 0.2 * fa), (2 - pul) * (0.6 + 0.4 * fa));
    // image bottom of the foam (y 164 of 180) rests on the front of the water
    g.drawImage(bmp, -fw / 2, -fh * 164 / 180, fw, fh);
    g.restore();
  }
  g.restore();
}
