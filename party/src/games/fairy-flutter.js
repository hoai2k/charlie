// Fairy Flutter (Molly Party) - everyone is a fairy with fancy wings, zooming
// through a dreamy flower sky. Grab sparkles, dewdrops, petals and golden
// stars, boop giggling bumblebees (they shower sparkles), surf rainbow wind
// streams, and press A for a loop-de-loop dash that hoovers up everything
// nearby. Every pickup flies into the Moon's sparkle jar; fill it together
// for a firework finale. Cooperative: everyone wins together.
//
// Art hooks (procedural fallbacks ship today, see fairy-flutter/art.js):
//   bg/fairy-flutter  prop/ff-moon  prop/ff-moon-happy  prop/ff-jar  prop/ff-sparkle
//   prop/ff-dewdrop  prop/ff-petal  prop/ff-star  prop/ff-bee  prop/ff-bee-giggle
// Poses: float (flying), tuck (loop-de-loop, spun by code), high-five (boop),
// cheer, celebrate, surprised.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { outfitItem } from '../engine/outfits.js';
import { easySteer, easyNearest, easyPrompt, easyAutoOk } from '../engine/easy.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { clamp, lerp, rand, randInt, pick, chance, TAU, dist } from '../engine/util.js';
import {
  NAVY, hh, drawBackground, puff, drawMoon, drawJar, drawPickup, drawBee, drawFairy, FAIRY_COLS,
  drawStream, glow, RAINBOW_BANDS,
} from './fairy-flutter/art.js';
import { meta } from './fairy-flutter.meta.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

// --- tuning -----------------------------------------------------------------------
const MAXV = 640;            // flying speed
const ACCEL = 6.5;           // how fast velocity follows the stick
const LOOP_TIME = 0.55;      // loop-de-loop length
const LOOP_BOOST = 980;
const LOOP_CD = 0.25;
const MAGNET = 270;          // loop-de-loop pull radius
const TOP = 250, BOTTOM = 930, LEFT = 70, RIGHT = W - 70;   // feet bounds
const VALUE = { sparkle: 1, petal: 1, dew: 2, star: 5 };
const JAR = { x: 1040, y: 150, w: 124, h: 156 };
const MOON = { x: 890, y: 112, size: 220 };
const MOUTH = { x: JAR.x, y: JAR.y - 70 };
const HELP_AT = 46;          // after this the Moon helps the jar fill (always a finale by ~58 s)
const CPU_CAP = [0.6, 0.72, 0.84];
const EASY_REACH = 430;      // Easy: an A-zoom reaches sparkles this close
const WINGS = ['fairy-wings', 'butterfly-wings', 'petal-wings', 'dragonfly-wings', 'angel-wings'];
const WING_COL = [0, 3, 2, 4, 7, 1, 5, 6];

export { meta };

function wingOutfit(p, i) {
  const look = (p.outfit || []).filter((e) => e && outfitItem(e.id));
  const back = look.find((e) => outfitItem(e.id).slot === 'back');
  if (back && /wings/.test(back.id) && back.id !== 'dragon-wings') return look;
  return [...look.filter((e) => outfitItem(e.id).slot !== 'back'), { id: WINGS[i % WINGS.length], colour: WING_COL[i % WING_COL.length] }];
}

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: human fairies float by themselves, A zooms to a sparkle
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.sc = n <= 2 ? 0.82 : n <= 4 ? 0.74 : 0.62;
    this.ents = this.players.map((p, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = n === 1 ? 560 : lerp(380, W - 380, n <= 4 ? (n === 1 ? 0.5 : i / (n - 1)) : col / 3);
      const y = n <= 4 ? 640 : 520 + row * 260;
      const fairy = /garden-fairy|glimmer/.test(p.charId);   // fairies already have wings
      const a = new Actor(p, { scale: this.sc, x, y, outfit: fairy ? undefined : wingOutfit(p, i) });
      a.scale *= clamp(150 / a.leader.h, 1, 2.8);       // small avatars (garden fairies) drawn bigger
      a.setPose('float'); a.snap?.();
      return {
        p, a, x, y, vx: 0, vy: 0, score: 0, loopT: 0, loopCd: 0, loopDir: 1, tilt: 0,
        combo: 0, comboT: 0, streamT: 0, wheeT: 0, boopT: 0, brain: new Brain(p), target: null, tx: x, ty: y,
      };
    });
    if (this.easy) {
      // each human fairy gets her own patch of sky to float around in
      const hum = this.ents.filter((e) => !e.p.isAI);
      hum.forEach((e, k) => { e.ez = { lx: hum.length === 1 ? 760 : lerp(360, W - 360, k / (hum.length - 1)), ph: k * 2.1 + rand(1), aim: null }; });
    }
    this.target = [0, 100, 180, 260, 330, 370, 410, 440, 470][n] || 470;   // tuned so a round lasts about 45 s
    this.jar = 0; this.jarShow = 0; this.jarWob = 0; this.milestone = 0;
    this.moonBounce = 0;
    this.pickups = []; this.flyers = []; this.streams = [];
    this.spawnT = 0.3; this.streamT = 4; this.showerAt = 24; this.shower = 0; this.showerT = 0;
    this.helpT = 0;
    this.phase = 'play'; this.ft = 0; this.finished = false;
    this.bees = Array.from({ length: n > 4 ? 3 : 2 }, (_, i) => ({
      cx: 450 + i * 520, cy: 470 + (i % 2) * 230, x: 0, y: 0, ph: rand(TAU), sp: rand(0.5, 0.75), dir: 1,
      giggle: 0, spin: 0, cd: 0, rx: rand(160, 260), ry: rand(90, 150),
    }));
    this.friends = Array.from({ length: 3 }, (_, i) => ({ col: FAIRY_COLS[(i * 2) % 5], x: rand(W), y: 300 + i * 200, vx: (i % 2 ? -1 : 1) * rand(160, 240), ph: rand(TAU), dropT: rand(1, 3) }));
    this.clouds = Array.from({ length: 6 }, (_, i) => ({ x: hh(i + 70) * W, y: 260 + hh(i + 80) * 420, s: 0.7 + hh(i + 90) * 0.7, v: 14 + hh(i + 60) * 22 }));
    // a starter wave so there is something to grab right away
    for (let i = 0; i < 6 + n; i++) this.spawn(pick(['sparkle', 'sparkle', 'petal', 'dew']), rand(200, W - 200), rand(TOP, BOTTOM - 100), { vx: rand(-60, -20) });
  }

  // --- pickups ------------------------------------------------------------------
  spawn(kind, x, y, o = {}) {
    this.pickups.push({
      kind, x, y, vx: o.vx ?? -rand(130, 230), vy: o.vy ?? 0, drag: o.drag ?? 0, seed: rand(10),
      amp: o.amp ?? rand(10, 40), wf: rand(1.5, 3), age: 0, life: o.life ?? 30, born: 0, still: o.still || false,
    });
  }

  spawnWave() {
    const r = Math.random();
    if (r < 0.22) {
      // a swoopy line of sparkles (fun to zoom along)
      const y0 = rand(TOP + 40, BOTTOM - 160), amp = rand(40, 120), ph = rand(TAU);
      for (let k = 0; k < 6; k++) this.spawn(k === 5 && chance(0.4) ? 'dew' : 'sparkle', W + 60 + k * 85, y0 + Math.sin(ph + k * 0.7) * amp, { vx: -190, amp: 0 });
    } else if (r < 0.42) {
      // petals drift down from the top
      for (let k = 0; k < 3; k++) this.spawn('petal', rand(300, W - 100), -30 - k * 60, { vx: rand(-110, -50), vy: rand(80, 130) });
    } else {
      const kind = chance(0.04) ? 'star' : pick(['sparkle', 'sparkle', 'sparkle', 'petal', 'dew', 'dew']);
      this.spawn(kind, W + 50, rand(TOP - 40, BOTTOM - 60));
    }
  }

  spawnStream() {
    const dir = chance(0.5) ? 1 : -1;
    const y0 = rand(380, 760), amp = rand(90, 170), f = rand(1.2, 2.0), ph = rand(TAU), tilt = rand(-120, 120);
    const pts = [];
    for (let i = 0; i <= 48; i++) { const u = i / 48; pts.push({ x: -120 + u * (W + 240), y: clamp(y0 + Math.sin(u * f * TAU * 0.5 + ph) * amp + (u - 0.5) * tilt, TOP - 20, BOTTOM - 40) }); }
    const s = { pts, dir, age: 0, life: 7.5, said: new Set() };
    this.streams.push(s);
    // a trail of sparkles along it
    for (let k = 4; k < 46; k += 5) this.spawn(k % 15 === 4 ? 'dew' : 'sparkle', pts[k].x, pts[k].y, { vx: 0, amp: 0, still: true, life: 7.5 });
    snd('ff-rainbow', 'magic', { vol: 0.5 });
  }

  /** Closest point on a stream: { d, tx, ty } (tangent along the flow). */
  streamNear(s, x, y) {
    let best = 1e9, bi = 0;
    for (let i = 0; i < s.pts.length; i += 2) { const p = s.pts[i]; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < best) { best = d; bi = i; } }
    const a = s.pts[Math.max(0, bi - 1)], b = s.pts[Math.min(s.pts.length - 1, bi + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { d: Math.sqrt(best), tx: ((b.x - a.x) / l) * s.dir, ty: ((b.y - a.y) / l) * s.dir, i: bi };
  }

  // --- update -------------------------------------------------------------------
  preUpdate(dt) { this.t += dt; this.idle(dt); }
  postUpdate(dt) { this.t += dt; this.idle(dt); this.updateFinale(dt); this.updateFlyers(dt); }
  idle(dt) {
    for (const e of this.ents) { e.a.x = e.x; e.a.y = e.y + Math.sin(this.t * 3 + e.p.index) * 6; e.a.update(dt); }
    for (const c of this.clouds) { c.x -= c.v * dt; if (c.x < -200) c.x = W + 200; }
    this.updateBees(dt);
    this.updateFriends(dt);
  }

  update(dt) {
    this.t += dt;
    const time = this.api.time;
    if (this.phase === 'play') {
      // spawning (faster with more fairies)
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnWave(); this.spawnT = rand(0.7, 1.1) / (1 + this.n * 0.17); }
      this.streamT -= dt;
      if (this.streamT <= 0) { this.spawnStream(); this.streamT = rand(8, 10.5); }
      if (!this.shower && time >= this.showerAt) this.startShower();
      if (this.shower) {
        this.showerT += dt;
        if (this.showerT < 4.5 && Math.random() < dt * (3.5 + this.n * 0.4)) this.spawn(chance(0.3) ? 'star' : 'sparkle', rand(150, W - 150), -40, { vx: rand(-60, 60), vy: rand(200, 300), amp: 0 });
      }
      if (time > HELP_AT) {
        // the Moon pitches in: sparkles stream from the Moon into the jar
        this.helpT -= dt;
        if (this.helpT <= 0) { this.helpT = 0.12; this.flyers.push(this.makeFlyer(MOON.x + rand(-60, 60), MOON.y + rand(-50, 50), 'sparkle', Math.max(1, Math.round(this.target / 70)), null)); }
      }
    }
    for (const e of this.ents) {
      if (e.p.isAI && this.phase === 'play') this.aiThink(e, dt);
      this.updateEnt(e, dt);
    }
    // gentle push apart so fairies don't stack (sized from the sprites)
    spread(this.ents, { radius: (e) => bodyRadius(e.a) * 0.8, strength: 0.5, bounds: { x0: LEFT, x1: RIGHT, y0: TOP, y1: BOTTOM } });
    this.updatePickups(dt);
    this.updateStreams(dt);
    this.updateBees(dt, true);
    this.updateFriends(dt, true);
    for (const c of this.clouds) { c.x -= c.v * dt; if (c.x < -200) c.x = W + 200; }
    this.updateFlyers(dt);
    this.updateFinale(dt);
  }

  startShower() {
    this.shower = 1; this.showerT = 0;
    snd('ff-shower', 'fanfare', { vol: 0.6 });
    fx.flash('#fff3b0', 0.2);
    for (const e of this.ents) { e.a.playOnce('surprised', 0.5, 'float'); e.a.emote('star', 1.2); }
  }

  updateEnt(e, dt) {
    const a = e.a, ctrl = e.p.ctrl;
    const play = this.phase === 'play';
    e.loopCd = Math.max(0, e.loopCd - dt); e.comboT -= dt; if (e.comboT <= 0) e.combo = 0;
    e.boopT = Math.max(0, e.boopT - dt); e.wheeT -= dt;
    let ix = play ? ctrl.x : 0, iy = play ? ctrl.y : 0;
    if (e.ez) { [ix, iy] = play ? this.easyPilot(e, dt) : [0, 0]; e.ez.after = Math.max(0, (e.ez.after || 0) - dt); }
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    if (this.phase === 'finale') { ix = clamp((e.tx - e.x) / 200, -1, 1); iy = clamp((e.ty - e.y) / 200, -1, 1); }
    const k = 1 - Math.exp(-ACCEL * dt);
    e.vx += (ix * MAXV - e.vx) * k * (e.loopT > 0 ? 0.25 : 1);
    e.vy += (iy * MAXV - e.vy) * k * (e.loopT > 0 ? 0.25 : 1);
    // A: loop-de-loop zoom
    if (play && ctrl.pressed('a') && e.loopCd <= 0 && e.loopT <= 0) {
      const cy = e.y - a.height * 0.5;
      // Easy, none in reach: A again (no steering - easyAutoOk) zooms toward the nearest one
      const far = e.ez && !e.ez.aim && !e.ez.manual && easyAutoOk(e.ez) ? this.nearestPickup(e) : null;
      if (e.ez && e.ez.aim) this.startLoop(e, e.ez.aim.x - e.x, e.ez.aim.y - cy);   // Easy: zoom at the sparkle
      else if (far) { this.startLoop(e, far.x - e.x, far.y - cy); e.ez.lx = clamp(far.x, LEFT + 60, RIGHT - 60); }   // and her patch of sky moves there
      else this.startLoop(e, ix, iy);
    } else if (play && !e.p.isAI && ctrl.pressed('b') && e.loopCd <= 0 && e.loopT <= 0) this.startLoop(e, ctrl.x, ctrl.y);   // B: the same zoom (a dash), the stick's way or her facing - never aimed for her
    if (e.loopT > 0) {
      e.loopT -= dt;
      if (Math.random() < dt * 40) particles.burst(e.x, e.y - a.height * 0.5, { type: 'sparkle', count: 1, colors: [e.p.color, '#fff', '#ffd23f'], speed: [20, 90], life: [0.4, 0.8], size: [10, 18] });
      if (e.loopT <= 0) { e.loopCd = LOOP_CD; a.setPose('float'); if (e.ez) e.ez.after = 0.4; }
    }
    // rainbow wind
    let inStream = false;
    for (const s of this.streams) {
      if (s.age < 0.5 || s.age > s.life - 0.4) continue;
      const q = this.streamNear(s, e.x, e.y - a.height * 0.5);
      if (q.d < 95) {
        inStream = true;
        e.vx += q.tx * 2600 * dt; e.vy += q.ty * 2600 * dt;
        const sp = Math.hypot(e.vx, e.vy); if (sp > 1150) { e.vx *= 1150 / sp; e.vy *= 1150 / sp; }
        if (Math.random() < dt * 30) particles.burst(e.x, e.y - a.height * 0.5, { type: 'sparkle', count: 1, colors: RAINBOW_BANDS, speed: [10, 60], life: [0.4, 0.9] });
        if (e.wheeT <= 0) {
          e.wheeT = 3; a.say('Wheee!', 1.1, 'woo'); a.playOnce('cheer', 0.5, 'float');
          snd('ff-wheee', 'whoosh', { vol: 0.6 });
        }
      }
    }
    e.streamT = inStream ? e.streamT + dt : 0;
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.x < LEFT) { e.x = LEFT; e.vx = Math.abs(e.vx) * 0.4; }
    if (e.x > RIGHT) { e.x = RIGHT; e.vx = -Math.abs(e.vx) * 0.4; }
    if (e.y < TOP) { e.y = TOP; e.vy = Math.abs(e.vy) * 0.4; }
    if (e.y > BOTTOM) { e.y = BOTTOM; e.vy = -Math.abs(e.vy) * 0.4; }
    if (Math.abs(e.vx) > 40 && e.loopT <= 0) a.facing = e.vx > 0 ? 1 : -1;
    e.tilt = lerp(e.tilt, clamp(e.vx / MAXV, -1, 1) * 0.18 + clamp(e.vy / MAXV, -1, 1) * 0.08 * a.facing, 1 - Math.exp(-8 * dt));
    a.x = e.x; a.y = e.y + Math.sin(this.t * 3 + e.p.index) * 6;
    a.update(dt);
  }

  /** Molly Easy: float gently up and down around this fairy's patch of sky,
   *  and pick the sparkle an A-zoom would fly to (e.ez.aim). Returns stick x/y. */
  easyPilot(e, dt) {
    const z = e.ez, t = this.t, cx = e.x, cy = e.y - e.a.height * 0.5;
    // either stick still flies her (like Medium); her patch of sky moves with her,
    // so the autopilot carries on from wherever she is when she lets go
    const st = easySteer(z, e.p.ctrl, dt);
    z.manual = st.manual;
    if (st.manual) z.lx = clamp(e.x - Math.sin(t * 0.35 + z.ph) * 220, LEFT + 60, RIGHT - 60);
    let best = null, bu = 0;
    for (const pk of this.pickups) {
      if (pk.x > W - 40 || pk.x < 40 || pk.y < TOP - 140) continue;
      const d = dist(cx, cy, pk.x, pk.y);
      if (d > EASY_REACH) continue;
      const u = VALUE[pk.kind] / (d + 120);
      if (u > bu) { bu = u; best = pk; }
    }
    z.aim = best;
    if (st.manual) return [st.x, st.y];
    const tx = clamp(z.lx + Math.sin(t * 0.35 + z.ph) * 220, LEFT + 60, RIGHT - 60);
    const ty = (TOP + BOTTOM) / 2 + 40 + Math.sin(t * 0.8 + z.ph) * (BOTTOM - TOP) * 0.42;
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 6) return [0, 0];
    const k = clamp(d / 160, 0, 1) * 0.5;
    return [(dx / d) * k, (dy / d) * k];
  }

  /** Molly Easy: the closest sparkle on screen, however far (A with none in reach zooms at it). */
  nearestPickup(e) {
    return easyNearest(e.x, e.y - e.a.height * 0.5, this.pickups, (pk) => pk, (pk) => pk.dead || pk.x > W - 40 || pk.x < 40 || pk.y < TOP - 140);
  }

  startLoop(e, ix, iy) {
    const a = e.a;
    let dx = ix, dy = iy;
    if (Math.hypot(dx, dy) < 0.2) { dx = a.facing; dy = 0; }
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    e.vx = dx * LOOP_BOOST; e.vy = dy * LOOP_BOOST;
    e.loopT = LOOP_TIME; e.loopDir = dx >= 0 ? 1 : -1;
    a.playOnce('tuck', LOOP_TIME, 'float'); a.squash(-0.3);
    snd('ff-loop', 'whoosh', { vol: 0.7 }); sfx('sparkle', { vol: 0.35 });
    particles.ring(e.x, e.y - a.height * 0.5, e.p.color, 150, 0.4);
    e.p.ctrl.rumble?.(0.3, 90);
  }

  updatePickups(dt) {
    const play = this.phase === 'play';
    for (const pk of this.pickups) {
      pk.age += dt;
      if (!pk.still) {
        pk.x += pk.vx * dt;
        pk.y += (pk.vy + Math.cos(pk.age * pk.wf + pk.seed) * pk.amp) * dt;
        if (pk.kind === 'petal') pk.vy = Math.min(pk.vy, 140);
      }
      if (pk.y > BOTTOM + 60 && pk.vy > 0) { pk.vy = -40; }
      if (pk.x < -80 || pk.x > W + 260 || pk.age > pk.life) pk.dead = true;
      if (!play || pk.dead) continue;
      for (const e of this.ents) {
        if (e.ez && e.loopT <= 0 && !(e.ez.after > 0)) continue;   // Molly Easy: sparkles are caught with an A-zoom (or just after it), not by floating into them
        const a = e.a, cx = e.x, cy = e.y - a.height * 0.5;
        const dx = cx - pk.x, dy = cy - pk.y, d = Math.hypot(dx, dy);
        if (e.loopT > 0 && d < MAGNET * (e.ez ? 1.3 : 1) && d > 1) { const pull = 1400 * dt; pk.x += (dx / d) * pull; pk.y += (dy / d) * pull; }   // Easy zooms pull a little wider
        const r = a.radius + (pk.kind === 'star' ? 70 : 44) + (e.loopT > 0 ? 40 : 0);
        if (d < r) { this.collect(e, pk); break; }
      }
    }
    this.pickups = this.pickups.filter((p) => !p.dead);
  }

  collect(e, pk) {
    pk.dead = true;
    const v = VALUE[pk.kind];
    e.score += v;
    e.combo++; e.comboT = 1.3;
    const a = e.a, top = e.y - a.height - 30;
    const step = Math.min(e.combo, 10);
    if (pk.kind === 'star') {
      snd('ff-star', 'star'); sfx('collect', { step: 8 });
      fx.shake(6, 0.15); fx.hitstop(0.04);
      particles.burst(pk.x, pk.y, { type: 'star', count: 14, colors: ['#ffd23f', '#fff', '#ff9fd8'], speed: [120, 380] });
      this.api.camera?.punch(pk.x, pk.y, 1.06, 0.25);
      a.playOnce('cheer', 0.6, 'float'); a.emote('star', 1);
    } else {
      sfx('collect', { step, vol: 0.55 });
      if (pk.kind === 'dew') snd('ff-dew', 'bubble', { vol: 0.5 });
      particles.burst(pk.x, pk.y, { type: 'sparkle', count: 6, colors: pk.kind === 'petal' ? ['#ff9fd0', '#fff'] : pk.kind === 'dew' ? ['#9fe8ff', '#fff'] : ['#ffd23f', '#fff'], speed: [60, 200] });
      if (e.combo % 5 === 0) { a.playOnce('cheer', 0.5, 'float'); a.emote('heart', 0.9); }
    }
    particles.popText(e.x, top, '+' + v, e.p.color, pk.kind === 'star' ? 64 : 46);
    if (e.combo >= 3 && e.combo % 3 === 0) particles.popText(e.x + 60, top - 50, 'x' + e.combo + '!', '#fff', 40);
    this.flyers.push(this.makeFlyer(pk.x, pk.y, pk.kind, v, e));
  }

  makeFlyer(x, y, kind, v, e) {
    return { x0: x, y0: y, x, y, kind, v, t: 0, dur: rand(0.55, 0.85) + dist(x, y, MOUTH.x, MOUTH.y) / 3000, cx: (x + MOUTH.x) / 2 + rand(-200, 200), cy: Math.min(y, MOUTH.y) - rand(80, 220), e };
  }

  updateFlyers(dt) {
    for (const f of this.flyers) {
      f.t += dt;
      const u = clamp(f.t / f.dur, 0, 1), w = u * u;
      const x1 = lerp(f.x0, f.cx, w), y1 = lerp(f.y0, f.cy, w), x2 = lerp(f.cx, MOUTH.x, w), y2 = lerp(f.cy, MOUTH.y, w);
      f.x = lerp(x1, x2, w); f.y = lerp(y1, y2, w);
      if (Math.random() < dt * 25) particles.burst(f.x, f.y, { type: 'sparkle', count: 1, colors: ['#fff6b0', '#fff'], speed: [5, 30], life: [0.25, 0.5], size: [6, 12] });
      if (u >= 1) { f.done = true; this.addJar(f.v); }
    }
    this.flyers = this.flyers.filter((f) => !f.done);
  }

  addJar(v) {
    if (this.phase === 'done') return;
    this.jar += v; this.jarWob = Math.min(1, this.jarWob + 0.35);
    if (Math.random() < 0.35) sfx('tick', { vol: 0.25 });
    particles.burst(MOUTH.x, MOUTH.y + 10, { type: 'sparkle', count: 2, colors: ['#fff6b0', '#ffd23f'], speed: [40, 120], life: [0.3, 0.6] });
    const frac = this.jar / this.target;
    const ms = Math.floor(frac * 4);
    if (ms > this.milestone && ms < 4) {
      this.milestone = ms; this.moonBounce = 1;
      snd('ff-jar-chime', 'magic', { vol: 0.6 });
      particles.burst(JAR.x, JAR.y, { type: 'star', count: 12, colors: ['#ffd23f', '#fff', '#ff9fd8'], speed: [120, 320] });
      for (const e of this.ents) e.a.emote(pick(['heart', 'star', 'sparkle']), 1);
    }
    if (this.jar >= this.target && this.phase === 'play') this.startFinale();
  }

  // --- bees & friends ---------------------------------------------------------------
  updateBees(dt, live = false) {
    for (const b of this.bees) {
      b.ph += dt * b.sp;
      b.giggle = Math.max(0, b.giggle - dt); b.cd = Math.max(0, b.cd - dt);
      b.spin = b.giggle > 0 ? (1 - b.giggle) * TAU * 2 : 0;
      const nx = b.cx + Math.sin(b.ph * 1.3) * b.rx, ny = b.cy + Math.sin(b.ph * 2.1) * b.ry;
      if (nx !== b.x) b.dir = nx > b.x ? 1 : -1;
      b.x = nx; b.y = ny;
      // wander the hive centre slowly toward the action
      if (live) {
        b.cx = clamp(b.cx + Math.sin(this.t * 0.3 + b.ph) * 30 * dt, 300, W - 300);
        if (this.phase === 'play' && b.cd <= 0) {
          for (const e of this.ents) {
            const a = e.a;
            if (dist(e.x, e.y - a.height * 0.5, b.x, b.y) < a.radius + 62) { this.boop(e, b); break; }
          }
        }
      }
    }
  }

  boop(e, b) {
    b.giggle = 1; b.cd = 2.2;
    const a = e.a;
    snd('ff-bee-giggle', 'giggle', { vol: 0.8 }); sfx('bounce', { vol: 0.5 });
    a.playOnce('high-five', 0.5, 'float'); a.emote('happy', 1);
    const dx = e.x - b.x, dy = e.y - a.height * 0.5 - b.y, d = Math.hypot(dx, dy) || 1;
    e.vx += (dx / d) * 500; e.vy += (dy / d) * 500;
    particles.popText(b.x, b.y - 70, 'boop!', '#ffd23f', 50);
    particles.burst(b.x, b.y, { type: 'heart', count: 6, colors: ['#ff7ac6', '#ffd23f'], speed: [80, 220] });
    fx.shake(4, 0.12);
    for (let i = 0; i < 5; i++) { const ang = (i / 5) * TAU + rand(0.4); this.spawn(i === 0 ? 'dew' : 'sparkle', b.x, b.y, { vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, amp: 0, life: 9 }); }
    // the burst slows down (drag) - handled by shrinking velocity here
    for (const pk of this.pickups.slice(-5)) pk.slow = true;
  }

  updateFriends(dt, live = false) {
    for (const f of this.friends) {
      f.x += f.vx * dt; f.ph += dt;
      if (f.x > W + 120) { f.x = W + 120; f.vx = -Math.abs(f.vx); f.y = rand(280, 820); }
      if (f.x < -120) { f.x = -120; f.vx = Math.abs(f.vx); f.y = rand(280, 820); }
      if (live && this.phase === 'play') {
        f.dropT -= dt;
        if (f.dropT <= 0 && f.x > 80 && f.x < W - 80) { f.dropT = rand(1.6, 3); this.spawn('sparkle', f.x, f.y + Math.sin(f.ph * 3) * 30, { vx: f.vx * 0.15, amp: 15, life: 12 }); }
      }
    }
    for (const pk of this.pickups) if (pk.slow) { pk.vx *= Math.exp(-2.4 * dt); pk.vy *= Math.exp(-2.4 * dt); if (Math.abs(pk.vx) < 30 && Math.abs(pk.vy) < 30) { pk.slow = false; pk.vx = -40; pk.vy = 0; pk.amp = 20; } }
  }

  updateStreams(dt) {
    for (const s of this.streams) s.age += dt;
    this.streams = this.streams.filter((s) => s.age < s.life);
  }

  // --- finale ---------------------------------------------------------------------
  startFinale() {
    this.phase = 'finale'; this.ft = 0; this.fwT = 0;
    fx.slowmo(0.45, 0.9); fx.flash('#fff6c0', 0.35); fx.shake(12, 0.4);
    snd('ff-jar-full', 'fanfare'); sfx('bigpop');
    this.moonBounce = 1.5;
    this.api.camera?.punch(JAR.x, JAR.y + 200, 1.12, 0.8);
    particles.confettiRain(W, 140);
    particles.burst(JAR.x, JAR.y, { type: 'star', count: 40, colors: ['#ffd23f', '#fff', '#ff9fd8', '#9fe8ff'], speed: [200, 700] });
    const n = this.n;
    this.ents.forEach((e, i) => {
      e.tx = lerp(300, W - 300, n === 1 ? 0.5 : i / (n - 1)); e.ty = 640 + (i % 2) * 90;
      e.a.setPose('celebrate'); e.a.say(pick(['Yay!', 'We did it!', 'Sparkly!']), 1.8, 'yay');
    });
    for (const pk of this.pickups) { pk.dead = true; this.flyers.push(this.makeFlyer(pk.x, pk.y, pk.kind, 0, null)); }
    this.pickups = [];
  }

  updateFinale(dt) {
    if (this.phase !== 'finale' && this.phase !== 'done') return;
    this.ft += dt; this.fwT -= dt;
    if (this.fwT <= 0 && this.ft < 4.5) {
      this.fwT = rand(0.18, 0.32);
      const x = rand(200, W - 200), y = rand(200, 560);
      particles.burst(x, y, { type: pick(['sparkle', 'star', 'heart']), count: 22, colors: pick([RAINBOW, ['#ffd23f', '#fff'], ['#ff7ac6', '#fff', '#b98bff']]), speed: [150, 420] });
      particles.ring(x, y, pick(RAINBOW_BANDS), 160, 0.5);
      snd('ff-firework', 'pop', { vol: 0.5 });
    }
    if (this.phase === 'finale' && this.ft > 2.6) this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true; this.phase = 'done';
    this.api.finishTogether({
      title: 'Jar full!',
      banner: false,   // the jar and the moon sit top centre, right where the ribbon would cover them
      stats: this.ents.map((e) => `${e.score} sparkles`), focus: { x: JAR.x, y: JAR.y + 120, zoom: 1.15 },
    });
  }

  // --- CPU ------------------------------------------------------------------------------
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 0, 0, 2), cap = CPU_CAP[lvl];
    const cx = e.x, cy = e.y - e.a.height * 0.5;
    if (e.brain.ready(dt)) {
      e.target = null;
      const r = Math.random();
      const stream = this.streams.find((s) => s.age > 0.5 && s.age < s.life - 1.5);
      if (stream && r < 0.35) {
        const q = this.streamNear(stream, cx, cy);
        if (q.d < 500) { const pt = stream.pts[clamp(q.i + stream.dir * 6, 0, stream.pts.length - 1)]; e.tx = pt.x; e.ty = pt.y + e.a.height * 0.5; e.brain.wait(rand(1, 1.8)); return; }
      }
      const bee = this.bees.find((b) => b.cd <= 0);
      if (bee && r > 0.86) { e.tx = bee.x; e.ty = bee.y + e.a.height * 0.5; e.brain.wait(rand(0.8, 1.4)); return; }
      if (chance(prof.mistake * 1.4)) { e.tx = rand(LEFT + 100, RIGHT - 100); e.ty = rand(TOP + 50, BOTTOM - 50); e.brain.wait(rand(0.8, 1.5)); return; }
      let best = null, bu = 0;
      for (const pk of this.pickups) {
        if (pk.x > W - 20 || pk.y < 0) continue;
        const d = dist(cx, cy, pk.x, pk.y);
        let u = VALUE[pk.kind] / (d + 160) * rand(0.7, 1.3);
        for (const o of this.ents) if (o !== e && dist(o.x, o.y - o.a.height * 0.5, pk.x, pk.y) < d * 0.6) u *= 0.4;
        if (u > bu) { bu = u; best = pk; }
      }
      e.target = best;
      e.brain.wait(reactionTime(p) + rand(0.1, 0.4));
      // a loop-de-loop now and then (more when stuff is close)
      if (best && dist(cx, cy, best.x, best.y) < 260 && chance([0.25, 0.4, 0.55][lvl])) e.wantLoop = rand(0.1, 0.4);
      else if (chance(0.08)) e.wantLoop = rand(0.1, 0.5);
    }
    if (e.target && !e.target.dead) { e.tx = e.target.x + (e.target.vx || 0) * 0.25; e.ty = e.target.y + e.a.height * 0.5; }
    if (e.wantLoop !== undefined && e.wantLoop !== null) { e.wantLoop -= dt; if (e.wantLoop <= 0) { e.wantLoop = null; p.ctrl.press('a'); } }
    const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
    if (d < 12) { p.ctrl.move(0, 0); return; }
    let ang = Math.atan2(dy, dx) + Math.sin(this.t * 2.5 + p.index * 1.7) * prof.aimError * 0.7;
    const k = clamp(d / 90, 0, 1) * cap;
    p.ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
  }

  // --- draw -------------------------------------------------------------------------------
  draw(g) {
    const t = this.t;
    drawBackground(g, t);
    for (const c of this.clouds) puff(g, c.x, c.y, c.s, 0.55);
    for (const f of this.friends) drawFairy(g, f.x, f.y + Math.sin(f.ph * 3) * 30, 1.25, f.col, t + f.ph, f.vx > 0 ? 1 : -1, { glowAlpha: 0.6, alpha: 0.85 });
    for (const s of this.streams) {
      const a = Math.min(1, s.age / 0.5, (s.life - s.age) / 0.5);
      glowStream(g, s, a);
      drawStream(g, s.pts, a * 0.85, t, s.dir);
    }
    for (const pk of this.pickups) {
      const born = Math.min(1, pk.age / 0.25), fade = Math.min(1, (pk.life - pk.age) / 0.5);
      g.save(); g.globalAlpha = clamp(fade, 0, 1);
      drawPickup(g, pk.kind, pk.x, pk.y, 0.9 * (0.4 + born * 0.6), t, pk.seed);
      g.restore();
    }
    for (const b of this.bees) drawBee(g, b.x, b.y, 0.95, t, b.dir, b.giggle > 0, b.spin);
    const order = this.ents.slice().sort((a, b) => a.y - b.y);
    for (const e of order) this.drawEnt(g, e);
    for (const f of this.flyers) drawPickup(g, f.kind, f.x, f.y, 0.55, t, 0);
    // moon + jar
    const mb = Math.max(0, this.moonBounce);
    this.moonBounce = Math.max(0, this.moonBounce - 1 / 60 * 1.5);
    this.jarWob = Math.max(0, this.jarWob - 1 / 60 * 2);
    this.jarShow = lerp(this.jarShow, Math.min(1, this.jar / this.target), 0.12);
    const happy = this.phase !== 'play' || mb > 0.2;
    drawMoon(g, MOON.x, MOON.y + Math.sin(t * 1.5) * 6 - Math.sin(mb * Math.PI) * 20, MOON.size * (1 + mb * 0.08), t, happy);
    drawJar(g, JAR.x, JAR.y, JAR.w * (1 + mb * 0.1), JAR.h * (1 + mb * 0.1), this.jarShow, t, this.jarWob);
    if (this.phase !== 'play') glow(g, JAR.x, JAR.y, 240, '#fff3b0', 0.6 + Math.sin(t * 6) * 0.2);
    // player tags (humans always, CPUs at the start)
    for (const e of order) {
      if ((e.p.isAI && this.api.time > 5) || this.api.ended?.()) continue;
      const a = e.a;
      ui.playerTag(g, e.p, e.x, a.y - a.height - 26 - (a.emotes.length ? 50 : 0));
    }
    // Easy: a sparkle in reach gets a ring and a dotted line, and a big A bounces
    if (this.phase === 'play') for (const e of order) {
      const pk = e.ez && e.ez.aim;
      if (!pk || pk.dead || e.loopT > 0 || e.loopCd > 0) continue;
      const a = e.a, cy = a.y - a.height * 0.5, pulse = 0.5 + 0.5 * Math.sin(t * 9);
      g.save(); g.strokeStyle = e.p.color; g.lineWidth = 5; g.globalAlpha = 0.6;
      g.setLineDash([12, 12]); g.lineDashOffset = -t * 60;
      g.beginPath(); g.moveTo(e.x, cy); g.lineTo(pk.x, pk.y); g.stroke(); g.setLineDash([]);
      g.globalAlpha = 0.7 + pulse * 0.3; g.lineWidth = 6;
      g.beginPath(); g.arc(pk.x, pk.y, 46 + pulse * 10, 0, TAU); g.stroke();
      g.restore();
      easyPrompt(g, e.p, { target: { x: pk.x, y: pk.y }, child: { x: e.x, y: a.y - a.height } });
    }
  }

  drawEnt(g, e) {
    const a = e.a, cy = a.y - a.height * 0.5;
    // hover glow ring in the player colour
    glow(g, e.x, cy, a.height * 0.75, e.p.color, 0.35);
    if (a.leader.motion !== 'glide') {   // hovering NPC-style avatars float above their feet: no ring
    g.save();
    g.strokeStyle = e.p.color; g.lineWidth = 5; g.globalAlpha = 0.85;
    g.beginPath(); g.ellipse(e.x, a.y + 10, a.radius * 0.95, a.radius * 0.28, 0, 0, TAU); g.stroke();
    g.restore();
    }
    const spin = e.loopT > 0 ? (1 - e.loopT / LOOP_TIME) * TAU * e.loopDir : 0;
    g.save();
    g.translate(e.x, cy); g.rotate(e.tilt + spin); g.translate(-e.x, -cy);
    a.draw(g, { shadow: false });
    g.restore();
  }

  drawHUD(g) {
    if (!this.api.ended?.()) ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 990, format: (v) => String(v) });
    // the jar's goal line at the start: arrows point from the screen to the jar
    const time = this.api.time;
    if (this.phase === 'play' && time < 4) {
      const a = clamp(Math.min(time / 0.3, (4 - time) / 0.5), 0, 1);
      g.save(); g.globalAlpha = a;
      const bob = Math.sin(this.t * 8) * 10;
      drawArrow(g, JAR.x + 110 + bob, JAR.y + 10, 1);
      g.restore();
      for (const e of this.ents) {
        if (e.p.isAI) continue;
        ui.glyph(g, 'a', e.x + 70, e.a.y - e.a.height * 0.5, 44);
      }
    }
    if (this.shower && this.showerT < 2.2) {
      g.save(); g.globalAlpha = clamp(2.2 - this.showerT, 0, 1);
      ui.banner(g, 'Star shower!', this.showerT, { y: 470, size: 130, color: '#ffd23f' });
      g.restore();
    }
  }
}

function glowStream(g, s, a) {
  g.save(); g.globalAlpha = a * 0.25; g.globalCompositeOperation = 'lighter';
  g.strokeStyle = '#ffffff'; g.lineWidth = 130; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); s.pts.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
  g.restore();
}

function drawArrow(g, x, y, dir) {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(46, -40); g.lineTo(46, -16); g.lineTo(110, -16); g.lineTo(110, 16); g.lineTo(46, 16); g.lineTo(46, 40); g.closePath();
  g.fill(); g.stroke();
  g.restore();
}
