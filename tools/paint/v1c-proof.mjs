// Scoped V1c evidence: 1080p scouts, 2x ceiling crops and fixed-camera shimmer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const out='out/V1c',diagnose=process.argv.includes('--diagnose'),shimmer=process.argv.includes('--shimmer'),motion=process.argv.includes('--motion'),accepted=process.argv.includes('--accepted'),hint=process.argv.includes('--hint');
const width=shimmer||accepted?1280:1920,height=shimmer||accepted?720:1080;
fs.mkdirSync(out,{recursive:true});
const crop=(bytes,name,box=[480,55,1000,230])=>{
 const p=PNG.sync.read(bytes),[x0,y0,w,h]=box,q=new PNG({width:w*2,height:h*2});
 for(let y=0;y<q.height;y++)for(let x=0;x<q.width;x++)for(let c=0;c<4;c++)q.data[(y*q.width+x)*4+c]=p.data[((y0+Math.floor(y/2))*p.width+x0+Math.floor(x/2))*4+c];
 fs.writeFileSync(`${out}/${name}`,PNG.sync.write(q));
};
const server=await startServer(0),browser=await launchBrowser({width,height}),started=performance.now();
try{
 const page=await browser.newPage(),clean=observeErrors(page),metrics=[];
 if(diagnose){
  // Replay the captured pre-change sources so the control remains repeatable
  // after the production ceiling has stopped using the stone-cell recipe.
  const originals=new Map(['src/paint/materials.js','src/paint/atmosphere.js','src/paint/scene.js','src/scroll/index.js']
   .map(name=>['/'+name,fs.readFileSync(`${out}/before/${name}`,'utf8')]));
  await page.setRequestInterception(true);page.on('request',request=>{
   const body=originals.get(new URL(request.url()).pathname);
   if(body!==undefined)request.respond({status:200,contentType:'text/javascript',body});else request.continue();
  });
 }
 if(hint){
  for(const scene of [0,1]){
   await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=1`);
   await page.waitForFunction('window.__scroll?.ready()',{timeout:300000});clean();
   const text=await page.$eval('#scroll-hint',e=>e.textContent);assert.equal(text.includes('1–7 views'),scene===1);metrics.push({scene,hint:text});
  }
 }else{
  await page.goto(`http://127.0.0.1:${server.port}/index.html?test=paint_zhouqiao&mode=still&w=${width}&h=${height}&spp=1`);
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
  const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw Error(error);
  const shoot=async(index,time=0,fraction=0)=>{
   const r=await page.evaluate(async(index,time,fraction)=>{
    const {paintCamera}=await import('./src/paint/playback.js');engine.setTime(time);paintCamera(engine,engine.registry.paint.viewSet[index].viewAt,fraction);
    const start=performance.now(),image=await engine.renderStill(1);
    return {image,ms:performance.now()-start,calls:engine.renderer.info.render.calls,triangles:engine.renderer.info.render.triangles,waterView:engine.registry.paint.reflection.water.material.uniforms.paintView.value};
   },index,time,fraction);clean();
   const bytes=Buffer.from(r.image.split(',')[1],'base64');delete r.image;return {bytes,...r};
  };
  for(const index of diagnose||shimmer||motion?[5]:accepted?[0,1,2,6]:[3,4,5]){
   const dir=shimmer?`${out}/shimmer-view6`:motion?`${out}/motion-view6`:out;fs.mkdirSync(dir,{recursive:true});
   for(let frame=0;frame<(shimmer?10:motion?6:diagnose?2:1);frame++){
    if(diagnose&&frame===1){
     const count=await page.evaluate(()=>{
      const line='c=paintedStone(c,q*1.3,vec2(1.75,2.8),vec4(.16,.10,.48,.015),vec2(.003,.009));';let changed=0;
      for(const scene of [engine.scene,engine.registry.paint.reflection.scene])scene.traverse(o=>{
       for(const mat of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){
        if(mat.fragmentShader?.includes(line)){mat.fragmentShader=mat.fragmentShader.replace(line,'');mat.needsUpdate=true;changed++;}
       }
      });return changed;
     });assert(count>0);console.log('diagnostic ceiling recipe removed from',count,'materials');
    }
    const r=await shoot(index,shimmer?frame/30:motion?frame*2:0,motion?.5-.5*Math.cos(frame*2*Math.PI/20):0);
    if(!diagnose)assert.equal(r.waterView,index,'Water view uniform is detached');
    const name=diagnose?`ceiling-${frame?'control':'before'}.png`:shimmer||motion?`f${String(frame).padStart(4,'0')}.png`:`${accepted?'accepted':'scout'}-view${index+1}.png`;
    fs.writeFileSync(`${dir}/${name}`,r.bytes);
    if(index===5&&!shimmer&&!accepted)crop(r.bytes,diagnose?`ceiling-${frame?'control':'before'}-2x.png`:motion?`ceiling-t${frame*2}-2x.png`:'ceiling-2x.png');
    if(index===5&&!shimmer&&!accepted&&!motion&&!diagnose)crop(r.bytes,'water-2x.png',[1050,710,700,300]);
    if(accepted){
     const a=PNG.sync.read(r.bytes),b=PNG.sync.read(fs.readFileSync(`out/V1b/view${index+1}.png`));let max=0,changed=0;
     for(let i=0;i<a.data.length;i++){const d=Math.abs(a.data[i]-b.data[i]);changed+=d>0;max=Math.max(max,d);}
     assert.equal(max,0,`Accepted view ${index+1} changed`);r.baseline={max,changed};
    }
    delete r.bytes;metrics.push({view:index+1,frame,...r});console.log(JSON.stringify(metrics.at(-1)));
   }
  }
  const dressing=await page.evaluate(()=>engine.registry.paint.viewDressing.filter(m=>m.name.startsWith('views45-')).map(m=>({name:m.name,triangles:m.geometry.index.count/3})));
  if(!diagnose)assert(dressing.reduce((sum,m)=>sum+m.triangles,0)<150000,'Bank dressing exceeds 150,000 triangles');
  metrics.push({dressing});
 }
 fs.writeFileSync(`${out}/${diagnose?'diagnose':shimmer?'shimmer':motion?'motion':accepted?'accepted':hint?'hint':'scout'}-metrics.json`,JSON.stringify({totalMs:performance.now()-started,metrics},null,2)+'\n');
}finally{await browser.close();await server.close();}
