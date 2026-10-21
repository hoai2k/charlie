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
- `assets/claudia-v2/` contains the exported WebP rig and generated config.
  Runtime image caching decodes the shared head once per loaded doll, and
  feature names have their own namespace to avoid head/patch collisions.

Registration error measures agreement of unchanged features, not artistic
quality of the mouth or anatomical accuracy. Review the assembled preview
after changing source art; an automatic build does not replace visual QA.

## Validation (2026-10-21)

All eight expression sources passed registration; all six necks were detected.
Automated tests check asset references, fixed head geometry, attachment scale,
patch coordinates, feature namespaces, and expression priorities. Browser
checks use synthetic tracking inputs. A physical camera session was not
available, so live-device tracking feel remains a user-device check; the
tracking/stabilization pipeline itself is unchanged.
