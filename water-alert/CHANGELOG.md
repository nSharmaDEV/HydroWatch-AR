# Water Alert changelog

Notable website, backend and hosting-configuration changes for the isolated
`water-alert/` app. This initial entry consolidates work completed locally on
October 13, 2026; it is not a commit-by-commit history or a release announcement.
The root `CHANGELOG.md` remains the history of the earlier HydroWatch apps.

## [Unreleased] — 2026-10-13

### Verified local place catalog — 2026-10-13

- Added always-selectable Beaver Lake and Buffalo National River/Buffalo River,
  plus ADH-verified Fayetteville, Springdale, Rogers and Bentonville public water
  systems. Linked official identity references in confirmation, cards, details
  and Sources and coverage limits; added EN/ES directory and monitoring limitations.
- Projected the small directory into live UI/API place lists without seeding
  observations, events or timestamps. Sample data and existing observed-place IDs
  remain separate and unchanged; supplier identities match the existing ADH parser.
- Matched catalog waterbody watches only to exact verified ADEQ HAB names, retaining
  each published area and original record identity. Applied matching to status,
  observed history, recent changes, deep links and existing future-only opt-in
  notification validation/matching, without changing transport or freshness gates.
  Overlapping lake/area watches do not duplicate the same event for one device.
- No lake-to-tap advisory inference, bacterial results, water tests, park closures
  or new live feed. Failed/stale/offline sources remain unavailable, and a missing
  notice does not establish safety or monitoring coverage.
- Locally verified: **121 tests passed in 20 files**, TypeScript/production build,
  the existing **8** mocked Chromium journeys, and **4** catalog journeys at
  **1440/390px in EN/ES**. API fixtures and fake notification senders only; no
  backend startup, scheduler activation, real subscription/send, deployment or
  commit occurred. Real-device delivery and human Spanish review remain open.

### Resident journey redesign — 2026-10-13

- Reworked the welcome, typed supplier/waterbody search, no-match and confirmation
  journeys. Selecting a match no longer saves a watch before explicit confirmation.
  Added the private-well path and guided, clearly fictional sample introduction.
- Added desktop home cards with a results/alerts sidebar, mobile bottom navigation,
  focused notice guidance with metadata/published-record/alert disclosures,
  Places removal/undo, my/all observed history with progressive reveal, and grouped
  Settings with separate alerts, sources, privacy and installation sections.
- Reserved purple for active HAB notices; unavailable is neutral gray with a
  question mark. Failed-source records and archived deep links are labelled as
  previously observed or explicitly lifted, never presented as current active
  records. Existing no-safety, unknown-lift and guidance-gap warnings remain.
- Kept agency dates verbatim; known app timestamps are localized in EN/ES with
  `America/Chicago`. Missing record dates are omitted, with no invented publication
  timestamp. Explained retrieval of the two feeds, not individual place checks.
- Preserved separate live/sample preferences, polling, source rules, notification
  transport and server-deletion failure/retry. Removal undo restores the place's
  lift preference; mode changes clear transient undo state. Deletion copy now
  explicitly covers browser preferences and any server notification record.
- Split journey/detail/history views and bilingual journey copy into focused UI
  modules. Vite no longer automatically loads private runtime environment files;
  API configuration and dependencies were not changed.
- Locally verified: **112 tests passed in 19 files**; TypeScript and production
  build passed. Mocked Chromium journeys passed at **1440, 820, 390 and 320px** in
  **English and Spanish**, including keyboard activation/focus, all three states,
  HAB recovery, sample isolation and deletion retry. Screenshots are under ignored
  `test-results/journey/`; real-device and human Spanish/accessibility review
  remain open. No backend startup, deployment, scheduler activation, real
  notification send or commit occurred for this redesign.

### Private database connection — 2026-10-13

- User privately set the runtime-role password and enabled LOGIN. Verified
  transaction-pooler login on port 6543 with certificate-verified TLS in `psql`
  and a read-only Node `pg` query using the app's `databaseOptions` configuration.
- Saved the runtime URL and project CA only in ignored local `.env` with mode
  0600; no administrator credential was saved. Cloud operation and push remain
  disabled. No deployment, scheduler activation or notification send occurred.

### Hosted database setup — 2026-10-13

- Applied the existing `001-cloud.sql` and `runtime-role.sql` scripts to the
  user's Supabase project `WellPower: WAVE` (`eeuknpzklzoijvjsshwx`, us-east-1)
  through authenticated CLI database queries. Created the four private
  `water_alert` tables and restricted `water_alert_runtime` role with RLS.
- Verified hosted table grants/RLS, runtime CRUD in a rolled-back transaction,
  and denial of reads by `anon` and `authenticated`. No test records remain.
  At this step the runtime role was NOLOGIN without elevated privileges or schema
  CREATE; private login and application pooler/TLS were verified subsequently above.
  No deployment, scheduler activation or notification delivery occurred.

### Hosting link — 2026-10-13

- Created a separate Supabase organization named `Water Alert`. At this step,
  project creation awaited the user's private database-password step; database
  setup subsequently completed as recorded above. No app credentials or deployment
  were configured in the organization-creation step.
- Created the `water-alert` Vercel project in the verified Hobby/free workspace
  and linked only this app directory; local `.vercel/` metadata remains ignored.
  No Git integration or deployment was created. Removed the CLI-generated local
  OIDC token file; no application secrets, database or scheduler were configured.

### Added — website

- Independent React + TypeScript + Vite resident app, with setup, My Water,
  notice detail, browse, observed history and settings screens.
- White/light-gray public-service layout with navy/teal controls, orange boil
  notices, purple HAB notices, mobile bottom navigation, desktop top navigation
  and two-column notice detail.
- Explicit supplier and lake selection, limited observed-record name/county
  search, ambiguity explanations and private-well limitations. Supplier coverage
  is never inferred from a town or address.
- English/Spanish interface strings, labelled controls, visible keyboard focus,
  skip link and text/shape status indicators. Agency records stay untranslated.
- Source links and sharing, separate agency and app-observation timestamps,
  first/last observed history and visible official-guidance verification gaps.
- Persistent yellow sample-mode banner and exit control; fictional sample data
  and live preferences are kept separate.
- Live saved-status polling every 30 seconds, optional in Settings, plus manual
  source checking. Sample mode does not poll the live API.
- Watched-place changes since the previous device visit, with per-agency cursors
  and first-visit baseline suppression.
- PWA manifest, PNG installation icons and push-only service worker, including
  notification deep links. No offline caching of advisory/API responses.
- Live device-notification opt-in, saved watch/lift choices, preference mismatch
  warning, disable/remove controls and deletion-failure retry. Sample alerts
  remain disconnected; installed iOS 16.4+ requirements are explained.

### Added — sources, persistence and notifications

- Isolated Express/tsx localhost API and strict parsers for the two approved
  ADH/ADEQ feeds, with authentic offline fixtures and schema-validation captures.
- Concurrent bounded retrieval, 15-second timeouts, redirect rejection,
  60-second manual cooldown and in-flight deduplication.
- Startup and five-minute local scheduled checks, only while the server is
  running and the computer is awake.
- Atomic local observation archive, grouped ADH cross-county duplicates,
  derived stable identities and retained prior records after failures.
- Durable 30-day change journal, first-source-check baseline suppression,
  future-only push enrollment and explicit-lift-only notification events.
- Web Push transport, endpoint/encryption-key validation, hashed deletion
  bearers, retry backoff, durable pre-send claims and attempt deduplication.
  Device records expire 90 days after saving, subject to running cleanup and
  separate operator handling of backups.

### Added — hosting preparation

- Separate Vercel API entry point with PostgreSQL state/captures, shared source
  cooldowns, job leases and mutation rate limits; cloud previews fail closed.
- Private-schema migration and operator-only restricted runtime-role/RLS script;
  verified-TLS connection configuration and single-connection pooling.
- Disabled-by-default Cloudflare scheduled Worker for five-minute authenticated
  checks, replacing paid frequent Vercel cron configuration.
- Free-only hosting plan: Vercel Hobby + Supabase Free + Cloudflare Workers Free.
  Neon Free was replaced after identifying the continuous-check compute quota
  risk. Provider quotas and limitations are documented, not guaranteed away.
- Alternative Docker/Compose configuration and local icon-generation tooling.
- Setup, architecture, privacy, deployment and approval-gate documentation in
  `README.md`, `PLAN.md`, `PUSH-PLAN.md`, `DEPLOYMENT.md`, `VERCEL.md` and
  `FREE-HOSTING.md`.

### Safety and privacy behavior

- Failed or older-than-15-minute sources show Data unavailable, never an
  all-clear. Retained records are explicitly unverified.
- Blank lift fields remain active; explicit agency dates establish lifts.
  Disappearance never implies a lift. ADEQ `N/A` lift fields remain unknown and
  cannot trigger new/lift alerts.
- Malformed, conflicting or unexpectedly empty source responses do not replace
  valid snapshots; genuine empty-feed semantics remain unverified.
- No email, personal address or account collection. Push opt-in collects only
  subscription data, watch choices, language and delivery-attempt state.
- No safety certification, prediction, verified service-area coverage, delivery
  guarantee or storage-security guarantee. Provider acceptance is not device
  delivery; a crash after sending can still cause a duplicate.

### Verification and remaining gates

- Latest local verification: **100 tests passed** with
  `npm test -- --maxWorkers=2`; `npm run build` passed. The default parallel test
  run encountered resource-contention timeouts before the bounded rerun.
- Embedded PostgreSQL tests cover persistence, access restrictions and shared
  claims; they do not verify hosted pooler behavior or real platform concurrency.
- Vercel project linking and the initial hosted Supabase schema/role setup are
  complete as recorded above. No deployment, publication or real notification
  delivery has occurred. Sending and the
  Cloudflare scheduler remain disabled by default.
- Still pending: authorized hosting setup, remote routing/TLS/permissions and
  quota checks, computer-off scheduling and consenting real-device push tests.
- Still pending: verified supplier catalog and agency guidance, human Spanish
  and accessibility review, release/security checks and CAC submission approval.
- Email alerts are not implemented. Docker configuration has not been run in a
  Docker-capable environment.
