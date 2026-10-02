// Audio test page (?scene=audio): audition every sound the game can play.
//
//   Arrows / D-pad / stick   move the cursor        A / Space / Enter   play
//   LB / RB (or click a tab) switch category        X                   play the next file variant on its own
//   B                        stop music             Start / Esc         back to the title (if available)
//   Mouse wheel / drag       scroll                 Click / tap a cell  play it
//
// Every key in assets/audio/manifest.json is listed, plus the keys the audio
// brief (audio-requests.md) still expects, so a missing recording shows up as
// "synth" / "no file". Audio needs a user gesture: the first key or click
// unlocks it.
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, voice, music, hasSound, audioCtx, audioRunning, unlockAudio, SFX_NAMES, SONG_NAMES, VOICE_KINDS } from '../engine/audio.js';
import { CHARACTERS } from '../data/characters.js';
import * as ui from '../engine/ui.js';

const KINDS = Object.keys(VOICE_KINDS);

// Keys the audio brief asks for (so gaps are visible even before a file exists).
const BRIEF = {
  sfx: ['cheer', 'aww', 'yay', 'giggle', 'roar', 'snore', 'stomp', 'munch', 'splash', 'shutter', 'bigpop', 'boom', 'crack', 'crumble',
    'pump', 'splat', 'water', 'drumroll', 'whistle', 'bubble', 'brush', 'flip', 'applause', 'crowd-ooh', 'crowd-gasp', 'tick-tock',
    'balloon-stretch', 'fizzle', 'zap', 'cauldron', 'stir', 'squeak', 'towel', 'thunder', 'ring', 'grow-flower', 'fanfare', 'win', 'lose', 'star'],
  npc: ['npc/troll/grumble', 'npc/troll/laugh', 'npc/troll/yawn', 'npc/troll/windup', 'npc/hoot/hoo', 'npc/hoot/ready', 'npc/hoot/bravo',
    'npc/imp/giggle', 'npc/imp/eep', 'npc/imp/poof', 'npc/fairy/chime'],
  jingle: ['jingle/results', 'jingle/star-award', 'jingle/showstopper', 'jingle/trophy', 'jingle/marathon-start', 'jingle/round'],
  host: ['charlie-party', 'welcome', 'pick-character', 'how-to', 'press-a', 'ready', 'count-3', 'count-2', 'count-1', 'go', 'finish', 'time-up',
    'next-round', 'final-round', 'winner-is', 'tie', 'everyone-star', 'showstopper', 'so-close', 'great-job', 'perfect', 'oops', 'random',
    'marathon', 'last-game', 'champion',
    ...CHARACTERS.map((c) => 'name/' + c.id),
    ...['sprinkle-catch', 'bumper-bounce', 'pass-the-present', 'balloon-pump', 'troll-trouble', 'spotlight-dance', 'wizard-quickdraw',
      'cookie-crumble', 'paint-party', 'broomstick-dash', 'fairy-count', 'crown-keeper', 'fashion-show', 'art-studio', 'cake-bakery', 'pet-spa',
      'pop-star-stage', 'fairy-garden', 'potion-class', 'memory-match'].map((g) => 'title/' + g)].map((k) => 'host/' + k),
};

const TABS = [
  { id: 'sfx', label: 'SFX', cols: 3 },
  { id: 'npc', label: 'NPC', cols: 3 },
  { id: 'jingle', label: 'Jingles', cols: 3 },
  { id: 'voice', label: 'Voices', cols: KINDS.length },
  { id: 'host', label: 'Host', cols: 3 },
  { id: 'synth', label: 'Synth', cols: 4 },
  { id: 'music', label: 'Music', cols: 3 },
];

const GRID = { x: 60, y: 250, w: W - 120, h: 730, gap: 10, cellH: 62 };
const VOICE_LABEL_W = 250;

export class AudioTestScene {
  enter() {
    this.t = 0;
    this.tab = 0;
    this.sel = TABS.map(() => 0);
    this.scroll = TABS.map(() => 0);
    this.manifest = { sfx: {}, music: {} };
    this.loaded = false;
    this.flash = new Map();       // item id -> seconds of highlight left
    this.last = '';
    this.variantIdx = new Map();  // key -> next variant index for X
    this.fileBuf = new Map();     // file -> AudioBuffer (own decode, for single-variant playback)
    this.drag = null;
    fetch('assets/audio/manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((m) => {
      if (m) { this.manifest = { sfx: m.sfx || {}, music: m.music || {} }; }
      this.build();
    }).catch(() => this.build());
    this.build();
    this._wheel = (e) => { this.scrollBy(Math.sign(e.deltaY) * 90); };
    window.addEventListener('wheel', this._wheel, { passive: true });
  }

  exit() {
    window.removeEventListener('wheel', this._wheel);
    music.stop();
  }

  filesOf(key) {
    const v = this.manifest.sfx[key];
    return v ? (Array.isArray(v) ? v : [v]) : [];
  }

  build() {
    const mk = (id, label, kind, extra = {}) => ({ id, label, kind, ...extra });
    const sfxKeys = new Set(Object.keys(this.manifest.sfx));
    const groups = { sfx: [], npc: [], jingle: [], host: [] };
    const add = (g, k) => { if (!groups[g].includes(k)) groups[g].push(k); };
    for (const g of Object.keys(groups)) for (const k of BRIEF[g]) add(g, k);
    for (const k of sfxKeys) {
      if (k.startsWith('voice/')) continue;
      const g = k.startsWith('npc/') ? 'npc' : k.startsWith('jingle/') ? 'jingle' : k.startsWith('host/') ? 'host' : 'sfx';
      add(g, k);
    }
    const items = {};
    for (const g of Object.keys(groups)) items[g] = groups[g].map((k) => mk(k, g === 'host' ? k.slice(5) : k, 'sfx', { key: k }));
    // Voices: character x kind grid (character-major).
    items.voice = [];
    for (const c of CHARACTERS) for (const kind of KINDS) items.voice.push(mk(`voice/${c.id}/${kind}`, kind, 'voice', { key: `voice/${c.id}/${kind}`, charId: c.id, vkind: kind, char: c }));
    items.synth = SFX_NAMES.map((n) => mk('synth:' + n, n, 'synth', { key: n }));
    const songs = new Set([...SONG_NAMES, ...Object.keys(this.manifest.music)]);
    items.music = [...songs].map((n) => mk('music:' + n, n, 'music', { key: n }));
    this.items = TABS.map((t) => items[t.id]);
    this.sel = this.sel.map((s, i) => Math.min(s, Math.max(0, this.items[i].length - 1)));
    this.loaded = true;
  }

  status(it) {
    if (it.kind === 'music') {
      const f = this.manifest.music[it.key];
      return f ? { text: 'file', col: '#1b8f4f', bg: '#c8f5d9' } : { text: 'synth', col: '#a4570a', bg: '#ffe2b8' };
    }
    if (it.kind === 'synth') {
      const n = this.filesOf(it.key).length;
      return n ? { text: n > 1 ? `file x${n}` : 'file', col: '#1b8f4f', bg: '#c8f5d9' } : { text: 'synth', col: '#a4570a', bg: '#ffe2b8' };
    }
    const n = this.filesOf(it.key).length;
    if (n) {
      const ok = hasSound(it.key);
      if (!audioCtx()) return { text: n > 1 ? `${n} files` : '1 file', col: '#1b8f4f', bg: '#c8f5d9' };
      if (ok) return { text: n > 1 ? `${n} files` : '1 file', col: '#1b8f4f', bg: '#c8f5d9' };
      return { text: 'not decoded', col: '#b3203f', bg: '#ffd0d8' };
    }
    if (it.kind === 'voice') return { text: 'synth', col: '#a4570a', bg: '#ffe2b8' };
    if (SFX_NAMES.includes(it.key)) return { text: 'synth', col: '#a4570a', bg: '#ffe2b8' };
    return { text: 'no file', col: '#6b6280', bg: '#e6e1ef' };
  }

  // --- geometry -----------------------------------------------------------
  cellRects(ti) {
    const tab = TABS[ti], list = this.items[ti], cols = tab.cols, g = GRID;
    const left = tab.id === 'voice' ? VOICE_LABEL_W : 0;
    const cw = (g.w - left - g.gap * (cols - 1)) / cols;
    return list.map((it, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      return { x: g.x + left + c * (cw + g.gap), y: g.y + r * (g.cellH + g.gap) - this.scroll[ti], w: cw, h: g.cellH, row: r, col: c };
    });
  }
  maxScroll(ti) {
    const rows = Math.ceil(this.items[ti].length / TABS[ti].cols);
    return Math.max(0, rows * (GRID.cellH + GRID.gap) - GRID.h);
  }
  scrollBy(d) { this.scroll[this.tab] = Math.max(0, Math.min(this.maxScroll(this.tab), this.scroll[this.tab] + d)); }
  reveal() {
    const ti = this.tab, r = this.cellRects(ti)[this.sel[ti]];
    if (!r) return;
    const top = GRID.y - 2, bot = GRID.y + GRID.h;
    if (r.y < top) this.scrollBy(r.y - top);
    else if (r.y + r.h > bot) this.scrollBy(r.y + r.h - bot);
  }
  tabRects() {
    const n = TABS.length, gap = 12, w = (W - 120 - gap * (n - 1)) / n;
    return TABS.map((t, i) => ({ x: 60 + i * (w + gap), y: 150, w, h: 64 }));
  }

  // --- actions ------------------------------------------------------------
  setTab(i) {
    this.tab = (i + TABS.length) % TABS.length;
    this.reveal();
  }

  play(it, { variant = false } = {}) {
    unlockAudio();
    if (!audioRunning()) { this.last = 'Audio is locked: press a key or click once, then try again'; return; }
    this.flash.set(it.id, 0.35);
    const files = this.filesOf(it.key);
    if (it.kind === 'music') {
      if (music.name === it.key) { music.stop(); this.last = `Stopped music "${it.key}"`; }
      else { music.play(it.key); this.last = `Music "${it.key}" (${this.manifest.music[it.key] ? 'recorded file' : 'synth'}) - press A again or B to stop`; }
      return;
    }
    if (variant && files.length) { this.playVariant(it, files); return; }
    if (it.kind === 'voice') { voice(it.charId, it.vkind); this.last = `voice(${it.charId}, ${it.vkind}) -> ${files.length ? 'random of ' + files.length + ' file(s)' : 'generic synth stand-in'}`; return; }
    const opts = { force: true };
    if (it.key === 'note') { opts.midi = 60 + Math.floor(Math.random() * 12); }
    if (it.key === 'collect') { opts.step = Math.floor(Math.random() * 6); }
    sfx(it.key, opts);
    this.last = files.length ? `sfx("${it.key}") -> random of ${files.length} file(s)` : (SFX_NAMES.includes(it.key) ? `sfx("${it.key}") -> synth` : `"${it.key}" has no file yet (silent)`);
  }

  async playVariant(it, files) {
    const i = (this.variantIdx.get(it.key) || 0) % files.length;
    this.variantIdx.set(it.key, i + 1);
    const file = files[i];
    const ctx = audioCtx();
    try {
      let b = this.fileBuf.get(file);
      if (!b) {
        const res = await fetch('assets/audio/' + file);
        b = await ctx.decodeAudioData(await res.arrayBuffer());
        this.fileBuf.set(file, b);
      }
      const src = ctx.createBufferSource(); src.buffer = b;
      const g = ctx.createGain(); g.gain.value = 0.6;      // roughly the sfx bus x master level
      src.connect(g); g.connect(ctx.destination); src.start();
      this.last = `Variant ${i + 1}/${files.length}: ${file}  (${b.duration.toFixed(2)} s)`;
    } catch (e) { this.last = `Could not play ${file}: ${e.message}`; }
  }

  // --- loop ---------------------------------------------------------------
  update(dt, open = true) {
    this.t += dt;
    for (const [k, v] of this.flash) { if (v - dt <= 0) this.flash.delete(k); else this.flash.set(k, v - dt); }
    if (!open || !this.loaded) return;
    const ti = this.tab, list = this.items[ti], cols = TABS[ti].cols;
    const humans = input.humans();
    for (const c of humans) {
      if (c.pressed('rb')) { this.setTab(this.tab + 1); }
      if (c.pressed('lb')) { this.setTab(this.tab - 1); }
      let s = this.sel[ti];
      if (c.nav.x) s = Math.max(0, Math.min(list.length - 1, s + c.nav.x));
      if (c.nav.y) {
        const n = s + c.nav.y * cols;
        if (n >= 0 && n < list.length) s = n;
        else if (c.nav.y > 0 && Math.floor(s / cols) < Math.floor((list.length - 1) / cols)) s = list.length - 1;
      }
      if (s !== this.sel[ti]) { this.sel[ti] = s; this.reveal(); }
      if (c.pressed('a')) this.play(list[this.sel[ti]]);
      if (c.pressed('x')) this.play(list[this.sel[ti]], { variant: true });
      if (c.pressed('b')) { music.stop(); this.last = 'Stopped music'; }
      if (c.pressed('start') && this.manager && this.manager.get('title')) this.manager.go('title');
    }
    // Pointer: tabs, cells, drag-scroll.
    const p = input.pointer;
    if (p.pressed) {
      unlockAudio();
      this.drag = { y: p.y, scroll: this.scroll[ti], moved: false, x: p.x };
    }
    if (this.drag && p.down) {
      const dy = p.y - this.drag.y;
      if (Math.abs(dy) > 14) this.drag.moved = true;
      if (this.drag.moved) { this.scroll[ti] = Math.max(0, Math.min(this.maxScroll(ti), this.drag.scroll - dy)); }
    }
    if (p.released && this.drag) {
      if (!this.drag.moved) this.click(this.drag.x, p.y);
      this.drag = null;
    }
  }

  click(x, y) {
    const hit = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    const tabs = this.tabRects();
    for (let i = 0; i < tabs.length; i++) if (hit(tabs[i])) { this.setTab(i); return; }
    if (y < GRID.y || y > GRID.y + GRID.h) return;
    const rects = this.cellRects(this.tab);
    for (let i = 0; i < rects.length; i++) {
      if (hit(rects[i])) { this.sel[this.tab] = i; this.play(this.items[this.tab][i]); return; }
    }
  }

  draw(g) {
    ui.sky(g, '#bfe9ff', '#fff3fb');
    ui.text(g, 'Audio Test', 60, 62, { size: 60, align: 'left', color: '#ffd23f' });
    const run = audioRunning();
    ui.text(g, run ? 'Audio on' : 'Press a key or click to unlock audio', W - 60, 52, { size: 30, align: 'right', color: run ? '#36d17a' : '#ff9f1c', strokeWidth: 6 });
    const playing = music.name;
    ui.text(g, playing ? `Music playing: ${playing}` : 'No music playing', W - 60, 96, { size: 24, align: 'right', color: '#fff', strokeWidth: 5 });
    const fileCount = Object.keys(this.manifest.sfx).length;
    ui.text(g, `${fileCount} manifest keys with files`, 60, 112, { size: 24, align: 'left', color: '#fff', strokeWidth: 5 });

    // Tabs
    const tabs = this.tabRects();
    TABS.forEach((t, i) => {
      const r = tabs[i], on = i === this.tab;
      ui.panel(g, r.x, r.y, r.w, r.h, { r: 22, fill: on ? '#ffd23f' : '#ffffff', lineWidth: on ? 6 : 4, shadow: on });
      ui.text(g, t.label, r.x + r.w / 2, r.y + r.h / 2 + 2, { size: 30, color: on ? ui.NAVY : '#5a4a7a', stroke: false });
    });

    // Grid (clipped)
    const ti = this.tab, list = this.items[ti] || [], tab = TABS[ti];
    g.save();
    g.beginPath(); g.rect(0, GRID.y - 6, W, GRID.h + 12); g.clip();
    const rects = this.cellRects(ti);
    if (tab.id === 'voice') {
      CHARACTERS.forEach((c, r) => {
        const y = GRID.y + r * (GRID.cellH + GRID.gap) - this.scroll[ti];
        ui.text(g, c.name, GRID.x + 4, y + GRID.cellH / 2, { size: 24, align: 'left', color: c.color, strokeWidth: 5, maxWidth: VOICE_LABEL_W - 16 });
      });
    }
    list.forEach((it, i) => {
      const r = rects[i];
      if (r.y + r.h < GRID.y - 10 || r.y > GRID.y + GRID.h + 10) return;
      const sel = i === this.sel[ti];
      const st = this.status(it);
      const fl = this.flash.get(it.id) || 0;
      const isPlayingSong = it.kind === 'music' && music.name === it.key;
      g.save();
      if (sel) { g.translate(r.x + r.w / 2, r.y + r.h / 2); const k = 1.03 + Math.sin(this.t * 6) * 0.01; g.scale(k, k); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2)); }
      ui.roundRect(g, r.x, r.y, r.w, r.h, 18);
      g.fillStyle = fl > 0 || isPlayingSong ? '#b9f3d0' : '#ffffff'; g.fill();
      g.lineWidth = sel ? 6 : 3; g.strokeStyle = sel ? '#ff6fb1' : 'rgba(36,22,63,0.55)'; g.stroke();
      const compact = tab.id === 'voice';
      if (compact) {
        ui.text(g, it.label, r.x + r.w / 2, r.y + 22, { size: 24, color: ui.NAVY, stroke: false, maxWidth: r.w - 12 });
        const w = 76, h = 22;
        ui.roundRect(g, r.x + r.w / 2 - w / 2, r.y + r.h - h - 7, w, h, 11); g.fillStyle = st.bg; g.fill();
        ui.text(g, st.text, r.x + r.w / 2, r.y + r.h - h / 2 - 7, { size: 16, color: st.col, stroke: false, maxWidth: w - 8 });
      } else {
        ui.text(g, it.label, r.x + 18, r.y + r.h / 2 + 1, { size: 28, align: 'left', color: ui.NAVY, stroke: false, maxWidth: r.w - 190 });
        const w = 140, h = 34;
        ui.roundRect(g, r.x + r.w - w - 12, r.y + (r.h - h) / 2, w, h, 17); g.fillStyle = st.bg; g.fill();
        ui.text(g, isPlayingSong ? 'playing' : st.text, r.x + r.w - w / 2 - 12, r.y + r.h / 2 + 1, { size: 21, color: st.col, stroke: false, maxWidth: w - 12 });
      }
      g.restore();
    });
    g.restore();

    // Scroll hint
    const ms = this.maxScroll(ti);
    if (ms > 0) {
      const frac = this.scroll[ti] / ms, bh = 120;
      ui.roundRect(g, W - 36, GRID.y, 10, GRID.h, 5); g.fillStyle = 'rgba(36,22,63,0.18)'; g.fill();
      ui.roundRect(g, W - 36, GRID.y + (GRID.h - bh) * frac, 10, bh, 5); g.fillStyle = '#ff6fb1'; g.fill();
    }

    // Footer: selection details + hints
    g.fillStyle = 'rgba(255,243,251,0.96)'; g.fillRect(0, GRID.y + GRID.h + 8, W, H);
    const it = list[this.sel[ti]];
    if (it) {
      const files = this.filesOf(it.key);
      const detail = it.kind === 'music'
        ? `music/${it.key}: ${this.manifest.music[it.key] ? (typeof this.manifest.music[it.key] === 'string' ? this.manifest.music[it.key] : this.manifest.music[it.key].file) : 'built-in synth song'}`
        : `${it.key}: ${files.length ? files.join(',  ') : (it.kind === 'voice' ? 'no file, generic synth stand-in plays' : SFX_NAMES.includes(it.key) ? 'no file, built-in synth plays' : 'no file yet (silent)')}`;
      ui.text(g, detail, 60, 1000, { size: 24, align: 'left', color: '#fff', strokeWidth: 5, maxWidth: W - 120 });
    }
    ui.text(g, this.last || 'Pick a sound and press A', 60, 1036, { size: 22, align: 'left', color: '#ffe58a', strokeWidth: 5, maxWidth: 1000 });
    ui.hints(g, [['a', 'Play'], ['x', 'Next file'], ['b', 'Stop music'], ['lb', 'Tab'], ['rb', 'Tab'], ['start', 'Title']], W - 40, 1040, { size: 30, align: 'right' });
  }
}
