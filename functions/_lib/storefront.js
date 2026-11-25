export async function readCatalogVersion(db) {
  const row = await db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .bind('catalogVersion')
    .first();
  const version = Number.parseInt(row?.value, 10);
  return Number.isSafeInteger(version) && version >= 0 ? String(version) : '0';
}

export async function readStorefrontSnapshot(db) {
  const [versionResult, productsResult, categoriesResult, adsResult, settingsResult] = await db.batch([
    db.prepare('SELECT value FROM settings WHERE key = ?').bind('catalogVersion'),
    db.prepare('SELECT id, data FROM products ORDER BY position DESC'),
    db.prepare('SELECT id, data FROM categories ORDER BY position DESC'),
    db.prepare('SELECT data FROM shop_ads WHERE id = 1'),
    db.prepare('SELECT key, value FROM settings WHERE key != ?').bind('catalogVersion'),
  ]);
  const rawVersion = Number.parseInt(versionResult.results?.[0]?.value, 10);
  const version = Number.isSafeInteger(rawVersion) && rawVersion >= 0 ? String(rawVersion) : '0';
  const products = (productsResult.results || [])
    .map((row) => ({ ...JSON.parse(row.data), id: row.id }))
    .filter((product) => product.active !== false);
  const categories = (categoriesResult.results || []).map((row) => ({ ...JSON.parse(row.data), id: row.id }));
  const adsRow = adsResult.results?.[0];
  const ads = adsRow ? JSON.parse(adsRow.data) : { enabled: true, banners: [] };
  const settings = {};
  for (const row of settingsResult.results || []) {
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  return { version, products, categories, ads, settings };
}
