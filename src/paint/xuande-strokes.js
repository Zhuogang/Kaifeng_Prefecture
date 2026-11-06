import {TIMBER_DETAIL_GLSL} from './tower-detail.js';
import {SUN,dirFromAzEl} from '../world/plan.js';

// Reuse W3's tile relief/filtering and bracket/member recipe. Only c1's
// pigments and the hand-laid row variation differ; Zhouqiao's strings stay intact.
// inferred: 2.5 source tile pitches give about 13 px on the main slope.
// The W3 derivative fade and attached face coordinates also cover the hips.
export const XUANDE_ROOF_GLSL=/* glsl */`
vec3 towerRoof(vec3 n){
  float light=clamp(max(dot(n,paintSun),0.)*castShade(vP,n)*1.45,0.,1.);
  if(abs(vKind-50.)<.5){
    vec2 q=vDetail.xy;
    float pixels=1./max(length(vec2(dFdx(q.x),dFdy(q.x))),.00001);
    float rows=smoothstep(2.2,4.,pixels);
    float wander=(noise(vec2(q.x*.17,vDetail.w*.65))-.5)*.20;
    float phase=q.x+wander;
    float crest=pow(.5+.5*cos(phase*6.2831853-.50),.50);
    vec3 c=mix(linearColor(vec3(126.,131.,145.)/255.),linearColor(vec3(168.,151.,138.)/255.),crest);
    float aa=max(.001,fwidth(phase)*.5);
    float gap=1.-smoothstep(.018-aa,.018+aa,abs(fract(phase)-.5));
    c=mix(c,linearColor(vec3(85.,85.,95.)/255.),gap*.88);
    float fleck=lineCut(phase-.04,.15)*smoothstep(.50,.78,noise(vec2(floor(phase+.5)*3.7,vDetail.w*1.3)));
    c=mix(c,linearColor(vec3(193.,180.,167.)/255.),fleck*.42);
    // inferred: slow sweeps across the slope, in 2D so they can't read as stripes.
    float sweep=noise(vec2(q.x*.055,vDetail.w*.42)+7.);
    c*=.91+.18*sweep;c=mix(c,c*vec3(.94,.98,1.08),smoothstep(.55,.25,sweep)*.8);
    c*=.97+.06*hash21(vec2(floor(phase+.5),19.));
    c*=.88+.12*light;
    return mix(linearColor(vec3(151.,141.,139.)/255.)*(.88+.12*light),c,rows);
  }
  vec3 c=mix(linearColor(vec3(103.,101.,111.)/255.),linearColor(vec3(137.,128.,125.)/255.),light);
  if(abs(vKind-57.)<.5){
    // inferred: three thin dark joints across the existing stacked ridge.
    float joint=lineCut(vP.y/.21,.055);
    c=mix(c,linearColor(vec3(73.,72.,82.)/255.),joint*.70);
  }
  return c;
}
`;
export const XUANDE_TIMBER_GLSL=TIMBER_DETAIL_GLSL
  .replace('78.,60.,60.','112.,84.,76.')
  .replace('108.,78.,72.','119.,90.,84.')
  .replace('120.,90.,84.','103.,64.,52.')
  .replace('(1.-light)*.28','(1.-light)*.18')
  .replace('vec3(1.10,1.10,1.18)','vec3(1.03,1.,.98)')
  .replace('c*=1.-max(-n.y,0.)*.42;','c*=1.-max(-n.y,0.)*.16;')
  .replace('vec3(.48,.32,.20)','vec3(1.8,1.0,.65)');

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
    if(abs(vKind-82.)<.5){
      // inferred: regional drifts select pigments; each drift contains many
      // smaller atlas flakes, rather than assigning a new hue to every flake.
      if(abs(n.x)>.70&&p.y<6.05)return linearColor(vec3(84.,57.,51.)/255.);
      float lower=1.-smoothstep(5.2,9.5,p.y);
      vec3 base=linearColor(mix(vec3(.870,.642,.495),vec3(.887,.675,.492),lower));
      // Each stain takes whole flakes (pick shifts the threshold), so an edge dissolves.
      float flake=(m.pick-.5)*.42;
      float mossField=noise(p.xy*vec2(.27,.62)+vec2(8.,1.))*.65+noise(p.xy*vec2(.09,.21)+3.)*.35;
      float moss=smoothstep(.555,.585,mossField+flake)*smoothstep(6.4,8.6,p.y+flake*5.);
      float lavField=noise(p.xy*vec2(.33,.71)+vec2(31.,7.))*.6+noise(p.xy*vec2(.11,.19)+11.)*.4;
      float lavender=smoothstep(.60,.63,lavField+flake)*smoothstep(4.5,8.,p.y+flake*5.);
      base=mix(base,linearColor(vec3(186.,166.,124.)/255.),moss*.62);
      base=mix(base,linearColor(vec3(186.,168.,160.)/255.),lavender*.52);
      float cream=lower*smoothstep(.55,.78,noise(p.xy*vec2(.12,.38)+19.))*smoothstep(.60,.90,m.pick);
      base=mix(base,linearColor(vec3(229.,191.,153.)/255.),cream*.50);
      float wallLight=clamp(max(dot(n,paintSun),0.)*2.2*shadow,0.,1.);
      c=mix(linearColor(vec3(.64,.55,.52)),base,wallLight)*(.90+.20*m.pick);
      float rim=(1.-smoothstep(.025,.11,m.load))*step(m.pick,.34);
      c*=1.-rim*.075;
      float leaf=(1.-smoothstep(-14.,-3.,p.x))*smoothstep(6.8,10.,p.y)*(1.-xuandePool(p));
      return c*mix(vec3(1.),vec3(.70,.72,.83),leaf*.65);
    }
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
      // Like the fine members, a narrow plank takes the real shadow at its
      // surface, avoiding offset mark samples falling behind adjacent planks.
      float doorLight=clamp(max(dot(normalize(vN),paintSun),0.)*castShade(vP,normalize(vN))*1.45,0.,1.);
      c=mix(linearColor(vec3(.85,.385,.305)),linearColor(vec3(.94,.415,.315)),doorLight)*(.98+.04*m.pick);
    }else if(abs(vKind-71.)<.5||abs(vKind-72.)<.5){
      c=mix(linearColor(vec3(136.,69.,63.)/255.),linearColor(vec3(188.,96.,91.)/255.),pow(light,2.2));
      c=mix(c,linearColor(vec3(215.,111.,90.)/255.),max(n.y,0.)*shadow);
      // inferred: pigment varies by six percent in linear load; only a
      // subpixel sunlit arris can expose pale wear. Faces have no patches.
      vec2 fw=max(fwidth(vDetail.xy),vec2(.0001)),edge=min(vDetail.xy,1.-vDetail.xy)/fw;
      float arris=1.-smoothstep(.25,.85,min(edge.x,edge.y));
      c=mix(c,linearColor(vec3(220.,161.,126.)/255.),arris*light*.22);
      c*=.97+.06*m.pick;
    }else if(abs(vKind-22.)<.5){
      c=mix(linearColor(vec3(149.,80.,68.)/255.),linearColor(vec3(207.,121.,94.)/255.),light)*(.97+.06*m.pick);
    }else if(abs(vKind-80.)<.5){
      return linearColor(vec3(118.,66.,55.)/255.)*(.94+.06*light);
    }else if(abs(vKind-35.)<.5){
      return mix(linearColor(vec3(.48,.29,.09)),linearColor(vec3(.88,.67,.30)),.40+.60*light);
    }else if(abs(vKind-79.)<.5)return linearColor(vec3(.30,.21,.20));
    else c=vC*mix(vec3(.72,.64,.66),vec3(1.85,1.57,1.27),light);
  #elif defined(XUANDE_BARK)
    if(vDetail.w>2.5){
      // inferred: broad slate planes and limited broken gold use the same
      // atlas, with near-square growth coordinates instead of long furrows.
      n=normalize(vN);if(!gl_FrontFacing)n=-n;
      float form=smoothstep(-.45,.75,dot(n,paintSun));
      c=mix(linearColor(vec3(94.,79.,90.)/255.),linearColor(vec3(124.,104.,101.)/255.),form)*(.88+.24*m.pick);
      float gold=smoothstep(.60,.76,m.pick)*smoothstep(.0,.40,dot(n,paintSun));
      c=mix(c,linearColor(vec3(181.,124.,71.)/255.),gold*.93);
      float knot=1.-smoothstep(.025,.07,m.pick);
      if(abs(vKind-90.)<.5)return mix(c,linearColor(vec3(138.,104.,84.)/255.),.75);
      return mix(c,linearColor(vec3(62.,50.,50.)/255.),knot*.60);
    }
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
  if(abs(vKind-92.)<.5)return linearColor(vec3(86.,57.,49.)/255.);
  vec3 c=mix(linearColor(vec3(120.,65.,50.)/255.),linearColor(vec3(238.,131.,86.)/255.),light);
  if(abs(vKind-33.)<.5||abs(vKind-47.)<.5)
    c=mix(linearColor(vec3(146.,88.,76.)/255.),linearColor(vec3(226.,122.,86.)/255.),light);
  if(vKind>39.5&&vKind<45.5){
    c=mix(linearColor(vec3(154.,99.,82.)/255.),linearColor(vec3(242.,140.,94.)/255.),light);
    c*=1.-max(-n.y,0.)*.50;c*=1.-pow(abs(n.x),3.)*.34;
    // inferred: the eave's shade gathers at the top of each set, as in c1.
    c*=mix(1.,.60,smoothstep(.30,.95,vDetail.w+bracketShadeOffset()));
    if(abs(vKind-41.)<.5)c*=.95;
    if(abs(vKind-44.)<.5)c*=.90;
    if(abs(vKind-45.)<.5)c*=.92;
  }
  c=towerTimber(c,n,light);
  if(vKind>39.5&&vKind<45.5)c*=bracketPigment();
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
