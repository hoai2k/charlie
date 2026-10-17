// Piñata Party - a backyard birthday. Big crepe-paper piñatas swing on ropes;
// run underneath and press A to swing your padded party bat. Each hit cracks
// it and shakes out candy, the final hit bursts it (+5 bonus, slow-mo, candy
// shower) and everyone scrambles to grab the sweets. Three piñatas (two at a
// time with 6+ players), most candy wins. Swinging into a friend just makes
// them dizzy for a moment.
//
// Art hooks (procedural fallbacks ship today): bg/pinata-party,
//   prop/pinata-star|unicorn|llama|donkey, prop/party-bat,
//   prop/candy-wrapped|lollipop|golden (see image-requests-history.md).
// New-pose hook: 'swing' -> action.
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { clamp, lerp, damp, approach, rand, pick, chance, shuffle, TAU, ease, placementsFromScores } from '../engine/util.js';
import {
  NAVY, PINATAS, PINATA_KINDS, CANDY_R, BAR_Y, makeCracks, drawPinata, drawCandy, drawBat, buildBackground, drawIconArt,
} from './pinata-party/draw.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const NEW_POSE_FALLBACK = { swing: 'action' };
const poseName = (n) => (POSE_NAMES.includes(n) ? n : NEW_POSE_FALLBACK[n] || 'idle');

// --- tuning --------------------------------------------------------------------
const DURATION = 50;
const ARENA = { x0: 100, y0: 455, x1: 1820, y1: 1035 };
const REST_Y = 735;                 // where a piñata hangs at rest (its ground point)
const WALK = 390;
const DASH_T = 0.16, DASH_SPEED = 980, DASH_CD = 0.8;   // B: a quick burst (great for the candy scramble)
const SWING_T = 0.36, HIT_FROM = 0.09, HIT_TO = 0.22, SWING_CD = 0.5;
const SWEET = 0.45;                 // inside this fraction of your reach = CRACK! (2 damage)
const DIZZY_T = 0.95, IMMUNE_T = 2.4;
const GRAV = 1900;
const VALUE = { sweet: 1, pop: 2, gold: 5 };
const BURST_BONUS = 5;
const CANDY_LIFE = 9;
const SCRAMBLE = 5.5;               // seconds between a burst and the next piñata
const PS = 0.86;                    // piñata draw scale at size 1
const ROUNDS = 3;

export const meta = {
  id: 'pinata-party',
  title: 'Piñata Party',
  category: 'party',
  type: 'Free-for-all',
  goal: 'Whack the swinging piñatas, then grab the most candy!',
  controls: [['stick', 'Run around the yard'], ['a', 'Swing your party bat (X works too)'], ['b', 'Dash!']],
  tips: [
    'Swing when the piñata is over your ring - right in the middle is a big CRACK!',
    'The hit that bursts it open gets +5 and a candy shower!',
    'Golden candy is worth 5. Bonking a friend just makes them dizzy.',
  ],
  music: 'party',
  duration: '50 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    const th = art('thumb/pinata-party');
    if (th) { g.drawImage(th, x, y, w, h); return; }
    drawIconArt(g, x, y, w, h, t);
  },
};

let serial = 0;

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.over = false;
    this.scale = n <= 3 ? 0.98 : n <= 4 ? 0.92 : n <= 6 ? 0.82 : 0.75;
    this.twin = n >= 6;
    this.units = this.players.map((p, i) => this.makeUnit(p, i));
    this.pinatas = [];
    this.candies = [];
    this.round = -1;
    this.nextRoundAt = null;
    this.lastBurst = -99;
    this.firstBurstT = -1;
    this.bannerMsg = null;
    this.bounceAt = -1;
    this.kindBag = [];
    this.bg = null;
    this.startRound(0, true);
  }

  makeUnit(p, i) {
    const n = this.n;
    const cols = n <= 4 ? n : Math.ceil(n / 2);
    const row = n <= 4 ? 0 : Math.floor(i / cols), col = n <= 4 ? i : i % cols;
    // with two rows the back row sits half a column over, so nobody hides behind the player in front
    const x = cols === 1 ? W / 2 - 260 : row === 0 && n <= 4 ? lerp(330, W - 330, col / (cols - 1)) : lerp(330, W - 330, (col + row * 0.5) / (cols - 0.5));
    const y = 905 + row * 80 - (cols > 1 && col % 2 ? 26 : 0);
    const a = new Actor(p, { scale: this.scale, x, y });
    a.facing = x < W / 2 ? 1 : -1; a.snap();
    const U = {
      p, i, a, x, y, vx: 0, vy: 0, swingT: -1, swingCd: 0, dashT: 0, dashCd: 0, dashA: 0, hitIds: new Set(), hitAny: false, whiffChecked: false,
      dizzy: 0, immune: 0, spinT: 0, score: 0, streak: 0, streakT: 0, brain: new Brain(p), goal: null, seen: null,
      checkT: 0, popN: 0, popT: 0, offA: i * 2.39 + rand(0.5),
    };
    // the bat rests over the shoulder behind the head and comes round in front for the hit
    a.attach((g, info) => this.drawBatAttach(g, info, U, true), { behind: true });
    a.attach((g, info) => this.drawBatAttach(g, info, U, false));
    return U;
  }

  ds(y) { return depthScale(y, { top: ARENA.y0, near: ARENA.y1, far: 0.84, nearScale: 1.05 }); }

  // --- rounds ----------------------------------------------------------------------
  pickKind() {
    if (!this.kindBag.length) this.kindBag = shuffle(PINATA_KINDS.slice());
    return this.kindBag.pop();
  }

  startRound(r, first = false) {
    this.round = r; this.nextRoundAt = null; this.roundT = this.t;
    const bonus = r >= ROUNDS, mega = r === ROUNDS - 1;
    const count = this.twin && !bonus ? 2 : 1;
    const per = count === 2 ? Math.ceil(this.n / 2) : this.n;
    const xs = count === 2 ? [650, 1270] : [W / 2];
    const latest = bonus ? DURATION - 3.5 : DURATION - SCRAMBLE - (ROUNDS - 1 - r) * 16.5;
    const deadline = Math.min(this.t + (first ? 0 : 1.1) + 12.5, latest);
    const hp = Math.max(4, Math.round((1.5 + 3.6 * per) * (mega ? 1.3 : 1) * (bonus ? 0.45 : 1)));
    let firstKind = null;
    for (let k = 0; k < count; k++) {
      let kind = this.pickKind();
      if (kind === firstKind) kind = this.pickKind();
      firstKind = firstKind || kind;
      const def = PINATAS[kind];
      this.pinatas.push({
        id: serial++, kind, mega, bonus, ax: xs[k], ay: REST_Y + (count === 2 ? (k ? 30 : -30) : 0),
        u: 0, v: 0, vu: 0, vv: 0,
        Au: count === 2 ? 200 : this.n <= 2 ? 260 : 300, Av: count === 2 ? 55 : 65,
        wu: 1.35 * (mega ? 1.12 : 1) * (count === 2 ? 1.1 : 1), wv: 1.35 * 1.37 * (mega ? 1.1 : 1),
        size: mega ? 1.2 : bonus ? 0.8 : count === 2 ? 0.88 : 1,
        hp, maxHp: hp, state: first ? 'hang' : 'drop', dropT: 0, pushed: !first,
        rot: 0, vrot: 0, sq: 0, vsq: 0, spin: 0, vspin: 0, giggle: 0, hitT: -9,
        cracks: makeCracks(rand(1000), def.core), tired: false, deadline, burstT: 0,
        facing: k === 1 ? -1 : chance(0.5) ? 1 : -1, lastHit: -1, leakT: 0,
      });
    }
    if (!first) {
      snd('pinata-rope', 'whoosh', { vol: 0.6 });
      const name = PINATAS[firstKind].name;
      this.banner(bonus ? 'Bonus Piñata!' : mega ? `MEGA ${count === 2 ? '' : name + ' '}Piñata!` : count === 2 ? 'Two more piñatas!' : `${name} Piñata!`,
        mega ? '#ffd23f' : bonus ? '#7fe3ff' : '#ff9ad5');
    }
  }

  banner(text, color) { this.bannerMsg = { text, color, t0: this.t }; }

  roundLogic() {
    for (const P of this.pinatas) {
      if (P.state !== 'hang') continue;
      if (!P.tired && this.t >= P.deadline) {
        P.tired = true; P.hp = Math.min(P.hp, 1);
        const c = this.pinataCenter(P);
        particles.popText(c.x, c.y - 110 * P.size, 'One more hit!', '#ffd23f', 46);
        sfx('drumroll', { vol: 0.5 });
      }
      if (P.tired && this.t >= P.deadline + 1.6) this.burstPinata(P, null);
    }
    const live = this.pinatas.filter((P) => P.state === 'hang' || P.state === 'drop');
    if (!live.length && this.nextRoundAt === null && !this.over) {
      const next = this.round + 1;
      if (next < ROUNDS) this.nextRoundAt = this.lastBurst + SCRAMBLE;
      else if (DURATION - this.t >= 12) this.nextRoundAt = this.lastBurst + 4.5;
      else this.nextRoundAt = Infinity;
    }
    if (this.nextRoundAt !== null && this.t >= this.nextRoundAt && DURATION - this.t > 6) this.startRound(this.round + 1);
  }

  // --- frame -------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    for (const P of this.pinatas) {
      P.u = Math.sin(this.t0 * 1.3) * 18; this.springs(P, dt);
    }
    for (const U of this.units) { U.a.setPose('idle'); U.a.x = U.x; U.a.y = U.y; U.a.scale = this.scale * this.ds(U.y); U.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    this.roundLogic();
    for (const P of this.pinatas) this.updatePinata(P, dt);
    this.pinatas = this.pinatas.filter((P) => P.state !== 'gone');
    for (const U of this.units) {
      if (U.p.isAI && !this.over) this.aiThink(U, dt);
      this.updateUnit(U, dt);
    }
    this.collide();
    this.updateCandies(dt);
    for (const U of this.units) U.a.update(dt);
    if (this.t >= DURATION && !this.over) this.endGame();
  }

  postUpdate(dt) {
    this.t += dt * 0.5;
    for (const P of this.pinatas) this.updatePinata(P, dt);
    this.pinatas = this.pinatas.filter((P) => P.state !== 'gone');
    for (const U of this.units) { U.vx = damp(U.vx, 0, 10, dt); U.vy = damp(U.vy, 0, 10, dt); if (U.swingT >= 0) { U.swingT += dt; if (U.swingT > SWING_T) U.swingT = -1; } U.a.update(dt); }
    this.updateCandies(dt, true);
  }

  // --- piñatas -------------------------------------------------------------------------
  gx(P) { return P.ax + P.u; }
  gy(P) { return P.ay + P.v; }
  /** Height of the body centre above its ground point. */
  pz(P) {
    const base = (this.scale * 165 + 112 * P.size) * this.ds(this.gy(P)) + Math.sin(this.t * 2.2 + P.id) * 7;
    if (P.state === 'drop') return base + (1 - ease.outBounce(clamp(P.dropT / 1.1, 0, 1))) * 820;
    return base;
  }
  pinataCenter(P) { return { x: this.gx(P), y: this.gy(P) - this.pz(P) }; }
  /** The rope runs over a little pulley that slides along the crossbar after the piñata. */
  topX(P) { return clamp(P.ax + P.u * 0.8, 90, W - 90); }

  springs(P, dt) {
    P.vrot += (-P.rot * 55 - P.vrot * 5) * dt; P.rot += P.vrot * dt;
    P.vsq += (-P.sq * 230 - P.vsq * 11) * dt; P.sq += P.vsq * dt;
    P.vspin += -Math.sin(P.spin) * 9 * dt; P.vspin *= Math.exp(-1.8 * dt); P.spin += P.vspin * dt;
    P.giggle -= dt;
  }

  updatePinata(P, dt) {
    this.springs(P, dt);
    if (P.state === 'burst') { P.burstT += dt; if (P.burstT > 1.4) P.state = 'gone'; return; }
    if (P.state === 'drop') {
      const before = P.dropT;
      P.dropT += dt;
      if (before < 0.38 && P.dropT >= 0.38) { P.vsq += 6; sfx('bounce', { vol: 0.5 }); }
      if (P.dropT >= 1.1) { P.state = 'hang'; P.vu = (chance(0.5) ? 1 : -1) * P.Au * P.wu * 0.7; P.vv = rand(-1, 1) * P.Av * P.wv * 0.5; }
      return;
    }
    if (!P.pushed) { P.pushed = true; P.vu = (chance(0.5) ? 1 : -1) * P.Au * P.wu * 0.75; P.vv = P.Av * P.wv * 0.4; }
    // a pendulum on the ground plane, kept swinging by a gentle "helper"
    P.vu += -P.wu * P.wu * P.u * dt; P.vv += -P.wv * P.wv * P.v * dt;
    for (const [pos, vel, w, A] of [['u', 'vu', P.wu, P.Au], ['v', 'vv', P.wv, P.Av]]) {
      const amp = Math.hypot(P[pos], P[vel] / w);
      if (amp < A) P[vel] += (Math.sign(P[vel]) || 1) * 300 * (1 - amp / A) * dt;
      else if (amp > A * 1.25) P[vel] *= Math.exp(-1.4 * dt);
    }
    P.u += P.vu * dt; P.v += P.vv * dt;
    const gx = this.gx(P), gy = this.gy(P);
    if (gx < ARENA.x0 + 80) { P.u = ARENA.x0 + 80 - P.ax; P.vu = Math.abs(P.vu) * 0.5; }
    if (gx > ARENA.x1 - 80) { P.u = ARENA.x1 - 80 - P.ax; P.vu = -Math.abs(P.vu) * 0.5; }
    if (gy < ARENA.y0 + 90) { P.v = ARENA.y0 + 90 - P.ay; P.vv = Math.abs(P.vv) * 0.5; }
    if (gy > ARENA.y1 - 110) { P.v = ARENA.y1 - 110 - P.ay; P.vv = -Math.abs(P.vv) * 0.5; }
    // nearly broken: leaks confetti
    if (P.hp / P.maxHp < 0.45 || P.tired) {
      P.leakT -= dt;
      if (P.leakT <= 0) {
        P.leakT = rand(0.08, 0.2);
        const c = this.pinataCenter(P);
        particles.burst(c.x + rand(-40, 40) * P.size, c.y + rand(0, 40) * P.size, { type: 'confetti', count: 1, colors: PINATAS[P.kind].bands.concat(RAINBOW), speed: [20, 80], gravity: 300 });
      }
    }
  }

  hitPinata(U, P, sweet) {
    const def = PINATAS[P.kind];
    const dmg = P.tired ? P.hp : sweet ? 2 : 1;
    P.hp = Math.max(0, P.hp - dmg);
    P.hitT = this.t; P.giggle = 0.45; P.hits = (P.hits || 0) + 1; P.lastHit = U.i;
    const f = U.a.facing;
    P.vu += f * rand(170, 250) * (sweet ? 1.35 : 1); P.vv += rand(-110, 110);
    P.vrot += f * (sweet ? 7 : 4.5); P.vsq += sweet ? 7 : 4.5; P.vspin += (chance(0.5) ? 1 : -1) * (sweet ? 5 : 3);
    const c = this.pinataCenter(P);
    const cols = def.bands.concat(RAINBOW);
    particles.burst(c.x, c.y, { type: 'confetti', count: sweet ? 22 : 12, colors: cols, speed: [150, 430] });
    particles.burst(c.x, c.y, { type: 'shard', count: sweet ? 8 : 4, colors: def.bands, speed: [120, 320] });
    if (sweet) {
      particles.burst(c.x, c.y, { type: 'star', count: 8, colors: ['#ffd23f', '#fff6a8', '#fff'], speed: [200, 480] });
      particles.ring(c.x, c.y, '#ffffff', 150 * P.size, 0.35);
      particles.popText(c.x + rand(-30, 30), c.y - 110 * P.size, 'CRACK!', '#ffd23f', 64);
      snd('pinata-crack', 'crack'); sfx('hit', { vol: 0.6 });
      fx.hitstop(0.07); fx.shake(this.n > 4 ? 6 : 9, 0.2);
    } else {
      particles.popText(c.x + rand(-30, 30), c.y - 100 * P.size, 'Bonk!', '#ffffff', 46);
      snd('pinata-whack', 'hit');
      fx.hitstop(0.035); fx.shake(4, 0.12);
    }
    U.a.squash(0.25);
    if (!U.p.isAI) U.p.ctrl.rumble(sweet ? 0.6 : 0.35, sweet ? 160 : 100);
    if (P.hp <= 0) { this.burstPinata(P, U); return; }
    for (let k = 0; k < (sweet ? 2 : 1); k++) {
      this.spawnCandy(chance(0.2) ? 'pop' : 'sweet', this.gx(P), this.gy(P), this.pz(P) - 30, rand(110, 300), rand(150, 420), f);
    }
  }

  burstPinata(P, U) {
    if (P.state !== 'hang') return;
    P.state = 'burst'; P.burstT = 0; P.hp = 0;
    const def = PINATAS[P.kind];
    const c = this.pinataCenter(P);
    P.burstAt = { x: c.x, y: c.y }; P.burstTop = this.topX(P);
    const cols = def.bands.concat(RAINBOW);
    if (U) {
      U.score += BURST_BONUS;
      this.pop(U, `+${BURST_BONUS} Bonus!`, '#ffd23f', 58);
      U.a.playOnce('cheer', 0.9); U.a.emote('star', 1.4); voice(U.p.charId, 'yay');
      if (!U.p.isAI) U.p.ctrl.rumble(1, 320);
    }
    fx.slowmo(0.3, 0.75); fx.flash('#fff8d6', 0.22); fx.shake(16, 0.45);
    if (this.api.camera) this.api.camera.punch(c.x, c.y + 90, 1.22, 0.55);
    particles.burst(c.x, c.y, { type: 'confetti', count: 70, colors: cols, speed: [250, 820] });
    particles.burst(c.x, c.y, { type: 'shard', count: 26, colors: def.bands, speed: [200, 620], size: [12, 26] });
    particles.burst(c.x, c.y, { type: 'star', count: 12, colors: ['#ffd23f', '#fff6a8', '#ffffff'], speed: [250, 600] });
    particles.ring(c.x, c.y, '#ffffff', 300 * P.size, 0.5); particles.ring(c.x, c.y, '#ffd23f', 220 * P.size, 0.4);
    snd('pinata-burst', 'bigpop'); sfx('boom', { vol: 0.45 }); sfx('cheer', { vol: 0.6 });
    // candy shower
    const per = this.twin ? Math.ceil(this.n / 2) : this.n;
    const count = Math.round((10 + 3.2 * per) * (P.mega ? 1.35 : 1) * (P.bonus ? 0.6 : 1));
    const golds = P.mega ? 3 : P.bonus ? 1 : per >= 3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const kind = i < golds ? 'gold' : chance(0.28) ? 'pop' : 'sweet';
      this.spawnCandy(kind, this.gx(P), this.gy(P), this.pz(P), rand(130, 640), rand(450, 980), 0);
    }
    if (this.firstBurstT < 0) this.firstBurstT = this.t;
    this.lastBurst = this.t;
    this.banner('Candy Scramble!', '#ff6fb1');
    for (const O of this.units) {
      if (O === U || O.dizzy > 0) continue;
      O.a.emote('exclaim', 0.7);
      if (Math.hypot(O.x - this.gx(P), O.y - this.gy(P)) < 400) O.a.playOnce('cheer', 0.5);
    }
  }

  // --- candy ---------------------------------------------------------------------------
  spawnCandy(kind, x, y, z, sp, vz, bias) {
    const a = bias ? (bias > 0 ? 0 : Math.PI) + rand(-1.3, 1.3) : rand(TAU);
    this.candies.push({
      id: serial++, kind, v: Math.floor(rand(5)), x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz,
      state: 'air', grace: 0.3, life: CANDY_LIFE, rot: rand(TAU), vrot: rand(-9, 9), sq: 0, age: 0,
    });
  }

  candyLanding(c) {
    if (c.state !== 'air') return { x: c.x, y: c.y };
    const T = (c.vz + Math.sqrt(Math.max(0, c.vz * c.vz + 2 * GRAV * c.z))) / GRAV;
    return { x: clamp(c.x + c.vx * T, ARENA.x0 + 20, ARENA.x1 - 20), y: clamp(c.y + c.vy * T, ARENA.y0 + 10, ARENA.y1 - 10) };
  }

  updateCandies(dt, frozen = false) {
    for (const c of this.candies) {
      c.age += dt; c.grace -= dt; c.sq = approach(c.sq, 0, dt * 2.5);
      if (c.state === 'air') {
        c.vz -= GRAV * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rot += c.vrot * dt;
        if (c.x < ARENA.x0 + 20) { c.x = ARENA.x0 + 20; c.vx = Math.abs(c.vx) * 0.6; }
        if (c.x > ARENA.x1 - 20) { c.x = ARENA.x1 - 20; c.vx = -Math.abs(c.vx) * 0.6; }
        if (c.y < ARENA.y0 + 10) { c.y = ARENA.y0 + 10; c.vy = Math.abs(c.vy) * 0.6; }
        if (c.y > ARENA.y1 - 10) { c.y = ARENA.y1 - 10; c.vy = -Math.abs(c.vy) * 0.6; }
        if (c.z <= 0 && c.vz < 0) {
          c.z = 0;
          if (-c.vz > 260) {
            c.vz = -c.vz * 0.48; c.vx *= 0.72; c.vy *= 0.72; c.sq = 0.35; c.vrot *= 0.6;
            if (this.t - this.bounceAt > 0.09) { this.bounceAt = this.t; snd('pinata-candy-bounce', 'rubber-bounce', { vol: 0.3, rate: rand(0.95, 1.25) }); }
            if (chance(0.5)) particles.burst(c.x, c.y, { type: 'dust', count: 2, color: '#ffffff', speed: [20, 70], size: [6, 12] });
          } else { c.state = 'rest'; c.vz = 0; c.sq = 0.3; c.life = CANDY_LIFE; }
        }
      } else if (c.state === 'rest') {
        c.vx = damp(c.vx, 0, 5, dt); c.vy = damp(c.vy, 0, 5, dt); c.vrot = damp(c.vrot, 0, 5, dt);
        c.x = clamp(c.x + c.vx * dt, ARENA.x0 + 20, ARENA.x1 - 20); c.y = clamp(c.y + c.vy * dt, ARENA.y0 + 10, ARENA.y1 - 10); c.rot += c.vrot * dt;
        c.life -= dt;
        if (c.life <= 0) { c.state = 'dead'; particles.burst(c.x, c.y - 14, { type: 'sparkle', count: 4, colors: ['#ffffff', '#fff6a8'], size: [8, 14] }); }
      }
      if (c.kind === 'gold' && c.state !== 'dead' && Math.random() < dt * 10) particles.burst(c.x + rand(-14, 14), c.y - c.z - 20, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffd23f'], size: [8, 16], speed: [10, 40] });
    }
    if (!frozen && !this.over) {
      for (const c of this.candies) {
        if (c.state === 'dead' || c.grace > 0 || c.z > 60) continue;
        let best = null, bf = 1;
        for (const U of this.units) {
          if (U.dizzy > 0) continue;
          const R = (34 + 24 * this.scale) * this.ds(U.y) + CANDY_R[c.kind] * 0.6;
          const f = Math.hypot((c.x - U.x) / R, (c.y - U.y) / (R * 0.6));
          if (f < bf) { bf = f; best = U; }
        }
        if (best) this.collect(best, c);
      }
    }
    this.candies = this.candies.filter((c) => c.state !== 'dead');
  }

  collect(U, c) {
    c.state = 'dead';
    const val = VALUE[c.kind];
    U.score += val;
    U.streak = U.streakT > 0 ? U.streak + 1 : 1; U.streakT = 1.4;
    const a = U.a;
    a.squash(0.22);
    if (c.kind === 'gold') {
      this.pop(U, '+5', '#ffd23f', 66);
      sfx('golden-chime', { fallback: 'star' }); sfx('sparkle');
      particles.burst(U.x, U.y - a.height * 0.6, { type: 'star', count: 12, colors: ['#ffd23f', '#fff6a8', '#fff'] });
      a.playOnce('cheer', 0.5); a.emote('sparkle', 1.1); voice(U.p.charId, 'woo');
      fx.flash('#fff3b0', 0.1);
      if (!U.p.isAI) U.p.ctrl.rumble(0.5, 140);
    } else {
      this.pop(U, '+' + val, c.kind === 'pop' ? '#7fe3ff' : '#ffffff', c.kind === 'pop' ? 52 : 44);
      sfx('collect', { step: Math.min(U.streak - 1, 12) });
      particles.burst(c.x, c.y - 20, { type: 'spark', count: 6, colors: RAINBOW, speed: [100, 240] });
      if (U.streak === 5 || U.streak === 10) { a.emote('heart', 0.8); if (!U.p.isAI) U.p.ctrl.rumble(0.25, 70); }
    }
  }

  pop(U, str, color, size) {
    U.popN = U.popT > 0 ? U.popN + 1 : 0; U.popT = 0.7;
    const lvl = U.popN % 3;
    particles.popText(U.x + (lvl === 1 ? 36 : lvl === 2 ? -36 : 0), U.y - U.a.height - 24 - lvl * 46, str, color, size);
  }

  // --- players -------------------------------------------------------------------------
  reach(U) { const rx = (80 + 50 * this.scale) * this.ds(U.y); return { rx, ry: rx * 0.6 }; }
  reachF(U, x, y) {
    const { rx, ry } = this.reach(U);
    return Math.hypot((x - (U.x + U.a.facing * 12)) / rx, (y - U.y) / ry);
  }

  startSwing(U) {
    U.swingT = 0; U.swingCd = SWING_CD; U.hitIds.clear(); U.hitAny = false; U.whiffChecked = false;
    let best = null, bd = 2.4;
    for (const P of this.pinatas) {
      if (P.state !== 'hang') continue;
      const f = this.reachF(U, this.gx(P), this.gy(P));
      if (f < bd) { bd = f; best = P; }
    }
    if (best) { const dx = this.gx(best) - U.x; if (Math.abs(dx) > 14) U.a.facing = Math.sign(dx); }
    U.a.playOnce(poseName('swing'), SWING_T); U.a.squash(-0.15);
    // The 2-frame 'swing' art (backswing, follow-through) splits the one-shot in half; start
    // partway in so the follow-through frame arrives as the bat sweeps forward (just after
    // HIT_FROM) instead of the bat crossing the face from the backswing hands.
    U.a.poseTime = Math.max(0, SWING_T / 2 - (HIT_FROM + 0.02));
    snd('pinata-swish', 'whoosh', { vol: 0.4, rate: rand(0.95, 1.1) });
  }

  updateUnit(U, dt) {
    const p = U.p, a = U.a;
    U.swingCd = Math.max(0, U.swingCd - dt); U.immune = Math.max(0, U.immune - dt);
    U.streakT = Math.max(0, U.streakT - dt); U.popT = Math.max(0, U.popT - dt);
    if (U.dizzy > 0) { U.dizzy -= dt; U.spinT += dt; if (U.spinT < 0.6 && Math.floor(U.spinT * 10) !== Math.floor((U.spinT - dt) * 10)) a.facing = -a.facing; }
    let mx = this.over ? 0 : p.ctrl.x, my = this.over ? 0 : p.ctrl.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    if (U.dizzy > 0) { mx = my = 0; }
    if (!this.over && (p.ctrl.pressed('a') || p.ctrl.pressed('x')) && U.swingCd <= 0 && U.dizzy <= 0) this.startSwing(U);
    U.dashCd = Math.max(0, U.dashCd - dt); U.dashT = Math.max(0, U.dashT - dt);
    if (!this.over && p.ctrl.pressed('b') && U.dashCd <= 0 && U.dizzy <= 0 && U.swingT < 0) {
      U.dashT = DASH_T; U.dashCd = DASH_CD;
      U.dashA = mag > 0.2 ? Math.atan2(my, mx) : (a.facing > 0 ? 0 : Math.PI);
      a.playOnce('dash', 0.3); a.squash(0.25); sfx('dash', { vol: p.isAI ? 0.25 : 0.6 });
      particles.burst(U.x, U.y - 8, { type: 'dust', count: 6, angle: U.dashA + Math.PI, spread: 0.5, speed: [100, 240] });
    }
    const speed = WALK * (U.swingT >= 0 ? 0.55 : 1) * (0.9 + 0.1 * this.ds(U.y));
    if (U.dashT > 0) { U.vx = Math.cos(U.dashA) * DASH_SPEED; U.vy = Math.sin(U.dashA) * DASH_SPEED * 0.8; }
    else { U.vx = damp(U.vx, mx * speed, 12, dt); U.vy = damp(U.vy, my * speed * 0.8, 12, dt); }
    U.x += U.vx * dt; U.y += U.vy * dt;
    if (U.swingT >= 0) {
      U.swingT += dt;
      if (U.swingT >= HIT_FROM && U.swingT <= HIT_TO + 0.02) this.swingHits(U);
      if (U.swingT > HIT_TO && !U.whiffChecked) { U.whiffChecked = true; if (!U.hitAny) this.swingBonks(U); }
      if (U.swingT > SWING_T) U.swingT = -1;
    }
    if (U.dizzy > 0) { if (!a._once) a.setPose('dizzy'); }
    else {
      if (a.pose === 'dizzy' && !a._once) a.setPose('idle');
      if (U.swingT < 0) a.moveAnim(U.vx, U.vy, WALK, { run: Math.hypot(U.vx, U.vy) > WALK * 0.85 });
    }
    a.x = U.x; a.y = U.y;
    a.scale = this.scale * this.ds(U.y);
  }

  swingHits(U) {
    for (const P of this.pinatas) {
      if (P.state !== 'hang' || U.hitIds.has(P.id)) continue;
      const f = this.reachF(U, this.gx(P), this.gy(P));
      if (f < 1) { U.hitIds.add(P.id); U.hitAny = true; this.hitPinata(U, P, f < SWEET); }
    }
  }

  /** A swing that missed the piñata can bonk a friend standing in front: they get dizzy (no candy lost). */
  swingBonks(U) {
    const { rx, ry } = this.reach(U);
    for (const O of this.units) {
      if (O === U || O.immune > 0 || O.dizzy > 0) continue;
      const dx = O.x - U.x;
      if (dx * U.a.facing < -15) continue;
      if (Math.hypot(dx / (rx * 0.95), (O.y - U.y) / (ry * 1.1)) < 1) this.bonk(U, O);
    }
  }

  bonk(U, O) {
    O.dizzy = DIZZY_T; O.immune = IMMUNE_T; O.spinT = 0;
    const dx = O.x - U.x || U.a.facing;
    O.vx = Math.sign(dx) * 320; O.vy = rand(-60, 60);
    O.swingT = -1;
    O.a.playOnce('hurt', 0.25, 'dizzy'); O.a.squash(0.35); O.a.flash('#ffffff', 0.15); O.a.emote('dizzy', DIZZY_T);
    U.a.emote('sweat', 0.8);
    const hx = O.x, hy = O.y - O.a.height * 0.85;
    particles.burst(hx, hy, { type: 'star', count: 8, colors: ['#ffd23f', '#fff', '#ff9fd0'], speed: [160, 380] });
    particles.popText(hx, hy - 40, 'Boing!', '#ff9ad5', 48);
    sfx('bonk'); sfx('boing', { fallback: 'bounce', vol: 0.6 }); voice(O.p.charId, 'ouch');
    fx.shake(5, 0.15);
    if (!O.p.isAI) O.p.ctrl.rumble(0.6, 200);
  }

  collide() {
    const U = this.units;
    const R = 30 * this.scale + 6;
    for (let i = 0; i < U.length; i++) {
      for (let j = i + 1; j < U.length; j++) {
        const A = U[i], B = U[j];
        const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy) || 0.01;
        if (d < R * 2) {
          const push = (R * 2 - d) / 2, nx = dx / d, ny = dy / d;
          A.x -= nx * push; A.y -= (ny * push) / 1.6; B.x += nx * push; B.y += (ny * push) / 1.6;
        }
      }
    }
    for (const u of U) {
      u.x = clamp(u.x, ARENA.x0 + R, ARENA.x1 - R); u.y = clamp(u.y, ARENA.y0, ARENA.y1);
      u.a.x = u.x; u.a.y = u.y;
    }
  }

  // --- CPU ---------------------------------------------------------------------------------
  aiThink(U, dt) {
    const p = U.p, prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 0, 0, 2), ctrl = p.ctrl;
    if (U.dizzy > 0) { ctrl.move(0, 0); return; }
    const live = this.pinatas.filter((P) => P.state === 'hang' || P.state === 'drop');
    const speed = WALK * prof.speed;
    if (U.brain.ready(dt) || !U.goal) {
      U.brain.wait(reactionTime(p) * 0.6);
      // the best candy for me (value vs. how far, skipping ones a rival is much closer to)
      let best = null, bu = 0;
      for (const c of this.candies) {
        if (c.state === 'dead') continue;
        const L = this.candyLanding(c);
        const d = Math.hypot(L.x - U.x, (L.y - U.y) * 1.3), travel = d / speed;
        if (c.state === 'rest' && c.life < travel + 0.3) continue;
        if (live.length && d > (c.kind === 'gold' ? 560 : 280)) continue;
        let u = VALUE[c.kind] / (0.35 + travel) * rand(0.85, 1.15);
        for (const O of this.units) if (O !== U && O.dizzy <= 0 && Math.hypot(L.x - O.x, (L.y - O.y) * 1.3) < d * 0.6) { u *= 0.4; break; }
        if (u > bu) { bu = u; best = c; }
      }
      const wantCandy = best && (!live.length || bu > [0.9, 0.7, 0.55][lvl]);
      if (chance(prof.mistake * 0.5)) U.goal = { kind: 'wander', x: rand(ARENA.x0 + 120, ARENA.x1 - 120), y: rand(ARENA.y0 + 60, ARENA.y1 - 60), until: this.t + rand(0.5, 1.1) };
      else if (wantCandy) U.goal = { kind: 'candy', c: best };
      else if (live.length) {
        // spread out over two piñatas: nearer is better, crowded is worse
        let P = null, ps = 1e9;
        for (const Q of live) {
          let s = Math.hypot(this.gx(Q) - U.x, this.gy(Q) - U.y) + (U.goal && U.goal.P === Q ? -80 : 0);
          for (const O of this.units) if (O !== U && ((O.goal && O.goal.P === Q) || Math.hypot(this.gx(Q) - O.x, this.gy(Q) - O.y) < 280)) s += 160;
          if (s < ps) { ps = s; P = Q; }
        }
        U.goal = { kind: 'pinata', P };
      } else U.goal = { kind: 'idle' };
      if (U.goal.kind === 'pinata') {
        // wait where it will swing past: between its rest point and where it's heading
        const P = U.goal.P, lead = [0.15, 0.3, 0.4][lvl], k = [0.4, 0.55, 0.65][lvl];
        U.seen = { x: lerp(P.ax, this.gx(P) + P.vu * lead, k), y: lerp(P.ay, this.gy(P) + P.vv * lead, k) };
      }
    }
    let tx = U.x, ty = U.y;
    const G = U.goal;
    if (G.kind === 'candy') {
      if (G.c.state === 'dead') U.goal = null;
      else { const L = this.candyLanding(G.c); tx = L.x; ty = L.y; }
    } else if (G.kind === 'pinata') {
      if (G.P.state !== 'hang' && G.P.state !== 'drop') U.goal = null;
      else { const { rx, ry } = this.reach(U); tx = U.seen.x + Math.cos(U.offA) * rx * 0.35; ty = U.seen.y + Math.sin(U.offA) * ry * 0.6; }
    } else if (G.kind === 'wander') {
      tx = G.x; ty = G.y; if (this.t > G.until) U.goal = null;
    } else { tx = W / 2 + Math.cos(U.offA) * 320; ty = REST_Y + Math.sin(U.offA) * 150; }
    const dx = tx - U.x, dy = ty - U.y, d = Math.hypot(dx, dy);
    if (d < 14) ctrl.move(0, 0);
    else {
      const ang = Math.atan2(dy, dx) + Math.sin(this.t * 2.1 + U.i) * prof.aimError * 0.3;
      const k = clamp(d / 60, 0, 1) * prof.speed;
      ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
      // dash toward far-away candy (Normal and Hard)
      if (G && G.kind === 'candy' && d > 260 && U.dashCd <= 0 && (p.aiLevel ?? 0) >= 1 && chance(dt * 3)) ctrl.press('b');
    }
    // swing timing: look a little ahead (with a level-based timing error) and swing when it'll be in reach
    U.checkT -= dt;
    if (U.checkT <= 0 && U.swingCd <= 0 && U.swingT < 0) {
      U.checkT = rand(...[[0.12, 0.28], [0.06, 0.14], [0.03, 0.07]][lvl]);
      for (const P of this.pinatas) {
        if (P.state !== 'hang') continue;
        const T = (HIT_FROM + HIT_TO) / 2 + rand(-1, 1) * [0.2, 0.11, 0.05][lvl];
        const f = this.reachF(U, this.gx(P) + P.vu * T, this.gy(P) + P.vv * T);
        if (f < [0.95, 0.8, 0.62][lvl]) { if (!chance(prof.mistake * 0.8)) ctrl.press('a'); break; }
        if (f < 1.7 && chance([0.07, 0.03, 0][lvl])) { ctrl.press('a'); break; }
      }
    }
  }

  // --- end ---------------------------------------------------------------------------------
  endGame() {
    this.over = true;
    const scores = this.units.map((u) => u.score);
    const placements = placementsFromScores(scores);
    const top = Math.max(...scores), worst = Math.max(...placements);
    for (const U of this.units) {
      U.a.clearEmotes();
      if (scores[U.i] === top) U.a.setPose('celebrate');
      else if (this.n > 1 && placements[U.i] === worst) U.a.setPose('pout');
      else U.a.setPose('idle');
    }
    const w = this.units[scores.indexOf(top)];
    this.api.finish({ placements, stats: scores.map((s) => `${s} candy`), solo: scores[0], focus: { x: w.x, y: w.y - w.a.height * 0.5, zoom: 1.3 } });
  }

  // --- drawing ---------------------------------------------------------------------------------
  drawBatAttach(g, info, U, behindLayer) {
    const L = Math.max(72, info.h * 0.6);
    // Rest: held out ready in front (clear of the face). A sprite whose hand point
    // is behind its face (e.g. the far hand) rests the bat up over its back instead.
    const rear = info.hand.x < info.eyes.x - info.h * 0.04;
    const REST = rear ? -2.15 : -0.75, BACK = -2.8, END = -0.25;
    let ang = REST + Math.sin(this.t * 3 + U.i) * 0.05;
    const s = U.swingT;
    if (U.dizzy > 0) ang = REST + Math.sin(this.t * 12) * 0.45;
    else if (s >= 0) {
      if (s < HIT_FROM) ang = lerp(REST, BACK, ease.outQuad(s / HIT_FROM));
      else if (s < HIT_TO) ang = lerp(BACK, END, ease.outCubic((s - HIT_FROM) / (HIT_TO - HIT_FROM)));
      else ang = lerp(END, REST, ease.inOutQuad(clamp((s - HIT_TO) / (SWING_T - HIT_TO), 0, 1)));
    }
    // Pointing up and back (resting, winding up, dizzy wobble) the bat goes behind
    // the character, so it never covers a face; past upright it is drawn in front.
    if ((ang < (rear ? -2.45 : -1.75)) !== behindLayer) return;
    if (U.dizzy <= 0 && s >= 0) {
      if (s > HIT_FROM * 0.7 && s < HIT_TO + 0.06) {
        const k = 1 - clamp((s - HIT_TO) / 0.06, 0, 1);
        g.save(); g.globalAlpha = 0.55 * k; g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineWidth = L * 0.2;
        g.beginPath(); g.arc(info.hand.x, info.hand.y, L * 0.78, Math.max(BACK, ang - 1.4), ang); g.stroke(); g.restore();
      }
    }
    drawBat(g, info.hand.x, info.hand.y, ang, L, U.p.color);
  }

  draw(g) {
    const bg = art('bg/pinata-party');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else { if (!this.bg) this.bg = buildBackground(); g.drawImage(this.bg, 0, 0); }
    // knots on the crossbar
    for (const P of this.pinatas) {
      const x = P.state === 'burst' ? P.burstTop : this.topX(P);
      g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.arc(x, BAR_Y + 4, 12, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = NAVY; g.beginPath(); g.arc(x, BAR_Y + 4, 4, 0, TAU); g.fill();
    }
    // ground layer: piñata shadows, reach rings, candy shadows
    for (const P of this.pinatas) if (P.state === 'hang' || P.state === 'drop') this.drawPinataShadow(g, P);
    for (const U of this.units) this.drawReach(g, U);
    for (const c of this.candies) {
      const r = CANDY_R[c.kind] * this.ds(c.y) * (1 - clamp(c.z / 900, 0, 0.6));
      g.save(); g.globalAlpha = 0.22; g.fillStyle = '#1b3a1b';
      g.beginPath(); g.ellipse(c.x, c.y + 4, r, r * 0.35, 0, 0, TAU); g.fill(); g.restore();
    }
    // y-sorted scene
    const list = [];
    for (const U of this.units) list.push({ y: U.y, fn: () => this.drawUnit(g, U) });
    for (const P of this.pinatas) list.push({ y: this.gy(P) + 1, fn: () => this.drawPinataWorld(g, P) });
    for (const c of this.candies) list.push({ y: c.y, fn: () => this.drawCandyWorld(g, c) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();
    // player tags at the start and when a new piñata arrives
    if (this.t < 4.5 || (this.t - this.roundT < 2.2 && this.round > 0)) {
      for (const U of this.units) {
        const sc = this.n > 5 ? 0.78 : 0.95;
        g.save(); g.translate(U.x, U.y - U.a.height - 34 - (U.a.emotes.length ? 50 : 0)); g.scale(sc, sc); ui.playerTag(g, U.p, 0, 0); g.restore();
      }
    }
  }

  drawPinataShadow(g, P) {
    const gx = this.gx(P), gy = this.gy(P), ds = this.ds(gy);
    const lift = P.state === 'drop' ? 1 - clamp(P.dropT / 1.1, 0, 1) : 0;
    const r = 80 * P.size * ds * (1 - lift * 0.5);
    g.save();
    g.globalAlpha = 0.3 * (1 - lift * 0.6); g.fillStyle = '#163016';
    g.beginPath(); g.ellipse(gx, gy, r, r * 0.34, 0, 0, TAU); g.fill();
    g.globalAlpha = 0.55 * (1 - lift) * (0.7 + 0.3 * Math.sin(this.t * 6)); g.strokeStyle = '#fff6a8'; g.lineWidth = 4; g.setLineDash([12, 10]);
    g.beginPath(); g.ellipse(gx, gy, r * 1.15, r * 0.4, 0, 0, TAU); g.stroke();
    g.restore();
  }

  drawReach(g, U) {
    if (this.over || U.dizzy > 0) return;
    let bf = 9;
    for (const P of this.pinatas) if (P.state === 'hang') bf = Math.min(bf, this.reachF(U, this.gx(P), this.gy(P)));
    if (bf > 1.8) return;
    const { rx, ry } = this.reach(U);
    const cx = U.x + U.a.facing * 12;
    const inR = bf < 1;
    g.save();
    g.globalAlpha = inR ? 0.95 : clamp((1.8 - bf) / 0.8, 0, 1) * 0.6;
    g.lineWidth = inR ? 6 : 3.5; g.strokeStyle = inR ? '#ffe14d' : U.p.color;
    if (!inR) g.setLineDash([10, 9]);
    g.beginPath(); g.ellipse(cx, U.y, rx, ry, 0, 0, TAU); g.stroke();
    if (inR) {
      g.globalAlpha = 0.25 + 0.15 * Math.sin(this.t * 14); g.fillStyle = '#fff6a8'; g.fill();
      g.globalAlpha = 0.7; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.setLineDash([6, 6]);
      g.beginPath(); g.ellipse(cx, U.y, rx * SWEET, ry * SWEET, 0, 0, TAU); g.stroke();
    }
    g.restore();
  }

  drawUnit(g, U) {
    const blink = U.immune > 0 && U.dizzy <= 0 && Math.floor(this.t * 14) % 2 === 0;
    g.save();
    if (blink) g.globalAlpha = 0.6;
    U.a.draw(g, { ring: U.p.color });
    g.restore();
  }

  drawCandyWorld(g, c) {
    const ds = this.ds(c.y);
    const fade = c.state === 'rest' && c.life < 1.5 ? (Math.floor(c.life * 8) % 2 ? 0.35 : 1) : 1;
    g.save(); g.globalAlpha = fade;
    const s = ds * (c.kind === 'gold' ? 1.1 : 0.95);
    g.translate(c.x, c.y - c.z - CANDY_R[c.kind] * s * 0.8);
    g.scale(1 + c.sq * 0.6, 1 - c.sq * 0.6);
    drawCandy(g, c.kind, c.v, 0, 0, s, c.rot, this.t);
    g.restore();
  }

  drawPinataWorld(g, P) {
    const def = PINATAS[P.kind];
    if (P.state === 'burst') {
      // the rope zips back up with a few paper scraps on it
      const k = ease.inQuad(clamp(P.burstT / 1.2, 0, 1));
      const ex = lerp(P.burstAt.x, P.burstTop, k), ey = lerp(P.burstAt.y - 60 * P.size, BAR_Y + 10, k);
      this.drawRope(g, P.burstTop, ex, ey);
      g.save(); g.translate(ex, ey);
      for (let i = 0; i < 4; i++) {
        g.save(); g.rotate(Math.sin(this.t * 7 + i) * 0.4 + (i - 1.5) * 0.4);
        g.fillStyle = def.bands[i % def.bands.length]; g.strokeStyle = NAVY; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.lineTo(3, 26); g.lineTo(-4, 22); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      g.restore();
      return;
    }
    const gx = this.gx(P), gy = this.gy(P), z = this.pz(P), ds = this.ds(gy);
    const cx = gx, cy = gy - z;
    const low = P.tired || P.hp / P.maxHp < 0.3;
    const top = this.topX(P);
    const theta = Math.atan2(top - cx, cy - BAR_Y) * 0.7 + P.rot * 0.12 + (low ? Math.sin(this.t * 38) * 0.03 : 0);
    const s = PS * P.size * ds;
    const cs = Math.cos(P.spin);
    const sx = s * (1 + P.sq * 0.22) * (Math.sign(cs) || 1) * Math.max(0.5, Math.abs(cs)) * P.facing, sy = s * (1 - P.sq * 0.22);
    // rope to the tie point
    const [rx0, ry0] = def.rope;
    const lx = rx0 * sx, ly = ry0 * sy;
    const ax = cx + lx * Math.cos(theta) - ly * Math.sin(theta), ay = cy + lx * Math.sin(theta) + ly * Math.cos(theta);
    this.drawRope(g, top, ax, ay);
    g.save(); g.translate(cx, cy); g.rotate(theta); g.scale(sx, sy);
    const crackN = Math.floor((1 - P.hp / P.maxHp) * 5 + (P.tired ? 5 : 0));
    drawPinata(g, P.kind, {
      t: this.t + P.id, mood: P.giggle > 0 ? 'giggle' : low ? 'wow' : 'happy', cracks: P.cracks, crackN: clamp(crackN, 0, 5),
      sway: clamp(-P.vu / 900, -0.6, 0.6) * P.facing - theta * 0.5, gold: P.mega,
    });
    g.restore();
    // its own clock: the last few seconds before it tires out and bursts by itself
    const left = P.deadline + 1.6 - this.t;
    if (P.state === 'hang' && left < 6.6) this.drawPinataClock(g, cx + 150 * s, cy - 150 * s, left, P.tired);
  }

  drawPinataClock(g, x, y, left, tired) {
    const k = clamp(left / 6.6, 0, 1), r = 34;
    const pulse = tired ? 1 + Math.max(0, Math.sin(this.t * 14)) * 0.12 : 1;
    g.save(); g.translate(x, y); g.scale(pulse, pulse);
    g.fillStyle = tired ? '#ff4d6d' : '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = tired ? '#ffe680' : '#ff6fb1'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, r - 9, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
    ui.text(g, String(Math.max(1, Math.ceil(left))), 0, 2, { size: 34, color: tired ? '#fff' : NAVY, stroke: tired ? NAVY : false, strokeWidth: 5, weight: 800 });
    g.restore();
  }

  drawRope(g, ax, ex, ey) {
    const mx = (ax + ex) / 2, my = (BAR_Y + ey) / 2 + 14;
    g.save(); g.lineCap = 'round';
    g.strokeStyle = NAVY; g.lineWidth = 7; g.beginPath(); g.moveTo(ax, BAR_Y + 4); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    g.strokeStyle = '#e8c48a'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(ax, BAR_Y + 4); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    g.restore();
  }

  drawHUD(g) {
    const scores = this.units.map((u) => u.score);
    const top = Math.max(...scores);
    ui.scoreboard(g, this.players, scores, { y: 18, avoidCenter: true, format: (v) => String(v), highlight: scores.map((s) => top > 0 && s === top && this.n > 1) });
    ui.timer(g, DURATION - this.t, W / 2, 62);
    // which piñata
    const label = this.round >= ROUNDS ? 'Bonus piñata!' : `Piñata ${this.round + 1} of ${ROUNDS}`;
    g.save(); ui.panel(g, W / 2 - 120, 112, 240, 42, { r: 21, fill: this.round === ROUNDS - 1 ? '#ffe680' : '#ffffff', lineWidth: 4 });
    ui.text(g, label, W / 2, 134, { size: 26, color: NAVY, stroke: false, weight: 800, maxWidth: 220 });
    g.restore();
    if (this.bannerMsg) {
      const k = this.t - this.bannerMsg.t0;
      if (k < 1.7) {
        g.save(); g.globalAlpha = clamp((1.7 - k) / 0.35, 0, 1);
        ui.banner(g, this.bannerMsg.text, k, { y: 360, size: 110, color: this.bannerMsg.color });
        g.restore();
      }
    }
    // hints
    const hint = (str, btn, t0, dur) => {
      const k = this.t - t0;
      if (k < 0 || k > dur) return;
      g.save(); g.globalAlpha = clamp(Math.min(k / 0.25, (dur - k) / 0.4), 0, 1);
      ui.panel(g, W / 2 - 440, 990, 880, 66, { r: 33 });
      ui.glyph(g, btn, W / 2 - 400, 1023, 48, { pulse: true });
      ui.text(g, str, W / 2 + 30, 1023, { size: 34, color: NAVY, stroke: false, maxWidth: 780 });
      g.restore();
    };
    hint('Swing when the piñata is over your ring!', 'a', 0, 5);
    if (this.firstBurstT >= 0) hint('Run and grab the candy!', 'stick', this.firstBurstT + 0.3, 3);
  }
}
