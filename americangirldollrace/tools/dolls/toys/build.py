"""Pack dedicated skating/pogo art with one anatomical scale per doll."""
from pathlib import Path
import hashlib,json,sys
from scipy import ndimage
from scipy.spatial import cKDTree
from functools import lru_cache
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent
GAME=HERE.parents[2]
import importlib.util
packing_spec=importlib.util.spec_from_file_location('track_packing',GAME/'tools/tracks/build.py')
packing=importlib.util.module_from_spec(packing_spec)
packing_spec.loader.exec_module(packing)
FRAME=418


def face_info(cell):
    a=np.asarray(cell);r,g,b=[a[:,:,i].astype(float) for i in range(3)]
    m=(r>190)&(g>120)&(b>85)&(b>g*.58)&(r>g+18)&(a[:,:,3]>200)
    m[round(cell.height*.50):]=False
    labels,n=ndimage.label(m)
    counts=np.bincount(labels.ravel());counts[0]=0
    if not n or counts.max()<=50:
        m=(r>110)&(g>55)&(b>30)&(b>g*.58)&(r>g+18)&(a[:,:,3]>200)
        m[round(cell.height*.50):]=False
        labels,n=ndimage.label(m);counts=np.bincount(labels.ravel());counts[0]=0
    assert n and counts.max()>50,'Missing face anchor'
    ys,xs=np.where(labels==counts.argmax())
    return float(np.median(xs)),float(ys.max()+1),len(xs)


def tip_centre(cell):
    a=np.asarray(cell.getchannel('A'))>16;ys,xs=np.where(a)
    bottom=ys.max();yy,xx=np.where(a & (np.indices(a.shape)[0]>bottom-8))
    return float((xx.min()+xx.max())/2)


@lru_cache(None)
def outfit_classifier(key):
    asset_key={'claudia':'claudia-v2','rumi':'rumi-v2'}.get(key,key)
    sheet=np.array(Image.open(GAME/f'assets/doll_{asset_key}_sprites.webp').convert('RGBA'))
    mask=np.array(Image.open(GAME/f'assets/masks/{asset_key}_sheet_mask.webp').convert('RGB'))
    features=[];weights=[]
    for n in range(12):
        x=n%3*418;y=n//3*418;a=sheet[y:y+418,x:x+418];m=mask[y:y+418,x:x+418]
        ys,xs=np.where(a[:,:,3]>200);x0,x1=xs.min(),xs.max();y0,y1=ys.min(),ys.max()
        # Deterministic sampling keeps this small and repeatable.
        ys=ys[::9];xs=xs[::9]
        features.append(np.column_stack([a[ys,xs,:3]/40.,(xs-x0)/(x1-x0)*1.5,(ys-y0)/(y1-y0)*3.]))
        weights.append(m[ys,xs,:2]/255.)
    return cKDTree(np.concatenate(features)),np.concatenate(weights)


def learned_mask(cell,key,n):
    a=np.array(cell).astype(float);b=packing.bounds(cell);yy,xx=np.indices(a.shape[:2]);ys,xs=np.where(a[:,:,3]>8)
    features=np.column_stack([a[ys,xs,:3]/40.,(xs-b[0])/(b[2]-b[0])*1.5,(ys-b[1])/(b[3]-b[1])*3.])
    tree,weights=outfit_classifier(key);dist,idx=tree.query(features,k=7)
    votes=1/(dist+.04)**2;value=(weights[idx]*votes[:,:,None]).sum(1)/votes.sum(1)[:,None]
    value=np.clip((value-.25)/.5,0,1)
    out=np.zeros((*a.shape[:2],3),dtype='uint8');out[ys,xs,:2]=np.round(value*255)
    # Hardware is never outfit fabric. Retain boots above pogo pegs, but
    # protect the spring/tip; skates protect the whole boot/wheel silhouette.
    h=b[3]-b[1];w=b[2]-b[0]
    if n<6:
        protected=yy>b[3]-.25*h if n!=5 else xx>b[2]-.30*w
    elif n!=11:
        protected=yy>b[3]-.14*h
        tip=tip_centre(cell)
        protected|=(abs(xx-tip)<max(5,w*.035))&(yy>b[1]+h*.45)
        # Handlebar highlights/grips stay neutral; skin is already excluded.
        spread=a[:,:,:3].max(2)-a[:,:,:3].min(2)
        protected|=(abs(xx-tip)<w*.23)&(yy>b[1]+h*.35)&(yy<b[1]+h*.61)&(spread<24)&(a[:,:,:3].max(2)<110)
    else:
        protected=(xx>b[2]-.20*w) | (yy>b[3]-.16*h)
    out[protected]=0
    return Image.fromarray(out)


def mask_for(cell,key,chin):
    a=np.asarray(cell).astype(float);r,g,b,alpha=[a[:,:,i] for i in range(4)]
    if key=='lily':
        w=np.clip((b-r-5)/18,0,1)*np.clip((b-g+12)/18,0,1)*(alpha>16)
    else:
        spread=np.max(a[:,:,:3],2)-np.min(a[:,:,:3],2)
        w=np.clip((22-spread)/6,0,1)*(np.max(a[:,:,:3],2)<180)*(np.min(a[:,:,:3],2)>16)*(alpha>16)
    w[:round(chin)]=0
    box=packing.bounds(cell)
    # Protect white skate boots/wheels and the pogo's spring/tip hardware.
    w[box[3]-round((box[3]-box[1])*.19):]=0
    out=np.zeros((*a.shape[:2],3),dtype='uint8');out[:,:,0]=np.round(w*255)
    return Image.fromarray(out)


def full_cells(src,rows=4,required_slots=None):
    # Assign disconnected prop pieces to the closest atlas slot, then crop
    # whole components. This preserves poses that extend past a nominal grid
    # line without cutting their hair, hand or pogo tip into the next slot.
    a=np.asarray(src);labels,n=ndimage.label(a[:,:,3]>8)
    centers=np.array([[(c+.5)*src.width/3,(r+.5)*src.height/rows] for r in range(rows) for c in range(3)])
    membership=np.zeros(n+1,dtype=int)
    for label,sl in enumerate(ndimage.find_objects(labels),1):
        if sl is None:continue
        ys,xs=np.where(labels[sl]==label);cx=xs.mean()+sl[1].start;cy=ys.mean()+sl[0].start
        membership[label]=1+np.argmin(((centers-np.array([cx,cy]))**2).sum(1))
    assigned=membership[labels]
    # Preserve the soft alpha fringe around the thresholded components.
    fringe=(a[:,:,3]>0)&(assigned==0)
    if fringe.any():
        nearest=ndimage.distance_transform_edt(assigned==0,return_distances=False,return_indices=True)
        assigned[fringe]=assigned[nearest[0][fringe],nearest[1][fringe]]
    cells=[]
    for slot in range(rows*3):
        pixels=a.copy();pixels[assigned!=slot+1,3]=0
        cell=Image.fromarray(pixels);b=packing.bounds(cell);assert b,(slot,'empty source pose')
        if required_slots is None or slot in required_slots:
            assert b[0]>0 and b[1]>0 and b[2]<src.width and b[3]<src.height,(slot,'source clips outer edge',b)
        cells.append(cell.crop((max(0,b[0]-5),max(0,b[1]-5),min(src.width,b[2]+5),min(src.height,b[3]+5))))
    return cells


def build(key):
    if key == 'juliette' and (HERE/'purse-redo/source.webp').exists():
        spec=importlib.util.spec_from_file_location('juliette_purse_redo',HERE/'purse-redo/build.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        return json.loads((HERE/'reports/juliette.json').read_text())
    if key in ['lily','mira','hermione'] and (HERE/'fall-redo'/f'{key}-sheet-before.webp').exists():
        import redo_falls
        redo_falls.run([key])
        return json.loads((HERE/f'reports/{key}.json').read_text())
    full=HERE/'sources'/f'{key}-full.webp'
    if full.exists():
        cells=full_cells(packing.clean(Image.open(full)))
        action_ratio=1.;groups=[1]*12
    else:
        main=packing.atlas_cells(packing.clean(Image.open(HERE/'sources'/f'{key}.webp')))
        actions=packing.atlas_cells(packing.clean(Image.open(HERE/'sources'/f'{key}-actions.webp')))
        # Match companion sources by the same feet-together standing pose.
        mb=packing.bounds(main[1]);ab=packing.bounds(actions[0])
        action_ratio=(mb[3]-mb[1])/(ab[3]-ab[1])
        cells=main[:3]+actions[:3]+main[3:]+actions[3:]
        groups=[1]*3+[action_ratio]*3+[1]*3+[action_ratio]*3
    boxes=[packing.bounds(c) for c in cells]
    for c,b in zip(cells,boxes):assert b and min(b[:2])>0 and b[2]<c.width and b[3]<c.height,(key,'source clips edge',b,c.size)
    ref=Image.open(HERE/'references'/f'{key}.webp').convert('RGBA').crop((0,0,418,418));rb=packing.bounds(ref)
    standing=rb[3]-rb[1]
    scale=standing/(boxes[1][3]-boxes[1][1])
    faces=[face_info(c) for c in cells]
    sheet=Image.new('RGBA',(1254,1672));mask=Image.new('RGB',sheet.size)
    records=[]
    for n,(cell,b,g) in enumerate(zip(cells,boxes,groups)):
        face,chin,_=faces[n];desired=scale*g
        factor=min(desired,404/(b[3]-b[1]),404/(b[2]-b[0]))
        falling=n in (5,11)
        pivot=(b[0]+b[2])/2 if falling else face if n<6 else tip_centre(cell)
        size=(round((b[2]-b[0])*factor),round((b[3]-b[1])*factor))
        # Hair can trail beyond the nominal face pivot. Preserve scale and
        # store the shifted drawing anchor so the face stays put in game.
        target_pivot=max(209,5+int(np.ceil((pivot-b[0])*factor)))
        target_pivot=min(target_pivot,413-int(np.ceil((b[2]-pivot)*factor)))
        art=cell.crop(b).resize(size,Image.Resampling.LANCZOS)
        x=round(target_pivot+(b[0]-pivot)*factor);y=409-packing.bounds(art)[3]
        assert x>=4 and x+size[0]<=414 and y>=4,(key,n,x,y,size)
        frame=Image.new('RGBA',(418,418));frame.alpha_composite(art,(x,y));sheet.paste(frame,(n%3*418,n//3*418))
        m=(mask_for(cell,key,chin) if key in ['lily','mira','hermione'] else learned_mask(cell,key,n)).crop(b).resize(size,Image.Resampling.LANCZOS);mask.paste(m,(n%3*418+x,n//3*418+y))
        records.append({'bounds':packing.bounds(frame),'scale':factor,'renderScale':desired/factor,'anchorX':target_pivot+16,'sourcePivot':round(pivot,2),'targetPivot':target_pivot,'sourceChin':round(chin,2)})
    override=HERE/'overrides'/f'{key}.json'
    if override.exists():
        for index,record in json.loads(override.read_text()).items():
            n=int(index);xy=(n%3*418,n//3*418)
            sheet.paste(Image.open(HERE/'overrides'/f'{key}-{n}.webp'),xy)
            mask.paste(Image.open(HERE/'overrides'/f'{key}-{n}-mask.webp'),xy)
            records[n]=record
    asset_key={'claudia':'claudia-v2','rumi':'rumi-v2'}.get(key,key)
    target=GAME/f'assets/doll_{asset_key}_toys.webp';packing.save(sheet,target)
    packing.save(mask,GAME/f'assets/masks/{asset_key}_toys_mask.webp')
    report={'assetKey':asset_key,'anchorX':[f['anchorX'] for f in records],'renderScale':[f['renderScale'] for f in records],'baseline':409,'standingReferenceHeight':standing,'scale':scale,'actionScaleRatio':action_ratio,'frames':records,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    (HERE/'reports').mkdir(exist_ok=True);(HERE/'reports'/f'{key}.json').write_text(json.dumps(report,indent=2)+'\n')
    return report


if __name__=='__main__':
    keys=sys.argv[1:] or ['lily','mira','hermione']
    for key in keys:print(key,json.dumps(build(key)))
