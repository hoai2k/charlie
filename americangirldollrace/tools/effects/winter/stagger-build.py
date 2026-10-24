"""Pack IT3 using one anatomical scale and a fixed planted rear sole."""
from pathlib import Path
import importlib.util,json,hashlib
import numpy as np
from PIL import Image

HERE=Path(__file__).resolve().parent;GAME=HERE.parents[2]
spec=importlib.util.spec_from_file_location('winter_packing',HERE/'build.py')
packing=importlib.util.module_from_spec(spec);spec.loader.exec_module(packing)
# The correction narrows the first arm only; keep the originally accepted
# recovery pose from the first source, without replacing its pixels.
original=packing.isolated_cells(packing.clean(Image.open(HERE/'icetroll-stagger-source.webp')),2,1)
corrected=packing.isolated_cells(packing.clean(Image.open(HERE/'icetroll-stagger-correction.webp')),2,1)
frames=[corrected[0],original[1]]
scale=.43
sheet=Image.new('RGBA',(836,418));metadata=[]
for n,src in enumerate(frames):
    box=src.getbbox();a=np.array(src)[:,:,3]
    ys,xs=np.where((a>80)&(np.indices(a.shape)[0]>=box[3]-9))
    heel=float(xs.mean())
    art=src.crop(box).resize((round((box[2]-box[0])*scale),round((box[3]-box[1])*scale)),Image.Resampling.LANCZOS)
    x=round(150-(heel-box[0])*scale);y=407-art.height
    assert x>0 and y>0 and x+art.width<418 and y+art.height<418,(x,y,art.size)
    f=Image.new('RGBA',(418,418));f.alpha_composite(art,(x,y));sheet.paste(f,(n*418,0))
    metadata.append({'source': 'icetroll-stagger-correction.webp' if n==0 else 'icetroll-stagger-source.webp',
                     'sourceCell':n,'sourceBounds':box,'sourceSoleCenterX':heel,'scale':scale,'offset':[x,y],
                     'bounds':f.getbbox(),'supportSoleAnchor':[150,407]})
target=GAME/'assets/icetroll_stagger_sprites.webp';packing.save(sheet,target)
report={'sheet':str(target.relative_to(GAME)),'size':[836,418],'frameSize':[418,418],
        'spriteAnchor':[193,409],'supportSoleAnchor':[150,407],'commonScale':scale,'frames':metadata,
        'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
(HERE/'icetroll-stagger-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
