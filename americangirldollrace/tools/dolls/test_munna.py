"""Munna's retained plush identity, sheet safety and attachment geometry."""
import hashlib
import json
import unittest
import numpy as np
from PIL import Image
import build

class MunnaTests(unittest.TestCase):
    def test_complete_sheets_preserve_natural_fur_and_transparent_margins(self):
        manifest=json.loads((build.HERE/'manifests/munna.json').read_text())
        self.assertTrue(manifest['hidden'] and manifest['verifyAllMoonBoots'])
        self.assertEqual(manifest['outfitData']['outfits'],[])
        self.assertEqual(manifest['mask']['mode'],'no-clothing')
        build.check(manifest)
        for kind,rows in [('sprites',4),('toys',4),('actions',3),('ledge',1)]:
            p=build.GAME/f'assets/doll_munna_{kind}.webp';im=Image.open(p).convert('RGBA')
            mask=Image.open(build.GAME/f'assets/masks/munna_{"sheet" if kind=="sprites" else kind}_mask.webp')
            self.assertEqual(im.size,(1254,rows*418));self.assertEqual(mask.size,im.size)
            self.assertEqual(np.array(mask)[:,:,:3].max(),0)
            for n in range(rows*3):
                c=im.crop((n%3*418,n//3*418,(n%3+1)*418,(n//3+1)*418));x0,y0,x1,y1=build.bounds(c)
                self.assertTrue(x0>=4 and y0>=4 and x1<=414 and y1<=414,(kind,n))
            if kind!='sprites':
                data=json.loads((build.HERE/f'munna/reports/{kind}.json').read_text())
                self.assertEqual(data['sha256'],hashlib.sha256(p.read_bytes()).hexdigest())
                self.assertEqual(len(data['frames']),rows*3)

    def test_explicit_paws_touch_the_plush(self):
        m=json.loads((build.HERE/'manifests/munna.json').read_text())
        for name,kind,n in [('stand','sprites',10),('ride','sprites',9),('skate','toys',4),('pogo','toys',10)]:
            x,y=m['throwHandsFrame'][name];a=np.array(Image.open(build.GAME/f'assets/doll_munna_{kind}.webp').convert('RGBA'))[:,:,3]
            x=round(x)+n%3*418;y=round(y)+n//3*418
            self.assertGreater(a[y-3:y+4,x-3:x+4].max(),128,name)
        report=json.loads((build.HERE/'reports/munna.json').read_text())
        anchors=json.loads((build.HERE/'munna/reports/anchors.json').read_text())
        for row in range(2):
            for col in range(3):
                name=f'{"idle" if row==0 else "run"}-{col}';f=report['frames'][name];source=m['broomHandsSource'][row][col]
                expected=[round(f['anchor'][i]+(source[i]-f['sourceAnchor'][i])*f['scale'],2) for i in [0,1]]
                self.assertEqual(anchors['broom'][row][col],expected)

    def test_saddle_throw_meets_the_same_measured_seat_as_the_rider(self):
        import importlib.util
        p=build.HERE/'cornsilk/build.py';spec=importlib.util.spec_from_file_location('plush',p);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        im=module.C.cells('munna','actions',3)[6]
        calibration=json.loads((build.HERE/'munna/calibration.json').read_text())
        meta=json.loads((build.HERE/'munna/reports/actions.json').read_text())['frames'][6]
        source=module.source_point(im,calibration['actionSeat'])
        packed=[meta['anchorX']-16+(source[0]-meta['sourceAnchor'][0])*meta['packedScale'],409+(source[1]-meta['sourceAnchor'][1])*meta['packedScale']]
        seat=json.loads((build.HERE/'reports/munna.json').read_text())['frames']['ride']['seat']
        actual=[225+meta['offsetX']+(packed[0]-meta['anchorX'])*meta['scale'],meta['targetY']+(packed[1]-meta['baseline'])*meta['scale']]
        for i in [0,1]:self.assertAlmostEqual(actual[i],seat[i],places=2)

    def test_toy_groups_match_shared_standing_height_targets(self):
        import importlib.util
        spec=importlib.util.spec_from_file_location('hidden',build.HERE/'hidden/build.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        im=Image.open(build.GAME/'assets/doll_munna_toys.webp').convert('RGBA')
        records=json.loads((build.HERE/'munna/reports/toys.json').read_text())['frames']
        for group,(lo,hi) in enumerate([(0,6),(6,12)]):
            heights=[]
            for n in range(lo,hi):
                cell=im.crop((n%3*418,n//3*418,(n%3+1)*418,(n//3+1)*418))
                heights.append(module.alpha_height(cell)*records[n]['scale']/390)
            self.assertAlmostEqual(float(np.median(heights)),module.TOY_HEIGHT_TO_STANDING[group],places=6)

if __name__=='__main__':unittest.main()
