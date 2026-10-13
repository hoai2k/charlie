// Teddy Tea Party - procedural drawing kit (guests, treats, cart, garden).
// Every piece first tries its generated art key (see image-requests.md,
// "New Molly Party game: tea-party") and falls back to the vector drawing here.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { drawArt, art } from '../../engine/art.js';
import { TAU } from '../../engine/util.js';

const NAVY = '#24163f';

export const ITEMS = ['cup', 'cupcake', 'strawberry', 'cookie'];
export const ITEM_ART = {
  cup: 'prop/tea-cup-pink', cupcake: 'prop/tea-cupcake', strawberry: 'prop/tea-strawberry',
  cookie: 'prop/tea-cookie', cake: 'prop/tea-cake',
};
export const ITEM_COLOR = { cup: '#ff7ac6', cupcake: '#5fb8ff', strawberry: '#ff4d5e', cookie: '#e0a050', cake: '#b58cff' };

// ------------------------------------------------------------------ treats

/** A treat centred at the origin, about `s` px tall. */
export function drawItem(g, kind, s = 90, t = 0) {
  if (drawArt(g, ITEM_ART[kind], 0, 0, s * (kind === 'cake' ? 1.15 : 1), s * (kind === 'cake' ? 1.15 : 1))) return;
  g.save();
  const k = s / 90;
  g.scale(k, k);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 3.5; g.strokeStyle = NAVY;
  if (kind === 'cup') drawCup(g, t);
  else if (kind === 'cupcake') drawCupcake(g);
  else if (kind === 'strawberry') drawStrawberry(g);
  else if (kind === 'cookie') drawCookie(g);
  else drawCake(g);
  g.restore();
}

function drawCup(g, t) {
  // saucer
  g.fillStyle = '#ffe3f2'; g.beginPath(); g.ellipse(0, 28, 40, 11, 0, 0, TAU); g.fill(); g.stroke();
  // handle
  g.beginPath(); g.ellipse(30, 4, 13, 12, 0, -1.3, 1.3); g.lineWidth = 7; g.strokeStyle = NAVY; g.stroke();
  g.lineWidth = 3.5; g.strokeStyle = '#ff7ac6'; g.stroke();
  g.strokeStyle = NAVY; g.lineWidth = 3.5;
  // cup body
  g.beginPath(); g.moveTo(-30, -14); g.lineTo(30, -14); g.quadraticCurveTo(30, 26, 0, 26); g.quadraticCurveTo(-30, 26, -30, -14); g.closePath();
  g.fillStyle = '#ff7ac6'; g.fill(); g.stroke();
  g.fillStyle = '#c98a4a'; g.beginPath(); g.ellipse(0, -14, 30, 7, 0, 0, TAU); g.fill(); g.stroke();
  // heart
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-14, 4, -10, -6, 0, -1); g.bezierCurveTo(10, -6, 14, 4, 0, 14); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-20, 0, 4, 9, 0.2, 0, TAU); g.fill();
  // steam
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4;
  for (let i = -1; i <= 1; i += 2) {
    g.beginPath();
    for (let y = 0; y < 26; y += 2) g.lineTo(i * 8 + Math.sin(y * 0.3 + t * 5 + i) * 4, -22 - y);
    g.stroke();
  }
}

function drawCupcake(g) {
  g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.lineTo(19, 34); g.lineTo(-19, 34); g.closePath();
  g.fillStyle = '#5fb8ff'; g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 11, 3); g.lineTo(i * 9, 31); g.stroke(); }
  g.strokeStyle = NAVY;
  for (const [rx, ry, y] of [[31, 14, -3], [25, 13, -15], [16, 12, -26]]) { g.beginPath(); g.ellipse(0, y, rx, ry, 0, 0, TAU); g.fillStyle = '#ff9ccf'; g.fill(); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-9, -29, 6, 3, -0.5, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, -40, 8, 0, TAU); g.fillStyle = '#ff2d55'; g.fill(); g.stroke();
  const sc = ['#ffd23f', '#3fa7ff', '#36d17a', '#fff'];
  for (let i = 0; i < 6; i++) { g.save(); g.translate(-18 + i * 7, -8 - ((i * 7) % 11)); g.rotate(i * 1.3); g.fillStyle = sc[i % 4]; g.fillRect(-4, -1.5, 8, 3); g.restore(); }
}

function drawStrawberry(g) {
  g.beginPath();
  g.moveTo(0, 36); g.bezierCurveTo(-30, 20, -38, -8, -26, -20); g.bezierCurveTo(-14, -30, 14, -30, 26, -20); g.bezierCurveTo(38, -8, 30, 20, 0, 36);
  g.fillStyle = '#ff3b55'; g.fill(); g.stroke();
  g.fillStyle = '#ffe680';
  for (let i = 0; i < 11; i++) { const a = i * 2.4, r = 6 + (i * 7) % 18; g.beginPath(); g.ellipse(Math.cos(a) * r, 4 + Math.sin(a) * r * 0.9, 2, 3, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-14, -10, 5, 9, 0.5, 0, TAU); g.fill();
  g.fillStyle = '#3fc75a';
  for (let i = 0; i < 5; i++) { g.save(); g.translate(0, -24); g.rotate(-1.2 + i * 0.6); g.beginPath(); g.ellipse(0, -10, 6, 13, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  g.fillStyle = '#2e9a45'; g.fillRect(-2, -42, 4, 12);
}

function drawCookie(g) {
  g.beginPath(); g.arc(0, 0, 36, 0, TAU); g.fillStyle = '#e8b064'; g.fill(); g.stroke();
  g.fillStyle = '#f4c983'; g.beginPath(); g.arc(-6, -6, 26, 0, TAU); g.fill();
  g.fillStyle = '#6a3a1e';
  for (const [x, y, r] of [[-14, -10, 6], [10, -16, 5], [14, 8, 6], [-8, 14, 5], [2, -2, 4], [-22, 6, 4], [22, -4, 4]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
}

function drawCake(g) {
  // wedge of rainbow cake
  const layers = ['#ff6f91', '#ffb86f', '#ffe66f', '#8be8b8', '#7fd3ff', '#c9a0ff'];
  g.save();
  g.beginPath(); g.moveTo(-40, 34); g.lineTo(40, 34); g.lineTo(40, -14); g.lineTo(-40, -30); g.closePath(); g.clip();
  layers.forEach((c, i) => { g.fillStyle = c; g.fillRect(-42, 34 - (i + 1) * 11, 84, 11.5); });
  g.restore();
  g.beginPath(); g.moveTo(-40, 34); g.lineTo(40, 34); g.lineTo(40, -14); g.lineTo(-40, -30); g.closePath(); g.stroke();
  // frosting top
  g.beginPath(); g.moveTo(-44, -30); g.lineTo(44, -14); g.lineTo(44, -6);
  for (let x = 40; x > -44; x -= 14) g.quadraticCurveTo(x - 7, 4 - (x + 44) * 0.19 + 6, x - 14, -6 - (x + 30) * 0.19);
  g.closePath(); g.fillStyle = '#fff'; g.fill(); g.stroke();
  // strawberry
  g.save(); g.translate(4, -34); g.scale(0.42, 0.42); drawStrawberry(g); g.restore();
  const sc = ['#ff4d8d', '#3fa7ff', '#36d17a', '#ffd23f'];
  for (let i = 0; i < 7; i++) { g.save(); g.translate(-32 + i * 10, -18 + i * 1.8); g.rotate(i); g.fillStyle = sc[i % 4]; g.fillRect(-4, -1.5, 8, 3); g.restore(); }
}

// ------------------------------------------------------------------ guests

export const GUEST_ART = {
  teddy: 'prop/tea-guest-teddy', honey: 'prop/tea-guest-honey', bunny: 'prop/tea-guest-bunny',
  unicorn: 'prop/tea-guest-unicorn', panda: 'prop/tea-guest-panda',
};
const FUR = {
  teddy: ['#b07a4a', '#e8c39a', '#7a4a26'],
  honey: ['#f2c45a', '#fff0c4', '#c98f22'],
  panda: ['#ffffff', '#ffffff', '#2c2440'],
  bunny: ['#fbf7ff', '#ffffff', '#ffb3d1'],
  unicorn: ['#fffaff', '#ffffff', '#c9a0ff'],
};

/**
 * A seated guest bust. Origin = seat point (bottom centre, hidden behind the
 * table top). `o`: { happy, t, blink, shake (head shake -1..1), ears (bunny
 * ear spin angle), hat (false = hat drawn elsewhere), cheeks (munch puff) }.
 */
export function drawGuest(g, kind, o = {}) {
  const happy = !!o.happy;
  const key = GUEST_ART[kind] + (happy ? '-happy' : '');
  if (drawArt(g, key, 0, 0, 250, 225, { anchor: 'bottom' }) || (happy && drawArt(g, GUEST_ART[kind], 0, 0, 250, 225, { anchor: 'bottom' }))) {
    return;
  }
  const [fur, light, dark] = FUR[kind];
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  // body
  g.beginPath(); g.ellipse(0, -30, 78, 78, 0, Math.PI, TAU); g.lineTo(78, 20); g.lineTo(-78, 20); g.closePath();
  g.fillStyle = kind === 'panda' ? '#ffffff' : fur; g.fill(); g.stroke();
  if (kind !== 'unicorn') { g.fillStyle = light; g.beginPath(); g.ellipse(0, -18, 44, 46, 0, 0, TAU); g.fill(); }
  // paws resting forward
  const pawC = kind === 'panda' ? '#2c2440' : fur;
  for (const s of [-1, 1]) {
    g.beginPath(); g.ellipse(s * 62, -6 + (happy ? -26 - Math.abs(Math.sin((o.t || 0) * 14)) * 10 : 0), 22, 20, 0, 0, TAU);
    g.fillStyle = pawC; g.fill(); g.stroke();
  }
  // collar details
  if (kind === 'teddy') { // bow tie
    g.fillStyle = '#ff3b55';
    g.beginPath(); g.moveTo(0, -84); g.lineTo(-22, -96); g.lineTo(-22, -70); g.closePath(); g.moveTo(0, -84); g.lineTo(22, -96); g.lineTo(22, -70); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -84, 7, 0, TAU); g.fill(); g.stroke();
  } else if (kind === 'panda') {
    g.fillStyle = '#6fe3b4'; ui.roundRect(g, -40, -96, 80, 16, 8); g.fill(); g.stroke();
  } else if (kind === 'bunny') {
    g.fillStyle = '#fff';
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc(i * 14, -88, 10, 0, Math.PI); g.fill(); g.stroke(); }
  } else if (kind === 'unicorn') {
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -82, 9, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.arc(0, -120, 40, 0.7, Math.PI - 0.7); g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = 5;
  }
  // head (shakes side to side for "no thanks")
  const hx = (o.shake || 0) * 16, hr = (o.shake || 0) * 0.12;
  g.save(); g.translate(hx, -148); g.rotate(hr);
  if (kind === 'unicorn') drawUnicornHead(g, o, happy);
  else drawRoundHead(g, kind, fur, light, dark, o, happy);
  g.restore();
  g.restore();
}

function drawRoundHead(g, kind, fur, light, dark, o, happy) {
  const t = o.t || 0;
  // ears
  if (kind === 'bunny') {
    for (const s of [-1, 1]) {
      g.save(); g.translate(s * 26, -46); g.rotate(s * 0.15 + (o.ears || 0) * s + (happy ? s * -0.3 : 0));
      g.beginPath(); g.ellipse(0, -52, 19, 58, 0, 0, TAU); g.fillStyle = fur; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, -50, 9, 42, 0, 0, TAU); g.fillStyle = '#ffb3d1'; g.fill();
      g.restore();
    }
  } else {
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(s * 50, -46, 24, 0, TAU); g.fillStyle = kind === 'panda' ? '#2c2440' : fur; g.fill(); g.stroke();
      g.beginPath(); g.arc(s * 50, -46, 12, 0, TAU); g.fillStyle = kind === 'panda' ? '#4a3d66' : light; g.fill();
    }
  }
  g.beginPath(); g.ellipse(0, 0, 70, 62, 0, 0, TAU); g.fillStyle = fur; g.fill(); g.stroke();
  if (kind === 'honey') { // pink bow on the ear
    g.save(); g.translate(46, -58); g.rotate(0.3); g.fillStyle = '#ff7ac6';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-26, -14); g.lineTo(-26, 14); g.closePath(); g.moveTo(0, 0); g.lineTo(26, -14); g.lineTo(26, 14); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.stroke(); g.restore();
  }
  // panda eye patches
  if (kind === 'panda') { g.fillStyle = '#2c2440'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 25, -10, 17, 20, s * 0.5, 0, TAU); g.fill(); } }
  // muzzle
  const puff = o.cheeks || 0;
  g.beginPath(); g.ellipse(0, 20, 32 + puff * 10, 24 + puff * 4, 0, 0, TAU); g.fillStyle = kind === 'bunny' || kind === 'panda' ? '#fff' : light; g.fill();
  g.lineWidth = 3; g.stroke(); g.lineWidth = 5;
  g.fillStyle = kind === 'bunny' ? '#ff7aa8' : '#3a2440';
  g.beginPath(); g.ellipse(0, 8, 10, 7, 0, 0, TAU); g.fill();
  drawFace(g, o, happy, kind === 'panda' ? '#fff' : NAVY);
  // cheeks
  g.fillStyle = 'rgba(255,111,160,0.45)';
  g.beginPath(); g.ellipse(-46, 18, 13, 8, 0, 0, TAU); g.ellipse(46, 18, 13, 8, 0, 0, TAU); g.fill();
}

function drawFace(g, o, happy, eyeColor) {
  const t = o.t || 0;
  g.strokeStyle = eyeColor; g.fillStyle = eyeColor;
  if (happy) {
    g.lineWidth = 5;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 24, -8, 10, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    // big open laugh
    g.strokeStyle = NAVY; g.fillStyle = '#7a2340';
    const open = 10 + Math.abs(Math.sin(t * 16)) * 8;
    g.beginPath(); g.moveTo(-15, 22); g.quadraticCurveTo(0, 22 + open * 2.2, 15, 22); g.closePath(); g.fill(); g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ff7aa8'; g.beginPath(); g.ellipse(0, 22 + open * 1.3, 7, 4, 0, 0, TAU); g.fill();
  } else {
    const blink = o.blink ? 0.15 : 1;
    for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(s * 24, -8, 8, 10 * blink, 0, 0, TAU); g.fill();
      if (blink > 0.5) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 24 - 3, -12, 3, 0, TAU); g.fill(); g.fillStyle = eyeColor; }
    }
    g.strokeStyle = NAVY; g.lineWidth = 3.5;
    if (o.cheeks) { g.beginPath(); g.arc(0, 26, 6, 0, TAU); g.fillStyle = '#7a2340'; g.fill(); }
    else { g.beginPath(); g.moveTo(-10, 24); g.quadraticCurveTo(-5, 30, 0, 24); g.quadraticCurveTo(5, 30, 10, 24); g.stroke(); }
  }
  g.lineWidth = 5; g.strokeStyle = NAVY;
}

function drawUnicornHead(g, o, happy) {
  // mane behind
  const mane = ['#c9a0ff', '#ff9ccf', '#9fdcff', '#c9a0ff'];
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(s * (58 + (i % 2) * 8), -40 + i * 22, 22, 0, TAU); g.fillStyle = mane[(i + (s > 0 ? 1 : 0)) % 4]; g.fill(); g.stroke();
    }
  }
  // ears
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 30, -52); g.lineTo(s * 50, -92); g.lineTo(s * 58, -44); g.closePath(); g.fillStyle = '#fffaff'; g.fill(); g.stroke();
  }
  g.beginPath(); g.ellipse(0, 0, 62, 66, 0, 0, TAU); g.fillStyle = '#fffaff'; g.fill(); g.stroke();
  // horn
  g.beginPath(); g.moveTo(-14, -58); g.lineTo(0, -128); g.lineTo(14, -58); g.closePath(); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
  g.strokeStyle = '#e8a81c'; g.lineWidth = 3;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-10 + i * 3, -70 - i * 18); g.lineTo(8 - i * 3, -64 - i * 18); g.stroke(); }
  g.strokeStyle = NAVY; g.lineWidth = 5;
  // forelock
  g.beginPath(); g.arc(-18, -50, 20, 0, TAU); g.fillStyle = '#ff9ccf'; g.fill(); g.stroke();
  g.beginPath(); g.arc(14, -54, 16, 0, TAU); g.fillStyle = '#c9a0ff'; g.fill(); g.stroke();
  // snout
  const puff = o.cheeks || 0;
  g.beginPath(); g.ellipse(0, 30, 40 + puff * 8, 28 + puff * 3, 0, 0, TAU); g.fillStyle = '#ffe3f2'; g.fill(); g.lineWidth = 3; g.stroke(); g.lineWidth = 5;
  g.fillStyle = '#c98aa8'; g.beginPath(); g.ellipse(-12, 22, 4, 3, 0, 0, TAU); g.ellipse(12, 22, 4, 3, 0, 0, TAU); g.fill();
  // lashes + face
  drawFace(g, o, happy, NAVY);
  if (!happy) {
    g.lineWidth = 3;
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(s * (28 + k * 4), -16 - k); g.lineTo(s * (34 + k * 6), -24 - k * 2); g.stroke(); }
    g.lineWidth = 5;
  }
  g.fillStyle = 'rgba(255,111,160,0.45)';
  g.beginPath(); g.ellipse(-42, 14, 12, 7, 0, 0, TAU); g.ellipse(42, 14, 12, 7, 0, 0, TAU); g.fill();
  if (o.hat !== false) { g.save(); g.translate(0, -66); g.rotate(-0.12); drawHat(g); g.restore(); }
}

/** The unicorn's fancy hat, origin at the band centre (horn pokes through). */
export function drawHat(g) {
  g.save();
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, 0, 92, 22, 0, 0, TAU); g.fillStyle = '#ff9ccf'; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-50, 0); g.bezierCurveTo(-52, -60, 52, -60, 50, 0); g.closePath(); g.fillStyle = '#ffb3d9'; g.fill(); g.stroke();
  g.fillStyle = '#c9a0ff'; g.beginPath(); g.moveTo(-50, 0); g.bezierCurveTo(-50, -16, 50, -16, 50, 0); g.bezierCurveTo(50, 8, -50, 8, -50, 0); g.fill(); g.stroke();
  // flowers
  for (const [x, y, c] of [[-34, -10, '#fff'], [-16, -18, '#ffe066'], [-48, -24, '#ff6f91']]) {
    g.fillStyle = c;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + Math.cos(i * TAU / 5) * 8, y + Math.sin(i * TAU / 5) * 8, 7, 0, TAU); g.fill(); }
    g.fillStyle = '#ffb03f'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
  }
  // feather
  g.save(); g.translate(30, -30); g.rotate(0.6);
  g.beginPath(); g.ellipse(0, -30, 14, 38, 0, 0, TAU); g.fillStyle = '#9fdcff'; g.fill(); g.lineWidth = 3; g.stroke();
  g.beginPath(); g.moveTo(0, 6); g.lineTo(0, -64); g.stroke();
  g.restore();
  g.restore();
}

// ------------------------------------------------------------------ bubble

/** A wish bubble centred at (x, y) with a tail down to (tx, ty). */
export function drawBubble(g, x, y, r, tx, ty, glow, t) {
  g.save();
  if (glow) {
    const k = 0.6 + Math.sin(t * 10) * 0.25;
    const gr = g.createRadialGradient(x, y, r * 0.8, x, y, r * 1.6);
    gr.addColorStop(0, `rgba(255,226,90,${k})`); gr.addColorStop(1, 'rgba(255,226,90,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 1.6, 0, TAU); g.fill();
  }
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.fillStyle = '#ffffff';
  // tail: two little thought dots
  g.beginPath(); g.arc(lerpN(x, tx, 0.62), lerpN(y, ty, 0.62), 10, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(lerpN(x, tx, 0.85), lerpN(y, ty, 0.85), 6, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = glow ? '#ffb000' : NAVY; g.stroke();
  g.restore();
}
const lerpN = (a, b, k) => a + (b - a) * k;

// ------------------------------------------------------------------ cart

/** Treat trolley, origin at bottom centre (x, 1060). Shelf top at y-198. */
export function drawCart(g, x, y, t) {
  if (drawArt(g, 'prop/tea-cart', x, y, 460, 290, { anchor: 'bottom' })) return;
  g.save(); g.translate(x, y);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  // wheels
  for (const s of [-1, 1]) {
    g.beginPath(); g.arc(s * 160, -26, 24, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
    g.beginPath(); g.arc(s * 160, -26, 8, 0, TAU); g.fillStyle = '#ff7ac6'; g.fill(); g.stroke();
  }
  // legs
  g.fillStyle = '#9be3c8';
  for (const s of [-1, 1]) { ui.roundRect(g, s * 196 - 10, -206, 20, 180, 8); g.fill(); g.stroke(); }
  // lower shelf
  ui.roundRect(g, -218, -92, 436, 26, 12); g.fillStyle = '#b8f0dc'; g.fill(); g.stroke();
  // goodies on the lower shelf (decor)
  for (let i = 0; i < 5; i++) { g.fillStyle = ['#ff9ccf', '#ffe066', '#9fdcff', '#c9a0ff', '#ffb86f'][i]; g.beginPath(); g.arc(-150 + i * 75, -108, 18, Math.PI, 0); g.fill(); g.lineWidth = 3; g.stroke(); g.lineWidth = 6; }
  // top shelf (the treats sit on it at -198)
  ui.roundRect(g, -228, -204, 456, 34, 14); g.fillStyle = '#7fd8b6'; g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.45)'; ui.roundRect(g, -214, -200, 428, 8, 4); g.fill();
  // scalloped trim
  g.fillStyle = '#ff9ccf'; g.lineWidth = 3;
  for (let i = 0; i < 11; i++) { g.beginPath(); g.arc(-210 + i * 42, -170, 20, 0, Math.PI); g.fill(); g.stroke(); }
  // handle
  g.lineWidth = 8; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(-220, -200); g.quadraticCurveTo(-268, -230, -250, -270); g.stroke();
  g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ table

export const TABLE = { x: 240, y: 452, w: 1440, h: 160 };

export function drawTable(g) {
  const T = TABLE;
  if (drawArt(g, 'prop/tea-table', T.x + T.w / 2, T.y + T.h / 2, T.w, T.h, { fit: 'stretch' })) return;
  g.save();
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  // skirt
  g.beginPath(); g.moveTo(T.x, T.y + 40);
  g.lineTo(T.x + T.w, T.y + 40); g.lineTo(T.x + T.w + 6, T.y + T.h - 18);
  for (let x = T.x + T.w; x > T.x; x -= 48) g.quadraticCurveTo(x - 24, T.y + T.h + 12, x - 48, T.y + T.h - 18);
  g.closePath();
  g.fillStyle = '#ffd6ea'; g.fill();
  // gingham
  g.save(); g.clip();
  g.fillStyle = 'rgba(255,111,177,0.35)';
  for (let x = T.x; x < T.x + T.w + 40; x += 48) g.fillRect(x, T.y, 24, T.h + 20);
  for (let y = T.y + 40; y < T.y + T.h + 20; y += 48) g.fillRect(T.x - 10, y, T.w + 20, 24);
  g.restore();
  g.stroke();
  // lace hem dots
  g.fillStyle = '#fff';
  for (let x = T.x + 24; x < T.x + T.w; x += 48) { g.beginPath(); g.arc(x, T.y + T.h - 2, 7, 0, TAU); g.fill(); }
  // top
  g.beginPath(); g.moveTo(T.x + 30, T.y); g.lineTo(T.x + T.w - 30, T.y); g.lineTo(T.x + T.w + 6, T.y + 42); g.lineTo(T.x - 6, T.y + 42); g.closePath();
  g.fillStyle = '#fff3f9'; g.fill(); g.stroke();
  g.restore();
}

export function drawTeapot(g, x, y, s, t) {
  g.save(); g.translate(x, y);
  const wob = Math.sin(t * 3) * 0.04;
  g.rotate(wob);
  if (drawArt(g, 'prop/tea-teapot', 0, 0, 170 * s, 150 * s, { anchor: 'bottom' })) { g.restore(); return; }
  g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  // spout + handle
  g.beginPath(); g.moveTo(40, -50); g.quadraticCurveTo(84, -60, 86, -96); g.lineTo(72, -98); g.quadraticCurveTo(66, -70, 34, -70); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-58, -62, 22, 28, 0, 0, TAU); g.lineWidth = 9; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, -56, 58, 52, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.stroke();
  for (const [rx, ry] of [[-22, -60], [18, -44], [10, -80]]) { g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(rx, ry, 8, 0, TAU); g.fill(); g.fillStyle = '#3fc75a'; g.beginPath(); g.ellipse(rx + 10, ry + 4, 6, 3, 0.5, 0, TAU); g.fill(); }
  g.beginPath(); g.ellipse(0, -104, 30, 9, 0, 0, TAU); g.fillStyle = '#ffd6ea'; g.fill(); g.stroke();
  g.beginPath(); g.arc(0, -116, 9, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, -4, 38, 8, 0, 0, TAU); g.fillStyle = '#ffd6ea'; g.fill(); g.stroke();
  // steam
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 6;
  g.beginPath(); for (let k = 0; k < 30; k += 2) g.lineTo(86 + Math.sin(k * 0.3 + t * 4) * 6, -104 - k * 1.6); g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ garden

let bgCache = null;
/** Static garden backdrop, rendered once to an offscreen canvas. */
export function drawGarden(g, t) {
  const bg = art('bg/tea-party');
  if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
  if (!bgCache) {
    bgCache = document.createElement('canvas'); bgCache.width = W; bgCache.height = H;
    paintGarden(bgCache.getContext('2d'));
  }
  g.drawImage(bgCache, 0, 0);
  // bunting sways
  const cols = ['#ff7ac6', '#ffd23f', '#7fd3ff', '#8be8b8', '#c9a0ff', '#ffb86f'];
  for (let row = 0; row < 2; row++) {
    const y0 = 120 + row * 6, sag = 70 - row * 10, x0 = row ? 960 : 0, x1 = row ? W : 960;
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath();
    for (let x = x0; x <= x1; x += 20) { const k = (x - x0) / (x1 - x0); g.lineTo(x, y0 + Math.sin(k * Math.PI) * sag); }
    g.stroke();
    for (let x = x0 + 30, i = 0; x < x1 - 10; x += 64, i++) {
      const k = (x - x0) / (x1 - x0), y = y0 + Math.sin(k * Math.PI) * sag;
      g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2 + i) * 0.12);
      g.beginPath(); g.moveTo(-22, 0); g.lineTo(22, 0); g.lineTo(0, 44); g.closePath();
      g.fillStyle = cols[(i + row * 3) % cols.length]; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      g.restore();
    }
  }
}

function paintGarden(g) {
  ui.sky(g, '#8fd3ff', '#e6f6ff', 620);
  g.fillStyle = '#e6f6ff'; g.fillRect(0, 620, W, H);
  for (const [x, y, s] of [[300, 210, 1.1], [820, 160, 0.9], [1500, 230, 1.2], [1180, 300, 0.7]]) ui.cloud(g, x, y, s, '#fff', 0.9);
  // distant hedge + arch
  ui.hills(g, 520, '#9fe0a6', 30, 0.004, 1);
  g.save(); g.lineWidth = 16; g.strokeStyle = '#fff';
  g.beginPath(); g.moveTo(870, 520); g.lineTo(870, 380); g.arc(960, 380, 90, Math.PI, 0); g.lineTo(1050, 520); g.stroke();
  g.fillStyle = '#ff9ccf';
  for (let i = 0; i < 14; i++) { const a = Math.PI + (i / 13) * Math.PI; g.beginPath(); g.arc(960 + Math.cos(a) * 90, 380 + Math.sin(a) * 90, 12, 0, TAU); g.fill(); }
  g.restore();
  // blossom trees
  for (const [x, s] of [[120, 1.1], [1800, 1.15]]) {
    g.fillStyle = '#9a6a48'; g.fillRect(x - 22 * s, 300, 44 * s, 330);
    for (const [dx, dy, r, c] of [[-90, 230, 120, '#ffc2e0'], [80, 210, 130, '#ffb3d9'], [0, 130, 140, '#ffd6ea'], [-30, 290, 110, '#ffb3d9'], [90, 320, 90, '#ffc2e0']]) {
      g.fillStyle = c; g.beginPath(); g.arc(x + dx * s, dy, r * s, 0, TAU); g.fill();
    }
    g.fillStyle = '#fff';
    for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(x + Math.cos(i * 2.1) * (60 + (i * 13) % 110) * s, 220 + Math.sin(i * 1.7) * 110, 6, 0, TAU); g.fill(); }
  }
  // rose bushes along the hedge
  for (let i = 0; i < 9; i++) {
    const x = 300 + i * 165;
    g.fillStyle = '#6cc77a'; g.beginPath(); g.arc(x, 540, 56, Math.PI, 0); g.fill();
    g.fillStyle = ['#ff6f91', '#fff', '#ffd23f'][i % 3];
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x - 34 + k * 17, 510 + (k % 2) * 16, 9, 0, TAU); g.fill(); }
  }
  // lawn with mowing stripes
  const gr = g.createLinearGradient(0, 540, 0, H);
  gr.addColorStop(0, '#9ee68a'); gr.addColorStop(1, '#6fd16a');
  g.fillStyle = gr; g.fillRect(0, 540, W, H - 540);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(i * 200 - 300, H); g.lineTo(i * 200 - 60, H); g.lineTo(i * 200 + 60, 540); g.lineTo(i * 200 - 40, 540); g.closePath(); g.fill(); }
  // daisies
  for (let i = 0; i < 60; i++) {
    const x = (i * 331) % W, y = 640 + ((i * 97) % 420);
    g.fillStyle = '#fff';
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.256) * 6, y + Math.sin(k * 1.256) * 6, 4.5, 0, TAU); g.fill(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
  }
}
