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
let index = null, indexPromise = null;
const groups = new Map(), groupedKeys = new Set(), persistentKeys = new Set();
const activeGroups = new Map();
// Only unfinished requests live here. Completed images are owned by their keys,
// so releasing a game can release its decoded art too.
const pendingFiles = new Map(), fileQueue = [];
let activeRequests = 0;

async function readIndex() {
  if (index) return index;
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    try {
      const res = await fetch('assets/art/index.json', { cache: 'no-cache' });
      if (!res.ok) return null;
      const idx = await res.json();
      index = idx.images || {};
      for (const [id, keys] of Object.entries(idx.groups || {})) {
        if (!Array.isArray(keys)) continue;
        const members = new Set(keys.filter((key) => Object.hasOwn(index, key)));
        if (!members.size) continue;
        groups.set(id, members);
        for (const key of members) groupedKeys.add(key);
      }
      return index;
    } catch (e) { return null; /* optional art keeps its procedural fallback */ }
  })();
  try { return await indexPromise; } finally { indexPromise = null; }
}

function loadedFile(file) {
  for (const [key, img] of images) if (index[key] === file) return img;
  return null;
}

function wantedFile(file) {
  for (const key of persistentKeys) if (index[key] === file) return true;
  for (const { keys } of activeGroups.values()) for (const key of keys) if (index[key] === file) return true;
  return false;
}

function pumpFiles() {
  while (activeRequests < 6 && fileQueue.length) {
    const { file, resolve } = fileQueue.shift();
    activeRequests++;
    (async () => {
      let loaded = null;
      for (let attempt = 0; attempt < 2 && !loaded && wantedFile(file); attempt++) {
        loaded = await new Promise((resolve) => {
          try {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = 'assets/art/' + file + (attempt ? '?retry=1' : '');
          } catch (e) { resolve(null); }
        });
      }
      if (!loaded && wantedFile(file)) console.warn('Missing art', file);
      return loaded;
    })().then(resolve).finally(() => {
      pendingFiles.delete(file);
      activeRequests--;
      pumpFiles();
    });
  }
}

function requestFile(file) {
  const loaded = loadedFile(file);
  if (loaded) return Promise.resolve(loaded);
  if (pendingFiles.has(file)) return pendingFiles.get(file);
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  pendingFiles.set(file, promise);
  fileQueue.push({ file, resolve });
  pumpFiles();
  return promise;
}

async function loadKeys(keys, wanted) {
  const files = new Map();
  for (const key of keys) {
    if (!files.has(index[key])) files.set(index[key], []);
    files.get(index[key]).push(key);
  }
  await Promise.all([...files].map(async ([file, aliases]) => {
    const img = await requestFile(file);
    if (img) for (const key of aliases) if (wanted(key)) images.set(key, img);
  }));
}

/** Boot loads legacy/common art and thumbnails. An explicit filter also loads grouped art (e.g. the workbench). */
export async function loadArt({ only = null } = {}) {
  if (!await readIndex()) return;
  const keys = Object.keys(index).filter((key) => only ? only(key) : !groupedKeys.has(key) || key.startsWith('thumb/'));
  for (const key of keys) persistentKeys.add(key);
  await loadKeys(keys, (key) => persistentKeys.has(key));
}

/** Whether this game has optional art that should be ready before its constructor runs. */
export function hasArtGroup(id) { return groups.has(id); }

export function ensureGameArt(id) {
  if (activeGroups.has(id)) return activeGroups.get(id).promise;
  // Claim ownership synchronously, before awaiting metadata. An immediate exit
  // must be able to cancel the load before its first microtask starts requests.
  const state = { keys: groups.get(id) || new Set(), promise: null };
  activeGroups.set(id, state);
  state.promise = (async () => {
    const ready = await readIndex();
    if (activeGroups.get(id) !== state) return;
    if (!ready || !groups.has(id)) { activeGroups.delete(id); return; }
    state.keys = groups.get(id);
    await loadKeys(state.keys, () => activeGroups.get(id) === state);
  })();
  return state.promise;
}

/** Drop this game's references, retaining thumbnails/common art and keys owned by another active game. */
export function releaseGameArt(id) {
  const state = activeGroups.get(id);
  if (!state) return;
  activeGroups.delete(id);
  for (const key of state.keys) {
    if (persistentKeys.has(key) || [...activeGroups.values()].some((other) => other.keys.has(key))) continue;
    images.delete(key);
  }
  // A canceled game's queued requests must not delay the next game's load.
  // Requests already in flight may finish, but their former owner cannot retain them.
  for (let i = fileQueue.length - 1; i >= 0; i--) {
    const task = fileQueue[i];
    if (wantedFile(task.file)) continue;
    fileQueue.splice(i, 1);
    pendingFiles.delete(task.file);
    task.resolve(null);
  }
}

/** The loaded image for `key`, or null. */
/** Every key the game has asked for this session (integration audits). */
export const requestedKeys = new Set();
export function art(key) { requestedKeys.add(key); return images.get(key) || null; }
export function hasArt(key) { requestedKeys.add(key); return images.has(key); }

/**
 * Draw art fitted into a box. anchor: 'center' | 'bottom' (x,y = bottom center) | 'topleft'.
 * fit: 'contain' (default) | 'cover' | 'stretch'. Returns false if the art is missing.
 */
export function drawArt(g, key, x, y, w, h, { anchor = 'center', fit = 'contain', alpha = 1 } = {}) {
  requestedKeys.add(key);
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
