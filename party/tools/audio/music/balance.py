import os, requests, json
k=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','.elevenlabs_key')).read().strip()
r=requests.get('https://api.elevenlabs.io/v1/user/subscription',headers={'xi-api-key':k},timeout=60,verify=os.environ.get('SSL_CERT_FILE',True))
if r.status_code!=200: print('HTTP',r.status_code,r.text[:200])
else:
    j=r.json(); print(json.dumps({x:j.get(x) for x in ['tier','character_count','character_limit','next_character_count_reset_unix','status']}))
    print('remaining', j['character_limit']-j['character_count'])
