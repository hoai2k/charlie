// `onEnded` is called if the browser ends the camera track by itself (the
// camera is unplugged, or iPadOS revokes it while the app is in the
// background). It is not called when stop() is used.
export function createCamera(video, { onEnded } = {}) {
  let stream = null;
  // Bumped by every start() and stop(), so a getUserMedia() that resolves
  // after the camera was stopped (or restarted) shuts its stream straight off.
  let token = 0;

  function stop() {
    token += 1;
    for (const track of stream?.getTracks() ?? []) {
      track.onended = null;
      track.stop();
    }
    stream = null;
    video.srcObject = null;
  }

  return {
    async start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        const error = new Error("The camera needs a secure (https) page");
        error.name = "InsecureContextError";
        throw error;
      }

      // Never leave an earlier stream running (and the camera light on).
      stop();
      const startToken = token;
      const nextStream = await openStream();

      if (startToken !== token) {
        nextStream.getTracks().forEach((track) => track.stop());
        throw cancelledError();
      }

      stream = nextStream;
      for (const track of stream.getVideoTracks()) {
        track.onended = () => {
          if (stream === nextStream) {
            onEnded?.();
          }
        };
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch (error) {
        // stop() during play() rejects it with an AbortError; that's a
        // cancellation, not a camera failure.
        if (startToken !== token) {
          throw cancelledError();
        }
        throw error;
      }
      if (startToken !== token) {
        throw cancelledError();
      }
      return stream;
    },

    stop
  };
}

// Preferred settings first, then simpler ones: some webcams (and Firefox or
// Safari with some cameras) reject the size or frame-rate request, and some
// Windows drivers report "busy" for a mode they can't do but open fine with
// their defaults. Permission and missing-camera errors are final.
const CONSTRAINT_LADDER = [
  {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24, max: 30 }
  },
  { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
  true
];
const RETRYABLE_ERRORS = new Set(["OverconstrainedError", "ConstraintNotSatisfiedError", "NotReadableError", "AbortError", "TypeError"]);

async function openStream() {
  let lastError = null;
  for (const video of CONSTRAINT_LADDER) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video });
    } catch (error) {
      lastError = error;
      if (!RETRYABLE_ERRORS.has(error?.name)) {
        throw error;
      }
    }
  }
  throw lastError;
}

function cancelledError() {
  const error = new Error("Camera start was cancelled");
  error.name = "AbortError";
  error.cancelled = true;
  return error;
}
