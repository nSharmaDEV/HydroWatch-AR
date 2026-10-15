# My Water approved mockup implementation plan

**Goal:** Match the approved supplier-card/sidebar mockup while preserving saved records.
**Architecture:** Reuse StatusCard and existing advisory/check history. Native modal dialog provides focus containment. No API/storage changes.
**Stack:** React, TypeScript, Vite, Vitest, Playwright.
**Spec:** User's attached My Water mockup and requirements, October 14, 2026.

## Constraints and design
- Preserve existing uncommitted work, actual supplier/notice fields, verbatim agency dates and separately labelled app timestamps.
- Retain Avenir typography and navy #172e46, teal #087f83, muted #536579, line #dce3e9 and white #ffffff palette.
- White content-height card, flexible dotted leaders, right-aligned values and one left disclosure chevron. Unboxed sidebar has vertical/horizontal separators and stacks on mobile.
- No invented delivery confirmation, notice fields, history or timestamps; keep sample labels.

## Inline execution
1. Add meaningful popup/metadata tests in `water-alert/tests/supplier-info.test.tsx`; run red. Native dialog shims belong only in test setup. Adapt source-check tests to open the popup.
2. Update `components.tsx`, supplier strings, `SupplierAlertHistory.tsx`, `App.tsx` and styles. Native close/cancel restores trigger focus. Keep unavailable explanations/historical labels visible; move instructions, check times and logs into popup.
3. Run Vitest/build and browser journeys; verify Enter/Space, Escape, focus return, expansion, wrapping and overflow at laptop/mobile widths. Inspect captured screenshots with saved live observations and intercepted synthetic edge cases.
4. Verify diff; update affected README usage and required dated Unreleased changelog. No commits, deployment or real alert sends requested.
