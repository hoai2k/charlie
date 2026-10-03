import { drawNpcSprite } from '../engine/npc-art.js';
// Fairy Count - moonlit garden counting game. Glowing fairies of several
// colors zip across the sky; a question tells you which color to count. Then
// everybody picks a number (up/down) and locks it in with A. The counted
// fairies fly back one by one so the whole room can count along.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, host, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { drawHost } from '../engine/host.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, TAU, ease, placementsFromScores } from '../engine/util.js';

const NAVY = '#24163f';
const ROUNDS = 3;
const GUESS_TIME = 10;
const MAX_NUM = 15;

// Poses: 'look-up' while fairies fly, 'count' while picking (engine falls
// back to look-around/think for characters without those frames).
const POSE = { watch: 'look-up', pick: 'count', locked: 'ready', exact: 'celebrate', close: 'cheer', miss: 'pout' };

const FAIRY_COLORS = [
  { id: 'pink', name: 'PINK', c: '#ff6fb1', hair: '#d93d86', glow: '#ff9ad0' },
  { id: 'blue', name: 'BLUE', c: '#4db8ff', hair: '#1f84d6', glow: '#8fd6ff' },
  { id: 'yellow', name: 'YELLOW', c: '#ffe14a', hair: '#d9a400', glow: '#fff09a' },
  { id: 'green', name: 'GREEN', c: '#59e07a', hair: '#23a047', glow: '#a3f5b6' },
  { id: 'purple', name: 'PURPLE', c: '#a06bff', hair: '#6c3bd6', glow: '#cdb0ff' },
  { id: 'orange', name: 'ORANGE', c: '#ff9a3c', hair: '#d9661a', glow: '#ffc78a' },
];

const ROUND_CFG = [
  { colors: 3, tMin: 3, tMax: 5, dMin: 4, dMax: 6, dur: 6.5, cross: [3.3, 4.1], hide: 0 },
  { colors: 4, tMin: 5, tMax: 7, dMin: 6, dMax: 8, dur: 7.5, cross: [2.8, 3.6], hide: 0.25 },
  { colors: 5, tMin: 7, tMax: 9, dMin: 9, dMax: 11, dur: 8.5, cross: [2.4, 3.2], hide: 0.35 },
];
const FLOWERS = [
  { x: 330, y: 610, c: '#ff8ad0', c2: '#ffd1ec' },
  { x: 960, y: 560, c: '#ffe46b', c2: '#fff6bb' },
  { x: 1590, y: 630, c: '#8fd0ff', c2: '#d8efff' },
];
const SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26];

const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (t) => t * t * (3 - 2 * t);

// glow sprite cache (additive halos)
const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color + '88'); gr.addColorStop(1, color + '00');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
  }
  return c;
}
function glow(g, x, y, r, color, alpha = 1) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
  g.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); g.restore();
}

/** One procedural fairy: tiny body, sparkly wings, halo. (x, y) = body center. */
function drawFairy(g, x, y, s, col, t, dir = 1, o = {}) {
  if (drawNpcSprite(g, 'garden-fairy-' + col.id, x, y + 25 * s, 64 * s, t, {
    pose: 'fly', facing: dir, alpha: o.alpha ?? 1, rotation: o.rot || 0,
  })) return;

  g.save(); g.translate(x, y); g.scale(s * dir, s);
  if (o.rot) g.rotate(o.rot);
  glow(g, 0, 0, 62, col.glow, o.glowAlpha ?? 0.9);
  const flap = Math.sin(t * 30) * 0.45;
  g.lineJoin = 'round';
  // wings (behind)
  for (const [ang, w, h2, a] of [[-0.9, 26, 13, 0.75], [-0.1, 20, 10, 0.6]]) {
    for (const side of [0, 1]) {
      g.save(); g.translate(-3, -4); g.rotate(ang + (side ? flap : flap * 0.8) - 0.2 + side * 0.15);
      g.globalAlpha = a * (o.alpha ?? 1);
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.strokeStyle = col.c; g.lineWidth = 2.2;
      g.beginPath(); g.ellipse(-w * 0.55, -h2 * 0.2, w, h2, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = col.glow + 'aa'; g.beginPath(); g.ellipse(-w * 0.45, -h2 * 0.2, w * 0.5, h2 * 0.5, 0, 0, TAU); g.fill();
      g.restore();
    }
  }
  g.globalAlpha = o.alpha ?? 1;
  // dress
  g.fillStyle = col.c; g.strokeStyle = NAVY; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(-5, -3); g.lineTo(6, -3); g.lineTo(11, 15); g.quadraticCurveTo(0, 20, -10, 15); g.closePath(); g.fill(); g.stroke();
  // legs
  g.strokeStyle = NAVY; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(-3, 16); g.lineTo(-4, 24 + Math.sin(t * 9) * 1.5); g.moveTo(4, 16); g.lineTo(5, 24 - Math.sin(t * 9) * 1.5); g.stroke();
  // arm with a wand sparkle
  g.beginPath(); g.moveTo(5, 0); g.lineTo(16, -6 + Math.sin(t * 7) * 3); g.stroke();
  // head + hair
  g.fillStyle = col.hair; g.beginPath(); g.arc(0, -13, 11, 0, TAU); g.fill(); g.strokeStyle = NAVY; g.lineWidth = 2.6; g.stroke();
  g.fillStyle = '#ffe3cf'; g.beginPath(); g.arc(1, -11, 8.4, 0, TAU); g.fill();
  g.fillStyle = col.hair; g.beginPath(); g.arc(0, -17, 9.5, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(4, -11, 1.6, 0, TAU); g.arc(-1, -11, 1.6, 0, TAU); g.fill();
  g.fillStyle = '#ff8fb0'; g.beginPath(); g.arc(6, -8, 1.8, 0, TAU); g.fill();
  g.restore();
}

function drawFlowerHead(g, x, y, r, f, t, phase = 0) {
  glow(g, x, y, r * 1.9, f.c, 0.55 + 0.2 * Math.sin(t * 2 + phase));
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 0.7 + phase) * 0.05);
  g.lineJoin = 'round'; g.lineWidth = Math.max(3, r * 0.06); g.strokeStyle = NAVY;
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate((i / 8) * TAU);
    g.fillStyle = i % 2 ? f.c : f.c2;
    g.beginPath(); g.ellipse(r * 0.62, 0, r * 0.52, r * 0.3, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(0, 0, r * 0.33, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffb347'; g.beginPath(); g.arc(-r * 0.08, -r * 0.08, r * 0.14, 0, TAU); g.fill();
  g.restore();
}

export const meta = {
  id: 'fairy-count',
  title: 'Fairy Count',
  category: 'party',
  type: 'Counting',
  goal: 'Count the fairies of ONE color, then pick the right number!',
  controls: [['dpad', 'Pick your number up and down'], ['a', 'Lock in your answer']],
  tips: ['Only count the color the question asks for.', 'Some fairies hide behind flowers - keep counting!', 'Exact answer = 3 points. One off = 1 point.'],
  music: 'chill',
  duration: '3 rounds',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#190f47'); gr.addColorStop(0.6, '#5a3392'); gr.addColorStop(1, '#e58bb3');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = '#fff';
    for (let i = 0; i < 18; i++) { g.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t * 2 + i)); g.beginPath(); g.arc(x + hh(i) * w, y + hh(i + 40) * h * 0.7, 1.5 + hh(i + 3) * 2.5, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    // moon
    glow(g, x + w * 0.8, y + h * 0.22, h * 0.34, '#fff3c0', 0.9);
    g.fillStyle = '#fff8d8'; g.beginPath(); g.arc(x + w * 0.8, y + h * 0.22, h * 0.13, 0, TAU); g.fill();
    // hills + glowing flowers
    g.fillStyle = '#2a1f66'; g.beginPath(); g.moveTo(x, y + h); g.quadraticCurveTo(x + w * 0.3, y + h * 0.62, x + w * 0.6, y + h * 0.82); g.quadraticCurveTo(x + w * 0.85, y + h * 0.7, x + w, y + h * 0.8); g.lineTo(x + w, y + h); g.fill();
    for (let i = 0; i < 5; i++) {
      const fx0 = x + w * (0.12 + i * 0.19), fy0 = y + h * (0.86 + (i % 2) * 0.05);
      drawFlowerHead(g, fx0, fy0, h * 0.07, [FLOWERS[0], FLOWERS[1], FLOWERS[2]][i % 3], t, i);
    }
    // fairies
    FAIRY_COLORS.slice(0, 4).forEach((c, i) => {
      const fxp = x + w * (0.2 + i * 0.2) + Math.sin(t * 1.5 + i) * 6, fyp = y + h * (0.28 + (i % 2) * 0.22) + Math.cos(t * 2 + i) * 7;
      drawFairy(g, fxp, fyp, h / 150, c, t + i, i % 2 ? -1 : 1);
    });
    // number bubble
    g.save(); g.translate(x + w * 0.5, y + h * 0.62);
    g.fillStyle = '#fff'; g.strokeStyle = '#ff6fb1'; g.lineWidth = h * 0.03;
    g.beginPath(); g.arc(0, 0, h * 0.14, 0, TAU); g.fill(); g.stroke();
    ui.text(g, '3', 0, h * 0.01, { size: h * 0.2, color: NAVY, stroke: false, weight: 800 });
    g.restore();
  },
};

// --- the game -------------------------------------------------------------
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.round = -1;
    this.phase = 'intro';
    this.pt = 0;
    this.points = this.players.map(() => 0);
    this.exacts = this.players.map(() => 0);
    this.totalErr = this.players.map(() => 0);
    this.lastTarget = null;
    this.over = false;
    const spacing = Math.min(300, (W - 160) / n);
    const sc = n <= 3 ? 1.1 : n <= 5 ? 0.95 : 0.72;
    this.actors = this.players.map((p, i) => {
      const a = new Actor(p, { scale: sc, x: W / 2 + (i - (n - 1) / 2) * spacing, y: 1034 });
      a.snap(); return a;
    });
    this.choice = this.players.map(() => ({ v: 0, locked: false, state: 'pick', bounce: 0 }));
    this.ai = this.players.map(() => null);
    this.fireflies = Array.from({ length: 26 }, (_, i) => ({ x: hh(i) * W, y: 300 + hh(i + 9) * 650, s: 0.4 + hh(i + 4) * 0.8, ph: hh(i + 7) * TAU }));
    this.fairies = [];
    this.nextRound();
  }

  // --- rounds ---------------------------------------------------------------
  nextRound() {
    this.round++;
    const cfg = ROUND_CFG[this.round];
    this.cfg = cfg;
    // pick colors
    let target;
    do { target = pick(FAIRY_COLORS.slice(0, 5)); } while (target === this.lastTarget && Math.random() < 0.9);
    this.lastTarget = target;
    this.target = target;
    const others = shuffle(FAIRY_COLORS.filter((c) => c !== target)).slice(0, cfg.colors - 1);
    const T = randInt(cfg.tMin, cfg.tMax), D = randInt(cfg.dMin, cfg.dMax);
    this.trueCount = T;
    const N = T + D;
    const isTarget = shuffle([...Array(T).fill(true), ...Array(D).fill(false)]);
    const window_ = cfg.dur - 2.2;
    this.fairies = [];
    let dIdx = 0;
    for (let i = 0; i < N; i++) {
      const dir = chance(0.5) ? 1 : -1;
      const dur = rand(...cfg.cross);
      const hide = chance(cfg.hide);
      const x0 = dir > 0 ? -90 : W + 90, x1 = dir > 0 ? W + 90 : -90;
      const f = {
        target: isTarget[i], col: isTarget[i] ? target : others[dIdx++ % others.length],
        t0: ((i + rand(0.05, 0.95)) / N) * window_, dur, x0, x1, dir,
        y0: rand(300, 700), y1: rand(300, 700), amp: rand(25, 80), wob: rand(1.2, 2.6), ph: rand(TAU),
        hide, pauseLen: 0, pauseU: 0.5, hy: 0, trail: [], trailT: 0, seed: rand(100),
      };
      if (hide) {
        const fl = pick(FLOWERS);
        f.pauseLen = rand(0.7, 1.1); f.dur += f.pauseLen;
        f.pauseU = clamp((fl.x - x0) / (x1 - x0), 0.15, 0.85); f.hy = fl.y;
      }
      this.fairies.push(f);
    }
    this.watchLen = Math.max(...this.fairies.map((f) => f.t0 + f.dur)) + 0.3;
    for (const c of this.choice) { c.v = 0; c.locked = false; c.state = 'pick'; c.bounce = 0; c.ans = 0; }
    this.setPhase('intro');
    this.rv = null;
    for (const a of this.actors) { a.setPose('idle'); }
    host(this.round === ROUNDS - 1 ? 'final-round' : 'next-round');
  }

  setPhase(ph) { this.phase = ph; this.pt = 0; }

  startGuess() {
    this.setPhase('guess');
    for (const a of this.actors) a.setPose(POSE.pick);
    this.players.forEach((p, i) => {
      if (!p.isAI) { this.ai[i] = null; return; }
      const prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 0, 0, 2);
      const T = this.trueCount;
      // error profile by difficulty
      const r = Math.random();
      const [pExact, pOne] = [[0.3, 0.76], [0.5, 0.92], [0.72, 0.98]][lvl];
      let err = r < pExact ? 0 : r < pOne ? 1 : 2;
      if (err) err *= chance(0.5) ? 1 : -1;
      const guess = clamp(T + err, 0, MAX_NUM);
      const [lo, hi] = [[4.2, 9.2], [3.2, 7.4], [2.2, 5.4]][lvl];
      this.ai[i] = { guess, lockAt: rand(lo, hi), stepAt: reactionTime(p) + rand(0.2, 0.8), wrongStep: lvl === 0 && chance(0.3), prof };
    });
    sfx('whoosh', { vol: 0.4 });
  }

  step(i, d) {
    const c = this.choice[i];
    if (c.locked) return;
    const nv = clamp(c.v + d, 0, MAX_NUM);
    if (nv === c.v) return;
    c.v = nv; c.bounce = 1;
    sfx('tick'); sfx('move', { vol: 0.3 });
  }

  lock(i) {
    const c = this.choice[i];
    if (c.locked) return;
    c.locked = true; c.state = 'locked'; c.bounce = 1.2;
    const a = this.actors[i];
    a.playOnce(POSE.locked, 0.6); a.squash(0.25);
    sfx('select'); sfx('pop', { vol: 0.4 });
    particles.burst(a.x, a.y - a.height - 90, { type: 'sparkle', count: 8, colors: [this.players[i].color, '#fff'], speed: [60, 220] });
  }

  // --- update ---------------------------------------------------------------
  preUpdate(dt) { this.idleActors(dt); this.t += dt * 0; }
  idleActors(dt) { for (const a of this.actors) a.update(dt); }

  update(dt) {
    this.t += dt; this.pt += dt;
    this.idleActors(dt);
    for (const c of this.choice) c.bounce = Math.max(0, c.bounce - dt * 3);
    for (const f of this.fireflies) { f.x += Math.sin(this.t * 0.5 + f.ph) * 12 * dt; f.y += Math.cos(this.t * 0.4 + f.ph * 2) * 10 * dt; }
    switch (this.phase) {
      case 'intro': if (this.pt > 1.5) this.setPhase('ask'); break;
      case 'ask': if (this.pt > 2.9) { this.setPhase('watch'); sfx('magic', { vol: 0.5 }); for (const a of this.actors) a.setPose('look-up'); } break;
      case 'watch': this.updateFairies(dt); if (this.pt > this.watchLen) this.startGuess(); break;
      case 'guess': this.updateGuess(dt); break;
      case 'reveal': this.updateReveal(dt); break;
      case 'between': if (this.pt > 0.7) { if (this.round >= ROUNDS - 1) this.endGame(); else this.nextRound(); } break;
      default: break;
    }
  }
  postUpdate(dt) { this.t += dt; this.idleActors(dt); }

  updateFairies(dt) {
    for (const f of this.fairies) {
      const age = this.pt - f.t0;
      if (age < 0 || age > f.dur) continue;
      f.trailT -= dt;
      const p = this.fairyPos(f, age);
      if (f.trailT <= 0) { f.trailT = 0.035; f.trail.unshift({ x: p.x, y: p.y }); if (f.trail.length > 9) f.trail.pop(); }
      if (Math.random() < dt * 9) particles.burst(p.x, p.y + 10, { type: 'sparkle', count: 1, colors: [f.col.glow, '#ffffff'], size: [6, 12], speed: [5, 30], life: [0.4, 0.8], gravity: 20 });
    }
  }

  fairyPos(f, age) {
    const move = f.dur - f.pauseLen;
    let u;
    if (f.hide) {
      const ts = f.pauseU * move;
      u = age < ts ? age / move : age < ts + f.pauseLen ? f.pauseU : (age - f.pauseLen) / move;
    } else u = age / f.dur;
    const base = (uu) => lerp(f.y0, f.y1, uu) + Math.sin(uu * f.wob * TAU + f.ph) * f.amp;
    const x = lerp(f.x0, f.x1, u);
    let y = base(u);
    if (f.hide) {
      const w = Math.max(0, 1 - Math.abs(u - f.pauseU) / 0.22);
      y += (f.hy - base(f.pauseU)) * smooth(w);
      if (u === f.pauseU) y += Math.sin(age * 7) * 5;
    }
    return { x, y };
  }

  updateGuess(dt) {
    const left = GUESS_TIME - this.pt;
    this.players.forEach((p, i) => {
      const c = this.choice[i];
      if (c.locked) return;
      if (p.isAI) {
        const plan = this.ai[i];
        if (!plan) return;
        if (this.pt >= plan.stepAt && c.v !== plan.guess) {
          let d = Math.sign(plan.guess - c.v);
          if (plan.wrongStep && chance(0.25)) { d = -d; plan.wrongStep = false; }
          this.step(i, d);
          plan.stepAt = this.pt + rand(0.22, 0.45);
        }
        if (this.pt >= plan.lockAt && c.v === plan.guess) p.ctrl.press('a');
      } else {
        const nav = p.ctrl.nav;
        if (nav.y) this.step(i, -nav.y);
        else if (nav.x) this.step(i, nav.x);
      }
      if (p.ctrl.pressed('a')) this.lock(i);
    });
    if (left <= 0) { this.choice.forEach((c, i) => { if (!c.locked) this.lock(i); }); }
    if (this.choice.every((c) => c.locked) && (left <= 0 || this.pt > 0.8)) {
      this.startReveal();
    }
  }

  startReveal() {
    this.setPhase('reveal');
    const targets = this.fairies.filter((f) => f.target);
    const c = targets.length;
    const spacing = Math.min(130, (W - 400) / Math.max(1, c));
    this.rv = {
      list: targets.map((f, k) => {
        const side = k % 2 ? 1 : -1;
        return {
          col: f.col, k, sx: side < 0 ? -80 : W + 80, sy: rand(260, 640),
          tx: W / 2 + (k - (c - 1) / 2) * spacing, ty: 410, t0: 0.7 + k * 0.36, dur: 0.65, arrived: false, trail: [], trailT: 0,
        };
      }),
      count: 0, stage: 'fly', scored: false, totalAt: 0.7 + (c - 1) * 0.36 + 0.65 + 0.4,
    };
    this.choice.forEach((ch) => { ch.state = 'locked'; });
    sfx('magic', { vol: 0.5 });
  }

  updateReveal(dt) {
    const rv = this.rv;
    for (const r of rv.list) {
      const age = this.pt - r.t0;
      if (age < 0) continue;
      r.trailT -= dt;
      const pos = this.revealPos(r, age);
      if (r.trailT <= 0 && age < r.dur) { r.trailT = 0.03; r.trail.unshift({ x: pos.x, y: pos.y }); if (r.trail.length > 10) r.trail.pop(); }
      if (!r.arrived && age >= r.dur) {
        r.arrived = true; r.popT = this.pt; rv.count++;
        const step = SCALE_STEPS[Math.min(rv.count - 1, SCALE_STEPS.length - 1)];
        sfx('collect', { step }); if (hasSound('npc/fairy/chime')) sfx('npc/fairy/chime');
        particles.burst(r.tx, r.ty, { type: 'sparkle', count: 10, colors: [r.col.glow, '#fff', r.col.c], speed: [60, 280], size: [10, 22] });
        particles.ring(r.tx, r.ty, r.col.glow, 80, 0.45);
      }
    }
    if (rv.stage === 'fly' && this.pt >= rv.totalAt) {
      rv.stage = 'total'; rv.totalT = this.pt;
      sfx('correct'); fx.flash(this.target.glow, 0.12);
      if (this.api.camera) this.api.camera.punch(W / 2, 430, 1.15, 0.9);
      particles.burst(W / 2, 410, { type: 'star', count: 14, colors: [this.target.c, '#fff6a8', this.target.glow], speed: [200, 520] });
    }
    if (rv.stage === 'total' && this.pt >= rv.totalT + 0.8) { rv.stage = 'score'; rv.scoreT = this.pt; this.scoreRound(); }
    if (rv.stage === 'score' && this.pt >= rv.scoreT + 2.3) this.setPhase('between');
  }

  revealPos(r, age) {
    const e = ease.outCubic(clamp(age / r.dur, 0, 1));
    const x = lerp(r.sx, r.tx, e), y = lerp(r.sy, r.ty, e) - Math.sin(e * Math.PI) * 130;
    if (age >= r.dur) return { x: r.tx, y: r.ty + Math.sin(this.t * 3 + r.k) * 6 };
    return { x, y };
  }

  scoreRound() {
    const T = this.trueCount;
    let anyExact = false, anyClose = false;
    this.players.forEach((p, i) => {
      const c = this.choice[i], a = this.actors[i];
      const err = Math.abs(c.v - T);
      this.totalErr[i] += err;
      c.ans = c.v;
      const px = a.x, py = a.y - a.height - 100;
      if (err === 0) {
        c.state = 'exact'; this.points[i] += 3; this.exacts[i]++; anyExact = true;
        a.playOnce('cheer', 0.7); a.setPose(POSE.exact); a.squash(0.35); a.emote('heart', 1.4);
        particles.burst(px, py, { type: 'confetti', count: 26 });
        particles.burst(px, py, { type: 'star', count: 6, colors: ['#ffd23f', '#fff'] });
        particles.popText(px, py - 60, '+3', '#ffd23f', 64);
        voice(p.charId, 'yay');
        if (!p.isAI) p.ctrl.rumble(0.5, 220);
      } else if (err === 1) {
        c.state = 'close'; this.points[i] += 1; anyClose = true;
        a.playOnce('cheer', 0.6); a.setPose('idle'); a.squash(0.2);
        particles.burst(px, py, { type: 'sparkle', count: 8, colors: ['#ffe46b', '#fff'] });
        particles.popText(px, py - 60, '+1', '#ffe46b', 54);
      } else {
        c.state = 'miss'; a.setPose(POSE.miss); a.playOnce('pout', 1.4, 'idle');
        particles.popText(px, py - 60, 'Aww', '#c8d4ff', 44);
        voice(p.charId, 'aww');
      }
    });
    sfx(anyExact ? 'fanfare' : anyClose ? 'win' : 'aww');
    host(anyExact ? 'perfect' : anyClose ? 'so-close' : 'oops');
    if (anyExact) fx.shake(6, 0.2);
    this.hostMood = anyExact ? 'cheer' : 'talk';
  }

  endGame() {
    if (this.over) return;
    this.over = true;
    const score = this.points.map((pt, i) => pt * 1000 - this.totalErr[i] * 10);
    const placements = placementsFromScores(score);
    const stats = this.points.map((p, i) => `${p} pts, ${this.exacts[i]} exact`);
    const best = placements.indexOf(1), wa = this.actors[best];
    this.api.finish({ placements, stats, solo: score[0], focus: { x: wa.x, y: wa.y - wa.height / 2, zoom: 1.35 } });
  }

  // --- drawing ----------------------------------------------------------------
  draw(g) {
    this.drawBackground(g);
    const showFairies = this.phase === 'watch';
    if (showFairies) this.drawFairies(g);
    this.drawGarden(g);
    this.actors.forEach((a, i) => a.draw(g, { ring: this.players[i].color }));
    if (this.phase === 'reveal') this.drawReveal(g);
    this.drawBubbles(g);
  }

  drawBackground(g) {
    const bg = art('bg/fairy-count');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#150b3d'); gr.addColorStop(0.38, '#3a2380'); gr.addColorStop(0.62, '#8a4a9a'); gr.addColorStop(0.74, '#e07fa2'); gr.addColorStop(0.79, '#2a2a66'); gr.addColorStop(1, '#10304a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // stars
    g.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.25 + 0.7 * Math.abs(Math.sin(this.t * 1.3 + i * 1.7));
      g.beginPath(); g.arc(hh(i) * W, hh(i + 50) * 600, 1.4 + hh(i + 7) * 2.4, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // moon
    glow(g, 1680, 330, 260, '#fff0b8', 0.7);
    g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(1680, 330, 92, 0, TAU); g.fill();
    g.fillStyle = 'rgba(214,200,160,0.5)';
    for (const [dx, dy, r] of [[-28, -18, 18], [26, 22, 24], [8, -40, 11], [-34, 30, 12]]) { g.beginPath(); g.arc(1680 + dx, 330 + dy, r, 0, TAU); g.fill(); }
    // far hills and tree blobs
    ui.hills(g, 770, '#2c2a74', 38, 0.003, 2);
    g.fillStyle = '#26226a';
    for (let i = 0; i < 9; i++) { const tx = 80 + i * 230 + hh(i) * 60; g.beginPath(); g.arc(tx, 770 + Math.sin(tx * 0.003 + 2) * 38, 60 + hh(i + 2) * 40, 0, TAU); g.fill(); }
    ui.hills(g, 830, '#1d2f66', 26, 0.005, 0.5);
    // picket fence silhouette
    g.fillStyle = 'rgba(16,26,70,0.9)';
    for (let x = 10; x < W; x += 54) { g.beginPath(); g.moveTo(x, 880); g.lineTo(x + 20, 855); g.lineTo(x + 40, 880); g.lineTo(x + 40, 935); g.lineTo(x, 935); g.fill(); }
    g.fillRect(0, 893, W, 12);
    // lawn
    const lg = g.createLinearGradient(0, 930, 0, H);
    lg.addColorStop(0, '#1b4a5a'); lg.addColorStop(1, '#0c2a3f');
    g.fillStyle = lg; g.fillRect(0, 930, W, H - 930);
  }

  drawGarden(g) {
    // tall flowers (also the hiding spots)
    FLOWERS.forEach((f, i) => {
      g.save(); g.strokeStyle = NAVY; g.lineWidth = 16; g.beginPath(); g.moveTo(f.x, H); g.bezierCurveTo(f.x + 20 * (i - 1), 900, f.x - 20 * (i - 1), 760, f.x, f.y + 40); g.stroke();
      g.strokeStyle = '#2f9e6a'; g.lineWidth = 10; g.beginPath(); g.moveTo(f.x, H); g.bezierCurveTo(f.x + 20 * (i - 1), 900, f.x - 20 * (i - 1), 760, f.x, f.y + 40); g.stroke();
      // leaves
      g.fillStyle = '#3cc27f'; g.lineWidth = 4; g.strokeStyle = NAVY;
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(f.x + s * 46, f.y + 190 + s * 20, 46, 18, s * -0.5, 0, TAU); g.fill(); g.stroke(); }
      g.restore();
      drawFlowerHead(g, f.x, f.y, 82, f, this.t, i * 2);
    });
    // small glowing flowers along the lawn
    for (let i = 0; i < 26; i++) {
      const x = 40 + hh(i * 3) * (W - 80), y = 940 + hh(i * 5 + 1) * 120;
      const fl = FLOWERS[i % 3];
      g.save(); g.strokeStyle = '#2f9e6a'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x, y); g.stroke(); g.restore();
      drawFlowerHead(g, x, y, 17 + hh(i) * 8, fl, this.t, i);
    }
    // fireflies
    for (const f of this.fireflies) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.7 + f.ph));
      glow(g, f.x, f.y, 22 * f.s, '#fff3a0', a * 0.8);
      g.fillStyle = `rgba(255,252,200,${a})`; g.beginPath(); g.arc(f.x, f.y, 2.5 * f.s, 0, TAU); g.fill();
    }
  }

  drawFairies(g) {
    for (const f of this.fairies) {
      const age = this.pt - f.t0;
      if (age < 0 || age > f.dur) continue;
      const p = this.fairyPos(f, age);
      // light trail
      g.save(); g.globalCompositeOperation = 'lighter';
      f.trail.forEach((q, k) => {
        const a = (1 - k / f.trail.length) * 0.55;
        g.globalAlpha = a; g.fillStyle = f.col.glow; g.beginPath(); g.arc(q.x, q.y, 16 * (1 - k / 12), 0, TAU); g.fill();
      });
      g.restore();
      drawFairy(g, p.x, p.y, 1.7, f.col, this.t + f.seed, f.dir);
    }
  }

  drawReveal(g) {
    const rv = this.rv;
    for (const r of rv.list) {
      const age = this.pt - r.t0;
      if (age < 0) continue;
      const pos = this.revealPos(r, age);
      g.save(); g.globalCompositeOperation = 'lighter';
      r.trail.forEach((q, k) => { g.globalAlpha = (1 - k / r.trail.length) * 0.5; g.fillStyle = r.col.glow; g.beginPath(); g.arc(q.x, q.y, 12 * (1 - k / 14), 0, TAU); g.fill(); });
      g.restore();
      const pop = r.arrived ? 1 + Math.max(0, 0.5 - (this.pt - r.popT)) * 0.9 : 1;
      drawFairy(g, pos.x, pos.y, 2.1 * pop, r.col, this.t + r.k, r.sx < 0 ? 1 : -1);
      if (r.arrived) {
        const k = this.pt - r.popT;
        const sc = ease.outBack(clamp(k / 0.3, 0, 1));
        g.save(); g.translate(pos.x, pos.y - 100); g.scale(sc, sc);
        ui.text(g, String(r.k + 1), 0, 0, { size: 76, color: r.col.c, strokeWidth: 14, weight: 800 });
        g.restore();
      }
    }
  }

  drawTotalPanel(g) {
    const rv = this.rv;
    if (rv && rv.stage !== 'fly') {
      const k = this.pt - rv.totalT;
      const sc = ease.outElastic(clamp(k / 0.7, 0, 1));
      g.save(); g.translate(W / 2, 548); g.scale(sc, sc);
      ui.panel(g, -330, -70, 660, 140, { r: 40, fill: 'rgba(255,255,255,0.95)' });
      drawFairy(g, -250, 0, 1.9, this.target, this.t, 1);
      ui.text(g, `${this.trueCount}`, -90, 4, { size: 130, color: this.target.c, strokeWidth: 20, weight: 800 });
      ui.text(g, `${this.target.name}`, 120, -22, { size: 52, color: this.target.c, strokeWidth: 10 });
      ui.text(g, this.trueCount === 1 ? 'fairy!' : 'fairies!', 120, 32, { size: 52, color: NAVY, stroke: false });
      g.restore();
    }
  }

  drawQuestion(g, cx, cy, size, icon) {
    const c = this.target;
    const a = 'How many ', b = c.name, d = ' fairies?';
    const wa = ui.measure(g, a, size), wb = ui.measure(g, b, size, 800), wd = ui.measure(g, d, size);
    const iconW = icon * 1.4;
    const total = iconW + wa + wb + wd;
    let x = cx - total / 2;
    drawFairy(g, x + iconW / 2, cy + 2, icon / 40, c, this.t, 1);
    x += iconW;
    ui.text(g, a, x, cy, { size, color: '#ffffff', align: 'left' }); x += wa;
    ui.text(g, b, x, cy, { size, color: c.c, align: 'left', weight: 800, strokeWidth: size * 0.2 }); x += wb;
    ui.text(g, d, x, cy, { size, color: '#ffffff', align: 'left' });
    return total;
  }

  drawHUD(g) {
    const n = this.n;
    if (this.phase === 'reveal') this.drawTotalPanel(g);
    ui.scoreboard(g, this.players, this.points, { y: 22, format: (v) => `${v} pts`, highlight: this.leaderFlags() });
    if (this.phase === 'intro') {
      ui.banner(g, this.round === ROUNDS - 1 ? 'Final Round!' : `Round ${this.round + 1}`, this.pt, { y: H / 2 - 60, size: 140, color: '#ffd23f' });
      ui.text(g, `of ${ROUNDS}`, W / 2, H / 2 + 60, { size: 54, alpha: clamp(this.pt * 2, 0, 1) });
    } else if (this.phase === 'ask') {
      const k = ease.outBack(clamp(this.pt / 0.45, 0, 1));
      g.save(); g.translate(W / 2, H / 2 - 40); g.scale(k, k);
      ui.panel(g, -800, -150, 1600, 300, { r: 60, fill: 'rgba(36,22,63,0.82)', stroke: '#ffffff' });
      ui.text(g, `Round ${this.round + 1} of ${ROUNDS}`, 0, -100, { size: 40, color: '#ffd23f' });
      this.drawQuestion(g, 0, 10, 98, 70);
      ui.text(g, 'Watch closely!', 0, 108, { size: 42, color: '#cfe6ff', stroke: false });
      g.restore();
      drawHost(g, 190, 960, 280, this.t, 'talk');
    } else {
      // question strip
      ui.panel(g, W / 2 - 560, 112, 1120, 84, { r: 42, fill: 'rgba(36,22,63,0.78)', stroke: '#ffffff', lineWidth: 4 });
      this.drawQuestion(g, W / 2, 156, 54, 46);
    }
    if (this.phase === 'guess') {
      const left = Math.max(0, GUESS_TIME - this.pt);
      ui.timer(g, left, W - 150, 190 + 30);
      if (this.pt < 5 && this.choice.some((c) => !c.locked)) {
        ui.hints(g, [['dpad', 'Pick'], ['a', 'Lock in']], W / 2, 236, { size: 40 });
      }
    }
    if (this.phase === 'reveal' && this.rv.stage === 'fly' && this.pt < 0.8) {
      ui.text(g, "Let's count together!", W / 2, 300, { size: 72, color: this.target.c, alpha: clamp(this.pt * 3, 0, 1) });
    }
    if (this.phase === 'reveal' || this.phase === 'ask') {
      if (this.phase === 'reveal') drawHost(g, 150, 760, 210, this.t, this.hostMood || 'talk');
    }
    void n;
  }

  leaderFlags() {
    const m = Math.max(...this.points);
    return this.points.map((p) => m > 0 && p === m);
  }

  drawBubbles(g) {
    if (!['guess', 'reveal', 'between'].includes(this.phase)) {
      if (this.phase !== 'watch' || this.pt < 3) {
        this.players.forEach((p, i) => {
          const a = this.actors[i], ts = this.n > 5 ? 0.75 : 0.9;
          g.save(); g.translate(a.x, a.y - a.height - 34); g.scale(ts, ts); ui.playerTag(g, p, 0, 0); g.restore();
        });
      }
      return;
    }
    this.players.forEach((p, i) => {
      const a = this.actors[i], c = this.choice[i];
      const r = this.n <= 4 ? 52 : this.n <= 6 ? 46 : 40;
      const x = a.x, y = a.y - a.height - 110;
      const bob = Math.sin(this.t * 3 + i) * 3;
      const sc = 1 + Math.sin(clamp(c.bounce, 0, 1) * Math.PI) * 0.18;
      g.save(); g.translate(x, y + bob); g.scale(sc, sc);
      let fill = '#ffffff', stroke = p.color, txt = NAVY;
      if (c.state === 'locked') { fill = p.color; txt = '#ffffff'; stroke = NAVY; }
      if (c.state === 'exact') { fill = '#59e07a'; txt = '#ffffff'; stroke = NAVY; }
      if (c.state === 'close') { fill = '#ffe14a'; txt = NAVY; stroke = NAVY; }
      if (c.state === 'miss') { fill = '#c7d0ee'; txt = '#5b5f86'; stroke = NAVY; }
      glow(g, 0, 0, r * 1.9, c.state === 'exact' ? '#a3f5b6' : p.color, c.state === 'pick' ? 0.25 : 0.5);
      g.lineWidth = 8; g.strokeStyle = stroke; g.fillStyle = fill;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
      // tail
      g.beginPath(); g.moveTo(-12, r - 4); g.lineTo(0, r + 18); g.lineTo(12, r - 4); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, 0, r - 4, 0.9 * Math.PI, 1.3 * Math.PI); g.lineWidth = 1; g.fillStyle = fill; g.fill();
      ui.text(g, String(c.v), 0, 4, { size: r * 1.15, color: txt, stroke: false, weight: 800 });
      if (c.state === 'pick' && this.phase === 'guess') {
        const bounce = Math.abs(Math.sin(this.t * 5 + i)) * 5;
        g.fillStyle = p.color; g.strokeStyle = NAVY; g.lineWidth = 3; g.lineJoin = 'round';
        const ax = r + 30;
        g.beginPath(); g.moveTo(ax - 15, -10 - bounce); g.lineTo(ax, -30 - bounce); g.lineTo(ax + 15, -10 - bounce); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(ax - 15, 10 + bounce); g.lineTo(ax, 30 + bounce); g.lineTo(ax + 15, 10 + bounce); g.closePath(); g.fill(); g.stroke();
      }
      if (c.state === 'locked' || c.state === 'exact' || c.state === 'close') {
        // lock badge
        g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 4;
        g.beginPath(); g.arc(r * 0.78, -r * 0.78, 17, 0, TAU); g.fill(); g.stroke();
        g.strokeStyle = '#2aa55a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(r * 0.78 - 8, -r * 0.78); g.lineTo(r * 0.78 - 2, -r * 0.78 + 7); g.lineTo(r * 0.78 + 9, -r * 0.78 - 7); g.stroke();
      }
      g.restore();
      // player tag
      g.save(); g.translate(x, y - r - 48 + bob); const ts = this.n > 5 ? 0.75 : 0.9; g.scale(ts, ts); ui.playerTag(g, p, 0, 0); g.restore();
    });
  }
}
