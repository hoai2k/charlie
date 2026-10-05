/*
 * Getting the browser's own bars out of the way on phones (same approach as
 * mini/widowsbay's src/chrome.js).
 *
 * - Where the Fullscreen API exists (Android, iPad, desktop), fullscreen needs
 *   a user gesture, so turning the device can't trigger it by itself. Instead
 *   the first tap after the device is in landscape requests fullscreen.
 * - iPhone Safari has no element fullscreen. It does tuck its address and tab
 *   bars away in landscape when the page is scrolled, but only if there is
 *   something to scroll. So on iPhone Safari (not the home-screen app) the
 *   page is made a little taller than the screen, and while the bars show a
 *   hint says to swipe up. Scrolling only works outside a race (title,
 *   select, pause, finish); during a race the touch controls own every swipe.
 * - The home-screen app (Add to Home Screen) is already full screen.
 * Loaded after game.js; uses its fullscreenElement/canFullscreen/toggleFullscreen.
 */
(() => {
  const touch = matchMedia("(pointer: coarse)").matches;
  const isIPhone = /iP(hone|od)/.test(navigator.userAgent);
  const standalone = navigator.standalone === true || matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
  const landscape = () => innerWidth > innerHeight;
  const racing = () => state.running && !state.paused && !state.done;

  // 1. The first tap in landscape asks for fullscreen (where supported).
  if (touch && canFullscreen() && !standalone) {
    document.addEventListener("pointerup", () => {
      if (landscape() && !fullscreenElement()) toggleFullscreen();
    }, { capture: true });
  }

  // 2. iPhone Safari: let the bars be scrolled away.
  const scrollTrick = isIPhone && !standalone && !canFullscreen();
  const hint = document.querySelector("#barsHint");
  if (scrollTrick) document.documentElement.classList.add("ios-scroll");
  // Safari's bars are showing when the visible height falls well short of
  // the screen's (in landscape the screen's height is its shorter side).
  const barsShowing = () => {
    const full = Math.min(screen.width, screen.height);
    const height = window.visualViewport ? visualViewport.height : innerHeight;
    return height < full - 24;
  };
  function update() {
    if (!scrollTrick) return;
    const play = racing();
    document.documentElement.classList.toggle("ios-scroll-play", play);
    // Back at the top when a race starts, so the game isn't half off screen.
    if (play && scrollY !== 0 && !barsShowing()) scrollTo(0, 0);
    hint.hidden = !(landscape() && barsShowing() && !play);
  }
  if (scrollTrick) {
    addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    setInterval(update, 400);
    setTimeout(update, 0);
  }

  // The Settings "Full screen" row on iPhone points at the hint instead.
  window.BrowserChrome = {
    scrollTrick,
    flashHint() {
      if (!scrollTrick) return;
      hint.hidden = false;
      hint.classList.remove("flash");
      void hint.offsetWidth;
      hint.classList.add("flash");
    }
  };
})();
