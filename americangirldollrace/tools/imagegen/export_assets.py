"""Export built-in ImageGen sources using the requested game asset contracts.

Run with a local manifest that includes source PNG paths; committed manifests
record prompts and reference assets without machine-specific paths.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
LANCZOS = Image.Resampling.LANCZOS

def bounds(image):
    return image.getchannel('A').point(lambda p: 255 if p > 32 else 0).getbbox()

def export(asset):
    target = ROOT / asset['file']
    if target.exists():
        raise FileExistsError(target)
    size = (asset['w'], asset['h'])
    image = Image.open(asset['source']).convert('RGBA') if asset.get('source') else None
    name = target.stem
    if asset.get('components'):
        out = Image.new('RGBA', size)
        for i, component in enumerate(asset['components']):
            cell = Image.open(component['source']).convert('RGBA')
            out.paste(ImageOps.fit(cell, (400,225), method=LANCZOS), (i*400,0))
    elif asset.get('cells'):
        # Repack equal source cells so each final atlas cell has exact dimensions.
        n = asset['cells']
        cell_w = size[0] // n
        out = Image.new('RGBA', size)
        for i in range(n):
            cell = image.crop((round(i*image.width/n), 0,
                               round((i+1)*image.width/n), image.height))
            if asset['alpha']:
                box = bounds(cell)
                if box:
                    cell = cell.crop(box)
                cell.thumbnail((cell_w-8, size[1]-8), LANCZOS)
                out.alpha_composite(cell, (i*cell_w+(cell_w-cell.width)//2,
                                            (size[1]-cell.height)//2))
            else:
                out.paste(ImageOps.fit(cell, (cell_w, size[1]), method=LANCZOS),
                          (i*cell_w, 0))
    elif name.endswith(('_cheer', '_wave', '_ride')):
        key = name.rsplit('_', 1)[0]
        idle = Image.open(ROOT/f'assets/doll_{key}_sprites.webp').convert('RGBA').crop((0,0,418,418))
        idle_box = bounds(idle)
        sprite = image.crop(bounds(image))
        sprite.thumbnail((394, idle_box[3]-idle_box[1]), LANCZOS)
        out = Image.new('RGBA', size)
        out.alpha_composite(sprite, ((418-sprite.width)//2, idle_box[3]-sprite.height))
        asset['foot_baseline'] = idle_box[3]-1
    elif asset['alpha']:
        if name in ('title_hills', 'title_clouds'):
            # Reflected extension makes both wrap edges identical, including alpha.
            half = image.resize((size[0]//2, size[1]), LANCZOS)
            out = Image.new('RGBA', size)
            out.paste(half, (0,0))
            out.paste(ImageOps.mirror(half), (size[0]//2,0))
            asset['tile_mode'] = 'reflected horizontal extension'
        else:
            sprite = image.crop(bounds(image))
            sprite.thumbnail(size, LANCZOS)
            out = Image.new('RGBA', size)
            out.alpha_composite(sprite, ((size[0]-sprite.width)//2, (size[1]-sprite.height)//2))
    else:
        out = ImageOps.fit(image, size, method=LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    if asset['alpha']:
        out.save(target, 'WEBP', lossless=True, quality=88, method=6)
    else:
        out.convert('RGB').save(target, 'WEBP', quality=88, method=6)
    check = Image.open(target)
    assert check.size == size
    if asset['alpha']:
        assert check.mode == 'RGBA' and check.getchannel('A').getextrema() == (0,255)
    asset['bytes'] = target.stat().st_size
    print(asset['file'], size, asset['bytes'])

if __name__ == '__main__':
    manifest = json.loads(Path(sys.argv[1]).read_text())
    for asset in manifest['assets']:
        if (asset.get('source') or asset.get('components')) and not (ROOT/asset['file']).exists():
            export(asset)
    Path(sys.argv[1]).write_text(json.dumps(manifest, indent=2)+'\n')
