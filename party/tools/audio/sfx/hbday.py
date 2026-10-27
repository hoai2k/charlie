"""Render the public-domain "Happy Birthday" melody as a music box / celesta waltz (numpy only)."""
import numpy as np
SR = 44100
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
PARTIALS = [(1.0, 1.0, 1.0), (2.0, 0.42, 0.55), (3.0, 0.16, 0.35), (4.16, 0.08, 0.22), (5.43, 0.04, 0.15)]  # ratio, amp, decay scale
def bell(m, dur, amp=1.0, bright=1.0):
    f = mtof(m); n = int(dur * SR); t = np.arange(n) / SR
    tau = 1.1 * (440 / f) ** 0.35
    y = np.zeros(n)
    for r, a, ds in PARTIALS:
        fr = f * r
        if fr > 15000: continue
        y += a * (bright if r > 1 else 1) * np.sin(2 * np.pi * fr * t + r) * np.exp(-t / (tau * ds))
    att = int(0.004 * SR); y[:att] *= np.linspace(0, 1, att)
    rel = int(0.03 * SR); y[-rel:] *= np.linspace(1, 0, rel)
    return amp * y
MEL = [(67, .75), (67, .25), (69, 1), (67, 1), (72, 1), (71, 2), (67, .75), (67, .25), (69, 1), (67, 1), (74, 1), (72, 2),
       (67, .75), (67, .25), (79, 1), (76, 1), (72, 1), (71, 1), (69, 1), (77, .75), (77, .25), (76, 1), (72, 1), (74, 1), (72, 3)]
# chords per bar (bar 0 = pickup): (bass, [pah notes]) per beat-group; bar7 splits C | G7 on beat 3
C, G7, C7, F = (48, [64, 67]), (43, [59, 65]), (48, [64, 70]), (41, [60, 65])
BARS = [None, [C] * 3, [G7] * 3, [G7] * 3, [C] * 3, [C7] * 3, [F] * 3, [C, C, G7], [C, C, C]]
def render(bpm=112):
    spb = 60 / bpm
    # beat -> time with a gentle ritardando over the last two bars
    def T(b):
        t = b * spb
        if b > 19: t += (b - 19) ** 2 * 0.035 * spb
        return t
    total = T(25) + 1.8
    out = np.zeros(int(total * SR) + SR)
    def put(t, sig):
        i = int(t * SR); out[i:i + len(sig)] += sig[:len(out) - i]
    b = 0.0
    for m, d in MEL:
        put(T(b), bell(m, min(2.6, T(b + d) - T(b) + 1.6), 0.9))
        put(T(b), bell(m + 12, 0.5, 0.10))       # faint octave sparkle
        b += d
    for bar in range(1, 9):
        for beat in range(3):
            bb = 1 + (bar - 1) * 3 + beat
            bass, pah = BARS[bar][beat]
            if beat == 0: put(T(bb), bell(bass, 1.6 if bar < 8 else 3.0, 0.40, 0.6))
            else:
                for n in pah: put(T(bb), bell(n, 0.9, 0.16, 0.5))
        if bar == 8:
            for n in (64, 67, 72): put(T(bb - 2), bell(n, 3.0, 0.14, 0.5))
    # small room: decaying filtered-noise impulse response
    rng = np.random.default_rng(7); n = int(0.7 * SR); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / 0.18)
    k = np.ones(8) / 8; ir = np.convolve(ir, k, 'same'); ir /= np.sqrt((ir ** 2).sum())
    N = 1 << int(np.ceil(np.log2(len(out) + n)))
    wet = np.fft.irfft(np.fft.rfft(out, N) * np.fft.rfft(ir, N), N)[:len(out)]
    y = out + 0.22 * wet
    end = int((T(22) + 1.9) * SR); y = y[:end]
    return y / np.abs(y).max(), [T(x) for x in np.cumsum([0] + [d for _, d in MEL])[:-1]]
if __name__ == '__main__':
    y, on = render(); print(len(y) / SR, 'onsets', [round(o, 2) for o in on])
