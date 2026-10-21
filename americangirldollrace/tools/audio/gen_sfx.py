"""Generate race sound effects with ElevenLabs sound generation.

The API key is read from $SFX_WORKDIR/.elevenlabs_key inside this process only and
is never printed or logged. Raw takes land in raw/<key>_NN.mp3; process.py
trims, levels and exports them into the game.
"""
import json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

# Work outside the repo; the key lives in $SFX_WORKDIR/.elevenlabs_key (never commit it).
S = os.environ.get('SFX_WORKDIR', os.path.dirname(os.path.abspath(__file__)))
HERE = S
RAW = HERE + '/raw'

# key: (prompt, seconds, variants[, loop]); loop=True asks for a seamless loop
SOUNDS = {
    # Instrument and themed pickups (EMP / speed / high jump on specific tracks)
    'pickup_gong': ('A single bright bronze gong strike with a short shimmering ring, cheerful cartoon game pickup sound', 1.6, 2),
    'pickup_trumpet': ('A short royal trumpet fanfare, three quick bright notes, cheerful cartoon game pickup sound', 1.3, 2),
    'pickup_toy_drum': ('A quick toy snare drum roll ending in a snappy rim hit, playful children\'s toy, game pickup sound', 1.0, 2),
    'pickup_jack_in_box': ('A jack-in-the-box springing open: a quick pop and a springy boing, playful toy, game pickup sound', 0.9, 2),
    'pickup_hand_bell': ('A single cheerful brass hand bell ring, bright and clear, short game pickup sound', 1.1, 2),
    'pickup_starter_bell': ('A horse race starting bell, two quick bright rings, short game pickup sound', 1.1, 2),
    'pickup_acorn_bell': ('A tiny magical wooden acorn bell tinkling with soft fairy sparkle, enchanted forest, short game pickup sound', 1.0, 2),
    'pickup_conch': ('A conch shell horn blown once, a short deep hollow toot, playful beach, game pickup sound', 1.2, 2),
    'pickup_rooster': ('A rooster crowing a short funny cock-a-doodle-doo, cartoon farm, game pickup sound', 1.6, 2),
    'pickup_wand_zap': ('A magic wand zap with a sparkly rising chime, cute fantasy game pickup sound', 0.8, 2),
    'pickup_laser': ('A retro toy ray gun laser, a quick bright pew-pew, playful sci-fi game pickup sound', 0.6, 2),
    'pickup_pop_rocks': ('Fizzing crackling popping candy, quick sweet sparkly crackle, playful game pickup sound', 1.0, 2),
    'pickup_crows': ('A couple of crows cawing and flapping away from a straw scarecrow, short playful autumn game sound', 1.2, 2),
    'pickup_sparkler': ('A sparkler fizzing and crackling with a quick whoosh, festive, short game pickup sound', 1.0, 2),
    # Beach ball
    'beachball_kick': ('Kicking an inflatable plastic beach ball, a hollow springy thwack, outdoors on a beach', 0.5, 3),
    'beachball_bounce': ('An inflatable beach ball bouncing once on soft sand, a light hollow plasticky bop', 0.4, 3),
    # Sticky puddles
    'sticky_squelch': ('Feet stepping into a thick gooey sticky puddle of honey, a wet slow squelch, cartoon', 0.8, 2),
    # Horse Show trolls
    'skeleton_horse_whinny': ('A cartoon skeleton horse whinnying with a rattle of bones, spooky but silly, not scary, for a children\'s game', 1.5, 2),
    'troll_unhorsed': ('A big clumsy cartoon troll tumbling off a horse: a heavy thud, a grunt and a rattle of bones', 1.0, 2),
    # Themed mounts
    'mount_rocking_horse': ('A wooden rocking horse creaking and rocking, two quick creaky rocks, toy room', 1.0, 2),
    'mount_carousel': ('A short carousel music-box chime, a few twinkling notes from a merry-go-round organ', 1.2, 2),
    'mount_reindeer': ('Sleigh bells jingling briefly with a soft reindeer snort, wintry', 1.2, 2),
    'mount_pony': ('A small cute pony whinny, short and friendly', 1.0, 2),
    # Track monsters that replace the troll (tracks.js `monster`): kid-friendly, spooky-silly
    # Riding toys (tracks.js rideToys)
    'pickup_skates': ('Putting on roller skates: a quick clack of skate wheels spinning with a cheerful whir, short game pickup sound', 0.9, 2),
    'pickup_pogo': ('A pogo stick spring compressing and releasing with a big springy boing, cartoon, short game pickup sound', 0.8, 2),
    'pogo_boing': ('A single short light springy pogo stick boing on landing, cartoon', 0.4, 3),
    'skate_roll_loop': ('Roller skate wheels rolling smoothly on a pavement, a steady gentle rumble, seamless loop', 3.0, 1, True),
    'scarecrow_notice': ('A jack-o-lantern scarecrow spotting someone: a hollow, goofy "heh heh heh" chuckle with a straw rustle, spooky but silly, for a children\'s game', 1.2, 2),
    'scarecrow_walk_step': ('A floppy straw-stuffed scarecrow taking one shuffling step on dirt, soft straw rustle', 0.4, 3),
    'scarecrow_idle_grunt': ('A scarecrow with a pumpkin head humming a low creaky "hmmm" with straw rustling, silly spooky', 1.0, 2),
    'scarecrow_grab': ('A scarecrow grabbing something with a quick straw whoosh and a hollow "gotcha!" cackle, cartoon, not scary', 0.8, 2),
    'scarecrow_lift': ('A straw scarecrow straining to lift something, creaking straw and a hollow "hrrrup", cartoon', 0.7, 2),
    'scarecrow_throw': ('A scarecrow tossing something with a big straw whoosh and a hollow pumpkin "wheee-heh!", cartoon', 0.8, 2),
    'scarecrow_hit': ('A soft cartoon bonk on a hollow pumpkin with a puff of straw', 0.5, 2),
    'scarecrow_fall': ('A scarecrow collapsing: clothes flopping down, straw scattering and a hollow pumpkin thunk, cartoon', 1.0, 2),
    'scarecrow_wake': ('An empty scarecrow outfit settling into a heap and a pumpkin rolling to rest on top, soft and funny', 1.0, 2),
    'skeleton_notice': ('A cartoon skeleton spotting someone: jaw chattering into a goofy clacky laugh, spooky but silly, for a children\'s game', 1.2, 2),
    'skeleton_walk_step': ('A cartoon skeleton taking one bony step, a light hollow clack', 0.35, 3),
    'skeleton_idle_grunt': ('A cartoon skeleton\'s teeth chattering and bones rattling softly, silly', 1.0, 2),
    'skeleton_grab': ('A cartoon skeleton grabbing something: a quick bony clack and a creaky "gotcha!" cackle, not scary', 0.8, 2),
    'skeleton_lift': ('A cartoon skeleton straining to lift something, creaking bones and a hollow "hrrrup"', 0.7, 2),
    'skeleton_throw': ('A cartoon skeleton tossing something with a whoosh and a rattle of bones and a goofy "heh!"', 0.8, 2),
    'skeleton_hit': ('A cartoon bonk on a skeleton\'s skull with a light rattle of bones', 0.5, 2),
    'skeleton_fall': ('A cartoon skeleton falling apart into a clattering pile of bones', 1.0, 2),
    'skeleton_wake': ('The last few bones clinking down onto a pile and a skull rolling to rest, soft and funny', 1.0, 2),
}


def key():
    with open(S + '/.elevenlabs_key') as f:
        return f.read().strip()


def generate(name, variant, prompt, seconds, loop=False):
    dst = f'{RAW}/{name}_{variant:02d}.mp3'
    if os.path.exists(dst):
        return name, variant, 'cached'
    request = {'text': prompt, 'duration_seconds': max(0.5, seconds), 'prompt_influence': 0.6}
    if loop:
        request['loop'] = True
    body = json.dumps(request).encode()
    for attempt in range(5):
        req = urllib.request.Request(
            'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',
            data=body, headers={'xi-api-key': key(), 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                audio = r.read()
            if len(audio) < 500:
                return name, variant, 'tiny response'
            with open(dst, 'wb') as f:
                f.write(audio)
            return name, variant, 'ok'
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf8', 'ignore')[:200]
            if e.code in (429, 500, 502, 503):
                time.sleep(4 * (attempt + 1))
                continue
            return name, variant, f'HTTP {e.code}: {msg}'
        except Exception as e:  # network hiccup
            time.sleep(4 * (attempt + 1))
            last = str(e)[:200]
    return name, variant, 'failed after retries'


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    only = set(sys.argv[1:])
    jobs = [(n, v, spec[0], spec[1], spec[3] if len(spec) > 3 else False)
            for n, spec in SOUNDS.items() if not only or n in only for v in range(1, spec[2] + 1)]
    with ThreadPoolExecutor(4) as pool:
        for name, variant, status in pool.map(lambda j: generate(*j), jobs):
            print(f'{name}_{variant:02d}: {status}')
