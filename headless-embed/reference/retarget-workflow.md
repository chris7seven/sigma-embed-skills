# Retarget workflow

The paths below are relative to the demo folder (`<Prospect> Embed/`). Run Python with `python3 -I`; the scripts add their own folder to `sys.path`.

## 0. Setup (once per teammate, then once per prospect)

1. **Copy the folder.** Unzip the template into the prospect's customer folder and rename it `<Prospect> Embed`. Work on a copy, never on the template itself.
2. **Credentials.** `cp app/.env.example app/.env`, then set `SIGMA_CLIENT_ID` and `SIGMA_CLIENT_SECRET`. Use papercrane credentials with REST and embed privileges, created under Administration > Developer Access.
   - Also set `SIGMA_ORG_SLUG`, and `SIGMA_CONNECTION_NAME` (defaults to `Snowflake`).
   - Check the credential: `sigma_build/sigma.sh GET /v2/whoami` should return your `userId`.
3. **Bootstrap.** `python3 -I sigma_build/bootstrap.py --new "<Prospect>" [--demo "<Prospect> Embed"]`.
   - It finds or creates *your* My Documents/Demos and Demos/Data Models folders.
   - It picks up the connection's ID.
   - It clears the previous prospect's object IDs from `sigma_build/config.json`.
4. **Sanity run.** `cd app && npm ci`, then `python3 -I ../sigma_build/generate_data.py`, then `npm run build`. Then run `PORT=8795 node server/index.js` with `SIGMA_WORKBOOK_ID`/`SIGMA_AGENT_ID` still blank, which is mock mode.
   - Open the app and click around. You're seeing the *previous* prospect, which confirms the toolchain works.
   - `/api/health` returns `mock: true`.

## 1. Intake: propose, then confirm with the user

Read the screenshots (look at them with the Read tool) and the call notes. Then put a proposal in front of the user, using AskUserQuestion with a recommended option for each:

1. **Embedded persona.** Who is "inside" the prospect's product? Usually *their customer's* end user (Anvilogic: a customer SOC analyst). Sometimes it's the prospect's internal team.
2. **Story map.** Map the template's beats onto the prospect's domain. The beats are:
   - shift/morning brief
   - performance by entity, sliced by a channel/source dimension
   - a cost or allocation planner with a request → approve write-back
   - an experiment or tuning comparison with a promote write-back
   - an entity 360/investigation with a watchlist write-back
   - an AI analyst that answers across all of it

   Propose a vocabulary map (old term → new term), the way the `sigma-demo-retarget` skill does.
3. **Storylines.** Pick 2–4, each with an entity, a date window and a measurable signal:
   - **Open:** worked live in the demo, e.g. an incident spreading across 3 entities, still unreviewed.
   - **Resolved:** a decision already made and visible in history, e.g. a cost step-change after a routing decision.
   - **Hidden in totals:** a spike visible only when sliced by one channel, e.g. a false-positive spike on one feed.
4. **Data.** Fully synthetic is the default. A real papercrane table, re-skinned and date-shifted, can be added; search papercrane with the Sigma MCP first.
5. **Demo date and audience.** These set the depth and the as-of date.

Record the answers in `sigma_build/DOMAIN.md` before writing code.

## 2. Domain contract (`sigma_build/DOMAIN.md`)

Keep the Anvilogic file's structure:
- story and personas (the embed user and the approver)
- the list of channel/source entities with their unit costs
- each storyline with its exact entity, dates and target numbers
- the table list (grain and key columns)

Set the as-of date (the last complete data day) in `config.json` as `as_of`. Every relative window ("last 7 days") anchors to it.

## 3. Data (`sigma_build/generate_data.py`)

Rewrite the domain while keeping the conventions:
- `random.Random(7)` for determinism
- 12 months of complete days ending at `as_of`
- small dimension tables plus 1–3 fact tables
- storylines injected with fixed dates *after* random generation, so the live-demo entity never rounds to zero
- every table written to `out/<name>.sql` (literal VALUES, typed timestamps) and `out/<name>.json`

Check the storylines straight from the JSON, before any Sigma work:
- month-by-month signal for the storyline entity vs. the baseline
- the story signal is at least 2–3× the baseline. See "storyline visibility" in `gotchas.md`.

## 4. Data model (`sigma_build/build_datamodel.py`)

The pattern is one Custom SQL element per analysis grain. Facts are **pre-joined** to their dimensions inside the statement (CTEs over the literal VALUES), so charts and the agent never need cross-element lookups. Calculated flag columns go on the fact (`Is X`, `Is Reviewed`), and metrics are defined as ratios of sums. A metric `timeline` goes on the primary date. The full pattern is in `sigma-build.md`.

```
python3 -I sigma_build/build_datamodel.py
python3 -I sigma_build/deploy.py datamodel      # first run: POST, saves data_model_id
python3 -I sigma_build/deploy.py materialize    # required: literal VALUES are slow and hit SQL size limits
```
Gate: query each fact through the Sigma MCP (`query`, type `datamodel`) and confirm every storyline number.

## 5. Command Center workbook (`sigma_build/build_workbook.py`)

Rewrite the pages from the patterns in `sigma-build.md`, keeping the helpers, the `preflight()` check and the dark-theme block. Recolor to the prospect palette.

```
python3 -I sigma_build/build_workbook.py --dry && sigma_build/sigma.sh POST /v2/workbooks sigma_build/build/wb_dry.json
python3 -I sigma_build/build_workbook.py && python3 -I sigma_build/deploy.py workbook
SW=$(ls -d ~/.claude/skills/sigma-workbooks/scripts ~/.claude/plugins/cache/sigma-computing/sigma-computing/*/skills/sigma-workbooks/scripts 2>/dev/null | head -1)
export SIGMA_BASE_URL=https://api.sigmacomputing.com SIGMA_API_TOKEN=$(cat sigma_build/build/.token)   # sigma.sh caches the token there
bash "$SW/verify-workbook.sh" <workbook_id>
ruby "$SW/wb-rep.rb" pull <workbook_id> sigma_build/build/rep && ruby "$SW/wb-rep.rb" render sigma_build/build/rep   # page PNGs in build/rep/renders
```
Gates:
1. All elements compile.
2. You've looked at every rendered page PNG: colors map to the right categories, there are no partial-month dips, and no labels are truncated.
3. You've called the agent (`call_agent` via the Sigma MCP) with each hero question, and the answers are correct with numbers that tie out.

## 6. Embed wiring

1. Run `python3 -I sigma_build/deploy.py env`. It copies the workbook, agent and data model IDs into `app/.env`.
2. In `.env`, set the persona (`SIGMA_EMBED_USER_EMAIL`, `SIGMA_EMBED_FIRST_NAME`, `SIGMA_EMBED_LAST_NAME`) and team names (`SIGMA_EMBED_TEAM`, `SIGMA_APPROVER_TEAM`, for example `Acme_Embed_Demo` and `Acme_Approvers`).
3. Run `Set Up Embedding.command`. It creates or reuses the teams and the user-workbooks folder, grants view, and writes the IDs to `.env`.
4. Write `app/server/element-index.json`: one entry per chat-worthy element of the Command Center. Each entry needs `key`, `elementId`, `title`, `kind`, `page`, a `description` that says exactly when to use it, example `questions`, `height`, and `workbook` (the slug and urlId of the Command Center for now).
5. Copy the visuals out: `cd app && node server/chart-library/extract-cc.mjs`. It writes `specs/cc-<key>.json` and sets `exploreSpec`.
6. Build the untitled Chart Library: `python3 -I sigma_build/build_chart_library.py --post`.
   - Add `FIXES` entries for any copy that reads a Command Center control (a segmented window, a single-select picker) or unions in an input table.
   - **Re-run this every time you re-run `extract-cc.mjs`.**
7. Retarget `app/server/templates.js`: 3–4 workbook starters and 1–2 report starters, all on the new data model.
8. Run the dry runs:
   - `node <skill>/scripts/dry-run-templates.mjs app`
   - `node <skill>/scripts/dry-run-explore.mjs app`
   - `curl localhost:8787/api/embed/status` should show both sections configured.
9. Do the manual step, which is UI-only: on each input table, set *Data entry permission → Only in published version*, then publish.

## 7. App reskin (see `screenshots-to-app.md`)

Work in this order, building as you go:
1. theme tokens
2. logo
3. shell (top bar, rail or sidebar)
4. home hero, quick starts and context
5. domain pages (one per prospect screen, data from `build-data.mjs`)
6. routes and rail items
7. agent persona, white-label word and per-page suggestions
8. mock answers
9. copy strings (`index.html`, `package.json`, Command Center `CONTEXT`, embed page copy)

Gate: `bash <skill>/scripts/find-leftovers.sh "<demo folder>" "<old prospect>|<old customer>|<old persona>"` returns nothing outside history docs, and `npm run build` passes.

## 8. Verify, document, package (see `verification.md`)

1. Run every golden-path step with `cdp-shoot.mjs` plans. Record the time to first text and to a full answer, and whether a visual was attached.
2. Write `DEMO_SCRIPT.md` (step table, talk track, presenter notes, recovery tips, verified Q&A prompts) and `sigma_build/BUILD_STATUS.md` (IDs, URLs, deviations, manual steps).
3. Sanitize and zip. Never include `app/.env`.
