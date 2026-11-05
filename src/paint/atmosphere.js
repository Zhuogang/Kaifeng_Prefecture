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
  map.anisotropy = Math.min(4, engine.renderer.capabilities.getMaxAnisotropy());
  const p = [], uv = [], index = [], segments = 64;
  // inferred: preserve the painting's aspect and keep its image boundaries
  // outside the main and reflected frusta. A soft horizon strip of the same
  // approved image meets the 3D distance without stretching the cloud shapes.
  const rows=[[0,0],[1,1]];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, angle = (u - .5) * 1.7;
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
      void main(){vec3 c=texture2D(backdrop,vUv+vec2(${shiftU.toFixed(6)},0.)).rgb;
        vec3 distance=texture2D(backdrop,vec2(vUv.x+(${shiftU.toFixed(6)}),.22+(vHeight-5.)/230.)).rgb;
        distance=mix(distance,linearColor(vec3(.78,.77,.66)),.55);
        c=mix(c,distance,1.-smoothstep(3.,14.,vHeight));
        gl_FragColor=vec4(c,1.0);}`,
  });
  material.userData.noPatch = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = backdrop+'-curved-painted-distance'; mesh.renderOrder = -10; mesh.userData.noPatch = true;
  engine.add(mesh, { castShadow: false, receiveShadow: false });
  engine.registry.paint.backdrop = { source: source.href, width: map.image.width, height: map.image.height };
  return mesh;
}

export function paintedWater(engine,time,reflectionScene,{width=1536,height=864,distortion=.48,bounds=null,river=true}={}) {
  // inferred: a reduced-resolution linear-HDR reflection. Only explicit low-detail
  // proxies and the cyclorama enter it; no water, detailed leaves or shadow pass.
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
        ${river?`if(abs(along)<.99&&abs(across)<${(BOAT.width/2).toFixed(6)}*(1.-.72*pow(abs(along),3.))*.688-.025)discard;`:''}
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
        vec2 texel=vec2(${(1/width).toFixed(9)},${(1/height).toFixed(9)});
        vec3 reflected=texture2D(tDiffuse,reflectedUV).rgb*.4;
        reflected+=(texture2D(tDiffuse,reflectedUV+vec2(texel.x*.8,0.)).rgb+texture2D(tDiffuse,reflectedUV-vec2(texel.x*.8,0.)).rgb)*.15;
        reflected+=(texture2D(tDiffuse,reflectedUV+vec2(0.,texel.y*.65)).rgb+texture2D(tDiffuse,reflectedUV-vec2(0.,texel.y*.65)).rgb)*.15;
        float reach=mix(.12,.34,front);
        vec4 pa=textureMatrix*vec4(shifted.x-(${bounds?((bounds[0]+bounds[2])/2).toFixed(6):'0.'}),-(shifted.y+reach-${bounds?((bounds[1]+bounds[3])/2).toFixed(6):'0.'}),0.,1.);
        vec4 pb=textureMatrix*vec4(shifted.x-(${bounds?((bounds[0]+bounds[2])/2).toFixed(6):'0.'}),-(shifted.y-reach-${bounds?((bounds[1]+bounds[3])/2).toFixed(6):'0.'}),0.,1.);
        reflected=reflected*.72+(texture2D(tDiffuse,pa.xy/pa.w).rgb+texture2D(tDiffuse,pb.xy/pb.w).rgb)*.14;
        reflected*=${river?'.21':'.64'};
        float warmth=smoothstep(-.025,.10,reflected.r-reflected.b);
        reflected*=mix(vec3(.75,1.00,.90),vec3(.92,1.01,.91),warmth);
        vec3 body=mix(linearColor(vec3(.47,.60,.52)),linearColor(vec3(.66,.71,.58)),noise(p*.18));
        // inferred: soft world-space bridge shade, with no hard water edge.
        float bridgeZ=p.y-(${BRIDGE.skew.toFixed(6)})*p.x-(${BRIDGE.offset.toFixed(6)});
        float shade=exp(-pow((bridgeZ+12.)/13.,2.));
        body=mix(body,linearColor(vec3(.20,.39,.33)),shade*${river?'.48':'0.'});
        float vermilion=smoothstep(1.25,1.7,reflected.r/max(.001,reflected.g));
        float mirror=mix(.72+.12*strokes,.82+.10*strokes,vermilion);
        mirror=mix(.76,mirror,smoothstep(-21.,-14.,p.y));
        vec3 frontBody=mix(linearColor(vec3(.32,.47,.44)),linearColor(vec3(.46,.57,.50)),noise(p*.19));
        float nearFade=${river?'smoothstep(1.,12.,p.y)':'.15'};
        body=mix(body,frontBody,nearFade);
        mirror*=1.-nearFade*.50;
        // inferred: murky jade remains visible through very dark reflected
        // surfaces, so the broad deck soffit cannot become an opaque hard bar.
        float reflectedValue=dot(reflected,vec3(.2126,.7152,.0722));
        mirror*=mix(.22,1.,smoothstep(${river?'.004,.035':'.012,.12'},reflectedValue));
        vec3 c=mix(body,reflected,mirror);
        // Transparent cream pigment catches the same warm sky between strokes.
        c+=linearColor(vec3(.66,.61,.43))*(1.-strokes)*.10;
        c*=.95+strokes*.12;
        float glint=smoothstep(.70,.91,fine)*smoothstep(.44,.72,noise(p*vec2(.37,3.7)+8.));
        c+=linearColor(vec3(.73,.76,.61))*glint*.12;
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
