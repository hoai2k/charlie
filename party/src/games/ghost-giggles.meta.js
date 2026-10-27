// ghost-giggles: menu data only (the game code loads on demand).
export const meta = {
  id: 'ghost-giggles',
  title: 'Ghost Giggles',
  category: 'molly',
  type: 'Team up',
  goal: 'Tickle the ghosts to make them colourful, then dance!',
  controls: [['stick', 'Run around the house'], ['a', 'Tickle!'], ['b', 'Dash']],
  tips: ['Run to a white ghost and press A to tickle it.', 'Shy ghosts hide behind the curtains - press A at the window!', 'Press A at a costume trunk to change your costume.'],
  // Molly Easy: you walk to the ghosts by yourself; A tickles, X changes your costume
  goalEasy: 'You walk to the ghosts by yourself. Press A to tickle them colourful!',
  controlsEasy: [['a', 'Tickle! (A runs you to the nearest ghost)'], ['x', 'New costume'], ['stick', 'Move with either stick if you like'], ['b', 'Dash (if you like)']],
  tipsEasy: ['Press A when the big A bounces over a ghost.', 'Want a different ghost? Walk over with the stick, then press A!', 'At a window? Press A for a Peekaboo!', 'Press X for a new costume.'],
  music: 'spooky',
  duration: '50 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
