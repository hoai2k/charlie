// Snowflake Giggles - procedural art kit (every piece first tries generated art).
//   bg/snowflake-catch, prop/snowflake, prop/snowflake-big, prop/sf-snowball,
//   prop/snowman-friend(+-throw), prop/penguin-sled, prop/bigsnowman-1..6
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { drawSparkleShape } from '../../engine/emotes.js';
import { TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
export const ARENA = { x0: 110, x1: 1810, y0: 500, y1: 1020 };
export const BIG = { x: 960, y: 455, w: 240, h: 360 };
export const FRIEND = { x: 1660, y: 450, w: 180, h: 240 };

/** Where the friend's throwing hand is, relative to FRIEND (the art waves its left arm). */
export function friendHand() {
  return art('prop/snowman-friend-throw') ? { dx: -76, dy: -156 } : { dx: 50, dy: -231 };
}

function line(g, w = 4) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; }

/** Snowflake centred at the origin; size = diameter in px. */
export function drawFlake(g, size, rot, t, big = false) {
  g.save(); g.rotate(rot);
  if (big) {
    const k = 0.75 + Math.sin(t * 6) * 0.2;
    const gr = g.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 0.85);
    gr.addColorStop(0, `rgba(255,240,255,${0.75 * k})`); gr.addColorStop(1, 'rgba(200,180,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, size * 0.85, 0, TAU); g.fill();
  }
  if (!drawArt(g, big ? 'prop/snowflake-big' : 'prop/snowflake', 0, 0, size, size)) {
    const r = size / 2;
    const cols = big ? ['#ffc2f0', '#c9b0ff', '#a8f0ff'] : ['#ffffff'];
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate((i * TAU) / 6);
      g.lineCap = 'round';
      g.strokeStyle = NAVY; g.lineWidth = r * 0.3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * 0.92); g.stroke();
      g.beginPath(); g.moveTo(0, -r * 0.55); g.lineTo(-r * 0.28, -r * 0.78); g.moveTo(0, -r * 0.55); g.lineTo(r * 0.28, -r * 0.78); g.stroke();
      g.strokeStyle = cols[i % cols.length]; g.lineWidth = r * 0.17;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * 0.92); g.stroke();
      g.beginPath(); g.moveTo(0, -r * 0.55); g.lineTo(-r * 0.28, -r * 0.78); g.moveTo(0, -r * 0.55); g.lineTo(r * 0.28, -r * 0.78); g.stroke();
      g.restore();
    }
    g.beginPath(); g.arc(0, 0, r * 0.42, 0, TAU); g.fillStyle = big ? '#fff3fd' : '#eaf6ff'; g.fill(); line(g, Math.max(2, r * 0.1)); g.stroke();
    g.rotate(-rot);   // keep the face upright
    // face
    g.fillStyle = NAVY;
    g.beginPath(); g.arc(-r * 0.15, -r * 0.05, r * 0.07, 0, TAU); g.arc(r * 0.15, -r * 0.05, r * 0.07, 0, TAU); g.fill();
    g.lineWidth = Math.max(1.5, r * 0.06); g.beginPath(); g.arc(0, r * 0.06, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,120,180,0.55)'; g.beginPath(); g.arc(-r * 0.27, r * 0.08, r * 0.07, 0, TAU); g.arc(r * 0.27, r * 0.08, r * 0.07, 0, TAU); g.fill();
    if (big) { g.save(); g.translate(r * 0.6, -r * 0.6); drawSparkleShape(g, r * 0.4 * (0.8 + Math.sin(t * 8) * 0.3), '#fff6a8'); g.restore(); }
  }
  g.restore();
}

export function drawSnowball(g, r) {
  if (drawArt(g, 'prop/sf-snowball', 0, 0, r * 2, r * 2)) return;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); line(g, 3.5); g.stroke();
  g.fillStyle = '#d6e6ff'; g.beginPath(); g.arc(r * 0.2, r * 0.25, r * 0.6, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, TAU); g.fill();
}

/** Penguin on a sled, centred, facing dir (+1 right). */
export function drawPenguin(g, dir, t) {
  g.save(); g.scale(dir, 1);
  if (drawArt(g, 'prop/penguin-sled', 0, 0, 200, 133)) { g.restore(); return; }
  line(g, 4);
  // sled
  g.fillStyle = '#ff4d5e';
  ui.roundRect(g, -80, 18, 150, 24, 10); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-90, 52); g.lineTo(70, 52); g.quadraticCurveTo(100, 52, 96, 28); g.lineWidth = 6; g.stroke(); line(g, 4);
  for (const x of [-50, 30]) { g.beginPath(); g.moveTo(x, 42); g.lineTo(x, 52); g.stroke(); }
  // body
  const bob = Math.sin(t * 20) * 2;
  g.save(); g.translate(0, bob);
  g.beginPath(); g.ellipse(-5, -10, 40, 42, 0.15, 0, TAU); g.fillStyle = '#2c2a4a'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(4, -4, 26, 32, 0.15, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
  // wings out
  for (const s of [-1, 1]) { g.save(); g.translate(-10 + s * 6, -6); g.rotate(-0.9 + Math.sin(t * 18 + s) * 0.25); g.beginPath(); g.ellipse(-30, 0, 30, 10, 0, 0, TAU); g.fillStyle = '#2c2a4a'; g.fill(); line(g, 3.5); g.stroke(); g.restore(); }
  // face
  g.fillStyle = '#fff'; g.beginPath(); g.arc(14, -36, 9, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(17, -36, 4.5, 0, TAU); g.fill();
  g.fillStyle = '#ffb03f'; g.beginPath(); g.moveTo(26, -32); g.lineTo(48, -26); g.lineTo(26, -20); g.closePath(); g.fill(); line(g, 3); g.stroke();
  g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(8, -24, 5, 0, TAU); g.fill();
  // scarf
  g.fillStyle = '#ff4d5e'; ui.roundRect(g, -26, -18, 46, 12, 6); g.fill(); line(g, 3); g.stroke();
  g.beginPath(); g.moveTo(-24, -12); g.quadraticCurveTo(-50, -14 + Math.sin(t * 25) * 6, -66, -4); g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#ff4d5e'; g.stroke();
  g.restore();
  g.restore();
}

/** The small snowman friend who throws snowballs (bottom-centre at x, y). */
export function drawFriend(g, x, y, throwing, t) {
  if (drawArt(g, throwing ? 'prop/snowman-friend-throw' : 'prop/snowman-friend', x, y, FRIEND.w, FRIEND.h, { anchor: 'bottom' })) return;
  g.save(); g.translate(x, y);
  const wob = Math.sin(t * 3) * 0.04;
  g.rotate(wob);
  line(g, 4);
  const ball = (cy, r) => { g.beginPath(); g.arc(0, cy, r, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke(); g.fillStyle = 'rgba(160,190,255,0.35)'; g.beginPath(); g.arc(r * 0.25, cy + r * 0.2, r * 0.7, 0, TAU); g.fill(); };
  ball(-55, 56); ball(-140, 42);
  // arms
  const arm = (side, up) => {
    g.save(); g.translate(side * 36, -145); g.rotate(side * (up ? -2.2 : -0.5) + (up ? 0 : Math.sin(t * 4) * 0.15 * side));
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(side * 52, 0); g.moveTo(side * 38, 0); g.lineTo(side * 50, -12); g.stroke();
    g.restore();
  };
  arm(-1, false); arm(1, throwing);
  line(g, 4);
  ball(-210, 34);
  // face
  g.fillStyle = NAVY;
  if (throwing) { g.lineWidth = 3.5; g.beginPath(); g.moveTo(-18, -218); g.lineTo(-6, -218); g.stroke(); }
  else { g.beginPath(); g.arc(-12, -218, 4.5, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(12, -218, 4.5, 0, TAU); g.fill();
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(0, -210); g.lineTo(28, -204); g.lineTo(0, -199); g.closePath(); g.fill(); line(g, 2.5); g.stroke();
  line(g, 3.5); g.beginPath(); g.arc(0, -200, 13, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  for (const by of [-150, -125, -60, -35]) { g.fillStyle = NAVY; g.beginPath(); g.arc(0, by, 4.5, 0, TAU); g.fill(); }
  // scarf + bobble hat
  g.fillStyle = '#6fe3b4'; ui.roundRect(g, -38, -184, 76, 16, 8); g.fill(); line(g, 3); g.stroke();
  g.beginPath(); g.moveTo(22, -172); g.lineTo(32, -136); g.lineTo(18, -136); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(0, -238, 30, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(-28, -248, 56, 8);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, -272, 11, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** The shared snowman at a given stage (0..6), bottom-centre at x, y. */
export function drawBigSnowman(g, x, y, stage, t, bounce = 0, dance = 0) {
  if (stage <= 0) {
    // a little snow mound where it will stand
    g.save(); g.translate(x, y);
    g.beginPath(); g.ellipse(0, -8, 110, 26, 0, Math.PI, TAU); g.fillStyle = '#ffffff'; g.fill(); line(g, 4); g.stroke();
    g.restore();
    return;
  }
  g.save(); g.translate(x, y);
  const sq = 1 + bounce * 0.12, wob = Math.sin(t * 7) * 0.06 * dance;
  g.rotate(wob); g.scale(1 / sq, sq);
  if (drawArt(g, `prop/bigsnowman-${Math.min(6, stage)}`, 0, 0, BIG.w, BIG.h, { anchor: 'bottom' })) { g.restore(); return; }
  g.scale(0.74, 0.74);
  line(g, 5);
  const ball = (cy, r) => {
    g.beginPath(); g.arc(0, cy, r, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    g.save(); g.clip(); g.fillStyle = 'rgba(160,190,255,0.35)'; g.beginPath(); g.arc(r * 0.3, cy + r * 0.3, r * 0.85, 0, TAU); g.fill(); g.restore();
    line(g, 5); g.beginPath(); g.arc(0, cy, r, 0, TAU); g.stroke();
  };
  const r1 = 88, r2 = 64, r3 = 48;
  const c1 = -r1 + 6, c2 = c1 - r1 - r2 + 26, c3 = c2 - r2 - r3 + 20;
  ball(c1, r1);
  if (stage >= 5) {
    // twig arms (raised at stage 6)
    for (const s of [-1, 1]) {
      g.save(); g.translate(s * 52, c2 - 6);
      g.rotate(s * (stage >= 6 ? -0.9 + Math.sin(t * 6 + s) * 0.3 * (dance ? 1 : 0.3) : 0.3));
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 80, 0); g.moveTo(s * 56, 0); g.lineTo(s * 74, -18); g.moveTo(s * 64, 0); g.lineTo(s * 80, 14); g.stroke();
      g.restore();
    }
    line(g, 5);
  }
  if (stage >= 2) ball(c2, r2);
  if (stage >= 3) {
    ball(c3, r3);
    g.fillStyle = NAVY;
    g.beginPath(); g.arc(-17, c3 - 8, 6, 0, TAU); g.arc(17, c3 - 8, 6, 0, TAU); g.fill();
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-20 + i * 10, c3 + 18 + Math.sin((i / 4) * Math.PI) * 6, 3.5, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,120,170,0.5)'; g.beginPath(); g.arc(-30, c3 + 6, 8, 0, TAU); g.arc(30, c3 + 6, 8, 0, TAU); g.fill();
  }
  if (stage >= 2) { g.fillStyle = NAVY; for (const by of [c2 - 20, c2 + 10, c1 - 40, c1 - 6]) { g.beginPath(); g.arc(0, by, 6, 0, TAU); g.fill(); } }
  if (stage >= 4) {
    // carrot + top hat
    g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(0, c3 - 2); g.lineTo(46, c3 + 6); g.lineTo(0, c3 + 12); g.closePath(); g.fill(); line(g, 3.5); g.stroke();
    line(g, 5);
    g.fillStyle = '#7b4fd6';
    ui.roundRect(g, -56, c3 - r3 + 2, 112, 16, 8); g.fill(); g.stroke();
    ui.roundRect(g, -36, c3 - r3 - 64, 72, 70, 10); g.fill(); g.stroke();
    g.fillStyle = '#ff7ac6'; g.fillRect(-34, c3 - r3 - 14, 68, 14);
    if (stage >= 6) { g.save(); g.translate(30, c3 - r3 - 10); for (let i = 0; i < 5; i++) { g.rotate(TAU / 5); g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(0, -8, 5, 8, 0, 0, TAU); g.fill(); } g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill(); g.restore(); }
  }
  if (stage >= 5) {
    // rainbow scarf
    const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'];
    const sy = c3 + r3 - 8;
    g.save(); ui.roundRect(g, -52, sy, 104, 24, 12); g.clip();
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(-52 + i * 18, sy, 18, 24); });
    g.restore(); line(g, 4); ui.roundRect(g, -52, sy, 104, 24, 12); g.stroke();
    g.save(); g.translate(30, sy + 16); g.rotate(-0.15 + Math.sin(t * 4) * 0.12);
    ui.roundRect(g, -10, 0, 22, 74, 10); g.save(); g.clip(); cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(-10, i * 13, 22, 13); }); g.restore(); line(g, 4); ui.roundRect(g, -10, 0, 22, 74, 10); g.stroke();
    g.restore();
  }
  g.restore();
}

/** Procedural dusky winter meadow. */
export function drawMeadow(g, t, sparkles) {
  const bg = art('bg/snowflake-catch');
  if (bg) { g.drawImage(bg, 0, 0, W, H); }
  else {
    const sky = g.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, '#9a8cf0'); sky.addColorStop(0.55, '#f2b6e4'); sky.addColorStop(1, '#ffe0ea');
    g.fillStyle = sky; g.fillRect(0, 0, W, 440);
    // moon + stars
    g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(1500, 150, 54, 0, TAU); g.fill();
    g.fillStyle = '#c8b8f4'; g.beginPath(); g.arc(1522, 136, 46, 0, TAU); g.fill();
    for (let i = 0; i < 22; i++) { g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); g.translate((i * 283) % W, 30 + ((i * 97) % 200)); drawSparkleShape(g, 10 + (i % 3) * 4, '#ffffff'); g.restore(); }
    // far hills
    ui.hills(g, 330, '#e6dcff', 40, 0.003, 1);
    ui.hills(g, 380, '#f4efff', 30, 0.0045, 3);
    // pine trees along the back
    for (let i = 0; i < 16; i++) {
      const x = 40 + i * 124 + ((i * 37) % 40), s = 0.75 + ((i * 7) % 5) * 0.08;
      if (Math.abs(x - 960) < 170 || Math.abs(x - 1660) < 120) continue;
      pine(g, x, 470 - ((i * 13) % 30), s);
    }
    // meadow
    const sn = g.createLinearGradient(0, 430, 0, H);
    sn.addColorStop(0, '#f7f9ff'); sn.addColorStop(1, '#e3ecff');
    g.fillStyle = sn; g.beginPath(); g.moveTo(0, 450);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, 450 + Math.sin(x * 0.004 + 1) * 14);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    // soft blue drift shadows
    g.fillStyle = 'rgba(160,180,240,0.18)';
    for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse((i * 331 + 100) % W, 560 + ((i * 151) % 420), 220, 34, 0, 0, TAU); g.fill(); }
    // pond in the corner
    g.save(); g.translate(150, 1010);
    g.beginPath(); g.ellipse(0, 0, 220, 70, 0, 0, TAU); g.fillStyle = '#bfe6ff'; g.fill(); line(g, 4); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-50, -14, 70, 10, -0.1, 0, TAU); g.fill();
    g.restore();
    // bushes in the corners
    for (const [x, y] of [[1830, 1000], [1730, 1050], [60, 560]]) snowBush(g, x, y);
  }
  // twinkles on the snow
  for (const s of sparkles) {
    const a = Math.max(0, Math.sin(t * 2.4 + s.p));
    if (a < 0.2) continue;
    g.save(); g.globalAlpha = a * 0.8; g.translate(s.x, s.y); drawSparkleShape(g, 12 * s.s, '#ffffff'); g.restore();
  }
}

function pine(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  line(g, 4);
  g.fillStyle = '#8a5a2b'; g.fillRect(-9, -20, 18, 24);
  for (let i = 0; i < 3; i++) {
    const w = 72 - i * 16, yy = -20 - i * 42;
    g.beginPath(); g.moveTo(-w, yy); g.lineTo(0, yy - 76); g.lineTo(w, yy); g.closePath(); g.fillStyle = ['#3ea88a', '#4fbf9c', '#62d3ad'][i]; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-w * 0.55, yy - 34); g.lineTo(0, yy - 76); g.lineTo(w * 0.55, yy - 34); g.quadraticCurveTo(0, yy - 22, -w * 0.55, yy - 34); g.fillStyle = '#ffffff'; g.fill();
  }
  g.restore();
}

function snowBush(g, x, y) {
  g.save(); g.translate(x, y); line(g, 4);
  for (const [dx, dy, r] of [[-40, 0, 40], [30, 4, 44], [0, -26, 46]]) { g.beginPath(); g.arc(dx, dy, r, 0, TAU); g.fillStyle = '#5fc79e'; g.fill(); g.stroke(); }
  for (const [dx, dy, r] of [[-30, -22, 26], [20, -40, 30]]) { g.beginPath(); g.ellipse(dx, dy, r, r * 0.5, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
  g.fillStyle = '#ff4d6d'; for (const [dx, dy] of [[-10, 8], [36, -10], [-50, -8]]) { g.beginPath(); g.arc(dx, dy, 6, 0, TAU); g.fill(); }
  g.restore();
}

/** Cartoon tongue sticking out (origin at the mouth). */
export function drawTongue(g, s, wag) {
  g.save(); g.scale(s, s); g.rotate(wag);
  line(g, 3);
  g.beginPath(); g.ellipse(0, -2, 15, 9, 0, 0, TAU); g.fillStyle = '#5b2346'; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-9, 0); g.lineTo(-9, 14); g.arc(0, 14, 9, Math.PI, 0, true); g.lineTo(9, 0); g.closePath();
  g.fillStyle = '#ff6f9c'; g.fill(); g.stroke();
  g.strokeStyle = '#d94a7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 3); g.lineTo(0, 15); g.stroke();
  g.restore();
}
