// Treasure Dig - hot/cold treasure hunt on a sunny beach. Treasure is buried
// out of sight; every player's shell detector beeps faster and glows warmer
// (blue -> yellow -> red ring, plus ripples) the closer they are to the
// nearest one. A digs: the right spot pops out a shell, pearl, gem, gold coins
// or the jackpot crown; a wrong spot finds something silly (a pinchy crab,
// seaweed, a sock, a rubber duck). Big chests need several digs (two players
// digging together count double), waves wash in and nudge the treasure, and
// the last 12 seconds are a Gold Rush. 60 s, most points wins.
//
// CPUs only get the detector reading a human sees (heat at their own spot,
// quantised and noisy by level) and follow its gradient; they never read the
// buried positions. Revealed chests and washed-up starfish are visible to all.
//
// Art hooks (all optional, procedural fallbacks ship today): bg/treasure-dig,
// thumb/treasure-dig, prop/treasure-shell|pearl|gem|coins|crown, prop/treasure-chest(-open),
// prop/shell-detector, prop/beach-crab|seaweed|sock|duck|starfish, prop/sand-hole.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime, makesMistake } from '../engine/ai.js';
import { clamp, lerp, damp, rand, chance, TAU, ease, dist, placementsFromScores } from '../engine/util.js';
import {
  NAVY, SHORE, LOOT, buildBeach, heatColor, drawLoot, drawCrab, drawSeaweed, drawSock, drawDuck,
  drawChest, drawDetector, drawBang, drawHole,
} from './treasure-dig/props.js';

const DURATION = 60;
const ARENA = { x0: 130, y0: 350, x1: 1790, y1: 1030 };
const WALK = 380;
const DIG_TIME = 0.55;
const DIG_R = 64;                  // dig this close to a treasure to get it
const CHEST_R = 92;
const NEAR0 = 40, RANGE = 640;     // heat = 1 - (d - NEAR0) / RANGE
const BANG = 0.972;                // "!" on the detector: d < ~58, always inside DIG_R
const RUSH_AT = 48;                // Gold Rush: last 12 seconds
const WAVE_TIMES = [14, 29, 43];
const WAVE_WARN = 2.2;
const PAINTED_SHORE = 280;        // where bg/treasure-dig paints the foam line
const CHEST_TIMES = [17, 35];
const CHEST_PTS = 8;
const WEIGHTS = { shell: 34, pearl: 26, gem: 20, coins: 14, crown: 6 };
const RUSH_WEIGHTS = { shell: 6, pearl: 24, gem: 28, coins: 28, crown: 14 };
const SILLY = [['crab', 26], ['seaweed', 20], ['sock', 18], ['duck', 14], ['sand', 22]];
const SAND = ['#f3d394', '#e8c27e', '#d9ae66', '#fbe6b8'];
// Poses: all existing. WISH (see report): 'dig' (crouched, scooping sand back between the legs).
const POSE = { dig: 'dig', digBase: 'dig', found: 'cheer', jackpot: 'celebrate', pinch: 'hurt', silly: 'surprised' };

const snd = (k, fb, o = {}) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const weighted = (table) => {
  const list = Array.isArray(table) ? table : Object.entries(table);
  let r = rand(list.reduce((s, [, w]) => s + w, 0));
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[0][0];
};
const heatOf = (d) => clamp(1 - (d - NEAR0) / RANGE, 0, 1);

export const meta = {
  id: 'treasure-dig',
  title: 'Treasure Dig',
  category: 'party',
  type: 'Hot & cold hunt',
  goal: 'Follow your shell detector to buried treasure and dig it up!',
  controls: [['stick', 'Walk along the beach'], ['a', 'Dig!']],
  tips: [
    'Your ring and shell go blue (cold), yellow (warm), RED (hot!). Dig when the red "!" pops up.',
    'Dig in the wrong spot and you might find a crab, a sock... or seaweed!',
    'Found a treasure chest? Dig it with a friend - together counts double!',
    'Gold Rush at the end: extra treasure, and the crown shows up more!',
  ],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.translate(x, y);
    const s = h / 250;
    // sea + sand
    const sea = g.createLinearGradient(0, 0, 0, h * 0.3); sea.addColorStop(0, '#2f9ee0'); sea.addColorStop(1, '#7fe0f0');
    g.fillStyle = sea; g.fillRect(0, 0, w, h * 0.34);
    g.fillStyle = '#f6dea4'; g.beginPath(); g.moveTo(0, h);
    for (let i = 0; i <= 20; i++) g.lineTo((i / 20) * w, h * 0.28 + Math.sin(i * 0.9 + t * 1.5) * h * 0.02);
    g.lineTo(w, h); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4 * s; g.beginPath();
    for (let i = 0; i <= 20; i++) g.lineTo((i / 20) * w, h * 0.28 + Math.sin(i * 0.9 + t * 1.5) * h * 0.02);
    g.stroke();
    g.fillStyle = 'rgba(214,170,100,0.5)';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(((i * 97) % 400) / 400 * w, h * 0.36 + ((i * 61) % 100) / 100 * h * 0.6, 2 * s, 0, TAU); g.fill(); }
    // chest half dug out, glowing
    g.save(); g.translate(w * 0.68, h * 0.72);
    g.save(); g.globalCompositeOperation = 'lighter';
    const rg = g.createRadialGradient(0, -30 * s, 4, 0, -30 * s, 110 * s); rg.addColorStop(0, 'rgba(255,236,140,0.8)'); rg.addColorStop(1, 'rgba(255,200,60,0)');
    g.fillStyle = rg; g.fillRect(-120 * s, -150 * s, 240 * s, 240 * s); g.restore();
    drawChest(g, 120 * s, 1, t);
    g.fillStyle = '#e8c27e'; g.strokeStyle = NAVY; g.lineWidth = 3 * s;
    g.beginPath(); g.ellipse(0, 4 * s, 88 * s, 18 * s, 0, 0, Math.PI); g.fill();
    g.restore();
    for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.6; g.save(); g.translate(w * 0.68 + Math.cos(a) * 50 * s, h * 0.36 + Math.sin(a * 1.3) * 16 * s); g.rotate(a); g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 2 * s; g.beginPath(); g.ellipse(0, 0, 6 * s, 6 * s * Math.abs(Math.cos(a)), 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    // the detector with hot ripples
    const dx = w * 0.27, dy = h * 0.6;
    for (let k = 0; k < 3; k++) {
      const q = ((t * 1.6 + k / 3) % 1);
      g.strokeStyle = heatColor(0.95, 0, 1 - q); g.lineWidth = (6 - q * 4) * s;
      g.beginPath(); g.ellipse(dx, dy + 40 * s, (40 + q * 90) * s, (14 + q * 32) * s, 0, 0, TAU); g.stroke();
    }
    g.save(); g.translate(dx, dy + Math.sin(t * 3) * 4 * s);
    drawDetector(g, 84 * s, 0.95, Math.max(0, Math.sin(t * 9)), t, true);
    g.translate(30 * s, -64 * s); drawBang(g, 36 * s, t);
    g.restore();
    // crab peeking from a hole
    drawHole(g, w * 0.1, h * 0.9, 34 * s, 1);
    g.save(); g.translate(w * 0.1, h * 0.86 - Math.abs(Math.sin(t * 2)) * 8 * s); drawCrab(g, 62 * s, t, 0.6); g.restore();
    g.restore();
  },
};

// --- the game --------------------------------------------------------------------------
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.over = false;
    this.scale = n <= 2 ? 0.95 : n <= 4 ? 0.88 : n <= 6 ? 0.8 : 0.72;
    this.R = n <= 4 ? 32 : 27;
    this.units = this.players.map((p, i) => this.makeUnit(p, i));
    this.humans = this.players.filter((p) => !p.isAI).length;
    this.treasures = [];
    this.spawnQueue = [];
    this.holes = [];
    this.crabs = [];
    this.gifts = [];
    this.chest = null;
    this.chestIdx = 0;
    this.wave = null;
    this.waveIdx = 0;
    this.warnAt = -1;
    this.rush = false;
    this.bannerText = null; this.bannerT = 0; this.bannerColor = '#ffd23f';
    this.leader = -1;
    for (let i = 0; i < this.targetCount(); i++) this.spawnTreasure();
    this.bg = buildBeach(ARENA);
  }

  makeUnit(p, i) {
    const n = this.n;
    const rows = n > 4 ? 2 : 1, perRow = Math.ceil(n / rows);
    const row = rows === 2 ? (i < perRow ? 0 : 1) : 0, col = row ? i - perRow : i;
    const cnt = row ? n - perRow : perRow;
    const span = ARENA.x1 - ARENA.x0 - 340;
    const x = ARENA.x0 + 170 + ((col + 0.5) / cnt) * span + (rows === 2 ? (row ? 60 : -60) : 0);
    const y = rows === 2 ? (row ? 950 : 830) : 900;
    const a = new Actor(p, { scale: this.scale, x, y });
    a.facing = x < W / 2 ? 1 : -1; a.snap();
    return {
      p, i, a, x, y, vx: 0, vy: 0,
      heat: 0, shown: 0, beepT: rand(0.2, 0.9), pulse: 0, ripples: [], gx: x, gy: y - 80,
      dig: 0, digX: x, digY: y, scooped: 0, hole: null, stun: 0, hop: 0, wet: 0, waveHit: -1, seaweed: 0, carry: null,
      score: 0, finds: 0,
      ai: { dir: rand(TAU), sampleT: rand(0.1, 0.4), lastH: null, px: x, py: y, sign: chance(0.5) ? 1 : -1, turned: false, best: 0, stale: 0, digAt: -1, distract: 0, chestPref: null, prefT: 0 },
    };
  }

  // --- treasure ------------------------------------------------------------------------
  targetCount() { const n = this.n; return (n <= 2 ? 3 : n <= 4 ? 4 : n <= 6 ? 5 : 6) + (this.rush ? 2 : 0); }

  freeSpot(minPlayer, minTreasure) {
    let best = null, bestScore = -1;
    for (let k = 0; k < 40; k++) {
      const x = rand(ARENA.x0 + 60, ARENA.x1 - 60), y = rand(ARENA.y0 + 40, ARENA.y1 - 50);
      let dp = 1e9, dt = 1e9;
      for (const u of this.units) dp = Math.min(dp, dist(x, y, u.x, u.y));
      for (const T of this.treasures) dt = Math.min(dt, dist(x, y, T.x, T.y));
      if (this.chest && !this.chest.opened) dt = Math.min(dt, dist(x, y, this.chest.x, this.chest.y) - 40);
      const sc = Math.min(dp / minPlayer, dt / minTreasure);
      if (sc >= 1) return { x, y };
      if (sc > bestScore) { bestScore = sc; best = { x, y }; }
    }
    return best;
  }

  spawnTreasure() {
    const spot = this.freeSpot(300, 240);
    let kind = weighted(this.rush ? RUSH_WEIGHTS : WEIGHTS);
    if (kind === 'crown' && this.treasures.some((T) => T.kind === 'crown')) kind = 'coins';
    this.treasures.push({ x: spot.x, y: spot.y, kind });
  }

  spawnChest() {
    const spot = this.freeSpot(380, 260);
    this.chest = { x: clamp(spot.x, ARENA.x0 + 100, ARENA.x1 - 100), y: clamp(spot.y, ARENA.y0 + 80, ARENA.y1 - 60), progress: 0, need: this.n === 1 ? 3 : 4, helpers: new Set(), digs: [], revealed: false, opened: false, openT: 0, shake: 0, appear: 0 };
  }

  /** What a detector at (x, y) reads: 0 (cold) .. 1 (right on top). */
  heatAt(x, y) {
    let best = 1e9;
    for (const T of this.treasures) best = Math.min(best, dist(x, y, T.x, T.y));
    const C = this.chest;
    if (C && !C.opened) best = Math.min(best, dist(x, y, C.x, C.y) - 24);
    return heatOf(best);
  }

  nearestTreasure(x, y) {
    let best = null, bd = 1e9;
    for (const T of this.treasures) { const d = dist(x, y, T.x, T.y); if (d < bd) { bd = d; best = T; } }
    return { T: best, d: bd };
  }

  showBanner(text, color = '#ffd23f') { this.bannerText = text; this.bannerT = this.t; this.bannerColor = color; }

  // --- frame ---------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    for (const U of this.units) {
      this.senseAndBeep(U, dt, false);
      U.a.setPose('idle'); this.placeActor(U); U.a.update(dt);
    }
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    // treasure upkeep
    while (this.treasures.length + this.spawnQueue.length < this.targetCount()) this.spawnQueue.push(t + rand(0.8, 1.6));
    this.spawnQueue = this.spawnQueue.filter((at) => { if (t >= at) { this.spawnTreasure(); return false; } return true; });
    // gold rush
    if (!this.rush && t >= RUSH_AT) {
      this.rush = true;
      this.showBanner('GOLD RUSH!', '#ffd23f');
      snd('td-goldrush', 'fanfare'); fx.flash('#fff3b0', 0.2);
      for (let i = 0; i < 2; i++) this.spawnTreasure();
      for (const U of this.units) if (U.dig <= 0 && U.stun <= 0) U.a.playOnce('cheer', 0.6);
    }
    // chests
    if (this.chestIdx < CHEST_TIMES.length && t >= CHEST_TIMES[this.chestIdx] && !this.chest && t < DURATION - 8) { this.chestIdx++; this.spawnChest(); }
    // waves
    if (this.waveIdx < WAVE_TIMES.length) {
      const at = WAVE_TIMES[this.waveIdx];
      if (this.warnAt < 0 && t >= at - WAVE_WARN) { this.warnAt = t; sfx('bubble', { vol: 0.6 }); }
      if (t >= at) { this.waveIdx++; this.warnAt = -1; this.startWave(); }
    }
    this.updateWave(dt);
    for (const U of this.units) this.updateUnit(U, dt);
    this.collide();
    this.updateThings(dt);
    // leader
    const sc = this.units.map((u) => u.score), m = Math.max(...sc);
    this.leader = m > 0 ? sc.indexOf(m) : -1;
    for (const U of this.units) U.a.update(dt);
    if (t >= DURATION && !this.over) this.endGame();
  }

  postUpdate(dt) {
    this.t0 += dt;
    this.updateThings(dt);
    for (const U of this.units) {
      U.hop = Math.max(0, U.hop - dt); U.seaweed = Math.max(0, U.seaweed - dt); U.pulse = Math.max(0, U.pulse - dt * 4);
      if (U.carry) { U.carry.t += dt; if (U.carry.t > U.carry.dur) U.carry = null; }
      for (const r of U.ripples) r.t += dt;
      U.ripples = U.ripples.filter((r) => r.t < 0.7);
      this.placeActor(U); U.a.update(dt);
    }
  }

  senseAndBeep(U, dt, sound) {
    U.heat = this.heatAt(U.x, U.y);
    U.shown = damp(U.shown, U.heat, 12, dt);
    U.pulse = Math.max(0, U.pulse - dt * 4);
    U.beepT -= dt;
    if (U.beepT <= 0) {
      const h = U.heat;
      U.beepT = lerp(1.4, 0.13, Math.pow(h, 1.4));
      U.pulse = 1;
      U.ripples.push({ t: 0, h });
      if (sound && !U.p.isAI) {
        const vol = (0.25 + 0.75 * h) * (this.humans > 1 ? 0.6 : 1);
        snd('td-beep', 'note', { midi: 74 + Math.round(h * 14), semi: Math.round(h * 12), dur: 0.07, vol: vol * 0.6, wave: 'sine' });
      }
    }
    for (const r of U.ripples) r.t += dt;
    U.ripples = U.ripples.filter((r) => r.t < 0.7);
  }

  placeActor(U) {
    const a = U.a;
    a.x = U.x; a.y = U.y;
    a.z = U.hop > 0 ? Math.sin((1 - U.hop / 0.5) * Math.PI) * 70 : 0;
    a.scale = this.scale * depthScale(U.y, { top: ARENA.y0, near: ARENA.y1, far: 0.84, nearScale: 1.04 });
  }

  updateUnit(U, dt) {
    const p = U.p, a = U.a;
    U.stun = Math.max(0, U.stun - dt); U.hop = Math.max(0, U.hop - dt); U.seaweed = Math.max(0, U.seaweed - dt); U.wet = Math.max(0, U.wet - dt);
    if (U.carry) { U.carry.t += dt; if (U.carry.t > U.carry.dur) U.carry = null; }
    this.senseAndBeep(U, dt, true);
    if (p.isAI) this.ai(U, dt);
    let mx = p.ctrl.x, my = p.ctrl.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    const busy = U.dig > 0 || U.stun > 0 || U.hop > 0;
    if (busy) mx = my = 0;
    if (p.ctrl.pressed('a') && !busy) this.startDig(U);
    // the wave: wading is slower
    if (this.wave && U.y < this.wave.edge + 10) {
      if (U.waveHit !== this.wave.id) {
        U.waveHit = this.wave.id;
        if (U.dig <= 0 && U.stun <= 0) a.playOnce(POSE.silly, 0.4);
        a.squash(0.25);
        particles.burst(U.x, U.y - 30, { type: 'drop', count: 10, colors: ['#bdf2ff', '#7fd8f5', '#ffffff'], speed: [200, 420], angle: -Math.PI / 2, spread: 1.1 });
        particles.popText(U.x, U.y - a.height - 30, 'Splash!', '#7fd8f5', 40);
      }
      U.wet = 0.6;
    }
    const speed = WALK * (U.wet > 0 ? 0.62 : 1);
    U.vx = damp(U.vx, mx * speed, 12, dt); U.vy = damp(U.vy, my * speed, 12, dt);
    U.x += U.vx * dt; U.y += U.vy * dt;
    if (U.wet > 0 && Math.hypot(U.vx, U.vy) > 80 && Math.random() < dt * 14) particles.burst(U.x + rand(-20, 20), U.y - 4, { type: 'drop', count: 1, colors: ['#bdf2ff', '#fff'], speed: [80, 200], angle: -Math.PI / 2, spread: 0.8 });
    // digging
    if (U.dig > 0) {
      U.dig -= dt;
      if (U.hole) U.hole.grow = clamp(1 - U.dig / DIG_TIME, 0, 1);
      if (U.scooped < 2 && U.dig < DIG_TIME * 0.5) { U.scooped = 2; this.scoop(U); }
      if (U.dig <= 0) { U.dig = 0; this.resolveDig(U); }
    }
    // animation
    if (U.dig > 0) a.setPose(POSE.digBase);
    else if (U.stun > 0 || U.hop > 0) { if (a.pose === POSE.digBase) a.setPose('idle'); }
    else a.moveAnim(U.vx, U.vy, WALK, { run: Math.hypot(U.vx, U.vy) > WALK * 0.85 });
    this.placeActor(U);
  }

  collide() {
    const R = this.R, list = this.units;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j];
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.001, min = R * 2;
        if (d < min) {
          const push = min - d, nx = dx / d, ny = dy / d;
          const aw = A.dig > 0 ? 0 : B.dig > 0 ? 1 : 0.5, bw = 1 - aw;
          A.x -= nx * push * aw; A.y -= ny * push * aw; B.x += nx * push * bw; B.y += ny * push * bw;
        }
      }
    }
    for (const u of list) {
      u.x = clamp(u.x, ARENA.x0, ARENA.x1); u.y = clamp(u.y, ARENA.y0, ARENA.y1);
      u.a.x = u.x; u.a.y = u.y;
    }
  }

  // --- digging -------------------------------------------------------------------------
  startDig(U) {
    U.dig = DIG_TIME; U.digX = U.x; U.digY = U.y + 2; U.scooped = 1;
    U.hole = { x: U.digX, y: U.digY + 6, r: 34 * U.a.scale / this.scale * (this.scale + 0.1), grow: 0, fill: 0, age: 0 };
    this.holes.push(U.hole);
    if (this.holes.length > 60) this.holes.shift();
    U.vx *= 0.2; U.vy *= 0.2;
    this.scoop(U);
    U.ai.digAt = -1;
  }

  scoop(U) {
    const a = U.a, f = a.facing;
    a.playOnce(POSE.dig, 0.24); a.squash(0.22);
    snd('td-dig', 'brush', { vol: 0.55 });
    const bx = U.x - f * 16, by = U.y - 8;
    particles.burst(bx, by, { type: 'drop', count: 7, colors: SAND, angle: -Math.PI / 2 - f * 0.7, spread: 0.55, speed: [260, 520], size: [5, 10] });
    particles.burst(bx, by, { type: 'dust', count: 5, colors: SAND, angle: -Math.PI / 2 - f * 0.5, spread: 0.8, speed: [80, 220] });
    if (!U.p.isAI) U.p.ctrl.rumble(0.15, 60);
  }

  resolveDig(U) {
    const x = U.digX, y = U.digY;
    if (U.hole) { U.hole.grow = 1; U.hole = null; }
    const C = this.chest;
    if (C && !C.opened && dist(x, y, C.x, C.y) < CHEST_R) { this.digChest(U); return; }
    const { T, d } = this.nearestTreasure(x, y);
    if (T && d < DIG_R) { this.findTreasure(U, T); return; }
    this.silly(U, d);
  }

  findTreasure(U, T) {
    this.treasures = this.treasures.filter((o) => o !== T);
    const L = LOOT[T.kind], a = U.a;
    U.score += L.pts; U.finds++;
    U.carry = { kind: T.kind, t: 0, dur: T.kind === 'crown' ? 1.6 : 1.15, fx: T.x, fy: T.y };
    a.playOnce(T.kind === 'crown' ? POSE.jackpot : POSE.found, T.kind === 'crown' ? 1.4 : 0.8); a.squash(0.35);
    a.emote(L.pts >= 3 ? 'sparkle' : 'star', 1);
    particles.burst(T.x, T.y - 20, { type: 'sparkle', count: 10 + L.pts * 2, colors: L.sparks, speed: [120, 380], size: [12, 26] });
    particles.burst(T.x, T.y - 10, { type: 'drop', count: 8, colors: SAND, angle: -Math.PI / 2, spread: 1, speed: [240, 480] });
    particles.ring(T.x, T.y - 10, L.color, 110, 0.45);
    const top = U.y - a.height - 110;
    particles.popText(U.x, top, `+${L.pts}`, L.color === '#e3cdff' ? '#c9a2ff' : L.color, 64);
    particles.popText(U.x, top - 52, L.name, '#ffffff', 36);
    snd('td-treasure', 'golden-chime', { vol: 0.8 });
    sfx('collect', { step: Math.min(12, L.pts * 2) });
    if (L.pts >= 3) sfx('coin');
    if (L.pts >= 3 || chance(0.5)) voice(U.p.charId, L.pts >= 5 ? 'woo' : 'yay');
    if (!U.p.isAI) U.p.ctrl.rumble(0.3 + L.pts * 0.05, 140);
    if (T.kind === 'crown') {
      this.showBanner('JACKPOT!', '#ffd23f');
      snd('td-jackpot', 'fanfare'); sfx('magic');
      fx.flash('#fff3b0', 0.25); fx.slowmo(0.45, 0.7); fx.shake(8, 0.3);
      particles.burst(U.x, U.y - a.height, { type: 'confetti', count: 46, speed: [300, 700] });
      particles.burst(U.x, U.y - a.height, { type: 'star', count: 14, colors: ['#ffd23f', '#fff6a8', '#ffffff'], speed: [200, 520] });
      if (this.api.camera) this.api.camera.punch(U.x, U.y - a.height * 0.6, 1.3, 0.6);
    } else if (L.pts >= 5 && this.api.camera) {
      fx.shake(4, 0.15);
    }
  }

  silly(U, nd) {
    const a = U.a, top = U.y - a.height - 60;
    const kind = weighted(SILLY);
    if (nd < 170) particles.popText(U.x, top - 70, 'So close!', '#ff9f1c', 40);
    if (kind === 'crab') {
      this.crabs.push({ x: U.digX, y: U.digY + 4, z: 0, t: 0, u: U, pinched: false, dir: chance(0.5) ? 1 : -1 });
      U.stun = 0.5;
      a.playOnce(POSE.silly, 0.3);
      sfx('pop', { vol: 0.6 });
    } else if (kind === 'seaweed') {
      U.seaweed = 3; U.stun = 0.45;
      a.playOnce(POSE.silly, 0.5); a.squash(0.3);
      particles.popText(U.x, top, 'Seaweed!', '#3fbf6a', 46);
      particles.burst(U.x, U.y - a.height, { type: 'drop', count: 8, colors: ['#6fd38a', '#bdf2ff'], speed: [100, 260] });
      snd('td-seaweed', 'splat', { vol: 0.6 });
      voice(U.p.charId, 'gasp');
    } else if (kind === 'sock') {
      U.carry = { kind: 'sock', t: 0, dur: 1.0, fx: U.digX, fy: U.digY };
      U.stun = 0.5;
      a.playOnce(POSE.silly, 0.5); a.emote('question', 1);
      particles.popText(U.x, top, 'A sock?!', '#ff6fb1', 46);
      snd('td-sock', 'boing', { vol: 0.7 });
      voice(U.p.charId, 'laugh');
    } else if (kind === 'duck') {
      U.carry = { kind: 'duck', t: 0, dur: 1.0, fx: U.digX, fy: U.digY };
      U.stun = 0.4;
      a.playOnce(POSE.silly, 0.4); a.emote('heart', 1);
      particles.popText(U.x, top, 'Ducky!', '#ffd23f', 46);
      snd('squeak', 'pop');
    } else {
      U.stun = 0.15;
      a.emote('sweat', 0.8);
      particles.popText(U.x, top, 'Just sand', '#d9ae66', 36);
      particles.burst(U.digX, U.digY - 10, { type: 'dust', count: 8, colors: SAND, speed: [60, 180] });
      sfx('crumble', { vol: 0.4 });
    }
  }

  pinch(c) {
    const U = c.u, a = U.a;
    c.pinched = true;
    U.stun = Math.max(U.stun, 0.8); U.hop = 0.5;
    a.playOnce(POSE.pinch, 0.6); a.flash('#ffffff', 0.15); a.emote('dizzy', 0.9);
    particles.popText(U.x, U.y - a.height - 80, 'Pinch!', '#ff6a4d', 52);
    particles.burst(c.x, c.y - 30, { type: 'star', count: 6, colors: ['#fff', '#ffd23f', '#ff8a6a'], speed: [160, 340] });
    snd('td-crab', 'bonk', { vol: 0.8 }); voice(U.p.charId, 'ouch');
    fx.shake(this.n > 4 ? 3 : 6, 0.18);
    if (!U.p.isAI) U.p.ctrl.rumble(0.5, 180);
  }

  digChest(U) {
    const C = this.chest, t = this.t, a = U.a;
    const team = C.digs.some((d) => d.i !== U.i && t - d.t < 1.0);
    C.digs.push({ i: U.i, t }); C.helpers.add(U.i);
    const gain = team ? 2 : 1;
    C.progress = Math.min(C.need, C.progress + gain);
    C.shake = 0.35;
    a.squash(0.3);
    particles.burst(C.x, C.y - 30, { type: 'drop', count: 10, colors: SAND, angle: -Math.PI / 2, spread: 1.2, speed: [260, 520] });
    snd('td-chest-thunk', 'hit', { vol: 0.8 });
    if (!C.revealed) {
      C.revealed = true;
      particles.popText(C.x, C.y - 170, 'Treasure chest!', '#ffd23f', 50);
      sfx('crowd-ooh', { vol: 0.7, fallback: 'magic' });
      a.emote('exclaim', 1);
    }
    if (team) particles.popText(C.x, C.y - 120, 'Team dig! x2', '#6fe3b4', 42);
    if (!U.p.isAI) U.p.ctrl.rumble(0.35, 120);
    if (C.progress >= C.need) this.openChest(U);
  }

  openChest(U) {
    const C = this.chest;
    C.opened = true; C.openT = 0;
    for (const i of C.helpers) {
      const V = this.units[i];
      V.score += CHEST_PTS; V.finds++;
      V.stun = 0; V.dig = 0;
      V.a.playOnce(POSE.jackpot, 1.2); V.a.emote('sparkle', 1.2);
      particles.popText(V.x, V.y - V.a.height - 100, `+${CHEST_PTS}`, '#ffd23f', 64);
      voice(V.p.charId, 'woo');
      if (!V.p.isAI) V.p.ctrl.rumble(0.7, 260);
    }
    particles.burst(C.x, C.y - 70, { type: 'confetti', count: 40, colors: ['#ffd23f', '#fff6a8', '#ffb400', '#ffffff'], speed: [350, 800] });
    particles.burst(C.x, C.y - 70, { type: 'star', count: 16, colors: ['#ffd23f', '#fff6a8'], speed: [200, 560] });
    particles.ring(C.x, C.y - 50, '#ffd23f', 180, 0.5);
    particles.popText(C.x, C.y - 220, C.helpers.size > 1 ? 'Team treasure!' : 'Chest opened!', '#ffffff', 52);
    snd('td-chest-open', 'fanfare'); sfx('coin'); sfx('bigpop', { vol: 0.6 });
    fx.flash('#fff3b0', 0.2); fx.shake(10, 0.3); fx.slowmo(0.5, 0.5);
    if (this.api.camera) this.api.camera.punch(C.x, C.y - 60, 1.25, 0.6);
  }

  // --- waves -----------------------------------------------------------------------------
  startWave() {
    this.wave = { id: this.waveIdx, t: 0, reach: rand(560, 680), edge: SHORE, peaked: false };
    snd('td-wave', 'water'); sfx('whoosh', { vol: 0.6 });
    this.showBanner('Big wave!', '#7fe0ff');
  }

  waveEdge(w) {
    const up = 1.4, hold = 0.5, down = 1.6;
    if (w.t < up) return lerp(SHORE - 30, w.reach, ease.outCubic(w.t / up));
    if (w.t < up + hold) return w.reach + Math.sin((w.t - up) * 6) * 6;
    return lerp(w.reach, SHORE - 30, ease.inOutQuad(clamp((w.t - up - hold) / down, 0, 1)));
  }

  updateWave(dt) {
    const w = this.wave;
    if (!w) return;
    w.t += dt;
    w.edge = this.waveEdge(w);
    if (Math.random() < dt * 30) particles.burst(rand(0, W), w.edge + rand(-6, 6), { type: 'bubble', count: 1, colors: ['#ffffff', '#dff7ff'], speed: [20, 80] });
    if (!w.peaked && w.t >= 1.4) {
      w.peaked = true;
      // The sea nudges the treasure it covered and smooths the holes.
      for (const T of this.treasures) {
        if (T.y > w.reach - 10) continue;
        const ang = rand(TAU), d = rand(90, 170);
        T.x = clamp(T.x + Math.cos(ang) * d, ARENA.x0 + 60, ARENA.x1 - 60);
        T.y = clamp(T.y + Math.sin(ang) * d * 0.7, ARENA.y0 + 40, ARENA.y1 - 50);
      }
      for (const h of this.holes) if (h.y < w.reach + 10) h.fill = Math.max(h.fill, 0.01);
      // ...and leaves a starfish or two on the sand
      const k = this.n <= 3 ? 1 : 2;
      for (let i = 0; i < k; i++) this.gifts.push({ x: rand(ARENA.x0 + 80, ARENA.x1 - 80), y: clamp(w.reach - rand(30, 110), ARENA.y0 + 20, ARENA.y1), t: 0, life: 9, kind: 'starfish' });
      sfx('splash', { vol: 0.7 });
    }
    if (w.t > 3.6) this.wave = null;
  }

  // --- crabs, gifts, holes, chest --------------------------------------------------------
  updateThings(dt) {
    for (const c of this.crabs) {
      c.t += dt;
      if (c.t < 0.3) c.z = Math.sin((c.t / 0.3) * Math.PI * 0.5) * 30;
      else if (!c.pinched) { if (!this.over) this.pinch(c); }
      else { c.z = Math.max(0, c.z - dt * 120); c.x += c.dir * 300 * dt; c.y -= 40 * dt; }
    }
    this.crabs = this.crabs.filter((c) => c.t < 2.6);
    for (const gft of this.gifts) {
      gft.t += dt;
      if (this.over) continue;
      for (const U of this.units) {
        if (gft.got || U.stun > 0 || U.hop > 0) continue;
        if (dist(U.x, U.y, gft.x, gft.y) < 58) {
          gft.got = true;
          U.score += LOOT.starfish.pts;
          U.a.playOnce(POSE.found, 0.5); U.a.squash(0.25);
          particles.popText(U.x, U.y - U.a.height - 60, '+1', '#ff9a4d', 52);
          particles.burst(gft.x, gft.y - 20, { type: 'sparkle', count: 10, colors: LOOT.starfish.sparks });
          sfx('collect', { step: 2 }); sfx('sparkle', { vol: 0.5 });
        }
      }
    }
    this.gifts = this.gifts.filter((gft) => !gft.got && gft.t < gft.life);
    for (const h of this.holes) {
      h.age += dt;
      if (h.fill > 0) h.fill += dt * 1.6;
      else if (h.age > 22) h.fill = 0.01;
    }
    this.holes = this.holes.filter((h) => h.fill < 1);
    const C = this.chest;
    if (C) {
      C.appear = Math.min(1, C.appear + dt * 3);
      C.shake = Math.max(0, C.shake - dt);
      if (C.opened) {
        C.openT += dt;
        if (C.openT < 1.2 && Math.random() < dt * 30) particles.burst(C.x + rand(-40, 40), C.y - 80, { type: 'star', count: 1, colors: ['#ffd23f', '#fff6a8'], speed: [200, 420], angle: -Math.PI / 2, spread: 0.7 });
        if (C.openT > 2.6) this.chest = null;
      }
    }
  }

  // --- CPU -------------------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, A = U.ai, lvl = clamp(p.aiLevel ?? 0, 0, 2), prof = aiProfile(p), t = this.t;
    if (U.dig > 0 || U.stun > 0 || U.hop > 0) { p.ctrl.move(0, 0); A.lastH = null; return; }
    // Easy (and a bit Normal) CPUs get distracted by the seagulls.
    if (A.distract > 0) {
      A.distract -= dt; p.ctrl.move(0, 0);
      if (A.distract <= 0) A.lastH = null;
      return;
    }
    if (chance(dt * [0.1, 0.035, 0][lvl])) { A.distract = rand(0.6, 1.4); U.a.emote('question', 0.8); p.ctrl.move(0, 0); return; }
    // Visible goals first: a washed-up starfish nearby, or a chest someone uncovered.
    let goal = null;
    let gd = [260, 380, 520][lvl];
    for (const gft of this.gifts) { const d = dist(U.x, U.y, gft.x, gft.y); if (d < gd) { gd = d; goal = { x: gft.x, y: gft.y, kind: 'gift' }; } }
    const C = this.chest;
    if (!goal && C && C.revealed && !C.opened) {
      if (A.chestPref === null || t > A.prefT) { A.chestPref = chance([0.5, 0.75, 0.95][lvl]); A.prefT = t + 4; }
      const d = dist(U.x, U.y, C.x, C.y);
      if (A.chestPref && d < [700, 1000, 2400][lvl]) {
        const ang = (U.i / this.n) * TAU;
        goal = { x: C.x + Math.cos(ang) * 62, y: C.y + Math.sin(ang) * 34, kind: 'chest' };
      }
    }
    if (goal) {
      const d = dist(U.x, U.y, goal.x, goal.y);
      if (goal.kind === 'chest' && dist(U.x, U.y, C.x, C.y) < CHEST_R * 0.82) {
        p.ctrl.move(0, 0);
        if (A.digAt < 0) A.digAt = t + reactionTime(p) * [1.0, 0.6, 0.3][lvl];
        if (t >= A.digAt) { p.ctrl.press('a'); A.digAt = -1; }
        return;
      }
      const ang = Math.atan2(goal.y - U.y, goal.x - U.x) + Math.sin(t * 2.1 + U.i) * prof.aimError * 0.4;
      const k = clamp(d / 40, 0, 1) * prof.speed;
      p.ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
      A.lastH = null;
      return;
    }
    // The detector. "!" = dig here (the same badge a human sees).
    const h = U.heat;
    if (h >= BANG) {
      p.ctrl.move(0, 0);
      if (A.digAt < 0) A.digAt = t + reactionTime(p) * [1.3, 0.8, 0.45][lvl];
      if (t >= A.digAt) { p.ctrl.press('a'); A.digAt = -1; }
      return;
    }
    A.digAt = -1;
    // Follow the warm-cold gradient: walk, compare readings, turn by how much colder it got.
    A.sampleT -= dt;
    if (A.sampleT <= 0) {
      const interval = [0.6, 0.42, 0.3][lvl] * (h > 0.75 ? 0.7 : 1);
      A.sampleT = interval * rand(0.85, 1.15);
      const q = [0.05, 0.03, 0.02][lvl], noise = [0.03, 0.015, 0.006][lvl];
      const hr = Math.round(clamp(h + rand(-1, 1) * noise, 0, 1) / q) * q;
      const moved = dist(U.x, U.y, A.px, A.py), mdir = Math.atan2(U.y - A.py, U.x - A.px);
      if (A.lastH !== null && moved > 25) {
        if (hr <= 0 && A.lastH <= 0) A.dir = mdir + rand(-0.5, 0.5);
        else {
          let cos = clamp(((hr - A.lastH) * RANGE) / moved, -1, 1);
          if (lvl === 0 && makesMistake(p) && chance(0.5)) cos = rand(-1, 1);
          if (cos > 0.88) { A.dir = mdir + rand(-1, 1) * prof.aimError * 0.3; A.turned = false; }
          else {
            // after a turn: better than before = right way, keep turning that way; worse = flip
            if (A.turned) { if (cos < A.lastCos + 0.1) A.sign = -A.sign; } else A.sign = chance(0.5) ? 1 : -1;
            A.dir = mdir + A.sign * Math.acos(cos) + rand(-1, 1) * prof.aimError * 0.5;
            A.turned = true;
          }
          A.lastCos = cos;
        }
        // patience: no progress for a while -> try somewhere new
        if (hr > A.best + 0.03) { A.best = hr; A.stale = 0; } else A.stale += interval;
        if (A.stale > [3.5, 3, 2.5][lvl]) { A.dir = rand(TAU); A.stale = 0; A.best = hr; A.turned = false; }
        // Easy sometimes digs too soon when it gets warm
        if (lvl === 0 && hr > 0.82 && chance(0.12)) { p.ctrl.press('a'); }
        else if (lvl === 1 && hr > 0.9 && chance(0.04)) { p.ctrl.press('a'); }
      } else if (A.lastH === null) { A.best = hr; }
      A.lastH = hr; A.px = U.x; A.py = U.y;
    }
    // keep off the walls
    const m = 70;
    let cx = Math.cos(A.dir), cy = Math.sin(A.dir);
    if ((U.x < ARENA.x0 + m && cx < 0) || (U.x > ARENA.x1 - m && cx > 0)) { cx = -cx; A.dir = Math.atan2(cy, cx); A.lastH = null; }
    if ((U.y < ARENA.y0 + m && cy < 0) || (U.y > ARENA.y1 - m && cy > 0)) { cy = -cy; A.dir = Math.atan2(cy, cx); A.lastH = null; }
    const k = prof.speed * (h > 0.85 ? 0.5 : h > 0.7 ? 0.75 : 1);
    p.ctrl.move(cx * k, cy * k);
  }

  endGame() {
    this.over = true;
    const scores = this.units.map((u) => u.score);
    const placements = placementsFromScores(scores);
    const stats = this.units.map((u) => `${u.score} pts`);
    sfx('whistle');
    for (const u of this.units) { u.dig = 0; u.a.playOnce(placements[u.i] === 1 ? 'celebrate' : 'idle', 1.2); }
    const fu = this.units[placements.indexOf(1)];
    this.api.finish({ placements, stats, solo: scores[0], focus: { x: fu.x, y: fu.y - fu.a.height / 2, zoom: 1.3 } });
  }

  // --- drawing ---------------------------------------------------------------------------------
  draw(g) {
    const t = this.t + this.t0;
    const bg = art('bg/treasure-dig');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(this.bg, 0, 0);
    // The painted beach's foam meets the sand at y ~255-300 (mean ~283), a bit
    // below the procedural SHORE; the lapping foam follows the painting.
    this.shoreY = bg ? PAINTED_SHORE : SHORE;
    this.drawShoreline(g, t);
    for (const h of this.holes) drawHole(g, h.x, h.y, h.r * (0.35 + 0.65 * ease.outCubic(h.grow)), 1 - clamp(h.fill, 0, 1));
    if (this.wave) this.drawWave(g, t);
    for (const U of this.units) this.drawRings(g, U);
    const list = [];
    for (const U of this.units) list.push({ y: U.y, fn: () => this.drawUnit(g, U, t) });
    for (const c of this.crabs) list.push({ y: c.y, fn: () => this.drawCrabE(g, c, t) });
    for (const gft of this.gifts) list.push({ y: gft.y, fn: () => this.drawGift(g, gft, t) });
    if (this.chest && this.chest.revealed) list.push({ y: this.chest.y + 10, fn: () => this.drawChestE(g, this.chest, t) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();
  }

  drawShoreline(g, t) {
    // lapping foam along the shore
    const S = this.shoreY || SHORE;
    const edge = (x) => S + 6 + Math.sin(t * 1.3) * 10 + Math.sin(x * 0.006 + t * 0.8) * 8 + Math.sin(x * 0.019 - t) * 4;
    g.save();
    g.fillStyle = 'rgba(127,224,240,0.55)';
    g.beginPath(); g.moveTo(0, S - 30);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, edge(x));
    g.lineTo(W, S - 30); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6; g.lineJoin = 'round';
    g.beginPath(); for (let x = 0; x <= W; x += 40) g.lineTo(x, edge(x)); g.stroke();
    // sea twinkles
    for (let i = 0; i < 10; i++) {
      const k = (t * 0.5 + i * 0.37) % 1;
      g.globalAlpha = Math.sin(k * Math.PI) * 0.9;
      g.fillStyle = '#ffffff';
      const x = ((i * 311) % 1880) + 20, y = 110 + ((i * 53) % 120);
      g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 3, y); g.lineTo(x, y + 9); g.lineTo(x - 3, y); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x, y + 3); g.lineTo(x + 9, y); g.lineTo(x, y - 3); g.closePath(); g.fill();
    }
    g.restore();
  }

  drawWave(g, t) {
    const w = this.wave, e = w.edge;
    const edge = (x) => e + Math.sin(x * 0.008 + t * 2) * 14 + Math.sin(x * 0.021 - t * 3) * 6;
    g.save();
    // Over the painted sea the wave body fades in from the open water, so its
    // top edge doesn't show as a hard horizontal seam across the painting.
    const painted = (this.shoreY || SHORE) !== SHORE;
    const top = painted ? 120 : SHORE - 40;
    const gr = g.createLinearGradient(0, top, 0, Math.max(e + 20, top + 1));
    if (painted) {
      const k = clamp((SHORE - top) / Math.max(1, e + 20 - top), 0, 1);
      gr.addColorStop(0, 'rgba(69,192,236,0)'); gr.addColorStop(k, 'rgba(69,192,236,0.8)');
    } else gr.addColorStop(0, 'rgba(69,192,236,0.85)');
    gr.addColorStop(1, 'rgba(140,228,245,0.75)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, top);
    for (let x = 0; x <= W; x += 30) g.lineTo(x, edge(x));
    g.lineTo(W, top); g.closePath(); g.fill();
    // foam edge
    g.fillStyle = '#ffffff';
    for (let x = 0; x <= W; x += 46) { g.beginPath(); g.arc(x + Math.sin(x + t * 4) * 6, edge(x) - 4, 16 + Math.sin(x * 0.3 + t * 5) * 4, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 4;
    for (let k = 1; k <= 3; k++) { g.beginPath(); for (let x = 0; x <= W; x += 40) g.lineTo(x, edge(x) - k * 40 + Math.sin(x * 0.02 + t * 3 + k) * 6); g.stroke(); }
    g.restore();
  }

  ringR(U) { return Math.max(44, U.a.width * 0.4) * (U.a.scale / this.scale) * 0.95 + 8; }

  drawRings(g, U) {
    const r = this.ringR(U), h = U.shown;
    g.save();
    // ripples: one per beep, in the detector's colour
    for (const rp of U.ripples) {
      const k = rp.t / 0.7;
      const rr = r + 8 + ease.outCubic(k) * 120;
      g.globalAlpha = (1 - k) * 0.85;
      g.strokeStyle = heatColor(rp.h); g.lineWidth = 7 * (1 - k) + 1.5;
      g.beginPath(); g.ellipse(U.x, U.y + 2, rr, rr * 0.36, 0, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
    // heat ring (glows when hot)
    if (h > 0.6) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (h - 0.6) * 1.6 * (0.6 + 0.4 * U.pulse);
      g.strokeStyle = heatColor(h); g.lineWidth = 22;
      g.beginPath(); g.ellipse(U.x, U.y + 2, r + 10, (r + 10) * 0.36, 0, 0, TAU); g.stroke(); g.restore();
    }
    g.strokeStyle = NAVY; g.lineWidth = 10 + h * 6;
    g.beginPath(); g.ellipse(U.x, U.y + 2, r + 10, (r + 10) * 0.36, 0, 0, TAU); g.stroke();
    g.strokeStyle = heatColor(h, U.pulse * 40); g.lineWidth = 6 + h * 6;
    g.beginPath(); g.ellipse(U.x, U.y + 2, r + 10, (r + 10) * 0.36, 0, 0, TAU); g.stroke();
    g.restore();
  }

  drawUnit(g, U, t) {
    const a = U.a, p = U.p, sc = a.scale;
    a.draw(g, { ring: p.color });
    // seaweed draped on the head
    if (U.seaweed > 0) {
      const hp = a.anchor('head');
      g.save(); g.globalAlpha = clamp(U.seaweed / 0.4, 0, 1);
      g.translate(hp.x, hp.y + 18 * sc); g.rotate(Math.sin(t * 3) * 0.08);
      drawSeaweed(g, 74 * sc, t);
      g.restore();
    }
    // the shell detector floats beside the character (behind its back)
    const side = -a.facing;
    const tx = U.x + side * (Math.max(40, a.width * 0.42) + 32 * sc), ty = U.y - a.z - a.height * 0.62;
    U.gx = damp(U.gx, tx, 10, 1 / 60); U.gy = damp(U.gy, ty, 10, 1 / 60);
    const bob = Math.sin(t * 3 + U.i) * 6;
    const bang = U.heat >= BANG && U.dig <= 0;
    g.save(); g.translate(U.gx, U.gy + bob); g.rotate(Math.sin(t * 2 + U.i) * 0.1 + (U.pulse > 0.6 ? Math.sin(t * 60) * 0.05 : 0));
    drawDetector(g, 64 * sc, U.shown, U.pulse, t, bang);
    g.restore();
    if (bang) { g.save(); g.translate(U.gx + 8 * sc, U.gy + bob - 58 * sc); drawBang(g, 44 * sc, t); g.restore(); }
    // something held up: treasure or a silly find
    if (U.carry) {
      const c = U.carry, hp = a.anchor('head');
      const k = clamp(c.t / 0.32, 0, 1);
      const hx = hp.x, hy = hp.y - 50 * sc;
      const x = lerp(c.fx, hx, ease.outCubic(k)), y = lerp(c.fy - 10, hy, ease.outCubic(k)) - Math.sin(k * Math.PI) * 90;
      const fade = clamp((c.dur - c.t) / 0.25, 0, 1);
      const size = (c.kind === 'crown' ? 96 : 70) * sc * (0.6 + 0.4 * k) * (1 + 0.15 * (1 - fade));
      g.save(); g.globalAlpha = fade; g.translate(x, y + Math.sin(t * 6) * 3); g.rotate(Math.sin(t * 5) * 0.08);
      if (c.kind in LOOT) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const rg = g.createRadialGradient(0, 0, 2, 0, 0, size);
        rg.addColorStop(0, 'rgba(255,245,180,0.75)'); rg.addColorStop(1, 'rgba(255,220,120,0)');
        g.fillStyle = rg; g.fillRect(-size, -size, size * 2, size * 2); g.restore();
        drawLoot(g, c.kind, size, t);
      } else if (c.kind === 'sock') drawSock(g, size);
      else if (c.kind === 'duck') drawDuck(g, size);
      g.restore();
    }
    // tags while finding your character, plus the leader's crown pip
    if (this.t < 5) {
      const s2 = this.n > 5 ? 0.75 : 0.95;
      g.save(); g.translate(U.x, U.y - a.z - a.height - 30); g.scale(s2, s2); ui.playerTag(g, p, 0, 0); g.restore();
    }
  }

  drawCrabE(g, c, t) {
    const fade = clamp((2.6 - c.t) / 0.5, 0, 1);
    g.save(); g.globalAlpha = fade;
    g.fillStyle = 'rgba(80,50,20,0.25)'; g.beginPath(); g.ellipse(c.x, c.y, 30, 10, 0, 0, TAU); g.fill();
    g.translate(c.x, c.y - 26 - c.z);
    if (c.pinched) g.rotate(Math.sin(t * 20) * 0.08);
    drawCrab(g, 76, t * (c.pinched ? 1.6 : 0.5), c.t > 0.15 && c.t < 0.6 ? 1 : 0.2);
    g.restore();
  }

  drawGift(g, gft, t) {
    const fade = clamp((gft.life - gft.t) / 0.8, 0, 1) * clamp(gft.t / 0.3, 0, 1);
    const blink = gft.life - gft.t < 2 ? 0.55 + 0.45 * Math.sin(t * 16) : 1;
    g.save(); g.globalAlpha = fade * blink;
    g.save(); g.globalCompositeOperation = 'lighter';
    const rg = g.createRadialGradient(gft.x, gft.y - 10, 2, gft.x, gft.y - 10, 60);
    rg.addColorStop(0, 'rgba(255,240,170,0.6)'); rg.addColorStop(1, 'rgba(255,220,120,0)');
    g.fillStyle = rg; g.fillRect(gft.x - 60, gft.y - 70, 120, 120); g.restore();
    g.translate(gft.x, gft.y - 14 - Math.abs(Math.sin(t * 3 + gft.x)) * 6);
    drawLoot(g, 'starfish', 56, t);
    g.restore();
  }

  drawChestE(g, C, t) {
    const w = 176;
    const emerge = C.opened ? 1 : 0.3 + 0.55 * (C.progress / C.need);
    const sink = (1 - emerge) * 90;
    const shake = C.shake > 0 ? Math.sin(t * 60) * 5 * (C.shake / 0.35) : 0;
    g.save();
    if (C.opened && C.openT > 2) g.globalAlpha = clamp((2.6 - C.openT) / 0.6, 0, 1);
    // sand mound behind
    g.fillStyle = '#e8c27e'; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(C.x, C.y, 120, 40, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#b98a4a'; g.beginPath(); g.ellipse(C.x, C.y - 4, 92, 28, 0, 0, TAU); g.fill();
    // the chest, rising out of the hole as it is dug
    g.save();
    g.beginPath(); g.rect(C.x - 200, C.y - 320, 400, 322); g.clip();
    g.translate(C.x + shake, C.y + sink);
    const open = C.opened ? ease.outBack(clamp(C.openT / 0.4, 0, 1)) : 0;
    drawChest(g, w, open, t);
    g.restore();
    // front lip of sand over the chest bottom
    g.fillStyle = '#f3d394'; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(C.x, C.y + 4, 104, 22, 0, 0, Math.PI); g.fill(); g.stroke();
    // progress pips
    if (!C.opened) {
      const y = C.y - (w * 0.46 * 1.62) + sink * 0.4 - 46;
      for (let i = 0; i < C.need; i++) {
        const x = C.x + (i - (C.need - 1) / 2) * 34;
        g.fillStyle = i < C.progress ? '#ffd23f' : 'rgba(255,255,255,0.7)'; g.strokeStyle = NAVY; g.lineWidth = 4;
        g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); g.stroke();
      }
      // shovel hint
      g.globalAlpha *= 0.85 + 0.15 * Math.sin(t * 6);
      ui.glyph(g, 'a', C.x + C.need * 17 + 30, y, 34);
    }
    g.restore();
  }

  drawHUD(g) {
    const t = this.t;
    const scores = this.units.map((u) => u.score);
    const m = Math.max(...scores);
    ui.scoreboard(g, this.players, scores, { y: 14, avoidCenter: true, format: (v) => String(v), highlight: scores.map((s) => m > 0 && s === m) });
    ui.timer(g, DURATION - t, W / 2, 54);
    let pillY = 148;
    if (this.rush) {
      const pulse = 1 + Math.sin(t * 8) * 0.04;
      g.save(); g.translate(W / 2, pillY); g.scale(pulse, pulse);
      ui.panel(g, -150, -32, 300, 64, { r: 32, fill: '#ffd23f' });
      ui.text(g, 'GOLD RUSH!', 0, 3, { size: 38, color: NAVY, stroke: false, weight: 800 });
      g.restore();
      pillY += 76;
    }
    if (this.warnAt >= 0) {
      const k = t - this.warnAt;
      g.save(); g.translate(W / 2, pillY); const s = 1 + Math.sin(t * 12) * 0.05; g.scale(s, s);
      ui.panel(g, -190, -32, 380, 64, { r: 32, fill: '#bdf2ff' });
      g.strokeStyle = '#2f9ee0'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); for (let i = 0; i <= 12; i++) g.lineTo(-170 + i * 5, Math.sin(i * 0.9 + k * 8) * 7); g.stroke();
      ui.text(g, 'Wave coming!', 24, 3, { size: 36, color: NAVY, stroke: false, weight: 800 });
      g.restore();
    }
    if (this.bannerText && t - this.bannerT < 1.6) {
      const k = t - this.bannerT;
      g.save(); g.globalAlpha = clamp((1.6 - k) / 0.3, 0, 1);
      ui.banner(g, this.bannerText, k, { size: 120, y: H / 2 - 150, color: this.bannerColor });
      g.restore();
    }
    // how-to strip for the first seconds: the colour scale + the dig button
    if (t < 6) {
      const al = t < 5 ? 1 : 1 - (t - 5);
      g.save(); g.globalAlpha = al;
      const pw = 1080, px = W / 2 - pw / 2, py = 990;
      ui.panel(g, px, py, pw, 72, { r: 36 });
      ui.text(g, 'cold', px + 60, py + 37, { size: 28, color: '#3fa7ff', stroke: false, weight: 800 });
      for (let i = 0; i < 40; i++) { g.fillStyle = heatColor(i / 39); g.fillRect(px + 100 + i * 6, py + 24, 7, 26); }
      g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(px + 100, py + 24, 240, 26);
      ui.text(g, 'HOT', px + 380, py + 37, { size: 28, color: '#ff4d4d', stroke: false, weight: 800 });
      ui.glyph(g, 'a', px + 460, py + 36, 46, { pulse: true });
      ui.text(g, 'Dig when your shell shows the red  !', px + 500, py + 37, { size: 32, color: NAVY, stroke: false, align: 'left', maxWidth: pw - 530 });
      g.restore();
    }
  }
}
