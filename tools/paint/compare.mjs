// Focused S1 landmarks/region validation. This tool never changes world content.
import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
const input=process.argv[2]||'out/S1/xuande/view0.png', label=process.argv[3]||'', scene=process.argv[4]||'xuande';
const out='out/S1'+(scene==='zhouqiao'?'/zhouqiao':'');
const reference=scene==='zhouqiao'?'c2':'c1';
const target=PNG.sync.read(fs.readFileSync(`refs/style/${reference}.png`));
const render=PNG.sync.read(fs.readFileSync(input));
function resized(img,w,h){const o=new PNG({width:w,height:h});for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(Math.floor(y*img.height/h)*img.width+Math.floor(x*img.width/w))*4,j=(y*w+x)*4;for(let c=0;c<4;c++)o.data[j+c]=img.data[i+c];}return o;}
const w=1008,h=567,a=resized(target,w,h),b=resized(render,w,h),pair=new PNG({width:w*2,height:h}),overlay=new PNG({width:w,height:h});
PNG.bitblt(a,pair,0,0,w,h,0,0);PNG.bitblt(b,pair,0,0,w,h,w,0);
for(let i=0;i<overlay.data.length;i++)overlay.data[i]=i%4===3?255:Math.round((a.data[i]+b.data[i])*.5);
fs.mkdirSync(out,{recursive:true});
for(const [name,img]of [['compare',pair],['overlay',overlay]]){fs.writeFileSync(`${out}/${name}.png`,PNG.sync.write(img));if(label)fs.writeFileSync(`${out}/${name}${label}.png`,PNG.sync.write(img));}
const regions=scene==='zhouqiao'?{trunk:[0,.45,.09,.78],canopy:[0,0,.35,.35],sky:[.45,0,.7,.15],parapet:[.25,.43,.8,.49],columns:[.25,.50,.8,.57],water_mid:[.45,.60,1,.80],water_low:[.6,.85,1,1],tower:[.75,.2,.97,.45],paving:[0,.82,.2,1]}:{hero_tree:[0,0,.3,.3],roof:[.33,.25,.70,.30],hall:[.34,.34,.70,.45],wall:[.33,.48,.73,.555],doors:[.365,.575,.705,.665],side_tower:[.13,.33,.25,.45],left_trees:[0,.40,.28,.68],right_trees:[.77,.52,1,.68],avenue:[.40,.72,.95,.98],canal:[.02,.75,.15,.95],sky:[.68,.03,.98,.28],rail:[.13,.80,.27,.97]};
function measure(img,rect){const l=[];let sat=0,rb=0;for(let y=Math.floor(rect[1]*img.height);y<rect[3]*img.height;y++)for(let x=Math.floor(rect[0]*img.width);x<rect[2]*img.width;x++){const i=(y*img.width+x)*4,r=img.data[i]/255,g=img.data[i+1]/255,b=img.data[i+2]/255,m=Math.max(r,g,b);l.push(.2126*r+.7152*g+.0722*b);sat+=m?(m-Math.min(r,g,b))/m:0;rb+=r-b;}l.sort((a,b)=>a-b);return {p10:l[Math.floor(l.length*.1)],p50:l[Math.floor(l.length*.5)],p90:l[Math.floor(l.length*.9)],sat:sat/l.length,rb:rb/l.length};}
const report=Object.fromEntries(Object.entries(regions).map(([k,r])=>[k,{rect:r,reference:measure(target,r),render:measure(render,r)}]));
fs.writeFileSync(`${out}/regions${label||''}.json`,JSON.stringify(report,null,2)+'\n');
console.log(Object.entries(report).map(([k,v])=>`${k.padEnd(10)} ${Object.values(v.render).map(x=>x.toFixed(3)).join(' ')} | ${reference} ${Object.values(v.reference).map(x=>x.toFixed(3)).join(' ')}`).join('\n'));
