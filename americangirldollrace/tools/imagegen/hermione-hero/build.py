from pathlib import Path
from PIL import Image
import hashlib,json
H=Path(__file__).resolve().parent;G=H.parents[2]
im=Image.open(H/'source.webp').convert('RGBA');im.putalpha(im.getchannel('A').point(lambda a:0 if a<4 else a));b=im.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox();assert min(b[:2])>0 and b[2]<im.width and b[3]<im.height,('Source clipping',b)
scale=min(670/(b[2]-b[0]),540/(b[3]-b[1]));size=(round((b[2]-b[0])*scale),round((b[3]-b[1])*scale));out=Image.new('RGBA',(680,550));out.alpha_composite(im.crop(b).resize(size,Image.Resampling.LANCZOS),((680-size[0])//2,(550-size[1])//2));target=G/'assets/ui/title_hero_hermione.webp';out.save(target,lossless=True,method=6,exact=True);bounds=out.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox();assert min(bounds[:2])>=4 and bounds[2]<=676 and bounds[3]<=546
(H/'report.json').write_text(json.dumps({'size':[680,550],'sourceBounds':b,'bounds':bounds,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()},indent=2)+'\n');review=Image.new('RGB',(1360,550))
for i,color in enumerate(['#fff6e5','#132333']):
 bg=Image.new('RGBA',out.size,color);bg.alpha_composite(out);review.paste(bg.convert('RGB'),(i*680,0))
review.save(H/'alpha-review.webp',quality=90,method=6);print('Hermione hero: 680x550, full silhouette, alpha and margins passed',bounds)
