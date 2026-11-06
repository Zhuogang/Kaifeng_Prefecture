import * as THREE from 'three';
import {PaintBatch} from './batch.js';
import {paintMaterial} from './materials.js';
import {paintVisibility} from './visibility.js';
import {paintedHalls} from './halls.js';
import {blossomGeometry,distantBlossomGeometry,scatteredPetals,groundPetals} from './blossom.js';
import {beveledBox} from './stonework.js';
import {Geometry,V} from '../flora/geometry.js';
import {buildCrane} from '../modules/cranes.js';
import {broadleafGeometry} from './foliage.js';
// inferred: all composed dimensions/placements and wear fields here follow c1,
// not a surveyed site. Hall members, roof profile and brackets use yingzao.
export function composeXuande(engine,time,viewAt){
 const keep=paintVisibility(engine,viewAt),keepReflection=paintVisibility(engine,viewAt,{reflection:true,waterBounds:[-28.5,-2,-14.4,85]});
 const families=['stone','plaster','timber','roof','bark','leaf'],batches=Object.fromEntries(families.map(k=>[k,new PaintBatch()])),reflected=Object.fromEntries(families.map(k=>[k,new PaintBatch()]));
 const rng=engine.rng('S1-xuande'),{stone,plaster,timber,bark,leaf}=batches;
 const both=(family,p,s,c,ao=1,chipped=false,kind=null)=>{batches[family].box(p,s,c,ao,0,chipped,kind);reflected[family].box(p,s,c,ao,0,false,kind);};
 const softened=(family,p,s,c,kind,bevel=.035)=>{
  const g=beveledBox(s,bevel),m=new THREE.Matrix4().makeTranslation(...p);
  batches[family].add(g,m,c,1,0,kind);reflected[family].add(g,m,c,1,0,kind);g.dispose();
 };
 // Battered platform: one continuous, non-coursed plaster surface around five
 // deep rectangular reveals. Sloped side wings make the platform's mass legible.
 const wall=(x0,x1,z=0,h=12,batter=2)=>{
  const g=new THREE.BoxGeometry(x1-x0,h,10),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const t=(p.getY(i)+h/2)/h;if(p.getX(i)>0)p.setX(i,p.getX(i)+batter*(1-t));else p.setX(i,p.getX(i)-batter*(1-t));if(p.getZ(i)>0)p.setZ(i,p.getZ(i)+batter*(1-t));}
  g.computeVertexNormals();const m=new THREE.Matrix4().makeTranslation((x0+x1)/2,h/2,z-5);plaster.add(g,m,'#c8a16c',1,0,20);reflected.plaster.add(g,m,'#c8a16c',1,0,20);g.dispose();
 };
 // The thin front panels have genuine gaps; a rear wall closes each passage.
 const centers=[-12.533069, -4.767755, 3.055516, 10.937394, 18.878541],opening=4.9;
 const outline=new THREE.Shape();outline.moveTo(-17.800053,12);outline.lineTo(22.786611,12);outline.lineTo(27.080105,0);
 for(const x of [...centers].reverse()){outline.lineTo(x+opening/2,0);outline.lineTo(x+opening/2-.15,5.8);outline.lineTo(x-opening/2+.15,5.8);outline.lineTo(x-opening/2,0);}
 outline.lineTo(-21.241779,0);outline.closePath();
 const platform=new THREE.ExtrudeGeometry(outline,{depth:9,steps:1,bevelEnabled:false}),pp=platform.attributes.position;
 for(let i=0;i<pp.count;i++)pp.setZ(i,-pp.getZ(i)+3.8+(1-pp.getY(i)/12)*2.1);
 platform.computeVertexNormals();plaster.add(platform,undefined,'#c8a16c',1,0,20);reflected.plaster.add(platform,undefined,'#c8a16c',1,0,20);platform.dispose();
 for(const x of centers){
  both('timber',[x,2.8,3.90],[4.60,5.6,.10],'#4c302a',.8,false,79);
  for(const side of [-1,1])both('timber',[x+side*1.165,2.8,4.0],[2.27,5.6,.32],'#994d3e',.86,false,21);
  softened('timber',[x,5.532824,5.04],[6.30,.60,1.00],'#974a37',22,.055);
  both('timber',[x-2.50,2.9,4.78],[.30,5.8,1.4],'#654739',.63,false,22);
  both('timber',[x+2.50,2.9,4.78],[.30,5.8,1.4],'#654739',.63,false,22);
  // 門皆金釘朱漆: rows of gilt nails; inferred six-by-six spacing.
  for(const dx of [-1.75,-1.05,-.35,.35,1.05,1.75])for(let j=0;j<6;j++)both('timber',[x+dx,.8+j*.78,4.22],[.085,.085,.05],'#d2a45c',1,false,35);
 }
 both('stone',[3.0,12.10,-.6],[40.8,.28,9.3],'#bfb196',1,true);
 // Side towers and joining galleries.
 wall(-38,-27,-5,12.0,1.8);wall(34,46,-5,12.0,1.8);
 wall(-27,-18,-6,10.4,1.2);wall(25,34,-6,10.4,1.2);
 const halls=paintedHalls(engine,batches,reflected,{time,view0:viewAt(0,0),profile:'xuande',timberColor:'#9e513d',ornamentHeight:3.1,smallOrnamentScale:.55,tileProfile:true,ornamentProfile:'fishTail',smallPaint:{roofStretch:1.4},heroPaint:{roofStretch:1.18},
  heroSpec:{frontBays:[4.4,4.6,4.6,5.2,4.6,4.6,4.4],sideBays:[4.6,4.6],columnHeight:4.5,caiGrade:2,tiao:3,bayFill:'open'},
  smallSpec:{frontBays:[2.5,2.8,2.5],sideBays:[1.3,1.3],columnHeight:5.3,caiGrade:4,tiao:2,bayFill:'open'},
  palette:{bracket:'#a4644d',plaster:'#584a40',window:'#7a6351'}});
 halls.hall([3.3,12.2,-4.5],1.22,true);
 // inferred: recessed rear interior in the open hall, with a warm floor bounce.
 both('timber',[3.3,16.1,-8.4],[40,7.8,.25],'#4d382f',1,false,24);
 for(let i=0;i<7;i++){
  const g=new THREE.CylinderGeometry(.11,.12,4.0,16),m=new THREE.Matrix4().makeTranslation(-14.0+i*5.8,14.3,-7.8);
  timber.add(g,m,'#6c4232',.7,0,59);reflected.timber.add(g,m,'#6c4232',.7,0,59);g.dispose();
 }
 halls.hall([-35.5,12.2,-5],1,false);halls.hall([40,12.2,-5],1,false);
 for(const x of [-35.5,40])both('timber',[x,14.8,-6.1],[8.8,5.2,.20],'#543b31',1,false,24);
 for(const [x,width]of [[-26.3,15.2],[29.7,11.5]])halls.hall([x,10.5,-5],1,false,false,{frontBays:[width/3,width/3,width/3],sideBays:[1.4],columnHeight:2.6,caiGrade:6,tiao:1,roof:'xuanshan',klass:'tingtang',bayFill:'open',ornaments:false});
 // Balcony and heavy square railings, with separate cap, collar and foot.
 function rail(x,z0,z1,spacing=2.4,y=0,scale=1){
  const steps=Math.ceil((z1-z0)/spacing),posts=Array.from({length:steps+1},(_,j)=>{const z=z0+(z1-z0)*j/steps,hero=x<0&&z>54&&z<56;return {z:z+(hero?.8:0),hero};});
  for(let j=0;j<=steps;j++){
   const {z,hero}=posts[j];
   const postScale=hero?1.6:1;
   const k=scale*postScale;
   softened('timber',[x,y+.71*k,z],[.42*k,1.42*k,.44*k],'#ae5b47',72,.035*k);
   softened('timber',[x,y+1.51*k,z],[.30*k,.18*k,.32*k],'#a85b45',72,.018*k);
   softened('timber',[x,y+1.83*k,z],[.56*k,.46*k,.57*k],'#b76348',72,.035*k);
   softened('timber',[x,y+.16*k,z],[.47*k,.32*k,.49*k],'#95503e',72,.03*k);
   if(j<steps){
    const span=posts[j+1].z-z;
    for(const yy of [.48,1.28])softened('timber',[x,y+yy*scale,z+span/2],[.35*scale,.35*scale,span+.05],'#b5634c',71,.035*scale);
    softened('timber',[x,y+.86*scale,z+span/2],[.13*scale,.76*scale,.14*scale],'#a95944',72,.018*scale);
   }
  }
 }
 for(const x of [-12.6,17.0])rail(x,1.2,69,2.4,0,1.0);
 // inferred: wing rails stand on their own pavilion terrace fronts; the main
 // hall retains its original avenue-facing rail position.
 for(const [x,w,y,z]of [[3.3,40,12.25,4.0],[-35.5,9,12.2,-3.25],[40,9,12.2,-3.25]]){
  for(let i=0;i<=w;i+=1.2){both('timber',[x-w/2+i,y+.7,z],[.11,1.4,.13],'#b66e50');both('timber',[x-w/2+i,y+1.44,z],[.17,.08,.18],'#ba7956');}
  for(const dy of [.35,1.15])both('timber',[x,y+dy,z],[w,.13,.15],'#b06a4a');
 }
 // Pale avenue slabs and narrow stone canal kerbs. Dapple is material-local.
 stone.box([9.6,-.44,41],[47.8,.25,90],'#a49e93',1);
 for(let z=1;z<85;z+=2.2)for(let x=-11.8;x<39;x+=3.1){
  const c=new THREE.Color(rng.pick(['#c6b9a3','#cbbda7','#c2b7a6','#d0c2ae']));stone.box([x+(Math.floor(z/2.2)%2)*1.55,-.12,z],[3.08,.25,2.18],c,.98,0,true,70);
 }
 for(const x of [-13.7,-29.0])for(let z=-2;z<82;z+=1.9)softened('stone',[x,-.02,z],[x>-20?1.4:1.0,.58,1.88],'#c8bba3',73,.04);
 rail(-29.7,1.2,69,3.0,0,.8);
 // inferred: soft grove ground extends behind the skyline; haze and actual
 // overlapping trees/roofs conceal its horizon rather than a hard backdrop join.
 both('stone',[-70,-.30,0],[80,.70,240],'#969c72',1,false,27);
 both('stone',[54,-.30,0],[70,.70,240],'#969c72',1,false,27);
 both('stone',[-29.8,-.30,39],[1.2,.70,82],'#9b9478',1,false,27);
 // inferred: enclosed far halls stand on the grove ground; only their
 // quiet roof hints emerge, without tiny ornaments or floating open posts.
 const horizonRng=engine.rng('S2-xuande-horizon');
 for(let layer=0;layer<2;layer++)for(let i=0;i<17;i++){
  const x=-100+i*13+horizonRng.range(-3,3),z=-55-layer*29-horizonRng.range(0,12);
  halls.hall([x,.05,z],horizonRng.range(.55,.85),false,true,{bayFill:'wall',ornaments:false});
 }
 // inferred: the former overlapping rectangular cards made pale unreadable
 // blocks. Closed round lobes now reveal warm haze and real roofs between them.
 for(const sign of [-1,1])for(let i=0;i<12;i++){
  const x=sign*horizonRng.range(45,108),z=horizonRng.range(-100,-36),h=horizonRng.range(10,17);
  const g=broadleafGeometry(engine.rng(`D4-xuande-grove-${sign}-${i}`),{height:h}),m=new THREE.Matrix4().makeTranslation(x,0,z);
  bark.add(g.wood,m);leaf.add(g.leaves,m);reflected.leaf.add(g.leaves,m);g.wood.dispose();g.leaves.dispose();
 }
 function tree(x,z,h,white=false,hero=false,far=false){const options={height:h,hero,white,detailRng:engine.rng(`D4-blossom-details-${x}-${z}`)},seed=engine.rng(`S1-blossom-${x}-${z}`),g=far?distantBlossomGeometry(seed,options):blossomGeometry(seed,options),m=new THREE.Matrix4().makeTranslation(x,0,z);bark.add(g.wood,m,'#ffffff',hero?.78:1);leaf.add(g.flowers,m);reflected.bark.add(g.wood,m);reflected.leaf.add(g.reflectionFlowers||g.flowers,m);g.wood.dispose();g.flowers.dispose();g.reflectionFlowers?.dispose();}
 tree(-22,48,22,false,true);tree(-34,23,12.5,true);
 for(let i=0;i<12;i++){tree(-34+rng.range(-4,4),5+i*4.2,rng.range(5.7,9.5),i%3===0);tree(29+rng.range(-2,5),3+i*4,rng.range(5,8),i%3===1);}
 // inferred: smaller blossom rows recede along both banks beyond the
 // existing grove, with a few higher crowns outside the side platforms.
 const gardenRng=engine.rng('D4-xuande-garden');
 for(const sign of [-1,1])for(let i=0;i<4;i++){
  const x=sign<0?-43-i*3:46+i*3,z=-8-i*8;
  tree(x,z,10.5+i*.5,i%3===0,false,true);
 }
 // inferred: sparse three-blade tufts and fallen petals dress the existing
 // olive ground without changing its broad value or drawing attention.
 const grass=new Geometry();
 for(const [x0,x1]of [[-46,-31],[25,47]])for(let i=0;i<280;i++){
  const p=V(gardenRng.range(x0,x1),.065,gardenRng.range(-12,62)),a=gardenRng.range(0,Math.PI*2),c=new THREE.Color(gardenRng.pick(['#a4a572','#919a62','#b1af78','#87915e']));
  for(let j=0;j<3;j++)grass.blade(p,gardenRng.range(.14,.34),gardenRng.range(.035,.075),V(Math.cos(a+j)*.5,1,Math.sin(a+j)*.5),c,.025,a+j);
 }
 const gg=grass.build();leaf.add(gg,undefined,'#ffffff',1,0,88);gg.dispose();
 for(const x of [[-43,-31],[25,43]]){
  const g=scatteredPetals(gardenRng,{count:160,x,z:[-8,60],scale:1});leaf.add(g);g.dispose();
 }
 const ground=groundPetals(engine.rng('S1-lying-petals'),{count:18,x:[-9,8],z:[45,56],scale:2.5});leaf.add(ground.petals);ground.petals.dispose();
 const petalShadows=new PaintBatch();petalShadows.add(ground.shadows);ground.shadows.dispose();
 const petals=scatteredPetals(rng,{count:650,x:[-13,22],z:[1,44],scale:1.25});leaf.add(petals);petals.dispose();
 for(const k of families)engine.add(keep(batches[k].mesh(paintMaterial(time,k,{profile:'xuande'}),'xuande-'+k)),{castShadow:false,receiveShadow:false});
 const reflection=new THREE.Scene();for(const k of families){const m=paintMaterial(time,k,{profile:'xuande',reflection:true});m.alphaToCoverage=false;reflection.add(keepReflection(reflected[k].mesh(m,'xuande-reflection-'+k)));}
 halls.dispose();
 const contact=paintMaterial(time,'leaf',{profile:'xuande'});contact.transparent=true;contact.depthWrite=false;contact.alphaToCoverage=false;
 engine.add(petalShadows.mesh(contact,'petal-contact-shadows'),{castShadow:false,receiveShadow:false});
 // Source crane silhouette with painted pigments, 0.18 Hz wing beats and glide.
 for(const [i,p]of [[0,[11,35.5,-3]],[1,[28,36,-4]],[2,[44,30,-8]]]){
  const g=buildCrane({far:true}),batch=new PaintBatch();batch.add(g);g.dispose();const m=paintMaterial(time,'leaf',{profile:'xuande'});
  m.vertexShader=m.vertexShader.replace('vec3 p=position;','vec3 p=position;p.y+=(.30+sin(paintTime*1.13+'+(.9+i*2.1).toFixed(6)+')*.60)*abs(p.x)*paintData.y;');
  const bird=batch.mesh(m,'painted-crane-'+i);bird.position.set(...p);bird.scale.setScalar(2.0);bird.rotation.y=-1.0;bird.rotation.z=.1;engine.add(bird,{castShadow:false,receiveShadow:false});
  engine.onUpdate(t=>{bird.position.x=p[0]+Math.sin(t*.08+i)*.8;bird.position.y=p[1]+Math.sin(t*.12+i)*.22;});
 }
 // The eight independently authored petals share one draw. Their original
 // local geometry, paint coordinates and deterministic transforms are retained.
 const petalRng=engine.rng('S1-falling-petals'),petalBatch=new PaintBatch(),petalsInFlight=[];
 for(let i=0;i<8;i++){
  const g=scatteredPetals(petalRng,{count:1,x:[0,0],z:[0,0],scale:1.5}),start=petalBatch.p.length/3;
  petalBatch.add(g);
  const positions=g.attributes.position.array.slice(),normals=g.attributes.normal.array.slice();g.dispose();
  const x=petalRng.range(-13,10),z=petalRng.range(36,63),phase=petalRng.range(0,11);
  petalsInFlight.push({i,start,positions,normals,x,z,phase});
 }
 const falling=petalBatch.mesh(paintMaterial(time,'leaf',{profile:'xuande'}),'falling-petals');
 falling.frustumCulled=false;engine.add(falling,{castShadow:false,receiveShadow:false});
 const point=new THREE.Vector3(),normal=new THREE.Vector3(),matrix=new THREE.Matrix4(),rotation=new THREE.Euler(),quaternion=new THREE.Quaternion(),unit=new THREE.Vector3(1,1,1);
 engine.onUpdate(t=>{
  const p=falling.geometry.attributes.position,n=falling.geometry.attributes.normal;
  for(const {i,start,positions,normals,x,z,phase}of petalsInFlight){
   rotation.set(.7+Math.sin(t*.43+i)*.5,t*.13+i,Math.cos(t*.35+i)*.7);
   quaternion.setFromEuler(rotation);
   point.set(x+Math.sin(t*.31+i)*.75,((phase-t*.22)%11+11)%11-.3,z+Math.sin(t*.17+i)*.4);
   matrix.compose(point,quaternion,unit);
   for(let j=0;j<positions.length/3;j++){
    point.fromArray(positions,j*3).applyMatrix4(matrix);p.setXYZ(start+j,point.x,point.y,point.z);
    normal.fromArray(normals,j*3).applyQuaternion(quaternion);n.setXYZ(start+j,normal.x,normal.y,normal.z);
   }
  }
  p.needsUpdate=true;n.needsUpdate=true;
 });
 return reflection;
}
