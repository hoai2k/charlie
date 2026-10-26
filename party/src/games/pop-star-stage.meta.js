// Pop Star Stage: menu data only (the game code in pop-star-stage.js loads lazily).
import { rhythmOptions } from './rhythm/songs.js';

// The buttons come from Settings > Difficulty: Easy = A and B, Normal = A and
// B with X near the end, Hard = all four. (Plain data: the menu copies this.)
export const meta = {
  id: 'pop-star-stage',
  title: 'Pop Star Stage',
  category: 'studio',
  type: 'Rhythm · Highest score wins',
  goal: 'Press the matching button when each note reaches the line — your music poofs the Shadow Imps!',
  controls: [['a', 'Green notes'], ['b', 'Red notes'], ['x', 'Blue notes: Normal (near the end) and Hard'], ['y', 'Yellow notes: Hard only']],
  tips: [
    'Press right when the note touches the circle!',
    'Difficulty is in Settings: Easy is just A and B; Normal adds X near the end; Hard uses all four.',
    'Each new button starts slow and simple, then the notes build up again.',
    'Play really well and your stars go up: trickier notes, more points! Miss a few and it gets easier.',
    'Hit 20 in a row for rainbow FEVER — double points!',
  ],
  music: 'dance',
  options: rhythmOptions('pop-star-stage', { level: false }),   // the song; difficulty is in Settings
  duration: 'about 1–1½ min',
  minPlayers: 1, maxPlayers: 8,
  countdown: true,
};
