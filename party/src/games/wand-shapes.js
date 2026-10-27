// Magic Wand Shapes (Molly Party) - a big dotted shape appears in the twilight
// sky and everyone traces it together with their wand sparkle (left stick).
// Every dot you touch lights up in your colour; A is a sparkle burst that
// lights everything near your sparkle. Finish the shape and it casts a spell:
// the circle becomes a bubble with a frog inside that bounces round the sky,
// the heart a balloon, the star a shooting star, the moon a sleepy moon, the
// arc a living rainbow. Shapes keep coming (golden ones later) until time's up.
// Cooperative: everybody wins together.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { drawArt } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { easySteer, easyPrompt } from '../engine/easy.js';
import { outfitItem } from '../engine/outfits.js';
import { clamp, lerp, rand, pick, chance, TAU, ease, shuffle } from '../engine/util.js';
import {
  NAVY, CX, CY, SHAPES, SHAPE_ORDER, shapeDots, shapePath, drawSky, drawSparkle,
  drawFrogBubble, drawHeartBalloon, drawStarFace, drawSleepyMoon, drawRainbowArc,
} from './wand-shapes/art.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const DURATION = 60;
const SPEED = 1050;           // sparkle speed (px/s) at full stick
const HIT_R = 82;             // generous: a dot lights when the sparkle passes this close
const BURST_R = 175;          // A burst radius
const BURST_COOL = 0.8;
const AUTO_DONE = 0.86;       // the last few dots fill themselves in
const SPELL_LEN = 1.7;
const GROUND = 1015;
const AREA = { x0: 110, x1: W - 110, y0: 150, y1: 900 };
const CPU_SPEED = [0.42, 0.52, 0.62];

const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const u = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
};

function drawShapeIcon(g, id, x, y, s, t) {
  g.save(); g.translate(x, y);
  const k = s / 820;
  g.scale(k, k); g.translate(-CX, -CY);
  shapePath(g, id);
  g.fillStyle = SHAPES[id].col; g.strokeStyle = NAVY; g.lineWidth = 6 / k * 0.5;
  if (id === 'rainbow') { g.lineWidth = 60; g.strokeStyle = SHAPES[id].col; g.stroke(); }
  else { g.fill(); g.stroke(); }
  g.restore();
}

import { meta } from './wand-shapes.meta.js';

export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: A held flies the sparkle to the dots by itself
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.time = 0; this.done = false;
    // the spell clock, shown the whole game
    api.limit(() => (this.done ? null : Math.max(0, DURATION - this.time)), { showAt: Infinity, y: 58 });
    this.scores = this.players.map(() => 0);
    this.spells = [];            // ids of finished shapes (HUD row)
    this.creatures = [];
    this.order = SHAPE_ORDER.slice();
    this.shapeN = 0;
    this.shape = null;
    this.banner = null;
    const sc = n <= 2 ? 1.15 : n <= 4 ? 1.0 : 0.82;
    const span = Math.min(1500, (n - 1) * 380);
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? W / 2 : W / 2 - span / 2 + (span * i) / (n - 1);
      const look = (p.outfit || []).slice();
      if (!look.some((e) => outfitItem(e.id)?.slot === 'hand') && outfitItem('magic-wand')) look.push({ id: 'magic-wand', colour: [1, 0, 2, 3, 4, 5, 6, 7][i % 8] });
      const a = new Actor(p, { scale: sc, x, y: GROUND, outfit: look });
      a.snap();
      return {
        p, i, a, hx: x,
        cx: x, cy: 760, px: x, py: 760, vx: 0, vy: 0, rot: rand(TAU), cool: 0, trail: [], trailT: 0, moving: 0,
        ai: { t: rand(0.2, 0.6), tx: x, ty: 600, wander: 0 },
        idleT: 0, et: null,
      };
    });
    this.newShape();
  }

  // --- shapes ----------------------------------------------------------------
  newShape() {
    if (this.shapeN > 0 && this.shapeN % SHAPE_ORDER.length === 0) this.order = shuffle(SHAPE_ORDER.slice());
    const id = this.order[this.shapeN % SHAPE_ORDER.length];
    const golden = this.shapeN >= SHAPE_ORDER.length;
    this.shapeN++;
    const dots = shapeDots(id).map((d, k) => ({ ...d, lit: -2, t: 0, k }));
    this.shape = { id, dots, golden, t: 0, state: 'draw', lit: 0, spellT: 0, auto: false };
    if (golden && !this.saidGolden) { this.saidGolden = true; this.banner = { text: 'Golden shapes!', t: 0, color: '#ffd23f' }; }
    snd('ws-appear', 'magic', { vol: 0.45 });
  }

  lightDot(d, who) {
    if (d.lit !== -2) return;
    const s = this.shape;
    d.lit = who; d.t = 0; s.lit++;
    const col = who >= 0 ? this.players[who].color : '#fff3b0';
    const step = Math.min(24, s.lit);
    sfx('note', { midi: 72 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24][step % 11], vol: 0.18 });
    particles.burst(d.x, d.y, { type: 'sparkle', count: 5, colors: [col, '#fff', SHAPES[s.id].col], speed: [60, 220], size: [8, 16] });
    if (who >= 0) {
      const pts = s.golden ? 2 : 1;
      this.scores[who] += pts;
      if (s.golden) particles.popText(d.x, d.y - 20, '+2', '#ffd23f', 34);
    }
  }

  completeShape() {
    const s = this.shape;
    if (s.state !== 'draw') return;
    s.state = 'spell'; s.spellT = 0;
    this.spells.push(s.id);
    fx.flash('#fff6d0', 0.25); fx.shake(10, 0.3); fx.slowmo(0.5, 0.35);
    this.api.camera && this.api.camera.punch(CX, CY, 1.12, 0.5);
    snd('ws-spell', 'magic', { vol: 0.8 });
    sfx('fanfare', { vol: 0.35 });
    particles.ring(CX, CY, SHAPES[s.id].col, 520, 0.6);
    particles.burst(CX, CY, { type: 'star', count: 40, colors: [SHAPES[s.id].col, '#fff', '#ffd23f'], speed: [300, 900] });
    // everybody gets a spell bonus (cooperative)
    for (const e of this.ents) {
      this.scores[e.i] += 3;
      e.a.playOnce('cheer', 0.9, 'idle'); e.a.squash(0.3);
      particles.popText(e.a.x, e.a.y - e.a.height - 40, '+3', '#ffd23f', 46);
    }
    const sayer = pick(this.ents);
    sayer.a.say(pick(['Ta-da!', 'Magic!', 'Wow!', 'Yay!']), 1.2, 'woo');
  }

  /** The finished shape turns into a living thing. */
  spawnCreature(id) {
    const c = { id, t: 0, x: CX, y: CY, alive: true };
    if (id === 'circle') {
      c.r = 300; c.vx = rand(-1, 1) > 0 ? 330 : -330; c.vy = -260;
      const bubbles = this.creatures.filter((o) => o.id === 'circle');
      if (bubbles.length >= 3) this.popBubble(bubbles[0]);
      snd('ws-frog', 'giggle', { vol: 0.6 });
    } else if (id === 'heart') { c.vy = -60; snd('ws-balloon', 'grow', { vol: 0.6 }); }
    else if (id === 'star') { c.vx = 0; c.vy = 0; c.rot = 0; snd('sm-shooting', 'whoosh', { vol: 0.6 }); }
    else if (id === 'moon') {
      const slots = [{ x: 250, y: 300 }, { x: W - 250, y: 300 }];
      const used = this.creatures.filter((o) => o.id === 'moon');
      if (used.length >= 2) used[0].alive = false;
      const taken = new Set(used.filter((o) => o.alive).map((o) => o.slot));
      c.slot = taken.has(0) ? 1 : 0; c.tx = slots[c.slot].x; c.ty = slots[c.slot].y; c.zzz = 0;
      snd('sm-moon', 'snore', { vol: 0.5 });
    } else if (id === 'rainbow') {
      for (const o of this.creatures) if (o.id === 'rainbow') o.alive = false;
      snd('ws-rainbow', 'sparkle', { vol: 0.6 });
    }
    this.creatures.push(c);
  }

  popBubble(c) {
    c.alive = false;
    particles.burst(c.x, c.y, { type: 'bubble', count: 14, speed: [100, 400] });
    sfx('pop', { vol: 0.5 });
  }

  // --- update ----------------------------------------------------------------
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.rot += dt * 2; e.a.update(dt); }
    if (this.shape) this.shape.t += dt;
  }

  update(dt) {
    this.t += dt; this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.8) this.banner = null; }
    this.updateAI(dt);
    for (const e of this.ents) this.moveCursor(e, dt);
    this.updateShape(dt);
    this.updateCreatures(dt);
    this.updateActors(dt);
    if (!this.done && this.time >= DURATION) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) e.trail = e.trail.filter((p) => (p.life -= dt) > 0);
    this.updateShape(dt);
    this.updateCreatures(dt);
    this.updateActors(dt);
  }

  updateAI(dt) {
    const s = this.shape;
    for (const e of this.ents) {
      if (!e.p.isAI) continue;
      const ai = e.ai, c = e.p.ctrl, lvl = clamp(e.p.aiLevel ?? 0, 0, 2);
      ai.t -= dt;
      if (ai.t <= 0) {
        ai.t = rand(...aiProfile(e.p).think) * 0.6;
        if (ai.wander > 0 || (chance(aiProfile(e.p).mistake * 0.5))) {
          ai.wander = ai.wander > 0 ? ai.wander : rand(0.6, 1.2);
          ai.tx = rand(AREA.x0, AREA.x1); ai.ty = rand(AREA.y0, 800);
        } else if (s && s.state === 'draw') {
          // nearest unlit dot nobody else is heading for
          let best = null, bd = Infinity;
          for (const d of s.dots) {
            if (d.lit !== -2) continue;
            let dd = Math.hypot(d.x - e.cx, d.y - e.cy);
            if (this.ents.some((o) => o !== e && Math.hypot(o.ai.tx - d.x, o.ai.ty - d.y) < 90)) dd += 400;
            if (dd < bd) { bd = dd; best = d; }
          }
          if (best) { ai.tx = best.x; ai.ty = best.y; }
        } else { ai.tx = e.hx + Math.sin(this.t + e.i) * 200; ai.ty = 640; }
      }
      if (ai.wander > 0) ai.wander -= dt;
      steer(e.p, e.cx, e.cy, ai.tx, ai.ty, { arrive: 50 });
      if (s && s.state === 'draw' && e.cool <= 0 && chance(dt * [0.3, 0.5, 0.7][lvl])) {
        const near = s.dots.filter((d) => d.lit === -2 && Math.hypot(d.x - e.cx, d.y - e.cy) < BURST_R).length;
        if (near >= 3) c.press('a');
      }
    }
  }

  moveCursor(e, dt) {
    const c = e.p.ctrl;
    let mx = c.x, my = c.y;
    if (this.easy && !e.p.isAI) [mx, my] = this.easyStick(e, dt);
    const m = Math.hypot(mx, my);
    if (m < 0.15) { mx = 0; my = 0; }
    const lvl = clamp(e.p.aiLevel ?? 0, 0, 2);
    const sp = SPEED * (e.p.isAI ? CPU_SPEED[lvl] : 1);
    e.vx = lerp(e.vx, mx * sp, 1 - Math.exp(-14 * dt));
    e.vy = lerp(e.vy, my * sp, 1 - Math.exp(-14 * dt));
    e.px = e.cx; e.py = e.cy;
    e.cx = clamp(e.cx + e.vx * dt, AREA.x0, AREA.x1);
    e.cy = clamp(e.cy + e.vy * dt, AREA.y0, AREA.y1);
    const speed = Math.hypot(e.vx, e.vy);
    e.moving = lerp(e.moving, speed > 120 ? 1 : 0, 1 - Math.exp(-8 * dt));
    e.rot += dt * (2 + speed / 200);
    e.cool = Math.max(0, e.cool - dt);
    // ribbon trail
    e.trailT -= dt;
    if (e.trailT <= 0 && speed > 40) { e.trailT = 0.016; e.trail.push({ x: e.cx, y: e.cy, life: 0.45 }); }
    e.trail = e.trail.filter((p) => (p.life -= dt) > 0);
    if (speed > 200 && Math.random() < dt * 20) particles.trail(e.cx, e.cy, { type: 'sparkle', colors: [e.p.color, '#fff'], size: [6, 12], speed: [10, 60], life: [0.3, 0.6] });
    // light dots along the path
    const s = this.shape;
    if (s && s.state === 'draw') {
      for (const d of s.dots) if (d.lit === -2 && segDist(d.x, d.y, e.px, e.py, e.cx, e.cy) < HIT_R) this.lightDot(d, e.i);
      if (c.pressed('a') && e.cool <= 0) this.burst(e);
    } else if (c.pressed('a') && e.cool <= 0) this.burst(e);
    // bop bubbles
    for (const b of this.creatures) {
      if (b.id !== 'circle' || !b.alive || b.t < 0.9) continue;
      const dx = b.x - e.cx, dy = b.y - e.cy, d = Math.hypot(dx, dy);
      if (d < b.r + 26 && d > 1 && (b.bop ?? 0) <= 0) {
        b.vx = (dx / d) * 520; b.vy = (dy / d) * 520; b.bop = 0.3; b.squish = 1;
        snd('boing', 'bounce', { vol: 0.45 });
        particles.burst(b.x - dx / d * b.r, b.y - dy / d * b.r, { type: 'star', count: 5, colors: ['#fff', '#c8efff'], speed: [80, 200] });
      }
    }
  }

  /** Molly Easy: while A is held the sparkle flies itself to the nearest free unlit dot. */
  easyStick(e, dt) {
    const c = e.p.ctrl, s = this.shape;
    // Either stick still steers the sparkle (a touch gentler than Medium); the
    // autopilot waits (1.5 s: a child who has just steered isn't flown about),
    // then picks the nearest dot from wherever it was left.
    const st = easySteer(e, c, dt, 1.5);
    if (st.manual) { e.idleT = 0; e.et = null; return [st.x * 0.85, st.y * 0.85]; }
    const held = c.held('a');
    e.idleT = held ? 0 : e.idleT + dt;
    let tx = e.hx, ty = 640;
    if (s && s.state === 'draw') {
      if (!e.et || e.et.lit !== -2 || !s.dots.includes(e.et)) {
        let best = null, bd = Infinity;
        for (const d of s.dots) {
          if (d.lit !== -2) continue;
          let dd = Math.hypot(d.x - e.cx, d.y - e.cy);
          if (this.ents.some((o) => o !== e && (o.et === d || Math.hypot(o.ai.tx - d.x, o.ai.ty - d.y) < 90))) dd += 400;
          if (dd < bd) { bd = dd; best = d; }
        }
        e.et = best;
      }
      if (e.et) { tx = e.et.x; ty = e.et.y; }
    } else e.et = null;
    e.ai.tx = tx; e.ai.ty = ty;
    if (!held) return [0, 0];
    const dx = tx - e.cx, dy = ty - e.cy, d = Math.hypot(dx, dy);
    if (d < 8) return [0, 0];
    const k = 0.72 * clamp(d / 80, 0.35, 1);
    return [dx / d * k, dy / d * k];
  }

  burst(e) {
    e.cool = BURST_COOL;
    const s = this.shape;
    particles.ring(e.cx, e.cy, e.p.color, BURST_R * 1.2, 0.4);
    particles.burst(e.cx, e.cy, { type: 'sparkle', count: 22, colors: [e.p.color, '#fff', '#ffd23f'], speed: [200, 520] });
    snd('ws-burst', 'sparkle', { vol: 0.5 });
    e.a.playOnce('cast', 0.45, 'idle');
    if (s && s.state === 'draw') {
      let hit = 0;
      for (const d of s.dots) if (d.lit === -2 && Math.hypot(d.x - e.cx, d.y - e.cy) < BURST_R) { this.lightDot(d, e.i); hit++; }
      if (hit >= 3) { particles.popText(e.cx, e.cy - 60, 'Zing!', e.p.color, 46); fx.shake(4, 0.12); }
    }
  }

  updateShape(dt) {
    const s = this.shape;
    if (!s) return;
    s.t += dt;
    for (const d of s.dots) if (d.lit !== -2) d.t += dt;
    if (s.state === 'draw') {
      if (!s.auto && s.lit >= s.dots.length * AUTO_DONE) {
        s.auto = true;
        // the remaining dots light themselves, one by one
        s.autoQ = s.dots.filter((d) => d.lit === -2); s.autoT = 0;
        snd('ws-whoosh', 'whoosh', { vol: 0.5 });
      }
      if (s.auto) {
        s.autoT -= dt;
        while (s.autoT <= 0 && s.autoQ.length) { this.lightDot(s.autoQ.shift(), -1); s.autoT += 0.05; }
        if (!s.autoQ.length && s.lit >= s.dots.length) this.completeShape();
      }
    } else if (s.state === 'spell') {
      s.spellT += dt;
      if (s.spellT >= 0.75 && !s.spawned) { s.spawned = true; this.spawnCreature(s.id); }
      if (s.spellT >= SPELL_LEN) { this.shape = null; if (!this.done) this.newShape(); }
    }
  }

  updateCreatures(dt) {
    for (const c of this.creatures) {
      c.t += dt;
      if (c.id === 'circle') {
        c.r = lerp(300, 110, ease.outCubic(clamp(c.t / 0.8, 0, 1)));
        c.bop = (c.bop ?? 0) - dt; c.squish = Math.max(0, (c.squish ?? 0) - dt * 3);
        if (c.t > 0.8) {
          c.x += c.vx * dt; c.y += c.vy * dt;
          const sp = Math.hypot(c.vx, c.vy), want = 300;
          if (sp > 1) { c.vx *= lerp(1, want / sp, dt * 1.5); c.vy *= lerp(1, want / sp, dt * 1.5); }
          if (c.x < AREA.x0 + c.r) { c.x = AREA.x0 + c.r; c.vx = Math.abs(c.vx); c.squish = 1; }
          if (c.x > AREA.x1 - c.r) { c.x = AREA.x1 - c.r; c.vx = -Math.abs(c.vx); c.squish = 1; }
          if (c.y < 170 + c.r) { c.y = 170 + c.r; c.vy = Math.abs(c.vy); c.squish = 1; }
          if (c.y > 860 - c.r) { c.y = 860 - c.r; c.vy = -Math.abs(c.vy); c.squish = 1; }
        }
      } else if (c.id === 'heart') {
        if (c.t > 0.5) { c.vy -= 260 * dt; c.y += c.vy * dt; c.x = CX + Math.sin(c.t * 2) * 60; }
        if (c.y < -400) c.alive = false;
      } else if (c.id === 'star') {
        if (c.t < 0.6) c.rot += dt * 8;
        else {
          if (!c.launched) { c.launched = true; c.vx = 1700; c.vy = -760; fx.shake(6, 0.2); }
          c.x += c.vx * dt; c.y += c.vy * dt; c.rot += dt * 10;
          particles.burst(c.x, c.y, { type: 'star', count: 2, colors: RAINBOW, speed: [20, 120], life: [0.5, 1], size: [10, 20] });
          if (c.x > W + 300 || c.y < -300) c.alive = false;
        }
      } else if (c.id === 'moon') {
        const k = ease.inOutQuad(clamp((c.t - 0.4) / 1.1, 0, 1));
        c.x = lerp(CX, c.tx, k); c.y = lerp(CY, c.ty, k); c.r = lerp(300, 110, k);
        c.zzz -= dt;
        if (c.t > 1.5 && c.zzz <= 0) { c.zzz = 1.6; particles.popText(c.x + 90, c.y - 90, 'z', '#c8efff', 40); }
      } else if (c.id === 'rainbow') {
        c.k = clamp(c.t / 1.0, 0, 1);
      }
    }
    this.creatures = this.creatures.filter((c) => c.alive);
  }

  updateActors(dt) {
    for (const e of this.ents) {
      const a = e.a;
      const want = e.cx < a.x - 30 ? -1 : e.cx > a.x + 30 ? 1 : a.facing;
      a.facing = want;
      if (!a._once) a.setPose(e.moving > 0.5 ? 'wand-up' : 'idle');
      a.update(dt);
    }
  }

  finish() {
    this.done = true;
    // the shape in progress gets finished as a final spell
    if (this.shape && this.shape.state === 'draw') {
      for (const d of this.shape.dots) if (d.lit === -2) { d.lit = -1; d.t = 0; this.shape.lit++; }
      this.completeShape();
    }
    for (const e of this.ents) e.a.setPose('celebrate');
    this.api.finishTogether({
      stats: this.scores.map((s) => `${s} sparkles`),
      title: `${this.spells.length} spells!`,
      focus: { x: CX, y: CY },
    });
  }

  // --- draw --------------------------------------------------------------------
  draw(g) {
    drawSky(g, this.t);
    for (const c of this.creatures) if (c.id === 'rainbow') drawRainbowArc(g, CX, CY + 260, 400, c.k, this.t, c.t < 1.6 ? 1 : 0.55);
    for (const c of this.creatures) if (c.id === 'moon') drawSleepyMoon(g, c.x, c.y, c.r, this.t);
    this.drawShape(g);
    for (const c of this.creatures) {
      if (c.id === 'circle') {
        const sq = (c.squish || 0) * 0.15;
        g.save(); g.translate(c.x, c.y); g.scale(1 + sq, 1 - sq); drawFrogBubble(g, 0, 0, c.r, this.t + c.t); g.restore();
      } else if (c.id === 'heart') drawHeartBalloon(g, c.x, c.y, lerp(320, 180, clamp(c.t / 0.5, 0, 1)), this.t);
      else if (c.id === 'star') drawStarFace(g, c.x, c.y, lerp(320, 110, ease.outCubic(clamp(c.t / 0.5, 0, 1))), c.rot, this.t);
    }
    // characters
    for (const e of this.ents) e.a.draw(g, { ring: e.p.color });
    // wand beams to the sparkles (not on the gallery ending: the spells are the show)
    const ended = !!this.api.ended?.();
    if (!ended) for (const e of this.ents) {
      const h = e.a.anchor('hand');
      g.save(); g.globalAlpha = 0.25 + 0.35 * e.moving;
      g.strokeStyle = e.p.color; g.lineWidth = 4; g.setLineDash([4, 14]); g.lineDashOffset = -this.t * 80;
      g.beginPath(); g.moveTo(h.x, h.y); g.quadraticCurveTo((h.x + e.cx) / 2, Math.min(h.y, e.cy) - 80, e.cx, e.cy); g.stroke();
      g.restore();
    }
    // trails + sparkles
    for (const e of this.ents) {
      if (e.trail.length > 1) {
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
        for (let i = 1; i < e.trail.length; i++) {
          const p0 = e.trail[i - 1], p1 = e.trail[i];
          g.globalAlpha = clamp(p1.life / 0.45, 0, 1) * 0.8;
          g.strokeStyle = e.p.color; g.lineWidth = 6 + 16 * (p1.life / 0.45);
          g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
        }
        g.restore();
      }
    }
    for (const e of this.ents) {
      const pulse = e.cool > BURST_COOL - 0.2 ? 1.3 : 1;
      if (this.easy && !e.p.isAI && e.et && this.shape && this.shape.state === 'draw') {
        // Molly Easy: the dot this sparkle is heading for glows in its colour
        g.save(); g.globalAlpha = 0.55 + 0.35 * Math.sin(this.t * 8 + e.i);
        g.strokeStyle = e.p.color; g.lineWidth = 7;
        g.beginPath(); g.arc(e.et.x, e.et.y, 36 + Math.sin(this.t * 8) * 5, 0, TAU); g.stroke();
        g.restore();
      }
      drawSparkle(g, e.cx, e.cy, 52 * pulse, e.rot, e.p.color);
      if ((this.n > 1 || this.time < 4) && !ended) ui.playerTag(g, e.p, e.cx, e.cy - 52);
      // Molly Easy: hold A to fly - the big A sits beside the dot it flies to (or over the sparkle)
      if (this.easy && !e.p.isAI && !this.done && e.idleT > 1.2 && this.time > 0) easyPrompt(g, e.p, { target: e.et ? { x: e.et.x, y: e.et.y } : null, child: { x: e.cx, y: e.cy - 26 } });
    }
  }

  drawShape(g) {
    const s = this.shape;
    if (!s) return;
    const col = s.golden ? '#ffd23f' : SHAPES[s.id].col;
    const appear = clamp(s.t / 0.6, 0, 1);
    if (s.state === 'spell') {
      // the shape fills with light, then fades as the creature appears
      const k = s.spellT;
      g.save(); g.globalAlpha = clamp(1 - (k - 0.6) / 0.6, 0, 1);
      shapePath(g, s.id);
      g.shadowColor = col; g.shadowBlur = 50;
      if (SHAPES[s.id].closed) { g.fillStyle = col; g.fill(); }
      g.strokeStyle = '#fff'; g.lineWidth = 18 + Math.sin(k * 20) * 4; g.stroke();
      g.restore();
      return;
    }
    // guide line
    g.save(); g.globalAlpha = 0.35 * appear;
    shapePath(g, s.id); g.strokeStyle = col; g.lineWidth = 10; g.setLineDash([2, 22]); g.lineCap = 'round'; g.stroke();
    g.restore();
    // a guide twinkle runs round the unlit dots to show the way
    const unlit = s.dots.filter((d) => d.lit === -2);
    s.dots.forEach((d, i) => {
      const show = clamp(appear * s.dots.length - i, 0, 1);
      if (show <= 0) return;
      g.save(); g.translate(d.x, d.y);
      if (d.lit === -2) {
        const pulse = 1 + Math.sin(this.t * 6 + i * 0.6) * 0.15;
        g.scale(show * pulse, show * pulse);
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill();
        g.fillStyle = s.golden ? '#fff3b0' : '#ffffff'; g.strokeStyle = col; g.lineWidth = 5;
        g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.stroke();
      } else {
        const pop = ease.outBack(clamp(d.t / 0.25, 0, 1));
        const c = d.lit >= 0 ? this.players[d.lit].color : '#fff3b0';
        g.scale(pop, pop);
        g.shadowColor = c; g.shadowBlur = 24;
        g.fillStyle = c; g.strokeStyle = '#fff'; g.lineWidth = 4;
        g.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5 + this.t * 0.8, rr = k % 2 ? 10 : 24; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.stroke();
      }
      g.restore();
    });
    if (unlit.length && s.t > 0.6) {
      const k = Math.floor(this.t * 3) % unlit.length, d = unlit[k];
      g.save(); g.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 12);
      g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(d.x, d.y, 32 + Math.sin(this.t * 10) * 4, 0, TAU); g.stroke();
      g.restore();
    }
  }

  drawHUD(g) {
    // the gallery ending's ribbon takes the top: no player chips, the spells strip just below it
    const ended = !!this.api.ended?.(), sy = ended ? 136 : 112;
    if (!ended) ui.scoreboard(g, this.players, this.players.map(() => ''), { y: 18, avoidCenter: true, format: (v) => v });
    // spells cast so far, under the timer (api.limit's clock, drawn by the play scene)
    const n = this.spells.length;
    if (n) {
      const sz = 46, w = Math.min(n, 12) * (sz + 8);
      ui.panel(g, W / 2 - w / 2 - 14, sy, w + 28, sz + 16, { r: (sz + 16) / 2, fill: 'rgba(255,255,255,0.85)', lineWidth: 4 });
      this.spells.slice(-12).forEach((id, i) => drawShapeIcon(g, id, W / 2 - w / 2 + 4 + sz / 2 + i * (sz + 8), sy + 8 + sz / 2, sz, this.t));
    }
    if (this.banner) {
      const k = this.banner.t;
      g.save(); g.globalAlpha = clamp((1.8 - k) / 0.4, 0, 1);
      ui.banner(g, this.banner.text, k, { y: 520, size: 130, color: this.banner.color });
      g.restore();
    }
  }
}
