// Minigame host: builds the api object, runs 3-2-1-GO, pause menu, FINISH!
// banner, crash safety, then hands the result to the Results scene.
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, host } from '../engine/audio.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import * as ui from '../engine/ui.js';
import { session } from '../state.js';
import { gameById } from '../games/index.js';
import { Camera } from '../engine/camera.js';

const COUNTDOWN = 3.6;

export class PlayScene {
  enter({ gameId }) {
    this.meta = gameById(gameId);
    if (!this.meta) throw new Error('Unknown game ' + gameId);
    this.gameId = gameId;
    for (const p of session.players) if (p.isAI) p.ctrl.reset();
    this.result = null;
    this.state = this.meta.countdown === false ? 'play' : 'countdown';
    this.t = 0;
    this.playTime = 0;
    this.paused = null;
    this.error = null;
    this.leaving = false; // the scene object is reused: without this every game after the first sticks on FINISH
    const host = this;
    const api = {
      players: session.players,
      meta: this.meta,
      level: session.cpuLevel,
      W, H,
      get time() { return host.playTime; },
      get state() { return host.state; },
      finish: (result) => this.finish(result),
      camera: new Camera(),
    };
    this.camera = api.camera;
    // Big parties spread players to the screen edges: zoom less so nobody
    // loses sight of their character during punch-ins.
    const np = session.players.length;
    this.camera.maxZoom = np >= 7 ? 1.1 : np >= 5 ? 1.18 : 2.2;
    this.api = api;
    try {
      this.game = new this.meta.module.Game(api);
    } catch (e) { this.crash(e); }
    this.usesCamera = !!(this.game && this.game.drawHUD);
    this.drawsParticles = true; // particles go inside the camera (or right after the game)
    if (this.usesCamera && this.state === 'countdown' && this.meta.flyIn !== false) this.camera.flyIn();
    music.play(this.meta.music || 'party');
    this.lastCount = -1;
  }

  exit() {
    try { this.game && this.game.destroy && this.game.destroy(); } catch (e) { console.error(e); }
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

  finish(result = {}) {
    if (this.result) return;
    const n = session.players.length;
    this.result = {
      placements: result.placements || Array(n).fill(1),
      stats: result.stats || Array(n).fill(''),
      showcase: !!result.showcase || this.meta.category === 'studio' && !result.placements,
      highlight: result.highlight ?? null,  // index of a "showstopper" in studio games
      title: result.title || null,
    };
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
    if (this.paused) { this.updatePause(); return; }
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
      this.playTime += dt;
      this.safe(() => this.game.update(dt));
    } else if (this.state === 'finish') {
      this.safe(() => this.game.postUpdate && this.game.postUpdate(dt));
      if (this.t > 1.9) this.toResults();
    } else if (this.state === 'error') {
      if (this.t > 2.5 || input.anyHumanPressed('a')) this.toResults();
    }
  }

  toResults() {
    if (this.leaving) return;
    this.leaving = true;
    this.manager.go('results', { gameId: this.gameId, result: this.result });
  }

  safe(fn) { if (this.error) return; try { fn(); } catch (e) { this.crash(e); } }

  pauseItems() {
    const items = [['Keep playing', 'resume'], ['Start over', 'restart']];
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
    if (act === 'restart') { this.manager.go('play', { gameId: this.gameId }); }
    else if (act === 'quit') { music.play('menu'); this.manager.go('gameselect'); }
    else if (act === 'done') { this.safe(() => (this.game.onDone ? this.game.onDone() : this.finish({ showcase: true }))); }
  }

  pauseLayout() {
    const n = this.pauseItems().length, h = 140 + n * 90, top = H / 2 - h / 2;
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
    if (this.state === 'countdown') ui.countdown(g, this.t);
    if (this.state === 'play' && this.playTime < 0.8 && this.meta.countdown !== false) ui.countdown(g, 3 + this.playTime);
    if (this.state === 'finish') {
      g.save(); g.fillStyle = `rgba(36,22,63,${Math.min(0.35, this.t)})`; g.fillRect(0, 0, W, H); g.restore();
      ui.banner(g, this.result.title || (this.meta.category === 'studio' ? 'Beautiful!' : 'FINISH!'), this.t, { size: 170 });
    }
    if (this.state === 'error') {
      g.save(); g.fillStyle = 'rgba(36,22,63,0.6)'; g.fillRect(0, 0, W, H); g.restore();
      ui.banner(g, 'Oopsie!', this.t, { size: 150, color: '#ff6fb1' });
      ui.text(g, 'This game tripped over its shoelaces. Everyone gets a star!', W / 2, H / 2 + 130, { size: 40 });
    }
    if (this.paused) this.drawPause(g);
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
