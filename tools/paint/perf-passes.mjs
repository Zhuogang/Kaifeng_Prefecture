// Completed per-pass wall time through the real scroll route. Read one pixel
// after every draw so driver batching cannot hide work in the next pass.
// node tools/paint/perf-passes.mjs [--out out/D4/passes.json] [--frames 6]
import fs from 'node:fs';
import {launchBrowser, observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const option=(n,d)=>{const i=process.argv.indexOf('--'+n);return i<0?d:process.argv[i+1];};
const out=option('out','out/D4/passes.json'), frames=+option('frames',6);
fs.mkdirSync('out/D4',{recursive:true});
const server=await startServer(0),browser=await launchBrowser({width:1280,height:720}),results={};
try {
 for(const scene of [0,1]){
  const page=await browser.newPage(),clean=observeErrors(page);
  page.on('console',m=>{if(m.type()==='error'||m.text().includes('[scroll]'))console.log(m.text());});
  page.on('pageerror',e=>console.log(e.message));
  await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=.75`);
  await page.waitForFunction('window.__scroll?.ready() || window.__RENDER_ERROR',{timeout:300000});
  clean();
  await page.waitForFunction('__scroll.status().pixelRatio <= .75',{timeout:120000});
  await page.evaluate(async()=>{__scroll.scrub(.5);for(let i=0;i<3;i++)await new Promise(requestAnimationFrame);});
  results[scene]=await page.evaluate(async(frames,profileMeshes,analytic,full,legacyWind)=>{
   const e=window.engine,r=e.renderer,p=e.pipeline,gl=r.getContext(),pixel=new Uint8Array(4);
   if(analytic){
    const {paintMaterial}=await import('./src/paint/materials.js');
    for(const group of e.registry.paint.culling)for(const {mesh}of group.meshes){
     const old=mesh.material,time={value:e.time,windTime:old.uniforms.paintWindTime};
     const material=paintMaterial(time,old.name.slice('gouache-'.length),{profile:__scroll.scene()?'zhouqiao':'xuande'});
     material.alphaToCoverage=old.alphaToCoverage;mesh.material=material;
    }
   }
   if(full)for(const group of e.registry.paint.culling)for(const record of group.meshes)record.mesh.geometry=record.source;
   if(legacyWind){
    const materials=new Set();
    for(const scene of [e.scene,e.registry.paint.reflection.scene])scene.traverse(o=>{if(o.isMesh)materials.add(o.material);});
    for(const material of materials)if(material.vertexShader?.includes('paintWindTime')){
     material.vertexShader=material.vertexShader.replace('p.x+=dot(paintWind.xy,paintWindTime.xy);','p.x+=sin(paintTime*.55+paintData.z*.6)*.075*paintData.y;')
      .replace('p.z+=dot(paintWind.zw,paintWindTime.zw);','p.z+=sin(paintTime*.43+paintData.z*.5)*.045*paintData.y;');
     material.needsUpdate=true;
    }
   }
   const finish=()=>{const rt=r.getRenderTarget();r.setRenderTarget(null);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);r.setRenderTarget(rt);};
   const ref=e.registry.paint.reflection,water=ref.water,hook=water.onBeforeRender;
   __scroll.scrub(.5);
   const samples={reflection:[],main:[],accumulation:[],wash:[],output:[]};
   const measure=(key,fn)=>{const start=performance.now();fn();finish();samples[key].push(performance.now()-start);};
   const inventory=scene=>scene.children.filter(o=>o.isMesh).map(o=>({name:o.name,triangles:(o.geometry.index?.count??o.geometry.attributes.position.count)/3}));
   e.renderInteractive(true);finish();
   try{for(let i=0;i<frames;i++){
    measure('reflection',()=>hook.call(water,r,e.scene,e.camera));
    water.onBeforeRender=()=>{};
    measure('main',()=>{r.setRenderTarget(p.sceneRT);r.clear(true,true,false);r.render(e.scene,e.camera);});
    measure('accumulation',()=>{
     const u=p.copyMat.uniforms,dst=1-p.accIndex;
     u.uAO.value=0;u.uNearFar.value.set(e.camera.near,e.camera.far);u.tNew.value=p.sceneRT.texture;
     u.tPrev.value=p.acc[p.accIndex].texture;u.uW.value=1;p.quad.material=p.copyMat;
     r.setRenderTarget(p.acc[dst]);p.quad.render(r);p.accIndex=dst;p.count=1;
    });
    measure('wash',()=>{e.registry.paint.outputStages.downsample();e.registry.paint.outputStages.soften();});
    measure('output',()=>e.registry.paint.outputStages.output(null));
    water.onBeforeRender=hook;
   }}finally{water.onBeforeRender=hook;}
   const meshTimes={};
   if(profileMeshes){
    const objects=e.scene.children.filter(o=>o.isMesh),visibility=objects.map(o=>o.visible);
    objects.forEach(o=>o.visible=false);water.onBeforeRender=()=>{};
    try{for(const object of objects){
      object.visible=true;const times=[];
      for(let i=0;i<4;i++){const start=performance.now();r.setRenderTarget(p.sceneRT);r.clear();r.render(e.scene,e.camera);finish();times.push(performance.now()-start);}
      meshTimes[object.name]=+(times.slice(1).reduce((a,b)=>a+b)/3).toFixed(2);object.visible=false;
    }}finally{objects.forEach((o,i)=>o.visible=visibility[i]);water.onBeforeRender=hook;}
   }
   return {milliseconds:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,+(v.reduce((a,b)=>a+b)/v.length).toFixed(2)])),samples,meshTimes,
    reflectionSize:[ref.width,ref.height],startup:__STATS,main:inventory(e.scene),reflection:inventory(ref.scene),gpu:__GPU_INFO};
  },frames,process.argv.includes('--meshes'),process.argv.includes('--analytic'),process.argv.includes('--full'),process.argv.includes('--legacy-wind'));
  clean();console.log('scene',scene,JSON.stringify(results[scene]));await page.close();
 }
 fs.writeFileSync(out,JSON.stringify({frames,results},null,2)+'\n');
}finally{await browser.close();await server.close();}
