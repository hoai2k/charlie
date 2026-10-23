"""Export the reviewed cloud attack and bolt without changing generated anatomy."""
from pathlib import Path
from PIL import Image
import importlib.util,json
H=Path(__file__).resolve().parent;G=H.parents[2]
spec=importlib.util.spec_from_file_location('effects',H.parent/'build.py');e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
cells=e.packing.full_cells(e.packing.packing.clean(Image.open(H/'cloudLightning.webp')),rows=1)
cells[1]=e.packing.packing.clean(Image.open(H/'cloudReleaseFix.webp'))
boxes=[e.packing.packing.bounds(c) for c in cells]
factor=min(340/max(b[3]-b[1] for b in boxes),398/max(b[2]-b[0] for b in boxes))
sheet=Image.new('RGBA',(1536,512))
for n,c in enumerate(cells):
 b=boxes[n];scale=min(340/(b[3]-b[1]),496/(b[2]-b[0]));sheet.paste(e.place(c,(512,512),scale,503,256),(n*512,0))
sheet.save(G/'assets/cloudtroll_lightning.webp',lossless=True,exact=True,method=6)
bolt=e.packing.packing.clean(Image.open(H/'cloudBolt.webp'));b=e.packing.packing.bounds(bolt);bolt=bolt.crop(b);bolt.thumbnail((240,112),Image.Resampling.LANCZOS)
out=Image.new('RGBA',(256,128));out.alpha_composite(bolt,((256-bolt.width)//2,(128-bolt.height)//2));out.save(G/'assets/cloudtroll_bolt.webp',lossless=True,exact=True,method=6)
report={'attackScale':1,'frames':[e.packing.packing.bounds(sheet.crop((n*512,0,n*512+512,512))) for n in range(3)]}
(H/'attack-calibration.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
