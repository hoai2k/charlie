// Troll Trouble - top-down meadow, 45 seconds, survive & collect.
// Grab gems while a grumpy (never scary) Troll stomps around. He telegraphs a
// ground-pound with a growing shadow; anyone inside gets dizzy and drops half
// their gems. Sometimes he yawns and naps. The last 10 seconds he gets grumpier.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, steer } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, chance, pick, placementsFromScores, ease, TAU } from '../engine/util.js';

const NAVY = ui.NAVY;
const DURATION = 45;
const ANGRY_AT = 10;                       // seconds left when the Troll gets grumpier
const ARENA = { x0: 70, x1: W - 70, y0: 255, y1: H - 40 };
const SPEED = 370, DASH_SPEED = 1150, DASH_TIME = 0.17, DASH_CD = 1.1;
const STUN_TIME = 1.5, INV_TIME = 2.2;
const SLAM_R = 250, SLAM_RY = 0.82;        // telegraph radius (x) and squash (y) for the top-down look
const GEM_COLORS = [['#ff5b9e', '#ffb3d6'], ['#35c8ff', '#b4ecff'], ['#7be04d', '#d3f7b0'], ['#b673ff', '#e3c9ff'], ['#ff9a2e', '#ffd9a6']];

const ROCKS = [
  { x: 470, y: 470, r: 50 }, { x: 1450, y: 450, r: 58 }, { x: 960, y: 650, r: 46 },
  { x: 380, y: 860, r: 54 }, { x: 1540, y: 870, r: 48 }, { x: 1010, y: 360, r: 36 },
];

export const meta = {
  id: 'troll-trouble',
  title: 'Troll Trouble',
  category: 'party',
  type: 'Survive & collect',
  goal: 'Grab the most gems - and dodge the grumpy Troll\'s ground-pound!',
  controls: [['stick', 'Run around'], ['a', 'Dash (short cooldown)']],
  tips: [
    'Run away from the growing shadow circle!',
    'Hit by a slam? You drop half your gems - grab them back!',
    'When the Troll naps, it is gem-grabbing time.',
  ],
  music: 'chase',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#a6ec82'); gr.addColorStop(1, '#6fcf6b');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 6; i++) g.fillRect(x + i * w / 6, y, w / 12, h);
    // flowers
    for (let i = 0; i < 9; i++) drawFlower(g, x + w * ((i * 0.37 + 0.08) % 1), y + h * (0.12 + ((i * 0.53) % 0.8)), h * 0.035, i);
    // slam circle
    const k = (t * 0.7) % 1;
    const cx = x + w * 0.5, cy = y + h * 0.62;
    g.save();
    g.fillStyle = 'rgba(60,20,40,0.28)'; g.beginPath(); g.ellipse(cx, cy, w * 0.3 * (0.4 + 0.6 * k), h * 0.2 * (0.4 + 0.6 * k), 0, 0, TAU); g.fill();
    g.strokeStyle = '#ff4d6d'; g.lineWidth = h * 0.02; g.setLineDash([h * 0.05, h * 0.04]);
    g.beginPath(); g.ellipse(cx, cy, w * 0.3, h * 0.2, 0, 0, TAU); g.stroke();
    g.restore();
    // troll-ish blob
    g.fillStyle = '#7f9a45'; g.strokeStyle = NAVY; g.lineWidth = h * 0.025;
    g.beginPath(); g.ellipse(cx, cy - h * 0.12, w * 0.12, h * 0.17, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#7f9a45'; g.beginPath(); g.arc(cx, cy - h * 0.34, h * 0.1, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - h * 0.04, cy - h * 0.35, h * 0.028, 0, TAU); g.arc(cx + h * 0.04, cy - h * 0.35, h * 0.028, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.arc(cx - h * 0.04, cy - h * 0.34, h * 0.012, 0, TAU); g.arc(cx + h * 0.04, cy - h * 0.34, h * 0.012, 0, TAU); g.fill();
    g.lineWidth = h * 0.02; g.beginPath(); g.moveTo(cx - h * 0.07, cy - h * 0.41); g.lineTo(cx - h * 0.01, cy - h * 0.38); g.moveTo(cx + h * 0.07, cy - h * 0.41); g.lineTo(cx + h * 0.01, cy - h * 0.38); g.stroke();
    // gems
    const gems = [[0.18, 0.3], [0.82, 0.25], [0.2, 0.78], [0.84, 0.74]];
    gems.forEach(([gx, gy], i) => drawGemShape(g, x + w * gx, y + h * gy + Math.sin(t * 3 + i) * 4, h * 0.075, i, 1));
    // exclamation
    g.save(); g.translate(cx + w * 0.17, cy - h * 0.42 + Math.sin(t * 6) * 3);
    ui.text(g, '!', 0, 0, { size: h * 0.2, color: '#ff4d6d', strokeWidth: h * 0.03 }); g.restore();
  },
};

// ---- small shared drawing helpers -------------------------------------------
function drawFlower(g, x, y, s, seed) {
  const cols = ['#ffffff', '#ff9ccc', '#ffe36e', '#c9a6ff', '#ff8c8c'];
  const c = cols[seed % cols.length];
  g.save(); g.translate(x, y);
  g.fillStyle = c;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; g.beginPath(); g.arc(Math.cos(a) * s, Math.sin(a) * s, s * 0.85, 0, TAU); g.fill(); }
  g.fillStyle = c === '#ffe36e' ? '#ff9f1c' : '#ffd23f'; g.beginPath(); g.arc(0, 0, s * 0.7, 0, TAU); g.fill();
  g.restore();
}

function drawGemShape(g, x, y, r, kind, scale = 1, big = false) {
  const [c1, c2] = big ? ['#ffb400', '#fff1a0'] : GEM_COLORS[kind % GEM_COLORS.length];
  g.save(); g.translate(x, y); g.scale(scale, scale);
  g.lineJoin = 'round'; g.lineWidth = Math.max(2.5, r * 0.14); g.strokeStyle = NAVY;
  // faceted diamond
  g.beginPath(); g.moveTo(-r, -r * 0.25); g.lineTo(-r * 0.5, -r * 0.85); g.lineTo(r * 0.5, -r * 0.85); g.lineTo(r, -r * 0.25); g.lineTo(0, r); g.closePath();
  g.fillStyle = c1; g.fill(); g.stroke();
  g.fillStyle = c2; g.beginPath(); g.moveTo(-r * 0.5, -r * 0.85); g.lineTo(r * 0.5, -r * 0.85); g.lineTo(r * 0.28, -r * 0.25); g.lineTo(-r * 0.28, -r * 0.25); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-r, -r * 0.25); g.lineTo(r, -r * 0.25); g.stroke();
  g.globalAlpha = 0.55; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.55, r * 0.16, r * 0.09, -0.5, 0, TAU); g.fill();
  g.restore();
}

function drawRock(g, rk, big = true) {
  const { x, y, r } = rk;
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(30,60,30,0.28)'; g.beginPath(); g.ellipse(6, r * 0.45, r * 1.15, r * 0.42, 0, 0, TAU); g.fill();
  g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = NAVY;
  g.fillStyle = '#9aa0b4';
  g.beginPath();
  g.moveTo(-r * 1.0, r * 0.3); g.bezierCurveTo(-r * 1.1, -r * 0.5, -r * 0.5, -r * 0.95, 0, -r * 0.9);
  g.bezierCurveTo(r * 0.6, -r * 0.95, r * 1.15, -r * 0.4, r * 1.0, r * 0.3); g.bezierCurveTo(r * 0.7, r * 0.62, -r * 0.7, r * 0.62, -r * 1.0, r * 0.3);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c4c9db'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.45, r * 0.5, r * 0.25, -0.2, 0, TAU); g.fill();
  g.fillStyle = '#7e859b'; g.beginPath(); g.ellipse(r * 0.35, r * 0.2, r * 0.45, r * 0.2, 0, 0, TAU); g.fill();
  // moss
  g.fillStyle = '#6fcf6b'; g.beginPath(); g.ellipse(r * 0.3, -r * 0.7, r * 0.35, r * 0.14, 0.2, 0, TAU); g.fill();
  g.restore();
}

function drawCrown(g, x, y, s) {
  g.save(); g.translate(x, y); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.lineJoin = 'round';
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.moveTo(-s, 0); g.lineTo(-s, -s * 0.8); g.lineTo(-s * 0.5, -s * 0.35); g.lineTo(0, -s); g.lineTo(s * 0.5, -s * 0.35); g.lineTo(s, -s * 0.8); g.lineTo(s, 0); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, -s * 0.38, s * 0.16, 0, TAU); g.fill();
  g.restore();
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.left = DURATION;
    this.angry = false;
    this.angerBanner = 0;
    this.gems = [];
    this.waves = [];
    this.spawnT = 0.4;
    this.hint = 5;
    this.finished = false;
    this.clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 460, y: 260 + (i * 211) % 700, s: 1 + (i % 3) * 0.4 }));
    this.pl = this.players.map((p, i) => {
      const a = new Actor(p.charId, { scale: 1 });
      const x = W / 2 + (i - (this.n - 1) / 2) * Math.min(210, 1500 / Math.max(1, this.n)), y = 860 + (i % 2) * 50;
      a.x = x; a.y = y; a.snap();
      return {
        p, i, a, x, y, vx: 0, vy: 0, gems: 0, dashT: 0, dashCd: 0, dashDx: 1, dashDy: 0,
        stun: 0, inv: 0, chain: 0, chainT: 0, ringT: 0, flashT: 0,
        ai: { gem: null, think: rand(0.1, 0.5), threatT: 0, wasThreat: false, reactT: 0, wp: null, seen: false, danceSeed: rand(100) },
      };
    });
    const ta = new Actor('troll', { scale: 0.92 });
    this.troll = {
      a: ta, x: W / 2, y: 470, vx: 0, vy: 0, state: 'wander', t: 2.6, target: null, wp: null, stepT: 0,
      windDur: 0.9, windT: 0, napT: 0, snoreT: 0, angerT: 0, bumpCd: 0, napsDone: 0, slams: 0, lastTarget: -1,
    };
    ta.x = this.troll.x; ta.y = this.troll.y; ta.snap();
    this.bg = null;
    // a few starter gems
    for (let i = 0; i < 6; i++) this.spawnGem(true);
  }

  // ---- gems ------------------------------------------------------------------
  maxGems() { return 8 + this.n * 2; }
  spawnGem(initial = false) {
    for (let tries = 0; tries < 20; tries++) {
      const x = rand(ARENA.x0 + 40, ARENA.x1 - 40), y = rand(ARENA.y0 + 20, ARENA.y1 - 20);
      if (ROCKS.some((r) => Math.hypot(r.x - x, r.y - y) < r.r + 50)) continue;
      if (!initial && Math.hypot(this.troll.x - x, this.troll.y - y) < 220) continue;
      if (this.gems.some((gm) => Math.hypot(gm.x - x, gm.y - y) < 90)) continue;
      const big = chance(0.14);
      this.gems.push({ x, y, v: big ? 3 : 1, big, kind: randInt(0, GEM_COLORS.length - 1), age: 0, life: rand(13, 17), pick: 0, vx: 0, vy: 0, spawn: 0 });
      if (!initial) particles.burst(x, y, { type: 'sparkle', count: big ? 6 : 3, colors: ['#ffffff', '#fff3a0'], speed: [30, 90], size: [10, 18] });
      return;
    }
  }

  dropGems(pl, count) {
    for (let k = 0; k < count; k++) {
      const a = (k / Math.max(1, count)) * TAU + rand(0.4);
      const sp = rand(260, 480);
      this.gems.push({ x: pl.x, y: pl.y - 40, v: 1, big: false, kind: randInt(0, GEM_COLORS.length - 1), age: 0, life: rand(12, 16), pick: 0.55, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, spawn: 1, scatter: true });
    }
  }

  // ---- update ------------------------------------------------------------------
  preUpdate(dt) { this.t += dt; this.animateOnly(dt); }
  postUpdate(dt) { this.t += dt; this.animateOnly(dt); }
  animateOnly(dt) {
    for (const pl of this.pl) pl.a.update(dt);
    this.troll.a.update(dt);
    for (const gm of this.gems) gm.age += dt * 0.0;
  }

  update(dt) {
    this.t += dt;
    this.left = Math.max(0, this.left - dt);
    this.hint = Math.max(0, this.hint - dt);
    this.angerBanner = Math.max(0, this.angerBanner - dt);
    if (!this.angry && this.left <= ANGRY_AT) this.goAngry();

    // gem spawning
    const napBonus = this.troll.state === 'nap' ? 1.8 : 1;
    this.spawnT -= dt * napBonus;
    if (this.spawnT <= 0) {
      this.spawnT = 0.62 - Math.min(0.2, this.n * 0.02);
      if (this.gems.filter((gm) => !gm.scatter).length < this.maxGems()) this.spawnGem();
    }
    this.updateGems(dt);
    for (const pl of this.pl) { if (pl.p.isAI) this.aiThink(pl, dt); this.updatePlayer(pl, dt); }
    // gentle personal space so crowds don't stack up
    for (let i = 0; i < this.pl.length; i++) for (let j = i + 1; j < this.pl.length; j++) {
      const A = this.pl[i], B = this.pl[j];
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d < 56 && d > 0.01) { const k = (56 - d) * 0.5; A.x -= dx / d * k * 0.5; A.y -= dy / d * k * 0.5; B.x += dx / d * k * 0.5; B.y += dy / d * k * 0.5; }
    }
    this.updateTroll(dt);
    // waves
    for (const w of this.waves) w.t += dt;
    this.waves = this.waves.filter((w) => w.t < 0.6);
    for (const c of this.clouds) { c.x += dt * 16; if (c.x > W + 400) c.x = -400; }
    if (this.left <= 0 && !this.finished) this.finish();
  }

  updateGems(dt) {
    for (const gm of this.gems) {
      gm.age += dt; gm.pick = Math.max(0, gm.pick - dt); gm.spawn = Math.min(1, gm.spawn + dt * 4);
      if (gm.vx || gm.vy) {
        gm.x += gm.vx * dt; gm.y += gm.vy * dt;
        const k = Math.exp(-5 * dt); gm.vx *= k; gm.vy *= k;
        if (Math.hypot(gm.vx, gm.vy) < 8) { gm.vx = gm.vy = 0; gm.scatter = false; }
        gm.x = clamp(gm.x, ARENA.x0, ARENA.x1); gm.y = clamp(gm.y, ARENA.y0, ARENA.y1);
        for (const r of ROCKS) { const d = Math.hypot(gm.x - r.x, gm.y - r.y); if (d < r.r + 14) { gm.x = r.x + (gm.x - r.x) / d * (r.r + 16); gm.y = r.y + (gm.y - r.y) / d * (r.r + 16); } }
      }
    }
    this.gems = this.gems.filter((gm) => gm.age < gm.life);
  }

  collide(ent, rad) {
    for (const r of ROCKS) {
      const dx = ent.x - r.x, dy = (ent.y - r.y) * 1.25, d = Math.hypot(dx, dy), min = r.r + rad;
      if (d < min && d > 0.01) { const k = min / d; ent.x = r.x + dx * k; ent.y = r.y + (dy * k) / 1.25; }
    }
  }

  updatePlayer(pl, dt) {
    const a = pl.a, c = pl.p.ctrl;
    pl.dashCd = Math.max(0, pl.dashCd - dt);
    pl.inv = Math.max(0, pl.inv - dt);
    pl.chainT -= dt; if (pl.chainT <= 0) pl.chain = 0;
    pl.ringT = Math.max(0, pl.ringT - dt);
    if (pl.stun > 0) {
      pl.stun -= dt;
      pl.vx *= Math.exp(-8 * dt); pl.vy *= Math.exp(-8 * dt);
      pl.x += pl.vx * dt; pl.y += pl.vy * dt;
      if (pl.stun <= 0) { a.setPose('idle'); a.clearEmotes(); }
    } else {
      let ix = c.x, iy = c.y; const m = Math.hypot(ix, iy);
      if (m > 1) { ix /= m; iy /= m; }
      if (c.pressed('a') && pl.dashCd <= 0) {
        const mm = Math.hypot(ix, iy);
        pl.dashDx = mm > 0.25 ? ix / mm : a.facing; pl.dashDy = mm > 0.25 ? iy / mm : 0;
        pl.dashT = DASH_TIME; pl.dashCd = DASH_CD;
        sfx('dash'); a.playOnce('push', 0.22); a.squash(0.2);
        particles.burst(pl.x, pl.y - 6, { type: 'dust', count: 6, speed: [60, 200] });
      }
      if (pl.dashT > 0) {
        pl.dashT -= dt;
        pl.vx = pl.dashDx * DASH_SPEED; pl.vy = pl.dashDy * DASH_SPEED;
        if (chance(dt * 40)) particles.burst(pl.x, pl.y - 8, { type: 'dust', count: 1, speed: [20, 60], size: [10, 18] });
      } else {
        const k = Math.min(1, dt * 14);
        pl.vx += (ix * SPEED - pl.vx) * k; pl.vy += (iy * SPEED - pl.vy) * k;
      }
      pl.x += pl.vx * dt; pl.y += pl.vy * dt;
      a.moveAnim(pl.vx, pl.vy, SPEED);
    }
    pl.x = clamp(pl.x, ARENA.x0, ARENA.x1); pl.y = clamp(pl.y, ARENA.y0, ARENA.y1);
    this.collide(pl, 34);
    a.x = pl.x; a.y = pl.y;
    a.alpha = pl.inv > 0 && pl.stun <= 0 ? (Math.sin(this.t * 40) > 0 ? 0.45 : 1) : 1;
    a.scale = depthScale(pl.y);
    a.update(dt);
    // pick up gems
    if (pl.stun <= 0) {
      for (const gm of this.gems) {
        if (gm.pick > 0 || gm.collected) continue;
        const rr = gm.big ? 78 : 66;
        if (Math.hypot(gm.x - pl.x, gm.y - (pl.y - 28)) < rr) {
          gm.collected = true;
          pl.gems += gm.v; pl.chain++; pl.chainT = 1.1;
          sfx(gm.big ? 'coin' : 'collect', { step: Math.min(pl.chain - 1, 9) });
          particles.burst(gm.x, gm.y, { type: 'sparkle', count: gm.big ? 8 : 4, colors: ['#ffffff', GEM_COLORS[gm.kind % 5][0]], speed: [60, 200] });
          particles.popText(pl.x, pl.y - a.height - 50, `+${gm.v}`, gm.big ? '#ffd23f' : '#ffffff', gm.big ? 64 : 48);
          a.squash(0.15);
          if (gm.big) { a.playOnce('cheer', 0.45); voice(pl.p.charId, 'woo'); }
        }
      }
      this.gems = this.gems.filter((gm) => !gm.collected);
    }
  }

  // ---- troll -------------------------------------------------------------------
  goAngry() {
    this.angry = true; this.angerBanner = 2.2;
    const tr = this.troll;
    sfx('roar'); fx.shake(14, 0.5); fx.flash('#ff3355', 0.25);
    tr.a.emote('anger', 1.5); tr.a.flash('#ff3355', 0.3); tr.a.squash(0.4);
    if (tr.state === 'nap' || tr.state === 'yawn') { tr.state = 'wander'; tr.t = 0.6; tr.a.setPose('walk'); tr.a.emote('exclaim', 0.8); }
  }

  pickTarget() {
    const tr = this.troll;
    const cands = this.pl.filter((q) => q.stun <= 0 && q.inv <= 0.2);
    if (!cands.length) return this.pl[randInt(0, this.pl.length - 1)];
    const top = Math.max(...this.pl.map((q) => q.gems));
    const weights = cands.map((q) => (q.gems > 0 && q.gems === top ? 3.2 : 1) * (q.i === tr.lastTarget && cands.length > 1 ? 0.5 : 1));
    let r = rand(weights.reduce((a, b) => a + b, 0));
    for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) return cands[i]; }
    return cands[0];
  }

  updateTroll(dt) {
    const tr = this.troll, a = tr.a;
    const ang = this.angry;
    tr.t -= dt; tr.bumpCd = Math.max(0, tr.bumpCd - dt);
    const moveTo = (tx, ty, speed) => {
      const dx = tx - tr.x, dy = ty - tr.y, d = Math.hypot(dx, dy);
      if (d > 4) { tr.vx = dx / d * speed; tr.vy = dy / d * speed; } else { tr.vx = tr.vy = 0; }
      return d;
    };
    const footsteps = (interval) => {
      tr.stepT -= dt;
      if (tr.stepT <= 0 && (tr.vx || tr.vy)) {
        tr.stepT = interval;
        sfx('stomp', { vol: 0.5 }); fx.shake(ang ? 5 : 3, 0.12); a.squash(0.12);
        particles.burst(tr.x + rand(-30, 30), tr.y - 4, { type: 'dust', count: 3, speed: [40, 120], size: [10, 20] });
        for (const pl of this.pl) { /* nothing - the stomps only rattle the screen */ }
      }
    };
    tr.vx = tr.vy = 0;
    switch (tr.state) {
      case 'wander': {
        if (!tr.wp || Math.hypot(tr.wp.x - tr.x, tr.wp.y - tr.y) < 30) tr.wp = { x: rand(250, W - 250), y: rand(380, H - 120) };
        moveTo(tr.wp.x, tr.wp.y, ang ? 170 : 125);
        a.moveAnim(tr.vx, tr.vy, 125);
        footsteps(0.48);
        if (tr.t <= 0) {
          tr.target = this.pickTarget(); tr.lastTarget = tr.target.i;
          tr.state = 'notice'; tr.t = ang ? 0.45 : 0.7;
          a.emote('exclaim', 0.9); a.squash(0.35); a.setPose('surprised'); a.facing = tr.target.x > tr.x ? 1 : -1;
          tr.target.a.emote('exclaim', 0.9);
          tr.target.ringT = 3;
          sfx('stomp'); sfx(ang ? 'roar' : 'stun'); sfx('npc/troll/grumble');
        }
        break;
      }
      case 'notice': {
        a.setPose('idle');
        if (tr.t <= 0) { tr.state = 'chase'; tr.t = 4.2; a.setPose(ang ? 'run' : 'walk'); }
        break;
      }
      case 'chase': {
        const tg = tr.target;
        if ((tg.stun > 0 || tg.inv > 0.9) && tr.t > 1.0) { tr.target = this.pickTarget(); }
        const sp = ang ? 375 : 290;
        const d = moveTo(tr.target.x, tr.target.y - 8, sp);
        a.moveAnim(tr.vx, tr.vy, sp, { run: true });
        footsteps(ang ? 0.28 : 0.34);
        if (d < 190 || tr.t <= 0) this.startWindup();
        break;
      }
      case 'windup': {
        tr.windT += dt;
        const k = tr.windT / tr.windDur;
        a.setPose('windup');
        // rear up a little, then leap for the slam
        a.z = k < 0.7 ? Math.sin(k / 0.7 * Math.PI * 0.5) * 18 : lerp(18, 110, ease.outQuad((k - 0.7) / 0.3));
        if (tr.windT >= tr.windDur) this.slam();
        break;
      }
      case 'recover': {
        a.z = 0;
        if (tr.t <= 0) {
          const nap = !ang && this.left > ANGRY_AT + 3 && this.t > 8 && chance(0.34);
          if (nap) { tr.state = 'yawn'; tr.t = 1.1; a.setPose('think'); a.emote('dots', 1.0); sfx('shrink'); sfx('npc/troll/yawn'); a.squash(-0.35); }
          else { tr.state = 'wander'; tr.t = ang ? rand(0.7, 1.4) : rand(1.5, 2.6); tr.wp = null; a.setPose('walk'); a.clearEmotes(); }
        }
        break;
      }
      case 'yawn': {
        if (tr.t <= 0) {
          tr.state = 'nap'; tr.t = rand(4.2, 5.4); tr.snoreT = 0.3; a.setPose('sleep');
          this.say('Zzz...', tr.x, tr.y - a.height - 30, '#cfe6ff');
        }
        break;
      }
      case 'nap': {
        tr.snoreT -= dt;
        if (tr.snoreT <= 0) { tr.snoreT = 1.7; sfx('snore'); a.squash(0.1); }
        if (tr.t <= 0) {
          tr.state = 'wander'; tr.t = rand(1.6, 2.4); tr.wp = null; a.setPose('surprised'); a.emote('exclaim', 0.8); a.squash(0.4);
          sfx('stun');
        }
        break;
      }
      default: break;
    }
    // angry flavour
    if (ang) {
      tr.angerT -= dt;
      if (tr.angerT <= 0) { tr.angerT = 0.9; a.flash('#ff3355', 0.22); if (chance(0.5)) a.emote('anger', 0.9); }
    }
    tr.x += tr.vx * dt; tr.y += tr.vy * dt;
    tr.x = clamp(tr.x, ARENA.x0 + 60, ARENA.x1 - 60); tr.y = clamp(tr.y, ARENA.y0 + 110, ARENA.y1);
    this.collide(tr, 56);
    a.x = tr.x; a.y = tr.y; a.scale = 0.92 * depthScale(tr.y);
    // gently shove players he walks into (no damage - he is grumpy, not mean)
    if (tr.bumpCd <= 0 && (tr.state === 'chase' || tr.state === 'wander')) {
      for (const pl of this.pl) {
        const d = Math.hypot(pl.x - tr.x, (pl.y - tr.y) * 1.2);
        if (d < 80 && pl.stun <= 0) {
          const nx = (pl.x - tr.x) / (d || 1), ny = (pl.y - tr.y) / (d || 1);
          pl.vx = nx * 600; pl.vy = ny * 600; pl.dashT = 0; tr.bumpCd = 0.5;
          pl.a.playOnce('surprised', 0.4); sfx('bonk'); particles.burst(pl.x, pl.y - 60, { type: 'spark', count: 6 });
        }
      }
    }
    a.update(dt);
  }

  startWindup() {
    const tr = this.troll;
    tr.state = 'windup'; tr.windT = 0; tr.windDur = this.angry ? 0.78 : 0.95;
    tr.vx = tr.vy = 0;
    sfx('whoosh'); sfx('npc/troll/windup'); tr.a.squash(-0.3);
    tr.slamX = tr.x; tr.slamY = tr.y;
  }

  inSlam(x, y, margin = 0) {
    const tr = this.troll, R = SLAM_R + margin;
    const dx = (x - tr.slamX) / R, dy = (y - tr.slamY) / (R * SLAM_RY);
    return dx * dx + dy * dy < 1;
  }

  slam() {
    const tr = this.troll, a = tr.a;
    tr.state = 'recover'; tr.t = this.angry ? 0.7 : 1.0;
    a.z = 0; a.setPose('slam'); a.squash(0.9);
    tr.slams++;
    fx.shake(26, 0.45); fx.hitstop(0.05);
    sfx('boom'); sfx('stomp');
    particles.burst(tr.slamX, tr.slamY, { type: 'dust', count: 22, speed: [150, 520], size: [16, 34] });
    particles.burst(tr.slamX, tr.slamY - 10, { type: 'petal', count: 18, colors: ['#ff9ccc', '#ffffff', '#ffe36e'], speed: [200, 520] });
    particles.ring(tr.slamX, tr.slamY, '#ffffff', SLAM_R * 1.1, 0.5);
    this.waves.push({ x: tr.slamX, y: tr.slamY, t: 0 });
    if (this.api.camera) this.api.camera.punch(tr.slamX, tr.slamY, 1.12, 0.3);
    let hit = 0;
    for (const pl of this.pl) {
      if (pl.inv > 0 || !this.inSlam(pl.x, pl.y, 16)) continue;
      hit++;
      pl.stun = STUN_TIME; pl.inv = INV_TIME; pl.dashT = 0; pl.ringT = 0;
      const dx = pl.x - tr.slamX, dy = pl.y - tr.slamY, d = Math.hypot(dx, dy) || 1;
      pl.vx = dx / d * 420; pl.vy = dy / d * 300;
      pl.a.setPose('dizzy'); pl.a.flash('#ffffff', 0.2); pl.a.squash(0.5);
      pl.p.ctrl.rumble(0.8, 280);
      voice(pl.p.charId, 'ouch');
      const drop = Math.ceil(pl.gems / 2);
      if (drop > 0) { pl.gems -= drop; this.dropGems(pl, drop); particles.popText(pl.x, pl.y - pl.a.height - 40, `-${drop}`, '#ff6f8f', 60); }
      particles.burst(pl.x, pl.y - 80, { type: 'star', count: 6, colors: ['#ffd23f', '#ffffff'] });
    }
    if (!hit) { a.emote('sweat', 1.0); a.say('Hmph!', 1.3, null); }
    tr.target = null;
  }

  say(str, x, y, color) { particles.popText(x, y, str, color, 46); }

  // ---- CPU players -------------------------------------------------------------
  aiThink(pl, dt) {
    const p = pl.p, prof = aiProfile(p), lvl = p.aiLevel ?? 0, ai = pl.ai, tr = this.troll, c = p.ctrl;
    c.move(0, 0);
    if (pl.stun > 0) return;
    const trollAwake = tr.state !== 'nap' && tr.state !== 'yawn';
    const dTroll = Math.hypot(pl.x - tr.x, pl.y - tr.y);

    // 1) Slam telegraph: get out of the circle (Easy reacts late).
    if (tr.state === 'windup') {
      if (!ai.seenWind) { ai.seenWind = true; ai.windReact = reactionTime(p) + (lvl === 0 ? 0.25 : 0); }
      if (this.inSlam(pl.x, pl.y, 30) && tr.windT >= ai.windReact) {
        // run straight out along the shortest way
        const dx = pl.x - tr.slamX, dy = pl.y - tr.slamY, d = Math.hypot(dx, dy) || 1;
        let mx = dx / d, my = dy / d;
        // if that points into a wall, slide along it
        if ((pl.x < ARENA.x0 + 60 && mx < 0) || (pl.x > ARENA.x1 - 60 && mx > 0)) { mx = 0; my = my >= 0 ? 1 : -1; }
        if ((pl.y < ARENA.y0 + 40 && my < 0) || (pl.y > ARENA.y1 - 40 && my > 0)) { my = 0; mx = mx >= 0 ? 1 : -1; }
        c.move(mx * Math.max(0.9, prof.speed), my * Math.max(0.9, prof.speed));
        const remaining = tr.windDur - tr.windT;
        if (pl.dashCd <= 0 && remaining < 0.5 && lvl >= 1) c.press('a');
        return;
      }
      if (!this.inSlam(pl.x, pl.y, 30)) { /* outside: carry on, but avoid the circle below */ }
    } else ai.seenWind = false;

    // 2) Being chased: run away.
    const chased = tr.target === pl && (tr.state === 'chase' || tr.state === 'notice');
    if (chased) {
      if (!ai.wasThreat) { ai.wasThreat = true; ai.reactT = reactionTime(p) * (lvl === 0 ? 1.1 : 0.8); }
      ai.reactT -= dt;
      const fleeDist = lvl === 0 ? 420 : 560;
      if (ai.reactT <= 0 && dTroll < fleeDist) {
        let dx = pl.x - tr.x, dy = pl.y - tr.y; const d = Math.hypot(dx, dy) || 1;
        dx /= d; dy /= d;
        // weave and avoid walls: blend toward the middle of the field near edges
        const cx = W / 2 - pl.x, cy = (ARENA.y0 + ARENA.y1) / 2 - pl.y;
        const wall = clamp(1 - Math.min(pl.x - ARENA.x0, ARENA.x1 - pl.x, pl.y - ARENA.y0, ARENA.y1 - pl.y) / 240, 0, 1);
        const cm = Math.hypot(cx, cy) || 1;
        let mx = dx + (cx / cm) * wall * 1.5 + -dy * Math.sin(this.t * 2 + ai.danceSeed) * 0.5;
        let my = dy + (cy / cm) * wall * 1.5 + dx * Math.sin(this.t * 2 + ai.danceSeed) * 0.5;
        const mm = Math.hypot(mx, my) || 1;
        c.move(mx / mm * prof.speed, my / mm * prof.speed);
        if (pl.dashCd <= 0 && dTroll < 260 && (lvl >= 1 || chance(dt * 1.2))) c.press('a');
        return;
      }
    } else ai.wasThreat = false;

    // 3) Collect gems, wary of the Troll.
    ai.think -= dt;
    if (ai.think <= 0 || !ai.gem || !this.gems.includes(ai.gem)) {
      ai.think = rand(...prof.think) * 0.7;
      let best = null, bw = -1;
      for (const gm of this.gems) {
        if (gm.pick > 0.3 && gm.scatter) { /* still flying: skip for now */ }
        const d = Math.hypot(gm.x - pl.x, gm.y - pl.y);
        let w = gm.v / (d + 110);
        const dt2 = Math.hypot(gm.x - tr.x, gm.y - tr.y);
        if (trollAwake && dt2 < 380) w *= lvl === 0 ? 0.55 : lvl === 1 ? 0.2 : 0.1;
        if (tr.state === 'windup' && this.inSlam(gm.x, gm.y, 40)) w *= 0.02;
        w *= rand(0.85, 1.15);
        if (w > bw) { bw = w; best = gm; }
      }
      ai.gem = best;
    }
    if (ai.gem) {
      // don't walk into the slam circle
      let tx = ai.gem.x, ty = ai.gem.y + 24;
      if (tr.state === 'windup' && this.inSlam(tx, ty, 40)) { c.move(0, 0); return; }
      const d = steer(p, pl.x, pl.y, tx, ty, { arrive: 20 });
      if (lvl === 2 && d > 380 && pl.dashCd <= 0 && trollAwake && dTroll > 400 && chance(dt * 0.8)) c.press('a');
    }
  }

  // ---- finish ------------------------------------------------------------------
  finish() {
    this.finished = true;
    const scores = this.pl.map((q) => q.gems);
    const placements = placementsFromScores(scores);
    const best = Math.max(...scores);
    this.pl.forEach((q) => {
      q.stun = 0; q.a.alpha = 1; q.a.clearEmotes();
      if (q.gems === best && best > 0) q.a.setPose('celebrate'); else q.a.setPose('pout');
    });
    this.pl.forEach(() => {
    });
    this.troll.state = 'recover'; this.troll.t = 99; this.troll.a.setPose('laugh'); this.troll.a.z = 0; sfx('npc/troll/laugh');
    const win = this.pl.filter((q) => q.gems === best)[0];
    this.api.finish({ placements, stats: scores.map((s) => `${s} gem${s === 1 ? '' : 's'}`), focus: win && best > 0 ? { x: win.x, y: win.y - 80 } : undefined });
  }

  // ---- drawing -----------------------------------------------------------------
  buildBackground() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    let s = 12345; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    // grass
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9ce87c'); gr.addColorStop(1, '#6ccb68');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // mowing stripes
    for (let x = 0; x < W; x += 192) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x, 0, 96, H); }
    // dirt path
    g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(236,214,160,0.75)'; g.lineWidth = 130;
    g.beginPath(); g.moveTo(-60, 960); g.bezierCurveTo(500, 760, 800, 1000, 1180, 760); g.bezierCurveTo(1500, 560, 1700, 700, 1990, 520); g.stroke();
    g.strokeStyle = 'rgba(200,170,110,0.35)'; g.lineWidth = 8; g.setLineDash([2, 26]);
    g.beginPath(); g.moveTo(-60, 960); g.bezierCurveTo(500, 760, 800, 1000, 1180, 760); g.bezierCurveTo(1500, 560, 1700, 700, 1990, 520); g.stroke();
    g.restore();
    // tufts
    g.strokeStyle = 'rgba(40,120,60,0.45)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 380; i++) {
      const x = rnd() * W, y = 230 + rnd() * (H - 230), h = 8 + rnd() * 10;
      g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 3, y - h); g.moveTo(x, y); g.lineTo(x, y - h * 1.2); g.moveTo(x + 6, y); g.lineTo(x + 3, y - h); g.stroke();
    }
    // flowers
    g.globalAlpha = 0.8;
    for (let i = 0; i < 70; i++) drawFlower(g, rnd() * W, 240 + rnd() * (H - 240), 4 + rnd() * 4, Math.floor(rnd() * 5));
    g.globalAlpha = 1;
    // flower patches
    for (let k = 0; k < 5; k++) {
      const px = 120 + rnd() * (W - 240), py = 330 + rnd() * (H - 420);
      for (let i = 0; i < 8; i++) drawFlower(g, px + (rnd() - 0.5) * 130, py + (rnd() - 0.5) * 80, 6 + rnd() * 4, k + (i % 2));
    }
    // back hedge / bushes
    g.fillStyle = '#3f9a55'; g.fillRect(0, 0, W, 205);
    for (let pass = 0; pass < 3; pass++) {
      for (let x = -40; x < W + 80; x += 90) {
        const y = 150 + pass * 14 + rnd() * 20, r = 62 + rnd() * 26;
        g.fillStyle = ['#2f8049', '#3f9a55', '#58b867'][pass];
        g.beginPath(); g.arc(x + rnd() * 30, y, r, 0, TAU); g.fill();
      }
    }
    for (let i = 0; i < 70; i++) drawFlower(g, rnd() * W, 100 + rnd() * 100, 5 + rnd() * 3, Math.floor(rnd() * 5));
    g.fillStyle = 'rgba(20,80,40,0.35)'; g.fillRect(0, 205, W, 12);
    // soft sunbeam
    const sun = g.createRadialGradient(W * 0.85, 40, 40, W * 0.85, 40, 900);
    sun.addColorStop(0, 'rgba(255,248,190,0.45)'); sun.addColorStop(1, 'rgba(255,248,190,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
    this.bg = cv;
  }

  drawBackground(g) {
    const bg = art('bg/troll-trouble');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    if (!this.bg) this.buildBackground();
    g.drawImage(this.bg, 0, 0);
    // drifting cloud shadows
    g.save(); g.fillStyle = 'rgba(30,70,60,0.09)';
    for (const c of this.clouds) { g.beginPath(); g.ellipse(c.x, c.y, 220 * c.s, 90 * c.s, 0, 0, TAU); g.fill(); }
    g.restore();
  }

  drawTelegraph(g) {
    const tr = this.troll;
    if (tr.state === 'windup') {
      const k = clamp(tr.windT / tr.windDur, 0, 1);
      const R = SLAM_R, RY = R * SLAM_RY;
      const urgent = k > 0.72 && Math.sin(this.t * 38) > 0;
      g.save(); g.translate(tr.slamX, tr.slamY);
      // fixed danger outline
      g.setLineDash([26, 18]); g.lineDashOffset = -this.t * 40;
      g.strokeStyle = urgent ? '#ffffff' : '#ff3355'; g.lineWidth = 8;
      g.beginPath(); g.ellipse(0, 0, R, RY, 0, 0, TAU); g.stroke();
      g.setLineDash([]);
      // growing shadow
      const e = ease.outQuad(k);
      g.fillStyle = `rgba(70,10,40,${0.22 + 0.3 * k})`;
      g.beginPath(); g.ellipse(0, 0, R * e, RY * e, 0, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,50,90,${0.1 + 0.2 * k})`;
      g.beginPath(); g.ellipse(0, 0, R, RY, 0, 0, TAU); g.fill();
      g.restore();
    }
    for (const w of this.waves) {
      const k = w.t / 0.6;
      g.save(); g.translate(w.x, w.y);
      g.globalAlpha = 1 - k; g.strokeStyle = '#fff6d0'; g.lineWidth = 16 * (1 - k) + 2;
      const R = SLAM_R * (0.5 + k * 0.95);
      g.beginPath(); g.ellipse(0, 0, R, R * SLAM_RY, 0, 0, TAU); g.stroke();
      g.restore();
    }
  }

  draw(g) {
    this.drawBackground(g);
    this.drawTelegraph(g);
    // target rings under chased players
    for (const pl of this.pl) {
      if (pl.ringT > 0 && this.troll.target === pl && (this.troll.state === 'chase' || this.troll.state === 'notice' || this.troll.state === 'windup')) {
        g.save(); g.globalAlpha = 0.5 + 0.4 * Math.sin(this.t * 14);
        g.strokeStyle = '#ff3355'; g.lineWidth = 7;
        g.beginPath(); g.ellipse(pl.x, pl.y + 2, 74, 26, 0, 0, TAU); g.stroke(); g.restore();
      }
    }
    // gem shadows + gems on the ground
    for (const gm of this.gems) {
      const left = gm.life - gm.age;
      if (left < 3 && Math.sin(this.t * 22) > 0.2) continue;       // blink before vanishing
      const pop = gm.spawn < 1 ? ease.outBack(gm.spawn) : 1;
      const bob = Math.sin(this.t * 3 + gm.x) * 4;
      g.fillStyle = 'rgba(30,70,40,0.25)'; g.beginPath(); g.ellipse(gm.x, gm.y + 14, 22 * pop * (gm.big ? 1.3 : 1), 8 * pop, 0, 0, TAU); g.fill();
      const r = gm.big ? 40 : 29;
      g.save(); g.globalAlpha = 0.35 + 0.15 * Math.sin(this.t * 5 + gm.x); const hg = g.createRadialGradient(gm.x, gm.y - 14 + bob, 4, gm.x, gm.y - 14 + bob, r * 1.9); hg.addColorStop(0, gm.big ? 'rgba(255,230,120,1)' : 'rgba(255,255,255,0.9)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hg; g.beginPath(); g.arc(gm.x, gm.y - 14 + bob, r * 1.9 * pop, 0, TAU); g.fill(); g.restore();
      const lift = gm.scatter ? Math.sin(Math.min(1, gm.age / 0.5) * Math.PI) * 40 : 0;
      drawGemShape(g, gm.x, gm.y - 14 + bob - lift, r, gm.kind, pop, gm.big);
      if (gm.big) {
        g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 6 + gm.x);
        g.fillStyle = '#fff'; const sx = gm.x + 20, sy = gm.y - 40 + bob; g.beginPath();
        g.moveTo(sx, sy - 10); g.lineTo(sx + 3, sy - 3); g.lineTo(sx + 10, sy); g.lineTo(sx + 3, sy + 3); g.lineTo(sx, sy + 10); g.lineTo(sx - 3, sy + 3); g.lineTo(sx - 10, sy); g.lineTo(sx - 3, sy - 3); g.closePath(); g.fill(); g.restore();
      }
    }
    // sorted world (rocks, players, troll)
    const items = [];
    for (const r of ROCKS) items.push({ y: r.y + r.r * 0.4, draw: () => drawRock(g, r) });
    for (const pl of this.pl) items.push({ y: pl.y, draw: () => this.drawPlayer(g, pl) });
    items.push({ y: this.troll.y, draw: () => this.drawTroll(g) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    // crown over leader + tags (always on top)
    const top = Math.max(...this.pl.map((q) => q.gems));
    const leaders = this.pl.filter((q) => q.gems === top && top > 0);
    for (const pl of this.pl) {
      const head = pl.a.anchor('head');
      const ty = head.y - 34 - (pl.a.emotes.some((e) => !e.auto || e.kind === 'dizzy') ? 36 : 0);
      ui.playerTag(g, pl.p, head.x, ty);
      if (leaders.length === 1 && leaders[0] === pl) drawCrown(g, head.x, ty - 50 + Math.sin(this.t * 4) * 3, 22);
      // dash cooldown pip
      if (pl.dashCd > 0) {
        g.save(); g.translate(pl.x, pl.y + 24);
        g.fillStyle = 'rgba(36,22,63,0.45)'; ui.roundRect(g, -30, 0, 60, 10, 5); g.fill();
        g.fillStyle = '#ffffff'; ui.roundRect(g, -30, 0, Math.max(10, 60 * (1 - pl.dashCd / DASH_CD)), 10, 5); g.fill();
        g.restore();
      }
    }
  }

  drawHUD(g) {
    // angry vignette
    if (this.angry) {
      g.save();
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
      const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
      vg.addColorStop(0, 'rgba(255,40,70,0)'); vg.addColorStop(1, `rgba(255,40,70,${0.18 + pulse * 0.2})`);
      g.fillStyle = vg; g.fillRect(0, 0, W, H); g.restore();
    }
    this.drawHud(g);
  }

  drawPlayer(g, pl) {
    pl.a.draw(g, { ring: pl.p.color });
    if (pl.stun > 0) { /* dizzy emote is automatic from the pose */ }
  }

  drawTroll(g) {
    const tr = this.troll, a = tr.a;
    // fist-shadow grows as he leaps
    if (tr.state === 'windup' && a.z > 0) {
      g.save(); g.fillStyle = 'rgba(30,10,30,0.25)'; g.beginPath(); g.ellipse(tr.x, tr.y, 70 + a.z * 0.4, 22, 0, 0, TAU); g.fill(); g.restore();
    }
    a.draw(g, { scale: 1 });
  }

  drawHud(g) {
    const gems = this.pl.map((q) => q.gems);
    ui.scoreboard(g, this.players, gems, {
      avoidCenter: true, format: (v) => `${v}`,
      expr: this.pl.map((q) => (q.stun > 0 ? 'sad' : 'neutral')),
    });
    ui.timer(g, this.left);
    if (this.hint > 0) {
      g.save(); g.globalAlpha = clamp(this.hint, 0, 1);
      ui.panel(g, W / 2 - 520, 130, 1040, 66, { r: 33, fill: '#fff8ec' });
      ui.text(g, 'Grab gems!  Run from the growing shadow!', W / 2 - 60, 164, { size: 34, color: NAVY, stroke: false, weight: 700 });
      ui.glyph(g, 'a', W / 2 + 380, 164, 46, { pulse: true });
      ui.text(g, 'Dash', W / 2 + 415, 164, { size: 30, color: NAVY, stroke: false, align: 'left', weight: 700 });
      g.restore();
    }
    if (this.angerBanner > 0) {
      const t = 2.2 - this.angerBanner;
      ui.banner(g, 'GRUMPY TROLL!', t, { size: 120, y: 330, color: '#ff4d6d', tilt: -0.03 });
    }
  }
}
