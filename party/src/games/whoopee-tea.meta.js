// whoopee-tea: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'whoopee-tea',
  title: 'Whoopee Tea Party',
  category: 'molly',
  type: 'Cheeky pranks',
  goal: 'Sneak whoopee cushions onto the chairs before the posh guests sit down. PFFFT!',
  controls: [['stick', 'Run'], ['a', 'Grab a cushion / put it on a chair']],
  tips: ['A glowing chair means a guest is coming!', 'The butler takes cushions back. Run!', 'At the end, push the golden cushion to the throne!'],
  // Molly Easy: you walk all by yourself (or steer with the stick); A does the
  // prank when the big A shows, and A anywhere else walks you to the next thing
  goalEasy: 'Walk to the basket, then to a chair. Press A when the A shows. PFFFT!',
  controlsEasy: [['a', 'Grab a cushion / put it on a chair'], ['stick', 'Run anywhere you like (or let it walk you)']],
  tipsEasy: ['You walk all by yourself, or run with either stick!', 'Press A when the big A bounces.', 'At the end, tap A to push the golden cushion!'],
  music: 'sneaky',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
