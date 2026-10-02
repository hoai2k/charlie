// Minigame host: builds the api object, runs 3-2-1-GO, pause menu, FINISH!
// banner, crash safety, then hands the result to the Results scene.
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music } from '../engine/audio.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import * as ui from '../engine/ui.js';
import { session } from '../state.js';
import { gameById } from '../games/index.js';

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
    const host = this;
    const api = {
      players: session.players,
      meta: this.meta,
      level: session.cpuLevel,
      W, H,
      get time() { return host.playTime; },
      get state() { return host.state; },
      finish: (result) => this.finish(result),
    };
    this.api = api;
    try {
      this.game = new this.meta.module.Game(api);
    } catch (e) { this.crash(e); }
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
    this.state = 'finish'; this.t = 0;
    sfx('whistle'); fx.flash('#ffffff', 0.25);
  }

  update(dt, inputOpen) {
    this.t += dt;
    if (this.paused) { this.updatePause(); return; }
    if (inputOpen && this.state !== 'finish' && this.state !== 'error') {
      const pauser = input.humans().find((c) => c.pressed('start'));
      if (pauser) { this.paused = { by: pauser, sel: 0 }; sfx('select'); return; }
    }
    if (this.state === 'countdown') {
      const n = Math.floor(this.t);
      if (n !== this.lastCount && n <= 3) { this.lastCount = n; sfx(n < 3 ? 'count' : 'go'); }
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
    if (c.pressed('a')) {
      const act = items[this.paused.sel][1];
      this.paused = null; sfx('select');
      if (act === 'restart') { this.manager.go('play', { gameId: this.gameId }); }
      else if (act === 'quit') { music.play('menu'); this.manager.go('gameselect'); }
      else if (act === 'done') { this.safe(() => (this.game.onDone ? this.game.onDone() : this.finish({ showcase: true }))); }
    }
  }

  draw(g) {
    if (this.game && !this.error) {
      try { this.game.draw(g); } catch (e) { this.crash(e); }
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
    const h = 140 + items.length * 90;
    ui.panel(g, W / 2 - 330, H / 2 - h / 2, 660, h, { fill: '#fff8ec' });
    ui.text(g, 'Paused', W / 2, H / 2 - h / 2 + 64, { size: 70, color: '#ff6fb1' });
    items.forEach(([label], i) => {
      const y = H / 2 - h / 2 + 150 + i * 90;
      const sel = i === this.paused.sel;
      if (sel) ui.panel(g, W / 2 - 270, y - 36, 540, 72, { r: 36, fill: '#ffd23f', shadow: false, lineWidth: 5 });
      ui.text(g, label, W / 2, y, { size: 44, color: sel ? '#24163f' : '#6b5a85', stroke: false, weight: 700 });
    });
  }
}
