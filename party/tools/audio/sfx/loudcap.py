"""Loudness cap for generated SFX: peak-normalised long flourishes play much
louder than short blips. Measures each sound's loudest 400 ms window (RMS dB)
and turns down any listed key above its cap (long sounds >= 1 s: -17 dB,
short: -15 dB), rewriting the file in place in its own format.
  python3 loudcap.py round6-specs.txt round7-specs.txt
"""
import json, os, subprocess, sys
import numpy as np
import lib2 as L

CAP_LONG, CAP_SHORT = -17.0, -15.0

def level(x):
    w = min(int(0.4 * L.SR), len(x))
    c = np.convolve(x.astype(float) ** 2, np.ones(w) / w, 'valid')
    return 10 * np.log10(c.max() + 1e-12)

def keys(spec_files):
    here = os.path.dirname(os.path.abspath(__file__))
    for f in spec_files:
        for line in open(os.path.join(here, f)):
            if '|' in line and not line.startswith('#'): yield line.split('|')[0].strip()

man = json.load(open(L.OUT + '/manifest.json'))['sfx']
for k in keys(sys.argv[1:]):
    rel = man.get(k)
    if not isinstance(rel, str): continue
    p = os.path.join(L.OUT, rel)
    x = L.load(p, hp=0)
    if len(x) < 100: continue
    lv, dur = level(x), len(x) / L.SR
    cap = CAP_LONG if dur >= 1.0 else CAP_SHORT
    if lv <= cap: continue
    gain = cap - lv
    tmp = p + '.tmp' + os.path.splitext(p)[1]
    codec = ['-c:a', 'libmp3lame', '-b:a', '96k'] if p.endswith('.mp3') else ['-c:a', 'pcm_s16le']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-af', f'volume={gain:.2f}dB'] + codec + [tmp], check=True)
    os.replace(tmp, p)
    print(f'{k:22s} {dur:5.2f}s {lv:6.1f} dB -> {cap:.0f} dB ({gain:+.1f})')
