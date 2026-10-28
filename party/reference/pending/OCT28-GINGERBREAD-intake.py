"""Archive generated native RGBA losslessly and make reversible runtime derivatives."""
import json
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import map_coordinates
from scipy.interpolate import LinearNDInterpolator

ROOT=Path(__file__).resolve().parents[2]
RECORD=ROOT/'reference/pending/OCT28-GINGERBREAD.json'
def archive():
    doc=json.loads(RECORD.read_text())
    for a in doc['assets']:
        im=Image.open(a['nativePath']).convert('RGBA')
        dest=ROOT/'reference/sources/oct28-gingerbread'/(a['key'].replace('/','-')+'-source.webp')
        if not dest.exists(): im.save(dest,lossless=True,exact=True,method=6)
        assert np.array_equal(np.array(im),np.array(Image.open(dest).convert('RGBA'))),a['key']
        a.update(source=str(dest.relative_to(ROOT.parent)),nativeSize=list(im.size),sourcePixelExact=True)
    RECORD.write_text(json.dumps(doc,indent=2)+'\n')
    return doc

def px(points): return [[480+2*x,880+2*y]for x,y in points]
def rect(x0,y0,x1,y1): return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]]
def arch_points(box,n=18):
    x0,y0,x1,y1=box; rx=(x1-x0)/2; cx=(x0+x1)/2
    return [[x0,y1]]+[[cx+rx*np.cos(a),y0+rx+rx*np.sin(a)]for a in np.linspace(np.pi,2*np.pi,n+1)]+[[x1,y1]]
def circle_points(box,n=32):
    x0,y0,x1,y1=box; cx=(x0+x1)/2;cy=(y0+y1)/2
    return [[cx+(x1-x0)/2*np.cos(a),cy+(y1-y0)/2*np.sin(a)]for a in np.linspace(0,2*np.pi,n,endpoint=False)]

# Native silhouettes/cutout bounds measured from generated alpha, never painted.
# Registration maps these existing authored edges to the requested consumer geometry.
WALLS={
 'gh-cottage-wall':{
  'sourceOuter':[[150,1157],[1159,1157],[1159,509],[654,137],[150,509]],
  'targetOuter':px([[-150,0],[150,0],[150,-170],[0,-300],[-150,-170]]),
  'holes':[
   ('arch',[530,727,778,1157],[408,656,552,880]),
   ('rect',[294,580,465,765],[244,580,348,688]),
   ('rect',[843,580,1015,765],[612,580,716,688]),
   ('round',[576,309,732,469],[432,396,528,492])]},
 'gh-tall-wall':{
  'sourceOuter':[[376,1137],[935,1137],[935,352],[655,72],[376,352]],
  'targetOuter':px([[-105,0],[105,0],[105,-300],[0,-410],[-105,-300]]),
  'holes':[
   ('arch',[581,864,730,1137],[420,672,540,880]),
   ('rect',[452,630,576,761],[324,488,420,600]),
   ('rect',[735,630,858,761],[540,488,636,600]),
   ('rect',[452,408,576,534],[324,320,420,424]),
   ('rect',[735,408,858,534],[540,320,636,424]),
   ('round',[610,205,701,296],[440,164,520,244])]},
 'gh-castle-tower-left':{
  'sourceOuter':rect(238,114,739,1496),
  'targetOuter':px(rect(-210,-290,-122,0)),
  'holes':[('arch',[434,298,543,597],[128,380,168,488])]},
 'gh-castle-tower-right':{
  'sourceOuter':rect(307,76,785,1370),
  'targetOuter':px(rect(122,-290,210,0)),
  'holes':[('arch',[494,242,597,538],[792,380,832,488])]},
}

def keep_geometry():
    # Five generated crenellations; outermost shoulders bend inward22px to align
    # the two11-house-unit end margins which were absent in the model silhouette.
    sx=[[84,1009],[84,259],[84,251],[84,135],[262,135],[262,259],[355,259],[355,135],[532,135],[532,259],[615,259],[615,135],[792,135],[792,259],[875,259],[875,135],[1052,135],[1052,259],[1147,259],[1147,135],[1325,135],[1325,251],[1325,259],[1325,1009]]
    tx=px([[-126,0],[-126,-200],[-115,-200],[-115,-228],[-85,-228],[-85,-200],[-65,-200],[-65,-228],[-35,-228],[-35,-200],[-15,-200],[-15,-228],[15,-228],[15,-200],[35,-200],[35,-228],[65,-228],[65,-200],[85,-200],[85,-228],[115,-228],[115,-200],[126,-200],[126,0]])
    return {'sourceOuter':sx,'targetOuter':tx,'holes':[
      ('arch',[545,492,863,1009],[400,624,560,880]),
      ('arch',[252,393,377,597],[272,540,332,644]),
      ('arch',[1031,392,1156,597],[628,540,688,644])]}
WALLS['gh-castle-keep']=keep_geometry()

def target_mask(spec):
    scale=4
    mask=Image.new('L',(960*scale,880*scale),0); d=ImageDraw.Draw(mask)
    d.polygon([(round(x*scale),round(y*scale))for x,y in spec['targetOuter']],fill=255)
    for kind,_,box in spec['holes']:
        if kind=='rect': pts=rect(*box)
        elif kind=='arch':pts=arch_points(box,96)
        else:pts=circle_points(box,128)
        d.polygon([(round(x*scale),round(y*scale))for x,y in pts],fill=0)
    return np.array(mask.resize((960,880),Image.Resampling.LANCZOS))

def register_wall(im,spec):
    src=list(spec['sourceOuter']); dst=list(spec['targetOuter'])
    # Add existing outline segment midpoints to retain thin baked borders.
    s=list(src);t=list(dst)
    for i in range(len(s)):
        for f in [.25,.5,.75]:
            src.append((np.array(s[i])*(1-f)+np.array(s[(i+1)%len(s)])*f).tolist())
            dst.append((np.array(t[i])*(1-f)+np.array(t[(i+1)%len(t)])*f).tolist())
    for kind,sb,tb in spec['holes']:
        if kind=='rect': sp=rect(*sb);tp=rect(*tb)
        elif kind=='arch':sp=arch_points(sb);tp=arch_points(tb)
        else:sp=circle_points(sb);tp=circle_points(tb)
        src+=sp;dst+=tp
        # Constrain the surrounding authored dark outline as well as each hole.
        # Without these rings Delaunay can stretch a9px border through the large
        # native-to-runtime gap between a lower window and the front door.
        for se,te in [(8,3),(16,6),(24,10)]:
            sbox=[sb[0]-se,sb[1]-se,sb[2]+se,sb[3]+se]
            tbox=[tb[0]-te,tb[1]-te,tb[2]+te,tb[3]+te]
            if kind=='rect':sp=rect(*sbox);tp=rect(*tbox)
            elif kind=='arch':sp=arch_points(sbox);tp=arch_points(tbox)
            else:sp=circle_points(sbox);tp=circle_points(tbox)
            src+=sp;dst+=tp
    gy,gx=np.mgrid[:880,:960]
    mapping=LinearNDInterpolator(np.array(dst),np.array(src),fill_value=-100)
    coords=mapping(gx,gy)
    p=np.array(im)
    out=np.stack([map_coordinates(p[:,:,i],[coords[:,:,1],coords[:,:,0]],order=1,mode='constant',cval=0)for i in range(4)],axis=-1)
    # Geometric alpha alignment only: no new coloured artwork is produced.
    out[:,:,3]=np.minimum(out[:,:,3],target_mask(spec))
    return Image.fromarray(out),{'method':'piecewise affine registration of model-authored silhouettes and transparent openings; target-hole alpha alignment','sourceControlPoints':src,'targetControlPoints':dst}

def affine_piece(im,poly):
    bbox=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
    crop=im.crop(bbox);w,h=crop.size
    # Polygon order: bottom-left,bottom-right,top-right,top-left.
    a,b,c,d=np.array(poly,dtype=float)
    forward=np.array([[(c[0]-d[0])/w,(a[0]-d[0])/h],[(c[1]-d[1])/w,(a[1]-d[1])/h]])
    inv=np.linalg.inv(forward); off=-inv@d
    coeff=(inv[0,0],inv[0,1],off[0],inv[1,0],inv[1,1],off[1])
    out=crop.transform((960,880),Image.Transform.AFFINE,coeff,resample=Image.Resampling.BICUBIC)
    return out,{'method':'native-alpha crop then affine registration','nativeCrop':list(bbox),'targetPolygon':poly}

def build():
    doc=archive()
    for a in doc['assets']:
        key=a['key']; name=key.split('/')[-1];im=Image.open(a['nativePath']).convert('RGBA');reg={}
        if name in WALLS:
            out,reg=register_wall(im,WALLS[name])
        elif 'roof-'in name:
            tall='tall'in name
            # Brief's tall roof reached y=-450.5 beyond BOX. Root-authorized
            #13unit downward translation preserves exact960x880 and avoids clips.
            poly=[[-125.7,-265.3],[20.2,-418.2],[0,-437.5],[-145.9,-284.6]]if tall else[[-175.7,-147.7],[19.6,-317],[0,-339.7],[-195.4,-170.4]]
            if name.endswith('right'):poly=[[-x,y]for x,y in poly]
            out,reg=affine_piece(im,px(poly))
            if tall:reg['briefCorrection']='all tall roof vertices translated down13houseunits because original top-450.5 exceeded canvas top-440; matching consumer polygon/icing correction required'
        elif name=='gh-cottage-chimney' or name=='gh-tall-porch':
            box=px(rect(62,-318,104,-200))if 'chimney'in name else px(rect(-50,-124,50,-106))
            # affine_piece expects bottom-left,bottom-right,top-right,top-left.
            out,reg=affine_piece(im,[box[3],box[2],box[1],box[0]])
        elif 'castle-cone'in name:
            bbox=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
            crop=im.crop(bbox);out=Image.new('RGBA',(960,880));x=28 if name.endswith('left')else 692
            out.alpha_composite(crop.resize((240,276),Image.Resampling.LANCZOS),(x,40))
            reg={'method':'native-alpha crop/resize/register','nativeCrop':list(bbox),'targetBounds':[x,40,x+240,316]}
        elif name=='gh-gingerbread-person':
            bbox=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox();crop=im.crop(bbox)
            # Feet centre comes from native feet span, not the raised hand's bbox.
            feet_centre=(235+926)/2-bbox[0]
            scale=min(118/feet_centre,118/(crop.width-feet_centre),318/crop.height);dim=(round(crop.width*scale),round(crop.height*scale));piece=crop.resize(dim,Image.Resampling.LANCZOS)
            x=round(120-feet_centre*scale);out=Image.new('RGBA',(240,320));out.alpha_composite(piece,(x,320-dim[1]))
            reg={'method':'native-alpha crop/scale and bottom-foot-centre registration','nativeCrop':list(bbox),'scale':scale,'paste':[x,320-dim[1]]}
        elif name=='gh-candy':
            out=im.resize((640,320),Image.Resampling.LANCZOS)
            reg={'method':'uniform resize then required4x2 alpha repack via repack_atlas.py'}
        elif key=='bg/gingerbread-house':
            out=Image.new('RGBA',(1920,1080));seam=633
            out.alpha_composite(im.crop((0,0,im.width,seam)).resize((1920,760),Image.Resampling.LANCZOS),(0,0))
            out.alpha_composite(im.crop((0,seam,im.width,im.height)).resize((1920,320),Image.Resampling.LANCZOS),(0,760))
            reg={'method':'two-region vertical registration','nativeTableSeam':seam,'runtimeTableSeam':760}
        else:out=im.resize((1920,1080)if key.startswith('bg/')else(800,500),Image.Resampling.LANCZOS);reg={'method':'uniform runtime resize'}
        runtime=ROOT/'assets/art'/(key+'.webp');runtime.parent.mkdir(parents=True,exist_ok=True)
        # Runtime copies preserve alpha exactly; all sources remain native lossless.
        out.save(runtime,lossless=True,exact=True,method=6)
        if name=='gh-candy':
            subprocess.run(['python3',str(ROOT/'tools/sprites/repack_atlas.py'),str(runtime),'--cols','4','--rows','2','--margin','0.1'],check=True)
        a.update(runtimeFile=str(runtime.relative_to(ROOT.parent)),runtimeSize=list(out.size),runtimeBytes=runtime.stat().st_size,registration=reg)
        print(key,out.size,out.getchannel('A').getbbox())
    RECORD.write_text(json.dumps(doc,indent=2)+'\n')
if __name__=='__main__': build()
