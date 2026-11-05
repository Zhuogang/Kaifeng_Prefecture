import * as THREE from 'three';
import {PaintBatch} from './batch.js';
import {paintMaterial} from './materials.js';
import {paintedHalls} from './halls.js';
import {blossomGeometry,scatteredPetals} from './blossom.js';
import {chippedPost} from './stonework.js';
import {Geometry,V} from '../flora/geometry.js';
import {buildCrane} from '../modules/cranes.js';
// inferred: all composed dimensions/placements and wear fields here follow c1,
// not a surveyed site. Hall members, roof profile and brackets use yingzao.
export function composeXuande(engine,time){
 const families=['stone','plaster','timber','roof','bark','leaf'],batches=Object.fromEntries(families.map(k=>[k,new PaintBatch()])),reflected=Object.fromEntries(families.map(k=>[k,new PaintBatch()]));
 const rng=engine.rng('S1-xuande'),{stone,plaster,timber,bark,leaf}=batches;
 const both=(family,p,s,c,ao=1,chipped=false,kind=null)=>{batches[family].box(p,s,c,ao,0,chipped,kind);reflected[family].box(p,s,c,ao,0,false,kind);};
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
  both('timber',[x,2.8,4.0],[4.60,5.6,.32],'#994d3e',.86,false,21);
  both('timber',[x,5.532824,5.04],[6.30,.60,1.00],'#974a37',.82,true,22);
  both('timber',[x-2.50,2.9,4.78],[.30,5.8,1.4],'#654739',.63,false,22);
  both('timber',[x+2.50,2.9,4.78],[.30,5.8,1.4],'#654739',.63,false,22);
  for(const dx of [-.85,.85])for(let j=0;j<6;j++)both('timber',[x+dx,.8+j*.78,4.18],[.045,.045,.045],'#b08b53',.8);
  both('timber',[x,2.9,4.20],[.07,5.8,.10],'#6b3d32',.8);
 }
 both('stone',[3.0,12.10,-.6],[40.8,.28,9.3],'#bfb196',1,true);
 // Side towers and joining galleries.
 wall(-38,-27,-5,12.0,1.8);wall(34,46,-5,12.0,1.8);
 wall(-27,-18,-6,10.4,1.2);wall(25,34,-6,10.4,1.2);
 const halls=paintedHalls(engine,batches,reflected,{timberColor:'#9e513d',ornamentHeight:3.1,smallOrnamentScale:.55,tileProfile:true,ornamentProfile:'fishTail',smallPaint:{roofStretch:1.4},heroPaint:{bracketScale:[1.85,1.0,1.0],roofStretch:1.18},
  heroSpec:{frontBays:[4.4,4.6,4.6,5.2,4.6,4.6,4.4],sideBays:[4.6,4.6],columnHeight:4.5,caiGrade:2,tiao:3,bayFill:'open'},
  smallSpec:{frontBays:[2.5,2.8,2.5],sideBays:[1.3,1.3],columnHeight:5.3,caiGrade:4,tiao:2,bayFill:'open'},
  palette:{bracket:'#a4644d',plaster:'#584a40',window:'#7a6351'}});
 halls.hall([3.3,12.2,-4.5],1.22,true);
 // inferred: recessed rear interior in the open hall, with a warm floor bounce.
 both('timber',[3.3,16.1,-8.4],[40,7.8,.25],'#4d382f',1,false,24);
 for(let i=0;i<7;i++)both('timber',[-14.0+i*5.8,14.7,-7.8],[.24,5.0,.22],'#6c4232',.85);
 halls.hall([-35.5,12.2,-5],1,false);halls.hall([40,12.2,-5],1,false);
 for(const x of [-35.5,40])both('timber',[x,14.8,-6.1],[8.8,5.2,.20],'#543b31',1,false,24);
 for(const [x,width]of [[-26.3,15.2],[29.7,11.5]])halls.hall([x,10.5,-5],1,false,false,{frontBays:[width/3,width/3,width/3],sideBays:[1.4],columnHeight:2.6,caiGrade:6,tiao:1,roof:'xuanshan',klass:'tingtang',bayFill:'open',ornaments:false});
 // Balcony and heavy square railings, with separate cap, collar and foot.
 function rail(x,z0,z1,spacing=2.4,y=0,scale=1){
  const steps=Math.ceil((z1-z0)/spacing);for(let j=0;j<=steps;j++){
   let z=z0+(z1-z0)*j/steps;const hero=x<0&&z>54&&z<56;
   if(hero)z+=.8;
   const postScale=hero?1.6:1;
   if(hero){
    const g=chippedPost({width:.38*scale*postScale,height:1.68*scale*postScale,rng:engine.rng('S2-near-rail-post')}),m=new THREE.Matrix4().makeTranslation(x,y,z);
    timber.add(g,m,'#a25450',.92,0,29);reflected.timber.add(g,m,'#a25450',.92,0,29);g.dispose();
   }else both('timber',[x,y+.84*scale,z],[.42*scale,1.68*scale,.44*scale],'#98454b',.9,true,29);
   both('timber',[x,y+1.74*scale*postScale,z],[.54*scale*postScale,.30*scale*postScale,.56*scale*postScale],'#a4524d',1,true,29);
   both('timber',[x,y+.18*scale,z],[.46*scale*postScale,.36*scale,.48*scale*postScale],'#793640',.8,true,29);
   if(hero){for(const dy of [.32,2.43])both('timber',[x,y+dy,z],[.67,.08,.69],'#68343b',.85,true,29);}
   if(j<steps)for(const yy of [.48,1.28])both('timber',[x,y+yy*scale,z+(z1-z0)/steps/2],[.34*scale,.36*scale,(z1-z0)/steps+.05],'#9f4b4c',.88,true,29);
  }
 }
 for(const x of [-12.6,17.0])rail(x,1.2,69,2.4,0,1.0);
 for(const [x,w,y]of [[3.3,40,12.25],[-35.5,9,12.2],[40,9,12.2]]){
  for(let i=0;i<=w;i+=1.2)both('timber',[x-w/2+i,y+.7,4.0],[.11,1.4,.13],'#b66e50');
  for(const dy of [.35,1.15])both('timber',[x,y+dy,4.0],[w,.13,.15],'#b06a4a');
 }
 // Pale avenue slabs and narrow stone canal kerbs. Dapple is material-local.
 stone.box([9.6,-.44,41],[47.8,.25,90],'#a49e93',1);
 for(let z=1;z<85;z+=2.2)for(let x=-11.8;x<39;x+=3.1){
  const c=new THREE.Color(rng.pick(['#c6b9a3','#cbbda7','#c2b7a6','#d0c2ae']));stone.box([x+(Math.floor(z/2.2)%2)*1.55,-.12,z],[3.08,.25,2.18],c,.98,0,true);
 }
 for(const x of [-13.7,-29.0])for(let z=-2;z<82;z+=1.9)both('stone',[x,-.02,z],[x>-20?1.4:1.0,.58,1.88],'#bcb098',.95,true,32);
 rail(-29.7,1.2,69,3.0,0,.8);
 // inferred: soft grove ground extends behind the skyline; haze and actual
 // overlapping trees/roofs conceal its horizon rather than a hard backdrop join.
 both('stone',[-70,-.30,0],[80,.70,240],'#969c72',1,false,27);
 both('stone',[54,-.30,0],[70,.70,240],'#969c72',1,false,27);
 both('stone',[-29.8,-.30,39],[1.2,.70,82],'#9b9478',1,false,27);
 const horizonRng=engine.rng('S2-xuande-horizon');
 for(let layer=0;layer<2;layer++)for(let i=0;i<17;i++){
  const x=-100+i*13+horizonRng.range(-3,3),z=-55-layer*29-horizonRng.range(0,12);
  halls.hall([x,8.5+layer*.5,z],horizonRng.range(.55,.85),false,true);
 }
 const horizon=new Geometry();
 for(const sign of [-1,1])for(let i=0;i<13;i++){
  const x=sign*horizonRng.range(42,105),z=horizonRng.range(-95,-35),h=horizonRng.range(10,18);
  for(let j=0;j<8;j++)horizon.card(V(x+Math.cos(j*2.4)*h*.18,h*(.62+.10*Math.sin(j)),z+Math.sin(j*2.4)*h*.15),h*.55,h*.50,V(.15,0,1),new THREE.Color(horizonRng.pick(['#a8a98a','#9c9d82','#b7ac89','#a5aa98'])),{kind:28,sway:.04,roll:Math.sin(j)*.15,segments:2});
 }
 const hg=horizon.build();leaf.add(hg);reflected.leaf.add(hg);hg.dispose();
 function tree(x,z,h,white=false,hero=false){const g=blossomGeometry(engine.rng(`S1-blossom-${x}-${z}`),{height:h,hero,white}),m=new THREE.Matrix4().makeTranslation(x,0,z);bark.add(g.wood,m,'#ffffff',hero?.78:1);leaf.add(g.flowers,m);reflected.bark.add(g.wood,m);reflected.leaf.add(g.reflectionFlowers||g.flowers,m);g.wood.dispose();g.flowers.dispose();g.reflectionFlowers?.dispose();}
 tree(-22,48,22,false,true);tree(-34,23,12.5,true);
 for(let i=0;i<12;i++){tree(-34+rng.range(-4,4),5+i*4.2,rng.range(5.7,9.5),i%3===0);tree(29+rng.range(-2,5),3+i*4,rng.range(5,8),i%3===1);}
 const heroPetals=scatteredPetals(engine.rng('S1-lying-petals'),{count:80,x:[-9,8],z:[48,66],scale:2.5});leaf.add(heroPetals);heroPetals.dispose();
 const petals=scatteredPetals(rng,{count:650,x:[-13,22],z:[1,74],scale:1.25});leaf.add(petals);petals.dispose();
 for(const k of families)engine.add(batches[k].mesh(paintMaterial(time,k,{profile:'xuande'}),'xuande-'+k),{castShadow:false,receiveShadow:false});
 const reflection=new THREE.Scene();for(const k of families){const m=paintMaterial(time,k,{profile:'xuande'});m.alphaToCoverage=false;reflection.add(reflected[k].mesh(m,'xuande-reflection-'+k));}
 halls.dispose();
 // Source crane silhouette with painted pigments, 0.18 Hz wing beats and glide.
 for(const [i,p]of [[0,[11,35.5,-3]],[1,[28,36,-4]],[2,[44,30,-8]]]){
  const g=buildCrane({far:true}),batch=new PaintBatch();batch.add(g);g.dispose();const m=paintMaterial(time,'leaf',{profile:'xuande'});
  m.vertexShader=m.vertexShader.replace('vec3 p=position;','vec3 p=position;p.y+=(.30+sin(paintTime*1.13+'+(.9+i*2.1).toFixed(6)+')*.60)*abs(p.x)*paintData.y;');
  const bird=batch.mesh(m,'painted-crane-'+i);bird.position.set(...p);bird.scale.setScalar(2.0);bird.rotation.y=-1.0;bird.rotation.z=.1;engine.add(bird,{castShadow:false,receiveShadow:false});
  engine.onUpdate(t=>{bird.position.x=p[0]+Math.sin(t*.08+i)*.8;bird.position.y=p[1]+Math.sin(t*.12+i)*.22;});
 }
 // inferred: a sparse drift with deterministic reset below the paving;
 // eight separate petals keep orientation/glide simple and draw count bounded.
 const petalRng=engine.rng('S1-falling-petals');
 for(let i=0;i<8;i++){
  const g=scatteredPetals(petalRng,{count:1,x:[0,0],z:[0,0],scale:1.5}),batch=new PaintBatch();batch.add(g);g.dispose();
  const mesh=batch.mesh(paintMaterial(time,'leaf',{profile:'xuande'}),'falling-petal-'+i);
  const x=petalRng.range(-13,10),z=petalRng.range(36,63),phase=petalRng.range(0,11);engine.add(mesh,{castShadow:false,receiveShadow:false});
  engine.onUpdate(t=>{mesh.position.set(x+Math.sin(t*.31+i)*.75,((phase-t*.22)%11+11)%11-.3,z+Math.sin(t*.17+i)*.4);mesh.rotation.set(.7+Math.sin(t*.43+i)*.5,t*.13+i,Math.cos(t*.35+i)*.7);});
 }
 return reflection;
}
