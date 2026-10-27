// tug-of-war: the menu's plain-data card (loaded without the game code).
export const meta = {
  id: 'tug-of-war',
  title: 'Rainbow Tug-of-War',
  category: 'party',
  type: 'Team game',
  goal: 'Pink Team vs Blue Team: pull the rope on the beat and splash the other team into the jelly!',
  controls: [['a', 'Pull - right on the beat!'], ['x', 'SUPER PULL: mash X or A!'], ['b', 'Hop over the banana']],
  tips: [
    'Press A as the ring hits the heart. One pull per beat!',
    'Whole team on the beat = TEAM HEAVE!',
    'Win 2 of 3 pulls. A smaller team pulls extra hard.',
  ],
  music: 'gameon',
  duration: '~1 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
