// Sprite viewer (?scene=sprites): every party entry and the Troll, in any
// pose, with or without generated sprites. Used to check new sprite sets for
// scale, foot anchoring, facing and frame timing before committing them.
//
//   LB / RB or Left / Right   previous / next pose
//   A                          toggle generated sprites <-> base-art fallback
//   X                          walk back and forth (tests facing + followers)
//   Y                          debug overlay (foot anchor, target height, bounds,
//                              test crown on the head anchor, dot on the hand anchor)
//   Up / Down                  zoom
//   B                          back to title (if available)
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { Actor, POSE_NAMES, POSES, getSpriteSet, setForceFallback, isForceFallback, loadedSpriteSets, drawPortrait } from '../engine/sprites.js';
import { ALL_ENTRIES } from '../data/characters.js';
import * as ui from '../engine/ui.js';

export class SpriteViewerScene {
  enter() {
    this.poseIdx = 0;
    this.walk = false;
    this.debug = false;
    this.zoom = 1;
    this.t = 0;
    this.actors = ALL_ENTRIES.map((c) => new Actor(c.id, { scale: c.npc ? 0.75 : 1 }));
    // Debug attachment: a test crown on every head and a dot on every hand.
    for (const a of this.actors) {
      for (let mi = 0; mi < a.members.length; mi++) {
        a.attach((g, info) => {
          if (!this.debug) return;
          const { x, y } = info.head, s = info.h * 0.12;
          g.fillStyle = '#ffd23f'; g.strokeStyle = '#24163f'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s, y - s); g.lineTo(x - s / 2, y - s / 2); g.lineTo(x, y - s * 1.2);
          g.lineTo(x + s / 2, y - s / 2); g.lineTo(x + s, y - s); g.lineTo(x + s, y); g.closePath(); g.fill(); g.stroke();
          g.fillStyle = '#00c2ff'; g.beginPath(); g.arc(info.hand.x, info.hand.y, 6, 0, Math.PI * 2); g.fill(); g.stroke();
        }, { member: mi });
      }
    }
    this.layout();
    const q = new URLSearchParams(location.search).get('pose');
    if (q && POSE_NAMES.includes(q)) this.poseIdx = POSE_NAMES.indexOf(q);
    this.applyPose();
  }
  layout() {
    const cols = 5, cw = W / cols, ch = 250;
    this.actors.forEach((a, i) => {
      a.homeX = cw * (i % cols) + cw / 2;
      a.y = 420 + ch * Math.floor(i / cols);
      a.x = a.homeX; a.snap();
    });
  }
  applyPose() {
    const pose = POSE_NAMES[this.poseIdx];
    for (const a of this.actors) { a._once = null; a.setPose(pose, { restart: true }); a.clearEmotes(); }
  }
  update(dt) {
    this.t += dt;
    for (const c of input.humans()) {
      if (c.pressed('rb') || c.nav.x > 0) { this.poseIdx = (this.poseIdx + 1) % POSE_NAMES.length; this.applyPose(); }
      if (c.pressed('lb') || c.nav.x < 0) { this.poseIdx = (this.poseIdx + POSE_NAMES.length - 1) % POSE_NAMES.length; this.applyPose(); }
      if (c.pressed('a')) setForceFallback(!isForceFallback());
      if (c.pressed('x')) { this.walk = !this.walk; if (!this.walk) this.layout(); }
      if (c.pressed('y')) this.debug = !this.debug;
      if (c.nav.y < 0) this.zoom = Math.min(2.5, this.zoom + 0.1);
      if (c.nav.y > 0) this.zoom = Math.max(0.4, this.zoom - 0.1);
      if (c.pressed('b') && this.manager.get('title')) this.manager.go('title');
    }
    const p = input.pointer;
    if (p.pressed) { this.poseIdx = (this.poseIdx + 1) % POSE_NAMES.length; this.applyPose(); }
    for (const a of this.actors) {
      a.scale = (a.char.npc ? 0.75 : 1) * this.zoom;
      if (this.walk) {
        const vx = Math.cos(this.t * 0.9) * 140;
        a.x = a.homeX + Math.sin(this.t * 0.9) * 140 / 0.9 * 0.5;
        a.moveAnim(vx, 0, 140);
        if (!['walk', 'run', 'idle'].includes(POSE_NAMES[this.poseIdx])) a.setPose(POSE_NAMES[this.poseIdx]);
      }
      a.update(dt);
    }
  }
  draw(g) {
    ui.sky(g, '#bfe9ff', '#fff3fb');
    g.fillStyle = 'rgba(36,22,63,0.06)';
    for (let i = 0; i < 3; i++) g.fillRect(0, 420 + 250 * i, W, 2);
    const pose = POSE_NAMES[this.poseIdx];
    ui.text(g, `Pose: ${pose}`, 40, 46, { size: 48, align: 'left', color: '#ffd23f' });
    ui.text(g, POSES[pose].desc, 40, 96, { size: 26, align: 'left', color: '#fff', strokeWidth: 6 });
    ui.text(g, isForceFallback() ? 'Base art + procedural motion' : `Sprite sets loaded: ${loadedSpriteSets().length}`, W - 40, 46, { size: 30, align: 'right', color: isForceFallback() ? '#ff9f1c' : '#36d17a', strokeWidth: 6 });
    ui.hints(g, [['lb', 'Pose'], ['rb', 'Pose'], ['a', 'Sprites/base'], ['x', 'Walk'], ['y', 'Debug']], W - 40, 96, { size: 28, align: 'right' });

    const sorted = this.actors.slice().sort((a, b) => a.y - b.y);
    for (const a of sorted) {
      a.draw(g);
      if (this.debug) this.drawDebug(g, a);
      const lead = a.char.members[0];
      const src = getSpriteSet(lead.asset) ? 'sprites' : 'base art';
      ui.text(g, `${a.char.name}`, a.homeX, a.y + 34, { size: 24, color: '#24163f', stroke: false });
      ui.text(g, src, a.homeX, a.y + 60, { size: 18, color: src === 'sprites' ? '#1b8f4f' : '#c4560f', stroke: false });
    }
    const pr = 40;
    ALL_ENTRIES.forEach((c, i) => {
      const x = 70 + i * (pr * 2 + 14);
      drawPortrait(g, c.id, x, 190, pr, { expr: ['neutral', 'happy', 'sad'][Math.floor(this.t) % 3] });
    });
  }
  drawDebug(g, a) {
    g.save();
    g.strokeStyle = '#ff0066'; g.lineWidth = 2;
    for (const m of a.members) {
      const h = m.def.h * a.scale;
      g.beginPath(); g.moveTo(m.x - 30, m.y); g.lineTo(m.x + 30, m.y); g.moveTo(m.x, m.y - 10); g.lineTo(m.x, m.y + 10); g.stroke();
      g.setLineDash([6, 6]);
      g.beginPath(); g.moveTo(m.x - 40, m.y - h); g.lineTo(m.x + 40, m.y - h); g.stroke();
      g.setLineDash([]);
    }
    g.strokeStyle = '#0088ff';
    g.beginPath(); g.ellipse(a.x, a.y, a.radius, a.radius * 0.35, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
}
