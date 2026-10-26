// Puppet Theater: menu data only (the game code loads when it is played).
export const meta = {
  id: 'puppet-theater',
  title: 'Puppet Theater',
  category: 'studio',
  type: 'Show time · Everyone together',
  goal: 'Set the stage, then put on a puppet show that makes the audience laugh!',
  controls: [
    ['stick', 'Move your hand · your puppet'],
    ['lb', 'Set the stage: LB / RB pick Backdrop, Props, Puppet, then Done'],
    ['dpad', 'D-pad (or LT / RT): next backdrop / prop / sock or stick'],
    ['x', 'Put a prop on the stage and stay · Twirl'],
    ['a', 'Keep it and go on (Props: put one in and go on) · on Done: I\'m ready! · Jump'],
    ['b', 'Remove · Hold: pictures'],
    ['y', 'Silly sound (in the show)'],
  ],
  tips: [
    'Stick down hides you behind the stage. Pop up: Peekaboo!',
    'Hold B and point the stick to say a picture. Answer your friends!',
    'Different tricks make the audience laugh more and fill the Bravo meter.',
    'Stage all set? Press A (or RB) until Done, then A.',
  ],
  music: 'bouncy',
  duration: '3 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
  flyIn: false,
};
