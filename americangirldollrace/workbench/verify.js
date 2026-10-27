// The verification queue: poses to check one by one, in place of the race
// viewer. The first set is moon boots: every pose whose boots weren't set by
// hand and might be off. Pick a boot to change its view (any cell of the boot
// sheet), mirror or resize it, drag it to move it and drag the handle on its
// ring to turn it. Export downloads everything checked as a JSON file to
// send back; its boots go into moon-boot-overrides.js as they are.
// Nothing is kept between visits: a reload starts afresh, so a batch is
// never sent twice. The export holds only the poses touched this visit
// (changed, or marked Looks right). Poses already taken into the game (in
// moon-boot-overrides.js) leave the queue. The game's sound is off while
// the queue is open.
// On a touchscreen there's no turning ring: tap a boot to pick it and drag
// it to move it; tap off it to let it go, or drag off it to spin it about
// its middle; with two fingers, twist to turn it and pinch to size it
// (slowly). With no boot picked, or one that fills the screen, two fingers
// zoom and pan the whole view instead (one finger pans).
const SPRITE_FRAMES = ["Idle 1", "Idle 2", "Idle 3", "Run 1", "Run 2", "Run 3", "Jump crouch", "Jump (in the air)", "Landing", "Riding", "Push", "Knocked over"];
const ACTION_FRAMES = ["Wand raised", "Casting", "Wand follow-through", "Surf balance", "Surf carve", "Surf wobble", "Push from the saddle", "Stuck in a puddle", "Moon-boots float"];
const BOOT_VIEWS = ["Side", "Three-quarter", "Front", "Back three-quarter", "Sole", "Pointed toe", "Inside (toe left)"];
// Poses a doll wears moon boots in that most need checking: running, in the
// air, riding, pushing and knocked over (standing and crouching are simple).
const CHECK_SPRITES = [3, 4, 5, 7, 9, 10, 11];
const CHECK_ACTIONS = [6];
// Added later, at the end of the queue (so checked poses keep their place):
// crouching and landing, where a low bag or skirt can be taken for a foot.
const CHECK_LATER = [6, 8];
const FIRST_DOLL = "barbie"; // reported off: all her poses, first

const verify = {
  items: [],
  at: 0,
  results: {}, // pose id -> { status: "ok" | "edited", boots }
  boots: [], // the current pose's boots, being edited
  selected: -1,
  drag: null,
  view: { zoom: 1, x: 0, y: 0 }, // the viewer's own zoom and pan, over the pose's layout
  touchUI: matchMedia("(pointer: coarse)").matches, // a touchscreen in use: gestures, no turning ring
  cellBounds: [] // each boot cell's art bounds in its cell, for picking
};

const v$ = selector => document.querySelector(selector);
const viewCanvas = v$("#vCanvas");
const vctx = viewCanvas.getContext("2d");

// (Checked this visit only; the export is what counts.)
function saveVerifyProgress() {}

// Placed by hand in the game already (an earlier batch).
const inGame = item => Boolean(game.MOON_BOOT_OVERRIDES?.[item.id]);

// Every doll in the roster once (by asset key), Barbie first.
function verifyDolls() {
  const seen = new Map();
  for (const [key, character] of Object.entries(game.Bench.characters)) {
    if (!character.image) continue;
    const asset = game.dollAssetKey(key);
    if (!seen.has(asset)) seen.set(asset, { asset, key, name: character.name, allPoses: Boolean(character.verifyAllMoonBoots) });
  }
  const dolls = [...seen.values()];
  dolls.sort((a, b) => (b.asset === FIRST_DOLL) - (a.asset === FIRST_DOLL));
  return dolls;
}

function buildVerifyQueue() {
  const items = [];
  const hasActions = asset => (game.ACTION_SHEETS || []).includes(asset);
  for (const doll of verifyDolls()) {
    if (!game.DOLL_FEET?.[doll.asset]) continue;
    const sprites = doll.allPoses || doll.asset === FIRST_DOLL ? SPRITE_FRAMES.map((_, i) => i) : CHECK_SPRITES;
    for (const index of sprites) items.push({ ...doll, kind: "sprites", index, label: SPRITE_FRAMES[index] });
    const actions = doll.allPoses ? [0,1,2,3,4,5,6,7] : CHECK_ACTIONS;
    if (hasActions(doll.asset)) for (const index of actions) items.push({ ...doll, kind: "actions", index, label: ACTION_FRAMES[index] });
  }
  for (const doll of verifyDolls()) {
    if (!game.DOLL_FEET?.[doll.asset] || doll.allPoses || doll.asset === FIRST_DOLL) continue;
    for (const index of CHECK_LATER) items.push({ ...doll, kind: "sprites", index, label: SPRITE_FRAMES[index] });
  }
  for (const item of items) item.id = `${item.asset}/${item.kind}/${item.index}`;
  // Poses already taken into the game are done.
  return items.filter(item => !inGame(item));
}

const copyBoots = boots => boots.map(boot => ({ ...boot }));
const sameBoots = (a, b) => JSON.stringify(roundBoots(a)) === JSON.stringify(roundBoots(b));
const roundBoots = boots => boots.map(boot => ({
  cell: boot.cell, x: Math.round(boot.x * 10) / 10, y: Math.round(boot.y * 10) / 10,
  angle: Math.round(boot.angle * 1000) / 1000, width: Math.round(boot.width * 10) / 10, mirror: Boolean(boot.mirror),
  ...(boot.layer ? { layer: boot.layer } : {})
}));

function originalBoots(item) {
  return copyBoots(game.Bench.moonBoots.placements(item.asset, item.kind, item.index));
}

function sheetFor(item) {
  if (item.kind === "sprites") return game.Bench.characters[item.key].image();
  return game.getActionSheet({ spriteKey: item.key });
}

function bootArt() {
  return game.getSharedArt("moon_boot");
}

// ---------- the current pose ----------
function openItem(at) {
  verify.at = (at + verify.items.length) % verify.items.length;
  const item = verify.items[verify.at];
  const saved = verify.results[item.id];
  verify.boots = saved ? copyBoots(saved.boots) : originalBoots(item);
  verify.selected = verify.boots.length ? 0 : -1;
  verify.view = { zoom: 1, x: 0, y: 0 };
  v$("#vJump").value = String(verify.at);
  renderVerifyStatus();
  renderViewButtons();
  drawVerify();
}

// Keep the current pose's boots as checked; edited if they differ from what
// the game worked out.
function recordItem(status) {
  const item = verify.items[verify.at];
  const edited = !sameBoots(verify.boots, originalBoots(item));
  if (status === "ok" || edited || verify.results[item.id]) {
    verify.results[item.id] = { status: edited ? "edited" : "ok", boots: roundBoots(verify.boots) };
    saveVerifyProgress();
  }
}

function changed() {
  const item = verify.items[verify.at];
  if (!sameBoots(verify.boots, originalBoots(item))) {
    verify.results[item.id] = { status: "edited", boots: roundBoots(verify.boots) };
    saveVerifyProgress();
  }
  renderVerifyStatus();
  renderViewButtons();
  drawVerify();
}

function renderVerifyStatus() {
  const done = verify.items.filter(item => verify.results[item.id]).length;
  const edited = verify.items.filter(item => verify.results[item.id]?.status === "edited").length;
  const item = verify.items[verify.at];
  const state = verify.results[item.id]?.status;
  v$("#vStatus").innerHTML = `${verify.at + 1} / ${verify.items.length} left · <b>${done}</b> to export (${edited} changed)` +
    (state ? ` · this one: <b>${state === "ok" ? "looks right" : "changed"}</b>` : "");
  const select = v$("#vJump");
  for (const option of select.options) {
    const it = verify.items[Number(option.value)];
    const mark = verify.results[it.id] ? (verify.results[it.id].status === "ok" ? "✓ " : "✎ ") : "· ";
    option.textContent = `${mark}${it.name} · ${it.label}${it.kind === "actions" ? " (actions)" : ""}`;
  }
  const boot = verify.boots[verify.selected];
  for (const id of ["#vMirror", "#vFront", "#vSmaller", "#vBigger", "#vDelete"]) v$(id).disabled = !boot;
  v$("#vHint").textContent = verify.touchUI
    ? "Tap a boot to pick it, drag to move it. Drag beside it to spin it; tap away to let go. Two fingers: twist to turn, pinch to size."
    : "Click a boot to pick it. Drag it to move it; drag the ring's handle to turn it.";
}

function renderViewButtons() {
  const container = v$("#vViews");
  const art = bootArt();
  const boot = verify.boots[verify.selected];
  if (!container.children.length && art?.complete && art.width) {
    const cells = Math.round(art.width / art.height);
    for (let cell = 0; cell < cells; cell += 1) {
      const button = document.createElement("button");
      button.title = BOOT_VIEWS[cell] || `Boot ${cell + 1}`;
      const c = document.createElement("canvas");
      c.width = 96;
      c.height = 96;
      c.getContext("2d").drawImage(art, cell * art.height, 0, art.height, art.height, 0, 0, 96, 96);
      button.append(c);
      button.addEventListener("click", () => {
        const current = verify.boots[verify.selected];
        if (!current) return;
        current.cell = cell; // (its width is the boot's own, so it stays the same size)
        changed();
      });
      container.append(button);
    }
  }
  [...container.children].forEach((button, cell) => button.classList.toggle("on", Boolean(boot) && boot.cell === cell));
}

// ---------- drawing ----------
// How a pose is laid out on the view: its scale and where frame px (0, 0)
// is, with the viewer's own zoom and pan (verify.view) on top.
function verifyLayout() {
  return viewOver(baseLayout(), verify.view);
}

function viewOver(base, view) {
  const w = viewCanvas.width, h = viewCanvas.height;
  return { scale: base.scale * view.zoom, ox: w / 2 + (base.ox - w / 2) * view.zoom + view.x, oy: h / 2 + (base.oy - h / 2) * view.zoom + view.y };
}

function baseLayout() {
  const w = viewCanvas.width, h = viewCanvas.height;
  const FRAME = game.Bench.FRAME;
  let box = [0, 0, FRAME, FRAME];
  if (v$("#vZoom").checked && verify.boots.length) {
    const xs = verify.boots.map(b => b.x), ys = verify.boots.map(b => b.y);
    const pad = 110;
    box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad * 0.8];
  }
  const scale = Math.min(w / (box[2] - box[0]), h / (box[3] - box[1])) * 0.92;
  return { scale, ox: w / 2 - (box[0] + box[2]) / 2 * scale, oy: h / 2 - (box[1] + box[3]) / 2 * scale };
}

function bootTransform(boot, layout) {
  const k = boot.width * layout.scale / game.Bench.moonBoots.cellWidths[boot.cell];
  return { k, x: layout.ox + boot.x * layout.scale, y: layout.oy + boot.y * layout.scale };
}

// A boot's drawn box in its own (turned) space, from the cell's art bounds.
function bootBox(boot, k) {
  const [l, t, r, b] = verify.cellBounds[boot.cell] || [53, 74, 203, 244];
  const mid = game.Bench.moonBoots.footMid;
  return { left: (l - 128) * k, right: (r - 128) * k, top: (t - 244 + mid) * k, bottom: (b - 244 + mid) * k };
}

function ringRadius(boot, k) {
  const box = bootBox(boot, k);
  return Math.max(box.right - box.left, box.bottom - box.top) * 0.7 + 10;
}

function drawVerify() {
  if (!verify.items.length) return;
  const rect = viewCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (viewCanvas.width !== Math.round(rect.width * dpr) || viewCanvas.height !== Math.round(rect.height * dpr)) {
    viewCanvas.width = Math.round(rect.width * dpr);
    viewCanvas.height = Math.round(rect.height * dpr);
  }
  const item = verify.items[verify.at];
  const sheet = sheetFor(item);
  const art = bootArt();
  const FRAME = game.Bench.FRAME;
  const layout = verifyLayout();
  vctx.setTransform(1, 0, 0, 1, 0, 0);
  // A soft checkerboard, so pale boots show.
  vctx.fillStyle = "#8d88a6";
  vctx.fillRect(0, 0, viewCanvas.width, viewCanvas.height);
  vctx.fillStyle = "#837e9d";
  const sq = 24 * dpr;
  for (let y = 0; y < viewCanvas.height; y += sq) for (let x = (y / sq) % 2 * sq; x < viewCanvas.width; x += sq * 2) vctx.fillRect(x, y, sq, sq);
  if (!sheet?.complete || !sheet.width || !art?.complete || !art.width) {
    setTimeout(drawVerify, 200);
    return;
  }
  measureBootCells(art);
  const sx = (item.index % 3) * FRAME, sy = Math.floor(item.index / 3) * FRAME;
  vctx.imageSmoothingQuality = "high";
  vctx.drawImage(sheet, sx, sy, FRAME, FRAME, layout.ox, layout.oy, FRAME * layout.scale, FRAME * layout.scale);
  const size = art.height;
  // Further foot first, as the game draws them (moonBootsFarToNear).
  game.moonBootsFarToNear(verify.boots).forEach(boot => {
    const t = bootTransform(boot, layout);
    vctx.save();
    vctx.translate(t.x, t.y);
    vctx.rotate(boot.angle);
    if (boot.mirror) vctx.scale(-1, 1);
    vctx.globalAlpha = v$("#vSeeThrough").checked ? 0.55 : 1;
    vctx.drawImage(art, boot.cell * size, 0, size, size, -128 * t.k, (-244 + game.Bench.moonBoots.footMid) * t.k, size * t.k, size * t.k);
    vctx.restore();
  });
  // The selected boot, over them all: its box, and (with a mouse) a ring
  // with a handle to turn it.
  const boot = verify.boots[verify.selected];
  if (boot && verify.touchUI) {
    const t = bootTransform(boot, layout);
    vctx.save();
    vctx.translate(t.x, t.y);
    vctx.rotate(boot.angle);
    const box = bootBox(boot, t.k);
    vctx.strokeStyle = "#ffcf4a";
    vctx.lineWidth = 2.5 * dpr;
    vctx.setLineDash([6 * dpr, 4 * dpr]);
    vctx.strokeRect(box.left * (boot.mirror ? -1 : 1), box.top, (box.right - box.left) * (boot.mirror ? -1 : 1), box.bottom - box.top);
    vctx.setLineDash([]);
    vctx.fillStyle = "#ffcf4a";
    vctx.beginPath();
    vctx.arc(0, 0, 4 * dpr, 0, Math.PI * 2);
    vctx.fill();
    vctx.restore();
  } else if (boot) {
    const t = bootTransform(boot, layout);
    vctx.save();
    vctx.translate(t.x, t.y);
    vctx.rotate(boot.angle);
    const box = bootBox(boot, t.k);
    vctx.strokeStyle = "#ffcf4a";
    vctx.lineWidth = 2 * dpr;
    vctx.setLineDash([6 * dpr, 4 * dpr]);
    vctx.strokeRect(box.left * (boot.mirror ? -1 : 1), box.top, (box.right - box.left) * (boot.mirror ? -1 : 1), box.bottom - box.top);
    vctx.setLineDash([]);
    const r = ringRadius(boot, t.k);
    vctx.strokeStyle = "rgba(255, 207, 74, 0.85)";
    vctx.beginPath();
    vctx.arc(0, 0, r, 0, Math.PI * 2);
    vctx.stroke();
    vctx.fillStyle = "#ffcf4a";
    vctx.beginPath();
    vctx.arc(0, -r, 9 * dpr, 0, Math.PI * 2);
    vctx.fill();
    vctx.beginPath();
    vctx.arc(0, 0, 3 * dpr, 0, Math.PI * 2);
    vctx.fill();
    vctx.restore();
  }
  // Which pose this is.
  vctx.fillStyle = "rgba(20, 16, 32, 0.75)";
  vctx.fillRect(0, 0, viewCanvas.width, 30 * dpr);
  vctx.fillStyle = "#fff";
  vctx.font = `${15 * dpr}px system-ui, sans-serif`;
  vctx.fillText(`${item.name} · ${item.label}${item.kind === "actions" ? " (actions sheet)" : ""} · ${verify.boots.length} boot${verify.boots.length === 1 ? "" : "s"}`, 10 * dpr, 20 * dpr);
}

function measureBootCells(art) {
  if (verify.cellBounds.length) return;
  const size = art.height;
  const c = document.createElement("canvas");
  c.width = art.width;
  c.height = size;
  const g = c.getContext("2d");
  g.drawImage(art, 0, 0);
  const data = g.getImageData(0, 0, art.width, size).data;
  for (let cell = 0; cell * size < art.width; cell += 1) {
    let l = size, t = size, r = 0, b = 0;
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      if (data[(y * art.width + cell * size + x) * 4 + 3] < 60) continue;
      l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
    }
    verify.cellBounds[cell] = [l, t, r, b];
  }
}

// ---------- pointer: pick, move, turn ----------
function canvasPoint(event) {
  const rect = viewCanvas.getBoundingClientRect();
  const dpr = viewCanvas.width / rect.width;
  return { x: (event.clientX - rect.left) * dpr, y: (event.clientY - rect.top) * dpr };
}

function bootAt(point, layout) {
  // The nearest boot (drawn last, on top) is picked first.
  const order = game.moonBootsFarToNear(verify.boots).reverse();
  for (const boot of order) {
    const i = verify.boots.indexOf(boot);
    const t = bootTransform(boot, layout);
    const dx = point.x - t.x, dy = point.y - t.y;
    const c = Math.cos(-boot.angle), s = Math.sin(-boot.angle);
    let lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    if (boot.mirror) lx = -lx;
    const box = bootBox(boot, t.k);
    if (lx >= box.left && lx <= box.right && ly >= box.top && ly <= box.bottom) return i;
  }
  return -1;
}

viewCanvas.addEventListener("pointerdown", event => {
  const touch = event.pointerType === "touch";
  if (touch !== verify.touchUI) { verify.touchUI = touch; renderVerifyStatus(); }
  if (touch) { touchDown(event); return; }
  const layout = verifyLayout();
  const point = canvasPoint(event);
  const boot = verify.boots[verify.selected];
  let mode = null;
  if (boot) {
    const t = bootTransform(boot, layout);
    const r = ringRadius(boot, t.k);
    const handleX = t.x + Math.sin(boot.angle) * r, handleY = t.y - Math.cos(boot.angle) * r;
    const fromMiddle = Math.hypot(point.x - t.x, point.y - t.y);
    if (Math.hypot(point.x - handleX, point.y - handleY) < 18 * (viewCanvas.width / viewCanvas.getBoundingClientRect().width) || Math.abs(fromMiddle - r) < 10) mode = "turn";
  }
  if (!mode) {
    const hit = bootAt(point, layout);
    verify.selected = hit;
    if (hit >= 0) mode = "move";
    renderVerifyStatus();
    renderViewButtons();
    drawVerify();
  }
  if (!mode) return;
  const picked = verify.boots[verify.selected];
  const t = bootTransform(picked, layout);
  verify.drag = {
    mode, layout, startX: picked.x, startY: picked.y, from: point, angle0: picked.angle,
    grab: Math.atan2(point.y - t.y, point.x - t.x)
  };
  viewCanvas.setPointerCapture(event.pointerId);
  viewCanvas.style.cursor = mode === "turn" ? "crosshair" : "grabbing";
});

viewCanvas.addEventListener("pointermove", event => {
  if (event.pointerType === "touch") { touchMove(event); return; }
  const drag = verify.drag;
  if (!drag) return;
  const boot = verify.boots[verify.selected];
  const point = canvasPoint(event);
  if (drag.mode === "move") {
    boot.x = drag.startX + (point.x - drag.from.x) / drag.layout.scale;
    boot.y = drag.startY + (point.y - drag.from.y) / drag.layout.scale;
  } else {
    const t = bootTransform({ ...boot, x: drag.startX, y: drag.startY }, drag.layout);
    boot.angle = drag.angle0 + Math.atan2(point.y - t.y, point.x - t.x) - drag.grab;
  }
  drawVerify();
});

for (const type of ["pointerup", "pointercancel"]) {
  viewCanvas.addEventListener(type, event => {
    if (event.pointerType === "touch") { touchUp(event); return; }
    if (!verify.drag) return;
    verify.drag = null;
    viewCanvas.style.cursor = "default";
    changed();
  });
}

// ---------- touch: gestures ----------
const touches = new Map(); // pointer id -> where it is now (canvas px)
let gesture = null;

function selectBoot(index) {
  verify.selected = index;
  renderVerifyStatus();
  renderViewButtons();
}

// How big a boot is on screen, against the view: one taking up too much of
// it gets two-finger zooming of the whole view, not of itself.
function bootFillsView(boot, layout) {
  const box = bootBox(boot, bootTransform(boot, layout).k);
  return Math.max(box.right - box.left, box.bottom - box.top) > 0.45 * Math.min(viewCanvas.width, viewCanvas.height);
}

function twoFingers() {
  const [a, b] = [...touches.values()];
  return { a, b, dist: Math.hypot(b.x - a.x, b.y - a.y), theta: Math.atan2(b.y - a.y, b.x - a.x), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}

function touchDown(event) {
  const point = canvasPoint(event);
  touches.set(event.pointerId, point);
  viewCanvas.setPointerCapture(event.pointerId);
  const layout = verifyLayout();
  if (touches.size === 1) {
    const hit = bootAt(point, layout);
    const picked = verify.boots[verify.selected];
    if (hit >= 0) {
      if (hit !== verify.selected) selectBoot(hit);
      const boot = verify.boots[hit];
      gesture = { mode: "move", from: point, startX: boot.x, startY: boot.y, layout, moved: false };
    } else if (picked) {
      const t = bootTransform(picked, layout);
      gesture = { mode: "spin", from: point, center: { x: t.x, y: t.y }, angle0: picked.angle, grab: Math.atan2(point.y - t.y, point.x - t.x), moved: false };
    } else {
      gesture = { mode: "pan", from: point, view0: { ...verify.view }, moved: false };
    }
  } else if (touches.size === 2) {
    if (gesture?.moved && gesture.mode !== "pan") changed(); // (keep what the first finger did)
    const fingers = twoFingers();
    const boot = verify.boots[verify.selected];
    const common = { from2: fingers, base: baseLayout(), view0: { ...verify.view }, moved: true };
    gesture = boot && !bootFillsView(boot, layout)
      ? { ...common, mode: "boot2", width0: boot.width, angle0: boot.angle }
      : { ...common, mode: "zoom" };
  }
  drawVerify();
}

function touchMove(event) {
  if (!touches.has(event.pointerId)) return;
  const point = canvasPoint(event);
  touches.set(event.pointerId, point);
  if (!gesture) return;
  const boot = verify.boots[verify.selected];
  if (touches.size === 1 && ["move", "spin", "pan"].includes(gesture.mode)) {
    const dx = point.x - gesture.from.x, dy = point.y - gesture.from.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 8 * (window.devicePixelRatio || 1)) return;
    gesture.moved = true;
    if (gesture.mode === "move" && boot) {
      boot.x = gesture.startX + dx / gesture.layout.scale;
      boot.y = gesture.startY + dy / gesture.layout.scale;
    } else if (gesture.mode === "spin" && boot) {
      boot.angle = gesture.angle0 + Math.atan2(point.y - gesture.center.y, point.x - gesture.center.x) - gesture.grab;
    } else if (gesture.mode === "pan") {
      verify.view.x = gesture.view0.x + dx;
      verify.view.y = gesture.view0.y + dy;
    }
  } else if (touches.size >= 2 && gesture.from2) {
    const now = twoFingers(), was = gesture.from2;
    const ratio = now.dist / Math.max(1, was.dist);
    if (gesture.mode === "boot2" && boot) {
      // Twist turns it; pinch sizes it, slowly.
      boot.width = Math.min(400, Math.max(12, gesture.width0 * Math.pow(ratio, 0.35)));
      boot.angle = gesture.angle0 + (now.theta - was.theta);
    } else if (gesture.mode === "zoom") {
      // The view zooms about the fingers, and follows them as they move.
      const base = gesture.base, v0 = gesture.view0;
      const zoom = Math.min(8, Math.max(0.35, v0.zoom * ratio));
      const before = viewOver(base, v0);
      const fx = (was.mid.x - before.ox) / before.scale, fy = (was.mid.y - before.oy) / before.scale;
      const w = viewCanvas.width, h = viewCanvas.height;
      verify.view = {
        zoom,
        x: now.mid.x - fx * base.scale * zoom - w / 2 - (base.ox - w / 2) * zoom,
        y: now.mid.y - fy * base.scale * zoom - h / 2 - (base.oy - h / 2) * zoom
      };
    }
  }
  drawVerify();
}

function touchUp(event) {
  touches.delete(event.pointerId);
  if (!gesture) return;
  if (touches.size === 0) {
    // A tap beside the picked boot lets it go.
    if (gesture.mode === "spin" && !gesture.moved) selectBoot(-1);
    const edited = gesture.moved && ["move", "spin", "boot2"].includes(gesture.mode);
    gesture = null;
    if (edited) changed();
    else drawVerify();
  } else if (gesture.from2) {
    // One of two fingers up: that gesture's done (the other finger doesn't
    // start a new one until it's lifted too).
    if (gesture.mode === "boot2") changed();
    gesture = { mode: "rest", moved: true };
  }
}

viewCanvas.addEventListener("wheel", event => {
  const boot = verify.boots[verify.selected];
  if (!boot) return;
  event.preventDefault();
  boot.width *= event.deltaY < 0 ? 1.04 : 1 / 1.04;
  changed();
}, { passive: false });

// ---------- buttons and keys ----------
function resizeBoot(factor) {
  const boot = verify.boots[verify.selected];
  if (!boot) return;
  boot.width *= factor;
  changed();
}

function turnBoot(radians) {
  const boot = verify.boots[verify.selected];
  if (!boot) return;
  boot.angle += radians;
  changed();
}

v$("#vPrev").addEventListener("click", () => { recordItem(); openItem(verify.at - 1); });
v$("#vNext").addEventListener("click", () => { recordItem(); openItem(verify.at + 1); });
v$("#vOk").addEventListener("click", () => { recordItem("ok"); openItem(verify.at + 1); });
v$("#vJump").addEventListener("change", event => { recordItem(); openItem(Number(event.target.value)); });
v$("#vMirror").addEventListener("click", () => {
  const boot = verify.boots[verify.selected];
  if (boot) { boot.mirror = !boot.mirror; changed(); }
});
v$("#vFront").addEventListener("click", () => {
  const boot = verify.boots[verify.selected];
  if (!boot) return;
  // In front of every other boot in this pose.
  boot.layer = Math.max(0, ...verify.boots.filter(b => b !== boot).map(b => b.layer || 0)) + 1;
  changed();
});
v$("#vSmaller").addEventListener("click", () => resizeBoot(1 / 1.06));
v$("#vBigger").addEventListener("click", () => resizeBoot(1.06));
v$("#vDelete").addEventListener("click", () => {
  if (verify.selected < 0) return;
  verify.boots.splice(verify.selected, 1);
  verify.selected = verify.boots.length - 1;
  changed();
});
v$("#vAdd").addEventListener("click", () => {
  const FRAME = game.Bench.FRAME;
  verify.boots.push({ cell: 0, x: FRAME / 2, y: FRAME - 40, angle: 0, width: 80, mirror: false });
  verify.selected = verify.boots.length - 1;
  changed();
});
v$("#vReset").addEventListener("click", () => {
  const item = verify.items[verify.at];
  delete verify.results[item.id];
  saveVerifyProgress();
  openItem(verify.at);
});
v$("#vSeeThrough").addEventListener("change", drawVerify);
v$("#vFit").addEventListener("click", () => { verify.view = { zoom: 1, x: 0, y: 0 }; drawVerify(); });
v$("#vToolsOpen").addEventListener("click", () => document.body.classList.toggle("vtools"));
v$("#verify .tools .sheet-close").addEventListener("click", () => document.body.classList.remove("vtools"));
v$("#vZoom").addEventListener("change", drawVerify);
v$("#vClose").addEventListener("click", () => {
  recordItem();
  document.body.classList.remove("verifying", "vtools");
  game.GameAudio?.setMuted(Boolean(verify.wasMuted), false);
  frame.contentWindow.focus();
});

document.addEventListener("keydown", event => {
  if (!document.body.classList.contains("verifying") || event.target.tagName === "SELECT") return;
  const keys = {
    ArrowLeft: () => v$("#vPrev").click(),
    ArrowRight: () => v$("#vNext").click(),
    Enter: () => v$("#vOk").click(),
    Delete: () => v$("#vDelete").click(),
    Backspace: () => v$("#vDelete").click(),
    "[": () => turnBoot(-0.05),
    "]": () => turnBoot(0.05),
    "-": () => resizeBoot(1 / 1.06),
    "=": () => resizeBoot(1.06),
    "+": () => resizeBoot(1.06)
  };
  if (!keys[event.key]) return;
  event.preventDefault();
  keys[event.key]();
});

window.addEventListener("resize", () => { if (document.body.classList.contains("verifying")) drawVerify(); });

// ---------- export ----------
v$("#vExport").addEventListener("click", () => {
  recordItem();
  const items = verify.items.filter(item => verify.results[item.id]).map(item => ({
    pose: item.id,
    doll: item.name,
    frame: item.label,
    status: verify.results[item.id].status,
    boots: verify.results[item.id].boots.map(boot => ({ ...boot, view: BOOT_VIEWS[boot.cell] })),
    before: roundBoots(originalBoots(item))
  }));
  const file = {
    kind: "moon-boot-verification",
    game: "americangirldollrace",
    exported: new Date().toISOString(),
    note: "Boots in frame px, facing right: (x, y) is the middle of the foot (the boot turns about it), angle in radians, width in frame px, cell = boot view.",
    checked: items.length,
    of: verify.items.length,
    items
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `moon-boots-verified-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// ---------- opening ----------
v$("#verifyOpen").addEventListener("click", () => {
  if (!verify.items.length) {
    verify.items = buildVerifyQueue();
    const select = v$("#vJump");
    select.innerHTML = "";
    verify.items.forEach((item, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      select.append(option);
    });
    verify.at = 0;
  }
  if (!verify.items.length) {
    v$("#verifyOpen").textContent = "Verification Queue: all done";
    return;
  }
  document.body.classList.add("verifying");
  // Quiet while checking (not remembered: the race's own setting stays).
  verify.wasMuted = game.GameAudio?.isMuted;
  game.GameAudio?.setMuted(true, false);
  bootArt();
  openItem(verify.at);
});

// Called once the bench is up (workbench.js start).
function verifyReady() {
  v$("#verifyOpen").disabled = false;
}
