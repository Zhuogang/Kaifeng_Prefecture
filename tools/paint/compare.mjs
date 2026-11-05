// Focused P3 landmarks/region validation. This tool never changes world content.
import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
const input=process.argv[2]||'out/P3/view0.png', label=process.argv[3];
const target=PNG.sync.read(fs.readFileSync('refs/style/c2.png'));
const render=PNG.sync.read(fs.readFileSync(input));
function resized(img,w,h){const o=new PNG({width:w,height:h});for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(Math.floor(y*img.height/h)*img.width+Math.floor(x*img.width/w))*4,j=(y*w+x)*4;for(let c=0;c<4;c++)o.data[j+c]=img.data[i+c];}return o;}
const w=1008,h=567,a=resized(target,w,h),b=resized(render,w,h),pair=new PNG({width:w*2,height:h}),overlay=new PNG({width:w,height:h});
PNG.bitblt(a,pair,0,0,w,h,0,0);PNG.bitblt(b,pair,0,0,w,h,w,0);
for(let i=0;i<overlay.data.length;i++)overlay.data[i]=i%4===3?255:Math.round((a.data[i]+b.data[i])*.5);
fs.mkdirSync('out/P3',{recursive:true});
for(const [name,img]of [['compare',pair],['overlay',overlay]]){fs.writeFileSync(`out/P3/${name}.png`,PNG.sync.write(img));if(label)fs.writeFileSync(`out/P3/${name}${label}.png`,PNG.sync.write(img));}
const regions={trunk:[0,.45,.09,.78],canopy:[0,0,.35,.35],sky:[.45,0,.7,.15],parapet:[.25,.43,.8,.49],columns:[.25,.50,.8,.57],water_mid:[.45,.60,1,.80],water_low:[.6,.85,1,1],tower:[.75,.2,.97,.45],paving:[0,.82,.2,1]};
function measure(img,rect){const l=[];let sat=0,rb=0;for(let y=Math.floor(rect[1]*img.height);y<rect[3]*img.height;y++)for(let x=Math.floor(rect[0]*img.width);x<rect[2]*img.width;x++){const i=(y*img.width+x)*4,r=img.data[i]/255,g=img.data[i+1]/255,b=img.data[i+2]/255,m=Math.max(r,g,b);l.push(.2126*r+.7152*g+.0722*b);sat+=m?(m-Math.min(r,g,b))/m:0;rb+=r-b;}l.sort((a,b)=>a-b);return {p10:l[Math.floor(l.length*.1)],p50:l[Math.floor(l.length*.5)],p90:l[Math.floor(l.length*.9)],sat:sat/l.length,rb:rb/l.length};}
const report=Object.fromEntries(Object.entries(regions).map(([k,r])=>[k,{rect:r,reference:measure(target,r),render:measure(render,r)}]));
fs.writeFileSync(`out/P3/regions${label||''}.json`,JSON.stringify(report,null,2)+'\n');
console.log(Object.entries(report).map(([k,v])=>`${k.padEnd(10)} ${Object.values(v.render).map(x=>x.toFixed(3)).join(' ')} | c2 ${Object.values(v.reference).map(x=>x.toFixed(3)).join(' ')}`).join('\n'));
