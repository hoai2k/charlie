"""Export ledge sprites/masks with one anatomy scale per doll and per-pose contacts.

The owner approved per-pose ledge anchors to preserve normal doll size.
No per-frame fitting: every pose uses that doll's common source scale.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import importlib.util,json,hashlib,sys,numpy as np
H=Path(__file__).resolve().parent;G=H.parents[2]
s=importlib.util.spec_from_file_location('toys',H.parent/'toys/build.py');T=importlib.util.module_from_spec(s);s.loader.exec_module(T)
SCALES={'hermione':.57,'lily':.54,'mira':.56,'whirlpool':.52,'claudia-v2':.60,'kaya':.53,'amanda':.54,'penelope':.54,'rumi-v2':.55,'juliette':.53,'barbie':.55,'cinnamon':.55,'felicity':.55,'luna':.55,'marisol-v2':.55}
(H/'reports').mkdir(exist_ok=True)

def mask_for(c,key,n):
 a=np.array(c).astype(float);b=T.packing.bounds(c);ys,xs=np.where(a[:,:,3]>8)
 tree,weights=T.outfit_classifier({'claudia-v2':'claudia','rumi-v2':'rumi','marisol-v2':'marisol'}.get(key,key))
 feat=np.column_stack([a[ys,xs,:3]/40.,(xs-b[0])/(b[2]-b[0])*1.5,(ys-b[1])/(b[3]-b[1])*3.])
 dist,idx=tree.query(feat,k=7);v=1/(dist+.04)**2;values=(weights[idx]*v[:,:,None]).sum(1)/v.sum(1)[:,None];values=np.clip((values-.25)/.5,0,1)
 out=np.zeros((*a.shape[:2],3),dtype='uint8');out[ys,xs,:2]=np.round(values*255)
 # Skin/hair protected by an explicit colour gate too; the training mask
 # supplies all garment channels, including existing two-channel costumes.
 r,g,blue=[a[:,:,i] for i in range(3)]
 skin=(r>g+18)&(g>blue+12)&(r>100)
 # Preserve skin only where the nearest-neighbour garment votes are weak;
 # warm costume cloth (Kaya, Juliette, Rumi) legitimately shares its palette.
 if key in ['hermione','lily','mira','whirlpool','amanda','penelope','barbie','cinnamon','felicity','luna','marisol-v2']:
  out[skin]=0
 if key in ['kaya','rumi-v2','juliette']:
  skin=(r>100)&(g>blue+10)&((r-g)>(g-blue)*({'kaya':1.0,'rumi-v2':1.12,'juliette':1.12}[key]))
  neutral=(a[:,:,:3].max(2)-a[:,:,:3].min(2)<35)&(a[:,:,:3].max(2)>175)
  out[skin|neutral]=0
 # Protect the head/accessory area across the pose change; no eyes,
 # eyewear, hair ribbons or hat decoration should become clothing colour.
 yy,xx=np.indices(a.shape[:2]);height=b[3]-b[1];width=b[2]-b[0]
 cx,cy=[(.78,.25),(.69,.22),(.67,.24)][n];radx,rady=[(.15,.17),(.15,.18),(.18,.20)][n]
 head=(((xx-b[0])/width-cx)/radx)**2+(((yy-b[1])/height-cy)/rady)**2<1
 out[head]=0
 if key=='whirlpool':
  blue_hair=(blue>g+15)&(g>r+4)
  out[blue_hair]=0
  left_hair=(xx<b[0]+width*.4)&(yy<b[1]+height*.52)&(blue>r+6)
  out[left_hair]=0
  hair_zone=(xx<b[0]+width*.43)&(yy<b[1]+height*[.55,.48,.67][n])
  out[hair_zone]=0
 if key=='juliette':
  hair_zone=(xx<b[0]+width*.50)&(yy<b[1]+height*[.46,.48,.65][n])
  out[hair_zone]=0
  xn=(xx-b[0])/width;yn=(yy-b[1])/height
  zones=[((xn<.4)&(yn>.65))|((xn>.65)&(yn>.27)&(yn<.5)),
         (((xn-.59)/.16)**2+((yn-.59)/.15)**2<1)|((xn>.68)&(yn>.28)&(yn<.56)),
         ((yn>.83)&(xn>.45))|((xn>.72)&(yn>.44))][n]
  light_skin=(r>140)&(g>blue+12)&((r-g)>(g-blue)*.7)
  out[zones&light_skin]=0
 return Image.fromarray(out)

def build(key):
 cells=T.full_cells(T.packing.clean(Image.open(H/f'sources/{key}.webp')),rows=1)
 scale=SCALES[key];sheet=Image.new('RGBA',(1254,418));masks=Image.new('RGB',sheet.size);records=[]
 gallery=Image.new('RGB',(1672,836),'#bed9df');ref=Image.open(G/f'assets/doll_{key}_sprites.webp').convert('RGBA').crop((0,0,418,418));gallery.paste(ref,(0,0),ref)
 for n,c in enumerate(cells):
  b=T.packing.bounds(c);w=round((b[2]-b[0])*scale);h=round((b[3]-b[1])*scale)
  assert w<408 and h<408,(key,n,'source needs regeneration; no silent shrink',w,h)
  art=c.crop(b).resize((w,h),Image.Resampling.LANCZOS);x=(418-w)//2;y=(418-h)//2
  frame=Image.new('RGBA',(418,418));frame.alpha_composite(art,(x,y));a=np.array(frame);solid=a[:,:,3]>128;yy,xx=np.where(solid)
  if n<2:
   right=xx>xx.max()-max(4,round(w*.08));contact_y=int(np.quantile(yy[right],.99))+1
   corner_x=round(x+w*(.74 if n==0 else .61))
  else:
   contact_y=int(yy.max())+1;bottom=xx[yy>yy.max()-max(3,round(h*.03))];corner_x=max(2,int(bottom.min())-4)
  contact=[corner_x,contact_y]
  sheet.paste(frame,(n*418,0));m=mask_for(c,key,n).crop(b).resize((w,h),Image.Resampling.LANCZOS);masks.paste(m,(n*418+x,y))
  records.append({'ledgeContact':contact,'sourceScale':scale,'bounds':frame.getchannel('A').getbbox(),'sourceBounds':b,'placement':[x,y]})
  for row,bgcol in [(0,'#bed9df'),(1,'#1d2944')]:
   bg=Image.new('RGBA',(418,418),bgcol);d=ImageDraw.Draw(bg);d.rectangle((corner_x,contact_y,418,418),fill='#d9edf3');bg.alpha_composite(frame)
   if row==1:
    tint=Image.new('RGBA',(418,418),'#e939c8');maskframe=Image.new('L',(418,418));maskframe.paste(m.getchannel('R'),(x,y));maskframe=Image.fromarray(np.minimum(np.array(maskframe),a[:,:,3]));tint.putalpha(maskframe);bg.alpha_composite(tint)
   ImageDraw.Draw(bg).ellipse((corner_x-3,contact_y-3,corner_x+3,contact_y+3),fill='red');gallery.paste(bg.convert('RGB'),((n+1)*418,row*418))
 target=G/f'assets/doll_{key}_ledge.webp';maskpath=G/f'assets/masks/{key}_ledge_mask.webp';T.packing.save(sheet,target);T.packing.save(masks,maskpath)
 result={'assetKey':key,'size':sheet.size,'frames':records,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'maskSha256':hashlib.sha256(maskpath.read_bytes()).hexdigest()};(H/f'reports/{key}.json').write_text(json.dumps(result,indent=2)+'\n');gallery.save(H/f'reports/{key}-review.webp',quality=90,method=6);return result
if __name__=='__main__':
 for key in sys.argv[1:] or [p.stem for p in sorted((H/'sources').glob('*.webp'))]:build(key)
 reports={p.stem:json.loads(p.read_text())['frames'] for p in sorted((H/'reports').glob('*.json'))}
 (G/'assets/doll_ledge_anchors.json').write_text(json.dumps({'frameSize':418,'alignment':'Place each pose ledgeContact on the same world ledge corner/top. Preserve normal body scale; do not use the superseded fixed300,230.','dolls':reports},indent=2)+'\n')
