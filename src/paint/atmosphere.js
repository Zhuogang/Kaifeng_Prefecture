import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { BRUSH } from './materials.js';
import { BOAT } from './composition.js';

// inferred: finite curved cyclorama, horizon height and colour wash compose bd1
// with this river. Its ends are beyond both sides of the entire camera path.
export async function paintedSky(engine) {
  const source = new URL('../../assets/backdrops/bd1.jpg', import.meta.url);
  const map = await new THREE.TextureLoader().loadAsync(source.href);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(4, engine.renderer.capabilities.getMaxAnisotropy());
  const p = [], uv = [], index = [], segments = 64;
  // inferred: preserve the painting's aspect and keep its image boundaries
  // outside the main and reflected frusta. A soft horizon strip of the same
  // approved image meets the 3D distance without stretching the cloud shapes.
  const rows=[[0,0],[1,1]];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, angle = (u - .5) * 1.7;
    for (const [v,textureV] of rows) {
      p.push(3 + Math.sin(angle) * 240, -111 + v * 230, 10 - Math.cos(angle) * 240);
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
      void main(){vec3 c=texture2D(backdrop,vUv).rgb;
        vec3 distance=texture2D(backdrop,vec2(vUv.x,.22+(vHeight-5.)/230.)).rgb;
        distance=mix(distance,linearColor(vec3(.78,.77,.66)),.55);
        c=mix(c,distance,1.-smoothstep(3.,14.,vHeight));
        gl_FragColor=vec4(c,1.0);}`,
  });
  material.userData.noPatch = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'bd1-curved-painted-distance'; mesh.renderOrder = -10; mesh.userData.noPatch = true;
  engine.add(mesh, { castShadow: false, receiveShadow: false });
  engine.registry.paint.backdrop = { source: source.href, width: map.image.width, height: map.image.height };
  return mesh;
}

export function paintedWater(engine, time, reflectionScene) {
  // inferred: a 512 x 288 linear-HDR reflection. Only explicit low-detail
  // proxies and the cyclorama enter it; no water, detailed leaves or shadow pass.
  const width = 512, height = 288;
  const shader = {
    name: 'gouache-reflected-river',
    uniforms: { color: { value: null }, textureMatrix: { value: new THREE.Matrix4() },
      tDiffuse: { value: null }, paintTime: time },
    vertexShader: `uniform mat4 textureMatrix; varying vec3 vP;
      void main(){vP=(modelMatrix*vec4(position,1.0)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */`
      varying vec3 vP; uniform float paintTime; uniform mat4 textureMatrix;
      uniform sampler2D tDiffuse; ${BRUSH}
      void main(){
        vec2 p=vP.xz;
        vec2 boat=p-vec2(${BOAT.position[0].toFixed(6)},${BOAT.position[2].toFixed(6)});
        float along=(boat.x*${Math.cos(BOAT.yaw).toFixed(6)}-boat.y*${Math.sin(BOAT.yaw).toFixed(6)})/${(BOAT.length/2).toFixed(6)};
        float across=boat.x*${Math.sin(BOAT.yaw).toFixed(6)}+boat.y*${Math.cos(BOAT.yaw).toFixed(6)};
        if(abs(along)<.99&&abs(across)<${(BOAT.width/2).toFixed(6)}*(1.-.72*pow(abs(along),3.))*.688-.025)discard;
        // Continuous, domain-warped pigment fields: no tiled rows or cell masks.
        // The field is attached to the river plane; time only bends the ripples.
        float front=smoothstep(-20.,14.,p.y);
        // Integral of the depth ramp keeps the phase monotone. Marks become
        // finer on the image toward the bridge without a camera-locked texture.
        float depth=clamp((p.y+20.)/34.,0.,1.);
        float phase=1.8*p.y+10.2*(34.*(pow(depth,3.)-.5*pow(depth,4.))+max(p.y-14.,0.));
        vec2 q=vec2(p.x*mix(2.6,1.15,front),phase);
        q.x+=noise(p*.21)*1.9;
        q.y+=noise(p*vec2(.36,1.1))*.8+sin(p.x*.6+paintTime*.55)*.15;
        float footprint=max(length(dFdx(q)),length(dFdy(q)));
        float broad=mix(.5,noise(q),1.-smoothstep(.65,1.75,footprint));
        float fine=mix(.5,noise(q*vec2(2.4,2.1)+17.),1.-smoothstep(.5,1.5,footprint*2.4));
        float strokes=smoothstep(.36,.68,broad*.75+fine*.25);
        float sway=(noise(q*vec2(.38,.6)+vec2(paintTime*.045,0.))-.5);
        vec2 shifted=p+vec2(sway*.45+(broad-.5)*.70,(broad-.5)*.55);
        vec4 projected=textureMatrix*vec4(shifted.x,-shifted.y,0.,1.);
        vec2 reflectedUV=projected.xy/projected.w;
        reflectedUV=clamp(reflectedUV,vec2(.004),vec2(.996));
        vec3 reflected=texture2D(tDiffuse,reflectedUV).rgb*.5;
        reflected+=(texture2D(tDiffuse,reflectedUV+vec2(.0015,0.)).rgb+texture2D(tDiffuse,reflectedUV-vec2(.0015,0.)).rgb)*.25;
        float warmth=smoothstep(-.04,.12,reflected.r-reflected.b);
        reflected*=mix(vec3(.72,.94,.83),vec3(.98,.95,.76),warmth);
        vec3 body=mix(linearColor(vec3(.26,.44,.40)),linearColor(vec3(.44,.60,.54)),noise(p*.18));
        vec3 c=mix(body,reflected,.28+strokes*.48);
        c*=.83+strokes*.25;
        float glint=smoothstep(.67,.86,fine)*smoothstep(.44,.72,noise(p*vec2(.37,3.7)+8.));
        c+=linearColor(vec3(.73,.76,.61))*glint*.12;
        float bankEdge=-13.5+(p.y+13.)*.4375;
        float bankShade=exp(-max(0.,p.x-bankEdge)*.8)*smoothstep(-13.,0.,p.y);
        float boatShade=exp(-pow(along/.97,4.)-pow((across-.25)/1.75,4.));
        c=mix(c,c*vec3(.45,.62,.62),max(bankShade*.70,boatShade*.65));
        gl_FragColor=vec4(c,1.0);
      }`,
  };
  const water = new Reflector(new THREE.PlaneGeometry(300, 250), {
    shader, textureWidth: width, textureHeight: height, multisample: 0, clipBias: .002,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.paintTime = time;
  water.material.userData.noPatch = true; water.userData.noPatch = true;
  water.name = 'world-brushed-planar-water';
  const target = water.getRenderTarget();
  target.texture.generateMipmaps = true;
  target.texture.minFilter = THREE.LinearMipmapLinearFilter;
  const renderReflection = water.onBeforeRender;
  const state = { width, height, scene: reflectionScene, target, water, lastStats: { calls: 0, triangles: 0 } };
  water.onBeforeRender = function(renderer, scene, camera) {
    const calls = renderer.info.render.calls, triangles = renderer.info.render.triangles;
    renderReflection.call(water, renderer, reflectionScene, camera);
    state.lastStats = { calls: renderer.info.render.calls - calls, triangles: renderer.info.render.triangles - triangles };
  };
  engine.registry.paint.reflection = state;
  engine.registry.paint.passes.reflection = 1;
  engine.add(water, { castShadow: false, receiveShadow: false });
  return water;
}
