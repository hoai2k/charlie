import sys, json, numpy as np
sys.path.insert(0,'.'); import mlib
from scipy.ndimage import minimum_filter1d
SR=44100; take=sys.argv[1]
r=json.load(open(f'results/{take}.json')); per=60/r['bpm']; step=per/4
buf=np.fromfile(f'chrome/{take}.f32',dtype=np.float32).reshape(-1,2)
ls=int(round(r['loopStart']*SR)); L=int(round(r['loop_seconds']*SR)); lm=buf[ls:ls+L].mean(1).astype(np.float64)
x=np.concatenate([lm,lm,lm])
hop=128; fps=SR/hop
e=mlib.amp_env(x,SR,(50,130),win=0.012)[::hop]
ldb=20*np.log10(e+1e-6)
mn=minimum_filter1d(ldb,int(0.06*fps)); rise=np.empty_like(ldb); sh=int(0.03*fps); rise[sh:]=ldb[sh:]-mn[:-sh]; rise[:sh]=0  # rise vs min of the previous 40 ms
d=np.convolve(np.diff(ldb,prepend=ldb[0]),np.ones(3)/3,'same')
a0,a1=int(len(lm)/hop),int(2*len(lm)/hop)
for thr in [8,12,16]:
    pk=[];g=int(0.6*step*fps)
    for i in range(a0-50,a1+50):
        # onset frame = steepest dB rise, accepted if the 40 ms rise exceeds thr and level is within 30 dB of the max
        if d[i]>=d[i-1] and d[i]>d[i+1] and rise[min(i+int(0.02*fps),len(rise)-1)]>thr and ldb[i+int(0.02*fps)]>ldb[a0:a1].max()-30:
            if pk and i-pk[-1][0]<g:
                if d[i]>pk[-1][1]: pk[-1]=(i,d[i])
                continue
            pk.append((i,d[i]))
    t=np.array([p[0] for p in pk])/fps-a0/fps; t=t[(t>=-step/2)&(t<len(lm)/SR-step/2)]
    q=np.round(t/step); dev=(t-q*step)*1000
    print(f'thr {thr}: {len(t)} kicks, median dev {np.median(dev):.1f}, within25 {np.mean(np.abs(dev)<=25)*100:.1f}%, on-beat {np.mean(q%4==0)*100:.0f}%')
