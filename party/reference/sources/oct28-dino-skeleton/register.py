"""Archive native RGBA exactly; register complete generated bone artwork by measured landmarks."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[2]
a=argparse.ArgumentParser();a.add_argument('name');a.add_argument('native');a.add_argument('--source-points',required=True);a.add_argument('--target-points');a.add_argument('--normal-stretch',type=float,default=1);args=a.parse_args()
p=ROOT/'reference/pending'/f'OCT28-DINO-SKELETON-{args.name}.json';r=json.loads(p.read_text());im=Image.open(args.native).convert('RGBA');src=BASE/f'{args.name}-native.webp';im.save(src,'WEBP',lossless=True,exact=True,method=6);assert Image.open(src).convert('RGBA').tobytes()==im.tobytes()
s=np.asarray(json.loads(args.source_points),float);t=np.asarray(json.loads(args.target_points) if args.target_points else r['localPoints'][:len(s)],float)
if len(s)==2:
 d=s[1]-s[0];e=t[1]-t[0];aa=np.dot(d,e)/np.dot(d,d);bb=(d[0]*e[1]-d[1]*e[0])/np.dot(d,d);A=np.array([[aa,-bb],[bb,aa]]);o=t[0]-A@s[0];M=np.vstack([np.column_stack([A,o]),[0,0,1]])
elif len(s)==3:
 M=np.vstack([np.linalg.solve(np.column_stack([s,np.ones(3)]),t).T,[0,0,1]])
else:raise ValueError('Use two similarity points or three affine points')
if args.normal_stretch != 1:
    delta=t[1]-t[0];normal=np.array([-delta[1],delta[0]])/np.linalg.norm(delta)
    stretch=np.eye(2)+(args.normal_stretch-1)*np.outer(normal,normal)
    post=np.vstack([np.column_stack([stretch,t[0]-stretch@t[0]]),[0,0,1]])
    M=post@M
inv=np.linalg.inv(M);size=tuple(r['size']);out=im.transform(size,Image.Transform.AFFINE,inv[:2].reshape(-1),resample=Image.Resampling.BICUBIC)
runtime=ROOT/'assets/art/prop'/f'{args.name}.webp';out.save(runtime,'WEBP',lossless=True,exact=True,method=6)
r.update({'nativePath':args.native,'nativeSize':list(im.size),'source':str(src.relative_to(ROOT)),'runtime':str(runtime.relative_to(ROOT)),'outputSize':list(size),'registration':{'sourcePoints':s.tolist(),'targetPoints':t.tolist(),'sourceToLocal':M.tolist(),'localToSource':inv.tolist(),'alphaBounds':list(out.getchannel('A').point(lambda v:255 if v>16 else 0).getbbox()),'registrationError':float(np.max(np.abs((M@np.column_stack([s,np.ones(len(s))]).T).T[:,:2]-t)))},'processing':'Native RGBA archived lossless WebP exact=True, verified byte-identical. Measured whole-part geometric registration only; no creative pixels painted. Bicubic affine transform into exact requested box canvas.','status':'registered-pending-assembled-review','runtimeSha256':hashlib.sha256(runtime.read_bytes()).hexdigest(),'runtimeBytes':runtime.stat().st_size,'decodedBytes':size[0]*size[1]*4,'alphaExtrema':list(out.getchannel('A').getextrema())});p.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'key':r['key'],'size':size,'bounds':r['registration']['alphaBounds'],'error':r['registration']['registrationError']}))
