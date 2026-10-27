# Usage: python3 gen.py song:take [song:take ...]   (take 1-based; optional "song:take:altprompt-file")
import os, sys, json, time, requests, concurrent.futures as cf
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from prompts import SONGS, TAIL
KEYF = os.path.join(os.path.dirname(D), '.elevenlabs_key')
def key():
    with open(KEYF) as f: return f.read().strip()
LOG = os.path.join(D, 'genlog.jsonl')
def gen(song, take, prompt=None):
    s = SONGS[song]
    prompt = prompt or (s['takes'][take - 1] + TAIL)
    out = os.path.join(D, 'raw', f'{song}-{take}.mp3')
    t0 = time.time()
    for attempt in range(3):
        try:
            r = requests.post('https://api.elevenlabs.io/v1/music', params={'output_format': 'mp3_44100_192'},
                headers={'xi-api-key': key(), 'Content-Type': 'application/json'},
                json={'prompt': prompt, 'music_length_ms': s['ms'], 'model_id': 'music_v2_5', 'force_instrumental': True},
                timeout=300, verify=os.environ.get('SSL_CERT_FILE', True))
        except Exception as e:
            err = type(e).__name__; time.sleep(5); continue
        if r.status_code == 200 and r.headers.get('content-type', '').startswith('audio'):
            open(out, 'wb').write(r.content)
            rec = dict(song=song, take=take, prompt=prompt, ms=s['ms'], bytes=len(r.content), secs=round(time.time() - t0, 1), status=200)
            open(LOG, 'a').write(json.dumps(rec) + '\n')
            return f'{song}-{take}: OK {len(r.content)} B in {rec["secs"]} s'
        err = f'HTTP {r.status_code}: {r.text[:300]}'
        open(LOG, 'a').write(json.dumps(dict(song=song, take=take, prompt=prompt, status=r.status_code, err=r.text[:300])) + '\n')
        if r.status_code in (400, 401, 403, 422): break
        time.sleep(10)
    return f'{song}-{take}: FAIL {err}'
if __name__ == '__main__':
    jobs = []
    for a in sys.argv[1:]:
        p = a.split(':')
        prompt = open(p[2]).read().strip() if len(p) > 2 else None
        jobs.append((p[0], int(p[1]), prompt))
    with cf.ThreadPoolExecutor(2) as ex:
        for res in ex.map(lambda j: gen(*j), jobs): print(res, flush=True)
