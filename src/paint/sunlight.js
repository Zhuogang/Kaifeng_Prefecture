import * as THREE from 'three';

// inferred: W1's low golden light comes from the viewer's left/south-west.
// +z fronts receive it; +x quay faces turn away. One direction for all views.
export const ZHOU_SUN = new THREE.Vector3(-.20, Math.sin(35*Math.PI/180), .794).normalize();
// inferred: c1's low light is left of the viewer; the inward-facing left
// wing is shaded while the opposite return faces the sun.
export const XUANDE_SUN = new THREE.Vector3(-.72, Math.sin(25*Math.PI/180), .55).normalize();

export const SUNLIGHT_GLSL = /* glsl */`
uniform sampler2DShadow paintShadowMap,paintStructureShadowMap;
uniform mat4 paintShadowMatrix;
uniform float paintShadowStrength,paintSunEnergy;
float castShadeMap(sampler2DShadow depthMap,vec3 p,vec3 n,vec3 receiver){
  vec3 q=(paintShadowMatrix*vec4(p,1.)).xyz;
  // Compare against the receiver plane at each filter tap. Comparing
  // every offset against the centre pixel's depth self-shadowed sloping
  // rails into a checker pattern. The bias below covers bilinear texels.
  // A mark centre is constant inside its stroke. Derive the receiver plane
  // from the continuous surface, even when sampling light at that centre.
  vec3 r=(paintShadowMatrix*vec4(receiver,1.)).xyz;
  vec3 plane=cross(dFdx(r),dFdy(r));
  vec2 slope=abs(plane.z)>1.e-12?-plane.xy/plane.z:vec2(0.);
  if(dot(n,paintSun)<=.015||paintShadowStrength==0.)return 1.;
  if(any(lessThan(q,vec3(0.)))||any(greaterThan(q,vec3(1.))))return 1.;
  float angle=noise(p.xz*.65+p.y*.21)*6.2831853;
  mat2 turn=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
  // inferred: hardware bilinear PCF needs the half-texel receiver-depth
  // range as bias. This removes self-shadow without a large normal offset.
  float bias=.000025+dot(abs(slope),vec2(.52/4096.));
  float shade=texture(depthMap,vec3(q.xy,q.z-bias));
  for(int i=0;i<4;i++){
    float a=float(i)*2.39996323;
    vec2 offset=turn*vec2(cos(a),sin(a))*sqrt((float(i)+.5)/4.)*1.8/4096.;
    vec2 uv=q.xy+offset;
    shade+=texture(depthMap,vec3(uv,q.z+dot(offset,slope)-bias));
  }
  return mix(1.,shade/5.,paintShadowStrength);
}
float castShadeAt(vec3 p,vec3 n,vec3 receiver){return castShadeMap(paintShadowMap,p,n,receiver);}
float castShade(vec3 p,vec3 n){return castShadeAt(p,n,p);}
float structureShadeAt(vec3 p,vec3 n,vec3 receiver){return castShadeMap(paintStructureShadowMap,p,n,receiver);}
float structureShade(vec3 p,vec3 n){return structureShadeAt(p,n,p);}
// inferred: two pigments retain a little warm bounce and open-sky violet in
// shade. Angular sun energy, rather than a global curve, separates the planes.
vec3 stoneLight(vec3 pigment,vec3 n,float sun,float pier,float wall){
  vec3 shade=pigment*mix(vec3(.46,.45,.52),vec3(.27,.24,.26),pier);
  shade=mix(shade,pigment*vec3(.34,.28,.32),wall);
  shade+=pigment*vec3(.055,.05,.065)*max(n.y,0.);
  vec3 lit=pigment*mix(vec3(1.16,.99,.91),vec3(1.32,1.06,.82),pier);
  return mix(shade,lit,clamp(sun*paintSunEnergy,0.,1.));
}
`;

export function createSunlight(engine,time,{profile='zhouqiao'}={}){
  const target=new THREE.WebGLRenderTarget(4096,4096,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,
    depthBuffer:true,stencilBuffer:false,generateMipmaps:false});
  target.depthTexture=new THREE.DepthTexture(4096,4096,THREE.UnsignedIntType);
  target.depthTexture.minFilter=target.depthTexture.magFilter=THREE.LinearFilter;
  target.depthTexture.compareFunction=THREE.LessEqualCompare;
  // W2b: a second receiver choice removes garden-tree shadows from the
  // towers and boat without changing the accepted bridge/stone shadow map.
  const structureTarget=target.clone();
  structureTarget.depthTexture=target.depthTexture.clone();
  const matrix=new THREE.Matrix4();
  time.sunlight={target,structureTarget,profile,uniforms:{paintShadowMap:{value:target.depthTexture},paintStructureShadowMap:{value:structureTarget.depthTexture},paintShadowMatrix:{value:matrix},paintShadowStrength:{value:1},paintSunEnergy:{value:1.45}}};
  engine.registry.paint??={};engine.registry.paint.sunlight=time.sunlight;
}

export function bakeSunlight(engine,time){
  const start=performance.now(),{target,structureTarget,uniforms}=time.sunlight;
  const xuande=time.sunlight.profile==='xuande',direction=xuande?XUANDE_SUN:ZHOU_SUN;
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,400),center=xuande?new THREE.Vector3(0,15,-5):new THREE.Vector3(20,7,-12.5);
  camera.position.copy(center).addScaledVector(direction,180);camera.lookAt(center);camera.updateMatrixWorld(true);
  // inferred: W1's visible bounds, with roof height and a modest guard for off-screen
  // casters. Fit in light space, independently of the current view or resize.
  const bounds=new THREE.Box3();
  // inferred: Xuande's existing grove, pavilions, branch and avenue bounds.
  for(const x of xuande?[-115,115]:[-55,95])for(const y of xuande?[-1,43]:[-1,32])for(const z of xuande?[-115,88]:[-80,50])bounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  camera.left=bounds.min.x-2;camera.right=bounds.max.x+2;camera.bottom=bounds.min.y-2;camera.top=bounds.max.y+2;camera.updateProjectionMatrix();
  uniforms.paintShadowMatrix.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1)
    .multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
  const depth=new THREE.ShaderMaterial({side:THREE.DoubleSide,
    vertexShader:`attribute float paintKind;varying float kind;varying vec2 leafUV;
      void main(){kind=paintKind;leafUV=uv;vec4 p=vec4(position,1.);
        #ifdef USE_INSTANCING
        p=instanceMatrix*p;
        #endif
        gl_Position=projectionMatrix*modelViewMatrix*p;}`,
    fragmentShader:`varying float kind;varying vec2 leafUV;void main(){
      if((abs(kind-83.)<.5||abs(kind-91.)<.5||abs(kind-94.)<.5)&&abs(leafUV.x-.5)>.43)discard;
      gl_FragColor=vec4(1.);}`});
  const casters=new THREE.Scene(),sources=new Map((engine.registry.paint.culling??[]).filter(g=>!g.reflection).flatMap(g=>g.meshes.map(r=>[r.mesh,r.source])));
  engine.scene.updateMatrixWorld(true);
  engine.scene.traverse(o=>{
    if(!o.isMesh||o.userData.paintView!==undefined||!['stone','plaster','timber','roof','bark','leaf'].some(k=>o.material?.name==='gouache-'+k))return;
    const copy=o.clone(false);copy.geometry=sources.get(o)??o.geometry;copy.material=depth;
    copy.matrix.copy(o.matrixWorld);copy.matrixAutoUpdate=false;copy.frustumCulled=true;copy.visible=true;
    // No main-scene callbacks or wind in this one-off, static depth bake.
    copy.onBeforeRender=()=>{};copy.userData.structureCaster=!['bark','leaf'].some(k=>o.material?.name==='gouache-'+k);casters.add(copy);
  });
  const r=engine.renderer,saved=r.getRenderTarget(),color=r.getClearColor(new THREE.Color()),alpha=r.getClearAlpha();
  const autoReset=r.info.autoReset;r.info.autoReset=true;
  let structureCalls,structureTriangles;
  try{
    r.setRenderTarget(target);r.setClearColor(0xffffff,1);r.clear();r.render(casters,camera);r.readRenderTargetPixels(target,0,0,1,1,new Uint8Array(4));
    const calls=r.info.render.calls,triangles=r.info.render.triangles;
    for(const o of casters.children)o.visible=o.userData.structureCaster;
    r.setRenderTarget(structureTarget);r.clear();r.render(casters,camera);r.readRenderTargetPixels(structureTarget,0,0,1,1,new Uint8Array(4));
    structureCalls=r.info.render.calls;structureTriangles=r.info.render.triangles;
    time.sunlight.calls=calls;time.sunlight.triangles=triangles;
  }
  finally{r.setRenderTarget(saved);r.setClearColor(color,alpha);r.info.autoReset=autoReset;depth.dispose();}
  Object.assign(time.sunlight,{camera,bakeMs:performance.now()-start,structureCalls,structureTriangles,
    bounds:xuande?{x:[-115,115],z:[-115,88]}:{x:[-55,95],z:[-80,50]},mapSize:4096,direction:direction.toArray()});
  console.log('[paint sunlight]',JSON.stringify({ms:time.sunlight.bakeMs,calls:time.sunlight.calls,triangles:time.sunlight.triangles,structureCalls,structureTriangles}));
}

// Reuse the pipeline's opaque depth, half-resolution AO target and bilateral
// accumulation. No normal/depth prepass or core-file changes.
// inferred: 0.16/0.60 m radii, violet tint and the 20–55 m fade keep contact
// shade local; distance geometry does not acquire depth-reconstruction stripes.
export function installContactAO(engine,time,{profile='zhouqiao'}={}){
  const p=engine.pipeline,u=p.aoMat.uniforms;
  u.paintCameraWorld={value:new THREE.Matrix4()};
  p.aoMat.fragmentShader=p.aoMat.fragmentShader
    .replace('varying vec2 vUv;','varying vec2 vUv; uniform mat4 paintCameraWorld;')
    .replace('float phase = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uFrame * 0.618033989);',
      'vec3 world=(paintCameraWorld*vec4(p,1.)).xyz; float phase=fract(dot(world,vec3(.071,.039,.053)));')
    .replace('0.55 : 2.4','0.16 : 0.60')
    .replace('smoothstep(250.0, 900.0, -p.z)','smoothstep(20.0, 55.0, -p.z)');
  p.aoMat.needsUpdate=true;
  const originalAO=p._ao.bind(p);
  p._ao=camera=>{u.paintCameraWorld.value.copy(camera.matrixWorld);
    if(profile==='xuande')p.copyMat.uniforms.paintClipToWorld.value.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse);
    return originalAO(camera);};
  p.copyMat.fragmentShader=p.copyMat.fragmentShader.replace('n.rgb *= 1.0 - uAO * (ws > 1e-5 ? sum / ws : 0.0);',
    'n.rgb *= mix(vec3(1.),vec3(.43,.40,.60),uAO*(ws > 1e-5 ? sum / ws : 0.0));');
  if(profile==='xuande'){
    // Same contact pass, extended to this scene's hall distance. Exclude the
    // accepted canal plane from accumulation tint; its material stays legacy.
    p.aoMat.fragmentShader=p.aoMat.fragmentShader.replace('smoothstep(20.0, 55.0, -p.z)','smoothstep(70.0, 115.0, -p.z)');
    p.copyMat.uniforms.paintClipToWorld={value:new THREE.Matrix4()};
    p.copyMat.fragmentShader=p.copyMat.fragmentShader.replace('varying vec2 vUv;','varying vec2 vUv; uniform mat4 paintClipToWorld;')
      .replace('n.rgb *= mix(vec3(1.),vec3(.43,.40,.60),uAO*(ws > 1e-5 ? sum / ws : 0.0));',
        `vec4 wp=paintClipToWorld*vec4(vUv*2.-1.,d*2.-1.,1.);vec3 world=wp.xyz/wp.w;
        float contact=world.x> -28.5&&world.x< -14.4&&world.z> -2.&&world.z<85.&&abs(world.y)<.08?0.:1.;
        n.rgb*=mix(vec3(1.),vec3(.43,.40,.60),contact*uAO*(ws>1e-5?sum/ws:0.));`);
  }
  p.copyMat.needsUpdate=true;
  time.contactAO=true;
}
