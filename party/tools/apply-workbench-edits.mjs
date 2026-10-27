// Apply a sprite workbench edits file (party/workbench/, README.md there) to
// the game data:
//   landmarks -> assets/sprites/<set>/sprites.json (the frame entries)
//   items     -> src/data/outfit-fit.js (per-sprite outfit fit adjustments)
// then print a summary, run tools/sprites/validate.py and, when the fit table
// changed, tools/stamp-modules.mjs.
//
//   node party/tools/apply-workbench-edits.mjs edits.json [--dry-run] [--force]
//        [--root <party dir>] [--rebuild-masks] [--no-validate] [--no-stamp]
//
// --root      apply to another copy of party/ (e.g. a scratch copy to try it)
// --dry-run   check and report only; write nothing
// --force     apply landmark edits even where sprites.json no longer holds the
//             edit's `from` value (someone changed it since); they are skipped otherwise
// --rebuild-masks  re-run tools/sprites/make_masks.py for edited sets that have
//             colour-variant masks (they are derived from landmarks)
//
// sprites.json files are written by Python (json.dumps(indent=2)), exactly as
// the sprite tools write them, so diffs only show the changed points. Landmark
// edits never touch pixels, so an optimized copy (assets/sprites-opt) that was
// current before keeps current: its source fingerprint is refreshed.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => args.includes('--' + name);
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--root');
if (!file || flag('help')) {
  console.log('usage: node party/tools/apply-workbench-edits.mjs edits.json [--dry-run] [--force] [--root <party dir>] [--rebuild-masks] [--no-validate] [--no-stamp]');
  process.exit(file ? 0 : 2);
}
const root = path.resolve(opt('root') || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const dry = flag('dry-run'), force = flag('force');
const BODY_MAP = ['belly', 'tail', 'earFront', 'earBack', 'footFront', 'footBack'];   // tools/sprites/bodymap.py
const POINTS = ['anchor', 'head', 'eyes', 'neck', 'back', 'hand', ...BODY_MAP];
const SLOTS = ['head', 'face', 'neck', 'back', 'hand', 'aura'];
const MASK_SETS = ['felicity', 'kpop-girl-center', 'princess-amber'];   // tools/sprites/make_masks.py
const spritesDir = path.join(root, 'assets', 'sprites');
const fitFile = path.join(root, 'src', 'data', 'outfit-fit.js');
const toolsDir = path.join(root, 'tools', 'sprites');

const notes = [], warnings = [], errors = [];
const samePt = (a, b) => (a == null && b == null) || (Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1]);
const isPt = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const fmtPt = (p) => (p ? `[${p[0]}, ${p[1]}]` : 'none');
const py = (code, ...argv) => {
  const r = spawnSync('python3', ['-c', code, ...argv], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`python failed: ${r.stderr || r.stdout}`);
  return r.stdout;
};

// --- read and check the file -------------------------------------------------
let data;
try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(2); }
if (data.version !== 1) { console.error(`Unsupported edits version ${data.version} (this tool reads version 1)`); process.exit(2); }
if (data.format && data.format !== 'charlie-party-workbench-edits') warnings.push(`unexpected format "${data.format}"`);
const landmarks = Array.isArray(data.landmarks) ? data.landmarks : [];
const items = Array.isArray(data.items) ? data.items : [];

const manifests = new Map();
function manifest(set) {
  if (!manifests.has(set)) {
    const p = path.join(spritesDir, set, 'sprites.json');
    manifests.set(set, existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
  }
  return manifests.get(set);
}
const frameObj = (raw) => (typeof raw === 'string' ? { src: raw } : Array.isArray(raw) ? { rect: raw } : raw || {});
/** The frame an edit means: by index, or by its src when frames moved since. */
function locate(where, set, pose, frame, src) {
  const m = manifest(set);
  if (!m) { errors.push(`${where}: no sprite set "${set}"`); return null; }
  const def = m.poses?.[pose];
  if (!def) { errors.push(`${where}: ${set} has no pose "${pose}"`); return null; }
  if (typeof def === 'string' || def.alias) { errors.push(`${where}: ${set} pose "${pose}" is an alias; edit its target pose`); return null; }
  const frames = def.frames || [];
  let index = frame;
  if (src && frameObj(frames[index]).src !== src) {
    const found = frames.findIndex((f) => frameObj(f).src === src);
    if (found < 0) { errors.push(`${where}: ${set} ${pose} has no frame ${src}`); return null; }
    warnings.push(`${where}: ${set} ${pose} frame ${src} moved from #${frame} to #${found}; using #${found}`);
    index = found;
  }
  if (!frames[index]) { errors.push(`${where}: ${set} ${pose} has no frame #${index}`); return null; }
  return { m, def, index, fo: frameObj(frames[index]) };
}

// --- landmarks -----------------------------------------------------------------
const lmBySet = new Map();   // set -> [{ pose, index, point, to }]
const bmBySet = new Map();   // set -> [{ src, artHash, point, to }] (body-map overrides)
let lmApplied = 0, lmSkipped = 0;
landmarks.forEach((e, i) => {
  const where = `landmarks[${i}]`;
  if (!e || typeof e.set !== 'string' || typeof e.pose !== 'string' || !Number.isInteger(e.frame) || !POINTS.includes(e.point) || !isPt(e.to)) {
    errors.push(`${where}: invalid entry ${JSON.stringify(e)}`); lmSkipped++; return;
  }
  const at = locate(where, e.set, e.pose, e.frame, e.src);
  if (!at) { lmSkipped++; return; }
  const cur = at.fo[e.point] || at.def[e.point] || (e.point === 'anchor' ? at.m.anchor : null);
  const to = [Math.round(e.to[0]), Math.round(e.to[1])];
  const label = `${e.set} ${e.pose} #${at.index} ${e.point}`;
  if (samePt(cur, to)) { notes.push(`${label}: already ${fmtPt(to)}`); return; }
  if (e.from !== undefined && !samePt(cur, e.from)) {
    if (!force) { warnings.push(`${label}: sprites.json has ${fmtPt(cur)}, the edit was made from ${fmtPt(e.from)}; skipped (--force applies it)`); lmSkipped++; return; }
    warnings.push(`${label}: sprites.json has ${fmtPt(cur)}, the edit was made from ${fmtPt(e.from)}; applied anyway (--force)`);
  }
  if (BODY_MAP.includes(e.point)) {
    // measured parts: the edit becomes a reviewed override of the body-map tool
    if (!bmBySet.has(e.set)) bmBySet.set(e.set, []);
    bmBySet.get(e.set).push({ src: at.fo.src, artHash: at.fo.artHash || null, point: e.point, to });
  } else {
    if (!lmBySet.has(e.set)) lmBySet.set(e.set, []);
    lmBySet.get(e.set).push({ pose: e.pose, index: at.index, point: e.point, to });
  }
  notes.push(`${label}: ${fmtPt(cur)} -> ${fmtPt(to)}`);
  lmApplied++;
});

const WRITE_LANDMARKS = `
import json, sys
path, edits = sys.argv[1], json.loads(sys.argv[2])
m = json.load(open(path))
for e in edits:
    frames = m['poses'][e['pose']]['frames']
    fo = frames[e['index']]
    if isinstance(fo, str): fo = {'src': fo}
    elif isinstance(fo, list): fo = {'rect': fo}
    fo[e['point']] = e['to']
    frames[e['index']] = fo
open(path, 'w').write(json.dumps(m, indent=2) + '\\n')
`;
const FINGERPRINTS = `
import json, sys
sys.path.insert(0, sys.argv[1])
import optimize
print(json.dumps({a: optimize.fingerprint(a) for a in sys.argv[2:]}))
`;
const optIndexPath = path.join(root, 'assets', 'sprites-opt', 'index.json');
const editedSets = [...new Set([...lmBySet.keys(), ...bmBySet.keys()])];
const maskSets = [...lmBySet.keys()].filter((s) => MASK_SETS.includes(s));   // masks read the landmarks, not the body map
if (!dry && editedSets.length) {
  // which optimized copies are current before the edit (pixels don't change, so they stay current)
  let before = {}, opt = null;
  try { before = JSON.parse(py(FINGERPRINTS, toolsDir, ...editedSets)); opt = existsSync(optIndexPath) ? JSON.parse(readFileSync(optIndexPath, 'utf8')) : null; } catch (e) { warnings.push(`fingerprint check skipped: ${e.message}`); }
  for (const [set, edits] of lmBySet) py(WRITE_LANDMARKS, path.join(spritesDir, set, 'sprites.json'), JSON.stringify(edits));
  if (bmBySet.size) {
    // body-map edits: into tools/sprites/bodymap-overrides.json, then re-measure those sets
    const ovPath = path.join(toolsDir, 'bodymap-overrides.json');
    const ov = existsSync(ovPath) ? JSON.parse(readFileSync(ovPath, 'utf8')) : {};
    for (const [set, edits] of bmBySet) {
      const so = ov[set] || (ov[set] = {});
      for (const e of edits) {
        const fo = so[e.src] || (so[e.src] = {});
        if (e.artHash) fo.artHash = e.artHash;
        fo[e.point] = e.to;
      }
    }
    writeFileSync(ovPath, JSON.stringify(ov, null, 1) + '\n');
  }
  // re-measure every edited set: landmark edits move the body map too (it is measured from them)
  const r = spawnSync('python3', [path.join(toolsDir, 'bodymap.py'), '--no-fingerprint', ...editedSets], { encoding: 'utf8' });
  if (r.status !== 0) errors.push(`bodymap.py failed: ${r.stderr || r.stdout}`);
  if (opt && Object.keys(before).length) {
    const after = JSON.parse(py(FINGERPRINTS, toolsDir, ...editedSets));
    let refreshed = 0, text = readFileSync(optIndexPath, 'utf8');
    for (const set of editedSets) {
      const info = opt.sets?.[set];
      // swap just the fingerprint string, keeping the file's own formatting
      if (info && info.source === before[set] && text.split(`"${before[set]}"`).length === 2) { text = text.replace(`"${before[set]}"`, `"${after[set]}"`); refreshed++; }
      else if (info) warnings.push(`${set}: optimized copy was already stale; run python3 party/tools/sprites/optimize.py ${set}`);
    }
    if (refreshed) writeFileSync(optIndexPath, text);
    // body-map-only edits leave colour masks current: refresh their fingerprint too
    for (const set of editedSets.filter((x) => MASK_SETS.includes(x) && !lmBySet.has(x))) {
      const mi = path.join(spritesDir, set, 'masks', 'index.json');
      if (existsSync(mi)) { const t = readFileSync(mi, 'utf8'); if (t.includes(`"${before[set]}"`)) writeFileSync(mi, t.replace(`"${before[set]}"`, `"${after[set]}"`)); }
    }
    if (refreshed) notes.push(`refreshed the optimized-copy fingerprint of ${refreshed} set(s) (landmarks only, pixels unchanged)`);
  }
  if (maskSets.length) {
    if (flag('rebuild-masks')) {
      for (const set of maskSets) {
        const r = spawnSync('python3', [path.join(toolsDir, 'make_masks.py'), set], { encoding: 'utf8', stdio: 'inherit' });
        if (r.status !== 0) errors.push(`make_masks.py ${set} failed`);
      }
    } else warnings.push(`colour-variant masks are built from landmarks: run python3 party/tools/sprites/make_masks.py ${maskSets.join(' ')} (or pass --rebuild-masks)`);
  }
}

// --- items -----------------------------------------------------------------------
const MARK = 'export const OUTFIT_FIT =';
const fitText = readFileSync(fitFile, 'utf8');
const at = fitText.indexOf(MARK);
if (at < 0) { console.error(`${fitFile}: "${MARK}" not found`); process.exit(2); }
const body = fitText.slice(at + MARK.length).trim().replace(/;\s*$/, '');
let table;
try { table = JSON.parse(body); } catch (e) { console.error(`${fitFile}: the OUTFIT_FIT array is not valid JSON (${e.message})`); process.exit(2); }

// known item ids: slugs of the item names in outfits.js (best effort, for warnings only)
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let itemIds = null;
try { itemIds = new Set([...readFileSync(path.join(root, 'src', 'engine', 'outfits.js'), 'utf8').matchAll(/\bname: '([^']+)'/g)].map((m) => slug(m[1]))); } catch (e) { /* no check */ }

const key = (e) => `${e.set}|${e.pose}|${e.frame}|${e.slot}|${e.item}`;
const level = (e) => (e.pose === '*' ? 0 : e.frame === '*' ? 2 : 4) + (e.item === '*' ? 0 : 1);
const isIdentity = (e) => !e.dx && !e.dy && !e.rot && (e.scale ?? 1) === 1;
const fit = new Map(table.map((e) => [key(e), e]));
let itAdded = 0, itChanged = 0, itRemoved = 0, itSkipped = 0;
items.forEach((e, i) => {
  const where = `items[${i}]`;
  const nums = ['dx', 'dy', 'rot', 'scale'].every((k) => e?.[k] === undefined || Number.isFinite(e[k]));
  const frameOk = e && (e.frame === '*' || (Number.isInteger(e.frame) && e.frame >= 0));
  if (!e || typeof e.set !== 'string' || typeof e.pose !== 'string' || !frameOk || !SLOTS.includes(e.slot) || typeof e.item !== 'string' || !nums || (e.pose === '*' && e.frame !== '*') || e.scale <= 0) {
    errors.push(`${where}: invalid entry ${JSON.stringify(e)}`); itSkipped++; return;
  }
  if (!manifest(e.set)) { errors.push(`${where}: no sprite set "${e.set}"`); itSkipped++; return; }
  let frame = e.frame, src = e.src;
  if (e.pose !== '*') {
    if (frame === '*') {
      const def = manifest(e.set).poses?.[e.pose];
      if (!def) { errors.push(`${where}: ${e.set} has no pose "${e.pose}"`); itSkipped++; return; }
      if (typeof def === 'string' || def.alias) { errors.push(`${where}: ${e.set} pose "${e.pose}" is an alias; use its target pose`); itSkipped++; return; }
    } else {
      const loc = locate(where, e.set, e.pose, e.frame, e.src);
      if (!loc) { itSkipped++; return; }
      frame = loc.index; src = loc.fo.src || undefined;
    }
  }
  if (itemIds && e.item !== '*' && !itemIds.has(e.item)) warnings.push(`${where}: unknown item "${e.item}" (kept)`);
  const r = (v) => Math.round(v * 10000) / 10000;
  const entry = { set: e.set, pose: e.pose, frame, ...(src && frame !== '*' ? { src } : {}), slot: e.slot, item: e.item, dx: r(e.dx ?? 0), dy: r(e.dy ?? 0), rot: r(e.rot ?? 0), scale: r(e.scale ?? 1) };
  const k = key(entry), old = fit.get(k);
  if (old && JSON.stringify(old) === JSON.stringify(entry)) return;
  if (old) itChanged++; else itAdded++;
  fit.set(k, entry);
});
// An identity entry only matters when it overrides a broader one: drop the rest.
for (const [k, e] of fit) {
  if (!isIdentity(e)) continue;
  const broader = [...fit.values()].some((b) => b !== e && b.set === e.set && b.slot === e.slot && level(b) < level(e) && !isIdentity(b)
    && (b.item === '*' || b.item === e.item) && (b.pose === '*' || b.pose === e.pose) && (b.frame === '*' || b.frame === e.frame));
  if (!broader) { fit.delete(k); itRemoved++; }
}
const cmp = (a, b) => (a === b ? 0 : a === '*' ? -1 : b === '*' ? 1 : typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : 1);
const rows = [...fit.values()].sort((a, b) => cmp(a.set, b.set) || cmp(a.pose, b.pose) || cmp(a.frame, b.frame) || cmp(a.slot, b.slot) || cmp(a.item, b.item));
const one = (e) => JSON.stringify(e).replace(/,"/g, ', "').replace(/":/g, '": ');
const newFit = fitText.slice(0, at) + MARK + (rows.length ? ` [\n${rows.map((e) => '  ' + one(e)).join(',\n')}\n];\n` : ' [];\n');
const fitChanged = newFit !== fitText;
if (fitChanged && !dry) writeFileSync(fitFile, newFit);

// --- summary, validation, stamping ----------------------------------------------
const rel = (p) => { const r = path.relative(process.cwd(), p); return !r ? '.' : r.startsWith('..') ? p : r; };
console.log(`${dry ? '[dry run] ' : ''}Workbench edits from ${file} -> ${rel(root)}`);
console.log(`  landmarks: ${lmApplied} applied in ${editedSets.length} set(s)${editedSets.length ? ` (${editedSets.join(', ')})` : ''}, ${lmSkipped} skipped`);
console.log(`  item fits: ${itAdded} added, ${itChanged} changed, ${itRemoved} no-op entries dropped, ${itSkipped} skipped; ${rel(fitFile)} now has ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}${fitChanged ? '' : ' (unchanged)'}`);
for (const n of notes) console.log('    ' + n);
for (const w of warnings) console.log('WARN: ' + w);
for (const e of errors) console.log('ERROR: ' + e);
if (dry) process.exit(errors.length ? 1 : 0);

let failed = errors.length > 0;
if (fitChanged && !flag('no-stamp')) {
  const stamp = path.join(root, 'tools', 'stamp-modules.mjs');
  if (existsSync(stamp)) {
    const r = spawnSync(process.execPath, [stamp], { encoding: 'utf8' });
    console.log(r.status === 0 ? `  ${r.stdout.trim().split('\n').join('; ')}` : `ERROR: stamp-modules failed: ${r.stderr}`);
    if (r.status !== 0) failed = true;
  }
}
if (editedSets.length && !flag('no-validate')) {
  console.log('Validating sprite sets (tools/sprites/validate.py)...');
  const r = spawnSync('python3', [path.join(toolsDir, 'validate.py'), '--root', spritesDir], { encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n');
  const relevant = lines.filter((l) => /^(WARN|ERROR)/.test(l) && (editedSets.some((s) => l.includes(s + ':')) || l.startsWith('ERROR')));
  for (const l of relevant) console.log('  ' + l);
  console.log(`  validate.py ${r.status === 0 ? 'passed' : 'FAILED'} (${lines.filter((l) => l.startsWith('WARN')).length} warnings in all, ${relevant.length} about the edited sets)`);
  if (r.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
