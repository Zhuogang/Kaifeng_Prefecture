// Read-only visual isolation of the real planar reflection and the water mixing.
import fs from 'node:fs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const server=await startServer(0);let browser;
try{
 browser=await launchBrowser({width:1008,height:567});const page=await browser.newPage(),clean=observeErrors(page);
 await page.goto(`http://127.0.0.1:${server.port}/index.html?test=paint_zhouqiao&mode=still&w=1008&h=567&spp=1`);
 await page.waitForFunction('window.__READY||window.__RENDER_ERROR',{timeout:900000});
 const result=await page.evaluate(async()=>{
 const water=engine.registry.paint.reflection.water,material=water.material,source=material.fragmentShader,results=[];
 for(const mode of ['mixed','mirror','undistorted']){
 let code=source;
 if(mode!=='mixed')code=code.replace('gl_FragColor=vec4(c,1.0);','gl_FragColor=vec4(reflected,1.0);');
 if(mode==='undistorted')code=code.replace('vec2 shifted=p+vec2(sway*1.2+(broad-.5), (broad-.5)*.6)*ripple;','vec2 shifted=p;');
 material.fragmentShader=code;material.needsUpdate=true;
 results.push({mode,image:await engine.renderStill(1),stats:{...window.__STATS}});
 }
 material.fragmentShader=source;material.needsUpdate=true;
 const THREE=await import('three');const landmarks=[];
 for(const x of [-12,4,20,32]){
 const z=-19.6-.15*x-5.7,y=3.18-.035*x+.18*Math.max(0,1-(x/30)**2);
 const p=new THREE.Vector3(x,-y,z).project(engine.camera);landmarks.push({x,screen:[(p.x+1)/2,(1-p.y)/2]});}
 return {results,landmarks};});clean();
 for(const r of result.results){fs.writeFileSync(`out/S1/diagnose-${r.mode}.png`,Buffer.from(r.image.split(',')[1],'base64'));delete r.image;}
 fs.writeFileSync('out/S1/diagnose.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();await server.close();}
