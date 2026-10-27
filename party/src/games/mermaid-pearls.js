// Mermaid Pearls (Molly Party) - a cooperative underwater pearl hunt.
// Everyone swims freely (stick) and ZOOMS with A. Clams snap open and shut:
// swim into an open one to grab its pearl (a clam that shuts on you just
// boings you away, giggling). Fizzy bubble currents whoosh you up the screen
// and carry pearl bubbles. Tickle the sleepy octopus (A next to it) until it
// wakes up giggling and sprays pearls everywhere. A rainbow fish sometimes
// zooms past dropping a trail of pearls. Every pearl flies into ONE shared
// treasure chest; fill it for a sparkly finale (everyone wins). Friendly
// little fish join each swimmer's conga line as they collect.
//
// Art hooks (all optional, procedural fallbacks ship today):
//   bg/mermaid-pearls  prop/mp-clam-open  prop/mp-clam-closed  prop/mp-pearl
//   prop/mp-pearl-gold  prop/mp-octopus  prop/mp-octopus-awake  prop/mp-chest
//   prop/mp-chest-open  prop/mp-fish-1..3  prop/mp-vent
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, hasSound, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, Brain, steer } from '../engine/ai.js';
import { easySteer, easyPrompt, easyAutoOk } from '../engine/easy.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { drawSparkleShape, drawHeartShape } from '../engine/emotes.js';
import { charById } from '../data/characters.js';
import { clamp, lerp, approach, rand, randInt, pick, chance, TAU, dist, ease } from '../engine/util.js';

const NAVY = '#24163f';
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const poseOr = (n, fb) => (POSE_NAMES.includes(n) ? n : fb);

import { meta } from './mermaid-pearls.meta.js';

export { meta };

// --- tuning -----------------------------------------------------------------
const DURATION = 60;
const STORM_AT = 15;           // seconds left: pearl storm
const LEFT = 90, RIGHT = W - 90, TOP = 200, FLOOR = 905, SEABED = 940;
const SWIM = 560, ZOOM = 1350, ZOOM_T = 0.32, ZOOM_CD = 0.55;
const CHEST = { x: 1660, y: SEABED + 6 };
const CHEST_SHOW = { x: 1600, y: 868, s: 1.25 };   // gallery ending: lifted clear of the A/Y hints, a bit bigger
const OCTO = { x: 960, y: SEABED + 10 };
const VENTS = [520, 1360];
// prop/mp-clam-open (256x224 art px): top of the bottom shell's front lip outline, left
// to right; the shell below it is drawn again over the pearl so it sits inside
const CLAM_LIP = [[0, 146], [12, 149], [20, 150], [36, 153], [52, 156], [60, 157], [68, 159], [76, 163], [84, 162],
  [92, 159], [100, 158], [108, 159], [116, 163], [124, 166], [132, 166], [140, 162], [148, 159], [156, 158], [164, 159],
  [172, 162], [180, 163], [188, 159], [196, 157], [204, 156], [220, 153], [236, 150], [244, 149], [256, 146]];
const FINALE_T = 3.6;
const FISH_COLS = [['#ffd23f', '#3fa7ff'], ['#ff8fc7', '#ffc2e6'], ['#ff9f1c', '#ffffff'], ['#8be8b8', '#3fb8a0'], ['#c9a0ff', '#ffffff']];

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: A zooms at the target in reach; A again and again (no steering) swims you there
    this.players = api.players;
    const n = this.n = this.players.length;
    this.t = 0; this.el = 0;
    this.timeLeft = DURATION;
    // the swim clock, shown the whole game (the finale fills the chest without one)
    api.limit(() => (this.finale || this.done ? null : this.timeLeft), { showAt: Infinity });
    this.done = false; this.finale = 0; this.storm = false; this.stormT = 0;
    this.target = Math.round(Math.min(175, 70 + 14 * (n - 1)));
    this.filled = 0; this.shown = 0; this.mile = 0;
    this.scale = n <= 2 ? 0.95 : n <= 4 ? 0.85 : 0.72;
    // clams: seabed + rock ledges
    const spots = [[330, SEABED - 4], [760, SEABED - 6], [1220, SEABED - 4], [1470, SEABED - 2], [300, 600], [1640, 560], [960, 430]];
    this.ledges = [[300, 600], [1640, 560], [960, 430]];
    this.clams = spots.map(([x, y], i) => ({ x, y, open: 0, state: 'closed', t: rand(0.3, 1.8) + i * 0.15, pearl: null, sq: 0, giggle: 0, snapT: 0 }));
    this.vents = VENTS.map((x) => ({ x, t: rand(1, 2), pulse: 0 }));
    this.octo = { x: OCTO.x, y: OCTO.y, tickles: 0, need: 4 + Math.ceil(n * 0.75), awake: 0, cool: 0, wig: 0, sq: 0, throwT: 0, left: 0, giggleT: 0 };
    this.pearls = [];     // loose pearls: { x, y, vx, vy, gold, t, bubble, life }
    this.fliers = [];     // pearls flying to the chest
    this.bubbles = Array.from({ length: 40 }, () => ({ x: rand(W), y: rand(TOP, SEABED), r: rand(3, 9), s: rand(30, 90), w: rand(TAU) }));
    this.rainbowFish = null; this.rfT = rand(9, 13);
    this.school = null; this.schoolT = rand(4, 7);
    this.chestSq = 0; this.chestGlow = 0;
    this.ents = this.players.map((p, i) => {
      const lh0 = (charById(p.charId)?.members[0]?.h) || 170;
      const a = new Actor(p, { scale: this.scale * clamp(165 / lh0, 0.85, 2.4) });
      const cols = Math.min(n, 4), row = n > 4 ? Math.floor(i / 4) : 0, col = n > 4 ? i % 4 : i;
      a.x = W / 2 + (col - (cols - 1) / 2) * 300; a.y = 470 + row * 190; a.facing = a.x < W / 2 ? 1 : -1; a.snap();
      return {
        p, a, i, x: a.x, y: a.y, vx: 0, vy: 0, zoom: 0, zoomCd: 0, pearls: 0, fish: [], hist: [], popN: 0, popT: 0,
        boing: 0, current: 0, spin: 0, brain: new Brain(p), target: null, tx: a.x, ty: a.y, wander: 0, bub: 0, tickleCd: 0,
        auto: this.easy && !p.isAI ? { ix: 0, iy: 0, dx: 1, dy: 0, target: null, t: 0, near: false } : null,
      };
    });
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    this.ambient(dt);
    for (const e of this.ents) { e.a.setPose('idle'); e.a.update(dt); e.a.y = e.y + Math.sin(this.t * 2 + e.i) * 6; }
  }

  update(dt) {
    this.t += dt; this.el += dt;
    if (!this.finale) {
      this.timeLeft = Math.max(0, DURATION - this.el);
      if (!this.storm && this.timeLeft <= STORM_AT) this.startStorm();
    }
    this.ambient(dt);
    this.updateClams(dt);
    this.updateOcto(dt);
    this.updateVents(dt);
    this.updateEvents(dt);
    for (const e of this.ents) {
      if (e.p.isAI && !this.finale) this.aiThink(e, dt);
      if (e.auto && !this.finale) this.easyThink(e, dt);
      this.swim(e, dt);
    }
    this.pushApart(dt);
    this.updatePearls(dt);
    this.updateFliers(dt);
    if (!this.finale && (this.filled >= this.target || this.timeLeft <= 0)) this.startFinale();
    if (this.finale) {
      this.finale += dt;
      this.updateFinale(dt);
      if (this.finale >= FINALE_T && !this.done) this.finish();
    }
  }

  postUpdate(dt) {
    this.t += dt;
    if (this.api.ended?.()) this.endT = (this.endT || 0) + dt;
    this.ambient(dt);
    this.updateFinale(dt);
    for (const e of this.ents) this.swim(e, dt);
    this.updateFliers(dt);
  }

  ambient(dt) {
    for (const b of this.bubbles) { b.y -= b.s * dt; b.x += Math.sin(this.t * 1.5 + b.w) * 10 * dt; if (b.y < 120) { b.y = SEABED + rand(0, 40); b.x = rand(W); } }
    this.chestSq = approach(this.chestSq, 0, dt * 2.5);
    this.chestGlow = approach(this.chestGlow, this.filled / this.target, dt * 1.5);
    if (this.shown < this.filled) this.shown = Math.min(this.filled, this.shown + dt * 30);
  }

  // ------------------------------------------------------------------ clams
  updateClams(dt) {
    for (const c of this.clams) {
      c.t -= dt; c.sq = approach(c.sq, 0, dt * 3); c.giggle = Math.max(0, c.giggle - dt); c.snapT = Math.max(0, c.snapT - dt);
      if (c.state === 'closed' && c.t <= 0) {
        c.state = 'opening'; c.t = 0.22;
        if (!c.pearl) c.pearl = { gold: chance(this.storm ? 0.3 : 0.14) };
        snd('mp-clam-open', 'pop', { vol: 0.35 });
      } else if (c.state === 'opening') {
        c.open = clamp(1 - c.t / 0.22, 0, 1);
        if (c.t <= 0) { c.state = 'open'; c.open = 1; c.t = this.storm ? rand(2.6, 3.4) : rand(1.9, 2.8); c.sq = 0.25; }
      } else if (c.state === 'open' && c.t <= 0) {
        c.state = 'closing'; c.t = 0.14; c.snapT = 0.3;
      } else if (c.state === 'closing') {
        c.open = clamp(c.t / 0.14, 0, 1);
        if (c.t <= 0) {
          c.state = 'closed'; c.open = 0; c.t = this.storm ? rand(0.8, 1.4) : rand(1.3, 2.4); c.sq = 0.4;
          snd('mp-clam-snap', 'flip', { vol: 0.45 });
          particles.burst(c.x, c.y - 30, { type: 'bubble', count: 4, colors: ['#ffffff', '#c8f4ff'], speed: [40, 120] });
        }
      }
    }
  }

  // ---------------------------------------------------------------- octopus
  updateOcto(dt) {
    const o = this.octo;
    o.wig = approach(o.wig, 0, dt * 2.5); o.sq = approach(o.sq, 0, dt * 3);
    o.cool = Math.max(0, o.cool - dt); o.giggleT = Math.max(0, o.giggleT - dt);
    if (o.awake > 0) {
      o.awake -= dt;
      o.throwT -= dt;
      if (o.left > 0 && o.throwT <= 0) {
        o.throwT = 0.07; o.left--;
        const ang = -Math.PI / 2 + rand(-1.25, 1.25);
        const sp = rand(520, 980);
        this.addPearl(o.x + Math.cos(ang) * 60, o.y - 120, { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, gold: chance(0.12), sink: true });
        if (o.left % 3 === 0) snd('mp-octo-throw', 'pop', { vol: 0.4, rate: rand(0.9, 1.2) });
      }
      if (o.awake <= 0) { o.cool = this.storm ? 2.5 : 5; o.tickles = 0; snd('mp-octo-yawn', 'snore', { vol: 0.5 }); }
    } else if (Math.floor(this.t * 0.6) !== Math.floor((this.t - dt) * 0.6)) {
      snd('mp-octo-snore', 'snore', { vol: 0.18 });
    }
  }

  tickle(e) {
    const o = this.octo;
    e.tickleCd = 0.18;
    o.wig = 1; o.sq = 0.3; o.giggleT = 0.5;
    e.a.playOnce(poseOr('giggle', 'laugh'), 0.4);
    particles.burst(o.x + rand(-80, 80), o.y - 140, { type: 'heart', count: 2, colors: ['#ff8fc7', '#ffc2e6'] });
    if (o.awake > 0) return;
    if (o.cool > 0) { snd('mp-octo-giggle', 'giggle', { vol: 0.4, rate: 1.2 }); return; }
    o.tickles++;
    snd('mp-tickle', 'giggle', { vol: 0.55, rate: 0.9 + o.tickles * 0.08 });
    if (!e.p.isAI) e.p.ctrl.rumble(0.2, 50);
    if (o.tickles >= o.need) this.wakeOcto(e);
  }

  wakeOcto(e) {
    const o = this.octo;
    o.awake = 2.4; o.left = 10 + this.n * 2 + (this.storm ? 6 : 0); o.throwT = 0.35; o.tickles = 0; o.sq = 0.6;
    snd('mp-octo-laugh', 'giggle'); sfx('magic');
    fx.shake(10, 0.35); fx.flash('#ffd6f2', 0.18);
    if (this.api.camera) this.api.camera.punch(o.x, o.y - 150, 1.12, 0.6);
    particles.burst(o.x, o.y - 160, { type: 'star', count: 18, colors: RAINBOW });
    particles.ring(o.x, o.y - 140, '#ffffff', 260, 0.5);
    particles.popText(o.x, o.y - 330, 'Hee hee!', '#ff8fc7', 72);
    for (const f of this.ents) { if (dist(f.x, f.y, o.x, o.y) < 600) { f.a.playOnce('cheer', 0.7); } }
    if (e) e.a.say(pick(['Yay!', 'Pearls!', 'Wow!']), 1.2, 'yay');
  }

  // ---------------------------------------------------- vents and events
  updateVents(dt) {
    for (const v of this.vents) {
      v.pulse = approach(v.pulse, 0, dt * 2);
      v.t -= dt;
      if (v.t <= 0) {
        v.t = this.storm ? rand(0.8, 1.2) : rand(1.6, 2.4);
        this.addPearl(v.x + rand(-30, 30), SEABED - 50, { vx: 0, vy: -rand(240, 300), bubble: true, gold: chance(0.15) });
        v.pulse = 1;
        snd('mp-vent', 'bubble', { vol: 0.35 });
      }
      if (Math.random() < dt * 22) particles.burst(v.x + rand(-40, 40), SEABED - 40, { type: 'bubble', count: 1, colors: ['#ffffff', '#d8faff'], speed: [20, 60], size: [8, 18] });
    }
  }

  updateEvents(dt) {
    // rainbow fish surprise: zooms across dropping pearls
    this.rfT -= dt;
    if (!this.rainbowFish && this.rfT <= 0 && !this.finale) {
      const dir = chance(0.5) ? 1 : -1;
      this.rainbowFish = { x: dir > 0 ? -200 : W + 200, y: rand(300, 640), dir, t: 0, drop: 0 };
      this.rfT = this.storm ? rand(6, 8) : rand(12, 16);
      snd('mp-rainbow-fish', 'sparkle-beam', { vol: 0.7 }); sfx('whoosh');
    }
    const rf = this.rainbowFish;
    if (rf) {
      rf.t += dt; rf.x += rf.dir * 620 * dt;
      rf.drop -= dt;
      if (rf.drop <= 0 && rf.x > 120 && rf.x < W - 120) { rf.drop = 0.14; this.addPearl(rf.x - rf.dir * 70, rf.y + Math.sin(rf.t * 5) * 30 + 20, { vx: -rf.dir * 60, vy: 40, gold: chance(0.2), sink: true }); }
      if (Math.random() < dt * 30) particles.burst(rf.x - rf.dir * 80, rf.y + Math.sin(rf.t * 5) * 30, { type: 'sparkle', count: 1, colors: RAINBOW, speed: [20, 70] });
      if (rf.x < -260 || rf.x > W + 260) this.rainbowFish = null;
    }
    // a little school of fish passing through (decoration)
    this.schoolT -= dt;
    if (!this.school && this.schoolT <= 0) { const dir = chance(0.5) ? 1 : -1; this.school = { x: dir > 0 ? -300 : W + 300, y: rand(260, 800), dir, col: randInt(0, 4) }; this.schoolT = rand(6, 10); }
    if (this.school) { this.school.x += this.school.dir * 300 * dt; if (this.school.x < -400 || this.school.x > W + 400) this.school = null; }
  }

  startStorm() {
    this.storm = true; this.stormT = 0;
    snd('mp-storm', 'fever'); sfx('magic');
    fx.flash('#c8f4ff', 0.3); fx.shake(8, 0.3);
    for (const c of this.clams) if (c.state === 'closed') c.t = Math.min(c.t, rand(0.1, 0.6));
    this.octo.cool = 0; this.octo.need = Math.max(3, this.octo.need - 2);
    this.rfT = 1.2;
    for (const e of this.ents) e.a.emote('sparkle', 1.5);
  }

  // ---------------------------------------------------------------- pearls
  addPearl(x, y, o = {}) {
    const pr = { x, y, vx: o.vx || 0, vy: o.vy || 0, gold: !!o.gold, t: 0, bubble: !!o.bubble, sink: !!o.sink, life: o.bubble ? 9 : 11, w: rand(TAU) };
    this.pearls.push(pr);
    return pr;
  }

  updatePearls(dt) {
    for (const pr of this.pearls) {
      pr.t += dt; pr.life -= dt;
      if (pr.bubble) {
        pr.x += Math.sin(pr.t * 3 + pr.w) * 40 * dt;
        pr.y += pr.vy * dt;
        if (pr.y < TOP + 10) { pr.bubble = false; pr.sink = true; pr.vy = 0; pr.vx = rand(-80, 80); particles.burst(pr.x, pr.y, { type: 'bubble', count: 5, colors: ['#ffffff'] }); snd('mp-bubble-pop', 'pop', { vol: 0.3 }); }
      } else {
        pr.vx *= Math.exp(-2.4 * dt); pr.vy *= Math.exp(-2.4 * dt);
        pr.vy += 110 * dt;            // gentle sink
        pr.vy = Math.min(pr.vy, 90);
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        pr.x = clamp(pr.x, LEFT, RIGHT);
        if (pr.y > SEABED - 45) { pr.y = SEABED - 45; pr.vy = 0; }   // rest within a swimmer's reach (FLOOR clamp)
        if (pr.y < TOP) { pr.y = TOP; pr.vy = Math.abs(pr.vy); }
      }
      if (pr.life <= 0) particles.burst(pr.x, pr.y, { type: 'sparkle', count: 3, colors: ['#ffffff', '#ffe6f4'] });
    }
    if (!this.finale) {
      for (const pr of this.pearls) {
        if (pr.life <= 0 || pr.got) continue;
        for (const e of this.ents) {
          const r = 70 * this.scale + (pr.bubble ? 30 : 18);
          if (dist(e.x, e.y - e.a.height * 0.45, pr.x, pr.y) < r) {
            pr.got = true;
            if (pr.bubble) { snd('mp-bubble-pop', 'pop', { vol: 0.5 }); particles.burst(pr.x, pr.y, { type: 'bubble', count: 6, colors: ['#ffffff', '#c8f4ff'] }); }
            this.collect(e, pr.x, pr.y, pr.gold);
            break;
          }
        }
      }
    }
    this.pearls = this.pearls.filter((pr) => pr.life > 0 && !pr.got);
  }

  /** A swimmer grabs a pearl: it flies to the chest. */
  collect(e, x, y, gold) {
    const v = gold ? 3 : 1;
    e.pearls += v;
    const a = e.a;
    this.fliers.push({ x0: x, y0: y, t: 0, dur: rand(0.6, 0.85), gold, v, by: e, cx: lerp(x, CHEST.x, 0.5) + rand(-100, 100), cy: Math.min(y, CHEST.y) - rand(160, 300) });
    if (gold) {
      snd('mp-gold', 'golden-chime'); sfx('sparkle');
      particles.burst(x, y, { type: 'star', count: 12, colors: ['#ffd23f', '#fff6a8', '#ffffff'] });
      fx.flash('#fff3b0', 0.08);
      this.pop(e, '+3', '#ffd23f', 60);
      a.emote('sparkle', 1); if (chance(0.35)) voice(e.p.charId, 'yay');   // voices stay rare
    } else {
      snd('mp-pearl', 'collect', { step: Math.min(e.pearls % 13, 12) });
      particles.burst(x, y, { type: 'sparkle', count: 5, colors: ['#ffffff', '#ffd6ef', '#c8f4ff'] });
      this.pop(e, '+1', '#ffffff', 42);
    }
    a.playOnce('cheer', 0.35); a.squash(0.2);
    if (!e.p.isAI) e.p.ctrl.rumble(0.2, 50);
    // a new fishy friend joins the conga line every 4 pearls
    const want = Math.min(6, Math.floor(e.pearls / 4));
    while (e.fish.length < want) {
      e.fish.push({ x: e.x + rand(-80, 80), y: e.y + rand(-40, 40), col: randInt(0, FISH_COLS.length - 1), face: 1, w: rand(TAU) });
      particles.burst(e.x, e.y - 60, { type: 'heart', count: 3, colors: ['#ff8fc7'] });
      if (e.fish.length === 1 || e.fish.length % 3 === 0) snd('mp-fish-join', 'tiny-squeak', { vol: 0.4 });
    }
  }

  updateFliers(dt) {
    for (const f of this.fliers) {
      f.t += dt;
      if (f.t >= f.dur && !f.done) {
        f.done = true;
        this.filled += f.v;
        this.chestSq = Math.min(0.5, this.chestSq + 0.15);
        snd('mp-chest-plink', 'coin', { vol: 0.35, rate: rand(0.95, 1.15) });
        particles.burst(CHEST.x, CHEST.y - 120, { type: 'sparkle', count: f.gold ? 8 : 3, colors: f.gold ? ['#ffd23f', '#ffffff'] : ['#ffffff', '#ffd6ef'] });
        this.checkMilestone();
      }
    }
    this.fliers = this.fliers.filter((f) => !f.done);
  }

  checkMilestone() {
    const k = Math.floor((this.filled / this.target) * 4);
    if (k > this.mile && k < 4) {
      this.mile = k;
      snd('mp-milestone', 'fanfare', { vol: 0.6 }); sfx('sparkle');
      particles.burst(CHEST.x, CHEST.y - 140, { type: 'star', count: 16, colors: RAINBOW });
      particles.ring(CHEST.x, CHEST.y - 120, '#fff6a8', 220, 0.5);
      particles.popText(CHEST.x - 40, CHEST.y - 300, ['', 'Sparkly!', 'Wow!', 'Almost!'][k], '#ffd23f', 64);
      fx.shake(6, 0.2);
      for (const e of this.ents) if (!e.a._once) e.a.playOnce('cheer', 0.6);
    }
  }

  // ----------------------------------------------------------------- swimmers
  /** Zoom (A, or B as a plain dash) toward (dx, dy), or the way she faces. */
  zoomOff(e, dx, dy) {
    const a = e.a, p = e.p;
    if (Math.hypot(dx, dy) < 0.2) { dx = a.facing; dy = 0; }
    const dd = Math.hypot(dx, dy);
    e.vx = dx / dd * ZOOM; e.vy = dy / dd * ZOOM;
    e.zoom = ZOOM_T; e.zoomCd = ZOOM_CD;
    snd('mp-zoom', 'whoosh', { vol: 0.5 });
    particles.burst(e.x - dx / dd * 50, e.y - a.height * 0.4, { type: 'bubble', count: 8, colors: ['#ffffff', '#c8f4ff'], speed: [80, 220] });
    a.squash(-0.25);
    if (!p.isAI) p.ctrl.rumble(0.25, 60);
  }

  swim(e, dt) {
    const a = e.a, p = e.p, s = this.scale;
    e.zoom = Math.max(0, e.zoom - dt); e.zoomCd = Math.max(0, e.zoomCd - dt);
    e.popT = Math.max(0, e.popT - dt); e.boing = Math.max(0, e.boing - dt); e.tickleCd = Math.max(0, e.tickleCd - dt);
    e.spin = Math.max(0, e.spin - dt);
    const live = !this.finale && !this.done;
    let ix = live ? (e.auto ? e.auto.ix : p.ctrl.x) : 0, iy = live ? (e.auto ? e.auto.iy : p.ctrl.y) : 0;
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    if (this.finale) {
      // everyone swims over to admire the chest
      const k = e.i - (this.n - 1) / 2;
      const tx = CHEST.x - 380 + k * 70 * (this.n > 4 ? 0.9 : 1.4), ty = 560 + (e.i % 2) * 120;
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      if (d > 20) { ix = dx / d * Math.min(1, d / 200); iy = dy / d * Math.min(1, d / 200); }
    }
    // A: zoom (and tickle if next to the octopus)
    if (live && p.ctrl.pressed('a')) {
      const o = this.octo;
      const byOcto = dist(e.x, e.y, o.x, o.y - 90) < 260;
      if (byOcto && e.tickleCd <= 0) this.tickle(e);
      if (byOcto && o.awake <= 0) { /* tickling the sleepy octopus: don't zoom away from it */ }
      else if (e.zoomCd <= 0) {
        let dx = ix, dy = iy;
        // Molly Easy: zoom straight at the target when it's in reach, or on an A pressed again and
        // again with no steering (easyThink / easyAutoOk); otherwise like Medium (stick / facing)
        if (e.auto && !e.auto.pushing && (e.auto.near || e.auto.goT > 0)) { dx = e.auto.dx; dy = e.auto.dy; }
        this.zoomOff(e, dx, dy);
      }
    } else if (live && !p.isAI && p.ctrl.pressed('b') && e.zoomCd <= 0) this.zoomOff(e, p.ctrl.x, p.ctrl.y);   // B: the same zoom (a dash), the way the stick points or you face - never aimed for you
    const max = SWIM * (this.storm ? 1.08 : 1) * (p.isAI ? [0.72, 0.8, 0.86][clamp(p.aiLevel ?? 0, 0, 2)] : e.auto ? (e.auto.manual ? 0.85 : 0.42) : 1);
    if (e.zoom <= 0) {
      const ax = ix * max, ay = iy * max;
      const acc = 2600;
      e.vx = approach(e.vx, ax, acc * dt * (Math.abs(ax) > Math.abs(e.vx) ? 1 : 0.6));
      e.vy = approach(e.vy, ay, acc * dt * (Math.abs(ay) > Math.abs(e.vy) ? 1 : 0.6));
    } else {
      e.vx *= Math.exp(-2 * dt); e.vy *= Math.exp(-2 * dt);
      if (Math.random() < dt * 40) particles.burst(e.x, e.y - a.height * 0.4, { type: 'bubble', count: 1, colors: ['#ffffff'], speed: [10, 50], size: [8, 16] });
    }
    // bubble currents lift you up
    e.current = 0;
    if (!this.done) for (const v of this.vents) {
      if (Math.abs(e.x - v.x) < 80 && e.y > TOP + 40) {
        e.current = 1;
        e.vy = approach(e.vy, -950, 3600 * dt);
        e.vx += (v.x - e.x) * 2 * dt;
        if (!e.inCurrent) {
          e.inCurrent = true; e.spin = 0.8;
          snd('mp-current', 'whoosh', { vol: 0.6 }); sfx('bubble', { vol: 0.5 });
          if (live && chance(0.6)) e.a.say(pick(['Wheee!', 'Woo!']), 0.9, 'woo');
        }
        if (Math.random() < dt * 30) particles.burst(e.x + rand(-30, 30), e.y - a.height * 0.2, { type: 'bubble', count: 1, colors: ['#ffffff', '#d8faff'], speed: [30, 90] });
      }
    }
    if (!e.current) e.inCurrent = false;
    e.x += e.vx * dt; e.y += e.vy * dt;
    const minY = TOP + a.height * 0.75;
    if (e.x < LEFT) { e.x = LEFT; e.vx = Math.abs(e.vx) * 0.4; }
    if (e.x > RIGHT) { e.x = RIGHT; e.vx = -Math.abs(e.vx) * 0.4; }
    if (e.y < minY) { e.y = minY; e.vy = Math.abs(e.vy) * 0.3; if (e.current) { e.vx += (chance(0.5) ? 1 : -1) * 300; } }
    if (e.y > FLOOR) { e.y = FLOOR; e.vy = -Math.abs(e.vy) * 0.3; }
    // clams
    if (live) this.touchClams(e);
    // anim
    const sp = Math.hypot(e.vx, e.vy);
    if (Math.abs(e.vx) > 30) a.facing = e.vx > 0 ? 1 : -1;
    a.speed = clamp(sp / SWIM, 0, 1);
    if (!a._once) {
      if (this.done || (this.finale && sp < 60)) a.setPose(this.finale ? 'celebrate' : 'idle');
      else if (e.zoom > 0) a.setPose(poseOr('dash', 'run'));
      else if (sp > 60) a.setPose(poseOr('swim', 'walk'));
      else a.setPose(poseOr('float', 'idle'));
    }
    a.x = e.x; a.y = e.y + Math.sin(this.t * 2.2 + e.i) * 6;
    a.update(dt);
    // trail history for fish followers
    e.hist.push({ x: e.x, y: e.y - a.height * 0.45 });
    if (e.hist.length > 240) e.hist.shift();
    e.fish.forEach((f, k) => {
      const h = e.hist[Math.max(0, e.hist.length - 1 - (k + 1) * 9)];
      const tx = h.x - a.facing * 20, ty = h.y + Math.sin(this.t * 4 + f.w) * 14;
      const ox = f.x;
      f.x = lerp(f.x, tx, Math.min(1, dt * 7)); f.y = lerp(f.y, ty, Math.min(1, dt * 7));
      if (Math.abs(f.x - ox) > 0.4) f.face = f.x > ox ? 1 : -1;
    });
    e.bub -= dt;
    if (e.bub <= 0) { e.bub = rand(0.4, 0.9); particles.burst(e.x + a.facing * 20, e.y - a.height * 0.85, { type: 'bubble', count: 1, colors: ['#ffffff'], speed: [10, 40], size: [6, 12] }); }
  }

  touchClams(e) {
    const s = this.scale;
    for (const c of this.clams) {
      const d = dist(e.x, e.y - e.a.height * 0.35, c.x, c.y - 40);
      if (d > 95 + 40 * s) continue;
      if ((c.state === 'open' || c.state === 'opening') && c.pearl) {
        const gold = c.pearl.gold; c.pearl = null; c.sq = 0.35;
        snd('mp-clam-happy', 'pop', { vol: 0.5 });
        this.collect(e, c.x, c.y - 50, gold);
      } else if (c.state === 'closing' && c.snapT > 0 && e.boing <= 0) {
        // chomp! a cartoon boing away, no penalty
        e.boing = 1;
        const dx = e.x - c.x || 1, dy = -1.4;
        const dd = Math.hypot(dx, dy * 60);
        e.vx = dx / dd * 700; e.vy = -820; e.zoom = 0.25;
        c.giggle = 1; c.sq = 0.5;
        snd('mp-chomp', 'boing'); voice(e.p.charId, 'laugh');
        e.a.playOnce('surprised', 0.5); e.a.squash(0.35);
        particles.burst(c.x, c.y - 50, { type: 'bubble', count: 10, colors: ['#ffffff', '#c8f4ff'], speed: [120, 300] });
        this.pop(e, 'Chomp!', '#ff8fc7', 48);
      } else if (c.state === 'closed' && c.giggle <= 0) {
        c.giggle = 0.9; c.sq = 0.3;
        snd('mp-clam-giggle', 'giggle', { vol: 0.3, rate: 1.4 });
      }
    }
  }

  pushApart(dt) {
    // swimmers may brush past each other in the water: a little under the sprite's half-width
    spread(this.ents, { radius: (e) => bodyRadius(e.a, 34, 0.32), yScale: 1.3, strength: Math.min(1, dt * 12) });
  }

  pop(e, str, color, size) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.6;
    const lvl = e.popN % 3;
    particles.popText(e.x + (lvl === 1 ? 40 : lvl === 2 ? -40 : 0), e.y - e.a.height - 20 - lvl * 44, str, color, size);
  }

  // ------------------------------------------------------------- Molly Easy
  /** Easy: pick the best pearl / open clam / the octopus; A zooms straight at it when in reach
   * (`near`: the big A shows). Nobody swims her otherwise, except for a moment after each A
   * pressed again and again with no steering (easyAutoOk): then she drifts toward it too. */
  easyThink(e, dt) {
    const au = e.auto;
    const ey = e.y - e.a.height * 0.4;
    // the stick swims while it's pushed (a little gentler than Medium); the target keeps
    // following the nearest thing from here, so letting go carries on from where you are
    const st = easySteer(e, e.p.ctrl, dt);
    au.manual = st.manual; au.pushing = st.pushing;
    if (st.pushing) { au.t = Math.min(au.t, 0.25); au.goT = 0; }
    if (e.p.ctrl.pressed('a') && easyAutoOk(e)) au.goT = 3;
    au.goT = Math.max(0, (au.goT || 0) - dt);
    au.t -= dt;
    const tg = au.target;
    const gone = !tg || (tg.kind === 'pearl' && (tg.ref.got || tg.ref.life <= 0)) || (tg.kind === 'clam' && !tg.ref.pearl)
      || (tg.kind === 'octo' && (this.octo.awake > 0 || this.octo.cool > 0));
    if (gone || au.t <= 0) {
      au.t = 0.7;
      let best = null;
      const consider = (c) => {
        // spread out: someone else closer or already heading there
        for (const f of this.ents) if (f !== e && ((f.auto && f.auto.target && f.auto.target.ref === c.ref) || dist(f.x, f.y, c.x, c.y) < dist(e.x, e.y, c.x, c.y) * 0.6)) c.u *= 0.45;
        if (tg && c.ref === tg.ref) c.u *= 1.4;   // keep going where we were going
        if (!best || c.u > best.u) best = c;
      };
      for (const c of this.clams) {
        if (!c.pearl && c.state !== 'closed') continue;
        const soon = c.state === 'open' || c.state === 'opening' ? 0 : c.t;
        consider({ ref: c, kind: 'clam', x: c.x, y: c.y - 50, u: (c.pearl?.gold ? 2 : 1) / (0.4 + dist(e.x, ey, c.x, c.y - 50) / 500 + soon * 0.5) });
      }
      for (const pr of this.pearls) consider({ ref: pr, kind: 'pearl', x: pr.x, y: pr.y, u: (pr.gold ? 2.5 : 1.3) / (0.4 + dist(e.x, ey, pr.x, pr.y) / 500) });
      const o = this.octo;
      if (o.awake <= 0 && o.cool <= 0) consider({ ref: o, kind: 'octo', x: o.x + (e.x < o.x ? -150 : 150), y: o.y - 140, u: (0.9 + o.tickles * 0.5) / (0.5 + dist(e.x, ey, o.x, o.y) / 600) });
      au.target = best;
    }
    const t = au.target;
    au.ix = 0; au.iy = 0; au.near = false;
    if (!t) { if (st.manual) { au.ix = st.x; au.iy = st.y; } return; }
    if (t.kind === 'pearl') { t.x = t.ref.x; t.y = t.ref.y; }
    const dx = t.x - e.x, dy = t.y - ey, d = Math.hypot(dx, dy) || 1;
    au.dx = dx / d; au.dy = dy / d;
    if (d > 30 && au.goT > 0) { const k = clamp(d / 120, 0, 1); au.ix = au.dx * k; au.iy = au.dy * k; }
    const o = this.octo;
    if (t.kind === 'octo') au.near = dist(e.x, e.y, o.x, o.y - 90) < 260 && e.tickleCd <= 0;
    else if (t.kind === 'clam') au.near = (t.ref.state === 'open' || t.ref.state === 'opening') && d < 330 && e.zoomCd <= 0;   // a zoom travels ~370 px
    else au.near = d < 330 && e.zoomCd <= 0;
    if (t.kind !== 'octo' && o.awake <= 0 && dist(e.x, e.y, o.x, o.y - 90) < 260) au.near = false;   // A tickles here, it won't zoom
    if (st.pushing && t.kind !== 'octo') au.near = false;   // steering: A zooms where the stick points
    if (st.manual) { au.ix = st.x; au.iy = st.y; }
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl;
    if (e.brain.ready(dt)) {
      e.brain.wait(rand(...prof.reaction) + 0.15);
      const cands = [];
      const ey = e.y - e.a.height * 0.4;
      for (const c of this.clams) {
        if (!c.pearl && c.state !== 'closed') continue;
        const soon = c.state === 'open' || c.state === 'opening' ? 0 : c.t;
        const d = dist(e.x, ey, c.x, c.y - 50);
        if (c.state === 'open' && c.t < d / SWIM * 0.8) continue;
        cands.push({ x: c.x, y: c.y - 30, u: (c.pearl?.gold ? 2.2 : 1) / (0.4 + d / 500 + soon * 0.8), kind: 'clam' });
      }
      for (const pr of this.pearls) cands.push({ x: pr.x, y: pr.y + (pr.bubble ? -60 : 0), u: (pr.gold ? 2.5 : 1.2) / (0.4 + dist(e.x, ey, pr.x, pr.y) / 500), kind: 'pearl' });
      const o = this.octo;
      if (o.awake <= 0 && o.cool <= 0) cands.push({ x: o.x + (e.x < o.x ? -150 : 150), y: o.y - 120, u: (1.0 + o.tickles * 0.4) / (0.5 + dist(e.x, ey, o.x, o.y) / 600), kind: 'octo' });
      // spread out: avoid targets another swimmer is closer to
      for (const c of cands) for (const f of this.ents) if (f !== e && dist(f.x, f.y, c.x, c.y) < dist(e.x, e.y, c.x, c.y) * 0.6) c.u *= 0.5;
      let best = null;
      for (const c of cands) { c.u *= rand(0.8, 1.2); if (!best || c.u > best.u) best = c; }
      if (!best || chance(prof.mistake * 1.4)) { e.target = { x: rand(LEFT + 100, RIGHT - 100), y: rand(TOP + 150, FLOOR - 40), kind: 'wander' }; }
      else e.target = best;
      e.err = { x: rand(-1, 1) * prof.aimError * 60, y: rand(-1, 1) * prof.aimError * 60 };
    }
    const t = e.target;
    if (!t) { ctrl.move(0, 0); return; }
    const tx = t.x + e.err.x, ty = t.y + e.err.y + e.a.height * 0.4;
    const d = steer(p, e.x, e.y, tx, ty, { arrive: 70 });
    if (t.kind === 'octo' && d < 160) { ctrl.move(0, 0); if (chance(dt * prof.mashRate * 0.45)) ctrl.press('a'); }
    else if (d > 420 && e.zoomCd <= 0 && chance(dt * (0.4 + (p.aiLevel ?? 0) * 0.3))) ctrl.press('a');
  }

  // ------------------------------------------------------------------ finale
  startFinale() {
    this.finale = 0.0001;
    this.full = this.filled >= this.target;
    snd('mp-chest-open', 'td-chest-open'); sfx('fanfare');
    fx.flash('#ffffff', 0.35); fx.shake(12, 0.4); fx.slowmo && fx.slowmo(0.6, 0.6);
    if (this.api.camera) this.api.camera.punch(CHEST.x, CHEST.y - 150, 1.18, 1.2);
    particles.confettiRain(W, 140);
    for (const e of this.ents) { e.a._once = null; e.a.say(pick(['Treasure!', 'Yay!', 'Sparkly!']), 1.8, 'yay'); }
    for (const pr of this.pearls) { this.fliers.push({ x0: pr.x, y0: pr.y, t: 0, dur: rand(0.4, 0.9), gold: pr.gold, v: 0, by: null, cx: lerp(pr.x, CHEST.x, 0.5), cy: Math.min(pr.y, CHEST.y) - 200 }); }
    this.pearls = [];
  }

  /** Where the chest stands: on the gallery ending it rises up out of the A/Y hints' way. */
  chestAt() {
    const k = ease.outCubic(clamp((this.endT || 0) / 0.6, 0, 1));
    return { x: lerp(CHEST.x, CHEST_SHOW.x, k), y: lerp(CHEST.y, CHEST_SHOW.y, k), s: lerp(1, CHEST_SHOW.s, k) };
  }

  updateFinale(dt) {
    if (!this.finale) return;
    if (Math.random() < dt * 26) {
      const ang = -Math.PI / 2 + rand(-0.8, 0.8), c = this.chestAt();
      particles.burst(c.x + rand(-60, 60) * c.s, c.y - 150 * c.s, { type: chance(0.5) ? 'star' : 'sparkle', count: 2, colors: RAINBOW, speed: [200, 520] });
      void ang;
    }
  }

  finish() {
    this.done = true;
    this.ents.forEach((e) => { e.a._once = null; e.a.setPose('celebrate'); e.a.emote('heart', 2); });
    this.api.finishTogether({
      title: this.full ? 'Treasure chest full!' : 'What a treasure!',
      stats: this.ents.map((e) => `${e.pearls} pearls`),
      focus: { x: CHEST.x - 200, y: CHEST.y - 220 },
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    this.drawBackground(g);
    this.drawCurrents(g);
    for (const [x, y] of this.ledges) this.drawLedge(g, x, y);
    this.drawOcto(g);
    this.drawChest(g);
    for (const c of this.clams) this.drawClamAt(g, c);
    if (this.school) this.drawSchool(g);
    for (const pr of this.pearls) this.drawLoosePearl(g, pr);
    const order = this.ents.slice().sort((a, b) => a.y - b.y);
    for (const e of order) for (const f of e.fish) drawFishArt(g, f.x, f.y, 0.62 * this.scale / 0.85, f.col, f.face, this.t + f.w);
    for (const e of order) {
      if (e.spin > 0) { // a happy spin in the current
        g.save(); g.translate(e.x, e.y - e.a.height * 0.5); g.rotate(ease.outCubic ? ease.outCubic(1 - e.spin / 0.8) * TAU * e.a.facing : (1 - e.spin / 0.8) * TAU); g.translate(-e.x, -(e.y - e.a.height * 0.5));
        e.a.draw(g, { ring: e.p.color, shadow: false, emotes: false }); g.restore();
      } else e.a.draw(g, { ring: e.p.color, shadow: false });
    }
    if (this.rainbowFish) this.drawRainbowFish(g, this.rainbowFish);
    for (const f of this.fliers) this.drawFlier(g, f);
    if (!this.api.ended?.()) for (const e of order) ui.playerTag(g, e.p, e.x, e.a.y - e.a.height - 22 - (e.a.emotes.length ? 50 : 0));
    if (this.easy && !this.finale && !this.done) this.drawEasyHints(g);
  }

  /** Molly Easy: a ring on where you're swimming, and a big A when a zoom would grab it. */
  drawEasyHints(g) {
    const t = this.t;
    for (const e of this.ents) {
      const au = e.auto;
      if (!au || !au.target) continue;
      const tg = au.target, pulse = 0.5 + 0.5 * Math.sin(t * 10 + e.i);
      g.save();
      g.strokeStyle = au.near ? '#ffd23f' : e.p.color; g.lineWidth = au.near ? 8 : 6; g.globalAlpha = au.near ? 0.7 + 0.3 * pulse : 0.6;
      g.beginPath(); g.arc(tg.x, tg.y, (tg.kind === 'octo' ? 90 : 56) + pulse * 8, 0, TAU); g.stroke();
      g.restore();
      if (au.near) {
        const o = this.octo, target = tg.kind === 'octo' ? { x: o.x, y: o.y - 150 } : tg;
        easyPrompt(g, e.p, { target, child: { x: e.x, y: e.a.y - e.a.height } });
      }
    }
  }

  drawHUD(g) {
    // the gallery ending has its own ribbon and stars bar; the full chest in the scene is the show
    if (this.api.ended?.()) return;
    // (the swim clock is api.limit's, drawn by the play scene)
    ui.scoreboard(g, this.players, this.ents.map((e) => e.pearls), { y: 22, avoidCenter: true, format: (v) => String(v) });
    // shared chest meter
    const w = 640, x = W / 2 - w / 2, y = 124;
    const frac = clamp(this.shown / this.target, 0, 1);
    g.save();
    ui.panel(g, x - 70, y - 12, w + 150, 64, { r: 32, fill: 'rgba(255,255,255,0.92)', stroke: NAVY, lineWidth: 4 });
    g.save(); g.translate(x - 32, y + 20); g.scale(0.32, 0.32); drawChestShape(g, 0, 60, 1, 0, 0.3, this.t); g.restore();
    ui.bar(g, x, y, w, 40, frac, '#ffd23f', { bg: 'rgba(36,22,63,0.15)' });
    // pearls in the bar
    g.save(); ui.roundRect(g, x, y, Math.max(40, w * frac), 40, 20); g.clip();
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
    g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(x, y, w, 40); g.globalAlpha = 1;
    for (let k = 0; k < 30; k++) { const px = x + 14 + k * 22; if (px > x + w * frac - 10) break; g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(px, y + 20 + Math.sin(this.t * 4 + k) * 4, 7, 0, TAU); g.fill(); }
    g.restore();
    ui.bar(g, x, y, w, 40, 0, '#0000', { bg: 'rgba(0,0,0,0)' });
    ui.text(g, `${Math.floor(this.shown)}`, x + w + 40, y + 20, { size: 36, color: '#ffd23f' });
    g.restore();
    if (this.storm && !this.finale) {
      this.stormT += 1 / 60;
      const pulse = 1 + Math.sin(this.t * 8) * 0.05;
      g.save(); g.translate(W / 2, 214); g.scale(pulse, pulse);
      ui.text(g, 'PEARL STORM!', 0, 0, { size: 40, color: '#7fe6ff', weight: 800 });
      g.restore();
    }
    if (this.finale && !this.done) {
      g.save(); g.globalAlpha = clamp(this.finale * 3, 0, 1) * clamp((FINALE_T - this.finale) * 3, 0, 1);
      ui.banner(g, this.full ? 'Treasure!' : 'Pearly!', this.finale, { y: 470, size: 160, color: '#ffd23f' });
      g.restore();
    }
  }

  // ------------------------------------------------------------------ scenery
  drawBackground(g) {
    const bg = art('bg/mermaid-pearls');
    if (bg) { g.drawImage(bg, 0, 0, W, H); this.drawWaterFx(g); return; }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#8ff0f4'); gr.addColorStop(0.45, '#3fbfe0'); gr.addColorStop(1, '#2477c4');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // surface shimmer
    g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = 6;
    for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = 0; x <= W; x += 30) g.lineTo(x, 26 + k * 18 + Math.sin(x * 0.012 + this.t * 2 + k) * 7); g.stroke(); }
    g.restore();
    // light rays
    g.save();
    for (let i = 0; i < 7; i++) {
      const x = 150 + i * 280 + Math.sin(this.t * 0.4 + i) * 40;
      g.globalAlpha = 0.08 + 0.05 * Math.sin(this.t * 0.8 + i * 1.7);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 110, 0); g.lineTo(x - 80, H * 0.9); g.lineTo(x - 260, H * 0.9); g.closePath(); g.fill();
    }
    g.restore();
    // far reef silhouettes
    g.fillStyle = 'rgba(30,90,160,0.35)';
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, 790 + Math.sin(x * 0.006) * 50 + Math.sin(x * 0.019) * 24);
    g.lineTo(W, H); g.fill();
    // coral and kelp along the edges
    this.drawKelp(g, 60, 0.9, '#3fb87a'); this.drawKelp(g, 150, 0.7, '#5ad18f'); this.drawKelp(g, W - 70, 1, '#3fb87a'); this.drawKelp(g, W - 170, 0.75, '#5ad18f');
    this.drawKelp(g, 640, 0.5, '#4cc486'); this.drawKelp(g, 1120, 0.55, '#4cc486');
    drawCoral(g, 230, SEABED + 4, 1, '#ff8fc7'); drawCoral(g, 1810, SEABED + 4, 1.1, '#c9a0ff'); drawCoral(g, 1060, SEABED + 8, 0.7, '#ff9f6f'); drawCoral(g, 640, SEABED + 8, 0.6, '#ffb3d9');
    // seabed
    g.fillStyle = '#f7dca6';
    g.beginPath(); g.moveTo(0, H); g.lineTo(0, SEABED - 6);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, SEABED - 6 + Math.sin(x * 0.01) * 10);
    g.lineTo(W, H); g.fill();
    g.fillStyle = '#ffe9be'; g.fillRect(0, SEABED + 30, W, H);
    // shells and starfish
    for (let i = 0; i < 12; i++) {
      const x = 70 + i * 162 + (i % 3) * 20, y = SEABED + 50 + (i % 2) * 40;
      if (i % 3 === 0) drawStarfish(g, x, y, 0.8, i % 2 ? '#ff9f6f' : '#ff8fc7');
      else { g.fillStyle = i % 2 ? '#ffd6ef' : '#fff4e0'; g.beginPath(); g.arc(x, y, 12, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 2; g.stroke(); }
    }
    this.drawWaterFx(g);
  }

  drawWaterFx(g) {
    g.save();
    for (const b of this.bubbles) { g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.stroke(); }
    g.restore();
    if (this.storm && !this.finale) { g.save(); g.globalAlpha = 0.07 + 0.04 * Math.sin(this.t * 6); g.fillStyle = '#c8f4ff'; g.fillRect(0, 0, W, H); g.restore(); }
  }

  drawKelp(g, x, s, color) {
    g.save(); g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = 18 * s;
    for (let k = 0; k < 2; k++) {
      g.beginPath(); g.moveTo(x + k * 26 * s, SEABED + 10);
      for (let i = 1; i <= 10; i++) g.lineTo(x + k * 26 * s + Math.sin(this.t * 1.3 + i * 0.6 + k) * 18 * s * (i / 10) * 2, SEABED + 10 - i * 52 * s);
      g.stroke();
    }
    g.restore();
  }

  drawLedge(g, x, y) {
    g.save(); g.translate(x, y);
    // art: 300x110 shelf, bottom-centre anchor; its flat top (y ~4 here) holds the clam
    if (drawArt(g, 'prop/mp-ledge', 0, 72, 270, 99, { anchor: 'bottom' })) { g.restore(); return; }
    g.fillStyle = '#7a86b8'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-130, 4); g.quadraticCurveTo(-120, 52, -40, 60); g.quadraticCurveTo(40, 72, 110, 44); g.quadraticCurveTo(140, 20, 130, 4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#95a2d4'; g.beginPath(); g.ellipse(0, 4, 132, 16, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#5ad18f'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * 42, -2, 10, Math.PI, 0); g.fill(); }
    g.restore();
  }

  drawCurrents(g) {
    for (const v of this.vents) {
      g.save();
      const gr = g.createLinearGradient(0, TOP, 0, SEABED);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(220,250,255,${0.28 + v.pulse * 0.15})`);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(v.x - 70, SEABED); g.lineTo(v.x - 90, TOP); g.lineTo(v.x + 90, TOP); g.lineTo(v.x + 70, SEABED); g.closePath(); g.fill();
      // rising fizz
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.5;
      for (let k = 0; k < 14; k++) {
        const ph = ((this.t * 0.9 + k * 0.071) % 1);
        const by = SEABED - 40 - ph * (SEABED - TOP - 40);
        const bx = v.x + Math.sin(this.t * 3 + k * 2.1) * 50;
        g.globalAlpha = 0.8 * (1 - ph * 0.6);
        g.beginPath(); g.arc(bx, by, 5 + (k % 4) * 3, 0, TAU); g.stroke();
      }
      // up chevrons
      g.globalAlpha = 0.5; g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const ph = ((this.t * 0.7 + k / 3) % 1);
        const cy = SEABED - 120 - ph * 520;
        g.globalAlpha = 0.45 * Math.sin(ph * Math.PI);
        g.beginPath(); g.moveTo(v.x - 26, cy + 16); g.lineTo(v.x, cy - 6); g.lineTo(v.x + 26, cy + 16); g.stroke();
      }
      g.restore();
      if (!drawArt(g, 'prop/mp-vent', v.x, SEABED + 14, 200, 100, { anchor: 'bottom' })) drawVent(g, v.x, SEABED + 14, v.pulse);
    }
  }

  drawClamAt(g, c) {
    const s = 1;
    g.save(); g.translate(c.x, c.y);
    const sq = c.sq, gig = c.giggle > 0 ? Math.sin(this.t * 30) * 0.06 : 0;
    g.rotate(gig); g.scale(1 + sq * 0.3, 1 - sq * 0.3);
    const openArt = c.open > 0.5;
    const drew = drawArt(g, openArt ? 'prop/mp-clam-open' : 'prop/mp-clam-closed', 0, 0, 170, openArt ? 149 : 106, { anchor: 'bottom' });
    if (drew) {
      if (openArt && c.pearl) {
        // the pearl rests in the bottom shell: its lower part tucks behind the front lip
        drawPearlArt(g, 0, -50, c.pearl.gold ? 26 : 22, c.pearl.gold, this.t);
        const k = Math.min(170 / 256, 149 / 224);   // art scale (bottom-centre anchored)
        g.save(); g.beginPath();
        CLAM_LIP.forEach(([ax, ay], i) => { const px = (ax - 128) * k, py = -224 * k + ay * k; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
        g.lineTo(90, 4); g.lineTo(-90, 4); g.closePath(); g.clip();
        drawArt(g, 'prop/mp-clam-open', 0, 0, 170, 149, { anchor: 'bottom' });
        g.restore();
      }
    } else {
      drawClam(g, 0, 0, s, c.open, this.t, c.pearl, c.giggle > 0);
    }
    g.restore();
    // "about to open" shimmer hint
    if (c.state === 'closed' && c.t < 0.6) { g.save(); g.globalAlpha = 0.6 * (1 - c.t / 0.6); g.translate(c.x, c.y - 70); drawSparkleShape(g, 30, '#ffffff'); g.restore(); }
  }

  drawLoosePearl(g, pr) {
    const a = pr.life < 1.5 ? (Math.floor(pr.t * 12) % 2 ? 0.4 : 1) : 1;
    g.save(); g.globalAlpha = a;
    if (pr.bubble) {
      g.fillStyle = 'rgba(220,250,255,0.25)'; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
      g.beginPath(); g.arc(pr.x, pr.y, 38, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(pr.x - 14, pr.y - 16, 8, 4, -0.6, 0, TAU); g.fill();
    }
    drawPearlArt(g, pr.x, pr.y + Math.sin(pr.t * 3 + pr.w) * 3, pr.gold ? 26 : 21, pr.gold, this.t + pr.w);
    g.restore();
  }

  drawFlier(g, f) {
    const k = clamp(f.t / f.dur, 0, 1), e = ease.inOutQuad ? ease.inOutQuad(k) : k;
    // it drops into the glowing seam between the chest's lid and body (prop/mp-chest art
    // y 187 of 320, drawn at 0.65 => 86 px above the chest's base) and slips in behind the body
    const c = this.chestAt(), seam = c.y - 86 * c.s;
    const ex = c.x, ey = seam + 18 * c.s;
    const x = (1 - e) * (1 - e) * f.x0 + 2 * (1 - e) * e * f.cx + e * e * ex;
    const y = (1 - e) * (1 - e) * f.y0 + 2 * (1 - e) * e * f.cy + e * e * ey;
    if (Math.random() < 0.5 && y < seam) particles.burst(x, y, { type: 'sparkle', count: 1, colors: f.gold ? ['#ffd23f', '#fff6a8'] : ['#ffffff', '#ffd6ef'], speed: [5, 30], size: [8, 14] });
    g.save();
    if (art('prop/mp-chest')) { g.beginPath(); g.rect(0, 0, W, H); g.rect(c.x - 125 * c.s, seam, 250 * c.s, 90 * c.s); g.clip('evenodd'); }
    drawPearlArt(g, x, y, (f.gold ? 24 : 18) * (1 - k * 0.3), f.gold, this.t);
    g.restore();
  }

  drawOcto(g) {
    const o = this.octo;
    g.save(); g.translate(o.x, o.y);
    const br = o.awake > 0 ? 0 : Math.sin(this.t * 1.6) * 0.03;
    const sq = o.sq + (o.giggleT > 0 ? Math.sin(this.t * 40) * 0.04 : 0);
    g.scale(1 + sq * 0.25 + br, 1 - sq * 0.25 - br);
    if (o.wig > 0) g.rotate(Math.sin(this.t * 35) * 0.05 * o.wig);
    const awake = o.awake > 0;
    if (!drawArt(g, awake ? 'prop/mp-octopus-awake' : 'prop/mp-octopus', 0, 0, 290, 256, { anchor: 'bottom' })) drawOctopus(g, 0, 0, 0.82, this.t, awake);
    g.restore();
    // Zz + tickle hearts meter
    if (!awake) {
      if (o.cool <= 0) {
        for (let k = 0; k < 2; k++) {
          const ph = (this.t * 0.6 + k * 0.5) % 1;
          ui.text(g, 'z', o.x + 70 + ph * 50, o.y - 200 - ph * 70, { size: 34 + k * 12, color: '#ffffff', alpha: 1 - ph, strokeWidth: 5 });
        }
        const n = this.api.ended?.() ? 0 : o.need;   // no tickle meter on the gallery ending
        for (let k = 0; k < n; k++) {
          const hx = o.x + (k - (n - 1) / 2) * 40, hy = o.y - 270;
          g.save(); g.translate(hx, hy + (k < o.tickles ? Math.sin(this.t * 8 + k) * 4 : 0));
          if (k < o.tickles) drawHeartShape(g, 30, '#ff6fb1');
          else { g.globalAlpha = 0.55; drawHeartShape(g, 26, 'rgba(255,255,255,0.7)'); }
          g.restore();
        }
        // pointing "A" hint when someone is close
        const near = this.ents.some((e) => dist(e.x, e.y, o.x, o.y - 90) < 300);
        if (near && !this.finale) { g.save(); g.translate(o.x, o.y - 330 + Math.sin(this.t * 6) * 6); ui.glyph(g, 'a', 0, 0, 52); g.restore(); }
      }
    }
  }

  drawChest(g) {
    const at = this.chestAt();
    g.save(); g.translate(at.x, at.y); g.scale(at.s, at.s);
    const sq = this.chestSq;
    g.scale(1 + sq * 0.2, 1 - sq * 0.2);
    // glow grows with the fill
    const gl = this.finale ? 1 : this.chestGlow;
    if (gl > 0.02) {
      const r = 140 + gl * 160 + (this.finale ? Math.sin(this.t * 10) * 20 : 0);
      const gg = g.createRadialGradient(0, -110, 10, 0, -110, r);
      gg.addColorStop(0, `rgba(255,240,150,${0.25 + gl * 0.45})`); gg.addColorStop(1, 'rgba(255,240,150,0)');
      g.fillStyle = gg; g.beginPath(); g.arc(0, -110, r, 0, TAU); g.fill();
    }
    if (this.finale) {
      // light rays
      g.save(); g.translate(0, -150); g.rotate(this.t * 0.5);
      for (let k = 0; k < 10; k++) { g.rotate(TAU / 10); g.globalAlpha = 0.25; g.fillStyle = RAINBOW[k % RAINBOW.length]; g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -520); g.lineTo(30, -520); g.closePath(); g.fill(); }
      g.restore();
    }
    const open = this.finale ? clamp(this.finale * 3, 0, 1) : 0.12 + gl * 0.15;
    const key = this.finale ? 'prop/mp-chest-open' : 'prop/mp-chest';
    if (!drawArt(g, key, 0, 0, 250, this.finale ? 250 : 208, { anchor: 'bottom' })) drawChestShape(g, 0, 0, 1, open, gl, this.t);
    g.restore();
  }

  drawSchool(g) {
    const sc = this.school;
    for (let k = 0; k < 7; k++) {
      const x = sc.x - sc.dir * (k % 4) * 60, y = sc.y + Math.floor(k / 2) * 34 - 50 + Math.sin(this.t * 4 + k) * 10;
      drawFishArt(g, x, y, 0.45, sc.col, sc.dir, this.t + k);
    }
  }

  drawRainbowFish(g, rf) {
    const y = rf.y + Math.sin(rf.t * 5) * 30;
    g.save(); g.translate(rf.x, y); g.scale(rf.dir * 1.4, 1.4);
    g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
    // tail
    const tw = Math.sin(rf.t * 14) * 0.3;
    g.save(); g.translate(-58, 0); g.rotate(tw);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-44, -34); g.quadraticCurveTo(-30, 0, -44, 34); g.closePath();
    const tg = g.createLinearGradient(0, -34, 0, 34); RAINBOW.forEach((c, i) => tg.addColorStop(i / 6, c));
    g.fillStyle = tg; g.fill(); g.stroke(); g.restore();
    // body
    g.beginPath(); g.ellipse(0, 0, 70, 42, 0, 0, TAU);
    const bg = g.createLinearGradient(-70, 0, 70, 0); RAINBOW.forEach((c, i) => bg.addColorStop(i / 6, c));
    g.fillStyle = bg; g.fill(); g.stroke();
    g.save(); g.beginPath(); g.ellipse(0, 0, 70, 42, 0, 0, TAU); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2.5;
    for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) { g.beginPath(); g.arc(i * 18 + (j % 2) * 9, j * 18, 10, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
    g.restore();
    // fin
    g.beginPath(); g.moveTo(-10, -40); g.quadraticCurveTo(10, -72, 30, -38); g.closePath(); g.fillStyle = '#fff6a8'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    // face
    g.fillStyle = '#fff'; g.beginPath(); g.arc(40, -8, 14, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(44, -8, 7, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(46, -11, 2.5, 0, TAU); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(54, 12, 8, 0.1 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.restore();
    g.save(); g.translate(rf.x + rf.dir * 30, y - 90); g.globalAlpha = (Math.sin(rf.t * 8) + 1) / 2; drawSparkleShape(g, 34, '#ffffff'); g.restore();
  }
}

// ---------------------------------------------------------------- drawing kit

function drawPearlArt(g, x, y, r, gold, t) {
  if (drawArt(g, gold ? 'prop/mp-pearl-gold' : 'prop/mp-pearl', x, y, r * 2.4, r * 2.4)) return;
  drawPearl(g, x, y, r, gold, t);
}

function drawPearl(g, x, y, r, gold, t) {
  g.save(); g.translate(x, y);
  const gl = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2);
  gl.addColorStop(0, gold ? 'rgba(255,230,120,0.6)' : 'rgba(255,255,255,0.5)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 2, 0, TAU); g.fill();
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  if (gold) { gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#e09a10'); }
  else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#fbe8f6'); gr.addColorStop(1, '#d6c4ec'); }
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.lineWidth = Math.max(2, r * 0.12); g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.4, r * 0.3, r * 0.18, -0.6, 0, TAU); g.fill();
  if (gold) { g.globalAlpha = (Math.sin(t * 6) + 1) / 2; g.translate(r * 0.7, -r * 0.7); drawSparkleShape(g, r, '#ffffff'); }
  g.restore();
}

/** Clam: origin = bottom centre. open 0..1. */
function drawClam(g, x, y, s, open, t, pearl, giggle) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
  const shell = (top) => {
    g.beginPath();
    g.moveTo(-80, 0); g.quadraticCurveTo(-84, top ? -70 : 26, 0, top ? -78 : 30); g.quadraticCurveTo(84, top ? -70 : 26, 80, 0); g.closePath();
  };
  // inside (visible when open)
  if (open > 0.05) {
    g.save(); g.translate(0, -22);
    g.beginPath(); g.ellipse(0, 0, 74, 18 + open * 22, 0, Math.PI, 0); g.fillStyle = '#ffd6ef'; g.fill();
    g.restore();
  }
  // bottom shell
  g.save(); g.translate(0, -26);
  shell(false); g.fillStyle = '#ffb3d9'; g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 2.5;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 8, 26); g.lineTo(k * 30, 4); g.stroke(); }
  // face on the bottom shell
  g.fillStyle = NAVY;
  if (open > 0.4) { g.beginPath(); g.arc(-22, 10, 4.5, 0, TAU); g.arc(22, 10, 4.5, 0, TAU); g.fill(); }
  else { g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(-22, 8, 6, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); g.beginPath(); g.arc(22, 8, 6, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
  g.fillStyle = 'rgba(255,79,139,0.45)'; g.beginPath(); g.ellipse(-36, 16, 8, 4.5, 0, 0, TAU); g.ellipse(36, 16, 8, 4.5, 0, 0, TAU); g.fill();
  if (giggle) { g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, 14, 7, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
  g.restore();
  // top shell: lifts up and tilts back (squashes) as it opens
  g.save(); g.translate(0, -26 - open * 52); g.scale(1, 1 - open * 0.45);
  shell(true); g.fillStyle = '#ffc6e4'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.3)'; g.lineWidth = 2.5;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 6, -74); g.lineTo(k * 30, -4); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-30, -50, 14, 6, -0.5, 0, TAU); g.fill();
  g.restore();
  // pearl sits in the bottom shell, in front
  if (pearl && open > 0.15) {
    g.save(); g.globalAlpha = clamp((open - 0.15) * 3, 0, 1);
    drawPearl(g, 0, -40, pearl.gold ? 25 : 21, pearl.gold, t);
    g.restore();
  }
  g.restore();
  g.restore();
}

/** Octopus: origin bottom centre (sitting on the sand). */
function drawOctopus(g, x, y, s, t, awake) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineWidth = 5; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
  const body = '#ff8fc7', light = '#ffc2e6';
  // tentacles
  for (let k = 0; k < 6; k++) {
    const side = k < 3 ? -1 : 1, i = k % 3;
    const bx = side * (30 + i * 26);
    const wave = awake ? Math.sin(t * 9 + k) * 0.6 : Math.sin(t * 1.4 + k) * 0.15;
    g.save(); g.translate(bx, -40);
    g.beginPath();
    const ex = side * (90 + i * 30), ey = awake ? -60 - i * 40 + Math.sin(t * 8 + k) * 30 : 20 - i * 4;
    g.moveTo(-14, 0);
    g.quadraticCurveTo(ex * 0.5 + side * 20 * wave, ey * 0.5 + 30, ex, ey);
    g.quadraticCurveTo(ex + side * 26, ey - 10, ex + side * 10, ey - 26 + wave * 10);
    g.quadraticCurveTo(ex * 0.5, ey * 0.5 + 10, 14, 0);
    g.closePath();
    g.fillStyle = body; g.fill(); g.stroke();
    g.fillStyle = light;
    for (let m = 1; m < 4; m++) { g.beginPath(); g.arc(ex * m / 4, ey * m / 4 + 18, 5, 0, TAU); g.fill(); }
    g.restore();
  }
  // head
  g.beginPath(); g.ellipse(0, -130, 118, 104, 0, 0, TAU); g.fillStyle = body; g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-46, -190, 30, 16, -0.5, 0, TAU); g.fill();
  // face
  g.strokeStyle = NAVY; g.lineWidth = 6;
  if (awake) {
    g.beginPath(); g.arc(-40, -118, 16, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
    g.beginPath(); g.arc(40, -118, 16, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
    g.fillStyle = '#ff4f8b'; g.beginPath(); g.ellipse(0, -80, 26, 20, 0, 0, Math.PI); g.fill(); g.lineWidth = 5; g.stroke();
  } else {
    g.beginPath(); g.arc(-40, -122, 16, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.beginPath(); g.arc(40, -122, 16, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(0, -88, 10, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  }
  g.fillStyle = 'rgba(255,79,139,0.5)'; g.beginPath(); g.ellipse(-70, -96, 18, 10, 0, 0, TAU); g.ellipse(70, -96, 18, 10, 0, 0, TAU); g.fill();
  // nightcap
  g.save(); g.translate(20, -222); g.rotate(awake ? 0.5 + Math.sin(t * 9) * 0.2 : 0.35);
  g.beginPath(); g.moveTo(-70, 12); g.quadraticCurveTo(10, -30, 40, -90); g.quadraticCurveTo(70, -20, 70, 12); g.closePath();
  g.fillStyle = '#c9a0ff'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); ui.roundRect(g, -76, 2, 152, 24, 12); g.fill(); g.stroke();
  g.beginPath(); g.arc(40, -94, 14, 0, TAU); g.fill(); g.stroke();
  g.restore();
  g.restore();
}

function drawChestShape(g, x, y, s, open, glow, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineWidth = 5; g.strokeStyle = NAVY; g.lineJoin = 'round';
  // pearls heap peeking out
  const heap = clamp(glow, 0, 1);
  // box
  g.beginPath(); ui.roundRect(g, -115, -130, 230, 130, 14); g.fillStyle = '#c47a3c'; g.fill(); g.stroke();
  g.fillStyle = '#a8612b'; for (let k = 0; k < 3; k++) g.fillRect(-110, -100 + k * 34, 220, 5);
  g.fillStyle = '#ffd23f'; g.fillRect(-115, -132, 20, 132); g.fillRect(95, -132, 20, 132); g.strokeRect(-115, -132, 20, 132); g.strokeRect(95, -132, 20, 132);
  // pearls inside (visible through the gap)
  if (open > 0.05) {
    g.save(); g.beginPath(); g.rect(-110, -240, 220, 112); g.clip();
    const n = Math.round(4 + heap * 16 + (open > 0.6 ? 12 : 0));
    for (let k = 0; k < n; k++) {
      const px = -90 + (k * 37) % 180, py = -130 - (open > 0.6 ? 30 : 8) * heap - (k % 3) * 10 - Math.floor(k / 6) * 12;
      drawPearl(g, px, py, 13, k % 7 === 3, t);
    }
    g.restore();
  }
  // lid
  g.save(); g.translate(0, -130);
  g.translate(0, -open * 70); g.rotate(-open * 0.35);
  g.beginPath(); g.moveTo(-118, 0); g.lineTo(-118, -40); g.quadraticCurveTo(0, -100, 118, -40); g.lineTo(118, 0); g.closePath();
  g.fillStyle = '#d68a48'; g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.rect(-118, -12, 236, 12); g.fill(); g.stroke();
  g.restore();
  // heart lock
  g.save(); g.translate(0, -112); drawHeartShape(g, 40, '#ff6fb1'); g.restore();
  g.restore();
}

function drawVent(g, x, y, pulse) {
  g.save(); g.translate(x, y);
  g.lineWidth = 4; g.strokeStyle = NAVY;
  g.beginPath(); g.moveTo(-96, 0); g.quadraticCurveTo(-90, -60, -30, -70); g.lineTo(30, -70); g.quadraticCurveTo(90, -60, 96, 0); g.closePath();
  g.fillStyle = '#7a86b8'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, -68, 34, 10 + pulse * 4, 0, 0, TAU); g.fillStyle = '#3a4580'; g.fill(); g.stroke();
  g.fillStyle = '#5ad18f'; g.beginPath(); g.arc(-60, -20, 12, Math.PI, 0); g.arc(60, -16, 10, Math.PI, 0); g.fill();
  g.fillStyle = '#ff8fc7'; g.beginPath(); g.arc(-40, -46, 7, 0, TAU); g.fill();
  g.restore();
}

function drawCoral(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = 18;
  const br = (x0, y0, a, len, d) => {
    const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (d > 0) { br(x1, y1, a - 0.5, len * 0.7, d - 1); br(x1, y1, a + 0.5, len * 0.7, d - 1); }
  };
  br(0, 0, -Math.PI / 2, 70, 2);
  g.fillStyle = '#ffffff'; g.globalAlpha = 0.5;
  g.restore();
}

function drawStarfish(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s * 0.6);
  g.fillStyle = color; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 24; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function drawFishArt(g, x, y, s, col, face, t) {
  const key = `prop/mp-fish-${(col % 3) + 1}`;
  if (art(key)) {
    g.save(); g.translate(x, y); g.scale(face, 1); g.rotate(Math.sin(t * 6) * 0.08);
    drawArt(g, key, 0, 0, 110 * s, 78 * s); g.restore(); return;
  }
  drawFish(g, x, y, s, col, face, t);
}

function drawFish(g, x, y, s, col, face, t) {
  const [c1, c2] = FISH_COLS[col % FISH_COLS.length];
  g.save(); g.translate(x, y); g.scale(face * s, s);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
  const tw = Math.sin(t * 12) * 0.35;
  g.save(); g.translate(-34, 0); g.rotate(tw);
  g.beginPath(); g.moveTo(4, 0); g.lineTo(-24, -20); g.lineTo(-24, 20); g.closePath(); g.fillStyle = c2; g.fill(); g.stroke();
  g.restore();
  g.beginPath(); g.ellipse(0, 0, 40, 26, 0, 0, TAU); g.fillStyle = c1; g.fill(); g.stroke();
  g.save(); g.beginPath(); g.ellipse(0, 0, 40, 26, 0, 0, TAU); g.clip();
  g.fillStyle = c2; g.fillRect(-10, -30, 12, 60);
  g.restore();
  g.beginPath(); g.ellipse(0, 0, 40, 26, 0, 0, TAU); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(20, -6, 9, 0, TAU); g.fill(); g.lineWidth = 3; g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(22, -6, 5, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(24, -8, 1.8, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 2.5; g.beginPath(); g.arc(30, 8, 5, 0.1 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.restore();
}
