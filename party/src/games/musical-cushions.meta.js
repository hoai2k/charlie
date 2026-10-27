// musical-cushions: the menu's plain-data card (loaded without the game code).
export const meta = {
  id: 'musical-cushions',
  title: 'Musical Cushions',
  category: 'party',
  type: 'Musical chairs',
  goal: 'Dance around the cushions - when the music stops, plop down on one! Last one sitting wins.',
  controls: [['stick', 'Dance around the ring the way the arrows go'], ['a', 'Sit on a cushion (only when the music stops!)'], ['b', 'Dash (uses energy)'], ['x', 'Hip-bump a friend (uses energy)']],
  tips: ['Watch the record player: when the needle lifts, get ready!', 'Sitting while the music plays makes you dizzy - and sometimes it only pretends to stop!', 'Follow the arrows round the ring to fill your energy bar, then B dashes and X bumps!'],
  music: 'gameon',
  duration: '30-60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
