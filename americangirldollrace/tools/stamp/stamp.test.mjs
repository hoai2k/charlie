import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { html, stamped, TAG } from './stamp.mjs';

test('index.html cache stamps match the files (run tools/stamp/stamp.mjs)', () => {
  const page = readFileSync(html, 'utf8');
  assert.ok([...page.matchAll(TAG)].length >= 15, 'expected the race scripts and stylesheet');
  const stale = [...page.matchAll(TAG)].map(m => m[0]).filter(tag => stamped(tag) !== tag);
  assert.deepEqual(stale, [], 'out-of-date ?v= stamps: run node americangirldollrace/tools/stamp/stamp.mjs');
});
