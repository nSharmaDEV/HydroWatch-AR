# Water Alert — local implementation and Vercel backend

Isolated React + TypeScript + Vite app with a localhost Express proxy. No imports,
dependencies or records are shared with the earlier Python apps. Working name only.

See [CHANGELOG.md](CHANGELOG.md) for notable website, backend and hosting changes.

## Run

Use Node 22.12+ or Node 24 LTS. From `water-alert/`:

```sh
npm ci
npm run dev
```

Open **http://localhost:5178** (the default allowed mutation origin). UI port 5178; API port 8788. Both bind to
localhost. `npm test` runs the domain, UI and local-server tests;
`npm run build` checks TypeScript and builds the UI. `npm run dev:ui` runs
the sample UI alone. `npm run preview` previews the build but does not start
the API. No deployment has occurred.

### Automatic checking

The local server checks both approved agency URLs at startup and every **five
minutes**, with no overlapping runs or immediate retry loop. The live website
reads saved observations every **30 seconds** (can be disabled in Settings).
Sample mode does not poll the live API. Manual checking keeps its cooldown.

Checks continue with the browser closed **only while the local server is running
and the computer is awake**. This is not yet a hosted scheduler. A configured,
authorized always-running host is required for checks when this computer is off.
The new Vercel path uses scheduled functions and PostgreSQL rather than a listening
server/durable disk. It has not been deployed. The free-only configuration uses
a separate Cloudflare scheduled Worker, not Vercel's paid frequent cron.
See [FREE-HOSTING.md](FREE-HOSTING.md) for the database quota blocker and
[VERCEL.md](VERCEL.md) for setup, authorization gates and limitations.
Live responses are parsed against the recorded agency structures. Failed checks
retain prior observations but remain unavailable; downloads alone are not success.

### Supplier alert history and data-source activity

Supplier cards and notice details include **Contact water provider** with one-tap
phone links and organization email links where verified. Links open the device's
phone/email app; the website does not send messages or confirm delivery. Initial
coverage is Leisure Hills Mobile Home Park, Fayetteville, Springdale, Rogers and
Bentonville, matched by exact supplier ID—not county or a similar name. Unknown
suppliers show a water-bill/park-management fallback; sample mode has no real
contact actions. Confirm the supplier against your bill before contacting it.

Contacts are a curated snapshot in `src/provider-contacts.ts`, not a live directory.
Each entry links to its ADH directory page and records the date checked
(initially 2026-10-14). Recheck the named system's phone/organization email fields
before updating an entry; omit individual staff email addresses. These are
directory-listed contacts, not verified 24-hour customer-service lines; hours,
response times and actual call/email delivery have not been verified.

Supplier cards show the supplier/county/source, current finding and published
affected area, reason and agency-issued date. The top-right info button opens
**Supplier details**, an accessible modal containing safety limitations,
instructions, **Read official notice**, the actual saved check/attempt time and
collapsed **Data-source activity**. **Notice details** inside the modal opens
the existing detail/share view. Escape or Close returns focus to the info button.
**Alert history** starts collapsed on the card. Failed checks keep
**Current advisory status unavailable.** primary. Waterbody cards retain their
separate **Last successful check** and **Latest attempt** panels.

Compact cards use **Affected area**, **Reason**, **Issued** and an **Active**
badge. Exact whole-system wording (alone or preceded by the matching supplier's
name and “for the”) displays as **Entire system**; qualifiers and other areas
remain complete. Recognized ADH numeric issue date/time fields display a short
date and minute precision, preserving an explicit source zone without guessing
one. The info modal preserves original area/date text whenever the card formats
it differently. Stored records, history and detail views retain published wording.

My Water's unboxed sidebar links to sources/coverage and **Manage alerts**, with
the saved device configuration/delivery limitation shown explicitly. **Add a
place** stays directly below the cards. On mobile, the sidebar stacks below them
without a vertical separator.

**Alert history** uses only retained official notices in `archive`, matched to the
exact supplier, ADH, boil-water type and official feed URL—not check outcomes.
It shows the notice type/source name, status, affected area/customers, reason,
agency issue/lift dates, retained sourced guidance and official notice link.
Missing notice fields say **Not provided in the source.** Agency dates/text remain
verbatim in history; first/last app observations are separately labelled retrieval evidence.
Only a fresh current match is active; only an explicit agency lift is lifted.
Disappearance or retrieval failure leaves an unlifted saved notice unconfirmed.
Repeated/failed checks never create alert events. Six notices appear initially,
with **Show more notices** for additional saved records.

An empty archive says **No advisory notices saved for this supplier.** The
**History begins [date] and may not include earlier advisories.** date uses genuine
source-specific `historyStartedAt` or the earliest retained matching notice's
`firstObservedAt`, never a global coverage date or a check-log reconstruction.
New sources save `historyStartedAt` at their first successful retrieval. Legacy
sources with prior success but no saved start are not assigned a guessed date;
without matching observation evidence, the UI explicitly says the start is unknown.
ADH parsing does not currently retain per-notice guidance, so real notices normally
show the missing-field label rather than invented boil-water instructions.

**Data-source activity** in the supplier info modal/detail view contains the genuine
**Last successful check**, historical caution (or **No successful check recorded
yet for this supplier.**), retrieval errors, retention/storage explanations and
first retained check. It shows newest checks first and offers **Show more checks**.
The technical journal has a short ADH-specific introduction,
one heading per local date, and compact expandable count/time-range rows. Only
consecutive successful checks with identical published place facts on the same
local date group together; every failure stays separate and changed facts break
groups. Expanding a group preserves every saved individual timestamp. Supplier
activity uses the applicable CDT/CST abbreviation, without repeated timezone IDs.
These are app checks of published agency feeds, not water tests, agency publication
times or device visits. Historical results do not confirm current status or safety.
Official advisory-list links are separate from supplier/waterbody identity references.

`sources[].checks` in `/api/status` and `/api/check` contains actual timestamped
success/failure outcomes; successful entries retain complete feed records for exact
place matching. `sources[].lastSuccessfulCheck` separately preserves the last genuine
success. Local JSON and hosted PostgreSQL JSONB use the same additive fields, with
no SQL migration required. Legacy state starts with empty check history: archives,
old retrieval timestamps and device visits are never backfilled into successful
no-match evidence. The check journal begins with checks actually recorded; it is
separate from the durable notice archive and never backfilled into Alert history.

Per source, retention is at most **64 checks within 30 days**, pruned on the next
check. A **1 MB** serialized journal budget can remove older complete checks sooner;
the newest complete check is always kept, even if individually larger. The last
successful result is preserved separately. This is not a complete official archive.
Sample checks remain explicitly fictional and never enter live storage.

## Review the sample journey

1. Choose **Try sample mode**, then **Start sample journey**. Search “Sample
   Creek” to see two possible suppliers. Select the exact system, review the
   confirmation, then choose **Yes — watch this place**. Selection alone does
   not save a watch; **Choose a different place** returns to the search.
2. Use the supplier's info button, then **Notice details** to see the published area and reason,
   guidance verification gap, source link and share action. The side disclosures
   contain record metadata, extracted published fields and alert options.
    Agency dates remain verbatim; known app timestamps use EN/ES formatting in
     `America/Chicago` (supplier views show CDT/CST without repeating the zone ID).
     Detail-view missing dates are omitted, except
    ADEQ unknown lift fields explicitly say no date was provided (“N/A”).
3. Open **Review alert options**, then **Notify when lifted**. Preferences are
   saved locally, but sample push and email are explicitly disconnected. In
   Settings, **Alert Options** opens the unchanged live opt-in controls.
4. **Use sample watch list** on the introduction shows active, no-active and
   unavailable states. Unavailable uses neutral gray and a question mark; its
   retained records in details are labelled **Previously observed**, not current
   notices. Supplier cards distinguish historical check results from current status.
    Saved official notices are in **Alert history**; technical check evidence is in
    collapsed **Data-source activity**. The sample HAB toggle demonstrates an
    available source and purple active HAB.
5. In **Places**, remove a watch and use **Undo** to restore its position and
   lift preference. **History** defaults to your places, offers all observed
   places and progressively reveals records ordered by app observation times.
6. Check Settings, its source/privacy/install sections, EN/ES and **Exit sample**.
   The yellow banner stays on every sample screen. Sample records are fictional,
   with a fixed clock. Live/sample choices and languages remain independent.

### UI-only browser verification

Start only the frontend with `npm run dev:ui -- --port 5189`, then in another
terminal run `node tests/browser-journey.mjs` (an alternative UI URL can be passed
as the first argument). All API calls are mocked; no backend, real notification
subscription, agency retrieval or delivery is needed. The Chromium checks cover
1440/820/390/320px layouts in EN/ES, keyboard confirmation, source failure,
sample isolation and server-deletion failure/retry. Screenshots are saved under
ignored `test-results/journey/`. Vite does not load runtime `.env` files; this
does not change the API's runtime configuration.

Run `node tests/browser-catalog.mjs` against the same UI-only server for the
six-place catalog journeys at desktop/mobile sizes in EN/ES. All advisory records
are synthetic and all API calls intercepted; screenshots are under ignored
`test-results/catalog/`.

Run `node tests/browser-source-checks.mjs` against the same UI-only server for
source-history checks at 1440/1280/390/320px in EN/ES, including compact supplier
no-match, active, failed and no-success states, keyboard disclosures/focus,
repeated-check groups, progressive reveal and overflow checks. All API calls are intercepted;
screenshots are under ignored `test-results/source-checks/`.

Run `node tests/browser-adeq-cards.mjs` against the same UI-only server for
ADEQ unknown/history and current HAB cards, detail, keyboard guidance disclosures,
date provenance and overflow at 1440/390/320px in EN/ES. All API calls and advisory
records are synthetic; screenshots are under ignored `test-results/adeq-cards/`.

### ADEQ cards and agency guidance

ADEQ's official `default.js`, checked **October 14, 2026**, filters its current
table with `!advisory.lifted`: blank lift fields are included; “N/A” and dated
lift fields are excluded. Exclusion does not establish what “N/A” means. Those
records remain **Data unavailable**, with no new/lifted alerts. Details and
History explain that no lift date is provided and active/lifted status cannot
be confirmed. A dated lift remains explicit; disappearance is not a lift.

History separates agency issued/lift dates and feed-wide updated text from
first/last app observations. An observation means the row was returned, not
that ADEQ reconfirmed the advisory. Missing observation times are not invented.
Per-record “seen in X of Y checks” counts are omitted: the archive has no lifetime
counter and the retained check journal is bounded, not complete historical evidence.

ADEQ History and waterbody details bundle verbatim English guidance from the
[official HAB page](https://adeq.state.ar.us/water/planning/hab/default.aspx),
verified **October 14, 2026**, with a visible source and verification date.
It covers advisory absence, suspected blooms/children/pets, washing after contact,
medical symptoms, DEQ bloom reporting and ADH possible-illness contacts. Spanish
UI explicitly labels the quotations as English, not translated. These are general
agency instructions, not a record-specific cause or a live guidance feed. ADH's
separate guidance-verification gap remains visible.

The official script has distinct empty-filtered-table and retrieval-error messages.
That does **not** verify a genuinely empty backing JSON feed: the parser's
empty-feed guard remains unchanged.

## Verified local place catalog

Live search now always offers **Beaver Lake**, **Buffalo National River** (also
searchable as “Buffalo River”), and these exact ADH public-system names:
**FAYETTEVILLE WATERWORKS**, **SPRINGDALE WATER UTILITIES**, **ROGERS WATER
UTILITIES**, and **BENTONVILLE WATER UTILITIES**. Previously observed places remain
available. This is a small directory, not statewide coverage or an address-to-supplier
lookup. Confirm your supplier against your bill; counties are not service boundaries.

Identity sources verified October 13, 2026, are linked in confirmations and
**Sources and coverage limits**:

- [USACE Beaver Lake](https://www.swl.usace.army.mil/Missions/Recreation/Lakes/Beaver-Lake/Dam-and-Lake-Information/).
- [NPS Buffalo water-quality information](https://www.nps.gov/buff/learn/nature/waterquality.htm).
- ADH system records: [Fayetteville 569](https://health.arkansas.gov/Eng/WS.aspx?ID=569),
  [Springdale 575](https://health.arkansas.gov/Eng/WS.aspx?ID=575),
  [Rogers 055](https://health.arkansas.gov/Eng/WS.aspx?ID=055), and
  [Bentonville 041](https://health.arkansas.gov/Eng/WS.aspx?ID=041).

These are identity references, **not additional live condition feeds**. Waterbody
watches match only ADEQ HAB records with the verified exact names, preserving each
published area, county, date and record ID. Supplier watches use the existing ADH
exact-name identity; a lake HAB notice never becomes a tap-water boil notice.
History and existing future-only opt-in matching use the same rules. Enrollment
acceptance and overlapping-watch deduplication are tested with a fake sender;
real notification delivery is still unverified and was not enabled or performed.

The catalog is a read-only UI/API projection; it creates no observations, checks,
events or coverage-start timestamps. Failed/offline/stale feeds still show **Current
advisory status unavailable.** for suppliers and **Data unavailable** for waterbodies.
A fresh feed with no matching notice is not proof of safety or
complete monitoring. Bacterial results, drinking-water tests, park closures and a
live NPS conditions feed are **not integrated**. Fictional sample places stay separate.

## What is implemented

- Typed supplier/waterbody journeys with confirmation before saving, limited
  name/county search with NWA ordering, no-match/ambiguity explanations,
  private-well limitations, and Places removal with undo.
- Mobile bottom navigation, desktop top navigation, two-column home and notice
  detail, disclosure panels, filtered observed history and grouped settings.
- Text/shape status indicators, labelled controls, visible focus, skip link,
  keyboard operation and Spanish UI strings. Agency records are not translated.
- Separately versioned live/sample browser preferences, deletion, honest alert
  settings and iOS 16.4+ installed-app instructions.
- Atomic local observed archive, first/last observed times, retained records
  on failure, stable-event deduplication, explicit-lift-only change detection.
  History counts notices, not source checks or official historical totals.
- ADH `GridView1` HTML and ADEQ `updated`/`advisories` JSON parsers, tested against
  authentic recorded responses in `tests/fixtures/`. ADH county copies are grouped
  into one notice. Published dates remain raw agency text (no assumed timezone).
  ADEQ `N/A` lift fields are unknown, not active or confirmed lifted; those places
  show Data unavailable and an explanation. Blank lift fields remain active.
- `GET /api/status` reads local observations and adds the verified directory to
  its place list without writing observation state. `POST /api/check` manually checks
  only the two approved URLs, concurrently, with 15-second timeouts, no redirects,
  a 60-second cooldown and in-flight deduplication. Scheduled checks reuse this path.
- Browser polling reads **saved observations**, not a fresh agency check per visitor.
  Live data becomes unavailable after 15 minutes or on any known source failure.
- Installable manifest with PNG icons and a push-only service worker. No offline
  caching of advisory/API responses; offline status is unavailable, not an all-clear.
- Durable 30-day change journal, first-check baseline suppression, future-only
  opt-in Web Push transport, EN/ES settings, restricted endpoint/key validation,
  retry backoff, restart deduplication and disable/delete with failure retry.
  Sending is disabled by default; no real-device delivery has been verified.
- Live watched-place changes since the previous device visit, using separate
  per-agency browser cursors. First visit establishes a baseline, not a history flood.
  Failed/stale sources do not advance agency cursors; uncertain records never display changes.
- Vercel API entry point, shared PostgreSQL state/captures, cross-instance source
  cooldowns/job leases, durable pre-send claims and shared mutation rate limits.
  Embedded PostgreSQL tests cover independent instances; real platform/pooler/device
  verification remains open. Local JSON data is not automatically migrated.

## Explicit integration gates

Initial checks timed out; automatic checking subsequently captured both sources
on October 13, 2026. **Live parsers are implemented and enabled.** Captures and
schema-validation metadata are saved under `data/live/captures/`. Unexpected
formats, malformed rows, conflicting duplicates or invalid dates fail the check;
partial results never replace a valid snapshot. An empty table/list also remains
unavailable until genuine agency empty-feed behavior is verified.

Feed-derived IDs do not use row order, lifted dates or retrieval timestamps. ADH
event identity uses system name, issued date/time and affected area; county copies
share that identity. ADEQ uses waterbody/county/area and issued date; trailing
asterisks, apostrophe style and county wording are normalized for identity only.
These are derived keys, not official agency identifiers: substantive agency edits
can create a new identity. They do not verify supplier service areas or aliases.

Sources are restricted to:

- ADH: https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx
- ADEQ: https://adeq.state.ar.us/water/planning/hab/advisories.json

[NEEDS: genuine empty-feed evidence, ADEQ N/A/footnote meanings and verified
ADH guidance wording. ADEQ general guidance is verified as documented above;
unknown lift status never triggers a new/lift event.]
[NEEDS: additional source-verified rural systems and broader supplier coverage;
the six-place catalog and observed notices are not a statewide directory.]
[NEEDS: approved HTTPS hosting costs and provisioning (Vercel + PostgreSQL selected), VAPID/contact and browser
push-service authorization, security/operations review and real device delivery
verification. Local implementation is not proof of connected/reliable delivery.
Email is not implemented.] See [VERCEL.md](VERCEL.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
[NEEDS: human Spanish/accessibility review and browser-device testing.]

No safety inference, water testing, prediction or private-well monitoring. A blank
lifted date remains active; disappearance never generates a lift event. Frequency
and false-alarm rates are unmeasured. Guidance gaps are visible, not invented.

## Storage and privacy

`data/live/observations.json` holds the source archive (gitignored); sample records
exist only in the sample module. Live writes reject sample identifiers. Browser keys
`water-alert:live:v1` and `water-alert:sample:v1` are separate; the mode selector
uses `water-alert:mode`; `water-alert:live-check:v1` holds per-agency visit cursors.
Without push opt-in no subscription is collected. Opt-in stores endpoint, encryption
keys, watch/lift choices, language and attempt ledger in `data/live/devices.json`
(atomic writes, mode 0600). The browser holds a deletion bearer in
`water-alert:push-device:v1`; the server stores its SHA-256 hash, not the bearer.
Devices expire 90 days after saving; the running server prunes every minute even
when sending is disabled (an offline server cannot enforce wall-clock deletion).
No email, address or account is requested. Notification content goes encrypted
through browser push services; it may be visible on the lock screen. Explicit
disable/delete revokes browser delivery and removes the server record; on failure,
the app keeps deletion credentials for retry before clearing preferences. Clearing
browser storage outside the app can lose this credential. Source observations are
separate and remain. Operator backups need their own deletion/retention procedure.
No guarantee of secure storage is claimed; a public deployment needs review.
The Vercel path stores the same records in a private PostgreSQL schema rather than
local files. Active cron prunes expired devices; paused/failing cron and backups
require operator handling. Preview cloud requests cannot use production data.

Watch changes are local until **Save alert choices** in live **Settings → Alert Options** succeeds;
the old server choices remain until saved or disabled, with a visible mismatch warning.
Saving starts a new future-only baseline; it never replays older pending notices.
Provider acceptance is not proof of device delivery; crash-after-send can duplicate
a notification. After expiration, disable/remove then enable to enroll anew.

## Contribution and release

This implementation was AI-assisted, including generated code, tests and UI copy.
[NEEDS: student reviews and records their actual contribution and AI assistance.]
[NEEDS: student confirms 2026 CAC eligibility and submission requirements.]
No account creation, publication, deployment, merge or submission was performed.
