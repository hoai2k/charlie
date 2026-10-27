import lib2 as L, numpy as np, sys
def onsets(x, sr=44100, rel_db=-14, min_gap=0.2):
    h = int(0.01 * sr); k = len(x) // h
    r = np.sqrt((x[:k * h].reshape(k, h) ** 2).mean(1)); db = 20 * np.log10(r + 1e-9)
    th = db.max() + rel_db; on = []; last = -99
    for i in range(1, k):
        if db[i] > th and db[i - 1] <= th and i * 0.01 - last > min_gap: on.append(i * 0.01); last = i * 0.01
    return on
def segments(x, sr=44100, rel_db=-14, maxlen=0.6):
    on = onsets(x, sr, rel_db); out = []
    for j, t in enumerate(on):
        a = max(0, int((t - 0.02) * sr)); end = on[j + 1] - 0.02 if j + 1 < len(on) else len(x) / sr
        b = int(min(end, t + maxlen) * sr); out.append((t, x[a:b]))
    return out
if __name__ == '__main__':
    x = L.load(sys.argv[1])
    for t, s in segments(x, rel_db=float(sys.argv[2]) if len(sys.argv) > 2 else -14):
        s2 = L.trim(s); a = L.analyze(s2)
        print(f"t={t:.2f} len={len(s2)/44100:.2f} pk={20*np.log10(np.abs(s2).max()):.1f}", {k: a[k] for k in ('low','lomid','mid','hi','cen','flat')})
