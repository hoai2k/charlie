// The workbench's side panels. The race runs in the frame; once it's
// loaded, workbench/bench.js is added to its page and these panels drive it
// through its `Bench` object.
const frame = document.querySelector("#game");
const $ = selector => document.querySelector(selector);

const TROLLS = [
  ["troll", "Troll"], ["scarecrow", "Scarecrow"], ["skeleton", "Skeleton"], ["robot", "Robot"],
  ["tintroll", "Tin toy"], ["sandtroll", "Sand monster"], ["candytroll", "Candy troll"], ["cloudtroll", "Cloud troll"]
];
const POWERUPS = [
  ["spring", "jump", "High jump"], ["pogo", "jump", "Pogo"], ["boost", "boost", "Boost"],
  ["emp", "emp", "EMP"], ["oil", "oil", "Oil"], ["snowball", "snowball", "Throwables"]
];
const MOUNT_NAMES = {
  horse: "Horse", unicorn: "Unicorn", pegasus: "Pegasus", griffon: "Griffon", broom: "Broom", pony: "Pony",
  reindeer: "Reindeer", rocking_horse: "Rocking horse", carousel_horse: "Carousel", moon_buggy: "Moon buggy", skeleton_horse: "Skeleton horse"
};

let game = null; // the frame's window, once the bench is ready
let playerKey = "doll:whirlpool";

function tile(label, onClick) {
  const button = document.createElement("button");
  button.className = "tile";
  const canvas = document.createElement("canvas");
  canvas.width = 112;
  canvas.height = 112;
  const name = document.createElement("span");
  name.textContent = label;
  button.append(canvas, name);
  button.addEventListener("click", () => {
    onClick(button);
    frame.contentWindow.focus(); // keys go back to the game
  });
  return { button, canvas };
}

// Draws part of an image (from the game's page) into a tile once it loads.
function paint(canvas, getImage, rect) {
  const c = canvas.getContext("2d");
  const attempt = (tries) => {
    const image = getImage();
    if (!image || !(image.width || image.naturalWidth)) {
      if (tries > 0) setTimeout(() => attempt(tries - 1), 250);
      return;
    }
    const [sx, sy, sw, sh] = rect(image);
    c.clearRect(0, 0, canvas.width, canvas.height);
    const k = Math.min(canvas.width / sw, canvas.height / sh);
    c.drawImage(image, sx, sy, sw, sh, (canvas.width - sw * k) / 2, (canvas.height - sh * k) / 2, sw * k, sh * k);
  };
  attempt(40);
}

// A sheet cell trimmed to its art, so small tiles show the character large.
function trimmedCell(image, sx, sy, size) {
  const probe = document.createElement("canvas");
  probe.width = size;
  probe.height = size;
  const c = probe.getContext("2d");
  c.drawImage(image, sx, sy, size, size, 0, 0, size, size);
  const data = c.getImageData(0, 0, size, size).data;
  let x0 = size, y0 = size, x1 = 0, y1 = 0;
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (data[(y * size + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
  }
  return x1 > x0 ? [sx + x0, sy + y0, x1 - x0 + 2, y1 - y0 + 2] : [sx, sy, size, size];
}

function characterTiles(container, onPick, markPlayer) {
  container.innerHTML = "";
  const g = game;
  const tiles = [];
  for (const [key, character] of Object.entries(g.Bench.characters)) {
    if (!character.image) continue;
    const id = `doll:${key}`;
    const { button, canvas } = tile(character.name, b => onPick({ kind: "doll", key }, id, b));
    paint(canvas, () => character.image(), image => trimmedCell(image, 0, 0, g.Bench.FRAME));
    button.dataset.id = id;
    tiles.push(button);
  }
  for (const [key, name] of TROLLS) {
    if (key !== "troll" && !g.MONSTERS[key]) continue;
    const id = `troll:${key}`;
    const { button, canvas } = tile(name, b => onPick({ kind: "troll", key, name }, id, b));
    paint(canvas, () => g.Bench.monsterImage(key), image => trimmedCell(image, 0, 0, g.Bench.FRAME));
    button.dataset.id = id;
    tiles.push(button);
  }
  container.append(...tiles);
  if (markPlayer) markOn(container, playerKey);
}

function markOn(container, id) {
  for (const b of container.children) b.classList.toggle("on", b.dataset.id === id);
}

// The power-up tiles show this track's own icons.
function powerupTiles() {
  const g = game;
  const container = $("#powerups");
  container.innerHTML = "";
  for (const [kind, type, label] of POWERUPS) {
    const index = { jump: 0, boost: 1, emp: 2, oil: 3, snowball: 4 }[type];
    const look = g.pickupLook(type, { pogo: kind === "pogo" });
    const { button, canvas } = tile(kind === "pogo" ? "Pogo" : look.label || label, () => g.Bench.drop(kind));
    paint(canvas, () => g.pickupLook(type, { pogo: kind === "pogo" }).sheet || g.Bench.images.powerupIcons, image => {
      if (image === g.Bench.images.powerupIcons) {
        const r = g.Bench.POWERUP_ICON_RECTS[index];
        return [r.x, r.y, r.w, r.h];
      }
      return [index * g.Bench.TRACK_POWERUP_CELL, 0, g.Bench.TRACK_POWERUP_CELL, g.Bench.TRACK_POWERUP_CELL];
    });
    container.append(button);
  }
}

function mountTiles() {
  const g = game;
  const container = $("#mounts");
  container.innerHTML = "";
  for (const type of g.Bench.MOUNT_TYPES) {
    const { button, canvas } = tile(MOUNT_NAMES[type] || type, () => g.Bench.drop(type));
    if (type === "broom") paint(canvas, () => g.Bench.images.broom, image => [0, 0, image.width, image.height]);
    else {
      if (type === "skeleton_horse") g.getSharedArt("skeleton_horse");
      else if (!g.Bench.images[type]) g.loadArtOnce(type, `assets/${type}_sprites.webp`);
      paint(canvas, () => g.Bench.images[type], image => trimmedCell(image, 0, 0, g.Bench.FRAME));
    }
    container.append(button);
  }
}

function setupTrack(key) {
  game.Bench.setup(key);
  // Icons once this track's art is in.
  setTimeout(powerupTiles, 50);
  setTimeout(powerupTiles, 1500);
}

function start() {
  const g = game;
  const select = $("#track");
  for (const background of g.Bench.BACKGROUNDS) {
    const option = document.createElement("option");
    option.value = background.key;
    option.textContent = background.name;
    select.append(option);
  }
  select.value = "farm";
  select.addEventListener("change", () => { setupTrack(select.value); frame.contentWindow.focus(); });
  $("#hurdles").addEventListener("change", event => { g.Bench.setHurdles(event.target.checked); setupTrack(select.value); frame.contentWindow.focus(); });
  $("#reset").addEventListener("click", () => { setupTrack(select.value); frame.contentWindow.focus(); });
  $("#clearTargets").addEventListener("click", () => { g.Bench.clearTargets(); frame.contentWindow.focus(); });
  characterTiles($("#players"), (spec, id) => {
    playerKey = id;
    markOn($("#players"), id);
    g.Bench.setPlayer(spec);
  }, true);
  characterTiles($("#targets"), spec => g.Bench.addTarget(spec), false);
  mountTiles();
  setupTrack("farm");
  frame.contentWindow.focus();
}

// Once the race's scripts are up, add the bench to its page and begin.
frame.addEventListener("load", () => {
  const w = frame.contentWindow;
  const ready = () => typeof w.startRace === "function" && typeof w.setBackground === "function" && w.Lobby;
  const wait = () => {
    if (!ready()) { setTimeout(wait, 100); return; }
    const script = w.document.createElement("script");
    script.src = "workbench/bench.js";
    script.onload = () => { game = w; w.Bench.whenReady(start); };
    w.document.body.append(script);
  };
  wait();
});
