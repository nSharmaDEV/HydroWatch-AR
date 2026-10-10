# HydroWatch AR — NWA City-Level Direction

**Status:** Research and proposed experience only. No city dashboard implemented or approved by this document. The recorded Utah explorer, Arkansas notice finder and legacy prototype remain intact.

## Recommendation

Pivot the main product story to **understanding water supplied to Northwest Arkansas's four major customer-city systems**. Beaver Water District (BWD) is an authoritative local source for Fayetteville, Springdale, Rogers and Bentonville. This is a more direct geographic fit than a Utah household example.

The smallest supported concept is a **published wholesale-demand comparison**, not a live household monitor, leak detector, efficiency leaderboard, shortage forecast or water-safety service. Its intended audience is residents and students learning how the region's water supply works; usefulness still needs real viewer feedback.

Research reviewed the public pages below in the October 9, 2026 work session. No utility was contacted, private account accessed, permission obtained or new deployment made.

## What the primary sources actually establish

| Question | Verified finding | Product consequence |
|---|---|---|
| Access | BWD's production page is publicly readable without an account. Its table is in the HTML. | A small manually verified snapshot is feasible; no credentials or household uploads needed. |
| Geography | Four wholesale customer cities; their utilities also supply surrounding communities and other systems. BWD is not every supplier in NWA. | Label rows **customer-city water systems**, not city-boundary household consumption or all NWA demand. |
| Measurement | BWD explicitly defines demand as **water sold**, in million gallons per day (MGD). | Compare average and maximum daily wholesale demand. Do not call it household use, delivered residential consumption, water loss or waste. |
| Time interval | One table headed **September Production Data** contains monthly summary statistics, not daily observations. | No hourly chart, within-month time series or live monitoring. |
| Reporting year | The table heading does not state a year. Page metadata says modified October 2, 2026; introductory text gives a rate effective October 1, 2026. | These suggest recency but do not independently establish the table's year. Confirm before labeling it September 2026. |
| Monthly-volume unit | A column says **Total Monthly Sold**. The footnote explicitly defines demand rates, but does not separately state this total's unit. | It appears consistent with million gallons, but exclude this metric from the initial chart until confirmed. Never label it MGD. |
| Regional maximum | BWD says the district maximum is not the sum of city maxima because they need not occur on the same day. | Use the published district maximum; never sum city maxima. |
| History | No downloadable observed monthly series was verified in the production page, service-area page, fact sheets, board page or searches of BWD publications. | No trend feature yet. This does not establish that BWD lacks historical data. |
| API | The page links a public WordPress endpoint. It returns page metadata, empty rendered content and empty ACF data; the revision endpoint returns HTTP 401. | This is not a verified production-data API or accessible historical dataset. Do not attempt authenticated revisions. |
| Reuse | Reviewed pages say **All Rights Reserved**; no explicit open-data license was identified. The master-plan PDF also bears a copyright notice. | Public access is not an open license. Clarify redistribution terms for a bundled table and public app; do not assume either blanket prohibition or CC licensing. Use original chart design, not copied branding/images. |
| Labels | No household readings, leak ground truth or efficiency labels in the reviewed production table. | No ML/leak claims, red risk labels, city waste rankings or inferred household behavior. |

### Published snapshot — transcription for research, not an approved app fixture

Source heading: **September Production Data — year unconfirmed**.

| Customer-city system | Average daily demand (MGD) | Maximum daily demand (MGD) | Total Monthly Sold (unit unconfirmed) | Historic Daily Peak (MGD) |
|---|---:|---:|---:|---:|
| Fayetteville | 30.646 | 35.402 | 919.386 | 36.463 |
| Springdale | 26.740 | 31.200 | 802.190 | 31.200 |
| Rogers | 15.687 | 19.326 | 470.611 | 19.710 |
| Bentonville | 20.787 | 23.197 | 623.608 | 27.484 |
| BWD TOTAL | 93.860 | 107.310 | 2815.795 | 107.310 |

Arithmetic cross-check: the four published averages sum to 93.860; monthly totals sum to 2815.795. City maxima sum to 109.125, **not** the published district maximum 107.310. Matching sums do not resolve the reporting year or ambiguous monthly-volume unit. Historic peaks have no dates/reference-window definition in this table, so omit historic-record analysis from the MVP.

### Historical material is not necessarily observed history

BWD's **September 2023 Water Master Plan**, executive summary pages ES-2 through ES-4, discusses operational history and presents historical/projection figures. Table 1-1 is explicitly titled **Maximum Day Demand Projected Values**, with years 2022, 2025, 2030, 2035, 2040 and 2045. Do not turn its 2025 row into measured 2025 water sales or mix it with published monthly observations. The accessible September 17, 2026 board agenda contains no production figures.

BWD's supply-history timeline is useful educational context, not a demand time series. Its future expansion timeline differs from the 2023 plan's schedule; do not resolve that into an app-authored shortage deadline. Rated intake/treatment capacities are not sufficient evidence for a current shortage or operational headroom gauge.

## What the site would look like

**Working name:** HydroWatch AR — Northwest Arkansas Water Demand.

**Main question:** “How does published wholesale water demand compare across our four major water systems?”

Use the existing compact layout approach, with one primary horizontal bar chart rather than four competing metric cards, a map or an operations command center. Use readable city names and units on the axis. A single blue comparison color and a selected-row accent indicate selection, not risk. Keep source/date information beside the chart rather than buried behind warnings.

```text
HydroWatch AR · Northwest Arkansas Water Demand
Compare water sold by Beaver Water District to four customer-city systems.
Report: [confirmed month/year]     Source checked: [retrieval date]

[Compare systems] [About your water system] [Sources & limits]

Average daily wholesale demand · million gallons per day
Fayetteville  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  30.646
Springdale    ━━━━━━━━━━━━━━━━━━━━━━━━━━      26.740
Bentonville   ━━━━━━━━━━━━━━━━━━━━            20.787
Rogers        ━━━━━━━━━━━━━━━                 15.687

Selected system: [Fayetteville ▼]
Average daily: 30.646 MGD       Maximum daily: 35.402 MGD
Larger demand does not mean more waste. Service areas differ.
View BWD report · View official utility help
```

The numbers above illustrate the reviewed snapshot only; the wireframe is not a screenshot or an implemented page. A release must resolve the report year first. Do not add a month selector that implies nonexistent history.

### Proposed smallest MVP

1. **Compare systems:** one confirmed reporting period, four bars for average daily demand, exact-value tooltips, selectable system details with average/maximum demand, source/retrieval dates and published district average if useful. No monthly-volume display until its unit is confirmed.
2. **About your water system:** explain Beaver Lake → BWD treatment → customer-city utility → customers. Use BWD's service-area descriptions and official utility links. Warn that a city's utility may serve addresses outside that city; choose the provider on the bill. Avoid a municipal-boundary choropleth because the data is not city-boundary consumption.
3. **Sources & limits:** definitions, report provenance, verified reuse terms, snapshot-not-live status, no household/safety/leak inference. Link the existing notice finder separately, without converting demand into boil-water status.

The added value over BWD's original table should be clear units, accessible visual comparison, explained service areas and useful local links—not merely a re-skinned table. Validate this with one NWA viewer before claiming educational impact.

### Conditional later features

- **Observed monthly trends:** only after obtaining dated, comparable historical reports with consistent units and correction handling. Preserve missing months; do not invent an hourly curve or smooth gaps into evidence.
- **Demand share:** a clearly labeled share of BWD sales for the same period, not share of all NWA use or residential use.
- **Per-person comparison:** defer. Municipal census populations do not match these utility service territories, and wholesale sales include different customer types and potential distribution losses. No defensible normalization was established here.
- **Lake/river context:** USGS measurements could become a separately sourced context panel, not a substitute for potable-water demand, household readings or safety tests. Out of scope for this MVP.

## Gates before a city-data build

Ask BWD through its [general inquiries page](https://www.bwdh2o.org/contact/general-inquiries/) or public phone **479-756-3651**. Suggested questions, **not sent**:

> We are researching a student educational dashboard comparing your four wholesale customer-city systems, not household use or water safety. Could you confirm (1) the year of the current September production table, (2) the unit of Total Monthly Sold and the definition of each daily metric, (3) whether dated historical monthly tables or CSV exports are available, (4) whether we may redistribute selected factual table values in a public educational app/repository with attribution, and any required terms, and (5) the usual publication/correction schedule and scope of the Historic Daily Peak column?

For a single-period MVP, confirmation of the period, daily metric definitions and appropriate reuse terms is the relevant release gate; historical data is required only for trends. If monthly units remain unresolved, omit that column rather than delay an otherwise supported daily-demand comparison. If a year cannot be verified, retain this as research rather than fabricate a dated dashboard. Implementation still needs explicit approval and a scoped PRD update.

After approval, prefer a small provenance-backed frozen data file and separate city entry point. Validate nonnegative numeric values, known system names, explicit period/units, unique system-period rows and rounded average-total reconciliation. Do not assert city-maxima reconciliation. Show an honest unavailable-data state rather than synthetic replacements. Preserve the sample explorer as a checkpoint/reference instead of overwriting the protected legacy app or notice finder.

## Authoritative references

- [BWD Water Production Reports](https://www.bwdh2o.org/water-data/water-production-reports/): current table, definitions, maximum caveat, copyright footer.
- [BWD Service Area](https://www.bwdh2o.org/about/service-area/): downstream service areas and other Beaver Lake suppliers.
- [BWD production-page metadata](https://www.bwdh2o.org/wp-json/wp/v2/pages/1579): October 2, 2026 modification timestamp, not a report-year declaration or data API.
- [2023 Water Master Plan — Executive Summary](https://www.bwdh2o.org/wp-content/uploads/2023/10/Master-Plan-Executive-Summary.pdf): ES-2–ES-4 history/projection distinction; copyright notice. PDF read via text extraction.
- [BWD Board of Directors & Staff](https://www.bwdh2o.org/about/board-of-directors-staff/) and [September 2026 agenda](https://www.bwdh2o.org/wp-content/uploads/2026/09/Sept-26-Agenda.pdf): reviewed public meeting material, not a verified production archive.
- [BWD Supply History](https://www.bwdh2o.org/about/nwa-water-supply-history/) and [Fact Sheets](https://www.bwdh2o.org/water-data/fact-sheets/): context, not measured monthly-demand datasets.
- [BWD General Inquiries](https://www.bwdh2o.org/contact/general-inquiries/): verification route, not an established partnership.

This proposed direction does not resolve the separate student-authorship, AI-disclosure or eligibility gates in [CAC_PREPARATION.md](CAC_PREPARATION.md).
