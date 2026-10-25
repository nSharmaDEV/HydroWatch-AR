# Water Alert push implementation plan

Goal: implement resident alerts locally without deployment, accounts, production key generation or external notification sends. Inline execution as requested.

Architecture: persist changes atomically with observations; a separate private device store holds opt-in subscriptions and delivery attempts. A single running service checks agencies and drains pending pushes. HTTPS hosting, durable disk, VAPID configuration and device testing remain release gates.

Constraints: existing checkout/branch only; preserve prior apps and user work; two approved agency URLs only; no inferred lifts or unknown-status alerts; sample mode cannot subscribe. No safety or reliable-delivery claim. Sending through browser push services requires explicit operator configuration/authorization.

## 1. Durable changes
- [x] Add failing `tests/server.test.ts` cases for per-agency baseline suppression, restart persistence and deduplication.
- [x] Run `npm test -- tests/server.test.ts`; implement a compatible event journal in `server/store.ts`; rerun.

## 2. Device delivery
- [x] Add failing `tests/push.test.ts` cases for future-only matching, retries, expiration, deduplication, validation and authorized removal.
- [x] Implement serialized atomic device storage in `server/push.ts`, injected transport and restricted HTTPS push endpoints; rerun.
- [x] Test and implement API wiring in `server/app.ts` and environment-gated VAPID transport in `server/index.ts`.

## 3. Installed-PWA opt-in
- [x] Test and implement `src/push.ts`, `public/sw.js` and EN/ES settings controls in `src/App.tsx`. Request permission only on user action; server acceptance is not verified device delivery. Provide disable/delete and visible failures; sample mode cannot subscribe.

## 4. Verification and operations
- [x] Add single-instance persistent-disk container configuration and an environment example; no deployment or keys generated. Docker is unavailable locally; container execution remains unverified.
- [ ] Run tests/build and inspect local UI. Document exact remaining hosting/device gates. No commits, merges, publication or external sends.

## Task 3 — authorized local rehearsal (October 17, 2026)

User authorized a local isolated harness and targeted tests only. Execute inline;
no subagents, resources, secrets, deployment, production enablement or sends.
The harness uses fresh in-memory state, synthetic records and a fixed recording
transport. It does not load environment files or accept real subscriptions.

- [x] Add failing `tests/push-harness.test.ts` behavior checks for baseline/future-only
  matching, new/lift payloads, restart deduplication, stale/error/unknown/missing
  suppression, language/watch updates, removal, expiry and watch limits.
- [x] Implement `tests/helpers/push-harness.ts` around the existing stores without
  changing production code. Add `scripts/rehearse-push.ts` for a recording-only run.
- [x] Run the targeted harness, push, device, API and cloud tests; inspect the diff
  and update this plan and `CHANGELOG.md` with actual results and limitations.

This is not an HTTPS test deployment, phone opt-in or proof of notification delivery.
Those operations still need separate explicit approval.

Run from `water-alert/` without loading `.env`:

```sh
./node_modules/.bin/tsx scripts/rehearse-push.ts
npm test -- tests/push-harness.test.ts tests/push.test.ts tests/device-push.test.ts tests/api.test.ts tests/cloud.test.ts --maxWorkers=2
./node_modules/.bin/tsc --noEmit
```

Observed locally: three payload-recording assertions failed before wiring the
recording transport; all 34 targeted tests (11 new harness cases) then passed.
TypeScript checking passed. The CLI passed six assertions and reported two
recorded payloads with `realDeviceDelivery: NOT TESTED`; it prints no device tokens,
endpoints or keys. Recreating the store in this harness reuses memory, not durable
hosting; the existing push suite separately covers local disk restart behavior.
The harness checks the 50-watch boundary and 90-day expiry, not full 1000-device
capacity, hosted behavior, browser unsubscribe or iPhone permission/arrival.

## Task 3 — authorized test database provisioning (October 17, 2026)

- [x] Verify the Water Alert organization is on Free and only one active project
  is visible before creation. These checks were repeated immediately before provisioning.
- [x] With separate explicit approval, create `WellPower WAVE Push Test` in
  `us-east-1`. Read-only API verification confirmed `ACTIVE_HEALTHY`, the expected
  organization and separation from the production project. This uses the second
  active-project slot; no paid plan or add-on was requested.
- [x] Preserve the new test-only password in `.env.push-test.provisioning`, verified
  gitignored, untracked and owner-only (`0600`). Never print or commit its contents.

At the end of provisioning, application connectivity and runtime permissions were
unverified. The separately authorized initialization results follow; this is still
not an HTTPS push test deployment.

## Task 3 — authorized test database initialization (October 17, 2026)

- [x] Revalidate the healthy isolated test project through the Management API and
  obtain its actual pooler configuration without printing credentials or URLs.
- [x] Apply the existing `server/migrations/001-cloud.sql` followed by
  `server/runtime-role.sql` to the clean test target. Initialize four private app
  tables, RLS and browser-role revocations. Generate a separate runtime password,
  configure its SCRAM verifier and enable only that test role's login.
- [x] Verify administrative session-pooler and runtime transaction-pooler login
  through `databaseOptions` with certificate and hostname checks enabled. The
  first attempt stopped before changes on an untrusted chain; the official CA,
  downloaded from Supabase Studio's published certificate URL, resolved it.
- [x] Verify runtime CRUD on all four tables in a rolled-back transaction;
  denied DDL/TRUNCATE, auth-user reads and administrator-role escalation;
  non-admin role flags, no memberships/ownership, all four RLS flags and denied
  anon/authenticated/service_role access. Confirm all app tables remain empty.
- [x] Run `npm test -- tests/database-access.test.ts tests/database-connection.test.ts --maxWorkers=2`:
  three tests passed. Recheck that `.env.push-test.provisioning`, now containing
  separate test runtime/admin URLs, credentials and base64-encoded CA material,
  remains gitignored, untracked and owner-only (`0600`). Never print its contents.

Database connectivity and these permission checks are verified against the hosted
test database, not an HTTPS application deployment. No production configuration,
hosting deployment, source checks, VAPID setup, push activation or notification
sends occurred. Test hosting, HTTPS app integration, concurrency/quota behavior and
real device delivery remained open at this gate. Separately approved hosting setup
follows; notification sends still require their own approval.

## Task 3 — authorized test hosting configuration (October 17, 2026)

- [x] Reverify the existing Vercel workspace as Hobby/free; create the separate
  `wellpower-wave-push-test` project with no Git integration or deployments.
- [x] Configure Vite, `npm run build`, `dist`, Node 24, Fluid compute, `iad1` and
  180-second function timeout. The project assigns
  `https://wellpower-wave-push-test.vercel.app`; this is not yet a deployed app.
- [x] Configure only its Production environment: `WATER_ALERT_CLOUD_ENABLED=true`,
  exact test origin, restricted test `DATABASE_URL`, `DATABASE_SSL_CA`, a separate
  random `CRON_SECRET`, and `WATER_ALERT_PUSH_ENABLED=false`. Store database/CA/cron
  as sensitive values; read back the three non-secret settings and confirm all six
  variables are Production-only. No Preview/Development, VAPID or browser variables.
- [x] Validate the exact test inputs locally through `cloudConfig` with push null;
  `npm test -- tests/config.test.ts tests/cloud.test.ts --maxWorkers=2` passes
  three tests. This does not prove a hosted function can connect to the database.
- [x] Verify zero test deployments. Keep the production `.vercel` link and `.env`
  untouched. Retain test project identifiers, assigned origin and cron secret in
  ignored owner-only `.env.push-test.provisioning`; never print its contents.

At the configuration gate, no deployment, source checks, scheduler, VAPID setup,
push activation or notification sends occurred. The separately approved deployment
and read-only HTTPS smoke verification follow.

## Task 3 — authorized isolated test deployment (October 17, 2026)

- [x] Stage an isolated source copy without private environment/key/data files;
  verify upload inputs and explicitly target only `wellpower-wave-push-test`.
  Keep the production checkout's project link and `.env` unchanged (hash-verified).
- [x] Pass local TypeScript/Vite build and 15 targeted tests:
  `npm test -- tests/hosting-smoke.test.ts tests/compiled-api.test.ts tests/config.test.ts tests/cloud.test.ts --maxWorkers=2`.
- [x] Deploy on Hobby without Git integration. Deployment
  `dpl_8nCQNq7oWCLUe4bXrFJ5KAwD81dR` is READY at
  `https://wellpower-wave-push-test.vercel.app`.
- [x] Run `npm run verify:hosting -- https://wellpower-wave-push-test.vercel.app`:
  all six checks pass (HTML, worker, database-backed status, disabled push,
  unauthenticated cron 401, foreign-origin 403; no-store throughout).
- [x] At `2026-10-17T20:00:43Z`, confirm empty test archive/events and production
  push still disabled with a null public key.

No authenticated cron/source checks, scheduler, VAPID setup, push activation or
notification sends. Basic hosted database integration is verified; concurrency,
failure recovery and phone delivery are not. Subsequent local-only key preparation
follows; hosted VAPID configuration, push enablement, enrollment and test sends
remain separately gated.

## Task 3 — authorized local test-only VAPID preparation (October 17, 2026)

- [x] Generate a separate key pair locally with `web-push.generateVAPIDKeys()`.
  Verify P-256 public/private encoding and derive the matching public key from
  the private key. Do not print either key.
- [x] Save `PUSH_TEST_VAPID_PUBLIC_KEY` and `PUSH_TEST_VAPID_PRIVATE_KEY` only in
  ignored, untracked, owner-only `.env.push-test.provisioning`. Do not upload
  this file or reuse the test keys for production.

At the local key-preparation gate, no hosted variables changed and no deployment,
push enablement or sends occurred. The subsequent approved contact/configuration
step follows. Notifications are not yet delivery-verified.

## Task 3 — approved test-only hosted VAPID configuration (October 17, 2026)

- [x] Use the user's approved mailto contact with the test-only keys; validate with
  `web-push.setVapidDetails` locally without sending. Keep the contact out of
  tracked documentation and retain it only in private provisioning configuration.
- [x] Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` as sensitive,
  Production-only variables in `wellpower-wave-push-test`. Verify scope/type and
  leave `WATER_ALERT_PUSH_ENABLED=false`. Do not copy these values to production.
- [x] Confirm unchanged deployment IDs and production local project link/`.env`;
  both live push-config endpoints still report disabled with null public keys.

At the hosted VAPID-configuration gate, no redeployment, push enablement, enrollment
or sends occurred. The separately approved test-only activation follows.

## Task 3 — authorized test-only push activation (October 17, 2026)

- [x] Before activation, verify the test database over TLS: zero devices and source
  captures. Validate enabled `cloudConfig`/VAPID inputs locally without sending;
  verify Hobby, isolated project and no Vercel cron definitions.
- [x] Change only the test project's Production push flag to `true` and redeploy
  the same verified application snapshot. Deployment
  `dpl_HRz4e2LSuy2mHPyS35fdFgitXp81` is READY at the existing test origin.
- [x] At `2026-10-17T20:06:58Z`, pass seven read-only checks: test HTML, worker,
  empty database archive/events, enabled test config with the matching test key
  compared privately, unauthenticated cron 401, foreign-origin 403 and disabled
  production push. Test responses are no-store. Production link/`.env` unchanged.

No enrollment, authenticated source checks, scheduler creation or sends occurred.
The disabled-push `verify:hosting` command must not be used unchanged to judge this
enabled test deployment. At activation, live baselines were absent; enrollment uses
stored live places, not merely the UI catalog. The separately approved baseline
check follows. Production activation remains separately gated.

## Task 3 — authorized single test baseline check (October 17, 2026)

- [x] Verify test target and TLS runtime connection; confirm zero devices, no
  captures or successful source baseline, and no archive/events before invocation.
- [x] Invoke the test app's authenticated `/api/cron` exactly once, without retry
  or scheduling. It performs one source-check cycle and an empty-device drain;
  no notification transport can run with zero enrolled devices.
- [x] Confirm both sources succeeded at `2026-10-17T20:10:07Z`: ADH 30 parsed
  records, ADEQ 52, one check each and no source errors. These are feed-record
  counts, not counts of active advisories.
- [x] Verify two schema-validated stored captures, 82 archive records, 65 stored
  live places and zero baseline events via TLS SQL/API. Confirm zero devices
  before/after, unchanged production link/`.env`, and disabled production push.

At the baseline gate, no notifications, enrollment, scheduler creation or production
changes occurred. One manual check does not establish ongoing cadence; freshness
will age without another approved check. The subsequent enrollment/single-send
steps follow; production activation remains separately gated.

## Task 3 — iPhone enrollment and one approved transport test (October 17, 2026)

- [x] User confirms the separate test Home Screen app opens without an address bar;
  selects Leisure Hills Mobile Home Park and Bentonville Water Utilities; enables
  notifications and supplies a screenshot reading “Subscription saved.”
- [x] Read-only TLS verification confirms one unexpired Apple push device with
  those exact choices, using `withPlaceCatalog` alongside stored observed places.
  The first send preflight stopped before transport because one choice was a
  catalog entry; this did not consume a send or change the device.
- [x] After explicit approval, invoke `web-push.sendNotification` exactly once with
  title `WAVE TEST ONLY`, body explicitly not an agency advisory, relative home
  URL, five-minute TTL and ten-second timeout. Apple's provider returns HTTP 201.
  No automatic retry. Save a private receipt with timestamp/status only, not
  subscription endpoints, encryption keys or bearer credentials.
- [x] User confirms notification display (“i got it!”), then confirms tapping
  opens the test app (“yes everyhign oppens”). One real iPhone arrival/tap-through
  is verified; foreground/background/locked-screen state was not established.

This is a direct transport test, not a synthetic official event or hosted
advisory-change/drain test. No source check, deployment, scheduler, production send
or activation occurred. HTTP 201 alone is provider acceptance; the subsequent user
confirmation separately establishes arrival/tap-through for this one test.
New/lift matching, closed-app arrival, preference changes, unsubscribe, recovery
and ongoing scheduled delivery still need separate controlled verification.

## Task 3 — Next alert-flow test preparation (October 17, 2026)

User approved preparation only, without notification sends. Remaining interactive
verification is grouped into three batches, not a claim that only three assertions
exist or that scheduled operation is already proven:

1. Future new and explicit-lift alerts through the advisory-change/drain path,
   including phone arrival with the Home Screen app closed and tap-through.
2. Saved watch/language changes plus failed-source suppression and recovery.
3. Browser unsubscribe and durable server removal, followed by suppression checks.

- [x] Added local `tests/cloud-push-flow.test.ts`. An authenticated cron request
  reads synthetic ADH/ADEQ feed responses through the real parser/store path into
  embedded PostgreSQL. Baseline produces no event; API enrollment precedes a
  future new notice and explicit lift; independent app instances share saved
  choices and claims and do not record duplicate payloads on repeated checks.
- [x] Injected recording-only sender; real `web-push.sendNotification` is guarded
  against invocation. Source responses are supplied locally, all HTTP requests
  target loopback, and no hosted credentials or database are loaded.
- [x] `npm test -- tests/cloud-push-flow.test.ts tests/postgres.test.ts tests/push-harness.test.ts --maxWorkers=2`:
  18 passed; `./node_modules/.bin/tsc --noEmit`: passed.

The hosted application/database were not changed, deployed or checked. No
notifications were sent. The local rehearsal does not complete the first phone
batch. Before any hosted fixture experiment, separately approve its exact scope,
test-only labeling, isolation from observed agency evidence, cleanup and send
budget; do not inject fictional advisories into the existing observed-source
history or treat a direct transport send as automatic pipeline proof. Production
activation and ongoing scheduling remain separate gates; Task 2's observation and
quota review are still open.

## Task 3 — Approved bounded verification batch (October 17, 2026)

User approved all three test groups together, including **up to two clearly
labeled test notifications**, preference/failure/removal checks and cleanup.
Production changes/activation remain excluded. Phone interactions still require
the user; provider acceptance is not a substitute for arrival confirmation.

- [x] Extended local cloud-path regression: Spanish preference update before a
  future lift, removed-watch suppression, no replay after resaving, failed source
  retaining prior evidence without fabricated events, recovery and durable
  idempotent removal across workers. `npm test -- tests/cloud-push-flow.test.ts tests/push-harness.test.ts tests/push.test.ts tests/device-push.test.ts tests/api.test.ts tests/postgres.test.ts --maxWorkers=2`:
  40 passed. TypeScript check passed.
- [x] Prepared a private temporary driver, outside the repository, with exclusive
  execution lock and write-before-send receipt. No automatic retry; maximum two
  distinct stages. Test subscription/VAPID data remain private. Test DB access is
  read-only, uses the restricted test role and verified TLS, and production's
  public config is checked disabled before each stage.
- [x] First stage: local authenticated cron → synthetic source parser → embedded
  PostgreSQL → actual cloud drain → one labeled English new-notice push to the
  existing test iPhone. Apple returned HTTP 201; a subsequent drain attempted no
  duplicate send. No hosted source check, mutation or deployment. Initial local
  key parsing stopped before any send, then was corrected; transport count is one.
- [x] User confirms first arrival while the phone was locked.
- [ ] Confirm test-app tap-through for this batch (earlier direct transport test
  tap-through was already confirmed).
- [x] User removes one test-app watch, enables explicit lifts for the remaining
  watch, selects Spanish and saves alert choices; verify hosted persisted choices.
  User reports settings updated, but second-stage preflight finds English/two
  watches/no lift selections and stops before any send. Read-only follow-up
  confirms one device, unchanged hosted advisory evidence and only the first
  accepted transport attempt. Ask user to save changes in the test app; do not
  overwrite choices or bypass the guard.
  After the user saved changes, preflight verified Spanish, one watch, matching
  lift selection, the same enrolled device and unchanged hosted advisory evidence.
- [x] Second stage: one labeled Spanish lift through the same isolated local
  cloud path; Apple returned HTTP 201. Repeated drain produced no duplicate
  attempt. Exactly two transport attempts in this batch; send budget exhausted.
- [x] User confirms second phone arrival. Second-send locked state was not
  separately reconfirmed; first-send locked arrival is established above.
- [x] User confirms subscription removed. Verified-TLS read-only query finds zero
  hosted test devices and unchanged hosted advisory evidence. Receipt confirms
  exactly two attempts, both HTTP 201. Removed the private local fixture DB,
  copied subscription, local bearer and temporary sender directory; retained only
  a redacted mode-0600 result receipt. No further sends. Test-project credentials
  remain private for authorized operations; test push remains configured with no
  devices and no test scheduler. Production push remains disabled.

**Boundary:** fictional advisory rows exist only in the private local PostgreSQL
rehearsal, not the hosted agency archive. The phone payload explicitly says test
only/not an agency advisory; its tap URL is the test-app home, not an invented
hosted notice detail. This combines the real cloud-app code path and real Apple
transport, but does **not** prove deployed Vercel execution or scheduled delivery.
Those claims and Task 2 remain open; this batch must not silently mark them done.

## Task 3 — Production activation authorization/preflight (October 17, 2026)

User explicitly authorized scoped production push configuration and deployment.
Read-only inspection verified the existing `water-alert` Hobby project, restricted
production database role and TLS, zero subscription records/recipients, disabled
public push and fresh error-free source snapshots (approximately 20:45:19Z;
about four minutes old at inspection). Existing journal contains two events;
no cron invocation, source mutation or replay was performed.

At preflight, no production VAPID keys/contact existed in local config or remote
Production variable metadata. The supplied email was explicitly test-only;
production reuse required the subsequent explicit contact approval below.
Use distinct production keys after contact approval. Keep local `.env`'s differing
local origin intact; configure the exact hosted production origin explicitly, not
by uploading the local environment wholesale. Recheck recipients immediately
before activation; stop for specific send approval if other recipients exist.
After any authorized activation, verify configuration/source/cron health read-only
and seek separate approval for a bounded production test to the user's own newly
opted-in device. Never infer reliable automatic delivery or elapsed observation
from activation alone.

### Production activation completed; delivery gates remain open

- User approved using the operator contact for production. Generated and validated
  a distinct production VAPID pair, stored only in ignored/untracked mode-0600
  `.env.push-production.provisioning` and sensitive Production-only Vercel settings.
  Enabled the production push flag; other settings and scheduler are unchanged.
- Rebuilt the prior production deployment's uploaded source, not the shared dirty
  checkout. New READY deployment `dpl_6LCVnamQNHzqwnxXmwbRSvi3kNoN` serves
  `https://water-alert-blond.vercel.app`. Existing UI asset references and local
  `.env`/project-link hashes remain unchanged. No application code/guards changed.
- At `2026-10-17T20:52:54Z`, seven read-only checks passed: HTML/worker, enabled
  public config with the exact production key, database status, no-store, cron 401
  and foreign-origin 403. Sources were healthy, last success approximately
  20:45:19Z (453 seconds old). Recent existing source/push job timestamps were
  inspected, not triggered; no five-minute reliability claim follows.
- Verified-TLS READ ONLY checks found zero production subscription records before
  configuration, before deployment and after activation. Two existing journal
  events remain; no manual authenticated cron, source mutation, replay or test
  send occurred. Fifteen targeted config/cloud/push tests passed.
- Production-device enrollment and separately approved bounded test are next.
  Prior test-phone evidence is not production-device delivery. Deployed scheduled
  advisory-to-push execution, day-long observation and quota review remain open.

### Approved production-device enrollment and one direct transport test

- User explicitly approved verifying their own production subscription and one
  labeled test. Repeated initial read-only checks found no production device.
  Screenshot showed saved choices; comparing both hosted databases and public
  source timestamps identified enrollment in the isolated test app (two devices
  at 21:07:04Z), not production. No deletion or send during diagnosis.
- At 21:08:59Z October 17, verified exactly one newly enrolled, unexpired Apple
  production subscription, English, with one watch and matching lift selection.
  Revalidated that same sole recipient and exact production VAPID key before send.
- Exactly one direct operator test labeled `WAVE PRODUCTION TEST ONLY` and explicitly
  not an agency advisory, with production-home tap URL, returned Apple HTTP 201.
  Private mode-0600 receipt was claimed before transport; no automatic retry.
  No synthetic hosted record, source mutation, manual cron or advisory drain.
- The October 17 test was confirmed delivered and opened WAVE Original; locked/
  background state was not separately established. No further send was authorized
  at that time. This remains a direct transport test, not a deployed automatic
  advisory-pipeline test. Keep
  day-long observation, quotas and remaining device/reliability gates open. The
  test environment also has newly saved subscriptions; do not assume it is empty
  or remove them without approval.

### October 22 separately authorized Safari transport test

- After the user confirmed enrollment on Safari, verified production device state
  read-only. There were two Apple subscriptions; the newest enrollment matched the
  user's current Safari setup. Revalidated the newest unexpired recipient, English
  locale, one watch, and matching production VAPID key. The older subscription was
  not contacted.
- The user explicitly asked to test a notification. Sent exactly one direct
  operator push to that newest Safari subscription, with title `WAVE test
  notification` and body `This is a test notification, not a water advisory.`
  Apple's push service returned HTTP 201 (accepted). No retry, fake advisory,
  database mutation, cron invocation or advisory drain was used. A redacted,
  mode-0600 receipt is retained at
  `test-results/production-push-test-20261022T143731340Z.json` (ignored locally).
- HTTP 201 alone did not establish display, but the user subsequently confirmed
  the notification appeared on their Mac. Tap-through was not confirmed. No further
  send is authorized by this one-test request; scheduled advisory delivery and
  reliability gates remain open.

- After the user confirmed the notification arrived on their Mac, a read-only
  production snapshot on October 22 found six retained real events, none newer
  than the newest enrollment and none within the preceding hour. No delivery
  attempts were recorded. Both agency snapshots were successful; the `sources`
  and `push` shared jobs had recently started. No cron/check endpoint was invoked.
  Thus the deployment and direct transport are confirmed, but an actual
  event-triggered production notification remains unverified. No synthetic event
  or additional test send was authorized.
