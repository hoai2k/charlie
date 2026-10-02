// Stand-in used until a minigame module is implemented: lets the menus and
// host flow work end to end. Everyone runs around; A scores; ends after 10 s.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { placementsFromScores, rand, clamp } from '../engine/util.js';

export class PlaceholderGame {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.time = 10;
    this.scores = this.players.map(() => 0);
    this.actors = this.players.map((p, i) => {
      const a = new Actor(p.charId, { x: 300 + i * ((W - 600) / Math.max(1, this.players.length - 1 || 1)), y: 760 });
      a.snap();
      return a;
    });
  }
  update(dt) {
    this.time -= dt;
    this.players.forEach((p, i) => {
      const a = this.actors[i];
      if (p.isAI) { if (Math.random() < dt * 2) p.ctrl.press('a'); p.ctrl.move(Math.sin(performance.now() / 700 + i), 0); }
      a.x = clamp(a.x + p.ctrl.x * 500 * dt, 100, W - 100);
      a.moveAnim(p.ctrl.x * 500, 0, 500);
      if (p.ctrl.pressed('a')) { this.scores[i]++; a.playOnce('cheer', 0.4); sfx('coin'); particles.popText(a.x, a.y - a.height - 20, '+1', p.color); }
      a.update(dt);
    });
    if (this.time <= 0) {
      this.api.finish({ placements: placementsFromScores(this.scores), stats: this.scores.map((s) => `${s} taps`) });
    }
  }
  draw(g) {
    ui.sky(g, '#8fd3ff', '#ffe0f4');
    ui.hills(g, 780, '#7fdc8a', 30, 0.003, 1);
    ui.panel(g, W / 2 - 520, 200, 1040, 200, {});
    ui.text(g, `${this.api.meta.title}`, W / 2, 260, { size: 64, color: '#ff6fb1' });
    ui.text(g, 'Coming soon! Mash A for practice points.', W / 2, 340, { size: 40, color: '#24163f', stroke: false });
    this.actors.forEach((a, i) => { a.draw(g, { ring: this.players[i].color }); ui.playerTag(g, this.players[i], a.x, a.y - a.height - 30); });
    ui.timer(g, this.time);
    ui.scoreboard(g, this.players, this.scores, { y: 960 });
  }
}
