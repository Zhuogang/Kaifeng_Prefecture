// inferred: staggered plates about four times longer than wide break the
// furrows across growth. All coordinates remain in the branch's own metres.
export const BARK_GLSL = `
float barkPlate(vec2 q){
  vec2 g=q*vec2(3.2,.4);
  g.x+=1.1*noise(q*vec2(.7,.22))+1.0*noise(q*vec2(2.8,1.1)+8.);
  float n=noise(g)*.65+noise(g*2.3+11.)*.35;
  return 1.-abs(2.*n-1.);
}
float barkCross(vec2 q){
  float channel=floor(q.x*3.8+noise(q*vec2(1.8,.5))*.70);
  float phase=q.y/.75+hash21(vec2(channel,5.))*.8+(noise(q*vec2(2.8,1.3)+7.)-.5)*.6;
  float edge=min(fract(phase),1.-fract(phase))*.75,aa=max(.004,fwidth(edge)*1.4);
  float fade=1.-smoothstep(.45,1.1,fwidth(phase));
  float broken=smoothstep(.28,.72,noise(q*vec2(5.4,1.9)+11.));
  return (1.-smoothstep(.008,.024+aa,edge))*broken*fade;
}
vec2 barkChips(vec2 q){
  vec2 p=q/vec2(.23,.82)+vec2(noise(q*vec2(.9,.6)),noise(q*vec2(1.2,.7)+9.))*vec2(1.3,.7);
  vec2 cell=floor(p),f=fract(p);float first=9.,second=9.,load=.5;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 b=vec2(float(x),float(y)),id=cell+b,r=b+vec2(hash21(id+2.),hash21(id+17.))*.80+.10-f;
    float d=dot(r,r);if(d<first){second=first;first=d;load=hash21(id+7.);}else second=min(second,d);
  }
  float edge=(sqrt(second)-sqrt(first))*.115,aa=max(fwidth(edge)*1.4,.003);
  float fade=1.-smoothstep(.5,1.25,max(fwidth(p.x),fwidth(p.y)));
  float cluster=smoothstep(.35,.70,noise(q*vec2(1.4,.7)+4.));
  float seam=(1.-smoothstep(.006,.020+aa,edge))*fade*cluster;
  return vec2(mix(.5,load,fade),seam);
}`;
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y){return fract(Math.sin(x*127.1+y*311.7)*43758.5453);}
function noise(x,y){
 const i=Math.floor(x),j=Math.floor(y);let u=fract(x),v=fract(y);
 u=u*u*(3-2*u);v=v*v*(3-2*v);
 return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v);
}
export function barkRelief(x,y){
 const u=x/.24+noise(x*.9,y*.6)*1.3,v=y/.90+noise(x*1.2+9,y*.7+9)*.7,ix=Math.floor(u),iy=Math.floor(v);let first=9,second=9;
 for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
  const a=i+hash(ix+i+2,iy+j+2)*.8+.1-fract(u),b=j+hash(ix+i+17,iy+j+17)*.8+.1-fract(v),d=a*a+b*b;
  if(d<first){second=first;first=d;}else second=Math.min(second,d);
 }
 const edge=(Math.sqrt(second)-Math.sqrt(first))*.12,t=Math.max(0,Math.min(1,(edge-.006)/.069));
 return t*t*(3-2*t);
}
