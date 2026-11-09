# Approved Help design implementation

**Goal:** Apply the approved `docs/wireframes/wave-help-four-screen.html` design to the active React Help flow, not retained legacy fixtures.

**Constraints:** Current checkout; preserve unrelated edits, EN/ES, draft compatibility, manual email edits, exact evidence and checked contacts. No deployment, real sending, calls or submissions during verification. No storage/API schema changes.

- [x] Add failing integration tests for screen ownership, navigation, contextual fields and review.
- [x] Update `GuidedHelp.tsx`, `RequestStepLayout.tsx`, `help-flow.ts` and `RequestWorkspace.tsx`: clickable steps; equal desktop columns, stacked mobile; actions on step 2 and personal details on step 3. Keep existing step keys/save path. Use existing `wording.response` for optional action details.
- [x] Update `ReviewEmail.tsx` and `SendOptions.tsx`: full editable email, contact sidebar, one primary email-app handoff, secondary copy/call, honest outcome recording, records and tools disclosures. Preserve configured account sending as an explicitly separate optional tool.
- [x] Add scoped `help-four-screen.css` after existing requests styles; do not edit the user's `styles.css` work.
- [x] Update intentional UI assertions, run focused/full tests and build; check actual desktop/mobile rendering with fictional sample data and no real handoffs.
- [x] Update README Help descriptions and dated Unreleased changelog with local verification and deployment limits.

**Local verification:** Build passed. Full unit suite: 803 passed; two unrelated
annual-report disclaimer assertions fail identically on pristine HEAD (English
and Spanish Gurdon cases in `all-supplier-reports.test.tsx`). Targeted Playwright
workspace/save/export checks: 44 passed, including 320/390/640px layouts and
enlarged text. Screenshots inspected for desktop and phone. No deployment or
real recipient/backend handoffs; browser API responses were intercepted fixtures.
