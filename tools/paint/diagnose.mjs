// Identify which actual reflected family supplies the reported bright patches.
import fs from 'node:fs';
import path from 'node:path';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
let lock;const pause=ms=>new Promise(r=>setTimeout(r,ms));
for(;;){for(let i=0;i<Number(process.env.GPU_SLOTS||2);i++){const p=path.resolve(`out/.gpu.lock.${i}`);try{const f=fs.openSync(p,'wx');fs.writeSync(f,JSON.stringify({pid:process.pid,args:'S2 water diagnosis'}));fs.closeSync(f);lock=p;break;}catch(e){if(e.code!=='EEXIST')throw e;try{process.kill(JSON.parse(fs.readFileSync(p)).pid,0);}catch{fs.rmSync(p,{force:true});}}}if(lock)break;await pause(1000);}
const server=await startServer(0);let browser;
try{
 browser=await launchBrowser({width:1672,height:941});const page=await browser.newPage(),clean=observeErrors(page);
 await page.goto(`http://127.0.0.1:${server.port}/index.html?test=paint_zhouqiao&mode=still&w=1672&h=941&spp=1`);
 await page.waitForFunction('window.__READY||window.__RENDER_ERROR',{timeout:900000});
 const result=await page.evaluate(async()=>{
 const reflection=engine.registry.paint.reflection,material=reflection.water.material,source=material.fragmentShader,results=[];
 for(const mode of ['normal','raw','no-roof','no-sky','no-plaster','no-timber','no-stone']){
 material.fragmentShader=source.includes('reflected*=.21;')?source.replace('reflected*=.21;','vec3 rawReflection=reflected;reflected*=.21;'):source.replace('// inferred: bright jade pigment','vec3 rawReflection=reflected;\n        // inferred: bright jade pigment');
 if(mode!=='normal')material.fragmentShader=material.fragmentShader.replace('gl_FragColor=vec4(c,1.0);','gl_FragColor=vec4(rawReflection,1.0);');material.needsUpdate=true;
 for(const o of reflection.scene.children)o.visible=!(mode==='no-sky'?o.name.includes('painted-distance'):mode.startsWith('no-')&&o.name==='reflection-'+mode.slice(3));
 results.push({mode,image:await engine.renderStill(1),stats:{...window.__STATS}});
 }
 return results;});clean();
 for(const r of result){fs.writeFileSync(`out/S2/diagnose-${r.mode}.png`,Buffer.from(r.image.split(',')[1],'base64'));delete r.image;}
 fs.writeFileSync('out/S2/diagnose.json',JSON.stringify(result,null,2)+'\n');console.log('PASS: actual reflection-family isolation');
}finally{if(browser)await browser.close();await server.close();fs.rmSync(lock,{force:true});}
