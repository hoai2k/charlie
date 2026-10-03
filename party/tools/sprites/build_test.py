"""Regression checks for safe, incremental sprite intake.
Run: python3 party/tools/sprites/build_test.py
"""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw
import build


class BuildTests(unittest.TestCase):
    def test_landmark_edit_reuses_pixels_and_damage_is_repaired(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            image = Image.new('RGBA', (16, 24))
            ImageDraw.Draw(image).rectangle((2, 2, 13, 21), fill=(90, 120, 200, 255))
            image.save(base / 'source.webp')
            spec = {'bodyHeight': 20, 'frameSize': [30, 30], 'anchor': [15, 25],
                    'poses': {'idle': {'frames': [{'source': 'source.webp',
                        'anchor': [8, 22], 'head': [8, 4]}]}}}
            output = base / 'out'
            with patch.object(build, 'save_webp', wraps=build.save_webp) as encode, contextlib.redirect_stdout(io.StringIO()):
                build.build(spec, base, output)
                before = (output / 'idle-00.webp').read_bytes()
                spec['poses']['idle']['frames'][0]['head'] = [7, 3]
                build.build(spec, base, output)
                self.assertEqual(encode.call_count, 1)
                self.assertEqual((output / 'idle-00.webp').read_bytes(), before)
                manifest = json.loads((output / 'sprites.json').read_text())
                self.assertEqual(manifest['poses']['idle']['frames'][0]['head'], [5, 1])
                (output / 'idle-00.webp').write_bytes(b'broken')
                build.build(spec, base, output)
                self.assertEqual(encode.call_count, 2)
                with Image.open(output / 'idle-00.webp') as repaired:
                    self.assertEqual(repaired.size, (12, 20))
                spec['quality'] = 82
                build.build(spec, base, output)
                self.assertEqual(encode.call_count, 3)
                ImageDraw.Draw(image).rectangle((2, 2, 13, 21), fill=(200, 30, 40, 255))
                image.save(base / 'source.webp')
                build.build(spec, base, output)
                self.assertEqual(encode.call_count, 4)

    def test_failed_encoding_preserves_existing_frame(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'frame.webp'
            image = Image.new('RGBA', (12, 20), (90, 120, 200, 255))
            build.save_webp(image, path, 86)
            before = path.read_bytes()
            with patch.object(Image.Image, 'save', side_effect=OSError('encoding failed')):
                with self.assertRaises(OSError):
                    build.save_webp(image, path, 86)
            self.assertEqual(path.read_bytes(), before)
            self.assertEqual(list(Path(directory).iterdir()), [path])


if __name__ == '__main__':
    unittest.main()
