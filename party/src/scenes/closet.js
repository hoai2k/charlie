// Dress-up closet for character select: a player's custom look (the
// "Dress up" colour slot). Pick a spot (left/right or LB/RB), try on items
// (up/down: worn right away), A changes the item's colour, X / B done.
// The look is the Fashion Show wardrobe (engine/outfits.js), saved per
// character in this browser and worn in every game.
import { sfx } from '../engine/audio.js';
import { particles } from '../engine/particles.js';
import * as ui from '../engine/ui.js';
import { CATS, PALETTE, drawItemIconArt, loadLook, saveLook, outfitItem, CAT, recallAdj } from '../engine/outfits.js';

const ROWS = 5;

export class Closet {
  /** h: the character-select human ({ charId, actor, ctrl }); opens on its saved look. */
  constructor(h) {
    this.h = h;
    this.tab = 0;
    this.t = 0;
    this.bump = 0;
    // per spot: worn item index (0 = none) and each item's colour
    this.spots = CATS.map((c) => ({ item: 0, colors: c.items.map((it) => it.color ?? 0) }));
    for (const e of loadLook(h.charId)) {
      const it = outfitItem(e.id), ci = it ? CAT[it.slot] : -1, ii = ci >= 0 ? CATS[ci].items.indexOf(it) : -1;
      if (ii > 0) { this.spots[ci].item = ii; this.spots[ci].colors[ii] = e.colour | 0; }
    }
    // open on the first spot that's still empty (else head)
    const empty = this.spots.findIndex((s) => !s.item);
    this.tab = empty >= 0 ? empty : 0;
    this.scroll = this.spots[this.tab].item;
  }

  /** The look as [{ id, colour }]. */
  get look() {
    const out = [];
    this.spots.forEach((s, ci) => {
      if (!s.item) return;
      const id = CATS[ci].items[s.item].id;
      out.push({ id, colour: s.colors[s.item], ...recallAdj(this.h.charId, id) });   // keeps Fashion Show nudges
    });
    return out;
  }

  apply() {
    const look = this.look;
    saveLook(this.h.charId, look);
    this.h.actor.setOutfit(look);
  }

  /** Returns true when the player is done. */
  update(dt) {
    const c = this.h.ctrl;
    this.t += dt; this.bump = Math.max(0, this.bump - dt * 4);
    const dx = c.nav.x + (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
    if (dx) { this.tab = (this.tab + Math.sign(dx) + CATS.length) % CATS.length; sfx('move'); this.bump = 1; }
    const s = this.spots[this.tab], n = CATS[this.tab].items.length;
    if (c.nav.y) {
      s.item = (s.item + c.nav.y + n) % n;
      sfx(s.item ? 'select' : 'move');
      this.apply();
      if (s.item) this.h.actor.playOnce(['cheer', 'wave', 'celebrate'][s.item % 3], 0.6, 'idle');
    }
    if (c.pressed('a')) {
      if (s.item) {
        s.colors[s.item] = (s.colors[s.item] + 1) % PALETTE.length;
        sfx('pop'); this.apply();
        if (this.at) particles.burst(this.at.x, this.at.y, { type: 'sparkle', count: 10, colors: [PALETTE[s.colors[s.item]].c, '#ffffff'] });
      } else sfx('error');
    }
    if (c.pressed('y')) {   // Surprise me: a random item on every spot
      this.spots.forEach((sp, ci) => {
        const m = CATS[ci].items.length;
        sp.item = Math.random() < 0.8 ? 1 + Math.floor(Math.random() * (m - 1)) : 0;
        if (sp.item) sp.colors[sp.item] = Math.floor(Math.random() * PALETTE.length);
      });
      sfx('magic'); this.apply(); this.h.actor.playOnce('celebrate', 0.8, 'idle');
    }
    this.scroll += (s.item - this.scroll) * Math.min(1, dt * 14);
    if (c.pressed('x') || c.pressed('b') || c.pressed('start')) { this.apply(); sfx('ready'); return true; }
    return false;
  }

  /** Panel in rect (x, y, w, h); `color` = the player's colour, tag 'P1'... */
  draw(g, x, y, w, h, color, tag) {
    const cx = x + w / 2;
    this.at = { x: cx, y: y + h + 120 };
    ui.panel(g, x, y, w, h, { r: 28, fill: '#fff7fd', stroke: color, lineWidth: 8 });
    ui.text(g, `${tag}: Dress up!`, cx, y + 40, { size: w > 420 ? 40 : 30, color: '#ff7ac6', weight: 800, strokeWidth: 8 });
    // spot tabs
    const tw = Math.min(84, (w - 40) / CATS.length), ty = y + 108;
    CATS.forEach((cat, ci) => {
      const tx = cx + (ci - (CATS.length - 1) / 2) * tw, on = ci === this.tab, sp = this.spots[ci];
      const k = on ? 1 + this.bump * 0.12 : 1;
      g.save(); g.translate(tx, ty); g.scale(k, k);
      ui.panel(g, -tw / 2 + 4, -tw / 2 + 4, tw - 8, tw - 8, { r: 16, fill: on ? '#ffd23f' : '#ffffff', lineWidth: on ? 5 : 3, shadow: false });
      drawItemIconArt(g, ci, sp.item || cat.tabItem, sp.item ? sp.colors[sp.item] : null, 0, 0, tw * 0.62, this.t);
      if (sp.item) { g.beginPath(); g.arc(tw / 2 - 12, -tw / 2 + 12, 7, 0, Math.PI * 2); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#24163f'; g.stroke(); }
      g.restore();
    });
    ui.text(g, CATS[this.tab].name, cx, ty + tw / 2 + 22, { size: 26, color: '#24163f', stroke: false, weight: 700 });
    // item list (the worn one in the middle)
    const cat = CATS[this.tab], s = this.spots[this.tab], n = cat.items.length;
    const rh = Math.min(62, (h - 300) / ROWS), ly = ty + tw / 2 + 50, lh = rh * ROWS;
    g.save(); ui.roundRect(g, x + 16, ly, w - 32, lh, 18); g.clip();
    for (let k = -3; k <= 3; k++) {
      const ii = Math.round(this.scroll) + k, wrap = ((ii % n) + n) % n;
      const ry = ly + lh / 2 + (ii - this.scroll) * rh - rh / 2;
      if (ry < ly - rh || ry > ly + lh) continue;
      const it = cat.items[wrap], on = wrap === s.item;
      ui.panel(g, x + 22, ry + 3, w - 44, rh - 6, { r: 14, fill: on ? '#ffd23f' : '#ffffff', lineWidth: on ? 4 : 2, shadow: false });
      if (wrap) drawItemIconArt(g, this.tab, wrap, s.colors[wrap], x + 22 + rh * 0.55, ry + rh / 2, rh * 0.78, this.t);
      ui.fitText(g, wrap ? it.name : 'Nothing', x + 22 + rh * 1.15, ry + rh / 2 + 1, { size: rh * 0.42, align: 'left', color: '#24163f', stroke: false, weight: 700, maxWidth: w - 44 - rh * 1.6 });
      if (on && wrap) { g.beginPath(); g.arc(x + w - 46, ry + rh / 2, rh * 0.18, 0, Math.PI * 2); g.fillStyle = PALETTE[s.colors[wrap]].c; g.fill(); g.lineWidth = 3; g.strokeStyle = '#24163f'; g.stroke(); }
    }
    g.restore();
    // hints
    const hs = w > 420 ? 30 : 24;
    ui.hints(g, [['dpad', 'Spot / item'], ['a', 'Colour']], cx, y + h - 74, { size: hs });
    ui.hints(g, [['y', 'Surprise!'], ['x', 'Done']], cx, y + h - 32, { size: hs });
  }
}
