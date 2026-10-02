/*
 * Title screen, character select and settings for American Girl Doll Race.
 *
 * The main flow is just "choose a doll and go". Track, monsters, specials and
 * computer racers live behind the Settings panel. The first connected
 * controller is P1 automatically; any other controller (or keyboard scheme)
 * joins through the single "Press A to join" stall.
 *
 * The lobby keeps its own list of players. When the race starts it writes
 * them into the game's existing state (character selects, mode, slotPads,
 * slotKeys), so game.js races exactly as before. Loaded after game.js and
 * uses its globals.
 */
(() => {
  const ROSTER_ORDER = ["lily", "rumi", "kaya", "amanda", "juliette", "claudia", "whirlpool", "marisol", "penelope"];
  const RANDOM = "random";
  const COLS = 5;
  const STALL = 157;
  const MAX_CPUS = 3;
  const SPECIAL_KEYS = ["none", "unicorn", "pegasus", "all-dolls", "horsing", "amanda-mode"];
  const SPECIAL_NAMES = ["None", "All Unicorns", "All Pegasi", "All Dolls (adds Penelope)", "Horsing Around", "Amanda Mode"];
  const GLYPHS = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5 };
  const PAD_BUTTONS = { 0: "a", 1: "b", 2: "x", 3: "y", 9: "start", 12: "up", 13: "down", 14: "left", 15: "right" };
  const KEYMAP = {
    wasd: { KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down", Space: "a", KeyF: "b", KeyR: "y" },
    arrows: { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Enter: "a", ShiftLeft: "b", ShiftRight: "b", Slash: "y" }
  };

  const root = document.querySelector("#startPanel");
  const stage = root.querySelector("#lbStage");
  const $ = selector => root.querySelector(selector);

  const lobby = {
    screen: "title",
    settingsOpen: false,
    setRow: 0,
    slots: Array(MAX_PLAYERS).fill(null), // { device, cursor, locked, doll, aFresh }
    cpus: [],
    hold: 0,
    touchFocus: null,
    leftDevices: new Set(),
    heldActions: new Map(),
    padPrev: new Map(),
    roster: [],
    cards: [],
    stallEls: new Map(),
    confetti: [],
    time: 0,
    frame: null,
    lastTime: 0
  };

  // ---------- helpers ----------
  const art = (key, pose) => key === RANDOM ? "assets/ui/random_card.webp" : `assets/portraits/${key}${pose ? `_${pose}` : ""}.webp`;
  const dollName = key => key === RANDOM ? "Random" : characters[key]?.name || key;
  const humanCount = () => lobby.slots.filter(Boolean).length;
  const slotOf = device => lobby.slots.findIndex(slot => slot && slot.device === device);
  const nextFree = () => lobby.slots.findIndex(slot => !slot);
  const allReady = () => humanCount() > 0 && lobby.slots.every(slot => !slot || slot.locked);
  const pads = () => connectedGamepads(navigator.getGamepads ? navigator.getGamepads() : []);
  const touchOnly = () => isTouchDevice() && pads().length === 0;
  const maxHumans = () => touchOnly() ? 1 : MAX_PLAYERS;
  const canJoin = () => nextFree() >= 0 && humanCount() < maxHumans() && humanCount() + lobby.cpus.length < MAX_PLAYERS;

  function glyphs(scope = root) {
    scope.querySelectorAll(".lb-glyph").forEach(el => {
      const size = el.classList.contains("wide") ? 34 : 28;
      el.style.backgroundSize = `${size * 6}px ${size}px`;
      el.style.backgroundPosition = `${-GLYPHS[el.dataset.g] * size}px 0`;
    });
  }
  function atlasCell(el, url, cells, index, w, h) {
    el.style.backgroundImage = `url(${url})`;
    el.style.backgroundSize = `${w * cells}px ${h}px`;
    el.style.backgroundPosition = `${-index * w}px 0`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
  }
  function badge(index, size) {
    const el = document.createElement("div");
    el.className = "lb-atlas";
    atlasCell(el, "assets/ui/player_badges.webp", 8, index, size, size);
    return el;
  }
  function sound(name) {
    try { GameAudio.play(name); } catch (error) { /* audio is optional */ }
  }
  function deviceName(device) {
    if (device.startsWith("pad")) return `🎮 ${Number(device.slice(3)) + 1}`;
    return { wasd: "WASD", arrows: "Arrows", touch: "Touch" }[device] || device;
  }

  // ---------- layout: a 1280×720 stage scaled to fit the game frame ----------
  function fit() {
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  new ResizeObserver(fit).observe(root);

  // ---------- roster grid ----------
  const rows = () => [lobby.roster.slice(0, COLS).map((_, i) => i), lobby.roster.slice(COLS).map((_, i) => i + COLS)];

  function buildGrid() {
    const visible = new Set(getVisibleCharacterEntries().map(([key]) => key));
    lobby.roster = [...ROSTER_ORDER.filter(key => visible.has(key)), RANDOM];
    const grid = $("#lbGrid");
    grid.innerHTML = "";
    const [top, bottom] = rows();
    lobby.cards = lobby.roster.map((key, index) => {
      const row = index < COLS ? 0 : 1;
      const col = row ? index - COLS : index;
      const offset = (COLS - (row ? bottom : top).length) * 61;
      const card = document.createElement("div");
      card.className = "lb-card";
      card.style.left = `${offset + col * 122}px`;
      card.style.top = `${row * 178 + 14}px`;
      card.innerHTML = `<div class="lb-pic${key === RANDOM ? " random" : ""}" style="background-image:url(${art(key)})"></div><div class="lb-name">${dollName(key)}</div><div class="lb-cursors"></div>`;
      card.addEventListener("pointerdown", event => { event.preventDefault(); tapCard(index); });
      grid.appendChild(card);
      return card;
    });
    for (const slot of lobby.slots) {
      if (!slot) continue;
      if (slot.cursor >= lobby.roster.length) slot.cursor = 0;
      if (slot.locked && !lobby.roster.includes(slot.doll)) { slot.locked = false; slot.cursor = 0; }
    }
    lobby.cpus = lobby.cpus.map(key => lobby.roster.includes(key) ? key : pickCpuDoll());
  }

  // ---------- stalls: joined players, then ONE join stall, then computer racers ----------
  function stallEl(id) {
    let el = lobby.stallEls.get(id);
    if (!el) {
      el = document.createElement("div");
      el.className = "lb-slot enter";
      el.addEventListener("pointerdown", event => { event.preventDefault(); tapStall(id); });
      el.addEventListener("animationend", event => { if (event.target === el) el.classList.remove("enter"); });
      $("#lbSlots").appendChild(el);
      lobby.stallEls.set(id, el);
    }
    return el;
  }

  function renderStalls(bounceId) {
    const order = [];
    lobby.slots.forEach((slot, index) => { if (slot) order.push(`p${index}`); });
    if (canJoin()) order.push("join");
    lobby.cpus.forEach((_, index) => order.push(`c${index}`));
    for (const [id, el] of lobby.stallEls) {
      if (order.includes(id)) continue;
      el.remove();
      lobby.stallEls.delete(id);
    }
    const x0 = (1280 - (order.length * STALL - 5)) / 2;
    order.forEach((id, n) => {
      const el = stallEl(id);
      el.style.left = `${x0 + n * STALL}px`;
      if (id === "join") {
        const prompt = touchOnly() ? "Tap to join" : `Press <span class="lb-glyph" data-g="A"></span> to join`;
        el.innerHTML = `<div class="lb-empty"></div><div class="lb-pnum">P${nextFree() + 1}</div><div class="lb-join">${prompt}</div>`;
        glyphs(el);
      } else if (id[0] === "p") {
        renderPlayer(el, Number(id.slice(1)), bounceId === id);
      } else {
        renderCpu(el, lobby.cpus[Number(id.slice(1))], bounceId === id);
      }
    });
  }

  function renderPlayer(el, index, bounce) {
    const slot = lobby.slots[index];
    const color = slotColor(index);
    const key = slot.locked ? slot.doll : lobby.roster[slot.cursor];
    const url = key === RANDOM ? art(RANDOM) : art(key, slot.locked ? "cheer" : "wave");
    el.innerHTML = `
      <div class="lb-glow" style="background:${color}"></div>
      <div class="lb-pedestal"></div>
      <div class="lb-doll${bounce ? " bounce" : slot.locked ? "" : " sway"}${key === RANDOM ? " random" : ""}" style="background-image:url(${url})"></div>
      ${slot.locked ? `<div class="lb-ribbon">READY!</div>` : `<div class="lb-label" style="color:${color}">${dollName(key)}</div>`}
      <div class="lb-device">${deviceName(slot.device)}</div>`;
    const b = badge(index, 52);
    b.classList.add("lb-badge");
    el.appendChild(b);
  }

  function renderCpu(el, key, bounce) {
    el.innerHTML = `
      <div class="lb-glow" style="background:#7a7f8c"></div>
      <div class="lb-pedestal"></div>
      <div class="lb-doll${bounce ? " bounce" : ""}" style="background-image:url(${art(key, "cheer")})"></div>
      <div class="lb-ribbon">CPU</div>
      <div class="lb-badge lb-ai"></div>
      <div class="lb-device">Computer</div>`;
  }

  function renderCursors() {
    for (const card of lobby.cards) {
      card.querySelector(".lb-cursors").innerHTML = "";
      card.classList.remove("hot");
      card.style.borderColor = "";
    }
    lobby.slots.forEach((slot, index) => {
      if (!slot) return;
      const cardIndex = slot.locked ? lobby.roster.indexOf(slot.doll) : slot.cursor;
      const card = lobby.cards[cardIndex] || lobby.cards[slot.cursor];
      if (!card) return;
      const b = badge(index, 34);
      b.style.position = "relative";
      if (slot.locked) b.style.opacity = "0.55";
      card.querySelector(".lb-cursors").appendChild(b);
      if (!slot.locked) {
        card.classList.add("hot");
        card.style.borderColor = slotColor(index);
      }
    });
  }

  function renderRaceBar() {
    const bar = $("#lbRaceBar");
    const humans = lobby.slots.filter(Boolean);
    const ready = allReady() && assetsReady;
    bar.classList.toggle("show", humans.length > 0 || assetsFailed);
    bar.classList.toggle("waiting", !ready);
    const waiting = humans.filter(slot => !slot.locked).length;
    let text;
    if (assetsFailed) text = "Tap to retry loading";
    else if (!humans.length) text = "";
    else if (waiting) text = humans.length === 1 ? "Pick your doll!" : `Waiting for ${waiting} player${waiting > 1 ? "s" : ""}…`;
    else if (!assetsReady) text = "Loading…";
    else text = touchOnly() ? "Tap here to race!" : `Hold <span class="lb-glyph" data-g="A"></span> to race!`;
    $("#lbRaceText").innerHTML = text;
    $("#lbRaceFill").style.width = `${ready ? lobby.hold * 100 : 0}%`;
    glyphs(bar);
  }

  function renderSettings() {
    const background = getCurrentBackground();
    atlasCell($("#lbTrackThumb"), "assets/ui/track_cards.webp", 5, Math.max(0, BACKGROUNDS.indexOf(background)), 160, 90);
    $("#lbTrackVal").textContent = background.name;
    const difficultyIndex = Math.max(0, DIFFICULTIES.findIndex(d => d.key === state.difficulty));
    atlasCell($("#lbMonsterIcon"), "assets/ui/difficulty_icons.webp", 4, difficultyIndex, 90, 90);
    $("#lbMonsterVal").textContent = DIFFICULTIES[difficultyIndex].label;
    const specialIndex = Math.max(0, SPECIAL_KEYS.indexOf(state.specials));
    atlasCell($("#lbSpecialIcon"), "assets/ui/specials_icons.webp", 6, specialIndex, 90, 90);
    $("#lbSpecialVal").textContent = SPECIAL_NAMES[specialIndex];
    const n = lobby.cpus.length;
    $("#lbCpuIcons").innerHTML = n
      ? lobby.cpus.map(() => `<div class="lb-ai-icon" style="width:${n > 2 ? 48 : 64}px"></div>`).join("")
      : `<span class="lb-none">none</span>`;
    $("#lbCpuVal").textContent = n ? String(n) : "Off";
    root.querySelectorAll(".lb-set-row").forEach(row => row.classList.toggle("focus", Number(row.dataset.row) === lobby.setRow));
  }

  function renderAll() {
    root.classList.toggle("touch-only", touchOnly());
    renderStalls();
    renderCursors();
    renderRaceBar();
  }

  // ---------- effects ----------
  function toast(text) {
    const el = document.createElement("div");
    el.className = "lb-toast";
    el.textContent = text;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }
  function burstAt(el) {
    if (!el) return;
    const x = parseFloat(el.style.left) + 76;
    for (let k = 0; k < 26; k += 1) {
      const piece = document.createElement("div");
      piece.className = "lb-confetti";
      piece.style.backgroundPosition = `${-(k % 6) * 26}px 0`;
      stage.appendChild(piece);
      lobby.confetti.push({ el: piece, x, y: 520, vx: (Math.random() - 0.5) * 520, vy: -260 - Math.random() * 420, r: Math.random() * 360, vr: (Math.random() - 0.5) * 720, t: 0 });
    }
  }

  // ---------- actions ----------
  function join(device, quiet) {
    if (slotOf(device) >= 0) return slotOf(device);
    if (!canJoin()) {
      if (humanCount() < maxHumans() && lobby.cpus.length) {
        lobby.cpus.pop(); // a person bumps a computer racer
      } else {
        if (!quiet) toast(touchOnly() ? "Connect a controller to add players" : "The race is full!");
        return -1;
      }
    }
    const index = nextFree();
    const used = new Set(lobby.slots.filter(Boolean).map(slot => slot.locked ? slot.doll : lobby.roster[slot.cursor]));
    const cursor = lobby.roster.findIndex(key => key !== RANDOM && !used.has(key));
    lobby.slots[index] = { device, cursor: Math.max(0, cursor), locked: false, doll: null, aFresh: false };
    lobby.leftDevices.delete(device);
    lobby.hold = 0;
    renderStalls(`p${index}`);
    renderCursors();
    renderRaceBar();
    if (!quiet) toast(`Here comes P${index + 1}!`);
    sound("ui_select_character");
    return index;
  }

  function lock(index) {
    const slot = lobby.slots[index];
    const pick = lobby.roster[slot.cursor];
    const pool = lobby.roster.filter(key => key !== RANDOM);
    slot.doll = pick === RANDOM ? pool[Math.floor(Math.random() * pool.length)] : pick;
    slot.locked = true;
    slot.aFresh = false;
    renderStalls(`p${index}`);
    renderCursors();
    renderRaceBar();
    burstAt(lobby.stallEls.get(`p${index}`));
    sound("ui_select_character");
  }

  function back(index) {
    const slot = lobby.slots[index];
    if (slot.locked) {
      slot.locked = false;
      lobby.hold = 0;
    } else {
      lobby.leftDevices.add(slot.device);
      lobby.slots[index] = null;
    }
    sound("ui_back");
    renderAll();
  }

  function move(index, dx, dy) {
    const slot = lobby.slots[index];
    if (!slot || slot.locked) return;
    const r = rows();
    let row = slot.cursor < COLS ? 0 : 1;
    let col = row ? slot.cursor - COLS : slot.cursor;
    if (dx) col = (col + dx + r[row].length) % r[row].length;
    if (dy && r[1].length) {
      // Keep the cursor over roughly the same spot when the rows differ in length.
      const x = col + (COLS - r[row].length) / 2;
      row = 1 - row;
      col = clamp(Math.round(x - (COLS - r[row].length) / 2), 0, r[row].length - 1);
    }
    slot.cursor = r[row][col];
    sound("ui_hover");
    renderStalls();
    renderCursors();
  }

  function pickCpuDoll() {
    const taken = new Set([...lobby.slots.filter(Boolean).map(slot => slot.doll || lobby.roster[slot.cursor]), ...lobby.cpus]);
    const pool = lobby.roster.filter(key => key !== RANDOM);
    const free = pool.filter(key => !taken.has(key));
    const from = free.length ? free : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  function changeSetting(row, d) {
    if (row === 0) {
      const index = (BACKGROUNDS.indexOf(getCurrentBackground()) + d + BACKGROUNDS.length) % BACKGROUNDS.length;
      setBackground(BACKGROUNDS[index].key);
      lobby.chosenBackground = BACKGROUNDS[index].key;
    } else if (row === 1) {
      const index = Math.max(0, DIFFICULTIES.findIndex(x => x.key === state.difficulty));
      setDifficulty(DIFFICULTIES[(index + d + DIFFICULTIES.length) % DIFFICULTIES.length].key);
    } else if (row === 2) {
      const index = Math.max(0, SPECIAL_KEYS.indexOf(state.specials));
      setSpecials(SPECIAL_KEYS[(index + d + SPECIAL_KEYS.length) % SPECIAL_KEYS.length]);
      buildGrid();
    } else if (row === 3) {
      const room = MAX_PLAYERS - humanCount();
      const n = clamp(lobby.cpus.length + d, 0, Math.min(MAX_CPUS, room));
      while (lobby.cpus.length < n) lobby.cpus.push(pickCpuDoll());
      lobby.cpus.length = n;
    }
    sound("ui_click");
    renderSettings();
    renderAll();
  }

  function openSettings(open) {
    lobby.settingsOpen = open;
    $("#lbSettings").classList.toggle("off", !open);
    if (open) renderSettings();
    sound(open ? "ui_click" : "ui_back");
  }

  function show(name) {
    lobby.screen = name;
    root.dataset.screen = name;
    $("#lbTitle").classList.toggle("off", name !== "title");
    $("#lbSelect").classList.toggle("off", name !== "select");
    if (name !== "select" && lobby.settingsOpen) openSettings(false);
    if (name === "select") {
      buildGrid();
      autoJoinFirstPad();
      renderAll();
    }
  }

  // The first connected controller is P1 automatically, no button press needed.
  function autoJoinFirstPad() {
    if (lobby.screen !== "select" || humanCount() > 0) return;
    const pad = pads().find(p => !lobby.leftDevices.has(`pad${p.index}`));
    if (pad) join(`pad${pad.index}`, true);
  }

  function startFrom(device) {
    if (lobby.screen !== "title") return;
    GameAudio.unlock();
    sound("ui_click");
    show("select");
    if (device?.startsWith("pad")) join(device, true);
    autoJoinFirstPad();
    if (!humanCount() && device) join(device, true); // no controller: whoever pressed start is P1
  }

  function pointerDevice() {
    if (isTouchDevice()) return "touch";
    return ["wasd", "arrows"].find(scheme => slotOf(scheme) < 0) || null;
  }

  // ---------- starting the race: hand the lobby to the game ----------
  function startRaceFromLobby() {
    if (assetsFailed) { window.location.reload(); return; }
    if (!assetsReady || !allReady()) return;
    // Touch controls only drive player 1, so a touch player always goes first.
    const humans = lobby.slots.filter(Boolean).sort((a, b) => (b.device === "touch") - (a.device === "touch"));
    const cpus = lobby.cpus.slice(0, MAX_PLAYERS - humans.length);
    updateCharacterSelectOptions();
    [...humans.map(slot => slot.doll), ...cpus].forEach((key, index) => {
      if (characterSelects[index]) characterSelects[index].value = key;
    });
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      const device = humans[index]?.device;
      state.slotPads[index] = device?.startsWith("pad") ? Number(device.slice(3)) : null;
      state.slotKeys[index] = device === "wasd" || device === "arrows" ? device : null;
    }
    state.preserveBindings = true;
    const mode = modeKeyFor(humans.length, cpus.length);
    if (humans.length === 1) MOBILE_MODE_VALUES.add(mode);
    gameMode.value = mode;
    state.mode = mode;
    lobby.hold = 0;
    for (const slot of lobby.slots) if (slot) slot.aFresh = false;
    stopLoop();
    GameAudio.unlock();
    startRace(mode);
  }

  // ---------- touch / mouse ----------
  $("#lbTitle").addEventListener("pointerdown", event => { event.preventDefault(); startFrom(pointerDevice()); });

  function tapStall(id) {
    if (lobby.settingsOpen) return;
    GameAudio.unlock();
    if (id === "join") {
      const device = pointerDevice();
      if (!device || slotOf(device) >= 0) {
        toast(isTouchDevice() ? "Connect a controller to add players" : "Press A on a controller to join");
        return;
      }
      lobby.touchFocus = join(device);
      return;
    }
    if (id[0] !== "p") return;
    const index = Number(id.slice(1));
    lobby.touchFocus = index;
    if (lobby.slots[index].locked) back(index);
  }

  function tapCard(cardIndex) {
    if (lobby.settingsOpen) return;
    GameAudio.unlock();
    let index = lobby.touchFocus;
    if (index == null || !lobby.slots[index]) {
      index = lobby.slots.findIndex(slot => slot && !slot.locked && !slot.device.startsWith("pad"));
      if (index < 0) index = lobby.slots.findIndex(slot => slot && !slot.locked);
      if (index < 0) {
        const device = pointerDevice();
        index = device ? join(device) : -1;
        if (index < 0) return;
      }
    }
    lobby.slots[index].locked = false;
    lobby.slots[index].cursor = cardIndex;
    lock(index);
    lobby.touchFocus = lobby.slots.findIndex(slot => slot && !slot.locked);
    if (lobby.touchFocus < 0) lobby.touchFocus = null;
  }

  $("#lbSettingsBtn").addEventListener("pointerdown", event => { event.preventDefault(); GameAudio.unlock(); openSettings(true); });
  $("#lbSetDone").addEventListener("pointerdown", event => { event.preventDefault(); openSettings(false); });
  $("#lbFullscreen").addEventListener("click", () => { toggleFullscreen(); sound("ui_fullscreen"); });
  $("#lbSettings").addEventListener("pointerdown", event => { if (event.target.id === "lbSettings") openSettings(false); });
  root.querySelectorAll(".lb-set-row").forEach(row => {
    row.addEventListener("pointerdown", () => { lobby.setRow = Number(row.dataset.row); renderSettings(); });
    row.querySelectorAll(".lb-arrow").forEach(arrow => arrow.addEventListener("pointerdown", event => {
      event.preventDefault();
      event.stopPropagation();
      lobby.setRow = Number(row.dataset.row);
      changeSetting(lobby.setRow, Number(arrow.dataset.d));
    }));
  });
  $("#lbRaceBar").addEventListener("pointerdown", event => { event.preventDefault(); startRaceFromLobby(); });

  // ---------- keyboard + gamepad ----------
  window.addEventListener("keydown", event => {
    if (!isMenuOpen() || event.repeat) return;
    if (event.code === "Escape" && lobby.settingsOpen) { openSettings(false); return; }
    for (const [scheme, map] of Object.entries(KEYMAP)) {
      const action = map[event.code];
      if (!action) continue;
      event.preventDefault();
      if (!lobby.heldActions.has(scheme)) lobby.heldActions.set(scheme, new Set());
      lobby.heldActions.get(scheme).add(action);
      press(scheme, action);
      return;
    }
    if (lobby.screen === "title") startFrom("wasd");
  });
  window.addEventListener("keyup", event => {
    for (const [scheme, map] of Object.entries(KEYMAP)) {
      const action = map[event.code];
      if (action) lobby.heldActions.get(scheme)?.delete(action);
    }
  });
  window.addEventListener("blur", () => lobby.heldActions.clear());

  function press(device, action) {
    if (lobby.screen === "title") { startFrom(device); return; }
    if (lobby.settingsOpen) {
      if (action === "b" || action === "y" || action === "start") openSettings(false);
      else if (action === "up" || action === "down") { lobby.setRow = (lobby.setRow + (action === "up" ? 3 : 1)) % 4; sound("ui_hover"); renderSettings(); }
      else if (action === "left" || action === "right" || action === "a") changeSetting(lobby.setRow, action === "left" ? -1 : 1);
      return;
    }
    if (action === "y") { openSettings(true); return; }
    const index = slotOf(device);
    if (index < 0) {
      if (["a", "b", "x", "start"].includes(action)) join(device);
      return;
    }
    const slot = lobby.slots[index];
    if (action === "a" || action === "start") {
      if (!slot.locked) lock(index);
      else slot.aFresh = true;
      if (action === "start" && allReady() && humanCount() === 1) startRaceFromLobby();
    } else if (action === "b") back(index);
    else if (action === "left") move(index, -1, 0);
    else if (action === "right") move(index, 1, 0);
    else if (action === "up") move(index, 0, -1);
    else if (action === "down") move(index, 0, 1);
  }

  function pollPads(dt) {
    for (const pad of pads()) {
      const device = `pad${pad.index}`;
      if (!lobby.padPrev.has(device)) lobby.padPrev.set(device, { buttons: [], ax: 0, ay: 0, repeat: 0, fresh: true });
      const prev = lobby.padPrev.get(device);
      const held = new Set();
      pad.buttons.forEach((button, b) => {
        const on = button.pressed;
        if (on) held.add(PAD_BUTTONS[b] || "other");
        // A button already down when we first see the pad (e.g. the A press
        // that started the race on the last screen) isn't a new press.
        const edge = on && !prev.buttons[b] && !prev.fresh;
        if (edge && PAD_BUTTONS[b]) press(device, PAD_BUTTONS[b]);
        else if (edge && lobby.screen === "title") startFrom(device);
        prev.buttons[b] = on;
      });
      if (prev.fresh && lobby.screen === "title" && held.size) startFrom(device);
      prev.fresh = false;
      const ax = Math.abs(pad.axes[0]) > 0.55 ? Math.sign(pad.axes[0]) : 0;
      const ay = Math.abs(pad.axes[1]) > 0.55 ? Math.sign(pad.axes[1]) : 0;
      prev.repeat -= dt;
      const changed = ax !== prev.ax || ay !== prev.ay;
      if (changed || ((ax || ay) && prev.repeat <= 0)) {
        if (ax) press(device, ax < 0 ? "left" : "right");
        else if (ay) press(device, ay < 0 ? "up" : "down");
        prev.repeat = changed ? 0.4 : 0.16;
      }
      prev.ax = ax;
      prev.ay = ay;
      lobby.heldActions.set(device, held);
    }
    autoJoinFirstPad();
  }

  // ---------- loop (runs only while the menu is showing) ----------
  function tick(now) {
    lobby.frame = null;
    if (!isMenuOpen()) return;
    const dt = Math.min(0.05, (now - (lobby.lastTime || now)) / 1000);
    lobby.lastTime = now;
    lobby.time += dt;
    pollPads(dt);
    keysTapped.clear();
    if (lobby.screen === "title") {
      const t = lobby.time;
      $("#lbTitleClouds").style.backgroundPositionX = `${-t * 18}px`;
      $("#lbTitleHills").style.backgroundPositionX = `${-t * 70}px`;
      const ease = 1 - Math.pow(1 - Math.min(1, t / 1.4), 3);
      $("#lbTitleHero").style.transform = `translate(${(1 - ease) * -900}px, ${Math.sin(t * 7) * 6}px)`;
    } else if (!lobby.settingsOpen) {
      const holding = allReady() && assetsReady && lobby.slots.some(slot => slot && slot.aFresh && lobby.heldActions.get(slot.device)?.has("a"));
      const before = lobby.hold;
      lobby.hold = holding ? Math.min(1, lobby.hold + dt / 0.9) : Math.max(0, lobby.hold - dt * 2);
      if (lobby.hold !== before) $("#lbRaceFill").style.width = `${lobby.hold * 100}%`;
      if (lobby.hold >= 1) { startRaceFromLobby(); return; }
      if (lobby.lastAssetsReady !== assetsReady) { lobby.lastAssetsReady = assetsReady; renderRaceBar(); }
    }
    for (let k = lobby.confetti.length - 1; k >= 0; k -= 1) {
      const c = lobby.confetti[k];
      c.t += dt; c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt;
      c.el.style.transform = `translate(${c.x}px, ${c.y}px) rotate(${c.r}deg)`;
      c.el.style.opacity = String(Math.max(0, 1 - c.t / 1.6));
      if (c.t > 1.6) { c.el.remove(); lobby.confetti.splice(k, 1); }
    }
    lobby.frame = requestAnimationFrame(tick);
  }
  function startLoop() {
    if (lobby.frame !== null) return;
    lobby.lastTime = 0;
    lobby.frame = requestAnimationFrame(tick);
  }
  function stopLoop() {
    if (lobby.frame !== null) cancelAnimationFrame(lobby.frame);
    lobby.frame = null;
  }
  window.addEventListener("gamepadconnected", () => { if (isMenuOpen()) { autoJoinFirstPad(); renderAll(); } });
  window.addEventListener("gamepaddisconnected", event => {
    const index = slotOf(`pad${event.gamepad.index}`);
    if (index >= 0 && isMenuOpen()) { lobby.slots[index] = null; renderAll(); }
  });

  // ---------- hooks used by game.js ----------
  window.Lobby = {
    // Before "Main Menu" resets the race, remember who was playing so the
    // select screen comes back with the same players (unlocked to re-pick).
    captureFromRace() {
      const humans = state.racers.filter(racer => !racer.ai).sort((a, b) => a.playerIndex - b.playerIndex);
      if (!humans.length) return;
      lobby.slots = Array(MAX_PLAYERS).fill(null);
      humans.forEach((racer, index) => {
        const pad = state.slotPads[racer.playerIndex];
        const keys = state.slotKeys[racer.playerIndex];
        const device = pad !== null && pad !== undefined ? `pad${pad}` : keys || (isTouchDevice() ? "touch" : "wasd");
        if (slotOf(device) >= 0) return;
        const cursor = Math.max(0, lobby.roster.indexOf(racer.spriteKey));
        lobby.slots[index] = { device, cursor, locked: false, doll: null, aFresh: false };
      });
      lobby.cpus = state.racers.filter(racer => racer.ai).map(racer => racer.spriteKey).slice(0, MAX_CPUS);
    },
    showSelect() {
      for (const prev of lobby.padPrev.values()) prev.fresh = true;
      if (lobby.chosenBackground) setBackground(lobby.chosenBackground);
      show("select");
      startLoop();
    }
  };

  buildGrid();
  glyphs();
  root.dataset.screen = "title";
  fit();
  startLoop();
})();
