#!/usr/bin/env node
// Dry-run every "Explore in workbook" spec referenced by app/server/element-index.json (nothing is created).
//   node dry-run-explore.mjs <path/to/app>
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
const APP = process.argv[2];
(await import(join(APP, 'node_modules/dotenv/lib/main.js'))).default.config({ path: join(APP, '.env') });
const { sigmaFetch } = await import(join(APP, 'server/sigma.js'));
const { buildExploreSpec } = await import(join(APP, 'server/chart-library/specs.mjs'));
const keys = JSON.parse(readFileSync(join(APP, 'server/element-index.json'), 'utf8')).elements.map((e) => e.exploreSpec).filter(Boolean);
let ok = 0;
for (const key of keys) {
  const b = buildExploreSpec(key, { name: 'dry ' + key, folderId: process.env.SIGMA_USER_WORKBOOKS_FOLDER_ID });
  const r = await sigmaFetch('/v2/workbooks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: b.name, folderId: b.folderId, contents: b.document, dryRun: true }) });
  const t = await r.text(); const good = r.ok && !/"valid"\s*:\s*false/.test(t); ok += good;
  if (!good) console.log('FAIL', key, r.status, t.slice(0, 300));
}
console.log(`${ok}/${keys.length} explore specs pass dry run`);
process.exit(ok === keys.length ? 0 : 1);
