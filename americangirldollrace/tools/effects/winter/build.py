"""Pack reviewed ImageGen Winter art without changing source anatomy."""
from pathlib import Path
import json, hashlib, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects, binary_dilation

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]

def clean(im):
    im = im.convert('RGBA')
    a = np.array(im)
    a[a[:, :, 3] <= 12] = 0
    return Image.fromarray(a)

def cells(im, cols, rows):
    return [im.crop((round(c*im.width/cols), round(r*im.height/rows),
                     round((c+1)*im.width/cols), round((r+1)*im.height/rows)))
            for r in range(rows) for c in range(cols)]

def isolated_cells(im, cols, rows, threshold=80):
    # ImageGen's rows need not have equal gutters. Locate complete connected
    # silhouettes, preserving their pixels rather than cutting through feet.
    a=np.array(im); labels,count=label(a[:,:,3]>threshold)
    groups=[]
    for i,s in enumerate(find_objects(labels)):
        if s is not None:
            area=int(np.sum(labels[s]==i+1))
            if area>1000: groups.append((area,i+1,s))
    groups=sorted(groups,reverse=True)[:cols*rows]
    assert len(groups)==cols*rows
    groups.sort(key=lambda g:(g[2][0].start+g[2][0].stop)/2)
    ordered=[]
    for row in range(rows): ordered+=sorted(groups[row*cols:(row+1)*cols],key=lambda g:g[2][1].start)
    result=[]
    for _,lab,s in ordered:
        mask=binary_dilation(labels==lab,iterations=4)
        cut=a.copy();cut[~mask]=0
        ys,xs=np.where(cut[:,:,3]>0);b=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
        assert b[0]>0 and b[1]>0 and b[2]<im.width and b[3]<im.height,('source clipped',b)
        crop=Image.fromarray(cut).crop(b);pad=Image.new('RGBA',(crop.width+20,crop.height+20));pad.paste(crop,(10,10));result.append(pad)
    return result

def pack(src, size, scale, center, baseline):
    b = src.getbbox()
    assert b and b[0] > 0 and b[1] > 0 and b[2] < src.width and b[3] < src.height, ('clipped source', b, src.size)
    art = src.crop(b).resize((round((b[2]-b[0])*scale), round((b[3]-b[1])*scale)), Image.Resampling.LANCZOS)
    x = round(center-art.width/2); y = baseline-art.height
    assert x > 0 and y > 0 and x+art.width < size and y+art.height < size
    frame = Image.new('RGBA', (size, size)); frame.alpha_composite(art, (x,y))
    return frame, {'sourceBounds':b, 'scale':scale, 'offset':[x,y], 'bounds':frame.getbbox()}

def save(im, path):
    im.save(path, 'WEBP', lossless=True, exact=True, method=6)

def build_snowman():
    src = clean(Image.open(HERE/'snowman-source.webp')); frames=isolated_cells(src,2,2)
    scale=400/max(c.getbbox()[3]-c.getbbox()[1] for c in frames)
    out=Image.new('RGBA',(2048,512)); report=[]
    for n,c in enumerate(frames):
        f,m=pack(c,512,scale,256,490);out.paste(f,(n*512,0));report.append(m)
    save(out,GAME/'assets/snowman_sprites.webp')
    (HERE/'snowman-report.json').write_text(json.dumps({'frames':report,'footAnchor':[256,490],'commonScale':scale},indent=2)+'\n')
    return out

def build_icon():
    original=Image.open(HERE/'winter-powerups-before.webp').convert('RGBA')
    icon=clean(Image.open(HERE/'snowman-icon-source.webp'))
    b=icon.getbbox();scale=min(222/(b[2]-b[0]),222/(b[3]-b[1]))
    f,m=pack(icon,256,scale,128,239)
    out=original.copy();out.paste(f,(512,0))
    for n in [0,1,3,4]:
        box=(n*256,0,(n+1)*256,256)
        assert np.array_equal(np.array(original.crop(box)),np.array(out.crop(box)))
    save(out,GAME/'assets/tracks/winter/powerups.webp')
    reopened=Image.open(GAME/'assets/tracks/winter/powerups.webp').convert('RGBA')
    assert np.array_equal(np.array(out),np.array(reopened))
    (HERE/'snowman-icon-report.json').write_text(json.dumps({'empCell':2,'unchangedCells':[0,1,3,4],**m},indent=2)+'\n')
    return out

def build_ice():
    src=clean(Image.open(HERE/'icetroll-source.webp'));frames=isolated_cells(src,3,4)
    ref=cells(Image.open(GAME/'assets/monster_sprites.webp').convert('RGBA'),3,4)
    scale=(ref[0].getbbox()[3]-ref[0].getbbox()[1])/(frames[0].getbbox()[3]-frames[0].getbbox()[1])
    out=Image.new('RGBA',(1254,1672));report=[]
    for n,c in enumerate(frames):
        rb=ref[n].getbbox();b=c.getbbox()
        factor=min(scale,396/(b[2]-b[0]),396/(b[3]-b[1]))
        if n>=9: factor=min((rb[2]-rb[0])/(b[2]-b[0]),(rb[3]-rb[1])/(b[3]-b[1]))
        f,m=pack(c,418,factor,(rb[0]+rb[2])/2,407)
        out.paste(f,(n%3*418,n//3*418));report.append(m)
    save(out,GAME/'assets/icetroll_sprites.webp')
    (HERE/'icetroll-report.json').write_text(json.dumps({'frames':report,'baseline':407,'reference':'assets/monster_sprites.webp'},indent=2)+'\n')
    if (HERE/'icetroll-melt-source.webp').exists():
        build_melt()
        out=Image.open(GAME/'assets/icetroll_sprites.webp').convert('RGBA')
    return out

def build_melt():
    frames=isolated_cells(clean(Image.open(HERE/'icetroll-melt-source.webp')),3,2,threshold=12)
    boxes=[c.getbbox() for c in frames]
    w0=boxes[0][2]-boxes[0][0];h0=boxes[0][3]-boxes[0][1]
    scale=min(306/w0,151/h0,378/max(b[2]-b[0] for b in boxes))
    out=Image.new('RGBA',(2508,418));report=[]
    for n,c in enumerate(frames):
        f,m=pack(c,418,scale,210,407);out.paste(f,(n*418,0));report.append(m)
    save(out,GAME/'assets/icetroll_melt_sprites.webp')
    target=GAME/'assets/icetroll_sprites.webp';before=Image.open(target).convert('RGBA');after=before.copy()
    after.paste(out.crop((0,0,418,418)),(836,1254))
    hashes=[]
    for n in range(11):
        box=(n%3*418,n//3*418,n%3*418+418,n//3*418+418)
        assert np.array_equal(np.array(before.crop(box)),np.array(after.crop(box)))
        hashes.append(hashlib.sha256(before.crop(box).tobytes()).hexdigest())
    save(after,target)
    monster_report=HERE/'icetroll-report.json'
    if monster_report.exists():
        current=json.loads(monster_report.read_text());current['frames'][11]=report[0]
        current['defeatedOverride']='icetroll-melt-source.webp frame0; owner requests no face/head'
        monster_report.write_text(json.dumps(current,indent=2)+'\n')
    data={'frames':report,'commonScale':scale,'spriteAnchor':[193,409],'pileCenterX':210,'baseline':407,
          'firstFrameEqualsDefeatedCell':True,'unchangedMonsterCells':list(range(11)),
          'unchangedCellRgbaHashes':hashes,'sequence':['faceless ice heap','wet heap','half melted','few chunks','tiny remnants','water only']}
    (HERE/'icetroll-melt-report.json').write_text(json.dumps(data,indent=2)+'\n')
    return out

if __name__=='__main__':
    for key in sys.argv[1:] or ['snowman','icon','ice']:
        out={'snowman':build_snowman,'icon':build_icon,'ice':build_ice,'melt':build_melt}[key]()
        print(key,out.size,hashlib.sha256(out.tobytes()).hexdigest())
