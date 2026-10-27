// crown-keeper: the menu's plain-data card (loaded without the game code).
export const meta = {
  id: 'crown-keeper',
  title: 'Crown Keeper',
  category: 'party',
  type: 'Keep-away',
  goal: 'Wear the crown for the most seconds - bump the holder to steal it!',
  controls: [['stick', 'Run around the garden'], ['a', 'Dash: bump the crown loose (or get away with it)'], ['b', 'Dash (like A)']],
  tips: ['The crown holder runs a little slower - and earns points.', 'Dash into the holder to knock the crown off!', 'Wearing the crown? Dash away from the chasers!', 'A bonk sends the crown flying the way you hit it.', 'The last 10 seconds count DOUBLE!'],
  music: 'gameon',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
