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
            self.assertTrue(all(0<v<418 for v in f['corner']))
            self.assertEqual(f['scale'],1)
            self.assertAlmostEqual(f['packedScale']*f['scale'],json.loads((build.GAME/'tools/dolls/manifests/zoey.json').read_text())['standingHeight']/710,places=6)

    def test_secondary_accents_are_disjoint_and_identity_is_protected(self):
        manifest=json.loads((build.HERE/'manifests/zoey.json').read_text())
        secondary=manifest['outfitData']['secondary']['outfits']
        self.assertEqual(len(set(secondary)),7)
        for primary,accent in zip(manifest['outfitData']['outfits'],secondary):
            self.assertNotEqual(primary,accent)
        for kind in ['sheet','portrait','wave','cheer','ride','toys','actions','ledge']:
            file=f'assets/doll_zoey_{"sprites" if kind=="sheet" else kind}.webp' if kind in ['sheet','toys','actions','ledge'] else f'assets/portraits/zoey{"" if kind=="portrait" else "_"+kind}.webp'
            a=np.array(Image.open(build.GAME/file).convert('RGBA')).astype(float)
            mask=np.array(Image.open(build.GAME/f'assets/masks/zoey_{kind}_mask.webp').convert('RGB'))
            # Resampling can blend adjacent cloth edges; their solid interiors
            # must never belong to both recolour regions.
            self.assertFalse(np.any((mask[:,:,0]>64)&(mask[:,:,2]>64)),kind)
            if kind!='portrait':self.assertGreater(np.count_nonzero(mask[:,:,2]>128),100,kind)
            # Check the head area geometrically: shadowed yellow textile can
            # share skin-like RGB after resizing, so RGB alone is ambiguous.
            if kind!='portrait':
                for y in range(0,a.shape[0],418):
                    for x in range(0,a.shape[1],418):
                        cell=Image.fromarray(a[y:y+418,x:x+418].astype(np.uint8))
                        bb=build.bounds(cell)
                        head_end=bb[1]+round((bb[3]-bb[1])*.25)
                        self.assertEqual(mask[y+bb[1]:y+head_end,x:x+418,2].max(initial=0),0,(kind,x,y))

    def test_yellow_channel_does_not_select_skin_or_gold_above_hem(self):
        values=[[[225,165,115,255],[245,210,30,255]],
                [[225,165,115,255],[245,210,30,255]]]
        image=Image.fromarray(np.array(values,dtype=np.uint8))
        mask=np.array(build.clothing_mask(image,{'chin':0,'garmentBottom':1},'teal-top'))
        self.assertEqual(mask[0,:,2].tolist(),[0,0])
        self.assertEqual(mask[1,:,2].tolist(),[0,255])


if __name__=='__main__':unittest.main()
