// Rhythm-game charts (no imports, so the games, the Rhythm Editor
// (workbench/rhythm.html) and the node tests all share this one copy).
//
// A song entry (assets/audio/music/rhythm/index.json, format v2, audio-requests.md
// §12.8.3) has onsets measured from its audio. buildChart() picks a level's notes
// from them; the difficulty decides which layer it follows:
//   Easy    the strong on-beat hits (kick / main beat), at most 2 per bar
//   Normal  plus the off-beat percussion (clave, claps, skank, palmas)
//   Hard    the melody's rhythm too (syncopations, triplets, quick pairs)
// A song may also carry hand-made charts (`charts: { easy, normal, hard }`, each a
// list of [beat, btn]): made in the Rhythm Editor and merged in with
// tools/apply-rhythm-edits.mjs. A level with one plays exactly those notes.

export const DIV = 12;   // onset positions in 1/12 beat: 16ths = 3, triplet 8ths = 4
export const LEVELS = ['Easy', 'Normal', 'Hard'];
export const LEVEL_IDS = ['easy', 'normal', 'hard'];
export const BTNS = ['a', 'b', 'x', 'y'];

/**
 * Game timeline for a song, in beats: { end, phases: { ab, all, boss } }.
 * A song played once lasts as long as the song; a looping one ~65 s. The
 * phases (A only -> A+B -> all four -> golden finale vs the big imp) start
 * with the song's groove sections where it has them.
 */
export function songPlan(song, level = 0) {
  const bpb = song.beatsPerBar || 4, bar = (x) => Math.round(x / bpb) * bpb;
  const end = song.loop ? Math.round((65 * song.bpm) / 60 / 4) * 4 + 2 : Math.ceil(song.lengthBeats / bpb) * bpb + 2;
  const grooves = (song.sections || []).filter((s) => s.kind !== 'breath' && s.end - s.start >= 8);
  let ab, all, boss;
  if (!song.loop && grooves.length >= 3) {
    ab = grooves[1].start; all = grooves[Math.min(2, grooves.length - 1)].start; boss = grooves[grooves.length - 1].start;
    if (all >= boss) all = bar(ab + (boss - ab) / 2);
  } else {
    const r = end / 130;
    ab = bar(36 * r); all = bar(68 * r); boss = bar(96 * r);
  }
  // Easy teaches A, then B, then X/Y; Normal starts with A+B (X/Y from the
  // 2nd groove); Hard uses all four buttons from the start.
  if (level >= 1) { all = ab; ab = 0; }
  if (level >= 2) all = 0;
  return { end, phases: { ab, all, boss } };
}

/**
 * The plan Pop Star Stage builds a level's chart with when Settings >
 * Difficulty is that level: Easy keeps A alone until B joins; Normal and
 * Hard have every button from the start (the game folds them, gameFold()).
 */
export function levelPlan(song, level) {
  const base = songPlan(song, 0);
  return { end: base.end, phases: { ab: level === 0 ? base.phases.ab : 0, all: 0, boss: base.phases.boss } };
}

// --- the game's button folds (Pop Star Stage, per Settings > Difficulty) ----------
/** Easy: X rides A, Y rides B. */
export const foldXY = (list) => list.map((n) => ({ ...n, btn: n.btn === 'x' ? 'a' : n.btn === 'y' ? 'b' : n.btn }));
/** Normal's buttons: A/B, then X from `xAt`; Y always rides X (or B before X). */
export const foldNormal = (list, xAt) => list.map((n) => ({ ...n, btn: n.btn === 'y' ? (n.beat >= xAt ? 'x' : 'b') : n.btn === 'x' && n.beat < xAt ? 'a' : n.btn }));
/** Normal: X joins around the last quarter, clear of the finale's own banner. */
export function normalXAt(end, boss) {
  let at = Math.round((end * 0.75) / 4) * 4;
  if (Math.abs(at - boss) < 8) at = boss + 8;
  return Math.min(at, end - 16);
}
/** The notes as a lane at that difficulty's top level plays them (buttons folded). */
export function gameFold(song, level, notes) {
  if (level <= 0) return foldXY(notes);
  if (level === 1) { const b = songPlan(song, 0); return foldNormal(notes, normalXAt(b.end, b.phases.boss)); }
  return notes.map((n) => ({ ...n }));
}

// --- chart building ------------------------------------------------------------
// Buttons by role, so a repeating pattern always gets the same buttons:
// A = low / main beat, B = high percussion (claps, snare, clave), and the
// melody rides X (lower than the last melody note) / Y (higher). Early phases
// fold the buttons not taught yet onto the ones that are.
// Density is set in time, not beats, so a fast song isn't harder than a slow
// one at the same level (Easy 40-60 notes a minute, Normal 70-110, Hard 110-160):
//   rate    most notes per second, as a cap per bar (at least `perBar`... `maxBar`)
//   gap     least beats between two notes; minGapS the least seconds (Easy: two
//           beats apart above 100 BPM; Hard: no 16th-note pairs above 100 BPM,
//           triplet pairs are fine)
//   thresh  least score to be used     maxBeat  most notes inside any one beat
export const LEVEL = [
  { name: 'easy', step: 12, gap: 1, rate: 0.9, minBar: 2, maxBar: 2, thresh: 0.3, maxBeat: 1, minGapS: 0.6 },        // strong beats only
  { name: 'normal', step: 6, gap: 0.5, rate: 1.6, minBar: 3, maxBar: 5, thresh: 0.25, maxBeat: 2, minGapS: 0 },    // + off-beat 8ths
  { name: 'hard', step: 3, gap: 0.25, rate: 2.6, minBar: 4, maxBar: 7, thresh: 0.22, maxBeat: 3, minGapS: 0.16 },  // + 16ths / triplets (melody)
];
/** The most notes a level puts in one bar of this song. */
export function barCap(L, song) {
  const bpb = song.beatsPerBar || 4;
  return Math.max(L.minBar, Math.min(L.maxBar, Math.round((L.rate * bpb * 60) / song.bpm)));
}

export function sectionAt(song, beat) {
  for (const s of song.sections || []) if (beat >= s.start && beat < s.end) return s;
  return null;
}

/** A level's hand-made chart from the song entry, as notes, or null. */
export function explicitChart(song, level, plan) {
  const name = LEVEL[Math.max(0, Math.min(2, level | 0))].name;
  const list = song.charts && song.charts[name];
  if (!Array.isArray(list)) return null;
  const boss = plan ? plan.phases.boss : Infinity, last = plan ? plan.end - 1 : Infinity;
  return list
    .map((n) => (Array.isArray(n) ? { beat: +n[0], btn: n[1] } : { beat: +n.beat, btn: n.btn }))
    .filter((n) => Number.isFinite(n.beat) && n.beat >= 0 && n.beat <= last && BTNS.includes(n.btn))
    .sort((a, b) => a.beat - b.beat)
    .map((n) => ({ beat: n.beat, btn: n.btn, gold: n.beat >= boss }));
}

/**
 * Notes [{ beat, btn, gold }] for `song` at difficulty `level`, using the
 * timeline from songPlan(). Notes start at beat 4. A hand-made chart for the
 * level (song.charts) is used as it is.
 */
export function buildChart(song, level, plan) {
  const own = explicitChart(song, level, plan);
  if (own) return own;
  return autoChart(song, level, plan);
}

/** The chart built from the song's onsets (ignores song.charts). */
export function autoChart(song, level, plan) {
  const L = LEVEL[Math.max(0, Math.min(2, level | 0))];
  const div = song.div || DIV, bpb = song.beatsPerBar || 4;
  const { end, phases } = plan;
  const lastBeat = end - 4;
  const perBar = barCap(L, song), gap = Math.max(L.gap, (L.minGapS * song.bpm) / 60);
  // Onsets over the game: a looping song repeats its onsets.
  const events = [];
  const span = song.lengthBeats * div;
  for (let rep = 0; ; rep++) {
    const off = rep * span;
    if (off / div > lastBeat || (!song.loop && rep > 0)) break;
    for (const [pos, low = 0, high = 0, mel = 0, pitch = null] of song.onsets || []) {
      const beat = (pos + off) / div;
      if (beat < 4 || beat > lastBeat) continue;
      events.push({ pos: pos + off, beat, low, high, mel, pitch });
    }
  }
  // Score each event for this level; the level decides which grid it may sit on.
  const cands = [];
  for (const e of events) {
    const sec = sectionAt(song, (e.pos % (span || Infinity)) / div);
    // Breathing space between sections: short breathers stay empty; a long
    // intro/breather keeps a gentle pulse (one note per bar, on its downbeat).
    if (sec && sec.kind === 'breath') {
      if (sec.end - sec.start <= 2 * bpb || (e.pos / div) % bpb !== 0) continue;
      if (Math.max(e.low, e.high, e.mel) >= 0.2) cands.push({ ...e, score: 0.2, role: 'low', breath: true });
      continue;
    }
    const inBeat = e.pos % div;
    const onBeat = inBeat === 0;
    const onEighth = inBeat % 6 === 0, onSixteenth = inBeat % 3 === 0, onTriplet = inBeat % 4 === 0;
    // Swung 16ths land on the triplet grid (e at 4/12, a at 10/12).
    const swung = sec && sec.feel === 'swing' && (inBeat === 4 || inBeat === 10);
    const beatInBar = Math.round(e.pos / div) % bpb;
    let score, role;
    if (L.name === 'easy') {
      if (!onBeat) continue;
      // The strong beats: the downbeat first, then the backbeat / middle of the bar.
      score = Math.max(e.low, e.high * 0.8, e.mel * 0.6) + (beatInBar === 0 ? 0.15 : beatInBar === 2 ? 0.08 : 0);
      role = e.mel > Math.max(e.low, e.high) ? 'mel' : e.low >= e.high ? 'low' : 'high';
    } else if (L.name === 'normal') {
      if (!onEighth) continue;
      // The beat plus the off-beat percussion (clave, skank, palmas): about half each.
      score = onBeat ? Math.max(e.low, e.high * 0.85) + 0.1 : e.high + 0.04;
      if (e.mel > score) { score = e.mel * 0.8; role = 'mel'; } else role = onBeat && e.low >= e.high ? 'low' : 'high';
    } else {
      if (!onSixteenth && !onTriplet && !swung) continue;
      // The melody's rhythm leads; percussion fills where the melody rests.
      const perc = Math.max(e.low, e.high) * (onBeat ? 0.9 : 0.7);
      if (e.mel * 1.1 >= perc) { score = e.mel * 1.1 + (onEighth ? 0.05 : 0); role = 'mel'; } else { score = perc; role = e.low >= e.high ? 'low' : 'high'; }
      if (!onEighth && !onTriplet && !swung) score -= 0.08;     // 16th pickups only when clear
    }
    if (score >= L.thresh) cands.push({ ...e, score, role });
  }
  // Pick per bar: strongest first, with the level's cap and minimum gap
  // (a triplet pair may be a third of a beat apart on hard).
  const byBar = new Map();
  for (const c of cands) {
    const b = Math.floor(c.beat / bpb + 1e-9);
    if (!byBar.has(b)) byBar.set(b, []);
    byBar.get(b).push(c);
  }
  const chosen = [];
  for (const [, list] of [...byBar.entries()].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => b.score - a.score || a.beat - b.beat);
    const bar = [];
    const cap = perBar - (list[0].beat < phases.ab && perBar > 2 ? 1 : 0);
    for (const c of list) {
      if (bar.length >= cap) break;
      if ([...bar, ...chosen.slice(-2)].some((o) => Math.abs(o.beat - c.beat) < Math.min(gap, 1 / 3) - 1e-6)) continue;
      if (gap >= 0.5 && [...bar, ...chosen.slice(-2)].some((o) => Math.abs(o.beat - c.beat) < gap - 1e-6)) continue;
      bar.push(c);
    }
    bar.sort((a, b) => a.beat - b.beat);
    chosen.push(...bar);
  }
  // Never more than maxBeat notes inside one beat (keeps hard fun, not frantic).
  const notes = [];
  let lastPitch = null, lastMelBtn = 'x';
  for (const c of chosen) {
    if (notes.filter((n) => c.beat - n.beat < 1 - 1e-6).length >= L.maxBeat) continue;
    let btn;
    if (c.role === 'mel') {
      if (c.pitch != null && lastPitch != null && c.pitch !== lastPitch) lastMelBtn = c.pitch > lastPitch ? 'y' : 'x';
      if (c.pitch != null) lastPitch = c.pitch;
      btn = lastMelBtn;
    } else btn = c.role === 'low' ? 'a' : 'b';
    // Fold buttons that aren't taught yet.
    if (c.beat < phases.ab) btn = 'a';
    else if (c.beat < phases.all) btn = btn === 'x' ? 'a' : btn === 'y' ? 'b' : btn;
    notes.push({ beat: c.beat, btn, gold: c.beat >= phases.boss });
  }
  // Easy keeps a steady pulse in the A-only warm-up so it's never empty.
  if (L.name === 'easy') {
    for (let b = 4; b < Math.min(phases.ab, lastBeat); b += 2) {
      const sec = sectionAt(song, song.loop ? b % song.lengthBeats : b);
      if (sec && sec.kind === 'breath') continue;
      if (!notes.some((n) => Math.abs(n.beat - b) < Math.max(1, gap) - 1e-6)) notes.push({ beat: b, btn: 'a', gold: false });
    }
    notes.sort((a, b) => a.beat - b.beat);
  }
  return notes;
}

/**
 * Density of a chart: { notes, perMin, maxPerBeat, maxPer2s, minGap } (minGap in
 * beats; perMin over the stretch from the first to the last note).
 */
export function chartStats(notes, bpm) {
  const n = notes.length;
  if (!n) return { notes: 0, perMin: 0, maxPerBeat: 0, maxPer2s: 0, minGap: null };
  const beats = notes.map((x) => x.beat).sort((a, b) => a - b);
  const spanMin = Math.max(1, beats[n - 1] - beats[0] + 1) * 60 / bpm / 60;
  let maxPerBeat = 0, maxPer2s = 0, minGap = Infinity;
  const w2 = 2 * bpm / 60;
  for (let i = 0, j = 0, k = 0; i < n; i++) {
    while (beats[i] - beats[j] >= 1 - 1e-6) j++;
    while (beats[i] - beats[k] >= w2 - 1e-6) k++;
    maxPerBeat = Math.max(maxPerBeat, i - j + 1); maxPer2s = Math.max(maxPer2s, i - k + 1);
    if (i) minGap = Math.min(minGap, beats[i] - beats[i - 1]);
  }
  return { notes: n, perMin: Math.round((n / spanMin) * 10) / 10, maxPerBeat, maxPer2s, minGap: minGap === Infinity ? null : Math.round(minGap * 1000) / 1000 };
}
