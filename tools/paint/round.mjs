// S3 paired scene surface rounds, with the lead-owned detail gate every round.
import fs from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),number=process.argv[2],notes=process.argv[3];
if(!/^\d\d$/.test(number)||!notes)throw new Error('round.mjs NN "what changed"');
fs.mkdirSync('out/S3',{recursive:true});
const start=performance.now();
const results=await Promise.all(['xuande','zhouqiao'].map(async scene=>{
 const file=`out/S3/${scene}${number}.png`,args=['tools/render.mjs','--test','paint_'+scene,'--view','0','--w','1672','--h','941','--spp','1','--out',file];
 const started=performance.now(),{stdout,stderr}=await exec(process.execPath,args,{maxBuffer:8e6});
 fs.writeFileSync(`out/S3/${scene}${number}.log`,stdout+stderr);
 const stats=JSON.parse(stdout.match(/\[render\] stats (.*)/)[1]);
 const target=scene==='xuande'?'c1':'c2';
 const detail=await exec('python3',['-I','test/gates/detail.py',target,file]);
 fs.writeFileSync(`out/S3/${scene}${number}-detail.txt`,detail.stdout+detail.stderr);
 const comparison=await exec(process.execPath,['tools/paint/compare.mjs',file,number,scene]);
 fs.writeFileSync(`out/S3/${scene}${number}-compare.txt`,comparison.stdout+comparison.stderr);
 const result={scene,command:[process.execPath,...args].join(' '),milliseconds:Math.round(performance.now()-started),stats,detail:detail.stdout};
 if(stats.calls>40||stats.triangles>1200000)throw new Error('Scene budget exceeded: '+scene);
 console.log(scene,detail.stdout,JSON.stringify({calls:stats.calls,triangles:stats.triangles}));return result;
}));
const p='out/S3/rounds.json',record=fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):{rounds:[]};
record.rounds.push({round:Number(number),changes:notes,milliseconds:Math.round(performance.now()-start),results});
fs.writeFileSync(p,JSON.stringify(record,null,2)+'\n');
