# WAVE content cleanup implementation plan

**Goal:** Apply the approved English/Spanish content cleanup across every WAVE view without changing source, matching, storage or delivery behavior.

**Approach:** Execute inline in the existing dirty checkout; preserve prior work. Use existing small components and native details. No dependencies, backend changes, deployment or push.

## Batches

1. Add failing regression tests for concise state-specific cards, Home/Places/Settings, supplier coverage, history disclosures, notification status and privacy/installation. Run targeted Vitest tests before implementation.
2. Update `src/strings.ts`, `journey-strings.ts`, `supplier-alert-strings.ts`, `components.tsx`, `Journey.tsx`, `ObservedHistory.tsx`, `SupplierAlertHistory.tsx`, `PushPanel.tsx`, `App.tsx` and related detail views. Keep dates, unknown/lift states, official sources, sample separation and recovery safeguards. Add dated local-only changelog entry in this batch.
3. Update affected old copy expectations without weakening safety/action assertions. Run all unit/integration tests with `npm test -- --maxWorkers=1` and `npm run build`.
4. Extend guarded Playwright coverage for English/Spanish mobile/desktop disclosures, status uniqueness, platform-specific installation and deletion cancellation. Run `npm run test:e2e`. Inspect actual local UI with browser tools; no live mutations or real notification sends.
5. Review only this session's edits against the initial checkout snapshot. Update `water-alert/README.md` and `CHANGELOG.md` with actual verification and remaining human/device limits.

## Acceptance gates

- Active, none, unavailable and unchecked states remain distinct; no safety inference or inferred lift.
- One current notification status with visible delivery uncertainty; evidence collapses, actions/retries remain.
- Coverage/catalog identity facts, source semantics, privacy retention/deletion facts and draft safeguards retained.
- Native collapsed observation details retain technical dates, while issue/area/lift uncertainty stays visible.
- Consequences shown before deletion confirmation; failures retain retry credentials/preferences.

## Completed locally — October 18, 2026

All five batches completed inline. Shared concise English/Spanish copy lives in
`water-alert/src/content-strings.ts`; the existing journey/alert string modules remain
intact. Added 15 regression cases and bilingual desktop/phone browser journeys.
Final verification: 265 unit/integration tests, 34 guarded Chromium cases, build
and whitespace checks pass. Run tests/build sequentially to avoid observed resource
timeouts. Reviewed session edits against the pre-edit snapshot and inspected local
sample UI in English mobile and Spanish desktop layouts. README/changelog updated.
No backend, matching, delivery or retention logic changed; no push/deployment.
Human Spanish review and real-device delivery verification remain open.
