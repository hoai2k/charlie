// Rhythm Editor (workbench/rhythm.html): play the rhythm-game charts, record
// your own hits with a controller or keys, edit them on a timeline and
// download them as JSON (see workbench/README.md and rhythm-data.js).
//
// Charts come from src/games/rhythm/chart.js, exactly as Pop Star Stage builds
// them (levelPlan: the plan the game uses at that difficulty), so Play mode is
// the game's own notes. Audio is played here with its own Web Audio graph (the
// song's file, from its first downbeat `start`, looping songs between
// loopStart/loopEnd) so the playhead can jump and a range can loop exactly.
import { buildChart, autoChart, levelPlan, songPlan, gameFold, chartStats, LEVELS, LEVEL_IDS } from '../src/games/rhythm/chart.js';
import * as D from './rhythm-data.js';

const $ = (id) => document.getElementById(id);
const BTNS = D.BTNS;
const COLOR = { a: '#3ec43e', b: '#e8423b', x: '#2f7dfa', y: '#f5b70f' };
const MIDI = { a: 72, b: 75, x: 79, y: 82 };      // the game's hit notes (Pop Star Stage BTN_MIDI)
const TRAVEL = 2.5;                               // beats a note falls before the hit line (as in the game)
const PERFECT_S = 0.08, GOOD_S = 0.16;            // hit windows (± s, as in the game)
const STORE = 'party.rhythmEditor.v1';            // unsaved edits (this browser only)
const PREFS = 'party.rhythmEditor.prefs';
const MODES = ['play', 'record', 'edit'];
const KEY_BTN = { Space: 'a', KeyJ: 'a', KeyK: 'b', KeyL: 'x', KeyI: 'y' };   // the game's keyboard 1 layout
const LETTER_BTN = { KeyA: 'a', KeyB: 'b', KeyX: 'x', KeyY: 'y' };
const PAD = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- state
const S = {
  songs: [], song: null, lv: 0, mode: 'play',
  work: {},            // song id -> { charts: { lv: notes }, auto: [lv] } (unsaved edits)
  hist: new Map(),     // song id -> D.History
  base: new Map(),     // `${id}:${lv}` -> the game's chart now (notes)
  sel: [],             // selected beats (Edit)
  clip: null,          // copied notes (relative beats)
  view: { start: -2, ppb: 48 },
  playhead: 0, range: { a: 0, b: 16 },
  drag: null, hover: null,
  layout: null,        // rects from the last draw
  judge: null,         // Play mode run
  rec: null,           // Record mode run
  pops: [],            // judgement texts
  flash: { a: 0, b: 0, x: 0, y: 0 },
  loading: false,
};
let prefs = {};
try { prefs = JSON.parse(localStorage.getItem(PREFS) || '{}') || {}; } catch (e) { prefs = {}; }
const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) { /* private mode */ } };

const spb = () => 60 / S.song.bpm;
const plan = (lv = S.lv) => levelPlan(S.song, lv);
const endBeat = () => (S.song.loop ? songPlan(S.song, 0).end - 2 : S.song.lengthBeats);
const snapDiv = (id = 'snap-edit') => D.SNAPS.find((s) => s.id === $(id).value)?.div ?? 2;
const work = (id = S.song.id) => (S.work[id] = S.work[id] || { charts: {}, auto: [] });
const history = (id = S.song.id) => { if (!S.hist.has(id)) S.hist.set(id, new D.History()); return S.hist.get(id); };

function baseChart(song, lv) {
  const k = song.id + ':' + lv;
  if (!S.base.has(k)) S.base.set(k, buildChart(song, lv, levelPlan(song, lv)).map((n) => ({ beat: D.roundBeat(n.beat), btn: n.btn })));
  return S.base.get(k);
}
const autoOf = (song, lv) => autoChart(song, lv, levelPlan(song, lv)).map((n) => ({ beat: D.roundBeat(n.beat), btn: n.btn }));
/** The level's chart as edited here (else the game's). */
function chartOf(song = S.song, lv = S.lv) {
  const w = S.work[song.id];
  if (w && w.charts[lv]) return w.charts[lv];
  if (w && w.auto.includes(lv)) return autoOf(song, lv);
  return baseChart(song, lv);
}
const handMade = (song, lv) => !!(song.charts && Array.isArray(song.charts[LEVEL_IDS[lv]]));
function isChanged(song, lv) {
  const w = S.work[song.id];
  if (!w) return false;
  if (w.charts[lv]) return !D.sameChart(w.charts[lv], baseChart(song, lv));
  return w.auto.includes(lv) && handMade(song, lv);
}
const songChanged = (song) => [0, 1, 2].some((lv) => isChanged(song, lv));

function snapshot() { const w = work(); return { charts: Object.fromEntries(Object.entries(w.charts).map(([k, v]) => [k, D.toPairs(v)])), auto: [...w.auto] }; }
function restore(st) { S.work[S.song.id] = { charts: Object.fromEntries(Object.entries(st.charts).map(([k, v]) => [k, D.fromPairs(v)])), auto: [...st.auto] }; }
/** Replace the current level's chart (one undo step unless `noUndo`). */
function setChart(notes, label, { noUndo = false, lv = S.lv } = {}) {
  if (!noUndo) history().push(snapshot(), label);
  const w = work();
  w.charts[lv] = D.normalize(notes);
  w.auto = w.auto.filter((x) => x !== lv);
  persist(); refresh();
}

function persist() {
  const out = {};
  for (const s of S.songs) {
    const w = S.work[s.id];
    if (!w || !songChanged(s)) continue;
    out[s.id] = { file: s.file, charts: Object.fromEntries(Object.entries(w.charts).map(([k, v]) => [k, D.toPairs(v)])), auto: w.auto };
  }
  try { localStorage.setItem(STORE, JSON.stringify({ version: 1, songs: out })); } catch (e) { /* private mode */ }
}
function restoreStored() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { d = null; }
  if (!d || d.version !== 1) return 0;
  let n = 0;
  for (const s of S.songs) {
    const st = d.songs && d.songs[s.id];
    if (!st || st.file !== s.file) continue;
    S.work[s.id] = { charts: Object.fromEntries(Object.entries(st.charts || {}).map(([k, v]) => [+k, D.fromPairs(v)])), auto: (st.auto || []).map(Number) };
    if (songChanged(s)) n++;
  }
  return n;
}

// ---------------------------------------------------------------- audio
let ctx = null, master = null, musicGain = null, fxGain = null;
const buffers = new Map();   // file -> Promise<AudioBuffer>
const envs = new Map();      // file -> { peaks: Float32Array, rate }
function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.8; musicGain.connect(master);
    fxGain = ctx.createGain(); fxGain.gain.value = 0.5; fxGain.connect(master);
    if (S.song) loadSong(S.song);
  }
  if (ctx.state !== 'running') ctx.resume().then(refreshUnlock, () => {});
  refreshUnlock();
}
function refreshUnlock() { $('unlock').hidden = !!(ctx && ctx.state === 'running'); }
function loadBuffer(file) {
  if (!buffers.has(file)) {
    buffers.set(file, fetch('assets/audio/' + file).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + file); return r.arrayBuffer(); })
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => { envs.set(file, envelope(buf)); return buf; }));
  }
  return buffers.get(file);
}
function envelope(buf) {
  const rate = 200, n = Math.ceil(buf.duration * rate), peaks = new Float32Array(n);
  const ch = [...Array(buf.numberOfChannels)].map((_, i) => buf.getChannelData(i));
  const step = buf.sampleRate / rate;
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = Math.floor(i * step), e = Math.min(ch[0].length, Math.floor((i + 1) * step)); j < e; j += 4) {
      for (const c of ch) { const v = Math.abs(c[j]); if (v > m) m = v; }
    }
    peaks[i] = m;
  }
  return { peaks, rate };
}
async function loadSong(song) {
  if (!ctx) return null;
  S.loading = true; refresh();
  try { song.buf = await loadBuffer(song.file); } catch (e) { toast('Could not load ' + song.file + ': ' + e.message); }
  S.loading = false; refresh();
  return song.buf;
}
/** File seconds of a song beat. */
function fileTime(song, beat) {
  const t = beat * 60 / song.bpm;
  if (song.loop) return song.loopStart + mod(t, song.loopEnd - song.loopStart);
  return song.start + t;
}
/** Context time a sound scheduled now would be heard at a given performance.now() (output latency included). */
function heardCtx(perf = performance.now()) {
  if (ctx.getOutputTimestamp) {
    const ts = ctx.getOutputTimestamp();
    if (ts && ts.performanceTime > 0) return ts.contextTime + (perf - ts.performanceTime) / 1000;
  }
  return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) + (perf - performance.now()) / 1000;
}

// Playback: segments { t (ctx time), beat, src }: beat(t) = seg.beat + (t - seg.t) / spb.
const P = { playing: false, segs: [], loop: null, stopAt: Infinity, lastSched: 0, wraps: 0, onWrap: null, onEnd: null };
function startSrc(when, beat) {
  const song = S.song, s = ctx.createBufferSource();
  s.buffer = song.buf;
  if (song.loop) { s.loop = true; s.loopStart = song.loopStart; s.loopEnd = song.loopEnd; }
  s.connect(musicGain);
  let off = fileTime(song, beat);
  if (!song.loop && off < 0) { when += -off; off = 0; }
  if (off < song.buf.duration) s.start(when, off);
  return s;
}
function play(fromBeat, { loop = null, stopAt = Infinity, onWrap = null, onEnd = null } = {}) {
  stop(true);
  ensureAudio();
  if (!S.song.buf) { toast('The song is still loading'); return false; }
  const when = ctx.currentTime + 0.06;
  P.segs = [{ t: when, beat: fromBeat, src: startSrc(when, fromBeat), next: false }];
  P.playing = true; P.loop = loop; P.stopAt = stopAt; P.lastSched = when; P.wraps = 0; P.onWrap = onWrap; P.onEnd = onEnd;
  refresh();
  return true;
}
function stop(quiet = false) {
  for (const s of P.segs) { try { s.src.stop(); } catch (e) { /* not started */ } }
  const was = P.playing;
  P.segs = []; P.playing = false;
  if (was && !quiet && P.onEnd) { const f = P.onEnd; P.onEnd = null; f(); }
  if (!quiet) refresh();
}
function beatAtCtx(t) {
  let seg = P.segs[0];
  for (const s of P.segs) if (s.t <= t) seg = s;
  return seg ? seg.beat + (t - seg.t) / spb() : S.playhead;
}
const nowBeat = () => (P.playing ? beatAtCtx(heardCtx()) : S.playhead);
function tickAudio() {
  if (!P.playing) return;
  const now = ctx.currentTime, sp = spb();
  const last = P.segs[P.segs.length - 1];
  if (P.loop) {
    const tB = last.t + (P.loop.b - last.beat) * sp;
    if (!last.next && tB - now < 0.35) {
      try { last.src.stop(tB); } catch (e) { /* ignore */ }
      P.segs.push({ t: tB, beat: P.loop.a, src: startSrc(tB, P.loop.a), next: false });
      last.next = true;
      if (P.segs.length > 3) P.segs.shift();
    }
  }
  // wrap callbacks at the moment the wrap is heard
  const heard = heardCtx();
  for (let i = 1; i < P.segs.length; i++) {
    const s = P.segs[i];
    if (!s.fired && heard >= s.t) { s.fired = true; P.wraps++; if (P.onWrap) P.onWrap(P.wraps); }
  }
  scheduleSounds(now + 0.25);
  const b = beatAtCtx(heard);
  if (!P.loop && (b >= P.stopAt || (!S.song.loop && fileTime(S.song, b) > S.song.buf.duration))) {
    S.playhead = Math.min(b, P.stopAt);
    stop();
  }
}
/** Metronome clicks and (Edit mode) the chart's note sounds, scheduled ahead. */
function scheduleSounds(horizon) {
  const sp = spb(), metro = $('metro').checked, notes = S.mode === 'edit' && $('notesnd').checked ? chartOf() : null;
  for (let i = 0; i < P.segs.length; i++) {
    const s = P.segs[i], segEnd = i + 1 < P.segs.length ? P.segs[i + 1].t : (P.loop ? s.t + (P.loop.b - s.beat) * sp : Infinity);
    const t0 = Math.max(P.lastSched, s.t), t1 = Math.min(horizon, segEnd);
    if (t1 <= t0) continue;
    const b0 = s.beat + (t0 - s.t) / sp, b1 = s.beat + (t1 - s.t) / sp;
    if (metro) for (let b = Math.ceil(b0 - 1e-9); b < b1 - 1e-9; b++) click(s.t + (b - s.beat) * sp, mod(b, S.song.beatsPerBar || 4) === 0);
    if (notes) for (const n of notes) if (n.beat >= b0 - 1e-9 && n.beat < b1 - 1e-9) blip(n.btn, s.t + (n.beat - s.beat) * sp, 0.5);
  }
  P.lastSched = Math.max(P.lastSched, horizon);
}
function click(t, accent) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = accent ? 1760 : 1175;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.22, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  o.connect(g); g.connect(fxGain); o.start(t); o.stop(t + 0.06);
}
function blip(btn, t = ctx.currentTime, vol = 0.7) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = 440 * 2 ** ((MIDI[btn] - 69) / 12);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g); g.connect(fxGain); o.start(t); o.stop(t + 0.2);
}

// ---------------------------------------------------------------- transport per mode
function togglePlay() {
  ensureAudio();
  if (P.playing) { if (S.rec) finishRecording(); stop(); return; }
  if (S.mode === 'record') { startRecording(); return; }
  if (S.mode === 'play') { startPlayRun(); return; }
  const loop = $('loop').checked && S.range.b > S.range.a ? { ...S.range } : null;
  play(loop ? clamp(S.playhead, S.range.a, S.range.b - 0.01) : S.playhead, { loop, stopAt: loop ? Infinity : endBeat() + 4, onEnd: () => {} });
}
function playNotes() {
  const raw = chartOf(), notes = $('fold').checked ? gameFold(S.song, S.lv, raw) : raw.map((n) => ({ ...n }));
  const boss = plan().phases.boss;
  return notes.map((n) => ({ beat: n.beat, btn: n.btn, gold: n.beat >= boss, judged: null, jt: 0 }));
}
function startPlayRun() {
  const loop = $('loop').checked && S.range.b > S.range.a ? { ...S.range } : null;
  const from = S.range.a, to = S.range.b > S.range.a ? S.range.b : endBeat();
  const startAt = from - Math.min(TRAVEL + 0.5, 4);   // notes fall in before the first one
  S.judge = { notes: playNotes().filter((n) => n.beat >= from - 1e-9 && n.beat < to - 1e-9), perfect: 0, good: 0, miss: 0, oops: 0, combo: 0, best: 0, score: 0, offs: [], whiffs: 0, from, to };
  play(startAt, {
    loop, stopAt: to + 2,
    onWrap: () => { for (const n of S.judge.notes) { n.judged = null; } S.judge.pass = (S.judge.pass || 1) + 1; },
    onEnd: () => { refresh(); toast(summary()); },
  });
  S.view.start = Math.max(-2, from - 2);
}
function summary() {
  const j = S.judge;
  if (!j) return '';
  const total = j.perfect + j.good + j.miss + j.oops;
  const acc = total ? Math.round(((j.perfect + j.good) / total) * 100) : 0;
  return `${j.perfect} perfect, ${j.good} good, ${j.miss + j.oops} missed (${acc}%)`;
}
function judgePress(btn, beat) {
  const j = S.judge, good = GOOD_S / spb(), perfect = PERFECT_S / spb();
  if (!j) return;
  const open = j.notes.filter((n) => !n.judged && Math.abs(n.beat - beat) <= good);
  if (!open.length) { j.whiffs++; return; }
  const nearest = (list) => list.reduce((p, q) => (Math.abs(q.beat - beat) < Math.abs(p.beat - beat) ? q : p));
  const mine = open.filter((n) => n.btn === btn);
  if (!mine.length) {
    const n = nearest(open); n.judged = 'oops'; n.jt = performance.now(); j.oops++; j.combo = 0;
    pop('Oops', '#ffb3c6', n.btn); refresh(); return;
  }
  const n = nearest(mine), off = (beat - n.beat) * spb() * 1000;
  const grade = Math.abs(n.beat - beat) <= perfect ? 'perfect' : 'good';
  n.judged = grade; n.jt = performance.now();
  j[grade]++; j.combo++; j.best = Math.max(j.best, j.combo); j.offs.push(off);
  j.score += (grade === 'perfect' ? 100 : 60) * (n.gold ? 2 : 1);
  pop(grade === 'perfect' ? 'Perfect!' : 'Good!', grade === 'perfect' ? '#ffd23f' : '#7dffb4', n.btn, off);
  if ($('notesnd').checked) blip(n.btn);
  refresh();
}
function judgeMisses(beat) {
  const j = S.judge, good = GOOD_S / spb();
  if (!j) return;
  let any = false;
  for (const n of j.notes) if (!n.judged && n.beat < beat - good) { n.judged = 'miss'; n.jt = performance.now(); j.miss++; j.combo = 0; pop('Miss', '#b9a8d9', n.btn); any = true; }
  if (any) refresh();
}
function pop(text, color, btn, off = null) { S.pops.push({ text, color, btn, off, t: performance.now() }); if (S.pops.length > 8) S.pops.shift(); }

function startRecording() {
  if (!(S.range.b > S.range.a)) { toast('Set a range first (From / To)'); return; }
  const bpb = S.song.beatsPerBar || 4, loop = $('loop').checked ? { ...S.range } : null;
  const from = $('preroll').checked ? S.range.a - bpb : S.range.a - 0.5;
  S.rec = { a: S.range.a, b: S.range.b, hits: [], all: 0, passes: 0, mode: $('rec-mode').value, div: snapDiv('snap'), undo: false };
  play(from, { loop, stopAt: S.range.b + 0.25, onWrap: () => commitPass(), onEnd: () => finishRecording() });
  S.view.start = Math.max(-2, S.range.a - 2);
  toast(`Recording beats ${S.range.a} to ${S.range.b}${loop ? ' (looping)' : ''}`);
}
function recordHit(btn, beat) {
  const r = S.rec;
  if (!r) return;
  const half = r.div ? 0.5 / r.div : 0.05;
  if (beat < r.a - half || beat >= r.b) return;
  r.hits.push({ beat: Math.max(r.a, beat), btn }); r.all++;
  if ($('notesnd').checked) blip(btn);
  refresh();
}
function commitPass() {
  const r = S.rec;
  if (!r) return;
  if (r.hits.length || (r.passes === 0 && r.mode === 'replace')) {
    const notes = D.mergeRecording(chartOf(), r.hits, { from: r.a, to: r.b, mode: r.passes === 0 ? r.mode : 'merge', div: r.div });
    setChart(notes, 'record', { noUndo: r.undo });
    r.undo = true;
  }
  r.passes++; r.hits = [];
}
function finishRecording() {
  if (!S.rec) return;
  commitPass();
  const r = S.rec; S.rec = null;
  toast(r.all ? `Recorded ${r.all} hit${r.all > 1 ? 's' : ''} into ${LEVELS[S.lv]} (beats ${r.a}-${r.b})` : 'Nothing recorded');
  refresh();
}

// ---------------------------------------------------------------- input
function press(btn, perf = performance.now()) {
  S.flash[btn] = 1;
  if (S.mode === 'edit') { editAtPlayhead(btn); return; }
  if (!P.playing || !ctx) { if (ctx) blip(btn); return; }
  const offset = (+$('offset').value || 0) / 1000;
  const beat = beatAtCtx(heardCtx(perf) - offset);
  if (S.mode === 'play') judgePress(btn, beat);
  else if (S.mode === 'record') recordHit(btn, beat);
}
function editAtPlayhead(btn) {
  const beat = D.snapBeat(S.playhead, snapDiv());
  if (S.sel.length && !P.playing) { setButtons(btn); return; }
  setChart(D.toggleNote(chartOf(), beat, btn), 'toggle');
  if (ctx) blip(btn);
}
function setButtons(btn) {
  if (!S.sel.length) return;
  const notes = chartOf().map((n) => (S.sel.some((b) => Math.abs(n.beat - b) < D.SAME) ? { ...n, btn } : n));
  setChart(notes, 'button');
}
function moveSel(dBeat, dRow) {
  if (!S.sel.length) return;
  const chart = chartOf(), sel = chart.filter((n) => S.sel.some((b) => Math.abs(n.beat - b) < D.SAME));
  if (dRow) {
    const notes = chart.map((n) => (sel.includes(n) ? { ...n, btn: BTNS[clamp(BTNS.indexOf(n.btn) + dRow, 0, 3)] } : n));
    setChart(notes, 'lane'); return;
  }
  const out = D.moveNotes(chart, S.sel, dBeat, null, 0);
  S.sel = S.sel.map((b) => Math.max(0, D.roundBeat(b + dBeat)));
  setChart(out, 'move');
}
function deleteSel() {
  if (!S.sel.length) return;
  setChart(D.removeNotes(chartOf(), S.sel), 'delete');
  S.sel = []; refresh();
}
function copySel() {
  const notes = chartOf().filter((n) => S.sel.some((b) => Math.abs(n.beat - b) < D.SAME));
  if (!notes.length) { toast('Select some notes first'); return; }
  const b0 = notes[0].beat;
  S.clip = notes.map((n) => ({ beat: n.beat - b0, btn: n.btn }));
  toast(`Copied ${notes.length} note${notes.length > 1 ? 's' : ''}`);
}
function paste() {
  if (!S.clip) { toast('Nothing copied yet'); return; }
  const at = D.snapBeat(S.playhead, snapDiv());
  const add = S.clip.map((n) => ({ beat: at + n.beat, btn: n.btn }));
  setChart([...chartOf(), ...add], 'paste');
  S.sel = add.map((n) => D.roundBeat(n.beat)); refresh();
}
function copyTo(lv, whole) {
  if (lv === S.lv) return;
  const src = whole ? chartOf() : chartOf().filter((n) => S.sel.some((b) => Math.abs(n.beat - b) < D.SAME));
  if (!src.length) { toast(whole ? 'This level is empty' : 'Select some notes first'); return; }
  const target = whole ? src : [...chartOf(S.song, lv), ...src];
  setChart(target, 'copy to ' + LEVELS[lv], { lv });
  toast(`${whole ? 'Level' : src.length + ' notes'} copied to ${LEVELS[lv]}`);
}
function resetLevel() {
  const w = work(), had = w.charts[S.lv] || handMade(S.song, S.lv);
  if (!had && !isChanged(S.song, S.lv)) { toast('This level is already built from the onsets'); return; }
  history().push(snapshot(), 'reset');
  delete w.charts[S.lv];
  if (handMade(S.song, S.lv) && !w.auto.includes(S.lv)) w.auto.push(S.lv);
  persist(); refresh();
  toast(`${LEVELS[S.lv]}: back to the chart built from the song's onsets`);
}
function undo(redo = false) {
  const h = history(), st = redo ? h.redo(snapshot()) : h.undo(snapshot());
  if (!st) { toast(redo ? 'Nothing to redo' : 'Nothing to undo'); return; }
  restore(st); S.sel = []; persist(); refresh();
}
function setLevel(lv) { if (P.playing) stop(); S.lv = clamp(lv, 0, 2); S.sel = []; prefs.lv = S.lv; savePrefs(); refresh(); }
function setMode(m) {
  if (P.playing) { if (S.rec) finishRecording(); stop(); }
  S.mode = m; prefs.mode = m; savePrefs(); S.judge = null; refresh();
}
function nudgePlayhead(steps, bar = false) {
  if (P.playing) return;
  const div = snapDiv(S.mode === 'record' ? 'snap' : 'snap-edit') || 4;
  const d = bar ? (S.song.beatsPerBar || 4) : 1 / div;
  S.playhead = clamp(D.snapBeat(S.playhead + steps * d, bar ? 1 : div), 0, endBeat() + 4);
  follow(true); refresh();
}
function setRange(which, v) {
  v = Math.max(0, Math.round(v));
  if (which === 'a') S.range.a = Math.min(v, S.range.b - 1 >= 0 ? S.range.b - 1 : v);
  else S.range.b = Math.max(v, S.range.a + 1);
  refresh();
}

window.addEventListener('keydown', (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'range' || tag === 'TEXTAREA') return;
  if (!$('help-dlg').hidden) { if (e.code === 'Escape' || e.key === '?') { $('help-dlg').hidden = true; e.preventDefault(); } return; }
  ensureAudio();
  const cmd = e.ctrlKey || e.metaKey;
  if (cmd && e.code === 'KeyZ') { e.preventDefault(); undo(e.shiftKey); return; }
  if (cmd && e.code === 'KeyY') { e.preventDefault(); undo(true); return; }
  if (cmd && e.code === 'KeyS') { e.preventDefault(); download(); return; }
  if (cmd && e.code === 'KeyC' && S.mode === 'edit') { e.preventDefault(); copySel(); return; }
  if (cmd && e.code === 'KeyV' && S.mode === 'edit') { e.preventDefault(); paste(); return; }
  if (cmd && e.code === 'KeyA' && S.mode === 'edit') { e.preventDefault(); S.sel = chartOf().map((n) => n.beat); refresh(); return; }
  if (cmd) return;
  if (tag === 'SELECT' && /^Arrow/.test(e.code)) return;
  if (e.repeat && (KEY_BTN[e.code] || LETTER_BTN[e.code])) { e.preventDefault(); return; }
  if (e.key === '?') { $('help-dlg').hidden = false; return; }
  if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); togglePlay(); return; }
  if (e.code === 'Tab') { e.preventDefault(); setMode(MODES[mod(MODES.indexOf(S.mode) + (e.shiftKey ? -1 : 1), 3)]); return; }
  if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') { setLevel(+e.code.slice(5) - 1); return; }
  if (e.code === 'BracketLeft') { setRange('a', Math.floor(S.playhead)); return; }
  if (e.code === 'BracketRight') { setRange('b', Math.ceil(S.playhead)); return; }
  if (e.code === 'Home') { e.preventDefault(); if (!P.playing) { S.playhead = S.range.a; follow(true); refresh(); } return; }
  if (S.mode === 'edit') {
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
    if (e.code === 'Escape') { S.sel = []; refresh(); return; }
    if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); deleteSel(); return; }
    if (LETTER_BTN[e.code] && S.sel.length) { setButtons(LETTER_BTN[e.code]); return; }
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { e.preventDefault(); moveSel(0, e.code === 'ArrowUp' ? -1 : 1); return; }
    if (e.code === 'Comma' || e.code === 'Period') { const div = snapDiv() || 12; moveSel((e.code === 'Comma' ? -1 : 1) / div, 0); return; }
  }
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); nudgePlayhead(e.code === 'ArrowLeft' ? -1 : 1, e.shiftKey); return; }
  const btn = KEY_BTN[e.code] || (S.mode === 'edit' ? LETTER_BTN[e.code] : null);
  if (btn) { e.preventDefault(); press(btn, e.timeStamp); }
});

// Gamepads: polled every frame (standard mapping).
const padPrev = new Map();
function pollPads() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  for (const gp of pads) {
    const prev = padPrev.get(gp.index) || {};
    const now = {};
    for (const [name, i] of Object.entries(PAD)) now[name] = !!(gp.buttons[i] && gp.buttons[i].pressed);
    const ts = gp.timestamp && Math.abs(performance.now() - gp.timestamp) < 100 ? gp.timestamp : performance.now();
    for (const name of Object.keys(PAD)) if (now[name] && !prev[name]) padButton(name, ts);
    padPrev.set(gp.index, now);
  }
}
function padButton(name, ts) {
  ensureAudio();
  if (BTNS.includes(name)) { press(name, ts); return; }
  if (name === 'start') togglePlay();
  else if (name === 'back') setMode(MODES[mod(MODES.indexOf(S.mode) + 1, 3)]);
  else if (name === 'lb') setLevel(S.lv - 1);
  else if (name === 'rb') setLevel(S.lv + 1);
  else if (name === 'lt') setRange('a', Math.floor(S.playhead));
  else if (name === 'rt') setRange('b', Math.ceil(S.playhead));
  else if (name === 'left' || name === 'right') nudgePlayhead(name === 'left' ? -1 : 1);
  else if (name === 'up' || name === 'down') {
    if (S.mode !== 'edit') { nudgePlayhead(name === 'up' ? -1 : 1, true); return; }
    // select the previous / next note from the playhead
    const notes = chartOf(), ph = S.playhead;
    const n = name === 'down' ? notes.find((x) => x.beat > ph + 1e-6) : [...notes].reverse().find((x) => x.beat < ph - 1e-6);
    if (n) { S.playhead = n.beat; S.sel = [n.beat]; follow(true); refresh(); }
  }
}

// ---------------------------------------------------------------- canvas
const cv = $('view'), g = cv.getContext('2d');
let W = 0, H = 0;
const noteImg = {};
for (const b of BTNS) { const im = new Image(); im.src = `assets/art/prop/note-${b}.webp`; noteImg[b] = im; }
function resize() {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resize).observe(cv);

function layout() {
  const showHw = S.mode !== 'edit';
  const tlH = showHw ? Math.min(250, Math.max(190, H * 0.36)) : H - 16;
  const tl = { x: 8, y: H - tlH - 8, w: W - 16, h: tlH };
  const hw = showHw ? { x: 24, y: 16, w: Math.min(280, W * 0.32), h: tl.y - 32 } : null;
  const gut = 46, ruler = 30, ons = showHw ? 16 : 26;
  let wave = showHw ? 34 : 64;
  let laneH = Math.max(22, (tl.h - ruler - wave - ons - 12) / 4);
  if (laneH > 72) { wave += (laneH - 72) * 4 * 0.5; laneH = 72; }   // tall views: a bigger waveform, not giant lanes
  const laneTop = tl.y + ruler + wave + ons + 6;
  return { tl, hw, gut, ruler, wave, ons, laneTop, laneH, x0: tl.x + gut };
}
/** Timeline note size: notes half a beat apart don't overlap. */
const noteSize = (L) => Math.min(L.laneH * 0.78, Math.max(14, S.view.ppb * 0.5), 34);
const xOf = (L, beat) => L.x0 + (beat - S.view.start) * S.view.ppb;
const beatOf = (L, x) => S.view.start + (x - L.x0) / S.view.ppb;
const visBeats = (L) => (L.tl.x + L.tl.w - L.x0) / S.view.ppb;
function follow(force = false) {
  const L = S.layout || layout(), b = nowBeat(), vb = visBeats(L);
  if (force ? (b < S.view.start || b > S.view.start + vb) : (b > S.view.start + vb * 0.85 || b < S.view.start)) S.view.start = b - vb * 0.15;
}

function draw() {
  const L = S.layout = layout();
  g.clearRect(0, 0, W, H);
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--ink').trim() || '#24163f', muted = css.getPropertyValue('--muted').trim() || '#6b6382';
  const panel = css.getPropertyValue('--panel').trim() || '#fff', line = css.getPropertyValue('--line').trim() || '#e1dbef';
  if (!S.song) return;
  const b = nowBeat();
  if (L.hw) drawHighway(L, b, { ink, muted, panel, line });
  drawTimeline(L, b, { ink, muted, panel, line });
}

function drawNoteGem(btn, x, y, size, o = {}) {
  g.save();
  if (o.alpha != null) g.globalAlpha = o.alpha;
  if (o.gold) { g.strokeStyle = '#ffd23f'; g.lineWidth = Math.max(2, size * 0.09); g.beginPath(); g.arc(x, y, size * 0.62, 0, Math.PI * 2); g.stroke(); }
  const im = noteImg[btn];
  if (o.hollow) {
    g.strokeStyle = COLOR[btn]; g.lineWidth = Math.max(2, size * 0.12); g.setLineDash([4, 3]);
    g.beginPath(); g.arc(x, y, size * 0.42, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  } else if (im.complete && im.naturalWidth && size >= 26) {
    g.drawImage(im, x - size * 0.575, y - size * 0.575, size * 1.15, size * 1.15);
  } else {
    g.fillStyle = COLOR[btn]; g.beginPath(); g.arc(x, y, size / 2, 0, Math.PI * 2); g.fill();
    g.lineWidth = Math.max(1.5, size * 0.07); g.strokeStyle = '#24163f'; g.stroke();
  }
  g.fillStyle = o.hollow ? COLOR[btn] : '#fff'; g.font = `800 ${Math.round(size * 0.5)}px system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!o.hollow) { g.lineWidth = Math.max(2, size * 0.1); g.strokeStyle = '#24163f'; g.strokeText(btn.toUpperCase(), x, y + 1); }
  g.fillText(btn.toUpperCase(), x, y + 1);
  if (o.sel) { g.strokeStyle = o.selColor || '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, size * 0.6 + 3, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}

function drawHighway(L, b, c) {
  const R = L.hw, cx = R.x + R.w / 2, hitY = R.y + R.h * 0.82, top = R.y + 10;
  const yOf = (beat) => hitY - (beat - b) * ((hitY - top) / TRAVEL);
  g.save();
  g.fillStyle = '#24163f'; roundRect(R.x, R.y, R.w, R.h, 14); g.fill();
  g.beginPath(); roundRect(R.x, R.y, R.w, R.h, 14); g.clip();
  // beat lines
  const sp = spb();
  for (let k = Math.floor(b - 1); k < b + TRAVEL + 1; k++) {
    const y = yOf(k); if (y < R.y || y > R.y + R.h) continue;
    g.strokeStyle = mod(k, S.song.beatsPerBar || 4) === 0 ? '#ffffff40' : '#ffffff18'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(R.x, y); g.lineTo(R.x + R.w, y); g.stroke();
  }
  // press flashes
  for (const k of BTNS) if (S.flash[k] > 0) { g.fillStyle = COLOR[k]; g.globalAlpha = S.flash[k] * 0.35; g.fillRect(R.x, hitY - 40, R.w, 80); g.globalAlpha = 1; }
  // hit line
  g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.globalAlpha = 0.8;
  g.beginPath(); g.arc(cx, hitY, 34, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = 0.5; g.fillStyle = '#fff'; g.fillRect(R.x + 6, hitY - 2, R.w / 2 - 6 - 34, 4); g.fillRect(cx + 34, hitY - 2, R.w / 2 - 40, 4); g.globalAlpha = 1;
  // notes
  const size = Math.min(62, R.w * 0.26);
  let list;
  if (S.mode === 'play' && S.judge) list = S.judge.notes;
  else if (S.mode === 'record' && !$('rec-guide').checked) list = [];
  else { const boss = plan().phases.boss; const raw = chartOf(); list = ($('fold').checked ? gameFold(S.song, S.lv, raw) : raw).map((n) => ({ ...n, gold: n.beat >= boss })); }
  const now = performance.now();
  for (const n of list) {
    if (n.beat < b - 1 || n.beat > b + TRAVEL + 0.5) continue;
    if (n.judged === 'perfect' || n.judged === 'good') {
      const k = (now - n.jt) / 250; if (k > 1) continue;
      drawNoteGem(n.btn, cx, hitY, size * (1 + k * 0.6), { alpha: 1 - k, gold: n.gold }); continue;
    }
    const y = yOf(n.beat);
    const dim = S.mode === 'record' ? 0.45 : n.judged ? 0.35 : 1;
    drawNoteGem(n.btn, cx, Math.min(y, hitY + size), size, { alpha: dim, gold: n.gold });
  }
  // recorded hits so far (this pass): rise from the line
  if (S.rec) for (const h of S.rec.hits) {
    const y = yOf(h.beat); if (y < R.y - size || y > R.y + R.h + size) continue;
    drawNoteGem(h.btn, cx, y, size * 0.8, { hollow: true });
  }
  g.restore();
  // judgement pops
  for (const p of S.pops) {
    const k = (now - p.t) / 700; if (k > 1) continue;
    g.save(); g.globalAlpha = 1 - k; g.font = '800 30px system-ui, sans-serif'; g.textAlign = 'center';
    g.lineWidth = 6; g.strokeStyle = '#24163f'; g.fillStyle = p.color;
    const y = hitY - 60 - k * 30;
    g.strokeText(p.text, cx, y); g.fillText(p.text, cx, y);
    if (p.off != null) { g.font = '600 15px system-ui, sans-serif'; const t = `${p.off > 0 ? '+' : ''}${Math.round(p.off)} ms`; g.strokeText(t, cx, y + 22); g.fillText(t, cx, y + 22); }
    g.restore();
  }
  // big readout beside the highway
  const ix = R.x + R.w + 24;
  g.fillStyle = c.ink; g.textAlign = 'left'; g.textBaseline = 'top';
  g.font = '700 22px system-ui, sans-serif';
  g.fillText(`${S.song.name} · ${LEVELS[S.lv]} · ${S.mode === 'play' ? 'Play' : 'Record'}`, ix, R.y);
  g.font = '15px system-ui, sans-serif'; g.fillStyle = c.muted;
  const bar = Math.floor(b / (S.song.beatsPerBar || 4)) + 1, inBar = mod(Math.floor(b), S.song.beatsPerBar || 4) + 1;
  g.fillText(`Beat ${b.toFixed(2)}   (bar ${bar}, beat ${inBar})   ${(b * spb()).toFixed(2)} s   ${S.song.bpm} BPM`, ix, R.y + 32);
  let y = R.y + 64;
  g.fillStyle = c.ink; g.font = '600 18px system-ui, sans-serif';
  const lines = [];
  if (S.mode === 'play') {
    const j = S.judge;
    if (j) {
      const mean = j.offs.length ? j.offs.reduce((a, x) => a + x, 0) / j.offs.length : null;
      lines.push(`Score ${j.score}   Combo ${j.combo} (best ${j.best})`, `Perfect ${j.perfect}   Good ${j.good}   Miss ${j.miss}   Oops ${j.oops}`,
        mean == null ? 'Timing: -' : `Timing: ${Math.abs(mean).toFixed(0)} ms ${mean > 0 ? 'late' : 'early'} on average`);
    } else lines.push(P.playing ? '' : 'Press Enter or Start to play the range.', 'Hit A / B / X / Y (keys J K L I) as the notes reach the circle.');
  } else {
    const r = S.rec;
    lines.push(r ? `Recording beats ${r.a}-${r.b}: ${r.all} hit${r.all === 1 ? '' : 's'} (pass ${r.passes + 1})` : `Range beats ${S.range.a}-${S.range.b}: press Enter or Start to record.`,
      'Press A / B / X / Y (keys J K L I) in time with the music.', `Snap ${D.SNAPS.find((s) => s.div === snapDiv('snap')).label}; ${$('rec-mode').value === 'replace' ? 'replaces' : 'adds to'} the range's notes.`);
  }
  for (const t of lines) { g.fillText(t, ix, y); y += 28; }
}

function drawTimeline(L, b, c) {
  const R = L.tl, song = S.song, bpb = song.beatsPerBar || 4, sp = spb();
  g.save();
  g.fillStyle = c.panel; roundRect(R.x, R.y, R.w, R.h, 10); g.fill();
  g.strokeStyle = c.line; g.lineWidth = 1; g.stroke();
  g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.clip();
  const v0 = S.view.start, v1 = v0 + visBeats(L);
  const yR = R.y, yW = yR + L.ruler, yO = yW + L.wave, yL = L.laneTop;
  // sections band + breath shading
  const end = endBeat();
  for (let rep = 0; rep * (song.loop ? song.lengthBeats : Infinity) < v1 && rep < 64; rep++) {
    const off = song.loop ? rep * song.lengthBeats : 0;
    for (const s of song.sections || []) {
      const x0 = xOf(L, s.start + off), x1 = xOf(L, s.end + off);
      if (x1 < L.x0 || x0 > R.x + R.w) continue;
      g.fillStyle = s.kind === 'breath' ? '#9aa4b833' : '#7a3cff14';
      g.fillRect(Math.max(L.x0, x0), yW, x1 - Math.max(L.x0, x0), R.y + R.h - yW);
      g.fillStyle = s.kind === 'breath' ? '#8a93a8' : '#7a3cff';
      g.fillRect(Math.max(L.x0, x0), yR + L.ruler - 6, x1 - Math.max(L.x0, x0), 4);
      g.font = '11px system-ui, sans-serif'; g.textBaseline = 'top'; g.textAlign = 'left';
      if (x1 - x0 > 30) g.fillText(s.name + (s.kind === 'breath' ? ' (breath)' : ''), Math.max(L.x0, x0) + 3, yW + 2);
    }
    if (!song.loop) break;
  }
  // game warm-up (no notes before beat 4) and end
  g.fillStyle = '#00000014';
  g.fillRect(xOf(L, -10), yL, xOf(L, 4) - xOf(L, -10), 4 * L.laneH);
  g.fillRect(xOf(L, end), yW, Math.max(0, R.x + R.w - xOf(L, end)), R.y + R.h - yW);
  // range
  if (S.range.b > S.range.a) {
    const xa = xOf(L, S.range.a), xb = xOf(L, S.range.b);
    g.fillStyle = S.mode === 'record' ? '#e8423b18' : '#2f7dfa14'; g.fillRect(xa, yR, xb - xa, R.h);
    g.fillStyle = S.mode === 'record' ? '#e8423b' : '#2f7dfa';
    flag(xa, yR, 'A'); flag(xb, yR, 'B');
  }
  // grid
  const div = snapDiv(S.mode === 'record' ? 'snap' : 'snap-edit');
  const fine = div && S.view.ppb / div >= 7 ? div : 0;
  for (let k = Math.floor(v0); k <= v1; k++) {
    const x = xOf(L, k);
    if (x < L.x0) continue;
    const isBar = mod(k, bpb) === 0;
    g.strokeStyle = isBar ? c.ink : c.line; g.globalAlpha = isBar ? 0.45 : 1; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + 0.5, isBar ? yR + 12 : yR + 20); g.lineTo(x + 0.5, R.y + R.h); g.stroke(); g.globalAlpha = 1;
    if (isBar && S.view.ppb * bpb > 28) { g.fillStyle = c.ink; g.font = '600 11px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(String(k / bpb + 1), x + 3, yR + 2); }
    if (fine > 1) for (let s = 1; s < fine; s++) {
      const xs = xOf(L, k + s / fine); g.strokeStyle = c.line; g.globalAlpha = 0.5;
      g.beginPath(); g.moveTo(xs + 0.5, yL); g.lineTo(xs + 0.5, yL + 4 * L.laneH); g.stroke(); g.globalAlpha = 1;
    }
  }
  // waveform
  const env = envs.get(song.file);
  if (env) {
    g.fillStyle = '#7a3cff66';
    const mid = yW + L.wave / 2, amp = L.wave / 2 - 2;
    for (let x = Math.max(L.x0, R.x); x < R.x + R.w; x += 2) {
      const bt0 = beatOf(L, x), bt1 = beatOf(L, x + 2);
      if (bt1 < 0 || bt0 > end + 4) continue;
      const t0 = fileTime(song, Math.max(0, bt0)), t1 = t0 + (bt1 - bt0) * sp;
      let m = 0;
      for (let i = Math.floor(t0 * env.rate), e = Math.ceil(t1 * env.rate); i < e && i < env.peaks.length; i++) if (env.peaks[i] > m) m = env.peaks[i];
      g.fillRect(x, mid - m * amp, 2, Math.max(1, 2 * m * amp));
    }
  } else { g.fillStyle = c.muted; g.font = '12px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(ctx ? 'Loading the song...' : 'Click to turn the sound on (the waveform shows once the song loads)', L.x0 + 8, yW + L.wave / 2); }
  // onsets (what the game's charts are built from): low / high / melody
  const div12 = song.div || 12, span = song.lengthBeats;
  for (let rep = 0; rep < 64; rep++) {
    const off = song.loop ? rep * span : 0;
    if (off > v1) break;
    for (const o of song.onsets || []) {
      const beat = o[0] / div12 + off; if (beat < v0 || beat > v1) continue;
      const x = xOf(L, beat), h = L.ons - 2;
      g.fillStyle = '#6b3fa0'; g.fillRect(x, yO + h - h * o[1], 1.5, h * o[1]);
      g.fillStyle = '#e8423b'; g.fillRect(x + 1.5, yO + h - h * o[2], 1.5, h * o[2]);
      g.fillStyle = '#1b8f4f'; g.fillRect(x + 3, yO + h - h * o[3], 1.5, h * o[3]);
    }
    if (!song.loop) break;
  }
  // lanes
  for (let i = 0; i < 4; i++) {
    const y = yL + i * L.laneH;
    g.fillStyle = i % 2 ? '#00000008' : '#00000000'; g.fillRect(L.x0, y, R.w, L.laneH);
    g.strokeStyle = c.line; g.beginPath(); g.moveTo(R.x, y + 0.5); g.lineTo(R.x + R.w, y + 0.5); g.stroke();
  }
  // notes
  const chart = chartOf(), boss = plan().phases.boss, fold = $('fold').checked ? gameFold(song, S.lv, chart) : null;
  const size = noteSize(L);
  const drag = S.drag && S.drag.kind === 'move' && S.drag.moved ? S.drag : null;
  const lastPass = S.judge ? new Map(S.judge.notes.map((n) => [n.beat, n.judged])) : null;
  chart.forEach((n, i) => {
    if (n.beat < v0 - 1 || n.beat > v1 + 1) return;
    const sel = S.sel.some((x) => Math.abs(x - n.beat) < D.SAME);
    let beat = n.beat, btn = n.btn;
    if (drag && sel) { beat = n.beat + drag.dBeat; if (drag.row != null) btn = BTNS[drag.row]; }
    const y = yL + BTNS.indexOf(btn) * L.laneH + L.laneH / 2, x = xOf(L, beat);
    drawNoteGem(btn, x, y, size, { gold: n.beat >= boss, sel, selColor: c.ink, alpha: drag && sel ? 0.8 : 1 });
    if (fold && fold[i].btn !== n.btn) { g.fillStyle = c.muted; g.font = '600 10px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText('→' + fold[i].btn.toUpperCase(), x + size * 0.45, y - size * 0.3); }
    const j = lastPass && lastPass.get(n.beat);
    if (j === 'miss' || j === 'oops') { g.strokeStyle = '#c92a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 5, y + size * 0.55); g.lineTo(x + 5, y + size * 0.55); g.stroke(); }
  });
  if (S.rec) for (const h of S.rec.hits) {
    const y = yL + BTNS.indexOf(h.btn) * L.laneH + L.laneH / 2;
    drawNoteGem(h.btn, xOf(L, D.snapBeat(h.beat, S.rec.div)), y, size * 0.9, { hollow: true });
  }
  // box selection
  if (S.drag && S.drag.kind === 'box') {
    const d = S.drag; g.strokeStyle = '#7a3cff'; g.setLineDash([4, 3]); g.lineWidth = 1.5;
    g.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0)); g.setLineDash([]);
  }
  if (S.drag && S.drag.kind === 'ruler' && S.drag.moved) {
    const xa = xOf(L, S.drag.a), xb = xOf(L, S.drag.b); g.fillStyle = '#2f7dfa30'; g.fillRect(xa, yR, xb - xa, R.h);
  }
  // playhead
  const xp = xOf(L, b);
  g.strokeStyle = S.rec ? '#e8423b' : '#ff2d7a'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(xp, yR); g.lineTo(xp, R.y + R.h); g.stroke();
  g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(xp - 6, yR); g.lineTo(xp + 6, yR); g.lineTo(xp, yR + 9); g.fill();
  // gutter labels (drawn last, over the scrolled content)
  g.fillStyle = c.panel; g.fillRect(R.x, R.y, L.gut, R.h);
  g.strokeStyle = c.line; g.beginPath(); g.moveTo(L.x0 + 0.5, R.y); g.lineTo(L.x0 + 0.5, R.y + R.h); g.stroke();
  g.fillStyle = c.muted; g.font = '11px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('bar', R.x + 6, yR + 9); g.fillText('wave', R.x + 6, yW + L.wave / 2);
  g.fillText('onsets', R.x + 4, yO + L.ons / 2);
  for (let i = 0; i < 4; i++) drawNoteGem(BTNS[i], R.x + L.gut / 2, yL + i * L.laneH + L.laneH / 2, Math.min(24, L.laneH * 0.7));
  g.restore();
}
function flag(x, y, t) {
  g.fillRect(x - 1, y, 2, 26);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y + 6); g.lineTo(x, y + 12); g.fill();
  g.save(); g.fillStyle = '#fff'; g.font = '700 9px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, x + 2, y + 6); g.restore();
}
function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------------------------------------------------------------- pointer (timeline)
function hitNote(L, x, y) {
  const size = noteSize(L);
  let best = null, bd = Infinity;
  for (const n of chartOf()) {
    const nx = xOf(L, n.beat), ny = L.laneTop + BTNS.indexOf(n.btn) * L.laneH + L.laneH / 2;
    const d = Math.hypot(nx - x, ny - y);
    if (d < size * 0.6 + 3 && d < bd) { best = n; bd = d; }
  }
  return best;
}
const rowAt = (L, y) => clamp(Math.floor((y - L.laneTop) / L.laneH), 0, 3);
function where(L, x, y) {
  if (!L || x < L.tl.x || x > L.tl.x + L.tl.w || y < L.tl.y || y > L.tl.y + L.tl.h) return null;
  if (y < L.tl.y + L.ruler) return 'ruler';
  if (y >= L.laneTop && y < L.laneTop + 4 * L.laneH && x >= L.x0) return 'lanes';
  return x >= L.x0 ? 'wave' : null;
}
const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointerdown', (e) => {
  ensureAudio(); cv.focus();
  const L = S.layout, p = pos(e), w = where(L, p.x, p.y);
  if (!w) return;
  cv.setPointerCapture(e.pointerId);
  const beat = beatOf(L, p.x);
  if (w === 'ruler' || w === 'wave' || S.mode !== 'edit') { S.drag = { kind: 'ruler', x0: p.x, b0: Math.max(0, beat), a: 0, b: 0, moved: false }; return; }
  const n = hitNote(L, p.x, p.y);
  if (e.button === 2) { if (n) { setChart(D.removeNotes(chartOf(), [n.beat]), 'delete'); S.sel = S.sel.filter((b) => Math.abs(b - n.beat) >= D.SAME); refresh(); } return; }
  if (n) {
    const isSel = S.sel.some((b) => Math.abs(b - n.beat) < D.SAME);
    if (e.shiftKey) S.sel = isSel ? S.sel.filter((b) => Math.abs(b - n.beat) >= D.SAME) : [...S.sel, n.beat];
    else if (!isSel) S.sel = [n.beat];
    S.drag = { kind: 'move', x0: p.x, y0: p.y, origin: n.beat, row0: BTNS.indexOf(n.btn), dBeat: 0, row: null, moved: false };
    refresh(); return;
  }
  S.drag = { kind: 'box', x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: e.shiftKey, moved: false, beat, row: rowAt(L, p.y) };
});
cv.addEventListener('pointermove', (e) => {
  const L = S.layout, p = pos(e), d = S.drag;
  if (!d) {
    const w = where(L, p.x, p.y);
    cv.className = w === 'ruler' || (w && S.mode !== 'edit') ? 'seek' : w === 'lanes' ? (hitNote(L, p.x, p.y) ? 'move' : 'add') : '';
    return;
  }
  if (Math.abs(p.x - d.x0) > 4 || (d.y0 != null && Math.abs(p.y - d.y0) > 4)) d.moved = true;
  if (d.kind === 'ruler' && d.moved) { const bt = Math.max(0, beatOf(L, p.x)); d.a = Math.floor(Math.min(d.b0, bt)); d.b = Math.ceil(Math.max(d.b0, bt)); }
  if (d.kind === 'move' && d.moved) {
    d.dBeat = D.snapBeat(d.origin + beatOf(L, p.x) - beatOf(L, d.x0), snapDiv()) - d.origin;
    const row = rowAt(L, p.y); d.row = row !== d.row0 ? row : null;
  }
  if (d.kind === 'box') { d.x1 = p.x; d.y1 = p.y; }
});
cv.addEventListener('pointerup', (e) => {
  const L = S.layout, p = pos(e), d = S.drag;
  S.drag = null;
  if (!d) return;
  if (d.kind === 'ruler') {
    if (d.moved && d.b > d.a) { S.range = { a: d.a, b: d.b }; refresh(); return; }
    const bt = D.snapBeat(d.b0, snapDiv(S.mode === 'record' ? 'snap' : 'snap-edit') || 12);
    S.playhead = bt;
    if (P.playing && S.mode === 'edit') { stop(true); togglePlay(); }
    refresh(); return;
  }
  if (d.kind === 'move') {
    if (d.moved && (Math.abs(d.dBeat) > 1e-9 || d.row != null)) {
      const out = D.moveNotes(chartOf(), S.sel, d.dBeat, d.row != null ? BTNS[d.row] : null, 0);
      S.sel = S.sel.map((b) => Math.max(0, D.roundBeat(b + d.dBeat)));
      setChart(out, 'move');
    } else if (!d.moved && !e.shiftKey) { S.playhead = d.origin; refresh(); }
    return;
  }
  if (d.kind === 'box') {
    if (!d.moved) {
      const beat = D.snapBeat(d.beat, snapDiv());
      setChart(D.addNote(chartOf(), beat, BTNS[d.row]), 'add');
      S.sel = [beat];
      if (ctx) blip(BTNS[d.row]);
      refresh(); return;
    }
    const b0 = beatOf(L, Math.min(d.x0, d.x1)), b1 = beatOf(L, Math.max(d.x0, d.x1));
    const r0 = rowAt(L, Math.min(d.y0, d.y1)), r1 = rowAt(L, Math.max(d.y0, d.y1));
    const inBox = chartOf().filter((n) => n.beat >= b0 && n.beat <= b1 && BTNS.indexOf(n.btn) >= r0 && BTNS.indexOf(n.btn) <= r1).map((n) => n.beat);
    S.sel = d.add ? [...new Set([...S.sel, ...inBox])] : inBox;
    refresh();
  }
});
cv.addEventListener('dblclick', (e) => {
  if (S.mode !== 'edit') return;
  const L = S.layout, p = pos(e), n = hitNote(L, p.x, p.y);
  if (n) { setChart(D.removeNotes(chartOf(), [n.beat]), 'delete'); S.sel = []; refresh(); }
});
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const L = S.layout, p = pos(e);
  if (e.ctrlKey || e.metaKey) {
    const at = beatOf(L, p.x), z = Math.exp(-e.deltaY * 0.0015);
    S.view.ppb = clamp(S.view.ppb * z, 8, 240); S.view.start = at - (p.x - L.x0) / S.view.ppb;
    $('zoom').value = Math.round(S.view.ppb);
  } else S.view.start += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / S.view.ppb;
  S.view.start = clamp(S.view.start, -4, endBeat() + 4);
}, { passive: false });

// ---------------------------------------------------------------- files
function download() {
  const list = S.songs.filter(songChanged).map((song) => {
    const w = S.work[song.id], charts = {}, auto = [];
    for (let lv = 0; lv < 3; lv++) {
      if (!isChanged(song, lv)) continue;
      if (w.charts[lv]) charts[LEVEL_IDS[lv]] = w.charts[lv];
      else if (w.auto.includes(lv)) auto.push(LEVEL_IDS[lv]);
    }
    return { song, charts, auto };
  });
  if (!list.length) { toast('Nothing changed yet: record or edit a chart first'); return; }
  const data = D.makeEdits(list);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const blob = new Blob([JSON.stringify(data, null, 1) + '\n'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `rhythm-edits-${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`Downloaded ${list.length} song${list.length > 1 ? 's' : ''} (${list.map((x) => x.song.name).join(', ')})`);
}
async function loadFile(file) {
  const text = await file.text();
  const { songs, errors } = D.parseEdits(text);
  const msgs = [...errors];
  let n = 0;
  for (const e of songs) {
    const song = S.songs.find((s) => s.id === e.id);
    if (!song) { msgs.push(`${e.id}: not a song here`); continue; }
    if ((e.file && e.file !== song.file) || (e.bpm && e.bpm !== song.bpm)) msgs.push(`${e.id}: made for ${e.file} at ${e.bpm} BPM (now ${song.file}, ${song.bpm} BPM): check the timing`);
    const prevSong = S.song; S.song = song;
    history().push(snapshot(), 'load');
    const w = work();
    for (const [lvId, notes] of Object.entries(e.charts)) { const lv = LEVEL_IDS.indexOf(lvId); w.charts[lv] = notes; w.auto = w.auto.filter((x) => x !== lv); n++; }
    for (const lvId of e.auto) { const lv = LEVEL_IDS.indexOf(lvId); delete w.charts[lv]; if (!w.auto.includes(lv)) w.auto.push(lv); n++; }
    S.song = prevSong;
  }
  persist(); refresh();
  toast(`Loaded ${n} level chart${n === 1 ? '' : 's'} from ${file.name}${msgs.length ? ' - ' + msgs.join('; ') : ''}`, msgs.length ? 7000 : 3000);
}

// ---------------------------------------------------------------- DOM
let toastT = 0;
function toast(msg, ms = 3000) { const el = $('status'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }

const CONTROLS = {
  play: [['Enter / Start', 'play the range from the top (again: stop)'], ['J K L I / A B X Y', 'hit the notes (Space is A too)'], ['1 2 3 / LB RB', 'Easy, Normal, Hard'], ['Tab / Back', 'next mode'], ['[ ] / LT RT', 'range start / end at the playhead'], ['click the timeline', 'move the playhead; drag the ruler: set the range']],
  record: [['Enter / Start', 'record the range (again: stop)'], ['J K L I / A B X Y', 'record a hit (Space is A too)'], ['[ ] / LT RT', 'range start / end at the playhead'], ['← → / d-pad', 'move the playhead (Shift / up-down: a bar)'], ['1 2 3 / LB RB', 'Easy, Normal, Hard'], ['Tab / Back', 'next mode']],
  edit: [['click a lane', 'add a note (snapped)'], ['drag a note', 'move it; up/down changes its button'], ['right-click / double-click', 'delete a note'], ['Shift+click / Shift+drag', 'add to the selection / box select'], ['A B X Y keys', 'change the selected notes\' button'], ['J K L I / pad A B X Y', 'add, change or remove a note at the playhead'], ['← → / d-pad', 'move the playhead; pad up/down: previous/next note'], ['Space / Enter / Start', 'play from the playhead (hear the notes)'], ['↑ ↓  , .', 'move the selection a lane / a snap step'], ['Del  Ctrl+C  Ctrl+V', 'delete, copy, paste at the playhead'], ['wheel / Ctrl+wheel', 'scroll / zoom']],
};
function refresh() {
  if (!S.song) return;
  const song = S.song;
  // song list marks
  for (const o of $('song').options) { const s = S.songs.find((x) => x.id === o.value); if (s) o.textContent = `${songChanged(s) ? '● ' : ''}${s.name} (${s.style}) · ${s.bpm} BPM`; }
  $('song').value = song.id;
  [...$('levels').children].forEach((b, i) => { b.setAttribute('aria-pressed', String(i === S.lv)); b.querySelector('.lv-dot').hidden = !isChanged(song, i); });
  [...$('modes').children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
  for (const el of document.querySelectorAll('.mode-only')) el.hidden = el.dataset.for !== S.mode;
  $('play').textContent = P.playing ? 'Stop' : S.mode === 'record' ? '● Record' : 'Play';
  $('record').textContent = S.rec ? '■ Stop recording' : '● Record';
  $('undo').disabled = !history().canUndo; $('redo').disabled = !history().canRedo;
  // chart info
  const w = S.work[song.id], src = w && w.charts[S.lv] ? 'edited here' : w && w.auto.includes(S.lv) ? 'built from the onsets (reset here)' : handMade(song, S.lv) ? 'hand-made (in the game)' : 'built from the song\'s onsets (in the game)';
  $('chart-info').innerHTML = `<b>${esc(song.name)}</b> · ${esc(song.style)} · ${song.bpm} BPM${song.loop ? ' · loop' : ''} · ${song.lengthBeats} beats<br>${LEVELS[S.lv]}: ${src}${isChanged(song, S.lv) ? ' <span class="warn">(unsaved)</span>' : ''}`;
  const notes = chartOf(), st = chartStats(notes, song.bpm);
  const btns = BTNS.map((b) => `${b.toUpperCase()} ${notes.filter((n) => n.btn === b).length}`).join('  ');
  $('chart-stats').textContent = `${st.notes} notes · ${st.perMin}/min · at most ${st.maxPerBeat} in a beat, ${st.maxPer2s} in 2 s\nshortest gap ${st.minGap ?? '-'} beat · ${btns}`;
  // range inputs
  if (document.activeElement !== $('range-a')) $('range-a').value = S.range.a;
  if (document.activeElement !== $('range-b')) $('range-b').value = S.range.b;
  // play stats
  $('play-stats').textContent = S.judge ? summary() + (S.judge.offs.length ? `\nmean timing ${(S.judge.offs.reduce((a, x) => a + x, 0) / S.judge.offs.length).toFixed(0)} ms (+ = late)` : '') : '';
  $('rec-stats').textContent = S.rec ? `Recording: ${S.rec.all} hits` : '';
  // selection
  const sel = notes.filter((n) => S.sel.some((b) => Math.abs(n.beat - b) < D.SAME));
  $('sel-info').textContent = sel.length ? `${sel.length} selected: ${sel.slice(0, 6).map((n) => `${n.btn.toUpperCase()} @ ${n.beat}`).join(', ')}${sel.length > 6 ? ' ...' : ''}` : 'No notes selected (click one, or Shift+drag a box).';
  for (const b of $('sel-btns').children) b.disabled = !sel.length;
  $('del').disabled = !sel.length; $('copy-sel').disabled = !sel.length;
  for (const b of document.querySelectorAll('[data-copyto]')) b.disabled = !sel.length || +b.dataset.copyto === S.lv;
  for (const b of document.querySelectorAll('[data-copyall]')) b.disabled = +b.dataset.copyall === S.lv;
  // changed list
  const ch = [];
  for (const s of S.songs) for (let lv = 0; lv < 3; lv++) if (isChanged(s, lv)) ch.push(`<li>● ${esc(s.name)}: ${LEVELS[lv]} (${S.work[s.id].charts[lv] ? S.work[s.id].charts[lv].length + ' notes' : 'back to the onsets'})</li>`);
  $('changed').innerHTML = ch.join('') || '<li class="muted">Nothing changed yet.</li>';
  $('changed-count').textContent = ch.length; $('changed-count').classList.toggle('dirty', ch.length > 0);
  $('controls').innerHTML = '<div class="keys">' + CONTROLS[S.mode].map(([k, v]) => `<div><kbd>${esc(k)}</kbd></div><div>${esc(v)}</div>`).join('') + '</div>' +
    '<p class="small muted">Gamepad: A B X Y hits, Start play, Back mode, LB RB level, LT RT range, d-pad playhead. Keys: J K L I like the game.</p>';
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function wire() {
  for (const id of ['snap', 'snap-edit']) {
    const el = $(id);
    for (const s of D.SNAPS) el.add(new Option(s.label, s.id));
    el.value = prefs[id] || '2';
    el.addEventListener('change', () => { prefs[id] = el.value; savePrefs(); refresh(); });
  }
  $('song').addEventListener('change', () => selectSong($('song').value));
  $('levels').addEventListener('click', (e) => { const b = e.target.closest('[data-lv]'); if (b) setLevel(+b.dataset.lv); });
  $('modes').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
  $('play').addEventListener('click', () => togglePlay());
  $('record').addEventListener('click', () => { if (S.mode !== 'record') setMode('record'); togglePlay(); });
  $('rewind').addEventListener('click', () => { if (P.playing) stop(); S.playhead = S.range.a; follow(true); refresh(); });
  $('undo').addEventListener('click', () => undo(false));
  $('redo').addEventListener('click', () => undo(true));
  $('download').addEventListener('click', download);
  $('load').addEventListener('click', () => $('load-file').click());
  $('load-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) loadFile(f); e.target.value = ''; });
  $('help').addEventListener('click', () => { $('help-dlg').hidden = false; });
  $('help-close').addEventListener('click', () => { $('help-dlg').hidden = true; });
  $('unlock').addEventListener('click', () => ensureAudio());
  $('reset-auto').addEventListener('click', resetLevel);
  $('range-a').addEventListener('change', () => setRange('a', +$('range-a').value));
  $('range-b').addEventListener('change', () => setRange('b', +$('range-b').value));
  $('set-a').addEventListener('click', () => setRange('a', Math.floor(S.playhead)));
  $('set-b').addEventListener('click', () => setRange('b', Math.ceil(S.playhead)));
  $('range-all').addEventListener('click', () => { S.range = { a: 0, b: endBeat() }; refresh(); });
  $('zoom').addEventListener('input', () => { const L = S.layout, mid = S.view.start + visBeats(L) / 2; S.view.ppb = +$('zoom').value; S.view.start = mid - visBeats(L) / 2; });
  $('sel-btns').addEventListener('click', (e) => { const b = e.target.closest('[data-btn]'); if (b) setButtons(b.dataset.btn); });
  $('del').addEventListener('click', deleteSel);
  $('copy-sel').addEventListener('click', copySel);
  $('paste').addEventListener('click', paste);
  for (const b of document.querySelectorAll('[data-copyto]')) b.addEventListener('click', () => copyTo(+b.dataset.copyto, false));
  for (const b of document.querySelectorAll('[data-copyall]')) b.addEventListener('click', () => copyTo(+b.dataset.copyall, true));
  for (const id of ['fold', 'loop', 'metro', 'notesnd', 'preroll', 'rec-guide']) {
    const el = $(id);
    if (prefs[id] != null) el.checked = !!prefs[id];
    el.addEventListener('change', () => { prefs[id] = el.checked; savePrefs(); refresh(); });
  }
  if (prefs.offset != null) $('offset').value = prefs.offset;
  $('offset').addEventListener('change', () => { prefs.offset = +$('offset').value || 0; savePrefs(); });
  if (prefs.recMode) $('rec-mode').value = prefs.recMode;
  $('rec-mode').addEventListener('change', () => { prefs.recMode = $('rec-mode').value; savePrefs(); refresh(); });
  window.addEventListener('pointerdown', () => ensureAudio(), { capture: true });
  // Buttons and checkboxes give focus back, so Space / Enter stay game keys (not a second click).
  document.addEventListener('click', (e) => { const el = e.target.closest('button, input[type=checkbox]'); if (el) el.blur(); });
  window.addEventListener('beforeunload', () => persist());
}

function selectSong(id) {
  if (P.playing) { if (S.rec) finishRecording(); stop(); }
  S.song = S.songs.find((s) => s.id === id) || S.songs[0];
  prefs.song = S.song.id; savePrefs();
  S.sel = []; S.judge = null; S.playhead = 0;
  S.range = { a: 0, b: endBeat() };
  S.view.start = -2;
  loadSong(S.song);
  refresh();
}

function frame() {
  pollPads();
  if (ctx && S.song) {
    tickAudio();
    if (P.playing) {
      const b = nowBeat();
      if (S.mode === 'play') judgeMisses(b);
      if (!S.drag) follow();
    }
  }
  for (const k of BTNS) S.flash[k] = Math.max(0, S.flash[k] - 0.08);
  draw();
  requestAnimationFrame(frame);
}

async function boot() {
  wire();
  let idx;
  try { idx = await (await fetch('assets/audio/music/rhythm/index.json', { cache: 'no-cache' })).json(); } catch (e) { toast('Could not load the rhythm songs: ' + e.message, 10000); return; }
  S.songs = (idx.songs || []).filter((s) => Array.isArray(s.onsets) && s.bpm > 0).map((s) => ({ ...s, start: s.start ?? s.loopStart ?? 0, beatsPerBar: s.beatsPerBar || 4, sections: s.sections || [] }));
  for (const s of S.songs) $('song').add(new Option(s.name, s.id));
  const restored = restoreStored();
  const q = new URLSearchParams(location.search);
  S.lv = clamp(+(q.get('level') ?? prefs.lv ?? 0) || 0, 0, 2);
  S.mode = MODES.includes(q.get('mode')) ? q.get('mode') : MODES.includes(prefs.mode) ? prefs.mode : 'play';
  selectSong(q.get('song') || prefs.song || S.songs[0].id);
  if (restored) toast(`Restored unsaved edits for ${restored} song${restored > 1 ? 's' : ''} from this browser`, 5000);
  requestAnimationFrame(frame);
}
// Test hook (Playwright): read state without poking at the canvas.
window.rhythmEditor = { S, P, chartOf: () => chartOf(), press, togglePlay, setMode, setLevel, nowBeat: () => nowBeat() };
boot();
