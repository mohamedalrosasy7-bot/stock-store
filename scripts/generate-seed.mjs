// Generates seed.json from the current static catalog (products.js uses
// import.meta.env, which only resolves inside Vite — so we run it through Vite).
// Usage:  node scripts/generate-seed.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Minimal browser globals so src/data/products.js (document.baseURI, window)
// can be evaluated in Node through Vite's SSR loader.
globalThis.document = { baseURI: `file:///${root.replace(/\\/g, '/')}/index.html` };
globalThis.window = { addEventListener() {} };

// Load src/data/products.js with import.meta.env resolved, using Vite's SSR loader.
const { createServer } = await import('vite');
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const mod = await server.ssrLoadModule('/src/data/products.js');
  const products = mod.PRODUCTS;
  const categories = mod.CATEGORIES;
  const seed = { products, categories };
  fs.writeFileSync(path.join(root, 'seed.json'), JSON.stringify(seed, null, 2));
  console.log(`seed.json written: ${products.length} products, ${categories.length} categories`);
} finally {
  await server.close();
}
