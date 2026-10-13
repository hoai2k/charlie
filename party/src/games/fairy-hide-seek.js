// Fairy Hide & Seek (Molly Party) - little fairies hide behind giant flowers,
// mushrooms, leaves, a teapot and more. Everyone runs around the garden with
// a big magnifying glass: through the lens the hiding spots turn see-through,
// so you can spot who's hiding. Press A to check a spot: fairies pop out
// giggling, twirl, zip around their finder and dash off to hide somewhere
// new (watch where they go!). Decoys are silly: a frog hops out going
// "ribbit!", a snail waves, a ladybug zooms off. Hiding spots with a fairy
// wiggle and sparkle. Every find counts; two friends checking the same spot
// together both get the fairy. "Fairy party!" halfway brings extra fairies.
//
// Art hooks (procedural fallbacks ship today, see fairy-hide-seek/art.js):
//   bg/fairy-hide-seek  prop/fhs-flower-pink  prop/fhs-flower-yellow  prop/fhs-mushroom
//   prop/fhs-leaf  prop/fhs-teapot  prop/fhs-can  prop/fhs-pot  prop/fhs-boot
//   prop/fhs-frog  prop/fhs-snail  prop/fhs-ladybug  prop/fhs-magnifier
// Poses: walk/run/idle (moveAnim), cheer, celebrate, surprised, giggle, think.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { clamp, lerp, rand, pick, chance, shuffle, TAU, dist, placementsFromScores } from '../engine/util.js';
import {
  NAVY, SPOTS, bgImage, drawSpot, drawFairy, FAIRY_COLS, drawFrog, drawSnail, drawLadybug, bubble, drawMagnifier, glow,
} from './fairy-hide-seek/art.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const DURATION = 60;
const PARTY_AT = 32;          // "Fairy party!": extra fairies + more wiggles
const SPEED = 600;
const MAG = 1.18;             // lens magnification
const LAYOUT = [
  [260, 440], [720, 430], [1200, 440], [1660, 435],
  [470, 660], [960, 650], [1450, 660],
  [230, 870], [700, 880], [1220, 870], [1690, 876],
];
const TYPES = ['flower-pink', 'mushroom', 'teapot', 'leaf', 'can', 'flower-yellow', 'boot', 'pot'];
const DECOYS = ['frog', 'snail', 'ladybug'];
const CPU_CAP = [0.55, 0.68, 0.8];
const MIN_Y = 330, MAX_Y = 975;

export const meta = {
  id: 'fairy-hide-seek',
  title: 'Fairy Hide & Seek',
  category: 'molly',
  type: 'Seek & find',
  goal: 'Find the fairies hiding in the garden!',
  controls: [['stick', 'Walk with your magnifying glass'], ['a', 'Peek! Check a hiding spot']],
  tips: ['Look through your glass to see who is hiding.', 'Wiggly, sparkly spots have a fairy!', 'Frogs and snails are just being silly.'],
  music: 'party',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  infoAt: 'tl',
  drawIcon(g, x, y, w, h, t = 0) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = h / 500;
    const img = bgImage();
    g.drawImage(img, 300, 160, 1300, 812, x, y, w, h);
    g.save(); g.translate(x + w * 0.38, y + h * 0.82); g.scale(s * 1.25, s * 1.25); drawSpot(g, 'mushroom', 230, 215, t); g.restore();
    g.save(); g.translate(x + w * 0.8, y + h * 0.86); g.scale(s, s); drawSpot(g, 'teapot', 240, 205, t); g.restore();
    drawFrog(g, x + w * 0.66, y + h * 0.86, s * 0.7, t);
    g.save(); g.translate(x + w * 0.12, y + h * 0.95); g.scale(s, s); drawSpot(g, 'flower-pink', 210, 300, t); g.restore();
    // the lens: a fairy revealed behind the mushroom
    const lx = x + w * 0.4 + Math.sin(t * 1.2) * 10, ly = y + h * 0.55, r = h * 0.2;
    g.save(); g.beginPath(); g.arc(lx, ly, r, 0, TAU); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(lx - r, ly - r, r * 2, r * 2);
    drawFairy(g, lx, ly, s * 2.2, FAIRY_COLS[0], t, 1, { happy: true });
    g.restore();
    drawMagnifier(g, lx, ly, r, '#ff4d6d', lx + r * 2, ly + r * 2, t);
    g.restore();
  },
};

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.timeLeft = DURATION;
    this.done = false;
    this.sc = n <= 4 ? 0.86 : 0.7;
    this.lensR = n <= 4 ? 86 : 76;
    const types = shuffle([...TYPES, ...shuffle(TYPES).slice(0, LAYOUT.length - TYPES.length)]);
    this.spots = LAYOUT.map(([x, y], i) => {
      const sz = SPOTS[types[i]];
      return { i, type: types[i], x, y, w: sz.w, h: sz.h, c: null, wig: 0, nextWig: rand(0.5, 3), bump: 0, bumpV: 0, busy: 0, foundT: 0, foundBy: new Set(), reserved: false, peekT: 0 };
    });
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? W / 2 : lerp(260, W - 260, i / (n - 1));
      const y = n <= 4 ? 790 : (i % 2 ? 560 : 790);
      const a = new Actor(p, { scale: this.sc, x, y });
      a.scale *= clamp(150 / a.leader.h, 1, 2.8);       // small avatars (garden fairies) drawn bigger
      a.snap();
      const e = { p, a, x, y, vx: 0, vy: 0, lx: x, ly: y - 200, score: 0, cd: 0, glint: 0, spot: null, brain: new Brain(p), tgt: null, aimT: 0 };
      this.lensTarget(e); e.lx = e.tlx; e.ly = e.tly;
      return e;
    });
    this.poppers = []; this.critters = [];
    this.party = false; this.partyT = 0;
    this.giggleCd = 0;
    this.nFairies = clamp(2 + Math.ceil(n * 0.6), 3, 6);
    // place fairies and decoys
    const order = shuffle(this.spots.slice());
    const cols = shuffle(FAIRY_COLS.slice());
    for (let k = 0; k < this.nFairies; k++) order[k].c = { kind: 'fairy', col: cols[k % cols.length], side: chance(0.5) ? 1 : -1 };
    DECOYS.forEach((d, k) => { order[this.nFairies + k].c = { kind: d, side: chance(0.5) ? 1 : -1 }; });
  }

  lensTarget(e) {
    const a = e.a;
    e.tlx = e.x + a.facing * 58 * this.sc;
    e.tly = e.y - a.height - this.lensR * 0.8;
  }

  /** The spot the lens is over (most centred), or null. */
  spotUnder(lx, ly) {
    const r = this.lensR;
    let best = null, bd = 1e9;
    for (const s of this.spots) {
      const cx = s.x, cy = s.y - s.h * 0.5;
      const dx = Math.abs(lx - cx), dy = Math.abs(ly - cy);
      if (dx < s.w * 0.5 + r * 0.3 && dy < s.h * 0.5 + r * 0.3) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = s; } }
    }
    return best;
  }

  emptySpot(exclude) {
    const free = this.spots.filter((s) => !s.c && !s.reserved && s.busy <= 0 && s !== exclude);
    if (!free.length) return null;
    // prefer spots nobody is looking at right now
    const unseen = free.filter((s) => !this.ents.some((e) => e.spot === s));
    return pick(unseen.length ? unseen : free);
  }

  // --- update -------------------------------------------------------------------
  preUpdate(dt) { this.t += dt; this.anim(dt, false); }
  postUpdate(dt) { this.t += dt; this.anim(dt, false); }

  update(dt) {
    this.t += dt;
    this.timeLeft = Math.max(0, DURATION - this.api.time);
    if (!this.party && this.api.time >= PARTY_AT) this.startParty();
    if (this.party) this.partyT += dt;
    for (const e of this.ents) {
      if (e.p.isAI) this.aiThink(e, dt);
      this.updateEnt(e, dt);
    }
    this.anim(dt, true);
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  anim(dt, live) {
    this.giggleCd -= dt;
    for (const s of this.spots) {
      // squash spring
      s.bumpV += (-s.bump * 260 - s.bumpV * 12) * dt; s.bump += s.bumpV * dt;
      s.busy = Math.max(0, s.busy - dt); s.foundT = Math.max(0, s.foundT - dt);
      if (s.foundT <= 0 && s.foundBy.size) s.foundBy.clear();
      s.wig = Math.max(0, s.wig - dt);
      s.nextWig -= dt;
      if (s.nextWig <= 0) {
        if (s.c && s.c.kind === 'fairy') {
          s.wig = 0.8; s.nextWig = this.party ? rand(0.6, 1.5) : rand(1.4, 3.2);
          particles.burst(s.x + rand(-30, 30), s.y - s.h, { type: 'sparkle', count: 5, colors: [s.c.col.glow, '#fff', '#ffd23f'], speed: [60, 180], life: [0.5, 0.9] });
          if (live && this.giggleCd <= 0) { this.giggleCd = 0.9; snd('fhs-giggle', 'giggle', { vol: 0.3 }); }
        } else if (s.c) { s.wig = 0.6; s.nextWig = rand(5, 9); }
        else s.nextWig = rand(1, 2);
      }
    }
    for (const e of this.ents) if (!live) { e.a.update(dt); }
    this.updatePoppers(dt);
    this.updateCritters(dt);
  }

  updateEnt(e, dt) {
    const a = e.a, ctrl = e.p.ctrl;
    e.cd = Math.max(0, e.cd - dt); e.glint = Math.max(0, e.glint - dt * 3);
    let ix = this.done ? 0 : ctrl.x, iy = this.done ? 0 : ctrl.y;
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    const k = 1 - Math.exp(-12 * dt);
    e.vx += (ix * SPEED - e.vx) * k; e.vy += (iy * SPEED * 0.85 - e.vy) * k;
    e.x = clamp(e.x + e.vx * dt, 70, W - 70); e.y = clamp(e.y + e.vy * dt, MIN_Y, MAX_Y);
    a.x = e.x; a.y = e.y;
    a.moveAnim(e.vx, e.vy, SPEED);
    a.update(dt);
    this.lensTarget(e);
    const lk = 1 - Math.exp(-14 * dt);
    e.lx += (e.tlx - e.lx) * lk; e.ly += (e.tly - e.ly) * lk;
    e.spot = this.spotUnder(e.lx, e.ly);
    if (!this.done && ctrl.pressed('a') && e.cd <= 0) this.check(e);
    // personal space
    for (const o of this.ents) {
      if (o === e) continue;
      const dx = e.x - o.x, dy = (e.y - o.y) * 1.6, d = Math.hypot(dx, dy), r = (a.radius + o.a.radius) * 0.7;
      if (d > 0.1 && d < r) { e.x += (dx / d) * (r - d) * 0.3; }
    }
  }

  // --- checking a spot ------------------------------------------------------------
  check(e) {
    e.cd = 0.3; e.glint = 1;
    const a = e.a, s = e.spot;
    a.playOnce('action', 0.3);
    if (!s) { sfx('whoosh', { vol: 0.3 }); return; }
    s.bumpV -= 3.2;
    // a friend just found the fairy here: share it!
    if (s.foundT > 0 && !s.foundBy.has(e)) { s.foundBy.add(e); this.award(e, s, true); return; }
    if (s.busy > 0 || !s.c) { this.emptyCheck(e, s); return; }
    if (s.c.kind === 'fairy') this.findFairy(e, s);
    else this.decoy(e, s);
  }

  emptyCheck(e, s) {
    snd('fhs-boing', 'boing', { vol: 0.6 });
    if (!hasSound('boing')) sfx('bounce', { vol: 0.5 });
    particles.burst(s.x, s.y - s.h * 0.8, { type: 'petal', count: 4, colors: ['#7fd36a', '#ff9fd8', '#fff'], speed: [80, 200] });
    e.a.emote('question', 0.7);
    s.busy = Math.max(s.busy, 0.25);
  }

  findFairy(e, s) {
    const c = s.c; s.c = null;
    s.foundT = 0.7; s.foundBy.clear(); s.foundBy.add(e);
    const sx = s.x, sy = s.y - s.h * 0.55;
    this.poppers.push({ col: c.col, x: sx, y: sy, x0: sx, y0: sy, t: 0, stage: 'pop', finder: e, rot: 0, s: 0.8, from: s });
    snd('fhs-pop', 'bigpop', { vol: 0.7 }); snd('fhs-fairy-giggle', 'giggle', { vol: 0.8 });
    fx.shake(6, 0.15); fx.hitstop(0.04);
    particles.burst(sx, sy, { type: 'star', count: 16, colors: [c.col.c, c.col.glow, '#fff', '#ffd23f'], speed: [160, 420] });
    particles.ring(sx, sy, c.col.glow, 170, 0.45);
    this.api.camera?.punch(sx, sy, 1.05, 0.25);
    this.award(e, s, false);
  }

  award(e, s, shared) {
    e.score++;
    const a = e.a;
    a.playOnce('cheer', 0.7); a.emote('heart', 1);
    if (chance(0.4)) a.say(shared ? 'Me too!' : pick(['Found you!', 'Yay!', 'Peekaboo!']), 1.1, 'yay');
    sfx('collect', { step: Math.min(12, e.score) });
    particles.popText(e.x, e.y - a.height - 40, shared ? '+1 too!' : '+1', e.p.color, 54);
    e.p.ctrl.rumble?.(0.4, 120);
  }

  decoy(e, s) {
    const c = s.c; s.c = null; s.busy = 2.2;
    const a = e.a;
    a.playOnce('surprised', 0.5);
    a.emote('happy', 1.2);
    const cr = { kind: c.kind, from: s, x: s.x, y: s.y, t: 0, side: c.side, dest: null };
    if (c.kind === 'frog') { snd('fhs-ribbit', 'boing', { vol: 0.8 }); cr.word = 'ribbit!'; }
    else if (c.kind === 'snail') { snd('fhs-snail', 'pop', { vol: 0.6 }); cr.word = 'hi!'; }
    else { snd('fhs-ladybug', 'whoosh', { vol: 0.6 }); cr.word = 'bzz!'; }
    if (c.kind !== 'snail') { cr.dest = this.emptySpot(s); if (cr.dest) cr.dest.reserved = true; }
    particles.burst(s.x, s.y - s.h * 0.6, { type: 'note', count: 3, colors: ['#7fd36a', '#ff9fd8', '#ffd23f'] });
    this.critters.push(cr);
  }

  startParty() {
    this.party = true; this.partyT = 0;
    snd('fhs-party', 'fanfare', { vol: 0.7 });
    fx.flash('#fff6c0', 0.2);
    for (let k = 0; k < 3; k++) {
      const dest = this.emptySpot(null);
      if (!dest) break;
      dest.reserved = true;
      this.poppers.push({ col: pick(FAIRY_COLS), x: rand(200, W - 200), y: -60, t: 0, stage: 'go', dest, rot: 0, s: 1, sx: rand(200, W - 200), sy: -60, finder: null, delay: k * 0.35 });
    }
    for (const s of this.spots) if (s.c && s.c.kind === 'fairy') s.nextWig = rand(0, 0.6);
    for (const e of this.ents) { e.a.playOnce('surprised', 0.5); e.a.emote('exclaim', 0.9); }
  }

  // --- fairies that were found ------------------------------------------------------
  updatePoppers(dt) {
    for (const f of this.poppers) {
      if (f.delay > 0) { f.delay -= dt; continue; }
      f.t += dt;
      if (f.stage === 'pop') {
        const u = Math.min(1, f.t / 0.4);
        f.x = f.x0; f.y = f.y0 - Math.sin(u * Math.PI * 0.5) * 140; f.s = 0.8 + u * 0.6;
        if (u >= 1) { f.stage = 'twirl'; f.t = 0; }
      } else if (f.stage === 'twirl') {
        const u = Math.min(1, f.t / 0.75);
        f.rot = u * TAU * 2;
        if (Math.random() < dt * 30) particles.burst(f.x + Math.cos(f.t * 14) * 50, f.y + Math.sin(f.t * 14) * 50, { type: 'sparkle', count: 1, colors: [f.col.glow, '#fff'], speed: [10, 60] });
        if (u >= 1) {
          f.rot = 0; f.t = 0;
          if (this.done) { f.stage = 'dance'; f.ax = f.x; f.ay = f.y; }
          else if (f.finder) { f.stage = 'visit'; f.sx = f.x; f.sy = f.y; }
          else this.sendHide(f);
        }
      } else if (f.stage === 'visit') {
        const e = f.finder, tx = e.x, ty = e.y - e.a.height - 70;
        const u = Math.min(1, f.t / 0.45);
        f.x = lerp(f.sx, tx, u * u); f.y = lerp(f.sy, ty, u * u) - Math.sin(u * Math.PI) * 60; f.s = 1.4 - u * 0.4;
        if (u >= 1) { f.stage = 'loop'; f.t = 0; }
      } else if (f.stage === 'loop') {
        const e = f.finder, cx = e.x, cy = e.y - e.a.height - 40;
        const ang = -Math.PI / 2 + f.t * 9;
        f.x = cx + Math.cos(ang) * 80; f.y = cy + Math.sin(ang) * 46;
        if (Math.random() < dt * 20) particles.burst(f.x, f.y, { type: 'heart', count: 1, colors: [f.col.c, '#fff'], speed: [10, 50], size: [10, 16] });
        if (f.t > 0.75) { if (this.done) { f.stage = 'dance'; f.ax = f.x; f.ay = f.y; } else this.sendHide(f); }
      } else if (f.stage === 'go') {
        const d = f.dest;
        if (!d) { f.y -= 900 * dt; if (f.y < -120) f.dead = true; continue; }
        const tx = d.x, ty = d.y - d.h * 0.5;
        f.dur = f.dur || clamp(dist(f.sx, f.sy, tx, ty) / 1100, 0.45, 1.3);
        const u = Math.min(1, f.t / f.dur);
        f.x = lerp(f.sx, tx, u); f.y = lerp(f.sy, ty, u) - Math.sin(u * Math.PI) * 140; f.s = 1 - u * 0.25;
        if (Math.random() < dt * 30) particles.burst(f.x, f.y, { type: 'sparkle', count: 1, colors: [f.col.glow, '#fff'], speed: [5, 30], life: [0.3, 0.6] });
        if (u >= 1) {
          f.dead = true; d.reserved = false;
          if (this.done) { this.poppers.push({ ...f, dead: false, stage: 'dance', ax: tx, ay: ty - 80, t: 0 }); continue; }
          d.c = { kind: 'fairy', col: f.col, side: chance(0.5) ? 1 : -1 };
          d.bumpV -= 2.5; d.nextWig = rand(1.2, 2.5);
          snd('fhs-hide', 'pop', { vol: 0.35 });
          particles.burst(tx, ty, { type: 'sparkle', count: 8, colors: [f.col.glow, '#fff'], speed: [60, 160] });
        }
      } else if (f.stage === 'dance') {
        f.x = f.ax + Math.sin(f.t * 3 + f.ay) * 50; f.y = f.ay + Math.sin(f.t * 6) * 20; f.rot = Math.sin(f.t * 4) * 0.4; f.s = 1.2;
      }
    }
    this.poppers = this.poppers.filter((f) => !f.dead);
  }

  sendHide(f) {
    f.stage = 'go'; f.t = 0; f.sx = f.x; f.sy = f.y; f.dur = 0;
    f.dest = this.emptySpot(f.from);
    if (f.dest) f.dest.reserved = true;
  }

  updateCritters(dt) {
    for (const c of this.critters) {
      c.t += dt;
      const s = c.from, ox = s.x + c.side * (s.w * 0.5 + 40);
      if (c.kind === 'frog') {
        if (c.t < 0.45) { const u = c.t / 0.45; c.x = lerp(s.x, ox, u); c.y = s.y - Math.sin(u * Math.PI) * 110; c.squash = 0; }
        else if (c.t < 1.5) { c.x = ox; c.y = s.y; c.squash = Math.max(0, 0.2 - (c.t - 0.45)) * -1; c.mouth = Math.abs(Math.sin(c.t * 8)); }
        else if (c.dest) {
          const u = Math.min(1, (c.t - 1.5) / 0.8), d = c.dest;
          c.x = lerp(ox, d.x, u); c.y = lerp(s.y, d.y, u) - Math.sin(u * Math.PI) * 260; c.mouth = 0;
          if (u >= 1) this.hideCritter(c, d);
        } else this.hideCritter(c, s);
      } else if (c.kind === 'snail') {
        const u = c.t < 0.6 ? c.t / 0.6 : c.t < 2.0 ? 1 : Math.max(0, 1 - (c.t - 2.0) / 0.6);
        c.x = lerp(s.x, ox, u); c.y = s.y;
        if (c.t > 2.6) this.hideCritter(c, s);
      } else {
        const d = c.dest || s;
        const u = Math.min(1, c.t / 1.8);
        const lx = lerp(s.x, d.x, u), ly = lerp(s.y - s.h * 0.5, d.y - d.h * 0.5, u);
        c.x = lx + Math.sin(u * TAU) * 120 * c.side; c.y = ly - Math.sin(u * Math.PI) * 220 + Math.cos(u * TAU) * 60 - 60;
        c.rot = Math.sin(c.t * 10) * 0.4;
        if (u >= 1) this.hideCritter(c, d);
      }
    }
    this.critters = this.critters.filter((c) => !c.dead);
  }

  hideCritter(c, d) {
    c.dead = true; d.reserved = false;
    if (!d.c) { d.c = { kind: c.kind, side: chance(0.5) ? 1 : -1 }; d.bumpV -= 2; d.nextWig = rand(3, 6); }
  }

  // --- end -------------------------------------------------------------------------
  finish() {
    this.done = true;
    const scores = this.ents.map((e) => e.score);
    const placements = placementsFromScores(scores);
    const top = Math.max(...scores);
    this.ents.forEach((e, i) => { e.vx = e.vy = 0; e.a.clearEmotes?.(); e.a.setPose(scores[i] === top ? 'celebrate' : 'cheer'); });
    // every hidden fairy pops out for a twirl party
    for (const s of this.spots) {
      if (s.c && s.c.kind === 'fairy') {
        const sx = s.x, sy = s.y - s.h * 0.55;
        this.poppers.push({ col: s.c.col, x: sx, y: sy, x0: sx, y0: sy, t: 0, stage: 'pop', finder: null, rot: 0, s: 0.8, from: s });
        s.c = null;
      }
    }
    for (const f of this.poppers) if (f.stage === 'go' || f.stage === 'loop' || f.stage === 'visit') { f.stage = 'dance'; f.ax = f.x; f.ay = clamp(f.y, 200, 700); f.t = 0; }
    particles.confettiRain(W, 90);
    snd('fhs-finale', 'cheer', { vol: 0.7 });
    const wi = scores.indexOf(top), w = this.ents[wi];
    this.api.finish({ placements, stats: scores.map((s) => `${s} ${s === 1 ? 'fairy' : 'fairies'}`), solo: scores[0], focus: { x: w.x, y: w.y - w.a.height * 0.6 } });
  }

  // --- CPU -------------------------------------------------------------------------
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 0, 0, 2), cap = CPU_CAP[lvl];
    if (this.done) { p.ctrl.move(0, 0); return; }
    if (e.brain.ready(dt) && (!e.tgt || e.tgtDone)) {
      e.tgtDone = false;
      // spots that wiggled lately (everyone can see that)
      const wiggly = this.spots.filter((s) => s.wig > 0 && s.c && s.c.kind === 'fairy');
      const follow = [0.4, 0.6, 0.78][lvl];
      if (wiggly.length && chance(follow)) e.tgt = wiggly.reduce((b, s) => (dist(e.lx, e.ly, s.x, s.y - s.h / 2) < dist(e.lx, e.ly, b.x, b.y - b.h / 2) ? s : b));
      else e.tgt = pick(this.spots.filter((s) => s !== e.last));
      e.aimT = 0; e.giveUp = rand(2.5, 4.5);
      e.brain.wait(reactionTime(p) * 0.6);
    }
    const s = e.tgt;
    if (!s) { p.ctrl.move(0, 0); return; }
    e.giveUp -= dt;
    // move so the lens sits on the spot's middle
    const tx = s.x, ty = s.y - s.h * 0.5;
    const dx = tx - e.lx, dy = ty - e.ly, d = Math.hypot(dx, dy);
    if (e.spot === s && d < 50) {
      p.ctrl.move(0, 0);
      e.aimT += dt;
      if (e.aimT > reactionTime(p) * 0.8 + [0.35, 0.15, 0.05][lvl]) {
        const sees = s.c && s.c.kind === 'fairy' && s.busy <= 0;
        const shared = s.foundT > 0;
        const silly = s.c && s.c.kind !== 'fairy';
        const want = sees || shared || (silly && chance([0.5, 0.3, 0.1][lvl])) || (!s.c && chance([0.5, 0.25, 0.1][lvl]));
        if (want && e.cd <= 0) p.ctrl.press('a');
        e.last = s; e.tgt = null; e.tgtDone = true;
        e.brain.wait(rand(0.15, 0.5) + (chance(prof.mistake) ? 0.8 : 0));
      }
      return;
    }
    if (e.giveUp <= 0) { e.tgt = null; e.tgtDone = true; return; }
    const ang = Math.atan2(dy, dx) + Math.sin(this.t * 2 + p.index * 1.3) * prof.aimError * 0.6;
    const k = clamp(d / 80, 0.25, 1) * cap;
    p.ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
  }

  // --- draw ------------------------------------------------------------------------
  draw(g) {
    const t = this.t;
    g.drawImage(bgImage(), 0, 0, W, H);
    // y-sorted spots and characters
    const list = [];
    for (const s of this.spots) list.push({ y: s.y, s });
    for (const e of this.ents) list.push({ y: e.y + 4, e });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.s) this.drawSpotWithContent(g, it.s, t);
      else { const e = it.e; e.a.draw(g, { ring: e.p.color }); }
    }
    for (const c of this.critters) this.drawCritter(g, c, t);
    for (const f of this.poppers) {
      if (f.delay > 0) continue;
      drawFairy(g, f.x, f.y, f.s * 1.3, f.col, t * 1.5, f.x < W / 2 ? 1 : -1, { rot: f.rot, pose: f.stage === 'twirl' || f.stage === 'dance' ? 'celebrate' : 'idle', happy: true });
    }
    // lenses on top
    for (const e of this.ents) this.drawLens(g, e, t);
    for (const e of this.ents) {
      if (e.p.isAI && this.api.time > 5) continue;
      ui.playerTag(g, e.p, e.lx, e.ly - this.lensR - 24);
    }
  }

  drawSpotWithContent(g, s, t) {
    const wig = s.wig > 0 ? Math.sin(s.wig * 24) * 0.09 * Math.min(1, s.wig * 3) : 0;
    // a peeking fairy behind the spot while it wiggles
    if (s.c && s.c.kind === 'fairy' && s.wig > 0) {
      const out = Math.sin(Math.min(1, (0.8 - s.wig) / 0.25) * Math.PI * 0.5) * Math.min(1, s.wig * 4);
      drawFairy(g, s.x + s.c.side * (s.w * 0.36 + 34 * out), s.y - s.h * 0.62, 1.1, s.c.col, t, -s.c.side, { glowAlpha: 0.9 });
    } else if (s.c && s.c.kind === 'fairy') {
      glow(g, s.x, s.y - s.h * 0.55, s.w * 0.55, s.c.col.glow, 0.25 + 0.12 * Math.sin(t * 3 + s.i));
    } else if (s.c && s.c.kind === 'frog' && s.wig > 0) {
      drawFrog(g, s.x + s.c.side * s.w * 0.15, s.y - s.h + 70, 0.7, t);
    }
    // see-through when a player walks behind it, so nobody gets lost
    const behind = this.ents.some((e) => e.y < s.y && e.y > s.y - s.h * 0.9 && Math.abs(e.x - s.x) < s.w * 0.55);
    g.save(); g.translate(s.x, s.y); g.rotate(wig);
    if (behind) g.globalAlpha = 0.6;
    const sq = clamp(s.bump, -0.3, 0.3);
    g.scale(1 - sq * 0.6, 1 + sq);
    drawSpot(g, s.type, s.w, s.h, t);
    g.restore();
  }

  drawContent(g, s, t) {
    const c = s.c; if (!c) return;
    const x = s.x + c.side * s.w * 0.12, y = s.y - s.h * 0.5;
    if (c.kind === 'fairy') drawFairy(g, x, y, 1.35, c.col, t, -c.side, { happy: true, glowAlpha: 1 });
    else if (c.kind === 'frog') drawFrog(g, x, s.y - 6, 0.85, t);
    else if (c.kind === 'snail') drawSnail(g, x, s.y - 6, 0.85, t, { dir: c.side });
    else drawLadybug(g, x, y + 20, 0.9, t);
  }

  drawCritter(g, c, t) {
    if (c.kind === 'frog') {
      drawFrog(g, c.x, c.y, 0.85, t, { squash: c.squash || 0, mouth: c.mouth || 0, dir: c.side });
      if (c.t > 0.3 && c.t < 1.6) bubble(g, c.word, c.x, c.y - 150, Math.min(1, (c.t - 0.3) * 6));
    } else if (c.kind === 'snail') {
      drawSnail(g, c.x, c.y, 0.95, t, { dir: c.side, wave: c.t > 0.6 && c.t < 2 });
      if (c.t > 0.5 && c.t < 2.2) bubble(g, c.word, c.x, c.y - 140, Math.min(1, (c.t - 0.5) * 6));
    } else {
      drawLadybug(g, c.x, c.y, 1.1, t, { fly: true, rot: c.rot || 0 });
      if (c.t < 1) bubble(g, c.word, c.x, c.y - 80, Math.min(1, c.t * 6) * 0.8);
    }
  }

  drawLens(g, e, t) {
    const r = this.lensR, lx = e.lx, ly = e.ly, a = e.a;
    const seen = this.spots.filter((s) => Math.abs(s.x - lx) < s.w * 0.5 + r * 1.3 && Math.abs(s.y - s.h * 0.5 - ly) < s.h * 0.5 + r * 1.3);
    const fairyHere = e.spot && e.spot.c && e.spot.c.kind === 'fairy';
    g.save();
    g.beginPath(); g.arc(lx, ly, r, 0, TAU); g.clip();
    g.translate(lx, ly); g.scale(MAG, MAG); g.translate(-lx, -ly);
    { // only the patch of background under the lens
      const img = bgImage(), kx = img.width / W, ky = img.height / H, rr = r / MAG + 4;
      const x0 = clamp(lx - rr, 0, W - 1), y0 = clamp(ly - rr, 0, H - 1), x1 = clamp(lx + rr, 1, W), y1 = clamp(ly + rr, 1, H);
      g.drawImage(img, x0 * kx, y0 * ky, (x1 - x0) * kx, (y1 - y0) * ky, x0, y0, x1 - x0, y1 - y0);
    }
    for (const s of seen) this.drawContent(g, s, t);
    for (const s of seen) {
      g.save(); g.globalAlpha = 0.28; g.translate(s.x, s.y); drawSpot(g, s.type, s.w, s.h, t); g.restore();
    }
    g.restore();
    g.save(); g.beginPath(); g.arc(lx, ly, r, 0, TAU);
    g.fillStyle = 'rgba(220,245,255,0.12)'; g.fill(); g.restore();
    if (fairyHere) glow(g, lx, ly, r * 1.5, '#fff6b0', 0.35 + 0.2 * Math.sin(t * 10));
    const hand = { x: e.x + a.facing * 10, y: e.y - a.height * 0.55 };
    drawMagnifier(g, lx, ly, r, e.p.color, hand.x, hand.y, t, e.glint);
    if (fairyHere && Math.random() < 0.25) particles.burst(lx + rand(-r, r), ly + rand(-r, r) * 0.6, { type: 'sparkle', count: 1, colors: ['#fff', '#ffd23f'], speed: [10, 40], life: [0.3, 0.6] });
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 990, format: (v) => String(v) });
    const time = this.api.time;
    if (time < 4 && !this.done) {
      const al = clamp(Math.min(time / 0.3, (4 - time) / 0.5), 0, 1);
      g.save(); g.globalAlpha = al;
      for (const e of this.ents) {
        if (e.p.isAI) continue;
        ui.glyph(g, 'a', e.lx + this.lensR + 30, e.ly - 30, 50, { pulse: true });
        ui.glyph(g, 'stick', e.x - 90, e.y - 40, 50);
      }
      g.restore();
    }
    if (this.party && this.partyT < 2.2) {
      g.save(); g.globalAlpha = clamp(2.2 - this.partyT, 0, 1);
      ui.banner(g, 'Fairy party!', this.partyT, { y: 470, size: 140, color: '#ff7ac6' });
      g.restore();
    }
  }
}
