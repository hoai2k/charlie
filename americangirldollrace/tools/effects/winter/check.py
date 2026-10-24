"""Check shipped Winter alpha, baselines, anchors and unchanged icon cells."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

HERE=Path(__file__).resolve().parent
GAME=HERE.parents[2]
for key,size,cols,rows,baseline in [('snowman',(2048,512),4,1,490),('icetroll',(1254,1672),3,4,407)]:
    im=Image.open(GAME/f'assets/{key}_sprites.webp').convert('RGBA')
    assert im.size==size
    for n in range(cols*rows):
        w,h=size[0]//cols,size[1]//rows
        frame=im.crop((n%cols*w,n//cols*h,n%cols*w+w,n//cols*h+h));a=np.array(frame)[:,:,3]
        assert a.min()==0 and a.max()>200
        assert not a[0].any() and not a[-1].any() and not a[:,0].any() and not a[:,-1].any()
        assert abs(frame.getbbox()[3]-baseline)<=1
    print(key,'size, genuine alpha, all frame margins and foot baseline passed')
old=Image.open(HERE/'winter-powerups-before.webp').convert('RGBA')
new=Image.open(GAME/'assets/tracks/winter/powerups.webp').convert('RGBA')
for n in [0,1,3,4]:
    box=(n*256,0,(n+1)*256,256)
    assert np.array_equal(np.array(old.crop(box)),np.array(new.crop(box)))
assert not np.array_equal(np.array(old.crop((512,0,768,256))),np.array(new.crop((512,0,768,256))))
print('Winter icon: only EMP cell2 changed')
anchors=json.loads((HERE/'icetroll-anchors.json').read_text())
ice=Image.open(GAME/'assets/icetroll_sprites.webp').convert('RGBA')
for n,(x,y) in enumerate(anchors['grabHands']):
    assert ice.getpixel((n*418+x,836+y))[3]>100
print('All three hand contacts fall inside the painted hands')

melt_path=GAME/'assets/icetroll_melt_sprites.webp'
if melt_path.exists():
    import hashlib
    melt=Image.open(melt_path).convert('RGBA');assert melt.size==(2508,418)
    meta=json.loads((HERE/'icetroll-melt-report.json').read_text())
    heights=[]
    for n in range(6):
        f=melt.crop((n*418,0,(n+1)*418,418));a=np.array(f)[:,:,3];b=f.getbbox()
        assert b and abs(b[3]-407)<=1 and a.min()==0 and a.max()>100
        assert not a[0].any() and not a[-1].any() and not a[:,0].any() and not a[:,-1].any()
        heights.append(b[3]-b[1])
    assert heights==sorted(heights,reverse=True),heights
    assert np.array_equal(np.array(ice.crop((836,1254,1254,1672))),np.array(melt.crop((0,0,418,418))))
    for n,expected in enumerate(meta['unchangedCellRgbaHashes']):
        f=ice.crop((n%3*418,n//3*418,n%3*418+418,n//3*418+418))
        assert hashlib.sha256(f.tobytes()).hexdigest()==expected
    print('Melt: six aligned frames, descending heights, exact defeated-cell match; other11 monster cells unchanged')

stagger_path=GAME/'assets/icetroll_stagger_sprites.webp'
if stagger_path.exists():
    im=Image.open(stagger_path).convert('RGBA');assert im.size==(836,418)
    meta=json.loads((HERE/'icetroll-stagger-report.json').read_text())
    assert len({f['scale'] for f in meta['frames']})==1
    for n in range(2):
        f=im.crop((n*418,0,n*418+418,418));a=np.array(f)[:,:,3];b=f.getbbox()
        assert a.min()==0 and a.max()>200 and b[3]==407
        assert not a[0].any() and not a[-1].any() and not a[:,0].any() and not a[:,-1].any()
        # Only the bottom five rows: the perspective front foot is higher.
        ys,xs=np.where((a>80)&(np.indices(a.shape)[0]>=402))
        assert abs(xs.mean()-150)<4,(n,xs.mean())
    print('Stagger: two418px cells, true alpha/margins, common scale and rear sole x150 baseline407')
