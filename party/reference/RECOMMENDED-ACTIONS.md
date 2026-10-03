# Optional character actions

All15 roster member sets now have authored art for the six actions below, supported by `src/engine/sprites.js`. They are part of the complete74-key coverage checklist; see [ASSET-COVERAGE.md](ASSET-COVERAGE.md). Compatible aliases and procedural motion remain available for graceful runtime fallback.

These actions enable optional game features. Installing artwork does not change controls, movement, collisions or scoring.

| Pose | Suggested use | Timing | Game responsibility |
| --- | --- | --- | --- |
| `look-around` | Waiting-room curiosity or finding a companion | Loop | Choose facing without changing aiming |
| `high-five` | Cooperative success or a teammate greeting | About 0.45 s | Position both characters and coordinate the gesture |
| `crouch` | Hide-and-seek or ducking an obstacle | While held | Explicitly implement any hitbox change |
| `dash` | Crown Keeper or Bumper Bounce burst | About 0.3 s | Apply travel, cooldown and collision |
| `catch` | Receiving a present or shared pickup | About 0.35 s | Transfer ownership once and position the separate item |
| `wave-goodbye` | Session exit or NPC farewell | About 0.6 s | Keep companions together and schedule the transition |

```js
actor.playOnce('catch', 0.35, 'carry');
actor.playOnce('high-five', 0.45, 'idle');
actor.setPose('look-around');
actor.setPose('crouch');
actor.playOnce('dash', 0.3, 'run');
actor.playOnce('wave-goodbye', 0.6, 'walk');
```

## Attachments and anatomy

Use `Actor.anchor('hand')` for the current frame's world attachment location. It deliberately excludes procedural rotation/squash; use `attach()` when a held item must follow the complete draw transform. One-shot duration fitting plays the full authored clip within the requested time. The game remains responsible for physical travel.

Keep objects separate from the character images. Ordinary pet item grips use the mouth, while overhead carrying uses the back; individual action gestures may provide a reviewed paw grip. Bronze uses its pipe or a floating panel, Cake supports objects on top, and mermaids keep their tails. A friendly paw, fin or pipe tap can replace a human high-five. Do not add limbs to perform an action.

Read the full action description before adding art: `flip` is a memory-card reach; `tumble` is an acrobatic fall. `photo` is a peace-sign camera pose for humanoids, with an anatomy-appropriate expression for animals, Bronze and Cake. A matching key alone does not prove the drawing matches the action.

## KPop performance options

Each KPop member has an independent set. Their latest builds use `bodyHeight: 275`, the same 74 pose names and 96 frame entries, with six portraits each; final attachment, mask and game review is pending. Validate these invariants again after the final intake. Different idle blink timing keeps the trio lively while waiting.

For synchronized choreography, start their four-frame `dance` loops at the same time and keep 4 fps, giving a one-second cycle at 120 bpm. An optional call-and-response sequence can alternate `sing` on the lead with `clap` on the other two before returning everyone to `dance`. Attach microphones separately; game code controls music timing and rewards.

## Further polish worth considering

The reviewed roster already has authored blink, celebration, pout, dance and ride cycles, plus broad action coverage. Further work should target visible transitions rather than duplicating those deliveries:

- Add anticipation/contact/recovery drawings to frequently repeated single-key throws, catches and casts where playtesting shows an abrupt change.
- Add a second idle fidget with a long, irregular interval so groups feel less synchronized.
- Stage paired high-fives with deliberate spacing and timing; existing generic mouth/item landmarks are not automatically the correct paw-to-paw contact point.
- Add explicit transitions into and out of sitting or broom riding if scene changes need them.

These are optional future refinements, not missing gameplay rules. Keep source masters and exact prompts, preserve neutral head size, and recheck decoded memory before adding frames.

Review with `?scene=sprites&chars=felicity&pose=high-five&debug=1&zoom=2`; P pauses and period steps time. Check both facings, both image qualities, actual attachment positions, and alternate-color masks where applicable. Rebuild optimized copies after any changed frame or manifest. Enable new mechanics only after their game behavior is implemented and tested.
