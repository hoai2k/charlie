// Unicorn Memory Match: menu data only (the game code in memory-match.js loads lazily).
export const meta = {
  id: 'memory-match',
  title: 'Unicorn Memory Match',
  category: 'studio',
  competitive: true,   // a contest in Play Studio: podium ending, no pause-menu "All done!"
  type: 'Memory · Take turns · Most pairs wins',
  goal: 'Flip two cards to find matching pairs. Most pairs wins!',
  controls: [['stick', 'Move your cursor'], ['a', 'Flip a card']],
  tips: ['Find a pair and you go again!', 'Watch every card and remember it!', 'Alone? Find all pairs in few tries.'],
  music: 'menu',
  duration: 'about 3–4 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
