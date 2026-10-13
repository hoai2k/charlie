"""Physical sprite-size regressions. Run: python3 party/tools/sprites/optimize_test.py"""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image
import optimize


class OptimizeTests(unittest.TestCase):
    def test_invalid_frame_height_uses_runtime_pose_fallback(self):
        self.assertEqual(optimize.frame_scales({'bodyHeight': 400, 'poses': {
            'idle': {'bodyHeight': 320, 'frames': [{'src': 'idle.webp', 'bodyHeight': -1}]}}}),
            {'idle.webp': .75})

    def test_heterogeneous_height_precedence_preserves_raster_and_landmarks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, target = root / 'full', root / 'optimized'
            folder = source / 'fairy'
            folder.mkdir(parents=True)
            dimensions = {'compact.webp': (180, 240), 'pose.webp': (240, 320),
                          'legacy.webp': (300, 400), 'portrait.webp': (384, 384)}
            for name, size in dimensions.items():
                Image.new('RGBA', size, (120, 80, 210, 255)).save(folder / name, 'WEBP')
            manifest = {'bodyHeight': 400, 'anchor': [150, 400], 'poses': {
                'idle': {'bodyHeight': 320, 'frames': [
                    {'src': 'compact.webp', 'bodyHeight': 240, 'anchor': [90, 240],
                     'head': [90, 12], 'hand': [160, 100]}]},
                'walk': {'bodyHeight': 320, 'frames': [{'src': 'pose.webp', 'anchor': [120, 320]}]},
                'run': {'frames': [{'src': 'legacy.webp', 'anchor': [150, 400]}]},
                'fly': {'alias': 'idle'}}, 'portraits': {'neutral': 'portrait.webp'}}
            original = json.dumps(manifest).encode()
            (folder / 'sprites.json').write_bytes(original)
            with patch.object(optimize, 'SRC', source), patch.object(optimize, 'DST', target):
                info, count = optimize.build('fairy')
            self.assertEqual(count, 4)
            self.assertEqual(info['frameScales'], {'compact.webp': 1, 'pose.webp': .75, 'legacy.webp': .6})
            self.assertEqual((folder / 'sprites.json').read_bytes(), original)
            for name, expected in {'compact.webp': (180, 240), 'pose.webp': (180, 240),
                                   'legacy.webp': (180, 240), 'portrait.webp': (192, 192)}.items():
                with Image.open(target / 'fairy' / name) as image:
                    self.assertEqual(image.size, expected, name)
                    if name == 'portrait.webp':
                        continue
                    scale = info['frameScales'][name]
                    self.assertEqual(tuple(n / scale for n in image.size), dimensions[name],
                                     'Runtime original-size recovery must not move anchors')
            # An authored compact hand still attaches at the same display point,
            # even though the pose and set have larger physical height defaults.
            frame = manifest['poses']['idle']['frames'][0]
            display_scale = 300 / frame['bodyHeight']
            self.assertEqual([(frame['hand'][i] - frame['anchor'][i]) * display_scale
                              for i in range(2)], [87.5, -175])

    def test_uniform_compact_set_legacy_fallback_avoids_double_resize(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, target = root / 'full', root / 'optimized'
            folder = source / 'fairy'
            folder.mkdir(parents=True)
            Image.new('RGBA', (180, 240), (90, 120, 200, 255)).save(folder / 'idle.webp', 'WEBP')
            (folder / 'sprites.json').write_text(json.dumps({'bodyHeight': 300,
                'poses': {'idle': {'frames': [{'src': 'idle.webp', 'bodyHeight': 240}]}}}))
            with patch.object(optimize, 'SRC', source), patch.object(optimize, 'DST', target):
                info, _ = optimize.build('fairy')
            self.assertEqual(info['scale'], 1)
            self.assertEqual(info['frameScales']['idle.webp'], 1)
            with Image.open(target / 'fairy' / 'idle.webp') as image:
                self.assertEqual(image.size, (180, 240))


if __name__ == '__main__':
    unittest.main()
