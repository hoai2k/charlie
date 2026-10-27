// Hair Salon (Play Studio): every player runs a salon chair with a big,
// friendly client whose hair is a messy bed-head. Brush it smooth, snip it,
// grow it with the magic spray, curl or straighten it, colour it (rainbow
// streaks and glitter too), tie it up (ponytail, pigtails, bun, space buns,
// braid) and add bows, flowers, clips and tiaras. A or X uses the tool (hold; the
// tools are all optional, so neither moves on), LB / RB or the d-pad left / right
// pick the tool (the last one is Done: A there says the look is finished), and the
// d-pad up / down (LT / RT; on a keyboard WASD is the hand) step the tool's list of
// colours / styles / bling beside the client. Then a hand-mirror reveal at every chair and a photo-wall showcase:
// the camera visits each client, and the stylists pose for a group photo.
//
// The hair is live strand geometry (games/hair-salon/hair.js), the client is
// drawn procedurally (client.js), and every prop looks up generated art first
// (props.js), so nothing here needs an image file.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { aiProfile } from '../engine/ai.js';
import { clamp, damp, rand, randInt, pick, chance, shuffle, TAU, later } from '../engine/util.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose } from '../engine/photo-poses.js';
import { Client, CLIENTS } from './hair-salon/client.js';
import { HAIR_COLORS, STYLES, HEAD_RX, HEAD_RY, SEG, MAXL, MAXB, MINL, hairlineY, paintSeg, extendColour } from './hair-salon/hair.js';
import { TOOLS, TOOL_IDX, BLING } from './hair-salon/props.js';
import { SalonDrawing, REVEAL_T, CHEESE_T, OPTIONS, STAR_KEYS } from './hair-salon/draw.js';
import { meta } from './hair-salon.meta.js';

const DONE = TOOLS.length;  // the last toolbar slot: "Done" (A there = the look is finished)
const STYLE_TIME = 240;   // the Play Studio clock (seconds), then "Time's up!" asks

const SHOT_T = 1.5;            // camera stop per client in the showcase
const PHOTO_T = 4;             // the big photo stays this long

/** Recorded sound when it exists, else a synth stand-in. */
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export { meta };

export class Game extends SalonDrawing {
  constructor(api) {
    super();
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'style';
    this.phaseT = 0;
    this.finished = false;
    this.snips = [];
    this.layoutStations();
    const capes = shuffle(['#ff9ed6', '#b9a2ff', '#7fd3ff', '#7fe0b4', '#ffcf5c', '#ff9f7a']);
    const skins = shuffle(['#ffe0c7', '#f8c9a2', '#e8ae84', '#c98d62', '#a46b47', '#7f4f35']);
    const hairs = shuffle(['#8a5a3c', '#ffd36e', '#41335a', '#ff8a3d', '#b07a52', '#5e3d2b']);
    // everyone starts on the client picker (a portrait grid); the chair shows the one under the cursor
    this.stations = this.players.map((p, i) => this.makeStation(p, i, { ...CLIENTS[i % CLIENTS.length], cape: capes[i % 6] }));
    this.banner = null;   // each station shows "Who will you style?" over its portrait grid
    // The Play Studio clock: 4 minutes of styling (drawn by the play scene the whole time). At 0 it
    // asks the goal question: Go! (the default) goes to the mirror reveal (as the pause menu's
    // "All done!"), the stay choice adds a minute. Like api.studioClock, but it stops when the reveal starts.
    this.styleLeft = STYLE_TIME;
    api.limit(() => (this.phase === 'style' ? this.styleLeft : null), {
      showAt: Infinity, x: W / 2, y: 54,
      timeUp: { goal: true, title: 'Mirror time!', goLabel: 'Show me!', moreLabel: 'Keep styling', more: () => { this.styleLeft += 60; }, done: () => this.onDone() },
    });
    sfx('magic');
  }

  // ---- layout ----------------------------------------------------------------
  layoutStations() {
    const n = this.n, top = 106, bottom = H - 14, gap = 16;
    const rows = n <= 4 ? 1 : 2;
    const perRow = rows === 1 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const cols = perRow[0];
    const sh = (bottom - top - gap * (rows - 1)) / rows;
    let sw = (W - 28 - gap * (cols - 1)) / cols;
    if (n === 1) sw = 1240;
    if (n === 2) sw = Math.min(sw, 920);
    this.rects = [];
    perRow.forEach((cnt, r) => {
      const total = cnt * sw + (cnt - 1) * gap;
      for (let c = 0; c < cnt; c++) this.rects.push({ x: (W - total) / 2 + c * (sw + gap), y: top + r * (sh + gap), w: sw, h: sh });
    });
  }

  makeStation(p, i, look) {
    const r = this.rects[i];
    const compact = r.h < 600;
    const narrow = r.w < 520;
    const s = {
      p, i, r, compact, narrow,
      headerH: compact ? 56 : 76, toolH: compact ? 62 : 86,
      tool: 0, opt: { colour: randInt(4, 10), style: 1, bling: 0 }, optPop: 0, toolPop: 0, listBump: 0,
      client: new Client(look),
      cursor: { x: 0, y: 0, px: 0, py: 0, speed: 0 },
      held: null, hover: null,
      ready: false, readyT: 0,
      stars: {}, ev: {},
      stats: { snips: 0, colours: new Set(), styles: 0, sprays: 0 },
      sfxT: 0, cool: 0, snipT: 0, workT: 0, sparkT: 0,
      revealT: -1, said: false,
      ai: null,
      cape: look.cape, picking: true, pickIdx: i % CLIENTS.length, pickPop: 0, pickAt: rand(1.2, 2.6),
    };
    s.scene = { x: r.x, y: r.y + s.headerH, w: r.w, h: r.h - s.headerH - s.toolH };
    const sc = s.scene;
    // the tool's options are a vertical list in a column on the right of the scene; the chair
    // (and the hand and stylist) use the rest of it, the "stage"
    const listW = narrow ? (compact ? 84 : 96) : clamp(r.w * 0.22, 200, 264);
    s.stage = { x: sc.x, y: sc.y, w: sc.w - listW, h: sc.h };
    s.list = { x: sc.x + sc.w - listW + 4, y: sc.y + 8, w: listW - 12, h: sc.h - 16 };
    const st = s.stage;
    s.k = Math.min(sc.h / 770, st.w / (narrow ? 470 : 640));
    s.hx = st.x + st.w * 0.5;
    s.hy = sc.y + 300 * s.k + (sc.h - 770 * s.k) * 0.35;
    s.res = s.k * 1.25;
    s.cursor.x = s.cursor.px = s.hx + 60 * s.k;
    s.cursor.y = s.cursor.py = s.hy - 40 * s.k;
    // the stylist (this player's character) on the floor beside the chair
    const ch = new Actor(p, { x: s.hx - 300 * s.k, y: sc.y + sc.h - 6 });
    ch.scale = clamp((sc.h * 0.42) / ch.leader.h, 0.36, 1.25);
    ch.facing = 1;
    ch.snap();
    s.char = ch; s.side = -1;
    return s;
  }

  // ---- client picker (start) -----------------------------------------------------
  updatePick(s, dt) {
    const c = s.p.ctrl, n = CLIENTS.length, cols = 4, rows = Math.ceil(n / cols);
    s.pickPop = Math.max(0, s.pickPop - dt * 4);
    if (s.p.isAI) {
      s.pickAt -= dt;
      if (s.pickAt <= 0) {
        // a girl nobody else is styling yet (so two stations never look like a mirror)
        const taken = new Set(this.stations.filter((o) => o !== s && !o.picking).map((o) => o.pickIdx));
        const free = CLIENTS.map((_, i) => i).filter((i) => !taken.has(i));
        s.pickIdx = free.length ? pick(free) : randInt(0, n - 1);
        s.client = this.makeClient(s, s.pickIdx); this.choose(s);
      }
    } else {
      const dx = c.nav.x, dy = c.nav.y;
      if (dx || dy) {
        const col = (s.pickIdx % cols + Math.sign(dx) + cols) % cols, row = (Math.floor(s.pickIdx / cols) + Math.sign(dy) + rows) % rows;
        s.pickIdx = Math.min(n - 1, row * cols + col); s.pickPop = 1; sfx('move');
        s.client = this.makeClient(s, s.pickIdx);   // live preview in the chair
      }
      if (c.pressed('a') || c.pressed('x')) this.choose(s);
    }
    s.client.update(dt, 0, 0.2);
    this.updateStylist(s, dt);
  }
  makeClient(s, idx) { return new Client({ ...CLIENTS[idx], cape: s.cape }); }
  choose(s) {
    s.picking = false;
    sfx('select'); s.client.pop(0.3); s.client.react('wow', 1);
    s.client.say(`Hi! I'm ${CLIENTS[s.pickIdx].name}!`, 1.8);
    if (s.p.isAI) s.ai = this.makePlan(s);
    if (this.stations.every((o) => !o.picking)) this.banner = { text: 'Salon is open!', t: 0 };
  }

  toHead(s, x, y) {
    const P = s.client.pose();
    return { x: (x - s.hx) / s.k, y: (y - s.hy) / s.k - P.dy - HEAD_RY * (1 - P.sy) };
  }
  toScreen(s, hx, hy) {
    const P = s.client.pose();
    return { x: s.hx + hx * s.k, y: s.hy + (hy + P.dy + HEAD_RY * (1 - P.sy)) * s.k };
  }

  // ---- update -------------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.2) this.banner = null; }
    this.updateSnips(dt);
    if (this.phase === 'style') {
      this.styleLeft = Math.max(0, this.styleLeft - dt);   // waits at 0 for the "Time's up!" question
      for (const s of this.stations) this.updateStation(s, dt);
      // styling ends when everyone has said Done (RB to the Done slot, A), or on "Time's up!" -> All done
      if (this.stations.every((s) => s.ready)) {
        this.allReadyT = (this.allReadyT || 0) + dt;
        if (this.allReadyT > 1.4) this.startReveal();
      } else this.allReadyT = 0;
    } else if (this.phase === 'reveal') {
      for (const s of this.stations) this.updateReveal(s, dt);
      if (this.phaseT > REVEAL_T + this.n * 0.15) this.startShow();
    } else if (this.phase === 'show') {
      this.updateShow(dt);
    }
  }

  updateStation(s, dt) {
    if (s.picking) { this.updatePick(s, dt); return; }
    const p = s.p, c = p.ctrl, cl = s.client, sc = s.stage;
    if (s.ai) this.ai(s, dt);
    const pad = c.kind !== 'kb', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    const cur = s.cursor;
    const sp = 820 * clamp(s.k * 1.15, 0.6, 1.2);
    cur.px = cur.x; cur.py = cur.y;
    cur.x = clamp(cur.x + mx * sp * dt, sc.x + 24, sc.x + sc.w - 24);
    cur.y = clamp(cur.y + my * sp * dt, sc.y + 20, sc.y + sc.h - 16);
    cur.speed = damp(cur.speed, Math.hypot(cur.x - cur.px, cur.y - cur.py) / Math.max(dt, 1e-3), 12, dt);
    const motion = 0.75 + Math.min(1, cur.speed / (380 * s.k)) * 0.6;

    // LB / RB or d-pad left / right: tools, the last one is Done · d-pad up / down or LT / RT (on a
    // keyboard WASD is the hand, so LT / RT only): the tool's list of colours / styles / bling ·
    // A or X: use the tool (hold; the tools are optional, so nothing moves on) · A on Done: the look
    // is finished · B: spin the chair / take bling off (once Done: not done yet)
    const N = TOOLS.length + 1;
    const toolStep = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0) + (pad ? (c.pressed('right') ? 1 : 0) - (c.pressed('left') ? 1 : 0) : 0);
    if (toolStep) this.setTool(s, (s.tool + toolStep + N) % N);
    const optStep = (c.pressed('rt') ? 1 : 0) - (c.pressed('lt') ? 1 : 0) + (pad ? (c.pressed('down') ? 1 : 0) - (c.pressed('up') ? 1 : 0) : 0);
    if (optStep) this.stepOption(s, optStep);
    let usedB = false;
    if (s.tool === DONE && c.pressed('a') && !s.ready) this.toggleReady(s);
    else if (s.ready && (c.pressed('b') || s.tool !== DONE)) { usedB = c.pressed('b'); this.toggleReady(s); }
    s.toolPop = Math.max(0, s.toolPop - dt * 3); s.optPop = Math.max(0, s.optPop - dt * 2.5); s.listBump = Math.max(0, s.listBump - dt * 1.2);
    s.sfxT -= dt; s.cool -= dt; s.sparkT -= dt;

    const tool = s.tool === DONE ? 'done' : TOOLS[s.tool].id;
    // A does just what X does (hold to work, tap to tie a style / place bling)
    const hold = c.held('x') || c.held('a'), tap = c.pressed('x') || c.pressed('a');
    const hp = this.toHead(s, cur.x, cur.y);
    const hair = cl.hair;
    s.working = false;

    // bling being carried follows the hand
    if (s.held && (tool !== 'bling' || !cl.bling.includes(s.held))) this.dropHeld(s, hp);
    if (s.held) { s.held.x = hp.x; s.held.y = hp.y; }
    s.hover = tool === 'bling' && !s.held ? cl.blingAt(hp.x, hp.y) : null;
    if (tool === 'bling' && c.pressed('b') && (s.held || s.hover)) { this.removeBling(s, s.held || s.hover); usedB = true; }
    if (!usedB && c.pressed('b') && s.cool <= 0) this.spinChair(s);

    const R = 46;
    if (hold && tool === 'brush') {
      const touched = new Set();
      hair.near(hp.x, hp.y, R, (st) => { touched.add(st); return false; }, 2);
      if (hair.onCap(hp.x, hp.y)) for (const st of hair.strands) if (!st.bang && Math.abs(Math.sin(st.a) * HEAD_RX - hp.x) < R) touched.add(st);
      if (touched.size) {
        s.working = true;
        for (const st of touched) if (st.messy > 0) { st.messy = Math.max(0, st.messy - 1.5 * motion * dt); hair.touch(st); }
        if (s.sfxT <= 0) { sfx('brush', { vol: 0.5 }); s.sfxT = 0.16; }
        if (s.sparkT <= 0) { s.sparkT = 0.1; particles.burst(cur.x + rand(-20, 20) * s.k, cur.y + rand(-20, 20) * s.k, { type: 'sparkle', count: 1, colors: ['#ffffff', '#fff6a8', '#ffc8f0'] }); }
        if (cl.exprT <= 0.1) cl.react('happy', 0.5);
        if (!s.ev.tidy && hair.avg('messy') < 0.15) { s.ev.tidy = true; this.earn(s, 'tidy', 'Silky smooth!', '#7fd3ff'); }
      }
    } else if (hold && tool === 'scissors') {
      s.snipT += dt;
      if (s.snipT > 0.11) {
        s.snipT = 0;
        let cut = 0;
        for (const st of hair.strands) {
          const pts = st.pts, minL = st.bang ? 4 : MINL;
          for (let j = 0; j < pts.length; j += 3) {
            const d = pts[j + 2];
            if (d < minL) continue;
            const dx = pts[j] - hp.x, dy = pts[j + 1] - hp.y;
            if (dx * dx + dy * dy < 28 * 28) {
              const old = st.L;
              if (old - d > 8) {
                st.L = Math.max(minL, d);
                hair.touch(st);
                cut += old - st.L;
                this.spawnSnip(s, pts[j], pts[j + 1], hair.colorAt(st, d + 12), Math.min(90, old - st.L), st.curl);
              }
              break;
            }
          }
        }
        if (cut > 0) {
          s.working = true; s.stats.snips++;
          snd('salon-snip', 'shutter', { vol: 0.6 });
          if (cut > 260 && cl.exprT <= 0) { cl.react('eek', 0.6); cl.pop(0.15); }
          if (!s.ev.cut) { s.ev.cut = true; this.earn(s, 'cut', 'Snip snip!', '#ff6fb1'); }
          if (!s.ev.pixie && hair.main.every((m) => m.L <= MINL + 1)) { s.ev.pixie = true; this.popAt(s, 'Pixie cut!', '#ffd23f'); cl.react('wow', 1); }
        } else if (s.sfxT <= 0) { sfx('tick', { vol: 0.4 }); s.sfxT = 0.22; }
      }
    } else if (hold && tool === 'grow') {
      const touched = new Set();
      hair.near(hp.x, hp.y, R * 1.1, (st) => { touched.add(st); return false; }, 2);
      for (const st of hair.strands) { const tp = hair.tip(st); if (Math.hypot(tp.x - hp.x, tp.y - hp.y) < R * 1.7) touched.add(st); }
      let grew = false;
      for (const st of touched) {
        const max = st.bang ? MAXB : MAXL;
        if (st.L < max) { const was = st.L; st.L = Math.min(max, st.L + (st.bang ? 90 : 170) * dt); extendColour(st, was); hair.touch(st); grew = true; }
      }
      if (grew) {
        s.working = true;
        if (s.sfxT <= 0) { snd('salon-grow', 'grow', { vol: 0.45 }); s.sfxT = 0.55; }
        if (chance(dt * 18)) particles.burst(cur.x, cur.y, { type: 'sparkle', count: 1, colors: ['#b8ffcc', '#fff6a8', '#ffffff'] });
        if (cl.exprT <= 0.1) cl.react('giggle', 0.5);
        if (!s.ev.grow) { s.ev.grow = true; this.earn(s, 'cut', 'Grow, grow!', '#5ddc6a'); }
        if (!s.ev.long && hair.avg('L') > 470) { s.ev.long = true; this.popAt(s, 'Super long!', '#5ddc6a'); cl.react('wow', 1); }
        if (!s.ev.blind && hair.avg('L', true) > 150) { s.ev.blind = true; cl.say('I can\'t see!', 1.8); sfx('giggle'); }
      }
    } else if (hold && (tool === 'curl' || tool === 'straight')) {
      const touched = new Set();
      hair.near(hp.x, hp.y, R, (st) => { touched.add(st); return false; }, 2);
      if (touched.size) {
        s.working = true;
        for (const st of touched) {
          if (tool === 'curl') { if (st.curl < 1) { st.curl = Math.min(1, st.curl + 0.9 * motion * dt); hair.touch(st); } }
          else if (st.curl > 0 || st.messy > 0) { st.curl = Math.max(0, st.curl - 1.1 * motion * dt); st.messy = Math.max(0, st.messy - 0.7 * dt); hair.touch(st); }
        }
        if (tool === 'curl') {
          if (s.sfxT <= 0) { snd('salon-curl', 'bubble', { vol: 0.5 }); s.sfxT = 0.2; }
          if (chance(dt * 10)) particles.burst(cur.x, cur.y, { type: 'heart', count: 1, colors: ['#c9a2ff', '#ff9ed6'], size: [10, 16] });
          if (!s.ev.curly && hair.avg('curl') > 0.7) { s.ev.curly = true; this.earn(s, 'shape', 'So curly!', '#b36bff'); cl.react('happy', 1); }
        } else {
          if (s.sfxT <= 0) { snd('salon-steam', 'whoosh', { vol: 0.35 }); s.sfxT = 0.38; }
          if (chance(dt * 12)) particles.burst(cur.x, cur.y - 10 * s.k, { type: 'smoke', count: 1, colors: ['#ffffff'], size: [12, 22], speed: [20, 60] });
          if (!s.ev.sleek && hair.avg('curl') < 0.04 && this.t > 3) { s.ev.sleek = true; this.earn(s, 'shape', 'Sleek!', '#4fd98a'); }
        }
      }
    } else if (hold && tool === 'colour') {
      const col = HAIR_COLORS[s.opt.colour];
      let changed = 0;
      hair.near(hp.x, hp.y, 40, (st, j, d) => { if (paintSeg(st, Math.floor(d / SEG), col)) { changed++; hair.touch(st); } });
      if (hair.onCap(hp.x, hp.y)) for (const st of hair.strands) if (!st.bang && Math.abs(Math.sin(st.a) * HEAD_RX - hp.x) < 40) { for (const k of [0, 1]) if (paintSeg(st, k, col)) { changed++; hair.touch(st); } }
      const onHair = changed > 0 || hair.hitAny(hp.x, hp.y, 30);
      if (onHair) {
        s.working = true;
        if (s.sfxT <= 0) { snd('salon-spray', 'brush', { vol: 0.55 }); s.sfxT = 0.13; }
        const colors = col.id === 'rainbow' ? RAINBOW : col.id === 'glitter' ? ['#ffffff', '#fff6a8', '#e0d4ff'] : [col.c, '#ffffff'];
        if (chance(dt * 26)) particles.burst(cur.x + rand(-14, 14) * s.k, cur.y + rand(-14, 14) * s.k, { type: col.id === 'glitter' ? 'sparkle' : 'spark', count: 2, colors, speed: [30, 120], size: [4, 8] });
        if (changed) {
          s.stats.sprays++;
          s.stats.colours.add(col.id);
          if (!s.ev['c-' + col.id]) {
            s.ev['c-' + col.id] = true;
            if (!s.stars.colour) this.earn(s, 'colour', col.id === 'rainbow' ? 'Rainbow!' : col.id === 'glitter' ? 'Sparkly!' : `Ooh, ${col.name.toLowerCase()}!`, col.c || '#ff6fb1');
            else this.popAt(s, col.id === 'rainbow' ? 'Rainbow!' : col.id === 'glitter' ? 'Sparkly!' : `${col.name}!`, col.c || '#ff6fb1', 0.8);
            cl.react(col.id === 'glitter' ? 'happy' : 'wow', 0.8);
          }
        }
      }
    } else if (tap && tool === 'style') {
      this.applyStyle(s, STYLES[s.opt.style].id);
    } else if (tap && tool === 'bling') {
      const onIt = hair.hitAny(hp.x, hp.y, 40) || hair.onHead(hp.x, hp.y, 1.15);
      if (s.held) this.dropHeld(s, hp);
      else if (s.hover) this.pickUpBling(s, s.hover);
      else if (onIt) this.placeBling(s, hp);
      else { sfx('blip'); particles.burst(cur.x, cur.y, { type: 'spark', count: 4, colors: ['#ffffff'] }); }
    }

    // client looks at the hand, the stylist walks to its side
    cl.update(dt, (hp.x) / 260, (hp.y - 20) / 260);
    this.updateStylist(s, dt);
    if (s.ready) s.readyT += dt;
  }

  updateStylist(s, dt) {
    const a = s.char, sc = s.stage, cur = s.cursor;
    const half = 230 * s.k;
    if (Math.abs(cur.x - s.hx) > half * 0.4) s.side = cur.x > s.hx ? 1 : -1;
    const w = Math.max(a.width, 60);
    let tx = s.hx + s.side * (half + w * 0.15);
    tx = clamp(tx, sc.x + w * 0.42, sc.x + sc.w - w * 0.42);
    const vx = clamp((tx - a.x) * 4, -300 * a.scale * 2, 300 * a.scale * 2);
    a.x += vx * dt;
    if (Math.abs(tx - a.x) > 6) a.moveAnim(vx, 0, 300 * a.scale * 2);
    else {
      a.facing = -s.side;
      if (this.phase === 'style') a.setPose(s.working ? 'paint' : s.ready ? 'wave' : 'idle');
    }
    a.update(dt);
  }

  setTool(s, i) {
    if (s.tool === i) { s.toolPop = 0.6; return; }
    s.tool = i; s.toolPop = 1; s.optPop = TOOLS[i] && OPTIONS[TOOLS[i].id] ? 1 : 0; sfx('swap', { vol: 0.6 });
  }

  stepOption(s, d) {
    if (s.tool === DONE) return;
    const id = TOOLS[s.tool].id;
    if (!OPTIONS[id]) {
      // nothing to choose on this tool
      s.toolPop = 0.6; sfx('blip', { vol: 0.4 });
      return;
    }
    const n = OPTIONS[id].list.length;
    s.opt[id] = (s.opt[id] + d + n) % n;
    s.optPop = 1; s.listBump = 0.12;
    sfx('collect', { step: s.opt[id] % 8, vol: 0.5 });
  }

  earn(s, key, text, color) {
    this.popAt(s, text, color);
    if (s.stars[key]) return;
    s.stars[key] = true;
    s.starPop = s.starPop || {}; s.starPop[key] = 1;
    sfx('star'); sfx('correct', { vol: 0.5 });
    s.char.playOnce('cheer', 0.6);
    s.client.react('happy', 1.2); s.client.pop(0.2);
    const cpt = this.toScreen(s, 0, -40);
    particles.burst(cpt.x, cpt.y, { type: 'star', count: 6 });
    this.rumble(s.p, 0.3, 80);
    if (STAR_KEYS.every((k) => s.stars[k]) && !s.ev.allStars) {
      s.ev.allStars = true;
      later(() => { if (this.finished || this.phase !== 'style') return; this.popAt(s, 'Superstar stylist!', '#ffd23f', 1.2); sfx('fanfare', { vol: 0.5 }); particles.burst(cpt.x, cpt.y, { type: 'confetti', count: 30 }); s.char.playOnce('celebrate', 1.6); }, 700);
    }
  }

  popAt(s, text, color, size = 1) {
    const p = this.toScreen(s, 0, -HEAD_RY * 1.35);
    particles.popText(p.x, Math.max(s.scene.y + 30, p.y), text, color, (s.compact ? 34 : 46) * size);
  }

  rumble(p, a, ms) { try { p.ctrl.rumble && p.ctrl.rumble(a, ms); } catch (e) { /* ignore */ } }

  spawnSnip(s, hx, hy, col, len, curl) {
    const p = this.toScreen(s, hx, hy);
    this.snips.push({ st: s, x: p.x, y: p.y, vx: rand(-60, 60), vy: rand(-80, 20), rot: rand(TAU), vr: rand(-4, 4), len: Math.max(14, len * s.k * 0.7), w: 9 * s.k + 2, col, curl, t: 0, rest: false, floor: s.scene.y + s.scene.h - rand(4, 18) });
    const list = this.snips.filter((q) => q.st === s);
    if (list.length > 70) this.snips.splice(this.snips.indexOf(list[0]), 1);
  }

  updateSnips(dt) {
    for (const q of this.snips) {
      q.t += dt;
      if (q.rest) continue;
      q.vy += 900 * dt; q.vx *= 1 - 1.5 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.y >= q.floor) { q.y = q.floor; q.rest = true; q.rot = Math.round(q.rot / Math.PI) * Math.PI + rand(-0.3, 0.3); }
    }
  }

  applyStyle(s, id) {
    const cl = s.client, hair = cl.hair;
    if (hair.style === id) { cl.pop(0.12); sfx('blip'); return; }
    hair.setStyle(id);
    s.stats.styles++;
    const c = this.toScreen(s, 0, -30);
    particles.burst(c.x, c.y, { type: 'smoke', count: 12, colors: ['#ffffff', '#ffe8f4'], speed: [80, 220], size: [26, 48] });
    particles.burst(c.x, c.y, { type: 'sparkle', count: 14 });
    sfx('magic'); snd('salon-poof', 'pop');
    cl.react('wow', 1); cl.pop(0.3);
    const st = STYLES.find((x) => x.id === id);
    if (id === 'loose') this.popAt(s, st.pop, '#ff9f1c');
    else this.earn(s, 'shape', st.pop, '#ff6fb1');
    s.char.playOnce('cast', 0.5);
  }

  placeBling(s, hp) {
    const def = BLING[s.opt.bling];
    const cl = s.client;
    cl.bling.push({ def, x: hp.x, y: hp.y, rot: rand(-0.3, 0.3), t: 0 });
    if (cl.bling.length > 8) cl.bling.splice(cl.bling.findIndex((b) => b !== s.held), 1);
    s.opt.bling = (s.opt.bling + 1) % BLING.length;   // next one is ready to place
    const cur = s.cursor;
    particles.burst(cur.x, cur.y, { type: 'sparkle', count: 8 });
    particles.burst(cur.x, cur.y, { type: 'heart', count: 2 });
    snd('salon-clip', 'stamp'); sfx('sparkle', { vol: 0.6 });
    cl.react('happy', 1); cl.pop(0.2);
    if (!s.stars.bling) this.earn(s, 'bling', def.wide ? 'Like a princess!' : 'So cute!', '#ff6fb1');
    else if (def.wide && !s.ev.royal) { s.ev.royal = true; this.popAt(s, 'Like a princess!', '#ffd23f'); }
  }
  pickUpBling(s, b) {
    s.held = b; s.hover = null; b.home = { x: b.x, y: b.y };
    const cl = s.client; cl.bling.splice(cl.bling.indexOf(b), 1); cl.bling.push(b);
    sfx('pop', { vol: 0.6 }); this.rumble(s.p, 0.15, 40);
  }
  dropHeld(s, hp) {
    const b = s.held; s.held = null;
    if (!b || !s.client.bling.includes(b)) return;
    const hair = s.client.hair;
    if (!(hair.hitAny(hp.x, hp.y, 40) || hair.onHead(hp.x, hp.y, 1.15)) && b.home) { b.x = b.home.x; b.y = b.home.y; }
    b.t = 0;
    particles.burst(s.cursor.x, s.cursor.y, { type: 'sparkle', count: 6 });
    snd('salon-clip', 'stamp');
  }
  removeBling(s, b) {
    const cl = s.client, i = cl.bling.indexOf(b);
    if (i < 0) return;
    cl.bling.splice(i, 1);
    if (s.held === b) s.held = null;
    if (s.hover === b) s.hover = null;
    const p = this.toScreen(s, b.x, b.y);
    particles.burst(p.x, p.y, { type: 'spark', count: 8, colors: [b.def.color, '#ffffff'] });
    sfx('pop');
  }

  spinChair(s) {
    s.cool = 1.0;
    s.client.spin();
    snd('salon-chair-spin', 'whoosh');
    later(() => { if (!this.finished) sfx('giggle'); }, 250);
    s.client.react('giggle', 1);
    s.stats.spins = (s.stats.spins || 0) + 1;
    const c = this.toScreen(s, 0, 0);
    particles.burst(c.x, c.y, { type: 'star', count: 4 });
    if (chance(0.35)) s.client.say(pick(['Wheee!', 'Again!', 'Hee hee!']), 1.2);
  }

  toggleReady(s) {
    s.ready = !s.ready; s.readyT = 0;
    if (s.ready) {
      sfx('ready');
      this.popAt(s, 'All done!', '#36d17a');
      s.client.react('happy', 1.5); s.client.say(pick(['Love it!', 'Yay!', 'Ooh!']), 1.5);
      s.char.playOnce('cheer', 0.7);
      const c = this.toScreen(s, 0, -40);
      particles.burst(c.x, c.y, { type: 'confetti', count: 24 });
    } else sfx('back');
  }

  // ---- CPU ---------------------------------------------------------------------
  makePlan(s) {
    const lvl = s.p.aiLevel || 0;
    const plan = [{ tool: 'brush', mode: 'all' }];
    const hair = s.client.hair;
    if (chance(0.7)) {
      plan.push({ tool: 'scissors', y: pick([70, 130, 190, 240]) });
      if (hair.avg('L', true) > 25 && chance(0.6)) plan.push({ tool: 'scissors', bangs: true });
    } else if (chance(0.7)) plan.push({ tool: 'grow' });
    if (chance(0.55)) plan.push({ tool: pick(['curl', 'curl', 'straight']), mode: 'all' });
    if (chance(0.92)) {
      const ci = pick([4, 5, 6, 7, 8, 1, 9, 10, 10, 3]);
      plan.push({ tool: 'colour', opt: ci, mode: ci === 10 ? 'streaks' : pick(['all', 'all', 'tips', 'streaks']) });
      if (chance(0.3)) plan.push({ tool: 'colour', opt: 11, mode: 'all' });
    }
    if (chance(0.65)) plan.push({ tool: 'style', opt: randInt(1, STYLES.length - 1) });
    const nb = randInt(1, 3), used = new Set();
    for (let k = 0; k < nb; k++) {
      let bi = randInt(0, BLING.length - 1);
      if (used.has(bi)) continue;
      used.add(bi);
      plan.push({ tool: 'bling', opt: bi, slot: k });
    }
    return { plan, si: 0, wait: rand(1.0, 2.2), btnT: 0, spd: [0.5, 0.72, 0.92][lvl], pause: [[1.2, 2.6], [0.8, 1.6], [0.5, 1.0]][lvl], step: null };
  }

  /** Path points (head units) for a CPU plan step. */
  planPoints(s, step) {
    const hair = s.client.hair, pts = [];
    const along = (st, from = 0, every = 5) => { const p = st.pts; for (let j = Math.floor(from) * 3; j < p.length; j += 3 * every) pts.push({ x: p[j], y: p[j + 1] }); const n = p.length; if (n) pts.push({ x: p[n - 3], y: p[n - 2] }); };
    const main = hair.main;
    switch (step.tool) {
      case 'brush': case 'curl': case 'straight': {
        for (let k = 1; k < main.length; k += 5) along(main[k], 0, 5);
        if (step.tool === 'brush') for (const x of [-60, 0, 60]) pts.push({ x, y: -HEAD_RY * 0.75 });
        break;
      }
      case 'colour': {
        if (step.mode === 'all') { for (let k = 1; k < main.length; k += 4) along(main[k], 0, 6); for (let x = -90; x <= 90; x += 45) pts.push({ x, y: hairlineY(x) - 20 }); }
        else if (step.mode === 'tips') { for (let k = 0; k < main.length; k += 2) { const n = main[k].pts.length / 3; along(main[k], n * 0.6, 3); } }
        else { const pick3 = shuffle(main.map((m, i) => i)).slice(0, 5).sort((a, b) => a - b); for (const i of pick3) along(main[i], 2, 3); }
        break;
      }
      case 'scissors': {
        if (step.bangs) { const y = hairlineY(0) + 18; for (let x = -100; x <= 100; x += 25) pts.push({ x, y }); }
        else { for (let x = -300; x <= 300; x += 30) pts.push({ x, y: step.y }); for (let x = 300; x >= -300; x -= 40) pts.push({ x, y: step.y + 12 }); }
        break;
      }
      case 'grow': {
        const picks = shuffle(main.slice()).slice(0, 6);
        for (const st of picks) { const tp = hair.tip(st); pts.push({ x: tp.x, y: tp.y + 10, hold: false }, { x: tp.x, y: tp.y + 70 }, { x: tp.x, y: tp.y + 140 }); }
        break;
      }
      case 'style': pts.push({ x: rand(-40, 40), y: rand(-20, 40) }); break;
      case 'bling': {
        const def = BLING[step.opt];
        const spots = [[-0.85, 1.12], [0.85, 1.12], [-1.25, 1.08], [0.5, 1.18], [-0.45, 1.18]];
        if (def.wide) pts.push({ x: 0, y: -HEAD_RY * 1.02 });
        else { const [a, r] = spots[(step.slot + randInt(0, 4)) % spots.length]; pts.push({ x: Math.sin(a) * HEAD_RX * r, y: -Math.cos(a) * HEAD_RY * r }); }
        break;
      }
      default: break;
    }
    return pts;
  }

  ai(s, dt) {
    const A = s.ai, c = s.p.ctrl;
    A.wait -= dt; A.btnT -= dt;
    c.hold('x', false);
    if (A.wait > 0) { c.move(0, 0); return; }
    const step = A.plan[A.si];
    if (!step) {
      // Done: d-pad right along to the Done slot, A there, then admire the look.
      c.move(0, 0);
      if (!s.ready && A.btnT <= 0) { c.press(s.tool === DONE ? 'a' : 'right'); A.btnT = rand(0.22, 0.4) / A.spd; }
      return;
    }
    const ti = TOOL_IDX[step.tool], N = TOOLS.length + 1;
    if (s.tool !== ti) {
      c.move(0, 0);
      if (A.btnT <= 0) { const fwd = (ti - s.tool + N) % N; c.press(fwd <= N / 2 ? 'right' : 'left'); A.btnT = rand(0.22, 0.4) / A.spd; }
      return;
    }
    if (step.opt !== undefined && s.opt[step.tool] !== step.opt) {
      c.move(0, 0);
      if (A.btnT <= 0) { const n = OPTIONS[step.tool].list.length, fwd = (step.opt - s.opt[step.tool] + n) % n; c.press(fwd <= n / 2 ? 'down' : 'up'); A.btnT = rand(0.18, 0.32) / A.spd; }
      return;
    }
    if (!step.pts) { step.pts = this.planPoints(s, step); step.k = 0; step.t = 0; }
    step.t += dt;
    if (step.t > 18 / A.spd) { this.endStep(s); return; }
    const target = step.pts[step.k];
    if (!target) { this.endStep(s); return; }
    const tp = this.toScreen(s, target.x, target.y);
    const sc = s.stage;
    tp.x = clamp(tp.x, sc.x + 26, sc.x + sc.w - 26); tp.y = clamp(tp.y, sc.y + 22, sc.y + sc.h - 18);
    const dx = tp.x - s.cursor.x, dy = tp.y - s.cursor.y, d = Math.hypot(dx, dy);
    const tap = step.tool === 'style' || step.tool === 'bling';
    const slow = step.tool === 'grow' ? 0.45 : 1;
    if (d < 14) {
      if (tap) { c.press(chance(0.5) ? 'a' : 'x'); this.endStep(s); c.move(0, 0); return; }
      step.k++;
      if (step.k >= step.pts.length) { this.endStep(s); return; }
    }
    const m = Math.min(1, d / (50 * s.k + 10)) * A.spd * slow;
    c.move((dx / (d || 1)) * m, (dy / (d || 1)) * m);
    if (!tap && step.k >= 1 && target.hold !== false) c.hold('x', true);
  }

  endStep(s) {
    const A = s.ai, step = A.plan[A.si];
    s.p.ctrl.hold('x', false);
    // brushing again if it's still quite messy
    if (step && step.tool === 'brush' && !step.again && s.client.hair.avg('messy') > 0.3) { step.again = true; step.pts = null; return; }
    A.si++;
    A.wait = rand(...A.pause);
  }

  // ---- reveal ------------------------------------------------------------------
  startReveal() {
    if (this.phase !== 'style') return;
    this.phase = 'reveal'; this.phaseT = 0;
    this.banner = { text: 'Mirror time!', t: 0 };
    sfx('drumroll');
    this.stations.forEach((s, i) => {
      s.revealT = -i * 0.15; s.held = null; s.working = false;
      s.p.ctrl.hold && s.p.isAI && s.p.ctrl.hold('x', false);
    });
  }

  updateReveal(s, dt) {
    const before = s.revealT;
    s.revealT += dt;
    const t = s.revealT, cl = s.client;
    if (before < 0.9 && t >= 0.9) { cl.react('wow', 1.0); cl.pop(0.3); sfx('sparkle', { vol: 0.6 }); }
    if (before < 1.8 && t >= 1.8) {
      cl.react('happy', 3); cl.pop(0.25);
      cl.say(pick(['I love it!', 'So pretty!', 'Wow, is that me?', 'Amazing!', 'Best hair ever!']), 2.4);
      const c = this.toScreen(s, 0, -20);
      particles.burst(c.x, c.y, { type: 'heart', count: 10 });
      particles.burst(c.x, c.y, { type: 'confetti', count: 30 });
      s.char.playOnce('celebrate', 2.2);
      voice(s.p.charId, 'yay');
      if (s.i === 0) { snd('salon-tada', 'fanfare'); fx.flash('#fff6fb', 0.2); }
    }
    cl.update(dt, 0.6, 0.1);
    this.updateStylist(s, dt);
  }

  // ---- showcase ---------------------------------------------------------------
  startShow() {
    if (this.phase === 'show') return;
    this.phase = 'show'; this.phaseT = 0;
    this.snips = [];
    const n = this.n;
    const slot = Math.min(640, 1760 / n);
    const k = Math.min(0.92, slot / 560);
    this.showK = k;
    this.stations.forEach((s, i) => {
      s.sx = W / 2 + (i - (n - 1) / 2) * slot;
      s.sy = 790 - 400 * k;
      s.sk = k; s.sres = k * 1.6;
      const a = s.char;
      a.scale = clamp((n > 5 ? 150 : 185) / a.leader.h, 0.4, 1.3);
      const side = n === 1 ? 1 : i < n / 2 ? -1 : 1;
      a.x = n > 4 ? s.sx : clamp(s.sx + side * (235 * k + 40), 100, W - 100); a.y = 930 + (n > 4 ? (i % 2) * 40 : 0); a.z = 0;
      a.facing = a.x < W / 2 ? 1 : -1;
      a.snap(); a.setPose('wave'); s.homeX = a.x;
      s.vz = 0; s.poseCD = 0;
      s.client.bubble = null;
    });
    this.shotIdx = 0; this.shotT = 0; this.cheeseT = -1; this.photo = null;
    this.banner = { text: 'Photo time!', t: 0 };
    snd('applause', 'cheer');
  }

  updateShow(dt) {
    const cam = this.api.camera;
    for (const s of this.stations) s.client.update(dt, Math.sin(this.t + s.i) * 0.5, 0.2);
    if (this.phaseT < 1.2) { for (const s of this.stations) s.char.update(dt); return; }
    if (this.shotIdx < this.n) {
      const s = this.stations[this.shotIdx];
      this.shotT += dt;
      const zoom = clamp((H * 0.62) / (760 * s.sk), 1, Math.min(2.1, cam.maxZoom));
      cam.follow(s.sx, s.sy + 70 * s.sk, zoom, 5);
      if (!s.shown && this.shotT > 0.35) {
        s.shown = true;
        s.look = this.lookName(s);
        s.client.react(pick(['happy', 'wow']), 1.2); s.client.pop(0.25);
        particles.burst(s.sx, s.sy - 120 * s.sk, { type: 'sparkle', count: 12 });
        s.char.playOnce(pick(['cheer', 'pose-twirl', 'strike3']), 1.0);
        snd('camera-flash', 'shutter', { vol: 0.6 }); fx.flash('#ffffff', 0.15);
      }
      if (this.shotT > SHOT_T * (this.n > 5 ? 0.8 : 1)) { this.shotIdx++; this.shotT = 0; }
      for (const s2 of this.stations) s2.char.update(dt);
      return;
    }
    if (this.cheeseT < 0) {
      this.cheeseT = 0;
      cam.follow(W / 2, H / 2, 1, 3);
      this.banner = { text: 'Say cheese!', t: 0 };
      sfx('giggle');
    }
    const c0 = this.cheeseT;
    this.cheeseT += dt;
    for (const d of [3, 2, 1]) if (c0 < CHEESE_T - d && this.cheeseT >= CHEESE_T - d) sfx(d === 1 ? 'tock' : 'tick');
    for (const s of this.stations) {
      if (!this.photo) this.cheeseMove(s, dt);
      else { s.vz -= 2800 * dt; s.char.z = Math.max(0, s.char.z + s.vz * dt); if (s.char.z <= 0) s.vz = 0; }
      if (chance(dt * 0.4)) s.client.react(pick(['happy', 'giggle', 'wow']), 0.8);
      s.char.update(dt);
    }
    if (this.cheeseT >= CHEESE_T && !this.photo) {
      this.photo = { img: this.renderPhoto(), t: 0 };
      snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.45);
      later(() => { if (!this.finished) { particles.confettiRain(W, 150); snd('applause', 'cheer'); sfx('yay'); } }, 350);
    }
    if (this.photo) {
      this.photo.t += dt;
      if (this.photo.t > PHOTO_T || (this.photo.t > 1.5 && this.players.some((p) => !p.isAI && p.ctrl.pressed('a')))) this.finishGame();
    }
  }

  cheeseMove(s, dt) {
    const a = s.char, c = s.p.ctrl;
    s.poseCD = Math.max(0, s.poseCD - dt);
    let { x: mx, y: my } = photoMove(c), jump = c.pressed('a'), pose = photoPosePressed(c);
    if (s.p.isAI) {
      s.aiT = (s.aiT ?? rand(0.2, 0.8)) - dt;
      if (s.aiT <= 0) { s.aiT = rand(0.5, 1.3); s.aiM = chance(0.4) ? [rand(-0.8, 0.8), rand(-0.4, 0.4)] : [0, 0]; if (chance(0.35)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      [mx, my] = s.aiM || [0, 0];
      if (Math.abs(a.x - (s.homeX ?? s.sx)) > 150) mx = Math.sign((s.homeX ?? s.sx) - a.x) * 0.6;
    }
    const d = Math.hypot(mx, my); if (d > 1) { mx /= d; my /= d; }
    const sp = 460;
    a.x = clamp(a.x + mx * sp * dt, 90, W - 90);
    a.y = clamp(a.y + my * sp * 0.6 * dt, 880, 1010);
    if (jump && a.z <= 0) { s.vz = 980; snd('boing', 'jump', { vol: 0.35 }); a.squash(-0.25); }
    s.vz -= 2800 * dt; a.z = Math.max(0, a.z + s.vz * dt);
    if (a.z <= 0 && s.vz < 0) { if (s.vz < -200) a.squash(0.2); s.vz = 0; }
    if (pose && s.poseCD <= 0) { s.poseCD = 0.35; strikePhotoPose(a, pose, { onBump: (who) => this.bump(s, who) }); }
    if (a.z > 0) { if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1; if (!a._once) a.setPose('jump'); }
    else a.moveAnim(mx * sp, my * sp, sp);
  }

  bump(s, a) {
    for (const o of this.stations) {
      if (o === s) continue;
      const b = o.char, dx = b.x - a.x;
      if (Math.abs(dx) < (a.width + b.width) * 0.45 && Math.abs(b.y - a.y) < 60) {
        b.x = clamp(b.x + Math.sign(dx || 1) * 70, 90, W - 90);
        b.playOnce('surprised', 0.8, 'idle'); b.squash(0.2); o.vz = Math.max(o.vz, 300);
      }
    }
    snd('boing', 'bounce', { vol: 0.4 });
  }

  lookName(s) {
    const hair = s.client.hair, sh = hair.colourShare();
    let colour = '';
    if (sh.rainbow > 0.12) colour = 'Rainbow';
    else {
      const hc = HAIR_COLORS.find((c) => c.c === sh.best);
      colour = hc && sh.best !== s.client.natural ? hc.word : '';
    }
    const sparkly = sh.glit > 0.2 ? 'Sparkly' : '';
    const L = hair.avg('L'), curl = hair.avg('curl');
    const style = { ponytail: 'Ponytail', pigtails: 'Pigtails', bun: 'Bun', spacebuns: 'Space Buns', braid: 'Braid' }[hair.style]
      || (L < 70 ? 'Pixie' : curl > 0.6 ? 'Curls' : L > 430 ? 'Waterfall' : curl < 0.1 && hair.avg('messy') < 0.2 ? 'Silk' : 'Waves');
    const royal = s.client.bling.some((b) => b.def.wide) ? 'Princess' : '';
    const words = [royal, sparkly || colour, style].filter(Boolean);
    if (words.length < 2) words.unshift(pick(['Super', 'Fancy', 'Dreamy', 'Happy']));
    return words.slice(0, 3).join(' ') + '!';
  }

  renderPhoto() {
    const w = 1040, h = 585, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const zoom = 1.12, k = w / (W / zoom);
    g.setTransform(k, 0, 0, k, w / 2 - (W / 2) * k, h / 2 - 600 * k);
    try { this.drawShowWorld(g, { photo: true }); } catch (e) { console.warn(e); }
    return c;
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((s) => {
      const parts = [];
      if (s.stats.snips) parts.push(`${s.stats.snips} snip${s.stats.snips === 1 ? '' : 's'}`);
      if (s.stats.colours.size) parts.push(`${s.stats.colours.size} colour${s.stats.colours.size === 1 ? '' : 's'}`);
      if (s.client.bling.length) parts.push(`${s.client.bling.length} bling`);
      if (!parts.length) parts.push(s.look || 'Natural look!');
      return (this.n > 4 ? parts.slice(0, 2) : parts).join(' · ');
    });
    this.api.finishTogether({ stats, title: 'Fabulous hair!', focus: { x: W / 2, y: 520, zoom: 1.08 } });
  }

  onDone() {
    if (this.phase === 'style') this.startReveal();
    else if (this.phase === 'reveal') this.startShow();
    else if (this.cheeseT >= 0 && !this.photo) this.cheeseT = Math.max(this.cheeseT, CHEESE_T - 0.5);
    else if (this.phase === 'show' && this.cheeseT < 0) this.shotIdx = this.n;
    else this.finishGame();
  }

  destroy() {}
}
