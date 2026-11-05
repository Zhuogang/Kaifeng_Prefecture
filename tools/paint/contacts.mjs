// Compare matched object/reflected column faces in the delivered image. The
// jade mixture is included, so this reports final perceived value, not opacity.
import fs from 'node:fs';
import * as THREE from 'three';
import {PNG} from 'pngjs';
import {paintView} from '../../src/modules/paint_zhouqiao.js';
import {BRIDGE} from '../../src/paint/composition.js';
const img=PNG.sync.read(fs.readFileSync(process.argv[2]||'out/S1/zhouqiao/view0.png')),view=paintView(),camera=new THREE.PerspectiveCamera(view.fov,img.width/img.height,.15,900);
camera.position.set(...view.pos);camera.lookAt(...view.target);camera.updateMatrixWorld();
function sample(p){const q=new THREE.Vector3(...p).project(camera),x=Math.round((q.x+1)/2*img.width),y=Math.round((1-q.y)/2*img.height),l=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const k=((y+dy)*img.width+x+dx)*4;l.push((img.data[k]*.2126+img.data[k+1]*.7152+img.data[k+2]*.0722)/255);}l.sort((a,b)=>a-b);return {xy:[x,y],L:l[12]};}
const values=[];for(const i of [6,9,12,15,18]){const x=BRIDGE.start+2.6*i,z=-17+BRIDGE.skew*x+BRIDGE.offset+.52,y=1.20*(1+BRIDGE.fall*x/3),face=sample([x,y,z]),reflection=sample([x,-y,z]);values.push({x,face,reflection,ratio:reflection.L/face.L});}
const report={values,meanRatio:values.reduce((s,v)=>s+v.ratio,0)/values.length,note:'5x5 median samples on matched front-face points, not the whole columns region. Includes jade body, ripples and post output.'};fs.writeFileSync('out/S1/column-reflections.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
