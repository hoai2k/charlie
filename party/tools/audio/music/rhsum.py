import json, sys, glob, os
rows=[]
for f in sorted(glob.glob('results/rh-*-[0-9].json')):
    t=os.path.basename(f)[:-5]; r=json.load(open(f))
    st=json.load(open(f'results/rh2stats-{t}.json')) if os.path.exists(f'results/rh2stats-{t}.json') else {}
    secs=r['sections']; ng=sum(s['kind']=='groove' for s in secs); nb=sum(s['kind']=='breath' for s in secs)
    offs=[s.get('beat_offset_ms') for s in st.get('sections',[]) if s.get('beat_offset_ms') is not None and s['kind']=='groove']
    spread=round(max(offs)-min(offs),1) if len(offs)>1 else None
    print(f"{t:15s} bpm {r['bpm_raw']:.3f}->{r.get('bpm_after_stretch') or '-'} spread {r['phase_spread_ms']:5.1f}ms secoff {offs} ({spread}) | {ng}G/{nb}B len {r['lengthBeats']} hit {r['final_hit_beat']} | LUFS {r['lufs_mp3']} TP {r['tp_mp3']} lim {r['limiter_gr_db']} lev+{r['levelling_max_gain_db']} | 12th {st.get('within25_of_12th_pct')} grid {st.get('within25_of_section_grid_pct')} strong {st.get('strong_within25_of_section_grid_pct')} on {st.get('strong_onbeat_within25_pct')} n {st.get('onsets')}")
    print('      ', ' | '.join(f"{s['name']} {s['startBar']}-{s['endBar']}" for s in secs))
