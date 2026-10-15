// Ghost Giggles (Molly Party, cooperative) - little white sheet ghosts zoom
// around a cosy, cute haunted parlour. Everyone wears a Halloween costume
// (the shared wardrobe: wizard hats, wings, kitty ears...). Run up to a ghost
// and press A to tickle it: it giggles and turns a bright colour. Shy ghosts
// hide behind the curtains and peek out - press A at the window for a
// Peekaboo! When every ghost is colourful a disco ball drops and the ghosts
// throw a dance party, then a new, bigger wave of ghosts swoops in.
// The costume trunks in the corners swap your costume (A).
//
// Art hooks (all optional; procedural drawings ship today):
//   bg/ghost-giggles  thumb/ghost-giggles  prop/gg-ghost  prop/gg-ghost-giggle
//   prop/gg-ghost-peek  prop/gg-curtain  prop/gg-trunk  prop/gg-disco-ball
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, Brain, steer } from '../engine/ai.js';
import { drawSparkleShape } from '../engine/emotes.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, TAU, ease } from '../engine/util.js';
import { GHOST_COLORS, FIRE, TRUNKS, roomWindows, roomFire, drawGhostShape, tintedArt, drawCurtains, curtainInnerX, drawTrunk, drawDiscoBall, drawFire, drawRoom } from './ghost-giggles/art.js';

const NAVY = '#24163f';
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export const meta = {
  id: 'ghost-giggles',
  title: 'Ghost Giggles',
  category: 'molly',
  type: 'Team up',
  goal: 'Tickle the ghosts to make them colourful, then dance!',
  controls: [['stick', 'Run around the house'], ['a', 'Tickle!']],
  tips: ['Run to a white ghost and press A to tickle it.', 'Shy ghosts hide behind the curtains - press A at the window!', 'Press A at a costume trunk to change your costume.'],
  // Molly Easy: you walk to the ghosts by yourself; A tickles, X changes your costume
  goalEasy: 'You walk to the ghosts by yourself. Press A to tickle them colourful!',
  controlsEasy: [['a', 'Tickle!'], ['x', 'New costume']],
  tipsEasy: ['Press A when the big A bounces over a ghost.', 'At a window? Press A for a Peekaboo!', 'Press X for a new costume.'],
  music: 'dance',
  duration: '50 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  infoAt: 'tl',
  drawIcon(g, x, y, w, h, t = 0) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = w / 400, hh = h / s;
    g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#6c3f8f'; g.fillRect(0, 0, 400, hh);
    for (let i = 0; i < 10; i++) { g.fillStyle = '#7c4ba0'; g.fillRect(i * 40, 0, 20, hh * 0.62); }
    g.fillStyle = '#c4865a'; g.fillRect(0, hh * 0.62, 400, hh * 0.38);
    g.fillStyle = '#ff9fcf'; g.beginPath(); g.ellipse(200, hh * 0.82, 170, 34, 0, 0, TAU); g.fill();
    // disco ball + beams
    g.save(); g.globalAlpha = 0.25;
    for (let i = 0; i < 5; i++) { g.fillStyle = RAINBOW[i]; g.beginPath(); g.moveTo(200, 40); const a = 0.6 + i * 0.45 + Math.sin(t) * 0.2; g.lineTo(200 + Math.cos(a) * 300 - 30, 40 + Math.sin(a) * 300); g.lineTo(200 + Math.cos(a) * 300 + 30, 40 + Math.sin(a) * 300); g.fill(); }
    g.restore();
    drawDiscoBall(g, 200, 40, 22, t);
    const cols = [null, GHOST_COLORS[0], GHOST_COLORS[6]];
    cols.forEach((c, i) => {
      g.save(); g.translate(90 + i * 110, hh * 0.52 + Math.sin(t * 3 + i) * 10); g.rotate(Math.sin(t * 2 + i) * 0.1);
      const key = i === 1 ? 'prop/gg-ghost-giggle' : 'prop/gg-ghost';
      const img = tintedArt(key, c);
      if (img) g.drawImage(img, -45, -56, 90, 112); else drawGhostShape(g, 80, c, { t: t + i, giggle: i === 1 });
      g.restore();
    });
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 50;
const PARTY_LEN = 4.6;
const MAX_SPEED = 640;
const CPU_SPEED = [0.66, 0.78, 0.88];
const TICKLE_RANGE = 230;
const TICKLE_NEAR = 125;
const MOVE = { x0: 80, x1: W - 80, y0: 520, y1: 962 };
const GB = { x0: 150, x1: W - 150, y0: 545, y1: 930 };   // ghost floor area
const WIN_Y = 545;          // where you stand to open a window's curtains
const DS = (y) => depthScale(y, { top: 450, near: 980, far: 0.8, nearScale: 1.04 });

// Halloween costumes from the shared wardrobe (engine/outfits.js ids).
const COSTUMES = [
  [{ id: 'wizard-hat', colour: 2 }, { id: 'star-cape', colour: 2 }, { id: 'magic-wand', colour: 1 }],
  [{ id: 'fairy-wings', colour: 3 }, { id: 'fairy-halo', colour: 1 }],
  [{ id: 'kitty-ears', colour: 0 }, { id: 'kitty-whiskers', colour: 0 }],
  [{ id: 'dragon-wings', colour: 4 }, { id: 'party-goggles', colour: 4 }],
  [{ id: 'bunny-ears', colour: 6 }, { id: 'rosy-blush', colour: 0 }],
  [{ id: 'butterfly-wings', colour: 2 }, { id: 'butterfly-paint', colour: 3 }],
  [{ id: 'royal-cape', colour: 5 }, { id: 'masquerade-mask', colour: 2 }, { id: 'crown', colour: 1 }],
  [{ id: 'unicorn-horn', colour: 7 }, { id: 'petal-wings', colour: 0 }],
  [{ id: 'angel-wings', colour: 6 }, { id: 'tiara', colour: 6 }],
  [{ id: 'princess-cone', colour: 0 }, { id: 'lace-fan', colour: 6 }],
];

const poseName = (n, fb = 'cheer') => (POSE_NAMES.includes(n) ? n : fb);
let ghostSerial = 0;
// Tiny avatars (e.g. the 54 px garden fairies) are drawn bigger so they read next to the ghosts.
const sizeFix = (a) => Math.max(1, 120 / (a.char.members[0].h || 120));

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: humans walk by themselves; A tickles, X swaps costume
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.playT = 0;
    this.timeLeft = DURATION;
    this.done = false;
    this.wave = 0;
    this.party = null;        // { t, final }
    this.disco = -160;        // disco ball y
    this.colorIdx = randInt(0, GHOST_COLORS.length - 2);
    this.ghosts = [];
    this.fire = roomFire();
    this.wins = roomWindows().map((w) => ({ ...w, shy: false, open: 1, target: 1, peekT: 0, peekCd: rand(1, 2.5), revealT: 0 }));
    this.trunks = TRUNKS.map((tr) => ({ ...tr, bounce: 0 }));
    this.baseScale = n <= 4 ? 0.95 : n <= 6 ? 0.86 : 0.8;
    const costumes = shuffle(COSTUMES.map((_, i) => i));
    this.ents = this.players.map((p, i) => {
      const cols = Math.min(n, 4), row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, n - row * cols);
      const x = W / 2 + (col - (inRow - 1) / 2) * Math.min(300, (W - 500) / Math.max(1, inRow - 1 || 1));
      const y = n <= 4 ? 800 : 740 + row * 150;
      const a = new Actor(p, { scale: this.baseScale, x, y });
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      const e = { p, a, i, x, y, vx: 0, vy: 0, score: 0, cd: 0, lunge: 0, lx: 0, ly: 0, costume: costumes[i % costumes.length], brain: new Brain(p), target: null, aiPress: -1, wander: 0, wx: x, wy: y, popN: 0, popT: 0,
        auto: this.easy && !p.isAI ? { ix: 0, iy: 0, target: null, t: 0, home: { x, y } } : null };
      a.setOutfit(COSTUMES[e.costume]);
      return e;
    });
    this.startWave(true);
  }

  // ------------------------------------------------------------------ waves
  startWave(first = false) {
    const k = this.wave++;
    const room = clamp(4 + Math.ceil(this.n * 0.75) + k * 2, 5, 13);
    const shy = Math.min(3, 1 + k);
    for (let i = 0; i < room; i++) {
      const fromFire = i % 3 === 0;
      const g0 = this.makeGhost(fromFire ? this.fire.x + rand(-60, 60) : rand(GB.x0, GB.x1), fromFire ? GB.y0 + 10 : rand(GB.y0, GB.y1));
      g0.z = fromFire ? 40 : rand(700, 950);
      g0.state = 'enter'; g0.t = -i * (first ? 0.06 : 0.12);
      g0.vx = fromFire ? rand(-260, 260) : 0; g0.vy = fromFire ? rand(120, 260) : 0;
      g0.fromFire = fromFire;
      this.ghosts.push(g0);
    }
    const ws = shuffle(this.wins.slice()).slice(0, shy);
    for (const w of ws) { w.shy = true; w.target = 0; w.peekCd = rand(1.2, 3); w.peekT = 0; w.wave = this.wave; }
    if (!first) {
      snd('gg-wave', 'pt-slide-whistle', { vol: 0.7 });
      particles.burst(this.fire.x, this.fire.y - 60, { type: 'smoke', count: 14, speed: [80, 260], size: [24, 44] });
      this.waveBannerT = 0;
    }
  }

  makeGhost(x, y) {
    return {
      id: ghostSerial++, x, y, z: 100, vx: 0, vy: 0, col: null, wave: this.wave, state: 'roam', t: 0, tx: x, ty: y, retarget: rand(0.5, 1.5),
      sq: 0, spin: 0, seed: rand(TAU), blink: rand(1, 3), dodgeCd: rand(1, 3), zoomT: rand(3, 6), giggleT: 0, alpha: 1, look: 0,
    };
  }

  nextColor() {
    this.colorIdx = (this.colorIdx + 1) % GHOST_COLORS.length;
    return GHOST_COLORS[this.colorIdx];
  }

  waveLeft() {
    return this.ghosts.filter((g0) => !g0.col && g0.state !== 'leave').length + this.wins.filter((w) => w.shy).length;
  }

  startParty(final = false) {
    if (this.party) return;
    this.party = { t: 0, final };
    snd('gg-party', 'fanfare'); sfx('cheer', { vol: 0.6 });
    fx.flash('#ffd1ea', 0.3); fx.shake(10, 0.3);
    particles.confettiRain(W, 140);
    this.api.camera && this.api.camera.punch(W / 2, 700, 1.08, 0.5);
    for (const e of this.ents) { e.a.clearEmotes(); e.a.playOnce('celebrate', 0.8, 'dance'); e.a.emote('heart', 1.2); if (chance(0.5)) voice(e.p.charId, 'woo'); }
    const happy = this.ghosts.filter((g0) => g0.state !== 'leave');
    happy.forEach((g0, i) => { g0.state = 'party'; g0.slot = i; g0.slots = happy.length; });
  }

  endParty() {
    this.party = null;
    for (const g0 of this.ghosts) if (g0.state === 'party') { g0.state = 'leave'; g0.t = 0; g0.vx = rand(-200, 200); }
    for (const e of this.ents) e.a.setPose('idle');
    this.startWave();
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    this.updateGhosts(dt);
    this.updateWindows(dt);
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); this.syncActor(e); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.playT += dt;
    this.timeLeft = Math.max(0, DURATION - this.playT);
    if (this.waveBannerT !== undefined) this.waveBannerT += dt;
    if (this.party) {
      this.party.t += dt;
      if (this.party.t >= PARTY_LEN && !this.party.final) this.endParty();
    } else if (this.waveLeft() === 0) this.startParty();
    for (const e of this.ents) {
      if (e.p.isAI && !this.party) this.aiThink(e, dt);
      if (e.auto && !this.party) this.easyThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate(dt);
    this.updateGhosts(dt);
    this.updateWindows(dt);
    for (const tr of this.trunks) tr.bounce *= Math.exp(-8 * dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
    if (this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    if (this.party) this.party.t += dt;
    this.updateGhosts(dt);
    this.updateWindows(dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
  }

  syncActor(e) {
    e.a.x = e.x; e.a.y = e.y;
    e.a.scale = this.baseScale * DS(e.y) * sizeFix(e.a);
  }

  updateGhosts(dt) {
    const P = this.party;
    this.disco = lerp(this.disco, P ? 230 : -160, 1 - Math.exp(-(P ? 3 : 2) * dt));
    for (const g0 of this.ghosts) {
      g0.t += dt;
      g0.sq *= Math.exp(-6 * dt);
      g0.spin *= Math.exp(-4 * dt);
      g0.giggleT = Math.max(0, g0.giggleT - dt);
      g0.blink -= dt; if (g0.blink < -0.12) g0.blink = rand(1.2, 3.5);
      g0.dodgeCd -= dt;
      const white = !g0.col;
      switch (g0.state) {
        case 'enter': {
          if (g0.t < 0) break;
          if (g0.fromFire) {
            g0.x += g0.vx * dt; g0.y += g0.vy * dt; g0.vx *= Math.exp(-2 * dt); g0.vy *= Math.exp(-2 * dt);
            g0.z = lerp(g0.z, 110, 1 - Math.exp(-3 * dt));
          } else g0.z = lerp(g0.z, 110, 1 - Math.exp(-4 * dt));
          if (g0.t > 0.02 && !g0.entered) {
            g0.entered = true; g0.sq = 0.4;
            if (g0.fromFire) particles.burst(g0.x, g0.y - 40, { type: 'smoke', count: 4, speed: [40, 120], size: [18, 30] });
            if (Math.random() < 0.35) snd('gg-whoosh', 'whoosh', { vol: 0.3, rate: rand(1.1, 1.4) });
          }
          if (g0.t > 0.9) g0.state = 'roam';
          break;
        }
        case 'roam': {
          g0.retarget -= dt;
          if (g0.retarget <= 0) { g0.retarget = rand(1.2, 2.6); g0.tx = rand(GB.x0, GB.x1); g0.ty = rand(GB.y0, GB.y1); }
          const sp = white ? 230 : 140;
          this.steerGhost(g0, g0.tx, g0.ty, sp, dt);
          g0.z = lerp(g0.z, white ? 110 : 190, 1 - Math.exp(-2 * dt)) + Math.sin(this.t * 3 + g0.seed) * 0.8;
          if (white && !this.party) {
            g0.zoomT -= dt;
            if (g0.zoomT <= 0) {
              g0.zoomT = rand(3.5, 6.5); g0.state = 'zoom'; g0.t = 0;
              g0.tx = clamp(g0.x + rand(-700, 700), GB.x0, GB.x1); g0.ty = rand(GB.y0, GB.y1);
              snd('gg-whoosh', 'whoosh', { vol: 0.35, rate: rand(1.1, 1.4) });
            }
            // playful dodge when someone comes close
            if (g0.dodgeCd <= 0) {
              let near = null, nd = 210;
              for (const e of this.ents) { const d = Math.hypot(e.x - g0.x, (e.y - g0.y) * 1.3); if (d < nd) { nd = d; near = e; } }
              if (near) {
                g0.dodgeCd = rand(2.6, 4); g0.state = 'dodge'; g0.t = 0;
                const dx = g0.x - near.x, dy = g0.y - near.y, d = Math.hypot(dx, dy) || 1;
                g0.vx = (dx / d) * 430; g0.vy = (dy / d) * 300;
                g0.sq = -0.3;
                if (this.t - (this.teeheeAt || -9) > 1.2) {
                  this.teeheeAt = this.t;
                  particles.popText(g0.x, g0.y - g0.z - 110, 'hee hee!', '#ffffff', 30);
                  snd('gg-teehee', 'npc/imp/giggle', { vol: 0.4, rate: rand(1.1, 1.3) });
                }
              }
            }
          }
          break;
        }
        case 'zoom': {
          this.steerGhost(g0, g0.tx, g0.ty, 600, dt, 10);
          g0.z = 110 + Math.sin(g0.t * 8) * 30;
          if (Math.random() < dt * 30) particles.burst(g0.x, g0.y - g0.z - 50, { type: 'sparkle', count: 1, colors: ['#ffffff', '#e8dcff'], speed: [10, 40], size: [10, 16] });
          if (g0.t > 0.75 || Math.hypot(g0.tx - g0.x, g0.ty - g0.y) < 30) { g0.state = 'roam'; g0.retarget = rand(0.6, 1.2); }
          break;
        }
        case 'dodge': {
          g0.x += g0.vx * dt; g0.y += g0.vy * dt;
          g0.vx *= Math.exp(-3 * dt); g0.vy *= Math.exp(-3 * dt);
          g0.z = 110 + Math.sin(g0.t * Math.PI / 0.4) * 50;
          if (g0.t > 0.4) { g0.state = 'roam'; g0.retarget = 0; }
          break;
        }
        case 'giggle': {
          g0.vx *= Math.exp(-4 * dt); g0.vy *= Math.exp(-4 * dt);
          g0.x += g0.vx * dt; g0.y += g0.vy * dt;
          g0.z = lerp(g0.z, 200, 1 - Math.exp(-4 * dt)) + Math.sin(g0.t * 20) * 2;
          if (g0.t > 0.9) { g0.state = 'roam'; g0.retarget = 0; }
          break;
        }
        case 'party': {
          const N = Math.max(1, g0.slots), a = g0.slot * TAU / N + this.t * 1.1;
          const tx = W / 2 + Math.cos(a) * 600, ty = 745 + Math.sin(a) * 150;
          g0.x = lerp(g0.x, tx, 1 - Math.exp(-4 * dt)); g0.y = lerp(g0.y, ty, 1 - Math.exp(-4 * dt));
          g0.z = 150 + Math.abs(Math.sin(this.t * 5.5 + g0.slot)) * 80;
          g0.spin = Math.sin(this.t * 5.5 + g0.slot) * 0.25;
          g0.giggleT = Math.sin(this.t * 2 + g0.slot) > 0.3 ? 0.2 : 0;
          if (!g0.col) g0.col = this.nextColor();
          if (chance(dt * 0.8)) particles.burst(g0.x, g0.y - g0.z - 50, { type: 'note', count: 1, colors: [g0.col.c], speed: [40, 90], size: [18, 26] });
          break;
        }
        case 'leave': {
          g0.z += 500 * dt; g0.x += g0.vx * dt; g0.alpha = Math.max(0, g0.alpha - dt * 0.9);
          if (g0.alpha <= 0) g0.dead = true;
          break;
        }
        default: break;
      }
      if (g0.state !== 'leave' && g0.state !== 'party') { g0.x = clamp(g0.x, GB.x0, GB.x1); g0.y = clamp(g0.y, GB.y0, GB.y1); }
      g0.look = clamp(g0.vx / 300, -1, 1);
    }
    this.ghosts = this.ghosts.filter((g0) => !g0.dead);
    // gentle spacing
    const G = this.ghosts;
    for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
      const A = G[i], B = G[j];
      if (A.state === 'party' || A.state === 'leave' || B.state === 'party' || B.state === 'leave') continue;
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.5, d = Math.hypot(dx, dy);
      if (d < 110 && d > 0.01) { const k = (110 - d) * 0.5 * Math.min(1, dt * 6); A.x -= dx / d * k; B.x += dx / d * k; A.y -= dy / d * k * 0.4; B.y += dy / d * k * 0.4; }
    }
  }

  steerGhost(g0, tx, ty, sp, dt, rate = 3) {
    const dx = tx - g0.x, dy = ty - g0.y, d = Math.hypot(dx, dy);
    const k = d > 1 ? Math.min(1, d / 120) : 0;
    const vx = d > 1 ? (dx / d) * sp * k : 0, vy = d > 1 ? (dy / d) * sp * k * 0.75 : 0;
    g0.vx = lerp(g0.vx, vx, 1 - Math.exp(-rate * dt)); g0.vy = lerp(g0.vy, vy, 1 - Math.exp(-rate * dt));
    g0.x += g0.vx * dt; g0.y += g0.vy * dt;
  }

  updateWindows(dt) {
    for (const w of this.wins) {
      if (w.shy) {
        w.peekCd -= dt;
        if (w.peekT > 0) { w.peekT -= dt; w.target = 0.22; if (w.peekT <= 0) { w.target = 0; w.peekCd = rand(1.5, 3.5); } }
        else if (w.peekCd <= 0) {
          w.peekT = rand(1.1, 1.6);
          if (!this.done) snd('gg-peek', 'tiny-squeak', { vol: 0.35, rate: rand(1.1, 1.4) });
        }
      } else if (w.revealT > 0) { w.revealT -= dt; w.target = 1; }
      else w.target = 1;
      w.open = lerp(w.open, w.target, 1 - Math.exp(-(w.target > w.open ? 9 : 5) * dt));
    }
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.cd = Math.max(0, e.cd - dt);
    e.popT = Math.max(0, e.popT - dt);
    if (this.party || this.done) {
      e.vx *= Math.exp(-8 * dt); e.vy *= Math.exp(-8 * dt);
      if (!a._once && a.pose !== 'dance' && this.party) a.setPose('dance');
      if (this.party) {
        // you can still wiggle around a bit while dancing
        if (!e.auto) {
          e.x = clamp(e.x + c.x * 260 * dt, MOVE.x0, MOVE.x1); e.y = clamp(e.y + c.y * 200 * dt, MOVE.y0, MOVE.y1);
          if (Math.abs(c.x) > 0.3) a.facing = c.x > 0 ? 1 : -1;
        }
        if (c.pressed('a') && e.cd <= 0) { e.cd = 0.3; a.playOnce(pick(['dance-up', 'dance-side', 'dance-star', 'dance-down'].filter((q) => POSE_NAMES.includes(q))) || 'cheer', 0.45, 'dance'); particles.burst(e.x, e.y - a.height * 0.7, { type: 'note', count: 3, colors: RAINBOW, speed: [80, 200] }); sfx('note', { midi: pick([72, 74, 76, 79, 81]), dur: 0.25, vol: 0.3 }); }
      }
      return;
    }
    let ix = e.auto ? e.auto.ix : c.x, iy = e.auto ? e.auto.iy : c.y;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    const top = MAX_SPEED * (p.isAI ? CPU_SPEED[clamp(p.aiLevel || 0, 0, 2)] : e.auto ? 0.72 : 1);
    const k = 1 - Math.exp(-14 * dt);
    e.vx += (ix * top - e.vx) * k; e.vy += (iy * top * 0.8 - e.vy) * k;
    if (e.lunge > 0) { e.lunge -= dt; e.x += e.lx * dt; e.y += e.ly * dt; }
    e.x = clamp(e.x + e.vx * dt, MOVE.x0, MOVE.x1);
    e.y = clamp(e.y + e.vy * dt, MOVE.y0, MOVE.y1);
    if (!a._once) a.moveAnim(e.vx, e.vy, top, { run: Math.hypot(e.vx, e.vy) > 380 });
    else if (Math.abs(e.vx) > 30) a.facing = e.vx > 0 ? 1 : -1;
    if (c.pressed('a')) this.tryTickle(e);
    if (e.auto && c.pressed('x') && e.cd <= 0) { e.cd = 0.3; this.swapCostume(e, null); }
  }

  separate(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const r = (A.a.radius + B.a.radius) * 0.7;
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy);
      if (d < r && d > 0.01) {
        const push = (r - d) * 0.5 * Math.min(1, dt * 12);
        A.x -= (dx / d) * push; B.x += (dx / d) * push;
        A.y -= (dy / d) * push * 0.5; B.y += (dy / d) * push * 0.5;
      }
    }
  }

  dist(e, x, y) { return Math.hypot(x - e.x, (y - e.y) * 1.3); }
  tickleable(g0) { return g0.state === 'roam' || g0.state === 'zoom' || g0.state === 'dodge' || g0.state === 'giggle' || (g0.state === 'enter' && g0.t > 0.4); }

  tryTickle(e) {
    if (e.cd > 0) return;
    e.cd = 0.22;
    const a = e.a;
    const best = this.tickleTarget(e);
    a.playOnce('action', 0.28);
    if (!best) {
      const h = a.anchor('hand');
      particles.burst(h.x + a.facing * 20, h.y, { type: 'sparkle', count: 4, colors: ['#ffffff', '#e8dcff'], speed: [40, 120], size: [10, 16] });
      sfx('whoosh', { vol: 0.3 });
      return;
    }
    const real = this.dist(e, best.x, best.y);
    if (real > TICKLE_NEAR) {
      const dx = best.x - e.x, dy = best.y + 20 - e.y, d = Math.hypot(dx, dy) || 1, travel = Math.max(0, d - 95);
      e.lunge = 0.12; e.lx = (dx / d) * travel / 0.12; e.ly = (dy / d) * travel / 0.12;
      particles.burst(e.x, e.y, { type: 'dust', count: 5, color: '#fff', speed: [60, 140], size: [10, 16] });
      sfx('dash', { vol: 0.45 });
    }
    a.facing = best.x >= e.x ? 1 : -1;
    if (best.kind === 'ghost') this.tickle(e, best.g0);
    else if (best.kind === 'win') this.peekaboo(e, best.w);
    else this.swapCostume(e, best.tr);
  }

  /** What A would reach from here: { kind: 'ghost'|'win'|'trunk', x, y, ... } or null. */
  tickleTarget(e) {
    let best = null, bd = TICKLE_RANGE;
    for (const g0 of this.ghosts) {
      if (!this.tickleable(g0)) continue;
      // white ghosts win ties: they're the ones you're after
      const d = this.dist(e, g0.x, g0.y) * (g0.col ? 1.35 : 1);
      if (d < bd) { bd = d; best = { kind: 'ghost', g0, x: g0.x, y: g0.y }; }
    }
    for (const w of this.wins) {
      if (!w.shy) continue;
      const d = this.dist(e, w.x, WIN_Y) * 0.85;
      if (d < bd) { bd = d; best = { kind: 'win', w, x: w.x, y: WIN_Y }; }
    }
    // (Molly Easy: X swaps costume, so A never grabs a trunk by accident)
    if (!e.auto) for (const tr of this.trunks) {
      const d = this.dist(e, tr.x, tr.y + 20) * 1.15;
      if (d < Math.min(bd, 190)) { bd = d; best = { kind: 'trunk', tr, x: tr.x, y: tr.y + 20 }; }
    }
    return best;
  }

  tickle(e, g0) {
    const a = e.a, wasWhite = !g0.col;
    g0.state = 'giggle'; g0.t = 0; g0.giggleT = 0.9; g0.sq = 0.5; g0.spin = (a.facing || 1) * 1.2;
    g0.vx = a.facing * 120; g0.vy = 0;
    g0.col = this.nextColor();
    const gy = g0.y - g0.z - 50 * DS(g0.y);
    snd('gg-giggle', 'giggle', { vol: 0.8, rate: rand(1.15, 1.5) });
    snd('gg-tickle', 'brush', { vol: 0.5 });
    if (!e.p.isAI) e.p.ctrl.rumble(0.3, 80);
    fx.hitstop(0.03);
    const cols = g0.col.rainbow ? RAINBOW : [g0.col.c, g0.col.d, '#ffffff'];
    if (wasWhite) {
      e.score++;
      sfx('magic', { vol: 0.45 });
      particles.burst(g0.x, gy, { type: 'confetti', count: 16, colors: cols, speed: [180, 420] });
      particles.burst(g0.x, gy, { type: 'star', count: 6, colors: cols, speed: [120, 260] });
      particles.ring(g0.x, gy, g0.col.c, 150, 0.4);
      fx.shake(5, 0.14);
      this.pop(e, '+1', g0.col.rainbow ? '#ffd23f' : g0.col.c, 58);
      a.emote(chance(0.5) ? 'star' : 'heart', 0.7);
      if (chance(0.3)) voice(e.p.charId, 'laugh');
      const left = this.waveLeft();
      if (left > 0 && left <= 2) particles.popText(W / 2, 250, left === 1 ? 'One more!' : 'Two more!', '#ffffff', 56);
    } else {
      particles.burst(g0.x, gy, { type: 'sparkle', count: 8, colors: cols, speed: [80, 220] });
      particles.popText(g0.x, gy - 70, 'hee hee!', g0.col.c, 34);
    }
  }

  peekaboo(e, w) {
    w.shy = false; w.revealT = 1.2; w.peekT = 0; w.target = 1;
    e.score++;
    snd('gg-curtain', 'ds-curtain', { vol: 0.7 });
    snd('gg-peekaboo', 'pt-peekaboo', { vol: 0.8 });
    snd('gg-giggle', 'giggle', { vol: 0.8, rate: 1.4 });
    const g0 = this.makeGhost(w.x, GB.y0);
    g0.z = 260; g0.col = this.nextColor(); g0.state = 'giggle'; g0.t = 0; g0.giggleT = 1; g0.sq = 0.6; g0.vy = 220; g0.wave = this.wave;
    this.ghosts.push(g0);
    const cols = g0.col.rainbow ? RAINBOW : [g0.col.c, g0.col.d, '#ffffff'];
    particles.burst(w.x, (w.top + w.bot) / 2, { type: 'confetti', count: 22, colors: cols, speed: [200, 460] });
    particles.popText(w.x, w.top - 10, 'Peekaboo!', '#ffd23f', 60);
    fx.flash('#fff3fb', 0.12); fx.shake(7, 0.2);
    this.api.camera && this.api.camera.punch(w.x, 420, 1.1, 0.3);
    this.pop(e, '+1', '#ffd23f', 58);
    e.a.emote('sparkle', 1); voice(e.p.charId, 'gasp');
    if (!e.p.isAI) e.p.ctrl.rumble(0.5, 120);
  }

  swapCostume(e, tr) {
    let c = e.costume;
    while (c === e.costume) c = randInt(0, COSTUMES.length - 1);
    e.costume = c;
    e.a.setOutfit(COSTUMES[c]);
    if (tr) tr.bounce = 0.5;
    e.a.playOnce(poseName('pose-twirl', 'ready'), 0.6); e.a.squash(0.3);
    particles.burst(e.x, e.y - e.a.height * 0.5, { type: 'smoke', count: 12, speed: [80, 220], size: [24, 40] });
    particles.burst(e.x, e.y - e.a.height * 0.6, { type: 'sparkle', count: 10, colors: RAINBOW, speed: [100, 260] });
    snd('gg-costume', 'pt-poof', { vol: 0.8 }); sfx('sparkle', { vol: 0.5 });
    if (chance(0.5)) e.a.say(pick(['Ta-da!', 'Ooh!', 'So fancy!']), 1.2, null);
  }

  pop(e, str, color, size) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    const a = e.a, lvl = e.popN % 3;
    particles.popText(e.x + (lvl === 1 ? 36 : lvl === 2 ? -36 : 0), a.y - a.height - 30 - lvl * 50, str, color, size);
  }

  // ------------------------------------------------------------- Molly Easy
  /** Easy (A only): walk to the nearest white ghost / shy window nobody else is after. */
  easyThink(e, dt) {
    const au = e.auto;
    au.t -= dt;
    const T = au.target;
    const ok = T && (T.kind === 'ghost' ? !T.g0.col && (this.tickleable(T.g0) || T.g0.state === 'enter') : T.w.shy);
    if (!ok || au.t <= 0) {
      au.t = 0.6;
      let best = null, bu = 0;
      const taken = (fn) => this.ents.some((o) => o !== e && ((o.auto && o.auto.target && fn(o.auto.target)) || (o.target && fn(o.target))));
      const roomLeft = this.ghosts.some((g0) => !g0.col && g0.state !== 'leave');
      for (const g0 of this.ghosts) {
        if (g0.col || (!this.tickleable(g0) && g0.state !== 'enter')) continue;
        let u = 1 / (this.dist(e, g0.x, g0.y) + 150);
        if (taken((t) => t.g0 === g0)) u *= 0.3;
        if (T && T.g0 === g0) u *= 1.5;
        if (u > bu) { bu = u; best = { kind: 'ghost', g0 }; }
      }
      for (const w of this.wins) {
        if (!w.shy) continue;
        let u = (w.peekT > 0 || !roomLeft ? 1.6 : 0.5) / (this.dist(e, w.x, WIN_Y) + 150);
        if (taken((t) => t.w === w)) u *= 0.3;
        if (u > bu) { bu = u; best = { kind: 'win', w }; }
      }
      au.target = best;
    }
    const t = au.target;
    let tx = au.home.x, ty = au.home.y, arrive = 40;
    if (t && t.kind === 'ghost') { tx = t.g0.x + t.g0.vx * 0.25 + (e.x < t.g0.x ? -70 : 70); ty = t.g0.y + 15; arrive = 20; }
    else if (t) { tx = t.w.x; ty = WIN_Y + 25; arrive = 20; }
    tx = clamp(tx, MOVE.x0, MOVE.x1); ty = clamp(ty, MOVE.y0, MOVE.y1);
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    au.ix = 0; au.iy = 0;
    if (d > arrive) { const k = clamp(d / 90, 0, 1); au.ix = (dx / d) * k; au.iy = (dy / d) * k; }
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), c = p.ctrl, lvl = clamp(p.aiLevel || 0, 0, 2);
    const valid = (T) => T && (T.kind === 'ghost' ? !T.g0.col && this.tickleable(T.g0) && !T.g0.dead : T.kind === 'win' ? T.w.shy : T.kind === 'trunk' || T.kind === 'fun' && this.tickleable(T.g0));
    if (!valid(e.target)) e.target = null;
    if (e.brain.ready(dt)) {
      if (chance(prof.mistake)) { e.wander = rand(0.4, 1.0); e.wx = rand(MOVE.x0 + 100, MOVE.x1 - 100); e.wy = rand(MOVE.y0 + 40, MOVE.y1 - 40); e.target = null; }
      else if (chance(0.03)) e.target = { kind: 'trunk', tr: pick(this.trunks) };
      else {
        let best = null, bu = 0;
        const humanNear = (x, y, d) => this.ents.some((o) => !o.p.isAI && this.dist(o, x, y) < d * 0.8);
        const taken = (fn) => this.ents.some((o) => o !== e && o.p.isAI && o.target && fn(o.target));
        const roomLeft = this.ghosts.some((g0) => !g0.col && g0.state !== 'leave');
        for (const g0 of this.ghosts) {
          if (g0.col || !this.tickleable(g0) && g0.state !== 'enter') continue;
          const d = this.dist(e, g0.x, g0.y);
          let u = 1 / (d + 150) * rand(0.8, 1.2);
          if (humanNear(g0.x, g0.y, d)) u *= lvl === 0 ? 0.25 : 0.55;
          if (taken((T) => T.g0 === g0)) u *= 0.25;
          if (u > bu) { bu = u; best = { kind: 'ghost', g0 }; }
        }
        for (const w of this.wins) {
          if (!w.shy) continue;
          const d = this.dist(e, w.x, WIN_Y);
          let u = (w.peekT > 0 || !roomLeft ? 1.6 : 0.5) / (d + 150) * rand(0.8, 1.2);
          if (humanNear(w.x, WIN_Y, d)) u *= lvl === 0 ? 0.3 : 0.6;
          if (taken((T) => T.w === w)) u *= 0.2;
          if (u > bu) { bu = u; best = { kind: 'win', w }; }
        }
        if (!best) {
          const happy = this.ghosts.filter((g0) => g0.col && this.tickleable(g0));
          if (happy.length && chance(0.5)) best = { kind: 'fun', g0: pick(happy) };
        }
        e.target = best; e.aiPress = -1;
      }
      e.brain.wait(reactionTime(p) * 0.6 + rand(0.2, 0.4));
    }
    let tx = null, ty = null, near = false;
    const T = e.target;
    if (e.wander > 0) { e.wander -= dt; tx = e.wx; ty = e.wy; }
    else if (T) {
      if (T.kind === 'ghost' || T.kind === 'fun') { tx = T.g0.x + T.g0.vx * 0.25 + (e.x < T.g0.x ? -70 : 70); ty = T.g0.y + 15; near = this.dist(e, T.g0.x, T.g0.y) < TICKLE_NEAR + 25; }
      else if (T.kind === 'win') { tx = T.w.x; ty = WIN_Y + 25; near = this.dist(e, T.w.x, WIN_Y) < TICKLE_NEAR; }
      else { tx = T.tr.x + (T.tr.x < W / 2 ? 80 : -80); ty = T.tr.y + 40; near = this.dist(e, T.tr.x, T.tr.y + 20) < 120; }
    }
    if (near) {
      if (e.aiPress < 0) e.aiPress = reactionTime(p) * (lvl === 0 ? 0.9 : 0.6);
      e.aiPress -= dt;
      if (e.aiPress <= 0) { c.press('a'); e.aiPress = -1; e.target = null; e.brain.wait(rand(0.2, 0.45)); }
    }
    if (tx === null) { c.move(0, 0); return; }
    steer(p, e.x, e.y, clamp(tx, MOVE.x0, MOVE.x1), clamp(ty, MOVE.y0, MOVE.y1), { arrive: 60 });
  }

  // ------------------------------------------------------------------ finish
  finish() {
    if (this.done) return;
    this.done = true;
    // a rainbow of magic colours every last ghost, and everyone parties
    for (const w of this.wins) if (w.shy) {
      w.shy = false; w.revealT = 2;
      const g0 = this.makeGhost(w.x, GB.y0); g0.z = 260; g0.col = this.nextColor(); this.ghosts.push(g0);
    }
    for (const g0 of this.ghosts) if (!g0.col) g0.col = this.nextColor();
    if (this.party) this.party.final = true;
    else { this.startParty(true); }
    for (const e of this.ents) { e.a.setPose('dance'); }
    const total = this.ents.reduce((s, e) => s + e.score, 0);
    this.api.finish({
      placements: this.ents.map(() => 1),
      stats: this.ents.map((e) => `${e.score} giggle${e.score === 1 ? '' : 's'}`),
      title: 'Ghost Party!',
      solo: total,
      focus: { x: W / 2, y: 700 },
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    this.drawRoomBg(g);
    for (const w of this.wins) this.drawWindow(g, w);
    if (this.party || this.disco > -150) this.drawPartyLights(g);
    const list = [];
    for (const tr of this.trunks) list.push({ y: tr.y, f: () => this.drawTrunkAt(g, tr) });
    for (const e of this.ents) list.push({ y: e.y, f: () => e.a.draw(g, { ring: e.p.color }) });
    for (const g0 of this.ghosts) {
      this.drawGhostShadow(g, g0);
      list.push({ y: g0.y, f: () => this.drawGhost(g, g0) });
    }
    list.sort((A, B) => A.y - B.y);
    for (const it of list) it.f();
    if (this.disco > -150) {
      if (!drawArt(g, 'prop/gg-disco-ball', W / 2, this.disco, 150, 150)) drawDiscoBall(g, W / 2, this.disco, 70, this.t);
      else { g.save(); g.strokeStyle = '#d8c8e0'; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, this.disco - 70); g.stroke(); g.restore(); }
    }
    for (const e of this.ents) {
      const a = e.a;
      ui.playerTag(g, e.p, e.x, a.y - a.height - 26 - (a.emotes.length ? 50 : 0));
    }
    // Molly Easy: a big bouncing A over what A would tickle (white ghost / shy window)
    if (this.easy && !this.party && !this.done) {
      for (const e of this.ents) {
        if (!e.auto) continue;
        const b = this.tickleTarget(e);
        if (!b || (b.kind === 'ghost' && b.g0.col)) continue;
        const y = b.kind === 'ghost' ? b.y - b.g0.z - 190 * DS(b.y) : (b.w.top + b.w.bot) / 2;
        ui.glyph(g, 'a', b.x, y + Math.sin(this.t * 9 + e.i) * 6, 84, { pulse: true });
      }
    }
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 990, format: (v) => String(v) });
    this.drawMeter(g);
    if (this.party && this.party.t < 2.4) {
      g.save(); g.globalAlpha = clamp(2.4 - this.party.t, 0, 1);
      ui.banner(g, 'Ghost Party!', this.party.t, { y: 330, size: 150, color: '#ff8fd0' });
      g.restore();
    } else if (!this.party && this.waveBannerT !== undefined && this.waveBannerT < 1.8 && !this.done) {
      g.save(); g.globalAlpha = clamp(1.8 - this.waveBannerT, 0, 1);
      ui.banner(g, 'More ghosts!', this.waveBannerT, { y: 330, size: 110, color: '#ffffff' });
      g.restore();
    }
  }

  /** Top-right: one little ghost per ghost in this wave; they colour in as you tickle. */
  drawMeter(g) {
    const wave = this.ghosts.filter((g0) => g0.state !== 'leave' && g0.wave === this.wave);
    const items = wave.map((g0) => g0.col);
    for (const w of this.wins) if (w.shy) items.push(null);
    if (!items.length) return;
    items.sort((A, B) => (B ? 1 : 0) - (A ? 1 : 0));
    const n = items.length, sz = n > 10 ? 40 : 48, gap = sz * 0.95;
    const w = n * gap + 40, x0 = W - 40 - w;
    ui.panel(g, x0, 22, w, 84, { r: 40, fill: 'rgba(255,255,255,0.88)', stroke: NAVY, lineWidth: 4 });
    items.forEach((col, i) => {
      g.save(); g.translate(x0 + 20 + gap * (i + 0.5), 64 + (col ? Math.sin(this.t * 6 + i) * 3 : 0));
      const img = tintedArt('prop/gg-ghost', col);
      if (img) g.drawImage(img, -sz / 2, -sz * 0.62, sz, sz * 1.25);
      else drawGhostShape(g, sz * 0.9, col, { t: this.t + i, giggle: !!col });
      g.restore();
    });
  }

  drawRoomBg(g) {
    const bg = art('bg/ghost-giggles');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      if (!this.bgCache) {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        drawRoom(c.getContext('2d'), W, H);
        this.bgCache = c;
      }
      g.drawImage(this.bgCache, 0, 0);
      drawFire(g, FIRE.x, FIRE.y - 4, this.t);
    }
    if (this.party || this.disco > -150) {
      const k = clamp((this.disco + 160) / 390, 0, 1);
      g.save(); g.globalAlpha = 0.38 * k; g.fillStyle = '#1a0f3a'; g.fillRect(0, 0, W, H); g.restore();
    }
  }

  drawPartyLights(g) {
    const k = clamp((this.disco + 160) / 390, 0, 1);
    if (k <= 0.02) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.5 + Math.sin(this.t * 0.9 + i * 0.9) * 1.0;
      const len = 1100;
      g.globalAlpha = 0.16 * k;
      g.fillStyle = RAINBOW[i % RAINBOW.length];
      g.beginPath(); g.moveTo(W / 2, this.disco);
      g.lineTo(W / 2 + Math.cos(a - 0.07) * len, this.disco + Math.sin(a - 0.07) * len);
      g.lineTo(W / 2 + Math.cos(a + 0.07) * len, this.disco + Math.sin(a + 0.07) * len);
      g.closePath(); g.fill();
    }
    // light spots on the floor
    for (let i = 0; i < 12; i++) {
      const x = W / 2 + Math.cos(this.t * 0.8 + i * 0.52) * (300 + (i % 3) * 200), y = 760 + Math.sin(this.t * 1.1 + i) * 150;
      g.globalAlpha = 0.22 * k; g.fillStyle = RAINBOW[i % RAINBOW.length];
      g.beginPath(); g.ellipse(x, y, 70, 24, 0, 0, TAU); g.fill();
    }
    g.restore();
  }

  drawWindow(g, w) {
    // shy ghost peeking between the curtains (drawn behind them)
    if (w.shy && w.open > 0.05) {
      const k = clamp(w.open / 0.22, 0, 1);
      const cy = (w.top + w.bot) / 2 + 30 + (1 - k) * 30;
      // prop/gg-ghost-peek (160x200, drawn 110x140) is cut straight down its left side (art
      // x 5): that edge tucks 10px behind the left curtain's painted edge over the ghost's
      // whole height (the tie-back is the narrowest point), so it peeks round the curtain.
      // The code-drawn ghost is whole, so it stays in the middle of the gap.
      const peekArt = art('prop/gg-ghost-peek');
      const x = peekArt ? curtainInnerX(w, w.open, cy - 66, cy + 70) - 10 + 55 - 5 * 110 / 160 : w.x;
      g.save(); g.translate(x, cy);
      g.rotate(Math.sin(this.t * 4) * (peekArt ? 0.04 : 0.08));
      if (peekArt) g.drawImage(peekArt, -55, -70, 110, 140);
      else drawGhostShape(g, 96, null, { t: this.t, shy: true, look: Math.sin(this.t * 2) });
      g.restore();
    }
    drawCurtains(g, w, w.open, this.t);
    if (w.shy) {
      // twinkle + a bouncing arrow when they're the ones left (or peeking)
      const roomLeft = this.ghosts.some((g0) => !g0.col && g0.state !== 'leave');
      if (w.peekT > 0 || !roomLeft) {
        const b = Math.abs(Math.sin(this.t * 6)) * 18;
        g.save(); g.translate(w.x, w.bot + 40 + b);
        g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(0, -34); g.lineTo(26, 0); g.lineTo(10, 0); g.lineTo(10, 30); g.lineTo(-10, 30); g.lineTo(-10, 0); g.lineTo(-26, 0); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      if (Math.sin(this.t * 3 + w.x) > 0.6) { g.save(); g.translate(w.x + 90, w.top + 20); drawSparkleShape(g, 26, '#fff6a8'); g.restore(); }
    }
  }

  drawTrunkAt(g, tr) {
    g.save(); g.translate(tr.x, tr.y);
    g.scale(1 + tr.bounce * 0.2, 1 - tr.bounce * 0.2);
    if (!drawArt(g, 'prop/gg-trunk', 0, 0, 210, 168, { anchor: 'bottom' })) drawTrunk(g, 0, 0, 0, this.t);
    g.restore();
  }

  drawGhostShadow(g, g0) {
    const s = DS(g0.y);
    g.save(); g.globalAlpha = 0.22 * g0.alpha * clamp(1 - g0.z / 600, 0.2, 1);
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(g0.x, g0.y, 52 * s, 14 * s, 0, 0, TAU); g.fill();
    g.restore();
  }

  drawGhost(g, g0) {
    if (g0.state === 'enter' && g0.t < 0) return;
    const s = DS(g0.y) * (this.n > 4 ? 0.92 : 1);
    const w = 120 * s;
    const bob = Math.sin(this.t * 3 + g0.seed) * 8;
    g.save();
    g.globalAlpha = g0.alpha * (g0.state === 'enter' && g0.fromFire ? clamp(g0.t / 0.25, 0, 1) : 1);
    g.translate(g0.x, g0.y - g0.z - 50 * s + bob);
    g.rotate(g0.spin + clamp(g0.vx / 1500, -0.25, 0.25));
    g.scale(1 + g0.sq * 0.35, 1 - g0.sq * 0.35);
    const giggle = g0.giggleT > 0;
    if (g0.col && g0.col.rainbow || (g0.col && giggle)) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= 0.35;
      const gr = g.createRadialGradient(0, 0, 5, 0, 0, w);
      gr.addColorStop(0, g0.col.c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w, 0, TAU); g.fill(); g.restore();
    }
    const img = tintedArt(giggle ? 'prop/gg-ghost-giggle' : 'prop/gg-ghost', g0.col) || (giggle && tintedArt('prop/gg-ghost', g0.col));
    if (img) { if (g0.vx < -20) g.scale(-1, 1); g.drawImage(img, -w * 0.62, -w * 0.78, w * 1.25, w * 1.56); }
    else drawGhostShape(g, w, g0.col, { t: this.t + g0.seed, giggle, blink: g0.blink < 0, look: g0.look });
    g.restore();
  }
}
