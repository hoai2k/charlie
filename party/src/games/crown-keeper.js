// Crown Keeper - princess castle garden keep-away. Grab the crown and keep it
// on your head; everyone else A-dashes to bump it off. Most crown time wins.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, TAU, ease, placementsFromScores } from '../engine/util.js';

const NAVY = '#24163f';
const DURATION = 45;
const DOUBLE_AT = 35;                 // last 10 s count double
const ARENA = { x0: 160, y0: 290, x1: 1760, y1: 985 };
const C = { x: 960, y: 640 };         // fountain center
const FOUNTAIN_R = 104;
const HEDGES = [
  { x: 490, y: 417, w: 250, h: 46 },
  { x: 1310, y: 440, w: 46, h: 210 },
  { x: 1230, y: 807, w: 250, h: 46 },
  { x: 560, y: 790, w: 46, h: 210 },
];
const BEDS = [[285, 400, 100, 0], [1640, 405, 100, 1], [275, 905, 100, 2], [1650, 900, 100, 3]];
const WALK = 340, HOLD_MULT = 0.85, DASH_SPEED = 960, DASH_TIME = 0.18, DASH_CD = 1.3;

// Poses. WISH list (see report): 'crowned' (proud royal strut, chin up) and 'dash' (forward lunge, arms out).
const POSE = { dash: 'dash', bonked: 'hurt', dizzy: 'dizzy', win: 'cheer' };

const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export const meta = {
  id: 'crown-keeper',
  title: 'Crown Keeper',
  category: 'party',
  type: 'Keep-away',
  goal: 'Wear the crown for the most seconds - bump the holder to steal it!',
  controls: [['stick', 'Run around the garden'], ['a', 'Dash to bump the crown loose']],
  tips: ['The crown holder runs a little slower - and earns points.', 'Dash into the holder to knock the crown off!', 'The last 10 seconds count DOUBLE!'],
  music: 'bouncy',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    // lawn stripes
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#68c96d' : '#74d479'; g.fillRect(x + (i * w) / 12, y, w / 12 + 1, h); }
    // path + fountain
    g.fillStyle = '#f3e4c2'; g.fillRect(x, y + h * 0.42, w, h * 0.16); g.fillRect(x + w * 0.44, y, w * 0.12, h);
    const cx = x + w / 2, cy = y + h * 0.5;
    g.fillStyle = '#e9e1f3'; g.strokeStyle = NAVY; g.lineWidth = h * 0.02; g.beginPath(); g.arc(cx, cy, h * 0.24, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#7fd6ff'; g.beginPath(); g.arc(cx, cy, h * 0.19, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = h * 0.012; g.beginPath(); g.arc(cx, cy, h * 0.12 + Math.sin(t * 3) * 2, 0, TAU); g.stroke();
    // hedges
    g.fillStyle = '#2f8f4e'; g.strokeStyle = NAVY; g.lineWidth = h * 0.02;
    for (const [hx, hy, hw, hh2] of [[0.08, 0.1, 0.3, 0.1], [0.66, 0.78, 0.3, 0.1]]) { ui.roundRect(g, x + w * hx, y + h * hy, w * hw, h * hh2, h * 0.04); g.fill(); g.stroke(); }
    // flower beds
    for (const [fx0, fy0] of [[0.15, 0.78], [0.85, 0.2]]) for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff8ad0', '#ffe46b', '#c49bff'][i % 3]; g.beginPath(); g.arc(x + w * fx0 + Math.cos(i * 1.2) * h * 0.08, y + h * fy0 + Math.sin(i * 1.2) * h * 0.06, h * 0.025, 0, TAU); g.fill(); }
    // big crown floating over the fountain
    g.save(); g.translate(cx, cy - h * 0.1 + Math.sin(t * 3) * 3); g.rotate(Math.sin(t * 2) * 0.08);
    drawCrown(g, 0, 0, h * 0.3, 0.8, t);
    g.restore();
    for (let i = 0; i < 5; i++) { g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i * 1.7)); drawSpark(g, cx + Math.cos(i * 2.4) * h * 0.3, cy - h * 0.2 + Math.sin(i * 3.1) * h * 0.2, h * 0.04, '#fff6a8'); }
    g.globalAlpha = 1;
  },
};

function drawSpark(g, x, y, r, color) {
  g.save(); g.translate(x, y); g.fillStyle = color; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.25 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.restore();
}

/** A golden crown. (x, y) = bottom center of the band; w = width. */
function drawCrown(g, x, y, w, glowK = 0, t = 0) {
  g.save(); g.translate(x, y);
  const h = w * 0.78;
  if (glowK > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const r = w * (1.1 + 0.15 * Math.sin(t * 8));
    const gr = g.createRadialGradient(0, -h * 0.5, 2, 0, -h * 0.5, r);
    gr.addColorStop(0, `rgba(255,240,150,${0.9 * glowK})`); gr.addColorStop(1, 'rgba(255,200,60,0)');
    g.fillStyle = gr; g.fillRect(-r, -h * 0.5 - r, r * 2, r * 2); g.restore();
  }
  g.lineJoin = 'round'; g.lineWidth = Math.max(2.5, w * 0.07); g.strokeStyle = NAVY;
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.moveTo(-w / 2, 0); g.lineTo(-w / 2 - w * 0.04, -h * 0.85); g.lineTo(-w * 0.25, -h * 0.5); g.lineTo(0, -h); g.lineTo(w * 0.25, -h * 0.5); g.lineTo(w / 2 + w * 0.04, -h * 0.85); g.lineTo(w / 2, 0);
  g.closePath(); g.fill(); g.stroke();
  // band
  g.fillStyle = '#f2a900'; g.fillRect(-w / 2, -h * 0.22, w, h * 0.22); g.strokeRect(-w / 2, -h * 0.22, w, h * 0.22);
  // jewels
  const jewel = (jx, jy, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(jx, jy, r, 0, TAU); g.fill(); g.lineWidth = Math.max(1.5, w * 0.03); g.stroke(); };
  jewel(0, -h * 0.11, '#ff4d6d', w * 0.07); jewel(-w * 0.28, -h * 0.11, '#3fa7ff', w * 0.05); jewel(w * 0.28, -h * 0.11, '#36d17a', w * 0.05);
  jewel(0, -h * 0.97, '#ffffff', w * 0.045); jewel(-w / 2 - w * 0.04, -h * 0.87, '#ffffff', w * 0.04); jewel(w / 2 + w * 0.04, -h * 0.87, '#ffffff', w * 0.04);
  g.restore();
}

// --- the game --------------------------------------------------------------------
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.over = false;
    this.double = false;
    this.bannerT = -10;
    this.scale = n <= 4 ? 1.02 : n <= 6 ? 0.84 : 0.74;
    this.R = n <= 4 ? 34 : n <= 6 ? 31 : 28;
    this.units = this.players.map((p, i) => this.makeUnit(p, i));
    this.crown = { state: 'air', x: C.x, y: C.y, sx: C.x, sy: C.y, tx: C.x, ty: C.y, u: 0, z: 0, spin: 0, holder: -1 };
    this.waitCrown = true;           // hovering above the fountain until GO
    this.holder = -1;
    this.leader = -1;
    this.pickupT = 0;
    this.bg = this.buildBackground();
    this.popT = 0;
  }

  makeUnit(p, i) {
    const n = this.n;
    const ang = -Math.PI / 2 + (i / n) * TAU + 0.35;
    const x = C.x + Math.cos(ang) * 590, y = C.y + Math.sin(ang) * 270;
    const a = new Actor(p.charId, { scale: this.scale, x, y });
    a.facing = x < C.x ? 1 : -1; a.snap();
    return {
      p, i, a, x, y, vx: 0, vy: 0, aim: Math.atan2(C.y - y, C.x - x),
      dashT: 0, dashCd: 0, stun: 0, immune: 0, shield: 0, score: 0, secT: 0,
      crownAtt: null, brain: new Brain(p), seen: { x: C.x, y: C.y }, dashAt: -1, lapse: 0, flee: { x, y }, dashed: 0, bumps: 0,
    };
  }

  // --- crown ---------------------------------------------------------------------
  launchCrown(fx0, fy0, tx, ty, dur = 0.7) {
    const c = this.crown;
    c.state = 'air'; c.holder = -1; c.sx = fx0; c.sy = fy0; c.tx = tx; c.ty = ty; c.u = 0; c.dur = dur; c.x = fx0; c.y = fy0;
  }

  landingSpot(x, y, dirAng, dmin, dmax) {
    for (let k = 0; k < 14; k++) {
      const ang = dirAng + rand(-0.9, 0.9) * (k < 8 ? 1 : 3);
      const d = rand(dmin, dmax);
      const tx = clamp(x + Math.cos(ang) * d, ARENA.x0 + 50, ARENA.x1 - 50), ty = clamp(y + Math.sin(ang) * d, ARENA.y0 + 50, ARENA.y1 - 50);
      if (!this.blocked(tx, ty, 50)) return { x: tx, y: ty };
    }
    return { x: C.x + 200, y: C.y };
  }

  blocked(x, y, r) {
    if (Math.hypot(x - C.x, y - C.y) < FOUNTAIN_R + r) return true;
    for (const h of HEDGES) {
      const cx = clamp(x, h.x - h.w / 2, h.x + h.w / 2), cy = clamp(y, h.y - h.h / 2, h.y + h.h / 2);
      if (Math.hypot(x - cx, y - cy) < r) return true;
    }
    return false;
  }

  giveCrown(U) {
    const c = this.crown;
    c.state = 'held'; c.holder = U.i; this.holder = U.i;
    U.shield = 0.9;
    U.crownAtt = U.a.attach((g, info) => {
      const w = info.h * 0.36;
      g.save(); g.translate(info.head.x, info.head.y + w * 0.12); g.rotate(Math.sin(performance.now() / 260) * 0.05);
      drawCrown(g, 0, 0, w, this.double ? 1 : 0.0, this.t);
      g.restore();
    });
    U.a.playOnce('cheer', 0.6); U.a.squash(0.35); U.a.emote('sparkle', 1.0);
    sfx('collect', { step: 4 }); sfx('star'); sfx('magic', { vol: 0.5 });
    voice(U.p.charId, 'yay');
    const hp = U.a.anchor('head');
    particles.burst(hp.x, hp.y, { type: 'star', count: 10, colors: ['#ffd23f', '#fff6a8', '#ffffff'], speed: [200, 480] });
    particles.burst(hp.x, hp.y, { type: 'sparkle', count: 14, colors: ['#ffd23f', '#fff6a8'], speed: [100, 340], size: [14, 28] });
    particles.ring(U.x, U.y - 60, '#ffd23f', 120, 0.5);
    particles.popText(U.x, U.y - U.a.height - 40, 'Crown!', '#ffd23f', 54);
    if (!U.p.isAI) U.p.ctrl.rumble(0.4, 160);
    this.pickupT = this.t;
    if (this.api.camera) this.api.camera.punch(U.x, U.y - 60, 1.2, 0.35);
  }

  dropCrown(U, fromAng) {
    if (U.crownAtt) { U.a.detach(U.crownAtt); U.crownAtt = null; }
    const hp = U.a.anchor('head');
    const spot = this.landingSpot(U.x, U.y, fromAng, 190, 330);
    this.launchCrown(hp.x, hp.y, spot.x, spot.y, 0.75);
    this.holder = -1; U.immune = 1.0;
  }

  // --- frame -----------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    for (const U of this.units) { U.a.setPose('idle'); U.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    const left = DURATION - this.t;
    if (!this.double && this.t >= DOUBLE_AT) {
      this.double = true; this.bannerT = this.t;
      sfx('fanfare'); fx.flash('#fff3b0', 0.2);
    }
    if (this.waitCrown) {
      this.waitCrown = false;
      const spot = this.landingSpot(C.x, C.y, rand(TAU), 190, 230);
      this.launchCrown(C.x, C.y - 120, spot.x, spot.y, 0.9);
    }
    this.updateCrown(dt);
    if (this.double && this.api.camera) {
      const c = this.crown, H2 = this.holder >= 0 ? this.units[this.holder] : null;
      const fx0 = H2 ? H2.x : c.x, fy0 = H2 ? H2.y - 60 : c.y;
      this.api.camera.follow(lerp(W / 2, fx0, 0.45), lerp(H / 2, fy0, 0.45), 1.07, 1.6);
    }
    for (const U of this.units) this.updateUnit(U, dt);
    this.collide(dt);
    // scoring
    if (this.holder >= 0) {
      const U = this.units[this.holder];
      const k = this.double ? 2 : 1;
      U.score += dt * k;
      U.secT += dt;
      if (U.secT >= 1) { U.secT -= 1; particles.popText(U.x, U.y - U.a.height - 20, this.double ? '+2' : '+1', '#ffe46b', 38); }
      if (Math.random() < dt * 24) {
        const hp = U.a.anchor('head');
        particles.burst(hp.x + rand(-26, 26), hp.y + rand(-10, 30), { type: 'sparkle', count: 1, colors: ['#ffd23f', '#fff6a8', '#fff'], size: [10, 20], speed: [10, 60], life: [0.4, 0.8], gravity: 60 });
      }
    }
    const sc = this.units.map((u) => u.score);
    const m = Math.max(...sc);
    this.leader = m > 0.05 ? sc.indexOf(m) : -1;
    for (const U of this.units) U.a.update(dt);
    if (left <= 0 && !this.over) this.endGame();
  }
  postUpdate(dt) { this.t += dt * 0; this.updateCrown(dt); for (const U of this.units) U.a.update(dt); }

  updateCrown(dt) {
    const c = this.crown;
    c.spin += dt * 4;
    if (c.state === 'air') {
      c.u += dt / c.dur;
      const u = clamp(c.u, 0, 1);
      c.x = lerp(c.sx, c.tx, u); c.y = lerp(c.sy, c.ty, u);
      c.z = Math.sin(u * Math.PI) * 170 + (1 - u) * 0;
      if (c.u >= 1) {
        c.state = 'ground'; c.z = 0;
        sfx('bounce'); sfx('sparkle');
        particles.burst(c.x, c.y, { type: 'sparkle', count: 14, colors: ['#ffd23f', '#fff6a8', '#fff'], speed: [80, 320], size: [12, 26] });
        particles.burst(c.x, c.y + 10, { type: 'dust', count: 6 });
      }
    } else if (c.state === 'ground') {
      c.z = 14 + Math.sin(this.t * 4) * 6;
      if (Math.random() < dt * 8) particles.burst(c.x + rand(-30, 30), c.y - c.z - rand(0, 50), { type: 'sparkle', count: 1, colors: ['#fff6a8', '#fff'], size: [8, 16], speed: [5, 40], life: [0.5, 1], gravity: -20 });
    }
  }

  updateUnit(U, dt) {
    const p = U.p, a = U.a;
    const holder = this.holder === U.i;
    U.stun = Math.max(0, U.stun - dt); U.immune = Math.max(0, U.immune - dt); U.shield = Math.max(0, U.shield - dt);
    U.dashCd = Math.max(0, U.dashCd - dt); U.dashT = Math.max(0, U.dashT - dt);
    if (p.isAI) this.ai(U, dt);
    let mx = p.ctrl.x, my = p.ctrl.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    if (mag > 0.2) U.aim = Math.atan2(my, mx);
    if (U.stun > 0) { mx = my = 0; }
    // dash
    if (p.ctrl.pressed('a') && !holder && U.stun <= 0 && U.dashCd <= 0 && U.dashT <= 0) {
      U.dashT = DASH_TIME; U.dashCd = DASH_CD; U.dashed++;
      U.dvx = Math.cos(U.aim); U.dvy = Math.sin(U.aim);
      a.playOnce(POSE.dash, 0.3); a.squash(0.3);
      sfx('dash');
      particles.burst(U.x, U.y - 10, { type: 'dust', count: 6, colors: ['#fff'], angle: U.aim + Math.PI, spread: 0.5, speed: [100, 260] });
      if (!p.isAI) p.ctrl.rumble(0.2, 80);
    }
    const speed = WALK * (holder ? HOLD_MULT : 1);
    if (U.dashT > 0) { U.vx = U.dvx * DASH_SPEED; U.vy = U.dvy * DASH_SPEED; }
    else {
      U.vx = damp(U.vx, mx * speed, 11, dt); U.vy = damp(U.vy, my * speed, 11, dt);
    }
    U.x += U.vx * dt; U.y += U.vy * dt;
    // animation
    if (Math.abs(U.vx) > 20) a.facing = U.vx > 0 ? 1 : -1;
    if (U.dashT > 0 && Math.random() < dt * 40) particles.burst(U.x, U.y - 30, { type: 'spark', count: 1, colors: [p.color, '#fff'], size: [4, 8], speed: [10, 60], life: [0.2, 0.4] });
    if (U.stun > 0) { a.setPose(POSE.dizzy); }
    else { if (a.pose === POSE.dizzy) a.setPose('idle'); a.moveAnim(U.vx, U.vy, WALK, { run: Math.hypot(U.vx, U.vy) > WALK * 0.9 }); }
    a.x = U.x; a.y = U.y;
    a.scale = this.scale * depthScale(U.y, { top: ARENA.y0, near: ARENA.y1, far: 0.84, nearScale: 1.06 });
  }

  collide(dt) {
    const R = this.R;
    const U = this.units;
    // players vs players: soft push; dash bumps
    for (let i = 0; i < U.length; i++) {
      for (let j = i + 1; j < U.length; j++) {
        const A = U[i], B = U[j];
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.001;
        const min = R * 2;
        if (d < min + 6) {
          // dash bump?
          for (const [D, T] of [[A, B], [B, A]]) {
            if (D.dashT > 0 && D.dashT < DASH_TIME - 0.01) this.bump(D, T);
          }
        }
        if (d < min) {
          const push = (min - d) / 2, nx = dx / d, ny = dy / d;
          A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
        }
      }
    }
    for (const u of U) {
      // arena + obstacles
      u.x = clamp(u.x, ARENA.x0 + R, ARENA.x1 - R); u.y = clamp(u.y, ARENA.y0 + R, ARENA.y1 - R);
      let dx = u.x - C.x, dy = u.y - C.y, d = Math.hypot(dx, dy);
      if (d < FOUNTAIN_R + R) { const k = (FOUNTAIN_R + R) / (d || 1); u.x = C.x + dx * k; u.y = C.y + dy * k; }
      for (const h of HEDGES) {
        const cx = clamp(u.x, h.x - h.w / 2, h.x + h.w / 2), cy = clamp(u.y, h.y - h.h / 2, h.y + h.h / 2);
        dx = u.x - cx; dy = u.y - cy; d = Math.hypot(dx, dy);
        if (d < R) {
          if (d > 0.001) { u.x = cx + (dx / d) * R; u.y = cy + (dy / d) * R; }
          else { u.y = h.y - h.h / 2 - R; }
        }
      }
      u.a.x = u.x; u.a.y = u.y;
    }
    // crown pickup
    const c = this.crown;
    if (c.state === 'ground') {
      for (const u of U) {
        if (u.immune > 0 || u.stun > 0) continue;
        if (Math.hypot(u.x - c.x, u.y - c.y) < R + 46) { this.giveCrown(u); break; }
      }
    }
  }

  bump(D, T) {
    if (T.i === this.holder) {
      if (T.shield > 0 || T.hitCool > this.t) return;
      T.hitCool = this.t + 0.4;
      const ang = Math.atan2(T.y - D.y, T.x - D.x);
      this.dropCrown(T, ang);
      T.stun = 0.75; T.vx = Math.cos(ang) * 420; T.vy = Math.sin(ang) * 420;
      T.a.playOnce(POSE.bonked, 0.5); T.a.flash('#ffffff', 0.2); T.a.squash(0.4); T.a.emote('dizzy', 1.0);
      D.vx *= 0.3; D.vy *= 0.3; D.dashT = 0; D.bumps++;
      D.a.squash(0.3); D.a.playOnce('cheer', 0.5);
      const mx = (D.x + T.x) / 2, my = (D.y + T.y) / 2 - 60;
      particles.burst(mx, my, { type: 'star', count: 10, colors: ['#ffd23f', '#fff', '#ff9fd0'], speed: [200, 520], size: [16, 30] });
      particles.ring(mx, my, '#ffffff', 130, 0.35);
      particles.popText(mx, my - 50, 'BONK!', '#ff6fb1', 62);
      sfx('bonk'); sfx('hit'); voice(T.p.charId, 'ouch');
      fx.shake(this.n > 4 ? 6 : 12, 0.25); fx.hitstop(0.06);
      if (this.api.camera) this.api.camera.punch(mx, my + 20, 1.2, 0.35);
      if (!T.p.isAI) T.p.ctrl.rumble(0.8, 260);
      if (!D.p.isAI) D.p.ctrl.rumble(0.5, 140);
    } else if (!T.nudge || T.nudge < this.t) {
      T.nudge = this.t + 0.4;
      const ang = Math.atan2(T.y - D.y, T.x - D.x);
      T.vx += Math.cos(ang) * 260; T.vy += Math.sin(ang) * 260;
      T.a.squash(0.25); sfx('bonk', { vol: 0.4 });
      particles.burst((D.x + T.x) / 2, (D.y + T.y) / 2 - 50, { type: 'spark', count: 6, colors: ['#fff', D.p.color], speed: [100, 260] });
    }
  }

  // --- CPU ---------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const c = this.crown;
    // "what the CPU currently sees" refreshes at its reaction speed
    if (U.brain.ready(dt)) {
      U.brain.wait(rand(...prof.reaction) * 0.55);
      if (this.holder >= 0 && this.holder !== U.i) { const H2 = this.units[this.holder]; U.seen = { x: H2.x + H2.vx * 0.2 * lvl, y: H2.y + H2.vy * 0.2 * lvl }; }
      else U.seen = { x: c.state === 'air' ? c.tx : c.x, y: c.state === 'air' ? c.ty : c.y };
      if (this.holder === U.i) {
        // flee from the nearest chaser, using the fountain as cover
        let near = null, nd = 1e9;
        for (const o of this.units) { if (o === U) continue; const d = Math.hypot(o.x - U.x, o.y - U.y); if (d < nd) { nd = d; near = o; } }
        if (near) {
          let fx0 = U.x - near.x, fy0 = U.y - near.y; const fl = Math.hypot(fx0, fy0) || 1; fx0 /= fl; fy0 /= fl;
          let tx = U.x + fx0 * 260, ty = U.y + fy0 * 260;
          if (nd < 520) {
            // run circles around the fountain, away from the chaser
            const th = Math.atan2((U.y - C.y) / 235, (U.x - C.x) / 430), ph = Math.atan2((near.y - C.y) / 235, (near.x - C.x) / 430);
            const dir = Math.sin(th - ph) >= 0 ? 1 : -1;
            const a2 = th + dir * 0.75;
            const ox = C.x + Math.cos(a2) * 430, oy = C.y + Math.sin(a2) * 235;
            tx = lerp(tx, ox, 0.7); ty = lerp(ty, oy, 0.7);
          }
          // stay away from the walls
          const m = 170;
          if (U.x < ARENA.x0 + m) tx += 300; if (U.x > ARENA.x1 - m) tx -= 300;
          if (U.y < ARENA.y0 + m) ty += 300; if (U.y > ARENA.y1 - m) ty -= 300;
          U.flee = { x: tx + rand(-60, 60), y: ty + rand(-60, 60) };
        }
      }
    }
    let tx = U.seen.x, ty = U.seen.y, speedK = prof.speed;
    if (this.holder === U.i) { tx = U.flee.x; ty = U.flee.y; speedK = [0.8, 0.92, 1][lvl]; }
    else if (U.immune > 0 || U.stun > 0) { tx = c.x + Math.cos(U.i * 2) * 180; ty = c.y + Math.sin(U.i * 2) * 180; speedK *= 0.5; }
    const dx = tx - U.x, dy = ty - U.y, d = Math.hypot(dx, dy);
    let a = Math.atan2(dy, dx) + Math.sin(this.t * 2.3 + U.i * 1.9) * prof.aimError * 0.45;
    // dodge hedges / fountain a bit: steer around by sampling
    a = this.avoid(U, a);
    const k = this.holder === U.i ? speedK : clamp(d / 50, 0, 1) * speedK;
    p.ctrl.move(Math.cos(a) * k, Math.sin(a) * k);
    // dash at the holder
    if (this.holder >= 0 && this.holder !== U.i && U.stun <= 0 && U.dashCd <= 0 && U.dashT <= 0) {
      const H2 = this.units[this.holder];
      const hd = Math.hypot(H2.x - U.x, H2.y - U.y);
      const toH = Math.atan2(H2.y - U.y, H2.x - U.x);
      const diff = Math.abs(Math.atan2(Math.sin(toH - U.aim), Math.cos(toH - U.aim)));
      const range = [200, 230, 260][lvl];
      if (hd < range && diff < [0.5, 0.4, 0.3][lvl] && H2.shield <= 0) {
        if (U.dashAt < 0) U.dashAt = this.t + reactionTime(p) * [1.1, 0.7, 0.4][lvl] + (chance([0.3, 0.1, 0]) ? 0.8 : 0);
        if (this.t >= U.dashAt) { U.aim = toH + rand(-1, 1) * prof.aimError * 0.3; p.ctrl.press('a'); U.dashAt = -1; }
      } else if (hd > range * 1.5) U.dashAt = -1;
    }
  }

  avoid(U, a) {
    // look ahead 90px; if blocked, rotate to the nearer free direction
    const probe = (ang) => this.blocked(U.x + Math.cos(ang) * 90, U.y + Math.sin(ang) * 90, this.R + 6);
    if (!probe(a)) return a;
    for (let k = 1; k <= 6; k++) {
      const off = k * 0.35;
      if (!probe(a + off)) return a + off;
      if (!probe(a - off)) return a - off;
    }
    return a;
  }

  endGame() {
    this.over = true;
    const scores = this.units.map((u) => Math.round(u.score * 10));
    const placements = placementsFromScores(scores);
    const stats = this.units.map((u) => `${u.score.toFixed(1)} s`);
    sfx('whistle');
    for (const u of this.units) u.a.playOnce(placements[u.i] === 1 ? 'celebrate' : 'idle', 1);
    const fu = this.holder >= 0 ? this.units[this.holder] : this.units[placements.indexOf(1)];
    this.api.finish({ placements, stats, focus: { x: fu.x, y: fu.y - fu.a.height / 2, zoom: 1.35 } });
  }

  // --- drawing -------------------------------------------------------------------------
  buildBackground() {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    // sky behind the castle wall
    ui.sky(g, '#9fd8ff', '#e9f6ff', 300);
    ui.cloud(g, 260, 90, 0.9, '#fff', 0.9); ui.cloud(g, 1500, 70, 0.7, '#fff', 0.9);
    // castle backdrop
    const wallY = 250;
    g.fillStyle = '#f2c6dc'; g.strokeStyle = NAVY; g.lineWidth = 6; g.lineJoin = 'round';
    g.beginPath(); g.rect(0, 160, W, wallY - 160); g.fill();
    g.fillStyle = '#e8b2cd';
    for (let x = 0; x < W; x += 60) { g.fillRect(x + 6, 144, 36, 24); }
    g.fillStyle = '#e4a8c6'; g.fillRect(0, 205, W, 8);
    const tower = (x, h2, w2) => {
      g.fillStyle = '#f7d4e6'; g.beginPath(); g.rect(x - w2 / 2, wallY - h2, w2, h2); g.fill(); g.stroke();
      g.fillStyle = '#9b5cff'; g.beginPath(); g.moveTo(x - w2 * 0.62, wallY - h2); g.lineTo(x, wallY - h2 - w2 * 1.15); g.lineTo(x + w2 * 0.62, wallY - h2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffd84d'; g.beginPath(); g.arc(x, wallY - h2 * 0.62, w2 * 0.14, Math.PI, 0); g.rect(x - w2 * 0.14, wallY - h2 * 0.62, w2 * 0.28, w2 * 0.28); g.fill(); g.stroke();
      g.strokeStyle = NAVY; g.beginPath(); g.moveTo(x, wallY - h2 - w2 * 1.15); g.lineTo(x, wallY - h2 - w2 * 1.6); g.stroke();
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(x, wallY - h2 - w2 * 1.6); g.lineTo(x + 34, wallY - h2 - w2 * 1.45); g.lineTo(x, wallY - h2 - w2 * 1.3); g.closePath(); g.fill(); g.stroke();
    };
    tower(210, 210, 110); tower(960, 250, 140); tower(1710, 210, 110); tower(560, 150, 80); tower(1360, 150, 80);
    // gate
    g.fillStyle = '#7a4fc2'; g.beginPath(); g.moveTo(880, wallY); g.lineTo(880, wallY - 80); g.arc(960, wallY - 80, 80, Math.PI, 0); g.lineTo(1040, wallY); g.closePath(); g.fill(); g.stroke();
    // lawn
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? '#62c568' : '#6fd075'; g.fillRect(i * 48, wallY, 49, H - wallY); }
    g.fillStyle = 'rgba(30,90,50,0.35)'; g.fillRect(0, wallY, W, 14);
    // paths: cross + ring around the fountain
    g.fillStyle = '#f3e4c2';
    g.fillRect(ARENA.x0 - 30, C.y - 62, ARENA.x1 - ARENA.x0 + 60, 124);
    g.fillRect(C.x - 62, ARENA.y0 - 30, 124, ARENA.y1 - ARENA.y0 + 60);
    g.beginPath(); g.arc(C.x, C.y, FOUNTAIN_R + 90, 0, TAU); g.fill();
    g.fillStyle = 'rgba(200,170,120,0.45)';
    for (let i = 0; i < 160; i++) { const px = ARENA.x0 + hh(i) * (ARENA.x1 - ARENA.x0), py = ARENA.y0 + hh(i + 77) * (ARENA.y1 - ARENA.y0); if (Math.abs(py - C.y) < 58 || Math.abs(px - C.x) < 58 || Math.hypot(px - C.x, py - C.y) < FOUNTAIN_R + 86) { g.beginPath(); g.arc(px, py, 2 + hh(i + 3) * 3, 0, TAU); g.fill(); } }
    // flower beds
    for (const [bx, by, br, v] of BEDS) {
      g.fillStyle = '#7a5a3a'; g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.ellipse(bx, by, br * 1.1, br * 0.82, 0, 0, TAU); g.fill(); g.stroke();
      const cols = [['#ff8ad0', '#ffe46b'], ['#c49bff', '#fff'], ['#ffe46b', '#ff9a3c'], ['#8fd0ff', '#ff8ad0']][v];
      for (let i = 0; i < 26; i++) {
        const a2 = hh(i + v * 40) * TAU, rr = Math.sqrt(hh(i + v * 40 + 9)) * br * 0.95;
        const fx0 = bx + Math.cos(a2) * rr * 1.0, fy0 = by + Math.sin(a2) * rr * 0.72;
        g.fillStyle = '#2f9e5a'; g.beginPath(); g.arc(fx0, fy0 + 6, 7, 0, TAU); g.fill();
        g.fillStyle = cols[i % 2]; g.beginPath(); g.arc(fx0, fy0, 9, 0, TAU); g.fill();
        g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(fx0, fy0, 3.5, 0, TAU); g.fill();
      }
    }
    // border hedge wall
    const b = 62;
    const hedge = (x, y, w2, h2) => {
      g.fillStyle = NAVY; ui.roundRect(g, x - 5, y - 5, w2 + 10, h2 + 10, 26); g.fill();
      const gr = g.createLinearGradient(0, y, 0, y + h2); gr.addColorStop(0, '#46b866'); gr.addColorStop(1, '#2a8a4c');
      g.fillStyle = gr; ui.roundRect(g, x, y, w2, h2, 22); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < (w2 * h2) / 500; i++) { g.beginPath(); g.arc(x + hh(i * 3 + x) * w2, y + hh(i * 7 + y) * h2, 4 + hh(i) * 6, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(0,50,20,0.18)'; for (let i = 0; i < (w2 * h2) / 700; i++) { g.beginPath(); g.arc(x + hh(i * 5 + 3) * w2, y + hh(i * 11 + 1) * h2, 3 + hh(i + 4) * 5, 0, TAU); g.fill(); }
    };
    hedge(ARENA.x0 - b, ARENA.y1 + 4, ARENA.x1 - ARENA.x0 + 2 * b, 80);                // bottom
    hedge(ARENA.x0 - b, ARENA.y0 - b + 4, b, ARENA.y1 - ARENA.y0 + b + 80);             // left
    hedge(ARENA.x1, ARENA.y0 - b + 4, b, ARENA.y1 - ARENA.y0 + b + 80);                 // right
    hedge(ARENA.x0 - b, ARENA.y0 - b + 4, ARENA.x1 - ARENA.x0 + 2 * b, b - 8);        // top
    // corner topiary balls with bows
    for (const [tx, ty] of [[ARENA.x0 - 30, ARENA.y0 - 30], [ARENA.x1 + 30, ARENA.y0 - 30], [ARENA.x0 - 30, ARENA.y1 + 30], [ARENA.x1 + 30, ARENA.y1 + 30]]) {
      g.fillStyle = NAVY; g.beginPath(); g.arc(tx, ty, 42, 0, TAU); g.fill();
      g.fillStyle = '#3cb35d'; g.beginPath(); g.arc(tx, ty, 37, 0, TAU); g.fill();
      g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(tx - 14, ty - 4, 9, 0, TAU); g.arc(tx + 14, ty - 4, 9, 0, TAU); g.fill(); g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(tx, ty - 4, 7, 0, TAU); g.fill();
    }
    return cv;
  }

  drawHedge(g, h) {
    const x = h.x - h.w / 2, y = h.y - h.h / 2, up = 46;
    g.save();
    g.fillStyle = 'rgba(20,50,30,0.25)'; ui.roundRect(g, x + 8, y + 10, h.w, h.h, 16); g.fill();
    g.fillStyle = NAVY; ui.roundRect(g, x - 5, y - up - 5, h.w + 10, h.h + up + 10, 24); g.fill();
    const gr = g.createLinearGradient(0, y - up, 0, y + h.h); gr.addColorStop(0, '#58cc76'); gr.addColorStop(0.6, '#3cb35d'); gr.addColorStop(1, '#27854a');
    g.fillStyle = gr; ui.roundRect(g, x, y - up, h.w, h.h + up, 20); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < (h.w * (h.h + up)) / 420; i++) { g.beginPath(); g.arc(x + hh(i * 3 + h.x) * h.w, y - up + hh(i * 7 + h.y) * (h.h + up), 4 + hh(i) * 5, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(0,50,20,0.2)';
    for (let i = 0; i < (h.w * (h.h + up)) / 600; i++) { g.beginPath(); g.arc(x + hh(i * 5 + 3 + h.x) * h.w, y - up + hh(i * 11 + 1) * (h.h + up), 3 + hh(i + 4) * 5, 0, TAU); g.fill(); }
    // little pink blossoms
    g.fillStyle = '#ff9ad0';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x + hh(i + h.x) * h.w, y - up + 12 + hh(i + h.y) * (h.h + up - 24), 5, 0, TAU); g.fill(); }
    g.restore();
  }

  drawFountainBase(g) {
    g.save(); g.translate(C.x, C.y);
    g.fillStyle = 'rgba(20,50,30,0.25)'; g.beginPath(); g.ellipse(8, 12, FOUNTAIN_R + 14, FOUNTAIN_R + 8, 0, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.arc(0, 0, FOUNTAIN_R + 10, 0, TAU); g.fill();
    g.fillStyle = '#ece4f6'; g.beginPath(); g.arc(0, 0, FOUNTAIN_R + 3, 0, TAU); g.fill();
    const wg = g.createRadialGradient(0, 0, 10, 0, 0, FOUNTAIN_R - 12);
    wg.addColorStop(0, '#b8ecff'); wg.addColorStop(1, '#5cc4f2');
    g.fillStyle = wg; g.beginPath(); g.arc(0, 0, FOUNTAIN_R - 12, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 4;
    for (let k = 0; k < 3; k++) { const r = ((this.t * 40 + k * 28) % 84) + 10; g.globalAlpha = 1 - r / 94; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
    g.globalAlpha = 1;
    g.restore();
  }

  drawFountainSpout(g) {
    g.save(); g.translate(C.x, C.y);
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, -8, 38, 24, 0, 0, TAU); g.fill();
    g.fillStyle = '#ece4f6'; g.beginPath(); g.ellipse(0, -10, 33, 20, 0, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.fillRect(-14, -62, 28, 54);
    g.fillStyle = '#d9cdee'; g.fillRect(-10, -60, 20, 52);
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, -64, 30, 16, 0, 0, TAU); g.fill();
    g.fillStyle = '#ece4f6'; g.beginPath(); g.ellipse(0, -66, 26, 12, 0, 0, TAU); g.fill();
    // water arcs
    g.strokeStyle = 'rgba(170,230,255,0.95)'; g.lineWidth = 6; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + this.t * 0.5, off = (this.t * 1.4 + i * 0.37) % 1;
      g.globalAlpha = 0.9; g.beginPath(); g.moveTo(0, -78);
      g.quadraticCurveTo(Math.cos(a) * 46, -112 + Math.sin(a) * 6, Math.cos(a) * 74, -52 + Math.sin(a) * 18 + off * 6); g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
  }

  draw(g) {
    const bg = art('bg/crown-keeper');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(this.bg, 0, 0);
    this.drawFountainBase(g);
    // crown shadow on the ground
    const c = this.crown;
    if (c.state === 'ground' || c.state === 'air') {
      const wait = this.waitCrown && c.state === 'air';
      const cx = wait ? C.x : c.x, cy = wait ? C.y - 150 : c.y;
      const z = wait ? 0 : c.z;
      g.save(); g.globalAlpha = 0.3; g.fillStyle = '#10301c';
      g.beginPath(); g.ellipse(cx, wait ? C.y : cy, 34 - z * 0.06, 12 - z * 0.02, 0, 0, TAU); g.fill(); g.restore();
    }
    // y-sorted scene
    const list = [];
    for (const h of HEDGES) list.push({ y: h.y + h.h / 2, fn: () => this.drawHedge(g, h) });
    list.push({ y: C.y + 4, fn: () => this.drawFountainSpout(g) });
    for (const U of this.units) list.push({ y: U.y, fn: () => this.drawUnit(g, U) });
    if (this.holder < 0) list.push({ y: this.crownDrawY(), fn: () => this.drawLooseCrown(g) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();
  }

  crownDrawY() { const c = this.crown; return this.waitCrown ? C.y + 100 : c.y + 2 + (c.state === 'air' ? 0 : 0); }

  drawLooseCrown(g) {
    const c = this.crown;
    const wait = this.waitCrown && c.state === 'air';
    const x = wait ? C.x : c.x, y = wait ? C.y - 170 + Math.sin(this.t0 * 3) * 8 : c.y - c.z;
    const glowK = this.double ? 1 : 0.55;
    g.save(); g.translate(x, y);
    // light column + sparkle ring
    if (!wait && c.state === 'ground') {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(0, 20, 5, 0, 20, 90);
      gr.addColorStop(0, 'rgba(255,240,150,0.55)'); gr.addColorStop(1, 'rgba(255,220,100,0)');
      g.fillStyle = gr; g.fillRect(-90, -70, 180, 180); g.restore();
    }
    g.rotate(Math.sin(c.spin) * 0.15 + (c.state === 'air' ? c.spin * 1.5 : 0));
    drawCrown(g, 0, 22, 78, glowK, this.t);
    g.restore();
    if (!wait && c.state === 'ground') {
      for (let i = 0; i < 4; i++) {
        const a = this.t * 2 + (i * TAU) / 4, r = 54 + Math.sin(this.t * 3 + i) * 6;
        g.save(); g.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 5 + i * 2); drawSpark(g, x + Math.cos(a) * r, y - 10 + Math.sin(a) * r * 0.5, 9, '#fff6a8'); g.restore();
      }
    }
  }

  drawUnit(g, U) {
    const a = U.a, p = U.p;
    // holder aura on the ground
    if (this.holder === U.i) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(U.x, U.y, 10, U.x, U.y, 90);
      gr.addColorStop(0, `rgba(255,224,100,${this.double ? 0.8 : 0.5})`); gr.addColorStop(1, 'rgba(255,200,60,0)');
      g.fillStyle = gr; g.fillRect(U.x - 100, U.y - 70, 200, 140); g.restore();
    }
    const blink = U.shield > 0 && Math.floor(this.t * 16) % 2 === 0;
    g.save();
    if (blink) g.globalAlpha = 0.6;
    a.draw(g, { ring: p.color });
    g.restore();
    // dash cooldown arc
    if (U.dashCd > 0 && this.holder !== U.i) {
      const r = Math.max(46, a.width * 0.42);
      g.save(); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineCap = 'round';
      g.beginPath(); g.ellipse(U.x, U.y + 2, r, r * 0.3, 0, 0, TAU * (1 - U.dashCd / DASH_CD)); g.stroke(); g.restore();
    }
    // tag: first seconds, and always a tiny one over holder? (tags only early)
    if (this.t < 5) {
      const sc = this.n > 5 ? 0.75 : 0.95;
      g.save(); g.translate(U.x, U.y - a.height - 34); g.scale(sc, sc); ui.playerTag(g, p, 0, 0); g.restore();
    } else if (this.holder === U.i) {
      g.save(); g.translate(U.x, U.y - a.height - 60); const sc = this.n > 5 ? 0.7 : 0.85; g.scale(sc, sc);
      ui.playerTag(g, p, 0, 0); g.restore();
    }
  }

  drawHUD(g) {
    const n = this.n;
    const scores = this.units.map((u) => u.score);
    ui.scoreboard(g, this.players, scores, { y: 22, format: (v) => `${v.toFixed(1)}s` });
    // crown on the leader's chip (+ holder gets a glowing one)
    const chipW = Math.min(260, (W - 120) / n - 16);
    const total = n * chipW + (n - 1) * 16;
    const x0 = (W - total) / 2;
    const crownChip = (i, glowK) => {
      const cx = x0 + i * (chipW + 16) + chipW - 26, cy = 36;
      g.save(); g.translate(cx, cy); g.rotate(0.28); drawCrown(g, 0, 0, 44, glowK, this.t); g.restore();
    };
    if (this.leader >= 0) crownChip(this.leader, 0.0);
    if (this.holder >= 0 && this.holder !== this.leader) {
      const cx = x0 + this.holder * (chipW + 16) + chipW / 2;
      g.save(); g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx - 14, 14); g.lineTo(cx + 14, 14); g.lineTo(cx, 28); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
    ui.timer(g, DURATION - this.t, W / 2, 150);
    if (this.double) {
      const k = this.t - this.bannerT;
      const pulse = 1 + Math.sin(this.t * 8) * 0.04;
      g.save(); g.translate(W / 2 + 190, 150); g.scale(pulse, pulse);
      ui.panel(g, -110, -34, 220, 68, { r: 34, fill: '#ffd23f' });
      ui.text(g, 'x2 TIME!', 0, 3, { size: 40, color: NAVY, stroke: false, weight: 800 });
      g.restore();
      if (k < 1.8) ui.banner(g, 'DOUBLE POINTS!', k, { size: 130, y: H / 2 - 120 });
    }
    // hint for the first few seconds
    if (this.t < 5) {
      const a = this.t < 4 ? 1 : 1 - (this.t - 4);
      g.save(); g.globalAlpha = a;
      ui.panel(g, W / 2 - 480, 1000, 960, 66, { r: 33 });
      ui.glyph(g, 'a', W / 2 - 440, 1033, 48, { pulse: true });
      ui.text(g, 'Dash into whoever wears the crown!', W / 2 + 30, 1033, { size: 36, color: NAVY, stroke: false, maxWidth: 800 });
      g.restore();
    }
  }
}
