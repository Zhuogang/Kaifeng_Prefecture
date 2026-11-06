// X2: real-route native views, reflection hashes, motion and fixed-camera frames.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const option=(n,d)=>{const i=process.argv.indexOf('--'+n);return i<0?d:process.argv[i+1];};
const out=option('out','out/X2'),scene=+option('scene','1'),motion=process.argv.includes('--motion'),shimmer=process.argv.includes('--shimmer'),before=process.argv.includes('--before'),reflection=process.argv.includes('--reflection-hash');
assert(out==='out/X2'||out.startsWith('out/X2/'));
const views=option('views',scene===0||motion?'1':shimmer?'1,2,4,7':'1,2,3,4,5,6,7').split(',').map(n=>+n-1),fractions=option('fractions',shimmer?'0,1':'0').split(',').map(Number),width=+option('width',shimmer?'1280':'1920'),height=width*9/16;
fs.mkdirSync(out,{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width,height}),started=performance.now();
try{
 const page=await browser.newPage(),clean=observeErrors(page),metrics=[];
 await page.evaluateOnNewDocument(()=>{const raf=requestAnimationFrame.bind(window),ids=[];window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};window.__stopRAF=()=>{ids.forEach(cancelAnimationFrame);window.requestAnimationFrame=()=>0;};});
 if(before){const original=new Map();for(const dir of ['src/paint','src/modules'])for(const name of fs.readdirSync('out/X2/before/'+dir))if(name.endsWith('.js'))original.set('/'+dir+'/'+name,fs.readFileSync('out/X2/before/'+dir+'/'+name,'utf8'));
  await page.setRequestInterception(true);page.on('request',r=>{const body=original.get(new URL(r.url()).pathname);if(body!==undefined)r.respond({status:200,contentType:'text/javascript',body});else r.continue();});}
 page.on('console',m=>{if(m.text().startsWith('[paint '))console.log(m.text());});
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=1`);await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw Error(error);await page.evaluate(()=>window.__stopRAF());if(process.argv.includes('--ao-off'))await page.evaluate(()=>engine.registry.paint.lightTime.contactAO=false);if(process.argv.includes('--stone-debug'))await page.evaluate(()=>{const m=engine.scene.getObjectByName('paint-stone').material;m.fragmentShader=m.fragmentShader.replace('vec3 shade=mix(', 'sun=0.;vec3 shade=mix(');m.needsUpdate=true;});clean();
 for(const view of views){const sheet=motion?new PNG({width:1920,height:720}):null;
  for(const fraction of motion?[0]:fractions)for(let frame=0;frame<(motion?24:shimmer?10:1);frame++){
   const f=motion?frame/23:fraction;
   const r=await page.evaluate(async(view,f,frame,motion,shimmer,reflection)=>{
    const {paintCamera}=await import('./src/paint/playback.js');const paint=engine.registry.paint;
    engine.setTime(motion?f*paint.viewSet[view].roundTrip/2:shimmer?frame/30:0);paintCamera(engine,paint.viewSet[view].viewAt,f);
    const start=performance.now(),data=await engine.renderStill(1),info=engine.renderer.info.render,result={data,ms:performance.now()-start,calls:info.calls,triangles:info.triangles};
    if(reflection){const target=paint.reflection.target,pixels=new Uint16Array(target.width*target.height*4);engine.renderer.readRenderTargetPixels(target,0,0,target.width,target.height,pixels);const digest=await crypto.subtle.digest('SHA-256',pixels.buffer);result.reflection={width:target.width,height:target.height,type:target.texture.type,sha256:Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')};}
    return result;
   },view,f,frame,motion,shimmer,reflection);clean();
   const dir=motion?`${out}/motion-view${view+1}`:shimmer?`${out}/shimmer-view${view+1}-f${fraction}`:out;fs.mkdirSync(dir,{recursive:true});
   const name=motion||shimmer?`f${String(frame).padStart(4,'0')}.png`:`view${view+1}-f${f}.png`,bytes=Buffer.from(r.data.split(',')[1],'base64');delete r.data;fs.writeFileSync(`${dir}/${name}`,bytes);
   if(!motion&&!shimmer&&f===0)fs.writeFileSync(`${dir}/view${view+1}.png`,bytes);
   const p=PNG.sync.read(bytes);let black=0;for(let i=0;i<p.data.length;i+=4)if(p.data[i]<=6&&p.data[i+1]<=6&&p.data[i+2]<=6)black++;
   r.nearBlackPercent=black/(width*height)*100;assert(r.nearBlackPercent<=.05);assert(r.calls<=50&&r.triangles<=1600000);
   if(sheet){const ox=frame%6*320,oy=Math.floor(frame/6)*180;for(let y=0;y<180;y++)for(let x=0;x<320;x++)for(let c=0;c<4;c++)sheet.data[((oy+y)*1920+ox+x)*4+c]=p.data[(Math.floor(y*height/180)*width+Math.floor(x*width/320))*4+c];}
   metrics.push({view:view+1,fraction:f,frame,...r});console.log(JSON.stringify(metrics.at(-1)));
  }
  if(sheet)fs.writeFileSync(`${out}/motion-view${view+1}-sheet.png`,PNG.sync.write(sheet));
 }
 const extra=await page.evaluate(async()=>{const p=engine.registry.paint,source=p.culling.filter(g=>!g.reflection).flatMap(g=>g.meshes).find(r=>r.mesh.name==='paint-leaf')?.source,leafGeometry={};if(source){for(const name of ['position','normal','uv','paintWind'])leafGeometry[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source.attributes[name].array.buffer)),n=>n.toString(16).padStart(2,'0')).join('');leafGeometry.index=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source.index.array.buffer)),n=>n.toString(16).padStart(2,'0')).join('');}return {startup:window.__STATS,leafGeometry,light:{ms:p.sunlight.bakeMs,calls:p.sunlight.calls,triangles:p.sunlight.triangles},marks:{ms:p.marks.bakeMs}};});
 fs.writeFileSync(`${out}/${motion?'motion':shimmer?'shimmer':'render'}-metrics.json`,JSON.stringify({totalMs:performance.now()-started,...extra,metrics},null,2)+'\n');
}finally{await browser.close();await server.close();}
