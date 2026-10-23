// Silly Garden (Molly Party): run around a garden of dirt patches. Hold A on
// an empty patch to plant a seed, keep holding beside it to water it with
// your watering can. Every plant shoots up into a silly surprise: a giant
// giggling sunflower, a carrot that pops out and waves, bouncing
// strawberries (one hops off and plants itself!), a pumpkin that rolls away
// across the lawn (the patch is free again) and a sneezy flower whose
// pollen blast blows everyone back and makes nearby plants grow. A happy
// rain cloud drifts by now and then. Ends with a garden party: butterflies,
// dancing plants and confetti. Everyone who helped a plant grow gets it.
//
// Art hooks (all optional, procedural fallbacks ship today): bg/garden-grow,
//   prop/gg-dirt gg-sprout gg-bud gg-sunflower(-giggle) gg-carrot
//   gg-strawberry-bush gg-strawberry gg-pumpkin gg-vine gg-sneeze-flower(-achoo)
//   gg-watering-can gg-butterfly gg-rain-cloud
// Sounds (optional files, synth/manifest fallbacks): gg-plant gg-water gg-pop
//   gg-sprout gg-giggle gg-carrot gg-boing gg-whee gg-roll gg-achoo gg-rain gg-party
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, hasArt } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { easySteer, easyPrompt } from '../engine/easy.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { clamp, approach, rand, pick, chance, shuffle, TAU, ease } from '../engine/util.js';
import { drawSparkleShape } from '../engine/emotes.js';
import {
  KINDS, drawDirt, drawSeed, drawSprout, drawBud, drawSunflower, drawCarrot, drawStrawberryBush, drawStrawberry,
  drawPumpkin, drawVine, drawSneezy, drawCan, drawButterfly, drawRainCloud,
} from './garden-grow/plants.js';
import { meta } from './garden-grow.meta.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export { meta };

// --- tuning -----------------------------------------------------------------
const DURATION = 50;
const PARTY_T = 4.2;
const ROWS = [540, 715, 890];
const COLS = [380, 670, 960, 1250, 1540];
const SPEED = 560;
const X_MIN = 80, X_MAX = W - 80, Y_MIN = 420, Y_MAX = 1015;
const REACH = 130;
const PLANT_S = 0.84;
// prop/gg-dirt (260x140 art px, drawn 200 wide centred): top outline of the mound's front
// clods, left to right; the carrot rises out of the hole behind them
const DIRT_FRONT = [[0, 66], [40, 68], [60, 72], [72, 74], [80, 77], [85, 84], [95, 86], [112, 86], [130, 86], [145, 87],
  [150, 85], [158, 81], [165, 78], [175, 75], [188, 73], [200, 70], [260, 66]];
/** Path: the front-clod line (plot-local, scaled sx, sy), closed off at height `toY` (below: 64, above: -400). */
function dirtFrontPath(g, sx, sy, toY) {
  const k = 200 / 260;
  g.beginPath();
  DIRT_FRONT.forEach(([ax, ay], i) => { const px = (ax - 130) * k * sx, py = (ay - 70) * k * sy; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
  g.lineTo(110, toY); g.lineTo(-110, toY); g.closePath();
}
const KIND_DECK = ['sunflower', 'carrot', 'strawberry', 'pumpkin', 'sneezy'];

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: humans walk to the next patch by themselves, hold A
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.started = false;
    this.timeLeft = DURATION;
    this.phase = 'play';
    // the growing clock, shown all game (the bloom party follows it)
    api.limit(() => (this.phase === 'play' ? this.timeLeft : null), { showAt: Infinity });
    this.partyT = 0;
    this.finished = false;
    this.grown = 0;             // team total: plants grown together
    this.scale = n <= 4 ? 0.9 : n <= 6 ? 0.82 : 0.76;
    // one gardener grows a plant in ~1.6 s; more gardeners each water a bit slower
    this.waterRate = 1 / (1.5 * Math.pow(n, 0.3));
    this.deck = [];
    this.plots = [];
    for (const y of ROWS) for (const x of COLS) this.plots.push(this.newPlot(x, y));
    this.pumpkins = [];
    this.hoppers = [];     // strawberries hopping to a new patch
    this.leavers = [];     // grown plants zooming off to free their patch
    this.butterflies = [];
    this.rain = null; this.rainT = rand(11, 14);
    this.waterGate = 0; this.boingGate = 0;
    this.bgClouds = Array.from({ length: 5 }, (_, i) => ({ x: rand(W), y: 70 + (i % 3) * 60, s: rand(0.6, 1), v: rand(12, 26) }));
    this.ents = this.players.map((p, i) => {
      const a = new Actor(p, { scale: this.scale });
      const minH = 140 * this.scale;
      if (a.height < minH) a.scale *= minH / a.height;
      const x = n === 1 ? W / 2 : 300 + ((W - 600) * i) / (n - 1);
      const y = i % 2 ? 800 : 628;
      a.x = x; a.y = y; a.facing = x < W / 2 ? 1 : -1;
      const e = { p, a, i, x, y, vx: 0, vy: 0, pvx: 0, pvy: 0, base: a.scale, score: 0, watering: null, canT: 0, stun: 0, brain: new Brain(p), plot: null, wander: 0, wx: x, wy: y, holdOff: 0, popT: 0, popN: 0 };
      a.attach((g, info) => this.drawHeld(g, info, e));
      if (this.easy && !p.isAI) e.ez = { plot: null, think: 0 };
      return e;
    });
  }

  newPlot(x, y) {
    return { x, y, state: 'empty', kind: null, water: 0, helpers: new Set(), t: 0, sq: 0, wet: 0, hi: 0, giggle: 0, nextT: 0, charge: 0, achoo: 0, hop: 0, berries: null, pop: 0 };
  }

  nextKind() {
    if (!this.deck.length) this.deck = shuffle(KIND_DECK.slice());
    return this.deck.pop();
  }

  // ------------------------------------------------------------------ update
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
    for (const e of this.ents) {
      if (e.p.isAI && playing) this.aiThink(e, dt);
      this.movePlayer(e, dt, playing);
    }
    this.pushPlayers();
    if (playing) for (const e of this.ents) this.interact(e, dt);
    this.updatePlots(dt);
    this.updatePumpkins(dt);
    this.updateHoppers(dt);
    this.updateLeavers(dt);
    this.updateRain(dt, playing);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }
    if (playing && this.timeLeft <= 0) this.startParty();
    if (this.phase === 'party') {
      this.partyT += dt;
      this.partyQT -= dt;
      if (this.partyQT <= 0 && this.partyQ.length) {
        this.partyQT = 0.14;
        const pl = this.partyQ.shift();
        pl.helpers = new Set(); pl.kind = pl.kind || this.nextKind(); if (pl.kind === 'pumpkin') pl.kind = 'sunflower';
        this.bloom(pl);
      }
      if (Math.random() < dt * 4) particles.burst(rand(200, W - 200), rand(450, 900), { type: pick(['heart', 'star', 'sparkle', 'petal']), count: 8, colors: RAINBOW, speed: [80, 220] });
      if (!this.finished && this.partyT > PARTY_T) this.finish();
    }
  }

  postUpdate(dt) {
    this.t += dt;
    this.ambient(dt);
    this.updatePlots(dt);
    this.updatePumpkins(dt);
    this.updateLeavers(dt);
    for (const e of this.ents) { this.movePlayer(e, dt, false); this.placeActor(e); e.a.update(dt); }
  }

  ambient(dt) {
    for (const c of this.bgClouds) { c.x += c.v * dt; if (c.x > W + 200) c.x = -200; }
    this.waterGate -= dt; this.boingGate -= dt;
    const party = this.phase === 'party';
    for (const b of this.butterflies) {
      b.t += dt;
      b.retarget -= dt;
      if (b.retarget <= 0) {
        b.retarget = rand(1.2, 2.6);
        const grown = this.plots.filter((p) => p.state === 'grown');
        if (party) { b.tx = rand(150, W - 150); b.ty = rand(300, 900); }
        else if (grown.length && chance(0.8)) { const p = pick(grown); b.tx = p.x + rand(-60, 60); b.ty = p.y - rand(120, 260); }
        else { b.tx = rand(150, W - 150); b.ty = rand(250, 700); }
      }
      const sp = party ? 5 : 2.2;
      b.vx += ((b.tx - b.x) * sp - b.vx) * dt * 2; b.vy += ((b.ty - b.y) * sp - b.vy) * dt * 2;
      b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(b.t * 6 + b.ph) * 40 * dt;
    }
  }

  placeActor(e) {
    const a = e.a;
    a.x = e.x; a.y = e.y;
    a.scale = e.base * depthScale(e.y, { top: 400, near: 1000, far: 0.86, nearScale: 1.04 });
  }

  movePlayer(e, dt, playing) {
    const c = e.p.ctrl, a = e.a;
    e.stun = Math.max(0, e.stun - dt);
    e.popT = Math.max(0, e.popT - dt);
    let ix = playing && e.stun <= 0 ? c.x : 0, iy = playing && e.stun <= 0 ? c.y : 0;
    if (e.ez) [ix, iy] = playing && e.stun <= 0 ? this.easyPilot(e, dt) : [0, 0];
    const len = Math.hypot(ix, iy); if (len > 1) { ix /= len; iy /= len; }
    const slow = e.watering ? 0.35 : 1;
    e.vx = approach(e.vx, ix * SPEED * slow, 4200 * dt);
    e.vy = approach(e.vy, iy * SPEED * 0.85 * slow, 4200 * dt);
    e.pvx *= Math.exp(-4 * dt); e.pvy *= Math.exp(-4 * dt);
    e.x = clamp(e.x + (e.vx + e.pvx) * dt, X_MIN, X_MAX);
    e.y = clamp(e.y + (e.vy + e.pvy) * dt, Y_MIN, Y_MAX);
    if (this.phase === 'party') { if (!a._once) a.setPose(e.i % 2 ? 'dance' : 'celebrate'); return; }
    if (e.stun > 0) { if (!a._once) a.setPose('dizzy'); return; }
    if (e.watering) {
      a.facing = e.watering.x >= e.x ? 1 : -1;
      if (!a._once && a.pose !== 'water') a.setPose('water');
    } else if (!a._once) a.moveAnim(e.vx, e.vy, SPEED, { run: Math.hypot(e.vx, e.vy) > 380 });
  }

  pushPlayers() {
    // sized from the sprites, a little snug so friends can share a patch
    spread(this.ents, { radius: (e) => bodyRadius(e.a) * 0.7, yScale: 1.8, strength: 1, bounds: { x0: X_MIN, x1: X_MAX, y0: Y_MIN, y1: Y_MAX } });
  }

  nearestPlot(e, max = REACH) {
    let best = null, bd = max;
    for (const p of this.plots) {
      const d = Math.hypot(p.x - e.x, (p.y - e.y) * 1.4);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  interact(e, dt) {
    const c = e.p.ctrl;
    e.canT = Math.max(0, e.canT - dt);
    const held = c.held('a') && e.stun <= 0;
    if (!held) { if (e.watering) { e.watering = null; e.a.setPose('idle'); } return; }
    const pl = (e.watering && Math.hypot(e.watering.x - e.x, (e.watering.y - e.y) * 1.4) < REACH * 1.25) ? e.watering : this.nearestPlot(e);
    if (!pl) { e.watering = null; return; }
    if (pl.state === 'empty') { this.plant(e, pl); return; }
    if (pl.state === 'seed' || pl.state === 'sprout' || pl.state === 'bud') {
      e.watering = pl; e.canT = 0.3;
      pl.helpers.add(e);
      pl.water += this.waterRate * dt * (e.p.isAI ? 0.85 : 1.1);
      pl.wet = Math.min(1, pl.wet + dt * 2);
      if (Math.random() < dt * 30) {
        const sx = e.x + e.a.facing * e.a.height * 0.45, sy = e.y - e.a.height * 0.55;
        particles.burst(sx, sy, { type: 'drop', count: 1, colors: ['#7fd3ff', '#bfe9ff'], speed: [160, 260], angle: Math.atan2(pl.y - 30 - sy, pl.x - sx), spread: 0.25, size: [7, 11], gravity: 700, life: [0.3, 0.45] });
      }
      if (this.waterGate <= 0) { this.waterGate = 0.28; snd('gg-water', 'water', { vol: 0.25, rate: rand(0.9, 1.1) }); }
      this.growCheck(pl);
    } else { e.watering = null; }
  }

  plant(e, pl) {
    pl.state = 'seed'; pl.kind = this.nextKind(); pl.water = 0; pl.helpers = new Set([e]); pl.t = 0; pl.sq = 0.5;
    snd('gg-plant', 'plant-seed', { vol: 0.7 });
    particles.burst(pl.x, pl.y - 10, { type: 'dust', count: 8, color: '#c07a45', speed: [60, 160] });
    particles.burst(pl.x, pl.y - 30, { type: 'sparkle', count: 4, colors: ['#ffffff', '#fff6a8'] });
    e.a.playOnce('action', 0.25); e.a.squash(0.2);
    e.watering = pl;
  }

  growCheck(pl) {
    const w = pl.water;
    if (pl.state === 'seed' && w >= 0.15) { pl.state = 'sprout'; pl.sq = 0.5; snd('gg-sprout', 'grow', { vol: 0.35, rate: 1.3 }); particles.burst(pl.x, pl.y - 30, { type: 'spark', count: 6, colors: ['#5fd36a', '#bff0a0'] }); }
    else if (pl.state === 'sprout' && w >= 0.55) { pl.state = 'bud'; pl.sq = 0.5; snd('gg-sprout', 'grow', { vol: 0.4, rate: 1.0 }); particles.burst(pl.x, pl.y - 80, { type: 'spark', count: 8, colors: ['#5fd36a', '#bff0a0'] }); }
    else if (pl.state === 'bud' && w >= 1) this.bloom(pl);
  }

  bloom(pl) {
    if (this.phase !== 'party') this.grown++;
    pl.state = 'grown'; pl.t = 0; pl.sq = 0.8; pl.life = rand(8, 11); pl.pop = 0; pl.nextT = rand(1.5, 2.5); pl.giggle = 0; pl.charge = 0; pl.achoo = 0;
    snd('gg-pop', 'bigpop', { vol: 0.8 }); sfx('sparkle');
    fx.shake(8, 0.2);
    const top = pl.y - (pl.kind === 'sunflower' ? 360 : 140);
    particles.burst(pl.x, top, { type: 'star', count: 16, colors: RAINBOW, speed: [160, 380] });
    particles.burst(pl.x, top, { type: 'petal', count: 10, colors: ['#ff9ad5', '#ffd23f', '#ffffff'], speed: [100, 260] });
    particles.ring(pl.x, top, '#ffffff', 200, 0.4);
    const label = { sunflower: 'Hee hee!', carrot: 'Hi-ya!', strawberry: 'Boing!', pumpkin: 'Wheee!', sneezy: 'Ah... ah...' }[pl.kind];
    particles.popText(pl.x, top - 70, label, pick(['#ffd23f', '#ff6fd0', '#6fe3ff', '#7fe08f']), 52);
    if (pl.kind === 'sunflower') { pl.giggle = 1.2; snd('gg-giggle', 'giggle', { vol: 0.8 }); this.api.camera && this.api.camera.punch(pl.x, pl.y - 220, 1.12, 0.3); }
    if (pl.kind === 'carrot') snd('gg-carrot', 'squeak', { vol: 0.6 });
    if (pl.kind === 'strawberry') pl.berries = [0, 1, 2].map((k) => ({ k, h: 0, v: rand(300, 420), sq: 0 }));
    if (pl.kind === 'pumpkin') pl.nextT = 1.1;
    if (pl.kind === 'sneezy') pl.nextT = 1.2;
    // everyone who helped gets it
    for (const e of pl.helpers) {
      e.score++;
      this.pop(e, '+1', '#ffd23f', 48);
      e.a.playOnce('cheer', 0.5); e.a.squash(0.2);
      if (chance(0.5)) voice(e.p.charId, pick(['yay', 'woo', 'laugh']));
      if (!e.p.isAI) e.p.ctrl.rumble(0.35, 90);
      if (e.watering === pl) e.watering = null;
    }
    // a butterfly comes to visit
    if (this.butterflies.length < 14) this.addButterfly(pl.x, top);
  }

  addButterfly(x, y) {
    const cols = [['#ff8fd0', '#ffd0ee'], ['#ffd23f', '#fff3a8'], ['#9b8cff', '#d8d0ff'], ['#6fd3ff', '#d0f3ff'], ['#ff9f6f', '#ffe0c8']];
    const c = pick(cols);
    this.butterflies.push({ x, y, vx: rand(-80, 80), vy: -120, tx: x, ty: y - 150, t: rand(3), ph: rand(TAU), retarget: 0.6, c1: c[0], c2: c[1] });
  }

  updatePlots(dt) {
    for (const pl of this.plots) {
      pl.t += dt; pl.sq = approach(pl.sq, 0, dt * 2.5); pl.wet = Math.max(0, pl.wet - dt * 0.25);
      pl.hi = 0;
      if (pl.state !== 'grown') continue;
      pl.pop = Math.min(1, pl.pop + dt * 3);
      pl.giggle = Math.max(0, pl.giggle - dt);
      pl.nextT -= dt;
      const party = this.phase === 'party';
      if (this.phase === 'play' && pl.kind !== 'pumpkin') { pl.life -= dt; if (pl.life <= 0) { this.leave(pl); continue; } }
      switch (pl.kind) {
        case 'sunflower':
          if (pl.nextT <= 0) { pl.nextT = rand(3, 5); pl.giggle = 1; snd('gg-giggle', 'giggle', { vol: 0.5 }); particles.burst(pl.x, pl.y - 380, { type: 'heart', count: 4, colors: ['#ff6fd0', '#ffd23f'], speed: [60, 160] }); }
          break;
        case 'carrot':
          pl.hop = Math.max(0, pl.hop - dt * 260);
          if (pl.nextT <= 0) { pl.nextT = rand(2.2, 3.4); pl.hopV = 700; snd('gg-boing', 'boing', { vol: 0.45, rate: 1.2 }); }
          if (pl.hopV !== undefined) { pl.hop += pl.hopV * dt; pl.hopV -= 2600 * dt; if (pl.hop <= 0) { pl.hop = 0; pl.hopV = undefined; pl.sq = 0.4; particles.burst(pl.x, pl.y, { type: 'dust', count: 5, color: '#c07a45' }); } }
          break;
        case 'strawberry':
          for (const b of pl.berries) {
            b.v -= 2200 * dt; b.h += b.v * dt; b.sq = approach(b.sq, 0, dt * 4);
            if (b.h <= 0) {
              b.h = 0; b.v = rand(420, 620) * (party ? 1.2 : 1); b.sq = 0.6;
              if (this.boingGate <= 0) { this.boingGate = 0.15; snd('gg-boing', 'boing', { vol: 0.3, rate: rand(1.2, 1.5) }); }
            }
          }
          // now and then a berry bounces off to plant itself on an empty patch
          if (pl.nextT <= 0 && !party && this.phase === 'play') {
            pl.nextT = rand(4, 6);
            const empty = this.plots.filter((q) => q.state === 'empty');
            if (empty.length) {
              const to = empty.sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
              to.state = 'reserved';
              this.hoppers.push({ x: pl.x, y: pl.y - 100, sx: pl.x, sy: pl.y - 100, to, t: 0, dur: 0.9, from: pl });
              snd('gg-boing', 'boing', { vol: 0.6 });
            }
          }
          break;
        case 'pumpkin':
          if (pl.nextT <= 0 && this.phase === 'play') this.launchPumpkin(pl);
          break;
        case 'sneezy':
          if (pl.achoo > 0) pl.achoo = Math.max(0, pl.achoo - dt * 1.6);
          if (pl.nextT <= 1.4 && pl.nextT > 0) pl.charge = 1 - pl.nextT / 1.4;
          if (pl.nextT <= 0) { pl.nextT = rand(3.6, 4.6); pl.charge = 0; this.sneeze(pl); }
          break;
        default: break;
      }
    }
  }

  /** A grown plant's big exit: it zooms off and the patch is free to plant again. */
  leave(pl) {
    const dir = pl.x < W / 2 ? -1 : 1;
    const L = { kind: pl.kind, x: pl.x, y: pl.y, baseY: pl.y, sq: 0, vx: 0, vy: 0, rot: 0, spin: 0, t: 0, g: 0, berries: pl.berries };
    switch (pl.kind) {
      case 'sunflower': L.vy = -900; L.spin = 7; L.g = -300; snd('gg-giggle', 'giggle', { vol: 0.7 }); snd('gg-whee', 'wheee-fall', { vol: 0.5 }); particles.popText(pl.x, pl.y - 400, 'Wheee!', '#ffd23f', 54); break;
      case 'carrot': L.vx = dir * 520; L.vy = -700; L.g = 2400; L.hop = true; snd('gg-boing', 'boing', { vol: 0.6 }); particles.popText(pl.x, pl.y - 200, 'Bye!', '#ff8a2a', 50); break;
      case 'strawberry': L.vx = dir * 420; L.vy = -760; L.g = 2400; L.hop = true; snd('gg-boing', 'boing', { vol: 0.6, rate: 1.3 }); particles.popText(pl.x, pl.y - 180, 'Boing boing!', '#ff3d5e', 46); break;
      case 'sneezy': L.vy = -260; L.vx = dir * 120; L.spin = 1.5; L.g = -200; this.sneeze(pl); break;
      default: break;
    }
    particles.burst(pl.x, pl.y - 20, { type: 'dust', count: 10, color: '#c07a45', speed: [80, 220] });
    particles.burst(pl.x, pl.y - 120, { type: 'sparkle', count: 10, colors: RAINBOW });
    this.leavers.push(L);
    pl.state = 'empty'; pl.kind = null; pl.water = 0; pl.helpers = new Set(); pl.sq = 0.5; pl.berries = null;
  }

  updateLeavers(dt) {
    for (const L of this.leavers) {
      L.t += dt;
      L.vy += L.g * dt; L.x += L.vx * dt; L.y += L.vy * dt; L.rot += L.spin * dt;
      if (L.hop && L.vy > 0 && L.y > L.baseY) { L.y = L.baseY; L.vy = -rand(600, 760); L.sq = 0.4; if (L.x > -100 && L.x < W + 100 && this.boingGate <= 0) { this.boingGate = 0.12; snd('gg-boing', 'boing', { vol: 0.35, rate: 1.2 }); } }
      L.sq = approach(L.sq || 0, 0, dt * 3);
    }
    this.leavers = this.leavers.filter((L) => L.t < 6 && L.x > -250 && L.x < W + 250 && L.y > -500);
  }

  launchPumpkin(pl) {
    // free the patch: the pumpkin rolls away across the lawn
    const dir = pl.x < W / 2 ? 1 : -1;
    const ang = (dir > 0 ? 0 : Math.PI) + rand(-0.5, 0.5);
    this.pumpkins.push({ x: pl.x, y: pl.y - 70, vx: Math.cos(ang) * 420, vy: Math.sin(ang) * 260, rot: 0, t: 0, bounces: 0 });
    pl.state = 'empty'; pl.kind = null; pl.water = 0; pl.helpers = new Set(); pl.sq = 0.4;
    snd('gg-roll', 'whoosh', { vol: 0.6 }); snd('gg-giggle', 'giggle', { vol: 0.4 });
    particles.popText(pl.x, pl.y - 180, 'Bye-bye!', '#ff9a2e', 48);
  }

  updatePumpkins(dt) {
    for (const k of this.pumpkins) {
      k.t += dt;
      k.x += k.vx * dt; k.y += k.vy * dt;
      k.rot += k.vx * dt / 75;
      const out = k.bounces >= 3;
      if (!out) {
        if (k.x < 110 || k.x > W - 110) { k.vx = -k.vx; k.x = clamp(k.x, 110, W - 110); k.bounces++; this.pumpBoing(k); }
        if (k.y < Y_MIN - 40 || k.y > Y_MAX - 40) { k.vy = -k.vy; k.y = clamp(k.y, Y_MIN - 40, Y_MAX - 40); k.bounces++; this.pumpBoing(k); }
      }
      if (Math.random() < dt * 12) particles.burst(k.x, k.y + 60, { type: 'dust', count: 1, color: '#fff', speed: [20, 60] });
      // bump players out of the way (funny, harmless)
      for (const e of this.ents) {
        const dx = e.x - k.x, dy = (e.y - (k.y + 60)) * 1.5, d = Math.hypot(dx, dy);
        if (d < 95 && e.stun <= 0 && this.phase === 'play') {
          const nx = dx / (d || 1), ny = dy / (d || 1);
          e.pvx = nx * 700 + k.vx * 0.4; e.pvy = ny * 420;
          e.stun = 0.55; e.watering = null;
          e.a.playOnce('surprised', 0.5); e.a.squash(0.35);
          snd('gg-boing', 'boing', { vol: 0.6 });
          particles.burst(e.x, e.y - e.a.height * 0.6, { type: 'star', count: 6, colors: ['#ffd23f', '#ff9a2e'] });
          if (chance(0.6)) voice(e.p.charId, 'laugh');
          if (!e.p.isAI) e.p.ctrl.rumble(0.5, 140);
        }
      }
    }
    this.pumpkins = this.pumpkins.filter((k) => k.x > -200 && k.x < W + 200 && k.y > 200 && k.y < H + 200 && k.t < 12);
  }

  pumpBoing(k) {
    if (this.boingGate > 0) return;
    this.boingGate = 0.12; snd('gg-boing', 'boing', { vol: 0.45, rate: 0.8 });
    particles.burst(k.x, k.y + 50, { type: 'dust', count: 6, color: '#fff', speed: [60, 160] });
    fx.shake(4, 0.1);
  }

  updateHoppers(dt) {
    for (const h of this.hoppers) {
      h.t += dt;
      const k = Math.min(1, h.t / h.dur);
      h.x = h.sx + (h.to.x - h.sx) * k;
      h.y = h.sy + (h.to.y - 20 - h.sy) * k - Math.sin(k * Math.PI) * 220;
      if (k >= 1) {
        h.done = true;
        const pl = h.to;
        if (pl.state !== 'reserved') continue;
        pl.state = 'seed'; pl.kind = this.nextKind(); pl.water = 0.12; pl.helpers = new Set(h.from.helpers); pl.sq = 0.6;
        snd('gg-plant', 'plant-seed', { vol: 0.6 });
        particles.burst(pl.x, pl.y - 10, { type: 'dust', count: 8, color: '#c07a45', speed: [60, 160] });
        particles.popText(pl.x, pl.y - 90, 'Plop!', '#ff3d5e', 44);
      }
    }
    this.hoppers = this.hoppers.filter((h) => !h.done);
  }

  sneeze(pl) {
    pl.achoo = 1;
    snd('gg-achoo', 'hic', { vol: 0.9 }); if (!hasSound('gg-achoo')) sfx('whoosh');
    const hx = pl.x, hy = pl.y - 190;
    particles.burst(hx, hy, { type: 'sparkle', count: 26, colors: ['#ffe066', '#fff6a8', '#ffd23f'], speed: [200, 520], gravity: 60 });
    particles.burst(hx, hy, { type: 'dust', count: 14, color: '#ffe066', speed: [140, 360] });
    particles.ring(hx, pl.y - 60, '#ffe066', 300, 0.45);
    particles.popText(hx, hy - 90, 'ACHOO!', '#ffd23f', 64);
    fx.shake(10, 0.25);
    for (const e of this.ents) {
      const dx = e.x - pl.x, dy = (e.y - pl.y) * 1.3, d = Math.hypot(dx, dy);
      if (d < 280 && this.phase === 'play') {
        const k = 1 - d / 280;
        e.pvx = (dx / (d || 1)) * 900 * (0.5 + k); e.pvy = (dy / (d || 1)) * 500 * (0.5 + k);
        e.watering = null;
        e.a.playOnce('surprised', 0.5); e.a.squash(0.3);
        if (chance(0.5)) e.a.say('Achoo!', 1, null);
      }
    }
    // magic pollen: nearby growing plants get a big boost
    for (const q of this.plots) {
      if (q === pl || !(q.state === 'seed' || q.state === 'sprout' || q.state === 'bud')) continue;
      if (Math.hypot(q.x - pl.x, q.y - pl.y) < 360) {
        q.water += 0.3; q.sq = 0.4;
        particles.burst(q.x, q.y - 60, { type: 'sparkle', count: 6, colors: ['#ffe066', '#ffffff'] });
        this.growCheck(q);
        if (q.state === 'bud' && q.water >= 1) this.bloom(q);
      }
    }
  }

  updateRain(dt, playing) {
    if (!this.rain) {
      if (!playing) return;
      this.rainT -= dt;
      if (this.rainT <= 0 && this.timeLeft > 8) {
        const dir = chance(0.5) ? 1 : -1;
        this.rain = { x: dir > 0 ? -200 : W + 200, dir, t: 0 };
        snd('gg-rain', 'magic', { vol: 0.6 });
        particles.popText(W / 2, 330, 'Rain cloud!', '#7fd3ff', 52);
      }
      return;
    }
    const r = this.rain;
    r.t += dt; r.x += r.dir * 300 * dt;
    if (Math.random() < dt * 50) particles.burst(r.x + rand(-100, 100), 340, { type: 'drop', count: 1, colors: ['#7fd3ff', '#bfe9ff'], speed: [700, 800], angle: Math.PI / 2, spread: 0.05, life: [0.6, 0.9], size: [7, 10], gravity: 600 });
    if (playing) {
      for (const pl of this.plots) {
        if (Math.abs(pl.x - r.x) > 130) continue;
        if (pl.state === 'seed' || pl.state === 'sprout' || pl.state === 'bud') { pl.water += dt * 0.55; pl.wet = 1; this.growCheck(pl); }
      }
    }
    if (r.x < -260 || r.x > W + 260) { this.rain = null; this.rainT = rand(12, 16); }
  }

  startParty() {
    this.phase = 'party'; this.partyT = 0;
    for (const e of this.ents) e.watering = null;
    snd('gg-party', 'fanfare', { vol: 0.8 }); sfx('cheer');
    particles.confettiRain(W, 150);
    fx.flash('#ffffff', 0.15);
    const need = Math.max(0, 12 - this.butterflies.length);
    for (let i = 0; i < need; i++) this.addButterfly(rand(-100, 0) + (i % 2 ? W + 100 : 0), rand(300, 800));
    for (const e of this.ents) { e.a.setPose(e.i % 2 ? 'dance' : 'celebrate'); if (chance(0.6)) voice(e.p.charId, 'yay'); }
    this.partyBanner = 0;
    // party magic: every patch bursts into bloom, one after another
    this.partyQ = shuffle(this.plots.filter((pl) => pl.state !== 'grown'));
    this.partyQT = 0.3;
  }

  finish() {
    this.finished = true;
    // one garden grown together: everybody wins, the team total is the headline
    const stats = this.ents.map((e) => `helped ${e.score}`);
    const n = this.grown;
    this.api.finishTogether({ stats, title: `${n} plant${n === 1 ? '' : 's'} grown!`, focus: { x: W / 2, y: 640 } });
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl;
    const lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const speedCap = [0.6, 0.72, 0.84][lvl];
    if (e.brain.ready(dt)) {
      e.brain.wait(reactionTime(p) + [0.45, 0.25, 0.1][lvl]);
      if (!e.plot || !this.wants(e.plot)) {
        e.plot = null;
        if (chance(prof.mistake * 0.9)) { e.wander = rand(0.8, 1.6); e.wx = rand(200, W - 200); e.wy = rand(Y_MIN + 40, Y_MAX - 40); }
        else {
          let best = null, bs = Infinity;
          for (const pl of this.plots) {
            if (!this.wants(pl)) continue;
            let sc = Math.hypot(pl.x - e.x, (pl.y - e.y) * 1.2) * rand(0.85, 1.2);
            if (pl.state !== 'empty') sc -= 120 + pl.water * 150;    // finish growing plants first
            const others = this.ents.filter((o) => o !== e && o.plot === pl).length;
            sc += others * 260;
            if (sc < bs) { bs = sc; best = pl; }
          }
          e.plot = best;
        }
      }
      if (chance(prof.mistake * 0.6)) e.holdOff = rand(0.4, 1.0);
    }
    e.holdOff = Math.max(0, e.holdOff - dt);
    let tx, ty;
    if (e.wander > 0) { e.wander -= dt; tx = e.wx; ty = e.wy; }
    else if (e.plot) { const side = e.i % 2 ? 1 : -1; tx = e.plot.x + side * 80; ty = e.plot.y + 18; }
    else { tx = e.x; ty = e.y; }
    // dodge a pumpkin rolling straight at us (smarter CPUs)
    for (const k of this.pumpkins) {
      const d = Math.hypot(k.x - e.x, k.y + 60 - e.y);
      if (d < 260 && chance([0.01, 0.04, 0.08][lvl])) { ty = e.y + (e.y > k.y + 60 ? 200 : -200); }
    }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) + Math.sin(this.t * 2.3 + e.i) * prof.aimError * 0.5, k = clamp(d / 70, 0, 1) * speedCap;
    if (d < 8) ctrl.move(0, 0); else ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
    const near = e.plot && Math.hypot(e.plot.x - e.x, (e.plot.y - e.y) * 1.4) < REACH * 0.95;
    ctrl.hold('a', !!(near && e.holdOff <= 0 && this.wants(e.plot)));
  }

  /** Molly Easy: walk a human to a patch that needs planting or watering (not
   *  one another player is heading for) and stand beside it. Returns stick x/y. */
  easyPilot(e, dt) {
    const z = e.ez;
    // either stick still walks her anywhere (like Medium); the patch she's at is "hers".
    // Just let go and holding A? the autopilot takes her to the nearest patch from here.
    const st = easySteer(z, e.p.ctrl, dt);
    if (st.manual && (st.pushing || !e.p.ctrl.held('a') || e.watering)) {
      const np = this.nearestPlot(e);
      z.plot = e.watering || (this.wants(np) ? np : null); z.think = 0;
      return [st.x, st.y];
    }
    if (st.manual && !this.wants(z.plot)) z.plot = null;
    z.think -= dt;
    if (e.watering && this.wants(e.watering)) z.plot = e.watering;
    if (!z.plot || !this.wants(z.plot) || (z.think <= 0 && !e.watering && !this.nearPlot(e, z.plot))) {
      z.think = 1.2;
      let best = null, bs = Infinity;
      for (const pl of this.plots) {
        if (!this.wants(pl)) continue;
        let sc = Math.hypot(pl.x - e.x, (pl.y - e.y) * 1.2) - (pl === z.plot ? 150 : 0);
        if (pl.state !== 'empty') sc -= 100;
        for (const o of this.ents) if (o !== e && (o.ez ? o.ez.plot : o.plot) === pl) sc += 500;
        if (sc < bs) { bs = sc; best = pl; }
      }
      z.plot = best;
    }
    if (!z.plot) return [0, 0];
    const side = z.plot.x > e.x ? -1 : 1;
    const tx = z.plot.x + side * 75, ty = z.plot.y + 18;
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 10 || (this.nearPlot(e, z.plot) && d < 40)) return [0, 0];
    const k = clamp(d / 80, 0, 1) * 0.7;
    return [(dx / d) * k, (dy / d) * k];
  }

  nearPlot(e, pl) { return Math.hypot(pl.x - e.x, (pl.y - e.y) * 1.4) < REACH * 0.9 && this.nearestPlot(e) === pl; }

  wants(pl) { return pl && (pl.state === 'empty' || pl.state === 'seed' || pl.state === 'sprout' || pl.state === 'bud'); }

  // -------------------------------------------------------------------- draw
  pop(e, str, color, size) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    particles.popText(e.x + (e.popN % 2 ? 36 : -36), e.y - e.a.height - 40 - (e.popN % 3) * 40, str, color, size);
  }

  draw(g) {
    this.drawBackground(g);
    // highlight the patch each human would use
    for (const e of this.ents) {
      if (e.p.isAI || this.phase !== 'play') continue;
      const pl = e.watering || this.nearestPlot(e);
      if (pl && this.wants(pl)) pl.hi = Math.max(pl.hi, 0.5 + 0.3 * Math.sin(this.t * 8));
    }
    for (const pl of this.plots) {
      g.save(); g.translate(pl.x, pl.y); g.scale(1 + pl.sq * 0.12, 1 - pl.sq * 0.12);
      drawDirt(g, pl.wet, pl.hi);
      if (pl.state === 'empty' && this.phase === 'play') {
        // a little seed-hint arrow bobbing over empty patches
        g.globalAlpha = 0.55; g.translate(0, -30 - Math.abs(Math.sin(this.t * 3 + pl.x)) * 10);
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-12, -14); g.lineTo(12, -14); g.lineTo(0, 2); g.closePath(); g.fill();
      }
      g.restore();
    }
    // depth sorted: plants, pumpkins, players
    const items = [];
    for (const pl of this.plots) if (pl.state !== 'empty' && pl.state !== 'reserved') items.push({ y: pl.y, fn: () => this.drawPlant(g, pl) });
    for (const k of this.pumpkins) items.push({ y: k.y + 70, fn: () => this.drawRollingPumpkin(g, k) });
    for (const L of this.leavers) items.push({ y: L.baseY, fn: () => this.drawLeaver(g, L) });
    for (const e of this.ents) items.push({ y: e.y, fn: () => e.a.draw(g, { ring: e.p.color }) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();
    for (const h of this.hoppers) { g.save(); g.translate(h.x, h.y); g.rotate(h.t * 10); drawStrawberry(g, 1, 0); g.restore(); }
    for (const pl of this.plots) if (pl.state === 'seed' || pl.state === 'sprout' || pl.state === 'bud') this.drawWaterMeter(g, pl);
    if (this.rain) { g.save(); g.translate(this.rain.x, 300 + Math.sin(this.t * 2) * 8); drawRainCloud(g, this.t); g.restore(); }
    for (const b of this.butterflies) { g.save(); g.translate(b.x, b.y); g.rotate(clamp(b.vx / 400, -0.5, 0.5)); drawButterfly(g, b.t + b.ph, b.c1, b.c2, 0.85); g.restore(); }
    const showTags = !this.started || this.t - this.startT < 5;
    for (const e of this.ents) {
      if (!showTags && e.p.isAI) continue;
      const top = e.y - e.a.height - 24 - (e.a.emotes.length ? 50 : 0);
      ui.playerTag(g, e.p, e.x, top);
      // Easy: a big bouncing A when standing at a patch that wants A
      if (e.ez && this.phase === 'play' && !e.watering && e.stun <= 0 && e.ez.plot && this.nearPlot(e, e.ez.plot)) {
        easyPrompt(g, e.p, { target: { x: e.ez.plot.x, y: e.ez.plot.y - 20 }, child: { x: e.x, y: e.y - e.a.height } });
      }
    }
  }

  drawWaterMeter(g, pl) {
    const k = clamp(pl.water, 0, 1);
    const x = pl.x + 80, y = pl.y - 40;
    g.save(); g.translate(x, y);
    // drop-shaped meter
    g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(18, -6, 20, 6, 20, 12); g.arc(0, 12, 20, 0, Math.PI); g.bezierCurveTo(-20, 6, -18, -6, 0, -30); g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
    g.save(); g.clip(); g.fillStyle = '#3fa7ff'; g.fillRect(-22, 32 - 64 * k, 44, 64 * k); g.restore();
    g.lineWidth = 3.5; g.strokeStyle = '#24163f'; g.stroke();
    g.restore();
  }

  drawPlant(g, pl) {
    g.save(); g.translate(pl.x, pl.y);
    // a rising carrot never shows below the mound's front clods (its tip would poke out
    // under the mound early in the pop); the front clods are drawn over it below
    if (pl.state === 'grown' && pl.kind === 'carrot' && hasArt('prop/gg-dirt')) { dirtFrontPath(g, 1 + pl.sq * 0.12, 1 - pl.sq * 0.12, -400); g.clip(); }
    const sq = pl.sq;
    g.scale((1 + sq * 0.25) * PLANT_S, (1 - sq * 0.25) * PLANT_S);
    const party = this.phase === 'party';
    if (party && pl.state === 'grown') { const b = Math.sin(this.t * 9 + pl.x * 0.01); g.rotate(b * 0.1); g.scale(1, 1 + Math.abs(b) * 0.06); }
    const t = this.t + pl.x * 0.013;
    if (pl.state === 'seed') drawSeed(g, t);
    else if (pl.state === 'sprout') drawSprout(g, clamp((pl.water - 0.15) / 0.4, 0, 1), t);
    else if (pl.state === 'bud') drawBud(g, clamp((pl.water - 0.55) / 0.45, 0, 1), t);
    else {
      const k = ease.outBack(clamp(pl.pop, 0, 1));
      switch (pl.kind) {
        case 'sunflower': drawSunflower(g, 0.4 + 0.6 * k, t, pl.giggle > 0 ? 1 : 0); break;
        case 'carrot': drawCarrot(g, k, t, pl.hop || 0); break;
        case 'strawberry':
          drawStrawberryBush(g, t);
          for (const b of pl.berries || []) { g.save(); g.translate(-46 + b.k * 46, -110 - b.h * 0.25 * k); drawStrawberry(g, k, b.sq); g.restore(); }
          break;
        case 'pumpkin': drawVine(g); g.save(); g.translate(0, -70 + (1 - k) * 40); g.rotate(Math.sin(t * 12) * 0.08 * (pl.nextT < 0.6 ? 1 : 0.2)); drawPumpkin(g, 0, t, false); g.restore(); break;
        case 'sneezy': drawSneezy(g, t, pl.charge, pl.achoo); break;
        default: break;
      }
    }
    g.restore();
    if (pl.state === 'grown' && pl.kind === 'carrot' && hasArt('prop/gg-dirt')) {
      // the front half of the mound in front of the carrot, so it rises out of the hole
      g.save(); g.translate(pl.x, pl.y); g.scale(1 + pl.sq * 0.12, 1 - pl.sq * 0.12);
      dirtFrontPath(g, 1, 1, 64); g.clip(); drawDirt(g, pl.wet, 0);
      g.restore();
    }
  }

  drawLeaver(g, L) {
    g.save(); g.translate(L.x, L.y); g.rotate(L.rot); g.scale(PLANT_S * (1 + L.sq * 0.3), PLANT_S * (1 - L.sq * 0.3));
    if (L.vx < 0) g.scale(-1, 1);
    const t = this.t;
    switch (L.kind) {
      case 'sunflower': drawSunflower(g, 1, t, 1); break;
      case 'carrot': g.translate(0, 40); drawCarrot(g, 1, t, 0, true); break;
      case 'strawberry': for (let k = 0; k < 3; k++) { g.save(); g.translate(-46 + k * 46, -40 - Math.abs(Math.sin(t * 10 + k)) * 30); drawStrawberry(g, 1, 0); g.restore(); } break;
      case 'sneezy': drawSneezy(g, t, 0, 1); break;
      default: break;
    }
    g.restore();
  }

  drawRollingPumpkin(g, k) {
    g.save();
    g.globalAlpha = 0.25; g.fillStyle = '#1b1030'; g.beginPath(); g.ellipse(k.x, k.y + 72, 70, 16, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.translate(k.x, k.y);
    drawPumpkin(g, k.rot, this.t, true);
    g.restore();
  }

  drawHeld(g, info, e) {
    if (!e.watering && e.canT <= 0) return;
    const tilt = 0.55 + Math.sin(this.t * 10) * 0.08;
    drawCan(g, info.hand.x + info.h * 0.1, info.hand.y, Math.max(46, info.h * 0.36), tilt);
  }

  drawBackground(g) {
    const bg = art('bg/garden-grow');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    ui.sky(g, '#7fd0ff', '#d8f3ff', 360);
    // sun
    g.save(); g.translate(1720, 120); g.fillStyle = '#fff3a0'; g.globalAlpha = 0.5;
    for (let i = 0; i < 10; i++) { g.rotate(TAU / 10 + this.t * 0.02); g.beginPath(); g.moveTo(70, -12); g.lineTo(130, 0); g.lineTo(70, 12); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#ffe066'; g.beginPath(); g.arc(0, 0, 62, 0, TAU); g.fill(); g.restore();
    for (const c of this.bgClouds) ui.cloud(g, c.x, c.y, c.s, '#ffffff', 0.9);
    ui.hills(g, 300, '#9fe08a', 18, 0.004, 1);
    // lawn
    g.fillStyle = '#7fd36a'; g.fillRect(0, 360, W, H - 360);
    g.fillStyle = '#74c95f';
    for (let i = 0; i < 8; i++) g.fillRect(0, 380 + i * 90, W, 44);
    // picket fence
    const fy = 330;
    g.fillStyle = '#ffffff'; g.strokeStyle = '#24163f'; g.lineWidth = 3;
    ui.roundRect(g, 0, fy - 40, W, 14, 4); g.fill(); g.stroke();
    ui.roundRect(g, 0, fy - 4, W, 14, 4); g.fill(); g.stroke();
    for (let x = 10; x < W; x += 56) {
      g.beginPath(); g.moveTo(x, fy + 34); g.lineTo(x, fy - 62); g.lineTo(x + 16, fy - 80); g.lineTo(x + 32, fy - 62); g.lineTo(x + 32, fy + 34); g.closePath(); g.fill(); g.stroke();
    }
    // flowers along the fence
    for (let i = 0; i < 24; i++) {
      const x = 40 + i * 82 + (i % 2) * 20, y = fy + 46 + (i % 3) * 6;
      g.fillStyle = '#4fae54'; g.beginPath(); g.ellipse(x, y, 30, 16, 0, 0, TAU); g.fill();
      g.fillStyle = ['#ff6fb1', '#ffd23f', '#ffffff', '#b58cff'][i % 4];
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - 14 + k * 14, y - 8 - (k % 2) * 6, 7, 0, TAU); g.fill(); }
    }
    // little sparkles on the lawn
    g.save();
    for (let i = 0; i < 16; i++) {
      const a = 0.5 + 0.5 * Math.sin(this.t * 2 + i);
      g.globalAlpha = a * 0.5; g.save(); g.translate((i * 263) % W, 420 + (i * 137) % 600); drawSparkleShape(g, 12, '#ffffff'); g.restore();
    }
    g.restore();
  }

  drawHUD(g) {
    ui.scoreboard(g, this.players, this.ents.map(() => ''), { y: 14, avoidCenter: true, format: (v) => v });
    // shared team counter under the timer: plants grown together
    g.save(); g.translate(W / 2, 150);
    ui.panel(g, -86, -34, 172, 68, { r: 34, fill: '#ffffff' });
    g.translate(-40, 0);
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#24163f'; g.lineWidth = 3;
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + this.t * 0.6; g.beginPath(); g.arc(Math.cos(a) * 13, Math.sin(a) * 13, 9, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill(); g.stroke();
    g.restore();
    ui.text(g, String(this.grown), W / 2 + 26, 153, { size: 48, color: '#24163f', stroke: false, weight: 800 });
    if (this.phase === 'party') {
      const k = this.partyT;
      g.save(); g.globalAlpha = clamp(Math.min(k * 4, (PARTY_T - k) * 3), 0, 1);
      ui.banner(g, 'Garden party!', k, { y: 220, size: 120, color: '#ffffff' });
      g.restore();
    }
  }
}
