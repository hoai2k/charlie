# Race sound effects

Sound effects added after the original set are generated with ElevenLabs sound
generation from the text prompts in `gen_sfx.py` (key → prompt, length,
number of takes), then trimmed and levelled by `process_sfx.py`:

```
export SFX_WORKDIR=/some/scratch/dir      # outside the repo
# put the ElevenLabs API key in $SFX_WORKDIR/.elevenlabs_key (never commit it)
python3 gen_sfx.py [key ...]              # raw takes -> $SFX_WORKDIR/raw/
python3 process_sfx.py [key ...]          # -> ../../assets/audio/sfx/<key>_NN.mp3
```

Processing trims silence, adds 5 ms / 40 ms fades and levels each take to
about -16 LUFS (peak-levelled to -3 dBFS when a clip is too short for a
loudness reading), limited at -1 dBFS, 44.1 kHz stereo 128k MP3. Add new keys
and their take numbers to `assets/audio/manifest.json` and the identical
`manifest.js`. Which sound plays where is set in `game.js` and `tracks.js`
(`sounds` per track).

These are original sounds generated with ElevenLabs, used under the terms of
the account that produced them (the same caveat as `party/assets/audio/CREDITS.md`:
check the plan allows publishing on a public site).
