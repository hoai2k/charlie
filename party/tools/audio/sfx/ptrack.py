import lib2 as L, numpy as np, sys
def track(x, sr=44100, hop=0.04, win=4096, lo=80, hi=5000):
    out = []
    pk = np.abs(x).max()
    for s in range(0, len(x) - win, int(hop * sr)):
        seg = x[s:s + win]
        r = np.sqrt((seg ** 2).mean())
        if r < pk * 0.03: out.append(None); continue
        X = np.abs(np.fft.rfft(seg * np.hanning(win), 1 << 15)); fr = np.fft.rfftfreq(1 << 15, 1 / sr)
        m = (fr > lo) & (fr < hi); i = np.where(m)[0][np.argmax(X[m])]
        out.append(int(fr[i]))
    return out
if __name__ == '__main__':
    for f in sys.argv[1:]:
        x = L.trim(L.load(f)); print(f.split('/')[-1], track(x))
