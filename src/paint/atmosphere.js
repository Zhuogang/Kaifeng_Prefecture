import * as THREE from 'three';
import { BRUSH } from './materials.js';
import { BOAT, TOWERS } from './composition.js';

// inferred: cloud shapes, wash colours, ripple spacing and reflection footprints
// are composed paint masses, not a simulation of cloud or water optics.

export function paintedSky(engine) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */`
      varying vec3 vDirection; ${BRUSH}
      void main(){
        vec3 d=normalize(vDirection);vec2 q=vec2(atan(d.x,-d.z),d.y);
        vec3 sky=mix(vec3(.86,.82,.74),vec3(.63,.74,.89),smoothstep(-.08,.37,d.y));
        float field=noise(q*vec2(4.0,11.0)+vec2(8,1))*.65+noise(q*vec2(11.,27.)+4.)*.25+noise(q*65.)*.10;
        float cloud=smoothstep(.47,.61,field+sin(q.x*7.+q.y*17.)*.08);
        cloud*=smoothstep(.05,.18,d.y)*(1.-smoothstep(.65,.9,d.y));
        vec3 cc=mix(vec3(.75,.74,.82),vec3(1.0,.88,.70),smoothstep(.48,.65,field));
        cc+=vec3(dab(q*vec2(100.,180.)+q.yx*40.)*.06);
        sky=mix(sky,cc,cloud*.94);
        sky+=vec3(dab(q*vec2(155.,240.))*.015);
        gl_FragColor=vec4(linearColor(sky),1.0);
      }`,
  });
  material.userData.noPatch = true;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(550, 32, 16), material);
  sky.name = 'painted-sky-washes'; sky.renderOrder = -10; sky.userData.noPatch = true;
  engine.add(sky, { castShadow: false, receiveShadow: false });
}

export function paintedWater(engine, time) {
  const material = new THREE.ShaderMaterial({
    uniforms: { paintTime: time },
    vertexShader: `varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */`
      varying vec3 vP; uniform float paintTime; ${BRUSH}
      void main(){
        vec2 p=vP.xz;
        vec2 boat=p-vec2(${BOAT.position[0].toFixed(6)},${BOAT.position[2].toFixed(6)});
        float along=(boat.x*${Math.cos(BOAT.yaw).toFixed(6)}-boat.y*${Math.sin(BOAT.yaw).toFixed(6)})/${(BOAT.length/2).toFixed(6)};
        float across=boat.x*${Math.sin(BOAT.yaw).toFixed(6)}+boat.y*${Math.cos(BOAT.yaw).toFixed(6)};
        if(abs(along)<.99&&abs(across)<${(BOAT.width/2).toFixed(6)}*(1.-.72*pow(abs(along),3.))*.688-.025)discard;
        float bands=p.y*4.3+noise(vec2(p.y*.7,3.))*.4;
        float row=floor(bands), offset=hash21(vec2(row,27.));
        vec2 cell=vec2(p.x*(1.1+offset*.7)+offset,bands);
        cell.x+=noise(vec2(p.x*.8,row*1.7))*.55;
        vec2 id=floor(cell), f=fract(cell);
        float seed=hash21(id), edge=noise(p*vec2(9.,22.));
        f.y+=sin(f.x*5.+seed*7.)*.12;
        float stroke=smoothstep(.06,.24,f.y+edge*.15)*(1.-smoothstep(.64,.94,f.y+edge*.13));
        stroke*=smoothstep(.04,.18,f.x)*(1.-smoothstep(.76,.98,f.x));
        float shiver=sin(paintTime*.65+seed*6.28)*.07;
        float x=p.x+sin(row*1.3)*.38+shiver;
        vec3 base=mix(vec3(.22,.40,.39),vec3(.44,.60,.58),noise(p*vec2(.09,.16)));
        vec3 reflection=vec3(.56,.66,.62);
        float pier=1.-smoothstep(.28,.75,abs(mod(x+27.3,2.6)-1.3));
        float columnFade=1.-smoothstep(-3.,30.,p.y);
        reflection=mix(reflection,vec3(.87,.76,.51),pier*columnFade*.95);
        float tower=exp(-pow((x-${TOWERS[0][0].toFixed(6)})/7.,4.))*(1.-smoothstep(3.,23.,p.y));
        reflection=mix(reflection,vec3(.67,.36,.21),tower*.75);
        float trees=exp(-pow((x-16.5)/3.5,2.))*.7;
        reflection=mix(reflection,vec3(.56,.58,.24),trees);
        float shade=(1.-smoothstep(-11.,-4.,p.x))*.55;
        base=mix(base,vec3(.18,.29,.25),shade);
        vec3 c=mix(base,reflection,stroke*(.28+seed*.62));
        float boatShade=exp(-pow(along/.95,4.)-pow((across-.25)/1.8,4.));
        c=mix(c,c*vec3(.63,.75,.70),boatShade*.7);
        float small=dab(p*vec2(3.4,14.))*.08;
        c+=small; c+=sin(paintTime*.7+seed*10.)*.012*stroke;
        gl_FragColor=vec4(linearColor(c),1.0);
      }`,
  });
  material.userData.noPatch = true;
  const g = new THREE.PlaneGeometry(300, 250).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, material); mesh.name = 'horizontal-painted-reflections'; mesh.userData.noPatch = true;
  engine.add(mesh, { castShadow: false, receiveShadow: false });
}
