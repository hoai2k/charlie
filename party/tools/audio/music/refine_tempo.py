import sys, json, numpy as np
sys.path.insert(0,'.'); import onsets2 as O
for t in sys.argv[1:]:
    r=json.load(open(f'results/{t}.json')); per=60/r['bpm']
    x=np.fromfile(f'chrome/{t}.f32',dtype=np.float32).reshape(-1,2).astype(np.float64).mean(1)
    evs,_=O.analyse(x,r['start'],r['bpm'],r['lengthBeats'],0,len(x)/44100)
    sel=[e for e in evs if abs(e['beat']-round(e['beat']))<0.15 and max(e['low'],e['high'])>=0.4]
    b=np.array([round(e['beat']) for e in sel]); err=np.array([(e['beat']-round(e['beat']))*per*1000 for e in sel])
    # robust linear fit (iteratively drop >3 MAD)
    m=np.ones(len(b),bool)
    for _ in range(3):
        p=np.polyfit(b[m],err[m],1); res=err-np.polyval(p,b); mad=np.median(np.abs(res[m]))*1.4826; m=np.abs(res)<3*mad+1
    slope=p[0]  # ms per beat
    true_bpm=60/(per+slope/1000)
    T_raw=true_bpm/r['stretch_ratio']
    span=slope*r['lengthBeats']
    # residual per 16-beat block
    blocks=[np.median(res[m&(b//16==k)]) for k in range(int(b.max()//16)+1) if (m&(b//16==k)).sum()>3]
    print(f'{t}: n={m.sum()}/{len(b)} slope {slope:+.4f} ms/beat (drift {span:+.1f} ms over song) -> true {true_bpm:.4f} BPM in file; raw {T_raw:.4f}; resid per 16 beats: {np.round(blocks,1).tolist()}')
