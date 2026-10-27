export const TRACKING_MODES = {
  face: {
    label: "face only",
    intervalMs: 1000 / 15,
    width: 320,
    height: 240
  },
  "face-hands": {
    label: "face + hands",
    // Talking mouth overlays need a quicker face cadence than gesture-only tracking.
    intervalMs: 1000 / 18,
    width: 360,
    height: 270
  },
  full: {
    label: "full body",
    intervalMs: 1000 / 8,
    width: 360,
    height: 270
  }
};

// Loading MediaPipe and its models (~23 MB) can be slow on home Wi-Fi, but a
// request that never answers must not hang the game forever.
const CONFIGURE_TIMEOUT_MS = 60000;
const ESTIMATE_TIMEOUT_MS = 3000;

export function createWorkerTracker() {
  const worker = new Worker(new URL("../workers/tracking-worker.js", import.meta.url), {
    type: "module"
  });
  let nextId = 1;
  const pending = new Map();
  // Set once the worker has crashed (e.g. its CDN import failed). A dead
  // worker never answers, so every later request is rejected immediately.
  let deadError = null;

  worker.addEventListener("message", (event) => {
    const { id, type, result, error } = event.data;

    if (!id || !pending.has(id)) {
      return;
    }

    const { resolve, reject, timer } = pending.get(id);
    pending.delete(id);
    clearTimeout(timer);

    if (type === "error") {
      reject(new TrackerError(error ?? "Tracking worker failed"));
      return;
    }

    resolve(result);
  });

  worker.addEventListener("error", (event) => {
    event.preventDefault?.();
    deadError = new TrackerError(event.message || "Tracking worker crashed");
    rejectAll(deadError);
  });

  function rejectAll(error) {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  }

  function request(message, transfer = [], timeoutMs = ESTIMATE_TIMEOUT_MS) {
    if (deadError) {
      transfer.forEach((item) => item.close?.());
      return Promise.reject(deadError);
    }

    const id = nextId;
    nextId += 1;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new TrackerError(`Tracking ${message.type} timed out`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      worker.postMessage({ ...message, id }, transfer);
    });
  }

  return {
    configure(mode) {
      return request({ type: "configure", mode }, [], CONFIGURE_TIMEOUT_MS);
    },

    estimate(image, timestampMs, mode) {
      return request({ type: "estimate", image, timestampMs, mode }, [image]);
    },

    get dead() {
      return deadError !== null;
    },

    dispose() {
      worker.terminate();
      deadError = deadError ?? new TrackerError("Tracking worker disposed");
      rejectAll(deadError);
    }
  };
}

// Distinguishes face-tracking failures from camera failures in the UI.
export class TrackerError extends Error {
  constructor(message) {
    super(message);
    this.name = "TrackerError";
  }
}
