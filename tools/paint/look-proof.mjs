// D1b fidelity audit: compare current paint with the reference analytic GLSL,
// and trimmed geometry with every original triangle, in the same engine.
import fs from 'node:fs';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
fs.mkdirSync('out/D1b',{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width:640,height:360}),results={};
const difference=(a,b)=>{
 const p=PNG.sync.read(a),q=PNG.sync.read(b);let changed=0,over3=0,sum=0,max=0;
 for(let i=0;i<p.data.length;i+=4){let d=0;for(let c=0;c<3;c++){const n=Math.abs(p.data[i+c]-q.data[i+c]);sum+=n;d=Math.max(d,n);}changed+=d>0;over3+=d>3;max=Math.max(max,d);}
 return {changed,over3,max,mean:sum/(p.width*p.height*3)};
};
try{for(const scene of [0,1]){
 const page=await browser.newPage(),clean=observeErrors(page);
 await page.evaluateOnNewDocument(()=>{
  const raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),ids=[];
  window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};
  window.__stopRAF=()=>{ids.forEach(cancel);window.requestAnimationFrame=()=>0;};
 });
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=1`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 clean();await page.evaluate(()=>window.__stopRAF());
 await page.evaluate(async scene=>{
  const {paintMaterial}=await import('./src/paint/materials.js');
  window.__audit=engine.registry.paint.culling.flatMap(group=>group.meshes.map(record=>{
   const original=record.mesh.material,kind=original.name.slice('gouache-'.length);
   const analytic=paintMaterial({value:0},kind,{profile:scene?'zhouqiao':'xuande'});
   analytic.alphaToCoverage=original.alphaToCoverage;
   return {...record,original,analytic,trimmed:record.mesh.geometry};
  }));
 },scene);
 results[scene]=[];
 for(let row=0;row<3;row++)for(let col=0;col<5;col++){
  const captures=[];
  for(const mode of ['current','analytic','full']){
   const data=await page.evaluate(async(row,col,mode)=>{
    const {paintCamera,LOOK_YAW,LOOK_PITCH}=await import('./src/paint/playback.js');
    const corners=[[0,0],[-1,-1],[-1,1],[1,-1],[1,1]];
    for(const r of window.__audit){r.mesh.material=mode==='analytic'?r.analytic:r.original;r.mesh.geometry=mode==='full'?r.source:r.trimmed;}
    engine.setTime(0);paintCamera(engine,engine.registry.paint.viewAt,row/2,corners[col][0]*LOOK_YAW,corners[col][1]*LOOK_PITCH);
    return engine.renderStill(1);
   },row,col,mode);
   captures.push(Buffer.from(data.split(',')[1],'base64'));
  }
  const result={fraction:row/2,corner:col,shader:difference(captures[0],captures[1]),culling:difference(captures[0],captures[2])};
  results[scene].push(result);console.log(scene,JSON.stringify(result));
  if(row===0&&col===0)fs.writeFileSync(`out/D1b/${scene?'v':'x'}-analytic.png`,captures[1]);
 }
 clean();await page.close();
}fs.writeFileSync('out/D1b/look-proof.json',JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();await server.close();}
