# WAVE reference cards implementation plan

**Goal:** Match the supplied active/no-match card references in the existing local app without changing domain behavior.
**Architecture:** Keep `statusFor`, freshness, storage, refresh and notification logic intact. Change only card presentation, shared outline icons and CSS; retain existing native/custom disclosures.
**Stack:** React, TypeScript, Vite, Node 24, Vitest and guarded Playwright Chromium.

## Constraints
- Preserve all pre-existing uncommitted work, branding, navigation, sidebar and desktop column widths.
- Navy #102E43; supporting slate #334F60; existing teal primary with white text. White 16px-radius cards, 24px desktop/20px mobile padding.
- Center panel content; active supplier gets a 56px outline warning beside its two-line copy; no-match gets no icon.
- Equal action columns and 12px gap. Freshness gets a centered dotted leader translated down 2px; timestamp remains left-aligned. Mobile stacks freshness without shrinking text.
- Never promote stale, failed or unchecked evidence to no-match. Keep historical safeguards and all existing journeys.
- Synthetic/intercepted browser data only; no sends, deployment or production changes.

## Execution (inline)
1. [x] Add failing card regressions in `water-alert/tests/wave-redesign.test.tsx` and layout regressions in `water-alert/tests/e2e/journey.spec.ts` for state-specific copy/icons/primary actions, safety qualification, centered content, equal edges and freshness/contact geometry at 320/390/1366px.
2. [x] Update `src/components.tsx`, `src/ProviderContact.tsx`, `src/strings.ts` and the existing final redesign CSS rules. Reuse shared SVG icon conventions. Keep real timestamps/URLs/handlers and accessible contact explanations.
3. [x] Run focused tests, then sequentially `npm test`, `npm run test:e2e`, `npm run build` under Node 24; inspect captured synthetic layouts and keyboard disclosures. Report any failures without relaxing guards/timeouts. Final results: 270 tests and 44 browser cases pass; build passes. Corrected an invalid unchecked test fixture; cleared only the orphaned test Vite process after the initial command timeout. No app timeout settings changed.
4. [x] Update `water-alert/CHANGELOG.md` and the affected README summary with actual local evidence. Review the incremental diff against the initial dirty-file snapshot. Give the user a concise manual test checklist.
