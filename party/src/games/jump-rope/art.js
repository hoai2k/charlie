// Jump Rope Jamboree - procedural art: the two rope-turning bunnies, the
// park background, the candy-striped rope and the thumbnail. Every piece looks
// up generated art first (art()/drawArt()) and falls back to these drawings.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { drawHeartShape, starPath, drawEmote } from '../../engine/emotes.js';
import { TAU, clamp } from '../../engine/util.js';

export const NAVY = '#24163f';

export const BUNNIES = [
  { key: 'prop/jump-rope-bunny-pink', fur: '#ffd6e8', shade: '#f4a9cb', inner: '#ff8fbf', outfit: '#ff5fa2', outfitDark: '#d83c82', dot: '#ffffff', bow: '#ffd23f' },
  { key: 'prop/jump-rope-bunny-mint', fur: '#e4fbf1', shade: '#a9e6cf', inner: '#ff9fc4', outfit: '#3fb8ff', outfitDark: '#1f86c9', dot: '#ffe66d', bow: '#b673ff' },
];
export const ROPE_COLORS = [
  { base: '#ffffff', stripe: '#ff4d6d', back: '#ece6f5', backStripe: '#d0375a', handle: '#ff5fa2' },
  { base: '#ffffff', stripe: '#35a7ff', back: '#e6eef8', backStripe: '#2878c4', handle: '#3fb8ff' },
];
export const GOLD_ROPE = { base: '#fff4b0', stripe: '#ffb000', back: '#f2e3a0', backStripe: '#d89400', handle: '#ffd23f' };

const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------------------
// Bunny turner. (x, y) = between the feet on the ground; s = scale (1 is
// ~300 px tall). o: { t, facing, pal, mood, hands: [{x,y}, {x,y}], bob }
// The arms reach from the shoulders to the hand points (world space), so the
// rope handles stay glued to the paws.

export function drawBunny(g, x, y, s, o) {
  const pal = o.pal, f = o.facing || 1, t = o.t || 0, mood = o.mood || 'happy';
  const bob = o.bob || 0;
  // shadow
  g.save(); g.globalAlpha = 0.25; g.fillStyle = '#1b1030';
  g.beginPath(); g.ellipse(x, y + 4, 95 * s, 18 * s, 0, 0, TAU); g.fill(); g.restore();

  const bodyY = y - bob * s;
  const generated = !!art(pal.key);
  // Generated 600x660 bodies: shoulders (343,370)/(249,367), feet (300,660).
  // Include the same 4px body offset used by the image below.
  const sh = { x: x + (generated ? 21.5 : 34) * f * s, y: bodyY - (generated ? 141 : 168) * s };
  const sh2 = { x: x + (generated ? -25.5 : 4) * f * s, y: bodyY - (generated ? 142.5 : 172) * s };
  const hands = o.hands || [];

  // far arm (behind the body)
  if (hands[1]) drawArm(g, sh2, hands[1], s, pal, true);

  // Generated art faces right; mirrored for the right-hand bunny.
  // Mood faces: an optional variant (`<key>-cheer|sneaky|oops`, same canvas)
  // replaces the body; otherwise the plain body is drawn and the mood reads
  // from the emote added after the near arm (the painted face never changes).
  let drewArt = false;
  if (generated) {
    const moodKey = mood === 'excited' ? 'cheer' : mood;
    const key = mood !== 'happy' && art(pal.key + '-' + moodKey) ? pal.key + '-' + moodKey : pal.key;
    g.save(); g.translate(x, bodyY + 4 * s); g.scale(f, 1); drewArt = drawArt(g, key, 0, 0, 300 * s, 330 * s, { anchor: 'bottom' }); g.restore();
  }
  if (!drewArt) {
    g.save(); g.translate(x, bodyY); g.scale(s * f, s);
    g.lineJoin = 'round'; g.lineCap = 'round';
    // ears
    const earSway = Math.sin(t * 3.1) * 0.06 + (mood === 'oops' ? 0.55 : 0) + (mood === 'cheer' ? -0.12 : 0);
    for (const side of [-1, 1]) {
      g.save(); g.translate(side * 26, -268);
      g.rotate(side * (0.18 + earSway * (side > 0 ? 1.4 : 0.7)) + (side > 0 && mood !== 'cheer' ? 0.35 : 0));
      g.beginPath(); g.ellipse(0, -62, 25, 70, 0, 0, TAU);
      g.fillStyle = pal.fur; g.fill(); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.ellipse(0, -58, 12, 52, 0, 0, TAU); g.fillStyle = pal.inner; g.fill();
      g.restore();
    }
    // feet
    for (const side of [-1, 1]) {
      g.beginPath(); g.ellipse(side * 40 + 10, -12, 42, 20, 0, 0, TAU);
      g.fillStyle = pal.fur; g.fill(); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
    }
    // tail
    g.beginPath(); g.arc(-74, -78, 22, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
    // body
    g.beginPath(); g.ellipse(0, -108, 80, 96, 0, 0, TAU);
    g.fillStyle = pal.fur; g.fill(); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
    // outfit (pinafore / overalls) with dots
    g.save();
    g.beginPath(); g.ellipse(0, -108, 77, 93, 0, 0, TAU); g.clip();
    g.fillStyle = pal.outfit; g.fillRect(-90, -120, 180, 140);
    g.fillStyle = pal.outfitDark; g.fillRect(-90, -24, 180, 30);
    g.fillStyle = pal.dot;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-60 + (i % 5) * 30 + (i > 4 ? 15 : 0), -96 + (i > 4 ? 34 : 0), 6, 0, TAU); g.fill(); }
    g.restore();
    g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-77, -120); g.quadraticCurveTo(0, -108, 77, -120); g.stroke();
    // straps + buttons
    g.strokeStyle = pal.outfitDark; g.lineWidth = 12;
    g.beginPath(); g.moveTo(-34, -120); g.lineTo(-40, -178); g.moveTo(34, -120); g.lineTo(40, -178); g.stroke();
    g.fillStyle = '#ffe66d'; g.strokeStyle = NAVY; g.lineWidth = 3;
    for (const side of [-1, 1]) { g.beginPath(); g.arc(side * 34, -124, 7, 0, TAU); g.fill(); g.stroke(); }
    // head
    const hy = -228;
    g.beginPath(); g.ellipse(0, hy, 76, 66, 0, 0, TAU);
    g.fillStyle = pal.fur; g.fill(); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
    // bow between the ears
    g.save(); g.translate(-18, hy - 58); g.rotate(-0.25);
    g.fillStyle = pal.bow; g.strokeStyle = NAVY; g.lineWidth = 4;
    for (const side of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(side * 30, -26, side * 34, 0); g.quadraticCurveTo(side * 30, 24, 0, 0); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.stroke();
    g.restore();
    // cheeks
    g.fillStyle = 'rgba(255,120,170,0.45)';
    for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * 44 + 8, hy + 22, 16, 10, 0, 0, TAU); g.fill(); }
    // eyes
    const blink = (t * 0.8 + (pal === BUNNIES[1] ? 1.3 : 0)) % 3.7 > 3.58;
    for (const side of [-1, 1]) {
      const ex = side * 27 + 12, ey = hy - 6;
      g.strokeStyle = NAVY; g.lineWidth = 6;
      if (mood === 'oops') {
        g.beginPath(); g.moveTo(ex - 10, ey - 9); g.lineTo(ex + 2 * side, ey); g.lineTo(ex - 10, ey + 9); g.stroke();
      } else if (mood === 'cheer' || blink) {
        g.beginPath(); g.arc(ex, ey + 6, 11, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      } else {
        g.fillStyle = NAVY; g.beginPath(); g.ellipse(ex, ey, 11, 15, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex + 3, ey - 6, 4.5, 0, TAU); g.fill();
        if (mood === 'sneaky') { g.fillStyle = pal.fur; g.fillRect(ex - 14, ey - 18, 28, 14); g.beginPath(); g.moveTo(ex - 14, ey - 4); g.lineTo(ex + 14, ey - 4); g.stroke(); }
      }
    }
    // nose + mouth
    g.fillStyle = pal.inner; g.strokeStyle = NAVY; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(4, hy + 10); g.lineTo(20, hy + 10); g.lineTo(12, hy + 19); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 4;
    if (mood === 'cheer' || mood === 'oops') {
      g.beginPath(); g.ellipse(12, hy + 34, 13, mood === 'oops' ? 11 : 14, 0, 0, TAU); g.fillStyle = '#c2386c'; g.fill(); g.stroke();
    } else {
      g.beginPath(); g.moveTo(12, hy + 19); g.lineTo(12, hy + 25);
      g.moveTo(0, hy + 26); g.quadraticCurveTo(6, hy + 34, 12, hy + 25); g.quadraticCurveTo(18, hy + 34, 24, hy + 26); g.stroke();
      if (mood === 'sneaky') { g.beginPath(); g.moveTo(-6, hy + 24); g.quadraticCurveTo(12, hy + 40, 32, hy + 22); g.stroke(); }
    }
    // whiskers
    g.strokeStyle = 'rgba(36,22,63,0.55)'; g.lineWidth = 2.5;
    for (const side of [-1, 1]) for (const k of [-1, 1]) { g.beginPath(); g.moveTo(12 + side * 22, hy + 16 + k * 4); g.lineTo(12 + side * 52, hy + 12 + k * 10); g.stroke(); }
    if (mood === 'excited') { // sweat drop
      g.fillStyle = '#7fd6ff'; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-52, hy - 30); g.quadraticCurveTo(-40, hy - 6, -52, hy); g.quadraticCurveTo(-64, hy - 6, -52, hy - 30); g.fill(); g.stroke();
    }
    g.restore();
  }
  // near arm (in front of the body)
  if (hands[0]) drawArm(g, sh, hands[0], s, pal, false);
  if (drewArt) drawMoodEmote(g, x, bodyY + 4 * s, s, f, mood, o.moodAge ?? t);
}

// Emote beside a generated bunny's head. (x, y) = feet on the ground; image
// coords are in the 600x660 canvas (head ~x 180-410, y 170-360, facing right).
const MOOD_EMOTES = {
  sneaky: ['zzz', 425, 150, 66],      // "Sooo sleepy..." before the Gotcha! snap
  excited: ['sweat', 200, 215, 52],   // Super Speed
  oops: ['sweat', 200, 215, 52],      // a player got tangled
  cheer: ['sparkle', 320, 105, 76],
};
function drawMoodEmote(g, x, y, s, f, mood, age) {
  const e = MOOD_EMOTES[mood];
  if (!e) return;
  const [kind, ix, iy, size] = e;
  drawEmote(g, kind, x + (ix - 300) * 0.5 * s * f, y - (660 - iy) * 0.5 * s, size * s, age);
}

function drawArm(g, from, to, s, pal, far) {
  g.save();
  g.lineCap = 'round';
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2 + 18 * s;
  g.strokeStyle = NAVY; g.lineWidth = 34 * s;
  g.beginPath(); g.moveTo(from.x, from.y); g.quadraticCurveTo(mx, my, to.x, to.y); g.stroke();
  g.strokeStyle = far ? pal.shade : pal.fur; g.lineWidth = 23 * s;
  g.beginPath(); g.moveTo(from.x, from.y); g.quadraticCurveTo(mx, my, to.x, to.y); g.stroke();
  g.fillStyle = far ? pal.shade : pal.fur; g.strokeStyle = NAVY; g.lineWidth = 5 * s;
  g.beginPath(); g.arc(to.x, to.y, 17 * s, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** Wooden rope handle at a paw, pointing along the rope. */
export function drawHandle(g, x, y, ang, color, s = 1) {
  if (drawArtRot(g, 'prop/jump-rope-handle', x, y, ang, 70 * s, 26 * s)) return;
  g.save(); g.translate(x, y); g.rotate(ang);
  ui.roundRect(g, -34 * s, -12 * s, 62 * s, 24 * s, 11 * s);
  g.fillStyle = color; g.fill(); g.lineWidth = 4 * s; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)'; ui.roundRect(g, -28 * s, -8 * s, 46 * s, 6 * s, 3 * s); g.fill();
  g.fillStyle = '#ffe66d'; g.beginPath(); g.arc(28 * s, 0, 8 * s, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

function drawArtRot(g, key, x, y, ang, w, h) {
  const img = art(key);
  if (!img) return false;
  g.save(); g.translate(x, y); g.rotate(ang); drawArt(g, key, 0, 0, w, h); g.restore();
  return true;
}

// ---------------------------------------------------------------------------
// Rope stroke through projected points [{x, y}]. depth01: -1 behind .. 1 front.

export function strokeRope(g, pts, o) {
  const col = o.colors, th = o.thick, front = o.depth01;
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.globalAlpha *= o.alpha ?? 1;
  const path = () => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); };
  if (o.glow) {
    path(); g.strokeStyle = 'rgba(255,220,90,0.35)'; g.lineWidth = th + 26; g.stroke();
  }
  path(); g.strokeStyle = NAVY; g.lineWidth = th + 6; g.stroke();
  path(); g.strokeStyle = front < 0 ? col.back : col.base; g.lineWidth = th; g.stroke();
  g.setLineDash([th * 1.1, th * 1.1]); g.lineDashOffset = o.twist || 0;
  path(); g.strokeStyle = front < 0 ? col.backStripe : col.stripe; g.lineWidth = th * 0.92; g.stroke();
  g.setLineDash([]);
  // shine along the top edge
  g.globalAlpha *= 0.45;
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y - th * 0.22); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y - th * 0.22);
  g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, th * 0.22); g.stroke();
  g.restore();
}

/** Faint motion-blur ghost of the rope. */
export function ghostRope(g, pts, th, alpha) {
  g.save(); g.globalAlpha *= alpha; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokeStyle = '#ffffff'; g.lineWidth = th; g.stroke(); g.restore();
}

// ---------------------------------------------------------------------------
// Background: a sunny park with a sandy jump mat and a picnic blanket for
// the cheering section. Built once into a canvas.

export function buildBackground(ground, blanket) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const img = art('bg/jump-rope');
  if (img) { g.drawImage(img, 0, 0, W, H); return cv; }
  // sky
  const sk = g.createLinearGradient(0, 0, 0, 640);
  sk.addColorStop(0, '#7fd0ff'); sk.addColorStop(0.7, '#c8eeff'); sk.addColorStop(1, '#eafaff');
  g.fillStyle = sk; g.fillRect(0, 0, W, 660);
  // sun
  const sun = g.createRadialGradient(1590, 230, 20, 1590, 230, 260);
  sun.addColorStop(0, 'rgba(255,248,190,1)'); sun.addColorStop(0.3, 'rgba(255,240,150,0.6)'); sun.addColorStop(1, 'rgba(255,240,150,0)');
  g.fillStyle = sun; g.fillRect(1300, 0, 600, 520);
  g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(1590, 230, 62, 0, TAU); g.fill();
  // hills
  ui.hills(g, 520, '#b6e7a4', 46, 0.0035, 1.2);
  ui.hills(g, 575, '#94d985', 36, 0.0051, 3.1);
  // trees along the horizon
  for (let i = 0; i < 15; i++) {
    const tx = 40 + i * 132 + hh(i) * 60, ty = 600 + hh(i + 9) * 20, r = 46 + hh(i + 3) * 26;
    if (tx > 760 && tx < 1160) continue;          // open sky behind the middle
    g.fillStyle = '#8a5a3a'; g.fillRect(tx - 8, ty - 30, 16, 40);
    g.fillStyle = ['#4fb069', '#5cc073', '#46a35f'][i % 3]; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.arc(tx, ty - 60, r, 0, TAU); g.arc(tx - r * 0.6, ty - 40, r * 0.65, 0, TAU); g.arc(tx + r * 0.6, ty - 42, r * 0.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(tx - r * 0.3, ty - 80, r * 0.4, 0, TAU); g.fill();
    if (i % 3 === 0) for (let k = 0; k < 4; k++) { g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(tx + Math.cos(k * 1.7) * r * 0.6, ty - 60 + Math.sin(k * 2.3) * r * 0.5, 6, 0, TAU); g.fill(); }
  }
  // grass
  const gr = g.createLinearGradient(0, 600, 0, H);
  gr.addColorStop(0, '#8ee07a'); gr.addColorStop(1, '#58bf55');
  g.fillStyle = gr; g.fillRect(0, 615, W, H - 615);
  for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,80,0,0.04)'; g.fillRect(0, 615 + i * 34, W, 17); }
  // white picket fence
  const fy = 640;
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 3;
  g.fillRect(0, fy - 40, W, 10); g.strokeRect(-4, fy - 40, W + 8, 10);
  g.fillRect(0, fy - 16, W, 10); g.strokeRect(-4, fy - 16, W + 8, 10);
  for (let x = 10; x < W; x += 44) {
    g.beginPath(); g.moveTo(x, fy); g.lineTo(x, fy - 56); g.lineTo(x + 12, fy - 70); g.lineTo(x + 24, fy - 56); g.lineTo(x + 24, fy); g.closePath();
    g.fillStyle = '#ffffff'; g.fill(); g.stroke();
  }
  // bunting between the fence posts at the far edges
  drawBunting(g, 0, 300, W, 330, 26);
  // sandy jump mat (the "court")
  const my = ground + 6;
  g.fillStyle = 'rgba(36,22,63,0.12)'; g.beginPath(); g.ellipse(960, my + 10, 760, 132, 0, 0, TAU); g.fill();
  const mat = g.createRadialGradient(960, my - 20, 60, 960, my, 760);
  mat.addColorStop(0, '#fff2cc'); mat.addColorStop(1, '#f2d79a');
  g.fillStyle = mat; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.ellipse(960, my, 750, 124, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.setLineDash([18, 14]);
  g.beginPath(); g.ellipse(960, my, 690, 100, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  // chalk doodles on the mat
  g.save(); g.globalAlpha = 0.5;
  const doodles = [[520, my - 40, '#ff8fbf'], [1400, my + 40, '#7fd6ff'], [700, my + 70, '#ffd23f'], [1230, my - 64, '#b673ff']];
  doodles.forEach(([dx, dy, c], i) => { g.save(); g.translate(dx, dy); g.scale(1, 0.35); if (i % 2) { g.save(); g.scale(1.4, 1.4); drawHeartShape(g, 40, c); g.restore(); } else { starPath(g, 40); g.fillStyle = c; g.fill(); } g.restore(); });
  g.restore();
  // flowers in the foreground grass
  for (let i = 0; i < 26; i++) {
    const fx = hh(i + 40) * W, fy2 = 905 + hh(i + 70) * 160;
    if (fx > blanket.x0 - 30 && fx < blanket.x1 + 30 && fy2 > blanket.y0 - 20) continue;
    if (fx < 140 && fy2 > 950) continue;
    const c = ['#ff6f91', '#ffd23f', '#ffffff', '#b673ff', '#7fd6ff'][i % 5];
    g.strokeStyle = '#2f8f4e'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, fy2); g.lineTo(fx, fy2 - 16); g.stroke();
    for (let k = 0; k < 5; k++) { g.fillStyle = c; g.beginPath(); g.arc(fx + Math.cos(k * 1.256) * 7, fy2 - 20 + Math.sin(k * 1.256) * 7, 6, 0, TAU); g.fill(); }
    g.fillStyle = '#ffb000'; g.beginPath(); g.arc(fx, fy2 - 20, 4, 0, TAU); g.fill();
  }
  // picnic blanket for the cheering section
  if (!drawArt(g, 'prop/jump-rope-blanket', (blanket.x0 + blanket.x1) / 2, (blanket.y0 + blanket.y1) / 2, blanket.x1 - blanket.x0 + 40, blanket.y1 - blanket.y0 + 30, { fit: 'stretch' })) {
    const { x0, y0, x1, y1 } = blanket;
    g.save();
    g.beginPath(); g.moveTo(x0 + 30, y0); g.lineTo(x1 - 30, y0); g.lineTo(x1 + 20, y1); g.lineTo(x0 - 20, y1); g.closePath();
    g.fillStyle = '#fff4f8'; g.fill();
    g.clip();
    g.fillStyle = 'rgba(255,95,162,0.45)';
    for (let x = x0 - 40; x < x1 + 40; x += 56) g.fillRect(x, y0, 28, y1 - y0);
    for (let y = y0; y < y1; y += 36) g.fillRect(x0 - 40, y, x1 - x0 + 80, 18);
    g.restore();
    g.beginPath(); g.moveTo(x0 + 30, y0); g.lineTo(x1 - 30, y0); g.lineTo(x1 + 20, y1); g.lineTo(x0 - 20, y1); g.closePath();
    g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  }
  return cv;
}

function drawBunting(g, x0, y0, x1, y1, n) {
  g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath();
  const pt = (u) => ({ x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 70 });
  for (let i = 0; i <= 40; i++) { const p = pt(i / 40); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
  g.stroke();
  const cols = ['#ff5fa2', '#ffd23f', '#3fb8ff', '#7be04d', '#b673ff'];
  for (let i = 0; i < n; i++) {
    const a = pt((i + 0.25) / n), b = pt((i + 0.75) / n);
    g.fillStyle = cols[i % cols.length];
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 40); g.closePath(); g.fill(); g.stroke();
  }
}

/** Drifting clouds (drawn live over the cached sky). */
export function drawClouds(g, t) {
  for (let i = 0; i < 5; i++) {
    const x = ((i * 470 + t * (12 + i * 4)) % (W + 400)) - 200, y = 150 + (i % 3) * 70 + hh(i) * 40;
    ui.cloud(g, x, y, 0.9 + hh(i + 5) * 0.6, '#ffffff', 0.9);
  }
}

// ---------------------------------------------------------------------------
// Thumbnail: two tiny bunnies turning a rope over a hopping heart buddy.

export function drawThumb(g, x, y, w, h, t = 0) {
  if (drawArt(g, 'thumb/jump-rope', x + w / 2, y + h / 2, w, h, { fit: 'cover' })) return;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const sk = g.createLinearGradient(0, y, 0, y + h);
  sk.addColorStop(0, '#7fd0ff'); sk.addColorStop(0.65, '#d8f3ff'); sk.addColorStop(0.66, '#8ee07a'); sk.addColorStop(1, '#58bf55');
  g.fillStyle = sk; g.fillRect(x, y, w, h);
  ui.cloud(g, x + w * 0.25, y + h * 0.2, h / 500, '#fff', 0.9);
  ui.cloud(g, x + w * 0.78, y + h * 0.14, h / 600, '#fff', 0.9);
  const gy = y + h * 0.84, cx = x + w / 2;
  g.fillStyle = '#f6e2b0'; g.strokeStyle = NAVY; g.lineWidth = h * 0.012;
  g.beginPath(); g.ellipse(cx, gy, w * 0.36, h * 0.07, 0, 0, TAU); g.fill(); g.stroke();
  const s = h / 560, th = (t * 4) % TAU;
  const hl = { x: x + w * 0.2, y: gy - h * 0.3 }, hr = { x: x + w * 0.8, y: gy - h * 0.3 };
  const ropeAt = (k) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, r = h * 0.36 * Math.pow(Math.sin(Math.PI * u), 0.45) + h * 0.03;
      const hgt = h * 0.3 + Math.cos(k) * r, d = Math.sin(k) * r;
      pts.push({ x: hl.x + (hr.x - hl.x) * u, y: gy - Math.max(0, hgt) + d * 0.45 });
    }
    return pts;
  };
  const front = Math.sin(th) > 0;
  const pts = ropeAt(th);
  if (!front) strokeRope(g, pts, { colors: ROPE_COLORS[0], thick: h * 0.024, depth01: -1, twist: -th * 20 });
  // hopping heart buddy
  const hop = Math.max(0, Math.sin(th - Math.PI / 2 + 0.6)) * h * 0.16;
  g.fillStyle = 'rgba(36,22,63,0.25)'; g.beginPath(); g.ellipse(cx, gy, h * 0.07, h * 0.018, 0, 0, TAU); g.fill();
  g.save(); g.translate(cx, gy - h * 0.12 - hop); drawHeartShape(g, h * 0.22, '#ff5fa2');
  g.fillStyle = NAVY; g.beginPath(); g.arc(-h * 0.035, -h * 0.03, h * 0.012, 0, TAU); g.arc(h * 0.035, -h * 0.03, h * 0.012, 0, TAU); g.fill();
  g.restore();
  drawBunny(g, x + w * 0.1, gy + h * 0.02, s * 0.55, { pal: BUNNIES[0], facing: 1, t, hands: [hl] });
  drawBunny(g, x + w * 0.9, gy + h * 0.02, s * 0.55, { pal: BUNNIES[1], facing: -1, t, hands: [hr] });
  if (front) strokeRope(g, pts, { colors: ROPE_COLORS[0], thick: h * 0.03, depth01: 1, twist: -th * 20 });
  for (let i = 0; i < 4; i++) {
    g.save(); g.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 3 + i * 1.7));
    g.translate(x + w * (0.3 + i * 0.13), y + h * (0.18 + (i % 2) * 0.12)); starPath(g, h * 0.035, 0.45); g.fillStyle = '#fff6a8'; g.fill();
    g.restore();
  }
  g.restore();
}

export { clamp };
