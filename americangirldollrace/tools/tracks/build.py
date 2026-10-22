"""Deterministic packing of reviewed ImageGen track art; no image API calls.

Keep source art and prompts. ImageGen repaints the offset panorama seam;
this exporter packs its central repair into the original and un-offsets it.
Use --check only after the complete requested set has been exported.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageOps

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[1]
NEW = ['horseshow', 'toyroom', 'candy', 'beach', 'wizard', 'autumn', 'clouds', 'space', 'festival', 'woods']
EXISTING = ['farm', 'fairy', 'town', 'winter', 'castles']
MOUNTS = ['reindeer', 'rocking_horse', 'carousel_horse', 'pony']
SIZES = {'background': (2172,724), 'hurdle': (160,170), 'powerups': (1280,256),
         'projectile': (128,128), 'card': (400,225)}


def save(im, path, exact=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp.webp')
    im.save(temp, 'WEBP', lossless=True, quality=88, method=6, exact=exact)
    temp.replace(path)


def bounds(im):
    return im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()


def clean(im):
    im = im.convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 4 else a))
    assert im.getchannel('A').getextrema()[0] == 0, 'Expected real transparent background'
    return im


def gap_cut(occupied, expected, reach):
    options=np.flatnonzero(~occupied[max(1,expected-reach):expected+reach])+max(1,expected-reach)
    assert len(options), 'Objects overlap across a nominal cell boundary; regenerate with more separation'
    nearest=int(min(options,key=lambda x:abs(x-expected)))
    lo=hi=nearest
    while lo>0 and not occupied[lo-1]:lo-=1
    while hi<len(occupied)-1 and not occupied[hi+1]:hi+=1
    return (lo+hi)//2


def atlas_cells(im):
    """Use real empty gaps, preserving off-grid feet, wheels and sparkles."""
    a=np.asarray(im.getchannel('A'))>8
    split=gap_cut(a.any(axis=1),im.height//2,round(im.height*.12))
    cells=[]
    for y0,y1 in [(0,split),(split,im.height)]:
        row=im.crop((0,y0,im.width,y1));occupied=(np.asarray(row.getchannel('A'))>8).any(axis=0)
        cuts=[0]+[gap_cut(occupied,round(im.width*n/3),round(im.width*.08)) for n in [1,2]]+[im.width]
        cells.extend(row.crop((cuts[n],0,cuts[n+1],row.height)) for n in range(3))
    return cells


def mount_cells(im):
    occupied=(np.asarray(im.getchannel('A'))>8).any(axis=1)
    cuts=[0]+[gap_cut(occupied,round(im.height*n/3),round(im.height*.1)) for n in [1,2]]+[im.height]
    cells=[]
    for row in range(3):
        strip=im.crop((0,cuts[row],im.width,cuts[row+1]))
        columns=(np.asarray(strip.getchannel('A'))>8).any(axis=0)
        xs=[0]+[gap_cut(columns,round(im.width*n/3),round(im.width*.1)) for n in [1,2]]+[im.width]
        for col in range(3):
            box=(xs[col],cuts[row],xs[col+1],cuts[row+1])
            cells.append((im.crop(box),box))
    return cells


def icon(im, size, fit, baseline=None):
    b = bounds(im)
    assert b, 'Empty sprite'
    assert b[0] > 0 and b[1] > 0 and b[2] < im.width and b[3] < im.height, 'Source sprite clips a cell edge'
    art = im.crop(b)
    art.thumbnail(fit, Image.Resampling.LANCZOS)
    result = Image.new('RGBA', size)
    xy = ((size[0]-art.width)//2, (size[1]-art.height)//2 if baseline is None else baseline-art.height)
    result.alpha_composite(art, xy)
    return result


def loop_background(key):
    folder = HERE/'sources'/key
    original = Image.open(folder/'background.webp').convert('RGB').resize((2172,724), Image.Resampling.LANCZOS)
    repair = Image.open(folder/'loop-repair.webp').convert('RGB').resize(original.size, Image.Resampling.LANCZOS)
    offset = ImageChops.offset(original, 1086, 0)
    # Lock the original landmark composition outside the edited join. Feather
    # the generated repair's edges, keeping its middle uninterrupted. The final
    # wrap boundary becomes adjacent pixels from the SAME repainted image.
    x = np.arange(2172)
    weight = np.clip((448-np.abs(x-1086))/128, 0, 1)
    mask = Image.fromarray(np.tile(np.round(weight*255).astype('uint8'), (724,1)))
    repaired = Image.composite(repair, offset, mask)
    return ImageChops.offset(repaired, -1086, 0)


def reviewed_emp_replacement(key, cell, expected):
    report_path = HERE/f'emp-redo/reports/{key}.json'
    if str(cell) != '2' or not report_path.exists(): return False
    # Check the old reviewed cell in the pre-EMP strip, then the new strip hash.
    before = Image.open(HERE/f'emp-redo/before/{key}.webp').convert('RGBA')
    assert hashlib.sha256(before.crop((512,0,768,256)).tobytes()).hexdigest() == expected
    report = json.loads(report_path.read_text())
    assert hashlib.sha256((GAME/report['path']).read_bytes()).hexdigest() == report['sha256']
    return True


def verify_toy_icon_cells(key,sheet):
    path=HERE/'toy-icons/verification.json'
    records=json.loads(path.read_text()) if path.exists() else {}
    for cell,expected in records.get(key,{}).get('cellSha256',{}).items():
        if reviewed_emp_replacement(key, cell, expected): continue
        x=int(cell)*256
        assert hashlib.sha256(sheet.crop((x,0,x+256,256)).tobytes()).hexdigest()==expected,(key,'Pickup cell differs from reviewed image',cell)


def verify_puddle_cells(key, sheet):
    path = HERE/'puddle-redos/verification.json'
    records = json.loads(path.read_text()) if path.exists() else {}
    if key not in records: return
    record = records[key]
    for cell, original in record['unchangedCellSha256'].items():
        expected = record.get('revisedCellSha256', {}).get(cell, original)
        x = int(cell)*256
        if reviewed_emp_replacement(key, cell, expected): continue
        actual = hashlib.sha256(sheet.crop((x,0,x+256,256)).tobytes()).hexdigest()
        assert actual == expected, (key, 'Non-oil cell changed', cell)
    oil = sheet.crop((768,0,1024,256))
    assert hashlib.sha256(oil.tobytes()).hexdigest() != record['beforeOilSha256'], (key, 'Oil cell was not replaced')
    b = bounds(oil)
    assert b and b[2]-b[0] > b[3]-b[1] and min(b[:2])>0 and b[2]<256 and b[3]<256, (key, 'Expected a flat, padded puddle')


def export_track(key, kind):
    folder = HERE/'sources'/key
    path = folder/f'{kind}.webp'
    if kind == 'background':
        if not (folder/'loop-repair.webp').exists(): return None
        result = loop_background(key)
    elif not path.exists():
        return None
    elif kind in ('hurdle','projectile'):
        im = clean(Image.open(path))
        result = icon(im, SIZES[kind], (150,145) if kind == 'hurdle' else (108,108), 170 if kind == 'hurdle' else None)
    elif kind == 'powerups':
        im = clean(Image.open(path))
        assert abs(im.width/im.height-1.5) < .02, 'Expected a 3-column, 2-row icon atlas'
        result = Image.new('RGBA', SIZES[kind])
        cells=atlas_cells(im)
        for n in range(5):
            result.alpha_composite(icon(cells[n],(256,256),(220,220)),(n*256,0))
        base = HERE/'toy-icons'/f'{key}-before.webp'
        if base.exists(): result = Image.open(base).convert('RGBA')
        blank = cells[5]
        assert (np.asarray(blank.getchannel('A'))>8).mean() < .005, 'Sixth source cell must be empty'
        # Requested puddle redos replace the entire oil cell, including empty
        # pixels, so the old cup/pot cannot remain underneath the new liquid.
        puddle_path = folder/'oil-puddle.webp'
        if puddle_path.exists():
            # Preserve the delivered sheet's decoded RGBA pixels exactly.
            # Repacking the old atlas can change RGB under transparent pixels.
            result = Image.open(HERE/'puddle-redos/base-sheets'/f'{key}.webp').convert('RGBA')
            replacement = icon(clean(Image.open(puddle_path)), (256,256), (220,160))
            result.paste(replacement, (768,0))
        for name,cell in [('jump',0),('boost',1)]:
            replacement = folder/f'{name}-icon.webp'
            if replacement.exists():
                result.paste(icon(clean(Image.open(replacement)),(256,256),(220,220)),(cell*256,0))
        if puddle_path.exists(): verify_puddle_cells(key,result)
        verify_toy_icon_cells(key,result)
    else:
        result = ImageOps.fit(Image.open(path).convert('RGB'),SIZES[kind],method=Image.Resampling.LANCZOS)
    target = GAME/'assets/tracks'/key/f'{kind}.webp'
    save(result,target,exact=kind == 'powerups')
    if kind == 'powerups' and (folder/'oil-puddle.webp').exists():
        verify_puddle_cells(key, Image.open(target).convert('RGBA'))
    return target


def export_mount(key):
    path = GAME/f'tools/mounts/sources/{key}-sheet.webp'
    if not path.exists(): return None
    im = clean(Image.open(path))
    assert im.width == im.height and im.width%3 == 0, 'Mount source must be an exact 3x3 grid'
    side = im.width//3
    meta_path = GAME/f'tools/mounts/{key}.json'
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {'seats':[[round(side*.54),round(side*.58)] for _ in range(9)]}
    split=mount_cells(im)
    cells=[item[0] for item in split]
    seats=[[seat[0]+n%3*side-box[0],seat[1]+n//3*side-box[1]] for n,(seat,(_,box)) in enumerate(zip(meta['seats'],split))]
    boxes = [bounds(c) for c in cells]
    for cell,b in zip(cells,boxes):
        assert b and min(b[:2])>0 and b[2]<cell.width and b[3]<cell.height, (key,'source clipping')
    scale = min(270/(boxes[0][3]-boxes[0][1]), *[min(220/max(1,s[0]-b[0]),188/max(1,b[2]-s[0]),400/(b[3]-b[1])) for b,s in zip(boxes,seats)])
    sheet = Image.new('RGBA',(1254,1254))
    frames=[]
    for n,(cell,b,seat) in enumerate(zip(cells,boxes,seats)):
        art=cell.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(418,418));frame.alpha_composite(art,(round(225+(b[0]-seat[0])*scale),409-bounds(art)[3]))
        sheet.alpha_composite(frame,(n%3*418,n//3*418))
        frames.append({'bounds':bounds(frame),'seat':[225,round(409+(seat[1]-b[3])*scale,2)],'scale':scale})
    target=GAME/f'assets/{key}_sprites.webp';save(sheet,target)
    meta.update(asset=str(target.relative_to(GAME)),status='Art delivered; optional mount gameplay registration remains separate.',scale=scale,frames=frames,sha256=hashlib.sha256(target.read_bytes()).hexdigest())
    meta_path.write_text(json.dumps(meta,indent=2)+'\n')
    return target


def review():
    report={}
    for key in NEW:
        path=GAME/f'assets/tracks/{key}/background.webp'
        if not path.exists() or not (HERE/f'sources/{key}/loop-repair.webp').exists(): continue
        im=Image.open(path).convert('RGB');a=np.asarray(im).astype(float)
        join=float(abs(a[:,0]-a[:,-1]).mean())
        ordinary=np.abs(a[:,1:]-a[:,:-1]).mean(axis=(0,2))
        report[key]={'wrapMeanDelta':round(join,4),'ordinaryColumn95thDelta':round(float(np.quantile(ordinary,.95)),4)}
        # Two unchanged copies, never mirrored. Put the wrap through the centre.
        repeated=Image.new('RGB',(4344,724));repeated.paste(im,(0,0));repeated.paste(im,(2172,0))
        repeated.resize((2172,362),Image.Resampling.LANCZOS).save(HERE/f'reports/{key}-repeat.jpg',quality=93)
    (HERE/'reports/loops.json').write_text(json.dumps(report,indent=2)+'\n')
    return report


def check():
    count=0
    for key in EXISTING+NEW:
        for kind in (['hurdle','powerups','projectile'] if key in EXISTING else list(SIZES)):
            path=GAME/f'assets/tracks/{key}/{kind}.webp'
            im=Image.open(path);im.load();assert im.size==SIZES[kind],path
            if kind in ('background','card'):assert im.mode=='RGB',path
            else:
                im=im.convert('RGBA');assert im.getchannel('A').getextrema()==(0,255),path
                if kind=='hurdle':assert bounds(im)[3]==170,path
                if kind=='powerups':
                    for n in range(5):assert bounds(im.crop((n*256,0,n*256+256,256))),path
                    verify_puddle_cells(key, im)
                    verify_toy_icon_cells(key, im)
            count+=1
    for key in MOUNTS:
        meta=json.loads((GAME/f'tools/mounts/{key}.json').read_text());path=GAME/meta['asset'];im=Image.open(path).convert('RGBA')
        assert im.size==(1254,1254) and hashlib.sha256(path.read_bytes()).hexdigest()==meta['sha256']
        for n,frame in enumerate(meta['frames']):
            b=bounds(im.crop((n%3*418,n//3*418,(n%3+1)*418,(n//3+1)*418)))
            assert b==tuple(frame['bounds']) and b[3]==409 and b[0]>=5 and b[2]<=413,(key,n)
    loops=review();assert len(loops)==len(NEW)
    for key,r in loops.items():assert r['wrapMeanDelta'] < max(8,r['ordinaryColumn95thDelta']*2), (key,r)
    print(f'{count} track assets, four 3x3 mount sheets and {len(loops)} direct-repeat joins passed')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    (HERE/'reports').mkdir(exist_ok=True)
    if args.check:return check()
    exported=[]
    for key in EXISTING+NEW:
        for kind in (['hurdle','powerups','projectile'] if key in EXISTING else list(SIZES)):
            try:
                path=export_track(key,kind)
                if path:exported.append(str(path.relative_to(GAME)))
            except (AssertionError,ValueError) as error:print(key,kind,'NEEDS REVIEW:',error)
    for key in MOUNTS:
        try:
            path=export_mount(key)
            if path:exported.append(str(path.relative_to(GAME)))
        except (AssertionError,ValueError) as error:print(key,'NEEDS REVIEW:',error)
    review()
    (HERE/'reports/assets.json').write_text(json.dumps({p:hashlib.sha256((GAME/p).read_bytes()).hexdigest() for p in exported},indent=2)+'\n')
    print(f'Exported {len(exported)} available assets')


if __name__=='__main__':main()
