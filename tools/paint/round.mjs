// A repeatable Xuande view-0 render plus 50% c1 overlay and an iteration record.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const number=process.argv[2],notes=process.argv[3];if(!/^\d\d$/.test(number)||!notes)throw new Error('round.mjs NN "what changed"');
const start=performance.now(),file=`out/S1/round${number}.png`,args=['tools/render.mjs','--test','paint_xuande','--view','0','--w','1008','--h','567','--spp','1','--out',file];
try{fs.writeFileSync(`out/S1/round${number}.log`,execFileSync(process.execPath,args,{encoding:'utf8',maxBuffer:8e6}));
 const regions=execFileSync(process.execPath,['tools/paint/compare.mjs',file,number,'xuande'],{encoding:'utf8'});fs.writeFileSync(`out/S1/regions${number}.txt`,regions);
 const log=fs.readFileSync(`out/S1/round${number}.log`,'utf8'),stats=JSON.parse(log.match(/\[render\] stats (.*)/)[1]);
 const rounds=JSON.parse(fs.readFileSync('out/S1/rounds.json'));rounds.partB.push({round:Number(number),changes:notes,command:[process.execPath,...args].join(' '),milliseconds:Math.round(performance.now()-start),stats});fs.writeFileSync('out/S1/rounds.json',JSON.stringify(rounds,null,2)+'\n');
 console.log(JSON.stringify({round:number,milliseconds:Math.round(performance.now()-start),calls:stats.calls,triangles:stats.triangles}));
 if(stats.calls>40||stats.triangles>1200000)throw new Error('Scene budget exceeded');
}catch(e){fs.writeFileSync(`out/S1/round${number}-failure.log`,String(e.stdout||'')+'\n'+String(e.stderr||'')+'\n'+e.message);console.error(e.stdout?.toString()||'',e.stderr?.toString()||'',e.message);process.exitCode=1;}
