import rumiConfig from "../assets/rumi/config.js";
import julietteConfig from "../assets/juliette/config.js";
import juliette2Config from "../assets/juliette2/config.js";
import marisolConfig from "../assets/marisol/config.js";
import kayaConfig from "../assets/kaya/config.js";
import lilyConfig from "../assets/lily/config.js";
import whirlpoolConfig from "../assets/whirlpool/config.js";
import claudiaConfig from "../assets/claudia/config.js";
import amandaConfig from "../assets/amanda/config.js";
import trollConfig from "../assets/troll/config.js";
import kpopConfig from "../assets/kpop/config.js";
import EXTENSION_PHYSICS from "./extensionPhysics.js";

export const DOLL_CONFIGS = {
  rumi: rumiConfig,
  juliette: julietteConfig,
  juliette2: juliette2Config,
  marisol: marisolConfig,
  kaya: kayaConfig,
  lily: lilyConfig,
  whirlpool: whirlpoolConfig,
  claudia: claudiaConfig,
  amanda: amandaConfig,
  troll: trollConfig,
  kpop: kpopConfig
};

export const DOLL_CHARACTERS = Object.fromEntries(
  Object.entries(DOLL_CONFIGS).map(([id, config]) => [id, { id, label: config.label ?? id, debugOnly: Boolean(config.debugOnly) }])
);

function scaleXValue(layout) {
  return Number(layout?.scaleX ?? layout?.scale ?? 1);
}

function scaleYValue(layout) {
  return Number(layout?.scaleY ?? layout?.scale ?? 1);
}

const BODY_POSE_COUNT = 6;
const MOUTH_TALK_OPEN_THRESHOLD = 0.34;
const MOUTH_TALK_CLOSE_THRESHOLD = 0.22;
// Talking overlays should respond quickly to speech; gesture/expression triggers below stay more conservative.
const TALKING_SMALL_OPEN_THRESHOLD = 0.14;
const TALKING_MEDIUM_OPEN_THRESHOLD = 0.31;
const TALKING_BIG_OPEN_THRESHOLD = 0.54;
const TALKING_WIDE_THRESHOLD = 0.38;
const TALKING_TEETH_THRESHOLD = 0.4;
const TALKING_PUCKER_THRESHOLD = 0.36;
const DEFAULT_MOUTH_POSE_CHANGE_THRESHOLD = 0.74;
const DEFAULT_MOUTH_POSE_CHANGE_HELD_THRESHOLD = 0.54;
const DEFAULT_MOUTH_POSE_CHANGE_RELEASE_THRESHOLD = 0.56;
const DEFAULT_MOUTH_POSE_CHANGE_HOLD_MS = 900;
const DEFAULT_POSE_CHANGE_COOLDOWN_MS = 520;
const DEFAULT_HAND_RAISE_SAMPLE_INTERVAL_MS = 250;
const DEFAULT_HAND_RAISE_ENTER_Y = 0.38;
const DEFAULT_HAND_RAISE_EXIT_Y = 0.48;
const DEFAULT_HAND_RAISE_FACE_OFFSET = 0.08;
const DEFAULT_HAND_RAISE_RELEASE_FACE_OFFSET = 0.24;
const DEFAULT_HAND_TRACKING_SAMPLE_INTERVAL_MS = 90;
const DEFAULT_HAND_TRACKING_IDLE_MS = 15000;
const DEFAULT_HAND_RAISE_FACE_LEVEL = 0.52;
const DEFAULT_HAND_RAISE_RELEASE_FACE_LEVEL = 0.82;
const DEFAULT_HAND_MIDDLE_FACE_OFFSET = 0.9;
const DEFAULT_HAND_MIDDLE_RELEASE_FACE_OFFSET = 1.15;
const EYE_CLOSED_THRESHOLD = 0.62;
const RIGHT_EYE_CLOSED_THRESHOLD = 0.54;
const SMILE_THRESHOLD = 0.5;
const FROWN_THRESHOLD = 0.18;
const FROWN_HELD_THRESHOLD = 0.1;
const FROWN_RELEASE_THRESHOLD = 0.07;
const FROWN_HOLD_MS = 760;
const PUCKER_THRESHOLD = 0.5;
const PUCKER_RELEASE_THRESHOLD = 0.34;
const PUCKER_HELD_THRESHOLD = 0.3;
const PUCKER_HOLD_MS = 620;
const BIG_OPEN_THRESHOLD = 0.78;
const SURPRISE_THRESHOLD = 0.58;
const ANGRY_THRESHOLD = 0.43;
const DISGUST_THRESHOLD = 0.44;
const FEAR_THRESHOLD = 0.56;
const SQUINT_THRESHOLD = 0.55;
const SMIRK_THRESHOLD = 0.34;
const THINKING_THRESHOLD = 0.56;
const TONGUE_OUT_THRESHOLD = 0.55;
const TONGUE_OUT_RELEASE_THRESHOLD = 0.32;
const TONGUE_OUT_HOLD_MS = 700;
const TONGUE_COLOR_MIN_MOUTH_OPEN = 0.2;
const TONGUE_COLOR_MIN_LOWER_DOWN = 0.45;
const TONGUE_COLOR_MAX_PUCKER = 0.24;
const TONGUE_COLOR_MAX_SMILE = 0.2;
const TONGUE_COLOR_MAX_DARK_RATIO = 0.08;
const TONGUE_COLOR_MIN_RATIO = 0.12;
const TONGUE_COLOR_TARGET_RATIO = 0.32;
const TONGUE_COLOR_SAMPLE_WIDTH = 48;
const TONGUE_COLOR_SAMPLE_HEIGHT = 36;
const LAUGH_SMILE_THRESHOLD = 0.48;
const LAUGH_OPEN_THRESHOLD = 0.34;
const LAUGH_WIDE_THRESHOLD = 0.34;
const LAUGH_RELEASE_SMILE_THRESHOLD = 0.36;
const LAUGH_RELEASE_OPEN_THRESHOLD = 0.22;
const LAUGH_HOLD_MS = 160;
const KISS_PUCKER_THRESHOLD = 0.62;
const KISS_RELEASE_THRESHOLD = 0.26;
const KISS_PARTICLE_HOLD_MS = 500;
const KISS_PARTICLE_FAST_OPEN_HOLD_MS = 650;
const KISS_PARTICLE_FAST_OPEN_THRESHOLD = 0.58;
const KISS_MAX_MOUTH_OPEN = 0.22;
const KISS_MAX_LOWER_DOWN = 0.18;
const KISS_MAX_SMILE = 0.18;
const KISS_MAX_STRETCH = 0.18;
const KISS_MIN_PUCKER_DOMINANCE = 0.26;
const KISS_BUBBLE_HOLD_MS = 1000;
const KISS_COOLDOWN_MS = 900;
const KISS_HAND_NEAR_FACE_SIZE = 0.72;
const KISS_HAND_AWAY_FACE_SIZE = 1.02;
const KISS_PARTICLE_SPREAD = 1.6;
const KISS_BUBBLE_TARGET_HEAD_SIZE = 0.5;
const KISS_BUBBLE_SLOW_GROWTH_PER_SECOND = 0.045;
const KISS_BUBBLE_POP_MOUTH_MS = 500;
const HAND_POSE_ACTION_HOLD_MS = 1000;
const HAND_POSE_HEART_START_HEAD_SIZE = 0.33;
const HAND_POSE_HEART_END_HEAD_SIZE = 1;
const HAND_POSE_HEART_DURATION_MS = 1000;
const HAND_POSE_ENERGY_GROW_MS = 10000;
const HAND_POSE_ENERGY_DELAY_MS = 1000;
const HAND_POSE_ENERGY_FADE_IN_MS = 1000;
const HAND_POSE_ENERGY_MAX_HEAD_SIZE = 0.3;
const HAND_POSE_ENERGY_START_HEAD_SIZE = 0.035;
const HAND_POSE_ENERGY_EXPLOSION_MS = 950;
const HAND_POSE_ENERGY_FIREWORK_MS = 1900;
const HAND_POSE_ENERGY_FIREWORK_MIN_PARTICLES = 18;
const HAND_POSE_ENERGY_FIREWORK_MAX_PARTICLES = 62;
const HAND_POSE_ENERGY_FIREWORK_MIN_FRAGMENTS = 3;
const HAND_POSE_ENERGY_FIREWORK_MAX_FRAGMENTS = 6;
const TALKING_EXPRESSION_HOLD_MS = 280;
const TALKING_EXPRESSION_OPEN_THRESHOLD = 0.2;
const TALKING_EXPRESSION_PUCKER_THRESHOLD = 0.38;
const GAME_HEAD_TARGET_Y = 0.3;
const GAME_HEAD_LOWEST_Y = 0.5;
const GAME_FULL_BODY_OVERSCAN = 1.02;
const DEFAULT_TALKING_MASK_FEATHER = 0.035;

const KISS_EFFECT_SPRITES = {
  kiss_heart: { file: "assets/effects/kiss_heart.webp" },
  kiss_bubble: { file: "assets/effects/kiss_bubble.webp" },
  kiss_butterfly_open: { file: "assets/effects/kiss_butterfly_open.webp" },
  kiss_butterfly_closed: { file: "assets/effects/kiss_butterfly_closed.webp" },
  kiss_moth_open: { file: "assets/effects/kiss_moth_open.webp", optional: true },
  kiss_moth_closed: { file: "assets/effects/kiss_moth_closed.webp", optional: true },
  pose_oil_spill: { file: "assets/effects/oil_spill.webp" }
};

export function renderDollsEffect(options = {}) {
  const runtime = {
    ready: false,
    error: null,
    config: null,
    gameConfig: options.gameConfig ?? {},
    characterId: null,
    images: {},
    pose: 5,
    restingPose: 5,
    poseFlipX: false,
    handTrackingModeActive: false,
    lastHandGestureAt: -Infinity,
    handLockedPose: null,
    handLockedFlipX: false,
    activeHandTrackingTag: null,
    mouthWasVeryOpen: false,
    mouthPoseStartedAt: null,
    handRaiseActive: false,
    lastHandRaiseCheckAt: -Infinity,
    lastPoseChangeAt: 0,
    activeMouth: "mouth_closed",
    activeTalking: null,
    expressionHoldStartedAt: {},
    laughStartedAt: null,
    tongueOutStartedAt: null,
    tongueOutColorScore: 0,
    tongueOutColorRatio: 0,
    tongueOutDarkRatio: 0,
    tongueOutColorReason: "not-sampled",
    tongueOutColorCrop: null,
    tongueOutSampleCanvas: null,
    tongueOutSampleContext: null,
    kissStartedAt: null,
    kissArmed: false,
    kissLastPuckerAt: -Infinity,
    kissLastTriggerAt: -Infinity,
    kissHandNearMouth: null,
    kissBubbleParticle: null,
    kissParticles: [],
    kissNoteLastEmitAt: -Infinity,
    kissNoteDirection: null,
    kissNoteDirectionStartedAt: -Infinity,
    kissNoteSequence: 0,
    kissNoteReleasedAt: null,
    bubbleWideMouthUntil: 0,
    poseActionStartedAt: null,
    poseActionFired: false,
    poseEnergy: null,
    poseEnergyLastSparkAt: -Infinity,
    poseOilSpill: null,
    poseOilLastDripAt: -Infinity,
    poseActionEffects: [],
    frownStartedAt: null,
    puckerStartedAt: null,
    extensionPhysicsStates: {}
  };

  loadDoll(runtime, options.character ?? "rumi");

  return {
    render(ctx, state, viewport) {
      if (runtime.error) {
        drawMessage(ctx, viewport, runtime.error);
        return;
      }

      if (!runtime.ready) {
        drawMessage(ctx, viewport, "loading dolls");
        return;
      }

      renderDoll(ctx, runtime, state, viewport);
    },

    getDebugState() {
      return {
        ready: runtime.ready,
        error: runtime.error,
        characterId: runtime.characterId,
        activeMouth: runtime.activeMouth,
        activeTalking: runtime.activeTalking,
        pose: runtime.pose,
        restingPose: runtime.restingPose,
        handTrackingModeActive: runtime.handTrackingModeActive,
        gameConfig: runtime.gameConfig,
        tongueOut: {
          blendshapeScore: runtime.lastTongueBlendshapeScore ?? 0,
          combinedScore: runtime.lastTongueCombinedScore ?? 0,
          colorScore: runtime.tongueOutColorScore,
          colorRatio: runtime.tongueOutColorRatio,
          darkRatio: runtime.tongueOutDarkRatio,
          colorReason: runtime.tongueOutColorReason,
          colorCrop: runtime.tongueOutColorCrop,
          startedAt: runtime.tongueOutStartedAt,
          threshold: runtime.gameConfig?.tongue_out_threshold ?? TONGUE_OUT_THRESHOLD,
          releaseThreshold: runtime.gameConfig?.tongue_out_release_threshold ?? TONGUE_OUT_RELEASE_THRESHOLD,
          holdMs: runtime.gameConfig?.tongue_out_hold_ms ?? TONGUE_OUT_HOLD_MS,
          colorMinMouthOpen: runtime.gameConfig?.tongue_color_min_mouth_open ?? TONGUE_COLOR_MIN_MOUTH_OPEN,
          colorMinLowerDown: runtime.gameConfig?.tongue_color_min_lower_down ?? TONGUE_COLOR_MIN_LOWER_DOWN,
          colorMaxPucker: runtime.gameConfig?.tongue_color_max_pucker ?? TONGUE_COLOR_MAX_PUCKER,
          colorMaxSmile: runtime.gameConfig?.tongue_color_max_smile ?? TONGUE_COLOR_MAX_SMILE,
          colorMaxDarkRatio: runtime.gameConfig?.tongue_color_max_dark_ratio ?? TONGUE_COLOR_MAX_DARK_RATIO,
          colorMinRatio: runtime.gameConfig?.tongue_color_min_ratio ?? TONGUE_COLOR_MIN_RATIO,
          colorTargetRatio: runtime.gameConfig?.tongue_color_target_ratio ?? TONGUE_COLOR_TARGET_RATIO,
          heldMs: runtime.tongueOutStartedAt === null ? 0 : Math.max(0, (runtime.lastViewport?.now ?? 0) - runtime.tongueOutStartedAt),
          sampleImagePng: runtime.tongueOutSampleCanvas ? runtime.tongueOutSampleCanvas.toDataURL("image/png") : null
        }
      };
    },

    setCharacter(characterId) {
      if (characterId === runtime.characterId) {
        return;
      }
      runtime.ready = false;
      runtime.error = null;
      loadDoll(runtime, characterId);
    },

    dispose() {}
  };
}

async function loadDoll(runtime, characterId) {
  try {
    const sourceConfig = DOLL_CONFIGS[characterId] ?? DOLL_CONFIGS.rumi;
    const config = structuredClone(sourceConfig);
    const images = {};
    const entries = [
      ...Object.entries(config.sprites.faces),
      ...Object.entries(config.sprites.talking ?? {}),
      ...Object.entries(config.sprites.extensions ?? {}),
      ...Object.entries(config.sprites.body),
      ...Object.entries(KISS_EFFECT_SPRITES)
    ];

    await Promise.all(
      entries.map(async ([name, sprite]) => {
        try {
          images[name] = await loadImage(new URL(`../${sprite.file}`, import.meta.url).href);
        } catch (error) {
          if (!sprite.optional) {
            throw error;
          }
        }
      })
    );

    runtime.config = config;
    runtime.characterId = config.name;
    runtime.images = images;
    runtime.pose = config.layout.body.startPose ?? 5;
    runtime.restingPose = runtime.pose;
    runtime.poseFlipX = false;
    runtime.handTrackingModeActive = false;
    runtime.lastHandGestureAt = -Infinity;
    runtime.handLockedPose = null;
    runtime.handLockedFlipX = false;
    runtime.activeHandTrackingTag = null;
    runtime.expressionHoldStartedAt = {};
    runtime.laughStartedAt = null;
    runtime.tongueOutStartedAt = null;
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = "reset";
    runtime.tongueOutColorCrop = null;
    runtime.kissStartedAt = null;
    runtime.kissArmed = false;
    runtime.kissLastPuckerAt = -Infinity;
    runtime.kissLastTriggerAt = -Infinity;
    runtime.kissHandNearMouth = null;
    runtime.kissBubbleParticle = null;
    runtime.kissParticles = [];
    runtime.kissNoteLastEmitAt = -Infinity;
    runtime.kissNoteDirection = null;
    runtime.kissNoteDirectionStartedAt = -Infinity;
    runtime.kissNoteSequence = 0;
    runtime.kissNoteReleasedAt = null;
    runtime.bubbleWideMouthUntil = 0;
    runtime.poseActionStartedAt = null;
    runtime.poseActionFired = false;
    runtime.poseEnergy = null;
    runtime.poseEnergyLastSparkAt = -Infinity;
    runtime.poseOilSpill = null;
    runtime.poseOilLastDripAt = -Infinity;
    runtime.poseActionEffects = [];
    runtime.extensionPhysicsStates = {};
    runtime.ready = true;
  } catch (error) {
    console.error(error);
    runtime.error = "dolls failed to load";
  }
}

function renderDoll(ctx, runtime, state, viewport) {
  const { config, images } = runtime;
  const { width, height, now } = viewport;
  runtime.lastViewport = viewport;
  const face = state.face;
  const expressions = face.expressions;

  updateBodyPoseGesture(runtime, state, now, viewport);
  updateTongueColorDetection(runtime, state, viewport, expressions);

  const faceName = pickMouthSprite(runtime, expressions, now);
  const faceSprite = images[faceName];
  const faceSpriteMeta = config.sprites.faces[faceName];
  const geometry =
    viewport.stage === "dolls-game"
      ? createGameGeometry(runtime, faceSprite, face, viewport)
      : viewport.stage === "dolls-ar"
        ? createArGeometry(runtime, faceSprite, face, viewport)
        : createTrackingGeometry(runtime, faceSprite, face, viewport);
  const { headWidth, headRect, faceCenter, worldNeck } = geometry;
  updateKissGesture(runtime, state, viewport, geometry, now);
  const bodyBounds = calculateBodyBounds(runtime, worldNeck, headWidth);
  updatePoseActionEffects(runtime, bodyBounds, headWidth, now);

  ctx.save();
  ctx.translate(faceCenter.x, faceCenter.y);
  ctx.rotate(face.rotation);
  drawExtensions(ctx, runtime, headRect, face, faceCenter, now);
  ctx.restore();

  drawBody(ctx, runtime, worldNeck, headWidth, "full");

  ctx.save();
  ctx.translate(faceCenter.x, faceCenter.y);
  ctx.rotate(face.rotation);
  const headMaskBasisRect = headMaskBasisDisplayRect(config, headRect, faceName);
  drawMouth(ctx, faceSprite, config.layout.mouth?.[faceName], headRect, activeHeadMask(config, faceName), headMaskBasisRect);
  const talkingName = pickTalkingSprite(runtime, expressions, now);
  if (talkingName) {
    drawMouth(ctx, images[talkingName], config.layout.talking?.[talkingName], headRect);
  }
  drawEyesAndBrows(ctx, runtime, expressions, headRect, now, faceSpriteMeta);
  ctx.restore();

  if (activeBodyMask(config, runtime.pose)) {
    drawBody(ctx, runtime, worldNeck, headWidth, "front");
  }
  drawKissParticles(ctx, runtime, viewport, now);
  drawPoseActionEffects(ctx, runtime, now);
}

function createTrackingGeometry(runtime, faceSprite, face, viewport) {
  const { config } = runtime;
  const { width, height } = viewport;
  const headWidth = clamp(
    face.size * Math.min(width, height) * config.layout.head.trackingScale,
    config.layout.head.minWidth,
    config.layout.head.maxWidth
  );
  return createDollGeometry(runtime, faceSprite, face, headWidth, {
    x: face.center.x * width,
    y: face.center.y * height
  });
}

function createArGeometry(runtime, faceSprite, face, viewport) {
  const { config } = runtime;
  const cover = videoCoverTransform(viewport);
  const eyeFit = arEyeFit(config, faceSprite, face, cover);
  const fallbackFit = arFaceBoundsFit(config, face, cover);
  const target = eyeFit?.target ?? fallbackFit.target;
  const maxHeadWidth = Math.max(config.layout.head.maxWidth, Math.min(viewport.width, viewport.height) * 1.4);
  const headWidth = clamp(eyeFit?.headWidth ?? fallbackFit.headWidth, config.layout.head.minWidth, maxHeadWidth);
  const headHeight = headWidth * (faceSprite.naturalHeight / faceSprite.naturalWidth);
  const localAnchor = eyeFit?.localAnchor ?? { x: 0.5 * headWidth, y: 0.5 * headHeight };
  const anchorOffset = rotatePoint({
    x: localAnchor.x - config.layout.head.pivot.x * headWidth,
    y: localAnchor.y - config.layout.head.pivot.y * headHeight
  }, face.rotation);

  return createDollGeometry(runtime, faceSprite, face, headWidth, {
    x: target.x - anchorOffset.x,
    y: target.y - anchorOffset.y
  });
}

function arEyeFit(config, faceSprite, face, cover) {
  if (!face.eyes?.center || !face.eyes.distance) {
    return null;
  }

  const leftEye = config.layout.parts.leftEye;
  const rightEye = config.layout.parts.rightEye;
  if (!leftEye || !rightEye) {
    return null;
  }

  const headAspect = faceSprite.naturalHeight / faceSprite.naturalWidth;
  const dollEyeDistanceRatio = Math.hypot(rightEye.x - leftEye.x, (rightEye.y - leftEye.y) * headAspect);
  if (dollEyeDistanceRatio <= 0) {
    return null;
  }

  const leftTarget = normalizedVideoPointToViewport(face.eyes.left, cover);
  const rightTarget = normalizedVideoPointToViewport(face.eyes.right, cover);
  const target = {
    x: (leftTarget.x + rightTarget.x) / 2,
    y: (leftTarget.y + rightTarget.y) / 2
  };
  const targetEyeDistance = Math.hypot(rightTarget.x - leftTarget.x, rightTarget.y - leftTarget.y);
  const headWidth = targetEyeDistance / dollEyeDistanceRatio;
  const headHeight = headWidth * headAspect;
  return {
    target,
    headWidth,
    localAnchor: {
      x: ((leftEye.x + rightEye.x) / 2) * headWidth,
      y: ((leftEye.y + rightEye.y) / 2) * headHeight
    }
  };
}

function arFaceBoundsFit(config, face, cover) {
  const faceBounds = face.bounds ?? {
    x: face.center.x - face.size / 2,
    y: face.center.y - face.size / 2,
    width: face.size,
    height: face.size
  };
  const target = normalizedVideoPointToViewport(
    {
      x: faceBounds.x + faceBounds.width / 2,
      y: faceBounds.y + faceBounds.height / 2
    },
    cover
  );
  const facePixelSize = Math.max(faceBounds.width * cover.sourceWidth, faceBounds.height * cover.sourceHeight) * cover.scale;
  return {
    target,
    headWidth: facePixelSize * config.layout.head.trackingScale
  };
}

function videoCoverTransform(viewport) {
  const sourceWidth = viewport.sourceWidth || viewport.width;
  const sourceHeight = viewport.sourceHeight || viewport.height;
  const scale = Math.max(viewport.width / sourceWidth, viewport.height / sourceHeight);
  return {
    sourceWidth,
    sourceHeight,
    scale,
    offsetX: (viewport.width - sourceWidth * scale) / 2,
    offsetY: (viewport.height - sourceHeight * scale) / 2
  };
}

function normalizedVideoPointToViewport(point, cover) {
  return {
    x: point.x * cover.sourceWidth * cover.scale + cover.offsetX,
    y: point.y * cover.sourceHeight * cover.scale + cover.offsetY
  };
}

function createGameGeometry(runtime, faceSprite, face, viewport) {
  const { height, width } = viewport;
  const initialHeadWidth = 100;
  const initialGeometry = createStableGameFitGeometry(runtime, faceSprite, face, initialHeadWidth);
  const fitSpanRatio = initialGeometry.fitSpan / initialHeadWidth;
  const headWidth = (height * GAME_FULL_BODY_OVERSCAN) / fitSpanRatio;
  const geometryAtOrigin = createStableGameFitGeometry(runtime, faceSprite, face, headWidth);
  const topLockedHeadY = -geometryAtOrigin.headTop;
  const trackedHeadY = height * (GAME_HEAD_TARGET_Y + (face.center.y - GAME_HEAD_TARGET_Y) * 0.55);
  const faceCenter = {
    x: face.center.x * width,
    y: clamp(trackedHeadY, topLockedHeadY, height * GAME_HEAD_LOWEST_Y)
  };

  return createDollGeometry(runtime, faceSprite, face, headWidth, faceCenter);
}

function createStableGameFitGeometry(runtime, faceSprite, face, headWidth) {
  const geometry = createDollGeometry(runtime, faceSprite, face, headWidth, { x: 0, y: 0 }, 0);
  const maxBodyBottom = calculateMaxBodyBottom(runtime, geometry.worldNeck, headWidth);
  return {
    ...geometry,
    fitSpan: maxBodyBottom - geometry.headTop
  };
}

function createDollGeometry(runtime, faceSprite, face, headWidth, faceCenter, neckRotation = face.rotation) {
  const { config } = runtime;
  const headHeight = headWidth * (faceSprite.naturalHeight / faceSprite.naturalWidth);
  const headPivot = config.layout.head.pivot;
  const headBodyPivot = config.layout.head.bodyPivot ?? config.layout.head.neck;
  const headRect = {
    x: -headPivot.x * headWidth,
    y: -headPivot.y * headHeight,
    width: headWidth,
    height: headHeight
  };
  const neckPoint = rotatePoint(
    {
      x: headRect.x + headBodyPivot.x * headWidth,
      y: headRect.y + headBodyPivot.y * headHeight
    },
    neckRotation
  );
  const worldNeck = {
    x: faceCenter.x + neckPoint.x,
    y: faceCenter.y + neckPoint.y
  };
  const bodyBounds = calculateBodyBounds(runtime, worldNeck, headWidth);

  return {
    faceCenter,
    headWidth,
    headRect,
    worldNeck,
    headTop: faceCenter.y + headRect.y,
    bodyBottom: bodyBounds.y + bodyBounds.height
  };
}

function drawMouth(ctx, image, mouthLayout, headRect, headMask = null, headMaskBasisRect = null) {
  const layout = mouthLayout ?? { x: 0, y: 0, scale: 1, rotation: 0 };
  const displayRect = mouthDisplayRect(layout, headRect);
  const { x, y, width, height } = displayRect;
  const activeMask = headMask?.enabled
    ? projectMaskToDisplayRect(headMask, headMaskBasisRect ?? displayRect, displayRect)
    : layout.mask;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate(layout.rotation);
  if (layout.flipX) {
    ctx.scale(-1, 1);
  }
  if (activeMask) {
    drawFeatheredMaskedImage(ctx, image, width, height, activeMask, activeMask.feather ?? layout.maskFeather ?? DEFAULT_TALKING_MASK_FEATHER);
  } else {
    drawImageRect(ctx, image, {
      x: -width / 2,
      y: -height / 2,
      width,
      height
    });
  }
  ctx.restore();
}

function headMaskBasisDisplayRect(config, headRect, headName) {
  const layout = config.layout.headMaskMode === "perHead"
    ? config.layout.mouth?.[headName] ?? config.layout.mouth?.reference ?? config.layout.mouth?.mouth_closed
    : config.layout.mouth?.reference ?? config.layout.mouth?.mouth_closed ?? config.layout.mouth?.[headName];
  return mouthDisplayRect(layout, headRect);
}

function activeHeadMask(config, headName) {
  const globalMask = config.layout.headMask;
  const mode = config.layout.headMaskMode ?? (globalMask?.enabled ? "global" : "none");
  if (mode === "none" || !globalMask) {
    return null;
  }
  if (mode === "perHead") {
    return config.layout.headMaskHeads?.[headName] ?? globalMask;
  }
  return globalMask;
}

function projectMaskToDisplayRect(mask, basisRect, displayRect) {
  return {
    ...mask,
    x: (basisRect.x + mask.x * basisRect.width - displayRect.x) / displayRect.width,
    y: (basisRect.y + mask.y * basisRect.height - displayRect.y) / displayRect.height,
    width: (mask.width * basisRect.width) / displayRect.width,
    height: (mask.height * basisRect.height) / displayRect.height
  };
}

function updateKissGesture(runtime, state, viewport, geometry, now) {
  const config = runtime.config.interactions?.kiss ?? {};
  const sprite = config.sprite ?? config.effect ?? "hearts";
  if (runtime.gameConfig?.enable_kiss_gesture === false || sprite === "none") {
    resetKissGesture(runtime);
    runtime.kissBubbleParticle = null;
    runtime.kissParticles = runtime.kissParticles.filter((particle) => particle.kind !== "bubble");
    return;
  }

  const expressions = state.face.expressions;
  const pucker = kissPuckerScore(expressions);
  const puckered = isKissPucker(runtime, expressions, config);
  const origin = kissOrigin(runtime, geometry, state.face.rotation);
  const normalizedMouth = kissNormalizedMouthPoint(state.face);
  const nearHand = nearestHandNearMouth(state, normalizedMouth, config);

  if (puckered) {
    runtime.kissStartedAt ??= now;
    runtime.kissLastPuckerAt = now;
    runtime.kissNoteReleasedAt = null;
    if (nearHand) {
      runtime.kissHandNearMouth = nearHand;
    }
  }

  const heldMs = runtime.kissStartedAt === null ? 0 : now - runtime.kissStartedAt;
  const bubbleKiss = isBubbleKiss(sprite);
  const noteKiss = isNoteKiss(sprite);
  if (puckered && heldMs >= kissHoldMs(runtime, config, bubbleKiss)) {
    runtime.kissArmed = true;
  }

  const releasedInWindow = !puckered && now - runtime.kissLastPuckerAt < (config.releaseWindowMs ?? 320);
  const fastWideOpenRelease =
    !bubbleKiss &&
    releasedInWindow &&
    heldMs >= kissParticleFastOpenHoldMs(runtime, config) &&
    expressions.mouthOpen > (config.fastOpenThreshold ?? runtime.gameConfig?.kiss_particle_fast_open_threshold ?? KISS_PARTICLE_FAST_OPEN_THRESHOLD);
  const releasedIntoSmile =
    (runtime.kissArmed || fastWideOpenRelease) &&
    releasedInWindow &&
    (expressions.smile > (config.releaseSmileThreshold ?? 0.34) || expressions.mouthOpen > (config.releaseOpenThreshold ?? 0.26));
  const handAway =
    runtime.kissArmed &&
    runtime.kissHandNearMouth &&
    handMovedAwayFromMouth(state, normalizedMouth, runtime.kissHandNearMouth, config);
  if (bubbleKiss && runtime.kissArmed && puckered) {
    updateHeldBubbleKiss(runtime, origin, geometry.headWidth, config, now);
  } else if (noteKiss && runtime.kissArmed && puckered) {
    updateHeldNoteKiss(runtime, origin, geometry.headWidth, viewport, config, now);
  } else if (noteKiss && !puckered && runtime.kissStartedAt !== null && runtime.kissNoteReleasedAt === null) {
    releaseHeldNoteKiss(runtime, config, now);
  }

  if (
    !bubbleKiss &&
    !noteKiss &&
    (releasedIntoSmile || handAway) &&
    now - runtime.kissLastTriggerAt > (config.cooldownMs ?? KISS_COOLDOWN_MS)
  ) {
    triggerKissParticles(runtime, sprite, origin, geometry.headWidth, viewport, now);
    runtime.kissLastTriggerAt = now;
    resetKissGesture(runtime);
  } else if (bubbleKiss && runtime.kissBubbleParticle && !puckered) {
    popHeldBubbleKiss(runtime, now);
    runtime.kissLastTriggerAt = now;
    resetKissGesture(runtime);
  } else if (!puckered && now - runtime.kissLastPuckerAt > (config.resetMs ?? 520)) {
    resetKissGesture(runtime);
  }

  runtime.kissParticles = runtime.kissParticles.filter((particle) => {
    if (particle.kind === "bubble" && particle.phase === "holding") {
      return true;
    }
    if (particle.kind === "note" && particle.releaseStartedAt !== undefined) {
      return now - particle.releaseStartedAt < particle.releaseFadeMs;
    }
    return now - particle.startedAt < particle.duration;
  });
}

function resetKissGesture(runtime) {
  runtime.kissStartedAt = null;
  runtime.kissArmed = false;
  runtime.kissHandNearMouth = null;
}

function kissPuckerScore(expressions) {
  return Math.max(expressions.mouthPucker ?? 0, expressions.mouthFunnel ?? 0);
}

function isKissPucker(runtime, expressions, config = {}) {
  const pucker = kissPuckerScore(expressions);
  const speechMotion = Math.max(
    expressions.mouthOpen ?? 0,
    expressions.mouthLowerDown ?? 0,
    expressions.mouthStretch ?? 0,
    expressions.smile ?? 0
  );

  return (
    pucker > (config.puckerThreshold ?? runtime.gameConfig?.kiss_pucker_threshold ?? KISS_PUCKER_THRESHOLD) &&
    expressions.mouthOpen < (config.maxMouthOpen ?? runtime.gameConfig?.kiss_max_mouth_open ?? KISS_MAX_MOUTH_OPEN) &&
    (expressions.mouthLowerDown ?? 0) <
      (config.maxLowerDown ?? runtime.gameConfig?.kiss_max_lower_down ?? KISS_MAX_LOWER_DOWN) &&
    expressions.smile < (config.maxSmile ?? runtime.gameConfig?.kiss_max_smile ?? KISS_MAX_SMILE) &&
    (expressions.mouthStretch ?? 0) < (config.maxStretch ?? runtime.gameConfig?.kiss_max_stretch ?? KISS_MAX_STRETCH) &&
    expressions.frown < (config.maxFrown ?? 0.22) &&
    pucker - speechMotion >
      (config.minPuckerDominance ?? runtime.gameConfig?.kiss_min_pucker_dominance ?? KISS_MIN_PUCKER_DOMINANCE)
  );
}

function kissHoldMs(runtime, config = {}, bubbleKiss = false) {
  if (config.holdMs !== undefined) {
    return config.holdMs;
  }
  if (bubbleKiss) {
    return runtime.gameConfig?.kiss_bubble_hold_ms ?? runtime.gameConfig?.kiss_hold_ms ?? KISS_BUBBLE_HOLD_MS;
  }
  return runtime.gameConfig?.kiss_particle_hold_ms ?? runtime.gameConfig?.kiss_hold_ms ?? KISS_PARTICLE_HOLD_MS;
}

function kissParticleFastOpenHoldMs(runtime, config = {}) {
  return config.fastOpenHoldMs ?? runtime.gameConfig?.kiss_particle_fast_open_hold_ms ?? KISS_PARTICLE_FAST_OPEN_HOLD_MS;
}

function isBubbleKiss(sprite) {
  return sprite === "bubble" || sprite === "bubble_gum";
}

function isNoteKiss(sprite) {
  return sprite === "notes" || sprite === "music_notes" || sprite === "whistle";
}

function kissOrigin(runtime, geometry, rotation) {
  const { config } = runtime;
  const kissConfig = config.interactions?.kiss ?? {};
  const explicitOrigin = config.name === "troll" ? kissConfig.origin : null;
  if (explicitOrigin) {
    return kissOriginFromHeadPoint(explicitOrigin, geometry, rotation);
  }

  const puckerLayout = config.layout.talking?.talking_mouth_pucker;
  if (puckerLayout?.mask) {
    const displayRect = mouthDisplayRect(puckerLayout, geometry.headRect);
    const mask = puckerLayout.mask;
    const local = {
      x: displayRect.x + (mask.x + mask.width / 2) * displayRect.width,
      y: displayRect.y + (mask.y + mask.height / 2) * displayRect.height
    };
    const rotated = rotatePoint(local, rotation);
    return {
      x: geometry.faceCenter.x + rotated.x,
      y: geometry.faceCenter.y + rotated.y
    };
  }

  const fallback = kissConfig.origin ?? { x: 0.5, y: 0.69 };
  return kissOriginFromHeadPoint(fallback, geometry, rotation);
}

function kissOriginFromHeadPoint(origin, geometry, rotation) {
  const local = {
    x: geometry.headRect.x + origin.x * geometry.headRect.width,
    y: geometry.headRect.y + origin.y * geometry.headRect.height
  };
  const rotated = rotatePoint(local, rotation);
  return {
    x: geometry.faceCenter.x + rotated.x,
    y: geometry.faceCenter.y + rotated.y
  };
}

function mouthDisplayRect(layout, headRect) {
  const mouth = layout ?? { x: 0, y: 0, scale: 1 };
  const width = headRect.width * scaleXValue(mouth);
  const height = headRect.height * scaleYValue(mouth);
  return {
    x: headRect.x + mouth.x * headRect.width + (headRect.width - width) / 2,
    y: headRect.y + mouth.y * headRect.height + (headRect.height - height) / 2,
    width,
    height
  };
}

function kissNormalizedMouthPoint(face) {
  return {
    x: face.center.x,
    y: face.center.y + face.size * 0.22
  };
}

function nearestHandNearMouth(state, mouth, config = {}) {
  if (!state.hands?.length || !state.face?.tracked) {
    return null;
  }

  const maxDistance = state.face.size * (config.handNearFaceSize ?? KISS_HAND_NEAR_FACE_SIZE);
  let closest = null;
  for (const hand of state.hands) {
    const point = hand.landmarks?.[8] ?? hand.landmarks?.[0];
    if (!point) {
      continue;
    }
    const distanceToMouth = distance(point, mouth);
    if (distanceToMouth <= maxDistance && (!closest || distanceToMouth < closest.distance)) {
      closest = {
        label: hand.label,
        x: point.x,
        y: point.y,
        distance: distanceToMouth
      };
    }
  }
  return closest;
}

function handMovedAwayFromMouth(state, mouth, start, config = {}) {
  const maxDistance = state.face.size * (config.handAwayFaceSize ?? KISS_HAND_AWAY_FACE_SIZE);
  const minTravel = state.face.size * (config.handAwayTravelFaceSize ?? 0.34);
  const hand = state.hands?.find((candidate) => candidate.label === start.label) ?? state.hands?.[0];
  const point = hand?.landmarks?.[8] ?? hand?.landmarks?.[0];
  if (!point) {
    return false;
  }
  return distance(point, mouth) > maxDistance && distance(point, start) > minTravel;
}

function updateHeldBubbleKiss(runtime, origin, headWidth, config, now) {
  if (!runtime.kissBubbleParticle || runtime.kissBubbleParticle.phase !== "holding") {
    const particle = createKissParticle("bubble", origin, headWidth, null, now, 0);
    particle.phase = "holding";
    particle.targetHeadSize = config.bubbleTargetHeadSize ?? runtime.gameConfig?.kiss_bubble_target_head_size ?? KISS_BUBBLE_TARGET_HEAD_SIZE;
    particle.slowGrowthPerSecond =
      config.bubbleSlowGrowthPerSecond ??
      runtime.gameConfig?.kiss_bubble_slow_growth_per_second ??
      KISS_BUBBLE_SLOW_GROWTH_PER_SECOND;
    runtime.kissBubbleParticle = particle;
    runtime.kissParticles.push(particle);
  }

  runtime.kissBubbleParticle.x = origin.x;
  runtime.kissBubbleParticle.y = origin.y;
  runtime.kissBubbleParticle.headWidth = headWidth;
}

function updateHeldNoteKiss(runtime, origin, headWidth, viewport, config, now) {
  const switchMs = config.directionSwitchMs ?? 4000;
  if (!runtime.kissNoteDirection || now - runtime.kissNoteDirectionStartedAt > switchMs) {
    const previousDirection = runtime.kissNoteDirection ?? (Math.random() < 0.5 ? -1 : 1);
    runtime.kissNoteDirection = -previousDirection;
    runtime.kissNoteDirectionStartedAt = now;
  }

  const interval = config.emitIntervalMs ?? 210;
  if (now - runtime.kissNoteLastEmitAt < interval) {
    return;
  }

  runtime.kissNoteLastEmitAt = now;
  const spread = kissParticleSpread(runtime);
  runtime.kissParticles.push(
    createKissParticle("note", origin, headWidth, viewport, now, runtime.kissNoteSequence, spread, {
      direction: runtime.kissNoteDirection,
      held: true
    })
  );
  runtime.kissNoteSequence += 1;
}

function releaseHeldNoteKiss(runtime, config, now) {
  const fadeMs = config.releaseFadeMs ?? 2000;
  runtime.kissNoteReleasedAt = now;
  runtime.kissNoteLastEmitAt = -Infinity;
  for (const particle of runtime.kissParticles) {
    if (particle.kind !== "note" || particle.releaseStartedAt !== undefined) {
      continue;
    }
    particle.releaseStartedAt = now;
    particle.releaseFadeMs = fadeMs;
  }
}

function popHeldBubbleKiss(runtime, now) {
  const particle = runtime.kissBubbleParticle;
  if (!particle) {
    return;
  }

  particle.phase = "popping";
  particle.popStartedAt = now;
  particle.startedAt = now;
  particle.duration = 360;
  particle.popSize = bubbleKissSize(particle, now);
  runtime.kissBubbleParticle = null;
  runtime.bubbleWideMouthUntil = now + (runtime.gameConfig?.kiss_bubble_pop_mouth_ms ?? KISS_BUBBLE_POP_MOUTH_MS);
}

function triggerKissParticles(runtime, sprite, origin, headWidth, viewport, now) {
  if (isBubbleKiss(sprite)) {
    runtime.kissParticles.push(createKissParticle("bubble", origin, headWidth, viewport, now, 0));
    return;
  }

  const spread = kissParticleSpread(runtime);
  if (sprite === "butterflies") {
    for (let index = 0; index < 5; index += 1) {
      runtime.kissParticles.push(createKissParticle("butterfly", origin, headWidth, viewport, now, index, spread));
    }
    return;
  }
  if (sprite === "moths") {
    for (let index = 0; index < 5; index += 1) {
      runtime.kissParticles.push(createKissParticle("moth", origin, headWidth, viewport, now, index, spread));
    }
    return;
  }
  if (isNoteKiss(sprite)) {
    for (let index = 0; index < 10; index += 1) {
      runtime.kissParticles.push(createKissParticle("note", origin, headWidth, viewport, now, index, spread));
    }
    return;
  }
  if (sprite === "oil") {
    for (let index = 0; index < 16; index += 1) {
      runtime.kissParticles.push(createKissParticle("oil", origin, headWidth, viewport, now, index, spread));
    }
    return;
  }

  for (let index = 0; index < 8; index += 1) {
    runtime.kissParticles.push(createKissParticle("heart", origin, headWidth, viewport, now, index, spread));
  }
}

function kissParticleSpread(runtime) {
  return Math.max(0.2, runtime.gameConfig?.kiss_particle_spread ?? KISS_PARTICLE_SPREAD);
}

function createKissParticle(kind, origin, headWidth, viewport, now, index, spreadMultiplier = KISS_PARTICLE_SPREAD, options = {}) {
  if (kind === "bubble") {
    return {
      kind,
      phase: "timed",
      x: origin.x,
      y: origin.y,
      headWidth,
      startedAt: now,
      duration: 1200,
      rotation: 0
    };
  }
  if (kind === "butterfly" || kind === "moth") {
    const angle = -Math.PI * 0.98 + (Math.PI * 0.96 * index) / 4 + (Math.random() - 0.5) * 0.35;
    const distanceScale = headWidth * (0.7 + Math.random() * 0.42) * spreadMultiplier;
    const finalScale =
      kind === "moth"
        ? 0.16 + Math.random() * 0.09
        : 0.14 + Math.random() * 0.08;
    return {
      kind,
      x: origin.x + (Math.random() - 0.5) * headWidth * 0.08,
      y: origin.y + (Math.random() - 0.5) * headWidth * 0.08,
      vx: Math.cos(angle) * distanceScale,
      vy: Math.sin(angle) * distanceScale - headWidth * 0.24 * spreadMultiplier,
      wave: Math.random() * Math.PI * 2,
      headWidth,
      startScale: finalScale * (0.22 + Math.random() * 0.1),
      endScale: finalScale,
      startedAt: now + index * 80,
      duration: (kind === "moth" ? 3000 : 2600) + index * 160,
      rotation: Math.cos(angle) * 0.36
    };
  }
  if (kind === "note") {
    const outwardDirection = options.direction ?? (Math.random() < 0.5 ? -1 : 1);
    const notePalette = ["#173d7a", "#0f6f88", "#5b3f91", "#264d9b"];
    const angle = -0.3 - Math.random() * 0.5;
    const distance = headWidth * (1.3 + Math.random() * 0.9) * spreadMultiplier;
    const travelOut = outwardDirection * Math.cos(angle) * distance;
    const travelUp = Math.abs(Math.sin(angle)) * distance * (0.45 + Math.random() * 0.3);
    const delay = options.held ? 0 : index * (95 + Math.random() * 45);
    return {
      kind,
      x: origin.x + (Math.random() - 0.5) * headWidth * 0.05,
      y: origin.y + (Math.random() - 0.5) * headWidth * 0.05,
      vx: travelOut,
      vy: -travelUp,
      snakeAmplitude: headWidth * (0.14 + Math.random() * 0.16) * spreadMultiplier,
      snakeFrequency: 1.15 + Math.random() * 0.9,
      wave: index * 0.78 + Math.random() * 0.65,
      headWidth,
      startScale: 0.035 + Math.random() * 0.015,
      endScale: 0.14 + Math.random() * 0.08,
      noteType: Math.random() < 0.42 ? "double" : "single",
      color: notePalette[index % notePalette.length],
      startedAt: now + delay,
      duration: 4400 + Math.random() * 1800,
      rotation: outwardDirection * 0.12 + (Math.random() - 0.5) * 0.28,
      spin: (Math.random() - 0.5) * 0.22
    };
  }
  if (kind === "oil") {
    const angle = -Math.PI + (Math.PI * 2 * (index + Math.random() * 0.9)) / 16;
    const impulse = headWidth * (0.17 + Math.random() * 0.35) * spreadMultiplier;
    const size = headWidth * (0.026 + Math.random() * 0.072);
    return {
      kind,
      x: origin.x + (Math.random() - 0.5) * headWidth * 0.05,
      y: origin.y + (Math.random() - 0.5) * headWidth * 0.05,
      vx: Math.cos(angle) * impulse,
      vy: Math.sin(angle) * impulse - headWidth * (0.05 + Math.random() * 0.18),
      gravity: headWidth * (2.6 + Math.random() * 1.6),
      size,
      stretch: 0.85 + Math.random() * 0.55,
      startedAt: now + index * 18,
      duration: 1900 + Math.random() * 900,
      rotation: (Math.random() - 0.5) * 1.8,
      spin: (Math.random() - 0.5) * 2.4
    };
  }
  const angle = (Math.PI * 2 * (index + Math.random() * 0.9)) / 8;
  const impulse = 0.28 + Math.random() * 0.62;
  const distanceScale = headWidth * impulse * spreadMultiplier;
  const finalScale = 0.09 + Math.random() * 0.105;
  const startJitter = headWidth * (0.015 + Math.random() * 0.075);
  return {
    kind,
    x: origin.x + Math.cos(angle) * startJitter + (Math.random() - 0.5) * headWidth * 0.035,
    y: origin.y + Math.sin(angle) * startJitter + (Math.random() - 0.5) * headWidth * 0.035,
    vx: Math.cos(angle) * distanceScale,
    vy: Math.sin(angle) * distanceScale,
    upwardDrift: headWidth * (0.28 + Math.random() * 0.28) * spreadMultiplier,
    headWidth,
    startScale: finalScale * (0.22 + Math.random() * 0.18),
    endScale: finalScale,
    spin: (Math.random() - 0.5) * (0.5 + Math.random() * 0.9),
    startedAt: now + index * 22,
    duration: 1150 + Math.random() * 620,
    rotation: (Math.random() - 0.5) * 0.9
  };
}

function drawKissParticles(ctx, runtime, viewport, now) {
  for (const particle of runtime.kissParticles) {
    const age = now - particle.startedAt;
    if (age < 0 || (particle.phase !== "holding" && age > particle.duration)) {
      continue;
    }
    if (particle.kind === "bubble") {
      drawBubbleKissParticle(ctx, runtime, particle, age, now);
    } else if (particle.kind === "butterfly" || particle.kind === "moth") {
      drawButterflyKissParticle(ctx, runtime, particle, age);
    } else if (particle.kind === "note") {
      drawNoteKissParticle(ctx, particle, age, age / particle.duration);
    } else if (particle.kind === "oil") {
      drawOilKissParticle(ctx, particle, age / particle.duration);
    } else {
      drawHeartKissParticle(ctx, runtime, particle, age / particle.duration);
    }
  }
}

function drawNoteKissParticle(ctx, particle, age, progress) {
  const eased = easeOutCubic(progress);
  const snake = Math.sin(progress * Math.PI * 2 * particle.snakeFrequency + particle.wave) * particle.snakeAmplitude * (0.25 + progress);
  const x = particle.x + particle.vx * eased + snake;
  const y = particle.y + particle.vy * eased;
  const size = particle.headWidth * lerp(particle.startScale ?? 0.04, particle.endScale ?? 0.22, eased);
  const travelAlpha = clamp(1 - Math.max(0, progress - 0.68) / 0.32, 0, 1);
  const releaseAge = particle.releaseStartedAt === undefined ? 0 : age - (particle.releaseStartedAt - particle.startedAt);
  const releaseAlpha = particle.releaseStartedAt === undefined ? 1 : clamp(1 - releaseAge / particle.releaseFadeMs, 0, 1);
  const alpha = travelAlpha * releaseAlpha;
  drawMusicNoteShape(ctx, x, y, size, particle.noteType, particle.color, alpha, particle.rotation + progress * (particle.spin ?? 0));
}

function drawMusicNoteShape(ctx, x, y, size, type = "single", color = "#173d7a", alpha = 1, rotation = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1.5, size * 0.1);

  if (type === "double") {
    drawSingleMusicNote(ctx, -size * 0.28, size * 0.18, size * 0.82, false);
    drawSingleMusicNote(ctx, size * 0.28, size * 0.04, size * 0.82, false);
    ctx.beginPath();
    ctx.moveTo(-size * 0.12, -size * 0.54);
    ctx.bezierCurveTo(size * 0.05, -size * 0.65, size * 0.34, -size * 0.55, size * 0.44, -size * 0.66);
    ctx.stroke();
  } else {
    drawSingleMusicNote(ctx, 0, size * 0.18, size, true);
  }

  ctx.restore();
}

function drawSingleMusicNote(ctx, x, y, size, flag = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.16);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.22, size * 0.15, -0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(size * 0.18, -size * 0.02);
  ctx.lineTo(size * 0.18, -size * 0.72);
  ctx.stroke();
  if (flag) {
    ctx.beginPath();
    ctx.moveTo(size * 0.18, -size * 0.72);
    ctx.bezierCurveTo(size * 0.48, -size * 0.58, size * 0.48, -size * 0.3, size * 0.24, -size * 0.22);
    ctx.lineTo(size * 0.18, -size * 0.42);
    ctx.bezierCurveTo(size * 0.36, -size * 0.48, size * 0.34, -size * 0.62, size * 0.18, -size * 0.72);
    ctx.fill();
  }
  ctx.restore();
}

function drawOilKissParticle(ctx, particle, progress) {
  const eased = easeOutCubic(progress);
  const fall = progress * progress;
  const x = particle.x + particle.vx * eased;
  const y = particle.y + particle.vy * eased + particle.gravity * fall;
  const alpha = clamp(1 - Math.max(0, progress - 0.78) / 0.22, 0, 1);
  drawOilDropShape(ctx, x, y, particle.size, particle.stretch ?? 1.05, particle.rotation + progress * particle.spin, alpha);
}

function drawHeartKissParticle(ctx, runtime, particle, progress) {
  const image = runtime.images.kiss_heart;
  if (!image) {
    return;
  }
  const ease = easeOutCubic(progress);
  const size = particle.headWidth * lerp(particle.startScale ?? 0.025, particle.endScale ?? 0.16, ease);
  drawParticleImage(ctx, image, {
    x: particle.x + particle.vx * ease,
    y: particle.y + particle.vy * ease - particle.upwardDrift * (progress * progress),
    size,
    alpha: 1 - progress,
    rotation: particle.rotation + progress * (particle.spin ?? 0.5)
  });
}

function drawBubbleKissParticle(ctx, runtime, particle, age, now) {
  const image = runtime.images.kiss_bubble;
  if (!image) {
    return;
  }
  if (particle.phase === "holding") {
    drawParticleImage(ctx, image, {
      x: particle.x,
      y: particle.y - particle.headWidth * 0.04,
      size: bubbleKissSize(particle, now),
      alpha: 0.95,
      rotation: 0
    });
    return;
  }
  const progress = age / particle.duration;
  if (particle.phase === "popping") {
    drawBubblePop(ctx, particle, progress);
    return;
  }
  if (progress < 0.72) {
    const growth = easeOutCubic(progress / 0.72);
    drawParticleImage(ctx, image, {
      x: particle.x,
      y: particle.y - particle.headWidth * 0.04 * growth,
      size: particle.headWidth * (0.08 + growth * 0.42),
      alpha: 0.95,
      rotation: 0
    });
    return;
  }

  const popProgress = (progress - 0.72) / 0.28;
  drawBubblePop(ctx, particle, popProgress);
}

function drawBubblePop(ctx, particle, progress) {
  const popProgress = clamp(progress, 0, 1);
  const alpha = 1 - popProgress;
  const popSize = Math.max(particle.popSize ?? 0, particle.headWidth * KISS_BUBBLE_TARGET_HEAD_SIZE);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255, 116, 176, 0.9)";
  ctx.lineWidth = Math.max(2, particle.headWidth * 0.012);
  for (let index = 0; index < 7; index += 1) {
    const angle = (Math.PI * 2 * index) / 7;
    const inner = popSize * (0.26 + popProgress * 0.3);
    const outer = popSize * (0.4 + popProgress * 0.55);
    ctx.beginPath();
    ctx.moveTo(particle.x + Math.cos(angle) * inner, particle.y + Math.sin(angle) * inner);
    ctx.lineTo(particle.x + Math.cos(angle) * outer, particle.y + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function bubbleKissSize(particle, now) {
  const elapsedSeconds = Math.max(0, now - particle.startedAt) / 1000;
  const targetSize = particle.headWidth * (particle.targetHeadSize ?? KISS_BUBBLE_TARGET_HEAD_SIZE);
  const baseSize = particle.headWidth * 0.08;
  const quickGrowth = easeOutCubic(Math.min(elapsedSeconds / 0.85, 1));
  const slowGrowthSeconds = Math.max(0, elapsedSeconds - 0.85);
  return baseSize + (targetSize - baseSize) * quickGrowth + particle.headWidth * (particle.slowGrowthPerSecond ?? 0) * slowGrowthSeconds;
}

function drawButterflyKissParticle(ctx, runtime, particle, age) {
  const isMoth = particle.kind === "moth";
  const open = Math.floor(age / (isMoth ? 150 : 120)) % 2 === 0;
  const image = isMoth
    ? (open ? runtime.images.kiss_moth_open : runtime.images.kiss_moth_closed)
    : (open ? runtime.images.kiss_butterfly_open : runtime.images.kiss_butterfly_closed);
  if (!image) {
    return;
  }
  const progress = age / particle.duration;
  const ease = easeOutCubic(progress);
  const flutter = Math.sin(progress * Math.PI * (isMoth ? 6 : 8) + particle.wave) * particle.headWidth * (isMoth ? 0.065 : 0.08);
  const size = particle.headWidth * lerp(particle.startScale ?? 0.035, particle.endScale ?? 0.2, ease);
  drawParticleImage(ctx, image, {
    x: particle.x + particle.vx * ease + flutter,
    y: particle.y + particle.vy * ease - particle.headWidth * progress * (isMoth ? 0.24 : 0.18),
    size,
    alpha: clamp(1 - Math.max(0, progress - 0.72) / 0.28, 0, 1),
    rotation: particle.rotation + Math.sin(progress * Math.PI * (isMoth ? 4 : 5) + particle.wave) * (isMoth ? 0.18 : 0.25)
  });
}

function drawParticleImage(ctx, image, particle) {
  ctx.save();
  ctx.globalAlpha = particle.alpha;
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  ctx.drawImage(image, -particle.size / 2, -particle.size / 2, particle.size, particle.size);
  ctx.restore();
}

function updatePoseActionEffects(runtime, bodyBounds, headWidth, now) {
  const poseAction = activePoseAction(runtime);
  const holdMs = runtime.gameConfig?.hand_pose_action_hold_ms ?? HAND_POSE_ACTION_HOLD_MS;
  const actionHeld = poseAction && runtime.activeHandTrackingTag === "bothMiddle" && runtime.handLockedPose !== null;

  if (!actionHeld) {
    if (runtime.poseEnergy) {
      runtime.poseActionEffects.push(createPoseEnergyExplosion(runtime, bodyBounds, headWidth, now));
      runtime.poseEnergy = null;
    }
    if (runtime.poseOilSpill) {
      runtime.poseActionEffects.push(createPoseOilBurst(runtime, now));
      runtime.poseOilSpill = null;
    }
    runtime.poseActionStartedAt = null;
    runtime.poseActionFired = false;
  } else {
    runtime.poseActionStartedAt ??= now;
    if (poseAction.type === "energy" || poseAction.type === "blackHole") {
      updateHeldPoseEnergy(runtime, poseAction, bodyBounds, headWidth, now);
    } else if (poseAction.type === "oilSpill") {
      updateHeldPoseOilSpill(runtime, poseAction, bodyBounds, headWidth, now, holdMs);
    } else if (poseAction.type === "heart" && !runtime.poseActionFired && now - runtime.poseActionStartedAt >= holdMs) {
      runtime.poseActionEffects.push(createPoseHeartEffect(runtime, poseAction, bodyBounds, headWidth, now));
      runtime.poseActionFired = true;
    }
  }

  runtime.poseActionEffects = runtime.poseActionEffects.filter((effect) => now - effect.startedAt < effect.duration);
}

function activePoseAction(runtime) {
  const poseName = `pose_${runtime.pose}`;
  const action = runtime.config.layout.bodyPoses?.[poseName]?.poseAction;
  if (!action || action.type === "none") {
    return null;
  }
  return action;
}

function createPoseHeartEffect(runtime, action, bodyBounds, headWidth, now) {
  const startScale = action.startHeadSize ?? runtime.gameConfig?.hand_pose_heart_start_head_size ?? HAND_POSE_HEART_START_HEAD_SIZE;
  const endScale = action.endHeadSize ?? runtime.gameConfig?.hand_pose_heart_end_head_size ?? HAND_POSE_HEART_END_HEAD_SIZE;
  return {
    kind: "poseHeart",
    x: bodyBounds.x + (action.x ?? 0.5) * bodyBounds.width,
    y: bodyBounds.y + (action.y ?? 0.3) * bodyBounds.height,
    headWidth,
    startSize: headWidth * startScale,
    endSize: headWidth * endScale,
    startedAt: now,
    duration: action.durationMs ?? runtime.gameConfig?.hand_pose_heart_duration_ms ?? HAND_POSE_HEART_DURATION_MS
  };
}

function updateHeldPoseOilSpill(runtime, action, bodyBounds, headWidth, now, holdMs) {
  const effectStartedAt = runtime.poseActionStartedAt + (action.holdMs ?? holdMs);
  const age = now - effectStartedAt;
  if (age < 0) {
    runtime.poseOilSpill = null;
    return;
  }
  const duration = action.durationMs ?? runtime.gameConfig?.hand_pose_heart_duration_ms ?? HAND_POSE_HEART_DURATION_MS;
  const startScale = action.startHeadSize ?? runtime.gameConfig?.hand_pose_heart_start_head_size ?? HAND_POSE_HEART_START_HEAD_SIZE;
  const endScale = action.endHeadSize ?? runtime.gameConfig?.hand_pose_heart_end_head_size ?? HAND_POSE_HEART_END_HEAD_SIZE;
  const progress = clamp(age / duration, 0, 1);
  runtime.poseOilSpill = {
    kind: "poseOilSpillHold",
    x: bodyBounds.x + (action.x ?? 0.5) * bodyBounds.width,
    y: bodyBounds.y + (action.y ?? 0.3) * bodyBounds.height,
    headWidth,
    size: headWidth * lerp(startScale, endScale, easeOutCubic(progress)),
    progress,
    startedAt: effectStartedAt
  };
  emitPoseOilDrips(runtime, now);
}

function emitPoseOilDrips(runtime, now) {
  const oil = runtime.poseOilSpill;
  if (!oil) {
    return;
  }
  const interval = lerp(180, 70, oil.progress);
  if (now - runtime.poseOilLastDripAt < interval) {
    return;
  }
  runtime.poseOilLastDripAt = now;
  const count = Math.max(1, Math.round(lerp(1, 3, oil.progress)));
  for (let index = 0; index < count; index += 1) {
    const angle = Math.PI * lerp(0.1, 0.9, Math.random());
    const edge = oil.size * lerp(0.32, 0.58, Math.random());
    runtime.poseActionEffects.push({
      kind: "poseOilDrip",
      x: oil.x + Math.cos(angle) * edge,
      y: oil.y + Math.sin(angle) * edge * 0.78,
      vx: oil.headWidth * lerp(-0.035, 0.035, Math.random()),
      vy: oil.headWidth * lerp(0.08, 0.22, Math.random()),
      size: oil.headWidth * lerp(0.025, 0.055, Math.random()),
      stretch: lerp(1.05, 1.55, Math.random()),
      rotation: Math.random() * Math.PI,
      spin: lerp(-0.8, 0.8, Math.random()),
      startedAt: now,
      duration: lerp(620, 1150, Math.random()),
      alpha: 0.9
    });
  }
}

function createPoseOilBurst(runtime, now) {
  const oil = runtime.poseOilSpill;
  const drops = [];
  const count = Math.round(lerp(22, 58, oil.progress));
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const sourceRadius = oil.size * lerp(0.05, 0.48, Math.random());
    const speed = oil.headWidth * lerp(0.35, 1.35, Math.random());
    drops.push({
      x: Math.cos(angle) * sourceRadius,
      y: Math.sin(angle) * sourceRadius * 0.82,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.58 - oil.headWidth * lerp(0.12, 0.34, Math.random()),
      size: oil.headWidth * lerp(0.03, 0.095, Math.random()),
      stretch: lerp(0.8, 1.7, Math.random()),
      rotation: Math.random() * Math.PI,
      spin: lerp(-2.2, 2.2, Math.random())
    });
  }
  return {
    kind: "poseOilBurst",
    x: oil.x,
    y: oil.y,
    headWidth: oil.headWidth,
    progress: oil.progress,
    drops,
    startedAt: now,
    duration: 1500
  };
}

function updateHeldPoseEnergy(runtime, action, bodyBounds, headWidth, now) {
  const growMs = action.growMs ?? runtime.gameConfig?.hand_pose_energy_grow_ms ?? HAND_POSE_ENERGY_GROW_MS;
  const delayMs = action.delayMs ?? runtime.gameConfig?.hand_pose_energy_delay_ms ?? HAND_POSE_ENERGY_DELAY_MS;
  const fadeInMs = action.fadeInMs ?? runtime.gameConfig?.hand_pose_energy_fade_in_ms ?? HAND_POSE_ENERGY_FADE_IN_MS;
  const maxScale = action.maxHeadSize ?? runtime.gameConfig?.hand_pose_energy_max_head_size ?? HAND_POSE_ENERGY_MAX_HEAD_SIZE;
  const startScale = action.startHeadSize ?? runtime.gameConfig?.hand_pose_energy_start_head_size ?? HAND_POSE_ENERGY_START_HEAD_SIZE;
  const visibleStartedAt = runtime.poseActionStartedAt + delayMs;
  const visibleElapsed = now - visibleStartedAt;
  if (visibleElapsed < 0) {
    runtime.poseEnergy = null;
    return;
  }
  const progress = clamp(visibleElapsed / growMs, 0, 1);
  const alpha = clamp(visibleElapsed / fadeInMs, 0, 1);
  const x = bodyBounds.x + (action.x ?? 0.5) * bodyBounds.width;
  const y = bodyBounds.y + (action.y ?? 0.3) * bodyBounds.height;
  runtime.poseEnergy = {
    kind: "poseEnergyHold",
    x,
    y,
    headWidth,
    radius: (headWidth * lerp(startScale, maxScale, progress)) / 2,
    alpha,
    progress,
    variant: action.type === "blackHole" ? "blackHole" : "energy",
    startedAt: visibleStartedAt
  };
  emitPoseEnergySparks(runtime, now);
}

function emitPoseEnergySparks(runtime, now) {
  const energy = runtime.poseEnergy;
  if (!energy) {
    return;
  }
  if ((energy.alpha ?? 1) <= 0) {
    return;
  }
  const interval = lerp(260, 45, energy.progress);
  if (now - runtime.poseEnergyLastSparkAt < interval) {
    return;
  }
  runtime.poseEnergyLastSparkAt = now;
  const count = Math.max(1, Math.round(lerp(1, 5, energy.progress)));
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = energy.radius * lerp(1.6, 4.4, Math.random());
    runtime.poseActionEffects.push({
      kind: "poseEnergySpark",
      variant: energy.variant,
      x: energy.x + Math.cos(angle) * energy.radius * 0.6,
      y: energy.y + Math.sin(angle) * energy.radius * 0.6,
      vx: Math.cos(angle) * distance,
      vy: Math.sin(angle) * distance,
      size: energy.headWidth * lerp(0.006, 0.018, energy.progress) * lerp(0.7, 1.35, Math.random()),
      startedAt: now,
      duration: lerp(180, 420, Math.random()),
      alpha: 0.85,
      dark: energy.variant === "blackHole" && Math.random() < 0.42
    });
  }
}

function createPoseEnergyExplosion(runtime, bodyBounds, headWidth, now) {
  const energy = runtime.poseEnergy;
  const viewport = runtime.lastViewport ?? { width: headWidth * 4, height: headWidth * 4 };
  const progress = energy?.progress ?? 0;
  const pageSize = Math.max(viewport.width, viewport.height);
  const minRadius = pageSize * lerp(0.25, 0.58, progress);
  const radius = Math.max(minRadius, headWidth * lerp(0.45, 2.2, progress));
  const variant = energy?.variant ?? "energy";
  const sparkCount = Math.round(lerp(HAND_POSE_ENERGY_FIREWORK_MIN_PARTICLES, HAND_POSE_ENERGY_FIREWORK_MAX_PARTICLES, progress));
  return {
    kind: "poseEnergyExplosion",
    x: energy?.x ?? bodyBounds.x + bodyBounds.width / 2,
    y: energy?.y ?? bodyBounds.y + bodyBounds.height * 0.3,
    radius,
    headWidth,
    progress,
    variant,
    sparks: sparkCount,
    particles: variant === "energy" ? createPoseEnergyFireworkParticles(headWidth, radius, progress, sparkCount) : null,
    seed: Math.random() * Math.PI * 2,
    startedAt: now,
    duration: variant === "energy" ? HAND_POSE_ENERGY_FIREWORK_MS : HAND_POSE_ENERGY_EXPLOSION_MS
  };
}

function createPoseEnergyFireworkParticles(headWidth, radius, progress, count) {
  const particles = [];
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = radius * lerp(0.34, 1, Math.random());
    const popAt = lerp(0.38, 0.76, Math.random());
    const hue = Math.floor(Math.random() * 360);
    const fragments = [];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const fragmentCount = Math.round(lerp(HAND_POSE_ENERGY_FIREWORK_MIN_FRAGMENTS, HAND_POSE_ENERGY_FIREWORK_MAX_FRAGMENTS, Math.random()));
    for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex += 1) {
      const fragmentAngle = (fragmentIndex / fragmentCount) * Math.PI * 2 + Math.random() * 0.42;
      const fragmentHue = (hue + lerp(-26, 26, Math.random()) + 360) % 360;
      fragments.push({
        cos: Math.cos(fragmentAngle),
        sin: Math.sin(fragmentAngle),
        speed: headWidth * lerp(0.08, 0.24, Math.random()) * lerp(0.75, 1.3, progress),
        size: headWidth * lerp(0.006, 0.018, Math.random()),
        color: `hsl(${fragmentHue}, 100%, 68%)`
      });
    }
    particles.push({
      angle,
      cos,
      sin,
      distance,
      popAt,
      hue,
      stroke: `hsl(${hue}, 100%, 72%)`,
      size: headWidth * lerp(0.01, 0.024, Math.random()) * lerp(0.8, 1.25, progress),
      fragments
    });
  }
  return particles;
}

function drawPoseActionEffects(ctx, runtime, now) {
  const image = runtime.images.kiss_heart;
  if (runtime.poseEnergy) {
    drawHeldPoseEnergy(ctx, runtime.poseEnergy, now);
  }
  if (runtime.poseOilSpill) {
    drawHeldPoseOilSpill(ctx, runtime, runtime.poseOilSpill, now);
  }

  for (const effect of runtime.poseActionEffects) {
    const progress = clamp((now - effect.startedAt) / effect.duration, 0, 1);
    if (effect.kind === "poseHeart" && image) {
      const size = lerp(effect.startSize, effect.endSize, easeOutCubic(progress));
      drawParticleImage(ctx, image, {
        x: effect.x,
        y: effect.y,
        size,
        alpha: 1 - progress,
        rotation: 0
      });
    } else if (effect.kind === "poseEnergySpark") {
      drawPoseEnergySpark(ctx, effect, progress);
    } else if (effect.kind === "poseEnergyExplosion") {
      drawPoseEnergyExplosion(ctx, effect, progress);
    } else if (effect.kind === "poseOilDrip") {
      drawPoseOilDrop(ctx, effect, progress);
    } else if (effect.kind === "poseOilBurst") {
      drawPoseOilBurst(ctx, effect, progress);
    }
  }
}

function drawHeldPoseOilSpill(ctx, runtime, oil, now) {
  const image = runtime.images.pose_oil_spill;
  if (!image) {
    return;
  }
  const age = now - oil.startedAt;
  const rotation = age * 0.00135;
  const aspect = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
  const width = oil.size * aspect;
  const height = oil.size;
  ctx.save();
  ctx.translate(oil.x, oil.y);
  ctx.rotate(rotation);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawPoseOilDrop(ctx, drop, progress) {
  const ease = easeOutCubic(progress);
  const fall = progress * progress;
  const x = drop.x + drop.vx * ease;
  const y = drop.y + drop.vy * ease + (drop.size * 8 + 90) * fall;
  const alpha = (drop.alpha ?? 1) * (1 - Math.max(0, progress - 0.72) / 0.28);
  drawOilDropShape(ctx, x, y, drop.size, drop.stretch ?? 1.2, drop.rotation + progress * (drop.spin ?? 0), alpha);
}

function drawPoseOilBurst(ctx, burst, progress) {
  const ease = easeOutCubic(progress);
  const gravity = burst.headWidth * 1.35 * progress * progress;
  const alpha = 1 - Math.max(0, progress - 0.78) / 0.22;
  for (const drop of burst.drops) {
    const x = burst.x + drop.x + drop.vx * ease;
    const y = burst.y + drop.y + drop.vy * ease + gravity;
    drawOilDropShape(ctx, x, y, drop.size, drop.stretch, drop.rotation + progress * drop.spin, alpha);
  }
}

function drawOilDropShape(ctx, x, y, size, stretch = 1.2, rotation = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1, stretch);
  const gradient = ctx.createRadialGradient(-size * 0.22, -size * 0.28, size * 0.08, 0, 0, size);
  gradient.addColorStop(0, "rgba(92, 96, 112, 0.95)");
  gradient.addColorStop(0.32, "rgba(28, 31, 40, 0.98)");
  gradient.addColorStop(1, "rgba(4, 5, 8, 0.98)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.62, size * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(235, 240, 255, 0.32)";
  ctx.beginPath();
  ctx.ellipse(-size * 0.22, -size * 0.18, size * 0.18, size * 0.07, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeldPoseEnergy(ctx, energy, now) {
  const pulse = 0.9 + Math.sin((now - energy.startedAt) * 0.006) * 0.1;
  if (energy.variant === "blackHole") {
    drawBlackHoleOrb(ctx, energy.x, energy.y, energy.radius * pulse, 0.95 * (energy.alpha ?? 1), now - energy.startedAt);
    return;
  }
  drawEnergyOrb(ctx, energy.x, energy.y, energy.radius * pulse, 0.95 * (energy.alpha ?? 1));
}

function drawEnergyOrb(ctx, x, y, radius, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 4.2);
  glow.addColorStop(0, "rgba(220, 250, 255, 0.98)");
  glow.addColorStop(0.22, "rgba(92, 198, 255, 0.72)");
  glow.addColorStop(0.62, "rgba(40, 126, 255, 0.24)");
  glow.addColorStop(1, "rgba(30, 80, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(190, 245, 255, 0.95)";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPoseEnergySpark(ctx, spark, progress) {
  const ease = easeOutCubic(progress);
  const x = spark.x + spark.vx * ease;
  const y = spark.y + spark.vy * ease;
  const isBlackHole = spark.variant === "blackHole";
  ctx.save();
  ctx.globalAlpha = (spark.alpha ?? 1) * (1 - progress);
  if (isBlackHole) {
    ctx.shadowColor = "rgba(255, 38, 28, 0.9)";
    ctx.shadowBlur = Math.max(2, spark.size * 3);
  }
  ctx.strokeStyle = isBlackHole && spark.dark ? "rgba(9, 0, 7, 0.95)" : isBlackHole ? "rgba(255, 42, 34, 0.95)" : "rgba(170, 235, 255, 0.95)";
  ctx.lineWidth = Math.max(1, spark.size);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - spark.vx * 0.16, y - spark.vy * 0.16);
  ctx.stroke();
  ctx.restore();
}

function drawPoseEnergyExplosion(ctx, explosion, progress) {
  if (explosion.variant === "blackHole") {
    drawPoseBlackHoleExplosion(ctx, explosion, progress);
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const flashProgress = clamp(progress / 0.34, 0, 1);
  const flashRadius = explosion.radius * easeOutCubic(flashProgress) * 0.82;
  ctx.globalAlpha = 1 - flashProgress;
  const glow = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, flashRadius);
  glow.addColorStop(0, "rgba(230, 252, 255, 0.95)");
  glow.addColorStop(0.12, "rgba(100, 210, 255, 0.74)");
  glow.addColorStop(0.45, "rgba(32, 124, 255, 0.28)");
  glow.addColorStop(1, "rgba(24, 54, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, flashRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const particle of explosion.particles ?? []) {
    drawPoseEnergyFireworkParticle(ctx, explosion, particle, progress);
  }
  ctx.restore();
}

function drawPoseEnergyFireworkParticle(ctx, explosion, particle, progress) {
  const travelProgress = clamp(progress / particle.popAt, 0, 1);
  const travelEase = easeOutCubic(travelProgress);
  const popX = explosion.x + particle.cos * particle.distance;
  const popY = explosion.y + particle.sin * particle.distance;
  if (progress < particle.popAt) {
    const x = explosion.x + particle.cos * particle.distance * travelEase;
    const y = explosion.y + particle.sin * particle.distance * travelEase;
    const tail = explosion.headWidth * 0.08 * (1 - travelProgress);
    ctx.globalAlpha = 0.92 * (1 - travelProgress * 0.28);
    ctx.strokeStyle = particle.stroke;
    ctx.lineWidth = Math.max(1, particle.size);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - particle.cos * tail, y - particle.sin * tail);
    ctx.stroke();
    return;
  }

  const burstProgress = clamp((progress - particle.popAt) / (1 - particle.popAt), 0, 1);
  const burstEase = easeOutCubic(burstProgress);
  const alpha = 1 - burstProgress;
  const gravity = explosion.headWidth * 0.18 * burstProgress * burstProgress;
  ctx.globalAlpha = alpha;
  for (const fragment of particle.fragments) {
    const distance = fragment.speed * burstEase;
    const x = popX + fragment.cos * distance;
    const y = popY + fragment.sin * distance + gravity;
    ctx.fillStyle = fragment.color;
    ctx.beginPath();
    ctx.arc(x, y, fragment.size * (1 - burstProgress * 0.45), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBlackHoleOrb(ctx, x, y, radius, alpha = 1, age = 0) {
  const rotation = age * 0.0018;
  ctx.save();
  ctx.globalAlpha = alpha;
  const outerGlow = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius * 5);
  outerGlow.addColorStop(0, "rgba(0, 0, 0, 0.92)");
  outerGlow.addColorStop(0.24, "rgba(22, 0, 18, 0.84)");
  outerGlow.addColorStop(0.48, "rgba(134, 0, 24, 0.34)");
  outerGlow.addColorStop(1, "rgba(255, 20, 18, 0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);
  ctx.rotate(rotation);
  for (let index = 0; index < 5; index += 1) {
    ctx.save();
    ctx.rotate((index / 5) * Math.PI * 2);
    ctx.scale(1.75, 0.55);
    ctx.strokeStyle = index % 2 === 0 ? "rgba(255, 38, 28, 0.68)" : "rgba(35, 0, 28, 0.78)";
    ctx.lineWidth = Math.max(1.4, radius * (0.16 - index * 0.016));
    ctx.beginPath();
    ctx.arc(0, 0, radius * (1.04 + index * 0.18), 0.18, Math.PI * 1.42);
    ctx.stroke();
    ctx.restore();
  }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.2);
  core.addColorStop(0, "rgba(0, 0, 0, 1)");
  core.addColorStop(0.58, "rgba(0, 0, 0, 0.98)");
  core.addColorStop(0.82, "rgba(72, 0, 36, 0.92)");
  core.addColorStop(1, "rgba(255, 34, 18, 0.72)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPoseBlackHoleExplosion(ctx, explosion, progress) {
  const ease = easeOutCubic(progress);
  const radius = explosion.radius * ease;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  const glow = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, radius);
  glow.addColorStop(0, "rgba(0, 0, 0, 0.9)");
  glow.addColorStop(0.16, "rgba(32, 0, 24, 0.78)");
  glow.addColorStop(0.44, "rgba(180, 0, 28, 0.28)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 38, 28, 0.86)";
  ctx.lineWidth = Math.max(2, explosion.radius * 0.007 * (1 - progress));
  const count = explosion.sparks ?? 60;
  for (let index = 0; index < count; index += 1) {
    const angle = explosion.seed + index * 2.399963229728653 + progress * Math.PI * 0.65;
    const jitter = 0.68 + ((index * 41) % 37) / 100;
    const outer = radius * jitter;
    const inner = outer * (index % 3 === 0 ? 0.54 : 0.78);
    ctx.strokeStyle = index % 3 === 0 ? "rgba(8, 0, 8, 0.9)" : "rgba(255, 46, 36, 0.86)";
    ctx.beginPath();
    ctx.moveTo(explosion.x + Math.cos(angle) * inner, explosion.y + Math.sin(angle) * inner);
    ctx.lineTo(explosion.x + Math.cos(angle) * outer, explosion.y + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) {
    return value >= edge1 ? 1 : 0;
  }
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function drawFeatheredMaskedImage(ctx, image, width, height, mask, feather) {
  const canvasWidth = Math.max(1, Math.ceil(width));
  const canvasHeight = Math.max(1, Math.ceil(height));
  const canvas =
    typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(canvasWidth, canvasHeight)
      : document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const tempCtx = canvas.getContext("2d");
  tempCtx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
  const maskCanvas = createCanvas(canvasWidth, canvasHeight);
  const maskCtx = maskCanvas.getContext("2d");
  paintFeatheredMask(maskCtx, canvasWidth, canvasHeight, mask, feather);
  tempCtx.globalCompositeOperation = "destination-in";
  tempCtx.drawImage(maskCanvas, 0, 0);
  tempCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(canvas, -width / 2, -height / 2, width, height);
}

function createCanvas(width, height) {
  const canvas =
    typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(width, height)
      : document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintFeatheredMask(ctx, width, height, mask, feather) {
  const x = mask.x * width;
  const y = mask.y * height;
  const w = mask.width * width;
  const h = mask.height * height;
  const featherPx = Math.max(0, feather * Math.min(width, height));
  if (mask.shape === "line") {
    paintLineMask(ctx, width, height, x, y, w, h);
    return;
  }
  if (mask.shape === "oval") {
    paintFeatheredOvalMask(ctx, width, height, x, y, w, h, featherPx);
    return;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, w, h);
  if (featherPx <= 0) {
    return;
  }

  const left = Math.max(0, x - featherPx);
  const right = Math.min(width, x + w + featherPx);
  const top = Math.max(0, y - featherPx);
  const bottom = Math.min(height, y + h + featherPx);
  fillLinearMask(ctx, left, y, x - left, h, left, 0, x, 0);
  fillLinearMask(ctx, x + w, y, right - (x + w), h, right, 0, x + w, 0);
  fillLinearMask(ctx, x, top, w, y - top, 0, top, 0, y);
  fillLinearMask(ctx, x, y + h, w, bottom - (y + h), 0, bottom, 0, y + h);
  fillRadialMask(ctx, left, top, x - left, y - top, x, y);
  fillRadialMask(ctx, x + w, top, right - (x + w), y - top, x + w, y);
  fillRadialMask(ctx, left, y + h, x - left, bottom - (y + h), x, y + h);
  fillRadialMask(ctx, x + w, y + h, right - (x + w), bottom - (y + h), x + w, y + h);
}

function paintFeatheredOvalMask(ctx, width, height, x, y, w, h, featherPx) {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = Math.max(w / 2, 1);
  const ry = Math.max(h / 2, 1);
  const feather = featherPx / Math.min(rx, ry);
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const nx = (px + 0.5 - cx) / rx;
      const ny = (py + 0.5 - cy) / ry;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const alpha = feather <= 0 ? (dist <= 1 ? 1 : 0) : clamp(1 - (dist - 1) / feather, 0, 1);
      data[(py * width + px) * 4 + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function paintLineMask(ctx, width, height, x, y, w, h) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  if (w <= 0 || h <= 0) {
    return;
  }
  const gradient = ctx.createLinearGradient(0, y + h, 0, y);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 1)");
  ctx.fillStyle = gradient;
  ctx.clearRect(x, y, w, h);
  ctx.fillRect(x, y, w, h);
}

function fillLinearMask(ctx, x, y, width, height, x0, y0, x1, y1) {
  if (width <= 0 || height <= 0) {
    return;
  }
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

function fillRadialMask(ctx, x, y, width, height, opaqueX, opaqueY) {
  if (width <= 0 || height <= 0) {
    return;
  }
  const gradient = ctx.createRadialGradient(opaqueX, opaqueY, 0, opaqueX, opaqueY, Math.max(width, height));
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

function drawBody(ctx, runtime, worldNeck, headWidth, layer = "full") {
  const { config, images, pose } = runtime;
  const spriteName = `pose_${pose}`;
  const bodySprite = images[spriteName];
  const bounds = calculateBodyBounds(runtime, worldNeck, headWidth);
  const bodyLayout = config.layout.body;
  const poseLayout = config.layout.bodyPoses?.[spriteName] ?? {
    offset: { x: 0, y: 0 },
    scale: 1,
    rotation: 0
  };

  ctx.save();
  ctx.translate(worldNeck.x, worldNeck.y);
  if (runtime.poseFlipX) {
    const reverseAxisX = (poseLayout.reverseAxisX ?? 0) * headWidth;
    ctx.translate(reverseAxisX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-reverseAxisX, 0);
  }
  ctx.rotate(bodyLayout.rotation + poseLayout.rotation);
  const rect = {
    x: bounds.x - worldNeck.x,
    y: bounds.y - worldNeck.y,
    width: bounds.width,
    height: bounds.height
  };
  const mask = activeBodyMask(config, pose);
  if (layer === "front" && mask) {
    drawBodyFrontLayer(ctx, bodySprite, rect, bodyMaskRect(bodyLayout, headWidth, mask), mask, poseLayout, headWidth);
  } else {
    drawBodyWithMirror(ctx, rect, poseLayout, headWidth, () => {
      drawImageRect(ctx, bodySprite, rect);
    });
  }
  ctx.restore();
}

function drawBodyWithMirror(ctx, rect, poseLayout, headWidth, drawOriginal) {
  if (!poseLayout.useMirror) {
    drawOriginal();
    return;
  }
  const reverseAxisX = (poseLayout.reverseAxisX ?? 0) * headWidth;
  const mirrorAxisX = (poseLayout.mirrorAxisX ?? poseLayout.reverseAxisX ?? 0) * headWidth;
  const clipLeft = mirrorAxisX > reverseAxisX ? Math.max(mirrorAxisX, rect.x) : rect.x;
  const clipRight = mirrorAxisX > reverseAxisX ? rect.x + rect.width : Math.min(mirrorAxisX, rect.x + rect.width);
  if (clipRight <= clipLeft) {
    drawOriginal();
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, clipLeft - rect.x, rect.height);
  ctx.rect(clipRight, rect.y, rect.x + rect.width - clipRight, rect.height);
  ctx.clip();
  drawOriginal();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipLeft, rect.y, clipRight - clipLeft, rect.height);
  ctx.clip();
  ctx.translate(reverseAxisX, 0);
  ctx.scale(-1, 1);
  ctx.translate(-reverseAxisX, 0);
  drawOriginal();
  ctx.restore();
}

function drawBodyFrontLayer(ctx, image, rect, maskRect, maskConfig = {}, poseLayout = null, headWidth = 0) {
  const canvasWidth = Math.max(1, Math.ceil(rect.width));
  const canvasHeight = Math.max(1, Math.ceil(rect.height));
  const imageCanvas = createCanvas(canvasWidth, canvasHeight);
  const imageCtx = imageCanvas.getContext("2d");
  drawBodyImageLayer(imageCtx, image, canvasWidth, canvasHeight, rect, poseLayout, headWidth);

  const alphaCanvas = createCanvas(canvasWidth, canvasHeight);
  paintBodyFrontLayerAlpha(alphaCanvas.getContext("2d"), canvasWidth, canvasHeight, rect, maskRect, maskConfig);

  imageCtx.globalCompositeOperation = "destination-in";
  imageCtx.drawImage(alphaCanvas, 0, 0);
  imageCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(imageCanvas, rect.x, rect.y, rect.width, rect.height);
}

function drawBodyImageLayer(imageCtx, image, width, height, rect, poseLayout, headWidth) {
  if (!poseLayout?.useMirror) {
    imageCtx.drawImage(image, 0, 0, width, height);
    return;
  }
  const scaleX = width / rect.width;
  const reverseAxisX = ((poseLayout.reverseAxisX ?? 0) * headWidth - rect.x) * scaleX;
  const mirrorAxisX = ((poseLayout.mirrorAxisX ?? poseLayout.reverseAxisX ?? 0) * headWidth - rect.x) * scaleX;
  const clipLeft = mirrorAxisX > reverseAxisX ? Math.max(mirrorAxisX, 0) : 0;
  const clipRight = mirrorAxisX > reverseAxisX ? width : Math.min(mirrorAxisX, width);
  if (clipRight <= clipLeft) {
    imageCtx.drawImage(image, 0, 0, width, height);
    return;
  }

  imageCtx.save();
  imageCtx.beginPath();
  imageCtx.rect(0, 0, clipLeft, height);
  imageCtx.rect(clipRight, 0, width - clipRight, height);
  imageCtx.clip();
  imageCtx.drawImage(image, 0, 0, width, height);
  imageCtx.restore();

  imageCtx.save();
  imageCtx.beginPath();
  imageCtx.rect(clipLeft, 0, clipRight - clipLeft, height);
  imageCtx.clip();
  imageCtx.translate(reverseAxisX, 0);
  imageCtx.scale(-1, 1);
  imageCtx.translate(-reverseAxisX, 0);
  imageCtx.drawImage(image, 0, 0, width, height);
  imageCtx.restore();
}

function paintBodyFrontLayerAlpha(ctx, width, height, rect, maskRect, maskConfig = {}) {
  const image = ctx.createImageData(width, height);
  const data = image.data;
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;
  const left = (maskRect.x - rect.x) * scaleX;
  const top = (maskRect.y - rect.y) * scaleY;
  const maskWidth = maskRect.width * scaleX;
  const maskHeight = maskRect.height * scaleY;
  const right = left + maskWidth;
  const bottom = top + maskHeight;
  const center = left + maskWidth / 2;
  const halfWidth = Math.max(maskWidth / 2, 1);
  const bottomFeather = maskConfig.bottomFeather;
  const maxFeather = bottomFeather?.enabled ? clamp(bottomFeather.edgeHeight ?? 0.5, 0, 1) * maskHeight : 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let alpha = 1;
      if (x >= left && x <= right) {
        if (y >= top && y <= bottom) {
          alpha = 0;
        } else if (maxFeather > 0 && y > bottom) {
          const centerWeight = 1 - clamp(Math.abs(x - center) / halfWidth, 0, 1);
          const featherHeight = maxFeather * centerWeight;
          if (featherHeight > 0 && y <= bottom + featherHeight) {
            alpha = clamp((y - bottom) / featherHeight, 0, 1);
          }
        }
      }
      data[(y * width + x) * 4 + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
}

function drawImageClipped(ctx, image, imageRect, clipRect) {
  if (clipRect.width <= 0 || clipRect.height <= 0) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
  ctx.clip();
  drawImageRect(ctx, image, imageRect);
  ctx.restore();
}

function bodyMaskRect(bodyLayout, headWidth, mask) {
  return {
    x: (bodyLayout.offset.x + (mask.x ?? -0.25)) * headWidth,
    y: (bodyLayout.offset.y + (mask.y ?? -0.18)) * headWidth,
    width: (mask.width ?? 0.5) * headWidth,
    height: (mask.height ?? 0.34) * headWidth
  };
}

function activeBodyMask(config, pose) {
  const globalMask = config.layout.bodyMask;
  const mode = config.layout.bodyMaskMode ?? (globalMask?.enabled ? "global" : "none");
  if (mode === "none" || !globalMask) {
    return null;
  }
  if (mode === "perPose") {
    return config.layout.bodyMaskPoses?.[`pose_${pose}`] ?? globalMask;
  }
  return globalMask;
}

function updateBodyPoseGesture(runtime, state, now, viewport) {
  const config = runtime.config.interactions?.bodyPoseChange ?? {};
  const handTrackingEnabled = viewport.trackingMode === "face-hands" && runtime.config.game?.enable_hand_tracking !== false;

  if (config.trigger === "off" || config.enabled === false) {
    return;
  }

  if (handTrackingEnabled) {
    updateHandTrackingModeTimeout(runtime, config, now);
  }

  updateMouthPoseGesture(runtime, state.face.expressions, config, now, runtime.handTrackingModeActive);

  if (handTrackingEnabled) {
    updateTaggedHandPoseGesture(runtime, state, config, now);
  } else if (runtime.handLockedPose !== null) {
    releaseHandLockedPose(runtime);
  }
}

function updateHandTrackingModeTimeout(runtime, config, now) {
  if (!runtime.handTrackingModeActive) {
    return;
  }

  const handConfig = config.handTracking ?? config.handRaise ?? {};
  const idleMs = handConfig.idleMs ?? runtime.config.game?.hand_tracking_idle_ms ?? DEFAULT_HAND_TRACKING_IDLE_MS;
  if (now - runtime.lastHandGestureAt <= idleMs) {
    return;
  }

  runtime.handTrackingModeActive = false;
  runtime.activeHandTrackingTag = null;
  if (runtime.handLockedPose !== null) {
    releaseHandLockedPose(runtime);
  }
}

function updateMouthPoseGesture(runtime, expressions, config, now, handTrackingEnabled = false) {
  const mouthConfig = config.mouthOpen ?? {};
  const changeThreshold = mouthConfig.changeThreshold ?? DEFAULT_MOUTH_POSE_CHANGE_THRESHOLD;
  const heldThreshold = mouthConfig.heldThreshold ?? DEFAULT_MOUTH_POSE_CHANGE_HELD_THRESHOLD;
  const releaseThreshold = mouthConfig.releaseThreshold ?? DEFAULT_MOUTH_POSE_CHANGE_RELEASE_THRESHOLD;
  const holdMs = mouthConfig.holdMs ?? DEFAULT_MOUTH_POSE_CHANGE_HOLD_MS;
  const cooldownMs = config.cooldownMs ?? DEFAULT_POSE_CHANGE_COOLDOWN_MS;
  const mouthVeryOpen = expressions.mouthOpen > changeThreshold;
  const mouthHeldOpen = expressions.mouthOpen > heldThreshold;

  if (mouthHeldOpen) {
    runtime.mouthPoseStartedAt ??= now;
  } else if (expressions.mouthOpen < releaseThreshold) {
    runtime.mouthPoseStartedAt = null;
  }

  const heldLongEnough = runtime.mouthPoseStartedAt !== null && now - runtime.mouthPoseStartedAt >= holdMs;

  if ((mouthVeryOpen || heldLongEnough) && !runtime.mouthWasVeryOpen && now - runtime.lastPoseChangeAt > cooldownMs) {
    advanceBodyPose(runtime, now, handTrackingEnabled);
    runtime.mouthWasVeryOpen = true;
  }

  if (expressions.mouthOpen < releaseThreshold) {
    runtime.mouthWasVeryOpen = false;
  } else if (mouthVeryOpen) {
    runtime.mouthWasVeryOpen = true;
  }
}

function advanceBodyPose(runtime, now, handTrackingEnabled = false) {
  runtime.restingPose = nextMouthPose(runtime, handTrackingEnabled);
  if (runtime.handLockedPose === null) {
    runtime.pose = runtime.restingPose;
    runtime.poseFlipX = false;
  }
  runtime.lastPoseChangeAt = now;
}

function nextMouthPose(runtime, handTrackingEnabled) {
  const pool = mouthPosePool(runtime, handTrackingEnabled);
  const currentIndex = pool.indexOf(runtime.restingPose);

  if (currentIndex === -1) {
    return pool[0] ?? runtime.config.layout.body.startPose ?? 5;
  }

  return pool[(currentIndex + 1) % pool.length];
}

function mouthPosePool(runtime, handTrackingEnabled) {
  if (!handTrackingEnabled) {
    return allBodyPoseNumbers(runtime.config);
  }

  const untagged = allBodyPoseNumbers(runtime.config).filter((pose) => {
    const poseLayout = runtime.config.layout.bodyPoses?.[`pose_${pose}`];
    return !poseLayout?.handTracking;
  });

  return untagged.length ? untagged : allBodyPoseNumbers(runtime.config);
}

function allBodyPoseNumbers(config) {
  const poses = Object.keys(config.layout.bodyPoses ?? {})
    .map((name) => Number(name.replace("pose_", "")))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  return poses.length ? poses : Array.from({ length: BODY_POSE_COUNT }, (_, index) => index + 1);
}

function updateTaggedHandPoseGesture(runtime, state, config, now) {
  const handConfig = config.handTracking ?? config.handRaise ?? {};
  const sampleIntervalMs = handConfig.sampleIntervalMs ?? DEFAULT_HAND_TRACKING_SAMPLE_INTERVAL_MS;

  if (now - runtime.lastHandRaiseCheckAt < sampleIntervalMs) {
    return;
  }
  runtime.lastHandRaiseCheckAt = now;

  const gesture = detectHandTrackingGesture(state, runtime.activeHandTrackingTag, handConfig);
  const match = gesture ? findHandTrackingPose(runtime.config, gesture) : null;

  if (match) {
    runtime.handTrackingModeActive = true;
    runtime.lastHandGestureAt = now;
    runtime.activeHandTrackingTag = match.tag;
    runtime.handLockedPose = match.pose;
    runtime.handLockedFlipX = match.flipX;
    runtime.pose = match.pose;
    runtime.poseFlipX = match.flipX;
    return;
  }

  if (runtime.handLockedPose !== null) {
    releaseHandLockedPose(runtime);
  }
}

function releaseHandLockedPose(runtime) {
  runtime.activeHandTrackingTag = null;
  runtime.handLockedPose = null;
  runtime.handLockedFlipX = false;
  runtime.restingPose = runtime.config.layout.body.startPose ?? 5;
  runtime.pose = runtime.restingPose;
  runtime.poseFlipX = false;
}

function findHandTrackingPose(config, gesture) {
  const poses = config.layout.bodyPoses ?? {};
  const candidates = handTrackingCandidateTags(gesture);

  for (const candidate of candidates) {
    const entry = Object.entries(poses).find(([, pose]) => pose.handTracking === candidate.tag);
    if (!entry) {
      continue;
    }
    const pose = Number(entry[0].replace("pose_", ""));
    if (!Number.isFinite(pose)) {
      continue;
    }
    return {
      pose,
      tag: candidate.tag,
      flipX: candidate.flipX
    };
  }

  return null;
}

function handTrackingCandidateTags(gesture) {
  if (gesture === "bothRaised") {
    return [{ tag: "bothRaised", flipX: false }];
  }
  if (gesture === "bothMiddle") {
    return [{ tag: "bothMiddle", flipX: false }];
  }
  if (gesture === "leftRaised") {
    return [
      { tag: "leftRaised", flipX: false },
      { tag: "leftRaisedReverse", flipX: false },
      { tag: "rightRaisedReverse", flipX: true }
    ];
  }
  if (gesture === "rightRaised") {
    return [
      { tag: "rightRaised", flipX: false },
      { tag: "rightRaisedReverse", flipX: false },
      { tag: "leftRaisedReverse", flipX: true }
    ];
  }
  return [];
}

function detectHandTrackingGesture(state, activeTag, handConfig) {
  if (!state.hands?.length || !state.face?.tracked) {
    return null;
  }

  const hands = handSummaryBySide(state.hands);
  const face = state.face;
  const raisedFaceLevel = activeTag?.includes("Raised")
    ? (handConfig.releaseFaceLevel ?? DEFAULT_HAND_RAISE_RELEASE_FACE_LEVEL)
    : (handConfig.faceLevel ?? DEFAULT_HAND_RAISE_FACE_LEVEL);
  const middleFaceOffset = activeTag === "bothMiddle"
    ? (handConfig.middleReleaseFaceOffset ?? DEFAULT_HAND_MIDDLE_RELEASE_FACE_OFFSET)
    : (handConfig.middleFaceOffset ?? DEFAULT_HAND_MIDDLE_FACE_OFFSET);
  const raisedThreshold = face.center.y + face.size * raisedFaceLevel;
  const middleThreshold = face.size * middleFaceOffset;
  const leftRaised = Boolean(hands.left?.wrist && hands.left.wrist.y <= raisedThreshold);
  const rightRaised = Boolean(hands.right?.wrist && hands.right.wrist.y <= raisedThreshold);
  const leftMiddle = Boolean(hands.left?.wrist && Math.abs(hands.left.wrist.x - face.center.x) <= middleThreshold);
  const rightMiddle = Boolean(hands.right?.wrist && Math.abs(hands.right.wrist.x - face.center.x) <= middleThreshold);

  if (leftRaised && rightRaised) {
    return "bothRaised";
  }
  if (leftMiddle && rightMiddle) {
    return "bothMiddle";
  }
  if (leftRaised) {
    return "leftRaised";
  }
  if (rightRaised) {
    return "rightRaised";
  }
  return null;
}

function handSummaryBySide(hands) {
  const summary = { left: null, right: null };

  for (const hand of hands) {
    const wrist = hand.landmarks?.[0];
    if (!wrist) {
      continue;
    }
    const label = String(hand.label ?? "").toLowerCase();
    const side = label.includes("right") ? "right" : label.includes("left") ? "left" : wrist.x < 0.5 ? "left" : "right";
    summary[side] ??= { wrist };
  }

  return summary;
}

function updateHandRaisePoseGesture(runtime, state, config, now) {
  const handConfig = config.handRaise ?? {};
  const sampleIntervalMs = handConfig.sampleIntervalMs ?? DEFAULT_HAND_RAISE_SAMPLE_INTERVAL_MS;

  if (now - runtime.lastHandRaiseCheckAt < sampleIntervalMs) {
    return;
  }
  runtime.lastHandRaiseCheckAt = now;

  const cooldownMs = config.cooldownMs ?? DEFAULT_POSE_CHANGE_COOLDOWN_MS;
  const handRaised = isHandRaised(state, runtime.handRaiseActive, handConfig);

  if (handRaised && !runtime.handRaiseActive && now - runtime.lastPoseChangeAt > cooldownMs) {
    advanceBodyPose(runtime, now);
  }

  runtime.handRaiseActive = handRaised;
}

function isHandRaised(state, wasRaised, handConfig) {
  const enterY = handConfig.enterY ?? DEFAULT_HAND_RAISE_ENTER_Y;
  const exitY = handConfig.exitY ?? DEFAULT_HAND_RAISE_EXIT_Y;
  const faceOffset = handConfig.faceOffset ?? DEFAULT_HAND_RAISE_FACE_OFFSET;
  const releaseFaceOffset = handConfig.releaseFaceOffset ?? DEFAULT_HAND_RAISE_RELEASE_FACE_OFFSET;
  const fixedThreshold = wasRaised ? exitY : enterY;
  const relativeThreshold = state.face.tracked
    ? state.face.center.y + state.face.size * (wasRaised ? releaseFaceOffset : faceOffset)
    : fixedThreshold;
  const threshold = Math.min(fixedThreshold, relativeThreshold);

  return state.hands.some((hand) => {
    const wrist = hand.landmarks[0];
    return wrist && wrist.y < threshold;
  });
}

function calculateBodyBounds(runtime, worldNeck, headWidth, pose = runtime.pose) {
  const { config, images } = runtime;
  const spriteName = `pose_${pose}`;
  const bodySprite = images[spriteName];
  const bodyConfig = config.sprites.body[spriteName];
  const bodyLayout = config.layout.body;
  const poseLayout = config.layout.bodyPoses?.[spriteName] ?? {
    offset: { x: 0, y: 0 },
    scale: 1,
    rotation: 0
  };
  const heightPerHead = bodyLayout.heightPerHead ?? bodyLayout.widthPerHead ?? 1.2;
  const bodyWidth = headWidth * heightPerHead * (bodySprite.naturalWidth / bodySprite.naturalHeight) * scaleXValue(bodyLayout) * scaleXValue(poseLayout);
  const bodyHeight = headWidth * heightPerHead * scaleYValue(bodyLayout) * scaleYValue(poseLayout);
  const bodyX = -bodyConfig.neck.x * bodyWidth + (bodyLayout.offset.x + poseLayout.offset.x) * headWidth;
  const bodyY = -bodyConfig.neck.y * bodyHeight + (bodyLayout.offset.y + poseLayout.offset.y) * headWidth;

  return {
    x: worldNeck.x + bodyX,
    y: worldNeck.y + bodyY,
    width: bodyWidth,
    height: bodyHeight
  };
}

function calculateMaxBodyBottom(runtime, worldNeck, headWidth) {
  const poses = Object.keys(runtime.config.layout.bodyPoses ?? {})
    .map((name) => Number(name.replace("pose_", "")))
    .filter((pose) => Number.isFinite(pose) && runtime.images[`pose_${pose}`] && runtime.config.sprites.body[`pose_${pose}`]);
  if (poses.length === 0) {
    return calculateBodyBounds(runtime, worldNeck, headWidth).y + calculateBodyBounds(runtime, worldNeck, headWidth).height;
  }
  return Math.max(
    ...poses.map((pose) => {
      const bounds = calculateBodyBounds(runtime, worldNeck, headWidth, pose);
      return bounds.y + bounds.height;
    })
  );
}

function drawEyesAndBrows(ctx, runtime, expressions, headRect, now, faceSprite) {
  const { config, images } = runtime;
  const leftClosed = expressions.leftEyeClosed > EYE_CLOSED_THRESHOLD;
  const rightClosed = expressions.rightEyeClosed > RIGHT_EYE_CLOSED_THRESHOLD;
  const browLift = expressions.browRaise * 0.035;
  const drawsOpenEyes = !faceSprite?.hasOpenEyes;
  const mouthLayout = config.layout.mouth?.[runtime.activeMouth];
  const drawsClosedEyes = !(faceSprite?.suppressClosedEyeOverlay || mouthLayout?.noClosedEyes);
  const reverseEyes = Boolean(config.layout.reverseEyes);

  if (drawsOpenEyes || (drawsClosedEyes && leftClosed)) {
    const leftEyeSide = reverseEyes ? "right" : "left";
    const leftEyeName = `${leftEyeSide}_eye_${leftClosed ? "closed" : "open"}`;
    drawPart(ctx, images[leftEyeName], config.sprites.faces[leftEyeName], config.layout.parts.leftEye, headRect);
  }
  if (drawsOpenEyes || (drawsClosedEyes && rightClosed)) {
    const rightEyeSide = reverseEyes ? "left" : "right";
    const rightEyeName = `${rightEyeSide}_eye_${rightClosed ? "closed" : "open"}`;
    drawPart(ctx, images[rightEyeName], config.sprites.faces[rightEyeName], config.layout.parts.rightEye, headRect);
  }

  const browBob = Math.sin(now / 220) * expressions.browRaise * 0.006;
  const leftBrowName = reverseEyes ? "right_brow" : "left_brow";
  const rightBrowName = reverseEyes ? "left_brow" : "right_brow";
  drawPart(
    ctx,
    images[leftBrowName],
    config.sprites.faces[leftBrowName],
    { ...config.layout.parts.leftBrow, y: config.layout.parts.leftBrow.y - browLift + browBob },
    headRect
  );
  drawPart(
    ctx,
    images[rightBrowName],
    config.sprites.faces[rightBrowName],
    { ...config.layout.parts.rightBrow, y: config.layout.parts.rightBrow.y - browLift + browBob },
    headRect
  );
}

function drawExtensions(ctx, runtime, headRect, face, faceCenter, now) {
  const { config, images } = runtime;
  const extensions = config.layout.extensions ?? {};
  for (const [name, layout] of Object.entries(extensions)) {
    if (layout.enabled === false) {
      continue;
    }
    const spriteName = layout.sprite ?? name;
    const image = images[spriteName];
    const sprite = config.sprites.extensions?.[spriteName];
    if (!image || !sprite) {
      continue;
    }
    const anchor = extensionAnchorPoint(layout, headRect, face, faceCenter);
    const angle = extensionHangingAngle(runtime, layout, name, face, anchor, now);
    drawExtension(ctx, image, sprite, layout, headRect, angle);
  }
}

function extensionAnchorPoint(layout, headRect, face, faceCenter) {
  const localAnchor = {
    x: headRect.x + layout.x * headRect.width,
    y: headRect.y + layout.y * headRect.height
  };
  const rotated = rotatePoint(localAnchor, face.rotation ?? 0);
  return {
    x: faceCenter.x + rotated.x,
    y: faceCenter.y + rotated.y
  };
}

function extensionHangingAngle(runtime, layout, name, face, anchor, now) {
  const rotation = face.rotation ?? 0;
  const physics = { ...EXTENSION_PHYSICS, ...(layout.physics ?? {}) };
  const maxSwing = physics.maxSwing ?? 0.55;
  const swingLimits = extensionSwingLimits(layout, name, maxSwing);
  const inferredDirection = inferExtensionSwingDirection(name);
  const isBackHair = inferredDirection === "back" || inferredDirection === "back_physics";
  const targetAngle = isBackHair ? 0 : clamp(-rotation * (physics.gravityInfluence ?? 1), swingLimits.min, swingLimits.max);
  if (!extensionUsesMotionPhysics(layout, name)) {
    return targetAngle;
  }
  return updateExtensionPhysicsAngle(
    runtime,
    name,
    targetAngle,
    swingLimits,
    physics,
    now,
    anchor,
    isBackHair ? rotation : 0
  );
}

function extensionUsesMotionPhysics(layout, name) {
  return /_physics$/.test(name) || layout.motion === "physics" || layout.physics?.enabled === true;
}

function updateExtensionPhysicsAngle(runtime, name, targetAngle, swingLimits, physics, now, characterAnchor, parentRotation = 0) {
  const states = (runtime.extensionPhysicsStates ??= {});
  const state = (states[name] ??= {
    worldAngle: parentRotation + targetAngle,
    velocity: 0,
    updatedAt: now,
    anchor: characterAnchor,
    smoothedAnchor: characterAnchor,
    anchorVelocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 }
  });
  if (state.worldAngle === undefined) {
    const localAngle = state.angle ?? targetAngle + (state.offset ?? 0);
    state.worldAngle = parentRotation + localAngle;
    state.velocity = 0;
    delete state.angle;
    delete state.offset;
  }
  const elapsed = clamp((now - state.updatedAt) / 1000, 0, 0.05);
  state.updatedAt = now;
  if (elapsed <= 0) {
    state.anchor = characterAnchor;
    state.smoothedAnchor = characterAnchor;
    const localAngle = clamp(normalizeAngle(state.worldAngle - parentRotation), swingLimits.min, swingLimits.max);
    state.worldAngle = parentRotation + localAngle;
    return localAngle;
  }

  const inputSmoothing = clamp(physics.inputSmoothing ?? 0.24, 0, 1);
  state.smoothedAnchor = {
    x: lerp(state.smoothedAnchor.x, characterAnchor.x, inputSmoothing),
    y: lerp(state.smoothedAnchor.y, characterAnchor.y, inputSmoothing)
  };

  const anchorVelocity = {
    x: (state.smoothedAnchor.x - state.anchor.x) / elapsed,
    y: (state.smoothedAnchor.y - state.anchor.y) / elapsed
  };
  const rawAcceleration = {
    x: (anchorVelocity.x - state.anchorVelocity.x) / elapsed,
    y: (anchorVelocity.y - state.anchorVelocity.y) / elapsed
  };
  const smoothing = clamp(physics.accelerationSmoothing ?? 0.28, 0, 1);
  state.acceleration = {
    x: lerp(state.acceleration.x, rawAcceleration.x, smoothing),
    y: lerp(state.acceleration.y, rawAcceleration.y, smoothing)
  };
  state.anchor = state.smoothedAnchor;
  state.anchorVelocity = anchorVelocity;

  const gravity = physics.motionGravity ?? 2400;
  const influence = physics.motionInfluence ?? 1;
  const effectiveForce = {
    x: -state.acceleration.x * influence,
    y: gravity - state.acceleration.y * influence
  };
  const worldForceAngle = Math.atan2(effectiveForce.x, effectiveForce.y);
  const desiredWorldAngle = biasedExtensionStableAngle(worldForceAngle, { min: -Math.PI, max: Math.PI }, physics);
  const desiredLocalAngle = clamp(normalizeAngle(desiredWorldAngle - parentRotation), swingLimits.min, swingLimits.max);
  const clampedDesiredWorldAngle = parentRotation + desiredLocalAngle;

  state.velocity += normalizeAngle(clampedDesiredWorldAngle - state.worldAngle) * (physics.angularStiffness ?? 38) * elapsed;
  state.velocity *= Math.exp(-(physics.angularDamping ?? 8) * elapsed);
  state.worldAngle += state.velocity * elapsed;
  const localAngle = normalizeAngle(state.worldAngle - parentRotation);
  const clampedLocalAngle = clamp(localAngle, swingLimits.min, swingLimits.max);
  if (clampedLocalAngle !== localAngle) {
    state.worldAngle = parentRotation + clampedLocalAngle;
    state.velocity = 0;
  }
  return clampedLocalAngle;
}

function biasedExtensionStableAngle(desiredAngle, swingLimits, physics) {
  const stableAngle = physics.stableAngle ?? 0;
  const delta = normalizeAngle(desiredAngle - stableAngle);
  const holdAngle = Math.max(0, physics.stableHoldAngle ?? 0.08);
  const fullAngle = Math.max(holdAngle, physics.stableFullAngle ?? 0.5);
  const gravityStrength = smoothstep(holdAngle, fullAngle, Math.abs(delta));
  return clamp(stableAngle + delta * gravityStrength, swingLimits.min, swingLimits.max);
}

function extensionSwingLimits(layout, name, maxSwing) {
  const inferredDirection = inferExtensionSwingDirection(name);
  const direction = inferredDirection === "back" || inferredDirection === "back_physics" ? inferredDirection : (layout.swingDirection ?? inferredDirection);
  if (direction === "left" || direction === 1) {
    return { min: 0, max: maxSwing };
  }
  if (direction === "right" || direction === -1) {
    return { min: -maxSwing, max: 0 };
  }
  return { min: -maxSwing, max: maxSwing };
}

function inferExtensionSwingDirection(name) {
  if (/_left$/.test(name)) {
    return "left";
  }
  if (/_right$/.test(name)) {
    return "right";
  }
  if (/_back_physics$/.test(name)) {
    return "back_physics";
  }
  if (/_back$/.test(name)) {
    return "back";
  }
  return null;
}

function drawExtension(ctx, image, sprite, layout, headRect, swingAngle = 0) {
  const width = headRect.width * (sprite.size[0] / sprite.size[1]) * scaleXValue(layout);
  const height = headRect.width * scaleYValue(layout);
  const pivot = layout.pivot ?? { x: 0.5, y: 0.04 };
  const x = headRect.x + layout.x * headRect.width;
  const y = headRect.y + layout.y * headRect.height;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((layout.rotation ?? 0) + swingAngle);
  if (layout.flipX) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(image, -pivot.x * width, -pivot.y * height, width, height);
  ctx.restore();
}

function drawPart(ctx, image, sprite, part, headRect) {
  const [sx, sy, sx2, sy2] = sprite.trim;
  const sourceWidth = sx2 - sx;
  const sourceHeight = sy2 - sy;
  const baseWidth = headRect.width * (sourceWidth / sprite.size[0]);
  const baseHeight = baseWidth * (sourceHeight / sourceWidth);
  const width = baseWidth * scaleXValue(part);
  const height = baseHeight * scaleYValue(part);
  const x = headRect.x + part.x * headRect.width;
  const y = headRect.y + part.y * headRect.height;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(part.rotation);
  ctx.drawImage(image, sx, sy, sourceWidth, sourceHeight, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function pickMouthSprite(runtime, expressions, now) {
  const config = runtime.config.interactions?.mouthExpressions ?? {};
  const expressionSprite = pickExpressionSprite(runtime, expressions, config, now);
  if (expressionSprite) {
    return setActiveMouth(runtime, expressionSprite);
  }

  const frown = updateHeldMouthCandidate(runtime, "frown", frownCandidate(expressions, config.frown), now);
  const pucker = updateHeldMouthCandidate(runtime, "pucker", puckerCandidate(expressions, config.pucker), now);
  const puckerScore = Math.max(expressions.mouthPucker, expressions.mouthFunnel);
  const holdingPucker = runtime.puckerStartedAt !== null && pucker.valid && puckerScore > pucker.releaseThreshold;
  const holdingFrown = runtime.activeMouth === "mouth_frown" && frown.valid && expressions.frown > frown.releaseThreshold;
  const specialMouthBuilding = pucker.building || frown.building;

  if (pucker.triggered || holdingPucker) {
    return setActiveMouth(runtime, "mouth_closed", { keepPuckerStart: true });
  }

  if (frown.triggered || holdingFrown) {
    return setActiveMouth(runtime, "mouth_frown", { keepFrownStart: true });
  }

  if (expressions.smile > (config.smileThreshold ?? SMILE_THRESHOLD)) {
    return setActiveMouth(runtime, "mouth_smile");
  }

  const holdingOpenMouth =
    runtime.activeMouth === "mouth_open" &&
    expressions.mouthOpen > (config.openReleaseThreshold ?? MOUTH_TALK_CLOSE_THRESHOLD);
  if (!specialMouthBuilding && (expressions.mouthOpen > (config.openThreshold ?? MOUTH_TALK_OPEN_THRESHOLD) || holdingOpenMouth)) {
    return setActiveMouth(runtime, "mouth_open");
  }

  return setActiveMouth(runtime, "mouth_closed", {
    keepFrownStart: frown.building,
    keepPuckerStart: pucker.building
  });
}

function pickTalkingSprite(runtime, expressions, now = 0) {
  const available = runtime.config.sprites.talking ?? {};
  if (runtime.activeMouth === "mouth_tongue") {
    runtime.activeTalking = null;
    return null;
  }

  if (now < runtime.bubbleWideMouthUntil) {
    const popMouth = available.talking_mouth_big_open ? "talking_mouth_big_open" : "talking_mouth_wide";
    if (available[popMouth] && runtime.images[popMouth]) {
      runtime.activeTalking = popMouth;
      return popMouth;
    }
  }

  const puckerScore = Math.max(expressions.mouthPucker, expressions.mouthFunnel);
  const open = expressions.mouthOpen;
  const wide = Math.max(expressions.mouthStretch, expressions.smile);
  let spriteName = null;

  if (puckerScore > TALKING_PUCKER_THRESHOLD && open < TALKING_MEDIUM_OPEN_THRESHOLD) {
    spriteName = "talking_mouth_pucker";
  } else if (wide > TALKING_TEETH_THRESHOLD && open > TALKING_SMALL_OPEN_THRESHOLD && available.talking_mouth_teeth) {
    spriteName = "talking_mouth_teeth";
  } else if (wide > TALKING_WIDE_THRESHOLD && open > TALKING_MEDIUM_OPEN_THRESHOLD) {
    spriteName = "talking_mouth_wide";
  } else if (open > TALKING_BIG_OPEN_THRESHOLD) {
    spriteName = "talking_mouth_big_open";
  } else if (open > TALKING_MEDIUM_OPEN_THRESHOLD) {
    spriteName = "talking_mouth_medium_open";
  } else if (open > TALKING_SMALL_OPEN_THRESHOLD) {
    spriteName = "talking_mouth_small_open";
  }

  if (!spriteName || !available[spriteName] || !runtime.images[spriteName]) {
    runtime.activeTalking = null;
    return null;
  }

  runtime.activeTalking = spriteName;
  return spriteName;
}

function pickExpressionSprite(runtime, expressions, config = {}, now = 0) {
  const talkingMode = isTalkingExpressionMode(runtime, expressions, config);
  const tongueOut = pickTongueOutSprite(runtime, expressions, config, now);
  if (tongueOut) {
    return tongueOut;
  }

  const laugh = pickLaughSprite(runtime, expressions, config.laughter, now);
  if (laugh) {
    return laugh;
  }

  if (expressions.mouthOpen > (config.bigOpenThreshold ?? BIG_OPEN_THRESHOLD)) {
    return resolveFaceSprite(runtime, "mouth_big_open");
  }

  if (
    expressions.surprise > (config.surpriseThreshold ?? SURPRISE_THRESHOLD) &&
    expressions.eyeWide > 0.28 &&
    expressions.mouthOpen > 0.34
  ) {
    return resolveFaceSprite(runtime, "expression_surprise");
  }

  const fear = pickHeldTalkingExpression(
    runtime,
    "expression_fear",
    expressions.fear > (config.fearThreshold ?? FEAR_THRESHOLD) && expressions.eyeWide > 0.24 && expressions.smile < 0.35,
    talkingMode,
    now,
    config
  );
  if (fear) {
    return fear;
  }

  const disgust = pickHeldTalkingExpression(
    runtime,
    "expression_disgust",
    expressions.disgust > (config.disgustThreshold ?? DISGUST_THRESHOLD) && expressions.smile < 0.36,
    talkingMode,
    now,
    config
  );
  if (disgust) {
    return disgust;
  }

  const angry = pickHeldTalkingExpression(
    runtime,
    "expression_angry",
    expressions.angry > (config.angryThreshold ?? ANGRY_THRESHOLD) && expressions.smile < 0.34,
    talkingMode,
    now,
    config
  );
  if (angry) {
    return angry;
  }

  const squint = pickHeldTalkingExpression(
    runtime,
    "expression_squint",
    expressions.suspicious > (config.squintThreshold ?? SQUINT_THRESHOLD) && expressions.mouthOpen < 0.42,
    talkingMode,
    now,
    config
  );
  if (squint) {
    return squint;
  }

  const thinking = pickHeldTalkingExpression(
    runtime,
    "expression_thinking",
    expressions.thinking > (config.thinkingThreshold ?? THINKING_THRESHOLD) && expressions.mouthOpen < 0.42,
    talkingMode,
    now,
    config
  );
  if (thinking) {
    return thinking;
  }

  const smirkLeft = pickHeldTalkingExpression(
    runtime,
    "expression_smirk_left",
    expressions.smirkLeft > (config.smirkThreshold ?? SMIRK_THRESHOLD) && expressions.mouthOpen < 0.45,
    talkingMode,
    now,
    config
  );
  if (smirkLeft) {
    return smirkLeft;
  }

  const smirkRight = pickHeldTalkingExpression(
    runtime,
    "expression_smirk_right",
    expressions.smirkRight > (config.smirkThreshold ?? SMIRK_THRESHOLD) && expressions.mouthOpen < 0.45,
    talkingMode,
    now,
    config
  );
  if (smirkRight) {
    return smirkRight;
  }

  return null;
}

function pickTongueOutSprite(runtime, expressions, config = {}, now = 0) {
  if (runtime.gameConfig?.enable_tongue_out_detection === false) {
    runtime.tongueOutStartedAt = null;
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = "disabled";
    runtime.lastTongueBlendshapeScore = expressions.tongueOut ?? 0;
    runtime.lastTongueCombinedScore = 0;
    return null;
  }

  const threshold = runtime.gameConfig?.tongue_out_threshold ?? config.tongueOutThreshold ?? TONGUE_OUT_THRESHOLD;
  const releaseThreshold =
    runtime.gameConfig?.tongue_out_release_threshold ?? config.tongueOutReleaseThreshold ?? TONGUE_OUT_RELEASE_THRESHOLD;
  const holdMs = runtime.gameConfig?.tongue_out_hold_ms ?? config.tongueOutHoldMs ?? TONGUE_OUT_HOLD_MS;
  runtime.lastTongueBlendshapeScore = expressions.tongueOut ?? 0;
  const blendshapeScore =
    runtime.gameConfig?.enable_tongue_blendshape_detection === true ? runtime.lastTongueBlendshapeScore : 0;
  const tongueScore = Math.max(blendshapeScore, runtime.tongueOutColorScore ?? 0);
  runtime.lastTongueCombinedScore = tongueScore;

  if (tongueScore >= threshold) {
    runtime.tongueOutStartedAt ??= now;
  } else if (tongueScore < releaseThreshold) {
    runtime.tongueOutStartedAt = null;
  }

  if (runtime.tongueOutStartedAt === null || now - runtime.tongueOutStartedAt < holdMs) {
    return null;
  }

  return resolveFaceSprite(runtime, "mouth_tongue");
}

function updateTongueColorDetection(runtime, state, viewport, expressions) {
  if (
    runtime.gameConfig?.enable_tongue_out_detection === false ||
    runtime.gameConfig?.enable_tongue_color_detection === false ||
    viewport.mode !== "camera" ||
    !viewport.video
  ) {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason =
      runtime.gameConfig?.enable_tongue_out_detection === false
        ? "gesture-disabled"
        : runtime.gameConfig?.enable_tongue_color_detection === false
          ? "color-disabled"
          : viewport.mode !== "camera"
            ? "not-camera-mode"
            : "missing-video";
    return;
  }

  const minMouthOpen = runtime.gameConfig?.tongue_color_min_mouth_open ?? TONGUE_COLOR_MIN_MOUTH_OPEN;
  if (expressions.mouthOpen < minMouthOpen) {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = "mouth-open-too-low";
    return;
  }

  const minLowerDown = runtime.gameConfig?.tongue_color_min_lower_down ?? TONGUE_COLOR_MIN_LOWER_DOWN;
  if ((expressions.mouthLowerDown ?? 0) < minLowerDown) {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = "lower-lip-not-down";
    return;
  }

  const maxPucker = runtime.gameConfig?.tongue_color_max_pucker ?? TONGUE_COLOR_MAX_PUCKER;
  if (Math.max(expressions.mouthPucker ?? 0, expressions.mouthFunnel ?? 0) > maxPucker) {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = "mouth-too-puckered";
    return;
  }

  const maxSmile = runtime.gameConfig?.tongue_color_max_smile ?? TONGUE_COLOR_MAX_SMILE;
  if ((expressions.smile ?? 0) > maxSmile) {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = "mouth-too-smiley";
    return;
  }

  const landmarks = state.raw?.face?.faceLandmarks?.[0] ?? [];
  const video = viewport.video;
  if (!landmarks.length || !video.videoWidth || !video.videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = !landmarks.length
      ? "missing-landmarks"
      : !video.videoWidth || !video.videoHeight
        ? "missing-video-size"
        : "video-not-ready";
    return;
  }

  const crop = mouthSampleCrop(landmarks, video.videoWidth, video.videoHeight);
  if (!crop) {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = "missing-mouth-crop";
    return;
  }
  runtime.tongueOutColorCrop = crop;

  const sample = getTongueSampleContext(runtime);
  sample.ctx.clearRect(0, 0, TONGUE_COLOR_SAMPLE_WIDTH, TONGUE_COLOR_SAMPLE_HEIGHT);
  try {
    sample.ctx.drawImage(
      video,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      TONGUE_COLOR_SAMPLE_WIDTH,
      TONGUE_COLOR_SAMPLE_HEIGHT
    );
  } catch {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = 0;
    runtime.tongueOutDarkRatio = 0;
    runtime.tongueOutColorReason = "draw-video-failed";
    return;
  }

  const image = sample.ctx.getImageData(0, 0, TONGUE_COLOR_SAMPLE_WIDTH, TONGUE_COLOR_SAMPLE_HEIGHT).data;
  const stats = tongueColorStats(image, TONGUE_COLOR_SAMPLE_WIDTH, TONGUE_COLOR_SAMPLE_HEIGHT);
  const ratio = stats.tongueRatio;
  const darkRatio = stats.darkRatio;
  const maxDarkRatio = runtime.gameConfig?.tongue_color_max_dark_ratio ?? TONGUE_COLOR_MAX_DARK_RATIO;
  runtime.tongueOutDarkRatio = darkRatio;
  if (darkRatio > maxDarkRatio) {
    runtime.tongueOutColorScore = 0;
    runtime.tongueOutColorRatio = ratio;
    runtime.tongueOutColorReason = "mouth-too-dark";
    return;
  }

  const minRatio = runtime.gameConfig?.tongue_color_min_ratio ?? TONGUE_COLOR_MIN_RATIO;
  const targetRatio = runtime.gameConfig?.tongue_color_target_ratio ?? TONGUE_COLOR_TARGET_RATIO;
  runtime.tongueOutColorRatio = ratio;
  runtime.tongueOutColorScore = clamp((ratio - minRatio) / Math.max(0.01, targetRatio - minRatio), 0, 1);
  runtime.tongueOutColorReason = runtime.tongueOutColorScore > 0 ? "sampled" : "ratio-too-low";
}

function mouthSampleCrop(landmarks, sourceWidth, sourceHeight) {
  const points = [
    13, 14, 17, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 191, 291, 308, 310, 311, 312, 314, 317, 318, 321,
    324, 375, 402, 405, 415
  ]
    .map((index) => landmarks[index])
    .filter(Boolean);
  if (!points.length) {
    return null;
  }

  const minX = Math.min(...points.map((point) => point.x)) * sourceWidth;
  const maxX = Math.max(...points.map((point) => point.x)) * sourceWidth;
  const minY = Math.min(...points.map((point) => point.y)) * sourceHeight;
  const maxY = Math.max(...points.map((point) => point.y)) * sourceHeight;
  const width = Math.max(8, maxX - minX);
  const height = Math.max(8, maxY - minY);
  const cropWidth = width * 1.45;
  const cropHeight = height * 2.35;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2 + height * 0.32;
  const x = clamp(centerX - cropWidth / 2, 0, sourceWidth - 1);
  const y = clamp(centerY - cropHeight / 2, 0, sourceHeight - 1);

  return {
    x,
    y,
    width: Math.max(1, Math.min(cropWidth, sourceWidth - x)),
    height: Math.max(1, Math.min(cropHeight, sourceHeight - y))
  };
}

function getTongueSampleContext(runtime) {
  if (!runtime.tongueOutSampleCanvas) {
    runtime.tongueOutSampleCanvas = document.createElement("canvas");
    runtime.tongueOutSampleCanvas.width = TONGUE_COLOR_SAMPLE_WIDTH;
    runtime.tongueOutSampleCanvas.height = TONGUE_COLOR_SAMPLE_HEIGHT;
    runtime.tongueOutSampleContext = runtime.tongueOutSampleCanvas.getContext("2d", {
      alpha: false,
      willReadFrequently: true
    });
  }

  return {
    canvas: runtime.tongueOutSampleCanvas,
    ctx: runtime.tongueOutSampleContext
  };
}

function tongueColorStats(image, width, height) {
  let tonguePixels = 0;
  let consideredPixels = 0;
  let darkPixels = 0;
  let darkConsideredPixels = 0;

  for (let y = Math.floor(height * 0.36); y < height; y += 1) {
    const centerWeight = 1 - Math.abs(y / height - 0.66) * 0.55;
    for (let x = Math.floor(width * 0.16); x < Math.ceil(width * 0.84); x += 1) {
      const index = (y * width + x) * 4;
      const r = image[index];
      const g = image[index + 1];
      const b = image[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max <= 0 ? 0 : (max - min) / max;
      const redDominance = r - Math.max(g, b) * 0.72;
      const pinkBalance = b / Math.max(1, r);

      consideredPixels += centerWeight;
      if (max > 72 && saturation > 0.18 && redDominance > 18 && pinkBalance > 0.42 && g < r * 0.96) {
        tonguePixels += centerWeight;
      }
    }
  }

  for (let y = Math.floor(height * 0.28); y < Math.ceil(height * 0.82); y += 1) {
    for (let x = Math.floor(width * 0.22); x < Math.ceil(width * 0.78); x += 1) {
      const index = (y * width + x) * 4;
      const r = image[index];
      const g = image[index + 1];
      const b = image[index + 2];
      darkConsideredPixels += 1;
      if (Math.max(r, g, b) < 90) {
        darkPixels += 1;
      }
    }
  }

  return {
    tongueRatio: consideredPixels > 0 ? tonguePixels / consideredPixels : 0,
    darkRatio: darkConsideredPixels > 0 ? darkPixels / darkConsideredPixels : 0
  };
}

function pickLaughSprite(runtime, expressions, config = {}, now = 0) {
  if (runtime.gameConfig?.enable_laughter_detection === false) {
    runtime.laughStartedAt = null;
    return null;
  }

  const puckerScore = Math.max(expressions.mouthPucker, expressions.mouthFunnel);
  const wide = Math.max(expressions.mouthStretch, expressions.smile);
  const isStrong =
    expressions.smile > (config.smileThreshold ?? LAUGH_SMILE_THRESHOLD) &&
    expressions.mouthOpen > (config.openThreshold ?? LAUGH_OPEN_THRESHOLD) &&
    wide > (config.wideThreshold ?? LAUGH_WIDE_THRESHOLD) &&
    expressions.frown < (config.maxFrown ?? 0.16) &&
    puckerScore < (config.maxPucker ?? 0.24) &&
    expressions.angry < (config.maxAngry ?? 0.36) &&
    expressions.disgust < (config.maxDisgust ?? 0.36);
  const isReleasing =
    expressions.smile < (config.releaseSmileThreshold ?? LAUGH_RELEASE_SMILE_THRESHOLD) ||
    expressions.mouthOpen < (config.releaseOpenThreshold ?? LAUGH_RELEASE_OPEN_THRESHOLD) ||
    puckerScore > (config.releasePuckerThreshold ?? 0.36) ||
    expressions.frown > (config.releaseFrownThreshold ?? 0.26);

  if (isStrong) {
    runtime.laughStartedAt ??= now;
  } else if (isReleasing) {
    runtime.laughStartedAt = null;
  }

  if (runtime.laughStartedAt === null || now - runtime.laughStartedAt < (config.holdMs ?? LAUGH_HOLD_MS)) {
    return null;
  }

  return resolveLaughSprite(runtime, expressions);
}

function resolveLaughSprite(runtime, expressions) {
  const dedicated = resolveFaceSprite(runtime, "expression_laugh");
  if (dedicated) {
    return dedicated;
  }

  if (expressions.mouthOpen > 0.58) {
    return resolveFaceSprite(runtime, "mouth_big_open") ?? resolveFaceSprite(runtime, "mouth_smile");
  }

  return resolveFaceSprite(runtime, "mouth_smile") ?? resolveFaceSprite(runtime, "mouth_big_open");
}

function isTalkingExpressionMode(runtime, expressions, config = {}) {
  const puckerScore = Math.max(expressions.mouthPucker, expressions.mouthFunnel);
  return (
    Boolean(runtime.activeTalking) ||
    expressions.mouthOpen > (config.talkingExpressionOpenThreshold ?? TALKING_EXPRESSION_OPEN_THRESHOLD) ||
    puckerScore > (config.talkingExpressionPuckerThreshold ?? TALKING_EXPRESSION_PUCKER_THRESHOLD)
  );
}

function pickHeldTalkingExpression(runtime, spriteName, isCandidate, talkingMode, now, config = {}) {
  runtime.expressionHoldStartedAt ??= {};

  if (!isCandidate) {
    delete runtime.expressionHoldStartedAt[spriteName];
    return null;
  }

  if (!talkingMode || runtime.activeMouth === spriteName) {
    runtime.expressionHoldStartedAt[spriteName] = now;
    return resolveFaceSprite(runtime, spriteName);
  }

  runtime.expressionHoldStartedAt[spriteName] ??= now;
  if (now - runtime.expressionHoldStartedAt[spriteName] >= (config.talkingExpressionHoldMs ?? TALKING_EXPRESSION_HOLD_MS)) {
    return resolveFaceSprite(runtime, spriteName);
  }

  return null;
}

function resolveFaceSprite(runtime, spriteName) {
  const disabled = runtime.config.interactions?.disabledExpressions ?? runtime.config.interactions?.suppressedExpressions ?? [];
  if (runtime.config.layout.mouth?.[spriteName]?.disabled || disabled.includes(spriteName)) {
    return null;
  }

  if (runtime.images[spriteName]) {
    return spriteName;
  }

  const fallback = runtime.config.interactions?.fallbacks?.[spriteName];
  return fallback && runtime.images[fallback] ? fallback : null;
}

function frownCandidate(expressions, config = {}) {
  return {
    score: expressions.frown,
    triggerThreshold: config.triggerThreshold ?? FROWN_THRESHOLD,
    heldThreshold: config.heldThreshold ?? FROWN_HELD_THRESHOLD,
    releaseThreshold: config.releaseThreshold ?? FROWN_RELEASE_THRESHOLD,
    holdMs: config.holdMs ?? FROWN_HOLD_MS,
    valid:
      expressions.smile < (config.maxSmile ?? 0.42) &&
      expressions.mouthOpen < (config.maxMouthOpen ?? 0.42) &&
      Math.max(expressions.mouthPucker, expressions.mouthFunnel) < (config.maxPucker ?? 0.48)
  };
}

function puckerCandidate(expressions, config = {}) {
  return {
    score: Math.max(expressions.mouthPucker, expressions.mouthFunnel),
    triggerThreshold: config.triggerThreshold ?? PUCKER_THRESHOLD,
    heldThreshold: config.heldThreshold ?? PUCKER_HELD_THRESHOLD,
    releaseThreshold: config.releaseThreshold ?? PUCKER_RELEASE_THRESHOLD,
    holdMs: config.holdMs ?? PUCKER_HOLD_MS,
    valid:
      expressions.mouthOpen < (config.maxMouthOpen ?? 0.42) &&
      expressions.smile < (config.maxSmile ?? 0.46) &&
      expressions.frown < (config.maxFrown ?? 0.36)
  };
}

function updateHeldMouthCandidate(runtime, name, candidate, now) {
  const startedAtKey = `${name}StartedAt`;
  const isStrong = candidate.valid && candidate.score > candidate.triggerThreshold;
  const isBuilding = candidate.valid && candidate.score > candidate.heldThreshold;

  if (isBuilding) {
    runtime[startedAtKey] ??= now;
  } else if (candidate.score < candidate.releaseThreshold || !candidate.valid) {
    runtime[startedAtKey] = null;
  }

  const held = runtime[startedAtKey] !== null && now - runtime[startedAtKey] >= candidate.holdMs;
  return {
    ...candidate,
    building: isBuilding,
    triggered: isStrong || (candidate.valid && held)
  };
}

function setActiveMouth(runtime, mouthName, options = {}) {
  runtime.activeMouth = mouthName;

  if (!options.keepFrownStart && mouthName !== "mouth_frown") {
    runtime.frownStartedAt = null;
  }
  if (!options.keepPuckerStart && mouthName !== "mouth_pucker") {
    runtime.puckerStartedAt = null;
  }

  return mouthName;
}

function drawImageRect(ctx, image, rect) {
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function drawMessage(ctx, viewport, message) {
  ctx.save();
  ctx.fillStyle = "rgba(247, 245, 238, 0.88)";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, viewport.width / 2, viewport.height / 2);
  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function rotatePoint(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
