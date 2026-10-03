import sys, json, numpy as np
sys.path.insert(0,'.'); import mlib
from scipy.ndimage import minimum_filter1d, maximum_filter1d
SR=44100
def kick_steps(lm, bpm, steps):
    per=60/bpm; step=per/4
    x=np.concatenate([lm[-SR:],lm,lm[:SR]])
    hop=64; fps=SR/hop
    e=mlib.amp_env(x,SR,(50,130),win=0.012)[::hop]; ldb=20*np.log10(e+1e-6)
    d=np.convolve(np.diff(ldb,prepend=ldb[0]),np.ones(5)/5,'same')
    w=int(0.04*fps)
    mn=minimum_filter1d(ldb,w,origin=(w-1)//2)   # min over [i-w+1, i]... approx previous window
    mx=maximum_filter1d(ldb,w,origin=-(w//2))    # max over [i, i+w)
    rise_at=lambda j: mx[j]-mn[j]
    times=[];rises=[]
    for k in range(steps):
        c=(SR+k*step*SR)/hop; a,b=int(c-0.4*step*fps),int(c+0.4*step*fps)
        j=a+int(np.argmax(d[a:b])); times.append((j*hop-SR)/SR); rises.append(rise_at(j))
    return np.array(times),np.array(rises)
if __name__=='__main__':
    take=sys.argv[1]
    r=json.load(open(f'results/{take}.json')); bpm=r['bpm']; steps=r['bars']*16; step=60/bpm/4
    buf=np.fromfile(f'chrome/{take}.f32',dtype=np.float32).reshape(-1,2)
    ls=int(round(r['loopStart']*SR)); L=int(round(r['loop_seconds']*SR)); lm=buf[ls:ls+L].mean(1).astype(np.float64)
    t,rs=kick_steps(lm,bpm,steps)
    dev=(t-np.arange(steps)*step)*1000
    print('rise percentiles by step position in beat (0=on beat):')
    for p in range(4): print('  pos',p,np.round(np.percentile(rs[p::4],[10,50,90]),1))
    for thr in [8,10,12]:
        on=rs>=thr
        print(f'thr {thr}: {on.sum()} onsets, on-beat {np.mean(np.arange(steps)[on]%4==0)*100:.0f}%, median dev {np.median(dev[on]):.1f} ms, within25 {np.mean(np.abs(dev[on])<=25)*100:.1f}%')
