# Provider contact implementation plan

**Goal:** One-tap calling/emailing from supplier cards and details, using verified provider contacts rather than agency contacts.

**Architecture:** A static, provenance-bearing directory keyed by exact parser supplier IDs; a shared React contact section with EN/ES copy. No backend, delivery claims, inferred service areas or new dependencies.

**Scope:** User selected call/email links, not an in-site messaging form. ADH provider directory pages checked October 14, 2026 cover Leisure Hills and the four catalog suppliers. Only Leisure Hills and Rogers have organization email addresses included; individual staff emails are omitted. Directory phone fields are not advertised as 24-hour customer-service lines.

## Task 1 — Provider contact section
- [x] Add failing UI tests in `water-alert/tests/provider-contact.test.tsx`: exact Leisure Hills call/email destinations, source/date, no fabricated links for unknown suppliers, no lake contacts, no real contacts in sample mode, EN/ES, and detail/card integration.
- [x] Run `npm test -- tests/provider-contact.test.tsx` in `water-alert/` and verify missing-feature failures (8 missing-feature failures; 2 existing suppression cases passed).
- [x] Add `src/provider-contacts.ts` and `src/ProviderContact.tsx`; mount before supplier history and in supplier details. Add responsive styles using existing action classes. Pass sample mode from `App.tsx` to details.
- [x] Run focused tests, full `npm test` (183 passing), and `npm run build`. `node tests/browser-provider-contact.mjs` passed at 1280/390/320px in EN/ES; inspected mobile screenshot; no calls/emails initiated.
- [x] Update `water-alert/README.md` and `water-alert/CHANGELOG.md` with coverage, maintenance and local-only verification. Preserve existing uncommitted work; do not commit or deploy.
