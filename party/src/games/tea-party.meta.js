// tea-party: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'tea-party',
  title: 'Teddy Tea Party',
  category: 'molly',
  type: 'Everyone plays',
  goal: 'Give each tea party guest the treat in their bubble!',
  controls: [['stick', 'Run'], ['a', 'Grab a treat / toss it to a guest'], ['b', 'Dash']],
  tips: ['Look at the bubble: pink cup, cupcake, strawberry or cookie.', 'Wrong treat? It just bounces back. Try another guest!', 'A rainbow cake is a super treat: 3 hearts!'],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
