// treasure-dig: the menu's plain-data card (loaded without the game code).
export const meta = {
  id: 'treasure-dig',
  title: 'Treasure Dig',
  category: 'party',
  type: 'Hot & cold hunt',
  goal: 'Follow your shell detector to buried treasure and dig it up!',
  controls: [['stick', 'Walk along the beach'], ['a', 'Dig!']],
  tips: [
    'Your ring and shell go blue (cold), yellow (warm), RED (hot!). Dig when the red "!" pops up.',
    'Dig in the wrong spot and you might find a crab, a sock... or seaweed!',
    'Found a treasure chest? Dig it with a friend - together counts double!',
    'Gold Rush at the end: extra treasure, and the crown shows up more!',
  ],
  music: 'gameon',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
