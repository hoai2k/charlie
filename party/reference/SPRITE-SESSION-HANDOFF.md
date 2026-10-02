# Sprite session handoff — 2026-10-02

Wrap-up began at 44% account allowance remaining; the final review reached 42%.
This is the pause checkpoint requested near 40%. No image calls remain queued
for automatic execution.
The full image brief is not complete; procedural fallbacks keep games playable.

## Start here

- `../tools/sprites/AGENT-PLAYBOOK.md`: practical lessons, prompt/crop/anchor
  conventions, observed failures, validation commands and safe Git workflow.
- `IMAGE-WORK-QUEUE.md`: current priorities and latest hip-bump/knockback/dash
  additions from main.
- `ASSET-COVERAGE.md`: published set counts; aliases are explicitly distinguished
  from authored frames.
- `../assets/art/ART-STATUS.md`: 230 indexed art keys / 220 files, remaining
  generation and remaining game hookups.
- `../image-requests.md`: authoritative requirements, including new requests
  from other agents. Re-sync main and compare its changes before new work.

## Production status at wrap-up

Felicity, Fellowfox and Bronze have the original actions, optional actions,
Round 3 cycle upgrades and fourteen added game actions. All three KPop members,
Cotton Candy, Fox and Unicorn have broad player sets. Fox's incorrectly sorted
cycles were corrected and published. Approved NPC sets and cutouts are in use;
Storm Cloud lightning remains a separate effect.

Amber now has 43 authored pose keys and 60 frame entries. Hotdog has 45 pose
keys, 60 frame entries and five portraits. Hotdog's neutral/blink matching,
source order and sampled mouth/eye landmarks were corrected in review.
Amber's celebration eye positions were corrected after a Fashion Show check.
Snowstar and Birthday Cake retain their published core sets (20 pose keys,
32 frame entries and five portraits each); extended actions remain queued.
Marina and Scale now have 18 keys and 29 authored frames each, including new
cycles. Each still needs 25 extended action keys. No placeholder action aliases
were retained to inflate coverage. Metadata outside the sampled poses may
benefit from further in-game attachment polish; broad multi-direction animation
and every Round 2/3 action have not been fully authored.


The user has approved all current canonicals. Do not ask again or redesign them.
Glimmer is lighter with no blush; Garden Fairies have varied skin tones and the
purple fairy is light olive. Felicity travels with Fellowfox but their sprites
are separate; KPop has three separate coordinated members. Marina/Scale have
tails, Cake has no limbs, and Troll is NPC-only.

## Next work after resuming

1. Review the published pause checkpoint and choose one remaining character or
   narrow prop family. No canonical approvals are pending.
2. Complete the remaining initial/optional player actions for Snowstar, Cake
   and the mermaids, reusing saved sheets. Check actual manifests first.
3. Author the remaining Round 2/3 action vocabulary across the roster, including
   hip-bump and knockback and the two-frame dash upgrade. Engine fallback keys
   do not mean the artwork exists. Do not pad a manifest with placeholder aliases
   to make a set appear complete.
4. Finish the art list in ART-STATUS: art-studio icons/frame, flame/sprinkles,
   bathtub front overlay, older distinct ingredients and arena props as needed.
   Integrate suitable art without breaking procedural geometry/customization.
5. Re-run asset validation, timing/landmark tests, art-loading tests and focused
   in-game checks, then commit and push each completed character to main.

Use lighter agents for isolated character intake/generation and narrow code
changes, with a separate visual review. Save exact prompts immediately. Some
Hotdog prompts lost in an earlier compaction are explicitly reconstructed;
retain that label rather than claiming exact provenance.

## Workspace and verification notes

Other agents continue working in this repository. Preserve unrelated changes,
especially outside `party/`; stage explicit paths. Main uses SSH for successful
pushes in this environment. Clean only macOS `.git/._*` sidecars if Git reports
their misleading pack-index errors; never remove real pack files.

The local no-cache preview is on port 8141; older 8137/8140 previews may retain
mixed module revisions. Final checkpoint validation passed for all 26 indexed sets (24.78 MiB total).
Runtime timing/landmark tests and art-loading tests passed. Expected warnings
remain for NPC-only action omissions and Felicity/Cotton Candy exceeding the
1.5 MiB soft encoded target; all sets remain below 25 MiB decoded.
After merging code, use a fresh/no-cache preview before diagnosing apparent
missing exports. The image loader now bounds requests, shares aliases and
retries once. Raw PNG copies and QA contact sheets are not shipped assets.
