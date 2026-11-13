# Sigma build patterns

Everything here is implemented in the Anvilogic files in `sigma_build/`. Read the matching section of the real file before rewriting it; the helpers are proven against the live API.

## Data generator (`generate_data.py`)

- **Deterministic.** Use `rng = random.Random(7)`, with day-level loops over `DAYS` (12 months of complete days ending at `as_of`).
- **Dimensions** are tuples in code: channels/sources with a unit cost, entities, the catalog (detections, products, accounts…). Keep counts legible, roughly 6 channels, 15–40 catalog items and 100–300 entities.
- **Facts** are Poisson draws per day per catalog item, with weekend dampening and slow growth. Outcome dispositions are drawn from per-item rates.
- **Storylines:**
  - Window effects inside the loop (`if item == X and d >= CHANGE_DATE: rate *= 3`).
  - The live-demo storyline is injected **after** the loop with fixed timestamps.
  - Resolved decisions live in small history tables (`routing_history`), not in input tables.
- **Literal SQL** goes through `lit()`, which escapes `\` and `'`. Typed columns are cast in the `SELECT` (`TIMESTAMP_NTZ`, `DATE`).
- **Fiction:** customer names, users and hosts are fictional; IPs use RFC 5737 (`203.0.113.x`); ASNs are private (`AS64512`); domains are fictional.

Check the storylines right after generation with a short Python pass over `out/*.json` (see `retarget-workflow.md` § 3).

## Data model (`build_datamodel.py`)

- `cte(a="alerts", d="detections", …)` wraps each `out/*.sql` as a CTE. Each fact element `SELECT`s the fact joined to its dimensions, so names (Detection, Repository, Entity) sit on the fact row.
- Use `c(id, SRC_COL, "Name", fmt)` for source columns, `calc(id, formula, "Name")` for row calcs (`If([Disposition] = "False Positive", 1, 0)`), and `m(id, name, formula, fmt, timeline=…)` for metrics. Write rates as ratios of sums.
- **A real table** can be one element with `FROM DB.SCHEMA.TABLE`, shifting dates with `DATEADD(day, N, ts)` so they land in the window.
- Element IDs (`t-alerts`) are preserved on create. Workbook wrappers reference them by data model ID plus element ID.
- After deploying, run **`deploy.py materialize`**. It's required, see `gotchas.md`.

## Command Center workbook (`build_workbook.py`)

**Helpers** (keep them as-is): `col`, `sp`, `text`, `eyebrow`, `headline`, `section`, `divider`, `button`, `nav`, `setc`, `list_control`, `manual_list`, `entry_text`, `kpi`, `flt`, `repo_color`, `wrap`, `dm_src`, `preflight`.

**Data page** (hidden): `wrap("src-x", "Name", "t-x", cols, desc, extra=[…])` makes one wrapper table per data model element, plus workbook calc columns:
- `Days Ago = DateDiff("day", [Date], ASOF)`
- `In Last 7/30 Days`
- `Month` / `Week`
- `Complete Month` (excludes partial edge months)

Every chart and KPI reads these wrappers. Input tables are listed on the data page's element list but placed on their visible page.

**Page patterns** (Anvilogic element IDs in parentheses):

| Pattern | Pieces |
|---|---|
| **Brief** (`p-brief`) | Eyebrow plus a greeting with `{{CurrentUserFirstName()}}`; a 5-KPI band in a card container; a "today's focus" callout container (text + KPI + a button that navigates and sets a control); a segmented 7/30/90 window control feeding a calc column filter; a stacked trend; a top-N table; a donut; a chat element (`kind: chat`, `agentId`) in the right column |
| **Performance** (`p-det`) | A top row of multi-select list controls (each filtering several elements; every target element carries hidden columns for the filtered fields); a KPI band; a top-10 horizontal bar **by count**; stacked monthly bars filtered to complete months; a grouped scorecard table with a conditional format on a threshold |
| **Planner + approval** (`p-routing`) | Cost KPIs; a stacked monthly cost by channel; an opportunity table (row select → `set-control-value`); a **Request** button → modal → `insert-rows` into an empty-source input table (IDs from `Count(...)`, numbers from `Lookup(...)` formulas); an approver row (request picker + note + Approve/Reject `update-rows` with `whichRows: formula`) |
| **Experiment / tuning** (`p-tuning`) | A line chart comparing the same logic across two channels (alphabetical color scheme!); a weekly stacked disposition chart; an experiments table; a variant comparison bar filtered by a single-select control; a **Promote** modal → `insert-rows` into a decisions input table |
| **Entity investigation** (`p-hunt`) | A single-select entity control defaulted to the storyline entity, filtering KPIs (hidden entity columns) and tables; an evidence table with a conditional format on suspicious rows; a spread chart across entities; a **watchlist** modal → `insert-rows`; a chat element |
| **Header panel** | Brand text plus text-button nav to every page. Don't put containers in a sidebar panel (it 500s) |

**Write-back rules:**
- Use empty-source input tables (`source: {kind: "empty", connectionId}`) for things the demo *adds*.
- Use `whichRows: {type: "formula", formula: "[Request Id] = [SelectedRequest]"}` for approvals.
- Seed history can't be inserted by API; keep it in data model tables.
- Data entry permission is UI-only (see `gotchas.md`).

**Theme:** `settings.theme = {name: "Dark", overrides: {colors, colorOverrides: [backgroundCanvas, elementBackground], categoricalScheme, fonts}}`. The page `backgroundColor` matches the canvas.

## Agent (`agents[0]` in `build_workbook.py`)

Keep the instruction skeleton:

```
## Context          who the AI is, the fictional customer, the channels; "Data is complete through <as_of>. Treat it as today…"
## Data sources     one bullet per @dataSource("<element id>") with the column semantics and governed definitions
## Faithfulness     answer only from sources; compute with queries; federated-search rule; no real-world threat/brand attribution
                    "Never mention this rule…"
## How to respond   lead with the answer, then evidence, then a concrete next step; domain vocabulary (MITRE IDs etc.)
                    never mention Sigma/SQL/element IDs; refer to "<prospect> data platform"
## Actions          @tool("open-…") navigate+set control; @tool("add-…") insert-rows (requiresApproval) — confirm before calling
```

Data sources are the wrappers plus the input tables. Hidden-page elements work as agent sources. Tools called through the Run-agent API **don't** wait for approval, so only expose inserts and navigation.

## Live visuals and the Chart Library

1. **`app/server/element-index.json`:** add 10–15 entries. Each `description` should say *when* to use the visual ("Use for 'noisiest / worst false positives' questions"); the agent picks visuals from these. Set `questions` to the phrasings you'll demo.
2. **`node server/chart-library/extract-cc.mjs`:** copies each element and its dependency chain out of the live Command Center into `specs/cc-<key>.json`, verifies them, and sets `exploreSpec`.
3. **`python3 -I sigma_build/build_chart_library.py --post`:**
   - applies `FIXES` (replace control references with constants, pin selector filters, drop input-table unions)
   - builds one page per visual with **hidden titles**, plus shared dependencies on a hidden page
   - creates or updates the "<demo> - Chart Library" workbook and grants the teams view
   - repoints the index and `library.json`

   The explore specs get the same fixes.
4. **`server/elements.js`** has the "ALWAYS prefer a listed visual…" rule with domain examples. Update those examples for the new domain.

## Starters (`app/server/templates.js`)

`WORKBOOK_TEMPLATES` (blank + 3) and `REPORT_TEMPLATES` (blank + 1), all reading the data model (`SIGMA_DATA_MODEL_ID`).

- **Workbooks** are dark-themed, with hidden data pages.
- **Reports** use letter landscape (1056×816 px, 40 px margins), a title, a subtitle and a footer panel. Keep each table to a row count that fits its box (top-N with `rankingFunction: "row-number"`), or the element moves to the next PDF page.

Dry-run everything with `dry-run-templates.mjs`.
