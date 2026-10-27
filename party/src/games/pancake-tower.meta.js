// pancake-tower: the menu's plain-data card (loaded without the game code).
export const meta = {
  id: 'pancake-tower',
  title: 'Pancake Tower',
  category: 'party',
  type: 'Stacking',
  goal: 'Stack the tallest pancake tower before time runs out!',
  controls: [['a', 'Drop the pancake']],
  tips: [
    'Drop it right on top for a PERFECT! 3 in a row = sticky syrup.',
    'Leaning tower? Drop the next one on the other side to balance it.',
    'Golden pancakes are extra wide and worth 3!',
  ],
  music: 'gameon',
  duration: '50 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
