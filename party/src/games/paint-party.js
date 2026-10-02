// Paint Party: top-down plaza grid. Everything you walk over turns your color,
// even other people's paint. A = splat bomb (refills in 4 s). Grab the rainbow
// roller for a huge brush, and the last 10 seconds are DOUBLE BRUSH time.
// The painter with the most painted cells when the timer ends wins.
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { placementsFromScores, rand, randInt, pick, chance, clamp, lerp, damp, ease, TAU } from '../engine/util.js';

const CS = 40;                       // cell size
const COLS = 48, ROWS = 22;
const X0 = 0, Y0 = 96;               // plaza top-left
const PW = COLS * CS, PH = ROWS * CS;
const TIME = 45;
const NAVY = '#24163f';
const SPEED = 310;
const BRUSH = 33;                    // brush radius (px)
const BOMB_R = 138, BOMB_CD = 4, BOMB_RANGE = 215;
const ROLLER_T = 5;
const DOUBLE_AT = TIME - 10;
const CHAR_SCALE = 0.72;
const PR = 34;

const pickPose = (...names) => names.find((n) => POSE_NAMES.includes(n)) || 'idle';
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export const meta = {
  id: 'paint-party',
  title: 'Paint Party',
  category: 'party',
  type: 'Territory',
  goal: 'Paint the plaza your color! Most painted ground wins.',
  controls: [['stick', 'Run and paint'], ['a', 'Throw a splat bomb']],
  tips: [
    'You can paint right over your friends’ colors!',
    'Splat bombs paint a big circle. They refill in a few seconds.',
    'Grab the rainbow roller for a giant brush. The last 10 seconds are double brush!',
  ],
  music: 'party',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#f3ece0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e7dfd1';
    const s = h / 8;
    for (let r = 0; r < 8; r++) for (let c = 0; c < Math.ceil(w / s); c++) if ((r + c) % 2) g.fillRect(c * s, r * s, s, s);
    const blob = (cx, cy, r, col) => {
      g.fillStyle = col;
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
      for (let k = 0; k < 9; k++) { const a = k * 0.7 + cx * 0.01; g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82, r * (0.22 + (k % 3) * 0.05), 0, TAU); g.fill(); }
    };
    const cols = ['#ff4d6d', '#3fa7ff', '#ffd23f', '#36d17a'];
    blob(w * 0.22, h * 0.32, h * 0.26, cols[0]);
    blob(w * 0.52, h * 0.7, h * 0.3, cols[1]);
    blob(w * 0.8, h * 0.28, h * 0.24, cols[2]);
    blob(w * 0.12, h * 0.8, h * 0.16, cols[3]);
    blob(w * 0.5, h * 0.25, h * 0.14, cols[3]);
    // splat bomb in the air
    const bx = w * 0.64, by = h * 0.5 - Math.abs(Math.sin(t * 3)) * h * 0.12;
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(bx, h * 0.68, h * 0.07, h * 0.03, 0, 0, TAU); g.fill();
    g.fillStyle = '#ff4d6d'; g.strokeStyle = NAVY; g.lineWidth = h * 0.02; g.beginPath(); g.arc(bx, by, h * 0.08, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(bx - h * 0.03, by - h * 0.03, h * 0.02, h * 0.012, -0.6, 0, TAU); g.fill();
    // brush
    g.save(); g.translate(w * 0.34, h * 0.56); g.rotate(-0.7);
    g.fillStyle = '#c28a4d'; g.strokeStyle = NAVY; g.lineWidth = h * 0.02; ui.roundRect(g, -h * 0.03, -h * 0.34, h * 0.06, h * 0.3, h * 0.02); g.fill(); g.stroke();
    g.fillStyle = '#9aa7b8'; g.fillRect(-h * 0.035, -h * 0.06, h * 0.07, h * 0.06); g.strokeRect(-h * 0.035, -h * 0.06, h * 0.07, h * 0.06);
    g.fillStyle = '#ff4d6d'; ui.roundRect(g, -h * 0.05, 0, h * 0.1, h * 0.12, h * 0.04); g.fill(); g.stroke();
    g.restore();
    g.restore();
  },
};

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (h, t, amt) => { const a = hex2rgb(h), b = t === 'w' ? [255, 255, 255] : [0, 0, 0]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * amt)).join(',')})`; };

// ---------------------------------------------------------------------------

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0; this.clock = 0;
    this.ended = false; this.endT = 0;
    this.owner = new Int16Array(COLS * ROWS).fill(-1);
    this.counts = this.players.map(() => 0);
    this.dirty = new Set();
    this.shades = this.players.map((p) => [p.color, mix(p.color, 'w', 0.14), mix(p.color, 'b', 0.07)]);
    this.paintCv = cv(PW, PH);
    this.pg = this.paintCv.getContext('2d');
    this.base = this.makeBase();
    this.bombs = []; this.splats = []; this.pickups = [];
    this.nextRoller = 5.5;
    this.msg = null; this.doubleShown = false;
    this.sound = { brush: 0, bump: 0 };
    this.timeRounded = TIME;

    // start spots around the plaza
    const n = this.n;
    this.ps = this.players.map((p, i) => {
      let sx, sy;
      if (n === 1) { sx = W / 2; sy = Y0 + PH / 2; } else {
        const a = (i / n) * TAU - Math.PI / 2 + 0.35;
        sx = W / 2 + Math.cos(a) * 640; sy = Y0 + PH / 2 + Math.sin(a) * 300;
      }
      const a = new Actor(p.charId, { scale: CHAR_SCALE, x: sx, y: sy, facing: sx < W / 2 ? 1 : -1 });
      a.snap(); a.setPose('idle');
      const s = { a, x: sx, y: sy, vx: 0, vy: 0, kx: 0, ky: 0, dir: { x: sx < W / 2 ? 1 : -1, y: 0 }, cool: 0, roller: 0, drip: 0, bumpT: 0,
        ai: { t: rand(0.1, 0.5), tx: sx, ty: sy, pause: 0, bombT: 0 } };
      a.attach((g, info) => this.drawTool(g, info, i));
      return s;
    });
    // each player starts with a little patch
    this.ps.forEach((s, i) => this.paintCircle(s.x, s.y, 85, i));
    this.flushDirty();
  }

  // ----- paint layer ----------------------------------------------------

  paintCircle(x, y, r, pi) {
    const c0 = Math.max(0, Math.floor((x - r) / CS)), c1 = Math.min(COLS - 1, Math.floor((x + r) / CS));
    const r0 = Math.max(0, Math.floor((y - Y0 - r) / CS)), r1 = Math.min(ROWS - 1, Math.floor((y - Y0 + r) / CS));
    let changed = 0;
    const r2 = r * r;
    for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
      const dx = (c + 0.5) * CS - x, dy = Y0 + (rr + 0.5) * CS - y;
      if (dx * dx + dy * dy > r2) continue;
      const idx = rr * COLS + c, old = this.owner[idx];
      if (old === pi) continue;
      if (old >= 0) this.counts[old]--;
      this.owner[idx] = pi; this.counts[pi]++;
      this.dirty.add(idx); changed++;
    }
    return changed;
  }

  /** Redraw the paint canvas for changed cells (each redraw rect re-composites its 3x3 neighbourhood). */
  flushDirty() {
    if (!this.dirty.size) return;
    const rects = new Set();
    for (const idx of this.dirty) {
      const c = idx % COLS, r = (idx / COLS) | 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const cc = c + dc, rr = r + dr;
        if (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS) rects.add(rr * COLS + cc);
      }
    }
    this.dirty.clear();
    const g = this.pg;
    for (const idx of rects) {
      const c = idx % COLS, r = (idx / COLS) | 0;
      g.save();
      g.beginPath(); g.rect(c * CS, r * CS, CS, CS); g.clip();
      g.clearRect(c * CS, r * CS, CS, CS);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) continue;
        const o = this.owner[rr * COLS + cc];
        if (o < 0) continue;
        const sh = this.shades[o], h = (cc * 7 + rr * 13) % 5;
        const px = cc * CS + CS / 2 + ((h % 3) - 1) * 0.8, py = rr * CS + CS / 2;
        g.fillStyle = sh[h === 0 ? 1 : h === 3 ? 2 : 0];
        g.beginPath(); g.arc(px, py, CS * 0.74, 0, TAU); g.fill();
      }
      g.restore();
    }
  }

  makeBase() {
    const c = cv(W, H), g = c.getContext('2d');
    // top band: shop-front awnings and bunting
    const sky = g.createLinearGradient(0, 0, 0, Y0); sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#fff0d8');
    g.fillStyle = sky; g.fillRect(0, 0, W, Y0);
    const bcols = ['#ff6fb1', '#ffd23f', '#7fd3ff', '#8be08b', '#c49bff'];
    for (let i = 0; i < 24; i++) {
      const x = i * 82, h = 40 + (i * 37) % 28;
      g.fillStyle = ['#ffcfe3', '#d8ecff', '#fff2c4', '#d9f6d0'][i % 4]; g.fillRect(x, 8 + (i % 3) * 6, 82, Y0);
      g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 3; g.strokeRect(x, 8 + (i % 3) * 6, 82, Y0);
    }
    // bunting
    g.strokeStyle = '#6b4a9a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 30); for (let x = 0; x <= W; x += 20) g.lineTo(x, 30 + Math.sin(x / W * Math.PI * 8) * 12 + 12); g.stroke();
    for (let i = 0; i < 48; i++) {
      const x = i * 40 + 20, y = 30 + Math.sin(x / W * Math.PI * 8) * 12 + 12;
      g.fillStyle = bcols[i % 5]; g.strokeStyle = NAVY; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x - 13, y); g.lineTo(x + 13, y); g.lineTo(x, y + 28); g.closePath(); g.fill(); g.stroke();
    }
    // plaza floor
    for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
      g.fillStyle = ((cc >> 1) + (r >> 1)) % 2 ? '#e8dfcf' : '#f6efe2';
      g.fillRect(X0 + cc * CS, Y0 + r * CS, CS, CS);
    }
    g.strokeStyle = 'rgba(120,95,60,0.12)'; g.lineWidth = 2;
    for (let cc = 0; cc <= COLS; cc++) { g.beginPath(); g.moveTo(cc * CS, Y0); g.lineTo(cc * CS, Y0 + PH); g.stroke(); }
    for (let r = 0; r <= ROWS; r++) { g.beginPath(); g.moveTo(0, Y0 + r * CS); g.lineTo(W, Y0 + r * CS); g.stroke(); }
    // bottom curb
    const cg = g.createLinearGradient(0, Y0 + PH, 0, H); cg.addColorStop(0, '#6b4a9a'); cg.addColorStop(1, '#3b2766');
    g.fillStyle = cg; g.fillRect(0, Y0 + PH, W, H - (Y0 + PH));
    g.fillStyle = '#fff'; for (let x = 0; x < W; x += 80) g.fillRect(x, Y0 + PH + 4, 40, 8);
    g.fillStyle = 'rgba(36,22,63,0.35)'; g.fillRect(0, Y0 - 6, W, 6);
    return c;
  }

  // ----- helpers ---------------------------------------------------------

  doubleOn() { return this.t >= DOUBLE_AT; }
  brushR(s) { return BRUSH * (s.roller > 0 ? 1.85 : 1) * (this.doubleOn() ? 1.5 : 1); }

  // ----- update ----------------------------------------------------------

  preUpdate(dt) { this.ambient(dt); }
  postUpdate(dt) { this.ambient(dt); this.flushDirty(); }

  update(dt) {
    this.ambient(dt);
    if (this.ended) { this.endT += dt; this.flushDirty(); return; }
    this.t += dt;
    for (const k in this.sound) this.sound[k] -= dt;

    if (!this.doubleShown && this.t >= DOUBLE_AT) {
      this.doubleShown = true; this.msg = { text: 'Double brush!', t: 0 };
      sfx('grow'); sfx('star'); fx.shake(10, 0.35); fx.flash('#ffffff', 0.12);
      particles.confettiRain(W, 60);
    }
    if (this.msg) { this.msg.t += dt; if (this.msg.t > 2.4) this.msg = null; }

    // roller spawns
    if (this.t >= this.nextRoller && this.pickups.length < 2) {
      this.nextRoller = this.t + rand(8, 11);
      const x = rand(160, W - 160), y = rand(Y0 + 130, Y0 + PH - 130);
      this.pickups.push({ x, y, t: 0 });
      particles.ring(x, y, '#ffffff', 160, 0.6);
      particles.burst(x, y, { type: 'sparkle', count: 14, speed: [60, 260], colors: RAINBOW });
      sfx('sparkle');
    }

    this.players.forEach((p, i) => this.updatePlayer(p, this.ps[i], i, dt));
    this.collide();

    // bombs
    for (const b of this.bombs) {
      b.t += dt;
      if (b.t >= b.dur) { b.dead = true; this.landBomb(b); }
    }
    this.bombs = this.bombs.filter((b) => !b.dead);
    for (const pk of this.pickups) pk.t += dt;
    this.flushDirty();

    if (this.t >= TIME) this.endGame();
  }

  updatePlayer(p, s, i, dt) {
    if (p.isAI) this.thinkAI(p, s, i, dt);
    const c = p.ctrl;
    let ix = c.x, iy = c.y;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    const dead = m < 0.12;
    const sp = SPEED * (s.roller > 0 ? 1.06 : 1);
    s.vx += ((dead ? 0 : ix * sp) - s.vx) * Math.min(1, (dead ? 12 : 10) * dt);
    s.vy += ((dead ? 0 : iy * sp) - s.vy) * Math.min(1, (dead ? 12 : 10) * dt);
    if (!dead) { const mm = Math.hypot(ix, iy) || 1; s.dir.x = ix / mm; s.dir.y = iy / mm; }
    s.x += (s.vx + s.kx) * dt; s.y += (s.vy + s.ky) * dt;
    const kd = Math.exp(-6 * dt); s.kx *= kd; s.ky *= kd;
    s.x = clamp(s.x, 36, W - 36); s.y = clamp(s.y, Y0 + 30, Y0 + PH - 6);
    // paint
    const changed = this.paintCircle(s.x, s.y, this.brushR(s), i);
    if (changed > 0 && !p.isAI && this.sound.brush <= 0 && Math.hypot(s.vx, s.vy) > 60) { sfx('brush'); this.sound.brush = 0.22; }
    if (changed > 0) {
      s.drip -= dt;
      if (s.drip <= 0) {
        s.drip = s.roller > 0 ? 0.04 : 0.11;
        particles.burst(s.x - s.dir.x * 14, s.y - 10, { type: 'drop', count: 1, colors: s.roller > 0 ? RAINBOW : [p.color, this.shades[i][1]], speed: [40, 160], angle: -Math.PI / 2, spread: 1.3, gravity: 900, life: [0.25, 0.45], size: [5, 9] });
      }
    }
    // cooldown + bomb
    s.cool = Math.max(0, s.cool - dt);
    if (c.pressed('a') && s.cool <= 0) this.throwBomb(p, s, i);
    // roller
    if (s.roller > 0) { s.roller -= dt; if (s.roller <= 0) { s.a.emote('sweat', 0.6); sfx('shrink'); } }
    for (const pk of this.pickups) {
      if (!pk.taken && Math.hypot(pk.x - s.x, pk.y - s.y) < 58) {
        pk.taken = true; s.roller = ROLLER_T;
        sfx('grow'); sfx('star'); voice(p.charId, 'woo');
        particles.burst(pk.x, pk.y, { type: 'star', count: 14, colors: RAINBOW, speed: [120, 420] });
        particles.ring(pk.x, pk.y, '#ffffff', 220, 0.5);
        particles.popText(s.x, s.y - s.a.height - 70, 'Rainbow roller!', '#ffffff', 48);
        s.a.squash(0.4);
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken);
    // animation
    const a = s.a;
    a.x = s.x; a.y = s.y;
    const spd = Math.hypot(s.vx, s.vy);
    a.moveAnim(s.vx, s.vy, SPEED, { run: spd > SPEED * 0.7 });
    if (s.roller > 0 && spd > 40) a.setPose(pickPose('paint', 'run'));
  }

  throwBomb(p, s, i) {
    s.cool = BOMB_CD;
    const d = s.dir;
    const tx = clamp(s.x + d.x * BOMB_RANGE, 50, W - 50), ty = clamp(s.y + d.y * BOMB_RANGE, Y0 + 30, Y0 + PH - 20);
    this.bombs.push({ i, sx: s.x, sy: s.y - s.a.height * 0.5, gy: s.y, tx, ty, t: 0, dur: 0.5, color: p.color });
    s.a.playOnce('splat-throw', 0.4, 'idle'); s.a.squash(0.3);
    if (Math.abs(d.x) > 0.2) s.a.facing = d.x > 0 ? 1 : -1;
    sfx('whoosh'); p.ctrl.rumble && p.ctrl.rumble(0.3, 100);
  }

  landBomb(b) {
    const r = BOMB_R * (this.doubleOn() ? 1.2 : 1);
    const changed = this.paintCircle(b.tx, b.ty, r, b.i);
    this.flushDirty();
    const lobes = Array.from({ length: 11 }, (_, k) => ({ a: (k / 11) * TAU + rand(-0.15, 0.15), d: rand(0.72, 0.98), r: rand(0.17, 0.3) }));
    const drops = Array.from({ length: 9 }, () => ({ a: rand(TAU), d: rand(1.05, 1.35), r: rand(0.05, 0.11) }));
    this.splats.push({ x: b.tx, y: b.ty, r, color: b.color, t: 0, lobes, drops });
    particles.burst(b.tx, b.ty, { type: 'drop', count: 26, colors: [b.color, this.shades[b.i][1], '#ffffff'], speed: [200, 620], angle: -Math.PI / 2, spread: 1.5, gravity: 1100, life: [0.4, 0.8], size: [6, 12] });
    particles.ring(b.tx, b.ty, b.color, 260, 0.45);
    sfx('splat'); sfx('pop');
    fx.shake(changed > 25 ? 9 : 5, 0.18);
    if (this.api.camera && changed > 20) this.api.camera.punch(b.tx, b.ty, 1.05, 0.05);
    if (changed > 12) particles.popText(b.tx, b.ty - 40, `+${changed}`, '#ffffff', 46);
  }

  collide() {
    for (let i = 0; i < this.n; i++) for (let j = i + 1; j < this.n; j++) {
      const a = this.ps[i], b = this.ps[j];
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= PR * 2) continue;
      if (d < 0.01) { dx = rand(-1, 1); dy = rand(-1, 1); d = Math.hypot(dx, dy); }
      const nx = dx / d, ny = dy / d, ov = (PR * 2 - d) / 2;
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      const imp = 170 + Math.max(0, rel) * 0.6;
      a.kx -= nx * imp; a.ky -= ny * imp; b.kx += nx * imp; b.ky += ny * imp;
      if (this.clock - a.bumpT > 0.35 && this.sound.bump <= 0) {
        a.bumpT = b.bumpT = this.clock; this.sound.bump = 0.1;
        sfx('bonk'); a.a.squash(0.3); b.a.squash(0.3);
        particles.burst((a.x + b.x) / 2, (a.y + b.y) / 2 - 40, { type: 'spark', count: 7, colors: ['#fff6a8', '#ffffff'], speed: [80, 240] });
      }
    }
  }

  endGame() {
    this.ended = true; this.endT = 0;
    this.flushDirty();
    const placements = placementsFromScores(this.counts);
    this.final = placements;
    sfx('whistle');
    this.ps.forEach((s, i) => {
      s.a.clearEmotes();
      if (placements[i] === 1) { s.a.setPose('celebrate'); s.a.squash(0.4); }
      else if (this.n > 1 && placements[i] >= Math.max(3, this.n - 0)) s.a.setPose('pout');
      else s.a.setPose('cheer');
    });
    particles.confettiRain(W, 80);
    const total = COLS * ROWS;
    const wi = this.counts.indexOf(Math.max(...this.counts)), ws = this.ps[wi];
    this.api.finish({
      focus: { x: ws.x, y: ws.y - 70, zoom: 1.3 },
      placements,
      stats: this.counts.map((c) => `${Math.round((c / total) * 100)}% painted`),
    });
  }

  // ----- CPU -------------------------------------------------------------

  nonMineCount(cx, cy, r, pi) {
    const c0 = Math.max(0, Math.floor((cx - r) / CS)), c1 = Math.min(COLS - 1, Math.floor((cx + r) / CS));
    const r0 = Math.max(0, Math.floor((cy - Y0 - r) / CS)), r1 = Math.min(ROWS - 1, Math.floor((cy - Y0 + r) / CS));
    let n = 0; const r2 = r * r;
    for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
      const dx = (c + 0.5) * CS - cx, dy = Y0 + (rr + 0.5) * CS - cy;
      if (dx * dx + dy * dy <= r2 && this.owner[rr * COLS + c] !== pi) n++;
    }
    return n;
  }

  thinkAI(p, s, i, dt) {
    const ai = s.ai, lvl = clamp(p.aiLevel ?? 0, 0, 2), prof = aiProfile(p);
    ai.t -= dt; ai.pause -= dt; ai.bombT -= dt;
    const dToTarget = Math.hypot(ai.tx - s.x, ai.ty - s.y);
    if (ai.t <= 0 || dToTarget < 26) {
      ai.t = [rand(0.5, 0.95), rand(0.3, 0.6), rand(0.2, 0.4)][lvl];
      // easy CPUs stop to look around now and then
      if (lvl === 0 && chance(0.1)) ai.pause = rand(0.3, 0.7);
      this.pickTarget(p, s, i, ai, lvl);
    }
    if (ai.pause > 0) { p.ctrl.move(0, 0); }
    else {
      const k = steer(p, s.x, s.y, ai.tx, ai.ty, { arrive: 40 });
    }
    // splat bomb when standing in a juicy spot
    if (s.cool <= 0 && ai.bombT <= 0) {
      ai.bombT = [rand(0.5, 1.1), rand(0.3, 0.7), rand(0.15, 0.4)][lvl];
      const lx = clamp(s.x + s.dir.x * BOMB_RANGE, 50, W - 50), ly = clamp(s.y + s.dir.y * BOMB_RANGE, Y0 + 30, Y0 + PH - 20);
      const cnt = this.nonMineCount(lx, ly, BOMB_R * (this.doubleOn() ? 1.2 : 1), i);
      const thr = [27, 22, 17][lvl];
      if (cnt >= thr && (lvl > 0 || chance(0.55))) p.ctrl.press('a');
    }
  }

  pickTarget(p, s, i, ai, lvl) {
    // a roller nearby? go get it
    const rp = this.pickups.find((pk) => Math.hypot(pk.x - s.x, pk.y - s.y) < [260, 420, 600][lvl]);
    if (rp && (lvl > 0 || chance(0.6))) { ai.tx = rp.x; ai.ty = rp.y; return; }
    const cands = [];
    for (let rr = 1; rr < ROWS; rr += 2) for (let c = 1; c < COLS; c += 2) {
      const cx = (c + 0.5) * CS, cy = Y0 + (rr + 0.5) * CS;
      const d = Math.hypot(cx - s.x, cy - s.y);
      if (d < 60) continue;
      const cnt = this.nonMineCount(cx, cy, CS * 2.1, i);
      let sc = cnt - d / CS * 0.95;
      for (const o of this.ps) if (o !== s && Math.hypot(o.x - cx, o.y - cy) < 130) sc -= 3;
      sc += rand(-1, 1) * [6, 2.5, 1][lvl];
      cands.push({ cx, cy, sc });
    }
    cands.sort((a, b) => b.sc - a.sc);
    let best = cands[0];
    if (lvl === 0 && chance(0.28)) best = pick(cands.slice(0, 16)); // wanders / repaints its own colour
    if (best) { ai.tx = best.cx; ai.ty = best.cy; }
  }

  // ----- drawing -----------------------------------------------------------

  ambient(dt) {
    this.clock += dt;
    for (const s of this.ps) s.a.update(dt);
    for (const sp of this.splats) sp.t += dt;
    this.splats = this.splats.filter((sp) => sp.t < 0.8);
  }

  drawTool(g, info, i) {
    const s = this.ps[i], p = this.players[i];
    const hx = info.hand.x, hy = info.hand.y, u = info.h / 170;
    g.save(); g.translate(hx, hy);
    if (s.roller > 0) {
      // rainbow paint roller
      g.rotate(-0.5);
      g.strokeStyle = NAVY; g.lineWidth = 8 * u; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(34 * u, -2 * u); g.stroke();
      g.strokeStyle = '#8b5a2b'; g.lineWidth = 4.5 * u; g.beginPath(); g.moveTo(0, 0); g.lineTo(34 * u, -2 * u); g.stroke();
      g.translate(34 * u, -2 * u);
      const w = 86 * u, h = 30 * u;
      g.save(); g.rotate(-Math.PI / 2 + 0.0);
      g.fillStyle = '#fff'; ui.roundRect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
      g.save(); ui.roundRect(g, -w / 2, -h / 2, w, h, h / 2); g.clip();
      RAINBOW.forEach((c, k) => { g.fillStyle = c; g.fillRect(-w / 2 + (k * w) / RAINBOW.length, -h / 2, w / RAINBOW.length + 1, h); });
      g.restore();
      g.strokeStyle = NAVY; g.lineWidth = 4 * u; ui.roundRect(g, -w / 2, -h / 2, w, h, h / 2); g.stroke();
      g.restore();
    } else {
      // brush with a loaded tip
      g.rotate(-1.1);
      g.strokeStyle = NAVY; g.lineWidth = 10 * u; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-8 * u, 0); g.lineTo(52 * u, 0); g.stroke();
      g.strokeStyle = '#d6a05a'; g.lineWidth = 5.5 * u; g.beginPath(); g.moveTo(-8 * u, 0); g.lineTo(52 * u, 0); g.stroke();
      g.fillStyle = '#aab4c4'; g.fillRect(34 * u, -7 * u, 10 * u, 14 * u);
      g.fillStyle = p.color; g.strokeStyle = NAVY; g.lineWidth = 3.5 * u;
      g.beginPath(); g.moveTo(44 * u, -9 * u); g.quadraticCurveTo(72 * u, -9 * u, 76 * u, 0); g.quadraticCurveTo(72 * u, 9 * u, 44 * u, 9 * u); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
  }

  draw(g) {
    const bg = art('bg/paint-party');
    g.drawImage(this.base, 0, 0);
    if (bg) { g.save(); g.globalAlpha = 0.25; g.drawImage(bg, 0, 0, W, H); g.restore(); }
    g.drawImage(this.paintCv, X0, Y0);
    this.drawSplats(g);
    this.drawPickups(g);
    // grid edge shading
    const vg = g.createLinearGradient(0, Y0, 0, Y0 + 40); vg.addColorStop(0, 'rgba(36,22,63,0.25)'); vg.addColorStop(1, 'rgba(36,22,63,0)');
    g.fillStyle = vg; g.fillRect(0, Y0, W, 40);
    // bomb shadows / bombs
    for (const b of this.bombs) {
      const k = clamp(b.t / b.dur, 0, 1);
      const x = lerp(b.sx, b.tx, k), gy = lerp(b.gy, b.ty, k), y = lerp(b.sy, b.ty, k) - Math.sin(k * Math.PI) * 150;
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x, gy + 6, 18 * (1 - Math.sin(k * Math.PI) * 0.3), 8, 0, 0, TAU); g.fill();
      // target marker
      g.save(); g.globalAlpha = 0.35 + 0.25 * Math.sin(this.clock * 20); g.strokeStyle = b.color; g.lineWidth = 6; g.setLineDash([14, 10]);
      g.beginPath(); g.ellipse(b.tx, b.ty, BOMB_R * k, BOMB_R * k * 0.9, 0, 0, TAU); g.stroke(); g.restore();
      g.save(); g.translate(x, y); g.rotate(k * 9);
      g.fillStyle = b.color; g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 21, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-7, -8, 7, 4, -0.6, 0, TAU); g.fill();
      g.fillStyle = '#fff'; for (let k2 = 0; k2 < 3; k2++) { g.beginPath(); g.arc(Math.cos(k2 * 2.1) * 11, Math.sin(k2 * 2.1) * 11 + 4, 3, 0, TAU); g.fill(); }
      g.restore();
    }
    // players
    const order = this.ps.map((s, i) => i).sort((a, b) => this.ps[a].y - this.ps[b].y);
    for (const i of order) this.drawPlayer(g, i);
  }

  drawSplats(g) {
    for (const sp of this.splats) {
      const k = sp.t / 0.8, grow = ease.outBack(clamp(sp.t / 0.22, 0, 1)), alpha = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
      g.save(); g.translate(sp.x, sp.y); g.globalAlpha = clamp(alpha, 0, 1) * 0.95;
      g.fillStyle = sp.color; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 5;
      const R = sp.r * grow;
      g.beginPath(); g.arc(0, 0, R * 0.8, 0, TAU); g.fill(); g.stroke();
      for (const l of sp.lobes) { g.beginPath(); g.arc(Math.cos(l.a) * R * l.d, Math.sin(l.a) * R * l.d, R * l.r, 0, TAU); g.fill(); }
      for (const d of sp.drops) { g.beginPath(); g.arc(Math.cos(d.a) * R * d.d, Math.sin(d.a) * R * d.d, R * d.r, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-R * 0.3, -R * 0.35, R * 0.28, R * 0.12, -0.6, 0, TAU); g.fill();
      g.restore();
    }
  }

  drawPickups(g) {
    for (const pk of this.pickups) {
      const bob = Math.sin(this.clock * 3 + pk.x) * 7, k = ease.outBack(clamp(pk.t / 0.4, 0, 1));
      g.save(); g.translate(pk.x, pk.y);
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(0, 24, 40, 12, 0, 0, TAU); g.fill();
      const rg = g.createRadialGradient(0, -10, 6, 0, -10, 80); rg.addColorStop(0, 'rgba(255,255,255,0.8)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(-90, -100, 180, 180);
      g.translate(0, -16 + bob); g.scale(k, k); g.rotate(Math.sin(this.clock * 2) * 0.12);
      // roller
      const w = 92, h = 36;
      g.strokeStyle = NAVY; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, h / 2 + 8); g.lineTo(0, 54); g.stroke();
      g.strokeStyle = '#8b5a2b'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, h / 2 + 8); g.lineTo(0, 54); g.stroke();
      g.strokeStyle = NAVY; g.lineWidth = 6; g.beginPath(); g.moveTo(-w / 2 + 10, h / 2 + 4); g.lineTo(w / 2 - 6, h / 2 + 4); g.lineTo(w / 2 - 6, h / 2 + 8); g.stroke();
      g.save(); ui.roundRect(g, -w / 2, -h / 2, w, h, h / 2); g.clip();
      RAINBOW.forEach((c, j) => { g.fillStyle = c; g.fillRect(-w / 2 + (j * w) / RAINBOW.length, -h / 2, w / RAINBOW.length + 1, h); });
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-w / 2, -h / 2 + 4, w, 7);
      g.restore();
      g.strokeStyle = NAVY; g.lineWidth = 5; ui.roundRect(g, -w / 2, -h / 2, w, h, h / 2); g.stroke();
      g.restore();
      // sparkles
      for (let j = 0; j < 3; j++) {
        const a = this.clock * 2 + j * 2.1, rr = 56 + Math.sin(this.clock * 3 + j) * 8;
        g.save(); g.translate(pk.x + Math.cos(a) * rr, pk.y - 20 + Math.sin(a) * rr * 0.5); g.rotate(a); g.fillStyle = RAINBOW[(j * 2) % 7]; g.beginPath();
        for (let q = 0; q < 8; q++) { const rad = q % 2 ? 3 : 11; g.lineTo(Math.cos((q * Math.PI) / 4) * rad, Math.sin((q * Math.PI) / 4) * rad); }
        g.closePath(); g.fill(); g.restore();
      }
    }
  }

  drawPlayer(g, i) {
    const s = this.ps[i], p = this.players[i], a = s.a;
    // contrast ring (white) under the coloured ring so you can find yourself on your own paint
    g.save();
    g.strokeStyle = '#ffffff'; g.lineWidth = 11; g.globalAlpha = 0.95;
    const rr = Math.max(46, a.width * 0.42);
    g.beginPath(); g.ellipse(a.x, a.y + 2, rr + 4, rr * 0.3 + 2, 0, 0, TAU); g.stroke();
    g.restore();
    a.draw(g, { ring: p.color });
    // bomb refill ring
    const ready = s.cool <= 0, prog = 1 - s.cool / BOMB_CD;
    g.save(); g.translate(a.x, a.y + 2);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 12; g.beginPath(); g.ellipse(0, 0, rr + 18, (rr + 18) * 0.3, 0, 0, TAU); g.stroke();
    g.strokeStyle = ready ? '#ffffff' : p.color; g.lineWidth = 7;
    g.beginPath(); g.ellipse(0, 0, rr + 18, (rr + 18) * 0.3, 0, -Math.PI / 2, -Math.PI / 2 + TAU * prog); g.stroke();
    if (ready) {
      const k = 0.5 + 0.5 * Math.sin(this.clock * 8);
      g.globalAlpha = 0.5 + 0.5 * k; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, rr + 24, (rr + 24) * 0.3, 0, 0, TAU); g.stroke();
    }
    g.restore();
    if (s.roller > 0) {
      g.save(); g.translate(a.x, a.y + 2); g.lineWidth = 8; g.globalAlpha = 0.8;
      const hue = (this.clock * 360) % 360; g.strokeStyle = `hsl(${hue},95%,60%)`;
      g.beginPath(); g.ellipse(0, 0, rr + 34, (rr + 34) * 0.3, 0, -Math.PI / 2, -Math.PI / 2 + TAU * (s.roller / ROLLER_T)); g.stroke(); g.restore();
    }
    ui.playerTag(g, p, a.x, a.y - a.height - 24);
  }

  /** Screen-space HUD (drawn by the host after the camera). */
  drawHUD(g) {
    const total = COLS * ROWS;
    const left = Math.max(0, TIME - this.t);
    ui.timer(g, left, W / 2, 52);
    // territory bar
    const bx = 70, bw = 760, by = 34, bh = 30;
    g.save();
    ui.roundRect(g, bx, by, bw, bh, bh / 2); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
    g.save(); ui.roundRect(g, bx, by, bw, bh, bh / 2); g.clip();
    let x = bx;
    const order = this.players.map((p, i) => i).sort((a, b) => this.counts[b] - this.counts[a]);
    for (const i of order) { const w = (this.counts[i] / total) * bw; g.fillStyle = this.players[i].color; g.fillRect(x, by, w + 0.5, bh); x += w; }
    g.restore();
    g.strokeStyle = NAVY; g.lineWidth = 5; ui.roundRect(g, bx, by, bw, bh, bh / 2); g.stroke();
    g.restore();
    ui.text(g, 'Painted plaza', bx + bw / 2, by + bh + 22, { size: 22, color: '#ffffff', strokeWidth: 5 });
    if (this.doubleOn() && !this.ended) {
      const pulse = 1 + Math.sin(this.clock * 9) * 0.06;
      g.save(); g.translate(1300, 52); g.scale(pulse, pulse);
      ui.panel(g, -200, -34, 400, 68, { r: 34, fill: '#ffd23f' });
      ui.text(g, 'DOUBLE BRUSH!', 0, 2, { size: 40, color: '#ff4d6d', strokeWidth: 8 });
      g.restore();
    }
    const vals = this.counts.map((c) => Math.round((c / total) * 100));
    ui.scoreboard(g, this.players, vals, { y: 996, format: (v) => `${v}%` });
    if (this.msg) ui.banner(g, this.msg.text, this.msg.t, { y: 330, size: 150, color: '#ffd23f', strokeWidth: 26 });
  }
}
