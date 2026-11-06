import {ROOF_DETAIL_GLSL,TIMBER_DETAIL_GLSL} from './tower-detail.js';
import {SUN,dirFromAzEl} from '../world/plan.js';

// Reuse W3's tile relief/filtering and bracket/member recipe. Only c1's
// pigments and the hand-laid row variation differ; Zhouqiao's strings stay intact.
export const XUANDE_ROOF_GLSL=ROOF_DETAIL_GLSL
  .replaceAll('vec3(.25,.28,.35)','vec3(.43,.415,.445)')
  .replaceAll('vec3(.53,.56,.59)','vec3(.66,.615,.60)')
  .replace('phase=q.x*6.2831853','phase=(q.x+(noise(q*vec2(.21,.48))-.5)*.07)*6.2831853')
  .replace('sin(phase)*.65','sin(phase)*.24')
  .replace('mix(.64,1.07,crest)','mix(.84,1.03,crest)')
  .replace('.92+.16*hash21','.85+.30*hash21')
  .replace('.94+.12*noise','.88+.24*noise');
export const XUANDE_TIMBER_GLSL=TIMBER_DETAIL_GLSL
  .replace('78.,60.,60.','112.,84.,76.')
  .replace('108.,78.,72.','119.,90.,84.')
  .replace('120.,90.,84.','149.,118.,110.')
  .replace('(1.-light)*.28','(1.-light)*.42')
  .replace('c*=1.-max(-n.y,0.)*.42;','c*=1.-max(-n.y,0.)*.28;');

// inferred: c1 pigments, flake loads and wear amounts. The original dapple
// direction is retained independently of the new physical sun so its composed
// pattern stays in place. All light/mark sampling is the shared W1-W3b path.
export const XUANDE_MARK_GLSL=/* glsl */`
float xuandePool(vec3 p){
  vec3 dappleSun=vec3(${dirFromAzEl(SUN.azimuth,SUN.elevation).join(',')});
  vec2 canopy=p.xz+(12.-p.y)*dappleSun.xz/dappleSun.y;
  canopy+=vec2(sin(paintTime*.55+p.z*.3),cos(paintTime*.43+p.x*.4))*.08;
  float field=noise(canopy*vec2(.30,.2333))*.55+noise(canopy*vec2(1.18,.9333))*.32+noise(canopy*vec2(3.,2.1667))*.13;
  float penumbra=max(.045,fwidth(field)*1.8);
  return smoothstep(.55-penumbra*.55,.70+penumbra*.45,field);
}
vec3 xuandeMark(PaintMark m){
  vec3 p=m.p,n=m.n,c;
  float shadow=castShadeAt(p,n,vP),sun=max(dot(n,paintSun),0.)*shadow;
  float light=markLight(sun,m.pick);
  #if defined(XUANDE_STONE)
    if(abs(vKind-27.)<.5){
      float soil=noise(vP.xz*vec2(.15,.18));
      c=mix(linearColor(vec3(.60,.56,.46)),linearColor(vec3(.61,.63,.49)),soil);
      return c*(.93+.10*noise(vP.xz*.55));
    }
    if(abs(vKind-70.)<.5||vP.y<.2){
      float pool=xuandePool(vP)*castShade(vP,normalize(vN));
      float wash=noise(vP.xz*vec2(.52,.39));
      vec3 shade=mix(linearColor(vec3(.47,.47,.55)),linearColor(vec3(.52,.49,.55)),wash);
      vec3 lit=linearColor(vec3(.915,.715,.58));
      c=mix(shade,lit,pool);
      c*=.91+.09*clamp(dot(vC,vec3(.2126,.7152,.0722))/.45,.7,1.3);
      return c*(.88+.24*m.pick);
    }
    c=mix(linearColor(vec3(.48,.43,.44)),linearColor(vec3(.85,.75,.62)),light);
  #elif defined(XUANDE_PLASTER)
    if(vKind<19.5)return linearColor(vec3(.43,.32,.29))*(.90+.20*m.pick);
    // inferred: the existing wings have parallel front faces. Their painted
    // lighting normals turn inward to express c1's shaded left return and
    // sunny right return; positions and the actual cast shadow stay intact.
    float wing=smoothstep(19.,26.,abs(p.x-3.3));
    vec3 wallNormal=normalize(n+vec3(-sign(p.x-3.3)*.85*wing,0.,0.));
    light=markLight(max(dot(wallNormal,paintSun),0.)*shadow,m.pick);
    c=mix(linearColor(vec3(.712,.60,.535)),linearColor(vec3(.91,.69,.52)),light);
    c*=.90+.20*m.pick;
    if(m.pick<.22)c*=vec3(.93,.98,1.04);
    c*=.88+.12*smoothstep(.2,3.2,p.y);
    c*=.92+.08*(1.-smoothstep(15.,26.,abs(p.x-3.3)));
    c*=1.+wing*step(3.3,p.x)*.14;
  #elif defined(XUANDE_TIMBER)
    if(abs(vKind-21.)<.5){
      c=mix(linearColor(vec3(.85,.385,.305)),linearColor(vec3(.94,.415,.315)),light)*(.90+.20*m.pick);
      c=mix(c,linearColor(vec3(.92,.59,.43)),smoothstep(.76,.94,m.pick)*.10);
    }else if(abs(vKind-71.)<.5||abs(vKind-72.)<.5){
      c=mix(linearColor(vec3(.53,.27,.25)),linearColor(vec3(.75,.40,.36)),light);
      // inferred: wear collects on lit top faces and arrises. Atlas loads
      // add quiet grain and rare scuffs, not an all-over camouflage pattern.
      vec2 fw=max(fwidth(vDetail.xy),vec2(.0001)),edge=min(vDetail.xy,1.-vDetail.xy)/fw;
      float arris=1.-smoothstep(.7,2.0,min(edge.x,edge.y));
      float worn=clamp(.10+.85*max(n.y,0.)+.55*arris*light+smoothstep(.38,.68,m.pick)*(.14+.26*light),0.,.95);
      vec3 wear=mix(linearColor(vec3(.64,.46,.41)),linearColor(vec3(.80,.64,.55)),light);
      c=mix(c,wear,worn);
      c*=.90+.20*m.pick;
    }else if(abs(vKind-22.)<.5){
      c=mix(linearColor(vec3(.46,.29,.27)),linearColor(vec3(.70,.39,.30)),light)*(.90+.20*m.pick);
    }else if(abs(vKind-35.)<.5){
      return mix(linearColor(vec3(.48,.29,.09)),linearColor(vec3(.88,.67,.30)),.40+.60*light);
    }else if(abs(vKind-79.)<.5)return linearColor(vec3(.30,.21,.20));
    else c=vC*mix(vec3(.72,.64,.66),vec3(1.85,1.57,1.27),light);
  #elif defined(XUANDE_BARK)
    // W2b's continuous round form and narrow atlas plates, in c1's warmer
    // branch palette. Pigment follows the unchanged growth UVs.
    p=vP;n=normalize(vN);if(!gl_FrontFacing)n=-n;
    vec2 q=m.uv,scale=vec2(10.,1.1)/64.;
    vec4 plate=textureGrad(paintMarks,q*scale,dFdx(vUv)*scale,dFdy(vUv)*scale);
    float cut=1.-smoothstep(.06,.28,plate.a);
    float form=smoothstep(-.20,.95,dot(n,paintSun))*(.78+.22*castShade(vP,n));
    c=mix(linearColor(vec3(.43,.34,.29)),linearColor(vec3(.69,.53,.34)),form)*(.65+.70*plate.r);
    c*=mix(vec3(1.),vec3(.64,.60,.62),cut*.55);
    c=mix(c,linearColor(vec3(.78,.61,.39)),smoothstep(.72,.94,plate.r)*form*.25);
    // The W2/W3 mark load breaks continuous furrows into overlapping
    // growth-aligned strokes without changing the round underlying form.
    c*=(.84+.32*m.pick)*mix(vec3(.985,.995,1.025),vec3(1.025,1.,.975),step(.5,m.pick));
  #endif
  return c;
}
vec3 xuandeFineTimber(vec3 n){
  float light=clamp(max(dot(n,paintSun),0.)*structureShade(vP,n)*1.55,0.,1.);
  vec3 c=mix(vC*vec3(.70,.64,.62),vC*vec3(1.90,1.62,1.30),light);
  if(vKind>39.5&&vKind<45.5){
    c=mix(vC*vec3(.73,.65,.60),vC*vec3(1.85,1.57,1.27),light);
    c*=1.-max(-n.y,0.)*.42;c*=1.-pow(abs(n.x),3.)*.22;
    if(abs(vKind-41.)<.5)c*=.72;
    if(abs(vKind-44.)<.5)c*=.47;
    if(abs(vKind-45.)<.5)c*=.58;
  }
  c=towerTimber(c,n,light);
  if(abs(vKind-24.)<.5||abs(vKind-58.)<.5||abs(vKind-59.)<.5)
    c=mix(linearColor(vec3(.50,.355,.32)),linearColor(vec3(.55,.36,.28)),light*.65);
  return c*(.82+.18*clamp(vData.x,0.,1.));
}
`;

export function xuandeDetailGLSL(kind){
  // Fine members retain per-fragment light, exactly as in W2b/W3.
  return `#define XUANDE_${kind.toUpperCase()}\n`+
    (kind==='timber'?XUANDE_TIMBER_GLSL:'')+
    (kind==='roof'?XUANDE_ROOF_GLSL:'')+
    XUANDE_MARK_GLSL.replace('vec3 xuandeFineTimber(vec3 n){',kind==='timber'?'vec3 xuandeFineTimber(vec3 n){':'#if 0\nvec3 xuandeFineTimber(vec3 n){')+
    (kind==='timber'?'':'\n#endif\n');
}
