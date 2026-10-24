// Specials: a power-up of her own, won by winning a board, used with Y (R on
// WASD, / on the arrow keys, the special button on touch) and then
// recharging. Chosen in a picker after the celebration, before the next board.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).
//
// What's offered grows with her wins: the first, speed or high jump; the
// second, speed, high jump or the EMP; from the third, roller skates, a pogo
// stick or the EMP of the board she just won (and the EMP she has, if it's
// from another board); from the fourth, that board's "snowballs" too (and
// whatever she has); from the fifth, that board's mount as well. A new choice replaces the one she had; choosing the
// same again shortens its recharge (SPECIAL_COOLDOWN to SPECIAL_COOLDOWN_AGAIN).
// Kinds: "speed", "jump", "emp" (the original lightning), "skates", "pogo",
// "emp:<track key>" (that board's own EMP) and "snow:<track key>" (that
// board's throwables, whatever board she's on: a stock of SPECIAL_SNOW_STOCK,
// one back every SPECIAL_SNOW_REGEN s) and "mount:<track key>" (that board's
// own mount to ride off on, or one rolled with its odds: trackSpecialMount).

// Her special, by player (like the standings): { kind, cooldown, wins }.
function playerSpecial(racer) {
  if (!racer || racer.ai) return null;
  return state.playerSpecials?.get(`p${racer.playerIndex}`) || null;
}

function specialChoices(wins, boardKey, current) {
  if (wins <= 1) return ["speed", "jump"];
  if (wins === 2) return ["speed", "jump", "emp"];
  const own = `emp:${boardKey}`;
  const choices = ["skates", "pogo", own];
  if (wins >= 4) choices.push(`snow:${boardKey}`);
  if (wins >= 5) choices.push(`mount:${boardKey}`);
  const keeps = wins >= 4 ? Boolean(current) : Boolean(current?.startsWith("emp"));
  if (keeps && !choices.includes(current)) choices.push(current);
  return choices;
}

function specialName(kind) {
  if (kind === "speed") return "Speed";
  if (kind === "jump") return "High Jump";
  if (kind === "skates") return "Roller Skates";
  if (kind === "pogo") return "Pogo Stick";
  if (kind === "emp") return "EMP";
  if (kind.startsWith("mount:")) {
    const track = kind.slice(6);
    const board = BACKGROUNDS.find(b => b.key === track)?.name || TRACK_THEMES[track]?.name || track;
    const own = trackSpecialMount(track);
    return own ? `${titleCase(mountLabel(own))} (${board})` : `Surprise Mount (${board})`;
  }
  const track = kind.slice(5 - kind.startsWith("emp:"));
  const label = TRACK_THEMES[track]?.labels?.[kind.startsWith("snow:") ? "snowball" : "emp"];
  if (kind.startsWith("snow:")) {
    const board = BACKGROUNDS.find(b => b.key === track)?.name || TRACK_THEMES[track]?.name || track;
    return `${titleCase(label || "snowballs")} (${board})`;
  }
  const board = BACKGROUNDS.find(b => b.key === track)?.name || TRACK_THEMES[track]?.name || track;
  return label ? `${titleCase(label)} (${board})` : `EMP (${board})`;
}

function titleCase(text) {
  return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// A mount special: the mount that board alone has (in place of the horse,
// or its own kind: pony, reindeer…), or null where it has none: then each
// use rolls one with that board's pickup odds (a horse mostly, now and then
// a pegasus or unicorn…): specialMountRoll.
function trackSpecialMount(track) {
  const theme = TRACK_THEMES[track] || {};
  const own = Object.keys(theme.mountOdds || {}).find(type => THEMED_MOUNT_TYPES.includes(type));
  const type = (typeof theme.baseMount === "string" && theme.baseMount) || own || null;
  if (THEMED_MOUNT_TYPES.includes(type)) loadArtOnce(type, `assets/${type}_sprites.webp`);
  return type;
}

function specialMountRoll(track) {
  const type = trackSpecialMount(track) || chooseHorseType(TRACK_THEMES[track] || {});
  if (THEMED_MOUNT_TYPES.includes(type)) loadArtOnce(type, `assets/${type}_sprites.webp`);
  return type;
}

// The EMP style a special EMP sets off.
function specialEmpStyle(kind) {
  if (kind === "emp") return "lightning";
  const theme = TRACK_THEMES[kind.slice(4)] || {};
  return theme.empStyle || "lightning";
}

// Where its icon is: an image and the rect in it.
function specialIcon(kind) {
  const generic = index => ({ image: images.powerupIcons, ...POWERUP_ICON_RECTS[index] });
  const trackCell = (track, index) => {
    const key = trackArtKey(track, "powerups");
    loadArtOnce(key, `assets/tracks/${track}/powerups.webp?v=${powerupArtVersion(track)}`);
    const image = images[key];
    return image ? { image, x: index * TRACK_POWERUP_CELL, y: 0, w: TRACK_POWERUP_CELL, h: TRACK_POWERUP_CELL } : null;
  };
  if (kind === "speed") return generic(1);
  if (kind === "jump") return generic(0);
  if (kind === "emp") return generic(2);
  if (kind === "skates") return trackCell(SKATES_ICON_TRACK, 1) || generic(1);
  if (kind === "pogo") return trackCell(POGO_ICON_TRACK, 0) || generic(0);
  if (kind.startsWith("mount:")) {
    const type = trackSpecialMount(kind.slice(6)) || "horse";
    if (type === "wings") {
      const sheet = getWingArt("fairy_wings");
      return sheet?.width ? { image: sheet, x: 0, y: 0, w: sheet.width / 6, h: sheet.width / 6 } : null;
    }
    if (type === "broom") return images.broom ? { image: images.broom, x: 0, y: 0, w: images.broom.width, h: images.broom.height } : null;
    const image = images[type] || images.horse;
    return image ? { image, x: 0, y: 0, w: FRAME, h: FRAME } : null;
  }
  if (kind.startsWith("snow:")) {
    const track = kind.slice(5);
    return (TRACK_THEMES[track]?.art?.includes("powerups") && trackCell(track, 4)) || generic(4);
  }
  const track = kind.slice(4);
  return (TRACK_THEMES[track]?.art?.includes("powerups") && trackCell(track, 2)) || generic(2);
}

function drawSpecialIcon(canvas, kind) {
  const icon = specialIcon(kind);
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, canvas.width, canvas.height);
  if (!icon?.image) return;
  const k = Math.min(canvas.width / icon.w, canvas.height / icon.h);
  c.drawImage(icon.image, icon.x, icon.y, icon.w, icon.h, (canvas.width - icon.w * k) / 2, (canvas.height - icon.h * k) / 2, icon.w * k, icon.h * k);
}

// Y pressed in a race: her special goes off, if it's charged and she can use
// it here (as with the pickups: not while riding, mostly).
function useSpecial(racer) {
  const special = playerSpecial(racer);
  if (!special || racer.specialWait > 0 || racer.finished || racer.grabbedBy || racer.frogTimer > 0) return false;
  const kind = special.kind;
  if (kind.startsWith("snow:")) return throwSpecialSnowball(racer, kind.slice(5));
  if (kind.startsWith("mount:")) {
    // Her board's mount, as if she'd picked one up (not while she rides one).
    if (!applyPowerup(racer, { type: "horse", horseType: specialMountRoll(kind.slice(6)), x: racer.x, y: racer.y })) return false;
    racer.specialWait = special.cooldown;
    spawnParticles(racer.x, racer.y + 54, 60, 12, { color: slotColor(racer.playerIndex), speed: 180, lift: 160, life: 0.5 });
    return true;
  }
  const type = kind === "speed" || kind === "skates" ? "boost" : kind === "jump" || kind === "pogo" ? "jump" : "emp";
  if (!canRacerUsePowerups(racer, type)) return false;
  if (kind === "speed" || kind === "skates") {
    const skates = kind === "skates" && !isMounted(racer);
    const duration = 4 * (skates ? RIDE_TOY_DURATION_MULTIPLIER : 1);
    racer.speedBoostStacks.push(duration);
    racer.speedBoostTimer = Math.max(...racer.speedBoostStacks);
    if (skates) addRideToy(racer, "skates", duration);
    sfx(skates ? "pickup_skates" : "powerup_pickup_generic", racer.x);
  } else if (kind === "jump" || kind === "pogo") {
    const pogo = kind === "pogo" && !isMounted(racer);
    const duration = 5 * (pogo ? RIDE_TOY_DURATION_MULTIPLIER : 1);
    racer.highJumpStacks.push(duration);
    racer.highJumpTimer = Math.max(...racer.highJumpStacks);
    if (pogo) addRideToy(racer, "pogo", duration);
    sfx(pogo ? "pickup_pogo" : "powerup_pickup_generic", racer.x);
  } else if (!applyPowerup(racer, { type: "emp", x: racer.x, y: racer.y + 54, empStyle: specialEmpStyle(kind), empLabel: specialName(kind).toUpperCase(), special: true })) {
    return false;
  }
  racer.powerupMessage = specialName(kind).toUpperCase();
  racer.specialWait = special.cooldown;
  spawnParticles(racer.x, racer.y + 54, 60, 12, { color: slotColor(racer.playerIndex), speed: 180, lift: 160, life: 0.5 });
  return true;
}

// A "snowballs" special: one of that board's throwables from her stock.
function throwSpecialSnowball(racer, track) {
  const stock = specialStock(racer);
  if (!stock || stock.ammo < 1) return false;
  // (Whoever can throw her pickups' snowballs can throw these: as with X.)
  if (isMounted(racer) && racer.horseType !== "unicorn" && !canMountedRacerThrowSnowballs(racer) && !isAlwaysMountedTrack()) return false;
  stock.ammo -= 1;
  launchSnowball(racer, track);
  racer.powerupMessage = `${specialName(`snow:${track}`).replace(/ \(.*/, "").toUpperCase()} x${stock.ammo}`;
  return true;
}

// Her snowballs stock (full at each race's start), or null for other specials.
function specialStock(racer) {
  if (!playerSpecial(racer)?.kind?.startsWith("snow:")) return null;
  racer.specialStock ||= { ammo: SPECIAL_SNOW_STOCK, regen: 0 };
  return racer.specialStock;
}

function updateSpecialCharge(racer, dt) {
  racer.specialWait = Math.max(0, (racer.specialWait || 0) - dt);
  const stock = specialStock(racer);
  if (!stock) return;
  if (stock.ammo >= SPECIAL_SNOW_STOCK) { stock.regen = 0; return; }
  stock.regen += dt;
  if (stock.regen >= SPECIAL_SNOW_REGEN) { stock.regen -= SPECIAL_SNOW_REGEN; stock.ammo += 1; }
}

// After a board: a human winner counts the win, and (once the celebration's
// done) picks her special before the next board starts, then `next` runs.
function noteSpecialWin(winner) {
  if (!winner || winner.ai) return null;
  state.playerSpecials ||= new Map();
  const key = `p${winner.playerIndex}`;
  const special = state.playerSpecials.get(key) || { kind: null, cooldown: SPECIAL_COOLDOWN, wins: 0 };
  special.wins += 1;
  state.playerSpecials.set(key, special);
  return { racer: winner, special, board: getCurrentBackground().key };
}

const specialPicker = { open: false };

function openSpecialPicker(offer, next) {
  const { racer, special, board } = offer;
  const choices = specialChoices(special.wins, board, special.kind);
  const panel = document.querySelector("#specialPicker") || buildSpecialPicker();
  Object.assign(specialPicker, { open: true, offer, choices, next, at: Math.max(0, choices.indexOf(special.kind)), started: performance.now(), held: {} });
  panel.style.setProperty("--slot-color", slotColor(racer.playerIndex));
  panel.querySelector(".sp-face").style.backgroundImage = `url("assets/portraits/${dollAssetKey(racer.spriteKey)}.webp")`;
  panel.querySelector(".sp-name").textContent = `${racer.name} (${racerTag(racer)}), pick your special!`;
  panel.querySelector(".sp-hint").textContent = special.kind
    ? "Same again recharges faster (10 s). Press Y in the race to use it."
    : "Press Y in the race to use it. It recharges in 15 s.";
  const row = panel.querySelector(".sp-choices");
  row.replaceChildren(...choices.map((kind, n) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "sp-card";
    const icon = document.createElement("canvas");
    icon.width = icon.height = 96;
    const name = document.createElement("span");
    name.textContent = specialName(kind);
    const note = document.createElement("small");
    note.textContent = kind.startsWith("snow:") ? `${kind === special.kind ? "Yours · " : ""}${SPECIAL_SNOW_STOCK}, +1 every ${SPECIAL_SNOW_REGEN} s`
      : kind === special.kind ? `Yours · faster: ${SPECIAL_COOLDOWN_AGAIN} s` : `${SPECIAL_COOLDOWN} s`;
    card.append(icon, name, note);
    card.addEventListener("click", () => { specialPicker.at = n; chooseSpecial(); });
    drawSpecialIcon(icon, kind);
    return card;
  }));
  // (Icons from other boards' sheets may still be loading: drawn again as they arrive.)
  for (const delay of [300, 900, 2000]) {
    setTimeout(() => specialPicker.open && panel.querySelectorAll(".sp-card canvas").forEach((icon, n) => drawSpecialIcon(icon, specialPicker.choices[n])), delay);
  }
  panel.classList.remove("hidden");
  highlightSpecialChoice();
  requestAnimationFrame(tickSpecialPicker);
}

function buildSpecialPicker() {
  const panel = document.createElement("div");
  panel.id = "specialPicker";
  panel.className = "special-picker hidden";
  panel.innerHTML = '<div class="sp-head"><span class="sp-face"></span><span class="sp-name"></span></div>'
    + '<div class="sp-choices"></div><div class="sp-hint"></div><div class="sp-timer"><span></span></div>';
  gameFrame.appendChild(panel);
  return panel;
}

function highlightSpecialChoice() {
  document.querySelectorAll("#specialPicker .sp-card").forEach((card, n) => card.classList.toggle("chosen", n === specialPicker.at));
}

// Her controls (left/right, A to choose), until she chooses or time's up.
function tickSpecialPicker() {
  if (!specialPicker.open) return;
  const left = SPECIAL_PICK_TIME - (performance.now() - specialPicker.started) / 1000;
  document.querySelector("#specialPicker .sp-timer span").style.width = `${clamp(left / SPECIAL_PICK_TIME, 0, 1) * 100}%`;
  if (left <= 0) { chooseSpecial(); return; }
  const input = playerInput(specialPicker.offer.racer.playerIndex, navigator.getGamepads ? navigator.getGamepads() : []);
  const step = input.horizontal > 0.5 ? 1 : input.horizontal < -0.5 ? -1 : 0;
  if (step && !specialPicker.held.step) {
    specialPicker.at = (specialPicker.at + step + specialPicker.choices.length) % specialPicker.choices.length;
    highlightSpecialChoice();
  }
  specialPicker.held.step = step;
  if (input.jump && specialPicker.held.jump === false) { chooseSpecial(); return; }
  specialPicker.held.jump = Boolean(input.jump);
  requestAnimationFrame(tickSpecialPicker);
}

function chooseSpecial(index = specialPicker.at) {
  if (!specialPicker.open) return;
  const { special } = specialPicker.offer;
  const kind = specialPicker.choices[index];
  special.cooldown = kind === special.kind ? SPECIAL_COOLDOWN_AGAIN : SPECIAL_COOLDOWN;
  special.kind = kind;
  closeSpecialPicker();
  const next = specialPicker.next;
  specialPicker.next = null;
  next?.();
}

function closeSpecialPicker() {
  specialPicker.open = false;
  document.querySelector("#specialPicker")?.classList.add("hidden");
}
