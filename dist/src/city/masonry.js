import * as THREE from 'three';

/** Eight corners, outward winding. Recessed gate openings narrow toward the lintel. */
export function batteredBlock(batch,x0,x1,z0,z1,y0,y1,inset0=0,inset1=0) {
  const points=[[x0+inset0,y0,z0+inset0],[x1-inset0,y0,z0+inset0],[x1-inset0,y0,z1-inset0],[x0+inset0,y0,z1-inset0],
    [x0+inset1,y1,z0+inset1],[x1-inset1,y1,z0+inset1],[x1-inset1,y1,z1-inset1],[x0+inset1,y1,z1-inset1]];
  blockCorners(batch,points);
}
export function blockCorners(batch,points) {
  const faces=[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]],positions=[],idx=[];
  for(const face of faces){const k=positions.length/3;face.forEach(i=>positions.push(...points[i]));idx.push(k,k+1,k+2,k,k+2,k+3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(idx);g.computeVertexNormals();batch.add(g);g.dispose();
}

export function gatePlatform(batch,p) {
  const [cx,y,cz]=p.position,w=p.width/2,d=p.depth/2,b=p.batter;
  const edges=[-w,...p.openings.flatMap(o=>[o.x-o.width/2,o.x+o.width/2]),w];
  for(let i=0;i<edges.length;i+=2) {
    const a=edges[i],c=edges[i+1],left=i===0?null:p.openings[i/2-1],right=p.openings[i/2];
    // piers extend to the full platform height, with separate flat lintel blocks.
    const retreatLeft=left?(left.width-left.topWidth)/2:0,retreatRight=right?(right.width-right.topWidth)/2:0;
    const h=Math.min(left?.height??Infinity,right?.height??Infinity);
    const corners=(height,top)=>[[cx+a+(i===0?b*height:top?-retreatLeft:0),y+height,cz-d+b*height],
      [cx+c-(i===edges.length-2?b*height:top?-retreatRight:0),y+height,cz-d+b*height],
      [cx+c-(i===edges.length-2?b*height:top?-retreatRight:0),y+height,cz+d-b*height],
      [cx+a+(i===0?b*height:top?-retreatLeft:0),y+height,cz+d-b*height]];
    blockCorners(batch,[...corners(0,false),...corners(h,true)]);
    blockCorners(batch,[...corners(h,true),...corners(p.height,true)]);
  }
  for(const o of p.openings)batteredBlock(batch,cx+o.x-o.topWidth/2,cx+o.x+o.topWidth/2,cz-d+b*o.height,cz+d-b*o.height,y+o.height,y+p.height,0,0);
}
