// Dream Room (Play Studio): decorate a cozy dollhouse bedroom together.
//
// Everyone shares one room and has a hand cursor in their colour. Pick an
// item from your palette strip (LB/RB or the D-pad), then:
//   A  Place / Move / Paint (X switches the tool; holding something, X flips it)
//   B  remove what you point at,  Y  a surprise present pops open into an item
// Paint the wall or the floor for new wallpaper or flooring, put plushies on
// the bed or the wall shelf, flip the light switch by the door for night time
// (lamps and fairy lights glow, the window shows the moon). A pet bed brings
// a kitty that walks in through the door and curls up in it.
// "Tour!" (or the pause menu, or the gentle timer) starts the room tour: the
// characters walk in, bounce on the bed, sit in the chairs, dance on the rugs
// and pose for photos; the last one is a group photo in a polaroid.
//
// CPUs are helpers: with humans around they slowly add a few nice things and
// never touch the humans' items or wallpaper. With only CPUs they furnish the
// whole room and take the tour themselves.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, sfxLoop, voice, hasSound } from '../engine/audio.js';
import { input } from '../engine/input.js';
import { corner } from '../engine/corner.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { playerName } from '../state.js';
import { clamp, lerp, damp, rand, pick, chance, shuffle, ease, TAU, later } from '../engine/util.js';
import { drawHeartShape, drawStarShape, drawSparkleShape } from '../engine/emotes.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  ITEMS, ITEM, GROUPS, NAVY, shade, drawItem, paintItem, drawItemGlow, drawItemFront, drawIconOf, localBox, CHAR_IDS,
} from './dream-room/items.js';
import {
  WALLPAPERS, FLOORS, WALL, WALL_S, FLOOR_Y0, FLOOR_Y1, POLY, polyPath, roomPath, proj, depthAt, floorHalf,
  wallCanvas, floorCanvas, swatch, FLOOR_BOX, DOOR, DOOR_FOOT, SWITCH, SWITCH_HIT, HALF,
} from './dream-room/room.js';

function snd(key, fallback, opts) { if (hasSound(key)) sfx(key, opts); else if (fallback) sfx(fallback, opts); }

// --- palette ------------------------------------------------------------------------
const GROUP_ORDER = ['furniture', 'lights', 'toys', 'wall', 'plants', 'rugs', 'floors', 'walls'];
const PALETTE = [
  ...GROUP_ORDER.flatMap((grp) => ITEMS.filter((d) => d.group === grp).map((d) => ({ kind: 'item', def: d, group: grp, name: d.name }))),
  ...FLOORS.map((f, i) => ({ kind: 'floor', idx: i, group: 'floors', name: f.name })),
  ...WALLPAPERS.map((w, i) => ({ kind: 'wall', idx: i, group: 'walls', name: w.name })),
];
const PAL_INDEX = Object.fromEntries(PALETTE.map((e, i) => [e.kind === 'item' ? e.def.id : e.kind + e.idx, i]));
const GROUP_START = GROUP_ORDER.map((grp) => PALETTE.findIndex((e) => e.group === grp));
const TOOLS = [{ id: 'place', name: 'Place' }, { id: 'move', name: 'Move' }, { id: 'paint', name: 'Paint' }];
const MAX_ITEMS = 80;

// --- screen layout --------------------------------------------------------------------
const BAR = { y: 950, h: 124 };
const TOUR_BTN = { x: 1672, y: 16, w: 232, h: 86 };
const CLOCK = { x: 1688, y: 112, w: 200, h: 58 };
const CLOCK_PLUS = { x: CLOCK.x + CLOCK.w - 58, y: CLOCK.y, w: 58, h: CLOCK.h };
const LEGEND = { x: 14, y: 14, w: 244 };
const LEGEND_ROWS = [[['stick'], 'Move'], [['lb', 'rb'], 'Items'], [['a'], 'Use tool'], [['x'], 'Tool'], [['b'], 'Remove'], [['y'], 'Surprise!']];
const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const BUILD_TIME = 180, CPU_TIME = 48;
// Group photo: line up (LINEUP s), "Say cheese!" (CHEESE_TIME s, ending 3-2-1),
// then the photo shows big for PHOTO_PIN s and flies PHOTO_FLY s to its pin on the roof.
const LINEUP = 0.9, CHEESE_TIME = 6, PHOTO_PIN = 2.4, PHOTO_FLY = 0.8;
const PIN = { x: 960, y: 128, w: 250, rot: 0.04 };
const GLOW_STARS = [[470, 240], [560, 300], [690, 232], [850, 276], [1040, 238], [1200, 290], [1330, 236], [1450, 300], [760, 330], [1120, 336]];

// Soft light pools (one cached radial gradient per colour).
const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, color); gr.addColorStop(0.45, color.replace('1)', '0.45)')); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
  }
  return c;
}
const WARM = 'rgba(255,210,130,1)', MOON = 'rgba(170,190,255,1)';
let outsideCache = null;

export const meta = {
  id: 'dream-room',
  title: 'Dream Room',
  category: 'studio',
  type: 'Decorate · Everyone wins',
  goal: 'Decorate a cozy bedroom together, then give everyone a room tour!',
  controls: [['stick', 'Move your hand'], ['lb', 'LB / RB / D-pad: pick an item'], ['a', 'Place it'], ['x', 'Tool: place, move, paint'], ['b', 'Remove'], ['y', 'Surprise present!']],
  infoAt: [62, 390],   // corner "i": under the controls legend (the bottom-left holds the palette)
  tips: ['Paint the wall or the floor for new wallpaper!', 'Flip the light switch by the door for night time.', 'A pet bed brings a sleepy kitty!'],
  music: 'cozy',
  duration: 'about 3 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
  drawIcon,
};

// =============================================================================
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.humans = this.players.filter((p) => !p.isAI).length;
    this.t = 0;
    this.phase = 'build';
    this.phaseT = 0;
    this.items = [];
    this.itemSerial = 0;
    this.pets = [];
    this.gifts = [];
    this.wall = 0; this.floor = 0;
    this.wallFx = null; this.floorFx = null;
    this.decorByHuman = false;
    this.night = false; this.nightK = 0; this.switchUsed = false;
    this.doorK = 0; this.doorHold = 0;
    this.timeLeft = this.humans ? BUILD_TIME : CPU_TIME;
    this.prompt = null; this.toast = null; this.banner = null;
    this.photos = []; this.bigPhoto = null;
    this.finished = false;
    this.patterns = new Map();
    this.stations = this.players.map((p, i) => this.makeStation(p, i));
    this.layoutPanels();
    this.layoutActors();
    this.cpuFlip = !this.humans && chance(0.6) ? rand(18, 30) : -1;
    sfx('magic');
  }

  makeStation(p, i) {
    const own = Math.max(0, CHAR_IDS.indexOf(p.charId));
    const st = {
      p, i, cur: { x: 700 + (i % 4) * 170, y: 560 + Math.floor(i / 4) * 120 }, hold: 0,
      tool: 0, sel: 0, scroll: 0, rep: { dir: 0, t: 0 }, held: null, hover: null, cool: 0,
      confirm: null, click: false, toolPop: 0, selPop: 0, reactT: 0,
      charSel: { plushie: own, starposter: own, picture: (own + 1 + i) % CHAR_IDS.length },
      colorOf: {},
      stats: { placed: 0, plush: 0, paints: 0 },
      ai: p.isAI ? { cmds: [], wait: 0, idle: rand(1.2, 2.5) + i * 0.4, placed: 0, ownPlush: false } : null,
    };
    st.actor = new Actor(p, { facing: 1 });
    return st;
  }

  layoutPanels() {
    const n = this.n, gap = 10, w = (W - 20 - gap * (n - 1)) / n;
    this.stations.forEach((st, i) => { st.panel = { x: 10 + i * (w + gap), y: BAR.y, w, h: BAR.h }; });
  }

  /** Characters wait outside the dollhouse on both sides while the room is built. */
  layoutActors() {
    const sides = [[], []];
    this.stations.forEach((st, i) => sides[i % 2].push(st));
    sides.forEach((list, side) => {
      const m = list.length;
      list.forEach((st, j) => {
        const a = st.actor;
        const row = m <= 2 ? 0 : (j < 2 ? 0 : 1), perRow = m <= 2 ? m : 2, col = j % 2;
        const th = m <= 2 ? (m === 1 ? 230 : 190) : 160;
        a.scale = 1;
        a.scale = Math.min(th / a.leader.h, (perRow === 1 ? 220 : 120) / Math.max(1, a.width));
        const xs = perRow === 1 ? [136] : [78, 196];
        const x = xs[col] ?? 136;
        a.x = side === 0 ? x : W - x;
        a.y = row === 0 ? 932 : 760;
        a.facing = side === 0 ? 1 : -1;
        a.snap();
        st.home = { x: a.x, y: a.y, s: a.scale, facing: a.facing };
      });
    });
  }

  get env() { return { t: this.t, night: this.nightK }; }

  // ===========================================================================
  // Items
  surfaceTop(p) {
    const d = p.def;
    if (d.cat === 'wall') return { y: p.y + d.surface.y, hw: d.surface.hw, k: 1 };
    return { y: p.y - p.z + d.surface.y * p.s, hw: d.surface.hw * p.s, k: p.s };
  }

  /** Where an item would go for a cursor at (cx, cy). */
  placement(d, cx, cy, skip = null) {
    if (d.cat === 'wall') {
      return {
        x: clamp(cx, WALL.x0 + d.w / 2 + 6, WALL.x1 - d.w / 2 - 6),
        y: clamp(cy, WALL.y0 + d.h / 2 + 10, WALL.y1 - d.h / 2 - 22), s: 1, parent: null, ox: 0,
      };
    }
    if (d.cat === 'small') {
      const sp = this.surfaceAt(cx, cy, skip);
      if (sp) return sp;
    }
    const rug = d.cat === 'rug';
    const y = clamp(cy, FLOOR_Y0 + (rug ? 50 : 8), FLOOR_Y1 - (rug ? 56 : 6));
    const s = depthAt(y);
    const half = floorHalf(y) - (d.w / 2) * s - 6;
    const x = half > 0 ? clamp(cx, 960 - half, 960 + half) : 960;
    return { x, y, s, parent: null, ox: 0 };
  }

  surfaceAt(cx, cy, skip) {
    const order = this.drawOrder();
    for (let i = order.length - 1; i >= 0; i--) {
      const p = order[i];
      if (!p.def || !p.def.surface || p === skip || p.heldBy != null || p.parent) continue;
      const top = this.surfaceTop(p);
      const k = p.def.cat === 'wall' ? 1 : p.s;
      if (Math.abs(cx - p.x) <= top.hw + 14 && cy >= top.y - 80 * k && cy <= top.y + 46 * k) {
        const x = clamp(cx, p.x - top.hw, p.x + top.hw);
        const cs = p.def.cat === 'wall' ? WALL_S : p.s;
        return { x, y: top.y, s: cs, parent: p, ox: (x - p.x) / (k * p.flip) };
      }
    }
    return null;
  }

  addItem(d, pl, st, color) {
    const it = {
      id: ++this.itemSerial, def: d, color, x: pl.x, y: pl.y, z: 0, vz: 0, s: pl.s, parent: pl.parent || null, ox: pl.ox || 0,
      flip: d.cat === 'floor' || d.cat === 'small' ? (pl.x > 960 ? -1 : 1) : 1,
      owner: st ? st.i : -1, born: this.t, bump: this.t, seed: Math.random(), heldBy: null, playing: 0,
    };
    if (it.parent) it.flip = it.parent.flip;
    this.items.push(it);
    this.layoutChildren();
    const c = this.itemCenter(it);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 12, speed: [120, 380], colors: ['#ffffff', '#fff6a8', '#ffc8f0'] });
    particles.ring(c.x, c.y, st ? st.p.color : '#ffffff', Math.max(d.w, d.h) * it.s * 0.7, 0.35);
    if (d.cat === 'floor' || d.cat === 'rug') particles.burst(it.x, it.y, { type: 'dust', count: 6, speed: [60, 160] });
    sfx('pop');
    if (d.group === 'toys' || d.id === 'beanbag' || d.id === 'bed') snd('boing', 'bounce', { vol: 0.55 });
    if (st) {
      st.stats.placed++;
      if (d.id === 'plushie') st.stats.plush++;
      if (!st.p.isAI) this.decorByHuman = true;
      st.actor.playOnce('cheer', 0.5);
      if (chance(0.3)) particles.popText(c.x, c.y - Math.max(40, d.h * it.s * 0.5), pick(['Cozy!', 'So cute!', 'Pretty!', 'Ooh!', 'Lovely!']), st.p.color, 40);
    }
    // Little reactions.
    if (d.id === 'plushie') {
      const who = CHAR_IDS[color % CHAR_IDS.length];
      for (const s2 of this.stations) if (s2.p.charId === who && s2.reactT <= 0) { s2.actor.say(pick(['Me!', "That's me!"]), 1.4, 'yay'); s2.actor.emote('heart', 1.2); s2.reactT = 2; }
    }
    if (d.id === 'musicbox') this.playMusicBox(it);
    if (d.id === 'petbed') it.petAt = this.t + 1.2;
    if (d.lights && this.nightK > 0.5) sfx('sparkle');
    return it;
  }

  itemCenter(it) {
    const d = it.def, b = localBox(d), s = it.s;
    return { x: it.x + ((b.x0 + b.x1) / 2) * s, y: it.y - it.z + ((b.y0 + b.y1) / 2) * s };
  }
  itemRect(it) {
    const d = it.def, b = localBox(d), s = it.s;
    const pad = d.cat === 'small' ? 10 : 0;
    return { x0: it.x + b.x0 * s - pad, x1: it.x + b.x1 * s + pad, y0: it.y - it.z + b.y0 * s - pad, y1: it.y - it.z + b.y1 * s + pad };
  }

  /** Topmost item under the point (skipping held items). */
  itemAt(x, y) {
    const order = this.drawOrder();
    for (let i = order.length - 1; i >= 0; i--) {
      const it = order[i];
      if (!it.def || it.heldBy != null) continue;
      const r = this.itemRect(it);
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) {
        if (it.def.cat === 'rug') { const nx = (x - it.x) / ((r.x1 - r.x0) / 2), ny = (y - it.y) / ((r.y1 - r.y0) / 2); if (nx * nx + ny * ny > 1) continue; }
        return it;
      }
    }
    return null;
  }

  childrenOf(p) { return this.items.filter((c) => c.parent === p); }

  layoutChildren() {
    for (const it of this.items) {
      if (!it.parent) { if (it.def.cat !== 'wall' && it.heldBy == null) it.s = depthAt(it.y); continue; }
      const p = it.parent, top = this.surfaceTop(p);
      const k = p.def.cat === 'wall' ? 1 : p.s;
      it.x = p.x + it.ox * k * p.flip;
      it.y = top.y; it.z = 0;
      it.s = p.def.cat === 'wall' ? WALL_S : p.s;
    }
  }

  /** Draw order: rugs, wall items (+ their shelf children), then floor things by depth. */
  drawOrder(withActors = false) {
    const out = [];
    const roots = this.items.filter((it) => !it.parent && it.heldBy == null);
    const kids = (p) => this.items.filter((c) => c.parent === p && c.heldBy == null);
    for (const it of roots.filter((i) => i.def.cat === 'rug').sort((a, b) => a.y - b.y)) out.push(it);
    for (const it of roots.filter((i) => i.def.cat === 'wall')) { out.push(it); out.push(...kids(it)); }
    const floor = roots.filter((i) => i.def.cat === 'floor' || i.def.cat === 'small').map((it) => ({ key: it.y, it }));
    if (withActors) {
      for (const pet of this.pets) if (!(pet.state === 'curl' && pet.bed && this.items.includes(pet.bed))) floor.push({ key: pet.y + 1.5, pet });   // in front of its own bed
      if (this.phase === 'tour') for (const st of this.stations) if (st.tour && st.tour.state !== 'wait') floor.push({ key: st.actor.y + 0.5, actor: st });
    }
    floor.sort((a, b) => a.key - b.key);
    for (const f of floor) {
      if (f.it) { out.push(f.it); out.push(...kids(f.it)); } else out.push(f);
    }
    return out;
  }

  removeItem(it, st = null) {
    if (!this.items.includes(it)) return;
    for (const c of this.childrenOf(it)) {
      const top = this.surfaceTop(it);
      c.parent = null;
      if (it.def.cat === 'wall') { c.y = clamp(FLOOR_Y0 + 20, FLOOR_Y0, FLOOR_Y1); c.z = Math.max(0, c.y - top.y); }
      else { c.y = clamp(it.y + 4, FLOOR_Y0, FLOOR_Y1); c.z = Math.max(0, it.y - top.y); }
      c.s = depthAt(c.y); c.vz = 0;
    }
    if (it.heldBy != null) { const h = this.stations[it.heldBy]; if (h) h.held = null; }
    this.items = this.items.filter((x) => x !== it);
    for (const s2 of this.stations) if (s2.hover === it) s2.hover = null;
    const c = this.itemCenter(it);
    particles.burst(c.x, c.y, { type: 'smoke', count: 10, speed: [60, 200] });
    particles.burst(c.x, c.y, { type: 'star', count: 5, speed: [120, 260] });
    sfx('pop'); sfx('whoosh', { vol: 0.5 });
    if (st) st.actor.playOnce('action', 0.35);
  }

  recolor(it, st) {
    const d = it.def;
    it.color = (it.color + 1) % d.colors.length;
    it.bump = this.t;
    const c = this.itemCenter(it);
    const col = typeof d.colors[it.color] === 'string' && d.colors[it.color][0] === '#' ? d.colors[it.color] : null;
    particles.burst(c.x, c.y, { type: 'drop', count: 12, speed: [120, 320], colors: col ? [col, shade(col, 0.4), '#ffffff'] : RAINBOW });
    particles.burst(c.x, c.y, { type: 'sparkle', count: 6 });
    sfx('splat', { vol: 0.5 }); sfx('brush');
    if (st) { st.stats.paints++; st.actor.playOnce('paint', 0.5); }
    if (d.charItem) {
      const who = CHAR_IDS[it.color % CHAR_IDS.length];
      for (const s2 of this.stations) if (s2.p.charId === who && s2.reactT <= 0) { s2.actor.say('Me!', 1.2, 'yay'); s2.reactT = 2; }
    }
  }

  setWallpaper(idx, st) {
    if (idx === this.wall) { sfx('blip'); return; }
    this.wallFx = { from: this.wall, t: 0 };
    this.wall = idx;
    sfx('magic'); sfx('brush');
    if (st) { st.stats.paints++; st.actor.playOnce('cheer', 0.5); if (!st.p.isAI) this.decorByHuman = true; }
  }
  setFloor(idx, st) {
    if (idx === this.floor) { sfx('blip'); return; }
    this.floorFx = { from: this.floor, t: 0 };
    this.floor = idx;
    sfx('magic'); sfx('brush');
    if (st) { st.stats.paints++; st.actor.playOnce('cheer', 0.5); if (!st.p.isAI) this.decorByHuman = true; }
  }

  toggleNight(st) {
    this.night = !this.night;
    this.switchUsed = true;
    this.switchBump = this.t;
    sfx('flip'); sfx(this.night ? 'magic' : 'sparkle');
    particles.burst(SWITCH.x, SWITCH.y, { type: 'sparkle', count: 10, colors: ['#ffffff', '#fff6a8'] });
    for (const s2 of this.stations) { s2.actor.playOnce('surprised', 0.4); s2.actor.emote(this.night ? 'star' : 'sparkle', 1.2); }
    if (this.night && st && !st.p.isAI) later(() => { if (!this.finished && this.night) { const s2 = pick(this.stations); s2.actor.say('Ooh!', 1.2, 'gasp'); } }, 500);
    for (const it of this.items) if (it.def.lights) it.bump = this.t + Math.random() * 0.2;
    if (this.night && hasSound('night-crickets') && !this.crickets) this.crickets = sfxLoop('night-crickets', { vol: 0.25, fadeIn: 1 });
    if (!this.night && this.crickets) { this.crickets.stop(0.6); this.crickets = null; }
  }

  playMusicBox(it) {
    it.playing = 3.2;
    const tune = [72, 76, 79, 84, 79, 76, 77, 81, 84, 81, 76, 72];
    tune.forEach((m, i) => later(() => { if (!this.finished && this.items.includes(it)) { sfx('note', { midi: m, vol: 0.16, dur: 0.35, force: true }); const c = this.itemCenter(it); particles.burst(c.x, c.y - 30, { type: 'note', count: 1, speed: [40, 90] }); } }, i * 240));
    for (const s2 of this.stations) if (chance(0.6)) s2.actor.playOnce('dance', 2.6);
  }

  colorFor(st, d) {
    if (d.charItem) {
      const c = st.charSel[d.id] ?? 0;
      st.charSel[d.id] = (c + 1 + Math.floor(Math.random() * 2)) % CHAR_IDS.length;
      return c;
    }
    if (st.colorOf[d.id] === undefined) st.colorOf[d.id] = (st.i * 2 + (d.id.length % 3)) % d.colors.length;
    return st.colorOf[d.id];
  }
  previewColor(st, d) {
    if (d.charItem) return st.charSel[d.id] ?? 0;
    return st.colorOf[d.id] ?? (st.i * 2 + (d.id.length % 3)) % d.colors.length;
  }

  // ===========================================================================
  // Update
  update(dt) {
    this.t += dt; this.phaseT += dt;
    this.nightK = damp(this.nightK, this.night ? 1 : 0, 3.5, dt);
    if (this.wallFx) { this.wallFx.t += dt * 1.7; if (this.wallFx.t >= 1) this.wallFx = null; else if (chance(dt * 30)) particles.burst(WALL.x0 + (WALL.x1 - WALL.x0) * this.wallFx.t, rand(WALL.y0, WALL.y1), { type: 'sparkle', count: 2 }); }
    if (this.floorFx) { this.floorFx.t += dt * 1.7; if (this.floorFx.t >= 1) this.floorFx = null; else if (chance(dt * 30)) particles.burst(270 + 1380 * this.floorFx.t, rand(FLOOR_Y0 + 10, FLOOR_Y1 - 10), { type: 'sparkle', count: 2 }); }
    if (this.toast) { this.toast.t += dt; if (this.toast.t > 2) this.toast = null; }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.4) this.banner = null; }
    for (const it of this.items) {
      if (it.playing > 0) it.playing -= dt;
      if (it.z > 0 && it.heldBy == null && !it.parent) {
        it.vz += 2200 * dt; it.z -= it.vz * dt;
        if (it.z <= 0) { it.z = 0; it.vz = 0; it.bump = this.t; sfx('land', { vol: 0.6 }); particles.burst(it.x, it.y, { type: 'dust', count: 4 }); }
      }
    }
    for (const st of this.stations) { st.reactT -= dt; st.toolPop = Math.max(0, st.toolPop - dt * 3); st.selPop = Math.max(0, st.selPop - dt * 4); }
    this.updatePets(dt);
    this.updateGifts(dt);
    this.updateDoor(dt);
    if (this.phase === 'build') this.updateBuild(dt);
    else if (this.phase === 'tour') this.updateTour(dt);
    this.layoutChildren();
    for (const st of this.stations) st.actor.update(dt);
  }

  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    for (const st of this.stations) st.actor.update(dt);
  }

  updateBuild(dt) {
    if (this.prompt) { this.updatePrompt(dt); return; }
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      if (this.humans) { this.prompt = { t: 0 }; sfx('select'); snd('jingle/round', 'star'); return; }
      this.startTour(); return;
    }
    // Mouse / touch drives the first human's hand.
    const ptr = input.pointer;
    const mouseSt = this.stations.find((s) => !s.p.isAI);
    for (const st of this.stations) st.click = false;
    if (mouseSt && ptr.seen) {
      if (ptr.moved) { mouseSt.cur.x = clamp(ptr.x, 4, W - 4); mouseSt.cur.y = clamp(ptr.y, 4, H - 4); }
      if (ptr.pressed) { mouseSt.cur.x = ptr.x; mouseSt.cur.y = ptr.y; mouseSt.click = true; }
    }
    for (const st of this.stations) {
      if (st.p.isAI) this.updateAI(st, dt);
      this.updateStation(st, dt);
      if (this.phase !== 'build') return;
    }
    // CPUs alone: one of them may flip the light, then the tour starts when they're done.
    if (!this.humans) {
      if (this.cpuFlip > 0 && this.phaseT > this.cpuFlip) { this.cpuFlip = -1; const s0 = this.stations[0]; s0.ai.cmds = [{ t: 'goto', x: SWITCH.x, y: SWITCH.y }, { t: 'a' }]; }
      if (this.stations.every((s) => s.ai.placed >= this.cpuCap(s)) && this.stations.every((s) => !s.ai.cmds.length) && this.phaseT > 10) {
        this.doneT = (this.doneT || 0) + dt;
        if (this.doneT > 2.5) this.startTour();
      }
    }
  }

  updatePrompt(dt) {
    const P = this.prompt;
    P.t += dt;
    for (const st of this.stations) {
      if (st.p.isAI) continue;
      const c = st.p.ctrl;
      if (P.t > 0.4 && (c.pressed('a') || (st === this.stations.find((s) => !s.p.isAI) && input.pointer.pressed && inRect(this.promptBtn('go'), input.pointer.x, input.pointer.y)))) { this.prompt = null; this.startTour(); return; }
      if (P.t > 0.4 && (c.pressed('b') || (input.pointer.pressed && inRect(this.promptBtn('more'), input.pointer.x, input.pointer.y)))) { this.prompt = null; this.addTime(60); return; }
    }
    if (P.t > 15) { this.prompt = null; this.startTour(); }
  }
  promptBtn(which) { return which === 'go' ? { x: W / 2 - 330, y: 560, w: 300, h: 90 } : { x: W / 2 + 30, y: 560, w: 300, h: 90 }; }

  addTime(s) {
    this.timeLeft = Math.min(599, Math.max(0, this.timeLeft) + s);
    sfx('collect', { step: 6 }); sfx('star');
    particles.popText(CLOCK.x + CLOCK.w / 2, CLOCK.y + CLOCK.h + 20, '+1 min', '#36d17a', 36);
    this.clockBump = this.t;
  }

  updateStation(st, dt) {
    const c = st.p.ctrl, isPad = c.kind === 'pad';
    // --- cursor (stick; the D-pad browses the palette on controllers)
    let mx = c.x, my = c.y;
    if (isPad && (c.held('left') || c.held('right'))) mx = 0;
    if (isPad && (c.held('up') || c.held('down'))) my = 0;
    const mag = Math.hypot(mx, my);
    st.hold = mag > 0.15 ? st.hold + dt : 0;
    const sp = 1150 * (0.35 + 0.65 * clamp(st.hold / 0.6, 0, 1));
    st.cur.x = clamp(st.cur.x + (mx * sp + c.rx * 200) * dt, 4, W - 4);
    st.cur.y = clamp(st.cur.y + (my * sp + c.ry * 200) * dt, 4, H - 4);
    const { x, y } = st.cur;
    st.cool -= dt;

    // --- palette browsing with hold-repeat
    const dir = (c.held('rb') || (isPad && c.held('right'))) ? 1 : (c.held('lb') || (isPad && c.held('left'))) ? -1 : 0;
    if (dir !== st.rep.dir) { st.rep.dir = dir; st.rep.t = 0; if (dir) this.browse(st, dir); }
    else if (dir) { st.rep.t += dt; if (st.rep.t > 0.42) { st.rep.t -= 0.13; this.browse(st, dir); } }
    if (c.pressed('rt') || (isPad && c.pressed('down'))) this.jumpGroup(st, 1);
    if (c.pressed('lt') || (isPad && c.pressed('up'))) this.jumpGroup(st, -1);
    st.scroll = this.smoothScroll(st.scroll, st.sel, dt);

    // --- confirm bubble for the Tour button
    if (st.confirm) {
      st.confirm.t += dt;
      if ((c.pressed('a') || st.click) && st.confirm.t > 0.1) { st.confirm = null; this.startTour(); return; }
      if (c.pressed('b') || (!inRect(TOUR_BTN, x, y) && st.confirm.t > 0.3)) { st.confirm = null; sfx('back'); }
      return;
    }

    // --- tool / flip
    if (c.pressed('x')) {
      if (st.held) { st.held.flip *= -1; st.held.bump = this.t; for (const k of this.childrenOf(st.held)) k.flip = st.held.flip; sfx('flip'); }
      else { st.tool = (st.tool + 1) % TOOLS.length; st.toolPop = 1; sfx('swap'); }
    }

    // --- held item follows the hand
    if (st.held) {
      const it = st.held;
      const pl = this.placement(it.def, x, y, it);
      it.pl = pl; it.x = pl.x; it.y = pl.y; it.s = pl.s;
      it.z = 0;
    }
    st.hover = this.inRoom(x, y) ? this.itemAt(x, y) : null;

    // --- A / B / Y
    if (c.pressed('a') || st.click) this.pressA(st);
    if (c.pressed('b')) this.pressB(st);
    if (c.pressed('y') && st.cool <= 0) this.surprise(st);
  }

  smoothScroll(cur, target, dt) {
    const N = PALETTE.length;
    let d = target - cur;
    if (d > N / 2) cur += N; else if (d < -N / 2) cur -= N;
    d = target - cur;
    return Math.abs(d) < 0.01 ? target : cur + d * (1 - Math.exp(-16 * dt));
  }

  inRoom(x, y) {
    if (y > FLOOR_Y1 + 4 || y < WALL.y0 - 10) return false;
    const half = y >= FLOOR_Y0 ? floorHalf(y) : (y > 432 ? 690 : 540 + (y - 200) / 232 * 150);
    return Math.abs(x - 960) <= half + 4;
  }

  browse(st, dir) {
    if (st.held) return;
    const N = PALETTE.length;
    st.sel = (st.sel + dir + N) % N;
    st.selPop = 1;
    if (st.tool !== 0) { st.tool = 0; st.toolPop = 1; }
    if (!st.p.isAI) sfx('move', { vol: 0.7 });
  }
  jumpGroup(st, dir) {
    if (st.held) return;
    const g = GROUP_ORDER.indexOf(PALETTE[st.sel].group);
    const ng = (g + dir + GROUP_ORDER.length) % GROUP_ORDER.length;
    st.sel = GROUP_START[ng]; st.selPop = 1;
    if (st.tool !== 0) { st.tool = 0; st.toolPop = 1; }
    if (!st.p.isAI) sfx('select');
  }

  pressA(st) {
    const { x, y } = st.cur;
    if (!st.held) {
      if (inRect(TOUR_BTN, x, y)) { if (!st.p.isAI) { st.confirm = { t: 0 }; sfx('select'); } return; }
      if (inRect(CLOCK_PLUS, x, y) && !st.p.isAI) { this.addTime(60); return; }
      if (inRect(SWITCH_HIT, x, y)) { this.toggleNight(st); return; }
      if (y >= BAR.y - 6) { this.panelClick(st, x, y); return; }
      if (!st.p.isAI && x >= LEGEND.x && x <= LEGEND.x + LEGEND.w && y >= LEGEND.y && y <= LEGEND.y + LEGEND_ROWS.length * 50 + 24) {
        // Clicking a legend row presses that button (mouse / touch players).
        const b = LEGEND_ROWS[clamp(Math.floor((y - LEGEND.y - 12) / 50), 0, LEGEND_ROWS.length - 1)][0][0];
        if (b === 'lb') this.browse(st, 1);
        else if (b === 'x') { st.tool = (st.tool + 1) % TOOLS.length; st.toolPop = 1; sfx('swap'); }
        else if (b === 'y' && st.cool <= 0) this.surprise(st);
        else sfx('blip');
        return;
      }
    }
    const tool = TOOLS[st.tool].id;
    if (tool === 'place') this.placeSelected(st);
    else if (tool === 'move') {
      if (st.held) this.drop(st);
      else if (st.hover && (!st.p.isAI || st.hover.owner === st.i)) this.grab(st, st.hover);
      else sfx('blip');
    } else if (tool === 'paint') {
      if (st.hover && (!st.p.isAI || st.hover.owner === st.i)) this.recolor(st.hover, st);
      else if (st.p.isAI && this.humans) sfx('blip');   // helpers never repaint the humans' room
      else if (this.inRoom(x, y) && y < FLOOR_Y0) this.setWallpaper((this.wall + 1) % WALLPAPERS.length, st);
      else if (this.inRoom(x, y)) this.setFloor((this.floor + 1) % FLOORS.length, st);
      else sfx('blip');
    }
  }

  panelClick(st, x, y) {
    const P = st.panel;
    if (!inRect(P, x, y)) { sfx('blip'); return; }
    const L = this.panelLayout(st);
    if (Math.hypot(x - L.toolX, y - L.toolY) < 40) { st.tool = (st.tool + 1) % TOOLS.length; st.toolPop = 1; sfx('swap'); return; }
    if (x >= L.c0 && x <= L.c1) {
      const k = Math.round((x - L.mid) / (L.ss + L.gap));
      const N = PALETTE.length;
      st.sel = (((Math.round(st.scroll) + k) % N) + N) % N; st.selPop = 1;
      if (st.tool !== 0) { st.tool = 0; st.toolPop = 1; }
      sfx('select');
      return;
    }
    if (x < L.c0) this.browse(st, -1); else this.browse(st, 1);
  }

  placeSelected(st) {
    const e = PALETTE[st.sel], { x, y } = st.cur;
    if (e.kind !== 'item' && st.p.isAI && this.humans) { sfx('blip'); return; }
    if (e.kind === 'wall') { if (this.inRoom(x, y)) this.setWallpaper(e.idx, st); else sfx('blip'); return; }
    if (e.kind === 'floor') { if (this.inRoom(x, y)) this.setFloor(e.idx, st); else sfx('blip'); return; }
    if (!this.inRoom(x, y) && !(y < FLOOR_Y1 && y > 120 && x > 240 && x < W - 240)) { sfx('blip'); return; }
    if (this.items.length >= MAX_ITEMS) { this.toast = { text: 'The room is full! Remove something with B.', t: 0 }; sfx('blip'); return; }
    const d = e.def;
    const it = this.addItem(d, this.placement(d, x, y), st, this.colorFor(st, d));
    st.cool = Math.max(st.cool, 0.12);
    return it;
  }

  grab(st, it) {
    if (it.heldBy != null) { sfx('blip'); return; }
    it.heldBy = st.i; st.held = it;
    it.parent = null; it.vz = 0;
    sfx('bubble'); sfx('swap');
    st.actor.playOnce('action', 0.35);
    // a kitty in a grabbed bed hops out
    for (const pet of this.pets) if (pet.bed === it && pet.state === 'curl') { pet.state = 'sit'; pet.t = 0; pet.hop = 0.35; snd('tiny-squeak', 'bubble'); }
  }

  drop(st) {
    const it = st.held;
    if (!it) return;
    const pl = it.pl || this.placement(it.def, st.cur.x, st.cur.y, it);
    it.x = pl.x; it.y = pl.y; it.s = pl.s; it.parent = pl.parent || null; it.ox = pl.ox || 0;
    if (it.parent) it.flip = it.parent.flip;
    it.heldBy = null; st.held = null; it.z = 0; it.bump = this.t;
    this.layoutChildren();
    sfx('land'); sfx('pop', { vol: 0.5 });
    if (it.def.cat !== 'wall') particles.burst(it.x, it.y, { type: 'dust', count: 6 });
    else { const c = this.itemCenter(it); particles.burst(c.x, c.y, { type: 'sparkle', count: 6 }); }
  }

  pressB(st) {
    if (st.held) { const it = st.held; st.held = null; it.heldBy = null; this.removeItem(it, st); return; }
    const it = st.hover;
    if (it && (!st.p.isAI || it.owner === st.i)) { this.removeItem(it, st); return; }
    sfx('blip');
  }

  // --- surprise presents -------------------------------------------------------------------
  surprise(st) {
    st.cool = 1.4;
    const pool = ITEMS.filter((d) => d.id !== 'present');
    const weights = pool.map((d) => (this.items.some((i) => i.def === d) ? 0.35 : 1) * (d.cpu || 1) * (d.unique && this.items.some((i) => i.def === d) ? 0 : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0), d = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { d = pool[i]; break; } }
    let cx = st.cur.x, cy = st.cur.y;
    if (!this.inRoom(cx, cy)) { const spot = this.findSpot(d, st) || { x: 960, y: 760 }; cx = spot.x; cy = spot.y; }
    const pl = this.placement(d, cx, cy);
    const c = d.cat === 'wall' ? { x: pl.x, y: pl.y } : { x: pl.x, y: pl.y - 30 * pl.s };
    this.gifts.push({ st, d, cx, cy, x: c.x, y: c.y, t: 0, color: this.colorFor(st, d) });
    sfx('whoosh');
    st.actor.playOnce('throw', 0.4);
  }

  updateGifts(dt) {
    for (const gft of this.gifts) {
      gft.t += dt;
      if (gft.t > 0.45 && !gft.landed) { gft.landed = true; sfx('land'); fx.shake(4, 0.12); particles.burst(gft.x, gft.y + 30, { type: 'dust', count: 6 }); }
      if (gft.t > 1.1 && !gft.done) {
        gft.done = true;
        if (this.phase === 'build' && this.items.length < MAX_ITEMS) {
          const it = this.addItem(gft.d, this.placement(gft.d, gft.cx, gft.cy), gft.st, gft.color);
          it.born = this.t - 0.05;
        }
        particles.burst(gft.x, gft.y, { type: 'confetti', count: 40, speed: [200, 600] });
        sfx('bigpop'); snd('yay', 'yay');
        for (const s2 of this.stations) s2.actor.playOnce(chance(0.5) ? 'cheer' : 'surprised', 0.5);
      }
    }
    this.gifts = this.gifts.filter((g) => !g.done);
  }

  // --- pets ------------------------------------------------------------------------------------
  updatePets(dt) {
    // A new pet bed brings a pet (a kitty, then a puppy) after a moment.
    for (const it of this.items) {
      if (it.def.id !== 'petbed' || it.petAt === undefined || this.t < it.petAt) continue;
      it.petAt = undefined;
      if (this.pets.length >= 2 || this.pets.some((p) => p.bed === it)) continue;
      const kind = this.pets.some((p) => p.kind === 'kitty') ? 'puppy' : 'kitty';
      this.pets.push({ kind, bed: it, x: DOOR_FOOT.x, y: DOOR_FOOT.y, state: 'walk', t: 0, facing: -1, hop: 0 });
      this.doorHold = 1.5;
    }
    for (const pet of this.pets) {
      pet.t += dt;
      pet.hop = Math.max(0, pet.hop - dt);
      const bedOk = pet.bed && this.items.includes(pet.bed);
      if (!bedOk && pet.state !== 'leave') {
        const free = this.items.find((i) => i.def.id === 'petbed' && i.heldBy == null && !this.pets.some((p) => p.bed === i));
        if (free) { pet.bed = free; pet.state = 'walk'; } else { pet.bed = null; pet.state = 'leave'; this.doorHold = 2; }
      }
      const bed = pet.bed;
      if (pet.state === 'leave') {
        if (this.walkPet(pet, DOOR_FOOT.x, DOOR_FOOT.y, dt)) pet.gone = true;
        continue;
      }
      if (bed.heldBy != null) { if (pet.state !== 'sit') { pet.state = 'sit'; pet.t = 0; } continue; }
      const tx = bed.x, ty = bed.y - 1;
      if (pet.state === 'sit' || pet.state === 'walk') {
        if (pet.state === 'sit' && pet.t < 0.5) continue;
        pet.state = 'walk';
        if (this.walkPet(pet, tx, ty, dt)) { pet.state = 'circle'; pet.t = 0; }
      } else if (pet.state === 'circle') {
        pet.x = tx; pet.y = ty;
        pet.facing = Math.floor(pet.t / 0.22) % 2 ? 1 : -1;
        if (pet.t > 0.9) {
          pet.state = 'curl'; pet.t = 0; snd('tiny-squeak', 'bubble');
          particles.burst(tx, ty - 30 * bed.s, { type: 'heart', count: 4 });
          const s2 = pick(this.stations); if (s2.reactT <= 0) { s2.actor.say(pick(['Aww!', 'So cute!']), 1.3, 'laugh'); s2.reactT = 2; }
        }
      } else if (pet.state === 'curl') {
        if (Math.hypot(pet.x - tx, pet.y - ty) > 4) { pet.state = 'walk'; pet.hop = 0.3; }
        if (chance(dt * 0.12)) snd('snore', null, { vol: 0.25 });
      }
    }
    this.pets = this.pets.filter((p) => !p.gone);
  }

  walkPet(pet, tx, ty, dt) {
    const dx = tx - pet.x, dy = ty - pet.y, d = Math.hypot(dx, dy);
    const sp = 260 * depthAt(pet.y);
    if (d < sp * dt + 1) { pet.x = tx; pet.y = ty; return true; }
    pet.x += (dx / d) * sp * dt; pet.y += (dy / d) * sp * dt;
    if (Math.abs(dx) > 2) pet.facing = dx > 0 ? 1 : -1;
    return false;
  }

  updateDoor(dt) {
    this.doorHold = Math.max(0, this.doorHold - dt);
    const visitors = this.pets.some((p) => Math.hypot(p.x - DOOR_FOOT.x, p.y - DOOR_FOOT.y) < 120) ||
      (this.phase === 'tour' && this.stations.some((s) => s.tour && (s.tour.state === 'wait' || (s.tour.state === 'walk' && Math.hypot(s.actor.x - DOOR_FOOT.x, s.actor.y - DOOR_FOOT.y) < 160))));
    const open = this.doorHold > 0 || visitors;
    const before = this.doorK;
    this.doorK = damp(this.doorK, open ? 1 : 0, 6, dt);
    if (before < 0.1 && this.doorK >= 0.1 && open) sfx('swap', { vol: 0.5 });
  }

  // --- CPU helpers ------------------------------------------------------------------------------
  cpuCap(st) { return this.humans ? 4 + (st.p.aiLevel || 0) : 7; }

  updateAI(st, dt) {
    const c = st.p.ctrl, A = st.ai, prof = aiProfile(st.p);
    if (A.wait > 0) { A.wait -= dt; c.move(0, 0); return; }
    if (!A.cmds.length) {
      c.move(0, 0);
      A.idle -= dt;
      if (A.idle > 0) return;
      A.cmds = this.planFor(st);
      A.idle = this.humans ? rand(6, 11) / prof.speed : rand(0.6, 1.6);
      if (!A.cmds.length) A.idle = this.humans ? 4 : 1;
      return;
    }
    const cmd = A.cmds[0];
    const done = (w = 0.15) => { A.cmds.shift(); A.wait = w / prof.speed; };
    switch (cmd.t) {
      case 'tool':
        if (st.held) { c.press('a'); A.wait = 0.3; break; }
        if (st.tool === cmd.v) done(0.05); else { c.press('x'); A.wait = 0.28 / prof.speed; }
        break;
      case 'sel': {
        if (st.sel === cmd.v) { done(0.2); break; }
        const N = PALETTE.length, r = (cmd.v - st.sel + N) % N;
        c.press(r <= N / 2 ? 'rb' : 'lb');
        A.wait = rand(0.1, 0.17) / prof.speed;
        break;
      }
      case 'goto': {
        const d = steer(st.p, st.cur.x, st.cur.y, cmd.x, cmd.y, { arrive: 130, wobble: false });
        cmd.t2 = (cmd.t2 || 0) + dt;
        if (d < 12 || cmd.t2 > 4) { c.move(0, 0); done(0.25); }
        break;
      }
      case 'a': {
        const e = PALETTE[st.sel];
        if (cmd.count && e.kind === 'item' && e.def.unique && this.items.some((i) => i.def === e.def)) { A.cmds = []; break; }   // someone beat us to it
        c.press('a'); if (cmd.count) A.placed++; done(0.5); break;
      }
      case 'y': c.press('y'); A.placed++; done(0.6); break;
      default: done();
    }
  }

  planFor(st) {
    const A = st.ai, cmds = [];
    if (A.placed >= this.cpuCap(st)) return cmds;
    // Alone (CPUs only): the first CPU picks the wallpaper and floor first.
    if (!this.humans && st.i === 0 && !A.decor) {
      A.decor = true;
      const wp = PAL_INDEX['wall' + (1 + Math.floor(Math.random() * (WALLPAPERS.length - 1)))];
      const fl = PAL_INDEX['floor' + (1 + Math.floor(Math.random() * (FLOORS.length - 1)))];
      cmds.push({ t: 'tool', v: 0 }, { t: 'sel', v: wp }, { t: 'goto', x: rand(600, 1300), y: rand(260, 520) }, { t: 'a' });
      cmds.push({ t: 'sel', v: fl }, { t: 'goto', x: rand(700, 1200), y: rand(680, 880) }, { t: 'a' });
      return cmds;
    }
    const own = this.items.filter((i) => i.owner === st.i && i.heldBy == null);
    const r = Math.random();
    if (r < 0.1 && own.length) {
      const it = pick(own), cc = this.itemCenter(it);
      cmds.push({ t: 'tool', v: 2 }, { t: 'goto', x: cc.x, y: cc.y }, { t: 'a' });
      if (chance(0.5)) cmds.push({ t: 'a' });
      cmds.push({ t: 'tool', v: 0 });
      return cmds;
    }
    if (r < 0.18) {
      const spot = this.findSpot(ITEM.teddy, st);
      if (spot) { cmds.push({ t: 'goto', x: spot.x, y: spot.y }, { t: 'y' }); return cmds; }
    }
    // Pick something nice the room doesn't have yet.
    const have = (d) => this.items.filter((i) => i.def === d).length;
    // With humans around, the big pieces (bed, window) are theirs to choose.
    const planned = (d) => this.stations.some((o) => o !== st && o.ai && o.ai.cmds.length && o.ai.planDef === d);
    const pool = ITEMS.filter((d) => !(d.unique && (have(d) || this.humans || planned(d))));
    const wts = pool.map((d) => {
      let w = d.cpu * (have(d) ? 0.25 / have(d) : 1);
      if (d.id === 'bed' && !have(d)) w *= 40;
      if (d.id === 'plushie' && !A.ownPlush) w *= 2.5;
      if (d.cat === 'wall' && this.items.filter((i) => i.def.cat === 'wall').length > 5) w *= 0.2;
      return w;
    });
    let k = Math.random() * wts.reduce((a, b) => a + b, 0), d = pool[0];
    for (let i = 0; i < pool.length; i++) { k -= wts[i]; if (k <= 0) { d = pool[i]; break; } }
    const spot = this.findSpot(d, st);
    if (!spot) return cmds;
    if (d.id === 'plushie') A.ownPlush = true;
    A.planDef = d;
    cmds.push({ t: 'tool', v: 0 }, { t: 'sel', v: PAL_INDEX[d.id] }, { t: 'goto', x: spot.x, y: spot.y }, { t: 'a', count: true });
    return cmds;
  }

  /** A free cursor spot for item `d` (avoiding other items and human hands). */
  findSpot(d, st) {
    const humans = this.stations.filter((s) => !s.p.isAI);
    const nearHuman = (x, y) => humans.some((h) => Math.hypot(h.cur.x - x, h.cur.y - y) < 230);
    for (let k = 0; k < 50; k++) {
      if (d.cat === 'wall') {
        const x = rand(WALL.x0 + d.w / 2 + 10, WALL.x1 - d.w / 2 - 10), y = rand(WALL.y0 + d.h / 2 + 12, WALL.y1 - d.h / 2 - 24);
        const clash = this.items.some((i) => i.def.cat === 'wall' && Math.abs(i.x - x) < (i.def.w + d.w) * 0.45 && Math.abs(i.y - y) < (i.def.h + d.h) * 0.45);
        if (clash || nearHuman(x, y)) continue;
        return { x, y };
      }
      if (d.cat === 'small' && chance(0.55)) {
        const hosts = this.items.filter((i) => i.def.surface && !i.parent && i.heldBy == null);
        if (hosts.length) {
          const p = pick(hosts), top = this.surfaceTop(p);
          const x = p.x + rand(-top.hw, top.hw) * 0.85;
          if (!this.items.some((c) => c.parent === p && Math.abs(c.x - x) < 46 * top.k) && !nearHuman(x, top.y)) return { x, y: top.y - 6 };
        }
      }
      const rug = d.cat === 'rug';
      const tall = d.h * 1 > 200;
      const y = rug ? rand(FLOOR_Y0 + 90, FLOOR_Y1 - 70) : tall ? rand(FLOOR_Y0 + 10, FLOOR_Y0 + 120) : rand(FLOOR_Y0 + 20, FLOOR_Y1 - 20);
      const s = depthAt(y), half = floorHalf(y) - d.w / 2 * s - 10;
      if (half <= 0) continue;
      const x = rand(960 - half, 960 + half);
      const clash = this.items.some((i) => !i.parent && (rug ? i.def.cat === 'rug' : (i.def.cat === 'floor' || i.def.cat === 'small'))
        && Math.abs(i.x - x) < (i.def.w * i.s + d.w * s) * 0.42 && Math.abs(i.y - y) < 70);
      if (clash || nearHuman(x, y)) continue;
      return { x, y };
    }
    return null;
  }

  // ===========================================================================
  // Room tour
  startTour() {
    if (this.phase !== 'build') return;
    this.phase = 'tour'; this.phaseT = 0;
    this.prompt = null;
    for (const st of this.stations) {
      if (st.held) this.drop(st);
      st.confirm = null; st.hover = null;
      if (st.p.isAI) { st.p.ctrl.move(0, 0); st.p.ctrl.hold('a', false); st.ai.cmds = []; }
    }
    for (const gft of this.gifts) gft.t = Math.max(gft.t, 1.05);
    this.banner = { text: 'Room tour!', t: 0 };
    corner.infoAt = 'bl';   // the legend is gone; keep the "i" off the tour polaroids
    sfx('fanfare'); snd('applause', 'cheer');
    this.assignTourSpots();
    // One photo per character (up to 8); small groups also get photos of the room's best bits.
    this.tourShots = this.stations.map((st) => ({ st }));
    if (this.tourShots.length < 3) {
      const extras = [];
      for (const pet of this.pets) {
        const bed = pet.bed;
        if (bed && this.items.includes(bed)) extras.push({ x: bed.x, y: bed.y - 40 * bed.s, zoom: 4.6, color: '#ff9f1c', caption: () => (pet.state === 'curl' ? (pet.kind === 'kitty' ? 'Sleepy kitty!' : 'Sleepy puppy!') : (pet.kind === 'kitty' ? 'Happy kitty!' : 'Happy puppy!')) });
      }
      const win = this.items.find((i) => i.def.id === 'window');
      if (win) extras.push({ x: win.x, y: win.y, zoom: 3.2, color: '#3fa7ff', caption: () => (this.night ? 'Moon view!' : 'Sunny view!') });
      const glow = this.items.filter((i) => i.def.lights && i.def.id !== 'window');
      if (this.night && glow.length) { const c = this.itemCenter(pick(glow)); extras.push({ x: c.x, y: c.y, zoom: 3.6, color: '#ffa000', caption: () => 'So glowy!' }); }
      const plush = this.items.filter((i) => i.def.id === 'plushie');
      if (plush.length) { const c = this.itemCenter(pick(plush)); extras.push({ x: c.x, y: c.y, zoom: 4.6, color: '#ff6fb1', caption: () => 'Plushie pal!' }); }
      this.tourShots.push(...shuffle(extras).slice(0, 3 - this.tourShots.length));
    }
    this.shotIdx = -1; this.shotT = 0; this.groupT = -1;
  }

  assignTourSpots() {
    const roots = this.items.filter((i) => !i.parent);
    const acts = [];
    const add = (kind, item, extra = {}) => acts.push({ kind, item, ...extra });
    for (const b of shuffle(roots.filter((i) => i.def.bed))) { add('bounce', b, { slot: 0 }); }
    for (const s of shuffle(roots.filter((i) => i.def.seat))) add('sit', s);
    for (const pb of roots.filter((i) => i.def.id === 'petbed' && this.pets.some((p) => p.bed === i))) add('pet', pb);
    for (const r of shuffle(roots.filter((i) => i.def.cat === 'rug'))) add('dance', r);
    for (const p of shuffle(this.items.filter((i) => i.def.id === 'plushie'))) add('hug', p);
    for (const w of roots.filter((i) => i.def.id === 'window')) add('wave', w);
    for (const b of roots.filter((i) => i.def.bed)) add('bounce', b, { slot: 1 });
    // Variety first: one of each kind, then the rest.
    const firsts = [], rest = [];
    const seen = new Set();
    for (const a of acts) { if (!seen.has(a.kind)) { seen.add(a.kind); firsts.push(a); } else rest.push(a); }
    const order = [...firsts, ...rest];
    const usedSpots = [];
    this.stations.forEach((st, i) => {
      const a = st.actor;
      a.scale = 1;
      const base = Math.min(150 / a.leader.h, 150 / Math.max(1, a.width));
      const act = order[i] || { kind: 'dance', item: null };
      const T = { kind: act.kind, item: act.item, state: 'wait', enterAt: 0.7 + i * 0.5, base, top: 0 };
      const it = act.item;
      if (act.kind === 'bounce') {
        const d = it.def;
        T.x = it.x + (act.slot ? -60 : 40) * it.s * it.flip; T.y = it.y + 2; T.top = -d.bed.y * it.s;
      } else if (act.kind === 'sit') { T.x = it.x; T.y = it.y + 2; T.top = (-it.def.seat.y - 18) * it.s; }
      else if (act.kind === 'pet') { const side = it.x > 960 ? -1 : 1; T.x = it.x + side * 95 * it.s; T.y = it.y + 4; T.face = -side; }
      else if (act.kind === 'dance' && it) { T.x = it.x + rand(-40, 40) * it.s; T.y = it.y + rand(-10, 10); }
      else if (act.kind === 'hug') {
        const host = it.parent && it.parent.def.cat !== 'wall' ? it.parent : null;
        const bx = host ? host.x : it.x, by = host ? host.y : it.y;
        const side = it.x > 960 ? -1 : 1;
        T.x = clamp(bx + side * ((host ? host.def.w / 2 : 30) + 50) * depthAt(by), 960 - floorHalf(by) + 60, 960 + floorHalf(by) - 60); T.y = clamp(by + 10, FLOOR_Y0 + 10, FLOOR_Y1 - 4); T.face = -side;
        if (it.parent && it.parent.def.cat === 'wall') { T.x = it.x; T.y = FLOOR_Y0 + 40; }
      } else if (act.kind === 'wave') { T.x = it.x; T.y = FLOOR_Y0 + 36; }
      if (T.x === undefined) {
        for (let k = 0; k < 30; k++) {
          const y = rand(FLOOR_Y0 + 60, FLOOR_Y1 - 30), x = 960 + rand(-1, 1) * (floorHalf(y) - 120);
          if (!usedSpots.some((u) => Math.hypot(u.x - x, u.y - y) < 140) && !roots.some((r) => r.def.cat !== 'rug' && r.def.cat !== 'wall' && Math.abs(r.x - x) < r.def.w * r.s * 0.5 && Math.abs(r.y - y) < 50)) { T.x = x; T.y = y; break; }
        }
        if (T.x === undefined) { T.x = 960 + (i - (this.n - 1) / 2) * 120; T.y = 800; }
        T.kind = 'dance';
      }
      usedSpots.push({ x: T.x, y: T.y });
      T.floorY = act.kind === 'bounce' || act.kind === 'sit' ? it.y + 6 : T.y;
      st.tour = T;
      a.x = DOOR_FOOT.x; a.y = DOOR_FOOT.y; a.z = 0; a.facing = -1; a.scale = base * depthAt(a.y); a.snap();
      a.setPose('idle');
    });
  }

  updateTour(dt) {
    const t = this.phaseT;
    let arrived = 0;
    for (const st of this.stations) {
      const T = st.tour, a = st.actor;
      if (!T) continue;
      if (T.state === 'wait') { if (t >= T.enterAt) { T.state = 'walk'; voice(st.p.charId, 'hello'); } else continue; }
      if (T.state === 'walk') {
        const dx = T.x - a.x, dy = T.floorY - a.y, d = Math.hypot(dx, dy);
        const sp = 380 * depthAt(a.y);
        if (d < sp * dt + 1) {
          a.x = T.x; a.y = T.floorY;
          T.state = T.top > 0 ? 'hop' : 'act'; T.t = 0;
          if (T.state === 'act') this.startAct(st);
          else { a.playOnce('jump', 0.4); sfx('jump'); }
        } else {
          a.x += (dx / d) * sp * dt; a.y += (dy / d) * sp * dt;
          a.moveAnim(dx / d * sp, dy / d * sp, sp);
        }
        a.scale = T.base * depthAt(a.y);
      } else if (T.state === 'hop') {
        T.t += dt;
        const p = clamp(T.t / 0.4, 0, 1);
        a.y = lerp(T.floorY, T.y, p);
        a.z = lerp(0, T.top, p) + Math.sin(p * Math.PI) * 70 * depthAt(a.y);
        if (p >= 1) { a.z = T.top; T.state = 'act'; T.t = 0; this.startAct(st); a.squash(0.3); sfx('land'); }
      } else if (T.state === 'act') {
        T.t += dt; arrived++;
        this.doAct(st, dt);
      } else if (T.state === 'group') {
        const G = T.group, p = clamp(this.groupT / LINEUP, 0, 1), e = ease.inOutQuad(p);
        const px = a.x;
        a.x = lerp(G.x0, G.x, e); a.y = lerp(G.y0, G.y, e);
        a.z = lerp(G.z0, 0, e) + Math.sin(p * Math.PI) * 50 * depthAt(a.y);
        a.scale = T.base * depthAt(a.y);
        if (p < 1) { if (Math.abs(a.x - px) > 0.5) a.facing = a.x > px ? 1 : -1; a.setPose('jump'); }
        else { T.state = 'cheese'; T.vz = 0; T.poseCD = 0; a.z = 0; a.facing = a.x < 960 ? 1 : -1; a.setPose('wave'); particles.burst(a.x, a.y - a.height, { type: 'star', count: 5 }); }
      } else if (T.state === 'cheese') {
        if (!this.bigPhoto) this.cheeseMove(st, dt);
        else { T.vz -= 2800 * dt; a.z = Math.max(0, a.z + T.vz * dt); if (a.z <= 0) T.vz = 0; }
      }
    }
    // Photos: one of each character's spot, then the group photo.
    if (arrived === this.stations.length || t > 9) this.photosStarted = true;
    if (this.photosStarted) {
      this.shotT += dt;
      const cam = this.api.camera;
      if (this.shotIdx < 0) { this.shotIdx = 0; this.shotT = 0; }
      if (this.shotIdx < this.tourShots.length) {
        const shot = this.tourShots[this.shotIdx], st = shot.st, a = st && st.actor;
        const fx0 = a ? a.x : shot.x, fy = a ? a.y - a.z - a.height * 0.5 : shot.y;
        const zoom = Math.min(1.75, cam.maxZoom);
        cam.follow(clamp(fx0, W / (2 * zoom), W - W / (2 * zoom)), fy, zoom, 4);
        if (a && this.shotT > 0.6 && !shot.posed) { shot.posed = true; if (st.tour.kind === 'dance' || st.tour.kind === 'wave' || st.tour.kind === 'hug' || st.tour.kind === 'pet') a.playOnce('photo', 1.1); }
        if (this.shotT > 1.35 && !shot.snapped) {
          shot.snapped = true;
          this.snap(fx0, fy, shot.zoom || 3, shot);
        }
        if (this.shotT > 2.0) { this.shotIdx++; this.shotT = 0; }
      } else if (this.groupT < 0) {
        this.groupT = 0;
        cam.follow(W / 2, H / 2, 1, 3);
        this.banner = { text: 'Group photo!', t: 0 };
        // Everyone lines up at the front of the room for the group photo.
        const n = this.n, sp = Math.min(200, 1180 / n), rows = n > 5 ? 2 : 1;
        this.stations.forEach((st, i) => {
          const r = rows === 2 ? i % 2 : 0, k = rows === 2 ? Math.floor(i / 2) : i, per = rows === 2 ? Math.ceil(n / 2) : n;
          st.tour.group = { x: 960 + (k - (per - 1) / 2) * sp * (rows === 2 ? 1.6 : 1) + (r ? sp * 0.5 : 0), y: FLOOR_Y1 - 30 - r * 70, z0: st.actor.z, x0: st.actor.x, y0: st.actor.y };
          st.tour.state = 'group';
        });
      } else {
        const g0 = this.groupT;
        this.groupT += dt;
        // "Say cheese!": until the shutter clicks everyone can move, jump and pose.
        if (g0 < LINEUP && this.groupT >= LINEUP) { this.banner = { text: 'Say cheese!', t: 0 }; sfx('giggle'); }
        const shot = LINEUP + CHEESE_TIME;
        for (const d of [3, 2, 1]) if (g0 < shot - d && this.groupT >= shot - d) sfx(d === 1 ? 'tock' : 'tick');
        if (this.groupT >= shot && !this.bigPhoto) {
          this.banner = null;
          this.bigPhoto = { img: this.renderPhoto(W / 2, 520, 1.2, 1040, 585), t: 0 };
          snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.45);
          later(() => { if (!this.finished) { particles.confettiRain(W, 150); snd('applause', 'cheer'); sfx('yay'); } }, 350);
        }
        if (this.bigPhoto) {
          const before = this.bigPhoto.t;
          this.bigPhoto.t += dt;
          if (before < PHOTO_PIN + PHOTO_FLY && this.bigPhoto.t >= PHOTO_PIN + PHOTO_FLY) { sfx('pop'); particles.burst(PIN.x, PIN.y - 80, { type: 'sparkle', count: 10, colors: ['#fff', '#ffd23f'] }); }
          if (this.bigPhoto.t > PHOTO_PIN + PHOTO_FLY + 1.6 || (this.bigPhoto.t > 1.5 && this.players.some((p) => !p.isAI && p.ctrl.pressed('a')))) this.finishGame();
        }
      }
    }
    for (const ph of this.photos) ph.t += dt;
    if (t > 50) this.finishGame();
  }

  /** "Say cheese!": stick moves around the floor, A jumps, every other button strikes a pose. */
  cheeseMove(st, dt) {
    const T = st.tour, a = st.actor, c = st.p.ctrl, G = T.group;
    T.poseCD = Math.max(0, T.poseCD - dt);
    let { x: mx, y: my } = photoMove(c), jump = c.pressed('a'), pose = photoPosePressed(c);
    if (st.p.isAI) {
      // CPUs ham it up: shuffle about near their spot, hop and pose at random
      T.aiT = (T.aiT ?? rand(0.2, 0.8)) - dt;
      if (T.aiT <= 0) { T.aiT = rand(0.5, 1.3); T.aiM = chance(0.4) ? [rand(-0.8, 0.8), rand(-0.5, 0.5)] : [0, 0]; if (chance(0.35)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      [mx, my] = T.aiM || [0, 0];
      if (Math.abs(a.x - G.x) > 110) mx = Math.sign(G.x - a.x) * 0.6;
      if (Math.abs(a.y - G.y) > 60) my = Math.sign(G.y - a.y) * 0.6;
    }
    const d = Math.hypot(mx, my); if (d > 1) { mx /= d; my /= d; }
    const sp = 460 * depthAt(a.y);
    a.y = clamp(a.y + my * sp * 0.7 * dt, FLOOR_Y0 + 40, FLOOR_Y1 - 16);
    const half = floorHalf(a.y) - 90;
    a.x = clamp(a.x + mx * sp * dt, 960 - half, 960 + half);
    a.scale = T.base * depthAt(a.y);
    if (jump && a.z <= 0) { T.vz = 980 * depthAt(a.y); snd('boing', 'jump', { vol: 0.35 }); a.squash(-0.25); }
    T.vz -= 2800 * dt; a.z = Math.max(0, a.z + T.vz * dt);
    if (a.z <= 0 && T.vz < 0) { if (T.vz < -200) a.squash(0.2); T.vz = 0; }
    if (pose && T.poseCD <= 0) { T.poseCD = 0.35; strikePhotoPose(a, pose, { onBump: (who) => this.bumpNeighbours(st, who) }); }
    if (a.z > 0) { if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1; if (!a._once) a.setPose('jump'); }
    else a.moveAnim(mx * sp, my * sp, sp);
  }

  /** The bump pose nudges whoever is standing close by (they stumble a little). */
  bumpNeighbours(st, a) {
    for (const o of this.stations) {
      if (o === st || !o.tour || o.tour.state !== 'cheese') continue;
      const b = o.actor, dx = b.x - a.x;
      if (Math.abs(dx) < (a.width + b.width) * 0.45 && Math.abs(b.y - a.y) < 60) {
        const half = floorHalf(b.y) - 90;
        b.x = clamp(b.x + Math.sign(dx || 1) * 70 * depthAt(b.y), 960 - half, 960 + half);
        b.playOnce('surprised', 0.8, 'idle'); b.squash(0.2); o.tour.vz = Math.max(o.tour.vz, 300);
      }
    }
    sfx('boing', { vol: 0.4 });
  }

  startAct(st) {
    const T = st.tour, a = st.actor;
    if (T.face) a.facing = T.face;
    switch (T.kind) {
      case 'bounce': a.setPose('jump'); break;
      case 'sit': a.setPose('sit'); a.emote('happy', 1.4); break;
      case 'pet': a.setPose('cheer'); { const pet = this.pets.find((p) => p.bed === T.item); if (pet) { pet.state = 'sit'; pet.t = -99; pet.happy = true; snd('tiny-squeak', 'bubble'); } } break;
      case 'dance': a.setPose('dance'); break;
      case 'wave': a.setPose('wave'); break;
      case 'hug': a.setPose('cheer'); a.emote('heart', 1.5); break;
      default: a.setPose('celebrate');
    }
    particles.burst(a.x, a.y - a.z - a.height * 0.6, { type: pick(['heart', 'star', 'sparkle']), count: 6 });
  }

  doAct(st, dt) {
    const T = st.tour, a = st.actor;
    if (T.kind === 'bounce') {
      T.ph = (T.ph || 0) + dt * 5.2;
      const b = Math.abs(Math.sin(T.ph));
      a.z = T.top + b * 60 * depthAt(a.y);
      const goingUp = Math.cos(T.ph) * Math.sin(T.ph) > 0;
      if (!a._once) a.setPose(goingUp ? 'jump' : 'fall');
      if (b < 0.08 && (T.lastB || 1) >= 0.08) { a.squash(0.25); T.item.bump = this.t; if (chance(0.5)) snd('boing', 'bounce', { vol: 0.35 }); }
      T.lastB = b;
    } else if (T.kind === 'sit') {
      a.z = T.top;
      if (!a._once) a.setPose('sit');
      if (chance(dt * 0.4)) a.emote(pick(['happy', 'heart']), 1.2);
    } else if (T.kind === 'pet') {
      if (chance(dt * 1.2)) { const pet = this.pets.find((p) => p.bed === T.item); if (pet) particles.burst(pet.x, pet.y - 40 * depthAt(pet.y), { type: 'heart', count: 1, speed: [40, 90] }); }
    } else if (T.kind === 'dance') {
      if (chance(dt * 0.8)) particles.burst(a.x, a.y - a.height, { type: 'note', count: 1, speed: [50, 110] });
    }
  }

  /** Photo: render the world around (cx, cy) into a small canvas and pin it as a polaroid. */
  snap(cx, cy, zoom, shot) {
    const st = shot.st;
    const img = this.renderPhoto(cx, cy, zoom, 384, 240);
    // 4 big polaroids in the corners, or (5+ shots) up to 8 smaller ones stacked down each side
    const many = this.tourShots.length > 4;
    const slots = many
      ? [[125, 250, -0.08], [W - 125, 250, 0.07], [125, 430, 0.06], [W - 125, 430, -0.06], [125, 610, -0.05], [W - 125, 610, 0.08], [125, 790, 0.07], [W - 125, 790, -0.07]]
      : [[160, 340, -0.1], [W - 160, 340, 0.09], [160, 700, 0.07], [W - 160, 700, -0.08]];
    const k = this.photos.length % slots.length;
    const caption = st ? ({ bounce: 'Bouncy bed!', sit: 'So comfy!', pet: 'Pet cuddles!', dance: 'Dance party!', hug: 'Plushie hug!', wave: 'Hello, sky!' }[st.tour.kind] || 'Yay!') : shot.caption();
    this.photos.push({ img, x: slots[k][0], y: slots[k][1], rot: slots[k][2], s: many ? 0.68 : 1, t: 0, caption, color: st ? st.p.color : shot.color });
    snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.3);
  }

  renderPhoto(cx, cy, zoom, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const k = w / (W / zoom);
    g.setTransform(k, 0, 0, k, w / 2 - cx * k, h / 2 - cy * k);
    // The camera flash lights up a night-time room a little.
    const nk = this.nightK;
    this.nightK = nk * 0.55;
    try { this.drawWorld(g, { photo: true }); } catch (e) { console.warn(e); }
    this.nightK = nk;
    return c;
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    if (this.crickets) { this.crickets.stop(0.5); this.crickets = null; }
    const stats = this.stations.map((st) => {
      const s = st.stats, parts = [];
      if (s.placed) parts.push(`${s.placed} thing${s.placed === 1 ? '' : 's'}`);
      if (s.plush) parts.push(`${s.plush} plush${s.plush === 1 ? 'ie' : 'ies'}`);
      else if (s.paints) parts.push(`${s.paints} paint${s.paints === 1 ? '' : 's'}`);
      return (this.n > 4 ? parts.slice(0, 1) : parts).join(' · ') || 'Room helper!';
    });
    this.api.finish({ showcase: true, highlight: null, stats, title: 'Dreamy room!', focus: { x: W / 2, y: H / 2, zoom: 1.08 } });
  }

  onDone() {
    if (this.phase === 'build') this.startTour();
    else if (this.groupT >= LINEUP && !this.bigPhoto) this.groupT = Math.max(this.groupT, LINEUP + CHEESE_TIME - 0.5);
    else this.finishGame();
  }

  destroy() { if (this.crickets) { this.crickets.stop(0.1); this.crickets = null; } }

  // ===========================================================================
  // Drawing
  draw(g) {
    this.drawWorld(g);
  }

  drawWorld(g, o = {}) {
    this.drawOutside(g);
    this.drawRoom(g);
    const env = this.env;
    const order = this.drawOrder(true);
    for (const e of order) {
      if (e.def) this.drawOneItem(g, e, env);
      else if (e.pet) this.drawPet(g, e.pet);
      else if (e.actor) e.actor.actor.draw(g, { ring: o.photo ? null : e.actor.p.color });
    }
    this.drawNight(g, order, env);
    if (this.phase === 'build' && !o.photo) for (const st of this.stations) { st.actor.draw(g, { ring: st.p.color }); }
  }

  /** Backdrop, roof and title (static: drawn once into a cached canvas). */
  paintOutside(g) {
    // Playroom behind the dollhouse (optional art bg/dream-room, else drawn).
    const bg = art('bg/dream-room');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#ffe3f1'); gr.addColorStop(1, '#e2d9ff');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = 0.35;
      for (let y = 40, r = 0; y < 960; y += 120, r++) for (let x = (r % 2) * 80; x < W; x += 160) { g.save(); g.translate(x, y); drawStarShape(g, 18, '#ffffff'); g.restore(); }
      g.restore();
      // table top the dollhouse stands on
      g.fillStyle = '#f2c79a'; g.fillRect(0, 930, W, H - 930);
      g.fillStyle = 'rgba(160,100,50,0.25)'; g.fillRect(0, 930, W, 10);
    }
    // roof
    g.save();
    polyPath(g, [[392, 202], [960, 30], [1528, 202]]);
    g.fillStyle = '#ff9ec4'; g.fill();
    g.clip();
    g.fillStyle = '#ff86b6';
    for (let y = 40, r = 0; y < 210; y += 30, r++) for (let x = 380 + (r % 2) * 22; x < 1540; x += 44) { g.beginPath(); g.arc(x, y + 22, 22, 0, Math.PI); g.fill(); }
    g.restore();
    polyPath(g, [[392, 202], [960, 30], [1528, 202]]); g.lineWidth = 6; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
    g.beginPath(); g.moveTo(380, 206); g.lineTo(960, 26); g.lineTo(1540, 206); g.lineWidth = 14; g.strokeStyle = '#fff4e6'; g.stroke(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
  }

  drawOutside(g) {
    if (!outsideCache) {
      outsideCache = document.createElement('canvas'); outsideCache.width = W; outsideCache.height = H;
      this.paintOutside(outsideCache.getContext('2d'));
    }
    g.drawImage(outsideCache, 0, 0, W, H);
    // round attic window with a heart
    g.beginPath(); g.arc(960, 96, 34, 0, TAU); g.fillStyle = this.nightK > 0.5 ? '#ffe9a8' : '#bfe6ff'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff4e6'; g.stroke(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    g.save(); g.translate(960, 98); drawHeartShape(g, 30, '#ff6fb1'); g.restore();
    // title ribbon
    g.save(); g.translate(960, 160);
    g.fillStyle = '#c2185b'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 200, -18); g.lineTo(s * 250, -18); g.lineTo(s * 232, 4); g.lineTo(s * 250, 26); g.lineTo(s * 200, 26); g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
    ui.panel(g, -214, -26, 428, 54, { r: 14, fill: '#ff4f9a', lineWidth: 4, shadow: false });
    ui.text(g, 'Dream Room', 0, 2, { size: 40, weight: 800 });
    g.restore();
  }

  wallPattern(g, i) {
    let e = this.patterns.get(i);
    if (!e || e.g !== g) { e = { g, pat: g.createPattern(wallCanvas(i), 'repeat') }; this.patterns.set(i, e); }
    return e.pat;
  }

  drawRoom(g) {
    // back wall (with a wipe while it changes)
    const wipe = this.wallFx ? ease.inOutQuad(this.wallFx.t) : 1;
    const wx = WALL.x0, ww = WALL.x1 - WALL.x0, wh = WALL.y1 - WALL.y0;
    if (this.wallFx) g.drawImage(wallCanvas(this.wallFx.from), wx, WALL.y0, ww, wh);
    g.save(); g.beginPath(); g.rect(wx, WALL.y0, ww * wipe, wh); g.clip(); g.drawImage(wallCanvas(this.wall), wx, WALL.y0, ww, wh); g.restore();
    // side walls: the pattern, shaded
    for (const side of ['left', 'right']) {
      const idx = this.wallFx && wipe < (side === 'left' ? 0.1 : 0.9) ? this.wallFx.from : this.wall;
      g.save(); polyPath(g, POLY[side]); g.fillStyle = this.wallPattern(g, idx); g.fill();
      const gr = g.createLinearGradient(side === 'left' ? 270 : 1650, 0, side === 'left' ? 420 : 1500, 0);
      gr.addColorStop(0, 'rgba(60,30,90,0.12)'); gr.addColorStop(1, 'rgba(60,30,90,0.3)');
      g.fillStyle = gr; g.fill(); g.restore();
    }
    // floor
    const fwipe = this.floorFx ? ease.inOutQuad(this.floorFx.t) : 1;
    if (this.floorFx) g.drawImage(floorCanvas(this.floorFx.from), FLOOR_BOX.x, FLOOR_BOX.y);
    g.save(); g.beginPath(); g.rect(FLOOR_BOX.x, FLOOR_BOX.y, FLOOR_BOX.w * fwipe, FLOOR_BOX.h); g.clip(); g.drawImage(floorCanvas(this.floor), FLOOR_BOX.x, FLOOR_BOX.y); g.restore();
    // baseboards and corners
    g.lineCap = 'round';
    const board = (x0, y0, x1, y1, w) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = w + 6; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = w; g.strokeStyle = '#ffffff'; g.stroke(); };
    board(420, 584, 1500, 584, 10); board(420, 586, 270, 922, 9); board(1500, 586, 1650, 922, 9);
    g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.5)';
    g.beginPath(); g.moveTo(420, 200); g.lineTo(420, 580); g.moveTo(1500, 200); g.lineTo(1500, 580); g.stroke();
    this.drawDoor(g);
    this.drawSwitch(g);
    // dollhouse cut edges: wall thickness and the floor slab
    const cut = '#fff4e6';
    g.lineJoin = 'round';
    polyPath(g, [[262, 432], [270, 432], [420, 200], [1500, 200], [1650, 432], [1658, 432], [1506, 192], [414, 192]]);
    g.fillStyle = cut; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    for (const x of [254, 1650]) { g.fillStyle = cut; g.fillRect(x, 432, 16, 500); g.strokeRect(x, 432, 16, 500); }
    g.fillStyle = '#e8b989'; g.fillRect(254, 928, 1412, 22); g.strokeRect(254, 928, 1412, 22);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(256, 930, 1408, 5);
  }

  doorPts() {
    const { z0, z1, h } = DOOR;
    return { hb: proj(HALF, 0, z0), ht: proj(HALF, h, z0), fb: proj(HALF, 0, z1), ft: proj(HALF, h, z1) };
  }

  drawDoor(g) {
    const P = this.doorPts(), o = this.doorK;
    // frame
    polyPath(g, [[P.hb.x, P.hb.y], [P.ht.x, P.ht.y], [P.ft.x, P.ft.y], [P.fb.x, P.fb.y]]);
    g.fillStyle = '#ffe9b8'; g.fill();
    const gr = g.createLinearGradient(P.fb.x, 0, P.hb.x, 0); gr.addColorStop(0, 'rgba(255,190,120,0.6)'); gr.addColorStop(1, 'rgba(255,240,200,0.2)');
    g.fillStyle = gr; g.fill();
    g.lineWidth = 12; g.strokeStyle = '#ffffff'; g.lineJoin = 'round'; g.stroke(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    // leaf swings into the room from the hinge on the front edge
    const sw = (p, q) => ({ x: lerp(q.x, p.x - 74, o), y: lerp(q.y, p.y + 22, o) });
    const ft = sw(P.ht, P.ft), fb = sw(P.hb, P.fb);
    polyPath(g, [[P.hb.x, P.hb.y], [P.ht.x, P.ht.y], [ft.x, ft.y], [fb.x, fb.y]]);
    g.fillStyle = shade('#ff9ec4', -0.08 * o); g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    if (o < 0.5) {
      // details in the wall's perspective: u across (0 = back edge, 1 = hinge), v up
      const D = (u, v) => ({ x: lerp(P.fb.x, P.hb.x, u), y: lerp(lerp(P.fb.y, P.ft.y, v), lerp(P.hb.y, P.ht.y, v), u) });
      const quadD = (u0, v0, u1, v1) => { const a = D(u0, v0), b = D(u1, v0), c = D(u1, v1), d = D(u0, v1); polyPath(g, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]]); };
      g.lineWidth = 2.5; g.strokeStyle = shade('#ff9ec4', -0.35);
      quadD(0.18, 0.1, 0.82, 0.42); g.stroke();
      g.beginPath();
      for (let i = 0; i <= 20; i++) { const a = (i / 20) * TAU, q = D(0.5 + Math.cos(a) * 0.24, 0.72 + Math.sin(a) * 0.12); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }
      g.closePath(); g.fillStyle = '#bfe6ff'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      const k = D(0.84, 0.48);
      g.beginPath(); g.arc(k.x, k.y, 6, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 2.5; g.stroke();
    }
  }

  drawSwitch(g) {
    const { x, y } = SWITCH;
    const b = this.switchBump !== undefined ? clamp(1 - (this.t - this.switchBump) / 0.3, 0, 1) : 0;
    // glow ring so it reads as something to press
    if (this.phase === 'build') { g.save(); g.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 3); g.drawImage(glowSprite(this.night ? MOON : WARM), x - 60, y - 60, 120, 120); g.restore(); }
    g.save(); g.translate(x, y); g.transform(0.82, 0.75, 0, 1, 0, 0); g.scale(1 + b * 0.2, 1 + b * 0.2);
    ui.roundRect(g, -20, -32, 40, 64, 9); g.fillStyle = '#fff8ec'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    ui.roundRect(g, -9, -20, 18, 40, 6); g.fillStyle = '#e4dcf2'; g.fill(); g.lineWidth = 2.5; g.stroke();
    ui.roundRect(g, -8, this.night ? 0 : -19, 16, 19, 5); g.fillStyle = this.night ? '#9b5cff' : '#ffd23f'; g.fill(); g.lineWidth = 3; g.stroke();
    g.restore();
    // a tiny bulb / moon sign above it
    g.save(); g.translate(x + 4, y - 50);
    if (this.night) { g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fillStyle = '#fff6c8'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke(); g.beginPath(); g.arc(5, -4, 9, 0, TAU); g.fillStyle = '#3d3a8e'; g.fill(); }
    else { g.beginPath(); g.arc(0, -2, 10, 0, TAU); g.fillStyle = '#fff1a8'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke(); g.fillStyle = '#c9c2d8'; g.fillRect(-5, 7, 10, 7); g.strokeRect(-5, 7, 10, 7); }
    g.restore();
    if (!this.switchUsed && this.phase === 'build') {
      const k = (this.t * 0.8) % 1;
      g.save(); g.globalAlpha = Math.sin(k * Math.PI); g.translate(x + 30, y - 40 - k * 16); drawSparkleShape(g, 26, '#fff6a8'); g.restore();
    }
  }

  drawOneItem(g, it, env, alpha = 1) {
    const d = it.def, s = it.s;
    const age = this.t - it.born, pop = age < 0.4 ? ease.outBack(clamp(age / 0.4, 0, 1)) : 1;
    const b = this.t - it.bump, sq = b >= 0 && b < 0.7 ? Math.sin(b * 22) * Math.exp(-b * 7) * 0.2 : 0;
    // contact shadow
    if ((d.cat === 'floor' || d.cat === 'small') && alpha === 1) {
      g.save(); g.globalAlpha = 0.18 * pop; g.fillStyle = NAVY;
      g.beginPath(); g.ellipse(it.x, it.y + 1, d.w * 0.42 * s, Math.max(4, 11 * s), 0, 0, TAU); g.fill(); g.restore();
    }
    g.save();
    g.globalAlpha *= alpha;
    g.translate(it.x, it.y - it.z);
    if (d.rock) { const r = Math.sin(this.t * 2.2 + it.seed * 9) * (0.04 + (b < 2 ? 0.08 * (1 - b / 2) : 0)); g.translate(0, -8 * s); g.rotate(r); g.translate(0, 8 * s); }
    g.scale(s * pop * it.flip * (1 + sq), s * pop * (1 - sq));
    paintItem(g, d, it, env);
    if (d.front) {
      const pet = this.pets.find((p) => p.bed === it && p.state === 'curl');
      if (pet) { g.save(); g.scale(it.flip, 1); this.drawPetShape(g, pet, true); g.restore(); }
      drawItemFront(g, d, it, env);
    }
    g.restore();
  }

  drawNight(g, order, env) {
    const k = this.nightK;
    if (k < 0.01) return;
    g.save();
    g.globalAlpha = k;
    g.fillStyle = 'rgba(30,20,80,0.22)'; g.fillRect(0, 0, W, H);
    roomPath(g); g.fillStyle = 'rgba(18,14,64,0.42)'; g.fill();
    g.restore();
    // light pools ('screen' so many lamps together don't blow out to white)
    g.save(); g.globalCompositeOperation = 'screen';
    for (const it of order) {
      if (!it.def || !it.def.lights) continue;
      const d = it.def, s = it.s;
      const col = d.lightColor ? MOON : WARM;
      for (const [lx, ly, r] of d.lights) {
        const x = it.x + lx * s * it.flip, y = it.y - it.z + ly * s;
        const flick = 1 + Math.sin(this.t * 7 + it.seed * 20) * 0.02;
        g.globalAlpha = k * (d.lightColor ? 0.4 : 0.7);
        g.drawImage(glowSprite(col), x - r * s * flick, y - r * s * flick, r * 2 * s * flick, r * 2 * s * flick);
      }
    }
    g.restore();
    // glowing bits drawn bright on top
    for (const it of order) {
      if (!it.def || !it.def.glow) continue;
      g.save(); g.globalAlpha = k;
      g.translate(it.x, it.y - it.z); g.scale(it.s * it.flip, it.s);
      drawItemGlow(g, it.def, it, env);
      g.restore();
    }
    // glow-in-the-dark stars appear on the wall
    for (const [i, [x, y]] of GLOW_STARS.entries()) {
      g.save(); g.globalAlpha = k * (0.55 + 0.45 * Math.sin(this.t * 1.5 + i));
      g.translate(x, y); g.rotate(i * 0.7); drawStarShape(g, 16 + (i % 3) * 5, '#eaffb0'); g.restore();
    }
  }

  // --- pets ---------------------------------------------------------------------------------
  drawPet(g, pet) {
    const s = depthAt(pet.y);
    g.save(); g.translate(pet.x, pet.y - (pet.hop > 0 ? Math.sin(pet.hop / 0.35 * Math.PI) * 30 * s : 0));
    g.scale(s, s);
    this.drawPetShape(g, pet, false);
    g.restore();
  }

  drawPetShape(g, pet, inBed) {
    const kitty = pet.kind === 'kitty';
    const fur = kitty ? '#ffb36b' : '#e6c29a', dark = kitty ? '#e8893f' : '#9a6a44', belly = '#fff4e6';
    const lw = 3.5, t = this.t;
    const E = (x, y, rx, ry, fill, rot = 0, stroke = true) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = NAVY; g.stroke(); } };
    g.save();
    g.scale(pet.facing, 1);
    if (pet.state === 'curl' || inBed) {
      const br = 1 + Math.sin(t * 2.4 + pet.x) * 0.035;
      g.translate(0, -16);
      E(0, -10, 40 * br, 20 * br, fur);
      g.beginPath(); g.ellipse(-4, 2, 40, 10, 0, 0.1, Math.PI - 0.3); g.lineWidth = 12; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 7; g.strokeStyle = dark; g.stroke();
      E(26, -14, 17, 14, fur);
      if (kitty) { for (const ex of [16, 32]) { g.beginPath(); g.moveTo(ex - 7, -24); g.lineTo(ex, -36); g.lineTo(ex + 6, -24); g.closePath(); g.fillStyle = fur; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); } }
      else E(16, -16, 6, 11, dark, 0.4);
      g.strokeStyle = NAVY; g.lineWidth = 2.5; g.beginPath(); g.arc(22, -15, 3.5, 0.2, Math.PI - 0.2); g.moveTo(34, -15); g.arc(31, -15, 3.5, 0.2, Math.PI - 0.2); g.stroke();
      E(34, -8, 3, 2.4, '#ff8fb6', 0, false);
      // zzz
      const zp = (t * 0.5 + pet.x * 0.01) % 1;
      g.restore(); g.save();
      ui.text(g, 'z', 40 + zp * 16, -50 - zp * 40, { size: 22 + zp * 8, color: '#ffffff', alpha: Math.sin(zp * Math.PI), strokeWidth: 4 });
      g.restore();
      return;
    }
    if (pet.state === 'sit') {
      E(0, -26, 20, 26, fur);
      E(0, -20, 11, 16, belly, 0, false);
      g.beginPath(); g.moveTo(-14, -6); g.quadraticCurveTo(-40, -6, -36, -34); g.lineWidth = 9; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 5; g.strokeStyle = dark; g.stroke();
      this.petHead(g, kitty, fur, dark, 4, -58, pet.happy);
      g.restore();
      return;
    }
    // walking
    const ph = t * 12;
    for (const [lx, o] of [[-16, 0], [-6, Math.PI], [12, Math.PI], [22, 0]]) { g.beginPath(); g.moveTo(lx, -16); g.lineTo(lx + Math.sin(ph + o) * 5, -2); g.lineWidth = 8; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = fur; g.stroke(); }
    g.beginPath(); g.moveTo(-26, -24); g.quadraticCurveTo(-44, -40 + Math.sin(t * 6) * 6, -36, -56); g.lineWidth = 9; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 5; g.strokeStyle = dark; g.stroke();
    E(0, -24, 30, 14, fur);
    this.petHead(g, kitty, fur, dark, 28, -42, false);
    g.restore();
  }

  petHead(g, kitty, fur, dark, x, y, happy) {
    g.save(); g.translate(x, y);
    if (kitty) for (const ex of [-9, 9]) { g.beginPath(); g.moveTo(ex - 7, -8); g.lineTo(ex, -22); g.lineTo(ex + 7, -8); g.closePath(); g.fillStyle = fur; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
    g.beginPath(); g.ellipse(0, 0, 17, 14, 0, 0, TAU); g.fillStyle = fur; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    if (!kitty) for (const ex of [-14, 14]) { g.beginPath(); g.ellipse(ex, 2, 6, 11, ex > 0 ? -0.3 : 0.3, 0, TAU); g.fillStyle = dark; g.fill(); g.lineWidth = 3; g.stroke(); }
    if (happy) { g.lineWidth = 2.5; g.beginPath(); g.arc(-6, -1, 3.5, Math.PI + 0.3, -0.3); g.moveTo(9.5, -1); g.arc(6, -1, 3.5, Math.PI + 0.3, -0.3); g.stroke(); }
    else { g.fillStyle = NAVY; g.beginPath(); g.arc(-6, -2, 2.6, 0, TAU); g.arc(6, -2, 2.6, 0, TAU); g.fill(); }
    g.fillStyle = '#ff8fb6'; g.beginPath(); g.ellipse(0, 4, 3, 2.2, 0, 0, TAU); g.fill();
    g.restore();
  }

  // ===========================================================================
  // HUD (screen space)
  drawHUD(g) {
    if (this.phase === 'build') {
      this.drawGhosts(g);
      this.drawLegend(g);
      this.drawTopRight(g);
      for (const st of this.stations) this.drawPanel(g, st);
      for (const st of this.stations) this.drawCursor(g, st);
    }
    for (const gft of this.gifts) this.drawGift(g, gft);
    for (const ph of this.photos) this.drawPolaroid(g, ph);
    if (this.phase === 'tour') this.drawCheeseHUD(g);
    if (this.bigPhoto) this.drawBigPhoto(g);
    if (this.banner) ui.banner(g, this.banner.text, this.banner.t, { size: 110, y: this.phase === 'tour' ? 140 : H / 2 - 60, color: '#ff8fd0' });
    if (this.toast) {
      const a = Math.min(1, (2 - this.toast.t) / 0.3);
      g.save(); g.globalAlpha = clamp(a, 0, 1);
      ui.panel(g, W / 2 - 420, 470, 840, 90, { r: 45, fill: '#fff8ec' });
      ui.text(g, this.toast.text, W / 2, 516, { size: 38, color: NAVY, stroke: false, weight: 800 });
      g.restore();
    }
    if (this.prompt) this.drawPrompt(g);
  }

  drawGhosts(g) {
    const env = this.env;
    for (const st of this.stations) {
      if (st.held) {
        const it = st.held, lift = 22 + Math.sin(this.t * 6) * 4;
        g.save(); g.globalAlpha = 0.25; g.fillStyle = NAVY;
        if (it.def.cat !== 'wall') { g.beginPath(); g.ellipse(it.x, it.y + 2, it.def.w * 0.42 * it.s, 12 * it.s, 0, 0, TAU); g.fill(); }
        g.restore();
        it.z = lift;
        this.drawOneItem(g, it, env);
        for (const k of this.childrenOf(it)) { k.x = it.x + k.ox * it.s * it.flip; k.y = this.surfaceTop(it).y; this.drawOneItem(g, k, env); }
        it.z = 0;
        continue;
      }
      if (TOOLS[st.tool].id !== 'place' || st.p.isAI || st.cur.y >= BAR.y - 6) continue;
      const e = PALETTE[st.sel];
      if (e.kind !== 'item' || !this.inRoom(st.cur.x, st.cur.y)) continue;
      const d = e.def, pl = this.placement(d, st.cur.x, st.cur.y);
      const ghost = { def: d, color: this.previewColor(st, d), x: pl.x, y: pl.y, z: 0, s: pl.s, flip: pl.parent ? pl.parent.flip : (d.cat === 'floor' || d.cat === 'small' ? (pl.x > 960 ? -1 : 1) : 1), seed: 0.5, born: -9, bump: -9, ghost: true };
      g.save();
      if (d.cat !== 'wall') { g.globalAlpha = 0.5; g.strokeStyle = st.p.color; g.lineWidth = 4; g.setLineDash([10, 8]); g.beginPath(); g.ellipse(pl.x, pl.y, Math.max(30, d.w * 0.45 * pl.s), Math.max(10, 14 * pl.s), 0, 0, TAU); g.stroke(); g.setLineDash([]); }
      g.restore();
      this.drawOneItem(g, ghost, env, 0.55 + Math.sin(this.t * 5) * 0.08);
    }
  }

  drawLegend(g) {
    const solo = this.humans === 1 ? this.stations.find((s) => !s.p.isAI) : null;
    const aLabel = solo ? TOOLS[solo.tool].name : 'Use tool';
    const rows = LEGEND_ROWS.map(([b, label]) => [b, label === 'Use tool' ? aLabel : label]);
    const rh = 50, h = rows.length * rh + 24;
    ui.panel(g, LEGEND.x, LEGEND.y, LEGEND.w, h, { r: 24, fill: 'rgba(255,248,236,0.94)', lineWidth: 5 });
    rows.forEach(([btns, label], i) => {
      const y = LEGEND.y + 12 + rh / 2 + i * rh;
      let x = LEGEND.x + 32;
      for (const b of btns) { ui.glyph(g, b, x, y, 36); x += b === 'lb' || b === 'rb' ? 50 : 44; }
      ui.text(g, label, Math.max(x, LEGEND.x + 82), y + 1, { size: 27, color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: LEGEND.x + LEGEND.w - Math.max(x, LEGEND.x + 82) - 10 });
    });
  }

  drawTopRight(g) {
    // Tour button
    const hot = this.stations.some((s) => !s.p.isAI && inRect(TOUR_BTN, s.cur.x, s.cur.y));
    const pulse = hot ? 1.06 + Math.sin(this.t * 10) * 0.03 : (this.timeLeft < 30 ? 1 + Math.sin(this.t * 5) * 0.03 : 1);
    const b = TOUR_BTN;
    g.save(); g.translate(b.x + b.w / 2, b.y + b.h / 2); g.scale(pulse, pulse);
    ui.panel(g, -b.w / 2, -b.h / 2, b.w, b.h, { r: b.h / 2, fill: hot ? '#5ff0a0' : '#36d17a', lineWidth: 5 });
    this.drawCameraIcon(g, -b.w / 2 + 50, 0, 50);
    ui.text(g, 'Tour!', 30, 2, { size: 46, weight: 800 });
    g.restore();
    // clock (+1 minute)
    const c = CLOCK, bump = this.clockBump !== undefined ? clamp(1 - (this.t - this.clockBump) / 0.4, 0, 1) : 0;
    g.save(); g.translate(c.x + c.w / 2, c.y + c.h / 2); g.scale(1 + bump * 0.1, 1 + bump * 0.1); g.translate(-(c.x + c.w / 2), -(c.y + c.h / 2));
    ui.panel(g, c.x, c.y, c.w, c.h, { r: c.h / 2, fill: '#fff8ec', lineWidth: 4 });
    const cx = c.x + 30, cy = c.y + c.h / 2;
    g.beginPath(); g.arc(cx, cy, 18, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    const frac = clamp(this.timeLeft / BUILD_TIME, 0, 1);
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 14, -Math.PI / 2, -Math.PI / 2 + frac * TAU); g.closePath(); g.fillStyle = '#ff9f1c'; g.fill();
    const s = Math.max(0, Math.ceil(this.timeLeft));
    ui.text(g, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, c.x + 92, cy + 1, { size: 32, color: this.timeLeft < 30 ? '#ff4d6d' : NAVY, stroke: false, weight: 800 });
    const p = CLOCK_PLUS, phot = this.stations.some((st) => !st.p.isAI && inRect(p, st.cur.x, st.cur.y));
    g.beginPath(); g.arc(p.x + p.w / 2, cy, phot ? 23 : 20, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    ui.text(g, '+', p.x + p.w / 2, cy - 1, { size: 36, weight: 800 });
    g.restore();
    // confirm bubbles
    for (const st of this.stations) {
      if (!st.confirm) continue;
      const w = 420, h = 150, px = W - w - 20, py = 186;
      ui.panel(g, px, py, w, h, { r: 26, fill: '#fff8ec', stroke: st.p.color, lineWidth: 6 });
      ui.text(g, 'Room tour now?', px + w / 2, py + 42, { size: 38, color: NAVY, stroke: false, weight: 800 });
      ui.hints(g, [['a', 'Yes!'], ['b', 'Not yet']], px + w / 2, py + 106, { size: 40, color: '#ff6fb1' });
    }
  }

  drawCameraIcon(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s / 50, s / 50);
    ui.roundRect(g, -22, -14, 44, 30, 7); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    ui.roundRect(g, -10, -20, 20, 8, 3); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 1, 9, 0, TAU); g.fillStyle = '#7fd3ff'; g.fill(); g.stroke();
    g.beginPath(); g.arc(-3, -2, 3, 0, TAU); g.fillStyle = '#fff'; g.fill();
    g.restore();
  }

  panelLayout(st) {
    const P = st.panel, wide = P.w >= 380;
    let x = P.x + 12;
    const portX = wide ? x + 30 : null;
    if (wide) x += 66;
    const toolX = x + 34, toolY = P.y + P.h / 2 + 4;
    x += 74;
    const glyphW = P.w >= 300 ? 30 : 0;
    const c0 = x + glyphW, c1 = P.x + P.w - 12 - glyphW;
    const ss = Math.min(76, P.h - 48), gap = 10;
    return { portX, toolX, toolY, c0, c1, mid: (c0 + c1) / 2, ss, gap, glyphW, slotY: P.y + 44 + ss / 2 - 6 };
  }

  drawPanel(g, st) {
    const P = st.panel, p = st.p, L = this.panelLayout(st);
    ui.panel(g, P.x, P.y, P.w, P.h, { r: 22, fill: '#fff8ec', stroke: p.color, lineWidth: 6 });
    if (L.portX) {
      drawPortrait(g, p, L.portX, P.y + 50, 30, { ring: p.color, ringWidth: 4, expr: 'happy' });
      ui.text(g, p.tag, L.portX, P.y + P.h - 20, { size: 22, color: p.color, strokeWidth: 4 });
    }
    // tool button
    const tp = 1 + st.toolPop * 0.25;
    g.save(); g.translate(L.toolX, L.toolY); g.scale(tp, tp);
    g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fillStyle = st.tool === 0 ? '#ffffff' : st.tool === 1 ? '#bfe6ff' : '#ffd6ec'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    this.drawToolIcon(g, TOOLS[st.tool].id, 0, -4, 40, p.color);
    g.restore();
    ui.glyph(g, 'x', L.toolX + 26, L.toolY + 24, 24);
    if (P.w >= 300) ui.text(g, TOOLS[st.tool].name, L.toolX, P.y + 14, { size: 20, color: NAVY, stroke: false, weight: 800 });
    // carousel
    const N = PALETTE.length, dim = st.tool !== 0;
    if (L.glyphW) { ui.glyph(g, 'lb', L.c0 - 16, L.slotY, 26); ui.glyph(g, 'rb', L.c1 + 16, L.slotY, 26); }
    g.save(); g.beginPath(); g.rect(L.c0, P.y + 4, L.c1 - L.c0, P.h - 8); g.clip();
    if (dim) g.globalAlpha = 0.45;
    const base = Math.round(st.scroll), frac = st.scroll - base, step = L.ss + L.gap;
    const half = Math.ceil((L.c1 - L.c0) / step / 2) + 1;
    for (let k = -half; k <= half; k++) {
      const idx = (((base + k) % N) + N) % N, e = PALETTE[idx];
      const x = L.mid + (k - frac) * step;
      const sel = idx === st.sel;
      const z = sel ? 1 + st.selPop * 0.15 : 0.88;
      const s = L.ss * z;
      g.save(); g.translate(x, L.slotY);
      ui.roundRect(g, -s / 2, -s / 2, s, s, 14);
      g.fillStyle = sel ? '#fff3b0' : '#ffffff'; g.fill();
      g.lineWidth = sel ? 5 : 3; g.strokeStyle = sel ? NAVY : GROUPS[e.group].color; g.stroke();
      this.drawEntryIcon(g, e, 0, 0, s * 0.8, st);
      g.fillStyle = GROUPS[e.group].color; ui.roundRect(g, -s * 0.3, s / 2 - 6, s * 0.6, 7, 3); g.fill();
      g.restore();
    }
    g.restore();
    // name of the selected thing
    const e = PALETTE[st.sel];
    const nx = P.w >= 300 ? L.mid : (P.x + 12 + L.c1) / 2;
    ui.text(g, e.name, nx, P.y + 16, { size: 21, color: dim ? '#8f84a6' : NAVY, stroke: false, weight: 800, maxWidth: P.w >= 300 ? L.c1 - L.c0 : P.w - 24 });
  }

  drawEntryIcon(g, e, x, y, size, st) {
    if (e.kind === 'item') { drawIconOf(g, e.def, x, y, size, this.previewColor(st, e.def), { t: this.t, night: 0 }); return; }
    const img = swatch(e.kind, e.idx);
    g.save(); ui.roundRect(g, x - size / 2, y - size / 2, size, size, 10); g.clip();
    g.drawImage(img, x - size / 2, y - size / 2, size, size);
    g.restore();
    ui.roundRect(g, x - size / 2, y - size / 2, size, size, 10); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    const current = e.kind === 'wall' ? this.wall === e.idx : this.floor === e.idx;
    if (current) { g.beginPath(); g.arc(x + size * 0.36, y - size * 0.36, size * 0.17, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 2.5; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + size * 0.29, y - size * 0.36); g.lineTo(x + size * 0.34, y - size * 0.3); g.lineTo(x + size * 0.43, y - size * 0.43); g.stroke(); }
    // little roller or floor tag
    g.save(); g.translate(x - size * 0.34, y + size * 0.34);
    if (e.kind === 'wall') { g.beginPath(); g.arc(0, 0, size * 0.16, 0, TAU); g.fillStyle = '#25d0c8'; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); drawSparkleShape(g, size * 0.2, '#ffffff'); }
    else { g.beginPath(); g.arc(0, 0, size * 0.16, 0, TAU); g.fillStyle = '#c98a4b'; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
    g.restore();
  }

  drawToolIcon(g, id, x, y, s, color) {
    g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 3;
    if (id === 'place') {
      drawStarShape(g, 34, '#ffd23f');
      g.beginPath(); g.arc(12, 12, 9, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(7, 12); g.lineTo(17, 12); g.moveTo(12, 7); g.lineTo(12, 17); g.stroke();
    } else if (id === 'move') {
      this.drawGlove(g, 0, 8, color, 'open', 0.9);
    } else {
      g.save(); g.rotate(0.6);
      ui.roundRect(g, -4, -2, 8, 26, 3); g.fillStyle = '#c98a4b'; g.fill(); g.stroke();
      ui.roundRect(g, -6, -10, 12, 9, 2); g.fillStyle = '#d8d8ea'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-7, -10); g.quadraticCurveTo(0, -30, 7, -10); g.closePath(); g.fillStyle = color; g.fill(); g.stroke();
      g.restore();
      g.beginPath(); g.arc(-12, 10, 5, 0, TAU); g.fillStyle = color; g.fill();
    }
    g.restore();
  }

  /** Cartoon glove; the fingertip of 'point' is at (x, y). */
  drawGlove(g, x, y, color, kind = 'point', s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.3);
    g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = NAVY;
    const W2 = '#ffffff';
    if (kind === 'point') {
      ui.roundRect(g, -7, 0, 14, 34, 7); g.fillStyle = W2; g.fill(); g.stroke();
      ui.roundRect(g, -17, 22, 36, 34, 13); g.fill(); g.stroke();
      for (const fx2 of [-6, 4]) { g.beginPath(); g.arc(fx2 + 4, 24, 6, Math.PI, 0); g.stroke(); }
      g.beginPath(); g.ellipse(-18, 38, 7, 11, 0.5, 0, TAU); g.fill(); g.stroke();
      ui.roundRect(g, -16, 52, 34, 13, 5); g.fillStyle = color; g.fill(); g.stroke();
    } else if (kind === 'grab') {
      ui.roundRect(g, -18, 4, 38, 34, 15); g.fillStyle = W2; g.fill(); g.stroke();
      for (const fx2 of [-10, 0, 10]) { g.beginPath(); g.arc(fx2 + 1, 8, 5.5, Math.PI, 0); g.stroke(); }
      ui.roundRect(g, -16, 36, 34, 13, 5); g.fillStyle = color; g.fill(); g.stroke();
    } else {
      for (const [fx2, fl] of [[-12, 16], [-4, 22], [5, 21], [13, 15]]) { ui.roundRect(g, fx2 - 4, -fl + 10, 9, fl + 6, 4.5); g.fillStyle = W2; g.fill(); g.stroke(); }
      ui.roundRect(g, -18, 8, 38, 30, 13); g.fillStyle = W2; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(-20, 22, 6, 11, 0.6, 0, TAU); g.fill(); g.stroke();
      ui.roundRect(g, -16, 34, 34, 13, 5); g.fillStyle = color; g.fill(); g.stroke();
    }
    g.restore();
  }

  drawCursor(g, st) {
    const { x, y } = st.cur, p = st.p, tool = TOOLS[st.tool].id;
    // hover brackets
    const hv = st.hover;
    if (hv && !st.held) {
      const r = this.itemRect(hv), pad = 8, L = 22;
      const strong = tool !== 'place';
      g.save(); g.lineWidth = strong ? 6 : 3; g.strokeStyle = p.color; g.globalAlpha = strong ? 0.75 + Math.sin(this.t * 8) * 0.25 : 0.5; g.lineCap = 'round';
      for (const [cx, cy, sx, sy] of [[r.x0 - pad, r.y0 - pad, 1, 1], [r.x1 + pad, r.y0 - pad, -1, 1], [r.x0 - pad, r.y1 + pad, 1, -1], [r.x1 + pad, r.y1 + pad, -1, -1]]) {
        g.beginPath(); g.moveTo(cx + sx * L, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * L); g.stroke();
      }
      g.restore();
      if (tool === 'paint') {
        const d = hv.def, nc = d.colors[(hv.color + 1) % d.colors.length];
        g.beginPath(); g.arc(x + 34, y + 30, 13, 0, TAU);
        if (d.charItem) { drawPortrait(g, nc, x + 34, y + 30, 13); }
        else { g.fillStyle = typeof nc === 'string' && nc[0] === '#' ? nc : '#ff6fb1'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
      }
    }
    const pe = PALETTE[st.sel];
    if (((tool === 'paint' && !hv) || (tool === 'place' && pe.kind !== 'item' && !st.p.isAI)) && this.inRoom(x, y)) {
      // painting the wall / floor: show the pattern it will get
      const wallSide = tool === 'place' ? pe.kind === 'wall' : y < FLOOR_Y0;
      const idx = tool === 'place' ? pe.idx : wallSide ? (this.wall + 1) % WALLPAPERS.length : (this.floor + 1) % FLOORS.length;
      const img = swatch(wallSide ? 'wall' : 'floor', idx);
      g.save(); ui.roundRect(g, x + 20, y + 16, 44, 44, 10); g.clip(); g.drawImage(img, x + 20, y + 16, 44, 44); g.restore();
      ui.roundRect(g, x + 20, y + 16, 44, 44, 10); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    }
    const kind = tool === 'move' ? (st.held ? 'grab' : 'open') : 'point';
    if (tool === 'paint') {
      g.save(); g.translate(x, y); g.rotate(-0.5);
      this.drawToolIcon(g, 'paint', 10, 22, 56, p.color);
      g.restore();
      g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fillStyle = p.color; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    } else this.drawGlove(g, x, y, p.color, kind, 1);
    if (tool === 'place' && !st.held) {
      g.save(); g.translate(x - 22, y + 8); g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(-5, 0); g.lineTo(5, 0); g.moveTo(0, -5); g.lineTo(0, 5); g.stroke(); g.restore();
    }
    ui.text(g, p.tag, x + 30, y - 14, { size: 22, color: p.color, strokeWidth: 5 });
  }

  drawGift(g, gft) {
    const t = gft.t;
    let y = gft.y, sx = 1, sy = 1, rot = 0;
    if (t < 0.45) { const p = t / 0.45; y = lerp(gft.y - 520, gft.y, p * p); }
    else if (t < 0.6) { const p = (t - 0.45) / 0.15; sx = 1 + Math.sin(p * Math.PI) * 0.25; sy = 1 - Math.sin(p * Math.PI) * 0.2; }
    else { rot = Math.sin((t - 0.6) * 30) * 0.15 * (t - 0.6) * 3; sx = sy = 1 + (t - 0.6) * 0.4; }
    g.save(); g.translate(gft.x, y + 34); g.rotate(rot); g.scale(sx, sy);
    drawIconOf(g, ITEM.present, 0, -34, 80, gft.st.i % 5);
    g.restore();
    if (t > 0.6) { g.save(); g.globalAlpha = 0.7; g.translate(gft.x + 30, y - 40); drawSparkleShape(g, 26, '#fff6a8'); g.restore(); }
  }

  drawPolaroid(g, ph) {
    const t = ph.t, p = ease.outBack(clamp(t / 0.5, 0, 1));
    const x = lerp(W / 2, ph.x, p), y = lerp(H / 2, ph.y, p), sc = lerp(1.6, 1, p) * (ph.s || 1);
    const w = 270, h = 216;
    g.save(); g.translate(x, y); g.rotate(ph.rot * p); g.scale(sc, sc);
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 8, fill: '#ffffff', lineWidth: 4 });
    g.drawImage(ph.img, -w / 2 + 12, -h / 2 + 12, w - 24, (w - 24) * 0.625);
    g.strokeStyle = NAVY; g.lineWidth = 2; g.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, (w - 24) * 0.625);
    ui.text(g, ph.caption, 0, h / 2 - 26, { size: 26, color: ph.color, strokeWidth: 5 });
    g.fillStyle = 'rgba(255,240,180,0.9)'; g.save(); g.translate(0, -h / 2); g.rotate(-0.05); g.fillRect(-34, -10, 68, 20); g.restore();
    g.restore();
  }

  /** Group photo countdown (3-2-1) and the move/jump/pose hints. */
  drawCheeseHUD(g) {
    const t = this.groupT, shot = LINEUP + CHEESE_TIME;
    if (t < LINEUP || this.bigPhoto) return;
    if (t >= shot - 3) { const n = Math.ceil(shot - t), f = 1 - (shot - t - (n - 1)); g.save(); g.translate(W / 2, 300); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(n), 0, 0, { size: 200, color: '#ffd23f', strokeWidth: 12 }); g.restore(); }
    const humans = this.stations.filter((s) => !s.p.isAI);
    if (!humans.length) return;
    const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
    ui.hints(g, r1, W / 2, H - 92, { size: 34 }); ui.hints(g, r2, W / 2, H - 40, { size: 34 });
  }

  drawBigPhoto(g) {
    const B = this.bigPhoto, t = B.t, p = ease.outBack(clamp(t / 0.6, 0, 1));
    const k = ease.inOutQuad(clamp((t - PHOTO_PIN) / PHOTO_FLY, 0, 1));   // 0 big in the middle .. 1 pinned
    g.save(); g.fillStyle = `rgba(36,22,63,${0.45 * clamp(t / 0.4, 0, 1) * (1 - k)})`; g.fillRect(0, 0, W, H); g.restore();
    const w = 1120, h = 820, sc = p * lerp(1, PIN.w / w, k);
    g.save(); g.translate(lerp(W / 2, PIN.x, k), lerp(H / 2 + 10, PIN.y, k)); g.rotate(lerp(-0.03 * p, PIN.rot, k)); g.scale(sc, sc);
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 10, fill: '#ffffff', lineWidth: 6 });
    g.drawImage(B.img, -w / 2 + 40, -h / 2 + 40, 1040, 585);
    g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(-w / 2 + 40, -h / 2 + 40, 1040, 585);
    ui.text(g, 'Our Dream Room', 0, h / 2 - 118, { size: 64, color: '#ff6fb1', weight: 800 });
    const names = this.players.map((pl) => playerName(pl)).join(', ');
    ui.text(g, names, 0, h / 2 - 54, { size: 30, color: NAVY, stroke: false, maxWidth: w - 120 });
    if (k < 1) for (const [sx, sy] of [[-1, -1], [1, -1]]) { g.save(); g.translate(sx * (w / 2 - 30), sy * (h / 2 - 4)); g.rotate(sx * 0.6); g.fillStyle = 'rgba(255,240,180,0.9)'; g.fillRect(-50, -14, 100, 28); g.restore(); }
    else {   // the pin
      g.beginPath(); g.arc(0, -h / 2 + 14, 40, 0, TAU); g.fillStyle = '#ff4d6d'; g.fill(); g.lineWidth = 12; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.arc(-12, -h / 2 + 2, 12, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
    }
    g.restore();
  }

  drawPrompt(g) {
    const P = this.prompt, sc = ease.outBack(clamp(P.t / 0.35, 0, 1));
    g.save(); g.fillStyle = 'rgba(36,22,63,0.5)'; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2); g.scale(sc, sc); g.translate(-W / 2, -H / 2);
    ui.panel(g, W / 2 - 420, 330, 840, 360, { r: 40, fill: '#fff8ec' });
    this.drawCameraIcon(g, W / 2, 410, 90);
    ui.text(g, 'Time for the room tour!', W / 2, 490, { size: 54, color: '#ff6fb1', weight: 800 });
    for (const [which, btn, label, col] of [['go', 'a', "Let's go!", '#36d17a'], ['more', 'b', 'More time', '#7fd3ff']]) {
      const r = this.promptBtn(which);
      ui.panel(g, r.x, r.y, r.w, r.h, { r: 45, fill: col, lineWidth: 5 });
      ui.glyph(g, btn, r.x + 50, r.y + r.h / 2, 48);
      ui.text(g, label, r.x + r.w / 2 + 24, r.y + r.h / 2 + 2, { size: 38, weight: 800 });
    }
    g.restore();
  }
}

// --- menu / how-to thumbnail ----------------------------------------------------------
function drawIcon(g, x, y, w, h, t) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = Math.min(w / 800, h / 500);
  const wallH = h * 0.66;
  const img = wallCanvas(0);
  g.drawImage(img, 0, 0, img.width, img.height * 0.9, x, y, w, wallH);
  g.fillStyle = '#e9b97f'; g.fillRect(x, y + wallH, w, h - wallH);
  g.strokeStyle = 'rgba(120,70,30,0.4)'; g.lineWidth = Math.max(1, 2 * s);
  for (let i = 1; i < 4; i++) { const yy = y + wallH + (h - wallH) * (i / 4) ** 0.8; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
  g.fillStyle = '#ffffff'; g.fillRect(x, y + wallH - 8 * s, w, 10 * s);
  const env = { t, night: 0 };
  const put = (id, px, py, sc, color = 0, flip = 1) => { g.save(); g.translate(x + px * w, y + py * h); g.scale(sc * s * flip, sc * s); drawItem(g, ITEM[id], { color, seed: 0.3 }, env); g.restore(); };
  put('window', 0.24, 0.3, 1.25, 0);
  put('fairylights', 0.66, 0.12, 1.1, 0);
  put('picture', 0.62, 0.36, 1.0, 10);
  put('rug-round', 0.55, 0.88, 1.15, 1);
  put('bed', 0.6, 0.86, 1.25, 0);
  put('plushie', 0.5, 0.67, 1.05, 11);
  put('nightstand', 0.88, 0.9, 1.1, 1);
  put('lamp', 0.88, 0.665, 1.05, 4);
  put('plant', 0.1, 0.92, 1.15, 0);
  put('teddy', 0.33, 0.96, 1.1, 0);
  for (let i = 0; i < 4; i++) { const k = (t * 0.7 + i * 0.25) % 1; g.save(); g.globalAlpha = Math.sin(k * Math.PI); g.translate(x + w * (0.12 + i * 0.25), y + h * (0.16 + (i % 2) * 0.24)); drawSparkleShape(g, 34 * s, '#fff6a8'); g.restore(); }
  g.restore();
}
