# Optional character actions

These are suggested game features, not established character lore. Felicity supplies the
first authored set for the six new actions below. The engine exposes the names for every
character with expressive fallback behavior until their authored art is available. They
are optional: no minigame rules, controls, collisions or balance change when a set is installed.

| Pose | Suggested use | Suggested duration | Game responsibility |
| --- | --- | --- | --- |
| `look-around` | Waiting-room curiosity, looking for companions, preview a counting round | Loop until interaction | Call `setPose`; do not change player facing or aiming |
| `high-five` | Cooperative success, greeting a teammate, Felicity/Fellowfox paw tap | 0.45 s | Place characters facing each other and align the `hand` landmarks; play both together |
| `crouch` | Duck beneath an obstacle, playful hide-and-seek, anticipation | Loop while held | Any smaller hitbox must be explicit game logic; art alone never makes a player invulnerable |
| `dash` | Burst of speed in Crown Keeper or Bumper Bounce | 0.3 s | Movement, cooldown and collision belong to the game; the pose supplies only visual anticipation/stretch |
| `catch` | Receiving the present or a shared pickup | 0.35 s | Transfer ownership exactly once, then animate the receiver; use the `hand` point for the item |
| `wave-goodbye` | End-of-session exit or NPC farewell | 0.6 s | Keep companions together; scene transition follows the animation |

```js
// Optional animation calls. Existing Actor API stays compatible.
actor.playOnce('catch', 0.35, 'carry');
actor.playOnce('high-five', 0.45, 'idle');
actor.setPose('look-around');
actor.setPose('crouch');
actor.playOnce('dash', 0.3, 'run');
actor.playOnce('wave-goodbye', 0.6, 'walk');
```

Each optional action has procedural motion and a fallback chain in `engine/sprites.js`.
`Actor.anchor('hand')` reads the current sprite frame's landmark when supplied; as before,
world anchors deliberately exclude procedural rotation/squash. Use `attach()` when a prop
must track those transforms exactly. One-shot duration fitting plays the entire authored
clip even if the game requests a shorter time. Never apply travel inside the sprite engine.

For anatomy without hands, use a friendly paw/nose/fin tap, not invented limbs. Bronze
uses its pipe or eye panel; the cake wiggles its top edge. Preserve the mermaids' tails.
Do not use high-five or catch art that adds limbs to characters whose canonicals have none.

Next animation polish worth doing after all characters have broad coverage: add a second
blink/idle frame, alternating wave hands, an anticipation/impact/recovery sequence for
throw and catch, and a second celebratory leap. Current authored key poses combine with
smooth procedural breathing, hops, lean and squash; they are not being represented as
fully drawn frame-by-frame cycles. Walk has a real four-frame cycle, and explicitly declared
aliases reuse compatible art (`run` from walk, `cheer` from celebrate, `sad` from pout,
`dance-star` from the runway star pose). Keep distinct new actions authored separately.

Review optional actions in `?scene=sprites&chars=felicity&pose=high-five&debug=1&zoom=2`.
P pauses; period steps time; A compares canonical fallback. Check both facings and inspect
the transparent borders against dark and light scenes before enabling a new game mechanic.

## KPop performance references

All three KPop members now provide the six optional actions above plus an authored `sing`
key pose. `sing` is already exposed by the engine, loops with procedural dance motion,
and can be selected with `actor.setPose('sing')`. Attach a separate microphone at `hand`
when desired; the artwork keeps props separate. The right member sings with an open arm
and hand over her heart, while the other two mime holding a microphone near their mouths.

The three independent sets share bodyHeight 320, the same 44 pose names, the same frame
counts per pose, and six expressions. Dance uses four frames at 4 fps for a one-second
shared beat; start all three at the same pose time for synchronized choreography. Their
idle blink schedules deliberately differ, so waiting together does not look mechanical.
Celebration has four frames, pout two, ride two, and walk/run four each. The other actions
remain individual authored key poses with procedural movement, rather than full drawn cycles.

For an optional call-and-response stage moment, alternate `sing` on the lead member with
`clap` on the other two, then switch all three to `dance`. The game controls music timing
and rewards; these poses do not introduce scoring or movement rules.
