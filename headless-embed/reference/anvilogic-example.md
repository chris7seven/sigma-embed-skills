# Worked example: Anvilogic (papercrane, October 2026)

**Prospect:** Anvilogic, a SOC / threat-detection SaaS. Its themes are Splunk → Snowflake migration, federated search, and agentic SecOps. The audience was Deb Banerjee (exec) plus a PM. Embedding was their main interest ("the embed use case is the path").

**Story:** Kestrel Mutual, a fictional insurer, runs its SOC on Anvilogic across 6 repositories (Splunk Cloud, Snowflake, Databricks, CrowdStrike NG-SIEM, Sentinel, Elastic).
- **Persona:** Riley Kim (RK), a Tier-2 threat hunter, is the embed user.
- **Approver:** Dana Ortiz, the SOC manager.
- **As-of date:** 2026-10-16.

## Vocabulary map (Uniphore template → Anvilogic)

| Uniphore (marketing) | Anvilogic (SOC) |
|---|---|
| Campaigns | Detections (Armory) |
| ROAS | Detection fidelity / false-positive rate |
| Channels | Data repositories |
| Budget Planner (reallocation approval) | Data Routing Planner (reroute approval) |
| A/B tests | Detection tuning experiments (promote variant) |
| Customer 360 | Entity 360 (host / user) |
| Customer Genome | Data Feeds |
| Morning brief | SOC shift brief |

## Storylines (numbers as built)

1. **Open hunt.** Encoded PowerShell started on FIN-WS-0142 on Oct 9 and spread to FIN-WS-0157 and FIN-SRV-FS02.
   - 49 open alerts.
   - 42 encoded events in 7 days, 21 per repository: Script Block 4104 in Splunk, CrowdStrike FDR in Snowflake.
   - C2 is `203.0.113.47`.
2. **Resolved routing.** Zscaler and DNS moved from Splunk to Snowflake on 2026-08-03, and Splunk dropped from about $300K to about $185K a month. Palo Alto is the next opportunity at **$96,487/month**.
3. **Tuning.** Okta Impossible Travel false positives went from 11% to 74% after a VPN egress change on Sep 8; Azure AD stayed at 11%, and the SOC average is 34%. TX-031 Variant B takes false positives from 102 to 30 and keeps all 28 true positives.

## Sigma objects (papercrane, in Josh Jones's My Documents/Demos)

| Object | ID |
|---|---|
| Data model (10 elements, materialized) | `4dc07b51-9d18-4b1b-a315-48950ce60ccd` |
| Command Center workbook (5 pages, 3 input tables, 3 modals, agent `ag-soc`) | `8a217ded-3afe-40e8-abde-ef8a39017a0f` / urlId `4cEfjkQMr88pEEwDVerpZZ` |
| Chart Library (15 untitled visuals) | `34be297c-f4c5-4ac6-b2a0-046a268841cc` / urlId `1BwvkpgWHvdARyYdD0zyZS` |
| Snowflake connection | `9e79f38b-a310-405c-aad9-72f762ac6ff1` |

These are reference only. A teammate's build creates new objects in *their* folders. Viewing Josh's objects requires him to share them.

## App

- **Look:** dark charcoal with cyan accents, an icon rail, and a top bar with search, AI Chat and avatar.
- **Pages:** Home ("Search for events across 6 connected repositories"), Armory, Detection detail (page-aware drawer), Entity 360, Data Feeds, SOC Command Center (full embed), My Workbooks, and the + menu.
- **Starters:**
  - Workbooks: Blank, Alert explorer, Detection review, Data cost analysis.
  - Reports: Blank, Weekly SOC report.

## Measured (2026-10-17)

| Measurement | Result |
|---|---|
| Hero answer | about 30 s, with a live visual |
| Detection drawer | about 35 s |
| Entity assist | about 32 s |
| Routing question | about 14 s |
| "Worst FP rate" prompt | about 55 s (Q&A only) |
| Command Center tiles | 6–14 s after materializing |
| Elements compiling | 112/112 Command Center, 21/21 Chart Library |
| Explore specs | 15/15 |
| Starters | 6/6 dry runs |
| Weekly SOC report PDF | one page |
