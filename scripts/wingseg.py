import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd
S='design/2d/all-species-accessories-v1'; T='design/2d/bee-turnarounds/assets'
def palette(b):
    if b=='zhuzha':
        a=np.array(Image.open(f'{S}/zhuzha/front-base-view.png').convert('RGBA'))[190:250,410:460].reshape(-1,4)
    else:
        a=np.concatenate([np.array(Image.open(f'{T}/{b}/wing-{s}.png').convert('RGBA')).reshape(-1,4) for s in ('left','right')])
    a=a[a[:,3]>200][:,:3].astype(float)
    rng=np.random.default_rng(0); c=a[rng.choice(len(a),12,replace=False)]
    for _ in range(12):
        l=((a[:,None]-c[None])**2).sum(-1).argmin(1)
        c=np.array([a[l==k].mean(0) if (l==k).any() else c[k] for k in range(len(c))])
    return c
def mask(img,pal,tight=30,loose=75):
    a=np.array(img).astype(float); rgb=a[...,:3]; al=a[...,3]
    d=np.sqrt(((rgb[:,:,None,:]-pal[None,None])**2).sum(-1)).min(-1)
    m=(d<tight)&(al>30)
    lab,n=nd.label(m); keep=np.zeros_like(m)
    for i in range(1,n+1):
        c=lab==i
        if c.sum()<500: continue
        keep|=c
    keep=nd.binary_fill_holes(keep)
    grow=keep.copy()
    for _ in range(4): grow=nd.binary_dilation(grow)&(((d<loose)&(al>0))|keep|(al<200))
    return grow
_PRI={}
def prior(d):
    if d not in _PRI:
        m=None
        for b in ['boris','nochka']:
            x=mask(Image.open(f'{S}/{b}/{d}-base-view.png').convert('RGBA'),palette(b))
            m=x if m is None else (m|x)
        _PRI[d]=nd.binary_dilation(m,iterations=5)
    return _PRI[d]
def mask2(img,pal,d,thr=48):
    a=np.array(img).astype(float); rgb=a[...,:3]; al=a[...,3]
    dist=np.sqrt(((rgb[:,:,None,:]-pal[None,None])**2).sum(-1)).min(-1)
    m=prior(d)&(((dist<thr)&(al>0))|(al<160))
    lab,n=nd.label(m); keep=np.zeros_like(m)
    for i in range(1,n+1):
        c=lab==i
        if c.sum()>=300: keep|=c
    return nd.binary_fill_holes(keep)&(al>0)
