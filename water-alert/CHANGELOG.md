# Water Alert changelog

Notable website, backend and hosting-configuration changes for the isolated
`water-alert/` app. This initial entry consolidates work completed locally on
October 13, 2026; it is not a commit-by-commit history or a release announcement.
The root `CHANGELOG.md` remains the history of the earlier HydroWatch apps.

## [Unreleased] — 2026-10-13

### One-tap provider contact — 2026-10-14

- Added visible **Contact water provider** sections to supplier cards and notice
  details, with call links and organization email links where available, in EN/ES.
- Checked ADH directory contact fields for Leisure Hills, Fayetteville,
  Springdale, Rogers and Bentonville; exact supplier-ID matching, source links and
  check dates prevent guessed contacts. Unknown suppliers get bill/park-management
  guidance. Lakes and sample mode do not show real provider contact actions.
- Links open the user's phone/email app, not an in-site delivery service. Directory
  hours, response times and successful calls/emails are not verified.
- Verified locally: 183 tests and production build pass; browser checks at
  1280/390/320px in EN/ES passed without overflow or page errors. No real calls or
  emails initiated; no deployment performed.

### Compact supplier card refinement — 2026-10-14

- Shortened card labels to **Affected area**, **Reason**, **Issued** and **Active**;
  normalized uppercase county display. Exact matching supplier/whole-system
  wording becomes **Entire system**, without shortening exceptions or other areas.
- Formatted recognized ADH issue date/time fields to short dates and minutes;
  retained explicit source time zones and never inferred an absent zone. Original
  area and issued text remain in the info popup; stored/history text is unchanged.
- Tightened heading spacing, kept 24px desktop padding, used 21px supplier and
  18px alert headings with 15–16px body text and 12px metadata gaps. Dotted leaders,
  right-aligned values, natural wrapping and content-driven height remain.
- Verified locally: 173 tests, production build and supplier/source-activity/journey
  browser checks pass. Reviewed complete Leisure Hills pages including the sidebar
  at normal zoom at 1280/1440/390/320px, with original popup evidence and no overflow.
  No deployment, source/storage changes or real notifications from this work batch.

### My Water layout and supplier info — 2026-10-14

- Matched the approved layout with compact white supplier cards, a top-right info
  button, restrained status treatment and dotted label/value leaders for genuine
  affected-area, reason and agency-issued fields. Unavailable findings retain
  explicitly historical notice facts, never a fabricated active status.
- Moved safety/coverage notes, instructions, the official link, actual saved
  check/attempt time and collapsed technical activity into a native modal.
  Keyboard opening, Escape/Close and focus return are verified. The existing
  detail/share journey remains available through **Notice details** in the modal.
- Kept official **Alert history** collapsed with one left chevron. Unboxed the
  sidebar, added **Manage alerts** and existing device-delivery status, and kept
  **Add a place** directly below the watched cards. Mobile stacks without the
  vertical separator; published text wraps without invented values.
- Verified locally: 163 tests and production build pass; EN/ES supplier browser
  checks cover 1280/390/320px, popup/history keyboard interactions and unavailable,
  empty, lifted and missing-field states. Source-activity and journey browser
  regressions pass. Reviewed saved Leisure Hills ADH facts at 1280/390px with
  unchanged agency dates and retrieval evidence; API responses were intercepted.
  No deployment, live checks, record changes or real notifications.

### Supplier alert history — 2026-10-14

- Replaced the supplier card's primary Check history with collapsed **Alert history**
  from exact supplier/ADH/source-matched retained notices. Shows official facts,
  explicit missing-field labels, sourced guidance when retained, and separate app
  observations; failed/repeated checks and disappearance never become lift events.
- Moved last-success evidence, failures, grouping and retention/storage explanations
  into collapsed **Data-source activity** on cards/details. Current status remains
  fail-closed and the default supplier card stays compact; ADEQ UI is unchanged.
- Added genuine source-specific history-start evidence for new sources; legacy
  state without start/observation evidence shows an unknown start, not a guessed
  date. Existing notice archives are reused without check-log backfill or migration.
  ADH per-notice guidance remains unretained and explicitly missing.
- Verified locally: 161 tests pass with `npm test -- --maxWorkers=2` and the
  production build passes; advisory
  browser checks cover active, lifted, missing, empty, failed and disappeared
  states at 1440/390/320px in EN/ES, with keyboard toggles and no overflow.
  Data-source activity, ADEQ, catalog and journey browser regressions also pass.
  No deployment,
  publication, live record changes or real notifications.

### Supplier check-history polish — 2026-10-14

- Shortened supplier history to one ADH-specific introduction; removed duplicate
  source/retrieval-success lines and moved retention/provenance explanations into
  Supplier details. History and supplier/coverage disclosures remain collapsed.
- Added local date headings and compact expandable saved-success count/time-range
  rows with CDT/CST, readable 15px body text, tighter spacing and right-aligned,
  keyboard-operable full-row disclosures. Individual saved timestamps remain
  available; identical failures never group, nor do successes across a failure,
  changed published result or local-date boundary.
- Current failure remains unavailable; previous successful evidence stays explicitly
  historical. No storage/parser changes, invented evidence, deployment or real sends.
- Verified locally: 152 tests and production build pass; supplier browser checks
  cover 1440/1280/390/320px in EN/ES, keyboard toggles, readable text, wrapping and
  overflow. Saved Bentonville evidence was also reviewed at 1280/390px without
  changing it; ADEQ-card browser checks remain green.

### ADEQ advisory cards and verified guidance — 2026-10-14

- Clarified English/Spanish unknown-lift copy: ADEQ's current table excludes
  `lifted: "N/A"`; this does not establish active or lifted status. Home cards keep
  short copy; history/details explain the exclusion and lack of new/lifted alerts.
- ADEQ history now distinguishes agency-issued/feed-updated dates from genuine
  first/last app observations, explicitly labels the missing N/A lift date, and
  explains that retrieval is not agency reconfirmation. No illustrative counts or
  dates were added; the bounded check journal cannot establish lifetime counts.
- Bundled general ADEQ HAB quotations and reporting/illness contacts, verified
  against the official page on October 14, 2026, with source/date and English
  quotation labels in both languages. Reusable detail/history guidance disclosures
  do not fetch per card or invent advisory-specific reasons.
- Verified locally: `npm test -- --maxWorkers=2` (151 passed), `npm run build`,
  ADEQ-card and source-check browser checks at 1440/390/320px in EN/ES; existing
  journey and catalog browser checks also pass. API-intercepted browser checks
  cover unknown home/detail/history, guidance keyboard disclosure, current HAB,
  provenance and overflow. No deployment, real notification sends or physical-device
  verification. ADH, parser/state semantics, empty-feed guard and live/sample
  isolation unchanged.

### Compact supplier advisory cards — 2026-10-14

- Simplified supplier cards to one finding and saved check/attempt time, county
  and ADH identity, a short water-safety limitation and the official ADH list link.
  Check history and coverage start collapsed; Supplier details opens the existing
  detail view. Added bilingual labels, right-aligned disclosure indicators and
  content-height layout with stacked mobile actions and visible keyboard focus.
- Failed checks remain unavailable, with compact genuine last-success evidence
  and historical caution, or an explicit no-success message. Stale and unknown-lift
  results remain unconfirmed. Preserved evidence retention, exact matching,
  freshness rules, fictional sample isolation and existing waterbody presentation.
- Verified locally: **140 tests passed**, TypeScript/production build, **8** mocked
  browser journeys, **4** catalog journeys and **6** source-history journeys.
  Reviewed desktop/mobile EN/ES screenshots, including compact no-match, active,
  failure and no-success states. No deployment, hosted mutations or real notifications.

### Source-check evidence — 2026-10-14

- Added bilingual watch-card historical-result panels, actual latest-attempt rows,
  collapsed keyboard-accessible source-check timelines, consecutive repeated-check
  groups and progressive reveal. Current unavailable stays neutral and primary;
  official ADH/ADEQ advisory-list links are separate from supplier/coverage details.
  Failed retrieval, invalid format, stale, offline and never-checked explanations
  are distinct. No missing evidence is interpreted as historical no-match.

- Added durable actual success/failure outcomes and complete successful feed evidence
  to the shared local JSON/PostgreSQL JSONB observation store. Each agency retains
  at most 64 checks within 30 days, plus one last-success snapshot; a 1 MB journal
  budget removes older complete checks, always preserving the newest check.
  Pruning occurs on its next check. Legacy records gain empty history fields without invented
  checks or archive-derived no-match results. No SQL/grant changes or hosted migration
  were performed. Notification events and parser/freshness rules remain unchanged.

- Added isolated fictional sample check evidence. Validated captures now persist
  before committing a successful check, preventing contradictory success/failure
  journal entries when capture persistence fails.
- Verified locally: **136 tests passed**, TypeScript/production build, **8** existing
  mocked browser journeys, **4** catalog journeys and **6** source-history journeys
  (desktop/mobile, EN/ES, keyboard expansion, grouping and progressive reveal).
  Restarted the local development servers at the user's request with push disabled.
  Both agency startup checks succeeded and recorded genuine successful evidence.
  No deployment, real notification sending or hosted migration; hosted platform,
  real-device and human Spanish review remain open.

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
