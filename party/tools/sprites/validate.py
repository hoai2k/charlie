#!/usr/bin/env python3
"""Validate sprite manifests, real alpha, rectangles, paths, timings and budgets.

python3 party/tools/sprites/validate.py [--strict-tier1] [--root PATH]
No dependency beyond Pillow. Exits nonzero on corrupt or incomplete references.
"""
import argparse
import json
from pathlib import Path
from PIL import Image

TIER1 = ('idle', 'walk', 'run', 'jump', 'fall', 'land', 'celebrate', 'cheer', 'pout', 'sad', 'hurt', 'dizzy', 'surprised', 'think', 'wave', 'ready')
EXPRESSIONS = ('neutral', 'happy', 'sad', 'surprised', 'determined')


def validate(root, strict=False):
    errors, warnings = [], []
    def error(text): errors.append(text)
    index_path = root / 'index.json'
    if not index_path.exists():
        return [f'Missing {index_path}'], warnings
    index = json.loads(index_path.read_text())
    sets = index.get('sets', [])
    if len(sets) != len(set(sets)):
        error('Duplicate index sets')
    total_bytes = 0
    for asset in sets:
        folder = root / asset
        label = asset + ': '
        if not folder.is_relative_to(root) or not (folder / 'sprites.json').exists():
            error(label + 'missing/invalid set path'); continue
        m = json.loads((folder / 'sprites.json').read_text())
        if not isinstance(m.get('bodyHeight'), (int, float)) or m['bodyHeight'] <= 0:
            error(label + 'invalid bodyHeight')
        poses = m.get('poses', {})
        image_cache = {}
        def image(file):
            if not file or (folder / file).resolve().parent != folder.resolve():
                error(label + f'invalid image path {file}'); return None
            if file not in image_cache:
                try:
                    im = Image.open(folder / file).convert('RGBA')
                    image_cache[file] = im
                    if max(im.size) > 2048: error(label + f'{file} exceeds 2048px decode limit')
                    alpha = im.getchannel('A')
                    if alpha.getextrema()[0] == 255: error(label + f'{file} has no transparency')
                    if not alpha.getbbox(): error(label + f'{file} is empty')
                except (OSError, ValueError) as exc:
                    error(label + str(exc)); image_cache[file] = None
            return image_cache[file]
        def resolve(name, visited=None):
            visited = set() if visited is None else visited
            if name not in poses or name in visited: return None
            visited.add(name)
            pose = poses[name]
            alias = pose if isinstance(pose, str) else pose.get('alias')
            return resolve(alias, visited) if alias else pose
        nframes = 0
        for name, definition in poses.items():
            if not resolve(name): error(label + f'{name} unresolved alias/cycle'); continue
            if isinstance(definition, str) or 'alias' in definition: continue
            if definition.get('fps', 8) <= 0: error(label + f'{name} fps must be positive')
            if not 0 <= definition.get('motion', .25) <= 1: error(label + f'{name} motion outside 0..1')
            if not definition.get('frames'): error(label + f'{name} empty frames')
            for entry in definition.get('frames', []):
                nframes += 1
                frame = {'src': entry} if isinstance(entry, str) else {'rect': entry} if isinstance(entry, list) else entry
                im = image(frame.get('src', m.get('atlas')))
                anchor = frame.get('anchor', definition.get('anchor', m.get('anchor')))
                if not isinstance(anchor, list) or len(anchor) != 2 or not all(isinstance(v, (float, int)) for v in anchor):
                    error(label + f'{name} invalid anchor')
                if frame.get('dur', 1) <= 0: error(label + f'{name} duration must be positive')
                rect = frame.get('rect')
                if rect and im:
                    if len(rect) != 4 or min(rect[:2]) < 0 or min(rect[2:]) <= 0 or rect[0] + rect[2] > im.width or rect[1] + rect[3] > im.height:
                        error(label + f'{name} rect outside {frame.get("src", m.get("atlas"))}')
        for file in m.get('portraits', {}).values(): image(file)
        missing = [p for p in TIER1 if not resolve(p)]
        portraits = [e for e in EXPRESSIONS if e not in m.get('portraits', {})]
        if missing or portraits:
            text = label + f'missing Tier-1={missing}, portraits={portraits}'
            (errors if strict else warnings).append(text)
        size = sum((folder / name).stat().st_size for name in image_cache if (folder / name).exists())
        total_bytes += size
        if size > 1.5 * 1024**2: warnings.append(label + 'exceeds 1.5 MiB member budget')
        decoded = sum(im.width * im.height * 4 for im in image_cache.values() if im)
        if decoded > 25 * 1024**2: error(label + 'exceeds 25 MiB decoded member budget')
        print(f'{asset}: {len(poses)} poses, {nframes} real frames, {len(m.get("portraits", {}))} portraits; {size / 1024:.0f} KiB, decode {decoded / 1024**2:.1f} MiB')
    # Round 3 loads sets on demand. The original all-at-boot download target
    # remains useful information, but cannot reject an expanded lazy roster.
    if total_bytes > 25 * 1024**2: warnings.append('Total sprite images exceed the original 25 MiB download target (sets load on demand)')
    print(f'{len(sets)} sets; {total_bytes / 1024**2:.2f} MiB total')
    return errors, warnings


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2] / 'assets' / 'sprites')
    parser.add_argument('--strict-tier1', action='store_true')
    args = parser.parse_args()
    errors, warnings = validate(args.root.resolve(), args.strict_tier1)
    # Optimized copies (tools/sprites/optimize.py) must exist and be current.
    try:
        import optimize
        opt_idx = optimize.DST / 'index.json'
        opt = json.loads(opt_idx.read_text()).get('sets', {}) if opt_idx.exists() else {}
        for asset in json.loads((args.root / 'index.json').read_text()).get('sets', []):
            info = opt.get(asset)
            if not info:
                warnings.append(f'{asset}: no optimized copy - run tools/sprites/optimize.py {asset}')
            elif info.get('source') != optimize.fingerprint(asset):
                warnings.append(f'{asset}: optimized copy is stale - run tools/sprites/optimize.py {asset}')
    except Exception as e:  # never block validation on this check
        warnings.append(f'optimized-copy check skipped: {e}')
    for message in warnings: print('WARN:', message)
    for message in errors: print('ERROR:', message)
    raise SystemExit(bool(errors))
