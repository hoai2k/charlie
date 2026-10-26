// Minigame host: builds the api object, runs 3-2-1-GO, pause menu, FINISH!
// banner, crash safety, then hands the result to the Results scene.
import { cancelLater, lerp, ease } from '../engine/util.js';
import { W, H } from '../engine/canvas.js';
import { input, inputOpts } from '../engine/input.js';
import { sfx, music, host, stopAllLoops, duckLoops, setMuted, isMuted } from '../engine/audio.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import * as ui from '../engine/ui.js';
import { session, sitOut, mollyEasy } from '../state.js';
import { gameById, loadGame } from '../games/index.js';
import { Camera } from '../engine/camera.js';
import { corner } from '../engine/corner.js';
import { hasArtGroup, ensureGameArt, releaseGameArt } from '../engine/art.js';
import { bookResult, leaveFinishedGame } from './results.js';

const COUNTDOWN = 3.6;

export class PlayScene {
  enter({ gameId, playing = null }) {
    const epoch = this._loadEpoch = (this._loadEpoch || 0) + 1;
    if (this._artGroup) releaseGameArt(this._artGroup);
    this._artGroup = null;
    this.game = null;
    if (playing) sitOut(playing);   // some players sat this one out (how-to screen); restoreRoster() on the way back
    this.meta = gameById(gameId);
    if (!this.meta) throw new Error('Unknown game ' + gameId);
    this.gameId = gameId;
    for (const p of session.players) if (p.isAI) p.ctrl.reset();
    this.result = null;
    this.state = this.meta.countdown === false ? 'play' : 'countdown';
    this.t = 0;
    this.playTime = 0;
    this.canSkip = false; this.skipping = null;   // "B: skip to the end" once every human is out
    this.paused = null;
    this.howto = null;    // the how-to-play card (corner "i" or the pause menu); pauses the game
    corner.infoFn = () => this.openHowto();
    // Sister Party: either stick moves (a game that gives the right stick its own job sets meta.rightStick)
    inputOpts.rsMove = this.meta.category === 'molly' && !this.meta.rightStick;
    this.error = null;
    this.leaving = false; // the scene object is reused: without this every game after the first sticks on FINISH
    const host = this;
    const api = {
      players: session.players,
      meta: this.meta,
      level: session.cpuLevel,
      // Molly Party Easy: play with A (and X) only, no stick - see games/README.md
      easy: mollyEasy(this.meta),
      W, H,
      get time() { return host.playTime; },
      get state() { return host.state; },
      finish: (result) => this.finish(result),
      // Everyone wins together (co-op / studio): one podium, a team headline, no ranking.
      finishTogether: ({ title = null, stats = null, focus = null, banner = true } = {}) => this.finish({
        placements: session.players.map(() => 1), showcase: true, highlight: null, title, focus, banner,
        stats: stats || session.players.map(() => ''),
      }),
      // A time limit the game runs on. The play scene draws its countdown (so no limit is ever
      // hidden): left() returns the seconds left, or null while it isn't running. Shown for the
      // last `showAt` seconds (Infinity = always), at (x, y) with an optional label under it.
      // timeUp: { more(), done(), moreLabel } turns the end into a "Time's up!" question instead of
      // an ending (Play Studio): the game pauses and the kids choose Keep playing (the default, so
      // someone still mashing A just gets more time) or All done. All-CPU games just call done().
      limit: (left, o = {}) => { host.limits.push({ left, showAt: o.showAt ?? 10, x: o.x ?? W / 2, y: o.y ?? 64, label: o.label || null, timeUp: o.timeUp || null, fired: false }); },
      // A whole-game clock for a Play Studio game that has no clock of its own: shown the whole time;
      // at 0 it asks "Time's up!"; Keep playing adds `more` seconds, All done ends the game
      // (game.onDone(), as the pause menu's "All done!").
      // o.active(): false while the clock shouldn't run or show (e.g. the gallery show, a finale).
      studioClock: (seconds, o = {}) => {
        const clock = { left: seconds, active: o.active || (() => true) };
        host.studioClocks.push(clock);
        api.limit(() => (host.state === 'play' && clock.active() ? clock.left : null), {
          showAt: Infinity, x: o.x ?? W / 2, y: o.y ?? 64, label: o.label || null,
          timeUp: { more: () => { clock.left += o.more ?? 60; }, done: () => host.allDone(), moreLabel: o.moreLabel },
        });
        return clock;
      },
      camera: new Camera(),
      // true once a no-winner game has ended on its gallery screen: hide score chips and other
      // play-time HUD so the art (and the stars bar along the bottom) is all that shows
      ended: () => host.state === 'gallery',
    };
    this.limits = [];
    this.studioClocks = [];
    this.timeUp = null;   // the open "Time's up!" question: { L, sel, t }
    this.camera = api.camera;
    // Big parties spread players to the screen edges: zoom less so nobody
    // loses sight of their character during punch-ins.
    const np = session.players.length;
    this.camera.maxZoom = np >= 7 ? 1.1 : np >= 5 ? 1.18 : 2.2;
    this.api = api;
    this.usesCamera = false;
    this.drawsParticles = true;
    this.lastCount = -1;
    // The game's code and art (the intro screen started both, so usually they are ready).
    // Constructors can bake their first canvases: finish loading before any game code
    // runs, and invalidate this continuation on exit or reuse.
    this.state = 'loading';
    this.module = null;
    if (hasArtGroup(gameId)) this._artGroup = gameId;
    // already loaded (the usual case after the intro screen) and no art to wait for: start now
    if (!this._artGroup && this.meta.module) { this.module = this.meta.module; this.startGame(epoch); return; }
    const art = this._artGroup ? ensureGameArt(gameId).catch(() => {}) : null;
    Promise.all([loadGame(gameId), art]).then(([mod]) => { this.module = mod; this.startGame(epoch); },
      (e) => { if (epoch === this._loadEpoch && !this.leaving) this.crash(e); });
  }

  startGame(epoch) {
    if (epoch !== this._loadEpoch || this.leaving) return;
    this.state = this.meta.countdown === false ? 'play' : 'countdown';
    try {
      this.game = new this.module.Game(this.api);
    } catch (e) { this.crash(e); }
    this.usesCamera = !!(this.game && this.game.drawHUD);
    this.drawsParticles = true; // particles go inside the camera (or right after the game)
    if (this.usesCamera && this.state === 'countdown' && this.meta.flyIn !== false) this.camera.flyIn();
    music.play((this.game && this.game.musicKey) || this.meta.music || 'party', { loop: this.game?.musicLoop ?? null });   // a game may pick its song (rhythm games)
    this.lastCount = -1;
  }

  exit() {
    this._loadEpoch = (this._loadEpoch || 0) + 1;
    this.leaving = true;
    corner.infoFn = null; this.howto = null; inputOpts.rsMove = false;
    try { this.game && this.game.destroy && this.game.destroy(); } catch (e) { console.error(e); }
    this.game = null;
    if (this._artGroup) releaseGameArt(this._artGroup);
    this._artGroup = null;
    stopAllLoops(); duckLoops(false); this._ducked = false;   // sfxLoop()s never outlive their game
    cancelLater();                                            // nor do the game's later() timers
    for (const p of session.players) if (p.isAI) p.ctrl.reset();
  }

  crash(e) {
    console.error('Minigame crashed:', e);
    this.error = e;
    if (!this.result) {
      this.result = { placements: session.players.map(() => 1), showcase: true, stats: session.players.map(() => '') };
      this.state = 'error'; this.t = 0;
    }
  }

  /**
   * Playing alone, a competitive game would always put you 1st. Instead rate
   * the run against your own best for this game (games pass `solo`, a number
   * where higher is better): beat or match it = 1st, close = 2nd, else 3rd.
   * The first run sets the best.
   */
  rateSolo(score) {
    const key = 'party.best.' + this.gameId, show = this.result.stats[0] || '';
    let best = null;
    try { best = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { /* storage blocked */ }
    let place, title;
    if (!best || score > best.score) { place = 1; title = best ? 'New best!' : 'You did it!'; }
    else if (score === best.score) { place = 1; title = 'You matched your best!'; }
    else if (score >= best.score * 0.75) { place = 2; title = `So close! Best: ${best.show}`; }
    else { place = 3; title = `Good try! Best: ${best.show}`; }
    if (!best || score > best.score) { try { localStorage.setItem(key, JSON.stringify({ score, show })); } catch (e) { /* ignore */ } }
    this.result.placements = [place];
    this.result.title = title;
  }

  finish(result = {}) {
    if (this.result) return;
    const n = session.players.length;
    this.result = {
      placements: result.placements || Array(n).fill(1),
      stats: result.stats || Array(n).fill(''),
      showcase: !!result.showcase || this.meta.category === 'studio' && !result.placements,
      highlight: result.highlight ?? null,  // index of a "showstopper" in studio games
      title: result.title || null,
      banner: result.banner !== false,   // gallery: false when the game's last screen has its own title
    };
    // A no-winner game (every showcase / finishTogether ending, unless it passes gallery: false)
    // ends on its own show-off screen - the photo wall, the gallery, the finished picture: no
    // FINISH banner and no podium page. Stars are booked here and the kids leave from the
    // game's screen with A (or Y: play again).
    if (result.gallery ?? this.result.showcase) {
      this.earned = bookResult(this.gameId, this.result);
      this.state = 'gallery'; this.t = 0;
      sfx('jingle/star-award');
      setTimeout(() => host('everyone-star'), 400);
      return;
    }
    if (n === 1 && result.solo !== undefined && !this.result.showcase) this.rateSolo(result.solo);
    // Zoom toward the winner (or a focus point the game gives) for the FINISH beat.
    if (this.usesCamera) {
      const f = result.focus;
      if (f) this.camera.punch(f.x, f.y, f.zoom || 1.35, 1.6);
    }
    this.state = 'finish'; this.t = 0;
    sfx('whistle'); fx.flash('#ffffff', 0.25);
    host('finish', { interrupt: true });
  }

  update(dt, inputOpen) {
    if (this.state === 'loading' || this.leaving) return;
    const held = !!(this.paused || this.howto || this.timeUp);
    if (held !== !!this._ducked) { this._ducked = held; duckLoops(held); }
    if (this.howto) { this.updateHowto(dt); return; }
    if (this.paused) { this.updatePause(); return; }
    if (this.timeUp) { this.updateTimeUp(dt); return; }
    this.t += dt; // after the pause check so a pause during 3-2-1 doesn't skip the countdown
    if (this.usesCamera) { this.camera.update(dt); this.camera.tickPunch(dt); }
    if (inputOpen && this.state !== 'finish' && this.state !== 'error') {
      const pauser = input.humans().find((c) => c.pressed('start'));
      if (pauser) { this.paused = { by: pauser, sel: 0 }; sfx('select'); return; }
    }
    if (this.state === 'countdown') {
      const n = Math.floor(this.t);
      if (n !== this.lastCount && n <= 3) { this.lastCount = n; sfx(n < 3 ? 'count' : 'go'); host(n < 3 ? 'count-' + (3 - n) : 'go', { interrupt: true }); }
      this.safe(() => this.game.preUpdate && this.game.preUpdate(dt));
      if (this.t >= 3) { this.state = 'play'; }
    }
    if (this.state === 'play') {
      if (this.skipping) { this.fastForward(); return; }
      this.playTime += dt;
      for (const c of this.studioClocks) { let on = true; try { on = c.active(); } catch (e) { on = false; } if (on) c.left = Math.max(0, c.left - dt); }
      if (this.checkTimeUp()) return;
      this.safe(() => this.game.update(dt));
      // Every human is out: offer to skip to the end (the game plays on, fast and silent).
      this.canSkip = this.state === 'play' && session.players.some((p) => !p.isAI) && !!this.game?.humansOut && (() => { try { return this.game.humansOut(); } catch (e) { return false; } })();
      if (this.canSkip && inputOpen && input.humans().some((c) => c.pressed('b'))) {
        this.skipping = { muted: isMuted(), t0: performance.now() };
        setMuted(true); sfx('select');
      }
    } else if (this.state === 'finish') {
      this.safe(() => this.game.postUpdate && this.game.postUpdate(dt));
      if (this.t > 1.9) this.toResults();
    } else if (this.state === 'gallery') {
      this.safe(() => this.game.postUpdate && this.game.postUpdate(dt));
      if (this.t < 2.5 || this.leaving) return;
      const c = input.humans().find((h) => h.pressed('a') || h.pressed('y'));
      const auto = new URLSearchParams(location.search).has('auto') && this.t > 8;
      if (c || auto || (inputOpen && input.pointer.pressed)) {
        this.leaving = true; sfx('select');
        leaveFinishedGame(this.manager, this.gameId, !!(c && c.pressed('y')));
      }
    } else if (this.state === 'error') {
      if (this.t > 2.5 || input.anyHumanPressed('a')) this.toResults();
    }
  }

  /** Run the game many fixed steps per frame (sound off) until it calls finish. */
  fastForward() {
    const step = 1 / 60, t0 = performance.now();
    while (this.state === 'play' && !this.error && performance.now() - t0 < 12) {
      for (let k = 0; k < 10 && this.state === 'play' && !this.error; k++) {
        this.playTime += step;
        this.safe(() => this.game.update(step));
        input.update(0);   // one-frame taps (CPU presses) last one step, as in the main loop
      }
    }
    // Done (or a safety limit for a game that never ends): sound back on, clear the fast-forwarded particles.
    if (this.state !== 'play' || this.error || performance.now() - this.skipping.t0 > 20000) {
      setMuted(this.skipping.muted); this.skipping = null; this.canSkip = false;
      particles.clear();
      if (this.state === 'finish') sfx('whistle');
    }
  }

  toResults() {
    if (this.leaving) return;
    this.leaving = true;
    this.manager.go('results', { gameId: this.gameId, result: this.result });
  }

  safe(fn) { if (this.error) return; try { fn(); } catch (e) { this.crash(e); } }

  openHowto() {
    if (this.state === 'loading' || this.state === 'finish' || this.state === 'error' || this.howto) return;
    this.paused = null; this.howto = { t: 0 }; sfx('select');
  }

  updateHowto(dt) {
    this.howto.t += dt;
    if (this.howto.t < 0.25) return;
    const closer = input.humans().some((c) => c.pressed('a') || c.pressed('b') || c.pressed('start'));
    if (closer || input.pointer.pressed) { this.howto = null; sfx('back'); }
  }

  /** The intro screen's goal, controls and tips, on a card over the paused game. */
  drawHowto(g) {
    const m = this.meta;
    g.save(); g.fillStyle = 'rgba(36,22,63,0.62)'; g.fillRect(0, 0, W, H); g.restore();
    const pw = 1180, controls = m.controls || [], tips = (m.tips || []).slice(0, 3);
    const goal = ui.wrap(g, m.goal || '', pw - 120, 38, 700);
    const rowH = 60;
    const ph = 150 + goal.length * 46 + 20 + controls.length * rowH + (tips.length ? 20 + tips.length * 40 : 0) + 90;
    const px = W / 2 - pw / 2, py = Math.max(30, H / 2 - ph / 2);
    ui.panel(g, px, py, pw, ph, { fill: '#fff8ec' });
    ui.text(g, m.title, W / 2, py + 62, { size: 62, color: '#ff6fb1', maxWidth: pw - 80 });
    let y = py + 132;
    for (const l of goal) { ui.text(g, l, px + 60, y, { size: 38, align: 'left', color: '#24163f', stroke: false, weight: 700 }); y += 46; }
    y += 20;
    for (const [btn, label] of controls) {
      ui.glyph(g, btn, px + 90, y, rowH - 10);
      ui.text(g, label, px + 140, y + 2, { size: 34, align: 'left', color: '#24163f', stroke: false, weight: 600, maxWidth: pw - 200 });
      y += rowH;
    }
    if (tips.length) {
      y += 14;
      for (const tip of tips) { ui.text(g, '★ ' + tip, px + 70, y, { size: 28, align: 'left', color: '#6b5a85', stroke: false, weight: 600, maxWidth: pw - 120 }); y += 40; }
    }
    ui.hints(g, [['a', 'Back to the game']], W / 2, py + ph - 40, { size: 36 });
  }

  /** A limit with timeUp reached 0: ask the kids (or, with no kids playing, just finish it). */
  checkTimeUp() {
    for (const L of this.limits) {
      if (!L.timeUp) continue;
      let left = null;
      try { left = L.left(); } catch (e) { left = null; }
      if (left == null || left > 0) { L.fired = false; continue; }
      if (L.fired) continue;
      L.fired = true;
      if (!session.players.some((p) => !p.isAI)) { this.safe(() => L.timeUp.done()); continue; }
      this.timeUp = { L, sel: 0, t: 0 };
      sfx('whistle');
      return true;
    }
    return false;
  }

  timeUpItems() { return [[this.timeUp.L.timeUp.moreLabel || 'Keep playing!', 'more'], ['All done!', 'done']]; }

  updateTimeUp(dt) {
    const T = this.timeUp;
    T.t += dt;
    if (T.t < 0.6) return;   // a beat to read it (and so an A already being mashed lands on "Keep playing")
    const items = this.timeUpItems();
    for (const c of input.humans()) {
      if (c.nav.y) { T.sel = (T.sel + c.nav.y + items.length) % items.length; sfx('move'); }
    }
    const lay = this.pauseLayout(items.length);
    for (let i = 0; i < items.length; i++) {
      const r = lay.item(i);
      if (input.pointer.moved && input.pointerOver(r) && T.sel !== i) { T.sel = i; sfx('move'); }
      if (input.clicked(r)) { T.sel = i; this.chooseTimeUp(items[i][1]); return; }
    }
    if (input.humans().some((c) => c.pressed('a'))) this.chooseTimeUp(items[T.sel][1]);
    else if (input.humans().some((c) => c.pressed('b'))) this.chooseTimeUp('more');
  }

  chooseTimeUp(act) {
    const L = this.timeUp.L;
    this.timeUp = null; sfx('select');
    if (act === 'more') { this.safe(() => L.timeUp.more()); L.fired = false; }
    else this.safe(() => L.timeUp.done());
  }

  /** "All done!": end a Play Studio game the way the pause menu does. */
  allDone() { this.safe(() => (this.game.onDone ? this.game.onDone() : this.finish({ showcase: true }))); }

  drawTimeUp(g) {
    g.save(); g.fillStyle = 'rgba(36,22,63,0.55)'; g.fillRect(0, 0, W, H); g.restore();
    const items = this.timeUpItems();
    const { h, top, item } = this.pauseLayout(items.length);
    ui.panel(g, W / 2 - 330, top, 660, h, { fill: '#fff8ec' });
    ui.text(g, "Time's up!", W / 2, top + 64, { size: 70, color: '#ff6fb1' });
    items.forEach(([label], i) => {
      const r = item(i), y = r.y + r.h / 2;
      const sel = i === this.timeUp.sel;
      if (sel) ui.panel(g, r.x, r.y, r.w, r.h, { r: 36, fill: '#ffd23f', shadow: false, lineWidth: 5 });
      ui.text(g, label, W / 2, y, { size: 44, color: sel ? '#24163f' : '#6b5a85', stroke: false, weight: 700 });
    });
  }

  /** Over a gallery ending: everyone's stars along the bottom, and how to go on. */
  drawGalleryBar(g) {
    const k = Math.min(1, this.t / 0.6);
    g.save(); g.globalAlpha = k;
    const title = this.result.banner && this.result.title;
    if (title) {
      const w = Math.min(W - 200, ui.measure(g, title, 56, 800) + 120), y = lerp(-60, 74, ease.outBack(k));
      ui.panel(g, W / 2 - w / 2, y - 44, w, 88, { r: 44, fill: '#9b5cff' });
      ui.text(g, title, W / 2, y + 2, { size: 56, weight: 800 });
    }
    ui.scoreboard(g, session.players, this.earned, { y: 990, format: (v) => `+${v} ★` });
    if (this.t > 2.5) ui.hints(g, [['a', session.partyMode ? 'Next game' : 'Continue'], ['y', 'Play again']], W - 330, 940, { size: 36 });
    g.restore();
  }

  /** Countdowns for the game's time limits (api.limit): nothing ends on a clock nobody can see. */
  drawLimits(g) {
    for (const L of this.limits) {
      let left = null;
      try { left = L.left(); } catch (e) { left = null; }
      if (left == null || !(left > 0) || left > L.showAt) continue;
      ui.timer(g, left, L.x, L.y);
      if (L.label) ui.text(g, L.label, L.x, L.y + 64, { size: 30, color: '#ffffff' });
    }
  }

  /** A compact controls legend in a free corner during play (meta.cornerControls). */
  drawCornerControls(g) {
    const cc = this.meta.cornerControls;
    if (!cc || !cc.items || !cc.items.length) return;
    const size = 34, rowH = 42, pad = 14;
    g.save();
    let w = 0;
    for (const [, l] of cc.items) w = Math.max(w, ui.measure(g, l, 24, 700));
    w += size + pad * 3;
    const h = cc.items.length * rowH + pad;
    const at = cc.at || 'bl';
    // bottom-left sits above the song tag
    const x = at.endsWith('l') ? 16 : W - 16 - w;
    const y = at.startsWith('t') ? (cc.top ?? 120) : H - 16 - h - (at === 'bl' ? 52 : 0);
    g.globalAlpha = 0.9;
    ui.panel(g, x, y, w, h, { r: 18, fill: 'rgba(255,248,236,0.88)', lineWidth: 3, shadow: false });
    cc.items.forEach(([btn, label], i) => {
      const cy = y + pad / 2 + rowH * i + rowH / 2;
      ui.glyph(g, btn, x + pad + size / 2, cy, size);
      ui.text(g, label, x + pad * 2 + size, cy + 1, { size: 24, align: 'left', color: '#24163f', stroke: false, weight: 700 });
    });
    g.restore();
  }

  pauseItems() {
    const items = [['Keep playing', 'resume'], ['How to play', 'howto'], ['Start over', 'restart']];
    if (this.meta.category === 'studio') items.push(['All done!', 'done']);
    items.push(['Pick another game', 'quit']);
    return items;
  }

  updatePause() {
    const c = this.paused.by, items = this.pauseItems();
    if (c.nav.y) { this.paused.sel = (this.paused.sel + c.nav.y + items.length) % items.length; sfx('move'); }
    if (c.pressed('start') || c.pressed('b')) { this.paused = null; sfx('back'); return; }
    // Mouse / touch: hover highlights, click picks; a click outside the box resumes.
    const lay = this.pauseLayout();
    for (let i = 0; i < items.length; i++) {
      const r = lay.item(i);
      if (input.pointer.moved && input.pointerOver(r) && this.paused.sel !== i) { this.paused.sel = i; sfx('move'); }
      if (input.clicked(r)) { this.paused.sel = i; this.choosePause(items[i][1]); return; }
    }
    if (input.pointer.pressed && !input.pointerOver(lay.box)) { this.paused = null; sfx('back'); return; }
    if (c.pressed('a')) this.choosePause(items[this.paused.sel][1]);
  }

  choosePause(act) {
    this.paused = null; sfx('select');
    if (act === 'howto') { this.openHowto(); }
    else if (act === 'restart') { this.manager.go('play', { gameId: this.gameId }); }
    else if (act === 'quit') this.manager.go('gameselect');   // game select starts its menu music
    else if (act === 'done') { this.safe(() => (this.game.onDone ? this.game.onDone() : this.finish({ showcase: true }))); }
  }

  pauseLayout(count = null) {
    const n = count ?? this.pauseItems().length, h = 140 + n * 90, top = H / 2 - h / 2;
    return {
      h, top,
      box: { x: W / 2 - 330, y: top, w: 660, h },
      item: (i) => ({ x: W / 2 - 270, y: top + 150 + i * 90 - 36, w: 540, h: 72 }),
    };
  }

  draw(g) {
    if (this.game && !this.error) {
      try {
        if (this.usesCamera) {
          g.save(); this.camera.apply(g);
          this.game.draw(g);
          particles.draw(g);
          g.restore();
          this.game.drawHUD(g);
        } else {
          this.game.draw(g);
          particles.draw(g);
        }
      } catch (e) { this.crash(e); }
    } else {
      ui.sky(g, '#8fd3ff', '#ffe0f4');
    }
    if (this.state === 'loading') ui.text(g, 'Loading…', W / 2, H / 2, { size: 64 });
    if (this.state === 'countdown') ui.countdown(g, this.t);
    if (this.state === 'play' && this.playTime < 0.8 && this.meta.countdown !== false) ui.countdown(g, 3 + this.playTime);
    if (this.state === 'gallery') this.drawGalleryBar(g);
    if (this.state === 'finish') {
      g.save(); g.fillStyle = `rgba(36,22,63,${Math.min(0.35, this.t)})`; g.fillRect(0, 0, W, H); g.restore();
      ui.banner(g, this.result.title || (this.meta.category === 'studio' ? 'Beautiful!' : 'FINISH!'), this.t, { size: 170 });
    }
    if (this.state === 'error') {
      g.save(); g.fillStyle = 'rgba(36,22,63,0.6)'; g.fillRect(0, 0, W, H); g.restore();
      ui.banner(g, 'Oopsie!', this.t, { size: 150, color: '#ff6fb1' });
      ui.text(g, 'This game tripped over its shoelaces. Everyone gets a star!', W / 2, H / 2 + 130, { size: 40 });
    }
    if ((this.state === 'play' || this.state === 'countdown') && !this.paused && !this.howto && !this.timeUp) this.drawLimits(g);
    if (this.state === 'play' && !this.paused && !this.howto) this.drawCornerControls(g);
    if (this.state === 'play' && this.skipping) {
      g.save(); g.fillStyle = 'rgba(36,22,63,0.35)'; g.fillRect(0, 0, W, H); g.restore();
      ui.text(g, 'Skipping to the end…', W / 2, H / 2, { size: 72 });
    } else if (this.state === 'play' && this.canSkip && !this.paused && !this.howto) {
      // bottom right
      const pulse = 1 + Math.sin(this.t * 4) * 0.04;
      g.save(); g.translate(W - 210, H - 112); g.scale(pulse, pulse);
      ui.panel(g, -170, -34, 340, 68, { r: 34, fill: '#fff8ec', lineWidth: 5 });
      ui.hints(g, [['b', 'Skip to the end']], 0, 2, { size: 34 });
      g.restore();
    }
    if (this.timeUp) this.drawTimeUp(g);
    if (this.paused) this.drawPause(g);
    if (this.howto) this.drawHowto(g);
  }

  drawPause(g) {
    g.save(); g.fillStyle = 'rgba(36,22,63,0.6)'; g.fillRect(0, 0, W, H); g.restore();
    const items = this.pauseItems();
    const { h, top, item } = this.pauseLayout();
    ui.panel(g, W / 2 - 330, top, 660, h, { fill: '#fff8ec' });
    ui.text(g, 'Paused', W / 2, top + 64, { size: 70, color: '#ff6fb1' });
    items.forEach(([label], i) => {
      const r = item(i), y = r.y + r.h / 2;
      const sel = i === this.paused.sel;
      if (sel) ui.panel(g, r.x, r.y, r.w, r.h, { r: 36, fill: '#ffd23f', shadow: false, lineWidth: 5 });
      ui.text(g, label, W / 2, y, { size: 44, color: sel ? '#24163f' : '#6b5a85', stroke: false, weight: 700 });
    });
  }
}
