import assert from 'node:assert/strict';
import { A, FLOWER_SPOTS, BOW_SPOTS, TROLL, configureTrollArt, toScreen } from '../../src/games/prank-troll/draw.js';
import { BED, configureBedArt } from '../../src/games/bed-bounce/draw.js';
const fallback = structuredClone({ A, flowers: FLOWER_SPOTS, bows: BOW_SPOTS });
configureTrollArt(true);
assert.deepEqual(A.tache, [463, 181]);
assert.equal(BOW_SPOTS[0], A.earL);
assert.ok(A.tache[1] > A.nose[1] && A.tache[1] < A.mouth[1]);
const nose = toScreen(A.nose);
assert.ok(Math.abs(nose.x - (TROLL.x - TROLL.w / 2 + 464 * TROLL.w / 900)) < 1e-8);
assert.ok(A.toeL[1] < 550 && A.toeR[1] < 550); // Painted nails attach to toes, not heels.
configureTrollArt(false);
assert.deepEqual({ A, flowers: FLOWER_SPOTS, bows: BOW_SPOTS }, fallback);
configureBedArt(true);
assert.equal(BED.top, 746);
assert.ok(BED.x0 > BED.x + BED.w * .17);
configureBedArt(false);
assert.equal(BED.top, 760); assert.equal(BED.x0, 330);
console.log('Generated Troll attachments and mattress contact geometry preserve procedural fallback.');
