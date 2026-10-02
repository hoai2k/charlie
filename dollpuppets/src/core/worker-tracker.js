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

export function createWorkerTracker() {
  const worker = new Worker(new URL("../workers/tracking-worker.js", import.meta.url), {
    type: "module"
  });
  let nextId = 1;
  const pending = new Map();

  worker.addEventListener("message", (event) => {
    const { id, type, result, error } = event.data;

    if (!id || !pending.has(id)) {
      return;
    }

    const { resolve, reject } = pending.get(id);
    pending.delete(id);

    if (type === "error") {
      reject(new Error(error ?? "Tracking worker failed"));
      return;
    }

    resolve(result);
  });

  worker.addEventListener("error", (event) => {
    for (const { reject } of pending.values()) {
      reject(new Error(event.message || "Tracking worker crashed"));
    }
    pending.clear();
  });

  function request(message, transfer = []) {
    const id = nextId;
    nextId += 1;

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...message, id }, transfer);
    });
  }

  return {
    configure(mode) {
      return request({ type: "configure", mode });
    },

    estimate(image, timestampMs, mode) {
      return request({ type: "estimate", image, timestampMs, mode }, [image]);
    },

    dispose() {
      worker.terminate();
      pending.clear();
    }
  };
}
