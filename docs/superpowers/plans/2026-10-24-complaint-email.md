# Complaint Email Consistency Implementation Plan

**Goal:** Make the five-screen WAVE flow produce one accurate, recipient-aware email and secondary resident report from current confirmed answers.

**Architecture:** Keep the existing workspace, recipient directory, fact provenance and persistence paths. Centralize category transitions and draft updates; track subject/body edits separately so untouched generated fields refresh while resident wording is retained. Both outputs share confirmed sections.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright; existing JSON draft storage.

**Spec:** User request in this session, “Rebuild how the existing WellPower: WAVE water-issue flow generates complaint emails.”

## Constraints
- Preserve unrelated uncommitted work, five steps, Map-aligned styling, English/Spanish, private History and fictional sample isolation.
- No deployment, notifications, or agency submission. Only directory recipients and supported delivery methods.
- Official facts remain distinct from resident observations, with dates, status limits and usable citations.

## Tasks (inline execution)
1. Add failing generation and interaction regressions for category switching, recipient changes, conditional details, prose, removed facts and automatic updates versus manual edits. Run targeted Vitest tests and verify expected failures.
2. Implement shared category-transition/draft-update functions and persist manual-edit flags through existing validated draft storage. Apply transitions in the existing choose screen and refresh untouched generated email fields on relevant changes.
3. Improve shared output prose and recipient-aware requests; retain inline numbered references and URLs without ordinary-email internal headings. Add issue-specific requests and quality frequency while preserving existing wording keys.
4. Remove the Report tab; leave one composer, attachments, signature, expandable sources, downloads and official contact options. Keep layout responsive.
5. Run targeted and full unit tests, production build and synthetic desktop/mobile browser checks. Inspect the running UI at 1280×800. Update README/help documentation and dated Unreleased changelog with actual local evidence only.

## ADH guidance reviewed October 24, 2026
- Public Water System FAQs: https://healthy.arkansas.gov/programs-services/public-health-safety/drinking-water-safety/public-water-system-faqs/ — quality monitoring responsibilities; persistent aesthetic concerns first discussed with system management/governing body. Do not generalize aesthetic guidance into safety conclusions.
- Safe Water / Engineering contact: https://healthy.arkansas.gov/programs-services/licensing-military-member-licensure-permits-plan-reviews/drinking-water-plan-review — 501-661-2623 and district responsibilities. Existing external-only ADH route remains unchanged; request guidance/review rather than promise enforcement, testing or investigation.

## Local verification — October 24, 2026
- Completed all five implementation tasks inline. Regression tests were observed
  failing before generation/state fixes, including a resumed untouched email that
  incorrectly retained current-record wording after its facts became saved records.
- `npm run build`: passed TypeScript and Vite; existing >500 kB bundle warning remains.
- Final `npm test`: 582 passed, nine unrelated baseline failures in App, journey,
  all-supplier-reports, provider-contact and wave-redesign tests. Complaint-flow,
  validated storage, provenance and manual-edit regression suites passed.
- `npx playwright test tests/e2e/help-workspace.spec.ts tests/e2e/saved-help.spec.ts`:
  84 passed. English/Spanish, all categories, active/no-active fixture contexts,
  1280×800 and 1440×780 panels, 320/390/640 widths, enlarged fonts, attachments,
  History and manual edits. An observed quality-step height regression was fixed
  by placing optional frequency in the details panel; assertions were not relaxed.
- After the resume-status fix, saved-help browser tests passed again (four cases).
  Browser-panel desktop/mobile sample composer captures were visually inspected;
  captures are ignored tooling output, not shipped assets.
- `git diff --check` passed. README and Unreleased changelog updated. All browser
  APIs were synthetic/intercepted or sample-only; no deployment or real send.
