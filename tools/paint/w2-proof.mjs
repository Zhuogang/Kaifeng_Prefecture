// W2 evidence: real-route 1080p views, mark-cost pairs and path/shimmer frames.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const option=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
const out=option('out','out/W2'),motion=process.argv.includes('--motion'),shimmer=process.argv.includes('--shimmer'),probe=process.argv.includes('--mark-cost'),before=process.argv.includes('--before');
assert(out==='out/W2'||out.startsWith('out/W2/'));
const views=option('views',motion?'3,4':shimmer?'1,3,4,7':'1,2,3,4,5,6,7').split(',').map(v=>+v-1),width=+option('width',shimmer||probe?'1280':'1920'),height=width*9/16;
fs.mkdirSync(out,{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width,height}),started=performance.now();
try{
 const page=await browser.newPage(),clean=observeErrors(page),metrics=[];
 page.on('console',m=>{if(m.text().startsWith('[paint '))console.log(m.text());});
 await page.evaluateOnNewDocument(()=>{const raf=requestAnimationFrame.bind(window),ids=[];window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};window.__stopRAF=()=>{ids.forEach(cancelAnimationFrame);window.requestAnimationFrame=()=>0;};});
 if(before){const originals=new Map(['src/paint/materials.js','src/paint/atmosphere.js','src/paint/sunlight.js','src/paint/scene.js','src/modules/paint_zhouqiao.js'].map(name=>['/'+name,fs.readFileSync(`out/W2/before/${name}`,'utf8')]));
  await page.setRequestInterception(true);page.on('request',request=>{const body=originals.get(new URL(request.url()).pathname);if(body!==undefined)request.respond({status:200,contentType:'text/javascript',body});else request.continue();});}
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=1&ratio=1`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw Error(error);await page.evaluate(()=>window.__stopRAF());clean();
 for(const index of views){
  const sheet=motion?new PNG({width:1920,height:720}):null;
  for(let frame=0;frame<(motion?24:shimmer?10:probe?2:1);frame++){
   const result=await page.evaluate(async(index,frame,motion,shimmer,probe)=>{
    const {paintCamera}=await import('./src/paint/playback.js');const fraction=motion?frame/23:0;
    engine.setTime(motion?fraction*20:shimmer?frame/30:0);paintCamera(engine,engine.registry.paint.viewSet[index].viewAt,fraction);
    if(probe)engine.registry.paint.marks.uniforms.paintMarkStrength.value=frame;
    const start=performance.now(),data=await engine.renderStill(1),info=engine.renderer.info.render;
    const result={data,ms:performance.now()-start,calls:info.calls,triangles:info.triangles,fraction};
    if(probe){const gl=engine.renderer.getContext(),pixel=new Uint8Array(4),times=[];for(let i=0;i<5;i++){const start=performance.now();engine.renderInteractive(true);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);times.push(performance.now()-start);}result.frameMs=times.slice(1).reduce((a,b)=>a+b)/4;}
    return result;
   },index,frame,motion,shimmer,probe);clean();
   const dir=motion?`${out}/motion-view${index+1}`:shimmer?`${out}/shimmer-view${index+1}`:out;fs.mkdirSync(dir,{recursive:true});
   const name=motion||shimmer?`f${String(frame).padStart(4,'0')}.png`:probe?`view${index+1}-marks${frame}.png`:`view${index+1}.png`;
   const bytes=Buffer.from(result.data.split(',')[1],'base64');fs.writeFileSync(`${dir}/${name}`,bytes);delete result.data;
   if(sheet){const p=PNG.sync.read(bytes),ox=(frame%6)*320,oy=Math.floor(frame/6)*180;for(let y=0;y<180;y++)for(let x=0;x<320;x++)for(let c=0;c<4;c++)sheet.data[((oy+y)*1920+ox+x)*4+c]=p.data[(Math.floor(y*p.height/180)*p.width+Math.floor(x*p.width/320))*4+c];}
   metrics.push({view:index+1,frame,...result});console.log(JSON.stringify(metrics.at(-1)));
  }
  if(sheet)fs.writeFileSync(`${out}/motion-view${index+1}-sheet.png`,PNG.sync.write(sheet));
 }
 const extra=await page.evaluate(()=>{const {marks,sunlight}=engine.registry.paint;return {startup:window.__STATS,marks:marks?{bakeMs:marks.bakeMs,size:marks.size,cells:marks.cells}:null,sunlight:{bakeMs:sunlight.bakeMs}};});
 fs.writeFileSync(`${out}/${motion?'motion':shimmer?'shimmer':probe?'mark-cost':'render'}-metrics.json`,JSON.stringify({totalMs:performance.now()-started,...extra,metrics},null,2)+'\n');
}finally{await browser.close();await server.close();}
