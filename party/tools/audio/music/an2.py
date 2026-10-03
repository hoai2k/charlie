import sys, numpy as np
sys.path.insert(0,'.')
import mlib
from prompts import SONGS
def kickgrid(xm, sr, bpm, t0, dur):
    per=60/bpm; times=np.arange(t0, dur-0.1, per)
    on, st = mlib.lowband_onsets(xm, sr, times, search=0.12)
    return times, on, st
for name in sys.argv[1:]:
    song=name.rsplit('-',1)[0]; tgt=SONGS[song]['bpm']
    x=mlib.decode(f'raw/{name}.mp3',22050,1); sr=22050
    r=mlib.estimate_tempo(x,tgt); bpm=r['bpm']; per=60/bpm
    # global phase from whole-track z
    z=mlib.zbeat(r['env'],r['fps'],bpm); t0=(-np.angle(z)/(2*np.pi)*per)%per
    times,on,st=kickgrid(x,sr,bpm,t0,len(x)/sr)
    dev=(on-times)*1000; s=st/np.median(st)
    print(f'{name} bpm {bpm:.3f} t0 {t0*1000:.0f}ms; kick strength median-normalized percentiles 10/50/90: {np.percentile(s,10):.2f} {np.percentile(s,50):.2f} {np.percentile(s,90):.2f}')
    # per 10 s windows: median deviation of strong kicks, fraction strong
    for w in range(0,int(len(x)/sr),10):
        m=(times>=w)&(times<w+10); strong=m&(s>0.5)
        print(f'  {w:3d}s: strong {strong.sum()}/{m.sum()} median dev {np.median(dev[strong]) if strong.any() else np.nan:6.1f} ms  iqr {np.subtract(*np.percentile(dev[strong],[75,25])) if strong.sum()>2 else np.nan:5.1f}')
    # off-beat check: strength at half-beat
    on2,st2=mlib.lowband_onsets(x,sr,times+per/2,search=0.06)
    print(f'  lowband rise at offbeats/onbeats: {np.median(st2)/np.median(st):.2f}')
