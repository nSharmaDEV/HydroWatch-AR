# CAC preparation — sample-only explorer

Status: rules reviewed October 9, 2026; preparation draft, **not eligibility clearance or a submitted entry**. This packet covers `sample_app.py`. The notice-finder path in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) remains intact; the participant must choose the actual entry before recording. Do not combine unrelated apps merely to imply more implemented functionality.

## 1. Official requirements and pending verification

Authority: [complete 2026 rules](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf), [student rules](https://www.congressionalappchallenge.us/students/rules/), [participating districts](https://www.congressionalappchallenge.us/students/participating-districts/), and [registration](https://www.congressionalappchallenge.us/students/student-registration/). The complete PDF and the rules/district pages were rechecked for this review.

| Requirement | Review result / participant action |
| --- | --- |
| Deadline | October 26, 2026, **noon EDT / 11 a.m. Arkansas CDT**. Submit early enough to resolve portal issues. |
| Participating district | AR-03 / Steve Womack is listed. This does not verify the student's residence or school district. |
| Enrollment/residency | Confirm middle/high-school enrollment on October 26 and U.S. residency at submission; citizenship is not required by the student rules page. |
| Individual/team | Up to four students; at least half of a team must live or attend school in the chosen district. One entry per student, one district. Confirm every teammate. |
| Creation dates | App created after October 30, 2025; an older project's 2.0 entry highlights only new coding. Verify actual project history, not just file modification dates. |
| Originality and AI | All coding/technical development must be by the student/team; external tools are allowed with documentation, significant personal effort and understanding. AI may support specific aspects, not the entirety of technical development; fully disclose all usage. Compliance remains unresolved here. |
| Working functionality | Demonstrate the implemented sample explorer. No national requirement for ML or a hosted URL was found. Judges may request working app/source access; prepare a reproducible handoff. |
| Registration | Personal, non-school email; profile and eligibility quiz; team invitations if applicable. Enter requested addresses and parent/guardian details only in the official portal, not this repository or chat. |
| District instructions | [Womack's page](https://womack.house.gov/constituentservices/app-challenge.htm) still shows a 2025 deadline and 2024 rules link. Current additional instructions are unverified. Public contact: Chris Bader, 479-424-1146. No office contact has been made. |
| Video | 1–3 minutes, maximum three; every participant's name, app name, clear one-sentence purpose, audience, languages/tools and working functionality. YouTube or Vimeo link must be **public**. |
| Submission | Follow actual portal questions; save confirmation and the submitted source/materials. After the deadline, every team member completes the exit questionnaire. Portal completion has not been inspected or performed. |

## 2. Student contribution and AI disclosure — blocking review

**Do not claim “I coded everything” or describe this assistance as spelling-only.** In this conversation the coding agent generated substantial technical work: `sample_data.py`, `sample_app.py`, sample tests, fixture extraction/packaging, dependency files, layout/copy refinements, and documentation. It also researched sources and executed verification. The user directed scope, approved choices and supplied UI feedback; those actions alone do not establish independent student coding contributions. Work performed outside this conversation is unknown.

The rules do not specify a percentage threshold for student contributions. Reading generated code, narrating it, or adding cosmetic edits must not be presented as proof of compliance. Document real contributions and seek clarification from CAC/the district office if the AI-assisted authorship boundary is uncertain. Do not hide assistance or manufacture a retroactive contribution history.

### Disclosure draft — factual starting point, not a compliance certification

> I used an OpenAI coding agent through OpenCode/OpenChamber for dataset research, technical planning, Python implementation, fixture preparation, automated tests, UI refinements and documentation of the sample explorer. The agent generated substantial code and tests. I directed the scope and reviewed the interface. My independently completed technical contributions are described separately with evidence. The app uses Python, Streamlit, pandas and Altair; development tests use pytest and Streamlit AppTest. Recorded data comes from the Cache County dataset by Bastidas Pacheco, Atallah and Horsburgh (2023), licensed CC BY 4.0, with the subset and transformations documented in `data/README.md`.

Use this draft only after checking it against the full project/tool history. Identify additional AI tools, human help and earlier prototype assistance, if any. Student contributions must be supplied by the participant; none are invented here. If submitting another entry point, its technical history needs its own review. Do not claim the app runs an AI leak model: AI-assisted development is different from runtime ML, which this explorer does not implement.

### Evidence needed from each student

- Identify independently authored technical work by file/function and explain exactly what was written or changed, when, and what assistance was used.
- Provide existing commits, drafts, notes or another truthful development record; preserve provenance instead of rewriting history.
- Explain pulse conversion, timestamp-hour grouping, partial edges, missing versus zero readings, fixture verification and relevant tests in their own words. Understanding is necessary but is not a substitute for student contributions.
- Describe personal inspiration, difficulties and learning truthfully. Do not attribute the agent's debugging/research experience to a student.
- Confirm whether the participant is the student, a parent/guardian, or a mentor; identify the actual entrant/team without putting private eligibility records in source control.

## 3. Demo outline — approximately 2 minutes 35 seconds

This is a recording plan, not a generated/recorded video. Student introductions, personal contributions and experiences require truthful participant input. Resolve the authorship review before finalizing submission wording.

| Time | Screen/action | Suggested factual narration |
| --- | --- | --- |
| 0:00–0:20 | App title and persistent sample notice; student introduces every participant | “This is HydroWatch AR, an educational prototype for Northwest Arkansas residents. It demonstrates water-use interpretation using a public Utah sample and connects residents to official local utility guidance.” This is intended usefulness, not a demonstrated local outcome. |
| 0:20–0:45 | Usage tab, entire sample; point to top metrics | “These are measured readings from one Utah household in August 2020, not my meter or a live Arkansas feed. The whole sample contains 345,491 observations and about 14,512.53 recorded gallons.” |
| 0:45–1:10 | Select `2020-08-13`; hover over a bar | “Each bar sums pulse-derived gallons by the recorded timestamp hour. Selecting a day changes the chart and table, but the top totals still cover the whole sample. Colors describe coverage, not risk.” |
| 1:10–1:40 | Select `2020-08-12`, then Coverage; show first partial row | “At four-second cadence, a full hour has 900 observations. The first and last groups are partial. A recorded zero is not missing data: check the count and value rather than whether a bar is visible.” Do not claim this fixture contains an interior missing hour; it has none. |
| 1:40–2:00 | Source & guidance tab; show the provider selector and source limitations | “Choose the provider on your bill for official help in Fayetteville, Rogers, Bentonville or Springdale. This does not connect your account or change the Utah sample. Its clock semantics are unverified; this app does not detect leaks.” Keep CC BY 4.0 attribution visible, and retain the fuller limitations in submission materials. |
| 2:00–2:25 | Return to app or show a readable source/test excerpt chosen by the student | State Python, Streamlit, pandas and Altair; disclose substantial AI coding assistance and describe only actual independently completed student technical work. Do not record a claim of student authorship before it is verified. |
| 2:25–2:35 | App with sample notice visible | “The working version explores a bundled public sample. Personal uploads, live meters and leak classification are not implemented.” |

### Recording checks

- Run the separate explorer using the verified [README instructions](README.md); keep `notice_app.py` and legacy `app.py` unchanged. Review the actual screen before recording.
- Keep text readable at normal playback, with the sample notice visible at introduction and no private browser tabs, notifications, addresses, credentials or account details on screen.
- Rehearse day selection, hover and Coverage first. Use the real working app, not a mockup, fabricated alert or future-feature animation.
- Recheck the script against the running app. Software test counts establish regression checks, not leak accuracy or user comprehension.
- Retain data attribution, license and transformation details in the shared source; mention the source in the video. No endorsement by source authors or utilities is implied.
- Measure final duration, check audio and text, upload to YouTube/Vimeo **publicly**, and test the link while signed out. No upload or publication has been authorized or performed by this review.
- Public hosting is optional. A bundled public sample does not justify a “zero telemetry” or “100% on-device” platform-wide privacy claim.

## 4. Preparation status and next actions

- [x] Recheck national rules and AR-03 participation against primary sources.
- [x] Prepare a truthful AI-assistance starting draft and identify the student-contribution gate.
- [x] Prepare a demo outline limited to implemented explorer features.
- [ ] Confirm actual entrant/team, enrollment, residency, district, entry count and project dates.
- [ ] Document independent student technical contributions and full assistance history; resolve uncertain compliance with the organizers.
- [ ] Confirm current district-specific instructions and registration/portal requirements.
- [ ] Choose the actual submission entry point; this packet does not supersede the notice-finder selection in the existing checklist.
- [ ] Complete the first-time-viewer check in [PRD.md](PRD.md), recording actual feedback.
- [ ] Rehearse, record, review, publicly upload and test the demo link.
- [ ] Complete submission, preserve confirmation/source version, and later complete the exit questionnaire.

**Next decision:** verify student authorship and eligibility before claiming submission readiness. No code change, deployment, recording, publication or submission is part of this review.
