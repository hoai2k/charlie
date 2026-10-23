// The camera: following the players, zoom, and the split-screen ("lego") panes.
// Part of the race's game code: these functions share game.js's constants and
// state, and load before it (see the <script> order in index.html).

function isRacerVisible(racer) {
  return isWorldXVisibleInAnyView(racer.x);
}

function isWorldXVisibleInAnyView(worldX) {
  return getActiveWorldViewRanges().some(range => worldX > range.left && worldX < range.right);
}

function getActiveWorldViewRanges() {
  if (state.cameraMode === "lego" && (state.legoSplitActive || state.legoSplitRendering) && state.legoPaneCameras.length > 0) {
    const groups = getActiveLegoPaneGroups();
    const panes = getLegoPaneLayout(groups, state.legoRows);
    const ranges = panes.map((pane, index) => {
      const camera = state.legoPaneCameras[index];
      if (!Number.isFinite(camera)) return null;
      return { left: camera, right: camera + pane.width };
    }).filter(Boolean);
    if (ranges.length > 0) return ranges;
  }
  return [{ left: state.camera, right: state.camera + getWorldViewportWidth() }];
}

function updateCamera(dt = 0) {
  const humanRacers = state.racers.filter(r => !r.ai);
  if (humanRacers.length === 0) return;
  const humanLead = Math.max(...humanRacers.map(r => r.x));
  const humanTrail = Math.min(...humanRacers.map(r => r.x));
  const humanSpan = humanLead - humanTrail;
  const desiredZoom = state.cameraMode === "lego" ? 1 : humanRacers.length > 1
    ? clamp(W / Math.max(W, humanSpan + RACER_VISIBLE_LEFT_MARGIN + RACER_VISIBLE_RIGHT_MARGIN), CAMERA_MIN_ZOOM, 1)
    : 1;
  if (dt > 0 && desiredZoom > state.cameraZoom) {
    state.cameraZoom += (desiredZoom - state.cameraZoom) * (1 - Math.exp(-CAMERA_ZOOM_IN_DAMPING * dt));
  } else if (dt > 0 && desiredZoom < state.cameraZoom) {
    state.cameraZoom = desiredZoom;
  } else {
    state.cameraZoom = desiredZoom;
  }
  const viewWidth = getWorldViewportWidth();
  const targetLeft = humanTrail - RACER_VISIBLE_LEFT_MARGIN;
  const targetRight = humanLead + RACER_VISIBLE_RIGHT_MARGIN;
  const desiredCamera = (targetLeft + targetRight - viewWidth) / 2;
  const maxCamera = Math.max(0, FINISH - viewWidth + 260);
  if (state.legoSharedLazy && state.cameraMode === "lego" && !state.legoSplitActive && !state.legoSplitRendering && humanRacers.length > 1) {
    updateLazySharedLegoCamera(humanRacers, desiredCamera, maxCamera, viewWidth, dt);
  } else {
    state.legoSharedLazy = false;
    state.camera = clamp(desiredCamera, 0, maxCamera);
  }
}

function updateLazySharedLegoCamera(humanRacers, desiredCamera, maxCamera, viewWidth, dt) {
  const groupCenter = (Math.min(...humanRacers.map(racer => racer.x)) + Math.max(...humanRacers.map(racer => racer.x))) / 2;
  const targetScreenX = viewWidth * 0.5;
  const screenX = groupCenter - state.camera;
  const offsetFromTarget = screenX - targetScreenX;
  const centerVelocity = getLegoGroupCenterVelocity(humanRacers);
  const movingAwayFromTarget = Math.sign(centerVelocity) === Math.sign(offsetFromTarget) && Math.abs(centerVelocity) > 1;
  if (movingAwayFromTarget) {
    const maxStep = Math.abs(centerVelocity) * LEGO_CAMERA_CATCHUP_RATE * dt;
    state.camera = moveToward(state.camera, clamp(desiredCamera, 0, maxCamera), maxStep);
  } else {
    state.camera = clamp(state.camera, 0, maxCamera);
  }
  // The lazy camera must never leave a player off screen while the shared
  // view is still wide enough for everyone.
  state.camera = cameraKeepingLegoGroupVisible(humanRacers, viewWidth, state.camera, maxCamera);
  if (Math.abs(state.camera - desiredCamera) < 2 && Math.abs(offsetFromTarget) < 8) {
    state.legoSharedLazy = false;
  }
}

function getWorldViewportWidth() {
  const rect = canvas.getBoundingClientRect();
  state.viewportScaleX = rect.width > 0 ? W / rect.width : 1;
  return (state.renderViewportWidth || W) / state.cameraZoom;
}

function getWorldViewportTop() {
  return H - (H / state.cameraZoom);
}

function applyWorldZoomTransform() {
  ctx.translate(0, H);
  ctx.scale(state.cameraZoom, state.cameraZoom);
  ctx.translate(0, -H);
}

function getExpectedViewportWidth() {
  return EXPECTED_VIEW_WIDTH;
}

function updateLegoSplitState(dt = 0) {
  const active = getLegoSplitActive(dt);
  const targetAlpha = active ? 1 : 0;
  if (active) state.legoSplitRendering = true;
  if (!active) state.legoSplitRendering = false;
  if (dt <= 0) {
    state.legoSplitLineAlpha = targetAlpha;
  } else {
    state.legoSplitLineAlpha += (targetAlpha - state.legoSplitLineAlpha) * (1 - Math.exp(-LEGO_SPLIT_LINE_FADE_SPEED * dt));
  }
  if (state.legoSplitLineAlpha < 0.01) state.legoSplitLineAlpha = 0;
  if (state.legoSplitLineAlpha > 0.99) state.legoSplitLineAlpha = 1;
  return state.legoSplitRendering;
}

function clearLegoSplitState() {
  state.legoSplitActive = false;
  state.legoRowExitHold = 0;
  state.legoForceMergeHold = {};
  state.legoForceMergeSeen = {};
  state.legoPaneCameras = [];
  state.legoPaneGroupKeys = [];
  state.legoMergeBoundarySnapshots = {};
  state.legoRows = 1;
  state.legoRowOfRacer = {};
}

function getLegoSplitActive(dt = 0) {
  if (state.cameraMode !== "lego") return false;
  if (!state.running || state.done) {
    if (state.legoSplitActive) clearLegoSplitState();
    return false;
  }
  const humans = getHumanRacers();
  if (humans.length <= 1) {
    if (state.legoSplitActive) clearLegoSplitState();
    return false;
  }
  reconcileLegoGroupsWithHumans(humans);
  advanceLegoForceMergeHolds(dt);
  const storedCount = state.legoPaneGroupKeys.length;
  state.legoRowExitHold = state.legoRows === 2 && storedCount <= LEGO_TWO_ROW_EXIT ? state.legoRowExitHold + dt : 0;
  const wasActive = state.legoSplitActive;
  const currentGroups = getCurrentLegoPaneGroups(humans);
  const mergedGroups = wasActive ? mergeAlignedLegoPaneGroups(currentGroups) : currentGroups;
  const groups = splitOverflowingLegoPaneGroups(mergedGroups);
  state.legoSplitActive = groups.length > 1;
  if (wasActive !== state.legoSplitActive) {
    GameAudio.play(state.legoSplitActive ? "lego_split_open" : "lego_split_merge");
  }
  if (!wasActive && state.legoSplitActive) {
    state.legoSplitLineCount = groups.length;
    seedLegoPaneCameras(groups);
  } else if (wasActive && state.legoSplitActive) {
    syncLegoPaneGroups(groups);
    commitLegoRows(groups);
  }
  if (wasActive && !state.legoSplitActive) {
    rememberLegoSplitLines(currentGroups);
    seedSharedCameraFromLegoPanes(groups);
    state.legoSharedLazy = true;
  }
  return state.legoSplitActive;
}

// Players who joined or left since last frame: drop the leavers from their
// pane groups (and the panes that end up empty, keeping each pane's camera
// paired with its group) and give each newcomer a pane of their own.
function reconcileLegoGroupsWithHumans(humans) {
  if (state.legoPaneGroupKeys.length === 0) return;
  const ids = new Set(humans.map(racer => String(racer.playerIndex)));
  const keys = [];
  const cameras = [];
  state.legoPaneGroupKeys.forEach((key, index) => {
    const kept = key.split("-").filter(id => ids.has(id));
    if (kept.length === 0) return;
    keys.push(kept.join("-"));
    cameras.push(state.legoPaneCameras[index]);
  });
  const known = new Set(keys.flatMap(key => key.split("-")));
  for (const racer of humans) {
    const id = String(racer.playerIndex);
    if (known.has(id)) continue;
    keys.push(id);
    cameras.push(NaN);
  }
  if (keys.join("|") === state.legoPaneGroupKeys.join("|")) return;
  if (state.legoSplitActive) requestLegoCrossfade();
  state.legoPaneGroupKeys = keys;
  state.legoPaneCameras = cameras;
  state.legoMergeBoundarySnapshots = {};
}

function getLegoPaneRacers(humans) {
  return humans.slice().sort((a, b) => a.x - b.x || a.playerIndex - b.playerIndex);
}

function getLegoPaneGroups(humans, splitDistance) {
  const sorted = getLegoPaneRacers(humans);
  const groups = [];
  for (const racer of sorted) {
    const group = groups[groups.length - 1];
    if (!group || racer.x - group[group.length - 1].x > splitDistance) {
      groups.push([racer]);
    } else {
      group.push(racer);
    }
  }
  return groups;
}

function getCurrentLegoPaneGroups(humans) {
  const storedGroups = state.legoPaneGroupKeys.length > 0 ? getStoredLegoPaneGroups() : [];
  if (storedGroups.length > 0) return storedGroups.map(group => getLegoPaneRacers(group));
  return [getLegoPaneRacers(humans)];
}

function sortLegoGroupsByTrack(groups) {
  return groups
    .map(group => getLegoPaneRacers(group))
    .filter(group => group.length > 0)
    .sort((a, b) => a[0].x - b[0].x || a[0].playerIndex - b[0].playerIndex);
}

function splitOverflowingLegoPaneGroups(groups) {
  let nextGroups = sortLegoGroupsByTrack(groups);
  let guard = 0;
  while (guard < MAX_PLAYERS * 2) {
    guard += 1;
    const panes = getLegoPaneLayout(nextGroups);
    const splitIndex = panes.findIndex(pane => !legoGroupFitsPane(pane.group, pane.width) && pane.group.length > 1);
    if (splitIndex === -1) break;
    const [leftGroup, rightGroup] = splitLegoGroupAtLargestGap(panes[splitIndex].group);
    nextGroups = nextGroups.slice(0, splitIndex).concat([leftGroup, rightGroup], nextGroups.slice(splitIndex + 1));
  }
  return nextGroups;
}

function splitLegoGroupAtLargestGap(group) {
  const sorted = getLegoPaneRacers(group);
  let splitAfter = Math.floor(sorted.length / 2) - 1;
  let largestGap = -Infinity;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const gap = sorted[index + 1].x - sorted[index].x;
    if (gap > largestGap) {
      largestGap = gap;
      splitAfter = index;
    }
  }
  return [sorted.slice(0, splitAfter + 1), sorted.slice(splitAfter + 1)];
}

function legoGroupSpan(group) {
  if (group.length <= 1) return 0;
  return Math.max(...group.map(racer => racer.x)) - Math.min(...group.map(racer => racer.x));
}

function legoGroupFitsPane(group, paneWidth) {
  if (group.length <= 1) return true;
  return legoGroupSpan(group) <= getLegoPaneFitDistance(paneWidth) + 0.5;
}

function getLegoPaneFitDistance(paneWidth) {
  const margin = Math.min(LEGO_PANE_KEEP_VISIBLE_MARGIN, paneWidth * 0.28);
  return Math.max(0, paneWidth - margin * 2);
}

// Keys list player ids in id order, so racers swapping places inside a pane
// don't look like a regroup.
function legoGroupKey(group) {
  return group.map(racer => racer.playerIndex).sort((a, b) => a - b).join("-");
}

// Up to three panes sit side by side. From five panes (and, once there, down
// to four) the screen becomes two rows of half-height panes, each row a strip
// of side-by-side panes drawn at half zoom; panes in the same row still merge
// seamlessly, as in the one-row layout.
function legoRowsFor(count) {
  if (count >= LEGO_TWO_ROW_ENTER) return 2;
  if (count <= 1) return 1;
  // Leave the two-row layout only after the pane count has stayed low for a
  // moment, so a group brushing the threshold doesn't flip the whole layout.
  if (count <= LEGO_TWO_ROW_EXIT && state.legoRowExitHold >= LEGO_ROW_EXIT_DELAY) return 1;
  return state.legoRows;
}

function legoTopRowCount(groups) {
  const count = groups.length;
  const known = groups.some(group => group.some(racer => state.legoRowOfRacer[racer.playerIndex] !== undefined));
  let top = Math.ceil(count / 2);
  if (known) {
    top = 0;
    for (const group of groups) {
      if (state.legoRowOfRacer[group[0].playerIndex] === 1) break;
      top += 1;
    }
  }
  // Sticky rows avoid re-framing on every regroup, but not at any price: a
  // 1-over-4 split wastes the big pane and squeezes the rest, so rebalance.
  if (Math.abs(2 * top - count) >= 3) top = Math.ceil(count / 2);
  const low = Math.max(1, count - LEGO_MAX_PANES_PER_ROW);
  const high = Math.min(LEGO_MAX_PANES_PER_ROW, count - 1);
  return clamp(top, low, high);
}

function getLegoPaneLayout(groups, rows = legoRowsFor(groups.length)) {
  if (rows <= 1 || groups.length < 2) return layoutLegoPaneRow(groups, 0, 1);
  const top = legoTopRowCount(groups);
  return layoutLegoPaneRow(groups.slice(0, top), 0, 2).concat(layoutLegoPaneRow(groups.slice(top), 1, 2));
}

// pane.x and pane.width are world units within the pane's row (the row is
// W / zoom world units wide); screenX/screenY/screenW/screenH place it on the
// canvas.
function layoutLegoPaneRow(groups, row, rows) {
  const zoom = 1 / rows;
  const rowWidth = W / zoom;
  const total = groups.reduce((sum, group) => sum + group.length, 0) || 1;
  let x = 0;
  return groups.map((group, index) => {
    const width = index === groups.length - 1 ? rowWidth - x : rowWidth * (group.length / total);
    const pane = {
      group,
      x,
      width,
      row,
      zoom,
      screenX: x * zoom,
      screenY: row * H * zoom,
      screenW: width * zoom,
      screenH: H * zoom
    };
    x += width;
    return pane;
  });
}

function seedCameraForPane(pane) {
  if (pane.zoom !== 1) return cameraForGroup(pane.group, pane.width);
  const sharedWorldAtPaneLeft = state.camera + pane.x / Math.max(state.cameraZoom, 0.0001);
  const aligned = clamp(sharedWorldAtPaneLeft, 0, Math.max(0, FINISH - pane.width + 260));
  return Number.isFinite(aligned) ? aligned : cameraForGroup(pane.group, pane.width || getWorldViewportWidth());
}

function getLegoLinePositions(panes) {
  const lines = [];
  for (let index = 0; index < panes.length - 1; index += 1) {
    const pane = panes[index];
    if (panes[index + 1].row !== pane.row) continue;
    const x = pane.screenX + pane.screenW;
    lines.push(pane.zoom === 1 ? x : { x1: x, y1: pane.screenY, x2: x, y2: pane.screenY + pane.screenH });
  }
  const rows = new Set(panes.map(pane => pane.row));
  if (rows.size > 1) lines.push({ x1: 0, y1: H / 2, x2: W, y2: H / 2 });
  return lines;
}

function rememberLegoSplitLines(groups) {
  state.legoSplitLinePositions = getLegoLinePositions(getLegoPaneLayout(groups.filter(group => group.length > 0), state.legoRows));
}

function getLegoLinePositionsForOverlay() {
  if (state.legoSplitLinePositions.length > 0) return state.legoSplitLinePositions;
  if (state.legoPaneGroupKeys.length > 0) {
    const groups = getStoredLegoPaneGroups();
    return getLegoLinePositions(getLegoPaneLayout(groups.filter(group => group.length > 0), state.legoRows));
  }
  const humans = getHumanRacers();
  const count = state.legoSplitLineCount || humans.length;
  const width = W / Math.max(1, count);
  return Array.from({ length: Math.max(0, count - 1) }, (_, index) => width * (index + 1));
}

function drawLegoSplitScene(dt = 0) {
  const groups = getActiveLegoPaneGroups();
  if (groups.length <= 1) {
    drawSharedCameraScene();
    return;
  }
  const panes = getLegoPaneLayout(groups, state.legoRows);
  rememberLegoSplitLines(groups);
  updateLegoPaneCameras(panes, dt);
  const previousCamera = state.camera;
  const previousZoom = state.cameraZoom;
  const previousViewportWidth = state.renderViewportWidth;
  for (let index = 0; index < panes.length; index += 1) {
    const pane = panes[index];
    ctx.save();
    ctx.beginPath();
    ctx.rect(pane.screenX, pane.screenY, pane.screenW, pane.screenH);
    ctx.clip();
    ctx.translate(pane.screenX, pane.screenY);
    ctx.scale(pane.zoom, pane.zoom);
    state.cameraZoom = 1;
    state.renderViewportWidth = pane.width;
    state.camera = state.legoPaneCameras[index] ?? cameraForGroup(pane.group, pane.width);
    drawWorldScene();
    ctx.restore();
  }
  state.camera = previousCamera;
  state.cameraZoom = previousZoom;
  state.renderViewportWidth = previousViewportWidth;
  for (const pane of panes) drawLegoPaneLabel(pane);
  drawLegoSplitLines(getLegoLinePositions(panes), state.legoSplitLineAlpha);
}

function cameraForRacer(racer, viewWidth) {
  const desired = racer.x - viewWidth * LEGO_CAMERA_TARGET_RATIO;
  const maxCamera = Math.max(0, FINISH - viewWidth + 260);
  return clamp(desired, 0, maxCamera);
}

function cameraForGroup(group, viewWidth) {
  if (group.length === 1) return cameraForRacer(group[0], viewWidth);
  const left = Math.min(...group.map(racer => racer.x));
  const right = Math.max(...group.map(racer => racer.x));
  const desired = (left + right - viewWidth) / 2;
  const maxCamera = Math.max(0, FINISH - viewWidth + 260);
  return clamp(desired, 0, maxCamera);
}

function seedLegoPaneCameras(groups) {
  state.legoRows = legoRowsFor(groups.length);
  if (state.legoRows === 1) state.legoRowOfRacer = {};
  // Splitting straight into the half-zoom two-row layout can't be seamless.
  if (state.legoRows !== 1) requestLegoCrossfade();
  const panes = getLegoPaneLayout(groups, state.legoRows);
  state.legoPaneGroupKeys = groups.map(legoGroupKey);
  state.legoPaneCameras = panes.map(seedCameraForPane);
  state.legoSplitLineCount = groups.length;
  state.legoMergeBoundarySnapshots = {};
  rememberLegoRows(panes);
  rememberLegoSplitLines(groups);
}

function rememberLegoRows(panes) {
  state.legoPaneGeometry = {};
  for (const pane of panes) {
    state.legoPaneGeometry[legoGroupKey(pane.group)] = { row: pane.row, x: pane.x, width: pane.width, zoom: pane.zoom };
  }
  state.legoRowOfRacer = {};
  if (state.legoRows === 1) return;
  for (const pane of panes) {
    for (const racer of pane.group) state.legoRowOfRacer[racer.playerIndex] = pane.row;
  }
}

// When the pane count crosses the one-row/two-row threshold every pane
// changes size, so a seamless hand-off is impossible; keep each group at the
// same relative spot in its new pane instead, which reads as a quick re-frame.
function commitLegoRows(groups) {
  const nextRows = legoRowsFor(groups.length);
  if (nextRows === state.legoRows) {
    const panes = getLegoPaneLayout(groups, state.legoRows);
    // A pane that changed rows (a rebalance) can't keep its framing.
    panes.forEach((pane, index) => {
      const previous = state.legoPaneGeometry[legoGroupKey(pane.group)];
      if (!previous || previous.row === pane.row) return;
      state.legoPaneCameras[index] = reframeLegoCamera(pane.group, previous, state.legoPaneCameras[index], pane);
      requestLegoCrossfade();
    });
    rememberLegoRows(panes);
    return;
  }
  const previousPanes = getLegoPaneLayout(groups, state.legoRows);
  state.legoRows = nextRows;
  if (nextRows === 1) state.legoRowOfRacer = {};
  else state.legoRowOfRacer = {};
  const panes = getLegoPaneLayout(groups, nextRows);
  requestLegoCrossfade();
  state.legoPaneCameras = panes.map((pane, index) => (
    reframeLegoCamera(pane.group, previousPanes[index], state.legoPaneCameras[index], pane)
  ));
  state.legoMergeBoundarySnapshots = {};
  rememberLegoRows(panes);
  rememberLegoSplitLines(groups);
}

function reframeLegoCamera(group, previousPane, previousCamera, pane) {
  if (!previousPane || !Number.isFinite(previousCamera)) return cameraForGroup(group, pane.width);
  const center = (Math.min(...group.map(racer => racer.x)) + Math.max(...group.map(racer => racer.x))) / 2;
  const ratio = clamp((center - previousCamera) / Math.max(1, previousPane.width), 0, 1);
  const maxCamera = Math.max(0, FINISH - pane.width + 260);
  return cameraKeepingLegoGroupVisible(group, pane.width, clamp(center - ratio * pane.width, 0, maxCamera), maxCamera);
}

function mergeAlignedLegoPaneGroups(groups) {
  let nextGroups = groups.map(group => getLegoPaneRacers(group)).filter(group => group.length > 0);
  let nextCameras = state.legoPaneCameras.slice(0, nextGroups.length);
  const rows = state.legoRows;
  let merged = false;
  let guard = 0;
  while (guard < MAX_PLAYERS * 2) {
    guard += 1;
    const panes = getLegoPaneLayout(nextGroups, rows);
    let mergeIndex = -1;
    let mergeCamera = 0;
    for (let index = 0; index < panes.length - 1; index += 1) {
      const left = panes[index];
      const right = panes[index + 1];
      const mergedGroup = getLegoPaneRacers(left.group.concat(right.group));
      const span = legoGroupSpan(mergedGroup);
      if (left.row !== right.row) {
        // Neighbours on the track but on different rows can't line up on
        // screen; once they are well inside one pane's reach, just join them.
        if (span <= getLegoPaneFitDistance(Math.max(left.width, right.width)) * LEGO_FORCE_MERGE_FRACTION
          && legoForceMergeReady(legoMergeBoundaryKey(left.group, right.group))) {
          requestLegoCrossfade();
          mergeIndex = index;
          mergeCamera = cameraForGroup(mergedGroup, left.width);
          break;
        }
        continue;
      }
      const mergedWidth = left.width + right.width;
      const boundaryKey = legoMergeBoundaryKey(left.group, right.group);
      // Always called, so the boundary's alignment history stays fresh.
      const camera = cameraForAlignedLegoMerge(panes, nextCameras, index, boundaryKey);
      const fitDistance = getLegoPaneFitDistance(mergedWidth);
      // Hysteresis: a pair only merges a little inside the split threshold,
      // so racers hovering at the threshold don't flicker split/merge.
      if (span > fitDistance - LEGO_MERGE_HYSTERESIS) continue;
      if (Number.isFinite(camera)) {
        mergeIndex = index;
        mergeCamera = camera;
        break;
      }
      if (span <= fitDistance * LEGO_FORCE_MERGE_FRACTION && legoForceMergeReady(boundaryKey)) {
        // Fallback for panes that can no longer line up (e.g. after a resize
        // or a re-frame): racers this close share a pane; a crossfade hides
        // the re-frame.
        requestLegoCrossfade();
        mergeIndex = index;
        mergeCamera = cameraForGroup(mergedGroup, mergedWidth);
        break;
      }
    }
    if (mergeIndex === -1) break;
    nextGroups = nextGroups.slice(0, mergeIndex)
      .concat([getLegoPaneRacers(nextGroups[mergeIndex].concat(nextGroups[mergeIndex + 1]))], nextGroups.slice(mergeIndex + 2));
    nextCameras = nextCameras.slice(0, mergeIndex)
      .concat([mergeCamera], nextCameras.slice(mergeIndex + 2));
    merged = true;
  }
  if (merged) {
    state.legoPaneGroupKeys = nextGroups.map(legoGroupKey);
    state.legoPaneCameras = nextCameras;
    state.legoSplitLineCount = nextGroups.length;
    state.legoMergeBoundarySnapshots = {};
    rememberLegoSplitLines(nextGroups);
  }
  return nextGroups;
}

// A non-seamless merge only happens once its condition has held for a
// moment, so racers brushing past each other don't cause re-frames.
function legoForceMergeReady(boundaryKey) {
  state.legoForceMergeSeen[boundaryKey] = true;
  return (state.legoForceMergeHold[boundaryKey] || 0) >= LEGO_FORCE_MERGE_DWELL;
}

function advanceLegoForceMergeHolds(dt) {
  const next = {};
  for (const key of Object.keys(state.legoForceMergeSeen)) {
    next[key] = (state.legoForceMergeHold[key] || 0) + dt;
  }
  state.legoForceMergeHold = next;
  state.legoForceMergeSeen = {};
}

function requestLegoCrossfade() {
  state.legoCrossfadeRequested = true;
}

function legoMergeBoundaryKey(leftGroup, rightGroup) {
  return `${legoGroupKey(leftGroup)}|${legoGroupKey(rightGroup)}`;
}

function cameraForAlignedLegoMerge(panes, paneCameras, index, boundaryKey = "") {
  const leftPane = panes[index];
  const rightPane = panes[index + 1];
  const mergedWidth = leftPane.width + rightPane.width;
  const maxCamera = Math.max(0, FINISH - mergedWidth + 260);
  const leftCamera = legoPaneMergeCamera(leftPane, paneCameras[index], leftPane.x);
  const rightCamera = legoPaneMergeCamera(rightPane, paneCameras[index + 1], leftPane.x);
  if (!Number.isFinite(leftCamera) || !Number.isFinite(rightCamera)) {
    if (boundaryKey) delete state.legoMergeBoundarySnapshots[boundaryKey];
    return NaN;
  }
  const delta = rightCamera - leftCamera;
  const current = { leftCamera, rightCamera, delta };
  const previous = boundaryKey ? state.legoMergeBoundarySnapshots[boundaryKey] : null;
  if (boundaryKey) state.legoMergeBoundarySnapshots[boundaryKey] = current;
  const average = (leftCamera + rightCamera) / 2;
  if (Math.abs(delta) <= LEGO_SCREEN_ALIGNMENT_EPSILON) {
    return average < -LEGO_SCREEN_ALIGNMENT_EPSILON || average > maxCamera + LEGO_SCREEN_ALIGNMENT_EPSILON ? NaN : clamp(average, 0, maxCamera);
  }
  // The two views lined up somewhere between last frame and this one. A fast
  // racer can move several pixels a frame, so any sign change counts (the old
  // check needed |delta| <= 3px and missed fast crossings, leaving the pair
  // split even after they met).
  if (!previous || Math.sign(previous.delta) === Math.sign(delta)) return NaN;
  const t = previous.delta / (previous.delta - delta);
  const crossedCamera = previous.leftCamera + (leftCamera - previous.leftCamera) * t;
  return crossedCamera < -LEGO_SCREEN_ALIGNMENT_EPSILON || crossedCamera > maxCamera + LEGO_SCREEN_ALIGNMENT_EPSILON ? NaN : clamp(crossedCamera, 0, maxCamera);
}

function legoPaneMergeCamera(pane, paneCamera, mergedPaneX) {
  if (!Number.isFinite(paneCamera) || pane.group.length === 0) return NaN;
  const candidates = pane.group.map(racer => {
    const screenXInPane = pane.x + racer.x - paneCamera;
    return racer.x + mergedPaneX - screenXInPane;
  });
  const average = candidates.reduce((sum, camera) => sum + camera, 0) / candidates.length;
  return candidates.every(camera => Math.abs(camera - average) <= LEGO_SCREEN_ALIGNMENT_EPSILON) ? average : NaN;
}

function syncLegoPaneGroups(groups) {
  const keys = groups.map(legoGroupKey);
  if (keys.join("|") === state.legoPaneGroupKeys.join("|")) return;
  const previousKeys = state.legoPaneGroupKeys;
  const previousCameras = state.legoPaneCameras;
  const previousPanes = getLegoPaneLayout(getStoredLegoPaneGroups(), state.legoRows);
  const panes = getLegoPaneLayout(groups, state.legoRows);
  const carryCamera = (previousIndex, pane) => {
    const previousPane = previousPanes[previousIndex];
    const camera = previousCameras[previousIndex];
    if (!previousPane || !Number.isFinite(camera)) return NaN;
    if (previousPane.row === pane.row && previousPane.zoom === pane.zoom) {
      const carried = camera + pane.x - previousPane.x;
      // Panes that swapped order (an overtake) can't carry their framing.
      const maxCamera = Math.max(0, FINISH - pane.width + 260);
      const kept = cameraKeepingLegoGroupVisible(pane.group, pane.width, carried, maxCamera);
      if (Math.abs(kept - carried) > 1) requestLegoCrossfade();
      return kept;
    }
    requestLegoCrossfade();
    return reframeLegoCamera(pane.group, previousPane, camera, pane);
  };
  state.legoPaneGroupKeys = keys;
  state.legoPaneCameras = groups.map((group, index) => {
    const exactIndex = previousKeys.indexOf(keys[index]);
    const exact = exactIndex !== -1 ? carryCamera(exactIndex, panes[index]) : NaN;
    if (Number.isFinite(exact)) return exact;
    const ids = keys[index].split("-");
    const overlappingIndex = previousKeys.findIndex(key => key.split("-").some(id => ids.includes(id)));
    const overlapping = overlappingIndex !== -1 ? carryCamera(overlappingIndex, panes[index]) : NaN;
    if (Number.isFinite(overlapping)) return overlapping;
    requestLegoCrossfade();
    return cameraForGroup(group, panes[index].width);
  });
  state.legoSplitLineCount = groups.length;
  state.legoMergeBoundarySnapshots = {};
  rememberLegoSplitLines(groups);
}

function getActiveLegoPaneGroups() {
  if (state.legoPaneGroupKeys.length > 0) return getStoredLegoPaneGroups();
  const humans = getHumanRacers();
  return splitOverflowingLegoPaneGroups([getLegoPaneRacers(humans)]);
}

function getStoredLegoPaneGroups() {
  return state.legoPaneGroupKeys.map(key => (
    key.split("-")
      .map(id => state.racers.find(racer => String(racer.playerIndex) === id))
      .filter(Boolean)
  )).filter(group => group.length > 0);
}

function seedSharedCameraFromLegoPanes(groups) {
  if (state.legoPaneCameras.length === 0) return;
  if (state.legoRows !== 1) {
    // Coming straight out of the two-row layout: frame the group afresh.
    requestLegoCrossfade();
    state.camera = cameraForGroup(groups.flat(), W);
  } else {
    state.camera = sharedCameraFromLegoPanes(groups);
  }
  state.cameraZoom = 1;
  state.legoPaneCameras = [];
  state.legoPaneGroupKeys = [];
  state.legoRows = 1;
  state.legoRowOfRacer = {};
}

function sharedCameraFromLegoPanes(groupsOrHumans) {
  if (state.legoPaneCameras.length === 0) return state.camera;
  const groups = Array.isArray(groupsOrHumans[0]) ? groupsOrHumans : getLegoPaneGroups(groupsOrHumans, Infinity);
  const panes = getLegoPaneLayout(groups, 1);
  const candidates = panes.flatMap((pane, index) => {
    const paneCamera = state.legoPaneCameras[index];
    if (!Number.isFinite(paneCamera)) return [state.camera];
    return pane.group.map(racer => {
      const screenXInPane = racer.x - paneCamera;
      const screenXInShared = pane.x + screenXInPane;
      return racer.x - screenXInShared;
    });
  });
  const average = candidates.reduce((sum, camera) => sum + camera, 0) / candidates.length;
  const maxCamera = Math.max(0, FINISH - W + 260);
  return clamp(average, 0, maxCamera);
}

function updateLegoPaneCameras(panes, dt = 0) {
  for (let index = 0; index < panes.length; index += 1) {
    const pane = panes[index];
    const maxCamera = Math.max(0, FINISH - pane.width + 260);
    const targetScreenX = pane.width * (pane.group.length === 1 ? LEGO_CAMERA_TARGET_RATIO : 0.5);
    if (!Number.isFinite(state.legoPaneCameras[index])) {
      state.legoPaneCameras[index] = cameraForGroup(pane.group, pane.width);
      continue;
    }
    let camera = clamp(state.legoPaneCameras[index], 0, maxCamera);
    const groupCenter = (Math.min(...pane.group.map(racer => racer.x)) + Math.max(...pane.group.map(racer => racer.x))) / 2;
    const screenX = groupCenter - camera;
    const desired = cameraForGroup(pane.group, pane.width);
    const offsetFromTarget = screenX - targetScreenX;
    const centerVelocity = getLegoGroupCenterVelocity(pane.group);
    const movingAwayFromTarget = Math.sign(centerVelocity) === Math.sign(offsetFromTarget) && Math.abs(centerVelocity) > 1;
    let nextCamera = camera;
    if (movingAwayFromTarget) {
      const maxStep = Math.abs(centerVelocity) * LEGO_CAMERA_CATCHUP_RATE * dt;
      nextCamera = clamp(moveToward(camera, desired, maxStep), 0, maxCamera);
    }
    state.legoPaneCameras[index] = cameraKeepingLegoGroupVisible(pane.group, pane.width, nextCamera, maxCamera);
  }
  state.legoPaneCameras.length = panes.length;
}

function getLegoGroupCenterVelocity(group) {
  if (group.length === 0) return 0;
  const sorted = getLegoPaneRacers(group);
  const left = sorted[0];
  const right = sorted[sorted.length - 1];
  const leftVelocity = Number.isFinite(left.cameraVelocityX) ? left.cameraVelocityX : left.speed || 0;
  const rightVelocity = Number.isFinite(right.cameraVelocityX) ? right.cameraVelocityX : right.speed || 0;
  return (leftVelocity + rightVelocity) / 2;
}

function cameraKeepingLegoGroupVisible(group, paneWidth, camera, maxCamera) {
  if (group.length === 0) return clamp(camera, 0, maxCamera);
  const margin = Math.min(LEGO_PANE_KEEP_VISIBLE_MARGIN, paneWidth * 0.28);
  const left = Math.min(...group.map(racer => racer.x));
  const right = Math.max(...group.map(racer => racer.x));
  const minimumCamera = right - (paneWidth - margin);
  const maximumCamera = left - margin;
  if (minimumCamera > maximumCamera) return clamp(cameraForGroup(group, paneWidth), 0, maxCamera);
  const lowerBound = Math.max(0, minimumCamera);
  const upperBound = Math.min(maxCamera, maximumCamera);
  if (lowerBound > upperBound) return clamp(cameraForGroup(group, paneWidth), 0, maxCamera);
  return clamp(camera, lowerBound, upperBound);
}

function moveToward(value, target, maxStep) {
  if (maxStep <= 0) return value;
  if (Math.abs(target - value) <= maxStep) return target;
  return value + Math.sign(target - value) * maxStep;
}

function drawLegoPaneLabel(pane) {
  const racer = pane.group[0];
  if (!racer) return;
  const text = pane.group.length > 1
    ? pane.group.map(member => racerTag(member)).join(" + ")
    : racer.ai ? racerTag(racer) : `${racerTag(racer)}: ${racer.name}`;
  const compact = pane.zoom !== 1;
  ctx.save();
  ctx.font = compact ? "800 12px system-ui" : "800 15px system-ui";
  const boxW = Math.min(compact ? 170 : 150, pane.screenW - 24, ctx.measureText(text).width + 26);
  const boxH = compact ? 24 : 34;
  const boxX = pane.screenX + (compact ? 8 : 12);
  const boxY = compact ? pane.screenY + pane.screenH - boxH - 8 : pane.screenY + 78;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.strokeStyle = racer.ai ? "rgba(23,33,38,0.22)" : slotColor(racer.playerIndex);
  ctx.lineWidth = 2;
  roundRect(boxX, boxY, boxW, boxH, compact ? 6 : 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(boxX, boxY, boxW, boxH);
  ctx.clip();
  ctx.fillStyle = racer.color;
  ctx.textAlign = "left";
  ctx.fillText(text, boxX + (compact ? 9 : 12), boxY + (compact ? 17 : 22));
  ctx.restore();
}

function drawLegoSplitLines(positions, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = LEGO_SPLIT_LINE_WIDTH;
  ctx.shadowColor = "rgba(23,33,38,0.38)";
  ctx.shadowBlur = 8;
  for (const line of positions) {
    ctx.beginPath();
    if (typeof line === "number") {
      ctx.moveTo(line, 0);
      ctx.lineTo(line, H);
    } else {
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
    }
    ctx.stroke();
  }
  ctx.restore();
}
