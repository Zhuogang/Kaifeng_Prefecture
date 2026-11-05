import * as THREE from 'three';
import { TOWERS, BRIDGE, MOORING } from './composition.js';
import { SUN, dirFromAzEl } from '../world/plan.js';

// inferred: pigment ramps, stroke fields, ragged coverage and painted occlusion
// are art direction for this proof; the sun direction follows the art bible.

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
`;

// inferred: soft moving leaf shade, projected along the source sun direction.
export function dappleGLSL({height=8,wind=.12,scale=[1.05,.8]}={}){
  return `            vec2 canopy=vP.xz+(${height.toFixed(6)}-vP.y)*paintSun.xz/paintSun.y;
            canopy+=vec2(sin(paintTime*.55+vP.z*.3),cos(paintTime*.43+vP.x*.4))*${wind.toFixed(6)};
            float dapple=smoothstep(.42,.64,noise(canopy*vec2(${scale[0].toFixed(6)},${scale[1].toFixed(6)}))*.76+noise(canopy*3.1)*.24);
            c=mix(c*vec3(.58,.57,.69)+linearColor(vec3(.13,.10,.19))*.04,c*vec3(1.50,1.38,1.12),dapple);`;
}

export function paintMaterial(time,kind='stone',{dapple={}}={}) {
  const code = {
    stone: `vec2 q=abs(n.y)>.65?vP.xz:vec2(abs(n.x)>.65?vP.z:vP.x,vP.y);
      variation=dab(q*vec2(2.1,5.0)+vec2(q.y*.8,0.0))*.55+dab(q*vec2(8.0,14.0))*.20;
      wash=noise(q*1.9)-.5;`,
    plaster: `vec2 q=vec2(vP.x+vP.z,vP.y); variation=dab(q*vec2(3.4,2.4)+q.yx*.3)*.80; wash=noise(q*.8)-.5;`,
    timber: `vec2 q=abs(n.y)>.6?vP.xz:vec2(vP.x+vP.z,vP.y); variation=dab(q*vec2(1.3,22.0))*.8+dab(q*vec2(6.0,42.0))*.3; wash=noise(q*1.2)-.5;`,
    roof: `vec2 q=vP.xz; variation=dab(q*vec2(4.0,2.3))*.28;
      float tile=sin((abs(n.x)>.5?q.y:q.x)*24.166);
      float aa=1.0-smoothstep(.4,1.5,fwidth((abs(n.x)>.5?q.y:q.x)*3.85));
      variation+=pow(max(tile,0.0),4.0)*.17*aa; wash=noise(q*.6)-.5;`,
    bark: `vec2 q=vUv; variation=dab(q*vec2(6.0,1.7))*.48+dab(q*vec2(19.0,6.0))*.22; wash=noise(q*vec2(7.0,.8))-.5;`,
    leaf: `float footprint=max(length(dFdx(vUv)),length(dFdy(vUv)));
      variation=dab(vUv*vec2(7.0,10.0))*.22*(1.-smoothstep(.035,.18,footprint));wash=noise(vP.xz*.5)-.5;`,
  }[kind];
  const mat = new THREE.ShaderMaterial({
    name: 'gouache-' + kind, vertexColors: true, side: THREE.DoubleSide, alphaToCoverage: kind === 'leaf',
    uniforms: { paintTime: time, paintSun: { value: new THREE.Vector3(...dirFromAzEl(SUN.azimuth, SUN.elevation)) } },
    vertexShader: /* glsl */`
      uniform float paintTime; attribute vec3 paintData; attribute float paintKind;
      varying vec3 vP,vN,vC,vData; varying vec2 vUv; varying float vKind;
      void main(){
        vec3 p=position;
        // Flex is in object space; brush coordinates below use the undeformed surface.
        p.x+=sin(paintTime*.55+paintData.z*.6)*.075*paintData.y;
        p.z+=sin(paintTime*.43+paintData.z*.5)*.045*paintData.y;
        vP=(modelMatrix*vec4(position,1.0)).xyz;
        vN=normalize(mat3(modelMatrix)*normal);vC=color;vData=paintData;vUv=uv;vKind=paintKind;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 paintSun;
      uniform float paintTime;
      varying vec3 vP,vN,vC,vData; varying vec2 vUv; varying float vKind;
      ${BRUSH}
      void main(){
        vec3 n=normalize(vN); if(!gl_FrontFacing)n=-n;
        float variation=0.0, wash=0.0; ${code}
        float light=smoothstep(-.15,.70,dot(n,paintSun));
        ${kind === 'leaf' ? 'light=.26+.28*abs(dot(n,paintSun))+.28*noise(vP.xz*.45);' : ''}
        vec3 shadow=vC*vec3(.38,.48,.74)+linearColor(vec3(.20,.17,.29))*.35;
        ${kind==='timber'?'if(vP.z<0.)shadow=vC*vec3(.60,.66,.82)+linearColor(vec3(.29,.23,.27))*.30;':''}
        vec3 lit=vC*${kind==='timber'?'vec3(1.65,1.42,1.12)':'vec3(1.33,1.14,.86)'};
        vec3 c=mix(shadow,lit,light)*(1.0+variation+wash*.10);
        ${kind === 'stone' ? `
          // inferred: warm limestone planes; cool pigment is confined to soft cast shade.
          shadow=vC*vec3(.50,.47,.42);lit=vC*vec3(1.20,1.10,.92);
          c=mix(shadow,lit,light)*(1.+variation*.36+wash*.06);
          float joint=1.-smoothstep(.006,.024,abs(mod(vP.y+.09,.66)-.33));
          if(vP.z< -12. && abs(n.y)<.5)c*=1.-joint*.065;
          c*=.92+.16*noise(q*vec2(5.7,8.));
        ` : ''}
        ${kind === 'plaster' ? `
          shadow=vC*vec3(.70,.58,.48);lit=vC*vec3(1.60,1.35,1.00);
          c=mix(shadow,lit,light)*(1.+variation*.32+wash*.07);
          float course=1.-smoothstep(.008,.028,abs(mod(vP.y,.59)-.295));
          c*=1.-course*.055;
        ` : ''}
        ${kind === 'leaf' ? 'c=mix(c,c*vec3(.70,.96,1.13),(1.-light)*.6);c*=.67+.63*smoothstep(.42,.76,noise(vP.xz*.45));' : ''}
        ${kind === 'roof' ? `
          c=mix(linearColor(vec3(.32,.35,.43)),linearColor(vec3(.59,.62,.64)),light*.85);
          c*=1.0+variation+wash*.18;
          float glaze=max(0.0,dab(vP.xz*vec2(4.8,1.1)+vec2(vP.z*.3,0.)));
          c+=linearColor(vec3(.66,.56,.37))*glaze*.55;
        ` : ''}
        ${kind === 'bark' ? `
          float twist=noise(q*vec2(2.0,.35));
          float stripe=noise(vec2(q.x*9.0+twist*2.5,q.y*.85));
          float groove=smoothstep(.63,.82,stripe);
          c=mix(linearColor(vec3(.25,.22,.27)),linearColor(vec3(.56,.46,.36)),light*.85+variation*.5);
          float plane=smoothstep(.12,.87,noise(q*vec2(1.7,.35)));
          c=mix(c*vec3(.53,.54,.72),c*vec3(1.35,1.16,.98),plane);
          c=mix(c,linearColor(vec3(.15,.12,.17)),groove*.82);
          float scumble=max(0.0,dab(q*vec2(7.,2.)+vec2(twist*2.0,0.)));
          c+=linearColor(vec3(.67,.56,.43))*scumble*3.3;
          c+=linearColor(vec3(.36,.33,.35))*max(0.0,dab(q*vec2(19.,5.)))*.7;
        ` : ''}
        c=mix(c*${kind==='stone'?'vec3(.64,.61,.59)':'vec3(.55,.58,.76)'},c,clamp(vData.x,0.0,1.0));
        ${kind === 'timber' ? `if(vP.z>0.0){c*=mix(vec3(.48,.49,.57),vec3(1.25,1.12,.91),smoothstep(-.15,.58,vP.y));if(n.y>.6&&vP.y>.25)c*=vec3(1.23,1.14,.96);
          float worn=smoothstep(.34,.72,noise(vP.xz*vec2(2.7,1.3))*.65+noise(q*vec2(2.2,9.))*.35);
          c=mix(c*vec3(.63,.67,.74),c*vec3(1.37,1.16,.86),worn);}` : ''}
        ${kind === 'stone' ? `float bridgeY=vP.y-(${BRIDGE.fall.toFixed(6)})*vP.x,bridgeZ=vP.z-(${BRIDGE.skew.toFixed(6)})*vP.x-(${BRIDGE.offset.toFixed(6)});
          float underDeck=(1.-smoothstep(2.1,2.95,bridgeY))*smoothstep(1.2,2.95,bridgeY)*(1.-smoothstep(-15.9,-15.4,bridgeZ));
          c=mix(c,c*vec3(.61,.68,.86),underDeck*.52);
          // inferred: the broad front face is warm shade; the narrow sun face
          // and chipped arris retain cream light, making each shaft read solid.
          float shaft=(1.-smoothstep(2.85,3.1,bridgeY))*(1.-smoothstep(-15.9,-15.4,bridgeZ));
          if(abs(n.z)>.70){float sunBreak=smoothstep(.45,.80,noise(vP.xy*vec2(1.4,.45)));c*=1.-shaft*mix(.42,.04,sunBreak);}
          float bridgeShadow=(1.-smoothstep(27.,33.,abs(vP.x)))*(1.-smoothstep(-22.9,-22.3,bridgeZ))*(1.-smoothstep(2.3,3.3,bridgeY));
          c=mix(c,linearColor(vec3(.25,.32,.35)),bridgeShadow*.85);
          vec3 postP=vP-vec3(${MOORING.position.map(x=>x.toFixed(6)).join(',')});
          if(abs(postP.x)<${(MOORING.width*.6).toFixed(6)}&&abs(postP.z)<${(MOORING.width*.6).toFixed(6)}&&postP.y>0.){
            float stain=noise(q*vec2(13.,2.9))*.7+noise(q*vec2(23.,9.))*.3;
            c*=mix(.60,1.13,smoothstep(.26,.72,stain));
            c+=linearColor(vec3(.65,.59,.47))*max(0.,dab(q*vec2(18.,7.)))*.25;
          }
          float moss=(1.-smoothstep(.08,.72,vP.y))*smoothstep(.36,.72,noise(vP.xz*3.));
          c=mix(c,linearColor(vec3(.29,.35,.23)),moss*.52);
          if(vP.z>-7. && n.y>.5){
            ${dappleGLSL(dapple)}
          }` : ''}
        ${['timber','plaster'].includes(kind) ? TOWERS.map(([x,z,s]) => `{
          vec3 p=(vP-vec3(${x.toFixed(6)},3.6,${z.toFixed(6)}))/${s.toFixed(6)};
          float roofShade=(1.-smoothstep(7.,9.,abs(p.x)))*(1.-smoothstep(4.5,6.5,abs(p.z)));
          roofShade*=smoothstep(6.9,8.8,p.y)*(1.-smoothstep(10.8,11.8,p.y));
          float lintelShade=(1.-smoothstep(3.2,4.4,abs(p.x)))*smoothstep(4.5,5.4,p.y)*(1.-smoothstep(6.0,6.4,p.y));
          c=mix(c,c*vec3(.52,.56,.63),max(roofShade*.58,lintelShade*.65));
        }`).join('\n') : ''}
        ${kind==='timber'?'if(vP.z<0.)c*=1.17;':''}
        // inferred: painted aerial wash, deliberately independent of view direction.
        float haze=smoothstep(35.0,140.0,-vP.z)*.68;
        c=mix(c,linearColor(vec3(.76,.75,.69)),haze);
        float coverage=1.0;
        ${kind === 'leaf' ? `
          float edge=abs(vUv.x-.5)*2.0;
          float aa=max(.06,fwidth(edge));
          coverage=1.-smoothstep(.86-aa,1.+aa,edge);
          if(vKind>4.5)coverage*=smoothstep(.08,.34,noise(vec2(vData.z*7.0,vUv.y*18.0)));
          if(vKind>2.5&&vKind<3.5)coverage=1.0;
        ` : ''}
        gl_FragColor=vec4(c,coverage);
      }`,
  });
  mat.userData.noPatch = true;
  return mat;
}

// A soft bright wash at quarter resolution; no full-resolution image filter.
// The engine's accumulation/AA remains intact.
export function installPaintOutput(engine) {
  engine.quality.ao = false;
  engine.quality.bloom = false;
  engine.renderer.shadowMap.enabled = false;
  engine.sky.visible = false;
  const pipeline = engine.pipeline;
  const addSample = pipeline.addSample.bind(pipeline);
  pipeline.addSample = (scene, camera) => {
    // Live tier changes can restore the generic AO setting after this module
    // builds. The painted scene always uses its authored surface occlusion.
    pipeline.quality.ao = false;
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
