# WellPower: WAVE — local implementation and Vercel backend

**All-supplier annual reports — October 19, 2026 (local only; not deployed):**
The [2025 ADH review](docs/research/adh-ccr-2025/README.md) covers all 35 currently
represented drinking-water systems. It preserves 33 retrieved PDFs, extracted
text, exact supplier/PWS mappings, source URLs and hashes. Seventeen reports have
violations and/or significant deficiencies; fourteen report neither; Central
Logan and Springdale need clarification; no matching 2025 report was located for
Riverside Resort or Little Fir. These are historical document findings, not
current safety assessments. **Provider information now connects all 35 suppliers
to their dated report records:** 32 reviewed records (including Central Logan's
explicit unresolved document conflict), Springdale unreviewed because its year
is inconsistent, and two unavailable records with ADH search/directory links.
Fourteen reviewed documents report no violations or significant deficiencies.
Numbered findings are initially collapsed, with physical PDF-page links, clear
finding types and separate reported dates/actions. Significant deficiencies use
inspection dates and reported progress, not invented violation periods. Repeated
findings list their separate intervals once; upstream results retain Community
Water attribution. Desktop facts use two columns and stack on mobile in EN/ES.
No live advisory, backend or notification behavior changes; no automatic PDF
retrieval. Unknown future suppliers remain unreviewed; sample mode and lakes do
not inherit real supplier reports. Human Spanish review remains unverified.

Verification: **373 unit/integration tests in 44 files**, production build and
**40 focused desktop/phone EN/ES browser cases** pass. Browser checks cover
deficiencies, multiple intervals, upstream attribution, conflicting/missing
reports, four city suppliers and Leisure Hills, including 320px overflow checks.
Rendered desktop and mobile layouts were inspected. Browser fixtures block
external requests and API mutations; the full browser suite was not rerun.

**Consistent supplier features — October 19, 2026 (local only; not deployed):**
Leisure Hills, Bentonville, Fayetteville, Rogers and Springdale now use the same
provider-information layout, source-water section and expandable directory facts.
Contacts, advisory history, supplier details and guided help remain available
without an active notice and when the advisory feed is unavailable. The notice
checklist still requires a current active notice; no notice or safety finding is
invented to fill it. Other observed suppliers use the same tools with explicit
unverified directory-profile states, with annual reports as described above.
Lakes remain separate.

`src/provider-profiles.ts` stores exact-ID directory facts and per-record review
dates. The four city profiles were checked against ADH on October 19; Leisure
Hills retains its October 14 directory provenance. No supplier inherits another's
population, source, inspection date or annual-report findings.

**Issues-first Provider information — October 19, 2026 (local only; not deployed):**
Open **Provider information** on Leisure Hills to see its reviewed **2025** annual
report: four compliance issues, initially collapsed, with reported periods,
corrective actions and links to page 2 of the original ADH PDF. “Current” is
explicitly the report's wording, not verified present-day status. Source-water
information follows; **More provider details** independently reveals the original
six directory facts and provenance. Both English and Spanish are implemented.
Expanded issues form a numbered list with the notice-style hierarchy: short headings with report-page
links, then **Reported from**, **Reported through**, **What was reported** and
**Reported corrective action**. Facts form two columns on desktop and stack on
phones; full findings remain visible without shortening the source meaning.

Coverage uses exact-supplier-ID records in `src/annual-reports.ts`, checked
October 19. Leisure Hills' [PWS 747 / 2025 report](https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025)
retains its four findings. Reviewed 2025 reports for Bentonville (PWS 041),
Fayetteville (569) and Rogers (055) show **No violations reported**, scoped to
those documents—not current safety or compliance. Springdale's PWS 575 / 2025
link returns a document titled 2024 with 2025 test results; the panel explains
the mismatch and keeps findings **Report not yet reviewed** with the original
PDF link. Only requested year 2025 is offered. The other observed suppliers are
now covered by `src/observed-supplier-reports.ts`; see the all-supplier summary
above for reviewed, contradictory and unavailable records.
These historical findings do not affect live notices or notifications; no automatic
PDF retrieval or report-health check is performed. Sample mode excludes real report
findings. Fluent human Spanish review remains unverified.

Latest hierarchy verification: 304 unit/integration tests, the TypeScript/Vite
production build and four focused EN/ES desktop/phone browser cases pass,
including desktop-column/mobile-stack geometry. Report layouts were inspected
at desktop and 320px; browser checks block external requests and API mutations.
The full browser suite was not rerun for this change.

Latest supplier-parity verification: **340 unit/integration tests in 42 files**,
the TypeScript/Vite production build and **20 focused desktop/phone EN/ES browser
cases** pass. Unit coverage includes all four city suppliers in active, no-notice
and unavailable states. Browser coverage checks no-notice access, real record
links, guided-help entry and 320px overflow, plus Leisure Hills report regressions.
Rendered Bentonville and Springdale layouts were inspected. Browser fixtures block
external requests and API mutations; the full browser suite was not rerun.

**Visible contacts, advisory history and guided help — October 18, 2026
(local only; not deployed):** Verified phone numbers and full email addresses
are visible links, stacked on phones with wrapping rather than truncation.
Missing contacts have visible explanations. This supersedes the older horizontal,
icon-only contact treatment described below; exact supplier matching and contact
targets are unchanged. Leisure Hills contact provenance remains October 14;
the October 18 directory check reconfirmed its phone, not its email.

Advisory history prioritizes status, agency-issued date, area and reason, with
one per-notice disclosure for unabridged supplied fields and observation evidence.
Unknown lift dates remain unknown. **Provider information** separates directory
facts from help. The full-width teal **Get help with a water issue** button at
the bottom of each supplier card directly opens a five-step EN/ES guide
for service, water-quality/health, consumer disputes or legal help. It reuses all
five editable draft templates, local copy/download and preparation packets.
Back/Next retains edits; leaving, changing context/language, reloading or closing
can discard them. Warnings are informational, not navigation protection.

**Supplier actions — October 19, 2026 (local only; not deployed):**
**View official source** uses the logo's light aqua with white text and arrow in every
supplier status. The bottom help button replaces the expandable help section
and its separate “Open guide” step. Source/check actions stack below 420px.
This supersedes the older state-dependent source emphasis described below.
The help button uses `#047885` with white text. White on the light-aqua source
button has low contrast and does not meet WCAG AA text-contrast requirements.

The non-emergency ADH Safe Water Engineering contact, (501) 661-2623, was checked
October 18 against its [official program page](https://healthy.arkansas.gov/programs-services/licensing-military-member-licensure-permits-plan-reviews/drinking-water-plan-review).
AG form/PDF and legal-help destinations were also checked read-only. Complaint
preparation is not emergency assistance or filing: WAVE does not submit forms,
determine jurisdiction, track cases or guarantee eligibility, response or outcomes.
Drafts stay in page memory; no new browser/cloud persistence was added.

Verification under Node 24: **277 unit/integration tests in 37 files**, **56 guarded
desktop/phone Chromium cases**, production TypeScript/Vite build and
`git diff --check` pass. Expanded history/provider information and guide screenshots
were inspected in EN/ES at 320/390/1366px, including full email wrapping and multiple
notices; keyboard guide navigation clears the mobile bottom bar. The running
localhost:5178 sample guide was also checked. Browser fixtures block external
requests and API mutations. No deployment, real calls/emails, form submissions or
notification sends occurred. Fluent human Spanish review and real-device delivery
remain unverified.

**Reference-matched supplier cards — October 18, 2026 (local only):** Centered
findings use a 56px outline warning for active notices and no icon for fresh
successful no-match results. Active notices emphasize **View official source**;
other states emphasize **Check now**. Actions have equal widths and a 12px gap.
Desktop successful-check rows use a dotted leader; phones stack the timestamp.
Verified contact targets and disabled explanations are preserved, with outline
icons and accessible icon-only controls on narrow phones. Every supplier card
shows the complete water-safety qualification. No status, persistence, recovery,
notification or deployment logic changed.

Local visual check: open `http://localhost:5178` and compare cards at 320, 390
and 1366 pixels. Use sample mode for active/no-match examples (sample mode
intentionally hides checking and real contacts). Check English/Spanish wrapping,
keyboard +/− disclosures, safety text, and the existing local recovery drafts.
Failed, stale and unchecked status layouts are covered with synthetic browser
fixtures; do not create fake live records or send notifications to test styling.

Verification: **270 unit/integration tests**, **44 guarded desktop/phone Chromium
cases**, and TypeScript/Vite build pass under Node 24. Active, no-match, failed,
stale and unchecked card layouts are tested at all three widths. Local browser
views and synthetic screenshots were inspected. No real delivery was tested;
human Spanish review remains outstanding.

**Concise English/Spanish copy — October 18, 2026 (local only, not deployed):**
Home, Places and Settings omit repeated introductions. Status cards retain visible
safety qualifications, real successful-check times and official sources. Coverage,
observation metadata and notification evidence start collapsed; issue dates, affected
areas and lift uncertainty stay visible. Sources and Privacy group their distinct
facts, installation guidance is platform-relevant, and data removal requires an
inline confirmation. Notification states/actions and failed-deletion retry credentials
are preserved; no backend, matching, delivery or retention logic changed.
Verification: **265 unit/integration tests**, **34 guarded desktop/phone Chromium
cases**, TypeScript/Vite build and `git diff --check` pass. Run suites sequentially:
simultaneous test/build runs hit resource-related timeouts; no timeouts were changed.
English mobile and Spanish desktop sample views were inspected locally. Browser
tests use synthetic data, prohibit external/API mutations and make no real sends.
Human Spanish review and real-device notification delivery remain unverified.

**WAVE card redesign — October 18, 2026 (local only, not deployed):** My Water
places **Add a place** beside the page heading. Cards use navy headings, a tinted
status panel, the actual last successful check (with timezone), **Check now** and
a state-dependent official-source link (filled for active supplier notices). Verified contacts stay in one horizontal row,
including on phones; suppliers without a verified email show a disabled Email
button with an accessible explanation. Sample mode still suppresses real contacts
and checking. **Advisory history** and **Provider details & help** start closed;
sitewide disclosures use a right-aligned +/−. The water-safety qualification stays
visible. Recovery tools, source-failure states and notification behavior are preserved.
Verification: 250 unit/integration tests pass with `npm test -- --maxWorkers=1`,
30 guarded Chromium cases pass, and the TypeScript/Vite build passes. Default
parallel unit runs hit existing PGlite database-test timeouts; no timeout or test
configuration was changed. Layouts were reviewed at 320/390/1366 pixels. This is
not deployment, human Spanish review or real-device notification verification.

**Production update — October 18, 2026:** the five approved Task 5 fixes are now
live at **https://water-alert-blond.vercel.app** (tablet header, mobile focus
spacing, Spanish sample continuity, missing saved-notice explanation and scoped
provider-contact disclaimer). This supersedes their earlier local-only notes below.
An isolated release preserved deployed backend/scheduler code; unrelated shared
checkout changes were not released. Production push configuration is unchanged.
See `VERCEL.md` and `CAC-CHECKLIST.md` for deployment evidence and remaining limits.

**Local UI refresh — October 18, 2026 (not deployed):** onboarding now leads with
supplier/lake choices; cards lead with status, last successful check with timezone,
official source and compact verified contacts. Coverage explanations are expandable.
Sample views keep a persistent banner and fictional labels. Navy/teal branding,
source-failure handling and saved preferences are preserved.
Notification configuration has explicit loading/ready/unsupported/unavailable/error
states, a 10-second limit and retry for failed/unavailable checks. Local preferences,
browser permission and server-registration evidence are shown separately; delivery
is not verified and email alerts are not connected. This refresh enables neither.
Verification: 242 unit/integration tests, 28 guarded desktop/phone browser cases and
the TypeScript/Vite build pass. Browser cases include 320/390/1366-pixel layouts.

Isolated React + TypeScript + Vite app with a localhost Express proxy. No imports,
dependencies or records are shared with the earlier Python apps.

WellPower: WAVE—Water Advisory Verification & Empowerment—helps Arkansas residents
check official advisories for their exact water supplier and take informed action
through verified provider contacts and editable follow-up or reimbursement requests.
“Verification” means checking published advisories, not testing water or certifying safety.

Approved branding is integrated locally in the header, welcome About section,
browser/install metadata and share/fallback notification titles (October 16).
English/Spanish purpose text is included; Spanish wording still needs human review.
Existing storage keys and app identity/scope are unchanged. This batch is not deployed
and does not enable notifications or background checking.

The supplied teal-wave logo now replaces the default header drop locally. Its
wave-only mark is used for the favicon, PWA PNGs and Apple touch icon. The original
is preserved in `assets/wave-logo-source.png`; `npm run icons` reproduces the trimmed
transparent header logo and white-background square icons with Playwright Chromium.
App identity and saved preferences are unchanged. Existing installed icons may need
a browser refresh/reinstallation after a separately approved deployment.

See [CHANGELOG.md](CHANGELOG.md) for notable website, backend and hosting changes.

## Supplier details and preparation tools (local changes, updated October 18)

Open **Get help with a water issue** directly on a watched supplier for the guide.
Expand **Provider information** for annual reports and verified supplier facts.
Report issue toggles sit beside the summary heading; expanded issues stay inside
the yellow report panel. The redundant **Supplier details & tools** action has
been removed across suppliers (local only; not deployed). Saved notice links
still open the detailed notice page.
Status, check evidence, official source and contacts
come before **What do you need help with?** Choose a service question, credit/
reimbursement request, complaint or assistance; an existing-request follow-up is
also available. No editor opens until a task is selected. Edits are retained while
switching tasks on that page. Copy/download a
reviewed draft or preparation pack; a verified provider email can open your email
app. Nothing is sent, filed or attached automatically; compensation is not promised.
Edits stay only in page memory and are lost when leaving/reloading the page.
Spanish controls retain clearly labelled English templates and CDC quotations.

Verified Leisure Hills directory facts and ADH annual-report search are separate
from current incident information. Unknown suppliers get no invented facts.
General CDC guidance is not incident-specific ADH instructions; stale, failed
and historical views keep it collapsed as reference. Sample mode suppresses real
provider contacts and labels exported drafts as synthetic.

Earlier October 14 verification: 210 tests and the TypeScript/Vite build passed
under Node 24 after the missing observation-store module was repaired. The latest
local verification is recorded above; the preparation-tool changes remain undeployed.

## Run

Use Node 24 LTS (also pinned for production). From `water-alert/`:

```sh
npm ci
npm run dev
```

Open **http://localhost:5178** (the default allowed mutation origin). UI port 5178; API port 8788. Both bind to
localhost. `npm test` runs the domain, UI and local-server tests;
`npm run build` checks TypeScript and builds the UI. `npm run dev:ui` runs
the sample UI alone. `npm run preview` previews the build but does not start
the API. Initial production deployment: **https://water-alert-blond.vercel.app**.
Production push is enabled as of October 17, 2026; the separately approved
Cloudflare scheduler is active. Activation checks found zero production devices
and sent nothing. Production-device delivery, scheduled advisory-to-push execution,
day-long observation and free-tier quota review remain open. See [PUSH-PLAN.md](PUSH-PLAN.md).

### Local browser journey checks

With Node 24, from `water-alert/`:

```sh
npx playwright install chromium # One-time browser download, if not installed
npm run test:e2e
npm run test:e2e -- --list
```

Playwright discovers only `tests/e2e/*.spec.ts`, separate from Vitest. It starts
its own UI-only Vite server at `http://127.0.0.1:5194` (port must be free), without
the normal API proxy, env-file loading, backend, scheduler or database. Tests use
a fixed clock and a synthetic Leisure Hills incident, not `data/` or live feeds.
External requests and unexpected API requests are blocked and fail the tests;
service workers are blocked. Contact and agency links are checked without opening
them. Nothing is called, emailed, filed or sent.

Fifty-six Chromium cases cover desktop (1440×900) and phone-sized (390×844) journeys,
logo loading, contact targets, editable request/follow-up downloads, clipboard,
email-draft encoding, memory-only draft edits, and failed/stale-source states.
The header regression additionally checks 761/768/820/900px with a reserved
scrollbar gutter. The approved October 17 local fix reduces only the tablet logo
width. A keyboard-focus regression checks that Tab to the draft editor clears
bottom navigation at 320/390/760px. The approved mobile scroll-margin fix and
tablet fix are local only, not deployed. Spanish sample-entry regressions cover
new/saved sample preferences and unchanged live choices on exit: entering sample
retains the current language; exiting restores saved live preferences. This fix
is also local only. Bounded Spanish browser review is not fluent-speaker review.
Saved-notice checks cover English/Spanish missing IDs and unresolvable places,
return home, exact historical facts and archive removal without substitution.
The approved missing-link explanation fix is local only, not deployed.
The approved English/Spanish provider-contact disclaimer now specifies no
automatic provider calls/emails, not a website-wide absence of messages; push
behavior is unchanged. This wording fix is also local only. See
`CAC-CHECKLIST.md` for the bounded clipboard/download/recipient, fallback,
draft-storage and source reviews, plus unresolved human/device/link checks.
This is not real-phone/virtual-keyboard,
assistive-technology, hosted-backend or notification-delivery verification.
Failure screenshots/traces are saved in ignored `test-results/`.

### Automatic checking

The local server checks both approved agency URLs at startup and every **five
minutes**, with no overlapping runs or immediate retry loop. The live website
reads saved observations every **30 seconds** (can be disabled in Settings).
Sample mode does not poll the live API. Manual checking keeps its cooldown.

For the local server, checks continue with the browser closed **only while the
server is running and the computer is awake**. The deployed Vercel path instead
uses PostgreSQL and an approved Cloudflare scheduled Worker, independently of the
laptop, not Vercel's paid frequent cron. Hosted source retrieval, persistence and
HTTPS/API/cron protection checks passed; production push is enabled. A configured
five-minute schedule is not a guarantee of uninterrupted five-minute checks:
day-long reliability, quota review and automatic device delivery remain open.
See [FREE-HOSTING.md](FREE-HOSTING.md) for free-plan limits and remaining scheduler gates, and
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
**Supplier details**, an accessible modal with published notice facts and a
three-step checklist for active notices: read the official notice, review the
affected area, and get help. Checkboxes are manual, do not change advisory status,
and reset when the modal closes or the page reloads. English and Spanish controls
are available. Failed or stale checks do not show an active-notice checklist.
The modal ends with the actual **Last successful check**, right-aligned with a
dotted leader, and provider contacts. The lower CDC guidance, original-wording
section, coverage notes, duplicate notice/detail links and source activity are
removed from this popup. Checklist actions and the main app's history, source
information and guidance remain available. Escape or Close returns focus to the info button.
**Alert history** starts collapsed on the card. Failed checks keep
**Current advisory status unavailable.** primary. Waterbody cards retain their
separate **Last successful check** and **Latest attempt** panels.

Compact cards use **Affected area**, **Reason**, **Issued** and an **Active**
badge. Exact whole-system wording (alone or preceded by the matching supplier's
name and “for the”) displays as **Entire system**; qualifiers and other areas
remain complete. Recognized ADH numeric issue date/time fields display a short
date and minute precision, preserving an explicit source zone without guessing
one. Stored records, history and detail views retain published wording; the
checklist's **View area** action also reveals the original affected-area text.

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
acceptance and overlapping-watch deduplication are tested with a fake sender.
Later isolated phone tests arrived; production push is now enabled, but deployed
automatic advisory-to-device delivery remains unverified. See [PUSH-PLAN.md](PUSH-PLAN.md).

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
   Sending is disabled by default locally; production is explicitly enabled.
   Isolated iPhone tests arrived; production-device delivery remains unverified.
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
[NEEDS: remaining security/operations review, production-device and deployed
scheduled delivery verification, day-long observation and free-tier quota review.
Free hosting and production VAPID/contact configuration are approved and active;
local tests and activation do not prove reliable automatic delivery.
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
