// Star Maker (Play Studio). A cosy night on a hilltop: every player has a
// glowing star wand (cursor) in the one shared sky. A drops a star, and each
// new star is joined to the last one with a line of light (dot-to-dot); A on
// one of your stars joins the line to it, hold A on a star to move it, B
// takes a star away, X starts a new line. Y finishes a constellation: pick
// what it is (bunny, kitty, bird, butterfly, fish, whale, unicorn, dragon)
// and it lights up and comes alive as a glowing star spirit that plays in the
// sky. Catch shooting stars for a rainbow wish star. The friendly Moon in a
// nightcap crosses the sky as the clock. LB / RB pick the star colour; past the
// last colour is "Done", where A says "I'm ready" (B: not yet). When every kid
// is ready (or the night ends) the show starts.
// Finale: the sky tells everyone's constellations one by one, then all the
// spirits parade while everyone poses for a photo.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, sfxLoop, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, ease, TAU, dist } from '../engine/util.js';
import { drawSparkleShape } from '../engine/emotes.js';
import { playerName } from '../state.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  NAVY, TYPES, TYPE, TEMPLATES, drawCreature, drawMoon, drawStar, starShape, glowSprite, mixHex, rgba, bbox, creatureSize,
} from './star-maker/creatures.js';

import { drawDoneTab } from '../engine/studio-ui.js';
import { meta } from './star-maker.meta.js';

export { meta };

const SKY = { x0: 70, x1: W - 70, y0: 128, y1: 800 };
const FEET_Y = 1036;
const MOON_R = 62;
const HOVER_R = 30;
const STAR_COLORS = ['#ffe27a', '#ffffff', '#ff9fd8', '#8fd8ff', '#9ff0c8', '#c9a8ff'];
const DONE = STAR_COLORS.length;   // st.col on the last "colour": Done (A: I'm ready)
const STAR_NAMES = ['Gold', 'White', 'Pink', 'Blue', 'Mint', 'Lilac'];
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
const NIGHT = 150, NIGHT_CPU = 72;
const CHEESE_TIME = 6, PHOTO_SHOW = 3.2;
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const SAYS = { bunny: 'Hop hop!', kitty: 'Purr!', bird: 'Tweet!', butterfly: 'Flutter!', fish: 'Blub!', whale: 'Splash!', unicorn: 'Neigh!', dragon: 'Puff!' };

let serial = 1;

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'play'; this.phaseT = 0;
    this.cpuOnly = this.players.every((p) => p.isAI);
    this.night = this.cpuOnly ? NIGHT_CPU : NIGHT;
    this.timeLeft = this.night;
    // The night is the one time limit (the Moon moving across the sky is its decoration).
    // At 0 the play scene asks "Time's up!": Keep playing gives the night another minute, All done starts the show.
    api.limit(() => (this.phase === 'play' ? Math.max(0, this.timeLeft) : null), {
      showAt: Infinity, x: W / 2, y: 54,
      timeUp: { more: () => { this.timeLeft += 60; this.night += 60; }, done: () => this.startShow() },
    });
    this.stars = []; this.cons = []; this.creatures = []; this.shooting = []; this.beams = [];
    this.starCap = clamp(Math.floor(150 / this.n), 18, 48);
    this.cpuCap = this.n <= 2 ? 4 : this.n <= 4 ? 3 : 2;
    this.shootT = rand(4, 7);
    this.greetT = 0;
    this.moon = { x: 230, y: 300, expr: 'happy', exprT: 0, say: null, bob: 0 };
    this.makeSky();
    this.stations = this.players.map((p, i) => this.makeStation(p, i));
    this.layoutActors();
    this.fireflies = Array.from({ length: 18 }, () => ({ x: rand(W), y: rand(880, 1060), ph: rand(TAU), sp: rand(0.4, 1) }));
    if (hasSound('night-crickets')) this.crickets = sfxLoop('night-crickets', { vol: 0.22, fadeIn: 1.5 });
    sfx('magic');
  }

  makeStation(p, i) {
    const st = {
      p, i, cur: { x: 0, y: 0 }, hold: 0, pen: null, col: i % STAR_COLORS.length, paletteT: 0,
      press: null, drag: null, picker: null, ready: false, history: [], wishes: 0, nextWish: false,
      placed: 0, made: [], overMoon: false, hover: null, idleT: 0, toast: null,
      ai: { cmds: [], wait: rand(0.6, 1.6) + i * 0.25, chase: null, spot: null, idle: 0 },
    };
    st.actor = new Actor(p, { facing: 1 });
    return st;
  }

  layoutActors() {
    const n = this.n, sp = Math.min(300, (W - 460) / n);
    const th = n <= 2 ? 205 : n <= 4 ? 185 : n <= 6 ? 160 : 145;
    this.stations.forEach((st, i) => {
      const a = st.actor;
      a.scale = 1;
      a.scale = Math.min(th / a.leader.h, (sp * 0.92) / Math.max(1, a.width));
      a.x = W / 2 + (i - (n - 1) / 2) * sp; a.y = FEET_Y;
      a.facing = a.x < W / 2 ? 1 : -1;
      a.snap(); a.setPose('look-up');
      st.home = { x: a.x, y: a.y, s: a.scale, sp };
      st.cur.x = clamp(a.x, SKY.x0 + 60, SKY.x1 - 60); st.cur.y = 560 + (i % 2) * 70;
    });
  }

  // --- sky backdrop ---------------------------------------------------------------
  makeSky() {
    this.bgStars = [];
    for (let i = 0; i < 240; i++) {
      const big = chance(0.1);
      this.bgStars.push({ x: rand(W), y: rand(0, 900), r: big ? rand(1.8, 2.6) : rand(0.7, 1.6), ph: rand(TAU), sp: rand(0.6, 2.2), big });
    }
    // milky way speckles along a diagonal band
    for (let i = 0; i < 160; i++) {
      const u = rand(), off = (rand() + rand() + rand() - 1.5) * 90;
      this.bgStars.push({ x: u * W, y: 760 - u * 620 + off, r: rand(0.5, 1.1), ph: rand(TAU), sp: rand(0.5, 1.5), big: false });
    }
    if (art('bg/star-maker')) return;
    try {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 940);
      gr.addColorStop(0, '#120c36'); gr.addColorStop(0.45, '#2a1f6b'); gr.addColorStop(0.8, '#5b3f97'); gr.addColorStop(1, '#93649f');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // nebula clouds + milky way haze
      const blob = (x, y, r, col, a) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(col, a)); rg.addColorStop(1, rgba(col, 0)); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); };
      for (let i = 0; i <= 12; i++) { const u = i / 12; blob(u * W, 760 - u * 620, 230, i % 2 ? '#ff9fd8' : '#8fd8ff', 0.07); }
      blob(380, 300, 320, '#b07bff', 0.1); blob(1500, 520, 380, '#ff7ac6', 0.07); blob(1100, 200, 260, '#5fd3ff', 0.06);
      this.skyCanvas = c;
      // hills (drawn in front of the sky objects)
      const h = document.createElement('canvas'); h.width = W; h.height = H;
      const hg = h.getContext('2d');
      const hill = (y0, amp, freq, ph, c1, c2, rim) => {
        hg.beginPath(); hg.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) hg.lineTo(x, y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph * 1.7) * amp * 0.35);
        hg.lineTo(W, H); hg.closePath();
        const lg = hg.createLinearGradient(0, y0 - amp, 0, H); lg.addColorStop(0, c1); lg.addColorStop(1, c2);
        hg.fillStyle = lg; hg.fill();
        if (rim) { hg.lineWidth = 4; hg.strokeStyle = rim; hg.stroke(); }
      };
      hill(880, 30, 0.004, 1.2, '#3b2a6e', '#2a1d52', 'rgba(255,240,200,0.18)');
      // round trees on the back hill
      for (const [x, s] of [[70, 1.1], [190, 0.8], [1730, 0.9], [1850, 1.15], [1620, 0.6]]) {
        hg.fillStyle = '#251a4a';
        hg.fillRect(x - 6 * s, 840 - 10 * s, 12 * s, 70 * s);
        hg.beginPath(); hg.arc(x, 820 - 30 * s, 52 * s, 0, TAU); hg.arc(x - 30 * s, 840 - 20 * s, 36 * s, 0, TAU); hg.arc(x + 32 * s, 838 - 18 * s, 38 * s, 0, TAU); hg.fill();
        hg.strokeStyle = 'rgba(255,240,200,0.14)'; hg.lineWidth = 3; hg.beginPath(); hg.arc(x, 820 - 30 * s, 52 * s, Math.PI * 1.1, Math.PI * 1.7); hg.stroke();
      }
      hill(950, 22, 0.0032, 0.2, '#4a3485', '#332460', 'rgba(255,240,200,0.22)');
      hill(1000, 12, 0.0026, 2.4, '#5a3f96', '#3a2a6e', 'rgba(255,240,200,0.28)');
      // picnic blanket along the crest
      hg.save(); hg.translate(W / 2, 1040);
      ui.roundRect(hg, -760, -16, 1520, 40, 18); hg.fillStyle = '#ff8fc8'; hg.fill();
      hg.save(); hg.clip(); hg.fillStyle = 'rgba(255,255,255,0.45)';
      for (let x = -760; x < 760; x += 64) hg.fillRect(x, -16, 32, 40);
      hg.fillStyle = 'rgba(255,255,255,0.25)'; hg.fillRect(-760, -4, 1520, 14);
      hg.restore();
      hg.lineWidth = 4; hg.strokeStyle = NAVY; ui.roundRect(hg, -760, -16, 1520, 40, 18); hg.stroke();
      hg.restore();
      // tent with a lantern (left) and a telescope (right)
      hg.save(); hg.translate(140, 975); hg.lineJoin = 'round'; hg.lineWidth = 5; hg.strokeStyle = NAVY;
      hg.beginPath(); hg.moveTo(-90, 40); hg.lineTo(0, -95); hg.lineTo(90, 40); hg.closePath(); hg.fillStyle = '#7fd3ff'; hg.fill();
      hg.save(); hg.clip(); hg.fillStyle = '#ffffff'; for (let k = -4; k < 4; k++) hg.fillRect(k * 30, -100, 15, 160); hg.restore();
      hg.stroke();
      hg.beginPath(); hg.moveTo(-28, 40); hg.lineTo(0, -40); hg.lineTo(28, 40); hg.closePath(); hg.fillStyle = '#ffd77a'; hg.fill(); hg.stroke();
      hg.restore();
      hg.save(); hg.translate(1790, 990); hg.lineWidth = 5; hg.strokeStyle = NAVY; hg.lineCap = 'round';
      hg.beginPath(); hg.moveTo(0, 0); hg.lineTo(-40, 50); hg.moveTo(0, 0); hg.lineTo(40, 50); hg.moveTo(0, 0); hg.lineTo(0, 52); hg.stroke();
      hg.rotate(-0.6); ui.roundRect(hg, -60, -16, 130, 32, 12); hg.fillStyle = '#e8b04a'; hg.fill(); hg.stroke();
      ui.roundRect(hg, 64, -20, 22, 40, 8); hg.fillStyle = '#c98a2a'; hg.fill(); hg.stroke();
      hg.restore();
      this.hillCanvas = h;
    } catch (e) { this.skyCanvas = null; this.hillCanvas = null; }
  }

  // --- stars & constellations -----------------------------------------------------
  ownStars(st) { return this.stars.filter((s) => s.owner === st.i); }

  starAt(st, x, y) {
    let best = null, bd = HOVER_R;
    for (const s of this.stars) {
      if (s.owner !== st.i) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  newCon(st) { const c = { id: serial++, owner: st.i, stars: [], edges: [], done: false, kind: null, creature: null, formT: 0 }; this.cons.push(c); return c; }
  hasEdge(con, a, b) { return con.edges.some(([p, q]) => (p === a && q === b) || (p === b && q === a)); }

  placeStar(st) {
    const own = this.ownStars(st).length;
    if (own >= this.starCap) { this.toast(st, 'Your sky is full!'); sfx('error'); return; }
    const pen = st.pen && !st.pen.con.done ? st.pen : null;
    const con = pen ? pen.con : this.newCon(st);
    const wish = st.nextWish;
    const s = { id: serial++, owner: st.i, x: st.cur.x, y: st.cur.y, col: st.col, r: wish ? 10 : rand(6.5, 8.5), con, tw: rand(TAU), pop: 0, wish };
    st.nextWish = false;
    this.stars.push(s); con.stars.push(s);
    if (pen) con.edges.push([pen, s]);
    st.pen = s; st.history.push(s); st.placed++;
    const k = con.stars.length - 1;
    sfx('note', { midi: PENTA[k % PENTA.length], vol: 0.55 });
    snd('sm-place', null, { vol: 0.5 });
    if (wish) { sfx('star'); particles.burst(s.x, s.y, { type: 'star', count: 12, colors: RAINBOW, speed: [120, 320] }); }
    particles.burst(s.x, s.y, { type: 'sparkle', count: 7, colors: ['#ffffff', STAR_COLORS[s.col]], speed: [40, 180] });
    particles.ring(s.x, s.y, STAR_COLORS[s.col], 46, 0.3);
    if (pen) this.lineSparkle(pen, s);
    this.beamFrom(st, s);
    st.actor.playOnce('cast', 0.4, 'look-up');
    st.idleT = 0;
  }

  lineSparkle(a, b) {
    for (let i = 1; i <= 4; i++) { const u = i / 5; particles.trail(lerp(a.x, b.x, u), lerp(a.y, b.y, u), { type: 'sparkle', colors: ['#ffffff', '#fff6a8'], size: [10, 16], speed: [10, 40] }); }
  }

  beamFrom(st, s) {
    const h = st.actor.anchor('hand');
    this.beams.push({ x0: h.x, y0: h.y, x1: s.x, y1: s.y, t: 0, color: st.p.color });
  }

  /** A on one of your stars (without dragging). */
  tapStar(st, s) {
    const con = s.con;
    if (con.done) {
      if (con.creature) this.trick(con.creature);
      st.pen = null;
      st.actor.playOnce('cheer', 0.5, 'look-up');
      return;
    }
    const pen = st.pen && !st.pen.con.done ? st.pen : null;
    if (pen && pen !== s) {
      if (pen.con !== con) this.mergeCons(pen.con, con);
      if (!this.hasEdge(pen.con, pen, s)) {
        pen.con.edges.push([pen, s]);
        snd('sm-link', 'sparkle', { vol: 0.6 });
        sfx('note', { midi: PENTA[(pen.con.stars.length + 2) % PENTA.length], vol: 0.45 });
        this.lineSparkle(pen, s);
        particles.ring(s.x, s.y, '#ffffff', 40, 0.3);
        st.actor.playOnce('cast', 0.35, 'look-up');
      } else sfx('select', { vol: 0.6 });
    } else sfx('select', { vol: 0.6 });
    st.pen = s; s.pop = 0.5;
  }

  mergeCons(into, from) {
    for (const s of from.stars) { s.con = into; into.stars.push(s); }
    into.edges.push(...from.edges);
    this.cons = this.cons.filter((c) => c !== from);
  }

  removeStar(st, s) {
    const con = s.con;
    con.stars = con.stars.filter((q) => q !== s);
    con.edges = con.edges.filter(([a, b]) => a !== s && b !== s);
    this.stars = this.stars.filter((q) => q !== s);
    if (!con.stars.length) this.cons = this.cons.filter((c) => c !== con);
    if (st.pen === s) {
      st.pen = null;
      for (let i = st.history.length - 1; i >= 0; i--) { const h = st.history[i]; if (h !== s && this.stars.includes(h) && h.con === con && !con.done) { st.pen = h; break; } }
    }
    st.history = st.history.filter((q) => q !== s);
    snd('sm-remove', 'pop', { vol: 0.6 });
    particles.burst(s.x, s.y, { type: 'smoke', count: 5, speed: [30, 90], colors: ['#c9b8ff', '#ffffff'] });
    particles.burst(s.x, s.y, { type: 'sparkle', count: 4, colors: ['#ffffff'] });
  }

  undoLast(st) {
    for (let i = st.history.length - 1; i >= 0; i--) {
      const s = st.history[i];
      if (!this.stars.includes(s)) { st.history.splice(i, 1); continue; }
      if (s.con.done) continue;
      this.removeStar(st, s);
      return;
    }
    sfx('blip');
  }

  /** B on a finished picture: the spirit curls back into its stars, and the stars can be changed again. */
  unfinish(st, con) {
    const c = con.creature;
    if (c) {
      for (const s of con.stars) particles.burst(c.x, c.y, { type: 'sparkle', count: 2, colors: ['#ffffff', st.p.color], angle: Math.atan2(s.y - c.y, s.x - c.x), spread: 0.2, speed: [200, 400] });
      this.creatures = this.creatures.filter((q) => q !== c);
    }
    const mi = st.made.lastIndexOf(con.kind); if (mi >= 0) st.made.splice(mi, 1);
    con.done = false; con.kind = null; con.creature = null;
    snd('sm-unfinish', 'shrink', { vol: 0.7 });
  }

  /** Y: finish the constellation you're drawing. */
  tryFinish(st) {
    let con = st.pen && !st.pen.con.done ? st.pen.con : null;
    if (!con) {
      for (let i = st.history.length - 1; i >= 0 && !con; i--) { const s = st.history[i]; if (this.stars.includes(s) && !s.con.done) con = s.con; }
    }
    if (!con) { this.toast(st, 'Put some stars first!'); sfx('blip'); return; }
    if (con.stars.length < 3) { this.toast(st, 'Add more stars!'); sfx('blip'); return; }
    if (con.edges.length < 2) { this.toast(st, 'Join your stars!'); sfx('blip'); return; }
    const unused = TYPES.map((t, i) => i).filter((i) => !st.made.includes(TYPES[i].id));
    st.picker = { con, sel: pick(unused.length ? unused : [0, 1, 2, 3, 4, 5, 6, 7]), t: 0 };
    st.press = null; st.drag = null;
    sfx('select');
    st.actor.playOnce('think', 0.8, 'look-up');
  }

  complete(st, con, type) {
    con.done = true; con.kind = type; con.formT = 0;
    const b = bbox(con.stars);
    const c = {
      con, type, def: TYPES[TYPE[type]], owner: st.i, color: st.p.color, x: b.cx, y: b.cy, size: creatureSize(b), state: 'form', t: 0, dur: 1.5,
      ph: rand(TAU), facing: chance(0.5) ? 1 : -1, vx: 0, vy: 0, tx: b.cx, ty: b.cy, alpha: 0, trickT: -1, greetCD: 4, retarget: 0,
    };
    con.creature = c;
    this.creatures.push(c);
    st.made.push(type);
    st.pen = null; st.picker = null;
    snd('sm-alive', hasSound('sparkle-beam') ? 'sparkle-beam' : 'magic', { vol: 0.8 });
    sfx('magic', { vol: 0.5 });
    particles.burst(b.cx, b.cy, { type: 'star', count: 16, colors: ['#fff6a8', '#ffffff', st.p.color], speed: [120, 380] });
    particles.ring(b.cx, b.cy, '#fff6a8', Math.max(b.w, b.h) * 0.8 + 60, 0.5);
    const a = st.actor;
    a.playOnce('cheer', 0.8, 'look-up'); a.squash(-0.2); a.emote('star', 1.2);
    if (!st.p.isAI || chance(0.4)) a.say(`A ${TYPES[TYPE[type]].name.toLowerCase()}!`, 1.5, 'yay');
    this.moonReact('wow', pick(['Ooh, a ' + TYPES[TYPE[type]].name.toLowerCase() + '!', 'So twinkly!', 'Beautiful!', 'It came alive!']));
    if (st.p.ctrl.rumble) st.p.ctrl.rumble(0.3, 120);
  }

  trick(c) {
    if (c.trickT >= 0) return;
    c.trickT = 0;
    snd('sm-trick', 'sparkle', { vol: 0.45 });
    particles.burst(c.x, c.y, { type: 'heart', count: 4, colors: ['#ff9fd8', '#ffffff'], speed: [60, 160] });
  }

  toast(st, text) { st.toast = { text, t: 0 }; }

  moonReact(expr, text) {
    this.moon.expr = expr; this.moon.exprT = 1.4;
    if (text && (!this.moon.say || this.moon.say.t > 1.2)) { this.moon.say = { text, t: 0, dur: 2 }; snd('sm-moon', hasSound('wing-twinkle') ? 'wing-twinkle' : null, { vol: 0.4 }); }
  }

  // --- input ----------------------------------------------------------------------------
  updatePlayer(st, dt) {
    const c = st.p.ctrl, a = st.actor;
    if (st.toast) { st.toast.t += dt; if (st.toast.t > 1.6) st.toast = null; }
    st.paletteT = Math.max(0, st.paletteT - dt);
    st.idleT += dt;
    const pad = c.kind === 'pad';
    if (st.picker) { this.updatePicker(st, dt); return; }
    // the wand: stick moves it, with a little acceleration
    const mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    const mag = Math.hypot(mx, my);
    st.hold = mag > 0.15 ? st.hold + dt : 0;
    const sp = 880 * (0.35 + 0.65 * clamp(st.hold / 0.6, 0, 1));
    st.cur.x = clamp(st.cur.x + (mx * sp + c.rx * 150) * dt, SKY.x0, SKY.x1);
    st.cur.y = clamp(st.cur.y + (my * sp + c.ry * 150) * dt, SKY.y0, SKY.y1);
    if (mag > 0.15) st.idleT = 0;
    // ready (on Done): B = not yet after all
    if (st.ready) {
      st.hover = null; st.paletteT = 1.4;
      if (c.pressed('b')) this.setReady(st, false);
      return;
    }
    // star colour: LB/RB (or the d-pad on a gamepad); past the last colour: Done
    const step = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0) + (pad ? (c.pressed('right') ? 1 : 0) - (c.pressed('left') ? 1 : 0) : 0);
    if (step && !st.drag) { st.col = (st.col + step + DONE + 1) % (DONE + 1); st.paletteT = 1.4; if (st.col === DONE) sfx('move'); else sfx('collect', { step: st.col }); }
    if (st.col === DONE) st.paletteT = Math.max(st.paletteT, 0.5);   // keep the strip (and its Done tile) up
    st.hover = st.drag ? null : this.starAt(st, st.cur.x, st.cur.y);
    st.overMoon = this.phase === 'play' && dist(st.cur.x, st.cur.y, this.moon.x, this.moon.y) < MOON_R + 14;

    // dragging a star (or a whole finished picture)
    if (st.drag) {
      const D = st.drag;
      for (const m of D.items) { m.s.x = clamp(st.cur.x + m.dx, SKY.x0, SKY.x1); m.s.y = clamp(st.cur.y + m.dy, SKY.y0, SKY.y1); }
      if (chance(dt * 8)) particles.trail(st.cur.x + rand(-8, 8), st.cur.y + rand(-8, 8), { type: 'sparkle', colors: ['#ffffff', st.p.color], size: [8, 14] });
      if (c.pressed('b')) {
        const items = D.items; st.drag = null;
        if (items.length === 1) this.removeStar(st, items[0].s);
        else sfx('back');
        return;
      }
      if (!c.held('a')) {
        st.drag = null;
        snd('sm-drop', 'pop', { vol: 0.5 });
        for (const m of D.items) { m.s.pop = 0.4; }
        particles.ring(st.cur.x, st.cur.y, st.p.color, 50, 0.3);
        a.playOnce('cast', 0.3, 'look-up');
      }
      return;
    }
    // A: put a star / tap or hold one of yours / the Moon
    if (c.pressed('a')) {
      st.idleT = 0;
      if (st.col === DONE) { this.setReady(st, true); return; }
      if (st.hover) st.press = { s: st.hover, t: 0, x: st.cur.x, y: st.cur.y };
      else if (st.overMoon) { sfx('select'); this.moonReact('wink', pick(['Hello!', 'Twinkle twinkle!', 'What a pretty sky!'])); }
      else this.placeStar(st);
    }
    if (st.press) {
      const P = st.press;
      if (!this.stars.includes(P.s)) st.press = null;
      else if (c.held('a')) {
        P.t += dt;
        if (P.t > 0.24 || dist(P.x, P.y, st.cur.x, st.cur.y) > 16) { this.startDrag(st, P.s); st.press = null; }
      } else { st.press = null; this.tapStar(st, P.s); }
    }
    if (c.pressed('b')) {
      st.idleT = 0;
      if (st.press) st.press = null;
      if (st.hover) { if (st.hover.con.done) this.unfinish(st, st.hover.con); else this.removeStar(st, st.hover); }
      else this.undoLast(st);
    }
    if (c.pressed('x')) {
      if (st.pen) { st.pen = null; snd('sm-lift', 'blip', { vol: 0.6 }); particles.burst(st.cur.x, st.cur.y, { type: 'sparkle', count: 4, colors: ['#ffffff'] }); }
      else sfx('blip', { vol: 0.4 });
    }
    if (c.pressed('y')) this.tryFinish(st);
    // face your wand
    if (!a._once) a.setPose('look-up');
    if (Math.abs(st.cur.x - a.x) > 40) a.facing = st.cur.x > a.x ? 1 : -1;
  }

  /** On Done, A: I'm ready (B: not yet). Every kid ready starts the show. */
  setReady(st, on) {
    if (st.ready === on) return;
    st.ready = on; st.press = null; st.pen = null;
    const a = st.actor;
    if (on) {
      sfx('ready'); a.playOnce('cheer', 0.6, 'look-up'); a.squash(-0.2);
      particles.burst(st.cur.x, st.cur.y, { type: 'star', count: 12, speed: [120, 320] });
      const kids = this.stations.filter((q) => !q.p.isAI), n = kids.filter((q) => q.ready).length;
      if (n < kids.length) this.moonReact('happy', `${n} of ${kids.length} ready!`);
    } else sfx('back');
  }

  startDrag(st, s) {
    const items = s.con.done ? s.con.stars.map((q) => ({ s: q, dx: q.x - st.cur.x, dy: q.y - st.cur.y })) : [{ s, dx: s.x - st.cur.x, dy: s.y - st.cur.y }];
    st.drag = { items, con: s.con };
    snd('sm-pickup', 'select', { vol: 0.5 });
    particles.ring(s.x, s.y, '#ffffff', 36, 0.25);
    st.actor.playOnce('carry', 0.3, 'look-up');
  }

  pickerCenter(st) {
    const b = bbox(st.picker.con.stars), R = 170;
    return { x: clamp(b.cx, R + 70, W - R - 70), y: clamp(b.cy, R + 120, 880 - R), R };
  }

  updatePicker(st, dt) {
    const P = st.picker, c = st.p.ctrl;
    P.t += dt;
    if (!this.cons.includes(P.con) || P.con.done) { st.picker = null; return; }
    const mx = c.x, my = c.y;
    if (Math.hypot(mx, my) > 0.55) {
      const a = Math.atan2(my, mx) + Math.PI / 2;
      const sel = ((Math.round(a / (TAU / 8)) % 8) + 8) % 8;
      if (sel !== P.sel) { P.sel = sel; sfx('move'); }
    } else if (c.kind !== 'ai' && (c.nav.x || c.nav.y)) {
      P.sel = (P.sel + (c.nav.x || c.nav.y) + 8) % 8; sfx('move');
    }
    if (c.pressed('a') && P.t > 0.2) this.complete(st, P.con, TYPES[P.sel].id);
    else if (c.pressed('b') || (c.pressed('y') && P.t > 0.2)) { st.picker = null; sfx('back'); }
  }

  // --- CPU star makers ---------------------------------------------------------------------
  findSpot(st, r) {
    const humans = this.stations.filter((s) => !s.p.isAI);
    let best = null, bestScore = Infinity;
    for (let k = 0; k < 70; k++) {
      const x = rand(SKY.x0 + r + 30, SKY.x1 - r - 30), y = rand(SKY.y0 + r + 40, SKY.y1 - r * 0.9);
      if (this.stars.some((s) => Math.hypot(s.x - x, s.y - y) < r * 1.2 + 45)) continue;
      if (this.creatures.some((c) => Math.hypot(c.tx - x, c.ty - y) < r + c.size + 30 && c.state !== 'play')) continue;
      if (humans.some((h) => Math.hypot(h.cur.x - x, h.cur.y - y) < r + 260)) continue;
      if (this.stations.some((o) => o !== st && o.ai.spot && Math.hypot(o.ai.spot.x - x, o.ai.spot.y - y) < r * 2 + 80)) continue;
      if (Math.hypot(this.moon.x - x, this.moon.y - y) < r + 140) continue;
      const score = Math.abs(x - st.actor.x) + rand(0, 380);
      if (score < bestScore) { bestScore = score; best = { x, y }; }
    }
    return best;
  }

  planBuild(st) {
    const used = new Set([...st.made, ...this.stations.filter((o) => o !== st).flatMap((o) => o.made)]);
    const types = shuffle(TYPES.map((t) => t.id));
    const type = types.find((t) => !used.has(t)) || types[0];
    const tpl = TEMPLATES[type];
    const S = this.n >= 6 ? rand(100, 120) : rand(115, 150);
    const spot = this.findSpot(st, S * 1.05);
    if (!spot) return [];
    st.ai.spot = spot;
    const prof = aiProfile(st.p), face = chance(0.5) ? 1 : -1, rot = rand(-0.15, 0.15);
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const pts = tpl.pts.map(([px, py]) => {
      const x = px * face * S, y = py * S * 0.85;
      return { x: spot.x + x * cos - y * sin, y: spot.y + x * sin + y * cos };
    });
    const cmds = [];
    if (st.pen) cmds.push({ t: 'lift' });
    if (chance(0.5)) cmds.push({ t: 'color', v: randInt(0, STAR_COLORS.length - 1) });
    const placed = new Set();
    for (const e of tpl.path) {
      if (e === 'x') { cmds.push({ t: 'lift' }); continue; }
      const p = pts[e];
      if (!placed.has(e)) { const j = prof.aimError * 16; p.x += rand(-j, j); p.y += rand(-j, j); placed.add(e); }
      cmds.push({ t: 'goto', x: p.x, y: p.y }, { t: 'tap' });
    }
    if (chance(0.3)) { const p = pick(pts); cmds.push({ t: 'goto', x: p.x, y: p.y }, { t: 'nudge', dx: rand(-26, 26), dy: rand(-26, 26) }); }
    cmds.push({ t: 'finish' }, { t: 'pick', type }, { t: 'rest' });
    return cmds;
  }

  updateAI(st, dt) {
    const ai = st.ai, c = st.p.ctrl, prof = aiProfile(st.p);
    if (ai.wait > 0) { ai.wait -= dt; c.move(0, 0); return; }
    if (ai.chase) {
      const s = ai.chase;
      if (!this.shooting.includes(s) || s.caught || s.t > s.life - 0.1) { ai.chase = null; c.move(0, 0); ai.wait = rand(0.3, 0.8); return; }
      steer(st.p, st.cur.x, st.cur.y, s.x + s.vx * 0.35, s.y + s.vy * 0.35, { arrive: 60, wobble: false });
      return;
    }
    if (!ai.cmds.length) {
      c.move(0, 0); c.hold('a', false); ai.spot = null;
      const mine = this.ownStars(st).length;
      if (st.made.length < this.cpuCap && mine + 9 <= this.starCap && this.phase === 'play') {
        ai.cmds = this.planBuild(st);
        if (!ai.cmds.length) ai.wait = rand(2, 4);
      } else {
        // finished making: drift about, sometimes play with a spirit
        const mineDone = this.cons.filter((k) => k.owner === st.i && k.done);
        if (mineDone.length && chance(0.4)) { const s = pick(pick(mineDone).stars); ai.cmds = [{ t: 'goto', x: s.x, y: s.y }, { t: 'tap' }, { t: 'wait', s: rand(3, 6) }]; }
        else ai.cmds = [{ t: 'goto', x: clamp(st.actor.x + rand(-250, 250), SKY.x0 + 40, SKY.x1 - 40), y: rand(450, 760) }, { t: 'wait', s: rand(2, 5) }];
      }
      return;
    }
    const cmd = ai.cmds[0];
    const done = (w = 0.12) => { ai.cmds.shift(); ai.wait = w / prof.speed; };
    switch (cmd.t) {
      case 'goto': {
        const d = steer(st.p, st.cur.x, st.cur.y, cmd.x, cmd.y, { arrive: 130, wobble: false });
        cmd.t2 = (cmd.t2 || 0) + dt;
        if (d < 7 || cmd.t2 > 4) { c.move(0, 0); done(0.08); }
        break;
      }
      case 'tap': c.press('a'); done(this.cpuOnly ? rand(0.2, 0.35) : rand(0.35, 0.75)); break;
      case 'lift': c.press('x'); done(0.2); break;
      case 'color': if (st.col === cmd.v) done(0.1); else { c.press(st.col === DONE || cmd.v > st.col ? 'rb' : 'lb'); ai.wait = 0.2; } break;   // (never stops on Done)
      case 'nudge': {
        cmd.t2 = (cmd.t2 || 0) + dt;
        c.hold('a', true);
        if (cmd.t2 > 0.3) {
          if (!cmd.to) cmd.to = { x: st.cur.x + cmd.dx, y: st.cur.y + cmd.dy };
          const d = steer(st.p, st.cur.x, st.cur.y, cmd.to.x, cmd.to.y, { arrive: 60, wobble: false });
          if (d < 5 || cmd.t2 > 1.6) { c.move(0, 0); c.hold('a', false); done(0.3); }
        }
        break;
      }
      case 'finish': c.press('y'); done(0.5); break;
      case 'pick': {
        if (!st.picker) { done(0.2); break; }
        const a = TYPE[cmd.type] * (TAU / 8) - Math.PI / 2;
        c.move(Math.cos(a), Math.sin(a));
        cmd.t2 = (cmd.t2 || 0) + dt;
        if (cmd.t2 > 0.45 / prof.speed) { c.press('a'); c.move(0, 0); done(0.4); }
        break;
      }
      case 'rest': done(this.cpuOnly ? rand(1, 2.5) : rand(4, 8)); break;
      case 'wait': done(cmd.s); break;
      default: done();
    }
  }

  // --- spirits ------------------------------------------------------------------------------
  updateCreature(c, dt) {
    const b = bbox(c.con.stars);
    const hx = b.cx, hy = b.cy;
    c.size = lerp(c.size, creatureSize(b), 1 - Math.exp(-4 * dt));
    c.t += dt;
    c.greetCD -= dt;
    c.formT = c.con.formT += dt;
    if (c.trickT >= 0) { c.trickT += dt; if (c.trickT > 0.9) c.trickT = -1; }
    const R = c.size;
    const sky = { x0: 80 + R * 0.6, x1: W - 80 - R * 0.6, y0: 140 + R * 0.5, y1: 860 - R * 0.55 };
    let tx = hx, ty = hy, speed = c.def.speed, home = true;
    switch (c.state) {
      case 'form':
        c.alpha = clamp((c.t - 0.5) / 0.8, 0, 1);
        if (c.t > c.dur) { c.state = 'pose'; c.t = 0; c.dur = rand(1.8, 2.6); this.trick(c); }
        break;
      case 'pose':
        c.alpha = Math.min(1, c.alpha + dt * 2);
        if (c.t > c.dur && this.phase === 'play') { c.state = 'play'; c.t = 0; c.dur = rand(6, 11); c.retarget = 0; }
        break;
      case 'play': {
        home = false;
        c.retarget -= dt;
        if (c.retarget <= 0 || dist(c.x, c.y, c.tx, c.ty) < 20) {
          c.tx = clamp(hx + rand(-300, 300), sky.x0, sky.x1); c.ty = clamp(hy + rand(-170, 170), sky.y0, sky.y1);
          c.retarget = rand(2.2, 4);
        }
        tx = c.tx; ty = c.ty;
        if (c.t > c.dur) { c.state = 'return'; c.t = 0; }
        // little personality touches
        if (c.type === 'unicorn' && chance(dt * 10)) particles.trail(c.x - c.facing * R * 0.6, c.y, { type: 'sparkle', colors: RAINBOW, size: [10, 16], speed: [10, 50] });
        else if (c.type === 'whale' && chance(dt * 0.4)) particles.burst(c.x + c.facing * R * 0.3, c.y - R * 0.5, { type: 'sparkle', count: 6, angle: -Math.PI / 2, spread: 0.4, speed: [120, 240], colors: ['#bfe9ff', '#ffffff'] });
        else if (c.type === 'dragon' && chance(dt * 0.5)) particles.burst(c.x + c.facing * R * 0.9, c.y - R * 0.2, { type: 'star', count: 5, angle: c.facing > 0 ? 0 : Math.PI, spread: 0.35, speed: [140, 260], colors: ['#fff6a8', '#ffb3e6'] });
        else if (c.type === 'fish' && chance(dt * 0.8)) particles.trail(c.x + c.facing * R * 0.6, c.y - R * 0.2, { type: 'bubble', colors: ['#bfe9ff'] });
        else if (chance(dt * 1.5)) particles.trail(c.x + rand(-R, R) * 0.5, c.y + rand(-R, R) * 0.4, { type: 'sparkle', colors: ['#ffffff', c.color], size: [8, 14], speed: [10, 40] });
        break;
      }
      case 'return':
        speed *= 1.4;
        if (dist(c.x, c.y, hx, hy) < 14) { c.state = 'pose'; c.t = 0; c.dur = rand(2.5, 4); }
        break;
      case 'home': speed = Math.max(speed, 260) * 1.6; break;
      case 'parade': {
        home = false;
        const a = c.paradeA + this.phaseT * 0.32;
        tx = W / 2 + Math.cos(a) * 690; ty = 470 + Math.sin(a) * 250;
        speed = 520;
        break;
      }
      default: break;
    }
    if (c.state === 'form' || (c.state === 'pose' && home)) {
      c.x = lerp(c.x, hx, 1 - Math.exp(-10 * dt)); c.y = lerp(c.y, hy, 1 - Math.exp(-10 * dt));
      c.vx = 0; c.vy = 0;
    } else {
      const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
      const want = speed * clamp(d / 140, 0, 1);
      c.vx = lerp(c.vx, (dx / d) * want, 1 - Math.exp(-3 * dt));
      c.vy = lerp(c.vy, (dy / d) * want, 1 - Math.exp(-3 * dt));
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.state !== 'parade') { c.x = clamp(c.x, sky.x0, sky.x1); c.y = clamp(c.y, sky.y0, sky.y1); }
    }
    if (Math.abs(c.vx) > 18 && c.type !== 'butterfly') c.facing = c.vx > 0 ? 1 : -1;
    const spd = Math.hypot(c.vx, c.vy) / Math.max(1, c.def.speed);
    c.ph += dt * (1.2 + spd * 2.2);
  }

  /** Spirit draw offsets for its kind of movement. */
  creaturePose(c) {
    const R = c.size, moving = Math.hypot(c.vx, c.vy) > 25, ph = c.ph;
    let oy = 0, rot = 0, sx = 1, sy = 1;
    switch (c.def.move) {
      case 'hop': if (moving) { const h = Math.abs(Math.sin(ph * 2.2)); oy = -h * R * 0.35; sy = 0.92 + h * 0.12; sx = 1.06 - h * 0.1; } else oy = Math.sin(ph * 2) * R * 0.03; break;
      case 'trot': oy = moving ? -Math.abs(Math.sin(ph * 4)) * R * 0.07 : Math.sin(ph * 1.5) * R * 0.02; break;
      case 'fly': oy = Math.sin(ph * 1.5) * R * 0.14; rot = clamp(c.vy / 500, -0.3, 0.3) * c.facing; break;
      case 'flutter': oy = Math.sin(ph * 2.3) * R * 0.22; rot = Math.sin(ph * 1.1) * 0.15; break;
      case 'swim': oy = Math.sin(ph * 1.2) * R * 0.1; rot = clamp(c.vy / 400, -0.35, 0.35) * c.facing; break;
      case 'glide': oy = Math.sin(ph * 0.8) * R * 0.1; rot = clamp(c.vy / 300, -0.2, 0.2) * c.facing + Math.sin(ph * 0.8) * 0.04; break;
      case 'gallop': if (moving) { oy = -Math.abs(Math.sin(ph * 3)) * R * 0.2; rot = Math.sin(ph * 6) * 0.05; } else oy = Math.sin(ph) * R * 0.02; break;
      default: break;
    }
    if (c.trickT >= 0) {
      const u = c.trickT / 0.9;
      oy -= Math.sin(u * Math.PI) * R * 0.5;
      rot += ease.inOutQuad(u) * TAU * (c.facing > 0 ? 1 : -1);
    }
    return { oy, rot, sx, sy };
  }

  greetings() {
    const list = this.creatures.filter((c) => c.state === 'play' && c.greetCD <= 0);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.greetCD > 0 || b.greetCD > 0) continue;
      if (dist(a.x, a.y, b.x, b.y) < (a.size + b.size) * 0.65) {
        a.greetCD = b.greetCD = rand(9, 14);
        this.trick(a); this.trick(b);
        particles.burst((a.x + b.x) / 2, (a.y + b.y) / 2 - 30, { type: 'heart', count: 6, colors: ['#ff9fd8', '#ffb3e6', '#ffffff'], speed: [60, 180] });
        snd('sm-greet', 'bubble', { vol: 0.35 });
      }
    }
  }

  // --- shooting stars -------------------------------------------------------------------------
  spawnShooting() {
    const right = chance(0.5);
    const s = { x: right ? rand(150, 900) : rand(1020, W - 150), y: rand(140, 330), vx: (right ? 1 : -1) * rand(620, 760), vy: rand(220, 320), t: 0, life: 1.8, caught: false };
    this.shooting.push(s);
    snd('sm-shooting', 'whoosh', { vol: 0.4 });
    // wishes are the kids' catch: CPUs only chase them in an all-CPU game
    if (this.stations.some((st) => !st.p.isAI)) return;
    for (const st of this.stations) {
      if (!st.p.isAI || st.ai.chase || st.picker || st.drag) continue;
      const odds = [0.2, 0.4, 0.65][clamp(st.p.aiLevel ?? 0, 0, 2)];
      if (dist(st.cur.x, st.cur.y, s.x + s.vx * 0.8, s.y + s.vy * 0.8) < 650 && chance(odds) && (!st.ai.cmds.length || st.ai.cmds[0].t === 'rest' || st.ai.cmds[0].t === 'wait')) st.ai.chase = s;
    }
  }

  updateShooting(dt) {
    this.shootT -= dt;
    if (this.shootT <= 0 && this.phase === 'play') { this.spawnShooting(); this.shootT = rand(7, 12); }
    for (const s of this.shooting) {
      s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (!s.caught && chance(dt * 30)) particles.trail(s.x, s.y, { type: 'sparkle', colors: ['#ffffff', '#fff6a8', '#ffc4e6'], size: [8, 14], speed: [10, 60] });
      if (s.caught || this.phase !== 'play') continue;
      const kids = this.stations.some((q) => !q.p.isAI);
      for (const st of this.stations) {
        if (st.picker || (kids && st.p.isAI)) continue;
        if (dist(st.cur.x, st.cur.y, s.x, s.y) < 70) { this.catchWish(st, s); break; }
      }
    }
    this.shooting = this.shooting.filter((s) => !s.caught && s.t < s.life && s.x > -100 && s.x < W + 100);
  }

  catchWish(st, s) {
    s.caught = true;
    st.wishes++; st.nextWish = true;
    if (st.ai.chase === s) st.ai.chase = null;
    snd('sm-wish', hasSound('golden-chime') ? 'golden-chime' : 'star', { vol: 0.8 });
    sfx('sparkle');
    particles.burst(s.x, s.y, { type: 'star', count: 18, colors: RAINBOW, speed: [150, 420] });
    particles.ring(s.x, s.y, '#fff6a8', 120, 0.45);
    particles.popText(s.x, s.y - 30, 'Wish!', '#fff6a8', 54);
    fx.flash('#fff6d8', 0.12);
    const a = st.actor; a.playOnce('cheer', 0.7, 'look-up'); a.emote('sparkle', 1.4); a.squash(-0.2);
    this.moonReact('wow', 'A wish!');
    if (st.p.ctrl.rumble) st.p.ctrl.rumble(0.4, 140);
  }

  // --- update -----------------------------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    const M = this.moon;
    M.exprT -= dt; if (M.exprT <= 0) M.expr = this.phase === 'show' ? 'sleepy' : 'happy';
    if (M.say) { M.say.t += dt; if (M.say.t > M.say.dur) M.say = null; }
    for (const st of this.stations) st.actor.update(dt);
    for (const s of this.stars) { s.tw += dt * 3; s.pop = Math.max(0, s.pop - dt); }
    for (const b of this.beams) b.t += dt;
    this.beams = this.beams.filter((b) => b.t < 0.5);
    this.updateShooting(dt);
    for (const c of this.creatures) this.updateCreature(c, dt);
    this.greetT -= dt; if (this.greetT <= 0) { this.greetT = 0.5; this.greetings(); }
    if (this.phase === 'play') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);   // waits at 0 for the "Time's up!" question
      const p = clamp(1 - this.timeLeft / this.night, 0, 1);
      M.x = lerp(230, W - 230, p); M.y = 205 + 95 * (2 * p - 1) ** 2;
      for (const st of this.stations) {
        if (this.phase !== 'play') break;
        if (st.p.isAI) this.updateAI(st, dt);
        this.updatePlayer(st, dt);
      }
      // every kid ready on Done: the show
      const kids = this.stations.filter((q) => !q.p.isAI);
      if (this.phase === 'play' && kids.length && kids.every((q) => q.ready)) { this.readyT = (this.readyT || 0) + dt; if (this.readyT > 0.6) this.startShow(); } else this.readyT = 0;
      if (this.phase === 'play') {
        if (Math.ceil(this.timeLeft) === 20 && Math.ceil(this.timeLeft + dt) === 21) this.moonReact('wink', 'Nearly bedtime!');
      }
      if (this.api.camera) this.api.camera.follow(W / 2, H / 2, 1, 6);
    } else if (this.phase === 'show') this.updateShow(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    for (const st of this.stations) st.actor.update(dt);
    for (const c of this.creatures) this.updateCreature(c, dt);
  }

  // --- the star show (finale) -----------------------------------------------------------------
  startShow() {
    if (this.phase === 'show') return;
    this.phase = 'show'; this.phaseT = 0;
    this.photoTaken = false; this.cheese = false; this.photo = null;
    for (const st of this.stations) {
      st.picker = null; st.drag = null; st.press = null; st.pen = null; st.toast = null;
      if (st.p.isAI) { st.p.ctrl.move(0, 0); st.p.ctrl.hold('a', false); st.ai.cmds = []; st.ai.chase = null; }
    }
    // anything left unfinished with enough stars comes alive now
    for (const con of this.cons.slice()) {
      if (con.done || con.stars.length < 3 || con.edges.length < 2) continue;
      const st = this.stations[con.owner];
      const left = TYPES.map((t) => t.id).filter((id) => !st.made.includes(id));
      this.complete(st, con, pick(left.length ? left : TYPES.map((t) => t.id)));
      st.actor.say(null);
    }
    for (const c of this.creatures) { if (c.state !== 'form') { c.state = 'home'; c.t = 0; } }
    this.moon.say = null; this.moonReact('sleepy', 'Goodnight, stars!');
    const n = this.n;
    this.spotDur = n <= 2 ? 3.4 : n <= 4 ? 2.8 : 2.0;
    this.showStart = 1.8;
    this.paradeAt = this.showStart + n * this.spotDur + 0.2;
    this.cheeseAt = this.paradeAt + 1.2;
    this.spot = -1;
    this.moonFrom = { x: this.moon.x, y: this.moon.y };
    if (this.crickets) { this.crickets.stop(1); this.crickets = null; }
    sfx('whoosh'); snd('sm-alive', 'magic', { vol: 0.6 });
  }

  updateShow(dt) {
    const t = this.phaseT, cam = this.api.camera, M = this.moon;
    const mk = ease.inOutQuad(clamp(t / 1.6, 0, 1));
    M.x = lerp(this.moonFrom.x, W / 2, mk); M.y = lerp(this.moonFrom.y, 200, mk);
    // one player's sky at a time
    const k = Math.floor((t - this.showStart) / this.spotDur);
    if (t >= this.showStart && k < this.n && k !== this.spot) {
      this.spot = k;
      const st = this.stations[k];
      const mine = this.creatures.filter((c) => c.owner === k);
      for (const c of mine) { c.trickT = -1; this.trick(c); }
      const a = st.actor;
      a.playOnce('celebrate', this.spotDur * 0.9, 'look-up'); a.emote('star', 1.2);
      if (mine.length) a.say(pick(['Look!', 'My stars!', 'Ta-da!', 'Twinkle!']), 1.3, 'yay');
      else a.say('Twinkle!', 1.2, 'woo');
      sfx('note', { midi: PENTA[k % PENTA.length], vol: 0.5 }); sfx('star', { vol: 0.6 });
      snd('crowd-ooh', null, { vol: 0.35 });
      for (const s of this.stars) if (s.owner === k) particles.trail(s.x, s.y, { type: 'sparkle', colors: ['#ffffff', st.p.color], size: [14, 22] });
    }
    if (cam) {
      if (this.spot >= 0 && this.spot < this.n && t < this.paradeAt) {
        const pts = this.stars.filter((s) => s.owner === this.spot);
        if (pts.length >= 2) cam.frame(pts, 230, 3); else cam.follow(W / 2, H / 2, 1, 3);
      } else cam.follow(W / 2, H / 2, 1, 3);
    }
    if (t >= this.paradeAt && !this.paraded) {
      this.paraded = true; this.spot = this.n;
      const list = this.creatures;
      list.forEach((c, i) => { c.state = 'parade'; c.paradeA = (i / Math.max(1, list.length)) * TAU; c.trickT = -1; });
      snd('jingle/showstopper', 'fanfare', { vol: 0.5 });
      this.moonReact('wow', null);
    }
    if (t >= this.cheeseAt && !this.cheese) {
      this.cheese = true; sfx('giggle');
      for (const st of this.stations) { st.actor.setPose('wave'); st.hop = { h: 0, v: 0 }; st.poseCD = 0; }
    }
    if (this.cheese && !this.photoTaken) for (const st of this.stations) this.cheeseMove(st, dt);
    const shot = this.cheeseAt + CHEESE_TIME;
    for (const d of [3, 2, 1]) if (t >= shot - d && t - dt < shot - d) sfx(d === 1 ? 'tock' : 'tick');
    if (t >= shot && !this.photoTaken) {
      this.photoTaken = true; this.photoT = 0;
      for (const st of this.stations) { if (st.hop) { st.hop = null; st.actor.y = st.home.y; } }
      this.photo = this.snapshot();
      fx.flash('#ffffff', 0.45);
      if (hasSound('camera-flash')) sfx('camera-flash', { vol: 0.7 }); else sfx('shutter');
      sfx('fanfare'); snd('applause', 'cheer', { vol: 0.7 });
      particles.confettiRain(W, 120);
      this.stations.forEach((st, i) => st.actor.playOnce(i % 2 ? 'photo' : 'strike3', 1.0, 'celebrate'));
    }
    if (this.photoTaken) { this.photoT += dt; if (this.photoT > PHOTO_SHOW + 1.2) this.finishGame(); }
    if (t > this.showStart && t < this.paradeAt && chance(dt * 2)) particles.trail(rand(100, W - 100), rand(140, 700), { type: 'sparkle', colors: ['#ffffff', '#fff6a8'] });
  }

  /** "Say cheese!": move (stick), jump (A) and pose (every other button) until the photo. */
  cheeseMove(st, dt) {
    const a = st.actor, c = st.p.ctrl, hop = st.hop, base = st.home;
    st.poseCD = Math.max(0, st.poseCD - dt);
    let mx = photoMove(c).x, jump = c.pressed('a'), pose = photoPosePressed(c);
    if (st.p.isAI) {
      st.aiT = (st.aiT ?? rand(0.2, 0.8)) - dt;
      if (st.aiT <= 0) { st.aiT = rand(0.5, 1.3); st.aiMx = chance(0.35) ? rand(-0.7, 0.7) : 0; if (chance(0.35)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      mx = st.aiMx || 0;
      if (Math.abs(a.x - base.x) > base.sp * 0.6) mx = Math.sign(base.x - a.x) * 0.6;
    }
    a.x = clamp(a.x + mx * 520 * dt, 200, W - 200);
    if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1;
    if (jump && hop.h <= 0) { hop.v = 900; sfx('boing', { vol: 0.35 }); a.squash(-0.25); }
    hop.v -= 2600 * dt; hop.h = Math.max(0, hop.h + hop.v * dt);
    if (hop.h <= 0 && hop.v < 0) { if (hop.v < -200) a.squash(0.2); hop.v = 0; }
    a.y = base.y - hop.h * a.scale;
    if (pose && st.poseCD <= 0) { st.poseCD = 0.35; strikePhotoPose(a, pose, { onBump: (who) => this.bumpNeighbours(st, who) }); }
    if (!a._once) a.setPose(hop.h > 0 ? 'jump' : Math.abs(mx) > 0.2 ? 'walk' : 'idle');
  }

  bumpNeighbours(st, a) {
    for (const o of this.stations) {
      if (o === st || !o.hop) continue;
      const b = o.actor, dx = b.x - a.x;
      if (Math.abs(dx) < (a.width + b.width) * 0.45) { b.x = clamp(b.x + Math.sign(dx || 1) * 70, 200, W - 200); b.playOnce('surprised', 0.8, 'idle'); b.squash(0.2); o.hop.v = Math.max(o.hop.v, 300); }
    }
    sfx('boing', { vol: 0.4 });
  }

  snapshot() {
    try {
      const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2;
      const g = c.getContext('2d'); g.scale(0.5, 0.5);
      this.drawWorld(g, true);
      particles.draw(g);
      return c;
    } catch (e) { return null; }
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    if (this.crickets) { this.crickets.stop(0.3); this.crickets = null; }
    const stats = this.stations.map((st) => {
      const pics = this.cons.filter((k) => k.owner === st.i && k.done).length;
      const parts = [];
      if (pics) parts.push(plural(pics, 'star picture'));
      else parts.push(plural(this.ownStars(st).length, 'star'));
      if (st.wishes) parts.push(st.wishes === 1 ? '1 wish' : `${st.wishes} wishes`);
      return parts.join(' · ');
    });
    this.api.finishTogether({ stats, title: 'Starry Night!' });
  }

  onDone() {
    if (this.phase === 'show') {
      if (!this.photoTaken) this.phaseT = Math.max(this.phaseT, this.cheeseAt + CHEESE_TIME - 0.4);
      else this.finishGame();
      return;
    }
    this.startShow();
  }

  destroy() { if (this.crickets) { this.crickets.stop(0.1); this.crickets = null; } }

  // =================================================================================================
  // Drawing
  draw(g) {
    this.drawWorld(g, false);
    if (this.phase === 'play') {
      for (const st of this.stations) this.drawCursor(g, st);
      for (const st of this.stations) if (st.picker) this.drawPicker(g, st);
    }
  }

  drawWorld(g, forPhoto) {
    this.drawSky(g);
    const M = this.moon;
    drawMoon(g, M.x, M.y + Math.sin(this.t * 1.1) * 5, MOON_R, M.expr, this.t);
    this.drawShooting(g);
    this.drawCons(g);
    this.drawCreatures(g);
    if (this.hillCanvas) g.drawImage(this.hillCanvas, 0, 0);
    this.drawFireflies(g);
    this.drawBeams(g);
    for (const st of this.stations) {
      st.actor.draw(g, { ring: st.p.color });
      if (!forPhoto && this.phase === 'play') this.drawTag(g, st);
    }
    if (!forPhoto && M.say) this.drawMoonSay(g);
  }

  drawSky(g) {
    const bg = art('bg/star-maker');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else if (this.skyCanvas) g.drawImage(this.skyCanvas, 0, 0);
    else { g.fillStyle = '#2a1f6b'; g.fillRect(0, 0, W, H); }
    const t = this.t;
    g.save();
    g.fillStyle = '#ffffff';
    for (const s of this.bgStars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      g.globalAlpha = a;
      if (s.big) {
        const r = s.r * (0.8 + 0.4 * a);
        g.fillRect(s.x - r * 2.2, s.y - 0.6, r * 4.4, 1.2); g.fillRect(s.x - 0.6, s.y - r * 2.2, 1.2, r * 4.4);
        g.beginPath(); g.arc(s.x, s.y, r, 0, TAU); g.fill();
      } else g.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    }
    g.restore();
    if (this.phase === 'show') {
      const d = clamp(this.phaseT / 1.2, 0, 1) * (this.paraded ? 0.1 : 0.22);
      g.fillStyle = `rgba(10,6,30,${d})`; g.fillRect(0, 0, W, H);
    }
  }

  drawShooting(g) {
    g.save(); g.lineCap = 'round';
    for (const s of this.shooting) {
      const a = clamp((s.life - s.t) / 0.4, 0, 1) * clamp(s.t / 0.15, 0, 1);
      const L = 0.32, x0 = s.x - s.vx * L, y0 = s.y - s.vy * L;
      const gr = g.createLinearGradient(x0, y0, s.x, s.y);
      gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, `rgba(255,250,220,${0.9 * a})`);
      g.strokeStyle = gr; g.lineWidth = 7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(s.x, s.y); g.stroke();
      g.globalAlpha = a; drawStar(g, s.x, s.y, 9, '#fff6a8', { tw: this.t * 12 }); g.globalAlpha = 1;
    }
    g.restore();
  }

  conAlpha(con) {
    if (this.phase !== 'show' || this.spot < 0 || this.spot >= this.n) return 1;
    return con.owner === this.spot ? 1 : 0.3;
  }

  drawCons(g) {
    g.save(); g.lineCap = 'round';
    for (const con of this.cons) {
      const own = this.stations[con.owner].p.color, al = this.conAlpha(con);
      const ne = con.edges.length;
      con.edges.forEach(([a, b], i) => {
        const lit = con.done ? clamp((con.formT - (i / Math.max(1, ne)) * 0.9) / 0.25, 0, 1) : 0;
        g.globalAlpha = al;
        // glow
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rgba(own, 0.18 + lit * 0.2); g.lineWidth = 12 + lit * 6;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = lit > 0 ? `rgba(255,248,220,${0.55 + lit * 0.4})` : rgba(mixHex(own, 0.55), 0.7);
        g.lineWidth = 3 + lit * 1.5;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      });
    }
    g.globalAlpha = 1;
    for (const s of this.stars) {
      const al = this.conAlpha(s.con);
      const pop = s.pop > 0 ? 1 + Math.sin((s.pop / 0.5) * Math.PI) * 0.5 : 1;
      const birth = s.born === undefined ? (s.born = this.t) : s.born;
      const grow = ease.outBack(clamp((this.t - birth) / 0.35, 0, 1));
      const lit = s.con.done ? 1.15 : 1;
      drawStar(g, s.x, s.y, s.r * pop * grow * lit, STAR_COLORS[s.col], { tw: s.tw, alpha: al, wish: s.wish });
    }
    g.restore();
  }

  drawCreatures(g) {
    for (const c of this.creatures) {
      const P = this.creaturePose(c);
      const al = c.alpha * (this.phase === 'show' && this.spot >= 0 && this.spot < this.n && c.owner !== this.spot ? 0.35 : 0.92);
      const big = this.phase === 'show' && c.owner === this.spot ? 1.1 : 1;
      drawCreature(g, c.type, c.x, c.y + P.oy, c.size * big, { ph: c.ph, color: c.color, alpha: al, facing: c.facing, rot: P.rot, sx: P.sx, sy: P.sy });
    }
  }

  drawFireflies(g) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const f of this.fireflies) {
      const x = f.x + Math.sin(this.t * 0.4 * f.sp + f.ph) * 40, y = f.y + Math.cos(this.t * 0.6 * f.sp + f.ph) * 18;
      const a = 0.4 + 0.6 * Math.max(0, Math.sin(this.t * 1.5 * f.sp + f.ph * 2));
      g.globalAlpha = a; g.drawImage(glowSprite('#d8ff7a'), x - 14, y - 14, 28, 28);
    }
    g.restore();
  }

  drawBeams(g) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const b of this.beams) {
      const u = b.t / 0.5, a = 1 - u;
      const cx = (b.x0 + b.x1) / 2 + (b.x1 > b.x0 ? -80 : 80), cy = Math.min(b.y0, b.y1) + 60;
      g.strokeStyle = rgba(b.color, 0.35 * a); g.lineWidth = 10;
      g.beginPath(); g.moveTo(b.x0, b.y0); g.quadraticCurveTo(cx, cy, b.x1, b.y1); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${0.7 * a})`; g.lineWidth = 3; g.stroke();
      const k = clamp(u * 2.2, 0, 1), q = 1 - k;
      const px = q * q * b.x0 + 2 * q * k * cx + k * k * b.x1, py = q * q * b.y0 + 2 * q * k * cy + k * k * b.y1;
      g.globalAlpha = a; g.drawImage(glowSprite('#ffffff'), px - 22, py - 22, 44, 44); g.globalAlpha = 1;
    }
    g.restore();
  }

  drawTag(g, st) {
    const a = st.actor, y = a.y - a.height - 26;
    ui.playerTag(g, st.p, a.x, y);
    // a little spirit icon for every finished picture
    const mine = this.cons.filter((k) => k.owner === st.i && k.done);
    const n = mine.length, s = 24, gap = s * 2.2, w = n * gap;
    mine.forEach((k, j) => {
      const ix = a.x - w / 2 + gap / 2 + j * gap, iy = y - 50;
      g.beginPath(); g.arc(ix, iy, s * 1.02, 0, TAU); g.fillStyle = 'rgba(30,20,70,0.75)'; g.fill(); g.lineWidth = 3; g.strokeStyle = st.p.color; g.stroke();
      drawCreature(g, k.kind, ix, iy, s * 0.8, { color: st.p.color, ph: this.t * 2 + j, halo: false });
    });
    if (st.wishes && st.nextWish) { g.save(); g.translate(a.x + 46, y); drawSparkleShape(g, 26 + Math.sin(this.t * 6) * 4, '#fff6a8'); g.restore(); }
  }

  drawMoonSay(g) {
    const M = this.moon, S = M.say;
    const a = Math.min(1, S.t / 0.15, (S.dur - S.t) / 0.25);
    if (a <= 0) return;
    const right = M.x < W - 520;
    const w = Math.max(200, ui.measure(g, S.text, 34, 800) + 50), h = 66;
    const x = right ? M.x + MOON_R + 28 : M.x - MOON_R - 28 - w, y = M.y - 40;
    g.save(); g.globalAlpha = clamp(a, 0, 1);
    ui.panel(g, x, y, w, h, { r: 33, fill: '#fff8ec', lineWidth: 5 });
    g.fillStyle = '#fff8ec'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath();
    if (right) { g.moveTo(x + 4, y + 22); g.lineTo(x - 22, y + 30); g.lineTo(x + 4, y + 44); }
    else { g.moveTo(x + w - 4, y + 22); g.lineTo(x + w + 22, y + 30); g.lineTo(x + w - 4, y + 44); }
    g.fill(); g.stroke();
    ui.text(g, S.text, x + w / 2, y + h / 2 + 2, { size: 34, color: '#7a4ad8', stroke: false, weight: 800 });
    g.restore();
  }

  drawCursor(g, st) {
    const { x, y } = st.cur, col = st.p.color, human = !st.p.isAI;
    g.save();
    // rubber band from the pen star
    const pen = st.pen && !st.pen.con.done && this.stars.includes(st.pen) ? st.pen : null;
    if (pen && !st.drag && st.hover !== pen && !st.picker) {
      g.setLineDash([10, 12]); g.lineDashOffset = -this.t * 40;
      g.strokeStyle = rgba(mixHex(col, 0.5), 0.75); g.lineWidth = 3;
      g.beginPath(); g.moveTo(pen.x, pen.y); g.lineTo(x, y); g.stroke();
      g.setLineDash([]);
      g.beginPath(); g.arc(pen.x, pen.y, 17 + Math.sin(this.t * 6) * 2, 0, TAU); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
    }
    if (st.hover) {
      g.beginPath(); g.arc(st.hover.x, st.hover.y, 24 + Math.sin(this.t * 8) * 2, 0, TAU);
      g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 3.5; g.strokeStyle = '#ffffff'; g.stroke();
    }
    // the wand tip: a ring in the player's colour with a preview star
    const R = st.drag ? 26 : 22;
    g.globalCompositeOperation = 'lighter';
    g.drawImage(glowSprite(col), x - 50, y - 50, 100, 100);
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.arc(x, y, R, 0, TAU); g.lineWidth = 7; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 4; g.strokeStyle = col; g.stroke();
    if (!st.hover && !st.drag) {
      g.globalAlpha = 0.85;
      if (st.nextWish) drawStar(g, x, y, 8, '#fff6a8', { tw: this.t * 4, wish: true });
      else if (st.col === DONE) drawDoneTab(g, x - 13, y - 13, 26, 26, { sel: true, label: false });
      else { starShape(g, x, y, 11, 0); g.fillStyle = STAR_COLORS[st.col]; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
      g.globalAlpha = 1;
    }
    ui.text(g, st.p.tag, x + 28, y - 30, { size: 22, color: col, strokeWidth: 5, align: 'left' });
    // little "what A does here" hints (people only)
    if (human && !st.picker) {
      let list = null;
      if (st.ready) list = [['b', 'Ready! (not yet?)']];
      else if (st.col === DONE) list = [['a', "I'm ready!"], ['lb', 'More stars']];
      else if (st.drag) list = [['a', 'Let go'], ['b', 'Remove']];
      else if (st.hover) list = st.hover.con.done ? [['a', 'Play'], ['b', 'Change it']] : pen && pen !== st.hover ? [['a', 'Join'], ['b', 'Remove']] : [['a', 'Hold: move'], ['b', 'Remove']];
      if (list) ui.hints(g, list, x, st.paletteT > 0 ? y - 66 : y + 52, { size: 26 });   // (above the wand while the colour strip shows)
    }
    // Y Finish! pulses near the pen star once the shape has 3+ stars
    if (human && pen && pen.con.stars.length >= 3 && !st.picker) {
      const bx = pen.x, by = pen.y - 46, k = 1 + Math.sin(this.t * 6) * 0.06;
      g.save(); g.translate(bx, by); g.scale(k, k);
      ui.panel(g, -78, -24, 156, 48, { r: 24, fill: '#fff8ec', lineWidth: 4, shadow: false });
      ui.glyph(g, 'y', -48, 0, 34);
      ui.text(g, 'Finish!', 18, 2, { size: 26, color: '#7a4ad8', stroke: false, weight: 800 });
      g.restore();
    }
    // colour strip after LB/RB
    if (st.paletteT > 0 && human) {
      g.globalAlpha = Math.min(1, st.paletteT / 0.3);
      const n = DONE + 1, s = 40, w = n * (s + 6) + 16;
      const px = clamp(x - w / 2, 10, W - w - 10), py = clamp(y + 40, 130, H - 70);
      ui.panel(g, px, py, w, s + 16, { r: 18, fill: '#2b2160', stroke: '#ffffff', lineWidth: 3, shadow: false });
      STAR_COLORS.forEach((c, i) => {
        const cx = px + 8 + i * (s + 6) + s / 2, cy = py + 8 + s / 2;
        if (i === st.col) { g.beginPath(); g.arc(cx, cy, s * 0.55, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill(); }
        starShape(g, cx, cy, i === st.col ? s * 0.5 : s * 0.36, 0); g.fillStyle = c; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
      });
      const dx = px + 8 + DONE * (s + 6);   // the last tile: Done
      drawDoneTab(g, dx + 2, py + 10, s - 4, s - 4, { sel: st.col === DONE, label: false });
      ui.text(g, st.col === DONE ? 'Done' : STAR_NAMES[st.col], px + w / 2, py - 18, { size: 24, color: st.col === DONE ? '#5ff0a0' : STAR_COLORS[st.col] });
      g.globalAlpha = 1;
    }
    if (st.toast) {
      const a = Math.min(1, (1.6 - st.toast.t) / 0.3);
      g.globalAlpha = clamp(a, 0, 1);
      ui.text(g, st.toast.text, x, y - 60 - st.toast.t * 20, { size: 34, color: '#fff6a8' });
      g.globalAlpha = 1;
    }
    g.restore();
  }

  drawPicker(g, st) {
    const P = st.picker, { x, y, R } = this.pickerCenter(st);
    const k = ease.outBack(clamp(P.t / 0.3, 0, 1)) * (st.p.isAI ? 0.5 : 1);
    g.save(); g.translate(x, y); g.scale(k, k);
    if (st.p.isAI) g.globalAlpha = 0.85;
    g.beginPath(); g.arc(0, 0, R + 70, 0, TAU); g.fillStyle = 'rgba(20,12,54,0.72)'; g.fill();
    g.lineWidth = 5; g.strokeStyle = st.p.color; g.stroke();
    ui.text(g, 'What is it?', 0, -8, { size: 34, color: '#fff6a8' });
    if (!st.p.isAI) ui.text(g, TYPES[P.sel].name, 0, 30, { size: 30, color: '#ffffff' });
    TYPES.forEach((tp, i) => {
      const a = i * (TAU / 8) - Math.PI / 2, cx = Math.cos(a) * R, cy = Math.sin(a) * R, sel = i === P.sel;
      const s = sel ? 1.18 + Math.sin(this.t * 8) * 0.04 : 1;
      g.save(); g.translate(cx, cy); g.scale(s, s);
      g.beginPath(); g.arc(0, 0, 50, 0, TAU); g.fillStyle = sel ? '#fff6a8' : '#3a2b7a'; g.fill();
      g.lineWidth = sel ? 6 : 3; g.strokeStyle = sel ? NAVY : 'rgba(255,255,255,0.5)'; g.stroke();
      drawCreature(g, tp.id, 0, 0, 38, { color: st.p.color, ph: this.t * 2 + i, halo: false });
      g.restore();
    });
    g.restore();
    if (!st.p.isAI) ui.hints(g, [['stick', 'Choose'], ['a', 'Come alive!'], ['b', 'Back']], x, clamp(y + R + 110, 0, H - 40), { size: 30 });
  }

  // --- HUD ------------------------------------------------------------------------------------------
  drawHUD(g) {
    const t = this.phaseT;
    if (this.phase === 'play') {
      this.drawTopBar(g);
      if (t < 2.8) {
        ui.banner(g, 'Star Maker!', t, { size: 140, color: '#fff6a8', y: 380 });
        ui.text(g, 'Put stars in the sky and join them up!', W / 2, 500, { size: 50, alpha: clamp((t - 0.3) / 0.3, 0, 1) * clamp((2.8 - t) / 0.3, 0, 1) });
      }
      return;
    }
    // the star show
    if (t < this.showStart + 0.3) ui.banner(g, 'Star Show!', t, { size: 130, color: '#fff6a8', y: 420 });
    if (this.spot >= 0 && this.spot < this.n && t < this.paradeAt) this.drawSpotCard(g, this.stations[this.spot], t - this.showStart - this.spot * this.spotDur);
    const shot = this.cheeseAt + CHEESE_TIME;
    if (this.cheese && !this.photoTaken) {
      if (t < shot - 3) ui.banner(g, 'Say cheese!', t - this.cheeseAt, { y: 300, size: 120, color: '#ffffff' });
      else { const n = Math.ceil(shot - t), f = 1 - (shot - t - (n - 1)); g.save(); g.translate(W / 2, 300); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(n), 0, 0, { size: 200, color: '#fff6a8', strokeWidth: 12 }); g.restore(); }
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
        ui.hints(g, r1, W / 2, 130, { size: 34 }); ui.hints(g, r2, W / 2, 182, { size: 34 });
      }
    }
    if (this.paraded && !this.cheese) ui.banner(g, 'Star parade!', t - this.paradeAt, { y: 300, size: 110, color: '#ffb3e6' });
    if (this.photoTaken && this.photo) this.drawPhoto(g);
  }

  drawTopBar(g) {
    g.save();
    const gr = g.createLinearGradient(0, 0, 0, 100);
    gr.addColorStop(0, 'rgba(14,9,40,0.85)'); gr.addColorStop(1, 'rgba(14,9,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, 110);
    g.restore();
    g.save(); g.translate(56, 52); drawStar(g, 0, 0, 14, '#ffe27a', { tw: this.t * 3 }); g.restore();
    ui.text(g, 'Star Maker', 90, 52, { size: 46, color: '#fff6a8', align: 'left', strokeWidth: 9 });
    ui.hints(g, [['a', 'Star'], ['b', 'Remove'], ['x', 'New line'], ['y', 'Finish!'], ['rb', 'Colour / Done']], W - 24, 52, { size: 30, gap: 18, align: 'right' });
  }

  drawSpotCard(g, st, u) {
    const a = clamp(Math.min(u / 0.25, (this.spotDur - u) / 0.25), 0, 1);
    if (a <= 0) return;
    const mine = this.cons.filter((k) => k.owner === st.i && k.done);
    const w = 820, h = 132, x = W / 2 - w / 2, y = H - 176;
    g.save(); g.globalAlpha = a;
    g.translate(W / 2, y + h / 2); const s = 0.9 + 0.1 * ease.outBack(clamp(u / 0.3, 0, 1)); g.scale(s, s); g.translate(-W / 2, -(y + h / 2));
    ui.panel(g, x, y, w, h, { r: 40, fill: '#2b2160', stroke: st.p.color, lineWidth: 7 });
    drawPortrait(g, st.p, x + 72, y + h / 2, 48, { ring: st.p.color, ringWidth: 5, expr: 'happy' });
    ui.text(g, `${playerName(st.p)}'s stars`, x + 140, y + 42, { size: 40, color: '#fff6a8', align: 'left', maxWidth: w - 170 });
    if (mine.length) {
      const names = mine.map((k) => TYPES[TYPE[k.kind]].name);
      mine.slice(0, 5).forEach((k, j) => drawCreature(g, k.kind, x + 170 + j * 76, y + 96, 26, { color: st.p.color, ph: this.t * 2 + j, halo: false }));
      ui.text(g, names.join(' · '), x + 170 + Math.min(5, mine.length) * 76 + 10, y + 96, { size: 28, color: '#ffffff', align: 'left', maxWidth: w - 220 - Math.min(5, mine.length) * 76 });
    } else ui.text(g, `${plural(this.ownStars(st).length, 'twinkly star')}`, x + 390, y + 96, { size: 30, color: '#ffffff' });
    g.restore();
  }

  drawPhoto(g) {
    const t = this.photoT;
    const pop = ease.outBack(clamp(t / 0.45, 0, 1));
    const fade = clamp((PHOTO_SHOW + 1.2 - t) / 0.4, 0, 1);
    g.save();
    g.fillStyle = `rgba(14,9,40,${0.45 * clamp(t / 0.4, 0, 1) * fade})`; g.fillRect(0, 0, W, H);
    g.globalAlpha = fade;
    g.translate(W / 2, H / 2 - 10); g.rotate(-0.03); g.scale(pop, pop);
    const pw = 880, ph = pw * (H / W), m = 26;
    ui.panel(g, -pw / 2 - m, -ph / 2 - m, pw + m * 2, ph + m * 2 + 70, { r: 10, fill: '#fffaf0', lineWidth: 5 });
    g.drawImage(this.photo, -pw / 2, -ph / 2, pw, ph);
    g.lineWidth = 3; g.strokeStyle = NAVY; g.strokeRect(-pw / 2, -ph / 2, pw, ph);
    ui.text(g, 'Our Starry Night', 0, ph / 2 + 50, { size: 44, color: '#7a4ad8', stroke: false, weight: 800 });
    g.restore();
  }
}
