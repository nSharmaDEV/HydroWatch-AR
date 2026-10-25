# Two-column Review implementation plan

**Goal:** Apply the supplied 35/65 Review wireframe without replacing WAVE's draft,
recipient, source, storage or delivery paths.

1. Add failing regression tests for grouped Review information and edit navigation,
   structured record persistence, readable dates and the October 9/14 chronology.
2. Add bounded optional source-record metadata to existing facts; preserve legacy
   prose and quotations, historical years and saved/current distinctions.
3. Extract Review into a focused component with information above email in DOM
   order, 35/65 desktop columns, file/signature tools on the left, source references
   and explicit regeneration on the right. Reset editor scroll only on entry.
4. Improve generated prose/subject using confirmed observations and requests;
   distinguish source-recorded status from current verification and ask about
   possible relationships instead of asserting causality.
5. Run focused/full tests, build, synthetic browser checks at 1280×800 and mobile;
   inspect actual rendering. Update README and dated Unreleased changelog.

No deployments, real emails or notifications. Desktop Review must fit without
page scrolling; mobile may use natural vertical scrolling. Do not weaken
no-horizontal-overflow or text/control checks.

## Local verification — October 24, 2026

- Build: TypeScript and Vite passed; existing large-bundle warning remains.
- Compact Review-focused suites passed (58 tests); the active-help suite passed
  separately (15 tests). Final full suite: 592 passed, 9 failed, 601 total; the nine
  failures are the pre-existing unrelated notification, historical-report,
  provider-matching and missing-email tests.
- Playwright: all 84 workspace and saved-History checks passed, including desktop
  1280×800 no-page-scroll and 1440×780, English/Spanish, categories, sample notices,
  mobile stacking and draft/history interactions. Desktop and mobile captures were
  inspected; capture files are ignored tooling artifacts.
- Browser checks use fictional fixtures and a UI-only server; they do not verify
  production data, delivery, or agency receipt. No live email or notification sent.
- README and dated Unreleased changelog updated. `git diff --check` passed.
