// Runs the shipped browser runtime (../../recolor.js) under node on raw RGBA
// buffers, so review images come from exactly the code the game uses.
//   node render_node.js jobs.json
// jobs.json: [{src, mask, out, stats, target:[r,g,b], mode:"lut"|"exact"}]
// src/mask/out are raw RGBA files written by render.py.
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = { window: {}, Math, Float32Array, Uint8ClampedArray };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "recolor.js"), "utf8"), ctx);
const R = ctx.window.DollRecolor;
const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const luts = new Map();
for (const j of jobs) {
  const px = new Uint8ClampedArray(fs.readFileSync(j.src));
  const m = new Uint8ClampedArray(fs.readFileSync(j.mask));
  const out = new Uint8ClampedArray(px.length);
  if (j.mode === "exact") R.recolorPixels(px, m, j.stats, j.target, out);
  else {
    const key = JSON.stringify([j.stats, j.target]);
    if (!luts.has(key)) luts.set(key, R.buildLut(j.stats, j.target));
    R.recolorPixelsLut(px, m, j.stats, j.target, out, luts.get(key));
  }
  fs.writeFileSync(j.out, out);
}
