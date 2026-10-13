// Comic grown-up reactions for the cheeky Molly games: the pranked grown-up is
// SHOCKED, SCOLDS or HUFFS (nose in the air) while the players laugh. A copy of
// this file lives in each cheeky game's own folder (muddy-mayhem, sneaky-dance,
// bed-bounce, prank-troll, opposite-ballet) so every game stays self-contained;
// keep the copies in sync. These are the code-drawn extras that sit on top of
// the character art (and stand in for reaction art that hasn't been drawn yet).
import { TAU, clamp, pick } from '../../engine/util.js';

const NAVY = '#24163f';
export const KINDS = ['shock', 'scold', 'huff'];
export const SAY = {
  shock: ['Well I never!', 'Oh my word!', 'Goodness me!', 'Gracious!'],
  scold: ['Tsk tsk!', 'Ahem!', 'How rude!', 'Really!'],
  huff: ['Hmph!', 'Harrumph!', 'Sniff!', 'Humph!'],
};

/** Picks the next reaction kind, never the same twice in a row. */
export function nextKind(prev, kinds = KINDS) {
  const pool = kinds.filter((k) => k !== prev);
  return pick(pool.length ? pool : kinds);
}

/** A line for this kind, not the same as the last one said (overall or for this kind). */
const lastSaid = new Map();
export function sayFor(kind, prev = null) {
  const list = SAY[kind] || SAY.shock;
  const pool = list.filter((s) => s !== prev && s !== lastSaid.get(kind));
  const s = pick(pool.length ? pool : list);
  lastSaid.set(kind, s);
  return s;
}

/** Shock lines bursting out round a head (k = 0..1 pop-in). */
export function drawShock(g, x, y, r, t, k = 1) {
  g.save(); g.translate(x, y); g.lineCap = 'round';
  const pulse = 1 + Math.sin(t * 22) * 0.08, s = clamp(k, 0, 1);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i + 0.5) * (Math.PI / 7);
    const r0 = r * pulse, r1 = r0 + r * (i % 2 ? 0.32 : 0.5) * s;
    for (const [c, w] of [[NAVY, 12], ['#ffe066', 6]]) {
      g.strokeStyle = c; g.lineWidth = w * (r / 90);
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
    }
  }
  g.restore();
}

/** Two little steam puffs rising either side of a head. */
export function drawSteam(g, x, y, r, t) {
  g.save();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const f = (t * 1.6 + i / 3 + (side > 0 ? 0.17 : 0)) % 1;
      const px = x + side * (r + f * r * 0.5), py = y - f * r * 0.9, pr = r * (0.12 + f * 0.16);
      g.globalAlpha = 0.9 * Math.sin(f * Math.PI);
      g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.03);
      g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill(); g.stroke();
    }
  }
  g.restore();
}

/** A white-gloved finger wagging "tsk tsk" (dir = which way it points/leans). */
export function drawWag(g, x, y, s, t, dir = 1) {
  g.save(); g.translate(x, y); g.scale(s * dir, s);
  g.rotate(Math.sin(t * 16) * 0.38);
  g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = NAVY; g.fillStyle = '#ffffff';
  // cuff
  g.fillStyle = '#ff9ccf'; g.beginPath(); g.ellipse(0, 22, 22, 9, 0, 0, TAU); g.fill(); g.stroke();
  // fist
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(0, 0, 22, 20, 0, 0, TAU); g.fill(); g.stroke();
  // pointing finger
  g.beginPath(); g.moveTo(-6, -10); g.lineTo(-7, -48); g.arc(1, -48, 8, Math.PI, 0); g.lineTo(9, -10); g.closePath(); g.fill(); g.stroke();
  // folded knuckles
  g.lineWidth = 3;
  for (const kx of [-10, 2]) { g.beginPath(); g.moveTo(kx + 14, -4); g.lineTo(kx + 14, 8); g.stroke(); }
  g.restore();
}

/** A spiky shout bubble with a word in it (k = pop-in). */
export function drawShout(g, text, x, y, size, t, k = 1) {
  g.save(); g.translate(x, y); const s = 0.6 + 0.4 * clamp(k, 0, 1); g.scale(s, s);
  g.font = `800 ${size}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  const w = g.measureText(text).width * 1.18 + size * 0.7, h = size * 1.7;
  g.beginPath();
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, off = i % 2 ? 0 : size * (0.3 + Math.sin(t * 9 + i) * 0.04);
    const px = Math.cos(a) * (w / 2 + off), py = Math.sin(a) * (h / 2 + off);
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round'; g.fill(); g.stroke();
  g.fillStyle = '#ff4d6d'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 0, 2);
  g.restore();
}
