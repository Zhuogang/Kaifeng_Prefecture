// Deterministic moving frames, using the authored camera path and engine.time.
// node tools/paint/clip.mjs --start .49 --end .51 --frames 10 --seconds .3333333333333333 --time 11.85
// seconds is the duration of N frames; timestamps advance seconds/N (30 fps above).
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {launchBrowser,observeErrors} from '../browser.mjs';
import {startServer} from '../serve.mjs';
const defaults={start:.49,end:.51,frames:10,seconds:1/3,time:11.85,w:1280,h:720,out:'out/D2b/clip',scene:'xuande'};
const args={...defaults};
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i]?.replace(/^--/,'');if(!(key in defaults)||process.argv[i+1]===undefined)throw new Error('Arguments: --start --end --frames --seconds --time --w --h --out');args[key]=['out','scene'].includes(key)?process.argv[i+1]:Number(process.argv[i+1]);}
if(![args.start,args.end].every(x=>Number.isFinite(x)&&x>=0&&x<=1)||!Number.isInteger(args.frames)||args.frames<2||!Number.isFinite(args.seconds)||args.seconds<=0||!Number.isFinite(args.time)||![args.w,args.h].every(x=>Number.isInteger(x)&&x>0))throw new Error('Invalid clip arguments');
const root=path.resolve('out/D2b'),out=path.resolve(args.out);if(!out.startsWith(root+path.sep))throw new Error('Clip output must be under out/D2b/');
fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let lock;
for(;;){for(let i=0;i<Number(process.env.GPU_SLOTS||2);i++){const p=path.resolve(`out/.gpu.lock.${i}`);try{const fd=fs.openSync(p,'wx');fs.writeSync(fd,JSON.stringify({pid:process.pid,args:'S4 clip'}));fs.closeSync(fd);lock=p;break;}catch(e){if(e.code!=='EEXIST')throw e;try{process.kill(JSON.parse(fs.readFileSync(p)).pid,0);}catch{fs.rmSync(p,{force:true});}}}if(lock)break;await sleep(1000);}
const unlock=()=>{if(lock)fs.rmSync(lock,{force:true});};process.on('exit',unlock);process.on('SIGINT',()=>{unlock();process.exit(130);});
const regions={full:[0,0,1,1],canopy:[0,0,.43,.52],water:args.scene==='xuande'?[.02,.75,.15,.95]:[.58,.62,.99,.97],
 roof:args.scene==='xuande'?[.28,.22,.78,.35]:[.47,.08,1,.30],frame:args.scene==='xuande'?[.26,.30,.79,.51]:[.12,.33,1,.63]};
function difference(a,b,rect){let sum=0,n=0;for(let y=Math.floor(rect[1]*a.height);y<Math.floor(rect[3]*a.height);y++)for(let x=Math.floor(rect[0]*a.width);x<Math.floor(rect[2]*a.width);x++){const i=(y*a.width+x)*4;for(let c=0;c<3;c++){sum+=Math.abs(a.data[i+c]-b.data[i+c]);n++;}}return {rgb255:sum/n,normalized:sum/n/255};}
const server=await startServer(0);let browser;const started=performance.now();
try{
 browser=await launchBrowser({width:args.w,height:args.h});const page=await browser.newPage(),clean=observeErrors(page);
 await page.evaluateOnNewDocument(()=>{
  const raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),ids=[];
  window.requestAnimationFrame=fn=>{const id=raf(fn);ids.push(id);return id;};
  window.__stopRAF=()=>{ids.forEach(cancel);window.requestAnimationFrame=()=>0;};
 });
 await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${args.scene==='xuande'?0:1}&ratio=1`,{waitUntil:'load'});
 await page.waitForFunction('window.__READY||window.__RENDER_ERROR',{timeout:900000});const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw new Error(error);clean();
 await page.evaluate(()=>window.__stopRAF());
 const frames=[],pairs=[];let previous;fs.mkdirSync(path.join(out,'pairs'),{recursive:true});
 for(let i=0;i<args.frames;i++){
  const fraction=args.start+(args.end-args.start)*i/(args.frames-1),time=args.time+i*args.seconds/args.frames;
  const r=await page.evaluate(async(f,t,scene)=>{const {paintView}=await import('/src/modules/paint_'+scene+'.js');engine.applyShot({id:'clip',...paintView(f,t)});const image=await engine.renderStill(1);return {image,time:engine.time,stats:{...window.__STATS},reflection:{...engine.registry.paint.reflection.lastStats}};},fraction,time,args.scene);clean();
  if(r.time!==time)throw new Error('Clip time changed');if(r.stats.calls>40||r.stats.triangles>1300000)throw new Error('Clip exceeded D2b frame budget');
  const name=`f${String(i).padStart(4,'0')}.png`,buffer=Buffer.from(r.image.split(',')[1],'base64'),frame=PNG.sync.read(buffer);fs.writeFileSync(path.join(out,name),buffer);
  frames.push({name,fraction,time,sha256:createHash('sha256').update(buffer).digest('hex'),stats:r.stats,reflection:r.reflection});
  if(previous){
    const crops=['roof','frame'].map(k=>{const r=regions[k];return {x:Math.floor(r[0]*frame.width),y:Math.floor(r[1]*frame.height),w:Math.floor(r[2]*frame.width)-Math.floor(r[0]*frame.width),h:Math.floor(r[3]*frame.height)-Math.floor(r[1]*frame.height)};});
    const width=Math.max(...crops.map(c=>c.w)),sheet=new PNG({width:width*2,height:crops.reduce((n,c)=>n+c.h,0)});let y=0;
    for(const crop of crops){PNG.bitblt(previous,sheet,crop.x,crop.y,crop.w,crop.h,0,y);PNG.bitblt(frame,sheet,crop.x,crop.y,crop.w,crop.h,width,y);y+=crop.h;}
    const pairImage=`pairs/p${String(i-1).padStart(4,'0')}.png`;fs.writeFileSync(path.join(out,pairImage),PNG.sync.write(sheet));
    pairs.push({from:i-1,to:i,pairImage,...Object.fromEntries(Object.entries(regions).map(([k,rect])=>[k,difference(previous,frame,rect)]))});
  }
  previous=frame;
 }
 const mean=Object.fromEntries(Object.keys(regions).map(k=>[k,{rgb255:pairs.reduce((s,p)=>s+p[k].rgb255,0)/pairs.length,normalized:pairs.reduce((s,p)=>s+p[k].normalized,0)/pairs.length}]));
 const report={arguments:args,fps:args.frames/args.seconds,milliseconds:Math.round(performance.now()-started),regions,frames,pairs,mean,note:'Screen-region MAD includes camera motion, disocclusion and intended animation; it is not a standalone shimmer score.'};
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(report,null,2)+'\n');console.log('[S4 clip] PASS',JSON.stringify({fps:report.fps,milliseconds:report.milliseconds,frames:frames.length,mean}));
}finally{if(browser){await Promise.race([browser.close().catch(()=>{}),sleep(1500)]);try{browser.process()?.kill('SIGKILL');}catch{}}await server.close();unlock();}
