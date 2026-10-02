const FACE_CENTER_LANDMARK = 4;
const LEFT_EYE_LANDMARKS = [33, 133];
const RIGHT_EYE_LANDMARKS = [362, 263];
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

export function createPuppetState(result) {
  const faceLandmarks = result.face?.faceLandmarks?.[0] ?? [];
  const blendshapes = readBlendshapes(result.face?.faceBlendshapes?.[0]?.categories ?? []);
  const poseLandmarks = result.pose?.landmarks?.[0] ?? [];

  return {
    face: createFaceState(faceLandmarks, blendshapes),
    hands: createHandsState(result.hands),
    body: createBodyState(poseLandmarks),
    raw: result
  };
}

export function createDemoPuppetState(nowMs) {
  const t = nowMs / 1000;
  const wave = Math.sin(t * 2.4);
  const blink = Math.max(0, Math.sin(t * 3.2) - 0.82) * 5.6;
  const mouth = 0.18 + Math.max(0, Math.sin(t * 1.7)) * 0.55;

  return {
    face: {
      tracked: false,
      center: { x: 0.5 + Math.sin(t * 0.8) * 0.035, y: 0.28 + Math.sin(t * 1.1) * 0.012, z: 0 },
      size: 0.24,
      rotation: 0,
      expressions: {
        mouthOpen: mouth,
        leftEyeClosed: blink,
        rightEyeClosed: blink,
        smile: 0.45 + Math.sin(t * 1.25) * 0.18,
        frown: 0,
        surprise: Math.max(0, Math.sin(t * 0.8) - 0.75) * 2.5,
        angry: 0,
        disgust: 0,
        fear: 0,
        suspicious: Math.max(0, Math.sin(t * 0.7 + 1.2) - 0.82) * 3.2,
        smirkLeft: 0,
        smirkRight: 0,
        thinking: 0,
        tongueOut: 0,
        mouthFunnel: 0,
        mouthPucker: 0,
        browRaise: 0.25 + Math.max(0, Math.sin(t * 1.9)) * 0.35,
        browDown: 0,
        browInnerUp: 0,
        eyeWide: 0,
        eyeSquint: 0,
        noseSneer: 0,
        mouthStretch: 0
      }
    },
    hands: [
      demoHand("Left", 0.28 + wave * 0.04, 0.58 - Math.max(0, wave) * 0.08),
      demoHand("Right", 0.72 - wave * 0.04, 0.58 + Math.min(0, wave) * 0.08)
    ],
    body: {
      tracked: false,
      shoulders: [
        { x: 0.39, y: 0.48, z: 0 },
        { x: 0.61, y: 0.48, z: 0 }
      ],
      elbows: [
        { x: 0.31 + wave * 0.02, y: 0.64, z: 0 },
        { x: 0.69 - wave * 0.02, y: 0.64, z: 0 }
      ],
      wrists: [
        { x: 0.25 + wave * 0.04, y: 0.75 - Math.max(0, wave) * 0.14, z: 0 },
        { x: 0.75 - wave * 0.04, y: 0.75 + Math.min(0, wave) * 0.14, z: 0 }
      ],
      hips: [
        { x: 0.43, y: 0.82, z: 0 },
        { x: 0.57, y: 0.82, z: 0 }
      ]
    },
    raw: null
  };
}

function createFaceState(landmarks, blendshapes) {
  const mirrored = landmarks.map(mirrorPoint);
  const box = bounds(mirrored);
  const center = centerOf(box) ?? mirrored[FACE_CENTER_LANDMARK] ?? { x: 0.5, y: 0.3, z: 0 };
  const eyes = createEyeAnchors(mirrored);
  const size = box ? Math.max(box.width, box.height) : 0.22;

  const smileLeft = shape(blendshapes, "mouthSmileLeft");
  const smileRight = shape(blendshapes, "mouthSmileRight");
  const mouthOpen = weightedAverage([
    [shape(blendshapes, "jawOpen"), 0.75],
    [average(shape(blendshapes, "mouthLowerDownLeft"), shape(blendshapes, "mouthLowerDownRight")), 0.25]
  ]);
  const mouthLowerDown = average(shape(blendshapes, "mouthLowerDownLeft"), shape(blendshapes, "mouthLowerDownRight"));
  const mouthPucker = shape(blendshapes, "mouthPucker");
  const mouthFunnel = shape(blendshapes, "mouthFunnel");
  const browRaise = average(shape(blendshapes, "browOuterUpLeft"), shape(blendshapes, "browOuterUpRight"));
  const browInnerUp = shape(blendshapes, "browInnerUp");
  const browDown = average(shape(blendshapes, "browDownLeft"), shape(blendshapes, "browDownRight"));
  const eyeWide = average(shape(blendshapes, "eyeWideLeft"), shape(blendshapes, "eyeWideRight"));
  const eyeSquint = average(shape(blendshapes, "eyeSquintLeft"), shape(blendshapes, "eyeSquintRight"));
  const noseSneer = average(shape(blendshapes, "noseSneerLeft"), shape(blendshapes, "noseSneerRight"));
  const mouthStretch = average(shape(blendshapes, "mouthStretchLeft"), shape(blendshapes, "mouthStretchRight"));
  const tongueOut = shape(blendshapes, "tongueOut");
  const frown = frownScore(blendshapes);
  const puckerScore = Math.max(mouthPucker, mouthFunnel);

  return {
    tracked: landmarks.length > 0,
    center,
    bounds: box,
    eyes,
    size,
    rotation: estimateFaceRoll(mirrored),
    expressions: {
      mouthOpen,
      mouthLowerDown,
      mouthFunnel,
      mouthPucker,
      leftEyeClosed: eyeClosedScore(blendshapes, "Left"),
      rightEyeClosed: eyeClosedScore(blendshapes, "Right"),
      smile: average(maxShape(blendshapes, ["mouthSmileLeft"]), maxShape(blendshapes, ["mouthSmileRight"])),
      frown,
      surprise: clamp01(mouthOpen * 0.45 + eyeWide * 0.35 + Math.max(browRaise, browInnerUp) * 0.2),
      angry: clamp01(browDown * 0.5 + frown * 0.25 + eyeSquint * 0.2 + noseSneer * 0.05),
      disgust: clamp01(noseSneer * 0.5 + frown * 0.2 + mouthStretch * 0.15 + browDown * 0.15),
      fear: clamp01(eyeWide * 0.35 + browInnerUp * 0.3 + mouthStretch * 0.2 + mouthOpen * 0.15),
      suspicious: clamp01(eyeSquint * 0.55 + browDown * 0.25 + puckerScore * 0.2),
      smirkLeft: clamp01(smileLeft - smileRight * 0.45),
      smirkRight: clamp01(smileRight - smileLeft * 0.45),
      thinking: clamp01(puckerScore * 0.42 + browInnerUp * 0.22 + eyeSquint * 0.18 + mouthStretch * 0.18),
      tongueOut,
      browRaise,
      browDown,
      browInnerUp,
      eyeWide,
      eyeSquint,
      noseSneer,
      mouthStretch
    }
  };
}

function createEyeAnchors(points) {
  const left = averagePoints(LEFT_EYE_LANDMARKS.map((index) => points[index]).filter(Boolean));
  const right = averagePoints(RIGHT_EYE_LANDMARKS.map((index) => points[index]).filter(Boolean));
  if (!left || !right) {
    return null;
  }

  return {
    left,
    right,
    center: averagePoints([left, right]),
    distance: distance(left, right)
  };
}

function createHandsState(handsResult) {
  const landmarks = handsResult?.landmarks ?? [];
  const handednesses = handsResult?.handednesses ?? [];

  return landmarks.map((hand, index) => ({
    label: handednesses[index]?.[0]?.categoryName ?? `Hand ${index + 1}`,
    landmarks: hand.map(mirrorPoint)
  }));
}

function createBodyState(landmarks) {
  const mirrored = landmarks.map(mirrorPoint);

  return {
    tracked: landmarks.length > 0,
    shoulders: [mirrored[LEFT_SHOULDER], mirrored[RIGHT_SHOULDER]].filter(Boolean),
    elbows: [mirrored[LEFT_ELBOW], mirrored[RIGHT_ELBOW]].filter(Boolean),
    wrists: [mirrored[LEFT_WRIST], mirrored[RIGHT_WRIST]].filter(Boolean),
    hips: [mirrored[LEFT_HIP], mirrored[RIGHT_HIP]].filter(Boolean)
  };
}

function demoHand(label, x, y) {
  const landmarks = [];
  const spread = label === "Left" ? -1 : 1;

  landmarks.push({ x, y, z: 0 });
  for (let finger = 0; finger < 5; finger += 1) {
    const angle = -0.9 + finger * 0.45;
    for (let joint = 1; joint <= 4; joint += 1) {
      landmarks.push({
        x: x + Math.cos(angle) * 0.018 * joint * spread,
        y: y - Math.sin(angle) * 0.018 * joint - 0.015 * joint,
        z: 0
      });
    }
  }

  return { label, landmarks };
}

function readBlendshapes(categories) {
  return Object.fromEntries(categories.map((item) => [item.categoryName, item.score]));
}

function shape(blendshapes, name) {
  return clamp01(blendshapes[name] ?? 0);
}

function maxShape(blendshapes, names) {
  return Math.max(...names.map((name) => shape(blendshapes, name)));
}

function average(a, b) {
  return (a + b) / 2;
}

function averagePoints(points) {
  if (!points.length) {
    return null;
  }

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    z: points.reduce((sum, point) => sum + (point.z ?? 0), 0) / points.length
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function weightedAverage(items) {
  const totalWeight = items.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  return clamp01(items.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight);
}

function eyeClosedScore(blendshapes, side) {
  const blink = shape(blendshapes, `eyeBlink${side}`);
  const wide = shape(blendshapes, `eyeWide${side}`);
  const squint = shape(blendshapes, `eyeSquint${side}`);
  return clamp01(blink - wide * 0.35 - squint * 0.15);
}

function frownScore(blendshapes) {
  const cornersDown = average(shape(blendshapes, "mouthFrownLeft"), shape(blendshapes, "mouthFrownRight"));
  const mouthPress = average(shape(blendshapes, "mouthPressLeft"), shape(blendshapes, "mouthPressRight"));
  const lowerShrug = shape(blendshapes, "mouthShrugLower");
  const smile = average(shape(blendshapes, "mouthSmileLeft"), shape(blendshapes, "mouthSmileRight"));
  return clamp01(cornersDown * 0.8 + mouthPress * 0.1 + lowerShrug * 0.15 - smile * 0.2);
}

function mirrorPoint(point) {
  return {
    x: 1 - point.x,
    y: point.y,
    z: point.z ?? 0,
    visibility: point.visibility ?? 1
  };
}

function bounds(points) {
  if (!points.length) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function centerOf(box) {
  if (!box) {
    return null;
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    z: 0
  };
}

function estimateFaceRoll(points) {
  const leftEye = points[33];
  const rightEye = points[263];

  if (!leftEye || !rightEye) {
    return 0;
  }

  return normalizeRoll(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x));
}

function normalizeRoll(angle) {
  let roll = angle;

  while (roll > Math.PI) {
    roll -= Math.PI * 2;
  }

  while (roll < -Math.PI) {
    roll += Math.PI * 2;
  }

  if (roll > Math.PI / 2) {
    roll -= Math.PI;
  }

  if (roll < -Math.PI / 2) {
    roll += Math.PI;
  }

  return roll;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
