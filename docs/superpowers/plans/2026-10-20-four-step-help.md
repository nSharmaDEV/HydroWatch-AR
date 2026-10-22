# Four-step advisory help implementation plan

**Goal:** Implement the approved Contact → Prepare → Send & record → Follow up
wireframes for current active ADH supplier advisories without changing the existing
five-step non-active guide.

**Architecture:** `HelpGuide` selects an isolated `ActiveHelpGuide` using an
explicit current-status prop supplied by `App`. The active guide reuses verified
contacts, CDC reference guidance and the existing mounted draft engine. Progress,
sending records and responses remain component memory; nothing is sent or stored
on the server. Source appendices use only exact-supplier reviewed historical data.

**Stack:** Existing React 19, TypeScript, Vitest and Playwright; no dependencies.
**Spec:** `docs/wireframes/wave-help-process-comparison.html` and the approved
four-step ASCII proposal in this conversation.

## Constraints

- Do not deploy, submit complaints, send notifications or alter live storage.
- English/Spanish controls; original English agency text stays identified.
- Do not equate user progress with advisory safety, agency review or delivery.
- Stale/error/historical records cannot select the active-advisory experience.
- No invented rule citations, inferred supplier mapping or sample/live mixing.
- Keep drafts mounted across task/reference navigation. Explain loss on exit/reset.

## Execution (inline, test-first)

1. Add `tests/active-help.test.tsx` exercising four steps, explicit reversible
   progress, sending validation, response versus closure, deletion, language,
   sample suppression, draft retention and historical evidence. Run
   `npm test -- tests/active-help.test.tsx` and verify missing progress fails.
2. Add `src/ActiveHelpGuide.tsx` and `src/active-help-strings.ts`. Reuse
   `ProviderContact`, `BoilWaterGuidance`, `RecoveryActions` and official resource
   links. Use local state for step, completion flags and a single user record;
   validate confirmed sending with a real nonfuture calendar date, require a
   summary for response recording and require a sent record for closure.
3. Add tested `src/recovery-evidence.ts` for exact-ID reviewed report selection
   and dated English source appendices; preserve unreviewed/unavailable notices.
   Extend `RecoveryActions` with optional appendix and selected-template callback.
   Export/copy/email the appendix without rewriting user text or agency wording.
4. Wire `HelpGuide`/`App` using explicit fresh active status and exact linked-notice
   matching. Add integration tests for active, none, unavailable and historical
   states. Preserve all existing five-step tests.
5. Add responsive progress styles in `src/styles.css`, and browser coverage for
   both languages at 1440/390/320px. Update the existing active-sample formatting
   expectations to four steps; retain non-active unit coverage.
6. Run targeted tests, `npm test`, `npm run build`, and the help browser specs.
   Record actual results and limitations in `water-alert/CHANGELOG.md`; update
   privacy/lifetime and help behavior in the root and app READMEs. No deployment.
