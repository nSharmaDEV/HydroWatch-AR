# Provider annual report implementation plan

**Goal:** Implement the approved issues-first Provider information panel in Water Alert.
**Architecture:** Exact supplier-ID lookup of manually reviewed annual-report data, separate from live notices. A focused report component renders reviewed, unreviewed and unavailable records; the existing supplier profile retains directory provenance.
**Tech stack:** React, TypeScript, Vitest, Playwright. No new dependencies or backend requests.
**Spec:** User-approved issues-first wireframe in this conversation.

## Constraints
- Only Leisure Hills PWS 747, 2025 is verified. Do not invent provider/year coverage or no-violation findings.
- Preserve all four report rows, dates, reported corrective actions and page-2 links. “Current” is historical source wording, not today's status.
- Keep issues and six directory facts collapsed independently; preserve existing outer disclosure, EN/ES, sample isolation and live notice status.
- Muted amber issues, white/navy/teal existing styling, readable mobile text and 44px controls. No measurement table or safety score.

## Task 1: Reviewed report and provider layout
Files: `water-alert/src/annual-reports.ts`, `water-alert/src/AnnualWaterReport.tsx`, `water-alert/src/SupplierProfile.tsx`, `water-alert/src/styles.css`, `water-alert/tests/annual-report.test.tsx`, `water-alert/tests/reviewed-disclosures.test.tsx`.
- [x] Write failing integration tests: opening Provider information reveals “4 compliance issues reported”; all four issues and six facts initially hidden; expanding each exposes the source links and original facts.
- [x] Run the tests and confirm missing-layout failures.
- [x] Add a discriminated report model and exact-ID reviewed 2025 record; render the summary and independent disclosures. A labeled year selector contains only verified provider/year records (currently 2025).
- [x] Test reviewed empty findings, unreviewed and unavailable states using synthetic records, never add synthetic records to the shipped catalog. Verify selection resets expanded issues and sample/unknown suppliers cannot inherit real findings.
- [x] Run unit tests and production build.

## Task 2: Browser verification and documentation
Files: `water-alert/tests/e2e/journey.spec.ts`, `water-alert/README.md`, `water-alert/CHANGELOG.md`.
- [x] Add guarded EN/ES desktop/mobile checks for collapsed and expanded report/details, source destinations and no overflow.
- [x] Run focused browser cases and inspect rendered desktop/mobile panels.
- [x] Read the diff; update README and dated Unreleased changelog with actual scope, manual review limitations and local-only delivery.

Verified: 304 unit/integration tests and production build; after final disclosure-icon adjustment, 14 focused component tests, 16 focused browser cases and build rerun successfully. Whitespace diff clean. Full browser suite not rerun; no deployment.
