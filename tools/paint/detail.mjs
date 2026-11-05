// D2 captures the approved composition at client resolution, with a deterministic
// repeat and optional fixed-camera animation frames. Uses the real painted shell.
import fs from 'node:fs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const option=(n,d)=>{const i=process.argv.indexOf('--'+n);return i<0?d:process.argv[i+1];};
const label=option('label','after'),w=+option('w',1920),h=+option('h',1080),spp=+option('spp',4),frames=+option('frames',0);
const out=`out/D2/${label}`;fs.mkdirSync(out,{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width:w,height:h}),results={};
try{for(const [scene,prefix]of [[0,'x'],[1,'v']]){
 const page=await browser.newPage(),clean=observeErrors(page);
 await page.evaluateOnNewDocument(()=>{
  const raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),ids=[];
  window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};
  window.__stopRAF=()=>{ids.forEach(cancel);window.requestAnimationFrame=()=>0;};
 });
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=1`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});clean();
 await page.evaluate(()=>window.__stopRAF());
 const capture=async(view,time,samples)=>{
  const data=await page.evaluate(async(view,time,samples)=>{
   engine.applyShot({id:'D2-'+view,...engine.registry.paint.views[view]});engine.setTime(time);
   return engine.renderStill(samples);
  },view,time,samples);clean();return Buffer.from(data.split(',')[1],'base64');
 };
 const first=await capture(0,0,spp);fs.writeFileSync(`${out}/${prefix}0.png`,first);
 const single=await capture(0,0,1),repeat=await capture(0,0,1);
 if(!single.equals(repeat))throw new Error('Repeated frame changed');
 for(let i=0;i<frames;i++){
  fs.mkdirSync(`${out}/${prefix}-shimmer`,{recursive:true});
  fs.writeFileSync(`${out}/${prefix}-shimmer/f${String(i).padStart(4,'0')}.png`,await capture(0,i/30,1));
 }
 results[scene]=await page.evaluate(()=>({...window.__STATS,reflection:engine.registry.paint.reflection.lastStats}));
 console.log(prefix,JSON.stringify(results[scene]));await page.close();
}fs.writeFileSync(`${out}/metrics.json`,JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();await server.close();}
