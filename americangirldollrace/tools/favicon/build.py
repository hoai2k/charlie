"""Build the app icon from the pony's first idle frame (no new artwork)."""
from pathlib import Path
from PIL import Image

GAME = Path(__file__).resolve().parents[2]
pony = Image.open(GAME / 'assets/pony_sprites.webp').convert('RGBA').crop((0, 0, 418, 418))
pony = pony.crop(pony.getchannel('A').getbbox())
scale = 464 / max(pony.size)
pony = pony.resize(tuple(round(size * scale) for size in pony.size), Image.Resampling.LANCZOS)
icon = Image.new('RGBA', (512, 512))
icon.alpha_composite(pony, ((512 - pony.width) // 2, (512 - pony.height) // 2))
icon.save(GAME / 'favicon.png', optimize=True)
