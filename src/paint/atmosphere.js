import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { BRUSH } from './materials.js';
import { BOAT, QUAY, BRIDGE } from './composition.js';

// inferred: finite curved cyclorama, horizon height and colour wash compose bd1
// with this river. Its ends are beyond both sides of the entire camera path.
export async function paintedSky(engine,{shiftU=0,backdrop='bd1',heightOffset=0,arc=1.7}={}) {
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
  // inferred: add strips beyond the old arc without retessellating its centre.
  const extra=Math.ceil(Math.max(0,arc-1.7)/(3.4/segments));
  for (let i = -extra; i <= segments+extra; i++) {
    const u = i / segments * 2 - .5, angle = (u - .5) * 1.7;
    for (const [v,textureV] of rows) {
      p.push(3 + Math.sin(angle) * 240, -111 + heightOffset + v * 230, 10 - Math.cos(angle) * 240);
      uv.push(u, textureV);
    }
    if(i>-extra)for(let j=0;j<rows.length-1;j++){
      const a=(i+extra)*rows.length+j,b=a-rows.length;
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
      tDiffuse: { value: null }, reflectionTexel:{value:new THREE.Vector2(1/width,1/height)}, paintTime: time,
      paintView:time.viewIndex??{value:0},
      markAcross:{value:new THREE.Vector2(1,0)},markDepth:{value:new THREE.Vector2(0,1)},markOffset:{value:new THREE.Vector2()} },
    vertexShader: `uniform mat4 textureMatrix; varying vec3 vP;
      void main(){vP=(modelMatrix*vec4(position,1.0)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */`
      varying vec3 vP; uniform float paintTime,paintView; uniform mat4 textureMatrix;
      uniform sampler2D tDiffuse; uniform vec2 reflectionTexel,markAcross,markDepth,markOffset; ${BRUSH}
      // inferred: irregular dash lengths, widths and gaps avoid evenly ruled
      // rows; all high-frequency marks fade before becoming subpixel.
      float waterDash(vec2 q){
        q.y+=(noise(q*vec2(.27,.11)+11.)-.5)*.72;
        vec2 footprint=fwidth(q),aa=max(footprint*.55,vec2(.025));
        if(paintView>4.5&&paintView<5.5)aa=max(footprint*.9,vec2(.075));
        q.x+=hash21(vec2(floor(q.y),17.))*.93;
        vec2 id=floor(q),f=fract(q)-.5;float h=hash21(id);
        f-=vec2(hash21(id+17.)-.5,hash21(id+31.)-.5)*.22;
        vec2 halfSize=vec2(mix(.16,.46,h),mix(.15,.39,hash21(id+8.)));
        float mark=(1.-smoothstep(halfSize.x-aa.x,halfSize.x+aa.x,abs(f.x)))
                  *(1.-smoothstep(halfSize.y-aa.y,halfSize.y+aa.y,abs(f.y)));
        return mark*(.45+.55*hash21(id+53.))*smoothstep(.12,.30,h)*(1.-smoothstep(1.2,2.5,max(footprint.x,footprint.y)));
      }
      vec2 mirrorUV(vec2 p){
        vec4 projected=textureMatrix*vec4(p.x-(${bounds?((bounds[0]+bounds[2])/2).toFixed(6):'0.'}),-(p.y-${bounds?((bounds[1]+bounds[3])/2).toFixed(6):'0.'}),0.,1.);
        return clamp(projected.xy/projected.w,reflectionTexel*1.5,vec2(1.)-reflectionTexel*1.5);
      }
      void main(){
        vec2 p=vP.xz;
        // inferred: only brush marks use the authored view's river frame.
        // Boat cutout, bank shade and mirror projection stay in world space.
        vec2 marks=vec2(dot(p,markAcross),dot(p,markDepth))+markOffset;
        vec2 boat=p-vec2(${BOAT.position[0].toFixed(6)},${BOAT.position[2].toFixed(6)});
        float along=(boat.x*${Math.cos(BOAT.yaw).toFixed(6)}-boat.y*${Math.sin(BOAT.yaw).toFixed(6)})/${(BOAT.length/2).toFixed(6)};
        float across=boat.x*${Math.sin(BOAT.yaw).toFixed(6)}+boat.y*${Math.cos(BOAT.yaw).toFixed(6)};
        ${river?`if(abs(along)<.99&&abs(across)<${(BOAT.width/2).toFixed(6)}*(1.-.72*pow(abs(along),3.))*.688-.025)discard;`:''}
        ${river?`
        // inferred: three layers of roughly 15:1–25:1 apparent dashes sit on the actual water
        // plane. Their slow advection and derivative footprint keep them calm.
        float front=smoothstep(-20.,14.,marks.y);
        vec2 drift=marks+vec2(paintTime*.018,paintTime*.006);
        // inferred: integrate a depth-frequency ramp to compensate for
        // foreshortening. Far marks remain small resolved dashes, not lines
        // thinner than a pixel; the phase never jumps between depth bands.
        float depth=clamp((drift.y+28.)/44.,0.,1.);
        float phase=2.5*drift.y+9.5*(44.*(pow(depth,3.)-.5*pow(depth,4.))+max(drift.y-16.,0.));
        // inferred: broader depth spacing makes the corridor's sky marks
        // soft dabs rather than single-pixel horizontal ticks.
        if(paintView>4.5&&paintView<5.5)phase*=.45;
        vec3 dashes=vec3(waterDash(vec2(drift.x*1.2,phase)+vec2(3.1,1.7)),
                         waterDash(vec2(drift.x*2.3,phase*2.)+vec2(9.7,4.2)),
                         waterDash(vec2(drift.x*.62,phase*.55)+vec2(1.4,8.9)));
        float ripple=noise(marks*vec2(1.4,12.)+vec2(paintTime*.024,0.))-.5;
        float rippleFine=noise(marks*vec2(3.2,25.)+7.)-.5;
        vec2 shifted=p+vec2(ripple*.36+(dashes.y-.25)*.22,rippleFine*.035)*${distortion.toFixed(6)};
        // inferred: short overlapping depth offsets break reflected deck/sky
        // boundaries into dashes. Grazing views need the greatest displacement;
        // the approved pigment balance, blur and mirror gain remain unchanged.
        float grazing=1.-abs(normalize(cameraPosition-vP).y);
        float verticalStroke=(dashes.x-.25)*1.4+(dashes.z-.25)*.8;
        shifted.y+=verticalStroke*mix(.18,1.6,grazing*grazing);
        if(paintView>4.5&&paintView<5.5){
          // inferred: a narrow view-aligned mirror smear preserves the shafts'
          // dark reflections, while the accepted horizontal mark field stays.
          shifted=p+markAcross*(ripple*.07+(dashes.y-.25)*.03)-markDepth*(rippleFine*.016+verticalStroke*.10);
        }
        vec2 reflectedUV=mirrorUV(shifted);
        // inferred: smear along depth, keeping adjacent shafts horizontally
        // distinct. D3's narrow blur keeps the bright reflection columns.
        float reach=mix(.60,.40,front);
        vec2 smear=vec2(0.,reach);
        if(paintView>4.5&&paintView<5.5)smear=-markDepth*.10;
        vec3 reflected;
        if(paintView>4.5&&paintView<5.5){
          // inferred: filter the reflection's vertical pixel footprint as
          // well as its world-space marks, so thin sky slits become dabs.
          vec2 strokeStep=vec2(0.,reflectionTexel.y*1.5);
          reflected=texture2D(tDiffuse,reflectedUV).rgb*.26;
          reflected+=(texture2D(tDiffuse,reflectedUV+strokeStep).rgb+texture2D(tDiffuse,reflectedUV-strokeStep).rgb)*.20;
          reflected+=(texture2D(tDiffuse,reflectedUV+strokeStep*2.).rgb+texture2D(tDiffuse,reflectedUV-strokeStep*2.).rgb)*.12;
          reflected+=(texture2D(tDiffuse,reflectedUV+strokeStep*3.).rgb+texture2D(tDiffuse,reflectedUV-strokeStep*3.).rgb)*.05;
        }else{
          reflected=texture2D(tDiffuse,reflectedUV).rgb*.72;
          reflected+=(texture2D(tDiffuse,mirrorUV(shifted+smear)).rgb+texture2D(tDiffuse,mirrorUV(shifted-smear)).rgb)*.14;
        }
        // inferred: recover bright cream/gold after the narrow vertical
        // filter, scaling the reflected colour without shifting its hue.
        float highlight=smoothstep(.18,.45,dot(reflected,vec3(.2126,.7152,.0722)));
        reflected*=1.+highlight*.20;
        // D4b: D3's body, mirror strength and pigment balance are restored.
        // The retained fine dashes only offset sampling and modulate value.
        float colourDepth=clamp((marks.y+20.)/34.,0.,1.);
        float colourPhase=1.8*marks.y+10.2*(34.*(pow(colourDepth,3.)-.5*pow(colourDepth,4.))+max(marks.y-14.,0.));
        if(paintView>4.5&&paintView<5.5)colourPhase*=.50;
        vec2 q=vec2(marks.x*mix(.18,1.15,front),colourPhase);
        q.x+=noise(marks*.21)*1.9*front;
        q.y+=noise(marks*vec2(.36,1.1))*.8+sin(marks.x*.6+paintTime*.55)*.15;
        float footprint=max(length(dFdx(q)),length(dFdy(q)));
        float broad=mix(.5,noise(q),1.-smoothstep(.65,1.75,footprint));
        float fine=mix(.5,noise(q*vec2(2.4,2.1)+17.),1.-smoothstep(.5,1.5,footprint*2.4));
        float strokes=smoothstep(.36,.68,broad*.75+fine*.25);
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
        if(paintView>4.5&&paintView<5.5)body=linearColor(vec3(.27,.365,.35))*(.94+.12*noise(p*.18));
        float skyOpening=smoothstep(.008,.13,reflected.b-reflected.r);
        // Actual blue/cream sky exposed in the two open tower passages caused
        // the teal-white patches after the former tint. Neutralise its chroma.
        reflected=mix(reflected,body,skyOpening*(paintView>4.5&&paintView<5.5?.10:.78));
        float warmStone=smoothstep(.01,.07,reflected.r-reflected.b)*(1.-smoothstep(1.25,1.65,reflected.r/max(.001,reflected.g)));
        reflected=mix(reflected,linearColor(vec3(.64,.59,.46)),warmStone*(paintView>4.5&&paintView<5.5?.02:.16));
        float warmReflection=smoothstep(.05,.26,reflected.r-reflected.b);
        reflected*=mix(vec3(1.),vec3(1.18,1.04,.82),warmReflection*.25);
        if(paintView>4.5&&paintView<5.5){
          float pale=smoothstep(.17,.42,dot(reflected,vec3(.2126,.7152,.0722)));
          reflected=mix(reflected,linearColor(vec3(.46,.50,.49)),pale*.65);
        }
        if(paintView>3.5&&paintView<4.5){
          // inferred: the far-bank mirror keeps dark trees, while pale cloud
          // shapes yield to quiet water instead of reading as offshore waves.
          float sky=smoothstep(.18,.48,dot(reflected,vec3(.2126,.7152,.0722)));
          reflected=mix(reflected,body*1.13,sky*.80);
        }
        float calm=${river?'1.-smoothstep(-14.,-2.,p.y)':'0.'};
        float mirror=${river?'mix((.46+.22*strokes)*(1.-smoothstep(1.,18.,p.y)*.55),.86,calm)':'.40+.20*strokes'};
        ${river?'mirror=mix(mirror,.36,beyondBridge);':''}
        if(paintView>4.5&&paintView<5.5)mirror=.86;
        vec3 c=mix(body,reflected,mirror);
        c+=linearColor(vec3(.68,.65,.50))*(1.-strokes)*mix(.055,.015,calm);
        float glint=smoothstep(.74,.94,fine)*smoothstep(.45,.74,noise(marks*vec2(.37,3.7)+8.));
        c+=linearColor(vec3(.73,.75,.62))*glint*(paintView>4.5&&paintView<5.5?.004:mix(.055,.015,calm));
        // inferred: independent horizontal pigment loads follow the same
        // depth-scaled river coordinates as the reflection strokes.
        c=brokenColor(c,q,${river?'vec2(.70,.45),mix(mix(2.8,.75,front),.12,calm)':'vec2(.35,.25),2.8'},vec3(1.40,1.08,.55),vec3(.60,1.02,1.50),vec3(.72,1.12,1.08),vec3(1.35,1.10,.68));
        ${river?'c*=1.+pigmentDab(q*vec2(.8,.55)+5.)*mix(mix(1.4,.05,front),.06,calm);':''}
        // inferred: centered, hue-preserving modulation is bounded to ±12%.
        // There is no separate teal stroke colour covering the reflection.
        float mark=clamp((dashes.x-.25)*.9+(dashes.y-.25)*.7+(dashes.z-.25)*.4,-1.,1.);
        c*=1.+mark*(paintView>4.5&&paintView<5.5?.055:.12);
        if(paintView>4.5&&paintView<5.5){
          // inferred: the bank's warm opening lays a quiet path along the
          // corridor, subordinate to the actual dark column reflections.
          float cross=p.y-(${BRIDGE.skew})*p.x-(${BRIDGE.offset})+19.75;
          float path=exp(-pow(cross/1.25,2.))*smoothstep(-18.,30.,p.x);
          // inferred: broad low-contrast sky pigment sits over the mirror,
          // concentrated near the openings; shafts remain visible through it.
          float opening=smoothstep(1.,3.4,abs(cross));
          float skyDab=smoothstep(.10,.55,dashes.z*.8+dashes.x*.35);
          c=mix(c,linearColor(vec3(.48,.54,.52)),skyDab*(.05+.15*opening));
          c+=linearColor(vec3(.78,.67,.43))*path*(.075+.065*strokes);
        }
        float bankEdge=(${QUAY.intercept.toFixed(6)})+p.y*${QUAY.slope.toFixed(6)};
        float bankShade=exp(-max(0.,p.x-bankEdge)*.8)*smoothstep(-13.,0.,p.y);
        float hullHalf=${(BOAT.width*.5).toFixed(6)}*(1.-.72*pow(min(abs(along),1.),3.))*.70;
        float boatShade=exp(-pow(abs(along)/1.04,8.))*exp(-pow(abs(across)/(hullHalf+.24),4.));
        float hullSmear=exp(-pow(abs(along)/1.08,8.))*exp(-pow(abs(across-.24)/(hullHalf+.55),4.));
        ${river?`c=mix(c,linearColor(vec3(.39,.30,.19)),hullSmear*.24*(.35+dashes.x));
        c=mix(c,c*vec3(.32,.46,.44),max(bankShade*.62,boatShade*.80));`:''}
        `:`
        // inferred: three layers of roughly 15:1–25:1 apparent dashes sit on the actual water
        // plane. Their slow advection and derivative footprint keep them calm.
        float front=smoothstep(-28.,16.,p.y);
        vec2 drift=p+vec2(paintTime*.018,paintTime*.006);
        // inferred: integrate a depth-frequency ramp to compensate for
        // foreshortening. Far marks remain small resolved dashes, not lines
        // thinner than a pixel; the phase never jumps between depth bands.
        float depth=clamp((drift.y+28.)/44.,0.,1.);
        float phase=2.5*drift.y+9.5*(44.*(pow(depth,3.)-.5*pow(depth,4.))+max(drift.y-16.,0.));
        vec3 dashes=vec3(waterDash(vec2(drift.x*1.2,phase)+vec2(3.1,1.7)),
                         waterDash(vec2(drift.x*2.3,phase*2.)+vec2(9.7,4.2)),
                         waterDash(vec2(drift.x*.62,phase*.55)+vec2(1.4,8.9)));
        float ripple=noise(p*vec2(1.4,12.)+vec2(paintTime*.024,0.))-.5;
        float rippleFine=noise(p*vec2(3.2,25.)+7.)-.5;
        vec2 shifted=p+vec2(ripple*.36+(dashes.y-.25)*.22,rippleFine*.035)*${distortion.toFixed(6)};
        vec2 reflectedUV=mirrorUV(shifted);
        // inferred: smear along depth, keeping adjacent shafts horizontally
        // distinct. Five filtered samples also hold at the half-size rung.
        float reach=${river?'mix(.75,2.4,front)':'mix(.25,.60,front)'};
        vec3 reflected=texture2D(tDiffuse,reflectedUV).rgb*.32;
        reflected+=(texture2D(tDiffuse,mirrorUV(shifted+vec2(0.,reach))).rgb+texture2D(tDiffuse,mirrorUV(shifted-vec2(0.,reach))).rgb)*.23;
        reflected+=(texture2D(tDiffuse,mirrorUV(shifted+vec2(0.,reach*2.2))).rgb+texture2D(tDiffuse,mirrorUV(shifted-vec2(0.,reach*2.2))).rgb)*.11;
        vec3 deep=linearColor(vec3(.184,.435,.400)),jade=linearColor(vec3(.57,.67,.55));
        vec3 body=mix(jade,deep,mix(.35,.88,front));
        body*=.94+.12*noise(p*vec2(.21,.35));
        float reflectedLuma=dot(reflected,vec3(.2126,.7152,.0722));
        reflected=mix(vec3(reflectedLuma),reflected,.70)*.68;
        float skyOpening=smoothstep(.008,.13,reflected.b-reflected.r);
        reflected=mix(reflected,body,skyOpening*.80);
        // Pale horizontal masonry yields to water pigment, rather than making
        // a second bright bridge. Vertical warm/dark columns remain distinct.
        float pale=smoothstep(.34,.65,reflectedLuma);
        float mirror=${river?'mix(.42,.25,front)':'.62'}*(1.-pale*.35);
        float warmColumn=smoothstep(.025,.15,reflected.r-reflected.b);
        mirror+=warmColumn*${river?'.16':'.05'};
        vec3 c=mix(body,reflected*mix(1.,1.32,warmColumn),mirror);
        c=mix(c,deep*.80,dashes.x*.30);
        c=mix(c,linearColor(vec3(.663,.796,.710)),dashes.y*mix(.46,.58,front));
        c=mix(c,linearColor(mix(vec3(.43,.65,.55),vec3(.65,.65,.47),warmColumn)),dashes.z*.30);
        float waterLuma=dot(c,vec3(.2126,.7152,.0722));c=max(vec3(0.),mix(vec3(waterLuma),c,1.16));
        float bankEdge=(${QUAY.intercept.toFixed(6)})+p.y*${QUAY.slope.toFixed(6)};
        float bankShade=exp(-max(0.,p.x-bankEdge)*.8)*smoothstep(-13.,0.,p.y);
        float hullHalf=${(BOAT.width*.5).toFixed(6)}*(1.-.72*pow(min(abs(along),1.),3.))*.70;
        float boatShade=exp(-pow(abs(along)/1.04,8.))*exp(-pow(abs(across)/(hullHalf+.24),4.));
        float hullSmear=exp(-pow(abs(along)/1.08,8.))*exp(-pow(abs(across-.24)/(hullHalf+.55),4.));
        ${river?`c=mix(c,linearColor(vec3(.39,.30,.19)),hullSmear*.24*(.35+dashes.x));
        c=mix(c,c*vec3(.32,.46,.44),max(bankShade*.62,boatShade*.80));`:''}
        `}
        gl_FragColor=vec4(c,1.0);
      }`,
  };
  const water = new Reflector(new THREE.PlaneGeometry(bounds?bounds[2]-bounds[0]:300,bounds?bounds[3]-bounds[1]:250), {
    shader, textureWidth: width, textureHeight: height, multisample: 4, clipBias: .002,
  });
  water.rotation.x = -Math.PI / 2;
  if(bounds)water.position.set((bounds[0]+bounds[2])/2,0,(bounds[1]+bounds[3])/2);
  water.material.uniforms.paintTime = time;
  // Reflector clones its shader uniforms; keep view selection shared just
  // like the animation clock, so per-view marks and mirror treatment run.
  water.material.uniforms.paintView = time.viewIndex??{value:0};
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
