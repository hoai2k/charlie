// mermaid-pearls: menu data only (the game code loads on demand).
export const meta = {
  id: 'mermaid-pearls',
  title: 'Mermaid Pearls',
  category: 'molly',
  type: 'Team',
  goal: 'Swim and grab pearls to fill the treasure chest together!',
  controls: [['stick', 'Swim'], ['a', 'Zoom! (and tickle the octopus)']],
  tips: ['Swim into open clams to grab their pearls.', 'Press A next to the sleepy octopus to tickle it - it throws pearls!', 'Bubble currents whoosh you up. Wheee!'],
  // Molly Easy: you swim by yourself (slowly) toward pearls; A zooms to grab them
  goalEasy: 'You swim by yourself to the pearls. Press A to ZOOM and grab them!',
  controlsEasy: [['a', 'Zoom! (and tickle the octopus)'], ['stick', 'Swim with either stick if you like']],
  tipsEasy: ['Press A when the big A pops up: ZOOM!', 'Want a different pearl? Swim over with the stick, then press A!', 'Next to the sleepy octopus? Press A again and again to tickle it!'],
  music: 'splash',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
