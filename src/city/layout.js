import * as PLAN from '../world/plan.js';

// inferred: block boundaries, winding lanes, lot divisions and courtyard footprints
// reconstruct an unsurveyed city. Named sites and the avenue stay explicitly reserved.
export function cityLayout(engine) {
  const p = PLAN.CITY, rng = engine.rng('T8-city-plan'), houses = [], blocks = [], trees = [];
  const offices = p.offices;
  const roadOpenings = PLAN.YUJIE?.openings || PLAN.YUJIE?.crossStreets || p.crossStreets;
  const openings = roadOpenings.map(v => typeof v === 'number' ? v : v.z ?? v.position?.[2]).filter(Number.isFinite);
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
        .filter(([l,r,t,u])=>r-l>=23&&u-t>=24);
    });
    return pieces;
  }
  function district(x0,x1,z0,z1,outer) {
    for(let z=z0; z<z1;) {
      let end=Math.min(z1,z+rng.range(outer?105:78,outer?170:124));
      const cross=openings.find(v => v>z+12 && v<end+12);
      if(cross!==undefined) end=cross-8;
      if(end-z<25) {z+=24;continue;}
      for(let x=x0; x<x1;) {
        const right=Math.min(x1,x+rng.range(outer?115:82,outer?175:132));
        const lane=rng.range(4,7);
        for(const [ax,bx,az,bz] of available(x+lane,right-lane,z+lane,end-lane)) {
          const block={x:(ax+bx)/2,z:(az+bz)/2,hw:(bx-ax)/2,hd:(bz-az)/2,outer};
          blocks.push(block);
          const nx=Math.max(1,Math.floor((bx-ax)/(outer?42:24))), nz=Math.max(1,Math.floor((bz-az)/(outer?44:27)));
          for(let j=0;j<nz;j++)for(let i=0;i<nx;i++) {
            const w=(bx-ax)/nx,d=(bz-az)/nz,cx=ax+(i+.5)*w,cz=az+(j+.5)*d;
            const yaw=rng.range(-0.055,0.055)+(rng.chance(.12)?Math.PI/2:0);
            const two=rng.chance(.22), h=two?rng.range(1.65,1.92):rng.range(.86,1.12);
            const tint=rng.range(.68,1.23), ground=p.surfaceY;
            const add=(dx,dz,sx,sz,angle,height=h)=> {
              const co=Math.cos(yaw),si=Math.sin(yaw);
              houses.push({position:[cx+dx*co+dz*si,ground,cz-dx*si+dz*co],
                scale:[sx,height,sz],yaw:yaw+angle,tint,outer,two:height>1.5});
            };
            // A north hall and two side ranges enclose a court, leaving a south entrance.
            add(0,-d*.30,rng.range(1.12,1.57),rng.range(.7,.9),0);
            add(-w*.32,0,rng.range(.85,1.17),.64,Math.PI/2,two?1.1:h);
            add(w*.32,1,rng.range(.85,1.17),.64,Math.PI/2);
            if(rng.chance(.48))add(0,d*.31,1.05,.63,0,.9);
            if(rng.chance(outer?.12:.29))trees.push([cx,ground,cz+2]);
          }
        }
        x=right;
      }
      z=end+ (cross!==undefined && Math.abs(end-(cross-8))<.1?16:rng.range(5,10));
    }
  }
  district(-p.east,p.east,p.north,p.south,false);
  // No bare apron around the inner wall; outer neighbourhoods continue to four km.
  district(-p.outerExtent,-p.east-28,-p.outerExtent,p.outerExtent,true);
  district(p.east+28,p.outerExtent,-p.outerExtent,p.outerExtent,true);
  district(-p.east-28,p.east+28,-p.outerExtent,p.north-28,true);
  district(-p.east-28,p.east+28,p.south+28,p.outerExtent,true);
  return {houses,blocks,trees,openings};
}
