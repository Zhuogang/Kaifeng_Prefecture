// inferred: one growth-space braided field drives pigment relief and the
// low-frequency radial silhouette. Frequencies preserve the brief's 8:1 ratio.
export const BARK_GLSL = `
float barkPlate(vec2 q){
  vec2 g=q*vec2(3.2,.4);
  g.x+=1.1*noise(q*vec2(.7,.22))+1.0*noise(q*vec2(2.8,1.1)+8.);
  float n=noise(g)*.65+noise(g*2.3+11.)*.35;
  return 1.-abs(2.*n-1.);
}`;
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y){return fract(Math.sin(x*127.1+y*311.7)*43758.5453);}
function noise(x,y){
 const i=Math.floor(x),j=Math.floor(y);let u=fract(x),v=fract(y);
 u=u*u*(3-2*u);v=v*v*(3-2*v);
 return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v);
}
export function barkRelief(x,y){
 const u=x*3.2+1.1*noise(x*.7,y*.22)+1.0*noise(x*2.8+8,y*1.1+8),v=y*.4;
 const n=noise(u,v)*.65+noise(u*2.3+11,v*2.3+11)*.35;
 const ridge=1-Math.abs(2*n-1),t=Math.max(0,Math.min(1,((1-ridge)-.2)/.5));
 return t*t*(3-2*t);
}
