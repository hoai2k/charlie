// Vector-drawn emote icons that float above characters (hearts, tears,
// sparkles, rain clouds...). They read well at any size, work with or without
// generated sprites, and need no image assets.
import { TAU } from './util.js';

const NAVY = '#24163f';

function heart(g, s, color = '#ff4f8b') {
  g.beginPath();
  g.moveTo(0, s * 0.35);
  g.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.95, 0, -s * 0.45);
  g.bezierCurveTo(s * 0.45, -s * 0.95, s * 0.9, -s * 0.25, 0, s * 0.35);
  g.fillStyle = color; g.fill();
  g.lineWidth = s * 0.12; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath(); g.ellipse(-s * 0.3, -s * 0.42, s * 0.12, s * 0.07, -0.6, 0, TAU); g.fill();
}

export function starPath(g, r, inner = 0.45, points = 5) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
}
function star(g, s, color = '#ffd23f') {
  starPath(g, s * 0.6);
  g.fillStyle = color; g.fill();
  g.lineWidth = s * 0.1; g.strokeStyle = NAVY; g.stroke();
}
function sparkle(g, s, color = '#fff6a8') {
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, r = i % 2 ? s * 0.12 : s * 0.55;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath(); g.fillStyle = color; g.fill();
}
function tear(g, s) {
  g.beginPath();
  g.moveTo(0, -s * 0.5);
  g.bezierCurveTo(s * 0.4, 0, s * 0.35, s * 0.4, 0, s * 0.4);
  g.bezierCurveTo(-s * 0.35, s * 0.4, -s * 0.4, 0, 0, -s * 0.5);
  g.fillStyle = '#5cc8ff'; g.fill();
  g.lineWidth = s * 0.09; g.strokeStyle = NAVY; g.stroke();
}
function cloud(g, s, color = '#8e9ab8') {
  g.beginPath();
  g.arc(-s * 0.35, 0, s * 0.3, Math.PI * 0.5, Math.PI * 1.5);
  g.arc(-s * 0.05, -s * 0.22, s * 0.36, Math.PI, Math.PI * 1.9);
  g.arc(s * 0.35, -s * 0.02, s * 0.28, Math.PI * 1.4, Math.PI * 0.5);
  g.closePath();
  g.fillStyle = color; g.fill();
  g.lineWidth = s * 0.08; g.strokeStyle = NAVY; g.stroke();
}
function bubble(g, s, text, color = '#fff') {
  g.beginPath();
  g.ellipse(0, 0, s * 0.55, s * 0.5, 0, 0, TAU);
  g.moveTo(-s * 0.12, s * 0.45); g.lineTo(-s * 0.3, s * 0.78); g.lineTo(s * 0.12, s * 0.46);
  g.fillStyle = color; g.fill();
  g.lineWidth = s * 0.08; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = NAVY;
  g.font = `900 ${Math.round(s * 0.62)}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 0, s * 0.04);
}

/**
 * Draw an emote centered at (x, y). `t` is seconds since it appeared (drives
 * its little animation). Kinds: heart, hearts, star, sparkle, tear, rain,
 * exclaim, question, dizzy, zzz, note, anger, sweat, dots, happy, sad.
 */
export function drawEmote(g, kind, x, y, s, t) {
  g.save();
  g.translate(x, y);
  const pop = Math.min(1, t / 0.18);
  const sc = pop < 1 ? 0.4 + pop * 0.75 : 1 + Math.sin(t * 6) * 0.04;
  g.scale(sc, sc);
  switch (kind) {
    case 'heart': g.translate(0, Math.sin(t * 4) * 3); heart(g, s); break;
    case 'hearts':
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.8 + i / 3) % 1;
        g.save(); g.globalAlpha = Math.sin(p * Math.PI);
        g.translate((i - 1) * s * 0.55 + Math.sin(p * 9 + i) * 4, -p * s * 0.9);
        heart(g, s * 0.55); g.restore();
      }
      break;
    case 'star': g.rotate(Math.sin(t * 3) * 0.2); star(g, s); break;
    case 'sparkle':
      for (let i = 0; i < 4; i++) {
        const p = (t * 1.3 + i * 0.25) % 1;
        g.save(); g.globalAlpha = Math.sin(p * Math.PI);
        g.translate(Math.cos(i * 1.7) * s * 0.7, Math.sin(i * 2.3) * s * 0.45 - p * 10);
        g.scale(0.5 + p * 0.5, 0.5 + p * 0.5); sparkle(g, s * 0.8, i % 2 ? '#fff6a8' : '#ffffff'); g.restore();
      }
      break;
    case 'tear': {
      const p = (t * 1.2) % 1;
      g.translate(s * 0.3, p * s * 0.6); g.globalAlpha = 1 - p * 0.6; tear(g, s * 0.5); break;
    }
    case 'rain': {
      g.translate(0, -s * 0.15 + Math.sin(t * 2) * 2);
      for (let i = 0; i < 4; i++) {
        const p = (t * 2 + i * 0.27) % 1;
        g.save(); g.globalAlpha = 1 - p; g.fillStyle = '#5cc8ff';
        g.fillRect(-s * 0.4 + i * s * 0.26, s * 0.15 + p * s * 0.7, s * 0.06, s * 0.18); g.restore();
      }
      cloud(g, s);
      break;
    }
    case 'exclaim': g.translate(0, -Math.abs(Math.sin(t * 10)) * 4 * Math.max(0, 1 - t)); bubble(g, s, '!', '#fff3a0'); break;
    case 'question': g.rotate(Math.sin(t * 3) * 0.12); bubble(g, s, '?', '#ffffff'); break;
    case 'dots': bubble(g, s, '…', '#ffffff'); break;
    case 'note': {
      g.translate(Math.sin(t * 5) * 6, -((t * 30) % 20));
      g.fillStyle = '#7a4dff'; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.ellipse(-s * 0.15, s * 0.25, s * 0.2, s * 0.15, -0.4, 0, TAU); g.fill(); g.stroke();
      g.fillRect(s * 0.02, -s * 0.45, s * 0.08, s * 0.7);
      g.beginPath(); g.moveTo(s * 0.06, -s * 0.45); g.quadraticCurveTo(s * 0.4, -s * 0.3, s * 0.3, 0); g.lineWidth = s * 0.08; g.strokeStyle = '#7a4dff'; g.stroke();
      break;
    }
    case 'dizzy':
      g.scale(1, 0.4);
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i * TAU) / 3;
        g.save(); g.translate(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.7); g.scale(1, 2.5); star(g, s * 0.45); g.restore();
      }
      break;
    case 'zzz':
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.6 + i / 3) % 1;
        g.save(); g.globalAlpha = Math.sin(p * Math.PI); g.translate(p * s * 0.6, -p * s * 0.9);
        g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 4;
        g.font = `900 ${Math.round(s * (0.4 + p * 0.3))}px Fredoka, system-ui, sans-serif`;
        g.textAlign = 'center'; g.strokeText('z', 0, 0); g.fillText('z', 0, 0); g.restore();
      }
      break;
    case 'anger':
      g.rotate(Math.sin(t * 12) * 0.1); g.strokeStyle = '#ff3355'; g.lineWidth = s * 0.14; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        g.save(); g.rotate((i * Math.PI) / 2);
        g.beginPath(); g.moveTo(s * 0.12, s * 0.12); g.quadraticCurveTo(s * 0.18, s * 0.38, s * 0.42, s * 0.36); g.stroke(); g.restore();
      }
      break;
    case 'sweat': g.translate(s * 0.4, Math.min(t, 0.6) * 18); tear(g, s * 0.42); break;
    case 'happy': bubble(g, s, '♪', '#ffe1f0'); break;
    case 'sad': bubble(g, s, '…', '#d8e6ff'); break;
    default: star(g, s);
  }
  g.restore();
}

export { heart as drawHeartShape, star as drawStarShape, sparkle as drawSparkleShape, cloud as drawCloudShape };
