// The Rhythm Editor's data (workbench/rhythm-data.js), hand-made charts in the
// game (src/games/rhythm/chart.js), tools/apply-rhythm-edits.mjs, and that every
// rhythm-game song's charts stay playable at each level.
//   node --test party/tools/rhythm-editor.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D from '../workbench/rhythm-data.js';
import { buildChart, autoChart, levelPlan, gameFold, chartStats } from '../src/games/rhythm/chart.js';

const party = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexFile = path.join(party, 'assets/audio/music/rhythm/index.json');
const index = JSON.parse(readFileSync(indexFile, 'utf8'));
const n = (beat, btn) => ({ beat, btn });

test('snapping', () => {
  assert.equal(D.snapBeat(4.26, 4), 4.25);
  assert.equal(D.snapBeat(4.26, 2), 4.5);
  assert.equal(D.snapBeat(4.26, 1), 4);
  assert.equal(D.snapBeat(4.3, 3), 4.3333);
  assert.equal(D.snapBeat(4.26123, 0), 4.2612);
});

test('charts: one note per moment, sorted, valid only', () => {
  const c = D.normalize([n(8, 'a'), [4, 'b'], n(8.001, 'x'), n(-1, 'a'), n(6, 'z'), [5, 'y']]);
  assert.deepEqual(c, [n(4, 'b'), n(5, 'y'), n(8.001, 'x')]);
  assert.deepEqual(D.toPairs(c), [[4, 'b'], [5, 'y'], [8.001, 'x']]);
  assert.ok(D.sameChart(D.fromPairs([[5, 'y'], [4, 'b']]), [n(4, 'b'), n(5, 'y')]));
});

test('edit operations', () => {
  let c = [n(4, 'a'), n(5, 'b')];
  c = D.toggleNote(c, 6, 'x'); assert.deepEqual(c.map((x) => x.beat), [4, 5, 6]);
  c = D.toggleNote(c, 6, 'y'); assert.equal(c[2].btn, 'y');           // other button: change
  c = D.toggleNote(c, 6, 'y'); assert.deepEqual(c.map((x) => x.beat), [4, 5]);   // same: remove
  c = D.moveNotes(c, [4, 5], 0.5, null, 2);
  assert.deepEqual(c, [n(4.5, 'a'), n(5.5, 'b')]);
  c = D.moveNotes(c, [5.5], -1, 'x');                                  // lands on 4.5: replaces it
  assert.deepEqual(c, [n(4.5, 'x')]);
  assert.deepEqual(D.removeNotes([n(1, 'a'), n(2, 'b')], [2]), [n(1, 'a')]);
  assert.deepEqual(D.moveNotes([n(0.5, 'a')], [0.5], -2), [n(0, 'a')]);  // never below 0
});

test('recording merges into a range (replace / merge, snapped)', () => {
  const chart = [n(4, 'a'), n(8, 'b'), n(9, 'a'), n(12, 'y')];
  const hits = [n(8.06, 'x'), n(8.47, 'b'), n(9.9, 'y'), n(3.9, 'a'), n(11.2, 'b')];   // 3.9 / 11.2 lie outside 8..11
  const rep = D.mergeRecording(chart, hits, { from: 8, to: 11, mode: 'replace', div: 2 });
  assert.deepEqual(rep, [n(4, 'a'), n(8, 'x'), n(8.5, 'b'), n(10, 'y'), n(12, 'y')]);
  const mer = D.mergeRecording(chart, hits, { from: 8, to: 11, mode: 'merge', div: 2 });
  assert.deepEqual(mer, [n(4, 'a'), n(8, 'x'), n(8.5, 'b'), n(9, 'a'), n(10, 'y'), n(12, 'y')]);
  const off = D.mergeRecording([], [n(8.06, 'a')], { from: 8, to: 9, div: 0 });
  assert.deepEqual(off, [n(8.06, 'a')]);
  // two presses snapped onto one moment: the later one wins
  assert.deepEqual(D.mergeRecording([], [n(8.1, 'a'), n(7.9, 'b')], { from: 7, to: 9, div: 1 }), [n(8, 'b')]);
});

test('undo / redo', () => {
  const h = new D.History();
  let st = { charts: { 0: [[4, 'a']] } };
  h.push(st); st = { charts: { 0: [[4, 'a'], [5, 'b']] } };
  h.push(st); st = { charts: {} };
  st = h.undo(st); assert.deepEqual(st, { charts: { 0: [[4, 'a'], [5, 'b']] } });
  st = h.undo(st); assert.deepEqual(st, { charts: { 0: [[4, 'a']] } });
  assert.equal(h.undo(st), null);
  st = h.redo(st); assert.deepEqual(st, { charts: { 0: [[4, 'a'], [5, 'b']] } });
  h.push(st); assert.equal(h.canRedo, false);
});

test('edits file: make -> parse round trip, and bad input', () => {
  const song = { id: 'rh-party', name: 'Party Dance', file: 'music/rhythm/rh-party.mp3', bpm: 121, start: 0.2 };
  const data = D.makeEdits([{ song, charts: { normal: [n(5, 'b'), n(4, 'a')] }, auto: ['hard'] }, { song: { ...song, id: 'x' }, charts: {}, auto: [] }], new Date('2026-10-30T12:00:00Z'));
  assert.equal(data.format, D.FORMAT); assert.equal(data.version, 1); assert.equal(data.exported, '2026-10-30T12:00:00.000Z');
  assert.equal(data.songs.length, 1);                                  // the unchanged song is left out
  assert.deepEqual(data.songs[0].charts, { normal: [[4, 'a'], [5, 'b']] });
  assert.deepEqual(data.songs[0].auto, ['hard']);
  const back = D.parseEdits(JSON.stringify(data));
  assert.deepEqual(back.errors, []);
  assert.deepEqual(back.songs[0].charts.normal, [n(4, 'a'), n(5, 'b')]);
  assert.deepEqual(back.songs[0].auto, ['hard']);
  assert.match(D.parseEdits('{oops').errors[0], /not JSON/);
  assert.match(D.parseEdits({ version: 9 }).errors[0], /version/);
  const bad = D.parseEdits({ version: 1, songs: [{ id: 'a', charts: { easy: [[1, 'q'], [2, 'a']], extreme: [] } }] });
  assert.equal(bad.songs[0].charts.easy.length, 1);
  assert.equal(bad.errors.length, 2);
});

test('applyEdits: set, back to auto, and songs whose audio changed', () => {
  const idx = { version: 2, songs: [{ id: 's', file: 'f.mp3', bpm: 120, start: 0.2, charts: { hard: [[4, 'y']] } }, { id: 't', file: 'g.mp3', bpm: 100, start: 0.2 }] };
  const ed = D.parseEdits({ version: 1, songs: [
    { id: 's', file: 'f.mp3', bpm: 120, start: 0.2, charts: { easy: [[4, 'a'], [6, 'b']] }, auto: ['hard'] },
    { id: 't', file: 'other.mp3', bpm: 100, start: 0.2, charts: { easy: [[4, 'a']] } },
    { id: 'nope', charts: { easy: [[4, 'a']] } },
  ] });
  const { index: out, report, warnings } = D.applyEdits(idx, ed);
  assert.deepEqual(out.songs[0].charts, { easy: [[4, 'a'], [6, 'b']] });
  assert.equal(out.songs[1].charts, undefined);                        // skipped: other audio
  assert.equal(idx.songs[0].charts.hard.length, 1);                    // input untouched
  assert.deepEqual(report.map((r) => `${r.id}/${r.level}/${r.action}`), ['s/easy/set', 's/hard/auto']);
  assert.equal(warnings.length, 2);
  const forced = D.applyEdits(idx, ed, { force: true });
  assert.deepEqual(forced.index.songs[1].charts, { easy: [[4, 'a']] });
});

test('the game plays a hand-made chart as written (gold from the plan), else builds from onsets', () => {
  const song = index.songs.find((s) => s.id === 'rh-party');
  const plan = levelPlan(song, 1);
  const auto = buildChart(song, 1, plan);
  assert.ok(auto.length > 50);
  const own = { ...song, charts: { normal: [[150, 'x'], [8, 'a'], [9.5, 'q'], [8.5, 'b']] } };
  const c = buildChart(own, 1, plan);
  assert.deepEqual(c.map((x) => [x.beat, x.btn]), [[8, 'a'], [8.5, 'b'], [150, 'x']]);
  assert.deepEqual(c.map((x) => x.gold), [false, false, 150 >= plan.phases.boss]);
  assert.deepEqual(autoChart(own, 1, plan), auto);                      // other levels / auto unchanged
  assert.deepEqual(buildChart(own, 0, levelPlan(song, 0)), buildChart(song, 0, levelPlan(song, 0)));
  // Easy folds X/Y onto A/B in the game
  assert.deepEqual(gameFold(song, 0, [{ beat: 8, btn: 'x' }, { beat: 9, btn: 'y' }]).map((x) => x.btn), ['a', 'b']);
});

test('every rhythm song: charts are playable at each level', () => {
  const LIMITS = [
    { perMin: 65, maxPerBeat: 1, minGapMs: 600 },     // Easy: sparse, on the beat
    { perMin: 110, maxPerBeat: 2, minGapMs: 240 },    // Normal: moderate, 8ths at most
    { perMin: 170, maxPerBeat: 3, minGapMs: 155 },    // Hard: denser, no 16th pairs above 100 BPM
  ];
  const ids = index.songs.map((s) => s.id);
  assert.ok(ids.includes('dance') && ids.includes('rh-party'));
  assert.equal(index.songs.find((s) => s.id === 'dance').file, 'music/takes/dance-6.mp3');
  for (const song of index.songs) {
    for (let lv = 0; lv < 3; lv++) {
      const notes = gameFold(song, lv, buildChart(song, lv, levelPlan(song, lv)));
      const st = chartStats(notes, song.bpm), L = LIMITS[lv], where = `${song.id} level ${lv}`;
      assert.ok(st.notes >= 40, `${where}: only ${st.notes} notes`);
      assert.ok(st.perMin <= L.perMin, `${where}: ${st.perMin} notes/min`);
      assert.ok(st.maxPerBeat <= L.maxPerBeat, `${where}: ${st.maxPerBeat} in a beat`);
      assert.ok(st.minGap * 60000 / song.bpm >= L.minGapMs - 1, `${where}: gap ${st.minGap} beat`);
      if (lv === 0) assert.ok(notes.every((x) => Math.abs(x.beat - Math.round(x.beat)) < 1e-6), `${where}: off-beat Easy note`);
      if (lv === 0) assert.ok(notes.every((x) => x.btn === 'a' || x.btn === 'b'), `${where}: Easy uses A/B only`);
    }
  }
});

test('apply-rhythm-edits.mjs on a copy of party/', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'rhythm-apply-'));
  try {
    const rdir = path.join(dir, 'assets/audio/music/rhythm');
    mkdirSync(rdir, { recursive: true });
    const before = readFileSync(indexFile, 'utf8');
    writeFileSync(path.join(rdir, 'index.json'), before);
    const song = index.songs.find((s) => s.id === 'rh-party');
    const edits = { format: D.FORMAT, version: 1, songs: [{ id: song.id, file: song.file, bpm: song.bpm, start: song.start, charts: { easy: [[4, 'a'], [6, 'b'], [8, 'a']] } }] };
    const ef = path.join(dir, 'edits.json');
    writeFileSync(ef, JSON.stringify(edits));
    const tool = path.join(party, 'tools/apply-rhythm-edits.mjs');
    const dry = spawnSync(process.execPath, [tool, ef, '--root', dir, '--dry-run'], { encoding: 'utf8' });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /rh-party easy: 3 notes/);
    assert.equal(readFileSync(path.join(rdir, 'index.json'), 'utf8'), before);
    const r = spawnSync(process.execPath, [tool, ef, '--root', dir], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const after = readFileSync(path.join(rdir, 'index.json'), 'utf8');
    const out = JSON.parse(after);
    assert.deepEqual(out.songs.find((s) => s.id === 'rh-party').charts, { easy: [[4, 'a'], [6, 'b'], [8, 'a']] });
    // only the charts changed: the rest of the file is byte-identical
    const strip = (t) => { const j = JSON.parse(t); for (const s of j.songs) delete s.charts; return JSON.stringify(j); };
    assert.equal(strip(after), strip(before));
    assert.ok(after.endsWith('\n') && !after.includes(': '), 'compact, as the music tools write it');
    // back to the onsets
    writeFileSync(ef, JSON.stringify({ version: 1, songs: [{ id: song.id, file: song.file, bpm: song.bpm, start: song.start, auto: ['easy'] }] }));
    const r2 = spawnSync(process.execPath, [tool, ef, '--root', dir], { encoding: 'utf8' });
    assert.equal(r2.status, 0, r2.stderr);
    assert.equal(readFileSync(path.join(rdir, 'index.json'), 'utf8'), before);
    // edits made against other audio are skipped
    writeFileSync(ef, JSON.stringify({ version: 1, songs: [{ id: song.id, file: 'music/rhythm/old.mp3', charts: { easy: [[4, 'a']] } }] }));
    const r3 = spawnSync(process.execPath, [tool, ef, '--root', dir], { encoding: 'utf8' });
    assert.equal(r3.status, 1);
    assert.match(r3.stderr, /changed since this edit/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
