// opposite-ballet (shown as "Dance Along"; the id stays for links and settings): menu data only
// (the game code is lazy-loaded; see games/index.js).
export const meta = {
  id: 'opposite-ballet',
  title: 'Dance Along',
  category: 'molly',
  type: 'Dance class',
  goal: 'Dance anywhere you like! When Madame calls a move, press its button to copy her and win butterflies.',
  controls: [['stick', 'Dance around the stage'], ['a', 'Every button is a dance: A Star jump · B Hula · X Disco · Y Twirl'], ['lt', 'LT Cartwheel · RT Can-can · LB Splits · RB Moonwalk']],
  tips: ['The big button by Madame shows what to press - and the card shows the move.', 'Copy her on the beat for an extra butterfly!', 'Any move is a good move: try them all for "New move!" butterflies.', 'Golden moves are worth more!', 'At the end it\'s a free dance - any move counts!'],
  goalEasy: 'Dance with Madame! Press A to do the move she calls - or press any button for a move of your own.',
  controlsEasy: [['a', 'Do the move Madame calls'], ['y', 'The other buttons are dances too (if you like): B Hula · X Disco · Y Twirl...'], ['stick', 'Dance around the stage (if you like)']],
  tipsEasy: ['Just press A to copy Madame!', 'Press A on the beat for an extra butterfly!', 'Other buttons do other dances - try them all!', 'At the end it\'s a free dance - any move counts!'],
  music: 'dance',
  duration: '75 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
};
