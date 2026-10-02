import { drawArt } from '../engine/art.js';
// Results: podium ceremony. Winners celebrate (with a crown), the last place
// pouts under a rain cloud, everyone's stars fly into the session tally.
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, voice, host } from '../engine/audio.js';
import { Actor } from '../engine/sprites.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import * as ui from '../engine/ui.js';
import { drawStarShape } from '../engine/emotes.js';
import { ease, clamp, TAU } from '../engine/util.js';
import { session } from '../state.js';
import { gameById } from '../games/index.js';
import { Camera } from '../engine/camera.js';
import { charById } from '../data/characters.js';

export const STARS_BY_PLACE = [3, 2, 1];
const PODIUM_H = [210, 140, 80];

export function drawCrown(g, x, y, s, color = '#ffd23f') {
  g.save(); g.translate(x, y);
  g.fillStyle = color; g.strokeStyle = '#24163f'; g.lineWidth = Math.max(2, s * 0.08); g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-s, 0); g.lineTo(-s, -s * 0.7); g.lineTo(-s * 0.5, -s * 0.3); g.lineTo(0, -s * 0.95);
  g.lineTo(s * 0.5, -s * 0.3); g.lineTo(s, -s * 0.7); g.lineTo(s, 0); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, -s * 0.28, s * 0.14, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

export class ResultsScene {
  enter({ gameId, result }) {
    this.meta = gameById(gameId);
    this.gameId = gameId;
    this.result = result;
    this.t = 0;
    const players = session.players;
    const pl = result.placements;
    const n = players.length;
    this.showcase = result.showcase;
    // Stars earned.
    this.earned = players.map((p, i) => {
      if (this.showcase) return 1 + (result.highlight === i ? 1 : 0);
      return STARS_BY_PLACE[pl[i] - 1] || 0;
    });
    this.starsGiven = players.map(() => 0);
    this.baseStars = players.map((p) => p.stars);
    for (const [i, p] of players.entries()) p.stars += this.earned[i];
    session.played.push(gameId);
    session.lastGameId = gameId;

    // Podium order: 1st in the middle, then alternate left/right.
    const order = players.map((p, i) => i).sort((a, b) => pl[a] - pl[b] || a - b);
    const slots = [];
    order.forEach((idx, k) => { if (k % 2 === 0) slots.push(idx); else slots.unshift(idx); });
    const spacing = Math.min(300, (W - 200) / n);
    const worst = Math.max(...pl);
    this.entries = slots.map((idx, k) => {
      const place = pl[idx];
      const x = W / 2 + (k - (n - 1) / 2) * spacing;
      const podium = this.showcase ? 60 : (PODIUM_H[place - 1] ?? 30);
      const floor = 860;
      const a = new Actor(players[idx].charId, { scale: n > 5 ? 0.9 : 1.1, x, y: floor - podium });
      a.z = 900 + k * 120; a.vz = 0; a.snap();
      const winner = this.showcase || place === 1;
      const loser = !this.showcase && n > 1 && place === worst && place !== 1;
      if (winner) a.attach((gg, info) => drawCrown(gg, info.head.x, info.head.y + 4, info.h * 0.11), {});
      return { idx, place, x, floor, podium, actor: a, landed: false, winner, loser, delay: 0.15 + k * 0.12 };
    });
    this.revealAt = 0.15 + n * 0.12 + 0.5;
    this.revealed = false;
    this.starJingle = false;
    this.camera = new Camera();
    this.drawsParticles = true;
    this.winners = this.entries.filter((e) => e.winner);
    music.stop(0.2);
    this.leaving = false;
    sfx('jingle/results');
    setTimeout(() => host(this.showcase ? 'great-job' : 'winner-is'), 300);
  }

  headline() {
    if (this.showcase) return this.result.title || "Everyone's a star!";
    if (session.players.length === 1) return this.winners.length ? (this.result.title || 'You did it!') : 'So close!';
    if (!this.winners.length) return this.result.title || 'Great game!';
    if (this.winners.length === 1) { const c = charById(session.players[this.winners[0].idx].charId); return `${c.name} ${c.plural ? 'win' : 'wins'}!`; }
    if (this.winners.length === session.players.length) return "It's a tie!";
    return 'Tie for first!';
  }

  update(dt, inputOpen) {
    this.t += dt;
    this.camera.update(dt); this.camera.tickPunch(dt);
    for (const e of this.entries) {
      const a = e.actor;
      if (this.t > e.delay && !e.landed) {
        a.vz -= 2600 * dt; a.z += a.vz * dt;
        if (a.z <= 0) {
          a.z = 0; e.landed = true; a.squash(0.5); sfx('land');
          particles.burst(a.x, a.y, { type: 'dust', count: 8 });
        }
      }
      a.update(dt);
    }
    if (!this.revealed && this.t > this.revealAt) {
      this.revealed = true;
      sfx('fanfare'); setTimeout(() => sfx('cheer'), 600);
      if (this.showcase) host('everyone-star', { interrupt: true });
      else if (this.winners.length === 1) host('name/' + session.players[this.winners[0].idx].charId, { interrupt: true });
      else host('tie', { interrupt: true });
      if (this.showcase && this.result.highlight != null) setTimeout(() => { sfx('jingle/showstopper'); host('showstopper'); }, 1800);
      particles.confettiRain(W, 160);
      fx.flash('#fff6d0', 0.3);
      // Camera punch on the winner (center of the winners when tied).
      if (this.winners.length && this.winners.length < this.entries.length) {
        const wx = this.winners.reduce((a, e) => a + e.x, 0) / this.winners.length;
        const wy = this.winners[0].floor - this.winners[0].podium - 110;
        this.camera.punch(wx, wy, 1.32, 1.3);
      }
      for (const e of this.entries) {
        const p = session.players[e.idx];
        const lines = charById(p.charId).lines || {};
        if (e.winner) { e.actor.setPose('celebrate'); if (!this.showcase || e.idx === this.result.highlight) e.actor.say(lines.win || 'Yay!', 2.6, 'yay'); else voice(p.charId, 'yay'); particles.burst(e.actor.x, e.actor.y - 120, { type: 'star', count: 14 }); }
        else if (e.loser) { e.actor.setPose('pout'); }
        else e.actor.setPose('cheer');
        if (e.loser) setTimeout(() => e.actor.say(lines.lose || 'Aww…', 2.4, 'aww'), 900);
      }
      if (this.entries.some((e) => e.loser)) setTimeout(() => sfx('lose'), 1300);
    }
    // Non-winners who aren't last give little hops now and then.
    if (this.revealed) {
      for (const e of this.entries) {
        if (!e.winner && !e.loser && e.actor.currentPose !== 'cheer' && Math.random() < dt * 0.5) e.actor.playOnce('cheer', 0.5, 'idle');
        if (!e.winner && !e.loser && e.actor.currentPose === 'cheer' && e.actor.poseTime > 0.5) e.actor.setPose('idle');
      }
    }
    // Stars fly in one at a time.
    const starStart = this.revealAt + 0.8;
    if (this.t > starStart) {
      const k = Math.floor((this.t - starStart) / 0.28);
      session.players.forEach((p, i) => {
        const want = Math.min(this.earned[i], k + 1);
        if (this.starsGiven[i] < want) { if (!this.starJingle) { this.starJingle = true; sfx('jingle/star-award'); } this.starsGiven[i] = want; sfx('collect', { step: this.starsGiven[i] * 2 }); }
      });
    }
    const done = this.t > starStart + 0.3 * Math.max(...this.earned, 1) + 0.5;
    if (!inputOpen || this.leaving || !done) return;
    const c = input.humans().find((h) => h.pressed('a') || h.pressed('y') || h.pressed('b'));
    // Mouse / touch: "[Y] Play again" replays, any other click continues.
    const hint = ui.clickedHint();
    const click = input.pointer.pressed && this.t > this.revealAt + 2.1;
    if (c || click || (new URLSearchParams(location.search).has('auto') && this.t > 6)) {
      this.leaving = true;
      sfx('select');
      if ((c && c.pressed('y')) || (!c && hint === 'y')) { this.manager.go('intro', { gameId: this.gameId }); return; }
      if (session.partyMode) {
        session.partyMode.round++;
        const next = session.partyMode.games[session.partyMode.round];
        if (next) { this.manager.go('intro', { gameId: next }); return; }
        this.manager.go('trophy'); return;
      }
      this.manager.go('gameselect');
    }
  }

  draw(g) {
    g.save();
    this.camera.apply(g);
    // Stage backdrop.
    const gr = g.createRadialGradient(W / 2, 300, 100, W / 2, 400, 1200);
    gr.addColorStop(0, '#ffcde6'); gr.addColorStop(1, '#7b4bc9');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    drawArt(g, 'bg/results', 0, 0, W, H, { anchor: 'topleft', fit: 'cover' });
    // Spotlight beams.
    g.save(); g.globalAlpha = 0.18; g.fillStyle = '#fff6b0';
    for (let i = 0; i < 3; i++) {
      const sx = W / 2 + (i - 1) * 520, sw = 140 + Math.sin(this.t * 1.3 + i) * 30;
      g.beginPath(); g.moveTo(sx - 30, 0); g.lineTo(sx + 30, 0); g.lineTo(W / 2 + (i - 1) * 260 + sw, 900); g.lineTo(W / 2 + (i - 1) * 260 - sw, 900); g.fill();
    }
    g.restore();
    // Curtains.
    for (const side of [-1, 1]) {
      g.save(); g.fillStyle = '#d6336c';
      g.beginPath(); const x0 = side < 0 ? 0 : W;
      g.moveTo(x0, 0); g.lineTo(x0 + side * -230, 0);
      for (let y = 0; y <= H; y += 40) g.lineTo(x0 + side * -(150 + Math.sin(y * 0.02 + this.t) * 12 + (y / H) * 40), y);
      g.lineTo(x0, H); g.closePath(); g.fill(); g.restore();
    }
    g.fillStyle = '#ffb347'; g.fillRect(0, 860, W, 220);
    g.fillStyle = '#e8902c'; g.fillRect(0, 860, W, 14);

    // Podiums.
    for (const e of this.entries) {
      const w = 230 * (session.players.length > 5 ? 0.8 : 1);
      if (e.podium > 0) {
        ui.panel(g, e.x - w / 2, e.floor - e.podium, w, e.podium + 20, { r: 16, fill: ['#ffd23f', '#d9e3f0', '#f0a35e'][e.place - 1] || '#c9b7f0', lineWidth: 5 });
        if (!this.showcase && e.podium > 50) ui.text(g, String(e.place), e.x, e.floor - e.podium / 2 + 10, { size: 64, color: '#fff' });
      }
    }
    for (const e of this.entries.slice().sort((a, b) => a.actor.y - b.actor.y)) e.actor.draw(g);
    // Name + stat + earned stars.
    for (const e of this.entries) {
      const p = session.players[e.idx];
      ui.text(g, p.tag, e.x, e.floor + 40, { size: 34, color: p.color });
      const stat = this.result.stats && this.result.stats[e.idx];
      if (stat) ui.text(g, stat, e.x, e.floor + 82, { size: 30, color: '#24163f', stroke: false, maxWidth: 260 });
      const n = this.starsGiven[e.idx];
      if (n > 0) ui.stars(g, n, e.x, e.floor + 128, 30, { wobble: true });
      if (this.showcase && this.result.highlight === e.idx && this.revealed) {
        const my = e.actor.y - e.actor.height - 110;
        drawArt(g, 'ui/medal', e.x, my - 34, 70, 78, { anchor: 'bottom' });
        ui.text(g, 'Showstopper!', e.x, my, { size: 36, color: '#ffd23f' });
      }
    }
    particles.draw(g);
    g.restore();
    // Headline.
    if (this.revealed) ui.banner(g, this.headline(), this.t - this.revealAt, { y: 210, size: 110 });
    else ui.text(g, this.meta ? this.meta.title : '', W / 2, 210, { size: 80, color: '#fff' });
    // Session tally.
    const totals = session.players.map((p, i) => this.baseStars[i] + this.starsGiven[i]);
    ui.scoreboard(g, session.players, totals, { y: 24, format: (v) => `★ ${v}` });
    if (this.t > this.revealAt + 2.1) { // after the winner punch-in settles
      const list = [['a', session.partyMode ? 'Next game' : 'Continue'], ['y', 'Play again']];
      ui.hints(g, list, W / 2, 1048, { size: 30 });
    }
  }
}
