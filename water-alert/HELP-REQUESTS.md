# Private help requests: setup and limits

Local implementation, updated October 23, 2026. **Not deployed or verified with real email.**
Default operation requires neither accounts nor email credentials: these services
are unavailable until explicitly enabled. Do not enable them for a public demo
without reviewing the gates below. No automatic agency filing or email alerts.

## Configuration

All values are server-side, never `VITE_` variables. No services are provisioned by
the application. Operators must already control the account project and domains.

| Variable | Purpose |
| --- | --- |
| `WATER_ALERT_ACCOUNTS_ENABLED=true` | Enable existing confirmed Supabase email/password accounts. Default off. |
| `WATER_ALERT_SUPABASE_URL` | HTTPS project origin, without a path. |
| `WATER_ALERT_SUPABASE_KEY` | Publishable/compatible anon key; never a service-role key. |
| `WATER_ALERT_ACCOUNT_URL` | Optional HTTPS enrollment/recovery portal managed by the operator. No signup/reset mail is sent by WAVE. |
| `WATER_ALERT_EMAIL_ENABLED=true` | Enable explicit resident-initiated sending. Requires accounts and all email values below. Default off. |
| `RESEND_API_KEY` | Secret with sending and receiving-read access. |
| `WATER_ALERT_EMAIL_FROM` | Verified bare sender email address. |
| `WATER_ALERT_REPLY_DOMAIN` | Owned inbound domain configured in Resend. Replies use unguessable per-request addresses. |
| `RESEND_WEBHOOK_SECRET` | Resend/Svix `whsec_` signing secret. |

The existing origin/CORS/CSRF and rate limits still apply. HTTPS uses a Secure,
HttpOnly, SameSite=Strict session cookie scoped to `/api/help`. Access expires
within one hour; refresh tokens are not retained. Every private API operation
validates the access token with Supabase, not a device/push token or caller-supplied
owner. Same-account reauthentication in the open editor preserves unsaved text.

## Resident flow

The Map-aligned workspace presents one task per screen, keeping the supplier visible:

1. Choose one of four icon buttons or the full-width Other issue button.
2. Add optional dates and locations, leaving unknowns blank. Service start/end
   dates expose calendar controls; only an explicit No to ongoing enables the end
   date. Unanswered and Not sure never mean ended. The two-column screen offers
   dates in a white bordered panel on the left and optional multiple locations in
   a matching panel on the right. Previously saved area answers remain in drafts
    and generated text, without a second affected-area input. All categories, including
    billing and Other, retain these five stages. Dates can be marked approximate.
3. **What did you observe?** offers editable observation checkboxes and free text.
   Bordered observation choices and concise guidance are on the left; description, pill-shaped writing prompts
   and a large photo/document button are on the right. Filenames, readiness and
   removal stay visible. Prompts focus the field and explain what to consider;
   they never insert placeholders or claims.
4. Choose/edit the response you want on a separate short screen. Only checked
   wording and supplied free text enter the email; suggestions are never assumed.
    Selected rows have a small explicit Edit wording action; selecting a row does
    not turn it into an editor. Service frequency and location clarification appear
    only when relevant. Advisory experience is separate from requested instructions;
    confirming a service problem reveals service observations. Optional prior provider
    contact reveals date, method and resident-reported response only for Yes. Billing
    details remain on observations, without account or payment credentials.
    Selected requests sit beside one optional specific-response field. Billing
   previous-attempt and optional desired-response answers remain multiline.
5. Review presents an editable email, with a downloadable report derived from the same confirmed answers.
    The unified email composer contains To, Subject, a dominant message editor,
    a top-right citations popup and attachments. The recipient dropdown
   contains the starred recommendation and contact details. Source links retain full
    accessible attribution. Relevant **Problems** appear in source tables: each
    exact-supplier fact has a source and inclusion checkbox. Reviewed historical
    findings with no corrective action listed are included and locked for the exact
    provider across email categories; other historical findings remain opt-in.
    These dated findings are not current-status claims. Missing resident answers
    are highlighted links to the relevant step. Name/reply fields remain expanded.
   Saved facts are not verified as current. Bounded previews are not exhaustive.
    Email uses natural paragraphs, not internal report-section headings. Agency
    statements remain attributed, with numbered citations and each source URL listed
    once. The structured report is a resident account, not an agency determination,
    and omits empty sections. Its content always reflects the latest confirmed answers.
    Supporting-fact counts and distinct-source counts are separate. Optional name and
    reply contact are supplied deliberately, never copied from an account automatically.
    Source links and attachment names remain visible.
   Multiple problems and resident/agency statements remain distinct.
   The header offers Send only when every selected recipient and configuration
   supports it; otherwise it offers Copy email. Download and official contact links
    remain available. Download email retains edited email text; Download report uses
    the latest derived report. Neither text download bundles the actual attachments.
    All actions are on this final screen, not a separate
   confirmation page. A long desktop editor scrolls internally; mobile is natural
   page scrolling. Send success/error stays here. Unavailable delivery and sample
   mode still prevent sending. Every screen puts its primary action beside the
   heading and decorative leader, below a compact Back/progress/save row. Matched
   desktop panels have 24px padding; mobile stacks them and simplifies the leader. Device-only editing
   has no sign-in footer.

Locations are resident-confirmed descriptions, not verified addresses or supplier
boundaries. Existing saved supplier names and catalog search results are optional
suggestions, never preselected precise locations. Manual wording works without
search results or an available catalog. Up to ten removable locations are retained
across Back/resume and included in generated prose; the first also appears in the
generated subject. Optional address matching uses the U.S. Census Bureau Geocoder
only after the resident selects “Find matching Arkansas addresses”; the typed query
is sent to Census, and only Arkansas matches are offered. Census matching requires
a street address and is not a complete address-autocomplete directory. Manual
location wording remains available when there is no match or the service is down.
The selected resident description is not a verified water-service boundary.

Recipient addresses are resolved server-side from the existing directory, never
accepted from a draft. Every selected recipient must have a supported verified
email or sending is blocked for the entire selection. ADH/Attorney General/legal
channels currently remain external links, not invented email addresses. Explicit
sending shares selected addresses with all recipients. Immutable snapshots retain
the full destination list; retries reuse that list and the same send key. History
shows all snapshot destinations; verified replies may come from any of them.

**Step n of m** counts only screens on the actual path. Skipping absent records
never implies safety. The typical advisory path fits the 1280×800 desktop viewport
at normal text size without shrinking text; expanded tools/records may need scroll.
Mobile/enlarged text reflow to one column. Back, resume and language changes preserve
answers and edited messages. Fact changes never silently regenerate an edited email;
regeneration requires confirmation explicitly replacing both email subject and message.
Meaningful answer, recipient, fact, attachment or signature changes mark the email
outdated without overwriting it; navigation and manual email edits do not. Report
remains current even while the email is outdated. Sample data stays visibly fictional.

## ADH contact guidance reviewed 2026-10-24

The [ADH general contact form](https://healthy.arkansas.gov/resources/about-adh/contact-us/adh-contact-form/)
instructs residents to contact the specific program first, using the general form
when unable to reach it. It requests contact details, the program, feedback and
whether the program was already emailed. WAVE does not invent those answers or
submit this form. The [ADH contact directory](https://healthy.arkansas.gov/resources/about-adh/contact-us/)
lists Engineering; the existing verified directory remains authoritative for contacts.
The [water-system forms page](https://healthy.arkansas.gov/programs-services/public-health-safety/drinking-water-systems-operators/water-system-forms/)
contains operator/compliance forms, not a resident service-complaint template.
No dedicated general public-water complaint form or official sample complaint was
identified in these reviewed pages. WAVE therefore labels ADH text as a draft
Engineering inquiry, not a filed complaint, and adds it only when ADH is selected.
Changing recipients never rewrites a saved body; review it or explicitly regenerate.

## Storage and migration

Drafts support optional issue-specific `answers`, limited to recognized question
keys and 1,000 characters per answer. Older drafts without this field remain
readable. Optional `sources` metadata holds up to 60 records, each with `recordId`
(200 characters), `label` (300) and an HTTPS `url` (2,000, no credentials). Citations
are stored alongside drafts and copied into immutable outgoing snapshots. New
generated emails include concise numbered source URLs; existing edited messages
are never rewritten merely to add them. Legacy drafts without metadata are preserved,
including their original body text. These additions use the existing JSON storage;
no further schema migration is required. Regeneration is explicit so saved message
edits are not overwritten. Optional `flowStep` records the guided screen; older
numeric `stage` values and old records/confirmation steps resume at final Review.
Optional `facts` hold up to 60 individually editable records with ID, text, kind
(`active`, `saved`, `historical`), inclusion choice and HTTPS source metadata.
Combined fact text is limited to 16,000 characters; the editor reserves room for
context separators. Initial previews keep whole quotations within those bounds.
Resumed active labels become saved/unverified, without replacing source text or
email edits with a newer notice. These fields use the existing JSON payload;
no new database migration is required.

Optional `recipientRoutes` contains at most four unique directory route IDs.
Optional `locations` contains up to ten unique nonempty descriptions, at most 200
characters each, without control characters. It uses existing draft JSON storage,
not a hosted schema change. Older drafts without it remain readable.
Optional `wording.report` and `wording.response` each contain at most eight selected
editable strings (`first`, `second`, `third`, `other` and service-prefixed equivalents),
up to 1,000 characters each. Optional `residentName` (120), `replyContact` (200) and
`generatedFrom` (128) are bounded strings without control characters. The generation
fingerprint detects changed inputs, not identity, authenticity or delivery.
`flowStep` includes timing and requested-response screens. Outgoing `destinations` preserves
all resolved addresses; older snapshots use their existing single `destination`.
These are JSON payload additions, not a database schema migration.

Local storage: ignored `data/live/help-requests.json` (or the configured data
directory), atomic writes with restrictive permissions. Hosted storage: private
`water_alert.state` row `help`, covered by the existing runtime role/RLS. It is
never included in public `/api/status`. Browser database roles must have no access.

`npm run db:migrate` now applies `001-cloud.sql` and repeatable `002-help.sql`,
using the existing operator-only `DATABASE_URL_ADMIN` workflow. **Do not run this
against hosting without authorization.** Existing runtime grants on the state
table also cover the new row; do not grant browser roles or expose the schema.

This is bounded pilot storage: one transaction-locked aggregate, 64 MB total,
20 requests per account, 50 messages per conversation. Three outgoing attachments,
1 MB combined, are accepted per message/draft (PDF, PNG, JPEG, plain text, with
basic content checks—not malware scanning). Outgoing bytes belong to their draft;
foreign attachment IDs cannot fetch anyone else's files. Sent copies and original
issue snapshots are immutable; editable follow-ups remain on the same request.
Optimistic revisions reject conflicting edits rather than overwriting them.
Production scale requires a separately reviewed normalized/storage architecture.

Sample drafts use only `water-alert:sample-help:v1` in browser storage. They never
enter live stores, routing, or delivery. Live drafts created without an account use
the separate `water-alert:live-help:v1` browser-storage key; these device-only
drafts are not sent to WAVE, account History, or transferred to a later account.
They are not account-backed and are removed by device-data deletion. Signed-in live
drafts remain server-backed and are not cached in localStorage. Watch for **Saved**
or **Saved on this device**, as appropriate, before refreshing; browser leave
warnings are best effort. On failed saves, retain the open editor and download a
copy. Downloads do not include attachment bytes.

## API

Browser routes are relative to `/api/help`; writes require the configured origin.

| Method/path | Behavior |
| --- | --- |
| `GET /session` | Availability, confirmed identity, delivery availability and optional account portal. |
| `POST /session` | `{email,password}` signs into an existing confirmed account. |
| `DELETE /session` | Clears this browser's WAVE cookie; not global managed-session revocation. |
| `GET /requests` | Only the authenticated account's drafts/conversations. |
| `POST /requests` | `{draft,revision}` saves a bounded draft with optimistic concurrency. |
| `POST /requests/:id/send` | `{revision}` prepares an immutable send; `{messageId}` retries the same uncertain send. |
| `POST /requests/:id/status` | `{status:"open"|"closed"}` changes resident request status, not delivery status. |
| `DELETE /requests/:id` | Deletes one owned request and its WAVE attachment copies. |
| `DELETE /requests` | Deletes all this account's WAVE requests. |

`POST /api/help/webhook` is provider-to-server: no browser session/origin, but raw
body Svix HMAC verification, five-minute timestamp tolerance and event deduplication
are mandatory. Subscribe to `email.delivered`, `email.bounced`, `email.failed` and
`email.received`. Delivery matches a stored provider message ID. If acceptance has
not yet committed, 503 requests webhook redelivery instead of losing the event.

Resend acceptance means **Sent**, never Delivered or resolved. A send timeout or
unconfirmed response becomes **Send outcome unknown**. Retries retain the immutable
message and idempotency key, require a 30-second pause and stop after 23 hours
(inside Resend's 24-hour window). Do not create a replacement to bypass uncertainty.
After that window an operator must investigate the provider receipt/log; WAVE has
no support inbox or automatic reconciliation. Keep sender/domain configuration
stable during uncertain sends. Definitive delivery failure is recorded from signed
events. Request close/reopen is independent and only resident-controlled.

Incoming plaintext is fetched only from the fixed Resend receiving API after a
valid signature. Association requires the owned reply domain and secret request
token, an exact prior outgoing recipient sender, and DMARC pass. Unmatched or
unauthenticated replies are not attached; verify other correspondence in the
original email channel/provider console. HTML is never rendered. Incoming attachment
metadata produces a warning, but files/URLs are never fetched or imported. There
is no general inbox, arbitrary-address sending or automatic escalation.

## Privacy, deletion and release gates

Drafts include resident-entered facts and optional files. Sending shares the
reviewed message/files with the exact directory-verified recipient and Resend;
received supported reply text is stored privately by WAVE. Do not add unnecessary
account/medical data. No published notice or report proves personal loss, safety,
liability or compensation eligibility. ADH/AG/legal routes without verified email
remain official external channels; opening them never creates a sent event.

Device-data deletion clears sample and accountless live drafts, not private account
History. Signed-in History has confirmed single/all-request deletion. It cannot
recall recipient/processor copies, purge operator backups, or delete the managed Supabase account. Operators
must provide the account deletion/recovery path and disclose backup/email retention
before enabling real resident use. No automatic retention policy is implemented.

Before enabling production:

- Obtain authorization for provisioning, hosted migration, DNS, deployment and
  every real send/test. Review costs, rate limits and anti-abuse controls.
- Configure and verify confirmed accounts, enrollment/recovery/account deletion,
  sender/inbound DNS, webhook secrets/subscriptions and private DB roles.
- Review resident privacy/retention, monitoring and support for uncertain sends;
  current per-IP API limits are not a complete public-service abuse program.
- Test ownership, refresh/resume, deletion, delivery events and supported replies
  in an authorized sandbox. Then separately authorize controlled real delivery.
- Obtain human Spanish/accessibility review. Local synthetic checks do not prove
  production delivery, agency receipt, official filing or issue resolution.

To disable sends, turn `WATER_ALERT_EMAIL_ENABLED` off. Keep private data and
uncertain send records; disabling must not be followed by a blind resend. Account
storage can remain enabled independently. Do not drop the state row or reset user
data as a rollback.
