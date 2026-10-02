// Browser shell helpers: fullscreen. Fullscreen needs a user gesture; keyboard
// and pointer events count, gamepad presses usually don't, so the title tries
// on any input and later key/click gestures retry until it works.
export const shell = {
  wantFullscreen: false,
  isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  canFullscreen() { const el = document.documentElement; return !!(el.requestFullscreen || el.webkitRequestFullscreen); },
  tryFullscreen() {
    if (this.isFullscreen()) { this.wantFullscreen = false; return true; }
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return false;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => { this.wantFullscreen = false; }).catch(() => {});
    } catch (e) { /* needs a gesture */ }
    return this.isFullscreen();
  },
};
