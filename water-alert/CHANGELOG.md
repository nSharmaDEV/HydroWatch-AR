# Water Alert changelog

Notable website, backend and hosting-configuration changes for the isolated
`water-alert/` app. This initial entry consolidates work completed locally on
October 13, 2026; it is not a commit-by-commit history or a release announcement.
The root `CHANGELOG.md` remains the history of the earlier HydroWatch apps.

## [Unreleased] — 2026-10-13

### 2026-10-19 — Two-line active notice context (local only; not deployed)

- Put affected area and reason on separate lines beneath the active supplier headline, retaining centered alignment, original source content and missing-field handling.

### 2026-10-19 — Source-backed active notice subtext (local only; not deployed)

- Add affected area and reason beneath the linked active supplier headline using each active ADH record, not hardcoded supplier text or generated advice. Preserve specific area/exception wording and reason text, use the existing exact whole-system display normalization, and omit missing fields. Multiple active notices remain separate; failed/stale source states do not present retained details as current.
- Localize labels in English/Spanish while marking unchanged agency text as English. Keep the ADH headline link and existing unavailable/no-notice explanations.
- Verified 294 unit/integration tests, 16 guarded English/Spanish browser cases, and the TypeScript/Vite build. No deployment.

### 2026-10-19 — Linked active supplier headline (local only; not deployed)

- Remove “Follow the official notice for instructions” from supplier cards and their information dialogs. Link the live active boil-water headline directly to ADH with a text fragment using the fetched agency supplier name; fictional sample headlines remain unlinked.
- Compatible browsers can highlight/scroll to the matching supplier; this does not reorder ADH's table or create an individual notice page. Unsupported browsers or missing matches fall back to the official list. Keep unavailable/no-notice explanations and source buttons unchanged.
- Verified 288 unit/integration tests, 16 guarded English/Spanish browser cases, and the TypeScript/Vite build. Read the current ADH page and confirmed its Leisure Hills row; cross-browser text-fragment scrolling is not guaranteed. No deployment.

### 2026-10-19 — Shorter supplier section actions (local only; not deployed)

- Remove the duplicate ADH profile link from the supplier-card Provider information section; retain the same directory destination under Service questions and on the standalone supplier profile. Keep annual reports and advisory-source links.
- Shorten the help section's action to “Open guide” / “Abrir guía” without changing its descriptive section title, navigation or return-focus behavior.
- Verified 285 unit/integration tests, 12 guarded expanded-layout/guide browser cases in English/Spanish at 320/390/1366px, and the TypeScript/Vite build. No deployment or real calls, emails or submissions.

### 2026-10-19 — Remove repeated supplier-card footer (local only; not deployed)

- Remove the requested published-notices/safety footer from supplier cards. Retain state-specific explanations and safety limitations in supplier information dialogs, history limits and other existing guidance; lake cards are unchanged.
- Audited section repetition without removing other content: the directory contact and ADH profile share a destination; history source icons repeat the main official-list destination; service/billing help reuses provider contacts. Verified 283 unit/integration tests and the TypeScript/Vite build.

### 2026-10-19 — Consistent provider disclosure icon (local only; not deployed)

- Replace the Provider information text glyph with the shared disclosure icon so its +/− size, weight and right alignment match the other supplier sections. Preserve visible keyboard focus and expanded-state behavior.
- Verified six disclosure tests, desktop/phone browser checks at 320/390/1366px comparing icon geometry and typography, and the TypeScript/Vite build.

### 2026-10-19 — Title-only supplier sections (local only; not deployed)

- Keep Service questions, water-issue help, Advisory history and Provider information as separate collapsed titles with individual + controls; do not add a More details wrapper. Move provider source links inside its expanded panel, preserving existing facts, provenance, contact destinations and help flow.
- Keep current status, source-check explanation, last successful check, check/source actions and safety caveat visible. Reopen the help section before restoring keyboard focus when returning from the guide. Lake cards and backend behavior are unchanged.
- Verified 283 unit/integration tests, 56 guarded desktop/phone browser cases and the TypeScript/Vite build. No deployment or real calls, emails or submissions. This supersedes the always-visible contact row and provider-header links described in the earlier entry below.

### 2026-10-19 — Approved supplier disclosure wireframes (local only; not deployed)

- Apply the three reviewed wireframes: compact Service questions row with directly linked ADH directory caption; advisory rows with dated facts, dotted-leader source icons and centered status banners; six-fact Provider information with source links visible in its header even when collapsed.
- Show five distinct saved notices at a time, newest agency-issued date first, with undated records last. Replace nested history details with one archive-limits footer. The info icon explicitly opens the general ADH list, not an individual historical notice. Keep supplier tools available separately.
- Preserve exact supplier/contact matching, original agency wording, explicit-lift requirements, unavailable/stale source behavior, fictional sample isolation and English/Spanish controls. No source-fetching, backend, routing, persistence or hosting changes; no real calls, emails or submissions.
- Verified 282 unit/integration tests and 56 guarded desktop/phone Chromium cases, including expanded EN/ES layouts at 320/390/1366px and keyboard disclosures; TypeScript/Vite build passes. Human Spanish review and real-device verification remain outstanding. The October 18 descriptions below record earlier iterations.

### 2026-10-18 — Visible contacts, scannable history and guided help (local only; not deployed)

- Show full verified phone/email links at every width, stacked and wrapping on phones; replace disabled missing-contact icons with visible explanations. Preserve exact supplier IDs, targets, sample isolation and the October 14 contact provenance date. The October 18 supplier-directory check reconfirmed phone only.
- Rebuild expanded advisory history around status, raw agency dates, affected area and reason. Keep one Notice details disclosure for full supplied fields, grouped missing fields and observation evidence; preserve archive filtering, pagination, uncertain status and explicit-lift semantics. Separate Provider information from a direct guided-help entry.
- Add a five-step English/Spanish guide for service, quality/health, consumer disputes and legal help, reusing the existing five draft kinds, per-template edits, local copy/download and preparation packets. Back/Next preserves drafts; context/language changes and leaving/reloading/closing can discard them. Loss warnings are informational, not confirmation dialogs or reload protection.
- Verify the non-emergency ADH Safe Water Engineering phone (501) 661-2623 against its official drinking-water plan-review page on October 18; check AG form/PDF and legal-help destinations read-only. Keep emergency guidance, agency jurisdiction/eligibility limits, AG business-sharing/public-record warnings and external-filing boundaries explicit. No new persistence, automated sending or case tracking.
- Verified under Node 24: 277 unit/integration tests across 37 files, 56 guarded desktop/phone Chromium cases, TypeScript/Vite production build and `git diff --check` pass. Inspected expanded EN/ES history/provider and guide screenshots at 320/390/1366px; tested keyboard focus, full email wrapping and navigation clearing the mobile bottom bar. Checked the running localhost:5178 sample guide without stopping the app.
- Local only: no deployment, real calls/emails, form submissions or notification sends. Human Spanish review and real-device delivery remain unverified. The older horizontal/icon-only contact description below records the prior local iteration, not the current layout.

### 2026-10-18 — Reference-matched supplier cards (local only; not deployed)

- Center supplier findings; use a 56px outline warning only for active notices. Fresh successful no-match findings have specific boil-water copy and no icon; unavailable explanations and retained historical evidence are unchanged.
- Emphasize the official source for active notices and Check now otherwise, with equal-width actions and a 12px gap. Add a dotted successful-check leader on desktop and readable stacked timestamps on phones.
- Replace contact glyphs with outline SVGs; preserve verified targets and accessible disabled explanations. Keep the service bar horizontal, use accessible icon-only contact controls on narrow phones, and remove the doubled history divider.
- Keep the complete water-safety qualification visible in every supplier state. Branding, column proportions, status calculation, persistence, recovery and notification logic are unchanged.
- Verified under Node 24: 270 unit/integration tests, 44 guarded desktop/phone Chromium cases, TypeScript/Vite build and `git diff --check` pass. Synthetic active/no-match/failed/stale/unchecked layouts cover 320/390/1366px; local EN/ES sample views were inspected. No real sends or deployment; human Spanish review and real-device delivery remain unverified.

### 2026-10-18 — Copy-cleanup regression follow-through (local only; not deployed)

- Kept the official-source escape visible for unmatched searches and made missing history issue dates explicitly unknown, without changing matching or observation semantics.
- Removed repeated lake coverage and Sources/notification disclaimers while retaining their distinct non-claims and official links.
- Final local verification: 265 unit/integration tests, 34 guarded desktop/phone Chromium cases, TypeScript/Vite build and `git diff --check` pass. Sequential reruns passed after simultaneous test/build activity hit timeouts; no timeout settings changed. No push or deployment performed.
- Inspected English mobile and Spanish desktop sample views in the local browser. Tests use synthetic records and block external requests/API mutations; real-device notification delivery and human Spanish review remain unverified.

### 2026-10-18 — WAVE concise copy (local only; not deployed)
- Consolidated English/Spanish status headlines, meaningful empty check times,
  notification state copy, and Home/Places/Settings introductions.
- Added closed coverage, observation and notification disclosures; grouped privacy
  facts and platform-relevant installation guidance. Deletion now requires an
  inline confirmation while retaining the existing failure/retry credentials.
- Verification completed as recorded above; no backend, matching, delivery or retention changes.
- Sources now groups live feeds, directory coverage and non-claims ahead of
  curated references. Detail and supplier history retain issue/lift evidence
  while app observation metadata moves into closed disclosures.

### WAVE card hierarchy and consistent disclosures (local only) — 2026-10-18

- Move Add a place to the My Water heading. Preserve the wave logo, navigation,
  language controls and original desktop column proportions. Use system typography,
  #102E43 headings, 16-pixel primary text/actions and 16-pixel white-card corners.
- Lead cards with provider/agency, tinted status and one explanation, actual last
  successful check with timezone, Check now using the existing refresh flow, and
  a prominent outlined official-source link. Never-checked wording is distinct
  from failed/stale sources; no advisory remains explicitly not proof of safety.
- Keep exact-ID verified contacts in one row on phone and desktop. Show a disabled,
  accessibly explained Email control where no email is verified; invent no targets.
  Keep full contact provenance and published facts within Provider details & help.
- Start Advisory history and provider help closed. Use decorative right-aligned
  +/− indicators for native and custom disclosures sitewide, without changing
  navigation, selects or external-link arrows. Keep recovery tasks, drafts,
  historical evidence, sample isolation and notification configuration unchanged.
- Verification: 250 unit/integration tests pass with one worker, 30 guarded browser
  cases pass, and TypeScript/Vite build passes. Review includes 320/390/1366-pixel
  layouts, contact alignment and keyboard disclosure toggles. Default parallel unit
  runs hit existing PGlite test timeouts; test configuration was not changed.
  No deployment, calls, emails, notification sends or delivery verification.
  Human Spanish review and real-device checks remain open.

### Source-first UI and bounded notification configuration (local only) — 2026-10-18

- Simplify onboarding to the published-advisory introduction and immediate supplier/
  lake choices. Keep the water-safety qualification visible; move acronym and
  coverage explanations into closed About WAVE disclosures.
- Put readable names, distinct statuses, last successful check with timezone and
  prominent official-source links ahead of secondary tools. Compact verified
  provider contacts, expand provenance on demand, and remove dotted fact leaders.
  Preserve published facts, unavailable/stale explanations and historical records.
- Reveal service-question, reimbursement, complaint and assistance editors only
  after task selection; retain follow-up, per-task edits, copy/download, draft-loss
  warnings and qualifications. Nothing is automatically sent or filed.
- Bound notification configuration checks to 10 seconds; expose loading, ready,
  unsupported, unavailable and error states with retry where applicable. Separate
  local preferences, browser permission and registration evidence from unverified
  delivery; do not imply connected email alerts.
- Keep persistent sample banners and concise fictional labels. Preserve the logo
  and navy/teal theme; improve phone/laptop alignment and 44-pixel language controls.
- Verification: 242 unit/integration tests, 28 guarded desktop/phone browser cases
  and TypeScript/Vite build pass. Browser checks cover onboarding, add/confirmation,
  navigation/history, template editing/downloads, sample scenarios/exit, source
  failures and 320/390/1366-pixel layouts. No deployment, real notification sends
  or new delivery verification; human Spanish review and real-device checks remain.

### Approved Task 5 production deployment — 2026-10-18

- Deployed the five approved UI/wording fixes to `water-alert-blond.vercel.app`,
  superseding their local-only status below. Isolated release preserves the
  deployed backend/scheduler/configuration and excludes unrelated checkout changes.
- Release snapshot: 219 unit tests, 24 guarded browser cases and local/remote
  builds pass. Public assets match tested bytes; enabled push config fingerprint
  is unchanged. Read-only HTTP and guarded production-browser checks pass.
  Deployment ID, evidence and remaining human/device/link limits are in `VERCEL.md`
  and `CAC-CHECKLIST.md`. No notification sends or scheduler/environment changes.

### Provider-contact disclaimer scope (local only) — 2026-10-17

- With user approval, clarify English/Spanish contact text: the site does not
  automatically call or email the provider. Remove the broader no-messages claim,
  which could contradict separately opted-in push. Contact destinations and push
  behavior are unchanged.
- Both new language regressions failed before the fix. All 232 Vitest tests,
  24 guarded browser tests and TypeScript/Vite build pass; four isolated rendered
  contact checks pass. `CAC-CHECKLIST.md` records the bounded review, retained
  unsaved-edit warning, privacy evidence and unresolved human/device/link limits.
  No deployment, contact actions, notification sends or scheduler changes.

### Missing saved-notice links (local only) — 2026-10-17

- With user approval, show an explicit English/Spanish unavailable panel when a
  saved notice ID or its place cannot be resolved, rather than leaving ordinary
  home/current notices visible. Preserve exact historical-record selection and
  offer return home; do not claim permanent deletion or substitute another notice.
- Missing-ID/place regressions failed before the fix; all 24 guarded E2E cases
  and TypeScript/Vite build pass. All 230 Vitest tests pass on sequential rerun;
  the earlier parallel run had one database-access timeout. Checklist records
  isolated browser evidence and real-device limits. Not deployed; no sends,
  production, scheduler or push changes.

### Spanish continuity into sample mode (local only) — 2026-10-17

- With user approval, preserve the current UI language when entering sample mode.
  Other sample choices stay isolated; exiting restores saved live preferences.
  No live/server push preferences, scheduler settings or production changes.
- New and saved sample-mode browser regressions failed before the fix and pass
  afterward. All 14 guarded E2E cases, 230 Vitest tests and TypeScript/Vite build
  pass. Not deployed. `CAC-CHECKLIST.md` records bounded Spanish UI checks,
  English-template/source distinctions and pending fluent-speaker/device review.

### Mobile keyboard-focus spacing (local only) — 2026-10-17

- With user approval, add bottom scroll margin to mobile input/select/textarea
  controls so keyboard focus clears the fixed navigation, including safe-area inset.
  No redesign, production, scheduler, push or storage changes.
- Added a Tab-to-draft-editor browser regression at 320/390/760px, observed failing
  before the CSS change and passing afterward. All 10 guarded E2E cases, 230 Vitest
  tests and TypeScript/Vite build pass on Node 24; fresh screenshots confirm the
  editor outline clears navigation. Not deployed or verified with a phone keyboard.
- `CAC-CHECKLIST.md` records bounded keyboard/dialog/label/non-color checks and
  remaining real-device, Safari and assistive-technology limitations.

### Tablet header overflow fix (local only) — 2026-10-17

- With user approval, reduce only the logo width at 761–900px to keep desktop
  navigation and language controls inside the header when scrollbars reserve space.
  Phone and full-desktop logo sizes, content, push and scheduler are unchanged.
- Added a browser regression at 761/768/820/900px with a stable scrollbar gutter;
  it failed before the fix and passes afterward. All eight guarded Chromium E2E
  cases, 230 Vitest tests and TypeScript/Vite build pass on Node 24. E2E used
  the existing isolated UI server through a temporary config without a webServer
  launcher. Browser-panel tablet retest no longer shows horizontal scrolling.
- Evidence and real-device/Spanish limitations recorded in `CAC-CHECKLIST.md`.
  No deployment, production changes, notification permissions or sends.

### One approved production-device test arrived and opened the app — 2026-10-17

- Enrollment troubleshooting used read-only verified-TLS queries. A saved-screen
  screenshot corresponded to the isolated test environment: at 21:07:04Z it held
  two subscriptions, production zero. Compared each public source timestamp to
  its database to confirm the environment mapping; no subscriptions were removed.
- After opening the canonical production Home Screen app, verified exactly one
  recent, unexpired Apple subscription at 21:08:59Z, with one watch, one explicit
  lift selection and English. User separately approved one labeled production test.
- Revalidated the exact production key and sole recipient, then attempted exactly
  one direct operator push labeled `WAVE PRODUCTION TEST ONLY`, explicitly not an
  agency advisory, linking to the production home. Apple returned HTTP 201. A
  private mode-0600 attempt receipt was written before sending; no retry, fake
  incident, source mutation, cron execution or advisory-drain invocation occurred.
  User answered “yes” when asked to confirm arrival and tap-through opening WAVE
  Original. Locked/background state was not separately established. This confirms
  this direct transport test, not the scheduled advisory pipeline or reliability.
  No application code changed; no additional send is authorized.

### Production push enabled and deployment verified — 2026-10-17

- User approved the operator contact for production. Generated a new VAPID pair
  distinct from test keys; saved it only in ignored, untracked mode-0600
  `.env.push-production.provisioning` and three sensitive Production-only Vercel
  variables. Enabled the existing production push flag; retained other settings.
- Rebuilt/redeployed the previous production deployment, not the shared dirty
  checkout: `dpl_6LCVnamQNHzqwnxXmwbRSvi3kNoN` is READY at
  `https://water-alert-blond.vercel.app`. Existing UI asset references, local `.env`
  and production project link are unchanged. No application code or guards changed.
- At `2026-10-17T20:52:54Z`, seven read-only checks passed: HTML/worker, enabled
  public config matching the distinct production key, database-backed status,
  no-store, unauthenticated cron 401 and foreign-origin 403. Both sources had
  error-free success timestamps approximately 20:45:19Z (453 seconds old).
  Verified-TLS READ ONLY queries confirmed zero production subscriptions before
  configuration, before deployment and after activation; two existing journal
  events remain. No manual authenticated cron, source mutation, replay or test send.
- Fifteen targeted config/cloud/push tests passed. Existing scheduler was not
  changed; recent job timestamps are point-in-time evidence, not a cadence or
  reliability guarantee. Production-device opt-in/delivery, deployed automatic
  advisory-to-push execution, day-long observation and quota review remain open.

### Production push activation preflight — 2026-10-17

- User authorized production-only push configuration/deployment. Before changing
  settings, verified the existing Hobby project and restricted production database
  with TLS and READ ONLY queries: zero subscription records/recipients, so no
  current broadcast target. Public config was disabled at preflight. Both source snapshots
  had successful checks at approximately 20:45:19Z, no errors, and were about
  four minutes old at inspection. Two existing journal events were not replayed.
- Production VAPID public/private keys and operator contact were absent both locally
  and in hosted variable metadata. The previously supplied email was approved for
  test use only; at this preflight, production contact approval was pending rather
  than silently reusing it. No keys generated, settings changed, deployment, cron
  invocation, source mutation or send at that point. Local `.env` retains its
  differing local origin and was not used as a production configuration bundle.
  Activation/delivery and day-long reliability/quota gates were not marked complete
  at preflight; subsequent activation evidence is recorded above.

### Approved bounded push verification batch results — 2026-10-17

- Extended the local cloud-path test with Spanish preference updates, removed-watch
  and historical replay suppression, failed-source evidence retention, recovery,
  and idempotent device deletion across app instances. Six targeted test files:
  40 passed; TypeScript check passed. No shipped application code changed.
- User approved up to two labeled test notifications plus preference/removal
  verification and cleanup. A private temporary driver uses the actual cloud-app
  cron/parser/drain path with fictional feeds and a private embedded PostgreSQL
  database; hosted advisory history is never populated with fixtures. Test-only
  credentials/subscription are read privately with verified TLS; real production
  push remains disabled. Driver records an attempt before transport, caps the
  batch at two, and will not retry an uncertain/failed send.
- First new-notice rehearsal: one Apple transport attempt accepted with HTTP 201;
  repeated drain produced no duplicate attempt. This is local cloud-code plus
  real provider transport, not deployed Vercel/scheduler end-to-end verification.
  User confirmed first arrival while the phone was locked. Initial lift preflights
  stopped before transport while server choices remained unchanged. After the
  user saved changes, verified Spanish, one watched place and its lift selection;
  sent the second labeled lift test through the same isolated cloud path. Apple
  returned HTTP 201; repeated drain produced no duplicate attempt. Batch transport
  count is two (budget exhausted); user confirmed the second phone arrival and
  subscription removal. Verified zero hosted devices and unchanged hosted advisory
  evidence using read-only TLS queries. Removed the private local fixture database,
  copied subscription, local bearer and temporary sender; retained only a redacted
  mode-0600 result receipt. Test-project credentials are retained privately for
  authorized operations; test push remains configured with no devices. An initial
  local credential-key parsing check stopped before any receipt or send and was
  corrected before the first transport attempt.

### Recording-only cloud alert-flow preparation — 2026-10-17

- Added `tests/cloud-push-flow.test.ts`: local cron authentication, synthetic
  agency-shaped feed parsing, embedded PostgreSQL persistence, device enrollment,
  future new/lift selection and duplicate suppression across independent app
  instances. The sender only records payloads; real `web-push` transport is guarded
  against invocation. No hosted credentials or database are used.
- Targeted rehearsal/PostgreSQL tests: 18 passed; TypeScript check passed. This is
  local preparation, not hosted advisory-triggered or closed-app iPhone delivery
  verification. No deployment, source fetch, hosted mutation or notification send;
  production configuration unchanged.

### One approved iPhone test push accepted by provider — 2026-10-17

- User installed the separate test Home Screen app, selected Leisure Hills Mobile
  Home Park and Bentonville Water Utilities, and provided a screenshot showing
  subscription saved. Read-only TLS checks confirmed exactly one unexpired Apple
  push device with those two choices; catalog entries were resolved alongside
  observed places. An initial preflight stopped before any send on that distinction.
- With explicit single-send approval, made exactly one direct `web-push` transport
  attempt titled `WAVE TEST ONLY`, with a non-advisory body and test-app home link.
  Apple's push service returned HTTP 201. No automatic retry, advisory injection,
  source check, deployment or production send. Private receipt contains no
  subscription endpoints, encryption keys or deletion credentials.
- User subsequently confirmed the notification arrived on the iPhone and tapping
  it opened the test app. This verifies one transport/display/tap-through case,
  not closed-app or locked-screen behavior (not established). It does not validate hosted
  advisory-change matching, scheduled drains, new/lift alerts or failure recovery.
  Updated `PUSH-PLAN.md`; production activation remains separately gated.

### One isolated baseline source check, no sends — 2026-10-17

- With explicit approval, verified zero test devices and no prior source baseline,
  then invoked the isolated test app's authenticated check exactly once. Both
  sources succeeded at `2026-10-17T20:10:07Z`: ADH parsed 30 records and ADEQ 52.
  These are parsed feed records, not counts of active advisories.
- Read-only TLS database/API checks confirmed two schema-validated captures,
  82 archived records, 65 stored places, one successful check per source, zero
  baseline events and zero devices before/after. No notifications were sent.
- No scheduler, enrollment or production changes. Production push remains disabled;
  a single manual check does not establish ongoing checking or delivery. Updated
  `PUSH-PLAN.md`; real iPhone enrollment and controlled arrival testing remain open.

### Push enabled only in isolated test deployment — 2026-10-17

- With explicit approval, enabled the test project's push flag and redeployed the
  same verified application snapshot as `dpl_HRz4e2LSuy2mHPyS35fdFgitXp81` (READY).
  Preflight verified TLS, zero enrolled test devices/captures, valid VAPID inputs,
  Hobby plan and no Vercel cron definitions. No test scheduler was created.
- At `2026-10-17T20:06:58Z`, seven read-only checks passed: test HTML, worker,
  database status, enabled push with the exact test key (compared privately),
  cron 401, foreign-origin 403 and production push still disabled. Test responses
  were no-store; archive/events were empty. Production local link/`.env` unchanged.
- No device enrollment, authenticated source checks or notification sends.
  Device arrival remains unverified. The push-disabled `verify:hosting` command
  no longer applies unchanged to this enabled test deployment. Updated operational
  state and next gates in `PUSH-PLAN.md` and `VERCEL.md`.

### Test-only hosted VAPID configuration, push still disabled — 2026-10-17

- Used the user's approved mailto contact with the previously generated test-only
  keys. Local `web-push.setVapidDetails` validation passed; added the three VAPID
  variables only to the isolated test project's Production environment as sensitive
  values. Retained contact/key material privately, not in tracked documentation.
- Verified variable scope/type, push `false`, unchanged deployment IDs and both
  live apps reporting disabled push with null public keys. No deployment,
  activation, device enrollment or notification sends; production local link and
  `.env` remained unchanged. Updated `PUSH-PLAN.md`; device arrival is unverified.

### Test-only VAPID keys prepared locally — 2026-10-17

- With explicit approval, generated a separate test-only VAPID key pair locally
  using `web-push`; verified P-256 encoding and that the private key derives the
  public key. Saved only to ignored, untracked, owner-only (`0600`)
  `.env.push-test.provisioning`, without printing either key.
- No hosted variables changed, deployment, push enablement or notification sends.
  An approved real contact email/HTTPS URL is still needed before configuration;
  device enrollment and verified arrival remain open. Updated `PUSH-PLAN.md`.

### Isolated test deployment and HTTPS smoke checks — 2026-10-17

- With separate deployment approval, published only `wellpower-wave-push-test` at
  `https://wellpower-wave-push-test.vercel.app`. Deployment
  `dpl_8nCQNq7oWCLUe4bXrFJ5KAwD81dR` is READY in the test project.
- Used an isolated temporary source copy and explicit test project targeting;
  private environment/key/data files were excluded before upload. The production
  checkout's local project link and `.env` hashes remained unchanged.
- Local TypeScript/Vite build and 15 targeted hosting/compiled-API/config/cloud
  tests passed. All six public HTTPS smoke checks passed: HTML, worker JavaScript,
  database-backed status, disabled push, cron 401 and foreign-origin 403, with
  no-store responses. At `2026-10-17T20:00:43Z`, test archive/events were empty;
  production push still reported disabled with a null public key.
- No authenticated cron/source checks, scheduler, VAPID setup, push activation or
  notification sends. Hosted concurrency, failure recovery and real phone delivery
  remain unverified. Updated `VERCEL.md` and `PUSH-PLAN.md` with this deployment gate.

### Isolated Free test hosting configured, not deployed — 2026-10-17

- Reverified Vercel Hobby and created the separate `wellpower-wave-push-test`
  project without Git integration or deployment. Configured Vite, `npm run build`,
  `dist`, Node 24, Fluid compute, `iad1` and a 180-second function timeout.
- Configured six Production-only variables: isolated restricted runtime database
  URL, verified-TLS CA, a new test-only cron secret, cloud enablement, the assigned
  test origin and explicit push `false`. Database/CA/cron values are sensitive;
  the three non-secret settings were independently read back. No VAPID variables.
- Local runtime configuration validation and three targeted configuration/cloud
  tests pass. API inventory confirms zero test deployments; no scheduler or sends.
  Existing production local link/environment stayed unchanged, and its public push
  configuration still reports disabled with no public key. Updated `PUSH-PLAN.md`
  and `VERCEL.md`; HTTPS app/database integration and phone delivery remain untested.

### Isolated test database initialized and verified — 2026-10-17

- With separate setup approval, applied the existing `001-cloud.sql` and
  `runtime-role.sql` only to `WellPower WAVE Push Test`. Four private app tables
  have RLS enabled; the runtime role has CRUD access but no administrative flags,
  table ownership or role memberships. Enabled its login with a separate test-only
  password, using a client-generated SCRAM verifier rather than plaintext SQL.
- Initial TLS verification stopped before changes because the default trust store
  lacked Supabase's CA. Downloaded the official CA from the URL used by Supabase
  Studio; administrative session-pooler and runtime transaction-pooler connections
  then passed certificate/hostname verification. No TLS verification was disabled.
- Hosted checks passed CRUD on all four tables with synthetic writes rolled back;
  denied runtime DDL, TRUNCATE, auth-user reads and administrator-role escalation;
  denied anon/authenticated/service_role access. All four tables remain empty.
  Three targeted local database-access/connection tests also pass.
- Test credentials, URLs and CA material remain in the gitignored, untracked `0600`
  provisioning file. No production changes, hosting deployment, source checks,
  VAPID setup, push activation or notification sends. HTTPS app integration,
  test-hosting isolation and real phone delivery remain unverified.

### Isolated Free test database provisioned — 2026-10-17

- With explicit resource-creation approval, rechecked the Water Alert organization
  as Free and one active visible project, then created `WellPower WAVE Push Test`
  in `us-east-1`. A read-only API check confirmed `ACTIVE_HEALTHY`, the correct
  organization and a project distinct from production.
- Generated a separate test-only database password, stored locally in an untracked,
  gitignored owner-only (`0600`) provisioning file. No credentials were printed.
- Provisioning only: no application schema migration, runtime-role setup, hosting
  deployment, VAPID setup, push activation or notification sends. Production was
  not changed; phone delivery and test database application connectivity are unverified.

### Isolated recording-only push rehearsal — 2026-10-17

- Added a local harness using fresh in-memory stores, clearly synthetic notices,
  fixed subscription fixtures and a recording-only transport. No environment files,
  production data, real subscriptions or notification transport are loaded.
- Added `scripts/rehearse-push.ts` with baseline/failure suppression, future new/lift,
  restart deduplication and removal assertions. Output contains counts/check names,
  not subscription endpoints, keys or bearer credentials. Usage is in `PUSH-PLAN.md`.
- Three new payload-recording assertions failed before transport wiring; 34 targeted
  harness/push/device/API/cloud tests now pass, including 11 new harness cases.
  TypeScript checking and the CLI rehearsal pass. Tests include stale/unknown/missing
  suppression, Spanish updates, unwatched/lift choices, expiry and 50-watch limits.
- Local only: no resources, VAPID setup, deployment, production activation or sends.
  Not an HTTPS/device test harness; real iPhone opt-in/delivery/browser unsubscribe
  and hosted/full-capacity behavior remain unverified. Production push stays disabled.

### Repair Cloudflare scheduler redirect compatibility — 2026-10-17

- Reproduced Cloudflare workerd rejecting `redirect: 'error'` before any outbound
  request. Use supported `manual` mode; existing non-2xx rejection also rejects
  redirects without following them or forwarding the bearer credential.
- Watched two regression assertions fail before the fix. All six scheduler tests,
  all 218 Vitest tests and TypeScript/Vite build pass locally. Ad-hoc workerd checks
  of the actual repaired module pass for 200, five redirect statuses and 503 using
  synthetic responses, with zero external requests. No dependency or UI changes.
- With separate explicit deployment approval, deployed Worker version
  `f3cc8086-68bd-449b-9813-7397fad042cf`. At 18:21:05 UTC, read-only API checks
  confirmed the unchanged five-minute schedule, enabled exact origin, retained
  private secret and disabled public/preview URLs. The natural 18:25 UTC run
  completed `ok` with no exceptions; read-only PostgreSQL checks confirmed new
  successful ADH/ADEQ retrievals and validated captures matching public status.
  Push remains disabled. One run does not establish laptop-off/day-long reliability.

### Approved scheduler activation configuration — 2026-10-17

- Following explicit activation approval, set `ENABLED=true` for the five-minute
  Cloudflare Worker and exact production origin. Public/preview URLs stay disabled;
  no secret is committed. Updated the configuration test after observing its
  expected failure against the disabled setting; all five scheduler tests pass.
- Deployed version `4d16daed-7bcb-4a17-841c-8f42358f4f2f`. At 17:51:07 UTC,
  Cloudflare API confirmed the five-minute schedule, enabled setting, retained
  private secret and disabled public/preview URLs. Production push remains disabled.
  Successful retrieval, laptop-off operation and day-long reliability remain open.

### Prepare disabled scheduler origin — 2026-10-17

- With setup-only approval, set the scheduler's exact production origin to
  `https://water-alert-blond.vercel.app`; retained `ENABLED=false`. No secret is
  stored in tracked configuration. After user login and confirmation of Workers
  Free, uploaded the disabled Worker and secret with no cron triggers. CLI reported
  a partial-trigger/account-setup error; read-only API checks confirmed disabled
  state, zero schedules, private secret binding and disabled public/preview URLs.
  Activation and successful authenticated production invocation remain unverified.

### Repair automated browser journey checks — 2026-10-17

- Added dedicated Playwright discovery/configuration so `npm run test:e2e` no
  longer imports Vitest suites. Starts a separate UI-only Vite server without
  API proxying or env-file loading; no application behavior or logo changes.
- Added deterministic synthetic-incident journey tests at desktop and phone-sized
  Chromium widths: exact supplier confirmation, saved-notice selection, agency
  and provider link targets, copy/download/email draft content, memory-only edits,
  logo loading and page overflow. Failed/stale sources remain unavailable.
- All six browser cases, 217 Vitest tests and TypeScript/Vite build pass locally
  under Node 24. External/unexpected API requests are blocked and asserted absent;
  no private records, production contact, sends, deployment or activation.

### Supplied teal-wave logo integration — 2026-10-16

- Replaced the header's generic water drop/text with the supplied WellPower: WAVE
  logo, keeping its accessible home-button name and responsive sizing. Preserved
  the original image in `assets/wave-logo-source.png`; the source outside this app
  is untouched. Trimmed transparent margins and faint export speckles for display.
- Generated wave-only 32 px favicon, 192/512 px maskable PWA PNGs and 180 px Apple
  touch icon on white backgrounds. `npm run icons` reproduces these from the supplied
  source. Removed the old SVG from manifest references, not from the repository.
- Verified two new tests fail before implementation; all 217 tests and the build
  pass under Node 24. Local browser checks at 320/390/800/1440 px confirmed the logo
  loads, no document overflow and separation from the language controls.
- Local only; no deployment, installed-device icon verification, notification
  activation or sends. Storage keys, manifest identity/scope and source behavior
  are unchanged.

### Read-only release review and logo concepts — 2026-10-16

- Added a dated hosted release/secrets review: six public smoke checks pass, but
  agency observations are stale and opening the app only reads stored observations.
  Recorded bounded secret-scan evidence, zero production dependency advisories and
  remaining hosted verification gates; no credentials are included.
- Added three standalone WellPower: WAVE logo concepts for user selection. Existing
  header, favicon, app/notification icons and manifest remain unchanged.
- Review/design artifacts only; no runtime/config changes, deployment, source-check
  invocation, scheduler activation or notification sends.

### Approved WellPower: WAVE branding — 2026-10-16

- Integrated the approved name and Water Advisory Verification & Empowerment purpose
  into the header, welcome and settings pages, browser/install metadata, share title
  and unreadable-notification fallback title. Added English/Spanish clarification
  that verification is not water testing or safety certification; Spanish review pending.
- Preserved storage keys, saved watches, manifest identity/scope, source guardrails
  and notification configuration. No deployment, activation or notification sends.
- Added five regression tests, including mocked share/worker checks (not delivery
  evidence). All 215 tests pass with `npm test -- --maxWorkers=2`; build passes under
  Node 24. The initial default-parallel run timed out on one existing journey test.
  Local UI-only browser preview confirmed the name and EN/ES purpose at mobile size;
  no hosted or real-device installation/delivery verification is claimed.

### Restore local backend startup — 2026-10-14

- Recovered the missing observation-store implementation from repository history,
  preserving existing records, check evidence and failure handling. Used `.js`
  relative imports for compatibility with emitted native Node ESM.
- Verified all 210 tests and the full TypeScript/Vite build locally under Node 24.
  No deployment or notification-delivery claim.

### Supplier help and preparation toolkit — 2026-10-14

- Added a visible supplier-details/tools entry and exact-record navigation from
  supplier alert history, without replacing current status with an archived notice.
- Added local editable credit/reimbursement, follow-up, AG-complaint and legal-help
  templates, copy/text downloads and a preparation pack. Verified provider email
  drafts open only for provider templates; no automatic sending, filing or uploads.
  Draft edits are memory-only and lost when leaving the page/reloading.
- Added curated official complaint/legal-help/report references, a verified Leisure
  Hills directory profile (not live measurements or compliance findings), and
  separately attributed general CDC boil-water excerpts. English/Spanish controls;
  English templates and quotations remain explicitly labelled originals.
- Local implementation only; not deployed. No compensation, liability, jurisdiction,
  water-safety or notification-delivery guarantees. Existing two-feed status and
  failure rules remain unchanged.

### Initial Vercel deployment and compiled-runtime fix — 2026-10-14

- After confirmed private runtime-password rotation and a verified read-only TLS
  connection, configured six production-only Vercel variables privately. Cloud
  backend enabled; push explicitly disabled. Generated the cron bearer privately
  and retained it only in ignored `.env` plus Vercel's production secret store.
- Initial deployment published the frontend at `https://water-alert-blond.vercel.app`.
  Hosted checks revealed native Node ESM could not resolve extensionless API/backend
  imports, despite the successful Vercel build. Added a regression that emits the
  API with TypeScript and loads it using native Node, reproducing the hosted failure.
  Updated the cloud dependency graph to explicit `.js` specifiers, which resolve
  to TypeScript locally and emitted JavaScript in production.
- Redeployment fixed invocation: all six hosted smoke checks pass, including HTTPS,
  routing/no-store, disabled push, cron 401 and foreign Origin 403. Wrong cron bearer
  returned 401; private authenticated invocation returned 200. Both approved feeds
  parsed successfully at `2026-10-15T01:57:03Z` (Oct 14 local); read-only SQL confirmed
  two validated captures, 82 persisted archive records and zero baseline events.
  Parsed records are not counts of active advisories. Node 24: 195 tests/build pass.
- Updated operation docs with the production URL and actual verification. No
  scheduler activation, VAPID setup, synthetic live notices or external notification
  sends. Cold-start concurrency/load, laptop-off scheduling and device delivery
  remain unverified and separately gated.

### Hosting preflight and upload safeguards — 2026-10-14

- Pinned Node 24 and the Vercel function region to `iad1`, matching the existing
  us-east-1 database. Added explicit Vercel upload exclusions for environment/key
  files, local records and development artifacts.
- Added `npm run verify:hosting -- https://canonical-host`: read-only checks for
  initial HTTPS/HTML/worker/API routing, no-store, push disabled, unauthenticated
  cron rejection and foreign-origin rejection. It sends no bearer credential,
  triggers no source retrieval and prints no upstream bodies/error details.
- Verified locally on Node 24.22.0: 194 tests (11 new smoke-check regressions) and
  production build pass. Dependency lock metadata updated; audit reported no known
  vulnerabilities. No remote settings, deployment, scheduler, VAPID or device sends.
- Initial push-disabled deployment approved conditional on private credential
  rotation after a prior tool-output exposure. User confirmed rotation is not yet
  done and requested deployment be paused;
  corrected operation docs distinguish provisioned resources from pending hosted,
  laptop-off and real-device verification. No secret values were added to docs.

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
