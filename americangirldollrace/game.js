const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const gameFrame = document.querySelector(".game-frame");
const startPanel = document.querySelector("#startPanel");
const finishPanel = document.querySelector("#finishPanel");
const pausePanel = document.querySelector("#pausePanel");
const finishTitle = document.querySelector("#finishTitle");
const finishText = document.querySelector("#finishText");
const startButton = document.querySelector("#startButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const restartButton = document.querySelector("#restartButton");
const resumeButton = document.querySelector("#resumeButton");
const menuButton = document.querySelector("#menuButton");
const touchJumpButton = document.querySelector("#touchJumpButton");
const touchPushButton = document.querySelector("#touchPushButton");
const touchPauseButton = document.querySelector("#touchPauseButton");
const touchControls = document.querySelector("#touchControls");
let music = document.querySelector("#music");
let nextMusic = document.querySelector("#nextMusic");
const gameMode = document.querySelector("#gameMode");
const backgroundSelect = document.querySelector("#backgroundSelect");
const difficultySelect = document.querySelector("#difficultySelect");
const specialsSelect = document.querySelector("#specialsSelect");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const playerOneCharacter = document.querySelector("#playerOneCharacter");
const playerTwoCharacter = document.querySelector("#playerTwoCharacter");
const playerThreeCharacter = document.querySelector("#playerThreeCharacter");
const playerFourCharacter = document.querySelector("#playerFourCharacter");
const playerTwoSelectLabel = document.querySelector("#playerTwoSelectLabel");
const playerThreeSelectLabel = document.querySelector("#playerThreeSelectLabel");
const playerFourSelectLabel = document.querySelector("#playerFourSelectLabel");
const playerTwoSelectWrap = document.querySelector("#playerTwoSelectWrap");
const playerThreeSelectWrap = document.querySelector("#playerThreeSelectWrap");
const playerFourSelectWrap = document.querySelector("#playerFourSelectWrap");
const playerOneLabel = document.querySelector("#playerOneLabel");
const playerTwoLabel = document.querySelector("#playerTwoLabel");
const playerThreeLabel = document.querySelector("#playerThreeLabel");
const playerFourLabel = document.querySelector("#playerFourLabel");
const whirlpoolStatus = document.querySelector("#whirlpoolStatus");
const julietteStatus = document.querySelector("#julietteStatus");
const claudiaStatus = document.querySelector("#claudiaStatus");
const kayaStatus = document.querySelector("#kayaStatus");
const playerHuds = [
  document.querySelector("#playerOneHud"),
  document.querySelector("#playerTwoHud"),
  document.querySelector("#playerThreeHud"),
  document.querySelector("#playerFourHud")
];
const playerLabels = [playerOneLabel, playerTwoLabel, playerThreeLabel, playerFourLabel];
const playerStatuses = [whirlpoolStatus, julietteStatus, claudiaStatus, kayaStatus];
const characterSelects = [playerOneCharacter, playerTwoCharacter, playerThreeCharacter, playerFourCharacter];
const controls = document.querySelector(".controls");
const controllerPointerLayer = document.createElement("div");
controllerPointerLayer.className = "controller-pointer-layer";
gameFrame.appendChild(controllerPointerLayer);

let W = canvas.width;
const H = canvas.height;
const EXPECTED_VIEW_WIDTH = 1280;
const FRAME = 418;
const SPRITE_COLS = 3;
const DOLL_SPRITE_ROWS = 4;
const HORSE_SPRITE_ROWS = 3;
const SPRITE_ANCHOR_X = FRAME / 2;
const SPRITE_ANCHOR_Y = FRAME - 9;
const FINISH = 15600;
const BOARD_WIDTH = EXPECTED_VIEW_WIDTH;
const TRACK_TOP = 490;
const TRACK_BOTTOM = 665;
const RACER_VISIBLE_LEFT_MARGIN = 88;
const RACER_VISIBLE_RIGHT_MARGIN = 96;
const CAMERA_PLAYER_MARGIN = RACER_VISIBLE_LEFT_MARGIN + RACER_VISIBLE_RIGHT_MARGIN;
const CAMERA_MIN_ZOOM = EXPECTED_VIEW_WIDTH / (FINISH + CAMERA_PLAYER_MARGIN * 2);
const CAMERA_ZOOM_IN_DAMPING = 3.2;
const HURDLE_W = 54;
const HURDLE_HIT_W = HURDLE_W;
const HURDLE_HIT_H = 32;
const PLAYER_FOOT_W = 30;
const PLAYER_FOOT_H = 14;
const HURDLE_TOP_Z = 82;
const MONSTER_FOOT_W = 48;
const MONSTER_FOOT_H = 22;
const PLAYER_RUN_SPEED = 360;
const PLAYER_BACK_SPEED = 210;
const PLAYER_LANE_SPEED = 245;
const AI_RUN_SPEED = 250;
const AI_AHEAD_IGNORE_OBSTACLES = 0.5;
const AI_AHEAD_WANDER_START = 1;
const AI_AHEAD_WANDER_END = 0.25;
const AI_BEHIND_CATCHUP = 0.5;
const HORSE_RUN_SPEED = 560;
const HORSE_AI_RUN_SPEED = 400;
const JUMP_POWER = 760;
const HORSE_JUMP_POWER = 940;
const GRAVITY = 2100;
const LANDING_POSE_DISTANCE = 100;
const UNMOUNTED_LANDING_PAUSE_DURATION = 0.2;
const HORSE_DURATION = 10;
const UNICORN_DURATION_MULTIPLIER = 2;
const PEGASUS_DURATION_MULTIPLIER = 1.5;
const HORSE_FLASH_TIME = 2.4;
const UNICORN_BEAM_RANGE = 520;
const UNICORN_BEAM_DURATION = 0.2;
const PEGASUS_HOVER_Z = (HORSE_JUMP_POWER * HORSE_JUMP_POWER) / (2 * GRAVITY);
const RIDER_MOUNT_Y_OFFSET = 100;
const UNICORN_OFFSET_Y = 0;
const PEGASUS_OFFSET_Y = 0;
const UNICORN_JUMPING_OFFSET_Y = 0;
const PEGASUS_JUMPING_OFFSET_Y = 0;
const DEFAULT_RIDER_X_OFFSET = 0;
const DEFAULT_RIDER_Y_OFFSET = RIDER_MOUNT_Y_OFFSET;
const PUSH_COOLDOWN = 0.72;
const PUSH_ACTIVE_TIME = 0.22;
const PUSH_RANGE_X = 78;
const PUSH_RANGE_Y = 46;
const PUSH_FORCE = 350;
const AMANDA_HAZARD_DEFAULT_INTERVAL = 10;
const AMANDA_HAZARD_MODE_INTERVAL = 2;
const AMANDA_HAZARD_TRIGGER_X = 112;
const AMANDA_HAZARD_TRIGGER_Y = 88;
const AMANDA_HAZARD_PUSH_X = 118;
const AMANDA_HAZARD_TARGET_PUSH_X = 210;
const AMANDA_HAZARD_PUSH_Y = 94;
const AMANDA_HAZARD_PUSH_FORCE = 620;
const AMANDA_HAZARD_EMERGE_TIME = 0.22;
const AMANDA_HAZARD_HOLD_TIME = 0.24;
const AMANDA_HAZARD_RETREAT_TIME = 0.38;
const AMANDA_HAZARD_COOLDOWN = 1.6;
const OIL_SLIDE_DURATION = 1.5;
const OIL_SLIDE_SPEED = 430;
const SNOWBALL_PICKUP_COUNT = 5;
const SNOWBALL_SPEED = 760;
const SNOWBALL_RANGE = 520;
const SNOWBALL_RADIUS = 13;
const SNOWBALL_HAND_DRAW_Y_OFFSET = 200;
const MONSTER_SPRITE_ROWS = 4;
const MONSTER_HEIGHT_SCALE = 1.3;
const MONSTER_WAIT_FROM_BOARD_END = EXPECTED_VIEW_WIDTH;
const MONSTER_COURSE_START_X = FINISH / 3 + 120;
const MONSTER_COUNTS_BY_DIFFICULTY = {
  none: 0,
  normal: 2,
  extra: 4,
  "too-many": 8
};
const MONSTER_SPEED = 150;
const MONSTER_LANE_SPEED = 130;
const MONSTER_GRAB_RANGE_X = 58;
const MONSTER_GRAB_RANGE_Y = 50;
const MONSTER_THROW_FORCE = 1020;
const MONSTER_SLEEP_KNOCKBACKS = 5;
const MONSTER_FINISH_BACK_THROW_DISTANCE = EXPECTED_VIEW_WIDTH * 0.5;
const STORM_CLOUD_AVERAGE_INTERVAL = 15;
const STORM_CLOUD_MIN_INTERVAL = 7;
const EXTRA_MONSTER_CLOUD_AVERAGE_INTERVAL = 30;
const EXTRA_MONSTER_CLOUD_MIN_INTERVAL = 14;
const REWARD_CLOUD_AVERAGE_INTERVAL = 7;
const REWARD_CLOUD_MIN_INTERVAL = 4;
const STORM_CLOUD_DURATION = 8.5;
const STORM_CLOUD_DROP_TIME = 1.7;
const STORM_MONSTER_DROP_DURATION = 0.9;
const REWARD_POWERUP_DROP_DURATION = 0.75;
const STORM_CLOUD_START_PADDING = 180;
const STORM_CLOUD_END_PADDING = 260;
const VICTORY_FIREWORK_COUNT = 7;
const VICTORY_JUMP_HEIGHT = 74;
const VICTORY_JUMP_SPEED = 0.006;
const LEGO_SPLIT_LINE_WIDTH = 8;
const LEGO_SPLIT_LINE_FADE_SPEED = 7.5;
const LEGO_CAMERA_TARGET_RATIO = 0.36;
const LEGO_PANE_KEEP_VISIBLE_MARGIN = 112;
const LEGO_SCREEN_ALIGNMENT_EPSILON = 1.5;
const LEGO_MERGE_CROSSING_EPSILON = LEGO_SCREEN_ALIGNMENT_EPSILON * 2;
const LEGO_CAMERA_CATCHUP_RATE = 1.5;
const RACE_TRACKER_WIDTH = 250;
const RACE_TRACKER_TOP = 94;
const RACE_TRACKER_RIGHT = 24;
const POWERUP_TYPES = ["jump", "boost", "emp", "oil", "snowball", "horse"];
const GOOD_POWERUP_TYPES = POWERUP_TYPES.filter(type => type !== "oil");
const CONTROLLER_POINTER_SPEED = 720;
const CONTROLLER_POINTER_DEADZONE = 0.18;
const CONTROLLER_POINTER_SIZE = 22;
const POWERUP_START_X = 760;
const POWERUP_END_PADDING = 700;
const POWERUP_MIN_GAP = 460;
const POWERUP_RANDOM_GAP = 420;
const POWERUP_ICON_TARGET_SIZE = 68;
const POWERUP_ICON_RECTS = [
  { x: 0, y: 0, w: 510, h: 561 },
  { x: 510, y: 0, w: 620, h: 561 },
  { x: 1130, y: 0, w: 570, h: 561 },
  { x: 1700, y: 0, w: 500, h: 561 },
  { x: 2200, y: 0, w: 604, h: 561 }
];
const keys = new Set();
GameAudio.attachMusic(music, 1);
GameAudio.attachMusic(nextMusic, 0);
const mobileQuery = window.matchMedia("(pointer: coarse)");

const MODE_CONFIG = {
  one: { humans: 1, ais: 0 },
  "one-one-ai": { humans: 1, ais: 1 },
  "one-two-ai": { humans: 1, ais: 2 },
  two: { humans: 2, ais: 0 },
  three: { humans: 3, ais: 0 },
  four: { humans: 4, ais: 0 },
  "two-one-ai": { humans: 2, ais: 1 },
  "two-two-ai": { humans: 2, ais: 2 },
  "three-one-ai": { humans: 3, ais: 1 }
};
const MOBILE_MODE_VALUES = new Set(["one", "one-one-ai", "one-two-ai"]);
const DIFFICULTIES = [
  { key: "none", label: "No Monsters" },
  { key: "normal", label: "Normal" },
  { key: "extra", label: "Extra Monsters" },
  { key: "too-many", label: "Too Many Monsters" }
];

const RACER_STARTS = [
  { x: 128, y: 502 },
  { x: 92, y: 566 },
  { x: 170, y: 624 },
  { x: 56, y: 610 }
];

const CHARACTER_FALLBACKS = ["whirlpool", "juliette", "claudia", "kaya"];
const SPECIALS = new Set(["none", "unicorn", "pegasus", "all-dolls", "horsing", "amanda-mode"]);
const BACKGROUNDS = [
  { key: "farm", name: "Farm", imageKey: "backgroundFarm", music: "assets/music/Plastic Shoes.mp3" },
  { key: "fairy", name: "Fairy", imageKey: "backgroundFairy", music: "assets/music/Bubblegum Radar.mp3" },
  { key: "town", name: "Village", imageKey: "backgroundTown", music: "assets/music/Ghent Sweet Parade.mp3" },
  { key: "winter", name: "Winter", imageKey: "backgroundWinter", music: "assets/music/Snow in My Pocket.mp3" },
  { key: "castles", name: "Castles", imageKey: "backgroundCastles", music: "assets/music/Sugar Castle Run.mp3" },
];
const startingBackground = "farm";
const NEXT_RACE_DELAY = 3600;
const PAUSE_MUSIC_FADE_MS = 350;
const CELEBRATION_MUSIC_GAIN = 0.35;
const CELEBRATION_MUSIC_FADE_MS = 260;
const NEXT_TRACK_CROSSFADE_DELAY_MS = 900;
const NEXT_TRACK_CROSSFADE_MS = 2400;
const NEXT_TRACK_PREVIEW_GAIN = 0.55;

const images = {
  backgroundFarm: loadImage("assets/background_farm.png"),
  backgroundCastles: loadImage("assets/background_castles.png"),
  backgroundFairy: loadImage("assets/background_fairy.png"),
  backgroundTown: loadImage("assets/background_village.png"),
  backgroundWinter: loadImage("assets/background_winter.png"),
  whirlpool: loadImage("assets/doll_whirlpool_sprites.png"),
  juliette: loadImage("assets/doll_juliette_sprites.png"),
  claudia: loadImage("assets/doll_claudia_sprites.png"),
  kaya: loadImage("assets/doll_kaya_sprites.png"),
  lily: loadImage("assets/doll_lily_sprites.png"),
  marisol: loadImage("assets/doll_marisol_sprites.png"),
  amanda: loadImage("assets/doll_amanda_sprites.png"),
  penelope: loadImage("assets/doll_penelope_sprites.png"),
  rumi: loadImage("assets/doll_rumi_sprites.png"),
  horse: loadImage("assets/horse_sprites.png"),
  unicorn: loadImage("assets/unicorn_sprites.png"),
  pegasus: loadImage("assets/pegasus_sprites.png"),
  monster: loadImage("assets/monster_sprites.png"),
  powerupIcons: loadImage("assets/icons_alpha.png")
};

const jumpSpriteScale = {
  default: 0.9,
  lily: 1.02,
  marisol: 0.99,
  amanda: 0.99,
  penelope: 0.99,
  rumi: 0.99,
};

const characters = {
  whirlpool: {
    name: "Whirlpool",
    spriteKey: "whirlpool",
    color: "#5a3a86",
    riderXOffset: -15,
    riderYOffset: 128,
    image: () => images.whirlpool
  },
  juliette: {
    name: "Juliette",
    spriteKey: "juliette",
    color: "#c58a28",
    riderYOffset: DEFAULT_RIDER_Y_OFFSET,
    image: () => images.juliette
  },
  claudia: {
    name: "Claudia",
    spriteKey: "claudia",
    color: "#25897f",
    riderYOffset: DEFAULT_RIDER_Y_OFFSET,
    image: () => images.claudia
  },
  kaya: {
    name: "Kaya",
    spriteKey: "kaya",
    color: "#9a6426",
    riderYOffset: DEFAULT_RIDER_Y_OFFSET,
    image: () => images.kaya
  },
  lily: {
    name: "Lily",
    spriteKey: "lily",
    color: "#d33b2f",
    riderYOffset: 85,
    image: () => images.lily
  },
  marisol: {
    name: "Marisol",
    spriteKey: "marisol",
    color: "#f25ca5",
    riderYOffset: 95,
    image: () => images.marisol
  },
  amanda: {
    name: "Amanda",
    spriteKey: "amanda",
    color: "#263d8f",
    riderYOffset: 85,
    image: () => images.amanda
  },
  penelope: {
    name: "Penelope",
    spriteKey: "penelope",
    color: "#8f4f6f",
    riderYOffset: 85,
    hidden: true,
    image: () => images.penelope
  },
  rumi: {
    name: "Rumi",
    spriteKey: "rumi",
    color: "#7b3bb8",
    riderYOffset: 85,
    image: () => images.rumi
  }
};

const state = {
  running: false,
  done: false,
  lastTime: 0,
  camera: 0,
  cameraZoom: 1,
  countdown: 0,
  mode: "two",
  winner: null,
  racers: [],
  obstacles: [],
  powerups: [],
  projectiles: [],
  rainbowBeams: [],
  monsters: [],
  difficulty: "normal",
  specials: "none",
  cameraMode: "lego",
  stormCloud: null,
  stormTimer: 0,
  rewardCloud: null,
  rewardTimer: 0,
  paused: false,
  lastStartPressed: false,
  viewportScaleX: 1,
  renderViewportWidth: null,
  backgroundIndex: 0,
  nextRaceTimer: null,
  victoryStartTime: 0,
  legoSplitActive: false,
  legoSplitRendering: false,
  legoSplitLineAlpha: 0,
  legoSplitLineCount: 0,
  legoSplitLinePositions: [],
  legoPaneCameras: [],
  legoPaneGroupKeys: [],
  legoMergeBoundarySnapshots: {},
  legoSharedLazy: false
};

const touchInput = {
  movePointerId: null,
  startX: 0,
  startY: 0,
  horizontal: 0,
  vertical: 0,
  jump: false,
  push: false
};

let menuAnimationFrame = null;
let lastMenuFrameTime = 0;
let nextTrackCrossfadeTimer = null;
const musicFadeTokens = new WeakMap();
const musicGains = new WeakMap([[music, 1], [nextMusic, 0]]);

const controllerPointers = [];
const spriteAlphaCanvases = new Map();
const menuCharacterPreview = [
  { key: "lily", x: 59, y: 430 },
  { key: "penelope", x: 132, y: 432 },
  { key: "rumi", x: 206, y: 430 },
  { key: "amanda", x: 141, y: 490 },
  { key: "kaya", x: 284, y: 492 },
  { key: "juliette", x: 57, y: 576 },
  { key: "claudia", x: 234, y: 576 },
  { key: "whirlpool", x: 153, y: 650 },
  { key: "marisol", x: 316, y: 620 }
];

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function resizeCanvasToFrame() {
  const rect = gameFrame.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const nextWidth = Math.max(640, Math.round(H * (rect.width / rect.height)));
  if (canvas.width === nextWidth && canvas.height === H) return;
  W = nextWidth;
  canvas.width = W;
  canvas.height = H;
  updateCamera();
  drawScene(0);
}

async function waitForAssets() {
  resizeCanvasToFrame();
  await Promise.all(Object.values(images).map(img => img.decode()));
  validateSpriteSheets();
  resetRace();
  drawScene(0);
  startMenuAnimationLoop();
}

function validateSpriteSheets() {
  for (const [key, character] of Object.entries(characters)) {
    const image = character.image();
    if (image.width !== FRAME * SPRITE_COLS || image.height !== FRAME * DOLL_SPRITE_ROWS) {
      throw new Error(`${key} sprite sheet must be ${FRAME * SPRITE_COLS}x${FRAME * DOLL_SPRITE_ROWS}px`);
    }
  }
  for (const key of ["horse", "unicorn", "pegasus"]) {
    if (images[key].width !== FRAME * SPRITE_COLS || images[key].height !== FRAME * HORSE_SPRITE_ROWS) {
      throw new Error(`${key} sprite sheet must be ${FRAME * SPRITE_COLS}x${FRAME * HORSE_SPRITE_ROWS}px`);
    }
  }
  if (images.monster.width !== FRAME * SPRITE_COLS || images.monster.height !== FRAME * MONSTER_SPRITE_ROWS) {
    throw new Error(`monster sprite sheet must be ${FRAME * SPRITE_COLS}x${FRAME * MONSTER_SPRITE_ROWS}px`);
  }
}

function resetRace(mode = state.mode) {
  clearNextRaceTimer();
  updateMobileModeAvailability();
  state.mode = MODE_CONFIG[mode] ? mode : gameMode.value || "two";
  if (!isModeAvailable(state.mode)) state.mode = "one-one-ai";
  gameMode.value = state.mode;
  const config = getModeConfig();
  state.running = false;
  state.done = false;
  state.lastTime = 0;
  state.camera = 0;
  state.cameraZoom = 1;
  state.renderViewportWidth = null;
  state.legoSplitActive = false;
  state.legoSplitRendering = false;
  state.legoSplitLineAlpha = 0;
  state.legoSplitLineCount = 0;
  state.legoSplitLinePositions = [];
  state.legoPaneCameras = [];
  state.legoPaneGroupKeys = [];
  state.legoMergeBoundarySnapshots = {};
  state.legoSharedLazy = false;
  state.winner = null;
  state.victoryStartTime = 0;
  state.obstacles = makeObstacles();
  state.projectiles = [];
  state.rainbowBeams = [];
  state.monsters = makeMonsters();
  state.powerups = makePowerups();
  state.stormCloud = null;
  state.stormTimer = nextStormDelay();
  state.rewardCloud = null;
  state.rewardTimer = nextRewardDelay();
  state.paused = false;
  pausePanel.classList.add("hidden");
  state.racers = [];
  const totalRacers = config.humans + config.ais;
  for (let index = 0; index < totalRacers; index += 1) {
    const ai = index >= config.humans;
    const character = getSelectedCharacter(characterSelects[index], CHARACTER_FALLBACKS[index]);
    const start = RACER_STARTS[index];
    const racer = makeRacer(
      character.name,
      character.spriteKey,
      character.image(),
      index,
      start.x,
      start.y,
      ai,
      character.color,
      ai ? 365 : 475,
      character.riderYOffset,
      character.riderXOffset
    );
    state.racers.push(racer);
  }
  updatePlayerLabels();
  updateModeLabels();
  updateBackgroundSelect();
  updateDifficultyButton();
  updateSpecialsSelect();
  updateHud();
  finishPanel.classList.add("hidden");
  finishPanel.classList.remove("celebration");
}

function clearNextRaceTimer() {
  if (!state.nextRaceTimer) return;
  clearTimeout(state.nextRaceTimer);
  state.nextRaceTimer = null;
}

function getCurrentBackground() {
  return BACKGROUNDS[state.backgroundIndex] || BACKGROUNDS[0];
}

function setBackground(key) {
  const index = BACKGROUNDS.findIndex(background => background.key === key);
  state.backgroundIndex = index === -1 ? 0 : index;
  syncBackgroundMusic();
  updateBackgroundSelect();
  if (!state.running) drawScene(0);
}

function updateBackgroundSelect() {
  if (backgroundSelect) backgroundSelect.value = getCurrentBackground().key;
}

function getCurrentDifficulty() {
  return DIFFICULTIES.find(difficulty => difficulty.key === state.difficulty) || DIFFICULTIES[1];
}

function updateDifficultyButton() {
  if (!difficultySelect) return;
  difficultySelect.value = getCurrentDifficulty().key;
}

function updateSpecialsSelect() {
  if (!specialsSelect) return;
  specialsSelect.value = state.specials;
}

function setSpecials(key) {
  state.specials = SPECIALS.has(key) ? key : "none";
  updateSpecialsSelect();
  updateCharacterSelectOptions();
  if (!state.running) {
    resetRace(state.mode);
    drawScene(0);
  }
}

function isAllDollsMode() {
  return state.specials === "all-dolls";
}

function isHorsingAroundMode() {
  return state.specials === "horsing";
}

function isAmandaMode() {
  return state.specials === "amanda-mode";
}

function getVisibleCharacterEntries() {
  return Object.entries(characters).filter(([, character]) => isAllDollsMode() || !character.hidden);
}

function updateCharacterSelectOptions() {
  const visibleEntries = getVisibleCharacterEntries();
  for (let index = 0; index < characterSelects.length; index += 1) {
    const select = characterSelects[index];
    if (!select) continue;
    const previous = select.value;
    select.replaceChildren(...visibleEntries.map(([key, character]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = character.name;
      return option;
    }));
    const fallback = CHARACTER_FALLBACKS[index];
    select.value = visibleEntries.some(([key]) => key === previous) ? previous : fallback;
  }
}

function setDifficulty(key) {
  state.difficulty = DIFFICULTIES.some(difficulty => difficulty.key === key) ? key : "normal";
  updateDifficultyButton();
  if (!state.running) {
    resetRace(state.mode);
    drawScene(0);
  }
}

function toggleSettingsPanel() {
  settingsPanel?.classList.toggle("hidden");
}

function advanceBackground() {
  state.backgroundIndex = (state.backgroundIndex + 1) % BACKGROUNDS.length;
}

function getSelectedCharacter(select, fallback) {
  const character = characters[select?.value];
  if (character && (isAllDollsMode() || !character.hidden)) return character;
  return characters[fallback];
}

function getModeConfig() {
  return MODE_CONFIG[state.mode] || MODE_CONFIG.two;
}

function getAmandaHazardInterval() {
  const config = getModeConfig();
  const racerCount = config.humans + config.ais;
  const amandaIsRacing = characterSelects
    .slice(0, racerCount)
    .some((select, index) => getSelectedCharacter(select, CHARACTER_FALLBACKS[index])?.spriteKey === "amanda");
  if (amandaIsRacing) return 0;
  return isAmandaMode() ? AMANDA_HAZARD_MODE_INTERVAL : AMANDA_HAZARD_DEFAULT_INTERVAL;
}

function isTouchDevice() {
  return mobileQuery.matches;
}

function hasConnectedController() {
  return connectedGamepads(navigator.getGamepads ? navigator.getGamepads() : []).length > 0;
}

function isModeAvailable(mode) {
  return !isTouchDevice() || hasConnectedController() || MOBILE_MODE_VALUES.has(mode);
}

function updateMobileModeAvailability() {
  const mobileLimited = isTouchDevice() && !hasConnectedController();
  for (const option of gameMode.options) {
    option.disabled = mobileLimited && !MOBILE_MODE_VALUES.has(option.value);
  }
  if (mobileLimited && !MOBILE_MODE_VALUES.has(gameMode.value)) {
    gameMode.value = "one-one-ai";
    state.mode = gameMode.value;
  }
}

function updatePlayerLabels() {
  for (let index = 0; index < playerHuds.length; index += 1) {
    const racer = state.racers[index];
    playerHuds[index].classList.toggle("hidden", !racer);
    if (!racer) continue;
    const prefix = racer.ai ? `AI ${index + 1}` : `P${index + 1}`;
    playerLabels[index].textContent = `${prefix}: ${racer.name}`;
    playerLabels[index].style.color = racer.color;
  }
}

function updateModeLabels() {
  updateMobileModeAvailability();
  const config = MODE_CONFIG[gameMode.value] || MODE_CONFIG.two;
  const totalRacers = config.humans + config.ais;
  const labels = [null, playerTwoSelectLabel, playerThreeSelectLabel, playerFourSelectLabel];
  const wraps = [null, playerTwoSelectWrap, playerThreeSelectWrap, playerFourSelectWrap];
  for (let index = 1; index < characterSelects.length; index += 1) {
    const visible = index < totalRacers;
    if (wraps[index]) wraps[index].classList.toggle("hidden", !visible);
    if (!visible || !labels[index]) continue;
    labels[index].textContent = index < config.humans ? `Player ${index + 1}` : `AI ${index + 1}`;
  }
  updateControlInstructions();
}

function updateControlInstructions() {
  const config = MODE_CONFIG[gameMode.value] || MODE_CONFIG.two;
  if (isTouchDevice()) {
    const lines = hasConnectedController()
      ? ["P1: touch controls or controller 1"]
      : ["Swipe and hold to move", "Tap Jump or Hit"];
    if (hasConnectedController()) {
      for (let index = 1; index < config.humans; index += 1) {
        lines.push(`P${index + 1}: controller ${index + 1}`);
      }
    }
    for (let index = config.humans; index < config.humans + config.ais; index += 1) {
      lines.push(`AI ${index + 1}: computer`);
    }
    controls.replaceChildren(...lines.map(text => {
      const item = document.createElement("span");
      item.textContent = text;
      return item;
    }));
    return;
  }
  const lines = [];
  for (let index = 0; index < config.humans; index += 1) {
    lines.push(`P${index + 1}: ${controlDescription(index, config.humans)}`);
  }
  for (let index = config.humans; index < config.humans + config.ais; index += 1) {
    lines.push(`AI ${index + 1}: computer`);
  }
  controls.replaceChildren(...lines.map(text => {
    const item = document.createElement("span");
    item.textContent = text;
    return item;
  }));
}

function controlDescription(index, humanCount) {
  if (humanCount === 1) {
    return "controller 1 or WASD + Space + F";
  }
  if (humanCount === 2) {
    return index === 0
      ? "controller 1 or WASD + Space + F"
      : "controller 2 or arrows + Enter + Shift";
  }
  if (humanCount === 3) {
    if (index === 0) return "controller 1";
    if (index === 1) return "controller 2 or WASD + Space + F";
    return "controller 3 or arrows + Enter + Shift";
  }
  if (index === 0) return "controller 1";
  if (index === 1) return "controller 2";
  if (index === 2) return "controller 3 or WASD + Space + F";
  return "controller 4 or arrows + Enter + Shift";
}

function makeRacer(name, spriteKey, sheet, playerIndex, x, y, ai, color, maxSpeed, riderYOffset = DEFAULT_RIDER_Y_OFFSET, riderXOffset = DEFAULT_RIDER_X_OFFSET) {
  return {
    name,
    spriteKey,
    sheet,
    playerIndex,
    x,
    y,
    z: 0,
    vy: 0,
    speed: 0,
    cameraVelocityX: 0,
    moving: false,
    facing: 1,
    boost: 0,
    ai,
    color,
    maxSpeed,
    riderYOffset,
    riderXOffset,
    hitTimer: 0,
    frozenTimer: 0,
    speedBoostTimer: 0,
    speedBoostStacks: [],
    highJumpTimer: 0,
    highJumpStacks: [],
    empTimer: 0,
    oilTimer: 0,
    oilVelocity: 0,
    snowballs: 0,
    powerupMessage: "",
    finished: false,
    finishTime: 0,
    frameTime: 0,
    frame: 0,
    jumpStarted: false,
    onObstacle: false,
    jumpFrame: 0,
    landingTimer: 0,
    pushTimer: 0,
    pushCooldown: 0,
    mountBumpCooldown: 0,
    pushedTargets: new Set(),
    fallBackTimer: 0,
    fallBackFacing: 1,
    knockbackX: 0,
    horseTimer: 0,
    horseType: "horse",
    pegasusGliding: false,
    unicornBeamCooldown: 0,
    grabbedBy: null,
    aiWanderAhead: false
  };
}

function makeObstacles() {
  const hurdles = [];
  const amandaHazardInterval = getAmandaHazardInterval();
  const amandaHazardPhase = amandaHazardInterval > 0
    ? Math.floor(Math.random() * amandaHazardInterval)
    : -1;
  let x = 560;
  let index = 0;
  while (x < FINISH - 520) {
    const progress = x / FINISH;
    const minGap = progress < 0.35 ? 360 : progress < 0.7 ? 300 : 245;
    const wave = (Math.sin(index * 1.71) + 1) * 0.5;
    const gap = minGap + wave * 120;
    const amandaHazard = amandaHazardInterval > 0 && index % amandaHazardInterval === amandaHazardPhase;
    hurdles.push({
      x,
      y: TRACK_TOP + 28 + ((index * 53) % (TRACK_BOTTOM - TRACK_TOP - 44)),
      w: HURDLE_W,
      h: 58,
      hitW: HURDLE_HIT_W,
      hitH: HURDLE_HIT_H,
      kind: "hurdle",
      amandaHazard,
      amandaState: "hidden",
      amandaTimer: 0,
      amandaReveal: 0,
      amandaCooldown: 0,
      amandaFacing: 1,
      amandaTarget: null
    });
    x += gap;
    index += 1;
  }
  return hurdles;
}

function makePowerups() {
  const powerups = [];
  const powerupTypes = state.difficulty === "too-many"
    ? ["oil", "monster"]
    : state.difficulty === "extra"
    ? [...POWERUP_TYPES, "monster"]
    : POWERUP_TYPES;
  // Define your custom weights
  const POWERUP_WEIGHTS = {
    "jump": 0.7,
    "boost": 1.2,
    "horse": 0.7,
    "monster": 0.45,
  };
  for (const type of powerupTypes) {
    if (!POWERUP_WEIGHTS[type]) {
      POWERUP_WEIGHTS[type] = 1.0;
    }
  }

  // Calculate the total sum of all weights
  const totalWeight = powerupTypes.reduce((sum, type) => sum + (POWERUP_WEIGHTS[type] || 1.0), 0);

  let x = POWERUP_START_X + Math.random() * 260;
  for (let index = 0; x < FINISH - POWERUP_END_PADDING; index += 1) {
    
    // --- START WEIGHTED SELECTION ---
    let randomNum = Math.random() * totalWeight;
    let selectedType = powerupTypes[0]; // Fallback

    for (const type of powerupTypes) {
      const weight = POWERUP_WEIGHTS[type] || 1.0; // Default to 1 if not set
      if (randomNum < weight) {
        selectedType = type;
        break;
      }
      randomNum -= weight;
    }
    // --- END WEIGHTED SELECTION ---

    const spawnX = x + (Math.random() - 0.5) * 90;
    const spawnY = TRACK_TOP + 34 + Math.random() * (TRACK_BOTTOM - TRACK_TOP - 68);
    if (selectedType === "monster" && spawnX >= MONSTER_COURSE_START_X) {
      state.monsters.push(spawnMonster(spawnX, spawnY, { active: false }));
    } else {
      const powerupType = selectedType === "monster" ? POWERUP_TYPES[index % POWERUP_TYPES.length] : selectedType;
      powerups.push(makePowerup(powerupType, spawnX, spawnY));
    }
    x += POWERUP_MIN_GAP + Math.random() * POWERUP_RANDOM_GAP;
  }
  return powerups;
}

function makePowerup(type, x, y, options = {}) {
  return {
    x,
    y,
    type,
    horseType: type === "horse" ? chooseHorseType() : "horse",
    taken: false,
    spin: Math.random() * Math.PI * 2,
    dropTimer: 0,
    dropDuration: options.dropDuration || 0,
    dropStartY: options.dropStartY || y
  };
}

function chooseHorseType() {
  if (state.specials === "unicorn") return "unicorn";
  if (state.specials === "pegasus") return "pegasus";
  const roll = Math.random();
  if (roll < 0.1) return "unicorn";
  if (roll < 0.2) return "pegasus";
  return "horse";
}

function horseDurationForType(horseType) {
  if (isHorsingAroundMode() && (horseType === "unicorn" || horseType === "pegasus")) return Infinity;
  if (horseType === "unicorn") return HORSE_DURATION * UNICORN_DURATION_MULTIPLIER;
  if (horseType === "pegasus") return HORSE_DURATION * PEGASUS_DURATION_MULTIPLIER;
  return HORSE_DURATION;
}

function makeMonsters() {
  return getMonsterSpawnXs(state.difficulty).map(x => (
    spawnMonster(x, TRACK_TOP + 26 + Math.random() * (TRACK_BOTTOM - TRACK_TOP - 52), { active: false })
  ));
}

function getMonsterSpawnXs(difficulty) {
  const count = MONSTER_COUNTS_BY_DIFFICULTY[difficulty] ?? MONSTER_COUNTS_BY_DIFFICULTY.normal;
  if (count === 0) return [];

  const finishMonsterX = FINISH - 120;
  const spreadEndX = finishMonsterX - MONSTER_WAIT_FROM_BOARD_END * 0.25;
  const positions = [];
  for (let index = 0; index < count - 1; index += 1) {
    const progress = (index + 1) / count;
    // Ease toward the finish so each successive course section is denser.
    const endBiasedProgress = 1 - Math.pow(1 - progress, 1.35);
    positions.push(MONSTER_COURSE_START_X + (spreadEndX - MONSTER_COURSE_START_X) * endBiasedProgress);
  }
  positions.push(finishMonsterX);
  return positions;
}

function spawnMonster(x, y, options = {}) {
  const active = Boolean(options.active);
  return {
    x: clamp(x, MONSTER_COURSE_START_X, FINISH - 120),
    y: clamp(y, TRACK_TOP, TRACK_BOTTOM),
    state: active ? "walk" : "idle",
    active,
    frame: 0,
    frameTime: Math.random() * 3,
    facing: options.facing || -1,
    target: null,
    timer: 0,
    knockedBacks: 0,
    knockbackX: 0,
    dropTimer: 0,
    dropDuration: 0,
    dropStartY: 0
  };
}

/* ── Audio glue ───────────────────────────────────────────────────────────────
 * One-shot effects are fired from the gameplay code that causes them; anything
 * continuous (footsteps, wingbeats, and snoring) is driven from
 * updateAudio() below, which runs once per frame at the end of update().
 * Volumes live in AUDIO_CONFIG at the top of audio.js.
 * ---------------------------------------------------------------------------*/

function sfx(key, worldX, options = {}) {
  return GameAudio.play(key, { worldX, ...options });
}

function racerVoice(racer, event, options = {}) {
  if (!racer) return null;
  return GameAudio.voice(racer.spriteKey, event, { worldX: racer.x, ...options });
}

function racerLoopId(racer, name) {
  return `${name}:${racer.playerIndex}`;
}

function updateAudioListener() {
  const ranges = getActiveWorldViewRanges();
  if (ranges.length === 0) return;
  GameAudio.setListener(
    Math.min(...ranges.map(range => range.left)),
    Math.max(...ranges.map(range => range.right))
  );
}

function mountLoopKey(racer) {
  if (racer.horseType === "pegasus") {
    if (racer.pegasusGliding) return "pegasus_glide_loop";
    return racer.z > 8 ? "pegasus_flight_loop" : "horse_canter_loop";
  }
  if (racer.horseType === "unicorn") return "unicorn_gallop_loop";
  return "horse_gallop_loop";
}

function updateRacerAudio(racer, dt) {
  const mountId = racerLoopId(racer, "mount");
  const oilId = racerLoopId(racer, "oil");
  const frozenId = racerLoopId(racer, "frozen");

  if (racer.finished || racer.grabbedBy) {
    GameAudio.stopLoop(mountId);
    GameAudio.stopLoop(oilId);
    GameAudio.stopLoop(frozenId);
    return;
  }

  if (isMounted(racer) && Math.abs(racer.speed) > 20) {
    GameAudio.startLoop(mountId, mountLoopKey(racer), { gain: racerAudioGain(racer) });
  } else {
    GameAudio.stopLoop(mountId);
  }

  if (racer.oilTimer > 0) GameAudio.startLoop(oilId, "oil_slide_loop", { gain: racerAudioGain(racer) });
  else GameAudio.stopLoop(oilId);

  if (racer.frozenTimer > 0) GameAudio.startLoop(frozenId, "frozen_loop", { gain: racerAudioGain(racer) });
  else GameAudio.stopLoop(frozenId);

}

function racerAudioGain(racer) {
  return racer.ai ? 0.75 : 1;
}

function updateMonsterAudio(dt) {
  let sleepers = 0;
  let nearestSleeper = null;
  for (const monster of state.monsters) {
    const previous = monster.audioState;
    monster.audioState = monster.state;

    if (monster.state === "sleeping") {
      sleepers += 1;
      if (nearestSleeper === null || Math.abs(monster.x) < Math.abs(nearestSleeper)) nearestSleeper = monster.x;
      // A yawn as it gives up and settles down, before the snoring loop starts.
      if (previous !== "sleeping") sfx("troll_wake", monster.x, { rate: 0.9 });
      continue;
    }
    if (!monster.active || !isMonsterVisible(monster)) continue;

    if (previous !== monster.state) {
      if (monster.state === "grab") sfx("troll_grab", monster.x);
      else if (monster.state === "lift") sfx("troll_lift", monster.x);
      else if (monster.state === "throw") {
        sfx("troll_throw", monster.x);
        sfx("crowd_ooh", monster.x, { gain: 0.7 });
      } else if (monster.state === "fall") {
        sfx("troll_hit", monster.x);
        sfx("troll_fall", monster.x, { gain: 0.85 });
      } else if (monster.state === "walk" && previous === "idle") {
        sfx("troll_notice", monster.x);
      } else if (monster.state === "drop") {
        sfx("storm_monster_drop", monster.x);
      }
    }

    if (monster.state === "walk") {
      monster.audioStepTimer = (monster.audioStepTimer || 0) + dt;
      if (monster.audioStepTimer >= 0.36) {
        monster.audioStepTimer = 0;
        sfx("troll_walk_step", monster.x, { throttleKey: "any", rate: 0.92 + Math.random() * 0.14 });
      }
      monster.audioGruntTimer = (monster.audioGruntTimer || Math.random() * 6) + dt;
      if (monster.audioGruntTimer >= 5.5) {
        monster.audioGruntTimer = 0;
        sfx("troll_idle_grunt", monster.x, { gain: 0.8 });
      }
    }
  }

  if (sleepers > 0 && nearestSleeper !== null) {
    GameAudio.startLoop("troll-sleep", "troll_sleep_loop", { gain: Math.min(1, 0.5 + sleepers * 0.2) });
  } else {
    GameAudio.stopLoop("troll-sleep");
  }
}

function updateCloudAudio(dt) {
  const cloud = state.stormCloud;
  if (cloud) {
    GameAudio.startLoop("storm", "storm_cloud_loop", { gain: 0.9 });
    if (!cloud.audioArrived) {
      cloud.audioArrived = true;
      sfx("storm_cloud_arrive", cloud.x);
    }
    cloud.audioLightningTimer = (cloud.audioLightningTimer || 1.2) - dt;
    if (cloud.audioLightningTimer <= 0) {
      cloud.audioLightningTimer = 1.8 + Math.random() * 2.4;
      sfx("storm_lightning", cloud.x, { gain: 0.8 });
    }
  } else {
    GameAudio.stopLoop("storm");
  }

  const reward = state.rewardCloud;
  if (reward && !reward.audioArrived) {
    reward.audioArrived = true;
    sfx("reward_cloud_arrive", reward.x);
  }
}

function stopGameplayAudioLoops() {
  GameAudio.stopLoopsMatching("mount:");
  GameAudio.stopLoopsMatching("oil:");
  GameAudio.stopLoopsMatching("frozen:");
  GameAudio.stopLoop("troll-sleep");
  GameAudio.stopLoop("storm");
}

function updateAudio(dt) {
  GameAudio.tick();
  updateAudioListener();
  if (!state.running || state.paused || state.done) {
    stopGameplayAudioLoops();
    return;
  }
  for (const racer of state.racers) updateRacerAudio(racer, dt);
  updateMonsterAudio(dt);
  updateCloudAudio(dt);
}

// Fired the moment a pickup is claimed. The oil and horse cases finish inside
// applyPowerup, once it knows whether the oil was blocked and which mount rolled.
function playPowerupAudio(racer, type) {
  if (type === "oil" || type === "horse") return;
  sfx("powerup_pickup_generic", racer.x);
  if (type === "boost") sfx("powerup_boost", racer.x);
  else if (type === "jump") sfx("powerup_highjump", racer.x);
  else if (type === "emp") sfx("powerup_emp", racer.x);
  else if (type === "snowball") sfx("powerup_snowball_pickup", racer.x);
  racerVoice(racer, "pickup", { chance: 0.3 });
}

function playMountAudio(racer) {
  sfx("powerup_horse_pickup", racer.x);
  sfx("horse_mount", racer.x, { gain: 0.8 });
  if (racer.horseType === "unicorn") sfx("unicorn_appear", racer.x);
  else if (racer.horseType === "pegasus") sfx("pegasus_wing_flap", racer.x);
  else sfx("horse_whinny", racer.x);
  racerVoice(racer, "mount", { chance: 0.6, priority: 1 });
}

function playVictoryAudio(winner) {
  // Deliberately not positional: the finish flourish is a UI moment, and the
  // camera can still be some way behind the winner when they cross.
  GameAudio.play("finish_line_cross");
  GameAudio.play("crowd_cheer_short");
  setTimeout(() => GameAudio.play("victory_fanfare"), 260);
  GameAudio.voice(winner.spriteKey, "victory", { priority: 2 });
  for (const racer of state.racers) {
    if (racer === winner) continue;
    setTimeout(() => GameAudio.voice(racer.spriteKey, "defeat", { chance: 0.5 }), 900 + Math.random() * 1200);
  }
  for (let index = 0; index < VICTORY_FIREWORK_COUNT; index += 1) {
    const delay = 500 + index * 320 + Math.random() * 200;
    setTimeout(() => {
      GameAudio.play("firework_launch");
      setTimeout(() => GameAudio.play("firework_burst"), 420 + Math.random() * 200);
    }, delay);
  }
}

function startRace(mode = gameMode.value) {
  stopMenuAnimationLoop();
  hideControllerPointers();
  updateMobileModeAvailability();
  mode = isModeAvailable(mode) ? mode : gameMode.value;
  resetRace(mode);
  state.running = true;
  startPanel.classList.add("hidden");
  pausePanel.classList.add("hidden");
  updateTouchControlsVisibility();
  GameAudio.unlock();
  startMusic();
  GameAudio.play("crowd_cheer_short");
  state.racers.forEach((racer, index) => {
    setTimeout(() => racerVoice(racer, "race_start", { chance: 0.6, priority: 1 }), 420 + index * 320);
  });
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!state.running || state.done) return;
  state.paused = !state.paused;
  pausePanel.classList.toggle("hidden", !state.paused);
  updateTouchControlsVisibility();
  if (state.paused) clearTouchInput();
  if (state.paused) {
    GameAudio.play("ui_pause");
    const pausedTrack = music;
    fadeMusicGain(pausedTrack, 0, PAUSE_MUSIC_FADE_MS, () => {
      if (state.paused && pausedTrack === music) pausedTrack.pause();
    });
    stopGameplayAudioLoops();
    startMenuAnimationLoop();
  } else {
    GameAudio.play("ui_unpause");
    stopMenuAnimationLoop();
    hideControllerPointers();
    startMusic({ fadeInMs: 220 });
    state.lastTime = 0;
    requestAnimationFrame(loop);
  }
}

function returnToMenu() {
  clearNextRaceTimer();
  state.running = false;
  state.done = false;
  state.paused = false;
  stopMusicTransitions();
  music.pause();
  nextMusic.pause();
  setMusicGain(music, 1);
  setMusicGain(nextMusic, 0);
  GameAudio.stopAll();
  GameAudio.play("ui_back");
  pausePanel.classList.add("hidden");
  finishPanel.classList.add("hidden");
  startPanel.classList.remove("hidden");
  clearTouchInput();
  updateTouchControlsVisibility();
  updateMobileModeAvailability();
  setBackground(startingBackground);
  resetRace(gameMode.value);
  drawScene(0);
  startMenuAnimationLoop();
}

function toggleFullscreen() {
  const target = document.querySelector(".game-frame");
  if (!document.fullscreenElement) {
    target.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function finishRace(winner) {
  state.running = false;
  state.done = true;
  state.winner = winner;
  state.victoryStartTime = performance.now();
  clearTouchInput();
  updateTouchControlsVisibility();
  stopGameplayAudioLoops();
  const nextBackground = BACKGROUNDS[(state.backgroundIndex + 1) % BACKGROUNDS.length];
  beginBoardEndMusic(nextBackground);
  playVictoryAudio(winner);
  const playerWon = !winner.ai;
  finishTitle.textContent = `Hooray! ${winner.name} Wins!`;
  finishText.textContent = playerWon
    ? `${winner.name} crossed the finish first. Time for fireworks! Next race: ${nextBackground.name}.`
    : `${winner.name} crossed the finish first. Fireworks for the champion! Next race: ${nextBackground.name}.`;
  finishPanel.classList.remove("hidden");
  finishPanel.classList.add("celebration");
  startMenuAnimationLoop();
  clearNextRaceTimer();
  state.nextRaceTimer = setTimeout(() => {
    advanceBackground();
    startRace(state.mode);
  }, NEXT_RACE_DELAY);
}

function startMusic(options = {}) {
  stopMusicTransitions();
  const desiredTrack = getCurrentBackground().music;
  if (nextMusic.getAttribute("src") === desiredTrack) {
    const previousMusic = music;
    music = nextMusic;
    nextMusic = previousMusic;
    nextMusic.pause();
    setMusicGain(nextMusic, 0);
  }
  syncBackgroundMusic();
  if (options.fadeInMs > 0) {
    fadeMusicGain(music, 1, options.fadeInMs);
  } else {
    setMusicGain(music, 1);
  }
  music.play().catch(() => {
    // Browsers may block audio until a trusted gesture; the next race click will try again.
  });
}

function syncBackgroundMusic() {
  const track = getCurrentBackground().music;
  if (!track || music.getAttribute("src") === track) return;
  cancelMusicFade(music);
  music.pause();
  music.setAttribute("src", track);
  music.load();
}

function setMusicGain(element, gain) {
  const clampedGain = clamp(gain, 0, 1);
  musicGains.set(element, clampedGain);
  GameAudio.setMusicGain(element, clampedGain);
}

function cancelMusicFade(element) {
  musicFadeTokens.set(element, (musicFadeTokens.get(element) || 0) + 1);
}

function fadeMusicGain(element, targetGain, durationMs, onComplete = null) {
  cancelMusicFade(element);
  const token = musicFadeTokens.get(element);
  const startGain = musicGains.get(element) ?? 1;
  const startTime = performance.now();
  if (durationMs <= 0) {
    setMusicGain(element, targetGain);
    onComplete?.();
    return;
  }
  const step = time => {
    if (musicFadeTokens.get(element) !== token) return;
    const progress = clamp((time - startTime) / durationMs, 0, 1);
    setMusicGain(element, startGain + (targetGain - startGain) * progress);
    if (progress < 1) requestAnimationFrame(step);
    else onComplete?.();
  };
  requestAnimationFrame(step);
}

function stopMusicTransitions() {
  if (nextTrackCrossfadeTimer !== null) {
    clearTimeout(nextTrackCrossfadeTimer);
    nextTrackCrossfadeTimer = null;
  }
  cancelMusicFade(music);
  cancelMusicFade(nextMusic);
}

function beginBoardEndMusic(nextBackground) {
  fadeMusicGain(music, CELEBRATION_MUSIC_GAIN, CELEBRATION_MUSIC_FADE_MS);
  nextTrackCrossfadeTimer = setTimeout(() => {
    nextTrackCrossfadeTimer = null;
    const nextTrack = nextBackground.music;
    nextMusic.pause();
    if (nextMusic.getAttribute("src") !== nextTrack) {
      nextMusic.setAttribute("src", nextTrack);
      nextMusic.load();
    }
    nextMusic.currentTime = 0;
    setMusicGain(nextMusic, 0);
    nextMusic.play().catch(() => {});
    const outgoingMusic = music;
    fadeMusicGain(outgoingMusic, 0, NEXT_TRACK_CROSSFADE_MS, () => outgoingMusic.pause());
    fadeMusicGain(nextMusic, NEXT_TRACK_PREVIEW_GAIN, NEXT_TRACK_CROSSFADE_MS);
  }, NEXT_TRACK_CROSSFADE_DELAY_MS);
}

function loop(time) {
  if (state.paused) return;
  const dt = Math.min(0.033, (time - (state.lastTime || time)) / 1000);
  state.lastTime = time;
  update(dt);
  drawScene(dt);
  if (state.running) requestAnimationFrame(loop);
}

function startMenuAnimationLoop() {
  if (menuAnimationFrame !== null) return;
  lastMenuFrameTime = 0;
  menuAnimationFrame = requestAnimationFrame(menuAnimationLoop);
}

function stopMenuAnimationLoop() {
  if (menuAnimationFrame === null) return;
  cancelAnimationFrame(menuAnimationFrame);
  menuAnimationFrame = null;
  lastMenuFrameTime = 0;
}

function menuAnimationLoop(time) {
  menuAnimationFrame = null;
  if (state.running && !state.paused) {
    hideControllerPointers();
    return;
  }
  const dt = Math.min(0.033, (time - (lastMenuFrameTime || time)) / 1000);
  lastMenuFrameTime = time;
  updateControllerPointers(dt);
  drawScene(dt);
  menuAnimationFrame = requestAnimationFrame(menuAnimationLoop);
}

function update(dt) {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const racerCameraStartPositions = new Map(state.racers.map(racer => [racer, racer.x]));
  const startPressed = connectedGamepads(gamepads).some(pad => pad.buttons[9]?.pressed);
  if (startPressed && !state.lastStartPressed) togglePause();
  state.lastStartPressed = startPressed;
  if (state.paused) return;

  for (const racer of state.racers) {
    if (racer.finished) continue;
    const input = racer.ai ? aiInput(racer) : playerInput(racer.playerIndex, gamepads);
    racer.hitTimer = Math.max(0, racer.hitTimer - dt);
    const previousFrozenTimer = racer.frozenTimer;
    racer.frozenTimer = Math.max(0, racer.frozenTimer - dt);
    if (previousFrozenTimer > 0 && racer.frozenTimer === 0) sfx("frozen_break", racer.x);
    updateStackTimers(racer, dt);
    racer.empTimer = Math.max(0, racer.empTimer - dt);
    const previousOilTimer = racer.oilTimer;
    racer.oilTimer = Math.max(0, racer.oilTimer - dt);
    if (previousOilTimer > 0 && racer.oilTimer === 0) sfx("oil_slide_end", racer.x);
    racer.pushTimer = Math.max(0, racer.pushTimer - dt);
    racer.pushCooldown = Math.max(0, racer.pushCooldown - dt);
    racer.mountBumpCooldown = Math.max(0, racer.mountBumpCooldown - dt);
    racer.fallBackTimer = Math.max(0, racer.fallBackTimer - dt);
    if (Number.isFinite(racer.horseTimer)) {
      const previousHorseTimer = racer.horseTimer;
      racer.horseTimer = Math.max(0, racer.horseTimer - dt);
      if (previousHorseTimer > HORSE_FLASH_TIME && racer.horseTimer <= HORSE_FLASH_TIME) {
        sfx("mount_expire_warning", racer.x);
      }
      if (previousHorseTimer > 0 && racer.horseTimer === 0) {
        sfx("mount_expire_poof", racer.x);
        GameAudio.stopLoop(racerLoopId(racer, "mount"));
      }
    }
    racer.unicornBeamCooldown = Math.max(0, racer.unicornBeamCooldown - dt);
    if (racer.horseTimer === 0) {
      racer.horseType = "horse";
      racer.pegasusGliding = false;
    }

    if (racer.grabbedBy) {
      racer.speed = 0;
      racer.moving = false;
      racer.frameTime += dt * 3.2;
      racer.frame = Math.floor(racer.frameTime) % 3;
      continue;
    }

    const mounted = isMounted(racer);
    const oilAffectsRacer = racer.oilTimer > 0 && (!mounted || !isHorsingAroundMode());
    if (racer.frozenTimer > 0 || racer.fallBackTimer > 0 || oilAffectsRacer) {
      input.horizontal = 0;
      input.vertical = 0;
      input.jump = false;
    }
    if (mounted && racer.horseType !== "unicorn" && !canMountedRacerThrowSnowballs(racer)) input.push = false;

    if (input.push && racer.pushCooldown === 0 && racer.pushTimer === 0) {
      racer.pushTimer = PUSH_ACTIVE_TIME;
      racer.pushCooldown = PUSH_COOLDOWN;
      racer.pushedTargets.clear();
      if (mounted && racer.horseType === "unicorn") {
        fireRainbowBeam(racer);
      } else if (racer.snowballs > 0) {
        launchSnowball(racer);
      } else {
        sfx("push_whoosh", racer.x);
        racerVoice(racer, "push", { chance: 0.2 });
      }
    }
    if (racer.playerIndex === 0) updateTouchControlsVisibility();

    const boostMult = !mounted || isHorsingAroundMode() ? getBoostMultiplier(racer) : 1;
    const runSpeed = mounted ? (racer.ai ? HORSE_AI_RUN_SPEED : HORSE_RUN_SPEED) : (racer.ai ? AI_RUN_SPEED : PLAYER_RUN_SPEED);
    let forward = input.horizontal * runSpeed * boostMult;
    if (oilAffectsRacer) {
      const oilProgress = racer.oilTimer / OIL_SLIDE_DURATION;
      forward = racer.oilVelocity * oilProgress;
      racer.facing = racer.oilVelocity < 0 ? -1 : 1;
      racer.fallBackFacing = racer.oilVelocity < 0 ? -1 : 1;
    }
    if (racer.hitTimer > 0) forward *= 0.35;
    racer.speed = forward;
    racer.moving = Math.abs(forward) > 1 || Math.abs(input.vertical) > 0.05;
    if (Math.abs(input.horizontal) > 0.05) {
      racer.facing = input.horizontal < 0 ? -1 : 1;
    }

    const previousX = racer.x;
    const previousY = racer.y;
    const previousZ = racer.z;
    const normalMoveX = constrainHumanSeparationMove(racer, forward * dt);
    racer.x += normalMoveX + racer.knockbackX * dt;
    racer.x = clamp(racer.x, 40, FINISH);
    racer.y += input.vertical * PLAYER_LANE_SPEED * dt;
    racer.y = clamp(racer.y, TRACK_TOP, TRACK_BOTTOM);
    racer.knockbackX *= Math.pow(0.04, dt);
    if (Math.abs(racer.knockbackX) < 6) racer.knockbackX = 0;

    if (input.jump && (racer.z === 0 || racer.onObstacle) && !racer.jumpStarted && racer.landingTimer === 0) {
      const jumpPower = mounted ? getHorseJumpPower(racer) : getJumpPower(racer);
      racer.onObstacle = false;
      racer.jumpStarted = true;
      racer.jumpFrame = 0;
      racer.vy = jumpPower;
      if (!mounted) {
        const boosted = racer.highJumpTimer > 0;
        racerVoice(racer, boosted ? "jump_big" : "jump", { chance: boosted ? 0.8 : 0.35 });
      }
    }
    const pegasusHolding = mounted && racer.horseType === "pegasus" && input.jump && racer.z > 0;
    racer.z += racer.vy * dt;
    if (pegasusHolding && racer.z >= PEGASUS_HOVER_Z) {
      racer.z = PEGASUS_HOVER_Z;
      racer.vy = 0;
      racer.pegasusGliding = true;
    } else {
      racer.pegasusGliding = false;
      racer.vy -= GRAVITY * dt;
    }
    if (racer.z > 38 && racer.vy >= 0) racer.jumpFrame = 1;
    if (racer.z > 0 && racer.vy < 0) racer.jumpFrame = racer.z <= LANDING_POSE_DISTANCE ? 2 : 1;
    if (racer.z < 0) {
      const impactSpeed = Math.abs(racer.vy);
      racer.z = 0;
      racer.vy = 0;
      if (racer.jumpStarted) {
        racer.landingTimer = mounted ? 0.16 : UNMOUNTED_LANDING_PAUSE_DURATION;
        if (!mounted) {
          const heavy = impactSpeed > 620;
          if (heavy) racerVoice(racer, "land", { chance: 0.3 });
        }
      }
      racer.jumpStarted = false;
    }
    racer.landingTimer = Math.max(0, racer.landingTimer - dt);

    resolveObstacleCollisions(racer, previousX, previousY, previousZ);

    for (const powerup of state.powerups) {
      if (powerup.taken) continue;
      if (isPowerupDropping(powerup)) continue;
      if (isMounted(racer) && !isHorsingAroundMode()) continue;
      if (racer.ai && racer.x > getHumanLeadX()) continue;
      const close = Math.abs(racer.x - powerup.x) < 34 && Math.abs(racer.y + 54 - powerup.y) < 34 && racer.z < 80;
      if (close) {
        powerup.taken = applyPowerup(racer, powerup);
      }
    }

    if (racer.pushTimer > 0) performPushAttack(racer);

    racer.frameTime += dt * (racer.moving ? 9.5 : 3.2);
    racer.frame = Math.floor(racer.frameTime) % 3;

    if (racer.x >= FINISH) {
      racer.finished = true;
      racer.finishTime = performance.now();
      finishRace(racer);
      break;
    }
  }

  updateMonsters(dt);
  updateStormCloud(dt);
  updateRewardCloud(dt);
  updateProjectiles(dt);
  updateRainbowBeams(dt);
  updatePowerupDrops(dt);
  bumpMonstersWithSpecialMounts();
  pushRacers(dt);
  updateAmandaHazards(dt);
  updateRacerCameraVelocities(racerCameraStartPositions, dt);
  updateCamera(dt);
  updateHud();
  updateAudio(dt);
}

function updateRacerCameraVelocities(startPositions, dt) {
  const elapsed = Math.max(dt, 0.0001);
  for (const racer of state.racers) {
    const startX = startPositions.get(racer);
    racer.cameraVelocityX = Number.isFinite(startX) ? (racer.x - startX) / elapsed : racer.speed || 0;
  }
}

function updateStackTimers(racer, dt) {
  racer.speedBoostStacks = racer.speedBoostStacks
    .map(timer => timer - dt)
    .filter(timer => timer > 0);
  racer.highJumpStacks = racer.highJumpStacks
    .map(timer => timer - dt)
    .filter(timer => timer > 0);
  racer.speedBoostTimer = racer.speedBoostStacks.length > 0 ? Math.max(...racer.speedBoostStacks) : 0;
  racer.highJumpTimer = racer.highJumpStacks.length > 0 ? Math.max(...racer.highJumpStacks) : 0;
}

function getBoostMultiplier(racer) {
  const stacks = racer.speedBoostStacks.length;
  return stacks > 0 ? 1 + stacks * 0.45 : 1;
}

function getJumpPower(racer) {
  const stacks = racer.highJumpStacks.length;
  return stacks > 0 ? JUMP_POWER * (1 + stacks * 0.35) : JUMP_POWER;
}

function getHorseJumpPower(racer) {
  if (!isHorsingAroundMode()) return HORSE_JUMP_POWER;
  const stacks = racer.highJumpStacks.length;
  return stacks > 0 ? HORSE_JUMP_POWER * (1 + stacks * 0.35) : HORSE_JUMP_POWER;
}

function getHumanRacers() {
  return state.racers.filter(racer => !racer.ai && !racer.finished);
}

function getHumanRange(exceptRacer = null, candidateX = 0) {
  const humanRacers = getHumanRacers();
  if (humanRacers.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const racer of humanRacers) {
    const x = racer === exceptRacer ? candidateX : racer.x;
    min = Math.min(min, x);
    max = Math.max(max, x);
  }
  return { min, max, span: max - min };
}

function getMaxVisibleHumanSpan() {
  return Math.max(120, getWorldViewportWidth() - RACER_VISIBLE_LEFT_MARGIN - RACER_VISIBLE_RIGHT_MARGIN);
}

function constrainHumanSeparationMove(racer, moveX) {
  if (racer.ai || racer.finished || moveX === 0) return moveX;
  if (state.cameraMode !== "clamp") return moveX;
  const current = getHumanRange();
  if (!current) return moveX;
  const maxSpan = getMaxVisibleHumanSpan();
  const nextX = clamp(racer.x + moveX, 40, FINISH);
  const next = getHumanRange(racer, nextX);
  const isTrailMovingBack = racer.x === current.min && moveX < 0;
  const isLeadMovingAhead = racer.x === current.max && moveX > 0;
  if (!next || next.span <= maxSpan) return moveX;

  if (!isTrailMovingBack && !isLeadMovingAhead) return moveX;

  racer.speed = 0;
  if (current.span >= maxSpan) return 0;
  if (isTrailMovingBack) return Math.max(0, current.max - maxSpan - racer.x);
  return Math.min(0, current.min + maxSpan - racer.x);
}

function getObstacleHitBounds(obstacle) {
  const left = obstacle.x - obstacle.hitW / 2;
  const right = obstacle.x + obstacle.hitW / 2;
  const centerY = obstacle.y + 18;
  const top = centerY - obstacle.hitH / 2;
  const bottom = centerY + obstacle.hitH / 2;
  return { left, right, top, bottom };
}

function resolveObstacleCollisions(racer, previousX, previousY, previousZ) {
  racer.onObstacle = false;
  for (const obstacle of state.obstacles) {
    const bounds = getObstacleHitBounds(obstacle);
    const previousFootLeft = previousX - PLAYER_FOOT_W / 2;
    const previousFootRight = previousX + PLAYER_FOOT_W / 2;
    const previousFootTop = previousY + 54 - PLAYER_FOOT_H / 2;
    const previousFootBottom = previousY + 54 + PLAYER_FOOT_H / 2;
    const footLeft = racer.x - PLAYER_FOOT_W / 2;
    const footRight = racer.x + PLAYER_FOOT_W / 2;
    const footTop = racer.y + 54 - PLAYER_FOOT_H / 2;
    const footBottom = racer.y + 54 + PLAYER_FOOT_H / 2;
    const footOverlapsX = footRight > bounds.left && footLeft < bounds.right;
    const footOverlapsY = footBottom > bounds.top && footTop < bounds.bottom;
    const landedOnTop = footOverlapsX && footOverlapsY && previousZ >= HURDLE_TOP_Z && racer.z <= HURDLE_TOP_Z && racer.vy <= 0;
    if (landedOnTop) {
      racer.z = HURDLE_TOP_Z;
      racer.vy = 0;
      racer.jumpStarted = false;
      racer.landingTimer = 0;
      racer.onObstacle = true;
      continue;
    }

    const groundedHit = footOverlapsY && racer.z < HURDLE_TOP_Z;
    const crossedFromLeft = previousFootRight <= bounds.left && footRight > bounds.left;
    const crossedFromRight = previousFootLeft >= bounds.right && footLeft < bounds.right;
    const crossedFromAbove = previousFootBottom <= bounds.top && footBottom > bounds.top;
    const crossedFromBelow = previousFootTop >= bounds.bottom && footTop < bounds.bottom;
    if (groundedHit && crossedFromLeft) {
      racer.x = bounds.left - PLAYER_FOOT_W / 2;
      racer.speed = 0;
    } else if (groundedHit && crossedFromRight) {
      racer.x = bounds.right + PLAYER_FOOT_W / 2;
      racer.speed = 0;
    } else if (footOverlapsX && racer.z < HURDLE_TOP_Z && crossedFromAbove) {
      racer.y = bounds.top - 54 - PLAYER_FOOT_H / 2;
    } else if (footOverlapsX && racer.z < HURDLE_TOP_Z && crossedFromBelow) {
      racer.y = bounds.bottom - 54 + PLAYER_FOOT_H / 2;
    }
  }
}

function updateAmandaHazards(dt) {
  for (const obstacle of state.obstacles) {
    if (!obstacle.amandaHazard) continue;
    obstacle.amandaCooldown = Math.max(0, obstacle.amandaCooldown - dt);

    if (obstacle.amandaState === "hidden") {
      obstacle.amandaReveal = 0;
      if (obstacle.amandaCooldown > 0) continue;
      const target = findAmandaHazardTarget(obstacle);
      if (!target) continue;
      obstacle.amandaState = "emerging";
      obstacle.amandaTimer = 0;
      sfx("amanda_emerge", obstacle.x);
      obstacle.amandaTarget = target;
      obstacle.amandaFacing = target.x < obstacle.x ? -1 : 1;
      continue;
    }

    obstacle.amandaTimer += dt;
    if (obstacle.amandaState === "emerging") {
      obstacle.amandaReveal = smoothAmandaHazardProgress(obstacle.amandaTimer / AMANDA_HAZARD_EMERGE_TIME);
      if (obstacle.amandaTimer >= AMANDA_HAZARD_EMERGE_TIME) {
        obstacle.amandaState = "pushing";
        obstacle.amandaTimer = 0;
        obstacle.amandaReveal = 1;
        sfx("amanda_shove", obstacle.x);
        sfx("amanda_giggle_sting", obstacle.x, { gain: 0.8 });
        GameAudio.voice("amanda", "taunt", { worldX: obstacle.x, chance: 0.4 });
        pushRacersFromAmandaHazard(obstacle);
      }
    } else if (obstacle.amandaState === "pushing") {
      obstacle.amandaReveal = 1;
      if (obstacle.amandaTimer >= AMANDA_HAZARD_HOLD_TIME) {
        obstacle.amandaState = "retreating";
        obstacle.amandaTimer = 0;
        sfx("amanda_retreat", obstacle.x);
      }
    } else if (obstacle.amandaState === "retreating") {
      obstacle.amandaReveal = 1 - smoothAmandaHazardProgress(obstacle.amandaTimer / AMANDA_HAZARD_RETREAT_TIME);
      if (obstacle.amandaTimer >= AMANDA_HAZARD_RETREAT_TIME) {
        obstacle.amandaState = "hidden";
        obstacle.amandaTimer = 0;
        obstacle.amandaReveal = 0;
        obstacle.amandaCooldown = AMANDA_HAZARD_COOLDOWN;
        obstacle.amandaTarget = null;
      }
    }
  }
}

function findAmandaHazardTarget(obstacle) {
  return state.racers
    .filter(racer => !racer.finished && !racer.grabbedBy && racer.z < 100)
    .filter(racer => Math.abs(racer.x - obstacle.x) <= AMANDA_HAZARD_TRIGGER_X)
    .filter(racer => Math.abs((racer.y + 54) - (obstacle.y + 18)) <= AMANDA_HAZARD_TRIGGER_Y)
    .sort((a, b) => Math.abs(a.x - obstacle.x) - Math.abs(b.x - obstacle.x))[0] || null;
}

function pushRacersFromAmandaHazard(obstacle) {
  for (const racer of state.racers) {
    if (racer.finished || racer.grabbedBy || racer.z >= 110) continue;
    const dx = racer.x - obstacle.x;
    const dy = (racer.y + 54) - (obstacle.y + 18);
    const pushRangeX = racer === obstacle.amandaTarget ? AMANDA_HAZARD_TARGET_PUSH_X : AMANDA_HAZARD_PUSH_X;
    if (Math.abs(dx) > pushRangeX || Math.abs(dy) > AMANDA_HAZARD_PUSH_Y) continue;
    const direction = racer === obstacle.amandaTarget
      ? obstacle.amandaFacing
      : Math.sign(dx) || -Math.sign(racer.speed) || -racer.facing || 1;
    racer.fallBackTimer = Math.max(racer.fallBackTimer, 0.7);
    racer.fallBackFacing = -direction;
    racer.hitTimer = Math.max(racer.hitTimer, 0.3);
    racer.knockbackX = direction * AMANDA_HAZARD_PUSH_FORCE;
    racer.vy = Math.max(racer.vy, 170);
    racer.jumpStarted = false;
  }
}

function smoothAmandaHazardProgress(value) {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function resolveMonsterObstacleCollisions(monster, previousX, previousY) {
  if (monster.state === "drop") return;
  for (const obstacle of state.obstacles) {
    const bounds = getObstacleHitBounds(obstacle);
    const previousFootLeft = previousX - MONSTER_FOOT_W / 2;
    const previousFootRight = previousX + MONSTER_FOOT_W / 2;
    const previousFootTop = previousY + 54 - MONSTER_FOOT_H / 2;
    const previousFootBottom = previousY + 54 + MONSTER_FOOT_H / 2;
    const footLeft = monster.x - MONSTER_FOOT_W / 2;
    const footRight = monster.x + MONSTER_FOOT_W / 2;
    const footTop = monster.y + 54 - MONSTER_FOOT_H / 2;
    const footBottom = monster.y + 54 + MONSTER_FOOT_H / 2;
    const footOverlapsX = footRight > bounds.left && footLeft < bounds.right;
    const footOverlapsY = footBottom > bounds.top && footTop < bounds.bottom;
    const crossedFromLeft = previousFootRight <= bounds.left && footRight > bounds.left;
    const crossedFromRight = previousFootLeft >= bounds.right && footLeft < bounds.right;
    const crossedFromAbove = previousFootBottom <= bounds.top && footBottom > bounds.top;
    const crossedFromBelow = previousFootTop >= bounds.bottom && footTop < bounds.bottom;
    if (footOverlapsY && crossedFromLeft) {
      monster.x = bounds.left - MONSTER_FOOT_W / 2;
      monster.knockbackX = Math.min(0, monster.knockbackX);
    } else if (footOverlapsY && crossedFromRight) {
      monster.x = bounds.right + MONSTER_FOOT_W / 2;
      monster.knockbackX = Math.max(0, monster.knockbackX);
    } else if (footOverlapsX && crossedFromAbove) {
      monster.y = bounds.top - 54 - MONSTER_FOOT_H / 2;
    } else if (footOverlapsX && crossedFromBelow) {
      monster.y = bounds.bottom - 54 + MONSTER_FOOT_H / 2;
    }
  }
}

function applyPowerup(racer, powerupOrType) {
  const type = typeof powerupOrType === "string" ? powerupOrType : powerupOrType.type;
  if (hasActivePowerup(racer, type)) return false;
  playPowerupAudio(racer, type);
  if (type === "boost") {
    racer.speedBoostStacks.push(4);
    racer.speedBoostTimer = Math.max(...racer.speedBoostStacks);
    racer.powerupMessage = racer.speedBoostStacks.length > 1 ? `BOOST x${racer.speedBoostStacks.length}` : "BOOST";
  } else if (type === "jump") {
    racer.highJumpStacks.push(5);
    racer.highJumpTimer = Math.max(...racer.highJumpStacks);
    racer.powerupMessage = racer.highJumpStacks.length > 1 ? `HIGH JUMP x${racer.highJumpStacks.length}` : "HIGH JUMP";
  } else if (type === "emp") {
    racer.empTimer = 0.45;
    racer.powerupMessage = "EMP";
    const visibleMonsters = state.monsters.filter(monster => monster.active && isMonsterVisible(monster) && isMonsterEmpTarget(monster));
    if (visibleMonsters.length > 0) {
      for (const monster of visibleMonsters) stunMonsterWithEmp(monster);
    } else {
      for (const other of state.racers) {
        if (other === racer || other.finished) continue;
        applyEmpHit(racer, other);
      }
    }
  } else if (type === "oil") {
    if (isMounted(racer) && isHorsingAroundMode()) {
      racer.oilTimer = 0;
      racer.powerupMessage = "OIL BLOCKED";
      sfx("powerup_blocked", racer.x);
      return true;
    }
    sfx("oil_splat", racer.x);
    sfx("oil_slip_start", racer.x);
    racerVoice(racer, "slip", { chance: 0.8, priority: 1 });
    racer.oilTimer = OIL_SLIDE_DURATION;
    racer.oilVelocity = Math.max(160, Math.abs(racer.speed), OIL_SLIDE_SPEED) * (racer.facing < 0 ? -1 : 1);
    racer.fallBackTimer = OIL_SLIDE_DURATION;
    racer.fallBackFacing = racer.oilVelocity < 0 ? -1 : 1;
    racer.knockbackX = 0;
    racer.powerupMessage = "OIL";
  } else if (type === "snowball") {
    racer.snowballs += SNOWBALL_PICKUP_COUNT;
    racer.powerupMessage = `SNOWBALLS x${racer.snowballs}`;
  } else if (type === "horse") {
    racer.horseType = typeof powerupOrType === "string" ? chooseHorseType() : powerupOrType.horseType || "horse";
    racer.horseTimer = horseDurationForType(racer.horseType);
    racer.frozenTimer = 0;
    racer.fallBackTimer = racer.oilTimer > 0 ? racer.fallBackTimer : 0;
    racer.knockbackX = 0;
    racer.pegasusGliding = false;
    racer.powerupMessage = racer.horseType === "horse" ? "HORSE" : racer.horseType.toUpperCase();
    playMountAudio(racer);
  }
  return true;
}

function hasActivePowerup(racer, type) {
  if (type === "boost") return false;
  if (type === "jump") return false;
  if (type === "emp") return racer.empTimer > 0;
  if (type === "oil") return racer.oilTimer > 0;
  if (type === "snowball") return false;
  if (type === "horse" && isHorsingAroundMode()) return false;
  if (type === "horse") return racer.horseTimer > 0;
  return false;
}

function isMounted(racer) {
  return racer.horseTimer > 0;
}

function canMountedRacerThrowSnowballs(racer) {
  return isHorsingAroundMode() && isMounted(racer) && racer.horseType !== "unicorn" && racer.snowballs > 0;
}

function isMonsterEmpTarget(monster) {
  return monster.state !== "sleeping" && monster.state !== "ground";
}

function applyEmpHit(attacker, target) {
  sfx("frozen_start", target.x);
  racerVoice(target, "frozen", { chance: 0.6, priority: 1 });
  target.grabbedBy = null;
  target.empTimer = 0.45;
  target.frozenTimer = Math.max(target.frozenTimer, 1.2);
  target.hitTimer = Math.max(target.hitTimer, 0.35);
  target.fallBackTimer = Math.max(target.fallBackTimer, 0.45);
  target.fallBackFacing = attacker.x < target.x ? -1 : 1;
  target.knockbackX = (target.x >= attacker.x ? 1 : -1) * PUSH_FORCE * 0.65;
  target.vy = Math.max(target.vy, 120);
  target.jumpStarted = false;
}

function performPushAttack(attacker) {
  if (isMounted(attacker)) return;
  for (const other of state.racers) {
    if (other === attacker || other.finished || isMounted(other) || attacker.pushedTargets.has(other)) continue;
    const dx = other.x - attacker.x;
    const dy = (other.y + 54) - (attacker.y + 54);
    const inFront = attacker.facing > 0 ? dx > 2 && dx < PUSH_RANGE_X : dx < -2 && dx > -PUSH_RANGE_X;
    if (!inFront || Math.abs(dy) > PUSH_RANGE_Y || Math.max(attacker.z, other.z) > 64) continue;
    applyPushHit(attacker, other, attacker.facing);
    attacker.pushedTargets.add(other);
  }
  for (const monster of state.monsters) {
    if (monster.state === "sleeping" || monster.state === "ground" || attacker.pushedTargets.has(monster)) continue;
    const dx = monster.x - attacker.x;
    const dy = (monster.y + 54) - (attacker.y + 54);
    const inFront = attacker.facing > 0 ? dx > 2 && dx < PUSH_RANGE_X + 28 : dx < -2 && dx > -PUSH_RANGE_X - 28;
    if (!inFront || Math.abs(dy) > PUSH_RANGE_Y + 18 || attacker.z > 64) continue;
    applyMonsterKnockback(monster, attacker.facing);
    attacker.pushedTargets.add(monster);
  }
}

function launchSnowball(racer) {
  if (racer.snowballs <= 0) return;
  racer.snowballs -= 1;
  sfx("snowball_throw", racer.x);
  racerVoice(racer, "taunt", { chance: 0.15 });
  state.projectiles.push({
    owner: racer,
    x: racer.x + racer.facing * 44,
    y: racer.y + 32,
    drawY: snowballDrawY(racer),
    z: racer.z + 42,
    vx: racer.facing * SNOWBALL_SPEED,
    distance: 0,
    hitTargets: new Set()
  });
}

function updateProjectiles(dt) {
  for (const projectile of state.projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.drawY = snowballDrawY(projectile.owner);
    projectile.distance += Math.abs(projectile.vx) * dt;
    for (const monster of state.monsters) {
      if (monster.state === "sleeping" || monster.state === "ground" || projectile.hitTargets.has(monster)) continue;
      const close = Math.abs(monster.x - projectile.x) < 62 && Math.abs(monster.y + 54 - projectile.y) < 58 && Math.abs(projectile.z) < 140;
      if (!close) continue;
      sfx("snowball_hit", monster.x);
      applyMonsterKnockback(monster, Math.sign(projectile.vx) || 1);
      projectile.hitTargets.add(monster);
      projectile.distance = SNOWBALL_RANGE;
      break;
    }
    if (projectile.distance >= SNOWBALL_RANGE) continue;
    for (const racer of state.racers) {
      if (racer === projectile.owner || racer.finished || isMounted(racer) || projectile.hitTargets.has(racer)) continue;
      const close = Math.abs(racer.x - projectile.x) < 42 && Math.abs((racer.y + 54) - projectile.y) < 44 && Math.abs(racer.z - projectile.z) < 78;
      if (!close) continue;
      sfx("snowball_hit", racer.x);
      applyPushHit(projectile.owner, racer, Math.sign(projectile.vx) || 1);
      projectile.hitTargets.add(racer);
      projectile.distance = SNOWBALL_RANGE;
      break;
    }
  }
  state.projectiles = state.projectiles.filter(projectile => projectile.distance < SNOWBALL_RANGE);
}

function fireRainbowBeam(racer) {
  if (racer.unicornBeamCooldown > 0) return;
  racer.unicornBeamCooldown = 0.35;
  sfx("unicorn_beam_fire", racer.x);
  const startX = racer.x + racer.facing * 54;
  const y = snowballDrawY(racer) - racer.z * 0.28;
  const endX = startX + racer.facing * UNICORN_BEAM_RANGE;
  state.rainbowBeams.push({
    x1: startX,
    x2: endX,
    y,
    timer: UNICORN_BEAM_DURATION,
    duration: UNICORN_BEAM_DURATION
  });
  for (const monster of state.monsters) {
    if (monster.state === "sleeping" || monster.state === "ground") continue;
    const ahead = racer.facing > 0 ? monster.x > startX && monster.x < endX : monster.x < startX && monster.x > endX;
    if (!ahead || Math.abs(monster.y - racer.y) > 120) continue;
    sfx("unicorn_beam_hit", monster.x);
    applyMonsterKnockback(monster, racer.facing);
  }
}

function updateRainbowBeams(dt) {
  for (const beam of state.rainbowBeams) {
    beam.timer -= dt;
  }
  state.rainbowBeams = state.rainbowBeams.filter(beam => beam.timer > 0);
}

function nextStormDelay() {
  if (state.difficulty === "too-many") {
    return randomDelay(STORM_CLOUD_AVERAGE_INTERVAL, STORM_CLOUD_MIN_INTERVAL);
  }
  if (state.difficulty === "extra") {
    return randomDelay(EXTRA_MONSTER_CLOUD_AVERAGE_INTERVAL, EXTRA_MONSTER_CLOUD_MIN_INTERVAL);
  }
  return Infinity;
}

function nextRewardDelay() {
  if (state.difficulty !== "too-many") return Infinity;
  return randomDelay(REWARD_CLOUD_AVERAGE_INTERVAL, REWARD_CLOUD_MIN_INTERVAL);
}

function randomDelay(average, min) {
  return min + (-Math.log(Math.max(0.001, Math.random())) * Math.max(1, average - min));
}

function getCloudDropTargetX() {
  const humanRacers = state.racers.filter(racer => !racer.ai && !racer.finished);
  const racers = humanRacers.length > 0 ? humanRacers : state.racers.filter(racer => !racer.finished);
  if (racers.length === 0) return state.camera + getWorldViewportWidth() * 0.55;
  const lead = Math.max(...racers.map(racer => racer.x));
  const trail = Math.min(...racers.map(racer => racer.x));
  return Math.random() < 0.5 ? (lead + trail) / 2 : lead + 120 + Math.random() * 260;
}

function startStormCloud() {
  const targetX = clamp(getCloudDropTargetX(), 120, FINISH - 220);
  const viewWidth = getWorldViewportWidth();
  const startX = state.camera + viewWidth + STORM_CLOUD_START_PADDING;
  const endX = state.camera - STORM_CLOUD_END_PADDING;
  state.stormCloud = {
    targetX,
    startX,
    endX,
    x: startX,
    y: 118 + Math.random() * 68,
    timer: 0,
    duration: STORM_CLOUD_DURATION,
    dropped: false
  };
}

function updateStormCloud(dt) {
  if (!["extra", "too-many"].includes(state.difficulty) || !state.running || state.done) {
    state.stormCloud = null;
    state.stormTimer = nextStormDelay();
    return;
  }

  if (!state.stormCloud) {
    state.stormTimer -= dt;
    if (state.stormTimer <= 0) startStormCloud();
    return;
  }

  const cloud = state.stormCloud;
  cloud.timer += dt;
  const progress = clamp(cloud.timer / cloud.duration, 0, 1);
  cloud.x = cloud.startX + (cloud.endX - cloud.startX) * progress;
  if (!cloud.dropped && cloud.timer >= STORM_CLOUD_DROP_TIME) {
    dropMonsterNear(cloud.x, TRACK_TOP + 36 + Math.random() * (TRACK_BOTTOM - TRACK_TOP - 72), cloud.y + 58);
    cloud.dropped = true;
  }
  if (progress >= 1) {
    state.stormCloud = null;
    state.stormTimer = nextStormDelay();
  }
}

function startRewardCloud() {
  const targetX = clamp(getCloudDropTargetX(), 120, FINISH - 220);
  const type = GOOD_POWERUP_TYPES[Math.floor(Math.random() * GOOD_POWERUP_TYPES.length)];
  const viewWidth = getWorldViewportWidth();
  const startX = state.camera + viewWidth + STORM_CLOUD_START_PADDING;
  const endX = state.camera - STORM_CLOUD_END_PADDING;
  state.rewardCloud = {
    targetX,
    type,
    startX,
    endX,
    x: startX,
    y: 92 + Math.random() * 56,
    timer: 0,
    duration: STORM_CLOUD_DURATION,
    dropped: false
  };
}

function updateRewardCloud(dt) {
  if (state.difficulty !== "too-many" || !state.running || state.done) {
    state.rewardCloud = null;
    state.rewardTimer = nextRewardDelay();
    return;
  }

  if (!state.rewardCloud) {
    state.rewardTimer -= dt;
    if (state.rewardTimer <= 0) startRewardCloud();
    return;
  }

  const cloud = state.rewardCloud;
  cloud.timer += dt;
  const progress = clamp(cloud.timer / cloud.duration, 0, 1);
  cloud.x = cloud.startX + (cloud.endX - cloud.startX) * progress;
  if (!cloud.dropped && cloud.timer >= STORM_CLOUD_DROP_TIME) {
    dropPowerupNear(cloud.type, cloud.x, TRACK_TOP + 34 + Math.random() * (TRACK_BOTTOM - TRACK_TOP - 68), cloud.y + 54);
    cloud.dropped = true;
  }
  if (progress >= 1) {
    state.rewardCloud = null;
    state.rewardTimer = nextRewardDelay();
  }
}

function dropPowerupNear(type, x, y, dropStartY) {
  sfx("reward_cloud_drop", x);
  state.powerups.push(makePowerup(type, clamp(x, 80, FINISH - 160), y, {
    dropDuration: REWARD_POWERUP_DROP_DURATION,
    dropStartY
  }));
}

function updatePowerupDrops(dt) {
  for (const powerup of state.powerups) {
    if (!isPowerupDropping(powerup)) continue;
    powerup.dropTimer += dt;
    if (powerup.dropTimer >= powerup.dropDuration) {
      powerup.dropTimer = 0;
      powerup.dropDuration = 0;
    }
  }
}

function isPowerupDropping(powerup) {
  return powerup.dropDuration > 0;
}

function dropMonsterNear(x, y, dropStartY = null) {
  if (state.difficulty === "none") return null;
  const monster = spawnMonster(x, y, { active: true, facing: -1 });
  if (dropStartY === null) {
    monster.state = "fall";
    monster.timer = 0.35;
  } else {
    monster.state = "drop";
    monster.dropTimer = 0;
    monster.dropDuration = STORM_MONSTER_DROP_DURATION;
    monster.dropStartY = dropStartY;
  }
  monster.knockedBacks = 0;
  state.monsters.push(monster);
  return monster;
}

function updateMonsters(dt) {
  for (const monster of state.monsters) {
    const previousX = monster.x;
    const previousY = monster.y;
    monster.frameTime += dt * (monster.state === "walk" ? 8 : 3);
    monster.frame = Math.floor(monster.frameTime) % 3;
    monster.knockbackX *= Math.pow(0.04, dt);
    if (Math.abs(monster.knockbackX) < 6) monster.knockbackX = 0;
    monster.x = clamp(monster.x + monster.knockbackX * dt, MONSTER_COURSE_START_X, FINISH - 120);
    resolveMonsterObstacleCollisions(monster, previousX, previousY);

    if (!monster.active && isMonsterVisible(monster)) {
      monster.active = true;
      monster.state = "walk";
    }

    if (monster.state === "drop") {
      monster.dropTimer += dt;
      if (monster.dropTimer >= monster.dropDuration) {
        monster.state = "walk";
        monster.timer = 0;
        monster.dropTimer = 0;
      }
      continue;
    }

    if (monster.state === "sleeping") continue;

    if (monster.state === "fall") {
      monster.timer -= dt;
      if (monster.timer <= 0) {
        if (monster.knockedBacks >= MONSTER_SLEEP_KNOCKBACKS) {
          monster.state = "ground";
          monster.timer = 1;
        } else {
          monster.state = monster.active ? "walk" : "idle";
        }
      }
      continue;
    }

    if (monster.state === "ground") {
      monster.timer -= dt;
      if (monster.timer <= 0) monster.state = "sleeping";
      continue;
    }

    if (monster.state === "grab" || monster.state === "lift" || monster.state === "throw") {
      updateMonsterGrabSequence(monster, dt);
      continue;
    }

    const target = getMonsterTarget(monster);
    monster.target = target;
    if (!target) {
      monster.state = monster.active ? "walk" : "idle";
      continue;
    }

    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    monster.facing = dx < 0 ? -1 : 1;
    monster.state = "walk";
    monster.x = clamp(monster.x + Math.sign(dx) * Math.min(Math.abs(dx), MONSTER_SPEED * dt), MONSTER_COURSE_START_X, FINISH - 120);
    monster.y = clamp(monster.y + Math.sign(dy) * Math.min(Math.abs(dy), MONSTER_LANE_SPEED * dt), TRACK_TOP, TRACK_BOTTOM);
    resolveMonsterObstacleCollisions(monster, previousX, previousY);

    if (Math.abs(dx) < MONSTER_GRAB_RANGE_X && Math.abs(dy) < MONSTER_GRAB_RANGE_Y && target.z < 80 && (!isMounted(target) || isHorsingAroundMode())) {
      monster.state = "grab";
      monster.timer = 0.24;
      monster.frameTime = 0;
      racerVoice(target, "grabbed", { chance: 0.8, priority: 1 });
      target.grabbedBy = monster;
      target.fallBackTimer = 1.2;
      target.fallBackFacing = -monster.facing;
      target.knockbackX = 0;
      target.vy = 0;
      setGrabbedRacerPosition(monster, target);
    }
  }
}

function updateMonsterGrabSequence(monster, dt) {
  const target = monster.target && !monster.target.finished ? monster.target : null;
  monster.timer -= dt;
  if (target && target.grabbedBy === monster) {
    target.fallBackTimer = Math.max(target.fallBackTimer, 0.18);
    target.fallBackFacing = -monster.facing;
    setGrabbedRacerPosition(monster, target);
  }
  if (monster.timer > 0) return;

  if (monster.state === "grab") {
    monster.state = "lift";
    monster.timer = 0.5;
  } else if (monster.state === "lift") {
    monster.state = "throw";
    monster.timer = 0.28;
  } else if (monster.state === "throw") {
    if (target && target.grabbedBy === monster) {
      target.grabbedBy = null;
      target.x = clamp(monster.x + 56 * monster.facing, 40, FINISH);
      target.z = 78;
      target.vy = 170;
      const throwDirection = monster.x > FINISH - MONSTER_FINISH_BACK_THROW_DISTANCE ? -1 : monster.facing;
      target.fallBackTimer = 0.85;
      target.fallBackFacing = -throwDirection;
      target.hitTimer = 0.35;
      target.knockbackX = throwDirection * MONSTER_THROW_FORCE;
      target.jumpStarted = false;
    }
    monster.target = null;
    monster.state = "walk";
    monster.timer = 0;
  }
}

function setGrabbedRacerPosition(monster, racer) {
  const liftProgress = monster.state === "lift" ? 1 - monster.timer / 0.5 : monster.state === "throw" ? 1 : 0.35;
  racer.x = monster.x + 56 * monster.facing;
  racer.y = clamp(monster.y - 8, TRACK_TOP, TRACK_BOTTOM);
  racer.z = 44 + liftProgress * 70;
  racer.speed = 0;
  racer.moving = false;
}

function isMonsterVisible(monster) {
  return isWorldXVisibleInAnyView(monster.x);
}

function isRacerVisible(racer) {
  return isWorldXVisibleInAnyView(racer.x);
}

function isWorldXVisibleInAnyView(worldX) {
  return getActiveWorldViewRanges().some(range => worldX > range.left && worldX < range.right);
}

function getActiveWorldViewRanges() {
  if (state.cameraMode === "lego" && (state.legoSplitActive || state.legoSplitRendering) && state.legoPaneCameras.length > 0) {
    const groups = getActiveLegoPaneGroups();
    const panes = getLegoPaneLayout(groups);
    const ranges = panes.map((pane, index) => {
      const camera = state.legoPaneCameras[index];
      if (!Number.isFinite(camera)) return null;
      return { left: camera, right: camera + pane.width };
    }).filter(Boolean);
    if (ranges.length > 0) return ranges;
  }
  return [{ left: state.camera, right: state.camera + getWorldViewportWidth() }];
}

function getMonsterTarget(monster) {
  const candidates = state.racers.filter(racer => !racer.finished && !racer.grabbedBy);
  if (candidates.length === 0 || !monster.active) return null;
  return candidates.reduce((best, racer) => {
    const score = Math.abs(racer.x - monster.x) + Math.abs(racer.y - monster.y) * 1.6;
    return score < best.score ? { racer, score } : best;
  }, { racer: null, score: Infinity }).racer;
}

function racerDepthScale(racer) {
  return 0.39 + ((racer.y - TRACK_TOP) / (TRACK_BOTTOM - TRACK_TOP)) * 0.12;
}

function snowballDrawY(racer) {
  return racer.y + 54 - SNOWBALL_HAND_DRAW_Y_OFFSET * racerDepthScale(racer);
}

function applyPushHit(attacker, target, direction) {
  racerVoice(target, "hit", { chance: 0.75, priority: 1 });
  racerVoice(attacker, "taunt", { chance: 0.25 });
  target.grabbedBy = null;
  target.fallBackTimer = 0.55;
  target.fallBackFacing = attacker.x < target.x ? -1 : 1;
  target.hitTimer = 0.25;
  target.knockbackX = direction * PUSH_FORCE;
  target.vy = Math.max(target.vy, 160);
  target.jumpStarted = false;
}

function applyMonsterKnockback(monster, direction) {
  if (monster.state === "sleeping" || monster.state === "ground") return;
  if (monster.target?.grabbedBy === monster) monster.target.grabbedBy = null;
  monster.target = null;
  monster.knockedBacks += 1;
  monster.state = "fall";
  monster.timer = 0.55;
  monster.knockbackX = direction * PUSH_FORCE;
  monster.facing = direction < 0 ? -1 : 1;
}

function stunMonsterWithEmp(monster) {
  if (monster.state === "sleeping" || monster.state === "ground") return;
  if (monster.target?.grabbedBy === monster) {
    monster.target.grabbedBy = null;
    monster.target.vy = Math.max(monster.target.vy, 100);
  }
  monster.target = null;
  monster.state = "fall";
  monster.timer = 2;
  monster.knockbackX = 0;
}

function bumpMonstersWithSpecialMounts() {
  for (const racer of state.racers) {
    if (racer.finished || racer.grabbedBy || !isMounted(racer)) continue;
    if (!isHorsingAroundMode() && racer.horseType !== "pegasus" && racer.horseType !== "unicorn") continue;
    if (racer.mountBumpCooldown > 0) continue;
    for (const monster of state.monsters) {
      if (monster.state === "sleeping" || monster.state === "ground") continue;
      const dx = monster.x - racer.x;
      const dy = (monster.y + 54) - (racer.y + 54);
      if (Math.abs(dx) >= 74 || Math.abs(dy) >= 54 || racer.z > 110) continue;
      if (isHorsingAroundMode() && !isRacerRunningAtMonster(racer, dx)) continue;
      applyMonsterKnockback(monster, dx >= 0 ? 1 : -1);
      racer.mountBumpCooldown = 0.45;
      break;
    }
  }
}

function isRacerRunningAtMonster(racer, dx) {
  if (Math.abs(racer.speed) < HORSE_RUN_SPEED * 0.28) return false;
  return dx >= 0 ? racer.facing > 0 : racer.facing < 0;
}

function pushRacers(dt) {
  const racers = state.racers.filter(r => !r.finished && !isMounted(r) && !r.grabbedBy);
  for (let i = 0; i < racers.length; i += 1) {
    for (let j = i + 1; j < racers.length; j += 1) {
      const a = racers[i];
      const b = racers[j];
      const dx = b.x - a.x;
      const dy = (b.y + 54) - (a.y + 54);
      const minX = 48;
      const minY = 26;
      if (Math.abs(dx) >= minX || Math.abs(dy) >= minY) continue;
      const overlapX = minX - Math.abs(dx);
      const overlapY = minY - Math.abs(dy);
      const motion = Math.min(1.8, (Math.abs(a.speed) + Math.abs(b.speed) + Math.abs(a.y - b.y) / Math.max(dt, 0.016)) / 520);
      if (overlapX < overlapY) {
        const push = (overlapX / 2) * (0.75 + motion);
        const dir = dx >= 0 ? 1 : -1;
        a.x -= push * dir;
        b.x += push * dir;
      } else {
        const push = (overlapY / 2) * (0.75 + motion);
        const dir = dy >= 0 ? 1 : -1;
        a.y -= push * dir;
        b.y += push * dir;
      }
      a.x = clamp(a.x, 40, FINISH);
      b.x = clamp(b.x, 40, FINISH);
      a.y = clamp(a.y, TRACK_TOP, TRACK_BOTTOM);
      b.y = clamp(b.y, TRACK_TOP, TRACK_BOTTOM);
    }
  }
}

function updateCamera(dt = 0) {
  const humanRacers = state.racers.filter(r => !r.ai);
  if (humanRacers.length === 0) return;
  const humanLead = Math.max(...humanRacers.map(r => r.x));
  const humanTrail = Math.min(...humanRacers.map(r => r.x));
  const humanSpan = humanLead - humanTrail;
  const desiredZoom = state.cameraMode === "lego" ? 1 : humanRacers.length > 1
    ? clamp(W / Math.max(W, humanSpan + RACER_VISIBLE_LEFT_MARGIN + RACER_VISIBLE_RIGHT_MARGIN), CAMERA_MIN_ZOOM, 1)
    : 1;
  if (dt > 0 && desiredZoom > state.cameraZoom) {
    state.cameraZoom += (desiredZoom - state.cameraZoom) * (1 - Math.exp(-CAMERA_ZOOM_IN_DAMPING * dt));
  } else if (dt > 0 && desiredZoom < state.cameraZoom) {
    state.cameraZoom = desiredZoom;
  } else {
    state.cameraZoom = desiredZoom;
  }
  const viewWidth = getWorldViewportWidth();
  const targetLeft = humanTrail - RACER_VISIBLE_LEFT_MARGIN;
  const targetRight = humanLead + RACER_VISIBLE_RIGHT_MARGIN;
  const desiredCamera = (targetLeft + targetRight - viewWidth) / 2;
  const maxCamera = Math.max(0, FINISH - viewWidth + 260);
  if (state.legoSharedLazy && state.cameraMode === "lego" && !state.legoSplitActive && !state.legoSplitRendering && humanRacers.length > 1) {
    updateLazySharedLegoCamera(humanRacers, desiredCamera, maxCamera, viewWidth, dt);
  } else {
    state.legoSharedLazy = false;
    state.camera = clamp(desiredCamera, 0, maxCamera);
  }
}

function updateLazySharedLegoCamera(humanRacers, desiredCamera, maxCamera, viewWidth, dt) {
  const groupCenter = (Math.min(...humanRacers.map(racer => racer.x)) + Math.max(...humanRacers.map(racer => racer.x))) / 2;
  const targetScreenX = viewWidth * 0.5;
  const screenX = groupCenter - state.camera;
  const offsetFromTarget = screenX - targetScreenX;
  const centerVelocity = getLegoGroupCenterVelocity(humanRacers);
  const movingAwayFromTarget = Math.sign(centerVelocity) === Math.sign(offsetFromTarget) && Math.abs(centerVelocity) > 1;
  if (movingAwayFromTarget) {
    const maxStep = Math.abs(centerVelocity) * LEGO_CAMERA_CATCHUP_RATE * dt;
    state.camera = moveToward(state.camera, clamp(desiredCamera, 0, maxCamera), maxStep);
  } else {
    state.camera = clamp(state.camera, 0, maxCamera);
  }
  if (Math.abs(state.camera - desiredCamera) < 2 && Math.abs(offsetFromTarget) < 8) {
    state.legoSharedLazy = false;
  }
}

function getWorldViewportWidth() {
  const rect = canvas.getBoundingClientRect();
  state.viewportScaleX = rect.width > 0 ? W / rect.width : 1;
  return (state.renderViewportWidth || W) / state.cameraZoom;
}

function getWorldViewportTop() {
  return H - (H / state.cameraZoom);
}

function applyWorldZoomTransform() {
  ctx.translate(0, H);
  ctx.scale(state.cameraZoom, state.cameraZoom);
  ctx.translate(0, -H);
}

function getExpectedViewportWidth() {
  return EXPECTED_VIEW_WIDTH;
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
  const pads = connectedGamepads(gamepads);
  const config = getModeConfig();
  const keyboard = keyboardInputForPlayer(index, config.humans);
  const pad = pads[index] || null;
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

function keyboardInputForPlayer(index, humanCount) {
  if (humanCount <= 2) {
    if (index === 0) return wasdInput();
    if (index === 1) return arrowsInput();
  } else if (humanCount === 3) {
    if (index === 1) return wasdInput();
    if (index === 2) return arrowsInput();
  } else {
    if (index === 2) return wasdInput();
    if (index === 3) return arrowsInput();
  }
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

function connectedGamepads(gamepads) {
  return Array.from(gamepads).filter(Boolean).sort((a, b) => a.index - b.index);
}

function updateControllerPointers(dt) {
  const pads = connectedGamepads(navigator.getGamepads ? navigator.getGamepads() : []);
  const frameRect = gameFrame.getBoundingClientRect();
  controllerPointerLayer.classList.toggle("hidden", pads.length === 0 || (state.running && !state.paused));
  for (let index = 0; index < pads.length; index += 1) {
    const pointer = getControllerPointer(index, frameRect);
    const pad = pads[index];
    const axisX = Math.abs(pad.axes[0]) > CONTROLLER_POINTER_DEADZONE ? pad.axes[0] : 0;
    const axisY = Math.abs(pad.axes[1]) > CONTROLLER_POINTER_DEADZONE ? pad.axes[1] : 0;
    const dpadX = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
    const dpadY = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
    const moveX = Math.abs(axisX) > 0 ? axisX : dpadX;
    const moveY = Math.abs(axisY) > 0 ? axisY : dpadY;
    pointer.x = clamp(pointer.x + moveX * CONTROLLER_POINTER_SPEED * dt, 0, Math.max(0, frameRect.width - CONTROLLER_POINTER_SIZE));
    pointer.y = clamp(pointer.y + moveY * CONTROLLER_POINTER_SPEED * dt, 0, Math.max(0, frameRect.height - CONTROLLER_POINTER_SIZE));
    pointer.element.style.transform = `translate(${pointer.x}px, ${pointer.y}px) rotate(-18deg)`;
    pointer.element.style.setProperty("--pointer-color", getControllerPointerColor(index));
    pointer.element.classList.remove("hidden");

    const clickPressed = Boolean(pad.buttons[0]?.pressed);
    if (clickPressed && !pointer.clickPressed) handleControllerPointerClick(pointer, index, frameRect);
    pointer.clickPressed = clickPressed;
  }
  for (let index = pads.length; index < controllerPointers.length; index += 1) {
    controllerPointers[index].element.classList.add("hidden");
    controllerPointers[index].clickPressed = false;
  }
}

function getControllerPointer(index, frameRect) {
  if (controllerPointers[index]) return controllerPointers[index];
  const element = document.createElement("div");
  element.className = "controller-pointer";
  controllerPointerLayer.appendChild(element);
  const pointer = {
    x: clamp(frameRect.width * (0.44 + index * 0.06), 0, Math.max(0, frameRect.width - CONTROLLER_POINTER_SIZE)),
    y: clamp(frameRect.height * 0.68, 0, Math.max(0, frameRect.height - CONTROLLER_POINTER_SIZE)),
    clickPressed: false,
    element
  };
  controllerPointers[index] = pointer;
  return pointer;
}

function getControllerPointerColor(index) {
  const character = getSelectedCharacter(characterSelects[index], CHARACTER_FALLBACKS[index] || CHARACTER_FALLBACKS[0]);
  return character.color;
}

function hideControllerPointers() {
  controllerPointerLayer.classList.add("hidden");
  for (const pointer of controllerPointers) {
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

function chooseMenuCharacterAt(clientX, clientY, controllerIndex) {
  const canvasPoint = clientToCanvasPoint(clientX, clientY);
  const item = getMenuCharacterHit(canvasPoint.x, canvasPoint.y);
  if (!item) return false;
  const select = characterSelects[controllerIndex];
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

  if (racer.aiWanderAhead) {
    const wander = Math.sin(performance.now() * 0.0017 + racer.playerIndex * 2.4);
    return {
      horizontal: 0.08 + Math.max(0, Math.sin(performance.now() * 0.0009 + racer.playerIndex)) * 0.12,
      vertical: wander > 0.25 ? 0.55 : wander < -0.25 ? -0.55 : 0,
      jump: false,
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
    const targetY = next.y > (TRACK_TOP + TRACK_BOTTOM) / 2 ? TRACK_TOP + 34 : TRACK_BOTTOM - 26;
    vertical = Math.sign(targetY - racer.y) * 0.65;
    jump = Math.abs(next.x - racer.x) < 128 && Math.abs(next.y - racer.y) < 64;
  } else if (vertical === 0) {
    const cruise = 498 + Math.sin(racer.x * 0.004) * 42;
    vertical = Math.sign(cruise - racer.y) * 0.35;
  }
  return { horizontal, vertical, jump, push: false };
}

function updateHud() {
  for (let index = 0; index < playerStatuses.length; index += 1) {
    const racer = state.racers[index];
    if (!racer) {
      playerStatuses[index].textContent = "";
      continue;
    }
    const driver = racer.ai ? `AI ${index + 1}` : `P${index + 1}`;
    playerStatuses[index].textContent = `${driver} ${Math.round((racer.x / FINISH) * 100)}% ${racerStatus(racer)}`;
  }
}

function racerStatus(racer) {
  if (racer.oilTimer > 0) return `Oil ${Math.ceil(racer.oilTimer)}s`;
  if (isMounted(racer) && racer.horseType !== "horse") {
    const duration = Number.isFinite(racer.horseTimer) ? ` ${Math.ceil(racer.horseTimer)}s` : "";
    return `${racer.horseType[0].toUpperCase()}${racer.horseType.slice(1)}${duration}`;
  }
  if (isMounted(racer)) {
    const duration = Number.isFinite(racer.horseTimer) ? ` ${Math.ceil(racer.horseTimer)}s` : "";
    return `Horse${duration}`;
  }
  if (racer.snowballs > 0) return `Snowballs ${racer.snowballs}`;
  if (racer.speedBoostTimer > 0 && racer.highJumpTimer > 0) return `Boost x${racer.speedBoostStacks.length} + Jump x${racer.highJumpStacks.length}`;
  if (racer.speedBoostTimer > 0) return `Boost x${racer.speedBoostStacks.length} ${Math.ceil(racer.speedBoostTimer)}s`;
  if (racer.highJumpTimer > 0) return `Jump x${racer.highJumpStacks.length} ${Math.ceil(racer.highJumpTimer)}s`;
  if (racer.fallBackTimer > 0) return "Falling";
  if (racer.pushTimer > 0) return "Pushing";
  if (racer.hitTimer > 0) return "Recovering";
  return "Racing";
}

function drawScene(dt) {
  ctx.clearRect(0, 0, W, H);
  const legoSplitRendering = updateLegoSplitState(dt);
  if (legoSplitRendering) {
    drawLegoSplitScene(dt);
  } else {
    drawSharedCameraScene();
  }
  if (!legoSplitRendering && state.legoSplitLineAlpha > 0) {
    drawLegoSplitLines(getLegoLinePositionsForOverlay(), state.legoSplitLineAlpha);
  }
  if (startPanel.classList.contains("hidden")) {
    drawRaceProgressTracker();
  }

  if (state.done && state.winner) {
    drawVictoryScene();
  }

  if (!state.running && startPanel.classList.contains("hidden") && !state.done) {
    drawCenterText("Press Start Race");
  }
}

function drawSharedCameraScene() {
  ctx.save();
  applyWorldZoomTransform();
  drawWorldScene();
  ctx.restore();
}

function drawWorldScene() {
  drawBackground();
  drawFinishLine();

  if (!state.running && !startPanel.classList.contains("hidden")) {
    drawMenuCharacters();
  } else {
    const drawables = [
      ...state.obstacles.map(obstacle => ({ type: "obstacle", y: obstacle.y, item: obstacle })),
      ...state.powerups.filter(powerup => !powerup.taken).map(powerup => ({ type: "powerup", y: powerup.y, item: powerup })),
      ...state.projectiles.map(projectile => ({ type: "projectile", y: projectile.y, item: projectile })),
      ...state.rainbowBeams.map(beam => ({ type: "rainbow", y: beam.y, item: beam })),
      ...(state.stormCloud ? [{ type: "storm", y: TRACK_TOP - 220, item: state.stormCloud }] : []),
      ...(state.rewardCloud ? [{ type: "rewardCloud", y: TRACK_TOP - 230, item: state.rewardCloud }] : []),
      ...state.monsters.map(monster => ({ type: "monster", y: monster.y + 56, item: monster })),
      ...state.racers.map(racer => ({ type: "racer", y: racer.y + 54, item: racer }))
    ].sort((a, b) => a.y - b.y);
    for (const drawable of drawables) {
      if (drawable.type === "obstacle") {
        drawObstacle(drawable.item);
      } else if (drawable.type === "powerup") {
        drawPowerup(drawable.item);
      } else if (drawable.type === "projectile") {
        drawSnowball(drawable.item);
      } else if (drawable.type === "rainbow") {
        drawRainbowBeam(drawable.item);
      } else if (drawable.type === "storm") {
        drawStormCloud(drawable.item);
      } else if (drawable.type === "rewardCloud") {
        drawRewardCloud(drawable.item);
      } else if (drawable.type === "monster") {
        drawMonster(drawable.item);
      } else {
        drawRacer(drawable.item);
      }
    }
  }
}

function updateLegoSplitState(dt = 0) {
  const active = getLegoSplitActive();
  const targetAlpha = active ? 1 : 0;
  if (active) state.legoSplitRendering = true;
  if (!active) state.legoSplitRendering = false;
  if (dt <= 0) {
    state.legoSplitLineAlpha = targetAlpha;
  } else {
    state.legoSplitLineAlpha += (targetAlpha - state.legoSplitLineAlpha) * (1 - Math.exp(-LEGO_SPLIT_LINE_FADE_SPEED * dt));
  }
  if (state.legoSplitLineAlpha < 0.01) state.legoSplitLineAlpha = 0;
  if (state.legoSplitLineAlpha > 0.99) state.legoSplitLineAlpha = 1;
  return state.legoSplitRendering;
}

function getLegoSplitActive() {
  if (state.cameraMode !== "lego" || !state.running || state.done) return false;
  const humans = getHumanRacers();
  if (humans.length <= 1) {
    state.legoSplitActive = false;
    return false;
  }
  const wasActive = state.legoSplitActive;
  const currentGroups = getCurrentLegoPaneGroups(humans);
  const mergedGroups = wasActive ? mergeAlignedLegoPaneGroups(currentGroups) : currentGroups;
  const groups = splitOverflowingLegoPaneGroups(mergedGroups);
  state.legoSplitActive = groups.length > 1;
  if (wasActive !== state.legoSplitActive) {
    GameAudio.play(state.legoSplitActive ? "lego_split_open" : "lego_split_merge");
  }
  if (!wasActive && state.legoSplitActive) {
    state.legoSplitLineCount = groups.length;
    seedLegoPaneCameras(groups);
  } else if (wasActive && state.legoSplitActive) {
    syncLegoPaneGroups(groups);
  }
  if (wasActive && !state.legoSplitActive) {
    rememberLegoSplitLines(currentGroups);
    seedSharedCameraFromLegoPanes(groups);
    state.legoSharedLazy = true;
  }
  return state.legoSplitActive;
}

function getLegoPaneRacers(humans) {
  return humans.slice().sort((a, b) => a.x - b.x || a.playerIndex - b.playerIndex);
}

function getLegoPaneGroups(humans, splitDistance) {
  const sorted = getLegoPaneRacers(humans);
  const groups = [];
  for (const racer of sorted) {
    const group = groups[groups.length - 1];
    if (!group || racer.x - group[group.length - 1].x > splitDistance) {
      groups.push([racer]);
    } else {
      group.push(racer);
    }
  }
  return groups;
}

function getCurrentLegoPaneGroups(humans) {
  const storedGroups = state.legoPaneGroupKeys.length > 0 ? getStoredLegoPaneGroups() : [];
  if (storedGroups.length > 0) return storedGroups.map(group => getLegoPaneRacers(group));
  return [getLegoPaneRacers(humans)];
}

function sortLegoGroupsByTrack(groups) {
  return groups
    .map(group => getLegoPaneRacers(group))
    .filter(group => group.length > 0)
    .sort((a, b) => a[0].x - b[0].x || a[0].playerIndex - b[0].playerIndex);
}

function splitOverflowingLegoPaneGroups(groups) {
  let nextGroups = sortLegoGroupsByTrack(groups);
  let guard = 0;
  while (guard < 12) {
    guard += 1;
    const panes = getLegoPaneLayout(nextGroups);
    const splitIndex = panes.findIndex(pane => !legoGroupFitsPane(pane.group, pane.width) && pane.group.length > 1);
    if (splitIndex === -1) break;
    const [leftGroup, rightGroup] = splitLegoGroupAtLargestGap(panes[splitIndex].group);
    nextGroups = nextGroups.slice(0, splitIndex).concat([leftGroup, rightGroup], nextGroups.slice(splitIndex + 1));
  }
  return nextGroups;
}

function splitLegoGroupAtLargestGap(group) {
  const sorted = getLegoPaneRacers(group);
  let splitAfter = Math.floor(sorted.length / 2) - 1;
  let largestGap = -Infinity;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const gap = sorted[index + 1].x - sorted[index].x;
    if (gap > largestGap) {
      largestGap = gap;
      splitAfter = index;
    }
  }
  return [sorted.slice(0, splitAfter + 1), sorted.slice(splitAfter + 1)];
}

function legoGroupFitsPane(group, paneWidth) {
  if (group.length <= 1) return true;
  const left = Math.min(...group.map(racer => racer.x));
  const right = Math.max(...group.map(racer => racer.x));
  return right - left <= getLegoPaneFitDistance(paneWidth) + 0.5;
}

function getLegoPaneFitDistance(paneWidth) {
  const margin = Math.min(LEGO_PANE_KEEP_VISIBLE_MARGIN, paneWidth * 0.28);
  return Math.max(0, paneWidth - margin * 2);
}

function legoGroupKey(group) {
  return group.map(racer => racer.playerIndex).join("-");
}

function getLegoPaneLayout(groups) {
  const total = groups.reduce((sum, group) => sum + group.length, 0) || 1;
  let x = 0;
  return groups.map((group, index) => {
    const width = index === groups.length - 1 ? W - x : W * (group.length / total);
    const pane = { group, x, width };
    x += width;
    return pane;
  });
}

function seedCameraForPane(pane) {
  const sharedWorldAtPaneLeft = state.camera + pane.x / Math.max(state.cameraZoom, 0.0001);
  const aligned = clamp(sharedWorldAtPaneLeft, 0, Math.max(0, FINISH - pane.width + 260));
  return Number.isFinite(aligned) ? aligned : cameraForGroup(pane.group, pane.width || getWorldViewportWidth());
}

function getLegoLinePositions(panes) {
  return panes.slice(0, -1).map(pane => pane.x + pane.width);
}

function rememberLegoSplitLines(groups) {
  state.legoSplitLinePositions = getLegoLinePositions(getLegoPaneLayout(groups.filter(group => group.length > 0)));
}

function getLegoLinePositionsForOverlay() {
  if (state.legoSplitLinePositions.length > 0) return state.legoSplitLinePositions;
  if (state.legoPaneGroupKeys.length > 0) {
    const groups = getStoredLegoPaneGroups();
    return getLegoLinePositions(getLegoPaneLayout(groups.filter(group => group.length > 0)));
  }
  const humans = getHumanRacers();
  const count = state.legoSplitLineCount || humans.length;
  const width = W / Math.max(1, count);
  return Array.from({ length: Math.max(0, count - 1) }, (_, index) => width * (index + 1));
}

function drawLegoSplitScene(dt = 0) {
  const groups = getActiveLegoPaneGroups();
  if (groups.length <= 1) return;
  const panes = getLegoPaneLayout(groups);
  rememberLegoSplitLines(groups);
  updateLegoPaneCameras(panes, dt);
  const previousCamera = state.camera;
  const previousZoom = state.cameraZoom;
  const previousViewportWidth = state.renderViewportWidth;
  for (let index = 0; index < panes.length; index += 1) {
    const pane = panes[index];
    ctx.save();
    ctx.beginPath();
    ctx.rect(pane.x, 0, pane.width, H);
    ctx.clip();
    ctx.translate(pane.x, 0);
    state.cameraZoom = 1;
    state.renderViewportWidth = pane.width;
    state.camera = state.legoPaneCameras[index] ?? cameraForGroup(pane.group, pane.width);
    drawWorldScene();
    drawLegoPaneLabel(pane.group[0], pane.width);
    ctx.restore();
  }
  state.camera = previousCamera;
  state.cameraZoom = previousZoom;
  state.renderViewportWidth = previousViewportWidth;
  drawLegoSplitLines(getLegoLinePositions(panes), state.legoSplitLineAlpha);
}

function cameraForRacer(racer, viewWidth) {
  const desired = racer.x - viewWidth * LEGO_CAMERA_TARGET_RATIO;
  const maxCamera = Math.max(0, FINISH - viewWidth + 260);
  return clamp(desired, 0, maxCamera);
}

function cameraForGroup(group, viewWidth) {
  if (group.length === 1) return cameraForRacer(group[0], viewWidth);
  const left = Math.min(...group.map(racer => racer.x));
  const right = Math.max(...group.map(racer => racer.x));
  const desired = (left + right - viewWidth) / 2;
  const maxCamera = Math.max(0, FINISH - viewWidth + 260);
  return clamp(desired, 0, maxCamera);
}

function seedLegoPaneCameras(groups) {
  const panes = getLegoPaneLayout(groups);
  state.legoPaneGroupKeys = groups.map(legoGroupKey);
  state.legoPaneCameras = panes.map(seedCameraForPane);
  state.legoSplitLineCount = groups.length;
  rememberLegoSplitLines(groups);
}

function mergeAlignedLegoPaneGroups(groups) {
  let nextGroups = groups.map(group => getLegoPaneRacers(group)).filter(group => group.length > 0);
  let nextCameras = state.legoPaneCameras.slice(0, nextGroups.length);
  let merged = false;
  let guard = 0;
  while (guard < 12) {
    guard += 1;
    const panes = getLegoPaneLayout(nextGroups);
    let mergeIndex = -1;
    let mergeCamera = 0;
    for (let index = 0; index < panes.length - 1; index += 1) {
      const mergedGroup = getLegoPaneRacers(panes[index].group.concat(panes[index + 1].group));
      const mergedWidth = panes[index].width + panes[index + 1].width;
      if (!legoGroupFitsPane(mergedGroup, mergedWidth)) continue;
      const boundaryKey = legoMergeBoundaryKey(panes[index].group, panes[index + 1].group);
      const camera = cameraForAlignedLegoMerge(panes, nextCameras, index, boundaryKey);
      if (Number.isFinite(camera)) {
        mergeIndex = index;
        mergeCamera = camera;
        break;
      }
    }
    if (mergeIndex === -1) break;
    nextGroups = nextGroups.slice(0, mergeIndex)
      .concat([getLegoPaneRacers(nextGroups[mergeIndex].concat(nextGroups[mergeIndex + 1]))], nextGroups.slice(mergeIndex + 2));
    nextCameras = nextCameras.slice(0, mergeIndex)
      .concat([mergeCamera], nextCameras.slice(mergeIndex + 2));
    merged = true;
  }
  if (merged) {
    state.legoPaneGroupKeys = nextGroups.map(legoGroupKey);
    state.legoPaneCameras = nextCameras;
    state.legoSplitLineCount = nextGroups.length;
    state.legoMergeBoundarySnapshots = {};
    rememberLegoSplitLines(nextGroups);
  }
  return nextGroups;
}

function legoMergeBoundaryKey(leftGroup, rightGroup) {
  return `${legoGroupKey(leftGroup)}|${legoGroupKey(rightGroup)}`;
}

function cameraForAlignedLegoMerge(panes, paneCameras, index, boundaryKey = "") {
  const leftPane = panes[index];
  const rightPane = panes[index + 1];
  const mergedWidth = leftPane.width + rightPane.width;
  const maxCamera = Math.max(0, FINISH - mergedWidth + 260);
  const leftCamera = legoPaneMergeCamera(leftPane, paneCameras[index], leftPane.x);
  const rightCamera = legoPaneMergeCamera(rightPane, paneCameras[index + 1], leftPane.x);
  if (!Number.isFinite(leftCamera) || !Number.isFinite(rightCamera)) return NaN;
  const delta = rightCamera - leftCamera;
  const current = { leftCamera, rightCamera, delta };
  const previous = boundaryKey ? state.legoMergeBoundarySnapshots[boundaryKey] : null;
  if (boundaryKey) state.legoMergeBoundarySnapshots[boundaryKey] = current;
  const average = (leftCamera + rightCamera) / 2;
  if (Math.abs(delta) <= LEGO_SCREEN_ALIGNMENT_EPSILON) {
    return average < -LEGO_SCREEN_ALIGNMENT_EPSILON || average > maxCamera + LEGO_SCREEN_ALIGNMENT_EPSILON ? NaN : clamp(average, 0, maxCamera);
  }
  if (!previous || Math.sign(previous.delta) === Math.sign(delta) || Math.abs(delta) > LEGO_MERGE_CROSSING_EPSILON) return NaN;
  const t = previous.delta / (previous.delta - delta);
  const crossedCamera = previous.leftCamera + (leftCamera - previous.leftCamera) * t;
  return crossedCamera < -LEGO_SCREEN_ALIGNMENT_EPSILON || crossedCamera > maxCamera + LEGO_SCREEN_ALIGNMENT_EPSILON ? NaN : clamp(crossedCamera, 0, maxCamera);
}

function legoPaneMergeCamera(pane, paneCamera, mergedPaneX) {
  if (!Number.isFinite(paneCamera) || pane.group.length === 0) return NaN;
  const candidates = pane.group.map(racer => {
    const screenXInPane = pane.x + racer.x - paneCamera;
    return racer.x + mergedPaneX - screenXInPane;
  });
  const average = candidates.reduce((sum, camera) => sum + camera, 0) / candidates.length;
  return candidates.every(camera => Math.abs(camera - average) <= LEGO_SCREEN_ALIGNMENT_EPSILON) ? average : NaN;
}

function syncLegoPaneGroups(groups) {
  const keys = groups.map(legoGroupKey);
  if (keys.join("|") === state.legoPaneGroupKeys.join("|")) return;
  const previousKeys = state.legoPaneGroupKeys;
  const previousCameras = state.legoPaneCameras;
  const previousPanes = getLegoPaneLayout(getStoredLegoPaneGroups());
  const panes = getLegoPaneLayout(groups);
  state.legoPaneGroupKeys = keys;
  state.legoPaneCameras = groups.map((group, index) => {
    const exactIndex = previousKeys.indexOf(keys[index]);
    if (exactIndex !== -1 && Number.isFinite(previousCameras[exactIndex])) {
      return previousCameras[exactIndex] + panes[index].x - previousPanes[exactIndex].x;
    }
    const overlappingIndex = previousKeys.findIndex(key => key.split("-").some(id => keys[index].split("-").includes(id)));
    if (overlappingIndex !== -1 && Number.isFinite(previousCameras[overlappingIndex])) {
      return previousCameras[overlappingIndex] + panes[index].x - previousPanes[overlappingIndex].x;
    }
    return cameraForGroup(group, panes[index].width);
  });
  state.legoSplitLineCount = groups.length;
  rememberLegoSplitLines(groups);
}

function getActiveLegoPaneGroups() {
  if (state.legoPaneGroupKeys.length > 0) return getStoredLegoPaneGroups();
  const humans = getHumanRacers();
  return splitOverflowingLegoPaneGroups([getLegoPaneRacers(humans)]);
}

function getStoredLegoPaneGroups() {
  return state.legoPaneGroupKeys.map(key => (
    key.split("-")
      .map(id => state.racers.find(racer => String(racer.playerIndex) === id))
      .filter(Boolean)
  )).filter(group => group.length > 0);
}

function seedSharedCameraFromLegoPanes(groups) {
  if (state.legoPaneCameras.length === 0) return;
  state.camera = sharedCameraFromLegoPanes(groups);
  state.cameraZoom = 1;
  state.legoPaneCameras = [];
  state.legoPaneGroupKeys = [];
}

function sharedCameraFromLegoPanes(groupsOrHumans) {
  if (state.legoPaneCameras.length === 0) return state.camera;
  const groups = Array.isArray(groupsOrHumans[0]) ? groupsOrHumans : getLegoPaneGroups(groupsOrHumans, Infinity);
  const panes = getLegoPaneLayout(groups);
  const candidates = panes.flatMap((pane, index) => {
    const paneCamera = state.legoPaneCameras[index];
    if (!Number.isFinite(paneCamera)) return [state.camera];
    return pane.group.map(racer => {
      const screenXInPane = racer.x - paneCamera;
      const screenXInShared = pane.x + screenXInPane;
      return racer.x - screenXInShared;
    });
  });
  const average = candidates.reduce((sum, camera) => sum + camera, 0) / candidates.length;
  const maxCamera = Math.max(0, FINISH - W + 260);
  return clamp(average, 0, maxCamera);
}

function updateLegoPaneCameras(panes, dt = 0) {
  for (let index = 0; index < panes.length; index += 1) {
    const pane = panes[index];
    const maxCamera = Math.max(0, FINISH - pane.width + 260);
    const targetScreenX = pane.width * (pane.group.length === 1 ? LEGO_CAMERA_TARGET_RATIO : 0.5);
    if (!Number.isFinite(state.legoPaneCameras[index])) {
      state.legoPaneCameras[index] = cameraForGroup(pane.group, pane.width);
      continue;
    }
    let camera = clamp(state.legoPaneCameras[index], 0, maxCamera);
    const groupCenter = (Math.min(...pane.group.map(racer => racer.x)) + Math.max(...pane.group.map(racer => racer.x))) / 2;
    const screenX = groupCenter - camera;
    const desired = cameraForGroup(pane.group, pane.width);
    const offsetFromTarget = screenX - targetScreenX;
    const centerVelocity = getLegoGroupCenterVelocity(pane.group);
    const movingAwayFromTarget = Math.sign(centerVelocity) === Math.sign(offsetFromTarget) && Math.abs(centerVelocity) > 1;
    let nextCamera = camera;
    if (movingAwayFromTarget) {
      const maxStep = Math.abs(centerVelocity) * LEGO_CAMERA_CATCHUP_RATE * dt;
      nextCamera = clamp(moveToward(camera, desired, maxStep), 0, maxCamera);
    }
    state.legoPaneCameras[index] = cameraKeepingLegoGroupVisible(pane.group, pane.width, nextCamera, maxCamera);
  }
  state.legoPaneCameras.length = panes.length;
}

function getLegoGroupCenterVelocity(group) {
  if (group.length === 0) return 0;
  const sorted = getLegoPaneRacers(group);
  const left = sorted[0];
  const right = sorted[sorted.length - 1];
  const leftVelocity = Number.isFinite(left.cameraVelocityX) ? left.cameraVelocityX : left.speed || 0;
  const rightVelocity = Number.isFinite(right.cameraVelocityX) ? right.cameraVelocityX : right.speed || 0;
  return (leftVelocity + rightVelocity) / 2;
}

function cameraKeepingLegoGroupVisible(group, paneWidth, camera, maxCamera) {
  if (group.length === 0) return clamp(camera, 0, maxCamera);
  const margin = Math.min(LEGO_PANE_KEEP_VISIBLE_MARGIN, paneWidth * 0.28);
  const left = Math.min(...group.map(racer => racer.x));
  const right = Math.max(...group.map(racer => racer.x));
  const minimumCamera = right - (paneWidth - margin);
  const maximumCamera = left - margin;
  if (minimumCamera > maximumCamera) return clamp(cameraForGroup(group, paneWidth), 0, maxCamera);
  const lowerBound = Math.max(0, minimumCamera);
  const upperBound = Math.min(maxCamera, maximumCamera);
  if (lowerBound > upperBound) return clamp(cameraForGroup(group, paneWidth), 0, maxCamera);
  return clamp(camera, lowerBound, upperBound);
}

function moveToward(value, target, maxStep) {
  if (maxStep <= 0) return value;
  if (Math.abs(target - value) <= maxStep) return target;
  return value + Math.sign(target - value) * maxStep;
}

function drawLegoPaneLabel(racer, paneWidth) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.strokeStyle = "rgba(23,33,38,0.22)";
  ctx.lineWidth = 2;
  roundRect(12, 78, Math.min(150, paneWidth - 24), 34, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = racer.color;
  ctx.font = "800 15px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(racer.ai ? `AI ${racer.playerIndex + 1}` : `P${racer.playerIndex + 1}: ${racer.name}`, 24, 100);
  ctx.restore();
}

function drawLegoSplitLines(positions, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = LEGO_SPLIT_LINE_WIDTH;
  ctx.shadowColor = "rgba(23,33,38,0.38)";
  ctx.shadowBlur = 8;
  for (const x of positions) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRaceProgressTracker() {
  const racers = state.racers.filter(Boolean).slice().sort((a, b) => a.playerIndex - b.playerIndex);
  if (racers.length === 0) return;

  const width = RACE_TRACKER_WIDTH;
  const height = 34;
  const x = W - RACE_TRACKER_RIGHT - width;
  const y = RACE_TRACKER_TOP;
  const trackX = x + 16;
  const trackY = y + height / 2;
  const trackWidth = width - 32;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.strokeStyle = "rgba(23,33,38,0.2)";
  ctx.lineWidth = 2;
  roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(36,49,58,0.22)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(trackX, trackY);
  ctx.lineTo(trackX + trackWidth, trackY);
  ctx.stroke();

  for (let index = 0; index < racers.length; index += 1) {
    const racer = racers[index];
    const progress = clamp(racer.x / FINISH, 0, 1);
    const markerX = trackX + progress * trackWidth;
    const markerY = trackY + (index - (racers.length - 1) / 2) * 2.5;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = racer.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawMenuCharacters() {
  for (const item of menuCharacterPreview.filter(item => isAllDollsMode() || !characters[item.key].hidden)) {
    const character = characters[item.key];
    drawRacer({
      name: character.name,
      spriteKey: character.spriteKey,
      sheet: character.image(),
      x: item.x,
      y: item.y,
      z: 0,
      speed: 0,
      moving: false,
      frame: Math.floor(performance.now() / 420) % 3,
      jumpStarted: false,
      jumpFrame: 0,
      landingTimer: 0,
      pushTimer: 0,
      fallBackTimer: 0,
      fallBackFacing: 1,
      horseTimer: 0,
      color: character.color,
      facing: 1,
      showLabel: item.showLabel
    });
  }
}

function drawVictoryScene() {
  const winner = state.winner;
  const elapsed = performance.now() - state.victoryStartTime;
  ctx.save();
  const skyGradient = ctx.createLinearGradient(0, 0, 0, H);
  skyGradient.addColorStop(0, "rgba(18, 29, 62, 0.58)");
  skyGradient.addColorStop(0.55, "rgba(52, 94, 146, 0.34)");
  skyGradient.addColorStop(1, "rgba(255, 255, 255, 0.04)");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, W, H);
  drawVictoryFireworks(elapsed);
  drawVictoryWinner(winner, elapsed);
  drawVictoryBanner(winner, elapsed);
  ctx.restore();
}

function drawVictoryFireworks(elapsed) {
  const colors = ["#ff4f81", "#ffd84d", "#67e8f9", "#8cff73", "#c084fc", "#ff9f43"];
  for (let i = 0; i < VICTORY_FIREWORK_COUNT; i += 1) {
    const cycle = (elapsed * 0.00042 + i * 0.173) % 1;
    const burst = cycle < 0.12 ? cycle / 0.12 : cycle < 0.78 ? 1 : 1 - (cycle - 0.78) / 0.22;
    const radius = 24 + cycle * 132;
    const cx = W * (0.16 + ((i * 0.137) % 0.72));
    const cy = H * (0.13 + ((i * 0.211) % 0.32));
    ctx.save();
    ctx.globalAlpha = clamp(burst, 0, 1);
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors[i % colors.length];
    for (let ray = 0; ray < 14; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 14 + i * 0.4;
      const inner = radius * 0.34;
      const outer = radius;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawVictoryWinner(winner, elapsed) {
  const jump = Math.abs(Math.sin(elapsed * VICTORY_JUMP_SPEED));
  const scale = 0.56 + jump * 0.04;
  const drawW = FRAME * scale;
  const drawH = FRAME * scale;
  const x = W * 0.5;
  const groundY = H * 0.72;
  const y = groundY - VICTORY_JUMP_HEIGHT * jump;
  const frame = jump > 0.18 ? 1 : Math.floor(elapsed / 180) % 3;
  const row = jump > 0.18 ? 2 : 1;
  const drawX = x - SPRITE_ANCHOR_X * scale;
  const drawY = y + 54 - SPRITE_ANCHOR_Y * scale;

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(x, groundY + 42, 74 * scale * (1.1 - jump * 0.25), 16 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawFacingImage(winner.sheet, frame * FRAME, row * FRAME, FRAME, FRAME, drawX, drawY, drawW, drawH, 1, x);
}

function drawVictoryBanner(winner, elapsed) {
  const pulse = 1 + Math.sin(elapsed * 0.006) * 0.035;
  ctx.save();
  ctx.translate(W / 2, H * 0.18);
  ctx.scale(pulse, pulse);
  ctx.textAlign = "center";
  ctx.font = "900 54px system-ui";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "white";
  ctx.fillStyle = winner.color;
  ctx.strokeText(`${winner.name} Wins!`, 0, 0);
  ctx.fillText(`${winner.name} Wins!`, 0, 0);
  ctx.font = "800 22px system-ui";
  ctx.lineWidth = 5;
  ctx.fillStyle = "#ffe36e";
  ctx.strokeText("Champion of the track", 0, 38);
  ctx.fillText("Champion of the track", 0, 38);
  ctx.restore();
}

function drawBackground() {
  const bg = images[getCurrentBackground().imageKey];
  const viewWidth = getWorldViewportWidth();
  const viewTop = getWorldViewportTop();
  const scale = H / bg.height;
  const bgW = bg.width * scale;
  const startX = -((state.camera % bgW) + bgW) % bgW;
  ctx.fillStyle = "#7fc6e8";
  ctx.fillRect(0, viewTop, viewWidth, H - viewTop);
  for (let x = startX; x < viewWidth + bgW; x += bgW) {
    ctx.drawImage(bg, x, 0, bgW, H);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(0, TRACK_TOP - 8, viewWidth, TRACK_BOTTOM - TRACK_TOP + 86);
}

function drawFinishLine() {
  const x = FINISH - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -80 || x > viewWidth + 80) return;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillRect(x, TRACK_TOP - 12, 24, TRACK_BOTTOM - TRACK_TOP + 92);
  for (let y = TRACK_TOP - 12; y < TRACK_BOTTOM + 80; y += 24) {
    ctx.fillStyle = (Math.floor((y - TRACK_TOP) / 24) % 2) ? "#111" : "#fff";
    ctx.fillRect(x, y, 24, 24);
  }
  ctx.fillStyle = "#172126";
  ctx.font = "800 24px system-ui";
  ctx.fillText("FINISH", x - 34, TRACK_TOP - 24);
  ctx.restore();
}

function drawObstacle(obstacle) {
  const x = obstacle.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -100 || x > viewWidth + 100) return;
  ctx.save();
  ctx.translate(x, obstacle.y);
  drawAmandaBehindFence(obstacle);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(23,33,38,0.22)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#f8f7ef";
  ctx.strokeStyle = "#d4cbb6";
  ctx.lineWidth = 3;
  for (const postX of [-24, 0, 24]) {
    roundRect(postX - 5, -42, 10, 68, 4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cfc7b6";
  for (const railY of [-28, -8, 12]) {
    roundRect(-32, railY, 64, 10, 4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(-28, -26, 56, 3);
  ctx.fillRect(-28, -6, 56, 3);
  ctx.fillRect(-28, 14, 56, 3);
  ctx.restore();
}

function drawAmandaBehindFence(obstacle) {
  if (!obstacle.amandaHazard || obstacle.amandaReveal <= 0) return;
  const scale = 0.4;
  const pushPose = obstacle.amandaState === "pushing";
  const frameCol = pushPose ? 1 : 0;
  const frameRow = pushPose ? 3 : 0;
  const footY = 170 - obstacle.amandaReveal * 148;
  const drawW = FRAME * scale;
  const drawH = FRAME * scale;
  const drawX = -SPRITE_ANCHOR_X * scale;
  const drawY = footY - SPRITE_ANCHOR_Y * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(-92, -175, 184, 197);
  ctx.clip();
  ctx.shadowColor = "rgba(23,33,38,0.24)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  drawFacingImage(
    images.amanda,
    frameCol * FRAME,
    frameRow * FRAME,
    FRAME,
    FRAME,
    drawX,
    drawY,
    drawW,
    drawH,
    obstacle.amandaFacing,
    0
  );
  ctx.restore();
}

function drawPowerup(powerup) {
  const x = powerup.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -80 || x > viewWidth + 80) return;
  const t = performance.now() / 500 + powerup.spin;
  const drawY = powerupDrawY(powerup);
  const iconIndex = { jump: 0, boost: 1, emp: 2, oil: 3, snowball: 4 }[powerup.type];
  if (iconIndex !== undefined) {
    drawPowerupIcon(iconIndex, x, drawY - 34 + Math.sin(t) * 5, t);
    return;
  }
  if (powerup.type === "horse") {
    ctx.save();
    ctx.translate(x, drawY - 32 + Math.sin(t) * 5);
    ctx.globalAlpha = 0.96;
    ctx.shadowColor = "rgba(23,33,38,0.24)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    const scale = 0.24;
    const col = Math.floor(t * 1.4) % 3;
    const horseImage = images[powerup.horseType] || images.horse;
    ctx.drawImage(
      horseImage,
      col * FRAME,
      0,
      FRAME,
      FRAME,
      -SPRITE_ANCHOR_X * scale,
      -SPRITE_ANCHOR_Y * scale + 30,
      FRAME * scale,
      FRAME * scale
    );
    ctx.restore();
    return;
  }
}

function powerupDrawY(powerup) {
  if (!isPowerupDropping(powerup)) return powerup.y;
  const progress = clamp(powerup.dropTimer / powerup.dropDuration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return powerup.dropStartY + (powerup.y - powerup.dropStartY) * eased;
}

function drawPowerupIcon(index, x, y, t) {
  const rect = POWERUP_ICON_RECTS[index];
  if (!rect) return;
  const scale = POWERUP_ICON_TARGET_SIZE / Math.max(rect.w, rect.h);
  const drawW = rect.w * scale;
  const drawH = rect.h * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.8) * 0.08);
  ctx.globalAlpha = 0.96;
  ctx.shadowColor = "rgba(23,33,38,0.26)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;
  ctx.drawImage(
    images.powerupIcons,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  ctx.restore();
}

function drawSnowball(projectile) {
  const x = projectile.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -80 || x > viewWidth + 80) return;
  ctx.save();
  ctx.translate(x, projectile.drawY - projectile.z * 0.28);
  ctx.fillStyle = "#f8fdff";
  ctx.strokeStyle = "#9bd5ec";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(23,33,38,0.22)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(0, 0, SNOWBALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRainbowBeam(beam) {
  const x1 = beam.x1 - state.camera;
  const x2 = beam.x2 - state.camera;
  const alpha = clamp(beam.timer / beam.duration, 0, 1);
  const colors = ["#ff3b6f", "#ff9d2f", "#ffe85a", "#42e36f", "#36b8ff", "#9d64ff"];
  ctx.save();
  ctx.globalAlpha = 0.82 * alpha;
  ctx.lineCap = "round";
  for (let i = 0; i < colors.length; i += 1) {
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, beam.y - 15 + i * 6);
    ctx.lineTo(x2, beam.y - 15 + i * 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStormCloud(cloud) {
  drawCloud(cloud, {
    fill: "#29303b",
    shadow: "rgba(12, 18, 27, 0.38)",
    lightning: true,
    alpha: 0.9
  });
}

function drawRewardCloud(cloud) {
  drawCloud(cloud, {
    fill: "#f7fbff",
    shadow: "rgba(70, 104, 128, 0.24)",
    lightning: false,
    alpha: 0.94
  });
}

function drawCloud(cloud, options) {
  const x = cloud.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (x < -240 || x > viewWidth + 240) return;
  ctx.save();
  ctx.translate(x, cloud.y);
  ctx.globalAlpha = options.alpha;
  ctx.fillStyle = options.fill;
  ctx.shadowColor = options.shadow;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(-58, 16, 54, 30, -0.08, 0, Math.PI * 2);
  ctx.ellipse(-16, 0, 62, 38, 0.08, 0, Math.PI * 2);
  ctx.ellipse(42, 16, 58, 32, 0.1, 0, Math.PI * 2);
  ctx.ellipse(0, 26, 88, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  if (options.lightning) {
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255, 236, 126, 0.9)";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 42);
  ctx.lineTo(-28, 82);
  ctx.lineTo(0, 76);
  ctx.lineTo(-18, 122);
  ctx.stroke();
  }
  ctx.restore();
}

function drawMonster(monster) {
  const screenX = monster.x - state.camera;
  const viewWidth = getWorldViewportWidth();
  if (screenX < -280 || screenX > viewWidth + 280) return;
  const frame = monsterFrame(monster);
  const scale = racerDepthScale(monster) * MONSTER_HEIGHT_SCALE;
  const visualY = monsterDrawY(monster);
  const sx = frame.col * FRAME;
  const sy = frame.row * FRAME;
  const drawW = FRAME * scale;
  const drawH = FRAME * scale;
  const drawX = screenX - SPRITE_ANCHOR_X * scale;
  const drawY = visualY + 58 - SPRITE_ANCHOR_Y * scale;

  ctx.save();
  ctx.globalAlpha = monster.state === "drop" ? 0.14 : 0.32;
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, monster.y + 42, 62 * scale, 15 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const drawFacing = monster.state === "fall" ? -monster.facing : monster.facing;
  drawFacingImage(images.monster, sx, sy, FRAME, FRAME, drawX, drawY, drawW, drawH, drawFacing, screenX);
}

function monsterDrawY(monster) {
  if (monster.state !== "drop" || monster.dropDuration <= 0) return monster.y;
  const progress = clamp(monster.dropTimer / monster.dropDuration, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return monster.dropStartY + (monster.y - monster.dropStartY) * eased;
}

function monsterFrame(monster) {
  if (monster.state === "drop") return { row: 0, col: 0 };
  if (monster.state === "fall") return { row: 3, col: 0 };
  if (monster.state === "ground") return { row: 3, col: 1 };
  if (monster.state === "sleeping") return { row: 3, col: 2 };
  if (monster.state === "grab") return { row: 2, col: 0 };
  if (monster.state === "lift") return { row: 2, col: 1 };
  if (monster.state === "throw") return { row: 2, col: 2 };
  if (monster.state === "walk") return { row: 1, col: monster.frame };
  return { row: 0, col: monster.frame };
}

function drawRacer(racer) {
  const screenX = racer.x - state.camera;
  const jumping = racer.z > 0 || racer.jumpStarted || racer.landingTimer > 0;
  const mounted = isMounted(racer);
  const row = racer.grabbedBy || racer.fallBackTimer > 0 ? 3 : racer.pushTimer > 0 ? 3 : jumping ? 2 : racer.moving ? 1 : 0;
  const col = racer.grabbedBy ? 2 : racer.fallBackTimer > 0 ? 2 : racer.pushTimer > 0 ? 1 : jumping ? racer.jumpFrame : racer.frame;
  const drawFacing = racer.fallBackTimer > 0 ? racer.fallBackFacing : racer.facing;
  const horseRow = racer.pegasusGliding ? 1 : jumping ? 2 : racer.moving ? 1 : 0;
  const horseCol = racer.pegasusGliding ? racer.frame : jumping ? racer.jumpFrame : racer.frame;
  const scale = racerDepthScale(racer);
  const spriteScale = scale * (jumping && !mounted ? jumpSpriteScale[racer.spriteKey] || jumpSpriteScale.default : 1);
  const sx = col * FRAME;
  const sy = row * FRAME;
  const drawW = FRAME * spriteScale;
  const drawH = FRAME * spriteScale;
  const drawX = screenX - SPRITE_ANCHOR_X * spriteScale;
  const drawY = racer.y + 54 - SPRITE_ANCHOR_Y * spriteScale - racer.z;

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#142027";
  ctx.beginPath();
  ctx.ellipse(screenX, racer.y + 40, 48 * scale * 2, 13 * scale * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (racer.frozenTimer > 0) drawElectricEffect(screenX, drawY, drawW, drawH);

  if (mounted) {
    const flashing = racer.horseTimer < HORSE_FLASH_TIME && Math.floor(performance.now() / 110) % 2 === 0;
    const horseScale = scale * 1.08;
    const horseW = FRAME * horseScale;
    const horseH = FRAME * horseScale;
    const horseX = screenX - SPRITE_ANCHOR_X * horseScale;
    const horseY = racer.y + 58 - SPRITE_ANCHOR_Y * horseScale - racer.z;
    const riderScale = scale * 0.7;
    const riderW = FRAME * riderScale;
    const riderH = FRAME * riderScale;
    const riderOffset = getRiderMountOffset(racer, jumping);
    const riderX = screenX - SPRITE_ANCHOR_X * riderScale + (9 * drawFacing + riderOffset.x) * scale;
    const riderY = horseY - 60 * scale + riderOffset.y * scale;
    if (!flashing) {
      const horseImage = images[racer.horseType] || images.horse;
      drawFacingImage(horseImage, horseCol * FRAME, horseRow * FRAME, FRAME, FRAME, horseX, horseY, horseW, horseH, drawFacing, screenX);
    }
    drawFacingImage(racer.sheet, 0, 3 * FRAME, FRAME, FRAME, riderX, riderY, riderW, riderH, drawFacing, screenX);
  } else {
    drawFacingImage(racer.sheet, sx, sy, FRAME, FRAME, drawX, drawY, drawW, drawH, drawFacing, screenX);
  }

  ctx.save();
  const labelY = mounted ? drawY - 42 : drawY - 8;
  if (racer.showLabel !== false) {
    ctx.fillStyle = racer.color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.font = "800 18px system-ui";
    ctx.textAlign = "center";
    ctx.strokeText(racer.name, screenX, labelY);
    ctx.fillText(racer.name, screenX, labelY);
  }
  const activeLabels = [
    mounted ? (racer.horseType === "horse" ? "HORSE" : racer.horseType.toUpperCase()) : "",
    racer.speedBoostTimer > 0 ? `BOOST x${racer.speedBoostStacks.length}` : "",
    racer.highJumpTimer > 0 ? `HIGH JUMP x${racer.highJumpStacks.length}` : "",
    racer.snowballs > 0 ? `SNOWBALLS ${racer.snowballs}` : ""
  ].filter(Boolean);
  if (activeLabels.length > 0) {
    ctx.font = "800 13px system-ui";
    ctx.fillStyle = mounted ? "#9a6426" : racer.snowballs > 0 ? "#2782b8" : racer.speedBoostTimer > 0 ? "#2f80ff" : "#28aa72";
    const text = activeLabels.slice(0, 2).join(" + ");
    ctx.strokeText(text, screenX, labelY - 18);
    ctx.fillText(text, screenX, labelY - 18);
  }
  ctx.restore();
}

function drawFacingImage(image, sx, sy, sw, sh, dx, dy, dw, dh, facing, anchorX) {
  if (facing < 0) {
    ctx.save();
    ctx.translate(anchorX, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, sx, sy, sw, sh, dx - anchorX, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}

function getMountRiderYOffset(horseType, jumping) {
  if (horseType === "unicorn") {
    return UNICORN_OFFSET_Y + (jumping ? UNICORN_JUMPING_OFFSET_Y : 0);
  }
  if (horseType === "pegasus") {
    return PEGASUS_OFFSET_Y + (jumping ? PEGASUS_JUMPING_OFFSET_Y : 0);
  }
  return 0;
}

function getRiderMountOffset(racer, jumping) {
  return {
    x: racer.riderXOffset,
    y: racer.riderYOffset + getMountRiderYOffset(racer.horseType, jumping)
  };
}

function drawElectricEffect(x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = "#9fe9ff";
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  const now = performance.now() * 0.03;
  for (let i = 0; i < 5; i += 1) {
    const px = x - w * 0.35 + ((i * 29 + now * 7) % (w * 0.7));
    const py = y + 24 + ((i * 47 + now * 3) % Math.max(40, h - 40));
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 10, py + 10);
    ctx.lineTo(px - 2, py + 22);
    ctx.lineTo(px + 13, py + 34);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCenterText(text) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.strokeStyle = "rgba(23,33,38,0.2)";
  roundRect(W / 2 - 160, H / 2 - 34, 320, 68, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#172126";
  ctx.font = "800 28px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, W / 2, H / 2 + 10);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isInteractiveTouchTarget(target) {
  return Boolean(target.closest("button, select, label, .start-panel, .finish-panel, .touch-controls"));
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

window.addEventListener("keydown", event => {
  if (event.code === "Escape") {
    event.preventDefault();
    togglePause();
    return;
  }
  keys.add(event.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "ShiftLeft", "ShiftRight"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", event => keys.delete(event.code));
window.addEventListener("resize", resizeCanvasToFrame);
window.visualViewport?.addEventListener("resize", resizeCanvasToFrame);
gameFrame.addEventListener("pointerdown", event => {
  if (!isTouchDevice() || !state.running || state.paused || state.done) return;
  if (touchInput.movePointerId !== null || isInteractiveTouchTarget(event.target)) return;
  event.preventDefault();
  gameFrame.setPointerCapture?.(event.pointerId);
  touchInput.movePointerId = event.pointerId;
  touchInput.startX = event.clientX;
  touchInput.startY = event.clientY;
  updateTouchMove(event);
});
gameFrame.addEventListener("pointermove", event => {
  if (!isTouchDevice() || event.pointerId !== touchInput.movePointerId) return;
  event.preventDefault();
  updateTouchMove(event);
});
gameFrame.addEventListener("pointerup", event => {
  if (!isTouchDevice()) return;
  event.preventDefault();
  clearTouchMove(event.pointerId);
});
gameFrame.addEventListener("pointercancel", event => {
  if (!isTouchDevice()) return;
  event.preventDefault();
  clearTouchMove(event.pointerId);
});
bindTouchActionButton(touchJumpButton, "jump");
bindTouchActionButton(touchPushButton, "push");
touchPauseButton.addEventListener("pointerdown", event => {
  if (!isTouchDevice()) return;
  event.preventDefault();
  clearTouchInput();
  togglePause();
});
mobileQuery.addEventListener?.("change", () => {
  clearTouchInput();
  updateMobileModeAvailability();
  updateModeLabels();
});
window.addEventListener("gamepadconnected", () => {
  updateMobileModeAvailability();
  updateModeLabels();
  if (!state.running || state.paused) startMenuAnimationLoop();
});
window.addEventListener("gamepaddisconnected", () => {
  updateMobileModeAvailability();
  updateModeLabels();
  if (!state.running || state.paused) startMenuAnimationLoop();
});
gameMode.addEventListener("change", () => {
  updateMobileModeAvailability();
  state.mode = gameMode.value;
  updateModeLabels();
});
backgroundSelect.addEventListener("change", () => setBackground(backgroundSelect.value));
settingsButton.addEventListener("click", toggleSettingsPanel);
difficultySelect.addEventListener("change", () => setDifficulty(difficultySelect.value));
specialsSelect.addEventListener("change", () => setSpecials(specialsSelect.value));
startButton.addEventListener("click", () => startRace(gameMode.value));
fullscreenButton.addEventListener("click", toggleFullscreen);

// Menu chrome: the first click also unlocks audio, since browsers block
// playback until a trusted gesture.
for (const button of document.querySelectorAll("button")) {
  button.addEventListener("click", () => {
    GameAudio.unlock();
    if (button !== startButton) GameAudio.play("ui_click");
  });
}
for (const select of [...characterSelects, gameMode, difficultySelect, specialsSelect]) {
  select?.addEventListener("change", () => {
    GameAudio.unlock();
    GameAudio.play("ui_select_character");
  });
}
fullscreenButton.addEventListener("click", () => GameAudio.play("ui_fullscreen"));

restartButton.addEventListener("click", () => {
  clearNextRaceTimer();
  advanceBackground();
  startRace(state.mode);
});
resumeButton.addEventListener("click", togglePause);
menuButton.addEventListener("click", returnToMenu);

updateCharacterSelectOptions();
waitForAssets();
