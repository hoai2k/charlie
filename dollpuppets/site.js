import { createCamera } from "./src/core/camera.js";
import { createFaceStabilizer } from "./src/core/face-stabilizer.js";
import { createDemoPuppetState, createPuppetState } from "./src/core/puppet-state.js";
import { createWorkerTracker, TRACKING_MODES } from "./src/core/worker-tracker.js";
import { DOLL_CHARACTERS, renderDollsEffect } from "./effect/render.js";
import GAME_CONFIG from "./gameConfig.js";

const BACKGROUNDS = {
  none: {
    label: "Camera",
    src: null,
    thumbnail: "./assets/ui/scene_camera.webp"
  },
  farm: {
    label: "Farm",
    src: "./assets/backgrounds/farm.webp"
  },
  winter: {
    label: "Winter",
    src: "./assets/backgrounds/winter.webp"
  },
  castles: {
    label: "Castles",
    src: "./assets/backgrounds/castles.webp"
  },
  fairy: {
    label: "Fairy",
    src: "./assets/backgrounds/fairy.webp"
  },
  village: {
    label: "Village",
    src: "./assets/backgrounds/village.webp"
  }
};

// Card colours and art for the select screen. The eight American Girl dolls
// reuse the race portraits; the rest fall back to their reference head.
const CHARACTER_STYLES = {
  rumi: { color: "#7b3bb8", portrait: "./assets/portraits/rumi.webp" },
  juliette: { color: "#c58a28", portrait: "./assets/portraits/juliette.webp" },
  marisol: { color: "#f25ca5", portrait: "./assets/portraits/marisol.webp" },
  kaya: { color: "#9a6426", portrait: "./assets/portraits/kaya.webp" },
  lily: { color: "#d33b2f", portrait: "./assets/portraits/lily.webp" },
  whirlpool: { color: "#5a3a86", portrait: "./assets/portraits/whirlpool.webp" },
  claudia: { color: "#25897f", portrait: "./assets/portraits/claudia.webp" },
  amanda: { color: "#263d8f", portrait: "./assets/portraits/amanda.webp" },
  troll: { color: "#5f7a3a" },
  kpop: { color: "#d65fb4" }
};

// Optional art from image-requests.md. Each is used once the file exists;
// until then the CSS look stays in place.
const OPTIONAL_ART = {
  logo: "./assets/ui/logo.webp",
  titleBackground: "./assets/ui/title_background.webp"
};

function loadOptionalImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

const app = document.querySelector(".dolls-app");
const video = document.querySelector("#camera");
const canvas = document.querySelector("#doll-canvas");
const pauseButton = document.querySelector("#pause-game");
const openSelectButton = document.querySelector("#open-select");
const titleScreen = document.querySelector("#title-screen");
const backgroundList = document.querySelector("#background-list");
const characterList = document.querySelector("#character-list");
const debugTools = document.querySelector("#debug-tools");
const downloadDebugButton = document.querySelector("#download-debug");
const status = document.querySelector("#status");
const cameraRetryButton = document.querySelector("#camera-retry");
const gestureHints = document.querySelector("#gesture-hints");
let hintsDismissed = false;
try {
  hintsDismissed = localStorage.getItem("dollpuppets-hints-seen") === "true";
} catch {
  // Keep the hints usable when browser storage is unavailable.
}
document.querySelector("#dismiss-hints").addEventListener("click", () => {
  hintsDismissed = true;
  gestureHints.hidden = true;
  try {
    localStorage.setItem("dollpuppets-hints-seen", "true");
  } catch {
    // Dismiss for this visit even without persistent storage.
  }
});
const ctx = canvas.getContext("2d");
const urlParams = new URLSearchParams(window.location.search);
const debugEnabled = urlParams.has("debug");
const visibleDollCharacters = Object.fromEntries(
  Object.entries(DOLL_CHARACTERS).filter(([, character]) => debugEnabled || !character.debugOnly)
);
const requestedCharacter = urlParams.get("character");
const initialCharacterId = visibleDollCharacters[requestedCharacter] ? requestedCharacter : "rumi";
const initialBackgroundId = BACKGROUNDS[urlParams.get("background")] ? urlParams.get("background") : "farm";
const effect = renderDollsEffect({ character: initialCharacterId, gameConfig: GAME_CONFIG });
const BACKGROUND_FRICTION = 0.92;
const BACKGROUND_MIN_VELOCITY = 4;
const BACKGROUND_MAX_VELOCITY = 2200;
const trackingMode = GAME_CONFIG.enable_hand_tracking ? "face-hands" : "face";

let camera = null;
let tracker = null;
let usingCamera = false;
let trackingInFlight = false;
let lastTrackingAt = 0;
let lastStatusAt = 0;
let lastState = createDemoPuppetState(0);
let selectedBackground = "farm";
let selectedCharacter = initialCharacterId;
// "title" (pick a doll) -> "play"; the Dolls button returns to the title.
let screen = "title";
let backgroundOffset = 0;
let backgroundVelocity = 0;
let backgroundDrag = null;
let lastFrameAt = 0;
let paused = false;
let pausedAt = 0;
// Paused automatically because the tab/app was hidden (resume on return).
let pausedForHidden = false;
// The message shown while the camera can't be used, if any.
let cameraProblem = null;
let cameraStarting = null;
let restartingTracker = false;
let trackerRestarts = 0;
let consecutiveTrackingFailures = 0;
const stabilizer = createFaceStabilizer();
// A dead tracker is restarted automatically this many times before giving up
// and asking the player to tap "Try again".
const MAX_TRACKER_RESTARTS = 3;
const MAX_CONSECUTIVE_TRACKING_FAILURES = 5;

function setStatus(message) {
  status.textContent = message;
}

function showCameraProblem(message) {
  cameraProblem = message;
  setStatus(message);
  cameraRetryButton.hidden = false;
}

function clearCameraProblem() {
  cameraProblem = null;
  cameraRetryButton.hidden = true;
}

function cameraErrorMessage(error) {
  switch (error?.name) {
    case "InsecureContextError":
      return "The camera only works when this page is opened with https://.";
    case "NotAllowedError":
    case "SecurityError":
      return `The camera is blocked for this page. ${cameraUnblockHint()} Then tap Try again.`;
    case "NotFoundError":
      return "No camera was found. Connect one, then tap Try again.";
    case "NotReadableError":
    case "AbortError":
    case "OverconstrainedError":
      return "The camera is busy. Close other apps or tabs using it (video calls, other games), then tap Try again.";
    default:
      return `The camera couldn't start (${error?.name || "unknown error"}). Tap Try again.`;
  }
}

// Where each browser keeps the per-site camera switch.
function cameraUnblockHint() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return "Tap \"aA\" in the address bar, then Website Settings, and set Camera to Allow.";
  }
  if (/Firefox\//.test(ua)) {
    return "Click the crossed-out camera in the address bar and remove the block.";
  }
  if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) {
    return "Open Safari > Settings for This Website and set Camera to Allow.";
  }
  return "Click the camera or settings icon at the left of the address bar and choose Allow.";
}

// Ask the browser up front: a blocked camera fails instantly, and a prompt
// that is about to appear deserves a "please tap Allow" message.
async function cameraPermissionState() {
  try {
    const result = await navigator.permissions?.query({ name: "camera" });
    return result?.state ?? "unknown";
  } catch {
    // Firefox (older) and Safari (older) can't query "camera".
    return "unknown";
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function render(now) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const stage = selectedBackground === "none" ? "dolls-ar" : "dolls-game";
  ctx.clearRect(0, 0, width, height);
  const state = usingCamera ? (stabilizer.frame(now) ?? lastState) : lastState;
  effect.render(ctx, state, {
    width,
    height,
    now,
    mode: usingCamera ? "camera" : "demo",
    stage,
    trackingMode,
    video,
    sourceWidth: video.videoWidth,
    sourceHeight: video.videoHeight
  });
}

function captureVideoFrameDataUrl() {
  if (!video.videoWidth || !video.videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return null;
  }

  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = video.videoWidth;
  frameCanvas.height = video.videoHeight;
  const frameContext = frameCanvas.getContext("2d", { alpha: false });
  frameContext.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
  return frameCanvas.toDataURL("image/png");
}

function createDebugCapture() {
  const effectDebug = effect.getDebugState?.() ?? null;
  const blendshapes = lastState.raw?.face?.faceBlendshapes?.[0]?.categories ?? [];
  const sortedBlendshapes = [...blendshapes].sort((a, b) => b.score - a.score);

  return {
    capturedAt: new Date().toISOString(),
    url: window.location.href,
    debugEnabled,
    app: {
      usingCamera,
      paused,
      selectedBackground,
      selectedCharacter: selectedCharacter,
      trackingMode,
      trackingInFlight,
      lastTrackingAt,
      canvas: {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight
      },
      video: {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      }
    },
    gameConfig: GAME_CONFIG,
    doll: effectDebug,
    state: lastState,
    blendshapes: {
      tongueOut: blendshapes.find((item) => item.categoryName === "tongueOut")?.score ?? null,
      top: sortedBlendshapes.slice(0, 16)
    },
    images: {
      cameraFramePng: captureVideoFrameDataUrl(),
      mouthSamplePng: effectDebug?.tongueOut?.sampleImagePng ?? null
    }
  };
}

function downloadDebugCapture() {
  const capture = createDebugCapture();
  const blob = new Blob([JSON.stringify(capture, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const link = document.createElement("a");
  link.href = url;
  link.download = `dolls-debug-${timestamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Debug capture downloaded.");
}

function updatePauseButton() {
  pauseButton.querySelector(".hud-label").textContent = paused ? "Resume" : "Pause";
  pauseButton.querySelector(".hud-icon").textContent = paused ? "▶" : "❚❚";
  pauseButton.setAttribute("aria-pressed", String(paused));
  app.dataset.paused = String(paused);
}

function shouldUpdateStatus(now) {
  if (now - lastStatusAt < 360) {
    return false;
  }

  lastStatusAt = now;
  return true;
}

let frameCanvas = null;
let resizeOptionsWork = true;

// createImageBitmap's resize options aren't supported everywhere (older
// Safari rejects them); fall back to scaling through a canvas.
async function grabTrackingFrame(width, height) {
  if (resizeOptionsWork) {
    try {
      return await createImageBitmap(video, { resizeWidth: width, resizeHeight: height, resizeQuality: "low" });
    } catch (error) {
      console.warn("createImageBitmap resize failed; using a canvas instead", error);
      resizeOptionsWork = false;
    }
  }
  frameCanvas = frameCanvas ?? document.createElement("canvas");
  frameCanvas.width = width;
  frameCanvas.height = height;
  frameCanvas.getContext("2d").drawImage(video, 0, 0, width, height);
  return createImageBitmap(frameCanvas);
}

// If the camera is "on" but no tracked frame comes back for a while (frozen
// stream, a driver that never delivers frames), say so and reopen it once.
const NO_FRAMES_WARNING_MS = 6000;
const NO_FRAMES_RESTART_MS = 12000;
let lastTrackingResultAt = 0;
let cameraLiveSince = 0;
let watchdogRestarted = false;

function checkCameraWatchdog(now) {
  if (!usingCamera || paused || cameraStarting || !cameraLiveSince) {
    return;
  }
  const quietFor = now - Math.max(lastTrackingResultAt, cameraLiveSince);
  if (quietFor > NO_FRAMES_RESTART_MS && !watchdogRestarted) {
    watchdogRestarted = true;
    cameraLiveSince = now;
    setStatus("Reconnecting the camera…");
    void resumeCamera();
  } else if (quietFor > NO_FRAMES_RESTART_MS * 2) {
    cameraLiveSince = 0;
    showCameraProblem("The camera isn't sending a picture. Check that it's plugged in and not covered, then tap Try again.");
  } else if (quietFor > NO_FRAMES_WARNING_MS && shouldUpdateStatus(now)) {
    setStatus("Waiting for the camera picture…");
  }
}

function scheduleTracking(now) {
  if (!usingCamera || !tracker || trackingInFlight) {
    return;
  }

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  const modeConfig = TRACKING_MODES[trackingMode] ?? TRACKING_MODES.face;
  if (now - lastTrackingAt < modeConfig.intervalMs) {
    return;
  }

  trackingInFlight = true;
  lastTrackingAt = now;

  // Keep the camera's own shape: squashing a portrait (iPad) frame into a
  // landscape box distorts the face and hurts expression detection.
  const longSide = Math.max(modeConfig.width, modeConfig.height);
  const aspect = video.videoWidth / video.videoHeight;
  const resizeWidth = aspect >= 1 ? longSide : Math.round(longSide * aspect);
  const resizeHeight = aspect >= 1 ? Math.round(longSide / aspect) : longSide;
  const activeTracker = tracker;

  grabTrackingFrame(resizeWidth, resizeHeight)
    .then((image) => activeTracker.estimate(image, now, trackingMode))
    .then((result) => {
      consecutiveTrackingFailures = 0;
      trackerRestarts = 0;
      if (paused || activeTracker !== tracker) {
        return;
      }

      lastTrackingResultAt = performance.now();
      lastState = createPuppetState(result, { aspect });
      stabilizer.update(lastState, performance.now());
      if (shouldUpdateStatus(now)) {
        setStatus(lastState.face.tracked ? "" : "Looking for your face.");
      }
    })
    .catch((error) => {
      console.error(error);
      if (activeTracker !== tracker) {
        return;
      }
      consecutiveTrackingFailures += 1;
      if (activeTracker.dead || consecutiveTrackingFailures >= MAX_CONSECUTIVE_TRACKING_FAILURES) {
        void restartTracking();
        return;
      }
      if (shouldUpdateStatus(now)) {
        setStatus("Tracking is warming up. Keeping the last good pose.");
      }
    })
    .finally(() => {
      trackingInFlight = false;
    });
}

function frame(now) {
  if (paused) {
    render(pausedAt || now);
    requestAnimationFrame(frame);
    return;
  }

  updateBackgroundMomentum(now);

  if (usingCamera) {
    scheduleTracking(now);
    checkCameraWatchdog(now);
  } else {
    lastState = createDemoPuppetState(now);
  }

  render(now);
  requestAnimationFrame(frame);
}

async function setPaused(nextPaused, now = performance.now()) {
  paused = nextPaused;
  pausedAt = nextPaused ? now : 0;
  lastFrameAt = 0;
  updatePauseButton();

  if (!usingCamera) {
    setStatus(nextPaused ? "Paused." : cameraProblem ?? "");
    return;
  }

  if (nextPaused) {
    camera?.stop();
    setStatus("Paused.");
    return;
  }

  await resumeCamera();
}

async function resumeCamera() {
  try {
    await camera.start();
    lastTrackingAt = 0;
    cameraLiveSince = performance.now();
    setStatus("");
  } catch (error) {
    if (error.cancelled) {
      // Paused (or restarted) again while the camera was starting.
      return;
    }
    console.error(error);
    usingCamera = false;
    camera.stop();
    paused = false;
    pausedAt = 0;
    updatePauseButton();
    showCameraProblem(cameraErrorMessage(error));
  }
}

// The browser ended the camera track on its own (camera unplugged, or iPadOS
// revoked it in the background): get a fresh stream.
function handleCameraEnded() {
  if (usingCamera && !paused) {
    void resumeCamera();
  }
}

async function restartTracking() {
  if (restartingTracker) {
    return;
  }
  restartingTracker = true;
  tracker?.dispose();
  tracker = null;
  usingCamera = false;
  camera?.stop();
  trackerRestarts += 1;
  try {
    if (trackerRestarts > MAX_TRACKER_RESTARTS) {
      showCameraProblem("Face tracking stopped working. Tap Try again.");
      return;
    }
    setStatus("Restarting face tracking…");
    await startCamera();
  } finally {
    restartingTracker = false;
  }
}

function applyBackgroundOffset(nextOffset) {
  backgroundOffset = nextOffset;
  app.style.setProperty("--background-x", `${backgroundOffset}px`);
}

function updateBackgroundMomentum(now) {
  if (selectedBackground === "none" || backgroundDrag) {
    lastFrameAt = now;
    return;
  }

  const deltaSeconds = lastFrameAt ? Math.min((now - lastFrameAt) / 1000, 0.05) : 0;
  lastFrameAt = now;

  if (Math.abs(backgroundVelocity) < BACKGROUND_MIN_VELOCITY || deltaSeconds <= 0) {
    backgroundVelocity = 0;
    return;
  }

  applyBackgroundOffset(backgroundOffset + backgroundVelocity * deltaSeconds);
  backgroundVelocity *= Math.pow(BACKGROUND_FRICTION, deltaSeconds * 60);
}

function startCamera() {
  cameraStarting = cameraStarting ?? startCameraAndTracking().finally(() => {
    cameraStarting = null;
  });
  return cameraStarting;
}

async function startCameraAndTracking() {
  clearCameraProblem();
  consecutiveTrackingFailures = 0;
  // Create the tracker first so MediaPipe downloads while the camera
  // permission prompt is showing.
  if (!tracker || tracker.dead) {
    tracker?.dispose();
    tracker = createWorkerTracker();
  }
  camera = camera ?? createCamera(video, { onEnded: handleCameraEnded });

  const permission = await cameraPermissionState();
  // Only "prompt" means a browser question is about to appear; with "granted"
  // the camera just opens, and "unknown" browsers may not ask at all.
  setStatus(permission === "prompt" ? "Tap Allow so your doll can see you!" : "Turning on the camera…");

  try {
    await camera.start();
  } catch (error) {
    if (error.cancelled) {
      return;
    }
    console.error(error);
    usingCamera = false;
    camera.stop();
    showCameraProblem(cameraErrorMessage(error));
    return;
  }

  try {
    setStatus("Getting face tracking ready…");
    await tracker.configure(trackingMode);
  } catch (error) {
    console.error(error);
    usingCamera = false;
    // Don't leave the camera (and its light) on when tracking can't run.
    camera.stop();
    tracker?.dispose();
    tracker = null;
    showCameraProblem("Face tracking couldn't load. Check the internet connection, then tap Try again.");
    return;
  }

  usingCamera = true;
  cameraLiveSince = performance.now();
  watchdogRestarted = false;
  stabilizer.reset();
  if (paused) {
    // Paused while starting up: keep the camera off until Resume.
    camera.stop();
    setStatus("Paused.");
    return;
  }
  setStatus("");
}

function updateUrlState(next = {}) {
  const params = new URLSearchParams(window.location.search);
  const character = next.character ?? selectedCharacter;
  const background = next.background ?? selectedBackground;
  if (visibleDollCharacters[character]) {
    params.set("character", character);
  } else {
    params.delete("character");
  }
  if (BACKGROUNDS[background]) {
    params.set("background", background);
  } else {
    params.delete("background");
  }
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function setBackground(backgroundId, { updateUrl = true } = {}) {
  const background = BACKGROUNDS[backgroundId] ?? BACKGROUNDS.farm;
  selectedBackground = BACKGROUNDS[backgroundId] ? backgroundId : "farm";
  app.dataset.background = selectedBackground;
  if (background.src) {
    app.style.setProperty("--background-image", `url("${background.src}")`);
  } else {
    app.style.removeProperty("--background-image");
  }
  backgroundVelocity = 0;
  backgroundDrag = null;
  app.dataset.draggingBackground = "false";

  for (const button of backgroundList.querySelectorAll(".background-choice")) {
    button.dataset.selected = String(button.dataset.background === selectedBackground);
    button.setAttribute("aria-selected", button.dataset.selected);
  }
  if (updateUrl) {
    updateUrlState({ background: selectedBackground });
  }
}

function buildBackgroundChoices() {
  for (const [id, background] of Object.entries(BACKGROUNDS)) {
    const button = document.createElement("button");
    button.className = "background-choice";
    button.type = "button";
    button.dataset.background = id;
    button.setAttribute("role", "option");
    const preview = background.thumbnail ?? background.src;
    const previewStyle = preview ? ` style="--preview-image: url('${preview}')"` : "";
    const previewIcon = preview ? "" : "📷";
    button.innerHTML = `
      <span class="background-preview"${previewStyle}>${previewIcon}</span>
      <span class="background-name">${background.label}</span>
    `;
    button.addEventListener("click", () => {
      setBackground(id);
    });
    backgroundList.append(button);
  }
}

function characterArt(id) {
  return CHARACTER_STYLES[id]?.portrait ?? `./assets/${id}/reference.webp`;
}

function buildCharacterChoices() {
  characterList.replaceChildren();
  for (const character of Object.values(visibleDollCharacters)) {
    const style = CHARACTER_STYLES[character.id] ?? {};
    const button = document.createElement("button");
    button.className = "character-card";
    button.type = "button";
    button.dataset.character = character.id;
    button.dataset.portrait = style.portrait ? "full" : "head";
    button.setAttribute("role", "option");
    button.style.setProperty("--card-color", style.color ?? "#6a3aa8");
    button.style.setProperty("--i", String(characterList.children.length));
    button.style.setProperty("--card-image", `url("${characterArt(character.id)}")`);
    button.innerHTML = `
      <span class="character-art" aria-hidden="true"></span>
      <span class="character-name">${character.label}</span>
    `;
    button.addEventListener("click", () => {
      playAs(character.id);
    });
    characterList.append(button);
  }
  setCharacter(selectedCharacter, { updateUrl: false });
}

// Dolls without a race portrait pick one up from assets/portraits/ once it's drawn.
function upgradeHeadPortraits() {
  for (const card of characterList.querySelectorAll('.character-card[data-portrait="head"]')) {
    const id = card.dataset.character;
    const src = `./assets/portraits/${id}.webp`;
    void loadOptionalImage(src).then((found) => {
      if (found) {
        card.dataset.portrait = "full";
        card.style.setProperty("--card-image", `url("${src}")`);
      }
    });
  }
}

function applyOptionalTitleArt() {
  void loadOptionalImage(OPTIONAL_ART.logo).then((found) => {
    if (found) {
      titleScreen.querySelector(".logo").style.setProperty("--logo-image", `url("${OPTIONAL_ART.logo}")`);
      titleScreen.dataset.logoArt = "true";
    }
  });
  void loadOptionalImage(OPTIONAL_ART.titleBackground).then((found) => {
    if (found) {
      titleScreen.style.setProperty("--title-image", `url("${OPTIONAL_ART.titleBackground}")`);
      titleScreen.dataset.backgroundArt = "true";
    }
  });
}

function setCharacter(characterId, { updateUrl = true } = {}) {
  if (!visibleDollCharacters[characterId]) {
    return;
  }
  selectedCharacter = characterId;
  effect.setCharacter(characterId);
  for (const card of characterList.querySelectorAll(".character-card")) {
    const selected = card.dataset.character === characterId;
    card.setAttribute("aria-selected", String(selected));
    if (selected && screen === "title") {
      card.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  }
  if (updateUrl) {
    updateUrlState({ character: characterId });
  }
}

function stepCharacter(direction) {
  const ids = Object.keys(visibleDollCharacters);
  const index = ids.indexOf(selectedCharacter);
  setCharacter(ids[(index + direction + ids.length) % ids.length]);
}

function setScreen(next) {
  screen = next;
  app.dataset.screen = next;
  titleScreen.hidden = next !== "title";
  gestureHints.hidden = next !== "play" || hintsDismissed;
  if (next === "title") {
    // Coming back from a game: keyboard focus starts on the current doll.
    if (characterList.dataset.picked === "true") {
      characterList.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
    }
  } else if (next === "play") {
    if (paused) {
      pausedForHidden = false;
      void setPaused(false);
    }
    pauseButton.focus({ preventScroll: true });
  }
}

// Picking a doll is the "start" press: go straight into the game and ask for
// the camera then (after a tap, never on page load).
function playAs(characterId) {
  characterList.dataset.picked = "true";
  setCharacter(characterId);
  setScreen("play");
  if (!usingCamera && !cameraStarting) {
    void startCamera();
  }
}

openSelectButton.addEventListener("click", () => {
  setScreen("title");
});

pauseButton.addEventListener("click", () => {
  pausedForHidden = false;
  void setPaused(!paused);
});

cameraRetryButton.addEventListener("click", () => {
  trackerRestarts = 0;
  if (paused) {
    paused = false;
    pausedAt = 0;
    updatePauseButton();
  }
  void startCamera();
});

// Turn the camera off while the tab/app is hidden, and back on when it returns.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (!paused) {
      pausedForHidden = true;
      void setPaused(true);
    }
  } else if (pausedForHidden) {
    pausedForHidden = false;
    void setPaused(false);
  }
});

downloadDebugButton?.addEventListener("click", downloadDebugCapture);

function beginBackgroundDrag(event) {
  if (selectedBackground === "none" || event.button > 0) {
    return;
  }
  backgroundDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    lastX: event.clientX,
    lastAt: event.timeStamp || performance.now(),
    offset: backgroundOffset,
    velocity: 0
  };
  backgroundVelocity = 0;
  app.dataset.draggingBackground = "true";
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function updateBackgroundDrag(event) {
  if (!backgroundDrag || event.pointerId !== backgroundDrag.pointerId) {
    return;
  }
  const now = event.timeStamp || performance.now();
  const dx = event.clientX - backgroundDrag.lastX;
  const dt = Math.max(8, now - backgroundDrag.lastAt) / 1000;
  backgroundDrag.velocity = clamp(dx / dt, -BACKGROUND_MAX_VELOCITY, BACKGROUND_MAX_VELOCITY);
  backgroundDrag.lastX = event.clientX;
  backgroundDrag.lastAt = now;
  applyBackgroundOffset(backgroundDrag.offset + event.clientX - backgroundDrag.startX);
  event.preventDefault();
}

function endBackgroundDrag(event) {
  if (!backgroundDrag || event.pointerId !== backgroundDrag.pointerId) {
    return;
  }
  backgroundVelocity = backgroundDrag.velocity;
  backgroundDrag = null;
  lastFrameAt = 0;
  app.dataset.draggingBackground = "false";
  try {
    canvas.releasePointerCapture(event.pointerId);
  } catch {}
  event.preventDefault();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (event.repeat && event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  if (screen === "title") {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      characterList.dataset.picked = "true";
      stepCharacter(event.key === "ArrowLeft" ? -1 : 1);
      characterList.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
    } else if (event.key === "Escape" && (usingCamera || cameraStarting)) {
      // Back to the game already in progress.
      event.preventDefault();
      setScreen("play");
    }
    // Enter/Space press the focused doll card like a tap.
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    pausedForHidden = false;
    void setPaused(!paused);
  }
});

canvas.addEventListener("pointerdown", beginBackgroundDrag);
canvas.addEventListener("pointermove", updateBackgroundDrag);
canvas.addEventListener("pointerup", endBackgroundDrag);
canvas.addEventListener("pointercancel", endBackgroundDrag);

buildBackgroundChoices();
buildCharacterChoices();
characterList.dataset.picked = String(Boolean(visibleDollCharacters[requestedCharacter]));
upgradeHeadPortraits();
applyOptionalTitleArt();
if (debugTools) {
  debugTools.hidden = !debugEnabled;
}
setBackground(initialBackgroundId, { updateUrl: urlParams.has("character") || urlParams.has("background") });
resizeCanvas();
updatePauseButton();
setScreen("title");
requestAnimationFrame(frame);
