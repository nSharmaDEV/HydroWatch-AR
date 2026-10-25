# Advisory map workspace implementation plan

**Goal:** Implement the user-approved compact History redesign in the current checkout, inline without delegation.

**Architecture:** ObservedHistory becomes the advisory-map entry point. ObservedSupplierMap owns ephemeral search, scope, status, view, selection and map position. Reuse existing status logic, observation/date/source components and exact supplier matching; keep geometry/location evidence unchanged. Keep the visited workspace mounted but hidden during in-app navigation, resetting on live/sample changes.

**Design:** Existing system typography; navy #102e43, teal #087f83, light teal #e9f3f3, white #ffffff, divider #dce3e9, active red #bc2836. One white desktop workspace, 65% map / 35% internally scrolling results or details. Left-aligned heading and toolbar. Mobile Map/List tabs and native modal bottom sheet, not columns. Short/enlarged layouts may scroll naturally.

**Constraints:** No new feeds, inferred boundaries, invented coordinates, real sends, deployment or live-storage test writes. Preserve unrelated dirty work, source wording/dates, bilingual controls, unknown/stale states and explicit-lift semantics.

## 1. Workspace behavior (test first)
- [x] Replace obsolete map/card-switch expectations with tests for compact heading/info, one shared results list, scope/status/search parity, local marker/row details, unmapped suppliers, preserved selection and source freshness.
- [x] Run `npm test -- tests/observed-map.test.tsx` and verify expected failures.
- [x] Implement `ObservedHistory.tsx`, `ObservedSupplierMap.tsx`, focused `MapSupplierDetails.tsx`, bilingual `map-strings.ts`, and Sources-only `MapSources.tsx`. Reuse exact status/matching and existing date/provenance components.
- [x] Wire Sources navigation and preserved workspace in `App.tsx`; do not modify header/nav or unrelated Home/help behavior.
- [x] Run targeted map/history tests, then production build.

## 2. Responsive interaction (test first)
- [x] Replace `tests/e2e/observed-map.spec.ts` with intercepted GET-only journeys including disabled push config. Exercise 1280×700, 1440×780, mobile, keyboard, internal scrolling, filters, selection parity, back context, map position, unmapped states, and enlarged text. Fresh/stale/error/unknown status coverage remains in unit tests.
- [x] Verify layout tests fail before adding workspace sizing in `observed-map.css`.
- [x] Implement scoped CSS, drag/keyboard pan, mobile tabs, native dialog dismissal/focus/scrolling; verify browser journeys and inspect rendered UI.

## 3. Verification and documentation
- [x] Run targeted suites, full unit suite with two workers, and production build under Node 24. Report existing unrelated failures rather than restoring removed copy.
- [x] Review actual diffs; update only affected README sections and append a dated Unreleased changelog entry with actual local check results. No commit/deployment requested.

Local result: 42 targeted map/coverage/content tests plus two targeted history journeys pass; four browser checks pass (two desktop-only phone-project skips); build passes. Full unit suite: 508 pass / nine existing unrelated failures. No deployment or sends.
