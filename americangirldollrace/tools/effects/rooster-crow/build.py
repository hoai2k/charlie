"""Pack reviewed ImageGen roosters at one scale and a shared foot baseline."""
from pathlib import Path
from PIL import Image
import hashlib, json

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
source = Image.open(HERE / 'source.webp').convert('RGBA')
assert source.getchannel('A').getextrema()[0] == 0
cells = [source.crop((n * source.width // 3, 0, (n + 1) * source.width // 3, source.height)) for n in range(3)]
def bounds(im):
    return im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
boxes = [bounds(im) for im in cells]
for im, b in zip(cells, boxes):
    assert b and b[0] > 0 and b[1] > 0 and b[2] < im.width and b[3] < im.height, b
scale = min(200 / max(b[3]-b[1] for b in boxes), 230 / max(b[2]-b[0] for b in boxes))
sheet = Image.new('RGBA', (768, 256))
report = []
for n, (im, b) in enumerate(zip(cells, boxes)):
    art = im.crop(b).resize((round((b[2]-b[0])*scale), round((b[3]-b[1])*scale)), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (256, 256))
    frame.alpha_composite(art, ((256-art.width)//2, 250-bounds(art)[3]))
    sheet.paste(frame, (n*256, 0))
    fb = bounds(frame)
    assert fb[3] == 250 and fb[0] > 0 and fb[2] < 256
    report.append({'bounds': fb, 'height': fb[3]-fb[1]})
target = GAME / 'assets/rooster_crow_sprites.webp'
sheet.save(target, lossless=True, exact=True, method=6)
(HERE / 'report.json').write_text(json.dumps({'size': sheet.size, 'scale': scale, 'frames': report, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}, indent=2)+'\n')
review = Image.new('RGB', (768, 512))
for y, color in [(0, '#fff9ed'), (256, '#18233c')]:
    bg = Image.new('RGBA', sheet.size, color); bg.alpha_composite(sheet)
    review.paste(bg.convert('RGB'), (0, y))
review.save(HERE / 'alpha-review.webp', quality=90, method=6)
