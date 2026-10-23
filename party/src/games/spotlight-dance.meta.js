import { rhythmOptions } from './rhythm/songs.js';

export const meta = {
  id: 'spotlight-dance',
  title: 'Spotlight Dance-Off',
  category: 'party',
  type: 'Memory',
  goal: 'Watch the Shadow Imps dance, then copy their moves from memory!',
  controls: [['dpad', 'Arrow moves (or the stick)'], ['a', 'Sparkle move']],
  tips: [
    'Watch closely - the dances get longer and trickier every round!',
    'A perfect copy zaps an imp with a sparkle beam: +1 point.',
    'Careful! A wrong move or running out of time costs a heart.',
  ],
  music: 'dance',
  options: rhythmOptions('spotlight-dance', { levelLabel: 'Dance', defaultLevel: 1 }),
  duration: '~1.5 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
