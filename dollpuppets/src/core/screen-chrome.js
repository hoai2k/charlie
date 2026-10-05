// Getting the browser's own bars out of the way on phones and tablets.
// Ported from hoai2k/mini widowsbay (src/chrome.js and src/fit.js).
//
// - Where the Fullscreen API exists (Android, iPad, desktop; iPhone only with
//   Safari's experimental flag), fullscreen needs a user gesture. On touch
//   devices, picking a doll asks for it, and so does the first tap after the
//   device is turned to landscape.
// - iPhone Safari has no element fullscreen. It does tuck its address and tab
//   bars away when the page is scrolled, but only if there is something to
//   scroll. So on iPhone Safari (not the home-screen app) the page is made a
//   little taller than the screen, and while the bars are showing in
//   landscape a hint says to swipe up. Scrolling is only possible on the title
//   screen; during play the canvas owns every gesture (background drag).
// - The home-screen app (Add to Home Screen, see manifest.webmanifest) is
//   already full screen.
// - CSS 100vh can't be trusted on phones (iOS ignores its bars), so the game
//   is sized to the visual viewport, the part of the page actually visible.

const isIPhone = /iP(hone|od)/.test(navigator.userAgent);
const standalone =
  navigator.standalone === true || matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
const touch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

export const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

export function canFullscreen() {
  const el = document.documentElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function requestFullscreen() {
  const el = document.documentElement;
  if (fullscreenElement()) {
    return;
  }
  try {
    const result = el.requestFullscreen
      ? el.requestFullscreen({ navigationUI: "hide" })
      : el.webkitRequestFullscreen?.();
    result?.catch?.(() => {
      // Refused (no gesture, or not allowed here): carry on in the page.
    });
  } catch {
    // Not allowed here.
  }
}

export function exitFullscreen() {
  try {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
  } catch {
    // Ignore.
  }
}

export function toggleFullscreen() {
  if (fullscreenElement()) {
    exitFullscreen();
  } else {
    requestFullscreen();
  }
}

export function createScreenChrome({ app, isPlaying, hintEl, onResize }) {
  const landscape = () => innerWidth > innerHeight;

  // 1. On touch devices, the first tap in landscape asks for fullscreen.
  if (touch && canFullscreen() && !standalone) {
    document.addEventListener(
      "pointerup",
      () => {
        if (landscape() && !fullscreenElement()) {
          requestFullscreen();
        }
      },
      { capture: true }
    );
  }

  // 2. iPhone Safari: let the bars be scrolled away.
  const scrollTrick = isIPhone && !standalone && !canFullscreen();
  if (scrollTrick) {
    document.documentElement.classList.add("ios-scroll");
  }
  // Safari's bars are showing when the visible height falls well short of the
  // screen's (in landscape the screen's height is its shorter side).
  const barsShowing = () => {
    const full = Math.min(screen.width, screen.height);
    const height = window.visualViewport ? visualViewport.height : innerHeight;
    return height < full - 24;
  };

  // The fullscreen button can show the hint on demand, for a few seconds.
  let hintFlashUntil = 0;

  function updateHint() {
    if (!scrollTrick) {
      return;
    }
    const playing = isPlaying();
    document.documentElement.classList.toggle("ios-scroll-play", playing);
    const flashing = performance.now() < hintFlashUntil;
    hintEl.hidden = !(flashing || (landscape() && barsShowing() && !playing));
  }

  // 3. Size the game to the part of the page that is actually visible.
  let lastKey = "";
  function fit() {
    const vv = window.visualViewport;
    const width = Math.round(vv ? vv.width : innerWidth);
    const height = Math.round(vv ? vv.height : innerHeight);
    const left = vv ? Math.round(vv.offsetLeft) : 0;
    const top = vv ? Math.round(vv.offsetTop) : 0;
    const key = [width, height, left, top].join(",");
    if (key === lastKey) {
      return;
    }
    lastKey = key;
    Object.assign(app.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
    onResize?.();
  }

  function update() {
    fit();
    updateHint();
  }

  addEventListener("resize", update);
  addEventListener("orientationchange", () => setTimeout(update, 120));
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  document.addEventListener("fullscreenchange", () => setTimeout(update, 60));
  document.addEventListener("webkitfullscreenchange", () => setTimeout(update, 60));
  // iOS settles its bars a beat after rotation and scroll; re-measure briefly.
  setInterval(update, 500);
  update();

  return {
    update,
    // Picking a doll is a user gesture: on touch devices, use it to go full screen.
    enterGame() {
      if (touch && canFullscreen() && !standalone) {
        requestFullscreen();
      }
      updateHint();
    },
    // What the fullscreen button can do here: "toggle", "hint" (iPhone Safari:
    // show how to hide the bars) or "none" (home-screen app, already full screen).
    fullscreenMode: canFullscreen() && !standalone ? "toggle" : scrollTrick ? "hint" : "none",
    flashHint() {
      hintFlashUntil = performance.now() + 4000;
      hintEl.hidden = false;
      hintEl.classList.remove("flash");
      void hintEl.offsetWidth;
      hintEl.classList.add("flash");
    }
  };
}
