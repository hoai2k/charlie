"""Validate delivered puddle sheets and cell-isolation evidence."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image

HERE=Path(__file__).resolve().parent;GAME=HERE.parents[2]
for path in sorted((HERE/'reports').glob('*.json')):
    report=json.loads(path.read_text());key=report['track']
    target=GAME/f'assets/tracks/{key}/powerups.webp'
    im=Image.open(target).convert('RGBA');before=Image.open(HERE/f'before/{key}.webp').convert('RGBA')
    assert im.size==(1280,256)
    assert hashlib.sha256(target.read_bytes()).hexdigest()==report['sha256']
    assert .48<=report['mainPoolHeightOverWidth']<=.62
    for n in [0,1,2,4]:
        b=(n*256,0,(n+1)*256,256)
        assert np.array_equal(np.array(im.crop(b)),np.array(before.crop(b)))
    a=np.array(im.crop((768,0,1024,256)))[:,:,3]
    assert a.min()==0 and a.max()>200
    assert not a[0].any() and not a[-1].any() and not a[:,0].any() and not a[:,-1].any()
    print(key,'angle, alpha/margins, hash and unchanged four cells passed')
