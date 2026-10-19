# WellPower: WAVE needs-based supplier help revamp plan

**Status:** Revised after October 19 Plannotator annotations; not approved for implementation. Planning only; no application changes authorized or made.

**Goal:** Replace scattered supplier-help resources and the generic five-step form with one needs-based flow that uses the user's answers to select relevant verified contacts, documents, forms, preparation tools, and follow-up information.

**Architecture:** A local, deterministic answer-to-resource matcher over curated source-backed records, rendered through the existing HelpGuide entry. Reuse verified supplier identity, source-status semantics, contact records, and draft helpers; do not add a backend, search service, AI eligibility decision, automatic submission, or new app route.

**Tech stack:** Existing React 19, TypeScript, Vite, Vitest/Testing Library, guarded Playwright; Node 24.x for future verification. Standalone HTML/CSS/JavaScript for design review.

**Spec:** User's October 19 discussion in this session: resources are scattered; retrieve the right resource for a specific need from form answers. First-screen proposal: `docs/wireframes/wave-merged-help-review.html`. Earlier approved standalone reviews: `wave-advisory-history-review.html`, `wave-contact-source-review.html`, `wave-provider-information-review.html`, `wave-compact-supplier-review.html` under `docs/wireframes/`. Current user direction overrides outdated copy in earlier plans/wireframes.

## Global constraints and approval gates

- DESIGN/WIREFRAMING FIRST. Review one screen at a time. This plan is not permission to implement it.
- No production edits, backend/routing changes, deployment, worktree, delegation, real calls, emails, or submissions during planning/design.
- Preserve unrelated dirty work. Do not reset files, stage the whole repository, or commit bundled changes.
- Preserve localhost:5178 UI, localhost:8788 API, and 127.0.0.1:5189 wireframe server; do not restart or reconfigure them.
- Keep four independent title-only collapsed supplier-card sections with +/-; no generic More details wrapper.
- Service questions? = direct phone/email/directory shortcut. Get help with a water issue = the single needs-based guide. Provider information = verified background facts plus annual reports. Advisory history = previous notices.
- Remove the duplicate Supplier details & tools entry only after its useful actions have a reviewed equivalent and implementation is separately authorized. Preserve standalone provider profile provenance and existing incident/history access.
- No claims of verified coverage for all suppliers, legal eligibility, agency jurisdiction, guaranteed response, compensation, time savings, or health outcomes.
- Display provenance and limitations beside the relevant action; not only in a distant disclaimer.
- Source failures/staleness/history never establish current advisory status. No active notice found is not proof of safety.
- No sensitive information required in the form; no uploads, storage, analytics capture, or server transmission of answers/drafts.
- Drafts remain session-only. Back/Next retains edits; context changes/reload/exit can discard them, with accurate warnings. No invented persistence or unload protection.
- Preserve EN/ES UI; keep verified source quotations and existing English templates explicitly labeled. Do not silently translate agency instructions.

## 1. Current-app audit: what exists and what must change

| Current location | Actual behavior | Proposed treatment |
|---|---|---|
| `src/HelpGuide.tsx` | Four broad choices: service, quality, billing, legal; same five steps for everyone | Replace sequence with branch-specific questions and a matched plan; precautions need no draft step |
| `src/help-guide-strings.ts` | Generic contact/checklist/handoff/follow-up copy; AG timing and legal links reach broad contexts | Scope statements to applicable resources; remove generic AG follow-up advice from other routes |
| `src/NoticeDetail.tsx` | Contacts, guide entry, independent RecoveryActions editor, profile, official notice facts, CDC guidance, incident metadata | Move duplicate preparation/resource UI into guide; retain authoritative incident facts, source links, history context, and necessary safety information |
| `src/SupplierProfile.tsx` | Card Provider information includes Supplier details & tools button; standalone profile has ADH profile plus annual reports | Remove duplicate button after parity; card keeps facts/reports only; standalone profile keeps source provenance |
| `src/RecoveryActions.tsx` | Five draft kinds, editable per-template state, copy/download/email; independent generic selector and resource list | Reuse editor capabilities but supply only relevant draft/resource choices from matched result |
| `src/recovery-drafts.ts` | Five template builders; packet contains a generic checklist and every RECOVERY_RESOURCES entry | Retain factual disclaimers and legacy behavior for remaining callers; add explicit scoped packet input for this flow |
| `src/provider-contacts.ts` | Five exact-ID directory contacts checked Oct 14; emails only on some records | Exact match only; show actual gaps. A directory contact is not a verified billing department or named caseworker |
| `src/recovery-resources.ts` | AG online/PDF destinations, legal information/intake/small claims, annual-report search; checked-date comment | Preserve URLs; add structured metadata/matching without duplicating competing URL sources |
| `src/BoilWaterGuidance.tsx` | Separate general CDC boil-water reference; not incident-specific instructions; checked Oct 14 | Reuse the distinction in precautions; never apply boiling advice to unknown/chemical/do-not-use notices |
| `src/App.tsx` | Existing help page, exact context key, return page/notice tracking; reopens native help disclosure before restoring focus | Preserve navigation behavior and enhance context passed to guide only after separate implementation approval |

Audit correction: verified supplier directory contacts exist for five supplier IDs, not just Leisure Hills. Detailed background facts are specifically verified for Leisure Hills. Do not generalize those facts to the other four contacts.

Existing code is evidence of current behavior, not fresh external verification. Supplier contact records carry Oct 14 dates; guide copy records an Oct 18 contact/destination check. Preserve per-resource dates, not one blanket 'verified today' label. The older source audit did not independently reverify the Leisure Hills email on Oct 18.

## 2. Target experience

```text
Supplier card -> Get help with a water issue -> Open guide
  -> What do you need help with?
  -> A few questions relevant to that need (unknown/not sure allowed)
  -> Your next step: matched resources + why they apply + documents to prepare
  -> Optional reviewed draft / scoped preparation packet
  -> User contacts organization or opens official process themselves
  -> Save own confirmation / relevant follow-up information
```

One coherent flow, not a giant form, generic resource directory, or eligibility quiz. Show useful contact information as soon as enough answers are available; never require drafting to access it. Retain supplier context without asking the user to select it again. Let users correct their answers and explain how the result was selected.

### First-screen labels (revised from Plannotator feedback)

- Understand a water advisory
- Report a water problem
- Get help with a bill or credit
- Follow up on an existing issue

The existing first-screen HTML still uses the earlier wording. Revise that standalone screen during the next screen review; this plan revision does not change it or production copy.

### Question budget and follow-up continuity

Require every question to change a destination, checklist, draft, or necessary limitation. Document that effect in the matching tests; remove questions that merely collect context without changing the help. Ask optional draft-specific questions only when the user requests that preparation, not before showing contacts/results.

Follow-up remains a first-screen shortcut for returning users, not a separate silo. Service and billing results offer Follow up on this issue with prior answers prefilled in this open session. Users can review/change them; do not make them repeat supplier, underlying issue, or known prior-contact answers. Direct entry asks only for missing routing facts. This is in-memory continuity, not persistence across reloads or visits.

### Screen order for collaborative design

1. Review the existing proposed first screen and its four need labels.
2. Review branch questions for service/quality, then its matched-result screen using Leisure Hills and an unknown supplier.
3. Review advisory questions/result and available vs unavailable/historical notice contexts.
4. Review billing questions/result and optional credit-request preparation.
5. Review unresolved questions/result, consumer/legal scope boundaries, and follow-up preparation.
6. Review optional editor/export/handoff, state-change warnings, EN/ES, phone and keyboard layouts.

Each review can revise earlier decisions. Do not build all later UI screens ahead of approval. Standalone design actions remain inert: no tel/mailto launches, external submissions, storage, downloads, or live API requests.

## 3. Questions and matching rules for each choice

### A. Understand a water advisory

Questions: What do you need to understand: affected address/area, precautions, or lifting/updates? Include Not sure. Derive available notice context from existing status logic, not a user checkbox asserting an active notice.

```text
Precautions -> choose question -> check supplied notice/status context
  verified current record -> show available published facts and official source
  stale/failed/none/historical/ambiguous -> explain exact limitation; official-source/provider check
  applicable boil-water reference -> separate CDC general guidance, never incident instructions
  unclear/other advisory -> applicable official instructions; no automatic boil-water recommendation
  optional provider question draft -> user acts externally -> check official updates
```

Result: official ADH notice list with supplier text-fragment behavior preserved where supported; do not imply an individual notice URL or reorder the third-party list. Add provider contact for address/operational questions. Do not substitute annual reports for current incident instructions. No default AG/legal forms or receipts checklist.

### B. Report a water problem

First question immediately distinguishes outage/low pressure, taste/odor/color/another quality concern, both, and not sure. Quality observations do not diagnose contamination or establish safety. Both shows the relevant operational and quality resources, with each role explained; not sure explains the roles without silently classifying. Make health-professional and immediate-medical-danger guidance visible before form completion rather than requiring a medical screening answer; do not collect symptom details. Ask prior-contact status only if it changes initial inquiry vs follow-up preparation or the next action.

```text
Service/quality -> clarify concern
  operational -> verified supplier directory contact; verify against bill
  drinking-water quality -> ADH Safe Water Engineering resource
  both -> provider for operations and ADH for drinking-water quality; distinct purposes
  medical -> health professional; immediate medical danger -> emergency services
  not sure -> explain provider vs ADH roles; user chooses rather than silent classification
  -> relevant questions/checklist -> optional service inquiry draft
  -> user contacts organization -> keep reference/response -> unresolved flow if wanted
```

Result: contact details, source/check date, scope, dates/observations checklist, optional factual inquiry. Do not label the AG form as a quality/outage reporting route. Do not email the provider automatically when the selected destination is ADH; no ADH email is established by this audit. Unknown supplier contact: bill/park-management fallback, not a nearby supplier's phone.

### C. Get help with a bill or credit

Questions: explain/dispute charge, ask about credit policy, or ask for actual expense review? Who bills you: supplier, landlord/park management, or not sure? Prior contact: not yet, awaiting answer, response received, or not sure? Have supporting records: bill, receipts, correspondence, or none yet? Checkboxes only, not uploads or account numbers.

```text
Billing/credit -> clarify request and who bills user
  -> identify verified relevant contact or explain missing billing-specific contact
  -> ask policy, claim instructions, any deadline, reference and written decision
  -> tailored evidence checklist -> optional inquiry or credit-request draft
  -> user sends request -> keep response -> unresolved flow if requested
```

Result: general supplier contact clearly labeled when no billing department is verified; ask user to confirm against bill. Do not invent landlord contact information. Distinguish a general billing-question draft from the existing advisory-oriented service template; no unsupported assertion of a notice or expenses. Credit-request draft preserves 'asking for review, not stating compensation is automatically owed.' No default complaint form for an initial billing question.

### D. Follow up on an existing issue

Prefill known answers when arriving from service or billing results; direct entry asks only missing facts. Questions: underlying issue (operations, drinking-water quality, both, billing/credit, not sure); who was contacted; response (none, pending, denied, other, not sure); desired next action (follow up, review consumer complaint information, find legal assistance, not sure). Include a question only where it changes the destination, checklist, draft, or necessary limitation; defer draft-only details until preparation is requested. If user explicitly chooses AG information, ask whether a private attorney is retained or court action has begun, with Prefer not to answer, because the answer changes the mediation limitation shown. Do not require legal details.

```text
Unresolved -> establish issue and prior action
  operations/quality -> relevant provider/ADH route; not consumer complaint as urgent help
  wants written update -> follow-up draft and correspondence checklist
  consumer dispute + user wants options -> official AG scope/instructions and privacy limits
    attorney retained/court action -> explain published mediation restriction; no eligibility approval
    unknown/declined answer -> official instructions; no eligibility inference
  wants legal assistance -> legal information/intake; no representation guarantee
  -> user completes external process -> keeps own confirmation and follow-up record
```

Result: no automatic escalation after a timer, no inferred entitlement, and no default small-claims recommendation. Small-claims information appears only when the user requests court-process information within legal resources, with correct-party/deadline/fees/service/immunity verification cautions. An unresolved state does not establish agency jurisdiction.

## 4. Matched-result contract

The first visible result prioritizes only these three sections:

1. **Your next step:** one primary recommendation with plain-language reason tied to answers.
2. **Who to contact / official resource:** verified organization/role, full phone/email when known, appropriate official link. Never invent a person, department, or email.
3. **What to prepare:** only pertinent records and questions; allow missing records without blocking guidance.

Below that primary content, show optional draft preparation and additional options without giving every resource equal prominence. Official form/intake destinations can be the primary resource when the answers explicitly call for them; distinguish them from editable preparation templates.

Essential privacy, scope, eligibility uncertainty, and emergency limitations stay beside the applicable action and must not be hidden in optional content. Keep concise resource-specific source/check dates with the contact/resource; checked does not mean staffed now or accepted for this user. Change answers and Follow up on this issue remain clear secondary controls. Carry known answers forward and preserve edits rather than silently overwriting them. These are supporting controls and qualifications, not four more mandatory result sections.

For AG results, show online form and English/Spanish PDFs together with public-record/business-sharing warnings and official mediation restrictions. AG timing copy, if retained and reverified, belongs only here, qualified as not a promised response time. Legal intake is not an application approval. A link click never becomes 'submitted' or 'received'.

No resources are fabricated by matching. The matcher selects curated records locally; it does not scrape forms, send answers to agencies, infer eligibility, or search the web at runtime.

### Resource evidence model (proposed interface, not shipped)

```ts
type Need = 'precautions' | 'service-quality' | 'billing-credit' | 'unresolved'
type ResourceKind = 'contact' | 'guidance' | 'form' | 'pdf' | 'legal-information' | 'intake'
type HelpPlan = {
  primaryResourceIds: string[]
  optionalResourceIds: string[]
  checklistIds: string[]
  draftKinds: string[]
  rationaleIds: string[]
  limitationIds: string[]
}
```

Resource descriptors need stable ID, kind, organization/role, purpose, source URL, original checked date, supported language, scope/limitations, and optional contact targets. Supplier contacts remain keyed by exact place ID. Canonical destinations remain sourced from existing constants. Store answer enums only in guide memory; user-written draft content remains local memory and outside matching rules. Use explicit unknown values; absence is not false.

Pass guide an authoritative notice-context classification from existing status logic (current, historical, unavailable, no active match, or ambiguous), plus relevant record/source context. A lone Notice object is insufficient to establish freshness. Do not classify current state from a missing lift date.

## 5. Complete consolidation map

| Existing capability | New home |
|---|---|
| Supplier phone/email/directory | Quick Service questions? shortcut AND applicable matched result, same exact-ID source |
| ADH engineering contact | Quality result, with source and scope |
| Official notice / general CDC guidance | Precautions result; retain appropriate incident-page safety context |
| Service question template | Operations, address/precaution questions, scoped quality inquiry preparation |
| Credit/reimbursement request | Billing/credit result, user-selected actual expense context |
| Follow-up template | Unresolved result |
| Complaint template + AG online/PDF forms | Explicit consumer-complaint information/preparation path |
| Assistance template + legal information/intake | Explicit assistance path within unresolved result |
| Small-claims information | Optional requested court-process information, not default escalation |
| Copy/download/email draft | Optional matched editor; destination-specific restrictions preserved |
| Preparation packet | Selected checklist, relevant resources, reviewed draft, applicable notice context, contact/expense logs only when relevant |
| Provider facts + annual reports | Provider information, not the recovery wizard's default resource list |
| Previous notices and observation evidence | Existing Advisory history / incident records, not repurposed as current status |

## 6. Delivery tasks and tests (future implementation requires separate authorization)

Delivery sequence: approve designs first; implement core matching/questions/results (Tasks 2–3) without requiring drafts; add scoped drafts/exports (Task 4); remove duplicate entry points only after capability parity (Task 5). Task 6 is the final regression gate, not a reason to defer focused tests in each earlier task.

### Task 1 — Approve the design and resource evidence

Files: update only this plan and standalone `docs/wireframes/wave-merged-help-review.html` as approved. Add subsequent review screens only as the user requests them.

- [ ] Review screen 1 labels and service/quality split with user.
- [ ] Build/review each subsequent screen in the order above, with inert controls and synthetic personal facts.
- [ ] Recheck official destinations read-only before release; do not submit, phone, or email. Record per-resource findings and dates; retain original dates when not reverified.
- [ ] Review unknown supplier/no-email, failed/stale/historical notice, sample, and EN/ES variants.
- [ ] Obtain explicit approval of the screens and separate authorization for any application changes. Approval of this plan alone does not open that gate.

### Task 2 — Centralized matching and scoped resource metadata

Future files: create `water-alert/src/help-matching.ts`, `water-alert/src/help-resources.ts`, `water-alert/tests/help-matching.test.ts`; reuse `recovery-resources.ts`, `provider-contacts.ts` and existing domain status logic.

- [ ] Write failing table-driven tests for every answer route described in section 3 and the result contract in section 4.
- [ ] For each retained question, test two answers that change destination, checklist, draft, or necessary limitation; remove questions with no such effect. Test both and not sure for problem type explicitly.
- [ ] Assert exact-ID contact matching; unknown suppliers and missing emails never borrow data.
- [ ] Assert operations/quality/precautions do not default to AG/legal resources; initial billing requests do not default to complaint drafts; requested consumer/legal information retains explicit scope limits.
- [ ] Assert attorney/court answers never produce an eligibility claim or an unrestricted AG mediation recommendation; unknown/declined answers preserve uncertainty.
- [ ] Implement the smallest pure matcher and structured resource wrappers. Use stable IDs and reason codes, not rendered-text comparisons. Annual reports stay outside default help results.
- [ ] Run `npm test -- tests/help-matching.test.ts` in `water-alert/`; inspect failures then implement until passing. Add a dated Unreleased changelog entry for actual app changes only.

### Task 3 — Conditional form and tailored result

Future files: modify `src/HelpGuide.tsx`, `src/help-guide-strings.ts`, `src/styles.css`; create `src/HelpResult.tsx`, `tests/needs-based-help.test.tsx`; update `tests/help-redesign.test.tsx` without deleting its safety assertions.

- [ ] Test only relevant questions appear; unknown answers are usable; no personal information is required; guidance is accessible without an editor.
- [ ] Test the revised four labels and immediate operational/quality/both/not-sure split. Results prioritize next step, contact/resource, and preparation; optional drafts/options sit below and essential limitations stay beside actions.
- [ ] Test service/billing result -> follow-up shortcut retains supplier and compatible previous answers without repeating answered questions. Direct follow-up entry asks missing facts only; no reload persistence is implied.
- [ ] Test branch changes clear incompatible downstream answers and update recommendations while preserving user edits separately. Never overwrite an edited draft when an answer changes.
- [ ] Test title focus, visible labels, radio/fieldset semantics, validation, Back/Next, and EN/ES copy/source-language distinctions.
- [ ] Implement the approved screens and result using the matcher, with real actions disabled for sample contacts and honestly labeled examples.
- [ ] Show branch-specific progress rather than forcing every need into Step 1 of 5. Precautions can finish after guidance.
- [ ] Run `npm test -- tests/help-matching.test.ts tests/needs-based-help.test.tsx tests/help-redesign.test.tsx` from `water-alert/`; update actual-behavior changelog in this batch.

### Task 4 — Scoped drafts, packets and external handoff

Future files: modify `src/RecoveryActions.tsx`, `src/recovery-drafts.ts`, `src/recovery-strings.ts`; create `tests/help-packets.test.ts`; preserve coverage in `tests/advisory-help.test.tsx`.

- [ ] Test all five existing template kinds remain available through relevant paths, not as an unrelated dropdown on every result. Add a distinct factual billing inquiry variant rather than misusing an advisory or expense template.
- [ ] Test per-template edits survive guide Back/Next and changing relevant template; reset only with explicit user action or declared context loss.
- [ ] Add an explicit scoped-packet API used by this flow; preserve legacy packet behavior for any remaining caller. Tests assert irrelevant AG/legal/expense sections are absent and required limitations remain.
- [ ] Test subject/body review, no fabricated facts, no assumed eligibility, no illness diagnosis, and no claims that an advisory proves personal outage dates.
- [ ] Test copy failure selects text without success claim, download-request wording, encoded mailto to verified intended recipient only, existing 8000-character fallback, and no sample phone/email targets.
- [ ] Test official forms open externally only; no automatic field filling or attachment transfer. AG privacy/mediation restrictions are visible before handoff.
- [ ] Run `npm test -- tests/help-packets.test.ts tests/advisory-help.test.tsx tests/needs-based-help.test.tsx` in `water-alert/`; date changelog for implemented behavior.

### Task 5 — Remove duplicate entry only after parity

Future files: modify `src/SupplierProfile.tsx`, `src/NoticeDetail.tsx`, `src/App.tsx` and, only if necessary, `src/components.tsx`; preserve `src/BoilWaterGuidance.tsx` content boundaries; update `tests/supplier-info.test.tsx`, `tests/help-redesign.test.tsx`, `tests/advisory-help.test.tsx`.

- [ ] Test every consolidation-map capability has an accessible replacement before removing Supplier details & tools and the independent recovery editor on NoticeDetail.
- [ ] Retain NoticeDetail itself and existing saved-notice/history navigation; no routing rewrite or removed authoritative incident evidence.
- [ ] Pass authoritative status/notice context to HelpGuide without rewriting source freshness or history logic.
- [ ] Preserve native help-section opening and Open guide focus restoration, exact origin page/notice, four independent collapsed sections, quick directory/tel/mailto shortcut, and standalone profile source link.
- [ ] Test linked historical notice never becomes current guide context; multiple records are not arbitrarily collapsed into one incident.
- [ ] Run affected tests and update only affected README usage plus dated actual-behavior changelog. No broad documentation cleanup.

### Task 6 — Guarded end-to-end review and acceptance

Future files: extend `water-alert/tests/e2e/journey.spec.ts`, retaining current network/external-action guards; inspect existing fixtures before adding minimal relevant scenarios.

- [ ] Exercise all four needs, matching decisions, unknown contact, missing email, sample, active/none/failed/stale/historical/multiple-record contexts, changed answers, and EN/ES.
- [ ] Test editor continuity, scoped packets, clipboard fallback and link targets without making real calls, sending emails, or opening a real submission flow.
- [ ] Inspect expanded layouts at 320/390px and desktop; keyboard-only completion, full email wrapping, visible focus, no overflow, no hidden focusable controls, reachable bottom actions.
- [ ] Use Node 24.x and run from `water-alert/`: `npm test`, `npm run build`, `npm run test:e2e`. The existing Playwright config uses a dedicated UI-only server on 5194; confirm the port is free and do not replace any existing process. Do not use `npm run dev` to restart the user's UI/API.
- [ ] Run `git diff --check`; compare only this task's changes against the starting dirty state. Report new results without treating previous suite counts as current verification.
- [ ] Review final screens with user. Do not deploy or claim measured health, time, or money savings.

## 7. Honest benefit hypothesis and validation

| Need | Current real-world work | Proposed assistance | Limits |
|---|---|---|---|
| Precautions | Find notice, identify applicable instructions, contact provider when unclear | Bring notice context and scoped guidance together | No diagnosis, proof of address coverage, or demonstrated health improvement |
| Service/quality | Decide who handles issue; find contact; explain facts | Relevant provider/ADH resource and optional factual inquiry | No dispatch, repair guarantee, or measured reduction in resolution time |
| Billing/credit | Find policy/contact; collect records; write request | Scoped checklist, verified contact when known, editable request | No automatic entitlement, payment guarantee, or demonstrated dollar saving |
| Unresolved | Reconstruct prior attempts; understand options | Follow-up preparation and relevant consumer/legal information | No automatic escalation, jurisdiction ruling, representation, or promised outcome |

Validate with task-based usability sessions using synthetic personal information: can users find the appropriate resource, distinguish general guidance from incident instructions, identify missing evidence, and understand that nothing was submitted? Measure completion and misrouting/understanding before making usability claims. Any claim of time reduction needs a comparable baseline task; money or health outcomes require separate evidence. Do not collect sensitive records or contact organizations as part of the design test.

## Approval requested

Review the overall needs-to-resources structure, then approve or annotate screen 1 before more screens are built. In particular: four choice labels; minimal branching questions; one tailored result rather than scattered links; optional drafts; no forced complaint/legal path; conservative source-backed matching.

**This approval concerns the design plan only. Production implementation and deployment require separate user authorization.**
