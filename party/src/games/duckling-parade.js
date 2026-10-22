// Duckling Parade (Molly Party, cooperative): lost ducklings hide all around
// a sunny pond (in reeds, on lily pads, in a rubber boot, by bushes and
// mushrooms) or waddle about the meadow. Run near one and it hops into a
// quacking line behind you; run your line to mama duck's nest and they pour
// in one by one, then splash into the pond for a swim. A = quack call (pulls
// nearby ducklings to you and makes your line hop). Running through someone
// else's line steals... er, borrows a confused duckling. A golden duckling
// zooms around now and then (worth 3). Last 12 s: Duckling Rush! Finale:
// mama leads every duckling in a parade around the pond.
//
// Art hooks (all optional, procedural fallbacks ship today):
//   bg/duckling-parade  prop/duckling  prop/duckling-quack  prop/mama-duck
//   prop/duck-nest  prop/lily-pad  prop/reeds  prop/rubber-boot  prop/flower-bush
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import { depthScale } from '../engine/camera.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime, steer, Brain } from '../engine/ai.js';
import { drawEmote, drawSparkleShape } from '../engine/emotes.js';
import { easySteer } from '../engine/easy.js';
import { clamp, damp, rand, randInt, pick, chance, shuffle, TAU, dist, lerp, later } from '../engine/util.js';
import {
  NAVY, POND, NEST, drawDuckling, drawHat, drawMama, drawNest, drawLily, drawReeds, drawBoot,
  drawBush, drawMushroom, drawMeadow, drawPond,
} from './duckling-parade/art.js';

/** Play a recorded sound when it exists, else a stand-in. */
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export const meta = {
  id: 'duckling-parade',
  title: 'Duckling Parade',
  category: 'molly',
  type: 'Team up',
  goal: 'Find the lost ducklings and lead them home to Mama Duck!',
  controls: [['stick', 'Run - ducklings follow you'], ['a', 'Quack call']],
  tips: ['Run close to a duckling and it hops in line behind you.', 'Run your line to Mama\'s nest to bring them home.', 'Catch the sparkly golden duckling for 3!'],
  goalEasy: 'You walk round the pond by yourself - quack with A to call the lost ducklings!',
  controlsEasy: [['a', 'Quack call'], ['stick', 'Walk (if you like)']],
  tipsEasy: ['When a duckling sparkles and the A pops up, press A!', 'No duckling close? Press A and you walk to the nearest one!', 'You walk by yourself - or move with either stick if you like!', 'Every lap you pass Mama\'s nest and your ducklings go home.', 'Catch the sparkly golden duckling for 3!'],
  music: 'splash',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const thumb = art('thumb/duckling-parade');
    if (thumb) { g.drawImage(thumb, x, y, w, h); g.restore(); return; }
    const s = w / 400;
    g.translate(x, y); g.scale(s, s);
    const hh = h / s;
    const sky = g.createLinearGradient(0, 0, 0, hh);
    sky.addColorStop(0, '#9fdcff'); sky.addColorStop(0.35, '#d8f3ff'); sky.addColorStop(0.36, '#8ee07a'); sky.addColorStop(1, '#5cc65a');
    g.fillStyle = sky; g.fillRect(0, 0, 400, hh);
    ui.cloud(g, 70, hh * 0.12, 0.4, '#fff', 0.9); ui.cloud(g, 320, hh * 0.18, 0.35, '#fff', 0.9);
    g.save(); g.translate(200, hh * 0.68); g.scale(0.42, 0.42); g.translate(-960, -650); drawPond(g, t); g.restore();
    // mama leading a line
    const bob = (k) => -Math.abs(Math.sin(t * 7 + k)) * 5;
    g.save(); g.translate(300, hh * 0.62 + bob(0)); g.scale(-0.42, 0.42); drawMama(g, t, { walk: true, quack: Math.sin(t * 3) > 0.7 }); g.restore();
    const hats = ['flower', null, 'bow', null, 'crown'];
    for (let i = 0; i < 5; i++) {
      g.save(); g.translate(250 - i * 40, hh * 0.66 + i * 6 + bob(i + 1)); g.scale(-0.62, 0.62);
      drawDuckling(g, { quack: Math.sin(t * 5 + i * 2) > 0.8 }); drawHat(g, hats[i], t); g.restore();
    }
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const PLAY = 52;              // seconds of finding before the parade
const PARADE_T = 7;           // the finale
const RUSH_AT = 12;           // seconds left when the Duckling Rush starts
const MAX_SPEED = 540;
const CPU_SPEED = [0.6, 0.72, 0.84];   // Molly CPUs stay gentle on every level
const PICK_R = 112;           // generous pick-up radius (plus the body)
const CALL_R = 270;           // quack call pulls ducklings from this far
const SP = 46;                // spacing in a duckling line
const NEST_R = 180;           // run this close to the nest to bring them home
const BOUNDS = { x0: 70, x1: W - 70, y0: 275, y1: 1000 };
const HATS = ['flower', 'flower', 'bow', 'crown', 'glasses', 'party'];
const TRAITS = ['sneeze', 'sneeze', 'hiccup', 'twirl', null, null, null];

const rim = (a, k) => ({ x: POND.x + POND.rx * k * Math.cos(a), y: POND.y + POND.ry * k * Math.sin(a) });
const deg = (d) => (d * Math.PI) / 180;
const SPOTS = [
  { type: 'reeds', ...rim(deg(195), 1.13) }, { type: 'reeds', ...rim(deg(345), 1.13) },
  { type: 'reeds', ...rim(deg(152), 1.12) }, { type: 'reeds', ...rim(deg(28), 1.12) },
  { type: 'lily', ...rim(deg(90), 0.7) }, { type: 'lily', ...rim(deg(228), 0.72) },
  { type: 'lily', ...rim(deg(312), 0.72) }, { type: 'lily', ...rim(deg(180), 0.78) }, { type: 'lily', ...rim(deg(0), 0.78) },
  { type: 'boot', x: 300, y: 450 }, { type: 'boot', x: 1650, y: 905 },
  { type: 'bush', x: 175, y: 700 }, { type: 'bush', x: 1760, y: 590 }, { type: 'bush', x: 430, y: 905 },
  { type: 'mushroom', x: 660, y: 335 }, { type: 'mushroom', x: 1270, y: 330 }, { type: 'mushroom', x: 1500, y: 790 },
  { type: 'mushroom', x: 120, y: 420 }, { type: 'bush', x: 1820, y: 330 },
];
const PARADE_RX = POND.rx + 125, PARADE_RY = POND.ry + 95;
// Molly Easy: humans walk this loop round the pond by themselves (its top passes Mama's nest)
const LOOP = { x: POND.x, y: 640, rx: 680, ry: 300 };
const LOOP_SPEED = 0.75;
const MAMA_HOME = { x: NEST.x + 205, y: NEST.y + 22 };
// prop/duck-nest: the front straw edge of the bowl, left to right (art px of the 400x220 image)
const NEST_RIM = [[0, 100], [75, 100], [90, 115], [100, 122], [125, 132], [150, 140], [175, 146], [200, 149],
  [225, 147], [250, 141], [275, 133], [300, 125], [320, 115], [333, 105], [340, 98], [400, 98]];

function inPond(x, y, k = 1) {
  const u = ((x - POND.x) / (POND.rx * k)) ** 2 + ((y - POND.y) / (POND.ry * k)) ** 2;
  return u < 1;
}

let duckSerial = 0;

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: humans walk a loop round the pond, A quacks
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.playT = 0;
    this.phase = 'play';
    this.baseScale = n <= 2 ? 0.86 : n <= 4 ? 0.8 : 0.7;
    this.ducks = [];
    this.team = 0;
    this.quackAt = 0;
    this.spawnT = 0;
    this.goldenT = rand(9, 12);
    this.rush = false; this.rushT = 0;
    this.milestone = 10;
    this.mama = { x: MAMA_HOME.x, y: MAMA_HOME.y, facing: -1, quack: 0, hop: 0, z: 0, vz: 0, trail: [], ang: 0, walking: false };
    this.spots = SPOTS.map((s, i) => ({ ...s, i, duck: null, side: i % 2 ? 1 : -1, wob: 0 }));
    this.decor = Array.from({ length: 70 }, (_, i) => {
      let x, y, k = 0;
      do { x = rand(30, W - 30); y = rand(240, 1060); k++; } while (inPond(x, y, 1.15) && k < 20);
      return { x, y, s: rand(0.6, 1.1), c: pick(['#ffffff', '#ffffff', '#ffe066', '#ffb3d9', '#c9a0ff']) };
    });
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? W / 2 : 330 + ((W - 660) * i) / (n - 1);
      const y = 930 - (i % 2) * 40;
      const a = new Actor(p, { scale: this.baseScale, x, y });
      // tiny avatars (e.g. garden fairies) are drawn bigger so they read next to the ducklings
      const sizeK = clamp(120 / a.leader.h, 1, 2.4);
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      return {
        p, a, i, x, y, sizeK, vx: 0, vy: 0, line: [], trail: [{ x, y }], delivered: 0, delT: 0, batch: 0,
        callCd: 0, swapCd: 0, callFx: 0, brain: new Brain(p), target: null, goal: randInt(3, 6), wander: 0, wx: x, wy: y,
        cheerCd: 0, tx: x, ty: y,
        ezAng: 0, ezNear: 0,
      };
    });
    // Molly Easy: humans spread out evenly round the loop (starting from the bottom)
    this.ents.filter((e) => !e.p.isAI).forEach((e, k, hs) => { e.ezAng = Math.PI / 2 + (k * TAU) / hs.length; });
    // initial ducklings: fill a good share of the hiding spots
    const want = this.lostTarget();
    for (let k = 0; k < want; k++) this.spawnInSpot(true);
  }

  lostTarget() { return clamp(this.n + 5, 6, 13) + (this.rush ? 4 : 0); }

  // ------------------------------------------------------------------ ducks
  newDuck(o) {
    const d = {
      id: duckSerial++, x: 0, y: 0, z: 0, vz: 0, kx: 0, ky: 0, facing: chance(0.5) ? 1 : -1, state: 'hide',
      owner: null, spot: null, hat: chance(0.55) ? pick(HATS) : null, trait: pick(TRAITS), golden: false,
      quack: 0, traitT: rand(2, 6), sneeze: 0, twirl: 0, peek: 0, hop: rand(TAU), confused: 0, blinkT: rand(2, 5),
      sx: 0, sy: 0, tx: 0, ty: 0, at: 0, adur: 0.4, arcH: 100, wx: 0, wy: 0, wt: 0, spd: rand(120, 170), age: 0, nestT: 0,
      ...o,
    };
    this.ducks.push(d);
    return d;
  }

  spawnInSpot(quiet = false) {
    const free = this.spots.filter((s) => !s.duck && !this.ents.some((e) => dist(e.x, e.y, s.x, s.y) < 220));
    if (!free.length) return this.spawnWanderer();
    const s = pick(free);
    const d = this.newDuck({ state: 'hide', spot: s, x: s.x, y: s.y, peek: quiet ? 1 : 0 });
    s.duck = d; s.wob = 0.5;
    if (!quiet) { snd('dp-peek', 'tiny-squeak', { vol: 0.35, rate: rand(1, 1.2) }); particles.burst(s.x, s.y - 40, { type: 'sparkle', count: 4, colors: ['#fff', '#ffe066'], size: [8, 14] }); }
    return d;
  }

  spawnWanderer(golden = false) {
    const side = randInt(0, 2);
    const x = side === 0 ? -40 : side === 1 ? W + 40 : rand(200, W - 200);
    const y = side === 2 ? BOUNDS.y0 - 10 : rand(330, 900);
    const d = this.newDuck({ state: 'wander', x, y, golden, spd: golden ? 300 : rand(130, 190), hat: golden ? 'crown' : undefined });
    if (golden) d.trait = null;
    this.pickWaypoint(d);
    return d;
  }

  pickWaypoint(d) {
    let best = null, bs = -1;
    for (let k = 0; k < 6; k++) {
      const x = rand(BOUNDS.x0 + 40, BOUNDS.x1 - 40), y = rand(BOUNDS.y0 + 20, 940);
      if (inPond(x, y, 1.2)) continue;
      // the golden duckling likes spots away from players (still easy to catch)
      let sc = rand(1);
      if (d.golden) sc = Math.min(...this.ents.map((e) => dist(e.x, e.y, x, y))) + rand(200);
      if (sc > bs) { bs = sc; best = { x, y }; }
    }
    if (!best) best = { x: rand(200, 500), y: rand(800, 900) };
    d.wx = best.x; d.wy = best.y; d.wt = rand(1.2, 2.6);
  }

  join(e, d, call = false) {
    if (d.spot) { d.spot.duck = null; d.spot.wob = 0.6; d.spot = null; }
    d.state = 'follow'; d.owner = e; d.vz = 520; d.confused = 0;
    e.line.push(d);
    d.quack = 0.3;
    const a = e.a;
    snd('dp-quack', 'fish-duck', { vol: 0.55, rate: clamp(1 + e.line.length * 0.04, 1, 1.6) });
    sfx('collect', { step: Math.min(e.line.length, 14) });
    particles.burst(d.x, d.y - 40, { type: 'heart', count: 4, colors: ['#ff6fb1', '#ff9ad5'], speed: [60, 160], size: [12, 20] });
    particles.burst(d.x, d.y - 20, { type: 'dust', count: 5, color: '#fff', speed: [40, 120], size: [8, 14] });
    if (d.golden) {
      sfx('sparkle'); snd('dp-golden', 'golden-chime', { vol: 0.8 }); voice(e.p.charId, 'woo');
      particles.burst(d.x, d.y - 40, { type: 'star', count: 16, colors: ['#ffd23f', '#fff6a8', '#fff'] });
      particles.popText(d.x, d.y - 110, 'Golden!', '#ffd23f', 54);
      fx.flash('#fff3b0', 0.12); fx.shake(6, 0.2);
      this.api.camera && this.api.camera.punch(e.x, e.y - 80, 1.2, 0.35);
      a.playOnce('cheer', 0.6); a.emote('sparkle', 1.2);
    } else if (e.line.length % 5 === 0) {
      particles.popText(e.x, e.y - a.height - 50, `${e.line.length} ducks!`, '#fff', 44);
      a.playOnce('cheer', 0.45); sfx('yay');
    } else a.squash(0.15);
    if (!e.p.isAI) e.p.ctrl.rumble(0.25, 60);
  }

  /** A point `D` px back along a leader's trail. */
  pointBack(e, D) {
    let px = e.x, py = e.y, rem = D;
    const tr = e.trail;
    for (let i = tr.length - 1; i >= 0; i--) {
      const q = tr[i], seg = Math.hypot(q.x - px, q.y - py);
      if (seg >= rem && seg > 0) { const k = rem / seg; return { x: px + (q.x - px) * k, y: py + (q.y - py) * k }; }
      rem -= seg; px = q.x; py = q.y;
    }
    return { x: px, y: py };
  }

  pushTrail(e, max) {
    const last = e.trail[e.trail.length - 1];
    if (!last || Math.hypot(e.x - last.x, e.y - last.y) >= 7) e.trail.push({ x: e.x, y: e.y });
    const keep = Math.ceil(((max + 2) * SP) / 7) + 12;
    if (e.trail.length > keep) e.trail.splice(0, e.trail.length - keep);
  }

  quackSound(d, vol = 0.35) {
    if (this.t - this.quackAt < 0.16) return;
    this.quackAt = this.t;
    d.quack = 0.22;
    snd('dp-quack', 'fish-duck', { vol, rate: rand(0.95, 1.35) });
  }

  updateDuck(d, dt) {
    d.age += dt; d.quack = Math.max(0, d.quack - dt); d.confused = Math.max(0, d.confused - dt);
    d.kx *= Math.exp(-5 * dt); d.ky *= Math.exp(-5 * dt);
    d.blinkT -= dt; if (d.blinkT < -0.12) d.blinkT = rand(2, 5);
    if (d.z > 0 || d.vz) { d.vz -= 1900 * dt; d.z += d.vz * dt; if (d.z <= 0) { d.z = 0; d.vz = 0; } }
    const px = d.x;
    switch (d.state) {
      case 'hide': {
        d.peek = Math.min(1, d.peek + dt * 3);
        if (chance(dt * 0.5)) { this.quackSound(d, 0.22); d.vz = 260; }
        d.facing = Math.sin(this.t * 0.7 + d.id) > 0 ? 1 : -1;
        break;
      }
      case 'wander': {
        d.wt -= dt;
        const dd = dist(d.x, d.y, d.wx, d.wy);
        if (dd < 20 || d.wt <= 0) this.pickWaypoint(d);
        const sp = d.spd * (this.rush ? 1.15 : 1);
        if (dd > 1) { d.x += ((d.wx - d.x) / dd) * sp * dt; d.y += ((d.wy - d.y) / dd) * sp * dt; }
        if (inPond(d.x, d.y, 1.08)) this.pushOut(d, 1.08);
        d.hop += dt * 16;
        if (d.golden && chance(dt * 18)) particles.burst(d.x, d.y - 30 - d.z, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffd23f'], speed: [10, 60], size: [10, 18] });
        if (chance(dt * 0.6)) this.quackSound(d, 0.25);
        break;
      }
      case 'follow': {
        const e = d.owner, k = e.line.indexOf(d);
        const sp = SP * depthScale(e.y, { top: 260, near: 1000, far: 0.85 });
        const tp = this.pointBack(e, (k + 1) * sp + 10);
        const ox = d.x;
        d.x = damp(d.x, tp.x, 13, dt) + d.kx * dt; d.y = damp(d.y, tp.y, 13, dt) + d.ky * dt;
        const moved = Math.abs(d.x - ox) + Math.abs(d.y - (tp.y));
        d.hop += dt * (Math.abs(d.x - ox) > 0.3 ? 18 : 4);
        if (moved && chance(dt * 0.35)) this.quackSound(d, 0.22);
        break;
      }
      case 'tonest': case 'hopin': case 'jumpout': {
        d.at += dt;
        const k = clamp(d.at / d.adur, 0, 1);
        d.x = lerp(d.sx, d.tx, k); d.y = lerp(d.sy, d.ty, k); d.z = Math.sin(k * Math.PI) * d.arcH;
        if (k >= 1) {
          d.z = 0;
          if (d.state === 'tonest') { d.state = 'nest'; d.nestT = rand(1.0, 1.8); particles.burst(d.x, d.y - 10, { type: 'dust', count: 4, color: '#f3dcae', speed: [30, 90], size: [8, 14] }); }
          else if (d.state === 'hopin') {
            d.state = 'swim'; this.pickSwim(d);
            snd('dp-splash', 'aq-splash', { vol: 0.35, rate: rand(1, 1.3) });
            particles.burst(d.x, d.y, { type: 'drop', count: 8, colors: ['#bfeaff', '#ffffff', '#7fd3ff'], speed: [80, 220] });
            particles.ring(d.x, d.y, '#ffffff', 60, 0.5);
          } else d.state = 'parade';
        }
        break;
      }
      case 'nest': {
        d.nestT -= dt; d.hop += dt * 3;
        if (d.nestT <= 0 && this.phase === 'play') {
          const a = rand(TAU), r = Math.sqrt(rand(0.1, 1)) * 0.72;
          this.startArc(d, 'hopin', POND.x + Math.cos(a) * POND.rx * r, POND.y + Math.sin(a) * POND.ry * r, 0.55, 110);
        }
        break;
      }
      case 'swim': {
        d.wt -= dt;
        const dd = dist(d.x, d.y, d.wx, d.wy);
        if (dd < 12 || d.wt <= 0) this.pickSwim(d);
        if (dd > 1) { d.x += ((d.wx - d.x) / dd) * 70 * dt; d.y += ((d.wy - d.y) / dd) * 70 * dt; }
        d.hop += dt * 3;
        if (chance(dt * 0.6)) particles.ring(d.x, d.y, 'rgba(255,255,255,0.8)', 40, 0.6);
        if (chance(dt * 0.15)) this.quackSound(d, 0.18);
        break;
      }
      case 'parade': {
        const sp = this.paradeSp || 38;
        const tp = this.pointBack(this.mama, (d.pi + 1) * sp + 60);
        const ox = d.x;
        d.x = damp(d.x, tp.x, 7, dt); d.y = damp(d.y, tp.y, 7, dt);
        d.hop += dt * (Math.abs(d.x - ox) > 0.3 ? 18 : 6);
        if (chance(dt * 0.4)) this.quackSound(d, 0.3);
        break;
      }
      default: break;
    }
    if (Math.abs(d.x - px) > 0.4 && d.state !== 'hide') d.facing = d.x > px ? 1 : -1;
    // silly traits
    if (d.state !== 'tonest' && d.state !== 'hopin' && d.state !== 'jumpout') this.updateTrait(d, dt);
    if (d.twirl > 0) d.twirl = Math.max(0, d.twirl - dt);
  }

  updateTrait(d, dt) {
    if (!d.trait) return;
    if (d.sneeze > 0) {
      d.sneeze -= dt;
      if (d.sneeze <= 0) {
        // ACHOO!
        d.kx = -d.facing * 420; d.vz = 420; d.quack = 0.3;
        snd('dp-sneeze', 'pop', { vol: 0.5, rate: rand(1.1, 1.3) });
        particles.burst(d.x + d.facing * 30, d.y - 40 - d.z, { type: 'smoke', count: 7, color: '#ffffff', speed: [60, 180], size: [12, 22] });
        if (d.hat === 'flower') particles.burst(d.x, d.y - 60, { type: 'petal', count: 6, colors: ['#ff7ac6', '#ffffff'] });
        particles.popText(d.x, d.y - 90, 'Achoo!', '#ffffff', 34);
        // right next to prim and proper Mama? She jumps, scandalised - and the kids giggle
        const m = this.mama;
        if (this.phase === 'play' && dist(d.x, d.y, m.x, m.y) < 300 && !(m.shockCd > 0)) {
          m.vz = Math.max(m.vz, 460); m.quack = 0.4; m.shockCd = 3;
          particles.popText(m.x, m.y - 210, pick(['Quack?!', 'Goodness!', 'Well I never!']), '#ff4d6d', 40);
          particles.burst(m.x, m.y - 120, { type: 'petal', count: 6, colors: ['#ffffff', '#fff3c4'], speed: [80, 200] });
          const kid = this.ents.find((e) => dist(e.x, e.y, m.x, m.y) < 520);
          if (kid && !kid.a._once) kid.a.playOnce('laugh', 0.6);
        }
      }
      return;
    }
    d.traitT -= dt;
    if (d.traitT > 0) return;
    if (d.trait === 'sneeze') { d.sneeze = 0.45; d.traitT = rand(4, 8); }
    else if (d.trait === 'hiccup') {
      d.vz = 300; d.traitT = rand(1.4, 3);
      snd('dp-hiccup', 'hic', { vol: 0.35, rate: rand(1.2, 1.5) });
      particles.burst(d.x, d.y - 60 - d.z, { type: 'bubble', count: 2, colors: ['#bfeaff', '#ffffff'], speed: [20, 60], size: [8, 14] });
    } else if (d.trait === 'twirl') {
      d.twirl = 0.7; d.vz = 240; d.traitT = rand(4, 7);
      snd('dp-twirl', 'swap', { vol: 0.3 });
      particles.burst(d.x, d.y - 40, { type: 'star', count: 4, colors: ['#ffd23f', '#fff'], speed: [60, 140], size: [8, 14] });
    }
  }

  startArc(d, state, tx, ty, dur, h) {
    d.state = state; d.sx = d.x; d.sy = d.y; d.tx = tx; d.ty = ty; d.at = 0; d.adur = dur; d.arcH = h; d.vz = 0;
  }

  pickSwim(d) {
    for (let k = 0; k < 8; k++) {
      const a = rand(TAU), r = Math.sqrt(rand(0, 1)) * 0.78;
      const x = POND.x + Math.cos(a) * POND.rx * r, y = POND.y + Math.sin(a) * POND.ry * r;
      d.wx = x; d.wy = y; d.wt = rand(1.5, 3.5);
      if (dist(x, y, d.x, d.y) > 60) return;
    }
  }

  pushOut(o, k = 1, mx = 0, my = 0) {
    const dx = o.x - POND.x, dy = o.y - POND.y;
    const u = (dx / (POND.rx * k + mx)) ** 2 + (dy / (POND.ry * k + my)) ** 2;
    if (u >= 1 || u === 0) return false;
    const s = 1 / Math.sqrt(u);
    o.x = POND.x + dx * s; o.y = POND.y + dy * s;
    return true;
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); this.syncActor(e); e.a.update(dt); }
    for (const d of this.ducks) this.updateDuck(d, dt);
  }

  update(dt) {
    this.t += dt;
    if (this.phase === 'play') {
      this.playT += dt;
      const left = PLAY - this.playT;
      if (!this.rush && left <= RUSH_AT) this.startRush();
      if (this.rush) this.rushT += dt;
      this.spawning(dt);
      if (left <= 0) this.startParade();
    } else if (this.phase === 'parade') {
      this.parade.t += dt;
      this.updateMamaParade(dt);
      if (this.parade.t >= PARADE_T && !this.done) this.finish();
    }
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate(dt);
    for (const e of this.ents) this.pushOut(e, 1, 44, 34);
    if (this.phase === 'play') { this.pickups(); this.swaps(); this.deliveries(dt); }
    for (const d of this.ducks) this.updateDuck(d, dt);
    this.updateMama(dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
    if (this.api.camera) {
      if (this.phase === 'parade') this.api.camera.follow(W / 2 + (this.mama.x - W / 2) * 0.1, H / 2 + 20, 1.05, 1.5);
      else this.api.camera.follow(W / 2, H / 2, 1, 3);
    }
  }

  postUpdate(dt) {
    this.t += dt;
    if (this.phase === 'parade') this.updateMamaParade(dt);
    for (const e of this.ents) { this.movePlayer(e, dt); this.syncActor(e); e.a.update(dt); }
    for (const d of this.ducks) this.updateDuck(d, dt);
    this.updateMama(dt);
  }

  syncActor(e) {
    const a = e.a;
    a.x = e.x; a.y = e.y;
    a.scale = this.baseScale * e.sizeK * depthScale(e.y, { top: 260, near: 1000, far: 0.84, nearScale: 1.04 });
  }

  spawning(dt) {
    const lost = this.ducks.filter((d) => d.state === 'hide' || d.state === 'wander').length;
    this.spawnT -= dt;
    if (lost < this.lostTarget() && this.spawnT <= 0) {
      this.spawnT = this.rush ? rand(0.2, 0.45) : rand(0.45, 1.1);
      if (chance(0.68)) this.spawnInSpot(); else this.spawnWanderer();
    }
    this.goldenT -= dt;
    if (this.goldenT <= 0 && !this.ducks.some((d) => d.golden && d.state === 'wander')) {
      this.goldenT = rand(12, 16);
      this.spawnWanderer(true);
      sfx('sparkle'); snd('dp-golden', 'golden-chime', { vol: 0.6 });
    }
  }

  startRush() {
    this.rush = true; this.rushT = 0;
    sfx('whistle'); snd('dp-rush', 'magic'); fx.flash('#fff6a8', 0.2); fx.shake(8, 0.3);
    for (let k = 0; k < Math.min(10, this.n + 5); k++) this.spawnWanderer();
    for (const e of this.ents) e.a.playOnce('surprised', 0.5);
  }

  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.callCd = Math.max(0, e.callCd - dt); e.swapCd = Math.max(0, e.swapCd - dt); e.callFx = Math.max(0, e.callFx - dt); e.cheerCd = Math.max(0, e.cheerCd - dt);
    let ix = c.x, iy = c.y;
    if (this.easy && !p.isAI) [ix, iy] = this.easyWalk(e, dt);
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    const sp = MAX_SPEED * (p.isAI ? CPU_SPEED[clamp(p.aiLevel ?? 0, 0, 2)] / aiProfile(p).speed : 1);
    e.vx = damp(e.vx, ix * sp, 11, dt); e.vy = damp(e.vy, iy * sp * 0.82, 11, dt);
    e.x = clamp(e.x + e.vx * dt, BOUNDS.x0, BOUNDS.x1); e.y = clamp(e.y + e.vy * dt, BOUNDS.y0, BOUNDS.y1);
    // run around the pond, not through it (sea folk splash along its edge)
    this.pushOut(e, 1, 44, 34);
    if (inPond(e.x, e.y, 1.14) && Math.hypot(e.vx, e.vy) > 200 && chance(dt * 10)) particles.burst(e.x, e.y, { type: 'drop', count: 2, colors: ['#bfeaff', '#fff'], speed: [40, 120] });
    this.pushTrail(e, e.line.length);
    if (c.pressed('a') && e.callCd <= 0 && this.phase !== 'done') {
      // Molly Easy: A with no duckling in range walks her to the nearest lost one and quacks there
      if (this.easy && !p.isAI && this.phase === 'play' && !e.ezNear) e.ezGo = this.nearestLost(e);
      this.quackCall(e);
    }
    const moving = Math.hypot(e.vx, e.vy);
    if (this.phase === 'parade' && p.isAI) { if (!a._once && a.pose !== 'dance') a.setPose('dance'); if (moving > 30) a.moveAnim(e.vx, e.vy, sp, { run: true }); }
    else if (this.done && moving < 40) { if (!a._once && a.pose !== 'celebrate') a.setPose('celebrate'); }
    else a.moveAnim(e.vx, e.vy, sp, { run: moving > sp * 0.6 });
  }

  /** Molly Easy: the stick for a human walking the loop round the pond. */
  easyWalk(e, dt) {
    let near = 0;
    for (const d of this.ducks) if ((d.state === 'hide' || d.state === 'wander') && dist(d.x, d.y, e.x, e.y) < CALL_R + e.a.radius - 20) near++;
    e.ezNear = this.phase === 'play' ? near : 0;
    if (this.phase !== 'play') { e.ezGo = null; return [0, 0]; }
    // either stick still walks her anywhere (like Medium); the loop waits for her
    const st = easySteer(e, e.p.ctrl, dt);
    if (st.pushing) e.ezGo = null;
    if (st.manual && !e.ezGo) { e.ezBack = true; return [st.x, st.y]; }
    const go = e.ezGo;
    if (go && (go.state === 'hide' || go.state === 'wander')) {
      const d = Math.hypot(go.x - e.x, go.y - e.y);
      if (d < CALL_R * 0.6) { e.ezGo = null; e.ezBack = true; if (e.callCd <= 0) this.quackCall(e); return [0, 0]; }
      const wp = this.aroundPond(e.x, e.y, go.x, go.y);   // round the pond, not into it
      const wx = wp.x - e.x, wy = wp.y - e.y, wd = Math.hypot(wx, wy) || 1, k = LOOP_SPEED * 1.15;
      return [wx / wd * k, wy / wd * k];
    }
    e.ezGo = null;
    if (e.ezBack) {
      // back on the loop from wherever she is now (the closest point, no snapping back)
      e.ezBack = false;
      e.ezAng = Math.atan2((e.y - LOOP.y) / LOOP.ry, (e.x - LOOP.x) / LOOP.rx);
    }
    const tx = LOOP.x + Math.cos(e.ezAng) * LOOP.rx, ty = LOOP.y + Math.sin(e.ezAng) * LOOP.ry;
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    // the target point runs ahead along the loop while we keep up with it
    if (d < 140) {
      const v = MAX_SPEED * LOOP_SPEED * 0.82;
      const sp = Math.hypot(LOOP.rx * Math.sin(e.ezAng), LOOP.ry * Math.cos(e.ezAng)) || 1;
      e.ezAng += (v * dt) / sp;
    }
    if (d < 4) return [0, 0];
    const k = LOOP_SPEED * clamp(d / 60, 0.5, 1.15);
    return [dx / d * k, dy / d * k];
  }

  /** Molly Easy: the closest lost duckling to this player (for an A press with none in range). */
  nearestLost(e) {
    let best = null, bd = Infinity;
    for (const d of this.ducks) {
      if (d.state !== 'hide' && d.state !== 'wander') continue;
      const dd = dist(d.x, d.y, e.x, e.y);
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }

  quackCall(e) {
    e.callCd = 0.55; e.callFx = 0.5;
    const a = e.a;
    a.playOnce('wave', 0.35); a.squash(0.2);
    snd('dp-call', 'fish-duck', { vol: 0.7, rate: 0.85 });
    particles.ring(e.x, e.y - 40, '#ffffff', CALL_R, 0.45);
    particles.burst(e.x, e.y - a.height * 0.9, { type: 'note', count: 3, colors: ['#ffd23f', '#ff8fc7', '#7fd3ff'], speed: [80, 160] });
    // the line hops in a wave and quacks back
    e.line.forEach((d, k) => { later(() => { if (d.state === 'follow') { d.vz = 360; d.quack = 0.25; } }, k * 55); });
    if (e.line.length) this.quackSound(e.line[0], 0.4);
    if (this.phase !== 'play') { a.playOnce('cheer', 0.5); return; }
    // pull lost ducklings in range
    let got = 0;
    for (const d of this.ducks) {
      if ((d.state === 'hide' || d.state === 'wander') && dist(d.x, d.y, e.x, e.y) < CALL_R + e.a.radius) { this.join(e, d, true); got++; }
    }
    if (got >= 2) { particles.popText(e.x, e.y - a.height - 60, `+${got}!`, '#ffe066', 54); fx.shake(4, 0.15); }
  }

  separate(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const r = (A.a.radius + B.a.radius) * 0.62;
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy);
      if (d < r && d > 0.01) {
        const k = ((r - d) / d) * 0.5 * Math.min(1, dt * 14);
        A.x -= dx * k; A.y -= (dy / 1.6) * k; B.x += dx * k; B.y += (dy / 1.6) * k;
      }
    }
  }

  pickups() {
    for (const d of this.ducks) {
      if (d.state !== 'hide' && d.state !== 'wander') continue;
      if (d.state === 'hide' && d.peek < 0.6) continue;
      let best = null, bd = 1e9;
      for (const e of this.ents) {
        const r = PICK_R + e.a.radius * 0.6 + (d.spot && d.spot.type === 'lily' ? 30 : 0);
        const dd = dist(e.x, e.y, d.x, d.y);
        if (dd < r && dd < bd) { bd = dd; best = e; }
      }
      if (best) this.join(best, d);
    }
  }

  /** Run through someone's line and one confused duckling swaps to yours. */
  swaps() {
    for (const A of this.ents) {
      if (A.swapCd > 0 || Math.hypot(A.vx, A.vy) < 200) continue;
      for (const B of this.ents) {
        if (B === A || !B.line.length) continue;
        if (A.p.isAI && !B.p.isAI) continue;     // CPUs never borrow from a kid's line
        if (this.easy && !A.p.isAI && !B.p.isAI) continue;   // two Easy kids on the same loop never swap by accident
        const k = B.line.findIndex((d) => dist(d.x, d.y, A.x, A.y) < 40);
        if (k < 0) continue;
        const d = B.line[k];
        B.line.splice(k, 1);
        A.line.push(d); d.owner = A; d.confused = 1.3; d.vz = 420;
        A.swapCd = 1.4; B.swapCd = Math.max(B.swapCd, 0.6);
        sfx('swap'); this.quackSound(d, 0.5);
        particles.burst(d.x, d.y - 40, { type: 'star', count: 6, colors: ['#ffd23f', '#fff'], speed: [80, 180] });
        B.a.playOnce('surprised', 0.4);
        A.a.playOnce('laugh', 0.5);
        break;
      }
    }
  }

  deliveries(dt) {
    for (const e of this.ents) {
      const near = dist(e.x, e.y, NEST.x, NEST.y + 20) < NEST_R;
      if (!near || !e.line.length) {
        if (e.batch >= 4) this.bigBatch(e);
        if (!near) e.batch = 0;
        else if (!e.line.length && e.batch) e.batch = 0;
        continue;
      }
      e.delT -= dt;
      if (e.delT > 0) continue;
      e.delT = 0.09;
      const d = e.line.shift();
      this.deliver(e, d);
      if (!e.line.length && e.batch >= 4) this.bigBatch(e);
    }
  }

  deliver(e, d) {
    const v = d.golden ? 3 : 1;
    e.delivered += v; this.team += v; e.batch++;
    const a = rand(TAU), r = Math.sqrt(rand(0, 1));
    this.startArc(d, 'tonest', NEST.x + Math.cos(a) * 92 * r, NEST.y - 30 + Math.sin(a) * 14 * r, 0.38, 110);
    d.owner = null;
    sfx('collect', { step: Math.min(e.batch, 14) });
    if (e.batch % 3 === 1) this.quackSound(d, 0.45);
    particles.popText(NEST.x + rand(-60, 60), NEST.y - 110, '+' + v, d.golden ? '#ffd23f' : '#ffffff', d.golden ? 60 : 46);
    particles.burst(NEST.x, NEST.y - 60, { type: 'heart', count: 2, colors: ['#ff6fb1', '#ff9ad5'], speed: [60, 160] });
    this.mama.quack = 0.25; this.mama.vz = Math.max(this.mama.vz, 200);
    if (e.cheerCd <= 0) { e.a.playOnce('cheer', 0.5); e.cheerCd = 1.2; }
    if (d.golden) { fx.flash('#fff3b0', 0.12); sfx('star'); particles.burst(NEST.x, NEST.y - 60, { type: 'star', count: 14, colors: ['#ffd23f', '#fff6a8'] }); }
    if (this.team >= this.milestone) {
      this.milestone += 10;
      snd('dp-milestone', 'fanfare', { vol: 0.6 });
      particles.burst(NEST.x, NEST.y - 80, { type: 'confetti', count: 40 });
      particles.popText(NEST.x, NEST.y - 190, `${this.team}!`, '#ffe066', 80);
      fx.shake(6, 0.25);
    }
  }

  bigBatch(e) {
    const n = e.batch; e.batch = 0;
    snd('dp-hooray', 'yay', { vol: 0.8 }); sfx('star'); voice(e.p.charId, 'yay');
    fx.shake(8, 0.3); fx.flash('#ffffff', 0.12);
    particles.burst(NEST.x, NEST.y - 80, { type: 'confetti', count: 30 });
    particles.popText(e.x, e.y - e.a.height - 70, n >= 8 ? 'Super!' : 'Wow!', '#ff6fb1', 64);
    this.api.camera && this.api.camera.punch(NEST.x, NEST.y, 1.18, 0.35);
    e.a.playOnce('celebrate', 0.9); e.a.emote('heart', 1.2);
    this.mama.vz = 420; this.mama.quack = 0.5;
  }

  updateMama(dt) {
    const m = this.mama;
    m.quack = Math.max(0, m.quack - dt);
    if (m.shockCd > 0) m.shockCd -= dt;
    if (m.z > 0 || m.vz) { m.vz -= 1800 * dt; m.z += m.vz * dt; if (m.z <= 0) { m.z = 0; m.vz = 0; } }
    if (this.phase === 'play') {
      // she looks toward whoever is coming with ducklings
      const busy = this.ents.filter((e) => e.line.length).sort((a, b) => dist(a.x, a.y, NEST.x, NEST.y) - dist(b.x, b.y, NEST.x, NEST.y))[0];
      if (busy) m.facing = busy.x > m.x ? 1 : -1;
      if (chance(dt * 0.25)) { m.quack = 0.3; }
    }
  }

  // ------------------------------------------------------------------ parade
  startParade() {
    this.phase = 'parade';
    this.parade = { t: 0 };
    sfx('whistle'); snd('dp-parade', 'fanfare', { vol: 0.8 });
    fx.flash('#ffffff', 0.2);
    particles.confettiRain(W, 120);
    // every duckling still in a line counts for its leader
    for (const e of this.ents) {
      for (const d of e.line) { const v = d.golden ? 3 : 1; e.delivered += v; this.team += v; particles.popText(d.x, d.y - 70, '+' + v, '#fff', 36); }
      e.line = [];
      e.a.playOnce('cheer', 0.8);
    }
    const m = this.mama;
    m.walking = true;
    m.ang = Math.atan2((m.y - POND.y) / PARADE_RY, (m.x - POND.x) / PARADE_RX);
    // the parade route is laid out behind mama all the way round the pond, so
    // every duckling dashes straight to its place in line
    m.trail = [];
    for (let k = 0; k <= 160; k++) {
      const a = m.ang - TAU * 0.97 + (k / 160) * TAU * 0.97;
      m.trail.push({ x: POND.x + Math.cos(a) * PARADE_RX, y: POND.y + Math.sin(a) * PARADE_RY });
    }
    this.paradeSp = clamp((TAU * 0.92 * (PARADE_RX + PARADE_RY) / 2) / Math.max(1, this.ducks.length + 2), 22, 46);
    const order = shuffle(this.ducks.slice());
    order.sort((a, b) => (b.golden ? 1 : 0) - (a.golden ? 1 : 0));
    order.forEach((d, i) => {
      d.pi = i; d.owner = null; if (d.spot) { d.spot.duck = null; d.spot = null; }
      const tp = { x: m.x - 50 - i * 6, y: m.y };
      this.startArc(d, 'jumpout', d.x + (tp.x - d.x) * 0.15, d.y + (tp.y - d.y) * 0.15, 0.4 + rand(0.2), 90);
    });
  }

  updateMamaParade(dt) {
    const m = this.mama;
    m.ang += dt * 0.5;
    const tx = POND.x + Math.cos(m.ang) * PARADE_RX, ty = POND.y + Math.sin(m.ang) * PARADE_RY;
    m.x = damp(m.x, tx, 4, dt); m.y = damp(m.y, ty, 4, dt);
    m.facing = Math.cos(m.ang + Math.PI / 2) > 0 ? 1 : -1;
    const last = m.trail[m.trail.length - 1];
    if (Math.hypot(m.x - last.x, m.y - last.y) >= 7) m.trail.push({ x: m.x, y: m.y });
    if (m.trail.length > 1200) m.trail.shift();
    if (chance(dt * 2.5)) { m.quack = 0.25; particles.burst(m.x + m.facing * 60, m.y - 170, { type: 'note', count: 1, colors: ['#ff6fb1', '#ffd23f', '#7fd3ff'], speed: [40, 100] }); }
    if (chance(dt * 1.2)) snd('dp-quack', 'fish-duck', { vol: 0.4, rate: 0.8 });
    if (chance(dt * 3)) particles.burst(rand(200, W - 200), rand(300, 900), { type: 'confetti', count: 3 });
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), c = p.ctrl;
    if (this.phase !== 'play') {
      // parade: bop along near the pond
      if (e.brain.ready(dt)) { e.wx = clamp(e.x + rand(-160, 160), BOUNDS.x0, BOUNDS.x1); e.wy = clamp(e.y + rand(-80, 80), BOUNDS.y0, BOUNDS.y1); e.brain.wait(rand(0.8, 1.6)); if (chance(0.4)) c.press('a'); }
      const d = steer(p, e.x, e.y, e.wx, e.wy, { arrive: 80 }); if (d < 20) c.move(0, 0);
      return;
    }
    const left = PLAY - this.playT;
    if (e.brain.ready(dt)) {
      e.target = null; e.wander = 0;
      const lost = this.ducks.filter((d) => d.state === 'hide' || d.state === 'wander');
      const goHome = e.line.length >= e.goal || (left < 7 && e.line.length > 0) || (e.line.length && !lost.length);
      if (goHome) { e.target = 'nest'; e.goal = randInt(3, 7); }
      else if (chance(prof.mistake * 1.4)) { e.wander = rand(0.6, 1.4); e.wx = rand(200, W - 200); e.wy = rand(320, 960); }
      else if (lost.length) {
        let pool = lost;
        if (!chance(prof.mistake)) {
          // nearest few, preferring the golden one
          pool = lost.slice().sort((a, b) => (dist(a.x, a.y, e.x, e.y) - (a.golden ? 300 : 0)) - (dist(b.x, b.y, e.x, e.y) - (b.golden ? 300 : 0))).slice(0, 2);
        }
        e.target = pick(pool);
      }
      e.brain.wait(reactionTime(p) + rand(0.2, 0.5));
    }
    let tx = e.x, ty = e.y;
    if (e.wander > 0) { e.wander -= dt; tx = e.wx; ty = e.wy; }
    else if (e.target === 'nest') { tx = NEST.x; ty = NEST.y + 40; if (!e.line.length) e.target = null; }
    else if (e.target && (e.target.state === 'hide' || e.target.state === 'wander')) {
      tx = e.target.x; ty = e.target.y;
      if (dist(e.x, e.y, tx, ty) < CALL_R * 0.8 && chance(dt * (0.6 + (p.aiLevel || 0) * 0.5))) c.press('a');
    } else if (e.target) e.target = null;
    // walk around the pond, not into it
    const wp = this.aroundPond(e.x, e.y, tx, ty);
    const d = steer(p, e.x, e.y, wp.x, wp.y, { arrive: 50 });
    if (d < 8) c.move(0, 0);
  }

  aroundPond(x, y, tx, ty) {
    let blocked = false;
    for (let k = 1; k < 8; k++) { const f = k / 8; if (inPond(lerp(x, tx, f), lerp(y, ty, f), 1.12)) { blocked = true; break; } }
    if (!blocked) return { x: tx, y: ty };
    const a0 = Math.atan2((y - POND.y) / POND.ry, (x - POND.x) / POND.rx);
    const a1 = Math.atan2((ty - POND.y) / POND.ry, (tx - POND.x) / POND.rx);
    let da = a1 - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const a = a0 + Math.sign(da || 1) * 0.75;
    return { x: POND.x + Math.cos(a) * (POND.rx + 70), y: POND.y + Math.sin(a) * (POND.ry + 60) };
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true; this.phase = 'done';
    const scores = this.ents.map((e) => e.delivered);
    const top = Math.max(...scores);
    const tops = scores.filter((s) => s === top).length;
    const highlight = top > 0 && tops === 1 && this.n > 1 ? scores.indexOf(top) : null;
    for (const e of this.ents) { e.a.clearEmotes(); e.a.setPose('celebrate'); }
    snd('dp-hooray', 'yay');
    this.api.finish({
      showcase: true, highlight, title: `${this.team} ducklings home!`,
      stats: scores.map((s) => `${s} duckling${s === 1 ? '' : 's'}`),
      focus: { x: this.mama.x, y: this.mama.y - 80, zoom: 1.2 },
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    const bg = art('bg/duckling-parade');
    if (bg) g.drawImage(bg, 0, 0, W, H); else drawMeadow(g, this.t, this.decor);
    // home glow: pulse a ring at the nest while someone carries ducklings
    if (this.phase === 'play' && this.ents.some((e) => e.line.length)) {
      const k = 0.5 + 0.5 * Math.sin(this.t * 6);
      g.save(); g.globalAlpha = 0.25 + k * 0.25; g.strokeStyle = '#fff6a8'; g.lineWidth = 10; g.setLineDash([26, 18]); g.lineDashOffset = -this.t * 60;
      g.beginPath(); g.ellipse(NEST.x, NEST.y + 20, NEST_R, NEST_R * 0.42, 0, 0, TAU); g.stroke(); g.restore();
    }
    // lily pads (on the water), swimmers
    for (const s of this.spots) if (s.type === 'lily') this.drawSpot(g, s);
    for (const d of this.ducks) if (d.state === 'swim') this.drawDuck(g, d);
    // everything that stands on the ground, sorted by depth
    const items = [];
    for (const s of this.spots) if (s.type !== 'lily') items.push({ y: s.y, f: () => this.drawSpot(g, s) });
    items.push({ y: NEST.y + 4, f: () => this.drawNestAll(g) });
    items.push({ y: this.mama.y, f: () => this.drawMamaDuck(g) });
    for (const d of this.ducks) {
      if (d.state === 'follow' || d.state === 'wander' || d.state === 'parade' || d.state === 'jumpout' || (d.state === 'hopin' && d.at / d.adur < 0.5) || (d.state === 'tonest' && d.at / d.adur < 0.6)) items.push({ y: d.y, f: () => this.drawDuck(g, d) });
      else if (d.state === 'hopin' || d.state === 'tonest') items.push({ y: NEST.y + 50, f: () => this.drawDuck(g, d) });
    }
    for (const e of this.ents) items.push({ y: e.y, f: () => this.drawPlayer(g, e) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();
    // tags + home arrows
    for (const e of this.ents) {
      const a = e.a;
      if (this.t < 6 || !e.p.isAI) ui.playerTag(g, e.p, e.x, e.y - a.height - 22 - (a.emotes.length ? 50 : 0));
      if (this.phase === 'play' && e.line.length >= 3 && dist(e.x, e.y, NEST.x, NEST.y) > NEST_R + 60 && !(this.easy && !e.p.isAI)) this.drawHomeArrow(g, e);
    }
    if (this.easy && this.phase === 'play') {
      // Molly Easy: lost ducklings in quack range sparkle, and a big A says "quack now!"
      for (const e of this.ents) {
        if (e.p.isAI || !e.ezNear) continue;
        for (const d of this.ducks) {
          if ((d.state !== 'hide' && d.state !== 'wander') || dist(d.x, d.y, e.x, e.y) >= CALL_R + e.a.radius - 20) continue;
          const b = Math.abs(Math.sin(this.t * 6 + d.id)) * 14;
          g.save(); g.translate(d.x, d.y - 78 - b); g.fillStyle = e.p.color; g.strokeStyle = NAVY; g.lineWidth = 4;
          g.beginPath(); g.moveTo(-18, -22); g.lineTo(18, -22); g.lineTo(0, 4); g.closePath(); g.fill(); g.stroke(); g.restore();
        }
        if (e.callCd <= 0) ui.glyph(g, 'a', e.x + 64, e.y - e.a.height - 60, 60, { pulse: true });
      }
    }
  }

  drawPlayer(g, e) {
    const a = e.a;
    if (e.callFx > 0) {
      const k = 1 - e.callFx / 0.5;
      g.save(); g.globalAlpha = (1 - k) * 0.5; g.strokeStyle = e.p.color; g.lineWidth = 8;
      g.beginPath(); g.ellipse(e.x, e.y, 60 + k * CALL_R, (60 + k * CALL_R) * 0.45, 0, 0, TAU); g.stroke(); g.restore();
    }
    a.draw(g, { ring: e.p.color });
  }

  drawHomeArrow(g, e) {
    const ang = Math.atan2(NEST.y - e.y, NEST.x - e.x);
    const r = 90 + Math.sin(this.t * 8) * 10;
    g.save(); g.translate(e.x + Math.cos(ang) * r, e.y - 30 + Math.sin(ang) * r * 0.6); g.rotate(ang);
    g.globalAlpha = 0.9;
    g.fillStyle = e.p.color; g.strokeStyle = NAVY; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(26, 0); g.lineTo(-6, -20); g.lineTo(-6, -8); g.lineTo(-24, -8); g.lineTo(-24, 8); g.lineTo(-6, 8); g.lineTo(-6, 20); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  drawSpot(g, s) {
    const t = this.t, d = s.duck;
    s.wob = Math.max(0, s.wob - 1 / 60);
    const wob = Math.sin(t * 20) * s.wob * 0.08;
    g.save(); g.translate(s.x, s.y);
    if (s.type === 'lily') {
      const bob = Math.sin(t * 1.5 + s.i) * 3;
      g.translate(0, bob);
      if (!drawArt(g, 'prop/lily-pad', 0, 0, 150, 90)) drawLily(g, t);
      g.restore();
      if (d && d.state === 'hide') this.drawDuck(g, d, { x: s.x + 6, y: s.y + 2 + bob });
      return;
    }
    const ds = depthScale(s.y, { top: 260, near: 1000, far: 0.85 });
    g.scale(ds, ds); g.rotate(wob);
    const side = s.side;
    if (s.type === 'boot') {
      // art: the cuff opening is left of centre (the toe points right); the duckling stands
      // inside it: in front of the opening's back rim, behind its front lip. Opening ellipse
      // measured from prop/rubber-boot (art x 6..100, y 2..12 of 160x190, drawn at 0.737).
      const bootArt = drawArt(g, 'prop/rubber-boot', 0, 0, 120, 140, { anchor: 'bottom' });
      if (!bootArt) drawBoot(g);
      if (d && d.state === 'hide') {
        const [cx, cy, rx, ry] = bootArt ? [-20, -135, 35, 4.5] : [-4, -120, 30, 9];
        g.beginPath(); g.moveTo(-200, -400); g.lineTo(200, -400); g.lineTo(200, cy); g.lineTo(cx + rx, cy);
        g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI); g.lineTo(-200, cy); g.closePath(); g.clip();
        g.rotate(-wob); g.scale(1 / ds, 1 / ds); g.rotate(wob); g.translate(-s.x, -s.y);
        this.drawDuck(g, d, { x: s.x + cx * ds, y: s.y + (bootArt ? -110 : -92) * ds });
      }
      g.restore();
      return;
    }
    // reeds / bush / mushroom: the duckling hides behind it and peeks out of the side.
    // [hidden, peeking] offsets from the spot centre (spot px), fitted by pixel coverage
    // of prop/duckling behind each art: 0% of her shows at the first, ~75% at the second.
    const PEEK = { reeds: [30, 95], bush: [63, 98], mushroom: [8, 56] };
    if (d && d.state === 'hide') {
      const [h0, h1] = PEEK[s.type];
      d.facing = side;   // looking out, away from her hiding place
      // back to world space (drawDuck applies its own depth scale), keeping the spot's wobble
      g.save(); g.rotate(-wob); g.scale(1 / ds, 1 / ds); g.rotate(wob); g.translate(-s.x, -s.y);
      this.drawDuck(g, d, { x: s.x + side * lerp(h0, h1, d.peek) * ds, y: s.y - 10 * ds });
      g.restore();
    }
    // reeds art has ~40% empty headroom: draw it bigger so the clump itself is ~145 px tall
    if (s.type === 'reeds') { if (!drawArt(g, 'prop/reeds', 0, 0, 200, 235, { anchor: 'bottom' })) drawReeds(g, t); }
    else if (s.type === 'bush') { if (!drawArt(g, 'prop/flower-bush', 0, 0, 200, 146, { anchor: 'bottom' })) drawBush(g, t); }
    else if (!drawArt(g, 'prop/dp-mushroom', 0, 0, 140, 151, { anchor: 'bottom' })) drawMushroom(g);
    g.restore();
  }

  drawNestAll(g) {
    g.save(); g.translate(NEST.x, NEST.y + 30);
    const hasArt = drawArt(g, 'prop/duck-nest', 0, 0, 300, 165, { anchor: 'bottom' });
    if (!hasArt) drawNest(g, false);
    g.restore();
    const inNest = this.ducks.filter((d) => d.state === 'nest').sort((a, b) => a.y - b.y);
    for (const d of inNest) this.drawDuck(g, d, { x: d.x, y: d.y + 10 });
    g.save(); g.translate(NEST.x, NEST.y + 30);
    if (hasArt && inNest.length) {
      // front rim: the art again, clipped below the bowl's front straw edge (traced from
      // prop/duck-nest, 400x220 art px, drawn at 0.75 bottom-centred) so the ducklings sit in it
      g.beginPath();
      NEST_RIM.forEach(([ax, ay], k) => { const px = (ax - 200) * 0.75, py = -165 + ay * 0.75; if (k) g.lineTo(px, py); else g.moveTo(px, py); });
      g.lineTo(160, 10); g.lineTo(-160, 10); g.closePath(); g.clip();
      drawArt(g, 'prop/duck-nest', 0, 0, 300, 165, { anchor: 'bottom' });
    } else if (!hasArt) drawNest(g, true);
    g.restore();
  }

  drawMamaDuck(g) {
    const m = this.mama;
    const ds = depthScale(m.y, { top: 260, near: 1000, far: 0.85 });
    g.save();
    g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(m.x, m.y, 70 * ds, 16 * ds, 0, 0, TAU); g.fill();
    const bob = m.walking ? -Math.abs(Math.sin(this.t * 9)) * 8 : 0;
    g.translate(m.x, m.y - m.z + bob);
    const sq = m.vz > 0 ? 0.06 : 0;
    g.scale(ds * m.facing * (1 - sq), ds * (1 + sq));
    if (!drawArt(g, 'prop/mama-duck', 0, 0, 170, 170, { anchor: 'bottom' })) drawMama(g, this.t, { walk: m.walking, quack: m.quack > 0 });
    g.restore();
    if (this.phase === 'parade') {
      // a little parade flag for mama
      g.save(); g.translate(m.x - m.facing * 40 * ds, m.y - m.z + bob - 120 * ds);
      g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -90); g.stroke();
      g.fillStyle = RAINBOW[Math.floor(this.t * 4) % RAINBOW.length];
      g.beginPath(); g.moveTo(0, -90); g.quadraticCurveTo(-m.facing * 30, -80 + Math.sin(this.t * 10) * 6, -m.facing * 56, -74); g.lineTo(0, -58); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }

  drawDuck(g, d, at = null) {
    const x = at ? at.x : d.x, y = at ? at.y : d.y;
    const swim = d.state === 'swim' || (d.state === 'follow' && inPond(d.x, d.y, 0.95));
    const ds = depthScale(y, { top: 260, near: 1000, far: 0.85 }) * (d.golden ? 1.12 : 1);
    const t = this.t;
    const hop = d.state === 'hide' || d.state === 'nest' || swim ? Math.abs(Math.sin(d.hop)) * 2 : Math.abs(Math.sin(d.hop)) * 7;
    g.save();
    if (!swim && d.state !== 'nest') { g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(x, y, 24 * ds, 7 * ds, 0, 0, TAU); g.fill(); }
    const ring = (a0, a1) => { g.save(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y - d.z - hop - 8 * ds, 30 * ds, 7 * ds, 0, a0, a1); g.stroke(); g.restore(); };
    if (swim) ring(Math.PI, TAU);   // back half of the ripple, behind her
    if (d.golden) {
      const k = 0.6 + Math.sin(t * 6) * 0.2;
      const gr = g.createRadialGradient(x, y - 30, 4, x, y - 30, 70);
      gr.addColorStop(0, `rgba(255,236,120,${k})`); gr.addColorStop(1, 'rgba(255,236,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y - 30, 70, 0, TAU); g.fill();
    }
    g.translate(x, y - d.z - hop);
    if (swim) {
      // waterline: the front half of the ripple ring drawn below, so she sits in the water
      g.beginPath(); g.moveTo(-60 * ds, -130 * ds); g.lineTo(60 * ds, -130 * ds); g.lineTo(60 * ds, -8 * ds); g.lineTo(30 * ds, -8 * ds);
      g.ellipse(0, -8 * ds, 30 * ds, 7 * ds, 0, 0, Math.PI); g.lineTo(-60 * ds, -8 * ds); g.closePath(); g.clip();
      g.translate(0, 12 * ds);
    }
    let fx_ = d.facing;
    if (d.twirl > 0) fx_ = Math.cos((0.7 - d.twirl) * 26) * d.facing;
    const wind = d.sneeze > 0 ? 0.22 : 0;
    g.scale(ds * fx_, ds);
    g.rotate(-wind * 0.8 + (d.confused > 0 ? Math.sin(t * 18) * 0.12 : 0));
    const quack = d.quack > 0;
    const key = quack ? 'prop/duckling-quack' : 'prop/duckling';
    const drew = (d.golden && drawArt(g, 'prop/duckling-golden', 0, -36, 80, 80)) || drawArt(g, key, 0, -36, 80, 80) || (quack && drawArt(g, 'prop/duckling', 0, -36, 80, 80));
    if (!drew) {
      drawDuckling(g, { quack, golden: d.golden, swim, blink: d.blinkT < 0, wing: quack ? 1 : 0, eyesShut: wind > 0 });
    } else {
      // the art duckling's head sits higher and more centred than the drawn one (3/4 view)
      if (d.golden) { g.save(); g.translate(-18, -30); drawSparkleShape(g, 12, '#fff'); g.restore(); }
      g.translate(d.hat === 'glasses' ? -17 : -12, d.hat === 'glasses' ? -5 : -9);
    }
    drawHat(g, d.hat, t + d.id);
    g.restore();
    if (swim) ring(0, Math.PI);   // front half: the waterline she's clipped to
    if (d.confused > 0) drawEmote(g, 'question', x, y - 92 * ds - d.z, 30, 1.3 - d.confused);
  }

  drawHUD(g) {
    if (this.phase === 'play') ui.timer(g, PLAY - this.playT);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.delivered), { y: 985, format: (v) => String(v), out: null });
    // team counter: mama + ducklings home
    const x = W - 250, y = 26;
    ui.panel(g, x, y, 220, 84, { r: 40, fill: '#fff8d6', stroke: '#ffb03f', lineWidth: 6 });
    const hq = Math.sin(this.t * 4) > 0.8;
    g.save(); g.translate(x + 52, y + 74); g.scale(0.82, 0.82);
    if (!drawArt(g, hq ? 'prop/duckling-quack' : 'prop/duckling', 0, -36, 80, 80)) drawDuckling(g, { quack: hq });
    g.restore();
    ui.text(g, '×', x + 108, y + 44, { size: 36, color: NAVY, stroke: false });
    ui.text(g, String(this.team), x + 166, y + 44, { size: this.team > 99 ? 40 : 52, color: NAVY, stroke: false, weight: 800 });
    if (this.rush && this.rushT < 2.4 && this.phase === 'play') {
      g.save(); g.globalAlpha = clamp(2.4 - this.rushT, 0, 1);
      ui.banner(g, 'Duckling Rush!', this.rushT, { y: 520, size: 140, color: '#ffd23f' });
      g.restore();
    }
    if (this.phase === 'parade' && this.parade.t < 2.6) {
      g.save(); g.globalAlpha = clamp(2.6 - this.parade.t, 0, 1);
      ui.banner(g, 'Parade time!', this.parade.t, { y: 300, size: 140, color: '#ff8fc7' });
      g.restore();
    }
  }
}
