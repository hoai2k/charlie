import sys, numpy as np
sys.path.insert(0,'.'); import mlib
from prompts import SONGS
for name in sys.argv[1:]:
    song=name.rsplit('-',1)[0]; tgt=SONGS[song]['bpm']
    sr=22050; x=mlib.decode(f'raw/{name}.mp3',sr,1); dur=len(x)/sr
    for label,band in [('full',None),('low',(0,160)),('hf',(2000,8000))]:
        e=mlib.amp_env(x,sr,band)
        bpm,tr=mlib.refine_bpm_fold(e,sr,tgt,6,dur-6)
        per=60/bpm; at=mlib.unwrap_ms([r[1] for r in tr],per)*1000
        print(f'{name} {label:4s} bpm {bpm:.3f} attack ms per window:', ' '.join(f'{a:.0f}' for a in at), '| contrast', ' '.join(f'{r[2]:.1f}' for r in tr[::2]))
