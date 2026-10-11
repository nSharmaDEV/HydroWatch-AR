# Watershed Fieldbook Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the bounded P0 Watershed Fieldbook: a localhost FastAPI + SQLite service with a React + TypeScript + Vite UI covering site → visit → completeness review → exact comparison → safe export, with physically isolated working/demo data.

**Architecture:** Python package `fieldbook/` (typed records + validation, SQLite store with transactional writes and revisions, review/comparison engine, safe exporters, official-context adapter reusing `bloom_data.py`) served by FastAPI/uvicorn on localhost. A separate Vite React+TS frontend (`fieldbook-ui/`) calls `/api/*` (Vite dev proxy) and keeps selected site/visit identity in app state. Working and demo data live in physically separate SQLite files under `fieldbook-data/{working,demo}/fieldbook.sqlite3`.

**Tech Stack:** Python 3.14 (venv at `./venv`), FastAPI 0.143 + uvicorn (already in venv), stdlib `sqlite3`, pytest + `fastapi.testclient`; Node 23 / npm 10, Vite 7, React 19, TypeScript 5, Vitest + Testing Library.

**Spec:** `PRD-FIELDBOOK.md` (v0.2, updated to v0.3 architecture in Task 0), `docs/FIELDWORK_PIVOT_PLAN.md`, `docs/FIELDWORK_JOURNEY.md`, `docs/wireframes/fieldbook-wireframes.html`.

## Global Constraints

- Preserve every existing app, PRD, test and fixture. All new code goes in new files. Additive edits only.
- Non-negotiable domain rules (verbatim from PRD v0.2 §6–§9):
  - Observation-only Save visit requires site, observation time/timezone and nonblank notes — never measurements, samples, photos or internet.
  - Save succeeds only after durable storage succeeds; failed writes retain edits and never show false success.
  - Missing is not zero. Never silently infer units or fabricate readings. Structural invalidity is rejected; missing context is saved as a disclosed issue.
  - Method code and instrument reference are separate; both required for comparison, NOT for saving.
  - Comparison group key = `(workspace_class, site_id, parameter_code, unit_code, method_code, instrument_ref)`; trim method/instrument edges on save, otherwise exact case-sensitive matching. No NTU↔FNU conversion, no model equivalence, no fuzzy aliases.
  - Excluded readings stay visible with exact reasons; completeness never means validated/safe.
  - Editing any saved record requires a revision reason and preserves prior values (revision rows).
  - `working/fieldbook.sqlite3` and `demo/fieldbook.sqlite3` are physically separate; immutable `workspace_class`; opening under the wrong class fails closed; queries/forms/selections/downloads bound to active class; confirm before discarding unsaved edits on switch; no demo→working promotion.
  - Demo official context = synthetic fixtures only. Failed live fetch → "Data unavailable", never all-clear, never demo fallback.
  - CSV text cells are protected against formula injection without turning numeric negative readings into text; HTML exports are escaped, no scripts/remote resources.
  - Localhost-only; no accounts, no shared cloud workspace, no agency submissions, no public deployment.
- Controlled values: water bodies `["Buffalo National River", "Beaver Lake"]`; parameters `temperature|celsius`, `ph|ph`, `turbidity|ntu`, `turbidity|fnu`; sample status `planned|collected|unknown`; visit state `draft|recorded`.
- Run full suite `./venv/bin/python -m pytest -q` and keep every prior test green.

## File Structure

```
fieldbook/
  __init__.py, config.py, records.py, store.py, review.py,
  exports.py, sources.py, api.py, server.py
fieldbook-ui/                        # Vite React+TS app
  package.json, vite.config.ts, tsconfig.json, index.html
  src/{main.tsx, App.tsx, api.ts, types.ts, styles.css}
  src/components/{Header,Identity,Issues,CompareRail,SampleBanner}.tsx
  src/screens/{FieldDesk,Sites,RecordVisit,ReviewCompare,ExportSources}.tsx
  src/__tests__/{saveFailure.test.tsx, switchWorkspace.test.tsx}
tests/test_field_{records,store,review,exports,sources,api}.py
fieldbook-data/                      # gitignored live data dir
requirements-fieldbook.txt, requirements-fieldbook-dev.txt
```

Shared data shapes (fieldbook ↔ UI): all IDs stable strings; timestamps ISO 8601 with timezone; `workspace_class` ∈ `working|demo`.

## Task 0 — Approve architecture in docs (no code)

**Files:** Modify `PRD-FIELDBOOK.md` (§13), `AGENTS.md` (top), `CHANGELOG.md`, `README.md` (additive).

Update the stack statement: retained Python domain/store/review/export logic, **now served by a localhost FastAPI service**; **UI is React + TypeScript + Vite**; durable records in **SQLite** (separate working/demo files). Preserve all non-negotiable rules and the "no frontend migration required" sentence is replaced by the approved migration note. Add `fieldbook-data/` to `.gitignore`.

- [ ] Commit message: `docs: approve React/FastAPI/SQLite stack for Watershed Fieldbook`

## Task 1 — Requirements + package scaffolding

**Files:** Create `requirements-fieldbook.txt`, `requirements-fieldbook-dev.txt`, `fieldbook/__init__.py`, `fieldbook/config.py`; modify `.gitignore`.

- `requirements-fieldbook.txt`: `-r requirements-notices.txt` + `fastapi==0.143.0` + `uvicorn==0.52.4`.
- Dev: `-r requirements-fieldbook.txt` + `pytest==9.1.1`.
- `config.py`: `WORKSPACE_CLASSES = ("working", "demo")`, `SCHEMA_VERSION = 1`, `resolve_data_dir(env="FIELDBOOK_DATA_DIR")` → default repo-root `fieldbook-data`; `db_path(data_dir, cls)` → `<dir>/<cls>/fieldbook.sqlite3`.

## Task 2 — Typed records + validation (`fieldbook/records.py`)

Dataclasses (frozen where read-safe): `Site`, `Visit`, `Measurement`, `SampleReference`, `Revision`, `WorkspaceMeta`. `ValidationError(ValueError)` with per-field messages. Functions:

- `normalize_site(name, water_body, lat, lon, coord_provenance)` → `Site` — name/water_body nonblank; coords both-or-neither; lat −90..90, lon −180..180; coord provenance required when coords present; fails 2026 tests below.
- `build_visit(site_id, observed_at, notes, *, state, observer_code, follow_up_flag, follow_up_note) -> Visit` — recorded requires nonblank site_id, tz-aware `observed_at`, nonblank trimmed notes; draft requires only ≥1 non-empty field.
- `add_measurement(visit_id, parameter_code, value, unit_code, method_code, instrument_ref, note)` — parameter/unit pair validated; finite required (float, not NaN/inf); method/instrument trimmed at edges only; missing allowed.
- `add_sample(visit_id, sample_id, collected_at, status)` — nonblank sample_id; status enum.
- `parse_iso_dt(value)` strict; `format_iso_dt`.

**Tests `tests/test_field_records.py`** (write first): water body rejected; half-pair coords rejected; recorded visit missing notes/time rejected; draft with only notes accepted; `value=None` (not measured) accepted but `0.0` stored as zero (missing≠zero); NaN/inf rejected; `ph` accepts only unit `ph`; `turbidity` accepts `ntu`/`fnu`; method/instrument trimmed at edges but preserved internally; controlled unit/parameter mismatch rejected.

## Task 3 — SQLite store (`fieldbook/store.py`)

`Store(data_dir, workspace_class)` — opens `<dir>/<cls>/fieldbook.sqlite3`, creates schema (`meta`, `sites`, `visits`, `measurements`, `sample_refs`, `revisions`), `PRAGMA foreign_keys=ON`, journal_mode WAL during writes. Immutable class: `meta.workspace_class` written at creation; opening existing DB whose class differs **fails closed** (`WorkspaceClassError`). Methods (all transactional, single connection + commit per write; write failures propagate as `StorageError`):

- `save_site(site) -> Site`; `list_sites/ search(q)`, `get_site(site_id)`
- `create_visit(visit, measurements, samples) -> VisitDetail` (one transaction; children optional)
- `get_visit(visit_id) -> VisitDetail | None` (with measurements/samples/revisions); `list_visits(site_id=None, state=None)`
- `revision_visit(visit_id, *, reason, visit_patch, measurement_patches, sample_patches) -> VisitDetail` — requires nonblank reason; inserts a `revisions` row per changed record preserving prior values; all inside one transaction; failed write leaves prior state intact.
- `delete_visit(visit_id) -> str` (cascade children + revisions, scoped to active class)
- `close()`, restart recovery = reopening the same path returns rows (tested via a second `Store` instance).
- Tests `tests/test_field_store.py`: restart persistence; class mismatch fails closed; partial write failure (use read-only file / monkeypatched failing commit) leaves DB unchanged and raises `StorageError`; duplicate sample IDs warn (list of warnings) not error; drafts survive restart; revision preserves prior JSON; delete scoped to class; schema version recorded.

## Task 4 — Review + comparison (`fieldbook/review.py`)

- `visit_issues(detail, source_context, now) -> list[ReviewIssue]` with issue types `missing_context | invalid_entry | unreviewed_data | source_unavailable | source_stale`; fields: record_type, record_id, field, reason text (plain language per PRD examples).
- `compare_readings(site_id, parameter_code, unit_code, method_code, instrument_ref, measurements, visits) -> CompareResult(group_key, eligible[], excluded[])` — exact rules from PRD §7; one specific reason per excluded row; fewer than 2 eligible still returns rows + `message`.
- Tests `tests/test_field_review.py`: missing unit/method/instrument each produce separate reasons; missing ≠ unrelated; sample with status `collected` and no collection time flagged; `planned` sample not flagged; source unavailable never blocks issues; all six PRD comparison example rows (S1/S1-PROBE-02/…, probe-01 vs PROBE-01, NTU vs FNU, empty instrument, case mismatch) produce the exact listed reasons; under-two message; excluded rows retained.

## Task 5 — Safe exports (`fieldbook/exports.py`)

- `csv_tables(detail, workspace_class) -> dict[str, str]` — `sites/visits/measurements/samples` CSV strings; `safe_cell()` numeric passes through (negative numbers stay numeric), text starting `= + - @ TAB CR` gets `'` prefix.
- `summary_html(detail, workspace_class, source_context) -> str` — escaped, no `<script>`, no external URLs; includes record IDs, entry/revision times, "user-entered" provenance, unresolved issues, SAMPLE banner + `demo` when demo, non-claim footer, CSS inline.
- Tests `tests/test_field_exports.py`: CSV injection (`=cmd`, `-2+3`, `@sum`, `+x`) neutralized; numeric `-18.2` untouched as number; missing cell empty not `0`; HTML escapes `<`, quotes; no `script` tag; demo filenames contain `demo` and SAMPLE marker; counts rows/columns.

## Task 6 — Official context (`fieldbook/sources.py`)

- `WorkingContext(fetchers)` wrapping `bloom_data.BloomSource` → `[{agency, status, checked_at, error, coverage, url, sample}]`; status via `bloom_data.source_status`.
- `DemoContext` → fixed synthetic fixture rows, always labeled SAMPLE, never live fetch.
- `ContextSource(active_class, working=..., demo=...)` returns per-class context. Tests `tests/test_field_sources.py`: injected fake failing ADH/ADEQ → `Data unavailable`, no all-clear; demo returns synthetic statuses without network (monkeypatch `httpx.Client` to raise if called); working context uses real parsers on fixtures.

## Task 7 — FastAPI service (`fieldbook/api.py`, `fieldbook/server.py`)

Endpoints (all bound to active class; active class switchable per-request via `POST /api/workspace`):

- `GET /api/health`, `GET /api/meta`, `POST /api/workspace {class}` (resets nothing server-side)
- `GET/POST /api/sites`, `GET /api/sites/{site_id}`, `GET /api/sites/{site_id}/visits`, `GET /api/sites/{site_id}/compare`
- `GET /api/visits` (site/state filters), `POST /api/visits` (draft or recorded), `GET /api/visits/{visit_id}`, `PUT /api/visits/{visit_id}` (composite revision), `DELETE /api/visits/{visit_id}` (requires `{"confirm": true}`)
- `GET /api/visits/{visit_id}/review`, `GET /api/official-context`, `GET /api/storage`
- `GET /api/visits/{visit_id}/export/{table}.csv` (sites|visits|measurements|samples) with `Content-Disposition` filename including `demo-` when demo; `GET /api/visits/{visit_id}/summary.html`
- Errors → 400 validation with field messages, 404 unknown id/wrong class, 409 write failure, 409 revision missing reason.

**Tests `tests/test_field_api.py`** (TestClient, tmp data dir per class): full observation-only journey POST→GET→restart (new client)→compare→export; measurement journey; draft state allowed with missing context then revision with reason; failed write (monkeypatch Store commit to raise) → 409 + record unchanged; delete without confirm → 400, with confirm → gone; demo/working isolation (create in working, cannot see in demo; demo CSV filename has demo); formula-injection CSV returned through API.

## Task 8 — Vite scaffolding (`fieldbook-ui/`)

Manual scaffold (no interactive generator): `package.json` (react, react-dom, vite, @vitejs/plugin-react, typescript, vitest, @testing-library/react, jsdom), `tsconfig.json`, `vite.config.ts` with `/api` proxy → `http://127.0.0.1:8765`, `index.html`. `FieldbookApp` renders header + nav + active screen; app state context holds `{workspace_class, activeSite, activeVisit, dirtyForm}`. CSS token set matches wireframes (`--navy:#16324f` etc.), focus-visible, min 44px targets, `@media(max-width:768px)` single column; verified at 390px.

## Task 9 — Screens

- **FieldDesk**: water body chips (Buffalo / Beaver), recent visits + drafts, follow-up list, Record a visit CTA, official-context panel (non-blocking), empty states ("Create a site to start a visit").
- **Sites**: searchable list + optional coordinate provenance; selected-site identity banner; visit history; create-site form (name, water body, both-or-neither coords, provenance); list alternative always present (no map required for MVP; show "Coordinates not recorded; no marker shown" text).
- **RecordVisit**: persistent site/visit identity; observed time + timezone select; notes; optional measurement rows (parameter/value/unit/method/instrument) and sample reference row; **Save draft** and **Save visit**; on failed save keep values and show "Not saved. Your form entries are still here."; unsaved-edit warning before workspace switch.
- **ReviewCompare**: issues grouped by type with fixes; Edit with mandatory revision reason; compare rail: choose a reference measurement → eligible points + excluded-with-reasons; conversational "Need two compatible readings to compare" state.
- **ExportSources**: review/compare/summary preview, download HTML summary + 4 CSVs (demo-named when demo), official source coverage with retrieval times, storage path, delete visit with confirmation, non-claims and limits.

## Task 10 — Frontend tests

`src/__tests__` with Vitest + Testing Library (jsdom, mocked `api.ts`): save-failure retention ("form entries still here", no fake saved banner); observation-only save requires site/time/notes but no measurement; workspace switch prompts on dirty form and clears selection; demo banner visible. Run `npm test` and `npm run build` clean.

## Task 11 — Integration verification

- Start backend `./venv/bin/python -m uvicorn fieldbook.api:app --port 8765` and `npm run dev`; use browser tool to run observation-only journey (create site → visit → save → review → export) at desktop and at 390px viewport; capture screenshots.
- Run `./venv/bin/python -m pytest -q` — full original suite + new field tests green.
- Update `README.md`, `CHANGELOG.md`, and project memory with verified results + honest limitations (unvalidated prototype, no agency data, on-device scope, no demo→working promotion).

## Verification gates (from PRD §14/§15)

- Gate G1: observation-only record survives restart + summary/CSV export; no false save confirmation.
- Gate G2: missing metadata explained; incompatible readings excluded with reasons; no safety verdict.
- Gate G3: revisions, safe summary/CSV, physical demo isolation tested; failures covered.
- Honest status: unvalidated staff-oriented prototype; staff feedback pending ([NEEDS: …]).