"""Replace only the two trial fall cells, preserving the other ten decoded cells."""
from pathlib import Path
import json,hashlib
from PIL import Image
import numpy as np
import build
HERE=Path(__file__).resolve().parent;GAME=HERE.parents[2];ROOT=HERE/'fall-redo'

def body_bounds(cell):
    a=np.array(cell);labels,n=build.ndimage.label(a[:,:,3]>16);counts=np.bincount(labels.ravel());counts[0]=0
    ids=[i for i in range(1,n+1) if counts[i]>counts.max()*.25]
    # The doll is the largest connected component; the separate pogo is not
    # part of the anatomical alignment reference.
    out=Image.fromarray(np.where((labels==counts.argmax())[:,:,None],a,0).astype('uint8'))
    return build.packing.bounds(out)

def run():
    cells=build.full_cells(Image.open(ROOT/'source.webp').convert('RGBA'),rows=2)
    verification={}
    for col,key in enumerate(['lily','mira','hermione']):
        sheet=Image.open(ROOT/f'{key}-sheet-before.webp').convert('RGBA');mask=Image.open(ROOT/f'{key}-mask-before.webp').convert('RGB')
        old=Image.open(HERE/f'references/{key}-fall.webp').convert('RGBA');ob=build.packing.bounds(old)
        report_path=HERE/f'reports/{key}.json';report=json.loads(report_path.read_text())
        records={}
        for row,n in enumerate([5,11]):
            cell=cells[row*3+col];bb=body_bounds(cell);box=build.packing.bounds(cell)
            body_scale=(ob[3]-ob[1])/(bb[3]-bb[1]);dx=(ob[0]+ob[2])/2-(bb[0]+bb[2])/2*body_scale;dy=ob[3]-bb[3]*body_scale
            desired=(dx+box[0]*body_scale,dy+box[1]*body_scale,dx+box[2]*body_scale,dy+box[3]*body_scale)
            assert desired[3]<=410,(key,'prop extends below body alignment')
            packed=min(1,402/(desired[2]-desired[0]),402/(desired[3]-desired[1]))
            # Transform the normal sheet's x225/foot409 anchor into this frame.
            left=max(5,(418-(desired[2]-desired[0])*packed)/2)
            px=round(left);py=round(409-(409-desired[1])*packed)
            size=(round((box[2]-box[0])*body_scale*packed),round((box[3]-box[1])*body_scale*packed))
            art=cell.crop(box).resize(size,Image.Resampling.LANCZOS);frame=Image.new('RGBA',(418,418));frame.alpha_composite(art,(px,py))
            # Baseline may round one pixel: align the visible shoes exactly.
            shift=409-build.packing.bounds(frame)[3]
            if shift:
                f=Image.new('RGBA',(418,418));f.alpha_composite(frame,(0,shift));frame=f;py+=shift
            raw=np.array(build.mask_for(cell,key,build.face_info(cell)[1]))
            yy,xx=np.indices(raw.shape[:2])
            if row==1:
                a=np.array(cell);labels,_=build.ndimage.label(a[:,:,3]>16);counts=np.bincount(labels.ravel());counts[0]=0
                body=build.ndimage.binary_dilation(labels==counts.argmax(),iterations=2)
                raw[~body]=0
                # A foot can touch the tipped prop and join its alpha component.
                # Find the exposed red shaft above the feet, then protect its
                # grips, pegs and coil along that same diagonal as well.
                red=(a[:,:,0]>a[:,:,1]*1.6)&(a[:,:,0]>a[:,:,2]*1.6)&(a[:,:,0]>100)&(xx>cell.width*.6)&(yy<cell.height*.48)&(a[:,:,3]>128)
                ry,rx=np.where(red)
                if len(rx)>20:
                    slope,intercept=np.polyfit(ry,rx,1)
                    hardware=(abs(xx-(slope*yy+intercept))<cell.width*.13)&(yy<cell.height*.84)
                    raw[hardware]=0
            else:
                raw[(xx>bb[0]+(bb[2]-bb[0])*.55)&(yy>bb[1]+(bb[3]-bb[1])*.48)]=0
            m=Image.fromarray(raw).crop(box).resize(size,Image.Resampling.LANCZOS);mf=Image.new('RGB',(418,418));mf.paste(m,(px,py))
            x=n%3*418;y=n//3*418;sheet.paste(frame,(x,y));mask.paste(mf,(x,y))
            anchor=(225-desired[0])*packed+px
            report['anchorX'][n]=anchor;report['renderScale'][n]=1/packed
            report['frames'][n]={'bounds':build.packing.bounds(frame),'anchorX':anchor,'renderScale':1/packed,'normalFallGeometry':True,'sourceBodyBounds':bb,'referenceBodyBounds':ob,'bodyScale':body_scale,'packedScale':packed}
        for n in range(12):
            if n in [5,11]:continue
            x=n%3*418;y=n//3*418;box=(x,y,x+418,y+418)
            for kind,new in [('sheet',sheet),('mask',mask)]:
                before=Image.open(ROOT/f'{key}-{kind}-before.webp').convert(new.mode)
                assert before.crop(box).tobytes()==new.crop(box).tobytes()
                records[f'{kind}:{n}']=hashlib.sha256(new.crop(box).tobytes()).hexdigest()
        target=GAME/f'assets/doll_{key}_toys.webp';build.packing.save(sheet,target,exact=True);build.packing.save(mask,GAME/f'assets/masks/{key}_toys_mask.webp',exact=True)
        report['sha256']=hashlib.sha256(target.read_bytes()).hexdigest();report_path.write_text(json.dumps(report,indent=2)+'\n');verification[key]=records
    (ROOT/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')

if __name__=='__main__':run()
