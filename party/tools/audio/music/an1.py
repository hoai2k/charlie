import sys, numpy as np
sys.path.insert(0,'.')
import mlib
from prompts import SONGS
for name in sys.argv[1:]:
    song=name.rsplit('-',1)[0]; tgt=SONGS[song]['bpm']
    x=mlib.decode(f'raw/{name}.mp3',22050,1)
    r=mlib.estimate_tempo(x,tgt)
    per=60/r['bpm']
    ts=[t for t,_,_ in r['track']]; ph=mlib.unwrap_ms([p for _,p,_ in r['track']],per)*1000; cl=[c for *_,c in r['track']]
    print(f"{name}: dur {len(x)/22050:.1f}s free {r['free']:.1f} target {tgt} est {r['bpm']:.3f} ({(r['bpm']/tgt-1)*100:+.2f}%)")
    print('  phase ms:', ' '.join(f'{t:.0f}:{p:.0f}' for t,p in zip(ts,ph)))
    print('  clarity :', ' '.join(f'{c:.2f}' for c in cl))
