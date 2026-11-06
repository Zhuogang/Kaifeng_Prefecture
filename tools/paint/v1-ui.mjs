// V1-specific visual evidence for phone controls, captions and view transitions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const out='out/V1',server=await startServer(0),browser=await launchBrowser({width:960,height:540}),report=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 const page=await browser.newPage(),clean=observeErrors(page);
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=1&view=6&ratio=1`);
 await page.waitForFunction('window.__scroll?.ready()',{timeout:300000});await wait(2000);
 assert.equal(await page.$eval('#scroll-caption-line',e=>e.textContent),'橋下密排石柱，蓋車駕御路也。');
 await page.screenshot({path:`${out}/ui-view6.png`});report.push('View 6 leads with the existing close-set columns quotation');
 await page.mouse.move(150,120);await wait(1000);
 const result=await page.evaluate(async()=>{
  const THREE=await import('three');
  const offset=()=>{const v=engine.registry.paint.viewSet[__scroll.status().view].viewAt(__scroll.fraction()),c=new THREE.PerspectiveCamera();c.position.set(...v.pos);c.lookAt(...v.target);return c.quaternion.clone().invert().multiply(engine.camera.quaternion);};
  const before=offset(),snapshot=engine.canvas.toDataURL('image/png');__scroll.view(4);
  return {lookAngle:before.angleTo(offset()),snapshot:document.getElementById('scroll-fade').src===snapshot,reset:__scroll.fraction()===0,url:new URL(location.href).searchParams.get('view')};
 });
 assert(result.lookAngle<1e-6&&result.snapshot&&result.reset&&result.url==='5');report.push({pointerAndSnapshot:result});
 await wait(1000);assert(await page.$eval('#scroll-fade',e=>e.hidden));
 const legacy=await page.evaluate(()=>engine.registry.paint.views.map(v=>v.paintViewIndex??0));
 assert.deepEqual(legacy,[0,0,0,0,0,0,0,0,0,1,2,3,4,5,6]);report.push('Legacy frames 0–8 retained; views 2–7 appended at 9–14');
 const culling=await page.evaluate(async()=>{
  const THREE=await import('three'),{LOOK_YAW,LOOK_PITCH}=await import('./src/paint/playback.js'),paint=engine.registry.paint;
  const volumes=[];
  for(const entry of paint.viewSet)for(let i=0;i<9;i++)for(const mirror of [false,true]){
   const v=entry.viewAt(i/8),c=new THREE.PerspectiveCamera(),aspect=16/9;
   const h=Math.tan(v.fov*Math.PI/360)*aspect*1.1+Math.tan(LOOK_YAW+Math.PI/90),p=Math.tan(v.fov*Math.PI/360)+Math.tan(LOOK_PITCH+Math.PI/90);
   c.projectionMatrix.makePerspective(-h*.1,h*.1,p*.1,-p*.1,.1,v.far);c.position.set(...v.pos);
   const target=new THREE.Vector3(...v.target);if(mirror){c.position.y*=-1;target.y*=-1;c.up.set(0,-1,0);}
   c.lookAt(target);c.updateMatrixWorld(true);volumes.push(new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse)));
  }
  const meshes=[...engine.scene.children,...paint.reflection.scene.children].filter(m=>m.name.startsWith('paint-')||m.name.startsWith('reflection-'));
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),sphere=new THREE.Sphere();let total=0,outside=0;
  for(const mesh of meshes){const g=mesh.geometry,p=g.attributes.position,index=g.index.array;
   for(let i=0;i<index.length;i+=3){a.fromBufferAttribute(p,index[i]);b.fromBufferAttribute(p,index[i+1]);c.fromBufferAttribute(p,index[i+2]);
    sphere.center.copy(a).add(b).add(c).multiplyScalar(1/3);sphere.radius=Math.sqrt(Math.max(sphere.center.distanceToSquared(a),sphere.center.distanceToSquared(b),sphere.center.distanceToSquared(c)))+.5;
    total++;if(!volumes.some(f=>f.intersectsSphere(sphere)))outside++;
   }
  }
  __scroll.view(5);return {total,outside,percent:100*outside/total,callsSaved:0};
 });report.push({conservativeUnionCulling:culling});
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.reload();await page.waitForFunction('window.__scroll?.ready()',{timeout:300000});
 await page.evaluate(()=>{__scroll.view(5);__scroll.scrub(0);});await wait(2500);
 assert.equal(await page.evaluate(()=>__scroll.fraction()),0);assert(await page.$eval('#scroll-fade',e=>e.hidden));
 const labels=await page.$$eval('[data-view]',buttons=>buttons.map(b=>b.innerText.trim()));assert.deepEqual(labels,['1','2','3','4','5','6','7']);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 await page.screenshot({path:`${out}/ui-phone-view6.png`});report.push('Phone: numbers only, no horizontal overflow; reduced motion cuts instantly and holds fraction zero');
 clean();console.log(JSON.stringify(report,null,2));fs.writeFileSync(`${out}/ui-checks.json`,JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();await server.close();}
