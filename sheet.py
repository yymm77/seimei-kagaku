# -*- coding: utf-8 -*-
"""要確認の行を、原典の紙面から切り出して一枚の画像に並べる。
   機械で読めなかった行を、目で読むための道具。"""
import numpy as np, maki_su, json
from PIL import Image

def row_images(page_png, idxs, pad=10):
    a, bw = maki_su.load(page_png); H=a.shape[0]
    b = maki_su.auto_bands(a,bw)
    segs = maki_su.row_segments(bw, int(H*0.11), int(H*0.955))
    x0 = b['ab'][0]; x1 = b['type'][1]
    out=[]
    for i in idxs:
        if i >= len(segs): continue
        y0,y1 = segs[i]
        out.append(Image.fromarray(a[max(0,y0-pad):y1+pad, x0:x1]))
    return out

def contact(ims, path, gap=16, scale=1.0):
    if scale != 1.0:
        ims=[im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS) for im in ims]
    W = max(i.width for i in ims); H = sum(i.height+gap for i in ims)+gap
    c = Image.new('L',(W,H),255); y=gap
    for im in ims:
        c.paste(im,(0,y)); y += im.height+gap
    c.save(path); return c.size
