import assert from 'node:assert/strict';
globalThis.location = { search: '' };
const { KIND, makeFish, drawFish } = await import('../../src/games/aquarium/fish.js');
const { loadArt } = await import('../../src/engine/art.js');

// Model canvas transforms so the regression checks the rendered landmark,
// including pulse, depth scale, direction and tilt, rather than just draw args.
function context() {
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [], images = [], paths = [];
  const g = new Proxy({
    globalAlpha: 1,
    save() { stack.push([...m]); }, restore() { m = stack.pop(); },
    translate(x, y) { m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; },
    scale(x, y) { m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; },
    rotate(t) { const [a, b, c, d] = m, co = Math.cos(t), si = Math.sin(t);
      m[0] = a * co + c * si; m[1] = b * co + d * si;
      m[2] = c * co - a * si; m[3] = d * co - b * si; },
    drawImage(image, x, y, w, h) { const matrix = [...m]; images.push({ image,
      point(px, py) { const lx = x + px / image.width * w, ly = y + py / image.height * h;
        return [matrix[0] * lx + matrix[2] * ly + matrix[4], matrix[1] * lx + matrix[3] * ly + matrix[5]]; } }); },
  }, { get: (target, key) => key in target ? target[key] : (...args) => paths.push([key, args]) });
  return { g, images, paths };
}
const fish = (id, color = 0) => Object.assign(makeFish(KIND[id], color, 123, 234, 0, -9),
  { fd: 0.5, face: -1, wig: 0.8, tilt: 0.23, pulse: 0.25, hidden: 0, bump: -9, mates: null });
const close = (actual, expected) => actual.forEach((n, i) => assert.ok(Math.abs(n - expected[i]) < 1e-9, `${actual} != ${expected}`));
const fallback = context();
drawFish(fallback.g, fish('jellyfish'), { t: 99 });
assert.equal(fallback.images.length, 0);
assert.ok(fallback.paths.some(([method, args]) => method === 'bezierCurveTo' && args.join(',') === '-44,-54,44,-54,42,0'),
  'Procedural jelly bell remains available with its original body geometry');

const entries = Object.fromEntries(KIND.jellyfish.colors.map((c) => [`prop/aq-jellyfish-${c.n}`, `jellyfish-${c.n}.webp`]));
for (const id of ['goldfish', 'seahorse', 'puffer']) entries[`prop/aq-${id}-${KIND[id].colors[0].n}`] = id + '.webp';
entries['prop/aq-puffer-yellow-puffed'] = 'puffer-puffed.webp';
globalThis.fetch = async () => ({ ok: true, json: async () => ({ images: entries }) });
globalThis.Image = class {
  set src(path) {
    [this.width, this.height] = path.includes('jellyfish') ? [180, 280] : path.includes('seahorse') ? [120, 240] : [240, 180];
    queueMicrotask(() => this.onload());
  }
};
await loadArt();
for (let color = 0; color < 4; color++) for (const pulse of [0, 0.25, 0.5, 0.75]) for (const scale of [0.7, 1.3]) {
  const f = fish('jellyfish', color); f.pulse = pulse;
  const c = context(); drawFish(c.g, f, { t: 99 }, { scale });
  assert.equal(c.images.length, 1);
  close(c.images[0].point(90, 63), [f.x, f.y]);
}
for (const id of ['goldfish', 'seahorse', 'puffer']) for (const face of [-1, 1]) for (const puff of [0, 1]) {
  const f = fish(id); f.face = face; f.puff = puff;
  const c = context(); drawFish(c.g, f, { t: 99 }, { scale: 1.3 });
  assert.equal(c.images.length, 1);
  const img = c.images[0].image;
  close(c.images[0].point(img.width / 2, img.height / 2), [f.x, f.y]);
}
console.log('Jelly bell-centred pulse, other fish centre anchors, and procedural fallback tests passed.');
