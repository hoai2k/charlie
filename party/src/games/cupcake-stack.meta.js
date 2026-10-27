// cupcake-stack: menu data only (the game code loads on demand).
export const meta = {
  id: 'cupcake-stack',
  title: 'Cupcake Tower',
  category: 'molly',
  type: 'Build together',
  goal: 'Stack the tallest cupcake tower in the world together!',
  controls: [['a', 'Drop your cupcake']],
  tips: [
    'Drop it when your fairy is over the tower. Right on top = sparkly Perfect!',
    'Sticky icing: crooked cupcakes still stick. The tower just giggles!',
    'At the end, press A again and again to blow out the birthday candles!',
  ],
  goalEasy: 'Stack the tallest cupcake tower together - press A to drop your cupcake!',
  controlsEasy: [['a', 'Drop your cupcake']],
  tipsEasy: [
    'Your fairy flies by herself. Press A when the arrow and the A show up!',
    'Crooked cupcakes still stick. The tower just giggles!',
    'At the end, press A again and again to blow out the candles!',
  ],
  music: 'bouncy',
  duration: '55 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
