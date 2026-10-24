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
