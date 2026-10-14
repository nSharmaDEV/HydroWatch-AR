# Water Alert implementation plan

Goal: isolated resident advisory app in this worktree only. The user's October 13 brief supersedes old wireframe styling and unsupported Goal claims. Inline implementation; no delegation, accounts, worktrees, publishing or submission.

## Architecture and design

React/TypeScript/Vite client; small Node localhost proxy with fixed ADH/ADEQ URLs. Domain logic shared within this project only. Recorded fixtures verify strict parsers. Live observations persist in `data/live/`; deterministic samples live in `src/sample.ts`, with separate browser preference keys. No prior-app imports.

Palette: white #ffffff, light gray #f4f6f8, navy #172e46, teal #087f83, orange #a74513, purple #6941a5. System sans typography for public-service legibility; left-aligned content, generous touch targets, quiet cards. Mobile bottom navigation; desktop top navigation and two-column detail. No map implies unverified coverage.

## Testable deliverables

1. Scaffold package/config; write domain tests, run red, implement three states, strict expiry, disappearance-not-lift, explicit supplier selection and physically isolated preference storage; run green.
   Files: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/domain.ts`, `src/sample.ts`, `src/storage.ts`, `tests/domain.test.ts`.
2. Write journey tests, run red, implement setup/home/detail/browse/history/settings, inline guidance gap or verified source text, EN/ES, sample banner and disconnected alerts; run green and production build.
   Files: `src/App.tsx`, `src/strings.ts`, `src/styles.css`, `src/main.tsx`, `tests/App.test.tsx`.
3. Record the two approved feeds; write parser and observation tests, run red, implement independent proxy retrieval, source-shape failures, bounded freshness and local archive; run green.
   Files: `tests/fixtures/`, `server/parsers.ts`, `server/store.ts`, `server/index.ts`, `tests/parsers.test.ts`, `tests/store.test.ts`.
4. Wire live refresh/catalog/history; test failure and stale prior-record views. Add installable shell and offline fallback that never fabricates live freshness. Background push remains disabled until a deployed scheduler and actual delivery are verified. No contact collection.
   Files: `public/manifest.webmanifest`, `public/sw.js`, `src/api.ts`, live integration tests.
5. Run all tests/build, inspect mobile/desktop browser, test keyboard and refresh persistence. Document commands, exact coverage/guidance/push gates, data deletion and AI assistance in `README.md`; surgically correct `docs/GOAL-advisory-alert.md`.

## Acceptance and gates

- Three honest states; expired/failed sources independently unavailable. Prior notices explicitly unverified. Blank lifted date active; only an explicit agency lift produces lift events.
- Separate agency dates from app retrieval/observation dates. Count advisories only; archive starts at first observation.
- Public-system inventory unresolved: records-only search and explicit selection. Private wells not monitored.
- Exact guidance must have verified source provenance; otherwise show gap and link, not invented official instructions.
- Push implementation now follows `PUSH-PLAN.md`; sending remains disabled by default and real device delivery unverified. Email is disconnected. iOS 16.4+ installed-app requirements explained. No delivery or storage-security promises.
- Existing apps preserved. No publication. CAC eligibility and student contribution remain personal gates.

## Vercel implementation status

- [x] Preserve local backend; add a separate Vercel function entry point.
- [x] PostgreSQL migration/state/captures, shared cooldowns/job leases/rate counters.
- [x] Persist push claims before sending; avoid network calls inside transactions.
- [x] Protect cron authorization, production-only enablement and preview isolation.
- [x] Local embedded PostgreSQL integration tests and deployment instructions (`VERCEL.md`).
- [x] User selected free-only hosting; remove paid Vercel cron and add a disabled-by-default five-minute Cloudflare trigger with local tests.
- [x] Replace Neon with user-approved Supabase Free; prepare verified single-connection pooling and tested private runtime-role/RLS access (`FREE-HOSTING.md`).
- [ ] Authorize free account/project provisioning; verify actual Supabase pooler/TLS/permissions and quotas.
- [ ] Link CLI project, configure secrets/roles, apply approved migration and verify Vercel build/routing.
- [ ] Approve deployment, verify remote concurrency/scheduled checks and actual iPhone/other-device delivery.
- [ ] Verify authoritative supplier catalog/guidance, human Spanish/accessibility and release/security checks.
- [ ] Run container in an approved Docker-capable environment; implement approved email fallback.
