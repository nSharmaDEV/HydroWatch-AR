# HydroWatch AR — published water notice finder

A Streamlit app that helps Arkansas residents search **published boil-water notices** by water-system name, county and source-supported status, inspect the affected area, and open the official source. This is an independent student project, not an Arkansas Department of Health (ADH) service or water-safety certification.

## Run the notice finder

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

## Legacy prototype (unchanged)

`app.py`, `data_sources.py` and `report.py` remain unchanged by the notice-finder implementation. The earlier dashboard contains simulated municipal telemetry and real USGS hydrology; it is not the resident-facing notice finder. Its synthetic alert/dispatch and labeling limitations remain listed in `SUBMISSION_CHECKLIST.md`.

Use its original requirements in a **separate environment**:

```bash
python3 -m venv .venv-legacy
.venv-legacy/bin/python -m pip install -r requirements.txt
.venv-legacy/bin/python -m streamlit run app.py
```

The legacy clean-install procedure has not been verified in this implementation; its requirements do not explicitly list the direct `httpx` import or pytest. Do not assume the minimal notice requirements support the legacy app.

## Congressional App Challenge handoff

See `SUBMISSION_CHECKLIST.md` for eligibility, submission and video requirements. Suggested 1–3 minute demo: purpose/audience → search a real published notice → affected area and source-supported status → official link/check time → an explicitly lifted example → limitations. Any historical example must be labeled **Recorded example**, not live.

This notice-finder implementation, tests and documentation were developed with AI coding assistance (OpenAI GPT-6.1 Sol through OpenCode). The student must accurately disclose all AI use, libraries and tools, document their own significant technical contributions, and understand the submitted code. This repository does not establish student eligibility or contribution compliance. No deployment, public video or competition submission has been performed by this implementation.
