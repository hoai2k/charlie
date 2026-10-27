// Browser shell helpers: fullscreen and getting the browser's bars out of the
// way on phones and tablets (the same approach as Widow's Bay in hoai2k/mini).
//
// - Fullscreen needs a user gesture. Keyboard and mouse presses count, but a
//   touch only counts when the finger lifts (pointerup), and gamepad presses
//   usually don't count at all. So a request that fails sets wantFullscreen,
//   and the next real gesture (input.onUserGesture, which also fires on
//   pointerup) retries until it works.
// - Touch devices with the Fullscreen API (Android, iPad): the first tap after
//   the device is in landscape asks for fullscreen, unless the player turned
//   fullscreen off themselves.
// - iPhone Safari has no element fullscreen. It does tuck its address and tab
//   bars away in landscape when the page is scrolled, but only if there is
//   something to scroll. So there the page is made a little taller than the
//   screen, and while the bars are showing (menus, pause) a hint says to swipe
//   up. During play the page doesn't scroll, so touches stay with the game.
// - Add to Home Screen (manifest.webmanifest, icons/) installs it as a
//   full-screen landscape app, which is how iPhones get true full screen.
const isIPhone = /iP(hone|od)/.test(navigator.userAgent);
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
const landscape = () => innerWidth > innerHeight;

export const shell = {
  wantFullscreen: false,
  userExited: false,     // turned off on purpose: don't re-enter on the next tap
  scrollTrick: false,
  isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  canFullscreen() { const el = document.documentElement; return !!(el.requestFullscreen || el.webkitRequestFullscreen); },
  tryFullscreen() {
    if (this.isFullscreen()) { this.wantFullscreen = false; return true; }
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return false;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => { this.wantFullscreen = false; this.lockLandscape(); }).catch(() => {});
    } catch (e) { /* needs a gesture */ }
    return this.isFullscreen();
  },
  lockLandscape() {
    try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed here */ }
  },
  /** Fullscreen button: call inside a user gesture. */
  toggleFullscreen() {
    if (!this.isFullscreen()) {
      // A touch press isn't a gesture yet; the lift that follows completes it.
      this.userExited = false; this.wantFullscreen = true; this.tryFullscreen();
      return;
    }
    this.wantFullscreen = false; this.userExited = true;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    try { const p = exit && exit.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
  },

  /**
   * Phone/tablet handling (see the top of this file). isPlaying() says when
   * touches belong to the game (no page scrolling then).
   */
  initMobile({ isPlaying }) {
    if (this.canFullscreen() && !standalone) {
      document.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch' && landscape() && !this.isFullscreen() && !this.userExited) this.tryFullscreen();
      }, { capture: true });
    }
    this.scrollTrick = isIPhone && !standalone && !this.canFullscreen();
    if (!this.scrollTrick) return;
    const root = document.documentElement, hint = document.getElementById('bars-hint');
    root.classList.add('ios-scroll');
    // Safari's bars are showing when the visible height falls well short of
    // the screen's (in landscape the screen's height is its shorter side).
    const barsShowing = () => {
      const vh = window.visualViewport ? visualViewport.height : innerHeight;
      return vh < Math.min(screen.width, screen.height) - 24;
    };
    const update = () => {
      const play = isPlaying();
      root.classList.toggle('ios-scroll-play', play);
      if (hint) hint.hidden = !(landscape() && barsShowing() && !play);
    };
    addEventListener('resize', update);
    if (window.visualViewport) visualViewport.addEventListener('resize', update);
    setInterval(update, 400);
    setTimeout(update, 0);
  },
};
