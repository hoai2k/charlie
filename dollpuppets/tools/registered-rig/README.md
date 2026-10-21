# Registered puppet rig

Claudia's magenta dance-dress update uses one fixed head and small registered
facial patches. It does not use full-head expression swaps or workbench layout
offsets. The existing tracker, stabilizer, expression triggers and hand gestures
still drive it. Other dolls keep the legacy renderer.

## Rebuild

Dependencies: Python 3, Pillow, NumPy and OpenCV (`opencv-python`).

```sh
python3 dollpuppets/tools/registered-rig/build.py claudia
node --test dollpuppets/tools/registered-rig/registered-face.test.mjs
python3 -m http.server 8000
```

Open `/dollpuppets/tools/registered-rig/preview.html` for a camera-free check
through the production renderer, then `/dollpuppets/?character=claudia` for
the actual game. The preview exercises speech, laughter, kiss, tongue, frown,
blink, independent wink, brows, hand tags, head tilt and a legacy-doll control.
The first row compares Claudia directly with original Claudia, Marisol, Rumi
and Juliette. "Show anchors" overlays pupils, lips, neck and the hand effect
origin. The bubble and heart cases cycle so their actual effects can be checked.
The game still needs camera permission for live face/hand tracking.

## How alignment works

- `sources/claudia/` preserves the generated master head, expression atlas and
  six headless body poses. Art was made with the built-in image generator;
  `claudia-generation.json` records the prompts and identity reference.
- `claudia.json` measures the master head once: eye/brow/mouth regions, head
  pivot and chin/neck anchor. These are agent-owned measurements. There are no
  hand-tuned offsets per expression or pose.
- SIFT features and a RANSAC similarity transform register each expression
  to the master. The build requires at least eight inliers and median error
  at most two pixels on a 640-pixel head. `claudia-report.json` records results.
- Mouth/eyelid patches use Poisson colour matching and feathered edges. Only
  those regions can change; curls, bow, nose, chin and silhouette stay fixed.
  Brow sprites are extracted once and their static originals inpainted out,
  allowing tracked brow movement without doubled eyebrows.
- Alpha-connected components find the six bodies despite uneven gutters.
  The magenta garment locates the torso centre; the neck silhouette supplies
  an attachment anchor and scale. Every pose has the same rendered neck width.
  Exports crop the full-body source to a torso, matching the existing puppets.
  The body is 1.5× larger relative to the head than the initial full-body rig,
  and attaches inside the neck stump rather than at its top edge. Claudia now
  uses the same stage framing and head-width limits as the other dolls.
- Pupil centres are measured separately from eyelid patch bounds for camera
  fitting. The bubble origin is calibrated to the new lips; the heart origin
  is detected from the enclosed alpha gap between the hands, then converted
  to the cropped torso's coordinates. Head tilt moves the lip origin with it.
- `assets/claudia-v2/` contains the exported WebP rig and generated config.
  Runtime image caching decodes the shared head once per loaded doll, and
  feature names have their own namespace to avoid head/patch collisions.
  A revision hash of the spec, sources and builder versions the image URLs,
  so changed body art cannot be combined with cached full-body images.

Registration error measures agreement of unchanged features, not artistic
quality of the mouth or anatomical accuracy. Review the assembled preview
after changing source art; an automatic build does not replace visual QA.

## Validation (2026-10-21)

All eight expression sources passed registration; all six necks were detected.
Automated tests check asset references, fixed head geometry, attachment scale,
patch coordinates, feature namespaces, and expression priorities. Browser
checks compare the older dolls alongside Claudia and overlay the anchors.
Production-renderer tests additionally check the drawn bubble against the
rotated lips and the emitted heart against the measured hand gap, and verify
eye fitting at phone and desktop sizes in both scene and camera modes. Browser
checks use synthetic tracking inputs. A physical camera session was not
available, so live-device tracking feel remains a user-device check; the
tracking/stabilization pipeline itself is unchanged.
