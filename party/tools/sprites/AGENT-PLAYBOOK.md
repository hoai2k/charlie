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

If the user imposes a new usage threshold, honor it and stop starting generations,
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

The current image-request follow-up checks every 30 minutes (user,2026-10-13). Continue outstanding production; do not start a quiet window while any request remains. After completing and publishing all outstanding images, sync and check immediately, then reset the same follow-up for 30 minutes after that delivery. Fill any new requests and repeat. Cancel only when that full30-minute post-delivery interval contains no new requests. Status/archive changes alone do not count. The former allowance pause is revoked.

## Runtime landmark and optimizer checks

Inspect landmarks on the built runtime pixels. If a point needs correction,
convert it back to source-crop coordinates using:
`sourceAnchor + (desiredRuntimePoint - runtimeFrameAnchor) / (commonScale * itemScale)`.
Never paste a runtime pixel coordinate directly into a source-local spec. Rebuild
and inspect the resulting marker on the actual mouth, palm or hoof. A point
inside the canvas can still float far outside the character.
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

Read action descriptions before writing sheet prompts: Round2 `flip` means
reaching out to flip a memory card, and `photo` means a camera-facing peace sign.
Short pose keys alone are ambiguous. Review the actual requested gesture, not
only the generated pose label; a correct label can hide the wrong action.

Use `review_frames.py ASSET --poses idle water photo paint --points --out /tmp/review.png`
to compare built pixels at their actual sizes on a shared ground baseline.
It resolves aliases and includes every frame, so an idle blink that changes
body pose or head size is easy to spot. Avoid review layouts that rescale each
cell separately or clip wide/airborne sprites. Head=red, eyes=cyan, neck=yellow,
hand=green, back=orange, anchor=white.

### Final runtime review lessons

Check the idle frame itself: a correct non-idle neck cannot fix a stale idle eye/neck marker (Scale needed25px upward correction). Compare all frames at their original pixel scale on a shared anchor baseline using review_frames.py; per-cell auto-fit hides head-size jumps. Correct source coordinates by the runtime anchor/scale inverse, then rebuild manifest and optimized fingerprint. Review card flip as a reaching gesture, photograph as peace sign, and full rear view in twirls. Large crouching/curled bodies need head-scale matching, not total-height matching. The builder now encodes to a temporary .tmp file and atomically replaces each WebP, preventing transient empty frames in preview or Git.

### Incremental rebuilds

Use the normal builder after landmark edits. New builds record hashes of the rendered art and encoded file. Subsequent builds update coordinates while reusing unchanged raster bytes; changed source art, alpha/crop/scale, encoding quality, missing files or file corruption force encoding. The first rebuild of older sets has no hashes and encodes normally. Do not manually copy coordinate metadata between different drawings. Run `python3 party/tools/sprites/build_test.py` after pipeline changes, then optimize the character and refresh its masks.

Audit every action against the exact sheet prompt and crop order: valid filenames do not prove the action is correct. Fox’s legacy rows had reciprocal sleep/clap and other swaps; reading the prompt and actual source sheet caught them. Check all inherited actions before declaring a full set complete.

Generated grids can exceed their nominal cell boundaries. Before accepting a
fixed-grid intake, inspect top-row feet and bottom-row heads against the full
source sheet. Expand a cell to include the complete connected figure and use
alpha isolation; move a standing anchor to the actual sole line. A cropped boot
in the runtime export does not necessarily require regenerating the source.

### Interactive props and new studio art

For a two-frame `pump`, put `hand` at the grip, forward paw/hoof, pipe tip or
body contact point, and compare head width against idle. A game button press
can select the down frame instead of letting the loop run independently.
Separate handles should follow the transformed grip; include any squash
applied during drawing. Keep companion phase offsets off for coordinated
pump loops. Preserve approved anatomy and keep tools outside character art.

If adding frames crosses the decoded-memory budget, reduce a pose's frame
scales and its `bodyHeight` by the same factor. This lowers raster resolution
while preserving the on-screen dimensions and attachment coordinates. Rebuild,
optimize, refresh applicable masks, validate and review the resulting pixels.

Hide & Seek fronts and backs must retain identical full canvases, even where
one layer is mostly empty. Independent alpha trimming makes their geometry
drift when fitted into the same box. Hiding surfaces need opaque interiors;
window and door openings need true alpha holes. Measure the actual generated
holes, rims, plates, lily pads and shelf boards, then align gameplay spots to
the art while preserving procedural fallback geometry. A convincing standalone
picture is insufficient: review the composite with hidden things in place.

### Publishing concurrent character batches

Do not stage the entire live optimized index while another character is being
rebuilt. Read the index from HEAD, replace only the reviewed character's `sets`
entry with the working entry, then stage that merged JSON blob with
`git hash-object -w --stdin` and `git update-index --cacheinfo`. Leave the live
working index intact for other agents. Commit only explicit character, source,
intake, mask and spec paths. Push every finished batch before reviewing the next.

Inspect every contact point on runtime pixels. A plausible generic coordinate
can land on hair, empty space or a thigh. Animal grips belong on the actual
paw/hoof/mouth; limbless characters use their pipe or body. Check full decoded
memory separately from optimized memory. Keep all existing pose-level bodyHeight
overrides proportional when lowering common resolution. Held pull/reel/putt
loops should use authored contact changes without extra procedural body tilt.

After merging main, assert all nine new action names remain registered; broad
runtime tests alone do not establish vocabulary coverage. New requests include
spring-jump, putt, putt-swing, swing, snow-scoop, dig, pull, reel and skip-hop.

### October 12: preserve audited shipping data and fit accessory art

Shipping manifests may contain a later landmark audit than their intake specs.
Compare before rebuilding. Synchronize every point and pose/frame bodyHeight,
including eyes:null on rear views. Exact inverse with builder integer placement:
sourcePoint=(runtimePoint-runtimeFrameAnchor+round(sourceAnchor*scale))/scale.
Preserve source crops/scales and compare all unaffected runtime fields after
rebuild; Cake 109 frames and Hotdog 108 unaffected frames were exactly preserved.
The builder passes through explicit null points and framebodyHeight, covered by
its incremental regression test.

Generated alpha can have nearly invisible residues far outside visible art.
Meaningful-alpha bounds (8–32) plus a small antialias margin avoid shrinking an
accessory to fit those residues. Alpha-extrema and exactcanvas alone do not
prove a valid anchor. Measure actual lens centres, wing roots, grips, ribbon or
chain tops. Preserve full source RGBA as lossless WebP before intake cropping.
Three horseshoe headbands needed measured consumeranchor fractions so their
seating arcs land on hair without shrinking the full silhouette. Review actual
Actor outfits, not only isolated props; OCT12-WEARABLE-REVIEW.html is a reusable
example. Preserve original prompt and sourcepaths in the intake record.

When main advances, compare each branch from its merge-base. A direct local
HEAD-to-remote diff can show unpublished local assets as deletions even though
the remote never deleted them. Verify reviewed assets survive the merge before
pushing. Stage only reviewed index/manifest entries when batches overlap.


### Play Studio delivery: grouped loading, measured geometry and provenance

Large sets of backgrounds need a full decoded-memory audit (width × height ×4),
not only compressed-byte checks. Ten studio groups together exceed300 MiB
decoded. Put game-owned keys in art/index.json `groups`, keep shared aliases out,
and retain thumbnails at boot. PlayScene must await ensureGameArt before game
construction, because constructors may bake their first canvas. Release group
references on exit, guard async startup with an epoch, and test immediate exit,
reentry, failure fallback and reload. Avoid a permanent decoded-image cache.

Match consumers to measured art landmarks without changing procedural fallbacks.
Sand towers use their actual top surface for stacking; asymmetric flag canvases
need the pole's x coordinate, not the bounding-box centre. Puppet booth's ledge
requires an offset, and its aperture may differ from the original procedural
window. A fixed backdrop design-space is safe if drawing scales it consistently.
Check the actual game with multiple anatomies, including grouped characters.

Record each built-in call's exact prompt and output_hint/source path immediately.
Do not print full image_url/base64 or depend on a truncated batch result to recover
provenance. One call per distinct prop/colour. Approved creature bases may be
resized into runtime props; preserve their approval record separately. Inspect
true alpha: a generated checkerboard is opaque artwork, not transparency. Request
a targeted imagegen edit to fix it; do not manually erase or paint alpha. Keep the
last good transparent variant until a replacement is reviewed. Runtime WebP uses
quality86/method6; retain approved canonical/source quality.

With overlapping batches, stage only that batch's index and generation entries,
plus import-map hashes matching the staged source code. Do not publish a future
hash while its module is still uncommitted: it can cache old pixels/code under a
new version. Archive only delivered request sections; later optional poses remain
a separate backlog. Push each complete minigame before moving to the next.

Every delegated prop prompt must carry the house style explicitly (2D, smooth
navy #24163f outlines, clean soft cel shading, no3D/no photorealism) and an
approved style reference. “Storybook” alone can produce a mismatched rendered
look. Review the first six outputs before generating the rest of a family.

Narrow each colour-family prompt to the current variant. “Green crystals” means
every crystal is green, and a teal mushroom set means every cap is teal; a
dominant colour plus two differently coloured pieces does not satisfy the key.
Inspect the final palette contact, not just the first family sample.

Generated replacement bodies can bypass procedural animation details: check
pearls, lids, emitters and night overlays. Restore shared animated details once,
use measured source-image crops for a lid, and redraw the authored silhouette
at the same fit/anchor for night effects instead of painting a second differently
shaped procedural object. Match jellyfish world position to bell centre rather
than the whole canvas centre; test the landmark through scale, tilt and pulse.


### Molly production lessons (2026-10-13)

- Molly character approval prompts are waived by the user. Review native masters and runtime contacts, refine problems, then proceed. Preserve approved identities across every expression: check hair colour, skin tone, wing pattern, outfit and proportions side by side. A matching pose label does not prove character consistency.
- Movement sheets must include actual alternating strides and contact/pass phases. Four nearly identical airborne poses create a bob, not a walk/run cycle. Stable body scale and ground anchors prevent jitter.
- Keep full-resolution archival source WebPs. Per-frame physical height (usually240px for Molly bodies) and optimizer `frameScales` retain display scale and landmarks while reducing decoded memory. Check full and optimized decoded RGBA budgets separately; download size alone is insufficient.
- Build QA contact sheets from the actual final runtime paths. A stale source/background can cause a false geometry report. Check the real game using the Molly IDs (`molly-garden-fairy-*`, `molly-glimmer`) which have playable sizes; original IDs remain NPC sizes.
- Match attachments to measured generated landmarks only when authored art is loaded; preserve procedural fallback geometry. Keep hats, nail polish, window curtains, mattress contact and emitters on the depicted features.
- Preserve shared key namespaces. Prank the Troll uses `ptroll-*`; `pt-*` belongs to Puppet Theatre. A requested rename can map a new key to already-reviewed art without regenerating pixels.
- Exact recolour edits can still drift in contour. For Rainbow Painter, drawing the same colour raster with a grayscale filter before reveal keeps identical silhouettes; authored grey variants remain available as fallback. Never manually paint replacement pixels.
- Concurrent provenance JSON writes require a lock around read/modify/write; image saves should use atomic rename before runtime inspection. Record exact prompts and native paths immediately.
- Stage only each finished batch's index/provenance rows and source files. HTML import-map hashes must match staged module content, including after merges. Run shell commit sequences with `set -e` so a missing file cannot silently publish a partial code batch. AppleDouble `._*` files inside `.git/objects/pack` are metadata, not Git objects; remove only those sidecars when they cause pack warnings.


Final Molly audit reminders:

- Sprite builder scale is `commonScale * item.scale`, where commonScale comes from the neutral source height. `item.scale` is a multiplier, not a direct source-pixel scale. If a new neutral sheet changes height, compensate other source multipliers before rebuilding. Runtime appearance depends on raster dimensions and `frame.bodyHeight` together; when reducing physical pixels for budget, reduce the per-frame bodyHeight and landmark coordinates proportionally to preserve display size. Preserve existing Glimmer files while expanding her missing poses.
- Check the complete decoded art group, including reuse keys. Load Ballet teacher/card/butterfly keys with Opposite Ballet, puppies and puddles with Muddy Mayhem, and the disco ball with Sneaky Dance. Skip unused secondary backgrounds: Opposite’s old fallback backdrop consumed another 8 MiB even when the authored main backdrop was present.
- Use immutable source archives already in the repo. Duplicate root-level source copies add no provenance; reference the original nested archive. Keep edit inputs distinct from final edit outputs. Preserve exact generation prompts; do not rewrite old prompt punctuation while normalizing metadata.
- Refresh recorded runtime byte counts after crop/resize/regeneration, and label later revision records so old native sources remain clear as generation history. Source hashes, physical decoded budgets and final runtime paths make a batch independently reviewable.
- Named new poses can be one authored keyframe combined with engine motion; looping locomotion/wing/tiptoe packets need distinct phases. Inspect actual gameplay before claiming an animation or attachment is seamless.


### Grown-up reaction intake

Use existing game props as the expression-edit targets to keep full-canvas scale and seated/feet anchors. Compare final native and runtime images against the exact reference, not only another new pose. Preserve the full native RGBA as lossless WebP; a lossless copy of an already resized runtime is not a source archive. Keep the final edit output path separate from its original input and retain exact edit prompts. Normalize only explicitly owned record files: a filename glob can also match another agent’s integration record.

Reaction props can contain hands, gloves and dropped tools that procedural fallbacks also draw. Suppress an extra glove or hose only when the exact authored reaction is loaded; keep fallback extras otherwise. Audit complete game art groups after adding reaction families. Move unused legacy variants to a separate deferred group rather than dropping them from every group (which would load them at boot). Resolution-only background intake from the unchanged source can lower memory without changing geometry; keep requested prop canvases exact.


### Dance and Sister action batches (October27)

- Treat new full-body actions as separate scratch packets and append only their frames. Shipping manifests can contain newer body maps than intake specs; a wholesale old-spec rebuild loses audited points.
- Count unique reachable frame and portrait rasters for full decoded memory before intake. Existing sets can already be24.9MiB. New-only physical scaling must scale bodyHeight equally; modest portrait runtime reduction is preferable to unreadably tiny new bodies. Preserve exact original portrait RGBA and record any resolution step.
- Inverted cartwheels need hands/support at the actual floor, headAngle=pi and explicit shoe body-map overrides when automatic scanning assumes feet below the head. Do not add a procedural ready-hop to grounded cartwheel art. Tuck is anchored at the bottom of the ball, like the fairy sets: Fairy Flutter spins it about the body centre (`y - height / 2`, not the anchor) and Bed Bounce lands it on the duvet, so a centre-of-mass anchor sank the ball half its height and swung it round off-centre (re-anchored after the in-game check, 2026-10-27).
- Nail hand recolours drift by fractions of a pixel: measure each tone's nail centres, dimensions and tilt, share that geometry between painting and hit tests, and clip polish to measured nail interiors. Keep the full1024canvas untrimmed and align the cuff to the actual wrist, not the canvas centre.
- A regular source grid is only an initial crop. Audit connected-alpha extents and antialias margins after manual annotations, especially flying hair, skirts and curled bodies.
- Quiet local HTTP servers avoid request-log congestion during many simultaneous browser checks. Wait for the actual review-ready marker or PlayScene before screenshots; a fixed5s timeout can capture idle fallbacks or the loading screen on the mounted volume.

### October28: registered construction pieces and sewing atlases

Keep full requested canvases and lossless native sources even when runtime memory needs compact siblings. Both construction pieces and atlases render into a logical design space, so proportional resizing preserves all landmarks when consumers derive source cell sizes. Count every simultaneously selectable shape/body plus reused wardrobe art: a per-shape budget alone misses mixed eight-player games. The shipping mixed groups are23.465MiB for Gingerbread and20.218MiB for Plushie.

Background anchors belong to the authored1920x1080 design space, never the decoded source dimensions. Reducing a backdrop to1024x576 must not shrink the station or move its table edge. Check the actual maximum-player layout, not only an isolated composite. Align needle points, machine nozzles and source support lines to the actual generated pixels; mirroring about the nozzle can preserve emission placement while placing the machine tank beside the toy. Clear tint/mask/pattern canvases on game exit; a32-entry tint bound avoids an unbounded wardrobe cache.

For blank plush bodies, fabric and coloured trim must come from the same registered source pixels, with one transform for both rows. Generic connected-component centring breaks head/neck/seat anchors. Review dyed bodies so accidental coloured outline masks cannot turn whole patches of fabric opaque white. Scarf wraps must sit below the sewn mouth. Natural stuffing-to-hug-to-shelf review catches tool and support defects that static atlases miss.

Image briefs can contain impossible geometry: Gingerbread's tall roof originally reached21px above its880px canvas. The corrected roof moves13house units downward in both art registration and consumer polygon/seam/icing paths. Do not quietly clip a roof or move only its picture. Measure transparent wall openings and preserve their exact consumer outlines. Native inputs, geometric guides and reproducible intake scripts remain archived.

During concurrent main updates, review available game-branch code in an isolated preview rather than merging unpublished work. Include measured consumer patches in the art batch, then apply and test them once the game lands. Keep a quiet threaded local server with a large request backlog; request-log pipe congestion can create transient connection resets during big asset boots.

### Mole Madness: make the peek depend on visible pixels

A320px transparent frame can contain only206px of character. Moving it underground by a procedural character's1.35×width hid the entire low-peek pose. Compute authored emergence travel from the visible content height and draw scale, keeping the original travel for fallback art. The approved mole uses a0.6s rise with a short0.52-height hold: verify the eyes and nose actually clear the lip at both back and front rows. Move bonk stars to the authored head height too. Check an actual cropped renderer animation, not just easing curves. Align each source's bottom torso centre before intake so a long snout changing sides does not drag the body across the hole.

### October28 late delivery: measured attachments and articulated pieces

A worn scarf needs a front band rather than a ring: preserve the atlas cell attachment (128,96), render the whole band unbent, and inspect all six dyed bodies so mouths remain clear. Draw each plush's own fabric paws over the heart pillow.

Adding old props to a new deferred art group removes them from common boot loading. Preserve previously common keys when other games rely on them; still count their decoded memory in the new game's complete budget.

Small skeleton boxes can conflict with complete rounded joint caps. Preserve the full part, record a measured art-only draw offset inside the existing logical rotation, and keep gameplay pivots stable. Validate connected joints in multiple poses. Source dimensions and design coordinates are independent: measure ladder top steps, rake grips and platform supports from actual pixels. Crown/hat bounds must include camera focus and punch at maximum hop, not only the static rig.

Review actual merged main or a coherent immutable preview. Mixing partial feature files from different revisions can manufacture missing-method errors. Archive exact sources/prompts and retain full requested canvases when runtime images need smaller derivatives.
