# Supplier alert history implementation plan

**Goal:** Replace the supplier card’s primary technical history with retained official notices, without manufacturing earlier advisories.

**Architecture:** Pass the existing durable `archive` to supplier cards. A focused `SupplierAlertHistory` component projects exact ADH/system/source matches and keeps agency text separate from app observations. Existing `SourceCheckHistory` remains the technical journal, collapsed as Data-source activity. Work inline in this checkout; no delegation, commits, deployment or live mutations.

**Constraints:** Preserve dirty work, ADEQ presentation, fail-closed current status, bounded check retention, EN/ES, keyboard controls and compact card layout. Missing notice fields say “Not provided in the source.” Disappearance is never a lift. ADH guidance is quoted only if retained with its source reference.

## Tasks
- [x] Add focused UI regressions for archive matching, active/lifted/unconfirmed notices, missing fields, failure and empty/legacy history. Run them red before implementation.
- [x] Add a store regression for source-specific history-start evidence, retained notices across disappearance/failure and explicit lifts. Run red; add optional `SourceSnapshot.historyStartedAt` only on a first genuine success, without guessing legacy coverage.
- [x] Implement `SupplierAlertHistory.tsx`; wire `App.tsx` archive into `StatusCard`; retain compact default current finding/time/limitation/source. Move last-success evidence and retention details into collapsed Data-source activity on card/details, not alert events.
- [x] Update affected existing UI/browser expectations, run `npm test -- --maxWorkers=2` and `npm run build`; run intercepted browser checks on the existing UI at port 5178, reviewing desktop/mobile EN/ES.
- [x] Review diff; update README behavior and dated Unreleased changelog with actual local verification and remaining provenance limitations.

**Local verification:** 161 tests pass with two workers; production build passes. Intercepted advisory browser checks cover six states at 1440/390/320px in EN/ES; source activity, ADEQ, catalog and journey browser regressions pass. Desktop/mobile screenshots were reviewed. A full-suite run concurrent with browsers hit two database-test timeouts; the bounded-worker rerun passed without changing timeouts. No live API requests, deployment, saved-record edits or real notifications occurred. ADH guidance remains a provenance gap, displayed as missing rather than manufactured.
