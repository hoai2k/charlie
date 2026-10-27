import sys, numpy as np
sys.path.insert(0,'.'); import mlib
from plans import SONGS
SR=22050
def profile(name, phase=None):
    sid=name.rsplit('-',1)[0]; take=int(name.rsplit('-',1)[1]); S=SONGS[sid]; per=60/S['bpm']
    x=mlib.decode(f'raw/{name}.mp3',SR,1); dur=len(x)/SR
    if phase is None:
        e=mlib.amp_env(x,SR); f=mlib.fold(e,SR,per); phase,_=mlib.attack_of(f,per)
        if phase>per/2: phase-=per
    nb=int((dur-phase)/(4*per))
    fb,fps=mlib.flux_bands(x.astype(np.float32),SR,{'all':(60,8000),'low':(30,150),'hi':(2000,8000)})
    # per-16th onset pattern per bar (rhythm fingerprint)
    pat=[];lev=[];den=[]
    for b in range(nb):
        t0=phase+b*4*per
        row=[]
        for k in range(16):
            a=int((t0+k*per/4-0.02)*fps); c=int((t0+k*per/4+0.04)*fps)
            row+= [fb['low'][a:c].max(), fb['hi'][a:c].max(), fb['all'][a:c].max()]
        pat.append(np.array(row)); lev.append(10*np.log10(np.mean(x[int(t0*SR):int((t0+4*per)*SR)]**2)+1e-12))
    pat=np.array(pat); pat=pat/ (np.median(pat,0)+1e-9)
    lev=np.array(lev)
    nov=[0]+[float(np.abs(np.log1p(pat[b])-np.log1p(pat[b-1])).mean()) for b in range(1,nb)]
    return phase, lev, np.array(nov), pat
for name in sys.argv[1:]:
    sid=name.rsplit('-',1)[0]; take=int(name.rsplit('-',1)[1])
    ph,lev,nov,_=profile(name)
    plan=[];b=0
    for nm,bars,*_ in SONGS[sid]['takes'][take-1]['sections']: plan.append(b); b+=bars
    med=np.median(lev)
    print(f'{name} phase {ph*1000:.0f} ms; bar: level(dB rel median)/novelty  ("|" = planned boundary)')
    print('  '+' '.join(('|' if i in plan else '')+f'{i}:{lev[i]-med:+.0f}/{nov[i]:.2f}' for i in range(len(lev))))
