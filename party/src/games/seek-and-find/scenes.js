// The three Hide & Seek Picnic scenes: Picnic Meadow (day), Toy Shop
// (indoors) and Starry Forest (night). Each build() returns the static
// background painter, the occluders (placed by code so hiding spots can be
// randomized) and extra free-standing spots (blanket, lily pads, shelves).
//
// Generated art can replace the drawn back layer: `bg/seek-and-find-<id>`
// (1920x1080; the code still places every occluder on top of it at the
// positions below, mirrored when the scene is flipped).
import { W, H } from '../../engine/canvas.js';
import { art } from '../../engine/art.js';
import { TAU } from '../../engine/util.js';
import { drawStarShape } from '../../engine/emotes.js';
import { PALETTES, occluderSpots, tinyFlower, poly, rr, fillStroke, NAVY } from './painters.js';

/** Small deterministic RNG so a scene's grass and stars don't shimmer between rebuilds. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const spot = (x, y, size, tags, layer = 'top', dx = 0, dy = 0, t = 0) => ({ x, y, dx, dy, t, size, tags, layer });

// ---------------------------------------------------------------------------------
// Picnic Meadow
const PICNIC = {
  id: 'picnic', name: 'Picnic Meadow', night: false,
  bg: 'bg/seek-and-find-picnic',
  occ: [
    ['tree', 210, 640, 1.0, 1, 0], ['tree', 1720, 630, 0.95, -1, 1],
    ['bush', 600, 560, 0.9, 1, 0], ['bush', 1350, 575, 0.85, -1, 1], ['bush', 1520, 870, 1.0, 1, 2], ['bush', 640, 905, 0.9, -1, 1],
    ['basket', 1120, 724, 0.9, 1, 0],
    ['rock', 470, 640, 0.8, 1, 0], ['rock', 1580, 720, 0.85, -1, 0], ['rock', 935, 548, 0.55, 1, 0],
    ['log', 1300, 905, 0.85, -1, 0],
    ['reeds', 170, 712, 1.0, 1, 0], ['reeds', 470, 712, 0.75, -1, 0],
    ['flowers', 380, 590, 0.7, 1, 0], ['flowers', 1040, 572, 0.62, 1, 1], ['flowers', 1880, 860, 0.8, -1, 2], ['flowers', 1000, 905, 0.72, 1, 2],
    ['tuft', 520, 742, 0.9], ['tuft', 820, 880, 1], ['tuft', 1380, 780, 0.9], ['tuft', 860, 590, 0.8], ['tuft', 300, 880, 1],
    ['tuft', 1820, 740, 0.9], ['tuft', 70, 790, 1], ['tuft', 1210, 600, 0.8], ['tuft', 1640, 610, 0.8], ['tuft', 760, 640, 0.7],
  ],
  extra: [
    // on the blanket and its plates
    spot(780, 700, 44, ['perch']), spot(905, 786, 46, ['perch']), spot(1010, 676, 44, ['perch']), spot(720, 782, 40, ['perch', 'small']),
    // lily pads
    spot(250, 792, 44, ['water', 'perch']), spot(436, 774, 40, ['water', 'perch']),
  ],
  decoys: [['cupcake', 840, 718, 46], ['cupcake', 878, 708, 44], ['cupcake', 805, 728, 44], ['cookie', 1020, 772, 34], ['cookie', 1050, 762, 32]],
  pool: {
    count: ['ladybug', 'strawberry', 'butterfly'],
    single: ['bunny', 'snail', 'bird', 'frog', 'goldcupcake', 'scarf', 'duck', 'letter', 'donut', 'lollipop', 'gem', 'mouse', 'butterfly', 'ladybug'],
    npc: ['fellowfox'],
  },
  paint(g, R) {
    const sky = g.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, '#7fcfff'); sky.addColorStop(1, '#e6f8ff');
    g.fillStyle = sky; g.fillRect(0, 0, W, 560);
    // sun
    g.save(); g.translate(1760, 112);
    g.fillStyle = 'rgba(255,240,150,0.35)'; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10; g.beginPath(); g.moveTo(Math.cos(a) * 82, Math.sin(a) * 82); g.lineTo(Math.cos(a) * 104, Math.sin(a) * 104); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 64, 0, TAU); g.fillStyle = '#ffe14d'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
    g.restore();
    for (const [x, y, s] of [[420, 170, 1.0], [960, 130, 0.75], [1330, 220, 1.1], [130, 300, 0.6]]) cloud(g, x, y, s);
    // hills
    hill(g, 470, '#bfe9a0', 46, 0.0032, 1.2); hill(g, 520, '#9bd97a', 36, 0.0045, 3.1);
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 220 + R() * 80, y = 470 + Math.sin(x * 0.0032 + 1.2) * 46 - 6;
      g.fillStyle = '#7cc463'; g.beginPath(); g.arc(x, y - 18, 20 + R() * 8, 0, TAU); g.fill();
      g.fillStyle = '#8a6a4a'; g.fillRect(x - 3, y - 4, 6, 10);
    }
    // meadow
    const gr = g.createLinearGradient(0, 520, 0, H);
    gr.addColorStop(0, '#8fd86a'); gr.addColorStop(1, '#5cb845');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) g.lineTo(x, 540 + Math.sin(x * 0.004 + 0.4) * 14);
    g.lineTo(W, H); g.closePath(); g.fill();
    // path
    g.fillStyle = '#f3dfae'; g.beginPath();
    g.moveTo(1180, H); g.bezierCurveTo(1220, 900, 1340, 760, 1180, 640); g.bezierCurveTo(1090, 580, 1110, 560, 1140, 540);
    g.lineTo(1166, 540); g.bezierCurveTo(1150, 570, 1150, 590, 1250, 640); g.bezierCurveTo(1420, 760, 1340, 920, 1360, H); g.closePath(); g.fill();
    grassMarks(g, R, 140, 560, H, '#4ea83c');
    // pond
    g.save(); g.translate(330, 770);
    g.beginPath(); g.ellipse(0, 0, 250, 86, 0, 0, TAU); g.fillStyle = '#4ea83c'; g.fill();
    g.beginPath(); g.ellipse(0, 4, 236, 76, 0, 0, TAU);
    const wg = g.createLinearGradient(0, -76, 0, 80); wg.addColorStop(0, '#5ec4f5'); wg.addColorStop(1, '#9fe4ff');
    g.fillStyle = wg; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
    for (const [x, y, w] of [[-120, -10, 50], [60, 24, 70], [140, -20, 40], [-40, 40, 40]]) { g.beginPath(); g.ellipse(x, y, w, 6, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    for (const [x, y, r] of [[-80, 22, 34], [106, 4, 30]]) lilyPad(g, x, y, r);
    g.restore();
    // blanket (gingham in perspective)
    const TL = [690, 640], TR = [1190, 640], BR = [1270, 822], BL = [610, 822];
    const L = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    poly(g, [TL, TR, BR, BL]); g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = 'rgba(255,77,109,0.5)';
    for (let i = 0; i < 12; i += 2) { poly(g, [L(TL, TR, i / 12), L(TL, TR, (i + 1) / 12), L(BL, BR, (i + 1) / 12), L(BL, BR, i / 12)]); g.fill(); }
    for (let j = 0; j < 6; j += 2) { poly(g, [L(TL, BL, j / 6), L(TR, BR, j / 6), L(TR, BR, (j + 1) / 6), L(TL, BL, (j + 1) / 6)]); g.fill(); }
    poly(g, [TL, TR, BR, BL]); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    // plates
    for (const [x, y, rx] of [[842, 734, 70], [1036, 780, 54]]) {
      g.beginPath(); g.ellipse(x, y, rx, rx * 0.32, 0, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.ellipse(x, y, rx * 0.7, rx * 0.2, 0, 0, TAU); g.strokeStyle = '#c9e7ff'; g.lineWidth = 3; g.stroke();
    }
    // a teapot and cups
    teapot(g, 960, 690);
    // scattered meadow flowers
    for (let i = 0; i < 46; i++) {
      const x = R() * W, y = 580 + R() * 470;
      if (x > 590 && x < 1290 && y > 630 && y < 830) continue;
      if (Math.hypot((x - 330) / 270, (y - 770) / 100) < 1) continue;
      tinyFlower(g, x, y, 7 + R() * 5, ['#ffffff', '#ffb3d9', '#ffe066', '#c9a6ff'][i % 4]);
    }
  },
  ambient(g, t, mirror) {
    // drifting petals
    g.save();
    for (let i = 0; i < 7; i++) {
      const x = ((i * 331 + t * (18 + i * 3)) % (W + 200)) - 100, y = 160 + ((i * 97 + Math.sin(t * 0.7 + i) * 40 + t * 12) % 700);
      g.save(); g.translate(x, y); g.rotate(t * 1.3 + i); g.globalAlpha = 0.8;
      g.fillStyle = ['#ffb3d9', '#ffffff', '#ffe066'][i % 3]; g.beginPath(); g.ellipse(0, 0, 7, 4, 0, 0, TAU); g.fill();
      g.restore();
    }
    g.restore();
  },
};

// ---------------------------------------------------------------------------------
// Toy Shop
const SHELVES = [[60, 500], [1400, 1860]];
const TOYSHOP = {
  id: 'toyshop', name: 'Toy Shop', night: false, indoor: true,
  bg: 'bg/seek-and-find-toyshop',
  occ: [
    ['curtain', 735, 704, 1.0, 1, 0], ['curtain', 1185, 704, 1.0, -1, 0],
    ['books', 170, 336, 0.95, 1, 0], ['jar', 330, 336, 0.95, 1, 0], ['blocks', 440, 336, 0.6, -1, 1],
    ['blocks', 150, 512, 0.7, 1, 0], ['books', 380, 512, 0.9, -1, 2],
    ['books', 1520, 336, 0.95, 1, 3], ['jar', 1770, 336, 0.95, -1, 1], ['blocks', 1650, 336, 0.55, 1, 2],
    ['jar', 1480, 512, 0.9, 1, 2], ['books', 1720, 512, 0.95, 1, 1],
    ['balloons', 1300, 704, 0.9, 1, 0],
    ['chest', 560, 880, 0.85, 1, 0], ['dollhouse', 1250, 870, 0.82, -1, 0], ['bigteddy', 1680, 880, 0.82, -1, 0],
    ['presents', 880, 896, 0.75, 1, 0], ['drum', 1040, 904, 0.75, -1, 1], ['blocks', 300, 892, 0.6, 1, 3],
  ],
  extra: [
    spot(860, 404, 44, ['shelf', 'perch']), spot(1060, 404, 44, ['shelf', 'perch']),
    spot(470, 512, 40, ['shelf']), spot(250, 336, 40, ['shelf']), spot(1620, 512, 40, ['shelf']), spot(1830, 512, 40, ['shelf', 'small']),
    spot(960, 800, 40, ['ground', 'small']), spot(760, 760, 40, ['ground', 'small']), spot(1450, 790, 40, ['ground', 'small']),
  ],
  decoys: [],
  pool: {
    count: ['mouse', 'duck', 'gem', 'star'],
    single: ['crown', 'wand', 'teddy', 'block', 'ball', 'present', 'lollipop', 'tiara', 'goldcupcake', 'potion', 'letter', 'donut', 'mouse', 'duck'],
    npc: [],
  },
  paint(g, R) {
    // wallpaper
    g.fillStyle = '#ffe3ef'; g.fillRect(0, 0, W, 720);
    g.fillStyle = '#ffd2e6'; for (let x = 0; x < W; x += 90) g.fillRect(x, 0, 45, 720);
    g.fillStyle = 'rgba(255,255,255,0.6)';
    for (let x = 22; x < W; x += 90) for (let y = 60; y < 640; y += 120) { g.save(); g.translate(x + ((y / 120) % 2) * 45, y); drawStarShape(g, 16, 'rgba(255,255,255,0.75)'); g.restore(); }
    // wainscot
    g.fillStyle = '#bff0dc'; g.fillRect(0, 640, W, 80); g.fillStyle = '#9fe0c6'; g.fillRect(0, 640, W, 10);
    g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.25)'; for (let x = 0; x < W; x += 120) { g.strokeRect(x + 14, 662, 92, 46); }
    // window
    rr(g, 770, 120, 380, 290, 18); g.fillStyle = '#8fd3ff'; g.fill();
    g.save(); rr(g, 770, 120, 380, 290, 18); g.clip(); cloud(g, 900, 230, 0.7); cloud(g, 1090, 300, 0.55);
    g.fillStyle = '#a5e48a'; g.beginPath(); g.ellipse(960, 440, 300, 80, 0, 0, TAU); g.fill(); g.restore();
    rr(g, 770, 120, 380, 290, 18); g.lineWidth = 12; g.strokeStyle = '#ffffff'; g.stroke(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(954, 124, 12, 282); g.fillRect(774, 260, 372, 12);
    rr(g, 740, 400, 440, 24, 8); fillStroke(g, '#ffffff');
    // shelf units
    for (const [x0, x1] of SHELVES) {
      rr(g, x0, 150, x1 - x0, 560, 12); fillStroke(g, '#f2c79a');
      g.fillStyle = '#e3b183'; g.fillRect(x0 + 16, 166, x1 - x0 - 32, 530);
      for (const y of [336, 512, 690]) { rr(g, x0 - 10, y, x1 - x0 + 20, 18, 6); fillStroke(g, '#d39a66'); }
    }
    // little framed pictures and a clock
    for (const [x, y, c] of [[640, 210, '#7fe08a'], [1290, 230, '#7fc8ff']]) {
      rr(g, x - 50, y - 40, 100, 80, 8); fillStroke(g, '#ffd23f'); rr(g, x - 38, y - 28, 76, 56, 4); g.fillStyle = c; g.fill();
      g.save(); g.translate(x, y + 4); drawStarShape(g, 26, '#ffffff'); g.restore();
    }
    g.save(); g.translate(1310, 520); g.beginPath(); g.arc(0, 0, 44, 0, TAU); fillStroke(g, '#ffffff');
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -28); g.moveTo(0, 0); g.lineTo(20, 8); g.stroke(); g.restore();
    // bunting
    g.lineWidth = 3; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(0, 40); g.quadraticCurveTo(W / 2, 90, W, 40); g.stroke();
    for (let i = 0; i < 24; i++) {
      const u = (i + 0.5) / 24, x = u * W, y = 40 + 4 * u * (1 - u) * 50 * 0.98;
      poly(g, [[x - 26, y], [x + 26, y], [x, y + 44]]); fillStroke(g, ['#ff6b8b', '#ffd23f', '#5aaef5', '#7fe08a', '#b36bff'][i % 5], 3);
    }
    // floor
    const fl = g.createLinearGradient(0, 710, 0, H); fl.addColorStop(0, '#e8b07a'); fl.addColorStop(1, '#d9985e');
    g.fillStyle = fl; g.fillRect(0, 710, W, H - 710);
    g.strokeStyle = 'rgba(120,70,30,0.35)'; g.lineWidth = 3;
    for (let y = 760; y < H; y += 56) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let r = 0; r < 7; r++) for (let x = (r % 2) * 160; x < W; x += 320) { const y = 710 + r * 56; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 56); g.stroke(); }
    g.lineWidth = 4; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(0, 710); g.lineTo(W, 710); g.stroke();
    // rug
    g.save(); g.translate(960, 830);
    g.beginPath(); g.ellipse(0, 0, 440, 96, 0, 0, TAU); fillStroke(g, '#c9a6ff');
    g.beginPath(); g.ellipse(0, 0, 380, 76, 0, 0, TAU); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.setLineDash([18, 14]); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.ellipse(0, 0, 230, 44, 0, 0, TAU); g.fillStyle = '#ffb3e0'; g.fill();
    g.restore();
    // toys lying around on the shelves (background detail)
    for (const [x, y, c] of [[100, 336, '#ff6b8b'], [1870, 336, '#7fc8ff'], [1430, 512, '#ffd23f'], [100, 690, '#7fe08a'], [1850, 690, '#ff9f1c']]) {
      g.beginPath(); g.arc(x, y - 18, 18, 0, TAU); fillStroke(g, c, 3);
      g.beginPath(); g.arc(x - 5, y - 24, 5, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
    }
  },
  ambient(g, t) {
    // dust motes in the window light
    g.save(); g.globalAlpha = 0.5; g.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) {
      const x = 800 + ((i * 53 + Math.sin(t * 0.4 + i) * 30) % 320), y = 160 + ((i * 89 + t * 10) % 520);
      g.beginPath(); g.arc(x, y, 2 + (i % 3), 0, TAU); g.fill();
    }
    g.restore();
  },
};

// ---------------------------------------------------------------------------------
// Starry Forest (night)
const FOREST = {
  id: 'forest', name: 'Starry Forest', night: true,
  bg: 'bg/seek-and-find-forest',
  occ: [
    ['tree', 210, 650, 1.0, 1, 0], ['tree', 1740, 640, 0.95, -1, 2], ['tree', 990, 540, 0.62, 1, 1],
    ['bigshroom', 640, 640, 0.85, 1, 0], ['bigshroom', 1400, 905, 0.75, -1, 0], ['bigshroom', 420, 905, 0.62, 1, 0],
    ['fern', 830, 870, 0.9, 1, 0], ['fern', 1600, 580, 0.75, -1, 0], ['fern', 80, 860, 0.8, 1, 0],
    ['bush', 470, 560, 0.85, 1, 1], ['bush', 1260, 585, 0.8, -1, 0], ['bush', 1700, 880, 0.9, 1, 1],
    ['rock', 1110, 770, 0.8, 1, 0], ['rock', 330, 790, 0.75, -1, 0],
    ['log', 720, 740, 0.85, -1, 0],
    ['reeds', 1330, 716, 0.85, 1, 0], ['reeds', 1590, 722, 0.75, -1, 0],
    ['flowers', 1000, 900, 0.75, 1, 0], ['flowers', 560, 800, 0.66, -1, 1], ['flowers', 1880, 760, 0.7, -1, 2],
    ['tuft', 1200, 880, 0.9], ['tuft', 940, 640, 0.8], ['tuft', 260, 900, 0.9], ['tuft', 1830, 600, 0.8], ['tuft', 610, 900, 0.9],
  ],
  extra: [spot(1400, 792, 44, ['water', 'perch']), spot(1540, 764, 40, ['water', 'perch'])],
  decoys: [],
  pool: {
    count: ['firefly', 'star', 'gem'],
    single: ['owl', 'fairy', 'lantern', 'crystal', 'potion', 'tiara', 'wand', 'frog', 'snail', 'moondrop', 'bunny', 'firefly', 'star'],
    npc: ['glimmer', 'professor-hoot'],
  },
  paint(g, R) {
    const sky = g.createLinearGradient(0, 0, 0, 560);
    sky.addColorStop(0, '#1b1947'); sky.addColorStop(0.6, '#33307a'); sky.addColorStop(1, '#5a4fa6');
    g.fillStyle = sky; g.fillRect(0, 0, W, 580);
    // moon with halo
    g.save(); g.translate(330, 170);
    const halo = g.createRadialGradient(0, 0, 40, 0, 0, 200); halo.addColorStop(0, 'rgba(255,248,200,0.45)'); halo.addColorStop(1, 'rgba(255,248,200,0)');
    g.fillStyle = halo; g.fillRect(-200, -200, 400, 400);
    g.beginPath(); g.arc(0, 0, 68, 0, TAU); g.fillStyle = '#fff6c8'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
    for (const [x, y, r] of [[-20, -16, 12], [22, 10, 9], [-6, 28, 7]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#f0e2a6'; g.fill(); }
    g.restore();
    // distant forest silhouettes
    g.fillStyle = '#2a2f6a';
    for (let x = -40; x < W + 60; x += 70) { const h = 80 + ((x * 37) % 60); g.beginPath(); g.moveTo(x - 46, 540); g.lineTo(x, 540 - h); g.lineTo(x + 46, 540); g.closePath(); g.fill(); }
    hill(g, 520, '#2c4f6a', 26, 0.004, 2.0);
    // ground
    const gr = g.createLinearGradient(0, 540, 0, H); gr.addColorStop(0, '#2f5f5c'); gr.addColorStop(1, '#1b3e40');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 30) g.lineTo(x, 556 + Math.sin(x * 0.005 + 1) * 12); g.lineTo(W, H); g.closePath(); g.fill();
    // glowing stepping stones path
    for (let i = 0; i < 9; i++) {
      const u = i / 8, x = 860 + Math.sin(u * 3.2) * 160 + u * 60, y = 600 + u * 420;
      g.beginPath(); g.ellipse(x, y, 34 + u * 26, 10 + u * 8, 0, 0, TAU); g.fillStyle = 'rgba(160,240,230,0.35)'; g.fill();
    }
    grassMarks(g, R, 120, 580, H, '#3f7f72');
    // pond with the moon's reflection
    g.save(); g.translate(1460, 775);
    g.beginPath(); g.ellipse(0, 0, 244, 82, 0, 0, TAU); g.fillStyle = '#24524f'; g.fill();
    g.beginPath(); g.ellipse(0, 4, 230, 72, 0, 0, TAU);
    const wg = g.createLinearGradient(0, -70, 0, 76); wg.addColorStop(0, '#2b3f86'); wg.addColorStop(1, '#4a66b8');
    g.fillStyle = wg; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = 'rgba(255,246,200,0.5)'; g.beginPath(); g.ellipse(-30, 10, 40, 12, 0, 0, TAU); g.fill();
    for (const [x, y, r] of [[-60, 18, 30], [80, -10, 26]]) lilyPad(g, x, y, r, true);
    g.restore();
    // glowing specks of moss
    for (let i = 0; i < 40; i++) {
      const x = R() * W, y = 600 + R() * 450;
      if (Math.hypot((x - 1460) / 260, (y - 775) / 96) < 1) continue;
      g.fillStyle = ['rgba(127,243,255,0.6)', 'rgba(201,166,255,0.6)', 'rgba(255,230,128,0.5)'][i % 3];
      g.beginPath(); g.arc(x, y, 3 + R() * 3, 0, TAU); g.fill();
    }
  },
  ambient(g, t) {
    // twinkling stars (in the sky only, never down where fireflies hide)
    g.save();
    for (let i = 0; i < 46; i++) {
      const x = (i * 211.7) % W, y = 20 + ((i * 97.3) % 330);
      if (Math.hypot(x - 330, y - 170) < 110) continue;
      const k = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + (i % 5) * 0.3) + i));
      g.globalAlpha = k; g.save(); g.translate(x, y); drawStarShape(g, 8 + (i % 4) * 3, '#fff6c8'); g.restore();
    }
    g.restore();
  },
};

export const SCENES = [PICNIC, TOYSHOP, FOREST];

// ---------------------------------------------------------------------------------
function cloud(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const cs = [[-60, 10, 40], [-15, -15, 55], [45, 0, 45], [85, 18, 30], [0, 20, 40]];
  g.beginPath(); for (const [cx, cy, r] of cs) { g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, TAU); }
  g.lineWidth = 8; g.strokeStyle = 'rgba(36,22,63,0.18)'; g.stroke();
  g.fillStyle = '#ffffff'; g.fill();
  g.restore();
}
function hill(g, y, color, amp, freq, phase) {
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35);
  g.lineTo(W, H); g.closePath(); g.fillStyle = color; g.fill();
}
function grassMarks(g, R, n, y0, y1, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = y0 + R() * (y1 - y0);
    g.beginPath(); g.moveTo(x - 6, y - 8); g.lineTo(x, y); g.lineTo(x + 5, y - 10); g.stroke();
  }
  g.restore();
}
function lilyPad(g, x, y, r, night = false) {
  g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, 0.35, TAU - 0.15); g.closePath();
  g.fillStyle = night ? '#2f7f68' : '#5cc257'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
  if (!night) tinyFlower(g, x - r * 0.4, y - r * 0.2, 8, '#ffb3d9');
}
function teapot(g, x, y) {
  g.save(); g.translate(x, y);
  g.lineWidth = 3.5; g.strokeStyle = NAVY;
  g.beginPath(); g.moveTo(30, -10); g.quadraticCurveTo(52, -16, 54, -36); g.lineWidth = 9; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#7fc8ff'; g.stroke();
  g.strokeStyle = NAVY; g.lineWidth = 3.5;
  g.beginPath(); g.arc(-34, -20, 14, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
  g.beginPath(); g.ellipse(0, -20, 36, 28, 0, 0, TAU); fillStroke(g, '#7fc8ff', 3.5);
  g.beginPath(); g.ellipse(0, -46, 18, 6, 0, 0, TAU); fillStroke(g, '#ffffff', 3);
  g.beginPath(); g.arc(0, -54, 6, 0, TAU); fillStroke(g, '#ff8fc7', 3);
  for (const k of [-1, 1]) { g.save(); g.translate(k * 14, -16); tinyFlower(g, 0, 0, 8, '#ffffff', '#ffd23f'); g.restore(); }
  // cups
  for (const cx of [-70, 66]) { rr(g, cx - 14, -16, 28, 22, 8); fillStroke(g, '#ffffff', 3); }
  g.restore();
}

/**
 * Build a playable layout for scene `def`. mirror flips it left-right.
 * Returns { def, occ: [...], spots: [...], decoys: [...], paintBg(g), ambient(g, t) }.
 */
export function buildScene(def, mirror, seed) {
  const X = (x) => (mirror ? W - x : x);
  const pal = PALETTES[def.night ? 'night' : 'day'];
  const occ = def.occ.map(([type, x, y, s = 1, flip = 1, v = 0], i) => ({
    type, x: X(x), y, s, flip: flip * (mirror ? -1 : 1), v: v + (seed % 3), pal, night: def.night, i,
  })).sort((a, b) => a.y - b.y);
  const spots = [];
  for (const oc of occ) spots.push(...occluderSpots(oc));
  for (const sp of def.extra) spots.push({ ...sp, x: X(sp.x), dx: sp.dx * (mirror ? -1 : 1) });
  const decoys = def.decoys.map(([id, x, y, h], i) => ({ id, x: X(x), y, h, seed: i * 1.7, variant: i }));
  return {
    def, occ, spots, decoys, mirror,
    paintBg(g) {
      g.save();
      if (mirror) { g.translate(W, 0); g.scale(-1, 1); }
      const img = art(def.bg);
      if (img) g.drawImage(img, 0, 0, W, H);
      else def.paint(g, rng(seed * 7919 + 13));
      g.restore();
    },
    ambient(g, t) { def.ambient && def.ambient(g, t, mirror); },
  };
}
