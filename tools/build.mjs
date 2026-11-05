// Self-contained ES-module delivery. No bundler, network, assets or source-tree mutations.
// Serve with tools/serve.mjs at /dist/index.html, or startServer(port, absoluteDistPath).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const started = performance.now();
const files = [];
async function write(relative, data) {
  const target = path.join(dist, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  files.push({ path: relative.split(path.sep).join('/'), bytes: Buffer.byteLength(data),
    sha256: createHash('sha256').update(data).digest('hex') });
}
async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(target));
    else if (entry.isFile()) result.push(target);
  }
  return result;
}
const imports = text => [...text.matchAll(/(?:\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?|\bimport\s*\(\s*)['"]([^'"]+)['"]/g)].map(m => m[1]);
const vendorQueue = ['build/three.module.js'];
const vendored = new Set();
function enqueue(specifier) {
  if (specifier.startsWith('three/addons/')) vendorQueue.push('examples/jsm/' + specifier.slice('three/addons/'.length));
  else if (specifier === 'three') vendorQueue.push('build/three.module.js');
  else if (/^(?:https?:)?\/\//.test(specifier)) throw new Error(`External module dependency: ${specifier}`);
}
function relativeModule(file, target) {
  const relative = path.posix.relative(path.posix.dirname(file), target);
  return relative.startsWith('.') ? relative : './' + relative;
}
function relocateSource(text, file) {
  // fetch resolves against the document; imports resolve against their module.
  // Keep the geometry cache's optional root-relative fetch usable beneath any hosting prefix.
  text = text.replace(/\bfetch\(\s*([`'"])\/(generated\/[^`'"]*)\1\s*\)/g,
    (_, quote, target) => `fetch(new URL(${quote}${relativeModule(file, target)}${quote}, import.meta.url))`);
  return text.replace(/((?:\bfrom\s*|\bimport\s*(?:\(\s*)?)[`'"])\/(src\/[^`'"]+)([`'"])/g,
    (_, prefix, target, suffix) => prefix + relativeModule(file, target) + suffix);
}

// Only this generated delivery directory is replaced; no source or baked input is removed.
await fs.rm(dist, { recursive: true, force: true });
for (const source of await walk(path.join(root, 'src'))) {
  const relative = path.relative(root, source).split(path.sep).join('/');
  let data = await fs.readFile(source);
  if (source.endsWith('.js')) {
    const text = data.toString('utf8');
    imports(text).forEach(enqueue);
    data = relocateSource(text, relative);
  }
  await write(relative, data);
}
for (let i = 0; i < vendorQueue.length; i++) {
  const relative = path.posix.normalize(vendorQueue[i]);
  if (vendored.has(relative)) continue;
  if (relative.startsWith('../')) throw new Error(`Vendor path escapes package: ${relative}`);
  vendored.add(relative);
  const text = await fs.readFile(path.join(root, 'node_modules/three', relative), 'utf8');
  for (const specifier of imports(text)) {
    if (specifier.startsWith('.')) vendorQueue.push(path.posix.join(path.posix.dirname(relative), specifier));
    else enqueue(specifier);
  }
  await write('vendor/three/' + relative, text);
}
await write('vendor/three/LICENSE', await fs.readFile(path.join(root, 'node_modules/three/LICENSE')));
let baked = 0;
try {
  for (const source of await walk(path.join(root, 'generated'))) {
    await write(path.relative(root, source), await fs.readFile(source)); baked++;
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const html = (await fs.readFile(path.join(root, 'index.html'), 'utf8'))
  .replaceAll('./node_modules/three/', './vendor/three/');
if (html.includes('/node_modules/')) throw new Error('Unresolved node_modules path in delivery HTML');
await write('index.html', html);
const manifest = { files: files.sort((a, b) => a.path.localeCompare(b.path)), bakedFiles: baked };
await write('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
console.log(`[build] dist/: ${files.length} files, ${(bytes / 1e6).toFixed(2)} MB, ${baked} baked files, ${Math.round(performance.now() - started)} ms`);
console.log('[build] Serve /dist/index.html with node tools/serve.mjs, or host dist/ at any URL prefix.');
console.log('[build] LEAD NOTE: add dist/ to .gitignore. The implementer may not edit .gitignore.');
if (!baked) console.log('[build] No bake inputs found. World modules must expose versioned loadOrBuild hooks before baking can reduce construction time.');
