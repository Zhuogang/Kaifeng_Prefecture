// Rows: fractions 0, .5, 1. Columns: centre, yaw-/pitch-,
// yaw-/pitch+, yaw+/pitch-, yaw+/pitch+. Uses the live look constants.
// node tools/paint/extremes.mjs xuande|zhouqiao
import fs from 'node:fs';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const scene=process.argv[2]||'xuande',out=`out/D1b/${scene}`;
if(!['xuande','zhouqiao'].includes(scene))throw new Error('Expected xuande or zhouqiao');
fs.mkdirSync(out,{recursive:true});
const w=640,h=360,sheet=new PNG({width:w*5,height:h*3});
const server=await startServer(0),browser=await launchBrowser({width:w,height:h});
console.log('browser ready',server.port);
try{
 const page=await browser.newPage(),clean=observeErrors(page);
 page.on('pageerror',e=>console.log(e.message));
 page.on('console',m=>{if(m.type()==='error'||m.text().includes('[scroll]'))console.log(m.text());});
 console.log('page ready');
 await page.evaluateOnNewDocument(()=>{
  const raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),ids=[];
  window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};
  window.__stopRAF=()=>{ids.forEach(cancel);window.requestAnimationFrame=()=>0;};
 });
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene==='xuande'?0:1}&ratio=1`,{timeout:60000});
 console.log('loaded');
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 if(await page.evaluate(()=>window.__RENDER_ERROR))throw new Error(await page.evaluate(()=>window.__RENDER_ERROR));
 await page.evaluate(()=>window.__stopRAF());
 for(let row=0;row<3;row++)for(let col=0;col<5;col++){
  const data=await page.evaluate(async(row,col)=>{
   const {paintCamera,LOOK_YAW,LOOK_PITCH}=await import('./src/paint/playback.js');
   const corners=[[0,0],[-1,-1],[-1,1],[1,-1],[1,1]],e=window.engine;
   e.setTime(0);paintCamera(e,e.registry.paint.viewAt,row/2,corners[col][0]*LOOK_YAW,corners[col][1]*LOOK_PITCH);
   return e.renderStill(1);
  },row,col);
  clean();const bytes=Buffer.from(data.split(',')[1],'base64'),p=PNG.sync.read(bytes);
  fs.writeFileSync(`${out}/extreme-${row}-${col}.png`,bytes);
  PNG.bitblt(p,sheet,0,0,w,h,col*w,row*h);
 }
 fs.writeFileSync(`${out}/extremes.png`,PNG.sync.write(sheet));
 console.log(`${out}/extremes.png: 15 views, no browser/shader errors`);
}finally{await browser.close();await server.close();}
