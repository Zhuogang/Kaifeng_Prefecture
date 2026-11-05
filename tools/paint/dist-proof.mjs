// Verify P3's delivered backdrop beneath a hosting prefix, with no source-tree
// or node_modules fallback. Run tools/build.mjs first, from the repository root.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { launchBrowser, observeErrors } from '../browser.mjs';

const root=path.resolve('dist'),prefix='/some/sub/path/',requests=[],bad=[];
let lock;
for(;;){
  for(let i=0;i<Number(process.env.GPU_SLOTS||2);i++){
    const candidate=path.resolve(`out/.gpu.lock.${i}`);
    try{const fd=fs.openSync(candidate,'wx');fs.writeSync(fd,JSON.stringify({pid:process.pid,args:'P3 dist proof'}));fs.closeSync(fd);lock=candidate;break;}
    catch(error){if(error.code!=='EEXIST')throw error;try{process.kill(JSON.parse(fs.readFileSync(candidate)).pid,0);}catch{fs.rmSync(candidate,{force:true});}}
  }
  if(lock)break;
  await new Promise(resolve=>setTimeout(resolve,1000));
}
const unlock=()=>{if(lock)fs.rmSync(lock,{force:true});};
process.on('exit',unlock);process.on('SIGINT',()=>{unlock();process.exit(130);});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.css':'text/css'};
const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://local').pathname);
  if(!pathname.startsWith(prefix)){bad.push(pathname);response.writeHead(404);response.end();return;}
  const file=path.resolve(root,pathname.slice(prefix.length)||'index.html');
  if(!file.startsWith(root+path.sep)){bad.push(pathname);response.writeHead(403);response.end();return;}
  fs.readFile(file,(error,data)=>{
    requests.push({path:pathname,status:error?404:200});
    if(error){bad.push(pathname);response.writeHead(404);response.end();return;}
    response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});response.end(data);
  });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await launchBrowser({width:960,height:540});
  const page=await browser.newPage(),clean=observeErrors(page),start=performance.now();
  await page.goto(`http://127.0.0.1:${server.address().port}${prefix}index.html?test=paint_zhouqiao&mode=still&quality=preview&w=960&h=540&spp=1`,{waitUntil:'load'});
  await page.waitForFunction('window.__READY||window.__RENDER_ERROR',{timeout:900000});
  const error=await page.evaluate(()=>window.__RENDER_ERROR);if(error)throw new Error(error);
  const image=await page.evaluate(()=>window.__renderTest());clean();
  const backdrop=await page.evaluate(()=>engine.registry.paint.backdrop);
  const stats=await page.evaluate(()=>window.__STATS);
  const sum=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const identical=sum('assets/backdrops/bd1.jpg')===sum('dist/assets/backdrops/bd1.jpg');
  if(bad.length||!identical||!backdrop.width||!new URL(backdrop.source).pathname.startsWith(prefix+'assets/backdrops/'))
    throw new Error('P3 sub-path delivery failed: '+JSON.stringify({bad,identical,backdrop}));
  if(requests.some(r=>r.path.includes('node_modules')||r.path.includes('/refs/')))
    throw new Error('P3 delivery requested a source dependency or reference image');
  fs.mkdirSync('out/P3',{recursive:true});
  fs.writeFileSync('out/P3/dist.png',Buffer.from(image.split(',')[1],'base64'));
  const report={milliseconds:Math.round(performance.now()-start),backdrop,identical,stats,requests};
  fs.writeFileSync('out/P3/dist-proof.json',JSON.stringify(report,null,2)+'\n');
  console.log('[P3 dist] PASS',JSON.stringify({milliseconds:report.milliseconds,backdrop,identical,calls:stats.calls,triangles:stats.triangles,requests:requests.length}));
}finally{
  if(browser){await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1500))]);try{browser.process()?.kill('SIGKILL');}catch{}}
  await new Promise(resolve=>{server.close(resolve);server.closeAllConnections?.();});
  unlock();
}
