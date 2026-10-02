// Smooths the tracked face between tracker results and hides brief tracking
// dropouts. The tracker reports ~15-18 times a second and occasionally misses
// a frame (a wiggly child, a hand in front of the face). A raw miss reports
// the face at the default centre with a neutral expression, which made the
// doll jump to the middle of the screen and back. Instead:
//   - after a miss, the last good pose (expressions included) is held briefly;
//   - after that the doll stays where the face was last seen, with a neutral
//     expression, until the face comes back (it never snaps to the centre);
//   - position, size and tilt glide towards each new result every frame.

const HOLD_LOST_FACE_MS = 600;
// Time constant of the position/size/tilt smoothing. Small enough to feel
// responsive at 60 fps, large enough to hide the tracker's 15-18 Hz steps.
const SMOOTHING_MS = 70;

export function createFaceStabilizer() {
  let target = null;      // latest puppet state from the tracker
  let lastSeen = null;    // most recent state in which the face was tracked
  let lastSeenAt = -Infinity;
  let display = null;     // smoothed face geometry actually rendered
  let lastFrameAt = 0;

  function update(state, now) {
    target = state;
    if (state.face.tracked) {
      lastSeen = state;
      lastSeenAt = now;
    }
  }

  function reset() {
    target = null;
    lastSeen = null;
    lastSeenAt = -Infinity;
    display = null;
    lastFrameAt = 0;
  }

  // Returns the puppet state to render this frame.
  function frame(now) {
    if (!target) {
      return null;
    }

    const face = chooseFace(now);
    // Paused frames re-render an older timestamp, so never step backwards.
    const dt = lastFrameAt ? Math.min(Math.max(now - lastFrameAt, 0), 100) : 0;
    lastFrameAt = Math.max(lastFrameAt, now);
    display = display ? smoothGeometry(display, face, 1 - Math.exp(-dt / SMOOTHING_MS)) : copyGeometry(face);

    return {
      ...target,
      face: { ...face, ...display }
    };
  }

  function chooseFace(now) {
    if (target.face.tracked || !lastSeen) {
      return target.face;
    }
    if (now - lastSeenAt < HOLD_LOST_FACE_MS) {
      return lastSeen.face;
    }
    // Lost for a while: stay put, relax to the untracked (neutral) expression.
    return { ...lastSeen.face, tracked: false, expressions: target.face.expressions };
  }

  return { update, frame, reset };
}

function copyGeometry(face) {
  return {
    center: { ...face.center },
    size: face.size,
    rotation: face.rotation,
    bounds: face.bounds ? { ...face.bounds } : null,
    eyes: face.eyes ? copyEyes(face.eyes) : null
  };
}

function copyEyes(eyes) {
  return { left: { ...eyes.left }, right: { ...eyes.right }, center: { ...eyes.center }, distance: eyes.distance };
}

function smoothGeometry(current, face, amount) {
  return {
    center: lerpPoint(current.center, face.center, amount),
    size: lerp(current.size, face.size, amount),
    rotation: lerp(current.rotation, face.rotation, amount),
    bounds: face.bounds && current.bounds
      ? {
          x: lerp(current.bounds.x, face.bounds.x, amount),
          y: lerp(current.bounds.y, face.bounds.y, amount),
          width: lerp(current.bounds.width, face.bounds.width, amount),
          height: lerp(current.bounds.height, face.bounds.height, amount)
        }
      : face.bounds ? { ...face.bounds } : null,
    eyes: face.eyes && current.eyes
      ? {
          left: lerpPoint(current.eyes.left, face.eyes.left, amount),
          right: lerpPoint(current.eyes.right, face.eyes.right, amount),
          center: lerpPoint(current.eyes.center, face.eyes.center, amount),
          distance: lerp(current.eyes.distance, face.eyes.distance, amount)
        }
      : face.eyes ? copyEyes(face.eyes) : null
  };
}

function lerpPoint(a, b, amount) {
  return { x: lerp(a.x, b.x, amount), y: lerp(a.y, b.y, amount), z: lerp(a.z ?? 0, b.z ?? 0, amount) };
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}
