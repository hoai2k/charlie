"""Zoey's complete art and attachment contract, independent of ImageGen."""
import json
import unittest
import numpy as np
from PIL import Image
import build


class ZoeyTests(unittest.TestCase):
    def test_complete_sheets_masks_and_anchor_safety(self):
        for kind, rows in [('sprites',4),('toys',4),('actions',3),('ledge',1)]:
            art=Image.open(build.GAME/f'assets/doll_zoey_{kind}.webp').convert('RGBA')
            name='sheet' if kind=='sprites' else kind
            mask=Image.open(build.GAME/f'assets/masks/zoey_{name}_mask.webp').copy()
            self.assertEqual(art.size,(1254,418*rows))
            self.assertEqual(mask.size,art.size)
            self.assertEqual(art.getchannel('A').getextrema()[0],0)
            for i in range(rows*3):
                c=art.crop((i%3*418,i//3*418,(i%3+1)*418,(i//3+1)*418))
                x0,y0,x1,y1=build.bounds(c)
                self.assertTrue(x0>=4 and y0>=4 and x1<=414 and y1<=414,(kind,i))
            if kind!='sprites':
                data=json.loads((build.HERE/f'zoey/reports/{kind}.json').read_text())
                self.assertEqual(len(data['frames']),rows*3)
                for i,f in enumerate(data['frames']):
                    self.assertGreaterEqual(f['scale'],1)
                    if f['wandTip']:
                        x,y=f['wandTip'];c=art.crop((i%3*418,i//3*418,(i%3+1)*418,(i//3+1)*418))
                        r,g,b,a=c.getpixel((x,y))
                        self.assertTrue(a>128 and r>g and g>b,(i,f['wandTip']))

    def test_teal_top_gate_protects_skin_navy_yellow_and_black(self):
        values=[[35,180,190,255],[225,165,115,255],[25,35,65,255],
                [240,205,25,255],[20,20,20,255],[240,240,240,255]]
        pixels=Image.fromarray(np.array([values,values,values],dtype=np.uint8))
        spec={'chin':1,'garmentBottom':2}
        mask=np.array(build.clothing_mask(pixels,spec,'teal-top'))[:,:,0]
        self.assertEqual(mask[0].max(),0)
        self.assertEqual(mask[1].tolist(),[255,0,0,0,0,0])
        self.assertEqual(mask[2].max(),0)

    def test_ledge_has_explicit_contact_and_restores_anatomical_scale(self):
        data=json.loads((build.HERE/'zoey/reports/ledge.json').read_text())
        for f in data['frames']:
            self.assertEqual(f['corner'],[300,230])
            self.assertAlmostEqual(f['packedScale']*f['scale'],390/710,places=6)


if __name__=='__main__':unittest.main()
