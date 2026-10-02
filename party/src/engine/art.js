// Optional generated art (backgrounds, props, icons, logo, game thumbnails).
// assets/art/index.json lists what exists:  { "images": { "bg/sprinkle-catch": "bg/sprinkle-catch.webp", ... } }
// Code asks for art by key and falls back to procedural drawing when it is
// missing, so new art can be dropped in at any time without code changes:
//
//   const bg = art('bg/sprinkle-catch');
//   if (bg) g.drawImage(bg, 0, 0, W, H); else drawProceduralBackground(g);
//
//   drawArt(g, 'prop/present', x, y, w, h, { anchor: 'bottom' })  // returns false if missing
//
// Key conventions (see image-requests.md): bg/<gameId>, thumb/<gameId>,
// prop/<name>, icon/<name>, ui/logo, ui/<name>.

const images = new Map();

export async function loadArt() {
  try {
    const res = await fetch('assets/art/index.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const idx = await res.json();
    const files = new Map();
    for (const [key, file] of Object.entries(idx.images || {})) {
      if (!files.has(file)) files.set(file, []);
      files.get(file).push(key);
    }
    const queue = [...files.entries()];
    // Share one decoded image across aliases and avoid hundreds of simultaneous
    // requests. Retry a transient failure once before retaining the fallback.
    async function worker() {
      while (queue.length) {
        const [file, keys] = queue.shift();
        let loaded = null;
        for (let attempt = 0; attempt < 2 && !loaded; attempt++) {
          loaded = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = 'assets/art/' + file + (attempt ? '?retry=1' : '');
          });
        }
        if (loaded) for (const key of keys) images.set(key, loaded);
        else console.warn('Missing art', file);
      }
    }
    await Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker));
  } catch (e) { /* no art yet */ }
}

/** The loaded image for `key`, or null. */
export function art(key) { return images.get(key) || null; }
export function hasArt(key) { return images.has(key); }

/**
 * Draw art fitted into a box. anchor: 'center' | 'bottom' (x,y = bottom center) | 'topleft'.
 * fit: 'contain' (default) | 'cover' | 'stretch'. Returns false if the art is missing.
 */
export function drawArt(g, key, x, y, w, h, { anchor = 'center', fit = 'contain', alpha = 1 } = {}) {
  const img = images.get(key);
  if (!img) return false;
  let dw = w, dh = h;
  if (fit !== 'stretch') {
    const s = fit === 'cover' ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
    dw = img.width * s; dh = img.height * s;
  }
  let dx, dy;
  if (anchor === 'bottom') { dx = x - dw / 2; dy = y - dh; }
  else if (anchor === 'topleft') { dx = x + (w - dw) / 2; dy = y + (h - dh) / 2; }
  else { dx = x - dw / 2; dy = y - dh / 2; }
  g.save(); g.globalAlpha *= alpha; g.drawImage(img, dx, dy, dw, dh); g.restore();
  return true;
}
