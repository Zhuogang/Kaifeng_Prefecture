import * as THREE from 'three';
import {PaintBatch} from './batch.js';
import {paintMaterial} from './materials.js';
import {paintedHalls} from './halls.js';
import {blossomGeometry,scatteredPetals} from './blossom.js';
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
 const centers=[-13.5,-5.1,3.3,11.7,20.1],opening=7.1;
 const outline=new THREE.Shape();outline.moveTo(-18,12);outline.lineTo(25,12);outline.lineTo(29,0);
 for(const x of [...centers].reverse()){outline.lineTo(x+opening/2,0);outline.lineTo(x+opening/2-.15,5.8);outline.lineTo(x-opening/2+.15,5.8);outline.lineTo(x-opening/2,0);}
 outline.lineTo(-22,0);outline.closePath();
 const platform=new THREE.ExtrudeGeometry(outline,{depth:9,steps:1,bevelEnabled:false}),pp=platform.attributes.position;
 for(let i=0;i<pp.count;i++)pp.setZ(i,-pp.getZ(i)+(1-pp.getY(i)/12)*2.1);
 platform.computeVertexNormals();plaster.add(platform,undefined,'#c8a16c',1,0,20);reflected.plaster.add(platform,undefined,'#c8a16c',1,0,20);platform.dispose();
 for(const x of centers){
  both('timber',[x,2.9,.40],[7.0,5.8,.26],'#994d3e',.86,false,21);
  both('timber',[x,5.95,1.45],[7.6,.43,.76],'#974a37',.82,true);
  both('timber',[x-3.60,2.9,1.05],[.24,5.8,1.5],'#654739',.63);
  both('timber',[x+3.60,2.9,1.05],[.24,5.8,1.5],'#654739',.63);
  for(const dx of [-.85,.85])for(let j=0;j<6;j++)both('timber',[x+dx,.8+j*.78,.56],[.045,.045,.045],'#b08b53',.8);
  both('timber',[x,2.9,.57],[.07,5.8,.10],'#6b3d32',.8);
 }
 both('stone',[3.5,12.10,-3],[43.6,.28,7.2],'#bfb196',1,true);
 // Side towers and joining galleries.
 wall(-38,-27,-5,11.2,1.8);wall(34,46,-5,11.2,1.8);
 wall(-27,-18,-6,10.4,1.2);wall(25,34,-6,10.4,1.2);
 const halls=paintedHalls(engine,batches,reflected,{timberColor:'#9e513d',ornamentHeight:3.1,smallOrnamentScale:.55,
  heroSpec:{frontBays:[4.4,4.6,4.6,5.2,4.6,4.6,4.4],sideBays:[4.6,4.6],columnHeight:5.2,caiGrade:2,tiao:3,bayFill:'lattice'},
  smallSpec:{frontBays:[2.5,2.8,2.5],sideBays:[3,3],columnHeight:3.8,caiGrade:4,tiao:2,bayFill:'lattice'},
  palette:{bracket:'#a4644d',plaster:'#584a40',window:'#7a6351'}});
 halls.hall([3.3,12.2,-4.5],1.22,true);
 halls.hall([-35.5,11.4,-5],1,false);halls.hall([40,11.4,-5],1,false);
 for(const [x,width]of [[-26.3,15.2],[29.7,11.5]])halls.hall([x,10.5,-5],1,false,false,{frontBays:[width/3,width/3,width/3],sideBays:[1.4],columnHeight:2.6,caiGrade:6,tiao:1,roof:'xuanshan',klass:'tingtang',bayFill:'open',ornaments:false});
 // Balcony and heavy square railings, with separate cap, collar and foot.
 function rail(x,z0,z1,spacing=2.4,y=0,scale=1){
  const steps=Math.ceil((z1-z0)/spacing);for(let j=0;j<=steps;j++){
   let z=z0+(z1-z0)*j/steps;const hero=x<0&&z>54&&z<56;
   if(hero)z+=.8;
   const postScale=hero?1.6:1;
   both('timber',[x,y+.84*scale*postScale,z],[.38*scale*postScale,1.68*scale*postScale,.40*scale*postScale],'#9e503e',.9,true);
   both('timber',[x,y+1.74*scale*postScale,z],[.54*scale*postScale,.27*scale,.56*scale*postScale],'#a45a43',1,true);
   both('timber',[x,y+.18*scale,z],[.36*scale,.36*scale,.37*scale],'#884936',.8,true);
   if(hero){for(const dy of [.32,1.95,2.30])both('timber',[x,y+dy,z],[.67,.08,.69],'#754a3a',.85,true);}
   if(j<steps)for(const yy of [.48,1.28])both('timber',[x,y+yy*scale,z+(z1-z0)/steps/2],[.28*scale,.27*scale,(z1-z0)/steps+.05],'#a75b46',.88,true);
  }
 }
 for(const x of [-12.6,17.0])rail(x,1.2,69,2.4,0,1.0);
 for(const [x,w,y]of [[3.3,40,12.25],[-35.5,9,11.4],[40,9,11.4]]){
  for(let i=0;i<=w;i+=1.2)both('timber',[x-w/2+i,y+.7,1.8],[.11,1.4,.13],'#b66e50');
  for(const dy of [.35,1.15])both('timber',[x,y+dy,1.8],[w,.13,.15],'#b06a4a');
 }
 // Pale avenue slabs and narrow stone canal kerbs. Dapple is material-local.
 stone.box([9.6,-.44,41],[47.8,.25,90],'#a49e93',1);
 for(let z=1;z<85;z+=2.2)for(let x=-11.8;x<39;x+=3.1){
  const c=new THREE.Color(rng.pick(['#c6b9a3','#cbbda7','#c2b7a6','#d0c2ae']));stone.box([x+(Math.floor(z/2.2)%2)*1.55,-.12,z],[3.08,.25,2.18],c,.98,0,true);
 }
 both('stone',[-13.7,-.05,39],[1.4,.65,82],'#bcb39e',.95,true);both('stone',[-29,-.05,39],[1.0,.65,82],'#bcb39e',.95,true);
 both('stone',[-41,-.3,35],[23,.7,76],'#aaad94',.9);
 function tree(x,z,h,white=false,hero=false){const g=blossomGeometry(engine.rng(`S1-blossom-${x}-${z}`),{height:h,hero,white}),m=new THREE.Matrix4().makeTranslation(x,0,z);bark.add(g.wood,m,'#ffffff',hero?.78:1);leaf.add(g.flowers,m);reflected.bark.add(g.wood,m);if(!hero)reflected.leaf.add(g.flowers,m);g.wood.dispose();g.flowers.dispose();}
 tree(-22,48,22,false,true);tree(-34,23,12.5,true);
 for(let i=0;i<12;i++){tree(-34+rng.range(-4,4),5+i*4.2,rng.range(5.7,9.5),i%3===0);tree(29+rng.range(-2,5),3+i*4,rng.range(5,8),i%3===1);}
 const heroPetals=scatteredPetals(engine.rng('S1-lying-petals'),{count:12,x:[-8,-5],z:[52,59],scale:1.9});leaf.add(heroPetals);heroPetals.dispose();
 const petals=scatteredPetals(rng,{count:400,x:[-13,22],z:[1,74]});leaf.add(petals);petals.dispose();
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
