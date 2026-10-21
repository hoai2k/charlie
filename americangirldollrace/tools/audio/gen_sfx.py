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

# key: (prompt, seconds, variants)
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
}


def key():
    with open(S + '/.elevenlabs_key') as f:
        return f.read().strip()


def generate(name, variant, prompt, seconds):
    dst = f'{RAW}/{name}_{variant:02d}.mp3'
    if os.path.exists(dst):
        return name, variant, 'cached'
    body = json.dumps({'text': prompt, 'duration_seconds': max(0.5, seconds), 'prompt_influence': 0.6}).encode()
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
    jobs = [(n, v, p, s) for n, (p, s, count) in SOUNDS.items() if not only or n in only for v in range(1, count + 1)]
    with ThreadPoolExecutor(4) as pool:
        for name, variant, status in pool.map(lambda j: generate(*j), jobs):
            print(f'{name}_{variant:02d}: {status}')
