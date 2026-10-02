// Particle effects. One shared system is drawn above each scene's world
// (the Play scene clears it between minigames).
//
//   particles.burst(x, y, { type: 'confetti', count: 40 })
//   particles.popText(x, y, '+1', '#ffd23f')
//   particles.trail(x, y, { type: 'dust' })     // single particle
//
// Types: confetti, spark, star, heart, dust, smoke, bubble, drop, ring,
// sparkle, petal, text, shard, note

import { rand, pick, TAU } from './util.js';
import { drawHeartShape, drawStarShape, drawSparkleShape, starPath } from './emotes.js';

export const RAINBOW = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff', '#ff6fd0'];

const DEFAULTS = {
  confetti: { speed: [300, 750], life: [1.6, 2.6], gravity: 700, drag: 1.6, size: [10, 18], spin: 10 },
  spark:    { speed: [200, 600], life: [0.25, 0.55], gravity: 300, drag: 3, size: [3, 6] },
  star:     { speed: [150, 420], life: [0.6, 1.1], gravity: 260, drag: 2, size: [14, 26], spin: 6 },
  heart:    { speed: [80, 260], life: [0.8, 1.4], gravity: -120, drag: 2, size: [16, 28] },
  sparkle:  { speed: [40, 200], life: [0.4, 0.9], gravity: -40, drag: 2, size: [14, 26] },
  dust:     { speed: [40, 160], life: [0.35, 0.7], gravity: -30, drag: 4, size: [10, 22] },
  smoke:    { speed: [30, 120], life: [0.6, 1.2], gravity: -60, drag: 2, size: [24, 46] },
  bubble:   { speed: [40, 160], life: [0.8, 1.6], gravity: -120, drag: 1.5, size: [8, 20] },
  drop:     { speed: [200, 500], life: [0.4, 0.8], gravity: 1400, drag: 0.5, size: [6, 12] },
  ring:     { speed: [0, 0], life: [0.45, 0.45], gravity: 0, drag: 0, size: [20, 20] },
  petal:    { speed: [60, 220], life: [1.5, 2.5], gravity: 90, drag: 1.2, size: [10, 16], spin: 4 },
  shard:    { speed: [200, 520], life: [0.5, 0.9], gravity: 1300, drag: 0.6, size: [8, 16], spin: 12 },
  note:     { speed: [60, 180], life: [0.9, 1.4], gravity: -140, drag: 1.5, size: [20, 30] },
  text:     { speed: [0, 0], life: [0.9, 0.9], gravity: 0, drag: 0, size: [44, 44] },
};

class Particles {
  constructor() { this.list = []; this.max = 1500; }
  clear() { this.list = []; }

  burst(x, y, o = {}) {
    const type = o.type || 'spark';
    const d = DEFAULTS[type] || DEFAULTS.spark;
    const n = o.count ?? 20;
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + rand(-(o.spread ?? 0.6), o.spread ?? 0.6) : rand(TAU);
      const sp = rand(...(o.speed || d.speed));
      this.add({
        type, x: x + rand(-(o.jitter || 0), o.jitter || 0), y: y + rand(-(o.jitter || 0), o.jitter || 0),
        vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0),
        life: rand(...(o.life || d.life)), size: rand(...(o.size || d.size)),
        color: o.color || pick(o.colors || RAINBOW), gravity: o.gravity ?? d.gravity, drag: o.drag ?? d.drag,
        rot: rand(TAU), spin: rand(-(d.spin || 0), d.spin || 0), text: o.text,
      });
    }
  }

  trail(x, y, o = {}) { this.burst(x, y, { count: 1, ...o }); }

  /** Floating score text like "+1" or "Nice!" */
  popText(x, y, text, color = '#ffd23f', size = 52) {
    this.add({ type: 'text', x, y, vx: 0, vy: -140, life: 0.95, size, color, gravity: 120, drag: 0, rot: 0, spin: 0, text });
  }
  /** Expanding ring shockwave */
  ring(x, y, color = '#ffffff', size = 120, life = 0.4) {
    this.add({ type: 'ring', x, y, vx: 0, vy: 0, life, size, color, gravity: 0, drag: 0, rot: 0, spin: 0 });
  }
  /** Full-screen confetti shower from the top edge. */
  confettiRain(w = 1920, count = 120) {
    for (let i = 0; i < count; i++) {
      this.add({
        type: 'confetti', x: rand(w), y: rand(-200, -20), vx: rand(-80, 80), vy: rand(100, 400),
        life: rand(2.5, 4), size: rand(10, 18), color: pick(RAINBOW), gravity: 300, drag: 0.6, rot: rand(TAU), spin: rand(-8, 8),
      });
    }
  }

  add(p) {
    p.age = 0; p.maxLife = p.life;
    if (this.list.length >= this.max) this.list.shift();
    this.list.push(p);
  }

  update(dt) {
    for (const p of this.list) {
      p.age += dt;
      p.vy += p.gravity * dt;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    this.list = this.list.filter((p) => p.age < p.maxLife);
  }

  draw(g) {
    for (const p of this.list) {
      const t = p.age / p.maxLife;
      const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      g.save();
      g.globalAlpha = fade;
      g.translate(p.x, p.y);
      switch (p.type) {
        case 'confetti':
          g.rotate(p.rot); g.scale(1, Math.cos(p.age * 9 + p.rot));
          g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); break;
        case 'spark':
          g.fillStyle = p.color; g.beginPath(); g.arc(0, 0, p.size * (1 - t * 0.6), 0, TAU); g.fill(); break;
        case 'star': g.rotate(p.rot); drawStarShape(g, p.size, p.color); break;
        case 'heart': g.scale(1 - t * 0.3, 1 - t * 0.3); drawHeartShape(g, p.size, p.color); break;
        case 'sparkle': g.rotate(p.rot * 0.2); g.scale(Math.sin(t * Math.PI) + 0.1, Math.sin(t * Math.PI) + 0.1); drawSparkleShape(g, p.size, p.color); break;
        case 'dust': case 'smoke':
          g.globalAlpha = fade * (p.type === 'dust' ? 0.55 : 0.4);
          g.fillStyle = p.color.startsWith('#') && p.type === 'dust' ? '#f3e6d8' : p.color;
          if (p.type === 'smoke') g.fillStyle = '#d9d2e6';
          g.beginPath(); g.arc(0, 0, p.size * (0.6 + t * 0.8), 0, TAU); g.fill(); break;
        case 'bubble':
          g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.5; g.fillStyle = 'rgba(180,230,255,0.25)';
          g.beginPath(); g.arc(0, 0, p.size, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(-p.size * 0.35, -p.size * 0.35, p.size * 0.22, 0, TAU); g.fill(); break;
        case 'drop':
          g.rotate(Math.atan2(p.vy, p.vx)); g.fillStyle = p.color;
          g.beginPath(); g.ellipse(0, 0, p.size * 1.3, p.size * 0.6, 0, 0, TAU); g.fill(); break;
        case 'ring':
          g.globalAlpha = 1 - t; g.strokeStyle = p.color; g.lineWidth = 10 * (1 - t) + 1;
          g.beginPath(); g.arc(0, 0, p.size * (0.2 + t), 0, TAU); g.stroke(); break;
        case 'petal':
          g.rotate(p.rot); g.scale(1, Math.cos(p.age * 5)); g.fillStyle = p.color;
          g.beginPath(); g.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, TAU); g.fill(); break;
        case 'shard':
          g.rotate(p.rot); g.fillStyle = p.color; g.strokeStyle = '#24163f'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(-p.size / 2, -p.size / 3); g.lineTo(p.size / 2, -p.size / 2); g.lineTo(0, p.size / 2); g.closePath(); g.fill(); g.stroke(); break;
        case 'note':
          g.fillStyle = p.color; g.font = `900 ${Math.round(p.size)}px Fredoka, system-ui, sans-serif`;
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.age % 0.8 < 0.4 ? '♪' : '♫', 0, 0); break;
        case 'text': {
          const pop = t < 0.15 ? 0.5 + (t / 0.15) * 0.7 : t < 0.25 ? 1.2 - ((t - 0.15) / 0.1) * 0.2 : 1;
          g.scale(pop, pop);
          g.font = `900 ${p.size}px Fredoka, "Baloo 2", system-ui, sans-serif`;
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineJoin = 'round'; g.lineWidth = p.size * 0.22; g.strokeStyle = '#24163f'; g.strokeText(p.text, 0, 0);
          g.fillStyle = p.color; g.fillText(p.text, 0, 0); break;
        }
        default: break;
      }
      g.restore();
    }
  }
}

export const particles = new Particles();
export { starPath };
