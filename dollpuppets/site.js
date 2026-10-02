import { createCamera } from "./src/core/camera.js";
import { createDemoPuppetState, createPuppetState } from "./src/core/puppet-state.js";
import { createWorkerTracker, TRACKING_MODES } from "./src/core/worker-tracker.js";
import { DOLL_CHARACTERS, renderDollsEffect } from "./effect/render.js";
import GAME_CONFIG from "./gameConfig.js";

const BACKGROUNDS = {
  none: {
    label: "None",
    src: null
  },
  farm: {
    label: "Farm",
    src: "./assets/backgrounds/farm.png"
  },
  winter: {
    label: "Winter",
    src: "./assets/backgrounds/winter.png"
  },
  castles: {
    label: "Castles",
    src: "./assets/backgrounds/castles.png"
  },
  fairy: {
    label: "Fairy",
    src: "./assets/backgrounds/fairy.png"
  },
  village: {
    label: "Village",
    src: "./assets/backgrounds/village.png"
  }
};

const app = document.querySelector(".dolls-app");
const video = document.querySelector("#camera");
const canvas = document.querySelector("#doll-canvas");
const pauseButton = document.querySelector("#pause-game");
const settingsToggle = document.querySelector("#settings-toggle");
const settingsClose = document.querySelector("#settings-close");
const settingsPanel = document.querySelector("#settings-panel");
const backgroundList = document.querySelector("#background-list");
const characterSelect = document.querySelector("#character-select");
const debugTools = document.querySelector("#debug-tools");
const downloadDebugButton = document.querySelector("#download-debug");
const status = document.querySelector("#status");
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
let backgroundOffset = 0;
let backgroundVelocity = 0;
let backgroundDrag = null;
let lastFrameAt = 0;
let paused = false;
let pausedAt = 0;

function setStatus(message) {
  status.textContent = message;
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
  effect.render(ctx, lastState, {
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
      selectedCharacter: characterSelect.value,
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
  pauseButton.textContent = paused ? "Resume" : "Pause";
  pauseButton.setAttribute("aria-pressed", String(paused));
}

function shouldUpdateStatus(now) {
  if (now - lastStatusAt < 360) {
    return false;
  }

  lastStatusAt = now;
  return true;
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

  createImageBitmap(video, {
    resizeWidth: modeConfig.width,
    resizeHeight: modeConfig.height,
    resizeQuality: "low"
  })
    .then((image) => tracker.estimate(image, now, trackingMode))
    .then((result) => {
      if (paused) {
        return;
      }

      lastState = createPuppetState(result);
      if (shouldUpdateStatus(now)) {
        setStatus(lastState.face.tracked ? "" : "Looking for your face.");
      }
    })
    .catch((error) => {
      console.error(error);
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
    setStatus(nextPaused ? "Paused." : "");
    return;
  }

  if (nextPaused) {
    camera?.stop();
    setStatus("Paused.");
    return;
  }

  try {
    await camera.start();
    lastTrackingAt = 0;
    setStatus("");
  } catch (error) {
    console.error(error);
    usingCamera = false;
    paused = false;
    pausedAt = 0;
    updatePauseButton();
    setStatus("Camera permission is needed for AR tracking.");
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

async function startCamera() {
  try {
    tracker = tracker ?? createWorkerTracker();
    camera = camera ?? createCamera(video);
    await camera.start();
    await tracker.configure(trackingMode);
    usingCamera = true;
    setStatus("");
  } catch (error) {
    console.error(error);
    usingCamera = false;
    setStatus("Camera permission is needed for AR tracking.");
  }
}

function updateUrlState(next = {}) {
  const params = new URLSearchParams(window.location.search);
  const character = next.character ?? characterSelect.value;
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
    const previewStyle = background.src ? ` style="--preview-image: url('${background.src}')"` : "";
    button.innerHTML = `
      <span class="background-preview"${previewStyle}></span>
      <span class="background-name">${background.label}</span>
    `;
    button.addEventListener("click", () => {
      setBackground(id);
    });
    backgroundList.append(button);
  }
}

function buildCharacterChoices() {
  characterSelect.replaceChildren();
  for (const character of Object.values(visibleDollCharacters)) {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = character.label;
    option.selected = character.id === initialCharacterId;
    characterSelect.append(option);
  }
  characterSelect.value = visibleDollCharacters[initialCharacterId] ? initialCharacterId : "rumi";
}

function setSettingsOpen(open) {
  settingsPanel.hidden = !open;
  settingsToggle.setAttribute("aria-expanded", String(open));
}

settingsToggle.addEventListener("click", () => {
  setSettingsOpen(settingsPanel.hidden);
});

settingsClose.addEventListener("click", () => {
  setSettingsOpen(false);
});

characterSelect.addEventListener("change", () => {
  effect.setCharacter(characterSelect.value);
  updateUrlState({ character: characterSelect.value });
});

pauseButton.addEventListener("click", () => {
  void setPaused(!paused);
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
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  if (!settingsPanel.hidden) {
    setSettingsOpen(false);
    return;
  }

  void setPaused(!paused);
});

canvas.addEventListener("pointerdown", beginBackgroundDrag);
canvas.addEventListener("pointermove", updateBackgroundDrag);
canvas.addEventListener("pointerup", endBackgroundDrag);
canvas.addEventListener("pointercancel", endBackgroundDrag);

buildBackgroundChoices();
buildCharacterChoices();
if (debugTools) {
  debugTools.hidden = !debugEnabled;
}
setBackground(initialBackgroundId, { updateUrl: urlParams.has("character") || urlParams.has("background") });
resizeCanvas();
updatePauseButton();
requestAnimationFrame(frame);

setTimeout(() => {
  void startCamera();
}, 250);
