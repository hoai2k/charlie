// Procedural art for Prank the Sleeping Troll (prank-troll). Every piece has an
// art() hook in the game file; these are the fallbacks that ship today.
// The troll is drawn in "image space" (900 x 760, like prop/ptroll-troll-asleep)
// so pranks land on the same spots whether the art is procedural or generated.
import { W, H } from '../../engine/canvas.js';
import { TAU, clamp } from '../../engine/util.js';

export const NAVY = '#24163f';
export const TROLL = { x: 960, y: 720, w: 600, h: 507 };   // bottom-centre anchor + drawn size
export const IMG_W = 900, IMG_H = 760;
const SKIN = '#9aa45a', SKIN_D = '#7d8744', SPOT = '#6f7a3a', HAIR = '#4a2e1f', HAIR_L = '#6b4430';

// Anchor points in image space (fractions in the image request).
export const A = {
  face: [450, 205], eyeL: [396, 182], eyeR: [504, 182], nose: [450, 228], tache: [450, 258],
  earL: [279, 198], earR: [621, 198], top: [450, 46], hairL: [324, 122], hairR: [576, 122],
  chin: [450, 319], toeL: [243, 699], toeR: [657, 699], mouth: [450, 292],
};
export const FLOWER_SPOTS = [[324, 122], [576, 122], [384, 66], [516, 66], [292, 186], [608, 186], [450, 40], [356, 250], [544, 250]];
export const BOW_SPOTS = [[279, 198], [621, 198], [352, 92], [548, 92]];
export const FLOWER_COLS = ['#ff7ac6', '#ffd23f', '#7fc8ff', '#ff9f43', '#c58bff', '#ffffff'];
export const TOE_COLS = ['#ff5fa8', '#ff9fd2', '#c58bff', '#7fc8ff', '#ffd23f'];

/** Screen position of an image-space point (with the troll's current bob). */
export function toScreen(pt, sway = 0, bob = 0) {
  const s = TROLL.w / IMG_W;
  return { x: TROLL.x - TROLL.w / 2 + pt[0] * s + sway * (1 - pt[1] / IMG_H) * 30, y: TROLL.y - TROLL.h + pt[1] * s + bob * (1 - pt[1] / IMG_H) };
}

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function ink(g, w = 5) { g.strokeStyle = NAVY; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
function blob(g, x, y, rx, ry, fill, w = 6) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); ink(g, w); }

// --- meadow --------------------------------------------------------------------------------
let bgCache = null;
export function meadowBackground() {
  if (bgCache) return bgCache;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#8fd6ff'); sky.addColorStop(1, '#d4f1ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, 300);
  // far hills
  g.fillStyle = '#9fdc7a'; g.beginPath(); g.moveTo(0, 300);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, 250 - Math.sin(x * 0.004) * 40 - Math.sin(x * 0.011) * 15);
  g.lineTo(W, 330); g.lineTo(0, 330); g.fill();
  // lawn
  const lawn = g.createLinearGradient(0, 260, 0, H);
  lawn.addColorStop(0, '#7fd35f'); lawn.addColorStop(1, '#5fbf4a');
  g.fillStyle = lawn; g.fillRect(0, 280, W, H - 280);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(0, 330 + k * 90); g.lineTo(W, 300 + k * 90); g.lineTo(W, 345 + k * 90); g.lineTo(0, 375 + k * 90); g.fill(); }
  // tree crown + trunk (the troll sits against it)
  g.fillStyle = '#8a5a3c';
  g.beginPath(); g.moveTo(820, 600); g.quadraticCurveTo(860, 400, 850, 120); g.lineTo(1070, 120); g.quadraticCurveTo(1060, 400, 1100, 600); g.closePath(); g.fill(); ink(g, 7);
  g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 4;
  for (const x of [900, 960, 1020]) { g.beginPath(); g.moveTo(x, 160); g.quadraticCurveTo(x + 10, 350, x - 6, 560); g.stroke(); }
  // roots
  g.fillStyle = '#8a5a3c';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(960 + s * 120, 560); g.quadraticCurveTo(960 + s * 220, 600, 960 + s * 270, 640); g.lineTo(960 + s * 140, 610); g.closePath(); g.fill(); ink(g, 5); }
  const leaf = ['#4caf50', '#5cc35a', '#3e9d46'];
  const clumps = [[620, 90, 190], [800, 40, 200], [960, 20, 220], [1120, 40, 200], [1300, 90, 190], [700, 180, 150], [1220, 180, 150], [960, 140, 170]];
  for (const [x, y, r] of clumps) { g.fillStyle = leaf[(x / 10) % 3 | 0]; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  g.strokeStyle = NAVY; g.lineWidth = 6;
  for (const [x, y, r] of clumps) { g.beginPath(); g.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.12)';
  for (const [x, y, r] of clumps) { g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, TAU); g.fill(); }
  // apples
  for (const [x, y] of [[700, 120], [860, 200], [1080, 90], [1240, 160], [990, 230]]) blob(g, x, y, 16, 16, '#ff4d6d', 4);
  // side bushes and flowers
  for (const [x, y, r] of [[60, 330, 120], [1860, 330, 120], [40, 640, 100], [1890, 620, 110]]) {
    g.fillStyle = '#4caf50'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.arc(x + r * 0.7, y + 20, r * 0.7, 0, TAU); g.fill();
  }
  // daisies + buttercups
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let k = 0; k < 120; k++) {
    const x = rnd() * W, y = 300 + rnd() * (H - 300);
    if (Math.abs(x - 960) < 380 && y < 720) continue;
    const s = 0.6 + rnd() * 0.6;
    if (rnd() < 0.6) {
      g.fillStyle = '#ffffff';
      for (let p = 0; p < 6; p++) { const a = (p / 6) * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 7 * s, y + Math.sin(a) * 5 * s, 5 * s, 3.4 * s, a, 0, TAU); g.fill(); }
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 3.5 * s, 0, TAU); g.fill();
    } else {
      g.fillStyle = 'rgba(40,120,40,0.5)'; g.beginPath(); g.ellipse(x, y, 10 * s, 4 * s, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(x, y - 3, 5 * s, 0, TAU); g.fill();
    }
  }
  bgCache = c;
  return c;
}

// --- troll -------------------------------------------------------------------------------------
/**
 * The sleeping troll with every prank on him. st: { eyeL, eyeR (0 shut..1 open), look (-1..1),
 * mouth (0..1 snore open), laugh (bool), sway, bob, tickle (0..1), sneeze (0..1) }.
 * P: prank state { tache, flowers: [col...], bows, hats, glitter, toes, feather }.
 */
export function drawTroll(g, st, P, t, imgAsleep, imgAwake) {
  const s = TROLL.w / IMG_W;
  g.save();
  g.translate(TROLL.x - TROLL.w / 2, TROLL.y - TROLL.h);
  g.scale(s, s);
  // breathing: whole body bob + sway, applied with the head moving most
  g.translate(IMG_W / 2, IMG_H);
  g.rotate(st.sway * 0.03);
  g.scale(1 + st.breath * 0.012, 1 - st.breath * 0.008);
  g.translate(-IMG_W / 2, -IMG_H);
  const img = st.awake ? imgAwake : imgAsleep;
  if (img) g.drawImage(img, 0, 0, IMG_W, IMG_H);
  else bodyArt(g, st, t);
  drawPranks(g, st, P, t);
  g.restore();
}

function bodyArt(g, st, t) {
  // hair mass behind
  g.fillStyle = HAIR;
  g.beginPath();
  g.moveTo(450, 20);
  g.bezierCurveTo(240, 20, 200, 200, 210, 380); g.lineTo(250, 360); g.lineTo(240, 410); g.lineTo(300, 380);
  g.lineTo(600, 380); g.lineTo(660, 410); g.lineTo(650, 360); g.lineTo(690, 380);
  g.bezierCurveTo(700, 200, 660, 20, 450, 20); g.closePath(); g.fill(); ink(g, 7);
  // legs stretched towards us
  for (const sd of [-1, 1]) {
    const fx = 450 + sd * 250;
    g.fillStyle = SKIN;
    g.beginPath(); g.moveTo(450 + sd * 70, 520); g.quadraticCurveTo(450 + sd * 260, 520, fx + sd * 40, 600); g.lineTo(fx - sd * 70, 640); g.quadraticCurveTo(450 + sd * 120, 600, 450 + sd * 40, 590); g.closePath(); g.fill(); ink(g, 6);
  }
  // body + belly
  blob(g, 450, 410, 245, 190, SKIN, 7);
  g.fillStyle = SPOT;
  for (const [x, y, r] of [[300, 360, 16], [610, 380, 14], [340, 470, 10], [580, 470, 12], [420, 330, 9], [520, 340, 8], [260, 430, 9], [640, 440, 9]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  blob(g, 450, 445, 150, 120, '#b2ba72', 0);
  // loincloth
  g.fillStyle = '#8a4b2a';
  g.beginPath(); g.moveTo(290, 540); g.lineTo(610, 540); g.lineTo(590, 610);
  for (let x = 590; x > 300; x -= 36) { g.lineTo(x - 18, 640); g.lineTo(x - 36, 605); }
  g.closePath(); g.fill(); ink(g, 6);
  // feet (seen from above, toes towards us)
  for (const sd of [-1, 1]) {
    const fx = sd < 0 ? 200 : 700;
    blob(g, fx, 640, 92, 82, SKIN, 6);
    for (let k = 0; k < 5; k++) {
      const tx = fx - sd * (-45 + k * 32) * 1, ty = 700 - k * 5;
      const r = k === 0 ? 24 : 18 - k * 1.2;
      blob(g, tx, ty, r, r * 0.9, SKIN, 4);
    }
  }
  // arms folded on the belly
  for (const sd of [-1, 1]) {
    g.fillStyle = SKIN;
    g.beginPath(); g.moveTo(450 + sd * 230, 300); g.quadraticCurveTo(450 + sd * 300, 420, 450 + sd * 200, 480); g.lineTo(450 - sd * 20, 470); g.lineTo(450 - sd * 20, 420); g.lineTo(450 + sd * 150, 410); g.quadraticCurveTo(450 + sd * 200, 360, 450 + sd * 170, 300); g.closePath(); g.fill(); ink(g, 6);
  }
  for (const sd of [-1, 1]) blob(g, 450 - sd * 40, 450, 46, 34, SKIN, 5);
  // head
  blob(g, 450, 210, 140, 150, SKIN, 7);
  g.fillStyle = SPOT;
  for (const [x, y, r] of [[360, 150, 10], [540, 140, 8], [380, 270, 7], [530, 280, 9]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  // ears
  for (const sd of [-1, 1]) {
    const [ex, ey] = sd < 0 ? A.earL : A.earR;
    g.fillStyle = SKIN; g.beginPath(); g.moveTo(ex + sd * 30, ey - 30); g.lineTo(ex - sd * 30, ey - 6); g.lineTo(ex + sd * 20, ey + 32); g.closePath(); g.fill(); ink(g, 5);
  }
  // fringe
  g.fillStyle = HAIR;
  g.beginPath(); g.moveTo(310, 140);
  for (let k = 0; k <= 8; k++) { const x = 310 + k * 35; g.quadraticCurveTo(x + 10, 60, x + 17, k % 2 ? 120 : 108); }
  g.lineTo(590, 60); g.quadraticCurveTo(450, -10, 310, 60); g.closePath(); g.fill(); ink(g, 6);
  g.strokeStyle = HAIR_L; g.lineWidth = 6;
  for (const x of [360, 420, 480, 540]) { g.beginPath(); g.moveTo(x, 40); g.quadraticCurveTo(x + 10, 70, x - 4, 100); g.stroke(); }
  // brows
  g.strokeStyle = HAIR; g.lineWidth = 12; g.lineCap = 'round';
  const browUp = st.eyeR * 14;
  g.beginPath(); g.moveTo(360, 160 - st.eyeL * 10); g.lineTo(424, 156 - st.eyeL * 10); g.stroke();
  g.beginPath(); g.moveTo(476, 156 - browUp); g.lineTo(540, 160 - browUp); g.stroke();
  // eyes
  for (const [k, [ex, ey]] of [[st.eyeL, A.eyeL], [st.eyeR, A.eyeR]]) {
    if (k < 0.08) {
      g.strokeStyle = NAVY; g.lineWidth = 6;
      g.beginPath(); g.arc(ex, ey - 6, 22, 0.25, Math.PI - 0.25); g.stroke();
    } else {
      g.fillStyle = '#fffbe8'; g.beginPath(); g.ellipse(ex, ey, 26, 26 * k, 0, 0, TAU); g.fill(); ink(g, 5);
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(ex + st.look * 9, ey + 2, 10, Math.min(10, 26 * k), 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex + st.look * 9 + 3, ey - 3, 3, 0, TAU); g.fill();
    }
  }
  // nose
  blob(g, A.nose[0], A.nose[1] + 4, 34, 28, SKIN_D, 5);
  g.fillStyle = NAVY; g.beginPath(); g.arc(436, 238, 5, 0, TAU); g.arc(464, 238, 5, 0, TAU); g.fill();
  // mouth
  if (st.laugh) {
    g.fillStyle = '#7a2a3a'; g.beginPath(); g.moveTo(380, 280); g.quadraticCurveTo(450, 380, 520, 280); g.closePath(); g.fill(); ink(g, 5);
    g.fillStyle = '#ff8fa8'; g.beginPath(); g.ellipse(450, 322, 30, 14, 0, 0, TAU); g.fill();
    g.fillStyle = '#fffbe8'; g.beginPath(); g.moveTo(400, 282); g.lineTo(410, 300); g.lineTo(420, 284); g.moveTo(480, 284); g.lineTo(490, 300); g.lineTo(500, 282); g.fill();
  } else {
    const m = 6 + st.mouth * 22;
    g.fillStyle = '#7a2a3a'; g.beginPath(); g.ellipse(A.mouth[0], A.mouth[1] + 6, 26, m, 0, 0, TAU); g.fill(); ink(g, 5);
  }
  // scruffy beard
  g.fillStyle = HAIR_L;
  g.beginPath(); g.moveTo(380, 312);
  for (let k = 0; k <= 7; k++) g.lineTo(380 + k * 20, 330 + (k % 2) * 22);
  g.lineTo(520, 312); g.quadraticCurveTo(450, 340, 380, 312); g.closePath(); g.fill(); ink(g, 4);
}

function flower(g, x, y, r, col, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2 + x) * 0.15);
  g.fillStyle = col;
  for (let p = 0; p < 6; p++) { const a = (p / 6) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.5, r * 0.32, a, 0, TAU); g.fill(); }
  g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * 1.05, 0, TAU); g.globalAlpha = 0; g.stroke(); g.globalAlpha = 1;
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, r * 0.32, 0, TAU); g.fill(); ink(g, 3);
  g.restore();
}
export function drawFlower(g, x, y, r, col, t) { flower(g, x, y, r, col, t); }

export function drawBow(g, x, y, s, rot = 0, col = '#ff7ac6') {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = col;
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sd * 40, -36, sd * 56, -8); g.quadraticCurveTo(sd * 50, 30, 0, 0); g.fill(); ink(g, 4); }
  g.fillStyle = '#ffffff';
  for (const [dx, dy] of [[-30, -10], [30, -6], [-40, 6], [38, 10]]) { g.beginPath(); g.arc(dx, dy, 4, 0, TAU); g.fill(); }
  g.fillStyle = col; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill(); ink(g, 4);
  g.restore();
}

export function drawHat(g, x, y, s, rot, t) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = '#ff7ac6';
  g.beginPath(); g.moveTo(-60, 0); g.lineTo(0, -170); g.lineTo(60, 0); g.closePath(); g.fill();
  g.save(); g.clip();
  const cols = ['#ffd23f', '#7fc8ff'];
  for (let k = 0; k < 6; k++) { g.fillStyle = cols[k % 2]; g.beginPath(); g.moveTo(-80, -k * 34 + 10); g.lineTo(80, -k * 34 - 30); g.lineTo(80, -k * 34 - 14); g.lineTo(-80, -k * 34 + 26); g.fill(); }
  g.restore();
  g.beginPath(); g.moveTo(-60, 0); g.lineTo(0, -170); g.lineTo(60, 0); g.closePath(); ink(g, 5);
  blob(g, 0, -172, 20, 20, '#ffffff', 4);
  g.restore();
}

export function drawTache(g, x, y, w, t) {
  g.save(); g.translate(x, y); g.scale(w / 250, w / 250);
  g.strokeStyle = '#3a2214'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const sd of [-1, 1]) {
    g.lineWidth = 26;
    g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(sd * 60, -24, sd * 96, 0);
    g.quadraticCurveTo(sd * 126, 22, sd * 112, 40 + Math.sin(t * 3) * 3);
    g.stroke();
    g.lineWidth = 12;
    g.beginPath(); g.arc(sd * 100, 30, 14, 0, TAU); g.stroke();
  }
  g.restore();
}

export function drawFeatherItem(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const cols = ['#ff7ac6', '#ffd23f', '#7fe3a0', '#7fc8ff', '#c58bff'];
  for (let k = 0; k < 5; k++) {
    g.fillStyle = cols[k];
    g.beginPath(); g.ellipse(18 + k * 16, -4 + Math.sin(k) * 2, 14, 18 - k, 0.2, 0, TAU); g.fill();
  }
  g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(100, -6); g.stroke();
  g.restore();
}

function drawPranks(g, st, P, t) {
  // glitter in the beard
  if (P.glitter > 0) {
    const n = 6 + P.glitter * 8;
    for (let k = 0; k < n; k++) {
      const a = k * 2.4, r = 30 + (k * 13) % (40 + P.glitter * 18);
      const x = A.chin[0] + Math.cos(a) * r * 1.4, y = A.chin[1] + Math.sin(a) * r * 0.5 + 6;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + k);
      g.fillStyle = ['#ffffff', '#ffd23f', '#ff9fd2', '#9fe8ff'][k % 4];
      g.save(); g.translate(x, y); g.rotate(t + k); g.globalAlpha = 0.5 + tw * 0.5;
      const r2 = 5 + tw * 6;
      g.beginPath(); g.moveTo(0, -r2); g.lineTo(r2 * 0.3, 0); g.lineTo(0, r2); g.lineTo(-r2 * 0.3, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-r2, 0); g.lineTo(0, r2 * 0.3); g.lineTo(r2, 0); g.lineTo(0, -r2 * 0.3); g.closePath(); g.fill();
      g.restore();
    }
  }
  // toenails
  for (let k = 0; k < Math.min(10, P.toes); k++) {
    const sd = k % 2 ? 1 : -1, j = Math.floor(k / 2);
    const fx = sd < 0 ? 200 : 700;
    const tx = fx - sd * (-45 + j * 32), ty = 700 - j * 5;
    const r = j === 0 ? 13 : 9;
    blob(g, tx, ty - 2, r, r * 0.8, TOE_COLS[k % TOE_COLS.length], 3);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(tx - r * 0.3, ty - 5, r * 0.25, 0, TAU); g.fill();
  }
  // moustache
  if (P.tache > 0) drawTache(g, A.tache[0], A.tache[1] - 2, P.tache >= 2 ? 345 : 255, t);
  if (P.tache >= 3) { // curly crayon eyebrows too
    g.strokeStyle = '#3a2214'; g.lineWidth = 12; g.lineCap = 'round';
    for (const [ex, ey, sd] of [[A.eyeL[0], A.eyeL[1] - 46, -1], [A.eyeR[0], A.eyeR[1] - 46, 1]]) {
      g.beginPath(); g.moveTo(ex - 34, ey + 4); g.quadraticCurveTo(ex, ey - 20, ex + 34, ey + 4); g.stroke();
      g.beginPath(); g.arc(ex + sd * 40, ey - 6, 10, 0, TAU); g.stroke();
    }
  }
  // flowers in his hair
  P.flowers.forEach((col, k) => { const [x, y] = FLOWER_SPOTS[k % FLOWER_SPOTS.length]; flower(g, x, y, 34 + (k % 3) * 4, col, t); });
  // bows
  for (let k = 0; k < Math.min(BOW_SPOTS.length, P.bows); k++) {
    const [x, y] = BOW_SPOTS[k];
    drawBow(g, x, y, k < 2 ? 1.3 : 1.0, (k % 2 ? 0.3 : -0.3) + Math.sin(t * 3 + k) * 0.08, k % 2 ? '#7fc8ff' : '#ff7ac6');
  }
  // party hats (stacked!)
  for (let k = 0; k < Math.min(3, P.hats); k++) {
    const hy = A.top[1] + 14 - k * 150, hx = A.top[0] + k * 22 + Math.sin(t * 2 + k) * 4;
    drawHat(g, hx, hy, 1.35 - k * 0.3, -0.12 + k * 0.18 + st.sway * 0.05, t);
  }
  // tickle feather at his nose
  if (st.tickle > 0.01) {
    g.save(); g.globalAlpha = Math.min(1, st.tickle * 2);
    drawFeatherItem(g, A.nose[0] + 30, A.nose[1] + 30, 1.6, -0.5 + Math.sin(t * 22) * 0.35);
    g.restore();
  }
}

// --- props ---------------------------------------------------------------------------------------
export function drawBasket(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(30,60,20,0.25)'; g.beginPath(); g.ellipse(0, 0, 80, 18, 0, 0, TAU); g.fill();
  g.fillStyle = '#d99a52';
  g.beginPath(); g.moveTo(-70, -60); g.lineTo(70, -60); g.lineTo(56, 0); g.lineTo(-56, 0); g.closePath(); g.fill(); ink(g, 5);
  g.strokeStyle = 'rgba(120,60,20,0.5)'; g.lineWidth = 3;
  for (let k = -50; k <= 50; k += 20) { g.beginPath(); g.moveTo(k, -58); g.lineTo(k * 0.82, -2); g.stroke(); }
  g.beginPath(); g.moveTo(-64, -32); g.lineTo(64, -32); g.stroke();
  g.fillStyle = '#ff7a9a'; g.beginPath(); g.moveTo(-74, -64); g.lineTo(74, -64); g.lineTo(60, -50); g.lineTo(-60, -50); g.closePath(); g.fill(); ink(g, 4);
  g.fillStyle = '#ffffff'; for (let k = -60; k < 60; k += 24) g.fillRect(k, -63, 12, 12);
  g.restore();
}

/** A prank item (station / carried). kind: crayon flower bow hat feather glitter polish. */
export function drawItem(g, kind, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  switch (kind) {
    case 'crayon':
      g.rotate(-0.6);
      g.fillStyle = '#5a3a24'; rr(g, -14, -40, 28, 70, 8); g.fill(); ink(g, 4);
      g.fillStyle = '#ffd23f'; g.fillRect(-14, -16, 28, 26); g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(-14, -16, 28, 26);
      g.fillStyle = '#5a3a24'; g.beginPath(); g.moveTo(-14, -40); g.lineTo(0, -62); g.lineTo(14, -40); g.closePath(); g.fill(); ink(g, 4);
      break;
    case 'flower': flower(g, 0, 0, 30, '#ff7ac6', t); g.strokeStyle = '#3e9d46'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 30); g.lineTo(0, 54); g.stroke(); flower(g, 0, 0, 30, '#ff7ac6', t); break;
    case 'bow': drawBow(g, 0, 0, 0.8, 0); break;
    case 'hat': drawHat(g, 0, 36, 0.42, 0.1, t); break;
    case 'feather': drawFeatherItem(g, -46, 8, 0.9, -0.4); break;
    case 'glitter':
      blob(g, 0, 6, 26, 30, 'rgba(220,240,255,0.9)', 4);
      for (let k = 0; k < 10; k++) { g.fillStyle = ['#ff7ac6', '#ffd23f', '#7fc8ff', '#c58bff'][k % 4]; g.beginPath(); g.arc(-14 + (k * 7) % 28, 10 + ((k * 11) % 20) - 6, 4, 0, TAU); g.fill(); }
      g.fillStyle = '#ff7ac6'; rr(g, -20, -32, 40, 14, 6); g.fill(); ink(g, 4);
      for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(Math.cos(a) * 36, -40 + Math.sin(a) * 10, 4, 0, TAU); g.fill(); }
      break;
    case 'polish':
      g.fillStyle = '#ff5fa8'; rr(g, -18, -10, 36, 40, 12); g.fill(); ink(g, 4);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-10, -4, 6, 22);
      g.fillStyle = '#d6d9e6'; rr(g, -10, -42, 20, 34, 6); g.fill(); ink(g, 4);
      break;
    default: break;
  }
  g.restore();
}

/** A leafy bush disguise (frozen players). */
export function drawBush(g, x, y, w, h, k, t, seed = 0) {
  if (k <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(k, k);
  const cols = ['#4caf50', '#5cc35a', '#3e9d46'];
  const puffs = [[-0.32, -0.3, 0.3], [0.32, -0.32, 0.3], [0, -0.55, 0.33], [-0.18, -0.75, 0.25], [0.2, -0.75, 0.25], [0, -0.2, 0.36]];
  for (const [i, [px, py, pr]] of puffs.entries()) {
    g.fillStyle = cols[(i + seed) % 3];
    g.beginPath(); g.arc(px * w, py * h + Math.sin(t * 2 + i) * 1.5, pr * w, 0, TAU); g.fill();
  }
  g.strokeStyle = NAVY; g.lineWidth = 5;
  for (const [px, py, pr] of puffs) { g.beginPath(); g.arc(px * w, py * h, pr * w, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); }
  // a couple of flowers
  for (const [px, py] of [[-0.25, -0.5], [0.3, -0.15]]) flower(g, px * w, py * h, 12, '#ff9fd2', t);
  // peeking eyes
  const blink = Math.sin(t * 1.3 + seed) > 0.96 ? 0.15 : 1;
  for (const sd of [-1, 1]) {
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(sd * w * 0.1, -h * 0.58, 9, 11 * blink, 0, 0, TAU); g.fill(); ink(g, 3);
    g.fillStyle = NAVY; g.beginPath(); g.arc(sd * w * 0.1 + 2, -h * 0.57, 4.5 * blink, 0, TAU); g.fill();
  }
  g.restore();
}

/** The troll's big sleepy swatting hand, from shoulder (sx, sy) towards (tx, ty), 0..1 extended. */
export function drawSwat(g, sx, sy, tx, ty, k) {
  const x = sx + (tx - sx) * k, y = sy + (ty - sy) * k;
  g.save();
  g.strokeStyle = NAVY; g.lineWidth = 64; g.lineCap = 'round';
  g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + x) / 2, Math.min(sy, y) - 120 * k, x, y); g.stroke();
  g.strokeStyle = SKIN; g.lineWidth = 52; g.stroke();
  const a = Math.atan2(y - sy, x - sx);
  g.translate(x, y); g.rotate(a);
  blob(g, 10, 0, 48, 40, SKIN, 6);
  for (let f = -1.5; f <= 1.5; f++) blob(g, 50, f * 18, 16, 10, SKIN, 4);
  g.restore();
}

export function drawMirror(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(t * 2) * 0.1);
  g.fillStyle = '#ffcf4a'; rr(g, -9, 30, 18, 60, 8); g.fill(); ink(g, 4);
  blob(g, 0, 0, 52, 64, '#ffcf4a', 5);
  const gr = g.createLinearGradient(-40, -50, 40, 50);
  gr.addColorStop(0, '#e8f8ff'); gr.addColorStop(1, '#9fd8ff');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 40, 52, 0, 0, TAU); g.fill(); ink(g, 3);
  g.fillStyle = '#ffffff'; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(-14, -18, 7, 18, 0.4, 0, TAU); g.fill();
  g.restore();
}

// --- thumbnail -----------------------------------------------------------------------------------
export function drawIcon(g, x, y, w, h, t = 0) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.translate(x, y); g.scale(w / 800, h / 500);
  g.drawImage(meadowBackground(), 560, 0, 800, 500, 0, 0, 800, 500);
  g.save(); g.translate(400 - 960 * 0.62, 520 - 720 * 0.62); g.scale(0.62, 0.62);
  const P = { tache: 2, flowers: ['#ff7ac6', '#ffd23f', '#7fc8ff', '#ffffff'], bows: 2, hats: 1, glitter: 2, toes: 6 };
  drawTroll(g, { eyeL: 0, eyeR: 0, look: 0, mouth: 0.5 + Math.sin(t * 2) * 0.3, sway: 0, breath: Math.sin(t * 2), tickle: 1 }, P, t, null, null);
  g.restore();
  // Zzz
  for (let k = 0; k < 3; k++) {
    const zt = (t * 0.5 + k / 3) % 1;
    g.save(); g.globalAlpha = Math.sin(zt * Math.PI);
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 6; g.font = `900 ${40 + zt * 30}px Fredoka, sans-serif`;
    g.strokeText('Z', 560 + zt * 80, 120 - zt * 90); g.fillText('Z', 560 + zt * 80, 120 - zt * 90);
    g.restore();
  }
  drawBush(g, 130, 470, 150, 170, 1, t, 1);
  drawItem(g, 'crayon', 690, 380, 1.2, t);
  g.restore();
}
