import numpy as np, sys, time
t0=time.time()
sr=22050; x=np.fromfile(sys.argv[1],dtype=np.float32)
hop=256; n=1024; win=np.hanning(n)
frames=np.lib.stride_tricks.sliding_window_view(x,n)[::hop]*win
S=np.abs(np.fft.rfft(frames,axis=1)); f=np.fft.rfftfreq(n,1/sr)
logS=np.log1p(10*S)
def flux(lo,hi):
    b=(f>=lo)&(f<hi); d=np.diff(logS[:,b],axis=0); e=np.maximum(d,0).sum(1); e=e-np.convolve(e,np.ones(16)/16,'same'); return np.maximum(e,0)
fps=sr/hop
full=flux(30,8000); kick=flux(30,150); mel=flux(400,3000)
# tempo by autocorrelation of onset envelope (70-180 bpm)
env=full-full.mean(); ac=np.correlate(env,env,'full')[len(env)-1:]
lags=np.arange(len(ac)); bpm=60*fps/np.maximum(lags,1)
m=(bpm>=70)&(bpm<=180); w=np.exp(-0.5*(np.log2(bpm/120)/0.9)**2)
best=lags[m][np.argmax((ac*w)[m])]; tempo=60*fps/best
# refine tempo and phase by comb search
bestscore=-1
for T in np.linspace(tempo*0.98,tempo*1.02,81):
    p=60*fps/T
    for ph in np.arange(0,p,0.5):
        idx=(ph+np.arange(0,len(full)/p-1)*p).astype(int); idx=idx[idx<len(full)]
        sc=full[idx].mean()
        if sc>bestscore: bestscore,bt,bph=sc,T,ph
period=60*fps/bt; beats=(bph+np.arange(0,len(full)/period)*period)/fps
# onset picks per band, quantized to 8ths
def picks(e,thr):
    th=np.percentile(e,thr); pk=[i for i in range(1,len(e)-1) if e[i]>th and e[i]>=e[i-1] and e[i]>=e[i+1]]
    return np.array(pk)/fps
def quant(ts,div):
    g=(ts-bph/fps)/(60/bt)*div; q=np.round(g); err=np.abs(g-q)/div*60/bt*1000
    return q/div, err
ko=picks(kick,90); mo=picks(mel,92)
kq,ke=quant(ko,2); mq,me=quant(mo,4)
dur=len(x)/sr
print(f'duration {dur:.1f}s  tempo {bt:.2f} bpm  beats {len(beats)}  analysis {time.time()-t0:.1f}s')
print(f'kick onsets {len(ko)}, median offset from 8th grid {np.median(ke):.0f} ms; melody onsets {len(mo)}, median offset from 16th grid {np.median(me):.0f} ms')
on_beat=np.mean(np.abs(kq-np.round(kq))<1e-6)
print(f'kick onsets landing on a whole beat: {on_beat*100:.0f}%')
# section energy per 8 bars
rms=np.sqrt(np.convolve(x**2,np.ones(sr)/sr,'same'))[::sr]
bars=int(dur/(4*60/bt)); spb8=8*4*60/bt
print('energy per 8 bars:', ' '.join(f'{rms[int(i*spb8):int((i+1)*spb8)].mean():.2f}' for i in range(int(dur/spb8))))
# difficulty charts
for name,src,div,maxd in [('easy',kq,1,1.0),('normal',np.union1d(kq,np.round(mq*2)/2),2,0.5),('hard',np.union1d(kq,mq),4,0.25)]:
    q=np.unique(np.round(src*div)/div); keep=[];last=-9
    for b in q:
        if b-last>=maxd-1e-6: keep.append(b); last=b
    print(f'{name:6s}: {len(keep)} notes ({len(keep)/dur:.2f}/s)')
# drift check: best phase per 20 s window at the global tempo; then fit tempo from phase slope
period=60*fps/bt; W=int(20*fps); phs=[]
for s0 in range(0,len(full)-W,W):
    seg=kick[s0:s0+W]+full[s0:s0+W]
    sc=[seg[(ph+np.arange(0,W/period-1)*period).astype(int)].sum() for ph in np.arange(0,period,0.25)]
    phs.append(((s0+np.arange(0,period,0.25)[int(np.argmax(sc))]) % period)/fps*1000)
print('phase per 20s window (ms):', ' '.join(f'{p:.0f}' for p in phs))
# fine tempo scan on kick band with tight grid
best=(0,0,0)
for T in np.arange(135,150,0.01):
    p=60*fps/T
    for ph in np.arange(0,p,1.0):
        idx=(ph+np.arange(0,len(kick)/p-1)*p).astype(int)
        sc=kick[idx].mean()
        if sc>best[0]: best=(sc,T,ph)
print('kick-locked tempo %.2f bpm' % best[1])
p=60*fps/best[1]; g=(ko*fps-best[2])/p; err=np.abs(g-np.round(g))*p/fps*1000
print('kick onsets within 40 ms of a beat at that tempo: %.0f%%' % (np.mean(err<40)*100))
