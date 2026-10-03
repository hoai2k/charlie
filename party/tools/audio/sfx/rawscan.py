import lib2 as L, catalog, numpy as np, sys
sel = sys.argv[1:]
for e in catalog.E:
    if sel and e['key'] not in sel and e['stem'] not in sel: continue
    x = L.load(f"{L.RAW}/{e['stem']}.mp3")
    t = L.trim(x)
    a = L.analyze(t)
    pk = 20*np.log10(np.abs(x).max()+1e-9)
    # envelope summary: rms in 10 segments
    n = max(1, len(t)//10); env = [20*np.log10(np.sqrt((t[i*n:(i+1)*n]**2).mean())+1e-9) for i in range(10)]
    print(f"{e['stem']:24s} raw {len(x)/44100:5.2f}s trim {len(t)/44100:5.2f}s pk {pk:5.1f} lo{a['low']:.2f} lm{a['lomid']:.2f} mid{a['mid']:.2f} hi{a['hi']:.2f} cen{a['cen']:5d} flat{a['flat']:.3f} env " + ' '.join(f'{v:4.0f}' for v in env))
