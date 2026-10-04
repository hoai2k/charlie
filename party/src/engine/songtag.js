// Song tag (Settings > Song tags): a small bottom-right label naming the song
// and take playing, so takes can be judged during play. Clicking it switches
// the song to its next take (when it has alternates). The click is taken in
// the DOM pointerdown (input.onPointerButton, via corner.js), so it never
// reaches the screen underneath (e.g. the title screen's "click to start").
import { W, H } from './canvas.js';
import { input } from './input.js';
import { music, songTagsOn, sfx } from './audio.js';
import * as ui from './ui.js';

const SIZE = 22, BOX_H = 42, MARGIN = 16;

export const songTag = {
  rect: null,     // where it was last drawn (logical px), or null
  _flash: 0,

  label() {
    const tag = songTagsOn() && music.tag;
    if (!tag) return null;
    return '♪ ' + tag + (music.canSwitchTake ? '  ⟳' : '');
  },

  /** Pointer press at (x, y): true if it hit the tag (and switched take). */
  hit(x, y) {
    const r = this.rect;
    if (!r || !music.canSwitchTake || x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return false;
    if (music.nextTake()) { sfx('select'); this._flash = 0.25; }
    return true;
  },

  /** Per frame: hand cursor over the tag when it can switch. */
  update(dt) {
    this._flash = Math.max(0, this._flash - dt);
    const p = input.pointer, r = this.rect;
    if (r && p.seen && music.canSwitchTake && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) p.hot = true;
  },

  draw(g) {
    const str = this.label();
    if (!str) { this.rect = null; return; }
    const w = ui.measure(g, str, SIZE, 700) + 36;
    this.rect = { x: W - MARGIN - w, y: H - MARGIN - BOX_H, w, h: BOX_H };
    g.save(); g.globalAlpha = 0.85;
    ui.panel(g, this.rect.x, this.rect.y, w, BOX_H, { r: BOX_H / 2, fill: this._flash > 0 ? 'rgba(255,111,177,0.95)' : 'rgba(36,22,63,0.82)', stroke: false, shadow: false });
    ui.text(g, str, this.rect.x + w / 2, this.rect.y + BOX_H / 2 + 1, { size: SIZE, color: '#fff', stroke: false, weight: 700 });
    g.restore();
  },
};
