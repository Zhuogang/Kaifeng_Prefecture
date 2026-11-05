import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { BRUSH } from './materials.js';
import { BOAT, QUAY, BRIDGE } from './composition.js';

// inferred: finite curved cyclorama, horizon height and colour wash compose bd1
// with this river. Its ends are beyond both sides of the entire camera path.
export async function paintedSky(engine,{shiftU=0,backdrop='bd1',heightOffset=0}={}) {
  const source = new URL(`../../assets/backdrops/${backdrop}.jpg`, import.meta.url);
  const map = await new THREE.TextureLoader().loadAsync(source.href);
  map.colorSpace = THREE.SRGBColorSpace;
  // inferred: mirror the approved painting only beyond its former image edges;
  // the original central projection and all existing UVs stay in register.
  map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping;
  map.anisotropy = Math.min(4, engine.renderer.capabilities.getMaxAnisotropy());
  const p = [], uv = [], index = [], segments = 128;
  // inferred: preserve the painting's aspect and keep its image boundaries
  // outside the main and reflected frusta. A soft horizon strip of the same
  // approved image meets the 3D distance without stretching the cloud shapes.
  const rows=[[-.5,-.5],[0,0],[1,1],[1.5,1.5]];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments * 2 - .5, angle = (u - .5) * 1.7;
    for (const [v,textureV] of rows) {
      p.push(3 + Math.sin(angle) * 240, -111 + heightOffset + v * 230, 10 - Math.cos(angle) * 240);
      uv.push(u, textureV);
    }
    if(i)for(let j=0;j<rows.length-1;j++){
      const a=i*rows.length+j,b=a-rows.length;
      index.push(b,a,b+1,b+1,a,a+1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  const material = new THREE.ShaderMaterial({
    uniforms: { backdrop: { value: map } }, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: 'varying vec2 vUv;varying float vHeight;void main(){vUv=uv;vHeight=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D backdrop; varying vec2 vUv;varying float vHeight; ${BRUSH}
      void main(){vec3 c=texture2D(backdrop,vUv+vec2(${shiftU.toFixed(6)},0.),1.8).rgb;
        vec3 distance=texture2D(backdrop,vec2(vUv.x+(${shiftU.toFixed(6)}),.22+(vHeight-5.)/230.),1.8).rgb;
        distance=mix(distance,linearColor(vec3(.78,.77,.66)),.55);
        c=mix(c,distance,1.-smoothstep(3.,14.,vHeight));
        // The supplied image owns the brushwork. No procedural stroke overlay.
        c=mix(c*vec3(1.035,1.0,.97),linearColor(vec3(.87,.76,.65)),.035);
        gl_FragColor=vec4(c,1.0);}`,
  });
  material.userData.noPatch = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = backdrop+'-curved-painted-distance'; mesh.renderOrder = -10; mesh.userData.noPatch = true;
  engine.add(mesh, { castShadow: false, receiveShadow: false });
  engine.registry.paint.backdrop = { source: source.href, width: map.image.width, height: map.image.height };
  return mesh;
}

export function paintedWater(engine,time,reflectionScene,{distortion=.48,bounds=null,river=true}={}) {
  const buffer=engine.renderer.getDrawingBufferSize(new THREE.Vector2());
  // D1b: full quality retains the approved reflection's sampling density.
  // The old 1536×864 target is a floor; large drawing buffers still resize it.
  // Budget pressure may halve this through the existing reflection rung.
  const width=Math.max(1536,Math.round(buffer.x/2)),height=Math.max(864,Math.round(buffer.y/2));
  // inferred: a reduced-resolution linear-HDR reflection. Only explicit low-detail
  // proxies and the cyclorama enter it; no water, detailed leaves or shadow pass.
  const shader = {
    name: 'gouache-reflected-river',
    uniforms: { color: { value: null }, textureMatrix: { value: new THREE.Matrix4() },
      tDiffuse: { value: null }, reflectionTexel:{value:new THREE.Vector2(1/width,1/height)}, paintTime: time },
    vertexShader: `uniform mat4 textureMatrix; varying vec3 vP;
      void main(){vP=(modelMatrix*vec4(position,1.0)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */`
      varying vec3 vP; uniform float paintTime; uniform mat4 textureMatrix;
      uniform sampler2D tDiffuse; uniform vec2 reflectionTexel; ${BRUSH}
      void main(){
        vec2 p=vP.xz;
        vec2 boat=p-vec2(${BOAT.position[0].toFixed(6)},${BOAT.position[2].toFixed(6)});
        float along=(boat.x*${Math.cos(BOAT.yaw).toFixed(6)}-boat.y*${Math.sin(BOAT.yaw).toFixed(6)})/${(BOAT.length/2).toFixed(6)};
        float across=boat.x*${Math.sin(BOAT.yaw).toFixed(6)}+boat.y*${Math.cos(BOAT.yaw).toFixed(6)};
        ${river?`if(abs(along)<.99&&abs(across)<${(BOAT.width/2).toFixed(6)}*(1.-.72*pow(abs(along),3.))*.688-.025)discard;`:''}
        // Continuous, domain-warped pigment fields: no tiled rows or cell masks.
        // The field is attached to the river plane; time only bends the ripples.
        float front=smoothstep(-20.,14.,p.y);
        // Integral of the depth ramp keeps the phase monotone. Marks become
        // finer on the image toward the bridge without a camera-locked texture.
        float depth=clamp((p.y+20.)/34.,0.,1.);
        float phase=1.8*p.y+10.2*(34.*(pow(depth,3.)-.5*pow(depth,4.))+max(p.y-14.,0.));
        // inferred: 10:1 growth of depth frequency against cross-river
        // frequency keeps even the distant marks long and horizontal.
        vec2 q=vec2(p.x*${river?'mix(.18,1.15,front)':'mix(2.6,1.15,front)'},phase);
        q.x+=noise(p*.21)*1.9*${river?'front':'1.'};
        q.y+=noise(p*vec2(.36,1.1))*.8+sin(p.x*.6+paintTime*.55)*.15;
        float footprint=max(length(dFdx(q)),length(dFdy(q)));
        float broad=mix(.5,noise(q),1.-smoothstep(.65,1.75,footprint));
        float fine=mix(.5,noise(q*vec2(2.4,2.1)+17.),1.-smoothstep(.5,1.5,footprint*2.4));
        float strokes=smoothstep(.36,.68,broad*.75+fine*.25);
        float sway=(noise(q*vec2(.38,.6)+vec2(paintTime*.045,0.))-.5);
        // inferred: coherent mirror at contact, larger broken marks in front.
        // inferred: suppress the broad domain warp at the bridge. Its depth
        // ramp used to bend the reflected coping into a visible bow.
        float ripple=mix(.012,${distortion.toFixed(6)},smoothstep(-12.,10.,p.y));
        vec2 shifted=p+vec2(sway*1.2+(broad-.5), (broad-.5)*.6)*ripple;
        vec4 projected=textureMatrix*vec4(shifted.x-(${bounds?((bounds[0]+bounds[2])/2).toFixed(6):'0.'}),-(shifted.y-${bounds?((bounds[1]+bounds[3])/2).toFixed(6):'0.'}),0.,1.);
        vec2 reflectedUV=projected.xy/projected.w;
        reflectedUV=clamp(reflectedUV,vec2(.004),vec2(.996));
        // inferred: a sub-texel horizontal footprint softens the reflected edge
        // without quantising its continuous world-space stroke displacement.
        vec2 texel=reflectionTexel;
        vec3 reflected=texture2D(tDiffuse,reflectedUV).rgb*.4;
        reflected+=(texture2D(tDiffuse,reflectedUV+vec2(texel.x*.8,0.)).rgb+texture2D(tDiffuse,reflectedUV-vec2(texel.x*.8,0.)).rgb)*.15;
        reflected+=(texture2D(tDiffuse,reflectedUV+vec2(0.,texel.y*.65)).rgb+texture2D(tDiffuse,reflectedUV-vec2(0.,texel.y*.65)).rgb)*.15;
        // inferred: soften fine bridge courses along the reflected shafts,
        // while keeping their horizontally separate silhouettes and colours.
        float reach=mix(${river?'.60':'.12'},.34,front);
        vec4 pa=textureMatrix*vec4(shifted.x-(${bounds?((bounds[0]+bounds[2])/2).toFixed(6):'0.'}),-(shifted.y+reach-${bounds?((bounds[1]+bounds[3])/2).toFixed(6):'0.'}),0.,1.);
        vec4 pb=textureMatrix*vec4(shifted.x-(${bounds?((bounds[0]+bounds[2])/2).toFixed(6):'0.'}),-(shifted.y-reach-${bounds?((bounds[1]+bounds[3])/2).toFixed(6):'0.'}),0.,1.);
        reflected=reflected*.72+(texture2D(tDiffuse,pa.xy/pa.w).rgb+texture2D(tDiffuse,pb.xy/pb.w).rgb)*.14;
        // inferred: bright jade pigment raises dark reflected objects and
        // lowers bright ones through mixing, never by scaling the mirror dark.
        vec3 body=mix(linearColor(vec3(.34,.51,.45)),linearColor(vec3(.53,.65,.52)),noise(p*.18));
        ${river?'body=mix(body,linearColor(vec3(.26,.48,.47)),smoothstep(1.,18.,p.y)*.45);':''}
        ${river?`
        // inferred: the water newly exposed beyond the bridge is pale jade,
        // with a quieter mirror so sky shapes do not fill the pier openings.
        float beyondBridge=(1.-smoothstep(-35.,-26.,p.y-(${BRIDGE.skew.toFixed(6)})*p.x-(${BRIDGE.offset.toFixed(6)})));
        beyondBridge*=smoothstep(${(BRIDGE.start-3).toFixed(6)},${(BRIDGE.start-1).toFixed(6)},p.x)*(1.-smoothstep(${(BRIDGE.end+1).toFixed(6)},${(BRIDGE.end+3).toFixed(6)},p.x));
        body=mix(body,linearColor(vec3(.60,.70,.61)),beyondBridge*.75);
        `:''}
        float skyOpening=smoothstep(.008,.13,reflected.b-reflected.r);
        // Actual blue/cream sky exposed in the two open tower passages caused
        // the teal-white patches after the former tint. Neutralise its chroma.
        reflected=mix(reflected,body,skyOpening*.78);
        float warmStone=smoothstep(.01,.07,reflected.r-reflected.b)*(1.-smoothstep(1.25,1.65,reflected.r/max(.001,reflected.g)));
        reflected=mix(reflected,linearColor(vec3(.64,.59,.46)),warmStone*.16);
        float warmReflection=smoothstep(.05,.26,reflected.r-reflected.b);
        reflected*=mix(vec3(1.),vec3(1.18,1.04,.82),warmReflection*.25);
        float calm=${river?'1.-smoothstep(-14.,-2.,p.y)':'0.'};
        float mirror=${river?'mix((.46+.22*strokes)*(1.-smoothstep(1.,18.,p.y)*.55),.86,calm)':'.40+.20*strokes'};
        ${river?'mirror=mix(mirror,.36,beyondBridge);':''}
        vec3 c=mix(body,reflected,mirror);
        c+=linearColor(vec3(.68,.65,.50))*(1.-strokes)*mix(.055,.015,calm);
        float glint=smoothstep(.74,.94,fine)*smoothstep(.45,.74,noise(p*vec2(.37,3.7)+8.));
        c+=linearColor(vec3(.73,.75,.62))*glint*mix(.055,.015,calm);
        // inferred: independent horizontal pigment loads follow the same
        // depth-scaled river coordinates as the reflection strokes.
        c=brokenColor(c,q,${river?'vec2(.70,.45),mix(mix(2.8,.75,front),.12,calm)':'vec2(.35,.25),2.8'},vec3(1.40,1.08,.55),vec3(.60,1.02,1.50),vec3(.72,1.12,1.08),vec3(1.35,1.10,.68));
        ${river?'c*=1.+pigmentDab(q*vec2(.8,.55)+5.)*mix(mix(1.4,.05,front),.06,calm);':''}
        float bankEdge=(${QUAY.intercept.toFixed(6)})+p.y*${QUAY.slope.toFixed(6)};
        float bankShade=exp(-max(0.,p.x-bankEdge)*.8)*smoothstep(-13.,0.,p.y);
        float hullHalf=${(BOAT.width*.5).toFixed(6)}*(1.-.72*pow(min(abs(along),1.),3.))*.70;
        float boatShade=exp(-pow(along/1.01,8.))*exp(-abs(abs(across)-hullHalf)*4.0);
        c=mix(c,c*vec3(.45,.62,.62),${river?'max(bankShade*.70,boatShade*.55)':'0.'});
        gl_FragColor=vec4(c,1.0);
      }`,
  };
  const water = new Reflector(new THREE.PlaneGeometry(bounds?bounds[2]-bounds[0]:300,bounds?bounds[3]-bounds[1]:250), {
    shader, textureWidth: width, textureHeight: height, multisample: 4, clipBias: .002,
  });
  water.rotation.x = -Math.PI / 2;
  if(bounds)water.position.set((bounds[0]+bounds[2])/2,0,(bounds[1]+bounds[3])/2);
  water.material.uniforms.paintTime = time;
  water.material.userData.noPatch = true; water.userData.noPatch = true;
  water.name = 'world-brushed-planar-water';
  const target = water.getRenderTarget();
  target.texture.generateMipmaps = true;
  target.texture.minFilter = THREE.LinearMipmapLinearFilter;
  const renderReflection = water.onBeforeRender;
  const state = { width, height, scale:.5, interval:1, fresh:true, frame:0, scene: reflectionScene, target, water, lastStats: { calls: 0, triangles: 0 } };
  state.resize=()=>{
    engine.renderer.getDrawingBufferSize(buffer);
    const w=Math.max(1,Math.round(Math.max(1536,Math.round(buffer.x/2))*state.scale*2));
    const h=Math.max(1,Math.round(Math.max(864,Math.round(buffer.y/2))*state.scale*2));
    if(state.width===w&&state.height===h)return;
    state.width=w;state.height=h;target.setSize(w,h);state.fresh=true;
    water.material.uniforms.reflectionTexel.value.set(1/w,1/h);
  };
  water.onBeforeRender = function(renderer, scene, camera) {
    state.resize();
    const fresh=!engine.scroll||engine.params.has('ratio')||state.fresh||state.frame++%state.interval===0;
    if(!fresh){state.lastStats={calls:0,triangles:0};return;}
    state.fresh=false;
    const calls = renderer.info.render.calls, triangles = renderer.info.render.triangles;
    renderReflection.call(water, renderer, reflectionScene, camera);
    state.lastStats = { calls: renderer.info.render.calls - calls, triangles: renderer.info.render.triangles - triangles };
  };
  engine.registry.paint.reflection = state;
  engine.registry.paint.passes.reflection = 1;
  engine.add(water, { castShadow: false, receiveShadow: false });
  return water;
}
