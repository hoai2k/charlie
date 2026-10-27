"""Export reviewed landscape-only track cards without touching race backgrounds."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib, json, sys

H = Path(__file__).resolve().parent
G = H.parents[2]
KEYS = json.loads((H / 'keys.json').read_text())

def build(keys):
    atlas = Image.open(G / 'assets/ui/track_cards.webp').convert('RGB')
    atlas_changed = False
    for key in keys:
        source = Image.open(H / f'sources/{key}.webp').convert('RGB')
        art = ImageOps.fit(source, (400, 225), Image.Resampling.LANCZOS)
        if key in KEYS[:5]:
            index = KEYS.index(key)
            atlas.paste(art, (index * 400, 0))
            atlas_changed = True
        else:
            art.save(G / f'assets/tracks/{key}/card.webp', quality=90, method=6)
    if atlas_changed:
        atlas.save(G / 'assets/ui/track_cards.webp', lossless=True, exact=True, method=6)
    for key in keys:
        if key in KEYS[:5]:
            path = G / 'assets/ui/track_cards.webp'
            index = KEYS.index(key)
            decoded = Image.open(path).crop((index*400, 0, index*400+400, 225)).convert('RGB')
        else:
            path = G / f'assets/tracks/{key}/card.webp'
            decoded = Image.open(path).convert('RGB')
        (H / f'reports/{key}.json').write_text(json.dumps({
            'path': str(path.relative_to(G)), 'size': [400, 225],
            'pixelSha256': hashlib.sha256(decoded.tobytes()).hexdigest()
        }, indent=2) + '\n')

def check():
    contact = Image.new('RGB', (1000, 5*132), '#fff4e2')
    draw = ImageDraw.Draw(contact)
    for i, key in enumerate(KEYS):
        report = H / f'reports/{key}.json'
        if not report.exists():
            continue
        d = json.loads(report.read_text())
        image = Image.open(G / d['path'])
        assert image.mode == 'RGB'
        if i < 5:
            assert image.size == (2000, 225)
            image = image.crop((i*400, 0, i*400+400, 225))
        assert image.size == (400, 225)
        assert hashlib.sha256(image.tobytes()).hexdigest() == d['pixelSha256']
        contact.paste(image.resize((200, 113), Image.Resampling.LANCZOS), (i%5*200, i//5*132))
        draw.text((i%5*200+5, i//5*132+114), key, fill='#24313b')
        print(key, 'opaque 400x225 and reviewed pixel hash passed')
    contact.crop((0, 0, 1000, 396)).save(H / 'reports/half-size-contact.webp', quality=90, method=6)

if __name__ == '__main__':
    if '--check' not in sys.argv:
        build(sys.argv[1:] or KEYS)
    check()
