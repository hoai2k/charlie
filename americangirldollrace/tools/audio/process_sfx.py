"""Trim, level and export raw ElevenLabs takes into the race's sfx folder.

Each take: trim leading/trailing silence, 5 ms fade-in and 40 ms fade-out,
level to about -16 LUFS with a -1 dBFS limiter, export 44.1 kHz stereo 128k
MP3 as assets/audio/sfx/<key>_NN.mp3 (the engine's naming).
"""
import glob, os, re, subprocess, sys

HERE = os.environ.get('SFX_WORKDIR', os.path.dirname(os.path.abspath(__file__)))
RAW = HERE + '/raw'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../assets/audio/sfx')
TARGET = -16.0


def loudness(path, chain=''):
    args = ['ffmpeg', '-nostats', '-i', path, '-af', (chain + ',' if chain else '') + 'ebur128', '-f', 'null', '-']
    text = subprocess.run(args, capture_output=True, text=True).stderr
    match = re.findall(r'I:\s+(-?[\d.]+) LUFS', text)
    return float(match[-1]) if match else None


def process(src):
    name = os.path.basename(src)
    trim = ('silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.01,'
            'areverse,silenceremove=start_periods=1:start_threshold=-52dB:start_silence=0.03,areverse')
    level = loudness(src, trim)
    if level is None or level < -60:
        # Too short for an integrated-loudness reading: level by peak instead.
        text = subprocess.run(['ffmpeg', '-nostats', '-i', src, '-af', trim + ',volumedetect', '-f', 'null', '-'],
                              capture_output=True, text=True).stderr
        peak = float(re.findall(r'max_volume: (-?[\d.]+) dB', text)[-1])
        gain = max(-12, min(18, -3.0 - peak))
    else:
        gain = max(-12, min(18, TARGET - level))
    chain = (f'{trim},afade=t=in:d=0.005,areverse,afade=t=in:d=0.04,areverse,'
             f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false,aresample=44100')
    dst = f'{OUT}/{name}'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', chain, '-ac', '2',
                    '-c:a', 'libmp3lame', '-b:a', '128k', dst], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst],
                               capture_output=True, text=True).stdout)
    return name, round(dur, 2), loudness(dst)


if __name__ == '__main__':
    only = set(sys.argv[1:])
    for src in sorted(glob.glob(RAW + '/*.mp3')):
        if only and re.sub(r'_\d+\.mp3$', '', os.path.basename(src)) not in only:
            continue
        print('%-32s %5.2fs  %s LUFS' % process(src))
