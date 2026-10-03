# Prompts per song/take. Each ends with the shared loop/quality tail.
TAIL = (" Instrumental only, no vocals, no choir, no spoken words. Original melody, kid-friendly, "
        "pleasant on repeat. Steady tempo throughout, straight sixteenths, no swing, no tempo or key change. "
        "Seamless loop: no intro, no fade-out, no ending.")
SONGS = {
 'dance': dict(bpm=120, key='C minor', ms=90000, takes=[
  "Upbeat K-pop style idol dance anthem, 120 BPM, C minor. Four-on-the-floor kick drum on every beat, claps on beats 2 and 4, punchy synth bass, bright catchy synth lead, sparkly bell and glitter effects. Confident and empowering, heroes banishing shadows with music. Quantized electronic production with a lighter breakdown where the kick keeps going.",
  "Sparkly, confident girl-group pop dance track at exactly 120 BPM in C minor. Steady four-on-the-floor kick on every single beat, handclaps on 2 and 4, plucky octave synth bass, shimmering synth chords, a bright plucked synth hook, glittery chimes and risers. Empowering and magical, quantized to the grid, kick never drops out.",
  "Bright electro-pop dance groove for a kids' rhythm game, 120 BPM, key of C minor. Kick drum on every beat all the way through, snappy claps on 2 and 4, bouncy synth bass, glossy square-wave lead riff, twinkling arpeggios and sparkle effects, a short softer section that still keeps the kick. Tight, quantized, energetic and friendly.",
 ]),
 'menu': dict(bpm=112, key='F major', ms=90000, takes=[
  "Relaxed, happy background music for a children's game menu, 112 BPM, F major. Soft ukulele strums and gentle marimba, light shaker, warm pad, round mellow bass. Low energy and cheerful, no busy lead melody, leaves space for people chatting.",
  "Cozy, sunny menu music for a kids' party game at 112 BPM in F major. Warm marimba pattern, soft kalimba and a little glockenspiel, brushed shaker and light finger snaps, soft upright-style bass, airy pad. Calm and smiling, simple and uncluttered, no prominent lead.",
  "Easygoing cheerful lounge groove for a children's game selection screen, 112 BPM, F major. Gentle plucked acoustic guitar and ukulele, soft vibraphone chords, light tambourine and shaker on a relaxed beat, warm bass. Happy, laid-back and uncluttered, no busy melody.",
 ]),
 'chill': dict(bpm=92, key='E major', ms=90000, takes=[
  "Cozy, dreamy, creative background music, 92 BPM, E major. Music box melody, soft Rhodes electric piano, felt piano, gentle acoustic guitar, light brushed drums, gentle chimes. Calm and warm like painting in a fairy garden.",
  "Gentle, magical lo-fi lullaby groove for a children's art and garden game, 92 BPM in E major. Felt piano chords, a soft celesta and music box motif, fingerpicked acoustic guitar, soft brushes and a quiet kick, warm bass, twinkling chimes. Peaceful and cozy, soft and round, not sleepy.",
  "Soft, warm and dreamy instrumental at 92 BPM, E major, for a cozy pet spa and fairy garden game. Mellow Rhodes piano, kalimba and music box sparkles, gentle nylon-string guitar, soft shaker and brushed snare, round bass, airy pad. Relaxed, happy and creative.",
 ]),
 'chase': dict(bpm=156, key='A minor', ms=85000, takes=[
  "Playful, urgent comic chase music for a cartoon, 156 BPM, A minor. Galloping bass, pizzicato strings, tom fills, a cheeky bassoon and tuba line, staccato synth stabs, driving drums. Run! Funny and mischievous, comic, never scary.",
  "Silly cartoon chase scene, fast 156 BPM in A minor. Bouncy galloping bassline, plucky pizzicato strings, cheeky staccato clarinet and bassoon melody, playful xylophone runs, snappy snare and tom fills. Urgent but goofy and kid-friendly, not dark, not scary.",
  "Comic-urgent game chase music at 156 BPM, key of A minor, like sneaking past a grumpy troll. Driving galloping rhythm on toms and bass, pizzicato strings, oom-pah tuba, staccato synth plucks, quick woodwind runs. Mischievous and fun, light and bouncy, not scary.",
 ]),
 'bouncy': dict(bpm=128, key='G major', ms=85000, takes=[
  "Silly, boingy cartoon fun music, 128 BPM, G major. Bouncy tuba bass, xylophone melody, woodblocks, a kazoo-like lead, occasional slide whistle accents used sparingly, light drums. Goofy, cheerful and bouncy, like baking a wobbly cake.",
  "Goofy happy cartoon bounce at 128 BPM in G major. Oom-pah tuba and bouncy bassoon, plinky xylophone and marimba tune, woodblocks and claps, a playful muted trumpet, a rare cartoon boing accent. Cheerful, silly and light, kid-friendly.",
  "Playful bouncy toy-box party music, 128 BPM, G major, for a balloon pumping game. Rubber-band bass on tuba, xylophone and glockenspiel melody, ukulele chops, woodblocks and hand claps, a cheeky melodica lead. Silly, smiling and springy.",
 ]),
 'tense': dict(bpm=120, key='G minor', ms=90000, takes=[
  "Suspenseful but cute game-show music, 120 BPM, G minor. Ticking clock percussion on every beat, plucked low pizzicato strings, a curious celesta motif, sparse and light, slowly building tension without a big climax. 'Ooh, who will it be?' Playful, not scary.",
  "Cute, curious suspense music for a kids' party game, 120 BPM in G minor. Steady tick-tock woodblock pulse on every beat, soft pizzicato bass and strings, sneaky celesta and glockenspiel notes, light muted kick, a gentle simmering build that never peaks. Anticipation, playful and friendly.",
  "Playful tension underscore at 120 BPM, G minor, like passing a ticking present around a circle. Clock-like tick percussion keeping time, tiptoeing pizzicato strings, quiet staccato bassoon, sparkling celesta motif, soft pulsing low synth. Sparse and suspenseful but cute and kid-friendly, holds steady without a climax.",
 ]),
 'victory': dict(bpm=132, key='C major', ms=80000, takes=[
  "Triumphant celebration music for winning a game, 132 BPM, C major. Brass fanfare pop, drum-corps snare cadence, bright bells, a big happy major-key chorus, confident bass. Joyful and proud, kid-friendly.",
  "Joyful victory party anthem at 132 BPM in C major. Bold brass section hits and a soaring trumpet melody, marching snare rolls, glockenspiel and tubular bells, claps, punchy pop drums and bass. Celebrating the champion, bright and uplifting.",
  "Bright, festive winners' podium music, 132 BPM, C major. Pop band with a big brass fanfare, marching drums, sparkling bells and chimes, glossy synth chords, a singable major-key chorus melody played by horns. Happy, triumphant and friendly.",
 ]),
 'title': dict(bpm=124, key='C major', ms=90000, takes=[
  "Joyful, inviting theme song for a kids' party game title screen, 124 BPM, C major. Bright synth-pop with a glockenspiel lead playing a catchy, memorable four-bar hook, claps, plucky bass, a big but friendly chorus lift. The party is starting!",
  "Catchy, sparkling main theme for a children's party video game, 124 BPM in C major. Glockenspiel and bright synth pluck hook, bouncy plucked bass, hand claps and pop drums, shimmering chords, a friendly uplifting chorus. Welcoming and fun.",
  "Happy, bouncy title music for a magical kids' party game at 124 BPM, C major. Cheerful synth-pop with a bell-like glockenspiel and marimba melody, snappy claps, round plucky bass, sparkly arpeggios, a bright chorus lift. Inviting and memorable.",
 ]),
}
ORDER = ['dance', 'menu', 'chill', 'chase', 'bouncy', 'tense', 'victory', 'title']
SONGS['rhythm-1'] = dict(bpm=112, key='E-flat major', ms=72000, takes=[
  "Bright, catchy K-pop style idol pop instrumental for a kids' rhythm game, 112 BPM, E-flat major. Steady four-on-the-floor kick on every beat, crisp claps on 2 and 4, bouncy synth bass, a simple catchy plucked synth lead hook with clear separate notes, sparkly bells. Very regular and easy to clap along to, cheerful and confident.",
])
