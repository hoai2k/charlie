// Adjacent mirrored tiles share the same edge pixels. A two-tile period
// keeps that seam continuous when the scroll offset wraps.
export function drawMirroredScroll(g, image, width, height, scroll) {
  const phase = ((scroll % (2 * width)) + 2 * width) % (2 * width);
  const first = Math.floor(phase / width), offset = phase % width;
  for (let i = 0; i < 2; i++) {
    const x = i * width - offset;
    g.save();
    if ((first + i) % 2) {
      g.translate(x + width, 0); g.scale(-1, 1);
      g.drawImage(image, 0, 0, width, height);
    } else g.drawImage(image, x, 0, width, height);
    g.restore();
  }
}
