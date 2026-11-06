// Reproducible V1 camera and fixed-camera animation evidence.
import fs from 'node:fs';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const out='out/V1',shimmer=process.argv.includes('--shimmer'),motion=process.argv.includes('--motion'),prefix=process.argv.includes('--scout')?'scout-':'';
fs.mkdirSync(out,{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width:1280,height:720});
const started=performance.now();
try{
 const page=await browser.newPage(),clean=observeErrors(page);
 await page.goto(`http://127.0.0.1:${server.port}/index.html?test=paint_zhouqiao&mode=still&w=1280&h=720&spp=1`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw Error(error);
 const metrics=[];
 const sheet=motion?new PNG({width:1920,height:720}):null;
 for(const index of motion?[5]:shimmer?[1,5,6]:[0,1,2,3,4,5,6]){
  const dir=motion?`${out}/motion-view6`:shimmer?`${out}/shimmer-view${index+1}`:out;fs.mkdirSync(dir,{recursive:true});
  for(let frame=0;frame<(motion?24:shimmer?10:1);frame++){
   const r=await page.evaluate(async(index,frame,motion)=>{
    const {paintCamera}=await import('./src/paint/playback.js');
    const t=motion?frame/2:frame/30;
    engine.setTime(t);paintCamera(engine,engine.registry.paint.viewSet[index].viewAt,motion?.5-.5*Math.cos(t*Math.PI/20):0);
    const before=performance.now(),data=await engine.renderStill(1);
    return {data,time:t,ms:performance.now()-before,calls:engine.renderer.info.render.calls,triangles:engine.renderer.info.render.triangles};
   },index,frame,motion);clean();
   const bytes=Buffer.from(r.data.split(',')[1],'base64');
   fs.writeFileSync(shimmer||motion?`${dir}/f${String(frame).padStart(4,'0')}.png`:`${out}/${prefix}view${index+1}.png`,bytes);
   if(motion&&frame%4===0){
    const p=PNG.sync.read(bytes),cell=frame/4,ox=cell%3*640,oy=Math.floor(cell/3)*360;
    for(let y=0;y<360;y++)for(let x=0;x<640;x++)for(let c=0;c<4;c++)sheet.data[((oy+y)*1920+ox+x)*4+c]=p.data[((y*2)*1280+x*2)*4+c];
   }
   delete r.data;metrics.push({view:index+1,frame,...r});console.log(JSON.stringify(metrics.at(-1)));
  }
 }
 if(sheet)fs.writeFileSync(`${out}/view6-motion.png`,PNG.sync.write(sheet));
 fs.writeFileSync(`${out}/${motion?'motion':shimmer?'shimmer':prefix+'centres'}-metrics.json`,JSON.stringify({totalMs:performance.now()-started,metrics},null,2)+'\n');
}finally{await browser.close();await server.close();}
