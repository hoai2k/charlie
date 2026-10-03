import sys, numpy as np
sys.path.insert(0,'.'); import mlib
from plans import SONGS, plan
for name in sys.argv[1:]:
    sid=name.rsplit('-',1)[0]; tgt=SONGS[sid]['bpm']
    sr=22050; x=mlib.decode(f'raw/{name}.mp3',sr,1); dur=len(x)/sr
    for lab,band in [('full',None),('hf',(2000,8000))]:
        e=mlib.amp_env(x,sr,band)
        grid=np.arange(tgt*0.96,tgt*1.04,tgt*0.0002)
        con=[np.mean([r[2] for r in mlib.fold_track(e,sr,T,win=16,hopw=16,t_lo=4,t_hi=dur-4)]) for T in grid]
        T0=grid[int(np.argmax(con))]
        tr=mlib.fold_track(e,sr,T0,win=6,hopw=3)
        per=60/T0; ph=mlib.unwrap_ms([r[1] for r in tr],per)*1000
        print(f'{name} {lab}: dur {dur:.1f} best {T0:.3f} (target {tgt}) phase per 6s window (ms/contrast):')
        print('   '+' '.join(f'{r[0]:.0f}:{p:.0f}/{r[2]:.1f}' for r,p in zip(tr,ph)))
