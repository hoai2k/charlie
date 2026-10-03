// Unicorn Memory Match (Play Studio, turn-based). Face-down unicorn cards
// hide pairs of characters. On your turn move the cursor and flip two cards
// with A: a match flies to your pile and you go again; no match flips back and
// the next player takes a turn. Most pairs wins. Solo: find all pairs in as
// few tries as you can (star rating).
import { playerName } from '../state.js';
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { clamp, lerp, damp, ease, rand, pick, shuffle, chance, placementsFromScores, TAU, later } from '../engine/util.js';
import { drawStarShape, drawSparkleShape } from '../engine/emotes.js';
import { charById } from '../data/characters.js';
import { allFaces, drawCardBack, drawCardFace, drawUnicornHead } from './memory-match/cards.js';

const NAVY = '#24163f';
const SIDE_W = 340;
const REMEMBER = [0.5, 0.75, 0.9];   // chance a CPU remembers a revealed card (Easy/Normal/Hard)
const snd = (key, fallback, o) => (hasSound(key) ? sfx(key, o) : fallback && sfx(fallback, o));

export const meta = {
  id: 'memory-match',
  title: 'Unicorn Memory Match',
  category: 'studio',
  type: 'Memory · Take turns',
  goal: 'Flip two cards to find matching pairs. Most pairs wins!',
  controls: [['stick', 'Move your cursor'], ['a', 'Flip a card']],
  tips: ['Find a pair and you go again!', 'Watch every card and remember it!', 'Alone? Find all pairs in few tries.'],
  music: 'menu',
  duration: '2-4 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, '#ffc6ea'); gr.addColorStop(1, '#c4b2ff');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    const cols = ['#ff6b8b', '#ffb04d', '#ffe066', '#7fe08a', '#7fc8ff', '#b48cff'];
    g.save(); g.globalAlpha = 0.5;
    cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = h * 0.05; g.beginPath(); g.arc(x + w / 2, y + h * 1.05, h * (0.95 - i * 0.05), Math.PI, TAU); g.stroke(); });
    g.restore();
    const cw = h * 0.42, ch = h * 0.56;
    const faces = allFaces();
    // left: face-down, right: flipped
    const flip = Math.abs(Math.cos(t * 1.2));
    g.save(); g.translate(x + w * 0.3, y + h * 0.52); g.rotate(-0.12);
    drawCardBack(g, 0, 0, cw, ch); g.restore();
    g.save(); g.translate(x + w * 0.52, y + h * 0.5); g.rotate(0.02); g.scale(1, 1);
    drawCardFace(g, faces.find((f) => f.key === 'unicorn') || faces[0], 0, 0, cw, ch); g.restore();
    g.save(); g.translate(x + w * 0.74, y + h * 0.52); g.rotate(0.12); g.scale(Math.max(0.05, flip), 1);
    if (Math.cos(t * 1.2) > 0) drawCardFace(g, faces.find((f) => f.key === 'unicorn') || faces[0], 0, 0, cw, ch);
    else drawCardBack(g, 0, 0, cw, ch);
    g.restore();
    for (let i = 0; i < 6; i++) {
      g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
      g.translate(x + w * ((i * 0.31 + 0.08) % 1), y + h * ((i * 0.43 + 0.08) % 0.9));
      drawSparkleShape(g, h * 0.09, '#ffffff'); g.restore();
    }
  },
};

const turnName = (p) => (p.isAI ? playerName(p) : p.tag);
/** "Fox's" / "KPop Girls'" / "P1's" */
const possessive = (p) => {
  const ch = charById(p.charId);
  return p.isAI && ch?.plural ? `${turnName(p)}'` : `${turnName(p)}'s`;
};

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.solo = this.n === 1;
    this.t = 0;
    [this.cols, this.rows] = this.n <= 2 ? [4, 4] : this.n <= 4 ? [5, 4] : [6, 4];
    this.pairsTotal = (this.cols * this.rows) / 2;

    // Faces: prefer the players' own characters ("that's me!"), then random.
    const faces = allFaces();
    const mine = [...new Set(this.players.map((p) => faces.find((f) => f.key === p.charId)).filter(Boolean))]; // two players may share a character
    const rest = shuffle(faces.filter((f) => !mine.includes(f)));
    const chosen = shuffle(mine).slice(0, Math.min(mine.length, Math.ceil(this.pairsTotal * 0.6))).concat(rest).slice(0, this.pairsTotal);
    const deck = shuffle(chosen.concat(chosen));

    // Board geometry.
    const bx0 = SIDE_W + 16, bx1 = W - SIDE_W - 16, by0 = 140, by1 = H - 24;
    const gap = this.n <= 4 ? 22 : 16;
    const ch = Math.min((by1 - by0 - gap * (this.rows - 1)) / this.rows, ((bx1 - bx0 - gap * (this.cols - 1)) / this.cols) / 0.76);
    const cw = ch * 0.76;
    this.cw = cw; this.ch = ch;
    const gw = this.cols * cw + (this.cols - 1) * gap, gh = this.rows * ch + (this.rows - 1) * gap;
    this.board = { x: (W - gw) / 2 - 24, y: by0 + (by1 - by0 - gh) / 2 - 20, w: gw + 48, h: gh + 40 };
    this.cards = deck.map((face, i) => {
      const c = i % this.cols, r = Math.floor(i / this.cols);
      return {
        i, c, r, face,
        x: (W - gw) / 2 + c * (cw + gap) + cw / 2,
        y: this.board.y + 20 + r * (ch + gap) + ch / 2,
        state: 'down', flip: 0, flipTarget: 0, lift: 0, wobble: 0, owner: -1,
        fly: null, alpha: 1, glow: 0,
      };
    });

    // Players line the sides of the board.
    const nl = Math.ceil(this.n / 2);
    this.seats = this.players.map((p, i) => {
      const left = this.solo || i < nl;
      const list = left ? this.players.slice(0, this.solo ? 1 : nl) : this.players.slice(nl);
      const j = list.indexOf(p);
      const perSide = Math.max(list.length, this.n <= 2 ? 1 : 2);
      const sh = Math.min(this.solo ? 440 : 400, (H - 150) / perSide);
      const top = 130 + (H - 150 - sh * list.length) / 2;
      const cy = top + sh * (j + 0.5);
      const x0 = left ? 12 : W - SIDE_W + 4;
      const group = (charById(p.charId)?.members.length || 1) > 1;
      const scale = clamp((sh - 64) / 185, 0.6, 1.3) * (group ? 0.82 : 1);
      const ax = left ? x0 + 128 : x0 + SIDE_W - 144;
      const a = new Actor(p, { x: ax, y: cy + sh / 2 - 34, scale, facing: left ? 1 : -1 });
      a.snap();
      return {
        p, i, left, x0, cy, sh, actor: a, scale,
        pile: { x: left ? x0 + 266 : x0 + 58, y: cy + sh / 2 - 74 },
        won: [], mini: clamp(sh / 380, 0.62, 1),
        pairs: 0, pileBump: 0, cursor: { c: Math.floor(this.cols / 2) - (i % 2), r: Math.floor(this.rows / 2) },
      };
    });

    // CPU memories: cardIndex -> face key.
    this.mem = this.players.map(() => new Map());
    this.tries = 0;
    this.turn = 0;
    this.picks = [];
    this.state = 'start';
    this.stateT = 0;
    this.cursor = { x: 0, y: 0, shake: 0 };
    this.bannerT = -1;
    this.again = 0;
    this.ai = { t: 0, target: null, step: 0 };
    this.done = false;
    this.endT = 0;
    this.placeCursor(true);
  }

  get cur() { return this.seats[this.turn]; }

  placeCursor(snap) {
    const s = this.cur, card = this.cardAt(s.cursor.c, s.cursor.r);
    if (snap) { this.cursor.x = card.x; this.cursor.y = card.y; }
  }
  cardAt(c, r) { return this.cards[r * this.cols + c]; }

  // --- turn flow -------------------------------------------------------------
  preUpdate(dt) {
    this.t += dt;
    for (const s of this.seats) s.actor.update(dt);
    this.updateCards(dt);
  }

  startTurn(idx, again = false) {
    this.turn = idx;
    this.picks = [];
    this.state = 'pick'; this.stateT = 0;
    const s = this.cur;
    this.placeCursor(false);
    for (const o of this.seats) if (o !== s && !o.actor._once) o.actor.setPose('idle');
    s.actor.setPose('think');
    s.actor.playOnce('cheer', 0.4, 'think');
    if (again) {
      this.again = 1; sfx('yay');
      const hd = s.actor.anchor('head');
      particles.popText(hd.x, hd.y - 40, 'Go again!', '#7fe08a', 40);
    } else if (this.solo && this.started) { sfx('swap'); }
    else { this.bannerT = 0; sfx('whoosh'); snd('jingle/round', 'select'); }
    this.started = true;
    this.ai = { t: (again ? 0.3 : 0.45) + rand(0.1, 0.3), target: null };
    s.p.ctrl.rumble(0.3, 100);
  }

  nextTurn() { this.startTurn((this.turn + 1) % this.n); }

  update(dt) {
    this.t += dt;
    this.stateT += dt;
    if (this.bannerT >= 0) { this.bannerT += dt; if (this.bannerT > 0.8) this.bannerT = -1; }
    this.again = Math.max(0, this.again - dt);
    this.cursor.shake = Math.max(0, this.cursor.shake - dt * 3);
    this.cool = Math.max(0, (this.cool || 0) - dt);

    if (this.state === 'start') { this.startTurn(0); }
    const s = this.cur, p = s.p, c = p.ctrl;

    if (this.state === 'pick') {
      if (p.isAI) this.aiTurn(dt);
      const canAct = this.bannerT < 0 || this.bannerT > 0.3;
      if (c.nav.x || c.nav.y) {
        const nc = clamp(s.cursor.c + c.nav.x, 0, this.cols - 1), nr = clamp(s.cursor.r + c.nav.y, 0, this.rows - 1);
        if (nc !== s.cursor.c || nr !== s.cursor.r) { s.cursor.c = nc; s.cursor.r = nr; sfx('move'); }
        else { this.cursor.shake = 0.6; }
      }
      if (canAct && c.pressed('a') && this.stateT > 0.12 && this.cool <= 0) this.tryFlip(this.cardAt(s.cursor.c, s.cursor.r));
    } else if (this.state === 'reveal') {
      if (this.stateT > 0.45) this.resolve();
    } else if (this.state === 'match') {
      if (this.stateT > 1.0) {
        if (this.cards.every((cd) => cd.state === 'gone')) this.endGame();
        else this.startTurn(this.turn, true);
      }
    } else if (this.state === 'nomatch') {
      if (this.stateT > 0.9 && !this.flippedBack) {
        this.flippedBack = true;
        for (const cd of this.picks) { cd.flipTarget = 0; cd.state = 'down'; }
        snd('card-flip', 'flip'); later(() => snd('card-flip', 'flip'), 70);
      }
      if (this.stateT > 1.2) this.nextTurn();
    } else if (this.state === 'end') {
      this.endT += dt;
      if (this.endT > (this.solo ? 4.2 : 3)) this.finish();
    }

    const tgt = this.cardAt(s.cursor.c, s.cursor.r);
    this.cursor.x = damp(this.cursor.x, tgt.x, 18, dt);
    this.cursor.y = damp(this.cursor.y, tgt.y, 18, dt);

    for (const st of this.seats) { st.pileBump = Math.max(0, st.pileBump - dt * 3); st.actor.update(dt); }
    this.updateCards(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    for (const s of this.seats) s.actor.update(dt);
    this.updateCards(dt);
  }

  tryFlip(card) {
    this.cool = 0.12;
    if (card.state !== 'down') {
      sfx('error'); this.cursor.shake = 1; card.wobble = 1;
      return;
    }
    card.state = 'up'; card.flipTarget = 1; card.lift = 1;
    this.picks.push(card);
    snd('card-flip', 'flip'); later(() => sfx('sparkle'), 120);
    particles.burst(card.x, card.y, { type: 'sparkle', count: 8, colors: ['#ffffff', '#ffe066', card.face.color] });
    this.cur.actor.playOnce('flip', 0.3, 'think');
    this.remember(card);
    // "That's me!" — the pictured character waves from the sidelines.
    for (const me of this.seats.filter((o) => o.p.charId === card.face.charId && card.face.key === o.p.charId)) {
      later(() => { me.actor.playOnce('wave', 0.9); me.actor.emote('heart', 1); }, 260);
    }
    if (this.picks.length === 2) {
      this.state = 'reveal'; this.stateT = 0;
      if (this.solo) this.tries++;
    }
  }

  remember(card) {
    this.players.forEach((p, i) => {
      if (!p.isAI) return;
      if (chance(REMEMBER[clamp(p.aiLevel ?? 0, 0, 2)])) this.mem[i].set(card.i, card.face.key);
    });
  }

  resolve() {
    const [a, b] = this.picks;
    const s = this.cur;
    if (a.face.key === b.face.key) {
      this.state = 'match'; this.stateT = 0;
      s.pairs++;
      for (const m of this.mem) { m.delete(a.i); m.delete(b.i); }
      sfx('match-chime', { fallback: 'correct' }); later(() => sfx('star'), 150);
      voice(s.p.charId, 'yay');
      s.actor.playOnce('cheer', 0.6, 'think');
      for (const o of this.seats) if (o !== s) o.actor.playOnce('clap', 1.1, 'idle');
      [a, b].forEach((cd, k) => {
        cd.state = 'gone'; cd.owner = s.i; cd.glow = 1;
        particles.burst(cd.x, cd.y, { type: 'star', count: 14, colors: ['#ffe066', '#ffffff', cd.face.color] });
        particles.ring(cd.x, cd.y, '#ffffff', 140, 0.4);
        cd.fly = { t: -0.45 - k * 0.12, dur: 0.65, fx: cd.x, fy: cd.y, tx: s.pile.x, ty: this.stackY(s, s.pairs - 1), rot: rand(-2, 2) };
      });
      particles.popText((a.x + b.x) / 2, Math.min(a.y, b.y) - this.ch * 0.4, 'Match!', '#ffe066', 64);
      fx.shake(5, 0.15);
      s.p.ctrl.rumble(0.5, 160);
    } else {
      this.state = 'nomatch'; this.stateT = 0; this.flippedBack = false;
      a.wobble = 1; b.wobble = 1;
      snd('crowd-ooh', 'aww', { vol: 0.6 });
      s.actor.playOnce('surprised', 0.5, 'idle');
      s.actor.emote('sweat', 1);
    }
  }

  endGame() {
    this.state = 'end'; this.stateT = 0; this.endT = 0;
    sfx('fanfare'); particles.confettiRain(W, 140);
    const best = Math.max(...this.seats.map((s) => s.pairs));
    for (const s of this.seats) {
      if (s.pairs === best) s.actor.setPose('celebrate'); else s.actor.setPose('clap');
    }
    this.bannerT = -1;
  }

  finish() {
    if (this.done) return;
    this.done = true;
    const pairs = this.seats.map((s) => s.pairs);
    if (this.solo) {
      this.api.finish({ placements: [1], stats: [`${this.tries} tries · ${'★'.repeat(this.rating())}`], title: ['Good try!', 'Great memory!', 'Super memory!'][this.rating() - 1] });
    } else {
      this.api.finish({ placements: placementsFromScores(pairs), stats: pairs.map((n) => `${n} pair${n === 1 ? '' : 's'}`), title: 'Great memory!' });
    }
  }

  rating() {
    const P = this.pairsTotal;
    return this.tries <= P * 2 ? 3 : this.tries <= P * 3 ? 2 : 1;
  }

  updateCards(dt) {
    for (const cd of this.cards) {
      const sp = 1 / 0.28;
      cd.flip = cd.flip < cd.flipTarget ? Math.min(cd.flipTarget, cd.flip + sp * dt) : Math.max(cd.flipTarget, cd.flip - sp * dt);
      cd.lift = Math.max(0, cd.lift - dt * 2.5);
      cd.wobble = Math.max(0, cd.wobble - dt * 2);
      cd.glow = Math.max(0, cd.glow - dt * 0.8);
      if (cd.fly) {
        const f = cd.fly;
        f.t += dt;
        if (f.t >= 0 && !f.whoosh) { f.whoosh = true; sfx('card-whoosh', { vol: 0.8 }); }   // off to the pile
        if (f.t >= f.dur) {
          const s = this.seats[cd.owner];
          s.pileBump = 1;
          if (!s.won.includes(cd.face)) s.won.push(cd.face);
          particles.burst(f.tx, f.ty, { type: 'star', count: 10 });
          particles.popText(f.tx, f.ty - 60, '+1', this.players[cd.owner].color, 44);
          sfx('coin');
          cd.fly = null; cd.alpha = 0;
        }
      }
    }
  }

  // --- CPU ---------------------------------------------------------------------
  aiTurn(dt) {
    const s = this.cur, p = s.p, c = p.ctrl, ai = this.ai;
    c.move(0, 0);
    ai.t -= dt;
    if (ai.t > 0) return;
    if (!ai.target) {
      ai.target = this.aiChoose(p.index);
      if (!ai.target) return;
    }
    const tc = ai.target.c, tr = ai.target.r;
    if (s.cursor.c !== tc || s.cursor.r !== tr) {
      // Step like a person: one card at a time, a little hesitation.
      if (s.cursor.c !== tc && (s.cursor.r === tr || Math.random() < 0.6)) c.move(Math.sign(tc - s.cursor.c), 0);
      else c.move(0, Math.sign(tr - s.cursor.r));
      ai.t = rand(0.12, 0.18) / aiProfile(p).speed;
    } else {
      c.press('a');
      ai.target = null;
      ai.t = reactionTime(p) * 0.5 + rand(0.1, 0.3);
    }
  }

  aiChoose(pi) {
    const mem = this.mem[pi];
    const down = this.cards.filter((cd) => cd.state === 'down');
    if (!down.length) return null;
    const known = (cd) => mem.has(cd.i);
    let pickCard = null;
    if (this.picks.length === 0) {
      // A remembered pair?
      const seen = new Map();
      for (const cd of down) {
        if (!known(cd)) continue;
        const k = mem.get(cd.i);
        if (seen.has(k)) { pickCard = seen.get(k); break; }
        seen.set(k, cd);
      }
      if (!pickCard) {
        const unknown = down.filter((cd) => !known(cd));
        pickCard = pick(unknown.length ? unknown : down);
      }
    } else {
      const first = this.picks[0];
      const match = down.find((cd) => cd !== first && known(cd) && mem.get(cd.i) === first.face.key);
      if (match) pickCard = match;
      else {
        const unknown = down.filter((cd) => cd !== first && !known(cd));
        const any = down.filter((cd) => cd !== first);
        pickCard = pick(unknown.length ? unknown : any);
      }
    }
    return pickCard ? { c: pickCard.c, r: pickCard.r } : null;
  }

  // --- drawing -------------------------------------------------------------------
  draw(g) {
    this.drawBackground(g);
    this.drawBoard(g);
    for (const s of this.seats) this.drawSeat(g, s);
    this.drawCursor(g);
    // flying cards on top of everything
    for (const cd of this.cards) if (cd.fly && cd.fly.t > 0) this.drawFlyingCard(g, cd);
    this.drawHud(g);

    if (this.state === 'end' && !this.done) this.drawEnd(g);
  }

  drawBackground(g) {
    const img = art('bg/memory-match');
    if (img) {
      const s = Math.max(W / img.width, H / img.height);
      g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
      return;
    }
    ui.sky(g, '#ffd3ee', '#c8b6ff');
    const cols = ['#ff6b8b', '#ffb04d', '#ffe066', '#7fe08a', '#7fc8ff', '#b48cff'];
    g.save(); g.globalAlpha = 0.35;
    cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 46; g.beginPath(); g.arc(W / 2, H + 260, 1100 - i * 46, Math.PI, TAU); g.stroke(); });
    g.restore();
    ui.cloud(g, 200 + Math.sin(this.t * 0.2) * 30, 120, 1.2, '#ffffff', 0.8);
    ui.cloud(g, W - 260 + Math.sin(this.t * 0.25 + 1) * 30, 150, 1.0, '#ffffff', 0.8);
    ui.cloud(g, W / 2 + 500, 980, 1.4, '#ffffff', 0.5);
    ui.cloud(g, 300, 1000, 1.3, '#ffffff', 0.5);
    g.save();
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.35 + 0.35 * Math.sin(this.t * 2 + i * 1.7);
      g.translate(0, 0);
      g.save(); g.translate((i * 337) % W, (i * 191) % H); drawSparkleShape(g, 16 + (i % 4) * 6, '#ffffff'); g.restore();
    }
    g.restore();
  }

  drawBoard(g) {
    const b = this.board;
    ui.panel(g, b.x, b.y, b.w, b.h, { r: 36, fill: 'rgba(255,255,255,0.55)', stroke: '#ff8fc7', lineWidth: 6 });
    for (const cd of this.cards) {
      if (cd.state === 'gone' && (cd.fly ? cd.fly.t > 0 : true)) {
        // empty slot
        g.save(); g.globalAlpha = 0.5; g.setLineDash([10, 10]); g.lineWidth = 3; g.strokeStyle = '#ffffff';
        ui.roundRect(g, cd.x - this.cw / 2 + 6, cd.y - this.ch / 2 + 6, this.cw - 12, this.ch - 12, 16); g.stroke(); g.restore();
        if (!cd.fly) continue;
      }
      if (cd.fly && cd.fly.t > 0) continue;
      this.drawCard(g, cd, cd.x, cd.y, 1, 0);
    }
  }

  drawCard(g, cd, x, y, sc, rot) {
    const fl = cd.flip;
    const sx = Math.abs(Math.cos(fl * Math.PI));
    const lift = Math.sin(fl * Math.PI) * 0.1 + cd.lift * 0.04;
    const wob = cd.wobble > 0 ? Math.sin(cd.wobble * 30) * 0.06 * cd.wobble : 0;
    const hover = this.state === 'pick' && this.cardAt(this.cur.cursor.c, this.cur.cursor.r) === cd && cd.state === 'down';
    g.save();
    g.translate(x, y - (hover ? 8 + Math.sin(this.t * 6) * 3 : 0) - lift * 60);
    g.rotate(rot + wob);
    g.scale(sc * (1 + lift) * Math.max(0.02, sx), sc * (1 + lift));
    // shadow
    g.fillStyle = 'rgba(36,22,63,0.22)';
    ui.roundRect(g, -this.cw / 2 + 5, -this.ch / 2 + 9 + lift * 40, this.cw, this.ch, this.cw * 0.12); g.fill();
    if (cd.glow > 0) {
      g.save(); g.globalAlpha = cd.glow; g.fillStyle = '#fff6a8';
      ui.roundRect(g, -this.cw / 2 - 10, -this.ch / 2 - 10, this.cw + 20, this.ch + 20, this.cw * 0.16); g.fill(); g.restore();
    }
    if (fl >= 0.5) drawCardFace(g, cd.face, 0, 0, this.cw, this.ch);
    else drawCardBack(g, 0, 0, this.cw, this.ch);
    g.restore();
  }

  drawFlyingCard(g, cd) {
    const f = cd.fly;
    const u = ease.inOutQuad(clamp(f.t / f.dur, 0, 1));
    const x = lerp(f.fx, f.tx, u), y = lerp(f.fy, f.ty, u) - Math.sin(u * Math.PI) * 220;
    const sc = lerp(1, 0.4, u);
    g.save(); g.globalAlpha = 1;
    this.drawCard(g, { ...cd, lift: 0, wobble: 0, glow: 0 }, x, y, sc, f.rot * u);
    g.restore();
    if (Math.random() < 0.5) particles.trail(x, y, { type: 'sparkle', colors: ['#ffffff', '#ffe066'] });
  }

  drawCursor(g) {
    if (this.state === 'end' || this.state === 'start') return;
    const s = this.cur, p = s.p;
    if (this.state !== 'pick') return;
    const shake = this.cursor.shake > 0 ? Math.sin(this.t * 60) * 8 * this.cursor.shake : 0;
    const x = this.cursor.x + shake, y = this.cursor.y;
    const bob = Math.sin(this.t * 6) * 4;
    const pad = 10 + Math.sin(this.t * 6) * 2;
    g.save();
    g.lineWidth = 9; g.strokeStyle = NAVY;
    ui.roundRect(g, x - this.cw / 2 - pad, y - this.ch / 2 - pad - 8, this.cw + pad * 2, this.ch + pad * 2, this.cw * 0.16); g.stroke();
    g.lineWidth = 6; g.strokeStyle = p.color; g.stroke();
    g.restore();
    // pointer with the player's tag
    const px = x + this.cw * 0.28, py = y + this.ch * 0.32 + bob;
    g.save(); g.translate(px, py); g.rotate(-0.5);
    g.fillStyle = p.color; g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(0, -30); g.lineTo(22, 16); g.lineTo(5, 10); g.lineTo(-2, 30); g.lineTo(-12, 26); g.lineTo(-5, 7); g.lineTo(-20, 12); g.closePath(); g.fill(); g.stroke();
    g.restore();
    ui.playerTag(g, p, x, y - this.ch / 2 - pad - 18, { label: p.isAI ? 'CPU' : p.tag });
  }

  drawSeat(g, s) {
    const p = s.p, a = s.actor;
    const isTurn = this.cur === s && this.state !== 'end';
    const x0 = s.x0, y0 = s.cy - s.sh / 2 + 6, w = SIDE_W - 16, h = s.sh - 12;
    if (isTurn) {
      const gl = g.createRadialGradient(a.x, a.y - a.height * 0.5, 10, a.x, a.y - a.height * 0.5, s.sh * 0.7);
      gl.addColorStop(0, hexA(p.color, 0.55)); gl.addColorStop(1, hexA(p.color, 0));
      g.fillStyle = gl; g.fillRect(x0 - 10, y0 - 20, w + 20, h + 40);
    }
    ui.panel(g, x0, y0, w, h, { r: 30, fill: isTurn ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)', stroke: p.color, lineWidth: isTurn ? 8 : 4, shadow: isTurn });
    // collected pairs: a little stack of mini face cards
    const pl = s.pile;
    const n = s.won.length;
    const mw = 64 * s.mini, mh = 84 * s.mini;
    if (!n) { g.save(); g.globalAlpha = 0.4; g.setLineDash([8, 8]); g.strokeStyle = NAVY; g.lineWidth = 3; ui.roundRect(g, pl.x - mw / 2, this.stackY(s, 0) - mh / 2, mw, mh, 10); g.stroke(); g.restore(); }
    s.won.forEach((face, k) => {
      const top = k === n - 1;
      g.save(); g.translate(pl.x + (k % 2 ? 4 : -4), this.stackY(s, k) - (top ? s.pileBump * 12 : 0)); g.rotate((k % 2 ? 1 : -1) * 0.07);
      drawCardFace(g, face, 0, 0, mw, mh); g.restore();
    });
    const bump = 1 + s.pileBump * 0.4;
    g.save(); g.translate(pl.x, Math.min(this.stackY(s, Math.max(0, n - 1)) - mh / 2 - 22, s.cy + s.sh / 2 - 26 - mh)); g.scale(bump, bump);
    ui.text(g, String(s.pairs), 0, 0, { size: 44, color: '#ffe066', strokeWidth: 9, weight: 800 });
    g.restore();
    // name pill
    const tagY = y0 + 28;
    const label = `${p.isAI ? 'CPU' : p.tag} · ${playerName(p)}`;
    ui.fitText(g, label, x0 + w / 2, tagY, { size: s.sh < 260 ? 24 : 28, color: p.color, strokeWidth: 6, maxWidth: w - 30, minScale: 0.72, wrapShift: 8 });
    a.draw(g, { ring: p.color });
    if (isTurn && this.state === 'pick') {
      const ax = a.x, ay = a.y - a.height - 30 + Math.sin(this.t * 6) * 6;
      g.save(); g.translate(ax, ay); g.fillStyle = p.color; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-16, -20); g.lineTo(16, -20); g.lineTo(0, 2); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
  }

  /** Y of the k-th collected card in a seat's stack (bottom up). */
  stackY(s, k) {
    const mh = 84 * s.mini;
    const bottom = s.cy + s.sh / 2 - 18 - mh / 2;
    const room = s.sh - 12 - 90 - mh;
    const step = Math.min(mh * 0.42, room / Math.max(1, this.pairsTotal / 2));
    return bottom - k * step;
  }

  drawHud(g) {
    if (this.state === 'end') return;
    const s = this.cur, p = s.p;
    const cx = W / 2, cy = 62;
    const left = this.cards.filter((c) => c.state !== 'gone').length / 2;
    if (this.solo) {
      ui.panel(g, cx - 330, cy - 42, 660, 84, { r: 42, fill: '#ffffff', stroke: '#ff8fc7', lineWidth: 6 });
      ui.text(g, 'Find all pairs!', cx - 120, cy + 2, { size: 44, color: '#ff6fb1', strokeWidth: 8 });
      ui.text(g, `Tries: ${this.tries}`, cx + 200, cy + 2, { size: 40, color: NAVY, stroke: false, weight: 800 });
      this.drawSoloPanel(g, left);
      return;
    }
    const label = `${possessive(p)} turn!`;
    const tw = ui.measure(g, label, 42, 800);
    const pw = tw + 110;
    // Turn change: the pill slides in from the player's side panel and pops.
    let px = cx, py = cy, sc = 1;
    if (this.bannerT >= 0) {
      const u = clamp(this.bannerT / 0.35, 0, 1);
      const sx = s.left ? SIDE_W / 2 : W - SIDE_W / 2, sy = s.cy - s.sh / 2 + 30;
      px = lerp(sx, cx, ease.outCubic(u)); py = lerp(sy, cy, ease.outCubic(u));
      sc = u < 1 ? 0.7 + u * 0.7 : 1.4 - ease.outBack(clamp((this.bannerT - 0.35) / 0.3, 0, 1)) * 0.4;
    } else if (this.again > 0) sc = 1 + Math.sin(this.again * Math.PI) * 0.12;
    g.save(); g.translate(px, py); g.scale(sc, sc);
    ui.panel(g, -pw / 2, -42, pw, 84, { r: 42, fill: '#ffffff', stroke: p.color, lineWidth: 7 });
    drawPortrait(g, p, -pw / 2 + 44, 0, 32, { ring: p.color, ringWidth: 4 });
    ui.text(g, label, 30, 2, { size: 42, color: p.color, strokeWidth: 8, weight: 800 });
    g.restore();
    ui.text(g, `${left} pair${left === 1 ? '' : 's'} left`, W - SIDE_W / 2, 60, { size: 32, color: '#fff', strokeWidth: 7 });
  }

  drawSoloPanel(g, left) {
    const x = W - SIDE_W + 4, w = SIDE_W - 16, y = 300, h = 470;
    ui.panel(g, x, y, w, h, { r: 30, fill: 'rgba(255,255,255,0.8)', stroke: '#ff8fc7', lineWidth: 6 });
    ui.text(g, 'Pairs found', x + w / 2, y + 44, { size: 32, color: '#ff6fb1', strokeWidth: 6 });
    ui.text(g, `${this.pairsTotal - left} / ${this.pairsTotal}`, x + w / 2, y + 104, { size: 64, color: NAVY, stroke: false, weight: 800 });
    ui.bar(g, x + 30, y + 150, w - 60, 26, (this.pairsTotal - left) / this.pairsTotal, '#ff8fc7');
    ui.text(g, 'Star goals', x + w / 2, y + 226, { size: 30, color: '#9b5cff', strokeWidth: 6 });
    const P = this.pairsTotal;
    [[3, P * 2], [2, P * 3], [1, Infinity]].forEach(([n, lim], i) => {
      const ry = y + 282 + i * 58;
      const ok = this.tries <= lim;
      g.save(); if (!ok) g.globalAlpha = 0.35;
      for (let k = 0; k < 3; k++) { g.save(); g.translate(x + 40 + k * 38, ry); drawStarShape(g, 36, k < n ? '#ffd23f' : '#e3dcef'); g.restore(); }
      ui.text(g, lim === Infinity ? 'any tries' : `${lim} tries`, x + w - 24, ry, { size: 28, color: NAVY, stroke: false, align: 'right', weight: 800 });
      g.restore();
    });
  }

  drawEnd(g) {
    const t = this.endT;
    g.save(); g.fillStyle = `rgba(36,22,63,${Math.min(0.35, t)})`; g.fillRect(0, 0, W, H); g.restore();
    if (this.solo) {
      const r = this.rating();
      ui.banner(g, 'All pairs found!', t, { size: 110, y: H / 2 - 150, color: '#ffe066' });
      if (t > 0.5) {
        ui.panel(g, W / 2 - 340, H / 2 - 40, 680, 260, { r: 40, fill: '#fffaf2', stroke: '#ff8fc7', lineWidth: 8 });
        ui.text(g, `${this.tries} tries`, W / 2, H / 2 + 20, { size: 54, color: NAVY, stroke: false, weight: 800 });
        for (let i = 0; i < 3; i++) {
          const pt = clamp((t - 0.8 - i * 0.35) / 0.3, 0, 1);
          if (pt <= 0) continue;
          if (!this['starSfx' + i] && i < r) { this['starSfx' + i] = true; sfx('collect', { step: i * 4 }); }
          g.save(); g.translate(W / 2 + (i - 1) * 130, H / 2 + 130); g.scale(ease.outBack(pt), ease.outBack(pt));
          g.rotate(Math.sin(this.t * 2 + i) * 0.1);
          drawStarShape(g, 110, i < r ? '#ffd23f' : '#d8d0e8');
          g.restore();
        }
      }
    } else {
      ui.banner(g, 'All pairs found!', t, { size: 120, y: 170, color: '#ffe066' });
    }
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
