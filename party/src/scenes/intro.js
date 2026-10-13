import { drawArt } from '../engine/art.js';
// How-to-play screen shown before every minigame (Mario Party style):
// title, picture, goal, controls with button glyphs and tips, then every
// human presses A to ready up (CPUs ready themselves). A game may declare
// meta.options ([{ id, label, choices(), get(), set(v) }], e.g. the rhythm
// games' song and difficulty): shown on the picture card, changed with the
// D-pad (left/right = first option, up/down = second) or by clicking.
// In a party marathon: B (not ready) sits this one game out, A joins back
// in, and Y (twice) skips the game for everyone.
// Molly Party games pick a fairy to play as right here (scenes/molly-seats.js).
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, voice, host } from '../engine/audio.js';
import { Actor, drawPortrait, drawSpeech } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { drawHost, hostBubble } from '../engine/host.js';
import { rand } from '../engine/util.js';
import { particles } from '../engine/particles.js';
import { session, restoreRoster } from '../state.js';
import { gameById } from '../games/index.js';
import { drawGameIcon } from './common.js';
import { MollySeats } from './molly-seats.js';

export class IntroScene {
  enter({ gameId }) {
    restoreRoster();
    this.meta = gameById(gameId);
    this.gameId = gameId;
    this.t = 0;
    this.ready = session.players.map(() => false);
    this.out = session.players.map(() => false);   // sitting this game out (party marathon)
    this.skipAsk = null;                           // time Y was pressed once (press again to skip)
    this.note = null;                              // { text, t } short message under the players
    this.aiReadyAt = session.players.map((p) => (p.isAI ? rand(0.8, 2.2) : Infinity));
    this.go = null;
    this.molly = this.meta.category === 'molly' ? new MollySeats(this.meta) : null;
    if (this.molly) music.molly(); else music.menu();
    const n = session.players.length;
    const spacing = Math.min(220, (W - 160) / n);
    this.actors = session.players.map((p, i) => {
      const a = new Actor(p, { scale: n > 4 ? 0.56 : 0.66, x: W / 2 + (i - (n - 1) / 2) * spacing, y: 1048 });
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
      if (this.go > 0.9) {
        this.manager.go('play', { gameId: this.gameId, playing: this.molly ? this.molly.players() : session.players.filter((p, i) => !this.out[i]) });
      }
      return;
    }
    if (this.said === 0 && this.t > 0.3) { this.said = 1; const last = session.partyMode && session.partyMode.round === session.partyMode.games.length - 1; host(last ? 'last-game' : 'title/' + this.gameId); }
    if (this.molly) { this.updateMolly(dt, inputOpen); return; }
    if (this.said === 1 && this.t > 2.2 && session.players.some((p, i) => !p.isAI && !this.ready[i])) { this.said = 2; host('press-a'); }
    session.players.forEach((p, i) => {
      if (!this.ready[i] && this.t > this.aiReadyAt[i]) this.setReady(i, true);
    });
    if (!inputOpen) return;
    const opts = this.meta.options || [];
    for (const p of session.players) {
      if (p.isAI) continue;
      const nav = p.ctrl.nav;
      if (nav.x && opts[0]) this.stepOption(opts[0], nav.x);
      if (nav.y && opts[1]) this.stepOption(opts[1], -nav.y);
    }
    for (const r of this.optionRects || []) if (input.clicked(r)) { this.stepOption(r.opt, r.dir); return; }
    if (this.note) { this.note.t += dt; if (this.note.t > 2.4) this.note = null; }
    if (this.skipAsk !== null && this.t - this.skipAsk > 3) this.skipAsk = null;
    for (const p of session.players) {
      if (p.isAI) continue;
      const i = p.index;
      if (session.partyMode && p.ctrl.pressed('y')) {
        if (this.skipAsk !== null) { this.skipGame(); return; }
        this.skipAsk = this.t; sfx('select');
        continue;
      }
      if (p.ctrl.pressed('a') && this.out[i]) this.setOut(i, false);
      else if (p.ctrl.pressed('a') && !this.ready[i]) this.setReady(i, true);
      else if (p.ctrl.pressed('b')) {
        if (this.ready[i]) this.setReady(i, false);
        else if (session.partyMode) { if (!this.out[i]) this.setOut(i, true); }   // a marathon only exits from its pause menu
        else { sfx('back'); this.manager.go('gameselect', { show: this.gameId }); return; }
      }
    }
    // Mouse / touch: clicking a player toggles their ready; a click anywhere
    // else readies the next human who isn't ready yet.
    let clickUsed = false;
    for (const p of session.players) {
      if (p.isAI) continue;
      const a = this.actors[p.index];
      if (input.clicked({ x: a.x - 90, y: a.y - a.height - 90, w: 180, h: a.height + 100 })) { if (this.out[p.index]) this.setOut(p.index, false); else this.setReady(p.index, !this.ready[p.index]); clickUsed = true; break; }
    }
    if (input.pointer.pressed && !clickUsed) {
      const next = session.players.find((p) => !p.isAI && !this.ready[p.index] && !this.out[p.index]);
      if (next) this.setReady(next.index, true);
    }
    // Keyboard players who aren't bound (e.g. only gamepads joined) can still nudge with Enter.
    if (this.ready.every((r, i) => r || this.out[i])) { this.go = 0; sfx('go'); }
  }

  updateMolly(dt, inputOpen) {
    if (this.skipAsk !== null && this.t - this.skipAsk > 3) this.skipAsk = null;
    if (inputOpen && session.partyMode && this.molly.humans.some((s) => s.ctrl.pressed('y'))) {
      if (this.skipAsk !== null) { this.skipGame(); return; }
      this.skipAsk = this.t; sfx('select');
    }
    const r = this.molly.update(dt, inputOpen);
    if (r === 'back') {
      if (session.partyMode) this.molly.note = { text: 'Somebody has to play! (Y Y skips this game)', t: 0 };
      else this.manager.go('gameselect', { show: this.gameId });
    } else if (r === 'go') { this.go = 0; sfx('go'); }
  }

  /** Sit this game out (B) or join back in (A). Someone human has to play, and the game needs its minimum. */
  setOut(i, on) {
    const a = this.actors[i];
    if (on) {
      const left = session.players.filter((p, j) => j !== i && !this.out[j]);
      if (!left.some((p) => !p.isAI)) { sfx('error'); this.note = { text: 'Somebody has to play! (Y Y skips this game)', t: 0 }; return; }
      if (left.length < (this.meta.minPlayers || 1)) { sfx('error'); this.note = { text: `This game needs ${this.meta.minPlayers} players`, t: 0 }; return; }
      this.out[i] = true; this.ready[i] = false;
      a.setPose('sit'); sfx('back');
    } else {
      this.out[i] = false;
      a.playOnce('wave', 0.6, 'idle');
      this.setReady(i, true);
    }
  }

  /** Y twice: skip this game and go to the next one in the marathon. */
  skipGame() {
    const pm = session.partyMode;
    sfx('whoosh');
    pm.round++;
    const next = pm.games[pm.round];
    if (next) this.manager.go('intro', { gameId: next });
    else this.manager.go('trophy');
  }

  stepOption(opt, dir) {
    const ch = opt.choices();
    if (ch.length < 2) { sfx('error'); return; }
    const i = Math.max(0, ch.findIndex((c) => c.value === opt.get()));
    opt.set(ch[(i + dir + ch.length) % ch.length].value);
    sfx('move');
  }

  drawOptions(g) {
    const opts = this.meta.options || [];
    this.optionRects = [];
    if (!opts.length) return;
    const y = 742, h = 60, gap = 16, w = (860 - gap * (opts.length - 1)) / opts.length;
    opts.forEach((opt, k) => {
      const x = 90 + k * (w + gap), ch = opt.choices();
      const cur = ch.find((c) => c.value === opt.get()) || ch[0];
      ui.panel(g, x, y - h / 2, w, h, { r: 30, fill: 'rgba(255,248,236,0.94)', lineWidth: 4, shadow: false });
      ui.text(g, `${opt.label}: ${cur ? cur.label : '-'}`, x + w / 2, y + 2, { size: 28, color: '#24163f', stroke: false, weight: 800, maxWidth: w - 120 });
      for (const dir of [-1, 1]) {
        const ax = dir < 0 ? x + 34 : x + w - 34;
        ui.text(g, dir < 0 ? '◀' : '▶', ax, y + 2, { size: 28, color: '#ff6fb1', stroke: false });
        this.optionRects.push({ x: ax - 30, y: y - h / 2, w: 60, h, opt, dir });
      }
    });
    ui.text(g, opts.length > 1 ? `D-pad ◀ ▶ ${opts[0].label.toLowerCase()} · ▲ ▼ ${opts[1].label.toLowerCase()}` : `D-pad ◀ ▶ ${opts[0].label.toLowerCase()}`, 520, y - 46, { size: 22, color: '#fff', strokeWidth: 5 });
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
    this.drawOptions(g);

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
    const line = this.go !== null ? "Here we go!" : this.molly ? (this.t < 2.6 ? `Let's play ${this.meta.title}!` : 'Pick your fairy!') : this.t < 2.6 ? `Let's play ${this.meta.title}!` : this.ready.every((r, i) => r || this.out[i] || session.players[i].isAI) ? 'Ready? Ready!' : "Press A when you're ready!";
    drawSpeech(g, line, 240, 186, 0.8, this.t < 2.6 ? this.t : this.t - 2.6, 0, 1, 'left');

    // Players + ready state.
    if (this.molly) {
      this.molly.draw(g, this.go !== null);
      if (this.go !== null) ui.banner(g, "Let's go!", this.go, { y: 520, size: 160 });
      else if (this.skipAsk !== null) ui.hints(g, [['y', 'Press Y again to skip this game']], W / 2, 828, { size: 34 });
      return;
    }
    this.actors.forEach((a, i) => {
      const p = session.players[i];
      a.alpha = this.out[i] ? 0.45 : 1;
      a.draw(g, { ring: this.out[i] ? null : p.color });
      const ty = a.y - a.height - 34;
      if (this.out[i]) {
        ui.panel(g, a.x - 82, ty - 40, 164, 52, { r: 26, fill: '#b9b0c9', lineWidth: 4, shadow: false });
        ui.text(g, 'Sitting out', a.x, ty - 13, { size: 26, strokeWidth: 5 });
        ui.glyph(g, 'a', a.x - 34, ty + 34, 36);
        ui.text(g, 'Join', a.x + 14, ty + 36, { size: 24, color: p.color, strokeWidth: 5 });
      } else if (this.ready[i]) {
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
    else if (this.note) ui.text(g, this.note.text, W / 2, 828, { size: 32, color: '#ffd23f' });
    else if (this.skipAsk !== null) ui.hints(g, [['y', 'Press Y again to skip this game']], W / 2, 828, { size: 34 });
    else if (session.partyMode && this.t > 0.6) {
      ui.hints(g, [['a', 'Ready'], ['b', 'Sit this one out'], ['y', 'Skip this game']], W / 2, 828, { size: 30 });
    } else if (this.t > 0.6 && this.ready.some((r, i) => !r && !session.players[i].isAI)) {
      ui.text(g, 'Press A when you are ready!', W / 2, 828, { size: 30, color: '#fff' });
    }
  }
}
