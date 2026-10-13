// Molly Party seats on the how-to screen: Molly games are played as the
// fairies (Glimmer and the five garden fairies), picked fresh on every game's
// intro. Each seat: ◀ ▶ (stick / D-pad) changes fairy, A joins or readies up,
// B un-readies, then leaves (the last player's B goes back to the shelf).
// Any controller that isn't seated joins with A. CPUs from the party come
// along as fairies too. The game is played by temporary fairy players whose
// stars go to their seat in the party (the controller's party player). The
// next Molly intro starts with the same seats (until the party changes).
import { W } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { sfx } from '../engine/audio.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { rand } from '../engine/util.js';
import { charById } from '../data/characters.js';
import { session, makePlayer, newAIController, MAX_PLAYERS } from '../state.js';

export const FAIRIES = ['glimmer', 'garden-fairy-pink', 'garden-fairy-blue', 'garden-fairy-yellow', 'garden-fairy-green', 'garden-fairy-purple'];
const lastFairy = new Map();   // controller -> fairy picked last time (the default next time)
let memo = null;               // { roster, seats } of the last Molly intro: the next one starts with the same players
const fairyName = (id) => (charById(id)?.name || id).replace(/ Fairy$/, '');

export class MollySeats {
  constructor(meta) {
    this.meta = meta;
    this.t = 0;
    this.note = null;
    this.seats = [];
    const live = new Set(input.humans());
    if (memo && memo.roster === session.players) {
      for (const o of memo.seats) if (o.isAI || live.has(o.ctrl)) this.seat(o.ctrl, o.isAI, o.home, o.fairy);
    } else for (const p of session.players) this.seat(p.ctrl, p.isAI, p);
    this.fill();
    memo = { roster: session.players, seats: this.seats };
  }

  get humans() { return this.seats.filter((s) => !s.isAI); }

  /** Seat a controller: humans before CPUs, on a fairy nobody has if possible. */
  seat(ctrl, isAI, home = null, want = null) {
    const s = { ctrl, isAI, home, ready: false, readyAt: isAI ? rand(0.8, 2.2) : Infinity, bump: 0 };
    s.fairy = this.freeFairy(want || (isAI ? null : lastFairy.get(ctrl)));
    if (isAI) this.seats.push(s);
    else this.seats.splice(this.humans.length, 0, s);
    this.layout();
    return s;
  }

  freeFairy(want) {
    const used = new Set(this.seats.map((s) => s.fairy));
    if (want && !used.has(want)) return want;
    return FAIRIES.find((f) => !used.has(f)) || want || FAIRIES[this.seats.length % FAIRIES.length];
  }

  /** Enough players for the game: CPUs fill up to its minimum. */
  fill() {
    while (this.seats.length < (this.meta.minPlayers || 1)) this.seat(newAIController(), true).ready = true;
  }

  layout() {
    const n = this.seats.length, spacing = Math.min(220, (W - 160) / Math.max(1, n));
    this.seats.forEach((s, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * spacing;
      if (!s.actor || s.actor.charId !== s.fairy) {
        const h = charById(s.fairy)?.members?.[0]?.h || 100;
        s.actor = new Actor(s.fairy, { scale: Math.min(2.6, (n > 4 ? 100 : 118) / h), x, y: 1028 });
        s.actor.snap();
      }
      s.actor.x = x;
    });
  }

  step(s, dir) {
    let k = FAIRIES.indexOf(s.fairy);
    const taken = new Set(this.seats.filter((o) => o !== s).map((o) => o.fairy));
    for (let n = 0; n < FAIRIES.length; n++) {   // skip fairies other seats have (unless all are taken)
      k = (k + dir + FAIRIES.length) % FAIRIES.length;
      if (!taken.has(FAIRIES[k]) || taken.size >= FAIRIES.length) break;
    }
    s.fairy = FAIRIES[k];
    if (!s.isAI) lastFairy.set(s.ctrl, s.fairy);
    s.bump = 1;
    this.layout();
    s.actor.squash(-0.35);
    particles.burst(s.actor.x, s.actor.y - s.actor.height / 2, { type: 'sparkle', count: 8 });
    sfx('move');
  }

  setReady(s, on) {
    s.ready = on;
    if (on) {
      s.actor.playOnce('celebrate', 0.6, 'idle'); s.actor.squash(-0.3); sfx('ready');
      particles.burst(s.actor.x, s.actor.y - s.actor.height / 2, { type: 'sparkle', count: 10 });
    } else { s.actor.setPose('idle'); sfx('back'); }
  }

  leave(s) {
    this.seats.splice(this.seats.indexOf(s), 1);
    sfx('back');
    // A CPU keeps the game playable if it needs more players.
    this.fill();
    this.layout();
  }

  /** Returns 'back' (to the shelf), 'go' (everyone ready) or null. */
  update(dt, inputOpen) {
    this.t += dt;
    for (const s of this.seats) { s.actor.update(dt); s.bump = Math.max(0, s.bump - dt * 4); }
    if (this.note) { this.note.t += dt; if (this.note.t > 2.4) this.note = null; }
    for (const s of this.seats) if (s.isAI && !s.ready && this.t > s.readyAt) this.setReady(s, true);
    if (!inputOpen) return null;
    // New players: any controller that isn't seated joins with A.
    for (const c of input.humans()) {
      if (this.seats.some((s) => s.ctrl === c) || !c.pressed('a')) continue;
      if (this.seats.length >= MAX_PLAYERS) {
        const cpu = [...this.seats].reverse().find((s) => s.isAI);
        if (!cpu) { sfx('error'); continue; }
        this.seats.splice(this.seats.indexOf(cpu), 1);
      }
      const home = session.players.find((p) => p.ctrl === c) || { stars: 0 };   // newcomers keep a star tally for the Molly games
      const s = this.seat(c, false, home);
      s.actor.squash(-0.4); sfx('join');
      return null;   // this A was the join, not a ready
    }
    for (const s of this.humans) {
      const c = s.ctrl;
      if (!s.ready && c.nav.x) this.step(s, Math.sign(c.nav.x));
      if (c.pressed('a') && !s.ready) this.setReady(s, true);
      else if (c.pressed('b')) {
        if (s.ready) this.setReady(s, false);
        else if (this.humans.length > 1) this.leave(s);
        else { sfx('back'); return 'back'; }
      }
    }
    // Mouse / touch: the arrows change fairy, a fairy toggles ready.
    for (const r of this.rects || []) {
      if (!input.clicked(r)) continue;
      if (r.dir) this.step(r.seat, r.dir); else this.setReady(r.seat, !r.seat.ready);
      return null;
    }
    if (this.humans.length && this.seats.every((s) => s.ready)) return 'go';
    return null;
  }

  /** Fairy players for the game. Their stars are their seat's stars in the party. */
  players() {
    const list = this.seats.map((s, i) => {
      const p = makePlayer(i, s.fairy, s.ctrl, s.isAI);
      if (s.home) Object.defineProperty(p, 'stars', { get: () => s.home.stars, set: (v) => { s.home.stars = v; }, enumerable: true });
      return p;
    });
    for (const p of list) p.glow = list.some((o) => o !== p && o.charId === p.charId) ? p.color : null;
    return list;
  }

  draw(g, going) {
    this.rects = [];
    const players = this.players();
    this.seats.forEach((s, i) => {
      const a = s.actor, p = players[i];
      a.draw(g, { ring: p.color });
      const ty = a.y - a.height - 22;
      ui.text(g, fairyName(s.fairy), a.x, a.y + 26, { size: 24, color: '#fff', strokeWidth: 5 });
      if (s.ready || going) {
        ui.panel(g, a.x - 70, ty - 40, 140, 52, { r: 26, fill: '#36d17a', lineWidth: 4, shadow: false });
        ui.text(g, 'Ready!', a.x, ty - 13, { size: 30, strokeWidth: 5 });
      } else if (s.isAI) {
        ui.text(g, '...', a.x, ty - 13, { size: 40, color: p.color });
      } else {
        ui.glyph(g, 'a', a.x - 40, ty - 14, 42, { pulse: true });
        ui.text(g, p.tag, a.x + 20, ty - 12, { size: 30, color: p.color, strokeWidth: 5 });
        // ◀ ▶ fairy arrows
        const k = 1 + s.bump * 0.25, ay = a.y - a.height * 0.5;
        for (const dir of [-1, 1]) {
          const ax = a.x + dir * 86;
          g.save(); g.translate(ax, ay); g.scale(k, k);
          ui.text(g, dir < 0 ? '◀' : '▶', 0, 0, { size: 40, color: p.color, strokeWidth: 6 });
          g.restore();
          this.rects.push({ x: ax - 34, y: ay - 40, w: 68, h: 80, seat: s, dir });
        }
      }
      this.rects.push({ x: a.x - 60, y: a.y - a.height - 20, w: 120, h: a.height + 20, seat: s, dir: 0 });
    });
    if (going) return;
    if (this.note) ui.text(g, this.note.text, W / 2, 828, { size: 32, color: '#ffd23f' });
    else if (this.t > 0.6) {
      const hints = [['dpad', 'Pick a fairy'], ['a', 'Ready / join'], ['b', 'Leave']];
      if (session.partyMode) hints.push(['y', 'Skip this game']);
      ui.hints(g, hints, W / 2, 822, { size: 26 });
    }
  }
}
