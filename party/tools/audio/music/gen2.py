# python3 gen2.py rh-afro:1 rh-afro:2 ...   (composition-plan generation, 2 concurrent)
import os, sys, json, time, requests, concurrent.futures as cf
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
from plans import plan, total_ms
KEYF = os.path.join(os.path.dirname(D), '.elevenlabs_key')
LOG = os.path.join(D, 'genlog.jsonl')
def key():
    with open(KEYF) as f: return f.read().strip()
def gen(sid, take, force_instr=True):
    out = os.path.join(D, 'raw', f'{sid}-{take}.mp3')
    body = {'composition_plan': plan(sid, take), 'model_id': 'music_v2_5'}
    if force_instr: body['force_instrumental'] = True
    t0 = time.time(); err = ''
    for attempt in range(6):
        try:
            r = requests.post('https://api.elevenlabs.io/v1/music', params={'output_format': 'mp3_44100_192'},
                              headers={'xi-api-key': key()}, json=body, timeout=600, verify=os.environ.get('SSL_CERT_FILE', True))
        except Exception as e:
            err = type(e).__name__; time.sleep(10); continue
        rec = dict(song=sid, take=take, kind='plan', ms=total_ms(sid, take), status=r.status_code)
        if r.status_code == 200 and r.headers.get('content-type', '').startswith('audio'):
            open(out, 'wb').write(r.content); rec.update(bytes=len(r.content), secs=round(time.time() - t0, 1))
            open(LOG, 'a').write(json.dumps(rec) + '\n')
            return f'{sid}-{take}: OK {len(r.content)} B, {rec["ms"]/1000:.1f} s requested, {rec["secs"]} s'
        rec['err'] = r.text[:300]; open(LOG, 'a').write(json.dumps(rec) + '\n')
        err = f'HTTP {r.status_code}: {r.text[:300]}'
        if r.status_code == 429: time.sleep(20 * (attempt + 1)); continue
        if r.status_code in (400, 422) and force_instr and 'force_instrumental' in r.text:
            body.pop('force_instrumental'); force_instr = False; continue
        break
    return f'{sid}-{take}: FAIL {err}'
if __name__ == '__main__':
    jobs = [(a.split(':')[0], int(a.split(':')[1])) for a in sys.argv[1:]]
    with cf.ThreadPoolExecutor(2) as ex:
        for res in ex.map(lambda j: gen(*j), jobs): print(res, flush=True)
