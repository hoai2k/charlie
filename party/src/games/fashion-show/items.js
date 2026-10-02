// Royal Fashion Show: the wardrobe. Every item is drawn procedurally as
// vector shapes around a category anchor, in "forward space" (+x = facing,
// -y = up), with S = the category's size unit:
//   head  origin = top of the head,         S = head width
//   face  origin = face center (eye line),  S = face width
//   neck  origin = just under the chin,     S = face width
//   back  origin = upper back,              S = body height
//   hand  origin = the hand,                S = body height
//   aura  origin = body center,             S = body height
import { RAINBOW } from '../../engine/particles.js';
import { starPath, drawSparkleShape } from '../../engine/emotes.js';
import { TAU } from '../../engine/util.js';

export const NAVY = '#24163f';

export const PALETTE = [
  { name: 'Pink', c: '#ff7ac6', d: '#d94f9f', l: '#ffc4e6' },
  { name: 'Gold', c: '#ffd23f', d: '#d9a300', l: '#fff0a8' },
  { name: 'Lilac', c: '#b98bff', d: '#8a5ce0', l: '#e2d2ff' },
  { name: 'Sky', c: '#6fd0ff', d: '#3a9fd6', l: '#c8efff' },
  { name: 'Mint', c: '#6fe3b4', d: '#36b583', l: '#c9f7e4' },
  { name: 'Ruby', c: '#ff4d6d', d: '#c92a4a', l: '#ffb3c1' },
  { name: 'Pearl', c: '#fff4fb', d: '#d8c8e0', l: '#ffffff' },
  { name: 'Rainbow', c: '#ff9fd8', d: '#c97fd0', l: '#ffe0f4', rainbow: true },
];

/** Fill style for a palette color (rainbow becomes a gradient across +-S/2). */
export function fillOf(g, col, S, vertical = false) {
  if (!col.rainbow) return col.c;
  const gr = vertical ? g.createLinearGradient(0, -S * 0.5, 0, S * 0.5) : g.createLinearGradient(-S * 0.5, 0, S * 0.5, 0);
  RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
  return gr;
}
function ol(g, S, k = 0.045) {
  g.lineWidth = Math.max(1.2, S * k); g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
}
export function heartPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.38);
  g.bezierCurveTo(x - s * 0.95, y - s * 0.22, x - s * 0.48, y - s * 0.92, x, y - s * 0.42);
  g.bezierCurveTo(x + s * 0.48, y - s * 0.92, x + s * 0.95, y - s * 0.22, x, y + s * 0.38);
  g.closePath();
}
export function starAt(g, x, y, r, rot = 0, inner = 0.45) {
  g.save(); g.translate(x, y); g.rotate(rot); starPath(g, r, inner); g.restore();
}
function shine(g, x, y, rx, ry, rot = -0.6, a = 0.75) {
  g.save(); g.globalAlpha *= a; g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); g.restore();
}
export function flower(g, x, y, r, petal, center = '#ffd23f', S = r * 6) {
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5 - Math.PI / 2;
    g.beginPath(); g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, 0, TAU);
    g.fillStyle = petal; g.fill(); ol(g, S, 0.012);
  }
  g.beginPath(); g.arc(x, y, r * 0.36, 0, TAU); g.fillStyle = center; g.fill(); ol(g, S, 0.012);
}
function gem(g, x, y, r, color, S) {
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.closePath();
  g.fillStyle = color; g.fill(); ol(g, S, 0.03);
  shine(g, x - r * 0.25, y - r * 0.3, r * 0.22, r * 0.12);
}

// --- head ----------------------------------------------------------------
const HEAD = [
  { name: 'None' },
  {
    name: 'Crown', color: 1, icon: [1, 0.22],
    draw(g, S, col) {
      const w = S * 0.92;
      g.beginPath();
      g.moveTo(-w / 2, S * 0.12); g.lineTo(-w / 2, -S * 0.26); g.lineTo(-w / 4, -S * 0.06); g.lineTo(0, -S * 0.44);
      g.lineTo(w / 4, -S * 0.06); g.lineTo(w / 2, -S * 0.26); g.lineTo(w / 2, S * 0.12); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.rect(-w / 2, S * 0.02, w, S * 0.1); g.fillStyle = col.d; g.fill(); ol(g, S, 0.03);
      for (const [x, y] of [[-w / 2, -S * 0.26], [0, -S * 0.44], [w / 2, -S * 0.26]]) {
        g.beginPath(); g.arc(x, y, S * 0.055, 0, TAU); g.fillStyle = '#fff4fb'; g.fill(); ol(g, S, 0.025);
      }
      gem(g, 0, S * 0.0, S * 0.08, '#ff4d6d', S);
      gem(g, -w * 0.28, S * 0.03, S * 0.05, '#3fa7ff', S);
      gem(g, w * 0.28, S * 0.03, S * 0.05, '#3fa7ff', S);
      shine(g, -w * 0.32, -S * 0.12, S * 0.03, S * 0.1, 0.3);
    },
  },
  {
    name: 'Tiara', color: 6, icon: [1.15, 0.12],
    draw(g, S, col) {
      g.beginPath(); g.moveTo(-S * 0.44, S * 0.18);
      g.quadraticCurveTo(-S * 0.32, -S * 0.02, -S * 0.15, -S * 0.07);
      g.lineTo(-S * 0.08, -S * 0.17); g.lineTo(0, -S * 0.34); g.lineTo(S * 0.08, -S * 0.17); g.lineTo(S * 0.15, -S * 0.07);
      g.quadraticCurveTo(S * 0.32, -S * 0.02, S * 0.44, S * 0.18);
      g.quadraticCurveTo(0, S * 0.02, -S * 0.44, S * 0.18); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      gem(g, 0, -S * 0.12, S * 0.075, '#ff7ac6', S);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.arc(sx * S * 0.22, -S * 0.0, S * 0.035, 0, TAU); g.fillStyle = '#b98bff'; g.fill(); ol(g, S, 0.02);
        g.beginPath(); g.arc(sx * S * 0.34, S * 0.07, S * 0.028, 0, TAU); g.fillStyle = '#6fd0ff'; g.fill(); ol(g, S, 0.02);
      }
    },
  },
  {
    name: 'Flower Crown', color: 0, icon: [1, 0.18],
    draw(g, S, col) {
      const n = 7, cols = [col.rainbow ? RAINBOW[0] : col.c, '#fff4fb', col.rainbow ? RAINBOW[2] : col.l];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), x = (u - 0.5) * S * 0.98, y = S * 0.1 - Math.sin(u * Math.PI) * S * 0.14;
        g.save(); g.translate(x, y + S * 0.03); g.rotate((u - 0.5) * 1.6 + 0.5);
        g.beginPath(); g.ellipse(S * 0.07, 0, S * 0.07, S * 0.03, 0, 0, TAU); g.fillStyle = '#5ccf7a'; g.fill(); ol(g, S, 0.015);
        g.restore();
      }
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), x = (u - 0.5) * S * 0.98, y = S * 0.08 - Math.sin(u * Math.PI) * S * 0.14;
        const c = col.rainbow ? RAINBOW[i % RAINBOW.length] : cols[i % 3];
        flower(g, x, y, S * (i % 2 ? 0.075 : 0.095), c, '#ffd23f', S);
      }
    },
  },
  {
    name: 'Big Bow', color: 5, icon: [1, 0.05],
    draw(g, S, col, t) {
      g.save(); g.translate(S * 0.18, -S * 0.04); g.rotate(0.15 + Math.sin(t * 2) * 0.04);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(0, 0);
        g.bezierCurveTo(sx * S * 0.2, -S * 0.28, sx * S * 0.42, -S * 0.12, sx * S * 0.36, S * 0.02);
        g.bezierCurveTo(sx * S * 0.32, S * 0.14, sx * S * 0.14, S * 0.1, 0, 0);
        g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
        g.beginPath(); g.moveTo(sx * S * 0.03, S * 0.03); g.lineTo(sx * S * 0.16, S * 0.26); g.lineTo(sx * S * 0.1, S * 0.24); g.lineTo(sx * S * 0.07, S * 0.28); g.closePath();
        g.fillStyle = col.d; g.fill(); ol(g, S, 0.03);
      }
      g.beginPath(); g.ellipse(0, 0, S * 0.07, S * 0.08, 0, 0, TAU); g.fillStyle = col.d; g.fill(); ol(g, S);
      for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
        g.beginPath(); g.arc(sx * S * (0.16 + k * 0.1), -S * (0.04 + k * 0.03), S * 0.022, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
      }
      g.restore();
    },
  },
  {
    name: 'Bunny Ears', color: 6, icon: [0.85, 0.42],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(-S * 0.46, S * 0.18); g.quadraticCurveTo(0, -S * 0.16, S * 0.46, S * 0.18);
      g.lineWidth = S * 0.11; g.strokeStyle = NAVY; g.lineCap = 'round'; g.stroke();
      g.lineWidth = S * 0.07; g.strokeStyle = col.rainbow ? RAINBOW[5] : col.d; g.stroke();
      for (const sx of [-1, 1]) {
        g.save(); g.translate(sx * S * 0.18, -S * 0.02); g.rotate(sx * 0.18 + Math.sin(t * 3 + sx) * 0.06 + (sx > 0 ? Math.max(0, Math.sin(t * 1.3)) * 0.35 : 0));
        g.beginPath(); g.ellipse(0, -S * 0.4, S * 0.12, S * 0.42, 0, 0, TAU); g.fillStyle = fillOf(g, col, S, true); g.fill(); ol(g, S);
        g.beginPath(); g.ellipse(0, -S * 0.38, S * 0.055, S * 0.3, 0, 0, TAU); g.fillStyle = '#ffb3d9'; g.fill();
        g.restore();
      }
    },
  },
  {
    name: 'Star Clips', color: 1, icon: [1.1, 0.12],
    draw(g, S, col, t) {
      const st = [[-S * 0.32, S * 0.06, S * 0.12, -0.3], [-S * 0.06, -S * 0.08, S * 0.1, 0.2], [S * 0.22, -S * 0.02, S * 0.13, 0.5]];
      st.forEach(([x, y, r, rot], i) => {
        starAt(g, x, y, r, rot + Math.sin(t * 2 + i) * 0.1);
        g.fillStyle = col.rainbow ? RAINBOW[(i * 2) % 7] : col.c; g.fill(); ol(g, S);
        shine(g, x - r * 0.2, y - r * 0.25, r * 0.15, r * 0.08);
      });
      const tw = (Math.sin(t * 5) + 1) / 2;
      g.save(); g.translate(S * 0.4, -S * 0.2); g.globalAlpha = tw; drawSparkleShape(g, S * 0.16, '#fff6a8'); g.restore();
    },
  },
  {
    name: 'Wizard Hat', color: 2, icon: [0.62, 0.62],
    draw(g, S, col) {
      g.beginPath(); g.ellipse(0, S * 0.1, S * 0.64, S * 0.15, 0, 0, TAU); g.fillStyle = col.d; g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.38, S * 0.08);
      g.quadraticCurveTo(-S * 0.12, -S * 0.6, S * 0.3, -S * 1.06);
      g.quadraticCurveTo(S * 0.12, -S * 0.5, S * 0.38, S * 0.08);
      g.quadraticCurveTo(0, S * 0.18, -S * 0.38, S * 0.08); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.36, S * 0.0); g.quadraticCurveTo(0, S * 0.1, S * 0.36, S * 0.0);
      g.lineWidth = S * 0.08; g.strokeStyle = '#ffd23f'; g.stroke();
      for (const [x, y, r] of [[-S * 0.05, -S * 0.3, S * 0.07], [S * 0.12, -S * 0.62, S * 0.05], [S * 0.18, -S * 0.12, S * 0.045]]) {
        starAt(g, x, y, r); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.02);
      }
      g.beginPath(); g.arc(S * 0.3, -S * 1.06, S * 0.05, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.03);
    },
  },
  {
    name: 'Top Hat', color: 2, icon: [0.8, 0.3],
    draw(g, S, col) {
      const ink = '#2f2545';
      g.beginPath(); g.ellipse(0, S * 0.08, S * 0.5, S * 0.11, 0, 0, TAU); g.fillStyle = ink; g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.29, S * 0.07); g.lineTo(-S * 0.32, -S * 0.6); g.quadraticCurveTo(0, -S * 0.67, S * 0.32, -S * 0.6);
      g.lineTo(S * 0.29, S * 0.07); g.quadraticCurveTo(0, S * 0.13, -S * 0.29, S * 0.07); g.closePath();
      g.fillStyle = ink; g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.3, -S * 0.17); g.quadraticCurveTo(0, -S * 0.12, S * 0.3, -S * 0.17); g.lineTo(S * 0.295, -S * 0.03);
      g.quadraticCurveTo(0, S * 0.02, -S * 0.295, -S * 0.03); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S, 0.03);
      shine(g, -S * 0.2, -S * 0.4, S * 0.03, S * 0.12, 0.05, 0.35);
    },
  },
  {
    name: 'Party Hat', color: 7, icon: [0.75, 0.36],
    draw(g, S, col) {
      const cone = () => { g.beginPath(); g.moveTo(-S * 0.27, S * 0.1); g.lineTo(0, -S * 0.78); g.lineTo(S * 0.27, S * 0.1); g.quadraticCurveTo(0, S * 0.18, -S * 0.27, S * 0.1); g.closePath(); };
      cone(); g.fillStyle = col.rainbow ? '#fff4fb' : col.l; g.fill();
      g.save(); cone(); g.clip();
      for (let k = 0; k < 7; k++) {
        g.beginPath(); g.moveTo(-S * 0.5, S * (0.02 - k * 0.14)); g.lineTo(S * 0.5, S * (-0.1 - k * 0.14)); g.lineWidth = S * 0.06;
        g.strokeStyle = col.rainbow ? RAINBOW[k % 7] : (k % 2 ? col.c : col.d); g.stroke();
      }
      g.restore();
      cone(); ol(g, S);
      for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(-S * 0.24 + k * S * 0.08, S * 0.12 + Math.sin(k * 1.4) * S * 0.01, S * 0.045, 0, TAU); g.fillStyle = col.rainbow ? '#ff9fd8' : col.c; g.fill(); ol(g, S, 0.015); }
      g.beginPath(); g.arc(0, -S * 0.8, S * 0.08, 0, TAU); g.fillStyle = col.rainbow ? '#ff7ac6' : col.d; g.fill(); ol(g, S, 0.03);
    },
  },
  {
    name: 'Sun Hat', color: 1, icon: [0.85, 0.12],
    draw(g, S, col) {
      g.beginPath(); g.ellipse(0, S * 0.04, S * 0.66, S * 0.17, 0, 0, TAU); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.ellipse(0, S * 0.0, S * 0.3, S * 0.3, 0, Math.PI, TAU); g.closePath(); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.rect(-S * 0.3, -S * 0.1, S * 0.6, S * 0.09); g.fillStyle = '#ff7ac6'; g.fill(); ol(g, S, 0.025);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(S * 0.12, -S * 0.06); g.quadraticCurveTo(S * (0.12 + sx * 0.12), -S * 0.2, S * (0.12 + sx * 0.14), -S * 0.02); g.closePath();
        g.fillStyle = '#ff7ac6'; g.fill(); ol(g, S, 0.02);
      }
      shine(g, -S * 0.14, -S * 0.18, S * 0.06, S * 0.03, -0.4, 0.5);
    },
  },
  {
    name: 'Beret', color: 5, icon: [0.95, 0.12],
    draw(g, S, col) {
      g.save(); g.rotate(-0.12);
      g.beginPath(); g.ellipse(S * 0.04, -S * 0.1, S * 0.5, S * 0.22, 0, 0, TAU); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.ellipse(S * 0.02, S * 0.06, S * 0.36, S * 0.07, 0, 0, TAU); g.fillStyle = col.d; g.fill(); ol(g, S, 0.03);
      g.beginPath(); g.moveTo(S * 0.02, -S * 0.31); g.quadraticCurveTo(S * 0.05, -S * 0.4, S * 0.1, -S * 0.39); g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
      shine(g, -S * 0.18, -S * 0.18, S * 0.1, S * 0.04, -0.2, 0.4);
      g.restore();
    },
  },
];

// --- face ----------------------------------------------------------------
const FACE = [
  { name: 'None' },
  {
    name: 'Glasses', color: 2,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        g.beginPath(); g.arc(sx * S * 0.22, -S * 0.04, S * 0.16, 0, TAU);
        g.fillStyle = 'rgba(200,240,255,0.35)'; g.fill();
        g.lineWidth = S * 0.075; g.strokeStyle = NAVY; g.stroke();
        g.lineWidth = S * 0.045; g.strokeStyle = fillOf(g, col, S); g.stroke();
        shine(g, sx * S * 0.22 - S * 0.06, -S * 0.1, S * 0.04, S * 0.02, -0.6, 0.8);
      }
      g.beginPath(); g.moveTo(-S * 0.07, -S * 0.07); g.quadraticCurveTo(0, -S * 0.13, S * 0.07, -S * 0.07);
      g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
    },
  },
  {
    name: 'Heart Shades', color: 0,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        heartPath(g, sx * S * 0.22, -S * 0.0, S * 0.36);
        g.fillStyle = fillOf(g, col, S); g.fill();
        g.save(); g.clip(); g.fillStyle = 'rgba(36,22,63,0.35)'; g.fillRect(sx * S * 0.22 - S * 0.3, S * 0.0, S * 0.6, S * 0.3); g.restore();
        heartPath(g, sx * S * 0.22, -S * 0.0, S * 0.36); ol(g, S, 0.05);
        shine(g, sx * S * 0.22 - S * 0.08, -S * 0.1, S * 0.045, S * 0.022, -0.6, 0.9);
      }
      g.beginPath(); g.moveTo(-S * 0.06, -S * 0.08); g.lineTo(S * 0.06, -S * 0.08); g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
    },
  },
  {
    name: 'Star Stickers', color: 1,
    draw(g, S, col, t) {
      for (const [x, y, r, rot] of [[S * 0.3, S * 0.2, S * 0.1, 0.3], [-S * 0.33, S * 0.17, S * 0.075, -0.2], [-S * 0.2, S * 0.3, S * 0.045, 0.6]]) {
        starAt(g, x, y, r, rot); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S, 0.025);
      }
      g.save(); g.translate(S * 0.42, S * 0.05); g.globalAlpha = (Math.sin(t * 4) + 1) / 2; drawSparkleShape(g, S * 0.14, '#fff'); g.restore();
    },
  },
  {
    name: 'Rosy Blush', color: 0,
    draw(g, S, col) {
      g.save(); g.globalAlpha *= 0.6;
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(sx * S * 0.28, S * 0.2, S * 0.12, S * 0.075, 0, 0, TAU); g.fillStyle = fillOf(g, col, S); g.fill();
      }
      g.restore();
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        g.beginPath(); g.moveTo(sx * S * (0.22 + k * 0.05), S * 0.17); g.lineTo(sx * S * (0.2 + k * 0.05), S * 0.23);
        g.lineWidth = S * 0.015; g.strokeStyle = 'rgba(200,40,100,0.6)'; g.stroke();
      }
      heartPath(g, S * 0.36, S * 0.02, S * 0.1); g.fillStyle = '#ff4d8b'; g.fill(); ol(g, S, 0.015);
    },
  },
  {
    name: 'Star Glasses', color: 1,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        starAt(g, sx * S * 0.22, -S * 0.03, S * 0.2, 0, 0.55);
        g.fillStyle = 'rgba(200,240,255,0.35)'; g.fill();
        g.lineWidth = S * 0.07; g.strokeStyle = NAVY; g.stroke();
        g.lineWidth = S * 0.04; g.strokeStyle = fillOf(g, col, S); g.stroke();
        shine(g, sx * S * 0.22 - S * 0.05, -S * 0.08, S * 0.035, S * 0.018, -0.6, 0.8);
      }
      g.beginPath(); g.moveTo(-S * 0.06, -S * 0.07); g.lineTo(S * 0.06, -S * 0.07); g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
    },
  },
  {
    name: 'Sunglasses', color: 2,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * S * 0.06, -S * 0.15); g.lineTo(sx * S * 0.4, -S * 0.15); g.quadraticCurveTo(sx * S * 0.4, S * 0.12, sx * S * 0.24, S * 0.1);
        g.quadraticCurveTo(sx * S * 0.07, S * 0.1, sx * S * 0.06, -S * 0.15); g.closePath();
        g.fillStyle = '#2f2545'; g.fill();
        g.lineWidth = S * 0.06; g.strokeStyle = NAVY; g.stroke();
        g.lineWidth = S * 0.035; g.strokeStyle = fillOf(g, col, S); g.stroke();
        shine(g, sx * S * 0.2 - S * 0.04, -S * 0.07, S * 0.05, S * 0.022, -0.5, 0.6);
      }
      g.beginPath(); g.moveTo(-S * 0.07, -S * 0.12); g.lineTo(S * 0.07, -S * 0.12); g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
    },
  },
];

// --- neck ----------------------------------------------------------------
const NECK = [
  { name: 'None' },
  {
    name: 'Pearls', color: 6,
    draw(g, S, col) {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1;
        const x = u * S * 0.36, y = -S * 0.05 + (1 - u * u) * S * 0.2;
        const r = i === 5 ? S * 0.07 : S * 0.048;
        g.beginPath(); g.arc(x, y, r, 0, TAU);
        g.fillStyle = col.rainbow ? RAINBOW[i % 7] : col.c; g.fill(); ol(g, S, 0.018);
        shine(g, x - r * 0.3, y - r * 0.35, r * 0.3, r * 0.18, -0.6, 0.9);
      }
    },
  },
  {
    name: 'Bowtie', color: 5,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(0, S * 0.04); g.lineTo(sx * S * 0.3, -S * 0.1); g.quadraticCurveTo(sx * S * 0.36, S * 0.06, sx * S * 0.3, S * 0.2); g.closePath();
        g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
        g.fillStyle = 'rgba(255,255,255,0.75)';
        for (const [px, py] of [[0.18, 0.0], [0.24, 0.1], [0.14, 0.11]]) { g.beginPath(); g.arc(sx * S * px, S * py, S * 0.022, 0, TAU); g.fill(); }
      }
      g.beginPath(); g.ellipse(0, S * 0.04, S * 0.07, S * 0.08, 0, 0, TAU); g.fillStyle = col.d; g.fill(); ol(g, S);
    },
  },
  {
    name: 'Cozy Scarf', color: 3,
    draw(g, S, col) {
      g.beginPath(); g.moveTo(S * 0.1, S * 0.04); g.lineTo(S * 0.26, S * 0.46); g.lineTo(S * 0.1, S * 0.48); g.lineTo(S * 0.0, S * 0.06); g.closePath();
      g.fillStyle = col.d; g.fill(); ol(g, S);
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(S * (0.11 + k * 0.04), S * 0.47); g.lineTo(S * (0.11 + k * 0.04), S * 0.55); g.lineWidth = S * 0.02; g.strokeStyle = col.d; g.stroke(); }
      const r = 0.1;
      g.beginPath(); g.moveTo(-S * 0.38, -S * 0.06); g.quadraticCurveTo(0, S * 0.08, S * 0.38, -S * 0.06);
      g.lineTo(S * 0.36, S * 0.1); g.quadraticCurveTo(0, S * 0.26, -S * 0.36, S * 0.1); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.save(); g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = S * 0.035;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * S * r * 1.1, -S * 0.1); g.lineTo(k * S * r * 1.1 + S * 0.05, S * 0.3); g.stroke(); }
      g.restore();
    },
  },
  {
    name: 'Heart Locket', color: 0,
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(-S * 0.32, -S * 0.08); g.quadraticCurveTo(0, S * 0.3, S * 0.32, -S * 0.08);
      g.lineWidth = S * 0.035; g.strokeStyle = '#d9a300'; g.stroke();
      g.save(); g.translate(0, S * 0.25); g.rotate(Math.sin(t * 2.2) * 0.12);
      heartPath(g, 0, S * 0.04, S * 0.26); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.035);
      heartPath(g, 0, S * 0.045, S * 0.18); g.fillStyle = fillOf(g, col, S * 0.3); g.fill();
      shine(g, -S * 0.04, -S * 0.02, S * 0.03, S * 0.018);
      g.restore();
    },
  },
  {
    name: 'Flower Lei', color: 0,
    draw(g, S, col) {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1;
        const x = u * S * 0.4, y = -S * 0.06 + (1 - u * u) * S * 0.3;
        const c = col.rainbow ? RAINBOW[i % 7] : [col.c, '#fff4fb', '#ffd23f'][i % 3];
        flower(g, x, y, S * 0.075, c, i % 3 === 2 ? '#ff7ac6' : '#ffd23f', S);
      }
    },
  },
];

// --- back (drawn behind the character) -------------------------------------
const BACK = [
  { name: 'None' },
  {
    name: 'Fairy Wings', color: 3,
    draw(g, S, col, t) {
      const flap = Math.sin(t * 9) * 0.14;
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx, 1); g.rotate(-flap);
        g.globalAlpha *= 0.78;
        const fill = col.rainbow ? fillOf(g, col, S * 0.6) : col.c;
        g.beginPath(); g.ellipse(S * 0.2, -S * 0.12, S * 0.22, S * 0.12, -0.55, 0, TAU); g.fillStyle = fill; g.fill(); ol(g, S, 0.012);
        g.beginPath(); g.ellipse(S * 0.15, S * 0.1, S * 0.14, S * 0.08, 0.55, 0, TAU); g.fillStyle = fill; g.fill(); ol(g, S, 0.012);
        g.globalAlpha = 0.8; g.strokeStyle = '#fff'; g.lineWidth = S * 0.008;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(S * 0.2, -S * 0.1, S * 0.36, -S * 0.22); g.moveTo(0, 0); g.quadraticCurveTo(S * 0.15, S * 0.06, S * 0.24, S * 0.15); g.stroke();
        g.fillStyle = '#fff';
        for (const [x, y] of [[0.3, -0.18], [0.12, -0.04], [0.2, 0.12]]) { g.beginPath(); g.arc(S * x, S * y, S * 0.012, 0, TAU); g.fill(); }
        g.restore();
      }
    },
  },
  {
    name: 'Royal Cape', color: 5,
    draw(g, S, col, t) {
      const sway = Math.sin(t * 2) * S * 0.02;
      g.beginPath(); g.moveTo(-S * 0.14, -S * 0.02); g.lineTo(S * 0.14, -S * 0.02);
      g.lineTo(S * 0.32 + sway, S * 0.56);
      for (let k = 0; k < 4; k++) {
        const x0 = S * 0.32 - (k + 0.5) * S * 0.16 + sway, x1 = S * 0.32 - (k + 1) * S * 0.16 + sway;
        g.quadraticCurveTo(x0, S * 0.62, x1, S * 0.56);
      }
      g.closePath();
      const gr = g.createLinearGradient(0, 0, 0, S * 0.6);
      if (col.rainbow) RAINBOW.forEach((c, i) => gr.addColorStop(i / 6, c)); else { gr.addColorStop(0, col.c); gr.addColorStop(1, col.d); }
      g.fillStyle = gr; g.fill(); ol(g, S, 0.012);
      g.beginPath(); g.moveTo(-S * 0.32 + sway, S * 0.55); g.quadraticCurveTo(0, S * 0.6, S * 0.32 + sway, S * 0.55);
      g.lineWidth = S * 0.025; g.strokeStyle = '#fff4fb'; g.stroke();
      g.fillStyle = '#24163f';
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-S * 0.24 + k * S * 0.12 + sway, S * 0.55, S * 0.008, 0, TAU); g.fill(); }
    },
  },
  {
    name: 'Butterfly Wings', color: 2,
    draw(g, S, col, t) {
      const k = 0.82 + 0.18 * Math.cos(t * 5);
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx * k, 1);
        const fill = col.rainbow ? fillOf(g, col, S * 0.7) : col.c;
        g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(S * 0.18, -S * 0.36, S * 0.48, -S * 0.26, S * 0.38, -S * 0.02); g.lineTo(0, S * 0.02); g.closePath();
        g.fillStyle = fill; g.fill(); ol(g, S, 0.012);
        g.beginPath(); g.moveTo(0, S * 0.02); g.bezierCurveTo(S * 0.32, S * 0.02, S * 0.34, S * 0.3, S * 0.12, S * 0.28); g.closePath();
        g.fillStyle = col.rainbow ? fill : col.d; g.fill(); ol(g, S, 0.012);
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [x, y, r] of [[0.28, -0.14, 0.04], [0.18, -0.2, 0.025], [0.17, 0.14, 0.03], [0.33, -0.05, 0.02]]) { g.beginPath(); g.arc(S * x, S * y, S * r, 0, TAU); g.fill(); }
        g.restore();
      }
    },
  },
  {
    name: 'Angel Wings', color: 6,
    draw(g, S, col, t) {
      const flap = Math.sin(t * 3) * 0.08;
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx, 1); g.translate(S * 0.04, 0); g.rotate(-flap);
        for (let k = 5; k >= 0; k--) {
          const a = -0.95 + k * 0.27, len = S * (0.34 - k * 0.03);
          g.save(); g.rotate(a);
          g.beginPath(); g.ellipse(len * 0.55, 0, len * 0.55, S * 0.055, 0, 0, TAU);
          g.fillStyle = col.rainbow ? RAINBOW[k] : (k % 2 ? col.l : col.c); g.fill(); ol(g, S, 0.01);
          g.restore();
        }
        g.beginPath(); g.ellipse(S * 0.06, -S * 0.04, S * 0.08, S * 0.06, 0, 0, TAU); g.fillStyle = col.rainbow ? '#fff' : col.c; g.fill(); ol(g, S, 0.01);
        g.restore();
      }
    },
  },
];

// --- hand ----------------------------------------------------------------
const HAND = [
  { name: 'None' },
  {
    name: 'Magic Wand', color: 1, icon: [1.35, 0.42],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(0, S * 0.03); g.lineTo(S * 0.035, -S * 0.22);
      g.lineWidth = S * 0.032; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.018; g.strokeStyle = '#fff4fb'; g.stroke();
      starAt(g, S * 0.04, -S * 0.27, S * 0.075, Math.sin(t * 3) * 0.2);
      g.fillStyle = fillOf(g, col, S * 0.15); g.fill(); ol(g, S, 0.012);
      for (let i = 0; i < 3; i++) {
        const a = t * 2.5 + i * 2.1;
        g.save(); g.translate(S * 0.04 + Math.cos(a) * S * 0.11, -S * 0.27 + Math.sin(a) * S * 0.08);
        g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + i); drawSparkleShape(g, S * 0.05, i % 2 ? '#fff6a8' : '#fff'); g.restore();
      }
    },
  },
  {
    name: 'Bouquet', color: 0, icon: [1.4, 0.2],
    draw(g, S, col) {
      for (const [x, y, a] of [[-0.06, -0.13, -0.5], [0.07, -0.12, 0.5], [0.0, -0.17, 0]]) {
        g.save(); g.translate(S * x, S * y); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, S * 0.025, S * 0.05, 0, 0, TAU); g.fillStyle = '#5ccf7a'; g.fill(); ol(g, S, 0.008); g.restore();
      }
      const cs = col.rainbow ? RAINBOW : [col.c, '#fff4fb', '#ffd23f', col.l, '#ff7ac6'];
      [[-0.045, -0.15], [0.045, -0.15], [0, -0.19], [-0.02, -0.12], [0.03, -0.11]].forEach(([x, y], i) => flower(g, S * x, S * y, S * 0.032, cs[i % cs.length], '#ffd23f', S * 0.3));
      g.beginPath(); g.moveTo(-S * 0.07, -S * 0.11); g.lineTo(S * 0.07, -S * 0.11); g.lineTo(S * 0.012, S * 0.05); g.lineTo(-S * 0.012, S * 0.05); g.closePath();
      g.fillStyle = '#fff4fb'; g.fill(); ol(g, S, 0.012);
      g.beginPath(); g.ellipse(0, -S * 0.03, S * 0.03, S * 0.015, 0, 0, TAU); g.fillStyle = fillOf(g, col, S * 0.1); g.fill(); ol(g, S, 0.008);
    },
  },
  {
    name: 'Microphone', color: 2, icon: [1.6, 0.12],
    draw(g, S, col) {
      g.save(); g.rotate(0.25);
      g.beginPath(); g.moveTo(-S * 0.022, -S * 0.08); g.lineTo(S * 0.022, -S * 0.08); g.lineTo(S * 0.014, S * 0.06); g.lineTo(-S * 0.014, S * 0.06); g.closePath();
      g.fillStyle = fillOf(g, col, S * 0.1); g.fill(); ol(g, S, 0.01);
      g.beginPath(); g.arc(0, -S * 0.115, S * 0.045, 0, TAU); g.fillStyle = '#d8d8ea'; g.fill(); ol(g, S, 0.01);
      g.save(); g.clip(); g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = S * 0.005;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * S * 0.014, -S * 0.17); g.lineTo(k * S * 0.014, -S * 0.06); g.stroke(); g.beginPath(); g.moveTo(-S * 0.06, -S * 0.115 + k * S * 0.014); g.lineTo(S * 0.06, -S * 0.115 + k * S * 0.014); g.stroke(); }
      g.restore();
      g.beginPath(); g.rect(-S * 0.03, -S * 0.08, S * 0.06, S * 0.014); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.006);
      g.restore();
    },
  },
  {
    name: 'Balloon', color: 5, icon: [0.85, 0.32],
    draw(g, S, col, t) {
      const bx = S * 0.04 + Math.sin(t * 1.8) * S * 0.025, by = -S * 0.62;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(S * 0.08, -S * 0.28, bx, by + S * 0.13);
      g.lineWidth = Math.max(1, S * 0.006); g.strokeStyle = NAVY; g.stroke();
      g.save(); g.translate(bx, by); g.rotate(Math.sin(t * 1.8) * 0.08);
      heartPath(g, 0, 0, S * 0.26); g.fillStyle = fillOf(g, col, S * 0.26, true); g.fill(); ol(g, S, 0.01);
      g.beginPath(); g.moveTo(0, S * 0.1); g.lineTo(S * 0.02, S * 0.13); g.lineTo(-S * 0.02, S * 0.13); g.closePath(); g.fillStyle = col.d; g.fill();
      shine(g, -S * 0.06, -S * 0.06, S * 0.02, S * 0.035, 0.5);
      g.restore();
    },
  },
  {
    name: 'Parasol', color: 0, icon: [1.0, 0.3],
    draw(g, S, col) {
      g.beginPath(); g.moveTo(0, -S * 0.42); g.lineTo(0, S * 0.04); g.arc(-S * 0.025, S * 0.04, S * 0.025, 0, Math.PI);
      g.lineWidth = S * 0.018; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.009; g.strokeStyle = '#d9a300'; g.stroke();
      const cy = -S * 0.42, rw = S * 0.28;
      g.beginPath(); g.moveTo(-rw, cy + S * 0.02); g.quadraticCurveTo(0, cy - S * 0.36, rw, cy + S * 0.02);
      for (let k = 0; k < 5; k++) { const x0 = rw - (k + 0.5) * (2 * rw / 5), x1 = rw - (k + 1) * (2 * rw / 5); g.quadraticCurveTo(x0, cy - S * 0.04, x1, cy + S * 0.02); }
      g.closePath();
      g.fillStyle = fillOf(g, col, S * 0.5); g.fill();
      g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let k = -2; k <= 2; k += 2) { g.beginPath(); g.moveTo(0, cy - S * 0.2); g.lineTo(k * rw / 5 - rw / 5, cy + S * 0.05); g.lineTo(k * rw / 5 + rw / 5, cy + S * 0.05); g.closePath(); g.fill(); }
      g.restore();
      g.beginPath(); g.moveTo(-rw, cy + S * 0.02); g.quadraticCurveTo(0, cy - S * 0.36, rw, cy + S * 0.02);
      for (let k = 0; k < 5; k++) { const x0 = rw - (k + 0.5) * (2 * rw / 5), x1 = rw - (k + 1) * (2 * rw / 5); g.quadraticCurveTo(x0, cy - S * 0.04, x1, cy + S * 0.02); }
      g.closePath(); ol(g, S, 0.01);
      g.beginPath(); g.arc(0, cy - S * 0.17, S * 0.018, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.006);
    },
  },
];

// --- aura (behind + in front) ---------------------------------------------
function glow(g, S, color, a = 0.38) {
  const gr = g.createRadialGradient(0, 0, S * 0.05, 0, 0, S * 0.62);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.save(); g.globalAlpha *= a; g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, S * 0.5, S * 0.62, 0, 0, TAU); g.fill(); g.restore();
}
const AURA = [
  { name: 'None' },
  {
    name: 'Glitter', color: 1,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#ffe0f4' : col.c, 0.3); },
    draw(g, S, col, t) {
      for (let i = 0; i < 12; i++) {
        const a = t * 0.55 + (i * TAU) / 12, r = S * (0.36 + 0.07 * Math.sin(t * 2 + i));
        const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
        g.save(); g.translate(Math.cos(a) * r * 0.75, Math.sin(a) * r); g.globalAlpha *= 0.3 + tw * 0.7;
        drawSparkleShape(g, S * (0.04 + 0.03 * tw), i % 2 ? (col.rainbow ? RAINBOW[i % 7] : col.c) : '#ffffff'); g.restore();
      }
    },
  },
  {
    name: 'Hearts', color: 0,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#ffd0e8' : col.c, 0.28); },
    draw(g, S, col, t) {
      for (let i = 0; i < 7; i++) {
        const u = (t * 0.32 + i / 7) % 1;
        const x = Math.sin(i * 2.3 + t * 1.2) * S * 0.38, y = S * 0.42 - u * S * 0.95;
        g.save(); g.globalAlpha *= Math.sin(u * Math.PI);
        heartPath(g, x, y, S * (0.05 + (i % 3) * 0.012)); g.fillStyle = col.rainbow ? RAINBOW[i % 7] : (i % 2 ? col.c : col.l); g.fill(); ol(g, S, 0.006);
        g.restore();
      }
    },
  },
  {
    name: 'Bubbles', color: 3,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#d0f0ff' : col.l, 0.3); },
    draw(g, S, col, t) {
      for (let i = 0; i < 9; i++) {
        const u = (t * 0.25 + i / 9) % 1;
        const x = Math.sin(i * 1.9 + t * 1.6) * S * 0.36 + (i % 2 ? 1 : -1) * S * 0.08, y = S * 0.45 - u * S * 1.0;
        const r = S * (0.022 + (i % 3) * 0.012);
        g.save(); g.globalAlpha *= Math.min(1, Math.sin(u * Math.PI) * 1.6);
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = 'rgba(200,240,255,0.25)'; g.fill();
        g.lineWidth = Math.max(1, S * 0.006); g.strokeStyle = col.rainbow ? RAINBOW[i % 7] : col.c; g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, TAU); g.fill();
        g.restore();
      }
    },
  },
  {
    name: 'Rainbow', color: 7,
    behind(g, S, col, t) {
      const cs = col.rainbow ? RAINBOW.slice(0, 6) : [col.d, col.c, col.l, '#fff', col.l, col.c];
      g.save(); g.globalAlpha *= 0.85;
      cs.forEach((c, k) => {
        g.beginPath(); g.arc(0, S * 0.2, S * (0.56 - k * 0.04), Math.PI, TAU);
        g.lineWidth = S * 0.042; g.strokeStyle = c; g.stroke();
      });
      g.restore();
      for (const sx of [-1, 1]) {
        g.save(); g.translate(sx * S * 0.46, S * 0.2); g.fillStyle = '#fff';
        g.beginPath(); g.arc(-S * 0.06, 0, S * 0.06, 0, TAU); g.arc(S * 0.02, -S * 0.03, S * 0.075, 0, TAU); g.arc(S * 0.09, 0, S * 0.05, 0, TAU); g.fill();
        g.restore();
      }
    },
    draw(g, S, col, t) {
      for (let i = 0; i < 4; i++) {
        const a = Math.PI + (i + 0.5) / 4 * Math.PI + Math.sin(t + i) * 0.1;
        g.save(); g.translate(Math.cos(a) * S * 0.62, S * 0.2 + Math.sin(a) * S * 0.62);
        g.globalAlpha *= 0.5 + 0.5 * Math.sin(t * 4 + i * 2); drawSparkleShape(g, S * 0.05, '#fff'); g.restore();
      }
    },
  },
];

export const CATS = [
  { id: 'head', name: 'Head', items: HEAD, tabItem: 1 },
  { id: 'face', name: 'Face', items: FACE, tabItem: 2 },
  { id: 'neck', name: 'Neck', items: NECK, tabItem: 1 },
  { id: 'back', name: 'Back', items: BACK, tabItem: 1 },
  { id: 'hand', name: 'Hand', items: HAND, tabItem: 1 },
  { id: 'aura', name: 'Aura', items: AURA, tabItem: 4 },
];
export const CAT = Object.fromEntries(CATS.map((c, i) => [c.id, i]));

/**
 * Draw an item as a little menu icon centered at (cx, cy) inside a `size` box.
 */
export function drawItemIcon(g, catIdx, itemIdx, colIdx, cx, cy, size, t) {
  const cat = CATS[catIdx], it = cat.items[itemIdx];
  const col = PALETTE[colIdx ?? it.color ?? 0];
  g.save(); g.translate(cx, cy);
  if (!it.draw) {
    g.setLineDash([size * 0.08, size * 0.07]);
    g.beginPath(); g.arc(0, 0, size * 0.3, 0, TAU); g.lineWidth = Math.max(2, size * 0.04); g.strokeStyle = 'rgba(36,22,63,0.4)'; g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.moveTo(-size * 0.12, -size * 0.12); g.lineTo(size * 0.12, size * 0.12); g.moveTo(size * 0.12, -size * 0.12); g.lineTo(-size * 0.12, size * 0.12);
    g.stroke(); g.restore(); return;
  }
  const [ks, dy] = it.icon || [1, 0];
  switch (cat.id) {
    case 'head': { const S = size * 0.78 * ks; g.translate(0, dy * size); it.draw(g, S, col, t); break; }
    case 'face': {
      const S = size * 0.82;
      g.beginPath(); g.arc(0, 0, S * 0.48, 0, TAU); g.fillStyle = '#ffe2c8'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.stroke();
      g.fillStyle = NAVY; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * S * 0.2, -S * 0.04, S * 0.05, 0, TAU); g.fill(); }
      g.beginPath(); g.arc(0, S * 0.12, S * 0.12, 0.2, Math.PI - 0.2); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
      it.draw(g, S, col, t); break;
    }
    case 'neck': { const S = size * 0.95; g.translate(0, -size * 0.12); it.draw(g, S, col, t); break; }
    case 'back': { const S = size * 1.25; g.translate(0, size * 0.02); it.draw(g, S, col, t); break; }
    case 'hand': { const S = size * 1.75 * ks; g.translate(0, dy * size); it.draw(g, S, col, t); break; }
    case 'aura': {
      const S = size * 1.25;
      g.translate(0, size * 0.04);
      it.behind && it.behind(g, S, col, t);
      it.draw(g, S, col, t); break;
    }
    default: break;
  }
  g.restore();
}
