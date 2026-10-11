# HydroWatch AR

**Next product (approved):** Watershed Fieldbook, a whole-app pivot for park/ranger
staff and water-quality researchers at Buffalo National River and Beaver Lake.
See [the PRD](PRD-FIELDBOOK.md) and [pivot plan](docs/FIELDWORK_PIVOT_PLAN.md).
The [full journey/state contract](docs/FIELDWORK_JOURNEY.md) and
[desktop/mobile wireframe atlas](docs/wireframes/fieldbook-wireframes.html)
document the planned capture, review, comparison, export and recovery paths.
Approved stack (October 11, 2026): **React + TypeScript + Vite UI, localhost
FastAPI service, SQLite durable records**. Run it with the commands below; it
remains a bounded, unvalidated staff-oriented prototype.

## Run Watershed Fieldbook (prototype)

Two local processes, no accounts, no internet required for record entry.

```bash
# 1) Python service — domain logic + SQLite, port 8765
./venv/bin/python -m pip install -r requirements-fieldbook-dev.txt
./venv/bin/python -m uvicorn fieldbook.api:app --port 8765

# 2) React UI — Vite dev server, port 5173 (proxies /api to 8765)
cd fieldbook-ui
npm install
npm run dev
```

Open <http://localhost:5173>. Durable SQLite records live in
`fieldbook-data/working/fieldbook.sqlite3` and `fieldbook-data/demo/fieldbook.sqlite3`
(physically separate; the demo class is clearly labeled SAMPLE and never promotes
to working). Observation-only visits need a site, observation time/timezone and
nonblank notes — never measurements, samples or internet. Save confirmation is
only shown after durable storage succeeds.

The primary `app.py` is a **single-file Northwest Arkansas Regional Water Explorer**. The previous `app.py` was preserved byte-for-byte as `legacy_app.py`; the six-tab `city_app.py`, household sample and notice finder remain available.

## Run BloomWatch (working name)

The resident interface uses a public-service-inspired navy-and-white layout,
page-specific headings, distinct official/resident/AI labels, and stacked mobile
forms. It is an **independent student project**, not a government website or an
official USWDS implementation. Styling lives in `bloom_style.css`; source and
reporting limits remain unchanged.

`bloom_app.py` is the separate resident prototype: two scoped HAB status cards,
official map/details and ADH system search, session-only observations, optional
explainable photo assist, downloadable report cards, an ADEQ form handoff,
saved-water-body checks, Spanish controls and clearly labelled sample mode.
It does not replace any existing app.

```bash
python3 -m venv .venv-bloom
.venv-bloom/bin/python -m pip install -r requirements-bloom-dev.txt
.venv-bloom/bin/python -m streamlit run bloom_app.py --server.address 127.0.0.1 --server.port 8507 --theme.base light --browser.gatherUsageStats false
```

Fresh dedicated installation verified on macOS/Python 3.14.7: **84 data/resident/UI
tests passed**. After the design pass, the full existing-environment suite is
**321 passed** (October 11, 2026), including design and resident-journey regression tests.
For runtime only install `requirements-bloom.txt`.

### Resident journey

1. Check a water body's scoped status and source time. Use **Record an observation
   here** to carry that water body into the report form, even if the feed is unavailable.
2. Describe what you observed from a distance and enter coordinates you checked.
   Optional photo analysis explains color features; it cannot confirm toxins or safety.
3. Save the observation in this session and download its report card. **View my report
   on the map** opens that water body's view with the unverified resident pin.
4. Open the ADEQ form and use the card as a reference. Complete the agency form
   yourself: a saved report is **not** an agency submission.

For a rehearsal use the explicitly labelled sample-data mode. Do not invent a
live report or submit a demonstration complaint to the agency.

Official squares mark **nearest-city Census reference points**, not actual bloom
locations or boundaries; resident circles use unverified manual coordinates.
The bundled Arkansas outline works without street tiles; external CARTO/OSM tiles
are opt-in. Accessible text details remain available. No shared crowd feed exists.
Reports and watches last only for the current session; download report cards before
closing. Watches compare records on interaction, not background/email/push alerts.
The ADEQ button opens a form: **nothing is automatically submitted or prefilled**.

Photo assist runs in the Python process: **on-device only when run on localhost**.
A hosted Streamlit app uploads photos to its server. No external AI API is used,
and report metadata contains no photo. The rule-based assist is not a trained,
held-out-evaluated toxicity detector. It abstains and never labels water safe.
See [demo instructions](docs/DEMO_FILMING.md) and
[release checklist](docs/BLOOMWATCH_RELEASE.md) for outstanding human decisions.

### Official data layer

`bloom_data.py` reuses the unchanged `notices.py` / `notice_source.py` for ADH
and parses ADEQ's four-column HAB table. **The live ADEQ page is a JavaScript
shell, not an empty advisory feed**: `default.js` loads the official
[advisories.json](https://adeq.state.ar.us/water/planning/hab/advisories.json).
The client validates that feed and resolves escaped table rows without executing
JavaScript. Synthetic and recorded HTML fixtures are tests only, never fallbacks.

```bash
./venv/bin/python -m pip install -r requirements-bloom.txt
./venv/bin/python -m pytest tests/test_bloom_data.py -q
```

These data-only commands use the existing environment (pytest already installed).
For integration, retain one `BloomSource()` instance across reruns and call
`.get(force=False)` to receive separate ADH and ADEQ `BloomResult` values.
Each has `snapshot`, `error`, `attempted_at`, and `next_attempt_at`;
`source_status(result, now)` returns exactly **Active advisory**, **No active
advisory found**, or **Data unavailable**. This is an agency-feed status, **not
a lake-specific determination**. Source caches last 300 seconds, refresh cooldown
is 60 seconds, and snapshots older than 900 seconds are unavailable. Failed
refreshes retain last-good records only for explicitly outdated detail.

Canonical `Notice` fields are `source`, `water_body`, `notice_type`, `area`,
`issued_date` (agency calendar date), `effective_window` (source-supported text),
`source_url`, `retrieved_at`, and `fingerprint` (SHA-256 of normalized source
fields, excluding retrieval time). ADH `water_body=None`: system names and counties
do not establish lake coverage. ADH issue/lift time text is retained without
inventing a timezone. ADEQ dates use the observed `September 22, 2026` format;
historical `lifted="N/A"` rows are excluded just as the agency's JavaScript does.

Live verification **2026-10-11 05:01 UTC**: 32 normalized ADH records (10 without
a published lifted date) and 7 current ADEQ advisories. Real examples were
BANKS WATERWORKS and Mom's Lake; neither establishes coverage for the two target
waters. **Absence of a notice is not proof of safety.** [NEEDS: verified ADH
service-area mapping; agency reuse terms before public distribution.] Distinct
official/resident rendering is now tested in the app. No ADH-to-lake mapping is
invented; ADH search is separate. `notice_app.py` remains the fallback.

## Run the separate Springdale bill-check prototype

```bash
venv/bin/python -m pytest tests/test_springdale_bills.py tests/test_bill_app.py -q
venv/bin/python -m streamlit run bill_app.py --server.port 8506 --server.address 127.0.0.1 --theme.base light --browser.gatherUsageStats false
```

These commands use the existing project environment. For a fresh environment, install `requirements-regional-dev.txt` using the setup below. The prototype needs Streamlit; its reference engine uses Python's standard library. A fresh bill-only installation is not verified.

`bill_app.py` compares manually entered bill dates, service days, gallons, water/sewer charges, the Safe Drinking Water Act fee, other charges/balances/credits and total amount due. Six synthetic examples are optional; personal entries start blank. It explains line-item changes, compares gallons/day and conditionally checks frozen standard **inside-city, non-discounted** Springdale rules for bills dated **October 2025–September 2027**, at up to **25,000 gallons per service**. Partial thousand-gallon blocks and minimum charges are respected. Account class must be explicitly confirmed; outside-city/senior/special accounts, unsupported dates/volumes and unknown sewer quantities are not guessed. Sewer-basis differences, tariff residuals and missing line items remain visible unknowns, not overcharge or leak diagnoses. Rate-versus-quantity attribution uses a disclosed rate-first allocation.

The resident can preview/download a cited text summary. No uploads, account connections, automatic contact or utility submissions are implemented. Entries remain in the running Streamlit session and are not written to bill files; this is not an audited privacy guarantee. Rates/fee were reviewed October 10, 2026, not fetched live. Sources and limitations are visible in the app and in [the benchmark](docs/SPRINGDALE_BILL_BENCHMARK.md). `springdale_bills.py` keeps the reference calculations separate; the primary `app.py` is unchanged by this prototype.

## Run the compact regional explorer (primary app)

```bash
python3 -m venv .venv-regional
.venv-regional/bin/python -m pip install -r requirements-regional-dev.txt
.venv-regional/bin/python -m pytest tests/test_regional_app.py -q
.venv-regional/bin/python -m streamlit run app.py --server.port 8504 --theme.base light
```

For runtime only, use `requirements-regional.txt`. `app.py` contains all verified observations and model/UI code: it needs no other project modules or fixture files at runtime. Its five tabs are **Compare Systems**, **Trends**, **Map**, **ML Lab**, and **Sources & Limits**. System selection changes monthly metrics, annual observations and retrospective model results; Fayetteville's values are not reused for other systems. Trends include a fiscal-year-range input. The lab automatically shows the two past held-out years, not a future forecast.

The primary app uses Plotly charts at 240/230px, a 1050px maximum content width, compact native metrics and collapsed detail expanders. The map defaults to an explicit CARTO/OpenStreetMap street basemap via Streamlit's native pydeck renderer; uncheck its option for `st.map()` coordinate view. City points are not utility facilities or boundaries. Tiles require external network access; no private utility account, SCADA feed or personal location is accessed.

The snapshot's reporting year remains unconfirmed. Separate FY2022–FY2025 observations and source URLs/hashes are documented below and in the app. Sales changes alone do not establish regional growth, waste or efficiency. Source reuse terms remain unverified; attribution does not establish redistribution permission. This is an independent educational project, not a BWD service.

The existing-environment tests and exact 1280×800 browser checks are recorded in [docs/superpowers/plans/2026-10-09-regional-consolidation.md](docs/superpowers/plans/2026-10-09-regional-consolidation.md). Default collapsed views are designed for that viewport at 100% zoom; opening detail expanders, smaller viewports, accessibility font scaling or different browser settings may require normal scrolling. Content is not concealed with overflow-hiding CSS. No claim of universal bug-free behavior or real-viewer comprehension is made. Fresh standalone installation and public deployment are not verified.

## Run the operator preview (separate app)

```bash
python3 -m venv .venv-command
.venv-command/bin/python -m pip install -r requirements-command-dev.txt
.venv-command/bin/python -m pytest tests/test_command_incidents.py tests/test_command_orders.py tests/test_command_hydrology.py tests/test_command_app.py -q
.venv-command/bin/python -m streamlit run command_app.py --server.port 8505 --theme.base light
```

For runtime only, install `requirements-command.txt`. This preview does not replace `app.py`. Its two tabs are **Leaks & work orders** and **River conditions**:

- Review a deterministic **simulated** Centerton incident, inspect observed-versus-baseline evidence, and create **Demo #WO-8921**, a local draft with PDF/CSV downloads. The scripted rule and experimental ML score are labeled separately. Sample coordinates are not a repair location, and projected daily cost assumes the peak increase continues for 24 hours. No crew is notified and nothing is dispatched. Drafts and notes live only in the current Streamlit session; download them before the session ends.
- Choose **Load USGS readings** for real public Arkansas streamflow, separate from the municipal exercise. Initial retrieval requests up to 15 stations, not the entire discovered directory; partial coverage and missing readings are explicit. Choose another station and load it when outside current coverage. Observation time and the last successful app-check time are distinct, displayed in America/Chicago. Map colors describe reading age, not flood/drought risk. Historical daily means are fetched only on request for the selected station; percentage of the retrieved-period median is **not a percentile**.

USGS retrieval and OpenStreetMap tiles require internet access. Draft processing/downloads are local. Successful reading snapshots are reused for five minutes on interaction, station discovery is cached for 24 hours, and USGS attempts have a 60-second cooldown **per session**, not a global rate limit. Failed refreshes retain the last-good reading snapshot without advancing its successful check time; a first failure shows guidance and official links, not synthetic data. HTTP timeouts are five seconds to connect and 15 seconds per read/write/pool phase, with no automatic retries; these are not an overall request deadline.

The preview is verified in the existing Python 3.14 environment; a fresh isolated install and public deployment have not been verified. Desktop, tablet, mobile and keyboard checks use normal vertical scrolling rather than clipping content. Implementation and verification notes are in [the operator experience plan](docs/superpowers/plans/2026-10-09-operator-experience.md). Promotion to the primary app and a first-time human usability review remain separate steps.

The preserved notice finder helps Arkansas residents search **published boil-water notices** by water-system name, county and source-supported status, inspect the affected area, and open the official source. This is an independent student project, not an Arkansas Department of Health (ADH) service or water-safety certification.

## Run the NWA demand explorer

```bash
python3 -m venv .venv-city
.venv-city/bin/python -m pip install -r requirements-city-dev.txt
.venv-city/bin/python -m pytest tests/test_city_data.py tests/test_city_history.py tests/test_city_app.py -q
.venv-city/bin/python -m streamlit run city_app.py --server.port 8503 --theme.base light
```

For runtime only, install `requirements-city.txt`. Select one of four BWD customer-city systems, then use **Compare systems**, **Trends**, **Map**, **ML lab**, **About your water system**, and **Sources & limits**. **MGD = million gallons per day.** These are wholesale water sales, not household consumption or municipal-boundary usage. Larger demand is not evidence of waste. The district maximum is taken directly from BWD, never summed from city maxima.

The comparison's public [BWD production report](https://www.bwdh2o.org/water-data/water-production-reports/) was retrieved on **2026-10-10 at 01:23 UTC**. Its heading is **September Production Data**, with **reporting year unconfirmed**. Retrieval time is not the reporting period. [data/BWD_README.md](data/BWD_README.md) documents this separate snapshot; no inferred year, monthly total or live monitoring is supplied.

**Trends** uses verified annual wholesale-sales observations for **FY2022–FY2025**, from BWD financial-report Note 7 tables published by Arkansas Legislative Audit. Choose a fiscal-year range and annual billion gallons or derived daily average MGD. Fiscal years end September 30; leap-year day counts are respected. No monthly curve is invented. **Map** shows four Census city internal points, not utility service boundaries or facilities; pan/zoom/hover or change the system dropdown. Equal marker size and blue selection do not indicate risk. Data fixtures are bundled locally, but the basemap requests external CARTO/OpenStreetMap tiles. Coordinate text remains available if the map cannot render.

**ML lab** runs an experimental linear-regression versus last-year-sales baseline when requested. Both use only earlier years to predict the same two held-out past years; training years, actual/predicted volumes and retrospective mean absolute errors are shown. **No future forecast is produced:** four observations and two held-out years cannot establish forecast reliability. This is not a leak detector, accuracy claim or shortage prediction. Trend display filters do not change this full-history experiment. [data/BWD_HISTORY_README.md](data/BWD_HISTORY_README.md) records source pages, extraction, Census provenance and model limitations. No explicit open-data license was verified for the BWD sources; clarify reuse before public deployment. No BWD endorsement, household uploads, account connections, efficiency rankings or water-safety conclusions are claimed.

Verification during the October 9 Arkansas work session: **42 city tests plus all 100 previous tests passed** in the existing Python 3.14.7 `venv` environment. City tests cover extraction, units, metadata, totals, source failures, all four selections, annual filters, geographic references and leakage-free historical model folds. Browser checks of the expansion include desktop annual trends, map and model controls; prior comparison checks included 390×844. Content/tab navigation may require scrolling; these checks do not establish first-time-user comprehension. A fresh city-only environment has not been verified. Local preview is not public deployment, student-authorship compliance or evidence of educational impact. This implementation used substantial AI coding assistance; [CAC_PREPARATION.md](CAC_PREPARATION.md) still requires the entrant's real eligibility/contribution evidence and is a household-sample demo outline, not a completed city-app submission.

## Run the notice finder (preserved)

Verified on macOS with **Python 3.14.7**, Streamlit 1.63.0 and httpx 0.28.1, including installation in a separate fresh virtual environment. Other Python versions/platforms have not been verified.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-notices-dev.txt
.venv/bin/python -m pytest tests/test_notices.py tests/test_notice_source.py tests/test_notice_app.py -q
.venv/bin/python -m streamlit run notice_app.py
```

For runtime only, install `requirements-notices.txt` instead of the dev requirements. The dev file adds pytest. Internet access is required to retrieve current source records, but the notice tests run offline.

For a light presentation without changing the legacy dashboard's settings:

```bash
.venv/bin/python -m streamlit run notice_app.py --theme.base light
```

Streamlit also offers Light/Dark/System choices in its menu. The search-first interface uses native labeled controls with scoped typography and spacing; no animation or external frontend framework is needed.

## Use it

1. Enter the water-system name from your water bill and press Enter (literal, case-insensitive substring). A blank search starts with guidance, not a statewide record dump.
2. Expand **Optional filters** to narrow by county or notice status. Counties are those listed on the notice, not inferred service boundaries. A filter alone can show results.
3. Or choose **Browse published notices** to see all retrieved records, five per page. **Previous**/**Next** reach the full list; filter changes return to the first page. **Reset search** returns to the start screen.
4. Choose **Read notice** to read the full affected area, reason, issue date and any explicit lifted date. **Back to results** retains filters and page. Navigation brings the heading into view and focuses it using a small, trusted static script; source/user text is never inserted into that script.
5. Confirm your address, current status and instructions with your provider. The opening screen's **Find your water provider** opens the official directory; the source footer links to the official ADH notice list.
6. **Refresh notices** requests a new check, subject to the cooldown below. Last successful check time stays visible; expand **About the source and these statuses** for cache, timestamp and status explanations.

Multiple incidents for the same system remain separate. Identical incident rows across counties merge into one notice with all associated counties. Blank lifted dates are labeled **Not marked lifted**, with an explanation that no lifted date appears in the checked ADH list. An explicit lifted date produces **Marked lifted**. These are source-supported labels, not independently verified active status or water-safety certification. Old or disappeared records are never automatically classified as lifted.

## Source and reliability policy

- [Official ADH boil-water notice list](https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx): the app parses the observed server-rendered `GridView1` table. This is HTML, not a documented API. Publishing cadence, retention period and availability guarantees are unverified.
- [Official provider directory](https://health.arkansas.gov/Eng/WSlist.aspx) and [drinking-water information](https://healthy.arkansas.gov/programs-services/public-health-safety/drinking-water-safety/) are links only. The app does not extract a complete provider directory, detailed instructions or address eligibility.
- Source wording is preserved except HTML entity decoding and whitespace normalization, and rendered as plain text. Source date text is retained; its timezone is not specified. Successful app-check timestamps are shown explicitly in America/Chicago and do **not** mean ADH updated the records then.
- Successful checks are reused for **five minutes**. Every network attempt, including manual refreshes and failures, has a **60-second minimum interval**, shared across users of one app process. Checks occur on interaction; there is no background scheduler.
- Failed checks retain the last-good snapshot, label it potentially outdated, and never produce a false successful “no notices” state. Information older than **15 minutes** is also labeled potentially outdated. This is an app policy, not an ADH freshness guarantee.
- The cache is **process-local and nonpersistent**. Restarting the app loses last-good data. A first failure displays an error and official links, not empty-success results.
- Retrieval uses HTTPS, no redirects or automatic retries, a 2 MiB decoded-body limit, a 5-second connection timeout and 15-second read/write/pool timeouts. These are per-phase limits, not an overall request deadline.
- Changed headers, malformed or conflicting rows, missing tables and unsupported empty tables fail closed. A valid empty-source representation has not been verified. No partial rows are silently dropped.

No-match results mean only that no published notices match the filters in the checked source. They do **not** establish water safety. This is not an exhaustive historical archive, every-provider search, leak detector, dispatch system or medical-instruction service. No accounts, address entry or personal-data storage are needed.

## Code and tests

| File | Responsibility |
| --- | --- |
| `notices.py` | Immutable notice records, strict HTML parser, duplicate-county merging and pure filters |
| `notice_source.py` | Bounded HTTP retrieval, serialized cache, cooldown and failure policy |
| `notice_app.py` | Search-first start/results, pagination, detail navigation, source links and safe error states |
| `tests/test_notices.py` | Parser, identities, malformed-source cases and filters |
| `tests/test_notice_source.py` | Offline transport/cache/clock/concurrency tests |
| `tests/test_notice_app.py` | Offline Streamlit AppTest journeys and rendering safety |

The source-derived fixture in `tests/fixtures/adh_notices_sample.html` records selected rows checked October 9, 2026. It is **test data**, not a live-data fallback.

Verification on October 9, 2026: **61 notice tests passed**, including in the fresh environment; **14 legacy tests passed separately** in the existing environment during the original finder implementation. The real source returned 35 merged notices at the smoke check (not a fixed expected count). Browser checks covered desktop/mobile, Light/Dark layouts, real search, pagination, detail/back navigation, status filtering and source wording. Automated tests cover start/reset, filter/page retention, outages, outdated snapshots, disappearing records and safe rendering without changing real ADH data. These checks are not a substitute for testing with actual residents.

## Separate recorded-usage explorer

`sample_app.py` is an independent, **sample-only** explorer approved after the research in [RESEARCH_REPORT.md](RESEARCH_REPORT.md). It does not replace the notice finder or legacy prototype.

```bash
python3 -m venv venv/sample
venv/sample/bin/python -m pip install -r requirements-sample-dev.txt
venv/sample/bin/python -m pytest tests/test_sample_data.py tests/test_sample_app.py -q
venv/sample/bin/python -m streamlit run sample_app.py --server.port 8502 --theme.base light
```

The bundled measured Utah household sample works offline; no utility account or runtime download is required. The compact layout uses a three-metric row and **Usage**, **Coverage**, and **Source & guidance** tabs. Select a recorded day in Usage to filter both the 260px chart and the 200px-high coverage table; scroll inside the table for additional rows. Whole-sample totals remain clearly separate from the selected day. Counts, gaps and partial boundaries are visible. Original source-clock strings are used on the chart so the browser cannot convert them to a guessed timezone. Charts and tables use Streamlit's current `width='stretch'` API for container sizing.

The purpose is explicitly educational for **Northwest Arkansas residents**, using Utah readings as practice rather than local evidence. Source & guidance includes a compact provider selector for Fayetteville, Rogers, Bentonville and Springdale, with official account/billing help and customer-service numbers checked against public pages on October 9, 2026. Choose the provider on your bill; city alone does not establish service eligibility. Provider selection does not change the sample or connect an account. Hourly exports and compatibility remain unverified. Official links open external sites and may require internet access; some Source & guidance content requires scrolling. Arkansas resident feedback and local-data validation have not been completed.

The sample's timezone and interval-start/end meaning are unverified. There are **no uploads, leak classifications, overnight rules, ML scores, live connections or savings claims**. Measured zeros are retained; missing readings are never zero-filled. A missing/corrupt fixture produces an error, not synthetic fallback data. [data/README.md](data/README.md) records CC BY 4.0 attribution, source/fixture hashes, conversion and subset transformations.

Implementation and tests were developed with AI coding assistance (OpenAI GPT-6.1 Sol through OpenCode). This does not establish CAC student-authorship compliance; disclose assistance and the student's actual significant technical contributions. No public deployment or submission was performed.

Verification on October 9, 2026: **25 sample tests and all 75 existing notice/legacy tests passed** in the existing `venv` environment after the Arkansas-purpose and utility-guide updates. Browser checks covered all three compact tabs at 1440×900 before the guide addition, and the updated purpose/provider guide at that size; this is not a guarantee for every display setting or browser zoom. Earlier checks covered desktop/mobile charts and day selection. Sample tests cover exact totals, malformed/duplicate/off-grid observations, measured zeros versus missing hours, partial boundaries, missing/corrupt fixtures, UI failure states, compact tab/chart behavior, the missing-versus-zero explanation, and all four provider selections without changing readings. These are software/data-integrity checks, not leak-detection evaluation. A fresh sample-only environment has not been verified.

## Legacy prototype (preserved)

The previous `app.py` is now `legacy_app.py`, preserved byte-for-byte during the regional refactor. `data_sources.py` and `report.py` remain unchanged. This earlier dashboard contains simulated municipal telemetry and real USGS hydrology; it is not the regional explorer or resident-facing notice finder. Its synthetic alert/dispatch and labeling limitations remain listed in `SUBMISSION_CHECKLIST.md`.

Use its original requirements in a **separate environment**:

```bash
python3 -m venv .venv-legacy
.venv-legacy/bin/python -m pip install -r requirements.txt
.venv-legacy/bin/python -m streamlit run legacy_app.py
```

The legacy clean-install procedure has not been verified in this implementation; its requirements do not explicitly list the direct `httpx` import or pytest. Do not assume the minimal notice requirements support the legacy app.

## Congressional App Challenge handoff

See `SUBMISSION_CHECKLIST.md` for eligibility, submission and video requirements. Suggested 1–3 minute demo: purpose/audience → search a real published notice → affected area and source-supported status → official link/check time → an explicitly lifted example → limitations. Any historical example must be labeled **Recorded example**, not live.

This notice-finder implementation, tests and documentation were developed with AI coding assistance (OpenAI GPT-6.1 Sol through OpenCode). The student must accurately disclose all AI use, libraries and tools, document their own significant technical contributions, and understand the submitted code. This repository does not establish student eligibility or contribution compliance. No deployment, public video or competition submission has been performed by this implementation.
