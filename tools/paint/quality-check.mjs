import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ScrollQuality} from '../../src/scroll/quality.js';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';

const policy=new ScrollQuality(1.5);let now=0;
const advance=(ms,seconds)=>{for(let i=0;i<seconds*1000/ms;i++){now+=ms;policy.update(ms,now);}};
advance(40,2);assert.equal(policy.level,1);assert.equal(policy.ratio,1.5);assert.equal(policy.reflectionInterval,2);
advance(40,2);assert.equal(policy.level,2);assert.equal(policy.reflectionScale,.25);
advance(40,2);assert.equal(policy.ratio,1.375);
advance(20,6);assert.equal(policy.level,2);
advance(40,2);assert.equal(policy.level,3);
advance(20,28);assert.equal(policy.level,3);
advance(20,4);assert.equal(policy.level,2);
advance(40,40);assert.equal(policy.ratio,.75);
advance(20,100);assert.equal(policy.level,0);assert.equal(policy.ratio,1.5);
console.log('PASS policy: reflection-first, .125 ratio steps, recovery and rollback cooldown');
const sixty=new ScrollQuality(2);
for(let i=0;i<1000;i++)sixty.update(16.7,i*16.7);
assert.equal(sixty.level,0);assert.equal(sixty.ratio,2);
for(let i=0;i<400;i++)sixty.update(25,20000+i*25);
assert.equal(sixty.level,2);assert.equal(sixty.ratio,2);
for(let i=0;i<60;i++)sixty.update(40,40000+i*40);
assert.equal(sixty.ratio,1.875);
console.log('PASS D1b: 60 FPS stays at DPR 2; 25 ms spends reflection only; 40 ms spends resolution');

const server=await startServer(0),browser=await launchBrowser({width:640,height:360}),results={};
try{for(const locked of [false,true]){
 const page=await browser.newPage(),clean=observeErrors(page);
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=0${locked?'&ratio=.875':''}`);
 await page.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 if(!locked)await page.waitForFunction('window.__scroll.status().pixelRatio === .75',{timeout:90000});
 else await page.evaluate(()=>new Promise(r=>setTimeout(r,6000)));
 results[locked?'locked':'adaptive']=await page.evaluate(async()=>{
  const status=window.__scroll.status(),reflection=engine.registry.paint.reflection;
  const samples=[];for(let i=0;i<5;i++){await new Promise(requestAnimationFrame);samples.push(reflection.lastStats.calls);}
  return {...status,interval:reflection.interval,samples,size:[engine.width,engine.height],roundTrip:engine.registry.paint.roundTrip};
 });
 const row=results[locked?'locked':'adaptive'];
 assert(row.gpu&&row.reflectionSize.every(Number.isFinite));
 if(locked){assert.equal(row.pixelRatio,.875);assert.equal(row.qualityLevel,0);assert.equal(row.interval,1);assert(row.samples.every(n=>n>0));}
 else{assert.equal(row.qualityLevel,4);assert.equal(row.interval,2);assert(row.samples.some(n=>n===0)&&row.samples.some(n=>n>0));}
 await page.keyboard.press('KeyP');
 assert.match(await page.evaluate(()=>document.getElementById('scroll-performance').textContent),/Quality .*reflection .*GPU /s);
 await page.screenshot({path:`out/D1b/quality-${locked?'locked':'adaptive'}.png`});
 await page.setViewport({width:960,height:540});await page.evaluate(()=>new Promise(r=>setTimeout(r,1000)));
 const resized=await page.evaluate(()=>({status:__scroll.status(),scale:engine.registry.paint.reflection.scale,size:[engine.width,engine.height]}));
 assert.deepEqual(resized.status.reflectionSize,resized.size.map((size,i)=>Math.round(Math.max(i?864:1536,Math.round(size/2))*resized.scale*2)));
 clean();console.log('PASS',locked?'locked':'adaptive',JSON.stringify(row));await page.close();
}fs.writeFileSync('out/D1b/quality.json',JSON.stringify(results,null,2)+'\n');
 const retina=await browser.newPage();await retina.setViewport({width:320,height:180,deviceScaleFactor:2.5});
 await retina.goto(`http://127.0.0.1:${server.port}/index.html?scene=0`);
 await retina.waitForFunction('window.__READY || window.__RENDER_ERROR',{timeout:300000});
 const initial=await retina.evaluate(()=>window.__STATS.pixelRatio);assert.equal(initial,2);
 console.log('PASS browser starts at min(devicePixelRatio, 2):',initial);await retina.close();
}finally{await browser.close();await server.close();}
