// Scoped V1b rendering, motion and canvas-copy evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const out='out/V1b',shimmer=process.argv.includes('--shimmer'),motion=process.argv.includes('--motion'),ui=process.argv.includes('--ui'),accepted=process.argv.includes('--accepted');
const width=shimmer||accepted?1280:1920,height=shimmer||accepted?720:1080;
fs.mkdirSync(out,{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width,height}),started=performance.now();
try{
 const page=await browser.newPage(),clean=observeErrors(page);
 await page.goto(`http://127.0.0.1:${server.port}/index.html?${ui?'scene=1&view=5&ratio=1':`test=paint_zhouqiao&mode=still&w=${width}&h=${height}&spp=1`}`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw Error(error);
 if(ui){
  const result=await page.evaluate(()=>{
   const old=HTMLCanvasElement.prototype.toDataURL;let encoded=0,copied=0,copySize;
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   HTMLCanvasElement.prototype.toDataURL=function(){encoded++;throw Error('View changes must not encode PNGs');};
   CanvasRenderingContext2D.prototype.drawImage=function(...args){copied++;copySize=[this.canvas.width,this.canvas.height];return draw.apply(this,args);};
   try{__scroll.view(3);return {encoded,copied,copySize,view:__scroll.status().view,fraction:__scroll.fraction(),tag:document.getElementById('scroll-fade').tagName};}
   finally{HTMLCanvasElement.prototype.toDataURL=old;CanvasRenderingContext2D.prototype.drawImage=draw;}
  });
  assert(result.encoded===0&&result.copied===1&&result.copySize[0]<=1280&&result.tag==='CANVAS'&&result.view===3&&result.fraction===0);
  await new Promise(r=>setTimeout(r,1000));assert(await page.$eval('#scroll-fade',e=>e.hidden));
  await page.screenshot({path:`${out}/ui-canvas-fade.png`});clean();
  fs.writeFileSync(`${out}/ui.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }else{
  const stats=await page.evaluate(()=>window.__STATS),metrics=[],indices=accepted?[1,2,6]:shimmer||motion?[5]:[3,4,5];
  for(const index of indices){
   const dir=shimmer?`${out}/shimmer-view6`:motion?`${out}/motion-view6`:out;fs.mkdirSync(dir,{recursive:true});
   for(let frame=0;frame<(shimmer?10:motion?6:1);frame++){
    const r=await page.evaluate(async(index,time,motion)=>{
     const {paintCamera}=await import('./src/paint/playback.js');engine.setTime(time);
     paintCamera(engine,engine.registry.paint.viewSet[index].viewAt,motion ? .5-.5*Math.cos(time*Math.PI/20) : 0);
     const start=performance.now(),image=await engine.renderStill(1);
     return {image,ms:performance.now()-start,calls:engine.renderer.info.render.calls,triangles:engine.renderer.info.render.triangles};
    },index,shimmer?frame/30:motion?frame*2:0,motion);clean();
    const name=shimmer||motion?`${dir}/f${String(frame).padStart(4,'0')}.png`:`${out}/${accepted?'accepted':'scout'}-view${index+1}.png`;
    const bytes=Buffer.from(r.image.split(',')[1],'base64');fs.writeFileSync(name,bytes);delete r.image;
    if(accepted){
     const a=PNG.sync.read(bytes),b=PNG.sync.read(fs.readFileSync(`out/V1/view${index+1}.png`));let changed=0,max=0;
     for(let i=0;i<a.data.length;i++){const d=Math.abs(a.data[i]-b.data[i]);changed+=d>0;max=Math.max(max,d);}
     r.baseline={changedChannels:changed,max};assert.equal(max,0,`Accepted view ${index+1} changed`);
    }
    if(index===5&&!shimmer&&!motion){
     const raw=await page.evaluate(async()=>{
      const THREE=await import('three'),quad=engine.pipeline.quad,saved=quad.material;
      const mat=new THREE.ShaderMaterial({uniforms:{image:{value:engine.registry.paint.reflection.target.texture}},
       vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
       fragmentShader:'uniform sampler2D image;varying vec2 vUv;void main(){vec3 c=texture2D(image,vUv).rgb;gl_FragColor=vec4(pow(max(c,vec3(0.)),vec3(1./2.2)),1.);}'});
      try{quad.material=mat;engine.renderer.setRenderTarget(null);quad.render(engine.renderer);return engine.canvas.toDataURL('image/png');}
      finally{quad.material=saved;mat.dispose();}
     });
     fs.writeFileSync(`${out}/debug-view6-reflection.png`,Buffer.from(raw.split(',')[1],'base64'));
    }
    metrics.push({view:index+1,frame,...r});console.log(JSON.stringify(metrics.at(-1)));
   }
  }
  fs.writeFileSync(`${out}/${accepted?'accepted':shimmer?'shimmer':motion?'motion':'scout'}-metrics.json`,JSON.stringify({totalMs:performance.now()-started,stats,metrics},null,2)+'\n');
 }
}finally{await browser.close();await server.close();}
