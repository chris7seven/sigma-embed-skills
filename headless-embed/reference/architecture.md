# Architecture

## The pieces

```
 Prospect-lookalike React app (Vite)        Node proxy (Express :8787)              Sigma (papercrane)
 ┌──────────────────────────────┐  /api/*  ┌──────────────────────────────┐  REST   ┌──────────────────────────────────┐
 │ Shell: top bar, rail, theme  │ ───────▶ │ /api/agent/run  (SSE)        │ ──────▶ │ Workbook agent (Run-agent API)   │
 │ Home: hero prompt + AI chat  │          │   OAuth token cache, SSE     │         │   in the Command Center workbook │
 │ Domain pages (static data    │          │   normalizer, white-label    │         │                                  │
 │   from the same generator)   │          │   rewrite, mock mode         │         │ Data model (Custom SQL, literal  │
 │ AI drawer (page-aware)       │          │ /api/embed/*, /api/workbooks │  JWT    │   VALUES, materialized daily)    │
 │ Live visuals in chat ────────┼──iframe──┼─▶ signs one-time JWT URLs    │ ──────▶ │ Command Center workbook          │
 │ Command Center page ─────────┼──iframe──┤   (secret never leaves)      │         │   (pages, write-back, modals)    │
 │ My Workbooks + editor ───────┼──iframe──┤ /api/explore, /api/reports   │         │ Chart Library workbook           │
 │ "+" create menu              │          │ /api/templates               │         │   (untitled copies for the chat) │
 └──────────────────────────────┘          └──────────────────────────────┘         │ User workbooks/reports folder    │
                                                                                     └──────────────────────────────────┘
```

**How a chat answer gets a live visual.** The proxy appends a catalog of `server/element-index.json` entries to the agent's single system message. When one fits, the agent ends its reply with a ```` ```visual {"key":"…"} ```` block. The client then asks `/api/embed/element` for a signed element URL and renders it under the app's own title. That's why the Chart Library copies have hidden titles. If no visual fits, the agent emits a ```` ```chart ```` block, which the app draws with Recharts.

**Explore in workbook.** The `/api/explore` endpoint creates a new workbook in the user folder from `server/chart-library/specs/cc-<key>.json` (the visual plus its dependency chain), then opens it in edit mode.

**+ menu.** It covers New hunt, New workbook and New report. New workbook and New report call `/api/workbooks` or `/api/reports` with a starter from `server/templates.js`, grant the embed team access, and open the result in edit mode.

**Embed identity.** Every visitor is signed in as one external embed user (for example `riley.kim@kestrel-demo.com`). That user gets `account_type: Build`, the team named in `SIGMA_EMBED_TEAM`, and `first_name`/`last_name` claims.

**Numbers match.** The app's static page numbers (`src/data/generated/*.json`, built by `scripts/build-data.mjs`) and the Sigma data model both read the same `sigma_build/out/*.json`. Use the *same formulas* as the governed columns, or the page and the agent will disagree.

## File map: generic plumbing vs. prospect content

**Generic.** Reuse these as-is. Change them only to fix bugs.

| Path | What |
|---|---|
| `app/server/index.js`, `sigma.js` | Express server, agent proxy, SSE normalizer, OAuth, mock switch |
| `app/server/embed.js` | JWT signing, embed URLs, workbooks/reports list/create/embed, grants, report edit/view rules |
| `app/server/elements.js` | Element-index loader, live-visual instruction, element embed, explore |
| `app/server/chart-library/extract-cc.mjs`, `specs.mjs` | Copies index elements and dependencies out of the live Command Center; verifies them |
| `app/src/components/agent/*` (except persona strings) | Chat UI, chart rendering, embedded visuals, provider and history |
| `app/src/pages/embed/*` (except context strings) | SigmaFrame, Command Center page, My Workbooks, editor (workbook or report) |
| `app/src/components/create/*` | + menu and create dialog |
| `sigma_build/config.py`, `bootstrap.py`, `deploy.py`, `sigma.sh`, `put_wb.sh` | Config, account bootstrap, create/update/materialize, curl helpers |
| `sigma_build/build_chart_library.py` | Builds the untitled Chart Library and fixes control-dependent copies (edit `FIXES` only) |
| `app/scripts/embed-setup.sh`, launchers | Teams, user folder and grants (names come from `.env` and `config.json`) |

**Prospect content.** Rewrite these for each new prospect.

| Path | What | Phase |
|---|---|---|
| `sigma_build/DOMAIN.md` | The story contract | 2 |
| `sigma_build/generate_data.py` | Deterministic synthetic data and storylines | 3 |
| `sigma_build/build_datamodel.py` | Data model elements, columns, metrics | 4 |
| `sigma_build/build_workbook.py` | Command Center pages, write-back, modals, agent | 5 |
| `app/server/element-index.json` | Which visuals the chat can show, with descriptions and example questions | 6 |
| `app/server/templates.js` | + New workbook/report starters | 6 |
| `app/src/styles/theme.css`, `components/shell/*` (logo, top bar, rail) | Look and nav | 7 |
| `app/src/pages/Home.tsx`, `src/data/home.ts` | Hero, quick starts, home context | 7 |
| `app/src/pages/<domain>/*` (Anvilogic: `pages/soc/`) | Domain pages (Armory, Detection detail, Entity 360, Data Feeds) | 7 |
| `app/src/App.tsx`, `components/shell/Sidebar.tsx` | Routes and rail items | 7 |
| `app/src/components/agent/AgentProvider.tsx` (persona), `AgentPanel.tsx` (suggestions), `AgentConversation.tsx` (white-label word) | AI voice | 7 |
| `app/server/mock.js` | Canned answers for mock mode | 7 |
| `app/scripts/build-data.mjs`, `src/data/<domain>.ts` | Summaries for the static pages | 7 |
| `app/src/pages/embed/CommandCenter.tsx` (`CONTEXT`), `index.html`, `package.json` name | Copy | 7 |
| `DEMO_SCRIPT.md`, `sigma_build/BUILD_STATUS.md` | Talk track, IDs, status | 8 |

## Proxy API (what the client calls)

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | `{configured, mock, agentName}` |
| `POST /api/agent/run` | `{messages}` → normalized SSE (`reasoning`, `delta`, `tool_call`, `tool_result`, `done`, `error`) |
| `GET /api/embed/status` | Which embed settings are present or missing |
| `POST /api/embed/url` | `{target:"command-center"}` → signed URL |
| `POST /api/embed/element` | `{key}` → signed element URL from the index |
| `POST /api/explore` | `{key}` → new workbook from the explore spec |
| `GET /api/workbooks` | Workbooks **and** reports in the user folder (`type` per entry) |
| `POST /api/workbooks` | `{name, template}` → new workbook from a starter (falls back to blank) |
| `POST /api/workbooks/:urlId/embed` | `{mode: view\|edit}` → signed URL (edit is a postMessage switch after load) |
| `POST /api/reports` | `{name, template}` → new report from a starter, team edit grant |
| `POST /api/reports/:urlId/embed` | `{mode}` → view URL `report/<id>` (with `:embed=true`), or edit URL `report/<id>/edit` (without `:embed=true`) |
| `GET /api/templates` | Starter catalog for the create dialog |
