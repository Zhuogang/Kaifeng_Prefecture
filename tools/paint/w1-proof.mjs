// W1: real-route 1080p stills, motion, fixed-camera shimmer and AO cost.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const option=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
const out=option('out','out/W1'),shimmer=process.argv.includes('--shimmer'),motion=process.argv.includes('--motion'),probe=process.argv.includes('--ao-probe'),before=process.argv.includes('--before'),sweep=process.argv.includes('--sun-sweep');
assert(out==='out/W1'||out.startsWith('out/W1/'));
const views=option('views',shimmer?'2,4,7':'1,2,3,4,5,6,7').split(',').map(v=>+v-1),width=+(option('width',shimmer||probe?'1280':'1920')),height=width*9/16;
fs.mkdirSync(out,{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width,height}),started=performance.now();
try{
 const page=await browser.newPage(),clean=observeErrors(page),metrics=[];
 page.on('console',m=>{if(m.text().startsWith('[paint sunlight]'))console.log(m.text());});
 await page.evaluateOnNewDocument(()=>{const raf=requestAnimationFrame.bind(window),ids=[];window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};window.__stopRAF=()=>{ids.forEach(cancelAnimationFrame);window.requestAnimationFrame=()=>0;};});
 if(before){const originals=new Map(['src/paint/materials.js','src/modules/paint_zhouqiao.js'].map(name=>['/'+name,fs.readFileSync(`out/W1/before/${name}`,'utf8')]));
  await page.setRequestInterception(true);page.on('request',request=>{const body=originals.get(new URL(request.url()).pathname);if(body!==undefined)request.respond({status:200,contentType:'text/javascript',body});else request.continue();});}
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=1&ratio=1`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw Error(error);await page.evaluate(()=>window.__stopRAF());clean();
 if(probe)await page.evaluate(async()=>{
  const {Pipeline}=await import('./src/core/pipeline.js');
  // Bypass the old paint wrapper solely to measure the existing AO path.
  window.__probeAdd=Pipeline.prototype.addSample.bind(engine.pipeline);
  engine.pipeline.addSample=(scene,camera)=>{engine.quality.ao=window.__probeAO;engine.quality.aoSamples=8;engine.quality.aoSettleSamples=8;engine.quality.aoStrength=.85;return window.__probeAdd(scene,camera);};
 });
 for(const index of views)for(let frame=0;frame<(shimmer?10:motion||sweep?3:probe?2:1);frame++){
  const result=await page.evaluate(async(index,frame,shimmer,motion,probe,sweep)=>{
   if(sweep){const {ZHOU_SUN,bakeSunlight}=await import('./src/paint/sunlight.js');const presets=[[-.20,.574,.794,1.45],[-.35,.574,.740,1.6],[-.55,.574,.607,1.7]],preset=presets[frame];ZHOU_SUN.set(...preset.slice(0,3)).normalize();
    for(const scene of [engine.scene,engine.registry.paint.reflection.scene])scene.traverse(o=>{if(o.material?.uniforms?.paintSun)o.material.uniforms.paintSun.value.copy(ZHOU_SUN);});
    engine.registry.paint.sunlight.uniforms.paintSunEnergy.value=preset[3];bakeSunlight(engine,engine.registry.paint.lightTime);engine.registry.paint.reflection.fresh=true;
   }
   const {paintCamera}=await import('./src/paint/playback.js');engine.setTime(shimmer?frame/30:motion?frame*5:0);paintCamera(engine,engine.registry.paint.viewSet[index].viewAt,motion?frame/2:0);
   if(probe)window.__probeAO=frame===1;
   const start=performance.now(),data=await engine.renderStill(1);
   const result={data,ms:performance.now()-start,calls:engine.renderer.info.render.calls,triangles:engine.renderer.info.render.triangles,ao:engine.quality.ao};
   if(probe){const gl=engine.renderer.getContext(),times=[];for(let i=0;i<5;i++){const start=performance.now();engine.renderInteractive(true);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));times.push(performance.now()-start);}result.frameMs=times.slice(1).reduce((a,b)=>a+b)/4;}
   return result;
  },index,frame,shimmer,motion,probe,sweep);clean();
  const dir=shimmer?`${out}/shimmer-view${index+1}`:motion?`${out}/motion-view${index+1}`:out;fs.mkdirSync(dir,{recursive:true});
  const name=shimmer||motion?`f${String(frame).padStart(4,'0')}.png`:sweep?`sun${frame}-view${index+1}.png`:probe?`view${index+1}-ao${frame}.png`:`view${index+1}.png`;
  fs.writeFileSync(`${dir}/${name}`,Buffer.from(result.data.split(',')[1],'base64'));delete result.data;
  metrics.push({view:index+1,frame,...result});console.log(JSON.stringify(metrics.at(-1)));
 }
 const startup=await page.evaluate(()=>window.__STATS);
 const light=await page.evaluate(()=>{const light=engine.registry.paint.sunlight;return light?{bakeMs:light.bakeMs,calls:light.calls,triangles:light.triangles,mapSize:light.mapSize,direction:light.direction,bounds:light.bounds}:null;});
 fs.writeFileSync(`${out}/${probe?'ao-probe':shimmer?'shimmer':motion?'motion':'render'}-metrics.json`,JSON.stringify({totalMs:performance.now()-started,startup,light,metrics},null,2)+'\n');
}finally{await browser.close();await server.close();}
