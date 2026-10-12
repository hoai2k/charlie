// Outfits: wearable accessories for any character (the Fashion Show wardrobe,
// shared so a "dress up" look can be worn in every game).
//
// Catalog
//   OUTFIT_SLOTS            ['head', 'face', 'neck', 'back', 'hand', 'aura']
//   OUTFIT_ITEMS            [{ id, slot, name, color (default PALETTE index), art, draw, ... }]
//   outfitItem(id)          item by id (e.g. 'crown', 'fairy-wings', 'magic-wand')
//   PALETTE                 the 8 colours (index = `colour` everywhere); CATS/CAT: slots with
//                           their item lists in menu order (index 0 = "None")
//   drawItemIconArt(g, slotIdx, itemIdx, colour, cx, cy, size, t)   menu icon (art or vector)
//
// Wearing (inside Actor attachments, so items ride every frame and all motion)
//   const handles = wearOutfit(actor, () => outfit);    outfit = [{ id, colour }], one per slot
//   unwearOutfit(actor, handles);
//   or by hand: actor.attach((g, info) => drawOutfit(g, def, info, outfit, { layer: 'back', t }), { member, behind: true })
//               actor.attach((g, info) => drawOutfit(g, def, info, outfit, { layer: 'front', t }), { member })
//   drawOutfit(g, def, info, outfit, { layer, t, pop })   returns the anchors (outfitAnchors)
//   drawOutfitItem(g, item, colour, S, t, { layer, box }) one item at the current origin
//   outfitAttach(def, info, slot, item?) -> { x, y, rot, scale, behind, box?, sideCape? }  forward space
//   outfitAttachWorld(actor, slot)       -> { x, y, scale, rot, flip, behind }               world space
//   outfitAnchors(def, info)             -> landmarks, tilts and slots[slot] = { x, y, rot, S }
//
// Every item follows a landmark of the frame being drawn (attachment info,
// forward space: feet at 0, -y up, +x the way the character faces, already
// scaled by the frame's bodyHeight, the actor's scale and depth, and inside
// the actor's procedural lean/tumble/squash and mirroring):
//   head (hats, crowns, bows)    -> head   (+ head tilt)
//   face (glasses, masks, paint) -> eyes   (+ head tilt; hidden on frames turned away)
//   neck (necklaces, bowties)    -> neck   (+ half the head tilt)
//   back (wings, capes, packs)   -> back   (behind the body; four-legged: shoulders + body tilt,
//                                           capes drape over the back in front)
//   hand (wands, balloons, bags) -> hand   (four-legged: the mouth)
//   aura (sparkles around)       -> body centre, once per character
// Special characters (see FIT): Fox, Unicorn, Cotton Candy, Fellowfox are
// four-legged; the armless Marshmallow Cake "holds" things beside its body
// and wears wings behind its top tier; Hotdog's hats sit up on its crest;
// Snowstar holds things beside its big head; KPop trio members wear smaller
// wings. Group characters wear the outfit on every member.
//
// Item drawings are vector shapes around the slot anchor with S = the slot's
// size unit:
//   head  origin = top of the head,         S = head width
//   face  origin = face center (eye line),  S = face width
//   neck  origin = just under the chin,     S = face width
//   back  origin = upper back,              S = body height
//   hand  origin = the hand,                S = body height
//   aura  origin = body center,             S = body height
// Items with `cape: true` get draw(g, S, col, t, box): box = { w, h } of the
// fitted cape (top edge at the origin), when worn.
// Art: prop/<key> from WORN_ART replaces the drawing for the colours it lists
// (see image-requests.md); everything else keeps the procedural drawing.

import { RAINBOW } from './particles.js';
import { starPath, drawSparkleShape } from './emotes.js';
import { TAU, clamp, lerp } from './util.js';
import { art } from './art.js';
import { recolorFrame } from './recolor.js';
import { getSpriteSet } from './sprites.js';

export const NAVY = '#24163f';

export const PALETTE = [
  { name: 'Pink', c: '#ff7ac6', d: '#d94f9f', l: '#ffc4e6' },
  { name: 'Gold', c: '#ffd23f', d: '#d9a300', l: '#fff0a8' },
  { name: 'Lilac', c: '#b98bff', d: '#8a5ce0', l: '#e2d2ff' },
  { name: 'Sky', c: '#6fd0ff', d: '#3a9fd6', l: '#c8efff' },
  { name: 'Mint', c: '#6fe3b4', d: '#36b583', l: '#c9f7e4' },
  { name: 'Ruby', c: '#ff4d6d', d: '#c92a4a', l: '#ffb3c1' },
  { name: 'Pearl', c: '#fff4fb', d: '#d8c8e0', l: '#ffffff' },
  { name: 'Rainbow', c: '#ff9fd8', d: '#c97fd0', l: '#ffe0f4', rainbow: true },
];

/** Fill style for a palette color (rainbow becomes a gradient across +-S/2). */
export function fillOf(g, col, S, vertical = false) {
  if (!col.rainbow) return col.c;
  const gr = vertical ? g.createLinearGradient(0, -S * 0.5, 0, S * 0.5) : g.createLinearGradient(-S * 0.5, 0, S * 0.5, 0);
  RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
  return gr;
}
function ol(g, S, k = 0.045) {
  g.lineWidth = Math.max(1.2, S * k); g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
}
export function heartPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.38);
  g.bezierCurveTo(x - s * 0.95, y - s * 0.22, x - s * 0.48, y - s * 0.92, x, y - s * 0.42);
  g.bezierCurveTo(x + s * 0.48, y - s * 0.92, x + s * 0.95, y - s * 0.22, x, y + s * 0.38);
  g.closePath();
}
export function starAt(g, x, y, r, rot = 0, inner = 0.45) {
  g.save(); g.translate(x, y); g.rotate(rot); starPath(g, r, inner); g.restore();
}
function shine(g, x, y, rx, ry, rot = -0.6, a = 0.75) {
  g.save(); g.globalAlpha *= a; g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); g.restore();
}
export function flower(g, x, y, r, petal, center = '#ffd23f', S = r * 6) {
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5 - Math.PI / 2;
    g.beginPath(); g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, 0, TAU);
    g.fillStyle = petal; g.fill(); ol(g, S, 0.012);
  }
  g.beginPath(); g.arc(x, y, r * 0.36, 0, TAU); g.fillStyle = center; g.fill(); ol(g, S, 0.012);
}
function gem(g, x, y, r, color, S) {
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.closePath();
  g.fillStyle = color; g.fill(); ol(g, S, 0.03);
  shine(g, x - r * 0.25, y - r * 0.3, r * 0.22, r * 0.12);
}

// --- head ----------------------------------------------------------------
const HEAD = [
  { name: 'None' },
  {
    name: 'Crown', color: 1, icon: [1, 0.22],
    draw(g, S, col) {
      const w = S * 0.92;
      g.beginPath();
      g.moveTo(-w / 2, S * 0.12); g.lineTo(-w / 2, -S * 0.26); g.lineTo(-w / 4, -S * 0.06); g.lineTo(0, -S * 0.44);
      g.lineTo(w / 4, -S * 0.06); g.lineTo(w / 2, -S * 0.26); g.lineTo(w / 2, S * 0.12); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.rect(-w / 2, S * 0.02, w, S * 0.1); g.fillStyle = col.d; g.fill(); ol(g, S, 0.03);
      for (const [x, y] of [[-w / 2, -S * 0.26], [0, -S * 0.44], [w / 2, -S * 0.26]]) {
        g.beginPath(); g.arc(x, y, S * 0.055, 0, TAU); g.fillStyle = '#fff4fb'; g.fill(); ol(g, S, 0.025);
      }
      gem(g, 0, S * 0.0, S * 0.08, '#ff4d6d', S);
      gem(g, -w * 0.28, S * 0.03, S * 0.05, '#3fa7ff', S);
      gem(g, w * 0.28, S * 0.03, S * 0.05, '#3fa7ff', S);
      shine(g, -w * 0.32, -S * 0.12, S * 0.03, S * 0.1, 0.3);
    },
  },
  {
    name: 'Tiara', color: 6, icon: [1.15, 0.12],
    draw(g, S, col) {
      g.beginPath(); g.moveTo(-S * 0.44, S * 0.18);
      g.quadraticCurveTo(-S * 0.32, -S * 0.02, -S * 0.15, -S * 0.07);
      g.lineTo(-S * 0.08, -S * 0.17); g.lineTo(0, -S * 0.34); g.lineTo(S * 0.08, -S * 0.17); g.lineTo(S * 0.15, -S * 0.07);
      g.quadraticCurveTo(S * 0.32, -S * 0.02, S * 0.44, S * 0.18);
      g.quadraticCurveTo(0, S * 0.02, -S * 0.44, S * 0.18); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      gem(g, 0, -S * 0.12, S * 0.075, '#ff7ac6', S);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.arc(sx * S * 0.22, -S * 0.0, S * 0.035, 0, TAU); g.fillStyle = '#b98bff'; g.fill(); ol(g, S, 0.02);
        g.beginPath(); g.arc(sx * S * 0.34, S * 0.07, S * 0.028, 0, TAU); g.fillStyle = '#6fd0ff'; g.fill(); ol(g, S, 0.02);
      }
    },
  },
  {
    name: 'Flower Crown', color: 0, icon: [1, 0.18],
    draw(g, S, col) {
      const n = 7, cols = [col.rainbow ? RAINBOW[0] : col.c, '#fff4fb', col.rainbow ? RAINBOW[2] : col.l];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), x = (u - 0.5) * S * 0.98, y = S * 0.1 - Math.sin(u * Math.PI) * S * 0.14;
        g.save(); g.translate(x, y + S * 0.03); g.rotate((u - 0.5) * 1.6 + 0.5);
        g.beginPath(); g.ellipse(S * 0.07, 0, S * 0.07, S * 0.03, 0, 0, TAU); g.fillStyle = '#5ccf7a'; g.fill(); ol(g, S, 0.015);
        g.restore();
      }
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), x = (u - 0.5) * S * 0.98, y = S * 0.08 - Math.sin(u * Math.PI) * S * 0.14;
        const c = col.rainbow ? RAINBOW[i % RAINBOW.length] : cols[i % 3];
        flower(g, x, y, S * (i % 2 ? 0.075 : 0.095), c, '#ffd23f', S);
      }
    },
  },
  {
    name: 'Big Bow', color: 5, icon: [1, 0.05],
    draw(g, S, col, t) {
      g.save(); g.translate(S * 0.18, -S * 0.04); g.rotate(0.15 + Math.sin(t * 2) * 0.04);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(0, 0);
        g.bezierCurveTo(sx * S * 0.2, -S * 0.28, sx * S * 0.42, -S * 0.12, sx * S * 0.36, S * 0.02);
        g.bezierCurveTo(sx * S * 0.32, S * 0.14, sx * S * 0.14, S * 0.1, 0, 0);
        g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
        g.beginPath(); g.moveTo(sx * S * 0.03, S * 0.03); g.lineTo(sx * S * 0.16, S * 0.26); g.lineTo(sx * S * 0.1, S * 0.24); g.lineTo(sx * S * 0.07, S * 0.28); g.closePath();
        g.fillStyle = col.d; g.fill(); ol(g, S, 0.03);
      }
      g.beginPath(); g.ellipse(0, 0, S * 0.07, S * 0.08, 0, 0, TAU); g.fillStyle = col.d; g.fill(); ol(g, S);
      for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
        g.beginPath(); g.arc(sx * S * (0.16 + k * 0.1), -S * (0.04 + k * 0.03), S * 0.022, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
      }
      g.restore();
    },
  },
  {
    name: 'Bunny Ears', color: 6, icon: [0.85, 0.42],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(-S * 0.46, S * 0.18); g.quadraticCurveTo(0, -S * 0.16, S * 0.46, S * 0.18);
      g.lineWidth = S * 0.11; g.strokeStyle = NAVY; g.lineCap = 'round'; g.stroke();
      g.lineWidth = S * 0.07; g.strokeStyle = col.rainbow ? RAINBOW[5] : col.d; g.stroke();
      for (const sx of [-1, 1]) {
        g.save(); g.translate(sx * S * 0.18, -S * 0.02); g.rotate(sx * 0.18 + Math.sin(t * 3 + sx) * 0.06 + (sx > 0 ? Math.max(0, Math.sin(t * 1.3)) * 0.35 : 0));
        g.beginPath(); g.ellipse(0, -S * 0.4, S * 0.12, S * 0.42, 0, 0, TAU); g.fillStyle = fillOf(g, col, S, true); g.fill(); ol(g, S);
        g.beginPath(); g.ellipse(0, -S * 0.38, S * 0.055, S * 0.3, 0, 0, TAU); g.fillStyle = '#ffb3d9'; g.fill();
        g.restore();
      }
    },
  },
  {
    name: 'Star Clips', color: 1, icon: [1.1, 0.12],
    draw(g, S, col, t) {
      const st = [[-S * 0.32, S * 0.06, S * 0.12, -0.3], [-S * 0.06, -S * 0.08, S * 0.1, 0.2], [S * 0.22, -S * 0.02, S * 0.13, 0.5]];
      st.forEach(([x, y, r, rot], i) => {
        starAt(g, x, y, r, rot + Math.sin(t * 2 + i) * 0.1);
        g.fillStyle = col.rainbow ? RAINBOW[(i * 2) % 7] : col.c; g.fill(); ol(g, S);
        shine(g, x - r * 0.2, y - r * 0.25, r * 0.15, r * 0.08);
      });
      const tw = (Math.sin(t * 5) + 1) / 2;
      g.save(); g.translate(S * 0.4, -S * 0.2); g.globalAlpha = tw; drawSparkleShape(g, S * 0.16, '#fff6a8'); g.restore();
    },
  },
  {
    name: 'Wizard Hat', color: 2, icon: [0.62, 0.62],
    draw(g, S, col) {
      g.beginPath(); g.ellipse(0, S * 0.1, S * 0.64, S * 0.15, 0, 0, TAU); g.fillStyle = col.d; g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.38, S * 0.08);
      g.quadraticCurveTo(-S * 0.12, -S * 0.6, S * 0.3, -S * 1.06);
      g.quadraticCurveTo(S * 0.12, -S * 0.5, S * 0.38, S * 0.08);
      g.quadraticCurveTo(0, S * 0.18, -S * 0.38, S * 0.08); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.36, S * 0.0); g.quadraticCurveTo(0, S * 0.1, S * 0.36, S * 0.0);
      g.lineWidth = S * 0.08; g.strokeStyle = '#ffd23f'; g.stroke();
      for (const [x, y, r] of [[-S * 0.05, -S * 0.3, S * 0.07], [S * 0.12, -S * 0.62, S * 0.05], [S * 0.18, -S * 0.12, S * 0.045]]) {
        starAt(g, x, y, r); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.02);
      }
      g.beginPath(); g.arc(S * 0.3, -S * 1.06, S * 0.05, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.03);
    },
  },
  {
    name: 'Top Hat', color: 2, icon: [0.8, 0.3],
    draw(g, S, col) {
      const ink = '#2f2545';
      g.beginPath(); g.ellipse(0, S * 0.08, S * 0.5, S * 0.11, 0, 0, TAU); g.fillStyle = ink; g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.29, S * 0.07); g.lineTo(-S * 0.32, -S * 0.6); g.quadraticCurveTo(0, -S * 0.67, S * 0.32, -S * 0.6);
      g.lineTo(S * 0.29, S * 0.07); g.quadraticCurveTo(0, S * 0.13, -S * 0.29, S * 0.07); g.closePath();
      g.fillStyle = ink; g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.3, -S * 0.17); g.quadraticCurveTo(0, -S * 0.12, S * 0.3, -S * 0.17); g.lineTo(S * 0.295, -S * 0.03);
      g.quadraticCurveTo(0, S * 0.02, -S * 0.295, -S * 0.03); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S, 0.03);
      shine(g, -S * 0.2, -S * 0.4, S * 0.03, S * 0.12, 0.05, 0.35);
    },
  },
  {
    name: 'Party Hat', color: 7, icon: [0.75, 0.36],
    draw(g, S, col) {
      const cone = () => { g.beginPath(); g.moveTo(-S * 0.27, S * 0.1); g.lineTo(0, -S * 0.78); g.lineTo(S * 0.27, S * 0.1); g.quadraticCurveTo(0, S * 0.18, -S * 0.27, S * 0.1); g.closePath(); };
      cone(); g.fillStyle = col.rainbow ? '#fff4fb' : col.l; g.fill();
      g.save(); cone(); g.clip();
      for (let k = 0; k < 7; k++) {
        g.beginPath(); g.moveTo(-S * 0.5, S * (0.02 - k * 0.14)); g.lineTo(S * 0.5, S * (-0.1 - k * 0.14)); g.lineWidth = S * 0.06;
        g.strokeStyle = col.rainbow ? RAINBOW[k % 7] : (k % 2 ? col.c : col.d); g.stroke();
      }
      g.restore();
      cone(); ol(g, S);
      for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(-S * 0.24 + k * S * 0.08, S * 0.12 + Math.sin(k * 1.4) * S * 0.01, S * 0.045, 0, TAU); g.fillStyle = col.rainbow ? '#ff9fd8' : col.c; g.fill(); ol(g, S, 0.015); }
      g.beginPath(); g.arc(0, -S * 0.8, S * 0.08, 0, TAU); g.fillStyle = col.rainbow ? '#ff7ac6' : col.d; g.fill(); ol(g, S, 0.03);
    },
  },
  {
    name: 'Sun Hat', color: 1, icon: [0.85, 0.12],
    draw(g, S, col) {
      g.beginPath(); g.ellipse(0, S * 0.04, S * 0.66, S * 0.17, 0, 0, TAU); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.ellipse(0, S * 0.0, S * 0.3, S * 0.3, 0, Math.PI, TAU); g.closePath(); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.rect(-S * 0.3, -S * 0.1, S * 0.6, S * 0.09); g.fillStyle = '#ff7ac6'; g.fill(); ol(g, S, 0.025);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(S * 0.12, -S * 0.06); g.quadraticCurveTo(S * (0.12 + sx * 0.12), -S * 0.2, S * (0.12 + sx * 0.14), -S * 0.02); g.closePath();
        g.fillStyle = '#ff7ac6'; g.fill(); ol(g, S, 0.02);
      }
      shine(g, -S * 0.14, -S * 0.18, S * 0.06, S * 0.03, -0.4, 0.5);
    },
  },
  {
    name: 'Beret', color: 5, icon: [0.95, 0.12],
    draw(g, S, col) {
      g.save(); g.rotate(-0.12);
      g.beginPath(); g.ellipse(S * 0.04, -S * 0.1, S * 0.5, S * 0.22, 0, 0, TAU); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.beginPath(); g.ellipse(S * 0.02, S * 0.06, S * 0.36, S * 0.07, 0, 0, TAU); g.fillStyle = col.d; g.fill(); ol(g, S, 0.03);
      g.beginPath(); g.moveTo(S * 0.02, -S * 0.31); g.quadraticCurveTo(S * 0.05, -S * 0.4, S * 0.1, -S * 0.39); g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
      shine(g, -S * 0.18, -S * 0.18, S * 0.1, S * 0.04, -0.2, 0.4);
      g.restore();
    },
  },
];

// --- face ----------------------------------------------------------------
const FACE = [
  { name: 'None' },
  {
    name: 'Glasses', color: 2,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        g.beginPath(); g.arc(sx * S * 0.22, -S * 0.04, S * 0.16, 0, TAU);
        g.fillStyle = 'rgba(200,240,255,0.35)'; g.fill();
        g.lineWidth = S * 0.075; g.strokeStyle = NAVY; g.stroke();
        g.lineWidth = S * 0.045; g.strokeStyle = fillOf(g, col, S); g.stroke();
        shine(g, sx * S * 0.22 - S * 0.06, -S * 0.1, S * 0.04, S * 0.02, -0.6, 0.8);
      }
      g.beginPath(); g.moveTo(-S * 0.07, -S * 0.07); g.quadraticCurveTo(0, -S * 0.13, S * 0.07, -S * 0.07);
      g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
    },
  },
  {
    name: 'Heart Shades', color: 0,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        heartPath(g, sx * S * 0.22, -S * 0.0, S * 0.36);
        g.fillStyle = fillOf(g, col, S); g.fill();
        g.save(); g.clip(); g.fillStyle = 'rgba(36,22,63,0.35)'; g.fillRect(sx * S * 0.22 - S * 0.3, S * 0.0, S * 0.6, S * 0.3); g.restore();
        heartPath(g, sx * S * 0.22, -S * 0.0, S * 0.36); ol(g, S, 0.05);
        shine(g, sx * S * 0.22 - S * 0.08, -S * 0.1, S * 0.045, S * 0.022, -0.6, 0.9);
      }
      g.beginPath(); g.moveTo(-S * 0.06, -S * 0.08); g.lineTo(S * 0.06, -S * 0.08); g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
    },
  },
  {
    name: 'Star Stickers', color: 1,
    draw(g, S, col, t) {
      for (const [x, y, r, rot] of [[S * 0.3, S * 0.2, S * 0.1, 0.3], [-S * 0.33, S * 0.17, S * 0.075, -0.2], [-S * 0.2, S * 0.3, S * 0.045, 0.6]]) {
        starAt(g, x, y, r, rot); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S, 0.025);
      }
      g.save(); g.translate(S * 0.42, S * 0.05); g.globalAlpha = (Math.sin(t * 4) + 1) / 2; drawSparkleShape(g, S * 0.14, '#fff'); g.restore();
    },
  },
  {
    name: 'Rosy Blush', color: 0,
    draw(g, S, col) {
      g.save(); g.globalAlpha *= 0.6;
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(sx * S * 0.28, S * 0.2, S * 0.12, S * 0.075, 0, 0, TAU); g.fillStyle = fillOf(g, col, S); g.fill();
      }
      g.restore();
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        g.beginPath(); g.moveTo(sx * S * (0.22 + k * 0.05), S * 0.17); g.lineTo(sx * S * (0.2 + k * 0.05), S * 0.23);
        g.lineWidth = S * 0.015; g.strokeStyle = 'rgba(200,40,100,0.6)'; g.stroke();
      }
      heartPath(g, S * 0.36, S * 0.02, S * 0.1); g.fillStyle = '#ff4d8b'; g.fill(); ol(g, S, 0.015);
    },
  },
  {
    name: 'Star Glasses', color: 1,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        starAt(g, sx * S * 0.22, -S * 0.03, S * 0.2, 0, 0.55);
        g.fillStyle = 'rgba(200,240,255,0.35)'; g.fill();
        g.lineWidth = S * 0.07; g.strokeStyle = NAVY; g.stroke();
        g.lineWidth = S * 0.04; g.strokeStyle = fillOf(g, col, S); g.stroke();
        shine(g, sx * S * 0.22 - S * 0.05, -S * 0.08, S * 0.035, S * 0.018, -0.6, 0.8);
      }
      g.beginPath(); g.moveTo(-S * 0.06, -S * 0.07); g.lineTo(S * 0.06, -S * 0.07); g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
    },
  },
  {
    name: 'Sunglasses', color: 2,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * S * 0.06, -S * 0.15); g.lineTo(sx * S * 0.4, -S * 0.15); g.quadraticCurveTo(sx * S * 0.4, S * 0.12, sx * S * 0.24, S * 0.1);
        g.quadraticCurveTo(sx * S * 0.07, S * 0.1, sx * S * 0.06, -S * 0.15); g.closePath();
        g.fillStyle = '#2f2545'; g.fill();
        g.lineWidth = S * 0.06; g.strokeStyle = NAVY; g.stroke();
        g.lineWidth = S * 0.035; g.strokeStyle = fillOf(g, col, S); g.stroke();
        shine(g, sx * S * 0.2 - S * 0.04, -S * 0.07, S * 0.05, S * 0.022, -0.5, 0.6);
      }
      g.beginPath(); g.moveTo(-S * 0.07, -S * 0.12); g.lineTo(S * 0.07, -S * 0.12); g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke();
    },
  },
];

// --- neck ----------------------------------------------------------------
const NECK = [
  { name: 'None' },
  {
    name: 'Pearls', color: 6,
    draw(g, S, col) {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1;
        const x = u * S * 0.36, y = -S * 0.05 + (1 - u * u) * S * 0.2;
        const r = i === 5 ? S * 0.07 : S * 0.048;
        g.beginPath(); g.arc(x, y, r, 0, TAU);
        g.fillStyle = col.rainbow ? RAINBOW[i % 7] : col.c; g.fill(); ol(g, S, 0.018);
        shine(g, x - r * 0.3, y - r * 0.35, r * 0.3, r * 0.18, -0.6, 0.9);
      }
    },
  },
  {
    name: 'Bowtie', color: 5,
    draw(g, S, col) {
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(0, S * 0.04); g.lineTo(sx * S * 0.3, -S * 0.1); g.quadraticCurveTo(sx * S * 0.36, S * 0.06, sx * S * 0.3, S * 0.2); g.closePath();
        g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
        g.fillStyle = 'rgba(255,255,255,0.75)';
        for (const [px, py] of [[0.18, 0.0], [0.24, 0.1], [0.14, 0.11]]) { g.beginPath(); g.arc(sx * S * px, S * py, S * 0.022, 0, TAU); g.fill(); }
      }
      g.beginPath(); g.ellipse(0, S * 0.04, S * 0.07, S * 0.08, 0, 0, TAU); g.fillStyle = col.d; g.fill(); ol(g, S);
    },
  },
  {
    name: 'Cozy Scarf', color: 3,
    draw(g, S, col) {
      g.beginPath(); g.moveTo(S * 0.1, S * 0.04); g.lineTo(S * 0.26, S * 0.46); g.lineTo(S * 0.1, S * 0.48); g.lineTo(S * 0.0, S * 0.06); g.closePath();
      g.fillStyle = col.d; g.fill(); ol(g, S);
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(S * (0.11 + k * 0.04), S * 0.47); g.lineTo(S * (0.11 + k * 0.04), S * 0.55); g.lineWidth = S * 0.02; g.strokeStyle = col.d; g.stroke(); }
      const r = 0.1;
      g.beginPath(); g.moveTo(-S * 0.38, -S * 0.06); g.quadraticCurveTo(0, S * 0.08, S * 0.38, -S * 0.06);
      g.lineTo(S * 0.36, S * 0.1); g.quadraticCurveTo(0, S * 0.26, -S * 0.36, S * 0.1); g.closePath();
      g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
      g.save(); g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = S * 0.035;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * S * r * 1.1, -S * 0.1); g.lineTo(k * S * r * 1.1 + S * 0.05, S * 0.3); g.stroke(); }
      g.restore();
    },
  },
  {
    name: 'Heart Locket', color: 0,
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(-S * 0.32, -S * 0.08); g.quadraticCurveTo(0, S * 0.3, S * 0.32, -S * 0.08);
      g.lineWidth = S * 0.035; g.strokeStyle = '#d9a300'; g.stroke();
      g.save(); g.translate(0, S * 0.25); g.rotate(Math.sin(t * 2.2) * 0.12);
      heartPath(g, 0, S * 0.04, S * 0.26); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.035);
      heartPath(g, 0, S * 0.045, S * 0.18); g.fillStyle = fillOf(g, col, S * 0.3); g.fill();
      shine(g, -S * 0.04, -S * 0.02, S * 0.03, S * 0.018);
      g.restore();
    },
  },
  {
    name: 'Flower Lei', color: 0,
    draw(g, S, col) {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1;
        const x = u * S * 0.4, y = -S * 0.06 + (1 - u * u) * S * 0.3;
        const c = col.rainbow ? RAINBOW[i % 7] : [col.c, '#fff4fb', '#ffd23f'][i % 3];
        flower(g, x, y, S * 0.075, c, i % 3 === 2 ? '#ff7ac6' : '#ffd23f', S);
      }
    },
  },
];

// --- back (drawn behind the character) -------------------------------------
const BACK = [
  { name: 'None' },
  {
    name: 'Fairy Wings', color: 3,
    draw(g, S, col, t) {
      const flap = Math.sin(t * 9) * 0.14;
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx, 1); g.rotate(-flap);
        g.globalAlpha *= 0.78;
        const fill = col.rainbow ? fillOf(g, col, S * 0.6) : col.c;
        g.beginPath(); g.ellipse(S * 0.2, -S * 0.12, S * 0.22, S * 0.12, -0.55, 0, TAU); g.fillStyle = fill; g.fill(); ol(g, S, 0.012);
        g.beginPath(); g.ellipse(S * 0.15, S * 0.1, S * 0.14, S * 0.08, 0.55, 0, TAU); g.fillStyle = fill; g.fill(); ol(g, S, 0.012);
        g.globalAlpha = 0.8; g.strokeStyle = '#fff'; g.lineWidth = S * 0.008;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(S * 0.2, -S * 0.1, S * 0.36, -S * 0.22); g.moveTo(0, 0); g.quadraticCurveTo(S * 0.15, S * 0.06, S * 0.24, S * 0.15); g.stroke();
        g.fillStyle = '#fff';
        for (const [x, y] of [[0.3, -0.18], [0.12, -0.04], [0.2, 0.12]]) { g.beginPath(); g.arc(S * x, S * y, S * 0.012, 0, TAU); g.fill(); }
        g.restore();
      }
    },
  },
  {
    name: 'Royal Cape', color: 5,
    draw(g, S, col, t) {
      const sway = Math.sin(t * 2) * S * 0.02;
      g.beginPath(); g.moveTo(-S * 0.14, -S * 0.02); g.lineTo(S * 0.14, -S * 0.02);
      g.lineTo(S * 0.32 + sway, S * 0.56);
      for (let k = 0; k < 4; k++) {
        const x0 = S * 0.32 - (k + 0.5) * S * 0.16 + sway, x1 = S * 0.32 - (k + 1) * S * 0.16 + sway;
        g.quadraticCurveTo(x0, S * 0.62, x1, S * 0.56);
      }
      g.closePath();
      const gr = g.createLinearGradient(0, 0, 0, S * 0.6);
      if (col.rainbow) RAINBOW.forEach((c, i) => gr.addColorStop(i / 6, c)); else { gr.addColorStop(0, col.c); gr.addColorStop(1, col.d); }
      g.fillStyle = gr; g.fill(); ol(g, S, 0.012);
      g.beginPath(); g.moveTo(-S * 0.32 + sway, S * 0.55); g.quadraticCurveTo(0, S * 0.6, S * 0.32 + sway, S * 0.55);
      g.lineWidth = S * 0.025; g.strokeStyle = '#fff4fb'; g.stroke();
      g.fillStyle = '#24163f';
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-S * 0.24 + k * S * 0.12 + sway, S * 0.55, S * 0.008, 0, TAU); g.fill(); }
    },
  },
  {
    name: 'Butterfly Wings', color: 2,
    draw(g, S, col, t) {
      const k = 0.82 + 0.18 * Math.cos(t * 5);
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx * k, 1);
        const fill = col.rainbow ? fillOf(g, col, S * 0.7) : col.c;
        g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(S * 0.18, -S * 0.36, S * 0.48, -S * 0.26, S * 0.38, -S * 0.02); g.lineTo(0, S * 0.02); g.closePath();
        g.fillStyle = fill; g.fill(); ol(g, S, 0.012);
        g.beginPath(); g.moveTo(0, S * 0.02); g.bezierCurveTo(S * 0.32, S * 0.02, S * 0.34, S * 0.3, S * 0.12, S * 0.28); g.closePath();
        g.fillStyle = col.rainbow ? fill : col.d; g.fill(); ol(g, S, 0.012);
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [x, y, r] of [[0.28, -0.14, 0.04], [0.18, -0.2, 0.025], [0.17, 0.14, 0.03], [0.33, -0.05, 0.02]]) { g.beginPath(); g.arc(S * x, S * y, S * r, 0, TAU); g.fill(); }
        g.restore();
      }
    },
  },
  {
    name: 'Angel Wings', color: 6,
    draw(g, S, col, t) {
      const flap = Math.sin(t * 3) * 0.08;
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx, 1); g.translate(S * 0.04, 0); g.rotate(-flap);
        for (let k = 5; k >= 0; k--) {
          const a = -0.95 + k * 0.27, len = S * (0.34 - k * 0.03);
          g.save(); g.rotate(a);
          g.beginPath(); g.ellipse(len * 0.55, 0, len * 0.55, S * 0.055, 0, 0, TAU);
          g.fillStyle = col.rainbow ? RAINBOW[k] : (k % 2 ? col.l : col.c); g.fill(); ol(g, S, 0.01);
          g.restore();
        }
        g.beginPath(); g.ellipse(S * 0.06, -S * 0.04, S * 0.08, S * 0.06, 0, 0, TAU); g.fillStyle = col.rainbow ? '#fff' : col.c; g.fill(); ol(g, S, 0.01);
        g.restore();
      }
    },
  },
];

// --- hand ----------------------------------------------------------------
const HAND = [
  { name: 'None' },
  {
    name: 'Magic Wand', color: 1, icon: [1.35, 0.42],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(0, S * 0.03); g.lineTo(S * 0.035, -S * 0.22);
      g.lineWidth = S * 0.032; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.018; g.strokeStyle = '#fff4fb'; g.stroke();
      starAt(g, S * 0.04, -S * 0.27, S * 0.075, Math.sin(t * 3) * 0.2);
      g.fillStyle = fillOf(g, col, S * 0.15); g.fill(); ol(g, S, 0.012);
      for (let i = 0; i < 3; i++) {
        const a = t * 2.5 + i * 2.1;
        g.save(); g.translate(S * 0.04 + Math.cos(a) * S * 0.11, -S * 0.27 + Math.sin(a) * S * 0.08);
        g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + i); drawSparkleShape(g, S * 0.05, i % 2 ? '#fff6a8' : '#fff'); g.restore();
      }
    },
  },
  {
    name: 'Bouquet', color: 0, icon: [1.4, 0.2],
    draw(g, S, col) {
      for (const [x, y, a] of [[-0.06, -0.13, -0.5], [0.07, -0.12, 0.5], [0.0, -0.17, 0]]) {
        g.save(); g.translate(S * x, S * y); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, S * 0.025, S * 0.05, 0, 0, TAU); g.fillStyle = '#5ccf7a'; g.fill(); ol(g, S, 0.008); g.restore();
      }
      const cs = col.rainbow ? RAINBOW : [col.c, '#fff4fb', '#ffd23f', col.l, '#ff7ac6'];
      [[-0.045, -0.15], [0.045, -0.15], [0, -0.19], [-0.02, -0.12], [0.03, -0.11]].forEach(([x, y], i) => flower(g, S * x, S * y, S * 0.032, cs[i % cs.length], '#ffd23f', S * 0.3));
      g.beginPath(); g.moveTo(-S * 0.07, -S * 0.11); g.lineTo(S * 0.07, -S * 0.11); g.lineTo(S * 0.012, S * 0.05); g.lineTo(-S * 0.012, S * 0.05); g.closePath();
      g.fillStyle = '#fff4fb'; g.fill(); ol(g, S, 0.012);
      g.beginPath(); g.ellipse(0, -S * 0.03, S * 0.03, S * 0.015, 0, 0, TAU); g.fillStyle = fillOf(g, col, S * 0.1); g.fill(); ol(g, S, 0.008);
    },
  },
  {
    name: 'Microphone', color: 2, icon: [1.6, 0.12],
    draw(g, S, col) {
      g.save(); g.rotate(0.25);
      g.beginPath(); g.moveTo(-S * 0.022, -S * 0.08); g.lineTo(S * 0.022, -S * 0.08); g.lineTo(S * 0.014, S * 0.06); g.lineTo(-S * 0.014, S * 0.06); g.closePath();
      g.fillStyle = fillOf(g, col, S * 0.1); g.fill(); ol(g, S, 0.01);
      g.beginPath(); g.arc(0, -S * 0.115, S * 0.045, 0, TAU); g.fillStyle = '#d8d8ea'; g.fill(); ol(g, S, 0.01);
      g.save(); g.clip(); g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = S * 0.005;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * S * 0.014, -S * 0.17); g.lineTo(k * S * 0.014, -S * 0.06); g.stroke(); g.beginPath(); g.moveTo(-S * 0.06, -S * 0.115 + k * S * 0.014); g.lineTo(S * 0.06, -S * 0.115 + k * S * 0.014); g.stroke(); }
      g.restore();
      g.beginPath(); g.rect(-S * 0.03, -S * 0.08, S * 0.06, S * 0.014); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.006);
      g.restore();
    },
  },
  {
    name: 'Balloon', color: 5, icon: [0.85, 0.32],
    draw(g, S, col, t) {
      const bx = S * 0.04 + Math.sin(t * 1.8) * S * 0.025, by = -S * 0.62;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(S * 0.08, -S * 0.28, bx, by + S * 0.13);
      g.lineWidth = Math.max(1, S * 0.006); g.strokeStyle = NAVY; g.stroke();
      g.save(); g.translate(bx, by); g.rotate(Math.sin(t * 1.8) * 0.08);
      heartPath(g, 0, 0, S * 0.26); g.fillStyle = fillOf(g, col, S * 0.26, true); g.fill(); ol(g, S, 0.01);
      g.beginPath(); g.moveTo(0, S * 0.1); g.lineTo(S * 0.02, S * 0.13); g.lineTo(-S * 0.02, S * 0.13); g.closePath(); g.fillStyle = col.d; g.fill();
      shine(g, -S * 0.06, -S * 0.06, S * 0.02, S * 0.035, 0.5);
      g.restore();
    },
  },
  {
    name: 'Parasol', color: 0, icon: [1.0, 0.3],
    draw(g, S, col) {
      g.beginPath(); g.moveTo(0, -S * 0.42); g.lineTo(0, S * 0.04); g.arc(-S * 0.025, S * 0.04, S * 0.025, 0, Math.PI);
      g.lineWidth = S * 0.018; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.009; g.strokeStyle = '#d9a300'; g.stroke();
      const cy = -S * 0.42, rw = S * 0.28;
      g.beginPath(); g.moveTo(-rw, cy + S * 0.02); g.quadraticCurveTo(0, cy - S * 0.36, rw, cy + S * 0.02);
      for (let k = 0; k < 5; k++) { const x0 = rw - (k + 0.5) * (2 * rw / 5), x1 = rw - (k + 1) * (2 * rw / 5); g.quadraticCurveTo(x0, cy - S * 0.04, x1, cy + S * 0.02); }
      g.closePath();
      g.fillStyle = fillOf(g, col, S * 0.5); g.fill();
      g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let k = -2; k <= 2; k += 2) { g.beginPath(); g.moveTo(0, cy - S * 0.2); g.lineTo(k * rw / 5 - rw / 5, cy + S * 0.05); g.lineTo(k * rw / 5 + rw / 5, cy + S * 0.05); g.closePath(); g.fill(); }
      g.restore();
      g.beginPath(); g.moveTo(-rw, cy + S * 0.02); g.quadraticCurveTo(0, cy - S * 0.36, rw, cy + S * 0.02);
      for (let k = 0; k < 5; k++) { const x0 = rw - (k + 0.5) * (2 * rw / 5), x1 = rw - (k + 1) * (2 * rw / 5); g.quadraticCurveTo(x0, cy - S * 0.04, x1, cy + S * 0.02); }
      g.closePath(); ol(g, S, 0.01);
      g.beginPath(); g.arc(0, cy - S * 0.17, S * 0.018, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.006);
    },
  },
];

// --- aura (behind + in front) ---------------------------------------------
function glow(g, S, color, a = 0.38) {
  const gr = g.createRadialGradient(0, 0, S * 0.05, 0, 0, S * 0.62);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.save(); g.globalAlpha *= a; g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, S * 0.5, S * 0.62, 0, 0, TAU); g.fill(); g.restore();
}
const AURA = [
  { name: 'None' },
  {
    name: 'Glitter', color: 1,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#ffe0f4' : col.c, 0.3); },
    draw(g, S, col, t) {
      for (let i = 0; i < 12; i++) {
        const a = t * 0.55 + (i * TAU) / 12, r = S * (0.36 + 0.07 * Math.sin(t * 2 + i));
        const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
        g.save(); g.translate(Math.cos(a) * r * 0.75, Math.sin(a) * r); g.globalAlpha *= 0.3 + tw * 0.7;
        drawSparkleShape(g, S * (0.04 + 0.03 * tw), i % 2 ? (col.rainbow ? RAINBOW[i % 7] : col.c) : '#ffffff'); g.restore();
      }
    },
  },
  {
    name: 'Hearts', color: 0,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#ffd0e8' : col.c, 0.28); },
    draw(g, S, col, t) {
      for (let i = 0; i < 7; i++) {
        const u = (t * 0.32 + i / 7) % 1;
        const x = Math.sin(i * 2.3 + t * 1.2) * S * 0.38, y = S * 0.42 - u * S * 0.95;
        g.save(); g.globalAlpha *= Math.sin(u * Math.PI);
        heartPath(g, x, y, S * (0.05 + (i % 3) * 0.012)); g.fillStyle = col.rainbow ? RAINBOW[i % 7] : (i % 2 ? col.c : col.l); g.fill(); ol(g, S, 0.006);
        g.restore();
      }
    },
  },
  {
    name: 'Bubbles', color: 3,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#d0f0ff' : col.l, 0.3); },
    draw(g, S, col, t) {
      for (let i = 0; i < 9; i++) {
        const u = (t * 0.25 + i / 9) % 1;
        const x = Math.sin(i * 1.9 + t * 1.6) * S * 0.36 + (i % 2 ? 1 : -1) * S * 0.08, y = S * 0.45 - u * S * 1.0;
        const r = S * (0.022 + (i % 3) * 0.012);
        g.save(); g.globalAlpha *= Math.min(1, Math.sin(u * Math.PI) * 1.6);
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = 'rgba(200,240,255,0.25)'; g.fill();
        g.lineWidth = Math.max(1, S * 0.006); g.strokeStyle = col.rainbow ? RAINBOW[i % 7] : col.c; g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, TAU); g.fill();
        g.restore();
      }
    },
  },
  {
    name: 'Rainbow', color: 7,
    behind(g, S, col, t) {
      const cs = col.rainbow ? RAINBOW.slice(0, 6) : [col.d, col.c, col.l, '#fff', col.l, col.c];
      g.save(); g.globalAlpha *= 0.85;
      cs.forEach((c, k) => {
        g.beginPath(); g.arc(0, S * 0.2, S * (0.56 - k * 0.04), Math.PI, TAU);
        g.lineWidth = S * 0.042; g.strokeStyle = c; g.stroke();
      });
      g.restore();
      for (const sx of [-1, 1]) {
        g.save(); g.translate(sx * S * 0.46, S * 0.2); g.fillStyle = '#fff';
        g.beginPath(); g.arc(-S * 0.06, 0, S * 0.06, 0, TAU); g.arc(S * 0.02, -S * 0.03, S * 0.075, 0, TAU); g.arc(S * 0.09, 0, S * 0.05, 0, TAU); g.fill();
        g.restore();
      }
    },
    draw(g, S, col, t) {
      for (let i = 0; i < 4; i++) {
        const a = Math.PI + (i + 0.5) / 4 * Math.PI + Math.sin(t + i) * 0.1;
        g.save(); g.translate(Math.cos(a) * S * 0.62, S * 0.2 + Math.sin(a) * S * 0.62);
        g.globalAlpha *= 0.5 + 0.5 * Math.sin(t * 4 + i * 2); drawSparkleShape(g, S * 0.05, '#fff'); g.restore();
      }
    },
  },
];

// --- more items (royal / party / fairy batch) -------------------------------
// Same conventions as above; every one also has an art key in fashion-show.js
// (WORN_ART) that replaces the drawing for its default colour once it exists.
/** An aura's particle art (prop/<key>) at the aura's default colour, else null. */
function auraArt(key, col, defColor) { return col === PALETTE[defColor] ? art('prop/' + key) : null; }
/** Draw particle art centred at the origin, `size` px across its longer side. */
function sprite(g, img, size) { const k = size / Math.max(img.width, img.height); g.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k); }
const pal = (col, i, alt) => (col.rainbow ? RAINBOW[i % RAINBOW.length] : alt || col.c);

/** Cape cloth from a top edge (y 0) to y = hh, w wide, scalloped hem. */
export function drawCapeShape(g, w, hh, col, t, deco = null) {
  // the box is generous (it must show around wide bodies): the cloth flares to 80% of it
  const sway = Math.sin(t * 2) * w * 0.03, top = w * 0.13, hem = w * 0.4;
  const path = () => {
    g.beginPath(); g.moveTo(-top, 0); g.lineTo(top, 0);
    g.quadraticCurveTo(hem * 0.6, hh * 0.45, hem + sway, hh * 0.97);
    for (let k = 0; k < 5; k++) {
      const x0 = hem - (k + 0.5) * hem * 0.4 + sway, x1 = hem - (k + 1) * hem * 0.4 + sway;
      g.quadraticCurveTo(x0, hh * 1.03, x1, hh * 0.97);
    }
    g.quadraticCurveTo(-hem * 0.6, hh * 0.45, -top, 0); g.closePath();
  };
  path();
  const gr = g.createLinearGradient(0, 0, 0, hh);
  if (col.rainbow) RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c)); else { gr.addColorStop(0, col.c); gr.addColorStop(1, col.d); }
  g.fillStyle = gr; g.fill();
  if (deco) { g.save(); path(); g.clip(); deco(g, w, hh); g.restore(); }
  path(); ol(g, Math.max(w, hh), 0.012);
  // cel-shade fold
  g.save(); g.globalAlpha *= 0.18; g.beginPath(); g.moveTo(w * 0.06, hh * 0.1); g.quadraticCurveTo(w * 0.2, hh * 0.5, w * 0.16 + sway, hh * 0.95); g.lineWidth = w * 0.05; g.strokeStyle = NAVY; g.stroke(); g.restore();
  // collar
  g.beginPath(); g.ellipse(0, 0, top * 1.25, w * 0.05, 0, 0, TAU); g.fillStyle = col.rainbow ? '#fff4fb' : col.l; g.fill(); ol(g, w, 0.012);
}
const starDeco = (g, w, hh) => {
  for (let i = 0; i < 9; i++) {
    const x = ((i * 0.37) % 1 - 0.5) * w * 0.8, y = hh * (0.15 + ((i * 0.53) % 1) * 0.75);
    starAt(g, x, y, w * (0.035 + (i % 3) * 0.012), i * 0.4); g.fillStyle = i % 2 ? '#fff6a8' : '#fff'; g.fill();
  }
};

/** Four-legged characters: a cape draped over the shoulders, seen from the side (+x = head). */
export function drawSideCape(g, w, col, t, item) {
  w *= 0.82;
  const hh = w * 0.42;
  const path = () => {
    g.beginPath(); g.moveTo(w * 0.42, -hh * 0.18);
    g.quadraticCurveTo(0, -hh * 0.42, -w * 0.48, -hh * 0.1);
    g.quadraticCurveTo(-w * 0.52, hh * 0.45, -w * 0.4, hh * 0.85);
    for (let k = 0; k < 4; k++) { const x0 = -w * 0.4 + (k + 0.5) * w * 0.19, x1 = -w * 0.4 + (k + 1) * w * 0.19; g.quadraticCurveTo(x0, hh * 0.98, x1, hh * 0.85); }
    g.quadraticCurveTo(w * 0.42, hh * 0.3, w * 0.42, -hh * 0.18); g.closePath();
  };
  path();
  const gr = g.createLinearGradient(0, -hh * 0.3, 0, hh);
  if (col.rainbow) RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c)); else { gr.addColorStop(0, col.c); gr.addColorStop(1, col.d); }
  g.fillStyle = gr; g.fill();
  if (item && item.name === 'Star Cape') { g.save(); path(); g.clip(); starDeco(g, w, hh); g.restore(); }
  path(); ol(g, w, 0.014);
  g.beginPath(); g.ellipse(w * 0.4, -hh * 0.12, w * 0.07, hh * 0.24, 0.2, 0, TAU); g.fillStyle = '#fff4fb'; g.fill(); ol(g, w, 0.01);
  gem(g, w * 0.4, -hh * 0.1, w * 0.04, '#ffd23f', w);
}

HEAD.push(
  {
    name: 'Unicorn Horn', color: 6, icon: [0.9, 0.3],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(-S * 0.46, S * 0.18); g.quadraticCurveTo(0, -S * 0.14, S * 0.46, S * 0.18);
      g.lineWidth = S * 0.1; g.strokeStyle = NAVY; g.lineCap = 'round'; g.stroke();
      g.lineWidth = S * 0.06; g.strokeStyle = col.rainbow ? RAINBOW[0] : '#ff7ac6'; g.stroke();
      for (const sx of [-1, 1]) flower(g, sx * S * 0.3, S * 0.02, S * 0.07, sx < 0 ? '#fff4fb' : '#ffd23f', '#ff7ac6', S);
      const horn = () => { g.beginPath(); g.moveTo(-S * 0.1, -S * 0.02); g.lineTo(S * 0.02, -S * 0.62); g.lineTo(S * 0.1, -S * 0.02); g.quadraticCurveTo(0, S * 0.04, -S * 0.1, -S * 0.02); g.closePath(); };
      horn(); g.fillStyle = fillOf(g, col, S, true); g.fill();
      g.save(); horn(); g.clip(); g.strokeStyle = col.rainbow ? 'rgba(255,255,255,0.7)' : col.d; g.lineWidth = S * 0.03;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-S * 0.12, -S * (0.04 + k * 0.12)); g.lineTo(S * 0.12, -S * (0.1 + k * 0.12)); g.stroke(); }
      g.restore(); horn(); ol(g, S);
      shine(g, -S * 0.02, -S * 0.3, S * 0.015, S * 0.08, 0.15);
      g.save(); g.translate(S * 0.1, -S * 0.62); g.globalAlpha = (Math.sin(t * 4) + 1) / 2; drawSparkleShape(g, S * 0.12, '#fff6a8'); g.restore();
    },
  },
  {
    name: 'Kitty Ears', color: 0, icon: [0.9, 0.22],
    draw(g, S, col) {
      g.beginPath(); g.moveTo(-S * 0.46, S * 0.18); g.quadraticCurveTo(0, -S * 0.14, S * 0.46, S * 0.18);
      g.lineWidth = S * 0.1; g.strokeStyle = NAVY; g.lineCap = 'round'; g.stroke();
      g.lineWidth = S * 0.06; g.strokeStyle = col.rainbow ? RAINBOW[5] : col.d; g.stroke();
      for (const sx of [-1, 1]) {
        g.save(); g.translate(sx * S * 0.27, S * 0.0); g.rotate(sx * 0.25);
        g.beginPath(); g.moveTo(-S * 0.14, S * 0.04); g.lineTo(-S * 0.02, -S * 0.32); g.lineTo(S * 0.14, S * 0.04); g.closePath();
        g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S);
        g.beginPath(); g.moveTo(-S * 0.07, S * 0.0); g.lineTo(-S * 0.02, -S * 0.2); g.lineTo(S * 0.07, S * 0.0); g.closePath();
        g.fillStyle = '#ffb3d9'; g.fill();
        g.restore();
      }
      g.save(); g.translate(S * 0.36, S * 0.02); g.rotate(0.3);
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * S * 0.06, 0, S * 0.07, S * 0.045, sx * 0.4, 0, TAU); g.fillStyle = '#fff4fb'; g.fill(); ol(g, S, 0.025); }
      g.beginPath(); g.arc(0, 0, S * 0.03, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.02);
      g.restore();
    },
  },
  {
    name: 'Princess Cone', color: 0, icon: [0.85, 0.35],
    draw(g, S, col, t) {
      S *= 0.72;   // drawn at full head width it hides the whole character
      // veil streaming back from the tip
      const sw = Math.sin(t * 2.2) * S * 0.04;
      g.save(); g.globalAlpha *= 0.7;
      g.beginPath(); g.moveTo(S * 0.06, -S * 1.0); g.quadraticCurveTo(-S * 0.5 + sw, -S * 0.6, -S * 0.55 + sw, S * 0.25);
      g.quadraticCurveTo(-S * 0.38, S * 0.3, -S * 0.2, S * 0.1); g.closePath();
      g.fillStyle = col.rainbow ? '#ffe0f4' : col.l; g.fill(); ol(g, S, 0.02); g.restore();
      g.beginPath(); g.moveTo(-S * 0.26, S * 0.1); g.lineTo(S * 0.06, -S * 1.0); g.lineTo(S * 0.26, S * 0.1); g.quadraticCurveTo(0, S * 0.18, -S * 0.26, S * 0.1); g.closePath();
      g.fillStyle = fillOf(g, col, S, true); g.fill(); ol(g, S);
      g.beginPath(); g.moveTo(-S * 0.27, S * 0.06); g.quadraticCurveTo(0, S * 0.16, S * 0.27, S * 0.06); g.lineWidth = S * 0.07; g.strokeStyle = '#ffd23f'; g.stroke();
      for (let k = 0; k < 3; k++) { starAt(g, S * (-0.04 + k * 0.04), -S * (0.25 + k * 0.2), S * 0.045); g.fillStyle = '#fff6a8'; g.fill(); ol(g, S, 0.015); }
      shine(g, -S * 0.08, -S * 0.3, S * 0.02, S * 0.12, 0.3, 0.5);
    },
  },
  {
    name: 'Heart Headband', color: 5, icon: [0.95, 0.15],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(-S * 0.46, S * 0.18); g.quadraticCurveTo(0, -S * 0.14, S * 0.46, S * 0.18);
      g.lineWidth = S * 0.1; g.strokeStyle = NAVY; g.lineCap = 'round'; g.stroke();
      g.lineWidth = S * 0.06; g.strokeStyle = col.rainbow ? RAINBOW[4] : col.d; g.stroke();
      for (const sx of [-1, 1]) {
        const b = Math.sin(t * 4 + sx) * S * 0.03;
        g.beginPath(); g.moveTo(sx * S * 0.16, S * 0.0); g.quadraticCurveTo(sx * S * 0.12, -S * 0.2, sx * S * 0.2, -S * 0.36 + b);
        g.lineWidth = S * 0.025; g.strokeStyle = NAVY; g.stroke();
        heartPath(g, sx * S * 0.2, -S * 0.4 + b, S * 0.22); g.fillStyle = col.rainbow ? RAINBOW[sx < 0 ? 0 : 5] : col.c; g.fill(); ol(g, S, 0.03);
        shine(g, sx * S * 0.2 - S * 0.04, -S * 0.44 + b, S * 0.025, S * 0.015);
      }
    },
  },
  {
    name: 'Fairy Halo', color: 1, icon: [1.4, 0.42],
    draw(g, S, col, t) {
      const y = -S * 0.32 + Math.sin(t * 2) * S * 0.03;
      g.save(); g.globalAlpha *= 0.35; g.beginPath(); g.ellipse(0, y, S * 0.46, S * 0.14, 0, 0, TAU); g.lineWidth = S * 0.12; g.strokeStyle = col.rainbow ? '#ffe0f4' : col.l; g.stroke(); g.restore();
      g.beginPath(); g.ellipse(0, y, S * 0.38, S * 0.1, 0, 0, TAU); g.lineWidth = S * 0.08; g.strokeStyle = NAVY; g.stroke();
      g.lineWidth = S * 0.05; g.strokeStyle = fillOf(g, col, S); g.stroke();
      for (let i = 0; i < 4; i++) {
        const a = t * 1.5 + i * TAU / 4;
        g.save(); g.translate(Math.cos(a) * S * 0.38, y + Math.sin(a) * S * 0.1); g.globalAlpha *= 0.6 + 0.4 * Math.sin(t * 5 + i);
        drawSparkleShape(g, S * 0.09, i % 2 ? '#fff' : '#fff6a8'); g.restore();
      }
    },
  },
);

FACE.push(
  {
    name: 'Masquerade Mask', color: 2,
    draw(g, S, col, t) {
      const mask = () => {
        g.beginPath(); g.moveTo(0, -S * 0.06);
        g.bezierCurveTo(S * 0.18, -S * 0.22, S * 0.42, -S * 0.2, S * 0.48, -S * 0.12);
        g.bezierCurveTo(S * 0.46, S * 0.08, S * 0.3, S * 0.14, S * 0.14, S * 0.08);
        g.quadraticCurveTo(S * 0.04, S * 0.04, 0, S * 0.08);
        g.quadraticCurveTo(-S * 0.04, S * 0.04, -S * 0.14, S * 0.08);
        g.bezierCurveTo(-S * 0.3, S * 0.14, -S * 0.46, S * 0.08, -S * 0.48, -S * 0.12);
        g.bezierCurveTo(-S * 0.42, -S * 0.2, -S * 0.18, -S * 0.22, 0, -S * 0.06); g.closePath();
      };
      // feather plume
      g.save(); g.translate(S * 0.42, -S * 0.12); g.rotate(0.5 + Math.sin(t * 2) * 0.06);
      g.beginPath(); g.ellipse(0, -S * 0.2, S * 0.06, S * 0.2, 0, 0, TAU); g.fillStyle = pal(col, 3, col.l); g.fill(); ol(g, S, 0.02);
      g.restore();
      mask(); g.fillStyle = fillOf(g, col, S); g.fill(); ol(g, S, 0.04);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(sx * S * 0.22, -S * 0.03, S * 0.1, S * 0.06, sx * -0.2, 0, TAU); g.fillStyle = 'rgba(36,22,63,0.85)'; g.fill();
        g.beginPath(); g.ellipse(sx * S * 0.22, -S * 0.03, S * 0.1, S * 0.06, sx * -0.2, 0, TAU); g.lineWidth = S * 0.025; g.strokeStyle = '#ffd23f'; g.stroke();
      }
      gem(g, 0, -S * 0.1, S * 0.045, '#ff4d6d', S);
      shine(g, -S * 0.36, -S * 0.12, S * 0.04, S * 0.018, -0.3, 0.7);
    },
  },
  {
    name: 'Monocle', color: 1,
    draw(g, S, col) {
      const x = S * 0.22, y = -S * 0.04;
      g.beginPath(); g.moveTo(x + S * 0.12, y + S * 0.12); g.quadraticCurveTo(x + S * 0.2, y + S * 0.4, x + S * 0.06, y + S * 0.55);
      g.lineWidth = S * 0.02; g.strokeStyle = '#d9a300'; g.stroke();
      g.beginPath(); g.arc(x, y, S * 0.17, 0, TAU); g.fillStyle = 'rgba(200,240,255,0.35)'; g.fill();
      g.lineWidth = S * 0.08; g.strokeStyle = NAVY; g.stroke();
      g.lineWidth = S * 0.05; g.strokeStyle = fillOf(g, col, S); g.stroke();
      shine(g, x - S * 0.06, y - S * 0.07, S * 0.05, S * 0.022, -0.6, 0.9);
    },
  },
  {
    name: 'Kitty Whiskers', color: 0,
    draw(g, S, col) {
      g.beginPath(); heartPath(g, 0, S * 0.2, S * 0.12); g.fillStyle = fillOf(g, col, S * 0.2); g.fill(); ol(g, S, 0.02);
      g.lineCap = 'round';
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        g.beginPath(); g.moveTo(sx * S * 0.2, S * (0.2 + k * 0.05)); g.quadraticCurveTo(sx * S * 0.34, S * (0.16 + k * 0.07), sx * S * 0.48, S * (0.12 + k * 0.1));
        g.lineWidth = S * 0.025; g.strokeStyle = NAVY; g.stroke();
      }
    },
  },
  {
    name: 'Butterfly Paint', color: 3,
    draw(g, S, col, t) {
      g.save(); g.translate(S * 0.3, S * 0.14); g.rotate(-0.3);
      const k = 0.85 + 0.15 * Math.cos(t * 4);
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx * k, 1);
        g.beginPath(); g.ellipse(S * 0.07, -S * 0.05, S * 0.07, S * 0.055, -0.5, 0, TAU); g.fillStyle = pal(col, 2); g.fill(); ol(g, S, 0.012);
        g.beginPath(); g.ellipse(S * 0.05, S * 0.04, S * 0.045, S * 0.035, 0.5, 0, TAU); g.fillStyle = col.rainbow ? RAINBOW[4] : col.d; g.fill(); ol(g, S, 0.012);
        g.restore();
      }
      g.beginPath(); g.ellipse(0, 0, S * 0.012, S * 0.06, 0, 0, TAU); g.fillStyle = NAVY; g.fill();
      g.restore();
      for (const [x, y] of [[-S * 0.32, S * 0.18], [-S * 0.24, S * 0.26]]) { g.save(); g.translate(x, y); drawSparkleShape(g, S * 0.06, '#fff'); g.restore(); }
    },
  },
  {
    name: 'Party Goggles', color: 4,
    draw(g, S, col) {
      g.beginPath(); g.moveTo(-S * 0.5, -S * 0.04); g.lineTo(S * 0.5, -S * 0.04); g.lineWidth = S * 0.06; g.strokeStyle = NAVY; g.stroke();
      const lens = () => { g.beginPath(); g.moveTo(-S * 0.44, -S * 0.16); g.quadraticCurveTo(0, -S * 0.24, S * 0.44, -S * 0.16); g.quadraticCurveTo(S * 0.48, S * 0.1, S * 0.3, S * 0.1); g.quadraticCurveTo(0, S * 0.02, -S * 0.3, S * 0.1); g.quadraticCurveTo(-S * 0.48, S * 0.1, -S * 0.44, -S * 0.16); g.closePath(); };
      lens(); g.fillStyle = fillOf(g, col, S); g.globalAlpha *= 0.55; g.fill(); g.globalAlpha /= 0.55;
      lens(); g.lineWidth = S * 0.07; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.035; g.strokeStyle = col.rainbow ? '#fff4fb' : col.d; g.stroke();
      shine(g, -S * 0.22, -S * 0.1, S * 0.12, S * 0.025, -0.15, 0.8);
      shine(g, S * 0.24, -S * 0.12, S * 0.05, S * 0.015, -0.15, 0.6);
    },
  },
);

NECK.push(
  {
    name: 'Royal Pendant', color: 3,
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(-S * 0.34, -S * 0.08); g.quadraticCurveTo(0, S * 0.32, S * 0.34, -S * 0.08);
      g.lineWidth = S * 0.05; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.03; g.strokeStyle = '#ffd23f'; g.stroke();
      g.save(); g.translate(0, S * 0.24); g.rotate(Math.sin(t * 2) * 0.08);
      g.beginPath(); g.arc(0, S * 0.04, S * 0.12, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.035);
      gem(g, 0, S * 0.04, S * 0.085, col.rainbow ? '#ff9fd8' : col.c, S);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * S * 0.12, S * 0.04 + Math.sin(a) * S * 0.12, S * 0.02, 0, TAU); g.fillStyle = '#fff4fb'; g.fill(); }
      g.restore();
    },
  },
  {
    name: 'Ruffle Collar', color: 6,
    draw(g, S, col) {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1, x = u * S * 0.36, y = -S * 0.02 + (1 - u * u) * S * 0.12;
        g.beginPath(); g.ellipse(x, y, S * 0.08, S * 0.11, u * 0.6, 0, TAU);
        g.fillStyle = col.rainbow ? RAINBOW[i % 7] : (i % 2 ? col.c : col.l); g.fill(); ol(g, S, 0.02);
      }
      gem(g, 0, S * 0.14, S * 0.05, '#ff4d6d', S);
    },
  },
  {
    name: 'Candy Necklace', color: 7,
    draw(g, S, col) {
      g.beginPath(); g.moveTo(-S * 0.38, -S * 0.06); g.quadraticCurveTo(0, S * 0.46, S * 0.38, -S * 0.06); g.lineWidth = S * 0.012; g.strokeStyle = NAVY; g.stroke();
      const n = 11, cs = col.rainbow ? RAINBOW : [col.c, '#fff4fb', col.l, '#6fe3b4', '#ffd23f'];
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1, x = u * S * 0.36, y = -S * 0.04 + (1 - u * u) * S * 0.2;
        g.save(); g.translate(x, y); g.rotate(u * 0.8);
        g.beginPath(); g.ellipse(0, 0, S * 0.045, S * 0.035, 0, 0, TAU); g.fillStyle = cs[i % cs.length]; g.fill(); ol(g, S, 0.016);
        g.beginPath(); g.arc(0, 0, S * 0.012, 0, TAU); g.fillStyle = 'rgba(36,22,63,0.4)'; g.fill();
        g.restore();
      }
    },
  },
  {
    name: 'Star Medal', color: 1,
    draw(g, S, col, t) {
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(sx * S * 0.3, -S * 0.08); g.lineTo(sx * S * 0.04, S * 0.2); g.lineTo(sx * S * 0.12, S * 0.22); g.lineTo(sx * S * 0.36, -S * 0.04); g.closePath();
        g.fillStyle = sx < 0 ? '#3fa7ff' : '#ff4d6d'; g.fill(); ol(g, S, 0.02);
      }
      g.save(); g.translate(0, S * 0.32); g.rotate(Math.sin(t * 2.4) * 0.1);
      g.beginPath(); g.arc(0, 0, S * 0.15, 0, TAU); g.fillStyle = fillOf(g, col, S * 0.3); g.fill(); ol(g, S, 0.035);
      starAt(g, 0, S * 0.01, S * 0.09); g.fillStyle = col.rainbow ? '#fff' : col.d; g.fill(); ol(g, S, 0.015);
      shine(g, -S * 0.06, -S * 0.07, S * 0.04, S * 0.02);
      g.restore();
    },
  },
  {
    name: 'Feather Boa', color: 0,
    draw(g, S, col, t) {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        // around the neck, then one end hangs down the front
        const x = u < 0.7 ? Math.cos(Math.PI * (1 - u / 0.7)) * S * 0.38 : S * 0.38 - (u - 0.7) * S * 0.5,
          y = u < 0.7 ? Math.sin(Math.PI * (u / 0.7)) * S * 0.14 : S * (0.0 + (u - 0.7) * 1.8) + Math.sin(t * 2.5) * S * 0.02;
        g.save(); g.translate(x, y); g.rotate(i * 0.9);
        g.beginPath(); g.ellipse(0, 0, S * 0.1, S * 0.07, 0, 0, TAU); g.fillStyle = col.rainbow ? RAINBOW[i % 7] : (i % 3 ? col.c : col.l); g.fill();
        g.lineWidth = Math.max(1, S * 0.012); g.strokeStyle = col.rainbow ? 'rgba(36,22,63,0.5)' : col.d; g.stroke();
        g.restore();
      }
    },
  },
);

BACK.push(
  {
    name: 'Dragonfly Wings', color: 4,
    draw(g, S, col, t) {
      const flap = Math.sin(t * 12) * 0.1;
      for (const sx of [-1, 1]) for (const [a, len, w] of [[-0.35, 0.4, 0.07], [0.25, 0.34, 0.06]]) {
        g.save(); g.scale(sx, 1); g.rotate(a - flap * (a < 0 ? 1 : -1));
        g.globalAlpha *= 0.75;
        g.beginPath(); g.ellipse(S * len * 0.5, 0, S * len * 0.5, S * w, 0, 0, TAU);
        g.fillStyle = col.rainbow ? fillOf(g, col, S * 0.6) : col.l; g.fill(); ol(g, S, 0.01);
        g.strokeStyle = col.rainbow ? '#fff' : col.d; g.lineWidth = S * 0.005; g.globalAlpha = 0.7;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(S * len * 0.95, 0); for (let k = 1; k < 5; k++) { g.moveTo(S * len * k * 0.2, -S * w * 0.8); g.lineTo(S * len * k * 0.2, S * w * 0.8); } g.stroke();
        g.restore();
      }
    },
  },
  {
    name: 'Petal Wings', color: 0,
    draw(g, S, col, t) {
      const k = 0.88 + 0.12 * Math.cos(t * 4);
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx * k, 1);
        for (let i = 0; i < 4; i++) {
          const a = -1.0 + i * 0.55;
          g.save(); g.rotate(a);
          g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(S * 0.12, -S * 0.1, S * 0.3, -S * 0.06, S * 0.32, 0); g.bezierCurveTo(S * 0.3, S * 0.06, S * 0.12, S * 0.1, 0, 0);
          g.fillStyle = col.rainbow ? RAINBOW[i + (sx > 0 ? 2 : 0)] : (i % 2 ? col.l : col.c); g.fill(); ol(g, S, 0.01);
          g.beginPath(); g.moveTo(S * 0.03, 0); g.lineTo(S * 0.26, 0); g.lineWidth = S * 0.005; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
          g.restore();
        }
        g.restore();
      }
      flower(g, 0, 0, S * 0.05, '#fff4fb', '#ffd23f', S * 0.3);
    },
  },
  {
    name: 'Dragon Wings', color: 4,
    draw(g, S, col, t) {
      const flap = Math.sin(t * 3.5) * 0.12;
      for (const sx of [-1, 1]) {
        g.save(); g.scale(sx, 1); g.rotate(-0.15 - flap);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(S * 0.12, -S * 0.2); g.lineTo(S * 0.42, -S * 0.28);
        g.quadraticCurveTo(S * 0.36, -S * 0.16, S * 0.42, -S * 0.08); g.quadraticCurveTo(S * 0.3, -S * 0.06, S * 0.32, S * 0.04);
        g.quadraticCurveTo(S * 0.2, -S * 0.0, S * 0.18, S * 0.1); g.quadraticCurveTo(S * 0.08, S * 0.02, 0, S * 0.06); g.closePath();
        g.fillStyle = col.rainbow ? fillOf(g, col, S * 0.6) : col.c; g.fill(); ol(g, S, 0.012);
        g.beginPath(); g.moveTo(S * 0.12, -S * 0.2); g.lineTo(S * 0.18, S * 0.08); g.moveTo(S * 0.12, -S * 0.2); g.lineTo(S * 0.32, S * 0.02); g.moveTo(S * 0.12, -S * 0.2); g.lineTo(S * 0.42, -S * 0.1);
        g.lineWidth = S * 0.01; g.strokeStyle = col.rainbow ? '#fff' : col.d; g.stroke();
        g.beginPath(); g.arc(S * 0.42, -S * 0.28, S * 0.018, 0, TAU); g.fillStyle = '#fff4fb'; g.fill(); ol(g, S, 0.006);
        g.restore();
      }
    },
  },
  {
    name: 'Big Back Bow', color: 5,
    draw(g, S, col, t) {
      g.save(); g.rotate(Math.sin(t * 2) * 0.04);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(0, 0);
        g.bezierCurveTo(sx * S * 0.14, -S * 0.22, sx * S * 0.38, -S * 0.16, sx * S * 0.34, S * 0.02);
        g.bezierCurveTo(sx * S * 0.3, S * 0.14, sx * S * 0.12, S * 0.08, 0, 0);
        g.fillStyle = fillOf(g, col, S * 0.8); g.fill(); ol(g, S, 0.012);
        g.beginPath(); g.moveTo(sx * S * 0.02, S * 0.02); g.quadraticCurveTo(sx * S * 0.1, S * 0.2, sx * S * 0.16, S * 0.34); g.lineTo(sx * S * 0.1, S * 0.32); g.lineTo(sx * S * 0.07, S * 0.36);
        g.quadraticCurveTo(sx * S * 0.04, S * 0.18, 0, S * 0.04); g.closePath(); g.fillStyle = col.rainbow ? RAINBOW[sx < 0 ? 1 : 4] : col.d; g.fill(); ol(g, S, 0.01);
        shine(g, sx * S * 0.2, -S * 0.08, S * 0.04, S * 0.015, sx * -0.5, 0.6);
      }
      g.beginPath(); g.ellipse(0, 0, S * 0.05, S * 0.06, 0, 0, TAU); g.fillStyle = col.rainbow ? '#ff7ac6' : col.d; g.fill(); ol(g, S, 0.012);
      g.restore();
    },
  },
  {
    name: 'Star Cape', color: 2, cape: true,
    draw(g, S, col, t, box) {
      const w = box ? box.w : S * 0.64, hh = box ? box.h : S * 0.6;
      drawCapeShape(g, w, hh, col, t, starDeco);
    },
  },
  {
    name: 'Teddy Backpack', color: 0,
    draw(g, S, col, t) {
      // the pack sits on the back; the teddy peeks over the shoulder
      // (high on the back, so on front-facing characters only the teddy shows)
      g.beginPath(); g.roundRect ? g.roundRect(-S * 0.12, -S * 0.2, S * 0.24, S * 0.26, S * 0.07) : g.rect(-S * 0.12, -S * 0.2, S * 0.24, S * 0.26);
      g.fillStyle = fillOf(g, col, S * 0.3); g.fill(); ol(g, S, 0.012);
      g.beginPath(); g.rect(-S * 0.09, -S * 0.04, S * 0.18, S * 0.08); g.fillStyle = col.rainbow ? '#fff4fb' : col.d; g.fill(); ol(g, S, 0.01);
      const bob = Math.sin(t * 2.5) * S * 0.01, hx = S * 0.11, hy = -S * 0.27 + bob;
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(hx + sx * S * 0.065, hy - S * 0.055, S * 0.032, 0, TAU); g.fillStyle = '#c98a55'; g.fill(); ol(g, S, 0.008); }
      g.beginPath(); g.arc(hx, hy, S * 0.075, 0, TAU); g.fillStyle = '#c98a55'; g.fill(); ol(g, S, 0.01);
      g.beginPath(); g.ellipse(hx + S * 0.01, hy + S * 0.025, S * 0.035, S * 0.025, 0, 0, TAU); g.fillStyle = '#f2d2a9'; g.fill();
      g.fillStyle = NAVY;
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(hx + sx * S * 0.026, hy - S * 0.01, S * 0.009, 0, TAU); g.fill(); }
      g.beginPath(); g.arc(hx + S * 0.01, hy + S * 0.017, S * 0.009, 0, TAU); g.fill();
    },
  },
);
// The existing cape uses the same fitted shape when its art is missing.
{
  const rc = BACK.find((it) => it.name === 'Royal Cape'), plain = rc.draw;
  rc.cape = true;
  rc.draw = (g, S, col, t, box) => (box ? drawCapeShape(g, box.w, box.h, col, t) : plain(g, S, col, t));
}

HAND.push(
  {
    name: 'Royal Scepter', color: 1, icon: [1.3, 0.38],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(-S * 0.01, S * 0.08); g.lineTo(S * 0.02, -S * 0.3);
      g.lineWidth = S * 0.03; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.018; g.strokeStyle = '#ffd23f'; g.stroke();
      for (const y of [-0.05, -0.2]) { g.beginPath(); g.ellipse(S * 0.005 + S * 0.02 * (y / -0.3), S * y, S * 0.022, S * 0.01, 0, 0, TAU); g.fillStyle = '#d9a300'; g.fill(); ol(g, S, 0.005); }
      g.beginPath(); g.arc(S * 0.022, -S * 0.34, S * 0.05, 0, TAU); g.fillStyle = fillOf(g, col, S * 0.1); g.fill(); ol(g, S, 0.01);
      shine(g, S * 0.008, -S * 0.355, S * 0.012, S * 0.008);
      g.save(); g.translate(S * 0.022, -S * 0.4); g.beginPath(); g.moveTo(-S * 0.03, S * 0.02); g.lineTo(-S * 0.03, -S * 0.02); g.lineTo(-S * 0.012, 0); g.lineTo(0, -S * 0.03); g.lineTo(S * 0.012, 0); g.lineTo(S * 0.03, -S * 0.02); g.lineTo(S * 0.03, S * 0.02); g.closePath();
      g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.006); g.restore();
      g.save(); g.translate(S * 0.06, -S * 0.42); g.globalAlpha = (Math.sin(t * 4) + 1) / 2; drawSparkleShape(g, S * 0.04, '#fff'); g.restore();
    },
  },
  {
    name: 'Lollipop', color: 0, icon: [1.4, 0.3],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(0, S * 0.05); g.lineTo(S * 0.01, -S * 0.22); g.lineWidth = S * 0.022; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.012; g.strokeStyle = '#fff4fb'; g.stroke();
      const cx = S * 0.01, cy = -S * 0.3, r = S * 0.09;
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fillStyle = col.rainbow ? '#fff4fb' : col.l; g.fill();
      g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip(); g.translate(cx, cy); g.rotate(t * 0.8);
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(0, 0, r * (0.25 + k * 0.15), k * 1.1, k * 1.1 + 3.6); g.lineWidth = r * 0.12; g.strokeStyle = col.rainbow ? RAINBOW[k] : (k % 2 ? col.c : col.d); g.stroke(); }
      g.restore();
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); ol(g, S, 0.01);
      shine(g, cx - r * 0.4, cy - r * 0.4, r * 0.2, r * 0.1);
      g.beginPath(); g.moveTo(0, -S * 0.2); g.lineTo(-S * 0.05, -S * 0.17); g.lineTo(-S * 0.04, -S * 0.22); g.closePath(); g.moveTo(S * 0.01, -S * 0.2); g.lineTo(S * 0.06, -S * 0.17); g.lineTo(S * 0.055, -S * 0.22); g.closePath();
      g.fillStyle = '#ff4d6d'; g.fill(); ol(g, S, 0.005);
    },
  },
  {
    name: 'Handbag', color: 2, icon: [1.6, 0.0],
    draw(g, S, col) {
      g.beginPath(); g.moveTo(-S * 0.05, S * 0.09); g.quadraticCurveTo(-S * 0.04, -S * 0.02, 0, -S * 0.0); g.quadraticCurveTo(S * 0.04, -S * 0.02, S * 0.05, S * 0.09);
      g.lineWidth = S * 0.016; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.008; g.strokeStyle = '#ffd23f'; g.stroke();
      g.beginPath(); g.moveTo(-S * 0.09, S * 0.08); g.lineTo(S * 0.09, S * 0.08); g.lineTo(S * 0.1, S * 0.2); g.quadraticCurveTo(0, S * 0.23, -S * 0.1, S * 0.2); g.closePath();
      g.fillStyle = fillOf(g, col, S * 0.2); g.fill(); ol(g, S, 0.01);
      g.beginPath(); g.moveTo(-S * 0.09, S * 0.08); g.quadraticCurveTo(0, S * 0.15, S * 0.09, S * 0.08); g.fillStyle = col.rainbow ? '#fff4fb' : col.d; g.fill(); ol(g, S, 0.008);
      heartPath(g, 0, S * 0.12, S * 0.04); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.004);
      shine(g, -S * 0.06, S * 0.15, S * 0.012, S * 0.03, 0.2, 0.5);
    },
  },
  {
    name: 'Lace Fan', color: 6, icon: [1.4, 0.2],
    draw(g, S, col, t) {
      g.save(); g.rotate(-0.2 + Math.sin(t * 6) * 0.12);
      const r = S * 0.2;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, -Math.PI * 0.95, -Math.PI * 0.05); g.closePath();
      g.fillStyle = fillOf(g, col, r); g.fill();
      g.strokeStyle = col.rainbow ? '#fff' : col.d; g.lineWidth = S * 0.005;
      for (let k = 1; k < 8; k++) { const a = -Math.PI * 0.95 + k * Math.PI * 0.9 / 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, -Math.PI * 0.95, -Math.PI * 0.05); g.closePath(); ol(g, S, 0.01);
      for (let k = 0; k < 9; k++) { const a = -Math.PI * 0.95 + k * Math.PI * 0.9 / 8; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, S * 0.014, 0, TAU); g.fillStyle = '#fff4fb'; g.fill(); ol(g, S, 0.004); }
      g.beginPath(); g.arc(0, 0, S * 0.02, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); ol(g, S, 0.006);
      g.restore();
    },
  },
  {
    name: 'Star Balloon', color: 1, icon: [0.85, 0.32],
    draw(g, S, col, t) {
      const bx = S * 0.04 + Math.sin(t * 1.7) * S * 0.025, by = -S * 0.62;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(S * 0.08, -S * 0.28, bx, by + S * 0.12);
      g.lineWidth = Math.max(1, S * 0.006); g.strokeStyle = NAVY; g.stroke();
      g.save(); g.translate(bx, by); g.rotate(Math.sin(t * 1.7) * 0.1);
      starAt(g, 0, 0, S * 0.13, 0, 0.55); g.fillStyle = fillOf(g, col, S * 0.26, true); g.fill(); ol(g, S, 0.01);
      starAt(g, 0, 0, S * 0.07, 0, 0.55); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill();
      shine(g, -S * 0.04, -S * 0.05, S * 0.015, S * 0.03, 0.5);
      g.restore();
    },
  },
  {
    name: 'Bubble Wand', color: 3, icon: [1.3, 0.35],
    draw(g, S, col, t) {
      g.beginPath(); g.moveTo(0, S * 0.04); g.lineTo(S * 0.03, -S * 0.2); g.lineWidth = S * 0.022; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.012; g.strokeStyle = pal(col, 3); g.stroke();
      g.beginPath(); g.arc(S * 0.035, -S * 0.26, S * 0.055, 0, TAU); g.lineWidth = S * 0.022; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = S * 0.012; g.strokeStyle = pal(col, 1); g.stroke();
      for (let i = 0; i < 4; i++) {
        const u = (t * 0.5 + i / 4) % 1, x = S * (0.06 + u * 0.3) + Math.sin(t * 3 + i) * S * 0.02, y = -S * (0.28 + u * 0.25), r = S * (0.02 + (i % 2) * 0.015);
        g.save(); g.globalAlpha *= Math.sin(u * Math.PI);
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = 'rgba(200,240,255,0.3)'; g.fill(); g.lineWidth = Math.max(1, S * 0.005); g.strokeStyle = col.rainbow ? RAINBOW[i * 2] : col.d; g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU); g.fill();
        g.restore();
      }
    },
  },
);

AURA.push(
  {
    name: 'Butterflies', color: 2,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#ffe0f4' : col.l, 0.25); },
    iconDraw(g, s, col, t) {
      [[-0.18, 0.12, 0.42], [0.2, -0.12, 0.32]].forEach(([x, y, r], i) => {
        const k = 0.6 + 0.4 * Math.abs(Math.cos(t * 6 + i));
        g.save(); g.translate(x * s, y * s);
        for (const sx of [-1, 1]) {
          g.save(); g.scale(sx * k, 1);
          g.beginPath(); g.ellipse(s * r * 0.3, -s * r * 0.18, s * r * 0.32, s * r * 0.25, -0.5, 0, TAU); g.fillStyle = col.rainbow ? RAINBOW[i * 3] : col.c; g.fill(); ol(g, s, 0.02);
          g.beginPath(); g.ellipse(s * r * 0.2, s * r * 0.2, s * r * 0.2, s * r * 0.16, 0.5, 0, TAU); g.fillStyle = col.rainbow ? RAINBOW[i * 3 + 1] : col.l; g.fill(); ol(g, s, 0.02);
          g.restore();
        }
        g.restore();
      });
    },
    draw(g, S, col, t) {
      const img = auraArt('aura-butterfly', col, 2);
      for (let i = 0; i < 5; i++) {
        const a = t * 0.6 + i * TAU / 5, x = Math.cos(a) * S * 0.42, y = Math.sin(a * 1.3) * S * 0.38 - S * 0.05;
        const k = 0.4 + 0.6 * Math.abs(Math.cos(t * 9 + i));
        g.save(); g.translate(x, y); g.rotate(Math.sin(a) * 0.4);
        if (img) { g.scale(k, 1); sprite(g, img, S * 0.1); g.restore(); continue; }
        for (const sx of [-1, 1]) {
          g.save(); g.scale(sx * k, 1);
          g.beginPath(); g.ellipse(S * 0.025, -S * 0.015, S * 0.028, S * 0.022, -0.5, 0, TAU); g.fillStyle = col.rainbow ? RAINBOW[i] : (i % 2 ? col.c : col.l); g.fill(); ol(g, S, 0.004);
          g.beginPath(); g.ellipse(S * 0.018, S * 0.017, S * 0.018, S * 0.014, 0.5, 0, TAU); g.fill(); ol(g, S, 0.004);
          g.restore();
        }
        g.restore();
      }
    },
  },
  {
    name: 'Shooting Stars', color: 1,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#fff0a8' : col.l, 0.28); },
    iconDraw(g, s, col, t) {
      [[-0.12, 0.1, 0.16], [0.2, -0.16, 0.1]].forEach(([x, y, r], i) => {
        g.beginPath(); g.moveTo(x * s, y * s); g.lineTo((x + 0.3) * s, (y - 0.16) * s); g.lineWidth = s * 0.06; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineCap = 'round'; g.stroke();
        starAt(g, x * s, y * s, r * s, i); g.fillStyle = col.rainbow ? RAINBOW[i * 2] : col.c; g.fill(); ol(g, s, 0.025);
      });
    },
    draw(g, S, col, t) {
      const img = auraArt('aura-shooting-star', col, 1);
      for (let i = 0; i < 4; i++) {
        const u = (t * 0.35 + i / 4) % 1, x = S * (0.5 - u * 1.0), y = -S * 0.45 + u * S * 0.5 + (i % 2) * S * 0.2;
        g.save(); g.globalAlpha *= Math.sin(u * Math.PI);
        if (img) { g.translate(x + S * 0.06, y - S * 0.03); sprite(g, img, S * 0.2); g.restore(); continue; }
        const gr = g.createLinearGradient(x, y, x + S * 0.2, y - S * 0.1); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + S * 0.2, y - S * 0.1); g.lineWidth = S * 0.018; g.strokeStyle = gr; g.lineCap = 'round'; g.stroke();
        starAt(g, x, y, S * 0.04, t * 3 + i); g.fillStyle = col.rainbow ? RAINBOW[i * 2] : col.c; g.fill(); ol(g, S, 0.005);
        g.restore();
      }
    },
  },
  {
    name: 'Snowflakes', color: 3,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#d0f0ff' : col.l, 0.25); },
    iconDraw(g, s, col, t) {
      [[-0.14, 0.08, 0.22], [0.2, -0.16, 0.13]].forEach(([x, y, r], i) => {
        g.save(); g.translate(x * s, y * s); g.rotate(t * 0.5 + i);
        g.lineCap = 'round';
        for (const [w, c] of [[s * 0.07, NAVY], [s * 0.035, col.rainbow ? RAINBOW[i * 3] : col.c]]) {
          g.lineWidth = w; g.strokeStyle = c;
          for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * s); g.moveTo(0, -r * s * 0.6); g.lineTo(r * s * 0.25, -r * s * 0.8); g.moveTo(0, -r * s * 0.6); g.lineTo(-r * s * 0.25, -r * s * 0.8); g.stroke(); }
        }
        g.restore();
      });
    },
    draw(g, S, col, t) {
      const img = auraArt('aura-snowflake', col, 3);
      for (let i = 0; i < 8; i++) {
        const u = (t * 0.18 + i / 8) % 1, x = Math.sin(i * 2.1 + t) * S * 0.4, y = -S * 0.5 + u * S * 0.95, r = S * (0.025 + (i % 3) * 0.008);
        g.save(); g.translate(x, y); g.rotate(t + i); g.globalAlpha *= Math.sin(u * Math.PI);
        if (img) { sprite(g, img, r * 2.2); g.restore(); continue; }
        g.strokeStyle = col.rainbow ? RAINBOW[i % 7] : (i % 2 ? '#fff' : col.c); g.lineWidth = Math.max(1, S * 0.006); g.lineCap = 'round';
        for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r); g.moveTo(0, -r * 0.6); g.lineTo(r * 0.25, -r * 0.8); g.moveTo(0, -r * 0.6); g.lineTo(-r * 0.25, -r * 0.8); g.stroke(); }
        g.restore();
      }
    },
  },
  {
    name: 'Music Notes', color: 2,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#ffe0f4' : col.l, 0.22); },
    iconDraw(g, s, col, t) {
      [[-0.14, 0.18, 0.2], [0.18, 0.04, 0.15]].forEach(([x, y, r], i) => {
        g.save(); g.translate(x * s, y * s);
        g.beginPath(); g.ellipse(0, 0, r * s * 0.5, r * s * 0.38, -0.4, 0, TAU); g.fillStyle = col.rainbow ? RAINBOW[i * 3] : col.c; g.fill(); ol(g, s, 0.025);
        g.beginPath(); g.moveTo(r * s * 0.45, -r * s * 0.1); g.lineTo(r * s * 0.45, -r * s * 1.5); g.lineTo(r * s * 1.0, -r * s * 1.15); g.lineWidth = r * s * 0.16; g.strokeStyle = NAVY; g.stroke();
        g.restore();
      });
    },
    draw(g, S, col, t) {
      const img = auraArt('aura-note', col, 2);
      for (let i = 0; i < 6; i++) {
        const u = (t * 0.3 + i / 6) % 1, x = Math.sin(i * 2.7 + t * 1.3) * S * 0.38, y = S * 0.35 - u * S * 0.85, s = S * 0.05;
        g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3 + i) * 0.25); g.globalAlpha *= Math.sin(u * Math.PI);
        if (img) { sprite(g, img, s * 1.8); g.restore(); continue; }
        g.fillStyle = col.rainbow ? RAINBOW[i % 7] : (i % 2 ? col.c : col.d);
        g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.38, -0.4, 0, TAU); g.fill(); ol(g, S, 0.005);
        g.beginPath(); g.moveTo(s * 0.45, -s * 0.1); g.lineTo(s * 0.45, -s * 1.4); if (i % 2) g.lineTo(s * 1.0, -s * 1.1); g.lineWidth = s * 0.16; g.strokeStyle = NAVY; g.stroke();
        g.restore();
      }
    },
  },
  {
    name: 'Flower Petals', color: 0,
    behind(g, S, col) { glow(g, S, col.rainbow ? '#ffd0e8' : col.l, 0.25); },
    iconDraw(g, s, col, t) {
      [[-0.16, 0.1, 0.6], [0.14, -0.12, -0.5], [0.18, 0.18, 1.6]].forEach(([x, y, a], i) => {
        g.save(); g.translate(x * s, y * s); g.rotate(a + Math.sin(t * 2 + i) * 0.2);
        g.beginPath(); g.moveTo(-s * 0.13, 0); g.quadraticCurveTo(0, -s * 0.11, s * 0.13, 0); g.quadraticCurveTo(0, s * 0.11, -s * 0.13, 0);
        g.fillStyle = col.rainbow ? RAINBOW[i * 2] : (i % 2 ? col.l : col.c); g.fill(); ol(g, s, 0.02);
        g.restore();
      });
    },
    draw(g, S, col, t) {
      const img = auraArt('aura-petal', col, 0);
      for (let i = 0; i < 9; i++) {
        const u = (t * 0.22 + i / 9) % 1, x = Math.sin(i * 1.7 + t * 1.4) * S * 0.42, y = -S * 0.5 + u * S * 0.95;
        g.save(); g.translate(x, y); g.rotate(t * 2 + i); g.globalAlpha *= Math.sin(u * Math.PI);
        if (img) { sprite(g, img, S * 0.06); g.restore(); continue; }
        g.beginPath(); g.ellipse(0, 0, S * 0.025, S * 0.014, 0, 0, TAU); g.fillStyle = col.rainbow ? RAINBOW[i % 7] : (i % 3 ? col.c : col.l); g.fill(); ol(g, S, 0.004);
        g.restore();
      }
    },
  },
);

export const CATS = [
  { id: 'head', name: 'Head', items: HEAD, tabItem: 1 },
  { id: 'face', name: 'Face', items: FACE, tabItem: 2 },
  { id: 'neck', name: 'Neck', items: NECK, tabItem: 1 },
  { id: 'back', name: 'Back', items: BACK, tabItem: 1 },
  { id: 'hand', name: 'Hand', items: HAND, tabItem: 1 },
  { id: 'aura', name: 'Aura', items: AURA, tabItem: 4 },
];
export const CAT = Object.fromEntries(CATS.map((c, i) => [c.id, i]));

/**
 * Draw an item as a little menu icon centered at (cx, cy) inside a `size` box.
 */
export function drawItemIcon(g, catIdx, itemIdx, colIdx, cx, cy, size, t) {
  const cat = CATS[catIdx], it = cat.items[itemIdx];
  const col = PALETTE[colIdx ?? it.color ?? 0];
  g.save(); g.translate(cx, cy);
  if (!it.draw) {
    g.setLineDash([size * 0.08, size * 0.07]);
    g.beginPath(); g.arc(0, 0, size * 0.3, 0, TAU); g.lineWidth = Math.max(2, size * 0.04); g.strokeStyle = 'rgba(36,22,63,0.4)'; g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.moveTo(-size * 0.12, -size * 0.12); g.lineTo(size * 0.12, size * 0.12); g.moveTo(size * 0.12, -size * 0.12); g.lineTo(-size * 0.12, size * 0.12);
    g.stroke(); g.restore(); return;
  }
  const [ks, dy] = it.icon || [1, 0];
  switch (cat.id) {
    case 'head': { const S = size * 0.78 * ks; g.translate(0, dy * size); it.draw(g, S, col, t); break; }
    case 'face': {
      const S = size * 0.82;
      g.beginPath(); g.arc(0, 0, S * 0.48, 0, TAU); g.fillStyle = '#ffe2c8'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.stroke();
      g.fillStyle = NAVY; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * S * 0.2, -S * 0.04, S * 0.05, 0, TAU); g.fill(); }
      g.beginPath(); g.arc(0, S * 0.12, S * 0.12, 0.2, Math.PI - 0.2); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
      it.draw(g, S, col, t); break;
    }
    case 'neck': { const S = size * 0.95; g.translate(0, -size * 0.12); it.draw(g, S, col, t); break; }
    case 'back': { const S = size * 1.25; g.translate(0, size * 0.02); it.draw(g, S, col, t); break; }
    case 'hand': { const S = size * 1.75 * ks; g.translate(0, dy * size); it.draw(g, S, col, t); break; }
    case 'aura': {
      const S = size * 1.25;
      if (it.iconDraw) { it.behind && it.behind(g, S, col, t); it.iconDraw(g, size, col, t); break; }
      g.translate(0, size * 0.04);
      it.behind && it.behind(g, S, col, t);
      it.draw(g, S, col, t); break;
    }
    default: break;
  }
  g.restore();
}

// ===========================================================================
// Art and fitting
// ===========================================================================

// Only substitute matching palette variants: X must still change the outfit's
// color. Other colors and wardrobe items retain their procedural rendering.
const WORN_ART = {
  Crown: { colors: { 1: 'crown-gold', 6: 'crown-silver' }, w: 0.95, h: 0.7, ay: 1 },
  Tiara: { colors: { 6: 'tiara-pearl' }, w: 0.95, h: 0.55, ay: 1 },
  'Flower Crown': { colors: { 0: 'crown-flower' }, w: 1.05, h: 0.55, ay: 0.8 },
  'Big Bow': { colors: { 0: 'bow-pink', 1: 'bow-gold', 3: 'bow-blue' }, w: 0.9, h: 0.65, ay: 1 },
  'Wizard Hat': { colors: { 2: 'hat-witch' }, w: 1.15, h: 1, ay: 1 },
  Glasses: { colors: { 2: 'glasses-round' }, w: 1.05, h: 0.5, ay: 0.5 },
  'Heart Shades': { colors: { 0: 'glasses-heart' }, w: 1.05, h: 0.5, ay: 0.5 },
  Pearls: { colors: { 6: 'necklace-pearls' }, w: 0.65, h: 0.48, ay: 0 },
  'Heart Locket': { colors: { 0: 'necklace-heart' }, w: 0.65, h: 0.48, ay: 0 },
  'Fairy Wings': { colors: { 0: 'wings-fairy' }, w: 0.85, h: 0.65, ay: 0.57, flap: 5 },
  'Butterfly Wings': { colors: { 2: 'wings-butterfly' }, w: 0.85, h: 0.65, ay: 0.55, flap: 5 },
  'Angel Wings': { colors: { 6: 'wings-feather' }, w: 0.85, h: 0.6, ay: 0.65, flap: 3 },
  'Royal Cape': { colors: { 5: 'cape-royal', 7: 'cape-rainbow' }, w: 0.65, h: 0.62, ay: 0, sway: true },
  'Magic Wand': { colors: { 1: 'wand-star', 0: 'wand-heart' }, w: 0.17, h: 0.38, ay: 0.88 },
  'Top Hat': { colors: { 2: 'hat-top' }, w: 1.0, h: 0.95, ay: 0.82 },
  'Party Hat': { colors: { 7: 'hat-party' }, w: 0.62, h: 0.85, ay: 0.95 },
  'Sun Hat': { colors: { 1: 'hat-sun' }, w: 1.35, h: 0.82, ay: 0.78 },
  Beret: { colors: { 5: 'hat-beret' }, w: 1.0, h: 0.72, ay: 0.85 },
  'Star Glasses': { colors: { 1: 'glasses-star' }, w: 1.05, h: 0.5, ay: 0.5 },
  Sunglasses: { colors: { 2: 'glasses-sun' }, w: 1.0, h: 0.48, ay: 0.5 },
  'Flower Lei': { colors: { 0: 'necklace-lei' }, w: 0.85, h: 0.85, ay: 0.04 },
};
// The newer items: art for their default colour (other colours keep the drawing).
// w, h: fit box in S (the category's size unit); ay: anchor height from the
// top of the image (fraction of its height); dx: sideways shift in S.
Object.assign(WORN_ART, {
  'Unicorn Horn': { colors: { 6: 'headband-unicorn' }, w: 1.0, h: 0.85, ay: 0.558701 },
  'Kitty Ears': { colors: { 0: 'headband-kitty' }, w: 1.0, h: 0.55, ay: 0.371922 },
  'Princess Cone': { colors: { 0: 'hat-princess' }, w: 0.85, h: 0.9, ay: 0.88 },
  'Heart Headband': { colors: { 5: 'headband-hearts' }, w: 1.3, h: 0.975, ay: 0.61 },
  'Fairy Halo': { colors: { 1: 'halo-fairy' }, w: 1.0, h: 0.35, ay: 1.4 },
  'Masquerade Mask': { colors: { 2: 'mask-masquerade' }, w: 1.95, h: 1.1, ay: 0.6 },
  Monocle: { colors: { 1: 'glasses-monocle' }, w: 0.42, h: 0.75, ay: 0.22, dx: 0.24 },
  'Kitty Whiskers': { colors: { 0: 'face-whiskers' }, w: 1.0, h: 0.5, ay: 0.2 },
  'Butterfly Paint': { colors: { 3: 'face-butterfly' }, w: 1.0, h: 0.5, ay: 0.2 },
  'Party Goggles': { colors: { 4: 'glasses-goggles' }, w: 1.05, h: 0.45, ay: 0.5 },
  'Royal Pendant': { colors: { 3: 'necklace-pendant' }, w: 0.7, h: 0.55, ay: 0.1 },
  'Ruffle Collar': { colors: { 6: 'collar-ruffle' }, w: 0.85, h: 0.35, ay: 0.25 },
  'Candy Necklace': { colors: { 7: 'necklace-candy' }, w: 0.85, h: 0.35, ay: 0.1 },
  'Star Medal': { colors: { 1: 'medal-star' }, w: 0.75, h: 0.55, ay: 0.15 },
  'Feather Boa': { colors: { 0: 'boa-feather' }, w: 1.3, h: 1.105, ay: 0.2 },
  'Dragonfly Wings': { colors: { 4: 'wings-dragonfly' }, w: 0.9, h: 0.55, ay: 0.55, flap: 7 },
  'Petal Wings': { colors: { 0: 'wings-petal' }, w: 0.75, h: 0.6, ay: 0.5, flap: 4 },
  'Dragon Wings': { colors: { 4: 'wings-dragon' }, w: 0.95, h: 0.5, ay: 0.6, flap: 3.5 },
  'Big Back Bow': { colors: { 5: 'bow-back' }, w: 0.75, h: 0.55, ay: 0.4 },
  'Star Cape': { colors: { 2: 'cape-star' }, w: 0.65, h: 0.62, ay: 0, sway: true },
  'Teddy Backpack': { colors: { 0: 'backpack-teddy' }, w: 0.36, h: 0.5, ay: 0.8, dx: -0.08 },
  'Royal Scepter': { colors: { 1: 'scepter-royal' }, w: 0.15, h: 0.5, ay: 0.84 },
  Lollipop: { colors: { 0: 'lollipop-swirl' }, w: 0.2, h: 0.45, ay: 0.88 },
  Handbag: { colors: { 2: 'handbag' }, w: 0.22, h: 0.26, ay: 0.05 },
  'Lace Fan': { colors: { 6: 'fan-lace' }, w: 0.42, h: 0.24, ay: 0.9 },
  'Star Balloon': { colors: { 1: 'balloon-star' }, w: 0.3, h: 0.8, ay: 0.98 },
  'Bubble Wand': { colors: { 3: 'wand-bubble' }, w: 0.18, h: 0.32, ay: 0.9 },
});
// Extra palette variants that have their own art.
WORN_ART.Tiara.colors[0] = 'tiara-star';
WORN_ART['Royal Cape'].colors[3] = 'cape-starry';

// Items whose art can be recoloured for colours without their own file: the
// drawn fallback for these looks wrong (a flat trapezoid cape on a unicorn),
// so the base art's main colour is remapped to the palette colour instead.
const RECOLOR_BASE = { 'Royal Cape': { key: 'cape-royal', from: '#d90e22', hue: [335, 20] } };
const recolored = new Map();   // `${key}|${color}` -> canvas
function itemArt(name, color) {
  const spec = WORN_ART[name], key = spec?.colors[color];
  const img = key && art('prop/' + key);
  if (img) return img;
  const base = RECOLOR_BASE[name], col = PALETTE[color], src = base && art('prop/' + base.key);
  if (!src || !col || col.rainbow) return null;
  const ck = `${base.key}|${color}`;
  if (!recolored.has(ck)) {
    let c = null;
    try { c = recolorFrame(src, null, [{ from: base.from, to: col.c, hue: base.hue, feather: 10, sat: [0.35, 1], lit: [0.08, 0.9] }]); } catch (e) { /* unreadable canvas */ }
    recolored.set(ck, c);
  }
  return recolored.get(ck);
}

// Four-legged characters (Fox, Unicorn, Cotton Candy, Fellowfox) wear the
// cape draped over the back from the side (prop/cape-royal-side, recoloured
// like the upright cape). Without that art they keep the upright cape.
function sideCapeArt(color) {
  const src = art('prop/cape-royal-side'), col = PALETTE[color];
  if (!src) return null;
  if (!col || color === 5) return src;   // Ruby = the art's own red
  const ck = `cape-royal-side|${color}`;
  if (!recolored.has(ck)) {
    const rule = (to) => [{ from: '#d90e22', to, hue: [335, 20], feather: 10, sat: [0.35, 1], lit: [0.08, 0.9] }];
    let c = src;
    try {
      if (!col.rainbow) c = recolorFrame(src, null, rule(col.c));
      else {
        // Rainbow: vertical stripes, like the upright rainbow cape art.
        c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const cg = c.getContext('2d'), n = RAINBOW.length, sw = src.width / n;
        RAINBOW.forEach((hue, i) => {
          const band = recolorFrame(src, null, rule(hue));
          cg.drawImage(band, Math.floor(i * sw), 0, Math.ceil(sw), src.height, Math.floor(i * sw), 0, Math.ceil(sw), src.height);
        });
      }
    } catch (e) { c = src; /* unreadable canvas */ }
    recolored.set(ck, c);
  }
  return recolored.get(ck);
}

/** Menu icon: the item's art when this color has one, else the vector icon. */
export function drawItemIconArt(g, ci, ii, colIdx, cx, cy, size, t) {
  const it = CATS[ci].items[ii];
  const img = itemArt(it.name, colIdx ?? it.color ?? 0);
  if (img) {
    const k = ci === CAT.back ? 0.95 : ci === CAT.hand ? 0.9 : 0.82;
    const s = Math.min(size * k / img.width, size * k / img.height);
    g.drawImage(img, cx - img.width * s / 2, cy - img.height * s / 2, img.width * s, img.height * s);
    return;
  }
  drawItemIcon(g, ci, ii, colIdx, cx, cy, size, t);
}

function drawWornArt(g, item, color, S, t, box = null) {
  const spec = WORN_ART[item.name], img = spec && itemArt(item.name, color);
  if (!img) return false;
  // box: an exact size to stretch to (capes fitted to the body); else fit spec w x h of S.
  const scale = Math.min(S * spec.w / img.width, S * spec.h / img.height);
  const w = box ? box.w : img.width * scale, h = box ? box.h : img.height * scale;
  g.save();
  if (spec.flap) g.scale(0.91 + 0.09 * Math.cos(t * spec.flap), 1);
  if (spec.sway) g.transform(1, 0, Math.sin(t * 2) * 0.035, 1, 0, 0);
  g.drawImage(img, (spec.dx || 0) * S - w / 2, -h * spec.ay, w, h);
  g.restore();
  return true;
}

// Where each category sits on a character (see the header). Every item follows a sprite
// landmark of the frame being drawn (attachment info, forward space: feet at
// 0, -y up, +x the way the character faces, already scaled by the frame's
// bodyHeight, the actor's scale and any procedural lean/tumble/squash):
//   head (hats, crowns, bows)    -> head   (+ head tilt)
//   face (glasses, masks, paint) -> eyes   (+ head tilt)
//   neck (necklaces, bowties)    -> neck   (+ half the head tilt)
//   back (wings, capes, packs)   -> back   (drawn behind the body; + body tilt on four-legged characters)
//   hand (wands, balloons, bags) -> hand
// The head tilt comes from the frame's eyes -> head line compared with the
// idle frame's, so hats roll with a tumble or a tilted giggle.
// FIT tweaks characters whose landmark means something else for clothes,
// as offsets in body heights from another landmark of the same frame (so the
// tweak still follows every frame):
//   quad: four-legged; wings/side cape sit on the shoulders, between neck and back
//   head / back / neck / hand: { from: landmark, d: [x, y] }
//   wings: scale of wings (wide bodies need bigger wings to show)
//   capeTop / capeW: upright cape: top edge (offset from `eyes`) and width
//   sideCape: { w }  four-legged characters: width of the cape over the back
//   neckS: necklace/bowtie/scarf scale
const FIT = {
  fox: { quad: true, wings: 0.72, sideCape: { w: 0.58 } },
  fellowfox: { quad: true, wings: 0.8, sideCape: { w: 0.6 }, hand: { from: 'eyes', d: [0.12, 0.14] } },
  unicorn: { quad: true, wings: 0.72, sideCape: { w: 0.58 } },
  'cotton-candy': { quad: true, wings: 0.72, sideCape: { w: 0.5 } },
  // round, armless cake: wings behind the top tier, things "held" beside it
  'marshmallow-birthday-cake': { back: { from: 'eyes', d: [0, -0.16] }, neck: { from: 'eyes', d: [0, 0.17] }, wings: 1.45, capeTop: -0.36, capeW: 1.75, neckS: 1.0, hand: { from: 'eyes', d: [0.36, 0.22] } },
  // the head point sits under the flame crest: hats go up onto it
  hotdog: { head: { from: 'head', d: [0, -0.05] }, back: { from: 'eyes', d: [0.09, -0.19] }, wings: 1.6, capeTop: -0.21, capeW: 2.3, hand: { from: 'eyes', d: [0.49, 0.17] } },
  snowstar: { hand: { from: 'neck', d: [0.3, 0.12] } },
  'kpop-girl-center': { wings: 0.75 }, 'kpop-girl-left': { wings: 0.75 }, 'kpop-girl-right': { wings: 0.75 },   // big head: keep held things (parasol pole) off the face
};

// Idle-frame reference directions per sprite set (eyes -> head, back -> neck).
const refCache = new Map();
function idleRef(asset) {
  if (refCache.has(asset)) return refCache.get(asset);
  const set = getSpriteSet(asset), idle = set && set.poses.idle, fr = idle && idle.frames[0];
  if (!set) return null;   // not loaded (yet): no cache
  let r = null;
  if (fr && fr.head && fr.eyes) {
    const flip = (idle.facing ?? set.facing) === -1 ? -1 : 1;
    const v = (p, q) => (p && q ? Math.atan2(p[1] - q[1], (p[0] - q[0]) * flip) : null);
    r = { head: v(fr.head, fr.eyes), body: v(fr.neck, fr.back) };
  }
  refCache.set(asset, r);
  return r;
}
const wrapAng = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/** Small tilts are landmark noise (and base art has none): ease in past a dead zone. */
const deadZone = (a, z = 0.1) => (Math.abs(a) <= z ? 0 : a - Math.sign(a) * z);
const rot = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });

/** Category anchor points for one member in the current frame (forward space). */
function wornAnchors(def, info) {
  const h = info.h, fit = FIT[def.asset] || {}, ref = idleRef(def.asset);
  const { eyes } = info;
  let head = info.head, neck = info.neck, back = info.back, hand = info.hand;
  // A frame that marks its head but not its eyes (or hand) gets the engine's
  // base-art guess for those, which floats off a turned head: no eyes means
  // the face is turned away (twirl from behind), so face items hide; a
  // missing hand falls back to the neck.
  const near = (p, x, y) => Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5;
  const aspect = info.w / h, fx = (def.face[0] - aspect / 2) * h;
  const guessed = (p, y) => near(p, fx, y) || near(p, -fx, y);
  const headData = !guessed(head, -(def.top ?? 1) * h);
  const faceHidden = headData && guessed(eyes, -(1 - def.face[1]) * h);
  if (headData && near(hand, 0.28 * h, -0.5 * h)) hand = neck;
  let headTilt = info.headAngle || 0;
  const hv = { x: head.x - eyes.x, y: head.y - eyes.y };
  if (!headTilt && !faceHidden && ref && ref.head != null && Math.hypot(hv.x, hv.y) > 0.04 * h) headTilt = deadZone(wrapAng(Math.atan2(hv.y, hv.x) - ref.head));
  let bodyTilt = 0;
  if (fit.quad && ref && ref.body != null) {
    const bv = { x: neck.x - back.x, y: neck.y - back.y };
    if (Math.hypot(bv.x, bv.y) > 0.06 * h) bodyTilt = clamp(deadZone(wrapAng(Math.atan2(bv.y, bv.x) - ref.body), 0.12), -0.8, 0.8);
  }
  const pts = { head, eyes, neck, back, hand };
  const rel = (spec, tilt) => { const o = pts[spec.from], d = rot(spec.d[0] * h, spec.d[1] * h, tilt); return { x: o.x + d.x, y: o.y + d.y }; };
  if (fit.quad) {
    // their "hand" is the mouth: a hand point down by the hooves is a data slip
    if (hand.y > neck.y + 0.15 * h) hand = { x: lerp(head.x, neck.x, 0.6) + 0.06 * h, y: lerp(head.y, neck.y, 0.6) };
    // shoulders: 45% of the way from the neck to the back point, a little up
    const up = rot(0, -0.05 * h, bodyTilt);
    back = { x: lerp(neck.x, back.x, 0.45) + up.x, y: lerp(neck.y, back.y, 0.45) + up.y };
  }
  if (fit.head) head = rel(fit.head, headTilt);
  if (fit.back) back = rel(fit.back, headTilt);
  if (fit.neck) neck = rel(fit.neck, headTilt);
  if (fit.hand) hand = rel(fit.hand, headTilt);
  const capeTop = fit.capeTop != null ? eyes.y + fit.capeTop * h : neck.y + 0.02 * h;
  return { h, head, eyes, neck, back, hand, headTilt, bodyTilt, capeTop, fit, faceHidden };
}

// ===========================================================================
// Public API: catalog, attachment and drawing
// ===========================================================================

/** Slot ids in tab order: head face neck back hand aura. */
export const OUTFIT_SLOTS = CATS.map((c) => c.id);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Every wearable item (not the "None" entries), each with id, slot, name, color (default palette index), art. */
export const OUTFIT_ITEMS = [];
CATS.forEach((c) => c.items.forEach((it, i) => {
  it.slot = c.id;
  it.id = i ? slug(it.name) : null;
  it.art = WORN_ART[it.name] || null;
  if (i) OUTFIT_ITEMS.push(it);
}));
const BY_ID = new Map(OUTFIT_ITEMS.map((it) => [it.id, it]));
/** The item with this id, or null. */
export const outfitItem = (id) => BY_ID.get(id) || null;

/**
 * Where every slot goes on one member in the current frame, in the
 * attachment's forward space. Returns the anchors (`head eyes neck back hand`,
 * `headTilt`, `bodyTilt`, `faceHidden`, `fit`, `h`, `faceW`, `headW`) plus
 * `slots[slot]` = { x, y, rot, S } (S = the slot's size unit for the drawings).
 */
export function outfitAnchors(def, info) {
  const A = wornAnchors(def, info), h = A.h, fit = A.fit;
  const faceW = clamp(def.face[2] * h * 2, h * 0.2, h * 0.5), headW = faceW * 1.08;
  // hats sit a touch into the hair: down along the head's own axis
  const hd = rot(0, headW * 0.1, A.headTilt);
  A.faceW = faceW; A.headW = headW;
  A.slots = {
    head: { x: A.head.x + hd.x, y: A.head.y + hd.y, rot: A.headTilt, S: headW },
    face: { x: A.eyes.x, y: A.eyes.y, rot: A.headTilt, S: faceW },
    neck: { x: A.neck.x, y: A.neck.y, rot: A.headTilt * 0.5, S: faceW * (fit.neckS || 1) },
    back: { x: A.back.x, y: A.back.y, rot: A.bodyTilt, S: h * (fit.wings || 1) },
    hand: { x: A.hand.x, y: A.hand.y, rot: 0, S: h },
    aura: { x: 0, y: -h * 0.5, rot: 0, S: h },
  };
  return A;
}

/**
 * Forward-space placement of one slot's item for a member:
 * { x, y, rot, scale (= S), behind, box?, sideCape? }. Capes get `box`
 * ({ w, h } hanging from y) or, on four-legged characters, `sideCape` (draped
 * over the shoulders in front of the body).
 */
export function outfitAttach(def, info, slot, item = null) {
  const A = outfitAnchors(def, info), s = A.slots[slot], h = A.h, fit = A.fit;
  const at = { x: s.x, y: s.y, rot: s.rot, scale: s.S, behind: slot === 'back', hidden: slot === 'face' && A.faceHidden };
  if (slot === 'back' && item && item.cape) {
    if (fit.quad) return { x: A.back.x, y: A.back.y + 0.01 * h, rot: A.bodyTilt, scale: h * (fit.sideCape?.w || 0.6), behind: false, sideCape: true };
    const top = A.capeTop;
    return { x: A.back.x, y: top, rot: 0, scale: h, behind: true, box: { w: (fit.capeW || 0.9) * h, h: Math.max(0.25 * h, -top) } };
  }
  return at;
}

/**
 * World-space placement of a slot on an actor's leader, from the current
 * frame's landmarks (Actor.anchor): { x, y, scale, rot, flip, behind }.
 * It ignores the procedural squash/tilt the actor adds while drawing, so use
 * it for particles and HUD, and draw items with drawOutfit inside an
 * attachment (wearOutfit) so they ride every bit of motion.
 */
export function outfitAttachWorld(actor, slot) {
  const m = actor.members[0], def = m.def, h = def.h * actor.scale, f = m.facing || 1;
  const fwd = (p) => ({ x: (p.x - m.x) * f, y: p.y - (m.y - actor.z) });
  const feet = { x: m.x, y: m.y - actor.z };
  const get = (name) => { const p = actor.anchor(name); return p.x === feet.x && p.y === feet.y ? null : fwd(p); };
  const head = get('head'), eyes = get('eyes') || { x: head.x, y: head.y + 0.15 * h };
  const center = { x: 0, y: -0.5 * h };
  const info = {
    h, w: actor.members.length === 1 ? actor.width : h * 0.6,
    head, eyes, hand: get('hand') || { x: 0.28 * h, y: -0.5 * h },
    neck: get('neck') || { x: eyes.x, y: lerp(eyes.y, center.y, 0.35) },
    back: get('back') || center, headAngle: 0, member: 0,
  };
  const at = outfitAttach(def, info, slot);
  return { x: m.x + at.x * f, y: m.y - actor.z + at.y, scale: at.scale, rot: at.rot * f, flip: f, behind: at.behind };
}

/**
 * Draw one item at the current origin (already translated/rotated to its
 * attach point) with size unit S: its art for this colour if loaded, else the
 * procedural drawing. layer 'back' draws an aura's glow (other items ignore it).
 */
export function drawOutfitItem(g, item, colour, S, t = 0, { layer = 'front', box = null } = {}) {
  if (!item) return;
  const col = PALETTE[colour ?? item.color ?? 0] || PALETTE[0];
  if (layer === 'back' && item.slot === 'aura') { if (item.behind) item.behind(g, S, col, t); return; }
  if (!item.draw) return;
  if (!drawWornArt(g, item, colour ?? item.color ?? 0, S, t, box)) item.draw(g, S, col, t, box);
}

/** [{ id | item, colour }] or { slot: { id | item, colour } } -> { slot: { item, colour } } */
function normalizeOutfit(outfit) {
  const out = {};
  const list = Array.isArray(outfit) ? outfit : Object.values(outfit || {});
  for (const e of list) {
    if (!e) continue;
    const item = e.item || outfitItem(e.id);
    if (item && item.draw) out[item.slot] = { item, colour: e.colour ?? e.color ?? item.color ?? 0 };
  }
  return out;
}

/**
 * Draw a member's outfit inside an Actor attachment callback (forward space).
 *   outfit: [{ id, colour }] (one per slot; colour = PALETTE index) or entries with `item`
 *   layer:  'back' (attach with behind: true: wings, upright capes, aura glow)
 *           | 'front' (everything else)
 *   t:      animation time (flapping, sparkles); pop(slot) -> extra scale (pop-in)
 * Auras draw once per character (on member 0). Returns the anchors
 * (outfitAnchors) so callers can place sparkles on items.
 */
export function drawOutfit(g, def, info, outfit, { layer = 'front', t = 0, pop = null } = {}) {
  const A = outfitAnchors(def, info), h = A.h, fit = A.fit, wear = normalizeOutfit(outfit);
  const put = (slot, at = A.slots[slot], box = null) => {
    const w = wear[slot];
    if (!w) return;
    g.save(); g.translate(at.x, at.y);
    if (at.rot) g.rotate(at.rot);
    const k = pop ? pop(slot) : 1; if (k !== 1) g.scale(k, k);
    drawOutfitItem(g, w.item, w.colour, at.S, t, { layer, box });
    g.restore();
  };
  const bk = wear.back, quadCape = !!(bk && fit.quad && bk.item.cape);
  if (layer === 'back') {
    if (info.member === 0) put('aura');
    if (bk && !quadCape) {
      if (bk.item.cape) {
        // hangs from just under the neck to the floor, wider than the body so it shows
        const at = outfitAttach(def, info, 'back', bk.item);
        put('back', { x: at.x, y: at.y, rot: 0, S: h }, at.box);
      } else put('back');
    }
    return A;
  }
  if (quadCape) {
    // draped over the shoulders, in front of the body; art faces right like the sprites' forward space
    const k = pop ? pop('back') : 1, sw = h * (fit.sideCape?.w || 0.6) * k;
    const sideArt = bk.item.name === 'Royal Cape' ? sideCapeArt(bk.colour) : null;
    g.save(); g.translate(A.back.x, A.back.y + 0.01 * h); g.rotate(A.bodyTilt); g.transform(1, 0, Math.sin(t * 2) * 0.03, 1, 0, 0);
    if (sideArt) { const sh = sw * sideArt.height / sideArt.width; g.drawImage(sideArt, -sw / 2, -sh * 0.25, sw, sh); }
    else drawSideCape(g, sw, PALETTE[bk.colour] || PALETTE[0], t, bk.item);
    g.restore();
  }
  put('neck');
  if (!A.faceHidden) put('face');
  put('head');
  put('hand');
  if (info.member === 0) put('aura');
  return A;
}

/**
 * Dress an Actor: attaches both layers to every member. `getOutfit()` is
 * called every frame (so changes show at once) and returns the outfit for
 * drawOutfit; opts.time() gives the animation time (default: seconds since
 * page load). Returns handles for unwearOutfit(actor, handles).
 */
export function wearOutfit(actor, getOutfit, { time = () => performance.now() / 1000 } = {}) {
  const handles = [];
  actor.char.members.forEach((def, mi) => {
    handles.push(actor.attach((g, info) => drawOutfit(g, def, info, getOutfit(), { layer: 'back', t: time() }), { member: mi, behind: true }));
    handles.push(actor.attach((g, info) => drawOutfit(g, def, info, getOutfit(), { layer: 'front', t: time() }), { member: mi }));
  });
  return handles;
}
export function unwearOutfit(actor, handles) { for (const h of handles || []) actor.detach(h); }

// --- saved "dress up" looks (character select) --------------------------------
// One look per character, kept in this browser: [{ id, colour }].
const LOOKS_KEY = 'charlie-party-looks';
function readLooks() {
  try { return JSON.parse(localStorage.getItem(LOOKS_KEY) || '{}') || {}; } catch (e) { return {}; }
}
/** The saved look for a character ([] when none), keeping only items that still exist. */
export function loadLook(charId) {
  const l = readLooks()[charId];
  return Array.isArray(l) ? l.filter((e) => e && outfitItem(e.id)).map((e) => ({ id: e.id, colour: e.colour | 0 })) : [];
}
export function saveLook(charId, look) {
  const all = readLooks();
  all[charId] = (look || []).map((e) => ({ id: e.id, colour: e.colour | 0 }));
  try { localStorage.setItem(LOOKS_KEY, JSON.stringify(all)); } catch (e) { /* private mode: this visit only */ }
}
