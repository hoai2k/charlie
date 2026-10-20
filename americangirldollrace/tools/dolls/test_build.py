"""Contract tests for the new-doll exporter, independent of image generation."""
import json
import unittest
from pathlib import Path

import numpy as np
from PIL import Image
import build


class DollBuildTests(unittest.TestCase):
    def test_clipping_fails_instead_of_changing_body_scale(self):
        im = Image.new('RGBA', (100, 100), '#bbb')
        mask = Image.new('RGBA', im.size, (255, 0, 0, 255))
        with self.assertRaisesRegex(ValueError, 'Clipping'):
            build.place(im, mask, {'hipX': 50}, 5)

    def test_crouch_keeps_anatomical_scale_and_foot_baseline(self):
        im = Image.new('RGBA', (100, 100))
        im.paste((120, 120, 120, 255), (20, 30, 80, 90))
        mask = Image.new('RGBA', im.size, (255, 0, 0, 255))
        frame, _, report = build.place(im, mask, {'hipX': 50}, 2)
        self.assertEqual(report['scale'], 2)
        self.assertEqual(build.bounds(frame)[3], build.BASELINE)
        self.assertEqual(build.bounds(frame)[3] - build.bounds(frame)[1], 120)

    def test_neutral_mask_protects_face_skin_hair_and_white_collar(self):
        pixels = np.array([[[80, 80, 80, 255], [180, 105, 55, 255],
                            [225, 165, 115, 255], [240, 240, 240, 255]],
                           [[80, 80, 80, 255], [180, 105, 55, 255],
                            [225, 165, 115, 255], [240, 240, 240, 255]]], dtype=np.uint8)
        mask = np.asarray(build.neutral_mask(Image.fromarray(pixels), 1))[:, :, 0]
        self.assertEqual(mask[0].max(), 0)
        self.assertEqual(mask[1].tolist(), [255, 0, 0, 0])

    def test_shipped_assets_and_grounded_poses(self):
        for p in (build.HERE/'manifests').glob('*.json'):
            if p.name.startswith('._'):
                continue
            manifest = json.loads(p.read_text())
            build.check(manifest)
            key = manifest['key']
            for kind in ['sheet', 'portrait', 'wave', 'cheer', 'ride']:
                asset = (build.GAME/f'assets/doll_{key}_sprites.webp' if kind == 'sheet' else
                         build.GAME/f"assets/portraits/{key}{'' if kind == 'portrait' else '_'+kind}.webp")
                mask = build.GAME/f'assets/masks/{key}_{kind}_mask.webp'
                with Image.open(asset) as a, Image.open(mask) as b:
                    self.assertEqual(a.size, b.size)
            report = json.loads((build.HERE/f'reports/{key}.json').read_text())
            common = report['frames']['idle-0']['scale']
            for pose in ['idle-1', 'idle-2', 'run-0', 'run-1', 'run-2', 'jump-0', 'jump-1', 'jump-2', 'wave', 'cheer', 'ride']:
                self.assertEqual(report['frames'][pose]['scale'], common, pose)
            for pose in build.POSES + ['wave', 'cheer']:
                src, _ = build.source_frame(manifest, pose)
                x0,y0,x1,y1 = build.bounds(src)
                self.assertTrue(x0 > 0 and y0 > 0 and x1 < src.width and y1 < src.height, pose)

    def test_riding_anchor_matches_renderer_in_both_directions(self):
        report = json.loads((build.HERE/'reports/hermione.json').read_text())
        runtime = report['runtime']
        seat_x, seat_y = report['frames']['ride']['anchor']
        # Actual game.js mounted drawing equations, sampled across the seat shifts
        # used by the horse, unicorn and pegasus animation calibrations.
        for seat_dx, seat_dy in [(0,0), (3,-10), (-35,30), (10,100)]:
            for facing in [-1, 1]:
                rider_x = -209*.7 + 9 + runtime['riderXOffset'] + seat_dx + seat_x*.7
                rider_y = -60 + runtime['riderYOffset'] + seat_dy + seat_y*.7
                self.assertAlmostEqual(rider_x*facing, ((225-209)*1.08+seat_dx)*facing, places=2)
                self.assertAlmostEqual(rider_y, 228.67*1.08+seat_dy, places=2)


if __name__ == '__main__':
    unittest.main()
