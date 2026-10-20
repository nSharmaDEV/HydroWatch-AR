# Supplier-specific Water Help: user journey and implementation plan

**Status:** Proposed for user review. Planning only; no app behavior has changed.

**Goal:** Help a resident understand a specific supplier report finding, ask useful questions, and prepare an accurate inquiry without treating historical findings as present-day safety evidence.

**Architecture:** Replace the forced five-screen HelpGuide with a single progressively revealed workspace. Use the existing exact-ID annual-report catalog, provider contacts, source links and local draft tools. Historical report context and live notice context remain separate inputs and visibly separate sections.

**Tech stack:** Existing React 19, TypeScript, Vite and native CSS; Vitest/Testing Library and Playwright. No new backend, accounts or external AI processing.

**Spec:** The user-facing journey and behavior rules below are this proposal's specification. The user requested a detailed explanation of what users do at each step; implementation starts only after review.

## User refinement: safe, templateable and easy to understand

This section takes precedence over the earlier seven-stage explanation and wireframe where they differ. The seven stages describe underlying responsibilities, not seven required user interactions.

### The visible experience: three stages

1. **Choose your concern.** Confirm the supplier name, then choose “Question about a report”, “Service or water quality”, or “Billing or other help”. For a report question, choose one finding; for the other routes, choose a short subcategory. Contacts are available without completing a draft. Legal information is an optional resource under other help, not a default escalation.
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
- Never treat editing, saving or opening email as submission. Do not request a “filed” checkbox or display case progress.
- No required account, full address, account number, medical detail or identity document. Keep sensitive details out of drafts; external services may have their own requirements and privacy policies.
- Label technical source wording and translated explanations distinctly. Keep the original PDF reachable; do not imply English templates are Spanish simply because the interface is Spanish.
- Preserve drafts across in-workspace choices using context-keyed edits. Warn plainly about leaving/reloading and language resets; do not promise durable saving.

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

- Scope: `water-alert/`, not `fieldbook-ui/` or the legacy apps.
- Preserve all existing dirty and untracked work. Do not reset, overwrite wholesale, or commit unrelated changes.
- No deployment, publication or submission is authorized.
- Match suppliers by exact ID; never borrow another supplier's report or contact.
- Reports describe their reporting period, not current safety, current violations or verified resolution.
- A missing sample does not prove contamination. A report with no listed violations does not establish safety.
- Published corrective action is attributed to the report, not verified by WAVE.
- “Current” in a PDF means as printed, not current today.
- Contradictory findings stay contradictory; request clarification rather than choosing a conclusion.
- Preserve existing service, billing, reimbursement-review, complaint, legal-preparation and follow-up tools.
- Drafts remain local to the open component/session; no automatic filing or durable case tracking.
- English and Spanish interface parity; existing English draft templates must remain clearly labeled as English unless translation is separately implemented and reviewed.
- Sample mode must not attach real findings or expose real phone/email targets.
- Implementation changes require a dated, local-only `water-alert/CHANGELOG.md` entry in the same batch.
- The inherited expanded report catalog has only focused verification recorded in the handoff. Do not describe it as fully verified, deployed, or documentation-complete.

## Design direction

Reading this as a trust-first resident help workspace, using WAVE's existing visual language rather than a new marketing-page aesthetic.

- Keep the existing type, colors and button vocabulary; reuse semantic CSS variables after checking their actual definitions.
- Left-align headings and facts. Avoid a large decorative hero or severity scores.
- Use one main working column, with a compact contact/source sidebar on wide screens. On phones, put contacts before the editor in the reading order.
- Reveal detail on demand. The resident should not traverse five screens just to see a phone number.
- Distinguish “Official notice context” from “Historical report finding” with headings and explicit dates, not color alone.
- Use numbered steps only for the actual task sequence below, not for decorative content.

```text
Back to water results
Water Help: [supplier]
[Verify provider on your bill]
[Official notice context / unavailable explanation, when relevant]

1. What do you need help with?
[Report question] [New service/quality issue] [Billing] [Legal]

2. Choose the report finding             Contact and source
[Year and finding list, if applicable]   [Provider / ADH]
[Selected finding and source page]       [Why this contact]

3. Prepare your question
[Suggested questions]
[Editable subject and body]

4. Review and use your draft
[Copy] [Download] [Email, if available]
[External form only for the relevant route]
[Follow-up instructions]
```

## Detailed user journey

### Step 1: Open help for the correct supplier

**User does:** From a supplier card, selects the existing “Get help with a water issue” button. The active-notice checklist remains another entry point.

**User sees:** “Water Help: [supplier name]”, a back button and “Confirm this is the provider on your water bill.” No address or account number is required to enter.

**App does:** Carries the supplier's exact ID and any explicitly linked notice. Help remains accessible without an active notice and when the advisory source is unavailable. It never requires the resident to invent an incident.

**Notice handling:** An explicitly linked archived notice is labeled as a saved reference. To display current status, pass the actual status/source state separately from the optional notice; do not infer freshness from the existence of `notice`. If current data is unavailable, say so rather than displaying an all-clear.

**Success:** The resident can identify whose records and contacts they are about to use.

### Step 2: Choose the reason for asking

**User does:** Chooses one of four plain-language concerns:

1. “Ask about an annual-report finding.”
2. “I have a new service or water-quality concern.”
3. “I have a billing or expense dispute.”
4. “I need legal information.”

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

**Contact routing:** For report questions, start with the supplier for its records and status; provide ADH Safe Water Engineering for regulatory clarification or quality concerns. Do not automatically send all report findings to the Attorney General or legal aid.

**Missing contacts:** Say the number/email is not verified, direct the user to their bill or the directory, and keep copy/download available. Never guess an email or reuse a neighboring supplier's details.

**Success:** The resident understands the next useful question, without the app claiming an answer it does not know.

### Step 5: Prepare an accurate draft

**User does:** Selects “Prepare a question.” Reviews and edits the subject and body in the page. Optional prompts ask what they want to know, whether they contacted the provider before and whether they have a reference number. No prompt requires medical details, account numbers or identity documents.

**App includes:** Supplier name; report year; selected finding and printed dates; attributed corrective action; PDF URL/page; and the category-specific questions. For unknown/missing/conflicting reports, use the matching neutral clarification/request wording instead.

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

**Privacy:** Keep drafts in the current open session only. Explain copy/download before leaving, switching supplier/mode/language or reloading. Downloads are the user's responsibility to store privately.

### Step 7: Follow up without implying case tracking

**User does:** After contacting the provider or agency outside WAVE, keeps the date, response and reference number privately. Can prepare a follow-up draft using their own facts.

**User sees:** A brief checklist: save what you sent; request a reference number; keep the response; ask for written clarification if unanswered. No fabricated response deadline.

**App does not:** Record a case as filed, verify receipt, monitor the agency, promise a response, mark the report finding resolved or change live status. Any contact log is a downloaded blank template, not an in-app tracking service.

## Other routes remain first-class

### New service or quality concern

User chooses service/outage or quality/health. Show provider contacts for service and ADH quality contact plus provider options for quality. Ask for the resident's own observations/dates only in the editable draft; an old report is optional background, never proof that the same event is happening now. Follow current official notice instructions where available. General service wording must work without a notice rather than asking about a nonexistent published notice.

### Billing or documented expenses

User starts with a provider request. They may prepare a credit/reimbursement-review request using their actual documented expenses, then choose consumer-complaint preparation when relevant. The AG form is an external handoff with jurisdiction and public-records/privacy explanations. Do not promise compensation or automatic AG jurisdiction.

### Legal information

User sees legal-information/intake links and optional preparation notes. No eligibility, representation, litigation success or liability is promised. Report findings are references, not proof of personal injury or a legal claim.

## Editing and navigation rules

- Reveal the workspace sections in place; these are task stages, not five mandatory separate screens.
- Do not show the editor before the user chooses to prepare a draft.
- Keep edits when opening sources/contact details or moving among workspace sections.
- Switching a route, report year, finding or draft template must not silently replace edited text. Store edits by exact context key during this mount; new contexts get new drafts and returning restores the prior edited draft.
- Context key includes supplier ID, live/sample mode, notice identity, route, report year and finding identity. Keep language behavior explicit: initial scope retains current reset behavior and warning, not a claim of cross-language draft preservation.
- Leaving the workspace and reloading may discard edits. Do not describe warnings as unsaved-change protection; navigation interception is not part of this proposal.
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

- [ ] Write failing interaction tests for route selection, finding selection, source disclosure, immediate contact access and explicit draft preparation.
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

1. A resident can select their supplier's exact historical finding and prepare a source-linked question without traversing the old wizard.
2. Contacts remain accessible without composing a draft or having an active notice.
3. Every supported report state has an honest useful next action.
4. Drafts never invent current violations, contamination, resolution, loss or legal entitlement.
5. Existing service/billing/legal/follow-up functionality is preserved and route-appropriate.
6. Context changes do not silently overwrite edited drafts within the workspace.
7. All handoffs clearly state nothing was submitted by WAVE.
8. EN/ES, sample/live isolation, keyboard use and 320px layouts are tested.
9. No deployment or unrelated cleanup occurs.

## Scope deliberately excluded

Automatic complaints, background report scraping, safety scores, medical/legal diagnosis, persistent case tracking, accounts, external AI drafting, automatic multi-finding inquiries, translated English legal/draft templates without review, and treating old findings as live notices.
