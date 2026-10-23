// dance-freeze: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'dance-freeze',
  title: 'Dance & Freeze',
  category: 'molly',
  type: 'Musical statues',
  goal: 'Dance while the music plays - when it stops, FREEZE!',
  controls: [['stick', 'Wiggle to dance'], ['a', 'Jump and spin']],
  tips: ['When the lights go blue and you see the snowflake: let go and freeze!', 'Frozen friends earn stars. Wigglers get tickled by the feather!', 'The last dance is a Disco Party: double stars!'],
  music: 'dance',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
