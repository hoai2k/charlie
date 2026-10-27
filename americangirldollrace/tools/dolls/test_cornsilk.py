"""Cornsilk's plush identity, complete sprite delivery and measured anchors."""
import hashlib
import json
import unittest
import numpy as np
from PIL import Image
import build

class CornsilkTests(unittest.TestCase):
    def test_uses_original_approved_concept_without_clothing_recolours(self):
        root=build.HERE/'sources/cornsilk'
        self.assertEqual((root/'canonical.webp').read_bytes(),(root/'canonical-candidate-v1.webp').read_bytes())
        self.manifest=json.loads((build.HERE/'manifests/cornsilk.json').read_text())
        self.assertTrue(self.manifest['hidden'] and self.manifest['verifyAllMoonBoots'])
        self.assertEqual(self.manifest['outfitData']['outfits'],[])
        build.check(self.manifest)

    def test_complete_alpha_sheets_and_anatomical_calibration(self):
        for kind,rows in [('sprites',4),('toys',4),('actions',3),('ledge',1)]:
            path=build.GAME/f'assets/doll_cornsilk_{kind}.webp'
            art=Image.open(path).convert('RGBA')
            mask=Image.open(build.GAME/f'assets/masks/cornsilk_{"sheet" if kind=="sprites" else kind}_mask.webp')
            self.assertEqual(art.size,(1254,418*rows))
            self.assertEqual(art.size,mask.size)
            self.assertEqual(np.array(mask)[:,:,:3].max(),0)
            for n in range(rows*3):
                cell=art.crop((n%3*418,n//3*418,(n%3+1)*418,(n//3+1)*418))
                x0,y0,x1,y1=build.bounds(cell)
                self.assertTrue(x0>=4 and y0>=4 and x1<=414 and y1<=414,(kind,n))
            if kind=='sprites':continue
            data=json.loads((build.HERE/f'cornsilk/reports/{kind}.json').read_text())
            self.assertEqual(len(data['frames']),rows*3)
            self.assertEqual(data['sha256'],hashlib.sha256(path.read_bytes()).hexdigest())
            desired=[]
            for i,f in enumerate(data['frames']):
                desired.append(f['packedScale']*f['renderScale'])
                self.assertGreaterEqual(f['renderScale'],1)
                if f['wandTip']:
                    x,y=f['wandTip'];r,g,b,a=art.getpixel((i%3*418+x,i//3*418+y))
                    self.assertTrue(a>128 and r>g and b<g*.7 and x>280,(i,f['wandTip']))
            self.assertAlmostEqual(min(desired),max(desired))

    def test_paw_anchors_touch_the_plush_and_survive_shared_measurement(self):
        manifest=json.loads((build.HERE/'manifests/cornsilk.json').read_text())
        for name,kind,index in [('stand','sprites',10),('ride','sprites',9),('skate','toys',4),('pogo','toys',10)]:
            x,y=manifest['throwHandsFrame'][name]
            im=Image.open(build.GAME/f'assets/doll_cornsilk_{kind}.webp').convert('RGBA')
            alpha=np.array(im)[:,:,3];xx=int(round(x))+index%3*418;yy=int(round(y))+index//3*418
            self.assertGreater(alpha[max(0,yy-3):yy+4,max(0,xx-3):xx+4].max(),128,name)
        # Independently compute one source paw's packed coordinates.
        m=manifest['poses']['idle-0'];im,_=build.source_frame(manifest,'idle-0');bb=build.bounds(im)
        source=manifest['broomHandsSource'][0][0];scale=390/(bb[3]-bb[1])
        expected=[round(209+(source[0]-m['hipX'])*scale,2),round(409+(source[1]-bb[3])*scale,2)]
        actual=json.loads((build.HERE/'cornsilk/reports/anchors.json').read_text())['broom'][0][0]
        self.assertEqual(actual,expected)

    def test_no_clothing_mask_protects_entire_plush_and_props(self):
        im=Image.new('RGBA',(12,12),(220,190,140,255))
        mask=np.array(build.clothing_mask(im,{},'no-clothing'))
        self.assertEqual(mask[:,:,:3].max(),0)
        self.assertEqual(mask[:,:,3].min(),255)

if __name__=='__main__':unittest.main()
