import { drawArt } from '../engine/art.js';
// Character select: "Press A to join" for every controller (and both
// keyboard layouts), pick a character, CPUs fill empty seats.
//   A  join / lock in / (everyone locked) start      B  unlock / leave
//   X  add a CPU    Y  remove a CPU    LB/RB  CPU level
import { W, H } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx, music, voice, host, preloadVoices } from '../engine/audio.js';
import { Actor, getBaseImage, drawSpeech } from '../engine/sprites.js';
import { particles } from '../engine/particles.js';
import * as ui from '../engine/ui.js';
import { CHARACTERS, PLAYER_COLORS } from '../data/characters.js';
import { session, makePlayer, newAIController, MAX_PLAYERS, AI_LEVELS } from '../state.js';
import { shell } from '../engine/shell.js';
import { shuffle, TAU, clamp } from '../engine/util.js';

const COLS = 6;
const CARD_W = 236, CARD_H = 250, GAP = 18;
const GRID_X = (W - (COLS * CARD_W + (COLS - 1) * GAP)) / 2, GRID_Y = 150;

export class CharSelectScene {
  enter() {
    this.t = 0;
    this.starting = null;
    music.play('menu');
    // Slots: humans in join order, then CPUs.
    this.humans = [];  // { ctrl, cursor, charId, locked, actor, stars }
    this.cpus = [];    // { ctrl, charId, actor, stars }
    this.wantTotal = 4;
    this.manualCpu = false;
    // Coming back from the game menu: keep the current party.
    for (const p of session.players) {
      const idx = CHARACTERS.findIndex((c) => c.id === p.charId);
      if (p.isAI) this.cpus.push({ ctrl: p.ctrl, charId: p.charId, actor: this.makeActor(p.charId), stars: p.stars });
      else this.humans.push({ ctrl: p.ctrl, cursor: Math.max(0, idx), charId: p.charId, locked: true, actor: this.makeActor(p.charId), stars: p.stars });
    }
    if (session.players.length) { this.wantTotal = session.players.length; this.manualCpu = true; }
    this.cardBounce = CHARACTERS.map(() => 0);
    this.greeted = false;
  }

  makeActor(charId) {
    const a = new Actor(charId, { scale: 0.8 });
    a.setPose('idle');
    return a;
  }

  get total() { return this.humans.length + this.cpus.length; }
  takenByHuman(charId, except) { return this.humans.some((h) => h !== except && h.locked && h.charId === charId); }

  freeCharFor(cpu) {
    const used = new Set([...this.humans.map((h) => h.charId), ...this.cpus.filter((c) => c !== cpu).map((c) => c.charId)]);
    return shuffle(CHARACTERS.filter((c) => !used.has(c.id)))[0]?.id || CHARACTERS[0].id;
  }

  addCpu() {
    if (this.total >= MAX_PLAYERS) return false;
    const cpu = { ctrl: newAIController(), charId: null, actor: null, stars: 0 };
    cpu.charId = this.freeCharFor(cpu);
    cpu.actor = this.makeActor(cpu.charId);
    cpu.actor.playOnce('wave', 0.8, 'idle');
    this.cpus.push(cpu);
    return true;
  }
  removeCpu() {
    const c = this.cpus.pop();
    if (c) input.releaseAI(c.ctrl);
    return !!c;
  }
  fitCpus() {
    const target = Math.max(this.wantTotal, this.humans.length);
    while (this.total > Math.max(target, this.humans.length) && this.cpus.length) this.removeCpu();
    while (this.total < target && this.total < MAX_PLAYERS) this.addCpu();
  }
  /** Keep CPUs off characters humans are hovering/locking. */
  resolveCpuConflicts() {
    for (const c of this.cpus) {
      if (this.humans.some((h) => h.charId === c.charId)) {
        c.charId = this.freeCharFor(c);
        c.actor = this.makeActor(c.charId);
      }
    }
  }

  join(ctrl) {
    if (this.humans.length >= MAX_PLAYERS) return;
    // Start the cursor on a character nobody has.
    const used = new Set(this.humans.map((h) => h.charId));
    let cursor = CHARACTERS.findIndex((c) => !used.has(c.id));
    if (cursor < 0) cursor = 0;
    const h = { ctrl, cursor, charId: CHARACTERS[cursor].id, locked: false, actor: this.makeActor(CHARACTERS[cursor].id), stars: 0 };
    this.humans.push(h);
    h.actor.playOnce('wave', 1, 'idle');
    sfx('join');
    if (this.total > MAX_PLAYERS) this.removeCpu();
    this.fitCpus();
    this.resolveCpuConflicts();
    if (shell.wantFullscreen) shell.tryFullscreen();
  }

  update(dt, inputOpen) {
    this.t += dt;
    for (const h of this.humans) h.actor.update(dt);
    for (const c of this.cpus) c.actor.update(dt);
    this.cardBounce = this.cardBounce.map((b) => Math.max(0, b - dt * 3));
    if (this.starting !== null) {
      this.starting += dt;
      if (this.starting > 0.9) this.manager.go('gameselect');
      return;
    }
    if (!inputOpen) return;
    if (!this.greeted && this.t > 0.6) { this.greeted = true; host(session.played.length ? 'pick-character' : 'welcome'); }

    // Joining: any unassigned human controller pressing A (or Start).
    const joinedNow = new Set();
    for (const c of input.humans()) {
      if (this.humans.some((h) => h.ctrl === c)) continue;
      if (c.pressed('a') || c.pressed('start')) { this.join(c); joinedNow.add(c); }
      else if (c.pressed('b') && this.humans.length === 0) { sfx('back'); this.manager.go('title'); return; }
    }

    for (const h of [...this.humans]) {
      const c = h.ctrl;
      if (joinedNow.has(c)) continue;
      if (!h.locked) {
        const nav = c.nav;
        if (nav.x || nav.y) {
          let col = h.cursor % COLS, row = Math.floor(h.cursor / COLS);
          col = (col + nav.x + COLS) % COLS;
          row = (row + nav.y + 2) % 2;
          h.cursor = row * COLS + col;
          h.charId = CHARACTERS[h.cursor].id;
          h.actor = this.makeActor(h.charId);
          h.actor.playOnce('wave', 0.7, 'idle');
          this.cardBounce[h.cursor] = 1;
          sfx('move');
          this.resolveCpuConflicts();
        }
        if (c.pressed('a')) {
          if (this.takenByHuman(h.charId, h)) { sfx('error'); h.actor.playOnce('surprised', 0.4, 'idle'); }
          else {
            h.locked = true; sfx('ready');
            h.actor.say(CHARACTERS[h.cursor].lines?.hello || 'Hi!', 1.8, 'hello');
            h.actor.playOnce('ready', 0.7, 'wave');
            this.cardBounce[h.cursor] = 1.5;
            const r = this.cardRect(h.cursor);
            particles.burst(r.x + r.w / 2, r.y + r.h / 2, { type: 'star', count: 12 });
            this.resolveCpuConflicts();
          }
        } else if (c.pressed('b')) {
          this.humans = this.humans.filter((x) => x !== h);
          sfx('back');
          this.fitCpus();
        }
      } else {
        if (c.pressed('b')) { h.locked = false; h.actor.setPose('idle'); sfx('back'); }
        else if (c.pressed('a') || c.pressed('start')) {
          if (this.allReady()) { this.start(); return; }
        }
      }
      // CPU management from any joined human.
      if (c.pressed('x')) { this.manualCpu = true; this.wantTotal = clamp(this.total + 1, 1, MAX_PLAYERS); if (this.addCpu()) sfx('join'); else sfx('error'); }
      if (c.pressed('y')) { this.manualCpu = true; if (this.removeCpu()) { this.wantTotal = this.total; sfx('back'); } else sfx('error'); }
      if (c.pressed('lb') || c.pressed('rb')) {
        session.cpuLevel = (session.cpuLevel + (c.pressed('rb') ? 1 : 2)) % 3;
        sfx('move');
      }
    }
  }

  allReady() { return this.humans.length > 0 && this.humans.every((h) => h.locked); }

  start() {
    this.starting = 0;
    sfx('fanfare');
    const old = new Map(session.players.map((p) => [p.ctrl, p.stars]));
    const players = [];
    this.humans.forEach((h) => players.push(makePlayer(players.length, h.charId, h.ctrl, false)));
    this.cpus.forEach((c) => players.push(makePlayer(players.length, c.charId, c.ctrl, true)));
    // Keep stars only if the same controllers kept the same seats.
    const sameParty = session.players.length === players.length && players.every((p, i) => session.players[i].ctrl === p.ctrl && session.players[i].charId === p.charId);
    for (const p of players) { p.aiLevel = session.cpuLevel; p.stars = sameParty ? old.get(p.ctrl) || 0 : 0; }
    if (!sameParty) session.played = [];
    session.players = players;
    preloadVoices(players.map((p) => p.charId));
    for (const h of this.humans) h.actor.playOnce('celebrate', 1, 'idle');
    for (const c of this.cpus) c.actor.playOnce('cheer', 0.6, 'idle');
  }

  cardRect(i) {
    const col = i % COLS, row = Math.floor(i / COLS);
    return { x: GRID_X + col * (CARD_W + GAP), y: GRID_Y + row * (CARD_H + GAP), w: CARD_W, h: CARD_H };
  }

  draw(g) {
    ui.partyBackdrop(g, this.t, '#a8d8ff', '#bfe3ff');
    drawArt(g, 'bg/menu', 0, 0, W, H, { anchor: 'topleft', fit: 'cover' });
    ui.text(g, 'Choose your character!', W / 2, 78, { size: 74, color: '#ffd23f', weight: 800 });

    // Character cards.
    CHARACTERS.forEach((ch, i) => {
      const r = this.cardRect(i);
      const lockedBy = this.humans.find((h) => h.locked && h.charId === ch.id);
      const hovered = this.humans.filter((h) => !h.locked && h.cursor === i);
      const cpu = this.cpus.find((c) => c.charId === ch.id);
      const b = this.cardBounce[i];
      g.save();
      g.translate(r.x + r.w / 2, r.y + r.h / 2);
      const sc = 1 + Math.sin(b * Math.PI) * 0.06 + (hovered.length ? 0.03 : 0);
      g.scale(sc, sc);
      g.translate(-r.w / 2, -r.h / 2);
      ui.panel(g, 0, 0, r.w, r.h, { r: 24, fill: lockedBy ? '#e6e0ef' : '#ffffff', stroke: lockedBy ? lockedBy.ctrl && this.colorOf(lockedBy) : '#24163f', lineWidth: lockedBy ? 8 : 5 });
      g.save(); ui.roundRect(g, 6, 6, r.w - 12, r.h - 60, 20); g.clip();
      g.fillStyle = ch.color; g.globalAlpha = 0.28; g.fillRect(0, 0, r.w, r.h); g.globalAlpha = 1;
      this.drawCardArt(g, ch, r.w / 2, r.h - 64, r.h - 80, r.w - 24, hovered.length > 0);
      g.restore();
      ui.text(g, ch.name, r.w / 2, r.h - 32, { size: ch.name.length > 12 ? 26 : 30, color: '#24163f', stroke: false, weight: 700, maxWidth: r.w - 16 });
      if (lockedBy) {
        g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, 0, 0, r.w, r.h, 24); g.fill();
        ui.panel(g, r.w - 86, -14, 96, 50, { r: 25, fill: this.colorOf(lockedBy), lineWidth: 4, shadow: false });
        ui.text(g, this.tagOf(lockedBy), r.w - 38, 11, { size: 28, strokeWidth: 5 });
      } else if (cpu) {
        ui.panel(g, r.w - 86, -14, 96, 50, { r: 25, fill: '#b9b0c9', lineWidth: 4, shadow: false });
        ui.text(g, 'CPU', r.w - 38, 11, { size: 26, strokeWidth: 5 });
      }
      g.restore();
      // Hover frames (one per human hovering), offset so they don't overlap.
      hovered.forEach((h, k) => {
        const color = this.colorOf(h);
        g.save();
        g.lineWidth = 8; g.strokeStyle = color;
        const pad = 8 + k * 9;
        ui.roundRect(g, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, 28 + pad / 2); g.stroke();
        const tx = r.x + 10 + k * 64, ty = r.y - pad - 6;
        ui.panel(g, tx, ty - 22, 60, 40, { r: 18, fill: color, lineWidth: 4, shadow: false });
        ui.text(g, this.tagOf(h), tx + 30, ty - 1, { size: 24, strokeWidth: 5 });
        g.restore();
      });
    });

    this.drawSlots(g);

    // Footer hints.
    if (this.allReady() && this.starting === null) {
      const p = 1 + Math.sin(this.t * 6) * 0.05;
      g.save(); g.translate(W / 2, 1036); g.scale(p, p);
      ui.panel(g, -330, -36, 660, 72, { r: 36, fill: '#36d17a' });
      ui.glyph(g, 'a', -250, 0, 50);
      ui.text(g, 'Start the party!', 30, 2, { size: 46, weight: 800 });
      g.restore();
    } else if (this.humans.length) {
      ui.hints(g, [['a', 'Pick'], ['b', 'Back'], ['x', 'Add CPU'], ['y', 'Remove CPU'], ['rb', `CPU: ${AI_LEVELS[session.cpuLevel]}`]], W / 2, 1040, { size: 34 });
    }
    if (this.starting !== null) ui.banner(g, "Let's party!", this.starting, { size: 150, y: 470 });
    if (shell.wantFullscreen && !shell.isFullscreen() && shell.canFullscreen() && this.t > 1) {
      ui.text(g, 'Tip: press any key or click for full screen', W - 24, 1060, { size: 22, align: 'right', color: '#fff', strokeWidth: 5 });
    }
  }

  colorOf(h) { return PLAYER_COLORS[this.humans.indexOf(h)]; }
  tagOf(h) { return 'P' + (this.humans.indexOf(h) + 1); }

  drawCardArt(g, ch, cx, footY, maxH, maxW, hovered) {
    // Static composition of all members, fitted into the card.
    const bob = hovered ? Math.abs(Math.sin(this.t * 5)) * 6 : 0;
    const ms = ch.members;
    let lo = Infinity, hi = -Infinity, top = 0;
    for (const m of ms) {
      const img = getBaseImage(m.asset); if (!img) continue;
      const w = (img.width / img.height) * m.h;
      lo = Math.min(lo, m.dx - w / 2); hi = Math.max(hi, m.dx + w / 2); top = Math.max(top, m.h - m.dy);
    }
    const s = Math.min(maxH / top, maxW / (hi - lo));
    const mid = (lo + hi) / 2;
    const order = ms.slice().sort((a, b) => a.dy - b.dy);
    for (const m of order) {
      const img = getBaseImage(m.asset); if (!img) continue;
      const h = m.h * s, w = (img.width / img.height) * h;
      g.drawImage(img, cx + (m.dx - mid) * s - w / 2, footY + m.dy * s - h - bob, w, h);
    }
  }

  drawSlots(g) {
    const slots = [...this.humans.map((h) => ({ kind: 'human', h })), ...this.cpus.map((c) => ({ kind: 'cpu', c }))];
    const showJoin = slots.length < MAX_PLAYERS;
    if (showJoin) slots.push({ kind: 'join' });
    const n = Math.max(4, slots.length);
    const sw = n <= 4 ? 400 : 212, gap = n <= 4 ? 28 : 14;
    const total = n * sw + (n - 1) * gap;
    const x0 = (W - total) / 2, y0 = 700, sh = 290;
    const bubbles = [];
    for (let i = 0; i < n; i++) {
      const s = slots[i];
      const x = x0 + i * (sw + gap);
      const color = i < this.humans.length ? PLAYER_COLORS[i] : '#b9b0c9';
      if (!s) { ui.panel(g, x, y0, sw, sh, { r: 26, fill: 'rgba(255,255,255,0.35)', stroke: 'rgba(36,22,63,0.25)' }); continue; }
      if (s.kind === 'join') {
        ui.panel(g, x, y0, sw, sh, { r: 26, fill: 'rgba(255,255,255,0.55)', stroke: 'rgba(36,22,63,0.4)' });
        ui.glyph(g, 'a', x + sw / 2, y0 + sh / 2 - 30, n <= 4 ? 80 : 60, { pulse: true });
        ui.text(g, n <= 4 ? 'Press A to join!' : 'Join!', x + sw / 2, y0 + sh / 2 + 50, { size: n <= 4 ? 40 : 30, color: '#fff' });
        continue;
      }
      const isH = s.kind === 'human';
      const pc = isH ? PLAYER_COLORS[this.humans.indexOf(s.h)] : '#8d82a3';
      ui.panel(g, x, y0, sw, sh, { r: 26, fill: '#ffffff', stroke: pc, lineWidth: 8 });
      g.save(); ui.roundRect(g, x + 8, y0 + 8, sw - 16, sh - 70, 20); g.clip();
      g.fillStyle = pc; g.globalAlpha = 0.18; g.fillRect(x, y0, sw, sh); g.globalAlpha = 1;
      const a = isH ? s.h.actor : s.c.actor;
      const ch = CHARACTERS.find((c) => c.id === (isH ? s.h.charId : s.c.charId));
      a.scale = n <= 4 ? 0.95 : 0.62;
      if (ch.members.length > 1) a.scale *= 0.85;
      a.x = x + sw / 2 + (ch.id === 'felicity' ? 20 : 0); a.y = y0 + sh - 80;
      if (a._lastSlotX !== a.x) { a.snap(); a._lastSlotX = a.x; }
      a.draw(g, { emotes: false });
      g.restore();
      // Speech bubbles go on top of every slot (drawn after the loop).
      if (a.speech) bubbles.push([a.speech.text, a.x, a.y - a.height - 18, n <= 4 ? 0.9 : 0.7, a.speech.t, a.speech.dur]);
      const tag = isH ? 'P' + (this.humans.indexOf(s.h) + 1) : 'CPU';
      ui.panel(g, x + 14, y0 - 18, 84, 44, { r: 22, fill: pc, lineWidth: 4, shadow: false });
      ui.text(g, tag, x + 56, y0 + 4, { size: 26, strokeWidth: 5 });
      ui.text(g, ch.name, x + sw / 2, y0 + sh - 38, { size: n <= 4 ? 34 : 24, color: '#24163f', stroke: false, weight: 700, maxWidth: sw - 20 });
      if (isH && s.h.locked) {
        ui.panel(g, x + sw - 120, y0 - 18, 110, 44, { r: 22, fill: '#36d17a', lineWidth: 4, shadow: false });
        ui.text(g, 'Ready!', x + sw - 65, y0 + 4, { size: 24, strokeWidth: 5 });
      } else if (!isH) {
        ui.text(g, AI_LEVELS[session.cpuLevel], x + sw - 50, y0 + 6, { size: 22, color: '#8d82a3', strokeWidth: 5 });
      }
    }
    for (const b of bubbles) drawSpeech(g, ...b);
    if (this.humans.length === 0) {
      ui.text(g, 'Everyone who wants to play: press A!', W / 2, 1040, { size: 40, color: '#fff' });
    }
  }
}
