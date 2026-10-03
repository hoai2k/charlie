import sys, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
sys.path.insert(0,'.'); import mlib
from plans import SONGS
names=sys.argv[1:]
fig,axs=plt.subplots(len(names),1,figsize=(18,2.6*len(names)))
axs=np.atleast_1d(axs)
for ax,name in zip(axs,names):
    sid=name.rsplit('-',1)[0]; take=int(name.rsplit('-',1)[1]); S=SONGS[sid]; per=60/S['bpm']
    sr=22050; x=mlib.decode(f'raw/{name}.mp3',sr,1)
    S_,f=mlib.stft_mag(x,sr,n=2048,hop=512); S_=S_[:, f<8000]; 
    mel=np.log10(S_.T**2+1e-9); 
    edges=np.geomspace(40,8000,48); fb=f[f<8000]
    M=np.stack([mel[(fb>=edges[i])&(fb<edges[i+1])].mean(0) if ((fb>=edges[i])&(fb<edges[i+1])).any() else np.zeros(mel.shape[1]) for i in range(47)])
    ax.imshow(M,aspect='auto',origin='lower',extent=[0,len(x)/sr,0,47],cmap='magma',vmin=np.percentile(M,30),vmax=np.percentile(M,99.5))
    b=0
    for nm,bars,kind,*_ in S['takes'][take-1]['sections']:
        ax.axvline(b*4*per,color='cyan',lw=1); ax.text(b*4*per+0.3,44,nm,color='cyan',fontsize=8); b+=bars
    for k in range(0,int(len(x)/sr/per/4)+1): ax.axvline(k*4*per,color='w',lw=.3,alpha=.4)
    ax.set_title(name,fontsize=9); ax.set_yticks([])
plt.tight_layout(); plt.savefig('secplot.png',dpi=55)
