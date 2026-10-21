import unittest
import numpy as np
from PIL import Image
import build


class TrackArtTests(unittest.TestCase):
    def test_atlas_split_preserves_an_icon_that_extends_past_nominal_cell(self):
        im=Image.new('RGBA',(300,200))
        for box in [(10,10,105,105),(120,10,190,100),(215,10,290,100),(10,125,90,190),(120,125,190,190)]:
            im.paste((120,80,190,255),box)
        cells=build.atlas_cells(im)
        self.assertEqual(build.bounds(cells[0]),(10,10,105,105))
        self.assertIsNone(build.bounds(cells[5]))

    def test_hurdle_uses_fixed_canvas_and_ground_baseline(self):
        im=Image.new('RGBA',(300,300));im.paste((120,80,30,255),(40,80,260,240))
        out=build.icon(im,(160,170),(150,130),170)
        self.assertEqual(out.size,(160,170));self.assertEqual(build.bounds(out)[3],170)

    def test_export_rejects_a_clipped_object(self):
        im=Image.new('RGBA',(100,100));im.paste('red',(0,5,80,95))
        with self.assertRaisesRegex(AssertionError,'clips'):build.icon(im,(128,128),(108,108))


if __name__=='__main__':unittest.main()
