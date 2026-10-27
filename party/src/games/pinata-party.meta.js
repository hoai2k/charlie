// pinata-party: the menu's plain-data card (loaded without the game code).
export const meta = {
  id: 'pinata-party',
  title: 'Piñata Party',
  category: 'party',
  type: 'Free-for-all',
  goal: 'Whack the swinging piñatas, then grab the most candy!',
  controls: [['stick', 'Run around the yard'], ['a', 'Swing your party bat (X works too)'], ['b', 'Dash!']],
  tips: [
    'Swing when the piñata is over your ring - right in the middle is a big CRACK!',
    'The hit that bursts it open gets +5 and a candy shower!',
    'Golden candy is worth 5. Bonking a friend just makes them dizzy.',
  ],
  music: 'party',
  duration: '50 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
