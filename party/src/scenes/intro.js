// How-to-play screen shown before every minigame (Mario Party style):
// title, picture, goal, controls with button glyphs and tips, then every
// human presses A to ready up (CPUs ready themselves).
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, voice, host } from '../engine/audio.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { drawHost, hostBubble } from '../engine/host.js';
import { rand } from '../engine/util.js';
import { particles } from '../engine/particles.js';
import { session } from '../state.js';
import { gameById } from '../games/index.js';
import { drawGameIcon } from './common.js';

export class IntroScene {
  enter({ gameId }) {
    this.meta = gameById(gameId);
    this.gameId = gameId;
    this.t = 0;
    this.ready = session.players.map(() => false);
    this.aiReadyAt = session.players.map((p) => (p.isAI ? rand(0.8, 2.2) : Infinity));
    this.go = null;
    music.play('menu');
    const n = session.players.length;
    const spacing = Math.min(220, (W - 160) / n);
    this.actors = session.players.map((p, i) => {
      const a = new Actor(p.charId, { scale: n > 4 ? 0.56 : 0.66, x: W / 2 + (i - (n - 1) / 2) * spacing, y: 1048 });
      a.snap(); return a;
    });
    sfx('magic');
    this.said = 0;
  }

  update(dt, inputOpen) {
    this.t += dt;
    for (const a of this.actors) a.update(dt);
    if (this.go !== null) {
      this.go += dt;
      if (this.go > 0.9) this.manager.go('play', { gameId: this.gameId });
      return;
    }
    if (this.said === 0 && this.t > 0.3) { this.said = 1; const last = session.partyMode && session.partyMode.round === session.partyMode.games.length - 1; host(last ? 'last-game' : 'title/' + this.gameId); }
    if (this.said === 1 && this.t > 2.2 && session.players.some((p, i) => !p.isAI && !this.ready[i])) { this.said = 2; host('press-a'); }
    session.players.forEach((p, i) => {
      if (!this.ready[i] && this.t > this.aiReadyAt[i]) this.setReady(i, true);
    });
    if (!inputOpen) return;
    for (const p of session.players) {
      if (p.isAI) continue;
      const i = p.index;
      if (p.ctrl.pressed('a') && !this.ready[i]) this.setReady(i, true);
      else if (p.ctrl.pressed('b')) {
        if (this.ready[i]) this.setReady(i, false);
        else { sfx('back'); this.manager.go('gameselect'); return; }
      }
    }
    // Keyboard players who aren't bound (e.g. only gamepads joined) can still nudge with Enter.
    if (this.ready.every(Boolean)) { this.go = 0; sfx('go'); }
  }

  setReady(i, on) {
    this.ready[i] = on;
    const a = this.actors[i], p = session.players[i];
    if (on) {
      a.playOnce('ready', 0.6, 'idle'); a.squash(-0.3); sfx('ready');
      particles.burst(a.x, a.y - a.height / 2, { type: 'sparkle', count: 10 });
      if (!p.isAI) voice(p.charId, 'ready');
    } else { a.setPose('idle'); sfx('back'); }
  }

  draw(g) {
    const studio = this.meta.category === 'studio';
    ui.partyBackdrop(g, this.t, studio ? '#c9b3ff' : '#ffb3d9', studio ? '#d8c7ff' : '#ffc8e4');
    // Title ribbon.
    const tp = Math.min(1, this.t / 0.4);
    g.save(); g.translate(W / 2, 92); g.scale(0.6 + 0.4 * tp, 0.6 + 0.4 * tp);
    ui.panel(g, -560, -62, 1120, 124, { r: 62, fill: studio ? '#9b5cff' : '#ff6fb1' });
    ui.text(g, this.meta.title, 0, 2, { size: 84, color: '#fff', weight: 800, maxWidth: 1040 });
    g.restore();
    ui.text(g, this.meta.type || '', W / 2, 180, { size: 34, color: '#24163f', stroke: false });

    // Picture card.
    ui.panel(g, 70, 220, 900, 560, { fill: '#ffffff' });
    drawGameIcon(g, this.meta, 90, 240, 860, 520, this.t);

    // How to play card.
    ui.panel(g, 1000, 220, 850, 560, { fill: '#fff8ec' });
    ui.text(g, 'How to play', 1425, 270, { size: 50, color: '#ff6fb1' });
    let y = 340;
    const goalLines = ui.wrap(g, this.meta.goal || '', 770, 38, 700);
    goalLines.forEach((l) => { ui.text(g, l, 1040, y, { size: 38, align: 'left', color: '#24163f', stroke: false, weight: 700 }); y += 46; });
    y += 14;
    for (const [btn, label] of this.meta.controls || []) {
      ui.glyph(g, btn, 1066, y, 50);
      ui.text(g, label, 1112, y + 2, { size: 34, align: 'left', color: '#24163f', stroke: false, weight: 600, maxWidth: 700 });
      y += 62;
    }
    y += 8;
    for (const tip of this.meta.tips || []) {
      const lines = ui.wrap(g, tip, 740, 28, 600);
      if (y + lines.length * 34 > 770) break;
      ui.text(g, '★', 1050, y, { size: 30, color: '#ffd23f', strokeWidth: 5 });
      lines.forEach((l) => { ui.text(g, l, 1080, y, { size: 28, align: 'left', color: '#6b5a85', stroke: false, weight: 600 }); y += 34; });
      y += 6;
    }
    if (this.meta.duration) ui.text(g, '⏱ ' + this.meta.duration, 1820, 750, { size: 28, align: 'right', color: '#6b5a85', stroke: false });

    // Host.
    drawHost(g, 200, 215, 150, this.t, this.go !== null ? 'cheer' : 'talk');

    // Players + ready state.
    this.actors.forEach((a, i) => {
      const p = session.players[i];
      a.draw(g, { ring: p.color });
      const ty = a.y - a.height - 34;
      if (this.ready[i]) {
        ui.panel(g, a.x - 70, ty - 40, 140, 52, { r: 26, fill: '#36d17a', lineWidth: 4, shadow: false });
        ui.text(g, 'Ready!', a.x, ty - 13, { size: 30, strokeWidth: 5 });
      } else if (p.isAI) {
        ui.text(g, '...', a.x, ty - 13, { size: 40, color: p.color });
      } else {
        ui.glyph(g, 'a', a.x - 40, ty - 14, 42, { pulse: true });
        ui.text(g, p.tag, a.x + 20, ty - 12, { size: 30, color: p.color, strokeWidth: 5 });
      }
    });
    if (this.go !== null) ui.banner(g, "Let's go!", this.go, { y: 520, size: 160 });
    else if (this.t > 0.6 && this.ready.some((r, i) => !r && !session.players[i].isAI)) {
      ui.text(g, 'Press A when you are ready!', W / 2, 818, { size: 36, color: '#fff' });
    }
  }
}
