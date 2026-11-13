---
name: headless-embed
description: Retarget the "headless embed" Sigma demo (a white-labeled React app that embeds Sigma, from a zipped "<Prospect> Embed" folder such as Anvilogic Embed) for a new prospect, using screenshots of the prospect's own SaaS app. Rebuilds every piece end to end - the app's look and pages (theme, logo, nav shell, home hero, domain pages), the synthetic dataset and storylines, the Sigma data model (materialized), the embedded Command Center workbook with write-back and a Sigma agent, the untitled Chart Library behind the AI Chat's live visuals, explore-to-workbook specs, the + New workbook/report starters, embed users/teams/folders, and the demo script. Use when someone says "headless embed", "retarget the embed demo", "make the Anvilogic/Uniphore embed demo for <prospect>", or shares screenshots of a prospect's product and wants Sigma embedded inside a lookalike of it. Requires Sigma API credentials (papercrane by default); pairs with the sigma-workbooks, sigma-data-models, sigma-reports and sigma-api skills.
---

# Headless Embed Demo: retarget for a new prospect

The package is a working demo of **Sigma embedded "headlessly" inside a prospect's own product**: a React + Node app that looks like the prospect's SaaS UI, with Sigma supplying the AI analyst (Run-agent API), live governed visuals inside the chat, a full embedded dashboard with write-back, self-service workbooks and reports, and PDF export. Nothing on screen says Sigma.

This skill turns the shipped example (Anvilogic, a SOC / threat-detection platform) into the same demo for a different prospect, driven by screenshots of that prospect's app.

## What the user gives you

1. **The demo folder**, unzipped (for example `~/Desktop/Customer Folders/<Prospect>/`). It contains `app/` (React + proxy), `sigma_build/` (data, data model, workbook and chart-library build scripts plus `config.json`), `DEMO_SCRIPT.md`, and launchers.
2. **Screenshots** of the prospect's product: home, navigation, two or three core screens, and any AI/chat surface. Three to eight is plenty.
3. Ideally **call notes** (Gong summary or transcript): who's attending, their use cases, what they asked to see.

If any of these are missing, ask for them before building.

## Non-negotiables

- **Never ship or zip `app/.env`.** It holds an API secret. Package with the sanitize command in `reference/verification.md`.
- **Confirm the story with the user before generating data or Sigma content**: the persona, two to four storylines, the page set and the data source. Use the intake questions in `reference/retarget-workflow.md` § 1. This is the user's call, not yours.
- **Build Sigma content in the caller's own My Documents/Demos.** `bootstrap.py` resolves those folders for whoever's credentials are in `.env`. Never write into another person's folders.
- **Verify with evidence**: query numbers, render pages, drive the real UI headlessly, read iframe `src` attributes. Spec acceptance isn't proof. Report failures plainly.
- **Synthetic data stays obviously fictional**: a fictional customer company, documentation IPs (RFC 5737), private ASNs, fictional domains. Never attach a negative storyline to a real company.

## Workflow (detail in `reference/retarget-workflow.md`)

| Phase | Do | Gate before moving on |
|---|---|---|
| 0. Setup | Unzip; `cp app/.env.example app/.env` and add credentials; `python3 -I sigma_build/bootstrap.py --new "<Prospect>"`; run `Start Demo.command` once in mock mode | Mock app loads at :8787; `config.json` has *your* folder IDs |
| 1. Intake | Inventory the screenshots and notes; propose the persona, storylines, page map and data source; **ask the user to confirm** | User confirmed |
| 2. Domain contract | Write `sigma_build/DOMAIN.md` (story, personas, entities, tables, storylines with numbers) | Every storyline has an entity, a date window and a measurable signal |
| 3. Data | Rewrite `generate_data.py` (deterministic, storylines injected) | Storylines are visible in the generated JSON *and* stand out from the baseline |
| 4. Data model | Rewrite `build_datamodel.py`; then `deploy.py datamodel`, `deploy.py materialize` | Data model queries return the storyline numbers |
| 5. Workbook | Rewrite `build_workbook.py` from the page patterns; run `deploy.py workbook`; verify; render | All elements compile; renders look right; agent answers the hero questions |
| 6. Embed wiring | `deploy.py env`, team names in `.env`, `Set Up Embedding.command`, element index, `extract-cc.mjs`, `build_chart_library.py --post`, `templates.js` | Explore and template dry runs pass; `/api/embed/status` is configured |
| 7. App reskin | Theme tokens, logo, shell, home hero, domain pages, agent persona and suggestions, mock answers, `build-data.mjs` | `find-leftovers.sh` shows no previous-prospect words; build passes |
| 8. Verify and package | Drive every golden-path step with `cdp-shoot.mjs`; write `DEMO_SCRIPT.md` and `BUILD_STATUS.md`; sanitize and zip | Measured timings in the script; zip contains no `.env` |

## Reference index

| File | Read when |
|---|---|
| `reference/architecture.md` | Start here. What every piece is, how the app, proxy and Sigma connect, and which files are generic plumbing vs. prospect content. |
| `reference/retarget-workflow.md` | Running the phases: exact commands, intake questions, gates. |
| `reference/screenshots-to-app.md` | Phase 7: turning prospect screenshots into theme tokens, the nav shell, the home hero and domain pages. |
| `reference/sigma-build.md` | Phases 3–6: data generator conventions, data model pattern, workbook page patterns, write-back, agent instructions, Chart Library, starters. |
| `reference/gotchas.md` | **Before** any Sigma POST/PUT or embed change, and whenever something behaves oddly. Every entry was hit during the Anvilogic build. |
| `reference/verification.md` | Phase 8, plus the checks after each phase. Includes `cdp-shoot` plans and the sanitize-and-zip command. |
| `reference/anvilogic-example.md` | The worked example: story, storyline numbers, Sigma IDs, measured timings. Use it as the bar to match. |

## Scripts (in this skill's `scripts/`)

| Script | Use |
|---|---|
| `cdp-shoot.mjs <plan.json> <outDir> [--base URL]` | Drive the running app in headless Chrome: navigate, click, type, wait for an agent answer, read iframe `src`, record Sigma postMessage events, screenshot. |
| `dry-run-templates.mjs <app>` | Dry-run every + New workbook/report starter against Sigma (creates nothing). |
| `dry-run-explore.mjs <app>` | Dry-run every Explore-in-workbook spec in the element index. |
| `pdf-page.swift in.pdf out.png <i>` | Render any PDF page (`sips` only renders page 1). Use it to check report exports. |
| `find-leftovers.sh <dir> "<regex>"` | Find the previous prospect's vocabulary still left in the folder. |

Inside the demo folder, `sigma_build/` has `bootstrap.py`, `deploy.py`, `sigma.sh` (an authenticated curl) and `put_wb.sh`. The `sigma-workbooks` skill's `scripts/verify-workbook.sh` and `scripts/wb-rep.rb render` (page PNGs) are the compile and render checks. Load `sigma-workbooks`, `sigma-data-models` and `sigma-reports` when you need spec shapes this skill doesn't show.
