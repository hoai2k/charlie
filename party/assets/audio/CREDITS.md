# Audio credits

All files in this folder are **original sounds generated with the ElevenLabs
sound-generation API** (`POST /v1/sound-generation`) on 2026-10-02 for this
project, then trimmed, normalized and re-encoded with ffmpeg (round 2 files
were also cut, repitched, layered or looped with numpy/ffmpeg as described in
§11.3). The exceptions are `jingle/happy-birthday.mp3`, rendered in code, and
the music files below (Bubblegum Radar, and the ElevenLabs **music** loops of
2026-10-03). No third-party recordings or samples were used. Each
file's prompt is listed in `party/audio-requests.md` §9.2 (round 1) and §11.2
(round 2).

| Files | Source | License |
| --- | --- | --- |
| `sfx/*`, `npc/*`, `jingle/*` (except `happy-birthday`), `voice/*` | ElevenLabs sound generation (text prompts written for Charlie Party) | Generated content, used under the terms of the ElevenLabs account that produced it. Check that the account's plan allows the use you want (a public GitHub Pages site) before publishing widely. |
| `jingle/happy-birthday.mp3` | Rendered in Python/numpy for this project (additive music-box/celesta synthesis, no samples) playing the traditional "Happy Birthday to You" melody | Melody is in the public domain; the recording is original to this project. |
| `music/bubblegum-radar.mp3` | *Bubblegum Radar*, copied from `americangirldollrace/assets/music/` (cover art stripped) | Same source and terms as the race's music. Plays on the title screen and in games that use the `party` song. |
| `music/takes/*.mp3` (`dance-1..3`, `menu-1..3`, `chill-1`; `menu-3` is a second cut of the `menu-1` generation) | **ElevenLabs Eleven Music** (`POST /v1/music`, model `music_v2_5`, instrumental), generated 2026-10-03 from text prompts written for Charlie Party (`audio-requests.md` §12.2), then cut into seamless loops and loudness-matched with numpy/ffmpeg (§12.3). No reference tracks or samples. | Generated content, used under the terms of the ElevenLabs account that produced it (same caveat as above: check the plan allows publishing on a public site). |
| `music/rhythm/index.json` | Chart data measured from `music/takes/dance-1.mp3` (§12.4) | Same as that file. |

Not yet delivered: the `chase`, `bouncy`, `tense` and `victory` loops, an original
`title` theme and the `rhythm-1`…`rhythm-5` rhythm-game songs (blocked on
ElevenLabs quota, see `audio-requests.md` §12.5). Glimmer's host lines are no
longer wanted.
