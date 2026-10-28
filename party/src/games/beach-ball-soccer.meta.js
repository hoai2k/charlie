// beach-ball-soccer: menu data only (the game code in beach-ball-soccer.js loads lazily).
export const meta = {
  id: 'beach-ball-soccer',
  title: 'Beach Ball Soccer',
  category: 'party',
  type: 'Team game',
  goal: 'Pink Team vs Blue Team: bump the giant beach ball into the other team\'s goal!',
  controls: [['stick', 'Run'], ['a', 'Kick the ball (hold A as you run up: super kick!)'], ['b', 'Dash - dash into the ball for a big bump']],
  tips: [
    'Get behind the ball and kick it toward the other goal.',
    'The ball bounces off the side ropes - use them!',
    'Most goals in 90 seconds wins. Tied? Next goal wins!',
  ],
  music: 'gameon',
  duration: '~90 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
