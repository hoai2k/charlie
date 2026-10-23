// Melody Maker: menu data only (the game code in melody-maker.js loads lazily).
export const meta = {
  id: 'melody-maker',
  title: 'Melody Maker',
  category: 'studio',
  type: 'Make music together · Everyone wins',
  goal: 'Make a song together on the magic music garden, then put on a concert!',
  controls: [['stick', 'Move'], ['a', 'Add or remove a note'], ['x', 'Change your sound'], ['y', 'Surprise sparkle!'], ['lb', 'Flip pages (LB / RB)'], ['b', 'Oops! Undo']],
  tips: ['Every note sounds nice together, so try anything!', 'Move up to the buttons for songs, drums and speed.', 'Press Concert! when your song is ready.'],
  music: 'melody',        // no such song: the background music stays off (our tune is the music)
  duration: 'as long as you like',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
