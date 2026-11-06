import {XUANDE_ROOF_GLSL} from './xuande-strokes.js';
import {TIMBER_DETAIL_GLSL} from './tower-detail.js';
import {PAINTED_STONE_GLSL} from './stonework.js';
import {BRIDGE} from './composition.js';

// inferred: palette endpoints, shade thresholds, mark loads and lighting weights
// below interpret X2's regional c2 targets through the accepted paint recipes.
// inferred: X2 uses the accepted crest/gap/fleck/2D-sweep structure in c2's
// cooler pigments. W3's attached coordinates and derivative fade remain.
export const ZHOU_ROOF_GLSL=XUANDE_ROOF_GLSL
 .replace('towerRoof','zhouRoof')
 .replace('126.,131.,145.','104.,118.,143.')
 .replace('168.,151.,138.','170.,157.,150.')
 .replace('193.,180.,167.','204.,194.,184.')
 .replace('151.,141.,139.','157.,149.,151.')
 .replace('103.,101.,111.','113.,112.,125.')
 .replace('137.,128.,125.','181.,165.,145.')
 .replace('float joint=lineCut(vP.y/.21,.055);','float joint=lineCut(vP.y/.21,.045);\n    c=mix(c,linearColor(vec3(201.,185.,160.)/255.),max(n.y,0.)*.65);')
 .replace('fleck*.42','fleck*.65')
 .replace('smoothstep(.50,.78','smoothstep(.45,.70')
 .replace('return c;\n}', 'if(abs(vKind-57.)<.5)c=mix(c,linearColor(vec3(191.,162.,127.)/255.),max(dot(n,paintSun),0.)*.16);\n  return c;\n}');

export const ZHOU_TIMBER_GLSL=TIMBER_DETAIL_GLSL
 .replace('towerTimber','zhouTimber')
 .replace('78.,60.,60.','106.,94.,101.')
 .replace('108.,78.,72.','115.,100.,104.')
 .replace('120.,90.,84.','122.,100.,100.')
 .replace('vec3(1.10,1.10,1.18)','vec3(1.02,1.,1.)')
 .replace('(1.-light)*.28','(1.-light)*.18')
 .replace('vec3(.48,.32,.20)','vec3(1.15,.60,.30)')
 .replace('c*=1.-max(-n.y,0.)*.42;','c*=1.-max(-n.y,0.)*.20;');

export const ZHOU_FINE_TIMBER_GLSL=/* glsl */`
vec3 zhouFineTimber(vec3 n){
 vec3 face=n;
 // inferred: the existing square lower posts retain their silhouette, with
 // a rounded painted normal across each face, as on the source hall columns.
 if(abs(vKind-104.)<.5&&abs(n.y)<.5){
  vec2 dx=dFdx(vDetail.xy),dy=dFdy(vDetail.xy);float det=dx.x*dy.y-dx.y*dy.x;
  if(abs(det)>1.e-9){vec3 across=normalize((dFdx(vP)*dy.y-dFdy(vP)*dx.y)/det);float s=(vDetail.x*2.-1.)*.88;n=normalize(n*sqrt(max(.05,1.-s*s))+across*s);}
 }
 float light=clamp(max(dot(n,paintSun),0.)*structureShade(vP,face)*1.55,0.,1.);
 vec3 c=mix(vC*vec3(.70,.64,.62),vC*vec3(1.90,1.62,1.30),light);
 bool column=abs(vKind-33.)<.5||abs(vKind-47.)<.5||abs(vKind-104.)<.5;
 if(column){
  light=pow(clamp(max(dot(n,paintSun),0.)/length(paintSun.xz),0.,1.),3.)*structureShade(vP,face);
  c=mix(linearColor(vec3(149.,96.,100.)/255.),linearColor(vec3(246.,139.,90.)/255.),light);
  c=mix(c,linearColor(vec3(247.,181.,134.)/255.),smoothstep(.85,1.,light)*.65);
 }
 if(vKind>39.5&&vKind<45.5){
  c=mix(linearColor(vec3(139.,97.,85.)/255.),linearColor(vec3(245.,146.,100.)/255.),light);
  c*=1.-max(-n.y,0.)*.35;c*=1.-pow(abs(n.x),3.)*.20;
  c*=mix(1.,.40,smoothstep(.20,.85,vDetail.w+bracketShadeOffset()));
  if(abs(vKind-41.)<.5)c*=.93;
  if(abs(vKind-44.)<.5)c*=.90;
  if(abs(vKind-45.)<.5)c*=.92;
 }
 if(abs(vKind-46.)<.5||abs(vKind-58.)<.5)c=mix(vC*vec3(.42,.38,.35),vC*vec3(1.45,1.26,1.12),light);
 c=zhouTimber(c,n,light);
 if(vKind>39.5&&vKind<45.5){
  c=mix(c,linearColor(vec3(106.,94.,101.)/255.),smoothstep(.58,.95,vDetail.w+bracketShadeOffset())*.88);
  float cut=max(dot(n,paintSun),0.)*(1.-max(n.y,0.))*(1.-smoothstep(.25,.70,vDetail.w+bracketShadeOffset()));
 c=mix(c,linearColor(vec3(222.,126.,80.)/255.),cut*.85);c*=bracketPigment();}
 return c;
}
`;

export const ZHOU_WALL_GLSL=/* glsl */`
vec3 zhouWall(vec3 n){
 if(abs(vKind-103.)<.5){
  vec3 c=mix(linearColor(vec3(184.,147.,133.)/255.),linearColor(vec3(166.,148.,130.)/255.),smoothstep(.40,.70,vDetail.w));
  return c*(.75+.25*structureShade(vP,n))*(1.-smoothstep(.35,.95,vDetail.w)*.50);
 }
 if(dot(vC,vec3(.2126,.7152,.0722))<.24)return linearColor(vec3(84.,64.,58.)/255.)*(.90+.10*max(n.y,0.));
 float light=clamp((max(dot(n,paintSun),0.)+.22)*1.55,0.,1.)*structureShade(vP,n);
 vec3 c=mix(linearColor(vec3(.535,.445,.405)),linearColor(vec3(1.11,.925,.66)),light);
 c*=.83+.17*smoothstep(3.8,5.4,vP.y);
 return paintedStone(c,planeUV(vP,n),vec2(1.25,.48),vec4(.32,.08,0.,0.),vec2(.006,.012));
}
`;

export const ZHOU_BARK_GLSL=/* glsl */`
float wrapNoise(vec2 p,float period){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 float x0=mod(i.x,period),x1=mod(i.x+1.,period);
 return mix(mix(hash21(vec2(x0,i.y)),hash21(vec2(x1,i.y)),f.x),
  mix(hash21(vec2(x0,i.y+1.)),hash21(vec2(x1,i.y+1.)),f.x),f.y);
}
// inferred: plates about four times longer than wide, with a slow spiral, as in
// c2. Ridged noise leaves crests with thin valleys between them. The field wraps
// around the limb, so a tube's seam never draws a straight fissure.
float barkField(vec2 uv,float around){
 float plates=max(4.,floor(around*3.4+.5)),x=uv.x/around;
 float wander=wrapNoise(vec2(x*6.,uv.y*.45),6.)-.5;
 float a=wrapNoise(vec2(x*plates+wander*5.+uv.y*.5,uv.y*.75),plates);
 float b=wrapNoise(vec2(x*plates*2.+wander*8.+uv.y*.8,uv.y*1.7+9.),plates*2.);
 return (1.-abs(2.*a-1.))*.70+(1.-abs(2.*b-1.))*.30;
}
vec3 zhouBark(PaintMark m){
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
 float around=6.2832*(vDetail.w-3.)*4.;
 // Light is decided once per brush mark, so the trunk is built from flat strokes.
 float field=barkField(m.uv,around);
 // Each plate is lit on the side that faces the sun, and dark on the other.
 vec2 dx=dFdx(vUv),dy=dFdy(vUv);float det=dx.x*dy.y-dx.y*dy.x;
 vec3 across=abs(det)>1.e-9?normalize((dFdx(vP)*dy.y-dFdy(vP)*dx.y)/det):vec3(0.);
 float slope=(barkField(m.uv+vec2(.04,0.),around)-field)/.04;
 vec3 relief=normalize(n-across*clamp(slope*.38,-1.2,1.2));
 float sun=max(dot(relief,paintSun),0.)*(.72+.28*castShade(vP,n));
 float lit=sun*(.08+.92*smoothstep(.34,.74,field))*.92+(m.pick-.5)*.28;
 vec3 c=linearColor(vec3(82.,65.,54.)/255.);
 c=mix(c,linearColor(vec3(106.,82.,65.)/255.),smoothstep(.06,.12,lit));
 c=mix(c,linearColor(vec3(128.,98.,74.)/255.),smoothstep(.25,.31,lit));
 c=mix(c,linearColor(vec3(164.,124.,90.)/255.),smoothstep(.50,.56,lit));
 c=mix(c,linearColor(vec3(198.,150.,106.)/255.),smoothstep(.74,.80,lit));
 // A few cool strokes in the shade, as in c2's violet-grey shadow side.
 c=mix(c,linearColor(vec3(104.,94.,100.)/255.),step(.92,m.pick)*(1.-smoothstep(.20,.42,lit))*.7);
 // The valleys stay dark and thin, resolved in pixels so they never alias.
 float f=barkField(vUv,around),fw=fwidth(f);
 float fissure=(1.-smoothstep(.09,.20+fw,f))*(1.-smoothstep(.22,.42,fw));
 return mix(c,linearColor(vec3(46.,38.,32.)/255.),fissure*.90);
}
`;

export const ZHOU_STONE_GLSL=PAINTED_STONE_GLSL+/* glsl */`
vec3 zhouStone(PaintMark m){
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
 if(abs(vKind-73.)<.5||abs(vKind-75.)<.5){
  // inferred: flatten only the chipped top's lighting normal. The fan's
  // triangle normals must not draw pale Xs on an otherwise dressed face.
  if(abs(n.y)>.65)n=vec3(0.,sign(n.y),0.);
  // inferred: fixed physical atlas sampling keeps the fan's derivative
  // changes from drawing Xs through the adaptive mark-LOD mixture.
  bool post=abs(vKind-75.)<.5;
  vec2 q=planeUV(vP,n)*vec2(14.,9.);
  // A wider filter softens the atlas's polygon edges on the near blocks.
  float atlas=textureGrad(paintMarks,q/64.,dFdx(q)/64.*2.5,dFdy(q)/64.*2.5).r;
  // Mostly small marks with a little slow drift, never soft clouds.
  float load=atlas*.50+noise(q*.16+1.)*.20+noise(q*.9+5.)*.30;
  float sun=max(dot(n,paintSun),0.);
  // The grove's own leaf gaps give the sun patches on the composed near quay.
  if(paintView<2.5||paintView>5.5)sun*=groveShade(vP-(vP.y-1.2)*paintSun/paintSun.y,load);
  else sun*=structureShade(vP+vec3(0.,.04,0.),n);
  if(post)sun*=.15+.85*max(n.y,0.);
  else if(n.y>.65&&(paintView<2.5||paintView>5.5)){
   // Small leaf gaps let sun through onto the kerb's shaded top, as in c2.
   vec2 gap=mat2(.90,-.35,.35,.90)*vP.xz;
   float g=noise(gap*vec2(1.5,3.1)+4.)*.68+noise(gap*vec2(3.9,7.7)+8.)*.32+(load-.5)*.05;
   sun=max(sun,max(dot(n,paintSun),0.)*smoothstep(.635,.665,g));
  }
  vec3 shade=post?mix(linearColor(vec3(100.,88.,82.)/255.),linearColor(vec3(150.,130.,116.)/255.),load)
                 :mix(linearColor(vec3(90.,84.,90.)/255.),linearColor(vec3(168.,155.,163.)/255.),load);
  vec3 c=mix(shade,linearColor(vec3(238.,195.,156.)/255.),clamp(sun*1.45,0.,1.));
  c=paintedStone(c,planeUV(vP,n),vec2(1.4,.65),vec4(0.,.04,.18,0.),vec2(.006,.012));
  // Each block keeps its own value, and dark joints separate the run.
  if(!post){
   c*=1.+(dot(vC,vec3(.2126,.7152,.0722))/.52-1.)*5.;
   float edge=.575-abs(abs(n.y)>.65?vUv.y:vUv.x),aa=fwidth(edge);
   c=mix(c,c*vec3(.45,.42,.44),(1.-smoothstep(.012,.035+aa,edge))*(1.-smoothstep(.03,.08,aa)));
  }
  return c*(.97+.06*load);
 }
 float sun=max(dot(n,paintSun),0.)*castShade(vP,n);
 vec3 c=mix(linearColor(vec3(135.,119.,108.)/255.),linearColor(vec3(235.,191.,137.)/255.),sun);
 float y=vP.y-(${BRIDGE.fall})*vP.x;
 // inferred: the accepted under-bridge height shade gathers under the deck;
 // a lower sun-facing strip stays warm, rather than filling every shaft.
 c=mix(linearColor(vec3(135.,119.,108.)/255.),c,1.-smoothstep(.65,2.75,y)*.80);
 vec2 q=vec2(abs(n.x)>.65?vP.z:vP.x,y);
 c=paintedStone(c,q,vec2(1.2,.64),vec4(.38,.12,.12,.06),vec2(.008,.016));
 c=mix(c,linearColor(vec3(.22,.25,.23)),(1.-smoothstep(.04,.48,vP.y))*.70);
 return c;
}
`;
