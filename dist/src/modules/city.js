import { CITY, CITY_VIEWS } from '../world/plan.js';
import { cityTrees } from '../city/trees.js';
import { cityLights } from '../city/lights.js';
import { cityLayout } from '../city/layout.js';
import { instanceHouses } from '../city/houses.js';
import { cityMaterial } from '../city/batch.js';
import { buildOffices } from '../city/offices.js';
import { extendRiver, farmland, cityGround } from '../city/landscape.js';

export async function build(engine) {
  if(engine.registry.city)return engine.registry.city;
  const t0=performance.now(),material=cityMaterial(engine),layout=cityLayout(engine);
  const houses=instanceHouses(engine,layout.houses,material),officeResult=buildOffices(engine,material,layout.blocks),office=officeResult.group,officeShadow=officeResult.shadow;
  for(const b of layout.blocks)if(!b.outer)engine.footprints.addRect(b.x,b.z,b.hw,b.hd,0,'city-block');
  const trees=[...layout.trees,...officeResult.trees],rng=engine.rng('T8-field-tree-lines');
  // inferred: distant rows of 槐 at field divisions. No camera-relative dressing.
  for(let i=0;i<280;i++) {
    const sign=i%2?1:-1,across=rng.range(-CITY.farmlandExtent*.8,CITY.farmlandExtent*.8);
    const edge=sign*(CITY.outerExtent+250+Math.floor(i/70)*1500);
    const [x,z]=i%4<2?[edge,across]:[across,edge];trees.push([x,.52,z]);
  }
  const flora=cityTrees(engine,trees);
  const river=extendRiver(engine),fields=farmland(engine),ground=cityGround(engine),lights=cityLights(engine,layout,material);
  const result={...houses,office,officeShadow,offices:officeResult,flora,river,fields,ground,lights,layout,material,buildMs:Math.round(performance.now()-t0)};
  engine.registry.city=result;
  console.log('[city] '+JSON.stringify({buildMs:result.buildMs,blocks:layout.blocks.length,houses:layout.houses.length,trees:trees.length,lods:houses.stats}));
  return result;
}

export async function test(engine) {
  await (await import('./ground.js')).build(engine);
  await build(engine);await (await import('./walls.js')).build(engine);await (await import('./tieta.js')).build(engine);
  return {views:[CITY_VIEWS.aerial,CITY_VIEWS.gallery,CITY_VIEWS.avenue,CITY_VIEWS.roofs]};
}
