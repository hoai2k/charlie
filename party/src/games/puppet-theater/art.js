// Puppet Theater: procedural art. The booth, six painted backdrops, the
// cardboard props, the audience, the sock puppets and the picture bubbles.
// Every piece first asks for generated art (art()/drawArt()) and falls back
// to the drawing here, which is what ships today.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { drawEmote, drawHeartShape, drawStarShape, drawSparkleShape, starPath } from '../../engine/emotes.js';
import { clamp, lerp, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';

// Stage geometry (screen space, the booth fills the 1920x1080 canvas).
export const WIN = { x0: 270, x1: 1650, get y0() { return art('prop/pt-booth') ? 210 : 150; }, y1: 740 };   // backdrop window
export const BOARD_Y = 720;      // playboard top edge: puppets pop up from behind it
export const BOARD_B = 820;      // playboard bottom edge
export const FEET_Y = 690;       // a puppet's feet at normal height

// ---------------------------------------------------------------------------
// Little helpers

/** Seeded pseudo-random so prerendered art is the same every time. */
function seeded(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
function ol(g, w = 4) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
function fillBlob(g, w) { g.lineWidth = w * 2; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke(); g.fill(); }
function blob(g, x, y, r, n = 5, k = 0.6) { // puffy round cluster
  g.beginPath();
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; g.moveTo(x + Math.cos(a) * r * k + r * 0.55, y + Math.sin(a) * r * k); g.arc(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k, r * 0.55, 0, TAU); }
  g.arc(x, y, r * 0.7, 0, TAU);
}

// ---------------------------------------------------------------------------
// Backdrops (painted, prerendered once at window size)

export const BACKDROPS = [
  { id: 'castle', name: 'Castle', sky: ['#8fd6ff', '#e6f7ff'], dot: '#ff9ecf' },
  { id: 'sea', name: 'Under the Sea', sky: ['#4cc9e0', '#1d6fae'], dot: '#25d0c8' },
  { id: 'forest', name: 'Forest', sky: ['#bff0ff', '#e9ffe1'], dot: '#36d17a' },
  { id: 'space', name: 'Space', sky: ['#22164f', '#3b2a7a'], dot: '#9b5cff' },
  { id: 'candy', name: 'Candy Land', sky: ['#ffc6e6', '#fff1f8'], dot: '#ff6fb1' },
  { id: 'beach', name: 'Beach', sky: ['#7fd0ff', '#d9f3ff'], dot: '#ffd23f' },
];
const BW = WIN.x1 - WIN.x0, BH = WIN.y1 - WIN.y0;   // 1380 x 590
const GROUND = 0.74 * BH;                           // horizon/ground line in backdrop space
const bdCache = new Map();

function skyGrad(g, w, h, a, b) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
function hill(g, w, y, amp, freq, ph, color, h = BH) {
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += 12) g.lineTo(x, y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.7 + ph * 1.3) * amp * 0.3);
  g.lineTo(w, h); g.closePath(); g.fillStyle = color; g.fill(); ol(g, 3);
}
function softCloud(g, x, y, s, a = 0.95) { ui.cloud(g, x, y, s, '#ffffff', a); }

function paintCastle(g) {
  const r = seeded(11);
  skyGrad(g, BW, BH, '#8fd6ff', '#e6f7ff');
  g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(1180, 110, 62, 0, TAU); g.fill(); ol(g, 4);
  softCloud(g, 250, 120, 0.9); softCloud(g, 760, 80, 0.7); softCloud(g, 1000, 170, 0.55, 0.8);
  hill(g, BW, GROUND - 90, 40, 0.004, 1, '#9be08c');
  // castle on the hill
  const cx = 820, base = GROUND - 70;
  g.fillStyle = '#ffd0e6';
  g.beginPath(); g.rect(cx - 150, base - 160, 300, 170); ol(g, 4); g.fill(); ol(g, 4);
  for (const [tx, tw, th] of [[-190, 80, 250], [110, 80, 250], [-40, 80, 300]]) {
    g.fillStyle = '#ffe3f0'; g.beginPath(); g.rect(cx + tx, base - th, tw, th + 10); g.fill(); ol(g, 4);
    g.fillStyle = '#9b7bff'; g.beginPath(); g.moveTo(cx + tx - 12, base - th); g.lineTo(cx + tx + tw / 2, base - th - 90); g.lineTo(cx + tx + tw + 12, base - th); g.closePath(); g.fill(); ol(g, 4);
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + tx + tw / 2, base - th - 90); g.lineTo(cx + tx + tw / 2, base - th - 130); g.stroke();
    g.fillStyle = '#ff6fb1'; g.beginPath(); g.moveTo(cx + tx + tw / 2, base - th - 130); g.lineTo(cx + tx + tw / 2 + 34, base - th - 118); g.lineTo(cx + tx + tw / 2, base - th - 106); g.closePath(); g.fill(); ol(g, 2.5);
    g.fillStyle = '#6a5acd'; g.beginPath(); g.ellipse(cx + tx + tw / 2, base - th + 60, 12, 20, 0, 0, TAU); g.fill(); ol(g, 3);
  }
  g.fillStyle = '#b77a4a'; g.beginPath(); g.moveTo(cx - 40, base + 10); g.lineTo(cx - 40, base - 50); g.arc(cx, base - 50, 40, Math.PI, 0); g.lineTo(cx + 40, base + 10); g.closePath(); g.fill(); ol(g, 4);
  hill(g, BW, GROUND, 18, 0.006, 3, '#6fd06a');
  for (let i = 0; i < 26; i++) { const x = r() * BW, y = GROUND + 20 + r() * 120; g.fillStyle = ['#ff6fb1', '#ffd23f', '#ffffff', '#b36bff'][i % 4]; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.fillStyle = '#ffb000'; g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill(); }
}

function paintSea(g) {
  const r = seeded(22);
  skyGrad(g, BW, BH, '#5fdcef', '#1b67a8');
  g.save(); g.globalAlpha = 0.18; g.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) { const x = 100 + i * 240; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 90, 0); g.lineTo(x + 260, BH); g.lineTo(x + 150, BH); g.closePath(); g.fill(); }
  g.restore();
  hill(g, BW, GROUND - 20, 22, 0.005, 2, '#5aa7c9');
  // coral and seaweed
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 160 + r() * 60, y = GROUND + 10 + r() * 40, hh = 90 + r() * 110;
    g.strokeStyle = ['#36d17a', '#2bb673', '#4fe08f'][i % 3]; g.lineWidth = 16; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); for (let k = 1; k <= 6; k++) g.lineTo(x + Math.sin(k * 1.3 + i) * 18, y - (hh * k) / 6); g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const x = 140 + i * 230 + r() * 50, y = GROUND + 40, c = ['#ff7aa8', '#ff9f1c', '#c77dff'][i % 3];
    g.strokeStyle = c; g.lineWidth = 18; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 70); g.moveTo(x, y - 40); g.lineTo(x - 30, y - 90); g.moveTo(x, y - 50); g.lineTo(x + 34, y - 100); g.stroke();
  }
  hill(g, BW, GROUND + 50, 10, 0.008, 1, '#ffe2a3');
  for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(214,170,100,0.5)'; g.beginPath(); g.arc(r() * BW, GROUND + 80 + r() * 90, 4 + r() * 4, 0, TAU); g.fill(); }
  // shells and starfish
  g.save(); g.translate(300, GROUND + 110); g.rotate(0.3); drawStarShape(g, 46, '#ff9f1c'); g.restore();
  g.save(); g.translate(1090, GROUND + 120); g.rotate(-0.2); drawStarShape(g, 40, '#ff6fb1'); g.restore();
}

function paintForest(g) {
  const r = seeded(33);
  skyGrad(g, BW, BH, '#bff0ff', '#f0ffe6');
  g.save(); g.globalAlpha = 0.35; g.fillStyle = '#fff7b0';
  for (let i = 0; i < 4; i++) { const x = 200 + i * 320; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x + 200, BH); g.lineTo(x + 90, BH); g.closePath(); g.fill(); }
  g.restore();
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 9; i++) {
      const x = i * 170 + (row ? 85 : 0) + r() * 40, y = GROUND - (row ? 10 : 80), s = row ? 1.1 : 0.8;
      g.fillStyle = '#9b6b43'; g.beginPath(); g.rect(x - 14 * s, y - 80 * s, 28 * s, 100 * s); g.fill(); ol(g, 3);
      g.fillStyle = row ? '#4fc96a' : '#7fd98a'; blob(g, x, y - 130 * s, 80 * s, 5, 0.55); fillBlob(g, 3);
    }
  }
  hill(g, BW, GROUND + 10, 14, 0.007, 2, '#6fd06a');
  for (let i = 0; i < 7; i++) {
    const x = 80 + i * 200 + r() * 60, y = GROUND + 60 + r() * 60;
    g.fillStyle = '#fff3e0'; g.beginPath(); g.rect(x - 9, y - 30, 18, 30); g.fill(); ol(g, 3);
    g.fillStyle = '#ff4d6d'; g.beginPath(); g.ellipse(x, y - 30, 32, 22, 0, Math.PI, TAU); g.closePath(); g.fill(); ol(g, 3);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 10, y - 40, 5, 0, TAU); g.arc(x + 12, y - 38, 4, 0, TAU); g.fill();
  }
  for (let i = 0; i < 30; i++) { const x = r() * BW, y = GROUND + 30 + r() * 130; g.fillStyle = ['#ffd23f', '#ff8fd0', '#ffffff'][i % 3]; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
}

function paintSpace(g) {
  const r = seeded(44);
  skyGrad(g, BW, BH, '#170f40', '#40308a');
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; g.beginPath(); g.arc(r() * BW, r() * GROUND, 1 + r() * 2.5, 0, TAU); g.fill(); }
  // ringed planet
  g.save(); g.translate(300, 170);
  g.fillStyle = '#ff9ecf'; g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.fill(); ol(g, 4);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-20, -10, 50, 14, -0.3, 0, TAU); g.fill();
  g.strokeStyle = '#ffd23f'; g.lineWidth = 12; g.beginPath(); g.ellipse(0, 0, 120, 26, -0.25, 0.15, Math.PI - 0.15); g.stroke();
  g.restore();
  g.save(); g.translate(1150, 140); g.fillStyle = '#7fd3ff'; g.beginPath(); g.arc(0, 0, 36, 0, TAU); g.fill(); ol(g, 3); g.restore();
  // ground
  hill(g, BW, GROUND, 16, 0.006, 1, '#b8b2d6');
  for (let i = 0; i < 9; i++) { const x = 70 + i * 150 + r() * 50, y = GROUND + 50 + r() * 90; g.fillStyle = '#9a93c2'; g.beginPath(); g.ellipse(x, y, 34, 12, 0, 0, TAU); g.fill(); ol(g, 2.5); }
}

function paintCandy(g) {
  const r = seeded(55);
  skyGrad(g, BW, BH, '#ffc6e6', '#fff1f8');
  softCloud(g, 300, 110, 0.8); softCloud(g, 1050, 90, 0.7);
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 260, y = GROUND - 20, c = ['#7fe0a8', '#ffd23f', '#c77dff', '#7fd3ff'][i % 4];
    g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 140, 120, 0, Math.PI, TAU); g.closePath(); g.fill(); ol(g, 4);
    g.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x - 60 + r() * 120, y - 20 - r() * 70, 5, 0, TAU); g.fill(); }
  }
  // candy canes
  for (const x of [200, 640, 1180]) {
    g.save(); g.translate(x, GROUND + 20);
    g.lineCap = 'round'; g.lineWidth = 26; g.strokeStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -200); g.arc(-36, -200, 36, 0, Math.PI, true); g.stroke();
    g.lineWidth = 26; g.setLineDash([18, 18]); g.strokeStyle = '#ff4d6d'; g.stroke(); g.setLineDash([]);
    g.restore();
  }
  // chocolate river
  g.fillStyle = '#9b5a34'; g.beginPath(); g.moveTo(0, GROUND + 70);
  for (let x = 0; x <= BW; x += 20) g.lineTo(x, GROUND + 70 + Math.sin(x * 0.01) * 12);
  g.lineTo(BW, GROUND + 130); for (let x = BW; x >= 0; x -= 20) g.lineTo(x, GROUND + 130 + Math.sin(x * 0.012 + 1) * 10); g.closePath(); g.fill(); ol(g, 3);
  hill(g, BW, GROUND + 140, 8, 0.01, 2, '#ffb3d9');
}

function paintBeach(g) {
  const r = seeded(66);
  skyGrad(g, BW, BH, '#7fd0ff', '#e0f6ff');
  g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(1150, 120, 70, 0, TAU); g.fill(); ol(g, 4);
  softCloud(g, 300, 120, 0.7); softCloud(g, 720, 70, 0.55);
  g.fillStyle = '#2fb5e0'; g.fillRect(0, GROUND - 120, BW, 140);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4;
  for (let i = 0; i < 18; i++) { const x = r() * BW, y = GROUND - 100 + r() * 100; g.beginPath(); g.arc(x, y, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  // sailboat
  g.save(); g.translate(500, GROUND - 100);
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, -110); g.lineTo(60, -10); g.closePath(); g.fill(); ol(g, 3);
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.moveTo(-50, -6); g.lineTo(70, -6); g.lineTo(50, 14); g.lineTo(-34, 14); g.closePath(); g.fill(); ol(g, 3);
  g.restore();
  hill(g, BW, GROUND, 12, 0.006, 2, '#ffe2a3');
  for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(214,170,100,0.45)'; g.beginPath(); g.arc(r() * BW, GROUND + 30 + r() * 130, 3 + r() * 4, 0, TAU); g.fill(); }
  // palm at the edge
  g.save(); g.translate(110, GROUND + 40);
  g.strokeStyle = '#a8703d'; g.lineWidth = 30; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(30, -150, 10, -300); g.stroke();
  g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 5; i++) { const a = -Math.PI + i * (Math.PI / 4); g.fillStyle = '#36c46a'; g.beginPath(); g.ellipse(10 + Math.cos(a) * 70, -300 + Math.sin(a) * 40 + 20, 85, 22, a, 0, TAU); g.fill(); ol(g, 3); }
  g.restore();
}

const PAINTERS = { castle: paintCastle, sea: paintSea, forest: paintForest, space: paintSpace, candy: paintCandy, beach: paintBeach };

function backdropCanvas(id) {
  if (!bdCache.has(id)) {
    const c = mk(BW, BH), g = c.getContext('2d');
    try { PAINTERS[id](g); } catch (e) { g.fillStyle = '#9fd8ff'; g.fillRect(0, 0, BW, BH); }
    bdCache.set(id, c);
  }
  return bdCache.get(id);
}

/** Paint a backdrop into a rect (the stage window, or a small thumbnail card). */
export function drawBackdrop(g, id, x, y, w, h, t = 0, live = true) {
  const img = art(`bg/puppet-theater-${id}`);
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (img) g.drawImage(img, x, y, w, h);
  else g.drawImage(backdropCanvas(id), x, y, w, h);
  if (live) {
    const k = w / BW;
    g.translate(x, y); g.scale(k, h / BH);
    if (id === 'sea') {
      for (let i = 0; i < 12; i++) {
        const p = (t * 0.12 + i / 12) % 1, bx = (i * 113) % BW + Math.sin(t * 2 + i) * 10, by = BH - p * BH;
        g.globalAlpha = 0.7 * Math.sin(p * Math.PI); g.strokeStyle = '#ffffff'; g.lineWidth = 3;
        g.beginPath(); g.arc(bx, by, 6 + (i % 3) * 4, 0, TAU); g.stroke();
      }
    } else if (id === 'space') {
      for (let i = 0; i < 14; i++) {
        const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
        g.globalAlpha = a; g.save(); g.translate((i * 97) % BW, (i * 53) % (GROUND - 40) + 20); drawSparkleShape(g, 20, '#fff6a8'); g.restore();
      }
    } else if (id === 'castle' || id === 'candy' || id === 'beach') {
      g.globalAlpha = 0.85; ui.cloud(g, ((t * 18) % (BW + 400)) - 200, 230, 0.45, '#ffffff', 0.8);
    } else if (id === 'forest') {
      for (let i = 0; i < 6; i++) {
        const p = (t * 0.08 + i / 6) % 1; g.globalAlpha = Math.sin(p * Math.PI) * 0.9;
        g.fillStyle = '#ff8fd0'; g.beginPath(); g.ellipse((i * 233 + p * 200) % BW, p * GROUND, 8, 5, p * 6, 0, TAU); g.fill();
      }
    }
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// Props: cardboard cut-outs. `stand` props are bottom-anchored on the stage
// floor; `hang` props dangle on a string from the valance.

export const PROPS = [
  { id: 'tree', name: 'Tree', h: 240, w: 190, stand: true },
  { id: 'flower', name: 'Flower', h: 120, w: 80, stand: true },
  { id: 'castle', name: 'Castle', h: 280, w: 170, stand: true },
  { id: 'house', name: 'House', h: 220, w: 210, stand: true },
  { id: 'mushroom', name: 'Mushroom', h: 130, w: 130, stand: true },
  { id: 'palm', name: 'Palm Tree', h: 260, w: 190, stand: true },
  { id: 'lollipop', name: 'Lollipop', h: 180, w: 100, stand: true },
  { id: 'rocket', name: 'Rocket', h: 240, w: 120, stand: true },
  { id: 'cloud', name: 'Cloud', h: 110, w: 170 },
  { id: 'sun', name: 'Sun', h: 150, w: 150 },
  { id: 'moon', name: 'Moon', h: 140, w: 120 },
  { id: 'star', name: 'Star', h: 110, w: 110 },
  { id: 'rainbow', name: 'Rainbow', h: 160, w: 300 },
  { id: 'fish', name: 'Fish', h: 90, w: 130 },
];
export const PROP_BY_ID = Object.fromEntries(PROPS.map((p) => [p.id, p]));
// Which props suit which backdrop (CPUs pick from these; everyone may use any).
export const THEME_PROPS = {
  castle: ['castle', 'tree', 'flower', 'cloud', 'sun', 'rainbow'],
  sea: ['fish', 'fish', 'star', 'flower', 'mushroom'],
  forest: ['tree', 'mushroom', 'flower', 'house', 'sun', 'cloud'],
  space: ['rocket', 'moon', 'star', 'star', 'sun'],
  candy: ['lollipop', 'lollipop', 'house', 'rainbow', 'cloud', 'mushroom'],
  beach: ['palm', 'sun', 'fish', 'cloud', 'flower'],
};

/** Draw a prop shape centred on (0,0) of a w x h box (no cardboard edge). */
function propShape(g, id, w, h, t) {
  const o = 4;
  switch (id) {
    case 'tree': {
      g.fillStyle = '#9b6b43'; g.beginPath(); g.rect(-w * 0.09, h * 0.1, w * 0.18, h * 0.4); g.fill(); ol(g, o);
      g.fillStyle = '#4fc96a'; blob(g, 0, -h * 0.12, w * 0.42, 6, 0.6); fillBlob(g, o);
      g.fillStyle = '#ff4d6d'; for (const [ax, ay] of [[-0.2, -0.2], [0.18, -0.05], [0.02, -0.32], [-0.1, 0.05]]) { g.beginPath(); g.arc(ax * w, ay * h, w * 0.045, 0, TAU); g.fill(); ol(g, 2.5); }
      break;
    }
    case 'flower': {
      g.strokeStyle = '#2bb673'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, h * 0.5); g.lineTo(0, -h * 0.1); g.stroke();
      g.fillStyle = '#4fe08f'; g.beginPath(); g.ellipse(w * 0.18, h * 0.22, w * 0.22, w * 0.1, -0.5, 0, TAU); g.fill(); ol(g, 3);
      g.fillStyle = '#ff6fb1';
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * w * 0.24, -h * 0.22 + Math.sin(a) * w * 0.24, w * 0.18, w * 0.13, a, 0, TAU); g.fill(); ol(g, 3); }
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -h * 0.22, w * 0.17, 0, TAU); g.fill(); ol(g, 3);
      break;
    }
    case 'castle': {
      g.fillStyle = '#ffd0e6'; g.beginPath(); g.rect(-w * 0.32, -h * 0.2, w * 0.64, h * 0.7); g.fill(); ol(g, o);
      g.beginPath();
      for (let i = 0; i < 4; i++) g.rect(-w * 0.32 + i * w * 0.18, -h * 0.27, w * 0.1, h * 0.08);
      g.fill(); ol(g, o);
      g.fillStyle = '#9b7bff'; g.beginPath(); g.moveTo(-w * 0.38, -h * 0.27); g.lineTo(0, -h * 0.5); g.lineTo(w * 0.38, -h * 0.27); g.closePath();
      g.fill(); ol(g, o);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(0, -h * 0.5); g.lineTo(w * 0.22, -h * 0.46); g.lineTo(0, -h * 0.42); g.closePath(); g.fill(); ol(g, 2.5);
      g.fillStyle = '#b77a4a'; g.beginPath(); g.moveTo(-w * 0.12, h * 0.5); g.lineTo(-w * 0.12, h * 0.3); g.arc(0, h * 0.3, w * 0.12, Math.PI, 0); g.lineTo(w * 0.12, h * 0.5); g.closePath(); g.fill(); ol(g, 3);
      g.fillStyle = '#6a5acd'; g.beginPath(); g.ellipse(0, -h * 0.02, w * 0.07, h * 0.06, 0, 0, TAU); g.fill(); ol(g, 3);
      break;
    }
    case 'house': {
      g.fillStyle = '#fff3c4'; g.beginPath(); g.rect(-w * 0.36, -h * 0.08, w * 0.72, h * 0.58); g.fill(); ol(g, o);
      g.fillStyle = '#ff6fb1'; g.beginPath(); g.moveTo(-w * 0.48, -h * 0.05); g.lineTo(0, -h * 0.48); g.lineTo(w * 0.48, -h * 0.05); g.closePath(); g.fill(); ol(g, o);
      g.fillStyle = '#7fd3ff'; g.beginPath(); g.rect(w * 0.08, h * 0.04, w * 0.2, h * 0.17); g.fill(); ol(g, 3);
      g.fillStyle = '#b77a4a'; g.beginPath(); g.rect(-w * 0.24, h * 0.18, w * 0.18, h * 0.32); g.fill(); ol(g, 3);
      g.save(); g.translate(0, -h * 0.2); drawHeartShape(g, w * 0.13, '#ff4d6d'); g.restore();
      break;
    }
    case 'mushroom': {
      g.fillStyle = '#fff3e0'; g.beginPath(); g.ellipse(0, h * 0.2, w * 0.17, h * 0.32, 0, 0, TAU); g.fill(); ol(g, o);
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.ellipse(0, -h * 0.06, w * 0.5, h * 0.42, 0, Math.PI, TAU); g.closePath(); g.fill(); ol(g, o);
      g.fillStyle = '#fff'; for (const [ax, ay, rr] of [[-0.26, -0.18, 0.08], [0.06, -0.32, 0.07], [0.28, -0.14, 0.06]]) { g.beginPath(); g.arc(ax * w, ay * h, rr * w, 0, TAU); g.fill(); }
      break;
    }
    case 'palm': {
      g.strokeStyle = '#a8703d'; g.lineWidth = w * 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, h * 0.5); g.quadraticCurveTo(w * 0.15, h * 0.05, 0, -h * 0.3); g.stroke();
      g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke();
      for (let i = 0; i < 5; i++) { const a = -Math.PI + i * (Math.PI / 4); g.fillStyle = '#36c46a'; g.beginPath(); g.ellipse(Math.cos(a) * w * 0.3, -h * 0.3 + Math.sin(a) * h * 0.1 + h * 0.04, w * 0.32, h * 0.06, a, 0, TAU); g.fill(); ol(g, 3); }
      g.fillStyle = '#8b5a2b'; g.beginPath(); g.arc(-w * 0.05, -h * 0.26, w * 0.06, 0, TAU); g.arc(w * 0.07, -h * 0.25, w * 0.06, 0, TAU); g.fill(); ol(g, 2.5);
      break;
    }
    case 'lollipop': {
      g.fillStyle = '#ffffff'; g.beginPath(); g.rect(-w * 0.06, -h * 0.05, w * 0.12, h * 0.55); g.fill(); ol(g, 3);
      g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(0, -h * 0.22, w * 0.46, 0, TAU); g.fill(); ol(g, o);
      g.strokeStyle = '#ffffff'; g.lineWidth = w * 0.09; g.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.2) { const rr = (a / (TAU * 2.2)) * w * 0.38; g.lineTo(Math.cos(a) * rr, -h * 0.22 + Math.sin(a) * rr); }
      g.stroke();
      break;
    }
    case 'rocket': {
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(-w * 0.45, h * 0.45); g.lineTo(-w * 0.25, h * 0.1); g.lineTo(-w * 0.25, h * 0.4); g.closePath(); g.fill(); ol(g, 3);
      g.beginPath(); g.moveTo(w * 0.45, h * 0.45); g.lineTo(w * 0.25, h * 0.1); g.lineTo(w * 0.25, h * 0.4); g.closePath(); g.fill(); ol(g, 3);
      g.fillStyle = '#f2f4ff'; g.beginPath(); g.moveTo(0, -h * 0.5); g.quadraticCurveTo(w * 0.36, -h * 0.2, w * 0.27, h * 0.42); g.lineTo(-w * 0.27, h * 0.42); g.quadraticCurveTo(-w * 0.36, -h * 0.2, 0, -h * 0.5); g.closePath(); g.fill(); ol(g, o);
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(0, -h * 0.5); g.quadraticCurveTo(w * 0.2, -h * 0.38, w * 0.26, -h * 0.26); g.lineTo(-w * 0.26, -h * 0.26); g.quadraticCurveTo(-w * 0.2, -h * 0.38, 0, -h * 0.5); g.closePath(); g.fill(); ol(g, 3);
      g.fillStyle = '#7fd3ff'; g.beginPath(); g.arc(0, -h * 0.05, w * 0.15, 0, TAU); g.fill(); ol(g, 3);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-w * 0.16, h * 0.42); g.lineTo(0, h * 0.5 + Math.sin(t * 20) * 4); g.lineTo(w * 0.16, h * 0.42); g.closePath(); g.fill(); ol(g, 2.5);
      break;
    }
    case 'cloud': g.fillStyle = '#ffffff'; blob(g, 0, 0, w * 0.34, 5, 0.75); fillBlob(g, o); break;
    case 'sun': {
      g.fillStyle = '#ffb000';
      for (let i = 0; i < 10; i++) { g.save(); g.rotate((i / 10) * TAU + t * 0.4); g.beginPath(); g.moveTo(-w * 0.08, -w * 0.32); g.lineTo(0, -w * 0.5); g.lineTo(w * 0.08, -w * 0.32); g.closePath(); g.fill(); ol(g, 3); g.restore(); }
      g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(0, 0, w * 0.33, 0, TAU); g.fill(); ol(g, o);
      face(g, 0, 0, w * 0.33);
      break;
    }
    case 'moon': {
      g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, h * 0.45, 0.5, TAU - 0.5); g.arc(h * 0.2, -h * 0.05, h * 0.36, TAU - 0.9, 0.9, true); g.closePath(); g.fill(); ol(g, o);
      g.fillStyle = NAVY; g.beginPath(); g.arc(-h * 0.18, -h * 0.08, h * 0.035, 0, TAU); g.fill();
      g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(-h * 0.2, h * 0.06, h * 0.07, 0.2, Math.PI - 0.6); g.stroke();
      g.fillStyle = '#ffb3d9'; g.beginPath(); g.arc(-h * 0.3, h * 0.04, h * 0.04, 0, TAU); g.fill();
      break;
    }
    case 'star': drawStarShape(g, w * 0.85, '#ffd23f'); face(g, 0, w * 0.04, w * 0.16); break;
    case 'rainbow': {
      const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'];
      const R = w * 0.42, band = h * 0.075;
      cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = band; g.beginPath(); g.arc(0, h * 0.35, R - i * band, Math.PI, TAU); g.stroke(); });
      g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, h * 0.35, R + band / 2, Math.PI, TAU); g.stroke();
      g.beginPath(); g.arc(0, h * 0.35, R - (cols.length - 0.5) * band, Math.PI, TAU); g.stroke();
      g.fillStyle = '#fff'; for (const sx of [-1, 1]) { blob(g, sx * (R - band * 2.5), h * 0.36, w * 0.13, 4, 0.7); fillBlob(g, 3); }
      break;
    }
    case 'fish': {
      g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(w * 0.22, 0); g.lineTo(w * 0.5, -h * 0.32); g.lineTo(w * 0.5, h * 0.32); g.closePath(); g.fill(); ol(g, 3);
      g.beginPath(); g.ellipse(-w * 0.05, 0, w * 0.34, h * 0.4, 0, 0, TAU); g.fill(); ol(g, o);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(0, h * 0.02, w * 0.1, h * 0.26, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-w * 0.22, -h * 0.08, h * 0.12, 0, TAU); g.fill(); ol(g, 2.5);
      g.fillStyle = NAVY; g.beginPath(); g.arc(-w * 0.24, -h * 0.08, h * 0.06, 0, TAU); g.fill();
      break;
    }
    default: g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, w * 0.4, 0, TAU); g.fill(); ol(g, o);
  }
}
function face(g, x, y, r) {
  g.fillStyle = NAVY;
  g.beginPath(); g.arc(x - r * 0.3, y - r * 0.12, r * 0.09, 0, TAU); g.arc(x + r * 0.3, y - r * 0.12, r * 0.09, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.08); g.beginPath(); g.arc(x, y + r * 0.08, r * 0.28, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = 'rgba(255,111,177,0.6)'; g.beginPath(); g.arc(x - r * 0.55, y + r * 0.15, r * 0.12, 0, TAU); g.arc(x + r * 0.55, y + r * 0.15, r * 0.12, 0, TAU); g.fill();
}

// Prerendered cut-outs with a pale cardboard edge (built once per prop).
const propCache = new Map();
const PAD = 14;
function propCanvas(id) {
  if (propCache.has(id)) return propCache.get(id);
  const d = PROP_BY_ID[id];
  const w = d.w, h = d.h, cw = w + PAD * 2 + 20, ch = h + PAD * 2 + 20;
  const shape = mk(cw, ch), sg = shape.getContext('2d');
  sg.translate(cw / 2, ch / 2); propShape(sg, id, w, h, 0);
  const sil = mk(cw, ch), lg = sil.getContext('2d');
  lg.drawImage(shape, 0, 0); lg.globalCompositeOperation = 'source-in'; lg.fillStyle = '#fff4dc'; lg.fillRect(0, 0, cw, ch);
  const out = mk(cw, ch), og = out.getContext('2d');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; og.drawImage(sil, Math.cos(a) * 7, Math.sin(a) * 7); }
  og.globalCompositeOperation = 'source-atop'; og.strokeStyle = 'rgba(180,140,90,0.0)';
  og.globalCompositeOperation = 'source-over';
  // thin outer line around the cardboard edge
  const ring = mk(cw, ch), rg = ring.getContext('2d');
  rg.drawImage(out, 0, 0); rg.globalCompositeOperation = 'source-in'; rg.fillStyle = 'rgba(36,22,63,0.55)'; rg.fillRect(0, 0, cw, ch);
  const fin = mk(cw, ch), fg = fin.getContext('2d');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; fg.drawImage(ring, Math.cos(a) * 2, Math.sin(a) * 2); }
  fg.drawImage(out, 0, 0); fg.drawImage(shape, 0, 0);
  const res = { c: fin, cw, ch };
  propCache.set(id, res);
  return res;
}

/**
 * Draw a prop. (x, y) is the base (stand props) or centre (hang props).
 * `s` scales, `rot` wobbles around the base.
 */
export function drawProp(g, id, x, y, s = 1, rot = 0, t = 0, o = {}) {
  const d = PROP_BY_ID[id]; if (!d) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  const key = `prop/pt-${id}`;
  if (d.stand) {
    if (o.shadow !== false) { g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(0, 2, d.w * 0.4, 10, 0, 0, TAU); g.fill(); }
    if (!drawArt(g, key, 0, 0, d.w * 1.15, d.h * 1.1, { anchor: 'bottom' })) {
      const pc = propCanvas(id);
      g.drawImage(pc.c, -pc.cw / 2, -d.h / 2 - pc.ch / 2);
    }
  } else if (!drawArt(g, key, 0, 0, d.w * 1.15, d.h * 1.15)) {
    const pc = propCanvas(id);
    g.drawImage(pc.c, -pc.cw / 2, -pc.ch / 2);
  }
  g.restore();
}

/** A prop's hit box (screen space). */
export function propRect(pr) {
  const d = PROP_BY_ID[pr.id], s = pr.s || 1;
  if (d.stand) return { x: pr.x - d.w * 0.5 * s, y: pr.y - d.h * s, w: d.w * s, h: d.h * s };
  return { x: pr.x - d.w * 0.5 * s, y: pr.y - d.h * 0.5 * s, w: d.w * s, h: d.h * s };
}

// ---------------------------------------------------------------------------
// The room and the booth

let roomCanvas = null;
function paintRoom() {
  const c = mk(W, H), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5a2b72'); gr.addColorStop(1, '#3a1d52');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.25;
  for (let y = 30; y < H; y += 90) for (let x = (y / 90) % 2 ? 45 : 0; x < W; x += 90) { g.save(); g.translate(x, y); drawStarShape(g, 22, '#ffd23f'); g.restore(); }
  g.globalAlpha = 1;
  g.fillStyle = '#8a5a3a'; g.fillRect(0, H - 90, W, 90);
  g.fillStyle = 'rgba(0,0,0,0.15)'; for (let x = 0; x < W; x += 120) g.fillRect(x, H - 90, 4, 90);
  return c;
}

export function drawRoom(g, t) {
  if (!drawArt(g, 'bg/puppet-theater', W / 2, H / 2, W, H, { fit: 'cover' })) {
    if (!roomCanvas) roomCanvas = paintRoom();
    g.drawImage(roomCanvas, 0, 0);
  }
  // string of party bulbs along the top
  g.save();
  g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath(); for (let x = -20; x <= W + 20; x += 20) g.lineTo(x, 18 + Math.sin(x / W * Math.PI * 6) * 10); g.stroke();
  const cols = ['#ff6fb1', '#ffd23f', '#7fd3ff', '#7fe0a8', '#c77dff'];
  for (let i = 0; i < 24; i++) {
    const x = 40 + i * 80, y = 22 + Math.sin(x / W * Math.PI * 6) * 10;
    const on = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.3);
    g.globalAlpha = on; g.fillStyle = cols[i % cols.length];
    g.beginPath(); g.ellipse(x, y + 12, 9, 13, 0, 0, TAU); g.fill(); g.globalAlpha = 1; ol(g, 2.5);
  }
  g.restore();
}

/** Back of the booth: the dark gap behind the backdrop (shows while the backdrop slides). */
export function drawBoothBack(g) {
  g.fillStyle = '#2a1640'; g.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
}

/** The booth front: valance, pillars, tied-back drapes, playboard and skirt. */
export function drawBoothFront(g, t, opts = {}) {
  // Authored ledge starts at source y=658; seat it at the unchanged 720px playboard line.
  if (drawArt(g, 'prop/pt-booth', W / 2, H / 2 + 62, W, H, { fit: 'stretch' })) return;
  g.save();
  // skirt
  g.fillStyle = '#7a3fb0'; g.beginPath(); g.rect(232, BOARD_B - 4, 1456, H - BOARD_B + 10); g.fill();
  g.fillStyle = 'rgba(36,22,63,0.18)'; for (let x = 262; x < 1690; x += 64) { g.fillRect(x, BOARD_B, 22, H - BOARD_B); }
  g.strokeStyle = NAVY; g.lineWidth = 5; g.strokeRect(232, BOARD_B - 4, 1456, H - BOARD_B + 10);
  // pillars
  for (const [x0, x1] of [[200, WIN.x0], [WIN.x1, 1720]]) {
    const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#c9844a'); gr.addColorStop(0.5, '#e3a265'); gr.addColorStop(1, '#b8743d');
    g.fillStyle = gr; g.beginPath(); g.rect(x0, 60, x1 - x0, BOARD_Y - 40); g.fill(); ol(g, 5);
    for (let y = 230; y < BOARD_Y - 20; y += 120) { g.save(); g.translate((x0 + x1) / 2, y); drawStarShape(g, 32, '#ffd23f'); g.restore(); }
  }
  // tied-back drapes
  for (const side of [-1, 1]) {
    const ex = side < 0 ? WIN.x0 : WIN.x1;
    g.fillStyle = '#e8364a';
    g.beginPath(); g.moveTo(ex, WIN.y0 - 10); g.lineTo(ex - side * 110, WIN.y0 - 10);
    g.quadraticCurveTo(ex - side * 20, 420, ex - side * 70, BOARD_Y); g.lineTo(ex, BOARD_Y); g.closePath(); g.fill(); ol(g, 4);
    g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 4;
    for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(ex - side * k * 30, WIN.y0); g.quadraticCurveTo(ex - side * (k * 6), 420, ex - side * (20 + k * 14), BOARD_Y); g.stroke(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(ex - side * 34, 440, 30, 13, side * 0.3, 0, TAU); g.fill(); ol(g, 3);
  }
  // valance
  g.fillStyle = '#ff6fb1';
  g.beginPath(); g.moveTo(190, 40); g.lineTo(1730, 40); g.lineTo(1730, 150);
  const n = 16, sw = 1540 / n;
  for (let i = n - 1; i >= 0; i--) g.arc(190 + sw * i + sw / 2, 150, sw / 2, 0, Math.PI);
  g.closePath(); g.fill(); ol(g, 5);
  g.fillStyle = '#ffd23f';
  for (let i = 0; i < n; i++) { g.beginPath(); g.arc(190 + sw * i + sw / 2, 150 + sw / 2 - 4, 7, 0, TAU); g.fill(); ol(g, 2); }
  g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.beginPath(); g.moveTo(196, 70); g.lineTo(1724, 70); g.stroke();
  for (let i = 0; i < 7; i++) { g.save(); g.translate(330 + i * 210, 112); g.rotate(Math.sin(t * 1.5 + i) * 0.08); drawStarShape(g, 30, i % 2 ? '#ffffff' : '#ffd23f'); g.restore(); }
  // crest in the middle
  g.save(); g.translate(W / 2, 74); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 50, 0, TAU); g.fill(); ol(g, 5);
  drawHeartShape(g, 46, '#ff4d6d'); g.restore();
  // playboard
  const pg = g.createLinearGradient(0, BOARD_Y, 0, BOARD_B); pg.addColorStop(0, '#f2b672'); pg.addColorStop(1, '#c8833f');
  g.fillStyle = pg; ui.roundRect(g, 220, BOARD_Y, 1480, BOARD_B - BOARD_Y, 18); g.fill(); ol(g, 5);
  g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, 232, BOARD_Y + 6, 1456, 10, 5); g.fill();
  const deco = ['#ff6fb1', '#7fd3ff', '#ffd23f', '#7fe0a8', '#c77dff'];
  for (let i = 0; i < 11; i++) {
    const x = 300 + i * 132, y = (BOARD_Y + BOARD_B) / 2 + 4;
    g.save(); g.translate(x, y);
    if (i % 2) drawHeartShape(g, 30, deco[i % deco.length]); else drawStarShape(g, 36, deco[i % deco.length]);
    g.restore();
  }
  g.restore();
}

const CURTAIN_EDGE = 694 / 760;   // prop/pt-curtain: opaque inner edge / canvas width
const CURTAIN_TUCK = 80;          // its outer edge drapes inward at the top: start it behind the booth's side curtain
/** The big red curtains that close between scenes. c: 0 open .. 1 closed. */
export function drawCurtains(g, c, t) {
  if (c <= 0.001) return;
  const half = (WIN.x1 - WIN.x0) / 2 + 30;
  const cw = half * c;
  for (const side of [-1, 1]) {
    g.save();
    const x0 = side < 0 ? WIN.x0 - 40 : WIN.x1 + 40 - cw - 0;
    const img = art('prop/pt-curtain');
    if (img) {
      g.translate(side < 0 ? x0 - CURTAIN_TUCK : WIN.x1 + 40 + CURTAIN_TUCK, 0);
      if (side > 0) g.scale(-1, 1);
      // The painted panel's rope edge sits at ~91% of its width (the tassel
      // hangs past it): stretch so that edge, not the canvas edge, meets the middle.
      g.drawImage(img, 0, WIN.y0 - 30, (cw + 18 + CURTAIN_TUCK) / CURTAIN_EDGE, BOARD_Y + 30 - WIN.y0 + 30);
    } else {
      const top = WIN.y0 - 30, bot = BOARD_Y + 20;
      const gr = g.createLinearGradient(x0, 0, x0 + cw, 0);
      gr.addColorStop(0, '#c2182f'); gr.addColorStop(0.5, '#e8364a'); gr.addColorStop(1, '#b3152a');
      g.fillStyle = gr; g.fillRect(x0, top, cw, bot - top);
      // folds
      const folds = Math.max(2, Math.round(cw / 70));
      for (let i = 0; i < folds; i++) {
        const fx = x0 + (i + 0.5) * (cw / folds), sway = Math.sin(t * 2 + i) * 3 * (1 - c * 0.5);
        g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(fx - 10 + sway, top, 14, bot - top);
        g.fillStyle = 'rgba(60,0,20,0.18)'; g.fillRect(fx + 14 + sway, top, 10, bot - top);
      }
      g.strokeStyle = NAVY; g.lineWidth = 4; g.strokeRect(x0, top, cw, bot - top);
      // gold rope edge and fringe
      const ex = side < 0 ? x0 + cw : x0;
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.beginPath(); g.moveTo(ex, top); g.lineTo(ex, bot); g.stroke();
      g.fillStyle = '#ffd23f';
      for (let x = x0 + 8; x < x0 + cw - 4; x += 22) { g.beginPath(); g.moveTo(x - 8, bot - 8); g.lineTo(x, bot + 14); g.lineTo(x + 8, bot - 8); g.closePath(); g.fill(); }
    }
    g.restore();
  }
}

// ---------------------------------------------------------------------------
// Audience: rows of cute critters seen from behind.

const AUD_KINDS = ['bunny', 'bear', 'cat', 'duck', 'kid', 'kid2'];
const AUD_COLORS = { bunny: ['#ffffff', '#ffe0f0'], bear: ['#b07a4f', '#c98f5e'], cat: ['#9aa0b8', '#f2b56b'], duck: ['#ffe14d', '#fff0a0'], kid: ['#5a3a22', '#f2c14e'], kid2: ['#2b1b10', '#c0602e'] };
const AUD_ART = { bunny: 'prop/pt-audience-bunny', bear: 'prop/pt-audience-bear', cat: 'prop/pt-audience-cat', duck: 'prop/pt-audience-duck' };
const ART_KINDS = Object.keys(AUD_ART);
const AUD_ART_PAW = { bunny: '#ffffff', bear: '#a8703f', cat: '#9aa0b8', duck: '#ffe14d' };   // matches the painted fur
const AUD_ART_H = 170;
export function makeAudience() {
  const r = seeded(77), seats = [];
  const rows = [{ y: 975, n: 11, s: 0.7 }, { y: 1028, n: 10, s: 0.82 }, { y: 1084, n: 9, s: 0.94 }];
  rows.forEach((row, ri) => {
    const span = 1700, step = span / row.n;
    for (let i = 0; i < row.n; i++) {
      const kind = AUD_KINDS[Math.floor(r() * AUD_KINDS.length)];
      seats.push({ x: 110 + step * (i + 0.5) + (ri % 2 ? step * 0.3 : 0) + (r() - 0.5) * 30, y: row.y, s: row.s * (0.9 + r() * 0.2), kind, col: AUD_COLORS[kind][Math.floor(r() * 2)], bow: r() < 0.3 ? ['#ff6fb1', '#7fd3ff', '#ffd23f'][Math.floor(r() * 3)] : null, ph: r() * TAU, laugh: 0, clap: 0, row: ri });
    }
  });
  return seats;
}

export function drawAudience(g, seats, t) {
  for (const a of seats) {
    const bounce = Math.abs(Math.sin(t * 14 + a.ph)) * 10 * a.laugh + Math.sin(t * 1.4 + a.ph) * 2;
    const sway = Math.sin(t * 9 + a.ph) * 0.08 * a.laugh;
    g.save(); g.translate(a.x, a.y - bounce); g.rotate(sway); g.scale(a.s, a.s);
    // With the painted critters loaded, the procedural kids would look out of
    // place among them, so each kid seat becomes one of the painted animals.
    let kind = a.kind;
    if (!AUD_ART[kind]) { const alt = ART_KINDS[Math.floor((a.ph / TAU) * ART_KINDS.length) % ART_KINDS.length]; if (art(AUD_ART[alt])) kind = alt; }
    const painted = !!(AUD_ART[kind] && drawArt(g, AUD_ART[kind], 0, 0, AUD_ART_H, AUD_ART_H, { anchor: 'bottom' }));
    if (!painted) audienceShape(g, a);
    // clapping hands pop up beside the head (above it for the taller painted heads)
    if (a.clap > 0.05) {
      const k = Math.abs(Math.sin(t * 18 + a.ph)) * 10;
      g.fillStyle = painted ? AUD_ART_PAW[kind] : a.kind === 'kid' || a.kind === 'kid2' ? '#ffd9b8' : a.col;
      const hy = painted ? -AUD_ART_H - 4 - a.clap * 20 : -118 - a.clap * 20;
      for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * (22 - k * 0.6), hy, 14, 18, sd * 0.4, 0, TAU); g.fill(); ol(g, 3); }
    }
    g.restore();
  }
}

function audienceShape(g, a) {
  const c = a.col;
  // shoulders
  g.fillStyle = a.row === 2 ? '#6c4bb0' : a.row === 1 ? '#5a3f96' : '#4b357f';
  g.beginPath(); g.ellipse(0, -10, 70, 50, 0, Math.PI, TAU); g.closePath(); g.fill(); ol(g, 3);
  g.fillStyle = c;
  switch (a.kind) {
    case 'bunny':
      for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 20, -150, 15, 46, sd * 0.15, 0, TAU); g.fill(); ol(g, 3); g.fillStyle = '#ffc2dd'; g.beginPath(); g.ellipse(sd * 20, -150, 7, 30, sd * 0.15, 0, TAU); g.fill(); g.fillStyle = c; }
      g.beginPath(); g.arc(0, -80, 48, 0, TAU); g.fill(); ol(g, 3); break;
    case 'bear':
      for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 36, -116, 17, 0, TAU); g.fill(); ol(g, 3); }
      g.beginPath(); g.arc(0, -80, 50, 0, TAU); g.fill(); ol(g, 3); break;
    case 'cat':
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 14, -118); g.lineTo(sd * 40, -150); g.lineTo(sd * 46, -100); g.closePath(); g.fill(); ol(g, 3); }
      g.beginPath(); g.arc(0, -80, 48, 0, TAU); g.fill(); ol(g, 3);
      g.strokeStyle = 'rgba(36,22,63,0.3)'; g.lineWidth = 5; for (const dx of [-14, 0, 14]) { g.beginPath(); g.moveTo(dx, -126); g.lineTo(dx, -108); g.stroke(); }
      break;
    case 'duck':
      g.beginPath(); g.arc(0, -80, 48, 0, TAU); g.fill(); ol(g, 3);
      g.beginPath(); g.moveTo(-4, -126); g.quadraticCurveTo(-14, -150, 4, -146); g.quadraticCurveTo(0, -136, 8, -126); g.fill(); ol(g, 3); break;
    default: { // kids with hair (back of head)
      g.fillStyle = c; g.beginPath(); g.arc(0, -82, 50, 0, TAU); g.fill(); ol(g, 3);
      if (a.kind === 'kid') { for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 52, -78, 18, 0, TAU); g.fill(); ol(g, 3); } }
      else { g.beginPath(); g.ellipse(0, -128, 22, 14, 0, 0, TAU); g.fill(); ol(g, 3); }
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 4; g.beginPath(); g.arc(0, -82, 34, -2.4, -1.2); g.stroke();
    }
  }
  if (a.bow) { g.save(); g.translate(a.kind === 'bunny' ? 0 : 26, a.kind === 'bunny' ? -122 : -118); g.fillStyle = a.bow; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(sd * 18, -10); g.lineTo(sd * 18, 10); g.closePath(); g.fill(); ol(g, 2.5); } g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill(); ol(g, 2); g.restore(); }
}

// ---------------------------------------------------------------------------
// Sock puppets

const SOCK_HAIR = ['#ffd23f', '#ff6fb1', '#7fe0a8', '#c77dff', '#ff9f1c', '#7fd3ff', '#ffffff', '#ff4d6d'];
/**
 * Draw a sock puppet. (x, y) = where its chin sits (like a stick puppet's
 * feet); h = head height. sock: { mouth 0..1, eyesX, eyesY (pupil offset
 * -1..1), blink 0..1, tilt, spin (-1..1 x-scale for twirls), mood }.
 */
export function drawSock(g, x, y, h, color, hair, facing, sock, t) {
  const w = h * 0.62, f = facing >= 0 ? 1 : -1;
  g.save(); g.translate(x, y);
  g.scale((sock.spin ?? 1) * f, 1);
  g.rotate(sock.tilt || 0);
  const light = shade(color, 0.35);
  // arm/tube (goes down behind the playboard)
  g.fillStyle = color;
  g.beginPath(); g.moveTo(-w * 0.48, -h * 0.4); g.lineTo(-w * 0.52, 520); g.lineTo(w * 0.52, 520); g.lineTo(w * 0.48, -h * 0.4); g.closePath(); g.fill(); ol(g, 4);
  g.fillStyle = light;
  for (let k = 0; k < 6; k++) { const yy = h * 0.05 + k * 46; g.fillRect(-w * 0.5 + 2, yy, w - 4, 20); }
  g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(-w * 0.49, -h * 0.4); g.lineTo(-w * 0.52, 520); g.moveTo(w * 0.49, -h * 0.4); g.lineTo(w * 0.52, 520); g.stroke();
  const open = clamp(sock.mouth || 0, 0, 1);
  const hinge = { x: -w * 0.42, y: -h * 0.42 };
  // lower jaw
  g.fillStyle = color;
  g.beginPath(); g.ellipse(w * 0.08, -h * 0.4, w * 0.62, h * 0.2, 0, 0, Math.PI); g.lineTo(-w * 0.5, -h * 0.4); g.fill(); ol(g, 4);
  // mouth inside
  if (open > 0.02) {
    g.fillStyle = '#b8224a';
    g.beginPath(); g.moveTo(hinge.x, hinge.y); g.lineTo(w * 0.7, -h * 0.42); g.lineTo(w * 0.62, -h * 0.42 - open * h * 0.42); g.closePath(); g.fill(); ol(g, 3);
    g.fillStyle = '#ff8fb6'; g.beginPath(); g.ellipse(w * 0.3, -h * 0.44, w * 0.2, h * 0.06 + open * h * 0.04, 0, Math.PI, TAU); g.fill();
  }
  // upper head (rotates open around the hinge)
  g.save(); g.translate(hinge.x, hinge.y); g.rotate(-open * 0.55); g.translate(-hinge.x, -hinge.y);
  g.fillStyle = color;
  g.beginPath(); g.moveTo(-w * 0.5, -h * 0.42);
  g.bezierCurveTo(-w * 0.55, -h * 1.05, w * 0.7, -h * 1.12, w * 0.74, -h * 0.5);
  g.quadraticCurveTo(w * 0.74, -h * 0.4, w * 0.6, -h * 0.4);
  g.lineTo(-w * 0.5, -h * 0.4); g.closePath(); g.fill(); ol(g, 4);
  g.fillStyle = light; g.beginPath(); g.ellipse(w * 0.66, -h * 0.5, w * 0.1, h * 0.07, 0.3, 0, TAU); g.fill();   // toe patch
  // yarn hair
  g.strokeStyle = hair || SOCK_HAIR[0]; g.lineWidth = Math.max(5, h * 0.045); g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const bx = -w * 0.28 + i * w * 0.1, by = -h * 0.88 + Math.abs(i - 2.5) * h * 0.02;
    g.beginPath(); g.arc(bx, by - h * 0.04, h * 0.05, Math.PI * 0.2 + Math.sin(t * 3 + i) * 0.3, Math.PI * 1.9); g.stroke();
  }
  // cheek
  g.fillStyle = 'rgba(255,111,177,0.55)'; g.beginPath(); g.ellipse(w * 0.36, -h * 0.5, w * 0.1, h * 0.05, 0, 0, TAU); g.fill();
  // googly eyes
  const ex = [w * 0.06, w * 0.36], ey = -h * 0.74, er = h * 0.12;
  for (let i = 0; i < 2; i++) {
    const r = er * (i ? 0.92 : 1);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex[i], ey + i * h * 0.02, r, 0, TAU); g.fill(); ol(g, 3.5);
    const bl = clamp(sock.blink || 0, 0, 1);
    if (bl > 0.6 || sock.mood === 'sleep') {
      g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.arc(ex[i], ey + i * h * 0.02, r * 0.55, 0.2, Math.PI - 0.2); g.stroke();
    } else {
      const big = sock.mood === 'wow' ? 1.25 : 1;
      const px = ex[i] + clamp(sock.eyesX || 0, -1, 1) * r * 0.42, py = ey + i * h * 0.02 + clamp(sock.eyesY || 0, -1, 1) * r * 0.42;
      g.fillStyle = NAVY; g.beginPath(); g.arc(px, py, r * 0.48 * big, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px - r * 0.15, py - r * 0.18, r * 0.14, 0, TAU); g.fill();
    }
  }
  if (sock.mood === 'sad') { g.strokeStyle = NAVY; g.lineWidth = 4; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(ex[i] - er * 0.8, ey - er * 1.2 + (i ? -6 : 6)); g.lineTo(ex[i] + er * 0.8, ey - er * 1.2 + (i ? 6 : -6)); g.stroke(); } }
  g.restore();
  g.restore();
}
export const sockHair = (i) => SOCK_HAIR[i % SOCK_HAIR.length];

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  r = Math.round(lerp(r, 255, k)); gg = Math.round(lerp(gg, 255, k)); b = Math.round(lerp(b, 255, k));
  return `rgb(${r},${gg},${b})`;
}

/** Wooden puppet stick, from (x, y) straight down behind the playboard. */
export function drawStick(g, x, y, tilt = 0) {
  g.save(); g.translate(x, y); g.rotate(tilt * 0.4);
  g.fillStyle = '#c98a4f'; g.beginPath(); g.rect(-7, -4, 14, 420); g.fill(); ol(g, 3);
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-4, 0, 3, 400);
  g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(0, -2, 13, 7, 0, 0, TAU); g.fill(); ol(g, 2.5);
  g.restore();
}

// ---------------------------------------------------------------------------
// Picture bubbles (the "talk" menu: no words, just pictures)

export const PICTURES = [
  { id: 'heart', emote: 'heart', pose: 'wave', voice: 'woo', mood: 'happy', color: '#ffe1ef' },
  { id: 'laugh', pose: 'laugh', voice: 'laugh', mood: 'laugh', color: '#fff6c8' },
  { id: 'star', emote: 'star', pose: 'celebrate', voice: 'yay', mood: 'happy', color: '#fff3b0' },
  { id: 'note', emote: 'note', pose: 'dance', voice: 'woo', mood: 'sing', color: '#efe4ff' },
  { id: 'wow', emote: 'exclaim', pose: 'surprised', voice: 'gasp', mood: 'wow', color: '#fffbe0' },
  { id: 'question', emote: 'question', pose: 'think', voice: null, mood: 'think', color: '#ffffff' },
  { id: 'sad', emote: 'rain', pose: 'sad', voice: 'aww', mood: 'sad', color: '#dfeaff' },
  { id: 'zzz', emote: 'zzz', pose: 'sleep', voice: null, mood: 'sleep', color: '#e3e0ff' },
];
// Wheel order: up, up-right, right, down-right, down, down-left, left, up-left.
export const PIC_BY_ID = Object.fromEntries(PICTURES.map((p) => [p.id, p]));

/** Draw the picture inside a bubble (centre x, y; s = picture size). */
export function drawPicture(g, id, x, y, s, t) {
  if (id === 'laugh') {
    g.save(); g.translate(x, y);
    const k = 1 + Math.sin(t * 16) * 0.06; g.scale(k, k);
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, s * 0.48, 0, TAU); g.fill(); ol(g, Math.max(2.5, s * 0.06));
    g.strokeStyle = NAVY; g.lineWidth = Math.max(2.5, s * 0.06);
    for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * s * 0.17, -s * 0.08, s * 0.08, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.fillStyle = '#b8224a'; g.beginPath(); g.moveTo(-s * 0.26, s * 0.06); g.quadraticCurveTo(0, s * 0.42, s * 0.26, s * 0.06); g.closePath(); g.fill(); ol(g, Math.max(2, s * 0.05));
    g.fillStyle = '#5cc8ff'; g.beginPath(); g.ellipse(-s * 0.4, -s * 0.02, s * 0.06, s * 0.1, 0.4, 0, TAU); g.fill();
    g.restore();
    return;
  }
  const p = PIC_BY_ID[id];
  if (id === 'wow' || id === 'question') {
    // draw the glyph without its own bubble
    g.save(); g.translate(x, y);
    ui.text(g, id === 'wow' ? '!' : '?', 0, 0, { size: s * 1.0, color: id === 'wow' ? '#ff4d6d' : '#7a4dff', strokeWidth: s * 0.12, weight: 900 });
    g.restore();
    return;
  }
  drawEmote(g, p.emote, x, y + (id === 'zzz' ? s * 0.25 : 0), s * 0.9, Math.max(0.3, t));
}

/** A speech bubble holding a picture, tail pointing down to (x, y). */
export function drawPictureBubble(g, id, x, y, t, dur, scale = 1) {
  const pop = clamp(t / 0.18, 0, 1), fade = dur ? clamp((dur - t) / 0.25, 0, 1) : 1;
  if (fade <= 0) return;
  const p = PIC_BY_ID[id];
  const s = 74 * scale, bw = s * 1.55, bh = s * 1.35;
  g.save(); g.globalAlpha *= fade;
  g.translate(x, y); const k = 0.4 + 0.6 * (pop < 1 ? Math.sin(pop * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1);
  g.scale(k, k);
  g.fillStyle = p ? p.color : '#fff';
  ui.roundRect(g, -bw / 2, -bh - s * 0.32, bw, bh, s * 0.45); g.fill();
  g.beginPath(); g.moveTo(-s * 0.18, -s * 0.34); g.lineTo(0, 0); g.lineTo(s * 0.2, -s * 0.34); g.closePath(); g.fill();
  g.lineWidth = 5; g.strokeStyle = NAVY;
  ui.roundRect(g, -bw / 2, -bh - s * 0.32, bw, bh, s * 0.45); g.stroke();
  g.fillStyle = p ? p.color : '#fff'; g.fillRect(-s * 0.16, -s * 0.38, s * 0.33, 10);
  g.beginPath(); g.moveTo(-s * 0.18, -s * 0.33); g.lineTo(0, 0); g.lineTo(s * 0.2, -s * 0.33); g.stroke();
  drawPicture(g, id, 0, -bh / 2 - s * 0.32, s, t);
  g.restore();
}

/** Rose thrown at the curtain call. */
export function drawRose(g, x, y, rot, s = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (!drawArt(g, 'prop/pt-rose', 0, 0, 70, 70)) {
    g.strokeStyle = '#2bb673'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 34); g.stroke();
    g.fillStyle = '#4fe08f'; g.beginPath(); g.ellipse(8, 20, 10, 5, -0.5, 0, TAU); g.fill(); ol(g, 2);
    g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, -6, 16, 0, TAU); g.fill(); ol(g, 3);
    g.strokeStyle = '#b8224a'; g.lineWidth = 3; g.beginPath(); g.arc(0, -6, 8, 0.5, TAU - 0.6); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// Menu thumbnail

