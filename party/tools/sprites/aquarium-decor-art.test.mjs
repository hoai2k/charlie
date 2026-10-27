import assert from 'node:assert/strict';
globalThis.location = { search: '' };
const { DECOR_BY_ID, drawDecor, drawDecorGlow, decorLights } = await import('../../src/games/aquarium/decor.js');
const { loadArt } = await import('../../src/engine/art.js');

function context() {
  const calls = [], stack = [];
  let m = [1, 0, 0, 1, 0, 0];
  const g = new Proxy({
    globalAlpha: 1, globalCompositeOperation: 'screen',
    save() { stack.push({ m: [...m], alpha: this.globalAlpha, composite: this.globalCompositeOperation }); },
    restore() { const s = stack.pop(); m = s.m; this.globalAlpha = s.alpha; this.globalCompositeOperation = s.composite; },
    translate(x, y) { m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; },
    rotate(t) { calls.push({ method: 'rotate', args: [t] });
      const [a, b, c, d] = m, co = Math.cos(t), si = Math.sin(t);
      m[0] = a * co + c * si; m[1] = b * co + d * si; m[2] = c * co - a * si; m[3] = d * co - b * si; },
    drawImage(...args) { calls.push({ method: 'drawImage', args, m: [...m], alpha: this.globalAlpha, composite: this.globalCompositeOperation }); },
  }, { get: (target, key) => key in target ? target[key] : (...args) => calls.push({ method: key, args }) });
  return { g, calls };
}
const item = (extra = {}) => ({ color: 0, seed: 0.3, open: 0, ...extra });
const env = { t: 2.3, night: 0.8 };
const pearlCount = (c) => c.calls.filter(({ method, args }) => method === 'ellipse' && args[0] === 0 && args[1] === -30 && args[2] === 14 && args[3] === 14).length;
for (const open of [0, 0.2, 0.21, 1]) {
  const c = context(); drawDecor(c.g, DECOR_BY_ID.clam, item({ clamOpen: open }), env);
  assert.equal(pearlCount(c), open > 0.2 ? 1 : 0, 'Procedural clam draws exactly its own pearl');
}
for (const id of ['glowstone', 'glowshroom', 'moonlight']) {
  const c = context(); drawDecorGlow(c.g, DECOR_BY_ID[id], item(), env);
  assert.ok(c.calls.some(({ method }) => method === 'fill'), 'Missing art retains its procedural night object');
  assert.equal(c.calls.filter(({ method }) => method === 'drawImage').length, 0);
}
const entries = Object.fromEntries(['clam-white', 'chest', 'glowstone-blue', 'glowshroom-teal', 'moonlight'].map((id) => [`prop/aq-${id}`, id + '.webp']));
globalThis.fetch = async () => ({ ok: true, json: async () => ({ images: entries }) });
globalThis.Image = class {
  set src(path) {
    [this.width, this.height] = path.includes('chest') ? [300, 240] : path.includes('moonlight') ? [200, 300]
      : path.includes('glowstone') ? [200, 240] : path.includes('glowshroom') ? [240, 220] : [240, 180];
    queueMicrotask(() => this.onload());
  }
};
await loadArt();
for (const open of [0, 0.2, 0.21, 1]) {
  const c = context(); drawDecor(c.g, DECOR_BY_ID.clam, item({ clamOpen: open }), env);
  assert.equal(c.calls.filter(({ method }) => method === 'drawImage').length, 1);
  assert.equal(pearlCount(c), open > 0.2 ? 1 : 0, 'Authored clam gets one pearl at its requested point');
  const night = context(); drawDecorGlow(night.g, DECOR_BY_ID.clam, item({ clamOpen: open }), env);
  assert.equal(night.calls.some(({ method }) => method === 'ellipse'), open > 0.2, 'Closed clam also hides pearl night glow');
}
for (const id of ['glowstone', 'glowshroom', 'moonlight']) {
  const day = context(); drawDecor(day.g, DECOR_BY_ID[id], item(), env);
  const base = day.calls.find(({ method }) => method === 'drawImage');
  for (const t of [0, 1.3, 3.1]) {
    const night = context(); drawDecorGlow(night.g, DECOR_BY_ID[id], item(), { ...env, t });
    assert.equal(night.calls.length, 1, 'Generated night prop redraws only its authored image');
    const glow = night.calls[0];
    assert.deepEqual(glow.args, base.args, 'Night silhouette has the identical fit and bottom anchor');
    assert.ok(glow.alpha > 0 && glow.alpha <= env.night * 0.45);
    assert.equal(glow.composite, 'source-over');
    assert.equal(night.g.globalCompositeOperation, 'screen', 'Caller blending is restored');
  }
  assert.ok(decorLights(DECOR_BY_ID[id], item()).length, 'Generic light pools are preserved');
}
// Generic window, lantern and lava lighting stay separate from whole-object redraws.
for (const id of ['castle', 'lantern', 'volcano']) {
  const c = context(); drawDecorGlow(c.g, DECOR_BY_ID[id], item(), env);
  assert.ok(c.calls.some(({ method }) => method === 'fill'));
}

const closed = context(); drawDecor(closed.g, DECOR_BY_ID.chest, item(), env);
const full = closed.calls.find(({ method }) => method === 'drawImage');
assert.equal(full.args.length, 5, 'Closed chest keeps the whole authored image');
const opened = context(); drawDecor(opened.g, DECOR_BY_ID.chest, item({ open: 1 }), env);
const crops = opened.calls.filter(({ method }) => method === 'drawImage');
assert.equal(crops.length, 2);
assert.deepEqual(crops[0].args.slice(1, 5), [0, 0, 300, 122], 'Lid uses the measured upper source crop');
assert.deepEqual(crops[1].args.slice(1, 5), [0, 122, 300, 118], 'Lower body keeps its original source pixels');
assert.equal(opened.calls.filter(({ method }) => method === 'rotate').length, 1, 'No second procedural lid overlays the authored lid');
function sourcePoint(call, px, py) {
  const a = call.args, [sx, sy, sw, sh, dx, dy, dw, dh] = a.length === 9 ? a.slice(1) : [0, 0, a[0].width, a[0].height, ...a.slice(1)];
  const x = dx + (px - sx) / sw * dw, y = dy + (py - sy) / sh * dh, m = call.m;
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
assert.deepEqual(sourcePoint(crops[1], 150, 200), sourcePoint(full, 150, 200), 'Opening does not move or resize lower-body pixels');
assert.deepEqual(sourcePoint(crops[0], 150, 122), [0, -59], 'Authored lid rotates around its measured seam');
assert.ok(opened.calls.some(({ method, args }) => method === 'ellipse' && args[0] === 0 && args[1] === -70 && args[2] === 60), 'Chest opening glow is preserved');
assert.equal(opened.calls.filter(({ method, args }) => method === 'ellipse' && args[1] === -76 && args[2] === 9).length, 4, 'Chest keeps its coin/pearl burst');
assert.equal(decorLights(DECOR_BY_ID.chest, item()).length, 0);
assert.ok(decorLights(DECOR_BY_ID.chest, item({ open: 1 })).length);
console.log('Generated clam pearl, night silhouette redraw, authored chest lid crops and procedural fallback tests passed.');
