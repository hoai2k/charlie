// Leaf Pile Leap (Sister Party): autumn in Granny Goose's garden. Everyone has a rake:
// A rakes the leaves near you and they tumble through the air onto ONE giant pile in the
// middle of the lawn, which grows in four stages. New leaves keep drifting down from the
// trees. Cheeky squirrels dart through and dive into the pile, scattering a few leaves
// back onto the lawn - bump into one (or press A by it) to shoo it off, giggling. No
// penalty, just funny (the pile never shrinks below the stage it has reached).
// By the gate, Granny Goose has raked her own neat little pile while she waters her
// flowers or dozes. Jump in it (A or B next to it): a cheeky leaf burst and bonus
// sparkles; Granny turns round, gasps, harrumphs ... and then laughs. She tidies it up
// again, ready for the next cheeky jump.
// When the pile is huge (or the clock runs out), a stepladder pops up beside it:
// everyone climbs it in turn and CANNONBALLS in (mash A for a bigger splash) with a giant
// leaf explosion, and the game ends on everyone's heads poking out of the leaves.
// In the pile (and on in the gallery) a kid can wade about (stick, leaves puffing up; B
// dashes), and jump right out and plop back in with a leaf splash (A; in the gallery,
// where A goes on, X).
// No losers: finishTogether, a gallery ending, everyone gets a star.
//
// Sister Party Easy: A alone plays the whole game. One press rakes where you are; pressing A
// again and again (no stick) walks you to the next leafy patch (easyAutoOk / easyErrand),
// now and then to Granny's pile. The stick is optional; B dashes (or jumps in Granny's pile).
//
// Art hooks (procedural stand-ins until they land; see image-requests.md, leaf-pile-leap):
//   bg/leaf-pile-leap (stand-in: bg/fairy-hide-seek warmed to autumn + drawn trees/gate),
//   thumb/leaf-pile-leap, prop/llp-leaves (4x4 atlas), prop/llp-pile-1..4,
//   prop/llp-granny-pile, prop/llp-rake, prop/llp-squirrel-run-1/-2, prop/llp-squirrel-scared,
//   prop/llp-ladder, prop/llp-granny-laugh, prop/llp-granny-doze; reused prop/mm-granny,
//   prop/mm-granny-gasp, prop/mm-granny-huff.
// Sound hooks (optional files, synth fallbacks): llp-rake llp-crunch llp-whoosh llp-plop
//   llp-squirrel llp-boing llp-honk llp-granny-laugh llp-ladder llp-cannonball llp-party.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { easySteer, easyPrompt, easyErrand, easyErrandStep, easyBusy } from '../engine/easy.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { clamp, approach, lerp, rand, pick, chance, TAU, ease } from '../engine/util.js';
import { sayFor, drawShock, drawSteam, drawShout } from '../engine/fluster.js';
import { Dash } from '../engine/dash.js';
import {
  NAVY, leafKind, drawLeaf, drawPile, domeTop, PILE_FULL_W, drawNeatPile, drawRake, drawSquirrel,
  drawLadder, LADDER_H, LADDER_TOP, drawGranny, drawBackground, drawCollar,
} from './leaf-pile-leap/art.js';
import { meta } from './leaf-pile-leap.meta.js';

export { meta };

/** Play a sound file if it's there, else the first fallback that is (file or synth). */
const snd = (keys, o) => { for (const k of keys) if (hasSound(k)) return sfx(k, o); return sfx(keys[keys.length - 1], o); };

// --- tuning -----------------------------------------------------------------
const DURATION = 62;                 // raking clock; the finale follows (~10 s)
const SPEED = 540;
const X_MIN = 70, X_MAX = W - 70, Y_MIN = 410, Y_MAX = 1030;
const PILE = { x: 900, y: 612 };
const LAD = { x: 470, y: 650 };
const GP = { x: 1580, y: 522 };      // Granny's neat little pile
const GRANNY = { x: 1792, y: 512 };
const REACH = 205;                   // rake reach (px, y counts 1.4x)
const RAKE_MAX = 7;                  // leaves per stroke
const RAKE_CD = 0.17;
const GP_REACH = 175;
const pileW = (f) => 250 + (PILE_FULL_W - 250) * f;
const pileH = (w) => w * 0.55;
const HEAD_SCALE = 1.22;

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;
    this.players = api.players;
    const n = this.n = this.players.length;
    this.t = 0; this.timeLeft = DURATION; this.started = false;
    this.phase = 'play'; this.ft = 0; this.finished = false;
    api.limit(() => (this.phase === 'play' ? this.timeLeft : null), { showAt: Infinity });
    this.stage = 0; this.pileSq = 0; this.pileWob = 0; this.pileHi = 0;
    this.leaves = []; this.bits = []; this.squirrels = [];
    this.squirrelT = 7; this.driftT = 0;
    this.crunchGate = 0; this.plopGate = 0; this.giggleGate = 0;
    this.gp = { fill: 1, sq: 0 };
    this.granny = { state: 'water', t: 0, swap: rand(7, 10), facing: 1, say: null, sayT: 0, bob: 0, k: 0 };
    this.ladder = { k: 0, v: 0 };
    this.banner = null;
    this.scale = n <= 4 ? 0.88 : n <= 6 ? 0.8 : 0.74;
    this.cells = new Map();
    // leaves to start: a few leafy patches plus singles
    const free = (x, y) => !this.inPile(x, y, 50) && Math.hypot(x - GP.x, (y - GP.y) * 1.4) > 150 && Math.hypot(x - GRANNY.x, y - GRANNY.y) > 120;
    const patches = 4 + Math.min(4, n);
    for (let k = 0; k < patches; k++) {
      let cx, cy, tries = 0;
      do { cx = rand(160, W - 220); cy = rand(470, 990); } while (!free(cx, cy) && ++tries < 30);
      const m = 9 + (Math.random() * 6 | 0);
      for (let i = 0; i < m; i++) { const a = rand(TAU), r = Math.sqrt(Math.random()) * 120; this.addLeaf(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6); }
    }
    for (let i = 0; i < 16; i++) { const x = rand(120, W - 160), y = rand(450, 1000); if (free(x, y)) this.addLeaf(x, y); }
    // the goal follows the supply: the leaves here now plus ~64 s of drifting ones (and a few from
    // Granny's pile), so a busy team fills the pile at about 50-55 s (else the clock ends it at 62 s)
    this.driftRate = (1 + 0.35 * (n - 1)) / 0.4;
    this.goal = Math.round(this.leaves.length * 0.95 + this.driftRate * 64);
    this.pileN = Math.round(this.goal * 0.06); this.shown = this.pileN / this.goal;
    this.ents = this.players.map((p, i) => {
      const a = new Actor(p, { scale: this.scale });
      const minH = 140 * this.scale;
      if (a.height < minH) a.scale *= minH / a.height;
      const x = n === 1 ? 640 : 220 + ((W - 520) * i) / (n - 1);
      const y = i % 2 ? 930 : 820;
      a.x = x; a.y = y; a.facing = x < PILE.x ? 1 : -1;
      const e = { p, a, i, x, y, vx: 0, vy: 0, base: a.scale, dash: new Dash({ color: '#ffd7a0' }), brain: new Brain(p),
        raked: 0, shoo: 0, cheeky: 0, sweep: 0, rakeCd: 0, jump: null, fin: null, rot: 0, tgt: null, aiA: 0, wantJump: false,
        cheekyCd: rand(8, 16), popT: 0, popN: 0, stepGate: 0, neckK: a.height * 0.7 / a.scale, headK: 0 };
      a.attach((g, info) => this.drawHeld(g, info, e));
      if (this.easy && !p.isAI) e.ez = { n: 0 };
      return e;
    });
  }

  // ---------------------------------------------------------------- leaves
  addLeaf(x, y, o = {}) {
    const L = { x: clamp(x, 40, W - 40), y: clamp(y, Y_MIN + 10, H - 30), z: 0, state: 'ground', kind: leafKind(), size: rand(48, 64), rot: rand(TAU), spin: 0, t: 0, ph: rand(TAU), ...o };
    this.leaves.push(L);
    return L;
  }

  get fill() { return clamp(this.pileN / this.goal, 0, 1); }
  get pileW() { return pileW(this.shown); }

  /** Inside the pile's footprint (plus a margin)? */
  inPile(x, y, m = 0) {
    const rx = pileW(this.fill || 0.06) * 0.46 + m, ry = 64 + m * 0.5;
    return ((x - PILE.x) / rx) ** 2 + ((y - PILE.y + 8) / ry) ** 2 < 1;
  }

  /** A point on the pile's front for a leaf to land on. */
  pileSpot() {
    const w = this.pileW, h = pileH(w), u = rand(-0.8, 0.8);
    return { x: PILE.x + u * w * 0.45, y: PILE.y - domeTop(u) * h * rand(0.35, 0.95) };
  }

  /** Send a lawn leaf flying onto the pile (owner: who raked it). */
  launch(L, owner, delay = 0) {
    const s = this.pileSpot(), sy = L.y - L.z;
    const d = Math.hypot(s.x - L.x, s.y - sy);
    Object.assign(L, { state: 'fly', owner, sx: L.x, sy, tx: s.x, ty: s.y, t: -delay, T: clamp(0.45 + d / 1500, 0.5, 1.05), arc: 130 + d * 0.22, spin: rand(6, 11) * (chance(0.5) ? 1 : -1), z: 0 });
  }

  /** Throw a leaf out onto the lawn (from (x, y) in screen space). */
  kick(x, y, tx, ty, arc = 160) {
    const L = this.addLeaf(x, y, { state: 'kick' });
    Object.assign(L, { sx: x, sy: y, tx: clamp(tx, 60, W - 60), ty: clamp(ty, Y_MIN + 20, Y_MAX), t: 0, T: rand(0.55, 0.85), arc, spin: rand(5, 10) * (chance(0.5) ? 1 : -1) });
    return L;
  }

  updateLeaves(dt) {
    const wind = Math.sin(this.t * 0.4) * 30;
    for (const L of this.leaves) {
      if (L.state === 'fall') {
        L.t += dt; L.z -= L.vz * dt; L.x += (Math.sin(L.t * 2.2 + L.ph) * 70 + wind) * dt; L.rot += Math.sin(L.t * 2.2 + L.ph) * 2.2 * dt;
        if (L.z <= 0) { L.z = 0; L.state = 'ground'; L.x = clamp(L.x, 40, W - 40); if (this.inPile(L.x, L.y, 20)) { this.pileN++; L.dead = true; } }
      } else if (L.state === 'fly' || L.state === 'kick') {
        L.t += dt;
        if (L.t < 0) continue;
        const k = Math.min(1, L.t / L.T);
        L.x = lerp(L.sx, L.tx, k); L.z = 0;
        L.y = lerp(L.sy, L.ty, k) - Math.sin(k * Math.PI) * L.arc;
        L.rot += L.spin * dt;
        if (k >= 1) {
          if (L.state === 'fly') { L.dead = true; this.arrive(L); }
          else { L.state = 'ground'; L.x = L.tx; L.y = L.ty; if (this.inPile(L.x, L.y, 10)) { L.dead = true; this.pileN++; } }
        }
      }
    }
    if (this.leaves.some((L) => L.dead)) this.leaves = this.leaves.filter((L) => !L.dead);
    // bits: leaf confetti from rakes, splashes and the finale
    for (const b of this.bits) {
      b.t += dt; b.vy += b.g * dt; b.vx *= Math.exp(-b.drag * dt); b.vy *= Math.exp(-b.drag * 0.5 * dt);
      if (b.sway) b.vx += Math.sin(b.t * 3 + b.ph) * b.sway * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.spin * dt;
    }
    this.bits = this.bits.filter((b) => b.t < b.life);
  }

  /** Leaf confetti (drawn leaves, spun in the plane). */
  burst(x, y, count, { speed = [200, 520], up = true, spread = Math.PI * 0.9, angle = -Math.PI / 2, size = [32, 52], life = [0.9, 1.5], g = 520, drag = 1.2 } = {}) {
    for (let i = 0; i < count && this.bits.length < 420; i++) {
      const a = (up ? angle : rand(TAU)) + rand(-spread / 2, spread / 2), v = rand(...speed);
      this.bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g, drag, rot: rand(TAU), spin: rand(-12, 12), kind: leafKind(), size: rand(...size), t: 0, life: rand(...life), sway: 90, ph: rand(TAU) });
    }
  }

  arrive(L) {
    this.pileN++;
    if (L.owner) L.owner.raked++;
    this.pileSq = Math.max(this.pileSq, 0.18); this.pileHi = 1;
    if (this.plopGate <= 0) { this.plopGate = 0.09; snd(['llp-plop', 'pop'], { vol: 0.16, rate: rand(1.3, 1.7) }); }
    if (chance(0.25)) particles.burst(L.x, L.y, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffffff'], size: [10, 16] });
  }

  /** Leaves drifting down from the trees all game. */
  drift(dt) {
    const onLawn = this.leaves.filter((L) => L.state === 'ground' || L.state === 'fall').length;
    const cap = 50 + 8 * this.n;
    this.driftT -= dt;
    if (this.driftT > 0 || onLawn >= cap) return;
    this.driftT = rand(0.7, 1.3) / this.driftRate;
    let x, y, tries = 0;
    do { x = rand(90, W - 160); y = rand(450, 1010); } while ((this.inPile(x, y, 40) || Math.hypot(x - GP.x, (y - GP.y) * 1.4) < 120) && ++tries < 12);
    const sy = rand(60, 260);
    this.addLeaf(x, y, { state: 'fall', z: y - sy, vz: rand(90, 150) });
  }

  // ---------------------------------------------------------------- update
  preUpdate(dt) {
    this.t += dt;
    this.ambient(dt);
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); this.placeActor(e); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    if (!this.started) { this.started = true; this.startT = this.t - dt; }
    const playing = this.phase === 'play';
    if (playing) this.timeLeft = Math.max(0, DURATION - (this.t - this.startT));
    this.ambient(dt);
    if (playing) {
      this.drift(dt);
      this.cellsUpdate();
      this.updateSquirrels(dt);
      for (const e of this.ents) {
        if (e.p.isAI) this.aiThink(e, dt);
        this.movePlayer(e, dt);
        this.interact(e, dt);
      }
      spread(this.ents, { radius: (e) => bodyRadius(e.a) * 0.62, yScale: 1.8, strength: 0.8, skip: (e) => !!e.jump, bounds: { x0: X_MIN, x1: X_MAX, y0: Y_MIN, y1: Y_MAX } });
      for (const e of this.ents) if (!e.jump) this.blockOut(e);
      if (this.fill >= 1 || this.timeLeft <= 0) this.startFinale();
    } else if (this.phase === 'finale' || this.phase === 'heads') this.updateFinale(dt);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }
  }

  postUpdate(dt) {
    this.t += dt;
    this.ambient(dt);
    this.updateFinale(dt);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }
  }

  ambient(dt) {
    this.crunchGate -= dt; this.plopGate -= dt; this.giggleGate -= dt;
    this.updateLeaves(dt);
    // the pile catches up with the leaves on it (smoothly), and pops at each stage
    this.shown = approach(this.shown, this.fill, dt * 0.6);
    const st = Math.min(4, Math.floor(this.fill * 4 + 1e-6));
    if (st > this.stage && this.phase === 'play') this.stagePop(st);
    this.stage = Math.max(this.stage, st);
    this.pileSq = approach(this.pileSq, 0, dt * 1.6);
    this.pileWob = Math.max(0, this.pileWob - dt * 1.5);
    this.pileHi = Math.max(0, this.pileHi - dt * 3);
    this.gp.sq = approach(this.gp.sq, 0, dt * 2);
    this.updateGranny(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.d) this.banner = null; }
  }

  stagePop(st) {
    const w = pileW(Math.min(1, st / 4)), top = PILE.y - pileH(w);
    this.pileSq = 0.6;
    particles.burst(PILE.x, top, { type: 'star', count: 12, colors: ['#ffd23f', '#ff9a2e', '#ffffff'], speed: [160, 360] });
    this.burst(PILE.x, top + 30, 14, { speed: [200, 420] });
    particles.ring(PILE.x, top + 40, '#fff2c0', 240, 0.45);
    if (st < 4) {
      particles.popText(PILE.x, top - 60, ['', 'Bigger!', 'Even bigger!', 'So BIG!'][st], '#ffb02e', 58);
      snd(['llp-boing', 'grow'], { vol: 0.6 });
    }
    fx.shake(5, 0.15);
  }

  placeActor(e) {
    const a = e.a;
    a.x = e.x; a.y = e.y;
    if (e.fin && (e.fin.state === 'leap' || e.fin.state === 'in' || e.fin.state === 'head' || e.fin.state === 'hop')) return;
    a.scale = e.base * depthScale(e.y, { top: 400, near: 1000, far: 0.86, nearScale: 1.04 });
  }

  movePlayer(e, dt) {
    const c = e.p.ctrl, a = e.a;
    e.rakeCd = Math.max(0, e.rakeCd - dt);
    e.sweep = Math.max(0, e.sweep - dt / 0.26);
    e.popT = Math.max(0, e.popT - dt);
    e.cheekyCd = Math.max(0, e.cheekyCd - dt);
    if (e.jump) { this.updateJump(e, dt); return; }
    let ix = c.x, iy = c.y;
    if (e.ez) [ix, iy] = this.easyPilot(e, dt);
    const len = Math.hypot(ix, iy); if (len > 1) { ix /= len; iy /= len; }
    e.vx = approach(e.vx, ix * SPEED, 4200 * dt);
    e.vy = approach(e.vy, iy * SPEED * 0.85, 4200 * dt);
    const nearGP = this.gpReady() && this.nearGP(e);
    const dd = e.dash.update(dt, c, { x: e.x, y: e.y, actor: a, ok: !e.p.isAI && !nearGP });   // B: dash (by Granny's pile: jump in)
    e.x = clamp(e.x + e.vx * dt + dd.x, X_MIN, X_MAX);
    e.y = clamp(e.y + e.vy * dt + dd.y, Y_MIN, Y_MAX);
    const sp = Math.hypot(e.vx, e.vy);
    if (!a._once) a.moveAnim(e.vx, e.vy, SPEED, { run: sp > 380 });
    // leaves crunch underfoot
    e.stepGate -= dt;
    if (sp > 160 && e.stepGate <= 0) {
      for (const L of this.leaves) {
        if (L.state !== 'ground' || Math.abs(L.x - e.x) > 40 || Math.abs(L.y - e.y) > 26) continue;
        e.stepGate = 0.32; L.rot += rand(-0.6, 0.6);
        if (this.crunchGate <= 0) { this.crunchGate = 0.12; snd(['llp-crunch', 'crumble'], { vol: 0.12, rate: rand(1.2, 1.6) }); }
        break;
      }
    }
  }

  /** Keep players out of the pile and off Granny's toes. */
  blockOut(e) {
    const rx = pileW(this.shown) * 0.44, ry = 58;
    const dx = (e.x - PILE.x) / rx, dy = (e.y - (PILE.y - 6)) / ry, d = Math.hypot(dx, dy);
    if (d < 1) { const k = 1 / (d || 1); e.x = PILE.x + dx * k * rx; e.y = PILE.y - 6 + (d ? dy * k : 1) * ry; }
    const gx = (e.x - GRANNY.x) / 70, gy = (e.y - GRANNY.y) / 34, gd = Math.hypot(gx, gy);
    if (gd < 1) { const k = 1 / (gd || 1); e.x = GRANNY.x + gx * k * 70; e.y = GRANNY.y + (gd ? gy * k : 1) * 34; }
    e.x = clamp(e.x, X_MIN, X_MAX); e.y = clamp(e.y, Y_MIN, Y_MAX);
  }

  interact(e) {
    if (e.jump) return;
    const c = e.p.ctrl;
    // bump into a squirrel: it scampers off giggling
    for (const s of this.squirrels) if (this.shooable(s) && Math.hypot(s.x - e.x, (s.y - e.y) * 1.4) < 80) this.shoo(s, e);
    const nearGP = this.gpReady() && this.nearGP(e);
    if (nearGP && (c.pressed('b') || (c.pressed('a') && (!e.p.isAI || e.wantJump)))) { this.jumpIn(e); return; }
    if (c.pressed('a')) {
      const got = this.rake(e);
      if (e.ez) this.easyMore(e, got);
    }
  }

  /** One rake stroke: the leaves round you whoosh onto the pile. Returns how many. */
  rake(e) {
    if (e.rakeCd > 0) return -1;
    e.rakeCd = RAKE_CD; e.sweep = 1;
    const a = e.a;
    a.playOnce('push', 0.26); a.squash(0.1);
    const near = [];
    for (const L of this.leaves) {
      if (!(L.state === 'ground' || (L.state === 'fall' && L.z < 90))) continue;
      const d = Math.hypot(L.x - e.x, (L.y - e.y) * 1.4);
      if (d < REACH) near.push([d, L]);
    }
    near.sort((p, q) => p[0] - q[0]);
    const take = near.slice(0, RAKE_MAX);
    if (take.length) {
      const cx = take.reduce((s, [, L]) => s + L.x, 0) / take.length;
      if (Math.abs(cx - e.x) > 20) a.facing = cx > e.x ? 1 : -1;
      take.forEach(([, L], i) => this.launch(L, e, i * 0.035));
      snd(['llp-rake', 'brush'], { vol: 0.35, rate: rand(0.9, 1.15) });
      snd(['llp-crunch', 'crumble'], { vol: 0.22, rate: rand(1.1, 1.4) });
      if (!e.p.isAI) e.p.ctrl.rumble(0.18, 50);
    } else {
      snd(['llp-whoosh', 'whoosh'], { vol: 0.12, rate: 1.6 });
    }
    // a swish of leaf bits off the rake either way: every press does something
    const hx = e.x + a.facing * a.height * 0.5;
    this.burst(hx, e.y - 10, take.length ? 3 : 2, { speed: [160, 320], angle: -Math.PI / 2 - a.facing * 0.5, spread: 0.9, size: [18, 28], life: [0.5, 0.8], g: 900 });
    particles.burst(hx, e.y - 6, { type: 'dust', count: 3, color: '#f3dcae', speed: [40, 120] });
    // A by a squirrel shoos it
    for (const s of this.squirrels) if (this.shooable(s) && Math.hypot(s.x - e.x, (s.y - e.y) * 1.4) < 210) this.shoo(s, e);
    return take.length;
  }

  // ---------------------------------------------------------------- Granny's pile
  gpReady() { return this.phase === 'play' && this.gp.fill >= 1 && (this.granny.state === 'water' || this.granny.state === 'doze'); }
  nearGP(e) { return Math.hypot(e.x - GP.x, (e.y - GP.y) * 1.4) < GP_REACH; }

  jumpIn(e) {
    if (e.ez) e.ez._ezErrand = null;
    e.jump = { t: 0, T: 0.62, sx: e.x, sy: e.y, tx: GP.x + rand(-10, 10), ty: GP.y + 4, phase: 'air' };
    e.wantJump = false; e.cheekyCd = rand(14, 22);
    this.gp.fill = 0.999;   // spoken for
    e.a.playOnce('jump', 0.3, 'tuck'); e.a.squash(-0.25);
    snd(['llp-boing', 'jump'], { vol: 0.5 });
  }

  updateJump(e, dt) {
    const J = e.jump, a = e.a;
    J.t += dt;
    if (J.phase === 'air') {
      const k = Math.min(1, J.t / J.T);
      e.x = lerp(J.sx, J.tx, k); e.y = lerp(J.sy, J.ty, k);
      a.z = Math.sin(k * Math.PI) * 230;
      a.facing = J.tx >= J.sx ? 1 : -1;
      e.rot = k > 0.35 ? (k - 0.35) / 0.65 * TAU * a.facing : 0;   // a tumble in the plane
      if (k >= 1) this.splashGP(e);
    } else if (J.phase === 'in') {
      e.headK = Math.min(1, J.t / 0.25);
      e.x = GP.x; e.y = GP.y - 45 + e.neckK * a.scale - a.height * 0.1;
      if (J.t > 1.0) {
        this.gp.fill = 0; this.gp.sq = 0.4;
        for (let i = 0; i < 4; i++) this.kick(GP.x, GP.y - 30, GP.x + rand(-260, 200), GP.y + rand(40, 220), rand(120, 220));
        e.y = GP.y; J.phase = 'out'; J.t = 0; J.sx = e.x; J.sy = e.y; J.tx = GP.x - 150; J.ty = clamp(GP.y + 90, Y_MIN, Y_MAX); a.setPose('jump'); snd(['llp-boing', 'bounce'], { vol: 0.35 }); }
    } else {
      const k = Math.min(1, J.t / 0.42);
      e.x = lerp(J.sx, J.tx, k); e.y = lerp(J.sy, J.ty, k); a.z = Math.sin(k * Math.PI) * 120;
      a.facing = -1;
      if (k >= 1) { a.z = 0; e.jump = null; e.headK = 0; a.setPose('idle'); a.playOnce('giggle', 0.7); a.squash(0.25); }
    }
  }

  splashGP(e) {
    const a = e.a;
    a.z = 0; e.rot = 0;
    e.jump.phase = 'in'; e.jump.t = 0;
    e.cheeky++;
    this.gp.fill = 0.55; this.gp.sq = 0.6;
    a.setPose('laugh');
    for (let i = 0; i < 10; i++) { const ang = rand(Math.PI * 0.85, Math.PI * 2.15), r = rand(120, 330); this.kick(GP.x, GP.y - 40, GP.x + Math.cos(ang) * r, GP.y + 40 + Math.abs(Math.sin(ang)) * r * 0.6, rand(160, 300)); }
    this.burst(GP.x, GP.y - 40, 22, { speed: [260, 560] });
    particles.burst(GP.x, GP.y - 80, { type: 'sparkle', count: 14, colors: RAINBOW, speed: [120, 320] });
    particles.ring(GP.x, GP.y - 20, '#fff2c0', 200, 0.4);
    particles.popText(GP.x - 190, GP.y - 150, 'Hee hee!', '#ff6fd0', 56);
    this.pop(e, '+3 ✦', '#ffd23f', 44);
    snd(['llp-crunch', 'crumble'], { vol: 0.6 });
    snd(['llp-whoosh', 'whoosh'], { vol: 0.4 });
    if (this.giggleGate <= 0) { this.giggleGate = 0.8; sfx('giggle', { vol: 0.5 }); }
    if (chance(0.4)) voice(e.p.charId, 'laugh');
    fx.shake(5, 0.15);
    if (!e.p.isAI) e.p.ctrl.rumble(0.4, 120);
    this.grannyReact(e);
  }

  grannyReact(e) {
    const G = this.granny;
    G.state = 'gasp'; G.t = 0; G.facing = -1; G.k = 0;
    G.say = pick(['My pile!', 'Oh!', 'Goodness!']); G.sayT = 0;
    snd(['llp-honk', 'mm-honk', 'whistle'], { vol: 0.55 });
  }

  updateGranny(dt) {
    const G = this.granny;
    G.t += dt; G.sayT += dt; G.k = Math.min(1, G.k + dt * 5);
    G.bob = 0;
    switch (G.state) {
      case 'gasp':
        G.bob = Math.max(0, 1 - G.t * 4) * 14;
        if (G.t > 0.9) { G.state = 'huff'; G.t = 0; G.say = pick(['Harrumph!', 'Hmph!', sayFor('huff')]); G.sayT = 0; }
        break;
      case 'huff':
        G.bob = Math.sin(G.t * 18) * 2;
        if (G.t > 1.3) {
          G.state = 'laugh'; G.t = 0; G.say = pick(['Ho ho ho!', 'Oh, you rascals!', 'Hee hee hoo!']); G.sayT = 0;
          snd(['llp-granny-laugh', 'mm-granny-laugh', 'giggle'], { vol: 0.7 });
          particles.burst(GRANNY.x, GRANNY.y - 240, { type: 'heart', count: 5, colors: ['#ff6fd0', '#ff9ad5'], speed: [60, 160] });
          for (const e of this.ents) if (!e.jump && !e.fin && Math.hypot(e.x - GRANNY.x, e.y - GRANNY.y) < 600 && !e.a._once) e.a.playOnce('giggle', 0.9);
        }
        break;
      case 'laugh':
        G.bob = Math.abs(Math.sin(G.t * 14)) * 10;
        if (G.t > 1.7) { G.state = 'water'; G.t = 0; G.facing = 1; G.say = null; G.tidy = true; G.swap = rand(7, 10); }
        break;
      default:
        // water the flowers <-> doze, and tidy her pile back up between jumps
        G.swap -= dt;
        if (G.swap <= 0) { G.state = G.state === 'water' ? 'doze' : 'water'; G.swap = G.state === 'doze' ? rand(5, 7) : rand(7, 10); }
        if (G.state === 'doze') G.bob = Math.sin(G.t * 2) * 2;
        if (this.gp.fill < 1 && G.tidy) {
          this.gp.fill = Math.min(1, this.gp.fill + dt / 3.2);
          if (Math.random() < dt * 8) { const ang = rand(TAU); const L = { sx: GP.x + Math.cos(ang) * 200, sy: GP.y + Math.sin(ang) * 80 }; this.bits.push({ x: L.sx, y: L.sy - 20, vx: (GP.x - L.sx) * 1.6, vy: -280, g: 640, drag: 0, rot: rand(TAU), spin: rand(-8, 8), kind: leafKind(), size: rand(22, 30), t: 0, life: 0.6, sway: 0, ph: 0 }); }
          if (this.gp.fill >= 1) { G.tidy = false; this.gp.sq = 0.4; particles.burst(GP.x, GP.y - 60, { type: 'sparkle', count: 6, colors: ['#ffffff', '#fff6a8'] }); }
        }
        if (G.state === 'water' && Math.random() < dt * 14) {
          particles.burst(GRANNY.x + 40, GRANNY.y - 128, { type: 'drop', count: 1, colors: ['#7fd3ff', '#bfe9ff'], speed: [160, 240], angle: -0.3, spread: 0.3, size: [6, 9], gravity: 700, life: [0.3, 0.45] });
        }
    }
  }

  // ---------------------------------------------------------------- squirrels
  shooable(s) { return s.state === 'run' || s.state === 'out'; }

  updateSquirrels(dt) {
    this.squirrelT -= dt;
    const cap = this.n >= 5 ? 2 : 1;
    if (this.squirrelT <= 0 && this.squirrels.length < cap && this.timeLeft > 5) {
      this.squirrelT = rand(8, 12);
      const dir = chance(0.5) ? 1 : -1;
      const s = { dir, x: dir > 0 ? -60 : W + 60, y: rand(640, 960), state: 'run', t: 0, f: 0, z: 0 };
      s.ty = s.y; this.squirrels.push(s);
      snd(['llp-squirrel', 'giggle'], { vol: 0.35, rate: 1.4 });
    }
    for (const s of this.squirrels) {
      s.t += dt; s.f = Math.floor(s.t * 11) % 2;
      if (s.state === 'run') {
        // dash to the pile, then dive in
        const tx = PILE.x - s.dir * 60, ty = PILE.y + 30, dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
        const v = 560;
        s.x += (dx / d) * v * dt; s.y += (dy / d) * v * dt + Math.sin(s.t * 6) * 60 * dt;
        s.z = Math.abs(Math.sin(s.t * 16)) * 18;
        if (d < 30) { s.state = 'in'; s.t = 0; this.squirrelDive(s); }
        this.squirrelKick(s);
      } else if (s.state === 'in') {
        this.pileWob = Math.max(this.pileWob, 0.6);
        if (s.t > 0.7) { s.state = 'out'; s.t = 0; s.x = PILE.x + s.dir * pileW(this.shown) * 0.42; s.y = PILE.y + 20; particles.popText(s.x, s.y - 120, 'Hee hee!', '#ff9a2e', 44); }
      } else if (s.state === 'out') {
        s.x += s.dir * 620 * dt; s.y += Math.sin(s.t * 5) * 80 * dt; s.z = Math.abs(Math.sin(s.t * 16)) * 18;
        this.squirrelKick(s);
      } else if (s.state === 'scared') {
        s.z = Math.sin(Math.min(1, s.t / 0.45) * Math.PI) * 90;
        if (s.t > 0.45) { s.state = 'flee'; s.t = 0; }
      } else if (s.state === 'flee') {
        s.x += s.dir * 980 * dt; s.z = Math.abs(Math.sin(s.t * 18)) * 22;
      }
    }
    this.squirrels = this.squirrels.filter((s) => s.x > -120 && s.x < W + 120);
  }

  squirrelKick(s) {
    for (const L of this.leaves) {
      if (L.state !== 'ground' || Math.abs(L.x - s.x) > 34 || Math.abs(L.y - s.y) > 22 || chance(0.6)) continue;
      L.state = 'kick'; L.sx = L.x; L.sy = L.y; L.tx = clamp(L.x + rand(-140, 140), 60, W - 60); L.ty = clamp(L.y + rand(-50, 50), Y_MIN + 20, Y_MAX); L.t = 0; L.T = rand(0.4, 0.6); L.arc = rand(50, 110); L.spin = rand(-9, 9);
    }
  }

  squirrelDive(s) {
    const floor = Math.ceil(this.stage / 4 * this.goal);   // the pile never drops a stage
    const out = clamp(this.pileN - floor, 0, 5);
    this.pileN -= out;
    this.pileWob = 1; this.pileSq = 0.3;
    snd(['llp-crunch', 'crumble'], { vol: 0.5 });
    snd(['llp-squirrel', 'giggle'], { vol: 0.45, rate: 1.5 });
    const w = this.pileW, top = PILE.y - pileH(w);
    for (let i = 0; i < out; i++) { const side = chance(0.5) ? 1 : -1; this.kick(PILE.x + rand(-w * 0.3, w * 0.3), top + rand(20, 120), PILE.x + side * rand(w * 0.55, w * 0.55 + 260), PILE.y + rand(40, 240), rand(150, 260)); }
    this.burst(PILE.x, top + 40, 8, { speed: [200, 420] });
  }

  shoo(s, e) {
    s.state = 'scared'; s.t = 0; s.dir = s.x >= e.x ? 1 : -1;
    e.shoo++;
    particles.popText(s.x, s.y - 130, pick(['Eek! Hee hee!', 'Eep!', 'Hee hee!']), '#ff9a2e', 46);
    particles.burst(s.x, s.y - 40, { type: 'sparkle', count: 8, colors: ['#ffd23f', '#ffffff', '#ff9a2e'], speed: [100, 260] });
    snd(['llp-squirrel', 'giggle'], { vol: 0.55, rate: 1.5 });
    if (!e.a._once && !e.jump) e.a.playOnce('giggle', 0.8);
    this.pop(e, '+1 ✦', '#ffd23f', 40);
    if (!e.p.isAI) e.p.ctrl.rumble(0.25, 70);
  }

  // ---------------------------------------------------------------- leafy patches
  /** Ground leaves bucketed into a coarse grid (for CPUs and the Easy autopilot). */
  cellsUpdate() {
    const m = this.cells; m.clear();
    for (const L of this.leaves) {
      if (L.state !== 'ground' && !(L.state === 'fall' && L.z < 200)) continue;
      const k = Math.floor(L.x / 200) + ',' + Math.floor((L.y - 400) / 130);
      let c = m.get(k);
      if (!c) { c = { n: 0, sx: 0, sy: 0, key: k }; m.set(k, c); }
      c.n++; c.sx += L.x; c.sy += L.y;
    }
    for (const c of m.values()) { c.x = c.sx / c.n; c.y = c.sy / c.n; }
  }

  /** The best leafy patch for e (busy patches others are heading to count less). */
  bestPatch(e, tgtOf) {
    let best = null, bs = -Infinity;
    for (const c of this.cells.values()) {
      if (c.n < 2 && this.cells.size > 3) continue;
      let sc = c.n * 85 - Math.hypot(c.x - e.x, (c.y - e.y) * 1.2) * 0.32;
      for (const o of this.ents) if (o !== e && tgtOf(o) && tgtOf(o).key === c.key) sc -= 260;
      if (sc > bs) { bs = sc; best = c; }
    }
    return best ? { x: best.x, y: best.y, key: best.key } : null;
  }

  leavesNear(e) {
    let n = 0;
    for (const L of this.leaves) if (L.state === 'ground' && Math.hypot(L.x - e.x, (L.y - e.y) * 1.4) < REACH) n++;
    return n;
  }

  // ---------------------------------------------------------------- Easy
  /** Easy: either stick walks you (like Medium); otherwise you walk only on an errand. */
  easyPilot(e, dt) {
    const z = e.ez, c = e.p.ctrl;
    const st = easySteer(z, c, dt);
    const step = easyErrandStep(z, dt, { x: e.x, y: e.y, steering: st.pushing });
    if (st.manual) return [st.x, st.y];
    if (!step) return [0, 0];
    const dx = step.x - e.x, dy = step.y - e.y, d = Math.hypot(dx, dy);
    const k = clamp(d / 90, 0.35, 1) * 0.78;
    return [(dx / (d || 1)) * k, (dy / (d || 1)) * k];
  }

  /** After an Easy A press: when that stroke found (almost) nothing, a repeated A walks her on. */
  easyMore(e, got) {
    const z = e.ez;
    if (got < 0 || got > 2 || easyBusy(z)) return;
    // now and then the cheeky choice: Granny's neat pile
    const cheeky = this.gpReady() && e.cheekyCd <= 0 && (z.n % 4 === 3);
    const t = cheeky ? { x: GP.x - 120, y: GP.y + 60, gp: true } : this.bestPatch(e, (o) => o.ez?.tgt || o.tgt);
    if (!t) return;
    if (easyErrand(z, t, { reach: t.gp ? 60 : 70, timeout: 6, act: () => { if (t.gp && this.gpReady()) this.jumpIn(e); else this.rake(e); } })) { z.n++; z.tgt = t; }
  }

  // ---------------------------------------------------------------- CPUs
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl, lvl = clamp(p.aiLevel ?? 0, 0, 2);
    if (e.jump) { ctrl.move(0, 0); return; }
    if (e.brain.ready(dt)) {
      e.brain.wait(reactionTime(p) + [0.5, 0.3, 0.15][lvl]);
      const sq = this.squirrels.find((s) => this.shooable(s) && Math.hypot(s.x - e.x, s.y - e.y) < 520);
      if (sq && chance(0.55)) e.tgt = { sq };
      else if (this.gpReady() && e.cheekyCd <= 0 && chance(0.18) && !this.ents.some((o) => o.wantJump)) { e.wantJump = true; e.tgt = { x: GP.x - 110, y: GP.y + 50, gp: true }; }
      else if (!(e.wantJump && this.gpReady()) && (!e.tgt || e.tgt.sq || e.tgt.gp || this.leavesNear(e) < 2 || chance(0.25))) {
        e.wantJump = false;
        e.tgt = chance(prof.mistake * 0.6) ? { x: rand(200, W - 200), y: rand(Y_MIN + 40, Y_MAX - 40) } : this.bestPatch(e, (o) => o.tgt);
      }
    }
    let tx = e.x, ty = e.y;
    if (e.tgt && e.tgt.sq) { tx = e.tgt.sq.x; ty = e.tgt.sq.y; if (!this.shooable(e.tgt.sq)) e.tgt = null; }
    else if (e.tgt) { tx = e.tgt.x; ty = e.tgt.y; }
    if (e.wantJump && !this.gpReady()) { e.wantJump = false; e.tgt = null; }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    const cap = [0.62, 0.74, 0.86][lvl];
    const ang = Math.atan2(dy, dx) + Math.sin(this.t * 2.1 + e.i) * prof.aimError * 0.4;
    const k = clamp(d / 70, 0, 1) * cap;
    if (d < 14) ctrl.move(0, 0); else ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
    // rake whenever there are leaves in reach (a steady, not frantic, rhythm)
    e.aiA -= dt;
    if (e.wantJump && this.nearGP(e)) { ctrl.press('a'); return; }
    if (e.aiA <= 0 && this.leavesNear(e) > 0) { e.aiA = [0.6, 0.45, 0.33][lvl] * rand(0.85, 1.2); ctrl.press('a'); }
  }

  // ---------------------------------------------------------------- finale
  startFinale() {
    if (this.phase !== 'play') return;
    this.phase = 'finale'; this.ft = 0;
    this.squirrels = this.squirrels.filter((s) => s.state === 'flee');
    this.banner = { text: this.fill >= 1 ? 'Huge pile!' : 'Whoosh!', t: 0, d: 1.8 };
    snd(['llp-party', 'fanfare'], { vol: 0.7 });
    // a big gust: every leaf on the lawn whooshes onto the pile
    let i = 0;
    for (const L of this.leaves) if (L.state === 'ground' || L.state === 'fall' || L.state === 'kick') { L.z = 0; this.launch(L, null, (i++ % 30) * 0.03); }
    if (i) snd(['llp-whoosh', 'whoosh'], { vol: 0.6 });
    this.pileN = Math.max(this.pileN, this.goal);
    this.stage = 4;
    this.stagePopDone = false;
    // queue for the ladder (closest first)
    const order = this.ents.slice().sort((a, b) => Math.hypot(a.x - LAD.x, a.y - LAD.y) - Math.hypot(b.x - LAD.x, b.y - LAD.y));
    order.forEach((e, q) => {
      if (e.jump) { e.jump = null; e.a.z = 0; e.rot = 0; e.headK = 0; }
      if (e.ez) e.ez._ezErrand = null;
      e.dash.cancel(); e.vx = e.vy = 0;
      e.fin = { state: 'walk', q, power: 0, t: 0, slot: null };
      if (e.p.isAI) e.p.ctrl.move(0, 0);
    });
    this.slots = this.headSlots();
    order.forEach((e, q) => { e.fin.slot = this.slots[q]; });
    this.nextClimbT = 0.9;
  }

  headSlots() {
    const n = this.n, w = PILE_FULL_W, h = pileH(w), out = [];
    const back = n > 4 ? Math.floor(n / 2) : 0, front = n - back;
    const row = (m, yk, spanK, depth) => {
      for (let i = 0; i < m; i++) {
        const u = m === 1 ? 0 : (-1 + (2 * i) / (m - 1)) * spanK;
        out.push({ x: PILE.x + u * w * 0.5, y: PILE.y - domeTop(u) * h * yk, depth });
      }
    };
    row(back, 0.74, 0.5, 0); row(front, 0.42, front > 3 ? 0.7 : 0.55, 1);
    return out;
  }

  updateFinale(dt) {
    if (this.phase !== 'finale' && this.phase !== 'heads') return;
    this.ft += dt;
    this.ladder.k = this.ft < 0.5 ? 0 : Math.min(1, this.ladder.k + dt * 3.5);
    if (this.ft > 0.5 && !this.ladderPopped) { this.ladderPopped = true; snd(['llp-ladder', 'bigpop'], { vol: 0.6 }); particles.burst(LAD.x, LAD.y - LADDER_H / 2, { type: 'star', count: 10, colors: ['#ffd23f', '#ffffff'] }); }
    if (!this.stagePopDone && this.shown > 0.98) { this.stagePopDone = true; this.stagePop(4); particles.popText(PILE.x, PILE.y - pileH(PILE_FULL_W) - 60, 'HUGE!', '#ff7a2e', 72); }
    const climbing = this.ents.filter((e) => e.fin && e.fin.state === 'climb');
    const waiting = this.ents.filter((e) => e.fin && (e.fin.state === 'walk' || e.fin.state === 'wait')).sort((a, b) => a.fin.q - b.fin.q);
    waiting.forEach((e, k) => { e.fin.q = k; });
    this.nextClimbT -= dt;
    if (waiting.length && this.ladder.k >= 1 && this.nextClimbT <= 0 && climbing.every((c) => c.fin.p > 0.45)) {
      const e = waiting[0];
      if (Math.hypot(e.x - (LAD.x - 30), e.y - (LAD.y + 6)) < 60 || this.ft > 7) {
        e.fin.state = 'climb'; e.fin.p = 0; e.x = LAD.x - 18; e.y = LAD.y + 6; this.nextClimbT = 0.35;
        e.a.setPose('carry');
      }
    }
    for (const e of this.ents) this.finaleStep(e, dt);
    // everyone in: heads up, leaves rain, then the gallery
    if (this.phase === 'finale' && this.ents.every((e) => e.fin && (e.fin.state === 'head' || e.fin.state === 'hop') && e.fin.t > 0.6)) {
      this.phase = 'heads'; this.ht = 0;
      this.banner = { text: 'Leaf pile pals!', t: 0, d: 2.6 };
      sfx('cheer', { vol: 0.6 });
      particles.confettiRain(W, 60);
    }
    if (this.phase === 'finale' && this.ft > 9 + this.n * 1.1) {   // safety: nobody waits forever
      for (const e of this.ents) if (e.fin.state !== 'head' && e.fin.state !== 'hop') { e.fin.state = 'head'; e.fin.t = 1; e.a.z = 0; e.rot = 0; e.a.setPose('laugh'); }
    }
    if (this.phase === 'heads') {
      this.ht += dt;
      if (Math.random() < dt * 12) this.bits.push({ x: rand(0, W), y: -30, vx: rand(-40, 40), vy: rand(80, 160), g: 30, drag: 0.2, rot: rand(TAU), spin: rand(-4, 4), kind: leafKind(), size: rand(28, 44), t: 0, life: 7, sway: 70, ph: rand(TAU), rain: true });
      if (!this.finished && this.ht > 1.8) this.finish();
    }
  }

  finaleStep(e, dt) {
    const F = e.fin, a = e.a, c = e.p.ctrl;
    if (!F) return;
    F.t += dt;
    // a human in the pile wades about and jumps out (A before the gallery; X always)
    const wader = !e.p.isAI && (F.state === 'head' || F.state === 'hop');
    if (wader) this.wade(e, dt);
    // mashing A anytime in the finale: a bigger splash (and a little leaf puff now)
    if (e.p.isAI ? Math.random() < dt * [2, 3, 4][clamp(e.p.aiLevel ?? 0, 0, 2)] : c.pressed('a') && !(wader && !this.api.ended?.())) {
      F.power = Math.min(1.6, F.power + 0.14);
      if (F.state === 'head') {
        this.burst(F.slot.x, F.slot.y - 10, 4, { speed: [160, 320], size: [22, 34] });
        if (!a._once) a.playOnce('giggle', 0.5);
        this.pileWob = Math.max(this.pileWob, 0.25);
        if (this.crunchGate <= 0) { this.crunchGate = 0.12; snd(['llp-crunch', 'crumble'], { vol: 0.25, rate: rand(1.2, 1.5) }); }
      } else if (F.state !== 'leap') { a.squash(0.12); particles.burst(e.x, e.y - a.height - 10, { type: 'sparkle', count: 1, colors: ['#ffd23f'] }); }
      if (F.state === 'climb') F.p = Math.min(1, F.p + 0.06);
    }
    switch (F.state) {
      case 'walk': case 'wait': {
        const tx = F.q < 4 ? LAD.x - 30 - F.q * 86 : LAD.x + 10 - (F.q - 4) * 86;
        const ty = F.q < 4 ? LAD.y + 6 : LAD.y + 120;
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        const v = Math.min(d / dt, SPEED * 0.8);
        if (d > 4) { e.x += (dx / d) * v * dt; e.y += (dy / d) * v * dt; this.blockOut(e); }
        if (!a._once) a.moveAnim(d > 4 ? (dx / d) * v : 0, d > 4 ? (dy / d) * v : 0, SPEED);
        if (d <= 4) { F.state = 'wait'; a.facing = 1; if (!a._once) a.setPose(F.power > 0.3 ? 'cheer' : 'idle'); }
        break;
      }
      case 'climb': {
        F.p = Math.min(1, F.p + dt / 1.05);
        a.z = F.p * (LADDER_TOP.height + 6);
        e.x = lerp(LAD.x - 18, LAD.x + LADDER_TOP.x, F.p);
        a.facing = 1;
        if (!a._once) a.setPose('carry');
        if (F.p >= 1) { F.state = 'top'; F.t = 0; a.setPose('ready'); a.squash(0.2); }
        break;
      }
      case 'top':
        if (F.t > 0.22) {
          F.state = 'leap'; F.t = 0;
          F.sx = e.x; F.sy = LAD.y - a.z; a.z = 0;
          F.T = 0.85;
          a.playOnce('jump', 0.22, 'tuck');
          snd(['llp-boing', 'jump'], { vol: 0.5 });
          if (chance(0.25)) voice(e.p.charId, 'woo');
        }
        break;
      case 'leap': {
        const k = Math.min(1, F.t / F.T);
        e.x = lerp(F.sx, F.slot.x, k);
        e.y = lerp(F.sy, F.slot.y + 40, ease.inQuad(k)) - Math.sin(k * Math.PI) * 90;
        e.rot = k > 0.2 ? (k - 0.2) / 0.8 * TAU * 1.5 : 0;
        a.scale = e.base * (1 + Math.sin(k * Math.PI) * 0.1);
        if (k >= 1) this.cannonball(e);
        break;
      }
      case 'in':
        if (F.t > 0.4) { F.state = 'head'; F.t = 0; a.setPose('laugh'); a.squash(-0.3); snd(['llp-plop', 'pop'], { vol: 0.4, rate: 1.2 }); }
        break;
      case 'head': case 'hop':
        a.scale = e.base * HEAD_SCALE;   // a little bigger: the stars of the last picture
        e.x = F.slot.x; e.y = F.slot.y + e.neckK * a.scale - a.height * 0.16 + (F.state === 'hop' ? 0 : Math.sin(this.t * 3 + e.i) * 3);
        e.headK = F.state === 'hop' ? 1 : Math.min(1, F.t / 0.25);
        a.z = F.state === 'hop' ? F.hz : 0;
        break;
      default: break;
    }
  }

  /**
   * A human in the pile: the stick wades her about inside it (leaves puff up as she goes, B
   * dashes), A (X in the gallery, where A goes on) jumps her right out of the leaves and she
   * plops back in with a leaf splash. Idle, she's a head poking out like everyone else.
   */
  wade(e, dt) {
    const F = e.fin, a = e.a, c = e.p.ctrl, w = PILE_FULL_W, h = pileH(w);
    if (F.u == null) { F.u = (F.slot.x - PILE.x) / (w * 0.5); F.yk = clamp((PILE.y - F.slot.y) / Math.max(1, domeTop(F.u) * h), 0.3, 0.8); }
    const sx = Math.abs(c.x) > 0.2 ? c.x : 0, sy = Math.abs(c.y) > 0.2 ? c.y : 0;
    const d = e.dash.update(dt, c, { x: F.slot.x, y: F.slot.y, actor: a });
    F.u = clamp(F.u + (sx * 0.62 * dt) + d.x / (w * 0.5), -0.8, 0.8);
    F.yk = clamp(F.yk - sy * 0.75 * dt - d.y / h, 0.3, 0.8);
    F.slot.x = PILE.x + F.u * w * 0.5;
    F.slot.y = PILE.y - domeTop(F.u) * h * F.yk;
    if (Math.abs(sx) > 0.15) a.facing = sx > 0 ? 1 : -1;
    const moving = Math.hypot(sx, sy) > 0.2 || d.x || d.y;
    F.puffT = (F.puffT || 0) - dt;
    if (moving && F.state === 'head' && F.puffT <= 0) {
      F.puffT = 0.12;
      this.burst(F.slot.x - a.facing * 30, F.slot.y - 4, 2, { speed: [120, 260], size: [22, 34], life: [0.6, 1] });
      this.pileWob = Math.max(this.pileWob, 0.12);
      if (this.crunchGate <= 0) { this.crunchGate = 0.16; snd(['llp-crunch', 'crumble'], { vol: 0.16, rate: rand(1.2, 1.6) }); }
    }
    const jumpBtn = c.pressed('x') || (!this.api.ended?.() && c.pressed('a'));
    if (F.state === 'head' && jumpBtn && e.headK >= 1) {
      // high enough to clear the leaves: her whole body pops out
      F.state = 'hop'; F.t = 0; F.hz = 0; F.vz = Math.sqrt(2 * 2600 * (a.height * 1.05 + 50));
      a.setPose('jump'); a.squash(-0.25);
      this.burst(F.slot.x, F.slot.y, 10, { speed: [220, 460], size: [26, 42] });
      snd(['llp-boing', 'jump'], { vol: 0.45 });
    }
    if (F.state === 'hop') {
      F.vz -= 2600 * dt; F.hz = Math.max(0, F.hz + F.vz * dt);
      if (F.hz <= 0 && F.vz < 0) {
        F.state = 'head'; F.t = 1; F.vz = 0; a.setPose('laugh'); a.squash(0.3);
        const x = F.slot.x, y = F.slot.y;
        this.burst(x, y, 18, { speed: [260, 560], size: [28, 46], life: [0.9, 1.5] });
        particles.ring(x, y, '#fff2c0', 180, 0.35);
        if (chance(0.5)) particles.popText(x, y - a.height - 40, pick(['Plop!', 'Floomp!', 'Wheee!']), pick(['#ff7a2e', '#ffd23f']), 48);
        this.pileSq = Math.max(this.pileSq, 0.3); this.pileWob = Math.max(this.pileWob, 0.5);
        snd(['llp-plop', 'pop'], { vol: 0.45, rate: rand(1, 1.3) });
        snd(['llp-crunch', 'crumble'], { vol: 0.3 });
        c.rumble?.(0.3, 90);
      }
    }
  }

  cannonball(e) {
    const F = e.fin, pw = F.power;
    F.state = 'in'; F.t = 0; e.rot = 0; e.a.scale = e.base;
    const x = F.slot.x, y = F.slot.y;
    this.burst(x, y, Math.round(22 + pw * 26), { speed: [300, 640 + pw * 260], size: [28, 50], life: [1.1, 1.8] });
    particles.burst(x, y - 20, { type: 'star', count: 8 + Math.round(pw * 6), colors: ['#ffd23f', '#ffffff', '#ff9a2e'], speed: [180, 420] });
    particles.ring(x, y, '#fff2c0', 230 + pw * 120, 0.45);
    particles.popText(x, y - 190 - pw * 30, pick(['SPLOOSH!', 'KER-PLUNK!', 'WHUMP!', 'Wheee!']), pick(['#ff7a2e', '#ffd23f', '#ff5a6a']), Math.round(56 + pw * 18));
    this.pileSq = 0.5 + pw * 0.2; this.pileWob = 0.8;
    fx.shake(6 + pw * 8, 0.25);
    snd(['llp-cannonball', 'splash'], { vol: 0.7 });
    snd(['llp-crunch', 'crumble'], { vol: 0.5 });
    if (!e.p.isAI) e.p.ctrl.rumble(0.5 + pw * 0.2, 160);
    if (this.api.camera && !this.punched) { this.punched = true; this.api.camera.punch(PILE.x, PILE.y - 200, 1.12, 0.4); }
  }

  finish() {
    this.finished = true;
    const stats = this.ents.map((e) => `${e.raked} leaves${e.cheeky ? ' + cheeky jump' : ''}`);
    this.api.finishTogether({ title: 'What a leap!', stats, focus: { x: PILE.x, y: PILE.y - 220 } });
  }

  // ---------------------------------------------------------------- draw
  pop(e, str, color, size) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    particles.popText(e.x + (e.popN % 2 ? 36 : -36), e.y - e.a.height - 40 - (e.popN % 3) * 40, str, color, size);
  }

  draw(g) {
    drawBackground(g);
    // leaves lying on the lawn (flat, under everyone)
    for (const L of this.leaves) if (L.state === 'ground') drawLeaf(g, L.kind, L.x, L.y, L.size, L.rot);
    // Easy: the leafy patch she's walking to
    for (const e of this.ents) {
      const t = e.ez && e.ez._ezErrand && e.ez._ezErrand.target;
      if (!t || this.phase !== 'play') continue;
      g.save(); g.globalAlpha = 0.5 + 0.2 * Math.sin(this.t * 8); g.strokeStyle = e.p.color; g.lineWidth = 5;
      g.beginPath(); g.ellipse(t.x, t.y + 6, 70, 24, 0, 0, TAU); g.stroke(); g.restore();
    }
    // depth sorted: pile, Granny + her pile, ladder, squirrels, players
    const items = [];
    const finale = this.phase !== 'play';
    items.push({ y: PILE.y, fn: () => this.drawBigPile(g) });
    items.push({ y: GP.y, fn: () => drawNeatPile(g, GP.x, GP.y, this.gp.fill, this.gp.sq) });
    items.push({ y: GRANNY.y, fn: () => this.drawGrannyNow(g) });
    if (finale) items.push({ y: LAD.y - 2, fn: () => drawLadder(g, LAD.x, LAD.y, ease.outBack(clamp(this.ladder.k, 0, 1))) });
    for (const s of this.squirrels) if (s.state !== 'in') items.push({ y: s.y, fn: () => this.drawSquirrelNow(g, s) });
    for (const e of this.ents) {
      const F = e.fin;
      if (F && (F.state === 'in' || F.state === 'head' || F.state === 'hop')) continue;   // drawn with the pile
      if (e.jump && e.jump.phase === 'in') { items.push({ y: GP.y + 1, fn: () => this.drawHead(g, e, GP.x, GP.y - 45, 70) }); continue; }
      const y = F && F.state === 'leap' ? PILE.y + 5 : F && (F.state === 'climb' || F.state === 'top') ? LAD.y + 1 : e.y;
      items.push({ y, fn: () => this.drawPlayer(g, e) });
    }
    items.sort((a, b) => a.y - b.y);
    // the closing leaf rain falls behind the pile, so the faces stay clear
    for (const b of this.bits) if (b.rain) drawLeaf(g, b.kind, b.x, b.y, b.size, b.rot, clamp((b.life - b.t) / 0.4, 0, 1));
    for (const it of items) it.fn();
    // leaves in the air
    for (const L of this.leaves) {
      if (L.state === 'fall') drawLeaf(g, L.kind, L.x, L.y - L.z, L.size, L.rot);
      else if ((L.state === 'fly' || L.state === 'kick') && L.t >= 0) drawLeaf(g, L.kind, L.x, L.y, L.size, L.rot);
      else if (L.state === 'fly' || L.state === 'kick') drawLeaf(g, L.kind, L.sx, L.sy, L.size, L.rot);
    }
    for (const b of this.bits) if (!b.rain) drawLeaf(g, b.kind, b.x, b.y, b.size, b.rot, clamp((b.life - b.t) / 0.4, 0, 1));
    // names and the Easy A
    const showTags = (!this.started || this.t - this.startT < 5) && !this.api.ended?.();
    for (const e of this.ents) {
      if (this.phase !== 'play') break;
      if (!showTags && e.p.isAI) continue;
      const top = e.y - e.a.z - e.a.height - 24 - (e.a.emotes.length ? 50 : 0);
      if (!e.jump) ui.playerTag(g, e.p, e.x, top);
      if (e.ez && !e.jump && !easyBusy(e.ez)) {
        if (this.gpReady() && this.nearGP(e)) easyPrompt(g, e.p, { target: { x: GP.x, y: GP.y - 70 }, child: { x: e.x, y: e.y - e.a.height } });
        else if (this.leavesNear(e) > 0 && e.rakeCd <= 0) easyPrompt(g, e.p, { child: { x: e.x, y: e.y - e.a.height }, size: 70 });
      }
    }
    // finale: a big A over each waiting / climbing human (mash for a bigger splash)
    if (this.phase === 'finale') for (const e of this.ents) {
      const F = e.fin;
      if (e.p.isAI || !F || !(F.state === 'wait' || F.state === 'walk' || F.state === 'climb')) continue;
      easyPrompt(g, e.p, { child: { x: e.x, y: e.y - e.a.z - e.a.height }, size: 64 });
    }
  }

  drawBigPile(g) {
    const w = this.pileW;
    // glow while leaves land
    if (this.pileHi > 0.05 && this.phase === 'play') {
      g.save(); g.globalAlpha = this.pileHi * 0.16; g.fillStyle = '#fff2b0';
      g.beginPath(); g.ellipse(PILE.x, PILE.y - pileH(w) * 0.45, w * 0.56, pileH(w) * 0.62, 0, 0, TAU); g.fill(); g.restore();
    }
    drawPile(g, PILE.x, PILE.y, w, this.shown, this.pileSq, this.pileWob);
    // heads poking out (back row first)
    const heads = this.ents.filter((e) => e.fin && (e.fin.state === 'head' || e.fin.state === 'hop')).sort((a, b) => a.fin.slot.y - b.fin.slot.y);
    for (const e of heads) this.drawHead(g, e, e.fin.slot.x, e.fin.slot.y, 90);
    // squirrel tail poking out while it's in the pile
    for (const s of this.squirrels) if (s.state === 'in') {
      g.save(); g.translate(PILE.x + Math.sin(s.t * 20) * 30, PILE.y - pileH(w) * 0.5);
      g.rotate(Math.sin(s.t * 14) * 0.4); g.fillStyle = '#c8662e'; g.strokeStyle = NAVY; g.lineWidth = 3.5;
      g.beginPath(); g.ellipse(0, -20, 14, 30, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
    }
  }

  /** A head (and a little neck) poking out of the leaves at surface (x, y). */
  drawHead(g, e, x, y, collarW) {
    const a = e.a, k = ease.outBack(clamp(e.headK, 0, 1));
    if (k <= 0) return;
    g.save();
    g.globalAlpha = 0.45 * Math.min(1, k); g.fillStyle = '#6a2a12';   // the hole she popped out of
    g.beginPath(); g.ellipse(x, y + 2, collarW * 0.55, 14, 0, 0, TAU); g.fill();
    g.restore();
    g.save();
    g.beginPath(); g.rect(x - 260, y - 900, 520, 906); g.clip();   // (tall: a jump out clears the leaves)
    g.translate(0, (1 - k) * 80);
    a.draw(g, { shadow: false });
    g.restore();
    drawCollar(g, x, y, collarW, e.i * 3 + 1, this.t);
  }

  drawPlayer(g, e) {
    const a = e.a;
    // the neck depth for heads poking out (measured from the art, standing up)
    if (!e.jump && (!e.fin || e.fin.state === 'walk' || e.fin.state === 'wait')) { const nk = a.anchor('neck'); const d = a.y - a.z - nk.y; if (d > 10) e.neckK = d / a.scale; }
    const spin = e.rot && (e.jump || (e.fin && e.fin.state === 'leap'));
    if (spin) {
      // tuck tumble: spun in the plane round the middle of the body
      const cy = a.y - a.z - a.height * 0.5;
      g.save(); g.globalAlpha = 0.2; g.fillStyle = '#1b1030';
      g.beginPath(); g.ellipse(a.x, e.jump ? e.y : PILE.y - 20, 40, 10, 0, 0, TAU); g.fill(); g.restore();
      g.save(); g.translate(a.x, cy); g.rotate(e.rot); g.translate(-a.x, -cy);
      a.draw(g, { shadow: false });
      g.restore();
      return;
    }
    const F = e.fin;
    a.draw(g, { ring: this.phase === 'play' ? e.p.color : null, shadow: !(F && (F.state === 'climb' || F.state === 'top')) });
  }

  drawHeld(g, info, e) {
    if (e.jump || e.fin || e.a.z > 2) return;
    const h = info.h, hand = info.hand;
    const s = e.sweep, k = s > 0 ? Math.sin((1 - s) * Math.PI) : 0;   // out and back in one stroke
    const hx = h * (0.5 + 0.32 * k), hy = -6 - k * 10;
    drawRake(g, hand.x, hand.y, hx, hy);
  }

  drawGrannyNow(g) {
    const G = this.granny;
    const top = drawGranny(g, GRANNY.x, GRANNY.y, G.state, G.facing, this.t, G.bob);
    const hx = GRANNY.x + G.facing * 40, hy = top + 60;
    if (G.state === 'doze') {
      for (let i = 0; i < 3; i++) {
        const k = ((this.t * 0.6 + i / 3) % 1);
        g.save(); g.globalAlpha = 1 - k;
        ui.text(g, 'z', hx + 30 + k * 40, hy - 30 - k * 70, { size: 26 + k * 18, color: '#ffffff', weight: 800, stroke: NAVY });
        g.restore();
      }
    }
    if (G.state === 'gasp') drawShock(g, hx, hy, 70, this.t, G.k);
    if (G.state === 'huff') drawSteam(g, hx, top - 6, 60, this.t);
    if (G.say && G.sayT < 1.6) drawShout(g, G.say, GRANNY.x - 60, top - 34, 38, G.sayT, Math.min(1, G.sayT * 6));
  }

  drawSquirrelNow(g, s) {
    g.save();
    g.globalAlpha = 0.2; g.fillStyle = '#1b1030'; g.beginPath(); g.ellipse(s.x, s.y, 40, 9, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.translate(s.x, s.y - s.z); g.scale(s.dir, 1);
    drawSquirrel(g, s.state === 'scared' ? 2 : s.f, this.t);
    g.restore();
  }

  drawHUD(g) {
    if (this.api.ended?.()) return;
    if (this.phase === 'play') ui.scoreboard(g, this.players, this.ents.map((e) => e.raked), { y: 14, avoidCenter: true, format: (v) => v });
    // the shared pile meter under the clock
    if (this.phase === 'play') {
      const cx = W / 2, cy = 150, w = 380;
      ui.panel(g, cx - w / 2 - 50, cy - 30, w + 100, 60, { r: 30, fill: '#ffffff' });
      drawLeaf(g, 5, cx - w / 2 - 18, cy, 40, -0.3);
      ui.bar(g, cx - w / 2 + 14, cy - 13, w, 26, this.shown, '#ff8a2a');
      for (let i = 1; i < 4; i++) { const x = cx - w / 2 + 14 + w * i / 4; g.fillStyle = NAVY; g.globalAlpha = 0.35; g.fillRect(x - 1.5, cy - 13, 3, 26); g.globalAlpha = 1; }
      drawLeaf(g, 9, cx + w / 2 + 34, cy - 2, 34 + Math.sin(this.t * 4) * 3, 0.3);
    }
    const el = this.startT === undefined ? 0 : this.t - this.startT;
    if (el < 6 && this.phase === 'play' && this.players.some((p) => !p.isAI)) {
      g.save(); g.globalAlpha = clamp(6 - el, 0, 1);
      ui.text(g, this.easy ? 'Press A to rake the leaves onto the big pile!' : 'Run to the leaves and press A to rake!', W / 2, H - 60, { size: 40, color: '#ffffff', weight: 800, stroke: NAVY });
      g.restore();
    }
    const wading = this.ents.some((e) => !e.p.isAI && e.fin && (e.fin.state === 'head' || e.fin.state === 'hop'));
    if (wading && this.phase !== 'play') ui.hints(g, [['stick', 'Wade'], ['a', 'Jump out!']], W / 2, H - 60, { size: 38 });
    else if (this.phase === 'finale' && this.ft > 1.6 && this.ft < 6 && this.players.some((p) => !p.isAI)) {
      ui.text(g, 'Press A lots for a GIANT splash!', W / 2, H - 60, { size: 44, color: '#ffffff', weight: 800, stroke: NAVY });
    }
    if (this.banner) {
      const b = this.banner;
      g.save(); g.globalAlpha = clamp(Math.min(b.t * 4, (b.d - b.t) * 3), 0, 1);
      ui.banner(g, b.text, b.t, { y: 830, size: 110, color: '#ffffff' });
      g.restore();
    }
  }
}
