# Source-check history implementation plan

**Goal:** Implement the approved Water Alert historical-result panel and collapsed check timeline in this checkout.
**Architecture:** Add bounded, durable feed-check evidence to source snapshots in the shared ObservationStore (local atomic JSON and PostgreSQL JSONB). Project place results using existing matching, independently of current freshness. Use native accessible disclosures and existing visual tokens.
**Spec:** User's approved last-known-result design in this session.
**Constraints:** Preserve three current states, parser fail-closed rules, explicit-lift events, sample isolation and notification behavior. No deployment, hosted mutation, notification sending or new worktree. Preserve existing user changes.

## 1. Durable check evidence
- [x] Add failing local tests for success, failure, restart, bounded retention and legacy archives without invented history; run with `npm test -- tests/source-check-store.test.ts`.
- [x] Add optional typed source-check journal and last-success evidence to `src/domain.ts`; persist actual outcomes in `server/store.ts` on success/failure. Keep complete successful feed snapshots for exact place matching; no archive backfill. Bound each agency to 64 checks within 30 days and a 1 MB journal budget (newest complete check always retained), plus one last-success snapshot.
- [x] Verify PostgreSQL cold-start persistence and API parity in `tests/postgres.test.ts` and `tests/api.test.ts`. Existing JSONB state schema/grants need no SQL migration. Normalize absent fields on both file reads and shared transactional writes.

## 2. Place projection and card UI
- [x] Add failing projection/UI tests for supplier no-match, historical active/unknown/lifted records, stale/offline/never-checked states and grouping boundaries.
- [x] Create `src/source-checks.ts` for pure place projection and consecutive grouping, and `src/SourceCheckHistory.tsx` for last success, latest attempt and progressive timeline. Successful no-match requires retained complete successful evidence, never an absent notice archive.
- [x] Integrate with `src/components.tsx` StatusCard, keep current unavailable primary and neutral gray, provide official advisory-list button and separate coverage disclosure. Keep active-notice journey controls unchanged.
- [x] Add EN/ES text, responsive styles and fictional sample checks. Native details start closed; repeated consecutive outcomes group only when place-specific evidence is identical, and preserve actual individual checks/count/time range.

## 3. Verification and documentation
- [x] Run all Vitest tests and `npm run build`; inspect diff and update `water-alert/CHANGELOG.md`, README storage/retention/API notes.
- [x] Exercise running UI with isolated mocked check evidence at desktop/mobile in EN/ES; verify keyboard disclosures, official links, progressive history and no overflow. User subsequently requested local server restart: both servers restarted with push disabled; both agency startup checks succeeded and retained their evidence.
- [x] Report actual local results and hosted/device/human-language limitations, not deployment proof.
