// Seeds the local (or --remote) D1 database from seed.json.
//   node scripts/seed.mjs            (local)
//   node scripts/seed.mjs --remote   (production)
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const remote = process.argv.includes('--remote');
const flag = remote ? '--remote' : '--local';
const tmp = path.join(root, '.seed-tmp.sql');
const esc = (sql) => sql.replace(/"/g, '\\"').replace(/\r?\n/g, ' ');

const runFile = (sql) => {
  fs.writeFileSync(tmp, sql);
  try {
    execSync(`npx wrangler d1 execute stock-store-db ${flag} --file "${tmp}"`, { cwd: root });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
};

const runOne = (sql) => {
  execSync(`npx wrangler d1 execute stock-store-db ${flag} --command "${esc(sql)}"`, { cwd: root });
};

const query = (sql) => {
  const out = execSync(`npx wrangler d1 execute stock-store-db ${flag} --json --command "${esc(sql)}"`, { cwd: root }).toString();
  return JSON.parse(out)[0].results;
};

console.log(`Seeding ${remote ? 'REMOTE' : 'LOCAL'} database...`);

// 1) schema (idempotent)
runFile(fs.readFileSync(path.join(root, 'schema.sql'), 'utf8'));
console.log('schema applied');

// 2) admin account (only if missing)
const email = process.env.ADMIN_EMAIL || 'admin@stockstore.com';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
const passwordHash = `pbkdf2$100000$${salt.toString('hex')}$${hash.toString('hex')}`;
runOne(`INSERT OR IGNORE INTO admins (email, password_hash) VALUES ('${email}', '${passwordHash}')`);
console.log(`admin ready: ${email}`);

// 3) settings + empty ads (only if missing — never overwrites admin edits)
runFile(`
INSERT OR IGNORE INTO shop_ads (id, data) VALUES (1, '{"enabled":true,"banners":[]}');
INSERT OR IGNORE INTO settings (key, value) VALUES ('hiddenSeasons', '{}');
`);
console.log('settings ready');

// 4) default categories (only when the table is empty, so the admin can start
//    adding products immediately; existing categories are never touched)
const catCount = query('SELECT COUNT(*) AS n FROM categories')[0].n;
if (catCount === 0) {
  runFile(`
INSERT INTO categories (id, data, position) VALUES ('pants', '{"id":"pants","label":"Pants","labelAr":"بناطيل"}', 1);
INSERT INTO categories (id, data, position) VALUES ('hoodies', '{"id":"hoodies","label":"Hoodies","labelAr":"هودي"}', 2);
INSERT INTO categories (id, data, position) VALUES ('jackets', '{"id":"jackets","label":"Jackets","labelAr":"جواكت"}', 3);
INSERT INTO categories (id, data, position) VALUES ('pullover', '{"id":"pullover","label":"Pullover","labelAr":"بلوفرات"}', 4);
INSERT INTO categories (id, data, position) VALUES ('shoes', '{"id":"shoes","label":"Shoes","labelAr":"أحذية"}', 5);
`);
  console.log('default categories created');
}

// Products are intentionally NOT seeded anymore: the catalog is managed from
// the admin panel into D1. (The old static catalog generator,
// scripts/generate-seed.mjs, remains available for one-off migrations.)
console.log('Done.');
