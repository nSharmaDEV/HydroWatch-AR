# Compact Get help workspace implementation plan

**Goal:** Keep directions and the work area side by side throughout Get help, with the default desktop workflow visible at 1280 × 700.

**Architecture:** Preserve the active four-task and general five-step flows and their mounted draft state. Share a two-column workspace, concise bilingual labels and exact-supplier historical evidence selection. Do not change advisory status, storage or submission behavior.

**Tech stack:** Existing React 19, TypeScript, CSS, Vitest and Playwright; no new dependencies.

**Spec:** User-approved conversation: directions/checklist on the left, drafts/requirements on the right; relevant provider issues selectable with source/date; one-screen default on a 13-inch Mac; mobile and enlarged text may scroll.

## Constraints
- Preserve all existing worktree edits, English/Spanish controls, privacy warnings and explicit sending attestation.
- Historical findings remain opt-in, exact-supplier, dated and separate from current status; never use real evidence in samples.
- No deployment, notification, filing or automatic sending.
- Long drafts may scroll; expanded supplementary guidance and zoom must remain reachable without clipping.

## Tasks (execute inline)
- [x] Add failing unit coverage for labelled guidance/work regions on every active/general step and general-guide evidence in copy/download output. Add synthetic browser checks at 1280 × 700 in both languages and guide modes, plus narrow and enlarged-text checks.
- [x] Add `src/HelpWorkspace.tsx` and shared evidence controls; update `src/HelpGuide.tsx` and `src/ActiveHelpGuide.tsx` to place guidance left and choices/editor/records right. Keep one editor mounted across navigation.
- [x] Compact guided `src/RecoveryActions.tsx` without repeating privacy/session instructions; retain visible replace-placeholder requirements, copy/download and optional appendix preview. Add responsive CSS in `src/styles.css`, preserving normal document flow on mobile/zoom.
- [x] Run targeted unit/browser checks and build, inspect the running UI, then run the full unit suite. Update `water-alert/README.md` and dated Unreleased changelog with actual results and limitations.

**Results:** 27 targeted unit tests and 24 targeted browser checks pass; build passes. Full unit run: 483 pass and four failures outside help (annual-report historical-disclaimer and provider missing-email expectations). Full browser suite not rerun. Local only; no deployment or sending.

## Verification commands
From `water-alert/`: `npm test -- tests/help-workspace.test.tsx tests/active-help.test.tsx tests/help-redesign.test.tsx`; `npm run test:e2e -- tests/e2e/help-workspace.spec.ts --project=desktop`; `npm run build`; `npm test`.
