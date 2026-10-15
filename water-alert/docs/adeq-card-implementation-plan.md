# ADEQ advisory-card implementation plan — 2026-10-14

Goal: implement the approved `docs/card-proposal.html` without illustrative evidence or changes to delivery, ADH, deployment or sample isolation.

Architecture: retain parser/domain/store semantics. Bundle verified English ADEQ text and contacts in a static provenance module; reuse one guidance panel in details and history. Keep home copy short and agency/app date rows distinct.

1. Add UI regression tests in `tests/adeq-cards.test.tsx` for EN/ES unknown copy, history/detail provenance, missing fields, guidance quotation labeling and concise home cards. Run them red before implementation.
2. Add parser/domain/store regressions for blank, N/A and dated lift values, no unknown events, and agency versus app timestamps. Existing semantics should remain green.
3. Implement bundled guidance, reusable panel, localized labels, and surgical card changes. Reuse existing typography, neutral unknown status, purple HAB and teal quotation accent. History uses stacked agency/app facts; mobile remains single-column. No fabricated dates/counts; bounded checks cannot establish lifetime counts.
4. Run targeted tests, then `npm test -- --maxWorkers=2` and `npm run build`. Use mocked local browser journeys at desktop/390/320 widths in EN/ES; inspect running history, current advisory and guidance, with no real sends or private configuration access.
5. Update README, fixture semantics and dated Unreleased changelog with actual local results. Keep official N/A/asterisk meaning and empty-feed schema gates open.
