import * as THREE from 'three';
import { TOWERS, BRIDGE, MOORING, BOAT } from './composition.js';
import { SUN, dirFromAzEl } from '../world/plan.js';
import { BARK_GLSL } from './bark.js';

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
${BARK_GLSL}
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
`;

// inferred: soft moving leaf shade, projected along the source sun direction.
export function dappleGLSL({height=8,wind=.12,scale=[1.05,.8]}={}){
  return `            vec2 canopy=vP.xz+(${height.toFixed(6)}-vP.y)*paintSun.xz/paintSun.y;
            canopy+=vec2(sin(paintTime*.55+vP.z*.3),cos(paintTime*.43+vP.x*.4))*${wind.toFixed(6)};
            float dapple=smoothstep(.42,.64,noise(canopy*vec2(${scale[0].toFixed(6)},${scale[1].toFixed(6)}))*.76+noise(canopy*3.1)*.24);
            c=mix(c*vec3(.58,.57,.69)+linearColor(vec3(.13,.10,.19))*.04,c*vec3(1.52,1.22,1.03),dapple);`;
}

export function paintMaterial(time,kind='stone',{dapple={},profile='zhouqiao'}={}) {
  const code = {
    stone: `vec2 q=abs(n.y)>.65?vP.xz:vec2(abs(n.x)>.65?vP.z:vP.x,vP.y);
      variation=dab(q*vec2(2.1,5.0)+vec2(q.y*.8,0.0))*.55+dab(q*vec2(8.0,14.0))*.20;
      wash=noise(q*1.9)-.5;`,
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
          float bankShadow=(1.-smoothstep(2.8,3.4,vP.y))*(1.-smoothstep(-32.,-29.,vP.z));
          bankShadow*=smoothstep(-25.,-20.,vP.x)*(1.-smoothstep(33.,38.,vP.x));
          c=mix(c,c*vec3(.18,.26,.26),bankShadow*.90);
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
          float sunSide=smoothstep(.02,.72,dot(barkNormal,paintSun))*smoothstep(-.10,.25,dot(n,paintSun));
          c=mix(middle,ridge,sunSide*(.35+.65*plate))*(.82+plate*.25);
          c=mix(c,linearColor(vec3(.13,.09,.09)),pow(crevice,2.)*.90);
          float lichen=smoothstep(.62,.80,noise(q*vec2(.35,.12)+7.));
          c=mix(c,linearColor(vec3(.42,.46,.37)),lichen*.20);
          c=brokenColor(c,q,vec2(3.2,.8),.65,vec3(1.4,1.02,.65),vec3(.72,.98,1.4));
          c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,.70);
          c*=1.+pigmentDab(q*vec2(4.5,1.4))*.8+pigmentDab(q*vec2(11.,3.)+7.)*.32;
          c=brokenColor(c,q,vec2(2.8,1.1),1.8,vec3(1.4,1.02,.65),vec3(.72,.98,1.4),vec3(1.10,1.07,.80),vec3(.85,.95,1.10));
          ${profile==='xuande'?'c*=vec3(.72,.76,.84);':''}
        ` : ''}
        ${kind==='roof'&&profile==='xuande'?`
          if(vKind>30.5&&vKind<31.5){c=mix(linearColor(vec3(.37,.38,.36)),linearColor(vec3(.66,.64,.55)),light);}
        `:''}
        c=mix(c*${kind==='stone'?'vec3(.64,.61,.59)':'vec3(.55,.58,.76)'},c,clamp(vData.x,0.0,1.0));
        ${kind === 'timber' ? `
          if(vKind>8.5&&vKind<9.5){
            // inferred: matte grey-brown timber, dark bilge, worn dry ridges
            // and broad tree dapple rather than orange varnish-like streaks.
            vec2 local=vP.xz-vec2(${BOAT.position[0].toFixed(6)},${BOAT.position[2].toFixed(6)});
            local=mat2(${Math.cos(BOAT.yaw).toFixed(6)},${Math.sin(BOAT.yaw).toFixed(6)},${(-Math.sin(BOAT.yaw)).toFixed(6)},${Math.cos(BOAT.yaw).toFixed(6)})*local;
            float worn=noise(local*vec2(1.1,4.3))*.7+noise(local*vec2(3.,11.))*.3;
            vec3 dry=mix(linearColor(vec3(.30,.27,.23)),linearColor(vec3(.49,.42,.32)),smoothstep(.27,.72,worn));
            vec2 canopy=vP.xz+(8.-vP.y)*paintSun.xz/paintSun.y;
            canopy+=vec2(sin(paintTime*.55+vP.z*.3),cos(paintTime*.43+vP.x*.4))*.12;
            float pool=smoothstep(.44,.68,noise(canopy*vec2(1.05,.8))*.76+noise(canopy*3.1)*.24);
            vec3 sun=mix(dry,linearColor(vec3(.59,.45,.29)),.38)*1.55;
            c=mix(dry*vec3(.46,.49,.60),sun,clamp(light*.60+pool*.70,0.,1.));
            c*=mix(.56,1.,smoothstep(-.10,.42,vP.y));
            if(n.y>.6&&vP.y>.20)c*=1.+pool*.13;
            float along=local.x/${(BOAT.length*.5).toFixed(6)};
            q=vec2(local.x,(vP.y+local.y*.25)*3.);
            float strake=(vP.y-${BOAT.position[1].toFixed(6)}+.24-.18*pow(abs(along),3.))/.1725;
            float seam=min(fract(strake),1.-fract(strake)),sa=max(.025,fwidth(strake));
            if(abs(n.y)<.5)c*=1.-(1.-smoothstep(.025-sa,.09+sa,seam))*.28;
            // inferred: each worn plank carries its own warm/grey load, and
            // short exposed dry scrapes interrupt its long grain.
            float board=hash21(vec2(floor(local.x/1.3),floor(strake)));
            c*=.50+1.5*board;
            c*=mix(vec3(.80,.97,1.16),vec3(1.40,1.04,.64),board);
            float scrape=max(0.,dab(vec2(local.x*3.4,(vP.y+local.y*.25)*15.)));
            c=mix(c,linearColor(vec3(.67,.52,.35)),scrape*2.3);
          }
          if(vKind>9.5){
            c=mix(linearColor(vec3(.27,.22,.15)),linearColor(vec3(.48,.39,.26)),light);
            c*=.88+.14*noise(vP.xz*9.+vP.y*4.);
          }
        ` : ''}
        ${kind === 'stone'&&profile==='zhouqiao' ? `float bridgeY=vP.y-(${BRIDGE.fall.toFixed(6)})*vP.x,bridgeZ=vP.z-(${BRIDGE.skew.toFixed(6)})*vP.x-(${BRIDGE.offset.toFixed(6)});
          float underDeck=(1.-smoothstep(2.1,2.95,bridgeY))*smoothstep(1.2,2.95,bridgeY)*(1.-smoothstep(-15.9,-15.4,bridgeZ));
          c=mix(c,c*vec3(.61,.68,.86),underDeck*.52);
          // inferred: occluded beam soffit and fascia; the unshaded low-detail
          // deck was the cream mass mirrored beyond the column reflections.
          float beam=(1.-smoothstep(3.70,3.82,bridgeY))*smoothstep(2.78,2.95,bridgeY);
          beam*=smoothstep(-23.6,-23.0,bridgeZ)*(1.-smoothstep(-15.8,-15.3,bridgeZ));
          if(n.y<.35||vN.y<-.35)c=mix(c,c*vec3(.34,.38,.40),beam*.82);
          float backWall=(1.-smoothstep(-26.,-24.,bridgeZ))*(1.-smoothstep(3.,3.8,vP.y));
          backWall*=(1.-smoothstep(${BRIDGE.end.toFixed(6)},${(BRIDGE.end+5).toFixed(6)},vP.x))*smoothstep(${(BRIDGE.start-4).toFixed(6)},${BRIDGE.start.toFixed(6)},vP.x);
          c=mix(c,c*vec3(.25,.31,.32),backWall*.86);
          // inferred: the broad front face is warm shade; the narrow sun face
          // and chipped arris retain cream light, making each shaft read solid.
          float shaft=(1.-smoothstep(2.85,3.1,bridgeY))*(1.-smoothstep(-15.9,-15.4,bridgeZ));
          if(abs(vN.y)<.35){
            float faceSun=smoothstep(.02,.55,dot(n,paintSun));
            vec3 pier=mix(linearColor(vec3(.42,.37,.35)),linearColor(vec3(.76,.64,.44)),faceSun);
            pier*=(.90+.17*noise(q*vec2(3.2,4.4)))*.92;
            pier*=1.-smoothstep(2.35,3.05,bridgeY)*.62;
            pier=mix(pier,linearColor(vec3(.17,.22,.21)),(1.-smoothstep(.02,.24,vP.y))*.85);
            c=mix(c,pier,shaft);
          }
          if(bridgeY>3.65&&bridgeY<5.2)c*=mix(vec3(.82,.78,.75),vec3(1.11,1.05,.89),light);
          float bridgeShadow=(1.-smoothstep(27.,33.,abs(vP.x)))*(1.-smoothstep(-22.9,-22.3,bridgeZ))*(1.-smoothstep(2.3,3.3,bridgeY));
          c=mix(c,linearColor(vec3(.25,.32,.35)),bridgeShadow*.85);
          vec3 postP=vP-vec3(${MOORING.position.map(x=>x.toFixed(6)).join(',')});
          if(abs(postP.x)<${(MOORING.width*.6).toFixed(6)}&&abs(postP.z)<${(MOORING.width*.6).toFixed(6)}&&postP.y>0.){
            float stain=noise(q*vec2(13.,2.9))*.7+noise(q*vec2(23.,9.))*.3;
            c*=mix(.41,.77,smoothstep(.26,.72,stain));
            c+=linearColor(vec3(.65,.59,.47))*max(0.,dab(q*vec2(18.,7.)))*.25;
          }
          float quayShade=(1.-smoothstep(.65,1.5,abs(vP.x+14.)))*smoothstep(-19.,-16.,vP.z)*(1.-smoothstep(-5.,-3.,vP.z));
          c=mix(c,c*vec3(.49,.50,.63),quayShade*.80);
          float moss=(1.-smoothstep(.08,.72,vP.y))*smoothstep(.36,.72,noise(vP.xz*3.));
          c=mix(c,linearColor(vec3(.29,.35,.23)),moss*.52);
          if(vP.z>-7. && n.y>.5){
            ${dappleGLSL(dapple)}
            float grey=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(grey),c,.64);
            c=brokenColor(c,q,vec2(.8,1.1),3.0,vec3(1.45,1.0,.63),vec3(.72,.98,1.43));
          }` : ''}
        ${profile==='zhouqiao'&&['timber','plaster'].includes(kind) ? TOWERS.map(([x,z,s]) => `{
          vec3 p=(vP-vec3(${x.toFixed(6)},3.6,${z.toFixed(6)}))/${s.toFixed(6)};
          float roofShade=(1.-smoothstep(7.,9.,abs(p.x)))*(1.-smoothstep(4.5,6.5,abs(p.z)));
          roofShade*=smoothstep(6.9,8.8,p.y)*(1.-smoothstep(10.8,11.8,p.y));
          float lintelShade=(1.-smoothstep(3.2,4.4,abs(p.x)))*smoothstep(4.5,5.4,p.y)*(1.-smoothstep(6.0,6.4,p.y));
          c=mix(c,c*vec3(.52,.56,.63),max(roofShade*.58,lintelShade*.65));
          ${kind==='plaster'?`
          if(vKind>10.5&&vKind<11.5&&abs(p.x)<6.5&&abs(p.z)<4.){
            // inferred: quiet coursed tan masonry with a falling eave shadow.
            float u=abs(n.x)>.60?p.z:p.x;
            float row=p.y/.42,cell=u/.80+mod(floor(row),2.)*.5;
            float joint=min(fract(row),1.-fract(row)),ja=max(.012,fwidth(row));
            float course=1.-smoothstep(.014-ja,.045+ja,joint);
            float stagger=min(fract(cell),1.-fract(cell));
            course=max(course,(1.-smoothstep(.014,.045,stagger))*.42);
            c*=1.-course*.12;
            c*=.95+.09*noise(vec2(floor(cell),floor(row)));
            c=mix(c,c*vec3(.46,.42,.43),smoothstep(3.1,5.7,p.y)*.76);
            float inside=1.-smoothstep(3.25,3.43,abs(p.x));
            float glow=exp(-pow((p.z+.3)/1.8,2.));
            vec3 recess=c*mix(.37,.80,smoothstep(-3.4,1.1,p.z));
            recess+=linearColor(vec3(.42,.26,.12))*glow*.11;
            c=mix(c,recess,inside*.85);
          }` : ''}
        }`).join('\n') : ''}
        ${kind==='timber'&&profile==='zhouqiao'?'if(vP.z<0.)c*=1.17;':''}
        ${profile==='xuande'?`
          ${kind==='plaster'?`
          // inferred: quiet ochre washes, irregular patches and vertical
          // seepage are attached to masonry; faint courses show through near its foot.
          if(vKind>19.5){
          vec2 wallQ=vec2(vP.x+vP.z*.23,vP.y);
          // inferred: slow translucent ochre wash; no thresholded blobs or
          // high-frequency pigment. End planes shade from their true normals.
          float broadWash=noise(wallQ*vec2(.085,.095))-.5;
          float rain=noise(wallQ*vec2(.62,.028))-.5;
          c=linearColor(vec3(.83,.69,.49))*(1.+broadWash*.16+rain*.080+(noise(wallQ*vec2(.32,.18))-.5)*.09);
          // inferred: soft overlapping broad brush washes, all the same
          // warm pigment. Gaussian coverage has no thresholded camouflage cells.
          vec2 brushQ=wallQ*vec2(.43,.35),cell=floor(brushQ);float softWash=0.;
          for(int iy=-1;iy<=1;iy++)for(int ix=-1;ix<=1;ix++){
            vec2 id=cell+vec2(float(ix),float(iy)),r=brushQ-id-.5;
            r+=vec2(hash21(id+3.),hash21(id+9.))*.22-.11;
            softWash+=exp(-dot(r*vec2(.9,1.6),r*vec2(.9,1.6))*4.)*(hash21(id)-.5);
          }
          c*=1.+softWash*.18;
          // inferred: rose-ochre plaster breaks into loaded brush marks;
          // the lower courses show through the thinner plaster by the doors.
          c*=1.+pigmentDab(wallQ*vec2(.75,1.1))*.30+pigmentDab(wallQ*vec2(2.2,2.8)+11.)*.55;
          float row=vP.y/.85,block=(vP.x+mod(floor(row),2.)*.95)/1.9;
          vec2 edge=min(fract(vec2(block,row)),1.-fract(vec2(block,row)));
          vec2 aa=max(fwidth(vec2(block,row)),vec2(.003));
          float joint=max(1.-smoothstep(.01-aa.x,.035+aa.x,edge.x),1.-smoothstep(.01-aa.y,.035+aa.y,edge.y));
          float lower=1.-smoothstep(2.8,4.8,vP.y);
          c*=1.-joint*lower*.10;
          c*=1.+(hash21(floor(vec2(block,row)))-.5)*lower*.11;
          float lichen=smoothstep(.52,.76,noise(wallQ*vec2(.55,.85)+19.))*smoothstep(6.8,10.,vP.y);
          c=mix(c,linearColor(vec3(.62,.59,.46)),lichen*.18);
          vec2 canopy=vP.xz+(24.-vP.y)*paintSun.xz/paintSun.y;
          float leafShade=smoothstep(.46,.63,noise(canopy*vec2(.55,.43))*.7+noise(canopy*1.8)*.3);
          float shadowReach=(1.-smoothstep(-10.,9.,vP.x))*smoothstep(4.,8.,vP.y);
          c=mix(c,c*vec3(.66,.64,.78),leafShade*shadowReach*.38);
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
            float pool=smoothstep(.44-penumbra,.62+penumbra,shadeField);
            float washTone=noise(vP.xz*vec2(.52,.39));
            vec3 shade=mix(linearColor(vec3(.44,.43,.48)),linearColor(vec3(.50,.47,.50)),washTone);
            vec3 sun=mix(linearColor(vec3(.85,.70,.60)),linearColor(vec3(.89,.75,.64)),washTone);
            c=mix(shade,sun,pool);
            c*=.97+.03*clamp(dot(vC,vec3(.2126,.7152,.0722))/.45,.7,1.3);
            float row=(vP.z-1.)/2.2,cell=(vP.x+11.8-mod(floor(row+.5),2.)*1.55)/3.1;
            vec2 edge=min(fract(vec2(cell,row)+.5),1.-fract(vec2(cell,row)+.5));
            vec2 aa=max(fwidth(vec2(cell,row)),vec2(.001));
            vec2 joints=1.-smoothstep(vec2(.001)-aa,vec2(.016)+aa,edge);
            c*=1.-max(joints.x,joints.y)*.12;
            c=brokenColor(c,vP.xz,vec2(.30,.42),.8,vec3(1.4,.98,.7),vec3(.78,.98,1.3));
            if(vKind>26.5&&vKind<27.5){
              float soil=noise(vP.xz*vec2(.15,.18));
              c=mix(linearColor(vec3(.60,.56,.46)),linearColor(vec3(.61,.63,.49)),soil);
              c*=.93+.10*noise(vP.xz*.55);
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
            c=linearColor(vec3(.82,.45,.33))*(.94+.08*noise(vP.xy*vec2(2.1,.55)));
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
          c=brokenColor(c,q,${({stone:'vec2(2.1,3.)',plaster:profile==='xuande'?'vec2(.8,1.05)':'vec2(1.25,1.8)',timber:profile==='xuande'?'(vKind>20.5&&vKind<22.5?vec2(.7,1.3):vec2(1.4,4.))':'vec2(1.4,4.)',roof:'vec2(2.6,1.3)'})[kind]},${({stone:'1.5',plaster:profile==='xuande'?'.85':'1.0',timber:profile==='xuande'?'(vKind>20.5&&vKind<21.5?.40:1.0)':'(vKind>8.5&&vKind<9.5?3.5:1.0)',roof:'.55'})[kind]},
            ${kind==='roof'?'vec3(1.20,1.06,.74),vec3(.77,.98,1.35)':kind==='timber'?'vec3(1.38,1.04,.64),vec3(.76,.98,1.35)':'vec3(1.45,1.00,.63),vec3(.72,.98,1.43)'});
        `:''}
        ${kind==='roof'&&profile==='xuande'?'c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,.90)+linearColor(vec3(.14,.10,.05))*.15;':''}
        ${kind==='timber'&&profile==='xuande'?'if(vKind>34.5&&vKind<35.5)c=mix(linearColor(vec3(.48,.29,.09)),linearColor(vec3(.88,.67,.30)),.40+.60*light);':''}
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
