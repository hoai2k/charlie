# Audio credits

All files in this folder are **original sounds generated with the ElevenLabs
sound-generation API** (`POST /v1/sound-generation`) on 2026-10-02 for this
project, then trimmed, normalized and re-encoded with ffmpeg (round 2 files
were also cut, repitched, layered or looped with numpy/ffmpeg as described in
§11.3). The exceptions are `jingle/happy-birthday.mp3`, rendered in code, and
the music file below. No third-party recordings or samples were used. Each
file's prompt is listed in `party/audio-requests.md` §9.2 (round 1) and §11.2
(round 2).

| Files | Source | License |
| --- | --- | --- |
| `sfx/*`, `npc/*`, `jingle/*` (except `happy-birthday`), `voice/*` | ElevenLabs sound generation (text prompts written for Charlie Party) | Generated content, used under the terms of the ElevenLabs account that produced it. Check that the account's plan allows the use you want (a public GitHub Pages site) before publishing widely. |
| `jingle/happy-birthday.mp3` | Rendered in Python/numpy for this project (additive music-box/celesta synthesis, no samples) playing the traditional "Happy Birthday to You" melody | Melody is in the public domain; the recording is original to this project. |
| `music/bubblegum-radar.mp3` | *Bubblegum Radar*, copied from `americangirldollrace/assets/music/` (cover art stripped) | Same source and terms as the race's music. Plays on the title screen and in games that use the `party` song. |

Not yet delivered: Glimmer's host lines (`host/*`) and the other music loops
(`music/*`); see `audio-requests.md` §9.3.
