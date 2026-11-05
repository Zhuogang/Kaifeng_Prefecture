// Capture the real reflection-first adaptive rung, without changing policy.
// node tools/paint/water-rung.mjs [out/D4/rung]
import fs from 'node:fs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const out=process.argv[2]||'out/D4/rung';fs.mkdirSync(out,{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width:1920,height:1080}),results={};
try{
 for(const [scene,name]of [[0,'xuande'],[1,'zhouqiao']]){
  const page=await browser.newPage(),clean=observeErrors(page);
  await page.evaluateOnNewDocument(()=>{
   const raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),ids=[];
   window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};
   window.__stopRAF=()=>{ids.forEach(cancel);window.requestAnimationFrame=()=>0;};
  });
  await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}`);
  await page.waitForFunction('window.__scroll?.ready() || window.__RENDER_ERROR',{timeout:300000});clean();
  await page.waitForFunction('__scroll.status().qualityLevel>=2',{timeout:120000});
  await page.evaluate(()=>window.__stopRAF());
  const result=await page.evaluate(async()=>{
   const r=engine.registry.paint.reflection;
   if(r.scale!==.25||r.interval!==2)throw new Error('Expected real adaptive reflection rung');
   engine.applyShot({id:'D4-rung',...engine.registry.paint.views[0]});engine.setTime(0);r.fresh=true;
   const image=await engine.renderStill(2);
   return {image,status:__scroll.status(),reflection:{width:r.width,height:r.height,scale:r.scale,interval:r.interval},stats:__STATS};
  });clean();
  fs.writeFileSync(`${out}/${name}.png`,Buffer.from(result.image.split(',')[1],'base64'));delete result.image;
  results[name]=result;console.log(name,JSON.stringify(result));await page.close();
 }
 fs.writeFileSync(`${out}/metrics.json`,JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();await server.close();}
