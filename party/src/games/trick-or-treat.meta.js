// trick-or-treat: menu data only (the game code loads on demand).
export const meta = {
  id: 'trick-or-treat',
  title: 'Trick or Treat!',
  category: 'molly',
  type: 'Candy hunt',
  goal: 'Knock on doors and fill your pumpkin bucket with candy!',
  controls: [['stick', 'Run along the street'], ['a', 'Knock on a door (or jump and spin!)'], ['b', 'Dash']],
  tips: ['Knock where the porch light is on - everyone at the door gets candy!', 'Golden doors make a candy fountain!', 'When the Candy Ghost flies by, run and scoop up the candy!'],
  goalEasy: 'Press A and you walk to the nearest lit door and knock. Get candy!',
  controlsEasy: [['a', 'Go to a door and knock knock!'], ['stick', 'Move with either stick if you like'], ['b', 'Dash (if you like)']],
  tipsEasy: ['Press A: you walk to the nearest lit door and knock.', 'Want a different door? Walk over with the stick, then press A!', 'Golden doors make a candy fountain!'],
  music: 'spooky',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
