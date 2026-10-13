// Snowman Builder (Play Studio). Every player gets a snowy yard. Push a little
// snowball around: it picks up snow and grows as it rolls (leaving a grassy
// track that slowly snows over again). Push it onto your snowman spot and
// press A to stack it; three balls make a snowman. Then the view zooms in and
// you decorate it with coal eyes, carrot noses, hats, scarves, stick arms,
// buttons and little friends (everything can be picked up, moved or taken
// off). Finale: night falls, the snowmen line up under twinkle lights, come
// alive, wave and hop, and everyone poses for a photo.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait, POSES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, sfxLoop, music, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, ease, TAU } from '../engine/util.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import { drawHeartShape } from '../engine/emotes.js';
import {
  NAVY, ITEMS, ITEM, itemDef, MIN_STACK_R, MAX_R, KY, newSnowman, ballCenters, stackTop, stackHeight,
  itemPos, attachAt, makeItem, itemHit, drawBall, drawShadow, drawSnowman, drawItem, drawItemIcon,
  sparkleAt, lerpAngle,
} from './snowman-builder/snowman.js';

export const meta = {
  id: 'snowman-builder',
  title: 'Snowman Builder',
  category: 'studio',
  type: 'Roll & decorate · Everyone wins',
  goal: 'Roll snowballs that grow bigger, stack them into a snowman, then dress it up and watch it come alive!',
  controls: [['stick', 'Push your snowball / move your hand'], ['a', 'Stack it! Then: add a decoration, or pick one up'], ['dpad', 'Pick a decoration (X on keyboard)'], ['b', 'Take a decoration off'], ['y', 'Surprise me!']],
  infoAt: 'tl',
  tips: ['Roll through fresh white snow to grow fast. Big ball first!', 'Push your snowball onto the snowman spot and press A to stack it.', 'Press A on a decoration to move it. B takes it off.'],
  music: 'chill',
  duration: 'about 3 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  drawIcon,
};

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const ROLL_POSE = POSES['roll-push'] ? 'roll-push' : 'walk';
const VIEW_TOP = -250, FIELD_H = 600, FLOOR_PAD = 50, CELL = 40;
const ROLL_TIME = 80;        // soft limit for rolling; then the snow fairy finishes the snowman
const DECO_TIME = 105;       // soft limit for decorating (per yard, from when it starts)
const GROW = 7;              // r² gained per unit rolled over full-depth snow
const MAX_ITEMS = 40;
const DONE = ITEMS.length;   // list index of the "Done!" entry
const SNOW = ['#ffffff', '#eef6ff', '#d8e8ff'];
const HELLO = ['Hello!', 'Hi hi!', 'Brrr-illiant!', 'I can wave!', 'Snow happy!', 'Hooray!', 'Look at me!', 'Chilly hugs!'];
const SHOW_Y = 905;

function stationRects(n) {
  const top = 112, bottom = 1068, left = 14, right = W - 14, gap = 14;
  if (n === 1) return [{ x: left, y: top, w: right - left, h: bottom - top }];
  const cols = n === 2 ? 2 : n <= 4 ? 2 : 4, rows = n === 2 ? 1 : 2;
  const w = (right - left - gap * (cols - 1)) / cols, h = (bottom - top - gap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const inRow = Math.min(cols, n - row * cols);
    const ox = ((cols - inRow) * (w + gap)) / 2;
    return { x: left + ox + col * (w + gap), y: top + row * (h + gap), w, h };
  });
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'build';
    this.cpuOnly = this.players.every((p) => p.isAI);
    const rects = stationRects(this.n);
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i]));
    this.flakes = Array.from({ length: 110 }, () => ({ x: rand(W), y: rand(H), s: rand(2, 6), v: rand(30, 80), ph: rand(TAU) }));
    this.stars = Array.from({ length: 90 }, () => ({ x: rand(W), y: rand(20, 640), s: rand(1.5, 4), ph: rand(TAU) }));
    this.banner = { text: 'Roll a snowball!', t: 0 };
    sfx('magic');
  }

  // --- set-up --------------------------------------------------------------------
  makeStation(p, i, r) {
    const hintH = Math.round(clamp(r.h * 0.075, 36, 60));
    const viewH = FIELD_H + FLOOR_PAD - VIEW_TOP;
    let k = r.h / viewH;
    let VW = r.w / k;
    if (VW < 700) { VW = 700; k = r.w / VW; }
    const roll = { k, ox: r.x + (r.w - VW * k) / 2, oy: r.y + r.h - (FIELD_H + FLOOR_PAD) * k };
    const spot = { x: VW * (VW > 1200 ? 0.58 : 0.55), y: 235 };
    const sm = newSnowman(spot.x, spot.y);
    sm.seed = rand(10);
    const a = new Actor(p, { x: spot.x - 230, y: 420, facing: 1 });
    a.scale = Math.min(150 / a.leader.h, 210 / Math.max(1, a.width));
    a.snap();
    const cols = Math.ceil(VW / CELL), rows = Math.ceil(FIELD_H / CELL);
    const depth = new Float32Array(cols * rows);
    for (let j = 0; j < depth.length; j++) depth[j] = rand(0.8, 1);
    const trail = document.createElement('canvas');
    trail.width = Math.ceil(VW / 2); trail.height = Math.ceil(FIELD_H / 2);
    const st = {
      p, i, r, hintH, VW, spot, sm, actor: a, view: { ...roll }, roll, deco: null, zoomT: 0,
      mode: 'roll', ball: null, dir: -0.3, lift: null, pat: 0, nearT: 0, canStack: false, tipCD: 0,
      cols, rows, depth, trail, tctx: trail.getContext('2d'), refillT: 0, puffT: 0, rollSndT: 0,
      stackBump: 0, builtT: 0, cursor: { x: spot.x, y: spot.y - 200 }, sel: 0, held: null, hover: null,
      history: [], ready: false, readyT: 0, listBump: 0, cheerCD: 0, decoStart: 0, placed: 0, ai: null,
      scenery: this.makeScenery(VW), sparkles: Array.from({ length: Math.round(VW / 30) }, () => ({ x: rand(VW), y: rand(20, FIELD_H), ph: rand(TAU) })),
      lastMilestone: 0, rolled: 0,
    };
    st.ball = this.newBall(st, 18);
    if (p.isAI) st.ai = { mode: 'grow', wp: null, wpT: 0, wait: rand(0.4, 1.0), target: 0 };
    return st;
  }

  makeScenery(VW) {
    const trees = [];
    for (let x = rand(-20, 40); x < VW + 40; x += rand(70, 150)) trees.push({ x, s: rand(0.7, 1.25), y: rand(-10, 4) });
    return { trees, hill1: rand(TAU), hill2: rand(TAU), cabin: chance(0.6) ? rand(0.08, 0.3) * VW : -1 };
  }

  newBall(st, r) {
    const b = { r, spin: 0, x: 0, y: 0, seed: rand(10) };
    this.placeBall(st, b);
    this.clampBall(st, b, true);
    return b;
  }
  /** The ball sits in front of the pusher, never straight behind or in front of them (so it never hides). */
  placeBall(st, b) {
    const a = st.actor, reach = this.reach(st);
    let cx = Math.cos(st.dir), sy = Math.sin(st.dir);
    if (Math.abs(cx) < 0.7) { cx = (cx === 0 ? a.facing : Math.sign(cx)) * 0.7; sy = Math.sign(sy) * 0.71; }
    b.x = a.x + cx * (b.r + reach); b.y = a.y + sy * (b.r + reach) * KY * 0.85;
  }
  reach(st) { return Math.max(18, st.actor.radius * 0.5); }

  toScreen(st, x, y) { const v = st.view; return { x: v.ox + x * v.k, y: v.oy + y * v.k }; }

  // --- snow field --------------------------------------------------------------------
  cellAt(st, x, y) {
    const cx = clamp(Math.floor(x / CELL), 0, st.cols - 1), cy = clamp(Math.floor(y / CELL), 0, st.rows - 1);
    return cy * st.cols + cx;
  }
  /** Roll the ball `moved` units over the snow: it grows with the snow it picks up. */
  pickUpSnow(st, b, moved) {
    const j = this.cellAt(st, b.x, b.y);
    const d = st.depth[j];
    const gain = GROW * moved * (0.12 + d * 0.88);
    const before = b.r;
    b.r = Math.min(MAX_R, Math.sqrt(b.r * b.r + gain));
    const take = moved * 0.014 * (0.5 + b.r / 70);
    st.depth[j] = Math.max(0, d - take);
    if (b.r > 40) {
      const cx = j % st.cols;
      if (cx > 0) st.depth[j - 1] = Math.max(0, st.depth[j - 1] - take * 0.4);
      if (cx < st.cols - 1) st.depth[j + 1] = Math.max(0, st.depth[j + 1] - take * 0.4);
    }
    // grassy track behind the ball
    const t = st.tctx;
    t.fillStyle = d > 0.25 ? 'rgba(146,198,128,0.42)' : 'rgba(146,198,128,0.18)';
    t.beginPath(); t.ellipse(b.x / 2, b.y / 2, b.r * 0.22, b.r * 0.22 * KY, 0, 0, TAU); t.fill();
    // milestones
    for (const [m, label] of [[34, 'Bigger!'], [52, 'Huge!'], [70, 'Giant!']]) {
      if (before < m && b.r >= m && st.lastMilestone < m) {
        st.lastMilestone = m;
        const s = this.toScreen(st, b.x, b.y - b.r * 2.1);
        particles.popText(s.x, s.y, label, '#7fd3ff', clamp(46 * st.view.k, 24, 52));
        sfx('grow', { vol: 0.35 });
        particles.burst(s.x, s.y + 30 * st.view.k, { type: 'sparkle', count: 6, colors: ['#fff', '#bfe6ff'] });
      }
    }
    if (b.r >= MAX_R && before < MAX_R) {
      const s = this.toScreen(st, b.x, b.y - b.r * 2.1);
      particles.popText(s.x, s.y, 'Biggest ever!', '#ffd23f', clamp(46 * st.view.k, 24, 52));
      sfx('star', { vol: 0.4 });
    }
  }

  refillSnow(st, dt) {
    st.refillT += dt;
    for (let j = 0; j < st.depth.length; j++) if (st.depth[j] < 1) st.depth[j] = Math.min(1, st.depth[j] + dt / 35);
    if (st.refillT > 1) {
      st.refillT = 0;
      const t = st.tctx;
      t.save(); t.globalCompositeOperation = 'destination-out'; t.fillStyle = 'rgba(0,0,0,0.03)'; t.fillRect(0, 0, st.trail.width, st.trail.height); t.restore();
    }
  }

  clampBall(st, b, moveActor = false) {
    const nx = clamp(b.x, b.r + 8, st.VW - b.r - 8), ny = clamp(b.y, 18, FIELD_H - 6);
    const dx = nx - b.x, dy = ny - b.y;
    b.x = nx; b.y = ny;
    if (moveActor) { st.actor.x += dx; st.actor.y += dy; }
    return dx || dy;
  }

  // --- rolling -----------------------------------------------------------------------
  baseR(st) { return st.sm.balls.length ? st.sm.balls[0].r : 0; }

  updateRoll(st, dt) {
    const c = st.p.ctrl, a = st.actor;
    if (st.lift) { this.updateLift(st, dt); return; }
    if (st.pat > 0) {
      st.pat -= dt;
      if (st.pat <= 0) {
        st.ball = this.newBall(st, 18);
        snd('snowman-pat', 'snow-pack', { vol: 0.6 });
        const s = this.toScreen(st, st.ball.x, st.ball.y - 18);
        particles.burst(s.x, s.y, { type: 'dust', count: 8, colors: SNOW, speed: [60, 160] });
        st.lastMilestone = 0;
        a.setPose('idle');
      }
      return;
    }
    const b = st.ball;
    if (!b) return;
    let mx = c.x, my = c.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    const speed = 300 - b.r * 1.15;
    let moved = 0;
    if (mag > 0.18) {
      const target = Math.atan2(my, mx);
      st.dir = lerpAngle(st.dir, target, 1 - Math.exp(-9 * dt));
      const ox = b.x, oy = b.y;
      a.x += mx * speed * dt; a.y += my * speed * 0.8 * dt;
      a.x = clamp(a.x, 30, st.VW - 30); a.y = clamp(a.y, 40, FIELD_H - 8);
      this.placeBall(st, b);
      this.clampBall(st, b, true);
      this.blockBySnowman(st, b);
      moved = Math.hypot(b.x - ox, (b.y - oy) / KY);
      if (moved > 0.3) {
        b.spin += moved / b.r; b.dir = st.dir; st.rolled += moved;
        this.pickUpSnow(st, b, moved);
        st.puffT -= dt;
        if (st.puffT <= 0) {
          st.puffT = 0.12;
          const s = this.toScreen(st, b.x - Math.cos(st.dir) * b.r * 0.6, b.y);
          particles.burst(s.x, s.y, { type: 'dust', count: 2, colors: SNOW, speed: [30, 90], life: [0.3, 0.6] });
        }
      }
      if (Math.abs(Math.cos(st.dir)) > 0.25) a.facing = Math.cos(st.dir) > 0 ? 1 : -1;
      a.speed = clamp(moved / dt / 260, 0.3, 1);
      if (!a._once) a.setPose(moved > 0.3 ? ROLL_POSE : 'idle');
    } else if (!a._once) a.setPose('idle');
    this.rollSound(st, moved / Math.max(dt, 1e-3));
    // the snowman spot
    st.canStack = false;
    const near = this.nearSpot(st, b);
    if (near) {
      if (b.r >= MIN_STACK_R) {
        st.canStack = true; st.nearT += dt;
        if (c.pressed('a') || st.nearT > 1.8) this.startLift(st);
      } else {
        st.tipCD -= dt;
        if (st.tipCD <= 0) { st.tipCD = 3; a.say('Roll it bigger!', 1.4, null); sfx('blip', { vol: 0.4 }); }
      }
    } else {
      st.nearT = 0;
      if (c.pressed('a')) {   // pat the snowball: harmless, cosy
        b.pat = 0.2; sfx('snow-pack', { vol: 0.35 }); a.playOnce('action', 0.25);
        const s = this.toScreen(st, b.x, b.y - b.r * 1.6);
        particles.burst(s.x, s.y, { type: 'sparkle', count: 4, colors: SNOW });
      }
    }
    if (b.pat) b.pat = Math.max(0, b.pat - dt);
  }

  nearSpot(st, b) {
    const sp = st.spot, R0 = this.baseR(st);
    const d = Math.hypot(b.x - sp.x, (b.y - sp.y) / KY);
    return R0 ? d < R0 + b.r + 34 : d < 80;
  }

  /** Balls and players can't roll through a snowman that's already standing. */
  blockBySnowman(st, b) {
    const R0 = this.baseR(st);
    if (!R0) return;
    const sp = st.spot, a = st.actor;
    let dx = b.x - sp.x, dy = (b.y - sp.y) / KY;
    let d = Math.hypot(dx, dy), min = R0 * 0.9 + b.r * 0.85;
    if (d < min && d > 0.01) {
      const push = min - d;
      b.x += (dx / d) * push; b.y += (dy / d) * push * KY;
      a.x += (dx / d) * push; a.y += (dy / d) * push * KY;
    }
    dx = a.x - sp.x; dy = (a.y - sp.y) / KY; d = Math.hypot(dx, dy); min = R0 * 0.8 + 20;
    if (d < min && d > 0.01) { a.x += (dx / d) * (min - d); a.y += (dy / d) * (min - d) * KY; }
  }

  rollSound(st, speed) {
    const on = speed > 40 && this.phase === 'build' && st.mode === 'roll';
    if (on && !st.rollLoop && hasSound('snowman-roll')) st.rollLoop = sfxLoop('snowman-roll', { vol: (st.p.isAI ? 0.25 : 0.6) / Math.sqrt(this.n) });
    else if (!on && st.rollLoop) { st.rollLoop.stop(); st.rollLoop = null; }
    if (st.rollLoop) st.rollLoop.setRate(clamp(0.8 + speed / 600, 0.8, 1.25));
    if (on && !st.rollLoop && !st.p.isAI) {
      st.rollSndT -= 1 / 60;
      if (st.rollSndT <= 0) { st.rollSndT = 0.24; sfx('brush', { vol: 0.12 }); }
    }
  }

  startLift(st) {
    const b = st.ball, sm = st.sm, a = st.actor;
    st.ball = null; st.canStack = false; st.nearT = 0;
    this.rollSound(st, 0);
    const nb = { r: b.r, spin: b.spin, seed: b.seed };
    const balls = [...sm.balls, nb].sort((p, q) => q.r - p.r);
    const cs = ballCenters({ balls }, sm.x, sm.y);
    const to = cs[balls.indexOf(nb)];
    st.lift = { t: 0, dur: 0.6, x0: b.x, y0: b.y - b.r, x1: to.x, y1: to.y, ball: nb, balls, spin: b.spin };
    a.facing = sm.x > a.x ? 1 : -1;
    a.playOnce('throw', 0.5, 'idle');
    sfx('whoosh', { vol: 0.6 });
  }

  updateLift(st, dt) {
    const L = st.lift;
    L.t += dt;
    if (L.t < L.dur) return;
    st.lift = null;
    st.sm.balls = L.balls;
    st.stackBump = 0.4;
    snd('snowman-stack', 'snow-land', { vol: 0.8 });
    const s = this.toScreen(st, L.x1, L.y1 + L.ball.r * 0.7);
    particles.burst(s.x, s.y, { type: 'dust', count: 14, colors: SNOW, speed: [80, 260] });
    particles.burst(s.x, s.y, { type: 'sparkle', count: 6, colors: ['#fff', '#bfe6ff'] });
    if (!st.p.isAI) fx.shake(4, 0.12);
    const nb = st.sm.balls.length;
    const top = this.toScreen(st, st.spot.x, stackTop(st.sm) - 30);
    particles.popText(top.x, top.y, `${nb} / 3`, st.p.color, clamp(54 * st.view.k, 26, 56));
    const a = st.actor;
    a.squash(0.15);
    if (nb >= 3) { this.built(st); return; }
    a.playOnce('cheer', 0.5, 'idle');
    if (nb === 1) a.say(pick(['Next one!', 'Now a smaller one!']), 1.3, null);
    // pat a new little snowball, facing away from the snowman
    st.dir = Math.atan2((a.y - st.spot.y) / KY, a.x - st.spot.x);
    st.pat = 0.75;
    a.playOnce('snow-scoop', 0.75, 'idle');
  }

  built(st) {
    st.mode = 'built'; st.builtT = 0;
    const a = st.actor;
    snd('snowman-built', 'golden-chime');
    a.playOnce('celebrate', 1.1, 'idle'); a.say('Ta-da!', 1.3, 'yay'); a.emote('heart', 1.5);
    const cs = ballCenters(st.sm);
    const mid = this.toScreen(st, st.spot.x, cs[1].y);
    particles.burst(mid.x, mid.y, { type: 'confetti', count: 24, speed: [200, 480] });
    particles.burst(mid.x, mid.y, { type: 'star', count: 10, colors: ['#ffd23f', '#fff'] });
  }

  /** Time's up (or "All done"): the snow fairy finishes the snowman. */
  autoBuild(st) {
    if (st.mode !== 'roll') return;
    if (st.lift) { st.sm.balls = st.lift.balls; st.lift = null; }
    const balls = st.sm.balls;
    if (st.ball && st.ball.r >= 20 && balls.length < 3) balls.push({ r: st.ball.r, spin: st.ball.spin, seed: st.ball.seed });
    st.ball = null; st.pat = 0;
    this.rollSound(st, 0);
    while (balls.length < 3) {
      const minR = balls.length ? Math.min(...balls.map((b) => b.r)) : 0;
      const r = !balls.length ? 76 : minR > 44 ? minR * 0.74 : Math.min(84, Math.max(...balls.map((b) => b.r)) * 1.3 + 10);
      balls.push({ r: clamp(r, 30, MAX_R), spin: rand(TAU), seed: rand(10) });
    }
    balls.sort((p, q) => q.r - p.r);
    const top = this.toScreen(st, st.spot.x, stackTop(st.sm) - 40);
    particles.popText(top.x, top.y, 'Snow magic!', '#bfe6ff', clamp(50 * st.view.k, 26, 54));
    particles.burst(top.x, top.y + 60, { type: 'sparkle', count: 16, colors: ['#fff', '#bfe6ff', '#ffd23f'] });
    sfx('magic');
    this.built(st);
  }

  // --- decorating --------------------------------------------------------------------
  startDecorate(st) {
    st.mode = 'deco'; st.zoomT = 0; st.decoStart = this.t;
    const sm = st.sm, a = st.actor, R0 = this.baseR(st);
    st.actorFrom = { x: a.x, y: a.y };
    st.actorTo = { x: sm.x - R0 - Math.max(70, a.width * 0.55) - 30, y: sm.y + 24 };
    const cs = ballCenters(sm), head = cs[cs.length - 1];
    st.cursor = { x: head.x + head.r * 0.4, y: head.y };
    // frame the snowman (+ hats, arms and the builder) in the part of the yard left of the list
    const r = st.r, listW = this.listW(st);
    const A = { x: r.x + 12, y: r.y + 54, w: r.w - listW - 30, h: r.h - st.hintH - 70 };
    const top = stackTop(sm) - 95, bottom = sm.y + 34;
    const left = Math.min(sm.x - R0 - 130, st.actorTo.x - Math.max(50, a.width * 0.5)), right = sm.x + R0 + 130;
    const k = Math.min(A.h / (bottom - top), A.w / (right - left), st.roll.k * 3.2);
    st.deco = { k, ox: A.x + (A.w - (right - left) * k) / 2 - left * k, oy: A.y + (A.h - (bottom - top) * k) / 2 - top * k };
    st.bounds = { left: left - 20, right: right + 10, top: top - 10, bottom: bottom + 10 };
    st.sel = ITEM.coal;
    if (st.p.isAI) st.ai = { mode: 'tick', t: rand(0.6, 1.4), plan: this.buildPlan(st), pi: 0 };
    sfx('whoosh');
  }

  listW(st) { return Math.round(st.r.w * (this.n === 1 ? 0.2 : this.n > 4 ? 0.3 : 0.27)); }

  updateDeco(st, dt) {
    const c = st.p.ctrl, a = st.actor;
    // zoom in and walk the builder over beside the snowman
    if (st.zoomT < 1) {
      st.zoomT = Math.min(1, st.zoomT + dt / 0.9);
      const e = ease.inOutQuad(st.zoomT);
      for (const k of ['k', 'ox', 'oy']) st.view[k] = lerp(st.roll[k], st.deco[k], e);
      a.x = lerp(st.actorFrom.x, st.actorTo.x, e); a.y = lerp(st.actorFrom.y, st.actorTo.y, e);
      a.facing = 1;
      if (!a._once) a.setPose(st.zoomT < 1 ? 'walk' : 'idle');
    }
    st.listBump = Math.max(0, st.listBump - dt);
    st.cheerCD -= dt;
    if (st.ready) { st.readyT += dt; if (c.pressed('b') && !st.p.isAI) this.setReady(st, false); return; }
    if (st.p.isAI) this.updateDecoAI(st, dt);
    const pad = c.kind === 'pad';
    const mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    const sp = 720 / st.view.k;
    const B = st.bounds, cur = st.cursor;
    cur.x = clamp(cur.x + (mx * sp + c.rx * 200) * dt, B.left, B.right);
    cur.y = clamp(cur.y + (my * sp + c.ry * 200) * dt, B.top, B.bottom);
    let step = (c.pressed('x') || c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
    if (pad) step += (c.pressed('down') || c.pressed('right') ? 1 : 0) - (c.pressed('up') || c.pressed('left') ? 1 : 0);
    if (step) { st.sel = (st.sel + step + DONE + 1) % (DONE + 1); st.listBump = 0.15; sfx('move'); }
    if (c.pressed('y')) { this.surprise(st); return; }
    if (st.held) {
      if (c.pressed('a')) this.dropHeld(st);
      else if (c.pressed('b')) this.removeItem(st, st.held);
      st.hover = null;
      return;
    }
    st.hover = st.p.isAI ? null : this.itemAt(st);
    if (st.hover && c.pressed('b')) { this.removeItem(st, st.hover); st.hover = null; return; }
    if (st.hover && c.pressed('a')) { this.grab(st, st.hover); st.hover = null; return; }
    if (c.pressed('a')) {
      if (st.sel === DONE) this.setReady(st, true);
      else { const it = this.place(st, ITEMS[st.sel].id, cur.x, cur.y); if (it) st.history.push(it); }
    } else if (c.pressed('b')) this.undo(st);
  }

  /** Put a new decoration where the hand is. */
  place(st, kind, x, y, { quiet = false, born = 0 } = {}) {
    const sm = st.sm;
    const it = makeItem(kind);
    it.born = born || 0.001;
    this.settle(st, it, x, y, quiet);
    sm.items.push(it);
    if (sm.items.length > MAX_ITEMS) {
      const old = sm.items.shift();
      st.history = st.history.filter((h) => h !== old);
    }
    st.placed++;
    if (!quiet) {
      const a = st.actor;
      a.playOnce('action', 0.3, 'idle');
      if (st.cheerCD <= 0 && chance(0.35)) { a.playOnce('cheer', 0.5, 'idle'); st.cheerCD = 1.6; }
    }
    return it;
  }

  /** Stick an item onto the snowman at (x, y), or let it drop into the snow. */
  settle(st, it, x, y, quiet = false) {
    const att = attachAt(st.sm, x, y, it.kind);
    if (att) {
      Object.assign(it, att); it.fall = null;
      if (!quiet) {
        snd('snowman-place', 'pop', { vol: 0.55 });
        const s = this.toScreen(st, x, y);
        particles.burst(s.x, s.y, { type: 'sparkle', count: 6, colors: ['#fff', st.p.color, '#ffd23f'] });
        st.stackBump = Math.max(st.stackBump, 0.12);
      }
    } else {
      it.ball = -1; it.gx = x; it.gy = y; it.gs = 0.85; it.rot = rand(-0.4, 0.4);
      it.fall = { vy: 0, ty: Math.max(y, st.sm.y + rand(8, 36)) };
      if (!quiet) sfx('whoosh', { vol: 0.4 });
    }
  }

  itemAt(st) {
    const cs = ballCenters(st.sm), cur = st.cursor;
    let best = null, bd = Infinity;
    for (const it of st.sm.items) {
      if (it.born < 0) continue;
      const h = itemHit(it, itemPos(it, cs, st.sm));
      const d = Math.hypot(cur.x - h.x, cur.y - h.y);
      if (d < h.r + 10 && d - h.r < bd) { bd = d - h.r; best = it; }
    }
    return best;
  }

  grab(st, it) {
    st.held = it; it.fall = null;
    sfx('pop'); st.actor.squash(0.1);
    const s = this.toScreen(st, st.cursor.x, st.cursor.y);
    particles.burst(s.x, s.y, { type: 'sparkle', count: 6, colors: ['#fff', st.p.color] });
  }
  dropHeld(st) {
    const it = st.held; if (!it) return;
    st.held = null;
    // keep it last in the list so it draws on top of its layer
    st.sm.items = st.sm.items.filter((x) => x !== it); st.sm.items.push(it);
    it.born = 0.001;
    this.settle(st, it, st.cursor.x, st.cursor.y);
  }
  removeItem(st, it) {
    if (st.held === it) st.held = null;
    const cs = ballCenters(st.sm), p = itemPos(it, cs, st.sm);
    st.sm.items = st.sm.items.filter((x) => x !== it);
    st.history = st.history.filter((x) => x !== it);
    sfx('back');
    const s = this.toScreen(st, p.x, p.y);
    particles.burst(s.x, s.y, { type: 'dust', count: 8, colors: SNOW, speed: [40, 140] });
    particles.burst(s.x, s.y, { type: 'sparkle', count: 4, colors: ['#fff'] });
  }
  undo(st) {
    const it = st.history.pop();
    if (!it) { sfx('blip'); return; }
    this.removeItem(st, it);
  }

  /** Y: a complete, cheerful snowman look in one go. */
  surprise(st) {
    st.sm.items = []; st.history = []; st.held = null; st.hover = null;
    const plan = this.buildPlan(st, true);
    plan.forEach((pl, j) => this.place(st, pl.kind, pl.x, pl.y, { quiet: true, born: -j * 0.07 }));
    const cs = ballCenters(st.sm), s = this.toScreen(st, st.sm.x, cs[1].y);
    sfx('magic'); sfx('bigpop');
    particles.burst(s.x, s.y, { type: 'star', count: 14 });
    particles.burst(s.x, s.y, { type: 'sparkle', count: 16, colors: ['#fff', '#bfe6ff', '#ffd23f'] });
    st.actor.playOnce('ready', 0.6, 'idle'); st.stackBump = 0.4;
  }

  /** A believable snowman look: [{ kind, x, y }] in yard units. */
  buildPlan(st, fancy = false) {
    const cs = ballCenters(st.sm), head = cs[cs.length - 1], mid = cs[Math.min(1, cs.length - 1)], base = cs[0];
    const out = [];
    const at = (kind, c, u, v) => out.push({ kind, x: c.x + u * c.r, y: c.y + v * c.r });
    if (chance(fancy ? 0.95 : 0.85)) { at('arm', mid, -0.86, -0.2); at('arm', mid, 0.86, -0.2); }
    const shades = chance(0.12);
    if (shades) at('shades', head, 0, -0.18);
    else { const eye = chance(0.7) ? 'coal' : 'googly'; at(eye, head, -0.33, -0.2); at(eye, head, 0.33, -0.2); }
    at('carrot', head, -0.05, 0.08);
    if (chance(0.8)) at('smile', head, 0, 0.42);
    if (chance(fancy ? 0.6 : 0.4)) { at('cheek', head, -0.55, 0.22); at('cheek', head, 0.55, 0.22); }
    const hat = pick(['tophat', 'bobble', 'bobble', 'partyhat', 'tiara', 'earmuffs']);
    if (chance(fancy ? 1 : 0.85)) at(hat, head, rand(-0.08, 0.08), hat === 'earmuffs' ? -0.62 : -0.97);
    if (chance(0.7)) at('scarf', mid, 0, -0.8);
    else if (chance(0.5)) at('bowtie', mid, 0, -0.72);
    const btn = pick(['button', 'button', 'heart', 'star']), nb = randInt(2, 3);
    for (let j = 0; j < nb; j++) at(btn, mid, 0, -0.25 + j * 0.32);
    if (chance(0.4)) at(btn, base, 0, -0.3);
    if (chance(fancy ? 0.5 : 0.3)) at('bird', hat === 'earmuffs' ? head : mid, 0.5, hat === 'earmuffs' ? -0.95 : -0.95);
    if (chance(0.3)) at('flower', head, -0.45, -0.72);
    if (chance(0.22)) at('broom', base, 0.95, -0.35);
    if (chance(0.2)) at('mitten', mid, -1.25, -0.6);
    return out;
  }

  updateDecoAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai;
    if (!ai || st.zoomT < 1) { c.move(0, 0); return; }
    const goal = ai.plan[ai.pi];
    if (ai.mode === 'move' && goal) {
      const d = steer(st.p, st.cursor.x, st.cursor.y, goal.x, goal.y, { arrive: 70 });
      if (d < 12) { c.move(0, 0); c.press('a'); ai.pi++; ai.mode = 'tick'; ai.t = rand(0.35, 0.8) / aiProfile(st.p).speed; }
      return;
    }
    c.move(0, 0);
    ai.t -= dt;
    if (ai.t > 0) return;
    const hurry = !this.cpuOnly && this.stations.every((s) => s.ready || s.p.isAI);
    ai.t = rand(0.12, 0.3) * (hurry ? 0.5 : 1);
    const want = goal ? ITEM[goal.kind] : DONE;
    if (st.sel !== want) {
      const fwd = (want - st.sel + DONE + 1) % (DONE + 1);
      c.press(fwd <= (DONE + 1) / 2 ? 'x' : 'lb');
      return;
    }
    if (!goal) { c.press('a'); return; }
    ai.mode = 'move';
  }

  setReady(st, on) {
    st.ready = on; st.readyT = 0;
    const a = st.actor;
    if (on) {
      st.held = null; st.hover = null;
      sfx('ready'); a.playOnce('ready', 0.6, 'wave'); a.squash(-0.25);
      const cs = ballCenters(st.sm), s = this.toScreen(st, st.sm.x, cs[cs.length - 1].y);
      particles.burst(s.x, s.y, { type: 'confetti', count: 22, speed: [200, 480] });
      a.say('Done!', 1.3, 'ready');
    } else { sfx('back'); a.setPose('idle'); }
  }

  // --- CPU rolling ---------------------------------------------------------------------
  updateRollAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai, a = st.actor, b = st.ball;
    if (!b || st.lift || st.pat > 0) { c.move(0, 0); return; }
    if (ai.wait > 0) { ai.wait -= dt; c.move(0, 0); return; }
    const easy = (st.p.aiLevel ?? 0) === 0;
    if (!ai.target) {
      const n = st.sm.balls.length;
      const base = [rand(66, 84), rand(48, 60), rand(34, 44)][n] || 40;
      ai.target = base * (easy ? rand(0.85, 1) : 1);
    }
    if (ai.mode === 'grow') {
      ai.wpT -= dt;
      if (!ai.wp || ai.wpT <= 0 || Math.hypot(a.x - ai.wp.x, (a.y - ai.wp.y) / KY) < 70) {
        let best = null, bs = -1;
        for (let j = 0; j < 7; j++) {
          const x = rand(90, st.VW - 90), y = rand(60, FIELD_H - 40);
          const dd = Math.hypot(x - st.spot.x, (y - st.spot.y) / KY);
          if (dd < this.baseR(st) + 160) continue;
          const s = st.depth[this.cellAt(st, x, y)] + rand(0.3) - Math.hypot(x - a.x, y - a.y) / 3000;
          if (s > bs) { bs = s; best = { x, y }; }
        }
        ai.wp = best || { x: rand(90, st.VW - 90), y: rand(80, FIELD_H - 40) };
        ai.wpT = rand(2, 3.5);
      }
      steer(st.p, a.x, a.y, ai.wp.x, ai.wp.y, { arrive: 90 });
      if (b.r >= ai.target) { ai.mode = 'deliver'; ai.wait = rand(0.2, 0.6); ai.stuckT = 0; }
    } else {
      steer(st.p, b.x, b.y, st.spot.x, st.spot.y, { arrive: 60 });
      ai.stuckT += dt;
      if (st.canStack) {
        c.move(0, 0);
        ai.pressT = (ai.pressT ?? rand(0.2, 0.6)) - dt;
        if (ai.pressT <= 0) { c.press('a'); ai.pressT = null; ai.mode = 'grow'; ai.target = 0; ai.wp = null; ai.wait = 1.0; }
      } else if (ai.stuckT > 7) { ai.mode = 'grow'; ai.wp = null; ai.stuckT = 0; }
    }
  }

  // --- main update -----------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.2) this.banner = null; }
    for (const f of this.flakes) { f.y += f.v * dt; f.x += Math.sin(this.t + f.ph) * 12 * dt; if (f.y > H + 10) { f.y = -10; f.x = rand(W); } }
    if (this.phase === 'build') this.updateBuild(dt);
    else this.updateFinale(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    for (const st of this.stations) st.actor.update(dt);
  }

  updateBuild(dt) {
    for (const st of this.stations) {
      const a = st.actor;
      st.stackBump = Math.max(0, st.stackBump - dt);
      this.refillSnow(st, dt);
      for (const it of st.sm.items) {
        if (it.born !== 0 && it.born < 1) it.born += dt;
        if (it.fall) {
          it.fall.vy += 1600 * dt; it.gy += it.fall.vy * dt;
          if (it.gy >= it.fall.ty) {
            it.gy = it.fall.ty;
            if (it.fall.vy > 300) { it.fall.vy *= -0.3; } else { it.fall = null; const s = this.toScreen(st, it.gx, it.gy); particles.burst(s.x, s.y, { type: 'dust', count: 5, colors: SNOW, speed: [30, 90] }); }
          }
        }
      }
      if (st.mode === 'roll') {
        if (st.p.isAI) this.updateRollAI(st, dt);
        this.updateRoll(st, dt);
        if (this.t > ROLL_TIME) this.autoBuild(st);
      } else if (st.mode === 'built') {
        st.builtT += dt;
        if (st.p.isAI) st.p.ctrl.move(0, 0);
        if (st.builtT > 1.5) this.startDecorate(st);
      } else if (st.mode === 'deco') {
        this.updateDeco(st, dt);
        if (!st.ready && this.t - st.decoStart > DECO_TIME) this.setReady(st, true);
      }
      a.update(dt);
    }
    const allDeco = this.stations.every((s) => s.mode === 'deco');
    if (allDeco && this.stations.every((s) => s.ready && s.readyT > 0.7)) this.startFinale();
    if (!this.decoBanner && this.stations.some((s) => s.mode === 'deco' && !s.p.isAI)) { this.decoBanner = true; this.banner = { text: 'Decorate!', t: 0 }; }
  }

  // --- finale: night falls, the snowmen come alive -------------------------------------------
  startFinale() {
    if (this.phase === 'finale') return;
    for (const st of this.stations) { this.autoBuild(st); if (st.mode !== 'deco') this.startDecorate(st); st.zoomT = 1; st.view = { ...st.deco }; }
    this.phase = 'finale'; this.ft = 0; this.stage = 'dusk';
    this.banner = { text: 'Twinkle time!', t: 0 };
    music.stop(0.6);
    const n = this.n;
    const slotW = Math.min(520, (W - 140) / n);
    const maxH = Math.max(...this.stations.map((s) => stackHeight(s.sm))) + 110;
    const maxR = Math.max(...this.stations.map((s) => this.baseR(s)));
    this.showScale = Math.min(n <= 2 ? 1.6 : 1.25, (n <= 2 ? 660 : 560) / maxH, (slotW * 0.62) / (2 * maxR + 60));
    this.stations.forEach((st, i) => {
      const cx = W / 2 + (i - (n - 1) / 2) * slotW;
      const a = st.actor;
      if (st.p.isAI) { st.p.ctrl.move(0, 0); st.p.ctrl.hold('a', false); }
      st.held = null; st.hover = null; st.rollLoop?.stop(); st.rollLoop = null;
      st.show = { x: cx + slotW * 0.1, home: cx - slotW * 0.3, alive: false, aliveT: 0, hello: null, vz: 0, poseCD: 0, aiT: rand(0.3, 1) };
      st.baseScale = st.baseScale || a.scale;
      a.scale = Math.min(st.baseScale * this.showScale * 1.05, (slotW * 0.42) / Math.max(1, a.width / a.scale));
      a.x = st.show.home; a.y = SHOW_Y + 50; a.z = 0; a.facing = 1; a.snap(); a.setPose('idle');
    });
    snd('night-crickets', null, { vol: 0.3 });
  }

  updateFinale(dt) {
    this.ft += dt;
    const t = this.ft, n = this.n;
    const wakeAt = (i) => 1.6 + i * Math.min(0.5, 3 / n);
    const danceAt = wakeAt(n - 1) + 1.0, cheeseAt = danceAt + 5.5, shotAt = cheeseAt + 3;
    for (const [i, st] of this.stations.entries()) {
      const S = st.show, a = st.actor;
      if (!S.alive && t >= wakeAt(i)) {
        S.alive = true; S.aliveT = 0;
        snd('snowman-alive', 'wing-twinkle', { vol: 0.7 });
        const top = stackTop(st.sm);
        const sx = S.x, sy = SHOW_Y + (top - st.sm.y) * this.showScale * 0.55;
        particles.burst(sx, sy, { type: 'sparkle', count: 22, colors: ['#fff', '#bfe6ff', '#ffd23f'], speed: [120, 380] });
        particles.ring(sx, sy, '#bfe6ff', 200 * this.showScale, 0.5);
        S.hello = { text: pick(HELLO), t: 0 };
        a.playOnce('surprised', 0.5, 'idle'); a.emote('heart', 1.6);
      }
      if (S.alive && !S.cheered && S.aliveT > 0.5) { S.cheered = true; a.playOnce('cheer', 0.9, a.pose === 'dance' ? 'dance' : 'idle'); }
      if (S.alive) { S.aliveT += dt; if (S.hello) { S.hello.t += dt; if (S.hello.t > 2.4) S.hello = null; } }
      if (t >= danceAt) this.showMove(st, dt, t < shotAt);
      a.update(dt);
    }
    if (this.stage === 'dusk' && t >= danceAt) {
      this.stage = 'dance'; music.play('dance');
      this.banner = { text: 'Snowman dance party!', t: 0 };
      for (const st of this.stations) if (st.p.isAI) st.actor.setPose('dance');
    }
    if (this.stage === 'dance' && t >= cheeseAt) { this.stage = 'cheese'; this.banner = { text: 'Say cheese!', t: 0 }; sfx('giggle'); }
    if (this.stage === 'cheese') {
      for (const d of [3, 2, 1]) if (t - dt < shotAt - d && t >= shotAt - d) sfx(d === 1 ? 'tock' : 'tick');
      if (t >= shotAt) {
        this.stage = 'photo'; this.photoT = 0;
        snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.5);
        particles.confettiRain(W, 140); snd('applause', 'cheer'); sfx('yay');
        for (const st of this.stations) st.actor.playOnce('photo', 1.4, 'celebrate');
      }
    }
    if (this.stage === 'photo') {
      this.photoT += dt;
      if (this.photoT > 3.2 || (this.photoT > 1.4 && this.players.some((p) => !p.isAI && p.ctrl.pressed('a')))) this.finishGame();
    }
  }

  /** Dance party: the stick moves you about by your snowman, A jumps, other buttons strike poses. */
  showMove(st, dt, free) {
    const S = st.show, a = st.actor, c = st.p.ctrl;
    S.poseCD = Math.max(0, S.poseCD - dt);
    let { x: mx } = photoMove(c), jump = c.pressed('a'), pose = photoPosePressed(c);
    if (!free) { mx = 0; jump = false; pose = null; }
    if (st.p.isAI && free) {
      S.aiT -= dt;
      if (S.aiT <= 0) { S.aiT = rand(0.6, 1.4); S.aiM = chance(0.35) ? rand(-0.7, 0.7) : 0; if (chance(0.35)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      mx = S.aiM || 0;
      if (Math.abs(a.x - S.home) > 70) mx = Math.sign(S.home - a.x) * 0.6;
    }
    const slotW = Math.min(520, (W - 140) / this.n);
    const sp = 380;
    a.x = clamp(a.x + mx * sp * dt, S.home - slotW * 0.25, S.home + slotW * 0.12);
    if (jump && a.z <= 0) { S.vz = 900; snd('boing', 'jump', { vol: 0.35 }); a.squash(-0.25); }
    S.vz -= 2800 * dt; a.z = Math.max(0, a.z + S.vz * dt);
    if (a.z <= 0 && S.vz < 0) { if (S.vz < -200) a.squash(0.2); S.vz = 0; }
    if (pose && S.poseCD <= 0) { S.poseCD = 0.35; strikePhotoPose(a, pose); }
    if (a.z > 0) { if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1; if (!a._once) a.setPose('jump'); }
    else if (Math.abs(mx) > 0.15) a.moveAnim(mx * sp, 0, sp);
    else if (!a._once && (a.pose === 'walk' || a.pose === 'jump')) a.setPose(st.p.isAI ? 'dance' : 'idle');
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const hs = this.stations.map((s) => stackHeight(s.sm)), its = this.stations.map((s) => s.sm.items.filter((i) => i.ball >= 0).length);
    const maxH = Math.max(...hs), maxI = Math.max(...its);
    const stats = this.stations.map((st, i) => {
      const bits = [`${its[i]} decoration${its[i] === 1 ? '' : 's'}`];
      if (this.n > 1 && hs[i] === maxH) bits.push('Tallest!');
      else if (this.n > 1 && its[i] === maxI && maxI > 0) bits.push('Fanciest!');
      else { const n = Math.max(1, Math.round(st.rolled / 60)); bits.push(`Rolled ${n} step${n === 1 ? '' : 's'}`); }
      return bits.join(' · ');
    });
    this.api.finish({ showcase: true, highlight: null, stats, title: 'Snow-tastic!' });
  }

  onDone() {
    if (this.phase !== 'finale') {
      for (const st of this.stations) { this.autoBuild(st); if (st.mode === 'built') this.startDecorate(st); }
      this.startFinale();
      return;
    }
    this.finishGame();
  }

  destroy() { for (const st of this.stations) st.rollLoop?.stop(); }

  // =========================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'finale') {
      const fade = clamp(this.ft / 1.2, 0, 1);
      if (fade < 1) this.drawBuild(g);
      g.save(); g.globalAlpha = fade; this.drawShow(g); g.restore();
    } else this.drawBuild(g);
    this.drawFlakes(g);
    if (this.banner) ui.banner(g, this.banner.text, this.banner.t, { size: 110, y: this.phase === 'finale' ? 190 : H / 2, color: '#ffffff' });
    if (this.phase === 'finale') this.drawShowHUD(g);
  }

  drawBuild(g) {
    const bg = art('bg/snowman-builder');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#9fc9ff'); gr.addColorStop(1, '#e7f2ff');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let x = 0; x < W; x += 80) for (let y = 30; y < H; y += 80) sparkleAt(g, x + ((y / 80) % 2) * 40, y, 8 + Math.sin(this.t * 2 + x * 0.1 + y) * 3, 'rgba(255,255,255,0.55)');
    }
    // title
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -330, -40, 660, 80, { r: 40, fill: '#5fb3ff' });
    ui.text(g, 'Snowman Builder', 0, 2, { size: 52, weight: 800 });
    g.restore();
    this.drawMiniSnowman(g, W / 2 - 385, 92, 0.42);
    this.drawMiniSnowman(g, W / 2 + 385, 92, 0.42);
    const left = this.t < ROLL_TIME ? ROLL_TIME - this.t : 0;
    if (left > 0 && left < 25 && this.stations.some((s) => s.mode === 'roll')) {
      ui.timer(g, left, W - 120, 56);
    } else if (this.n <= 2 && this.stations.some((s) => s.mode === 'deco' && !s.ready && !s.p.isAI)) {
      ui.hints(g, [['y', 'Surprise!']], W - 200, 56, { size: 34 });
    }
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawMiniSnowman(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const bob = Math.sin(this.t * 3 + x) * 4;
    drawBall(g, 0, -40, 40, { seed: 1 }); drawBall(g, 0, -100 + bob * 0.5, 30, { seed: 2 }); drawBall(g, 0, -145 + bob, 22, { seed: 3 });
    drawItem(g, 'coal', -8, -150 + bob, 0.55); drawItem(g, 'coal', 8, -150 + bob, 0.55); drawItem(g, 'carrot', 0, -142 + bob, 0.45);
    drawItem(g, 'bobble', 0, -160 + bob, 0.55, { color: '#ff4d6d' });
    g.restore();
  }

  drawStation(g, st) {
    const { r, p } = st, v = st.view;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26); g.clip();
    g.save(); g.translate(v.ox, v.oy); g.scale(v.k, v.k);
    this.drawYard(g, st);
    this.drawYardThings(g, st);
    g.restore();
    if (st.mode === 'deco' && !st.ready && this.phase === 'build') this.drawCursor(g, st);
    g.restore();
    g.save(); ui.roundRect(g, r.x, r.y, r.w, r.h, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke(); g.restore();
    if (this.phase !== 'build') return;
    this.drawStationTop(g, st);
    if (st.mode === 'deco' && st.zoomT > 0.5) {
      g.save(); g.globalAlpha = clamp((st.zoomT - 0.5) * 2, 0, 1);
      this.drawList(g, st);
      if (st.ready) this.drawReady(g, st);
      g.restore();
    }
    this.drawStationHints(g, st);
  }

  drawYard(g, st) {
    const VW = st.VW, sc = st.scenery, t = this.t;
    const bgA = art('bg/snowman-builder-yard');
    if (bgA) {
      // The delivered yard paints its horizon line at y = 355 (asked for 400): put that line on the field's top edge.
      const HZ = 355, s = Math.max(VW / 2400, (FIELD_H + FLOOR_PAD) / (1200 - HZ), (-VIEW_TOP + 300) / HZ);
      g.drawImage(bgA, VW / 2 - 1200 * s, -HZ * s, 2400 * s, 1200 * s);
    } else {
      const top = VIEW_TOP - 400;
      const sky = g.createLinearGradient(0, top, 0, 0);
      sky.addColorStop(0, '#7cc0ff'); sky.addColorStop(0.7, '#bfe2ff'); sky.addColorStop(1, '#e9f6ff');
      g.fillStyle = sky; g.fillRect(-400, top, VW + 800, -top + 2);
      // soft sun + clouds
      g.fillStyle = 'rgba(255,246,200,0.8)'; g.beginPath(); g.arc(VW * 0.12, -200, 46, 0, TAU); g.fill();
      ui.cloud(g, VW * 0.3 + Math.sin(t * 0.1) * 30, -190, 0.9);
      ui.cloud(g, VW * 0.8 + Math.sin(t * 0.08 + 2) * 30, -150, 0.7);
      // far hills with pines
      g.fillStyle = '#dbe9fb';
      g.beginPath(); g.moveTo(-400, 0);
      for (let x = -400; x <= VW + 400; x += 40) g.lineTo(x, -70 - Math.sin(x * 0.006 + sc.hill1) * 34 - Math.sin(x * 0.017) * 10);
      g.lineTo(VW + 400, 10); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(36,22,63,0.18)'; g.lineWidth = 3; g.stroke();
      for (const tr of sc.trees) this.drawPine(g, tr.x, tr.y - 18, tr.s * 0.8, '#7fb8a8');
      if (sc.cabin > 0) this.drawCabin(g, sc.cabin, -6, 0.7);
      g.fillStyle = '#eef5ff';
      g.beginPath(); g.moveTo(-400, 20);
      for (let x = -400; x <= VW + 400; x += 40) g.lineTo(x, -24 - Math.sin(x * 0.009 + sc.hill2) * 18);
      g.lineTo(VW + 400, 30); g.closePath(); g.fill();
      // the snow field
      const gr = g.createLinearGradient(0, 0, 0, FIELD_H);
      gr.addColorStop(0, '#e6f0fd'); gr.addColorStop(1, '#fbfdff');
      g.fillStyle = gr; g.fillRect(-400, -4, VW + 800, FIELD_H + FLOOR_PAD + 100);
    }
    // glints in the fresh snow
    for (const s of st.sparkles) {
      const d = st.depth[this.cellAt(st, s.x, s.y)];
      if (d < 0.6) continue;
      const k = Math.max(0, Math.sin(t * 2.2 + s.ph));
      sparkleAt(g, s.x, s.y, 7 * k * d, 'rgba(160,200,255,0.9)');
    }
    // rolled tracks
    g.drawImage(st.trail, 0, 0, st.trail.width * 2, st.trail.height * 2);
    // snowman spot
    if (!st.sm.balls.length && st.mode === 'roll') {
      const sp = st.spot, pulse = 1 + Math.sin(t * 4) * 0.06;
      g.save(); g.translate(sp.x, sp.y); g.scale(pulse, pulse);
      g.fillStyle = 'rgba(95,179,255,0.18)'; g.beginPath(); g.ellipse(0, 0, 80, 80 * KY, 0, 0, TAU); g.fill();
      g.setLineDash([14, 10]); g.lineDashOffset = -t * 30; g.lineWidth = 5; g.strokeStyle = st.p.color; g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(95,179,255,0.8)'; g.lineWidth = 6; g.lineCap = 'round';
      for (let j = 0; j < 3; j++) { const a = (j / 3) * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30 * KY); g.lineTo(-Math.cos(a) * 30, -Math.sin(a) * 30 * KY); g.stroke(); }
      g.restore();
      // a bouncing arrow
      const by = sp.y - 120 + Math.sin(t * 5) * 12;
      g.save(); g.translate(sp.x, by);
      g.beginPath(); g.moveTo(-22, -26); g.lineTo(22, -26); g.lineTo(22, 0); g.lineTo(38, 0); g.lineTo(0, 36); g.lineTo(-38, 0); g.lineTo(-22, 0); g.closePath();
      g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
      g.restore();
    }
  }

  drawPine(g, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#8b6a50'; g.fillRect(-5, -6, 10, 14);
    g.fillStyle = col; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3; g.lineJoin = 'round';
    for (let j = 0; j < 3; j++) {
      const w = 34 - j * 8, yy = -8 - j * 22;
      g.beginPath(); g.moveTo(-w, yy); g.lineTo(0, yy - 34); g.lineTo(w, yy); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-w * 0.5, yy - 17); g.lineTo(0, yy - 34); g.lineTo(w * 0.5, yy - 17); g.quadraticCurveTo(0, yy - 12, -w * 0.5, yy - 17); g.fill();
      g.fillStyle = col;
    }
    g.restore();
  }

  drawCabin(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineJoin = 'round';
    g.fillStyle = '#d9606a'; g.fillRect(-40, -50, 80, 50); g.strokeRect(-40, -50, 80, 50);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-50, -48); g.lineTo(0, -86); g.lineTo(50, -48); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffe08a'; g.fillRect(-26, -38, 16, 14); g.fillRect(10, -38, 16, 14);
    g.fillStyle = '#7a4a3a'; g.fillRect(-7, -28, 14, 28);
    g.restore();
  }

  drawYardThings(g, st) {
    const t = this.t, sm = st.sm;
    const list = [];
    const bump = st.stackBump;
    // the snowman (with its squash after a ball lands)
    list.push({ y: sm.y, draw: () => {
      if (!sm.balls.length) return;
      g.save();
      const sq = Math.sin(bump * 22) * bump * 0.18;
      g.translate(sm.x, sm.y); g.scale(1 + sq, 1 - sq); g.translate(-sm.x, -sm.y);
      drawSnowman(g, sm, sm.x, sm.y, { t, hover: st.mode === 'deco' && !st.ready ? st.hover : null, held: st.held, color: st.p.color });
      g.restore();
    } });
    // decorations dropped in the snow
    for (const it of sm.items) if (it.ball < 0 && it !== st.held && it.born >= 0) list.push({ y: it.gy, draw: () => {
      drawShadow(g, it.gx, it.gy, 16, 0.12);
      if (st.hover === it) { g.save(); g.globalAlpha = 0.7; g.beginPath(); g.arc(it.gx, it.gy - 10, 34, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); g.restore(); }
      drawItem(g, it.kind, it.gx, it.gy - (itemDef(it.kind).anchor === 'b' ? 0 : 10), it.gs, { rot: it.rot, flip: it.flip, color: it.color, t });
    } });
    // the player
    const a = st.actor;
    if (this.phase === 'build') list.push({ y: a.y, draw: () => a.draw(g, { ring: st.p.color }) });
    // the rolling snowball
    const b = st.ball;
    if (b) list.push({ y: b.y + 0.5, draw: () => {
      drawShadow(g, b.x, b.y, b.r);
      const sq = b.pat ? Math.sin(b.pat * 30) * 0.06 : 0;
      g.save(); g.translate(b.x, b.y); g.scale(1 + sq, 1 - sq); g.translate(-b.x, -b.y);
      drawBall(g, b.x, b.y - b.r, b.r, { spin: b.spin, dir: b.dir || 0, seed: b.seed, glow: st.canStack ? 0.6 + 0.4 * Math.sin(t * 8) : 0, t });
      g.restore();
    } });
    list.sort((p, q) => p.y - q.y);
    for (const e of list) e.draw();
    // a ball being lifted onto the stack
    const L = st.lift;
    if (L) {
      const u = clamp(L.t / L.dur, 0, 1), e = ease.inOutQuad(u);
      const x = lerp(L.x0, L.x1, e), y = lerp(L.y0, L.y1, e) - Math.sin(u * Math.PI) * 110;
      drawBall(g, x, y, L.ball.r, { spin: L.spin + u * 4, dir: 0, seed: L.ball.seed });
    }
    // "A Stack!" prompt over the ball
    if (st.canStack && b && !st.p.isAI) {
      const x = b.x, y = b.y - b.r * 2 - 46 + Math.sin(t * 6) * 5, s = 1 / Math.max(0.5, st.view.k);
      g.save(); g.translate(x, y); g.scale(s, s);
      ui.panel(g, -84, -28, 168, 56, { r: 28, fill: '#ffffff', lineWidth: 4, shadow: false });
      ui.glyph(g, 'a', -50, 0, 40, { pulse: true });
      ui.text(g, 'Stack!', 18, 2, { size: 32, color: NAVY, stroke: false, weight: 800 });
      g.restore();
    }
  }

  drawCursor(g, st) {
    if (st.zoomT < 1) return;
    const cur = st.cursor, s = this.toScreen(st, cur.x, cur.y), k = st.view.k, t = this.t;
    const held = st.held, sel = st.sel;
    const kind = held ? held.kind : sel < DONE ? ITEMS[sel].id : null;
    // ghost preview of where it will stick
    if (kind && !st.hover) {
      const att = attachAt(st.sm, cur.x, cur.y, kind);
      g.save(); g.translate(st.view.ox, st.view.oy); g.scale(k, k);
      if (att) {
        const cs = ballCenters(st.sm), p = itemPos({ ...att, kind }, cs, st.sm);
        g.globalAlpha = held ? 0.9 : 0.45 + Math.sin(t * 6) * 0.1;
        if (kind === 'scarf') {
          const c = cs[att.ball];
          g.strokeStyle = held?.color || st.p.color; g.lineWidth = c.r * 0.28; g.globalAlpha *= 0.6;
          g.beginPath(); g.ellipse(c.x, c.y + att.v * c.r, Math.sqrt(Math.max(0, 1 - att.v * att.v)) * c.r, c.r * 0.12, 0, 0.1, Math.PI - 0.1); g.stroke();
        } else drawItem(g, kind, p.x, p.y, p.s, { rot: att.rot, flip: att.flip, color: held?.color || null, t });
      } else {
        g.globalAlpha = 0.5; g.fillStyle = 'rgba(36,22,63,0.25)';
        g.beginPath(); g.ellipse(cur.x, st.sm.y + 20, 20, 7, 0, 0, TAU); g.fill();
      }
      g.restore();
    }
    const sz = clamp(64 * k, 34, 70);
    g.save();
    if (held) {
      g.save(); g.translate(st.view.ox, st.view.oy); g.scale(k, k);
      const cs = ballCenters(st.sm), sc = held.ball >= 0 ? itemPos(held, cs, st.sm).s : 1;
      drawItem(g, held.kind, cur.x, cur.y, sc, { rot: held.rot, flip: held.flip, color: held.color, t });
      g.restore();
      g.beginPath(); g.arc(s.x, s.y, sz * 0.62, 0, TAU); g.lineWidth = 5; g.setLineDash([9, 7]); g.strokeStyle = st.p.color; g.stroke(); g.setLineDash([]);
    } else {
      g.beginPath(); g.arc(s.x, s.y, sz * 0.62, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
      g.lineWidth = 5; g.strokeStyle = st.p.color; g.stroke();
      if (kind) drawItemIcon(g, kind, s.x, s.y, sz * 0.95, t);
      else { g.fillStyle = '#36d17a'; g.beginPath(); g.arc(s.x, s.y, sz * 0.4, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(s.x - sz * 0.18, s.y); g.lineTo(s.x - sz * 0.04, s.y + sz * 0.14); g.lineTo(s.x + sz * 0.2, s.y - sz * 0.14); g.stroke(); }
    }
    if (this.players.filter((pp) => !pp.isAI).length > 1 || st.p.isAI) ui.text(g, st.p.tag, s.x, s.y - sz * 0.62 - 14, { size: 20, color: st.p.color, strokeWidth: 4 });
    const tip = held ? [['a', 'Put down'], ['b', 'Take off']] : st.hover ? [['a', 'Move'], ['b', 'Take off']] : null;
    if (tip && !st.p.isAI) {
      const fs = clamp(26 * k + 6, 18, 28), gsz = fs * 1.15;
      let w = 14;
      for (const [, l] of tip) w += gsz + 6 + ui.measure(g, l, fs, 800) + 12;
      const r = st.r;
      const bx = clamp(s.x - w / 2, r.x + 8, r.x + r.w - this.listW(st) - w - 16);
      const by = Math.max(r.y + 50, s.y - sz * 0.62 - 34 - gsz * 1.6);
      ui.panel(g, bx, by, w, gsz * 1.6, { r: gsz * 0.8, fill: 'rgba(255,255,255,0.94)', lineWidth: 3, shadow: false });
      let tx = bx + 10;
      for (const [b, l] of tip) {
        ui.glyph(g, b, tx + gsz / 2, by + gsz * 0.8, gsz); tx += gsz + 6;
        ui.text(g, l, tx, by + gsz * 0.8 + 1, { size: fs, color: NAVY, stroke: false, align: 'left', weight: 800 });
        tx += ui.measure(g, l, fs, 800) + 12;
      }
    }
    g.restore();
  }

  /** Player chip + snowball progress (or step) at the top-left of each yard. */
  drawStationTop(g, st) {
    const { r, p } = st;
    const sz = clamp(r.h * 0.07, 30, 44);
    const x = r.x + 16, y = r.y + 14 + sz / 2;
    const tw = clamp(sz * 2, 56, 84);
    ui.panel(g, x, y - sz / 2, tw, sz, { r: sz / 2, fill: p.color, lineWidth: 3, shadow: false });
    ui.text(g, p.tag, x + tw / 2, y + 1, { size: sz * 0.55, strokeWidth: 4, shadow: false });
    let px = x + tw + 10;
    if (r.w > 600) { drawPortrait(g, p, px + sz * 0.5, y, sz * 0.5, { ring: p.color, ringWidth: 3, expr: 'happy' }); px += sz * 1.15; }
    if (st.mode === 'roll' || st.mode === 'built') {
      const n = st.sm.balls.length + (st.lift ? 0 : 0);
      const w = sz * 3 + 30;
      ui.panel(g, px, y - sz / 2, w, sz, { r: sz / 2, fill: 'rgba(255,255,255,0.9)', lineWidth: 3, shadow: false });
      for (let j = 0; j < 3; j++) {
        const cx = px + 15 + sz * (j + 0.5), rr = sz * (0.38 - j * 0.05);
        if (j < n) drawBall(g, cx, y, rr, { seed: j });
        else { g.save(); g.setLineDash([4, 4]); g.lineWidth = 2.5; g.strokeStyle = 'rgba(36,22,63,0.4)'; g.beginPath(); g.arc(cx, y, rr, 0, TAU); g.stroke(); g.restore(); }
      }
      px += w + 10;
      const left = ROLL_TIME - this.t;
      if (st.mode === 'roll' && left < 20 && left > 0 && this.n > 1) ui.text(g, `${Math.ceil(left)}`, px + 22, y + 1, { size: sz * 0.8, color: left < 6 ? '#ff4d6d' : '#fff' });
    } else if (st.mode === 'deco' && !st.ready) {
      const left = DECO_TIME - (this.t - st.decoStart);
      if (left < 20) {
        ui.panel(g, px, y - sz / 2, sz * 3.4, sz, { r: sz / 2, fill: left < 6 ? '#ff4d6d' : '#ffffff', lineWidth: 3, shadow: false });
        ui.text(g, `Showtime ${Math.ceil(left)}`, px + sz * 1.7, y + 1, { size: sz * 0.5, color: left < 6 ? '#fff' : NAVY, stroke: false, weight: 800 });
      }
    }
  }

  drawList(g, st) {
    const r = st.r, lw = this.listW(st);
    const lr = { x: r.x + r.w - lw - 10, y: r.y + 12, w: lw, h: r.h - st.hintH - 30 };
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.9)', lineWidth: 4, shadow: false });
    const headH = clamp(lr.h * 0.08, 24, 50);
    ui.text(g, 'Decorate', lr.x + lr.w / 2, lr.y + headH * 0.62, { size: headH * 0.7, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 16 });
    const total = DONE + 1;
    const footH = clamp(lr.h * 0.08, 26, 46);
    const areaY = lr.y + headH + 6, areaH = lr.h - headH - 14 - footH;
    const vis = Math.min(total, Math.max(3, Math.floor(areaH / 60)));
    const slotH = areaH / vis;
    const first = clamp(st.sel - Math.floor(vis / 2), 0, total - vis);
    const named = lr.w >= 190;
    for (let j = 0; j < vis; j++) {
      const ii = first + j, sel = ii === st.sel, done = ii === DONE;
      const sy = areaY + j * slotH;
      const bump = sel ? st.listBump * 0.6 : 0;
      g.save(); g.translate(lr.x + lr.w / 2, sy + slotH / 2); g.scale(1 + bump, 1 + bump);
      const bw = lr.w - 16, bh = slotH - 6;
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 14, fill: done ? (sel ? '#36d17a' : '#bff0d2') : sel ? '#ffd23f' : '#ffffff', lineWidth: sel ? 4 : 2, stroke: sel ? NAVY : 'rgba(36,22,63,0.25)', shadow: false });
      const isz = Math.min(bh * 0.95, named ? bh : bw * 0.8);
      const ix = named ? -bw / 2 + isz / 2 + 6 : 0;
      if (done) {
        g.fillStyle = sel ? '#ffffff' : '#36d17a'; g.beginPath(); g.arc(ix, 0, isz * 0.3, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        g.lineWidth = 4; g.strokeStyle = sel ? '#36d17a' : '#fff'; g.beginPath(); g.moveTo(ix - isz * 0.13, 0); g.lineTo(ix - isz * 0.03, isz * 0.1); g.lineTo(ix + isz * 0.14, -isz * 0.1); g.stroke();
        if (named) ui.text(g, 'Done!', ix + isz / 2 + 8, 2, { size: clamp(bh * 0.36, 16, 32), color: sel ? '#fff' : NAVY, stroke: sel ? NAVY : false, align: 'left', weight: 800 });
      } else {
        drawItemIcon(g, ITEMS[ii].id, ix, 0, isz, this.t);
        if (named) ui.text(g, ITEMS[ii].name, ix + isz / 2 + 8, 2, { size: clamp(bh * 0.3, 15, 28), color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: bw - isz - 20 });
      }
      g.restore();
    }
    g.fillStyle = NAVY;
    const ax = lr.x + lr.w / 2;
    if (first > 0) { g.beginPath(); g.moveTo(ax - 12, areaY + 2); g.lineTo(ax + 12, areaY + 2); g.lineTo(ax, areaY - 10); g.fill(); }
    if (first + vis < total) { const yb = areaY + areaH; g.beginPath(); g.moveTo(ax - 12, yb - 2); g.lineTo(ax + 12, yb - 2); g.lineTo(ax, yb + 10); g.fill(); }
    const fy = lr.y + lr.h - footH / 2 - 6, fs = footH * 0.62;
    ui.glyph(g, st.p.ctrl.kind === 'pad' ? 'dpad' : 'x', lr.x + 16 + fs / 2, fy, fs);
    ui.text(g, 'Next', lr.x + 26 + fs, fy + 1, { size: fs * 0.72, color: NAVY, stroke: false, align: 'left', weight: 800, maxWidth: lr.w - fs - 40 });
  }

  drawReady(g, st) {
    const r = st.r, lw = this.listW(st);
    const lr = { x: r.x + r.w - lw - 10, y: r.y + 12, w: lw, h: r.h - st.hintH - 30 };
    g.save();
    ui.roundRect(g, lr.x, lr.y, lr.w, lr.h, 22); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
    const cx = lr.x + lr.w / 2, cy = lr.y + lr.h * 0.36;
    const sc = ease.outBack(Math.min(1, st.readyT / 0.3));
    g.translate(cx, cy); g.rotate(-0.12); g.scale(sc, sc);
    const w = Math.min(lr.w * 0.92, 300), h = w * 0.36;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: h / 2, fill: '#36d17a', lineWidth: 5 });
    ui.text(g, 'Ready!', 0, 2, { size: h * 0.55, weight: 800 });
    g.restore();
    const waiting = this.stations.filter((s) => !s.ready).length;
    const sz = clamp(lr.w * 0.09, 15, 28);
    if (waiting) ui.text(g, waiting === 1 ? 'Waiting for 1 builder...' : `Waiting for ${waiting} builders...`, cx, cy + lr.h * 0.24, { size: sz, color: NAVY, stroke: false, maxWidth: lr.w - 20 });
    if (!st.p.isAI) ui.hints(g, [['b', 'Change']], cx, cy + lr.h * 0.4, { size: sz * 1.3 });
  }

  drawStationHints(g, st) {
    const { r, p } = st;
    if (p.isAI) return;
    const y = r.y + r.h - st.hintH / 2 - 8;
    const sz = clamp(st.hintH * 0.72, 26, 42);
    const pad = p.ctrl.kind === 'pad';
    let items;
    if (st.mode === 'roll') items = st.canStack ? [['stick', 'Push'], ['a', 'Stack it!']] : [['stick', 'Push your snowball'], ['a', 'Pat']];
    else if (st.mode === 'built') items = [];
    else if (st.ready) items = [['b', 'Change']];
    else if (st.held) items = [['stick', 'Move'], ['a', 'Put down'], ['b', 'Take off']];
    else if (st.sel === DONE) items = [['a', 'Done!'], [pad ? 'dpad' : 'x', 'Pick'], ['y', 'Surprise!']];
    else items = [['stick', 'Move'], ['a', st.hover ? 'Pick up' : 'Add'], [pad ? 'dpad' : 'x', 'Pick'], ['b', st.hover ? 'Take off' : 'Undo'], ['y', 'Surprise!']];
    if (!items.length) return;
    const wide = r.w > 700;
    if (!wide) items = items.map(([b, l]) => [b, l === 'Surprise!' || l === 'Pick' ? '' : l]);
    const x0 = r.x + 16, avail = r.w - 32 - (st.mode === 'deco' ? this.listW(st) + 10 : 0), lab = sz * 0.62;
    let need = 0;
    for (const [, l] of items) need += sz + 6 + (l ? ui.measure(g, l, lab) + 18 : 12);
    const k = Math.min(1, avail / need);
    g.save(); g.translate(x0 + Math.max(0, (avail - need * k) / 2), y); g.scale(k, k);
    ui.panel(g, -12, -sz * 0.62, need + 14, sz * 1.24, { r: sz * 0.62, fill: 'rgba(36,22,63,0.55)', stroke: false, shadow: false });
    let x = 0;
    for (const [b, l] of items) {
      ui.glyph(g, b, x + sz / 2, 0, sz, { pulse: b === 'a' && (st.canStack || st.sel === DONE) });
      x += sz + 6;
      if (l) { ui.text(g, l, x, 2, { size: lab, color: '#fff', align: 'left', strokeWidth: 5 }); x += ui.measure(g, l, lab) + 18; } else x += 12;
    }
    g.restore();
  }

  drawFlakes(g) {
    g.save(); g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const f of this.flakes) { g.beginPath(); g.arc(f.x, f.y, f.s * 0.6, 0, TAU); g.fill(); }
    g.restore();
  }

  // --- the showcase ------------------------------------------------------------------
  drawShow(g) {
    const t = this.t, ft = this.ft;
    const bg = art('bg/snowman-builder-night');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else this.drawNight(g, t);
    // snowmen + builders sorted back to front
    const sc = this.showScale;
    const beat = (music.bpm || 120) / 60;
    const dancing = this.stage !== 'dusk';
    for (const [i, st] of this.stations.entries()) {
      const S = st.show, sm = st.sm;
      const al = S.alive ? clamp(S.aliveT / 0.5, 0, 1) : 0;
      const ph = t * beat * Math.PI + i * 0.7;
      const hop = S.alive ? (dancing ? Math.abs(Math.sin(ph)) * 26 : Math.abs(Math.sin(S.aliveT * 9)) * 18 * Math.max(0, 1 - S.aliveT)) : 0;
      if (dancing && S.alive && Math.sin(ph) * Math.sin(ph - 0.15) < 0 && Math.cos(ph) > 0) { /* landing */ }
      const anim = S.alive ? { hop, sway: (dancing ? Math.sin(ph * 0.5) * 9 : Math.sin(t * 2 + i) * 4) * al, squash: dancing ? Math.max(0, -Math.cos(ph * 2)) * 0.06 : 0, wave: al * (dancing ? 0.9 : 0.6), blink: ((t * 0.8 + i * 0.37) % 3) < 0.12 ? 1 : 0, flap: al } : null;
      g.save(); g.translate(S.x, SHOW_Y); g.scale(sc, sc);
      // a soft spotlight pool
      g.fillStyle = `rgba(255,240,200,${0.18 + al * 0.12})`; g.beginPath(); g.ellipse(0, 6, this.baseR(st) * 1.6, 26, 0, 0, TAU); g.fill();
      drawSnowman(g, sm, 0, 0, { t, anim, sparkle: al * 0.8 });
      g.restore();
      if (S.hello) {
        const top = SHOW_Y + (stackTop(sm) - sm.y - 30) * sc - hop * sc;
        const p = ease.outBack(clamp(S.hello.t / 0.3, 0, 1)), fs = clamp(30 * sc, 20, 36);
        const w = ui.measure(g, S.hello.text, fs, 800) + 34;
        g.save(); g.translate(S.x + 30 * sc, top - 40 * sc); g.scale(p, p); g.globalAlpha = clamp((2.4 - S.hello.t) / 0.3, 0, 1);
        ui.panel(g, -w / 2, -fs, w, fs * 2, { r: fs, fill: '#ffffff', lineWidth: 4, shadow: false });
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-12, fs - 2); g.lineTo(-22, fs + 18); g.lineTo(4, fs - 2); g.fill();
        g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(-12, fs); g.lineTo(-22, fs + 18); g.lineTo(4, fs); g.stroke();
        ui.text(g, S.hello.text, 0, 1, { size: fs, color: NAVY, stroke: false, weight: 800 });
        g.restore();
      }
      if (ft > 1.2) ui.playerTag(g, st.p, S.x, SHOW_Y + 70);
    }
    const actors = this.stations.map((s) => s.actor).sort((p, q) => p.y - q.y);
    for (const a of actors) { const st = this.stations.find((s) => s.actor === a); a.draw(g, { ring: this.stage === 'photo' ? null : st.p.color }); }
    if (this.stage === 'photo') this.drawPhotoFrame(g);
  }

  drawNight(g, t) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#16123f'); gr.addColorStop(0.5, '#3b2f7d'); gr.addColorStop(0.75, '#6d5bb0'); gr.addColorStop(1, '#8a7cc4');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // aurora
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [col, y0, amp, sp] of [['rgba(80,255,180,0.10)', 210, 60, 0.3], ['rgba(255,110,220,0.08)', 260, 50, 0.22], ['rgba(110,200,255,0.08)', 170, 40, 0.4]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, y0);
      for (let x = 0; x <= W; x += 40) g.lineTo(x, y0 + Math.sin(x * 0.004 + t * sp) * amp + Math.sin(x * 0.011 - t * sp * 1.7) * amp * 0.4);
      for (let x = W; x >= 0; x -= 40) g.lineTo(x, y0 + 120 + Math.sin(x * 0.005 + t * sp + 1) * amp * 0.6);
      g.closePath(); g.fill();
    }
    g.restore();
    // stars
    for (const s of this.stars) { const k = 0.5 + 0.5 * Math.sin(t * 2 + s.ph); sparkleAt(g, s.x, s.y, s.s * (1 + k), `rgba(255,250,220,${0.4 + k * 0.6})`); }
    // moon
    const mg = g.createRadialGradient(1640, 160, 10, 1640, 160, 180); mg.addColorStop(0, 'rgba(255,250,220,0.35)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(1640, 160, 180, 0, TAU); g.fill();
    g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(1640, 160, 62, 0, TAU); g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(36,22,63,0.4)'; g.stroke();
    g.fillStyle = 'rgba(220,210,170,0.5)'; for (const [dx, dy, rr] of [[-18, -10, 12], [16, 14, 9], [10, -24, 6]]) { g.beginPath(); g.arc(1640 + dx, 160 + dy, rr, 0, TAU); g.fill(); }
    // hills + pines
    g.fillStyle = '#4b4396'; g.beginPath(); g.moveTo(0, 740);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, 700 - Math.sin(x * 0.004 + 1) * 50 - Math.sin(x * 0.013) * 14);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    for (const [x, s] of [[80, 1.6], [190, 1.25], [1740, 1.5], [1850, 1.2], [300, 0.9], [1620, 0.95]]) this.drawPine(g, x, 760, s * 1.6, '#3f7f7a');
    // fairy lights looping across the top
    for (let s = 0; s < 2; s++) {
      const y0 = 70 + s * 40, sag = 90;
      g.strokeStyle = 'rgba(30,20,60,0.8)'; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= W; x += 20) { const u = (x % 480) / 480; const y = y0 + Math.sin(u * Math.PI) * sag; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      for (let x = 24 + s * 24; x < W; x += 48) {
        const u = (x % 480) / 480, y = y0 + Math.sin(u * Math.PI) * sag + 8;
        const col = RAINBOW[(Math.floor(x / 48) + s) % RAINBOW.length], on = 0.55 + 0.45 * Math.sin(t * 3 + x * 0.05 + s);
        g.save(); g.globalAlpha = on; g.fillStyle = col;
        g.shadowColor = col; g.shadowBlur = 18;
        g.beginPath(); g.ellipse(x, y, 7, 10, 0, 0, TAU); g.fill(); g.restore();
      }
    }
    // the snow floor
    const fl = g.createLinearGradient(0, 760, 0, H);
    fl.addColorStop(0, '#c9d4f7'); fl.addColorStop(1, '#eef1ff');
    g.fillStyle = fl; g.beginPath(); g.moveTo(0, 790);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, 780 + Math.sin(x * 0.006) * 14);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    for (let j = 0; j < 40; j++) { const x = (j * 211) % W, y = 820 + ((j * 97) % 240); const k = Math.max(0, Math.sin(t * 2 + j)); sparkleAt(g, x, y, 8 * k, 'rgba(255,255,255,0.9)'); }
  }

  drawPhotoFrame(g) {
    const p = ease.outBack(clamp(this.photoT / 0.4, 0, 1));
    g.save();
    g.lineWidth = 34 * p; g.strokeStyle = '#ffffff'; g.strokeRect(17, 17, W - 34, H - 34);
    g.lineWidth = 4; g.strokeStyle = NAVY; g.strokeRect(34 * p, 34 * p, W - 68 * p, H - 68 * p);
    g.translate(W / 2, H - 70); g.rotate(-0.02); g.scale(p, p);
    ui.panel(g, -330, -44, 660, 88, { r: 44, fill: '#ff6fb1' });
    ui.text(g, 'Our snowman friends!', 0, 2, { size: 50, weight: 800 });
    g.restore();
  }

  drawShowHUD(g) {
    if (this.stage === 'cheese') {
      const shotAt = this.cheeseAtShot();
      const left = shotAt - this.ft;
      if (left <= 3 && left > 0) {
        const n = Math.ceil(left), f = 1 - (left - (n - 1));
        g.save(); g.translate(W / 2, 330); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6;
        ui.text(g, String(n), 0, 0, { size: 200, color: '#ffd23f', strokeWidth: 12 }); g.restore();
      }
    }
    if ((this.stage === 'dance' || this.stage === 'cheese') && this.players.some((p) => !p.isAI)) {
      const [r1, r2] = photoPoseHints(this.players.some((p) => !p.isAI && p.ctrl.kind === 'pad'));
      ui.hints(g, r1, W / 2, H - 92, { size: 32 }); ui.hints(g, r2, W / 2, H - 42, { size: 32 });
    }
  }
  cheeseAtShot() {
    const n = this.n, wakeAt = (i) => 1.6 + i * Math.min(0.5, 3 / n);
    return wakeAt(n - 1) + 1.0 + 5.5 + 3;
  }
}

// --- menu / how-to thumbnail --------------------------------------------------
function drawIcon(g, x, y, w, h, t) {
  if (art('thumb/snowman-builder')) { g.drawImage(art('thumb/snowman-builder'), x, y, w, h); return; }
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = Math.min(w / 800, h / 500);
  const sky = g.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, '#7cc0ff'); sky.addColorStop(0.6, '#d7eeff'); sky.addColorStop(1, '#ffffff');
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  g.fillStyle = '#e3eefc'; g.beginPath(); g.moveTo(x, y + h * 0.62);
  for (let xx = 0; xx <= w; xx += 20) g.lineTo(x + xx, y + h * 0.56 - Math.sin(xx / w * 6 + 1) * 18 * s);
  g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
  g.fillStyle = '#f8fbff'; g.fillRect(x, y + h * 0.66, w, h * 0.34);
  // a grassy track to the rolling ball
  g.strokeStyle = 'rgba(146,198,128,0.6)'; g.lineWidth = 40 * s; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + w * 0.98, y + h * 0.95); g.quadraticCurveTo(x + w * 0.85, y + h * 0.78, x + w * 0.74, y + h * 0.86); g.stroke();
  // the snowman
  const sm = newSnowman(0, 0);
  sm.balls = [{ r: 82 }, { r: 60 }, { r: 44 }];
  const cs = ballCenters(sm);
  const add = (kind, c, u, v, extra = {}) => { const att = attachAt(sm, cs[c].x + u * cs[c].r, cs[c].y + v * cs[c].r, kind); if (att) sm.items.push({ ...makeItem(kind), ...att, ...extra }); };
  add('arm', 1, -0.86, -0.25); add('arm', 1, 0.86, -0.25);
  add('coal', 2, -0.33, -0.2); add('coal', 2, 0.33, -0.2); add('carrot', 2, -0.05, 0.08); add('smile', 2, 0, 0.42);
  add('cheek', 2, -0.55, 0.22); add('cheek', 2, 0.55, 0.22);
  add('bobble', 2, 0, -0.97, { color: '#ff4d6d' }); add('scarf', 1, 0, -0.8, { color: '#3fa7ff' });
  for (let j = 0; j < 3; j++) add('button', 1, 0, -0.2 + j * 0.32);
  add('bird', 1, 0.5, -0.95);
  const k = 1.1 * s;
  g.save(); g.translate(x + w * 0.42, y + h * 0.92); g.scale(k, k);
  drawSnowman(g, sm, 0, 0, { t, anim: { hop: Math.abs(Math.sin(t * 3)) * 8, wave: 0.8, sway: Math.sin(t * 1.5) * 4, flap: 1 } });
  g.restore();
  // the rolling snowball and its pusher
  g.save(); g.translate(x + w * 0.76, y + h * 0.88); g.scale(s, s);
  drawShadow(g, 0, 0, 56);
  drawBall(g, 0, -56, 56, { spin: t * 3, dir: Math.PI, seed: 4 });
  g.restore();
  drawPortrait(g, 'fox', x + w * 0.9, y + h * 0.66, 62 * s, { ring: '#ff9f1c', ringWidth: 6 * s, expr: 'happy' });
  for (let i = 0; i < 26; i++) {
    const fx2 = x + ((i * 157 + t * 30 * (1 + (i % 3))) % w), fy = y + ((i * 89 + t * 50 * (1 + (i % 2))) % h);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(fx2, fy, (2 + (i % 3)) * s * 1.6, 0, TAU); g.fill();
  }
  for (let i = 0; i < 4; i++) {
    const u = (t * 0.4 + i / 4) % 1;
    g.save(); g.globalAlpha = Math.sin(u * Math.PI); g.translate(x + w * (0.2 + i * 0.07), y + h * (0.45 - u * 0.3));
    drawHeartShape(g, 26 * s, '#ff6fb1'); g.restore();
  }
  g.restore();
}
