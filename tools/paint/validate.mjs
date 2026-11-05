// D1 stills in register with D0, deterministic repeat and ten fixed-camera
// animation frames. Captures use the real shell's lightweight painted engine.
import fs from 'node:fs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const server=await startServer(0),browser=await launchBrowser({width:1280,height:720});
const results={};
try{
 for(const [scene,prefix]of [[0,'x'],[1,'v']]){
  const out=`out/D1b/${prefix}-shimmer`;fs.mkdirSync(out,{recursive:true});
  const page=await browser.newPage(),clean=observeErrors(page);
  await page.evaluateOnNewDocument(()=>{
   const raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),ids=[];
   window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};
   window.__stopRAF=()=>{ids.forEach(cancel);window.requestAnimationFrame=()=>0;};
  });
  await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=1`);
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
  clean();await page.evaluate(()=>window.__stopRAF());
  const save=(name,data)=>{const bytes=Buffer.from(data.split(',')[1],'base64');fs.writeFileSync(name,bytes);return bytes;};
  const capture=async(view,time=null)=>page.evaluate(async(view,time)=>{
   const e=window.engine;e.applyShot({id:'D1-'+view,...e.registry.paint.views[view]});
   if(time!==null)e.setTime(time);return e.renderStill(1);
  },view,time);
  let first;
  for(const view of [0,4,8]){
   const bytes=save(`out/D1b/${prefix}${view}.png`,await capture(view));if(view===0)first=bytes;
  }
  for(let i=0;i<10;i++)save(`${out}/f${String(i).padStart(4,'0')}.png`,await capture(0,i/30));
  const repeat=save(`out/D1b/${prefix}0-repeat.png`,await capture(0));
  results[scene]=await page.evaluate(()=>({startup:window.__STATS,reflection:engine.registry.paint.reflection.lastStats,
   meshes:engine.scene.children.filter(o=>o.isMesh).map(o=>({name:o.name,before:o.userData.trianglesBefore,triangles:o.geometry.index.count/3})),
   reflectionMeshes:engine.registry.paint.reflection.scene.children.map(o=>({name:o.name,before:o.userData.trianglesBefore,triangles:o.geometry.index.count/3}))}));
  results[scene].identical=first.equals(repeat);
  if(!results[scene].identical)throw new Error('Repeated frame changed');
  clean();console.log(prefix,JSON.stringify(results[scene]));await page.close();
 }
 fs.writeFileSync('out/D1b/validation.json',JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();await server.close();}
