import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const game=new URL('../../',import.meta.url);
const meta=JSON.parse(fs.readFileSync(new URL('tools/mounts/moon-buggy/calibration.json',game)));
test('Apollo rover has nine padded ground frames and calibrated seats in the runtime table',()=>{
  const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('mounts.js',game),'utf8'),c);
  const table=c.window.MOUNT_ART.moon_buggy.calibration;
  assert.equal(meta.frames.length,9);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(meta.asset,game))).digest('hex'),meta.sha256);
  meta.frames.forEach((f,n)=>{
    assert.ok(f.bounds[0]>0&&f.bounds[1]>0&&f.bounds[2]<418&&f.bounds[3]===409);
    assert.equal(JSON.stringify(table[n/3|0][n%3]),JSON.stringify([...f.seat,0]));
    assert.equal(f.seat[0],226);assert.ok(f.seat[1]>0&&f.seat[1]<409);
  });
});
