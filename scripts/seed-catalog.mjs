// Seed the storefront catalog without creating or changing an admin account.
// Usage: node scripts/seed-catalog.mjs --remote
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const remote = process.argv.includes('--remote');
const mode = remote ? '--remote' : '--local';
const tmp = path.join(root, '.seed-catalog-tmp.sql');
const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const seed = JSON.parse(fs.readFileSync(path.join(root, 'seed.json'), 'utf8'));
const categoryNames = {
  pants: 'بناطيل',
  hoodies: 'هودي',
  jackets: 'جواكت',
  pullover: 'بلوفرات',
  shoes: 'أحذية',
};
const statements = [
  `INSERT OR IGNORE INTO shop_ads (id, data) VALUES (1, '{"enabled":true,"banners":[]}');`,
  `INSERT OR IGNORE INTO settings (key, value) VALUES ('hiddenSeasons', '{}');`,
  ...seed.categories.map((category, index) => {
    const data = { ...category, labelAr: categoryNames[category.id] || category.label };
    return `INSERT OR IGNORE INTO categories (id, data, position) VALUES (${quote(category.id)}, ${quote(JSON.stringify(data))}, ${index + 1});`;
  }),
  ...seed.products.map((product, index) =>
    `INSERT OR IGNORE INTO products (id, data, position) VALUES (${quote(product.id)}, ${quote(JSON.stringify(product))}, ${index + 1});`),
].join('\n');

fs.writeFileSync(tmp, statements, 'utf8');
try {
  execFileSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'stock-store-db', mode, '--file', tmp], {
    cwd: root,
    stdio: 'inherit',
  });
} finally {
  fs.rmSync(tmp, { force: true });
}
console.log(`Catalog seeded (${seed.products.length} products, ${seed.categories.length} categories).`);
