// Snowball Splat - a top-down snowball free-for-all in a snowy garden.
// Hold A on the snow to pack snowballs (up to 3), press RT to throw the way you
// face (or aim with the right stick). Every splat on a friend is +1. Hide
// behind snow-fort walls and snowmen: they crumble when hit, then pop back up.
// Power-ups: a GIANT snowball that rolls over everyone in its path, and the
// red triple mitten (three snowballs per throw). Most splats in 50 s wins.
//
// Art hooks (optional; the procedural fallbacks in snowball-splat/art.js ship
// today): bg/snowball-splat, prop/snowball, prop/giant-snowball,
// prop/triple-mitten, prop/powerup-giant, prop/snow-splat, prop/face-splat,
// prop/snow-wall, prop/snow-wall-side, prop/snow-rubble, prop/snowman,
// prop/snowman-nohat, prop/snowman-body, prop/snowman-pile.
// Poses used (all existing): crouch (scooping), throw, carry (giant overhead),
// knockback -> dizzy (splatted), cheer, celebrate, walk/run/idle.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { art } from '../engine/art.js';
import { input } from '../engine/input.js';
import { aiProfile, Brain } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, TAU, placementsFromScores } from '../engine/util.js';
import {
  NAVY, ARENA, POND, WALL_H, buildBackground, drawThumb, drawSnowball, drawShadow, drawGiantBall, drawMitten,
  drawGroundSplat, drawFaceSplat, drawPowerup, drawWall, drawRubble, drawSnowman, drawSnowmanPile, drawHat,
} from './snowball-splat/art.js';

// New sounds go through a fallback until the lead generates them.
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

// --- tuning ---------------------------------------------------------------------
const DURATION = 50;
const FRENZY_AT = 40;                    // last 10 s: snow frenzy (scoop twice as fast)
const WALK = 330, ICE_ACCEL = 2.2;       // on the pond you slide
const MAX_AMMO = 3, SCOOP_T = 0.5;
const THROW_CD = 0.26;
const BALL_SPEED = 1080, RANGE = 700, ARC = 62;
const GIANT_SPEED = 760, GIANT_RANGE = 1500;
const STUN = 0.8, INVULN = 1.35, KNOCK = 540;
const MITTEN_T = 8;
const WALL_HP = 4, SNOWMAN_HP = 3, WALL_REBUILD = 6.5, SNOWMAN_REBUILD = 7.5;
const PU_LIFE = 12;

// CPU tuning per level (Easy, Normal, Hard)
const CADENCE = [[1.3, 2.1], [0.75, 1.2], [0.45, 0.75]];
const LEAD = [0.0, 0.6, 0.95];
const AIM_ERR = [0.32, 0.17, 0.08];
const DODGE = [0.12, 0.38, 0.62];
const WANT = [[1, 2], [2, 3], [3, 3]];

const WALLS = [
  { x: 520, y: 470, w: 230, d: 44 },
  { x: 1400, y: 470, w: 230, d: 44 },
  { x: 520, y: 845, w: 230, d: 44 },
  { x: 1400, y: 845, w: 230, d: 44 },
  { x: 245, y: 655, w: 44, d: 170 },
  { x: 1675, y: 655, w: 44, d: 170 },
];
const SNOWMEN = [
  { x: 960, y: 395, scarf: '#ff4d6d', hat: '#3fa7ff' },
  { x: 960, y: 925, scarf: '#36d17a', hat: '#ff6fd0' },
  { x: 655, y: 655, scarf: '#ffd23f', hat: '#9b5cff' },
  { x: 1265, y: 655, scarf: '#9b5cff', hat: '#ff9f1c' },
];
const SM_R = 40;
const ARENA_TOP = 280, ARENA_TOP_ART = 280;

const inIce = (x, y) => ((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2 < 1;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export const meta = {
  id: 'snowball-splat',
  title: 'Snowball Splat',
  category: 'party',
  type: 'Free-for-all',
  goal: 'Splat your friends with snowballs! Most splats wins.',
  controls: [['stick', 'Run around the snowy garden'], ['a', 'Hold: make snowballs'], ['rt', 'Throw!'], ['rstick', 'Aim (or just throw the way you face)']],
  tips: ['Hide behind snow walls and snowmen - they crumble, then pop back up!', 'Grab the GIANT snowball - it rolls over everyone!', 'The red mitten throws three at once. No snow on the ice!'],
  music: 'chase',
  duration: '50 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) { drawThumb(g, x, y, w, h, t); },
};

export class Game {
  constructor(api) {
    this.api = api;
    this.real = api.players;
    // Playing alone: a friendly Troll joins the snowball fight.
    this.npc = null;
    let players = this.real;
    if (players.length < 2) {
      this.npc = { index: players.length, tag: 'TROLL', color: '#6f7d3c', charId: 'troll', isAI: true, aiLevel: 0, ctrl: input.createAI(913) };
      players = [...players, this.npc];
    }
    this.players = players;
    const n = players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.over = false;
    this.frenzy = false; this.frenzyT = -10;
    this.scale = n <= 4 ? 1.0 : n <= 6 ? 0.86 : 0.76;
    this.R = n <= 4 ? 32 : n <= 6 ? 30 : 27;
    this.cam = api.camera;
    if (this.cam) this.cam.maxZoom = Math.min(this.cam.maxZoom, n <= 2 ? 1.22 : 1.14);
    // The painted background's fence base sits at y~365 (the procedural one at
    // ~250): keep feet below it so nobody stands on the fence rail.
    ARENA.y0 = art('bg/snowball-splat') ? ARENA_TOP_ART : ARENA_TOP;
    this.hatArt = !!art('prop/snowman');   // the art's hat is always blue
    this.walls = WALLS.map((w, i) => ({ ...w, kind: 'wall', hp: WALL_HP, state: 'up', downT: 0, grow: 1, wob: 0, seed: i * 13 + 5 }));
    this.snowmen = SNOWMEN.map((s, i) => ({ ...s, kind: 'snowman', r: SM_R, hp: SNOWMAN_HP, state: 'up', downT: 0, grow: 1, wob: 0, seed: i * 7 + 2 }));
    this.obstacles = [...this.walls, ...this.snowmen];
    this.balls = []; this.giants = []; this.pups = []; this.splats = []; this.dents = []; this.flyers = [];
    this.nextPU = 7; this.puKind = chance(0.5) ? 'giant' : 'mitten';
    this.flakes = Array.from({ length: 90 }, () => ({ x: rand(W), y: rand(H), v: rand(40, 90), s: rand(2, 5), ph: rand(TAU) }));
    this.units = players.map((p, i) => this.makeUnit(p, i));
    this.leader = -1;
    this.bg = buildBackground();
  }

  makeUnit(p, i) {
    const n = this.n;
    const ang = -Math.PI / 2 + (i / n) * TAU + 0.42;
    let x = POND.x + Math.cos(ang) * 640, y = POND.y + Math.sin(ang) * 285;
    ({ x, y } = this.freeSpot(x, y));
    const sc = this.scale * (p.charId === 'troll' ? 0.6 : 1);
    const a = new Actor(p, { scale: sc, x, y });
    a.facing = x < POND.x ? 1 : -1; a.snap();
    const U = {
      p, i, a, x, y, vx: 0, vy: 0, sc, aim: Math.atan2(POND.y - y, POND.x - x), face: Math.atan2(POND.y - y, POND.x - x),
      ammo: 1, scoopT: 0, scoopMode: false, cd: 0, stun: 0, inv: 0, score: 0, streak: 0,
      giant: false, mittenT: 0, splatT: 0, sayCd: rand(2, 4), noSnowCd: 0, dentT: 0,
      brain: new Brain(p),
      ai: { mode: 'fight', goal: { x, y }, target: null, nextThrow: rand(0.6, 1.4), err: 0, want: 2, dodgeT: 0, dodx: 0, dody: 0, wanderT: 0 },
    };
    // Held things ride the pose: a snowball in hand, the mitten, the giant ball overhead, a snowy face.
    a.attach((g, info) => {
      const r = Math.max(7, info.h * 0.065);
      if (U.giant) {
        drawGiantBall(g, 0, info.head.y - 4, Math.max(26, info.h * 0.24), this.t * 0.6);
      } else if (U.ammo > 0 && info.pose !== 'throw') drawSnowball(g, info.hand.x, info.hand.y, r);
      if (U.mittenT > 0) drawMitten(g, info.hand.x + r * 0.4, info.hand.y + r * 0.8, r * 3.2, 0.3);
    });
    a.attach((g, info) => {
      if (U.splatT <= 0) return;
      const r = info.h * 0.15;
      drawFaceSplat(g, info.eyes.x, info.eyes.y + r * 0.15, r, clamp(U.splatT / 0.5, 0, 1));
    });
    return U;
  }

  freeSpot(x, y) {
    for (let k = 0; k < 30; k++) {
      if (!this.blocked(x, y, this.R + 14) && !inIce(x, y)) break;
      x = lerp(x, POND.x, 0.06) + rand(-30, 30); y = lerp(y, POND.y, 0.06) + rand(-20, 20);
    }
    return { x: clamp(x, ARENA.x0 + 40, ARENA.x1 - 40), y: clamp(y, ARENA.y0 + 30, ARENA.y1 - 30) };
  }

  // --- world queries ------------------------------------------------------------------
  /** Standing obstacle covering the ground point (x, y), padded by r. */
  obstacleAt(x, y, r = 0) {
    for (const o of this.obstacles) {
      if (o.state !== 'up') continue;
      if (o.kind === 'wall') {
        const cx = clamp(x, o.x - o.w / 2, o.x + o.w / 2), cy = clamp(y, o.y - o.d / 2, o.y + o.d / 2);
        if (Math.hypot(x - cx, y - cy) < r || (cx === x && cy === y)) return o;
      } else if (Math.hypot(x - o.x, y - o.y) < o.r + r) return o;
    }
    return null;
  }
  blocked(x, y, r) { return !!this.obstacleAt(x, y, r); }
  /** Clear throwing line between two ground points? */
  lineClear(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(2, Math.ceil(d / 22));
    for (let s = 1; s < steps; s++) { const k = s / steps; if (this.obstacleAt(lerp(x0, x1, k), lerp(y0, y1, k), 10)) return false; }
    return true;
  }
  hitR(U) { return this.R + 14 + (U.a.width > 230 * U.sc ? 16 : 0); }

  // --- frame ------------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    this.updateFlakes(dt);
    for (const U of this.units) { U.a.setPose('idle'); U.a.facing = Math.cos(U.face) >= 0 ? 1 : -1; this.placeActor(U); U.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    if (!this.frenzy && this.t >= FRENZY_AT) this.startFrenzy();
    this.updateFlakes(dt);
    this.updateObstacles(dt);
    this.updatePowerups(dt);
    for (const U of this.units) this.updateUnit(U, dt);
    this.collide();
    this.updateBalls(dt);
    this.updateGiants(dt);
    this.updateDecals(dt);
    const sc = this.units.map((u) => u.score), m = Math.max(...sc);
    const lead = m > 0 && sc.filter((s) => s === m).length === 1 ? sc.indexOf(m) : -1;
    if (lead >= 0 && lead !== this.leader && this.leader !== -2 && m >= 3) {
      const L = this.units[lead];
      particles.popText(L.x, Math.max(330, L.y - L.a.height - 70), 'Top splatter!', '#ffd23f', 40);
    }
    this.leader = lead;
    this.frameCamera();
    for (const U of this.units) U.a.update(dt);
    if (this.t >= DURATION && !this.over) this.endGame();
  }

  postUpdate(dt) {
    this.t0 += dt;
    this.updateFlakes(dt);
    this.updateBalls(dt);
    this.updateGiants(dt);
    this.updateDecals(dt);
    for (const U of this.units) {
      U.splatT = Math.max(0, U.splatT - dt);
      U.vx = damp(U.vx, 0, 6, dt); U.vy = damp(U.vy, 0, 6, dt);
      U.x += U.vx * dt; U.y += U.vy * dt; this.placeActor(U);
      U.a.update(dt);
    }
  }

  startFrenzy() {
    this.frenzy = true; this.frenzyT = this.t;
    snd('snow-frenzy', 'fanfare'); fx.flash('#e6f6ff', 0.25);
    for (let i = 0; i < 90; i++) this.flakes.push({ x: rand(W), y: rand(-H, 0), v: rand(70, 140), s: rand(2, 6), ph: rand(TAU) });
    this.spawnPowerup();
    for (const U of this.units) if (!U.p.isAI || chance(0.4)) U.a.emote('exclaim', 0.8);
  }

  frameCamera() {
    const cam = this.cam; if (!cam) return;
    const pts = this.units.map((U) => ({ x: U.x, y: U.y - 70 }));
    for (const gb of this.giants) pts.push({ x: gb.x, y: gb.y });
    cam.frame(pts, 300, 1.6);
  }

  updateFlakes(dt) {
    for (const f of this.flakes) {
      f.y += f.v * dt; f.x += Math.sin(this.t0 + this.t + f.ph) * 18 * dt;
      if (f.y > H + 10) { f.y = -10; f.x = rand(W); }
    }
  }

  // --- units ------------------------------------------------------------------------------
  updateUnit(U, dt) {
    const p = U.p, a = U.a, c = p.ctrl;
    U.stun = Math.max(0, U.stun - dt); U.inv = Math.max(0, U.inv - dt); U.cd = Math.max(0, U.cd - dt);
    U.mittenT = Math.max(0, U.mittenT - dt); U.splatT = Math.max(0, U.splatT - dt);
    U.sayCd -= dt; U.noSnowCd -= dt;
    if (p.isAI) this.ai(U, dt);
    const onIce = inIce(U.x, U.y);
    let mx = c.x, my = c.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    if (mag > 0.25) U.face = Math.atan2(my, mx);
    // aim: right stick, else the way you face (with a friendly nudge toward
    // someone in front of you for humans)
    const rmag = Math.hypot(c.rx, c.ry);
    const raw = rmag > 0.35 ? Math.atan2(c.ry, c.rx) : U.face;
    U.aim = p.isAI ? raw : this.assist(U, raw, rmag > 0.35 ? 0.14 : 0.42);

    // packing: hold A (B works too); throwing is only RT (RB / X too), so the two never mix
    const stunned = U.stun > 0;
    const wantScoop = !stunned && !U.giant && U.ammo < MAX_AMMO && (c.held('a') || c.held('b'));
    let scooping = false;
    if (wantScoop) {
      if (onIce) {
        if (U.noSnowCd <= 0) { U.noSnowCd = 1.6; particles.popText(U.x, U.y - a.height - 30, 'No snow on ice!', '#bfe9ff', 34); sfx('error', { vol: 0.4 }); }
      } else {
        scooping = true;
        U.scoopT += dt * (this.frenzy ? 2 : 1);
        U.dentT -= dt;
        if (U.dentT <= 0) {
          U.dentT = 0.12;
          const fxx = U.x + Math.cos(U.face) * 26;
          particles.burst(fxx, U.y + 4, { type: 'spark', count: 2, colors: ['#ffffff', '#dcecff'], speed: [60, 160], angle: -Math.PI / 2, spread: 1.0, life: [0.25, 0.45], size: [4, 8], gravity: 600 });
          if (chance(0.35)) snd('snow-scoop', 'brush', { vol: 0.35 });
        }
        if (U.scoopT >= SCOOP_T) {
          U.scoopT = 0; U.ammo++;
          this.dents.push({ x: U.x + Math.cos(U.face) * 30 + rand(-8, 8), y: U.y + 6 + rand(-4, 4), t: 0 });
          a.squash(0.25);
          snd('snow-pack', 'pop', { vol: 0.7 }); sfx('collect', { step: U.ammo, vol: 0.5 });
          const hp = a.anchor('hand');
          particles.burst(hp.x, hp.y, { type: 'sparkle', count: 4, colors: ['#ffffff', '#cfe9ff'], speed: [40, 140], size: [10, 18] });
          if (U.ammo === MAX_AMMO && !p.isAI) particles.popText(U.x, U.y - a.height - 30, 'Full!', '#ffffff', 34);
        }
      }
    }
    if (!scooping) U.scoopT = Math.max(0, U.scoopT - dt * 0.5);

    // throw: RT (or RB / X, e.g. L or E on a keyboard)
    const throwPress = c.pressed('rt') || c.pressed('rb') || c.pressed('x');
    if (throwPress && !stunned && (U.giant || U.ammo > 0)) this.doThrow(U);

    // movement
    let tx = mx * WALK, ty = my * WALK;
    if (stunned || scooping) { tx = 0; ty = 0; }
    if (U.giant) { tx *= 0.82; ty *= 0.82; }
    if (onIce) {
      const k = stunned ? 0.4 : ICE_ACCEL;
      U.vx = damp(U.vx, tx * 1.15, k, dt); U.vy = damp(U.vy, ty * 1.15, k, dt);
      if (Math.hypot(U.vx, U.vy) > 160 && chance(dt * 14)) particles.burst(U.x, U.y, { type: 'sparkle', count: 1, colors: ['#ffffff', '#bfe9ff'], size: [8, 14], speed: [10, 40] });
    } else {
      U.vx = damp(U.vx, tx, stunned ? 4 : 12, dt); U.vy = damp(U.vy, ty, stunned ? 4 : 12, dt);
    }
    U.x += U.vx * dt; U.y += U.vy * dt;
    if (stunned && Math.hypot(U.vx, U.vy) > 120 && chance(dt * 30)) particles.burst(U.x, U.y, { type: 'dust', count: 1, colors: ['rgb(255,255,255)', 'rgb(220,235,255)'], speed: [20, 80], size: [10, 18] });

    // animation
    if (stunned) { if (!a._once && a.pose !== 'dizzy') a.setPose('dizzy'); }
    else if (scooping) { if (!a._once) a.setPose('snow-scoop'); a.facing = Math.cos(U.face) >= 0 ? 1 : -1; }
    else {
      if (a.pose === 'dizzy' || a.pose === 'snow-scoop') a.setPose('idle');
      if (U.giant && !a._once) { a.setPose('carry'); a.speed = clamp(Math.hypot(U.vx, U.vy) / WALK, 0, 1); if (Math.abs(U.vx) > 10) a.facing = U.vx > 0 ? 1 : -1; }
      else a.moveAnim(U.vx, U.vy, WALK, { run: Math.hypot(U.vx, U.vy) > WALK * 0.92 });
      // with nothing to do, face the way you aim
      if (Math.hypot(U.vx, U.vy) < 30 && !a._once) a.facing = Math.cos(U.aim) >= 0 ? 1 : -1;
    }
    this.placeActor(U);
  }

  placeActor(U) {
    U.a.x = U.x; U.a.y = U.y;
    U.a.scale = U.sc * depthScale(U.y, { top: ARENA.y0, near: ARENA.y1, far: 0.86, nearScale: 1.05 });
  }

  /** Gentle aim help: snap toward a rival inside a cone in front of you. */
  assist(U, ang, cone) {
    let best = null, bs = 1e9;
    for (const V of this.units) {
      if (V === U) continue;
      const d = Math.hypot(V.x - U.x, V.y - U.y);
      if (d > RANGE * 1.1 || d < 30) continue;
      const da = Math.abs(angDiff(Math.atan2(V.y - U.y, V.x - U.x), ang));
      if (da > cone) continue;
      const s = da * 600 + d * 0.4 + (V.inv > 0 ? 300 : 0);
      if (s < bs) { bs = s; best = V; }
    }
    return best ? Math.atan2(best.y - U.y, best.x - U.x) : ang;
  }

  doThrow(U) {
    const a = U.a;
    if (U.giant) { this.throwGiant(U); return; }
    if (U.cd > 0) return;
    U.ammo--; U.cd = THROW_CD; U.scoopT = 0;
    const spread = U.mittenT > 0 ? [-0.2, 0, 0.2] : [0];
    for (const da of spread) this.spawnBall(U, U.aim + da);
    a.playOnce('throw', 0.3); a.squash(-0.22);
    a.facing = Math.cos(U.aim) >= 0 ? 1 : -1;
    snd('snow-throw', 'whoosh', { vol: 0.7 });
    if (spread.length > 1) sfx('magic', { vol: 0.4 });
    if (!U.p.isAI) U.p.ctrl.rumble(0.2, 60);
  }

  spawnBall(U, ang) {
    const hp = U.a.anchor('hand');
    const z0 = clamp(U.y - hp.y, 40, 130);
    const cx = Math.cos(ang), cy = Math.sin(ang);
    this.balls.push({
      x: U.x + cx * 24, y: U.y + cy * 14, vx: cx * BALL_SPEED, vy: cy * BALL_SPEED, z0, z: z0, d: 0, range: RANGE,
      owner: U.i, color: U.p.color, trail: 0, seed: rand(100),
    });
  }

  throwGiant(U) {
    U.giant = false;
    const cx = Math.cos(U.aim), cy = Math.sin(U.aim);
    this.giants.push({ x: U.x + cx * 70, y: U.y + cy * 40, dx: cx, dy: cy, r: 40, d: 0, rot: 0, owner: U.i, hit: new Set([U.i]), smashed: new Set(), dust: 0, firstHit: false });
    U.a.playOnce('throw', 0.4); U.a.squash(0.35);
    U.cd = 0.4;
    snd('snow-giant-roll', 'whoosh'); sfx('stomp', { vol: 0.6 });
    fx.shake(8, 0.25);
    particles.burst(U.x + cx * 70, U.y + cy * 40, { type: 'dust', count: 10, colors: ['rgb(255,255,255)'], speed: [80, 220], size: [16, 30] });
    if (!U.p.isAI) U.p.ctrl.rumble(0.6, 200);
  }

  // --- hits --------------------------------------------------------------------------------
  splat(V, A, dx, dy, big = false) {
    const a = V.a;
    A.score += 1; A.streak++; V.streak = 0;
    V.stun = big ? STUN * 1.25 : STUN; V.inv = INVULN;
    const dl = Math.hypot(dx, dy) || 1;
    V.vx = (dx / dl) * KNOCK * (big ? 1.3 : 1); V.vy = (dy / dl) * KNOCK * (big ? 1.3 : 1);
    V.scoopMode = false; V.scoopT = 0; V.splatT = 1.9;
    a.playOnce('knockback', 0.45, 'dizzy'); a.flash('#ffffff', 0.25); a.squash(0.45); a.emote('dizzy', STUN + 0.2);
    const head = a.anchor('head');
    particles.burst(head.x, head.y + 20, { type: 'spark', count: 14, colors: ['#ffffff', '#e3f1ff', '#cfe6ff'], speed: [140, 420], size: [5, 10], gravity: 700 });
    particles.burst(head.x, head.y + 20, { type: 'dust', count: 6, colors: ['rgb(255,255,255)', 'rgb(225,238,255)'], speed: [40, 140], size: [14, 26] });
    particles.burst(head.x, head.y + 10, { type: 'star', count: big ? 8 : 4, colors: [A.p.color, '#ffd23f', '#ffffff'], speed: [160, 380], size: [12, 22] });
    particles.ring(head.x, head.y + 20, '#ffffff', 110, 0.35);
    particles.popText(head.x, head.y - 30, '+1', A.p.color, big ? 64 : 54);
    snd('snow-splat', 'splat'); sfx('pop', { vol: 0.5 });
    if (V.sayCd <= 0) { V.sayCd = rand(3, 6); a.say(pick(['Brrr!', 'Eek!', 'Hee hee!', 'Cold!', 'Splat!']), 1.1, 'laugh'); }
    else if (chance(0.5)) voice(V.p.charId, 'laugh');
    // the thrower cheers
    if (!A.giant) A.a.playOnce('cheer', 0.45);
    A.a.squash(0.2);
    if (A.streak === 3 || A.streak === 6) {
      particles.popText(A.x, A.y - A.a.height - 60, A.streak === 3 ? 'Snow star!' : 'Blizzard!', '#ffd23f', 46);
      particles.burst(A.x, A.y - A.a.height * 0.6, { type: 'star', count: 10, colors: ['#ffd23f', '#ffffff', A.p.color], speed: [180, 420] });
      sfx('star'); A.a.emote('star', 1.2);
      if (this.cam) this.cam.punch(A.x, A.y - 70, 1.15, 0.3);
    } else if (A.sayCd <= 0 && chance(0.3)) { A.sayCd = rand(4, 7); A.a.say(pick(['Got you!', 'Splat!', 'Hee!', 'Yay!']), 1.0, 'yay'); }
    fx.shake(this.n > 4 ? 4 : 8, 0.18); fx.hitstop(big ? 0.07 : 0.04);
    if (!V.p.isAI) V.p.ctrl.rumble(0.7, 220);
    if (!A.p.isAI) A.p.ctrl.rumble(0.35, 100);
    if (big && this.cam) this.cam.punch(V.x, V.y - 60, 1.2, 0.35);
  }

  damage(o, amount, bx, by) {
    if (o.state !== 'up') return;
    o.hp -= amount; o.wob = 0.35;
    const topY = o.kind === 'wall' ? o.y - WALL_H * 0.6 : o.y - 110;
    particles.burst(bx, Math.min(by, topY + 40), { type: 'spark', count: 8, colors: ['#ffffff', '#e3f1ff'], speed: [80, 260], size: [4, 9], gravity: 700 });
    if (o.kind === 'snowman' && o.hp === 2) {
      // the hat pops off and flies away
      this.flyers.push({ kind: 'hat', color: this.hatArt ? '#2f97f5' : o.hat, x: o.x, y: o.y, z: 168, vx: rand(-160, 160), vz: 520, rot: 0, vr: rand(-9, 9), t: 0 });
      sfx('boing', { vol: 0.6 });
    } else if (o.kind === 'snowman' && o.hp === 1) {
      this.flyers.push({ kind: 'head', x: o.x, y: o.y, z: 148, vx: rand(-200, 200), vz: 380, rot: 0, vr: rand(-7, 7), t: 0 });
      sfx('bounce', { vol: 0.6 });
    }
    if (o.hp <= 0) this.crumble(o);
    else snd('snow-thud', 'hit', { vol: 0.55 });
  }

  crumble(o) {
    o.state = 'down'; o.hp = 0; o.downT = o.kind === 'wall' ? WALL_REBUILD : SNOWMAN_REBUILD; o.grow = 0;
    sfx('crumble'); fx.shake(this.n > 4 ? 5 : 8, 0.25);
    const n = o.kind === 'wall' ? 18 : 12;
    for (let i = 0; i < n; i++) {
      const px = o.kind === 'wall' ? o.x + rand(-o.w / 2, o.w / 2) : o.x + rand(-30, 30);
      const py = o.kind === 'wall' ? o.y + rand(-o.d / 2, o.d / 2) - rand(10, WALL_H) : o.y - rand(20, 140);
      particles.burst(px, py, { type: 'shard', count: 1, colors: ['#ffffff', '#e8f2ff', '#cfe3fa'], speed: [120, 360], size: [10, 18] });
    }
    particles.burst(o.x, o.y - 30, { type: 'dust', count: 10, colors: ['rgb(255,255,255)', 'rgb(225,238,255)'], speed: [60, 200], size: [20, 36] });
  }

  updateObstacles(dt) {
    for (const o of this.obstacles) {
      o.wob = Math.max(0, o.wob - dt);
      if (o.state === 'up') { o.grow = Math.min(1, o.grow + dt * 2.6); continue; }
      o.downT -= dt;
      if (o.downT <= 0) {
        // don't rebuild on top of someone
        const pad = this.R + 4;
        const busy = this.units.some((U) => (o.kind === 'wall'
          ? Math.abs(U.x - o.x) < o.w / 2 + pad && Math.abs(U.y - o.y) < o.d / 2 + pad
          : Math.hypot(U.x - o.x, U.y - o.y) < o.r + pad));
        if (busy) { o.downT = 0.3; continue; }
        o.state = 'up'; o.hp = o.kind === 'wall' ? WALL_HP : SNOWMAN_HP; o.grow = 0;
        snd('snow-rebuild', 'grow', { vol: 0.6 });
        particles.burst(o.x, o.y - 40, { type: 'sparkle', count: 10, colors: ['#ffffff', '#bfe9ff', '#fff6a8'], speed: [60, 220], size: [12, 22] });
      }
    }
  }

  // --- snowballs -------------------------------------------------------------------------
  updateBalls(dt) {
    const keep = [];
    for (const b of this.balls) {
      const steps = Math.max(1, Math.ceil((BALL_SPEED * dt) / 16));
      const sdt = dt / steps;
      let alive = true;
      for (let s = 0; s < steps && alive; s++) {
        b.x += b.vx * sdt; b.y += b.vy * sdt; b.d += BALL_SPEED * sdt;
        const u = clamp(b.d / b.range, 0, 1);
        b.z = b.z0 * (1 - u) + ARC * 4 * u * (1 - u);
        // walls and snowmen catch it
        const o = this.obstacleAt(b.x, b.y, 6);
        if (o) { this.damage(o, 1, b.x, b.y - b.z); this.ballPoof(b, false); alive = false; break; }
        // players
        if (!this.over) {
          for (const V of this.units) {
            if (V.i === b.owner || V.inv > 0) continue;
            if (Math.hypot(V.x - b.x, (V.y - b.y) * 1.25) < this.hitR(V)) {
              this.splat(V, this.units[b.owner], b.vx, b.vy);
              alive = false; break;
            }
          }
          if (!alive) break;
        }
        if (u >= 1 || b.x < ARENA.x0 - 60 || b.x > ARENA.x1 + 60 || b.y < ARENA.y0 - 40 || b.y > ARENA.y1 + 40) { this.ballPoof(b, true); alive = false; }
      }
      if (!alive) continue;
      b.trail -= dt;
      if (b.trail <= 0) { b.trail = 0.03; particles.burst(b.x, b.y - b.z, { type: 'spark', count: 1, colors: ['#ffffff', '#e3f1ff'], speed: [5, 30], size: [3, 6], life: [0.15, 0.3], gravity: 0 }); }
      keep.push(b);
    }
    this.balls = keep;
  }

  ballPoof(b, ground) {
    if (ground) {
      this.splats.push({ x: b.x, y: b.y, r: rand(18, 26), seed: rand(100), t: 0 });
      particles.burst(b.x, b.y - 4, { type: 'spark', count: 7, colors: ['#ffffff', '#e3f1ff'], speed: [60, 200], size: [4, 8], angle: -Math.PI / 2, spread: 1.2, gravity: 700 });
      snd('snow-land', 'splat', { vol: 0.25 });
    } else {
      particles.burst(b.x, b.y - b.z, { type: 'spark', count: 9, colors: ['#ffffff', '#e3f1ff'], speed: [80, 260], size: [4, 9], gravity: 700 });
    }
  }

  updateGiants(dt) {
    const keep = [];
    for (const gb of this.giants) {
      const sp = GIANT_SPEED * (1 - 0.25 * (gb.d / GIANT_RANGE));
      gb.x += gb.dx * sp * dt; gb.y += gb.dy * sp * dt; gb.d += sp * dt;
      gb.r = Math.min(66, 40 + gb.d * 0.025);
      gb.rot += (sp * dt) / gb.r;
      gb.dust -= dt;
      if (gb.dust <= 0) { gb.dust = 0.05; particles.burst(gb.x - gb.dx * gb.r, gb.y - gb.dy * gb.r * 0.4, { type: 'dust', count: 2, colors: ['rgb(255,255,255)', 'rgb(225,238,255)'], speed: [30, 120], size: [14, 26] }); }
      // smash obstacles
      for (const o of this.obstacles) {
        if (o.state !== 'up' || gb.smashed.has(o)) continue;
        if (this.obstacleAt(gb.x, gb.y, gb.r * 0.7) === o) { gb.smashed.add(o); o.hp = 1; this.damage(o, 1, gb.x, gb.y - gb.r); fx.shake(10, 0.25); sfx('boom', { vol: 0.5 }); }
      }
      // bowl over players
      if (!this.over) {
        for (const V of this.units) {
          if (gb.hit.has(V.i)) continue;
          if (Math.hypot(V.x - gb.x, (V.y - gb.y) * 1.25) < gb.r + this.R) {
            gb.hit.add(V.i);
            // knocked to the side of the ball's path
            const side = (V.x - gb.x) * -gb.dy + (V.y - gb.y) * gb.dx >= 0 ? 1 : -1;
            this.splat(V, this.units[gb.owner], gb.dx * 0.6 - gb.dy * side, gb.dy * 0.6 + gb.dx * side, true);
            if (!gb.firstHit) { gb.firstHit = true; fx.slowmo(0.45, 0.45); }
          }
        }
      }
      const out = gb.x < ARENA.x0 - 20 || gb.x > ARENA.x1 + 20 || gb.y < ARENA.y0 - 10 || gb.y > ARENA.y1 + 30;
      if (gb.d >= GIANT_RANGE || out) {
        snd('snow-burst', 'bigpop'); fx.shake(12, 0.3);
        particles.burst(gb.x, gb.y - gb.r, { type: 'shard', count: 16, colors: ['#ffffff', '#e8f2ff', '#cfe3fa'], speed: [160, 480], size: [10, 20] });
        particles.burst(gb.x, gb.y - gb.r, { type: 'dust', count: 14, colors: ['rgb(255,255,255)'], speed: [80, 260], size: [24, 40] });
        particles.ring(gb.x, gb.y - gb.r * 0.5, '#ffffff', 220, 0.45);
        this.splats.push({ x: clamp(gb.x, ARENA.x0, ARENA.x1), y: clamp(gb.y, ARENA.y0, ARENA.y1), r: 60, seed: rand(100), t: 0 });
        continue;
      }
      keep.push(gb);
    }
    this.giants = keep;
  }

  updateDecals(dt) {
    for (const s of this.splats) s.t += dt;
    for (const d of this.dents) d.t += dt;
    this.splats = this.splats.filter((s) => s.t < 3.5).slice(-70);
    this.dents = this.dents.filter((d) => d.t < 5).slice(-60);
    for (const f of this.flyers) {
      f.t += dt; f.x += f.vx * dt; f.vz -= 1400 * dt; f.z += f.vz * dt; f.rot += f.vr * dt;
      if (f.z < 0) { f.z = 0; f.vz = Math.abs(f.vz) * 0.35; f.vx *= 0.6; f.vr *= 0.5; }
    }
    this.flyers = this.flyers.filter((f) => f.t < 1.8);
  }

  // --- power-ups -------------------------------------------------------------------------
  spawnPowerup() {
    const max = this.n > 4 ? 2 : 1;
    if (this.pups.length >= max) return;
    let x = 0, y = 0;
    for (let k = 0; k < 40; k++) {
      x = rand(ARENA.x0 + 120, ARENA.x1 - 120); y = rand(ARENA.y0 + 80, ARENA.y1 - 80);
      if (this.blocked(x, y, 70) || inIce(x, y)) continue;
      if (this.units.some((U) => Math.hypot(U.x - x, U.y - y) < 170)) continue;
      if (this.pups.some((q) => Math.hypot(q.x - x, q.y - y) < 300)) continue;
      break;
    }
    const kind = this.puKind; this.puKind = kind === 'giant' ? 'mitten' : 'giant';
    this.pups.push({ kind, x, y, z: 520, t: 0 });
    snd('snow-powerup', 'sparkle');
  }

  updatePowerups(dt) {
    if (this.t >= this.nextPU) { this.spawnPowerup(); this.nextPU = this.t + rand(8, 11); }
    for (const q of this.pups) {
      q.t += dt;
      q.z = Math.max(0, 520 - q.t * 1100);
      if (q.z === 0 && !q.landed) { q.landed = true; particles.burst(q.x, q.y, { type: 'sparkle', count: 10, colors: ['#ffffff', '#fff6a8', '#bfe9ff'], speed: [80, 260] }); particles.ring(q.x, q.y, '#ffffff', 120, 0.4); sfx('land', { vol: 0.5 }); }
      if (!q.landed) continue;
      for (const U of this.units) {
        if (U.stun > 0 || q.taken) continue;
        if (U.giant && q.kind === 'giant') continue;
        if (Math.hypot(U.x - q.x, U.y - q.y) < this.R + 44) { this.takePowerup(U, q); break; }
      }
    }
    this.pups = this.pups.filter((q) => !q.taken && q.t < PU_LIFE);
  }

  takePowerup(U, q) {
    q.taken = true;
    const a = U.a;
    if (q.kind === 'giant') {
      U.giant = true; U.scoopMode = false; U.scoopT = 0;
      particles.popText(U.x, U.y - a.height - 50, 'GIANT snowball!', '#bfe9ff', 46);
    } else {
      U.mittenT = MITTEN_T; U.ammo = MAX_AMMO;
      particles.popText(U.x, U.y - a.height - 50, 'Triple throw!', '#ff6f91', 46);
    }
    a.playOnce('cheer', 0.5); a.squash(0.35); a.emote('sparkle', 1);
    snd('snow-powerup-get', 'magic'); sfx('collect', { step: 5 });
    voice(U.p.charId, 'woo');
    particles.burst(q.x, q.y - 40, { type: 'star', count: 10, colors: ['#ffd23f', '#ffffff', q.kind === 'giant' ? '#bfe9ff' : '#ff6f91'], speed: [180, 420] });
    particles.ring(q.x, q.y - 30, '#ffffff', 140, 0.4);
    if (!U.p.isAI) U.p.ctrl.rumble(0.4, 140);
  }

  // --- collisions ---------------------------------------------------------------------------
  collide() {
    const R = this.R, U = this.units;
    for (let i = 0; i < U.length; i++) {
      for (let j = i + 1; j < U.length; j++) {
        const A = U[i], B = U[j];
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.001;
        if (d < R * 2) {
          const push = (R * 2 - d) / 2, nx = dx / d, ny = dy / d;
          A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
        }
      }
    }
    for (const u of U) {
      u.x = clamp(u.x, ARENA.x0 + R, ARENA.x1 - R); u.y = clamp(u.y, ARENA.y0 + R * 0.5, ARENA.y1 - R * 0.5);
      for (const o of this.obstacles) {
        if (o.state !== 'up') continue;
        if (o.kind === 'wall') {
          const cx = clamp(u.x, o.x - o.w / 2, o.x + o.w / 2), cy = clamp(u.y, o.y - o.d / 2, o.y + o.d / 2);
          const dx = u.x - cx, dy = u.y - cy, d = Math.hypot(dx, dy);
          if (d < R) {
            if (d > 0.001) { u.x = cx + (dx / d) * R; u.y = cy + (dy / d) * R; }
            else if (o.w >= o.d) u.y = u.y < o.y ? o.y - o.d / 2 - R : o.y + o.d / 2 + R;
            else u.x = u.x < o.x ? o.x - o.w / 2 - R : o.x + o.w / 2 + R;
          }
        } else {
          const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy) || 0.001;
          if (d < o.r + R) { u.x = o.x + (dx / d) * (o.r + R); u.y = o.y + (dy / d) * (o.r + R); }
        }
      }
      this.placeActor(u);
    }
  }

  // --- CPU ---------------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, c = p.ctrl, A = U.ai;
    const lvl = clamp(p.aiLevel ?? 0, 0, 2), prof = aiProfile(p);
    A.dodgeT -= dt; A.wanderT -= dt;
    if (U.stun > 0) { c.move(0, 0); c.hold('b', false); return; }
    if (U.brain.ready(dt)) { U.brain.wait(rand(...prof.reaction) * 0.6); this.aiDecide(U, lvl, prof); }
    // scooping in place
    const atGoal = Math.hypot(A.goal.x - U.x, A.goal.y - U.y) < 36;
    const scooping = A.mode === 'scoop' && (atGoal || lvl === 0) && U.ammo < A.want && !inIce(U.x, U.y);
    c.hold('b', scooping);
    if (scooping) c.move(0, 0);
    else if (A.dodgeT > 0) c.move(A.dodx, A.dody);
    else {
      const dx = A.goal.x - U.x, dy = A.goal.y - U.y, d = Math.hypot(dx, dy);
      if (d < 20) c.move(0, 0);
      else {
        let ang = Math.atan2(dy, dx) + Math.sin(this.t * 2.1 + U.i * 1.7) * prof.aimError * 0.4;
        ang = this.avoid(U, ang);
        const k = clamp(d / 60, 0.3, 1) * prof.speed;
        c.move(Math.cos(ang) * k, Math.sin(ang) * k);
      }
    }
    // aim and throw
    const T = A.target != null ? this.units[A.target] : null;
    if (!T || scooping || (!U.giant && U.ammo <= 0)) return;
    const d = Math.hypot(T.x - U.x, T.y - U.y);
    const speed = U.giant ? GIANT_SPEED : BALL_SPEED;
    const ft = d / speed;
    const px = T.x + T.vx * ft * LEAD[lvl], py = T.y + T.vy * ft * LEAD[lvl];
    const ang = Math.atan2(py - U.y, px - U.x) + A.err;
    c.aim(Math.cos(ang), Math.sin(ang));
    const range = U.giant ? 1000 : RANGE * 0.92;
    if (d > range || this.t < A.nextThrow || U.cd > 0) return;
    if (T.inv > 0.25 && !(lvl === 0 && chance(0.02))) return;
    if (!this.lineClear(U.x, U.y, px, py) && !(lvl === 0 && chance(0.3))) { A.nextThrow = this.t + 0.25; return; }
    c.press('rt');
    A.nextThrow = this.t + rand(...CADENCE[lvl]) * (U.mittenT > 0 ? 0.7 : 1);
    A.err = rand(-1, 1) * AIM_ERR[lvl] * (U.giant ? 0.5 : 1);
  }

  aiDecide(U, lvl, prof) {
    const A = U.ai;
    // dodge incoming snowballs (they're visible to everyone)
    if (A.dodgeT <= 0) {
      for (const b of this.balls) {
        if (b.owner === U.i) continue;
        const rx = U.x - b.x, ry = U.y - b.y;
        const along = (rx * b.vx + ry * b.vy) / BALL_SPEED;
        if (along < 0 || along > 340) continue;
        const perp = (rx * -b.vy + ry * b.vx) / BALL_SPEED;
        if (Math.abs(perp) > this.hitR(U) + 14) continue;
        if (chance(DODGE[lvl])) {
          const sgn = perp >= 0 ? 1 : -1;
          A.dodx = (-b.vy / BALL_SPEED) * sgn; A.dody = (b.vx / BALL_SPEED) * sgn;
          A.dodgeT = 0.32;
        }
        break;
      }
    }
    // Easy CPUs get distracted now and then
    if (lvl === 0 && A.wanderT <= 0 && chance(prof.mistake * 0.12)) {
      A.wanderT = rand(0.8, 1.6); A.mode = 'wander';
      A.goal = this.freeSpot(U.x + rand(-260, 260), U.y + rand(-160, 160));
      if (chance(0.5)) U.a.emote('question', 0.9);
      return;
    }
    if (A.mode === 'wander' && A.wanderT > 0) return;
    const foes = this.units.filter((V) => V !== U);
    let near = null, nd = 1e9;
    for (const V of foes) { const d = Math.hypot(V.x - U.x, V.y - U.y); if (d < nd) { nd = d; near = V; } }
    // power-ups
    let pu = null, pd = [330, 480, 640][lvl];
    for (const q of this.pups) {
      if (!q.landed && lvl < 2) continue;
      if (q.kind === 'giant' && U.giant) continue;
      const d = Math.hypot(q.x - U.x, q.y - U.y);
      if (d < pd) { pd = d; pu = q; }
    }
    if (pu && !(A.mode === 'scoop' && U.ammo === 0 && lvl === 0)) { A.mode = 'grab'; A.goal = { x: pu.x, y: pu.y }; A.target = this.pickTarget(U, lvl, foes); return; }
    // need snowballs?
    const needAmmo = !U.giant && (U.ammo === 0 || (A.mode === 'scoop' && U.ammo < A.want));
    const panic = lvl === 2 && U.ammo >= 1 && nd < 240;
    if (needAmmo && !panic) {
      if (A.mode !== 'scoop' || this.coverGone(A) || inIce(A.goal.x, A.goal.y)) {
        A.mode = 'scoop'; A.want = randInt(...WANT[lvl]);
        A.goal = this.scoopSpot(U, lvl, near); A.cover = this.obstacleNear(A.goal);
      }
      A.target = null;
      return;
    }
    // fight
    A.mode = 'fight';
    A.target = this.pickTarget(U, lvl, foes, A.target);
    const T = A.target != null ? this.units[A.target] : null;
    if (!T) { A.goal = { x: U.x, y: U.y }; return; }
    const d = Math.hypot(T.x - U.x, T.y - U.y);
    const want = U.giant ? 520 : [400, 430, 470][lvl];
    const los = this.lineClear(U.x, U.y, T.x, T.y);
    let gx, gy;
    if (!los && lvl > 0) {
      // step around the cover to get a clear line
      const base = Math.atan2(U.y - T.y, U.x - T.x) + (chance(0.5) ? 0.7 : -0.7);
      gx = T.x + Math.cos(base) * want; gy = T.y + Math.sin(base) * want;
    } else if (d > want + 140) {
      gx = lerp(U.x, T.x, 0.45); gy = lerp(U.y, T.y, 0.45);
    } else if (d < 220 && !U.giant) {
      gx = U.x + (U.x - T.x) / d * 200; gy = U.y + (U.y - T.y) / d * 200;
    } else {
      // strafe a little (harder to hit)
      const s = rand(-1, 1) * [60, 140, 180][lvl];
      gx = U.x + (-(T.y - U.y) / d) * s; gy = U.y + ((T.x - U.x) / d) * s;
    }
    A.goal = { x: clamp(gx, ARENA.x0 + 50, ARENA.x1 - 50), y: clamp(gy, ARENA.y0 + 40, ARENA.y1 - 40) };
  }

  pickTarget(U, lvl, foes, cur = null) {
    let best = null, bs = 1e9;
    const top = Math.max(...this.units.map((u) => u.score));
    for (const V of foes) {
      const d = Math.hypot(V.x - U.x, V.y - U.y);
      let s = d + (V.inv > 0 ? 500 : 0) + rand(0, [260, 120, 40][lvl]);
      if (lvl > 0 && !this.lineClear(U.x, U.y, V.x, V.y)) s += 260;
      if (lvl === 2 && V.score === top && top > 0) s -= 140;
      if (cur === V.i) s -= 90;
      if (s < bs) { bs = s; best = V; }
    }
    return best ? best.i : null;
  }

  coverGone(A) { return A.cover && A.cover.state !== 'up'; }
  obstacleNear(pt) {
    let best = null, bd = 160;
    for (const o of this.obstacles) { const d = Math.hypot(o.x - pt.x, o.y - pt.y); if (d < bd) { bd = d; best = o; } }
    return best;
  }

  /** Where to pack snow: Easy right here, Normal/Hard behind the nearest cover. */
  scoopSpot(U, lvl, threat) {
    let here = { x: U.x, y: U.y };
    if (inIce(U.x, U.y)) {
      const a = Math.atan2((U.y - POND.y) / POND.ry, (U.x - POND.x) / POND.rx);
      here = { x: POND.x + Math.cos(a) * (POND.rx + 60), y: POND.y + Math.sin(a) * (POND.ry + 50) };
    }
    if (lvl === 0 || !threat) return here;
    let best = here, bd = 1e9;
    for (const o of this.obstacles) {
      if (o.state !== 'up') continue;
      const ox = o.x - threat.x, oy = o.y - threat.y, ol = Math.hypot(ox, oy) || 1;
      const size = o.kind === 'wall' ? Math.max(o.w, o.d) * 0.25 + Math.min(o.w, o.d) / 2 : o.r;
      const cx = o.x + (ox / ol) * (size + this.R + 22), cy = o.y + (oy / ol) * (size + this.R + 22);
      if (cx < ARENA.x0 + 40 || cx > ARENA.x1 - 40 || cy < ARENA.y0 + 30 || cy > ARENA.y1 - 30) continue;
      if (this.blocked(cx, cy, this.R) || inIce(cx, cy)) continue;
      const d = Math.hypot(cx - U.x, cy - U.y);
      if (d < 520 && d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    return best;
  }

  avoid(U, a) {
    const probe = (ang) => this.blocked(U.x + Math.cos(ang) * 80, U.y + Math.sin(ang) * 80, this.R + 4);
    if (!probe(a)) return a;
    for (let k = 1; k <= 6; k++) {
      const off = k * 0.38;
      if (!probe(a + off)) return a + off;
      if (!probe(a - off)) return a - off;
    }
    return a;
  }

  // --- end ----------------------------------------------------------------------------------
  endGame() {
    this.over = true;
    const nReal = this.real.length;
    const scores = this.units.map((u) => u.score);
    const placements = placementsFromScores(scores.slice(0, nReal));
    const stats = scores.slice(0, nReal).map((s) => `${s} splat${s === 1 ? '' : 's'}`);
    const top = Math.max(...scores.slice(0, nReal));
    for (const U of this.units) {
      U.scoopMode = false; U.stun = 0;
      if (U.p.isAI) { U.p.ctrl.move(0, 0); U.p.ctrl.hold('b', false); }
      const won = U.i < nReal ? placements[U.i] === 1 : U.score >= top;
      U.a.clearEmotes(); U.a.setPose(won ? 'celebrate' : 'clap');
    }
    let fu = this.units[placements.indexOf(1)] || this.units[0];
    particles.burst(fu.x, fu.y - fu.a.height, { type: 'confetti', count: 40 });
    this.api.finish({ placements, stats, solo: scores[0], focus: { x: fu.x, y: fu.y - fu.a.height / 2, zoom: 1.3 } });
  }

  destroy() { if (this.npc) input.releaseAI(this.npc.ctrl); }

  // --- drawing --------------------------------------------------------------------------------
  draw(g) {
    const bgArt = art('bg/snowball-splat');
    if (bgArt) g.drawImage(bgArt, 0, 0, W, H); else g.drawImage(this.bg, 0, 0);
    const t = this.t + this.t0;
    // pond glint
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 1.5);
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(POND.x - 60 + Math.sin(t * 0.7) * 40, POND.y - 30, 70, 10, -0.25, 0, TAU); g.fill(); g.restore();
    // ground decals
    for (const d of this.dents) {
      g.save(); g.globalAlpha = clamp(1 - (d.t - 3.5) / 1.5, 0, 1) * 0.55; g.fillStyle = '#b9d2ef';
      g.beginPath(); g.ellipse(d.x, d.y, 20, 7, 0, 0, TAU); g.fill(); g.restore();
    }
    for (const s of this.splats) drawGroundSplat(g, s.x, s.y, s.r, s.seed, clamp(1 - (s.t - 2.5), 0, 1));
    // power-up shadows + rings on the ground
    for (const q of this.pups) {
      const blink = q.t > PU_LIFE - 3 && Math.floor(q.t * 8) % 2 === 0;
      g.save(); g.globalAlpha = blink ? 0.4 : 1;
      drawShadow(g, q.x, q.y, 38, q.z + 30, 0.3);
      g.strokeStyle = q.kind === 'giant' ? '#7fc6ff' : '#ff6f91'; g.lineWidth = 5; g.globalAlpha *= 0.7;
      g.beginPath(); g.ellipse(q.x, q.y, 50 + Math.sin(t * 5) * 4, 17, 0, 0, TAU); g.stroke();
      g.restore();
    }
    // scoop rings and aim arcs on the ground
    for (const U of this.units) this.drawGroundUI(g, U, t);
    // ball shadows
    for (const b of this.balls) drawShadow(g, b.x, b.y, 13, b.z, 0.3);
    for (const gb of this.giants) drawShadow(g, gb.x, gb.y + 4, gb.r * 1.05, 0, 0.32);

    // y-sorted scene
    const list = [];
    for (const o of this.walls) list.push({ y: o.y + o.d / 2, fn: () => this.drawWallObj(g, o, t) });
    for (const o of this.snowmen) list.push({ y: o.y, fn: () => this.drawSnowmanObj(g, o, t) });
    for (const U of this.units) list.push({ y: U.y, fn: () => this.drawUnit(g, U) });
    for (const b of this.balls) list.push({ y: b.y, fn: () => drawSnowball(g, b.x, b.y - b.z, 12) });
    for (const gb of this.giants) list.push({ y: gb.y + 2, fn: () => drawGiantBall(g, gb.x, gb.y, gb.r, gb.rot, gb.dx) });
    for (const q of this.pups) list.push({ y: q.y, fn: () => this.drawPup(g, q, t) });
    for (const f of this.flyers) list.push({ y: f.y, fn: () => this.drawFlyer(g, f) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();

    // overhead UI (ammo pips, tags) above everything in the world
    for (const U of this.units) this.drawOverhead(g, U, t);

    // falling snow
    g.save(); g.fillStyle = '#ffffff';
    for (const f of this.flakes) { g.globalAlpha = 0.85; g.beginPath(); g.arc(f.x, f.y, f.s, 0, TAU); g.fill(); }
    g.restore();
  }

  drawWallObj(g, o, t) {
    if (o.state === 'up') drawWall(g, o, easeBack(o.grow), 1 - o.hp / WALL_HP, t);
    else drawRubble(g, o, 1 - o.downT / WALL_REBUILD);
  }
  drawSnowmanObj(g, o, t) {
    if (o.state === 'up') drawSnowman(g, o, easeBack(o.grow), t);
    else drawSnowmanPile(g, o, 1 - o.downT / SNOWMAN_REBUILD);
  }

  drawPup(g, q, t) {
    const blink = q.t > PU_LIFE - 3 && Math.floor(q.t * 8) % 2 === 0;
    g.save(); if (blink) g.globalAlpha = 0.45;
    drawPowerup(g, q.kind, q.x, q.y - 52 - q.z + Math.sin(t * 3 + q.x) * 6, 92, t);
    g.restore();
  }

  drawFlyer(g, f) {
    g.save(); g.globalAlpha = clamp((1.8 - f.t) / 0.4, 0, 1);
    drawShadow(g, f.x, f.y + 4, 20, f.z, 0.25);
    g.translate(f.x, f.y - f.z); g.rotate(f.rot);
    if (f.kind === 'hat') drawHat(g, 0, 14, f.color);
    else {
      drawSnowball(g, 0, 0, 24);
      g.fillStyle = NAVY; g.beginPath(); g.arc(-8, -5, 3.6, 0, TAU); g.arc(9, -5, 3.6, 0, TAU); g.fill();
      g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(0, 0); g.lineTo(22, 4); g.lineTo(0, 8); g.closePath(); g.fill();
    }
    g.restore();
  }

  drawGroundUI(g, U, t) {
    if (this.over) return;
    const human = !U.p.isAI;
    // scoop progress ring around the feet
    if (U.scoopT > 0.02 && U.ammo < MAX_AMMO) {
      const k = clamp(U.scoopT / SCOOP_T, 0, 1), r = 50;
      g.save(); g.lineCap = 'round';
      g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 9; g.beginPath(); g.ellipse(U.x, U.y + 2, r, r * 0.34, 0, 0, TAU); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.ellipse(U.x, U.y + 2, r, r * 0.34, 0, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
      g.restore();
    }
    // aim arc: where your snowball will fly
    if ((U.ammo > 0 || U.giant) && U.stun <= 0) {
      const alpha = human ? 0.9 : 0.28;
      const cx = Math.cos(U.aim), cy = Math.sin(U.aim);
      const len = U.giant ? 420 : RANGE;
      g.save(); g.globalAlpha = alpha;
      if (U.giant) {
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 46; g.lineCap = 'round'; g.globalAlpha = alpha * 0.35;
        g.beginPath(); g.moveTo(U.x + cx * 60, U.y + cy * 40); g.lineTo(U.x + cx * len, U.y + cy * len); g.stroke();
      } else {
        // dotted flight path, lifted by the arc, and a target ring where it lands
        const z0 = 70, steps = human ? 14 : 8;
        const phase = (t * 3) % 1;
        for (let i = 1; i <= steps; i++) {
          const u = (i - 1 + phase) / steps;
          if (u > 1) continue;
          const d = u * len;
          const z = z0 * (1 - u) + ARC * 4 * u * (1 - u);
          const px = U.x + cx * d, py = U.y + cy * d;
          if (this.obstacleAt(px, py, 4)) break;
          g.fillStyle = U.p.color; g.strokeStyle = NAVY; g.lineWidth = 2;
          g.beginPath(); g.arc(px, py - z, human ? 6 : 4.5, 0, TAU); g.fill(); g.stroke();
        }
        if (human) {
          const ex = U.x + cx * len, ey = U.y + cy * len;
          g.strokeStyle = U.p.color; g.lineWidth = 5;
          g.beginPath(); g.ellipse(ex, ey, 26, 10, 0, 0, TAU); g.stroke();
          g.beginPath(); g.moveTo(ex - 12, ey); g.lineTo(ex + 12, ey); g.moveTo(ex, ey - 6); g.lineTo(ex, ey + 6); g.stroke();
        }
      }
      g.restore();
    }
  }

  drawUnit(g, U) {
    const a = U.a, p = U.p;
    const blink = U.inv > 0 && U.stun <= 0 && Math.floor(this.t * 14) % 2 === 0;
    g.save();
    if (blink) g.globalAlpha = 0.55;
    a.draw(g, { ring: p.color });
    g.restore();
  }

  drawOverhead(g, U, t) {
    const a = U.a;
    const top = a.anchor('head').y - 26;
    // ammo pips
    if (!this.over) {
      const n = MAX_AMMO, gap = 22, x0 = U.x - ((n - 1) * gap) / 2;
      const showPips = !U.giant && (U.ammo > 0 || U.scoopT > 0 || !U.p.isAI || this.n <= 4);
      if (showPips) {
        for (let i = 0; i < n; i++) {
          const px = x0 + i * gap;
          if (i < U.ammo) drawSnowball(g, px, top, 8.5);
          else {
            g.save(); g.fillStyle = 'rgba(36,22,63,0.25)'; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2.5;
            g.beginPath(); g.arc(px, top, 7, 0, TAU); g.fill(); g.stroke();
            if (i === U.ammo && U.scoopT > 0) {
              g.strokeStyle = '#ffffff'; g.lineWidth = 4;
              g.beginPath(); g.arc(px, top, 9, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(U.scoopT / SCOOP_T, 0, 1)); g.stroke();
            }
            g.restore();
          }
        }
      }
      // mitten timer
      if (U.mittenT > 0) {
        const mx = x0 + n * gap + 10;
        drawMitten(g, mx, top, 30, 0.2);
        g.save(); g.strokeStyle = '#ff4d6d'; g.lineWidth = 4; g.beginPath(); g.arc(mx, top, 20, -Math.PI / 2, -Math.PI / 2 + TAU * (U.mittenT / MITTEN_T)); g.stroke(); g.restore();
      }
      // human out of snow: show "hold A"
      if (!U.p.isAI && U.ammo === 0 && !U.giant && U.scoopT <= 0 && U.stun <= 0 && this.t > 1) {
        const bob = Math.sin(t * 6) * 4;
        g.save(); g.translate(U.x, top - 40 + bob);
        ui.panel(g, -70, -24, 140, 48, { r: 24, fill: '#ffffff', lineWidth: 4, shadow: false });
        ui.glyph(g, 'a', -42, 0, 34, { pulse: true });
        ui.text(g, 'hold', 18, 1, { size: 26, color: NAVY, stroke: false, weight: 800 });
        g.restore();
      }
    }
    // player tag at the start (and the troll's label in solo)
    const tagT = this.t < 5 || this.t0 < 3.2 && this.t === 0;
    if (tagT) {
      const sc = this.n > 5 ? 0.78 : 0.95;
      g.save(); g.translate(U.x, top - (U.p.isAI ? 24 : 80)); g.scale(sc, sc); ui.playerTag(g, U.p, 0, 0); g.restore();
    }
  }

  drawHUD(g) {
    const scores = this.units.map((u) => u.score);
    const m = Math.max(...scores);
    ui.scoreboard(g, this.players, scores, { y: 18, format: (v) => `${v}`, highlight: scores.map((s) => m > 0 && s === m) });
    ui.timer(g, DURATION - this.t, W / 2, 148);
    if (this.frenzy) {
      const k = this.t - this.frenzyT;
      const pulse = 1 + Math.sin(this.t * 8) * 0.04;
      g.save(); g.translate(W / 2 + 270, 148); g.scale(pulse, pulse);
      ui.panel(g, -150, -32, 300, 64, { r: 32, fill: '#bfe9ff' });
      ui.text(g, 'SNOW FRENZY!', 0, 3, { size: 34, color: NAVY, stroke: false, weight: 800, maxWidth: 270 });
      g.restore();
      if (k < 1.8 && !this.over) {
        ui.banner(g, 'SNOW FRENZY!', k, { size: 120, y: H / 2 - 140, color: '#bfe9ff' });
        if (k < 1.6) ui.text(g, 'Snowballs pack twice as fast!', W / 2, H / 2 - 40, { size: 44, alpha: clamp(1.6 - k, 0, 1) });
      }
    }
    if (this.npc && this.t < 4) ui.text(g, 'A friendly Troll joins the snowball fight!', W / 2, 228, { size: 38, color: '#ffffff' });
    // how-to strip for the first seconds
    if (this.t < 6 && !this.over) {
      const al = this.t < 5 ? 1 : 1 - (this.t - 5);
      g.save(); g.globalAlpha = clamp(al, 0, 1);
      ui.panel(g, W / 2 - 520, 994, 1040, 70, { r: 35 });
      ui.hints(g, [['a', 'Hold to make snowballs'], ['rt', 'Throw!'], ['rstick', 'Aim']], W / 2, 1030, { size: 36 });
      g.restore();
    }
  }
}

function easeBack(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  const x = clamp(k, 0, 1);
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}
