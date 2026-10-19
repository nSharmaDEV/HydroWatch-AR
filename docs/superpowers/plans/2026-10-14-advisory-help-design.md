# Water Alert: useful advisory information — design specification

**Date:** October 14, 2026  
**Status:** Core supplier toolkit implemented locally after user approval; not deployed.  
**Backend follow-up:** The subsequently authorized store-module repair resolved the verification blocker described below. All 210 tests and the full TypeScript/Vite build now pass locally under Node 24.
**Companion:** [Implementation plan](2026-10-14-advisory-help.md) · [Interactive wireframe](../../wireframes/advisory-help.html)

## 1. Outcome and scope

Help a resident answer, in order: **Who can I contact? How do I request reimbursement or a bill credit? How can I complain or seek legal help? What are the advisory details?** Keep a compact status/source warning above the actions, especially when current status is unavailable.

**User revision:** Contact information and actionable compensation/legal-help pathways come first; detailed notice facts and general water guidance follow. An advisory alone does not establish liability or entitlement to compensation. The user subsequently approved adding these changes to Water Alert, not filing claims or suing on anyone's behalf.

**Second user revision:** Streamline execution rather than generating advice: direct official links, editable deterministic drafts, copy/download and a preparation packet. Both the static preview and local app now provide these interactions.

**Implementation checkpoint:** 53 targeted UI tests pass; actual-app browser checks passed sample navigation, exact Unicode preparation-pack downloads and EN/ES layouts at 320/390/768/1280 px. Vite bundling passes. Full-suite/TypeScript verification is blocked by the unrelated empty `water-alert/server/store.ts`, which this feature did not modify. Proposed decomposition below is design guidance: the implementation combines the curated quotations in `BoilWaterGuidance.tsx` and draft generation in `recovery-drafts.ts`. Drafts reset when leaving the detail view or changing context; there is no persistence.

The user's screenshot is an expanded `SupplierAlertHistory` record, not just the full `NoticeDetail` page. Improve both surfaces without putting a long instruction sheet inside every saved record.

Deliverables in this batch are this specification, an implementation plan and a responsive static wireframe. The working app, parsers, database, notification configuration and deployment remain unchanged.

### Included in the proposed implementation

- Current ADH boil-advisory detail with practical, cited general CDC guidance.
- Clear separation of incident-specific instructions, general guidance and app retrieval evidence.
- Existing exact-ID provider contacts in the detail page; no duplicate provider directory.
- A contact-first action section: written credit/reimbursement request, evidence checklist, Attorney General complaint route and legal-help/small-claims reference.
- A visible route from supplier cards and each retained advisory to the appropriate detail.
- Better lift/missing-instructions wording and disclosure hierarchy in supplier history.
- English/Spanish interface labels; official source text remains verbatim in its source language.
- Existing ADEQ/HAB behavior preserved; never attach boiling instructions to a lake.

### Excluded

New live feeds, utility categories, address/geocoding coverage claims, restoration estimates, new provider contacts, lab results, diagnosis, AI-generated advice, a medical FAQ, changes to push delivery, automatic agency submissions, publishing or deployment. No determination of legal liability, payout calculator, guaranteed reimbursement, legal deadlines inferred from an advisory, automated complaint/lawsuit submission or collection of legal documents. No dark-mode project or new component-library dependency is required for implementation; the isolated wireframe offers light/dark inspection only.

## 2. Evidence and attribution

Sources read on **2026-10-14**. Recheck wording immediately before implementation; a retrieval today is not a promise of continuing source accuracy.

| Source | Verified contribution | Must not imply |
| --- | --- | --- |
| [ADH boil-water list](https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx) | Leisure Hills entry: entire system; reason `power outage`; issued `10/14/2026 3:12:14 PM`; lift field blank when checked | The table contains incident-specific instructions, an estimated restoration time, confirmed contamination, or the reason the power failed |
| [ADH system directory, ID 747](https://health.arkansas.gov/Eng/WS.aspx?ID=747) | Directory emergency contact phone `(479)549-2158`; the repo already has a curated exact-ID contact record | Verified 24-hour availability, immediate response, or guaranteed call/email delivery |
| [CDC drinking-water advisory overview](https://www.cdc.gov/water-emergency/about/drinking-water-advisories-an-overview.html) | General boil-water precautions and distinctions from do-not-drink/do-not-use advisories | Instructions issued by ADH specifically for Leisure Hills |

The CDC page labels itself March 4, 2024. Store that separately from our verification date. These are **reference materials**, not a third live advisory feed. Adding CDC to the proposed presentation requires a narrowly documented exception to `docs/GOAL-advisory-alert.md`'s two-source/no-new-source constraint: two live feeds remain unchanged; one curated guidance reference is added only if this design is approved for implementation.

### Contact and compensation references (user revision)

Read on October 14, 2026; reverify before implementation:

- [Arkansas Attorney General complaint page](https://arkansasag.gov/file-a-complaint/): `(501) 682-2007`; jurisdiction review, possible mediation/referral, not private representation. Complaints are shared with the business and may be public records. The form says mediation is unavailable when a private attorney is retained or court action has started. Do not promise resolution or payment.
- [Arkansas Law Help](https://www.arlawhelp.org/): `1-800-952-9243`; legal-aid application/information, not guaranteed representation. Eligibility and availability must remain explicit.
- [Arkansas Law Help small-claims guide](https://a.arlawhelp.org/self-representation/small-claims-court): damages sought cannot exceed `$5,000`; page updated March 6, 2026. The cap is not proof this dispute belongs in small claims. Direct users to confirm correct defendant, venue, procedure, deadlines, fees/service and possible immunity with legal help/the court.

The written reimbursement request and evidence checklist are app-authored general preparation steps, not quotes, legal findings or proof a provider offers a credit. Ask for applicable policy and any deadline; never invent either. Keep bills, original notices, actual expense receipts and correspondence locally. No account numbers, health records or legal documents are collected in Water Alert. Do not recommend withholding rent or utility payments. APSC routing is excluded until exact-provider regulatory jurisdiction is verified; do not send every municipal/park supplier there.

These legal/consumer references extend the proposed reference-only exception; ADH/ADEQ remain the only live advisory feeds. Human review of legal-resource wording and Spanish labels is a release gate.

### Action toolkit: drafts, links and local preparation

Show the toolkit immediately after provider contact. Put the longer explanation of options in a collapsed disclosure rather than above useful actions.

| Action | User-visible result | Boundary |
| --- | --- | --- |
| Provider request / follow-up | Editable subject/body; copy or download `.txt` | Deterministic template, not generated legal advice; user supplies personal experience, dates and actual costs |
| Open provider email (live implementation only) | Open user's email application with verified exact-ID recipient and reviewed subject/body | Never send automatically; no recipient inferred from supplier name. Unknown/no email: copy/download. Sample preview has no compose destination |
| Prepare AG complaint | Editable facts/contact attempts/resolution for copying into [official form](https://arkansasag.gov/file-a-complaint/) | Not a lawsuit; no automated cross-site prefill or submission; retain sharing/public-record warning |
| Printable AG form | Direct [English PDF](https://media.ark.org/ag/Consumer-Complaint-Form.pdf) or [Spanish PDF](https://media.ark.org/ag/Spanish-Consumer-Complaint-Form-3.pdf) | Official external forms, not our legal documents; user completes/submits |
| Prepare legal-help request | Editable intake notes plus [online application](https://aroi.legalserver.org/modules/matter/extern_intake.php?pid=38&h=757e8c&) | Eligibility/availability apply; no case assessment or attorney-client relationship with the app |
| Court resources | Direct [small-claims process and forms](https://a.arlawhelp.org/self-representation/small-claims-court/process-and-forms) | User confirms correct defendant, court, fees/service and deadlines; no generated pleading or automated filing |
| Preparation pack | Download reviewed draft, source context, evidence checklist, blank expense log and blank contact log | Text only, no attachments, not proof of losses/liability; label SAMPLE throughout in demo mode |
| Call script | Questions about affected address, instructions, policy/deadline, case number and written response | No scripted allegations or promise of a remedy |

Additional URLs above were verified from the AG and Arkansas Law Help pages on October 14, 2026. Link to the hosted court-forms page rather than cloning forms with older version dates. Do not hardcode statutory deadlines or fees from general guides as if they applied to a selected claim.

Prefill **only** selected notice facts and source URL, marked as published context—not user experience. No source record: no incident dates or reason inserted. Explicitly distinguish agency issue date from the user's service interruption dates. Never invent actual loss, negligence, injury, bill credit eligibility, cause or recipient.

Privacy: preview textarea content remains only in tab memory, keyed by scenario/template/language; close/reload loses it. No telemetry, network transmission, persistence or uploads. Use synthetic text in the preview. Copy/download transfers text to the clipboard/device; warn users to protect it. In production use local component state keyed by mode/place/exact notice ID/template/language, not global history or database storage. Existing persisted notices remain unchanged. A downloaded pack is not proof or a complete claim and does not include attachments.

Copy must preserve exactly reviewed text and report success only after the clipboard API succeeds. On failure select the text and explain manual copy/download. Download reports “Download requested,” not confirmed storage/submission. Preserve edits while switching templates; never interpret text as HTML. No personalized query strings to external forms. `mailto:` composition, if available in live implementation, must encode subject/body and use only curated exact-ID contacts; omit private data from analytics/logs. If it is too long or an email client is unavailable, provide copy/download instead. Browser opening cannot establish draft creation or delivery. Do not auto-attach documents.

Current preview drafts are explicitly English templates even with Spanish interface labels. Spanish official complaint PDF is linked; separately reviewed Spanish templates remain a release gate, not a claim of completed legal translation.

### Proposed verbatim CDC excerpts

Retain these as separate source excerpts, never concatenate them into a single fabricated quotation. All are English original text and must have `lang="en"` even within the Spanish interface.

1. **Main action:** “If local officials issue a boil water advisory, use commercially bottled water or boil your tap water.”
2. **Boiling:** “To kill germs, bring water to a full **rolling boil for 1 minute**. At elevations above 6,500 feet, boil for 3 minutes. To avoid burns, allow boiled water to cool before you use it.”
3. **Filters:** “Boil your tap water even if you filter it. For example, still boil tap water if it has been through a home water filter or a pitcher that filters water.”
4. **Drinking/cooking:** “Use commercially bottled water or boiled water for drinking and to prepare and cook food.”
5. **Teeth:** “Brush your teeth using boiled water or commercially bottled water. Do not use tap water that you have not boiled first.”
6. **Bathing:** “Be careful not to swallow any water when bathing or showering.” and, as a separate paragraph, “Use caution when bathing babies and young children. Consider giving them a sponge bath to reduce the chance of them swallowing water.”
7. **Pets:** “Give pets commercially bottled water or boiled water that has cooled. Pets can get sick from some of the same germs as people or spread germs to people.”

Use entries 1, 2, 4 and 5 in the initial compact block; filters, bathing and pets belong in native disclosures. Link to the full CDC page for dishwashing, formula and other special cases instead of constructing a comprehensive medical manual. State **“General guidance, not instructions issued for this incident. Follow local officials' instructions.”** immediately above excerpts. In Spanish, keep this explanation localized and explicitly label the excerpts as English original text; translated quotations need a separately verified Spanish source before shipping.

## 3. Layout and hierarchy

Preserve Avenir/system sans, navy `#172e46`, teal `#087f83`, muted `#536579`, lines `#dce3e9`, white panels and existing orange active status. This is a product-detail improvement, not a landing-page redesign. No photography, decorative maps, motion or new dependencies.

### Full advisory detail

1. Back to My Water; supplier name and a compact current-status/source warning. Keep official instructions reachable immediately; never bury an unavailable warning.
2. **Contacts, reimbursement & legal help**, before the detailed notice panels, full width on desktop and mobile. Reuse `ProviderContact` once; phone/email actions only for exact verified ID in live mode. Keep bill-match and contact-source caveats. Unknown provider: bill/park-management fallback. Immediately below: template editor, copy/download/preparation pack and direct official-form/intake links. Longer explanatory steps sit in a disclosure.
3. **Request credit/reimbursement:** ask provider/park management for policy, submission instructions, deadline and written decision/case number. Offer a neutral request example, not a demand claiming liability.
4. **Keep evidence:** original notice, dates, bills, actual receipts and correspondence; store privately outside the app.
5. **Escalate:** official AG complaint link/phone and privacy/mediation limitations; Arkansas Law Help link/phone for advice on a possible lawsuit, plus qualified small-claims guide. Label phone numbers visibly. In the static preview calls remain simulated; live implementation may use verified `tel:` links except in sample mode. No form submission or case assessment.
6. **Detailed current finding:** affected area, reason and original agency dates; last success and latest attempt stay distinct. Show explicit zone only for app instants, never infer the agency date's timezone.
7. **Incident instructions** or the source-specific gap, then **general CDC guidance**. Keep both clearly attributed; filters/bathing/pets in disclosures.
8. Secondary detail column: coverage, end time unknown, original source text, source activity and notification settings. The coverage reminder remains beside the area in DOM order. Legal/compensation steps never delay access to official guidance or imply the water is safe.

At desktop, the primary column is approximately two thirds of available width. Below 760px use one column; buttons wrap/stack, long supplier names and dates wrap, no horizontal page scrolling. At 320px retain 16px side padding and readable 16px body text. Touch targets are at least 44px; focus indicators and native disclosures remain keyboard accessible.

### My Water and history

- Add **“What to do / notice details”** to current supplier cards using the existing `onView` callback. Keep info-modal and contact behavior; do not force a modal detour to reach instructions.
- Each retained history article keeps source facts, its own status, original issue/lift text and existing official link.
- Replace the empty guidance row with **“No incident-specific instructions were provided in the saved source.”** Do not put CDC advice in `Notice.guidance` or under this row.
- Blank lift on a fresh matching active record: **“No lift date published.”** On an unconfirmed historical record: **“No lift date saved; current status unconfirmed.”** Explicit lift: show the source's actual date verbatim.
- Add **“View this notice”** per history article. It opens this exact archived notice, not whichever newer notice happens to be current. The full page labels it historical and separately identifies any current supplier finding.
- Historical detail can offer **“General boil-water information”** as a collapsed reference, not a current instruction. If a different notice is current, offer **“View current supplier status”** via the existing home navigation.
- Keep history collapsed initially, paginated in six-record increments, and separate from check logs. Do not duplicate the contact block within every history article.

## 4. State contract

| Scenario | Primary presentation | Guidance behavior |
| --- | --- | --- |
| Fresh active ADH boil notice | `Boil-water advisory · Active`; area/reason/issued; no lift date published | General CDC block expanded after incident instructions |
| Failed latest source check with retained notice | `Current advisory status unavailable`; retained record labelled previously observed | `General boil-water information` collapsed; never frame it as confirmation of a current order |
| Stale source (age >= 900 seconds) | Same unavailable primary state; explain stale rather than fetch failure; preserve last success and attempt times | Same collapsed reference |
| No retrieval yet | Unavailable; no attempt time invented; no incident facts invented | Collapsed reference for a water system only |
| Fresh check, no active advisory | `No active advisory found`; absence is not proof of safety | Collapsed reference; no “boil now” instruction |
| Archived notice with explicit lift | `Agency explicitly lifted this saved notice`; verbatim lift date | Collapsed reference; do not say all water is safe or all newer orders are lifted |
| Saved notice absent from fresh current feed, no explicit lift | `Previously observed · current status unconfirmed` | Never infer lift; collapsed reference |
| Unknown provider contact | Bill/park-management fallback, no phone/email destination | No fuzzy-name/county contact matching |
| Multiple partial-area notices | Each record retains its own area, issue date, status and incident instructions | One general guidance block per detail page; no invented address eligibility |
| HAB/lake | Existing ADEQ content and limits | Never CDC boiling instructions, even if a reason contains “boil” |
| Sample | Persistent `SAMPLE / DESIGN PREVIEW`; synthetic notice/place/check times | No real phone/email/share/push actions; public reference links clearly external |

The three current finding states remain unchanged. “Lifted” is a historical agency event, not a fourth current safety state. Guidance availability must never change `statusFor`.

## 5. Data and component boundaries

- Keep `Notice`, `SourceSnapshot`, API response, storage and parser schemas unchanged.
- `src/boil-guidance.ts`: curated reference URL, source title, page date, checked date and exact excerpt strings. Not fetched at runtime, never merged into a notice.
- `src/advisory-help.ts`: pure display-context selector (`current`, `reference`, `hidden`) from existing notice/source/status inputs.
- `src/BoilWaterGuidance.tsx`: accessible quoted source content; receives display context and language. It does not decide status or fetch data.
- `src/advisory-help-strings.ts`: localized labels/qualifiers, not translated source quotations; match the repo's paired string-module convention.
- `NoticeDetail.tsx`: orchestrates existing notice state, incident guidance, reference component, provider contact and provenance.
- `SupplierAlertHistory.tsx` and `components.tsx`: expose notice callbacks and current-detail entry point, retaining all existing filtering and pagination.
- `App.tsx`: owns exact notice selection/navigation, as it already does for linked notices. Pass `sample` through history. Preserve the existing share logic and notification limitations.

## 6. Acceptance and release gates

1. A first-time reviewer sees contacts and reimbursement/complaint/legal-help steps before detailed notice facts, without opening source-check logs. A compact current-status warning and official link remain above the actions.
2. Every health-related instruction is an exact sourced excerpt, visually separate from incident facts; general guidance never masquerades as retained incident instructions.
3. Failed, stale, unknown-lift and missing-feed records never acquire an active or lifted status through this change.
4. A saved notice opened from history is the selected notice, including when a newer notice exists. The selected archived notice does not borrow newer dates/area/guidance.
5. No live contact action in sample mode, no contact inference for unknown providers, no success/delivery claims from clicking phone/email.
6. English and Spanish labels, quotation language markup, keyboard, mobile 320/390px and desktop 1280px checks pass. Human Spanish review remains a release gate if no reviewer is available.
7. Tests and build pass; source wording reverified; README, Sources & Limits, goal constraint clarification and required dated changelog updated together during implementation.
8. No deployment, notification sends or publication without separate authorization.
9. No claim of negligence, guaranteed payment, eligibility or universal regulator jurisdiction. Complaint privacy and legal-aid limits are visible; no legal evidence is uploaded or stored. No compensation action block for HAB/lake in this bounded revision.
10. Clipboard output and downloads contain the user's reviewed text, not a regenerated version. Editing/switching is local only; missing notice/unknown email/sample cannot acquire invented facts or real compose recipients. No automatic send, submit, attach or file. External official resources and draft language are labelled truthfully.

## 7. Wireframe review guide

Open [advisory-help.html](../../wireframes/advisory-help.html). Choose a scenario and switch Detail/History, EN/ES, known/unknown contact and light/dark preview. Edit a template, copy it, download a draft or preparation packet, and inspect external form links. Expand reference questions and original text. All notice facts and timestamps are synthetic. Contact/share/manage actions show preview messages, never call, email, share or register a device. Copy and text downloads work locally; public reference/form links are real. The preview does not submit anything.

Review the active screen first, then failed/stale, historical/no-lift, unknown-contact and HAB. The wireframe is intentionally not a pixel-perfect replacement for all navigation screens; it specifies the requested advisory-information flow.

The preview's history button preserves the selected synthetic scenario; use the historical scenario to inspect archived-record treatment. Production history navigation must always use the exact archived ID and historical context as specified above. The preview's back action returns to its history surface rather than simulating the whole My Water screen.
