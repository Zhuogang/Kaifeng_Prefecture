import * as PLAN from '../world/plan.js';

// inferred: unsurveyed, tightly packed courtyard ranges, kinked lanes and occasional
// larger compounds. Every reservation is shared by all cameras and time presets.
export function cityLayout(engine) {
  const p=PLAN.CITY,f=p.fabric,rng=engine.rng('W1-city-fabric'),houses=[],blocks=[],trees=[],courts=[];
  const offices=p.offices,openings=(PLAN.YUJIE?.crossStreets||p.crossStreets).map(v=>typeof v==='number'?v:v.z).filter(Number.isFinite);
  const palace=p.palaceReservation,river=PLAN.BIANHE;
  const reservations=[[-p.avenueHalfWidth-6,p.avenueHalfWidth+6,0,p.south],
    [-palace.halfWidth,palace.halfWidth,palace.north,palace.south],
    [-p.outerExtent,p.outerExtent,river.center[2]-river.width/2-river.quayWidth,river.center[2]+river.width/2+river.quayWidth],
    [PLAN.TIETA.position[0]-p.templeRadius,PLAN.TIETA.position[0]+p.templeRadius,PLAN.TIETA.position[2]-p.templeRadius,PLAN.TIETA.position[2]+p.templeRadius],
    ...offices.map(o=>[o.position[0]-o.halfWidth-4,o.position[0]+o.halfWidth+4,o.position[2]-o.halfDepth-4,o.position[2]+o.halfDepth+4])];
  function available(ax,bx,az,bz) {
    let pieces=[[ax,bx,az,bz]];
    for(const [x0,x1,z0,z1] of reservations)pieces=pieces.flatMap(([a,b,c,d])=>{
      if(b<=x0||a>=x1||d<=z0||c>=z1)return [[a,b,c,d]];
      return [[a,b,c,Math.min(d,z0)],[a,b,Math.max(c,z1),d],
        [a,Math.min(b,x0),Math.max(c,z0),Math.min(d,z1)],[Math.max(a,x1),b,Math.max(c,z0),Math.min(d,z1)]]
        .filter(([l,r,t,u])=>r-l>=17&&u-t>=19);
    });return pieces;
  }
  function divisions(a,b,size) {
    const n=Math.max(1,Math.round((b-a)/size)),weights=Array.from({length:n},()=>rng.range(.78,1.25));
    const total=weights.reduce((s,v)=>s+v,0),out=[a];
    for(const v of weights)out.push(out.at(-1)+(b-a)*v/total);return out;
  }
  function fill(ax,bx,az,bz,outer) {
    blocks.push({x:(ax+bx)/2,z:(az+bz)/2,hw:(bx-ax)/2,hd:(bz-az)/2,outer});
    const rows=divisions(az,bz,outer?f.outerCourtDepth:f.courtDepth);
    const blockYaw=rng.range(-.12,.12);
    for(let j=1;j<rows.length;j++) {
      const columns=divisions(ax,bx,(outer?f.outerCourtWidth:f.courtWidth)*rng.range(.88,1.17));
      for(let i=1;i<columns.length;i++) {
        const w=columns[i]-columns[i-1],d=rows[j]-rows[j-1],cx=(columns[i]+columns[i-1])/2,cz=(rows[j]+rows[j-1])/2;
        const turned=rng.chance(.24),cw=turned?d:w,cd=turned?w:d;
        const yaw=blockYaw+rng.range(-.018,.018)+(turned?Math.PI/2:0),two=rng.chance(.23),height=rng.range(.9,1.13),tint=rng.range(.78,1.14);
        const north=cd*rng.range(f.northDepth-.025,f.northDepth+.025),south=cd*f.southDepth;
        const wing=cw*f.wingDepth,depth=cd-north-south+.5;
        // Adjacent ranges share a roof edge. A setback around every individual
        // building made the previous city mostly bare earth. Clip only at the
        // actual street/block boundary; leave the small interior court open.
        const margin=.15;
        const add=(dx,dz,width,roofDepth,angle,upper=two)=>{
          const co=Math.cos(yaw),si=Math.sin(yaw),position=[cx+dx*co+dz*si,p.surfaceY,cz-dx*si+dz*co];
          const scale=[Math.max(3,width-2*margin)/(f.roofHalfWidth*2),height,Math.max(3,roofDepth-2*margin)/(f.roofHalfDepth*2)];
          const a=yaw+angle,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
          let hx=c*scale[0]*f.roofHalfWidth+s*scale[2]*f.roofHalfDepth,hz=s*scale[0]*f.roofHalfWidth+c*scale[2]*f.roofHalfDepth;
          const fit=Math.min(1,(bx-ax-.2)/(hx*2),(bz-az-.2)/(hz*2));scale[0]*=fit;scale[2]*=fit;hx*=fit;hz*=fit;
          position[0]=Math.max(ax+hx,Math.min(bx-hx,position[0]));position[2]=Math.max(az+hz,Math.min(bz-hz,position[2]));
          houses.push({position,scale,yaw:yaw+angle,tint:rng.range(.93,1.07)*tint,outer,two:upper,storey:upper?3.1:0,
            roofWidth:scale[0]*f.roofHalfWidth*2,roofDepth:scale[2]*f.roofHalfDepth*2});
        };
        add(0,-cd/2+north/2,cw*f.roofFraction,north,0);
        add(0,cd/2-south/2,cw*f.roofFraction,south,0,rng.chance(.12));
        add(-cw/2+wing/2,(north-south)/2,depth,wing,Math.PI/2,false);
        add(cw/2-wing/2,(north-south)/2,depth,wing,Math.PI/2,rng.chance(.12));
        courts.push({x:cx,z:cz,width:w,depth:d,outer});
        // Clumps favour occasional larger yards instead of a regular tree per lot.
        if(rng.chance(.085)) {
          const count=rng.chance(.35)?3:1;
          for(let k=0;k<count;k++)trees.push([cx+rng.range(-w*.08,w*.08),p.surfaceY,cz+rng.range(-d*.08,d*.08)]);
        }
      }
    }
  }
  function district(x0,x1,z0,z1,outer) {
    for(let z=z0;z<z1;) {
      let end=Math.min(z1,z+rng.range(85,175));
      const cross=openings.find(v=>v>z+20&&v<end+10);if(cross!==undefined)end=cross-5;
      if(end-z<25){z+=24;continue;}
      for(let x=x0;x<x1;) {
        const right=Math.min(x1,x+rng.range(85,185)),lane=f.lane*rng.range(.7,1.3);
        for(const piece of available(x+lane/2,right-lane/2,z+lane/2,end-lane/2))fill(...piece,outer);
        x=right;
      }
      z=end+(cross!==undefined&&Math.abs(end-(cross-5))<.1?10:rng.range(2.4,5.2));
    }
  }
  district(-p.east,p.east,p.north,p.south,false);
  district(-p.outerExtent,-p.east-12,-p.outerExtent,p.outerExtent,true);
  district(p.east+12,p.outerExtent,-p.outerExtent,p.outerExtent,true);
  district(-p.east-12,p.east+12,-p.outerExtent,p.north-12,true);
  district(-p.east-12,p.east+12,p.south+12,p.outerExtent,true);
  return {houses,blocks,trees,courts,openings};
}
