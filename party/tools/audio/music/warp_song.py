"""warp_song.py src.mp3 dst.wav bpm [iters] : time-warp a recording whose tempo wanders onto an exact
constant-tempo grid, so the game's linear beat clock (music.beat()) fits it all the way through.

The beat-phase curve (attack of the 2-8 kHz envelope folded over one beat at `bpm`, 6 s windows every
0.5 s) says how far each part of the song sits off a fixed grid. Its slope is the local tempo error, so
rubberband's tempo is changed every 0.5 s (ffmpeg asendcmd) by 1 / (1 - slope). The output is measured
again and the remaining error is folded back into the input-time curve (`iters` times, from the
original each time, so the audio is only stretched once). Pitch is kept (rubberband, crisp transients).
Used for the owner's "Party Dance" (rh-party), which drifts 160 ms against a fixed 121 BPM grid.
Prints the residual phase range per pass; writes <dst>.json with the tempo factors."""
import sys, os, json, subprocess, tempfile
import numpy as np
from scipy.ndimage import median_filter, uniform_filter1d
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mlib
SR = mlib.SR
HOP = 0.5


def phase_curve(xm, bpm, hop=HOP, win=6.0):
    per = 60 / bpm; dur = len(xm) / SR
    e = mlib.amp_env(xm, SR, (2000, 8000))
    tr = mlib.fold_track(e, SR, bpm, win=win, hopw=hop, t_lo=0, t_hi=dur)
    ts = np.array([r[0] for r in tr]); ph = mlib.unwrap_ms([r[1] for r in tr], per)
    return ts, ph


def smooth(p): return uniform_filter1d(median_filter(p, 5, mode='nearest'), 5, mode='nearest')


def render(src, dst, tt, fac):
    cmds = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False)
    cmds.write(';\n'.join(f'{t:.3f} rubberband tempo {f:.6f}' for t, f in zip(tt, fac)) + '\n'); cmds.close()
    af = (f'asendcmd=f={cmds.name},rubberband=tempo={fac[0]:.6f}:transients=crisp:detector=compound'
          ':pitchq=quality:channels=together:window=standard')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_f32le', dst], check=True)
    os.unlink(cmds.name)


def warp(src, dst, bpm, iters=2):
    xm = mlib.mono(mlib.decode(src, SR, 2)); dur = len(xm) / SR
    tt = np.arange(0, dur, HOP)
    ts, ph = phase_curve(xm, bpm)
    phi = np.interp(tt, ts, smooth(ph))
    log = dict(bpm=bpm, phase_range_before_ms=round(float(np.ptp(smooth(ph)) * 1000), 1), passes=[])
    fac = 1 / (1 - np.gradient(phi, tt))
    for it in range(iters + 1):
        render(src, dst, tt, fac)
        y = mlib.mono(mlib.decode(dst, SR, 2))
        ts2, ph2 = phase_curve(y, bpm)
        rng = float(np.ptp(ph2[2:-2]) * 1000)
        log['passes'].append(round(rng, 1))
        print(f'pass {it}: residual beat-phase range {rng:.1f} ms')
        if it == iters: break
        T = np.concatenate([[0], np.cumsum(HOP / fac[:-1])])      # output time of each input grid point
        r = np.interp(T, ts2, smooth(ph2))
        fac = fac / (1 - np.gradient(r, T))
    log.update(tempo_factor_min=round(float(fac.min()), 5), tempo_factor_max=round(float(fac.max()), 5),
               source_bpm_min=round(bpm / float(fac.max()), 2), source_bpm_max=round(bpm / float(fac.min()), 2),
               factors=[round(float(f), 6) for f in fac])
    json.dump(log, open(dst + '.json', 'w'), indent=1)
    return log


if __name__ == '__main__':
    a = sys.argv[1:]
    lg = warp(a[0], a[1], float(a[2]), int(a[3]) if len(a) > 3 else 2)
    print({k: v for k, v in lg.items() if k != 'factors'})
