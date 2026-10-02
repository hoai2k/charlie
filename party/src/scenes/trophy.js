// Party Marathon finale: the player who earned the most stars across the
// marathon lifts the trophy; everyone else cheers.
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, voice } from '../engine/audio.js';
import { Actor } from '../engine/sprites.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import * as ui from '../engine/ui.js';
import { drawStarShape } from '../engine/emotes.js';
import { session } from '../state.js';
import { charById } from '../data/characters.js';
import { TAU, ease } from '../engine/util.js';
import { drawCrown } from './results.js';

export function drawTrophy(g, x, y, s, t = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineWidth = 8; g.strokeStyle = '#24163f'; g.lineJoin = 'round';
  const gold = g.createLinearGradient(-100, 0, 100, 0);
  gold.addColorStop(0, '#f5a623'); gold.addColorStop(0.5, '#ffe27a'); gold.addColorStop(1, '#e8901a');
  g.fillStyle = gold;
  // handles
  for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * 105, -150, 45, 60, 0, 0, TAU); g.stroke(); }
  // cup
  g.beginPath(); g.moveTo(-110, -230); g.lineTo(110, -230); g.quadraticCurveTo(105, -70, 0, -50); g.quadraticCurveTo(-105, -70, -110, -230); g.closePath(); g.fill(); g.stroke();
  g.fillRect(-18, -55, 36, 60); g.strokeRect(-18, -55, 36, 60);
  g.fillStyle = '#9b5cff'; g.fillRect(-80, 0, 160, 50); g.strokeRect(-80, 0, 160, 50);
  g.save(); g.translate(0, -150); g.rotate(Math.sin(t * 2) * 0.1); drawStarShape(g, 60, '#ffffff'); g.restore();
  g.restore();
}

export class TrophyScene {
  enter() {
    this.t = 0;
    const pm = session.partyMode || { startStars: session.players.map(() => 0) };
    this.gained = session.players.map((p, i) => p.stars - (pm.startStars[i] || 0));
    const best = Math.max(...this.gained);
    this.champs = session.players.map((p, i) => i).filter((i) => this.gained[i] === best);
    const n = session.players.length;
    const others = session.players.map((p, i) => i).filter((i) => !this.champs.includes(i));
    this.actors = [];
    this.champs.forEach((i, k) => {
      const a = new Actor(session.players[i].charId, { scale: 1.3, x: W / 2 + (k - (this.champs.length - 1) / 2) * 260, y: 700 });
      a.setPose('celebrate'); a.snap();
      a.attach((g, info) => drawCrown(g, info.head.x, info.head.y + 4, info.h * 0.12));
      this.actors.push({ a, i, champ: true });
    });
    others.forEach((i, k) => {
      const side = k % 2 ? 1 : -1, slot = Math.floor(k / 2);
      const a = new Actor(session.players[i].charId, { scale: 0.85, x: W / 2 + side * (520 + slot * 200), y: 900 });
      a.setPose('cheer'); a.snap();
      this.actors.push({ a, i, champ: false });
    });
    music.play('victory');
    sfx('fanfare'); setTimeout(() => sfx('cheer'), 500);
    for (const i of this.champs) voice(session.players[i].charId, 'yay');
    session.partyMode = null;
  }

  update(dt, inputOpen) {
    this.t += dt;
    for (const { a, champ } of this.actors) {
      a.update(dt);
      if (!champ && a.poseTime > 0.6) a.playOnce('cheer', 0.6, 'idle');
    }
    if (Math.random() < dt * 4) particles.burst(Math.random() * W, Math.random() * 400, { type: 'confetti', count: 12 });
    if (Math.random() < dt * 1.2) { particles.burst(Math.random() * W, 200 + Math.random() * 300, { type: 'star', count: 18 }); sfx('pop'); }
    if (inputOpen && this.t > 2.5 && (input.anyHumanPressed('a') || input.anyHumanPressed('b') || (new URLSearchParams(location.search).has('auto') && this.t > 6))) {
      sfx('select'); this.manager.go('gameselect');
    }
  }

  draw(g) {
    const gr = g.createRadialGradient(W / 2, 400, 50, W / 2, 500, 1100);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(1, '#ff8fc7');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, 420); g.rotate(this.t * 0.1); g.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 18; i++) { g.rotate(TAU / 18); g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -1300); g.lineTo(60, -1300); g.fill(); }
    g.restore();
    g.fillStyle = '#ffb347'; g.fillRect(0, 900, W, 180);
    ui.panel(g, W / 2 - 360, 700, 720, 200, { r: 20, fill: '#ffd23f' });
    const s = ease.outBack(Math.min(1, this.t / 0.8));
    drawTrophy(g, W / 2, 470 - Math.sin(this.t * 2) * 10, 1.1 * s, this.t);
    for (const { a } of this.actors.slice().sort((p, q) => p.a.y - q.a.y)) a.draw(g);
    const chars = this.champs.map((i) => charById(session.players[i].charId));
    const names = chars.map((c) => c.name);
    const title = names.length === 1 ? (chars[0].plural ? `${names[0]} are the Party Champions!` : `${names[0]} is the Party Champion!`) : 'Party Champions!';
    ui.banner(g, title, this.t, { y: 110, size: names.length === 1 && names[0].length > 10 ? 84 : 100 });
    this.actors.forEach(({ a, i }) => {
      ui.text(g, `${session.players[i].tag}  +${this.gained[i]}★`, a.x, a.y + 46, { size: 32, color: session.players[i].color });
    });
    if (this.t > 2.5) ui.hints(g, [['a', 'Back to the games']], W / 2, 1046, { size: 34 });
  }
}
