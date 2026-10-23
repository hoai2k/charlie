// fishing-frenzy: the menu's plain-data card (loaded without the game code).
export const meta = {
  id: 'fishing-frenzy',
  title: 'Fishing Frenzy',
  category: 'party',
  type: 'Free-for-all',
  goal: 'Catch the most fish points in 60 seconds!',
  controls: [['stick', 'Aim your cast'], ['a', 'Cast, then press A when a fish bites, and tap A to reel it in']],
  tips: [
    'Cast near a fish and wait for it to bite.',
    'Tap A fast to reel it in!',
    'Big fish and golden fish are worth lots of points.',
  ],
  music: 'splash',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
