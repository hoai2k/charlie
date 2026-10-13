// Whoopee Tea Party: procedural art (garden, tea tables, chairs, throne,
// whoopee cushions, the posh guests, Duchess Teddy, the penguin butler, the
// toy frog, the moon). Every piece first tries its generated art key
// (image-requests.md, "New Molly Party game: whoopee-tea").
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { TAU, clamp } from '../../engine/util.js';

export const NAVY = '#24163f';
const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// --- the guests -------------------------------------------------------------------
export const GUESTS = {
  poodle: { fur: '#ffb3d1', dark: '#e57fab', dress: '#ff7ac6', hat: '#ff5aa8', name: 'poodle' },
  bunny: { fur: '#ffffff', dark: '#d9d2e6', dress: '#c8a6ff', hat: '#f2cf7a', name: 'bunny' },
  pig: { fur: '#ffb0c0', dark: '#e98aa0', dress: '#ffd23f', hat: '#7fd0a0', name: 'pig' },
  kitty: { fur: '#f3eefa', dark: '#cfc6de', dress: '#7fe0c8', hat: '#5fa8ff', name: 'kitty' },
  duchess: { fur: '#d9a05b', dark: '#b07a3a', dress: '#b98bff', hat: '#c8a6ff', name: 'duchess' },
};
export const GUEST_KINDS = ['poodle', 'bunny', 'pig', 'kitty'];

/**
 * A guest at (x, y) = feet (standing) or the seat (sitting). h = drawn height.
 * state: 'walk' | 'sit' | 'gasp' | 'laugh'. o: { t, step (walk phase), facing, hat, monocle }.
 */
export function drawGuest(g, kind, x, y, h, state, o = {}) {
  const t = o.t || 0, C = GUESTS[kind];
  const duchess = kind === 'duchess';
  const sitting = state !== 'walk';
  const key = (duchess ? 'prop/whoopee-duchess' : 'prop/whoopee-guest-' + kind) + (state === 'walk' ? '' : '-' + state);
  g.save(); g.translate(x, y);
  if (state === 'laugh') g.rotate(Math.sin(t * 14) * 0.12);
  if (art(key)) {
    g.scale(o.facing || 1, 1);
    const bob = state === 'walk' ? -Math.abs(Math.sin(o.step || 0)) * h * 0.04 : 0;
    drawArt(g, key, 0, bob, h * (duchess ? 360 / 460 : 320 / 420), h, { anchor: 'bottom' });
    g.restore();
    if (o.hat) drawHatOn(g, kind, x, y, h, state, o);
    return;
  }
  const s = h / 200;
  g.scale(s * (o.facing || 1), s);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
  const step = o.step || 0;
  const bob = state === 'walk' ? -Math.abs(Math.sin(step)) * 8 : state === 'gasp' ? -10 : 0;
  g.translate(0, bob);
  // legs
  if (!sitting) {
    for (const side of [-1, 1]) {
      const sw = Math.sin(step + (side > 0 ? Math.PI : 0)) * 8;
      g.fillStyle = C.fur;
      g.beginPath(); g.ellipse(side * 16 + sw, -14, 11, 18, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = C.dark; g.beginPath(); g.ellipse(side * 16 + sw + side * 2, -2, 13, 7, 0, 0, TAU); g.fill(); g.stroke();
    }
  } else {
    // legs dangling over the seat edge
    for (const side of [-1, 1]) {
      const kick = state === 'laugh' ? Math.sin(t * 16 + side) * 10 : state === 'gasp' ? -16 : 0;
      g.fillStyle = C.fur;
      g.beginPath(); g.ellipse(side * 16, 22 + kick * 0.3, 11, 18, side * 0.15, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = C.dark; g.beginPath(); g.ellipse(side * 18, 38 + kick * 0.5, 12, 7, 0, 0, TAU); g.fill(); g.stroke();
    }
  }
  // dress / body
  const top = sitting ? -86 : -112, hem = sitting ? 6 : (duchess ? -4 : -26), hemW = duchess ? 70 : 54;
  g.fillStyle = C.dress;
  g.beginPath(); g.moveTo(-26, top); g.quadraticCurveTo(-34, top + 40, -hemW, hem);
  for (let i = 0; i <= 8; i++) { const u = i / 8; g.lineTo(-hemW + u * hemW * 2, hem + (i % 2 ? 7 : 0)); }
  g.quadraticCurveTo(34, top + 40, 26, top); g.closePath(); g.fill(); g.stroke();
  // frill
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath(); g.ellipse(0, hem - 4, hemW * 0.92, 6, 0, 0, Math.PI); g.fill();
  // arms
  const arm = (side) => {
    if (state === 'gasp') return [[side * 24, top + 10], [side * 50, top - 20], [side * 46, top - 46]];
    if (state === 'laugh') return [[side * 24, top + 10], [side * 40, top + 40], [side * 10, top + 50]];
    if (state === 'sit') return side > 0 ? [[24, top + 10], [44, top + 30], [26, top + 6]] : [[-24, top + 10], [-38, top + 40], [-20, top + 52]];
    return [[side * 24, top + 10], [side * 40, top + 34 + Math.sin(step + side) * 6], [side * 36, top + 56]];
  };
  for (const side of [-1, 1]) {
    const [a, b, c] = arm(side);
    g.strokeStyle = NAVY; g.lineWidth = 15; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...b, ...c); g.stroke();
    g.strokeStyle = C.fur; g.lineWidth = 9; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...b, ...c); g.stroke();
    // teacup with pinkie out while sitting
    if (state === 'sit' && side > 0) {
      g.fillStyle = '#fff'; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.moveTo(c[0] - 12, c[1] - 12); g.lineTo(c[0] + 12, c[1] - 12); g.lineTo(c[0] + 8, c[1] + 4); g.lineTo(c[0] - 8, c[1] + 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff9fcf'; g.beginPath(); g.arc(c[0], c[1] - 4, 3, 0, TAU); g.fill();
    }
  }
  g.strokeStyle = NAVY; g.lineWidth = 4;
  // collar / pearls / bow
  if (kind === 'bunny') {
    g.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 11, top + 2, 7, 0, Math.PI); g.fill(); g.stroke(); }
  } else if (kind === 'kitty') {
    g.fillStyle = '#5fa8ff';
    g.beginPath(); g.moveTo(0, top + 2); g.lineTo(-22, top - 10); g.lineTo(-22, top + 14); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, top + 2); g.lineTo(22, top - 10); g.lineTo(22, top + 14); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, top + 2, 6, 0, TAU); g.fill(); g.stroke();
  } else {
    // pearls
    const n = duchess ? 11 : 7, drop = duchess ? 40 : 14;
    g.fillStyle = '#fffaf2'; g.lineWidth = 2;
    for (let i = 0; i < n; i++) { const u = i / (n - 1), px = (u - 0.5) * 44, py = top + 4 + Math.sin(u * Math.PI) * drop; g.beginPath(); g.arc(px, py, 4.5, 0, TAU); g.fill(); g.stroke(); }
    g.lineWidth = 4;
  }
  // head
  const hy = top - 34, hr = duchess ? 40 : 36;
  drawHeadFeatures(g, kind, C, hy, hr, state, t, false);
  g.fillStyle = C.fur; g.beginPath(); g.arc(0, hy, hr, 0, TAU); g.fill(); g.stroke();
  drawHeadFeatures(g, kind, C, hy, hr, state, t, true);
  drawFace(g, kind, C, hy, hr, state, t, o);
  // fur standing on end when they gasp
  if (state === 'gasp') {
    g.strokeStyle = NAVY; g.lineWidth = 4;
    for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * 0.35; g.beginPath(); g.moveTo(Math.cos(a) * (hr + 4), hy + Math.sin(a) * (hr + 4)); g.lineTo(Math.cos(a) * (hr + 24), hy + Math.sin(a) * (hr + 24)); g.stroke(); }
  }
  g.restore();
  if (o.hat) drawHatOn(g, kind, x, y, h, state, o);
}

/** Head-top y (screen) of a guest drawn by drawGuest, for hats and bubbles. */
export function guestHeadTop(kind, y, h, state) {
  const key = (kind === 'duchess' ? 'prop/whoopee-duchess' : 'prop/whoopee-guest-' + kind) + (state === 'walk' ? '' : '-' + state);
  // Authored guests occupy the same full-height box in every state.
  if (art(key)) return y - h * 0.91;
  const s = h / 200, sitting = state !== 'walk';
  const top = sitting ? -86 : -112, hr = kind === 'duchess' ? 40 : 36;
  return y + (top - 34 - hr + (state === 'gasp' ? -10 : 0)) * s;
}

function drawHatOn(g, kind, x, y, h, state, o) {
  const ty = guestHeadTop(kind, y, h, state);
  const rot = state === 'laugh' ? Math.sin((o.t || 0) * 14) * 0.12 : 0;
  const w = (kind === 'duchess' ? 130 : 78) * h / 200;
  const key = kind === 'duchess' ? 'prop/whoopee-duchess-hat' : 'prop/whoopee-hat-' + kind;
  const hatOffset = art(key) ? -w * 0.18 : w * 0.18;
  drawHat(g, kind, x + (kind === 'duchess' ? 0 : 6 * (o.facing || 1)) * h / 200, ty + hatOffset, w, rot - 0.08 * (o.facing || 1));
}

function drawHeadFeatures(g, kind, C, hy, hr, state, t, front) {
  g.strokeStyle = NAVY; g.lineWidth = 4;
  if (kind === 'bunny' && !front) {
    for (const side of [-1, 1]) {
      const flop = state === 'gasp' ? 0 : state === 'laugh' ? Math.sin(t * 12 + side) * 0.3 : side * 0.12;
      g.save(); g.translate(side * 16, hy - hr + 8); g.rotate(side * 0.18 + flop);
      g.fillStyle = C.fur; g.beginPath(); g.ellipse(0, -36, 13, 40, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ffc4dc'; g.beginPath(); g.ellipse(0, -34, 6, 28, 0, 0, TAU); g.fill();
      g.restore();
    }
  }
  if (kind === 'poodle') {
    if (!front) { g.fillStyle = C.fur; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 14, hy - hr + 2 - (2 - Math.abs(i)) * 6, 17, 0, TAU); g.fill(); g.stroke(); } }
    else { g.fillStyle = C.fur; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * (hr + 4), hy + 8, 14, 24, 0, 0, TAU); g.fill(); g.stroke(); } }
  }
  if ((kind === 'pig' || kind === 'kitty') && !front) {
    g.fillStyle = C.fur;
    for (const side of [-1, 1]) {
      g.beginPath(); g.moveTo(side * 12, hy - hr + 6); g.lineTo(side * 34, hy - hr - 18); g.lineTo(side * 34, hy - hr + 16); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = kind === 'pig' ? C.dark : '#ffc4dc'; g.beginPath(); g.moveTo(side * 20, hy - hr + 6); g.lineTo(side * 31, hy - hr - 8); g.lineTo(side * 31, hy - hr + 10); g.closePath(); g.fill();
      g.fillStyle = C.fur;
    }
  }
  if (kind === 'duchess' && !front) {
    g.fillStyle = C.fur;
    for (const side of [-1, 1]) { g.beginPath(); g.arc(side * 30, hy - hr + 8, 15, 0, TAU); g.fill(); g.stroke(); g.fillStyle = C.dark; g.beginPath(); g.arc(side * 30, hy - hr + 8, 7, 0, TAU); g.fill(); g.fillStyle = C.fur; }
  }
}

function drawFace(g, kind, C, hy, hr, state, t, o) {
  g.strokeStyle = NAVY; g.fillStyle = NAVY; g.lineWidth = 3.5;
  const ey = hy - 4;
  // eyes
  if (state === 'gasp') {
    for (const side of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(side * 13, ey, 10, 0, TAU); g.fill(); g.stroke(); g.fillStyle = NAVY; g.beginPath(); g.arc(side * 13, ey, 4, 0, TAU); g.fill(); }
  } else if (state === 'laugh') {
    for (const side of [-1, 1]) { g.beginPath(); g.moveTo(side * 6, ey - 4); g.lineTo(side * 18, ey); g.lineTo(side * 6, ey + 4); g.stroke(); }
    // tears of laughter
    g.fillStyle = '#9fdcff';
    for (const side of [-1, 1]) { const k = (t * 2 + (side > 0 ? 0.5 : 0)) % 1; g.beginPath(); g.ellipse(side * (24 + k * 10), ey + 6 + k * 24, 4, 6, 0, 0, TAU); g.fill(); }
  } else {
    // posh: eyes closed, nose in the air
    for (const side of [-1, 1]) { g.beginPath(); g.arc(side * 13, ey + 1, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.moveTo(side * 8, ey - 6); g.lineTo(side * 4, ey - 10); g.stroke(); }
  }
  // monocle (the Duchess)
  if (kind === 'duchess' && o.monocle !== false) {
    g.strokeStyle = '#ffd23f'; g.lineWidth = 3.5; g.fillStyle = 'rgba(200,240,255,0.35)';
    g.beginPath(); g.arc(13, ey, 13, 0, TAU); g.fill(); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(24, ey + 6); g.quadraticCurveTo(34, ey + 40, 20, ey + 62); g.stroke();
    g.strokeStyle = NAVY;
  }
  // cheeks
  g.fillStyle = state === 'gasp' ? '#ff6f8f' : '#ff9fb8'; g.globalAlpha = 0.7;
  g.beginPath(); g.arc(-22, hy + 10, 7, 0, TAU); g.arc(22, hy + 10, 7, 0, TAU); g.fill(); g.globalAlpha = 1;
  // nose / snout / muzzle
  g.strokeStyle = NAVY; g.lineWidth = 3.5;
  if (kind === 'pig') {
    g.fillStyle = C.dark; g.beginPath(); g.ellipse(0, hy + 10, 14, 10, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(-5, hy + 10, 2.5, 4, 0, 0, TAU); g.ellipse(5, hy + 10, 2.5, 4, 0, 0, TAU); g.fill();
  } else if (kind === 'duchess') {
    g.fillStyle = '#f2d2a6'; g.beginPath(); g.ellipse(0, hy + 12, 16, 12, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, hy + 6, 6, 4, 0, 0, TAU); g.fill();
  } else {
    g.fillStyle = kind === 'kitty' || kind === 'bunny' ? '#ff8fb0' : NAVY;
    g.beginPath(); g.ellipse(0, hy + 6, 5, 4, 0, 0, TAU); g.fill();
    if (kind === 'kitty') { g.lineWidth = 2; for (const side of [-1, 1]) for (const k of [-1, 1]) { g.beginPath(); g.moveTo(side * 12, hy + 10); g.lineTo(side * 32, hy + 8 + k * 5); g.stroke(); } g.lineWidth = 3.5; }
  }
  // mouth
  const my = hy + (kind === 'pig' || kind === 'duchess' ? 24 : 16);
  if (state === 'gasp') { g.fillStyle = '#c2405c'; g.beginPath(); g.ellipse(0, my + 2, 7, 9, 0, 0, TAU); g.fill(); g.stroke(); }
  else if (state === 'laugh') { g.fillStyle = '#c2405c'; g.beginPath(); g.arc(0, my - 2, 11, 0, Math.PI); g.closePath(); g.fill(); g.stroke(); }
  else { g.beginPath(); g.arc(0, my - 4, 6, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
}

/** A guest's hat on its own (on their head, or flying). (x, y) = hat centre. */
export function drawHat(g, kind, x, y, w, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const key = kind === 'duchess' ? 'prop/whoopee-duchess-hat' : 'prop/whoopee-hat-' + kind;
  if (drawArt(g, key, 0, 0, w, w * (kind === 'duchess' ? 0.62 : 0.75))) { g.restore(); return; }
  const C = GUESTS[kind];
  g.scale(w / 100, w / 100);
  g.strokeStyle = NAVY; g.lineWidth = 4; g.lineJoin = 'round';
  if (kind === 'kitty') {
    g.fillStyle = C.hat; g.beginPath(); g.rect(-24, -24, 48, 28); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -24, 24, 7, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(18, -8, 7, 0, TAU); g.fill(); g.stroke();
  } else {
    const wide = kind === 'duchess' || kind === 'pig' ? 50 : kind === 'bunny' ? 44 : 32;
    g.fillStyle = C.hat;
    g.beginPath(); g.ellipse(0, 4, wide, 12, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-24, 4); g.quadraticCurveTo(-24, -34, 0, -34); g.quadraticCurveTo(24, -34, 24, 4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = kind === 'bunny' ? '#ff7ac6' : '#fff'; g.beginPath(); g.rect(-24, -8, 48, 9); g.fill(); g.stroke();
    if (kind === 'poodle' || kind === 'duchess') {
      // feather
      g.fillStyle = kind === 'duchess' ? '#ff7ac6' : '#fff6a8';
      g.beginPath(); g.moveTo(14, -30); g.quadraticCurveTo(46, -76, 30, -84); g.quadraticCurveTo(10, -60, 14, -30); g.fill(); g.stroke();
    }
    if (kind === 'pig' || kind === 'duchess') {
      for (let i = 0; i < (kind === 'duchess' ? 4 : 3); i++) {
        g.fillStyle = ['#ff5aa8', '#ffd23f', '#ff7ac6', '#fff'][i];
        g.beginPath(); g.arc(-18 + i * 12, -12 - (i % 2) * 8, 8, 0, TAU); g.fill(); g.stroke();
      }
    }
  }
  g.restore();
}

// --- furniture --------------------------------------------------------------------
/** Round garden tea table, (x, y) = its feet. jump 0..1 makes the cups hop, jelly 0..1 wobble. */
export function drawTable(g, x, y, t, jump = 0, jelly = 0, frog = null) {
  const hop = Math.sin(clamp(jump, 0, 1) * Math.PI) * 50;
  const tableArt = !!art('prop/whoopee-table');
  if (tableArt) {
    g.save(); g.translate(x, y - hop * 0.25); g.rotate(Math.sin(jump * 20) * jump * 0.025);
    drawArt(g, 'prop/whoopee-table', 0, 0, 230, 200, { anchor: 'bottom' }); g.restore();
  } else {
    g.save(); g.translate(x, y);
    g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
    // leg
    g.fillStyle = '#fff'; g.beginPath(); g.rect(-10, -110, 20, 106); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -4, 44, 10, 0, 0, TAU); g.fill(); g.stroke();
    // cloth
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-112, -124);
    g.quadraticCurveTo(-118, -84, -104, -70);
    for (let i = 0; i <= 10; i++) { const u = i / 10; g.lineTo(-104 + u * 208, -70 + (i % 2 ? 9 : 0)); }
    g.quadraticCurveTo(118, -84, 112, -124); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd6ea'; g.beginPath(); g.ellipse(0, -124, 112, 26, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,111,177,0.45)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, -124, 92, 18, 0, 0, TAU); g.stroke();
    g.restore();
  }
  // things on top (they hop when a cushion goes off)
  g.save(); g.translate(x, y - 124);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 3.5;
  // Authored table already includes its teapot and cups; bounce it as one piece.
  if (!tableArt) {
  // procedural teapot
  g.save(); g.translate(-46, -hop * 0.8); g.rotate(Math.sin(jump * 20) * 0.2 * jump);
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -18, 24, 20, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(22, -22); g.quadraticCurveTo(38, -26, 40, -40); g.stroke();
  g.beginPath(); g.arc(-26, -18, 9, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
  g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(0, -40, 6, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff9fcf'; g.beginPath(); g.arc(-6, -16, 5, 0, TAU); g.arc(8, -12, 4, 0, TAU); g.fill();
  g.restore();
  // cups
  for (const [cx, k] of [[10, 0.6], [44, 1]]) {
    g.save(); g.translate(cx, 6 - hop * k); g.rotate(Math.sin(jump * 18 + cx) * 0.4 * jump);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 2, 16, 5, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-11, -14); g.lineTo(11, -14); g.lineTo(8, 0); g.lineTo(-8, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#c98a4a'; g.beginPath(); g.ellipse(0, -14, 10, 3, 0, 0, TAU); g.fill();
    g.restore();
  }
  }
  // jelly
  {
    const wob = Math.sin(t * 9) * 0.04 + jelly * Math.sin(t * 24) * 0.25;
    g.save(); g.translate(72, -2 - hop * 0.5);
    if (!drawArt(g, 'prop/whoopee-jelly', 0, 0, 56 * (1 + wob), 56 * (1 - wob), { anchor: 'bottom' })) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, 22, 6, 0, 0, TAU); g.fill(); g.stroke();
      g.scale(1 + wob, 1 - wob);
      g.fillStyle = 'rgba(255,77,109,0.9)';
      g.beginPath(); g.moveTo(-16, 0); g.lineTo(-12, -30); g.quadraticCurveTo(0, -38, 12, -30); g.lineTo(16, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-6, -20, 3, 7, 0, 0, TAU); g.fill();
      g.fillStyle = '#d6203f'; g.beginPath(); g.arc(0, -38, 6, 0, TAU); g.fill(); g.stroke();
    }
    g.restore();
  }
  // sugar bowl (a frog may be hiding in it)
  {
    const pop = frog ? frog.pop : 0;
    g.save(); g.translate(-80, 4);
    if (!drawArt(g, 'prop/whoopee-sugarbowl', 0, -14, 52, 46)) {
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-18, -20); g.quadraticCurveTo(-20, 2, 0, 2); g.quadraticCurveTo(20, 2, 18, -20); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff9fcf'; g.beginPath(); g.arc(0, -10, 4, 0, TAU); g.fill();
    }
    // lid (jiggles when a frog is inside, flies when it springs)
    const jig = frog && frog.armed ? Math.sin(t * 30) * 2 : 0;
    g.translate(jig, -22 - pop * 60); g.rotate(pop * 2.5);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, 20, 6, 0, Math.PI, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(0, -6, 4, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
}

/** Garden chair, (x, y) = feet. seatY = y - 80. glow: colour ring for a reserved chair. */
export const CHAIR_SEAT = 80;
export function drawChairBack(g, x, y, facing = 1) {
  if (art('prop/whoopee-chair')) { g.save(); g.translate(x, y); g.scale(facing, 1); drawArt(g, 'prop/whoopee-chair', 0, 0, 140, 190, { anchor: 'bottom' }); g.restore(); return; }
  g.save(); g.translate(x, y); g.scale(facing, 1);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  // back legs + heart back
  g.strokeStyle = NAVY; g.lineWidth = 9;
  g.beginPath(); g.moveTo(-44, -80); g.lineTo(-46, -180); g.moveTo(44, -80); g.lineTo(46, -180); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(-44, -80); g.lineTo(-46, -180); g.moveTo(44, -80); g.lineTo(46, -180); g.stroke();
  heartPath(g, 0, -146, 34); g.strokeStyle = NAVY; g.lineWidth = 9; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
  g.strokeStyle = NAVY; g.lineWidth = 9; g.beginPath(); g.moveTo(-46, -180); g.quadraticCurveTo(0, -196, 46, -180); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
  g.restore();
}
export function drawChairFront(g, x, y, facing = 1) {
  if (art('prop/whoopee-chair')) return;
  g.save(); g.translate(x, y); g.scale(facing, 1);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // front legs
  g.strokeStyle = NAVY; g.lineWidth = 9;
  g.beginPath(); g.moveTo(-48, -76); g.lineTo(-52, -2); g.moveTo(48, -76); g.lineTo(52, -2); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
  // seat
  g.fillStyle = '#bfe6ff'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, -80, 56, 16, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-12, -84, 26, 6, 0, 0, TAU); g.fill();
  g.restore();
}

/** The Duchess's grand throne, (x, y) = feet; seat at y - 112. */
export const THRONE_SEAT = 112;
export function drawThrone(g, x, y, t) {
  if (drawArt(g, 'prop/whoopee-throne', x, y, 230, 280, { anchor: 'bottom' })) return;
  g.save(); g.translate(x, y);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  // back
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.moveTo(-96, -100); g.lineTo(-92, -236); g.quadraticCurveTo(0, -300, 92, -236); g.lineTo(96, -100); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ff5aa8';
  g.beginPath(); g.moveTo(-74, -110); g.lineTo(-72, -226); g.quadraticCurveTo(0, -276, 72, -226); g.lineTo(74, -110); g.closePath(); g.fill(); g.stroke();
  // buttons
  g.fillStyle = '#ffd23f'; for (const [bx, by] of [[-30, -200], [30, -200], [0, -170], [-30, -140], [30, -140]]) { g.beginPath(); g.arc(bx, by, 5, 0, TAU); g.fill(); }
  // crown on top
  g.fillStyle = '#ffd23f'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(-28, -268); g.lineTo(-30, -296); g.lineTo(-14, -282); g.lineTo(0, -304); g.lineTo(14, -282); g.lineTo(30, -296); g.lineTo(28, -268); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
export function drawThroneFront(g, x, y) {
  if (art('prop/whoopee-throne')) return;
  g.save(); g.translate(x, y);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  // legs
  g.fillStyle = '#ffd23f';
  for (const side of [-1, 1]) { g.beginPath(); g.rect(side * 84 - 9, -100, 18, 98); g.fill(); g.stroke(); }
  // seat cushion
  g.fillStyle = '#ff5aa8'; g.beginPath(); g.ellipse(0, -112, 102, 26, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-24, -118, 44, 8, 0, 0, TAU); g.fill();
  // armrests
  g.fillStyle = '#ffd23f';
  for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * 100, -140, 18, 40, 0, 0, TAU); g.fill(); g.stroke(); }
  // tassels
  for (const side of [-1, 1]) { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(side * 70, -96); g.lineTo(side * 64, -70); g.lineTo(side * 76, -70); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
}

function heartPath(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.4);
  g.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
}

// --- cushions -------------------------------------------------------------------------
/** A whoopee cushion centred at (x, y), w wide. sq: squash, flat: deflated, golden: the super one. */
export function drawCushion(g, x, y, w, { sq = 0, flat = false, golden = false, rot = 0, col = null, t = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const fy = flat ? 0.45 : 1;
  g.scale(1 + sq * 0.4, (1 - sq * 0.4) * fy);
  const key = golden ? 'prop/whoopee-golden' : flat ? 'prop/whoopee-cushion-flat' : 'prop/whoopee-cushion';
  if (art(key)) { if (flat) g.scale(1, 1 / fy); drawArt(g, key, 0, 0, w, w * (golden ? 0.66 : 0.75)); g.restore(); return; }
  const s = w / 100;
  g.scale(s, s);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = golden ? 4 : 5;
  const c1 = golden ? '#ffd23f' : col || '#ff7ac6', c2 = golden ? '#ff9f1c' : '#ff4fa3';
  // nozzle
  g.fillStyle = c2; g.beginPath(); g.moveTo(34, 6); g.lineTo(56, -2); g.lineTo(60, 12); g.lineTo(40, 18); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = c1; g.beginPath(); g.ellipse(0, 4, 46, 30, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 8, 32, 16, 0, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-16, -10, 14, 6, -0.3, 0, TAU); g.fill();
  if (golden) {
    g.fillStyle = '#ff5aa8'; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.moveTo(56, 4); g.lineTo(70, -8); g.lineTo(72, 14); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(56, 4); g.lineTo(70, 18); g.lineTo(76, 0); g.closePath(); g.fill(); g.stroke();
    const k = 0.5 + 0.5 * Math.sin(t * 6);
    g.fillStyle = `rgba(255,255,255,${0.5 + k * 0.4})`; for (const [px, py] of [[-26, -4], [10, -18], [24, 10]]) { g.beginPath(); g.arc(px, py, 3 + k * 2, 0, TAU); g.fill(); }
  }
  g.restore();
}

/** Wicker basket full of cushions, (x, y) = feet. */
export function drawBasket(g, x, y, t) {
  if (drawArt(g, 'prop/whoopee-basket', x, y, 220, 165, { anchor: 'bottom' })) return;
  g.save(); g.translate(x, y);
  // cushions peeking out
  const cols = ['#ff7ac6', '#c8a6ff', '#ff9fcf', '#7fd0ff', '#ff7ac6'];
  cols.forEach((c, i) => drawCushion(g, -64 + i * 32, -96 - (i % 2) * 14 + Math.sin(t * 3 + i) * 3, 70, { col: c, rot: (i - 2) * 0.25 }));
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.fillStyle = '#e0a060';
  g.beginPath(); g.moveTo(-96, -96); g.lineTo(-80, -4); g.lineTo(80, -4); g.lineTo(96, -96); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-96 + i * 4, -96 + i * 23); g.lineTo(96 - i * 4, -96 + i * 23); g.stroke(); }
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 26, -96); g.lineTo(i * 22, -4); g.stroke(); }
  g.strokeStyle = NAVY; g.lineWidth = 5;
  g.fillStyle = '#c98a4a'; g.beginPath(); g.ellipse(0, -96, 98, 14, 0, 0, TAU); g.stroke();
  g.restore();
}

// --- the butler ------------------------------------------------------------------------
/** The penguin butler, (x, y) = feet, h tall. notice 0..1 = "a-hem!" lean. */
export function drawButler(g, x, y, h, t, facing = 1, step = 0, notice = 0) {
  g.save(); g.translate(x, y);
  const key = notice > 0.3 ? 'prop/whoopee-butler-ahem' : 'prop/whoopee-butler';
  if (art(key)) { g.scale(facing, 1); drawArt(g, key, 0, -Math.abs(Math.sin(step)) * 6, h * 280 / 420, h, { anchor: 'bottom' }); g.restore(); return; }
  const s = h / 210;
  g.scale(s * facing, s);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.translate(0, -Math.abs(Math.sin(step)) * 6);
  g.rotate(notice * 0.18 + Math.sin(step) * 0.05);
  // feet
  g.fillStyle = '#ffa53f';
  for (const side of [-1, 1]) { const sw = Math.sin(step + (side > 0 ? Math.PI : 0)) * 6; g.beginPath(); g.ellipse(side * 18 + sw + 8, -6, 20, 8, 0, 0, TAU); g.fill(); g.stroke(); }
  // tailcoat
  g.fillStyle = '#2d2a44';
  g.beginPath(); g.moveTo(-40, -20); g.lineTo(-58, -6); g.lineTo(-44, -30); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, -84, 50, 76, 0, 0, TAU); g.fill(); g.stroke();
  // white belly
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(8, -78, 32, 62, 0, 0, TAU); g.fill(); g.stroke();
  // buttons
  g.fillStyle = NAVY; for (const by of [-90, -66, -42]) { g.beginPath(); g.arc(12, by, 3.5, 0, TAU); g.fill(); }
  // bow tie
  g.fillStyle = '#ff4d6d';
  g.beginPath(); g.moveTo(10, -132); g.lineTo(-6, -142); g.lineTo(-6, -122); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(10, -132); g.lineTo(26, -142); g.lineTo(26, -122); g.closePath(); g.fill(); g.stroke();
  // head
  g.fillStyle = '#2d2a44'; g.beginPath(); g.arc(4, -168, 36, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(14, -164, 20, 22, 0, 0, TAU); g.fill();
  // eye + raised eyebrow
  g.fillStyle = NAVY; g.beginPath(); g.arc(20, -170, notice > 0.3 ? 6 : 4, 0, TAU); g.fill();
  g.lineWidth = 4; g.beginPath(); g.moveTo(10, -182 - notice * 8); g.lineTo(30, -184 - notice * 12); g.stroke();
  // beak (nose in the air)
  g.fillStyle = '#ffa53f'; g.beginPath(); g.moveTo(34, -166); g.lineTo(60, -172 - (1 - notice) * 6); g.lineTo(36, -154); g.closePath(); g.fill(); g.stroke();
  // flipper with the tray held high (back), the other flipper raised when he says "ahem"
  g.fillStyle = '#2d2a44';
  g.beginPath(); g.moveTo(-40, -120); g.quadraticCurveTo(-74, -150, -60, -196); g.lineTo(-48, -192); g.quadraticCurveTo(-56, -150, -32, -108); g.closePath(); g.fill(); g.stroke();
  // tray + teapot
  g.fillStyle = '#d9dde8'; g.beginPath(); g.ellipse(-56, -198, 38, 8, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-56, -214, 16, 14, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(-56, -230, 4, 0, TAU); g.fill();
  g.fillStyle = '#2d2a44';
  if (notice > 0.3) { g.beginPath(); g.moveTo(40, -112); g.quadraticCurveTo(70, -140, 62, -170); g.lineTo(52, -168); g.quadraticCurveTo(56, -136, 32, -100); g.closePath(); g.fill(); g.stroke(); }
  else { g.beginPath(); g.moveTo(40, -112); g.quadraticCurveTo(58, -80, 48, -50); g.lineTo(38, -54); g.quadraticCurveTo(44, -84, 30, -104); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
}

// --- frog, moon, puff ---------------------------------------------------------------------
/** Spring toy frog centred at (x, y). spring 0..1 stretches the spring out. */
export function drawFrog(g, x, y, s, t, spring = 0) {
  g.save(); g.translate(x, y);
  if (drawArt(g, 'prop/whoopee-frog', 0, -spring * s * 0.5, s, s)) { g.restore(); return; }
  g.scale(s / 100, s / 100);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
  // spring
  const len = 20 + spring * 60;
  g.strokeStyle = '#9aa3b8'; g.lineWidth = 5;
  g.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12; g.lineTo(Math.sin(u * TAU * 3) * 12, 36 - u * len); } g.stroke();
  g.translate(0, 36 - len);
  g.strokeStyle = NAVY; g.lineWidth = 4;
  g.fillStyle = '#6fd06a'; g.beginPath(); g.ellipse(0, -16, 36, 26, 0, 0, TAU); g.fill(); g.stroke();
  for (const side of [-1, 1]) {
    g.fillStyle = '#6fd06a'; g.beginPath(); g.arc(side * 18, -40, 14, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(side * 18, -40, 9, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(side * 18 + Math.sin(t * 7 + side) * 3, -40 + Math.cos(t * 5) * 2, 4, 0, TAU); g.fill();
  }
  g.beginPath(); g.arc(0, -16, 18, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = '#ff9fb8'; g.beginPath(); g.arc(-24, -10, 5, 0, TAU); g.arc(24, -10, 5, 0, TAU); g.fill();
  g.restore();
}

export function drawMoon(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2) * 0.08);
  if (drawArt(g, 'prop/whoopee-moon', 0, 0, s, s)) { g.restore(); return; }
  g.scale(s / 200, s / 200);
  const gl = g.createRadialGradient(0, 0, 40, 0, 0, 120); gl.addColorStop(0, 'rgba(255,246,190,0.6)'); gl.addColorStop(1, 'rgba(255,246,190,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill();
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  g.fillStyle = '#fff3b0';
  g.beginPath(); g.arc(0, 0, 80, Math.PI * 0.35, Math.PI * 1.65); g.quadraticCurveTo(-10, 0, 80 * Math.cos(Math.PI * 0.35), 80 * Math.sin(Math.PI * 0.35)); g.fill(); g.stroke();
  // laughing face
  g.lineWidth = 5; g.beginPath(); g.moveTo(-52, -18); g.lineTo(-40, -24); g.lineTo(-30, -16); g.stroke();
  g.fillStyle = '#c2405c'; g.beginPath(); g.arc(-40, 12, 14, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ff9fb8'; g.beginPath(); g.arc(-62, 2, 8, 0, TAU); g.fill();
  g.restore();
}

/** A comic "PFFFT" puff cloud. k 0..1 = life. */
export function drawPuff(g, x, y, r, k, golden = false) {
  const a = clamp(1 - k, 0, 1), grow = 0.4 + 0.6 * Math.sqrt(k);
  g.save(); g.translate(x, y); g.globalAlpha = a * 0.95;
  g.fillStyle = golden ? '#fff3b0' : '#f4f0ff'; g.strokeStyle = 'rgba(36,22,63,0.45)'; g.lineWidth = 4;
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * TAU, px = Math.cos(ang) * r * 0.55 * grow, py = Math.sin(ang) * r * 0.32 * grow;
    g.beginPath(); g.arc(px, py, r * 0.38 * grow, 0, TAU); g.fill(); g.stroke();
  }
  g.beginPath(); g.arc(0, 0, r * 0.5 * grow, 0, TAU); g.fill();
  // speed lines
  g.strokeStyle = golden ? '#ff9f1c' : '#b98bff'; g.lineWidth = 6; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const ang = Math.PI * (0.1 + i * 0.16); const r0 = r * 0.9 * grow, r1 = r * 1.25 * grow; g.beginPath(); g.moveTo(-Math.cos(ang) * r0, -Math.sin(ang) * r0 * 0.6); g.lineTo(-Math.cos(ang) * r1, -Math.sin(ang) * r1 * 0.6); g.stroke(); }
  g.restore();
}

// --- background ------------------------------------------------------------------------
let gardenCache = null;
export const HEDGE_Y = 330;
export const GATES = [{ x: 170, y: 372 }, { x: 1750, y: 372 }];
export function drawGarden(g, t) {
  const bg = art('bg/whoopee-tea');
  if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
  if (!gardenCache) {
    gardenCache = document.createElement('canvas'); gardenCache.width = W; gardenCache.height = H;
    paintGarden(gardenCache.getContext('2d'));
  }
  g.drawImage(gardenCache, 0, 0);
  // bunting sways
  for (let i = 0; i < 2; i++) {
    const x0 = i ? 980 : 40, x1 = i ? 1880 : 940;
    g.save(); g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); for (let k = 0; k <= 20; k++) { const u = k / 20; g.lineTo(x0 + (x1 - x0) * u, 140 + Math.sin(u * Math.PI) * 50 + Math.sin(t * 2 + u * 6) * 3); } g.stroke();
    for (let k = 1; k < 12; k++) {
      const u = k / 12, px = x0 + (x1 - x0) * u, py = 140 + Math.sin(u * Math.PI) * 50 + Math.sin(t * 2 + u * 6) * 3;
      g.fillStyle = ['#ff7ac6', '#ffd23f', '#7fd0ff', '#c8a6ff', '#7fe0a8'][k % 5];
      g.beginPath(); g.moveTo(px - 16, py); g.lineTo(px + 16, py); g.lineTo(px + Math.sin(t * 3 + k) * 3, py + 34); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
  }
}

function paintGarden(g) {
  const sky = g.createLinearGradient(0, 0, 0, HEDGE_Y);
  sky.addColorStop(0, '#9fdcff'); sky.addColorStop(1, '#dff4ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, HEDGE_Y + 20);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [cx, cy, s] of [[300, 90, 1], [1500, 70, 1.2], [980, 120, 0.8]]) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(cx + j * 46 * s, cy + Math.sin(j * 2) * 8, (34 + (j % 2) * 16) * s, 0, TAU); g.fill(); }
  // hedge
  g.fillStyle = '#3f9a52'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, HEDGE_Y + 30);
  for (let x = 0; x <= W; x += 60) g.lineTo(x, 180 + Math.sin(x * 0.05) * 6 + (hh(x) * 8));
  g.lineTo(W, HEDGE_Y + 30); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#58b56a';
  for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(hh(i) * W, 200 + hh(i + 9) * 120, 18 + hh(i + 3) * 16, 0, TAU); g.fill(); }
  // roses in the hedge
  for (let i = 0; i < 30; i++) {
    const x = hh(i + 40) * W, y = 210 + hh(i + 60) * 110;
    g.fillStyle = ['#ff5a7a', '#ff9fcf', '#fff3f9'][i % 3]; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 1.4); g.stroke();
  }
  // gates
  for (const gt of GATES) {
    g.save(); g.translate(gt.x, HEDGE_Y + 30);
    g.fillStyle = '#cdeccf'; g.beginPath(); g.moveTo(-70, 0); g.lineTo(-70, -110); g.arc(0, -110, 70, Math.PI, TAU); g.lineTo(70, 0); g.closePath(); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 12; g.beginPath(); g.moveTo(-74, 0); g.lineTo(-74, -110); g.arc(0, -110, 74, Math.PI, TAU); g.lineTo(74, 0); g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(-80, 0); g.lineTo(-80, -110); g.arc(0, -110, 80, Math.PI, TAU); g.lineTo(80, 0); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 6;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 26, 0); g.lineTo(i * 26, -120 + Math.abs(i) * 14); g.stroke(); }
    g.restore();
  }
  // lawn with mower stripes
  const lawn = g.createLinearGradient(0, HEDGE_Y, 0, H);
  lawn.addColorStop(0, '#9fe08a'); lawn.addColorStop(1, '#7fcf72');
  g.fillStyle = lawn; g.fillRect(0, HEDGE_Y + 30, W, H);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(i * 200 - 100, HEDGE_Y + 30); g.lineTo(i * 200, HEDGE_Y + 30); g.lineTo(i * 200 - 300 + 100, H); g.lineTo(i * 200 - 400 + 100, H); g.closePath(); g.fill(); }
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, HEDGE_Y + 30); g.lineTo(W, HEDGE_Y + 30); g.stroke();
  // little daisies
  for (let i = 0; i < 60; i++) {
    const x = hh(i + 100) * W, y = HEDGE_Y + 60 + hh(i + 200) * (H - HEDGE_Y - 80);
    g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 3, 3.5, 0, TAU); g.fill(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill();
  }
  // topiary pots at the corners
  for (const x of [60, W - 60]) {
    g.fillStyle = '#e07a5f'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x - 34, H - 120); g.lineTo(x + 34, H - 120); g.lineTo(x + 26, H - 60); g.lineTo(x - 26, H - 60); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#3f9a52'; g.beginPath(); g.arc(x, H - 170, 50, 0, TAU); g.fill(); g.stroke();
  }
}
