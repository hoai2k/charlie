import { drawArt } from '../engine/art.js';
// How-to-play screen shown before every minigame (Mario Party style):
// title, picture, goal, controls with button glyphs and tips, then every
// human presses A to ready up (CPUs ready themselves).
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, voice, host } from '../engine/audio.js';
import { Actor, drawPortrait, drawSpeech } from '../engine/sprites.js';
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
    drawArt(g, 'bg/howto', 0, 0, W, H, { anchor: 'topleft', fit: 'cover' });
    // Title ribbon.
    const tp = Math.min(1, this.t / 0.4);
    g.save(); g.translate(W / 2, 92); g.scale(0.6 + 0.4 * tp, 0.6 + 0.4 * tp);
    ui.panel(g, -560, -62, 1120, 124, { r: 62, fill: studio ? '#9b5cff' : '#ff6fb1' });
    ui.text(g, this.meta.title, 0, 2, { size: 84, color: '#fff', weight: 800, maxWidth: 1040 });
    g.restore();
    ui.text(g, this.meta.type || '', W / 2, 180, { size: 34, color: '#24163f', stroke: false });

    // Picture card.
    ui.panel(g, 70, 212, 900, 590, { fill: '#ffffff' });
    drawGameIcon(g, this.meta, 90, 232, 860, 550, this.t);

    // How to play card: goal, controls, then as many tips as fit (tips that
    // don't fit rotate through the last slot).
    ui.panel(g, 1000, 212, 850, 590, { fill: '#fff8ec' });
    ui.text(g, 'How to play', 1425, 258, { size: 48, color: '#ff6fb1' });
    let y = 318;
    const goalLines = ui.wrap(g, this.meta.goal || '', 770, 36, 700);
    goalLines.forEach((l) => { ui.text(g, l, 1040, y, { size: 36, align: 'left', color: '#24163f', stroke: false, weight: 700 }); y += 44; });
    y += 10;
    const controls = this.meta.controls || [];
    const rowH = controls.length > 4 ? 48 : 56;
    for (const [btn, label] of controls) {
      ui.glyph(g, btn, 1066, y, rowH - 8);
      ui.text(g, label, 1108, y + 2, { size: rowH > 50 ? 32 : 28, align: 'left', color: '#24163f', stroke: false, weight: 600, maxWidth: 710 });
      y += rowH;
    }
    y += 6;
    const tips = (this.meta.tips || []).map((tip) => ui.wrap(g, tip, 740, 26, 600));
    const bottom = 772;
    const fit = [];
    let yy = y;
    for (const lines of tips) { if (yy + lines.length * 31 > bottom) break; fit.push(lines); yy += lines.length * 31 + 6; }
    if (fit.length < tips.length && fit.length > 0) {
      // Rotate the remaining tips through the last visible slot.
      const rest = tips.slice(fit.length - 1);
      const pickT = rest[Math.floor(this.t / 4) % rest.length];
      if (y + fit.slice(0, -1).reduce((a, l) => a + l.length * 31 + 6, 0) + pickT.length * 31 <= bottom + 4) fit[fit.length - 1] = pickT;
    }
    for (const lines of fit) {
      ui.text(g, '★', 1050, y, { size: 28, color: '#ffd23f', strokeWidth: 5 });
      lines.forEach((l) => { ui.text(g, l, 1080, y, { size: 26, align: 'left', color: '#6b5a85', stroke: false, weight: 600 }); y += 31; });
      y += 6;
    }
    if (this.meta.duration) ui.text(g, '⏱ ' + this.meta.duration, 1820, 778, { size: 26, align: 'right', color: '#6b5a85', stroke: false });

    // Host.
    drawHost(g, 170, 215, 150, this.t, this.go !== null ? 'cheer' : 'talk');
    // Glimmer talks in a speech bubble (no spoken audio).
    const line = this.go !== null ? "Here we go!" : this.t < 2.6 ? `Let's play ${this.meta.title}!` : this.ready.every((r, i) => r || session.players[i].isAI) ? 'Ready? Ready!' : "Press A when you're ready!";
    drawSpeech(g, line, 240, 186, 0.8, this.t < 2.6 ? this.t : this.t - 2.6, 0, 1, 'left');

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
      ui.text(g, 'Press A when you are ready!', W / 2, 838, { size: 34, color: '#fff' });
    }
  }
}
