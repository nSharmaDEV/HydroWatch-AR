# Supportive resident help implementation plan

**Goal:** Implement the approved resident-friendly Your issue → Review → Send brief in the current checkout.

**Architecture:** Keep existing private draft storage and delivery machinery. Store optional structured citations beside editable natural-language source context in the existing JSON draft; preserve legacy drafts without migration or automatic rewriting. Snapshot citations with outgoing messages. Use exact-provider advisory matching and opt-in dated annual-report evidence.

**Constraints:** No worktree, deployment, provisioning, real sends or submissions. Preserve unrelated dirty/concurrent changes and all Map code. Node 24; synthetic tests only. Preserve English/Spanish, sample isolation, ownership, autosave, immutable sends and explicit regeneration.

**Design:** Reuse WAVE navy #102e43, teal #087f83, white #ffffff, border #dce3e9 and muted #354f60, existing typography and Map outer geometry. Within that aligned shell use a readable 48rem task column, quiet notice summary and compact wrapping issue choices. Normal scrolling, no sticky obstruction.

```text
Map-aligned shell
  Back                                      Saved
  Your issue / Review / Send
  What do you need help with? + supplier
  [Advisory] [Bill] [Service] [Quality] [Other]
  Compact notice + source / edit included facts
  How is this affecting you?
  Relevant short questions + optional desired response
  > Add dates or a photo (optional)
  Review message
```

## Task 1: Natural messages and structured provenance
- [x] First add failing domain/store tests: exact supplier matching, no raw URLs/log labels, honest historical/unknown status, Spanish, missing facts, citation persistence/validation and immutable snapshots.
- [x] Implement `help-facts.ts`, `help-requests.ts`, new historical message helper in `recovery-evidence.ts`, bounded optional metadata in `server/help-store.ts`. Keep old `reportAppendix` consumers unchanged.
- [x] Run targeted help tests under Node 24.

## Task 2: Supportive existing workspace
- [x] First update/add failing workspace tests for choice buttons, one resident textarea, collapsed optional dates/files, editable/removable facts, separate citations, saved edits and sample safeguards.
- [x] Modify `RequestWorkspace.tsx`, `IssueQuestions.tsx`, `help-questions.ts`, `RequestSources.tsx`, scoped `requests.css`; add citation display to existing request History only. Preserve auth/save/send code.
- [x] Run targeted unit tests; inspect actual diff before updating README, HELP-REQUESTS and dated Unreleased changelog.

## Task 3: Synthetic acceptance verification
- [x] Update `tests/e2e/help-workspace.spec.ts` and `saved-help.spec.ts` to assert natural prose and external citations rather than raw logs. Cover 1280×800 Map alignment, en/es, 320/390/640px and 200% text; fact edits/removal and reload preservation; optional disclosure and disabled sends.
- [x] Run synthetic Playwright matrix, production build and full unit suite; distinguish known unrelated failures from regressions. Inspect rendered local synthetic UI. Record precise results in affected docs without claiming production delivery.

Execute inline in this user-requested session; do not commit unrelated work.

## Approved wireframe follow-through

- [x] Confirm missing behavior with failing domain/workspace tests: separate problem
  points, distinguishable notice citations, full billing follow-ups in both languages,
  and no current-status heading inferred for saved draft text.
- [x] Restore the existing charge/prior-attempt answer controls (no new storage keys),
  format published problems as separate points, identify citations by published date
  and area, and use a neutral included-details heading for editable saved context.
- [x] Run targeted units, synthetic desktop/mobile browser matrix and build; update
  affected usage documentation and the dated changelog. Keep all existing save/send
  machinery, Map code and unrelated changes untouched.
