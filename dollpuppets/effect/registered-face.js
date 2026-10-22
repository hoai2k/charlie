// Shared with the legacy renderer: tracking under-reports the right eye.
export const EYE_CLOSED_THRESHOLD = 0.62;
export const RIGHT_EYE_CLOSED_THRESHOLD = 0.54;

// All patches use one master-head coordinate system. Neither expression nor
// blink changes can move the silhouette, neck, hair, or head geometry.
export function registeredFeatureEntries(config) {
  // mouth_smile names both a head state and a patch; keep their images distinct.
  return Object.entries(config.sprites.features ?? {}).map(([name, sprite]) => [`feature_${name}`, sprite]);
}

export function featureRect(box, headRect) {
  return {
    x: headRect.x + box[0] * headRect.width,
    y: headRect.y + box[1] * headRect.height,
    width: (box[2] - box[0]) * headRect.width,
    height: (box[3] - box[1]) * headRect.height
  };
}

export function registeredMouth(config, mouth, talking) {
  const mouths = config.registeredFace.mouths;
  // Keep intentional held expressions intact while speech continues.
  if (["mouth_tongue", "mouth_frown", "expression_laugh"].includes(mouth)) {
    return mouths[mouth];
  }
  return mouths[talking] ?? mouths[mouth] ?? null;
}

export function drawRegisteredFace(ctx, runtime, expressions, headRect, mouth, talking) {
  const { config, images } = runtime;
  ctx.drawImage(images.reference, headRect.x, headRect.y, headRect.width, headRect.height);
  const draw = (name, { alpha = 1, dy = 0, angle = 0 } = {}) => {
    const meta = config.sprites.features[name];
    const image = images[`feature_${name}`];
    if (!meta || !image) return;
    const rect = featureRect(meta.box, headRect);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2 + dy);
    ctx.rotate(angle);
    ctx.drawImage(image, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
    ctx.restore();
  };
  const mouthFeature = registeredMouth(config, mouth, talking);
  if (mouthFeature) draw(mouthFeature);
  // A closed lid is drawn solid, like the legacy dolls' closed-eye sprites.
  // Fading it with the blink score left a see-through lid, because a real
  // closed eye often only scores around 0.5-0.7.
  if ((expressions.leftEyeClosed ?? 0) > EYE_CLOSED_THRESHOLD) draw("blink_left");
  if ((expressions.rightEyeClosed ?? 0) > RIGHT_EYE_CLOSED_THRESHOLD) draw("blink_right");
  const raise = Math.max(expressions.browRaise ?? 0, expressions.browInnerUp ?? 0);
  const down = expressions.browDown ?? 0;
  const dy = headRect.height * (down * 0.008 - raise * 0.018);
  draw("brow_left", { dy, angle: -down * 0.14 });
  draw("brow_right", { dy, angle: down * 0.14 });
}
