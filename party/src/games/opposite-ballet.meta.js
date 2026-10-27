// opposite-ballet: menu data only (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'opposite-ballet',
  title: 'Opposite Ballet',
  category: 'molly',
  type: 'Do the opposite',
  goal: 'Madame shows a move... do the OPPOSITE and make her flustered!',
  controls: [['stick', 'Up = arms up, down = plié, left / right = step'], ['a', 'Twirl']],
  tips: ['The cheeky imp flips the card to show the opposite: up is down, left is right!', 'She twirls? Stand still like a statue. She stands still? Twirl!', 'A golden card means copy her for real!'],
  goalEasy: 'Wait for the cheeky imp to flip the card, then press A to do the OPPOSITE!',
  controlsEasy: [['a', 'Dance the flipped card'], ['stick', 'Or dance it yourself with either stick']],
  tipsEasy: ['Wait... wait... the card flips - press A!', 'A crossed-out A? Stand still like a statue!', 'Golden card? Press A straight away!'],
  music: 'dance',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
