import sys, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
sys.path.insert(0,'.'); import mlib
from scipy import signal
name, t_a, bpm, t0 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
sr=22050; x=mlib.decode(f'raw/{name}.mp3' if not name.endswith('.wav') else name,sr,1)
a,b=int(t_a*sr),int((t_a+2.5)*sr); t=np.arange(a,b)/sr
lo=signal.sosfiltfilt(signal.butter(4,160,'low',fs=sr,output='sos'),x)
hi=signal.sosfiltfilt(signal.butter(4,[1500,5000],'band',fs=sr,output='sos'),x)
fig,ax=plt.subplots(3,1,figsize=(16,8),sharex=True)
ax[0].plot(t,x[a:b],lw=.5); ax[1].plot(t,lo[a:b],lw=.6); ax[2].plot(t,hi[a:b],lw=.4)
env,fps,fb=mlib.env_for_beats(x)
fi=np.arange(int(t_a*fps),int((t_a+2.5)*fps)); ax[0].plot(fi/fps,env[fi]/env[fi].max()*np.abs(x[a:b]).max(),'r')
per=60/bpm
for k in np.arange(np.ceil((t_a-t0)/per), (t_a+2.5-t0)/per):
    for x_ in ax: x_.axvline(t0+k*per,color='k',ls=':',lw=.8)
plt.tight_layout(); plt.savefig(f'plot-{name.replace("/","_")}.png',dpi=70)
