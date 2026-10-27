"""Rebuild Zoey's complete roster, toy, special-action and ledge art and anchors.

Uses retained ImageGen sources and explicit source calibration; no image API.
Run from anywhere: python3 americangirldollrace/tools/dolls/zoey/build.py
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import re
import sys

import numpy as np
from PIL import Image, ImageDraw

H = Path(__file__).resolve().parents[1]
G = H.parents[1]
sys.path.insert(0, str(H))
import build as B


def assignment(path, variable, value):
    text = path.read_text()
    pattern = rf'window\.{variable}\s*=\s*(\{{.*?\n\}}|\[.*?\]);'
    replacement = f'window.{variable} = ' + json.dumps(value, indent=2) + ';'
    if re.search(pattern, text, re.S):
        text = re.sub(pattern, lambda _: replacement, text, count=1, flags=re.S)
    else:
        text += '\n' + replacement + '\n'
    path.write_text(text)


def read_assignment(path, variable, default):
    match = re.search(rf'window\.{variable}\s*=\s*(\{{.*?\n\}}|\[.*?\]);', path.read_text(), re.S)
    return json.loads(match[1]) if match else default


def source(name, cell):
    im = Image.open(H / f'sources/zoey/{name}.webp').convert('RGBA')
    box = B.split_strip(im)[cell]
    im = im.crop(box)
    im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 4 else a))
    b = B.bounds(im)
    assert b and min(b[:2]) > 0 and b[2] < im.width and b[3] < im.height, (name, cell, b)
    return im, cell * 724 - box[0]


def point(transform, xy):
    factor, anchor, target = transform
    return [round(target[i] + (xy[i] - anchor[i]) * factor, 2) for i in range(2)]


def pack(im, spec, desired, contact=None):
    b = B.bounds(im)
    # Explicit anatomical source scales are retained; packing reductions are
    # recorded and restored by runtime calibration, never hidden fit-to-cell.
    if contact:
        # Current ledge contract: preserve anatomy and move each measured
        # contact to the world edge, rather than squeeze into fixed (300,230).
        factor = desired
        pivot = (b[0] + b[2])/2
        anchor, target = [pivot,b[3]], [209,409]
    else:
        factor = min(desired, 400/(b[2]-b[0]), 400/(b[3]-b[1]))
        pivot = spec['hipX']
        tx = max(209, 6 + (pivot-b[0])*factor)
        tx = min(tx, 412 - (b[2]-pivot)*factor)
        anchor, target = [pivot, b[3]], [tx, 409]
    xy = [round(target[i] + (b[i]-anchor[i])*factor) for i in range(2)]
    size = [round((b[i+2]-b[i])*factor) for i in range(2)]
    assert min(xy) >= 4 and max(xy[i]+size[i] for i in range(2)) <= 414, (spec, xy, size)
    frame = Image.new('RGBA', (418,418))
    frame.alpha_composite(im.crop(b).resize(size, Image.Resampling.LANCZOS), xy)
    mask = Image.new('RGB', (418,418))
    source_mask = B.clothing_mask(im, spec, 'teal-top').convert('RGB')
    if spec.get('skates'):
        a = np.array(source_mask)
        a[round(b[3]-(b[3]-b[1])*.25):,:,2] = 0  # white skates/yellow wheels are hardware
        source_mask = Image.fromarray(a)
    mask.paste(source_mask.crop(b).resize(size, Image.Resampling.LANCZOS), xy)
    return frame, mask, (factor, anchor, target), desired/factor


def skin_hand(frame):
    a = np.array(frame).astype(float)
    r,g,b,alpha = [a[:,:,i] for i in range(4)]
    skin = (r>g+22)&(g>b+15)&(r>140)&(alpha>128)
    yy,xx = np.indices(skin.shape)
    bb = B.bounds(frame)
    skin &= (yy>bb[1]+.2*(bb[3]-bb[1])) & (yy<bb[1]+.65*(bb[3]-bb[1]))
    ys,xs = np.where(skin)
    if not len(xs): return None
    i = np.argmax(xs)
    return [int(xs[i]), int(ys[i])]


def star_tip(frame, index):
    a = np.array(frame).astype(float)
    r,g,b,alpha = [a[:,:,i] for i in range(4)]
    yy,xx = np.indices(r.shape)
    gold = (r>150)&(g>95)&(b<g*.70)&(r>g+12)&(alpha>160)&(yy<230)
    ys,xs = np.where(gold)
    assert len(xs), 'Missing painted wand star'
    selected = ys < ys.min()+7 if index == 0 else xs > xs.max()-7
    xs,ys = xs[selected],ys[selected]
    i = np.argmin((xs-xs.mean())**2+(ys-ys.mean())**2)
    return [int(xs[i]),int(ys[i])]


def supplement(kind, groups, common):
    frames=[]; masks=[]; records=[]
    for name, ratio, measurements in groups:
        for cell, (hip,chin,hem,contact) in enumerate(measurements):
            im, offset = source(name, cell)
            spec={'hipX':hip+offset,'chin':chin,'garmentBottom':hem}
            if name.startswith('toy-skate'):spec['skates']=True
            contact = [contact[0]+offset,contact[1]] if contact else None
            frame,mask,transform,render = pack(im,spec,common*ratio,contact)
            n=len(frames)
            target=transform[2]
            record={'bounds':B.bounds(frame),'source':f'sources/zoey/{name}.webp','cell':cell,
                    'sourceScaleRatio':ratio,'sourceAnchor':transform[1],
                    'packedScale':transform[0],'scale':render,'renderScale':render,
                    'anchorX':target[0]+16,'baseline':409,'targetY':409,'offsetX':0,
                    'hand':skin_hand(frame),'wandTip':None}
            if kind=='actions' and n<3:record['wandTip']=star_tip(frame,n)
            if kind=='ledge':record.update(corner=point(transform,contact))
            frames.append(frame);masks.append(mask);records.append(record)
    sheet=Image.new('RGBA',(1254,418*(len(frames)//3)))
    mask=Image.new('RGB',sheet.size)
    for n,(frame,m) in enumerate(zip(frames,masks)):
        xy=(n%3*418,n//3*418);sheet.paste(frame,xy);mask.paste(m,xy)
    artpath=G/f'assets/doll_zoey_{kind}.webp';maskpath=G/f'assets/masks/zoey_{kind}_mask.webp'
    B.save_webp(sheet,artpath);B.save_webp(mask,maskpath)
    report={'assetKey':'zoey','frames':records,'sha256':hashlib.sha256(artpath.read_bytes()).hexdigest(),
            'maskSha256':hashlib.sha256(maskpath.read_bytes()).hexdigest()}
    (H/f'zoey/reports/{kind}.json').write_text(json.dumps(report,indent=2)+'\n')
    review=Image.new('RGB',(1254,442*(len(frames)//3)),'#eee8db');draw=ImageDraw.Draw(review)
    for n,frame in enumerate(frames):
        x,y=n%3*418,n//3*442
        draw.rectangle((x,y,x+417,y+441),fill='#344c5b' if n%2 else '#eee8db')
        draw.text((x+5,y+5),f'{kind}-{n}',fill='#ffb24a');review.paste(frame,(x,y+24),frame)
    review.save(H/f'reports/zoey-{kind}.jpg',quality=90)
    return report


def main():
    (H/'zoey/reports').mkdir(exist_ok=True)
    manifest=json.loads((H/'manifests/zoey.json').read_text())
    runtime=B.build(manifest);B.check(manifest)
    path=G/'dolls.js';registry=read_assignment(path,'EXTRA_DOLLS',{})
    registry['zoey']=runtime;assignment(path,'EXTRA_DOLLS',registry)
    ref,_=B.source_frame(manifest,'idle-0');bb=B.bounds(ref)
    common=manifest['standingHeight']/(bb[3]-bb[1])  # her toys, actions and ledge poses at her own height
    # (hip, chin, top hem, optional contact) in original square-cell pixels.
    toy=supplement('toys',[
        ('toy-skate',1,[(430,215,325,None),(325,215,325,None),(300,215,325,None)]),
        ('toy-skate-actions',1,[(350,210,325,None),(350,225,335,None),(360,310,450,None)]),
        ('toy-pogo',1.10,[(435,285,395,None),(355,205,300,None),(310,210,315,None)]),
        ('toy-pogo-actions',1.04,[(350,210,330,None),(350,205,330,None),(360,330,450,None)]),
    ],common)
    act=supplement('actions',[
        ('special-wand',1,[(400,210,325,None),(360,210,325,None),(310,210,325,None)]),
        ('special-surf',.98,[(370,245,350,None),(390,250,380,None),(360,245,365,None)]),
        ('special-other',.94,[(320,255,380,None),(350,280,400,None),(345,220,345,None)]),
    ],common)
    # Register saddle throw by the measured hip seat, not source canvas bounds.
    ride=manifest['poses']['ride'];ride_seat=ride.get('seatFrame',[209,264])
    saddle=act['frames'][6]
    saddle_src,off=source('special-other',0)
    b=B.bounds(saddle_src);f=saddle['packedScale'];pivot=saddle['sourceAnchor'][0]
    seat=[saddle['anchorX']-16+(245+off-pivot)*f,409+(505-b[3])*f]
    saddle['offsetX']=(ride_seat[0]-209)-(seat[0]-(saddle['anchorX']-16))*saddle['scale']
    saddle['targetY']=ride_seat[1]-(seat[1]-409)*saddle['scale']
    (H/'zoey/reports/actions.json').write_text(json.dumps(act,indent=2)+'\n')
    ledge=supplement('ledge',[
        ('ledge',1,[(450,220,355,[590,260]),(390,220,350,[455,310]),(350,240,355,[390,575])]),
    ],common)
    path=G/'doll-art.js'
    for var in ['RIDE_TOY_SHEETS','ACTION_SHEETS','LEDGE_SHEETS']:
        keys=read_assignment(path,var,[])
        if 'zoey' not in keys:keys.append('zoey')
        assignment(path,var,keys)
    toyregistry=read_assignment(path,'RIDE_TOY_FRAMES',{})
    toyregistry['zoey']={'anchorX':[f['anchorX'] for f in toy['frames']],
                         'scale':[f['scale'] for f in toy['frames']]}
    assignment(path,'RIDE_TOY_FRAMES',toyregistry)
    acts=read_assignment(path,'ACTION_FRAMES',{});acts['zoey']=act['frames'];assignment(path,'ACTION_FRAMES',acts)
    ledges=read_assignment(path,'LEDGE_FRAMES',{});ledges['zoey']=ledge['frames'];assignment(path,'LEDGE_FRAMES',ledges)
    contacts=read_assignment(path,'LEDGE_ANCHORS',{});contacts['zoey']=[f['corner'] for f in ledge['frames']]
    assignment(path,'LEDGE_ANCHORS',contacts)
    anchor_path=G/'assets/doll_ledge_anchors.json'
    anchors_data=json.loads(anchor_path.read_text())
    anchors_data['dolls']['zoey']=[{'ledgeContact':f['corner'],'sourceScale':f['packedScale'],
                                  'bounds':f['bounds']} for f in ledge['frames']]
    anchor_path.write_text(json.dumps(anchors_data,indent=2)+'\n')
    # Measured broom grip per idle/run frame, plus exported semantic anchors.
    sheet=Image.open(G/'assets/doll_zoey_sprites.webp').convert('RGBA')
    anchors={};grips=[[],[]]
    for n,pose in enumerate(B.POSES):
        frame=sheet.crop((n%3*418,n//3*418,(n%3+1)*418,(n//3+1)*418))
        hand=skin_hand(frame);bounds=B.bounds(frame)
        anchors[pose]={'hand':hand,'hipX':209,'baseline':409,'bounds':bounds}
        if n<6:grips[n//3].append(hand)
    specpath=H.parent/'mounts/broom.json';spec=json.loads(specpath.read_text());spec['carryHands']['zoey']=grips
    specpath.write_text(json.dumps(spec,indent=2)+'\n')
    assignment(G/'broom.js','BROOM_ART',{k:spec[k] for k in ['grip','carryHands']})
    (H/'zoey/reports/anchors.json').write_text(json.dumps({'normal':anchors,'broomHands':grips,
        'riderSeat':ride_seat,'toys':toy['frames'],'actions':act['frames'],'ledge':ledge['frames']},indent=2)+'\n')
    print('Zoey: normal/menu + 12 toy + 9 special + 3 ledge frames, masks and measured anchors exported')


if __name__=='__main__': main()
