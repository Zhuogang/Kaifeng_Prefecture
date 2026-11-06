// X1: real-route Xuande stills, fixed-camera shimmer, path frames and W0 pairs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const option=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
const out=option('out','out/X1'),motion=process.argv.includes('--motion'),shimmer=process.argv.includes('--shimmer'),before=process.argv.includes('--before'),reflectionHash=process.argv.includes('--reflection-hash'),corners=process.argv.includes('--corners');
assert(out==='out/X1'||out.startsWith('out/X1/'));
const fractions=option('fractions',shimmer?'0,1':'0,.5,1').split(',').map(Number),width=+option('width',shimmer?'1280':'1920'),height=width*9/16;
const scene=+option('scene','0');
fs.mkdirSync(out,{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width,height}),started=performance.now();
try{
 const page=await browser.newPage(),clean=observeErrors(page),metrics=[];
 page.on('console',m=>{if(m.text().startsWith('[paint '))console.log(m.text());});
 await page.evaluateOnNewDocument(()=>{const raf=requestAnimationFrame.bind(window),ids=[];window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};window.__stopRAF=()=>{ids.forEach(cancelAnimationFrame);window.requestAnimationFrame=()=>0;};});
 if(before){const files=['materials','strokes','tower-detail','sunlight','marks','halls','xuande','blossom'].map(n=>'src/paint/'+n+'.js').concat('src/modules/paint_xuande.js');
  const originals=new Map(files.map(name=>['/'+name,fs.readFileSync('out/X1/before/'+name,'utf8')]));
  await page.setRequestInterception(true);page.on('request',r=>{const body=originals.get(new URL(r.url()).pathname);if(body!==undefined)r.respond({status:200,contentType:'text/javascript',body});else r.continue();});}
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=1`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw Error(error);await page.evaluate(()=>window.__stopRAF());clean();
 const sheet=motion?new PNG({width:1920,height:720}):null;
 for(const fraction of motion?[0]:fractions)for(let frame=0;frame<(motion?24:shimmer?10:corners?5:1);frame++){
  const f=motion?frame/23:fraction;
  const result=await page.evaluate(async(f,frame,motion,shimmer,reflectionHash,corners)=>{
   const {paintCamera,LOOK_YAW,LOOK_PITCH}=await import('./src/paint/playback.js');
   const corner=corners?[[0,0],[-1,-1],[-1,1],[1,-1],[1,1]][frame]:[0,0];
   engine.setTime(motion?f*40:shimmer?frame/30:0);paintCamera(engine,engine.registry.paint.viewAt,f,corner[0]*LOOK_YAW,corner[1]*LOOK_PITCH);
   const start=performance.now(),data=await engine.renderStill(1),r=engine.renderer.info.render;
   const result={data,ms:performance.now()-start,calls:r.calls,triangles:r.triangles};
   if(reflectionHash){
    const THREE=await import('three'),target=engine.registry.paint.reflection.target;
    const pixels=target.texture.type===THREE.HalfFloatType?new Uint16Array(target.width*target.height*4):target.texture.type===THREE.FloatType?new Float32Array(target.width*target.height*4):new Uint8Array(target.width*target.height*4);
    engine.renderer.readRenderTargetPixels(target,0,0,target.width,target.height,pixels);
    const digest=await crypto.subtle.digest('SHA-256',pixels.buffer);
    result.reflection={width:target.width,height:target.height,type:target.texture.type,sha256:Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')};
   }
   return result;
  },f,frame,motion,shimmer,reflectionHash,corners);clean();
  const dir=motion?`${out}/motion`:shimmer?`${out}/shimmer-f${fraction}`:out;fs.mkdirSync(dir,{recursive:true});
  const name=motion||shimmer?`f${String(frame).padStart(4,'0')}.png`:corners?`f${f}-corner${frame}.png`:`f${f}.png`,bytes=Buffer.from(result.data.split(',')[1],'base64');fs.writeFileSync(`${dir}/${name}`,bytes);delete result.data;
  if(!motion&&!shimmer){
    const p=PNG.sync.read(bytes);let black=0;for(let i=0;i<p.data.length;i+=4)if(p.data[i]<=6&&p.data[i+1]<=6&&p.data[i+2]<=6)black++;
    result.nearBlackPercent=100*black/(p.width*p.height);assert(result.nearBlackPercent<=.05);
    assert(result.calls<=50&&result.triangles<=1600000);
  }
  if(sheet){const p=PNG.sync.read(bytes),ox=(frame%6)*320,oy=Math.floor(frame/6)*180;for(let y=0;y<180;y++)for(let x=0;x<320;x++)for(let c=0;c<4;c++)sheet.data[((oy+y)*1920+ox+x)*4+c]=p.data[(Math.floor(y*p.height/180)*p.width+Math.floor(x*p.width/320))*4+c];}
  metrics.push({fraction:f,frame,...result});console.log(JSON.stringify(metrics.at(-1)));
 }
 if(sheet)fs.writeFileSync(`${out}/motion-sheet.png`,PNG.sync.write(sheet));
 const extra=await page.evaluate(()=>{const {sunlight,marks}=engine.registry.paint;return {startup:window.__STATS,light:sunlight?{bakeMs:sunlight.bakeMs,calls:sunlight.calls,triangles:sunlight.triangles,structureCalls:sunlight.structureCalls,structureTriangles:sunlight.structureTriangles,direction:sunlight.direction,bounds:sunlight.bounds}:null,marks:marks?{bakeMs:marks.bakeMs,size:marks.size}:null};});
 fs.writeFileSync(`${out}/${motion?'motion':shimmer?'shimmer':corners?'corners':'render'}-metrics.json`,JSON.stringify({totalMs:performance.now()-started,...extra,metrics},null,2)+'\n');
}finally{await browser.close();await server.close();}
