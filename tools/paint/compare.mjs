// Focused S2 landmarks/region validation. This tool never changes world content.
import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
const input=process.argv[2]||'out/S2/xuande/view0.png', label=process.argv[3]||'', scene=process.argv[4]||'xuande';
const out='out/S2'+(scene==='zhouqiao'?'/zhouqiao':'');
const reference=scene==='zhouqiao'?'c2':'c1';
const target=PNG.sync.read(fs.readFileSync(`refs/style/${reference}.png`));
const render=PNG.sync.read(fs.readFileSync(input));
function resized(img,w,h){const o=new PNG({width:w,height:h});for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(Math.floor(y*img.height/h)*img.width+Math.floor(x*img.width/w))*4,j=(y*w+x)*4;for(let c=0;c<4;c++)o.data[j+c]=img.data[i+c];}return o;}
const w=1008,h=567,a=resized(target,w,h),b=resized(render,w,h),pair=new PNG({width:w*2,height:h}),overlay=new PNG({width:w,height:h});
PNG.bitblt(a,pair,0,0,w,h,0,0);PNG.bitblt(b,pair,0,0,w,h,w,0);
for(let i=0;i<overlay.data.length;i++)overlay.data[i]=i%4===3?255:Math.round((a.data[i]+b.data[i])*.5);
fs.mkdirSync(out,{recursive:true});
for(const [name,img]of [['compare',pair],['overlay',overlay]]){fs.writeFileSync(`${out}/${name}.png`,PNG.sync.write(img));if(label)fs.writeFileSync(`${out}/${name}${label}.png`,PNG.sync.write(img));}
if(scene==='xuande'){
 const dir=`${out}/crops`;fs.mkdirSync(dir,{recursive:true});
 // Native c1 dimensions: never shrink the reference crop. Renders at another
 // resolution are registered to the same image extent before cutting.
 const registered=resized(render,target.width,target.height);
 const crops={wall:[.28,.44,.78,.68],hall:[.28,.20,.78,.465],avenue:[.22,.69,.99,.99],hero_tree:[0,0,.38,.52],groves:[.76,.45,1,.74],rail:[.05,.76,.32,1],canal:[0,.68,.35,1]};
 for(const [name,r]of Object.entries(crops)){
  const x=Math.floor(r[0]*target.width),y=Math.floor(r[1]*target.height),cw=Math.floor((r[2]-r[0])*target.width),ch=Math.floor((r[3]-r[1])*target.height),crop=new PNG({width:cw*2,height:ch});
  PNG.bitblt(target,crop,x,y,cw,ch,0,0);PNG.bitblt(registered,crop,x,y,cw,ch,cw,0);
  fs.writeFileSync(`${dir}/${name}${label}.png`,PNG.sync.write(crop));fs.writeFileSync(`${dir}/${name}.png`,PNG.sync.write(crop));
 }
 fs.writeFileSync(`${dir}/registration${label}.json`,JSON.stringify({reference:[target.width,target.height],render:[render.width,render.height],crops,left:'c1 native pixels',right:'render registered to c1 extent; no crop shrinking'},null,2)+'\n');
 console.log('PASS: c1 compare, 50% overlay and seven full-size crop pairs; no Xuande regional table.');process.exit(0);
}
const regions={water_mid:[.45,.60,1,.80],water_low:[.6,.85,1,1]};
function measure(img,rect){const l=[];let sat=0,rb=0;for(let y=Math.floor(rect[1]*img.height);y<rect[3]*img.height;y++)for(let x=Math.floor(rect[0]*img.width);x<rect[2]*img.width;x++){const i=(y*img.width+x)*4,r=img.data[i]/255,g=img.data[i+1]/255,b=img.data[i+2]/255,m=Math.max(r,g,b);l.push(.2126*r+.7152*g+.0722*b);sat+=m?(m-Math.min(r,g,b))/m:0;rb+=r-b;}l.sort((a,b)=>a-b);return {p10:l[Math.floor(l.length*.1)],p50:l[Math.floor(l.length*.5)],p90:l[Math.floor(l.length*.9)],sat:sat/l.length,rb:rb/l.length};}
const report=Object.fromEntries(Object.entries(regions).map(([k,r])=>[k,{rect:r,reference:measure(target,r),render:measure(render,r)}]));
fs.writeFileSync(`${out}/regions${label||''}.json`,JSON.stringify(report,null,2)+'\n');
console.log(Object.entries(report).map(([k,v])=>`${k.padEnd(10)} ${Object.values(v.render).map(x=>x.toFixed(3)).join(' ')} | ${reference} ${Object.values(v.reference).map(x=>x.toFixed(3)).join(' ')}`).join('\n'));
