// gopher-garden: menu data only (the game code in gopher-garden.js loads lazily).
export const meta = {
  id: 'gopher-garden',
  title: 'Gopher Gardens',
  category: 'party',
  type: 'Free-for-all',
  goal: 'Bop the gophers popping up in the garden - but not the fairies or the troll!',
  controls: [['stick', 'Run around the garden'], ['a', 'Bop with your mallet'], ['b', 'Dash!']],
  tips: [
    'Run to a gopher and press A: bop! Every gopher is a point.',
    'Fairies pop up too. Don\'t bop them - oops, that costs a point!',
    'Bop at the troll and he grabs your mallet! Mash A to tug it back.',
    'It gets busier near the end - keep running!',
  ],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
