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
    const n=Math.max(1,Math.round((b-a)/size)),weights=Array.from({length:n},()=>rng.range(.65,1.4));
    const total=weights.reduce((s,v)=>s+v,0),out=[a];
    for(const v of weights)out.push(out.at(-1)+(b-a)*v/total);return out;
  }
  function fill(ax,bx,az,bz,outer) {
    blocks.push({x:(ax+bx)/2,z:(az+bz)/2,hw:(bx-ax)/2,hd:(bz-az)/2,outer});
    const rows=divisions(az,bz,outer?f.outerCourtDepth:f.courtDepth);
    const blockYaw=rng.range(-.18,.18);
    for(let j=1;j<rows.length;j++) {
      const columns=divisions(ax,bx,(outer?f.outerCourtWidth:f.courtWidth)*rng.range(.88,1.17));
      for(let i=1;i<columns.length;i++) {
        // inferred: occasional joined parcels form larger compounds. Their main
        // ranges remain separate buildings rather than stretching a five-bay hall.
        const left=columns[i-1],large=i<columns.length-1&&rng.chance(.09);
        if(large)i++;
        const w=columns[i]-left,d=rows[j]-rows[j-1],cx=(columns[i]+left)/2,cz=(rows[j]+rows[j-1])/2;
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
        if(cw>34)for(const sign of [-1,1])add(sign*cw*.25,-cd/2+north/2+rng.range(-.5,.5),cw*.49,north,0);
        else add(0,-cd/2+north/2,cw*f.roofFraction,north,0);
        add(0,cd/2-south/2,cw*f.roofFraction,south,0,rng.chance(.12));
        add(-cw/2+wing/2,(north-south)/2,depth,wing,Math.PI/2,false);
        add(cw/2-wing/2,(north-south)/2,depth,wing,Math.PI/2,rng.chance(.12));
        courts.push({x:cx,z:cz,width:w,depth:d,outer,large});
        // Clumps favour occasional larger yards instead of a regular tree per lot.
        if(rng.chance(.085)) {
          const count=rng.chance(.35)?3:1;
          for(let k=0;k<count;k++)trees.push([cx+rng.range(-w*.08,w*.08),p.surfaceY,cz+rng.range(-d*.08,d*.08)]);
        }
      }
    }
  }
  function district(x0,x1,z0,z1,outer) {
    // inferred: only the named cross streets continue across a district. Minor
    // lanes terminate at staggered junctions; successive bands shift their lanes.
    // Previously every block shared a row boundary, producing kilometre-long rows.
    for(let z=z0;z<z1;) {
      let end=Math.min(z1,z+rng.range(280,480));
      const cross=openings.find(v=>v+5>z&&v-5<end);
      if(cross!==undefined)end=Math.max(z,cross-5);
      for(let x=x0;x<x1;) {
        const right=Math.min(x1,x+rng.range(85,185)),lane=f.lane*rng.range(.7,1.3);
        const rows=divisions(z,end,rng.range(85,175));
        for(let row=1;row<rows.length;row++) {
          for(const piece of available(x+lane/2,right-lane/2,rows[row-1]+lane/2,rows[row]-lane/2))fill(...piece,outer);
        }
        x=right;
      }
      z=cross!==undefined?cross+5:end+f.lane;
    }
  }
  district(-p.east,p.east,p.north,p.south,false);
  district(-p.outerExtent,-p.east-12,-p.outerExtent,p.outerExtent,true);
  district(p.east+12,p.outerExtent,-p.outerExtent,p.outerExtent,true);
  district(-p.east-12,p.east+12,-p.outerExtent,p.north-12,true);
  district(-p.east-12,p.east+12,p.south+12,p.outerExtent,true);
  // inferred: mature huai clumps occupy a larger share of unroofed yards. A
  // separate stream preserves all existing parcels, buildings and street gaps.
  const grove=engine.rng('W4-city-court-groves');
  for(const c of courts)if(grove.chance(c.outer?.065:.32)) {
    const count=grove.int(2,3),radius=Math.min(c.width,c.depth)*.12;
    for(let k=0;k<count;k++) {
      const angle=grove.range(0,Math.PI*2),r=grove.range(.3,1)*radius;
      trees.push([c.x+Math.cos(angle)*r,p.surfaceY,c.z+Math.sin(angle)*r]);
    }
  }
  return {houses,blocks,trees,courts,openings};
}
