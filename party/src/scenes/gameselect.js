import { drawArt } from '../engine/art.js';
// Game select: Party Games and Play Studio shelves, a details panel, a
// Random roulette and Party Marathon (5 random party games + trophy).
// Any human can drive the shared cursor.
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, host } from '../engine/audio.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import * as ui from '../engine/ui.js';
import { drawEmote } from '../engine/emotes.js';
import { GAMES, PARTY_PAGES, STUDIO_PAGES, MOLLY_GAMES } from '../games/index.js';
import { session, restoreRoster, setMollyLevel, mollyEasy } from '../state.js';
import { drawGameIcon } from './common.js';
import { shuffle, pick, ease, clamp } from '../engine/util.js';

const TILE_W = 196, TILE_H = 138, GAP = 16, X0 = 50;
const PANEL_X = 1340;

// Party Games and Play Studio each have two pages of 11; the last tile of a
// shelf ("More Games" / "More Play") flips between its pages.
const SHELVES = { party: PARTY_PAGES, studio: STUDIO_PAGES };
const SHELF_LABEL = { party: 'More Games', studio: 'More Play' };
const SHELF_COLOR = { party: ['#ff7ab8', '#ff4d6d'], studio: ['#b48cff', '#9b5cff'] };
/** { shelf, page } of a game, or null. */
function pageOf(id) {
  for (const [shelf, pages] of Object.entries(SHELVES)) {
    const page = pages.findIndex((pg) => pg.some((g) => g.id === id));
    if (page >= 0) return { shelf, page };
  }
  return null;
}

const chunk = (list, n) => { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; };
const MOLLY_PINK = '#ff7ad9', MOLLY_DEEP = '#c94fd6';

/** Molly games on the shelf: in Easy, games that need the stick (meta.easy === false) are hidden. */
const mollyList = () => MOLLY_GAMES.filter((g) => session.mollyLevel !== 'easy' || g.easy !== false);

/** Molly Party view: every Molly game, then random / marathon / back to Charlie Party. */
function buildMollyRows() {
  const rows = chunk(mollyList().map((g) => ({ kind: 'game', game: g, shelf: 'molly' })), 6);
  rows.partyRows = rows.length; rows.studioRows = 0; rows.molly = true;
  rows.push([{ kind: 'random' }, { kind: 'marathon' }, { kind: 'charlie', wide: true }]);
  return rows;
}

function buildRows(pages) {
  const rows = [];
  for (const shelf of ['party', 'studio']) {
    if (shelf === 'studio') rows.partyRows = rows.length;
    const list = SHELVES[shelf][pages[shelf]].map((g) => ({ kind: 'game', game: g, shelf }));
    if (SHELVES[shelf].length > 1) list.push({ kind: 'more', shelf });
    chunk(list, 6).forEach((r) => rows.push(r));
  }
  rows.studioRows = rows.length - rows.partyRows;
  rows.push([{ kind: 'random' }, { kind: 'marathon' }, { kind: 'molly', wide: true }]);
  return rows;
}

export class GameSelectScene {
  constructor() { this.pages = { party: 0, studio: 0 }; this.molly = false; this.rows = buildRows(this.pages); this.row = 0; this.col = 0; }

  rebuild() { this.rows = this.molly ? buildMollyRows() : buildRows(this.pages); this.layout(); }
  setPage(shelf, page) {
    this.pages = { ...this.pages, [shelf]: page };
    this.rebuild();
  }
  /** Switch between Charlie Party (the usual shelves) and Molly Party; the cursor lands on the switch tile. */
  setMolly(on, { focus = true } = {}) {
    if (this.molly === on) return;
    this.molly = on;
    this.menuMusic();
    if (!on) this.pages = { ...this.pages, party: 0 };   // the Molly tile lives on page 1
    this.rebuild();
    if (focus) this.rows.forEach((r, ri) => r.forEach((it, ci) => { if (it.kind === (on ? 'charlie' : 'molly')) { this.row = ri; this.col = ci; } }));
    this.row = Math.min(this.row, this.rows.length - 1); this.col = Math.min(this.col, this.rows[this.row].length - 1);
  }
  /** Charlie's menu music, or Molly Party's song on the Molly shelf. */
  menuMusic() { if (this.molly) music.molly(); else music.menu(); }
  /** Show the shelf/page holding game `id`. */
  showGame(id) {
    const g = GAMES.find((x) => x.id === id);
    if (g) this.setMolly(g.category === 'molly', { focus: false });
    const at = pageOf(id);
    if (at && this.pages[at.shelf] !== at.page) this.setPage(at.shelf, at.page);
  }

  /** show: a game to put the cursor on (backing out of its how-to screen); default the last game played. */
  enter({ show = null } = {}) {
    restoreRoster();
    this.t = 0;
    this.roulette = null;
    this.chosen = null;
    session.partyMode = null;
    const focusId = show || session.lastGameId;
    if (focusId) this.showGame(focusId);
    this.menuMusic();
    this.layout();
    if (focusId) {
      this.rows.forEach((r, ri) => r.forEach((it, ci) => { if (it.game && it.game.id === focusId) { this.row = ri; this.col = ci; } }));
    }
  }

  layout() {
    // Positions for every item, with section headers.
    let y = 168;
    this.rows.forEach((r, ri) => {
      if (ri === this.rows.partyRows && !this.rows.molly) y += 52; // studio header gap
      if (ri === this.rows.length - 1) y += 18;
      r.forEach((it, ci) => {
        if (!it.wide && (it.kind === 'game' || it.kind === 'more')) Object.assign(it, { x: X0 + ci * (TILE_W + GAP), y, w: TILE_W, h: TILE_H });
        else Object.assign(it, { x: X0 + ci * (2 * TILE_W + 2 * GAP), y, w: 2 * TILE_W + GAP, h: 110 });   // Random / Marathon / Molly Party buttons
      });
      y += (ri === this.rows.length - 1 ? 110 : TILE_H) + GAP;
    });
    this.studioHeaderY = this.rows.molly ? -100 : this.rows[this.rows.partyRows][0].y - 34;
  }

  get current() { return this.rows[this.row][this.col]; }

  move(dx, dy) {
    if (dy) {
      const cur = this.current;
      const cx = cur.x + cur.w / 2;
      this.row = clamp(this.row + dy, 0, this.rows.length - 1);
      // pick the item in the new row closest horizontally
      let best = 0, bd = Infinity;
      this.rows[this.row].forEach((it, i) => { const d = Math.abs(it.x + it.w / 2 - cx); if (d < bd) { bd = d; best = i; } });
      this.col = best;
    }
    if (dx) this.col = (this.col + dx + this.rows[this.row].length) % this.rows[this.row].length;
    sfx('move');
  }

  update(dt, inputOpen) {
    this.t += dt;
    if (this.flip) { this.flip.t += dt; if (this.flip.t > 0.6) this.flip = null; }
    if (this.roulette) { this.updateRoulette(dt); return; }
    if (this.chosen) { this.chosen.t += dt; if (this.chosen.t > 0.7) this.launch(); return; }
    if (!inputOpen) return;
    // Joined humans drive the cursor; if all their pads dropped (battery, re-pair
    // to a new slot) fall back to any controller so the menu never locks up.
    const live = new Set(input.humans());
    const humans = session.players.filter((p) => !p.isAI && live.has(p.ctrl)).map((p) => p.ctrl);
    const ctrls = humans.length ? humans : [...live];
    for (const c of ctrls) {
      if (c.nav.x || c.nav.y) this.move(c.nav.x, c.nav.y);
      if (c.pressed('a')) { this.choose(); return; }
      if (this.molly && c.pressed('y')) { this.toggleMollyLevel(); return; }
      if (c.pressed('b')) {
        if (this.molly) { this.setMolly(false); this.flip = { t: 0, shelf: 'all' }; sfx('swap'); return; }   // back to Charlie Party first
        sfx('back'); this.manager.go('charselect'); return;
      }
    }
    // Mouse / touch: hovering a tile selects it, clicking plays it, and the
    // footer hints click like their buttons.
    for (const [ri, row] of this.rows.entries()) {
      for (const [ci, it] of row.entries()) {
        const sel = ri === this.row && ci === this.col;
        if (input.clicked(it)) { this.row = ri; this.col = ci; this.choose(); return; }
        if (input.pointer.moved && !sel && input.pointerOver(it)) { this.row = ri; this.col = ci; sfx('move'); }
      }
    }
    if (this.molly && this.levelRect && input.clicked(this.levelRect)) { this.toggleMollyLevel(); return; }
    const hint = ui.clickedHint();
    if (hint && ctrls[0]) ctrls[0].inject(hint);
    if (new URLSearchParams(location.search).has('autoselect') && this.t > 1) this.choose();
  }

  choose() {
    const it = this.current;
    if (it.kind === 'game') { this.chosen = { id: it.game.id, t: 0 }; sfx('select'); this.burst(it); }
    else if (it.kind === 'more') this.flipPage(it.shelf);
    else if (it.kind === 'molly' || it.kind === 'charlie') {
      this.setMolly(it.kind === 'molly');
      this.flip = { t: 0, shelf: 'all' };
      sfx('swap'); sfx('magic');
      const cur = this.current;
      particles.burst(cur.x + cur.w / 2, cur.y + cur.h / 2, { type: 'star', count: 18 });
    }
    else if (it.kind === 'random' && this.molly) this.startRoulette(mollyList().map((g) => g.id), false);
    else if (it.kind === 'marathon' && this.molly) this.startRoulette(shuffle(mollyList().map((g) => g.id)).slice(0, 5), true);
    else if (it.kind === 'random') this.startRoulette(GAMES.filter((g) => g.category !== 'molly' && pageOf(g.id)).map((g) => g.id), false);
    else if (it.kind === 'marathon') this.startRoulette(shuffle(PARTY_PAGES.flat().map((g) => g.id)).slice(0, 5), true);
  }

  /** "More Games" / "More Play": swap the other page of that shelf in; the cursor stays on the tile. */
  flipPage(shelf) {
    this.setPage(shelf, 1 - this.pages[shelf]);
    this.rows.forEach((r, ri) => r.forEach((it, ci) => { if (it.kind === 'more' && it.shelf === shelf) { this.row = ri; this.col = ci; } }));
    this.flip = { t: 0, shelf };
    sfx('swap'); sfx('whoosh', { vol: 0.5 });
    const it = this.current;
    particles.burst(it.x + it.w / 2, it.y + it.h / 2, { type: 'sparkle', count: 14 });
  }

  burst(it) {
    particles.burst(it.x + it.w / 2, it.y + it.h / 2, { type: 'star', count: 16 });
    fx.flash('#ffffff', 0.15);
  }

  startRoulette(pool, marathon) {
    if (!pool.length) { sfx('error'); return; }
    sfx('drumroll');
    if (marathon) { sfx('jingle/marathon-start'); host('marathon'); } else host('random');
    const fresh = pool.filter((id) => id !== session.lastGameId);
    const target = marathon ? pool[0] : pick(fresh.length ? fresh : pool);
    this.showGame(target);
    const tiles = this.rows.flat().filter((it) => it.kind === 'game');
    this.roulette = { t: 0, hop: 0, nextHop: 0.05, tiles, target, marathon, pool, landed: false, idx: Math.floor(Math.random() * tiles.length) };
  }

  updateRoulette(dt) {
    const r = this.roulette;
    r.t += dt;
    if (!r.landed) {
      r.nextHop -= dt;
      if (r.nextHop <= 0) {
        r.hop++;
        r.idx = (r.idx + 1 + Math.floor(Math.random() * 3)) % r.tiles.length;
        const interval = 0.05 + Math.pow(r.t / 2.4, 2) * 0.35;
        r.nextHop = interval;
        if (r.t > 2.4) { r.idx = r.tiles.findIndex((it) => it.game.id === r.target); r.landed = true; r.landT = 0; sfx('fanfare'); this.burst(r.tiles[r.idx]); }
        else sfx('tick');
      }
    } else {
      r.landT += dt;
      if (r.landT > 1.3) {
        if (r.marathon) session.partyMode = { games: r.pool, round: 0, startStars: session.players.map((p) => p.stars) };
        this.chosen = { id: r.target, t: 0.7 };
        this.roulette = null;
        this.launch();
      }
    }
  }

  launch() {
    const id = this.chosen.id;
    this.chosen = null;
    this.manager.go('intro', { gameId: id });
  }

  exit() { this.roulette = null; this.chosen = null; }

  draw(g) {
    ui.partyBackdrop(g, this.t, '#ffcf8f', '#ffdba8');
    drawArt(g, 'bg/menu', 0, 0, W, H, { anchor: 'topleft', fit: 'cover' });
    if (this.molly) { g.fillStyle = 'rgba(255,170,230,0.28)'; g.fillRect(0, 0, W, H); }   // Molly Party: a pinker room
    // Star tally.
    ui.scoreboard(g, session.players, session.players.map((p) => p.stars), { y: 18, format: (v) => `★ ${v}`, highlight: this.leaders() });
    // Section headers.
    if (this.molly) {
      ui.text(g, '✿ Sister Party ✿', X0 + 8, 142, { size: 46, align: 'left', color: MOLLY_PINK });
      this.drawMollyLevel(g);
    }
    else {
      ui.text(g, 'Party Games', X0 + 8, 142, { size: 40, align: 'left', color: '#ff4d6d' });
      ui.text(g, 'Play Studio', X0 + 8, this.studioHeaderY, { size: 40, align: 'left', color: '#9b5cff' });
    }
    for (const [shelf, hy, hx] of this.molly ? [] : [['party', 132, 318], ['studio', this.studioHeaderY - 10, 290]]) {   // page dots
      const pages = SHELVES[shelf], cur = this.pages[shelf];
      if (pages.length < 2) continue;
      for (let i = 0; i < pages.length; i++) {
        g.beginPath(); g.arc(X0 + hx + i * 30, hy, i === cur ? 10 : 7, 0, Math.PI * 2);
        g.fillStyle = i === cur ? SHELF_COLOR[shelf][1] : 'rgba(36,22,63,0.25)'; g.fill();
        if (i === cur) { g.lineWidth = 3; g.strokeStyle = '#24163f'; g.stroke(); }
      }
    }
    const played = new Set(session.played);
    const rIdx = this.roulette ? this.roulette.tiles[this.roulette.idx] : null;
    for (const [ri, row] of this.rows.entries()) {
      for (const [ci, it] of row.entries()) {
        const sel = this.roulette ? it === rIdx : (ri === this.row && ci === this.col);
        const bounce = sel ? 1.06 + Math.sin(this.t * 6) * 0.015 : 1;
        // party tiles pop in one after another when the page flips
        const inShelf = this.flip && (this.flip.shelf === 'all' ? ri < this.rows.length - 1 : this.flip.shelf === 'party' ? ri < this.rows.partyRows : ri >= this.rows.partyRows && ri < this.rows.length - 1);
        const pop = inShelf ? ease.outBack(clamp((this.flip.t - ((ri % 2) * 6 + ci) * 0.025) / 0.25, 0, 1)) : 1;
        g.save();
        g.translate(it.x + it.w / 2, it.y + it.h / 2); g.scale(bounce * pop, bounce * pop); g.translate(-it.w / 2, -it.h / 2);
        if (it.kind === 'more') this.drawMoreTile(g, it, sel);
        else if (it.kind === 'molly' || it.kind === 'charlie') this.drawSwitchButton(g, it, sel);
        else if (it.kind === 'game') {
          ui.panel(g, 0, 0, it.w, it.h, { r: 18, fill: '#fff', stroke: sel ? '#ffd23f' : '#24163f', lineWidth: sel ? 9 : 5 });
          drawGameIcon(g, it.game, 5, 5, it.w - 10, it.h - 10, sel ? this.t : 0);
          if (played.has(it.game.id)) {
            ui.panel(g, it.w - 44, -10, 48, 40, { r: 18, fill: '#36d17a', lineWidth: 3, shadow: false });
            ui.text(g, '✓', it.w - 20, 10, { size: 28, strokeWidth: 4 });
          }
        } else {
          const random = it.kind === 'random';
          ui.panel(g, 0, 0, it.w, it.h, { r: 55, fill: random ? '#3fa7ff' : this.molly ? MOLLY_DEEP : '#9b5cff', stroke: sel ? '#ffd23f' : '#24163f', lineWidth: sel ? 9 : 6 });
          drawEmote(g, random ? 'question' : 'star', 56, it.h / 2, 56, this.t);
          ui.text(g, random ? 'Random!' : 'Marathon', it.w / 2 + 34, it.h / 2 - (random ? 0 : 12), { size: 44, weight: 800, maxWidth: it.w - 120 });
          if (!random) ui.text(g, '5 games + a trophy', it.w / 2 + 34, it.h / 2 + 30, { size: 22, strokeWidth: 5, maxWidth: it.w - 120 });
        }
        g.restore();
      }
    }
    this.drawDetails(g);
    ui.hints(g, [['a', 'Play'], ['b', this.molly ? 'Charlie Party' : 'Characters']], PANEL_X + 115, 1046, { size: 30 });   // left of the corner buttons
    if (this.roulette && this.roulette.landed) {
      ui.banner(g, this.roulette.marathon ? 'Party Marathon!' : 'Let\'s play!', this.roulette.landT, { y: 560, size: 120 });
    }
  }

  toggleMollyLevel() {
    setMollyLevel(session.mollyLevel === 'easy' ? 'medium' : 'easy');
    this.levelPop = 1; sfx('swap');
    const cur = this.current && this.current.game;
    this.rebuild();   // Easy hides the stick-only games
    this.row = Math.min(this.row, this.rows.length - 1); this.col = Math.min(this.col, this.rows[this.row].length - 1);
    if (cur) this.rows.forEach((r, ri) => r.forEach((it, ci) => { if (it.game === cur) { this.row = ri; this.col = ci; } }));
  }

  /** Molly level pill beside the shelf title: Easy (just A) / Medium (Y or click to change). */
  drawMollyLevel(g) {
    const easy = session.mollyLevel === 'easy', x = 520, y = 106, w = 420, h = 52;
    this.levelPop = Math.max(0, (this.levelPop || 0) - 0.05);
    const k = 1 + this.levelPop * 0.12;
    g.save(); g.translate(x + w / 2, y + h / 2); g.scale(k, k);
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 28, fill: easy ? '#7fe0b4' : '#ffcf5c', lineWidth: 4, shadow: false });
    ui.text(g, easy ? 'Easy: just the A button' : 'Medium: stick + buttons', 22, 2, { size: 26, color: '#24163f', stroke: false, weight: 800, maxWidth: w - 90 });
    ui.glyph(g, 'y', -w / 2 + 32, 0, 38);
    g.restore();
    this.levelRect = { x, y, w, h };
  }

  /** "Sister Party" (the Molly shelf) / "Charlie Party" (back) button after Marathon: a peek at the other world's games. */
  drawSwitchButton(g, it, sel) {
    const toMolly = it.kind === 'molly';
    const gr = g.createLinearGradient(0, 0, it.w, it.h);
    gr.addColorStop(0, toMolly ? '#ffb3ec' : '#ffcf8f'); gr.addColorStop(1, toMolly ? '#b98bff' : '#ff7ab8');
    ui.panel(g, 0, 0, it.w, it.h, { r: 55, fill: gr, stroke: sel ? '#ffd23f' : '#24163f', lineWidth: sel ? 9 : 6 });
    const peek = toMolly ? MOLLY_GAMES : PARTY_PAGES[0];
    const mw = 52, mh = 36;
    peek.slice(0, 3).forEach((m, i) => {
      const x = 30 + (i % 2) * 34, y = 14 + i * 26 + Math.sin(this.t * 3 + i) * (sel ? 3 : 0);
      g.save(); g.translate(x + mw / 2, y + mh / 2); g.rotate((i - 1) * 0.14); g.translate(-mw / 2, -mh / 2);
      ui.panel(g, 0, 0, mw, mh, { r: 7, fill: '#fff', lineWidth: 3, shadow: false });
      drawGameIcon(g, m, 2, 2, mw - 4, mh - 4, 0);
      g.restore();
    });
    ui.text(g, toMolly ? 'Sister Party' : 'Charlie Party', it.w / 2 + 60, it.h / 2 - 12, { size: 40, weight: 800, maxWidth: it.w - 150 });
    ui.text(g, toMolly ? '✿ Games for fun ✿' : '◀ back to the big party', it.w / 2 + 60 + Math.sin(this.t * 5) * (sel ? 4 : 0), it.h / 2 + 30, { size: 20, color: '#fff6a8', strokeWidth: 5, maxWidth: it.w - 150 });
  }

  /** The "More Games" / "More Play" tile: a peek at the other page's games. */
  drawMoreTile(g, it, sel) {
    ui.panel(g, 0, 0, it.w, it.h, { r: 18, fill: SHELF_COLOR[it.shelf][0], stroke: sel ? '#ffd23f' : '#24163f', lineWidth: sel ? 9 : 5 });
    const page = this.pages[it.shelf], other = SHELVES[it.shelf][1 - page];
    const mw = 52, mh = 36;
    other.slice(0, 3).forEach((m, i) => {
      const x = 14 + i * (mw + 8), y = 12 + Math.sin(this.t * 3 + i) * (sel ? 3 : 0);
      g.save(); g.translate(x + mw / 2, y + mh / 2); g.rotate((i - 1) * 0.12); g.translate(-mw / 2, -mh / 2);
      ui.panel(g, 0, 0, mw, mh, { r: 7, fill: '#fff', lineWidth: 3, shadow: false });
      drawGameIcon(g, m, 2, 2, mw - 4, mh - 4, 0);
      g.restore();
    });
    ui.text(g, SHELF_LABEL[it.shelf], it.w / 2, 82, { size: 30, weight: 800, maxWidth: it.w - 16 });
    const ax = it.w / 2 + Math.sin(this.t * 5) * (sel ? 6 : 0);
    ui.text(g, page === 0 ? '▶ ▶' : '◀ ◀', ax, 116, { size: 22, color: '#fff6a8', strokeWidth: 5 });
  }

  leaders() {
    const max = Math.max(...session.players.map((p) => p.stars));
    return session.players.map((p) => max > 0 && p.stars === max);
  }

  drawDetails(g) {
    const it = this.roulette ? this.roulette.tiles[this.roulette.idx] : this.current;
    const x = PANEL_X, y = 130, w = 540, h = 836;   // ends above the corner buttons (bottom-right)
    ui.panel(g, x, y, w, h, { fill: '#fff8ec' });
    if (it.kind === 'molly' || it.kind === 'charlie') {
      const toMolly = it.kind === 'molly', list = toMolly ? MOLLY_GAMES : PARTY_PAGES[0];
      ui.text(g, toMolly ? 'Sister Party!' : 'Charlie Party!', x + w / 2, y + 70, { size: 60, color: toMolly ? MOLLY_PINK : '#ff4d6d' });
      const lines = toMolly ? ['Simple, silly games', 'for little ones!'] : ['Back to the', 'big kids\' games!'];
      for (const [i, line] of lines.entries()) ui.text(g, line, x + w / 2, y + 140 + i * 44, { size: 34, color: '#24163f', stroke: false, weight: 700 });
      const cols = 3, tw = 150, th = 100, gx = 18, gy = 16, x0 = x + (w - (cols * tw + (cols - 1) * gx)) / 2;
      list.forEach((m, i) => {
        const cx = x0 + (i % cols) * (tw + gx), cy = y + 250 + Math.floor(i / cols) * (th + gy);
        if (cy + th > y + h - 60) return;
        ui.panel(g, cx, cy, tw, th, { r: 14, fill: '#fff', lineWidth: 4, shadow: false });
        drawGameIcon(g, m, cx + 4, cy + 4, tw - 8, th - 8, this.t);
      });
      if (!list.length) ui.text(g, '(coming soon!)', x + w / 2, y + 320, { size: 34, color: '#6b5a85', stroke: false });
    } else if (it.kind === 'more') {
      const page = this.pages[it.shelf];
      ui.text(g, SHELF_LABEL[it.shelf] + '!', x + w / 2, y + 70, { size: 60, color: SHELF_COLOR[it.shelf][1] });
      for (const [i, line] of [page === 0 ? 'Swap in a whole new' : 'Back to the first', it.shelf === 'party' ? 'page of party games!' : 'page of Play Studio!'].entries()) ui.text(g, line, x + w / 2, y + 140 + i * 44, { size: 34, color: '#24163f', stroke: false, weight: 700 });
      const other = SHELVES[it.shelf][1 - page];
      const cols = 3, tw = 150, th = 100, gx = 18, gy = 16, x0 = x + (w - (cols * tw + (cols - 1) * gx)) / 2;
      other.forEach((m, i) => {
        const cx = x0 + (i % cols) * (tw + gx), cy = y + 250 + Math.floor(i / cols) * (th + gy);
        if (cy + th > y + h - 60) return;
        ui.panel(g, cx, cy, tw, th, { r: 14, fill: '#fff', lineWidth: 4, shadow: false });
        drawGameIcon(g, m, cx + 4, cy + 4, tw - 8, th - 8, this.t);
      });
    } else if (it.kind === 'game') {
      const m = it.game;
      ui.panel(g, x + 20, y + 20, w - 40, 300, { r: 22, fill: '#fff', lineWidth: 5, shadow: false });
      drawGameIcon(g, m, x + 26, y + 26, w - 52, 288, this.t);
      ui.text(g, m.title, x + w / 2, y + 370, { size: 50, color: m.category === 'studio' ? '#9b5cff' : m.category === 'molly' ? MOLLY_DEEP : '#ff4d6d', maxWidth: w - 40 });
      ui.text(g, m.type || '', x + w / 2, y + 420, { size: 30, color: '#6b5a85', stroke: false });
      let yy = y + 480;
      const easy = mollyEasy(m), how = (k) => (easy && m[k + 'Easy']) || m[k];   // Molly Easy how-to
      for (const line of ui.wrap(g, how('goal') || '', w - 70, 34, 700)) { ui.text(g, line, x + w / 2, yy, { size: 34, color: '#24163f', stroke: false, weight: 700 }); yy += 44; }
      yy += 16;
      for (const [btn, label] of (how('controls') || []).slice(0, 4)) {
        if (yy > y + h - 90) break; // keep clear of the footer line
        ui.glyph(g, btn, x + 60, yy, 40);
        ui.text(g, label, x + 96, yy + 2, { size: 28, align: 'left', color: '#24163f', stroke: false, weight: 600, maxWidth: w - 120 });
        yy += 52;
      }
      const meta = [m.duration ? '⏱ ' + m.duration : null, `${m.minPlayers || 1}–${m.maxPlayers || 8} players`].filter(Boolean).join('   ·   ');
      ui.text(g, meta, x + w / 2, y + h - 40, { size: 26, color: '#6b5a85', stroke: false });
      if (m.placeholder) ui.text(g, '(still being built)', x + w / 2, y + h - 80, { size: 24, color: '#c4560f', stroke: false });
    } else if (it.kind === 'random') {
      drawEmote(g, 'question', x + w / 2, y + 220, 200, this.t);
      ui.text(g, 'Random!', x + w / 2, y + 430, { size: 70, color: '#3fa7ff' });
      for (const [i, line] of ['Can\'t decide?', 'Spin the wheel and let', 'the party pick a game!'].entries()) ui.text(g, line, x + w / 2, y + 520 + i * 48, { size: 36, color: '#24163f', stroke: false, weight: 700 });
    } else {
      drawEmote(g, 'star', x + w / 2, y + 220, 200, this.t);
      ui.text(g, this.molly ? 'Sister Marathon' : 'Party Marathon', x + w / 2, y + 430, { size: 62, color: this.molly ? MOLLY_DEEP : '#9b5cff', maxWidth: w - 50 });
      for (const [i, line] of (this.molly ? ['Five Sister games', 'in a row, then', 'a trophy for everyone!'] : ['Five random party games', 'in a row. Most stars', 'wins the trophy!']).entries()) ui.text(g, line, x + w / 2, y + 520 + i * 48, { size: 36, color: '#24163f', stroke: false, weight: 700 });
    }
  }
}
