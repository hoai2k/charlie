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
