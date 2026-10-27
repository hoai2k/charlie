// fairy-flutter: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'fairy-flutter',
  title: 'Fairy Flutter',
  category: 'molly',
  type: 'Team up!',
  goal: 'Fly around and fill the Moon\'s sparkle jar together!',
  controls: [['stick', 'Fly anywhere'], ['a', 'Loop-de-loop zoom']],
  tips: ['Loop-de-loops pull in everything nearby!', 'Boop a bumblebee for a sparkle shower.', 'Ride the rainbow wind - wheee!'],
  // Easy (A only): your fairy floats up and down by herself; A zooms to the
  // nearest sparkle when the big A shows.
  goalEasy: 'Zoom to the sparkles and fill the Moon\'s jar together!',
  controlsEasy: [['a', 'Zoom to the sparkle!'], ['stick', 'Fly (if you like)']],
  tipsEasy: ['Your fairy flies all by herself!', 'Fly somewhere else with either stick if you like!', 'When the big A bounces, press A to ZOOM!', 'Zooming pulls in everything nearby!'],
  music: 'bouncy',
  duration: 'About 45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
