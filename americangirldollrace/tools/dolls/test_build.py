"""Contract tests for the new-doll exporter, independent of image generation."""
import json
import unittest
from pathlib import Path

import numpy as np
from PIL import Image
import build


class DollBuildTests(unittest.TestCase):
    def test_new_doll_broom_grips_match_source_hand_calibration(self):
        broom=json.loads((build.HERE.parent/'mounts/broom.json').read_text())
        for key in ['claudia','cinnamon','felicity','barbie']:
            m=json.loads((build.HERE/f'manifests/{key}.json').read_text())
            ref,_=build.source_frame(m,'idle-0');b=build.bounds(ref)
            common=m['standingHeight']/(b[3]-b[1])
            actual=broom['carryHands'][m.get('assetKey',key)]
            for row,kind in enumerate(['idle','run']):
                for col,(x,y) in enumerate(m['broomHandsSource'][row]):
                    pose=f'{kind}-{col}';src,spec=build.source_frame(m,pose)
                    scale=common*spec.get('scale',1)
                    expected=[round(spec.get('target',[209,409])[0]+(x-m['poses'][pose]['hipX'])*scale),
                              round(build.BASELINE+(y-build.bounds(src)[3])*scale)]
                    self.assertEqual(actual[row][col],expected,(key,pose))

    def test_denim_mask_excludes_warm_colours_white_blouse_and_dark_boot_soles(self):
        pixels = np.array([[[50, 65, 95, 255], [225,165,115,255],
                            [240,240,235,255], [235,135,165,255], [12,18,35,255]]], dtype=np.uint8)
        mask = build.clothing_mask(Image.fromarray(pixels), {'chin':0,'garmentBottom':1}, 'denim-blue')
        self.assertEqual(np.asarray(mask)[0,:,0].tolist(), [255,0,0,0,0])

    def test_chevron_mask_keeps_white_stripes_face_and_raised_shoe_fixed(self):
        pixels = np.array([[[65,65,65,255]]*4,
                           [[65,65,65,255],[240,240,240,255],[225,165,115,255],[65,65,65,255]]],dtype=np.uint8)
        spec={'chin':1,'garmentBottom':2,'protectedRegions':[[3,1,4,2]]}
        mask=np.asarray(build.clothing_mask(Image.fromarray(pixels),spec,'chevron-outfit'))[:,:,0]
        self.assertEqual(mask[0].max(),0)
        self.assertEqual(mask[1].tolist(),[255,0,0,0])

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

    def test_gold_jacket_mask_preserves_rumi_face_braid_shirt_and_skirt(self):
        gold = [245, 190, 35, 255]
        pixels = np.array([[gold]*5, [gold, [225,165,115,255], [145,65,195,255],
                            [240,240,240,255], [35,40,70,255]], [gold]*5], dtype=np.uint8)
        spec = {'chin': 1, 'garmentBottom': 2}
        mask = np.asarray(build.clothing_mask(Image.fromarray(pixels), spec, 'gold-jacket'))[:, :, 0]
        self.assertEqual(mask[0].max(), 0)
        self.assertEqual(mask[1].tolist(), [255, 0, 0, 0, 0])
        self.assertEqual(mask[2].max(), 0)

    def test_gap_split_keeps_an_off_grid_foot_whole(self):
        im = Image.new('RGBA', (300, 100))
        im.paste((100, 100, 100, 255), (10, 10, 108, 90))
        im.paste((100, 100, 100, 255), (125, 10, 185, 90))
        im.paste((100, 100, 100, 255), (215, 10, 290, 90))
        boxes = build.split_strip(im)
        self.assertGreater(boxes[0][2], 108)
        self.assertEqual(build.bounds(im.crop(boxes[0]))[2], 108)
        self.assertLess(boxes[1][0], 125)

    def test_pink_cardigan_mask_preserves_glasses_skin_hair_skirt_and_socks(self):
        pink, skin, blonde, blue = [210, 130, 160, 255], [225, 165, 115, 255], [220, 190, 130, 255], [70, 120, 180, 255]
        pixels = np.array([[pink, pink, pink, pink],
                           [pink, skin, blonde, blue],
                           [pink, pink, pink, pink]], dtype=np.uint8)
        spec = {'chin': 1, 'garmentBottom': 2, 'protectedRegions': [[0, 1, 1, 2]]}
        mask = np.asarray(build.clothing_mask(Image.fromarray(pixels), spec, 'pink-cardigan'))[:, :, 0]
        self.assertEqual(mask[0].max(), 0, 'Pink glasses are above the chin')
        self.assertEqual(mask[1].tolist(), [0, 0, 0, 0])
        self.assertEqual(mask[2].max(), 0, 'Pink sock stripes stay fixed')
        spec.pop('protectedRegions')
        self.assertEqual(np.asarray(build.clothing_mask(Image.fromarray(pixels), spec, 'pink-cardigan'))[1, 0, 0], 255)

    def test_luna_face_and_socks_remain_outside_exported_outfit_masks(self):
        manifest = json.loads((build.HERE/'manifests/luna.json').read_text())
        for pose in build.POSES + ['wave', 'cheer']:
            src, spec = build.source_frame(manifest, pose)
            mask = np.asarray(build.clothing_mask(src, spec, 'pink-cardigan'))[:, :, 0]
            # Glasses span the face; raised-sleeve exceptions sit outside it.
            head_x = spec['hipX']
            self.assertEqual(mask[:round(spec['chin'])-45, max(0, head_x-65):head_x+65].max(), 0, pose)
            self.assertEqual(mask[spec['garmentBottom']:].max(), 0, pose)

    def test_shipped_assets_and_grounded_poses(self):
        for p in (build.HERE/'manifests').glob('*.json'):
            if p.name.startswith('._'):
                continue
            manifest = json.loads(p.read_text())
            build.check(manifest)
            key = manifest['key']
            asset_key = manifest.get('assetKey', key)
            for kind in ['sheet', 'portrait', 'wave', 'cheer', 'ride']:
                asset = (build.GAME/f'assets/doll_{asset_key}_sprites.webp' if kind == 'sheet' else
                         build.GAME/f"assets/portraits/{asset_key}{'' if kind == 'portrait' else '_'+kind}.webp")
                mask = build.GAME/f'assets/masks/{asset_key}_{kind}_mask.webp'
                with Image.open(asset) as a, Image.open(mask) as b:
                    self.assertEqual(a.size, b.size)
            report = json.loads((build.HERE/f'reports/{key}.json').read_text())
            common = report['frames']['idle-0']['scale']
            for pose in ['idle-1', 'idle-2', 'run-0', 'run-1', 'run-2', 'jump-0', 'jump-1', 'jump-2', 'wave', 'cheer', 'ride']:
                self.assertEqual(report['frames'][pose]['scale'], common * manifest['poses'][pose].get('scale', 1), pose)
            for pose in build.POSES + ['wave', 'cheer']:
                src, _ = build.source_frame(manifest, pose)
                x0,y0,x1,y1 = build.bounds(src)
                self.assertTrue(x0 > 0 and y0 > 0 and x1 < src.width and y1 < src.height, pose)

    def test_riding_anchor_matches_renderer_in_both_directions(self):
        for path in (build.HERE/'reports').glob('*.json'):
            if path.name.startswith('._'):
                continue
            report = json.loads(path.read_text())
            runtime = report['runtime']
            ride = report['frames']['ride']
            seat_x, seat_y = ride.get('seat', ride['anchor'])
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
