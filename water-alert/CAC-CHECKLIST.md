# CAC readiness — WellPower: WAVE

Scope: `water-alert/` only. Updated October 17, 2026. This records approved
decisions separately from demonstrated release readiness; it does not certify
eligibility, delivery, deployment, usability, or submission.

## Task 1 — Lock release scope (guided decisions)

- [x] Final name approved: **WellPower: WAVE** — **Water Advisory Verification & Empowerment**.
  Evidence: user selected “WellPower: WAVE” and approved this expansion in the
  guided scope session on October 16. Spelling normalized from the chat.
  Name approval alone is not evidence of implementation or deployment; see below.
  “Verification” must not imply water testing or certification of safety.
- [x] One-sentence purpose approved: “WellPower: WAVE—Water Advisory
  Verification & Empowerment—helps Arkansas residents check official advisories
  for their exact water supplier and take informed action through verified
  provider contacts and editable follow-up or reimbursement requests.”
  Evidence: user approved this wording in the guided scope session on October 16.
- [x] Integrate the approved name and purpose into the app (local, October 16).
  Evidence: header, welcome/settings EN/ES purpose and non-certification clarification,
  browser/install metadata, share and fallback notification titles; five tests in
  `tests/branding.test.tsx`. Node 24: all 215 tests pass with
  `npm test -- --maxWorkers=2`; `npm run build` passes. Initial default-parallel run
  had one existing journey timeout; no timeout/test configuration was changed.
  Local UI-only mobile preview confirmed name/purpose and ES switching.
  Storage keys and records preserved. Not deployed; installed-device name refresh
  and Spanish human review remain unverified. No sends or activation authorized.
- [x] Primary demo journey approved: choose exact water supplier → open its
  official notice → find verified provider contact details → edit and download
  a follow-up or reimbursement request.
  Evidence: user selected “Approve this journey” in the October 16 guided session.
  This approves the path; it is not evidence of a completed release rehearsal.
- [x] Push release policy approved: ship only with verified real-device delivery
  in Task 3; otherwise keep disabled with honest check-on-open/manual refresh
  wording and no delivery claims. Saved preferences are not delivery evidence.
  Evidence: user selected “Ship only if verified” in the October 16 guided session.
  Delivery remains unverified; this decision does not authorize notification sends.
- [x] Feature freeze approved: no new features except the approved branding
  integration, main-journey fixes, and push only if verified under the approved
  delivery gate.
  Evidence: user answered “yes” to this scope in the guided session on October 16.
- [x] Exclusions approved: accounts/login, water-quality prediction, automatic
  complaint filing, and additional live feeds stay out of this release.
  Evidence: user selected “Approve exclusions” in the October 16 guided session.

Ask each unchecked decision separately; do not infer approval from this list.

## Task 2 — Hosted reliability (guided evidence)

Session: `ses_eb833f8d0ffe5JM3RKACDq6O8j`; review recorded October 16, 2026.
Only this app is in scope. Approval does not demonstrate completion.

1. [x] Bounded local release-diff and secret/configuration review.
   Approval: after initially selecting “Revise,” user said “just go thru it for me.”
   Interpreted as permission to begin this review, not deployment or activation.
   Evidence: inspected current diff (31 tracked changed app files), 15 untracked
   app paths, branding/toolkit source, API/cloud configuration, upload exclusions,
   and scheduler source. No runtime/configuration edits or tests performed here.
   Scanned 132 text app/artifact files, excluding dependencies, private state,
   platform metadata and credential files. No exact matches for local DATABASE_URL
   or CRON_SECRET; six credential-URL pattern hits were synthetic `.example`
   fixtures in database-connection, hosting-smoke, free-scheduler and cloud tests.
   No checked private-key/provider-token patterns found. `.env` is mode 0600;
   env, platform project metadata, device state and scheduler `.dev.vars` paths
   are gitignored. Tracked `.env.example` has no nonempty secret assignments.
   Values were not printed. This is not a full security certification or history,
   remote environment, provider-log, database-grant or deployed-artifact audit.
   Source inspection confirms production-only explicit cloud enablement, verified
   database TLS, generic API initialization errors, exact-origin mutation checks,
   cron bearer checks, UI env-file loading disabled, and local scheduler disabled.
   These are source findings, not new hosted verification.
   Remaining release concern: opening/polling reads saved observations; manual
   refresh requests agency retrieval (`src/ConnectedApp.tsx:9–24`). Freshness ages
   to unavailable after 15 minutes (`src/domain.ts:28–32`). No automatic agency
   check-on-open or continuous-checking claim is supported. Earlier hosted findings
   in `docs/hosted-release-review-2026-10-16.md` were read, not rerun; its unchanged
   branding statement describes that earlier snapshot, not the current local UI.
   Prior credential rotation is user-reported in VERCEL.md, not independently
   reverified. Preserve all shared-checkout work and records.
2. [x] Full local tests/build — original browser-test gap repaired October 17 below.
   Approval: user selected “Approve (Recommended)” for local verification only.
   New evidence on Node 24.22.0: `npm test -- --maxWorkers=2` passed all 215 tests
   in 31 files (36.89 seconds); `npm run build` passed TypeScript and Vite
   (60 modules; JS artifact `dist/assets/index-vEhGe_Mb.js`). No test settings
   or application code changed. `npm run test:e2e -- --list` failed with exit 1:
   Playwright discovers Vitest files and reports suite-context errors and zero
   browser tests. No Playwright config or dedicated `.spec.*` files were found.
   Do not represent this as passing browser E2E coverage. Recommendation: hold
   deployment pending browser verification or explicit acceptance of this gap;
    any implementation repair requires scoped approval and a dated changelog entry.
    Additional approved local-browser evidence, October 17: current checkout,
    including the other session's logo, passes TypeScript/Vite build to a temporary
    directory. Ad-hoc Chromium checks at 1440×900 and 390×844 passed exact Leisure
    Hills selection/confirmation → saved notice via alert history → agency/contact
    link targets → editable reimbursement and follow-up downloads (contents checked),
    clipboard copy, email-draft URL encoding, and loss of draft edits on reload.
    Logo loaded at both widths; no horizontal page overflow or page exceptions.
    Used existing local `data/live/observations.json` read-only, not a new agency
    retrieval. Browser interception blocked all non-local requests; zero external
    requests or API mutations occurred. Agency/contact/email links were inspected,
    not opened; no calls, sends or production contact. No application code changed.
    This is bounded ad-hoc browser evidence, not a repair of `npm run test:e2e`,
    independent contact re-verification, real-phone testing or hosted verification.
    Subsequent explicit approval: “Repair the automated browser E2E command so it
    can run the journey checks.” Added dedicated Playwright discovery and an
    isolated UI-only Vite configuration; no application behavior/logo edits.
    `npm run test:e2e -- --list` now lists six cases, not Vitest suites.
    `npm run test:e2e` passes all six cases (2.8 seconds): exact synthetic-incident
    journey plus failed/stale-source checks at desktop and phone-sized Chromium
    widths. Fixed clock, synthetic observations, service workers blocked, no
    external/unexpected API requests, private-data reads or sends. All 217 Vitest
    tests in 31 files pass; TypeScript/Vite build passes under Node 24. No dependency
    changes. This closes the local browser-command gap, not hosted/real-device gates.
3. [x] Deployment — initial hold superseded by explicit “Approve deployment” at
    the renewed gate on October 17. No release inputs were newer than the last
    passing build. Published to the existing linked project with `vercel --prod`;
    deployment `9MVBydK2eJcfdBEMPmQPzAhjKxvN`, canonical alias
    `https://water-alert-blond.vercel.app`. Remote TypeScript/Vite build passed;
    public HTML serves the tested `index-BLDV0n4t.js` artifact. At
    `2026-10-17T17:21:31Z`, public push configuration remained disabled with no
    public key. No environment settings changed. CLI environment downloads return
    sensitive-value markers, not verifiable values; temporary files were removed
    without printing contents. Scheduler, sends and failure injection not approved.
4. [x] Bounded public checks — user explicitly selected “Approve public checks.” October 17
    hosted Chromium checks passed at 1440×900 and 390×844: exact Leisure Hills
    confirmation → actual saved notice → agency/curated-contact link targets → both
    editable request/follow-up drafts, clipboard, downloaded contents and encoded
    email body; draft edits disappear on reload. Logo loaded; no horizontal overflow
    or page exceptions. Ten same-origin GETs per journey; all non-GET/external
    requests guarded, none attempted. No agency refresh, server preference write,
    contact-link opening, permission request or send. Contacts not independently
    reverified. Screenshots retained in session temporary storage as
    `wave-hosted-{desktop,phone-sized}.png`.
    All six `verify:hosting` checks passed (HTML/worker/API routing and no-store,
    push disabled, unauthenticated cron 401, foreign Origin 403). Invalid bearer also
    returned 401. Public status contained none of the checked device/subscription,
    token/secret, raw-source or IP field names. Private env/device/platform paths
    returned 404 or SPA HTML, not private file contents. This is bounded privacy
    evidence, not a full audit. User subsequently supplied real-phone screenshots
    and identified iPhone 11 / Brave: toolkit buttons fit the shown screen and the
    request draft opened as readable text with the Leisure Hills saved-notice
    reference, placeholders and cautions. This supports phone rendering/file-open
    evidence only; editing, clipboard, follow-up download, installation and push
    were not independently demonstrated on that phone. No iOS/browser version was
    supplied. Current saved observations do not prove fresh retrieval or scheduled
    checking; viewport emulation remains separate from this user-supplied evidence.
5. [x] Scheduler configuration/authentication — user selected “Approve setup only”
    on October 17; activation requires a separate approval. Set the local exact
    production origin while retaining `ENABLED=false`; five scheduler tests pass.
    User completed OAuth login and confirmed Workers Free in the dashboard.
    Created `water-alert-scheduler` with the existing private local CRON_SECRET
    through a temporary mode-0600 secrets file (removed without printing values).
    Deployment used an explicit empty cron list, not the tracked five-minute plan.
    CLI uploaded the Worker but exited with a partial-trigger error 10063: account
    needs initial workers.dev subdomain setup. Subsequent read-only API checks
    confirmed `ENABLED=false`, exact origin, CRON_SECRET as a secret binding, zero
    schedules, and both public/preview URLs disabled. No paid plan or activation.
    Subsequently, the user screenshot showed completed subdomain onboarding and
    explicitly answered “yes” to activation. Deployed version
    `4d16daed-7bcb-4a17-841c-8f42358f4f2f`; read-only API verification at
    2026-10-17T17:51:07Z confirmed `ENABLED=true`, exact origin, retained private
    secret binding, and registered `*/5 * * * *` schedule (created 17:50:58Z).
    Public/preview URLs remain disabled; production push is still false/null.
    Five scheduler tests pass after a test-first configuration update. Successful
    authenticated invocation/secret match is now supported by the successful
    post-repair scheduled retrieval evidence at step 6;
    registration alone does not prove successful checking or laptop-off operation.
 6. [x] Scheduled retrieval verified after repair; initial verification failed in the approved bounded read-only
     observation on October 17. Cloudflare emitted the `*/5 * * * *` event at
     approximately 18:00:19Z with outcome `exception` (one exception); this proves
     trigger execution, not a successful authenticated source check. At
     18:00:22Z, verified-TLS PostgreSQL reads in a READ ONLY transaction showed
     both agencies' latest successful retrieval still at 17:34:24Z, before
     activation. Public API snapshots matched durable records; capture metadata
     and the source job timestamp were also unchanged. No manual refresh or
     notification send was performed. Exception details/cause were not collected;
     scheduler authentication and successful retrieval were then unverified. Sanitized
     session evidence: `wave-scheduled-verification-ses-eb833f8d.json` in approved
     temporary storage. Do not claim continuous checking from this result.
     Subsequent approved read-only diagnosis captured `Scheduled check failed` at
     approximately 18:15:19Z. Exact settings and deployed request code were checked;
     available Vercel logs showed no cron request in the failed-run window. Local
     workerd reproduced the cause: `redirect: 'error'` is unsupported and throws
     before sending. After the user asked to fix it, changed only request redirect
     mode to `manual`; non-2xx responses still fail, so redirects are never followed.
     Two regression assertions failed before the fix; all six scheduler tests,
     218 Vitest tests and TypeScript/Vite build pass. Ad-hoc workerd checks of the
     repaired module verify 200 succeeds and 301/302/303/307/308/503 fail with one
     synthetic request each, no external requests. Subsequently, user selected
     “Approve deployment” for the scheduler-only repair and next-run observation.
     Deployed version `f3cc8086-68bd-449b-9813-7397fad042cf`; read-only API checks
     at 18:21:05Z confirmed unchanged cron, enabled exact origin, retained private
     secret and disabled public/preview URLs. Push-disabled guard passed before
     deployment. The next observed natural scheduled event at approximately
     18:25:19Z completed `ok` with zero exceptions. At 18:25:22.704Z, verified-TLS
     READ ONLY PostgreSQL queries confirmed ADH success/retrieval at
     18:25:20.201Z (30 records) and ADEQ at 18:25:20.210Z (52 records), both with
     no error and a new successful check journal entry. Schema-validated capture
     timestamps matched; source/push job leases were released. Public GET status
     exactly matched both durable source snapshots; push remained false/null.
     Sanitized evidence: `wave-scheduler-repair-verification-ses-eb833f8d.json`
     in approved temporary storage. No manual cron invocation, Vercel deployment,
     secret change or notification send. This verifies one successful scheduled
     run, not laptop-off operation, day-long reliability or advisory accuracy.
7. [x] Bounded laptop-off check — user reported shutdown approximately 1:30 p.m.
   and resumption 2:00 p.m. in Arkansas on October 17 (CDT; 18:30–19:00 UTC).
   At 19:01:06Z, verified-TLS READ ONLY PostgreSQL queries showed successful
   ADH and ADEQ journal entries at approximately 18:35, 18:40, 18:45 and 18:55 UTC
   within that reported interval (30 and 52 records respectively). Public status
   matched durable snapshots; push stayed false/null. This supports checking while
   the user's laptop was reportedly off, not independently verified power telemetry.
   No journal entries at 18:30 or 18:50; a ten-minute retrieval gap is visible, so
   do not claim an exact uninterrupted five-minute retrieval cadence. No manual
   refresh, settings change or notification send. Day-long reliability remains open.
8. [ ] Day-long observation and quota evidence pending; no elapsed claim made.
9. [x] Controlled local failed/stale/disappeared-source checks — user approved
   local-only verification on October 17. Targeted existing domain, server,
   journey, source-check UI and supplier-history suites: 56 tests passed.
   Synthetic failed/stale browser checks passed in desktop and phone-sized
   viewports (4 cases). Failed/stale snapshots remain unavailable; prior records
   are retained without fresh-success claims. Disappearance does not create a
   lift event or erase notice history; UI tests preserve historical/unverified
   treatment rather than an all-clear. No implementation changes or production
   failure injection; browser external requests/API mutations blocked. This is
   local simulated-fault evidence, not a production outage drill.

## Task 3 — Isolated notification evidence (October 17, 2026)

The initial approval covered bounded testing, not production activation. Detailed gate history and
limitations: [PUSH-PLAN.md](PUSH-PLAN.md).

- [x] Separate Free test database/hosting, test-only VAPID and installed iPhone app.
  One initial labeled transport test arrived and opened the test app on tap.
- [x] Approved subsequent batch: at most two labeled pushes. Actual cloud-app
  cron/parser/drain code used synthetic feeds in private embedded PostgreSQL,
  with the real test subscription and Apple transport. No fictional advisories
  entered hosted agency history. Both attempts returned HTTP 201; user separately
  confirmed both arrivals, the first while the phone was locked.
- [x] After initially unsaved settings caused preflight stops without sends,
  verified hosted saved choices changed to Spanish, one watch and its lift
  selection. Second notification used Spanish lift wording.
- [x] Forty targeted automated tests and TypeScript checks passed. Local cloud
  regression covers future-only baseline, preferences, watch suppression, failed
  source/evidence retention, recovery, duplicates and idempotent durable deletion.
- [x] User removed the test subscription; verified-TLS read-only query confirmed
  zero test devices and unchanged advisory evidence. Removed local fixture DB and
  copied subscription/token/sender material; retained only a redacted receipt.
- [ ] Deployed Vercel/scheduled advisory-to-push execution is not demonstrated by
  the local cloud-code rehearsal. No production keys, settings, activation or
  sends were authorized in that test batch. Production push was disabled at its end; test project remains
  configured with no devices and no test scheduler. Task 2 day-long/quota evidence
  remains open. Do not mark the whole release gate complete from phone receipt alone.

### Subsequent production activation and verification

- [x] User explicitly authorized production push configuration/deployment in this
  Task 3 session. Production sends/broadcast to other recipients require separate
  approval; no synthetic official records or historical replay are authorized.
- [x] Verified existing Hobby project and zero production subscription records over
  verified TLS using READ ONLY queries. No recipients can receive immediately at
  this inspection. Source success timestamps approximately 20:45:19Z October 17,
  no errors, about four minutes old. Public push was false/null at this preflight.
- [x] User separately approved the operator contact for production. Generated
  distinct production VAPID keys, configured sensitive Production-only variables
  and enabled push. Rebuilt the previous production release, not shared-checkout
  changes. `dpl_6LCVnamQNHzqwnxXmwbRSvi3kNoN` is READY at the canonical origin.
- [x] At `2026-10-17T20:52:54Z`, seven read-only checks passed: HTML/worker,
  enabled config with exact production key, database status, no-store, cron 401
  and foreign-origin 403. Both source successes approximately 20:45:19Z, no errors,
  453 seconds old. Verified-TLS query again confirmed zero production devices;
  two existing journal events remain. No authenticated manual cron, fake records,
  replay or test send. Local config/project link and UI asset references unchanged.
  Fifteen targeted config/cloud/push tests passed; scheduler unchanged.
- [x] User separately approved one labeled production-device test. Resolved wrong
  Home Screen app enrollment: read-only inspection found two test subscriptions
  and zero production at 21:07:04Z. At 21:08:59Z production had exactly one recent,
  unexpired Apple subscription, English, one watch and its lift selection.
- [x] Revalidated the sole production recipient and exact production key; one
  direct operator test labeled `WAVE PRODUCTION TEST ONLY` returned Apple HTTP 201.
  Attempt claimed in private receipt before send; no retry, synthetic incident,
  source mutation, manual cron or advisory-drain invocation. Test send budget used.
- [x] User answered “yes” to production test arrival and tap-through opening WAVE
  Original. Locked/background state was not separately established; no further send.
- [ ] Direct transport is not deployed scheduled advisory-to-push verification.
  Day-long observation, quota review and remaining device/reliability gates remain open.

## Task 5 — UI/accessibility/privacy (guided review, October 17, 2026)

Session: `ses_eb438bd34ffed1axtWPc78JE3B`. User approved starting with a
read-only mobile/tablet/desktop layout review; subsequently approved only the
tablet-header fix documented below, not a redesign. Task 4 real-new-user testing
remains pending.

1. [x] Bounded responsive review and approved tablet fix — not exhaustive device certification.
   Used the isolated UI-only E2E Vite configuration at localhost:5194: no API
   proxy, env loading, backend, scheduler or production connection. Browser panel
   inspected sample home at 1440×900, 768×1024 and 390×844. Desktop keeps a
   sidebar; phone stacks content and uses bottom navigation; sample labels remain
   visible. Tablet panel shows a horizontal scrollbar: its 768px viewport leaves
   a 753px header content width with a reserved scrollbar, crowding the header.
   `src/styles.css:5,12,13,96–97` retains desktop navigation above 760px alongside
   a nonshrinking 220px logo. Headless reproduction with a stable scrollbar gutter
   gives a 753px header and language control right edge ~758px. This is a narrow
   tablet header issue, not evidence that all layouts overflow.
   Additional fresh-context Chromium checks at 320, 390, 768, 820 and 1440px,
   each 900px tall, visited welcome, sample home, sample supplier tools, Places,
   History and Settings. All 30 overlay-scrollbar checks had no horizontal page
   overflow; external requests were intercepted (none attempted), API requests
   received synthetic 503 responses, and service workers were blocked. No real
   contacts opened, notification permission requested, or production mutations/sends.
   Local evidence: ignored `test-results/task5-layouts/metrics.json` and 30 PNGs.
   Browser-panel captures: `wave-task5-{desktop,tablet,mobile}-sample` dated
   2026-10-17 under the session's `.openchamber/screenshots/` (local artifacts).
   This is English browser-emulation evidence, not real-device/Safari, zoom,
   screen-reader, Spanish human review or exhaustive screen/state coverage.
   Initial review made no application changes. User subsequently selected
   “Approve fix (Recommended)” for only the tablet header issue and layout retest.
   Reduced logo width to 180px only at 761–900px; phone/full-desktop sizes unchanged.
   Added a guarded browser regression with a stable scrollbar gutter at
   761/768/820/900px: failed before the CSS fix, then passed in both project runs.
   All eight E2E cases, 230 Vitest tests (33 files) and TypeScript/Vite build pass
   under Node 24. E2E used a temporary config pointing to the already running
   isolated UI server, without launching another server. Tablet browser-panel
   retest no longer shows horizontal scrolling; local capture:
   `wave-task5-tablet-header-fixed-2026-10-17T21-39-39-732.jpg`.
   Changes are local only; no deployment, push or scheduler changes performed.

2. [x] Bounded keyboard/focus/modal/labels/non-color review and approved spacing fix
   — not assistive-technology or real-device certification.
   User approved read-only review. Fresh isolated Chromium contexts at
   390/768/1440×900 used sample records, blocked service workers/external requests
   and fulfilled API reads with synthetic 503 responses. Only GET `/api/status`
   was observed; no external requests or uncaught browser errors in the first pass.
   Skip link targets/focuses main; route changes focus main. Tab traverses sample
   home and supplier-tools controls with visible 3px blue outlines. Enter opens
   supplier dialog; initial focus is Close. Forward/reverse Tab visits only dialog
   controls (Chromium briefly reports BODY at the browser-chrome cycle boundary,
   not a focused background control). Escape and Close restore the opener;
   Space reopens it. Alert-history Enter sets `aria-expanded=true`.
   Supplier search has an accessible name; keyboard typing and Tab reach Select.
   Prepare, Subject and Draft body have associated labels. The sample-scenario
   checkbox has its wrapping-label accessible name despite the panel snapshot's
   missing-name heuristic. Statuses include text, not color alone: “Boil-water
   notice”, “No active advisory found”, “Data unavailable”. App/draft messages
   use status regions; no screen-reader announcement claim has been verified.
   Finding: `src/styles.css:13` fixes mobile navigation to the bottom without
   reserving a focus-scroll area. After Tab from Subject at 390×900, the draft
   textarea ends at y≈838 while navigation begins at y≈827: its bottom ~11px
   and lower focus outline are obscured. Most of the editor remains visible;
   this is not a wholly hidden control or a complete keyboard-access failure.
   Confirmed after two animation frames and by screenshot, not transient metrics.
   Local artifacts: `test-results/task5-keyboard/{report,followup}.json`,
   `390-draft-focused.png` and corresponding tablet/desktop captures. Panel dialog
   capture: `wave-task5-supplier-dialog-tablet-2026-10-17T21-45-28-732.jpg`.
   Initial review made no application changes. User then approved only the
   mobile keyboard-focus overlap fix and regression. Added mobile-only bottom
   scroll margin for input/select/textarea (110px plus safe-area inset); no
   navigation redesign or persistence/network changes. New keyboard-Tab regression
   at 320/390/760×900 failed before CSS and passes afterward in both E2E projects.
   All 10 guarded browser cases, 230 Vitest tests and TypeScript/Vite build pass.
   Fresh screenshot retests show the draft-editor bottom at y≈783, above navigation
   at y≈827, including its outline. Evidence: `test-results/task5-keyboard/fixed.json`
   and `{320,390,760}-draft-focused-fixed.png`. Changes remain local, not deployed.
   Real-device/virtual-keyboard, Safari,
   assistive-technology and exhaustive contrast/zoom checks remain unverified.

3. [x] Bounded Spanish-controls review and approved sample-entry language fix
   — fluent-speaker review remains open, not translation certification.
   User separately approved this review. Fresh isolated Chromium contexts at
   320/390/768/1440×900 checked Spanish welcome, sample home, supplier modal,
   supplier tools, Places, History and Settings (28 captured states). ES sets
   `html[lang=es]` and `aria-pressed=true`; EN restores English. These states
   had no horizontal page overflow or uncaught errors. Only synthetic GET
   `/api/status` reads occurred; external requests were blocked (none attempted),
   service workers blocked, and no notification/contact/export actions taken.
   Navigation, status labels, draft labels/options and warnings render in Spanish.
   English templates are explicitly labeled and subject/body have `lang=en`;
   agency-language limits are shown in details. Original record text, proper
   names and CDC quotations remain English, not an official Spanish translation.
   Source review also finds some curated-reference link labels in English
   (`src/App.tsx:165`) and mixed informal/formal address across UI/draft help;
   these are human language-review follow-ups, not certified translations.
   Finding: choosing ES on live welcome then entering sample resets to EN when
   sample preferences are new. Reproduced at all four widths; `changeMode`
   loads the destination's separate preferences (`src/App.tsx:79–83`), whose
   default language is English (`src/storage.ts:3`). Initial review made no fix.
   Keep live/sample watches and push choices isolated;
   do not silently rewrite live notification-language preferences as a UI fix.
   Local artifacts: `test-results/task5-spanish/report.json` and 28 PNGs;
   visually inspected 390px supplier-tools and 768px home captures plus Spanish
   tablet home in the browser panel. Real-device, screen-reader and fluent Spanish
   speaker review remain pending. Existing draft-loss warning decision belongs
   to the later dedicated bullet, not implicit approval here.
   User subsequently approved preserving current language only when entering
   sample. `changeMode` now copies that language into sample preferences while
   retaining other sample choices; exiting still restores saved live preferences.
   New/saved-sample browser regressions failed before the one-line fix, then
   passed in desktop and phone-sized projects. They verify Spanish document and
   control state, isolated sample watches/options, and unchanged saved live
   preferences after switching language inside sample and exiting. Network guards
   prohibit API mutations. All 14 browser cases, 230 Vitest tests and the
   TypeScript/Vite build pass on Node 24. Local only; no deployment, push delivery,
   server preference or scheduler changes. Original review artifacts remain
   pre-fix evidence; this is not a fluent-speaker or actual-device retest.

4. [x] Bounded exact saved-notice/history review and approved missing-link fix
   — not real-device notification-tap certification.
   User approved isolated read-only checks. At 390/1440×900, seven scenarios each
   used synthetic old/current notices for the same supplier plus another supplier:
   supplier-history selection, old/current query links, missing ID, orphaned place,
   a live link with sample mode previously saved, and archive removal after opening.
   Supplier history and old query links show only the selected old area/reason,
   not the current or other supplier's record. Current query links show the exact
   current record with conservative previously-observed wording. A query link
   overrides saved sample mode; no fictional data is mixed into that live view.
   Removing the opened record on the next synthetic status read shows the existing
   unavailable message without substituting a different notice. Global History
   defaults to two watched-supplier records; All observed places adds the third.
   Global History renders record/source facts, not internal notice-detail buttons.
   Finding: an initially absent ID or a notice without a resolvable place leaves
   the ordinary home screen visible, including a different current notice, with
   no explanation that the requested saved notice could not be opened
   (`src/App.tsx:55–60,153`). This is not a wrong detail record, but is ambiguous
   link behavior. No implementation change authorized or made in this review.
   Evidence: ignored `test-results/task5-routes/report.json` and 14 PNGs; visually
   inspected mobile missing-link home and exact old-notice detail captures.
   Service workers blocked; only synthetic GET `/api/status` reads, zero external
   requests/API mutations or uncaught browser exceptions. No contacts, permissions,
   sends, scheduler or production changes. This is Chromium emulation, not a real
   push notification tap, real-device/back-navigation certification or live archive audit.
   User subsequently approved only the missing-notice explanation and regression
   checks. Unresolvable query links now open the explicit unavailable panel even
   without a selected place; no current notice or draft is silently substituted.
   Wording refers to currently available records, not proof of permanent deletion.
   The retained ID can resolve when later status data arrives; valid exact-record
   selection remains intact. English/Spanish missing-ID and orphaned-place checks
   failed before the fix and now pass, with an explicit return-home action. A
   historical-link regression verifies old facts, then unavailable after removal.
   All 24 guarded browser cases and TypeScript/Vite build pass on Node 24.
   The parallel Vitest run had one 20s database-access timeout (229 passed);
   a full sequential rerun, without browser/build contention or timeout changes,
   passed all 230 tests in 33 files. No database implementation was changed.
   Local browser-panel retest at 390×844 shows the missing-link explanation and
   Back to my water button, not a different active notice. Capture:
   `wave-task5-missing-notice-fixed-2026-10-17T22-45-55-491.jpg`.
   Local only; no deployment, push, scheduler or production changes.

5a. [x] Bounded clipboard success/failure review — not real-device certification.
    User approved synthetic isolated browser checks only. Fresh Chromium contexts
    at 390/1440×900 in English and Spanish ran 24 checks: all four template kinds
    copied successfully (16), plus controlled rejected-write and absent-clipboard
    cases for the request template (eight). Successful browser clipboard reads
    exactly matched `Subject: {edited subject}\n\n{edited body}`, including line
    breaks, punctuation, accented characters and emoji. Failure cases focused and
    selected the complete draft body (not the separate subject) and displayed the
    localized Copy/download fallback, never a copied/sent claim. Visually inspected
    the mobile denied-write capture. These errors were injected browser API
    conditions, not evidence of actual OS permission prompts or mobile Copy menus.
    Service workers/external requests blocked; only synthetic GET `/api/status`
    reads, zero external requests/API mutations or uncaught browser exceptions.
    No contact/email/download actions or production changes. Local ignored evidence:
    `test-results/task5-clipboard/report.json` and 12 screenshots. No implementation
    changes made; actual-device clipboard/permission behavior remains unverified.

5b. [x] Bounded exact download review — local sample fixtures, not device certification.
    User approved synthetic local downloads. Chromium at 390/1440×900, EN/ES,
    downloaded all four edited template kinds as drafts and preparation packs:
    32 files. Every filename and complete UTF-8 byte sequence matched independently
    constructed expected content (not the application's export builder), including
    edited subject/body, Unicode and line breaks. Packs also matched the exact
    sample notice context, checklist, logs, references and preparation/not-submitted
    limits. Sample filenames retain `water-alert-sample-`; packs retain their
    SAMPLE header even after replacing the editor text. Feedback accurately says
    download requested, not sent/filed/attached. Files were read from Chromium's
    temporary download paths; this does not certify OS save dialogs or phone files.
    Local ignored evidence: `test-results/task5-downloads/report.json` with SHA-256
    hashes, 32 synthetic text files and four screenshots. Service workers blocked;
    only synthetic GET `/api/status`, no external requests/API mutations or browser
    exceptions. No uploads, email, submissions or implementation changes. Live-mode
    export naming/content and untouched sample-label behavior remain for the
    separately approved fallback/sample-export review.

5c. [x] Bounded email-link recipient/content review — no email app opened or sent.
    User approved inspecting links, not invoking them. Isolated synthetic live-mode
    records for both curated email-enabled supplier IDs (Leisure Hills and Rogers)
    at 390/1440×900, EN/ES, request/follow-up produced 16 exact checks. Each mailto
    recipient matched its curated ID's address (`LEISUREHILLSWATERCO@GMAIL.COM` or
    `WATER@RWU.ORG`); decoded subject/body exactly matched synthetic edits, including
    Unicode, line breaks and reserved characters. Query keys were only subject/body;
    body text resembling `&bcc=` remained body text, not another recipient/header.
    No link was clicked, no mail client invoked, and no real delivery or current
    provider-mailbox ownership verified. Existing contact provenance is dated
    2026-10-14; residents must still check their bill. Service workers/external
    requests blocked; only synthetic GET `/api/status`, no external requests/API
    mutations or uncaught errors. Evidence: ignored `test-results/task5-email/`
    report and eight screenshots. No implementation changes; actual mail-client
    interoperability remains unverified.

5d. [x] Bounded unknown-provider/sample fallback review — isolated fixtures only.
    User approved this read-only review. Chromium at 390/1440×900, EN/ES checked
    unknown exact ID (deliberately sharing a curated supplier's name), phone-only
    curated ID, email-enabled ID with an oversized message, and ordinary sample
    records: 16 contexts, all four template kinds, 64 actual draft downloads.
    Unknown IDs did not inherit a same-name contact. Unknown/sample detail views
    exposed no telephone links; sample drafts exposed no provider email links.
    Phone-only providers, complaint/legal templates and oversized request/follow-up
    messages retained localized Copy/download fallback text without an email link.
    Shortening the oversized message restored its exact-ID email option; no email
    or phone link was invoked. Every downloaded draft exactly matched its current
    subject/body; live filenames omit `sample-`, sample filenames retain it, and
    every untouched sample template contains `SAMPLE — NOT A REAL CLAIM`.
    Earlier 5b checks separately cover fully replaced sample editor text and the
    fixed sample preparation-pack header. Editable text can remove its sample
    wording; the filename/pack header remain safeguards, not tamper-proof labeling.
    Visually inspected mobile unknown-provider and Spanish sample tools captures.
    Evidence: ignored `test-results/task5-fallbacks/report.json`, 64 synthetic text
    files and 16 screenshots. Service workers/external requests blocked; only
    synthetic GET `/api/status`, no external requests/API mutations or uncaught
    errors. No implementation changes, production activity or real-device mail/
    save-dialog certification. Browser fallback is not current contact validation.

6. [x] User chose to keep the existing visible unsaved-edit warning, not add a
   confirmation or draft persistence. Subsequent grouped questions explicitly
   authorized the remaining read-only reviews, with approval required before fixes.

7. [x] Bounded actual draft-storage/privacy review — not a production security audit.
   Four fresh Chromium contexts at 390/1440×900, EN/ES used unique synthetic
   subject/body sentinels. Switching template kinds retained each kind's edits;
   leaving detail and returning, changing language, reloading, and closing/reopening
   the tab lost edits. No confirmation is added, per decision above. Inspected
   localStorage/sessionStorage, cookies, IndexedDB and Cache Storage; no sentinel
   appeared in storage, URLs or request bodies. No IndexedDB/cache databases,
   session values or cookies were created in these isolated contexts. Instrumented
   storage writes contained preferences/visit metadata, not draft text. Only
   synthetic GET `/api/status` reads occurred; external requests and all other
   API calls were blocked, none attempted. No permission request or uncaught error.
   Source inspection confirms draft state is component memory, with no upload
   handler; copying/downloading/email intentionally transfer text outside it.
   Preferences, mode and visit cursors DO persist. Push opt-in intentionally stores
   a browser deletion bearer and server subscription data; this review did not
   enroll, read real credentials, alter or audit production subscriptions. The
   push-only service worker has no fetch/cache handler; it was blocked in tests.
   A limited scan of the existing local built JS found no private-key header,
   PostgreSQL credential URL or server-secret variable names. This is not proof
   of absence of every secret, telemetry, host log, extension capture, autofill,
   browser session recovery or OS-level persistence. No broad no-telemetry claim.
   Evidence: ignored `test-results/task5-privacy/report.json` and four full-page
   captures; visually inspected mobile supplier detail. No implementation changes.

8. [x] Bounded profile/reference/guidance/claim review — follow-ups remain below.
   Source and actual local detail checks verify dated directory metadata, exact-ID
   contact attribution, general CDC guidance distinct from incident instructions,
   historical guidance collapsed initially, and preparation/not-submitted/no
   compensation-guarantee wording. Read-only HTTP GET checks fetched 12 of 13
   curated destinations successfully (200): five ADH profiles, annual-report
   search, AG complaint page, English/Spanish complaint PDFs, legal-help home,
   small-claims reference and CDC. The legal-aid intake destination failed in Node
   fetch and timed out through a second tool; availability remains UNVERIFIED,
   not proven permanently broken; the reachable legal-help home still publishes
   that exact Apply Online destination. No forms submitted, contact links invoked or
   external page scripts executed. Current ADH pages match all five curated phone
   numbers and both curated email addresses; this verifies published values, not
   mailbox delivery or 24-hour staffing. Leisure Hills profile matches ID 747,
   groundwater/community, population 113, WELL #1 and inspection date 2/5/2026.
   All four displayed CDC excerpts match the retrieved source, dated March 4,
   2024. Read both official complaint PDFs: mediation/jurisdiction, private-attorney/
   court restrictions, sharing and possible public-record limits match the app's
   bounded preparation explanation. No legal eligibility or compensation decision
   is made. Existing in-app checked dates remain 2026-10-14; this session's newer
   observations are evidence here, not an automatic refresh of curated metadata.
   Evidence: ignored `test-results/task5-sources/report.json`, fetched public
   documents/text and `fact-checks.json`, plus privacy-review detail captures.
   Finding needing approval: `src/ProviderContact.tsx:6–7` says this website does
   not send messages. In the contact section the intent is no provider-message
   sending, but the unqualified sentence is too broad with production push live.
    Proposed minimal fix: specify no calls or provider emails are sent automatically,
    in both languages, without changing push behavior. No fix made in this review.
    User subsequently approved only this wording fix, regression and documentation.
    Both language regressions failed before the change and now pass. Contact text
    now specifies no automatic calls/emails to the provider; destinations and push
    behavior are unchanged. All 232 Vitest tests (33 files), 24 guarded browser
    cases and TypeScript/Vite build pass on Node 24. Four fresh isolated Chromium
    checks at 390/1440×900 in EN/ES verify actual rendered wording; inspected the
    mobile Spanish screenshot. Evidence: ignored `test-results/task5-contact-wording/`
    report and four captures. External/API mutations and service workers blocked;
    zero unexpected requests/errors, no contact links invoked. Local only, not
    deployed; no production, push, scheduler, enrollment or notification-send changes.

Task 5's authorized bounded browser/source reviews and approved local fixes are
finished and recorded; this is not full accessibility, privacy or release
certification. Legal-aid intake availability, real-device/assistive-technology
checks, fluent Spanish review and Task 4 new-user observations remain open.
The overall Task 5 gate below stays unchecked pending those human/device limits;
automated test counts alone do not close it. Existing visible unsaved-edit warning
is retained by user decision; no draft persistence or confirmation was added.
Nothing in this review authorizes deployment, production changes or Task 6 execution.

### Subsequent explicit deployment approval — October 18, 2026

User subsequently asked to deploy these changes. All five approved Task 5 fixes
are now live at `https://water-alert-blond.vercel.app`, deployment
`ZwyfHKFJriBYhmxPNYEK4jUpmPNQ`. This separate approval supersedes only the earlier
local-only/no-deployment status. An isolated snapshot compared against uploaded
production hashes changed only three UI runtime files; backend/configuration and
scheduler inputs retain the deployed baseline. Unrelated local scheduler changes,
private files and new push tests were not released; the shared checkout is intact.

Exact release snapshot: 219 tests in 31 files, 24 guarded browser cases and local/
remote TypeScript/Vite builds pass. This count is distinct from the earlier 232-test
full checkout. At `2026-10-18T16:04:23Z`, HTML/worker/status/push-config/assets GET
checks passed, served JS/CSS exactly matched tested bytes and enabled push config
fingerprint was unchanged. Fresh guarded production browsers at 390/768/1440×900
verified missing-link explanation, Spanish sample continuity and header bounds;
no mutation/external attempts, permissions, contacts or notification sends. The
initial inline gutter probe was blocked by CSP; actual-layout rerun passed without
injection or weakening CSP. Evidence: ignored `test-results/task5-deployment/`;
details in `VERCEL.md`. No scheduler/environment changes or Task 6 execution.
All previously recorded human/device/Spanish/legal-intake limitations remain open.

## Subsequent tasks — separate guided sessions, in order

These are pending, not authorized execution. Ask about each task's individual
bullets sequentially using the originating handoff; do not dispatch concurrently.

- [ ] Task 2: Hosted reliability — release/secrets review, tests/build, separately
  approved deployment and scheduler configuration, public-device/API/privacy
  checks, durable state/timestamps, laptop-off and day-long observation, quotas,
  and controlled failed/stale/disappeared-source checks (never all-clear).
- [ ] Task 3: Notifications — verified opt-in delivery and suppression,
  unsubscribe and device limits, or keep disabled with honest wording.
- [ ] Task 4: Resident usability — 3–5 real new users, main journey and sample
  distinction; record friction, fixes and retest. Never invent results.
- [ ] Task 5: UI/accessibility/privacy — responsive and keyboard checks, Spanish,
  history, exact copy/download/email behavior, unknown/sample fallbacks,
  privacy and truthful guidance/contact/compensation claims.
- [ ] Task 6: Release rehearsal — tests/build, public clean-browser journey,
  persistence/deletion failure/sample checks, truthful docs, known-good reference,
  feature freeze.
- [ ] Task 7: Demo — reverify official video rules, truthful working journey,
  limits and student contribution; privacy/readability/captions; separately
  approved upload and signed-out link check.
- [ ] Task 8: Submission — verify eligibility/district/rules and contribution/AI
  disclosures, evidence-only claims, links/proofreading, explicit submission
  authorization and saved confirmation.

## Approval and evidence gates

- No deployment, publishing, scheduler activation, notification sends, or CAC
  submission without specific approval. No further session creation unless asked.
- Preserve unrelated work and existing source failure/sample guardrails.
- Recheck [official rules](https://www.congressionalappchallenge.us/students/rules/)
  before relying on eligibility, deadline or video requirements. This session has
  not reverified them. Planning dates from the handoff: internal target October 24;
  reported deadline October 26, noon EDT / 11 a.m. CDT, with October 25–26 buffer.
- Older root CAC preparation documents cover other entry points; they are not
  evidence of this app's release readiness or student authorship.
