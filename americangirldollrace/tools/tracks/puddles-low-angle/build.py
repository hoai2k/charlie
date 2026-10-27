"""Uniformly pack reviewed low-angle puddles; change only oil cell3."""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects

HERE=Path(__file__).resolve().parent;GAME=HERE.parents[2]
KEYS=['farm','horseshow','space','woods','clouds','winter','beach']

def main_pool(im):
    labels,count=label(np.array(im)[:,:,3]>64)
    areas=np.bincount(labels.ravel());areas[0]=0
    s=find_objects(labels)[int(areas.argmax())-1]
    return (s[1].start,s[0].start,s[1].stop,s[0].stop)

def build(key):
    path=HERE/f'sources/{key}.webp';src=Image.open(path).convert('RGBA')
    a=np.array(src);a[a[:,:,3]<=12]=0;src=Image.fromarray(a)
    b=src.getbbox();pool=main_pool(src);ratio=(pool[3]-pool[1])/(pool[2]-pool[0])
    assert .48<=ratio<=.62,(key,'angle outside reviewed range',ratio)
    assert b[0]>0 and b[1]>0 and b[2]<src.width and b[3]<src.height
    scale=220/(pool[2]-pool[0])
    art=src.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
    x=round(128-((pool[0]+pool[2])/2-b[0])*scale)
    y=round(140-((pool[1]+pool[3])/2-b[1])*scale)
    assert x>0 and y>0 and x+art.width<256 and y+art.height<256
    cell=Image.new('RGBA',(256,256));cell.alpha_composite(art,(x,y))
    before=Image.open(HERE/f'before/{key}.webp').convert('RGBA');out=before.copy();out.paste(cell,(768,0))
    target=GAME/f'assets/tracks/{key}/powerups.webp';out.save(target,'WEBP',lossless=True,exact=True,method=6)
    out=Image.open(target).convert('RGBA')
    for n in [0,1,2,4]:
        box=(n*256,0,(n+1)*256,256)
        assert np.array_equal(np.array(before.crop(box)),np.array(out.crop(box)))
    report={'track':key,'changedCell':3,'unchangedCells':[0,1,2,4],'sourceBounds':b,'mainPoolSourceBounds':pool,
            'mainPoolHeightOverWidth':ratio,'uniformScale':scale,'offset':[x,y],'mainPoolCenter':[128,140],
            'mainPoolTargetWidth':220,'cellBounds':cell.getbbox(),'sheetSize':out.size,
            'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    (HERE/f'reports/{key}.json').write_text(json.dumps(report,indent=2)+'\n')
    print(key,round(ratio,3),'other four cells pixel-identical')

if __name__=='__main__':
    for key in sys.argv[1:] or KEYS:build(key)
