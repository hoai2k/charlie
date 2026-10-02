import { drawNpcSprite } from '../engine/npc-art.js';
// Broomstick Dash - wizard-school sky race. Every player flies in their own
// horizontal lane over the SAME course. Hold A to rise, let go to glide down.
// Fly through star rings to boost, dodge grumpy storm clouds, grab owl-mail.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, TAU } from '../engine/util.js';

// --- tuning -----------------------------------------------------------------
const COURSE = 26;        // course length in "course units" (1 unit = hx px)
const BASE_V = 0.62;      // course units per second
const TIME_CAP = 60;
const LANES_TOP = 124, LANES_BOT = 990;
const NAVY = '#24163f';

// Poses. New poses we would love (see report); until they exist we map to the
// nearest current pose and add emotes/particles.
const POSE = {
  rise: 'broom-rise',    // falls back to ride  (leaning forward, hair streaming, gripping the broom)
  glide: 'broom-glide',  // falls back to ride (sitting upright, relaxed, one hand waving)
  zapped: 'broom-zapped', // falls back to hurt (frizzy hair, startled, tipped on the broom)
  win: 'celebrate',
};

const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (t) => t * t * (3 - 2 * t);
const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th');

export const meta = {
  id: 'broomstick-dash',
  title: 'Broomstick Dash',
  category: 'party',
  type: 'Race',
  goal: 'Zoom through the sky and reach the castle tower first!',
  controls: [['a', 'Hold to fly UP, let go to glide DOWN']],
  tips: ['Fly through the star rings for a speed boost!', 'Grumpy storm clouds zap you and slow you down.', 'Owl-mail envelopes give a little bonus zoom.'],
  music: 'chase',
  duration: '40 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  flyIn: false,   // lanes need a fixed view
  drawIcon(g, x, y, w, h, t = 0) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#3b2a86'); gr.addColorStop(0.6, '#a465cf'); gr.addColorStop(1, '#ffb7a0');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) { g.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 2 + i)); g.beginPath(); g.arc(x + hh(i) * w, y + hh(i + 40) * h * 0.6, 2 + hh(i + 9) * 3, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    // distant castle
    g.fillStyle = 'rgba(60,38,120,0.85)';
    const bx = x + w * 0.72, by = y + h;
    g.fillRect(bx - w * 0.07, by - h * 0.42, w * 0.14, h * 0.42);
    g.beginPath(); g.moveTo(bx - w * 0.09, by - h * 0.42); g.lineTo(bx, by - h * 0.62); g.lineTo(bx + w * 0.09, by - h * 0.42); g.fill();
    g.fillRect(bx + w * 0.1, by - h * 0.28, w * 0.1, h * 0.28);
    // clouds
    ui.cloud(g, x + w * 0.2, y + h * 0.86, h / 420, '#ffd9ec', 0.9);
    ui.cloud(g, x + w * 0.85, y + h * 0.9, h / 520, '#ffd9ec', 0.9);
    // star ring
    const rx = x + w * 0.7, ry = y + h * 0.4 + Math.sin(t * 2) * 4, rr = h * 0.2;
    g.lineWidth = h * 0.045; g.strokeStyle = '#ffd23f'; g.beginPath(); g.ellipse(rx, ry, rr * 0.35, rr, 0, 0, TAU); g.stroke();
    // storm cloud
    stormCloud(g, x + w * 0.2, y + h * 0.3, h * 0.13, t, 0, false);
    // wizard on a broom
    g.save(); g.translate(x + w * 0.46, y + h * 0.62 + Math.sin(t * 3) * 3); g.rotate(-0.12);
    const s = h / 300;
    g.scale(s, s);
    drawBroomShape(g, 100, t);
    g.strokeStyle = '#ff6fb1'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, -34); g.quadraticCurveTo(-60, -30, -105, -52 + Math.sin(t * 6) * 8); g.stroke(); // scarf
    g.lineWidth = 6; g.strokeStyle = NAVY; g.fillStyle = '#9b5cff';
    g.beginPath(); g.moveTo(-26, -30); g.lineTo(18, -30); g.lineTo(28, -4); g.lineTo(-32, -4); g.closePath(); g.fill(); g.stroke(); // robe
    g.fillStyle = '#ffe2c8'; g.beginPath(); g.arc(-4, -56, 24, 0, TAU); g.fill(); g.stroke();   // head
    g.fillStyle = NAVY; g.beginPath(); g.arc(4, -58, 3.5, 0, TAU); g.arc(-12, -58, 3.5, 0, TAU); g.fill();
    g.lineWidth = 3.5; g.beginPath(); g.arc(-4, -50, 8, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = '#7a4fc2'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-34, -70); g.quadraticCurveTo(-8, -84, 24, -70); g.lineTo(0, -140); g.closePath(); g.fill(); g.stroke(); // hat
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(-2, -92, 6, 0, TAU); g.fill();
    g.restore();
  },
};

// --- vector props ------------------------------------------------------------
function drawBroomShape(g, h, t = 0, flutter = 0) {
  // forward space: +x forward, origin at the sitting point. h = actor height.
  const ow = Math.max(2, h * 0.03);
  g.save();
  g.lineJoin = 'round'; g.lineWidth = ow; g.strokeStyle = NAVY;
  // bristles
  const fl = Math.sin(t * 14) * h * 0.02 * (1 + flutter * 2);
  g.fillStyle = '#f2c14e';
  g.beginPath();
  g.moveTo(-h * 0.34, -h * 0.03); g.lineTo(-h * 0.78, -h * 0.2 + fl); g.quadraticCurveTo(-h * 0.9, 0, -h * 0.78, h * 0.2 - fl); g.lineTo(-h * 0.34, h * 0.03);
  g.closePath(); g.fill(); g.stroke();
  g.lineWidth = ow * 0.6; g.strokeStyle = '#b8862a';
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-h * 0.4, i * h * 0.012); g.lineTo(-h * 0.8, i * h * 0.075 + fl * Math.sign(i)); g.stroke(); }
  // handle
  g.lineWidth = ow; g.strokeStyle = NAVY; g.fillStyle = '#b97a45';
  g.beginPath(); g.moveTo(-h * 0.36, -h * 0.035); g.lineTo(h * 0.66, -h * 0.02); g.quadraticCurveTo(h * 0.74, 0, h * 0.66, h * 0.025); g.lineTo(-h * 0.36, h * 0.035); g.closePath(); g.fill(); g.stroke();
  // tie band
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.rect(-h * 0.4, -h * 0.055, h * 0.07, h * 0.11); g.fill(); g.stroke();
  // shine
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = ow * 0.6;
  g.beginPath(); g.moveTo(-h * 0.2, -h * 0.015); g.lineTo(h * 0.5, -h * 0.008); g.stroke();
  g.restore();
}

function stormCloud(g, x, y, r, t, seed, flash) {
  g.save(); g.translate(x, y);
  const puffs = [[-0.8, 0.12, 0.5], [-0.35, -0.3, 0.68], [0.3, -0.34, 0.64], [0.82, 0.1, 0.5], [0, 0.18, 0.62]];
  const wob = 1 + Math.sin(t * 3 + seed) * 0.03;
  g.scale(wob, 1 / wob);
  const ow = Math.max(2, r * 0.08);
  g.fillStyle = NAVY;
  for (const [px, py, pr] of puffs) { g.beginPath(); g.arc(px * r, py * r, pr * r + ow, 0, TAU); g.fill(); }
  g.beginPath(); g.rect(-0.8 * r, 0.1 * r, 1.62 * r, 0.62 * r + ow); g.fill();
  g.fillStyle = flash ? '#fff3a0' : '#6f5fa0';
  for (const [px, py, pr] of puffs) { g.beginPath(); g.arc(px * r, py * r, pr * r, 0, TAU); g.fill(); }
  g.beginPath(); g.rect(-0.8 * r, 0.1 * r, 1.62 * r, 0.6 * r); g.fill();
  // belly shade + highlight
  g.fillStyle = flash ? '#ffe46b' : '#5a4b8a';
  g.beginPath(); g.ellipse(0, 0.55 * r, 0.82 * r, 0.2 * r, 0, 0, Math.PI); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(-0.35 * r, -0.45 * r, 0.3 * r, 0.12 * r, -0.5, 0, TAU); g.fill();
  // grumpy face
  const ex = 0.3 * r, ey = 0.02 * r;
  g.fillStyle = '#fff';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, ey, 0.17 * r, 0.2 * r, 0, 0, TAU); g.fill(); g.lineWidth = ow * 0.7; g.strokeStyle = NAVY; g.stroke(); }
  g.fillStyle = NAVY;
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex + 0.03 * r, ey + 0.04 * r, 0.075 * r, 0, TAU); g.fill(); }
  g.lineWidth = ow * 1.3; g.lineCap = 'round'; g.strokeStyle = NAVY;
  g.beginPath(); g.moveTo(-ex - 0.2 * r, -0.28 * r); g.lineTo(-ex + 0.17 * r, -0.12 * r); g.stroke();
  g.beginPath(); g.moveTo(ex + 0.2 * r, -0.28 * r); g.lineTo(ex - 0.17 * r, -0.12 * r); g.stroke();
  g.beginPath(); g.arc(0, 0.5 * r, 0.2 * r, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
  stormLightning(g, 0, 0, r, t, seed, flash);
  g.restore();
}


// Separate effect: the approved cloud art never contains a baked bolt.
function stormLightning(g, x, y, r, t, seed, flash) {
  g.save(); g.translate(x, y);
  const ow = Math.max(2, r * 0.08);
  // little lightning bolt
  if (Math.sin(t * 7 + seed * 3) > 0.35 || flash) {
    if (drawArt(g, 'prop/storm-cloud-lightning', 0, r * 1.05, r * 0.45, r * 0.8)) { g.restore(); return; }
    g.fillStyle = '#ffe64d'; g.strokeStyle = NAVY; g.lineWidth = ow * 0.8; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-0.05 * r, 0.72 * r); g.lineTo(0.2 * r, 0.72 * r); g.lineTo(0.08 * r, 0.98 * r); g.lineTo(0.28 * r, 0.98 * r); g.lineTo(-0.1 * r, 1.4 * r); g.lineTo(0, 1.05 * r); g.lineTo(-0.18 * r, 1.05 * r); g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

function mailItem(g, x, y, s, t, seed) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 5 + seed) * 0.12);
  const flap = Math.sin(t * 16 + seed) * 0.5;
  const ow = Math.max(2, s * 0.09);
  g.lineJoin = 'round'; g.lineWidth = ow; g.strokeStyle = NAVY; g.fillStyle = '#fff';
  for (const side of [-1, 1]) {
    g.save(); g.scale(side, 1); g.translate(s * 0.85, -s * 0.15); g.rotate(-0.5 - flap);
    g.beginPath(); g.ellipse(s * 0.45, 0, s * 0.62, s * 0.26, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  g.fillStyle = '#fff6dc';
  ui.roundRect(g, -s, -s * 0.65, s * 2, s * 1.3, s * 0.12); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-s, -s * 0.65); g.lineTo(0, s * 0.1); g.lineTo(s, -s * 0.65); g.stroke();
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, s * 0.1, s * 0.22, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

function tower(g, x, baseY, w, hgt, t) {
  // stone castle tower with a purple pointed roof and flag
  const ow = Math.max(3, w * 0.04);
  g.save(); g.translate(x, baseY); g.lineJoin = 'round'; g.lineWidth = ow; g.strokeStyle = NAVY;
  g.fillStyle = '#d8d0ee'; g.beginPath(); g.rect(-w / 2, -hgt, w, hgt); g.fill(); g.stroke();
  g.fillStyle = '#bfb4e0';
  for (let r = 1; r < 6; r++) for (let c = 0; c < 3; c++) { g.fillRect(-w / 2 + ((c + (r % 2) * 0.5) * w) / 3, -hgt + (r * hgt) / 6.5, w / 3.1, hgt / 24); }
  // balcony
  g.fillStyle = '#c3b7e6'; g.beginPath(); g.rect(-w * 0.62, -hgt - w * 0.05, w * 1.24, w * 0.18); g.fill(); g.stroke();
  for (let i = 0; i < 5; i++) { g.beginPath(); g.rect(-w * 0.62 + i * w * 0.25, -hgt - w * 0.2, w * 0.16, w * 0.16); g.fill(); g.stroke(); }
  // window
  g.fillStyle = '#ffd84d'; g.beginPath(); g.arc(0, -hgt * 0.55, w * 0.14, Math.PI, 0); g.rect(-w * 0.14, -hgt * 0.55, w * 0.28, w * 0.22); g.fill(); g.stroke();
  // roof
  g.fillStyle = '#8a55d8'; g.beginPath(); g.moveTo(-w * 0.55, -hgt - w * 0.2); g.lineTo(0, -hgt - w * 1.25); g.lineTo(w * 0.55, -hgt - w * 0.2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -hgt - w * 0.55, w * 0.07, 0, TAU); g.fill();
  // flag
  const fy = -hgt - w * 1.25;
  g.lineWidth = ow; g.beginPath(); g.moveTo(0, fy); g.lineTo(0, fy - w * 0.5); g.stroke();
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(0, fy - w * 0.5);
  g.quadraticCurveTo(w * 0.25, fy - w * 0.6 + Math.sin(t * 5) * 6, w * 0.5, fy - w * 0.42 + Math.sin(t * 5 + 1) * 6); g.lineTo(0, fy - w * 0.28); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

// --- the game ------------------------------------------------------------------
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    const span = LANES_BOT - LANES_TOP;
    this.laneH = Math.min(span / n, 560);
    this.top0 = LANES_TOP + (span - this.laneH * n) / 2;
    this.hx = clamp(this.laneH * 1.1, 240, 560);
    this.k = clamp(190 / this.laneH, 1, 1.45);      // object size boost for thin lanes
    this.aScale = clamp(this.laneH / 360, 0.34, 0.8);
    this.t = 0;
    this.over = false;
    this.firstFin = null;
    this.finCount = 0;
    this.buildCourse();
    this.lanes = this.players.map((p, i) => this.makeLane(p, i));
    this.rank = this.lanes.map((_, i) => i + 1);
  }

  // Course: items sorted by x, plus an "ideal line" the CPUs follow.
  buildCourse() {
    const k = this.k;
    const items = [], path = [];
    let pid = 0;
    const rr = 0.15 * k, cr = 0.15 * k, mr = 0.075 * k;
    const ring = (x, y) => { items.push({ type: 'ring', x, y, r: rr, pid }); path.push({ x, y, kind: 'ring', pid }); };
    const cloud = (x, y, r = cr) => items.push({ type: 'cloud', x, y, r, ph: rand(TAU), pid });
    const mail = (x, y, line = true) => { items.push({ type: 'mail', x, y, r: mr, ph: rand(TAU), pid }); if (line) path.push({ x, y, kind: 'mail', pid }); };
    let x = 2.5;
    const first = true;
    let n = 0, lastKind = '';
    while (x < COURSE - 2.4) {
      const prog = x / COURSE;
      pid++;
      let kind = pick(['arc', 'arc', 'arc', 'gate', 'gate', 'single', 'mail']);
      if (kind === 'mail' && lastKind === 'mail') kind = 'arc';
      if (n === 0) kind = 'arc';
      if (prog > 0.35 && chance(0.3)) kind = 'slalom';
      n++; lastKind = kind;
      const start = x;
      path.push({ x: x - 0.45, y: 0.5, kind: 'rest', pid: -1 });
      if (kind === 'arc') {
        const cnt = 3 + Math.floor(rand(3));
        let y = rand(0.3, 0.7), dy = rand(-0.1, 0.1);
        for (let i = 0; i < cnt; i++) {
          ring(x, clamp(y, 0.24, 0.76));
          y += dy; if (y < 0.28 || y > 0.72) dy = -dy;
          x += 0.62;
        }
        if (chance(0.5)) mail(x - 0.9, clamp(y + (y > 0.5 ? -0.3 : 0.3), 0.15, 0.85), false);
      } else if (kind === 'gate') {
        const g0 = rand(0.3, 0.7);
        const half = 0.17 - 0.04 * prog;
        const off = half + cr + 0.055;
        cloud(x, g0 - off); cloud(x, g0 + off);
        path.push({ x, y: g0, kind: 'gap', pid, hitY: g0 + (chance(0.5) ? -off : off) * 0.6 });
        if (chance(0.6)) items.push({ type: 'ring', x: x + 0.01, y: g0, r: rr * 0.9, pid }), path[path.length - 1].kind = 'gap';
        x += 0.5;
      } else if (kind === 'single') {
        const c = rand(0.32, 0.68);
        const up = c > 0.5;
        const wy = up ? clamp(c - cr - 0.16, 0.14, 0.9) : clamp(c + cr + 0.16, 0.1, 0.86);
        cloud(x, c);
        ring(x - 0.55, (wy + 0.5) / 2 + (wy - 0.5) * 0.3 * 0);
        path.push({ x, y: wy, kind: 'gap', pid, hitY: c });
        ring(x + 0.6, wy);
        x += 0.6;
      } else if (kind === 'mail') {
        const cy = rand(0.38, 0.62);
        for (let i = 0; i < 4; i++) { mail(x, cy + Math.sin(i * 1.3) * 0.2); x += 0.46; }
      } else { // slalom
        const sy = chance(0.5) ? 0.22 : 0.78;
        const off = cr + 0.045;
        cloud(x, sy + (sy < 0.5 ? -0.02 : 0.02));
        path.push({ x, y: sy < 0.5 ? sy + cr + 0.15 : sy - cr - 0.15, kind: 'gap', pid, hitY: sy });
        x += 0.62; ring(x, sy < 0.5 ? 0.66 : 0.34);
        x += 0.62; pid++;
        cloud(x, sy < 0.5 ? 0.78 : 0.22);
        path.push({ x, y: sy < 0.5 ? 0.78 - cr - 0.15 : 0.22 + cr + 0.15, kind: 'gap', pid, hitY: sy < 0.5 ? 0.78 : 0.22 });
        x += 0.62; ring(x, sy < 0.5 ? 0.34 : 0.66);
      }
      path.push({ x: x + 0.5, y: 0.5, kind: 'rest', pid: -1 });
      x += 0.5 + rand(0.7, 1.15) - prog * 0.25;
      void start; void first;
    }
    items.sort((a, b) => a.x - b.x);
    path.sort((a, b) => a.x - b.x);
    this.items = items; this.path = path;
  }

  makeLane(p, i) {
    const a = new Actor(p.charId, { scale: this.aScale, x: 0, y: 0 });
    // thin lanes: shrink tall characters so the whole rider fits inside the band
    a.scale = Math.min(this.aScale, (0.46 * this.laneH) / a.leader.h);
    a.snap();
    const hgt = a.height;
    return {
      p, i, a,
      yMin: Math.max(0.12, (0.56 * hgt + 3) / this.laneH), yMax: Math.min(0.88, 1 - (0.52 * hgt + 3) / this.laneH),
      top: this.top0 + i * this.laneH,
      y: 0.5, vy: 0, dist: 0, v: 0, sx: 380, ax: 380,
      boostT: 0, hurtT: 0, invT: 0, rings: 0, mails: 0, hits: 0, combo: 0, comboT: 0,
      fin: null, finRank: 0, ptr: 0, tilt: 0,
      st: new Uint8Array(this.items.length), stT: new Float32Array(this.items.length),
      zap: new Float32Array(this.items.length),
      trail: [], trailT: 0,
      ai: { ty: 0.5, blunder: {}, noise: rand(TAU), skill: [rand(0.9, 0.97), rand(0.96, 1.02), rand(1, 1.04)][clamp(p.aiLevel ?? 0, 0, 2)], lapse: 0 },
      grad: null, ribbonT: 0, camPx: 0,
    };
  }

  // --- per frame --------------------------------------------------------------
  preUpdate(dt) { for (const L of this.lanes) { this.place(L); L.a.setPose('idle'); L.a.update(dt); } this.t += 0; }

  update(dt) {
    this.t += dt;
    this.step(dt, true);
    if (this.over) return;
    const n = this.lanes.length;
    const done = this.finCount >= n;
    const late = this.firstFin !== null && this.t - this.firstFin > 7;
    if (done || late || this.t >= TIME_CAP) this.endRace();
  }
  postUpdate(dt) { this.step(dt, false); }

  step(dt, live) {
    let maxD = 0, sum = 0;
    for (const L of this.lanes) { maxD = Math.max(maxD, L.dist); sum += L.dist; }
    const mean = sum / this.lanes.length;
    for (const L of this.lanes) this.updateLane(L, dt, maxD, mean, live);
    // ranking: finishers first (by finish order), then distance
    const order = this.lanes.slice().sort((a, b) => (a.fin !== null ? 0 : 1) - (b.fin !== null ? 0 : 1) || (a.fin !== null && b.fin !== null ? a.fin - b.fin : b.dist - a.dist));
    order.forEach((L, r) => { this.rank[L.i] = r + 1; });
  }

  updateLane(L, dt, maxD, mean, live) {
    const p = L.p, a = L.a;
    const fin = L.fin !== null;
    if (live && p.isAI && !fin) this.ai(L, dt);
    let hold = live && !fin && p.ctrl.held('a');
    if (fin || !live) hold = L.y > 0.5 - L.vy * 0.3;   // drift to the middle when done
    // gentle, forgiving physics (units: lane heights / s)
    const ay = (hold ? -2.9 : 2.1) - 3.0 * L.vy;
    L.vy += ay * dt;
    L.y += L.vy * dt;
    if (L.y < L.yMin) { L.y = L.yMin; L.vy = Math.max(L.vy, 0) * 0.2; }
    if (L.y > L.yMax) { L.y = L.yMax; L.vy = Math.min(L.vy, 0) * 0.2; }

    L.boostT = Math.max(0, L.boostT - dt); L.hurtT = Math.max(0, L.hurtT - dt); L.invT = Math.max(0, L.invT - dt);
    L.comboT = Math.max(0, L.comboT - dt); if (L.comboT <= 0) L.combo = 0;
    const boost = 1 + 0.45 * Math.min(1, L.boostT / 0.6);
    const hurt = 1 - 0.5 * Math.min(1, L.hurtT / 0.5);
    const rubber = 1 + clamp((maxD - L.dist) * 0.012, 0, 0.05);
    let target = live || fin ? BASE_V * boost * hurt * rubber * (p.isAI ? L.ai.skill : 1) : 0;
    if (!live && !fin) target = BASE_V * 0.5;
    if (fin) target = Math.max(0, 0.9 * (COURSE + 0.55 - L.dist));
    L.v = damp(L.v, target, 5, dt);
    const prev = L.dist;
    L.dist += L.v * dt;
    if (fin) L.dist = Math.min(L.dist, COURSE + 0.6);
    const hx = this.hx, laneH = this.laneH;

    // camera: player drifts forward/back of the pack a little
    const wantSx = 380 + clamp((L.dist - mean) * hx * 0.35, -130, 170);
    L.sx = damp(L.sx, wantSx, 3, dt);
    L.camPx = Math.min(L.dist * hx - L.sx, COURSE * hx - 1250);
    L.ax = L.dist * hx - L.camPx;

    // items
    const items = this.items;
    while (L.ptr < items.length && items[L.ptr].x < L.dist - 1.0) L.ptr++;
    const sp = this.px(L);
    for (let i = L.ptr; i < items.length && items[i].x < L.dist + 0.9; i++) {
      const it = items[i];
      if (it.type === 'ring') {
        if (L.st[i] === 0 && it.x <= L.dist) {
          if (Math.abs(L.y - it.y) < it.r + 0.03) { L.st[i] = 1; L.stT[i] = this.t; this.gotRing(L, i, sp); }
          else { L.st[i] = 2; L.stT[i] = this.t; L.combo = 0; }
        }
      } else if (it.type === 'mail') {
        if (L.st[i] === 0) {
          const my = it.y + Math.sin(this.t * 3 + it.ph) * 0.05;
          if (Math.hypot((it.x - L.dist) * hx, (my - L.y) * laneH) < it.r * laneH + 0.06 * laneH) { L.st[i] = 1; L.stT[i] = this.t; this.gotMail(L, i, sp); }
        }
      } else if (it.type === 'cloud' && L.invT <= 0 && !fin && live) {
        const cy = it.y + Math.sin(this.t * 1.3 + it.ph) * 0.035;
        if (Math.hypot((it.x - L.dist) * hx, (cy - L.y) * laneH) < it.r * laneH * 0.82 + 0.055 * laneH) { L.zap[i] = this.t; this.gotZapped(L, sp); }
      }
    }

    // finish line
    if (!fin && live && L.dist >= COURSE) {
      L.fin = this.t; this.finCount++;
      L.finRank = this.finCount;
      if (this.firstFin === null) this.firstFin = this.t;
      this.celebrate(L, sp);
    }

    // actor pose + position
    const h = a.height;
    const center = L.top + L.y * laneH;
    a.x = L.ax; a.y = center + 0.44 * h; a.facing = 1;
    if (this.n > 0) {
      if (fin) a.setPose(POSE.win);
      else if (L.vy < -0.1) a.setPose(POSE.rise);
      else a.setPose(POSE.glide);
    }
    a.update(dt);
    L.tilt = damp(L.tilt, clamp(L.vy * 0.3, -0.3, 0.3), 8, dt);

    // scarf trail
    L.trailT -= dt;
    if (L.trailT <= 0) {
      L.trailT = 0.022;
      L.trail.unshift({ c: L.dist, y: center - 0.26 * h });
      if (L.trail.length > 16) L.trail.pop();
    }
    // sparkle tail when boosting
    if (L.boostT > 0.1 && Math.random() < dt * 40) {
      particles.burst(L.ax - 0.6 * h, center + 0.44 * h, {
        type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffd23f', L.p.color], vx: -L.v * hx * 0.9, vy: rand(-30, 30), speed: [10, 60], life: [0.3, 0.6], size: [8, 16], gravity: 0,
      });
    }
    void prev;
  }

  px(L) { return { x: L.ax, y: L.top + L.y * this.laneH }; }

  gotRing(L, i, sp) {
    L.rings++; L.combo++; L.comboT = 2.2;
    L.boostT = 1.2;
    const col = '#ffd23f';
    particles.burst(sp.x + 20, sp.y, { type: 'star', count: 6 + this.n < 6 ? 10 : 8, colors: [col, '#fff6a8', '#ffffff'], size: [10, 20], speed: [150, 400] });
    particles.burst(sp.x + 20, sp.y, { type: 'sparkle', count: 12, colors: [col, '#fff6a8', L.p.color], speed: [100, 420], size: [12, 26] });
    particles.ring(sp.x + 10, sp.y, col, 110 * this.k * (this.laneH / 430 + 0.3), 0.4);
    sfx('collect', { step: Math.min(L.combo - 1, 7) * 2 });
    sfx(hasSound('ring') ? 'ring' : 'sparkle');
    if (!L.p.isAI || true) sfx('whoosh', { vol: 0.5 });
    L.a.playOnce('cheer', 0.35); L.a.squash(0.25);
    const txt = L.combo >= 3 ? `Boost x${L.combo}!` : 'Boost!';
    particles.popText(sp.x + 60, sp.y - this.laneH * 0.22 - 10, txt, col, clamp(this.laneH * 0.14, 30, 56));
    if (!L.p.isAI) L.p.ctrl.rumble(0.35, 120);
    void i;
  }

  gotMail(L, i, sp) {
    L.mails++; L.boostT = Math.max(L.boostT, 0.6);
    particles.burst(sp.x + 24, sp.y, { type: 'heart', count: 5, colors: ['#ff6fb1', '#ffd0e8'], size: [12, 22] });
    particles.burst(sp.x + 24, sp.y, { type: 'confetti', count: 8, colors: ['#fff6dc', '#ffffff', '#ffd23f'] });
    sfx('coin'); sfx('pop', { vol: 0.5 });
    particles.popText(sp.x + 50, sp.y - this.laneH * 0.18, 'Mail!', '#ffe9f4', clamp(this.laneH * 0.12, 26, 46));
    L.a.emote('heart', 0.9);
    void i;
  }

  gotZapped(L, sp) {
    L.hits++; L.invT = 1.5; L.hurtT = 1.0; L.vy = 0.55; L.combo = 0;
    L.a.playOnce(POSE.zapped, 0.6); L.a.flash('#fff3a0', 0.25); L.a.squash(0.3);
    L.a.emote('dizzy', 1.0);
    particles.burst(sp.x, sp.y, { type: 'spark', count: 16, colors: ['#ffe64d', '#ffffff', '#9fd3ff'], speed: [200, 560] });
    particles.burst(sp.x, sp.y, { type: 'star', count: 5, colors: ['#ffe64d'], size: [14, 24] });
    particles.popText(sp.x + 40, sp.y - this.laneH * 0.2, 'Zap!', '#ffe64d', clamp(this.laneH * 0.14, 30, 56));
    sfx('hit'); sfx(hasSound('zap') ? 'zap' : 'stun');
    voice(L.p.charId, 'ouch');
    fx.shake(this.n > 4 ? 4 : 9, 0.25);
    if (!L.p.isAI) L.p.ctrl.rumble(0.8, 260);
  }

  celebrate(L, sp) {
    L.ribbonT = this.t;
    particles.burst(sp.x + 40, sp.y, { type: 'confetti', count: 40, speed: [300, 800] });
    particles.burst(sp.x + 40, sp.y, { type: 'star', count: 8, colors: ['#ffd23f', '#fff'], size: [14, 26] });
    particles.popText(sp.x + 40, sp.y - this.laneH * 0.28, ordinal(L.finRank) + '!', L.p.color, clamp(this.laneH * 0.22, 40, 90));
    sfx(L.finRank === 1 ? 'fanfare' : 'win');
    voice(L.p.charId, 'yay');
    L.a.playOnce('cheer', 0.5);
    if (L.finRank === 1) fx.flash('#fff6c8', 0.18);
  }

  // --- CPU ----------------------------------------------------------------------
  pathY(L, tx) {
    const P = this.path, lvl = clamp(L.p.aiLevel ?? 0, 0, 2);
    let i = 0;
    while (i < P.length && P[i].x < tx) i++;
    const a = i > 0 ? P[i - 1] : { x: 0, y: 0.5, kind: 'rest', pid: -1 };
    const b = i < P.length ? P[i] : { x: COURSE + 2, y: 0.5, kind: 'rest', pid: -1 };
    const adj = (w) => {
      if (w.pid < 0) return w.y;
      if (L.ai.blunder[w.pid] === undefined) {
        const pr = w.kind === 'gap' ? [0.4, 0.18, 0.05][lvl] : [0.45, 0.2, 0.06][lvl];
        L.ai.blunder[w.pid] = chance(pr) ? (w.kind === 'gap' ? 'ignore' : 'far') : 0;
      }
      const bl = L.ai.blunder[w.pid];
      if (bl === 0) return w.y;
      if (bl === 'ignore') return w.hitY ?? 0.5;
      return w.y < 0.5 ? 0.9 : 0.1;
    };
    const t = clamp((tx - a.x) / Math.max(0.01, b.x - a.x), 0, 1);
    return lerp(adj(a), adj(b), smooth(t));
  }

  ai(L, dt) {
    const prof = aiProfile(L.p);
    const lvl = clamp(L.p.aiLevel ?? 0, 0, 2);
    const look = [0.5, 0.46, 0.42][lvl];
    const ideal = this.pathY(L, L.dist + look);
    const react = (prof.reaction[0] + prof.reaction[1]) / 2;
    L.ai.lapse -= dt;
    if (L.ai.lapse <= 0 && chance(dt * [0.22, 0.1, 0.03][lvl])) L.ai.lapse = rand(0.35, 0.7);   // distracted by the scenery
    if (L.ai.lapse <= 0) L.ai.ty = damp(L.ai.ty, ideal, 1 / (react * 0.8), dt);
    const wob = Math.sin(this.t * 1.9 + L.ai.noise) * 0.06 * (prof.aimError / 0.35);
    const ty = L.ai.ty + wob;
    const predicted = L.y + L.vy * 0.3;
    L.p.ctrl.hold('a', predicted > ty);
  }

  endRace() {
    if (this.over) return;
    this.over = true;
    const order = this.lanes.slice().sort((a, b) => (a.fin !== null ? 0 : 1) - (b.fin !== null ? 0 : 1) || (a.fin !== null && b.fin !== null ? a.fin - b.fin : b.dist - a.dist));
    const placements = new Array(this.n);
    order.forEach((L, r) => { placements[L.i] = r + 1; });
    const stats = this.lanes.map((L) => (L.fin !== null ? `${L.fin.toFixed(1)} s` : `${Math.round(clamp(L.dist / COURSE, 0, 1) * 100)}%`) + (L.rings ? `, ${L.rings} rings` : ''));
    for (const L of this.lanes) { if (L.fin === null) { L.a.playOnce('pout', 1); L.a.setPose('pout'); } }
    const w = order[0];
    this.api.finish({ placements, stats, focus: { x: w.ax, y: w.top + w.y * this.laneH, zoom: this.n > 4 ? 1.25 : 1.35 } });
  }

  place(L) {
    const h = L.a.height;
    L.a.x = L.ax; L.a.y = L.top + L.y * this.laneH + 0.44 * h;
  }

  // --- drawing -----------------------------------------------------------------------
  draw(g) {
    this.drawBase(g);
    for (const L of this.lanes) this.drawLane(g, L);
    for (const L of this.lanes) this.drawActor(g, L);
    for (const L of this.lanes) this.drawLaneFront(g, L);
  }

  drawBase(g) {
    const bg = art('bg/broomstick-dash');
    if (bg) { g.drawImage(bg, 0, 0, W, H); } else {
      ui.sky(g, '#241552', '#5a3a9c');
      g.fillStyle = '#fff';
      for (let i = 0; i < 40; i++) { g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(this.t * 1.5 + i)); g.beginPath(); g.arc(hh(i) * W, hh(i + 60) * H, 2 + hh(i + 3) * 3, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
  }

  drawLane(g, L) {
    const { laneH, hx } = this;
    const top = L.top, cam = L.camPx;
    g.save();
    g.beginPath(); g.rect(0, top, W, laneH); g.clip();
    if (!L.grad) {
      L.grad = g.createLinearGradient(0, top, 0, top + laneH);
      L.grad.addColorStop(0, '#34247c'); L.grad.addColorStop(0.5, '#8a58c4'); L.grad.addColorStop(0.85, '#f08fb4'); L.grad.addColorStop(1, '#ffc9a5');
    }
    g.fillStyle = L.grad; g.fillRect(0, top, W, laneH);
    // twinkling stars
    g.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) {
      const sx = (((hh(i + L.i * 0.1) * 2400 - cam * 0.05) % 2400) + 2400) % 2400 - 200;
      const sy = top + hh(i + 77) * laneH * 0.6;
      g.globalAlpha = 0.35 + 0.55 * Math.abs(Math.sin(this.t * 1.7 + i * 2));
      const r = 1.5 + hh(i + 5) * 2.5 * (laneH / 430 + 0.4);
      g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // distant wizard castle silhouettes
    const spacing = 2300;
    const off = cam * 0.1;
    for (let r = Math.floor(off / spacing) - 1; r < (off + W) / spacing + 1; r++) {
      const cx = r * spacing + 700 - off;
      if (cx < -500 || cx > W + 500) continue;
      this.silhouette(g, cx, top + laneH, laneH, r);
    }
    // mid clouds
    g.save();
    for (let i = 0; i < 9; i++) {
      const wx = ((hh(i * 3.1 + 2) * 3600 - cam * 0.38) % 3600 + 3600) % 3600 - 400;
      const wy = top + laneH * (0.1 + hh(i * 1.7) * 0.6);
      ui.cloud(g, wx, wy, (laneH / 520) * (0.6 + hh(i) * 0.6), '#ffd9ec', 0.38);
    }
    g.restore();
    // cloud bank at the bottom (parallax 1.0 - gives the speed)
    g.fillStyle = 'rgba(255,236,246,0.92)';
    const pr = laneH * 0.085;
    const bankOff = cam % (pr * 2.6);
    for (let x = -bankOff - pr; x < W + pr * 2; x += pr * 1.3) {
      const idx = Math.floor((x + cam) / (pr * 1.3));
      g.beginPath(); g.arc(x, top + laneH + pr * 0.1 - hh(idx) * pr * 0.9, pr * (0.9 + hh(idx + 3) * 0.7), 0, TAU); g.fill();
    }
    // start tower + finish tower
    const sxStart = 0 * hx - cam - 0.45 * hx;
    if (sxStart > -400) tower(g, sxStart, top + laneH + laneH * 0.08, laneH * 0.34, laneH * 0.62, this.t);
    const fxp = COURSE * hx - cam;
    if (fxp > -300 && fxp < W + 500) {
      tower(g, fxp + hx * 0.38, top + laneH + laneH * 0.08, laneH * 0.4, laneH * 0.78, this.t);
      this.drawRibbon(g, L, fxp);
    }
    // speed lines
    if (L.boostT > 0.1) {
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(2, laneH * 0.008);
      for (let i = 0; i < 9; i++) {
        const lx = (((hh(i + 4) * 2400 - this.t * 2600 * (0.7 + hh(i))) % 2400) + 2400) % 2400 - 300;
        const ly = top + hh(i * 2.3 + L.i) * laneH;
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 120 + hh(i) * 160, ly); g.stroke();
      }
    }
    // items (back layer)
    const items = this.items;
    for (let i = L.ptr; i < items.length; i++) {
      const it = items[i];
      const sx = it.x * hx - cam;
      if (sx > W + 220) break;
      if (sx < -260) continue;
      if (it.type === 'ring') this.drawRing(g, L, it, i, sx, false);
      else if (it.type === 'cloud') {
        const cy = top + (it.y + Math.sin(this.t * 1.3 + it.ph) * 0.035) * laneH;
        const rp = it.r * laneH;
        const flash = this.t - L.zap[i] < 0.3 && L.zap[i] > 0;
        const sprite = drawNpcSprite(g, 'storm-cloud', sx, cy + rp * 0.8, rp * 1.9, this.t + it.ph, { pose: flash ? 'flash' : 'idle' });
        // Zapped: the startled storm-cloud-zap face (held a beat longer than the bolt flash so it reads).
        const zapped = L.zap[i] > 0 && this.t - L.zap[i] < 0.6;
        if (sprite || (zapped && drawArt(g, 'prop/storm-cloud-zap', sx, cy, rp * 2.6, rp * 2.2)) || drawArt(g, 'prop/storm-cloud', sx, cy, rp * 2.6, rp * 2.2)) stormLightning(g, sx, cy, rp, this.t, it.ph, flash);
        else stormCloud(g, sx, cy, rp, this.t, it.ph, flash);
      } else if (it.type === 'mail' && L.st[i] === 0) {
        const my = top + (it.y + Math.sin(this.t * 3 + it.ph) * 0.05) * laneH;
        if (!drawArt(g, 'prop/owl-mail', sx, my, it.r * laneH * 2.4, it.r * laneH * 2)) mailItem(g, sx, my, it.r * laneH, this.t, it.ph);
      }
    }
    g.restore();
    // lane divider + colored stripe
    g.save();
    g.fillStyle = L.p.color; g.fillRect(0, top, 12, laneH);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, top + laneH - 2, W, 4);
    if (this.n > 1 || true) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(0, top - 2, W, 4); }
    g.restore();
  }

  silhouette(g, x, baseY, laneH, r) {
    const s = laneH / 430;
    const flip = r % 2 ? -1 : 1;
    g.save(); g.translate(x, baseY); g.scale(flip * s, s);
    g.fillStyle = 'rgba(52,34,110,0.78)';
    const rect = (a, b, w, h) => g.fillRect(a, -h, w, h);
    rect(-120, 0, 240, 150); rect(-190, 0, 80, 210); rect(110, 0, 90, 260); rect(-40, 0, 70, 280);
    const roof = (cx, w, y, hh2) => { g.beginPath(); g.moveTo(cx - w / 2 - 8, -y); g.lineTo(cx, -y - hh2); g.lineTo(cx + w / 2 + 8, -y); g.closePath(); g.fill(); };
    roof(-150, 80, 210, 90); roof(155, 90, 260, 110); roof(-5, 70, 280, 100);
    for (let i = 0; i < 6; i++) { g.fillRect(-110 + i * 38, -158, 18, 10); }
    g.fillStyle = 'rgba(255,214,102,0.85)';
    for (const [wx, wy] of [[-155, -150], [150, -200], [-12, -215], [-70, -80], [60, -90], [150, -120]]) { g.beginPath(); g.arc(wx, wy, 6, 0, TAU); g.fill(); }
    g.restore();
  }

  drawRibbon(g, L, fx0) {
    const { laneH } = this;
    const top = L.top;
    const w = Math.max(10, laneH * 0.04);
    const broke = L.fin !== null;
    g.save();
    // posts of checkered banner
    for (let y = 0; y < laneH; y += w) {
      const odd = Math.floor(y / w) % 2;
      g.fillStyle = odd ? '#ffffff' : NAVY;
      if (!broke || true) g.globalAlpha = broke ? 0.35 : 1;
      g.fillRect(fx0 - w, top + y, w, w); g.fillStyle = odd ? NAVY : '#ffffff'; g.fillRect(fx0, top + y, w, w);
    }
    g.globalAlpha = 1;
    // glowing finish pennants
    g.fillStyle = 'rgba(255,230,120,0.18)'; g.fillRect(fx0 - w * 2.5, top, w * 5, laneH);
    ui.text(g, 'FINISH', fx0 - w * 2, top + laneH * 0.14, { size: clamp(laneH * 0.14, 20, 54), color: '#ffe46b', align: 'right' });
    g.restore();
  }

  drawRing(g, L, it, i, sx, front) {
    const { laneH, hx } = this;
    const cy = L.top + it.y * laneH;
    const R = it.r * laneH;
    const st = L.st[i];
    let alpha = 1, sc = 1;
    if (st === 1) { const a = (this.t - L.stT[i]) / 0.45; if (a >= 1) return; alpha = 1 - a; sc = 1 + a * 0.7; }
    else if (st === 2) alpha = 0.35;
    if (!front && drawArt(g, 'prop/star-ring', sx, cy, R * 0.9, R * 2.2)) return;
    const rx = Math.max(8, R * 0.3) * sc, ry = R * sc;
    const lw = Math.max(5, R * 0.16);
    g.save(); g.globalAlpha = alpha;
    const pulse = 0.7 + 0.3 * Math.sin(this.t * 6 + it.x * 3);
    if (!front) {
      // soft glow + back half
      if (st === 0) { g.fillStyle = `rgba(255,236,150,${0.14 * pulse})`; g.beginPath(); g.ellipse(sx, cy, rx * 1.1, ry, 0, 0, TAU); g.fill(); }
      g.lineWidth = lw + 4; g.strokeStyle = NAVY; g.beginPath(); g.ellipse(sx, cy, rx, ry, 0, Math.PI / 2, Math.PI * 1.5); g.stroke();
      g.lineWidth = lw; g.strokeStyle = st === 2 ? '#c9b98a' : '#d9a21b'; g.beginPath(); g.ellipse(sx, cy, rx, ry, 0, Math.PI / 2, Math.PI * 1.5); g.stroke();
    } else {
      g.lineWidth = lw + 4; g.strokeStyle = NAVY; g.beginPath(); g.ellipse(sx, cy, rx, ry, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
      g.lineWidth = lw; g.strokeStyle = st === 2 ? '#e6d9ad' : '#ffd23f'; g.beginPath(); g.ellipse(sx, cy, rx, ry, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
      g.lineWidth = lw * 0.28; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(sx, cy, rx - lw * 0.15, ry - lw * 0.15, 0, -Math.PI * 0.4, Math.PI * 0.1); g.stroke();
      if (st !== 2) {
        // little stars on the ring
        g.save(); g.translate(sx, cy - ry); g.rotate(this.t * 2); g.fillStyle = '#fff6a8'; g.strokeStyle = NAVY; g.lineWidth = 3;
        const sr = Math.max(7, R * 0.2);
        g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? sr * 0.45 : sr; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
    }
    g.restore();
    void hx;
  }

  drawActor(g, L) {
    const a = L.a, { hx } = this;
    const h = a.height;
    const cx = L.ax, feet = a.y;
    // scarf (behind actor)
    if (L.trail.length > 2) {
      const pts = L.trail.map((t, k) => ({ x: cx + (t.c - L.dist) * hx - 0.1 * h, y: t.y + Math.sin(this.t * 10 + k * 0.7) * h * 0.045 * (k / 16) * 2 }));
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        for (let k = 1; k < pts.length; k++) {
          const w = h * 0.14 * (1 - k / pts.length) + 2;
          g.strokeStyle = pass === 0 ? NAVY : (k % 4 < 2 ? L.p.color : '#ffffff');
          g.lineWidth = pass === 0 ? w + 4 : w;
          g.beginPath(); g.moveTo(pts[k - 1].x, pts[k - 1].y); g.lineTo(pts[k].x, pts[k].y); g.stroke();
        }
      }
      g.restore();
    }
    const blink = L.invT > 0 && Math.floor(this.t * 14) % 2 === 0;
    g.save();
    g.beginPath(); g.rect(0, L.top, W, this.laneH); g.clip();
    if (blink) g.globalAlpha = 0.55;
    g.translate(cx, feet); g.rotate(L.tilt); g.translate(-cx, -feet);
    // broom under the character's feet
    g.save(); g.translate(cx, feet + 0.03 * h);
    if (!drawArt(g, 'prop/broom', 0, 0, h * 1.6, h * 0.4)) drawBroomShape(g, h * 1.15, this.t, L.boostT > 0 ? 1 : 0);
    g.restore();
    a.draw(g, { shadow: false });
    g.restore();
    // player tag: above the head for the first seconds, then a pointer at the lane's left edge
    const tagS = clamp(this.laneH / 300, 0.55, 1);
    if (this.t < 4.5) {
      g.save(); g.translate(cx, feet - h - 28 * tagS); g.scale(tagS, tagS);
      ui.playerTag(g, L.p, 0, 0); g.restore();
    }
    // lane-edge pointer (always)
    const py = L.top + L.y * this.laneH;
    g.save(); g.translate(16, py); g.fillStyle = L.p.color; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -12 * tagS); g.lineTo(26 * tagS, 0); g.lineTo(0, 12 * tagS); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  drawLaneFront(g, L) {
    const { laneH, hx } = this;
    g.save();
    g.beginPath(); g.rect(0, L.top, W, laneH); g.clip();
    const items = this.items;
    for (let i = L.ptr; i < items.length; i++) {
      const it = items[i];
      const sx = it.x * hx - L.camPx;
      if (sx > W + 220) break;
      if (sx < -260) continue;
      if (it.type === 'ring') this.drawRing(g, L, it, i, sx, true);
    }
    // rank badge on the right edge of the lane
    const rk = this.rank[L.i];
    const sz = clamp(laneH * 0.34, 26, 70);
    const col = ['#ffd23f', '#e6e9f5', '#f0a15e'][rk - 1] || '#ffffff';
    ui.text(g, ordinal(rk), W - 26, L.top + sz * 0.62, { size: sz, color: col, align: 'right', alpha: 0.95 });
    g.restore();
  }

  drawHUD(g) {
    // progress bar along the top
    const bx = 330, bw = W - 330 - 190, by = 62;
    ui.panel(g, bx - 54, by - 32, bw + 108 + 36, 64, { r: 32, fill: 'rgba(255,255,255,0.92)' });
    // track
    g.save();
    ui.roundRect(g, bx, by - 8, bw, 16, 8); g.fillStyle = '#cdbff0'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    // start flag + finish tower
    g.fillStyle = '#36d17a'; g.fillRect(bx - 4, by - 26, 5, 34); g.beginPath(); g.moveTo(bx + 1, by - 26); g.lineTo(bx + 22, by - 18); g.lineTo(bx + 1, by - 10); g.fill();
    const tx = bx + bw + 22;
    g.fillStyle = '#d8d0ee'; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.rect(tx - 14, by - 14, 28, 34); g.fill(); g.stroke();
    g.fillStyle = '#8a55d8'; g.beginPath(); g.moveTo(tx - 19, by - 14); g.lineTo(tx, by - 36); g.lineTo(tx + 19, by - 14); g.closePath(); g.fill(); g.stroke();
    g.restore();
    const order = this.lanes.slice().sort((a, b) => a.dist - b.dist);
    for (const L of order) {
      const f = clamp(L.dist / COURSE, 0, 1);
      const x = bx + bw * f, bob = Math.sin(this.t * 6 + L.i) * 2;
      ui.drawPortrait(g, L.p.charId, x, by + bob, 22, { expr: L.fin !== null ? 'happy' : L.hurtT > 0 ? 'surprised' : 'neutral', ring: L.p.color, ringWidth: 5 });
    }
    // timer on the left
    ui.timer(g, TIME_CAP - this.t, 170, 62);
    if (this.firstFin !== null && !this.over) {
      const left = Math.max(0, 7 - (this.t - this.firstFin));
      ui.text(g, `Finish in ${Math.ceil(left)}!`, W / 2, LANES_TOP + 6 + 24, { size: 40, color: '#ffe46b' });
    }
    if (this.t < 4) {
      const a = this.t < 3.4 ? 1 : 1 - (this.t - 3.4) / 0.6;
      g.save(); g.globalAlpha = a;
      ui.panel(g, W / 2 - 330, LANES_TOP + 6, 660, 70, { r: 35 });
      ui.glyph(g, 'a', W / 2 - 280, LANES_TOP + 41, 52, { pulse: true });
      ui.text(g, 'Hold to rise, let go to glide!', W / 2 + 40, LANES_TOP + 41, { size: 36, color: NAVY, stroke: false, maxWidth: 520 });
      g.restore();
    }
    const rankFirst = this.rank.map((r) => r === 1);
    ui.scoreboard(g, this.players, this.lanes.map((L) => L.rings), { y: 1000, format: (v) => `${v}★`, highlight: rankFirst });
  }
}
