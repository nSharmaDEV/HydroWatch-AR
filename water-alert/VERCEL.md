# Water Alert — Vercel deployment playbook

## Goal and current boundary

### October 25 softer-ripple production deployment

- With explicit user approval, pushed app commit `82a39b6` to `advisory-alert`
  and deployed to the existing `water-alert` project using explicit team scope
  `nirmays06-3523s-projects` (the unscoped attempt was not authorized).
- Deployment `6VUceuTgXD4z86jUEHnHFTbWLpzo` is Ready at
  `https://water-alert-rgibtogay-nirmays06-3523s-projects.vercel.app`, aliased to
  **https://water-alert-blond.vercel.app**. Local and hosted builds pass; 11 focused
  ripple tests pass. The full suite was not rerun; prior known failures below
  remain unresolved. The existing bundle-size warning remains.
- Read-only HTTPS checks returned 200 for production HTML referencing
  `index-C_Y7eWt8.js`, that JavaScript asset and `index-BtGF0oGZ.css`.
  No environment, scheduler or database changes, migrations or real sends.

### October 25 approved complete-app deployment

- User approved committing/pushing the complete current app and proceeding despite
  unresolved test failures. App commit `140a511` was pushed to `advisory-alert`.
- Deployment `3v5FBckedo8zPL3Vau3hX3vL3Cx3` is Ready at
  `https://water-alert-dsj7obmr8-nirmays06-3523s-projects.vercel.app`, aliased to
  **https://water-alert-blond.vercel.app**. Hosted TypeScript/Vite build passed.
- Read-only HTTPS checks returned 200 for HTML, the expected `index-DY-E8AG0.js`
  and `index-BtGF0oGZ.css` assets, help session and push config. Help session reports
  accounts/delivery disabled; push config remains enabled with a public key.
- Initial full suite: 596 passed and 38 failed. Fixed the native ESM import failure
  in the annual-report dependency chain; 21 focused API/security/Review tests and
  Node 24 build then passed. The other 37 failures remain unresolved, with explicit
  user approval to release. Existing bundle-size warning remains.
- No environment, scheduler or database changes; no migrations or email/push sends.
  Checks do not verify real-device delivery, authenticated accounts or email.

The local saved-help/History implementation has separate account, migration,
email-domain and webhook release gates in [HELP-REQUESTS.md](HELP-REQUESTS.md).
The deployment records below do not verify or enable those capabilities.

### October 22 push diagnostics production deployment

- Following explicit user approval, deployed the Settings error-detail update.
  Deployment `dpl_zBSRNjkRi6mYqezYLZgqNVeTucNL` is Ready at
  `https://water-alert-cg61nh1de-nirmays06-3523s-projects.vercel.app`, aliased to
  **https://water-alert-blond.vercel.app**. Hosted TypeScript/Vite build passed.
- Read-only checks confirmed the production page responds and push config remains
  enabled with a public key. The UI now preserves whether setup failed at the
  service-worker, browser-subscription or server-enrollment stage. No environment,
  scheduler, enrollment or delivery was changed or verified. User retry is needed
  to observe which stage is failing.

### October 22 current-checkout production deployment

- Deployed the complete linked checkout with `npx vercel deploy --prod --yes`.
  Deployment `dpl_8chB59BgZ2Vpj2yusbefVuY1PFZm` is Ready at
  `https://water-alert-bt37fdevc-nirmays06-3523s-projects.vercel.app`, aliased to
  **https://water-alert-blond.vercel.app**. Hosted TypeScript/Vite build passed.
- The deployment includes the observed-supplier map/history work, the Home push
  setup loading/failure guidance, and the current documentation/tests. Read-only
  checks confirmed the production page responds and `/api/push/config` remains
  enabled with a public key. No Vercel environment settings or Cloudflare scheduler
  were changed. The full local suite reported 505 passing and four existing
  report/contact-copy assertion failures; production source freshness and
  real-device notification delivery were not verified.

### October 21 pushed WAVE UI production deployment

- After confirming `.vercel/project.json` links this checkout to the existing
  `water-alert` project (`prj_TChYrR6c4YBBt5pYGKzwEnJrWStW`), deployed the pushed
  checkout with `vercel deploy --prod --yes`. Deployment
  `BeSgponvYgM4oUH3LZxfnEa2MMaU` is Ready at
  `https://water-alert-ne4zzwc57-nirmays06-3523s-projects.vercel.app`, aliased to
  **https://water-alert-blond.vercel.app**. The hosted TypeScript/Vite build
  passed. The production alias was opened and its sample-mode Home rendered the
  updated sidebar and Add a place UI. No notification setup, scheduler or
  production environment settings were changed; this was not a real-device or
  notification-delivery test.

### October 20 logo intro and current checkout deployment

- With explicit user approval, deployed app source at commit `f9e5966` to the
  existing `water-alert` project without changing production environment,
  notification or scheduler settings. Deployment `APxqzYx8PRRtZZ7JB44z7Ux6L1mD`
  is Ready at `https://water-alert-qw47wwx5x-nirmays06-3523s-projects.vercel.app`,
  aliased to **https://water-alert-blond.vercel.app**. Remote TypeScript/Vite build
  passed; assets are `index-DGsY989J.js` and `index-Jtv882zG.css`.
- The pre-push full suite passed 462 tests. After the production-CSP timing fix,
  five focused unit tests, six isolated browser cases and the build passed.
  Fresh production Chromium contexts at desktop 1440×900, phone 390×844 and
  reduced-motion phone verified sizing, completed artwork, the normal-motion
  700ms hold, overlay removal, sample-mode navigation and session replay skipping.
  No uncaught errors or CSP violations were observed. These are synthetic browser
  checks, not physical-device or notification-delivery verification. Checks blocked
  API requests, non-GET/HEAD requests, external origins and service workers.
- Vercel has no Git integration; pushing `advisory-alert` alone does not deploy.
  This release used the existing project's CLI deployment. Linking created ignored
  local Vercel metadata and an ignored environment file; neither is committed.

### October 18 approved Task 5 deployment

- User explicitly approved deploying the reviewed fixes. Deployment
  `ZwyfHKFJriBYhmxPNYEK4jUpmPNQ` is Ready at
  `https://water-alert-qmttujpc5-nirmays06-3523s-projects.vercel.app`, aliased to
  **https://water-alert-blond.vercel.app**. Previous production reference:
  `dpl_6LCVnamQNHzqwnxXmwbRSvi3kNoN`.
- Compared uploaded production file hashes to the checkout. Runtime differences
  were exactly the approved `src/App.tsx`, `src/ProviderContact.tsx` and
  `src/styles.css` fixes. An isolated temporary source snapshot retained deployed
  backend, configuration and scheduler inputs; differing local scheduler code and
  its tests were replaced only in that snapshot with the deployed baseline.
  No environment/private-data files were copied; the shared checkout was preserved.
- The exact release snapshot passed 219 included tests in 31 files, 24 isolated
  browser cases and TypeScript/Vite build. Its smaller suite excludes unrelated
  newly added local push tests and uses the deployed scheduler test baseline;
  the earlier full-checkout 232-test result is distinct, not this release's count.
  Remote build passed and produced `index-G1elCvej.js` / `index-CZ-x7F04.css`.
- At `2026-10-18T16:04:23Z`, six public GET checks passed: HTML, worker, status,
  push config and both assets. HTML references the expected assets; served asset
  bytes equal the tested local build. HTML/worker/status/config remain no-store.
  Enabled push config fingerprint is identical before/after; no settings changed.
- Fresh guarded production Chromium contexts at 390/768/1440×900 verified missing
  notice explanation, Spanish continuity into sample and header bounds. No
  external/API mutation attempts or uncaught errors; service workers blocked,
  no permissions, contacts or notification sends. An initial inline gutter-style
  probe was correctly blocked by production CSP; rerun used actual layout without
  injection or CSP changes. Reserved-gutter regression remains isolated-test evidence.
- Evidence: ignored `test-results/task5-deployment/`. This supersedes Task 5's
  local-only status, not its human/device/Spanish/legal-intake limitations. No
  Cloudflare deployment, scheduler/environment changes or Task 6 execution.

**Production push status:** Push is enabled with the separately approved production
VAPID key and operator contact. The October 17 activation snapshot below is
historical; a later direct test was accepted by Apple and the user confirmed it
arrived in Safari on their Mac (see [PUSH-PLAN.md](PUSH-PLAN.md)). On October 22,
read-only checks found two enrolled devices and six retained events; none was newer
than the latest enrollment, and no push attempts were recorded. Source checks and
the push job had recent start times (`14:41:24Z` and `14:45:19Z` respectively).
This is evidence of recent job activity, not verification of an automatic
advisory-triggered device notification. No test notice or scheduler invocation was
used in that audit. Day-long operation and quota gates remain open. Earlier
disabled-push results below are historical, and `verify:hosting` still intentionally
expects disabled push; use scoped enabled-push read-only verification instead.
Full activation and test evidence: [PUSH-PLAN.md](PUSH-PLAN.md).

The user selected a Vercel-native backend. The initial push-disabled production
deployment is live at **https://water-alert-blond.vercel.app** as of October 14,
2026 (verification at `2026-10-15T01:57Z`). On
2026-10-13, with explicit approval, the `water-alert/` directory was linked to
the new `water-alert` project in the verified Hobby/free workspace
`nirmays06-3523s-projects`. No Git integration or deployment was created at that step.
Also created the separate Supabase organization `Water Alert`
(`vcbtwkiieuqxvxlwnczt`). The user privately created `WellPower: WAVE`
(`eeuknpzklzoijvjsshwx`, us-east-1). With subsequent explicit approval, applied
`server/migrations/001-cloud.sql` and `server/runtime-role.sql` through
`supabase db query --linked --project-ref eeuknpzklzoijvjsshwx --file <absolute-path>`.
Hosted checks confirmed four tables with RLS, restricted runtime CRUD (test writes
rolled back), and browser-role read denial. The user subsequently set the runtime
password privately and enabled LOGIN. Verified port-6543 pooler login with verified
TLS in `psql` and a read-only Node `pg` query using the app's `databaseOptions`.
Runtime URL and project CA were saved in ignored local `.env` (mode 0600),
initially with cloud operation and push disabled. After private password rotation
and renewed approval, production cloud operation is enabled; push remains disabled.
Hosted concurrency checks remain pending. No paid plan, VAPID key generation,
or external push send has occurred. Separately approved Cloudflare scheduler
activation was registered October 17; see `FREE-HOSTING.md` for evidence and
remaining execution-verification limits. This document is not
authorization for further work.

### October 17 isolated test hosting setup (initial configuration)

- With separate approval, reverified the workspace as Hobby/free and created
  `wellpower-wave-push-test`, distinct from `water-alert`, without Git integration.
  Vite/build/output settings match the app; Node 24, Fluid compute, `iad1` and
  180-second function timeout are configured. Zero deployments existed at setup.
- Assigned origin: `https://wellpower-wave-push-test.vercel.app` (initially not live).
  Six Production-only variables use the isolated test database's restricted runtime
  URL and CA, a new test-only cron secret, cloud `true`, this origin and push `false`.
  Database/CA/cron values are sensitive; the other settings were read back. No
  Preview/Development variables, VAPID setup or scheduler were added.
- Private test setup remains in ignored `0600` `.env.push-test.provisioning`.
  The checkout's production `.vercel` link and `.env` were not replaced. Any approved
  test deployment must target the test project explicitly, not the existing link.
  Local config validation/three targeted tests passed. The separately authorized
  deployment results follow; real phone delivery and sends remain separately gated.

### October 17 isolated test deployment and read-only verification

- User approved deployment and read-only HTTPS smoke verification, not push or
  source-check execution. Deployed a temporary source copy with private files
  excluded, explicitly targeting the test project. The production checkout's
  `.vercel` link and `.env` hashes remained unchanged.
- `dpl_8nCQNq7oWCLUe4bXrFJ5KAwD81dR` is READY and serves
  `https://wellpower-wave-push-test.vercel.app`. Local TypeScript/Vite build and
  15 targeted hosting/compiled-API/config/cloud tests passed before upload.
- All six `npm run verify:hosting -- https://wellpower-wave-push-test.vercel.app`
  checks passed: HTTPS/no redirects, HTML/worker/database-backed API routing,
  no-store, disabled push, unauthenticated cron 401 and foreign-origin 403.
  At `2026-10-17T20:00:43Z`, test archive/events were empty and production's
  public push configuration remained disabled with a null public key.
- No authenticated cron invocation, source fetch, scheduler, VAPID setup, push
  activation or notification sends occurred. This verifies basic hosted database
  integration, not concurrency/load behavior, failure recovery or device delivery.

### October 17 isolated test-only push activation

- After separate approval, enabled push only in `wellpower-wave-push-test` and
  redeployed the same verified application snapshot. Current test deployment:
  `dpl_HRz4e2LSuy2mHPyS35fdFgitXp81` (READY). Production push remains disabled.
- Preflight verified zero test devices/captures over TLS, valid VAPID inputs, Hobby
  and no Vercel cron definitions. No test scheduler was created. At
  `2026-10-17T20:06:58Z`, seven read-only checks passed: HTML/worker/status, enabled
  test config with exact test key privately compared, cron 401, foreign-origin 403
  and disabled production config. Test archive/events remain empty; production
  local project link and `.env` hashes unchanged.
- `verify:hosting` is intentionally a disabled-push verifier: its disabled check
  no longer applies to this enabled test app. No source baseline, enrollment or
  notification sends were authorized or performed at activation. Device arrival,
  failure recovery and production activation remain open gates; see `PUSH-PLAN.md`.

### October 17 approved release update

- After the earlier hold, user explicitly selected “Approve deployment.” No release
  inputs were newer than the passing local build (217 unit tests, six isolated
  browser cases). Existing logo/shared work preserved; no environment changes.
- Deployment `9MVBydK2eJcfdBEMPmQPzAhjKxvN` at
  `https://water-alert-kzg5kju4l-nirmays06-3523s-projects.vercel.app` is aliased to
  `https://water-alert-blond.vercel.app`. Remote TypeScript/Vite build passed in
  `iad1`; HTML contains the tested `index-BLDV0n4t.js` artifact.
- At `2026-10-17T17:21:31Z`, public HTML returned 200 and push configuration reported
  disabled with a null public key. CLI environment downloads expose sensitive-value
  markers rather than actual values; contents were not printed and temporary files
  removed. No claim of independent secret-value verification is made.
- Public journey/privacy checks remain the next approval gate. Scheduling, sends,
  production failure injection and elapsed reliability claims are not authorized
  or established by this deployment.

### October 14 local preparation (before deployment)

- Reverified local baseline (183 tests/build), and read-only Vercel inventory:
  no deployments or environment variables. Initial push-disabled production
  configuration/deployment is now explicitly approved **after credential rotation**.
- A prior tool read exposed the local runtime database credential. Treat it as
  compromised: rotate `water_alert_runtime` privately using `\password` in the
  authorized administrative session, update the ignored `.env` connection URL,
  and confirm completion without sharing the password. Do not deploy the old URL.
  User confirmed rotation is not yet done and requested deployment be paused.
  No remote settings were changed here.
- Local deployment configuration now pins Node 24 and `iad1` (us-east-1).
  `.vercelignore` explicitly excludes environment files, local records and key files.
  Node 24.22.0 local verification: 194 tests and production build pass.
- After deploying, run `npm run verify:hosting -- https://canonical-host`.
  This read-only, unauthenticated smoke check requires HTTPS without redirects,
  HTML/worker/API routing, no-store responses, disabled push, cron 401 and foreign
  Origin 403. It prints only named pass/fail checks, not response bodies or errors.
  It does **not** verify fresh source checks, cross-worker persistence/concurrency,
  laptop-off scheduling, device arrival or any notification sends.
- Canonical production origin still needs to be selected/confirmed from the linked
  project's available domain before setting `WATER_ALERT_ORIGIN`. Cloudflare,
  VAPID, device tests and production sends retain their separate approval gates.

### October 14 production deployment and verified results

- User confirmed private runtime-password rotation and updated ignored `.env`;
  read-only Node verification passed with verified TLS and restricted runtime identity.
  User explicitly authorized proceeding with initial push-disabled deployment.
- Verified linked domain `water-alert-blond.vercel.app`; configured exactly six
  Production-only secret variables from the table below (cloud/origin/database/CA/
  cron/push). No Preview or Development variables, VAPID keys or Git integration.
  The random cron secret is retained only in ignored `.env` and Vercel Production.
- Active deployment: `5ATdWFpaEnZnf9AwAXj3RhUePdPo` at
  `https://water-alert-fr13aghfn-nirmays06-3523s-projects.vercel.app`, aliased to the
  canonical origin above. Build and runtime region: `iad1`; project Node: `24.x`.
- The first build succeeded but invocation failed with `ERR_MODULE_NOT_FOUND`.
  Explicit `.js` imports in the emitted API dependency graph fixed native ESM loading;
  a compile-and-native-Node regression reproduced the failure before the fix.
  Local verification after the fix: **195 tests and production build pass on Node 24**.
- All six `npm run verify:hosting -- https://water-alert-blond.vercel.app` checks
  pass: HTTPS/no redirects, HTML/worker/API routing, no-store, disabled push,
  unauthenticated cron 401, foreign Origin 403. Incorrect cron bearer also returned
  401. A privately authenticated invocation returned 200 with `{ "ok": true }`.
  The hosted Alert Options screen also reports push not configured and disables
  device enablement; no browser permission or subscription was requested.
- That invocation parsed ADH (30 records) and ADEQ (52 records), with success
  timestamps `2026-10-15T01:57:03Z`. These are parsed feed records, not counts of
  current active advisories. Read-only SQL confirmed 82 persisted archive records,
  schema-validated captures for both agencies and **zero baseline events**.
- Cross-cold-start/concurrency/load verification remains pending; a successful
  read-only persistence check does not prove these. No continuous scheduling or
  laptop-off checks are established. Source status must age to unavailable after
  15 minutes without further successful checks. Cloudflare setup/activation,
  VAPID/device tests and production sends still require separate approval.

Vercel serves `dist/` and routes `/api/*` to `api/index.ts`. No listening server,
background timer or filesystem persistence runs in the cloud path. PostgreSQL stores
observations, subscriptions, latest source captures, leases and rate counters. The
existing local Node/filesystem implementation remains available independently.

## Decisions before provisioning

- User requires **free-only** hosting. Vercel Hobby serves the app/API; a separate
  Cloudflare Workers Free cron invokes the API every five minutes. `vercel.json`
  contains no Vercel cron. Sources still become unavailable after 15 minutes.
- Supabase Free PostgreSQL + Cloudflare was approved as an approach; subsequent
  approvals covered Vercel linking/database setup, then initial push-disabled
  deployment. Scheduling remains separately gated.
  Neon Free was replaced after reviewing its compute quota.
  See [FREE-HOSTING.md](FREE-HOSTING.md) for restricted role and free pooler setup.
  Use a dedicated PostgreSQL database and TLS-verified pooled runtime connection.
- Approve production HTTPS origin, VAPID contact/key setup and browser push services.
  Database URLs and private keys must never be pasted into chat or committed.
- Approve production deployment separately.

## Setup after authorization

From `water-alert/`:

```sh
npm ci
npm test
npm run build
npx vercel login
npx vercel link
```

Link this folder, not the repository root. Confirm scope before accepting project
creation prompts. Set Node 24 and Fluid compute with at least 180-second function
duration. Match the function region to the database. Initial CLI build/routing and
hosted database read/write persistence are verified above; managed concurrency,
load behavior and device delivery remain gates.

Put the approved direct administrative URL in private `.env` as `DATABASE_URL_ADMIN`,
then run `npm run db:migrate`. This applies `server/migrations/001-cloud.sql` with
verified TLS; builds/requests never run migrations. Provision a separate runtime
role through the approved provider. Grant only schema usage and SELECT/INSERT/UPDATE/
DELETE on the four `water_alert` tables. Never grant PUBLIC/browser-data-API access,
runtime DDL permissions or runtime superuser credentials.

### Production variables

| Variable | Requirement |
|---|---|
| `WATER_ALERT_CLOUD_ENABLED` | Literal `true` after provisioning approval |
| `WATER_ALERT_ORIGIN` | Exact canonical HTTPS origin, no path/trailing slash |
| `DATABASE_URL` | Restricted PostgreSQL runtime connection; pooler recommended |
| `DATABASE_SSL_CA` | Optional project CA PEM for verified TLS; runtime and migration |
| `CRON_SECRET` | Random 32–128 character base64url secret; scheduled Worker sends its bearer |
| `WATER_ALERT_PUSH_ENABLED` | Start with `false`; literal `true` enables push |
| `VAPID_PUBLIC_KEY` | Required when push enabled; this key alone is public |
| `VAPID_PRIVATE_KEY` | Required when enabled; secret, never `VITE_*` |
| `VAPID_SUBJECT` | Approved real `mailto:` contact or HTTPS URL |

Scope secrets to Production. Platform-provided `VERCEL_ENV` must be `production`;
preview/development cloud requests fail closed with 503. Previews may show sample UI,
but cannot use production subscriptions/checks. An isolated test deployment needs
its own approved project/database/devices, not production secrets in Preview.

Only after explicit approval, `npx vercel --prod` publishes. Configure the separate
scheduled Worker after the database gate is resolved; an API deployment alone does
not establish scheduled checking. Stay on free plans; never enable paid upgrades.

## Scheduling and coordination

`GET /api/cron` authenticates with constant-time bearer comparison and no-store
responses. The scheduled Worker invokes it every five minutes; the shared cooldown
prevents duplicate source checks, with push retries/pruning each invocation. Manual
checks use a shared 60-second cooldown. Only the two approved feeds are fetched;
strict parsers, 15-second timeouts, first-check baselines and failure states remain.

Shared leases suppress overlapping jobs: source lease 120 seconds; push lease 150.
Tokens prevent an old worker releasing a newer lease. State mutations lock one JSONB
row in short transactions; source/push network calls run outside transactions. Push
claims/backoff are persisted before transport; acceptance is saved conditionally.
Deletion/resaving cannot be undone by a sender completion. An in-progress send cannot
be recalled; browser unsubscribe remains first. Crash-after-send can still duplicate.

Cloud drains attempt at most 10 notifications/invocation, each with a 10-second
transport timeout and five-minute TTL. Remaining work retries later. One-hour event
expiry remains; an 80-second drain budget stops starting further sends, leaving
headroom for source checks and final writes inside the 180-second function limit.
Future-only watches, healthy sources, unknown-status suppression and explicit
lifts remain required. Provider acceptance is never proof of device delivery.

Cloud mutation limits are shared: 30/minute per HMAC-hashed platform client address,
300/minute globally. Only the Vercel entry point trusts `x-vercel-forwarded-for`,
documented as platform-overwritten; missing/invalid addresses share a limited bucket.
Rate rows expire during mutations; no raw address is stored here. Review platform
logs separately. Origin checks are not bot authentication; edge/WAF review remains.

Two JSONB state documents retain the existing 1000-device/50-watch caps. This is a
bounded prototype, not verified full-capacity performance. Remote pooled concurrency,
load/security review and backup/deletion policies remain gates. Devices are pruned
on active cron/drain/update; paused/failing cron cannot guarantee wall-clock removal.

Local JSON data is not automatically imported. First cloud checks establish new
baselines without historical broadcasts. Any archive/subscription migration needs
separate consent, retention review and a baseline-preserving procedure.

## Verification and rollback

Check real-deployment API/worker routing, freshness with this computer off, cron 401
without authorization, exact origins, no-store headers, restart/persistence and
source-failure states. Exercise concurrent invocations on the hosted pooler. Local
tests use embedded PostgreSQL (PGlite), not a hosted database or Vercel emulator.

Verify consenting real devices, especially installed iPhone iOS 16.4+ PWA, using an
approved isolated test setup: new/lift payloads, closed-browser arrival, links,
language/watch changes, deletion and failure recovery. Never fabricate production
notices or broadcast tests to other users. `DEPLOYMENT.md` has the device checklist.

To pause sends, disable push and redeploy with approval; leave cloud enabled so
checks, deletion and pruning work. Preserve database records; never restore deleted
subscriptions or roll back to a filesystem-writing handler on Vercel. Email remains
unimplemented; supplier/guidance and human review gates remain separate.

References checked during implementation:
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/headers/request-headers
