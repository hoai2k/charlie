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
import { GAMES, PARTY_GAMES, STUDIO_GAMES } from '../games/index.js';
import { session } from '../state.js';
import { drawGameIcon } from './common.js';
import { shuffle, pick, ease, clamp } from '../engine/util.js';

const TILE_W = 196, TILE_H = 138, GAP = 16, X0 = 50;
const PANEL_X = 1340;

function buildRows() {
  const rows = [];
  const chunk = (list, n) => { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; };
  chunk(PARTY_GAMES, 6).forEach((r) => rows.push(r.map((g) => ({ kind: 'game', game: g }))));
  chunk(STUDIO_GAMES, 6).forEach((r) => rows.push(r.map((g) => ({ kind: 'game', game: g }))));
  rows.push([{ kind: 'random' }, { kind: 'marathon' }]);
  return rows;
}

export class GameSelectScene {
  constructor() { this.rows = buildRows(); this.row = 0; this.col = 0; }

  enter() {
    this.t = 0;
    this.roulette = null;
    this.chosen = null;
    session.partyMode = null;
    music.play('menu');
    this.layout();
    if (session.lastGameId) {
      this.rows.forEach((r, ri) => r.forEach((it, ci) => { if (it.game && it.game.id === session.lastGameId) { this.row = ri; this.col = ci; } }));
    }
  }

  layout() {
    // Positions for every item, with section headers.
    let y = 168;
    this.rows.forEach((r, ri) => {
      if (ri === Math.ceil(PARTY_GAMES.length / 6)) y += 52; // studio header gap
      if (ri === this.rows.length - 1) y += 18;
      r.forEach((it, ci) => {
        if (it.kind === 'game') Object.assign(it, { x: X0 + ci * (TILE_W + GAP), y, w: TILE_W, h: TILE_H });
        else Object.assign(it, { x: X0 + ci * (3 * TILE_W + 3 * GAP), y, w: 3 * TILE_W + 2 * GAP, h: 110 });
      });
      y += (ri === this.rows.length - 1 ? 110 : TILE_H) + GAP;
    });
    this.studioHeaderY = this.rows[Math.ceil(PARTY_GAMES.length / 6)][0].y - 34;
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
      if (c.pressed('b')) { sfx('back'); this.manager.go('charselect'); return; }
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
    const hint = ui.clickedHint();
    if (hint && ctrls[0]) ctrls[0].inject(hint);
    if (new URLSearchParams(location.search).has('autoselect') && this.t > 1) this.choose();
  }

  choose() {
    const it = this.current;
    if (it.kind === 'game') { this.chosen = { id: it.game.id, t: 0 }; sfx('select'); this.burst(it); }
    else if (it.kind === 'random') this.startRoulette(GAMES.map((g) => g.id), false);
    else if (it.kind === 'marathon') this.startRoulette(shuffle(PARTY_GAMES.map((g) => g.id)).slice(0, 5), true);
  }

  burst(it) {
    particles.burst(it.x + it.w / 2, it.y + it.h / 2, { type: 'star', count: 16 });
    fx.flash('#ffffff', 0.15);
  }

  startRoulette(pool, marathon) {
    sfx('drumroll');
    if (marathon) { sfx('jingle/marathon-start'); host('marathon'); } else host('random');
    const fresh = pool.filter((id) => id !== session.lastGameId);
    const target = marathon ? pool[0] : pick(fresh.length ? fresh : pool);
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
    // Star tally.
    ui.scoreboard(g, session.players, session.players.map((p) => p.stars), { y: 18, format: (v) => `★ ${v}`, highlight: this.leaders() });
    // Section headers.
    ui.text(g, 'Party Games', X0 + 8, 142, { size: 40, align: 'left', color: '#ff4d6d' });
    ui.text(g, 'Play Studio', X0 + 8, this.studioHeaderY, { size: 40, align: 'left', color: '#9b5cff' });
    const played = new Set(session.played);
    const rIdx = this.roulette ? this.roulette.tiles[this.roulette.idx] : null;
    for (const [ri, row] of this.rows.entries()) {
      for (const [ci, it] of row.entries()) {
        const sel = this.roulette ? it === rIdx : (ri === this.row && ci === this.col);
        const bounce = sel ? 1.06 + Math.sin(this.t * 6) * 0.015 : 1;
        g.save();
        g.translate(it.x + it.w / 2, it.y + it.h / 2); g.scale(bounce, bounce); g.translate(-it.w / 2, -it.h / 2);
        if (it.kind === 'game') {
          ui.panel(g, 0, 0, it.w, it.h, { r: 18, fill: '#fff', stroke: sel ? '#ffd23f' : '#24163f', lineWidth: sel ? 9 : 5 });
          drawGameIcon(g, it.game, 5, 5, it.w - 10, it.h - 10, sel ? this.t : 0);
          if (played.has(it.game.id)) {
            ui.panel(g, it.w - 44, -10, 48, 40, { r: 18, fill: '#36d17a', lineWidth: 3, shadow: false });
            ui.text(g, '✓', it.w - 20, 10, { size: 28, strokeWidth: 4 });
          }
        } else {
          const random = it.kind === 'random';
          ui.panel(g, 0, 0, it.w, it.h, { r: 55, fill: random ? '#3fa7ff' : '#9b5cff', stroke: sel ? '#ffd23f' : '#24163f', lineWidth: sel ? 9 : 6 });
          drawEmote(g, random ? 'question' : 'star', 70, it.h / 2, 64, this.t);
          ui.text(g, random ? 'Random!' : 'Party Marathon', it.w / 2 + 30, it.h / 2 - (random ? 0 : 12), { size: 50, weight: 800 });
          if (!random) ui.text(g, '5 games in a row + a trophy', it.w / 2 + 30, it.h / 2 + 30, { size: 24, strokeWidth: 5 });
        }
        g.restore();
      }
    }
    this.drawDetails(g);
    ui.hints(g, [['a', 'Play'], ['b', 'Characters']], PANEL_X + 270, 1046, { size: 32 });
    if (this.roulette && this.roulette.landed) {
      ui.banner(g, this.roulette.marathon ? 'Party Marathon!' : 'Let\'s play!', this.roulette.landT, { y: 560, size: 120 });
    }
  }

  leaders() {
    const max = Math.max(...session.players.map((p) => p.stars));
    return session.players.map((p) => max > 0 && p.stars === max);
  }

  drawDetails(g) {
    const it = this.roulette ? this.roulette.tiles[this.roulette.idx] : this.current;
    const x = PANEL_X, y = 130, w = 540, h = 870;
    ui.panel(g, x, y, w, h, { fill: '#fff8ec' });
    if (it.kind === 'game') {
      const m = it.game;
      ui.panel(g, x + 20, y + 20, w - 40, 300, { r: 22, fill: '#fff', lineWidth: 5, shadow: false });
      drawGameIcon(g, m, x + 26, y + 26, w - 52, 288, this.t);
      ui.text(g, m.title, x + w / 2, y + 370, { size: 50, color: m.category === 'studio' ? '#9b5cff' : '#ff4d6d', maxWidth: w - 40 });
      ui.text(g, m.type || '', x + w / 2, y + 420, { size: 30, color: '#6b5a85', stroke: false });
      let yy = y + 480;
      for (const line of ui.wrap(g, m.goal || '', w - 70, 34, 700)) { ui.text(g, line, x + w / 2, yy, { size: 34, color: '#24163f', stroke: false, weight: 700 }); yy += 44; }
      yy += 16;
      for (const [btn, label] of (m.controls || []).slice(0, 4)) {
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
      ui.text(g, 'Party Marathon', x + w / 2, y + 430, { size: 62, color: '#9b5cff', maxWidth: w - 50 });
      for (const [i, line] of ['Five random party games', 'in a row. Most stars', 'wins the trophy!'].entries()) ui.text(g, line, x + w / 2, y + 520 + i * 48, { size: 36, color: '#24163f', stroke: false, weight: 700 });
    }
  }
}
