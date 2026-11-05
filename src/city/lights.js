import * as THREE from 'three';
import { CITY, YUJIE, XUANDE, BIANHE } from '../world/plan.js';
import { GeometryBatch } from '../yingzao/geometry.js';
import { proceduralMaterial } from '../core/materials.js';
import { bracketHeight } from '../yingzao/brackets.js';
import { colorGeometry, mergePacked } from './batch.js';
import { officeLayout } from './offices.js';

/** Permanent fixtures, not camera dressing. Only emission/intensity follows time. */
export function cityLights(engine,layout,material) {
  const group=new THREE.Group();group.name='city-lanterns-and-windows';
  const p=CITY.lighting,frames=new GeometryBatch(),glass=new GeometryBatch(),pools=[],fixtures=[];
  const floor=engine.registry.yujie?.corridors.floorY??YUJIE.surfaceY;
  // inferred: lanterns hang from the avenue-facing edge of the corridor roof.
  for(const sign of [-1,1])for(let z=YUJIE.start+8;z<YUJIE.end;z+=p.corridorSpacing) {
    if(Math.abs(z-BIANHE.center[2])<BIANHE.width/2+YUJIE.approachLength)continue;
    if(YUJIE.crossStreets.some(c=>Math.abs(z-c)<7))continue;
    fixtures.push({position:[sign*(YUJIE.corridor.centerX-p.corridorInset),floor+p.lanternHeight,z],floor,
      mountY:floor+YUJIE.corridor.columnHeight+1.4,pool:true});
  }
  // inferred: both real wing galleries and their forward pavilions receive
  // permanent hanging lamps. Mount heights follow each actual hall's brackets.
  for(const [halls,offsets,intensity]of [[XUANDE.wings,p.galleryOffsets,p.galleryIntensity],
    [XUANDE.towers,p.pavilionOffsets,p.pavilionIntensity]])for(const hall of halls)for(const [dx,dy,dz]of offsets) {
    const position=[hall.position[0]+Math.sign(hall.position[0])*dx,hall.position[1]+dy,hall.position[2]+dz];
    fixtures.push({position,floor:hall.position[1]+.04,mountY:hall.position[1]+hall.columnHeight+bracketHeight(hall),pool:false});
    const light=new THREE.PointLight(0xffb16a,0,14,2);light.position.set(...position);light.castShadow=false;group.add(light);
    light.userData.nightIntensity=intensity;
  }
  // inferred: each actual entrance hall has two lamps under its front eave.
  // These follow the compound layout, including the gates between its courts.
  const gate=CITY.officeModels.gate,base=CITY.officeFabric.surfaceY;
  for(const office of officeLayout())for(const building of office.buildings)if(building.kind==='gate')for(const [dx,dy,dz]of p.officeOffsets) {
    fixtures.push({position:[office.position[0]+building.position[0]+dx,base+gate.platform.height+dy,office.position[2]+building.position[2]+dz],
      floor:base+.05,mountY:base+gate.platform.height+gate.columnHeight+bracketHeight(gate),pool:true});
  }
  for(const f of fixtures) {
    const [x,y,z]=f.position;
    frames.box([x,(y+.25+f.mountY)/2,z],[.035,Math.max(.1,f.mountY-y-.25),.035]);
    frames.box([x,y+.22,z],[.38,.07,.38]);frames.box([x,y-.25,z],[.38,.07,.38]);
    for(const dx of [-.17,.17])for(const dz of [-.17,.17])frames.box([x+dx,y-.02,z+dz],[.035,.45,.035]);
    glass.box([x,y-.02,z],[.30,.42,.30]);if(f.pool)pools.push([x,f.floor+.015,z]);
  }
  const parts=[],g0=frames.geometry(),g1=glass.geometry();
  parts.push(colorGeometry(g0,new THREE.Color().setRGB(.055,.033,.018)),colorGeometry(g1,new THREE.Color().setRGB(.35,.22,.095),3));g0.dispose();g1.dispose();
  const bodies=new THREE.Mesh(mergePacked(parts),material);bodies.name='permanent-lantern-fixtures';bodies.castShadow=false;group.add(bodies);
  const dusk={value:0};
  const poolMaterial=proceduralMaterial({name:'lantern-ground-spill',params:{transparent:true,depthWrite:false,blending:THREE.AdditiveBlending},
    uniforms:{cityNight:dusk},vertexHead:'varying vec2 vLampUV;',vertexPre:'vLampUV=uv;',head:'varying vec2 vLampUV; uniform float cityNight;',
    color:'float r=length((vLampUV-.5)*2.0); diffuseColor.rgb=vec3(0.0); diffuseColor.a=pow(max(0.0,1.0-r),2.0)*cityNight;',
    emissive:'totalEmissiveRadiance=vec3(.25,.095,.022);'});
  const plane=new THREE.PlaneGeometry(5,7);plane.rotateX(-Math.PI/2);
  const poolMesh=new THREE.InstancedMesh(plane,poolMaterial,pools.length),matrix=new THREE.Matrix4();
  pools.forEach((pos,i)=>poolMesh.setMatrixAt(i,matrix.makeTranslation(...pos)));poolMesh.name='lantern-walkway-spill';poolMesh.castShadow=false;group.add(poolMesh);
  // Far roofs can omit their buried walls while retaining their actual window lights.
  // inferred: 42% occupied upper bays with 2.6 x .85 m luminous lattice openings.
  const rng=engine.rng('W1-night-windows'),windows=[];
  for(const h of layout.houses)if(rng.chance(.42)) {
    const depth=CITY.houseSpec.sideBays.reduce((a,b)=>a+b,0)/2*h.scale[2],co=Math.cos(h.yaw),si=Math.sin(h.yaw);
    const pos=new THREE.Vector3(h.position[0]+si*(depth+.035),h.position[1]+(1.85+h.storey)*h.scale[1],h.position[2]+co*(depth+.035));
    const transform=new THREE.Matrix4().compose(pos,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),h.yaw),new THREE.Vector3(2.6*h.scale[0],.85*h.scale[1],1));
    windows.push({position:pos,matrix:transform});
  }
  const windowMaterial=proceduralMaterial({name:'occupied-city-windows',params:{side:THREE.DoubleSide,roughness:.8},uniforms:{cityNight:dusk},
    vertexHead:'varying vec2 vWindowUV;',vertexPre:'vWindowUV=uv;',head:'uniform float cityNight; varying vec2 vWindowUV;',
    color:'diffuseColor.rgb=vec3(.03,.018,.008);',
    emissive:'float bars=mix(step(.12,fract(vWindowUV.x*7.0)),.88,smoothstep(.1,.8,fwidth(vWindowUV.x*7.0))); totalEmissiveRadiance=vec3(5.5,1.5,.20)*bars*cityNight;'});
  const markers=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),windowMaterial,windows.length);markers.count=0;markers.name='far-window-emission';markers.castShadow=false;group.add(markers);
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),3);let last=[];
  function update() {
    const night=engine.timePreset==='bluehour';dusk.value=night?1:0;
    poolMesh.visible=night;markers.visible=night;
    for(const light of group.children)if(light.isPointLight)light.intensity=night?light.userData.nightIntensity:0;
    const camera=engine.camera,key=[night,...camera.position.toArray(),...camera.quaternion.toArray(),camera.fov,camera.aspect];
    if(key.every((v,i)=>v===last[i]))return;last=key;let count=0;
    if(night) {
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      for(const w of windows)if(w.position.distanceTo(camera.position)<2800) {
        sphere.center.copy(w.position);if(frustum.intersectsSphere(sphere))markers.setMatrixAt(count++,w.matrix);
      }
    }
    markers.count=count;markers.instanceMatrix.needsUpdate=true;if(count)markers.computeBoundingSphere();
  }
  group.updateMatrixWorld=function(force){update();THREE.Group.prototype.updateMatrixWorld.call(this,force);};
  engine.add(group,{castShadow:false});update();return {group,fixtures,markers,poolMesh,update};
}
