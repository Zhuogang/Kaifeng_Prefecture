import * as THREE from 'three';

// inferred: these original Bézier drawings reconstruct the excavated one-horse/two-crane
// grouping and the feather/cloud language of ref6, not a traced archaeological survey.
const WIDTH=7.5,HEIGHT=2.84,RES=1536,ROWS=Math.round(RES*HEIGHT/WIDTH);
let atlas;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function path(start,commands) {
  const s=new THREE.Shape();s.moveTo(...start);
  for(const c of commands) {
    if(c.length===2)s.lineTo(...c);
    else if(c.length===4)s.quadraticCurveTo(...c);
    else s.bezierCurveTo(...c);
  }
  s.closePath();return s.getPoints(14).map(p=>[p.x,p.y]);
}
function ellipse(x,y,rx,ry,angle=0) {
  return Array.from({length:48},(_,i)=>{const t=i/48*Math.PI*2,a=Math.cos(t)*rx,b=Math.sin(t)*ry;
    return [x+a*Math.cos(angle)-b*Math.sin(angle),y+a*Math.sin(angle)+b*Math.cos(angle)];});
}
function stroke(points,r0,r1=r0) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],0)));
  const n=Math.max(18,Math.ceil(curve.getLength()/0.018)),p=curve.getPoints(n),sides=[[],[]];
  for(let i=0;i<=n;i++) {
    const tangent=curve.getTangent(i/n),r=r0+(r1-r0)*i/n;
    sides[0].push([p[i].x-tangent.y*r,p[i].y+tangent.x*r]);
    sides[1].push([p[i].x+tangent.y*r,p[i].y-tangent.x*r]);
  }
  return [...sides[0],...sides[1].reverse()];
}

function design() {
  const shapes=[];
  const add=(poly,height,rounding=0.07,detail=false,base=0.018)=>shapes.push({poly,height,rounding,detail,base});
  const draw=(p,c,h,r=0.08)=>add(path(p,c),h,r);
  const line=(pts,r,h,detail=false,end=r)=>add(stroke(pts,r,end),h,r*0.65,detail,0.008);
  const cut=(pts,r,depth)=>shapes.push({poly:stroke(pts,r,r*0.65),cut:depth,detail:true});
  // Rear legs first: swept hocks and cloven-looking dark hoof separations, not sticks.
  draw([4.26,1.27],[[4.65,1.25,4.50,0.94],[4.53,0.78,4.99,0.61],[5.14,0.45,5.31,0.32],
    [5.26,0.25,5.10,0.31],[4.88,0.47,4.60,0.52],[4.25,0.63,4.15,0.89],[4.04,1.13,4.26,1.27]],0.14,0.075);
  draw([4.51,1.42],[[4.89,1.43,4.78,1.07],[4.81,0.96,5.04,0.92],[5.27,0.82,5.47,0.57],
    [5.43,0.49,5.30,0.52],[5.02,0.73,4.78,0.74],[4.48,0.80,4.34,1.08],[4.30,1.31,4.51,1.42]],0.18,0.08);
  // Barrel: the rising shoulder and full haunch give the animal its leaping weight.
  draw([3.20,1.63],[[3.43,1.88,3.88,1.77,4.20,1.68],[4.52,1.72,4.88,1.53,4.79,1.30],
    [4.70,1.06,4.41,0.98,4.11,1.04],[3.83,1.06,3.58,1.12,3.31,1.14],[3.06,1.14,2.98,1.39,3.20,1.63]],0.25,0.20);
  // Forelegs: separate bent knees, long pasterns, and shaped hooves.
  draw([3.40,1.40],[[3.15,1.55,2.98,1.68,2.86,1.65],[2.72,1.65,2.57,1.36,2.48,1.25],
    [2.37,1.21,2.25,1.17],[2.17,1.10,2.24,1.02],[2.42,1.02,2.56,1.12],[2.73,1.25,2.91,1.46],
    [3.06,1.35,3.23,1.21],[3.39,1.22,3.40,1.40]],0.22,0.075);
  draw([3.32,1.26],[[3.10,1.20,2.89,1.18,2.80,1.05],[2.70,0.93,2.60,0.78,2.44,0.71],
    [2.30,0.66,2.28,0.55],[2.34,0.48,2.46,0.53],[2.58,0.64,2.72,0.68],[2.89,0.82,3.01,0.98],
    [3.31,1.02,3.43,1.16],[3.32,1.26]],0.24,0.075);
  // Arched neck, cheek, nasal bridge and open muzzle, all explicit closed profiles.
  draw([3.16,1.27],[[2.91,1.42,2.94,1.73,2.89,1.93],[2.85,2.10,2.73,2.23,2.72,2.39],
    [2.85,2.49,3.06,2.40,3.12,2.23],[3.24,2.03,3.19,1.90,3.40,1.72],
    [3.56,1.55,3.52,1.30,3.16,1.27]],0.28,0.13);
  draw([2.97,2.29],[[2.89,2.46,2.72,2.48,2.61,2.40],[2.52,2.35,2.47,2.28,2.29,2.26],
    [2.21,2.22,2.24,2.12,2.35,2.10],[2.50,2.07,2.58,2.12,2.68,2.14],
    [2.76,2.06,2.89,2.09,2.93,2.19],[2.97,2.29]],0.30,0.10);
  draw([2.83,2.40],[[2.80,2.54,2.84,2.66],[2.94,2.62,2.96,2.44],[2.83,2.40]],0.26,0.035);
  draw([3.00,2.37],[[3.04,2.53,3.16,2.57],[3.19,2.47,3.10,2.34],[3.00,2.37]],0.22,0.035);
  // Modest eye lids and nostril incisions; never deep circular eye sockets.
  add(ellipse(2.70,2.335,0.065,0.030,-0.16),0.314,0.018,true);
  cut([[2.66,2.33],[2.70,2.34],[2.74,2.32]],0.008,0.020);
  cut([[2.33,2.20],[2.37,2.22],[2.41,2.20]],0.012,0.023);
  cut([[2.28,2.145],[2.44,2.145],[2.58,2.18]],0.009,0.018);
  cut([[2.68,2.16],[2.77,2.20],[2.80,2.27]],0.010,0.014);
  // Wing silhouette and integral shoulder, then overlapping curved feather blades.
  add(ellipse(3.68,1.62,.32,.19,.35),.18,.10);
  for(let i=0;i<13;i++) {
    const t=i/12,x=3.50+t*0.38,y=1.48+t*0.13,ex=4.58+t*1.06,ey=1.53+t*1.16;
    const poly=path([x,y],[[x+0.20,y+0.24,ex-0.22,ey-0.06,ex,ey],
      [ex-0.21,ey-0.22,x+0.28,y-0.065,x+0.07,y-0.055],[x,y]]);
    add(poly,.185+t*.012,.040,false,.045);
    add(poly,0.212+t*0.016,0.036,true,0.16);
    cut([[x+0.13,y+0.02],[ex-0.31,ey-0.18],[ex-0.06,ey-0.045]],0.005,0.009);
  }
  for(let row=0;row<3;row++)for(let i=0;i<8-row;i++) {
    const x=3.48+i*0.13+row*0.10,y=1.54+row*0.12+i*0.05;
    add(path([x,y],[[x+0.09,y+0.14,x+0.30,y+0.17],[x+0.23,y+0.01,x+0.10,y-0.025],[x,y]]),0.235+row*0.008,0.027,true,0.195);
  }
  // Flowing mane: independent curved locks, narrow tapering ends, carved channels.
  for(let i=0;i<8;i++) {
    const y=2.32-i*0.09;
    const wave=.10+Math.sin(i*1.3)*.04,tip=3.76+Math.sin(i*.7)*.18;
    line([[3.04,y],[3.28,y+wave],[3.49,y+wave*1.8],[3.66,y+wave*.8],[tip,y+wave*2.5]],0.032,0.175,false,0.007);
    cut([[3.17,y+0.005],[3.36,y+wave],[3.57,y+wave*1.2],[tip-.03,y+wave*2.1]],0.005,0.012);
  }
  // Tail with a broad root and ribbons curving back on themselves.
  for(let i=0;i<7;i++) {
    const y=1.35+i*0.042;
    line([[4.65,y],[4.98,y+0.04],[5.30,y-0.20],[5.53,y-0.14],[5.68,y+0.12],[5.51,y+0.28]],0.043,0.135,false,0.008);
  }
  // Low scale/skin incisions on barrel and shoulder, distinct from the wing feathers.
  for(let row=0;row<5;row++)for(let i=0;i<15;i++) {
    const x=3.23+i*0.095+(row%2)*0.048,y=1.16+row*0.085;
    cut([[x,y+0.04],[x+0.045,y],[x+0.09,y+0.04]],0.004,0.006);
  }
  const crane=(cx,flip)=>{
    const transform=poly=>poly.map(([x,y])=>[cx+flip*x,y]);
    const bird=(p,c,h,r=0.05)=>add(transform(path(p,c)),h,r);
    // Legs, fine toes and small body with hanging tail feathers.
    for(const off of [-0.1,0.09]) {
      line([[cx+flip*off,1.11],[cx+flip*(off+0.10),0.70],[cx+flip*(off-0.03),0.36]],0.025,0.095,false,0.017);
      for(let k=0;k<3;k++)line([[cx+flip*(off-0.03),0.36],[cx+flip*(off-0.20+k*0.14),0.29]],0.012,0.08,true,0.004);
    }
    bird([-0.20,1.51],[[0.08,1.65,0.32,1.47,0.28,1.27],[0.20,1.09,-0.04,1.01,-0.23,1.10],[-0.42,1.21,-0.37,1.41,-0.20,1.51]],0.16,0.10);
    bird([0.10,1.42],[[0.37,1.58,0.42,1.68,0.30,1.85],[0.18,2.03,0.10,2.18,0.25,2.28],
      [0.36,2.35,0.44,2.33,0.49,2.30],[0.58,2.26,0.72,2.28,0.87,2.31],
      [0.77,2.22,0.63,2.20,0.48,2.21],[0.27,2.18,0.33,2.06,0.41,1.92],
      [0.59,1.69,0.49,1.42,0.23,1.30],[0.10,1.42]],0.18,0.046);
    add(transform(ellipse(0.40,2.30,0.11,0.075)),0.195,0.045);
    // A narrow bill and tiny incised eye.
    add(transform(path([0.48,2.32],[[0.91,2.37],[0.51,2.25],[0.48,2.32]])),0.16,0.016);
    const eye=transform([[0.411,2.315],[0.437,2.317]]);cut(eye,0.006,0.018);
    add(transform(ellipse(-.18,1.47,.26,.22,.4)),.15,.08);
    for(let i=0;i<11;i++) {
      const t=i/10,x=-0.12-t*0.08,y=1.30+t*0.12,ex=-0.89-t*0.23,ey=1.50+t*0.94;
      const vane=transform(path([x,y],[[x-0.10,y+0.21,ex+0.08,ey-0.15,ex,ey],
        [ex-0.03,ey-0.22,x-0.20,y+0.02,x-0.02,y-0.04],[x,y]]));
      add(vane,.165+t*.014,.032,false,.040);
      add(vane,0.205+t*0.015,0.033,true,0.145);
      cut(transform([[x-0.035,y+0.03],[ex+0.11,ey-0.27],[ex,ey-0.05]]),0.004,0.009);
    }
    for(let i=0;i<6;i++)line(transform([[-0.15,1.30],[-0.31-i*0.018,1.03],[-0.55-i*0.025,0.86-i*0.022]]),0.034,0.135,true,0.008);
  };
  crane(1.12,1);crane(6.38,-1);
  // Ruyi cloud lobes, curling tips and trailing vapour between the figures.
  for(const [x,y,s,flip] of [[0.47,0.55,.8,1],[1.65,.34,.9,-1],[2.08,1.83,.75,1],[2.76,.25,.8,1],
    [3.65,.40,.8,-1],[4.65,.28,.9,1],[5.62,.45,.85,-1],[6.83,.46,.8,1],[7.08,1.50,.7,-1],[0.45,2.50,.6,1],[5.39,2.48,.55,1]]) {
    const transform=p=>p.map(([a,b])=>[x+flip*a*s,y+b*s]);
    add(transform(path([-.46,-.04],[[ -.57,.05,-.48,.20,-.35,.15],[-.36,.36,-.12,.42,-.04,.24],
      [.09,.35,.29,.28,.27,.12],[.48,.16,.50,-.03,.32,-.10],[.10,-.26,-.13,-.12,-.30,-.20],[-.47,-.30,-.65,-.30,-.78,-.15],[-.59,-.20,-.53,-.12,-.46,-.04]])),0.115,0.065);
    const curl=[];for(let i=0;i<36;i++){const a=i/35*Math.PI*2.8,r=.14*(1-i/43);curl.push([r*Math.cos(a)-.07,r*Math.sin(a)+.12]);}
    cut(transform(curl),0.010*s,0.025);
    line(transform([[-.41,-.13],[-.17,-.04],[.07,-.12],[.36,-.03],[.60,-.10]]),0.022*s,0.07,true,0.005);
  }
  return shapes;
}

// Scan conversion + two-pass chamfer distance. The distance field rounds each closed
// profile; raster resolution is independent of mesh LOD, so small details cannot spike.
function rasterShape(shape,macro,fine) {
  const poly=shape.poly,dx=WIDTH/RES,dy=HEIGHT/ROWS;
  let x0=RES,x1=0,y0=ROWS,y1=0;
  for(const [x,y] of poly){x0=Math.min(x0,Math.floor(x/dx)-2);x1=Math.max(x1,Math.ceil(x/dx)+2);y0=Math.min(y0,Math.floor(y/dy)-2);y1=Math.max(y1,Math.ceil(y/dy)+2);}
  x0=clamp(x0,0,RES);x1=clamp(x1,0,RES);y0=clamp(y0,0,ROWS);y1=clamp(y1,0,ROWS);
  const w=x1-x0+1,h=y1-y0+1;if(w<2||h<2)return;
  const distance=new Float32Array(w*h);
  for(let j=0;j<h;j++) {
    const yy=(j+y0)*dy,hits=[];
    for(let a=0,b=poly.length-1;a<poly.length;b=a++){
      const p=poly[a],q=poly[b];if((p[1]>yy)!==(q[1]>yy))hits.push(p[0]+(yy-p[1])/(q[1]-p[1])*(q[0]-p[0]));
    }
    hits.sort((a,b)=>a-b);
    for(let k=0;k<hits.length-1;k+=2){const a=clamp(Math.ceil(hits[k]/dx)-x0,0,w-1),b=clamp(Math.floor(hits[k+1]/dx)-x0,0,w-1);for(let i=a;i<=b;i++)distance[j*w+i]=100;}
  }
  const diag=Math.hypot(dx,dy);
  for(let j=1;j<h;j++)for(let i=1;i<w-1;i++){const at=j*w+i;if(distance[at])distance[at]=Math.min(distance[at],distance[at-1]+dx,distance[at-w]+dy,distance[at-w-1]+diag,distance[at-w+1]+diag);}
  for(let j=h-2;j>=0;j--)for(let i=w-2;i>=1;i--){const at=j*w+i;if(distance[at])distance[at]=Math.min(distance[at],distance[at+1]+dx,distance[at+w]+dy,distance[at+w+1]+diag,distance[at+w-1]+diag);}
  for(let j=0;j<h;j++)for(let i=0;i<w;i++) {
    const d=distance[j*w+i];if(!d)continue;
    const at=(j+y0)*(RES+1)+i+x0,edge=clamp(d/0.010,0,1);
    if(shape.cut){if(fine[at]>0.04)fine[at]-=shape.cut*Math.sin(edge*Math.PI/2);continue;}
    const dome=Math.sqrt(1-Math.exp(-d/shape.rounding));
    const v=edge*(shape.base+(shape.height-shape.base)*dome);
    if(!shape.detail){macro[at]=Math.max(macro[at],v);fine[at]=Math.max(fine[at],v);}
    else {
      // Fine vanes sit only millimetres above the structural wing/neck. Their edges
      // return to the underlying stone instead of creating a second vertical wall.
      const rise=Math.min(.015,Math.max(.003,shape.height-macro[at]));
      fine[at]=Math.max(fine[at],macro[at]+rise*dome*edge);
    }
  }
}
function buildAtlas() {
  const count=(RES+1)*(ROWS+1),macro=new Float32Array(count),fine=new Float32Array(count);
  for(const shape of design())rasterShape(shape,macro,fine);
  // inferred: staggered, irregular ashlar courses, 8 mm joints and faces up to
  // 12 mm out of plane. Both stone backing and figures share the same real joints.
  const stoneTone=new Float32Array(count);
  const hash=n=>{const x=Math.sin(n*127.13+31.7)*43758.5453;return x-Math.floor(x);};
  const courses=[0,.42,.92,1.36,1.86,2.35,HEIGHT];
  for(let row=0;row<courses.length-1;row++) {
    const y0=courses[row],y1=courses[row+1],edges=[0];let x=0;
    while(x<WIDTH){x+=0.86+hash(row*37+edges.length)*.75;edges.push(Math.min(WIDTH,x));}
    for(let block=0;block<edges.length-1;block++){
      const x0=edges[block],x1=edges[block+1],id=row*19+block;
      for(let j=Math.ceil(y0/HEIGHT*ROWS);j<=Math.min(ROWS,Math.floor(y1/HEIGHT*ROWS));j++)for(let i=Math.ceil(x0/WIDTH*RES);i<=Math.min(RES,Math.floor(x1/WIDTH*RES));i++) {
        const at=j*(RES+1)+i,xx=i/RES*WIDTH,yy=j/ROWS*HEIGHT;
        const d=Math.min(xx-x0,x1-xx,yy-y0,y1-yy);
        const joint=(1-clamp(d/.015,0,1))*.014;
        const face=.022+(hash(id+93)-.5)*.012;
        macro[at]=Math.max(0,macro[at]+face-joint);fine[at]=Math.max(0,fine[at]+face-joint);
        stoneTone[at]=.25+hash(id+51)*.62;
      }
    }
  }
  for(let j=0;j<=ROWS;j++)for(let i=0;i<=RES;i++)fine[j*(RES+1)+i]+=(Math.sin(i*.49+j*.071)*Math.sin(j*.91-i*.11))*.00045;
  const normals=new Uint8Array(count*4),heights=new Uint8Array(count),ao=new Float32Array(count);
  const normalHeight=(i,j)=>{const at=clamp(j,0,ROWS)*(RES+1)+clamp(i,0,RES);return fine[at];};
  for(let j=0;j<=ROWS;j++)for(let i=0;i<=RES;i++) {
    const at=j*(RES+1)+i;
    const gx=(normalHeight(i+1,j)-normalHeight(i-1,j))/(2*WIDTH/RES),gy=(normalHeight(i,j+1)-normalHeight(i,j-1))/(2*HEIGHT/ROWS);
    const inv=1/Math.hypot(gx,gy,1);normals.set([Math.round((-gx*inv*.5+.5)*255),Math.round((-gy*inv*.5+.5)*255),Math.round((inv*.5+.5)*255),Math.round(stoneTone[at]*255)],at*4);
    heights[at]=Math.round(clamp(fine[at]/0.4,0,1)*255);
    let horizon=0;for(const [di,dj] of [[8,0],[-8,0],[0,8],[0,-8],[18,0],[-18,0],[0,18],[0,-18]]){
      const n=clamp(j+dj,0,ROWS)*(RES+1)+clamp(i+di,0,RES);horizon+=Math.max(0,fine[n]-fine[at]);}
    ao[at]=clamp(horizon*2.8,0,0.60);
  }
  return {width:RES+1,height:ROWS+1,data:heights,normals,macro,ao};
}
export function reliefAtlas(){return atlas??=buildAtlas();}
export function reliefGeometry(nx=240,ny=96) {
  const field=reliefAtlas(),p=[],uv=[],idx=[],cavity=[];
  const sample=(array,u,v)=>{
    const x=u*RES,y=v*ROWS,i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j;
    const get=(xx,yy)=>array[clamp(yy,0,ROWS)*(RES+1)+clamp(xx,0,RES)];
    return get(i,j)*(1-a)*(1-b)+get(i+1,j)*a*(1-b)+get(i,j+1)*(1-a)*b+get(i+1,j+1)*a*b;
  };
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const u=i/nx,v=j/ny,at=j*(nx+1)+i;
    p.push(u*WIDTH,v*HEIGHT,.012+sample(field.macro,u,v));uv.push(u,v);cavity.push(sample(field.ao,u,v));
    if(i<nx&&j<ny){const b=at+1,c=at+nx+1;idx.push(at,b,c,b,c+1,c);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('stoneCavity',new THREE.Float32BufferAttribute(cavity,1));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();g.userData.heightField=field;return g;
}
