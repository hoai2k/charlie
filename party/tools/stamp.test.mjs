// The content-hashed import map in index.html (and the workbench's) must match
// the code: a stale stamp serves old modules from the browser cache.
// Fix a failure with: node party/tools/stamp-modules.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('module stamps are current', () => {
  const tool = fileURLToPath(new URL('./stamp-modules.mjs', import.meta.url));
  const r = spawnSync(process.execPath, [tool, '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
