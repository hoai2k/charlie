# Round-2 generation catalog. Each entry: key, stem, prompt, dur (requested s), infl, loop.
# kind: hit (peak -3.3), ui (peak -6.3), loud (-16 LUFS cap -3.3), loopsrc, tone (pitched source)
E = []
def add(key, prompts, dur, kind='hit', infl=0.6, loop=False, maxd=None, mind=0.05):
    if isinstance(prompts, str): prompts = [prompts]
    for i, p in enumerate(prompts):
        stem = f'sfx/{key}' + (f'-{i+1}' if len(prompts) > 1 else '')
        E.append(dict(key=key, stem=stem, prompt=p, dur=dur, infl=infl, loop=loop, kind=kind, maxd=maxd or dur + 0.3, mind=mind))

# Pass the Present
add('fuse-sizzle', 'Cartoon fuse sizzling steadily, soft crackling sparkler hiss, continuous and even, no explosion, no bang', 4, 'loopsrc', loop=True)
# Sprinkle Catch / Troll Trouble
add('golden-chime', 'Two separate bell notes in a row, ding then a higher ding, golden treasure chime with a soft sparkle, warm', 1.0, 'ui', maxd=1.2)
add('cake-blorp', ['Cartoon cake plopping out a treat, a soft squishy blorp pop, cute and bouncy',
                   'Soft cartoon bloop of frosting squeezing out a candy, short gooey plop, playful'], 0.5, maxd=0.6)
add('rubber-bounce', ['Small squeaky rubber toy bouncing once, a bright rubbery boink with a tiny squeak, cartoon, short',
                      'One playful rubbery boing-bounce, a squishy jelly candy bouncing off a plate, cartoon, mid pitched',
                      'One gentle rubbery bounce, jelly sweet bouncing once, soft cartoon boink'], 0.5, maxd=0.5)
# Bumper Bounce / Crown Keeper
add('boing', ['Cartoon spring boing, one bouncy boinggg with a springy wobble, comic',
              'Classic cartoon jaw harp boing, short springy bounce sound, funny',
              'Bouncy cartoon spring doing a quick boyoyoing, playful, short'], 0.6, maxd=0.75)
add('frosting-crumble', ['Thick frosting and cake edge crumbling and cracking away, soft sugary crumbly crack, cartoon',
                         'Sugar icing crust cracking and crumbling into pieces, soft crunchy crumble, playful'], 0.8, maxd=1.0)
add('wheee-fall', 'Cartoon falling sound: a slide whistle gliding down in pitch with a soft whoosh of air, playful, instrumental only, no voice', 1.3, 'hit', maxd=1.5)
# Balloon Pump
add('hose-sputter', 'Garden hose sputtering and gurgling, wet bubbly blubbering splutter of water and air, comic cartoon, no voice', 0.8, maxd=1.0)
# Spotlight Dance-Off (pitched source)
add('tone-marimba', ['Single soft marimba note, one clean mallet hit on a wooden bar, middle register, short natural decay, no reverb',
                     'One mellow marimba tone, a single note struck once, warm and round, dry'], 0.6, 'tone')
add('sparkle-beam', 'Magic sparkle beam zap, a quick shimmering whoosh of glitter with a soft bright ting, cute and magical, not harsh', 0.8, maxd=1.0)
# Cookie Crumble
add('cookie-snap', ['Single crisp cookie snapping in half, dry crack',
                    'One sharp crunchy biscuit snap, short',
                    'Short crisp cracker snap, one break'], 0.5, maxd=0.4)
add('crumble-plop', ['Cookie crumbs falling into a glass of milk with a soft little plop',
                     'Cookie piece dropping into milk, gentle liquid plop and tiny splash',
                     'Small cookie chunk plopping into a cup of milk, soft cute plunk'], 0.6, maxd=0.7)
# Paint Party
add('paint-splat-wet', ['Squishy wet paint splat with a little drip, cartoon, one splat',
                        'Thick wet paint splattering onto a wall then a tiny drip, squelchy',
                        'One gooey paint blob splat with a short drippy tail, playful'], 0.5, maxd=0.7)
add('roller-ding', 'Cheerful pickup ding, one warm mid-pitched bell note, item collected, short and round', 0.5, 'ui', maxd=0.7)
# Crown Keeper
add('crown-sting', 'Short royal fanfare sting, regal trumpets with a bright bell sparkle, kids game, celebratory, ending on a held major chord, instrumental', 1.5, 'loud', infl=0.7, maxd=2.0)
add('crown-land', ['Small metal crown landing on a head, a bright tinny clink and a soft boing, cartoon, mid pitched',
                   'Toy crown landing on a head, a soft wooden thunk with a short springy boing, cute cartoon'], 0.5, maxd=0.7)
add('bonk', ['Cartoon bonk on the head, a hollow wooden coconut knock, comic, bright, one hit',
             'Funny cartoon head bonk on a wooden block, hollow knock, short',
             'Comic cartoon bonk, a hollow woodblock clonk with a tiny boing, one hit'], 0.5, maxd=0.45)
# Broomstick Dash
add('tone-ding', ['A single sparkly bell ding, one clear bright note, glockenspiel, no reverb',
                  'One clean celesta bell note struck once, bright and pure, short decay'], 0.5, 'tone')
add('broom-whoosh', 'Constant fast wind rush heard while flying, steady strong airflow at an unchanging level, no swells, smooth, exciting', 4, 'loopsrc', loop=True)
add('broom-glide', 'Constant soft wind noise heard while gliding, smooth steady airflow at an unchanging level, no swells, gentle and calm', 4, 'loopsrc', loop=True)
# Fairy Count
add('wing-twinkle', 'Soft fluttering of small wings, gentle airy flapping with a warm faint twinkle of chimes, continuous, steady, calm', 4, 'loopsrc', loop=True)
add('tone-chime', ['A single soft glass chime note, gentle, clear and pure, struck once, short decay',
                   'One soft music box note, pure and sweet, single tone'], 0.5, 'tone')
add('double-time', 'Fast upbeat instrumental sting: a quick rising xylophone run and two bright brass stabs, exciting and playful, speeding up, no voice', 1.5, 'loud', infl=0.7, maxd=2.0)
# Potion Class
add('cauldron-plop', ['Something plopping into a bubbling potion cauldron, thick liquid bloop with a bubble',
                      'Ingredient dropping into a witch cauldron, gloopy plop and a few bubbles, cartoon'], 0.6, maxd=0.8)
add('hic', ['Cute cartoon hiccup sound effect, a single small squeaky hic',
            'One tiny adorable cartoon hiccup, short and squeaky'], 0.5, maxd=0.45)
add('giant-stomp', ['Heavy cartoon giant footstep: a punchy thud with a crunchy gravel slap on top, one hit, audible on small speakers',
                    'Comic big footstep, a loud wooden plank whack with a crunchy slap and a little rattle of dishes, bright attack, one hit',
                    'Cartoon stomp on a wooden floor, a solid knock and a crisp slap, with a short creak, funny, one hit'], 0.6, maxd=0.7)
add('tiny-squeak', ['Tiny high cartoon squeak like a little mouse toy, cute, one squeak',
                    'One small squeaky toy squeak, very short and cute',
                    'Little cartoon critter squeak, tiny and sweet, single chirp'], 0.5, maxd=0.4)
# Memory Match
add('card-flip', ['Paper playing card flipped over on a table, crisp quick flick',
                  'Single card flip, short papery fwip',
                  'One playing card turned over, quick soft paper snap'], 0.5, 'ui', maxd=0.35)
add('card-whoosh', ['Playing card tossed onto a pile of cards, a short soft swish and a papery tap',
                    'A card sliding fast across a table into a stack, short swish and tap'], 0.5, 'ui', maxd=0.7)
add('match-chime', 'Two-note success chime: a marimba plays two notes one after the other, low then high, ding-ding, cheerful, warm', 0.8, 'ui', maxd=1.0)
# Fashion Show
add('camera-flash', ['Crowd of photographers taking pictures, several camera shutters clicking quickly with flash pops, fashion runway',
                     'Burst of many camera clicks and flashes at a red carpet, quick overlapping shutter clicks',
                     'A handful of cameras snapping photos at once, rapid shutter clicks and flash whines, short'], 1.0, maxd=1.2)
# Cake Bakery
add('sprinkle-shake', 'Shaking a small jar of candy sprinkles back and forth, steady even rhythmic rattle, continuous', 4, 'loopsrc', loop=True)
add('candle-blow', ['Soft breath blowing out birthday candles, a gentle fwoo puff of air',
                    'A gentle puff of breath blowing out little candles, airy fwooo, soft'], 0.8, maxd=1.0)
add('crowd-aww', ['Small group of children making a warm wordless awww sigh together, gentle and adoring, sweet, no words',
                  'A few young children going awww together, a soft high adoring sigh, cute and kind, wordless'], 1.2, 'loud', infl=0.55, maxd=1.6)
# Pet Spa
add('scrub', ['Soapy sponge scrubbing with squeaky foam bubbles, one short scrub',
              'Quick squeaky soapy scrub on fur, bubbly lather, short',
              'Short sudsy scrub stroke, foamy squelch and squeak, cartoon'], 0.5, maxd=0.6)
add('shower', 'Short spray of a handheld shower hose, gentle water spray burst then stops, bath time', 1.0, maxd=1.3)
add('pet-shake', ['Wet puppy shaking off water, fur flapping and droplets spraying, cartoon, short',
                  'Little wet dog shaking itself dry, floppy ears flapping and fur rustling, droplets pattering, cute'], 0.8, maxd=1.1)
# Pop Star Stage (pitched source)
add('tone-vibe', ['Single vibraphone note, one clean soft mallet hit, bright and round, short decay, no tremolo',
                  'One bright kalimba note plucked once, clean and pure, short'], 0.5, 'tone')
add('fever', 'Rainbow fever power-up riser, a rising sparkly synth sweep with shimmering bells, exciting, ends bright', 1.5, 'loud', infl=0.7, maxd=1.8)
add('big-imp-poof', 'Big magical poof: a cartoon puff of smoke, airy whoosh with a soft pop and twinkling sparkles, friendly, mid-range', 1.2, maxd=1.5)
# Fairy Garden
add('plant-seed', ['A soft muffled pat, a palm patting a small pile of damp sand once, close up',
                   'Gentle earthy pat, pressing a seed into soft soil, short',
                   'Gentle dull pat of a seed being pushed into soft earth, with a tiny crunch of soil, close up'], 0.5, maxd=0.4)
add('firefly-catch', ['Twinkly cute bloop, a little magical blip with a sparkle',
                      'Tiny bright magical bloop with a twinkle, cute catch sound',
                      'Short sparkly pop bloop, firefly caught in a jar, cute'], 0.5, 'ui', maxd=0.5)
add('petal-firework', ['Soft round pop like a bubble, then a warm low twinkling shimmer of glockenspiel notes, magical flower bloom, gentle',
                       'Gentle magical firework: a soft round pop then a warm sparkling chime cascade, cute, not loud'], 1.2, maxd=1.6)
add('night-crickets', 'Crickets chirping at night, close and clear, gentle rhythmic chirps, calm countryside, steady', 6, 'loopsrc', loop=True)
