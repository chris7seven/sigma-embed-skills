# Screenshots → app

The goal: someone from the prospect looks at the app and thinks "that's our product with something new in it." Fidelity means the chrome (top bar, nav, typography, colors, density), not their data screens pixel for pixel.

## 1. Inventory the screenshots first

Open each screenshot with the Read tool and write a short manifest in `sigma_build/DOMAIN.md` under `## UI reference`:

| Region | What to capture | Anvilogic example |
|---|---|---|
| Top bar | Height, background, logo placement, global search text, right-side buttons, avatar | Charcoal bar, cloud logo + ANVILOGIC wordmark, "Search for threat actors, techniques, or use cases", cyan **AI Chat** button, bell, help, "RK" avatar |
| Primary nav | Rail vs. sidebar, icon set, active state, badges, the "+" button | Icon rail with a blue "+" on top, groups split by dividers, a red count badge, active = slate-blue tile |
| Home / hero | Headline, the hero control, chips, the AI entry point | "Search for events across [6 connected repositories ▾]", a big prompt box, Data Feeds / Detections / Hunting chips |
| AI surface | Thinking label, disclaimer, session header | "Sleuthing…", "Agents can make mistakes. Please double-check responses.", "Session - <timestamp>" |
| Core screens | Card style, KPI tiles, tables, tabs | Armory: four KPI tiles, three coverage donuts, "Recommended Detections" cards |
| Typography and density | Font family, weights, base size, radius, shadows | Inter-like sans, 13–14 px body, 4–8 px radius, low-contrast borders |

Then pick the page set. Mirror the prospect's real navigation names where possible (Anvilogic: Home, Armory, Hunt, Entity 360, Data Feeds), and add the embed pages: Command Center, My Workbooks, and the + menu.

## 2. Theme tokens (`app/src/styles/theme.css`)

Sample exact colors rather than guessing:
```
swift <skill>/scripts/palette.swift "<screenshot>.png"                  # dominant colors (4-bit quantized)
swift <skill>/scripts/palette.swift "<screenshot>.png" 120,40 900,520   # exact hex at image-pixel points
```

macOS screenshot names contain a narrow no-break space before AM/PM, so pass them through a glob (`ls …/Screenshot*3.23.23*.png`) instead of typing the name.

Fill the tokens:
- `--bg`, `--surface`, `--border`, `--border-strong`
- `--text`, `--text-muted`, `--text-subtle`
- `--brand`, `--brand-hover`, `--brand-soft`
- `--rail-bg`, `--rail-icon`, `--rail-bg-active`, `--topbar-bg`
- the status colors
- `--font`, `--radius*`

Check that text contrast on `--surface` stays at 4.5:1 or better.

Then mirror the palette into the Sigma side so the embedded workbook matches:
- `CANVAS`/`CARD`/`INK`/accent constants and `SCHEME` at the top of `sigma_build/build_workbook.py`
- `DARK_THEME` in `app/server/templates.js`

If the prospect's app is light, use a light Sigma theme (`settings.theme.name: "Light"`) and set `SIGMA_REPORT_EMBED_THEME=Light`.

## 3. Logo and shell

- **Logo:** an inline-SVG component (`components/shell/<Prospect>Logo.tsx`) with a mark plus a wordmark. Approximate the mark from the screenshot; don't fetch or embed the prospect's real logo files unless the user supplies them. Rename every import.
- **Top bar** (`AppShell.tsx`, `shell.css`): match the height, search placeholder, AI button label and avatar initials (the persona's).
- **Nav** (`Sidebar.tsx`): `GROUPS` sets the rail items, routes, icons (lucide-react) and badges. Keep `<CreateMenu />` as the top "+" button. Its items are New <primary action> / New workbook / New report; rename the first to the prospect's verb (Anvilogic: "New hunt"). If the prospect uses a labeled sidebar instead of a rail, restyle `.shell-rail` and keep the component.

## 4. Home (`pages/Home.tsx`, `data/home.ts`, `home.css`)

Recreate the prospect's hero. The hero's prompt box *is* the AI Chat entry: it calls `send()` from `useAgent()`. The quick-start cards should be the golden-path questions from `DOMAIN.md`. `HOME_CONTEXT` is what the agent is told about the page.

## 5. Domain pages (`pages/<domain>/`)

Build one page per prospect screen you chose. Each page:
- Reads summaries from `src/data/generated/*.json`. `scripts/build-data.mjs` builds those from `sigma_build/out`, using **the same formulas** as the data model's governed columns.
- Calls `usePageContext({page, details})` with a compact, factual description. That text becomes page-aware context for the AI drawer.
- Has an "Ask AI about this…" or "AI Assist →" button that opens the drawer (`openPanel`) or sends a fixed prompt.

Reuse `pages/soc/ui.tsx` (cards, KPI tiles, mini charts) and `soc.css` as the kit. Rename the folder to the prospect's domain.

## 6. AI voice

| File | Change |
|---|---|
| `components/agent/AgentProvider.tsx` | The persona system message: who the AI is, who the user is, the white-label rule ("never mention Sigma…"), tone |
| `components/agent/AgentPanel.tsx` | `SUGGESTIONS` per page and `suggestionsFor()` routing. The first item on each page is the verified golden-path wording |
| `components/agent/AgentConversation.tsx` | The white-label rewrite (`Sigma` → prospect name) and the thinking label ("Sleuthing…") |
| `server/mock.js` | Keyword-matched canned answers for mock mode, one per storyline plus a default |

## 7. Copy strings

`index.html` `<title>`, `package.json` `name`, the `CONTEXT` in `pages/embed/CommandCenter.tsx`, and the subtitles in `MyWorkbooks.tsx` and `CreateArtifactModal.tsx`. Then run `find-leftovers.sh`.

## Don'ts

- Don't add a header strip above the embedded Command Center. The workbook carries its own header navigation.
- Don't show chart titles twice. Chat visuals come from the untitled Chart Library; the app renders the title.
- Don't leave buttons that do nothing on the golden path. Stub them visibly, or leave them out.
