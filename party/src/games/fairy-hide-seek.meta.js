// fairy-hide-seek: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'fairy-hide-seek',
  title: 'Fairy Hide & Seek',
  category: 'molly',
  type: 'Seek & find',
  goal: 'Find the fairies hiding in the garden!',
  controls: [['stick', 'Walk with your magnifying glass'], ['a', 'Peek! Check a hiding spot']],
  tips: ['Look through your glass to see who is hiding.', 'Wiggly, sparkly spots have a fairy!', 'Frogs and snails are just being silly.'],
  // Easy (A only): you walk from spot to spot by yourself and stop to look;
  // the stick still walks you if you like, and A off a spot walks to the nearest one.
  goalEasy: 'Find the fairies hiding in the garden!',
  controlsEasy: [['a', 'Peek! when you see a fairy'], ['stick', 'Walk anywhere you like (or let it walk you)']],
  tipsEasy: ['You walk to the hiding spots all by yourself, or move with either stick!', 'See a fairy in your glass? Press A quick!', 'Frogs and snails are just being silly.'],
  music: 'sneaky',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
