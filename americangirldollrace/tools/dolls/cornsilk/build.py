"""Pack Cornsilk's retained plush art, with explicit soft-body attachment data.

python3 americangirldollrace/tools/dolls/cornsilk/build.py
Run the shared hand/foot/pose measurements and boot fitter afterwards.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys
import numpy as np
from PIL import Image, ImageDraw

H=Path(__file__).resolve().parents[1];G=H.parents[1]
sys.path.insert(0,str(H))
import build as B

def module(name,path):
    s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
Z=module('zoey_helpers',H/'zoey/build.py')
C=module('hidden_helpers',H/'hidden/build.py')
KEY='cornsilk'


def source_point(im,frac):
    b=B.bounds(im)
    return [b[i]+(b[i+2]-b[i])*frac[i] for i in (0,1)]


def transform(point,record):
    return [round(record['anchor'][i]+(point[i]-record['sourceAnchor'][i])*record['scale'],2) for i in (0,1)]


def torso(im,record,frac):
    # The ears consume almost half her height. Locate the chest explicitly,
    # rather than using the human dolls' silhouette-height heuristic.
    point=transform(source_point(im,frac),record)
    half=(B.bounds(im)[3]-B.bounds(im)[1])*.075*record['scale']
    return [round(point[0]-half,2),round(point[0]+half,2),point[1],point[0]]


def gallery(frames,path,labels):
    rows=(len(frames)+2)//3;out=Image.new('RGB',(1254,442*rows),'#e2ebee');d=ImageDraw.Draw(out)
    for n,im in enumerate(frames):
        xy=(n%3*418,n//3*442);d.text((xy[0]+5,xy[1]+5),labels[n],fill='#172a39');out.paste(im,(xy[0],xy[1]+24),im)
    out.save(path,'WEBP',quality=90,method=6)


def pack(im,desired,hip_fraction=.65):
    b=B.bounds(im);pivot=source_point(im,[hip_fraction,.65])[0]
    factor=min(desired,399/(b[2]-b[0]),399/(b[3]-b[1]))
    tx=max(209,7+(pivot-b[0])*factor);tx=min(tx,411-(b[2]-pivot)*factor)
    spec={'hipX':pivot,'chin':im.height,'anchor':[pivot,b[3]],'target':[tx,409]}
    frame,mask,record=B.place(im,B.clothing_mask(im,spec,'no-clothing'),spec,factor)
    restore=desired/factor
    return frame,mask,record,{'bounds':B.bounds(frame),'packedScale':factor,'scale':restore,'renderScale':restore,
        'anchorX':tx+16,'baseline':409,'targetY':409,'offsetX':0,'hand':None,'wandTip':None}


def main():
    calibration=json.loads((H/'cornsilk/calibration.json').read_text())
    normal=C.cells(KEY,'normal',4);menu=C.cells(KEY,'menu',1)
    root=H/f'sources/{KEY}/poses';root.mkdir(exist_ok=True)
    common=390/(B.bounds(normal[0])[3]-B.bounds(normal[0])[1])
    manifest={'version':1,'key':KEY,'name':'Cornsilk','color':'#b6a07a','hidden':True,'verifyAllMoonBoots':True,
        'standingHeight':390,'portraitBox':[0,0,normal[0].width,round(normal[0].width*1.25)],
        'mask':{'mode':'no-clothing'},'outfitData':{'stats':{'h':1.25,'L':.72,'C':.055,'beta':.7},'outfits':[]},'poses':{}}
    sourcehands=[]
    for n,(name,im) in enumerate(zip(B.POSES+['wave','cheer'],normal+menu[:2])):
        B.save_webp(im,root/f'{name}.webp');b=B.bounds(im)
        frac=calibration['hipFractions'][n] if n<12 else .65
        spec={'source':f'sources/{KEY}/poses/{name}.webp','hipX':source_point(im,[frac,.65])[0],
              'chin':im.height,'scale':1 if n<12 else calibration['anatomicalScales']['menu']}
        if name=='ride':spec.update(anchor=source_point(im,calibration['riderSeat']),target=[209,264])
        manifest['poses'][name]=spec
        if n<6:sourcehands.append(source_point(im,calibration['broomPaws'][n]))
    manifest['broomHandsSource']=[sourcehands[:3],sourcehands[3:6]]
    (H/f'manifests/{KEY}.json').write_text(json.dumps(manifest,indent=2)+'\n')
    runtime=B.build(manifest);B.check(manifest)
    registry=Z.read_assignment(G/'dolls.js','EXTRA_DOLLS',{});registry[KEY]=runtime;Z.assignment(G/'dolls.js','EXTRA_DOLLS',registry)
    report=json.loads((H/f'reports/{KEY}.json').read_text())
    normalrecords=[report['frames'][name] for name in B.POSES]
    roots={'sprites':[torso(im,r,calibration['torso']['sprites'][n]) for n,(im,r) in enumerate(zip(normal,normalrecords))]}
    broom=[[transform(sourcehands[row*3+col],normalrecords[row*3+col]) for col in range(3)] for row in range(2)]
    paws={name:transform(source_point(normal[index],calibration['throwPaws'][name]),normalrecords[index]) for name,index in [('stand',10),('ride',9)]}
    reports=H/'cornsilk/reports';reports.mkdir(exist_ok=True)
    extra={}
    for kind,rows in [('toys',4),('actions',3),('ledge',1)]:
        ims=C.cells(KEY,kind,rows);frames=[];records=[];wing=[]
        sheet=Image.new('RGBA',(1254,418*rows));masks=Image.new('RGB',sheet.size)
        ratio=calibration['anatomicalScales'][kind]
        for n,im in enumerate(ims):
            frame,mask,record,meta=pack(im,common*ratio,calibration['hips'][kind][n])
            wing.append(torso(im,record,calibration['torso'][kind][n]))
            if kind=='actions' and n<3:meta['wandTip']=Z.star_tip(frame,1)
            if kind=='actions' and n==6:
                seat=transform(source_point(im,calibration['actionSeat']),record)
                meta['targetY']=264-(seat[1]-409)*meta['scale']
                meta['offsetX']=-(seat[0]-record['anchor'][0])*meta['scale']
            if kind=='ledge':
                meta['corner']=transform(source_point(im,calibration['ledgeContacts'][n]),record)
            for name,index in [('skate',4),('pogo',10)]:
                if kind=='toys' and n==index:paws[name]=transform(source_point(im,calibration['throwPaws'][name]),record)
            if (kind=='actions' and n==6):meta['hand']=transform(source_point(im,calibration['throwPaws']['saddle']),record)
            meta['sourceAnchor']=record['sourceAnchor'];meta['sourceScaleRatio']=ratio
            xy=(n%3*418,n//3*418);sheet.paste(frame,xy);masks.paste(mask.convert('RGB'),xy)
            frames.append(frame);records.append(meta)
        path=G/f'assets/doll_{KEY}_{kind}.webp';B.save_webp(sheet,path);B.save_webp(masks,G/f'assets/masks/{KEY}_{kind}_mask.webp')
        extra[kind]=records;roots[kind]=wing
        (reports/f'{kind}.json').write_text(json.dumps({'frames':records,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()},indent=2)+'\n')
        gallery(frames,reports/f'{kind}.webp',[f'Cornsilk {kind} {n}' for n in range(len(frames))])
    p=G/'doll-art.js'
    for var in ['RIDE_TOY_SHEETS','ACTION_SHEETS','LEDGE_SHEETS']:
        keys=Z.read_assignment(p,var,[])
        if KEY not in keys:keys.append(KEY)
        Z.assignment(p,var,keys)
    for var,value in [('RIDE_TOY_FRAMES',{'anchorX':[r['anchorX'] for r in extra['toys']],'scale':[r['scale'] for r in extra['toys']]}),
                      ('ACTION_FRAMES',extra['actions']),('LEDGE_FRAMES',extra['ledge']),
                      ('LEDGE_ANCHORS',[r['corner'] for r in extra['ledge']]),('DOLL_WING_ROOTS',roots)]:
        values=Z.read_assignment(p,var,{});values[KEY]=value;Z.assignment(p,var,values)
    p=G/'assets/doll_ledge_anchors.json';d=json.loads(p.read_text());d['dolls'][KEY]=extra['ledge'];p.write_text(json.dumps(d,indent=2)+'\n')
    p=H.parent/'mounts/broom.json';d=json.loads(p.read_text());d['carryHands'][KEY]=broom;p.write_text(json.dumps(d,indent=2)+'\n');Z.assignment(G/'broom.js','BROOM_ART',{k:d[k] for k in ['grip','carryHands']})
    # Shared measurement scripts read this explicit plush-paw calibration,
    # so rerunning them cannot mistake her long ears for throwing hands.
    manifest['throwHandsFrame']=paws
    (H/f'manifests/{KEY}.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (reports/'anchors.json').write_text(json.dumps({'hands':paws,'broom':broom,'wingRoots':roots},indent=2)+'\n')
    print('Cornsilk complete: race/menu/toys/actions/ledge, paws, seats, wand, wings and contact anchors')

if __name__=='__main__':main()
