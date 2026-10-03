// Fairy Garden (Play Studio, cooperative): everyone shares one magic garden.
// Walk around, plant seeds (LB/RB picks the kind), water them, sing to them
// (X) and sprinkle fairy dust (Y). Plants grow through four stages; blooms
// glow and attract little fairies. The sky turns day -> sunset -> night;
// at night fireflies come out and everyone catches them in jars. Finale: a
// night fairy dance with petal fireworks.
import { W, H } from '../engine/canvas.js';
import { Actor, getBaseImage } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, sfxLoop, voice, hasSound } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { drawNpcSprite } from '../engine/npc-art.js';
import { drawHost, hostBubble } from '../engine/host.js';
import { aiProfile, reactionTime, steer, Brain } from '../engine/ai.js';
import { charById } from '../data/characters.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU, dist, later } from '../engine/util.js';
import { drawSparkleShape, drawStarShape, drawHeartShape } from '../engine/emotes.js';

const NAVY = '#24163f';
function snd(key, fallback, opts) { if (hasSound(key)) sfx(key, opts); else if (fallback) sfx(fallback, opts); }

// Cached soft glow sprites (one radial gradient per color, reused every frame).
const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 3, 64, 64, 64);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
  }
  return c;
}
function glow(g, color, x, y, r, alpha = 1) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= alpha;
  g.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  g.restore();
}

// ---------------------------------------------------------------------------
// Seeds

const SEEDS = [
  { id: 'rose', name: 'Rose', color: '#ff4d7a', h: 120 },
  { id: 'sunflower', name: 'Sunflower', color: '#ffc21f', h: 165 },
  { id: 'star-bloom', name: 'Star-bloom', color: '#7fd3ff', h: 125 },
  { id: 'rainbow-tulip', name: 'Rainbow Tulip', color: '#ff8fd0', h: 120 },
  { id: 'glow-mushroom', name: 'Glow Mushroom', color: '#5ff0d0', h: 95 },
  { id: 'crystal-flower', name: 'Crystal Flower', color: '#c49bff', h: 130 },
];
const STAGE_NAMES = ['seed', 'sprout', 'bud', 'bloom'];

function leaf(g, x, y, len, ang, color = '#4cc95a') {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = color;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -len * 0.35, len, 0); g.quadraticCurveTo(len * 0.5, len * 0.35, 0, 0); g.fill(); g.stroke();
  g.restore();
}

/**
 * Draw a plant with its base at (x, y). stage 0..3, k = growth within the
 * stage (for a smooth grow), glow 0..1 (night), t time, sq squash spring.
 */
function drawPlant(g, kind, stage, x, y, s, t, o = {}) {
  const seed = SEEDS[kind];
  // Blooms cross-fade to their glowing night art as the sky darkens (o.night).
  const night = stage === 3 ? Math.max(o.night || 0, o.glow > 0.5 ? 1 : 0) : 0;
  const key = `prop/plant-${seed.id}-${night >= 1 ? 'glow' : ['seed', 'sprout', 'bud', 'bloom'][stage]}`;
  const grow = o.grow ?? 1;
  g.save(); g.translate(x, y);
  const sq = o.sq || 0;
  g.scale(s * (1 + sq * 0.5), s * (1 - sq * 0.5));
  const sway = Math.sin(t * 1.6 + (o.seed || 0)) * 0.05;
  g.rotate(sway * (stage > 0 ? 1 : 0));
  // Seeds occupy only the bottom 52 pixels of a 256-square canvas; their
  // planted base is at y=253, so preserve the canvas instead of shrinking it.
  const box = stage === 0 ? [256, 256] : [seed.h * 1.1, seed.h * 1.25];
  if (drawArt(g, key, 0, stage === 0 ? 3 : 0, box[0], box[1], { anchor: 'bottom' })) {
    if (night > 0 && night < 1) drawArt(g, `prop/plant-${seed.id}-glow`, 0, 0, seed.h * 1.1, seed.h * 1.25, { anchor: 'bottom', alpha: night });
    g.restore(); return;
  }
  g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
  if (stage === 0) {
    // little seed peeking from the soil with a sparkle
    g.fillStyle = '#b07a43'; g.beginPath(); g.ellipse(0, -6, 11, 8, 0.3, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = seed.color; g.beginPath(); g.arc(-3, -8, 3, 0, TAU); g.fill();
    g.save(); g.translate(10, -20); g.scale(0.5 + Math.sin(t * 5) * 0.2, 0.5 + Math.sin(t * 5) * 0.2); drawSparkleShape(g, 18, '#ffffff'); g.restore();
    g.restore(); return;
  }
  if (seed.id === 'glow-mushroom') { drawMushroom(g, stage, grow, t, o); g.restore(); return; }
  const H1 = seed.h;
  const stemH = stage === 1 ? 26 + 10 * grow : stage === 2 ? 55 + 25 * grow : H1 * (0.85 + 0.15 * grow);
  // stem
  g.strokeStyle = '#2f8f3a'; g.lineWidth = stage === 3 ? 7 : 5;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(6, -stemH * 0.5, 0, -stemH); g.stroke();
  g.lineWidth = 3; g.strokeStyle = NAVY;
  if (stage === 1) {
    leaf(g, 0, -stemH, 22 + 8 * grow, -0.5); leaf(g, 0, -stemH, 22 + 8 * grow, Math.PI + 0.5);
    g.restore(); return;
  }
  leaf(g, 2, -stemH * 0.35, 30, -0.35); leaf(g, 0, -stemH * 0.5, 28, Math.PI + 0.4);
  if (stage === 2) {
    // closed bud in the flower's color
    g.translate(0, -stemH);
    g.fillStyle = '#4cc95a';
    g.beginPath(); g.ellipse(0, 4, 12, 9, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = seed.color;
    g.beginPath(); g.moveTo(-11, 0); g.quadraticCurveTo(-12, -24, 0, -30 - 6 * grow); g.quadraticCurveTo(12, -24, 11, 0); g.closePath(); g.fill(); g.stroke();
    g.restore(); return;
  }
  // bloom
  g.translate(0, -stemH);
  const open = o.open ?? 1;
  const glowK = o.glow || 0;
  if (glowK > 0.05) glow(g, seed.color, 0, 0, 70, glowK * (0.55 + 0.15 * Math.sin(t * 3 + (o.seed || 0))));
  g.scale(open, open);
  switch (seed.id) {
    case 'rose': {
      g.fillStyle = '#e8365e';
      g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ff6f92';
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; g.beginPath(); g.arc(Math.cos(a) * 12, Math.sin(a) * 12, 13, 0, TAU); g.fill(); g.stroke(); }
      g.fillStyle = '#ff9ab2'; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#c4204a'; g.lineWidth = 2.5; g.beginPath(); g.arc(1, 1, 5, 0, Math.PI * 1.5); g.stroke();
      break;
    }
    case 'sunflower': {
      g.fillStyle = '#ffd23f';
      for (let i = 0; i < 14; i++) { g.save(); g.rotate(i * TAU / 14 + t * 0.1); g.beginPath(); g.ellipse(0, -26, 8, 18, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
      g.fillStyle = '#7a4a1e'; g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#4d2c10';
      for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 4 + (i % 3) * 4; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 2, 0, TAU); g.fill(); }
      // happy face
      g.strokeStyle = '#ffd23f'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 3, 8, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      break;
    }
    case 'star-bloom': {
      g.save(); g.rotate(Math.sin(t * 2 + (o.seed || 0)) * 0.15);
      g.fillStyle = '#9fe2ff';
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 13 : 32; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill(); g.stroke();
      g.restore();
      g.save(); g.translate(22, -22); g.scale(0.5 + 0.3 * Math.sin(t * 6), 0.5 + 0.3 * Math.sin(t * 6)); drawSparkleShape(g, 22, '#ffffff'); g.restore();
      break;
    }
    case 'rainbow-tulip': {
      const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'];
      g.save();
      g.beginPath(); g.moveTo(-22, -6); g.lineTo(-24, -34); g.lineTo(-12, -24); g.lineTo(0, -40); g.lineTo(12, -24); g.lineTo(24, -34); g.lineTo(22, -6); g.quadraticCurveTo(0, 18, -22, -6); g.closePath();
      g.save(); g.clip();
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(-26 + i * 9, -44, 9.5, 64); });
      g.restore();
      g.stroke();
      g.restore();
      break;
    }
    case 'crystal-flower': {
      for (let i = 0; i < 6; i++) {
        g.save(); g.rotate(i * TAU / 6);
        g.fillStyle = i % 2 ? 'rgba(196,155,255,0.85)' : 'rgba(150,230,255,0.85)';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-9, -18); g.lineTo(0, -34); g.lineTo(9, -18); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(0, -6); g.lineTo(-4, -18); g.lineTo(0, -28); g.closePath(); g.fill();
        g.restore();
      }
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.stroke();
      if (Math.sin(t * 3 + (o.seed || 0)) > 0.7) { g.save(); g.translate(-18, -26); drawSparkleShape(g, 20, '#ffffff'); g.restore(); }
      break;
    }
    default: break;
  }
  g.restore();
}

function drawMushroom(g, stage, grow, t, o) {
  const glowK = o.glow || 0;
  const sz = stage === 1 ? 0.45 + 0.15 * grow : stage === 2 ? 0.7 + 0.15 * grow : 1;
  const one = (x, s, hue) => {
    g.save(); g.translate(x, 0); g.scale(s, s);
    g.fillStyle = '#fff3dc'; g.beginPath(); g.moveTo(-9, 0); g.quadraticCurveTo(-7, -26, -6, -40); g.lineTo(6, -40); g.quadraticCurveTo(7, -26, 9, 0); g.closePath(); g.fill(); g.stroke();
    if (glowK > 0.05 || stage === 3) glow(g, hue, 0, -44, 60, Math.max(glowK, 0.25) * (0.6 + 0.2 * Math.sin(t * 3 + x)));
    g.fillStyle = hue;
    g.beginPath(); g.moveTo(-36, -38); g.quadraticCurveTo(-30, -78, 0, -80); g.quadraticCurveTo(30, -78, 36, -38); g.quadraticCurveTo(0, -30, -36, -38); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [sx, sy, r] of [[-16, -58, 6], [6, -66, 5], [20, -50, 4], [-2, -48, 3.5]]) { g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill(); }
    g.restore();
  };
  if (stage === 3) { one(-34, 0.5, '#c49bff'); one(32, 0.42, '#ff8fd0'); }
  one(0, sz, '#3fe0c0');
}

function drawSeedIcon(g, kind, x, y, s, t = 0) {
  g.save(); g.translate(x, y);
  // a tiny bloom
  drawPlant(g, kind, 3, 0, s * 0.55, s / SEEDS[kind].h * 0.95, t, { open: 1, seed: kind });
  g.restore();
}

function drawCan(g, x, y, s, tilt = 0) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  if (drawArt(g, 'prop/watering-can', 0, 0, s * 1.4, s * 1.4)) { g.restore(); return; }
  g.lineWidth = Math.max(2, s * 0.07); g.strokeStyle = NAVY; g.lineJoin = 'round';
  g.fillStyle = '#7fd3ff';
  // spout
  g.beginPath(); g.moveTo(s * 0.3, -s * 0.05); g.lineTo(s * 0.85, -s * 0.42); g.lineTo(s * 0.92, -s * 0.32); g.lineTo(s * 0.38, s * 0.12); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#5bb8f0'; g.beginPath(); g.ellipse(s * 0.9, -s * 0.38, s * 0.07, s * 0.12, -0.6, 0, TAU); g.fill(); g.stroke();
  // body
  g.fillStyle = '#7fd3ff'; ui.roundRect(g, -s * 0.38, -s * 0.3, s * 0.7, s * 0.6, s * 0.14); g.fill(); g.stroke();
  // handle
  g.beginPath(); g.arc(-s * 0.05, -s * 0.32, s * 0.24, Math.PI, TAU); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-s * 0.05, 0, s * 0.1, 0, TAU); g.fill();
  g.restore();
}

function drawJar(g, x, y, s, count, t) {
  g.save(); g.translate(x, y);
  g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = NAVY;
  // glow
  if (count > 0) glow(g, '#fff58c', 0, 0, s * (0.7 + Math.min(1, count / 8) * 0.6), 0.75);
  g.fillStyle = 'rgba(210,240,255,0.45)';
  ui.roundRect(g, -s * 0.32, -s * 0.38, s * 0.64, s * 0.76, s * 0.16); g.fill(); g.stroke();
  g.fillStyle = '#c98a4f'; ui.roundRect(g, -s * 0.36, -s * 0.5, s * 0.72, s * 0.16, s * 0.05); g.fill(); g.stroke();
  for (let i = 0; i < Math.min(count, 10); i++) {
    const a = t * 2 + i * 2.3, r = s * 0.16;
    g.fillStyle = '#fff6a0';
    g.beginPath(); g.arc(Math.cos(a) * r * (0.6 + (i % 3) * 0.2), Math.sin(a * 1.3) * r * 1.3, s * 0.06, 0, TAU); g.fill();
  }
  g.restore();
}

/** Tiny procedural garden fairy (Garden Fairy NPC stand-in). */
const FAIRY_COLORS = ['#ff8fd0', '#7fd3ff', '#ffd23f', '#7fe0a8', '#c49bff'];
const FAIRY_SETS = ['garden-fairy-pink', 'garden-fairy-blue', 'garden-fairy-yellow', 'garden-fairy-green', 'garden-fairy-purple'];
function drawFairy(g, x, y, s, t, color, glowK = 0.4, facing = 1, twirl = 0) {
  // Garden Fairy sprite set for this color (procedural fairy until it loads).
  const set = FAIRY_SETS[FAIRY_COLORS.indexOf(color)] || FAIRY_SETS[0];
  glow(g, color, x, y, s * 1.6, 0.35 + glowK * 0.5);
  if (drawNpcSprite(g, set, x, y + s * 1.15, s * 2.8, twirl > 0 ? 1.2 - twirl : t, {
    pose: twirl > 0 ? 'celebrate' : 'fly', facing,
  })) return;
  g.save(); g.translate(x, y); g.scale(facing, 1);
  // wings
  const flap = Math.abs(Math.sin(t * 22));
  g.fillStyle = 'rgba(230,250,255,0.85)'; g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    g.save(); g.scale(side, 0.4 + flap * 0.6);
    g.beginPath(); g.ellipse(s * 0.55, -s * 0.35, s * 0.55, s * 0.32, -0.5, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  // body (dress)
  g.lineWidth = 2; g.strokeStyle = NAVY;
  g.fillStyle = color;
  g.beginPath(); g.moveTo(-s * 0.3, s * 0.05); g.lineTo(s * 0.3, s * 0.05); g.lineTo(s * 0.42, s * 0.6); g.quadraticCurveTo(0, s * 0.72, -s * 0.42, s * 0.6); g.closePath(); g.fill(); g.stroke();
  // head
  g.fillStyle = '#ffe2c8'; g.beginPath(); g.arc(0, -s * 0.25, s * 0.32, 0, TAU); g.fill(); g.stroke();
  // flower cap
  g.fillStyle = color;
  g.beginPath(); g.arc(0, -s * 0.4, s * 0.3, Math.PI, TAU); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-s * 0.1, -s * 0.22, s * 0.045, 0, TAU); g.arc(s * 0.1, -s * 0.22, s * 0.045, 0, TAU); g.fill();
  g.restore();
}

// Soil plot art plus wet / night tinted copies (built once from the art).
const plotCache = {};
function plotArt(v) {
  const img = art('prop/garden-plot');
  if (!img) return null;
  if (v === 'dry') return img;
  if (!plotCache[v]) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = v === 'wet' ? 'rgba(45,20,8,0.38)' : 'rgba(22,16,52,0.6)';
    x.fillRect(0, 0, c.width, c.height);
    plotCache[v] = c;
  }
  return plotCache[v];
}

function drawFirefly(g, x, y, t, ph, k = 1) {
  if (drawArt(g, 'prop/firefly', x, y, 46 * k, 46 * k)) return;
  const tw = 0.6 + 0.4 * Math.sin(t * 6 + ph);
  glow(g, '#fffa96', x, y, 30 * k, 0.95 * tw);
  g.fillStyle = '#fffbd0'; g.beginPath(); g.arc(x, y, 4.5 * k, 0, TAU); g.fill();
  g.fillStyle = 'rgba(220,240,255,0.7)';
  const f = Math.abs(Math.sin(t * 30 + ph));
  g.beginPath(); g.ellipse(x - 5 * k, y - 4 * k, 5 * k, 2.5 * k * f + 0.5, -0.6, 0, TAU); g.ellipse(x + 5 * k, y - 4 * k, 5 * k, 2.5 * k * f + 0.5, 0.6, 0, TAU); g.fill();
}

// ---------------------------------------------------------------------------

export const meta = {
  id: 'fairy-garden',
  title: 'Fairy Garden',
  category: 'studio',
  type: 'Cooperative · Grow it together',
  goal: 'Plant magic seeds, water them and watch them bloom — then catch fireflies at night!',
  controls: [['stick', 'Walk'], ['a', 'Plant / water / catch'], ['rb', 'Pick a seed (LB / RB)'], ['x', 'Sing to plants'], ['y', 'Fairy dust']],
  tips: ['A blue drop means a plant is thirsty — water it!', 'Singing and fairy dust make plants grow faster.', 'When night falls, press A next to a firefly to catch it.'],
  music: 'chill',
  duration: 'About 2 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
  drawIcon(g, x, y, w, h, t) {
    const s = h / 200;
    // dusk sky
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#2b2a7a'); gr.addColorStop(0.55, '#c76fb8'); gr.addColorStop(1, '#ffc88a');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    for (let i = 0; i < 12; i++) {
      g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i);
      g.translate(x + ((i * 97) % w), y + ((i * 41) % (h * 0.4))); drawSparkleShape(g, 10 * s, '#ffffff'); g.restore();
    }
    g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(x + w * 0.82, y + h * 0.2, 16 * s, 0, TAU); g.fill();
    g.fillStyle = '#2b2a7a'; g.beginPath(); g.arc(x + w * 0.82 + 7 * s, y + h * 0.18, 14 * s, 0, TAU); g.fill();
    // hill
    g.fillStyle = '#3f8f5a'; g.beginPath(); g.ellipse(x + w / 2, y + h * 1.05, w * 0.75, h * 0.42, 0, 0, TAU); g.fill();
    // flowers
    const kinds = [1, 0, 2, 3, 5, 4];
    kinds.forEach((k, i) => {
      const fx2 = x + w * (0.12 + i * 0.155), fy = y + h * (0.9 - Math.sin((i / 5) * Math.PI) * 0.1);
      drawPlant(g, k, 3, fx2, fy, s * 0.62, t, { glow: 0.8, seed: i });
    });
    // fairy & fireflies
    drawFairy(g, x + w * 0.5 + Math.cos(t * 1.5) * 30 * s, y + h * 0.36 + Math.sin(t * 3) * 8 * s, 18 * s, t, '#ff8fd0', 0.8);
    for (let i = 0; i < 6; i++) drawFirefly(g, x + w * (0.1 + ((i * 0.37 + t * 0.03) % 0.8)), y + h * (0.4 + 0.25 * Math.sin(t + i * 2)), t, i, s * 1.2);
    // watering can
    drawCan(g, x + w * 0.16, y + h * 0.48, 34 * s, -0.4 + Math.sin(t * 2) * 0.1);
    ui.text(g, 'Fairy Garden', x + w / 2, y + h * 0.1, { size: h * 0.11, color: '#ffffff', maxWidth: w * 0.9 });
  },
};

// ---------------------------------------------------------------------------

const GROUND_TOP = 330;
const MOVE_TOP = 395, MOVE_BOTTOM = 1050;
const SPEED = 400;
const DAY_MAX = 170;        // seconds before sunset no matter what
const SUNSET_LEN = 8;
const NIGHT_LEN = 24;
const FINALE_LEN = 9.5;

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.phase = 'day';
    this.phaseT = 0;
    this.tod = 0;            // 0 day, 1 sunset, 2 night
    this.finished = false;
    // Plots
    const cols = n <= 2 ? 6 : n <= 5 ? 8 : 10, rows = n <= 2 ? 2 : 3;
    const rowY = rows === 2 ? [610, 850] : [520, 720, 920];
    const x0 = rows === 2 ? 330 : cols === 10 ? 200 : 250, x1 = W - x0;
    this.plots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      this.plots.push({
        i: this.plots.length, x: x0 + (c * (x1 - x0)) / (cols - 1) + (r % 2 ? 18 : -18), y: rowY[r],
        kind: -1, stage: 0, grow: 0, water: 0, sing: 0, dust: 0, sq: 0, sv: 0, open: 1, bloomT: 0,
        planter: -1, claimed: -1, seed: rand(10), fairy: null, thirstyT: rand(2),
      });
    }
    this.plotScale = rows === 2 ? 1.35 : cols === 10 ? 1.05 : 1.18;
    // Players
    const sc = n <= 4 ? 0.9 : 0.76;
    this.movers = this.players.map((p, i) => {
      const a = new Actor(p, { scale: sc, x: W / 2 + (i - (n - 1) / 2) * Math.min(170, (W - 300) / n), y: rows === 2 ? 730 : 620 });
      a.facing = i < n / 2 ? 1 : -1; a.snap();
      const m = {
        p, i, a, seed: i % SEEDS.length, canT: 0, castT: 0, singCD: 0, dustCD: 0, jar: 0,
        planted: 0, watered: 0, sung: 0, chipPop: 0, seedPop: 0, target: null,
        brain: new Brain(p), ai: { task: null, t: rand(0.3, 1), seedWant: null, admire: 0 },
      };
      a.attach((g, info) => this.drawHeld(g, info, m));
      return m;
    });
    this.fairies = [];
    this.fireflies = [];
    this.fireflyTotal = 0;
    this.notes = [];
    this.stars = Array.from({ length: 70 }, () => ({ x: rand(W), y: rand(0, GROUND_TOP - 40), r: rand(1, 3), ph: rand(TAU) }));
    this.clouds = Array.from({ length: 5 }, (_, i) => ({ x: rand(W), y: rand(60, 220), s: rand(0.6, 1.1), v: rand(8, 20) }));
    this.butterflies = Array.from({ length: 4 }, () => ({ x: rand(W), y: rand(400, 1000), ph: rand(TAU), c: pick(['#ff8fd0', '#ffd23f', '#7fd3ff']) }));
    this.say('Plant seeds and water them!', 4);
    sfx('magic');
  }

  say(text, dur = 3.5) { this.bubble = { text, t: 0, dur }; }

  // ---- helpers ------------------------------------------------------------
  feet(m) { return { x: m.a.x, y: m.a.y }; }
  nearestPlot(m, maxD = 120) {
    let best = null, bd = maxD;
    for (const pl of this.plots) {
      const d = Math.hypot(pl.x - m.a.x, (pl.y - m.a.y) * 1.3);
      if (d < bd) { bd = d; best = pl; }
    }
    return best;
  }
  bloomCount() { return this.plots.filter((p) => p.kind >= 0 && p.stage === 3).length; }
  plantedCount() { return this.plots.filter((p) => p.kind >= 0).length; }

  // ---- update ---------------------------------------------------------------
  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > W + 200) c.x = -200; }
    for (const b of this.butterflies) { b.ph += dt; b.x += Math.cos(b.ph * 0.5) * 60 * dt; b.y += Math.sin(b.ph * 0.8) * 40 * dt; if (b.x > W + 40) b.x = -40; if (b.x < -40) b.x = W + 40; b.y = clamp(b.y, 380, 1040); }

    // Day / night clock
    if (this.phase === 'day') {
      const full = this.plantedCount() === this.plots.length && this.bloomCount() >= this.plots.length * 0.85;
      if (full) { this.fullT = (this.fullT || 0) + dt; } else this.fullT = 0;
      if (this.fullT > 2.5 || this.phaseT > DAY_MAX) this.startSunset(full);
    } else if (this.phase === 'sunset') {
      this.tod = clamp(this.phaseT / SUNSET_LEN, 0, 1) * 2;
      if (this.phaseT >= SUNSET_LEN) this.startNight();
    } else if (this.phase === 'night') {
      this.tod = 2;
      this.updateFireflySpawns(dt);
      const left = this.fireflies.filter((f) => !f.caught).length;
      if (this.phaseT > NIGHT_LEN || (this.phaseT > 6 && left === 0 && this.fireflySpawned >= this.fireflyTotal)) this.startFinale();
    } else if (this.phase === 'finale') {
      this.updateFinale(dt);
    }
    // crickets fade in with the dark (sunset -> night) and play until the end
    const nightK = clamp(this.tod - 1, 0, 1);
    if (nightK > 0 && !this.crickets && !this.finished) this.crickets = sfxLoop('night-crickets', { vol: 0 });
    if (this.crickets && nightK !== this.cricketK) { this.cricketK = nightK; this.crickets.setVol(0.9 * nightK); }

    for (const m of this.movers) this.updateMover(m, dt);
    for (const pl of this.plots) this.updatePlot(pl, dt);
    this.updateFairies(dt);
    this.updateFireflies(dt);
  }

  updateMover(m, dt) {
    const p = m.p, c = p.ctrl, a = m.a;
    m.canT = Math.max(0, m.canT - dt); m.castT = Math.max(0, m.castT - dt);
    m.singCD -= dt; m.dustCD -= dt; m.seedPop = Math.max(0, m.seedPop - dt);
    if (this.phase === 'finale') { a.update(dt); return; }
    if (p.isAI) this.ai(m, dt);
    // walk
    const sp = SPEED;
    let vx = c.x * sp, vy = c.y * sp * 0.85;
    if (m.canT > 0.35) { vx *= 0.3; vy *= 0.3; }
    a.x = clamp(a.x + vx * dt, 60, W - 60);
    a.y = clamp(a.y + vy * dt, MOVE_TOP, MOVE_BOTTOM);
    a.moveAnim(vx, vy, sp);
    if (Math.hypot(vx, vy) > 60 && chance(dt * 4)) particles.burst(a.x, a.y, { type: 'dust', count: 1, size: [6, 12] });

    // seed choice
    if (c.pressed('rb')) this.setSeed(m, (m.seed + 1) % SEEDS.length);
    if (c.pressed('lb')) this.setSeed(m, (m.seed + SEEDS.length - 1) % SEEDS.length);

    m.target = this.phase === 'night' ? null : this.nearestPlot(m);
    if (c.pressed('a')) this.actionA(m);
    if (c.pressed('x') && m.singCD <= 0) this.sing(m);
    if (c.pressed('y') && m.dustCD <= 0) this.dust(m);
    a.update(dt);
  }

  setSeed(m, i) {
    m.seed = i; m.seedPop = 1.2; m.chipPop = 1;
    sfx('swap');
  }

  actionA(m) {
    const a = m.a;
    // Night: catch a firefly first
    if (this.phase === 'night' || this.phase === 'sunset') {
      const cx = a.x, cy = a.y - a.height * 0.5;
      let best = null, bd = 110;
      for (const f of this.fireflies) {
        if (f.caught) continue;
        const d = Math.hypot(f.x - cx, f.y - cy);
        if (d < bd) { bd = d; best = f; }
      }
      if (best) { this.catchFirefly(m, best); return; }
      if (this.phase === 'night') { a.playOnce('catch', 0.3); sfx('whoosh'); particles.burst(cx + a.facing * 40, cy, { type: 'sparkle', count: 3 }); return; }
    }
    const pl = m.target;
    if (!pl) { a.playOnce('action', 0.25); sfx('blip'); return; }
    a.facing = pl.x >= a.x ? 1 : -1;
    if (pl.kind < 0) this.plant(m, pl);
    else if (pl.stage < 3) this.water(m, pl);
    else this.admire(m, pl);
  }

  plant(m, pl) {
    pl.kind = m.seed; pl.stage = 0; pl.grow = 0; pl.water = 0.3; pl.planter = m.i; pl.claimed = -1;
    pl.plantedAt = this.t;
    pl.sv += 6;
    m.planted++;
    m.a.playOnce('action', 0.4);
    particles.burst(pl.x, pl.y - 10, { type: 'dust', count: 8 });
    particles.burst(pl.x, pl.y - 20, { type: 'sparkle', count: 6, colors: [SEEDS[m.seed].color, '#ffffff'] });
    particles.popText(pl.x, pl.y - 60, SEEDS[m.seed].name + '!', SEEDS[m.seed].color, 34);
    snd('plant-seed', 'pop'); sfx('collect', { step: m.planted % 8 });
  }

  water(m, pl) {
    m.canT = 0.7;
    m.a.playOnce('water', 0.6);
    const before = pl.water;
    pl.water = Math.min(1, pl.water + 0.65);
    m.watered++;
    pl.sv += 3;
    const spout = { x: m.a.x + m.a.facing * m.a.height * 0.45, y: m.a.y - m.a.height * 0.55 };
    for (let i = 0; i < 3; i++) later(() => particles.burst(spout.x, spout.y, { type: 'drop', count: 5, angle: Math.PI / 2 + (m.a.facing > 0 ? -0.6 : 0.6), spread: 0.35, speed: [180, 320], colors: ['#5cc8ff', '#8fe0ff'], size: [4, 8] }), i * 120);
    later(() => { particles.burst(pl.x, pl.y - 8, { type: 'drop', count: 6, angle: -Math.PI / 2, spread: 1.1, speed: [80, 200], colors: ['#8fe0ff', '#ffffff'], size: [3, 6] }); }, 260);
    sfx('water');
    if (before < 0.25) { particles.popText(pl.x, pl.y - 70, 'Ahh!', '#7fd3ff', 30); }
  }

  admire(m, pl) {
    m.a.playOnce('cheer', 0.5);
    particles.burst(pl.x, pl.y - SEEDS[pl.kind].h * this.plotScale, { type: 'heart', count: 4 });
    particles.burst(pl.x, pl.y - SEEDS[pl.kind].h * this.plotScale, { type: 'petal', count: 6, colors: [SEEDS[pl.kind].color, '#ffffff'] });
    pl.sv += 4;
    sfx('sparkle');
  }

  sing(m) {
    m.singCD = 1.4; m.sung++;
    const a = m.a;
    a.playOnce('sing', 1.0);
    const base = pick([60, 62, 64, 67, 69]);
    [0, 4, 7].forEach((d, i) => later(() => sfx('note', { midi: base + 12 + d + (i === 2 && chance(0.5) ? 2 : 0), dur: 0.25, vol: 0.14, force: true }), i * 150));
    const hx = a.x, hy = a.y - a.height;
    particles.burst(hx, hy, { type: 'note', count: 6, colors: ['#ff6fb1', '#9b5cff', '#3fa7ff', '#ffd23f'] });
    particles.ring(a.x, a.y - a.height * 0.4, '#ffd6f0', 240, 0.6);
    for (const pl of this.plots) {
      if (Math.hypot(pl.x - a.x, (pl.y - a.y) * 1.2) < 270 && pl.kind >= 0) {
        pl.sing = 5; pl.sv += 2;
        if (pl.stage < 3) particles.burst(pl.x, pl.y - 30, { type: 'note', count: 1, colors: ['#ff6fb1', '#9b5cff'] });
      }
    }
    for (const f of this.fairies) if (Math.hypot(f.x - a.x, f.y - a.y) < 400) f.twirl = 1.2;
  }

  dust(m) {
    const a = m.a;
    let best = null, bd = 260;
    for (const pl of this.plots) {
      if (pl.kind < 0 || pl.stage >= 3) continue;
      const d = Math.hypot(pl.x - a.x, (pl.y - a.y) * 1.2);
      if (d < bd) { bd = d; best = pl; }
    }
    m.dustCD = 2.2; m.castT = 0.5;
    a.playOnce('cast', 0.45);
    snd('magic', null);
    const hand = { x: a.x + a.facing * a.height * 0.3, y: a.y - a.height * 0.6 };
    if (best) {
      a.facing = best.x >= a.x ? 1 : -1;
      for (let i = 0; i <= 8; i++) {
        const k = i / 8;
        later(() => particles.burst(lerp(hand.x, best.x, k), lerp(hand.y, best.y - 40, k) - Math.sin(k * Math.PI) * 60, { type: 'sparkle', count: 2, colors: ['#fff6a8', '#ffc8f0', '#ffffff'], speed: [10, 60] }), i * 30);
      }
      later(() => {
        best.dust = 3; best.grow += 0.55; best.sv += 5;
        if (best.water < 0.3) best.water = 0.3;
        particles.burst(best.x, best.y - 40, { type: 'star', count: 8, colors: ['#ffd23f', '#fff6a8', '#ffc8f0'] });
      }, 280);
    } else {
      particles.burst(hand.x, hand.y, { type: 'sparkle', count: 12, colors: ['#fff6a8', '#ffc8f0', '#ffffff'] });
    }
  }

  updatePlot(pl, dt) {
    // squash spring
    pl.sv += (-pl.sq * 180 - pl.sv * 12) * dt; pl.sq += pl.sv * dt * 0.06;
    pl.sing = Math.max(0, pl.sing - dt); pl.dust = Math.max(0, pl.dust - dt);
    if (pl.kind < 0) return;
    if (pl.stage < 3) {
      const rate = pl.water > 0 ? 0.26 * (1 + (pl.sing > 0 ? 0.9 : 0) + (pl.dust > 0 ? 0.6 : 0)) : 0;
      pl.grow += rate * dt;
      pl.water = Math.max(0, pl.water - (pl.water > 0 ? 0.09 * dt : 0));
      if (pl.sing > 0 && chance(dt * 2)) particles.burst(pl.x + rand(-20, 20), pl.y - 40, { type: 'note', count: 1, colors: ['#ff6fb1', '#9b5cff', '#3fa7ff'], size: [16, 22] });
      while (pl.grow >= 1 && pl.stage < 3) {
        pl.grow -= 1; pl.stage++;
        pl.sv += 9;
        const top = pl.y - (pl.stage === 3 ? SEEDS[pl.kind].h : 50) * this.plotScale;
        particles.burst(pl.x, top, { type: 'sparkle', count: pl.stage === 3 ? 14 : 6, colors: [SEEDS[pl.kind].color, '#ffffff', '#fff6a8'] });
        if (pl.stage === 3) {
          pl.bloomT = 0; pl.open = 0.2;
          particles.burst(pl.x, top, { type: 'petal', count: 12, colors: [SEEDS[pl.kind].color, '#ffffff'] });
          snd('grow-flower', 'grow');
          sfx('star');
          particles.popText(pl.x, top - 30, 'Bloom!', SEEDS[pl.kind].color, 36);
          // nearby gardeners cheer
          for (const m of this.movers) if (Math.hypot(m.a.x - pl.x, m.a.y - pl.y) < 300 && !m.a._once) m.a.playOnce('cheer', 0.5);
          const fan = this.movers.find((m) => Math.hypot(m.a.x - pl.x, m.a.y - pl.y) < 300 && !m.a.speech);
          if (fan && chance(0.3)) fan.a.say(pick(['So pretty!', 'It bloomed!', 'Wow!', 'Ooh, sparkly!']), 1.6, null);
          // a fairy comes to visit soon
          if (this.fairies.length < 18) later(() => { if (!this.finished) this.spawnFairy(pl); }, rand(600, 1800));
        } else sfx('collect', { step: pl.stage * 3 });
      }
      if (pl.stage >= 3) pl.grow = 1;
      pl.thirstyT += dt;
    } else {
      pl.bloomT += dt;
      pl.open = damp(pl.open, 1, 6, dt);
      if (chance(dt * (this.tod > 1 ? 0.6 : 0.2))) particles.burst(pl.x + rand(-20, 20), pl.y - SEEDS[pl.kind].h * this.plotScale, { type: 'sparkle', count: 1, colors: [SEEDS[pl.kind].color, '#ffffff'] });
    }
  }

  // ---- fairies & fireflies ---------------------------------------------------------
  spawnFairy(pl) {
    const side = chance(0.5) ? -1 : 1;
    this.fairies.push({ x: side < 0 ? -40 : W + 40, y: rand(150, 400), plot: pl, color: pick(FAIRY_COLORS), t: rand(10), ph: rand(TAU), r: rand(36, 56), twirl: 0, facing: 1, arrived: false });
    if (hasSound('npc/fairy/chime')) sfx('npc/fairy/chime');
  }

  updateFairies(dt) {
    for (const f of this.fairies) {
      f.t += dt; f.twirl = Math.max(0, f.twirl - dt);
      let tx, ty;
      if (this.phase === 'finale') {
        const k = this.fairies.indexOf(f) / Math.max(1, this.fairies.length);
        const a = this.phaseT * 1.2 + k * TAU;
        tx = W / 2 + Math.cos(a) * Math.min(760, 260 + this.n * 70); ty = 780 + Math.sin(a) * 90;
      } else {
        const pl = f.plot, top = pl.y - SEEDS[pl.kind].h * this.plotScale - 20;
        const spin = f.t * (f.twirl > 0 ? 6 : 1.6) + f.ph;
        tx = pl.x + Math.cos(spin) * f.r; ty = top + Math.sin(spin * 1.3) * f.r * 0.45;
      }
      const ox = f.x;
      f.x = damp(f.x, tx, f.arrived ? 8 : 1.6, dt); f.y = damp(f.y, ty, f.arrived ? 8 : 1.6, dt);
      if (!f.arrived && Math.hypot(f.x - tx, f.y - ty) < 30) f.arrived = true;
      if (Math.abs(f.x - ox) > 0.3) f.facing = f.x > ox ? 1 : -1;
      if (chance(dt * 3)) particles.trail(f.x, f.y + 6, { type: 'sparkle', colors: [f.color, '#ffffff'], size: [6, 12], speed: [5, 30] });
    }
  }

  startSunset(full) {
    this.phase = 'sunset'; this.phaseT = 0;
    this.say(full ? 'What a beautiful garden! The sun is setting...' : 'Look, the sun is setting...', 4);
    sfx('magic');
    // Fireflies get ready.
    this.fireflyTotal = Math.min(42, 12 + this.n * 4);
    this.fireflySpawned = 0; this.fireflyT = 0;
  }

  startNight() {
    this.phase = 'night'; this.phaseT = 0;
    this.say('Fireflies! Press A next to one to catch it!', 4);
    snd('npc/fairy/chime', 'sparkle');
    for (const m of this.movers) if (!m.a._once) m.a.playOnce('surprised', 0.4);
  }

  updateFireflySpawns(dt) {
    this.fireflyT -= dt;
    if (this.fireflySpawned < this.fireflyTotal && this.fireflyT <= 0) {
      this.fireflyT = 0.25;
      this.fireflySpawned++;
      const pl = pick(this.plots.filter((p) => p.kind >= 0)) || pick(this.plots);
      this.fireflies.push({ x: pl.x + rand(-40, 40), y: pl.y - rand(20, 90), vx: 0, vy: 0, t: rand(10), ph: rand(TAU), caught: false, fly: null, target: -1 });
    }
  }

  updateFireflies(dt) {
    for (const f of this.fireflies) {
      f.t += dt;
      if (f.fly) {
        f.fly.t += dt;
        const k = Math.min(1, f.fly.t / 0.45);
        const m = f.fly.m, a = m.a;
        const jx = a.x + a.facing * a.height * 0.28, jy = a.y - a.height * 0.5;
        f.x = lerp(f.fly.x0, jx, ease.inOutQuad(k)); f.y = lerp(f.fly.y0, jy, ease.inOutQuad(k)) - Math.sin(k * Math.PI) * 50;
        if (k >= 1) { f.done = true; m.jar++; m.chipPop = 1; particles.burst(jx, jy, { type: 'sparkle', count: 6, colors: ['#fff6a0', '#ffffff'] }); sfx('collect', { step: Math.min(14, m.jar) }); }
        continue;
      }
      if (f.caught) continue;
      // drifting wander
      const ax = Math.cos(f.t * 0.9 + f.ph) * 60 + Math.cos(f.t * 2.3 + f.ph * 2) * 30;
      const ay = Math.sin(f.t * 1.1 + f.ph) * 40 + Math.sin(f.t * 2.7) * 20;
      f.vx = damp(f.vx, ax, 2, dt); f.vy = damp(f.vy, ay, 2, dt);
      // shy: drift away a little from very close characters
      for (const m of this.movers) {
        const dx = f.x - m.a.x, dy = f.y - (m.a.y - m.a.height * 0.5), d = Math.hypot(dx, dy);
        if (d < 140 && d > 1) { f.vx += (dx / d) * 40 * dt * 4; f.vy += (dy / d) * 30 * dt * 4; }
      }
      f.x = clamp(f.x + f.vx * dt, 60, W - 60);
      f.y = clamp(f.y + f.vy * dt, MOVE_TOP - 80, MOVE_BOTTOM - 40);
    }
    this.fireflies = this.fireflies.filter((f) => !f.done);
  }

  catchFirefly(m, f) {
    f.caught = true; f.fly = { t: 0, x0: f.x, y0: f.y, m };
    m.a.playOnce('action', 0.35); m.a.squash(0.2);
    particles.burst(f.x, f.y, { type: 'sparkle', count: 8, colors: ['#fff6a0', '#ffffff'] });
    particles.popText(f.x, f.y - 30, 'Got one!', '#fff6a0', 32);
    sfx('sparkle'); snd('firefly-catch', 'pop');
    if (!m.p.isAI && m.jar % 5 === 4) voice(m.p.charId, 'yay');
  }

  // ---- finale ------------------------------------------------------------------------
  startFinale() {
    if (this.phase === 'finale') return;
    this.phase = 'finale'; this.phaseT = 0;
    this.bubble = null;
    sfx('fanfare');
    const n = this.n;
    // Everyone lines up on the front path to dance under the fairies.
    const spacing = Math.min(260, (W - 300) / n);
    this.movers.forEach((m, i) => {
      m.home = { x: W / 2 + (i - (n - 1) / 2) * spacing, y: 1010 - (i % 2) * 24 };
      m.p.isAI && m.p.ctrl.move(0, 0);
    });
    // leftover fireflies join the dance; jars open and lights fly up
    for (const f of this.fireflies) if (!f.caught) f.caught = true;
    if (this.api.camera) this.api.camera.follow(W / 2, 760, 1.1, 0.9);
    // every planted seed blooms for the show
    for (const pl of this.plots) if (pl.kind >= 0 && pl.stage < 3) { pl.stage = 3; pl.open = 0.3; pl.bloomT = 0; pl.sv += 8; }
    // Fairies for any bloom without one
    let k = 0;
    for (const pl of this.plots) if (pl.kind >= 0 && this.fairies.length < 18 && !this.fairies.some((f) => f.plot === pl)) { const p2 = pl; later(() => !this.finished && this.spawnFairy(p2), 200 + k++ * 150); }
  }

  updateFinale(dt) {
    const t = this.phaseT;
    // Finishing early in the day? The sky hurries to night for the dance.
    if (this.tod < 2) this.tod = Math.min(2, this.tod + dt * 0.9);
    for (const m of this.movers) {
      const a = m.a;
      const d = Math.hypot(m.home.x - a.x, m.home.y - a.y);
      if (d > 6) {
        const v = Math.min(d / dt, SPEED * 1.2);
        const vx = ((m.home.x - a.x) / d) * v, vy = ((m.home.y - a.y) / d) * v;
        a.x += vx * dt; a.y += vy * dt;
        a.moveAnim(vx, vy, SPEED);
      } else if (a.pose !== 'dance' && !a._once) { a.setPose('dance'); a.facing = a.x < W / 2 ? 1 : -1; }
      if (m.jar > 0 && t > 2.5 && !m.released) {
        m.released = true;
        for (let i = 0; i < Math.min(m.jar, 12); i++) {
          this.fireflies.push({ x: a.x, y: a.y - a.height * 0.5, vx: rand(-80, 80), vy: rand(-260, -120), t: rand(10), ph: rand(TAU), caught: false, fly: null, free: true });
        }
        sfx('magic');
      }
    }
    for (const f of this.fireflies) if (f.free) { f.y -= 30 * dt; }
    if (t > 2 && chance(dt * 2.2)) {
      const x = rand(220, W - 220), y = rand(120, 340);
      particles.burst(x, y, { type: 'petal', count: 34, speed: [160, 420], colors: pick([['#ff8fd0', '#ffffff', '#ffc8f0'], ['#ffd23f', '#fff6a8', '#ff9f1c'], ['#7fd3ff', '#c49bff', '#ffffff'], RAINBOW]) });
      particles.burst(x, y, { type: 'sparkle', count: 10 });
      snd('petal-firework', 'pop'); if (chance(0.5)) sfx('sparkle');
    }
    if (t > 4.5 && !this.cheered) {
      this.cheered = true; snd('applause', 'cheer');
      for (const m of this.movers) m.a.playOnce('celebrate', 1.5, 'dance');
      pick(this.movers).a.say('Goodnight, garden!', 2.5, 'yay');
    }
    if (t > FINALE_LEN) this.finishGame();
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    if (this.crickets) { this.crickets.stop(1.2); this.crickets = null; }
    const stats = this.movers.map((m) => {
      const bits = [`${m.planted} planted`];
      if (m.jar) bits.push(`${m.jar} firefl${m.jar === 1 ? 'y' : 'ies'}`);
      return bits.join(' · ');
    });
    this.api.finish({ showcase: true, highlight: null, stats, title: 'Magical!', focus: this.phase === 'finale' ? { x: W / 2, y: 880, zoom: 1.25 } : undefined });
  }

  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    for (const m of this.movers) m.a.update(dt);
    this.updateFairies(dt);
    this.updateFireflies(dt);
  }

  destroy() { if (this.crickets) this.crickets.stop(); }

  onDone() {
    if (this.phase === 'finale') this.finishGame();
    else this.startFinale();
  }

  // ---- CPU ---------------------------------------------------------------------------------
  ai(m, dt) {
    const p = m.p, c = p.ctrl, A = m.ai, a = m.a, lvl = p.aiLevel || 0;
    A.t -= dt;
    if (A.admire > 0) { A.admire -= dt; c.move(0, 0); return; }
    // Night: catch fireflies
    if (this.phase === 'night' || this.phase === 'sunset') {
      const cx = a.x, cy = a.y - a.height * 0.5;
      let f = A.fly && !A.fly.caught ? A.fly : null;
      if (!f) {
        const free = this.fireflies.filter((q) => !q.caught && (q.target === -1 || q.target === m.i));
        free.sort((q1, q2) => Math.hypot(q1.x - cx, q1.y - cy) - Math.hypot(q2.x - cx, q2.y - cy));
        f = free[lvl === 0 ? Math.min(free.length - 1, randInt(0, 1)) : 0] || null;
        if (f) { f.target = m.i; A.fly = f; }
      }
      if (!f) { c.move(0, 0); return; }
      const d = steer(p, cx, cy, f.x, f.y, { arrive: 60 });
      if (d < 85 && A.t <= 0) { c.press('a'); A.t = reactionTime(p) + (lvl === 0 ? 0.5 : 0.15); }
      return;
    }
    if (this.phase !== 'day') { c.move(0, 0); return; }
    // Day: pick a task
    const T = A.task;
    const valid = T && (T.kind === 'plant' ? T.pl.kind < 0 : T.kind === 'water' ? (T.pl.stage < 3 && T.pl.water < 0.5) : true);
    if (!valid) {
      if (T && T.pl) T.pl.claimed = -1;
      A.task = null;
      if (A.t > 0) { c.move(0, 0); return; }
      const free = (pl) => pl.claimed === -1 || pl.claimed === m.i;
      const byDist = (list) => list.sort((p1, p2) => Math.hypot(p1.x - a.x, p1.y - a.y) - Math.hypot(p2.x - a.x, p2.y - a.y));
      const thirsty = byDist(this.plots.filter((pl) => pl.kind >= 0 && pl.stage < 3 && pl.water < 0.25 && free(pl)));
      const empty = byDist(this.plots.filter((pl) => pl.kind < 0 && free(pl)));
      const growing = this.plots.filter((pl) => pl.kind >= 0 && pl.stage < 3);
      let task = null;
      if (thirsty.length && (chance(0.6) || !empty.length)) task = { kind: 'water', pl: thirsty[0] };
      else if (empty.length) task = { kind: 'plant', pl: empty[lvl === 0 ? Math.min(empty.length - 1, randInt(0, 2)) : 0] };
      else if (growing.length) task = chance(0.5) ? { kind: 'sing', pl: pick(growing) } : { kind: 'dust', pl: pick(growing) };
      else task = { kind: 'wander', x: rand(200, W - 200), y: rand(MOVE_TOP + 40, MOVE_BOTTOM - 40) };
      if (task.pl) task.pl.claimed = m.i;
      // pick a different seed now and then (a human would too)
      if (task.kind === 'plant' && chance(0.6)) A.seedWant = randInt(0, SEEDS.length - 1);
      A.task = task; A.t = reactionTime(p) * 0.6;
      return;
    }
    // seed switching
    if (T.kind === 'plant' && A.seedWant !== null && A.seedWant !== m.seed) {
      if (A.t <= 0) { c.press('rb'); A.t = 0.25 + rand(0.1, 0.3) * (lvl === 0 ? 2 : 1); }
    } else A.seedWant = null;
    const tx = T.pl ? T.pl.x + (a.x < T.pl.x ? -55 : 55) : T.x;
    const ty = T.pl ? T.pl.y + 20 : T.y;
    const d = steer(p, a.x, a.y, tx, ty, { arrive: 50 });
    if (d < 30) {
      c.move(0, 0);
      if (A.t > 0) return;
      if (T.kind === 'plant' || T.kind === 'water') {
        if (this.nearestPlot(m) === T.pl && (T.kind === 'water' || A.seedWant === null)) {
          c.press('a');
          A.t = reactionTime(p) + 0.3;
          if (T.kind === 'water') { T.pl.claimed = -1; A.task = null; }
          if (chance(lvl === 0 ? 0.18 : 0.08)) { A.admire = rand(0.6, 1.4); }
        }
      } else if (T.kind === 'sing') {
        if (m.singCD <= 0) c.press('x');
        A.task = null; A.t = rand(1.2, 2.4);
      } else if (T.kind === 'dust') {
        if (m.dustCD <= 0) c.press('y');
        A.task = null; A.t = rand(1.0, 2.0);
      } else { A.task = null; A.t = rand(0.5, 1.5); }
    }
    // spontaneous singing when plants are growing nearby
    if (m.singCD <= -4 && chance(dt * 0.15)) {
      const near = this.plots.filter((pl) => pl.kind >= 0 && pl.stage < 3 && Math.hypot(pl.x - a.x, pl.y - a.y) < 260).length;
      if (near >= 2) c.press('x');
    }
  }

  // ---- drawing -------------------------------------------------------------------------------
  skyColors() {
    const day = ['#7fd3ff', '#d8f4ff'], dusk = ['#7a5bd6', '#ffb27f'], night = ['#0f1442', '#3a2d78'];
    const mix = (c1, c2, k) => {
      const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
      const a = p(c1), b = p(c2);
      return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;
    };
    const k = this.tod;
    if (k <= 1) return [mix(day[0], dusk[0], k), mix(day[1], dusk[1], k), k];
    return [mix(dusk[0], night[0], k - 1), mix(dusk[1], night[1], k - 1), k];
  }

  mixColor(c1, c2, k) {
    const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const a = p(c1), b = p(c2);
    return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], clamp(k, 0, 1)))).join(',')})`;
  }

  drawWorld(g) {
    const k = this.tod;
    const night = clamp(k - 1, 0, 1);
    const bgKey = night > 0.5 ? 'bg/fairy-garden-night' : 'bg/fairy-garden';
    const bg = art(bgKey);
    if (bg) {
      // Matching overhead backgrounds leave the lower lawn open for plots.
      const day = art('bg/fairy-garden'), nightBg = art('bg/fairy-garden-night');
      g.drawImage(day || bg, 0, 0, W, H);
      if (nightBg && night > 0) {
        g.save(); g.globalAlpha = night; g.drawImage(nightBg, 0, 0, W, H); g.restore();
      }
      if (k > 0.05 && !art('bg/fairy-garden-night')) { g.save(); g.globalAlpha = Math.min(0.55, k * 0.3); g.fillStyle = k > 1 ? '#10164a' : '#ff9f6f'; g.fillRect(0, 0, W, H); g.restore(); }
    } else {
      const [top, bot] = this.skyColors();
      const gr = g.createLinearGradient(0, 0, 0, GROUND_TOP + 40);
      gr.addColorStop(0, top); gr.addColorStop(1, bot);
      g.fillStyle = gr; g.fillRect(0, 0, W, GROUND_TOP + 40);
      // stars
      if (k > 1.2) {
        for (const s of this.stars) {
          g.globalAlpha = (k - 1.2) / 0.8 * (0.5 + 0.5 * Math.sin(this.t * 2 + s.ph));
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
      }
      // sun / moon
      const dayP = this.phase === 'day' ? clamp(this.phaseT / DAY_MAX, 0, 1) * 0.6 : 0.6 + clamp(k, 0, 1) * 0.4;
      const sx = lerp(260, W - 260, dayP), sy = 210 - Math.sin(dayP * Math.PI) * 140 + clamp(k, 0, 1) * 160;
      if (k < 1.3) {
        g.save(); g.globalAlpha = clamp(1.3 - k, 0, 1);
        g.fillStyle = k > 0.5 ? '#ffb347' : '#ffe066';
        g.beginPath(); g.arc(sx, sy, 56, 0, TAU); g.fill();
        g.globalAlpha *= 0.3; g.beginPath(); g.arc(sx, sy, 80 + Math.sin(this.t * 2) * 5, 0, TAU); g.fill();
        g.restore();
      }
      if (k > 1.2) {
        const mk = clamp((k - 1.2) / 0.8, 0, 1);
        const mx = W * 0.22, my = lerp(320, 150, mk);
        g.save(); g.globalAlpha = mk;
        g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(mx, my, 50, 0, TAU); g.fill();
        g.fillStyle = this.skyColors()[0]; g.beginPath(); g.arc(mx + 22, my - 12, 44, 0, TAU); g.fill();
        g.restore();
      }
      for (const c of this.clouds) ui.cloud(g, c.x, c.y, c.s, k > 1 ? '#6a5aa8' : k > 0.4 ? '#ffd6e8' : '#ffffff', 0.85);
      // hills & fence
      ui.hills(g, GROUND_TOP - 20, this.mixColor('#9be58a', '#2b4a5a', k / 2), 30, 0.004, 1);
      ui.hills(g, GROUND_TOP + 10, this.mixColor('#7fd76f', '#24423f', k / 2), 18, 0.007, 3);
      this.drawLawn(g, k, true);
    }
    // paths between rows
    const rows = [...new Set(this.plots.map((p) => p.y))];
    g.fillStyle = this.mixColor('#f1dfb4', '#4d4a72', k / 2);
    g.globalAlpha = 0.85;
    for (let r = 0; r < rows.length - 1; r++) {
      const y = (rows[r] + rows[r + 1]) / 2 + 10;
      ui.roundRect(g, 120, y - 22, W - 240, 44, 22); g.fill();
    }
    g.globalAlpha = 1;
    // stepping stones
    g.fillStyle = this.mixColor('#d9d2c4', '#5a5878', k / 2);
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(140 + i * 330, H - 30, 34, 14, 0, 0, TAU); g.fill(); }
  }

  drawPlotSoil(g, pl) {
    const s = this.plotScale;
    const wet = pl.kind >= 0 ? pl.water : 0;
    const dry = plotArt('dry');
    if (dry) {
      // garden-plot art (217x140, hole center ~10 px above the image center)
      const w = 160 * s, h = w * dry.height / dry.width, x = pl.x - w / 2, y = pl.y + 7 * s - h / 2;
      g.drawImage(wet > 0.3 ? plotArt('wet') : dry, x, y, w, h);
      const nk = clamp(this.tod / 2, 0, 1);
      if (nk > 0.02) { g.save(); g.globalAlpha = nk; g.drawImage(plotArt('night'), x, y, w, h); g.restore(); }
      if (wet > 0.3) { g.fillStyle = 'rgba(160,220,255,0.35)'; g.beginPath(); g.ellipse(pl.x - 22 * s, pl.y - 2 * s, 18 * s, 5 * s, -0.2, 0, TAU); g.fill(); }
      return;
    }
    g.save(); g.translate(pl.x, pl.y);
    g.fillStyle = this.mixColor(wet > 0.3 ? '#7a4a2a' : '#9a6a3c', '#3a2a40', this.tod / 2);
    g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 70 * s, 26 * s, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = this.mixColor('#6e4424', '#2a1f33', this.tod / 2);
    g.beginPath(); g.ellipse(0, 2, 46 * s, 12 * s, 0, 0, TAU); g.fill();
    if (wet > 0.3) { g.fillStyle = 'rgba(160,220,255,0.35)'; g.beginPath(); g.ellipse(-20 * s, -6 * s, 18 * s, 5 * s, -0.2, 0, TAU); g.fill(); }
    g.restore();
  }

  drawPlotUI(g, pl) {
    // thirsty drop bubble
    if (pl.kind >= 0 && pl.stage < 3 && pl.water <= 0.02 && this.phase === 'day') {
      const bob = Math.sin(this.t * 4 + pl.seed) * 5;
      const x = pl.x + 44, y = pl.y - 60 + bob;
      g.save();
      g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#3fa7ff';
      g.beginPath(); g.moveTo(x, y - 12); g.bezierCurveTo(x + 9, y - 1, x + 8, y + 9, x, y + 9); g.bezierCurveTo(x - 8, y + 9, x - 9, y - 1, x, y - 12); g.fill();
      g.restore();
    }
    // growth ring while growing
    if (pl.kind >= 0 && pl.stage < 3) {
      const prog = (pl.stage + clamp(pl.grow, 0, 1)) / 3;
      g.save(); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.ellipse(pl.x, pl.y, 80 * this.plotScale, 32 * this.plotScale, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
      g.strokeStyle = SEEDS[pl.kind].color;
      g.beginPath(); g.ellipse(pl.x, pl.y, 80 * this.plotScale, 32 * this.plotScale, 0, Math.PI * 0.9, Math.PI * 0.9 - Math.PI * 0.8 * prog, true); g.stroke();
      g.restore();
    }
  }

  drawHeld(g, info, m) {
    // watering can while watering, jar at night
    if (m.canT > 0) {
      const k = m.canT / 0.7;
      const tilt = 0.2 + Math.sin(Math.min(1, (1 - k) * 3) * Math.PI / 2) * 0.6;
      drawCan(g, info.hand.x + info.h * 0.08, info.hand.y - info.h * 0.02, info.h * 0.34, tilt);
    } else if (m.castT > 0) {
      // fairy-dust wand
      g.save(); g.translate(info.hand.x, info.hand.y); g.rotate(-0.8);
      g.strokeStyle = '#c98a4f'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -info.h * 0.28); g.stroke();
      g.translate(0, -info.h * 0.32); g.rotate(this.t * 4); drawStarShape(g, info.h * 0.13, '#ffd23f');
      g.restore();
    } else if (m.jar > 0 && (this.phase === 'night' || this.phase === 'finale' && !m.released)) {
      drawJar(g, info.hand.x + info.h * 0.04, info.hand.y, info.h * 0.26, m.jar, this.t);
    }
  }

  drawTargets(g) {
    for (const m of this.movers) {
      const pl = m.target;
      if (!pl || this.phase !== 'day') continue;
      g.save();
      g.strokeStyle = m.p.color; g.lineWidth = 5; g.setLineDash([12, 8]); g.lineDashOffset = -this.t * 30;
      g.beginPath(); g.ellipse(pl.x, pl.y, 86 * this.plotScale, 36 * this.plotScale, 0, 0, TAU); g.stroke();
      g.restore();
      if (!m.p.isAI) {
        // action hint: A + what will happen
        const y = pl.y + 52 * this.plotScale;
        ui.glyph(g, 'a', pl.x - 26, y, 34);
        if (pl.kind < 0) drawSeedIcon(g, m.seed, pl.x + 16, y + 4, 40, this.t);
        else if (pl.stage < 3) drawCan(g, pl.x + 18, y, 26, -0.3);
        else { g.save(); g.translate(pl.x + 16, y); drawHeartShape(g, 28, '#ff6fb1'); g.restore(); }
      }
    }
  }

  drawGlowLayer(g) {
    const night = clamp(this.tod - 0.8, 0, 1.2) / 1.2;
    if (night <= 0) return;
    g.save();
    g.globalAlpha = 0.42 * night; g.fillStyle = '#0b0b30'; g.fillRect(0, GROUND_TOP, W, H - GROUND_TOP);
    g.restore();
  }

  drawChips(g) {
    const n = this.n;
    const chipW = Math.min(250, (W - 120) / n - 14);
    const total = n * chipW + (n - 1) * 14;
    let x = (W - total) / 2;
    const y = 12;
    const nightish = this.phase === 'night' || this.phase === 'finale';
    for (const m of this.movers) {
      const p = m.p;
      const pop = 1 + m.chipPop * 0.08; m.chipPop = Math.max(0, m.chipPop - 0.04);
      g.save(); g.translate(x + chipW / 2, y + 36); g.scale(pop, pop); g.translate(-(x + chipW / 2), -(y + 36));
      ui.panel(g, x, y, chipW, 72, { r: 36, fill: '#ffffff', stroke: p.color, lineWidth: 6 });
      ui.drawPortrait(g, p, x + 36, y + 36, 28, { expr: 'happy' });
      ui.text(g, p.tag, x + 76, y + 20, { size: 20, color: p.color, align: 'left', strokeWidth: 5 });
      if (nightish) {
        drawJar(g, x + chipW - 82, y + 40, 40, m.jar, this.t);
        ui.text(g, String(m.jar), x + chipW - 22, y + 42, { size: 34, color: NAVY, align: 'right', stroke: false, weight: 800 });
      } else {
        drawSeedIcon(g, m.seed, x + chipW - 74, y + 44, 46, this.t);
        ui.text(g, String(m.planted), x + chipW - 20, y + 42, { size: 34, color: NAVY, align: 'right', stroke: false, weight: 800 });
      }
      g.restore();
      x += chipW + 14;
    }
  }

  drawStatus(g) {
    const y = 104;
    if (this.phase === 'day' || this.phase === 'sunset') {
      const b = this.bloomCount(), tot = this.plots.length;
      ui.panel(g, W - 470, y, 430, 60, { r: 30, fill: 'rgba(255,255,255,0.9)', lineWidth: 4 });
      drawPlant(g, 0, 3, W - 430, y + 52, 0.32, this.t);
      ui.bar(g, W - 400, y + 18, 230, 26, b / tot, '#ff8fd0', { lineWidth: 3 });
      ui.text(g, `${b} / ${tot}`, W - 100, y + 31, { size: 30, color: NAVY, stroke: false, weight: 800 });
    } else if (this.phase === 'night') {
      const left = Math.max(0, NIGHT_LEN - this.phaseT);
      ui.panel(g, W - 470, y, 430, 60, { r: 30, fill: 'rgba(255,255,255,0.9)', lineWidth: 4 });
      drawFirefly(g, W - 430, y + 30, this.t, 0, 1.2);
      const caught = this.movers.reduce((s, m) => s + m.jar, 0);
      ui.text(g, `Fireflies: ${caught}`, W - 400, y + 31, { size: 30, color: NAVY, stroke: false, weight: 800, align: 'left' });
      // moon-timer
      g.save(); g.translate(W - 80, y + 30);
      g.fillStyle = '#2b2a7a'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
      g.fillStyle = '#fff6c8'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + TAU * (left / NIGHT_LEN)); g.closePath(); g.fill();
      g.restore();
    }
  }

  drawLawn(g, k, fence) {
    // grass field
    const gg = g.createLinearGradient(0, GROUND_TOP, 0, H);
    gg.addColorStop(0, this.mixColor('#8fe07a', '#2c5544', k / 2)); gg.addColorStop(1, this.mixColor('#6cc95f', '#1f4036', k / 2));
    g.fillStyle = gg; g.fillRect(0, GROUND_TOP + 30, W, H);
    if (fence) {
      const fc = this.mixColor('#ffffff', '#8a86b8', k / 2);
      g.fillStyle = fc; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.fillRect(0, GROUND_TOP + 24, W, 10);
      for (let x = 10; x < W; x += 54) {
        g.beginPath(); g.moveTo(x, GROUND_TOP + 60); g.lineTo(x, GROUND_TOP); g.lineTo(x + 14, GROUND_TOP - 14); g.lineTo(x + 28, GROUND_TOP); g.lineTo(x + 28, GROUND_TOP + 60); g.closePath(); g.fill(); g.stroke();
      }
    }
    // grass tufts
    g.strokeStyle = this.mixColor('#4fb04a', '#1b3a30', k / 2); g.lineWidth = 3;
    for (let i = 0; i < 90; i++) {
      const x = (i * 211) % W, y = GROUND_TOP + 80 + ((i * 131) % (H - GROUND_TOP - 90));
      g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 2, y - 12); g.moveTo(x, y); g.lineTo(x + 2, y - 15); g.moveTo(x + 6, y); g.lineTo(x + 7, y - 10); g.stroke();
    }
  }

  draw(g) {
    this.drawWorld(g);
    for (const pl of this.plots) this.drawPlotSoil(g, pl);
    this.drawTargets(g);
    for (const pl of this.plots) this.drawPlotUI(g, pl);
    // depth-sorted plants and characters
    const items = [];
    for (const pl of this.plots) if (pl.kind >= 0) items.push({ y: pl.y, pl });
    for (const m of this.movers) items.push({ y: m.a.y, m });
    items.sort((a, b) => a.y - b.y);
    const glow = clamp(this.tod - 0.6, 0, 1.4) / 1.4;
    for (const it of items) {
      if (it.pl) {
        const pl = it.pl;
        drawPlant(g, pl.kind, pl.stage, pl.x, pl.y - 4, this.plotScale, this.t, { grow: clamp(pl.grow, 0, 1), sq: clamp(pl.sq, -0.4, 0.4), open: pl.open, glow: pl.stage === 3 && pl.kind === 4 ? Math.max(glow, 0.15) : 0, night: clamp((this.tod - 1) * 1.5, 0, 1), seed: pl.seed });
        // the magic seed dropping into the soil right after planting
        const dt2 = this.t - (pl.plantedAt ?? -9);
        if (dt2 >= 0 && dt2 < 0.45) {
          const u = dt2 / 0.45, sz = 46 * this.plotScale;
          g.save(); g.translate(pl.x, pl.y - 6 - (1 - ease.inQuad(u)) * 90 * this.plotScale); g.rotate(u * 4);
          drawArt(g, 'prop/seed-magic', 0, 0, sz, sz, { alpha: u > 0.8 ? (1 - u) * 5 : 1 });
          g.restore();
        }
      } else {
        const m = it.m;
        m.a.draw(g, { ring: m.p.color });
      }
    }
    this.drawGlowLayer(g);
    // glowing things above the night tint
    if (this.tod > 1) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const pl of this.plots) {
        if (pl.kind < 0 || pl.stage < 3) continue;
        const gx = pl.x, gy = pl.y - SEEDS[pl.kind].h * this.plotScale;
        const r = 90 * (0.9 + 0.1 * Math.sin(this.t * 2 + pl.seed));
        g.globalAlpha = 0.45 * clamp(this.tod - 1, 0, 1);
        g.drawImage(glowSprite(SEEDS[pl.kind].color), gx - r, gy - r, r * 2, r * 2);
      }
      g.restore();
    }
    // butterflies by day
    if (this.tod < 1) {
      for (const b of this.butterflies) {
        const f = Math.abs(Math.sin(this.t * 14 + b.ph));
        g.save(); g.translate(b.x, b.y); g.globalAlpha = 1 - this.tod;
        g.fillStyle = b.c; g.strokeStyle = NAVY; g.lineWidth = 2;
        g.beginPath(); g.ellipse(-8 * f, 0, 9 * f + 1, 7, -0.3, 0, TAU); g.ellipse(8 * f, 0, 9 * f + 1, 7, 0.3, 0, TAU); g.fill(); g.stroke();
        g.restore();
      }
    }
    for (const f of this.fairies) drawFairy(g, f.x, f.y + Math.sin(f.t * 4) * 4, 24, f.t, f.color, clamp(this.tod - 0.8, 0, 1), f.facing, f.twirl);
    for (const f of this.fireflies) drawFirefly(g, f.x, f.y, f.t, f.ph, 1.4);
    // tags at the start so everyone finds themselves
    if (this.t < 5 && this.phase === 'day') for (const m of this.movers) ui.playerTag(g, m.p, m.a.x, m.a.y - m.a.height - 26);
    // seed-change popup above the player
    for (const m of this.movers) {
      if (m.seedPop <= 0 || m.p.isAI) continue;
      const k = Math.min(1, m.seedPop / 0.3);
      const x = m.a.x, y = m.a.y - m.a.height - 70;
      g.save(); g.globalAlpha = k;
      ui.panel(g, x - 100, y - 44, 200, 88, { r: 30, fill: '#ffffff', stroke: m.p.color, lineWidth: 5 });
      drawSeedIcon(g, m.seed, x - 58, y + 10, 64, this.t);
      ui.text(g, SEEDS[m.seed].name, x + 30, y, { size: 24, color: NAVY, stroke: false, maxWidth: 120 });
      g.restore();
    }
  }

  /** Screen-space HUD (above the camera view). */
  drawHUD(g) {
    this.drawChips(g);
    this.drawStatus(g);
    // Glimmer the fairy host
    const showHost = this.bubble || this.phase === 'finale';
    if (showHost) {
      const hy = this.phase === 'finale' ? 360 : 330;
      drawHost(g, 130, hy + Math.sin(this.t * 2) * 6, 170, this.t, this.phase === 'finale' ? 'cheer' : 'talk');
      if (this.bubble) {
        const k = Math.min(1, this.bubble.t / 0.25) * Math.min(1, (this.bubble.dur - this.bubble.t) / 0.3);
        g.save(); g.globalAlpha = clamp(k, 0, 1);
        hostBubble(g, this.bubble.text, 210, hy - 120, 640, 32);
        g.restore();
      }
    }
    if (this.phase === 'finale') ui.banner(g, 'Fairy Dance!', this.phaseT, { size: 110, y: 230, color: '#ffc8f0' });
  }
}
