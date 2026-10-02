import { drawNpcSprite } from '../../engine/npc-art.js';
// Professor Hoot: a friendly, wise owl teacher with a wizard hat and round
// spectacles. Procedural until the NPC canonical + sprites exist
// (prop/professor-hoot is used when generated art is available).
import { drawArt } from '../../engine/art.js';
import { drawStarShape } from '../../engine/emotes.js';
import { TAU } from '../../engine/util.js';

const NAVY = '#24163f';

/**
 * Draw Hoot standing with feet at (x, y). s = 1 is ~330 px tall (hat included).
 * o: { t, flap 0..1 (wings up), point 0..1 (right wing points at the board),
 *      tilt (head radians), mood 'happy'|'laugh'|'wow', talk 0..1 (beak open),
 *      blink 0..1, look [-1..1, -1..1] }
 */
export function drawHoot(g, x, y, s, o = {}) {
  const pose = o.point > 0.2 ? 'point' : o.flap > 0.2 ? 'clap' : o.talk > 0.2 ? 'talk' : o.mood === 'laugh' ? 'laugh' : 'idle';
  if (drawNpcSprite(g, 'professor-hoot', x, y, 340 * s, o.t || 0, { pose, rotation: o.tilt || 0 })) return;

  if (drawArt(g, 'prop/professor-hoot', x, y, 260 * s, 340 * s, { anchor: 'bottom' })) return;
  const t = o.t || 0;
  const flap = o.flap || 0;
  const bob = Math.sin(t * 2.2) * 3;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;

  // shadow
  g.fillStyle = 'rgba(20,10,40,0.25)'; g.beginPath(); g.ellipse(0, 0, 70, 12, 0, 0, TAU); g.fill();

  g.translate(0, bob * 0.3);
  // feet
  g.fillStyle = '#ffab3d';
  for (const fx of [-24, 24]) {
    g.beginPath(); g.ellipse(fx - 8, -4, 8, 6, 0, 0, TAU); g.ellipse(fx, -2, 8, 6, 0, 0, TAU); g.ellipse(fx + 8, -4, 8, 6, 0, 0, TAU); g.fill(); g.stroke();
  }
  g.translate(0, bob * 0.7);

  // wings (behind the body)
  const wing = (side, ang) => {
    g.save(); g.translate(side * 50, -128); g.rotate(side * ang);
    g.fillStyle = '#6e4529';
    g.beginPath(); g.ellipse(side * 10, 46, 24, 54, side * -0.15, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(side * (2 + i * 6), 60 + i * 10); g.lineTo(side * (14 + i * 6), 84 + i * 6); g.stroke(); }
    g.restore();
  };
  const pt = o.point || 0;
  wing(-1, 0.2 + flap * 1.1);
  wing(1, 0.2 + flap * 1.1 + pt * 1.6);

  // body
  const bg = g.createLinearGradient(0, -170, 0, 0);
  bg.addColorStop(0, '#9b6b44'); bg.addColorStop(1, '#7a5034');
  g.fillStyle = bg;
  g.beginPath(); g.ellipse(0, -84, 66, 82, 0, 0, TAU); g.fill(); g.stroke();
  // belly
  g.fillStyle = '#f5e3c3';
  g.beginPath(); g.ellipse(0, -64, 44, 54, 0, 0, TAU); g.fill();
  g.strokeStyle = '#cfa97c'; g.lineWidth = 3;
  for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) {
    const vx = c * 18 + (r % 2) * 9 - 4, vy = -96 + r * 18;
    if (Math.abs(vx) > 34 - r * 2) continue;
    g.beginPath(); g.moveTo(vx - 5, vy); g.lineTo(vx, vy + 5); g.lineTo(vx + 5, vy); g.stroke();
  }
  // little bow tie
  g.strokeStyle = NAVY; g.lineWidth = 4; g.fillStyle = '#ff6fb1';
  g.beginPath(); g.moveTo(0, -122); g.lineTo(-18, -132); g.lineTo(-18, -112); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(0, -122); g.lineTo(18, -132); g.lineTo(18, -112); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, -122, 5, 0, TAU); g.fill(); g.stroke();

  // head
  g.save();
  g.translate(0, -130); g.rotate(o.tilt || 0); g.translate(0, 130);
  g.fillStyle = '#946440'; g.lineWidth = 5;
  // ear tufts
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 30, -212); g.lineTo(sd * 64, -232); g.lineTo(sd * 54, -196); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(0, -176, 64, 54, 0, 0, TAU); g.fill(); g.stroke();
  // face disk
  g.fillStyle = '#e2c095';
  g.beginPath(); g.arc(-24, -176, 30, 0, TAU); g.arc(24, -176, 30, 0, TAU); g.fill();
  // eyes
  const look = o.look || [0, 0];
  const mood = o.mood || 'happy';
  const blink = o.blink || 0;
  for (const sd of [-1, 1]) {
    const ex = sd * 24, ey = -178;
    if (mood === 'laugh') {
      g.strokeStyle = NAVY; g.lineWidth = 6;
      g.beginPath(); g.arc(ex, ey + 6, 12, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else {
      const er = mood === 'wow' ? 22 : 19;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, er, er * (1 - blink * 0.9), 0, 0, TAU); g.fill();
      if (blink < 0.6) {
        g.fillStyle = NAVY; g.beginPath(); g.arc(ex + look[0] * 6, ey + look[1] * 5, mood === 'wow' ? 9 : 11, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + look[0] * 6 - 4, ey + look[1] * 5 - 4, 3.5, 0, TAU); g.fill();
      }
    }
  }
  // spectacles
  g.strokeStyle = '#e0a816'; g.lineWidth = 5;
  for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 24, -178, 24, 0, TAU); g.stroke(); }
  g.beginPath(); g.arc(0, -176, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
  for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 24, -178, 17, Math.PI * 1.15, Math.PI * 1.45); g.stroke(); }
  // rosy cheeks
  g.fillStyle = 'rgba(255,120,150,0.45)';
  g.beginPath(); g.ellipse(-44, -156, 9, 6, 0, 0, TAU); g.ellipse(44, -156, 9, 6, 0, 0, TAU); g.fill();
  // beak
  const open = (o.talk || 0) * 8 + (mood === 'laugh' ? 6 : 0);
  g.strokeStyle = NAVY; g.lineWidth = 4; g.fillStyle = '#ffab3d';
  g.beginPath(); g.moveTo(-10, -160); g.lineTo(10, -160); g.lineTo(0, -144); g.closePath(); g.fill(); g.stroke();
  if (open > 0.5) {
    g.fillStyle = '#ff7a8a';
    g.beginPath(); g.moveTo(-7, -152); g.lineTo(7, -152); g.lineTo(0, -152 + open); g.closePath(); g.fill(); g.stroke();
  }
  // wizard hat
  g.save(); g.translate(0, -222); g.rotate(-0.08 + Math.sin(t * 1.6) * 0.03);
  g.lineWidth = 5; g.strokeStyle = NAVY;
  const hg = g.createLinearGradient(-50, 0, 50, 0);
  hg.addColorStop(0, '#7c4ddb'); hg.addColorStop(1, '#5a2fb0');
  g.fillStyle = hg;
  const tipSway = Math.sin(t * 1.8) * 6;
  g.beginPath(); g.moveTo(-48, 0);
  g.bezierCurveTo(-34, -40, -10, -80, 20 + tipSway, -112);
  g.quadraticCurveTo(44 + tipSway, -110, 52 + tipSway, -92);
  g.bezierCurveTo(30, -84, 22, -40, 48, 0);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.rect(-46, -16, 94, 14); g.fill(); g.stroke();
  g.save(); g.translate(-6, -46); drawStarShape(g, 22, '#ffd23f'); g.restore();
  g.save(); g.translate(16, -76); drawStarShape(g, 15, '#ffe58a'); g.restore();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(52 + tipSway, -92, 7, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#6a3fc2'; g.beginPath(); g.ellipse(0, 0, 74, 15, 0, 0, TAU); g.fill(); g.stroke();
  g.restore();
  g.restore(); // head

  g.restore();
}

/** Speech bubble with a tail pointing at (tx, ty). */
export function speechBubble(g, ui, str, x, y, w, tx, ty, size = 34, alpha = 1) {
  const lines = ui.wrap(g, str, w - 40, size, 700);
  const h = lines.length * size * 1.15 + 34;
  g.save(); g.globalAlpha *= alpha;
  g.fillStyle = '#fffdf6'; g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round';
  ui.roundRect(g, x - w / 2, y - h / 2, w, h, 26); g.fill(); g.stroke();
  // tail
  const bx = Math.max(x - w / 2 + 30, Math.min(x + w / 2 - 30, tx));
  const by = ty > y ? y + h / 2 : y - h / 2;
  const sx = tx > x + w / 2 - 10 ? x + w / 2 : null;
  g.beginPath();
  if (sx !== null) { g.moveTo(sx - 2, y - 14); g.lineTo(tx, ty); g.lineTo(sx - 2, y + 14); }
  else { g.moveTo(bx - 16, by); g.lineTo(tx, ty); g.lineTo(bx + 16, by); }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fffdf6';
  if (sx !== null) g.fillRect(sx - 8, y - 11, 8, 22); else g.fillRect(bx - 13, by - (ty > y ? 8 : 0), 26, 8);
  lines.forEach((ln, i) => ui.text(g, ln, x, y - ((lines.length - 1) * size * 1.15) / 2 + i * size * 1.15, { size, color: NAVY, stroke: false, weight: 700 }));
  g.restore();
}
