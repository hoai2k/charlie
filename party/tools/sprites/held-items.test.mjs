// Held items (Mole Madness mallet, Pinata bat, rakes, wands, buckets...) are
// drawn with their grip at the frame's `hand` point (Actor attach info). This
// checks that point on every playable character's leader sprite set in the
// poses the held-item games use:
//   - every frame has one, on the character (inside the silhouette);
//   - the walk/run/dash art faces the way the pose says (a pose drawn the other
//     way walks backwards, and the held item hangs off the back);
//   - an animal's muzzle (its "hand") points forward in those poses;
//   - the body doesn't jump between run/walk frames (anchor drift), and the
//     hand rides the same place in walk and run (no jump on walk <-> run);
//   - the engine's info.mouth (grip by the end) is on for muzzle holders only.
// Hand points are reviewed by eye (README "Body map"; the sprite workbench
// writes corrections): `python3` with Pillow is needed for the silhouette check.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const party = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
globalThis.location = { search: '' };
const { CHARACTERS } = await import('../../src/data/characters.js');
const { POSES } = await import('../../src/engine/sprites.js');

const LEADERS = [...new Set(CHARACTERS.map((c) => c.members[0].asset))];
// poses Mole Madness, Pinata Party and the other held-item games show with something in hand
const HELD_POSES = ['idle', 'walk', 'run', 'dash', 'swing', 'action', 'throw', 'surprised', 'pull', 'knockback', 'cheer', 'wave', 'celebrate'];
const MOVE_POSES = ['walk', 'run', 'dash'];
const manifest = (a) => JSON.parse(readFileSync(path.join(party, 'assets/sprites', a, 'sprites.json'), 'utf8'));
/** The pose a set draws for `name`: its own, an alias's target, or the POSES fallback chain (as resolvePose). */
function resolve(m, name) {
  const own = (n) => { let d = m.poses[n]; const seen = new Set(); while (d && (typeof d === 'string' || d.alias) && !seen.has(d)) { seen.add(d); d = m.poses[typeof d === 'string' ? d : d.alias]; } return d && d.frames ? d : null; };
  const queue = [name], seen = new Set();
  while (queue.length) { const n = queue.shift(); if (seen.has(n)) continue; seen.add(n); const d = own(n); if (d) return d; queue.push(...(POSES[n]?.fallback || [])); }
  return own('idle');
}
const bodyH = (m, d, f) => f.bodyHeight || d.bodyHeight || m.bodyHeight;
const flipOf = (m, d) => ((d.facing ?? m.facing ?? 0) === -1 ? -1 : 1);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

const problems = [], alphaChecks = [];
for (const a of LEADERS) {
  if (!existsSync(path.join(party, 'assets/sprites', a, 'sprites.json'))) continue;
  const m = manifest(a);
  const i0 = m.poses.idle.frames[0];
  const mouthSet = !!(i0.hand && i0.eyes) && dist(i0.hand, i0.eyes) < 0.2 * bodyH(m, m.poses.idle, i0);
  const handAt = {};   // pose -> forward-space hand points (body heights)
  for (const name of HELD_POSES) {
    const d = resolve(m, name), flip = flipOf(m, d);
    handAt[name] = [];
    d.frames.forEach((f, i) => {
      const at = `${a} ${name}[${i}] (${f.src})`, bh = bodyH(m, d, f);
      if (!f.hand) { problems.push(`${at}: no hand point`); return; }
      alphaChecks.push({ at, file: path.join(party, 'assets/sprites', a, f.src), x: f.hand[0], y: f.hand[1] });
      const anchor = f.anchor || d.anchor || m.anchor;
      handAt[name].push([(f.hand[0] - anchor[0]) * flip / bh, (f.hand[1] - anchor[1]) / bh]);
      // a side-on muzzle holder's mouth is ahead of its eyes (else the pose is mirrored)
      if (mouthSet && d.facing && f.eyes && dist(f.hand, f.eyes) < 0.22 * bh && (f.hand[0] - f.eyes[0]) * flip < -0.04 * bh) problems.push(`${at}: the muzzle points backwards (pose facing ${d.facing})`);
    });
    if (MOVE_POSES.includes(name)) {
      // the art faces its pose's way: eyes ahead of the tail
      const ahead = d.frames.filter((f) => f.eyes && f.tail).map((f) => (f.eyes[0] - f.tail[0]) * flip / bodyH(m, d, f));
      if (ahead.length && mean(ahead) < -0.15) problems.push(`${a} ${name}: drawn facing the other way (eyes behind the tail; pose facing ${d.facing})`);
      // a steady body: the belly keeps its place over the anchor
      const bx = d.frames.filter((f) => f.belly).map((f) => (f.belly[0] - (f.anchor || m.anchor)[0]) / bodyH(m, d, f));
      if (bx.length > 1 && Math.max(...bx) - Math.min(...bx) > 0.35) problems.push(`${a} ${name}: the body jumps ${(Math.max(...bx) - Math.min(...bx)).toFixed(2)} body heights between frames (anchors)`);
    }
  }
  // walk <-> run swaps (Actor.moveAnim) don't move the held thing far
  const c = (n) => [mean(handAt[n].map((p) => p[0])), mean(handAt[n].map((p) => p[1]))];
  if (handAt.walk.length && handAt.run.length && dist(c('walk'), c('run')) > 0.25) problems.push(`${a}: the hand jumps ${dist(c('walk'), c('run')).toFixed(2)} body heights between walk and run`);
}

// every hand point on the character: an opaque pixel within 6 px
const py = spawnSync('python3', ['-c', `
import json, sys
from PIL import Image
out, cache = [], {}
for c in json.load(sys.stdin):
    a = cache.get(c['file']) or cache.setdefault(c['file'], Image.open(c['file']).getchannel('A'))
    best = 99
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            x, y = c['x'] + dx, c['y'] + dy
            if 0 <= x < a.width and 0 <= y < a.height and a.getpixel((x, y)) > 128: best = min(best, (dx * dx + dy * dy) ** 0.5)
    out.append(best)
print(json.dumps(out))
`], { input: JSON.stringify(alphaChecks), encoding: 'utf8', maxBuffer: 1 << 24 });
if (py.status === 0) {
  JSON.parse(py.stdout).forEach((d, i) => { if (d > 6) problems.push(`${alphaChecks[i].at}: hand point ${alphaChecks[i].x},${alphaChecks[i].y} is off the character`); });
} else console.log('held-items: skipped the silhouette check (needs python3 with Pillow)');

assert.deepEqual(problems, [], 'held-item hand points:\n' + problems.join('\n'));

// --- engine: info.mouth ------------------------------------------------------------
globalThis.Image = class {
  constructor() { this.width = 100; this.height = 120; }
  set src(url) { queueMicrotask(() => this.onload()); }
};
globalThis.fetch = async (url) => {
  const file = path.join(party, String(url).split('?')[0]);
  return existsSync(file) ? { ok: true, json: async () => JSON.parse(readFileSync(file, 'utf8')) } : { ok: false };
};
const { Actor, loadSprites, ensureSpriteSet, handIsMouth, getSpriteSet } = await import('../../src/engine/sprites.js');
await loadSprites();
for (const a of ['fox', 'felicity', 'cotton-candy', 'marshmallow-birthday-cake']) await ensureSpriteSet(a);
const info = (id, pose, t = 0) => { const x = new Actor(id); x.setPose(pose); x.poseTime = t; return x.bodyInfo(); };
// let pose frames load (usablePose shows idle until they have)
for (const [id, pose] of [['fox', 'walk'], ['fox', 'swing'], ['cotton-candy', 'pull'], ['felicity', 'walk'], ['marshmallow-birthday-cake', 'swing']]) info(id, pose);
await new Promise((r) => setTimeout(r, 20));
assert.equal(info('fox', 'idle').mouth, true, 'Fox carries things in her mouth');
assert.equal(info('fox', 'walk').mouth, true);
assert.equal(info('fox', 'swing', 0.2).mouth, false, 'a raised-paw swing frame grips with the paws');
assert.equal(info('cotton-candy', 'pull').mouth, false, 'hooves on the rope');
assert.equal(info('felicity', 'walk').mouth, false, 'hands are hands');
assert.equal(info('marshmallow-birthday-cake', 'swing').mouth, false, 'the cake holds things beside her, not in a muzzle');
assert.equal(handIsMouth(null, null, null), false);
assert.ok(getSpriteSet('fox').mouthHand && !getSpriteSet('felicity').mouthHand);
console.log(`Held-item hand points checked on ${LEADERS.length} leader sets x ${HELD_POSES.length} poses; info.mouth for muzzle holders.`);
