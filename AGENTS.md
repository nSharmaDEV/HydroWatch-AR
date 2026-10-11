# AGENTS.md — HydroWatch-AR / BloomWatch

Agent guide for working in this repository. Read this before editing code.

**New user direction (October 11, 2026):** the next product is a whole-app pivot
for park/ranger staff and water-quality researchers at Buffalo National River
and Beaver Lake—not a resident-app mode. Product requirements: `PRD-FIELDBOOK.md`
(v0.3); rationale and sequence: `docs/FIELDWORK_PIVOT_PLAN.md`.
PRD v0.2+: method AND specific instrument required for exact comparison; physically
separate working/demo SQLite files; discovery gates claims, not bounded P0 building.
Photos/metadata import are P1. Journey: `docs/FIELDWORK_JOURNEY.md` and
`docs/wireframes/fieldbook-wireframes.html` (static synthetic design, not shipped UI).

**Approved stack (user decision, Oct 11, 2026):** Watershed Fieldbook UI is
**React + TypeScript + Vite** (`fieldbook-ui/`); Python domain logic runs as a
small **localhost FastAPI service** (`fieldbook/`, port 8765, `/api/*`); durable
records are **SQLite** under `fieldbook-data/{working,demo}/fieldbook.sqlite3`
(physically isolated classes; gitignored). The Streamlit stack below describes
prior completed work and is preserved, not extended. No dispatch, regulatory
decisions, sensor control, shared cloud workspace, or unvalidated safety/AI
claims are authorized.

## What this repo is

`HydroWatch-AR` historically contains **six water apps** (docs state most code
was AI-generated). The active work is a **pivot**: a new resident
**water-safety / algal-bloom** app, working name **BloomWatch** (placeholder
name — do not treat it as final). See `PRD-BLOOMWATCH.md` for the product spec.
The older apps and `PRD.md` remain and must **not** be overwritten.

* Existing apps: `app.py`, `legacy_app.py`, `notice_app.py`, `sample_app.py`,
  `city_app.py`, `command_app.py`, `bill_app.py` + `springdale_bills.py`.
* BloomWatch modules: `bloom_model.py`, `bloom_data.py`, `bloom_resident.py`,
  and `bloom_app.py` (built and tested).

## Mission & constraints

* Entry for the **2026 Congressional App Challenge (CAC)**, **Arkansas's 3rd
  Congressional District** (Rep. Steve Womack).
* **Deadline: October 26, 2026, noon EDT / 11 a.m. CDT.**
* Built **solo**, school-age author. Stack is Python + Streamlit, local-first,
  no backend.
* Judging panel is **Startup Junkie**; rubric = **originality, creativity,
  design quality, solving a real problem, storytelling**. The **story and the
  working app win** — model horsepower is a garnish, not the foundation.

## The plan (locked)

Three layers, ranked by return. Build in order; ship at the end of Layer 3.

### Layer 1 — The app core (this IS the biggest claim). ~5–7 days

Live **ADH boil-water notices** + **ADEQ HAB advisories** → status cards, map,
detail, report loop, Sources & Limits screen.

* Reuse the tested notice engine: `notices.py`, `notice_source.py`
  (`NoticeSource` = fetch → cache 300s → cooldown 60s → staleness 900s →
  `SourceResult(snapshot|error, ...)`; a failed fetch yields the honest
  "Data unavailable" state, never an all-clear).
* ADH source: `https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx`.
* ADEQ HAB advisories table:
  `https://adeq.state.ar.us/water/planning/hab/default.aspx` — one parseable
  ASP.NET `<table>`; columns **WATERBODY NAME | NEAREST AREA | AR COUNTY |
  DATE POSTED**. The raw HTML is a **JavaScript shell**, not proof of an empty
  feed: `default.js` fills it from official `advisories.json`. Live check on
  2026-10-11 05:01 UTC found **7 current advisories**. Keep the planned sample
  toggle for genuinely empty periods; never use it as a failed-source fallback.
* ADEQ report form: `https://adeq.state.ar.us/complaints/`.
* **Gate G1:** fetch + parse + normalize **one real ADEQ advisory and one real
  ADH notice** → render one official status + one crowd/report pin distinctly.
  If this fails, fall back to **notices-only** (`notice_app.py`, already tested).

### Layer 2 — The AI, kept bounded and private. ~2 days

* `bloom_model.py` (built): local, on-device, explainable photo assist. No
  network, no API key, **photo never leaves the device**. Labels:
  `possible_bloom` / `unlikely_bloom` / `cannot_tell` — **never the word
  "safe"**.
* Optional: train the logistic `TrainedBloomModel` on a labelled set and report
  a held-out **confusion matrix + abstention rate**. Claims must stay bounded.
* **Gate G2:** one photo → one label. If it fails, ship the report loop
  **without** the AI assist (photo still attachable).

### Layer 3 — Polish that reads as talent. ~3 days

Wireframe UI, accessibility + Spanish toggle, honest empty states, sample-data
toggle, shareable "report card", and a **"Here's what the model looked at"**
feature-bar panel (explainability is a judge magnet).

### Ship (~3 days)

1–3 min **public** YouTube/Vimeo demo video following **one resident**, then
submission. Buffer included.

## Honest claims ledger (say these, not more)

| Claim | Allowed? |
|---|---|
| "Live data from ADH + ADEQ; one tap to report" | ✅ |
| "On-device AI — your photo never leaves the device" | ✅ |
| "I trained and evaluated a classifier (X% held-out, abstains when unsure)" | ✅ only with the eval |
| "Satellite early-warning for blooms" | ✅ only if actually built |
| "Covers Beaver Lake (280k people's water) + Buffalo National River" | ✅ |
| "Detects harmful blooms accurately" | 🚫 **never** |
| "Predicts blooms" | 🚫 **never** |

**Guardrail:** absence of a notice is **not proof of safety**. Official agency
advisories control. The app must degrade to **"Data unavailable"**, never an
all-clear. Three visually distinct classes (official / resident report / AI
assist) that never blur.

## Explicitly NOT building

Custom bloom-**prediction** ML; accounts/login/backend; fake forecasting; a
second operator dashboard. **Do not** chase a CNN or satellite model unless
Layers 1–3 are done with days to spare (photo-CNN data does not exist in the
right domain; satellite is a different feature and 3+ days).

## Repo conventions (follow these)

* **Run tests:** `./venv/bin/python -m pytest -q`. Suite was **232 passed**
  after `bloom_model.py`. Keep it green.
* **Dependencies:** per-app `requirements-<app>.txt` (+ `-dev.txt`); root
  `requirements.txt` is the union. Plan a `requirements-bloom.txt`
  (`-r requirements-notices.txt` + pandas + pydeck + altair).
* **Style:** match the repo — small modules, `@dataclass` records, every claim
  has **provenance**, explicit **non-claims**, and open **gates** marked
  `[NEEDS: …]`.
* **Tests:** mirror `tests/test_notice_app.py` — `pytest`,
  `streamlit.testing.v1.AppTest`, `FakeSource`, `monkeypatch`, fixtures in
  `tests/fixtures/`.
* **Never overwrite prior work.** Preserve `PRD.md` and the six existing apps.

## Current state

* ✅ `PRD-BLOOMWATCH.md`, `bloom_model.py` (+ `tests/test_bloom_model.py`, 20
  tests), `docs/wireframes/`, `docs/DEMO_FILMING.md`, `docs/WORKFLOWS.md`.
* ✅ `bloom_data.py` + `requirements-bloom.txt`: unchanged ADH engine adapter,
  strict ADEQ table/backing-feed parsing, source cache and honest status.
  Fixtures and offline tests: `tests/test_bloom_data.py`.
* ✅ `bloom_app.py` + `bloom_resident.py`: scoped HAB cards, separate ADH search,
  distinct official/resident map symbols, photo-optional session reporting,
  bounded local assist, report downloads, Spanish controls and sample toggle.
  Fresh dedicated environment: 84 data/resident/UI tests; full suite: 316 passed.
* G1 retrieval/normalization is verified live; distinct official/resident rendering
  is tested. [NEEDS: verified ADH service-area mapping] stays deliberately separate,
  never inferred from a lake name. Keep `notice_app.py` as fallback.
* ⬜ **Release:** resident usability/Spanish review, final name, real student
  contribution/AI disclosure, recorded public video and approved submission.
  See `docs/BLOOMWATCH_RELEASE.md`. No publication or submission has occurred.
* Privacy: Streamlit photo processing is on-device **only on localhost**; hosted
  uploads reach the server. Reports/watches are session-only, not a shared feed;
  watches are check-time comparisons, not background notifications.

## Definition of done (per feature)

Three status states only; official/resident/AI visually distinct; a failed
source yields "Data unavailable"; reporting works without a photo and without
any AI; no false "submitted" claim; Sources & Limits lists every source and
non-claim; core path needs no account/backend.
