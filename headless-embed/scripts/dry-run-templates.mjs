#!/usr/bin/env node
// Dry-run every "+ New workbook / report" starter in app/server/templates.js against Sigma (nothing is created).
//   node dry-run-templates.mjs <path/to/app>
import { join } from 'node:path';
const APP = process.argv[2];
(await import(join(APP, 'node_modules/dotenv/lib/main.js'))).default.config({ path: join(APP, '.env') });
const { sigmaFetch } = await import(join(APP, 'server/sigma.js'));
const { WORKBOOK_TEMPLATES, REPORT_TEMPLATES } = await import(join(APP, 'server/templates.js'));
const folderId = process.env.SIGMA_USER_WORKBOOKS_FOLDER_ID;
let bad = 0;
for (const [kind, set, path] of [['workbook', WORKBOOK_TEMPLATES, '/v2/workbooks'], ['report', REPORT_TEMPLATES, '/v2/reports']]) {
  for (const [key, t] of Object.entries(set)) {
    const res = await sigmaFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `dry ${key}`, folderId, contents: t.build(`Test ${t.label}`), dryRun: true }) });
    const txt = await res.text(); const ok = res.ok && !/"valid"\s*:\s*false/.test(txt); bad += !ok;
    console.log(ok ? 'OK  ' : 'FAIL', kind, key, res.status, ok ? '' : txt.slice(0, 700));
  }
}
process.exit(bad ? 1 : 0);
