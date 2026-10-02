// Scene manager with a star-iris transition between screens.
//   scenes.register('title', new TitleScene())
//   scenes.go('charselect', data)
// A scene implements enter(data), exit(), update(dt), draw(g).
import { W, H } from './canvas.js';
import { particles } from './particles.js';
import { fx } from './fx.js';
import { starPath } from './emotes.js';
import { ease } from './util.js';

class SceneManager {
  constructor() { this.map = new Map(); this.current = null; this.name = null; this.trans = null; }
  register(name, scene) { this.map.set(name, scene); scene.manager = this; }
  get(name) { return this.map.get(name); }

  go(name, data = {}, { instant = false } = {}) {
    if (this.trans && this.trans.phase === 'out') return; // ignore double requests
    if (instant || !this.current) { this._switch(name, data); return; }
    this.trans = { phase: 'out', t: 0, dur: 0.38, name, data };
  }

  _switch(name, data) {
    if (this.current && this.current.exit) this.current.exit();
    particles.clear(); fx.reset();
    this.name = name;
    this.current = this.map.get(name);
    if (!this.current) throw new Error('Unknown scene ' + name);
    this.current.enter && this.current.enter(data);
  }

  update(dt) {
    if (this.trans) {
      this.trans.t += dt;
      if (this.trans.phase === 'out' && this.trans.t >= this.trans.dur) {
        this._switch(this.trans.name, this.trans.data);
        this.trans = { phase: 'in', t: 0, dur: 0.42 };
      } else if (this.trans.phase === 'in' && this.trans.t >= this.trans.dur) {
        this.trans = null;
      }
    }
    // Scenes keep running under the transition (but only take input once it's open).
    if (this.current) this.current.update(dt, !this.trans || this.trans.phase === 'in');
  }

  draw(g) {
    if (this.current) this.current.draw(g);
    if (this.current && !this.current.drawsParticles) particles.draw(g);
    if (this.trans) {
      const p = Math.min(1, this.trans.t / this.trans.dur);
      const k = this.trans.phase === 'out' ? 1 - ease.inCubic(p) : ease.outCubic(p);
      // Star-shaped iris: fill everything outside a growing star.
      const r = k * Math.hypot(W, H) * 0.9;
      g.save();
      g.beginPath();
      g.rect(0, 0, W, H);
      g.translate(W / 2, H / 2);
      g.rotate((1 - k) * 1.2);
      if (r > 1) { starPath(g, r, 0.55); }
      g.fillStyle = '#2a1650';
      g.fill('evenodd');
      g.restore();
    }
  }
  get inputOpen() { return !this.trans || this.trans.phase === 'in'; }
}

export const scenes = new SceneManager();
