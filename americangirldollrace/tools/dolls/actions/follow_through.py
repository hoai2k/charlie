"""Apply reviewed forward-wand edits without changing the other eight cells."""
from pathlib import Path
from PIL import Image
import hashlib, json

H = Path(__file__).resolve().parent
G = H.parents[2]

def apply(key, mask_fn):
    source = H / 'follow-through' / f'{key}-source.webp'
    if not source.exists():
        return
    folder = source.parent
    sheet_path = G / f'assets/doll_{key}_actions.webp'
    mask_path = G / f'assets/masks/{key}_actions_mask.webp'
    for name, path in [('sheet', sheet_path), ('mask', mask_path)]:
        before = folder / f'{key}-{name}-before.webp'
        if not before.exists():
            before.write_bytes(path.read_bytes())
    sheet = Image.open(sheet_path).convert('RGBA')
    masks = Image.open(mask_path).convert('RGB')
    old_sheet, old_masks = sheet.copy(), masks.copy()
    art = Image.open(source).convert('RGBA').resize((418, 418), Image.Resampling.LANCZOS)
    art.putalpha(art.getchannel('A').point(lambda a: 0 if a < 4 else a))
    bounds = art.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    dy = 409 - bounds[3]
    frame = Image.new('RGBA', (418, 418))
    frame.alpha_composite(art, (0, dy))
    mask = mask_fn(frame, key, 2)
    # The painted star, rather than the decorative swish's extreme, emits spells.
    tip = {'kaya': [360, 202 + dy], 'barbie': [362, 174 + dy], 'cinnamon': [390, 220 + dy]}[key]
    assert frame.getpixel(tuple(tip))[3] > 128
    # Keep all forward wand hardware and its short swish out of clothing recolours.
    mask.paste((0, 0, 0), (300, 0, 418, 320))
    sheet.paste(frame, (836, 0)); masks.paste(mask, (836, 0))
    sheet.save(sheet_path, lossless=True, exact=True, method=6)
    masks.save(mask_path, lossless=True, exact=True, method=6)
    unchanged = {}
    for n in range(9):
        if n == 2:
            continue
        box = (n % 3 * 418, n // 3 * 418, n % 3 * 418 + 418, n // 3 * 418 + 418)
        for name, before, after in [('art', old_sheet, Image.open(sheet_path).convert('RGBA')), ('mask', old_masks, Image.open(mask_path).convert('RGB'))]:
            assert before.crop(box).tobytes() == after.crop(box).tobytes()
            unchanged[f'{name}-{n}'] = hashlib.sha256(after.crop(box).tobytes()).hexdigest()
    report_path = H / 'reports' / f'{key}.json'
    report = json.loads(report_path.read_text())
    report['frames'][2].update(anchorX=225, bounds=list(frame.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()), wandTip=tip)
    report['sha256'] = hashlib.sha256(sheet_path.read_bytes()).hexdigest()
    report['maskSha256'] = hashlib.sha256(mask_path.read_bytes()).hexdigest()
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    (folder / f'{key}-verification.json').write_text(json.dumps({'dy': dy, 'wandTip': tip, 'unchanged': unchanged}, indent=2) + '\n')

if __name__ == '__main__':
    from build import mask
    for key in ['kaya', 'barbie', 'cinnamon']:
        apply(key, mask)
