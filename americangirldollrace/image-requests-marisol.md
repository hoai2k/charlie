# Marisol refresh — queued for the image agent

Status: **SOURCE ART GENERATED — runtime integration and game review in progress, October 22, 2026.**
The owner approved the new Marisol with the lower hairline and requested
clean hair edges. This round replaces her old identity across the sprite set.
MAR1–MAR7 sources and exact prompts are now retained in the repository.
Normal/menu art has been packed and reviewed on cream/navy; companion toy
and special-action exports are being calibrated. Runtime registration and
browser acceptance remain open; do not generate another identity from old art.
All paths below are relative to `americangirldollrace/`.

## Identity reference and invariants

Use **`tools/dolls/sources/marisol/canonical.webp`** as the sole approved
identity and clothing reference. Do not use the candidate-v1/v2 images or the
old game sprites for her face. The old art may supply pose/layout guidance only.
`tools/dolls/sources/marisol/canonical-transparency-review.webp` shows the
cleaned reference composited on light and dark backgrounds; do not copy those
backgrounds into generated art.

Preserve the **lower hairline / smaller forehead**, rounded vinyl doll face,
brown inset eyes, warm golden-brown skin, soft friendly smile, long dark brown
wavy rooted hair and swept-back crown. She is a sturdy childlike 18-inch vinyl
play doll, with molded hands and miniature sewn fabrics. Keep the navy jacket
with pink sleeves/zipper and pink-and-white ribbing, pink **06** chest applique,
grey pleated skirt with pink detail, white socks and bright pink shoes.
No human-child rendering, adult proportions, bangs, changed skin tone or higher
hairline. Personality: friendly, upbeat and sporty.

## Generate in this order

Read `tools/dolls/README.md` and `tools/dolls/toys/README.md` before starting.
Generate source art with built-in ImageGen. First establish `idle.webp`, then
use it alongside the canonical to hold anatomical scale across all other poses.
Save normal pose sources in `tools/dolls/sources/marisol/`. Record exact prompts
and reference paths in a new `tools/dolls/marisol-generation.json`; preserve the
existing candidate-generation record and approved canonical.

| Request | Source | Poses, left to right |
| --- | --- | --- |
| MAR1 | `idle.webp` | Three idles: relaxed neutral; small weight shift; warm confident hand-on-hip pose. Same standing height and baseline. |
| MAR2 | `run.webp` | Three distinct running phases: extended stride, passing stride, opposite extended stride. Arms counter-swing; compact flowing hair. |
| MAR3 | `jump.webp` | Takeoff crouch, airborne tuck, landing crouch. Crouches are shorter, never enlarged to standing height. |
| MAR4 | `actions.webp` | Seated rider with empty hands forward and no mount; braced two-palm push toward right; playful backward fall toward left, feet forward right. Use separate sources if a pose crowds its cell. This source is for the normal race sheet, distinct from MAR7. |
| MAR5 | `menu.webp` | Friendly wave, joyful cheer, relaxed personality idle. Keep hands no higher than needed, with room above them. Derive the waist-up portrait from reviewed source art. |
| MAR6 | Toy movement/action companion sources under `tools/dolls/toys/` | All 12 skate/pogo poses from `image-requests.md` §8.0: skate push-off / glide / opposite push-off; skate stand / throw / fall; pogo compressed / extended / airborne; pogo balance / throw / fall. White quad boots, pink wheels; shared red/silver/black pogo design. Both falls match MAR4's body angle and limb pose exactly, with toy hardware added. Use the new identity, never the old Marisol toy reference. |
| MAR7 | Dedicated special-action sources under `tools/dolls/sources/marisol/`, named `special-*.webp` | All 9 poses from `image-requests.md` §10.1: three wand-casting phases; three surfing phases; seated push/throw; sticky-puddle stumble; moon-boots float. Match the shared wand/board designs there. Seated throw must match MAR4's seat and anatomical scale. |

For three-pose strips, use a **3:1 canvas with three equal square cells**, one
whole doll per cell, generous transparent margins and empty gaps between cells.
Face right in a slight three-quarter view. Keep head, torso and limb sizes
consistent across all strips; shorter or seated poses must not be independently
scaled up. Keep hair compact enough to fit without clipping or changing her
body pivot. Do not ask ImageGen to pack final runtime atlases.

Shared prompt constraints for every request:

> Preserve the approved Marisol canonical exactly, especially her LOWER
> hairline, face and outfit. Photographic vinyl toy materials, rooted dark wavy
> hair, miniature sewn fabrics. Consistent anatomy and head size. Entire figure,
> all fingertips, hair and footwear inside each cell. True transparent empty
> background. No floor, cast shadow, glow, fog, rectangular matte patches,
> pixelated hair fringe, cell borders, labels or extra props. Props only when
> explicitly required by that pose. Preserve the small 06 clothing detail.

## Export and integration contract

Follow the versioned Rumi/Claudia migration pattern from `tools/dolls/README.md`:
retain roster key **`marisol`**, use **`assetKey: "marisol-v2"`**, preserve original
art/masks/statistics and provide a legacy-art fallback. Avoid a mixed old/new
identity between race, menu, toys and special actions.

| Deliverable | Final path / contract |
| --- | --- |
| Race sheet | `assets/doll_marisol-v2_sprites.webp`: 1254×1672, 3×4 of 418. Rows: idle, run, jump, rider/push/fall. |
| Menu | `assets/portraits/marisol-v2.webp`: 320×400; `_wave.webp`, `_cheer.webp`, `_ride.webp`: 418×418. Ride matches the race rider cell. |
| Normal outfit masks | `assets/masks/marisol-v2_{sheet,portrait,wave,cheer,ride}_mask.webp`, matching each image's dimensions. |
| Toy sheet and mask | `assets/doll_marisol-v2_toys.webp` and `assets/masks/marisol-v2_toys_mask.webp`: 1254×1672, §8.0 layout. |
| Special-action sheet and mask | `assets/doll_marisol-v2_actions.webp` and `assets/masks/marisol-v2_actions_mask.webp`: 1254×1254, §10.1 layout. |

Export lossless WebP with alpha using deterministic builders. Grounded frames
share exclusive foot baseline **409**; standing height **390px**. Measure hip,
seat and hand anchors; preserve mount seating and broom grips in both directions.
Masks select the approved outfit areas while protecting face, skin, dark hair,
white socks and toy/prop hardware; retain Marisol's seven alternate colours.
Use a reviewed mask strategy appropriate to her pink/navy/grey garments.
Register versioned sheets/anchors only after review; do not register missing art.

## Acceptance and handoff

- Review every pose at native size and actual game size. Compare face/hairline
  against the canonical, including seated, jumping, toy and special-action art.
- Composite hair edges on light cream and dark navy. Reject rectangular patches,
  halos, noisy/pixelated strands and missing opaque hair; inspect real alpha,
  not just the image tool's preview. No clipping or fit-to-cell rescaling.
- Keep source art, exact prompts, manifest/calibration, masks and review reports.
  Run affected deterministic build/check and doll/toy/migration tests listed in
  their READMEs; add a Marisol migration check using the existing pattern.
- Browser-review portrait/wave/cheer, all race poses, alternate outfits, toys,
  special actions, horseback/gryphon seating and broom grip in both directions.
  Verify the legacy fallback restores all matching old art and anchors together.
- Update cache versions if runtime files change. Mark this request delivered
  only after generation, validation and integration; commit/push per repo policy.

If this agent is handling generation only, leave reviewed sources, prompts and
a clear completion checklist for the integration agent. Do not mark runtime
integration or browser validation complete until someone has performed them.

## Delivery

MAR1–MAR7 delivered and integrated as `marisol-v2`: normal/menu, twelve toy
poses and nine special actions share the approved identity. Standing height,
409 baseline, anatomical scale, masks, alpha, hair edges, source margins,
measured hands and mount seating passed deterministic checks. Native browser
review covered normal/outfit art, menu/wave/cheer, toys, actions, horseback,
gryphon and broom carry/flight with mirrored alignment. The legacy switch was
checked in browser and migration tests; all ten original files and original
outfit statistics remain byte-identical. Builders, prompts, sources,
calibration and review evidence are committed with the assets.
