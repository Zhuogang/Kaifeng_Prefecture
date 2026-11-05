import { GeometryBatch, profilePrism } from '../yingzao/geometry.js';
import { roofModel } from '../yingzao/roof.js';
import { fen } from '../yingzao/rules.js';

/** Inferred joinery layout within the source's 材/column grid. Alternating closed
 * doors, four-leaf lattice windows and plaster panels belong to the whole gallery,
 * with recessed infill and a continuous timber closure against the roof soffit. */
export function addCorridorPanels(hall, materials) {
  const l=hall.layout, s=l.spec, f=fen(s.caiGrade), roof=roofModel(l);
  const types=['lattice','door','lattice','wall','lattice'];
  for (let lod=0;lod<3;lod++) {
    const wood=new GeometryBatch(), plaster=new GeometryBatch();
    for (const edge of l.edges.filter(e=>e.side==='south')) {
      const {a,b,bay}=edge, x=(a.x+b.x)/2, z=l.depth/2;
      const w=b.x-a.x-24*f, base=s.platform.height, h=Math.min(a.topY,b.topY)-base-15*f;
      const rect=(batch,u,y,width,height,depth=12*f,recess=0)=>
        batch.box([x+u,base+y,z+recess],[width,height,depth],0);
      const type=types[bay%types.length];
      // The public hall's wall ends at columnHeight-0.55. Close that slot and
      // the bearing band behind the brackets, up to the actual curved soffit.
      const top = xx => roof.point('south',xx/roof.a,z/roof.b,-.12)[1]+.02;
      const closure=profilePrism([[a.x,base+h-8*f],[b.x,base+h-8*f],
        [b.x,top(b.x)],[a.x,top(a.x)]],14*f);
      closure.translate(0,0,z); wood.add(closure); closure.dispose();
      if (lod===2) {
        rect(plaster,0,h/2,w,h,.12);
        if(type!=='wall') rect(wood,0,h*.6,w*.68,h*.62,.14,-.08);
        continue;
      }
      const rail=7*f, front=-10*f;
      if(type==='wall') {
        rect(plaster,0,h/2,w,h,18*f);
        for(const y of [h*.33,h*.67]) rect(wood,0,y,w,rail,12*f,front);
        for(const u of [-w/6,w/6]) rect(wood,u,h/2,rail,h,12*f,front);
      } else {
        const opening=w*.72, sill=type==='door'?0:h*.34, topY=h-12*f;
        rect(plaster,0,sill/2,w,sill,18*f);
        for(const sign of [-1,1]) rect(plaster,sign*(w+opening)/4,(sill+h)/2,(w-opening)/2,h-sill,18*f);
        rect(plaster,0,(topY+h)/2,opening,h-topY,18*f);
        for(const y of [sill,topY]) rect(wood,0,y,opening+16*f,rail,14*f,front);
        const bottomPanel=type==='door'?h*.33:sill;
        if(type==='door') rect(wood,0,bottomPanel/2,opening,bottomPanel,10*f,front+3*f);
        for(let i=0;i<=4;i++) rect(wood,-opening/2+i*opening/4,(sill+topY)/2,5*f,topY-sill,12*f,front);
        const lower=Math.max(sill,bottomPanel), upper=topY;
        if(type==='door') rect(wood,0,lower,opening,rail,12*f,front);
        if(lod===0) {
          const count=Math.ceil(opening/(15*f));
          for(let i=1;i<count;i++) rect(wood,-opening/2+i*opening/count,(lower+upper)/2,2.5*f,upper-lower,6*f,front+2*f);
          for(let y=lower+18*f;y<upper;y+=18*f) rect(wood,0,y,opening,2.5*f,6*f,front+2*f);
          if(type==='door') for(const sign of [-1,1]) rect(wood,sign*4*f,lower*.8,2*f,9*f,7*f,front-3*f);
        } else for(let y=lower+30*f;y<upper;y+=30*f) rect(wood,0,y,opening,3*f,6*f,front+2*f);
      }
      for(const sign of [-1,1]) rect(wood,sign*w/2,h/2,9*f,h,14*f,front);
      for(const y of [5*f,h]) rect(wood,0,y,w,rail,14*f,front);
    }
    hall['lod'+lod].add(wood.mesh(materials.timber,'corridor-wall-joinery'),plaster.mesh(materials.plaster,'corridor-wall-plaster'));
  }
}
