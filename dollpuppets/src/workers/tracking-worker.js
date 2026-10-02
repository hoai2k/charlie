import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";

const CDN_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_ROOT = "https://storage.googleapis.com/mediapipe-models";

let vision = null;
let faceLandmarker = null;
let handLandmarker = null;
let poseLandmarker = null;
let wasmModuleFactory = null;
let configuredMode = null;
let frameIndex = 0;
let lastFace = emptyFace();
let lastHands = emptyHands();
let lastPose = emptyPose();
let trackingCanvas = null;
let trackingContext = null;
const HAND_SAMPLE_FRAME_INTERVAL = 4;
const POSE_SAMPLE_FRAME_INTERVAL = 3;

self.addEventListener("message", async (event) => {
  const { id, type } = event.data;

  try {
    if (type === "configure") {
      await configure(event.data.mode);
      self.postMessage({ id, type: "configured", result: { mode: configuredMode } });
      return;
    }

    if (type === "estimate") {
      const result = await estimate(event.data);
      self.postMessage({ id, type: "result", result });
      return;
    }

    throw new Error(`Unknown worker message: ${type}`);
  } catch (error) {
    event.data.image?.close?.();
    self.postMessage({ id, type: "error", error: error?.message ?? String(error) });
  }
});

async function configure(mode) {
  configuredMode = mode;
  vision = vision ?? (await createVisionFileset());

  if (!faceLandmarker) {
    await resetModuleFactory();
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${MODEL_ROOT}/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`,
        delegate: "CPU"
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false
    });
  }

  if (usesHands(mode) && !handLandmarker) {
    await resetModuleFactory();
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${MODEL_ROOT}/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`,
        delegate: "CPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
  }

  if (usesPose(mode) && !poseLandmarker) {
    await resetModuleFactory();
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${MODEL_ROOT}/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`,
        delegate: "CPU"
      },
      runningMode: "VIDEO",
      numPoses: 1
    });
  }
}

async function createVisionFileset() {
  await resetModuleFactory();
  return FilesetResolver.forVisionTasks(CDN_ROOT);
}

async function resetModuleFactory() {
  if (!wasmModuleFactory) {
    const wasmModule = await import(`${CDN_ROOT}/vision_wasm_module_internal.js`);
    wasmModuleFactory = wasmModule.default ?? wasmModule.ModuleFactory ?? self.ModuleFactory;
  }

  self.ModuleFactory = wasmModuleFactory;
}

async function estimate({ image, timestampMs, mode }) {
  await configure(mode);
  frameIndex += 1;
  const source = drawImageToCanvas(image);

  try {
    lastFace = sanitizeFace(faceLandmarker.detectForVideo(source, timestampMs));

    if (usesHands(mode)) {
      // Face needs to stay quick for talking; hands can run slower without hurting mouth responsiveness.
      if (frameIndex % HAND_SAMPLE_FRAME_INTERVAL === 0 || lastHands.landmarks.length === 0) {
        lastHands = sanitizeHands(handLandmarker.detectForVideo(source, timestampMs));
      }
    } else {
      lastHands = emptyHands();
    }

    if (usesPose(mode)) {
      if (frameIndex % POSE_SAMPLE_FRAME_INTERVAL === 0 || lastPose.landmarks.length === 0) {
        lastPose = sanitizePose(poseLandmarker.detectForVideo(source, timestampMs));
      }
    } else {
      lastPose = emptyPose();
    }

    return {
      face: lastFace,
      hands: lastHands,
      pose: lastPose,
      mode
    };
  } finally {
    image.close?.();
  }
}

function drawImageToCanvas(image) {
  if (!trackingCanvas || trackingCanvas.width !== image.width || trackingCanvas.height !== image.height) {
    trackingCanvas = new OffscreenCanvas(image.width, image.height);
    trackingContext = trackingCanvas.getContext("2d", {
      alpha: false,
      desynchronized: true
    });
  }

  trackingContext.drawImage(image, 0, 0, image.width, image.height);
  return trackingCanvas;
}

function usesHands(mode) {
  return mode === "face-hands" || mode === "full";
}

function usesPose(mode) {
  return mode === "full";
}

function sanitizeFace(result) {
  return {
    faceLandmarks: (result.faceLandmarks ?? []).map(copyLandmarks),
    faceBlendshapes: (result.faceBlendshapes ?? []).map((blendshape) => ({
      categories: (blendshape.categories ?? []).map((category) => ({
        categoryName: category.categoryName,
        score: category.score
      }))
    }))
  };
}

function sanitizeHands(result) {
  return {
    landmarks: (result.landmarks ?? []).map(copyLandmarks),
    handednesses: (result.handednesses ?? []).map((handedness) =>
      handedness.map((item) => ({
        categoryName: item.categoryName,
        score: item.score
      }))
    )
  };
}

function sanitizePose(result) {
  return {
    landmarks: (result.landmarks ?? []).map(copyLandmarks)
  };
}

function copyLandmarks(landmarks) {
  return landmarks.map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z ?? 0,
    visibility: point.visibility ?? 1
  }));
}

function emptyFace() {
  return {
    faceLandmarks: [],
    faceBlendshapes: []
  };
}

function emptyHands() {
  return {
    landmarks: [],
    handednesses: []
  };
}

function emptyPose() {
  return {
    landmarks: []
  };
}
