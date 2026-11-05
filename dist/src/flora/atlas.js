import * as THREE from 'three';

// inferred: painted botanical sprays, dimensions and coverage targets. Every texel is
// generated locally; no photograph, external asset, or pre-lit sun direction is used.
const CELL=1024, SIZE=CELL*2;
let cached;
function leaf(ctx,x,y,length,width,angle,tone) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=tone;
  ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-width,-length*0.35,-width*0.4,-length*0.8,0,-length);
  ctx.bezierCurveTo(width*0.4,-length*0.8,width,-length*0.35,0,0);ctx.fill();ctx.restore();
}
function willow(ctx,rng) {
  // inferred: one narrow shoot per strip, with alternate lanceolate leaves.
  // A strip is approximately twenty-five times longer than it is wide in world
  // space, so compensate while painting; no metre-wide sheet of repeated shoots.
  const end=1008,bend=rng.range(-42,42),stem=x=>512+bend*Math.sin(x/end*2.4);
  ctx.strokeStyle='#7f8058';ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(stem(0),0);
  for(let y=16;y<=end;y+=16)ctx.lineTo(stem(y),y);
  ctx.stroke();
  let side=1;
  for(let y=24;y<end-18;y+=rng.range(18,29)) {
    const taper=0.4+0.6*Math.sin(Math.PI*(y/end)*0.85);
    ctx.save();ctx.translate(stem(y),y);ctx.scale(16,1);
    leaf(ctx,0,0,rng.range(13,21)*taper,rng.range(1.7,2.5),Math.PI+side*rng.range(0.42,1.05),rng.pick(['#b5c18e','#a6b681','#94a66f','#c1c99c']));
    ctx.restore();side=-side;
  }
}
function spray(ctx,rng,kind) {
  const twigs=[];
  const grow=(x,y,angle,len,depth)=>{
    const ex=x+Math.sin(angle)*len,ey=y-Math.cos(angle)*len;
    ctx.strokeStyle=kind===0?'#796f65':'#686955';ctx.lineWidth=Math.max(0.7,3.4-depth*0.6);
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+ex)*0.5+10,(y+ey)*0.5,ex,ey);ctx.stroke();
    twigs.push({x,y,ex,ey,depth});
    if(depth<4) for(let k=0;k<3;k++) {
      const t=0.35+k*0.25;grow(x+(ex-x)*t,y+(ey-y)*t,angle+(k%2?1:-1)*rng.range(0.45,1.15),len*rng.range(0.38,0.62),depth+1);
    }
  };
  grow(512,970,rng.range(-0.12,0.12),620,0);
  for(const b of twigs) {
    const count=kind===0?7:kind===1?19:30;
    for(let i=0;i<count;i++) {
      const t=rng.random(),x=b.x+(b.ex-b.x)*t+rng.gauss(0,kind===0?25:12),y=b.y+(b.ey-b.y)*t+rng.gauss(0,18);
      if(kind===0) {
        const radius=rng.range(10,17),tone=rng.pick(['#f0e4d8','#fff6ea','#d4c3b8','#e7d7ce']);
        ctx.fillStyle=tone;
        for(let p=0;p<5;p++) {const a=p*Math.PI*0.4;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*radius*0.58,y+Math.sin(a)*radius*0.58,radius*0.65,radius*0.45,a,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='#a38c58';ctx.fillRect(x-0.7,y-0.7,1.4,1.4);
        if(i%23===0) leaf(ctx,x,y,13,4,rng.range(-2,2),'#929b72');
      } else {
        const bai=kind===2;
        leaf(ctx,x,y,rng.range(bai?13:18,bai?27:34),bai?3:8,rng.range(-2.8,2.8),rng.pick(bai?['#8b987e','#a0ac8e','#687b60','#b2b99a']:['#bbc39a','#9eae7f','#819866','#c2c9a5']));
      }
    }
  }
}

// Coverage-preserving mipmaps keep subpixel sprays present instead of disappearing
// into isolated bright dots. RGB is dilated to avoid dark cutout fringes.
function texture(canvas) {
  const data=new Uint8Array(canvas.getContext('2d').getImageData(0,0,SIZE,SIZE).data),targets=[];
  for(let c=0;c<4;c++) {
    let coverage=0;const ox=c%2*CELL,oy=Math.floor(c/2)*CELL;
    for(let y=oy;y<oy+CELL;y++) for(let x=ox;x<ox+CELL;x++) {
      const i=(y*SIZE+x)*4;
      if(data[i+3]>96) coverage++;
      if(data[i+3]<10) {data[i]=170;data[i+1]=174;data[i+2]=145;}
    }
    targets.push(coverage/(CELL*CELL));
  }
  const mips=[{data,width:SIZE,height:SIZE}];let prev=data,s=SIZE;
  while(s>1) {
    const n=s/2,out=new Uint8Array(n*n*4);
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) for(let k=0;k<4;k++) {
      const a=((y*2)*s+x*2)*4+k;out[(y*n+x)*4+k]=(prev[a]+prev[a+4]+prev[a+s*4]+prev[a+s*4+4])/4;
    }
    if(n>=8) for(let c=0;c<4;c++) {
      const cs=n/2,ox=c%2*cs,oy=Math.floor(c/2)*cs,hist=new Uint32Array(256);
      for(let y=oy;y<oy+cs;y++) for(let x=ox;x<ox+cs;x++) hist[out[(y*n+x)*4+3]]++;
      let acc=0,cut=255;while(cut>1 && acc<targets[c]*cs*cs)acc+=hist[cut--];
      const scale=Math.min(4,96/Math.max(1,cut));
      for(let y=oy;y<oy+cs;y++) for(let x=ox;x<ox+cs;x++) {const i=(y*n+x)*4+3;out[i]=Math.min(255,out[i]*scale);}
    }
    mips.push({data:out,width:n,height:n});prev=out;s=n;
  }
  const tex=new THREE.DataTexture(data,SIZE,SIZE);tex.mipmaps=mips;tex.generateMipmaps=false;
  tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=8;tex.needsUpdate=true;tex.name='Song-procedural-foliage';return tex;
}
export function foliageAtlas(rng) {
  if(cached)return cached;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
  const ctx=canvas.getContext('2d');
  for(let c=0;c<4;c++) {
    ctx.save();ctx.translate(c%2*CELL,Math.floor(c/2)*CELL);ctx.beginPath();ctx.rect(0,0,CELL,CELL);ctx.clip();
    if(c===0)willow(ctx,rng);else spray(ctx,rng,c-1);ctx.restore();
  }
  cached=texture(canvas);return cached;
}
