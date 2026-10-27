// Whoopee Tea Party (Molly Party) - the cheeky flip of Teddy Tea Party.
// Duchess Teddy's prim guests (a poodle, a bunny, a fancy pig, a kitty) stroll
// in through the garden gates and head for a chair (it glows in their colour
// and pawprints lead to it). Grab a whoopee cushion from a basket (A), sneak
// it onto a chair (A) before they sit down... PFFFT! The hat flies off, the
// teacups and jelly jump, and the guest is SCANDALISED: a gasp with a popped
// monocle, a "Tsk tsk!" finger wag, a "Hmph!" nose in the air, steaming red
// cheeks or a fluttering fan (a shuffled bag, so it's a surprise every time).
// The grown-ups never laugh along: the prankster and their friends do.
// A pompous penguin butler patrols: if he spots you carrying a cushion ("!"),
// get away quickly or he politely takes it back (just grab another). Toy
// frogs turn up: hide one in a sugar bowl for a BOING. The finale: a giant
// golden super-whoopee that everyone heaves onto the Duchess's throne, a huge
// slow-motion PFFFT: her hat flies to the moon and she is OUTRAGED (steam,
// wagging finger, "Well I never!") while everyone else falls about laughing;
// at the very end she lets slip one tiny stifled giggle.
// Gentle counting: every prank scores; nearby scores share a place.
import { W, H } from '../engine/canvas.js';
import { Actor, POSES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, hasSound, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { aiProfile, reactionTime, Brain, steer, mash } from '../engine/ai.js';
import { bodyRadius, claimed, spread } from '../engine/crowd.js';
import { easySteer, easyNearest, easyPrompt, easyAutoOk } from '../engine/easy.js';
import { clamp, lerp, rand, pick, chance, TAU, ease, placementsFromScores, dist, later } from '../engine/util.js';
import {
  NAVY, GUESTS, GUEST_KINDS, GATES, drawGuest, drawGuestFx, guestHeadTop, drawHat, drawTable, drawChairBack, drawChairFront, CHAIR_SEAT,
  drawThrone, drawThroneFront, THRONE_SEAT, drawCushion, drawBasket, drawButler, drawFrog, drawMoon, drawPuff, drawGarden,
} from './whoopee-tea/art.js';
import { meta } from './whoopee-tea.meta.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

// --- tuning ---------------------------------------------------------------------
const SUPER_AT = 46;          // the golden super-whoopee appears
const FINALE_AT = 56.5;       // the Duchess sits down (timer reaches 0)
const FINALE_LEN = 3.8;
const FLOOR = { x0: 80, x1: 1840, y0: 392, y1: 1050 };
const MAX_SPEED = 600;
const ACCEL = 4200;
const CPU_CAP = [0.6, 0.7, 0.8];   // CPU speed per level: gentler than the other shelves
const REACH = 135;                 // how close you must be to a chair / basket / frog
const GUEST_SPEED = 165;
const GUEST_H = 190;
const TABLES = [{ x: 540, y: 640 }, { x: 1380, y: 640 }, { x: 960, y: 905 }];
const BASKETS = [{ x: 960, y: 640 }, { x: 200, y: 780 }, { x: 1720, y: 780 }];
const THRONE = { x: 960, y: 470 };   // low enough that the Duchess's outrage clears the timer
const BUTLER_PATH = [[330, 520], [960, 770], [1590, 520], [1600, 1000], [960, 760], [320, 1000]];
const FROG_TIMES = [9, 27];
const PFFT_PTS = 2, FROG_PTS = 3, FINALE_PTS = 3;
// How a prim guest reacts to a prank: never laughing, always scandalised. state =
// the art state (guestArtKey falls back to delivered art), fx = code-drawn extras.
const REACTS = {
  gasp: { state: 'shock', fx: ['shock'], say: ['Oh!', 'Gasp!', 'Oh my!'] },
  monocle: { state: 'shock', fx: ['shock'], say: ['Good heavens!'], monocle: true },
  fan: { state: 'shock', fx: ['fan'], say: ['Well I never!', 'Oh my!'] },
  scold: { state: 'scold', fx: ['scold'], say: ['Tsk tsk!'] },
  steam: { state: 'scold', fx: ['steam'], say: ['Harrumph!'] },
  huff: { state: 'huff', fx: ['huff'], say: ['Hmph!'], tilt: 0.13 },
};
const ONLOOK = ['gasp', 'fan', 'gasp', 'monocle'];   // guests at the same table: aghast
const REACT_T = 2.3;
const MOON = { x: 1640, y: 230 };
// sneaking with a cushion: the requested `tiptoe` pose once it exists, else `carry`
const SNEAK = POSES.tiptoe ? 'tiptoe' : 'carry';

export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: A does the action; A, A (no steering) walks you to it
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.time = 0;
    this.done = false;
    this.phase = 'party';      // party | super | finale
    // the tea-time clock, shown all game: at 0 the Duchess sits down
    api.limit(() => (this.phase === 'finale' || this.done ? null : Math.max(0, FINALE_AT - this.time)), { showAt: Infinity });
    this.scale = n <= 4 ? 1 : n <= 6 ? 0.9 : 0.82;
    this.banner = null;
    this.tables = TABLES.map((tb, i) => ({ ...tb, i, jump: 0, jelly: 0, frog: null }));
    this.chairs = [];
    for (const tb of this.tables) for (const side of [-1, 1]) {
      this.chairs.push({ x: tb.x + side * 178, y: tb.y + 4, facing: -side, table: tb, cushion: null, guest: null, flat: 0, sq: 0 });
    }
    this.guests = [];
    this.spawnT = 0.4;
    this.maxGuests = clamp(2 + Math.ceil(n / 2), 3, 6);
    this.kindBag = [];
    this.reactBag = [];
    this.hats = [];      // flying hats
    this.puffs = [];     // PFFFT clouds
    this.flyers = [];    // confiscated cushions flying back to a basket
    this.frogToy = null; // { x, y, t }
    this.frogN = 0;
    this.golden = null;
    this.duchess = null;
    this.moonK = 0;
    this.butler = { x: 330, y: 1000, wp: 0, facing: 1, step: 0, notice: null, cool: 4, noticeK: 0, say: null, sayT: 0, wait: 0 };
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? W / 2 : 300 + ((W - 600) * i) / (n - 1);
      const y = 1000 - (i % 2) * 50;
      const a = new Actor(p, { scale: this.scale, x, y });
      if (a.height < 110 * this.scale) a.scale *= (110 * this.scale) / a.height;   // tiny avatars (fairies) stay readable
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      return { p, a, i, x, y, vx: 0, vy: 0, held: null, score: 0, pffts: 0, frogs: 0, heaves: 0, cool: 0, brain: new Brain(p), plan: null, mashS: {}, popT: 0, popN: 0,
        auto: this.easy && !p.isAI ? { plan: null, t: 0, ix: 0, iy: 0 } : null };
    });
  }

  // ------------------------------------------------------------------ helpers
  freeChairs() { return this.chairs.filter((c) => !c.guest); }

  nextReact() {
    if (!this.reactBag.length) this.reactBag = Object.keys(REACTS).sort(() => Math.random() - 0.5);
    return this.reactBag.pop();
  }

  nextKind() {
    if (!this.kindBag.length) this.kindBag = GUEST_KINDS.slice().sort(() => Math.random() - 0.5);
    return this.kindBag.pop();
  }

  pop(e, str, color, size = 52) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    particles.popText(e.x + (e.popN % 2 ? 40 : -40) * Math.min(1, e.popN), e.y - e.a.height - 70 - (e.popN % 3) * 40, str, color, size);
  }

  // ------------------------------------------------------------------ guests
  spawnGuest() {
    const free = this.freeChairs();
    if (!free.length) return;
    // posh guests unknowingly favour chairs with a cushion on them (more PFFFTs!)
    const weights = free.map((c) => (c.cushion ? 2.5 : 1));
    let r = Math.random() * weights.reduce((s, v) => s + v, 0), chair = free[0];
    for (let i = 0; i < free.length; i++) { r -= weights[i]; if (r <= 0) { chair = free[i]; break; } }
    const gate = chair.x < W / 2 ? GATES[0] : GATES[1];
    const kind = this.nextKind();
    const gu = { kind, x: gate.x, y: gate.y, chair, state: 'walk', st: 0, step: rand(TAU), facing: 1, hat: true, gate, laughed: false, sayT: 0, say: null };
    chair.guest = gu;
    this.guests.push(gu);
    snd('wt-gate', 'tick', { vol: 0.3 });
    particles.burst(gate.x, gate.y - 60, { type: 'sparkle', count: 6, colors: [GUESTS[kind].dress, '#fff'], speed: [60, 160] });
  }

  updateGuests(dt) {
    for (const gu of this.guests) {
      gu.st += dt;
      if (gu.say) { gu.sayT -= dt; if (gu.sayT <= 0) gu.say = null; }
      const c = gu.chair;
      if (gu.frozen) continue;   // finale: stopped dead in their tracks
      if (gu.state === 'walk') {
        const tx = c.x, ty = c.y + 26;
        const d = dist(gu.x, gu.y, tx, ty);
        const sp = GUEST_SPEED * (this.phase === 'party' ? 1 : 1.4);
        if (d < sp * dt + 2) { gu.x = tx; gu.y = ty; gu.state = 'sitdown'; gu.st = 0; }
        else { gu.x += (tx - gu.x) / d * sp * dt; gu.y += (ty - gu.y) / d * sp * dt; gu.facing = tx > gu.x ? 1 : -1; gu.step += dt * 9; }
      } else if (gu.state === 'sitdown') {
        if (gu.st >= 0.35) this.sit(gu);
      } else if (gu.state === 'pfft') {
        if (gu.st >= 0.75) this.react(gu, gu.react || this.nextReact());
      } else if (gu.state === 'react') {
        if (gu.st >= (gu.onlook ? 1.8 : REACT_T)) {
          if (gu.onlook) { gu.state = 'sit'; gu.st = 0.6; gu.onlook = false; }
          else this.leave(gu);   // off they stalk in a huff
        }
      } else if (gu.state === 'sit') {
        if (gu.st >= 2.8) this.leave(gu);
      } else if (gu.state === 'leave') {
        const tx = gu.gate.x, ty = gu.gate.y - 10;
        const d = dist(gu.x, gu.y, tx, ty);
        if (d < 10) gu.gone = true;
        else { const sp = GUEST_SPEED * 1.2; gu.x += (tx - gu.x) / d * Math.min(d, sp * dt); gu.y += (ty - gu.y) / d * Math.min(d, sp * dt); gu.facing = tx > gu.x ? 1 : -1; gu.step += dt * 10; }
      }
    }
    this.guests = this.guests.filter((gu) => !gu.gone);
  }

  sit(gu) {
    const c = gu.chair;
    gu.x = c.x; gu.y = c.y;
    if (c.cushion) return this.pfft(gu, c);
    gu.state = 'sit'; gu.st = 0;
    snd('wt-sit', 'cush-plop', { vol: 0.35 });
    if (chance(0.5)) { gu.say = pick(['Tea time!', 'Delightful!', 'How posh!', 'Pinkies up!']); gu.sayT = 1.3; }
    c.table.frog && c.table.frog.armed && (c.table.frog.trigger = 0.5);
  }

  /** A guest goes from the jolt into their scandalised reaction. */
  react(gu, kind, onlook = false) {
    const R = REACTS[kind];
    gu.state = 'react'; gu.react = kind; gu.st = 0; gu.onlook = onlook;
    if (!onlook || chance(0.6)) { gu.say = pick(R.say); gu.sayT = onlook ? 1.4 : 1.9; }
    const sy = gu.chair.y - CHAIR_SEAT;
    if (R.monocle) {
      // the monocle pops right out
      const hy = guestHeadTop(gu.kind, sy, GUEST_H, 'shock') + GUEST_H * 0.17;
      this.hats.push({ kind: 'monocle', x: gu.chair.x + 12, y: hy, vx: rand(-260, 260), vy: -rand(600, 800), rot: 0, vr: rand(-14, 14), w: 30, t: 0, owner: null });
      snd('wt-monocle', 'pop', { vol: 0.35 });
    }
    if (kind === 'scold' || kind === 'steam') snd('wt-tsk', 'tick', { vol: 0.35 });
  }

  pfft(gu, c) {
    const e = c.cushion.owner;
    gu.state = 'pfft'; gu.st = 0; gu.laughed = true;
    gu.react = this.nextReact();
    gu.face = e ? (e.x >= c.x ? 1 : -1) : c.facing;   // they glare/scold at the culprit
    c.cushion = null; c.flat = 1; c.sq = 1;
    const sx = c.x, sy = c.y - CHAIR_SEAT;
    snd('wt-pfft', 'pt-honk', { vol: 0.8, rate: rand(0.85, 1.15) });
    later(() => snd('wt-gasp', 'crowd-gasp', { vol: 0.45 }), 120);
    this.puffs.push({ x: sx - c.facing * 30, y: sy + 10, r: 110, k: 0, life: 0.9 });
    particles.popText(sx, sy - 230, 'PFFFT!', '#ff7ac6', 74);
    particles.burst(sx, sy, { type: 'smoke', count: 10, colors: ['#ffffff', '#e8e0ff'], speed: [120, 320] });
    particles.burst(sx, sy - 120, { type: 'star', count: 10, colors: RAINBOW, speed: [150, 380] });
    fx.shake(10, 0.25); fx.hitstop(0.05);
    this.api.camera && this.api.camera.punch(sx, sy - 80, 1.1, 0.4);
    // hat flies off
    if (gu.hat) {
      gu.hat = false;
      const hy = guestHeadTop(gu.kind, sy, GUEST_H, 'gasp');
      this.hats.push({ kind: gu.kind, x: sx, y: hy, vx: rand(-260, 260), vy: -rand(900, 1150), rot: 0, vr: rand(-10, 10), w: 74, owner: gu, t: 0 });
      snd('wt-hat', 'bigpop', { vol: 0.45 });
    }
    // the table jumps, and everyone sitting there is aghast
    c.table.jump = 1; c.table.jelly = 1;
    snd('wt-cups', 'tick', { vol: 0.4 });
    for (const o of this.guests) if (o !== gu && o.chair.table === c.table && o.state === 'sit') { o.face = c.x >= o.chair.x ? 1 : -1; this.react(o, pick(ONLOOK), true); }
    // ...while the pranksters giggle
    later(() => snd('wt-giggles', 'giggle', { vol: 0.6 }), 650);
    // score
    if (e) {
      e.score += PFFT_PTS; e.pffts++;
      this.pop(e, '+' + PFFT_PTS, e.p.color, 58);
      e.a.playOnce('laugh', 0.9, 'idle'); e.a.emote('happy', 1);
      if (chance(0.5)) voice(e.p.charId, 'laugh');
      if (!e.p.isAI) e.p.ctrl.rumble(0.5, 140);
    }
    // friends nearby crack up too
    for (const o of this.ents) if (o !== e && dist(o.x, o.y, sx, c.y) < 520 && !o.a._once) later(() => { if (!this.done) o.a.playOnce('laugh', 0.8, 'idle'); }, 150 + Math.random() * 250);
  }

  leave(gu) {
    gu.state = 'leave'; gu.st = 0; gu.say = null;
    gu.chair.guest = null;
    gu.gate = gu.x < W / 2 ? GATES[0] : GATES[1];
    if (!gu.hat) gu.hat = true;   // they popped it back on
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2) this.banner = null; }
    if (this.phase === 'party') {
      this.spawnT -= dt;
      const live = this.guests.filter((gu) => gu.state !== 'leave').length;
      if (this.spawnT <= 0 && live < this.maxGuests) { this.spawnGuest(); this.spawnT = rand(1.3, 2.4) * (this.n >= 5 ? 0.75 : 1); }
      if (this.frogN < FROG_TIMES.length && this.time >= FROG_TIMES[this.frogN]) { this.frogN++; this.spawnFrog(); }
      if (this.time >= SUPER_AT) this.startSuper();
    }
    if (this.phase === 'super') this.updateSuper(dt);
    if (this.phase === 'finale') this.updateFinale(dt);
    this.updateGuests(dt);
    this.updateButler(dt);
    this.updateProps(dt);
    for (const e of this.ents) {
      if (e.p.isAI && this.phase !== 'finale') this.aiThink(e, dt);
      if (e.auto) this.easyThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate(dt);
    for (const e of this.ents) { e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
  }

  postUpdate(dt) {
    this.t += dt;
    if (this.phase === 'finale') this.updateFinale(dt);
    this.updateGuests(dt);
    this.updateProps(dt);
    for (const e of this.ents) e.a.update(dt);
  }

  updateProps(dt) {
    for (const tb of this.tables) {
      tb.jump = Math.max(0, tb.jump - dt * 1.6); tb.jelly = Math.max(0, tb.jelly - dt * 0.7);
      const f = tb.frog;
      if (f) {
        f.t += dt;
        if (f.armed) {
          if (f.trigger !== undefined) { f.trigger -= dt; if (f.trigger <= 0) this.frogSpring(tb); }
          else if (f.t > 5) this.frogSpring(tb);
        } else { f.pop = Math.min(1, f.pop + dt * 4); if (f.t > 1.8) tb.frog = null; }
      }
    }
    for (const c of this.chairs) { c.flat = Math.max(0, c.flat - dt * 0.8); c.sq *= Math.exp(-8 * dt); }
    for (const h of this.hats) {
      h.t += dt;
      if (h.moon) {
        const k = clamp(h.t / 1.8, 0, 1), e = ease.inOutQuad(k);
        h.x = lerp(h.x0, MOON.x - 10, e); h.y = lerp(h.y0, MOON.y - 70, e) - Math.sin(k * Math.PI) * 260; h.rot += h.vr * dt * (1 - k);
        if (k >= 1 && !h.landed) { h.landed = true; h.rot = -0.25; snd('wt-moon', 'sm-moon', { vol: 0.6 }); particles.burst(MOON.x, MOON.y - 60, { type: 'star', count: 24, colors: ['#fff3b0', '#ffd23f', '#fff'], speed: [100, 360] }); }
        continue;
      }
      h.vy += 2100 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt;
      // it lands back on its owner's head (plop!)
      const o = h.owner;
      if (h.vy > 0 && o) {
        const sy = o.state === 'walk' || o.state === 'leave' ? o.y : o.chair.y - CHAIR_SEAT;
        const ty = guestHeadTop(o.kind, sy, GUEST_H, o.state === 'leave' || o.state === 'walk' ? 'walk' : o.state === 'react' ? REACTS[o.react].state : o.state === 'pfft' ? 'shock' : 'sit') + 12;
        h.x = lerp(h.x, o.x, 1 - Math.exp(-5 * dt));
        if (h.y >= ty) { h.dead = true; o.hat = true; snd('wt-hat-plop', 'pop', { vol: 0.3 }); }
      }
      if (h.y > H + 200) { h.dead = true; if (o) o.hat = true; }
    }
    this.hats = this.hats.filter((h) => !h.dead);
    for (const p of this.puffs) p.k += dt / p.life;
    this.puffs = this.puffs.filter((p) => p.k < 1);
    for (const f of this.flyers) {
      f.k += dt / 0.6;
      const k = clamp(f.k, 0, 1);
      f.x = lerp(f.x0, f.x1, k); f.y = lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * 220;
      if (k >= 1) { f.dead = true; particles.burst(f.x1, f.y1, { type: 'sparkle', count: 6, colors: ['#ff7ac6', '#fff'] }); }
    }
    this.flyers = this.flyers.filter((f) => !f.dead);
    if (this.frogToy) this.frogToy.t += dt;
  }

  // ------------------------------------------------------------------ frog
  spawnFrog() {
    if (this.frogToy || this.ents.some((e) => e.held === 'frog')) return;
    let x, y, tries = 0;
    do { x = rand(300, 1620); y = rand(470, 1000); tries++; } while (tries < 30 && (this.blocked(x, y, 140)));
    this.frogToy = { x, y, t: 0 };
    this.banner = { text: 'Toy frog!', t: 0, color: '#6fd06a', size: 110 };
    snd('wt-frog', 'boing', { vol: 0.6 });
    particles.burst(x, y - 40, { type: 'star', count: 14, colors: ['#6fd06a', '#ffd23f', '#fff'], speed: [120, 320] });
  }

  frogSpring(tb) {
    const f = tb.frog;
    f.armed = false; f.t = 0; f.pop = 0;
    const e = f.owner;
    snd('wt-frog-spring', 'boing', { vol: 0.8 });
    snd('wt-gasp', 'crowd-gasp', { vol: 0.4 });
    tb.jump = 1; tb.jelly = 1;
    fx.shake(9, 0.25);
    const bx = tb.x - 80, by = tb.y - 140;
    particles.popText(bx, by - 170, 'BOING!', '#6fd06a', 70);
    particles.burst(bx, by - 40, { type: 'confetti', count: 26, speed: [200, 500] });
    for (const gu of this.guests) {
      if (gu.chair.table === tb && (gu.state === 'sit' || gu.state === 'sitdown')) {
        gu.state = 'pfft'; gu.st = 0; gu.laughed = true; gu.react = this.nextReact();
        gu.face = e ? (e.x >= gu.chair.x ? 1 : -1) : gu.chair.facing;
        if (gu.hat) { gu.hat = false; const sy = gu.chair.y - CHAIR_SEAT; this.hats.push({ kind: gu.kind, x: gu.x, y: guestHeadTop(gu.kind, sy, GUEST_H, 'gasp'), vx: rand(-200, 200), vy: -rand(850, 1050), rot: 0, vr: rand(-10, 10), w: 74, owner: gu, t: 0 }); }
      }
    }
    later(() => snd('wt-giggles', 'giggle', { vol: 0.6 }), 600);
    if (e) {
      e.score += FROG_PTS; e.frogs++;
      this.pop(e, '+' + FROG_PTS, '#6fd06a', 60);
      e.a.playOnce('laugh', 0.9, 'idle'); e.a.emote('happy', 1);
      if (chance(0.5)) voice(e.p.charId, 'laugh');
    }
    for (const o of this.ents) if (o !== e && dist(o.x, o.y, tb.x, tb.y) < 520 && !o.a._once) later(() => { if (!this.done) o.a.playOnce('laugh', 0.8, 'idle'); }, 150 + Math.random() * 250);
  }

  // ------------------------------------------------------------------ the butler
  updateButler(dt) {
    const b = this.butler;
    if (b.scoldT > 0) b.scoldT -= dt;
    if (b.say) { b.sayT -= dt; if (b.sayT <= 0) b.say = null; }
    if (this.phase === 'finale') { b.noticeK = Math.max(0, b.noticeK - dt * 3); return; }
    b.cool -= dt;
    if (b.notice) {
      const n = b.notice, e = n.ent;
      n.t += dt;
      b.noticeK = Math.min(1, b.noticeK + dt * 4);
      b.facing = e.x >= b.x ? 1 : -1;
      if (n.t >= 0.95) {
        if (e.held && dist(b.x, b.y, e.x, e.y) < 300) this.confiscate(e);
        else { b.say = 'Hmm?'; b.sayT = 0.9; }
        b.notice = null; b.cool = e.held ? 1.2 : 3.2;
      }
      return;
    }
    b.noticeK = Math.max(0, b.noticeK - dt * 3);
    if (b.wait > 0) { b.wait -= dt; return; }
    const [tx, ty] = BUTLER_PATH[b.wp];
    const d = dist(b.x, b.y, tx, ty), sp = 150;
    if (d < sp * dt + 2) { b.wp = (b.wp + 1) % BUTLER_PATH.length; b.wait = rand(0.3, 0.9); }
    else { b.x += (tx - b.x) / d * sp * dt; b.y += (ty - b.y) / d * sp * dt; if (Math.abs(tx - b.x) > 4) b.facing = tx > b.x ? 1 : -1; b.step += dt * 7; }
    if (b.cool <= 0 && this.phase === 'party') {
      let best = null, bd = 250;
      for (const e of this.ents) {
        if (!e.held || e.auto) continue;   // Molly Easy: he never catches a little one who can't run
        const dx = e.x - b.x, dd = Math.hypot(dx, (e.y - b.y) * 1.3);
        if (dd < bd && dx * b.facing > -50) { bd = dd; best = e; }
      }
      if (best) {
        b.notice = { ent: best, t: 0 };
        snd('wt-butler', 'roller-ding', { vol: 0.5 });
        sfx('whistle', { vol: 0.25 });
      }
    }
  }

  confiscate(e) {
    const b = this.butler;
    const held = e.held;
    e.held = null; e.cool = 0.3;
    b.say = pick(['Ahem!', 'Tsk tsk!']); b.sayT = 1.2; b.scoldT = 1.2;
    snd('wt-confiscate', 'whoosh', { vol: 0.5 });
    const basket = BASKETS.reduce((best, k) => (dist(k.x, k.y, e.x, e.y) < dist(best.x, best.y, e.x, e.y) ? k : best));
    if (held === 'frog') { this.frogToy = { x: clamp(e.x + rand(-200, 200), 300, 1620), y: clamp(e.y + rand(-100, 100), 480, 1000), t: 0 }; }
    else this.flyers.push({ x0: e.x, y0: e.y - e.a.height - 30, x1: basket.x, y1: basket.y - 110, x: e.x, y: e.y, k: 0 });
    e.a.playOnce('surprised', 0.5, 'giggle'); e.a.squash(0.3);
    later(() => { if (!this.done) e.a.playOnce('giggle', 0.6, 'idle'); }, 500);
    particles.burst(e.x, e.y - e.a.height, { type: 'star', count: 6, colors: ['#ffd23f', '#fff'] });
    if (!e.p.isAI) e.p.ctrl.rumble(0.3, 100);
  }

  // ------------------------------------------------------------------ super whoopee + finale
  startSuper() {
    this.phase = 'super';
    this.golden = { x: 960, y: 1010, sq: 0, arrived: false, onSeat: 0, heaveT: 0 };
    this.banner = { text: 'Super Whoopee!', t: 0, color: '#ffd23f', size: 130 };
    snd('wt-super', 'golden-chime', { vol: 0.7 }); sfx('fanfare', { vol: 0.4 });
    fx.flash('#fff3b0', 0.2); fx.shake(8, 0.3);
    particles.burst(960, 960, { type: 'star', count: 40, colors: ['#ffd23f', '#fff3b0', '#fff'], speed: [200, 600] });
    // carried cushions poof back into the baskets
    for (const e of this.ents) if (e.held === 'cushion') { e.held = null; particles.burst(e.x, e.y - e.a.height - 30, { type: 'smoke', count: 6, colors: ['#fff'] }); }
    this.butler.notice = null;
  }

  updateSuper(dt) {
    const gc = this.golden;
    gc.sq *= Math.exp(-7 * dt);
    if (Math.random() < dt * 8) particles.trail(gc.x + rand(-140, 140), gc.y - rand(0, 110), { type: 'sparkle', colors: ['#ffd23f', '#fff'], size: [8, 14], speed: [10, 50], life: [0.4, 0.8] });
    // the Duchess sets off from the gate and parades in
    if (!this.duchess && this.time >= SUPER_AT + 1.5) {
      this.duchess = { x: GATES[0].x, y: GATES[0].y, state: 'walk', st: 0, step: 0, facing: 1, hat: true, monocle: true, wp: 0 };
      this.banner = { text: 'The Duchess!', t: 0, color: '#c8a6ff', size: 110 };
      snd('wt-duchess', 'fanfare', { vol: 0.35 });
    }
    const du = this.duchess;
    if (du && du.state === 'walk') {
      const path = [[560, 420], [820, 470], [THRONE.x, THRONE.y + 30]];
      const [tx, ty] = path[du.wp];
      const left = Math.max(0.3, FINALE_AT - 0.3 - this.time);
      let rest = dist(du.x, du.y, tx, ty);
      for (let i = du.wp + 1; i < path.length; i++) rest += dist(...path[i - 1], ...path[i]);
      const sp = clamp(rest / left, 60, 260);
      const d = dist(du.x, du.y, tx, ty);
      if (d < sp * dt + 2) { du.x = tx; du.y = ty; if (du.wp < path.length - 1) du.wp++; else du.state = 'wait'; }
      else { du.x += (tx - du.x) / d * sp * dt; du.y += (ty - du.y) / d * sp * dt; du.facing = tx > du.x ? 1 : -1; du.step += dt * 7; }
    }
    // the golden cushion slides itself the last bit if the team needs help
    if (!gc.arrived) {
      if (this.time > FINALE_AT - 3) this.moveGolden(dt * 220, null);
    } else gc.onSeat = Math.min(1, gc.onSeat + dt * 3);
    if (du && du.state === 'wait' && gc.arrived && gc.onSeat >= 1 && this.time >= FINALE_AT - 0.1) this.startFinale();
  }

  /** Move the golden cushion toward the throne by `amount` px. */
  moveGolden(amount, by) {
    const gc = this.golden;
    const tx = THRONE.x, ty = THRONE.y + 40;
    const d = dist(gc.x, gc.y, tx, ty);
    if (d <= amount + 2) {
      gc.x = tx; gc.y = ty; gc.arrived = true; gc.onSeat = 0;
      this.banner = { text: 'Ready...', t: 0, color: '#ffd23f', size: 110 };
      snd('wt-place', 'cush-plop', { vol: 0.7 }); sfx('star', { vol: 0.5 });
      particles.burst(tx, THRONE.y - THRONE_SEAT, { type: 'star', count: 24, colors: ['#ffd23f', '#fff'], speed: [150, 400] });
      for (const e of this.ents) { e.a.playOnce('giggle', 1.2, 'idle'); }
      return;
    }
    gc.x += (tx - gc.x) / d * amount; gc.y += (ty - gc.y) / d * amount;
    gc.sq = 0.35;
    if (!by) return;
    by.heaves++;
    if (by.heaves % 2 === 0) { by.score++; this.pop(by, '+1', '#ffd23f', 46); }
  }

  heave(e) {
    const gc = this.golden;
    if (!gc || gc.arrived) return;
    e.cool = e.p.isAI ? 0.32 : 0.16;
    e.a.playOnce('push', 0.3, 'idle'); e.a.squash(0.2);
    e.a.facing = gc.x >= e.x ? 1 : -1;
    snd('wt-heave', 'pump', { vol: 0.4, rate: rand(0.9, 1.2) });
    particles.burst(gc.x + rand(-60, 60), gc.y, { type: 'dust', count: 3, colors: ['#e8f7d8', '#fff'], speed: [60, 160] });
    this.moveGolden(26 * clamp(4.5 / this.n, 0.5, 1.4), e);
  }

  startFinale() {
    this.phase = 'finale'; this.finT = 0;
    const du = this.duchess;
    du.state = 'gasp'; du.st = 0; du.x = THRONE.x; du.y = THRONE.y - THRONE_SEAT;
    const sx = THRONE.x, sy = THRONE.y - THRONE_SEAT;
    snd('wt-mega-pfft', 'pt-honk', { vol: 1, rate: 0.6 });
    later(() => snd('wt-gasp', 'crowd-gasp', { vol: 0.6 }), 300);
    fx.slowmo(0.35, 1.4); fx.shake(22, 0.7); fx.flash('#fff3b0', 0.3);
    this.api.camera && this.api.camera.punch(sx, sy - 60, 1.25, 1.0);
    this.puffs.push({ x: sx, y: sy + 20, r: 260, k: 0, life: 1.6, golden: true });
    particles.popText(sx, sy - 330, 'PFFFFFFT!', '#ffd23f', 110);
    particles.burst(sx, sy, { type: 'smoke', count: 30, colors: ['#ffffff', '#fff3b0'], speed: [200, 600] });
    particles.burst(sx, sy - 150, { type: 'star', count: 40, colors: RAINBOW, speed: [250, 700] });
    // the monocle pops out, the hat rockets to the moon
    du.monocle = false;
    this.hats.push({ kind: 'monocle', x: sx + 20, y: sy - 170, vx: 380, vy: -700, rot: 0, vr: 14, w: 40, t: 0, owner: null });
    du.hat = false;
    const hy = guestHeadTop('duchess', sy, GUEST_H * 1.25, 'gasp');
    this.hats.push({ kind: 'duchess', x: sx, y: hy, x0: sx, y0: hy, moon: true, rot: 0, vr: 12, w: 150, t: 0 });
    snd('wt-hat-launch', 'whoosh', { vol: 0.7 });
    this.golden.flat = true;
  }

  updateFinale(dt) {
    this.finT += dt;
    this.moonK = Math.min(1, this.moonK + dt * 1.5);
    const du = this.duchess;
    if (du) du.st += dt;
    if (du && du.state === 'gasp' && du.st > 0.9) {
      // the punchline: the grandest lady in the land, utterly SCANDALISED
      du.state = 'outrage'; du.st = 0;
      du.say = 'WELL I NEVER!'; du.sayT = 2.2;
      snd('wt-outrage', 'crowd-gasp', { vol: 0.7, rate: 0.8 });
      later(() => snd('wt-giggles', 'giggle', { vol: 0.8 }), 350);
      sfx('cheer', { vol: 0.5 });
      fx.shake(12, 0.4);
      particles.confettiRain(W, 120);
      // the other guests are frozen in horror
      for (const gu of this.guests) {
        if (gu.state === 'walk' || gu.state === 'leave') { gu.frozen = true; gu.react = 'gasp'; continue; }
        gu.face = THRONE.x >= gu.chair.x ? 1 : -1;
        this.react(gu, pick(['gasp', 'fan', 'gasp']), true); gu.st = -9; gu.say = null;
      }
      // ...and the players fall about laughing
      for (const e of this.ents) {
        e.score += FINALE_PTS;
        this.pop(e, '+' + FINALE_PTS, '#ffd23f', 54);
        e.a.setPose(chance(0.7) ? 'laugh' : 'celebrate');
        if (chance(0.4)) voice(e.p.charId, 'laugh');
      }
      this.butler.say = 'Tsk tsk!'; this.butler.sayT = 2.4; this.butler.scoldT = 2.4;
    }
    if (du && du.say) { du.sayT -= dt; if (du.sayT <= 0) du.say = null; }
    if (du && du.state === 'outrage') {
      if (Math.random() < dt * 2.5) fx.shake(5, 0.15);
      // softening: one tiny stifled giggle right at the end
      if (this.finT > FINALE_LEN - 0.75) { du.state = 'soften'; du.st = 0; du.say = '...hee!'; du.sayT = 1; }
    }
    if (this.finT > FINALE_LEN && !this.done) this.finish();
  }

  // ------------------------------------------------------------------ players
  blocked(x, y, pad = 0) {
    for (const tb of this.tables) if (Math.hypot(x - tb.x, (y - tb.y + 12) * 2.2) < 110 + pad) return true;
    if (Math.hypot(x - THRONE.x, (y - THRONE.y + 10) * 2) < 130 + pad) return true;
    return false;
  }

  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.cool = Math.max(0, e.cool - dt); e.popT = Math.max(0, e.popT - dt);
    const lock = this.phase === 'finale' || this.done;
    // Easy: the stick runs you like Medium while pushed (the autopilot waits and
    // then re-plans from wherever you got to)
    const st = e.auto ? easySteer(e, c, dt) : null;
    if (st && st.pushing) e.auto.goA = false;
    const manual = !!(st && st.manual && !e.auto.goA);
    const ix = lock ? 0 : manual ? st.x : e.auto ? e.auto.ix : c.x, iy = lock ? 0 : manual ? st.y : e.auto ? e.auto.iy : c.y;
    const m = Math.hypot(ix, iy), k = m > 1 ? 1 / m : 1;
    const cap = p.isAI ? CPU_CAP[clamp(p.aiLevel ?? 0, 0, 2)] : e.auto ? (manual ? 0.85 : 0.72) : 1;
    const tx = ix * k * MAX_SPEED * cap, ty = iy * k * MAX_SPEED * 0.8 * cap;
    const step = ACCEL * dt;
    e.vx += clamp(tx - e.vx, -step, step); e.vy += clamp(ty - e.vy, -step, step);
    e.x = clamp(e.x + e.vx * dt, FLOOR.x0, FLOOR.x1);
    e.y = clamp(e.y + e.vy * dt, FLOOR.y0, FLOOR.y1);
    this.pushOut(e);
    if (!lock && c.pressed('a') && e.cool <= 0) this.action(e);
    if (!a._once && !lock) {
      const sp = Math.hypot(e.vx, e.vy);
      if (e.held && sp > 40) { a.setPose(SNEAK); if (Math.abs(e.vx) > 4) a.facing = e.vx > 0 ? 1 : -1; a.speed = clamp(sp / MAX_SPEED, 0, 1); }
      else if (e.held) a.setPose('carry');
      else a.moveAnim(e.vx, e.vy, MAX_SPEED, { run: sp > 420 });
    }
  }

  pushOut(e) {
    const obs = [...this.tables.map((tb) => [tb.x, tb.y - 12, 110]), [THRONE.x, THRONE.y - 10, 130], ...BASKETS.map((b) => [b.x, b.y - 10, 80])];
    for (const [ox, oy, r] of obs) {
      const dx = e.x - ox, dy = (e.y - oy) * 2.2, d = Math.hypot(dx, dy);
      if (d < r && d > 0.01) { const push = (r - d); e.x += (dx / d) * push; e.y += (dy / d) * push / 2.2; }
    }
    e.x = clamp(e.x, FLOOR.x0, FLOOR.x1); e.y = clamp(e.y, FLOOR.y0, FLOOR.y1);
  }

  separate(dt) {
    // push apart by the drawn sprite size (the old radius let 5-6 players stack on one basket)
    spread(this.ents, { radius: (e) => bodyRadius(e.a), yScale: 1.6, strength: Math.min(1, dt * 12), bounds: FLOOR });
  }

  /** What A would do for this player right now: { kind, target } or null. */
  actionFor(e) {
    if (this.phase === 'super') {
      const gc = this.golden;
      if (gc && !gc.arrived && dist(e.x, e.y, gc.x, gc.y) < 190) return { kind: 'heave', target: gc };
      return null;
    }
    if (this.phase !== 'party') return null;
    if (e.held === 'cushion') {
      let best = null, bd = REACH;
      for (const c of this.chairs) {
        if (c.cushion || (c.guest && c.guest.state !== 'walk')) continue;
        const d = dist(e.x, e.y, c.x, c.y + 10);
        if (d < bd) { bd = d; best = c; }
      }
      return best ? { kind: 'place', target: best } : null;
    }
    if (e.held === 'frog') {
      let best = null, bd = 200;
      for (const tb of this.tables) { if (tb.frog) continue; const d = dist(e.x, e.y, tb.x, tb.y); if (d < bd) { bd = d; best = tb; } }
      return best ? { kind: 'hide', target: best } : null;
    }
    if (this.frogToy && dist(e.x, e.y, this.frogToy.x, this.frogToy.y) < REACH) return { kind: 'frog', target: this.frogToy };
    for (const b of BASKETS) if (dist(e.x, e.y, b.x, b.y) < REACH + 30) return { kind: 'grab', target: b };
    return null;
  }

  action(e) {
    const act = this.actionFor(e);
    const a = e.a;
    if (!act) {
      a.playOnce('think', 0.3); e.cool = 0.2;
      // Easy: nothing in reach - A again (no steering) walks you to the next thing, then does it
      if (e.auto && easyAutoOk(e)) { e.auto.goA = true; e.auto.goT = 6; e.auto.plan = null; e._ezSteer = 0; }
      return;
    }
    if (act.kind === 'heave') return this.heave(e);
    if (act.kind === 'grab') {
      e.held = 'cushion'; e.cool = 0.2;
      a.playOnce('catch', 0.3); a.squash(0.25);
      snd('wt-grab', 'squeak', { vol: 0.5 });
      particles.burst(act.target.x, act.target.y - 110, { type: 'sparkle', count: 8, colors: ['#ff7ac6', '#fff'], speed: [100, 240] });
      return;
    }
    if (act.kind === 'frog') {
      e.held = 'frog'; e.cool = 0.2; this.frogToy = null;
      a.playOnce('catch', 0.3); a.squash(0.25);
      snd('wt-frog-get', 'collect', { vol: 0.6, step: 6 });
      return;
    }
    if (act.kind === 'place') {
      const c = act.target;
      c.cushion = { owner: e, t: 0 }; c.sq = 0.6; e.held = null; e.cool = 0.25;
      a.playOnce('action', 0.35, 'idle'); a.squash(0.3);
      a.facing = c.x >= e.x ? 1 : -1;
      snd('wt-place', 'cush-plop', { vol: 0.55 });
      particles.burst(c.x, c.y - CHAIR_SEAT, { type: 'sparkle', count: 10, colors: ['#ff7ac6', '#fff', e.p.color], speed: [80, 220] });
      if (chance(0.4)) a.emote('happy', 0.8);
      if (!e.p.isAI) e.p.ctrl.rumble(0.25, 60);
      return;
    }
    if (act.kind === 'hide') {
      const tb = act.target;
      tb.frog = { owner: e, armed: true, t: 0, pop: 0 };
      if (this.guests.some((gu) => gu.chair.table === tb && gu.state === 'sit')) tb.frog.trigger = 0.6;
      e.held = null; e.cool = 0.25;
      a.playOnce('action', 0.35, 'idle'); a.squash(0.3);
      snd('wt-place', 'cush-plop', { vol: 0.4 }); sfx('giggle', { vol: 0.35 });
      particles.burst(tb.x - 80, tb.y - 150, { type: 'sparkle', count: 8, colors: ['#6fd06a', '#fff'] });
    }
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, c = p.ctrl;
    if (this.phase === 'super') {
      const gc = this.golden;
      if (!gc || gc.arrived) {
        // hide either side of the throne and wait for the Duchess, giggling
        const hx = (e.i % 2 ? 1 : -1) * (210 + Math.floor(e.i / 2) * 70) + 960, hy = 520 + (e.i % 3) * 30;
        const d = steer(p, e.x, e.y, hx, hy, { arrive: 60 });
        if (d < 30) { c.move(0, 0); if (!e.a._once && chance(dt * 0.8)) e.a.playOnce('giggle', 0.8, 'idle'); }
        return;
      }
      const side = (e.i % 4) - 1.5;
      const d = steer(p, e.x, e.y, gc.x + side * 70, gc.y + 60, { arrive: 50 });
      if (dist(e.x, e.y, gc.x, gc.y) < 170) { if (d < 30) c.move(0, 0); mash(p, dt, 'a', e.mashS); }
      return;
    }
    if (e.brain.ready(dt)) {
      e.brain.wait(reactionTime(p) + (p.aiLevel ? 0 : rand(0.15, 0.5)));
      e.plan = this.aiPlan(e);
    }
    const pl = e.plan;
    if (!pl) { c.move(0, 0); return; }
    if (pl.wander) {
      pl.t -= dt; if (pl.t <= 0) e.plan = null;
      if (steer(p, e.x, e.y, pl.x, pl.y, { arrive: 60 }) < 30) c.move(0, 0);
      return;
    }
    // validate
    if (pl.kind === 'grab' && e.held) { e.plan = null; return; }
    if (pl.kind === 'place' && (e.held !== 'cushion' || pl.target.cushion || (pl.target.guest && pl.target.guest.state !== 'walk'))) { e.plan = null; return; }
    if (pl.kind === 'frog' && (!this.frogToy || e.held)) { e.plan = null; return; }
    if (pl.kind === 'hide' && (e.held !== 'frog' || pl.target.frog)) { e.plan = null; return; }
    const d = steer(p, e.x, e.y, pl.x, pl.y, { arrive: 50 });
    const act = this.actionFor(e);
    if (act && act.kind === pl.kind && (act.target === pl.target || pl.kind === 'grab') && e.cool <= 0) { c.press('a'); e.brain.wait(reactionTime(p) * 0.5); }
    else if (d < 16) c.move(0, 0);
  }

  /** A wander spot with some elbow room: idle CPUs (all chairs taken) used to drift into one middle knot. */
  roomySpot(e) {
    let best = null, bd = -1;
    for (let i = 0; i < 5; i++) {
      const x = rand(300, 1620), y = rand(480, 1000);
      const d = this.ents.reduce((m, o) => (o === e ? m : Math.min(m, dist(x, y, o.x, o.y))), 1e9);
      if (d > bd) { bd = d; best = { x, y }; }
    }
    return best;
  }

  aiPlan(e, sure = false) {
    const prof = aiProfile(e.p);
    if (!sure && chance(prof.mistake * 0.6)) return { wander: true, ...this.roomySpot(e), t: rand(0.5, 1.1) };
    if (e.held === 'cushion') {
      const free = this.chairs.filter((c) => !c.cushion && !(c.guest && c.guest.state !== 'walk'));
      if (!free.length) return { wander: true, ...this.roomySpot(e), t: rand(0.8, 1.4) };
      const claimed = new Set(this.ents.filter((o) => o !== e).map((o) => (o.auto ? o.auto.plan : o.plan)).filter((pl) => pl && pl.kind === 'place').map((pl) => pl.target));
      let pool = free.filter((c) => !claimed.has(c));
      if (!pool.length) pool = free;
      const coming = pool.filter((c) => c.guest);
      const lvl = clamp(e.p.aiLevel ?? 0, 0, 2);
      const list = coming.length && (sure || chance([0.45, 0.7, 0.9][lvl])) ? coming : pool;
      const target = list.reduce((b, c) => (dist(c.x, c.y, e.x, e.y) < dist(b.x, b.y, e.x, e.y) ? c : b));
      return { kind: 'place', target, x: target.x + (e.x < target.x ? -60 : 60), y: target.y + 40 };
    }
    if (e.held === 'frog') {
      const tbs = this.tables.filter((tb) => !tb.frog);
      if (!tbs.length) return null;
      const target = tbs.reduce((b, tb) => (dist(tb.x, tb.y, e.x, e.y) < dist(b.x, b.y, e.x, e.y) ? tb : b));
      return { kind: 'hide', target, x: target.x, y: target.y + 60 };
    }
    if (this.frogToy && chance(0.5)) return { kind: 'frog', target: this.frogToy, x: this.frogToy.x, y: this.frogToy.y };
    // a basket nobody else is heading to beats a slightly nearer busy one
    const planOf = (o) => { const pl = o.auto ? o.auto.plan : o.plan; return pl && pl.kind === 'grab' ? pl.target : null; };
    const cost = (k) => dist(k.x, k.y, e.x, e.y) + claimed(this.ents, e, k, planOf) * 450;
    const b = BASKETS.reduce((best, k) => (cost(k) < cost(best) ? k : best));
    return { kind: 'grab', target: b, x: b.x + (e.x < b.x ? -70 : 70) * rand(0.8, 1.4), y: b.y + rand(10, 80) };
  }

  // ------------------------------------------------------------- Molly Easy
  /** Easy: A does the action in reach; with nothing in reach, pressing A again (no
   * steering - easyAutoOk) walks them to the next thing and does it. Never otherwise. */
  easyThink(e, dt) {
    const au = e.auto;
    au.ix = 0; au.iy = 0;
    if (this.phase === 'finale' || this.done) { au.goA = false; return; }
    // only a repeated A (no steering) walks them: otherwise they stay put (steering or not)
    if (!au.goA) { au.plan = null; return; }
    // walked here on A: do the action as soon as it's in reach (give up after a while)
    if (au.goA && (au.goT -= dt) <= 0) au.goA = false;
    if (au.goA && e.cool <= 0 && this.actionFor(e)) { au.goA = false; this.action(e); return; }
    let tx, ty;
    if (this.phase === 'super') {
      const gc = this.golden;
      if (!gc || gc.arrived) return;
      // everyone lines up along the cushion (spread out), then taps A to heave
      const side = (e.i % 4) - 1.5;
      tx = gc.x + side * 70; ty = gc.y + 60;
    } else {
      au.t -= dt;
      const pl = au.plan;
      const bad = !pl
        || (pl.kind === 'grab' && e.held)
        || (pl.kind === 'place' && (e.held !== 'cushion' || pl.target.cushion || (pl.target.guest && pl.target.guest.state !== 'walk')))
        || (pl.kind === 'frog' && (!this.frogToy || e.held))
        || (pl.kind === 'hide' && (e.held !== 'frog' || pl.target.frog));
      if (bad || au.t <= 0) {
        au.t = 1.2;
        // a cushion in hand: prefer a chair a guest is walking to (others' picks spread us out)
        let next = null;
        if (!e.held && this.frogToy && !this.ents.some((o) => o !== e && o.auto && o.auto.plan && o.auto.plan.kind === 'frog')) next = { kind: 'frog', target: this.frogToy, x: this.frogToy.x, y: this.frogToy.y };
        else {
          next = this.aiPlan(e, true);
          // keep heading for the same chair unless it has gone
          if (!bad && pl && pl.kind === next?.kind && pl.kind === 'place') next = pl;
        }
        if (next && next.wander) next = null;
        if (next && next.kind === 'grab') {
          // spread out over the baskets: the nearest one nobody else is heading to
          const taken = new Set(this.ents.filter((o) => o !== e).map((o) => (o.auto ? o.auto.plan : o.plan)).filter((pl) => pl && pl.kind === 'grab').map((pl) => pl.target));
          const pool = BASKETS.filter((b) => !taken.has(b));
          const b = (pool.length ? pool : BASKETS).reduce((best, k) => (dist(k.x, k.y, e.x, e.y) < dist(best.x, best.y, e.x, e.y) ? k : best));
          const off = (e.i % 2 ? 1 : -1) * 75;
          next = { kind: 'grab', target: b, x: b.x + off, y: b.y + 45 };
        }
        au.plan = next;
      }
      if (!au.plan) return;
      tx = au.plan.x; ty = au.plan.y;
    }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 12) return;
    const k = clamp(d / 80, 0, 1);
    au.ix = (dx / d) * k; au.iy = (dy / d) * k;
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    const scores = this.ents.map((e) => e.score);
    // gentle: scores within a couple of pranks share a place
    const placements = this.n === 1 ? [1] : placementsFromScores(scores.map((s) => Math.floor(s / 4)));
    const top = Math.max(...scores);
    const wa = this.ents[Math.max(0, scores.indexOf(top))];
    this.api.finish({
      placements,
      stats: this.ents.map((e) => `${e.pffts} pfft${e.pffts === 1 ? '' : 's'}${e.frogs ? ` · ${e.frogs} frog` : ''}`),
      focus: { x: wa.x, y: wa.y - wa.a.height * 0.5 },
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    const t = this.t;
    drawGarden(g, t);
    if (this.moonK > 0) {
      g.save(); g.globalAlpha = this.moonK; g.fillStyle = 'rgba(40,30,90,0.25)'; g.fillRect(0, 0, W, 330); g.restore();
      drawMoon(g, MOON.x, MOON.y + (1 - this.moonK) * 120, 220, t);
    }
    this.drawTelegraphs(g);
    // y-sorted world
    const list = [];
    list.push({ y: THRONE.y, f: () => this.drawThroneAll(g) });
    for (const tb of this.tables) list.push({ y: tb.y, f: () => drawTable(g, tb.x, tb.y, t, tb.jump, tb.jelly, tb.frog) });
    for (const c of this.chairs) list.push({ y: c.y, f: () => this.drawChair(g, c) });
    for (const b of BASKETS) list.push({ y: b.y, f: () => drawBasket(g, b.x, b.y, t) });
    for (const gu of this.guests) if (gu.state === 'walk' || gu.state === 'leave') list.push({ y: gu.y, f: () => {
      drawGuest(g, gu.kind, gu.x, gu.y, GUEST_H, 'walk', { t, step: gu.step, facing: gu.facing, hat: gu.hat });
      if (gu.frozen) drawGuestFx(g, gu.kind, gu.x, gu.y, GUEST_H, 'walk', ['shock'], t + gu.x, gu.facing);
    } });
    const du = this.duchess;
    if (du && (du.state === 'walk' || du.state === 'wait')) list.push({ y: du.y, f: () => drawGuest(g, 'duchess', du.x, du.y, GUEST_H * 1.25, 'walk', { t, step: du.step, facing: du.facing, hat: du.hat, monocle: true }) });
    const b = this.butler;
    list.push({ y: b.y, f: () => drawButler(g, b.x, b.y, 210, t, b.facing, b.step, b.noticeK, b.scoldT > 0) });
    if (this.golden && !this.golden.arrived) { const gc = this.golden; list.push({ y: gc.y, f: () => { this.drawGroundShadow(g, gc.x, gc.y, 150); drawCushion(g, gc.x, gc.y - 70, 300, { golden: true, sq: gc.sq, t }); } }); }
    if (this.frogToy) { const fr = this.frogToy; list.push({ y: fr.y, f: () => { this.drawGroundShadow(g, fr.x, fr.y, 40); drawFrog(g, fr.x, fr.y - 40 - Math.abs(Math.sin(t * 5)) * 30, 90, t, Math.abs(Math.sin(t * 5))); } }); }
    for (const e of this.ents) list.push({ y: e.y, f: () => this.drawEnt(g, e) });
    list.sort((p, q) => p.y - q.y);
    for (const it of list) it.f();
    // (frogs spring up out of the sugar bowls in drawTable)
    for (const f of this.flyers) drawCushion(g, f.x, f.y, 90, { rot: f.k * 8 });
    for (const p of this.puffs) drawPuff(g, p.x, p.y, p.r, p.k, p.golden);
    for (const h of this.hats) {
      if (h.kind === 'monocle') { g.save(); g.translate(h.x, h.y); g.rotate(h.rot); g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.fillStyle = 'rgba(200,240,255,0.5)'; g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.fill(); g.stroke(); g.restore(); continue; }
      drawHat(g, h.kind, h.x, h.y, h.w, h.rot);
    }
    this.drawBubbles(g);
    this.drawHints(g);
  }

  drawGroundShadow(g, x, y, r) {
    g.save(); g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(x, y, r, r * 0.25, 0, 0, TAU); g.fill(); g.restore();
  }

  drawThroneAll(g) {
    const t = this.t, du = this.duchess;
    drawThrone(g, THRONE.x, THRONE.y, t);
    drawThroneFront(g, THRONE.x, THRONE.y);
    const gc = this.golden;
    const seatY = THRONE.y - THRONE_SEAT;
    if (gc && gc.arrived) {
      const k = ease.outBack(clamp(gc.onSeat, 0, 1));
      drawCushion(g, THRONE.x, lerp(THRONE.y - 40, seatY - 10, k) - Math.sin(clamp(gc.onSeat, 0, 1) * Math.PI) * 60, 190, { golden: true, flat: !!gc.flat, t, sq: gc.sq });
    }
    if (du && (du.state === 'gasp' || du.state === 'outrage' || du.state === 'soften')) {
      // she plonks down on the seat for a beat (sit), then jolts up with the PFFFT
      // (a small jolt: the art is tall, so a big one hides her gasp under the HUD)
      const sitting = du.state === 'gasp' && du.st < 0.12;
      const jump = du.state === 'gasp' ? Math.sin(clamp((du.st - 0.12) / 0.78, 0, 1) * Math.PI) * 40 : 0;
      const dh = GUEST_H * 1.25;
      if (du.state === 'outrage') {
        // prop/whoopee-duchess-scold (falls back to her gasp art) + steam, flushed
        // cheeks and a furiously wagging finger; she quivers with indignation
        const quiver = Math.sin(t * 38) * 3;
        drawGuest(g, 'duchess', THRONE.x + quiver, seatY, dh, 'scold', { t, hat: du.hat, monocle: du.monocle });
        drawGuestFx(g, 'duchess', THRONE.x + quiver, seatY, dh, 'scold', ['steam', 'scold', 'shock'], t, 1);
      } else if (du.state === 'soften') {
        // composure regained, nose in the air... hiding one tiny giggle
        drawGuest(g, 'duchess', THRONE.x, seatY, dh, 'huff', { t, hat: du.hat, monocle: du.monocle, tilt: -0.08 });
      } else drawGuest(g, 'duchess', THRONE.x, seatY - jump, dh, sitting ? 'sit' : 'shock', { t, hat: du.hat, monocle: du.monocle });
      if (du.state === 'gasp' && !sitting) drawGuestFx(g, 'duchess', THRONE.x, seatY - jump, dh, 'shock', ['shock'], t, 1);
    }
  }

  drawChair(g, c) {
    const t = this.t;
    drawChairBack(g, c.x, c.y, c.facing);
    drawChairFront(g, c.x, c.y, c.facing);
    const seatY = c.y - CHAIR_SEAT;
    if (c.cushion) drawCushion(g, c.x, seatY - 12, 100, { sq: c.sq * Math.sin(t * 30), col: '#ff7ac6' });
    else if (c.flat > 0) { g.save(); g.globalAlpha = clamp(c.flat * 2, 0, 1); drawCushion(g, c.x, seatY - 4, 100, { flat: true }); g.restore(); }
    const gu = c.guest;
    if (gu && gu.state !== 'walk' && gu.state !== 'leave' && !gu.free && gu.chair === c) {
      let jump = 0;
      if (gu.state === 'sitdown') jump = Math.sin(clamp(gu.st / 0.35, 0, 1) * Math.PI) * 40;
      if (gu.state === 'pfft') jump = Math.sin(clamp(gu.st / 0.75, 0, 1) * Math.PI) * 140;
      const R = gu.state === 'react' ? REACTS[gu.react] : null;
      const st = gu.state === 'sitdown' ? 'sit' : gu.state === 'pfft' ? 'shock' : R ? R.state : gu.state;
      const face = gu.face || c.facing;
      const gy = seatY - 6 - jump;
      drawGuest(g, gu.kind, c.x, gy, GUEST_H, st, { t: t + c.x, hat: gu.hat, facing: R ? face : c.facing, tilt: R && R.tilt ? -face * R.tilt : 0 });
      if (gu.state === 'pfft') drawGuestFx(g, gu.kind, c.x, gy, GUEST_H, st, ['shock'], t + c.x, face);
      else if (R) drawGuestFx(g, gu.kind, c.x, gy, GUEST_H, st, R.fx, t + c.x, face);
    }
  }

  /** Where each guest is heading: a glowing ring under the chair, pawprints and a little picture. */
  drawTelegraphs(g) {
    const t = this.t;
    for (const gu of this.guests) {
      if (gu.state !== 'walk') continue;
      const c = gu.chair, col = GUESTS[gu.kind].dress;
      const pulse = 0.6 + 0.4 * Math.sin(t * 8);
      g.save();
      g.globalAlpha = 0.35 + 0.35 * pulse; g.fillStyle = col;
      g.beginPath(); g.ellipse(c.x, c.y + 4, 92, 26, 0, 0, TAU); g.fill();
      g.globalAlpha = 1; g.strokeStyle = col; g.lineWidth = 6; g.setLineDash([16, 12]); g.lineDashOffset = -t * 40;
      g.beginPath(); g.ellipse(c.x, c.y + 4, 100 + pulse * 8, 30 + pulse * 3, 0, 0, TAU); g.stroke();
      g.setLineDash([]);
      // pawprints from the guest to the chair
      const tx = c.x, ty = c.y + 26, d = dist(gu.x, gu.y, tx, ty);
      const n = Math.floor(d / 70);
      for (let i = 1; i <= n; i++) {
        const u = i / (n + 1), px = lerp(gu.x, tx, u), py = lerp(gu.y, ty, u) + (i % 2 ? 8 : -8);
        g.globalAlpha = 0.5; g.fillStyle = col;
        g.beginPath(); g.ellipse(px, py, 10, 7, 0, 0, TAU); g.fill();
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(px + k * 8, py - 10, 4, 0, TAU); g.fill(); }
      }
      g.restore();
      // little "reserved for" picture of the guest above the chair
      const by = c.y - 260 + Math.sin(t * 4 + c.x) * 8;
      g.save();
      ui.panel(g, c.x - 44, by - 50, 88, 96, { r: 30, fill: '#fff', stroke: col, lineWidth: 5 });
      g.beginPath(); g.moveTo(c.x - 12, by + 44); g.lineTo(c.x, by + 62); g.lineTo(c.x + 12, by + 44); g.fillStyle = '#fff'; g.fill();
      g.beginPath(); g.rect(c.x - 40, by - 46, 80, 88); g.clip();
      drawGuest(g, gu.kind, c.x, by + 100, 150, 'walk', { t, step: 0, hat: true });
      g.restore();
    }
  }

  drawEnt(g, e) {
    const a = e.a;
    a.draw(g, { ring: e.p.color });
    if (e.held) {
      const bob = Math.sin(this.t * 10 + e.i) * 4, hy = e.y - a.height - 34 + bob;
      if (e.held === 'cushion') drawCushion(g, e.x + a.facing * 6, hy, 96, { rot: Math.sin(this.t * 6 + e.i) * 0.1 });
      else drawFrog(g, e.x + a.facing * 6, hy + 10, 80, this.t, 0.2);
    }
  }

  drawBubbles(g) {
    const t = this.t;
    const bubble = (x, y, str, col = '#fff') => {
      g.save(); g.font = `800 36px ${ui.FONT}`;
      const w = Math.max(110, g.measureText(str).width + 40);
      ui.panel(g, x - w / 2, y - 32, w, 64, { r: 30, fill: col, lineWidth: 5 });
      g.fillStyle = col; g.strokeStyle = NAVY; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x - 14, y + 28); g.lineTo(x, y + 52); g.lineTo(x + 14, y + 28); g.fill(); g.stroke();
      g.fillRect(x - 16, y + 22, 32, 8);
      ui.text(g, str, x, y + 2, { size: 36, color: NAVY, stroke: false });
      g.restore();
    };
    for (const gu of this.guests) if (gu.say && gu.state !== 'walk' && gu.state !== 'leave') bubble(gu.chair.x, gu.chair.y - CHAIR_SEAT - 250, gu.say);
    const du = this.duchess;
    if (du && du.say) bubble(THRONE.x + 250, THRONE.y - THRONE_SEAT - 170, du.say, '#fff3f8');
    const b = this.butler;
    if (b.notice) {
      const k = clamp(b.notice.t / 0.95, 0, 1);
      // a big "!" with a shrinking ring: get away before it closes!
      g.save(); g.translate(b.x, b.y - 270 - Math.abs(Math.sin(t * 12)) * 8);
      g.strokeStyle = '#ff4d6d'; g.lineWidth = 8; g.globalAlpha = 0.8;
      g.beginPath(); g.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k)); g.stroke();
      g.globalAlpha = 1;
      g.fillStyle = '#fff3a0'; g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 38, 0, TAU); g.fill(); g.stroke();
      ui.text(g, '!', 0, 4, { size: 60, color: '#ff4d6d' });
      g.restore();
      // a dotted gaze line to the spotted player
      const e = b.notice.ent;
      g.save(); g.strokeStyle = 'rgba(255,77,109,0.6)'; g.lineWidth = 5; g.setLineDash([10, 12]);
      g.beginPath(); g.moveTo(b.x + b.facing * 30, b.y - 170); g.lineTo(e.x, e.y - e.a.height * 0.6); g.stroke(); g.restore();
    }
    if (b.say) bubble(b.x, b.y - 270, b.say);
  }

  /** Little helpers for humans: a bouncing arrow at where to go, an A over what A would do. */
  drawHints(g) {
    if (this.phase === 'finale' || this.done) return;
    const t = this.t;
    for (const e of this.ents) {
      if (e.p.isAI) continue;
      const act = this.actionFor(e);
      if (act) {
        let x, y;
        if (act.kind === 'place') { x = act.target.x; y = act.target.y - CHAIR_SEAT - 70; }
        else if (act.kind === 'grab') { x = act.target.x; y = act.target.y - 190; }
        else if (act.kind === 'heave') { x = act.target.x; y = act.target.y - 200; }
        else if (act.kind === 'hide') { x = act.target.x - 80; y = act.target.y - 230; }
        else { x = act.target.x; y = act.target.y - 150; }
        if (e.auto) easyPrompt(g, e.p, { target: { x, y: y + 30 }, child: { x: e.x, y: e.y - e.a.height - (e.held ? 70 : 0) } });
        else ui.glyph(g, 'a', x, y + Math.sin(t * 8) * 5, 60, { pulse: true });
        if (act.kind === 'place') { g.save(); g.strokeStyle = e.p.color; g.lineWidth = 6; g.beginPath(); g.ellipse(act.target.x, act.target.y - CHAIR_SEAT, 70, 20, 0, 0, TAU); g.stroke(); g.restore(); }
        continue;
      }
      // where to go next
      let tx = null, ty = null;
      if (this.phase === 'super' && this.golden && !this.golden.arrived) { tx = this.golden.x; ty = this.golden.y - 210; }
      else if (this.phase === 'party' && !e.held) {
        const b = easyNearest(e.x, e.y, BASKETS);
        tx = b.x; ty = b.y - 190;
      } else if (this.phase === 'party' && e.held === 'cushion') {
        const coming = this.chairs.filter((c) => c.guest && c.guest.state === 'walk' && !c.cushion);
        if (coming.length) { const c = easyNearest(e.x, e.y, coming); tx = c.x; ty = c.y - CHAIR_SEAT - 70; }
      }
      if (tx === null) continue;
      g.save(); g.translate(tx, ty + Math.sin(t * 7 + e.i) * 10);
      g.fillStyle = e.p.color; g.strokeStyle = NAVY; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, 24); g.lineTo(-24, -6); g.lineTo(-10, -6); g.lineTo(-10, -30); g.lineTo(10, -30); g.lineTo(10, -6); g.lineTo(24, -6); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    // player tags
    for (const e of this.ents) {
      if (this.time < 4 || !e.p.isAI) ui.playerTag(g, e.p, e.x, e.y - e.a.height - (e.held ? 100 : 30));
    }
  }

  drawHUD(g) {
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 18, avoidCenter: true, format: (v) => String(v) });
    if (this.banner) {
      const k = this.banner.t;
      g.save(); g.globalAlpha = clamp((2 - k) / 0.4, 0, 1);
      ui.banner(g, this.banner.text, k, { y: 560, size: this.banner.size || 120, color: this.banner.color });
      g.restore();
    }
  }
}

