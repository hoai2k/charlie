"""Build Annie/Katniss from retained atlases; preserve poses across nominal cells.

python3 americangirldollrace/tools/dolls/hidden/build.py [annie katniss]
"""
from pathlib import Path
import importlib.util
import hashlib
import json
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

H=Path(__file__).resolve().parents[1];G=H.parents[1]
sys.path.insert(0,str(H))
import build as B
s=importlib.util.spec_from_file_location('zoey_helpers',H/'zoey/build.py')
Z=importlib.util.module_from_spec(s);s.loader.exec_module(Z)
t=importlib.util.spec_from_file_location('toy_helpers',H/'toys/build.py')
T=importlib.util.module_from_spec(t);t.loader.exec_module(T)


def cells(key,kind,rows):
    """Assign solid doll components to grid slots and retain soft alpha edges.

    A faint antialiased bridge must not join a boot to the next row's hair.
    No figure is resized or cut at the requested grid's imaginary boundaries.
    """
    im=Image.open(H/f'sources/{key}/{kind}-source.webp').convert('RGBA')
    a=np.array(im);labels,n=ndimage.label(a[:,:,3]>128)
    counts=np.bincount(labels.ravel());counts[0]=0
    major=np.flatnonzero(counts>counts.max()*.18)
    centres=np.array([[(c+.5)*im.width/3,(r+.5)*im.height/rows] for r in range(rows) for c in range(3)])
    membership=np.zeros(n+1,np.int16)
    for label in major:
        yy,xx=np.where(labels==label)
        slot=int(np.argmin(((centres-[xx.mean(),yy.mean()])**2).sum(1)))
        membership[label]=slot+1
    assigned=membership[labels]
    assert set(np.unique(assigned))==set(range(rows*3+1)),(key,kind,'missing/merged pose')
    nearest=ndimage.distance_transform_edt(assigned==0,return_distances=False,return_indices=True)
    assigned=assigned[nearest[0],nearest[1]]
    result=[]
    for slot in range(rows*3):
        pixels=a.copy();pixels[assigned!=slot+1,3]=0
        pixels[:,:,3][pixels[:,:,3]<4]=0
        cell=Image.fromarray(pixels);bb=B.bounds(cell)
        assert bb and min(bb[:2])>0 and bb[2]<im.width and bb[3]<im.height,(key,kind,slot,'source edge',bb)
        cell=cell.crop((max(0,bb[0]-6),max(0,bb[1]-6),min(im.width,bb[2]+6),min(im.height,bb[3]+6)))
        result.append(cell)
    return result


def face_area(im):
    return T.face_info(im)[2]


def spec_for(key,im,kind,index):
    b=B.bounds(im);height=b[3]-b[1]
    yy=b[1]+round(height*.52)
    xs=np.flatnonzero(np.array(im.getchannel('A'))[yy]>128)
    hip=float(np.median(xs)) if len(xs) else (b[0]+b[2])/2
    # Below-face boundary and garment hem; warm hair/skin excluded by palette.
    chin=b[1]+height*(.27 if key=='annie' else .30)
    hem=b[1]+height*(.76 if key=='annie' else .61)
    if kind=='normal' and index==11:hem=b[1]+height*(.89 if key=='annie' else .72)
    spec={'hipX':round(hip,2),'chin':round(chin),'garmentBottom':round(hem)}
    return spec


def mask(key,im,spec,kind,index):
    out=np.array(B.clothing_mask(im,spec,'annie-red' if key=='annie' else 'katniss-jacket').convert('RGB'))
    if key=='annie' and kind=='toys' and index>=6:
        # Protect the red pole, including where it crosses the dress. Its
        # axis is measured from the exposed lower pole, not guessed per pixel.
        a=np.array(im).astype(float);r,g,b=a[:,:,:3].transpose(2,0,1);bb=B.bounds(im)
        yy,xx=np.indices(r.shape)
        red=(r>g+65)&(r>b+45)&(a[:,:,3]>128)&(yy>bb[1]+(bb[3]-bb[1])*.78)
        ys,xs=np.where(red)
        if len(xs)>10:
            slope,intercept=np.polyfit(ys,xs,1)
            hardware=(abs(xx-(slope*yy+intercept))<max(4,(bb[2]-bb[0])*.025))&(yy>bb[1]+(bb[3]-bb[1])*.35)
            out[hardware]=0
    return Image.fromarray(out)


def pack(key,im,spec,desired,kind,index):
    b=B.bounds(im);factor=min(desired,400/(b[2]-b[0]),400/(b[3]-b[1]))
    pivot=spec['hipX'];tx=max(209,6+(pivot-b[0])*factor);tx=min(tx,412-(b[2]-pivot)*factor)
    xy=[round(tx+(b[0]-pivot)*factor),round(409-(b[3]-b[1])*factor)]
    size=[round((b[i+2]-b[i])*factor) for i in range(2)]
    frame=Image.new('RGBA',(418,418));frame.alpha_composite(im.crop(b).resize(size,Image.Resampling.LANCZOS),xy)
    m=Image.new('RGB',(418,418));m.paste(mask(key,im,spec,kind,index).crop(b).resize(size,Image.Resampling.LANCZOS),xy)
    return frame,m,{'bounds':B.bounds(frame),'packedScale':factor,'scale':desired/factor,
        'renderScale':desired/factor,'anchorX':tx+16,'baseline':409,'targetY':409,'offsetX':0,
        'sourceAnchor':[pivot,b[3]],'placement':xy,'sourceBounds':b,'sourceScale':desired,
        'hand':Z.skin_hand(frame),'wandTip':None}


# On the toys, the established dolls stand this many times their standing
# height (median over the skating frames 0-5 and the pogo frames 6-11; Juliette,
# Kaya, Lily... all within a few percent). Face-area matching alone misjudged
# Annie (her curls) by about a third, so the toy scales are set by height.
TOY_HEIGHT_TO_STANDING = (0.99, 1.02)


def alpha_height(im):
    a=np.array(im.getchannel('A'))>40;ys=np.flatnonzero(a.any(1))
    return float(ys[-1]-ys[0]+1) if len(ys) else 0.0


def correct_toy_scales(frames,records,standing):
    """Rescale the toy records so each group stands TOY_HEIGHT_TO_STANDING x her standing height."""
    for group,(lo,hi) in enumerate([(0,6),(6,12)]):
        now=float(np.median([alpha_height(frames[n])*records[n]['scale']/standing for n in range(lo,hi)]))
        k=TOY_HEIGHT_TO_STANDING[group]/now
        for n in range(lo,hi):
            for field in ('scale','renderScale','sourceScale'):records[n][field]*=k
    return records


def main(key):
    mode='annie-red' if key=='annie' else 'katniss-jacket'
    normal=cells(key,'normal',4);menu=cells(key,'menu',1)
    root=H/f'sources/{key}/poses';root.mkdir(exist_ok=True)
    ref=B.bounds(normal[0]);standing=382 if key=='annie' else 384
    common=standing/(ref[3]-ref[1]);face=face_area(normal[0])
    names=B.POSES+['wave','cheer']
    sources=normal+menu[:2];manifest={'version':1,'key':key,'name':'Annie' if key=='annie' else 'Katniss',
        'color':'#d72b35' if key=='annie' else '#778359','hidden':True,'verifyAllMoonBoots':True,'standingHeight':standing,
        'portraitBox':[0,0,normal[0].width,round(normal[0].width*1.25)],'mask':{'mode':mode},
        'outfitData':{'stats':{'h':0,'L':.5,'C':.08,'beta':.7,'tintNeutral':key=='katniss'},
                      'outfits':['blue','mint','purple','pink','orange','teal','yellow']},'poses':{}}
    # A common anatomical ratio for each generated group, with explicit caps
    # where the source's stride extends more vertically than its standing pose.
    ratios={}
    for group,indices in [('idle',range(3)),('run',range(3,6)),('jump',range(6,9)),('action',range(9,12)),('menu',range(12,14))]:
        ratio=float(np.sqrt(face/np.median([face_area(sources[i]) for i in indices])))
        if group=='idle':ratio=1
        limit=min(399/((B.bounds(sources[i])[3]-B.bounds(sources[i])[1])*common) for i in indices if i!=9)
        ratios[group]=min(ratio,limit)
    for n,(pose,im) in enumerate(zip(names,sources)):
        B.save_webp(im,root/f'{pose}.webp')
        spec=spec_for(key,im,'normal',n);group='idle' if n<3 else 'run' if n<6 else 'jump' if n<9 else 'action' if n<12 else 'menu'
        spec.update(source=f'sources/{key}/poses/{pose}.webp',scale=ratios[group])
        if pose=='ride':
            b=B.bounds(im);spec.update(anchor=[b[0]+(b[2]-b[0])*.34,b[1]+(b[3]-b[1])*.69],target=[209,264])
        manifest['poses'][pose]=spec
    mp=H/f'manifests/{key}.json';mp.write_text(json.dumps(manifest,indent=2)+'\n')
    runtime=B.build(manifest);B.check(manifest)
    # Measure Oklab statistics from the selected garment; retain the result in
    # the manifest so the standard exporter reproduces its runtime palette.
    aa=np.array(Image.open(G/f'assets/doll_{key}_sprites.webp').convert('RGBA')).astype(float)
    mm=np.array(Image.open(G/f'assets/masks/{key}_sheet_mask.webp').convert('RGB'))[:,:,0]>220
    sys.path.insert(0,str(H.parent/'recolor'));from oklab import M1,M2,srgb_to_lin
    lab=np.einsum('ij,nj->ni',M2,np.cbrt(np.einsum('ij,nj->ni',M1,srgb_to_lin(aa[:,:,:3][mm]/255))))
    manifest['outfitData']['stats'].update(L=round(float(np.median(lab[:,0])),6),C=round(float(np.median(np.hypot(lab[:,1],lab[:,2]))),6),h=round(float(np.arctan2(np.median(lab[:,2]),np.median(lab[:,1]))),6))
    mp.write_text(json.dumps(manifest,indent=2)+'\n');runtime=B.build(manifest)
    registry=Z.read_assignment(G/'dolls.js','EXTRA_DOLLS',{});registry[key]=runtime;Z.assignment(G/'dolls.js','EXTRA_DOLLS',registry)
    reports=H/f'hidden/reports/{key}';reports.mkdir(parents=True,exist_ok=True)
    all_records={}
    for kind,rows in [('toys',4),('actions',3),('ledge',1)]:
        ims=cells(key,kind,rows)
        ratio=float(np.sqrt(face/np.median([face_area(im) for im in ims])))
        if kind=='ledge':ratio=min(ratio,min(398/(max(B.bounds(im)[2]-B.bounds(im)[0],B.bounds(im)[3]-B.bounds(im)[1])*common) for im in ims))
        sheet=Image.new('RGBA',(1254,418*rows));masks=Image.new('RGB',sheet.size);records=[]
        review=Image.new('RGB',(1254,442*rows),'#eee8db');draw=ImageDraw.Draw(review)
        for n,im in enumerate(ims):
            spec=spec_for(key,im,kind,n);frame,m,record=pack(key,im,spec,common*ratio,kind,n)
            # All three wands point right. Using the highest gold pixel
            # mistakes Annie's copper curls for the raised star.
            if kind=='actions' and n<3:record['wandTip']=Z.star_tip(frame,1)
            if kind=='actions' and n==6:
                b=B.bounds(im);seat=[b[0]+(b[2]-b[0])*.34,b[1]+(b[3]-b[1])*.69]
                f=record['packedScale'];pivot=record['sourceAnchor'][0]
                sx=record['anchorX']-16+(seat[0]-pivot)*f;sy=409+(seat[1]-b[3])*f
                record['targetY']=264-(sy-409)*record['scale']
                record['offsetX']=-(sx-(record['anchorX']-16))*record['scale']
            if kind=='ledge':
                b=B.bounds(im)
                # Forearm contact for hang; supporting hands for pull-up; knee
                # support for recovery. Each point is measured in its own pose.
                point=[b[0]+(b[2]-b[0])*(.83 if n==0 else .78 if n==1 else .63),b[1]+(b[3]-b[1])*(.36 if n==0 else .53 if n==1 else .94)]
                record['ledgeContact']=[round(record['anchorX']-16+(point[0]-record['sourceAnchor'][0])*record['packedScale'],2),round(409+(point[1]-b[3])*record['packedScale'],2)]
            xy=(n%3*418,n//3*418);sheet.paste(frame,xy);masks.paste(m,xy);records.append(record)
            x,y=n%3*418,n//3*442;draw.rectangle((x,y,x+417,y+441),fill='#344c5b' if n%2 else '#eee8db');draw.text((x+5,y+5),f'{key} {kind}-{n}',fill='#ffb24a');review.paste(frame,(x,y+24),frame)
        if kind=='toys':
            sprites=Image.open(G/f'assets/doll_{key}_sprites.webp').convert('RGBA')
            standing=float(np.median([alpha_height(sprites.crop((c*418,0,c*418+418,418))) for c in range(3)]))
            correct_toy_scales([sheet.crop((n%3*418,n//3*418,n%3*418+418,n//3*418+418)) for n in range(12)],records,standing)
        art=G/f'assets/doll_{key}_{kind}.webp';maskpath=G/f'assets/masks/{key}_{kind}_mask.webp'
        B.save_webp(sheet,art);B.save_webp(masks,maskpath)
        report={'assetKey':key,'sourceAnatomicalRatio':ratio,'frames':records,'sha256':hashlib.sha256(art.read_bytes()).hexdigest(),'maskSha256':hashlib.sha256(maskpath.read_bytes()).hexdigest()}
        (reports/f'{kind}.json').write_text(json.dumps(report,indent=2)+'\n');review.save(reports/f'{kind}.webp','WEBP',quality=90,method=6)
        all_records[kind]=records
    path=G/'doll-art.js'
    for var in ['RIDE_TOY_SHEETS','ACTION_SHEETS','LEDGE_SHEETS']:
        keys=Z.read_assignment(path,var,[])
        if key not in keys:keys.append(key)
        Z.assignment(path,var,keys)
    toys=Z.read_assignment(path,'RIDE_TOY_FRAMES',{});toys[key]={'anchorX':[r['anchorX'] for r in all_records['toys']],'scale':[r['scale'] for r in all_records['toys']]};Z.assignment(path,'RIDE_TOY_FRAMES',toys)
    actions=Z.read_assignment(path,'ACTION_FRAMES',{});actions[key]=all_records['actions'];Z.assignment(path,'ACTION_FRAMES',actions)
    ledges=Z.read_assignment(path,'LEDGE_ANCHORS',{});ledges[key]=[r['ledgeContact'] for r in all_records['ledge']];Z.assignment(path,'LEDGE_ANCHORS',ledges)
    p=G/'assets/doll_ledge_anchors.json';d=json.loads(p.read_text());d['dolls'][key]=all_records['ledge'];p.write_text(json.dumps(d,indent=2)+'\n')
    sheet=Image.open(G/f'assets/doll_{key}_sprites.webp').convert('RGBA');grips=[]
    for row in range(2):
        grips.append([Z.skin_hand(sheet.crop((col*418,row*418,(col+1)*418,(row+1)*418))) for col in range(3)])
    p=H.parent/'mounts/broom.json';d=json.loads(p.read_text());d['carryHands'][key]=grips;p.write_text(json.dumps(d,indent=2)+'\n');Z.assignment(G/'broom.js','BROOM_ART',{k:d[k] for k in ['grip','carryHands']})
    (reports/'source-calibration.json').write_text(json.dumps({'normalGroups':ratios,'broomHands':grips,'riderSeat':[209,264]},indent=2)+'\n')
    print(key,'complete hidden character, masks and anchors built')


if __name__=='__main__':
    for key in sys.argv[1:] or ['annie','katniss']:main(key)
