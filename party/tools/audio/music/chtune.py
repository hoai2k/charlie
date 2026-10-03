import sys, os, json, numpy as np
from scipy.ndimage import median_filter
SR=44100
take=sys.argv[1]
r=json.load(open(f'results/{take}.json')); per=60/r['bpm']; step=per/4
buf=np.fromfile(f'chrome/{take}.f32',dtype=np.float32).reshape(-1,2)
ls=int(round(r['loopStart']*SR)); L=int(round(r['loop_seconds']*SR)); lm=buf[ls:ls+L].mean(1).astype(np.float64)
cache=f'work/{take}-hpss.npz'
n,hop=1024,128; fps=SR/hop; f=np.fft.rfftfreq(n,1/SR)
if not os.path.exists(cache):
    x=np.concatenate([lm,lm,lm]); pad=np.concatenate([np.zeros(n//2),x,np.zeros(n//2)])
    S=np.abs(np.fft.rfft(np.lib.stride_tricks.sliding_window_view(pad,n)[::hop]*np.hanning(n),axis=1)).astype(np.float32)
    Hm=median_filter(S,size=(31,1)); Pm=median_filter(S,size=(1,31)); Mp=Pm**2/(Hm**2+Pm**2+1e-12)
    np.savez(cache,P=S*Mp,H=S*(1-Mp))
z=np.load(cache); P,H=z['P'],z['H']
def flux(M,lo,hi):
    b=(f>=lo)&(f<hi); Lg=np.log1p(100*M[:,b]/(M[:,b].max()+1e-12)); d=np.diff(Lg,axis=0,prepend=Lg[:1]); return np.maximum(d,0).sum(1)
nfr=len(lm)/hop; a0,a1=int(nfr),int(2*nfr)
for band,M,lo,hi in [('kick',P,30,120),('kick150',P,30,150),('snare',P,1500,5000),('melody',H,400,3000)]:
    e=flux(M,lo,hi); e=np.convolve(e,np.ones(3)/3,'same')
    for k in [1.0,2.0,3.0]:
        seg=e[a0:a1]; med=np.median(seg); mad=np.median(np.abs(seg-med))
        loc=median_filter(e,size=int(0.5*fps))
        thr=loc+k*mad*1.4826
        g=int(0.6*step*fps); pk=[]
        for i in range(a0-50,a1+50):
            if e[i]>=e[i-1] and e[i]>e[i+1] and e[i]>thr[i]:
                if pk and i-pk[-1][0]<g:
                    if e[i]>pk[-1][1]: pk[-1]=(i,e[i])
                    continue
                pk.append((i,e[i]))
        t=np.array([p[0] for p in pk])/fps-a0/fps; t=t[(t>=-step/2)&(t<len(lm)/SR-step/2)]
        q=np.round(t/step); dev=(t-q*step)*1000
        print(f'{band:8s} k={k}: {len(t):4d} onsets, median dev {np.median(dev):5.1f} ms, within25 {np.mean(np.abs(dev)<=25)*100:5.1f}%, within25 after offset {np.mean(np.abs(dev-np.median(dev))<=25)*100:5.1f}%, on-beat share {np.mean((q%4)==0)*100:4.0f}%')
