# Sprite production: practical agent guide

This records lessons from the October 2026 Charlie Party art pass. Read
`party/image-requests.md` for requirements, `party/reference/IMAGE-WORK-QUEUE.md`
for ownership, and this directory's README for the intake schema. Requirements
and the user's latest approvals override this guide.

## Divide work to conserve credits

Give a lighter agent one character (or a named family of props) with an explicit
list of files it owns. It can generate, crop, annotate, build and validate using
the established pipeline. A second lighter agent can check coverage and paths.
Reserve the integrator's attention for identity, proportions, animation quality,
attachment placement, shared-code changes and browser checks. Avoid having
multiple agents independently audit the entire repository.

Do not regenerate finished artwork. First inspect the index, character spec,
source sheets and generation prompt records. Count authored frames separately
from aliases. A working procedural fallback is not a delivered image.

## Generate economical, usable sheets

Use the imagegen skill and built-in image tool. View the canonical before using
it. One character's pose sheet is one asset; unrelated props require separate
calls. Preserve original generated PNGs outside the repo, save lossless WebP
source sheets here, and ship compressed runtime frames. Record the exact prompt
and source path immediately, so a later agent can continue without chat history.

Useful prompt structure: approved reference and identity invariants; transparent
sprite sheet; exact ordered poses; full body in every cell; consistent head size,
camera and outline weight; generous gutters; no text, shadows, scenery or props.
Eight poses in a four-column/two-row sheet worked well for action coverage.
Smaller dedicated sheets are easier to control for walk/run/dance cycles.

Prefer an edit of the neutral sprite for the closed-eye blink: a separately
invented idle frame often changes body shape. Use a long open-eye duration and a
short blink (about 0.12 seconds), varied across characters. Four authored dance
frames at 4 fps and 3–4 celebration frames are useful investments. Short actions
can use one strong key pose plus the engine's procedural motion.

Keep held items separate. A tiny cup was accidentally baked into Felicity's
drink pose; it had to be removed. Ask for empty hands or an empty gripping pose.
Storm Cloud's lightning is rendered separately from normal/zap cloud artwork.

## Crop, scale and anchor correctly

Example intake:

```sh
python3 party/tools/sprites/add_sheet.py CHARACTER /absolute/source.png actions-a \
  push,carry,paint,cast,clap,eat,bow,stir --rows 2 --facing 0
python3 party/tools/sprites/build.py party/tools/sprites/specs/CHARACTER.json
```

`add_sheet.py` chooses the largest connected figures and sorts the rows. It is
an initial crop estimate, not semantic validation. Check pose order, disconnected
parts, adjacent figures and isolated effect marks. The `isolate` option can drop
small particles, but can also drop a detached body part. Inspect the result.

For a single-row strip, sort figures strictly left-to-right, never by their top
edge or vertical center. Airborne and crouched poses have different heights.
A custom y-first sorter silently reordered Fox's walk/run/dance/celebrate frames
and chose Hotdog's third (crouched) core figure as neutral. Check source rectangle
x coordinates against the prompt order. When reordering, move the entire frame
record, including its scale, landmarks and duration. For multi-row grids, cluster
into the declared rows first and sort left-to-right within each row. Finally
compare neutral and blink side by side: closing eyes must not change body pose.

Do not assume a generated grid has mathematically equal cells. A fourteen-pose
mermaid sheet used rows of 4/4/4/2 with figures crossing nominal row boundaries;
uniform crops clipped Marina's tail. Find each connected figure's actual bounds,
add a transparent margin, and verify every tail/crown/hand. Group the figures
according to the prompt's row counts. Runtime alpha/path validation cannot detect
a limb already clipped out of a source crop.

The build derives one common scale from neutral idle. **Do not normalize every
pose to neutral bounding-box height.** This made horizontal animal heads much
too large. Compare head width and torso size; a running, sitting or curled animal
should naturally be shorter. Use a frame's `scale` only to correct actual drawing
scale differences. Raised arms and a stretched tail must not shrink the head.

Frame `anchor`, `head`, `hand`, `eyes`, `neck` and `back` are source-crop-local
coordinates, before scaling and trimming. Build transforms them for runtime.
Use the feet/support point for grounded poses. Put the anchor below the feet at
the virtual ground for a jump, so its authored height is preserved. A large
canvas prevents clipping; trimmed runtime images keep download cost small.
Do not move every anchor to the bounding-box bottom: tails and raised feet can
make the character slide or bounce unintentionally.

Check landmarks visually for each pose, especially carry/cast/ride/eat. Animals
usually attach held items at the mouth; Bronze uses its pipe/manipulator; Cake
uses a suitable top/front attachment without inventing limbs. Head/eyes anchors
are also used by accessories. Match `facing` to the actual drawing, including
left-facing exceptional poses. Preserve individual anatomy: mermaids glide,
Cake has no limbs, and Bronze has one circular eye and a purple diamond antenna.

The image viewer sometimes displays colored RGB glow that is actually under
zero alpha. Check the alpha channel before wasting a regeneration. Maximum
alpha 254 is normal for some outputs. Never remove a white background by color
threshold; it destroys white fur, eyes and clothing. Regenerate true alpha if
the source is opaque.

## Review and validation checklist

1. Build, then inspect `qa-contact-sheet.jpg`. The faint neutral overlay exposes
   drift. Enlarge suspect poses; a dense thumbnail sheet can hide bad hands.
2. Inspect a few representative poses side by side at their actual runtime
   size: neutral, horizontal run, ride, jump, carry and dance. Check tiny 60px
   portraits and ensure expressive faces remain legible.
3. Use quality 82 when a long set needs compression (default is 86). Aim near
   1.5 MiB encoded and below 25 MiB decoded per member. Report exceptions instead
   of deleting requested frames merely to hide a warning.
4. Register only reviewed sets in `party/assets/sprites/index.json`.
5. Run the commands below after agents finish writing the affected files.
   Concurrent rebuilds can produce transient missing/corrupt-file errors.
6. Check the affected game in the browser, including attachment placement,
   animation timing and the console. Validator success cannot prove visual
   quality. Test one meaningful representative per integration, then expand
   only if it exposes a problem.

```sh
python3 party/tools/sprites/validate.py
node party/tools/sprites/runtime.test.mjs
node party/tools/sprites/art-loading.test.mjs
```

NPC-only sets intentionally omit player Tier-1 actions. Distinguish those
warnings from player omissions. KPop members must have matching pose vocabulary,
bodyHeight and frame counts, while retaining distinct blink timing/personality.
Use `ensureSpriteSet` and the existing NPC renderer for lazy loading; keep
procedural fallback behavior until artwork is ready.

Large art inventories can create bursts of image requests. The loader now limits
concurrency to six, shares decoded images across aliases and retries once. A
local browser warning occurred despite the file being present and decodable;
check the file before assuming generation failed.

## Checkpoint safely with concurrent agents

After merging shared modules, test on a no-cache local server. A reused browser
origin mixed old audio/input modules with new callers, producing missing-export
and missing-method errors even though the functions existed on disk. A fresh
preview origin with `Cache-Control: no-store` avoids this during development.
Before changing working code to chase such an error, verify the export on disk
and retest the complete current revision. Bumping only main.js does not itself
change the URLs of its imported modules.

Agents own disjoint character directories/specs/sources. The integrator owns
the shared index, shared engine edits and Git commits. Stage explicit paths;
never sweep another agent's half-written files into a commit. QA contact sheets
are review artifacts, not shipped assets (some outside runtime directories are
not ignored). Commit source, spec, exact prompts and runtime together.

Fetch main, inspect new commits/image requests, merge additive updates, validate
and push each completed character. Never force push. This machine's origin HTTPS
authentication failed; SSH to `git@github.com:hoai2k/charlie.git` worked. On this
external volume, macOS `._*` sidecars inside `.git` caused misleading pack-index
warnings. Remove only those sidecar files if they recur; do not delete real Git
pack/index files. Git mutations may require the tool's sandbox escalation.

When approaching the user's usage threshold, stop starting new generations,
finish and save in-flight outputs, commit reviewed work, and write exact pending
tasks and file paths. Leave unreviewed partial sets explicitly marked as partial.
Do not rely on tool-result memory as the only copy of a prompt or output path.


## Expanded-set checkpoint lessons

Compare manifest keys with the union of every current request section after
syncing main. A broad 74-key set can still miss `paint`; save an exact pending
prompt rather than claiming complete coverage or aliasing another pose.
When expanding long sets past the decoded budget, reduce the common frame size,
bodyHeight and output anchor together. Reducing only newly added frame scales
causes the character to shrink between actions. Keep source-relative landmark
points and source action scale consistent with the neutral head size.

Authored twirls need front, three-quarter, back and three-quarter frames. A
single front pose with a procedural paper-width spin does not satisfy this.
Keep balance art free of baked platforms and Storm Cloud lightning separate.

A source-only checkpoint belongs in `pending/`, outside shipping specs, with
exact prompts and clear unreviewed landmarks. Restore the shipping spec so a
future blanket build cannot silently intake draft geometry. Never label draft
points as visually verified.

The request heartbeat checks new and changed requests every 30 minutes and
cancels after one unchanged interval. It must honor the user's usage pause: queue
new work while paused, without launching generation automatically.

## Runtime landmark and optimizer checks

Inspect landmarks on the built runtime pixels. If a point needs correction,
convert it back to source-crop coordinates using:
`sourceAnchor + (desiredRuntimePoint - runtimeFrameAnchor) / (commonScale * itemScale)`.
Full-sheet coordinates must first have the crop origin subtracted. Source-sheet
overlays alone cannot prove runtime attachment placement.

Run `optimize.py CHARACTER` after every final rebuild and commit the optimized
files with `sprites-opt/index.json`. The optimizer ignores macOS `._*` sidecars.
Review both default optimized mode and `&quality=full` in actual games.
The user revoked the former allowance pause for Sol; only an explicit new pause
should stop production.

The optimizer now locks and re-reads its shared index only after encoding each
character, so simultaneous character jobs preserve each other's fingerprints.
When merging independently encoded optimized copies, retain the reviewed full
source and rebuild its optimized derivatives; preserve unrelated originals.

`build.py` decodes each source sheet once per build, copies pixels before alpha
cleanup, and releases the source cache before encoding. This avoids repeated
external-volume reads during annotation iterations without changing artwork.

## Final review refinements

Review crouched animal points individually. An upright head/eye/neck template
does not fit a lowered head, even when the pose scale is correct. Put the eyes
between the visible eyes, the head at the skull, the neck at the white chest or
neck join and the hand at the actual mouth. A source-coordinate change that
looks plausible must still be checked on the next built runtime overlay.

Marina's painting pose succeeded with an activity-specific purple painting
smock after several output refusals with no specific cause supplied. Keep that
successful master and its exact prompt; do not infer a moderation cause from
the refusals. Her approved canonical stays unchanged. Preserve identity and
use ordinary appropriate activity clothes when a pose benefits from them.

The color-variant system requires `make_masks.py` after final sprite changes to
Felicity, KPop center and Princess Amber. The masks are classified from existing
pixels; no extra generated recolor artwork is required. Include them in the
same reviewed character delivery and validate their source fingerprints.
