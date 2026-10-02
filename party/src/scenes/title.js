// Title screen: bouncy "Charlie Party" logo, the whole cast parading across
// the hills, and an arcade PRESS START. Any button/key/click starts: it asks
// for fullscreen and turns the sound on.
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, unlockAudio, host } from '../engine/audio.js';
import { Actor } from '../engine/sprites.js';
import { art } from '../engine/art.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { shell } from '../engine/shell.js';
import * as ui from '../engine/ui.js';
import { drawHeartShape, drawStarShape } from '../engine/emotes.js';
import { CHARACTERS } from '../data/characters.js';
import { rand, pick, TAU, ease } from '../engine/util.js';

const LOGO = 'Charlie Party';

export class TitleScene {
  enter() {
    this.t = 0;
    this.leaving = false;
    music.play('title');
    // Parade: everyone walks right along the hill, wrapping around.
    const spacing = 250;
    this.parade = CHARACTERS.map((c, i) => {
      const a = new Actor(c.id, { scale: 0.82, x: i * spacing - 200, y: 0 });
      a.facing = 1; a.speed = 0.6; a.setPose('walk'); a.snap();
      return a;
    });
    this.paradeLen = CHARACTERS.length * spacing;
    this.balloons = Array.from({ length: 14 }, () => this.newBalloon(rand(H)));
  }

  newBalloon(y = H + 100) {
    return { x: rand(W), y, vy: rand(40, 90), color: pick(RAINBOW), sway: rand(TAU), r: rand(28, 46) };
  }

  groundY(x) { return 940 + Math.sin(x * 0.004 + 1) * 26 + Math.sin(x * 0.011) * 8; }

  update(dt, inputOpen) {
    this.t += dt;
    for (const b of this.balloons) {
      b.y -= b.vy * dt; b.sway += dt;
      if (b.y < -150) Object.assign(b, this.newBalloon());
    }
    for (const a of this.parade) {
      a.x += 95 * dt;
      if (a.x > W + 200) { a.x -= this.paradeLen; a.snap(); }
      a.y = this.groundY(a.x);
      if (a.currentPose === 'walk' && Math.random() < dt * 0.08) a.playOnce('cheer', 0.5, 'walk');
      a.update(dt);
    }
    if (Math.random() < dt * 3) particles.trail(rand(W), rand(H * 0.6), { type: 'sparkle', colors: ['#ffffff', '#fff6a8'] });
    if (!inputOpen || this.leaving || this.t < 0.4) return;
    const c = input.humans().find((h) => h.anyButtonPressed());
    const p = input.pointer.pressed;
    if (c || p) this.start();
  }

  start() {
    this.leaving = true;
    shell.wantFullscreen = true;
    shell.tryFullscreen();
    unlockAudio();
    music.play('title', { restart: true });
    sfx('join'); setTimeout(() => sfx('star'), 120);
    setTimeout(() => host('charlie-party'), 150);
    fx.flash('#ffffff', 0.3);
    particles.burst(W / 2, 760, { type: 'star', count: 30 });
    particles.burst(W / 2, 760, { type: 'confetti', count: 60 });
    for (const a of this.parade) a.playOnce('celebrate', 1.2, 'walk');
    setTimeout(() => this.manager.go('charselect'), 650);
  }

  draw(g) {
    // Sky + rotating sun rays.
    ui.sky(g, '#ff9fd2', '#ffe9b8');
    g.save(); g.translate(W / 2, 380); g.rotate(this.t * 0.05);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 16; i++) {
      g.rotate(TAU / 16);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-70, -1400); g.lineTo(70, -1400); g.closePath(); g.fill();
    }
    g.restore();
    const bg = art('ui/title-bg');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    // Clouds.
    for (let i = 0; i < 6; i++) {
      const x = ((i * 380 + this.t * (14 + i * 3)) % (W + 400)) - 200;
      ui.cloud(g, x, 140 + (i % 3) * 120, 0.8 + (i % 2) * 0.5, '#ffffff', 0.75);
    }
    // Balloons.
    for (const b of this.balloons) {
      const x = b.x + Math.sin(b.sway) * 20;
      g.save();
      g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, b.y + b.r); g.quadraticCurveTo(x + 10, b.y + b.r + 40, x - 4, b.y + b.r + 80); g.stroke();
      g.fillStyle = b.color; g.strokeStyle = '#24163f'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(x, b.y, b.r * 0.85, b.r, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(x - b.r * 0.3, b.y - b.r * 0.4, b.r * 0.18, b.r * 0.3, -0.5, 0, TAU); g.fill();
      g.restore();
    }
    // Hills.
    ui.hills(g, 860, '#b7f0a8', 40, 0.003, this.t * 0.1);
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, this.groundY(x));
    g.lineTo(W, H); g.closePath(); g.fillStyle = '#7fdc8a'; g.fill();
    g.lineWidth = 6; g.strokeStyle = '#5bbf6a'; g.stroke();
    // Little flowers on the hill.
    for (let i = 0; i < 26; i++) {
      const x = (i * 157) % W, y = this.groundY(x) + 30 + (i % 3) * 30;
      g.fillStyle = RAINBOW[i % RAINBOW.length];
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 8, y + Math.sin(k * 1.26) * 8, 6, 0, TAU); g.fill(); }
      g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
    }
    // Parade.
    for (const a of this.parade) a.draw(g);

    // Logo.
    const logo = art('ui/logo');
    const appear = ease.outBack(Math.min(1, this.t / 0.8));
    if (logo) {
      g.save(); g.translate(W / 2, 330); g.scale(appear, appear);
      const s = Math.min(1300 / logo.width, 460 / logo.height);
      g.drawImage(logo, (-logo.width * s) / 2, (-logo.height * s) / 2, logo.width * s, logo.height * s);
      g.restore();
    } else {
      this.drawLogo(g, appear);
    }

    // PRESS START.
    const blink = Math.floor(this.t * 2.2) % 2 === 0 || this.leaving;
    const pulse = 1 + Math.sin(this.t * 6) * 0.04;
    g.save(); g.translate(W / 2, 680); g.scale(pulse, pulse);
    ui.panel(g, -300, -58, 600, 116, { r: 58, fill: blink ? '#ffd23f' : '#ffe98a', lineWidth: 8 });
    ui.text(g, 'PRESS START', 0, 4, { size: 72, color: blink ? '#ff4d6d' : '#ff8fa8', weight: 800, strokeWidth: 12, stroke: '#24163f' });
    g.restore();
    if (input.connectedPadCount() === 0 && this.t > 1.5) {
      ui.text(g, 'Plug in an Xbox controller and press any button — or press any key', W / 2, 770, { size: 30, color: '#fff', strokeWidth: 6 });
    }
  }

  drawLogo(g, appear) {
    const size = 190;
    g.save();
    g.translate(W / 2, 320);
    g.scale(appear, appear);
    g.font = `800 ${size}px ${ui.FONT}`;
    const words = LOGO.split(' ');
    const lineY = [-95, 95];
    words.forEach((word, wi) => {
      const total = g.measureText(word).width + (word.length - 1) * 6;
      let x = -total / 2;
      [...word].forEach((ch, i) => {
        const w = g.measureText(ch).width;
        const k = wi * 7 + i;
        const bob = Math.sin(this.t * 4 - k * 0.5) * 12;
        const rot = Math.sin(this.t * 2.5 - k * 0.7) * 0.06;
        g.save();
        g.translate(x + w / 2, lineY[wi] + bob);
        g.rotate(rot);
        ui.text(g, ch, 0, 0, { size, color: RAINBOW[k % RAINBOW.length], weight: 800, strokeWidth: 30 });
        g.restore();
        x += w + 6;
      });
    });
    // Decorations.
    g.save(); g.translate(-560, -150); g.rotate(Math.sin(this.t * 2) * 0.2); drawStarShape(g, 80, '#ffd23f'); g.restore();
    g.save(); g.translate(600, 140); g.rotate(Math.sin(this.t * 2 + 1) * 0.2); drawHeartShape(g, 80, '#ff4f8b'); g.restore();
    g.restore();
  }
}
