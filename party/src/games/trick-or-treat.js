// Trick or Treat! (Molly Party) - everyone in a costume dashes along a cosy
// Halloween street with a pumpkin bucket. Stand at a door with its porch light
// on and press A to knock: a silly visitor pops out (dancing skeleton, grandma
// witch with cookies, pumpkin-head scarecrow, giggling mummy, kitten, little
// ghost, the troll in bunny ears) and tosses candy into everyone's bucket at
// that door. Sometimes it's a harmless trick (confetti popper, rubber chicken,
// jack-in-the-box) - followed by a candy anyway. Golden doors give a candy
// fountain; the Candy Ghost flies over twice and rains candy to scoop up.
// Finale: everyone pours their bucket into one giant candy pile.
//
// Art hooks (procedural fallbacks ship today): bg/trick-or-treat, thumb/trick-or-treat,
//   prop/tot-house-0..5, prop/tot-door, prop/tot-{skeleton,witch,scarecrow,mummy,cat,ghost},
//   prop/tot-candy-0..5 (or prop/candy-wrapped, prop/candy-lollipop), prop/candy-golden,
//   prop/tot-bucket, prop/tot-chicken, prop/tot-jack, prop/tot-candy-ghost, prop/tot-candy-pile.
// Sound hooks (fallbacks today): tot-knock, tot-door, tot-ding, tot-candy, tot-skeleton,
//   tot-witch, tot-scarecrow, tot-mummy, tot-meow, tot-ghost, tot-popper, tot-chicken,
//   tot-jack, tot-fountain, tot-candy-ghost, tot-pour, tot-boo.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime, steer, Brain } from '../engine/ai.js';
import { easySteer, easyNearest, easyPrompt, easyAutoOk } from '../engine/easy.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, TAU, ease, later, placementsFromScores } from '../engine/util.js';
import { Dash } from '../engine/dash.js';
import {
  NAVY, GROUND_Y, WALK, HOUSE_X, DOOR, CANDY_COLS, VISITORS, streetBackground, drawHouse, drawDoor, drawLantern, paintedHouse, porchLight,
  drawCandy, drawBucket, drawVisitor, drawChicken, drawJack, drawCandyGhost, drawCandyPile,
} from './trick-or-treat/draw.js';

const GAME_T = 55;          // seconds of trick-or-treating, then the candy-pile finale
const FINALE_T = 5.2;
const SPEED = 580;
const CPU_SPEED = 0.8;      // CPUs are a little slower than kids on top of their profile
const ZONE_X = 125, ZONE_Y = WALK.y1 + 1;   // the door zone runs down the whole sidewalk
const KNOCK_T = 0.5, OPEN_T = 2.0, CLOSE_T = 0.3;
const GHOST_AT = [19, 39];
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const COSTUMES = [
  [{ id: 'wizard-hat', colour: 2 }, { id: 'star-cape', colour: 2 }],                 // witch
  [{ id: 'fairy-wings', colour: 3 }, { id: 'tiara', colour: 6 }],                    // fairy
  [{ id: 'kitty-ears', colour: 0 }, { id: 'kitty-whiskers', colour: 0 }],            // kitty
  [{ id: 'bunny-ears', colour: 6 }, { id: 'bowtie', colour: 5 }],                    // bunny
  [{ id: 'butterfly-wings', colour: 2 }, { id: 'butterfly-paint', colour: 3 }],      // butterfly
  [{ id: 'dragon-wings', colour: 4 }, { id: 'party-goggles', colour: 4 }],           // dragon
  [{ id: 'princess-cone', colour: 0 }, { id: 'petal-wings', colour: 0 }],            // princess
  [{ id: 'angel-wings', colour: 6 }, { id: 'fairy-halo', colour: 1 }],               // angel
  [{ id: 'royal-cape', colour: 5 }, { id: 'masquerade-mask', colour: 2 }],           // superhero
  [{ id: 'unicorn-horn', colour: 7 }, { id: 'rainbow', colour: 7 }],                 // unicorn
];
const VISITOR_SAY = { skeleton: ['Rattle!', 'Dance!'], witch: ['Cookies!', 'Hee hee!'], scarecrow: ['Howdy!', 'Yee-haw!'], mummy: ['Hee hee!', 'Giggle!'], cat: ['Meow!', 'Purr!'], ghost: ['Boo-hoo-hoo!', 'Wheee!'], troll: ['Hop hop!', 'Ho ho!'] };
const VISITOR_SND = { skeleton: ['tot-skeleton', 'crumble-plop'], witch: ['tot-witch', 'magic'], scarecrow: ['tot-scarecrow', 'pt-honk'], mummy: ['tot-mummy', 'giggle'], cat: ['tot-meow', 'tiny-squeak'], ghost: ['tot-ghost', 'npc/imp/giggle'], troll: [null, 'npc/troll/laugh'] };

import { meta } from './trick-or-treat.meta.js';

export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.easy = !!api.easy;     // Molly Easy: A knocks; A again and again (no steering) walks you to a lit door
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.scale = n <= 3 ? 0.9 : n <= 5 ? 0.8 : 0.72;
    if (api.camera) api.camera.maxZoom = Math.min(api.camera.maxZoom ?? 1.4, 1.3);
    const looks = shuffle(COSTUMES.slice());
    this.units = this.players.map((p, i) => {
      const x0 = lerp(260, W - 260, n === 1 ? 0.5 : i / (n - 1)) + rand(-20, 20);
      const hx = HOUSE_X.reduce((b, h) => (Math.abs(h - x0) < Math.abs(b - x0) ? h : b));
      const x = hx + clamp(x0 - hx, -90, 90);   // start inside a door zone
      const y = 860 + (i % 2) * 70;
      const a = new Actor(p, { scale: this.scale, x, y, outfit: looks[i % looks.length] });
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      const U = { p, i, a, x, y, z: 0, vz: 0, vx: 0, vy: 0, count: 0, spinCd: 0, laughT: 0, dizzy: 0, dash: new Dash(), brain: new Brain(p), ai: { door: null, knockAt: null, dawdle: 0 }, finale: null };
      a.attach((g, info) => drawBucket(g, info.hand.x, info.hand.y, info.h, U.finale ? U.count - U.finale.poured : U.count, this.t));
      return U;
    });
    this.doors = HOUSE_X.map((x, i) => ({ i, x, state: 'ready', st: 0, open: 0, light: 1, gold: false, visitor: null, trick: null, knocker: null, gave: false, restT: 0, shake: 0, k: 0, jack: 0, said: false }));
    this.flying = [];       // candies arcing into buckets
    this.spills = [];       // candies on the sidewalk to scoop up
    this.chickens = [];
    this.ghost = null; this.ghostsDone = 0;
    this.nextGold = 9;
    this.banner = null;
    this.phase = 'play'; this.pt = 0;
    this.pile = 0; this.pileShown = 0;
    this.finished = false;
    this.lastVisitor = null;
    // the trick-or-treat clock, shown the whole game (the candy-pile finale has none)
    api.limit(() => (this.phase === 'play' ? Math.max(0, GAME_T - this.t) : null), { showAt: Infinity });
  }

  // --- helpers -----------------------------------------------------------------------
  inZone(U, d) { return Math.abs(U.x - d.x) < ZONE_X && U.y < ZONE_Y; }
  doorAt(U) { let best = null; for (const d of this.doors) if (this.inZone(U, d) && (!best || Math.abs(U.x - d.x) < Math.abs(U.x - best.x))) best = d; return best; }
  bucketPos(U) { const h = U.a.anchor('hand'); return { x: h.x, y: h.y + U.a.height * 0.2 }; }
  showBanner(text, dur = 1.4, color = '#ffd23f') { this.banner = { text, t: 0, dur, color }; }

  // --- frame -------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    for (const U of this.units) { U.a.setPose(U.i % 2 ? 'wave' : 'idle'); U.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.pt += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.phase === 'play') {
      this.updateEvents(dt);
      for (const U of this.units) { if (U.p.isAI) this.ai(U, dt); this.control(U, dt); }
      this.separate();
      if (this.t >= GAME_T) this.startFinale();
    } else if (this.phase === 'finale') {
      this.updateFinale(dt);
    }
    this.updateDoors(dt);
    this.updateFlying(dt);
    this.updateSpills(dt);
    this.updateChickens(dt);
    this.updateGhost(dt);
    for (const U of this.units) this.animate(U, dt);
  }

  postUpdate(dt) {
    this.t += dt * 0.5;
    this.updateFlying(dt); this.updateSpills(dt);
    for (const U of this.units) { U.a.update(dt); }
  }

  updateEvents(dt) {
    // golden door every ~12 s
    if (this.t >= this.nextGold && this.t < GAME_T - 4) {
      const cand = this.doors.filter((d) => d.state === 'ready' && !d.gold);
      if (cand.length) {
        const d = pick(cand); d.gold = true;
        this.nextGold = this.t + rand(10, 13);
        particles.burst(d.x, GROUND_Y + DOOR.top + 40, { type: 'sparkle', count: 24, colors: ['#ffd23f', '#fff6a8', '#ffffff'], speed: [120, 380] });
        snd('tot-ding', 'golden-chime');
        this.showBanner('Golden door!', 1.3, '#ffd23f');
      } else this.nextGold = this.t + 1;
    }
    // the Candy Ghost
    if (this.ghostsDone < GHOST_AT.length && this.t >= GHOST_AT[this.ghostsDone] && !this.ghost) {
      const dir = this.ghostsDone % 2 ? -1 : 1;
      this.ghost = { x: dir > 0 ? -220 : W + 220, y: 250, dir, t: 0, dropT: 0.5 };
      this.ghostsDone++;
      snd('tot-candy-ghost', 'wheee-fall');
      this.showBanner('Candy Ghost!', 1.4, '#ffffff');
    }
  }

  // --- players -----------------------------------------------------------------------
  control(U, dt) {
    const p = U.p, a = U.a;
    U.spinCd = Math.max(0, U.spinCd - dt); U.laughT = Math.max(0, U.laughT - dt); U.dizzy = Math.max(0, U.dizzy - dt);
    let mx = p.ctrl.x, my = p.ctrl.y;
    if (this.easy && !p.isAI) {
      // Easy: the stick steers like Medium while it's pushed; otherwise she stands, unless
      // A pressed again and again sent her to a door (pressA)
      const st = easySteer(U, p.ctrl, dt);
      if (st.manual) {
        mx = st.x; my = st.y;
        if (st.pushing) U.easyGo = null;
      } else [mx, my] = this.easyMove(U, dt);
    }
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    const sp = SPEED * (U.dizzy > 0 ? 0.35 : 1);
    U.vx = damp(U.vx, mx * sp, 14, dt); U.vy = damp(U.vy, my * sp * 0.75, 14, dt);
    const dd = U.dash.update(dt, p.ctrl, { x: U.x, y: U.y, actor: U.z > 1 ? null : a, facing: a.facing, ok: this.phase === 'play' && U.dizzy <= 0 && !p.isAI });   // B: a short dash
    U.x = clamp(U.x + U.vx * dt + dd.x, WALK.x0, WALK.x1);
    U.y = clamp(U.y + U.vy * dt + dd.y, WALK.y0, WALK.y1);
    // hop
    if (U.z > 0 || U.vz > 0) { U.vz -= 2600 * dt; U.z += U.vz * dt; if (U.z <= 0) { U.z = 0; U.vz = 0; a.squash(0.25); } }
    if (p.ctrl.pressed('a')) this.pressA(U);
    // scoop candy from the sidewalk
    for (const c of this.spills) {
      if (c.gone || c.z > 50) continue;
      if (Math.abs(c.x - U.x) < 62 && Math.abs(c.y - U.y) < 44) this.scoop(U, c);
    }
  }

  pressA(U) {
    const d = this.doorAt(U);
    if (d && d.state === 'ready') { this.knock(d, U); return; }
    if (d && d.state !== 'rest') return;                // waiting at a busy door
    // Easy: A away from a lit door, pressed again with no steering (easyAutoOk), walks you to the
    // nearest one (from where you are) and knocks; one A (or after steering) is just the jump-spin
    if (this.easy && !U.p.isAI && this.phase === 'play' && easyAutoOk(U)) {
      const go = this.easyNearestDoor(U);
      if (go && go !== d) { U.easyGo = go; U.easySlotY = clamp(U.y, WALK.y0 + 20, ZONE_Y - 30); U._ezSteer = 0; return; }
    }
    if (U.spinCd > 0 || U.z > 0) return;
    // a happy costume jump-spin
    U.spinCd = 0.55; U.vz = 760;
    U.a.playOnce(pick(['dance-star', 'spring-jump', 'pose-twirl']), 0.5); U.a.squash(0.3);
    particles.burst(U.x, U.y - U.a.height * 0.6, { type: pick(['star', 'confetti', 'sparkle']), count: 10, colors: [U.p.color, '#ffffff', '#ff9f1c', '#9b5cff'], speed: [120, 320] });
    snd('tot-boo', 'jump', { vol: 0.5 });
  }

  scoop(U, c) {
    c.gone = true;
    const n = c.gold ? 3 : 1;
    U.count += n;
    particles.popText(c.x, c.y - 60, `+${n}`, c.gold ? '#ffd23f' : '#ffffff', c.gold ? 50 : 40);
    particles.burst(c.x, c.y - 20, { type: 'sparkle', count: c.gold ? 10 : 5, colors: c.gold ? ['#ffd23f', '#fff'] : [CANDY_COLS[c.kind], '#fff'], speed: [60, 200] });
    sfx('collect', { step: Math.min(8, (U.scoopStep = ((U.scoopStep || 0) + 1) % 9)), vol: 0.5 });
    U.a.squash(0.12);
    if (!U.p.isAI) U.p.ctrl.rumble(0.2, 60);
  }

  separate() {
    // sized from the sprites (several trick-or-treaters still fit at one door)
    spread(this.units, { radius: (U) => bodyRadius(U.a) * 0.7, yScale: 1.5 });
  }

  animate(U, dt) {
    const a = U.a;
    a.x = U.x; a.y = U.y; a.z = U.z;
    if (this.phase === 'play' || (this.phase === 'finale' && !U.finale?.arrived)) {
      if (U.dizzy > 0) { if (!a._once) a.setPose('dizzy'); }
      else if (U.laughT > 0) { if (!a._once) a.setPose('giggle'); }
      else if (U.z > 0) { /* jump pose running */ }
      else {
        if (a.pose === 'dizzy' || a.pose === 'giggle') a.setPose('idle');
        a.moveAnim(U.vx, U.vy, SPEED, { run: Math.hypot(U.vx, U.vy) > SPEED * 0.6 });
      }
    }
    a.update(dt);
  }

  // --- doors -------------------------------------------------------------------------
  knock(d, U) {
    d.state = 'knock'; d.st = 0; d.knocker = U; d.gave = false; d.said = false;
    U.a.playOnce('action', 0.35); U.a.facing = 1;
    U.a.facing = d.x >= U.x ? 1 : -1;
    snd('tot-knock', 'bonk', { vol: 0.7 });
    later(() => snd('tot-knock', 'bonk', { vol: 0.6 }), 180);
    particles.popText(d.x, GROUND_Y + DOOR.top - 30, 'Knock knock!', '#ffffff', 40);
    if (!U.p.isAI) U.p.ctrl.rumble(0.3, 80);
  }

  openDoor(d) {
    d.state = 'open'; d.st = 0; d.k = 0; d.jack = 0;
    // pick a visitor (not the same as last time) and maybe a trick
    let v = pick(VISITORS);
    if (v === this.lastVisitor) v = pick(VISITORS);
    this.lastVisitor = v;
    d.visitor = v;
    d.trick = !d.gold && chance(0.22) ? pick(['confetti', 'chicken', 'jack']) : null;
    if (d.trick === 'jack') d.visitor = 'jack';
    if (d.visitor === 'troll') {
      if (!this.troll) this.troll = new Actor('troll', { outfit: [{ id: 'bunny-ears', colour: 0 }, { id: 'bowtie', colour: 0 }] });
      const tr = this.troll; tr.scale = 1; tr.scale = 175 / Math.max(1, tr.height);
      tr.x = d.x; tr.y = GROUND_Y + DOOR.bottom; tr.facing = 1; tr.snap(); tr.setPose('wave');
    }
    snd('tot-door', 'pottery-kiln-door', { vol: 0.6 });
    const [k, fb] = VISITOR_SND[d.visitor] || [null, 'pop'];
    later(() => snd(k, fb, { vol: 0.8 }), 160);
    for (const U of this.units) if (this.inZone(U, d) && !U.a._once) U.a.playOnce('surprised', 0.4);
  }

  give(d) {
    d.gave = true;
    let rec = this.units.filter((U) => this.inZone(U, d));
    if (!rec.length && d.knocker) rec = [d.knocker];
    const top = { x: d.x + 30, y: GROUND_Y + DOOR.top + 30 };
    if (d.trick) { this.doTrick(d, rec, top); return; }
    const n = d.gold ? 6 : rec.length >= 4 ? 3 : 4;
    rec.forEach((U, j) => {
      for (let k = 0; k < n; k++) this.flyCandy(top.x, top.y, U, k * 0.1 + j * 0.03, d.gold);
      particles.popText(U.x, U.y - U.a.height - 70, `+${n}`, d.gold ? '#ffd23f' : '#ff9f1c', 56);
      if (chance(0.6)) voice(U.p.charId, 'yay');
      if (!U.p.isAI) U.p.ctrl.rumble(0.35, 120);
      later(() => { U.a.playOnce('cheer', 0.6); }, 500);
    });
    particles.burst(top.x, top.y, { type: 'star', count: 10, colors: ['#ffd23f', '#ff9f1c', '#ffffff'], speed: [150, 380] });
    snd('tot-candy', 'pinata-candy-bounce', { vol: 0.8 });
    const say = pick(VISITOR_SAY[d.visitor] || ['Treats!']);
    particles.popText(d.x, GROUND_Y + DOOR.top - 60, say, '#ffffff', 44);
    // a couple of extra candies bounce onto the sidewalk
    const spill = d.gold ? 14 : randInt(1, 2);
    for (let k = 0; k < spill; k++) this.spillCandy(top.x, top.y, d.x + rand(-260, 260), rand(WALK.y0 + 10, WALK.y1 - 20), { delay: k * 0.05, gold: d.gold && k % 4 === 0 });
    if (d.gold) {
      d.gold = false;
      snd('tot-fountain', 'td-jackpot');
      fx.shake(12, 0.35); fx.flash('#fff6c0', 0.18); fx.slowmo(0.5, 0.5);
      if (this.api.camera) this.api.camera.punch(d.x, GROUND_Y - 80, 1.18, 0.9);
      particles.burst(top.x, top.y, { type: 'confetti', count: 50, speed: [300, 800], angle: -Math.PI / 2, spread: 1.3 });
      this.showBanner('Candy fountain!', 1.4, '#ffd23f');
    }
  }

  doTrick(d, rec, top) {
    const tr = d.trick;
    if (tr === 'confetti') {
      snd('tot-popper', 'bigpop');
      for (const U of rec) {
        const hx = U.x, hy = U.y - U.a.height * 0.8;
        particles.burst(hx, hy, { type: 'confetti', count: 26, colors: RAINBOW, speed: [150, 520] });
        U.a.playOnce('surprised', 0.45); U.laughT = 1.3; U.a.flash('#ffffff', 0.15);
        later(() => voice(U.p.charId, 'laugh'), 450);
      }
      particles.burst(top.x, top.y, { type: 'confetti', count: 30, speed: [200, 600] });
      fx.shake(6, 0.2);
      particles.popText(d.x, GROUND_Y + DOOR.top - 60, 'Surprise!', '#ff7ac6', 50);
    } else if (tr === 'chicken') {
      snd('tot-chicken', 'squeak');
      const U = pick(rec);
      this.chickens.push({ x: top.x, y: top.y, sx: top.x, sy: top.y, U, t: 0, dur: 0.45, rot: 0, hit: false, vx: 0, vy: 0, life: 0 });
      particles.popText(d.x, GROUND_Y + DOOR.top - 60, 'Hee hee!', '#ffd23f', 50);
      for (const o of rec) if (o !== U) o.laughT = 1.2;
    } else {
      snd('tot-jack', 'boing');
      for (const U of rec) { U.a.playOnce('surprised', 0.5); U.vz = 520; U.laughT = 1.3; later(() => voice(U.p.charId, 'laugh'), 400); }
      fx.shake(8, 0.25);
      particles.burst(d.x, GROUND_Y - 150, { type: 'star', count: 14, colors: ['#ffd23f', '#ff7ac6', '#fff'], speed: [150, 420] });
      particles.popText(d.x, GROUND_Y + DOOR.top - 60, 'Boing!', '#ff7ac6', 56);
    }
    // ...and then a candy anyway
    later(() => {
      if (this.finished) return;
      for (const U of rec) { this.flyCandy(top.x, top.y, U, 0, false); this.flyCandy(top.x, top.y, U, 0.12, false); particles.popText(U.x, U.y - U.a.height - 70, '+2', '#ff9f1c', 50); }
      snd('tot-candy', 'pinata-candy-bounce', { vol: 0.6 });
    }, 700);
  }

  updateDoors(dt) {
    for (const d of this.doors) {
      d.st += dt;
      d.shake = Math.max(0, d.shake - dt * 3);
      switch (d.state) {
        case 'ready': d.open = damp(d.open, 0, 12, dt); d.light = damp(d.light, 1, 8, dt); break;
        case 'knock':
          d.shake = 1;
          if (d.st >= KNOCK_T) this.openDoor(d);
          break;
        case 'open':
          d.open = damp(d.open, 1, 14, dt);
          d.k = clamp(d.st / 0.3, 0, 1);
          if (d.visitor === 'jack') d.jack = d.st > 0.45 ? 1 : d.st / 0.45 * 0.2;
          if (!d.gave && d.st >= 0.55) this.give(d);
          if (d.st >= OPEN_T) { d.state = 'close'; d.st = 0; }
          break;
        case 'close':
          d.open = damp(d.open, 0, 14, dt);
          d.k = 1 - clamp(d.st / CLOSE_T, 0, 1);
          if (d.st >= CLOSE_T) { d.state = 'rest'; d.st = 0; d.restT = rand(2.2, 3.6); d.visitor = null; snd('tot-door', 'stamp', { vol: 0.3 }); }
          break;
        case 'rest':
          d.light = damp(d.light, 0, 8, dt);
          if (d.st >= d.restT && this.phase === 'play') {
            d.state = 'ready'; d.st = 0;
            const pl = porchLight(d.x, d.i);
            particles.burst(pl.x, pl.y, { type: 'sparkle', count: 6, colors: ['#fff0a8', '#ffffff'], speed: [40, 140] });
            sfx('sparkle', { vol: 0.25 });
          }
          break;
        default: break;
      }
    }
    if (this.troll) this.troll.update(dt);
  }

  // --- candies -----------------------------------------------------------------------
  flyCandy(x, y, U, delay, gold) {
    this.flying.push({ sx: x, sy: y, U, t: -delay, dur: 0.5 + rand(0, 0.12), kind: randInt(0, 5), gold, rot: rand(TAU), x, y });
  }

  updateFlying(dt) {
    for (const c of this.flying) {
      c.t += dt;
      if (c.t < 0) continue;
      const k = clamp(c.t / c.dur, 0, 1);
      const b = this.bucketPos(c.U);
      c.x = lerp(c.sx, b.x, k); c.y = lerp(c.sy, b.y, k) - Math.sin(k * Math.PI) * 180;
      c.rot += dt * 10;
      if (k >= 1 && !c.done) {
        c.done = true;
        c.U.count += c.gold ? 2 : 1;
        sfx('collect', { step: Math.min(8, c.U.count % 9), vol: 0.35 });
        particles.burst(b.x, b.y - 10, { type: 'sparkle', count: 3, colors: [CANDY_COLS[c.kind], '#ffffff'], speed: [40, 140] });
        c.U.a.squash(0.08);
      }
    }
    this.flying = this.flying.filter((c) => !c.done);
  }

  spillCandy(x, y, tx, ty, { delay = 0, gold = false, z = null } = {}) {
    const dur = 0.7 + rand(0, 0.2);
    // simulate as an arc from (x, y) to the ground spot (tx, ty), then bounce
    this.spills.push({ sx: x, sy: y, x, y: ty, tx, ty, t: -delay, dur, z: z ?? (ty - y), vz: 0, landed: false, kind: randInt(0, 5), gold, rot: rand(TAU), life: 0, gone: false, bounces: 0 });
  }

  updateSpills(dt) {
    for (const c of this.spills) {
      c.t += dt;
      if (c.t < 0) continue;
      if (!c.landed) {
        const k = clamp(c.t / c.dur, 0, 1);
        c.x = lerp(c.sx, c.tx, k);
        const baseZ = lerp(c.ty - c.sy, 0, ease.inQuad(k));
        c.z = baseZ + Math.sin(k * Math.PI) * 140;
        c.rot += dt * 8;
        if (k >= 1) { c.landed = true; c.z = 0; c.vz = 260; if (!c.quiet) snd('pinata-candy-bounce', 'bounce', { vol: 0.15 }); }
      } else {
        c.life += dt;
        if (c.z > 0 || c.vz > 0) { c.vz -= 1800 * dt; c.z += c.vz * dt; if (c.z <= 0) { c.z = 0; c.vz = c.bounces++ < 1 ? 120 : 0; } }
        if (c.life > 9) c.gone = true;
      }
    }
    this.spills = this.spills.filter((c) => !c.gone);
  }

  updateChickens(dt) {
    for (const c of this.chickens) {
      c.t += dt;
      if (!c.hit) {
        const k = clamp(c.t / c.dur, 0, 1);
        const hx = c.U.x, hy = c.U.y - c.U.a.height - 10;
        c.x = lerp(c.sx, hx, k); c.y = lerp(c.sy, hy, k) - Math.sin(k * Math.PI) * 140;
        c.rot += dt * 14;
        if (k >= 1) {
          c.hit = true; c.vx = rand(-260, 260); c.vy = -620;
          snd('tot-chicken', 'squeak'); sfx('bonk', { vol: 0.5 });
          c.U.dizzy = 0.8; c.U.laughT = 2.0; c.U.a.playOnce('hurt', 0.3); c.U.a.squash(0.4);
          particles.burst(hx, hy, { type: 'star', count: 8, colors: ['#ffe14a', '#ffffff'], speed: [120, 300] });
          particles.burst(hx, hy, { type: 'petal', count: 8, colors: ['#ffe14a', '#fff6a8'], speed: [80, 220] });
          particles.popText(hx, hy - 50, 'Squeak!', '#ffe14a', 48);
          fx.shake(5, 0.15);
          later(() => voice(c.U.p.charId, 'laugh'), 500);
          if (!c.U.p.isAI) c.U.p.ctrl.rumble(0.5, 160);
        }
      } else {
        c.life += dt; c.vy += 1700 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += dt * 9;
      }
    }
    this.chickens = this.chickens.filter((c) => c.life < 1.2);
  }

  updateGhost(dt) {
    const G = this.ghost;
    if (!G) return;
    G.t += dt;
    G.x += G.dir * 470 * dt;
    G.dropT -= dt;
    if (G.dropT <= 0 && G.x > 80 && G.x < W - 80 && this.phase === 'play') {
      G.dropT = 0.11;
      this.spillCandy(G.x - G.dir * 60, G.y + 50, clamp(G.x + rand(-140, 140), WALK.x0 + 20, WALK.x1 - 20), rand(WALK.y0 + 10, WALK.y1 - 20), { gold: chance(0.08) });
      if (chance(0.3)) sfx('pop', { vol: 0.25 });
    }
    if ((G.dir > 0 && G.x > W + 260) || (G.dir < 0 && G.x < -260)) this.ghost = null;
  }

  // --- finale ------------------------------------------------------------------------
  startFinale() {
    this.phase = 'finale'; this.pt = 0;
    this.showBanner('Candy pile!', 1.8, '#ff9f1c');
    sfx('whistle', { vol: 0.5 });
    for (const d of this.doors) if (d.state === 'ready') { d.state = 'rest'; d.st = 0; d.restT = 99; }
    this.ghost = null;
    const n = this.units.length;
    const order = this.units.slice().sort((a, b) => a.x - b.x);
    order.forEach((U, k) => {
      const left = k < Math.ceil(n / 2);
      const j = left ? Math.ceil(n / 2) - 1 - k : k - Math.ceil(n / 2);
      const x = W / 2 + (left ? -1 : 1) * (330 + j * 150);
      U.finale = { x: clamp(x, 120, W - 120), y: 900 + (j % 2) * 60, arrived: false, poured: 0, pourT: 0 };
      U.vz = 0; U.z = 0;
    });
  }

  updateFinale(dt) {
    for (const U of this.units) {
      const F = U.finale;
      if (!F.arrived) {
        const dx = F.x - U.x, dy = F.y - U.y, d = Math.hypot(dx, dy);
        if (d < 8 || this.pt > 1.4) { F.arrived = true; U.x = F.x; U.y = F.y; U.vx = U.vy = 0; U.a.facing = U.x < W / 2 ? 1 : -1; U.a.setPose('throw'); }
        else { const sp = Math.min(SPEED, d * 6); U.vx = (dx / d) * sp; U.vy = (dy / d) * sp; U.x += U.vx * dt; U.y += U.vy * dt; }
      } else if (this.pt > 1.2 && this.pt < 4.2) {
        // pour the bucket into the pile: show up to ~24 flying candies per player
        F.pourT -= dt;
        const target = U.count;
        if (F.poured < target && F.pourT <= 0) {
          const step = Math.max(1, Math.ceil(target / 24));
          F.pourT = 0.11;
          F.poured = Math.min(target, F.poured + step);
          const b = this.bucketPos(U);
          this.spills.push({ sx: b.x, sy: b.y, x: b.x, y: 990, tx: W / 2 + rand(-120, 120), ty: 990, t: 0, dur: 0.55, z: 990 - b.y, vz: 0, landed: false, kind: randInt(0, 5), gold: false, rot: rand(TAU), life: 8.8, gone: false, bounces: 2, quiet: true, toPile: step });
          if (chance(0.3)) snd('tot-pour', 'pop', { vol: 0.25 });
          if (!U.a._once) U.a.playOnce('throw', 0.25, 'throw');
        }
      }
      if (this.pt >= 4.2 && !F.cheered) { F.cheered = true; U.a.setPose('celebrate'); if (chance(0.6)) voice(U.p.charId, 'woo'); }
    }
    for (const c of this.spills) if (c.toPile && c.landed && !c.counted) { c.counted = true; c.gone = true; this.pile += c.toPile; }
    this.pileShown = damp(this.pileShown, this.pile, 6, dt);
    if (this.pt >= 4.2 && !this.pileDone) {
      this.pileDone = true;
      particles.confettiRain(W, 110);
      sfx('fanfare'); sfx('cheer');
      fx.shake(8, 0.3);
      if (this.api.camera) this.api.camera.punch(W / 2, 880, 1.12, 1.0);
      particles.burst(W / 2, 820, { type: 'star', count: 30, colors: ['#ffd23f', '#ff9f1c', '#ffffff'], speed: [200, 600] });
    }
    if (this.pt >= FINALE_T) this.finishNow();
  }

  finishNow() {
    if (this.finished) return;
    this.finished = true;
    const scores = this.units.map((U) => U.count);
    const placements = placementsFromScores(scores);
    this.api.finish({
      placements,
      stats: scores.map((s) => `${s} ${s === 1 ? 'candy' : 'candies'}`),
      focus: { x: W / 2, y: 850, zoom: 1.15 },
    });
  }

  // --- Molly Easy (humans): A knocks; A again and again (no steering) walks you to a door ---
  easyNearestDoor(U) {
    // along the street: a lit door if there is one, else the nearest door
    const along = (d) => ({ x: d.x, y: 0 });
    return easyNearest(U.x, 0, this.doors, along, (d) => d.state !== 'ready') || easyNearest(U.x, 0, this.doors, along);
  }

  easyMove(U, dt) {
    // A sent us to a door: walk straight there and knock as soon as it's lit
    const go = U.easyGo;
    if (go) {
      if (this.inZone(U, go) && Math.abs(U.x - go.x) < 70) {
        if (go.state === 'ready') { this.knock(go, U); U.easyGo = null; }
        else if (go.state === 'rest' && go.restT - go.st > 1.5) U.easyGo = null;   // long wait: stay, A again later
        return [0, 0];
      }
      return this.easyToward(U, go.x + (U.i % 3 - 1) * 30, U.easySlotY, 0.95);
    }
    // the owner's rule: nobody walks her unless A is pressed again and again (pressA)
    return [0, 0];
  }

  easyToward(U, tx, ty, sp) {
    const dx = tx - U.x, dy = ty - U.y, d = Math.hypot(dx, dy);
    if (d < 12) return [0, 0];
    const k = clamp(d / 50, 0, 1) * sp;
    return [(dx / d) * k, (dy / d) * k];
  }

  // --- CPU -----------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, A = U.ai, lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const mv = (x, y) => p.ctrl.move(x * CPU_SPEED, y * CPU_SPEED);
    if (A.dawdle > 0) {
      A.dawdle -= dt; p.ctrl.move(0, 0);
      if (chance(dt * 1.5)) p.ctrl.press('a');
      return;
    }
    if (lvl === 0 && chance(dt * 0.12)) { A.dawdle = rand(0.6, 1.4); return; }
    // nearby candy on the ground first
    let best = null, bd = [260, 380, 480][lvl];
    for (const c of this.spills) {
      if (c.gone || c.toPile || (!c.landed && c.t < c.dur * 0.6)) continue;
      const d = Math.hypot(c.tx - U.x, (c.ty - U.y) * 1.3);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) {
      steer(p, U.x, U.y, best.tx, best.ty, { arrive: 30 });
      p.ctrl.move(p.ctrl._axis.x * CPU_SPEED, p.ctrl._axis.y * CPU_SPEED);
      return;
    }
    if (U.brain.ready(dt) || !A.door || (A.door.state === 'rest' && A.door.restT - A.door.st > 1.2)) {
      U.brain.think();
      A.door = this.pickDoor(U, lvl);
      A.slot = rand(-70, 70); A.slotY = rand(WALK.y0 + 10, 870);
    }
    const d = A.door;
    if (!d) { mv(0, 0); return; }
    const tx = d.x + A.slot, ty = A.slotY;
    if (this.inZone(U, d) && Math.abs(U.x - tx) < 40) {
      p.ctrl.move(0, 0);
      if (d.state === 'ready') {
        if (A.knockAt == null) A.knockAt = this.t + reactionTime(p) * (lvl === 0 ? 1.6 : 1);
        if (this.t >= A.knockAt) { p.ctrl.press('a'); A.knockAt = null; }
      } else A.knockAt = null;
      if (d.state === 'rest' && d.st > 0.3) A.door = null;
      return;
    }
    steer(p, U.x, U.y, tx, ty, { arrive: 40, wobble: lvl < 2 });
    p.ctrl.move(p.ctrl._axis.x * CPU_SPEED, p.ctrl._axis.y * CPU_SPEED);
  }

  pickDoor(U, lvl) {
    let best = null, bs = Infinity;
    for (const d of this.doors) {
      let s = Math.abs(d.x - U.x);
      if (d.state === 'rest') s += 300 + Math.max(0, d.restT - d.st) * 350;
      else if (d.state !== 'ready') s += 700;
      if (d.gold) s -= [200, 500, 800][lvl];
      const crowd = this.units.filter((o) => o !== U && o.p.isAI && o.ai.door === d).length;
      s += crowd * 120;
      s += rand(0, [500, 250, 80][lvl]);
      if (s < bs) { bs = s; best = d; }
    }
    return best;
  }

  // --- drawing -----------------------------------------------------------------------------
  draw(g) {
    const t = this.t || this.t0;
    const bg = art('bg/trick-or-treat');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(streetBackground(), 0, 0);
    if (this.ghost) drawCandyGhost(g, this.ghost.x, this.ghost.y, t);
    this.doors.forEach((d, i) => {
      drawHouse(g, i, d.x);
      const lit = d.state === 'ready' ? 1 : d.light;
      drawDoor(g, d.x, d.open, lit, t, { gold: d.gold ? 1 : 0, shake: d.state === 'knock' ? 1 : 0, house: i });
      if (d.visitor && d.k > 0.01) {
        const vy = GROUND_Y + DOOR.bottom;
        if (d.visitor === 'jack') drawJack(g, d.x, vy, d.jack, d.st < 1.4 ? 1 : 0.3, t);
        else if (d.visitor === 'troll' && this.troll) { this.troll.alpha = d.k; this.troll.draw(g, { shadow: false }); }
        else drawVisitor(g, d.visitor, d.x, vy, t, d.k, d.st > 0.5);
      }
      const painted = paintedHouse(i);
      drawLantern(g, d.x - 100, GROUND_Y + 2, 0.95, lit, t, painted);
      drawLantern(g, d.x + 104, GROUND_Y + 2, 0.75, lit, t, painted);
      this.drawDoorCue(g, d, t);
    });
    // y-sorted: players, candies on the ground, the finale pile
    const list = [];
    for (const U of this.units) list.push({ y: U.y, fn: () => this.drawUnit(g, U, t) });
    for (const c of this.spills) if (c.t >= 0) list.push({ y: c.y, fn: () => this.drawSpill(g, c, t) });
    if (this.phase === 'finale') list.push({ y: 990, fn: () => drawCandyPile(g, W / 2, 1000, this.pileShown, t) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();
    for (const c of this.flying) if (c.t >= 0) drawCandy(g, c.kind, c.x, c.y, 40, c.rot, c.gold);
    for (const c of this.chickens) drawChicken(g, c.x, c.y, 90, c.rot);
    if (this.easy && this.phase === 'play') this.drawEasyPrompts(g);
  }

  /** Molly Easy: the big A beside the lit door a kid is standing at (A knocks). */
  drawEasyPrompts(g) {
    for (const U of this.units) {
      if (U.p.isAI) continue;
      const d = this.doorAt(U);
      if (!d || d.state !== 'ready') continue;
      easyPrompt(g, U.p, { target: { x: d.x, y: GROUND_Y + DOOR.top + 70 }, child: { x: U.x, y: U.y - U.z - U.a.height } });
    }
  }

  drawDoorCue(g, d, t) {
    if (this.phase !== 'play') return;
    const y = GROUND_Y + DOOR.top - 70;
    if (d.state === 'ready') {
      const human = this.units.some((U) => !U.p.isAI && this.inZone(U, d));
      if (human) {
        // Easy: the big A prompt is drawn over the players (drawEasyPrompts)
        if (!this.easy) ui.glyph(g, 'a', d.x, y + Math.sin(t * 8) * 5, 62, { pulse: true });
      } else {
        const b = Math.abs(Math.sin(t * 4 + d.i)) * 16;
        g.save(); g.translate(d.x, y - b);
        const s = d.gold ? 1.35 : 1;
        g.scale(s, s);
        g.fillStyle = d.gold ? '#ffd23f' : '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-14, -26); g.lineTo(14, -26); g.lineTo(14, -4); g.lineTo(26, -4); g.lineTo(0, 22); g.lineTo(-26, -4); g.lineTo(-14, -4); g.closePath(); g.fill(); g.stroke();
        g.restore();
        if (d.gold && Math.random() < 0.15) particles.burst(d.x + rand(-60, 60), GROUND_Y + DOOR.top + rand(0, 120), { type: 'sparkle', count: 1, colors: ['#ffd23f', '#fff'], speed: [20, 60] });
      }
    }
  }

  drawSpill(g, c, t) {
    const blink = c.life > 7.5 && !c.toPile ? (Math.sin(c.life * 20) > 0 ? 1 : 0.3) : 1;
    g.save(); g.globalAlpha = blink;
    if (c.landed || c.z < 200) { g.fillStyle = 'rgba(36,22,63,0.2)'; g.beginPath(); g.ellipse(c.x, c.y + 4, 18, 6, 0, 0, TAU); g.fill(); }
    drawCandy(g, c.kind, c.x, c.y - c.z - 12, c.gold ? 48 : 40, c.landed ? Math.sin(t * 3 + c.rot) * 0.3 + c.rot * 0.1 : c.rot, c.gold);
    g.restore();
  }

  drawUnit(g, U, t) {
    U.a.draw(g, { ring: U.p.color });
    const early = this.t < 5 || this.phase !== 'play';
    if (early || (!U.p.isAI && this.n > 1 && this.t < 9)) {
      const sc = this.n > 5 ? 0.75 : 0.9;
      g.save(); g.translate(U.x, U.y - U.z - U.a.height - 34); g.scale(sc, sc); ui.playerTag(g, U.p, 0, 0); g.restore();
    }
  }

  drawHUD(g) {
    const rects = ui.scoreboard(g, this.players, this.units.map((U) => U.count), {
      y: 16, avoidCenter: true,
      expr: this.units.map((U) => (U.laughT > 0 ? 'happy' : 'neutral')),
    });
    // a tiny candy on every chip
    rects.forEach((r, i) => drawCandy(g, i % 6, r.x + 98, r.y + 52, 26, 0.3));
    // (the clock is api.limit's, drawn by the play scene)
    if (this.banner) {
      const b = this.banner, fade = clamp((b.dur - b.t) / 0.25, 0, 1);
      g.save(); g.globalAlpha = fade;
      ui.banner(g, b.text, b.t, { size: 120, y: 330, color: b.color });
      g.restore();
    }
    if (this.phase === 'play' && this.t < 7) {
      const hint = this.easy ? 'Go knock on a door:' : 'Knock on a lit door with';
      g.save();
      g.globalAlpha = clamp((7 - this.t) / 0.5, 0, 1);
      const w = ui.measure(g, hint, 38, 800) + 150;
      ui.panel(g, W / 2 - w / 2, H - 96, w, 70, { r: 35 });
      ui.text(g, hint, W / 2 - 30, H - 60, { size: 38, color: NAVY, stroke: false, weight: 800 });
      ui.glyph(g, 'a', W / 2 + w / 2 - 52, H - 61, 48, { pulse: true });
      g.restore();
    }
  }
}
