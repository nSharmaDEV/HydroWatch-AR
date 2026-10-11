# Watershed Fieldbook — Product Requirements Document

**Version:** 0.3 · October 11, 2026  
**Status (v0.3):** Architecture approved by the user: **React + TypeScript + Vite UI,
localhost **FastAPI** service for Python logic, and **SQLite** for durable records**.
P0 implementation may proceed against this stack. Field-work features are not yet
implemented as of this revision; this document is a specification, not a shipped claim.  
**Name:** Watershed Fieldbook is a working name requiring approval.  
**Audience:** Park/ranger staff and water-quality researchers working around
Buffalo National River and Beaver Lake.  
**Competition:** 2026 Congressional App Challenge, Arkansas's 3rd District.

This PRD defines the next product, **not a resident-app mode**. It supersedes
the resident-first direction for new field-work development, while preserving
`PRD.md`, `PRD-BLOOMWATCH.md` and every existing app as historical work.
The rationale and winner research are in [the pivot plan](docs/FIELDWORK_PIVOT_PLAN.md).
Full journey/state contracts: [FIELDWORK_JOURNEY.md](docs/FIELDWORK_JOURNEY.md).
Visual desktop/mobile atlas: [wireframes](docs/wireframes/fieldbook-wireframes.html).
`[NEEDS: …]` identifies an unresolved decision or verification, never a shipped claim.

## 1. Summary

**Product promise:** Turn a water-site visit into a traceable record that can be
reviewed, compared and handed off without losing its context.

The core journey is **choose a site → record a visit → check missing context →
review compatible history → export for follow-up**. The proposed technical
centerpiece is an explainable completeness and comparison engine, not bloom AI.

This is a local field-record companion, not an official monitoring system,
regulatory assessment, laboratory information system or emergency dashboard.
Entered records remain user-entered evidence; completeness does not establish
scientific validity or agency acceptance.

## 2. Problem and evidence

### Verified context

- [NPS describes Buffalo National River water-quality monitoring](https://www.nps.gov/buff/learn/nature/waterquality.htm)
  at 32 sites, with field and laboratory parameters.
- [Beaver Water District's historical field-work description](https://www.bwdh2o.org/wp-content/uploads/2022/07/The-Source-May-2021.pdf)
  discusses on-site analyses and samples taken back to its lab.
- [BWD's August 2026 StreamSmart description](https://www.bwdh2o.org/the-source/streamsmart)
  identifies quality-assurance procedures and a certified-lab partnership.

These sources support the relevance of sites, visits, measurements and samples.
They do **not** establish the agencies' current internal workflow or approval.

### Hypothesis to validate

A compact tool connecting observations, sample references, measurement context
and exports could help some staff prepare understandable field records.
We have not established that staff lack software, lose records or would adopt it.

**Discovery is a claims gate, not a prerequisite to implementing the P0 core.**
Proceed with the bounded prototype while feedback is pending. Seek a non-sensitive
walkthrough from one ranger/resource staff member and one researcher, with
user-approved outreach. Ask about existing tools, fields, methods and exports.
Until feedback supports usefulness, describe an **unvalidated staff-oriented
prototype**. If feedback finds no useful gap or contradicts a core assumption,
pause expansion and revise that assumption before adding features. Public evidence
supports the relevance of field records, not demonstrated product demand.

## 3. Users and jobs to be done

| User | Job | Successful product outcome |
| --- | --- | --- |
| Ranger/resource staff | Document what was observed at a named site for later follow-up | Save an observation-only visit and export a clear, non-official summary |
| Water-quality researcher | Associate readings and sample references with the right place, time and method | Retrieve the visit, identify missing context and compare only compatible readings |

Both use the same record structure. Measurements, samples and photos are optional;
an observation-only visit is a first-class workflow, not an incomplete lab form.
The product must not require personal names, visitor identities or sensitive
incident details. It does not authorize sampling, access to restricted sites or
departure from agency procedures.

## 4. Goals, non-goals and success measures

### Goals

1. Preserve site/visit identity across capture, review and export.
2. Save records durably across application restarts.
3. Explain missing metadata and comparison limitations in plain language.
4. Keep official context, observations, entered measurements and photo guesses distinct.
5. Make one complete workflow legible in a 1–3 minute CAC demonstration.

### Proposed acceptance targets—not measured outcomes

- A first-time reviewer can save an observation-only visit without a photo or
  network connection while the local application is running.
- Saved records can be reopened after a process restart and exported as summaries/CSV.
  Metadata backup/import is deferred P1, not required for submission.
- A reviewer can explain why two incompatible readings are excluded from a trend.
- An exported visit identifies its site, time, provenance and unresolved issues.
- At least one genuine staff/researcher walkthrough informs a documented revision
  if access to a reviewer is available. Adoption or time savings are not inferred.

### Explicit non-goals

No water-safe/unsafe verdict, bloom/toxin prediction, closure or dispatch advice,
automated hazard prioritization, official endorsement, protocol certification,
chain-of-custody certification, automatic agency submission, sensor/SCADA control,
satellite processing, generic chatbot, multi-user staff accounts or public crowd feed.

## 5. Navigation and screen requirements

| Screen | Required content and action |
| --- | --- |
| **Field desk** | Water-body selection, recent visits, saved drafts, user-marked follow-up; primary action **Record a site visit**; compact official-context panel |
| **Sites** | Searchable list and optional map, site identity/provenance, history, selected-site details, create a user-defined site |
| **Record a visit** | Site/time/notes, optional measurements/sample references, explicit Save draft and Save visit; photos are P1 |
| **Review & compare** | Selected visit, explainable checks, revisions, compatible same-site observations and clear exclusions |
| **Export & sources** | Visit summary, CSV, sources, storage/privacy controls and limitations; metadata backup/import is P1 |

The selected site and visit remain visible through the journey. On mobile, stack
controls into one column. Desktop Sites may use a map/list and detail panel.
Maps are supplemental: every site and record must be accessible through text controls.

## 6. Functional requirements

**P0:** submission MVP. **P1:** optional after P0 is verified. No feature below is
represented as implemented by this PRD.

**MVP cut line:** one local user, two water bodies, user-defined sites, durable
drafts/visits with revisions, three measurement types, simple sample references,
completeness checks, conservative comparisons and summary/CSV exports. Reuse
existing official context only. Photos, lab-result entry, reference-site catalogs,
metadata backup/import, new translations and new live sources are not submission
requirements. Deferred controls must not appear as working features.

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| FR-01 | P0 | User-defined sites for either target water body | Site has stable ID/name/water body; optional coordinates are validated and labelled user-entered; no agency site designation is implied |
| FR-02 | P0 | Observation-only visit capture | Site, observation time/timezone and nonblank notes permit saving without readings, samples, photo or current agency data |
| FR-03 | P0 | Draft and recorded visit states | Explicitly saved drafts may have missing context; recorded visits require FR-02 minimums; neither state means scientifically validated |
| FR-04 | P0 | Durable storage and revisions | Saved visits survive process restart; editing saved values preserves a previous revision and requires a revision reason |
| FR-05 | P0 | Temperature, pH and turbidity entry | Unit, `method_code` and `instrument_ref` are separate; missing metadata can be saved, but both method and instrument are required for comparison; see section 7 |
| FR-06 | P0 | Manual sample references | Sample ID, collection time or missing state, user-entered planned/collected/unknown status only; lab status/results are deferred |
| FR-07 | P0 | Explainable completeness checks | Each issue names record/field, issue type and reason; editing the missing field updates the reason; no numerical scientific-quality score |
| FR-08 | P0 | Method-aware comparisons | Only compatible readings from the same site appear together; excluded rows remain accessible with reasons; no interpolation, toxicity verdict or causal interpretation |
| FR-09 | P0 | Official context | Reuse tested sources with scope, issue/retrieval times and failure/staleness; failed source cannot imply no advisory or block record entry |
| FR-10 | P0 | Visit summary and CSV export | Summary includes record IDs, time, entered data, provenance and unresolved checks; CSV retains values/units/methods and protects against spreadsheet formula injection |
| FR-11 | P1 | Versioned metadata backup/import | Valid backup restores into selected workspace; invalid/conflicting/cross-class import is rejected without overwriting records |
| FR-12 | P0 | Synthetic demo isolation | Physically separate working/demo SQLite files and bound form/query state; synthetic source fixtures only in demo; persistent SAMPLE labels; no demo-to-working promotion; see section 9 |
| FR-13 | P0 | Storage and deletion controls | UI names local storage location, explains what is retained and requires confirmation before deleting records/attachments |
| FR-14 | P1 | Consented local photo attachment | Saving a photo is explicit; observation capture still works if attachment handling fails; file limits and storage behavior are disclosed |
| FR-15 | P1 | Existing experimental photo assist | Explicit analysis only; neutral possible/ unlikely/cannot-tell label; no measured value or toxicity inferred; cannot block field entry |
| FR-16 | P1 | Verified public reference sites | Coordinates/site IDs have cited provenance and verification date; reference catalog is not implied to be exhaustive or agency-approved |
| FR-17 | P1 | Additional measurements/later lab results | Only after method/unit metadata is specified; lab-result time and source stay separate from collection/entry time |

### Visit state and save behavior

- **Draft:** explicitly saved work in progress. Clearly label missing site/time/notes.
- **Recorded:** minimum observation fields present; measurements may still have
  disclosed missing context. Do not gate every export on optional measurement metadata.
- **Follow-up:** independent user-set marker with note, not a risk rating or dispatch.
- **Reviewed:** if provided, user-marked with review time; never “verified by agency.”
- Save succeeds only after durable storage succeeds. Show a recovery message on
  write failure, retain form values and never display false “saved” confirmation.
- No background autosave promise. Explain that unsaved form edits can be lost;
  explicitly saved drafts must survive restart.

## 7. Review and measurement rules

### Required issue types

`missing_context`, `invalid_entry`, `method_mismatch`, `unreviewed_data`,
`source_unavailable` and `source_stale` must not collapse into one alarm status.
Structural invalidity prevents that invalid value being recorded. Missing
scientific context may be saved as a disclosed draft/incomplete entry.

### MVP measurement contract

| Parameter | Supported unit declaration | Comparison rule |
| --- | --- | --- |
| Temperature | °C; missing unit retained as missing context | Exact method AND instrument match; no implicit Fahrenheit conversion |
| pH | Explicit dimensionless pH declaration, not mg/L | Exact method AND instrument match; missing either excludes comparison |
| Turbidity | NTU or FNU, recorded separately | Exact unit/method/instrument match; never equate NTU and FNU |

Values must be finite. **Missing is not zero**; zero is a real entered value.
Never silently clamp, interpolate, fabricate or discard unusual readings.
Document any plausibility warning and distinguish it from proof of inaccuracy.

### Method and instrument are separate, not alternatives

- `method_code`: user-entered stable procedure reference, such as
  `TEMP-IMMERSION-V1`; not automatically an approved protocol.
- `instrument_ref`: reference to the **specific physical instrument**, such as
  `PROBE-01`, not just its model. The same model on `PROBE-02` is different.
- Draft/recorded visits may retain either/both as missing, with a separate
  missing-context reason for each. **Comparison requires both.** Saving does
  not authorize comparison. Observation-only visits require neither.

### Exact compatibility algorithm (MVP)

Readings need finite measured values, known observation times and identical keys:
`(workspace_class, site_id, parameter_code, unit_code, method_code, instrument_ref)`.

Controlled parameter/unit choices are `temperature/celsius`, `ph/ph`,
`turbidity/ntu` and `turbidity/fnu`. Trim method/instrument strings' leading and
trailing whitespace on save; then match **exactly and case-sensitively**. No fuzzy
matching, aliases, internal-space normalization or model equivalence. Empty/unknown
references are missing, not matching values. Corrections to saved references
require a revision reason. Matching metadata is structural eligibility, not proof
of calibration or scientific equivalence. [NEEDS: researcher review of this rule.]

Synthetic examples—not real measurements:

| Readings | Compare? | Reason |
| --- | --- | --- |
| S1, 18.2 and 19.0 °C, `TEMP-IMMERSION-V1`, `PROBE-01`, different visit times | Yes | All grouping fields match; values/times exist |
| Same pair, second instrument `PROBE-02` | No | Different physical instrument, even if its model matches |
| Same pair, methods `TEMP-IMMERSION-V1` versus `TEMP-IMMERSION-V2` | No | Exact method mismatch |
| S1, 3.0 NTU versus 3.1 FNU, otherwise matching references | No | Different units; no implicit conversion |
| Matching site/unit/method but one instrument is empty | No | Missing instrument context |
| `PROBE-01` versus `probe-01`, or different site IDs | No | Exact reference/site mismatch; no inferred equivalence |

With fewer than two eligible readings, show an explanation instead of a trend.
Persist and export excluded readings with their reasons.

Charts show discrete points with time, sample/visit links and method details.
Do not draw a single line across incompatible groups. No safety thresholds or
“deterioration forecast.” CFU and MPN must remain distinct if lab entry is later added.

## 8. Planned data model

All IDs are stable, locally generated identifiers. All timestamps retain timezone;
event/collection, entry, revision, result and source-retrieval times are distinct.

| Entity | Required planned fields |
| --- | --- |
| **Site** | `site_id`, `name`, `water_body`, optional paired `lat`/`lon`, coordinate provenance/precision, user-defined/reference origin, reference URL/date where applicable |
| **Visit** | `visit_id`, `site_id`, observation time/timezone, creation/update times, optional observer code, notes, draft/recorded state, follow-up flag/note, demo/workspace identity |
| **Measurement** | `measurement_id`, `visit_id`, `parameter_code`, raw input, finite value or not-measured, `unit_code`, separate `method_code`/`instrument_ref`, optional calibration/context note |
| **Sample reference** | `sample_ref_id`, `visit_id`, sample ID, collection time or missing state, planned/collected/unknown user status; lab/results only under FR-17 |
| **Attachment** | `attachment_id`, `visit_id`, local generated filename/reference, content hash, format/size, save consent and time |
| **Official snapshot** | `snapshot_id`, agency, source URL, coverage, issued/effective text, retrieval time, source fingerprint, error/staleness at capture |
| **Revision** | Record identity/type, revision ID/time/reason, prior saved values and associated context |
| **Review issue** | Record/field identity, issue type, plain-language reason, rule version; derived, not a contamination result |

A visit may exist without coordinates; omit its map marker rather than guess.
Changing site coordinates/provenance must preserve the context of historical
visits. Duplicate user sample IDs produce a warning, not a global uniqueness
claim. Stored official snapshots remain historical and must not appear current
merely because the visit was reopened.

## 9. Storage, exports and import safety

- Use a **single-user local SQLite workspace**, not a hosted shared database.
  Use transactional writes, schema versioning and record relationships.
- **Physical isolation:** within an explicitly chosen local data directory, use
  `working/fieldbook.sqlite3` and `demo/fieldbook.sqlite3`. P1 attachments use
  corresponding separate `working/attachments/` and `demo/attachments/` directories.
- Each database stores immutable `workspace_class` (`working`/`demo`). Opening it
  under the wrong class fails closed; never automatically relabel it.
- Bind every query, selected site/visit, draft form and download to its class.
  Confirm switching if edits are unsaved; after consent clear unsaved form/selection
  state. Saved drafts remain in their own database.
- Demo uses synthetic official-context fixtures, never live fetches. Failed working
  fetches never activate demo or seed sample rows. Demo screens/exports say SAMPLE
  and filenames include `demo`. No promote/copy action exists.
- P1 import rejects backup class differing from destination even when IDs do not
  collide. Test that rejected cross-class actions leave both databases unchanged.
- Export separate CSV tables for sites, visits, measurements and sample references,
  linked by IDs. Preserve raw values and metadata; sanitize user text against
  spreadsheet formulas without replacing numeric negative readings with text.
- Provide an escaped print-ready HTML visit summary with no scripts or embedded
  remote resources. Label drafts, user-entered data, missing context and sample mode.
- P1 metadata backup: versioned JSON with schema version and linked records.
  Photos are **not included** in this metadata backup; disclose this before
  download and distinguish missing attachment files after restoration.
- P1 import bound: 5 MiB metadata JSON. Validate version, types, finite
  coordinates/values, IDs, relationships and workspace class before writing.
  Show conflict preview; reject collisions rather than silently replacing data.
  Failed imports leave the existing workspace intact.
- Backup/import is not proof of chain of custody, encryption or tamper resistance.
  Revisions record edits but do not constitute a regulatory audit trail.
- Explain that deleting application records does not guarantee forensic erasure
  from SQLite, device backups, browser uploads or exported copies.

## 10. Sources and scope

| Source | Use in this product | Boundary |
| --- | --- | --- |
| ADEQ HAB feed through `bloom_data.py` | Published advisory context | HAB scope only; exact-name matches are not complete water-quality coverage |
| ADH through unchanged notice engine/adapter | Secondary reference/system lookup | No inferred lake/service-area association |
| NPS/BWD public information | Source links and contextual research | No live measurement feed or partnership claimed |
| USGS/NPS/BWD measurements | Deferred integration | [NEEDS: verified stations, parameters, units, methods, cadence and reuse terms] |
| User-entered visits/measurements | Field record content | Non-official, not independently validated |

Existing ADH/ADEQ cache policy is 300 seconds, refresh cooldown 60 seconds,
staleness 900 seconds. Current official advisory status remains exactly **Active
advisory / No active advisory found / Data unavailable**; these are not visit
states or safety verdicts. Failed refresh is unavailable immediately; last-good
data is historical/outdated detail. Absence of an advisory is not proof of safety.
Raw ADEQ shell HTML is not an empty feed; retain the tested backing-feed handling.
Census nearest-city reference points are not sampling stations or hazard locations.

## 11. Privacy and deployment

- Default deployment is localhost with a running Python process. Core entry and
  saved-record access must work without internet; no browser-only/PWA promise.
- No accounts, automatic sharing, outbound agency submissions or identity lookup.
- Advise users not to enter protected locations or sensitive personal information.
- Photos remain session-only unless explicit local persistence is implemented and
  consented. No metadata-removal claim without implementation and verification.
- On-device photo processing is true **only on localhost**. Hosted Streamlit
  uploads reach its server; do not reuse an unconditional “never leaves device” claim.
- Optional map tiles and official-source retrieval use external services; disclose
  these requests. No zero-telemetry or encryption claim without verification.
- Public hosting of a shared local workspace is out of scope. Authentication,
  isolation, retention, backups and security require a separate reviewed design.

## 12. UX and accessibility

- Public-service-inspired navy/white design; no seal, agency impersonation or
  assertion of official USWDS compliance.
- Visible identity: **Independent student project—not a government website**.
- Distinct labels for official context, field observation, entered measurement,
  sample/lab reference and experimental photo assist. Color is never the only cue.
- Keyboard-operable native controls, explicit labels, visible focus and text-list
  alternatives to maps. Target WCAG AA contrast; do not claim certification.
- Verify 390-pixel mobile and desktop layouts, text scaling and download flow.
- Error messages identify a fix; empty states explain how to start a site/visit.
- No automatic motion required. Existing Spanish capability is not evidence that
  the new field vocabulary is translated: [NEEDS: vocabulary and fluent review].
  Translation follows the verified English core, not before durable capture.

## 13. Architecture and implementation boundaries

**Approved stack (user decision, October 11, 2026):** the field-book UI is
**React + TypeScript + Vite**; Python domain logic runs as a small **localhost
FastAPI service**; durable records live in **SQLite**. All prior Streamlit apps
and PRDs are preserved as historical work.

Proposed modules, matching the approved stack:

```text
fieldbook/records.py    Typed site/visit/measurement/sample records + validation
fieldbook/store.py      Local SQLite per class (working/demo), revisions, transactions
fieldbook/review.py     Completeness issues and exact compatibility rules
fieldbook/exports.py    Formula-safe CSV and escaped print-ready HTML summary
fieldbook/sources.py    Official context via bloom_data.py; synthetic demo fixtures
fieldbook/api.py        Localhost FastAPI endpoints (bound to active workspace class)
fieldbook-ui/           Vite React + TypeScript screens (Field desk, Sites, Record a
                        visit, Review & compare, Export & sources)
fieldbook-data/         Data directory; working/fieldbook.sqlite3 and
                        demo/fieldbook.sqlite3 (physically separate, gitignored)
tests/test_field_*.py   Domain, persistence, review, export, source and API tests
```

Reuse tested official-source modules (`bloom_data.py`, the unchanged ADH notice
engine) through `fieldbook/sources.py`. Add only needed dependencies: FastAPI +
uvicorn in the existing venv, standard React tooling in `fieldbook-ui/`.
SQLite is available in Python's standard library. The service answers the UI
over `/api/*` and stays localhost-only with no accounts or shared workspace.
Preserve `bloom_app.py`, resident records, photo model and every prior app/PRD.
No automatic conversion of resident reports into staff records. Future migration
requires explicit provenance and a reviewed schema mapping.

## 14. Delivery priorities and verification

1. **Discovery/core:** seek feedback without blocking bounded P0 development;
   sites, visits, explicit drafts, persistent storage and observation-only exports.
2. **Technical centerpiece:** measurements, sample references, revisions,
   completeness explanations and compatibility checks.
3. **Finish P0:** map/list details, existing official context, safe summaries/CSV,
   mobile/accessibility review. Metadata import and photos remain P1.
4. **Submission:** real walkthrough corrections, clean installation, full tests,
   genuine contribution disclosure and approved public demo.

Write failing tests before implementation. Verify domain rules, restart recovery,
write failure, CSV/HTML safety, source failures, missing-versus-zero readings,
method mismatch, revisions and demo isolation. Streamlit AppTest must cover the
full no-photo site → visit → review → export journey and partial failure paths.
When FR-11 is built, additionally test transactional import rejection, unknown
schema versions, ID conflicts and cross-class rejection before enabling import.
Run `./venv/bin/python -m pytest -q` and preserve all prior tests. Existing 321-test
baseline concerns prior apps, not verification of this unbuilt field product.

Cut extra sources, additional parameters and photo AI before cutting durable
records, validation or exports. Target October 24–25 for final review/video;
national deadline is **October 26, 2026, noon EDT / 11 a.m. CDT**.

## 15. Release gates and claims ledger

| Gate | Required evidence |
| --- | --- |
| G1 — Core | Observation-only record survives restart and summary/CSV export; no false save confirmation |
| G2 — Review | Missing metadata explained; incompatible readings excluded with reasons; no safety verdict |
| G3 — Integrity | Revisions, safe summary/CSV exports and physical demo isolation tested; P1 import gets rejection tests if built |
| G4 — Usefulness | Real feedback and resulting changes, or explicit disclosure that staff workflow validation is pending |
| G5 — Release | Clean install, regression tests, manual accessibility/privacy review and accurate sources/limits |
| G6 — CAC | Actual student contribution and all AI assistance disclosed; eligibility/local instructions/name approved; public 1–3 minute demo and explicit submission approval |

Allowed after implementation/evidence: “Records site visits,” “flags missing
measurement context,” “compares compatible entered readings,” “exports field logs.”
Not allowed: “used by NPS/BWD,” “research-grade,” “detects harmful blooms,” “makes
water safe,” “reduces staff time by X%,” “agency-approved,” or “CAC-winning” without
the corresponding real evidence. Past-winner research informs focus and storytelling,
not performance or endorsement claims.

## 16. Open decisions

- [NEEDS: final product name and real ranger/researcher feedback.]
- [NEEDS: required site/form fields and useful export format from target users.]
- [NEEDS: researcher-reviewed compatibility rules and measurement vocabulary.]
- [NEEDS: public reference-site coordinates, licenses and protected-site exclusions.]
- [NEEDS: attachment retention behavior and user-visible local storage location.]
- [NEEDS: current AR-03 participation/judges/instructions; personal eligibility.]
- [NEEDS: genuine student technical contribution, AI disclosure and demo approval.]

These gates do not authorize outreach, publication, collection of real sensitive
records or submission on the user's behalf. This document is a product specification,
not a statement that the planned capabilities have shipped.
