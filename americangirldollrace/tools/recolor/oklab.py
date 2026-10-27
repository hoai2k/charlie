import numpy as np
def srgb_to_lin(c): return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def lin_to_srgb(c): c=np.clip(c,0,1); return np.where(c<=0.0031308,c*12.92,1.055*c**(1/2.4)-0.055)
M1=np.array([[0.4122214708,0.5363325363,0.0514459929],[0.2119034982,0.6806995451,0.1073969566],[0.0883024619,0.2817188376,0.6299787005]])
M2=np.array([[0.2104542553,0.7936177850,-0.0040720468],[1.9779984951,-2.4285922050,0.4505937099],[0.0259040371,0.7827717662,-0.8086757660]])
def rgb2ok(rgb):
    l=srgb_to_lin(rgb)@M1.T; return np.cbrt(l)@M2.T
def ok2rgb_lin(lab):
    l=lab@np.linalg.inv(M2).T; return (l**3)@np.linalg.inv(M1).T
def ok2rgb(lab): return lin_to_srgb(ok2rgb_lin(lab))
def ok2lch(lab): return lab[...,0],np.hypot(lab[...,1],lab[...,2]),np.arctan2(lab[...,2],lab[...,1])
def lch2ok(L,C,h): return np.stack([L,C*np.cos(h),C*np.sin(h)],-1)
def ingamut(lab,eps=1e-4):
    r=ok2rgb_lin(lab); return np.all((r>=-eps)&(r<=1+eps),-1)
def gamut_clip(L,C,h,iters=12):
    """reduce chroma (bisection) until in sRGB gamut"""
    lo=np.zeros_like(C); hi=C.copy()
    ok=ingamut(lch2ok(L,C,h)); res=np.where(ok,C,0.)
    for _ in range(iters):
        mid=(lo+hi)/2; g=ingamut(lch2ok(L,mid,h)); lo=np.where(g,mid,lo); hi=np.where(g,hi,mid)
    return np.where(ok,C,lo)
