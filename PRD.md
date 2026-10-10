# HydroWatch AR — Recorded Household Water-Use Explorer

**Status:** Narrow sample-only MVP approved in conversation and implemented. Broader anomaly/upload workflows remain a draft for feasibility review; this document does not authorize them.

**City-level direction under research:** See [NWA_CITY_RESEARCH.md](NWA_CITY_RESEARCH.md) for the proposed BWD customer-city demand explorer, source checks, compact wireframe and release gates. This is a proposed pivot, not an implemented feature or authorization to replace the existing apps. The household MVP requirements below still describe the checkpointed implementation.

**Research update — October 9, 2026:** See [RESEARCH_REPORT.md](RESEARCH_REPORT.md) for completed public-source checks, the full site032 audit, current CAC rules, and unresolved external evidence. The evidence supports the implemented **sample-only recorded-usage chart and quality summary**, without uploads, overnight scoring, ML, or leak classifications. Conditional future features below are not requirements for completing this MVP. Both existing applications remain unchanged.

**Implementation update:** The user approved this narrower scope in conversation. `sample_app.py` now implements the independent sample-only chart, day selector, whole-sample totals, coverage table, provenance and guidance links. `sample_data.py` verifies the bundled source subset and performs gap-preserving source-clock grouping. Approval does not extend to the broader upload/rule/ML workflows below. The notice finder and legacy prototype remain untouched. See `README.md` for independent run instructions.

## 1. Summary

HydroWatch AR's approved first demo is a separate educational explorer for Northwest Arkansas residents, using clearly labeled Utah readings as a practice example. It includes source-clock charts, totals, observation counts, partial-hour flags and an official utility-help selector for Fayetteville, Rogers, Bentonville and Springdale. Local relevance comes from the intended audience and provider guidance, not Arkansas measurement data or demonstrated local impact. Overnight patterns, transparent rules, ML comparison and private uploads are broader product hypotheses below, not implemented or approved features.

The app does not confirm a leak, locate a pipe failure, certify water safety, guarantee savings, connect to active meters, or dispatch field crews. It is not a municipal SCADA or utility operations product.

## 2. Product context and constraints

- The repository already contains a separate Arkansas boil-water notice finder in `notice_app.py`, alongside legacy prototype code. Preserve those applications; this proposed product is a distinct household experience, not a replacement or an instruction to rewrite the existing prototype.
- The earlier municipal command-center wireframes (zones, GIS incidents, utility dispatch, work orders) are out of scope. The household wireframes supersede that direction.
- The narrow sample-only explorer is implemented; broader workflows remain in planning/feasibility. Sample access/licensing and national CAC rules have been checked; utility export compatibility, timezone semantics, leak evaluation evidence, private-upload retention, and participant-specific CAC compliance remain unresolved. See the research report for evidence and limits.
- Further review should favor an understandable, accurate demo over adding unsupported analysis or reporting features.

## 3. Users and problem

### Primary user

A Northwest Arkansas household water customer learning to interpret usage records before contacting their utility. The completed MVP shows a Utah household practice sample, not the viewer's own readings or a representative Arkansas household. Choose the actual provider named on the bill; the four listed providers do not cover every resident.

### Secondary user

A plumber or other water professional reviewing the educational sample and its data-quality limitations. Reviewing a customer's own readings is a conditional future use case, not a supported workflow.

### Problem statement

Raw readings can be difficult to interpret. A cautious visualization can make recorded usage and data coverage easier to understand. Whether analysis of a resident's own readings would help investigation remains a future product hypothesis; utility export compatibility has not been established.

### Product promise

“HydroWatch AR is an educational prototype for Northwest Arkansas residents. Practice interpreting a public Utah water-use sample, understand its limits, and find official local utility help.” This is the intended use, not a validated learning or conservation outcome.

### Non-claims

HydroWatch AR does not establish that a physical leak exists, identify its location or cause, prove there is no leak, prevent property damage, promise financial savings, provide water-safety advice, or replace a licensed professional or water provider.

## 4. Goals and success criteria

### Completed MVP goals

1. Demonstrate an understandable, end-to-end household water-use exploration workflow.
2. Make sample data and its limitations unmistakable.
3. Show recorded volume and observation coverage without implying a leak or risk score.
4. Explain the sample's limitations and offer safe, advisory guidance links.
5. Keep the first version small enough to demonstrate and explain in a Congressional App Challenge presentation.

### Current success criteria

- A first-time viewer can distinguish sample data from their own readings.
- A user can see the time range, units, missing-data coverage, and relevant usage patterns.
- Displayed totals and hourly groups can be traced to the bundled observations and documented pulse conversion.
- The app uses cautious language and does not classify anomalies or leaks.
- A missing, corrupt, or modified fixture produces an explicit error instead of substitute readings; gaps remain missing and incomplete groups show coverage.
- The demo can be explained accurately, including unknown source-clock semantics and the absence of leak labels. First-time-user comprehension remains a review task, not an established outcome.

No real-world accuracy, water savings, or community-impact target is claimed until supported by an appropriate dataset and evaluation.

## 5. User workflow

The completed flow is **Open recorded sample → Explore chart → Inspect coverage → Read source and guidance**. There is no upload, scoring, or flagged-interval workflow.

### Completed sample path

1. Open `sample_app.py`. It verifies and loads the bundled measured site032 summer fixture without a utility account or runtime dataset download. Persistent labeling says it is a Utah sample, not the viewer's meter; leak status and source timezone are unknown. Fixture verification failure stops the display with restoration guidance, not synthetic fallback.
2. View the entire sample or select a recorded day. The Altair bar chart groups gallons by the original timestamp hour; tooltips and colors describe observations and coverage, not risk. No timezone conversion, overnight interpretation, diurnal profile, or continuous-flow inference is performed.
3. Read the **whole-sample** metric row: 14,512.53 recorded gallons, 345,491 observations, and 383 full-count groups out of 385. These metrics do not change with the selected day. Open the Coverage tab to inspect the selected groups, counts, and partial edges in a 200px-high table; additional rows scroll within the table.
4. Read attribution, licensing, transformations, limitations, and official household guidance links. Concerns about the viewer's own household should go to their utility or a qualified plumber. Do not operate utility meter-box valves or pressure-relief equipment.

### Conditional future path—not implemented or approved

**Upload → Validate → Analyze → Review → Investigate/share** may be considered only after the gates in sections 6–8 and 13 are met and the user separately approves implementation. Neither generic Green Button support nor compatibility with any Arkansas provider is assumed. Any future rule and ML findings must remain distinct; a no-flag result must never imply “no leak” or “safe.”

## 6. Data, formats, and provenance

### Public/sample data

- The approved, implemented fixture is Utah State's Cache County dataset, site032 summer period, for illustrative measured usage only: anonymous access and CC BY 4.0 verified; complete household QC CSV audited. The bundled subset, checksum, attribution, and modifications are documented in [data/README.md](data/README.md). No suitable documented household leak truth was established among checked candidates. Timezone and timestamp interval ownership remain unverified; the MVP uses only recorded-source-clock grouping with explicit caveats. See [RESEARCH_REPORT.md](RESEARCH_REPORT.md).
- Until documented leak labels and suitable evaluation data are confirmed, public data may support usage-pattern visualization only. It must not be used to claim leak-detection precision, recall, F1, or field effectiveness.
- Small constructed observations support parser/grouping tests only. The displayed fixture is measured public data; the app never substitutes synthetic readings on failure.

### Conditional future user CSV—not implemented

Candidate schema only (not an accepted upload contract; subject to validating real exports, privacy behavior, and separate approval):

| Column | Meaning |
| --- | --- |
| `timestamp` | Timestamp for the interval, with documented timezone/interpretation |
| `usage_gallons` | Total gallons recorded during that interval |

Do not advertise generic Green Button compatibility until real export variants are tested. Clearly report the expected schema and interval semantics. Handle duplicate timestamps, timezones, daylight-saving transitions, malformed values, and non-hourly intervals explicitly; never silently reinterpret them.

### Missingness and minimum history

- Never replace missing readings with zero.
- **Completed:** preserve empty hour groups as missing, retain measured zeros, and show observation counts against 900 expected observations per full timestamp hour. The selected sample has no interior timestamp gaps; its first and last groups are partial. Full counts do not establish physical interval boundary ownership.
- **Conditional future scoring:** exclude incomplete windows under a documented coverage policy. A proposed 14-calendar-day minimum (336 expected hourly intervals) is an unvalidated weekly-pattern-learning hypothesis, not a current MVP requirement.
- **Conditional future ML:** define minimum valid history/coverage and disable scoring below it. Do not imply a rule-only result is ML-backed. The current MVP has neither method and requires no ML history threshold.

## 7. Conditional future detection and evaluation—not implemented or approved

These are retained feasibility hypotheses, not outstanding tasks required to complete the sample-only MVP. No rule threshold or model has been validated for this sample.

### Rule baseline

The proposed deterministic baseline flags a candidate only when interval usage is at least 30 gallons in each of four consecutive hourly intervals starting at 01:00, 02:00, 03:00, and 04:00 local time. This corresponds numerically to 0.5 gallons/minute sustained over a full hour, but hourly totals alone cannot prove continuous flow within each interval. Describe this as a **sustained high overnight hourly-volume signal**, not continuous flow or a confirmed leak.

The exact threshold, timezone policy, coverage requirements, and applicability to sample data remain to be validated. Rule and model outputs must remain distinct.

### ML approach

Isolation Forest has been proposed as an unsupervised anomaly detector, with time and usage-derived features. Its score is not inherently a probability, calibrated severity, or explanation. Do not show a normalized “risk” or “probability” value unless its transformation and meaning are defined and tested. Provide a plain-language explanation of what observations were unusual and avoid implying feature importance that the algorithm does not provide.

### Evaluation gate

- First identify a dataset with documented event labels before making quantified leak-detection claims.
- If labels are unavailable, evaluate only behavior on known fixtures and describe that as software/integration testing, not real-world detection accuracy.
- If a labeled dataset is secured, use a held-out evaluation with household-level or non-overlapping temporal splits, lock thresholds using training/validation data, and report false alarms and missed events alongside metrics.
- Define both interval-level and event-level matching before reporting precision/recall/F1. Proposed event overlap thresholds require justification and must not be selected after inspecting the held-out test results.
- Consider ML as a future product feature only if evaluation shows a defensible benefit over the simple rule. Otherwise omit it; even a rule requires its own evidence and approval. Neither belongs to the completed sample-only MVP.

## 8. MVP scope

### Completed and approved

- Separate Streamlit experience in `sample_app.py`, preserving the notice finder and legacy prototype.
- Bundled, checksum-verified measured sample with persistent labeling, source attribution, license, and documented transformations.
- Compact 1000px/92vw container with Usage, Coverage, and Source & guidance tabs; interactive 260px Altair chart, recorded-day selector, whole-sample metric row, and 200px-high coverage table. Tabs separate content rather than hiding it with fixed page overflow.
- Gap-preserving source-clock grouping, measured-zero handling, partial-edge labeling, and explicit unknown timezone/interval semantics.
- Safe advisory guidance links and clear limits; no diagnosis or scoring.
- Offline parser, aggregation, fixture-integrity, gap, and UI tests in `tests/test_sample_data.py` and `tests/test_sample_app.py`.

### Remaining review and presentation work—not missing MVP features

- Review first-time-user comprehension, chart readability, and plain-language wording on desktop and mobile; refinements may be proposed without broadening scope.
- Verify participant eligibility, student contributions, AI disclosure, district instructions, and prepare an accurate CAC demo if submitting (section 12). No submission has been completed.
- Public deployment is optional and has not been performed; a hosted demo requires checking the runtime and privacy disclosures first.

### Deferred and conditional future features

| Feature | Current status and prerequisite |
| --- | --- |
| Customer CSV upload/validation | Not implemented. Obtain a consenting customer's redacted representative export; document units, cadence, timezone/DST, interval ownership, gaps/resets, and supported schema. Verify privacy/retention behavior and obtain separate implementation approval. |
| Local overnight profile and baseline rule | Not implemented. Resolve clock and physical interval semantics, define coverage requirements, and justify the threshold and applicability before approval. |
| Isolation Forest or other ML comparison | Not implemented. Define defensible history/coverage and evaluation design, secure appropriate evidence, and demonstrate benefit over the baseline before approval. Leak-performance claims additionally require documented leak truth and held-out evaluation. |
| Flagged-interval CSV summary | Not implemented. Requires an approved, meaningful flagging method, defined output fields, and privacy checks. |

These features are not promised follow-on releases. If evidence does not support them, omit them rather than adding them to satisfy the earlier broader plan.

### Out of scope

- Municipal SCADA, utility-wide monitoring, pressure/network operations, GIS leak locations, crew dispatch, work orders, and zone dashboards.
- Live meter or proprietary utility API connections.
- Automated email/SMS notifications, accounts, cloud database, multi-household aggregation, or persistent user history.
- Confirmed leak diagnosis, pipe location, water-safety certification, guaranteed savings, or property-damage prevention claims.
- PDF reports and visual polish beyond a clear, accessible working demo.

## 9. Privacy and deployment

### Current sample-only behavior

- The app reads only the bundled public fixture; there is no upload, customer account, private-reading storage, utility API, or external dataset request at runtime.
- Shared application caching is limited to the public sample. Local run instructions are in `README.md`; this work did not deploy the app publicly.
- Do not equate offline fixture loading with a verified “zero telemetry” guarantee. Runtime/hosting telemetry and logs require separate checks; Community Cloud's documented telemetry behavior is noted in the research report.

### Conditional requirements for uploads or hosting

- For local execution, design uploaded readings to be processed in memory and not deliberately written to disk or sent to an external service. Verify this against dependencies and actual behavior before making a guarantee.
- For hosted deployment, uploads are processed on hosting infrastructure. Disclose that plainly; do not claim that closing a tab destroys server-side data or make retention promises without verifying the platform’s behavior.
- Do not collect names, addresses, account numbers, or other identifying details unless a later, justified requirement is approved.
- Any future private-reading workflow should minimize telemetry and persistence; verify hosting/runtime and library behavior before stating “zero telemetry” or “never transmitted.” Do not put private readings in globally shared caches.

## 10. UX and accessibility

- Use plain-language labels and explain units, source, history length, gaps, and analysis method near results.
- The current app has only the labeled sample context; any future upload context must be visually distinct.
- Explain chart colors as coverage, not risk. Keep detailed counts in the Coverage tab's bounded table and explain that the summary covers the entire sample, even when one day is selected.
- Avoid alarmist red/critical dispatch styling. If anomaly review is approved later, use neutral language such as “Unusual pattern to review,” never a diagnosis.
- Review readability on desktop and mobile without presenting deferred features as available controls or placeholder results.

## 11. Acceptance criteria and completion status

### Completed sample-only MVP

- [x] Sample loads locally without a utility account or runtime download and persistently identifies recorded Utah data, not the viewer's meter.
- [x] Source, CC BY 4.0 license, modifications, checksum, and pulse conversion are documented.
- [x] Chart and day selector display source-clock groups without implicit timezone conversion; whole-sample metrics remain clearly labeled and unchanged by day selection.
- [x] Recorded zeros are retained; absent hour groups remain missing rather than zero. Observation counts and partial collection edges are visible.
- [x] The pinned fixture reproduces 345,491 observations, 1,668,299 pulses, 14,512.533001 gallons, and 385 groups (383 full-count, two partial edges).
- [x] Invalid observations and missing/corrupt/modified fixtures are rejected; the UI explains fixture failure without substitute data.
- [x] The app provides advisory guidance and states unknown leak status, unknown clock semantics, no water-safety assessment, and no savings promise.
- [x] The app has no uploads, rule/ML scores, leak classifications, flagged-interval export, or live meter connections.
- [x] Automated sample tests cover conversion, malformed inputs, gaps, zeros, fixture integrity, caveats, selection, chart semantics, compact tabs, missing-versus-zero wording, Arkansas purpose/provider guidance, and failure UI. The latest run passed 25 sample tests and 75 existing tests; those tests do not establish detection accuracy or local impact.

### Remaining review/submission checks

- [x] Correct chart wording: a missing hour and a recorded zero may both have no visible bar; direct viewers to Coverage to distinguish them. Use “All expected readings present” in the chart legend and table instead of “Full timestamp count.”
- [x] Add an explicit Northwest Arkansas educational purpose and source-verified utility-help selector for Fayetteville, Rogers, Bentonville and Springdale, while preserving Utah provenance and unverified export compatibility. Arkansas resident feedback and consenting local export validation remain pending.
- [ ] Confirm a first-time viewer understands the chart, coverage colors, partial edges, whole-sample totals, and sample-vs-own-meter distinction; propose wording/readability refinements if needed.
- [ ] If submitting to CAC, verify participant-specific requirements and prepare materials that distinguish working features, sample limitations, student contributions, and AI assistance.
- [x] Recheck national CAC rules and prepare the explorer-specific eligibility review, AI-assistance draft and demo outline in [CAC_PREPARATION.md](CAC_PREPARATION.md). Participant eligibility and substantive student authorship remain unresolved; no video has been recorded or submitted.
- [ ] If publicly hosting, verify platform behavior and document accurate privacy/telemetry disclosures before deployment. Hosting is not required to complete this MVP.

For the first-time-viewer check, ask someone new to the app, without coaching: (1) “Whose readings are shown, and does this tell us whether there is a leak?” (2) “After selecting one day, what period do the top totals cover?” (3) “How would you distinguish a recorded zero from missing readings?” Expected understanding: recorded Utah sample, not their meter; leak status unknown; totals cover the whole sample; consult Coverage counts and values, not bar visibility alone. Record actual feedback before marking the check complete. Screenshots and automated tests do not establish user comprehension.

### Acceptance gates only if future features are approved

Upload schema/error handling and privacy checks, rule boundary/coverage tests, minimum-history behavior, independently attributable rule/ML outputs, method-disagreement states, and summary-export field checks would become requirements for their respective future features. They are not uncompleted acceptance criteria for the current sample-only app. No-flag language must never assert a household is leak-free or safe.

## 12. Congressional App Challenge preparation

HydroWatch AR is intended for the 2026 Congressional App Challenge associated with Arkansas’s 3rd Congressional District. National rules were checked October 9, 2026: deadline October 26 at noon EDT (11 a.m. Arkansas CDT), public 1–3 minute video, and AI/tool disclosure with substantive student work. Individual eligibility/authorship and current district-specific instructions remain participant verification gates. See [RESEARCH_REPORT.md](RESEARCH_REPORT.md) and the existing `SUBMISSION_CHECKLIST.md`; ML and a publicly hosted app are not national requirements.

The presentation should explain: (1) a locally relevant household water-use problem supported by a credible source, (2) the working sample-only chart, day selector, totals, and coverage table, (3) how recorded volume and observation coverage differ from a leak diagnosis, (4) a working demo with clearly labeled Utah data, (5) limitations and actual privacy behavior, and (6) the student's actual work and AI assistance. Rule/ML workflows must not be shown or described as implemented. Do not claim quantified conservation or leak-detection impact without evidence. [CAC_PREPARATION.md](CAC_PREPARATION.md) supplies a draft recording outline and documents substantial agent-generated code/tests; disclosure alone does not establish student-authorship compliance. Participant eligibility, contribution evidence, final disclosure, actual recording/public upload, and submission remain pending.

## 13. Research dispositions and future decision gates

| Research question | Disposition and effect on scope |
| --- | --- |
| Public sample access, license, and suitability | Resolved for illustrative usage: Cache County site032 summer subset audited, licensed, bundled, and implemented. Not a leak benchmark. |
| Documented household leak labels | Not established among checked candidates. No leak-performance claims; not proof that no suitable dataset exists anywhere. |
| Northwest Arkansas utility exports | Public-source checks complete, but no representative hourly export/schema verified. Customer upload remains deferred pending consented export evidence. |
| Timezone, DST, and interval ownership | Unresolved. Current source-clock grouping explicitly discloses this; local overnight analysis remains blocked. |
| Minimum valid ML history/coverage | Unvalidated. The 14-day proposal is a hypothesis, not a current requirement or guarantee. |
| ML evaluation and benefit over the rule | No defensible leak-evaluation dataset established. Evaluation design and evidence remain gates for any future ML proposal. |
| Hosting privacy and retention | Platform documentation reviewed; private-upload retention guarantees not verified. No private uploads or public deployment implemented. |
| CAC rules and disclosure | National 2026 rules checked; participant eligibility, authorship, current district instructions, and submission remain to be verified/completed. |

**Next step:** review the implemented sample-only explorer and verify participant-specific CAC requirements before preparing any submission. A future upload proposal would first need one consenting customer's redacted export and documented semantics/privacy behavior. Broader features require evidence and separate approval; this PRD update does not authorize implementation, deployment, or submission. Preserve the notice finder and legacy prototype.
