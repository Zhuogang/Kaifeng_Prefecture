// Paired source replay to distinguish Xuande frame-cost changes from host noise.
// Same real route, 960x540 framebuffer, scrub and RAF measurement as perf.mjs.
import fs from 'node:fs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const frames=24,out='out/W1',server=await startServer(0),browser=await launchBrowser({width:1280,height:720}),results=[];
const originals=new Map(['src/paint/materials.js','src/modules/paint_zhouqiao.js'].map(name=>['/'+name,fs.readFileSync(`${out}/before/${name}`,'utf8')]));
try{
 for(const before of [true,false,true,false]){
  const page=await browser.newPage(),clean=observeErrors(page);
  if(before){await page.setRequestInterception(true);page.on('request',request=>{const body=originals.get(new URL(request.url()).pathname);if(body!==undefined)request.respond({status:200,contentType:'text/javascript',body});else request.continue();});}
  await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=0&ratio=.75`);
  await page.waitForFunction('window.__scroll?.ready()',{timeout:300000});
  const record=await page.evaluate(async frames=>{
   __scroll.scrub(.5);const tick=()=>new Promise(requestAnimationFrame);for(let i=0;i<3;i++)await tick();
   const start=performance.now();for(let i=0;i<frames;i++){__scroll.scrub(.5);await tick();}
   return {ms:(performance.now()-start)/frames,...__scroll.status()};
  },frames);clean();results.push({before,...record});console.log(JSON.stringify(results.at(-1)));await page.close();
 }
 const mean=before=>results.filter(r=>r.before===before).reduce((sum,r)=>sum+r.ms,0)/2;
 const summary={frames,framebuffer:[960,540],beforeMs:mean(true),afterMs:mean(false),results};
 fs.writeFileSync(`${out}/perf-xuande-paired.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({beforeMs:summary.beforeMs,afterMs:summary.afterMs}));
}finally{await browser.close();await server.close();}
