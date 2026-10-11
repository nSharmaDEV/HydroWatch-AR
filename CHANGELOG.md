# Changelog

All notable changes to HydroWatch AR are documented here. Format based on
[Keep a Changelog]; this project currently tracks pre-1.0 versions.

## [Unreleased]

### Added
- **Watershed Fieldbook (approved stack):** field-record pivot for park/ranger
  staff and water-quality researchers. React + TypeScript + Vite UI
  (`fieldbook-ui/`), localhost FastAPI service (`fieldbook/`), durable SQLite
  records with physically separate `working`/`demo` databases. See
  `PRD-FIELDBOOK.md` v0.3 and `docs/FIELDWORK_PIVOT_PLAN.md`. Prototype only;
  not staff-validated.
- Independent resident-facing notice finder in `notice_app.py`, preserving the legacy dashboard.
- Real ADH published-notice parsing, water-system/county/status filters, full affected-area details and authoritative source links.
- Conservative lifted-date labeling, multi-county incident merging, distinct same-system incidents, and retained filters on detail/back navigation.
- Five-minute process-local last-good cache, 60-second attempt cooldown, bounded HTTP retrieval and explicit failure/outdated states.
- 61 offline notice tests, dedicated notice runtime/dev requirements and reproducible startup documentation in `README.md`.

### Changed
- Search-first opening screen instead of an automatic statewide record dump; optional filters, provider-directory help and explicit browsing.
- Five-notice pagination, retained page/filter state on back navigation and reset-to-start controls.
- Plain-language `Not marked lifted` / `Marked lifted` labels with conservative explanations, affected-area-first results and explicit next steps.
- One source/check section, expandable technical details and scoped native typography/spacing for Light/Dark layouts.
- One-shot static heading focus/scroll on navigation; source and user strings remain plain text and never enter executable HTML.

The notice finder searches published records only; it does not certify water safety or determine address eligibility. No legacy anomaly, dispatch or USGS-labeling issues were changed.

## [v0.3.0] - 2026-09-14

Command-center rebuild: one screen for municipal leak triage, one for live
statewide hydrology, with every USGS number labeled by its source.

### Added
- **Tabbed command center** replacing the single-pane dashboard:
  - *Municipal Leak Triage (NWA)* — closed loop for the (simulated) leak:
    KPI cards → incident banner → triage map → 5-zone status table → all-zone
    flow curve → dispatch console → work-order card → PDF + CSV export.
  - *Regional Hydrology (USGS)* — live statewide view: Arkansas map colored
    by flow percentile, per-gage LIVE/STALE/OFFLINE status, 24-hour
    multi-gage discharge trend, and a data-provenance footer.
- **`data_sources.py`** — real USGS NWIS data layer:
  - Active Arkansas streamgage list (site service, 158 gages with
    coordinates + drainage area).
  - Instantaneous 24-hour discharge (`iv`) for the top 15 gages by
    drainage area (sidebar multiselectable).
  - Flow percentile vs the 10-year daily median (`dv`), fetched one gage
    at a time to work around multi-site truncation.
  - Per-gage provenance records (`site_no`, station name, retrieval
    timestamp, source API, NWIS link).
- **Provenance labeling** everywhere: gage captions, map popups, and a
  regional footer carry site numbers + retrieval times; simulated municipal
  telemetry is explicitly badged **SIMULATED** with generator settings.
- **CHANGELOG.md** (this file).

### Changed
- Zone 4 leak telemetry is now visibly labeled as simulated (seed 42,
  +257.2 GPM surge) — never presented as real telemetry.
- `gmtime`-based narration replaced with retrieval timestamps from the
  live USGS calls.

### Fixed
- **Only Zone 4 was surfaced.** All 5 zones now appear everywhere in the
  triage tab: flow chart renders all zones, the dispatch selectbox lists
  all zones (Zone 4 default), and the map fits bounds across all zone
  coordinates so Siloam Springs (Zone 5) is never clipped.
- **Live USGS API removed in the previous rewrite.** Restored statewide,
  replacing the single-station Osage Creek hero with a whole-Arkansas map.
- Zone-4 map pin inherited the Leaflet default white div-icon box; the
  pulse marker is now transparent.
- Dashboard-style data dump now tells a story: screens are organized by
  operator workflow (triage → dispatch → hydrology context).

## [v0.2.0] - 2026-09-13 (working tree)

Dark-theme dashboard rewrite focused on the Zone 4 municipal leak.

### Added
- Dark theme with metric cards, triage map, incident + warning banners.
- Work-order card with PDF dispatch report (`report.py`, reportlab) and
  data export.
- `tests/test_dashboard_layout.py`.
- Isolation-forest anomaly scoring on the simulated zone telemetry.

### Changed
- Replacement of the single-page report with a dispatch-oriented layout.

### Removed
- Live USGS single-station streamgage view (accidentally dropped during
  the rewrite).
- Other-zone visibility: flow chart, dispatch selectbox, and metrics were
  hardwired to Zone 4.

## [v0.1.0] - 2026-09-12

Initial prototype.

### Added
- Simulated municipal meter telemetry for Benton County zones.
- Live USGS NWIS streamflow for a single station — Osage Creek near
  Bentonville, Arkansas (site `07194880`).

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
