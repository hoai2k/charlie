// Glimmer, the fairy host who presents every minigame. Uses generated art
// (character asset 'glimmer') when it exists; until then a vector stand-in.
import { getBaseImage, Actor } from './sprites.js';
import { charById } from '../data/characters.js';
import { TAU } from './util.js';
import * as ui from './ui.js';

let hostActor = null;

/** Draw Glimmer hovering at (x, y) (feet point), about `h` px tall. */
export function drawHost(g, x, y, h, t, mood = 'talk') {
  if (charById('glimmer') && getBaseImage('glimmer')) {
    if (!hostActor) hostActor = new Actor('glimmer');
    hostActor.x = x; hostActor.y = y; hostActor.scale = h / hostActor.leader.h;
    hostActor.setPose(mood === 'cheer' ? 'celebrate' : mood === 'talk' ? 'idle' : mood);
    hostActor.update(1 / 60);
    hostActor.draw(g, { shadow: false });
    return;
  }
  // Vector stand-in: round fairy with pink hair, wings and a star wand.
  const s = h / 200, bob = Math.sin(t * 2.5) * 8;
  g.save(); g.translate(x, y - 100 * s + bob); g.scale(s, s);
  g.lineWidth = 5; g.strokeStyle = '#24163f';
  // wings
  const flap = Math.sin(t * 18) * 0.25;
  for (const side of [-1, 1]) {
    g.save(); g.scale(side, 1); g.rotate(-0.4 + flap);
    g.fillStyle = 'rgba(190,240,255,0.85)';
    g.beginPath(); g.ellipse(48, -30, 46, 26, -0.5, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(40, 12, 30, 18, 0.4, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  // dress
  g.fillStyle = '#b77bff';
  g.beginPath(); g.moveTo(-30, 0); g.lineTo(30, 0); g.lineTo(46, 80); g.quadraticCurveTo(0, 96, -46, 80); g.closePath(); g.fill(); g.stroke();
  // head + hair
  g.fillStyle = '#ff8fd0'; g.beginPath(); g.arc(0, -46, 52, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffe2c8'; g.beginPath(); g.arc(0, -36, 40, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff8fd0'; g.beginPath(); g.ellipse(0, -66, 46, 22, 0, Math.PI, TAU); g.fill();
  // face
  const blink = (t % 3.2) > 3.05;
  g.fillStyle = '#24163f';
  if (blink) { g.fillRect(-20, -38, 14, 4); g.fillRect(6, -38, 14, 4); }
  else { g.beginPath(); g.ellipse(-13, -36, 7, 10, 0, 0, TAU); g.ellipse(13, -36, 7, 10, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-11, -40, 3, 0, TAU); g.arc(15, -40, 3, 0, TAU); g.fill(); }
  g.fillStyle = '#ff7aa8'; g.beginPath(); g.arc(-26, -22, 7, 0, TAU); g.arc(26, -22, 7, 0, TAU); g.fill();
  g.strokeStyle = '#24163f'; g.lineWidth = 4; g.beginPath();
  if (mood === 'cheer' || mood === 'talk') g.arc(0, -22, 10, 0.15 * Math.PI, 0.85 * Math.PI); else g.arc(0, -10, 8, 1.2 * Math.PI, 1.8 * Math.PI);
  g.stroke();
  // wand
  g.save(); g.translate(46, 10); g.rotate(-0.6 + Math.sin(t * 3) * 0.25);
  g.strokeStyle = '#24163f'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -60); g.stroke();
  g.translate(0, -70); g.rotate(t * 1.5);
  g.fillStyle = '#ffd23f'; g.lineWidth = 4;
  g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 20; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.restore();
}

/** Speech bubble from the host. (x, y) is the bubble's tail point. */
export function hostBubble(g, str, x, y, w = 700, size = 38) {
  const lines = ui.wrap(g, str, w - 60, size, 700);
  const h = lines.length * size * 1.25 + 40;
  const bx = x + 20, by = y - h - 10;
  ui.panel(g, bx, by, w, h, { r: 30, fill: '#ffffff' });
  g.save(); g.fillStyle = '#fff'; g.strokeStyle = '#24163f'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(bx + 40, by + h - 3); g.lineTo(x, y + 6); g.lineTo(bx + 90, by + h - 3); g.fill(); g.stroke();
  g.fillRect(bx + 36, by + h - 9, 58, 8);
  g.restore();
  lines.forEach((l, i) => ui.text(g, l, bx + 30, by + 20 + size * 0.62 + i * size * 1.25, { size, align: 'left', color: '#24163f', stroke: false, weight: 700 }));
}
