# Verification and packaging

"It POSTed" isn't verification. Each phase has a check that produces evidence: a number, a PNG or an iframe `src`.

## Per-phase checks

| After | Check | Tool |
|---|---|---|
| Data | Storyline signal by month vs. baseline; the live-demo entity has its fixed rows | Python over `sigma_build/out/*.json` |
| Data model | Each storyline number, queried through Sigma | Sigma MCP `query` (type `datamodel`) |
| Materialize | A multi-KPI query that used to exceed the SQL size limit now returns | Sigma MCP `query` (type `workbook`) |
| Workbook | `All N element(s) compile cleanly` | `$SW/verify-workbook.sh <id>` (`$SW` = the sigma-workbooks skill's `scripts/`, personal or plugin copy; see `retarget-workflow.md` § 5) |
| Workbook | Every page PNG reviewed: colors, empty charts, truncation, partial months | `wb-rep.rb pull` + `render` |
| Agent | Hero questions answer correctly, with numbers that tie out and visuals attached | Sigma MCP `call_agent`, then the proxy: `curl -N localhost:8787/api/agent/run` |
| Embed | `/api/embed/status` configured; `/api/health` `mock:false` | curl |
| Explore / starters | `15/15 explore specs pass`; every template `OK` | `dry-run-explore.mjs`, `dry-run-templates.mjs` |
| Report starter | One-page PDF with every element present | `POST /v2/reports/{id}/export` → `GET /v2/query/{q}/download` → `pdf-page.swift` per page |
| App | `npm run build` passes; no leftovers | `find-leftovers.sh` |
| Golden path | Each step drives cleanly in the real UI, with time to first text and full answer | `cdp-shoot.mjs` plans below |

## cdp-shoot plans (in `scripts/plans/`)

Start the app (`Start Demo.command`, or `cd app && node server/index.js`), then run:

```
node <skill>/scripts/cdp-shoot.mjs <skill>/scripts/plans/routes.json  shots/   # every route + Command Center iframe src
node <skill>/scripts/cdp-shoot.mjs <skill>/scripts/plans/hero.json    shots/   # hero question -> answer + live visual count
node <skill>/scripts/cdp-shoot.mjs <skill>/scripts/plans/drawer.json  shots/   # page-aware drawer prompt
node <skill>/scripts/cdp-shoot.mjs <skill>/scripts/plans/create.json  shots/   # + menu -> workbook starter -> editor
node <skill>/scripts/cdp-shoot.mjs <skill>/scripts/plans/report-modes.json shots/  # edit/view iframe src + PDF download
```

The plans use the Anvilogic routes and selectors. Edit the paths, the card text and `REPORT_URL_ID` for the new app. Look at every screenshot with the Read tool. Use `--base http://localhost:8791` to test a second server with different env vars without touching the live one.

Things the plans have caught:
- A Command Center blocked by empty team IDs
- An empty chart left by a control-dependent copy
- A chat visual showing a duplicate title
- A report Edit that was really view-only (read the iframe `src` *and* look at the screenshot; the events list showed `EACCES`)

## Timings to record in DEMO_SCRIPT.md

Anvilogic numbers for comparison:

| Step | First text | Full answer |
|---|---|---|
| Hero question | 10–15 s | about 30 s |
| Drawer prompt | — | about 32–35 s |
| Routing question | about 10 s | about 14 s |
| Visual | — | 5–7 s after the answer |
| Command Center tiles | — | 6–14 s (materialized) |
| Create workbook → editor | — | 3–5 s |

Anything over about 45 s goes in Q&A, not the golden path.

## Sanitize and zip (never ship `app/.env`)

```
cd "<parent folder>"
rm -rf "<Prospect> Embed/app/node_modules" "<Prospect> Embed/app/dist" "<Prospect> Embed/sigma_build/build" \
       "<Prospect> Embed/sigma_build/out" "<Prospect> Embed/app/src/data/generated" "<Prospect> Embed/sigma_build/__pycache__"
zip -r "<Prospect>-Embed.zip" "<Prospect> Embed" -x "*/.env" "*/.DS_Store" "*/node_modules/*" "*/.token"
unzip -l "<Prospect>-Embed.zip" | grep -E "\.env$|\.token$" && echo "STOP: secret in zip" || echo "clean"
```

To strip the build outputs from a copy *without* touching a working demo, copy it first with `rsync -a --exclude node_modules --exclude dist --exclude .env --exclude 'sigma_build/build' --exclude 'sigma_build/out' --exclude 'app/src/data/generated' src/ dst/`, then zip the copy.
