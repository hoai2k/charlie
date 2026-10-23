// Players: keyboard, controller and touch input, the computer racers, joining and leaving mid-race, and controller pointers in the menus.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

function isTouchDevice() {
  return mobileQuery.matches;
}

function hasConnectedController() {
  return connectedGamepads(navigator.getGamepads ? navigator.getGamepads() : []).length > 0;
}

const KEYBOARD_SCHEME_LABELS = {
  wasd: "WASD + Space + F",
  arrows: "arrows + Enter + Shift"
};

function controlDescription(index, humanCount) {
  const scheme = defaultKeyboardScheme(index, humanCount);
  const pad = `controller ${index + 1}`;
  return scheme ? `${pad} or ${KEYBOARD_SCHEME_LABELS[scheme]}` : pad;
}

// The two keyboard schemes go to P1/P2 in a two-player game and to the last
// two players otherwise (the same layout the 3- and 4-player modes always had).
function defaultKeyboardScheme(index, humanCount) {
  if (humanCount <= 2) {
    if (index === 0) return "wasd";
    if (index === 1) return "arrows";
    return null;
  }
  if (index === humanCount - 2) return "wasd";
  if (index === humanCount - 1) return "arrows";
  return null;
}

function getHumanLeadX() {
  const humanRacers = state.racers.filter(racer => !racer.ai && !racer.finished);
  if (humanRacers.length === 0) return 0;
  return Math.max(...humanRacers.map(racer => racer.x));
}

function getAiHumanGap(racer) {
  return racer.x - getHumanLeadX();
}

function playerInput(index, gamepads) {
  const keyboard = keyboardInputForPlayer(index);
  const pad = getSlotGamepad(index, gamepads);
  const up = keyboard.up;
  const down = keyboard.down;
  const right = keyboard.right;
  const left = keyboard.left;
  const jump = keyboard.jump;
  const push = keyboard.push;
  let horizontal = (right ? 1 : 0) - (left ? 1 : 0);
  let vertical = (down ? 1 : 0) - (up ? 1 : 0);
  let wantsJump = jump;
  let wantsPush = push;

  if (index === 0 && isTouchDevice()) {
    horizontal += touchInput.horizontal;
    vertical += touchInput.vertical;
    wantsJump = wantsJump || touchInput.jump;
    wantsPush = wantsPush || touchInput.push;
  }

  if (pad) {
    const axisY = Math.abs(pad.axes[1]) > 0.18 ? pad.axes[1] : 0;
    const axisX = Math.abs(pad.axes[0]) > 0.18 ? pad.axes[0] : 0;
    const dpadY = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
    const dpadX = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
    horizontal += axisX + dpadX;
    vertical += axisY;
    vertical += dpadY;
    wantsJump = wantsJump || pad.buttons[0]?.pressed;
    wantsPush = wantsPush || pad.buttons[2]?.pressed;
  }

  return {
    horizontal: clamp(horizontal, -1, 1),
    vertical: clamp(vertical, -1, 1),
    jump: wantsJump,
    push: wantsPush
  };
}

function keyboardInputForPlayer(index) {
  return keyboardSchemeInput(state.slotKeys[index]);
}

function keyboardSchemeInput(scheme) {
  if (scheme === "wasd") return wasdInput();
  if (scheme === "arrows") return arrowsInput();
  return emptyKeyboardInput();
}

function wasdInput() {
  return {
    up: keys.has("KeyW"),
    down: keys.has("KeyS"),
    left: keys.has("KeyA"),
    right: keys.has("KeyD"),
    jump: keys.has("Space"),
    push: keys.has("KeyF")
  };
}

function arrowsInput() {
  return {
    up: keys.has("ArrowUp"),
    down: keys.has("ArrowDown"),
    left: keys.has("ArrowLeft"),
    right: keys.has("ArrowRight"),
    jump: keys.has("Enter"),
    push: keys.has("ShiftLeft") || keys.has("ShiftRight")
  };
}

function emptyKeyboardInput() {
  return { up: false, down: false, left: false, right: false, jump: false, push: false };
}

function isMenuOpen() {
  return !startPanel.classList.contains("hidden") && !state.running;
}

function isRaceActive() {
  return state.running && !state.paused && !state.done;
}

function getActiveHumanSlots() {
  if (isMenuOpen()) {
    const config = MODE_CONFIG[gameMode.value] || getModeConfig();
    return Array.from({ length: Math.min(MAX_PLAYERS, config.humans) }, (_, index) => index);
  }
  return state.racers.filter(racer => !racer.ai).map(racer => racer.playerIndex).sort((a, b) => a - b);
}

function setupSlotBindings(humanCount) {
  if (state.preserveBindings) {
    state.preserveBindings = false;
  } else {
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      state.slotKeys[index] = index < humanCount ? defaultKeyboardScheme(index, humanCount) : null;
    }
  }
  for (let index = humanCount; index < MAX_PLAYERS; index += 1) {
    state.slotPads[index] = null;
    state.slotKeys[index] = null;
  }
  state.slotDisconnectTimers.clear();
  state.padLeaveHold.clear();
  state.retiredPads.clear();
  const slots = Array.from({ length: humanCount }, (_, index) => index);
  autoAssignPads(slots, connectedGamepads(navigator.getGamepads ? navigator.getGamepads() : []));
}

function autoAssignPads(slots, pads) {
  const connectedIds = new Set(pads.map(pad => pad.index));
  const taken = new Set(slots.map(slot => state.slotPads[slot]).filter(id => id !== null && connectedIds.has(id)));
  const free = pads.filter(pad => !taken.has(pad.index) && !getJoinPickerForPad(pad.index) && !state.retiredPads.has(pad.index));
  for (const slot of slots) {
    if (free.length === 0) break;
    const current = state.slotPads[slot];
    if (current !== null && connectedIds.has(current)) continue;
    state.slotPads[slot] = free.shift().index;
  }
}

function getSlotForPad(padIndex) {
  return getActiveHumanSlots().find(slot => state.slotPads[slot] === padIndex) ?? -1;
}

function getSlotGamepad(slot, gamepads) {
  const id = state.slotPads[slot];
  if (id === null || id === undefined) return null;
  return connectedGamepads(gamepads).find(pad => pad.index === id) || null;
}

function getLeaveHoldProgress(slot) {
  return clamp((state.padLeaveHold.get(slot) || 0) / LEAVE_HOLD_SECONDS, 0, 1);
}

function isKeyboardSchemeBound(scheme) {
  return getActiveHumanSlots().some(slot => state.slotKeys[slot] === scheme);
}

function keyHeldOrTapped(code) {
  return keys.has(code) || keysTapped.has(code);
}

function keyboardJoinPressed(scheme) {
  return keyHeldOrTapped(scheme === "wasd" ? "Space" : "Enter");
}

function pollPlayerJoinAndLeave(dt, gamepads = navigator.getGamepads ? navigator.getGamepads() : []) {
  const pads = connectedGamepads(gamepads);
  const slots = getActiveHumanSlots();
  autoAssignPads(slots, pads);
  const connectedIds = new Set(pads.map(pad => pad.index));

  for (const pad of pads) {
    const down = JOIN_BUTTONS.some(button => pad.buttons[button]?.pressed);
    // A browser only reveals a controller after a button press, so the press
    // that makes it appear counts as a join press.
    const wasDown = state.padButtonsDown.get(pad.index) ?? false;
    state.padButtonsDown.set(pad.index, down);
    const slot = slots.find(candidate => state.slotPads[candidate] === pad.index) ?? -1;
    if (slot === -1) {
      if (down && !wasDown && !getJoinPickerForPad(pad.index)) openJoinPicker({ pad: pad.index });
      continue;
    }
    if (pad.buttons[LEAVE_BUTTON]?.pressed) {
      const held = (state.padLeaveHold.get(slot) || 0) + dt;
      state.padLeaveHold.set(slot, held);
      if (held >= LEAVE_HOLD_SECONDS) {
        state.padLeaveHold.delete(slot);
        removePlayerSlot(slot);
      }
    } else {
      state.padLeaveHold.delete(slot);
    }
  }
  for (const id of Array.from(state.padButtonsDown.keys())) {
    if (!connectedIds.has(id)) state.padButtonsDown.delete(id);
  }

  if (isRaceActive()) {
    state.keyJoinDown = state.keyJoinDown || {};
    for (const scheme of ["wasd", "arrows"]) {
      const down = keyboardJoinPressed(scheme);
      const wasDown = (state.keyJoinDown[scheme] ?? true) && !keysTapped.has(scheme === "wasd" ? "Space" : "Enter");
      state.keyJoinDown[scheme] = down;
      if (down && !wasDown && !isKeyboardSchemeBound(scheme) && !getJoinPickerForKeys(scheme)) {
        openJoinPicker({ keys: scheme });
      }
    }
    for (const slot of getActiveHumanSlots()) {
      const id = state.slotPads[slot];
      const lostPad = id !== null && !connectedIds.has(id);
      const hasOtherInput = Boolean(state.slotKeys[slot]) || (slot === 0 && isTouchDevice());
      if (!lostPad || hasOtherInput) {
        state.slotDisconnectTimers.delete(slot);
        continue;
      }
      const waited = (state.slotDisconnectTimers.get(slot) || 0) + dt;
      state.slotDisconnectTimers.set(slot, waited);
      if (waited >= DISCONNECT_LEAVE_SECONDS) {
        state.slotDisconnectTimers.delete(slot);
        removePlayerSlot(slot);
      }
    }
  }
  updateJoinPickers(dt, pads);
  keysTapped.clear();
}

function getJoinPickerForPad(padIndex) {
  return state.joinPickers.find(picker => picker.pad === padIndex) || null;
}

function getJoinPickerForKeys(scheme) {
  return state.joinPickers.find(picker => picker.keys === scheme) || null;
}

function countPlayersAfterPendingJoins() {
  return getActiveHumanSlots().length + state.joinPickers.length;
}

function openJoinPicker(source) {
  if (!assetsReady || state.done || state.paused) return null;
  if (!isMenuOpen() && !state.running) return null;
  if (countPlayersAfterPendingJoins() >= MAX_PLAYERS) {
    showJoinTrayMessage("The race is full (8 players)");
    return null;
  }
  const visible = getVisibleCharacterEntries().map(([key]) => key);
  const used = new Set(state.racers.filter(racer => !racer.ai).map(racer => racer.spriteKey));
  for (const picker of state.joinPickers) used.add(picker.character);
  const character = visible.find(key => !used.has(key)) || visible[0];
  const element = document.createElement("div");
  element.className = "join-card";
  const picker = {
    pad: source.pad ?? null,
    keys: source.keys ?? null,
    character,
    armed: false,
    lastDirection: 0,
    repeatTimer: 0,
    element
  };
  state.joinPickers.push(picker);
  joinTray?.appendChild(element);
  renderJoinPickers();
  GameAudio.unlock();
  GameAudio.play("ui_click");
  return picker;
}

function closeJoinPicker(picker) {
  state.joinPickers = state.joinPickers.filter(candidate => candidate !== picker);
  picker.element.remove();
  // The confirm/cancel press must not immediately count as a join press.
  if (picker.pad !== null) state.padButtonsDown.set(picker.pad, true);
  renderJoinPickers();
}

function predictedJoinSlot(picker) {
  const order = state.joinPickers.indexOf(picker);
  if (isMenuOpen()) return getActiveHumanSlots().length + Math.max(0, order);
  const used = new Set(state.racers.filter(racer => !racer.ai).map(racer => racer.playerIndex));
  let skipped = 0;
  for (let slot = 0; slot < MAX_PLAYERS; slot += 1) {
    if (used.has(slot)) continue;
    if (skipped === order) return slot;
    skipped += 1;
  }
  return MAX_PLAYERS - 1;
}

function renderJoinPickers() {
  if (!joinTray) return;
  joinTray.classList.toggle("hidden", state.joinPickers.length === 0 && !joinTray.dataset.message);
  for (const picker of state.joinPickers) {
    const character = characters[picker.character];
    const slot = predictedJoinSlot(picker);
    const confirm = picker.keys === "wasd" ? "Space" : picker.keys === "arrows" ? "Enter" : "A";
    const cancel = picker.keys === "wasd" ? "F" : picker.keys === "arrows" ? "Shift" : "B";
    const signature = `${slot}|${picker.character}|${confirm}`;
    if (picker.element.dataset.signature === signature) continue;
    picker.element.dataset.signature = signature;
    picker.element.style.setProperty("--slot-color", slotColor(slot));
    picker.element.replaceChildren();
    // Same look as the select screen: rosette, portrait card, name, prompt.
    const title = document.createElement("div");
    title.className = "join-card-title";
    const rosette = document.createElement("span");
    rosette.className = "join-card-badge";
    rosette.style.backgroundPosition = `${(slot % 8) * (100 / 7)}% 0`;
    title.append(rosette, document.createTextNode(`Here comes P${slot + 1}!`));
    const sprite = document.createElement("div");
    sprite.className = "join-card-portrait";
    sprite.style.backgroundImage = `url("assets/portraits/${dollAssetKey(character.spriteKey)}_wave.webp")`;
    const name = document.createElement("div");
    name.className = "join-card-name";
    name.innerHTML = `<span class="join-arrow">◀</span>${character.name}<span class="join-arrow">▶</span>`;
    const hint = document.createElement("div");
    hint.className = "join-card-hint";
    if (picker.keys) {
      hint.textContent = `${confirm}: race · ${cancel}: cancel`;
    } else {
      hint.innerHTML = `<span class="lb-glyph join-glyph-a"></span>race <span class="lb-glyph join-glyph-b"></span>cancel`;
    }
    picker.element.append(title, sprite, name, hint);
  }
}

let joinTrayMessageTimer = null;

function showJoinTrayMessage(text) {
  if (!joinTray) return;
  let message = joinTray.querySelector(".join-tray-message");
  if (!message) {
    message = document.createElement("div");
    message.className = "join-tray-message";
    joinTray.prepend(message);
  }
  message.textContent = text;
  joinTray.dataset.message = "1";
  joinTray.classList.remove("hidden");
  clearTimeout(joinTrayMessageTimer);
  joinTrayMessageTimer = setTimeout(() => {
    message.remove();
    delete joinTray.dataset.message;
    renderJoinPickers();
  }, 1800);
}

function readJoinPickerInput(picker, pads) {
  if (picker.pad !== null) {
    const pad = pads.find(candidate => candidate.index === picker.pad);
    if (!pad) return null;
    const axisX = Math.abs(pad.axes[0]) > 0.5 ? pad.axes[0] : 0;
    const dpadX = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
    return {
      direction: Math.sign(axisX + dpadX),
      confirm: Boolean(pad.buttons[0]?.pressed || pad.buttons[9]?.pressed),
      cancel: Boolean(pad.buttons[1]?.pressed)
    };
  }
  const codes = picker.keys === "wasd"
    ? { left: "KeyA", right: "KeyD", confirm: "Space", cancel: "KeyF" }
    : { left: "ArrowLeft", right: "ArrowRight", confirm: "Enter", cancel: "ShiftLeft" };
  const tapped = code => keysTapped.has(code) && !keys.has(code);
  // A tap that already ended is fed through as a fresh press.
  if (tapped(codes.left) || tapped(codes.right)) picker.lastDirection = 0;
  return {
    direction: (keyHeldOrTapped(codes.right) ? 1 : 0) - (keyHeldOrTapped(codes.left) ? 1 : 0),
    confirm: keyHeldOrTapped(codes.confirm),
    cancel: keyHeldOrTapped(codes.cancel) || (picker.keys === "arrows" && keyHeldOrTapped("ShiftRight"))
  };
}

function updateJoinPickers(dt, pads) {
  for (const picker of state.joinPickers.slice()) {
    const input = readJoinPickerInput(picker, pads);
    if (!input) {
      closeJoinPicker(picker);
      continue;
    }
    if (!picker.armed) {
      // Wait for the button that opened the card to be released.
      if (!input.confirm && !input.cancel) picker.armed = true;
      picker.lastDirection = input.direction;
      continue;
    }
    if (input.direction !== 0) {
      const fresh = input.direction !== picker.lastDirection;
      picker.repeatTimer -= dt;
      if (fresh || picker.repeatTimer <= 0) {
        stepJoinPickerCharacter(picker, input.direction);
        picker.repeatTimer = fresh ? PICKER_REPEAT_DELAY : PICKER_REPEAT_RATE;
      }
    }
    picker.lastDirection = input.direction;
    if (input.cancel) {
      GameAudio.play("ui_back");
      closeJoinPicker(picker);
    } else if (input.confirm) {
      commitJoinPicker(picker);
    }
  }
}

function stepJoinPickerCharacter(picker, direction) {
  const visible = getVisibleCharacterEntries().map(([key]) => key);
  const index = Math.max(0, visible.indexOf(picker.character));
  picker.character = visible[(index + direction + visible.length) % visible.length];
  GameAudio.play("ui_select_character");
  renderJoinPickers();
}

function modeKeyFor(humans, ais) {
  const existing = Object.entries(MODE_CONFIG).find(([, config]) => config.humans === humans && config.ais === ais);
  if (existing) return existing[0];
  const key = `custom-${humans}-${ais}`;
  MODE_CONFIG[key] = { humans, ais };
  const option = document.createElement("option");
  option.value = key;
  option.textContent = `${humans} Player${humans === 1 ? "" : "s"}${ais > 0 ? ` + ${ais} AI${ais === 1 ? "" : "s"}` : ""}`;
  gameMode.appendChild(option);
  return key;
}

function commitJoinPicker(picker) {
  closeJoinPicker(picker);
  if (isMenuOpen()) {
    const config = MODE_CONFIG[gameMode.value] || getModeConfig();
    const humans = Math.min(MAX_PLAYERS, config.humans);
    if (humans >= MAX_PLAYERS) return;
    const ais = Math.min(config.ais, MAX_PLAYERS - (humans + 1));
    // Shift any AI picks up a slot so they keep their dolls.
    for (let index = Math.min(MAX_PLAYERS - 1, humans + ais); index > humans; index -= 1) {
      if (characterSelects[index] && characterSelects[index - 1]) characterSelects[index].value = characterSelects[index - 1].value;
    }
    characterSelects[humans].value = picker.character;
    state.slotPads[humans] = picker.pad;
    const mode = modeKeyFor(humans + 1, ais);
    gameMode.value = mode;
    state.mode = mode;
    updateModeLabels();
    resetRace(mode);
    if (picker.keys) state.slotKeys[humans] = picker.keys;
    drawScene(0);
    GameAudio.play("ui_select_character");
    return;
  }
  if (state.running && !state.done) spawnJoinedPlayer(picker);
}

function spawnJoinedPlayer(picker) {
  const humans = state.racers.filter(racer => !racer.ai);
  if (humans.length >= MAX_PLAYERS) return null;
  if (state.racers.length >= MAX_PLAYERS) {
    const ai = state.racers.filter(racer => racer.ai).sort((a, b) => b.x - a.x)[0];
    if (!ai) return null;
    removeRacer(ai);
  }
  const used = new Set(state.racers.map(racer => racer.playerIndex));
  let slot = 0;
  while (used.has(slot)) slot += 1;
  const character = characters[picker.character] || characters[CHARACTER_FALLBACKS[slot]];
  const spawn = findJoinSpawnPoint();
  const racer = makeRacer(
    character.name,
    character.spriteKey,
    character.image(),
    slot,
    spawn.x,
    spawn.y,
    false,
    character.color,
    475,
    character.riderYOffset,
    character.riderXOffset
  );
  racer.joinFlashTimer = 1.4;
  if (window.DollOutfits) {
    const used = new Set(state.racers.filter(other => other.spriteKey === racer.spriteKey).map(other => other.outfit || 0));
    applyRacerOutfit(racer, DollOutfits.firstFree(racer.spriteKey, used));
  }
  state.racers.push(racer);
  state.retiredPads.delete(picker.pad);
  state.slotPads[slot] = picker.pad;
  state.slotKeys[slot] = picker.keys;
  state.slotDisconnectTimers.delete(slot);
  updatePlayerLabels();
  updateHud();
  GameAudio.play("ui_select_character");
  racerVoice(racer, "race_start", { chance: 0.8, priority: 1 });
  return racer;
}

// New players start just behind the last human still racing, in the lane
// with the most room, and never inside a hurdle.
function findJoinSpawnPoint() {
  // Measure from players who were already racing, so several people joining
  // at once land side by side instead of each one behind the last.
  const settled = state.racers.filter(racer => !racer.ai && !racer.finished && !(racer.joinFlashTimer > 0));
  const active = settled.length > 0 ? settled : state.racers.filter(racer => !racer.ai && !racer.finished);
  const pool = active.length > 0 ? active : state.racers.filter(racer => !racer.finished);
  const trailX = pool.length > 0 ? Math.min(...pool.map(racer => racer.x)) : RACER_STARTS[0].x;
  let x = clamp(trailX - 90, 60, FINISH - 600);
  for (let guard = 0; guard < 8; guard += 1) {
    const blocked = state.obstacles.some(obstacle => Math.abs(obstacle.x - x) < HURDLE_W + 30);
    if (!blocked) break;
    x = Math.max(60, x - 70);
  }
  // Five lanes spread over this track's band (508-636 on the default band).
  const lanes = [0, 1, 2, 3, 4].map(i => startYInTrack(508 + i * 32));
  let best = lanes[0];
  let bestScore = -Infinity;
  for (const y of lanes) {
    let score = Infinity;
    for (const racer of state.racers) {
      score = Math.min(score, Math.hypot((racer.x - x) * 0.5, racer.y - y));
    }
    if (score > bestScore) {
      bestScore = score;
      best = y;
    }
  }
  return { x, y: best };
}

function removeRacer(racer) {
  state.racers = state.racers.filter(candidate => candidate !== racer);
  for (const monster of state.monsters) {
    if (monster.target === racer) {
      monster.target = null;
      if (["grab", "lift", "throw"].includes(monster.state)) monster.state = "walk";
    }
  }
  for (const obstacle of state.obstacles) {
    if (obstacle.amandaTarget === racer) obstacle.amandaTarget = null;
  }
  for (const other of state.racers) other.pushedTargets?.delete(racer);
  GameAudio.stopLoop(racerLoopId(racer, "mount"));
  GameAudio.stopLoop(racerLoopId(racer, "oil"));
  GameAudio.stopLoop(racerLoopId(racer, "frozen"));
  updatePlayerLabels();
  updateHud();
}

function removePlayerSlot(slot) {
  if (isMenuOpen()) {
    const config = MODE_CONFIG[gameMode.value] || getModeConfig();
    if (config.humans <= 1 || slot >= config.humans) return;
    const total = Math.min(MAX_PLAYERS, config.humans + config.ais);
    for (let index = slot; index < total - 1; index += 1) {
      characterSelects[index].value = characterSelects[index + 1].value;
      state.slotPads[index] = state.slotPads[index + 1];
    }
    state.slotPads[total - 1] = null;
    const mode = modeKeyFor(config.humans - 1, config.ais);
    gameMode.value = mode;
    state.mode = mode;
    updateModeLabels();
    resetRace(mode);
    drawScene(0);
    GameAudio.play("ui_back");
    return;
  }
  const humans = state.racers.filter(racer => !racer.ai);
  const racer = humans.find(candidate => candidate.playerIndex === slot);
  if (!racer || humans.length <= 1 || state.done) return;
  removeRacer(racer);
  if (state.slotPads[slot] !== null) state.retiredPads.add(state.slotPads[slot]);
  state.slotPads[slot] = null;
  state.slotKeys[slot] = null;
  state.slotDisconnectTimers.delete(slot);
  state.padLeaveHold.delete(slot);
  GameAudio.play("ui_back");
}

// Between races, renumber the players who are still here as P1..Pn and
// make that the mode, so the next race keeps everyone who joined mid-race.
function compactSlotsForNextRace() {
  const humans = state.racers.filter(racer => !racer.ai).sort((a, b) => a.playerIndex - b.playerIndex);
  const ais = state.racers.filter(racer => racer.ai).sort((a, b) => a.playerIndex - b.playerIndex);
  if (humans.length === 0) return;
  const pads = humans.map(racer => state.slotPads[racer.playerIndex] ?? null);
  const schemes = humans.map(racer => state.slotKeys[racer.playerIndex] ?? null);
  humans.concat(ais).forEach((racer, index) => {
    if (characterSelects[index]) characterSelects[index].value = racer.spriteKey;
  });
  state.raceOutfits = humans.concat(ais).map(racer => racer.outfit || 0);
  for (let index = 0; index < MAX_PLAYERS; index += 1) {
    state.slotPads[index] = pads[index] ?? null;
    state.slotKeys[index] = schemes[index] ?? null;
  }
  state.preserveBindings = true;
  const mode = modeKeyFor(humans.length, Math.min(ais.length, MAX_PLAYERS - humans.length));
  gameMode.value = mode;
  state.mode = mode;
  updateModeLabels();
}

function clearJoinPickers() {
  for (const picker of state.joinPickers.slice()) closeJoinPicker(picker);
}

function connectedGamepads(gamepads) {
  return Array.from(gamepads).filter(Boolean).sort((a, b) => a.index - b.index);
}

function updateControllerPointers(dt) {
  const pads = connectedGamepads(navigator.getGamepads ? navigator.getGamepads() : []);
  const frameRect = gameFrame.getBoundingClientRect();
  controllerPointerLayer.classList.toggle("hidden", pads.length === 0 || (state.running && !state.paused));
  const shown = new Set();
  pads.forEach((pad, order) => {
    // A controller that is choosing a character in a join card (or is a
    // spare that hasn't joined yet) doesn't drive a menu pointer.
    if (getJoinPickerForPad(pad.index)) return;
    const slot = getSlotForPad(pad.index);
    if (slot === -1) return;
    const pointer = getControllerPointer(pad.index, order, frameRect);
    shown.add(pointer);
    const axisX = Math.abs(pad.axes[0]) > CONTROLLER_POINTER_DEADZONE ? pad.axes[0] : 0;
    const axisY = Math.abs(pad.axes[1]) > CONTROLLER_POINTER_DEADZONE ? pad.axes[1] : 0;
    const dpadX = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
    const dpadY = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
    const moveX = Math.abs(axisX) > 0 ? axisX : dpadX;
    const moveY = Math.abs(axisY) > 0 ? axisY : dpadY;
    pointer.x = clamp(pointer.x + moveX * CONTROLLER_POINTER_SPEED * dt, 0, Math.max(0, frameRect.width - CONTROLLER_POINTER_SIZE));
    pointer.y = clamp(pointer.y + moveY * CONTROLLER_POINTER_SPEED * dt, 0, Math.max(0, frameRect.height - CONTROLLER_POINTER_SIZE));
    pointer.element.style.transform = `translate(${pointer.x}px, ${pointer.y}px) rotate(-18deg)`;
    pointer.element.style.setProperty("--pointer-color", getControllerPointerColor(slot));
    pointer.element.classList.remove("hidden");

    const clickPressed = Boolean(pad.buttons[0]?.pressed);
    if (clickPressed && !pointer.clickPressed) handleControllerPointerClick(pointer, slot, frameRect);
    pointer.clickPressed = clickPressed;
  });
  for (const pointer of controllerPointers.values()) {
    if (shown.has(pointer)) continue;
    pointer.element.classList.add("hidden");
    pointer.clickPressed = true;
  }
}

function getControllerPointer(padIndex, order, frameRect) {
  if (controllerPointers.has(padIndex)) return controllerPointers.get(padIndex);
  const element = document.createElement("div");
  element.className = "controller-pointer";
  controllerPointerLayer.appendChild(element);
  const pointer = {
    x: clamp(frameRect.width * (0.44 + (order % 8) * 0.04), 0, Math.max(0, frameRect.width - CONTROLLER_POINTER_SIZE)),
    y: clamp(frameRect.height * 0.68, 0, Math.max(0, frameRect.height - CONTROLLER_POINTER_SIZE)),
    // Start "pressed" so the A press that joined a player doesn't also click.
    clickPressed: true,
    element
  };
  controllerPointers.set(padIndex, pointer);
  return pointer;
}

function getControllerPointerColor(slot) {
  if (slot < 0) return "#7a8a94";
  const character = getSelectedCharacter(characterSelects[slot], CHARACTER_FALLBACKS[slot] || CHARACTER_FALLBACKS[0]);
  return character.color;
}

function hideControllerPointers() {
  controllerPointerLayer.classList.add("hidden");
  for (const pointer of controllerPointers.values()) {
    pointer.element.classList.add("hidden");
    pointer.clickPressed = false;
  }
}

function handleControllerPointerClick(pointer, index, frameRect) {
  const clientX = frameRect.left + pointer.x;
  const clientY = frameRect.top + pointer.y;
  const target = document.elementFromPoint(clientX, clientY);
  const select = target?.closest?.("select");
  if (select && gameFrame.contains(select) && !select.disabled && select.getClientRects().length > 0) {
    cycleControllerSelect(select);
    return;
  }
  const button = target?.closest?.("button");
  if (button && gameFrame.contains(button) && !button.disabled && button.getClientRects().length > 0) {
    button.click();
    return;
  }
  if (!startPanel.classList.contains("hidden")) chooseMenuCharacterAt(clientX, clientY, index);
}

function cycleControllerSelect(select) {
  const options = Array.from(select.options).filter(option => !option.disabled && !option.hidden);
  if (options.length === 0) return;
  const currentIndex = options.findIndex(option => option.value === select.value);
  const nextOption = options[(currentIndex + 1 + options.length) % options.length];
  select.focus({ preventScroll: true });
  select.value = nextOption.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function chooseMenuCharacterAt(clientX, clientY, slot) {
  const canvasPoint = clientToCanvasPoint(clientX, clientY);
  const item = getMenuCharacterHit(canvasPoint.x, canvasPoint.y);
  if (!item) return false;
  const select = characterSelects[slot];
  if (!select) return false;
  select.value = item.key;
  if (select.value !== item.key) return false;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  resetRace(state.mode);
  drawScene(0);
  return true;
}

function clientToCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / Math.max(1, rect.width)) * W,
    y: ((clientY - rect.top) / Math.max(1, rect.height)) * H
  };
}

function getMenuCharacterHit(x, y) {
  const visiblePreview = menuCharacterPreview.filter(item => isAllDollsMode() || !characters[item.key].hidden);
  for (let index = visiblePreview.length - 1; index >= 0; index -= 1) {
    const item = visiblePreview[index];
    if (menuCharacterNameHit(item, x, y) || menuCharacterSpriteHit(item, x, y)) return item;
  }
  return null;
}

function getMenuCharacterDrawInfo(item) {
  const character = characters[item.key];
  const frame = Math.floor(performance.now() / 420) % 3;
  const scale = racerDepthScale({ y: item.y });
  const spriteScale = scale;
  const drawW = FRAME * spriteScale;
  const drawH = FRAME * spriteScale;
  const drawX = item.x - SPRITE_ANCHOR_X * spriteScale;
  const drawY = item.y + 54 - SPRITE_ANCHOR_Y * spriteScale;
  return {
    character,
    frame,
    sx: frame * FRAME,
    sy: 0,
    drawX,
    drawY,
    drawW,
    drawH,
    labelY: drawY - 8
  };
}

function menuCharacterSpriteHit(item, x, y) {
  const draw = getMenuCharacterDrawInfo(item);
  if (x < draw.drawX || x > draw.drawX + draw.drawW || y < draw.drawY || y > draw.drawY + draw.drawH) return false;
  const sourceX = Math.floor(draw.sx + ((x - draw.drawX) / draw.drawW) * FRAME);
  const sourceY = Math.floor(draw.sy + ((y - draw.drawY) / draw.drawH) * FRAME);
  const sourceRadius = Math.max(2, Math.ceil(8 / (draw.drawW / FRAME)));
  const alphaHit = spriteAlphaRayHit(draw.character.image(), sourceX, sourceY, sourceRadius);
  return alphaHit === null ? menuCharacterSilhouetteHit(x, y, draw) : alphaHit;
}

function menuCharacterNameHit(item, x, y) {
  const draw = getMenuCharacterDrawInfo(item);
  ctx.save();
  ctx.font = "800 18px system-ui";
  const textWidth = ctx.measureText(draw.character.name).width;
  ctx.restore();
  const paddingX = 12;
  return x >= item.x - textWidth / 2 - paddingX
    && x <= item.x + textWidth / 2 + paddingX
    && y >= draw.labelY - 22
    && y <= draw.labelY + 7;
}

function getSpriteAlpha(image, x, y) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return 0;
  let alphaCanvas = spriteAlphaCanvases.get(image);
  if (!alphaCanvas) {
    alphaCanvas = document.createElement("canvas");
    alphaCanvas.width = image.width;
    alphaCanvas.height = image.height;
    const alphaCtx = alphaCanvas.getContext("2d");
    alphaCtx.drawImage(image, 0, 0);
    spriteAlphaCanvases.set(image, alphaCanvas);
  }
  const alphaCtx = alphaCanvas.getContext("2d");
  try {
    return alphaCtx.getImageData(x, y, 1, 1).data[3];
  } catch (error) {
    if (error?.name === "SecurityError") return null;
    throw error;
  }
}

function spriteAlphaRayHit(image, centerX, centerY, radius) {
  const centerAlpha = getSpriteAlpha(image, centerX, centerY);
  if (centerAlpha === null) return null;
  if (centerAlpha > 32) return true;
  for (let distance = 1; distance <= radius; distance += 1) {
    for (let x = centerX - distance; x <= centerX + distance; x += 1) {
      const topAlpha = getSpriteAlpha(image, x, centerY - distance);
      const bottomAlpha = getSpriteAlpha(image, x, centerY + distance);
      if (topAlpha === null || bottomAlpha === null) return null;
      if (topAlpha > 32 || bottomAlpha > 32) return true;
    }
    for (let y = centerY - distance + 1; y <= centerY + distance - 1; y += 1) {
      const leftAlpha = getSpriteAlpha(image, centerX - distance, y);
      const rightAlpha = getSpriteAlpha(image, centerX + distance, y);
      if (leftAlpha === null || rightAlpha === null) return null;
      if (leftAlpha > 32 || rightAlpha > 32) return true;
    }
  }
  return false;
}

function menuCharacterSilhouetteHit(x, y, draw) {
  const localX = (x - draw.drawX) / draw.drawW;
  const localY = (y - draw.drawY) / draw.drawH;
  return ellipseHit(localX, localY, 0.5, 0.26, 0.2, 0.18)
    || ellipseHit(localX, localY, 0.5, 0.52, 0.18, 0.28)
    || ellipseHit(localX, localY, 0.42, 0.79, 0.08, 0.22)
    || ellipseHit(localX, localY, 0.58, 0.79, 0.08, 0.22)
    || ellipseHit(localX, localY, 0.35, 0.53, 0.08, 0.24)
    || ellipseHit(localX, localY, 0.65, 0.53, 0.08, 0.24);
}

function ellipseHit(x, y, centerX, centerY, radiusX, radiusY) {
  const dx = (x - centerX) / radiusX;
  const dy = (y - centerY) / radiusY;
  return dx * dx + dy * dy <= 1;
}

function aiInput(racer) {
  const viewWidth = getExpectedViewportWidth();
  const gap = getAiHumanGap(racer);
  const aheadBy = Math.max(0, gap);
  const behindBy = Math.max(0, -gap);
  let vertical = 0;
  let jump = false;
  let horizontal = 1;

  if (aheadBy >= viewWidth * AI_AHEAD_WANDER_START) racer.aiWanderAhead = true;
  if (aheadBy <= viewWidth * AI_AHEAD_WANDER_END) racer.aiWanderAhead = false;

  // A gap in a cloud floor just ahead: jump it.
  const gapJump = Boolean(cloudGapAhead(racer.x, racer.facing, isMounted(racer) ? 90 : 60, racer.y + 54));

  if (racer.aiWanderAhead) {
    const wander = Math.sin(performance.now() * 0.0017 + racer.playerIndex * 2.4);
    return {
      horizontal: 0.08 + Math.max(0, Math.sin(performance.now() * 0.0009 + racer.playerIndex)) * 0.12,
      vertical: wander > 0.25 ? 0.55 : wander < -0.25 ? -0.55 : 0,
      jump: gapJump,
      push: false
    };
  }

  if (behindBy > viewWidth * AI_BEHIND_CATCHUP) {
    horizontal = Math.max(1, racer.maxSpeed / AI_RUN_SPEED);
    const targetPowerup = state.powerups.find(powerup => {
      if (powerup.taken || hasActivePowerup(racer, powerup.type)) return false;
      if (isPowerupDropping(powerup)) return false;
      return powerup.x > racer.x + 20 && powerup.x < racer.x + viewWidth;
    });
    if (targetPowerup) {
      vertical = Math.sign(targetPowerup.y - (racer.y + 54)) * 0.9;
    }
  }

  const shouldAvoidObstacles = aheadBy < viewWidth * AI_AHEAD_IGNORE_OBSTACLES;
  const next = shouldAvoidObstacles
    ? state.obstacles.find(o => o.x > racer.x + 20 && o.x < racer.x + 260)
    : null;
  if (next) {
    const targetY = next.y > (PATH_TOP + TRACK_BOTTOM) / 2 ? PATH_TOP + 34 : TRACK_BOTTOM - 26;
    vertical = Math.sign(targetY - racer.y) * 0.65;
    jump = Math.abs(next.x - racer.x) < 128 && Math.abs(next.y - racer.y) < 64;
  } else if (vertical === 0) {
    const cruise = 498 + Math.sin(racer.x * 0.004) * 42;
    vertical = Math.sign(cruise - racer.y) * 0.35;
  }
  return { horizontal, vertical, jump: jump || gapJump, push: false };
}

function isInteractiveTouchTarget(target) {
  return Boolean(target.closest("button, select, label, .start-panel, .finish-strip, .pause-panel, .touch-controls"));
}

function updateTouchMove(event) {
  const maxDistance = 52;
  const dx = event.clientX - touchInput.startX;
  const dy = event.clientY - touchInput.startY;
  touchInput.horizontal = clamp(dx / maxDistance, -1, 1);
  touchInput.vertical = clamp(dy / maxDistance, -1, 1);
}

function clearTouchMove(pointerId = touchInput.movePointerId) {
  if (pointerId !== touchInput.movePointerId) return;
  touchInput.movePointerId = null;
  touchInput.horizontal = 0;
  touchInput.vertical = 0;
}

function clearTouchInput() {
  clearTouchMove();
  touchInput.jump = false;
  touchInput.push = false;
  touchJumpButton.classList.remove("pressed");
  touchPushButton.classList.remove("pressed");
}

function updateTouchControlsVisibility() {
  const visible = isTouchDevice() && state.running && !state.paused && !state.done;
  const player = state.racers[0];
  const showPush = visible && player && (!isMounted(player) || player.horseType === "unicorn" || canMountedRacerThrowSnowballs(player));
  touchControls.classList.toggle("hidden", !visible);
  touchPauseButton.classList.toggle("hidden", !visible);
  touchPushButton.classList.toggle("hidden", !showPush);
  if (player && player.snowballs > 0) {
    touchPushButton.textContent = "Throw";
  } else {
    touchPushButton.textContent = "Push";
  }
}

function bindTouchActionButton(button, key) {
  button.addEventListener("pointerdown", event => {
    if (!isTouchDevice()) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    touchInput[key] = true;
    button.classList.add("pressed");
  });
  const release = event => {
    if (!isTouchDevice()) return;
    event.preventDefault();
    touchInput[key] = false;
    button.classList.remove("pressed");
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}
