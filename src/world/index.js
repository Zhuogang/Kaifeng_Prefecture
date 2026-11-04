export const MODULE_ORDER = ['ground', 'bianhe', 'zhouqiao'];

export async function buildWorld(engine) {
  for (const name of MODULE_ORDER) {
    const t0 = performance.now();
    try {
      const mod = await import(`../modules/${name}.js`);
      await mod.build(engine);
      console.log(`[world] ${name} built in ${Math.round(performance.now() - t0)} ms`);
    } catch (error) {
      console.error(`[world] ${name} failed:`, error.stack || error);
    }
  }
}

MODULE_ORDER.push('xuande');
