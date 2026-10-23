// Unicorn Memory Match: menu data only (the game code in memory-match.js loads lazily).
export const meta = {
  id: 'memory-match',
  title: 'Unicorn Memory Match',
  category: 'studio',
  type: 'Memory · Take turns',
  goal: 'Flip two cards to find matching pairs. Most pairs wins!',
  controls: [['stick', 'Move your cursor'], ['a', 'Flip a card']],
  tips: ['Find a pair and you go again!', 'Watch every card and remember it!', 'Alone? Find all pairs in few tries.'],
  music: 'menu',
  duration: 'about 4 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
