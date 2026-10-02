# Game audit & recommendations

Audit of both games after importing them into this repo (October 2026).
Both games were smoke-tested in headless Chromium, locally under `/charlie/`
and live at `https://games.hoai.net/charlie/`:

- **American Girl Doll Race**: loads with no console errors or 404s, the race
  starts, and music plays.
- **Doll Puppets**: all 464 requests succeed, the MediaPipe tracker starts,
  every character and background switches, and pause/resume works.

The findings below come from reading the code. They cover things a smoke test
can't catch: iPad behaviour, slow networks, and failure paths. Line numbers
refer to the code as imported.

## Status (October 2026)

Fixed:

- **Site-wide:** HTTPS redirect inside Doll Puppets (still tick "Enforce
  HTTPS" in the Pages settings so the whole site benefits); version strings
  on the race's scripts and stylesheet.
- **Race:** #1 (early PLAY), #2 (Web Audio, so volumes work on iPad), #3 (WebP
  only, 34.3 → 4.5 MB; sprite sheets are still full resolution), #4
  (letterboxed in portrait), #5 (stuck keys, pause when hidden), and the
  voice-casting experiments are removed from the site.
- **Puppets:** #1 and #2 (specific camera errors, a "Try again" button, camera
  turned off when tracking fails, dead or hung tracker detected), #3
  (automatic tracker restart), #4 (no camera stream leaks on fast
  Pause/Resume), #5 (camera off while hidden, restarted if the browser ends
  it), #6 (the tracker sees the camera's real shape; tilt consistent in
  portrait), #7 (pose held through dropouts and smoothed, so no jumping to
  the centre), #9 (WebP, 107.9 → 12.0 MB), and #11 (models pinned to
  version 1).

Everything else below is still open. The race's jump sound and unused sound
effects (#7) are deliberately left alone for now.

## Top priorities

If you only do a handful, do these. They matter most for a child playing on
an iPad.

1. **Turn on "Enforce HTTPS" for GitHub Pages.** This is a site-wide setting
   (see [Site-wide](#site-wide)). Without it, Doll Puppets can't use the camera
   for anyone who arrives over `http://`.
2. **Race: stop PLAY from breaking while images are still loading.** See
   [Race #1](#r1).
3. **Race: move audio to the Web Audio API.** On iPad, every volume setting is
   currently ignored. See [Race #2](#r2).
4. **Puppets: give clear camera error messages with a "Try again" button, and
   turn the camera off when tracking fails.** See [Puppets #1–2](#p1).
5. **Both games: convert the PNGs to WebP.** Measured savings are 60–90%.
   Race goes from 34 MB to 4.5 MB; a single doll goes from 8 MB to under 1 MB.
6. **Both games: pause when the tab or app is hidden.** See [Race #5](#r5) and
   [Puppets #5](#p5).

---

## Site-wide

- **Enforce HTTPS.**
  - Pages serves the site at `games.hoai.net` (the custom domain on the
    `hoai2k.github.io` user site). HTTPS works there, but `http://` doesn't
    redirect to it, and `hoai2k.github.io/charlie/` redirects to the
    `http://` URL.
  - Browsers only allow the camera on HTTPS. Over `http://`, Doll Puppets
    falls back to its demo doll and shows "Camera permission is needed",
    with no way to fix it.
  - **Fix:** in the settings of the repo that owns the custom domain, go to
    **Settings → Pages** and tick **Enforce HTTPS**.
  - As a belt-and-braces fix, Doll Puppets could also redirect `http:` to
    `https:` itself.
- **Cache-busting.** Pages caches files for about 10 minutes. Only
  `americangirldollrace/styles.css` has a `?v=` version string, so right after
  a deploy a browser can load new CSS alongside old JS. Use the same version
  string on all JS and CSS files, or accept the 10-minute window.
- **Install to home screen.** Add a `manifest.webmanifest` with
  `display: fullscreen` and the Apple web-app meta tags to each game. "Add to
  Home Screen" on the iPad would then launch the game full-screen, like an
  app, which is the best setup for a kid.

---

## American Girl Doll Race

Overall, the code is well made: tidy, with named tuning constants. It already
supports touch, gamepads, pause and fullscreen. The weak spots are loading
timing, iPad Safari audio, and download size (63 MB, of which about 39 MB must
download before play).

### High

<a id="r1"></a>**1. Pressing PLAY before images finish loading breaks the game.**
- **Where:** `game.js:432-438`
- **What happens:** `waitForAssets()` calls `resetRace()` once the 19 PNGs
  have decoded. If PLAY was pressed during that wait, the race is reset
  mid-flight: the start panel stays hidden, music keeps playing, Pause does
  nothing, and only a reload recovers.
- **Also:** if any `img.decode()` fails, the promise rejection isn't handled,
  so the menu never starts.
- **Fix:** disable PLAY (or show "Loading…") until assets are ready, and wrap
  the wait in `try/catch` with a "Tap to retry" message.

<a id="r2"></a>**2. Volume settings are ignored on iPad.**
- **Where:** `audio.js:171, 305, 350, 377`
- **Cause:** all sound uses `HTMLAudioElement.volume`, which iOS/iPadOS Safari
  ignores.
- **What happens:** sound effects play at full volume instead of the
  configured `sfxVolume: 0.15`. Per-sound trims, pause fades and the victory
  ducking do nothing, and the end-of-race music crossfade plays both tracks at
  full volume together.
- **Fix:** move the engine to Web Audio.
  - Create one `AudioContext`, resumed on the first tap in `GameAudio.unlock`.
  - Decode sound effects into `AudioBuffer`s and give each bus a `GainNode`.
  - Route music through `createMediaElementSource`.
  - The public `GameAudio` API can stay the same.

**3. Images are 34 MB of PNG and take about 140 MB of memory once decoded.**
- **Where:** `game.js:247-267`
- **Why this is wasteful:**
  - The five 2172×724 backgrounds have no transparency, so they don't need
    to be PNG.
  - Sprite frames are 418 px but are drawn at only about 165–215 px.
  - `icons_alpha.png` is 2804 px wide, but its icons are drawn at 68 px.
- **Measured savings:**
  - WebP at quality 82: 34.3 MB → 4.5 MB.
  - Also halving the sprite sheets and the icon sheet: 34.3 MB → 2.9 MB, with
    decoded memory about 4× smaller. That's a real crash risk removed on
    older iPads.
- **Fix:**
  - Convert to WebP.
  - Halve the sprite sheets and set `FRAME = 209`.
  - Scale `POWERUP_ICON_RECTS` to match the smaller icon sheet.
  - Visually check the monster afterwards, since it is drawn at 1.3×.

### Medium

**4. The picture is stretched in portrait.**
- **Where:** `game.js:423`, `styles.css:52-57`
- **What happens:** the canvas width is clamped to at least 640, then CSS
  stretches it to fill the frame. On an upright iPad this distorts the
  picture by about 20%.
- **Fix:** either use `object-fit: contain` and map touch coordinates to
  match, or show a "Turn your iPad sideways" overlay.

<a id="r5"></a>**5. Keys get stuck, and the game doesn't pause when hidden.**
- **Where:** `game.js:4065-4079`
- **What happens:**
  - Keys held while the window loses focus stay "down" forever.
  - When the tab is hidden, the race freezes but the music keeps playing.
- **Fix:**
  - On `blur`, call `keys.clear()`.
  - On `visibilitychange`, auto-pause.

**6. The global key handler blocks keyboard use of the menus.**
- **Where:** `game.js:4065-4075`
- **What happens:**
  - Space, Enter and the arrow keys are always `preventDefault`ed, so Enter
    on a focused button and arrow keys in a `<select>` do nothing.
  - Holding Esc auto-repeats, so pause toggles on and off repeatedly.
- **Fix:**
  - Only block those keys while a race is running.
  - Ignore `event.repeat` for Esc.

**7. Jumping is silent, and 32 sound types are shipped but never played.**
- **Where:** `game.js:1500`; the `vo` section of the manifest is empty.
- **What happens:**
  - Jumps only trigger a racer voice, and there are no voices, so jumping
    makes no sound.
  - `jump_takeoff`, `jump_land_*`, `hurdle_clip`, `countdown_*`,
    `footstep_doll`, `amb_*_loop` and more (62 files, 1.9 MB) are never used.
- **Fix:** either wire them up or delete them. A 3-2-1 countdown using
  `countdown_tick` and `countdown_go` would suit a young player;
  `state.countdown` already exists but is unused.

**8. Music downloads are larger than needed.**
- **Where:** `assets/music/`
- **Details:**
  - The six tracks total 23.9 MB at about 190 kbps.
  - `Moss Under Moon.mp3` (4 MB) is never used.
  - `Plastic Shoes.mp3` is preloaded at page load, competing with the images.
- **Fix:**
  - Delete the unused track.
  - Re-encode the rest at 96–128 kbps, which brings them to about 10–13 MB.
  - Use `preload="metadata"`.

**9. There's no mute or volume button.**
- **Where:** `audio.js:478`
- **Details:** `GameAudio.setMuted` and `setVolume` exist but can only be
  reached from the browser's developer console.
- **Fix:** add a mute toggle on the start screen and pause panel, saved to
  `localStorage`. A music/SFX slider in Settings would be a bonus.

### Low

- **Touch buttons.**
  - Jump and Push sit top-left (`styles.css:319-327`), away from where a
    child's thumbs are. Move them bottom-right and make them bigger (about
    96 px).
  - The help text says "Tap Jump or Hit", but the button is labelled
    "Push/Throw" (`game.js:694`).
  - Picking a doll on the menu doesn't work by touch.
- **Victory timers aren't cancelled.** The fanfare and fireworks
  `setTimeout`s (`game.js:1152-1181`) can sound over the next race. Clear
  them in `startRace` and `returnToMenu`.
- **Duplicate manifest.** `assets/audio/manifest.js` is what loads;
  `manifest.json` is an unused fallback. Keep one of them.
- **Unused files are deployed.**
  - `assets/audio/vo/_casting/` holds 8 voice-casting samples (2 MB) that
    nothing references.
  - The constants `BOARD_WIDTH` and `PLAYER_BACK_SPEED`, the function
    `isRacerVisible`, and `state.countdown` are unused.
- **Retina sharpness.** The canvas is always 720 px tall, so it's upscaled
  about 2× on iPad. Optionally render at `min(devicePixelRatio, 1.5)`.
- **Fullscreen button on iOS.** It does nothing on iPhone and on older
  iPadOS, which only support `webkitRequestFullscreen`. The home-screen
  install (see [Site-wide](#site-wide)) is the better answer.
- **Code organisation.** `game.js` is a single 4,165-line file. It's
  readable, but if it keeps growing, split it into modules (input, audio,
  physics, render, UI).

---

## Doll Puppets

Overall, the core loop works well, and camera frames never leave the device:
there are no fetch, beacon or storage calls, and frames go only to the
same-origin worker. Most issues are in startup and failure handling. Every
failure shows the same "Camera permission is needed" message with no retry.

### High

<a id="p1"></a>**1. One misleading camera error, and no retry.**
- **Where:** `src/core/camera.js:6`, `site.js:309-322`
- **What happens:** the same "Camera permission is needed for AR tracking"
  message appears for all of these:
  - camera access denied;
  - no camera;
  - camera already in use;
  - CDN or model download failure;
  - plain `http://`, where `navigator.mediaDevices` is undefined.

  After that the game stays in demo mode for good, because nothing calls
  `startCamera()` again.
- **Fix:**
  - Map `error.name` to friendly messages: `NotAllowedError`,
    `NotFoundError`, `NotReadableError`, insecure context.
  - Add a big "Try camera again" button.

**2. A tracking failure can leave the camera on, or hang startup.**
- **Where:** `site.js:310-317`, `src/core/worker-tracker.js:48-53`
- **What happens:**
  - The camera starts before `tracker.configure()`. If configure fails, the
    catch block never calls `camera.stop()`, so the camera light stays on
    while the demo doll plays.
  - Worse, if the worker's CDN import fails before `configure` is sent, the
    worker's `error` event fires while nothing is pending. Later requests are
    then never answered, so `startCamera` hangs forever.
  - This hang hasn't been reproduced yet. To check it, block
    `cdn.jsdelivr.net` in DevTools.
- **Fix:**
  - Mark the tracker dead on `error` and reject any later requests.
  - Add request timeouts: about 20 s for configure, about 2 s for estimate.
  - Call `camera?.stop()` in the catch block.

### Medium

**3. Tracking freezes silently if the worker dies mid-session.**
- **Where:** `site.js:217-233`
- **What happens:** `trackingInFlight` never clears once the worker is gone,
  so the doll freezes on its last pose.
- **Fix:** use the estimate timeout from #2. After a few failures, dispose
  the tracker, create a new one, and show "Restarting…".

**4. Fast Pause/Resume clicks can leak a camera stream.**
- **Where:** `camera.js:5`, `site.js:254-283`
- **What happens:** `start()` overwrites `stream` without stopping the old
  one, and nothing stops two calls overlapping. The camera can stay on while
  the game says "Paused".
- **Fix:**
  - Call `stop()` at the start of `start()`.
  - If the game was paused while `getUserMedia` was still pending, stop the
    new stream as soon as it arrives.

<a id="p5"></a>**5. The game doesn't react when the tab is hidden or the camera
track ends.**
- **What happens:**
  - The camera stays on in a background tab.
  - On iPad, returning to Safari can leave the video stopped, with no
    automatic recovery. (This is inferred, not tested on a device.)
  - The Pause button, the only manual way to recover, is hidden at widths
    of 640 px or less (`site.css:98`).
- **Fix:**
  - On `visibilitychange`, call `setPaused(document.hidden)`.
  - On a track's `ended` event, restart the camera.

**6. The face is squashed in portrait.**
- **Where:** `site.js:210-214`, `src/core/puppet-state.js:307-315`
- **What happens:**
  - Frames are always resized to 360×270 (landscape 4:3). A portrait iPad
    camera feed gets stretched about 2.4× before MediaPipe sees it, which
    hurts expression detection.
  - Head tilt is calculated from non-square coordinates, so it's
    exaggerated in landscape and understated in portrait.
- **Fix:**
  - Resize using the video's own aspect ratio.
  - Compute tilt in pixel space.

**7. The doll jumps when the face is briefly lost.**
- **Where:** `puppet-state.js:92-96`, `render.js:521-523`
- **What happens:**
  - With no face detected, the doll snaps to the centre with a neutral
    expression. One missed frame from a wiggly child is enough to trigger it.
  - Movement also updates in 18 Hz steps, so it looks jerky.
- **Fix:**
  - Hold the last pose for about 500 ms, then ease back to centre.
  - Smooth position, size and rotation every frame.

**8. Switching characters quickly can show the wrong doll.**
- **Where:** `render.js:266-347`
- **What happens:**
  - `loadDoll` is async with no request token, so a slow earlier load can
    finish last and win.
  - The screen also blanks to "loading dolls" during the whole download,
    about 8 MB.
- **Fix:**
  - Use a load token and ignore results that come back stale.
  - Keep drawing the old doll until the new one is ready.

**9. Heavy PNG assets.** All measured:

| Asset | Now | WebP |
| --- | --- | --- |
| One character (Rumi) | 7.95 MB | 3.2 MB lossless / 0.74 MB at q90 |
| Effects | 3.67 MB | 0.43 MB |
| Backgrounds | 13.1 MB | 1.7 MB |

- Characters already load lazily, one at a time.
- **Fix:** convert to WebP and update the `.png` paths in each
  `assets/<name>/config.js`. A careful `sed` will do it, since the generator
  script isn't in this repo.

**10. Opening Settings downloads 13 MB just for thumbnails.**
- **Where:** `site.js:373`
- **What happens:** the background previews use the full 2172×724 images.
- **Fix:** add small WebP thumbnails, about 6 KB each.

**11. Pin or vendor the CDN dependencies.**
- **Where:** `src/workers/tracking-worker.js:57, 71, 83`
- **What's wrong:**
  - The models load from `…/float16/latest/…`. A silent model update could
    break the hand-tuned thresholds in `gameConfig.js`, such as tongue and
    kiss detection.
  - The MediaPipe library is pinned to `@0.10.35`, which is good, but there
    is no fallback if the CDN is blocked.
- **Fix:**
  - Pin the model URLs to `/1/`, which exists for both models.
  - Optionally vendor everything into the game folder: about 23 MB of wasm
    and models, which shrinks with the unused pose code removed. The game
    would then work on networks that block jsdelivr or googleapis, make no
    requests to Google, and could later work offline.

### Low

- **Leftovers from the flattening.**
  - Pose/full-body tracking is never used by this game. That covers
    `PoseLandmarker` in `tracking-worker.js`, `TRACKING_MODES.full`, and
    `createBodyState` in `puppet-state.js`; all can be deleted. (The
    `pose_*` names in `render.js` are doll body sprites, so keep those.)
  - `juliette2` is a debug-only near-copy of `juliette`. It adds 8.2 MB to
    the repo, and its config is imported for everyone. Drop it unless it's
    still needed for tuning.
  - The `config.js` headers say "Do not edit directly", pointing at a build
    script that isn't in this repo.
- **`?debug` capture.** It downloads a JSON file containing a full-resolution
  photo from the camera. This happens only on the device, but consider a less
  guessable URL parameter or a confirm prompt.
- **First run for a young child.**
  - The camera prompt appears with no explanation.
  - The status text is small (13 px).
  - "loading dolls" is near-white text on a pale sky, with no progress
    indicator.
  - One failed sprite fails the whole character.
  - **Fix:** a big "Tap to play with the camera" start screen. It would
    explain the camera, give the browser the user gesture it needs, and
    double as the retry path. Add a spinner too.
- **Mobile details.**
  - Add `viewport-fit=cover`; without it, `env(safe-area-inset-*)` is 0 on
    devices with a notch or home bar.
  - Show the Pause button on small screens.
  - Optionally try MediaPipe's `delegate: "GPU"`, falling back to CPU. The
    gain on iPad is unverified.
