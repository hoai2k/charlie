# Audio credits

All files in this folder are **original sounds generated with the ElevenLabs
sound-generation API** (`POST /v1/sound-generation`) on 2026-10-02 for this
project, then trimmed, normalized and re-encoded with ffmpeg. No third-party
recordings, samples or melodies were used. Each file's prompt is listed in
`party/audio-requests.md` §9.2.

| Files | Source | License |
| --- | --- | --- |
| `sfx/*`, `npc/*`, `jingle/*`, `voice/*` | ElevenLabs sound generation (text prompts written for Charlie Party) | Generated content, used under the terms of the ElevenLabs account that produced it. Check that the account's plan allows the use you want (a public GitHub Pages site) before publishing widely. |

| `music/bubblegum-radar.mp3` | *Bubblegum Radar*, copied from `americangirldollrace/assets/music/` (cover art stripped) | Same source and terms as the race's music. Plays on the title screen and in games that use the `party` song. |

Not yet delivered: Glimmer's host lines (`host/*`) and the other music loops
(`music/*`); see `audio-requests.md` §9.3.
