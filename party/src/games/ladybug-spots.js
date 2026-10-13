// Ladybug Spots (Molly Party) - a lively counting game in a sunny meadow.
// A ladybug (or a bee, or a butterfly) zooms in and lands on the giant daisy;
// empty dashed circles on her back show how many spots she wants (1-5) and a
// wish bubble shows them again as dots. Everybody dashes around catching the
// bouncy dots and runs them over to her (just touch her). Each spot plinks in
// with a counting chime; when she is full she counts them all and zooms off
// happy. Wrong colour or one too many? "Ah... ah... CHOO!" - she sneezes it off.
// Bees want fluffy yellow pollen, butterflies want dots of their wing colour,
// and every 5th visitor is a Rainbow Butterfly: any dot fits, double points.
// A = dash (a quick zoom - great for catching dots).
//
// Art hooks (procedural fallbacks ship today): bg/ladybug-spots thumb/ladybug-spots
//   prop/ladybug-pad prop/ladybug prop/bee prop/butterfly prop/ladybug-dot prop/pollen-puff
//   prop/wing-dot-<pink|blue|purple|orange>
// Sound hooks (fallbacks today): lb-catch lb-spot lb-sneeze lb-achoo lb-buzz lb-yay lb-dash
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { drawSparkleShape } from '../engine/emotes.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, TAU, placementsFromScores, later, dist } from '../engine/util.js';

const NAVY = '#24163f';
const DURATION = 60;
const PAD = { x: 960, y: 600 };
const SEAT = { x: 960, y: 560 };
const BOUNDS = { x0: 70, x1: W - 70, y0: 250, y1: 1015 };
const SPEED = 540;
const DASH_V = 1250, DASH_T = 0.2, DASH_CD = 0.55;
const BODY_RX = 215, BODY_RY = 140;   // players are nudged out of her body (ellipse)
const GIVE_K = 1.3;                  // touching distance (in body radii) to hand a spot over
const DOT_R = 30;

const KINDS = {
  black: { c: '#2b2440', hi: '#6c6290', art: 'prop/ladybug-dot' },
  pollen: { c: '#ffd23f', hi: '#fff6b0', art: 'prop/pollen-puff' },
  pink: { c: '#ff6fb1', hi: '#ffc2df', art: 'prop/wing-dot-pink' },
  blue: { c: '#3fa7ff', hi: '#b8e2ff', art: 'prop/wing-dot-blue' },
  purple: { c: '#a06bff', hi: '#dccbff', art: 'prop/wing-dot-purple' },
  orange: { c: '#ff9a3c', hi: '#ffd2a6', art: 'prop/wing-dot-orange' },
};
const WING_COLS = ['pink', 'blue', 'purple', 'orange'];
// spot layouts in the shell ellipse (normalised)
const LAYOUT = {
  1: [[0, 0]],
  2: [[-0.42, 0], [0.42, 0]],
  3: [[-0.48, -0.32], [0.48, -0.32], [0, 0.42]],
  4: [[-0.44, -0.38], [0.44, -0.38], [-0.44, 0.42], [0.44, 0.42]],
  5: [[-0.55, -0.42], [0.55, -0.42], [-0.55, 0.45], [0.55, 0.45], [0, 0]],
};
const WING_LAYOUT = { 1: [[0, 0]], 2: [[0, -0.42], [0, 0.42]], 3: [[0, -0.5], [-0.42, 0.32], [0.42, 0.32]] };

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const CHIME = [72, 76, 79, 84, 88, 91];

export const meta = {
  id: 'ladybug-spots',
  title: 'Ladybug Spots',
  category: 'molly',
  type: 'Count together',
  goal: 'Catch bouncy dots and give the ladybug just the right number of spots!',
  controls: [['stick', 'Run around'], ['a', 'Zoom dash']],
  tips: [
    'Run into a dot to catch it, then run to the ladybug to give it to her.',
    'Empty circles on her back show how many she wants. Count them!',
    'Bees want yellow fluff. Butterflies want their own colour. Too many? ACHOO!',
  ],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    const img = art('thumb/ladybug-spots');
    if (img) { g.drawImage(img, x, y, w, h); return; }
    t = t || 0;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = w / 400, hh = h / s;
    g.translate(x, y); g.scale(s, s);
    drawMeadow(g, 400, hh, t, 0.4);
    g.save(); g.translate(200, hh * 0.58); g.scale(0.55, 0.55);
    drawDaisy(g, 0, 50, 1);
    const fake = { kind: 'ladybug', want: 'black', n: 5, filled: 3, facing: 1, flap: 0, face: 'happy', t };
    drawCritter(g, fake, t);
    LAYOUT[5].forEach(([u, v], i) => {
      g.save(); g.translate(-16 + u * 96, v * 74); g.scale(0.8, 0.8);
      if (i < 3) drawDot(g, 'black', t + i, true);
      else { g.setLineDash([8, 7]); g.lineWidth = 5; g.strokeStyle = NAVY; g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); g.stroke(); }
      g.restore();
    });
    g.restore();
    for (let i = 0; i < 5; i++) {
      const dx = 50 + i * 75 + Math.sin(t * 2 + i) * 8, dy = hh * 0.22 + Math.abs(Math.sin(t * 4 + i * 1.3)) * -18 + (i % 2) * 30;
      g.save(); g.translate(dx, dy); g.scale(0.55, 0.55); drawDot(g, ['black', 'pollen', 'pink', 'black', 'blue'][i], t + i); g.restore();
    }
    g.restore();
  },
};

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0; this.time = 0;
    this.dots = []; this.flying = [];
    this.serial = 0;
    this.visits = 0; this.helped = [];
    this.critter = null;
    this.done = false;
    this.spawnT = 0.3;
    this.humans = this.players.some((p) => !p.isAI);
    const n = this.n;
    this.scale = n <= 2 ? 1 : n <= 4 ? 0.92 : n <= 6 ? 0.84 : 0.78;
    this.ents = this.players.map((p, i) => {
      const ang = Math.PI * 0.5 + (i - (n - 1) / 2) * (n > 1 ? 2.4 / Math.max(1, n - 1) : 0) * 0.9;
      const x = clamp(PAD.x + Math.cos(ang - Math.PI) * 0 + (i - (n - 1) / 2) * Math.min(220, 1500 / n), BOUNDS.x0 + 40, BOUNDS.x1 - 40);
      const y = 900 + (i % 2) * 50;
      const a = new Actor(p, { scale: this.scale, x, y });
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      return {
        p, i, a, x, y, vx: 0, vy: 0, carry: null, dashT: 0, dashCd: 0, dx: 0, dy: 1, score: 0, spots: 0,
        brain: new Brain(p), target: null, giveCd: 0, vol: p.isAI && this.humans ? 0.5 : 0.9, sayCd: 0,
      };
    });
    for (let i = 0; i < 6; i++) this.spawnDot();
    this.petals = Array.from({ length: 16 }, () => ({ x: rand(W), y: rand(H), p: rand(TAU), s: rand(0.6, 1.1) }));
    this.nextCritter(true);
  }

  // ---------------------------------------------------------------- critters
  nextCritter(first = false) {
    this.visits++;
    const v = this.visits;
    let kind, want;
    if (v % 5 === 0) { kind = 'rainbow'; want = 'any'; }
    else {
      const cyc = ['ladybug', 'ladybug', 'bee', 'butterfly'][(v - 1) % 4];
      kind = cyc; want = kind === 'ladybug' ? 'black' : kind === 'bee' ? 'pollen' : pick(WING_COLS);
    }
    const base = this.n >= 5 ? 3 : 2;
    const nWant = kind === 'rainbow' ? 5 : clamp(base + Math.floor((v - 1) / 2) + randInt(-1, 1), 1, 5);
    const fromLeft = chance(0.5);
    this.critter = {
      kind, want, n: nWant, filled: 0, slots: [], state: 'in', st: 0, t: 0,
      x: fromLeft ? -260 : W + 260, y: rand(300, 520), sx: 0, sy: 0, facing: fromLeft ? 1 : -1,
      flap: 1, sq: 0, sqv: 0, face: 'happy', sneezeQ: [], sneezeT: 0, countI: 0, countT: 0, helpers: new Set(), hop: 0,
    };
    const c = this.critter;
    c.sx = c.x; c.sy = c.y;
    snd('lb-buzz', 'wing-twinkle', { vol: 0.6 });
    if (!first) this.burstDots(c.want === 'any' ? null : c.want, Math.min(2 + Math.floor(this.n / 2), 5));
  }

  wantMatches(c, kind) { return c.want === 'any' || c.want === kind; }

  slotPos(c, i) {
    // world position of slot i (critter local -> world)
    const s = this.critterScale();
    const generated = c.kind !== 'rainbow' && art(c.kind === 'butterfly' ? 'prop/butterfly' : c.kind === 'bee' ? 'prop/bee' : 'prop/ladybug');
    if (generated) {
      const sq = clamp(c.sq, -0.6, 0.8) * 0.25;
      let x, y;
      if (c.kind === 'butterfly') {
        const left = Math.ceil(c.n / 2), onLeft = i < left;
        const [u, v] = WING_LAYOUT[onLeft ? left : c.n - left][onLeft ? i : i - left];
        // Authored 640x448 plain upper-wing centres (140,140)/(500,140).
        const flap = c.flap > 0 ? 0.55 + Math.sin(this.t * 22) * 0.45 : 0.92 + Math.sin(this.t * 3) * 0.08;
        x = ((onLeft ? 140 : 500) - 320 + u * 70) * 360 / 640 * flap;
        y = (140 - 224 + v * 70) * 252 / 448 - 20;
      } else {
        const [u, v] = LAYOUT[c.n][i];
        // Measured clear surfaces exclude the authored heads, legs and bee stripes.
        const bee = c.kind === 'bee';
        x = ((bee ? 225 : 170) - 256 + u * (bee ? 70 : 130)) * 300 / 512 * c.facing;
        y = ((bee ? 177 : 213) - 224 + v * (bee ? 60 : 85)) * 262 / 448;
      }
      return { x: c.x + x * (1 + sq) * s, y: c.y + y * (1 - sq) * s - c.hop };
    }
    if (c.kind === 'butterfly' || c.kind === 'rainbow') {
      const left = Math.ceil(c.n / 2);
      const onLeft = i < left;
      const k = onLeft ? i : i - left, m = onLeft ? left : c.n - left;
      const [u, v] = WING_LAYOUT[m][k];
      const cx = onLeft ? -95 : 95, cy = -52;
      return { x: c.x + (cx + u * 56) * s, y: c.y + (cy + v * 56) * s - c.hop };
    }
    const [u, v] = LAYOUT[c.n][i];
    return { x: c.x + (-16 + u * 96) * c.facing * s, y: c.y + (v * 74) * s - c.hop };
  }

  critterScale() { return 1; }

  updateCritter(dt) {
    const c = this.critter; if (!c) return;
    c.t += dt; c.st += dt;
    c.sqv += (-c.sq * 260 - c.sqv * 11) * dt; c.sq += c.sqv * dt;
    c.sneezeT = Math.max(0, c.sneezeT - dt);
    if (c.state === 'in') {
      const k = clamp(c.st / 1.1, 0, 1), e = 1 - Math.pow(1 - k, 3);
      const mx = lerp(c.sx, SEAT.x, 0.5), my = Math.min(c.sy, SEAT.y) - 260;
      c.x = (1 - e) * (1 - e) * c.sx + 2 * (1 - e) * e * mx + e * e * SEAT.x;
      c.y = (1 - e) * (1 - e) * c.sy + 2 * (1 - e) * e * my + e * e * SEAT.y;
      c.flap = 1; c.hop = Math.sin(k * Math.PI * 3) * 20 * (1 - k);
      if (k >= 1) {
        c.state = 'wait'; c.st = 0; c.flap = 0; c.sq = 0.6; c.sqv = 0;
        sfx('land'); particles.burst(c.x, c.y + 40, { type: 'petal', count: 10, colors: ['#ffffff', '#ffd1ec', '#fff3a0'] });
        snd('lb-hello', 'giggle', { vol: 0.6 });
      }
    } else if (c.state === 'wait') {
      c.hop = Math.max(0, Math.sin(c.t * 5)) * 6;
      if (c.sneezeQ.length && c.sneezeT <= 0) this.sneeze(c);
    } else if (c.state === 'count') {
      if (c.sneezeQ.length && c.sneezeT <= 0) this.sneeze(c);
      c.countT -= dt;
      if (c.countT <= 0 && c.countI < c.n) {
        const p = this.slotPos(c, c.countI);
        c.slots[c.countI].pulse = 1;
        sfx('note', { midi: CHIME[c.countI] + 0, dur: 0.35, vol: 0.32 });
        particles.popText(p.x, p.y - 50, String(c.countI + 1), '#ffffff', 64);
        particles.ring(p.x, p.y, '#ffffff', 70, 0.35);
        c.sq = 0.25; c.sqv = 0;
        c.countI++; c.countT = 0.24;
        if (c.countI === c.n) { c.countT = 0.35; }
      } else if (c.countT <= 0 && c.countI >= c.n) this.critterHappy(c);
    } else if (c.state === 'out') {
      const k = clamp(c.st / 1.0, 0, 1);
      c.flap = 1;
      c.x = c.ox + Math.sin(k * TAU) * 140 * c.facing + k * k * 900 * c.facing;
      c.y = c.oy - Math.sin(k * TAU) * 120 - k * k * 700;
      if (chance(dt * 30)) particles.burst(c.x, c.y, { type: 'heart', count: 1, colors: ['#ff6fb1', '#ff4d6d', '#ffd1ec'] });
      if (k >= 1) { this.critter = null; this.nextT = 0.35; }
    }
    for (const s of c.slots) { s.pop = Math.max(0, s.pop - dt * 3); s.pulse = Math.max(0, (s.pulse || 0) - dt * 2.4); }
  }

  give(e) {
    const c = this.critter;
    const d = e.carry; e.carry = null; e.giveCd = 0.6;
    const ok = this.wantMatches(c, d.kind);
    const room = c.filled + this.flying.filter((f) => !f.sneeze).length < c.n;
    const f = { kind: d.kind, x: e.x, y: e.a.y - e.a.height * 1.05, t: 0, dur: 0.32, by: e, sneeze: !(ok && room) };
    if (!f.sneeze) f.slot = c.filled + this.flying.filter((q) => !q.sneeze).length;
    this.flying.push(f);
    e.a.playOnce('toss', 0.35);
    sfx('whoosh', { vol: 0.35 * e.vol });
  }

  landFlying(f) {
    const c = this.critter;
    if (!c || (c.state !== 'wait' && c.state !== 'count')) { this.dropDot(f.kind, f.x, f.y); return; }
    const e = f.by;
    if (f.sneeze || c.filled >= c.n || !this.wantMatches(c, f.kind)) {
      c.sneezeQ.push({ kind: f.kind, by: e });
      if (c.sneezeQ.length === 1) { c.sneezeT = 0.65; c.face = 'ahh'; snd('lb-sneeze', 'hic', { vol: 0.7 }); }
      return;
    }
    const i = c.filled++;
    c.slots[i] = { kind: f.kind, pop: 1, by: e };
    c.helpers.add(e);
    const pts = c.kind === 'rainbow' ? 2 : 1;
    e.score += pts; e.spots++;
    const p = this.slotPos(c, i);
    c.sq = 0.35; c.sqv = 0; c.face = 'ooh';
    snd('lb-spot', 'count-chime', { vol: 0.8 * e.vol });
    sfx('note', { midi: CHIME[i], dur: 0.3, vol: 0.25 });
    particles.burst(p.x, p.y, { type: 'sparkle', count: 7, colors: [KINDS[f.kind].c, '#ffffff', e.p.color], speed: [80, 260] });
    particles.popText(e.x, e.a.y - e.a.height - 40, '+' + pts, e.p.color, 50);
    e.a.playOnce('cheer', 0.5);
    if (!e.p.isAI) e.p.ctrl.rumble(0.3, 70);
    if (c.filled === c.n) this.startCount(c);
  }

  startCount(c) {
    c.state = 'count'; c.st = 0; c.countI = 0; c.countT = 0.25; c.face = 'happy';
    this.msgT = 0;
  }

  sneeze(c) {
    const q = c.sneezeQ.shift();
    c.face = 'choo'; c.sq = -0.5; c.sqv = 0;
    snd('lb-achoo', 'boing', { vol: 0.9 });
    sfx('giggle', { vol: 0.5 });
    fx.shake(7, 0.2);
    const nx = c.x + 150 * c.facing, ny = c.y - 10;
    particles.burst(nx, ny, { type: 'bubble', count: 8, colors: ['#ffffff', '#cdeeff'], speed: [150, 380], angle: c.facing > 0 ? 0 : Math.PI, spread: 0.8 });
    particles.popText(nx, ny - 80, 'ACHOO!', '#ffffff', 70);
    // the extra dot goes boinging off across the meadow
    const d = this.dropDot(q.kind, nx, ny);
    d.vx = c.facing * rand(420, 620); d.vy = rand(-200, 200); d.z = 60; d.vz = 700; d.grace = 0.7;
    for (const e of this.ents) if (dist(e.x, e.y, c.x, c.y) < 420 && chance(0.6)) e.a.playOnce(chance(0.5) ? 'surprised' : 'giggle', 0.7);
    c.sneezeT = c.sneezeQ.length ? 0.55 : 0;
    later(() => { if (this.critter === c && (c.state === 'wait' || c.state === 'count')) c.face = 'happy'; }, 450);
    if (c.sneezeQ.length) { c.face = 'ahh'; snd('lb-sneeze', 'hic', { vol: 0.6 }); }
  }

  critterHappy(c) {
    c.state = 'out'; c.st = 0; c.ox = c.x; c.oy = c.y; c.face = 'yay';
    for (const q of c.sneezeQ) this.dropDot(q.kind, c.x, c.y);
    c.sneezeQ.length = 0;
    c.facing = c.x < W / 2 ? -1 : 1;
    this.helped.push(c.kind);
    snd('lb-yay', 'fanfare', { vol: 0.7 }); sfx('cheer', { vol: 0.5 });
    fx.flash('#fff6d0', 0.12); fx.shake(5, 0.15);
    particles.burst(c.x, c.y - 40, { type: 'confetti', count: 40 });
    particles.burst(c.x, c.y - 40, { type: 'heart', count: 8, colors: ['#ff6fb1', '#ff4d6d'] });
    this.api.camera && this.api.camera.punch(c.x, c.y - 40, 1.12, 0.3);
    for (const e of c.helpers) { e.score += 1; particles.popText(e.x, e.a.y - e.a.height - 90, 'Thank you! +1', '#ffd23f', 40); e.a.playOnce('celebrate', 0.9); }
    for (const e of this.ents) if (!c.helpers.has(e)) e.a.playOnce('cheer', 0.5);
  }

  // -------------------------------------------------------------------- dots
  spawnDot(kind = null) {
    const c = this.critter;
    if (!kind) {
      const need = c && c.want !== 'any' ? c.want : null;
      kind = need && chance(0.62) ? need : pick(c && c.kind === 'butterfly' ? [c.want, ...WING_COLS] : ['black', 'black', 'pollen', ...WING_COLS]);
    }
    // pop out from somewhere along the edge flowers
    const side = randInt(0, 3);
    const x = side === 0 ? BOUNDS.x0 + 10 : side === 1 ? BOUNDS.x1 - 10 : rand(BOUNDS.x0 + 100, BOUNDS.x1 - 100);
    const y = side === 2 ? BOUNDS.y0 + 10 : side === 3 ? BOUNDS.y1 - 10 : rand(BOUNDS.y0 + 80, BOUNDS.y1 - 80);
    return this.dropDot(kind, x, y, true);
  }

  dropDot(kind, x, y, fresh = false) {
    const a = rand(TAU), sp = rand(150, 250);
    const d = { id: this.serial++, kind, x: clamp(x, BOUNDS.x0, BOUNDS.x1), y: clamp(y, BOUNDS.y0, BOUNDS.y1), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: fresh ? 0 : 40, vz: fresh ? 500 : 300, t: rand(5), sq: 0, grace: fresh ? 0.25 : 0.4, turnT: rand(1, 2.5), born: 0 };
    this.dots.push(d);
    if (fresh) particles.burst(d.x, d.y, { type: 'sparkle', count: 4, colors: [KINDS[kind].c, '#ffffff'], speed: [40, 140] });
    return d;
  }

  burstDots(kind, count) {
    // a dot shower sprays out of the big daisy
    for (let i = 0; i < count; i++) {
      const d = this.dropDot(kind || pick(Object.keys(KINDS)), PAD.x + rand(-60, 60), PAD.y + rand(-20, 20));
      const a = (i / count) * TAU + rand(-0.3, 0.3), sp = rand(380, 560);
      d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp * 0.7; d.z = 30; d.vz = 760; d.grace = 0.3;
    }
    sfx('pop'); sfx('sparkle', { vol: 0.6 });
    particles.burst(PAD.x, PAD.y - 10, { type: 'petal', count: 12, colors: ['#ffffff', '#ffd1ec'] });
  }

  updateDots(dt) {
    const maxDots = clamp(this.n + 6, 7, 13);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.dots.length < maxDots && !this.done) { this.spawnDot(); this.spawnT = rand(0.4, 0.8); }
    for (const d of this.dots) {
      d.t += dt; d.born += dt; d.grace -= dt; d.turnT -= dt;
      d.sq = Math.max(0, d.sq - dt * 3);
      if (d.turnT <= 0) { d.turnT = rand(0.9, 2.2); const a = Math.atan2(d.vy, d.vx) + rand(-1.2, 1.2), sp = rand(140, 250); d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp; }
      const spd = Math.hypot(d.vx, d.vy);
      if (spd > 260) { const k = Math.exp(-2.2 * dt); d.vx *= k; d.vy *= k; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < BOUNDS.x0) { d.x = BOUNDS.x0; d.vx = Math.abs(d.vx); } else if (d.x > BOUNDS.x1) { d.x = BOUNDS.x1; d.vx = -Math.abs(d.vx); }
      if (d.y < BOUNDS.y0) { d.y = BOUNDS.y0; d.vy = Math.abs(d.vy); } else if (d.y > BOUNDS.y1) { d.y = BOUNDS.y1; d.vy = -Math.abs(d.vy); }
      // keep off the critter's seat
      const c = this.critter;
      if (c && c.state !== 'out') { const dd = dist(d.x, d.y, SEAT.x, SEAT.y + 20); if (dd < 150) { d.vx += (d.x - SEAT.x) / dd * 900 * dt; d.vy += (d.y - SEAT.y - 20) / dd * 900 * dt; } }
      // hop hop
      d.vz -= 2600 * dt; d.z += d.vz * dt;
      if (d.z <= 0) { d.z = 0; d.vz = rand(420, 620); d.sq = 0.5; }
    }
  }

  // ----------------------------------------------------------------- update
  preUpdate(dt) { this.t += dt; this.updateDots(dt); this.updateCritter(dt); for (const e of this.ents) { e.a.moveAnim(0, 0, 1); e.a.update(dt); } }
  postUpdate(dt) {
    this.t += dt; this.updateDots(dt); this.updateCritter(dt);
    for (const e of this.ents) { e.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.time += dt;
    this.timeLeft = Math.max(0, DURATION - this.time);
    this.updateDots(dt);
    this.updateCritter(dt);
    if (!this.critter) { this.nextT -= dt; if (this.nextT <= 0 && !this.done) this.nextCritter(); }
    for (const e of this.ents) {
      if (e.p.isAI) this.aiThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate();
    // catching
    for (const e of this.ents) {
      if (e.carry) continue;
      const R = e.a.radius * 0.9 + DOT_R + 26 + (e.dashT > 0 ? 30 : 0);
      for (const d of this.dots) {
        if (d.grace > 0 || d.z > 90) continue;
        if (dist(e.x, e.y - 30, d.x, d.y) < R) { this.catchDot(e, d); break; }
      }
    }
    this.dots = this.dots.filter((d) => !d.gone);
    // giving
    const c = this.critter;
    if (c && c.state === 'wait') {
      for (const e of this.ents) if (e.carry && e.giveCd <= 0 && Math.hypot((e.x - c.x) / BODY_RX, (e.y - c.y - 30) / BODY_RY) < GIVE_K) this.give(e);
    }
    for (const f of this.flying) {
      f.t += dt;
      if (f.t >= f.dur) { f.done = true; this.landFlying(f); }
    }
    this.flying = this.flying.filter((f) => !f.done);
    for (const e of this.ents) e.a.update(dt);
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  catchDot(e, d) {
    d.gone = true;
    e.carry = { kind: d.kind, pop: 1 };
    snd('lb-catch', 'pop', { vol: 0.7 * e.vol });
    sfx('collect', { step: 3, vol: 0.4 * e.vol });
    particles.burst(d.x, d.y - d.z, { type: 'sparkle', count: 6, colors: [KINDS[d.kind].c, '#ffffff'], speed: [80, 220] });
    e.a.playOnce('catch', 0.35); e.a.squash(0.2);
    const c = this.critter;
    if (c && !e.p.isAI && e.sayCd <= 0 && this.wantMatches(c, d.kind) && chance(0.25)) { e.sayCd = 4; e.a.emote('heart', 0.8); }
  }

  movePlayer(e, dt) {
    const a = e.a, ctrl = e.p.ctrl;
    e.dashT = Math.max(0, e.dashT - dt); e.dashCd = Math.max(0, e.dashCd - dt); e.sayCd -= dt; e.giveCd -= dt;
    let ix = this.done ? 0 : ctrl.x, iy = this.done ? 0 : ctrl.y;
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    if (m > 0.2) { e.dx = ix / Math.max(m, 0.01); e.dy = iy / Math.max(m, 0.01); }
    if (!this.done && ctrl.pressed('a') && e.dashCd <= 0) {
      e.dashT = DASH_T; e.dashCd = DASH_CD;
      snd('lb-dash', 'dash', { vol: 0.5 * e.vol });
      a.playOnce('dash', 0.3); a.squash(-0.15);
      particles.burst(e.x, e.y, { type: 'dust', count: 6, color: '#ffffff', speed: [60, 160] });
    }
    const ds = depthScale(e.y);
    if (e.dashT > 0) {
      e.vx = e.dx * DASH_V; e.vy = e.dy * DASH_V * 0.8;
      if (chance(dt * 40)) particles.burst(e.x, e.y - 10, { type: 'sparkle', count: 1, colors: [e.p.color, '#ffffff'], speed: [10, 40] });
    } else {
      e.vx = damp(e.vx, ix * SPEED, 14, dt); e.vy = damp(e.vy, iy * SPEED * 0.82, 14, dt);
    }
    e.x = clamp(e.x + e.vx * dt, BOUNDS.x0, BOUNDS.x1);
    e.y = clamp(e.y + e.vy * dt, BOUNDS.y0 + 40, BOUNDS.y1);
    // nudge out of the critter's body
    const c = this.critter;
    if (c && c.state !== 'out' && c.state !== 'in') {
      const ux = (e.x - c.x) / BODY_RX, uy = (e.y - c.y - 30) / BODY_RY, dd = Math.hypot(ux, uy) || 0.01;
      if (dd < 1) { e.x = c.x + ux / dd * BODY_RX; e.y = c.y + 30 + uy / dd * BODY_RY; }
    }
    a.x = e.x; a.y = e.y; a.scale = this.scale * ds;
    if (e.dashT <= 0) a.moveAnim(e.vx, e.vy, SPEED, { run: Math.hypot(e.vx, e.vy) > 380 });
    if (e.carry) e.carry.pop = Math.max(0, e.carry.pop - dt * 3);
  }

  separate() {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy) || 1;
      const r = (A.a.radius + B.a.radius) * 0.7;
      if (d < r) {
        const k = (r - d) / d * 0.5;
        A.x -= dx * k; B.x += dx * k; A.y -= dy * k / 1.6; B.y += dy * k / 1.6;
        if (A.dashT > 0 || B.dashT > 0) {
          if (!A.bumpT || this.t - A.bumpT > 0.4) { A.bumpT = this.t; sfx('boing', { vol: 0.4 }); A.a.squash(0.3); B.a.squash(0.3); particles.burst((A.x + B.x) / 2, (A.y + B.y) / 2 - 60, { type: 'star', count: 4, colors: ['#ffd23f', '#ffffff'] }); }
        }
      }
    }
  }

  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), c = this.critter;
    const slow = 0.82;   // Molly Party CPUs keep it gentle
    if (e.brain.ready(dt)) {
      e.brain.wait(reactionTime(p) * 1.4 + rand(0, 0.3));
      if (e.carry) {
        const busy = this.ents.filter((o) => o !== e && o.carry && o.target && o.target.give).length;
        const room = c && c.state === 'wait' && c.filled + this.flying.length + busy < c.n;
        const ok = c && this.wantMatches(c, e.carry.kind);
        // hold a wrong dot until a critter that wants it comes (or be silly sometimes)
        if (c && c.state === 'wait' && ((ok && room) || chance(prof.mistake * 0.8))) e.target = { x: c.x + rand(-120, 120), y: c.y + 30 + BODY_RY + 20, give: true };
        else e.target = { x: clamp(SEAT.x + rand(-500, 500), 200, W - 200), y: clamp(SEAT.y + rand(-200, 350), 320, 980) };
        if (!ok && c && c.state === 'wait' && chance(0.5)) { this.dropDot(e.carry.kind, e.x, e.y - 40); e.carry = null; }   // let it go: the dot boings back into the meadow
      } else {
        let best = null, bd = 1e9;
        for (const d of this.dots) {
          if (d.grace > 0) continue;
          let dd = dist(e.x, e.y, d.x, d.y);
          if (c && c.want !== 'any' && d.kind !== c.want && !chance(prof.mistake)) dd += 900;
          for (const o of this.ents) if (o !== e && o.p.isAI && o.target && o.target.dot === d) dd += 400;
          if (dd < bd) { bd = dd; best = d; }
        }
        e.target = best ? { dot: best } : { x: rand(300, W - 300), y: rand(350, 950) };
      }
    }
    let tx, ty;
    if (e.target && e.target.dot) {
      const d = e.target.dot;
      if (d.gone) { e.target = null; e.brain.wait(0.1); p.ctrl.move(0, 0); return; }
      tx = d.x + d.vx * 0.25; ty = d.y + d.vy * 0.25 + 30;
      if (prof.mistake < 0.2 && dist(e.x, e.y, tx, ty) < 230 && dist(e.x, e.y, tx, ty) > 90 && chance(dt * 2)) p.ctrl.press('a');
    } else if (e.target) { tx = e.target.x; ty = e.target.y; } else { p.ctrl.move(0, 0); return; }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 8) { p.ctrl.move(0, 0); return; }
    const wob = Math.sin(this.t * 2.5 + e.i * 1.7) * prof.aimError * 0.7;
    const ang = Math.atan2(dy, dx) + wob, k = clamp(d / 60, 0, 1) * prof.speed * slow;
    p.ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
  }

  finish() {
    this.done = true;
    const scores = this.ents.map((e) => e.score);
    for (const e of this.ents) { e.a.setPose('celebrate'); e.carry = null; }
    this.api.finish({
      placements: placementsFromScores(scores),
      stats: this.ents.map((e) => `${e.spots} spot${e.spots === 1 ? '' : 's'}`),
      solo: this.n === 1 ? scores[0] : undefined,
      focus: this.critter ? { x: this.critter.x, y: this.critter.y, zoom: 1.2 } : { x: W / 2, y: H / 2, zoom: 1.1 },
    });
  }

  // ------------------------------------------------------------------- draw
  draw(g) {
    const bg = art('bg/ladybug-spots');
    if (bg) g.drawImage(bg, 0, 0, W, H); else drawMeadow(g, W, H, this.t, 1);
    this.drawPetals(g);
    if (!drawArt(g, 'prop/ladybug-pad', PAD.x, PAD.y, 620, 375)) drawDaisy(g, PAD.x, PAD.y, 1.6);
    // dot shadows
    for (const d of this.dots) { g.save(); g.globalAlpha = 0.22; g.fillStyle = NAVY; g.beginPath(); g.ellipse(d.x, d.y + 4, DOT_R * (1 - d.z / 400), DOT_R * 0.35, 0, 0, TAU); g.fill(); g.restore(); }
    // depth sorted: players, dots, critter
    const items = [];
    for (const e of this.ents) items.push({ y: e.y, fn: () => this.drawPlayer(g, e) });
    for (const d of this.dots) items.push({ y: d.y, fn: () => this.drawDotWorld(g, d) });
    const c = this.critter;
    if (c) items.push({ y: c.state === 'wait' || c.state === 'count' ? c.y + 60 : 2000, fn: () => this.drawCritterWorld(g, c) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();
    if (c) this.drawSlots(g, c);
    // flying spots
    for (const f of this.flying) {
      const k = clamp(f.t / f.dur, 0, 1);
      const to = f.sneeze || !c ? { x: c ? c.x + 140 * c.facing : f.x, y: c ? c.y - 10 : f.y } : this.slotPos(c, f.slot);
      const x = lerp(f.x, to.x, k), y = lerp(f.y, to.y, k) - Math.sin(k * Math.PI) * 120;
      g.save(); g.translate(x, y); g.rotate(k * 6); drawDot(g, f.kind, this.t); g.restore();
    }
    for (const e of this.ents) ui.playerTag(g, e.p, e.x, e.a.y - e.a.height - (e.carry ? 100 : 28));
  }

  drawPlayer(g, e) {
    const a = e.a;
    g.save();
    if (e.dashT > 0) { g.globalAlpha = 0.3; g.save(); g.translate(-e.vx * 0.04, -e.vy * 0.04); a.draw(g); g.restore(); g.globalAlpha = 1; }
    a.draw(g, { ring: e.p.color });
    g.restore();
    if (e.carry) {
      const s = 1 + e.carry.pop * 0.5;
      g.save(); g.translate(e.x, a.y - a.height - 50 + Math.sin(this.t * 6 + e.i) * 5); g.scale(s, s); drawDot(g, e.carry.kind, this.t + e.i); g.restore();
    }
  }

  drawDotWorld(g, d) {
    g.save(); g.translate(d.x, d.y - d.z - DOT_R * 0.8);
    const sq = d.sq * 0.35; g.scale(1 + sq, 1 - sq);
    const born = Math.min(1, d.born / 0.2); g.scale(born, born);
    drawDot(g, d.kind, d.t);
    g.restore();
  }

  drawCritterWorld(g, c) {
    g.save(); g.translate(c.x, c.y - c.hop);
    if (c.state === 'wait' || c.state === 'count') { g.save(); g.globalAlpha = 0.2; g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, 80 + c.hop, 140, 30, 0, 0, TAU); g.fill(); g.restore(); }
    const sq = clamp(c.sq, -0.6, 0.8) * 0.25;
    g.scale(1 + sq, 1 - sq);
    const lc = { ...c, t: this.t };
    if (c.state === 'in' || c.state === 'out') lc.flap = 1;
    drawCritter(g, lc, this.t);
    g.restore();
  }

  /** Slots, spots and the wish bubble: drawn after everyone so players never hide them. */
  drawSlots(g, c) {
    for (let i = 0; i < c.n; i++) {
      const p = this.slotPos(c, i);
      const s = c.slots[i];
      g.save(); g.translate(p.x, p.y + (c.sq * 0));
      if (c.kind !== 'rainbow' && art(c.kind === 'butterfly' ? 'prop/butterfly' : c.kind === 'bee' ? 'prop/bee' : 'prop/ladybug')) {
        const fit = c.kind === 'bee' ? 0.5 : c.kind === 'butterfly' ? 0.65 : 0.75;
        g.scale(fit, fit);
      }
      if (s) {
        const k = 0.8 + s.pop * 0.5 + (s.pulse || 0) * 0.35; g.scale(k, k);
        if (s.pulse) { g.save(); g.globalAlpha = s.pulse * 0.6; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 44, 0, TAU); g.fill(); g.restore(); }
        drawDot(g, s.kind, this.t + i, true);
      } else if (c.state !== 'out') {
        const pulse = 1 + Math.sin(this.t * 5 + i) * 0.07;
        g.scale(pulse, pulse);
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill();
        g.setLineDash([8, 7]); g.lineDashOffset = -this.t * 18; g.lineWidth = 5;
        g.strokeStyle = c.want === 'any' ? RAINBOW[Math.floor(this.t * 4 + i) % 7] : c.want === 'black' ? NAVY : KINDS[c.want].c;
        g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.stroke();
      }
      g.restore();
    }
    if (c.state === 'wait' || c.state === 'count') this.drawWish(g, c);
  }

  drawWish(g, c) {
    // thought bubble with the wanted number as dots
    const n = c.n, w = 70 + n * 58, x = c.x - (c.facing > 0 ? 40 : -40), y = c.y - 215 - c.hop;
    const pop = Math.min(1, c.st * 4);
    g.save(); g.translate(x, y); g.scale(pop, pop);
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 5;
    ui.roundRect(g, -w / 2, -42, w, 84, 42); g.fill(); g.stroke();
    g.beginPath(); g.arc(10, 56, 12, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.arc(22, 80, 7, 0, TAU); g.fill(); g.stroke();
    for (let i = 0; i < n; i++) {
      const dx = -((n - 1) * 58) / 2 + i * 58;
      g.save(); g.translate(dx, 0);
      const done = i < c.filled;
      const bounce = done ? 1 : 0.86 + Math.sin(this.t * 6 + i) * 0.04;
      g.scale(bounce * 0.78, bounce * 0.78);
      if (done || c.want === 'any') { if (!done) g.globalAlpha = 0.35; drawDot(g, c.want === 'any' ? WING_COLS.concat(['black', 'pollen'])[i % 6] : c.want, this.t + i, true); }
      else { g.globalAlpha = 0.35; drawDot(g, c.want, this.t + i, true); }
      g.restore();
      if (done) { g.save(); g.translate(dx + 18, 22); g.fillStyle = '#5ddc6a'; g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    }
    g.restore();
  }

  drawPetals(g) {
    g.save();
    for (const s of this.petals) {
      const y = (s.y + this.t * 30 * s.s) % (H + 40) - 20, x = s.x + Math.sin(this.t + s.p) * 40;
      g.globalAlpha = 0.55; g.save(); g.translate(x, y); g.rotate(this.t * s.s + s.p);
      g.fillStyle = s.s > 0.85 ? '#ffd1ec' : '#ffffff'; g.beginPath(); g.ellipse(0, 0, 10 * s.s, 6 * s.s, 0, 0, TAU); g.fill(); g.restore();
    }
    g.restore();
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft ?? DURATION);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 18, avoidCenter: true, format: (v) => String(v) });
    // friends helped (top right)
    const h = this.helped;
    if (h.length) {
      const per = Math.min(h.length, 8);
      g.save(); g.translate(W - 40 - per * 48, 150);
      ui.panel(g, -20, -36, per * 48 + 30, 72, { r: 36, fill: '#ffffff' });
      for (let i = 0; i < per; i++) {
        const kind = h[h.length - per + i];
        g.save(); g.translate(i * 48 + 18, 0); g.scale(0.17, 0.17);
        drawCritter(g, { kind, want: kind === 'bee' ? 'pollen' : 'pink', n: 0, filled: 0, facing: 1, flap: 0, face: 'happy' }, this.t);
        g.restore();
      }
      g.restore();
      if (h.length > 8) ui.text(g, '+' + (h.length - 8), W - 60, 210, { size: 30, color: NAVY, stroke: false });
    }
  }
}

// ------------------------------------------------------------- drawing kit

function drawMeadow(g, w, h, t, s) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#9fe39a'); gr.addColorStop(1, '#5fc46e');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // mowed stripes
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < w; x += 160 * s) g.fillRect(x, 0, 80 * s, h);
  // sky strip
  const sky = g.createLinearGradient(0, 0, 0, h * 0.16);
  sky.addColorStop(0, '#9fdcff'); sky.addColorStop(1, '#c9f0ff');
  g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.13);
  g.fillStyle = '#7fd08a';
  g.beginPath(); g.moveTo(0, h * 0.14);
  for (let x = 0; x <= w; x += 30 * s) g.lineTo(x, h * 0.13 - Math.sin(x / (120 * s)) * 12 * s - 10 * s);
  g.lineTo(w, h * 0.2); g.lineTo(0, h * 0.2); g.fill();
  // clover and tiny flowers
  for (let i = 0; i < 60; i++) {
    const x = ((i * 397) % 1000) / 1000 * w, y = h * 0.2 + ((i * 271) % 1000) / 1000 * h * 0.8;
    if (i % 3 === 0) { g.fillStyle = '#4fb85a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + Math.cos(k * 2.1) * 7 * s, y + Math.sin(k * 2.1) * 7 * s, 7 * s, 0, TAU); g.fill(); } }
    else { g.fillStyle = ['#ffffff', '#ffd1ec', '#fff3a0'][i % 3]; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 6 * s, y + Math.sin(k * 1.26) * 6 * s, 4.5 * s, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 3.5 * s, 0, TAU); g.fill(); }
  }
  // tall flowers framing the sides
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? w - 40 * s - (i >> 1) * 50 * s : 40 * s + (i >> 1) * 50 * s;
    const y = h * (0.35 + (i >> 1) * 0.2);
    tallFlower(g, side, y, s * (0.9 + (i % 3) * 0.15), ['#ff6fb1', '#ffd23f', '#a06bff', '#3fa7ff', '#ff9a3c', '#ff4d6d'][i], t + i);
  }
}

function tallFlower(g, x, y, s, col, t) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(t * 1.2) * 0.05);
  g.strokeStyle = '#3c9a4a'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 120); g.quadraticCurveTo(10, 50, 0, 0); g.stroke();
  g.fillStyle = '#4fb85a'; g.beginPath(); g.ellipse(14, 70, 22, 9, -0.6, 0, TAU); g.fill();
  g.fillStyle = col; g.strokeStyle = NAVY; g.lineWidth = 3;
  for (let k = 0; k < 6; k++) { g.save(); g.rotate(k * TAU / 6); g.beginPath(); g.ellipse(0, -22, 13, 20, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  g.fillStyle = '#ffe066'; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

function drawDaisy(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s * 0.6);
  g.fillStyle = 'rgba(36,22,63,0.15)'; g.beginPath(); g.ellipse(0, 18, 210, 200, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 4;
  for (let k = 0; k < 14; k++) {
    g.save(); g.rotate(k * TAU / 14);
    g.fillStyle = k % 2 ? '#ffffff' : '#ffe1f0';
    g.beginPath(); g.ellipse(0, -110, 38, 82, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffb31a'; for (let k = 0; k < 18; k++) { g.beginPath(); g.arc(Math.cos(k * 2.4) * (k * 3.4), Math.sin(k * 2.4) * (k * 3.4), 5, 0, TAU); g.fill(); }
  g.restore();
}

/** A dot: glossy ball with tiny happy eyes. Origin centre, ~60 px. */
function drawDot(g, kind, t, small = false) {
  const K = KINDS[kind] || KINDS.black;
  if (drawArt(g, K.art, 0, 0, 64, 64)) return;
  const r = small ? 24 : DOT_R;
  g.lineWidth = 4; g.strokeStyle = NAVY;
  if (kind === 'pollen') {
    g.fillStyle = K.c;
    g.beginPath();
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, rr = r + (k % 2 ? 4 : -1); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = K.hi; g.beginPath(); g.arc(-8, -9, 8, 0, TAU); g.fill();
  } else {
    g.fillStyle = K.c; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = K.hi; g.globalAlpha = 0.9; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.4, r * 0.28, r * 0.18, -0.6, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  // face
  const blink = Math.sin(t * 1.7) > 0.96 ? 0.15 : 1;
  g.fillStyle = kind === 'black' ? '#ffffff' : NAVY;
  g.beginPath(); g.ellipse(-7, 2, 3.2, 4.2 * blink, 0, 0, TAU); g.ellipse(7, 2, 3.2, 4.2 * blink, 0, 0, TAU); g.fill();
  g.strokeStyle = kind === 'black' ? '#ffffff' : NAVY; g.lineWidth = 2.5; g.lineCap = 'round';
  g.beginPath(); g.arc(0, 8, 5, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
}

/** Critter, origin at body centre, ~300 px wide. c: { kind, facing, flap, face, t } */
function drawCritter(g, c, t) {
  const f = c.facing || 1;
  const flapping = c.flap > 0;
  if (c.kind === 'butterfly' || c.kind === 'rainbow') { drawButterfly(g, c, t); return; }
  const key = c.kind === 'bee' ? 'prop/bee' : 'prop/ladybug';
  g.save(); g.scale(f, 1);
  if (drawArt(g, key, 0, 0, 300, 262)) { g.restore(); return; }
  // buzzing wings
  if (flapping || c.kind === 'bee') {
    const fl = Math.sin(t * (flapping ? 60 : 18)) * (flapping ? 0.5 : 0.15);
    g.save(); g.globalAlpha = 0.6; g.fillStyle = '#e8f6ff'; g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 3;
    for (const sgn of [-1, 1]) { g.save(); g.translate(-10, -60); g.rotate(sgn * (0.5 + fl) - 0.3); g.beginPath(); g.ellipse(-40, -30, 70, 36, -0.4, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    g.restore();
  }
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  // legs
  g.lineWidth = 6; g.lineCap = 'round';
  for (let k = 0; k < 3; k++) { const lx = -70 + k * 55, w = Math.sin(t * 10 + k) * (flapping ? 10 : 3); g.beginPath(); g.moveTo(lx, 50); g.lineTo(lx - 12 + w, 92); g.stroke(); }
  // head
  const hx = 112;
  g.fillStyle = c.kind === 'bee' ? '#3a2a1a' : '#2b2440';
  g.beginPath(); g.arc(hx, 0, 62, 0, TAU); g.fill(); g.stroke();
  // antennae
  g.lineWidth = 5;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + 10, -50); g.quadraticCurveTo(hx + 40 + s * 10, -110, hx + 20 + s * 30, -118 + Math.sin(t * 4 + s) * 5); g.stroke(); g.fillStyle = c.kind === 'bee' ? '#3a2a1a' : '#ff4d6d'; g.beginPath(); g.arc(hx + 20 + s * 30, -118 + Math.sin(t * 4 + s) * 5, 9, 0, TAU); g.fill(); g.stroke(); }
  // body
  if (c.kind === 'bee') {
    g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(-16, 0, 128, 98, 0, 0, TAU); g.fill(); g.stroke();
    g.save(); g.beginPath(); g.ellipse(-16, 0, 128, 98, 0, 0, TAU); g.clip();
    g.fillStyle = '#3a2a1a'; g.fillRect(-150, -110, 22, 220); g.fillRect(-108, -110, 18, 220);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-40, -50, 70, 22, -0.2, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = '#3a2a1a'; g.beginPath(); g.moveTo(-142, -12); g.lineTo(-172, 0); g.lineTo(-142, 12); g.fill();
  } else {
    g.fillStyle = '#ff3b4f'; g.beginPath(); g.ellipse(-16, 0, 128, 98, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(36,22,63,0.7)'; g.lineWidth = 4; g.beginPath(); g.moveTo(98, -20); g.quadraticCurveTo(-10, -4, -140, 0); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-30, -55, 70, 20, -0.15, 0, TAU); g.fill();
  }
  // face on the head
  drawFace(g, hx + 14, 4, c.face, t, c.kind === 'bee' ? '#ffffff' : '#ffffff');
  g.restore();
}

function drawFace(g, x, y, face, t, col) {
  g.save(); g.translate(x, y);
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 5; g.lineCap = 'round';
  if (face === 'choo' || face === 'yay') {
    g.beginPath(); g.arc(-18, -6, 10, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(28, -6); g.arc(18, -6, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  } else if (face === 'ahh') {
    g.beginPath(); g.moveTo(-28, -10); g.lineTo(-10, -4); g.moveTo(28, -10); g.lineTo(10, -4); g.stroke();
  } else {
    const blink = Math.sin(t * 1.3) > 0.97 ? 0.15 : 1;
    g.beginPath(); g.ellipse(-18, -8, 11, 14 * blink, 0, 0, TAU); g.ellipse(18, -8, 11, 14 * blink, 0, 0, TAU); g.fill();
    g.fillStyle = '#24163f'; g.beginPath(); g.arc(-15, -6, 5.5 * blink, 0, TAU); g.arc(21, -6, 5.5 * blink, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-13, -10, 2.2, 0, TAU); g.arc(23, -10, 2.2, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,111,177,0.75)'; g.beginPath(); g.ellipse(-32, 14, 9, 6, 0, 0, TAU); g.ellipse(32, 14, 9, 6, 0, 0, TAU); g.fill();
  g.strokeStyle = col; g.fillStyle = '#ff6f91';
  if (face === 'ooh' || face === 'ahh') { g.beginPath(); g.ellipse(0, 20, 8, 10, 0, 0, TAU); g.fill(); g.lineWidth = 3; g.stroke(); }
  else if (face === 'choo' || face === 'yay') { g.beginPath(); g.arc(0, 14, 14, 0, Math.PI); g.closePath(); g.fill(); g.lineWidth = 3; g.stroke(); }
  else { g.lineWidth = 4; g.beginPath(); g.arc(0, 12, 12, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  g.restore();
}

function drawButterfly(g, c, t) {
  const flap = c.flap > 0 ? 0.55 + Math.sin(t * 22) * 0.45 : 0.92 + Math.sin(t * 3) * 0.08;
  const rainbow = c.kind === 'rainbow';
  const K = rainbow ? null : KINDS[c.want] || KINDS.pink;
  if (!rainbow && drawArt(g, 'prop/butterfly', 0, -20, 360 * flap, 252)) return;
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  for (const s of [-1, 1]) {
    g.save(); g.scale(s * flap, 1);
    // upper wing
    const gr = g.createRadialGradient(92, -36, 10, 92, -36, 110);
    if (rainbow) { RAINBOW.forEach((col, i) => gr.addColorStop(i / 6, col)); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, K.hi); }
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(10, -10); g.bezierCurveTo(40, -150, 190, -150, 170, -40); g.bezierCurveTo(160, 10, 80, 20, 10, 0); g.fill(); g.stroke();
    // lower wing
    g.fillStyle = rainbow ? '#ffd1ec' : K.hi;
    g.beginPath(); g.moveTo(10, 4); g.bezierCurveTo(90, 10, 140, 60, 110, 100); g.bezierCurveTo(80, 130, 30, 90, 10, 20); g.fill(); g.stroke();
    // rim dots
    g.fillStyle = rainbow ? '#ffffff' : K.c;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(150 - k * 30, -110 + k * 10 + (k === 0 ? 30 : 0), 6, 0, TAU); g.fill(); }
    g.restore();
  }
  // body
  g.fillStyle = '#5b3f8c'; ui.roundRect(g, -16, -40, 32, 130, 16); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, -40, 34, 0, TAU); g.fillStyle = '#7b5bb3'; g.fill(); g.stroke();
  g.lineWidth = 4;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 10, -70); g.quadraticCurveTo(s * 30, -120, s * 50, -118 + Math.sin(t * 4 + s) * 5); g.stroke(); g.fillStyle = rainbow ? '#ffd23f' : K.c; g.beginPath(); g.arc(s * 50, -118 + Math.sin(t * 4 + s) * 5, 8, 0, TAU); g.fill(); g.stroke(); }
  g.save(); g.translate(0, -42); g.scale(0.72, 0.72); drawFace(g, 0, 0, c.face, t, '#ffffff'); g.restore();
  if (rainbow) { g.save(); g.translate(0, -88); g.rotate(Math.sin(t * 3) * 0.2); drawSparkleShape(g, 26, '#ffd23f'); g.restore(); }
}
