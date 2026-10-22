"""Pack reviewed shared effect and enemy art, keeping source anatomy and alpha."""
from pathlib import Path
import sys,json,hashlib,importlib.util
from PIL import Image
import numpy as np
HERE=Path(__file__).resolve().parent;GAME=HERE.parents[1]
spec=importlib.util.spec_from_file_location('toy_packing',GAME/'tools/dolls/toys/build.py');packing=importlib.util.module_from_spec(spec);spec.loader.exec_module(packing)

def place(cell,frame_size,scale,baseline,center=None):
    b=packing.packing.bounds(cell);art=cell.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
    x=round((frame_size[0]-art.width)/2) if center is None else round(center-art.width/2)
    y=baseline-packing.packing.bounds(art)[3];assert x>=1 and y>=1 and x+art.width<frame_size[0],(x,y,art.size,frame_size)
    frame=Image.new('RGBA',frame_size);frame.alpha_composite(art,(x,y));return frame

def build(key):
    src=packing.packing.clean(Image.open(HERE/f'sources/{key}.webp'));rows=1 if key=='wave' else 4 if key in ['scarecrow','skeleton','robot'] else 2
    if key=='robot':
        b=packing.packing.bounds(src);assert min(b[:2])>0 and b[2]<src.width and b[3]<src.height,('Clipped robot source',b)
    cells=packing.full_cells(src,rows=rows);boxes=[packing.packing.bounds(c) for c in cells]
    if key in ['scarecrow','skeleton','robot']:
        target=GAME/f'assets/{key}_sprites.webp';size=(418,418);sheet=Image.new('RGBA',(1254,1672));reference=Image.open(GAME/'assets/monster_sprites.webp').convert('RGBA')
        common=(packing.packing.bounds(reference.crop((0,0,418,418)))[3]-packing.packing.bounds(reference.crop((0,0,418,418)))[1])/(boxes[0][3]-boxes[0][1])
        for n,c in enumerate(cells):
            b=boxes[n];ref=packing.packing.bounds(reference.crop((n%3*418,n//3*418,n%3*418+418,n//3*418+418)))
            # The three ground/defeated poses have their own low silhouettes.
            factor=min(common,402/(b[2]-b[0]),402/(b[3]-b[1])) if n<9 else min((ref[2]-ref[0])/(b[2]-b[0]),(ref[3]-ref[1])/(b[3]-b[1]))
            f=place(c,size,factor,409,(ref[0]+ref[2])/2);sheet.paste(f,(n%3*418,n//3*418))
    else:
        fw,fh=(512,384) if key=='wave' else (256,256);size=(fw,fh);sheet=Image.new('RGBA',(fw*3,fh*rows))
        target=GAME/('assets/frog_sprites.webp' if key=='frog' else f'assets/tracks/{"beach" if key=="wave" else "toyroom"}/{key}.webp')
        for n,c in enumerate(cells):
            group=boxes[n//3*3:n//3*3+3]
            fit=(500,330) if key=='wave' else (188,200) if key=='frog' and n<3 else (228,228) if key=='frog' else (238,220)
            scale=min(fit[0]/max(b[2]-b[0] for b in group),fit[1]/max(b[3]-b[1] for b in group))
            f=place(c,size,scale,fh-1);sheet.paste(f,(n%3*fw,n//3*fh))
    packing.packing.save(sheet,target,exact=True)
    report={'path':str(target.relative_to(GAME)),'size':sheet.size,'frameSize':size,'frames':[packing.packing.bounds(sheet.crop((n%3*size[0],n//3*size[1],n%3*size[0]+size[0],n//3*size[1]+size[1]))) for n in range(len(cells))],'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    (HERE/f'reports/{key}.json').write_text(json.dumps(report,indent=2)+'\n');print(key,report['size'])

if __name__=='__main__':
    for key in sys.argv[1:] or ['frog','wave','windup_car','scarecrow','skeleton','robot']:build(key)
