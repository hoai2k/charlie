# Charlie Party

A Mario-Party-style collection of 20 minigames starring the characters from
Charlie's drawings. 1–8 players (best with 2–4), Xbox controllers first,
keyboard works too. Plays at `/charlie/party/`.

- Design and status: [`PLAN.md`](PLAN.md)
- Writing a minigame: [`src/games/README.md`](src/games/README.md)
- Art to generate (sprites, portraits, NPCs, backgrounds): [`image-requests.md`](image-requests.md)
- Sounds and music to record: [`audio-requests.md`](audio-requests.md)
- Character references: [`reference/`](reference/)

## Controls

| | Xbox controller | Keyboard P1 | Keyboard P2 |
| --- | --- | --- | --- |
| Move | Left stick / D-pad | WASD | Arrows |
| A (main action) | A | Space | Enter |
| B (back) | B | K or Q | Backspace |
| X / Y | X / Y | L or E / I or R | / and ' |
| LB / RB | LB / RB | Z / C | , / . |
| Pause | Menu (☰) | Esc | P |

Menus also work with a mouse or touch: click a card, tile or button hint.
The round buttons in the bottom-left corner of the menus (and the pause
menu) toggle sound and fullscreen; **M** and **F** do the same from the
keyboard. Sound mutes itself while the tab is hidden or the window isn't
focused, and the mute setting is remembered.

## Testing URLs

- `?scene=sprites` — sprite viewer (all characters, every pose)
- `?game=<id>&players=4&humans=1` — jump into a minigame (`&auto=1` for all
  CPUs, `&skipintro=1`, `&speed=3`, `&level=0..2`)
- `?nosprites=1` — ignore generated sprites
- `node party/tools/shot.mjs "<query>" out.png` — headless screenshots
