# Sample-only water-use explorer implementation plan

**Goal:** Implement the sample-only explorer approved in conversation on October 9, 2026.
**Architecture:** Independent `sample_app.py` UI and pure `sample_data.py` parser/grouping module. A bundled compressed summer CSV allows offline operation; no runtime data download or private upload.
**Tech stack:** Python standard library, Streamlit 1.63.0, pandas 3.0.5, Altair 6.2.2, pytest 9.1.1 (verified installed versions).
**Spec:** `RESEARCH_REPORT.md`, sections 2, 3 and 7. Execute inline; no delegation or commits requested.

## Constraints

- Do not modify `app.py`, `notice_app.py`, their supporting code or requirements.
- Measured site032 summer data only; CC BY 4.0 attribution and transformations documented.
- Unknown source clock; no timezone conversions, local-night inference or exact interval ownership claims.
- No upload, ML, diagnosis, risk score, alert, savings claim or deployment.
- Preserve measured zeros, gaps and partial edges; use Decimal gallons.
- Student contributions and AI assistance must be disclosed for CAC.

## UI direction

Use native accessible Streamlit controls, with a restrained water-study palette: white `#FFFFFF`, ink `#173042`, blue `#176B87`, muted blue `#5F7D8A`, amber `#99620A`. Native font for controls and body; left-aligned headings. Make the recorded-usage chart—not a hero statistic—the primary visual. No animation, gradient panels, dispatch badges or marketing copy. Keep limitations above the chart and an accessible data table beside the chart's interpretation below it.

Layout: title → persistent sample/clock notice → source range → day selector → bar chart → compact totals → coverage and data table → attribution and provider links. Bar positions use ordinal source-clock strings so the browser cannot silently convert naive timestamps.

## Task 1: Validated offline data

Files: `sample_data.py`, `data/site032_summer.csv.gz`, `data/README.md`, `tests/test_sample_data.py`.

- [x] Write tests for a missing parser module, exact Decimal conversion, measured zeros, duplicate/invalid/non-increasing rows, and explicit absent-hour buckets.
- [x] Run `venv/bin/python -m pytest tests/test_sample_data.py -q` and confirm missing-feature failure.
- [x] Implement `parse_readings(text)`, `group_hours(readings)` and `load_sample()`. Records carry naive timestamp and integer pulses; groups carry count, expected count, gallons or None, and partial-edge status.
- [x] Download the source in memory, verify research SHA-256, select the half-open summer log window, and write deterministic gzip containing original selected rows. Document source hashes, fixture hash and attribution.
- [x] Verify 345,491 observations, 1,668,299 pulses, 14,512.533001 gallons, 385 groups, 383 complete-count groups and two partial edges offline.

## Task 2: Separate interface

Files: `sample_app.py`, `tests/test_sample_app.py`, `requirements-sample.txt`, `requirements-sample-dev.txt`.

- [x] Write Streamlit AppTest tests for persistent caveats, totals, day-filter updates, attribution, no uploader and readable fixture-failure state.
- [x] Run `venv/bin/python -m pytest tests/test_sample_app.py -q` to observe failure before UI implementation.
- [x] Implement the layout above; public sample only may be cached. Fail closed when the bundled fixture is missing, corrupt or invalid. Chart gaps remain absent bars, never filled zeros.
- [x] Run sample tests and all existing tests. Launch on a separate localhost port; inspect desktop/mobile and day selection in the browser.

## Task 3: Accurate handoff

Files: `README.md`, `PRD.md`, `RESEARCH_REPORT.md`.

- [x] Add independent run/test instructions, implemented scope, clock caveats and AI contribution disclosure. Preserve notice-finder instructions and submission path.
- [x] Check final changes against original application hashes; report tests and remaining limitations. No public deployment or competition submission.

## Execution results

All 96 tests passed (21 new sample tests; 75 existing tests). Eight original application/support/requirements files match pre-build SHA-256 hashes. UI uses explicit unstacked bars and a single-column legend after mobile review. AppTest's timeout allows cold dependency imports; runtime and rendering checks used the existing environment. Separate localhost app: port 8502. Fresh environment installation and public deployment were not tested or performed.
