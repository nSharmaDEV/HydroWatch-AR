# Supplier-specific Water Help: user journey and implementation plan

**Status (October 20, 2026):** Implementation withdrawn at the user's request because its formatting was unacceptable. The previous guide remains in place. This document retains the design plan, not implemented capabilities.

**Goal:** Help residents act on a boil-water notice, ask about a general water issue, or clarify a specific supplier report finding, then optionally save and follow up on their communications. Historical findings never become present-day safety evidence.

**Architecture:** Replace the forced five-screen HelpGuide with a single progressively revealed workspace. Use the existing exact-ID annual-report catalog, provider contacts, source links and local draft tools. Historical report context and live notice context remain separate inputs and visibly separate sections.

**Tech stack:** Existing React 19, TypeScript, Vite and native CSS; Vitest/Testing Library and Playwright. Proposed device-local IndexedDB communication storage. Automatic reply receipt requires a separately approved integration and architecture; no new backend, accounts or external AI processing is authorized by this plan.

**Spec:** The user-facing journey and behavior rules below are the approved implementation specification. The October 20 routing correction takes precedence over earlier findings-first descriptions.

## Communication lifecycle extension (proposed October 19, 2026)

This extension supersedes session-only saving and the exclusion of persistent communication tracking below. It also incorporates the findings-first direction: show the supplier's reviewed findings immediately, each with “Ask about this”; general service/quality/billing help remains below. Choosing a finding opens its prepared question directly, without another template dropdown or prepare button. These are proposed changes only, not shipped capabilities.

## Corrected entry points and screen map (October 20, 2026)

This is the authoritative screen/routing specification. The detailed stages below describe responsibilities, not compulsory wizard screens. This documentation correction does not implement, commit, push or deploy anything.

- **Notice “Get help”:** open Screen 1N for the explicitly selected boil-water notice and supplier. Prioritize that notice's official instructions and notice-related questions; never divert into annual-report findings. Carry the notice identity and actual freshness/status separately. Multiple notices require an explicit selection, not a guessed association.
- **General “Get help”:** open Screen 1G for service/outage, water quality, billing or other help. An active notice is not required. If a supplier has not been confirmed, offer the existing supplier selector or general ADH resources without inventing a supplier.
- **Report “Ask about this”:** open Screen 2 directly with that supplier's exact historical finding and a prepared question. A report-level help link without a selected finding first shows Screen 1R. Never imply that a report finding caused a notice or a personal experience.
- **“My communications”:** reachable from Water Help and the app's existing My Places area; opens Screen 3. Preserve exact supplier association and live/sample separation. Empty state explains saving and links to general help.

### TL;DR delivery plan

1. Route the three entry points correctly and show the right source context.
2. Give users short, reviewed templates and verified contacts, with no automatic sending.
3. Add optional device-local saving, actual-contact records and manual replies.
4. Add in-app follow-up dates and clear next-step guidance.
5. Design automatic reply receipt/notifications separately; do not promise them in the initial release.

### Wireframes for every screen/state

Bracketed values are illustrative populated content, not unresolved tokens shipped to users. These are compact phone-first wireframes; desktop may add a contact sidebar without changing reading order. Screen numbers identify views, not mandatory numbered steps. Screens 4–6 are optional forms opened from a conversation; no one must traverse all views to get a phone number.

**Screen 1N — notice-related help**

```text
< Back                  My communications
Help with this boil-water notice
[Supplier] · [published date]
[Actual live status / unavailable warning]
[Official wording and instructions]
[View official notice]

What do you need?
[Understand the notice]
[Ask supplier for an update]
[Service or billing help]
[Another water issue]
[Call supplier]          [ADH resources]
Next: choose a question or contact directly.
```

“Understand the notice” reveals source-backed instructions inline, not AI advice or a newly invented boiling duration. “Ask supplier” opens Screen 2 with the notice reference. Archived references and unavailable checks are labeled honestly; guidance never implies a retained notice is current. A different concern may open Screen 1G while preserving any explicitly selected reference separately.

**Screen 1G — general help**

```text
< Back                  My communications
What do you need help with?
[Confirmed supplier / Choose supplier]
[Service or outage]
[Water-quality concern]
[Billing or expenses]
[Other help]
Contacts available without a draft
[Supplier contact]       [ADH resources]
Next: choose a concern to see a prepared question.
```

Concern selection opens Screen 2 immediately with appropriate wording, even without a notice. Optional legal/consumer resources live under the relevant other/billing route, not default escalation. Show a brief emergency direction for immediate medical danger; do not diagnose symptoms.

**Screen 1R — report findings (report entry only)**

```text
< Back                  My communications
Questions about [Supplier]'s report
[2025] · Historical; not today's status
[Monitoring finding]       [Ask about this]
[Licensing finding]        [Ask about this]
[View original report]
Need help with a different water issue?
[General help]
Next: choose the finding you want clarified.
```

Only show actual reviewed findings. Missing/unreviewed/conflicting reports offer the corresponding neutral report request; zero findings never means safe. Selecting “Ask about this” opens Screen 2, not another category/template picker.

**Screen 2 — prepared question and contact workspace**

```text
< Back                  My communications
[Notice question / General issue / Report question]
[Supplier and short source context]
[Expand source details]
Who can help?
[Supplier] [ADH, where relevant]
[Why this contact / verified contact details]
Your question
Subject: [prepared editable subject]
[Short prepared message]
[Edit message] [Add observations, optional]
[Save on this device] [Storage/privacy details]
[Copy] [Download] [Open email, if verified]
[Call, if verified]
WAVE has not sent anything.
Next: contact them outside WAVE; afterward,
return to record what you actually sent/discussed.
[Record contact]
```

Notice, general and report routes share this layout, not interchangeable facts. Changing recipient updates only untouched template wording; never silently replace edited text. Saving requires explicit storage consent; successful save provides “View saved conversation” (Screen 3 detail). Recording contact without an existing saved conversation first explains/requests local saving. Declining storage preserves copy/download/contact access. Missing contact values leave directory/bill guidance and copying available. Supplier and ADH are choices, not a compulsory supplier-first sequence.

**Screen 3 — My communications and conversation detail**

```text
< Back
My communications · This browser only
[Supplier / concern] [Draft / Contact recorded]
[Supplier / concern] [Follow-up due]
[Open conversation]
-----------------------------------------
Conversation: [selected supplier + concern]
[Source snapshot] [Draft] [Contact/reply timeline]
Contact recorded by you; delivery not verified.
[No reply recorded / User-added reply]
Next: [instruction matching recorded events]
[Record contact] [Add reply] [Prepare follow-up]
[Set follow-up date] [Finish tracking]
[Export] [Delete]
```

List and detail may be separate mobile views of one communications area. Opening a draft returns to Screen 2 without creating a duplicate. “Prepare follow-up” opens Screen 2 with a neutral follow-up template and reviewed references to recorded events. Unknown contact dates remain unknown. Finished records can reopen. Export offers text/JSON; deletion has confirmation and explains that emails/downloads are unaffected. “Finished tracking” never changes water/advisory status.

**Screen 4 — record an actual contact**

```text
< Conversation
Record contact
Channel: [Email / Phone / Official form / Other]
Contact: [recipient actually contacted]
Date: [actual date / I don't know]
[Message actually sent / call notes]
Reference number: [optional]
[Review and save record] [Cancel]
Next: check this matches what actually happened.
Delivery/filing is not verified by WAVE.
```

Preview before committing the event. Unknown dates must be supported, consistent with the no-invented-timestamp rule. Save returns to Screen 3 and offers a follow-up date. Later corrections append an event, not an altered sent snapshot.

**Screen 5 — add a received reply manually**

```text
< Conversation
Add a reply
From: [sender]
Received: [date / I don't know]
[Relevant reply text or your summary]
Avoid account numbers and sensitive details.
[Preview and save] [Cancel]
Next: review whether your question was answered.
WAVE does not monitor your inbox.
```

Save returns to Screen 3 with “Reply added by you”. Offer clarification/follow-up/finish choices without judging truth or compliance. If a reminder exists, ask whether to keep, change or cancel it; adding a reply must not silently change that reminder.

**Screen 6 — optional follow-up date**

```text
< Conversation
When would you like to follow up?
[Choose local calendar date]
This is your reminder, not an agency deadline.
Shown when you open WAVE; no closed-app alert.
[Save date] [No reminder / Cancel reminder]
Next: return here to add a reply or follow up.
```

In-app reminder dates use local calendar-day semantics, not a fabricated exact-time alarm. Screen 3 shows due reminders on return. Finishing a conversation explicitly cancels its active reminder after confirmation; reopening does not silently reinstate it. Background push and automatic response notifications are not part of these initial screens.

**Shared states:** source unavailable retains honest context and contact access; storage failure keeps editable text with “Not saved” plus download; empty communications show “No saved communications on this browser”; deletion requests confirmation; unsaved navigation warns where supported. Use EN/ES labels, visible keyboard focus and 320px layouts. Never label a copy, download, email handoff or user-recorded contact “Submitted”.

### Delivery boundaries

- **Phase A — saved, user-maintained communications:** device-local history, explicit save, user-reported contact events, manually added replies and deterministic next-step guidance. No accounts or mail access. Communication progress never changes advisory status or marks a historical finding resolved.
- **Phase B — follow-up reminders:** in-app due indicators based on a date the user chooses. Background/push reminders are separately gated on permission, scheduling and verified delivery behavior; they are not implied by saving a date.
- **Phase C — automatic response notifications:** a separately approved inbound-email integration. This cannot be delivered by `mailto:`. Do not show “waiting for an automatic reply” or promise notifications before that integration exists and is verified.

### What the user does, sees and does next

| Stage | User action and app behavior | Explicit next action |
|---|---|---|
| 1. Pick the concern | Enter from the selected notice's “Get help”, general “Get help”, or a report's “Ask about this”. Preserve the matching context; reports are not a prerequisite for notice/general help. | “Review the guidance/question and choose whom to contact.” |
| 2. Review and save | Show a neutral editable question, supplier/ADH choices, source references and optional observations. Explain local storage and offer “Save on this device”; copy/download/contact remain usable without saving. Confirm success only after storage succeeds. | “Copy or download your question, or open it in your email app. WAVE has not sent it.” |
| 3. Contact outside WAVE | Open a verified email draft, call, or visit the relevant official form. Do not interpret opening, copying or downloading as sending. | “After you contact them, return here to record what you sent or discussed.” |
| 4. Record the contact | User selects “Record contact” and confirms channel, destination, actual contact date and the text actually sent or call notes. Reference number is optional. Save a new immutable contact event; later edits create a correction, not a rewritten sent record. Label it “Contact recorded by you — delivery not verified.” | “Keep any receipt/reference number. Choose a follow-up date if you want a reminder.” |
| 5. Wait or follow up | Show the recorded contact, any user-chosen reminder date and “No reply recorded”; that does not mean the recipient never replied. No invented agency deadline or automatic escalation. | “Add a reply if you receive one, or prepare a polite follow-up when you choose.” |
| 6. Add a reply | Paste only relevant reply text or write a summary; record sender and received date, with unknown dates allowed. Preview before saving; warn against account numbers, medical details or unrelated email content. Label manually entered content as user-provided, not verified. | “Review whether your questions were answered. You can ask for clarification, follow up, or finish tracking this conversation.” |
| 7. Choose the next step | Offer deterministic options: request missing information, clarify a conflicting statement, prepare a follow-up, contact ADH if relevant, or finish tracking. Copy facts from the selected reply only with user review; do not infer legal/compliance conclusions or use AI to interpret it. | Each choice opens a reviewed editable draft or a clearly described resource. Never send or escalate automatically. |
| 8. Finish, export or delete | User marks “Finished tracking”, reopens, exports or deletes the conversation. This means only the user stopped tracking it, not that the water issue is resolved. | Explain how to return, where the export was saved by the browser, or what deletion removed. |

Every stage displays one short “What to do next” instruction. Users may go back, skip optional reminders, contact someone without saving, and reopen finished conversations. No forced completion of an irrelevant stage.

### Saved history and privacy contract

- Save only after an explicit device-storage choice. Use IndexedDB, with a versioned schema, rather than session state or notification enrollment records. No silent upload or cross-device synchronization.
- Store a stable conversation ID, exact supplier ID, live/sample class, concern, source-context snapshot (year/finding/printed facts/page/URL), draft revisions, recipient, contact/reply/correction events and optional follow-up date. Preserve the original historical attribution if the catalog changes later.
- Use stable event IDs and explicit event timestamps; distinguish recorded-at from contacted-at/received-at. Do not invent a contact time, response date or delivery confirmation.
- Separate editable drafts from immutable user-recorded contact/reply events. Before recording contact, ask whether the saved draft matches what was actually sent; let the user correct the snapshot.
- Explain: “Saved in this browser on this device. Other people using this browser may be able to read it. Clearing browser data can remove it. It is not backed up or end-to-end encrypted by WAVE.” Do not claim confidentiality or legal protection.
- Initial scope supports plain text and manual summaries, not attachments, mailbox imports, HTML email rendering or forwarding full inbox threads. Render saved content as text; reject unsafe URLs in generated actions and never execute reply content.
- Offer readable text and versioned JSON exports. Import/restore is not promised in Phase A. Remind users to store exports privately.
- Provide per-conversation deletion and “Delete all saved communications” with confirmation. Deleting browser records does not delete sent emails, agency records or downloaded exports. Reuse existing full-device deletion behavior only after checking its actual scope and updating its explanation.
- Isolate sample records from live records and real contact targets. A sample cannot enroll a reminder or trigger a real delivery. Language changes translate interface labels, not user-authored or historical event text, and must not delete saved content.
- Handle unavailable storage, quota errors, migrations and interrupted writes honestly: retain the open draft, show save failure, offer download, and never show a false saved state. Warn before discarding unsaved changes; saved records survive reload and workspace exit.

### Reminders versus response notifications

**Phase B initial guarantee:** an in-app “Follow-up due” indicator is recalculated when the app opens. The user picks the date; WAVE does not invent a legal deadline. State explicitly that a closed app may not alert them. Users can change, dismiss or cancel a reminder; record a reminder as displayed, not delivered externally.

**Background reminder gate:** inspect the existing Web Push architecture before choosing a scheduler. Specify consent, minimal server-held metadata, timezone/DST handling, retry/deduplication, cancellation/deletion and device revocation. Do not upload message bodies for reminders. Test actual scheduled delivery before making a background-delivery claim.

**Phase C proposed route:** use a dedicated per-conversation reply address with a verified inbound-email provider, rather than requesting access to the user's whole mailbox. The user explicitly opts in before sending and uses a supported sending/reply-routing flow. Explain whether the recipient will reply to that address and that off-thread replies, phone calls and ordinary external-form responses may not be captured. A plain email-app handoff without this routing still requires manual reply logging.

Before Phase C can be implemented, decide and approve:

1. Inbound provider, account/device ownership and secure retrieval model; secret links alone must not expose other conversations.
2. Where reply bodies are stored, access controls, retention, deletion/export, abuse limits and processor/privacy disclosures. Device-local-only wording must change for opted-in routed conversations.
3. Webhook signature verification, replay protection, deduplication, unguessable routing IDs, sender spoofing/authentication limits, HTML sanitization and attachment rejection. Receipt is not proof the sender is genuine or their claims are true.
4. Notification permission, minimal lock-screen text (“A reply was received”), private content hidden by default, and a polling/in-app fallback when push is denied or unavailable. Distinguish inbound receipt, notification queued, attempted delivery and reply viewed; do not claim guaranteed delivery.
5. End-to-end tests for a routed reply, duplicates, forged webhooks, wrong-conversation routing, revoked devices, deletion, provider failure and replies arriving after tracking ends. Automatic receipt must not mark a finding resolved.

Until these gates pass, show “Replies are not monitored by WAVE. Add a reply here when you receive one.” A reminder is never labeled a response notification.

### Implementation tasks for the extension (after approval)

These follow the supplier-context/template work below and replace its session-only persistence assumptions. Use test-first implementation; no production integration or deployment is authorized.

1. **Persistence boundary:** create `water-alert/src/communication-types.ts`, `communication-store.ts` and `tests/communication-store.test.ts`. Define versioned conversation/event records, injected storage/clock interfaces, atomic writes, correction events, exports, deletion and explicit live/sample separation. First test reload persistence, immutable snapshots, failed writes, schema upgrades, quota failures and exact-ID isolation; then implement the minimal IndexedDB adapter. Select a deterministic IndexedDB test strategy before adding any dependency.
2. **Guided history UI:** create `water-alert/src/CommunicationHistory.tsx` and `tests/communication-history.test.tsx`; modify `HelpGuide.tsx`, `RecoveryActions.tsx`, help strings and styles. Test explicit save consent, recipient review, actual-sent snapshot confirmation, manual reply entry, next-step instructions at every stage, back/skip/reopen paths, unsaved-change warnings and truthful labels. A saved contact must never imply WAVE sent it or verified receipt.
3. **Follow-up guidance and in-app reminders:** create `water-alert/src/communication-next-steps.ts` and its unit tests. Use deterministic rules and an injected clock; test due dates/timezones, cancellation, no-reply wording, missing dates, manual reply arrival and “Finished tracking” without status changes. Background reminders stay gated until their architecture is approved.
4. **Lifecycle/privacy verification:** extend `water-alert/tests/e2e/journey.spec.ts` using isolated synthetic browser storage and blocked live mutations. Verify save → reload → record contact → add reply → prepare clarification → finish/reopen → export/delete; test EN/ES, keyboard/320px, shared-device warnings, storage failures and sample isolation. Run unit tests, build and relevant browser tests; update README and dated local-only CHANGELOG entries with only verified behavior.
5. **Automatic reply design gate:** write a separate integration specification only after choosing the Phase C architecture with the user. Include the five gates above and a provider-independent inbound contract. Do not retrofit existing alert subscriptions to carry private correspondence or implement server/mail access as part of Phase A.

### Added acceptance criteria

- Saved communications survive reload on the same browser; users can distinguish drafts, user-recorded contacts, manually entered replies and any future automatically received replies.
- Each stage explains what happened, what WAVE did not do and the next optional action.
- Users can follow the process without consenting to storage, notifications or mail processing.
- No sending/delivery/reply claim is inferred from opening an email client or official form.
- Reminders and response notifications have distinct labels, permissions and verified capability boundaries.
- Users can export/delete records, understand device-local limitations and finish tracking without changing official status.

## User refinement: safe, templateable and easy to understand

This section takes precedence over the earlier seven-stage explanation and wireframe where they differ. The seven stages describe underlying responsibilities, not seven required user interactions.

### The visible experience: three stages

1. **Start with the reason you clicked.** Notice “Get help” shows notice guidance and notice questions; general “Get help” shows general concerns; report “Ask about this” selects that historical finding directly. Confirm the supplier without forcing a report detour. Contacts are available without completing a draft. Legal information is optional, not default escalation.
2. **Review your question.** Show a prepared, neutral question immediately after selection—no extra “prepare” gate. Clearly separate the historical source facts, optional user observations, and the requested information. Offer a few optional fields and an expandable full draft editor; no mandatory personal narrative or personal identifiers.
3. **Save or contact.** Let the user copy/download the reviewed text, call an available contact, or open an email draft where verified details exist. Explain the destination and what will happen before the handoff. State “Nothing has been sent by WAVE.”

These are three visible sections on one page, not three compulsory screens. Do not show a second seven-step progress system. A source detail or privacy explanation may expand without becoming another stage.

### Consistent template contract

Every inquiry uses the same four-part structure:

1. **What I am asking about:** supplier plus either a cited historical report finding or a user-described concern. Do not insert a nonexistent notice.
2. **What I know:** attributed report wording and dates; optional user observations appear separately and are not presented as independently verified.
3. **What I would like to know:** two or three approved questions appropriate to the category. Ask for clarification, current information, documents or next steps rather than asserting wrongdoing.
4. **How to respond:** request a written response/reference number where appropriate; the user may add contact details in their own email application. No sensitive identifiers are required in WAVE.

Use deterministic, reviewed template text, not generative AI. Supplier facts come from exact-ID records; template wording comes from a small maintained library. Missing values are omitted or explicitly unknown, never fabricated. Do not generate customer-status statements such as “I am a customer” unless the user supplies them.

Category-specific content changes only the cited facts, suggested questions and contact guidance. Keep the layout and action labels consistent across suppliers and EN/ES. Preserve full source wording behind an accessible disclosure rather than forcing residents to read technical details before asking a question.

### Plain-language example

**On-screen explanation:** “The 2025 report says required water samples were not submitted during this period. This does not tell us the water's condition today.”

**Prepared question:**

> Hello, I have a question about the monitoring finding in [supplier]'s 2025 annual report, page [source page]. The report lists [printed period] and reports [corrective action as printed]. Can you confirm whether the required sampling/reporting was completed afterward and tell me where to find the latest results? Please provide a written response or a reference number if available.

Bracketed values here illustrate the template contract; the app must populate supported facts and handle unknowns explicitly before presenting a draft. Do not expose raw template tokens in the final generated question. Personal facts remain optional, and the resident can review/edit all text.

### Safety boundaries built into the interaction

- Define “safer” as reducing unsupported claims, accidental disclosure, mistaken routing and accidental loss—not guaranteeing legal protection, confidentiality or a successful outcome.
- Do not ask “How were you harmed?” or assume an old finding caused a present issue. Ask “What would you like clarified?” Optional observations use “What did you notice, and when?”
- Show the supplier, selected source/year and intended contact beside the review action so residents can catch identity or routing mistakes.
- No automatic escalation. First offer the appropriate provider/ADH information route. Consumer complaints and legal resources remain optional, separately explained actions rather than the next compulsory step.
- Explain that missing monitoring is missing evidence, not proof of contamination; explain reported corrective action without claiming verified resolution.
- Never treat editing, saving or opening email as submission. Communication progress reflects only explicit user-recorded events, not verified filing, receipt or agency case progress.
- No required account, full address, account number, medical detail or identity document. Keep sensitive details out of drafts; external services may have their own requirements and privacy policies.
- Label technical source wording and translated explanations distinctly. Keep the original PDF reachable; do not imply English templates are Spanish simply because the interface is Spanish.
- Preserve drafts across in-workspace choices using context-keyed edits. Offer explicit device-local saving under the lifecycle extension; warn about leaving with unsaved changes.

### Simplicity acceptance tests

- A user can reach a useful prepared question by choosing a concern and, where needed, one finding/subcategory; no separate contact-selection, fact-gathering or confirmation screens are required.
- Each route explains, in short plain language: what this is about, who can help and what the next action does.
- The main path does not require interpreting regulation acronyms, calculating compliance, choosing a legal remedy or writing an allegation.
- All generated factual claims are either attributed source facts or clearly user-supplied; uncertainty is explicit and no placeholder tokens are accidentally left in generated text.
- Users can contact someone without using the template, and can use the template without a verified email address.
- Test all template categories, missing facts, mismatched/conflicting reports, sample isolation, optional personal fields, manual edits and truthful handoff feedback.

### Implementation adjustments

- `HelpGuide.tsx` and `help-guide-strings.ts`: implement the three-section hierarchy and simple concern/subcategory choices rather than reproducing the old wizard.
- `report-help.ts` and `recovery-drafts.ts`: make templates deterministic and structured; keep source facts, personal observations and questions separate before formatting the final draft.
- `RecoveryActions.tsx`: reveal the matching draft directly after the concern/finding choice, offer optional structured inputs plus full editing, retain copy/download/email fallbacks, and keep context-keyed edits intact.
- Existing billing/legal templates remain available through optional advanced routes; they must not be the default for report clarification. Review all generated defaults for unsupported customer/incident assumptions and unresolved tokens.
- Review questions, contact guidance and translated interface wording before calling templates reviewed. Human comprehension testing and fluent Spanish review remain validation needs, not completed claims.

## Constraints and decisions

- Scope: the WAVE app in `water-alert/`; do not restore removed prototypes.
- Preserve all existing dirty and untracked work. Do not reset, overwrite wholesale, or commit unrelated changes.
- No deployment, publication or submission is authorized.
- Match suppliers by exact ID; never borrow another supplier's report or contact.
- Reports describe their reporting period, not current safety, current violations or verified resolution.
- A missing sample does not prove contamination. A report with no listed violations does not establish safety.
- Published corrective action is attributed to the report, not verified by WAVE.
- “Current” in a PDF means as printed, not current today.
- Contradictory findings stay contradictory; request clarification rather than choosing a conclusion.
- Preserve existing service, billing, reimbursement-review, complaint, legal-preparation and follow-up tools.
- Unsaved drafts remain session-local. Opted-in saved communications persist on this device under the lifecycle extension; no automatic filing or verified agency case tracking.
- English and Spanish interface parity; existing English draft templates must remain clearly labeled as English unless translation is separately implemented and reviewed.
- Sample mode must not attach real findings or expose real phone/email targets.
- Implementation changes require a dated, local-only `water-alert/CHANGELOG.md` entry in the same batch.
- Re-establish the current baseline before implementation. The October 20 app README records 445 unit/integration tests and build passing, with 78 browser checks passing and 22 failing; do not treat earlier focused checks or synthetic checks as full verification or deployment evidence.

## Design direction

Reading this as a trust-first resident help workspace, using WAVE's existing visual language rather than a new marketing-page aesthetic.

- **User requirement (October 20): keep the formatting used throughout the current app.** The ASCII wireframes describe content and behavior only, not a new visual style. Reuse existing page/dialog shells, headers/back controls, cards, disclosures, form fields, button hierarchy, spacing, typography, colors, borders and responsive conventions. Do not introduce a separate dashboard theme, decorative stepper, new font/icon family or replacement design system.
- Inspect the current rendered notice/help/provider screens and their shared components before implementation; use those as the visual reference. Compose new communication views from the same patterns, adding only the minimal styles needed for new behavior. Preserve EN/ES wrapping, keyboard focus and narrow-screen readability. Verify the result alongside existing screens on desktop and mobile, not against the ASCII box shapes.
- Keep the existing type, colors and button vocabulary; reuse semantic CSS variables after checking their actual definitions.
- Left-align headings and facts. Avoid a large decorative hero or severity scores.
- Use one main working column, with a compact contact/source sidebar on wide screens. On phones, put contacts before the editor in the reading order.
- Reveal detail on demand. The resident should not traverse five screens just to see a phone number.
- Distinguish “Official notice context” from “Historical report finding” with headings and explicit dates, not color alone.
- Use numbered steps only for the actual task sequence below, not for decorative content.

Use the corrected screen map above. It replaces the older category-first wireframe and keeps notice help, general concerns and report questions distinct.

## Detailed user journey

### Step 1: Open help for the correct supplier

**User does:** From a supplier card, selects the existing “Get help with a water issue” button. The active-notice checklist remains another entry point.

**User sees:** “Water Help: [supplier name]”, a back button and “Confirm this is the provider on your water bill.” No address or account number is required to enter.

**App does:** Carries the supplier's exact ID and any explicitly linked notice. Help remains accessible without an active notice and when the advisory source is unavailable. It never requires the resident to invent an incident.

**Notice handling:** An explicitly linked archived notice is labeled as a saved reference. To display current status, pass the actual status/source state separately from the optional notice; do not infer freshness from the existence of `notice`. If current data is unavailable, say so rather than displaying an all-clear.

**Success:** The resident can identify whose records and contacts they are about to use.

### Step 2: Choose the reason for asking

**User does:** Uses Screen 1N for the selected notice, Screen 1G for general concerns, or enters a selected report finding directly in Screen 2. Screen 1R is only for browsing report questions. Never require a notice-help user to choose an annual-report finding. Optional legal information remains under other help.

**User sees:** One sentence explaining each route. A short, visible emergency note directs immediate medical danger to 911 and symptoms to a health professional. The guide does not diagnose illness.

**App does:** Shows the matching content below on the same page and moves focus appropriately after an explicit continue/open action. Other routes remain available; selecting a route is not a filing or accusation.

**Success:** A resident who only needs a phone number can reach it without preparing a draft.

### Step 3A: Select the historical report finding

**User does:** In the report route, selects an available report year and a finding. If only 2025 exists, show only 2025; do not imply a multi-year archive exists.

**User sees for each finding:** A plain-language heading, its category, the printed dates (or “Not provided in the report”), the report's description, reported corrective action/progress and a source-page link. Display “Historical report; current status has not been verified.” Preserve survey dates, upstream attribution and document conflicts.

**App does:** Uses `annual-reports.ts` and `observed-supplier-reports.ts` as the facts source. Where one finding has multiple periods, show one selectable finding with all periods rather than duplicate indistinguishable choices. Do not shorten away the source meaning.

**User can:** Read the source PDF, pick a different finding, or proceed to ask about the selected item. Do not preselect all findings or default to the most alarming item.

**Example:** For Leisure Hills, the resident can choose bacteriological monitoring, valid bacteriological samples, licensing or public education notice. The help page does not relabel these as proven contamination.

### Step 3B: Handle a report with no summarized finding

**Reviewed report with no listed issues:** Show “No violations reported in this reviewed [year] report.” Offer “Ask for more recent information” and the new-concern route. Do not create an issue or call the water safe.

**Unreviewed report:** Explain that findings have not been summarized. Let the user open the original report and prepare a neutral report clarification inquiry.

**Conflicting report year:** For Springdale, explain the 2024 title/2025 test-results mismatch and suggest asking which report is authoritative. Do not display inferred findings.

**Conflicting contents:** For Central Logan, retain the conflicting table/footnote context and ask the provider/ADH to clarify it. Do not independently adjudicate a violation.

**Unavailable report:** Explain that no matching report was located in the reviewed sources. Offer the ADH search/directory provenance and “Request the latest available report.” Do not imply the supplier failed to publish one.

**Unknown future supplier:** Show “Report not yet reviewed”; keep general contacts and help available.

### Step 4: Understand what to ask and whom to contact

**User does:** Reads two or three suggested questions and can open the provider contact or ADH program source immediately.

| Finding | Suggested questions, not conclusions |
|---|---|
| Monitoring/reporting | Were the required samples/reports completed afterward? Where can I find the latest results? |
| Licensing | What licensing requirement was reported, and what is its present status? |
| Public notice | Can you provide the required notice and explain how customers were informed? |
| Significant deficiency | What work was required, what has been completed, and is follow-up documentation available? |
| Water-quality violation | What period and service area did the report concern? What more recent results and official instructions are available? |
| Upstream finding | How did the upstream supplier's finding relate to this system, and what subsequent information is available? |
| Document conflict | Can you clarify these inconsistent report statements and provide the authoritative record? |

**Contact routing:** Offer the supplier for its records/status and ADH Safe Water Engineering for regulatory clarification or quality concerns. The resident may choose either relevant route; supplier-first is not compulsory. Verify official contact provenance before implementation. Do not automatically send report findings to the Attorney General or legal aid.

**Missing contacts:** Say the number/email is not verified, direct the user to their bill or the directory, and keep copy/download available. Never guess an email or reuse a neighboring supplier's details.

**Success:** The resident understands the next useful question, without the app claiming an answer it does not know.

### Step 5: Prepare an accurate draft

**User does:** Reviews the question shown immediately after choosing a concern/finding; no extra prepare button. Notice-related questions use the selected notice, general questions do not assume one, and report questions use historical findings. Optional prompts ask what they want clarified and allow observations/reference numbers. No prompt requires medical details, account numbers or identity documents.

**App includes:** The exact supplier and relevant context only: notice wording/date/source for notice questions; user-supplied concern for general help; report year/finding/printed facts/PDF page for report questions. Unknown/missing/conflicting reports use neutral clarification/request wording. Never imply one context caused another.

**Example wording:**

> I am asking about the bacteriological monitoring finding in your 2025 annual report, page 2. The report lists July 11–31, 2025 and states that sampling-report submission resumed. I have not independently verified the current status. Can you confirm whether the required monitoring/reporting is now complete and where I can obtain the latest results?

**Personal experience:** The resident adds their own observations only if relevant. The app never invents illness, exposure, interrupted service, personal costs, entitlement or liability.

**Multiple findings:** Initial version supports one selected finding per report inquiry. The user may manually add more in the editor. Automatic multi-finding composition is outside the initial scope.

**Notice context:** If supplied, keep it in a separately labeled reference block. Do not call a historical report a boil-water notice or assume a saved notice is active.

### Step 6: Review and use the draft outside WAVE

**User does:** Checks supplier, year, dates, questions and any personal statements. Then chooses copy, download, or opening an email draft where an exact supplier email is available.

**User sees:** “Nothing has been sent.” Email opens the user's email application; it does not send. A copied draft is “Copied”, not “Submitted”. A download is “Downloaded”, not a filed case.

**Failures:** If clipboard access fails, focus/select the editable draft and explain how to copy manually. If an email URL is too long, retain copy/download and display the full available address. Missing email is not an error that blocks the route.

**Packet:** The downloadable preparation packet includes the selected historical source context, relevant questions, draft, private checklist and a blank contact log. It must not retain notice-only assertions that imply an incident exists.

**Privacy:** Offer explicit device-local saving as specified in the lifecycle extension. Explain unsaved-change loss, shared-device access and browser-data deletion. Downloads are the user's responsibility to store privately.

### Step 7: Record communications and follow up

**User does:** After contacting the provider or agency outside WAVE, may record the contact, actual sent text/call notes, date and optional reference number on this device. May add a reply manually and prepare a follow-up using their own facts.

**User sees:** A brief checklist: save what you sent; request a reference number; keep the response; ask for written clarification if unanswered. No fabricated response deadline.

**App does not:** Verify filing or receipt, monitor replies without the separately approved integration, promise a response, mark the report finding resolved or change live status. Saved communication history is user-maintained, not an official agency case tracker. See the lifecycle extension for the full sequence and next-step guidance.

## Other routes remain first-class

### New service or quality concern

User chooses service/outage or quality/health. Show provider contacts for service and ADH quality contact plus provider options for quality. Ask for the resident's own observations/dates only in the editable draft; an old report is optional background, never proof that the same event is happening now. Follow current official notice instructions where available. General service wording must work without a notice rather than asking about a nonexistent published notice.

### Billing or documented expenses

User starts with a provider request. They may prepare a credit/reimbursement-review request using their actual documented expenses, then choose consumer-complaint preparation when relevant. The AG form is an external handoff with jurisdiction and public-records/privacy explanations. Do not promise compensation or automatic AG jurisdiction.

### Legal information

User sees legal-information/intake links and optional preparation notes. No eligibility, representation, litigation success or liability is promised. Report findings are references, not proof of personal injury or a legal claim.

## Editing and navigation rules

- Reveal the workspace sections in place; these are task stages, not five mandatory separate screens.
- Show the matching prepared question directly after the user chooses a finding/concern; do not require another prepare action.
- Keep edits when opening sources/contact details or moving among workspace sections.
- Switching a route, report year, finding or draft template must not silently replace edited text. Store edits by exact context key during this mount; new contexts get new drafts and returning restores the prior edited draft.
- Context key includes supplier ID, live/sample mode, notice identity, route, report year and finding identity. Preserve saved user-authored content across language changes; translating interface labels does not translate saved messages.
- Leaving/reloading may discard unsaved edits, with an unsaved-change warning where supported. Explicitly saved records survive workspace exit and reload; storage failure must not look like success.
- Back restores focus to the initiating help button; all choices and disclosures work by keyboard.
- On phones, avoid a sticky action bar that covers the textarea or privacy note. Use the normal document flow at 320px.

## Implementation sequence after approval

### Task 1: Establish the existing baseline

**Files:** Existing `water-alert/tests/all-supplier-reports.test.tsx`, `annual-report.test.tsx`, `supplier-parity.test.tsx`; README, CHANGELOG and research ledger for inspection.

- [ ] Record current dirty/untracked files without modifying them.
- [ ] Run `npm test` and `npm run build` from `water-alert/`; distinguish inherited failures from new failures.
- [ ] Confirm exact report coverage and source mappings. Identify inherited stale documentation; do not label the catalog fully verified until checks support that claim.

### Task 2: Add historical inquiry context and draft tests first

**Create:** `water-alert/src/report-help.ts`, `water-alert/tests/report-help.test.ts`.
**Modify:** `water-alert/src/recovery-drafts.ts`; its existing tests after locating them.

- [ ] Define a discriminated inquiry context for a reviewed finding, general report request, unavailable report and document clarification. Preserve source/year/page and full printed facts.
- [ ] Write failing tests for category-specific questions, source attribution, no-notice service wording, conflicts, unknown dates, sample exclusion and exact-ID isolation.
- [ ] Implement pure question/context/draft functions. Extend `DraftKind` with a report inquiry only where needed and update every exhaustive template list.
- [ ] Extend preparation packets to include report references separately from notice references. Retain all five existing draft templates.
- [ ] Run focused draft tests, then update the changelog for the actual local implementation.

### Task 3: Build the single-page workspace and editing behavior

**Modify:** `water-alert/src/HelpGuide.tsx`, `help-guide-strings.ts`, `RecoveryActions.tsx`, `App.tsx`, `styles.css`.
**Create:** `water-alert/src/ReportHelp.tsx`, `water-alert/tests/report-help-ui.test.tsx`.
**Modify tests:** `water-alert/tests/help-redesign.test.tsx` and affected journey tests.

- [ ] Write failing interaction tests for notice/general/report entry routing, direct prepared questions, source disclosure, immediate contacts and My communications list/detail navigation. Notice help must never require a report selection.
- [ ] Pass actual current status/source context from App separately from optional saved notice context.
- [ ] Add report selection/details and reuse existing contacts/source links. Reuse or extract the finding grouping logic rather than diverging from the provider panel.
- [ ] Add EN/ES copy for the workspace; label English draft content honestly.
- [ ] Keep edited drafts by context during the mount; test switching finding/route/template and returning without loss.
- [ ] Preserve sample isolation, missing contacts and language reset warnings.
- [ ] Update changelog for the actual workspace changes.

### Task 4: Verify edge cases and document actual behavior

**Modify:** `water-alert/tests/e2e/journey.spec.ts`, `water-alert/README.md`, `water-alert/CHANGELOG.md`; update relevant existing research documentation only if verification changes its claims.

- [ ] Test Leisure Hills monitoring inquiry; a significant deficiency; upstream attribution; Central Logan conflict; Springdale mismatch; reviewed zero findings; unavailable and unknown reports.
- [ ] Test service without a notice, multiple notices without implicit selection, unavailable feed, missing phone/email, clipboard failure, email-length fallback and unsent handoffs.
- [ ] Test desktop/320px, EN/ES, keyboard focus, readable contacts, no overflow and retained edits. Use synthetic browser fixtures; block external requests/API mutations rather than mutating real user preferences or live records.
- [ ] Run `npm test`, `npm run build` and the relevant `npm run test:e2e -- ...` cases after checking existing Playwright project/config names.
- [ ] Inspect rendered desktop and phone layouts. Update README/changelog only with verified behavior and exact test scope; distinguish local checks from deployment. Report any unrun checks explicitly.

## Acceptance criteria

1. Notice “Get help” opens guidance for that notice; general help works without a notice; report “Ask about this” opens that exact historical finding's question. None requires traversing the old wizard or detouring through unrelated reports.
2. Contacts remain accessible without composing a draft or having an active notice.
3. Every supported report state has an honest useful next action.
4. Drafts never invent current violations, contamination, resolution, loss or legal entitlement.
5. Existing service/billing/legal/follow-up functionality is preserved and route-appropriate.
6. Context changes do not silently overwrite edited drafts within the workspace.
7. All handoffs clearly state nothing was submitted by WAVE.
8. EN/ES, sample/live isolation, keyboard use and 320px layouts are tested.
9. No deployment or unrelated cleanup occurs.

## Scope deliberately excluded

Automatic complaints, background report scraping, safety scores, medical/legal diagnosis, verified agency case tracking, accounts in Phase A, external AI drafting, automatic multi-finding inquiries, translated English legal/draft templates without review, and treating old findings as live notices. Background reminder delivery and automatic reply receipt remain gated future phases, not initial implementation commitments.
