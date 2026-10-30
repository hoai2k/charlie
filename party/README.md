# Charlie Party

A Mario-Party-style collection of 24 minigames starring the characters from
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

Whoever presses start on the title (or the first controller, if the title
was clicked) is already joined as P1 on character select; everyone else
presses A to join.

Menus also work with a mouse or touch: click a card, tile or button hint.
The round buttons in the bottom-left corner of the menus (and the pause
menu) toggle sound and fullscreen; **M** and **F** do the same from the
keyboard. Sound mutes itself while the tab is hidden or the window isn't
focused, and the mute setting is remembered.

On phones and tablets (`src/engine/shell.js`, the same approach as Widow's
Bay in `hoai2k/mini`):
- **Android, iPad:** the first tap with the device in landscape goes
  fullscreen, unless the player turned fullscreen off themselves.
- **iPhone Safari:** it has no fullscreen, so the page scrolls a little
  instead. Swiping up hides Safari's bars, and a hint says so on the menus.
  The page doesn't scroll during play.
- **Add to Home Screen:** `manifest.webmanifest` and `icons/` install the game
  as a fullscreen landscape app with the cake icon.

## Testing URLs

- `?scene=sprites` — sprite viewer (all characters, every pose)
- `workbench/` (`/charlie/party/workbench/`) — sprite workbench (its title menu switches to the
  Audio Workbench, `?scene=audio`: every song, take, sound and voice): landmarks and
  outfit fit per frame, edits downloaded as JSON and applied with
  `node party/tools/apply-workbench-edits.mjs` (see `workbench/README.md`)
- `workbench/rhythm.html` — Rhythm Editor (also in that title menu and the Audio
  Workbench's Rhythm tab): play the rhythm-game charts at each difficulty, record
  hits with a controller or keys, edit them on a timeline, download them as JSON
  and apply with `node party/tools/apply-rhythm-edits.mjs` (see `workbench/README.md`)
- `?game=<id>&players=4&humans=1` — jump into a minigame (`&auto=1` for all
  CPUs, `&skipintro=1`, `&speed=3`, `&level=0..2`)
- `?nosprites=1` — ignore generated sprites
- `node party/tools/shot.mjs "<query>" out.png` — headless screenshots
