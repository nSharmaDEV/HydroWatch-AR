# AGENTS.md — WellPower: WAVE

This repository's sole active product is **WellPower: WAVE** (Water Advisory
Verification & Empowerment), an independent student water-advisory app for
Arkansas residents. Older unrelated Python prototypes were backed up outside the
repository at the user's request. Do not restore or extend them here.

## Structure and commands

- App: `water-alert/`; React 19 + TypeScript + Vite, Express local API, Vercel
  hosted API, PostgreSQL hosted storage and Cloudflare scheduler.
- Default local storage: ignored `water-alert/data/live/` JSON. Sample records
  remain fictional and separate from live state.
- Node **24.x**. From `water-alert/`: `npm ci`, `npm run dev`, `npm test`,
  `npm run build`. UI port 5178, API port 8788.
- Browser checks: `npx playwright install chromium`, `npm run test:e2e`.
  Synthetic checks are not production/device-delivery verification.
- Keep the `water-alert/` directory and hosting paths stable unless explicitly
  asked to migrate them. Preserve local credentials, data and unfamiliar work.

## Product guardrails

- Only live advisory feeds: ADH boil-water HTML and ADEQ HAB JSON. Preserve exact
  source provenance, agency wording, published dates and freshness information.
- Distinguish active advisory, no active advisory found and data unavailable.
  Absence of a notice is never proof of safety; failure/staleness never means
  all-clear. Retained records are historical, not current status.
- Never infer supplier boundaries from city/county names or mix lake HAB notices
  with tap-water notices. Private wells are outside coverage.
- Disappearance is not an explicit lift. ADEQ `N/A` lift status is unknown;
  synthetic samples must never enter live storage or notification flows.
- Annual-report findings are dated historical document evidence, not current
  safety/compliance assessments. Preserve unresolved and unavailable records.
- No water testing/prediction claims, medical/legal advice, automatic provider
  calls/emails/agency submissions, guaranteed compensation or reliable delivery
  claims without evidence. Do not publish, deploy, send real notifications or
  submit an entry without explicit authorization.
- Preserve English/Spanish behavior, accessibility, privacy/deletion paths and
  honest student/AI disclosures. Mark unverified claims `[NEEDS: …]`.

## Documentation and change history

- Start with root `README.md` and `water-alert/README.md`. Detailed dated evidence
  is in `water-alert/IMPLEMENTATION-NOTES.md`; operational instructions and open
  push gates remain in the app's deployment/push docs.
- Follow `water-alert/AGENTS.md`: every implementation change requires a dated
  entry under Unreleased in `water-alert/CHANGELOG.md` in the same work batch.
  Distinguish local checks from deployed/verified delivery.
- `docs/wireframes/` and `docs/superpowers/plans/` are WAVE design history, not
  shipped UI or present-day capability claims.
- Match existing patterns, preserve provenance and tests, and never overwrite
  unrelated user work. Keep secrets, generated output and tooling captures out
  of tracked project files.
