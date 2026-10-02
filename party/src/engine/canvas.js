// The game draws in a fixed 1920x1080 logical space; this module letterboxes
// that space into the window at the device's pixel ratio.

export const W = 1920;
export const H = 1080;

export const view = { scale: 1, ox: 0, oy: 0, dpr: 1, cssW: 0, cssH: 0 };

let canvas, g;

export function setupCanvas(el) {
  canvas = el;
  g = canvas.getContext('2d', { alpha: false });
  const resize = () => {
    const cssW = window.innerWidth, cssH = window.innerHeight;
    // Cap the backing store so 4K TVs don't melt: at most ~2x the logical size.
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = Math.min(cssW / W, cssH / H);
    if (fit * dpr > 2) dpr = 2 / fit;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    view.dpr = dpr; view.cssW = cssW; view.cssH = cssH;
    view.scale = fit * dpr;
    view.ox = (canvas.width - W * view.scale) / 2;
    view.oy = (canvas.height - H * view.scale) / 2;
  };
  window.addEventListener('resize', resize);
  resize();
  return g;
}

/** Reset the transform to logical space and paint letterbox bars. */
export function beginFrame() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#1b1030';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();
}

export function endFrame() {
  g.restore();
}

/** Convert a client (CSS pixel) point to logical game coordinates. */
export function toLogical(clientX, clientY) {
  return {
    x: (clientX * view.dpr - view.ox) / view.scale,
    y: (clientY * view.dpr - view.oy) / view.scale,
  };
}

export function getCanvas() { return canvas; }
