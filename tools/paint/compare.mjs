// Focused S4 landmarks/region validation. This tool never changes world content.
import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
const input=process.argv[2]||'out/S4/xuande/view0.png', label=process.argv[3]||'', scene=process.argv[4]||'xuande';
const out='out/S4'+(scene==='zhouqiao'?'/zhouqiao':'');
const reference=scene==='zhouqiao'?'c2':'c1';
const target=PNG.sync.read(fs.readFileSync(`refs/style/${reference}.png`));
const render=PNG.sync.read(fs.readFileSync(input));
function resized(img,w,h){const o=new PNG({width:w,height:h});for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(Math.floor(y*img.height/h)*img.width+Math.floor(x*img.width/w))*4,j=(y*w+x)*4;for(let c=0;c<4;c++)o.data[j+c]=img.data[i+c];}return o;}
const w=1008,h=567,a=resized(target,w,h),b=resized(render,w,h),pair=new PNG({width:w*2,height:h}),overlay=new PNG({width:w,height:h});
PNG.bitblt(a,pair,0,0,w,h,0,0);PNG.bitblt(b,pair,0,0,w,h,w,0);
for(let i=0;i<overlay.data.length;i++)overlay.data[i]=i%4===3?255:Math.round((a.data[i]+b.data[i])*.5);
fs.mkdirSync(out,{recursive:true});
for(const [name,img]of [['compare',pair],['overlay',overlay]]){fs.writeFileSync(`${out}/${name}.png`,PNG.sync.write(img));if(label)fs.writeFileSync(`${out}/${name}${label}.png`,PNG.sync.write(img));}
{
 const dir=`${out}/crops`;fs.mkdirSync(dir,{recursive:true});
 // Native target dimensions: never shrink the reference crop. Renders at another
 // resolution are registered to the same image extent before cutting.
 const registered=resized(render,target.width,target.height);
 const crops=scene==='xuande'?{doors:[.34,.55,.73,.68],bark:[0,.12,.26,.52],water:[0,.68,.35,1],paving:[.22,.69,.99,.99],wall:[.28,.44,.78,.68],hall:[.28,.20,.78,.465],avenue:[.22,.69,.99,.99],hero_tree:[0,0,.38,.52],groves:[.76,.45,1,.74],rail:[.05,.76,.32,1],canal:[0,.68,.35,1]}:{far_water:[.24,.55,.98,.73],near_quay:[.07,.46,.20,.60],bark:[0,.40,.24,.86],hall:[.48,.15,1,.49],water:[.40,.56,1,1],paving:[0,.79,.28,1],boat:[.20,.69,.60,.92]};
 for(const [name,r]of Object.entries(crops)){
  const x=Math.floor(r[0]*target.width),y=Math.floor(r[1]*target.height),cw=Math.floor((r[2]-r[0])*target.width),ch=Math.floor((r[3]-r[1])*target.height),crop=new PNG({width:cw*2,height:ch});
  PNG.bitblt(target,crop,x,y,cw,ch,0,0);PNG.bitblt(registered,crop,x,y,cw,ch,cw,0);
  fs.writeFileSync(`${dir}/${name}${label}.png`,PNG.sync.write(crop));fs.writeFileSync(`${dir}/${name}.png`,PNG.sync.write(crop));
 }
 fs.writeFileSync(`${dir}/registration${label}.json`,JSON.stringify({reference:[target.width,target.height],render:[render.width,render.height],crops,left:reference+' native pixels',right:'render registered to '+reference+' extent; no crop shrinking'},null,2)+'\n');
 console.log('PASS: compare, overlay and native crop pairs for '+reference);process.exit(0);
}
