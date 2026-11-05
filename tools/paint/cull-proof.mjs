// Compare each compacted batch with its original geometry in the same engine.
import fs from 'node:fs';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const server=await startServer(0),browser=await launchBrowser({width:1280,height:720}),results={};
try{for(const scene of [0,1]){
 const page=await browser.newPage(),clean=observeErrors(page);
 await page.evaluateOnNewDocument(()=>{
  const raf=requestAnimationFrame.bind(window),ids=[];
  window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};
  window.__stopRAF=()=>{ids.forEach(cancelAnimationFrame);window.requestAnimationFrame=()=>0;};
 });
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=1`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 clean();await page.evaluate(()=>window.__stopRAF());results[scene]=[];
 const capture=async index=>{
  const data=await page.evaluate(async index=>{
   const e=window.engine,records=e.registry.paint.culling.flatMap(x=>x.meshes),record=records[index];
   e.applyShot({id:'cull-proof',...e.registry.paint.views[0]});
   const saved=record?.mesh.geometry;if(record)record.mesh.geometry=record.source;
   try{return await e.renderStill(1);}finally{if(record)record.mesh.geometry=saved;}
  },index);
  return Buffer.from(data.split(',')[1],'base64');
 };
 const baseline=PNG.sync.read(await capture(-1));
 const names=await page.evaluate(()=>engine.registry.paint.culling.flatMap(x=>x.meshes).map(x=>x.mesh.name));
 for(let i=0;i<names.length;i++){
  const bytes=await capture(i),p=PNG.sync.read(bytes);let changed=0,large=0,sum=0,max=0;
  for(let j=0;j<p.data.length;j+=4){let d=0;for(let c=0;c<3;c++){const v=Math.abs(p.data[j+c]-baseline.data[j+c]);d=Math.max(d,v);sum+=v;}changed+=d>0;large+=d>3;max=Math.max(max,d);}
  const row={name:names[i],changed,over3:large,max,mean:sum/(p.width*p.height*3)};
  results[scene].push(row);console.log(scene,JSON.stringify(row));
  if(large>20)fs.writeFileSync(`out/D1b/cull-${scene}-${i}.png`,bytes);
 }
 clean();await page.close();
}fs.writeFileSync('out/D1b/cull-proof.json',JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();await server.close();}
