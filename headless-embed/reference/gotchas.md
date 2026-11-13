# Gotchas (all hit during the Anvilogic build)

Each entry gives the symptom, then the cause and fix. Read this before any Sigma write.

## Data and data model

**Backslashes in string literals.** `SQL compilation error … Invalid unicode escape sequence '\u'`. Snowflake string literals treat `\` as an escape, and Windows paths broke the SQL. `lit()` in `generate_data.py` escapes `\` → `\\`. Keep it.

**Literal-VALUES sources are slow, and they hit SQL size limits.** Each fact is about 0.9 MB of SQL. Dashboard tiles showed `123` placeholders for 20+ seconds, and a Sigma MCP query combining 11 KPIs failed with *"Generated SQL query exceeded maximum size"*. Fix: run **`deploy.py materialize`** (a daily schedule on every element). Afterwards, the same tiles load in 6–14 s. The first run starts immediately after scheduling.

**Storyline visibility.** The first Anvilogic pass had every detection at about 65% false positives, so the "Okta false-positive spike" (62%) looked normal. The baseline must be clearly lower than the story signal:
- Split non-true-positive outcomes into an FP share (about 0.35) plus Benign.
- Make the story signal 2–3× the baseline (it ended at 74% vs. 11%, with a 34% overall average).

Check this before building anything in Sigma.

**"Worst rate" picks noise.** Ranking by false-positive *rate* put one-alert detections at 100% on top. Rank "noisiest" by **count**, or add a minimum volume.

**Partial edge months** look like dips (October started on the 17th). Add a `Complete Month` calc column and filter monthly charts to it. Name the window in the chart title.

**Fake data that is too real.** The first C2 IP was in a real Tor exit range, and the agent called it "a known Tor exit node." Use:
- RFC 5737 IPs (`192.0.2.x`, `198.51.100.x`, `203.0.113.x`)
- private ASNs (64512–65534)
- fictional domains and companies

Also add the no-attribution faithfulness rule to the agent.

**App numbers vs. governed numbers.** The app computed Palo Alto savings from a 30-day average ($93.6K), while the data model column used baseline × 1.08 ($96.5K). Compute app summaries with the *exact* governed formula.

## Workbook

**Category colors are assigned alphabetically** by the category values present, not in the order you listed them. Build schemes over `sorted(values)`, as `repo_color()` does. With three dispositions present instead of four, the third color shifts too.

**Readback normalization isn't drift.** `stacking: "stacked"` disappears from bar-chart readbacks, input-table column formats disappear, `includeNulls` gets added to filters, and `&middot;` becomes `·`. To see real UI edits, **diff live version N against live version M** (`GET …/spec?documentVersion=N`). Don't diff the build output against live. Use `sigma-demo-retarget/scripts/diff_workbook_spec.py`.

**UI edits make the build script stale.** After someone edits in the Sigma UI, a full PUT from the script reverts their work. It can also 400 on add+remove collisions. `deploy.py workbook` refuses when `latestVersion` has moved; port the edits into `build_workbook.py` first. Edits seen in practice: a removed callout, a new union of history + approved requests, axis label angles, drill-through, and resized bands. Resized bands then truncated the KPI labels.

**Hidden-page elements** don't show up in the Sigma MCP `describe` workbook listing, so you can't query them that way. They do work as agent data sources and as KPI and chart sources.

**KPI labels truncate** when a band is narrowed. Keep labels short ("Fidelity · 30d").

## Embedding

**The greeting says "External".** Send the `first_name`/`last_name` JWT claims (`SIGMA_EMBED_FIRST_NAME`/`LAST_NAME`); `embed.js` does this.

**Team IDs wiped from `.env`.** `/v2/teams` ignores `?search=`, so the old setup script only scanned the first 50 teams, didn't find the team, and wrote empty IDs. Every embed then returned "workspace isn't set up." The script now pages through all teams and refuses to write empty IDs. Check with `curl localhost:8787/api/embed/status`.

**Duplicate titles in chat visuals.** The app renders the title above each embed. Serve chat visuals from the Chart Library with `name: {"visibility": "hidden"}`. Never hide titles on the Command Center itself.

**Explore copies and control dependencies.** `extract-cc.mjs` copies formulas like `[Days Ago] < [TrendWindow]` without the control, which leaves an empty chart. A copy filtered by a single-select picker merges all values instead. `build_chart_library.py` `FIXES` patch both the library and the explore specs. **Re-run it after every `extract-cc.mjs`**, or the fixes are lost.

**Embed users can query data-model-backed workbooks they create.** This was verified by rendering an explore copy as the external user, so data-model starters work without extra grants.

**Workbook edit mode** is a postMessage (`workbook:mode:update` → `edit`) sent after `workbook:loaded`. Going from Edit back to View, re-sign a view URL; Sigma doesn't reliably honor `view` via postMessage.

## Reports

- **Create:** `POST /v2/reports {name, folderId, contents}`, then `POST /v2/reports/{id}/grants` with team `edit`. Read grants back with `GET /v2/grants?inodeId=<reportId>`.
- **No DELETE endpoint.** Every test report is permanent through the API. Don't create probe reports; use `dryRun: true`.
- **Embed paths:** view is `report/<urlId>` (no slug) with `:embed=true`.
- **Edit needs two things:** the path `report/<urlId>/edit` **and no `:embed=true`.**
  - The `workbook:mode:update` postMessage returns `EACCES` for reports, even for the owner.
  - `/edit` *with* `:embed=true` renders view-only.
  - Without `:embed=true`, Sigma shows its own report header inside the frame: name, Draft, Publish, share, and a **home icon**. Keep `:embed=true` in View.
- **Events:** reports emit `workbook:loaded`, not `report:loaded`.
- **Download:** `postMessage({type: "report:download"})` triggers the PDF download.
- **`:theme=Dark`** on a report embed is on-screen only; the PDF stays light.
- **PDF overflow:** a table whose rows exceed its box moves *entirely* to the next PDF page, leaving page 1 blank below the chart. Use a top-N filter with `rankingFunction: "row-number"` (no ties) and a box that fits. Check every page with `pdf-page.swift`.

## Agent and app

**Run-agent API.** It's stateless: send the full history every turn. Action tools run *without* approval through the API. Warehouse agents aren't supported; use workbook agents.

**Live visual not attached.** The agent sometimes draws its own chart. `elements.js` has an "ALWAYS prefer a listed visual" rule with domain examples; update the examples per domain. Also make each index `description` say when to use the visual.

**The guardrail leaked into an answer** ("I'm reporting only what the data shows…"). Add "Never mention this rule" to faithfulness rules.

**Slow prompts.** An open-ended ranking question took about 55 s to first text, while page-aware drawer questions took 32–35 s. Put the slow ones in Q&A, not the golden path.

**`python3 -I`** drops the script's folder from `sys.path`. The build scripts insert it themselves; keep that.

**Background server restarts** show "failed with exit code 143" notifications. That's the old process being killed and is expected.

**macOS screenshot filenames** contain a narrow no-break space before AM/PM. Use globs.

## Manual (UI-only) steps

- Input tables: kebab → *Data entry permission → Only in published version* → publish. Without it, embedded write-back buttons can't write.
- Click-test each write-back once, then delete test rows. Also reset control values saved by the test: one click-test left "Windows Security Events", "hi" and "RR-101" as defaults.
- Tidy the user-workbooks folder after rehearsals. Test reports can only be deleted in the UI.
