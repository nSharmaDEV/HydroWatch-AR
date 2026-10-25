# Guided Help Implementation Plan

**Goal:** Replace the dense help workspace with a supplier-specific, accessible guided path in the current checkout.

**Architecture:** Retain the existing three persisted delivery stages for compatibility, adding an optional guided screen key. Store editable, attributed facts alongside existing context and source metadata; old drafts remain readable and edited email bodies are never regenerated silently.

**Tech Stack:** Existing React/TypeScript, local/hosted help API and Vitest/Playwright on Node 24.

**Spec:** User's October 23 guided-flow request in this session (Choose → experience → relevant records only → editable email → confirm).

## Constraints

- Preserve concurrent work, supplier matching, sample/live separation, authorization, autosave, history and delivery gates. No deployment, provisioning, migrations or real sends.
- Match Map's existing shell. Typical 1280×800 desktop path fits without shrinking controls; mobile/enlarged text scrolls naturally. Only final desktop preview has internal scrolling.
- Stored source prose is not a new current-status check. Historical report evidence stays dated and opt-in.

## Work units (execute inline)

1. Add failing unit coverage for dynamic screen paths, relevant fields, per-fact edit/removal and persistence, and backwards-compatible validation. Files: `tests/request-workspace.test.tsx`, `tests/help-requests.test.ts`, new focused `tests/help-flow.test.ts`.
2. Add bounded optional `flowStep`/`facts` metadata to `src/help-requests.ts` and `server/help-store.ts`. Implement path and exact-supplier record adaptation in `src/help-flow.ts`; test skipped records and legacy drafts before wiring UI.
3. Replace workspace presentation in `src/RequestWorkspace.tsx`, retaining save/send machinery. Reuse `IssueQuestions`, existing fact/report adapters, `RequestSources`, guidance and upload controls. Split billing into two screens. Add scoped guided layout in `src/requests.css` and quality location using the existing `area` answer key.
4. Adapt existing help integration/browser journeys to screen navigation, asserting Map alignment, viewport fit, focus, mobile/enlarged-text overflow, full final preview, preserved edits, attribution and disabled unsupported sending. Run targeted tests and build, then full units; distinguish known unrelated failures.
5. Update `water-alert/README.md`, `HELP-REQUESTS.md` and dated Unreleased changelog with actual behavior and verified results. Inspect desktop/mobile captures; do not claim device delivery.

## Local completion evidence

- Implemented inline in the original checkout; existing supplier, draft, History,
  attachment, account and send machinery retained. No deployment or real sending.
- Node 24 build and 62 targeted help checks pass. The 84-case synthetic browser
  matrix covers both languages, category paths, saved edits, viewport fit, mobile
  reflow and an internally scrollable long final preview; captures were inspected.
- Full units: 546 passing, nine previously identified unrelated notification,
  provider-contact and annual-report expectations failing. Usage docs and the
  dated Unreleased changelog describe the guided flow rather than the superseded
  two-column presentation.
