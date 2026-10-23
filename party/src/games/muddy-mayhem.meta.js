// muddy-mayhem: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'muddy-mayhem',
  title: 'Muddy Mayhem',
  category: 'molly',
  type: 'Free-for-all',
  goal: 'Get super muddy and splat mud on Granny Goose\'s clean washing!',
  controls: [['stick', 'Run (through the mud!)'], ['a', 'Shake and SPLAT']],
  tips: ['Run through puddles - the muddier you are, the bigger the splat!', 'Granny Goose\'s "!" means hose time - run, or just get muddy again.', 'The puppies follow the muddiest player and splat too!'],
  // Easy (A only): you trot to a puddle and roll by yourself, then walk to the
  // washing; it glows and a big A bounces when it's splat time. The stick still
  // runs you anywhere; A away from the washing walks you to the nearest bit and splats.
  goalEasy: 'Splat mud on Granny Goose\'s clean washing!',
  controlsEasy: [['a', 'SPLAT when it glows!'], ['stick', 'Run anywhere you like (or let it walk you)']],
  tipsEasy: ['You walk to the mud all by yourself, or run with either stick!', 'When the washing glows, press A to splat it!', 'Press A lots - splat, splat, splat!'],
  music: 'party',
  duration: '55 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
