// sock-match: menu data only (the game code loads on demand).
export const meta = {
  id: 'sock-match',
  title: 'Silly Sock Match',
  category: 'molly',
  type: 'Team',
  goal: 'Find each silly sock its twin and hang the pairs on the line!',
  controls: [['stick', 'Run'], ['a', 'Grab a sock']],
  tips: ['Carry a sock to the one that looks the same.', 'The puppy steals socks! Run into him and he drops it.', 'Holding twins with a friend? Run together for a high-five!'],
  // Molly Easy: you walk by yourself to a sock, A grabs it, then you carry it to its twin
  goalEasy: 'Press A to go grab a sock. You carry it to its twin all by yourself!',
  controlsEasy: [['a', 'Grab a sock / catch the puppy'], ['stick', 'Move with either stick if you like']],
  tipsEasy: ['Press A: you walk to the nearest sock and grab it.', 'Want a different sock? Walk over with the stick, then press A!', 'The puppy has a sock? Press A when he runs by!'],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
