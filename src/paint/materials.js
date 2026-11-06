import * as THREE from 'three';
import { TOWERS, BRIDGE, MOORING, BOAT, CAMERA } from './composition.js';
import { SUN, dirFromAzEl } from '../world/plan.js';
import { BARK_GLSL } from './bark.js';
import { PAINTED_STONE_GLSL } from './stonework.js';
import {ZHOU_SUN,SUNLIGHT_GLSL} from './sunlight.js';
import {strokeMaterial} from './strokes.js';

// inferred: pigment ramps, stroke fields, ragged coverage and painted occlusion
// are art direction. Zhouqiao uses W1 sunlight; Xuande keeps the art-bible sun.

export const BRUSH = /* glsl */`
float hash21(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.0),f.x),f.y);
}
float dab(vec2 p) {
  vec2 i=floor(p), f=fract(p)-.5;
  float h=hash21(i);
  f.x+=.13*sin(f.y*5.0+h*9.0);
  float edge=abs(f.x)*1.7+abs(f.y)*.8;
  return smoothstep(.64,.30,edge+noise(p*8.0)*.16)*(h-.5);
}
vec3 linearColor(vec3 c) { return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c)); }
${BARK_GLSL}
${PAINTED_STONE_GLSL}
float pigmentDab(vec2 p){
  vec2 i=floor(p),f=fract(p)-.5;float h=hash21(i);
  f+=vec2(hash21(i+13.),hash21(i+29.))*.20-.10;
  float angle=(h-.5)*.6;f=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*f;
  f.x+=.10*sin(f.y*4.+h*9.);
  float edge=max(abs(f.x)*1.8,abs(f.y)*.9);
  return smoothstep(.54,.34,edge+noise(p*2.7)*.14)*(h-.5);
}
// inferred: independent warm/cool and olive/rose pigment loads follow the
// undeformed material surface. Derivative filtering removes subpixel strokes.
vec3 brokenColor(vec3 c,vec2 q,vec2 scale,float amount,vec3 warm,vec3 cool,vec3 pigmentA,vec3 pigmentB){
  vec2 r=q*scale;
  r+=vec2(noise(r*.31+4.),noise(r*.27+9.))*2.1;
  float s1=pigmentDab(r),s2=pigmentDab(r*2.7+17.);
  float footprint=max(length(dFdx(r*2.7)),length(dFdy(r*2.7)));
  float fade=1.-smoothstep(.6,1.6,footprint);
  vec3 temperature=s1>0.?warm:cool;
  vec3 pigment=s2>0.?pigmentA:pigmentB;
  return c*mix(vec3(1.),temperature,min(.90,abs(s1)*2.*amount)*fade)
          *mix(vec3(1.),pigment,min(.90,abs(s2)*2.*amount)*fade);
}
vec3 brokenColor(vec3 c,vec2 q,vec2 scale,float amount,vec3 warm,vec3 cool){
  return brokenColor(c,q,scale,amount,warm,cool,vec3(.91,1.06,.84),vec3(1.20,.94,1.12));
}
// inferred: paving keeps its per-stone vertex pigment. Sunlit variation stays
// among ochre/rose/warm grey; only the existing cast shade receives violet.
vec3 stonePigment(vec3 c,vec2 q,float sunlight){
  float wash=noise(q*vec2(.65,.85));
  vec3 warm=mix(vec3(1.06,1.01,.95),vec3(.99,.98,.97),wash);
  vec3 shade=mix(vec3(.98,.97,1.04),vec3(1.03,.99,.96),wash);
  return c*mix(shade,warm,sunlight)*(1.+pigmentDab(q*vec2(1.2,1.6))*.16);
}
`;

// inferred: soft moving leaf shade, projected along the source sun direction.
export function dappleGLSL({height=8,wind=.12,scale=[1.05,.8]}={}){
  return `            vec2 canopy=vP.xz+(${height.toFixed(6)}-vP.y)*paintSun.xz/paintSun.y;
            canopy+=vec2(sin(paintTime*.55+vP.z*.3),cos(paintTime*.43+vP.x*.4))*${wind.toFixed(6)};
            float dapple=smoothstep(.42,.64,noise(canopy*vec2(${scale[0].toFixed(6)},${scale[1].toFixed(6)}))*.76+noise(canopy*3.1)*.24);
            c=mix(c*vec3(.58,.57,.69)+linearColor(vec3(.13,.10,.19))*.04,c*vec3(1.52,1.22,1.03),dapple);`;
}

export function paintMaterial(time,kind='stone',{dapple={},profile='zhouqiao',reflection=false,bank=false}={}) {
  // W2 replaces Zhouqiao's soft procedural washes with one mark-lit path.
  // Xuande retains the complete approved material implementation below.
  if(profile==='zhouqiao'&&kind!=='leaf')return strokeMaterial(time,kind,{reflection,bank});
  time.windTime??={value:new THREE.Vector4(0,1,0,1)};
  const code = {
    stone: `vec2 q=abs(n.y)>.65?vP.xz:vec2(abs(n.x)>.65?vP.z:vP.x,vP.y);
      bool masonry=(vKind>51.5&&vKind<56.5)||(vKind>59.5&&vKind<65.5)||(vKind>69.5&&vKind<75.5)||abs(vKind-37.)<.5;
      if(masonry){wash=noise(q*vec2(.48,.65))-.5;}
      else{variation=dab(q*vec2(2.1,5.0)+vec2(q.y*.8,0.0))*.55+dab(q*vec2(8.0,14.0))*.20;wash=noise(q*1.9)-.5;}`,
    plaster: `vec2 q=vec2(vP.x+vP.z,vP.y); variation=dab(q*vec2(3.4,2.4)+q.yx*.3)*.80; wash=noise(q*.8)-.5;`,
    timber: `vec2 q=abs(n.y)>.6?vP.xz:vec2(vP.x+vP.z,vP.y); variation=dab(q*vec2(1.3,22.0))*.8+dab(q*vec2(6.0,42.0))*.3; wash=noise(q*1.2)-.5;`,
    roof: `vec2 q=vP.xz;variation=dab(q*vec2(4.,2.3))*.16;wash=noise(q*.6)-.5;
      if((vKind>12.5&&vKind<13.5)||(vKind>29.5&&vKind<30.5)){
        // Existing roof generator: 0.26 m tile centres and 0.35 m laps.
        vec2 tile=vUv/vec2(.26,.35),fw=max(abs(dFdx(tile)),abs(dFdy(tile)));
        float across=pow(max(0.,cos(tile.x*6.2831853)),4.);
        float rows=min(fract(tile.y),1.-fract(tile.y)),aa=max(.025,fw.y);
        float lap=1.-smoothstep(.025-aa,.065+aa,rows);
        float fx=1.-smoothstep(.45,1.3,fw.x),fy=1.-smoothstep(.4,1.25,fw.y);
        variation+=across*.17*fx-lap*.19*fy;
        variation+=(noise(floor(tile))-.5)*.055*min(fx,fy);
      }`,
    bark: `vec2 q=vUv; variation=dab(q*vec2(6.0,1.7))*.48+dab(q*vec2(19.0,6.0))*.22; wash=noise(q*vec2(7.0,.8))-.5;`,
    leaf: `float footprint=max(length(dFdx(vUv)),length(dFdy(vUv)));
      variation=dab(vUv*vec2(7.0,10.0))*.22*(1.-smoothstep(.035,.18,footprint));wash=noise(vP.xz*.5)-.5;`,
  }[kind];
  const mat = new THREE.ShaderMaterial({
    name: 'gouache-' + kind, vertexColors: true, side: THREE.DoubleSide, alphaToCoverage: kind === 'leaf',
    uniforms: { paintTime: time, paintWindTime:time.windTime, paintView:time.viewIndex??{value:0},paintSun: { value: profile==='zhouqiao'?ZHOU_SUN.clone():new THREE.Vector3(...dirFromAzEl(SUN.azimuth, SUN.elevation)) },...(profile==='zhouqiao'?time.sunlight?.uniforms:{}) },
    vertexShader: /* glsl */`
      uniform float paintTime,paintView; uniform vec4 paintWindTime; attribute vec4 paintWind; attribute vec3 paintData; attribute float paintKind;
      varying vec3 vP,vN,vC,vData; varying vec2 vUv; varying float vKind;
      void main(){
        vec3 p=position;
        // Flex is in object space; brush coordinates below use the undeformed surface.
        p.x+=dot(paintWind.xy,paintWindTime.xy);
        p.z+=dot(paintWind.zw,paintWindTime.zw);
        vec4 surface=vec4(position,1.),moved=vec4(p,1.);vec3 localNormal=normal;
        #ifdef USE_INSTANCING
          surface=instanceMatrix*surface;moved=instanceMatrix*moved;
          mat3 basis=mat3(instanceMatrix);
          localNormal/=vec3(dot(basis[0],basis[0]),dot(basis[1],basis[1]),dot(basis[2],basis[2]));
          localNormal=basis*localNormal;
        #endif
        ${profile==='zhouqiao'&&(kind==='bark'||kind==='leaf')?`
          // inferred: move the same seeded willow beyond the north rail by
          // scaling about the approved eye. The approved view keeps its
          // original tree and mirror, avoiding wind/parallax regression.
          if(paintView>.5){
            if(paintData.z>.5){
              vec3 eye=vec3(${CAMERA.pos.join(',')});
              surface.xyz=eye+(surface.xyz-eye)*1.13;moved.xyz=eye+(moved.xyz-eye)*1.13;
            }
            // inferred: the hero's isolated fringe is outside this authored
            // picture; omit it in 橋側 rather than leaving a detached strand.
            if(paintView>3.5&&paintView<4.5&&paintData.z<-.5)moved.xyz=vec3(0.,-1000.,0.);
          }
        `:''}
        vP=(modelMatrix*surface).xyz;
        vN=normalize(mat3(modelMatrix)*localNormal);vC=color;
        #ifdef USE_INSTANCING_COLOR
          vC*=instanceColor;
        #endif
        vData=paintData;vUv=uv;vKind=paintKind;
        gl_Position=projectionMatrix*modelViewMatrix*moved;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 paintSun;
      uniform float paintTime,paintView;
      varying vec3 vP,vN,vC,vData; varying vec2 vUv; varying float vKind;
      ${BRUSH}
      ${profile==='zhouqiao'?SUNLIGHT_GLSL:''}
      void main(){
        vec3 n=normalize(vN); if(!gl_FrontFacing)n=-n;
        ${kind==='leaf'&&profile==='zhouqiao'?'if(abs(vKind-94.)<.5||abs(vKind-97.)<.5)discard;':''}
        ${bank?`
        {
          // inferred: one merged, softly hazed bank family keeps the source
          // roofs and drooping foliage in two calls including its reflection.
          float sun=smoothstep(-.25,.80,dot(n,paintSun)),coverage=1.;
          vec3 c=vC*mix(vec3(.54,.58,.66),vec3(1.14,1.06,.87),sun);
          if(abs(vKind-96.)<.5||abs(vKind-98.)<.5){
            c=vC*mix(vec3(.64,.72,.66),vec3(1.02,1.03,.83),sun)*(.88+.20*noise(vP.xz*.8+vP.y*.6));
            float edge=abs(vUv.x-.5)*2.,aa=max(.08,fwidth(edge));
            if(abs(vKind-96.)<.5)coverage=(1.-smoothstep(.80-aa,1.+aa,edge))*smoothstep(.18,.70,1./max(fwidth(vUv.x),.0001));
          }
          if(abs(vKind-65.)<.5)c=paintedStone(c,vec2(vP.z,vP.y),vec2(2.4,.58),vec4(.30,.10,.40,.035),vec2(.008,.020));
          if(abs(vKind-50.)<.5||abs(vKind-57.)<.5)c=mix(linearColor(vec3(.36,.39,.43)),linearColor(vec3(.55,.57,.57)),sun);
          float haze=.46+smoothstep(35.,160.,length(vP.xz-vec2(0.,-25.)))*.30;
          c=mix(c,linearColor(vec3(.76,.75,.69)),haze);
          gl_FragColor=vec4(c,coverage);return;
        }
        `:''}
        ${kind==='stone'&&profile==='zhouqiao'?`
          if(paintView>5.5&&abs(vKind-95.)<.5){
            float sun=smoothstep(-.45,.85,dot(n,paintSun));
            vec3 c=vC*mix(vec3(.57,.65,.62),vec3(1.13,1.07,.83),sun)*(.86+.22*noise(vP.xz*2.1+vP.y*.7));
            c=mix(c,linearColor(vec3(.76,.75,.69)),smoothstep(35.,140.,-vP.z)*.68);
            gl_FragColor=vec4(c,1.);return;
          }
          if(paintView>4.5&&paintView<5.5&&(abs(vKind-92.)<.5||abs(vKind-61.)<.5&&n.y<-.4)){
            // inferred: cool deck shadow, with broad warm water-bounce washes
            // rising toward the side openings and the sunlit far bank.
            vec2 q=vec2(vP.x,vP.z-(${BRIDGE.skew} )*vP.x);
            float openings=smoothstep(.5,2.8,abs(q.y+25.3)),farLight=smoothstep(-12.,34.,vP.x);
            float ribbon=.5+.5*sin(q.x*.50+q.y*1.45+sin(q.x*.27-q.y*.48)*1.2+paintTime*.24);
            ribbon=ribbon*ribbon*(3.-2.*ribbon);
            vec3 c=linearColor(vec3(.255,.25,.305))*(.94+.12*noise(q*vec2(.27,.42)+2.));
            c+=linearColor(vec3(.65,.49,.30))*(.025+ribbon*(.07+.23*farLight+.16*openings));
            if(abs(vKind-92.)<.5)c*=n.y<-.4?.86:1.13;
            // The per-cell hash/offsets in paintedStone introduced vertical
            // steps on a beam's constant-x face. Keep this wash continuous.
            c*=.985+.03*noise(q*vec2(3.2,5.7));
            gl_FragColor=vec4(c,1.);return;
          }
          if(paintView>4.5&&paintView<5.5&&(abs(vKind-52.)<.5||abs(vKind-37.)<.5)){
            // inferred: side daylight only warms the outward faces. Interior
            // planes stay violet-grey, with a soft damp line and low bounce.
            float cross=vP.z-(${BRIDGE.skew})*vP.x-(${BRIDGE.offset})+19.75;
            vec3 lateral=normalize(vec3(.15,0.,1.));
            float daylight=smoothstep(-.15,.85,dot(n,lateral)*sign(cross));
            // inferred: equal-value warm grey retains the bridge's cream
            // pigment in shade; side openings leave a near vertical edge.
            vec3 c=mix(linearColor(vec3(.385,.35,.365)),linearColor(vec3(.51,.455,.385)),daylight*.72);
            float top=2.95+.18*max(0.,1.-pow(vP.x/30.,2.)),y=vP.y-(${BRIDGE.fall})*vP.x;
            c*=1.-smoothstep(top-.75,top-.05,y)*.22;
            vec2 q=vec2(abs(n.x)>.65?vP.z:vP.x,y)*1.5;
            float broken=smoothstep(.24,.64,noise(q*vec2(3.7,1.9)+9.));
            c=paintedStone(c,q,vec2(1.65,.78),vec4(.32*broken,.10,.28,.012),vec2(.002,.006));
            vec2 grain=q*vec2(13.,19.);float fade=1.-smoothstep(.55,1.4,max(length(dFdx(grain)),length(dFdy(grain))));
            float mineral=noise(grain+noise(q*2.3)*1.4);
            c*=1.+((mineral-.5)*.16+pigmentDab(q*vec2(3.5,2.))*.20)*fade;
            float chips=smoothstep(.76,.90,mineral)*smoothstep(.50,.72,noise(q*5.1+3.))*fade;
            c*=1.-chips*.16;
            float damp=(1.-smoothstep(-.10,.46,vP.y))*(.70+.30*noise(q*2.));
            c=mix(c,linearColor(vec3(.26,.275,.26)),damp*.38);
            float bounce=1.-smoothstep(.03,1.30,vP.y);
            c=mix(c,linearColor(vec3(.45,.375,.285)),bounce*.24);
            c+=linearColor(vec3(.58,.44,.29))*bounce*.055;
            float nearColumn=1.-smoothstep(-8.,22.,vP.x);
            float openingEdge=smoothstep(2.95,3.22,abs(cross));
            c=mix(c,linearColor(vec3(.52,.435,.33)),openingEdge*(.20+.45*nearColumn));
            ${reflection?'c*=.52;':''}
            gl_FragColor=vec4(c,1.);return;
          }
        `:''}
        ${kind==='bark'?`
          // inferred: added fine twigs and distant trunks carry a quiet brown
          // wash; metre-scale furrow relief is neither visible nor useful here.
          if(abs(vKind-90.)<.5){
            float sun=smoothstep(-.15,.70,dot(n,paintSun));
            vec3 twig=vC*mix(vec3(.57,.60,.70),vec3(1.23,1.08,.85),sun);
            twig=mix(twig,linearColor(vec3(.76,.75,.69)),smoothstep(25.,120.,-vP.z)*.72);
            gl_FragColor=vec4(twig,1.);return;
          }
        `:''}
        ${profile==='zhouqiao'?`float shadowing=castShade(vP,${kind==='leaf'?'dot(n,paintSun)<0.?-n:n':'n'});float sunlight=max(dot(n,paintSun),0.)*shadowing;`:''}
        ${kind==='leaf'?`
          // Closed canopy lobes need neither cutout coverage nor the near
          // flower brush field. Reject hidden backs before shading their wash.
          if(abs(vKind-84.)<.5||abs(vKind-85.)<.5||abs(vKind-89.)<.5){
            if(!gl_FrontFacing)discard;
            float dome=smoothstep(-.45,.85,dot(n,paintSun))${profile==='zhouqiao'?'*shadowing':''};
            vec3 canopy=vC*mix(vec3(.57,.65,.62),vec3(1.13,1.07,.83),dome);
            ${profile==='zhouqiao'?`
            // inferred: quiet, soft world-anchored dabs retain the far
            // crowns' accepted value and atmospheric depth.
            float leafLoad=pigmentDab(vec2(vP.x+vP.z*.4,vP.y)*vec2(2.8,3.6));
            canopy*=.975+leafLoad*.13;
            `:`float leafLoad=noise(vP.xz*2.1+vP.y*.7)*.70+noise(vP.xy*4.3)*.30;canopy*=.84+.27*leafLoad;`}
            canopy=mix(canopy,linearColor(vec3(.76,.75,.69)),smoothstep(35.,140.,-vP.z)*.68);
            if(abs(vKind-85.)<.5)canopy=mix(canopy,linearColor(vec3(.79,.75,.64)),.35+smoothstep(15.,100.,-vP.z)*.40);
            ${profile==='zhouqiao'?'canopy*=1.+leafLoad*.12;':''}
            gl_FragColor=vec4(canopy,1.);return;
          }
        `:''}
        ${kind==='leaf'&&profile==='zhouqiao'?`
          // inferred: willow spears use a simple measured pigment ramp. Skip
          // the unrelated blossom/card brush fields before shading dense whips.
          if(abs(vKind-83.)<.5||abs(vKind-91.)<.5||abs(vKind-93.)<.5){
            bool nearLeaf=abs(vKind-83.)<.5;
            float facing=abs(dot(n,paintSun));
            float light=nearLeaf?clamp((.38+.72*facing)*shadowing,0.,1.):clamp(.52+.48*facing*(.65+.35*shadowing),0.,1.);
            // W2b: each near leaf keeps its seeded pigment, rather than
            // collapsing all four families to one olive luminance ramp.
            vec3 shaded=vC*(nearLeaf?vec3(.43,.48,.56):vec3(.55,.58,.47));
            vec3 lit=vC*(nearLeaf?vec3(1.30,1.24,1.03):vec3(.94,.92,.72));
            vec3 c=mix(shaded,lit,light)*(nearLeaf?.78+.22*vData.x:.92+.08*vData.x);
            if(!nearLeaf)c*=.94+.12*clamp((vP.y-4.)/10.,0.,1.);
            c=mix(c,linearColor(vec3(.76,.75,.69)),smoothstep(35.,140.,-vP.z)*.68);
            float edge=abs(vUv.x-.5)*2.,aa=max(.06,fwidth(edge));
            // inferred: distant whips retain fractional leaf coverage below
            // one pixel; fading them at the near-leaf threshold exposed bare
            // branches at adaptive resolutions and the wide look corners.
            float pixelWidth=1./max(fwidth(vUv.x),.0001);
            float resolved=nearLeaf?smoothstep(.70,1.6,pixelWidth):smoothstep(.25,.90,pixelWidth);
            // Narrower lances and missing whole whips leave real gaps in
            // front of sky and plaster; the silhouette is not a solid dome.
            float coverage=(1.-smoothstep(nearLeaf?.86-aa:.58-aa,nearLeaf?1.+aa:.80+aa,edge))*resolved;
            gl_FragColor=vec4(c,coverage);return;
          }
        `:''}
        float variation=0.0, wash=0.0; ${code}
        ${kind==='roof'?`
          float rowFade=0.,rowPhase=0.;
          if(abs(vKind-50.)<.5){
            vec2 dx=dFdx(vUv),dy=dFdy(vUv);
            float pixels=1./max(max(abs(dx.x),abs(dy.x)),.00001);
            rowFade=smoothstep(1.5,3.,pixels);rowPhase=(vUv.x+noise(vUv*vec2(.20,.7))*.075)*6.2831853;
            // inferred: rounded cover-tile relief in the actual surface frame,
            // with broad irregular loads crossing the rows rather than a comb.
            float det=dx.x*dy.y-dx.y*dy.x;
            if(abs(det)>.0000001){
              vec3 across=normalize((dFdx(vP)*dy.y-dFdy(vP)*dx.y)/det);
              float load=.45+.55*noise(vUv*vec2(.10,.65));
              n=normalize(n+across*sin(rowPhase)*.42*rowFade*load);
            }
          }
        `:''}
        ${profile==='zhouqiao'&&kind==='roof'?'sunlight=max(dot(n,paintSun),0.)*shadowing;':''}
        float light=${profile==='zhouqiao'?`clamp(sunlight*${kind==='stone'?'paintSunEnergy':'1.45'},0.,1.)`:'smoothstep(-.15,.70,dot(n,paintSun))'};
        ${kind==='stone'?'float pigmentSun=light;':''}
        ${kind === 'leaf' ? 'light=.26+.28*abs(dot(n,paintSun))+.28*noise(vP.xz*.45);' : ''}
        vec3 shadow=vC*vec3(.38,.48,.74)+linearColor(vec3(.20,.17,.29))*.35;
        ${kind==='timber'?'if(vP.z<0.)shadow=vC*vec3(.60,.66,.82)+linearColor(vec3(.29,.23,.27))*.30;':''}
        vec3 lit=vC*${kind==='timber'?'vec3(1.65,1.42,1.12)':'vec3(1.33,1.14,.86)'};
        vec3 c=mix(shadow,lit,light)*(1.0+variation+wash*.10);
        ${kind === 'stone' ? `
          // inferred: warm limestone planes; cool pigment is confined to soft cast shade.
          shadow=vC*vec3(.50,.47,.42);lit=vC*vec3(1.20,1.10,.92);
          c=${profile==='zhouqiao'?'stoneLight(vC,n,sunlight,0.,0.)':'mix(shadow,lit,light)'}*(1.+variation*.36+wash*.06);
          float joint=1.-smoothstep(.006,.024,abs(mod(vP.y+.09,.66)-.33));
          if(vP.z< -12. && abs(n.y)<.5)c*=1.-joint*.065;
          if(!masonry)c*=.92+.16*noise(q*vec2(5.7,8.));
        ` : ''}
        ${kind === 'plaster' ? `
          ${profile==='zhouqiao'?'shadow=vC*vec3(.32,.29,.36);lit=vC*vec3(1.18,1.02,.85);':'shadow=vC*vec3(.70,.58,.48);lit=vC*vec3(1.60,1.35,1.00);'}
          c=mix(shadow,lit,light)*(1.+variation*.32+wash*.07);
          float course=1.-smoothstep(.008,.028,abs(mod(vP.y,.59)-.295));
          c*=1.-course*.055;
          ${profile==='xuande'?`float bankShadow=(1.-smoothstep(2.8,3.4,vP.y))*(1.-smoothstep(-32.,-29.,vP.z));
          bankShadow*=smoothstep(-25.,-20.,vP.x)*(1.-smoothstep(33.,38.,vP.x));
          if(abs(vKind-66.)>.5)c=mix(c,c*vec3(.18,.26,.26),bankShadow*.90);`: ''}
        ` : ''}
        ${kind === 'leaf' ? 'c=mix(c,c*vec3(.70,.96,1.13),(1.-light)*.6);c*=.67+.63*smoothstep(.42,.76,noise(vP.xz*.45));' : ''}
        ${kind === 'roof' ? `
          c=mix(linearColor(vec3(.32,.35,.43)),linearColor(vec3(.59,.62,.64)),light*.85);
          c*=1.0+variation+wash*.18;
          float glaze=max(0.0,dab(vP.xz*vec2(4.8,1.1)+vec2(vP.z*.3,0.)));
          c+=linearColor(vec3(.66,.56,.37))*glaze*.55;
        ` : ''}
        ${kind === 'bark' ? `
          // inferred: tube UV.x follows the circumference and UV.y is arc
          // length along each branch. The ridged fields stretch 8:1 along
          // growth; secondary warp and scumbles break the long braided plates.
          q=vUv;
          float ridged=barkPlate(q);
          float footprint=max(length(dFdx(q*vec2(7.36,.92))),length(dFdy(q*vec2(7.36,.92))));
          ridged=mix(ridged,.65,smoothstep(.65,1.6,footprint));
          float crevice=smoothstep(.72,.93,ridged)*smoothstep(.32,.64,noise(q*vec2(1.1,1.7)+3.));
          float plate=smoothstep(.2,.7,1.-ridged);
          float crossCrack=barkCross(q);crevice=max(crevice,crossCrack*.80);plate*=1.-crossCrack*.45;
          vec2 chips=barkChips(q);
          vec3 middle=linearColor(vec3(.30,.24,.24));
          vec3 ridge=linearColor(vec3(.72,.55,.34));
          // A small surface relief follows the same branch-axis grain. Its
          // normal variation catches light where the base surface faces sun.
          vec3 dpX=dFdx(vP),dpY=dFdy(vP);vec2 duX=dFdx(q),duY=dFdy(q);
          float determinant=duX.x*duY.y-duX.y*duY.x;
          vec3 barkNormal=n;
          if(abs(determinant)>.0000001){
            vec3 across=normalize((dpX*duY.y-dpY*duX.y)/determinant),along=normalize((-dpX*duY.x+dpY*duX.x)/determinant);
            float gu=(dFdx(plate)*duY.y-dFdy(plate)*duX.y)/determinant;
            float gv=(dFdy(plate)*duX.x-dFdx(plate)*duY.x)/determinant;
            barkNormal=normalize(n-across*clamp(gu,-8.,8.)*.10-along*clamp(gv,-3.,3.)*.045);
          }
          float sunSide=smoothstep(.02,.72,dot(barkNormal,paintSun))*smoothstep(-.10,.25,dot(n,paintSun))${profile==='zhouqiao'?'*shadowing':''};
          c=mix(middle,ridge,sunSide*(.35+.65*plate))*(.82+plate*.25);
          c=mix(c,linearColor(vec3(.13,.09,.09)),pow(crevice,2.)*.90);
          float lichen=smoothstep(.62,.80,noise(q*vec2(.35,.12)+7.));
          c=mix(c,linearColor(vec3(.42,.46,.37)),lichen*.20);
          c=brokenColor(c,q,vec2(3.2,.8),.65,vec3(1.4,1.02,.65),vec3(.72,.98,1.4));
          c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,.70);
          c*=1.+pigmentDab(q*vec2(4.5,1.4))*.8+pigmentDab(q*vec2(11.,3.)+7.)*.32;
          c=brokenColor(c,q,vec2(2.8,1.1),1.8,vec3(1.4,1.02,.65),vec3(.72,.98,1.4),vec3(1.10,1.07,.80),vec3(.85,.95,1.10));
          c*=.93+.14*chips.x;
          c=mix(c,linearColor(vec3(.17,.13,.13)),chips.y*.40);
          ${profile==='xuande'?'c*=vec3(.72,.76,.84);':''}
        ` : ''}
        ${kind==='roof'&&profile==='xuande'?`
          if(vKind>30.5&&vKind<31.5){c=mix(linearColor(vec3(.37,.38,.36)),linearColor(vec3(.66,.64,.55)),light);}
        `:''}
        c=mix(c*${kind==='stone'?'vec3(.64,.61,.59)':'vec3(.55,.58,.76)'},c,clamp(vData.x,0.0,1.0));
        ${kind === 'timber' ? `
          if(vKind>9.5&&abs(vKind-47.)>.5){
            c=mix(linearColor(vec3(.27,.22,.15)),linearColor(vec3(.48,.39,.26)),light);
            c*=.88+.14*noise(vP.xz*9.+vP.y*4.);
          }
        ` : ''}
        ${kind === 'stone'&&profile==='zhouqiao' ? `float bridgeY=vP.y-(${BRIDGE.fall.toFixed(6)})*vP.x,bridgeZ=vP.z-(${BRIDGE.skew.toFixed(6)})*vP.x-(${BRIDGE.offset.toFixed(6)});
          vec3 postP=vP-vec3(${MOORING.position.map(x=>x.toFixed(6)).join(',')});
          if(abs(postP.x)<${(MOORING.width*.6).toFixed(6)}&&abs(postP.z)<${(MOORING.width*.6).toFixed(6)}&&postP.y>0.){
            float stain=noise(q*vec2(13.,2.9))*.7+noise(q*vec2(23.,9.))*.3;
            c*=mix(.41,.77,smoothstep(.26,.72,stain));
            c+=linearColor(vec3(.65,.59,.47))*max(0.,dab(q*vec2(18.,7.)))*.25;
          }
          float moss=(1.-smoothstep(.08,.72,vP.y))*smoothstep(.36,.72,noise(vP.xz*3.));
          c=mix(c,linearColor(vec3(.29,.35,.23)),moss*.52);
        ` : ''}
        ${profile==='zhouqiao'&&['timber','plaster'].includes(kind) ? TOWERS.map(([x,z,s]) => `{
          vec3 p=(vP-vec3(${x.toFixed(6)},3.6,${z.toFixed(6)}))/${s.toFixed(6)};
          ${kind==='plaster'?`
          if(vKind>10.5&&vKind<11.5&&abs(p.x)<6.5&&abs(p.z)<4.){
            // inferred: quiet coursed tan masonry under the baked eave shadow.
            float u=abs(n.x)>.60?p.z:p.x;
            float row=p.y/.42,cell=u/.80+mod(floor(row),2.)*.5;
            float joint=min(fract(row),1.-fract(row)),ja=max(.012,fwidth(row));
            float course=1.-smoothstep(.014-ja,.045+ja,joint);
            float stagger=min(fract(cell),1.-fract(cell));
            course=max(course,(1.-smoothstep(.014,.045,stagger))*.42);
            c*=1.-course*.12;
            c*=.95+.09*noise(vec2(floor(cell),floor(row)));

          }` : ''}
        }`).join('\n') : ''}
        ${kind==='timber'&&profile==='zhouqiao'?'if(vP.z<0.)c*=1.17;':''}
        ${profile==='xuande'?`
          ${kind==='plaster'?`
          // inferred: quiet ochre washes, irregular patches and vertical
          // seepage are attached to masonry; faint courses show through near its foot.
          if(vKind>19.5){
          vec2 wallQ=vec2(vP.x+vP.z*.23,vP.y);
          // inferred: quiet rose-ochre plaster and 2–6 m washes, with
          // isolated upper olive-grey clusters rather than all-over dabs.
          float broadWash=noise(wallQ*vec2(.20,.24)+8.)-.5;
          float rain=noise(wallQ*vec2(.48,.045)+19.);
          vec3 plaster=mix(vec3(.83,.66,.49),vec3(.84,.69,.49),smoothstep(3.,10.,vP.y));
          c=linearColor(plaster)*(1.+broadWash*.13);
          // inferred: a thin, irregular masonry/flaking field lies under the
          // dominant plaster washes; the smaller foot stones remain quiet.
          vec2 wallSize=mix(vec2(1.05,.68),vec2(1.75,1.02),smoothstep(1.,6.,vP.y));
          c=paintedStone(c,wallQ,wallSize,vec4(.035,.08,.23,.60),vec2(.008,.025));
          float flakes=noise(wallQ*vec2(1.8,2.2)+noise(wallQ*.6)*1.3);
          c*=mix(vec3(1.06,1.01,.93),vec3(.94,.99,1.08),flakes);
          float mineralDust=noise(wallQ*vec2(3.8,5.)+9.)-.5;
          c*=vec3(1.)+vec3(.12,-.03,-.22)*mineralDust;
          float cluster=smoothstep(.51,.71,noise(wallQ*vec2(.19,.27)+17.));
          float upper=smoothstep(6.,10.,vP.y);
          float lichen=cluster*(.60+.40*noise(wallQ*vec2(.48,.62)+5.))*upper;
          c=mix(c,linearColor(vec3(.64,.63,.53)),lichen*.28);
          c*=1.+pigmentDab(wallQ*vec2(.38,.52)+11.)*cluster*.15;
          c*=1.-smoothstep(.56,.80,rain)*exp(-max(0.,12.-vP.y)*.22)*.13;
          // inferred: a few narrow top-down rain runs sit inside the broad
          // weathered clusters, leaving most of the plaster unmarked.
          float run=smoothstep(.76,.88,noise(vec2(wallQ.x*2.4,5.)));
          c*=1.-run*cluster*exp(-max(0.,12.-vP.y)*.40)*.14;
          // inferred: an authored world-fixed canopy-shadow proxy on the wall
          // makes the foreground hero's upper-left dapple legible in c1's pose.
          float canopy=1.-smoothstep(.42,1.05,length(vec2((vP.x+15.)/20.,(vP.y-12.)/6.)));
          float leaves=noise(wallQ*vec2(.55,.70))*.65+noise(wallQ*vec2(1.6,1.9)+3.)*.20+noise(wallQ*vec2(3.4,3.8)+8.)*.15;
          float penumbra=max(.035,fwidth(leaves)*1.2);
          float leafShade=smoothstep(.42-penumbra,.58+penumbra,leaves);
          c=mix(c,linearColor(vec3(.50,.48,.55))*(.95+broadWash*.10),canopy*leafShade*.78);
          float foot=exp(-max(vP.y,0.)*.95),top=exp(-abs(vP.y-11.8)*2.1);
          c*=1.-foot*.12-top*.13;
          float returnPlane=pow(abs(n.x),3.);
          c=mix(c,linearColor(vec3(.49,.45,.47))*(.95+broadWash*.08),returnPlane*.76);
          float wing=smoothstep(21.,25.,abs(vP.x-3.3))*(1.-smoothstep(11.2,12.2,vP.y));
          c=mix(c,c*vec3(.73,.72,.81),wing*.50);
          }else{c=linearColor(vec3(.44,.36,.29))*(.8+.25*light);}
          `:''}
          ${kind==='stone'?`
          if(vP.y<.2){
            // inferred: the same projected dapple at 60% of the former
            // spatial size, with broad penumbra and small leafy edge lobes.
            vec2 canopy=vP.xz+(12.-vP.y)*paintSun.xz/paintSun.y;
            canopy+=vec2(sin(paintTime*.55+vP.z*.3),cos(paintTime*.43+vP.x*.4))*.08;
            float shadeField=noise(canopy*vec2(.30,.2333))*.55+noise(canopy*vec2(1.18,.9333))*.32+noise(canopy*vec2(3.,2.1667))*.13;
            float penumbra=max(.045,fwidth(shadeField)*1.8);
            float pool=smoothstep(.55-penumbra*.55,.70+penumbra*.45,shadeField);
            float washTone=noise(vP.xz*vec2(.52,.39));
            vec3 shade=mix(linearColor(vec3(.46,.46,.53)),linearColor(vec3(.50,.49,.54)),washTone);
            vec3 sun=mix(linearColor(vec3(.85,.70,.60)),linearColor(vec3(.87,.73,.62)),washTone);
            c=mix(shade,sun,pool);
            c*=.91+.09*clamp(dot(vC,vec3(.2126,.7152,.0722))/.45,.7,1.3);
            if(abs(vKind-70.)<.5)c=paintedStone(c,vP.xz+vec2(13.35,.10),vec2(3.1,2.2),vec4(.28,.12,.24,.10),vec2(.004,.013));
            pigmentSun=pool;
            if(vKind>26.5&&vKind<27.5){
              float soil=noise(vP.xz*vec2(.15,.18));
              c=mix(linearColor(vec3(.60,.56,.46)),linearColor(vec3(.61,.63,.49)),soil);
              // inferred: low-contrast overlapping yellow-green and olive
              // brush tufts stay in the existing grass value family.
              float tufts=pigmentDab(vP.xz*vec2(2.2,1.3)+3.);
              c*=.93+.10*noise(vP.xz*.55);
              c=mix(c,c*vec3(1.10,1.08,.87),max(tufts,0.)*.75);
              c=mix(c,c*vec3(.88,.93,.84),max(-tufts,0.)*.65);
            }
          }
          if(vKind>31.5&&vKind<32.5){
            c=mix(linearColor(vec3(.43,.44,.40)),linearColor(vec3(.76,.68,.55)),light);
            c*=.96+.08*noise(vP.xz*1.8+vP.y);
            c=mix(c,linearColor(vec3(.33,.42,.31)),(1.-smoothstep(-.1,.20,vP.y))*.35);
          }` :''}
          ${kind==='timber'?`
          float grain=noise(vec2(vP.x+vP.z,vP.y)*vec2(5.2,.7));
          vec3 woodShade=vC*vec3(.65,.66,.83)+linearColor(vec3(.13,.10,.16))*.15;
          c=mix(woodShade,vC*vec3(1.85,1.50,1.15),light*.72+.17)*(.92+grain*.16);
          if(vP.y>18.3)c*=.73;
          if(vKind>32.5&&vKind<34.5){
            float stroke=noise(vUv*vec2(2.4,.30));
            vec3 shaded=linearColor(vec3(.53,.32,.27)),sunlit=linearColor(vec3(.85,.50,.32));
            c=mix(shaded,sunlit,light)*(.91+.16*stroke);
            if(vKind>33.5)c*=1.-smoothstep(17.5,20.3,vP.y)*.12;
            c+=linearColor(vec3(.59,.39,.27))*max(0.,dab(vUv*vec2(3.,.7)))*light*.20;
          }
          if(vKind>28.5&&vKind<29.5){
            float wear=noise(vec2(vP.x+vP.z*.43,vP.y)*vec2(3.5,1.2));
            c=mix(linearColor(vec3(.33,.19,.23)),linearColor(vec3(.68,.34,.31)),light)*(.91+.13*wear);
            c+=linearColor(vec3(.71,.44,.34))*max(n.y,0.)*(.10+.08*wear);
            float brush=dab(vec2(vP.x+vP.z*.4,vP.y)*vec2(5.,2.));
            c*=1.+brush*.25;
          }
          if(vKind>21.5&&vKind<22.5){c=mix(linearColor(vec3(.64,.34,.24)),linearColor(vec3(.76,.43,.30)),smoothstep(4.9,5.3,vP.y))*(.90+.18*light);if(n.y<-.4)c*=.58;}
          if(vKind>23.5&&vKind<24.5){
            float bounce=1.-smoothstep(12.3,17.6,vP.y);
            c=mix(linearColor(vec3(.42,.32,.29)),linearColor(vec3(.50,.36,.27)),bounce)*(.94+.10*noise(vP.xy*.8));
          }
          if(vKind>25.5&&vKind<26.5)c=linearColor(vec3(.44,.29,.23))*(.90+.20*light);
          if(vKind>24.5&&vKind<25.5){
            // inferred: warm reflected light on rolled arm undersides makes the
            // source's separate arms read as a fan rather than dark logs.
            float armLight=max(light,max(-n.y,0.)*.42);
            c=mix(linearColor(vec3(.49,.28,.23)),linearColor(vec3(.87,.52,.33)),armLight);
            float timberWash=noise(vUv*vec2(1.4,3.5));
            c*=(.80+.20*clamp(vData.x,0.,1.))*(.87+.26*timberWash);
            c+=linearColor(vec3(.62,.38,.24))*max(-n.y,0.)*.16;
          }
          if(vP.y<3.1&&vP.z>4.){
            float worn=noise(vec2(vP.x+vP.z*.4,vP.y)*vec2(7.,2.));
            c*=.80+.23*worn;
            c+=linearColor(vec3(.55,.35,.26))*max(0.,dab(vP.xz*vec2(11.,2.)))*max(n.y,0.)*.45;
          }
          if(vKind>20.5&&vKind<21.5){
            c=linearColor(vec3(.78,.37,.26))*(.94+.08*noise(vP.xy*vec2(2.1,.55)));
            float board=1.-smoothstep(.01,.04,abs(mod(vP.x,.72)-.36));c*=1.-board*.085;
            c*=1.-smoothstep(4.9,5.8,vP.y)*.22;
          }
          `:''}
          ${kind==='leaf'?`
          if(vKind>1.5&&vKind<2.5){c=vC*(.72+.48*light)*(1.+variation*.35);}
          if(vKind>3.5&&vKind<4.5)c=vC*(.86+.26*light);
          `:''}
        `:''}
        ${['stone','plaster','timber','roof'].includes(kind)?`
          ${kind==='plaster'&&profile==='xuande'?'if(vKind<19.5)':''}
          ${kind==='stone'?`if(masonry){}else if(${profile==='xuande'?'((vP.y<.2&&abs(vKind-27.)>.5)||abs(vKind-32.)<.5)':'abs(vKind-36.)<.5'})c=stonePigment(c,q,pigmentSun);else`:''}
          c=brokenColor(c,q,${({stone:'vec2(2.1,3.)',plaster:profile==='xuande'?'vec2(.8,1.05)':'vec2(1.25,1.8)',timber:profile==='xuande'?'(vKind>20.5&&vKind<22.5?vec2(.7,1.3):vec2(1.4,4.))':'vec2(1.4,4.)',roof:'vec2(2.6,1.3)'})[kind]},${({stone:'1.5',plaster:profile==='xuande'?'.85':'1.0',timber:profile==='xuande'?'(vKind>20.5&&vKind<21.5?.40:1.0)':'(vKind>8.5&&vKind<9.5?3.5:1.0)',roof:'.55'})[kind]},
            ${kind==='roof'?'vec3(1.20,1.06,.74),vec3(.77,.98,1.35)':kind==='timber'?'vec3(1.38,1.04,.64),vec3(.76,.98,1.35)':'vec3(1.45,1.00,.63),vec3(.72,.98,1.43)'});
        `:''}
        ${kind==='roof'&&profile==='xuande'?'c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,.90)+linearColor(vec3(.14,.10,.05))*.15;':''}
        ${kind==='timber'&&profile==='xuande'?'if(vKind>34.5&&vKind<35.5)c=mix(linearColor(vec3(.48,.29,.09)),linearColor(vec3(.88,.67,.30)),.40+.60*light);':''}
        ${kind==='roof'?`
          if(abs(vKind-57.)<.5)c*=mix(.74,1.13,max(n.y,0.));
          if(abs(vKind-50.)<.5){
            float gutter=pow(.5-.5*cos(rowPhase),7.);
            float acrossWash=noise(vUv*vec2(.08,.55)+5.);
            float rowLoad=hash21(vec2(floor(vUv.x),13.))-.5;
            c*=1.+rowFade*(.06-gutter*.52+(acrossWash-.5)*.66+rowLoad*.06);
            c+=linearColor(vec3(.20,.23,.28))*pow(max(0.,cos(rowPhase)),7.)*rowFade*.20;
            float along=vUv.y/.35,aa=max(.015,fwidth(along));
            float lap=1.-smoothstep(.018-aa,.055+aa,min(fract(along),1.-fract(along)));
            float lapFade=1.-smoothstep(.45,.67,fwidth(along));
            c*=1.-lap*.11*rowFade*lapFade;
            vec2 cell=floor(vec2(vUv.x,vUv.y/.65));
            float broken=smoothstep(.89,.98,hash21(cell+19.));
            float end=fract(vUv.y/.65),a=max(.02,fwidth(end));
            float chip=smoothstep(.10-a,.23+a,end)*(1.-smoothstep(.38-a,.54+a,end));
            c=mix(c,c*vec3(.68,.75,.82)+linearColor(vec3(.14,.14,.13))*.08,broken*chip*rowFade*lapFade*.65);
          }
        `:''}
        ${kind==='timber'?`
          if(vKind>39.5&&vKind<45.5){
            // inferred: the existing vermilion palette receives darker arm
            // undersides and a narrow warm top face; dou accents stay muted.
            float armLight=${profile==='zhouqiao'?'light':'max(light,max(n.y,0.)*.50)'};
            c=mix(vC*vec3(.53,.50,.58),vC*vec3(1.58,1.34,1.06),armLight);
            c*=1.-max(-n.y,0.)*.42;
            c*=1.-pow(abs(n.x),3.)*.22;
            c+=vC*vec3(.27,.17,.08)*max(n.y,0.)*.18;
            if(abs(vKind-41.)<.5){
              c*=.72;
              float accent=smoothstep(.74,.92,noise(vP.xz*.73+4.));
              c=mix(c,c*vec3(1.08,1.10,.83),accent*.35);
            }
            if(abs(vKind-44.)<.5)c*=vec3(.47,.44,.49);
            if(abs(vKind-45.)<.5)c*=vec3(.58,.54,.58);
            c*=1.+variation*.22+wash*.06;
          }
          if(abs(vKind-46.)<.5){
            // inferred: recessed six-leaf doors, lower framed panels and a
            // rectangular upper lattice. All frequencies are surface anchored.
            vec2 grid=vUv/vec2(.34,.42),aa=max(fwidth(grid),vec2(.005));
            vec2 e=min(fract(grid),1.-fract(grid));
            vec2 lines=1.-smoothstep(vec2(.025)-aa,vec2(.06)+aa,e);
            float visible=1.-smoothstep(.45,.67,max(aa.x,aa.y));
            float lattice=max(lines.x,lines.y)*visible*smoothstep(1.95,2.10,vUv.y);
            float leaf=vUv.x/.72,la=max(.004,fwidth(leaf));
            float seam=1.-smoothstep(.015-la,.035+la,min(fract(leaf),1.-fract(leaf)));
            c=linearColor(vec3(.43,.31,.26))*(.94+.10*noise(vUv*vec2(1.7,.35)));
            c*=1.-seam*.17;
            float inset=smoothstep(.07,.12,min(fract(leaf),1.-fract(leaf))*.72)*smoothstep(.12,.20,vUv.y)*(1.-smoothstep(1.78,1.90,vUv.y));
            c*=1.-inset*.18;
            c=mix(c,linearColor(vec3(.54,.36,.26)),lattice*.35);
            float panel=1.-smoothstep(.025,.065,abs(vUv.y-1.05));
            c=mix(c,linearColor(vec3(.48,.32,.24)),panel*.65);
          }
          if(abs(vKind-47.)<.5||abs(vKind-33.)<.5){
            // inferred: sparse vertical scumbles on the existing round columns.
            vec2 grain=vUv*vec2(11.,.32);
            float fade=1.-smoothstep(.45,.67,max(length(dFdx(grain)),length(dFdy(grain))));
            c*=1.+(noise(grain+3.)-.5)*.10*fade;
          }
          if(abs(vKind-58.)<.5){
            // inferred: deep red-brown panelled doors in the palace recess;
            // broad uneven timber wash, without an illuminated square lattice.
            c=linearColor(vec3(.29,.18,.155))*(.92+.12*noise(vUv*vec2(.9,.35)+6.));
            float leaf=vUv.x/.82,aa=max(.008,fwidth(leaf));
            float seam=1.-smoothstep(.015-aa,.035+aa,min(fract(leaf),1.-fract(leaf)));
            c*=1.-seam*.20;
            float rail=1.-smoothstep(.025,.075,abs(vUv.y-1.05));c*=1.+rail*.10;
          }
          if(abs(vKind-59.)<.5)c=mix(linearColor(vec3(.25,.15,.13)),linearColor(vec3(.40,.24,.18)),light*.45);
          ${profile==='xuande'?`
          if(abs(vKind-71.)<.5||abs(vKind-72.)<.5){
            // inferred: dry cinnabar scumbles follow the rail or shaft, with
            // warm worn bevels and deep red-brown soffits, never speckled cells.
            vec2 grain=abs(vKind-71.)<.5?vec2(vP.z,vP.y+vP.x*.17):vec2(vP.y,vP.x+vP.z*.37);
            // inferred: short warped scumbles interrupt the posts; only the
            // long rails carry lengthwise dry-brush wear, never ruled stripes.
            vec2 wear=grain*(abs(vKind-71.)<.5?vec2(.7,12.):vec2(1.7,3.8));
            wear+=vec2(noise(grain*.9+4.),noise(grain*1.3+7.))*1.6;
            float broad=noise(grain*vec2(.8,1.8)),dry=noise(wear);
            float fade=1.-smoothstep(.6,1.3,max(length(dFdx(wear)),length(dFdy(wear))));
            float beamSun=max(smoothstep(.30,.88,dot(n,paintSun)),max(n.y,0.)*.65);
            c=mix(linearColor(vec3(.42,.20,.18)),linearColor(vec3(.79,.40,.28)),beamSun)*(.92+broad*.15);
            c=mix(c,linearColor(vec3(.87,.57,.39)),smoothstep(.56,.76,dry)*fade*(.10+.16*beamSun));
            c*=1.+pigmentDab(wear*vec2(.8,1.1))*.31;
            c*=1.-max(-n.y,0.)*.34;
          }
          if(abs(vKind-21.)<.5){
            float grain=noise(vP.xy*vec2(4.5,.35));c=linearColor(vec3(.76,.35,.26))*(.92+.14*grain);
            float plank=(vP.x+20.)/.72,aa=max(.006,fwidth(plank));
            float line=1.-smoothstep(.008-aa,.025+aa,min(fract(plank),1.-fract(plank)));c*=1.-line*.09;
            c*=1.-smoothstep(4.9,5.8,vP.y)*.22;
          }
          if(abs(vKind-22.)<.5)c=mix(vC*vec3(.60,.57,.58),vC*vec3(1.55,1.30,1.09),light)*(1.+(noise(vP.xy*vec2(.7,3.))-.5)*.16);
          if(abs(vKind-79.)<.5)c=linearColor(vec3(.27,.15,.135));
          `:''}
          ${profile==='zhouqiao'?`
          if(abs(vKind-9.)<.5||abs(vKind-77.)<.5||abs(vKind-78.)<.5){
            // inferred: the strakes are uninterrupted along the hull; wear
            // follows their grain rather than changing at angular colour cells.
            vec2 local=vP.xz-vec2(${BOAT.position[0].toFixed(6)},${BOAT.position[2].toFixed(6)});
            local=mat2(${Math.cos(BOAT.yaw).toFixed(6)},${Math.sin(BOAT.yaw).toFixed(6)},${(-Math.sin(BOAT.yaw)).toFixed(6)},${Math.cos(BOAT.yaw).toFixed(6)})*local;
            float s=local.x/${(BOAT.length*.5).toFixed(6)},row=(vP.y-${BOAT.position[1].toFixed(6)}+.24-.18*pow(abs(s),3.))/.1725;
            vec2 grain=abs(vKind-78.)<.5?vec2(local.y,local.x):vec2(local.x,row*.17);
            float wash=noise(grain*vec2(.24,4.2)),worn=noise(grain*vec2(.65,24.));
            float fade=1.-smoothstep(.6,1.4,max(length(dFdx(grain*vec2(.65,24.))),length(dFdy(grain*vec2(.65,24.)))));
            vec3 dry=mix(linearColor(vec3(.33,.28,.23)),linearColor(vec3(.56,.44,.30)),wash);
            c=mix(dry*vec3(.50,.53,.62),dry*vec3(1.45,1.27,1.08),light*.65+.15);
            float dapple=light;
            float scrape=noise(grain*vec2(.85,24.)+vec2(noise(local*.8)*1.8,0.));
            float scrapeFade=1.-smoothstep(.6,1.4,max(length(dFdx(grain*vec2(.85,24.))),length(dFdy(grain*vec2(.85,24.)))));
            c=mix(c,linearColor(vec3(.70,.56,.39)),max(smoothstep(.53,.78,worn)*fade*.24,smoothstep(.42,.66,scrape)*scrapeFade*(.20+.40*dapple)));
            float aa=max(.02,fwidth(row)),seam=1.-smoothstep(.015-aa,.055+aa,min(fract(row),1.-fract(row)));
            if(abs(n.y)<.5)c*=1.-seam*.26;
            c*=mix(.52,1.,smoothstep(-.12,.40,vP.y));
            if(abs(vKind-77.)<.5)c=mix(c,linearColor(vec3(.67,.52,.35)),.32+.20*light);
            if(paintView>.5&&paintView<1.5&&abs(vKind-77.)<.5){
              // inferred: broad worn grain on the gunwale visible in 舟中.
              float wear=noise(grain*vec2(2.,36.));
              c*=.72+.42*wear;c=mix(c,linearColor(vec3(.70,.57,.41)),smoothstep(.60,.83,wear)*.28);
            }
            float seat=min(min(abs(s+.63),abs(s+.22)),min(abs(s-.22),abs(s-.63)));
            if(abs(vKind-9.)<.5)c*=1.-(1.-smoothstep(.035,.09,seat))*(1.-smoothstep(.10,.24,vP.y))*.40;
          }
          if(abs(vKind-76.)<.5)c=mix(vC*vec3(.42,.42,.43),vC*vec3(1.26,1.17,1.01),light);
          `:''}
        `:''}
        ${kind==='stone'&&profile==='zhouqiao'?`
          if(masonry&&vKind<66.){
            // inferred: broad per-block pigment, warm lit fronts and cool
            // shaded sides. W1 supplies cast shade from the real geometry.
            float sun=sunlight;
            c=stoneLight(vC,n,sun,abs(vKind-52.)<.5?1.:0.,0.);
            // W1: the paving's two pigments follow c2, lit ochre over
            // violet-grey shade; its existing slab finish stays intact.
            if(abs(vKind-62.)<.5&&n.y>.65)c=mix(linearColor(vec3(.40,.392,.443)),linearColor(vec3(.79,.65,.55)),clamp(sun*1.45,0.,1.));
            vec2 stoneQ=q,stoneSize=vec2(1.45,.62);
            if(abs(vKind-52.)<.5){stoneQ.y=bridgeY;stoneSize=vec2(1.20,.64);}
            if(abs(vKind-65.)<.5)stoneSize=vec2(2.4,.72);
            if(vKind>60.5&&vKind<62.5)stoneSize=vec2(2.65,.48);
            if(abs(vKind-54.)<.5||abs(vKind-63.)<.5||abs(vKind-64.)<.5)stoneSize=vec2(1.4,.65);
            ${reflection?'c*=1.+(noise(stoneQ*vec2(.4,.5))-.5)*.10;':`float joints=abs(vKind-52.)<.5?.46:abs(vKind-65.)<.5?.40:.22;
            c=paintedStone(c,stoneQ,stoneSize,vec4(joints,.14,.55,.16),vec2(.006,.020));`}
            if(abs(vKind-52.)<.5){
              c=mix(c,linearColor(vec3(.18,.24,.22)),(1.-smoothstep(.015,.19,vP.y))*.88);
            }

            if(abs(vKind-53.)<.5)c*=1.14;
            if(abs(vKind-56.)<.5)c=linearColor(vec3(.28,.24,.21));
            if(abs(vKind-63.)<.5)c*=1.10+max(n.y,0.)*.18;
          }
          if(abs(vKind-54.)<.5){
            // inferred: shallow cloud curls and a recessed border in each
            // solid huaban. The relief is filtered in stone-local metres.
            vec2 p=vec2(mod(vUv.x,.70)-.35,vUv.y-.235);
            float curve=abs(p.y-.055*sin(p.x*11.)),aa=max(.006,fwidth(curve));
            float cut=1.-smoothstep(.008-aa,.022+aa,curve);
            float oval=abs(length(p/vec2(.24,.14))-1.),oa=max(.025,fwidth(oval));
            cut=max(cut,(1.-smoothstep(.04-oa,.12+oa,oval))*.55);
            float edge=min(vUv.y,.47-vUv.y),frame=1.-smoothstep(.018,.045,edge);
            float inset=smoothstep(.035,.075,edge);c*=1.-inset*.26-cut*.18-frame*.15;
          }
          if(vKind>69.5&&vKind<75.5){
            float sun=sunlight;
            c=stoneLight(vC,n,sun,0.,abs(vKind-74.)<.5?1.:0.);
            float quayYaw=${Math.atan(.884).toFixed(6)};
            vec2 local=mat2(cos(quayYaw),sin(quayYaw),-sin(quayYaw),cos(quayYaw))*(vP.xz-vec2(-13.81,0.));
            vec2 stoneQ=vec2(local.y,vP.y),stoneSize=vec2(1.65,.68);
            float dapple=clamp(sun*paintSunEnergy,0.,1.);
            if(abs(vKind-75.)<.5){stoneQ=vec2(q.x,vP.y-${(MOORING.position[1]-.10).toFixed(6)});stoneSize=vec2(.62,.63);}
            if(abs(vKind-73.)<.5)stoneSize=vec2(1.2,.36);
            if((abs(vKind-73.)<.5||abs(vKind-75.)<.5)&&abs(n.y)>.65)stoneQ=local;
            if(abs(vKind-70.)<.5){
              // inferred: smaller worn slabs carry peach light across cool
              // violet shade; their thin joints stay subordinate to the dapple.
              c=mix(linearColor(vec3(.40,.392,.443)),linearColor(vec3(.79,.65,.55)),dapple);
              stoneQ=local;stoneSize=vec2(1.05,.78);
            }
            ${reflection?'c*=1.+(noise(stoneQ*.5)-.5)*.10;':`float joints=(abs(vKind-73.)<.5||abs(vKind-75.)<.5)?0.:abs(vKind-70.)<.5?.62:.35;
            // The approved ashlar wall retains its D3 finish. Stronger internal
            // mottling applies only to the close coping, mooring and paving.
            bool wall=abs(vKind-74.)<.5;
            bool paving=abs(vKind-70.)<.5;
            c=paintedStone(c,stoneQ,stoneSize,vec4(joints,paving?.20:.14,wall?.64:1.25,.15),paving?vec2(.004,.013):wall?vec2(.006,.022):vec2(.009,.026));
            if(paving||abs(vKind-73.)<.5||abs(vKind-75.)<.5){
              // inferred: close-range worn pits sit inside the D3 wash. Their
              // derivative filter removes the grain before it can flicker.
              vec2 grit=stoneQ*vec2(19.,27.);
              float fade=1.-smoothstep(.55,1.3,max(length(dFdx(grit)),length(dFdy(grit))));
              float flake=noise(stoneQ*vec2(6.7,9.1)+noise(stoneQ*3.)*.7);
              c*=1.+((flake-.5)*.65+(noise(grit)-.5)*.30)*fade;
            }
            if(paving){
              // inferred: occasional small moss tufts grow from the same
              // wandering slab joints, never as a wash over whole stones.
              float wander=noise(stoneQ*.7)-.5;
              float course=floor(stoneQ.y/stoneSize.y+wander*.15);
              vec2 slab=vec2(stoneQ.x/stoneSize.x+hash21(vec2(course,3.))*.7+(noise(stoneQ*1.3)-.5)*.15,stoneQ.y/stoneSize.y+wander*.15);
              vec2 edge=min(fract(slab),1.-fract(slab))*stoneSize;
              float distance=min(edge.x,edge.y),aa=max(.004,fwidth(distance));
              float tuft=(1.-smoothstep(.012,.025+aa,distance))*smoothstep(.72,.85,noise(stoneQ*vec2(5.,7.)))*smoothstep(.60,.78,noise(stoneQ*1.8+12.));
              c=mix(c,linearColor(vec3(.32,.36,.23))*(.72+.35*dapple),tuft*.85);
            }`}
            float moss=(1.-smoothstep(.08,.62,vP.y))*smoothstep(.38,.70,noise(vP.xz*vec2(1.3,.9)));
            c=mix(c,linearColor(vec3(.30,.37,.25)),moss*.58);

          }
        `:''}
        ${kind==='stone'&&profile==='xuande'?`
          if(abs(vKind-73.)<.5){
            c=mix(linearColor(vec3(.46,.45,.46)),linearColor(vec3(.79,.72,.61)),light);
            c=paintedStone(c,vec2(vP.z,vP.y),vec2(1.9,.62),vec4(.32,.10,.35,.12));
          }
        `:''}
        ${kind==='plaster'&&profile==='zhouqiao'?`if(abs(vKind-66.)<.5){
          c=paintView>4.5&&paintView<5.5?linearColor(vec3(.77,.69,.56)):stoneLight(linearColor(vec3(.77,.69,.56)),n,sunlight,0.,0.);c*=.93+.10*noise(q*.45);
          if(paintView>4.5&&paintView<5.5){
            // inferred: sunlit, coursed bank closes the corridor in open light.
            c=paintedStone(c,vec2(abs(n.x)>.65?vP.z:vP.x,vP.y),vec2(2.6,.65),vec4(.22,.12,.35,.10),vec2(.008,.024));
            c=mix(c,linearColor(vec3(.48,.53,.37)),(1.-smoothstep(.05,.50,vP.y))*.35);
          }
        }`:''}
        ${kind==='timber'&&profile==='zhouqiao'?`if(abs(vKind-46.)<.5||abs(vKind-58.)<.5)c*=mix(vec3(.50,.50,.65),vec3(1.12,1.07,1.),light);`:''}
        ${kind==='leaf'?`
          // inferred: willow leaves keep three coherent whip values; closed
          // crowns receive soft directional light instead of cutout noise.
          ${profile==='zhouqiao'?'':'if(abs(vKind-83.)<.5)c=vC*mix(vec3(.72,.79,.72),vec3(1.10,1.07,.85),light)*(.82+.18*vData.x);'}
          if(abs(vKind-86.)<.5||abs(vKind-87.)<.5||abs(vKind-88.)<.5)c=vC*(.78+.32*light);
        `:''}
        // inferred: painted aerial wash, deliberately independent of view direction.
        float haze=smoothstep(35.0,140.0,-vP.z)*.68;
        c=mix(c,linearColor(vec3(.76,.75,.69)),haze);
        float coverage=1.0;
        ${kind === 'leaf' ? `
          float edge=abs(vUv.x-.5)*2.0;
          float aa=max(.06,fwidth(edge));
          coverage=1.-smoothstep(.86-aa,1.+aa,edge);
          // inferred: fade thin strands and leaf edges by their pixel footprint;
          // alpha-to-coverage handles the remaining smooth fractional coverage.
          float pixelWidth=1./max(fwidth(vUv.x),.0001);
          if(vKind>4.5)coverage*=smoothstep(.70,1.6,pixelWidth);
          else if(vKind<2.)coverage*=smoothstep(.45,1.20,pixelWidth);
          if(vKind>2.5&&vKind<3.5)coverage=1.0;
          if(vKind>3.5&&vKind<4.5)coverage=1.;
          if(vKind>27.5&&vKind<28.5){
            vec2 r=(vUv-.5)*2.;float edge=length(r);
            float irregular=noise(vP.xy*.75+vP.z*.13);
            coverage=1.-smoothstep(.64,.98,edge+(irregular-.5)*.30);
          }
          if(vKind>11.5&&vKind<12.5){
            float facing=abs(dot(n,normalize(cameraPosition-vP)));
            float feather=noise(vP.xz*vec2(7.,3.)+vec2(0.,vP.y*1.7));
            float fa=max(.025,fwidth(feather));
            coverage=smoothstep(.10,.58,facing+(feather-.5)*.20)*smoothstep(.22-fa,.56+fa,feather);
            c*=.80+feather*.30;
          }
          if(vKind>83.5&&vKind<89.5)coverage=1.;
          if(abs(vKind-81.)<.5){c=vC*(.83+.30*light);coverage=1.;}
          if(abs(vKind-80.)<.5){c=linearColor(vec3(.32,.28,.36));coverage=(1.-smoothstep(.12,1.,length((vUv-.5)*2.)))*.30;}
        ` : ''}
        gl_FragColor=vec4(c,coverage);
      }`,
  });
  mat.userData.noPatch = true;
  return mat;
}

// A soft bright wash at quarter resolution; no full-resolution image filter.
// The engine's accumulation/AA remains intact.
export function installPaintOutput(engine,{profile='xuande'}={}) {
  engine.quality.ao = false;
  engine.quality.bloom = false;
  engine.renderer.shadowMap.enabled = false;
  engine.sky.visible = false;
  const pipeline = engine.pipeline;
  const addSample = pipeline.addSample.bind(pipeline);
  pipeline.addSample = (scene, camera) => {
    // Live tier changes can restore generic AO. Zhouqiao selects its small
    // contact pass here; Xuande and the accepted corridor retain no SSAO.
    const light=engine.registry.paint?.lightTime;
    pipeline.quality.ao = profile==='zhouqiao'&&light?.contactAO&&light.viewIndex.value!==5;
    if(pipeline.quality.ao){pipeline.quality.aoSamples=8;pipeline.quality.aoSettleSamples=8;pipeline.quality.aoStrength=.85;}
    return addSample(scene, camera);
  };
  const vertexShader='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const wash=[0,1].map(()=>new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,colorSpace:THREE.LinearSRGBColorSpace,depthBuffer:false,stencilBuffer:false}));
  const down=new THREE.ShaderMaterial({vertexShader,depthTest:false,depthWrite:false,
    uniforms:{image:{value:null},pixel:{value:new THREE.Vector2()}},
    fragmentShader:`uniform sampler2D image; uniform vec2 pixel; varying vec2 vUv;
      vec3 bright(vec2 p){vec3 c=texture2D(image,p).rgb;return c*smoothstep(.43,.83,dot(c,vec3(.2126,.7152,.0722)));}
      void main(){vec3 c=bright(vUv)*.2;
        c+=(bright(vUv+pixel*vec2(1.5,1.5))+bright(vUv+pixel*vec2(-1.5,1.5))+bright(vUv+pixel*vec2(1.5,-1.5))+bright(vUv-pixel*1.5))*.2;
        gl_FragColor=vec4(c,1.);}`});
  const blur=new THREE.ShaderMaterial({vertexShader,depthTest:false,depthWrite:false,
    uniforms:{image:{value:wash[0].texture},pixel:{value:new THREE.Vector2()}},
    fragmentShader:`uniform sampler2D image;uniform vec2 pixel;varying vec2 vUv;
      void main(){vec3 c=texture2D(image,vUv).rgb*.25;
        for(int i=0;i<4;i++){float a=float(i)*1.57079633;vec2 p=vec2(cos(a),sin(a))*pixel;
          c+=texture2D(image,vUv+p*2.0).rgb*.125+texture2D(image,vUv+p*4.5).rgb*.0625;}
        gl_FragColor=vec4(c,1.);}`});
  const material = new THREE.ShaderMaterial({
    uniforms: { image: { value: null }, glow:{value:wash[1].texture} }, depthTest: false, depthWrite: false,
    vertexShader,
    fragmentShader: `uniform sampler2D image,glow; varying vec2 vUv;
      void main(){vec3 c=max(texture2D(image,vUv).rgb,vec3(0.0));
      c+=texture2D(glow,vUv).rgb*vec3(1.14,1.02,.85)*.075;
      c=mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-.055,step(vec3(.0031308),c));
      // inferred: a soft perceptual luminance curve, measured against c2.
      // Fade it in the upper shoulder so painted cream clouds retain headroom.
      c*=.985;float l=dot(c,vec3(.2126,.7152,.0722));
      float curve=l<.55?.55*pow(max(l,0.)/.55,1.4):1.-.45*pow(max(1.-l,0.)/.45,1.4);
      float mapped=mix(l,curve,1.-smoothstep(.80,.96,l));
      c*=mapped/max(l,.00001);
      gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);}`,
  });
  const sizeWash=()=>{
    const w=Math.max(1,Math.floor(pipeline.w/4)),h=Math.max(1,Math.floor(pipeline.h/4));
    if(wash[0].width!==w||wash[0].height!==h)for(const rt of wash)rt.setSize(w,h);
    down.uniforms.pixel.value.set(1/pipeline.w,1/pipeline.h);blur.uniforms.pixel.value.set(1/w,1/h);
  };
  const downsample=()=>{
    sizeWash();down.uniforms.image.value=pipeline.hdr;
    pipeline.quad.material=down;engine.renderer.setRenderTarget(wash[0]);pipeline.quad.render(engine.renderer);
  };
  const soften=()=>{
    pipeline.quad.material=blur;engine.renderer.setRenderTarget(wash[1]);pipeline.quad.render(engine.renderer);
  };
  const output=(target=null)=>{
    material.uniforms.image.value = pipeline.hdr;
    pipeline.quad.material = material;
    engine.renderer.setRenderTarget(target);
    pipeline.quad.render(engine.renderer);
  };
  pipeline.resolve=(target=null)=>{downsample();soften();output(target);};
  engine.registry.paint = { passes: { scene:1, accumulation:1, quarterGlow:2, output:1, reflection:0, filter:0 },
    outputStages:{downsample,soften,output},wash };
}
