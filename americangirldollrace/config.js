/*
 * American Girl Doll Race — user-facing game configuration.
 *
 * Volume values range from 0 (silent) to 1 (full volume). The master volume
 * multiplies each individual bus volume. Browser-saved GameAudio overrides take
 * precedence until GameAudio.resetVolumes() is called.
 */
window.GAME_CONFIG = {
  powerupArtVersion: "20261022-emp2",
  dollArtVersion: "20261022-run-redo",
  // Set a doll to true to restore her original art, outfits and alignment.
  legacyDollArt: { rumi: false, claudia: false },
  audio: {
    masterVolume: 1.0,
    sfxVolume: 0.15,
    voiceVolume: 1.0,
    musicVolume: 0.8,

    // Optional multipliers for individual files, applied after the bus and
    // logical-sound trim. Every file defaults to 1.0, so only exceptions need
    // to be listed. SFX/voice keys are relative to assets/audio; music keys use
    // "music/<filename>".
    // Examples: "sfx/troll_idle_grunt_03.mp3": 0.8,
    //           "music/Plastic Shoes.mp3": 0.9
    soundFileVolumes: {}
  }
};
