#!/usr/bin/python3 -I
# regions.py <c1|c2> [render.png] : regional values of a target, and of a render beside it.
import sys
from PIL import Image
import numpy as np
SC=dict(
 c2=dict(trunk=(0,.45,.09,.78),canopy=(0,0,.35,.35),sky=(.45,0,.7,.15),parapet=(.25,.43,.8,.49),columns=(.25,.50,.8,.57),
       water_mid=(.45,.60,1,.80),water_low=(.6,.85,1,1),tower=(.75,.2,.97,.45),paving=(0,.82,.2,1)),
 c1=dict(hero_tree=(0,0,.3,.3),roof=(.33,.25,.70,.30),hall=(.34,.34,.70,.45),wall=(.33,.48,.73,.555),doors=(.365,.575,.705,.665),
       side_tower=(.13,.33,.25,.45),left_trees=(0,.40,.28,.68),right_trees=(.77,.52,1,.68),avenue=(.40,.72,.95,.98),canal=(.02,.75,.15,.95),sky=(.68,.03,.98,.28),rail=(.13,.80,.27,.97)))
def load(p): return np.asarray(Image.open(p).convert("RGB").resize((1280,720),Image.LANCZOS)).astype(float)/255
def st(a,b):
    x0,y0,x1,y1=b; s=a[int(y0*720):int(y1*720),int(x0*1280):int(x1*1280)]
    L=.2126*s[...,0]+.7152*s[...,1]+.0722*s[...,2]; p=np.percentile(L,[10,50,90]); mx=s.max(-1); mn=s.min(-1)
    return p[0],p[1],p[2],((mx-mn)/np.maximum(mx,1e-6)).mean(),(s[...,0]-s[...,2]).mean()
sc=sys.argv[1]; c=load(f"refs/style/{sc}.png"); r=load(sys.argv[2]) if len(sys.argv)>2 else None
print(f"{'region':11s} target p10  p50  p90  sat  R-B"+("   | render p10  p50  p90  sat  R-B" if r is not None else ""))
for k,b in SC[sc].items():
    line=f"{k:11s} {b}  "+" ".join(f"{x:+.2f}" for x in st(c,b))
    if r is not None: line+="  |  "+" ".join(f"{x:+.2f}" for x in st(r,b))
    print(line)
