import * as THREE from 'three';
import {BRIDGE,BOAT,MOORING,CAMERA} from './composition.js';
import {ZHOU_SUN,SUNLIGHT_GLSL} from './sunlight.js';
import {MARK_SAMPLE_GLSL} from './marks.js';
import {PAINTED_STONE_GLSL} from './stonework.js';
import {ROOF_DETAIL_GLSL,TIMBER_DETAIL_GLSL,WALL_DETAIL_GLSL} from './tower-detail.js';

const MATH=/* glsl */`
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}
vec3 linearColor(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec2 planeUV(vec3 p,vec3 n){return abs(n.y)>.65?p.xz:vec2(abs(n.x)>.65?p.z:p.x,p.y);}
float lineCut(float phase,float width){float e=min(fract(phase),1.-fract(phase));float aa=max(.001,fwidth(phase));return 1.-smoothstep(width-aa,width+aa,e);}
`;

// inferred: the W2/W2b palette, directional coordinates, wear and shade-pool
// footprint compose c2. The accepted W1 sun/depth map and geometry are reused.
export function strokeMaterial(time,kind,{reflection=false,bank=false}={}){
  time.windTime??={value:new THREE.Vector4(0,1,0,1)};
  const mat=new THREE.ShaderMaterial({name:'gouache-'+kind,vertexColors:true,side:THREE.DoubleSide,
    uniforms:{paintTime:time,paintView:time.viewIndex,paintWindTime:time.windTime,paintSun:{value:ZHOU_SUN.clone()},...time.sunlight.uniforms,...time.marks.uniforms},
    vertexShader:`uniform float paintView;uniform vec4 paintWindTime;attribute vec4 paintWind,paintDetail;attribute vec3 paintData;attribute float paintKind;
      varying vec3 vP,vN,vC,vData;varying vec2 vUv;varying float vKind;varying vec4 vDetail;
      void main(){vec3 basePosition=position;
        ${kind==='roof'&&!reflection?`if(paintView<3.5||paintView>5.5){
          if(abs(paintKind-57.)<.5&&paintDetail.w>1.5)basePosition+=paintDetail.xyz;
          #ifdef USE_INSTANCING
          // inferred: enlarge the existing drip ends 1.6x for view-2 legibility.
          if(abs(paintKind-51.)<.5&&paintDetail.z>1.5)basePosition.xy*=1.6;
          #endif
        }`:''}
        vec3 p=basePosition;p.x+=dot(paintWind.xy,paintWindTime.xy);p.z+=dot(paintWind.zw,paintWindTime.zw);
        vec4 surface=vec4(basePosition,1.),moved=vec4(p,1.);vec3 localNormal=normal;
        #ifdef USE_INSTANCING
        surface=instanceMatrix*surface;moved=instanceMatrix*moved;mat3 basis=mat3(instanceMatrix);
        localNormal/=vec3(dot(basis[0],basis[0]),dot(basis[1],basis[1]),dot(basis[2],basis[2]));localNormal=basis*localNormal;
        #endif
        ${kind==='bark'?`if(paintView>.5){if(paintData.z>.5){vec3 eye=vec3(${CAMERA.pos.join(',')});surface.xyz=eye+(surface.xyz-eye)*1.13;moved.xyz=eye+(moved.xyz-eye)*1.13;}if(paintView>3.5&&paintView<4.5&&paintData.z<-.5)moved.xyz=vec3(0.,-1000.,0.);}`:''}
        vP=(modelMatrix*surface).xyz;vN=normalize(mat3(modelMatrix)*localNormal);vC=color;
        #ifdef USE_INSTANCING_COLOR
        vC*=instanceColor;
        #endif
        vData=paintData;vKind=paintKind;vUv=uv;vDetail=paintDetail;gl_Position=projectionMatrix*modelViewMatrix*moved;}`,
    fragmentShader:/* glsl */`
      uniform vec3 paintSun;uniform float paintTime,paintView;
      varying vec3 vP,vN,vC,vData;varying vec2 vUv;varying float vKind;varying vec4 vDetail;
      ${MATH}
      ${SUNLIGHT_GLSL}
      ${MARK_SAMPLE_GLSL}
      // Accepted views 5/6 and the accepted water reflection retain W2b.
      bool towerDetailView(){return ${reflection?'false':'paintView<3.5||paintView>5.5'};}
      ${kind==='plaster'?PAINTED_STONE_GLSL+WALL_DETAIL_GLSL:kind==='timber'?TIMBER_DETAIL_GLSL:kind==='roof'?ROOF_DETAIL_GLSL:''}
      vec2 boatUV(vec3 p){vec2 q=p.xz-vec2(${BOAT.position[0]},${BOAT.position[2]});return mat2(${Math.cos(BOAT.yaw)},${Math.sin(BOAT.yaw)},${-Math.sin(BOAT.yaw)},${Math.cos(BOAT.yaw)})*q;}
      bool boatPart(){return abs(vKind-9.)<.5||abs(vKind-77.)<.5||abs(vKind-78.)<.5;}
      float groveShade(vec3 p,float load){
        // inferred: a larger static shade footprint under the existing hero
        // willow, with discrete pools of light cut by the mark centres.
        if(paintView<2.5){
          // inferred: several elongated leaf scales soften only the near
          // quay's old square shadow edge; the accepted deck stays intact.
          p=vP;vec2 q=mat2(.90,-.35,.35,.90)*p.xz;
          float field=noise(q*vec2(.48,1.10))*.60+noise(q*vec2(1.15,2.8)+9.)*.27+noise(q*vec2(2.5,6.0)+13.)*.13;
          field+=(texture2D(paintMarks,q*vec2(1.6,5.4)/64.).r-.5)*.07;
          float cover=1.-smoothstep(.80,1.25,length((p.xz-vec2(-7.5,9.))/vec2(12.,14.)));
          return mix(1.,mix(.025,1.,smoothstep(.535,.605,field)),cover);
        }
        float cover=1.-smoothstep(.80,1.25,length((p.xz-vec2(-7.5,9.))/vec2(12.,14.)));
        float gap=step(.61,noise(p.xz*.68)+noise(p.xz*1.7+9.)*.16+(load-.5)*.10);
        return mix(1.,mix(.025,1.,gap),cover);
      }
      vec2 coordinates(vec3 n){
        ${kind==='bark'?`return vUv*vec2(1.,.23);`:kind==='plaster'?`return planeUV(vP,n)*vec2(1.,.45);`:kind==='roof'?`return (abs(vKind-50.)<.5?vUv:planeUV(vP,n))*vec2(.32,1.);`:kind==='timber'?`
        if(boatPart()){vec2 local=boatUV(vP);if(abs(n.y)>.65)return abs(vKind-78.)<.5?local.yx*vec2(.22,1.):local*vec2(.18,1.);return vec2(local.x*.18,vP.y);}
        if(abs(vKind-33.)<.5||abs(vKind-47.)<.5)return vUv*vec2(1.,.23);
        return planeUV(vP,n)*vec2(.30,1.);`:`
        bool paving=(abs(vKind-70.)<.5)||(abs(vKind-62.)<.5&&n.y>.65);
        return planeUV(vP,n)*(paving?vec2(.80,1.):vec2(.32,1.));`}
      }
      vec3 shadeMark(PaintMark m){
        vec3 p=m.p,n=m.n,c;float light;
        ${kind==='bark'?`p=vP;n=normalize(vN);if(!gl_FrontFacing)n=-n;`:kind==='timber'?`if(boatPart()){p=vP;n=normalize(vN);if(!gl_FrontFacing)n=-n;}`:kind==='stone'?`if(abs(vKind-70.)<.5&&paintView<2.5){p=vP;n=normalize(vN);}`:''}
        ${kind==='stone'?`
        if(paintView>4.5&&paintView<5.5&&(abs(vKind-92.)<.5||(abs(vKind-61.)<.5&&n.y<-.4))){
          vec2 q=vec2(p.x,p.z-(${BRIDGE.skew})*p.x);float openings=smoothstep(.5,2.8,abs(q.y+25.3)),farLight=smoothstep(-12.,34.,p.x);
          float ribbon=.5+.5*sin(q.x*.50+q.y*1.45+sin(q.x*.27-q.y*.48)*1.2+paintTime*.24);ribbon=ribbon*ribbon*(3.-2.*ribbon);
          c=linearColor(vec3(.255,.25,.305));c+=linearColor(vec3(.65,.49,.30))*(.025+ribbon*(.07+.23*farLight+.16*openings));
          if(abs(vKind-92.)<.5)c*=n.y<-.4?.86:1.13;return c*(.95+.10*m.load);
        }
        if(paintView>4.5&&paintView<5.5&&(abs(vKind-52.)<.5||abs(vKind-37.)<.5)){
          float cross=p.z-(${BRIDGE.skew})*p.x-(${BRIDGE.offset})+19.75;
          float daylight=smoothstep(-.15,.85,dot(n,normalize(vec3(.15,0.,1.)))*sign(cross));
          daylight=floor(daylight*10.+m.pick)/10.;
          c=mix(linearColor(vec3(.385,.35,.365)),linearColor(vec3(.51,.455,.385)),daylight*.72);
          float y=p.y-(${BRIDGE.fall})*p.x,top=2.95+.18*max(0.,1.-pow(p.x/30.,2.));c*=1.-smoothstep(top-.75,top-.05,y)*.22;
          float bounce=1.-smoothstep(.03,1.30,p.y);c=mix(c,linearColor(vec3(.45,.375,.285)),bounce*.24);c+=linearColor(vec3(.58,.44,.29))*bounce*.055;
          c=mix(c,linearColor(vec3(.52,.435,.33)),smoothstep(2.95,3.22,abs(cross))*(.20+.45*(1.-smoothstep(-8.,22.,p.x))));
          c=mix(c,linearColor(vec3(.22,.25,.23)),(1.-smoothstep(.02,.28,p.y))*.7);
          ${reflection?'c*=.52;':''}return c*(.82+.36*m.load);
        }
        if(abs(vKind-95.)<.5||(${bank?'true':'false'}&&(abs(vKind-96.)<.5||abs(vKind-98.)<.5))){
          light=markLight(max(dot(n,paintSun),0.),m.pick);
          if(abs(vKind-98.)<.5){
            // inferred: quiet soft dabs on the far rounded crowns only.
            float dab=noise(planeUV(vP,normalize(vN))*vec2(2.1,3.4));
            return vC*mix(vec3(.53,.65,.60),vec3(1.1,1.06,.82),light)*(.965+.07*dab);
          }
          return vC*mix(vec3(.53,.65,.60),vec3(1.1,1.06,.82),light)*(.88+.24*m.load);
        }
        `:''}
        float shadow=${kind==='plaster'||kind==='timber'?'structureShadeAt(p,n,vP)':'castShadeAt(p,n,vP)'},sun=max(dot(n,paintSun),0.)*shadow;
        ${kind==='stone'?`if(abs(vKind-70.)<.5)sun*=groveShade(p,m.pick);`:kind==='timber'?`if(boatPart()){
          // inferred: sunlight occupies most of the berth; a separate,
          // broader dapple field no longer swallows the boat in quay shade.
          vec2 q=boatUV(vP);float pool=noise(q*vec2(.45,.8))+noise(q*vec2(1.1,2.)+7.)*.16;
          sun*=mix(.08,1.,smoothstep(.50,.67,pool));
        }`:''}
        light=markLight(sun,m.pick);
        ${kind==='plaster'?`light=clamp((max(dot(n,paintSun),0.)+.22)*1.55,0.,1.)*shadow;`:''}
        ${kind==='stone'?`if(abs(vKind-70.)<.5&&paintView<2.5)light=clamp(sun*1.45,0.,1.);`:kind==='bark'||kind==='timber'?'light=clamp(sun*1.45,0.,1.);':''}
        ${kind==='stone'?`
          bool paving=abs(vKind-70.)<.5||(abs(vKind-62.)<.5&&n.y>.65);
          vec2 blockQ=planeUV(p,n),size=abs(vKind-52.)<.5?vec2(1.2,.64):abs(vKind-65.)<.5?vec2(2.4,.72):vec2(1.4,.65);
          float row=floor(blockQ.y/size.y);float h=hash21(floor(blockQ/size+vec2(mod(row,2.)*.5,0.)));
          vec3 pigment=vC*mix(vec3(.91,.94,1.12),vec3(1.05,1.00,.90),h);
          c=stoneLight(pigment,n,light/1.45,abs(vKind-52.)<.5?1.:0.,abs(vKind-74.)<.5?1.:0.);
          if(paving){
            vec3 shade=linearColor(vec3(.435,.43,.485));
            if(abs(vKind-70.)<.5&&paintView<2.5){
              // inferred: quiet warm reflected-light strokes within the
              // violet shade, preserving the brief's near-grey median.
              shade=mix(linearColor(vec3(.43,.425,.48)),linearColor(vec3(.55,.46,.43)),smoothstep(.62,.95,m.pick)*.35);
            }
            c=mix(shade,linearColor(vec3(.82,.67,.55)),light);
          }
          float damp=1.-smoothstep(.04,.48+(m.pick-.5)*.18,p.y);
          if(abs(vKind-52.)<.5||abs(vKind-65.)<.5||abs(vKind-74.)<.5)c=mix(c,linearColor(m.pick>.69?vec3(.22,.28,.15):vec3(.22,.25,.23)),damp*.83);
          if(abs(vKind-75.)<.5){float base=1.-smoothstep(${MOORING.position[1]+.05},${MOORING.position[1]+.65},p.y);c*=mix(1.,.55,base);if(m.load<.22)c*=.68;}
          if(abs(vKind-56.)<.5)c*=.55;
          if(abs(vKind-54.)<.5)c*=.86;
        `:kind==='plaster'?`
          c=mix(linearColor(vec3(.535,.445,.405)),linearColor(vec3(.97,.81,.61)),light);
          if(vKind<10.5||abs(vKind-103.)<.5)c=mix(vC*vec3(.36,.34,.42),vC*vec3(1.25,1.06,.87),light);
          // Sparse flat vertical wear, rather than the former camouflage wash.
          float streak=hash21(vec2(floor((p.x+p.z)*4.),floor(p.y*.32)));
          if(streak>.88)c*=.80;
          if(paintView>4.5&&paintView<5.5&&abs(vKind-66.)<.5)c=linearColor(vec3(.77,.69,.56));
        `:kind==='roof'?`
          c=mix(linearColor(vec3(.25,.28,.35)),linearColor(vec3(.53,.56,.59)),light);
          if(abs(vKind-57.)<.5)c*=.90;
        `:kind==='bark'?`
          // inferred: narrow overlapping strokes follow the growth, much
          // narrower than W2's giraffe-like plates. Form remains
          // continuous beneath the pigment, independent of the mark centre.
          vec2 q=m.uv,macroScale=vec2(10.,1.1)/64.;
          vec4 plate=textureGrad(paintMarks,q*macroScale,dFdx(vUv)*macroScale,dFdy(vUv)*macroScale);
          float furrow=1.-smoothstep(.06,.28,plate.a);
          float form=smoothstep(-.20,.95,dot(n,paintSun))*(.70+.30*shadow);
          c=mix(linearColor(vec3(.22,.225,.255)),linearColor(vec3(.62,.49,.35)),form)*(.68+.64*plate.r);
          c*=mix(vec3(1.),vec3(.52,.56,.65),furrow*.72);
          c=mix(c,linearColor(vec3(.70,.55,.36)),smoothstep(.88,.99,plate.r)*form*.16);
          if(abs(vKind-90.)<.5)c=vC*mix(vec3(.50,.55,.66),vec3(1.23,1.07,.84),light);
          if(towerDetailView()&&paintView>1.5&&paintView<2.5&&vData.z<-.5){
            // inferred: denser umber cuts deepen the same round form by
            // about fifteen percent in the rendered value range.
            vec2 fineScale=vec2(21.,1.7)/64.;
            vec4 fine=textureGrad(paintMarks,q*fineScale,dFdx(vUv)*fineScale,dFdy(vUv)*fineScale);
            float cut=1.-smoothstep(.09,.30,fine.a);
            c*=.78*mix(vec3(1.),vec3(.55,.43,.35),cut*.30);
            c=mix(c,linearColor(vec3(.70,.53,.31)),smoothstep(.90,.99,plate.r)*(1.-furrow)*form*.12);
          }
        `:kind==='timber'?`
          c=mix(vC*vec3(.40,.42,.56),vC*vec3(1.65,1.42,1.12),light);
          if(vKind>39.5&&vKind<45.5){c=mix(vC*vec3(.45,.43,.52),vC*vec3(1.58,1.34,1.06),light);c*=1.-max(-n.y,0.)*.38;if(abs(vKind-41.)<.5)c*=.78;}
          if(abs(vKind-46.)<.5||abs(vKind-58.)<.5)c=mix(linearColor(vec3(.20,.14,.12)),linearColor(vec3(.47,.32,.22)),light);
          if(boatPart()){
            vec2 local=boatUV(p);float s=local.x/${BOAT.length*.5};
            float row=(p.y-${BOAT.position[1]}+.24-.18*pow(abs(s),3.))/.1725;
            float plank=hash21(abs(n.y)>.65?vec2(floor(local.y/.45),7.):vec2(floor(row),sign(local.y)*7.));
            vec3 shaded=linearColor(vec3(.46,.335,.235)),lit=linearColor(vec3(.75,.61,.435));
            c=mix(shaded,lit,light)*(.82+.36*plank);
            
            // inferred: small broken honey-coloured scuffs and umber cuts
            // run with each plank; gaps alone carry the deepest values.
            // Small marks use a filtered atlas mip. Read its pigment channel
            // directly here: the quiet general-purpose load compresses it
            // too far to leave visible wear on these four-pixel strokes.
            float worn=towerDetailView()?smoothstep(.77,.86,m.pick):smoothstep(.60,.69,m.pick);
            c=mix(c,linearColor(vec3(.86,.73,.55)),worn*(towerDetailView()?.10+.14*light:.30+.22*light));
            c*=1.-(1.-smoothstep(.25,.34,m.pick))*.25;
            if(abs(vKind-78.)<.5)c*=.95+.18*max(n.y,0.);
            if(abs(vKind-77.)<.5)c=mix(c,linearColor(vec3(.76,.60,.41)),.12+.10*light);
            if(dot(vC,vec3(.2126,.7152,.0722))<.05)c*=.60;
            if(p.y<.13)c*=.70;
            // inferred: .64 linear pigment gives roughly twenty percent
            // less displayed value, while retaining the accepted sun pools.
            if(towerDetailView())c*=.64;
          }
        `:''}
        // Opaque pigment loads, not a continuous wash. Hue changes are paired
        // and small; the atlas value carries most of the colour difference.
        float load=mix(${kind==='plaster'?'.94,1.06':kind==='timber'?'.88,1.12':'.88,1.12'},${kind==='timber'?'clamp((m.pick-.5)*2.5+.5,0.,1.)':'m.load'});
        ${kind==='stone'?'if(abs(vKind-55.)<.5)load=mix(.94,1.06,m.load);':''}
        c*=load*mix(vec3(.985,.995,1.025),vec3(1.025,1.,.975),step(.5,m.pick));
        c*=.72+.28*clamp(vData.x,0.,1.);
        return c;
      }
      void main(){
        vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
        ${kind==='bark'?'if(towerDetailView()&&vDetail.z>.5)discard;':''}
        ${kind==='plaster'?`if(towerDetailView()&&(abs(vKind-11.)<.5||abs(vKind-103.)<.5)){
          vec3 c=towerWall(n);c=mix(c,linearColor(vec3(.76,.75,.69)),smoothstep(35.,140.,-vP.z)*.68);
          gl_FragColor=vec4(c,1.);return;
        }`:''}
        ${kind==='timber'?`
        if(!boatPart()){
          // Fine members take light at the actual fragment. A seven-pixel
          // mark must never replace a smaller bracket arm's normal or gap.
          float light=clamp(max(dot(n,paintSun),0.)*structureShade(vP,n)*1.55,0.,1.);
          vec3 c=mix(vC*vec3(.70,.64,.62),vC*vec3(1.90,1.62,1.30),light);
          if(vKind>39.5&&vKind<45.5){
            c=mix(vC*vec3(.73,.65,.60),vC*vec3(1.85,1.57,1.27),light);
            c*=1.-max(-n.y,0.)*.42;
            c*=1.-pow(abs(n.x),3.)*.22;
            if(abs(vKind-41.)<.5)c*=.72;
            if(abs(vKind-44.)<.5)c*=.47;
            if(abs(vKind-45.)<.5)c*=.58;
          }
          if(abs(vKind-46.)<.5||abs(vKind-58.)<.5)c=mix(vC*vec3(.42,.38,.35),vC*vec3(1.45,1.26,1.12),light);
          if(towerDetailView())c=towerTimber(c,n,light);
          vec2 q=coordinates(n);float scale=exp2(floor(log2(1./max(max(length(dFdx(q)),length(dFdy(q)))*7.*paintPixelScale,1.e-7))));
          c*=.985+.03*texture2D(paintMarks,q*scale/64.).r;
          c*=.72+.28*clamp(vData.x,0.,1.);
          c=mix(c,linearColor(vec3(.76,.75,.69)),smoothstep(35.,140.,-vP.z)*.68);
          gl_FragColor=vec4(c,1.);return;
        }`:''}
        ${kind==='roof'?`
        if(towerDetailView()){
          if(abs(vKind-51.)<.5&&vDetail.w>2.5)discard;
          vec3 c=towerRoof(n);c=mix(c,linearColor(vec3(.76,.75,.69)),smoothstep(35.,140.,-vP.z)*.68);
          gl_FragColor=vec4(c,1.);return;
        }
        if(abs(vKind-50.)>.5){
          // W2b: narrow drip tiles and ridge ends cannot carry large stepped
          // lighting cells. Keep their existing geometry and crisp contour.
          float light=clamp(max(dot(n,paintSun),0.)*castShade(vP,n)*1.45,0.,1.);
          vec3 c=mix(linearColor(vec3(.25,.28,.35)),linearColor(vec3(.53,.56,.59)),light);
          if(abs(vKind-57.)<.5)c*=.90;
          c=mix(c,linearColor(vec3(.76,.75,.69)),smoothstep(35.,140.,-vP.z)*.68);
          gl_FragColor=vec4(c,1.);return;
        }`:''}
        vec2 q=coordinates(n),dx=dFdx(q),dy=dFdy(q);float det=dx.x*dy.y-dx.y*dy.x;
        vec3 px=dFdx(vP),py=dFdy(vP),nx=dFdx(n),ny=dFdy(n);vec2 ux=dFdx(vUv),uy=dFdy(vUv);
        float inverse=abs(det)>1.e-10?1./det:0.;
        vec3 tangent=(px*dy.y-py*dx.y)*inverse,bitangent=(py*dx.x-px*dy.x)*inverse;
        vec3 normalU=(nx*dy.y-ny*dx.y)*inverse,normalV=(ny*dx.x-nx*dy.x)*inverse;
        vec2 uvU=(ux*dy.y-uy*dx.y)*inverse,uvV=(uy*dx.x-ux*dy.x)*inverse;
        float footprint=max(length(dx),length(dy));
        // inferred: nearest dyadic scales straddle 4.5 pixels for bark/boat
        // and seven pixels elsewhere, at 1080p.
        // Their coordinates never move; only the smooth LOD weight changes.
        float octave=clamp(log2(1./max(footprint*${kind==='bark'?'4.5':kind==='timber'?'(towerDetailView()?3.5:4.5)':'7.'}*paintPixelScale,1.e-7)),-12.,12.);
        float scale=exp2(floor(octave)),weight=smoothstep(0.,1.,fract(octave));
        // A runtime material diagnostic measures the layer against the same
        // pigments and structural detail with one continuous light sample.
        vec3 c;
        if(paintMarkStrength>.5){
          PaintMark a=getMark(q,scale,n,tangent,bitangent,normalU,normalV,uvU,uvV);
          PaintMark b=getMark(q,scale*2.,n,tangent,bitangent,normalU,normalV,uvU,uvV);
          c=mix(shadeMark(a),shadeMark(b),weight);
        }else{
          PaintMark plain;plain.p=vP;plain.n=n;plain.uv=vUv;plain.load=.5;plain.pick=.5;
          c=shadeMark(plain);
        }
        ${kind==='stone'?`
        // Structural joints use physical metres independently of mark LOD.
        bool paving=abs(vKind-70.)<.5||(abs(vKind-62.)<.5&&n.y>.65);
        if(abs(vKind-52.)<.5||abs(vKind-65.)<.5||paving){
          vec2 jointQ=planeUV(vP,n),size=paving?vec2(1.05,.78):abs(vKind-52.)<.5?vec2(1.2,.64):vec2(2.4,.72);
          if(abs(vKind-52.)<.5)jointQ.y-=(${BRIDGE.fall})*vP.x;
          float row=floor(jointQ.y/size.y);vec2 grid=jointQ/size+vec2(mod(row,2.)*.5,0.);
          float joint=max(lineCut(grid.x,.010),lineCut(grid.y,.012));c*=1.-joint*(paving?.28:.23);
        }
        `:''}
        ${kind==='timber'?`if(boatPart()&&abs(vKind-9.)<.5&&abs(n.y)<.55){
          vec2 local=boatUV(vP);float s=local.x/5.25;
          float row=(vP.y-.05+.24-.18*pow(abs(s),3.))/.1725;
          c*=1.-lineCut(row,.025)*.42;
          c*=1.+lineCut(row-.055,.018)*.16;
        }`:''}
        ${kind==='roof'?`if(abs(vKind-50.)<.5){float fade=1.-smoothstep(.45,.9,fwidth(vUv.x));c*=1.-lineCut(vUv.x,.08)*.18*fade;}`:''}
        ${kind==='stone'?`if(abs(vKind-54.)<.5){
          vec2 p=vec2(mod(vUv.x,.70)-.35,vUv.y-.235);float curve=abs(p.y-.055*sin(p.x*11.)),aa=max(.006,fwidth(curve));
          float cut=1.-smoothstep(.008-aa,.022+aa,curve);float oval=abs(length(p/vec2(.24,.14))-1.);
          cut=max(cut,(1.-smoothstep(.04-max(.025,fwidth(oval)),.12+max(.025,fwidth(oval)),oval))*.55);c*=1.-cut*.18;
        }`:''}
        float haze=${bank?'.46+smoothstep(35.,160.,length(vP.xz-vec2(0.,-25.)))*.30':'smoothstep(35.,140.,-vP.z)*.68'};
        c=mix(c,linearColor(vec3(.76,.75,.69)),haze);
        ${bank?`if(abs(vKind-98.)<.5){
          float dab=texture2D(paintMarks,planeUV(vP,normalize(vN))*vec2(1.8,2.4)/64.).r;
          c*=.96+.08*dab;
        }`:''}
        float coverage=1.;
        ${bank?'if(abs(vKind-96.)<.5){float edge=abs(vUv.x-.5)*2.;coverage=(1.-smoothstep(.80-max(.08,fwidth(edge)),1.+max(.08,fwidth(edge)),edge))*smoothstep(.18,.70,1./max(fwidth(vUv.x),.0001));}':''}
        gl_FragColor=vec4(c,coverage);
      }`});
  mat.userData.noPatch=true;return mat;
}
