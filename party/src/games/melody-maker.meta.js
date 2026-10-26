// Melody Maker: menu data only (the game code in melody-maker.js loads lazily).
export const meta = {
  id: 'melody-maker',
  title: 'Melody Maker',
  category: 'studio',
  type: 'Make music together · Everyone wins',
  goal: 'Make a song together on the magic music garden, then put on a concert!',
  controls: [['stick', 'Move'], ['a', 'Add or remove a note · on Done: Concert!'], ['x', 'Change your sound'], ['lb', 'Flip pages (LB / RB) · after the last page: Done'], ['y', 'Surprise sparkle! (a little tune, or a whole one on an empty page)'], ['b', 'Oops! Undo']],
  tips: ['Every note sounds nice together, so try anything!', 'Move up to the buttons for songs, drums and speed.', 'Song ready? Press RB until Done, then A for the concert.'],
  music: 'melody',        // no such song: the background music stays off (our tune is the music)
  duration: 'about 5 min, then you choose',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
};
