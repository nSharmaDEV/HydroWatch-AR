# Get help and private History implementation plan

**Goal:** Implement the user-approved three-stage issue/review/send journey, private durable conversations, and separate Map navigation in the existing checkout.

**Architecture:** Supabase Auth validates managed identities server-side; HttpOnly same-origin cookies carry short-lived access tokens, never push-device tokens. A separate private request store uses atomic local JSON or the existing PostgreSQL transaction pattern. Resend handles explicitly enabled sending and signed webhook events. No service provisioning, deployment, real sends, or production verification is authorized.

**Approved specification:** Current session's user brief, “USER-APPROVED SPEC.” All active/non-active/stale help contexts migrate to the same three stages. Preserve exact provider routing, provenance, opt-in historical evidence, English/Spanish, accessibility and deletion.

## Capability audit and decisions

- Existing infrastructure: Express `server/app.ts`, JSON observations/push files, PostgreSQL `StateCell`, private schema and runtime role. No user authentication or request/email integration exists.
- User selected managed authentication and email. Target Supabase Auth and Resend; configuration is opt-in and server-only. Existing managed accounts can sign in; enrollment/recovery requires the configured operator-managed account portal. Do not silently send signup/recovery emails.
- Requests and attachments are private API resources. Never accept owner, recipient email, delivery state or incoming-reply claims from browser writes. Validate ADH provider ID format and route email only via the exact-ID verified contact directory; never infer recipients from caller-supplied names/counties. Official forms remain external steps.
- Store immutable message snapshots and stable idempotency keys before a network send. Unknown outcomes remain unconfirmed; never replay outside Resend's 24-hour deduplication window. Provider acceptance is sent, not delivered. Only signed matched delivery events establish delivered. Replies do not close requests.
- Signed inbound events are retrieved from Resend, matched by unguessable per-conversation address plus exact original recipient and authenticated sender. Unsupported inbound attachments are clearly identified, not claimed as stored attachments.
- Sample records remain in a separate browser-only store and cannot use live request APIs or transport. Live saving requires sign-in; unconfigured authentication shows an honest gate rather than pretending browser storage is a private account.
- Keep existing map exports and mounted-hidden state; only change top-level navigation integration.

## Implementation batches (inline; no agent delegation)

- [x] Request domain/routing and durable store: persistence, ownership/attachment isolation, revision conflicts, immutable snapshots, close/reopen and duplicate suppression. Local JSON and transaction-locked bounded PostgreSQL aggregate, not production-scale normalized storage.
- [x] Managed auth, email transport, signed webhook and Express integration: injected fixtures for identity, disabled sending, acceptance vs delivery, signature replay, early receipt retry and strict inbound association. Private migration checked with PGlite only.
- [x] Three-stage single-column UI and History: autosave/retry/download, resume, recipient changes, attachments, edited message retention, immutable conversation display, follow-ups, deletion and bilingual/sample separation. Same-account reauthentication preserves open edits; leaving waits for durable save. WAVE palette and normal scrolling retained.
- [x] App integration: Home · Places · Map · History · Settings; map remains mounted hidden after first visit. History resumes saved requests and receives send outcomes.
- [x] Local validation: Node 24 build; 68 intercepted help browser checks across language/context/issue/viewport, sample refresh/resume and enlarged text; targeted unit/API/PostgreSQL tests. Full unit suite 525 pass / 9 unrelated existing notification/contact/report expectations fail. Root/app README, HELP-REQUESTS operations and dated changelog updated. Production gates remain open.

## October 23 follow-up: tailored help only

- [x] Match existing Map outer geometry and heading density; preserve the three stages and existing draft/auth/History safeguards.
- [x] Add relevant issue-specific questions, source-cited matching-supplier notice facts, resident/agency separation and an openly displayed complete Send preview. Preserve historical evidence opt-in and existing edited messages.
- [x] Verify Node 24 build, 46 targeted tests and 100 synthetic browser checks, including 1280×800 at normal zoom, mobile and enlarged text. Full suite: 530 pass / the same nine unrelated failures. Update usage, storage notes and dated changelog; no deployment or real sends.

## Release gates (unchanged)

Operator must explicitly authorize and configure managed account enrollment/recovery, authenticated mail domain/from address, inbound MX domain, signed webhook destination, storage migration/role grants and real delivery testing. No configuration values or credentials are guessed. Synthetic tests are not evidence of production delivery or agency acceptance.
