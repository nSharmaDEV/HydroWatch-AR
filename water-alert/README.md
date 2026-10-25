# WellPower: WAVE — app development

See the [project overview](../README.md) for the problem, features, sample journey,
sources, limitations and contribution disclosure.

## Local setup

Use **Node.js 24.x**. From this directory:

```sh
npm ci
npm run dev
```

Open **http://localhost:5178**. Vite proxies `/api` to the Express service at
`http://127.0.0.1:8788`. Both bind locally. Default local operation uses JSON state
under ignored `data/live/`; hosted operation uses PostgreSQL. Sample mode is
fictional and separate from live records.

No `.env` is required for default local operation. Keep production credentials
out of local demos. See [`.env.example`](.env.example) and the deployment guides
before configuring optional hosting or push. The frontend deliberately does not
load runtime `.env` files.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local UI and API |
| `npm run dev:ui` | UI only; sample mode works without the API |
| `npm test` | Unit/integration suite |
| `npm run build` | TypeScript checks and production UI build |
| `npm run preview` | Preview built UI; does not start the API |
| `npm run test:e2e` | Synthetic Playwright journeys with an isolated UI server |

Install Chromium once with `npx playwright install chromium` before browser tests.
Those tests intercept API requests and block external requests/service workers;
they do not verify real agency retrieval or notification delivery.

Latest cleanup check (October 20, 2026, Node 24.22.0): **445 unit/integration tests
and production build pass**. The full browser suite has **78 passing and 22 failing
checks**, involving card geometry/element and section-order expectations. App and
test code were unchanged by cleanup; browser failures remain unresolved. See the
[changelog](CHANGELOG.md) for details.

## Decorative water background

The Home intro and two action cards retain their original spacing below the shared
header/banner. The background fills the remaining viewport without a bottom strip;
short screens and mobile can scroll naturally without hiding the actions.

All pages share a light blue-to-white gradient with a background-only WebGL
water effect below the header and any banners. The same canvas persists while
navigating between pages. Cards, navigation and text are not distorted.
Home retains full ripple visibility; other pages render the canvas at 18% opacity
over the static gradient to keep attention on the content.
Click/tap drops, throttled mouse movement and ambient drops never intercept controls
or touch scrolling. Smooth circular wavefronts expand from the input point and
fade completely; a lighter, spaced cursor wake and ambient drops at random
positions every 1–2 seconds overlap softly for continuous background motion
without input, starting after the same randomized 1–2-second delay.
Automatic and click/tap drops use half their previous strength, with the same wave profile.
The WebGL renderer uses at most eight analytical waves rather than
packed-height simulation buffers, avoiding accumulating background noise.
Animation pauses in hidden tabs and uses bounded GPU resources.
Reduced motion, unavailable WebGL and context loss retain a static gradient.

## Home sources shortcut

On Home, the card's info icon opens **Sources and coverage**, using the existing
in-app coverage page. The separate sidebar shortcut is removed; Settings still
offers that page. The desktop Add a place button starts level with the main card.
Home's updates section contains only the heading and toggle, followed by About
these results; notification details remain available through Settings.
Short desktop layouts use tighter spacing to keep the collapsed Home carousel's
Previous/Next controls visible, including the tested long-notice example at
1280×650 and 1440×780. Expanded content and enlarged text can still scroll.
When supplier phone/email details are unavailable, Service questions offers a
right-aligned **Contact ADH** link to Safe Water Engineering instead of the
missing-contact paragraph; verified supplier contacts remain unchanged.

### Explicit ADH affected-area association

ADH lists the October 14, 2026 Leisure Hills notice under **VILLAGE WATER LLC**
and explicitly names **LEISURE HILLS MOBILE HOME PARK for the Entire System**
in Area Impacted. A source-verified association (October 22) matches that exact
system/area/Benton County combination to the saved Leisure Hills supplier in
status and advisory history. It is not a general Village Water alias or inferred
service boundary. Source record IDs, wording, dates and lift handling are unchanged;
other affected-area wording requires separate verification. This does not replay
past notification events or establish device delivery.

## Observed supplier map

**Map** opens the compact **Advisory map** workspace. Desktop keeps the
Arkansas map beside one internally scrolling supplier-results panel; selecting a
marker or row replaces that panel with the same supplier's advisory details.
Back restores the list position, selection, filters and map view. Search matches
supplier names or counties; My places / All places and Status filter both the
map and results together. Mobile uses Map / List tabs and a modal details sheet
with keyboard focus, dismissal and background-scroll handling. Home is unchanged.

Only ADH suppliers represented in saved observations are included, using exact
supplier IDs and the separately verified affected-area association described above.
Colors use the existing current-status/freshness logic and app clock, not an old
notice's presence in the archive. Unmapped suppliers remain listed with their
current status, active ones first, labeled **Location unavailable** in the same
results list. No-active is not a safety finding; disappearance
is not an explicit lift. Failed, unknown and stale data never show an all-clear.

`src/supplier-locations.ts` covers **all 31 suppliers in the local observed-history
inventory reviewed October 21, 2026**. It also retains the previously reviewed
Fayetteville point (32 catalog entries total); points appear only when their
exact supplier IDs have saved observations. This is not all Arkansas suppliers
or automatic coverage of suppliers observed in the future.

For the 31 observed suppliers, 26 exact-name matches use historical centroids from
the [Arkansas GIS public-water-systems layer](https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Utilities/FeatureServer/15).
Two additional GIS points have documented identity evidence: Brunner Hill's
conversion to a public water authority and North Jackson's abbreviated name
linked through official PWS ID 767. The GIS source has no PWS ID field; no fuzzy
name matching or city/county placement is used. The other three points are
explicitly labeled references: Salem's provider office, Riverside Resort's
published property location, and the government Little Fir campground location.
Their provider/Recreation.gov coordinates are linked to the corresponding ADH
directory entries, not geocoded from a contact mailing address.

Each catalog entry records the exact WAVE supplier ID, source name/URL, review
date and point meaning; non-exact-name/site matches include identity-evidence
links and a review note. The heading's info shortcut opens the existing **Sources
and coverage limits** page, whose expandable map sources show point types and links
in English/Spanish. These are **not current service boundaries, affected areas or
water-system asset locations**. Future suppliers still require individually
reviewed locations and otherwise remain labeled Location unavailable. Precise
advisory-area mapping would additionally need official affected-area geometry.

The bundled, simplified Arkansas outline in `src/arkansas-outline.ts` comes from
the [U.S. Census Bureau generalized ACS2025 states layer](https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2025/State_County/MapServer/9)
(`STATE='05'`; public domain; January 1, 2025 vintage). It is context only, not
water-service geometry. Source attribution and point-review dates are available
on Sources and coverage limits. The map keeps the visible warning: “Markers show
supplier locations, not affected boundaries.” No map library, tile service, new
polling or CSP exception is needed.
Controls and warnings support English/Spanish, keyboard access and reduced motion.

Local map validation (October 21, 2026): **16 map/coverage unit tests, 25 existing
history/content tests, four synthetic desktop/phone browser checks and production
build pass**. Full unit run with two workers: **505 passed, four failed**; the
four report/contact-copy failures also reproduce against committed HEAD. An
    earlier full run had two additional journey failures that pass in isolation and
    the two-worker rerun. These checks do not verify production feeds or device
    delivery. The map and current observed-history work were deployed together on
    October 22, 2026; see the [deployment record](VERCEL.md). Device delivery is
     not verified.

The compact workspace redesign is a **local implementation on October 22, 2026**,
not part of the deployment record above. Its intercepted, synthetic browser checks
cover 1280×700, 1440×780, phone keyboard/modal behavior and enlarged text. Full unit
run with two workers: **508 passed, nine failed** in existing notification,
contact-copy and report expectations; production build passes. These checks do
not verify production feeds or device delivery. Nothing deployed or sent.

## Advisory help

Help uses the existing Map-aligned shell: **Choose issue → When and where →
What did you observe? → Requested response → Review**. All categories retain five
stages; billing details are on observations. Review is the final screen,
with a header Send action only when supported for every selected recipient;
otherwise the header offers Copy email. Download and official alternatives remain
available, without another confirmation page. Every screen shares the same
heading–leader–primary-action layout, with Back, progress and save status in one
compact row. Middle screens use matching white, bordered panels with 24px desktop
padding; choices are full bordered rows and writing prompts are rounded chips.
The supplier stays visible, progress shows the actual **Step n of m**, and Back
preserves answers and email edits. No relevant records means omitting that tool,
not an all-clear claim. The typical advisory desktop path fits at 1280×800 without
page scrolling at normal text size; optional expanded tools or larger records can
need scrolling. Mobile and enlarged text use one column and natural page scrolling.

Four large icon choices and a full-width Other issue choice show relevant questions.
Service uses start/end dates and an explicit ongoing choice; only No enables
the end date. The locations panel replaces the old area input without discarding
previously saved area answers. Observation and requested-response suggestions are unselected
until confirmed, editable through a small explicit Edit wording action, and omitted
when unselected. Conditional service frequency, location clarification and optional
prior-provider-contact questions never assume recurrence or contact outcomes.
Billing separates short charge,
period and amount answers from the multiline previous-attempt and desired-response
answers. Dates/area have their own optional screen; attachments and relevant official
guidance are visible on the split observations screen, not hidden behind a disclosure.
Timing and resident-confirmed locations sit side by side; locations support manual
wording, visible saved-supplier/catalog suggestions while typing and removable chips.
Arrow keys and Enter select a suggestion; Escape dismisses it, and unmatched wording
can be added manually. Invalid end-before-start dates block Continue until corrected.
They are
not verified addresses or inferred supplier boundaries. All confirmed locations
enter generated prose and the first enters the subject. Writing prompts explain
what to consider without inserting example text into the draft. Verified exact-ID
supplier phone/email links on the observations screen open the resident’s native app;
they do not place calls or send messages automatically. ADH contacts remain separate,
and sample mode exposes no real supplier contacts. A large attachment button shows
reading/ready status, filenames and removal within the existing upload limits.
Exact-supplier agency facts stay separate from residents' experience, with a source
beside each editable/removable fact. Multiple published problems remain distinct.
Dated historical report findings are opt-in, never a current safety
or compensation finding. Saved facts are labeled as not currently verified.
Bounded previews are not exhaustive; check the linked original source.

Review uses a 35% information / 65% email layout inside the Map-aligned container.
The left column’s “What you provided” table has two columns for supplied answers; a
small ⓘ beside each answer opens its existing editor (with an accessible name). The official
records remain in a separate compact table. Missing useful answers show “Not provided”
with Add. “View source details” expands full wording; a separate icon-only trash button
asks for confirmation before removing a record without rewriting manual email edits.
Source wording and supporting detail are collapsed until requested. Attachments show
a count and filenames; file limits are available when adding files. Name/reply contact
remains optional and collapsed. The right column contains the recipient dropdown,
subject, complete editable message, citations and update/download actions. At desktop
sizes the panels align and the composer uses the available viewport height without
page scrolling at 1280×800; the information column scrolls internally when needed.
On mobile the information stacks above email and the page scrolls naturally without
shrinking text.
Recommendation stars and contact explanations stay inside the recipient selector.
Expandable source details retain full attribution in accessible labels and record details.
Only directory contacts are offered; an
external-only selection blocks WAVE email sending rather than being silently omitted.
Email uses natural paragraphs, with source-attributed agency information rather than
internal form headings. Inline numbered citations correspond to clickable source links
beside each record and in the composer. Numbered citations share each source URL once. Attachment
names stay in the information column; source links appear there and beneath the message. Official
records show agency, readable date, listed problem, published area and verification
limits; full source wording expands for per-fact changes. Historical years stay explicit.
Quotations retain their original wording unless explicitly edited. Long messages
scroll inside the desktop editor; mobile uses natural page scrolling. Review has
the shared Back control and reports the send outcome there. Sending requires configured
delivery; sample sending stays disabled. Untouched subject/message fields update
from changed answers, recipients and facts, including saved-record status on resume.
Manually edited subject and message fields are protected independently, including
intentionally blank fields and legacy drafts. Meaningful changes flag protected
email as outdated; **Update draft from answers** confirms replacement of both fields.
There is no Report tab. **Download report** derives a current resident issue report
from the same confirmed answers, not an inspection or agency determination. Changing
category clears incompatible answers and wording but retains locations. Optional name/reply
contact is explicitly supplied. Download email preserves manual edits; Download
report uses current answers. Text downloads do not bundle attachments.
Language changes preserve edits. Citation metadata is saved with drafts and
immutable outgoing copies.

**History** now contains private saved drafts and request conversations, not the
advisory map. When accounts are not configured, live mode opens device-only drafts
and History directly, with sending disabled. Otherwise, choose device-only drafts without an account or sign in
for private account History; the two stores stay separate. Sample drafts also stay
on the device and cannot send. Device-only live drafts are not submitted by WAVE;
copy/download or use an official provider channel instead. Wait for **Saved on this
device** before refreshing. Unsaved
changes trigger a browser-leave warning where supported; failed saves retain text
in the open editor with retry/download and same-account sign-in recovery. Do not
reload unsaved text. Conflicting edits require keeping a copy and reloading.

Original issues and sent message/attachment snapshots are retained separately from
editable drafts. Sent means the email service accepted a message, not delivery;
signed delivery events and supported verified plaintext replies appear on the same
conversation. A reply never resolves the issue: only the resident closes/reopens a
request. Unknown outcomes use the same immutable send key within a bounded window,
never a new send. Incoming attachments are not imported. Official complaint/legal
forms stay external; opening or copying one never marks a message sent.

Accounts and delivery default to unavailable. Existing Supabase accounts, enrollment
and recovery, private hosted migration, Resend sender/inbound domains and signed
webhooks are operator release gates. See [help request operations](HELP-REQUESTS.md)
for configuration, API, limits and privacy/deletion. This redesign is local source
work, not a deployment or real-delivery verification. October 24 confirmed-output
checks: 89 targeted unit/integration tests, 84 isolated synthetic browser checks
and the Node 24 production build pass
(bundle-size warning remains). Full unit suite: 573 pass, nine known
unrelated notification/contact/report expectations fail. Desktop/mobile captures
were inspected, including the long final Review editor and 1280×800 viewport fit.
The following older checks
describe the retired guides at their recorded dates.

Local implementation check (October 20, 2026, Node 24.22.0): **477 unit/integration
tests, production build and 16 targeted help browser checks pass**, including
English/Spanish at 1440/390/320px. The full browser suite was not rerun for this
change; the earlier cleanup results above are historical, not a claim that all
browser journeys pass. No deployment or real submission/delivery verification.

Workspace check (October 21, 2026): **27 targeted help unit tests, 24 targeted
browser checks and production build pass**. Full unit run: 483 pass and four
fail in report historical-disclaimer and missing-email expectations outside the
help workspace. The full browser suite was not rerun. These are local synthetic
checks, not production or device-delivery verification.

## Opening logo

The supplied logo is traced as SVG outlines for a 2.51-second opening animation,
including a 0.7-second hold after the logo fills and before it fades to the app,
shown once per browser session using `sessionStorage`. The app mounts underneath;
the decorative overlay never captures input or locks scrolling and is removed
afterward. Reduced motion shows the completed logo with a short fade (650ms total).
If session storage is blocked, the intro still finishes but can replay on reload.
The existing PNG header logo is unchanged. To regenerate the intro's outlined
artwork, run `node scripts/trace-logo.mjs` with local Potrace and Playwright Chromium;
these tracing tools are not required to run or build the website.

## Public-water supplier scope

The website now offers public-water suppliers and ADH boil-water notices only.
Lakes, waterbodies, recreational-water advisories and private wells are outside
the current user-facing scope, in both English and Spanish and in sample mode.
Previously saved lake choices and historical agency records are retained but
hidden; this is not a data purge. Legacy ADEQ parsing/storage remains in the
backend. Existing server notification choices are not automatically changed:
save supplier-only alert choices or disable the subscription in Settings.

## Documentation

- [Change history](CHANGELOG.md): dated changes and local/deployed distinctions.
- [Detailed implementation notes](IMPLEMENTATION-NOTES.md): retained evidence,
  sample walkthrough, parsing semantics, API/storage/privacy details and open gates.
- [Deployment](DEPLOYMENT.md), [Vercel](VERCEL.md), [free hosting](FREE-HOSTING.md).
- [Push status and verification](PUSH-PLAN.md): production enablement is not proof
  of reliable automatic advisory-to-device delivery; email is not implemented.
- [Annual-report research](docs/research/adh-ccr-2025/README.md): historical,
  document-scoped findings, not current safety assessments.
- [Submission checklist](CAC-CHECKLIST.md): evidence and outstanding human reviews.
- [Design history](../docs/wireframes/README.md): synthetic proposals, not shipped UI.

Keep `water-alert/` as the hosting project root. Repository cleanup has not changed
runtime paths, migrated data, deployed code or submitted a competition entry.
