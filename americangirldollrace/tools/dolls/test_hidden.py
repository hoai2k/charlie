"""Hidden characters' retained art, masks, and attachment contract."""
import hashlib
import json
import unittest
import numpy as np
from PIL import Image
import build

class HiddenCharacterTests(unittest.TestCase):
    def test_complete_transparent_sheets_and_calibrations(self):
        for key in ['annie','katniss']:
            manifest=json.loads((build.HERE/f'manifests/{key}.json').read_text())
            self.assertTrue(manifest['hidden'])
            self.assertTrue(manifest['verifyAllMoonBoots'])
            build.check(manifest)
            for kind,rows in [('sprites',4),('toys',4),('actions',3),('ledge',1)]:
                path=build.GAME/f'assets/doll_{key}_{kind}.webp'
                art=Image.open(path).convert('RGBA')
                mask=Image.open(build.GAME/f'assets/masks/{key}_{"sheet" if kind=="sprites" else kind}_mask.webp')
                self.assertEqual(art.size,(1254,rows*418))
                self.assertEqual(mask.size,art.size)
                self.assertGreater(np.count_nonzero(np.array(mask)[:,:,0]>128),500)
                for i in range(rows*3):
                    cell=art.crop((i%3*418,i//3*418,(i%3+1)*418,(i//3+1)*418))
                    x0,y0,x1,y1=build.bounds(cell)
                    self.assertTrue(x0>=4 and y0>=4 and x1<=414 and y1<=414,(key,kind,i))
                if kind=='sprites':continue
                data=json.loads((build.HERE/f'hidden/reports/{key}/{kind}.json').read_text())
                self.assertEqual(len(data['frames']),rows*3)
                self.assertEqual(data['sha256'],hashlib.sha256(path.read_bytes()).hexdigest())
                for i,f in enumerate(data['frames']):
                    # (Toy frames are sized by height afterwards, TOY_HEIGHT_TO_STANDING,
                    # so some draw a little smaller than packed: resolution to spare.)
                    self.assertGreaterEqual(f['scale'],.8 if kind=='toys' else 1)
                    if kind=='ledge':self.assertTrue(all(0<v<418 for v in f['ledgeContact']))
                    if f['wandTip']:
                        x,y=f['wandTip'];r,g,b,a=art.getpixel((i%3*418+x,i//3*418+y))
                        self.assertTrue(a>128 and r>g and g>b and x>300,(key,i))

    def test_garment_gates_protect_identity_colours(self):
        values=[[190,20,45,255],[150,75,30,255],[225,165,115,255],
                [32,34,40,255],[75,80,45,255],[220,180,35,255],[240,240,240,255]]
        im=Image.fromarray(np.array([values]*3,dtype=np.uint8))
        spec={'chin':1,'garmentBottom':2}
        annie=np.array(build.clothing_mask(im,spec,'annie-red'))[:,:,0]
        kat=np.array(build.clothing_mask(im,spec,'katniss-jacket'))[:,:,0]
        self.assertEqual(annie[1].tolist(),[255,0,0,0,0,0,0])
        self.assertEqual(kat[1].tolist(),[0,0,0,255,0,0,0])
        self.assertEqual(annie[0].max(),0)
        self.assertEqual(kat[2].max(),0)

if __name__=='__main__':unittest.main()
