# Useful Advisory Information Implementation Plan

**Backend follow-up:** After the checkpoint below, the user authorized repairing the missing store module. That blocker is resolved; all 210 tests and the full TypeScript/Vite build pass locally under Node 24. No deployment occurred.

> **For agentic workers:** Original implementation checklist; the user subsequently approved local implementation. Core supplier tools are now present. No deployment is authorized. Remaining unchecked steps are not a claim of completion.

**Local checkpoint (October 14):** Contact-first detail view, editable drafts, copy/download/encoded email handoff, preparation packs, exact history navigation, verified Leisure Hills profile and CDC reference are implemented. 53 targeted UI tests and actual-app sample download/responsive checks pass; Vite bundling passes. Full-suite/TypeScript verification remains blocked by the unrelated empty `water-alert/server/store.ts`, left untouched. Before release, resolve that blocker and complete remaining regression/release gates. Implementation uses `recovery-drafts.ts`, `RecoveryActions.tsx`, `SupplierProfile.tsx`, `BoilWaterGuidance.tsx`, `recovery-resources.ts` and `recovery-strings.ts` rather than every proposed module below.

**Goal:** Put provider contacts and actionable credit/reimbursement, complaint and legal-help routes before Water Alert's detailed notice facts, while preserving honest status and clearly attributed guidance.

**Architecture:** Keep the two live feeds and all persistence unchanged. Add curated reference modules for CDC and consumer/legal-help contacts, with separate presentation components; reuse exact-ID provider contacts and existing status logic. Connect history articles to their exact retained notices rather than treating old records as current. No legal case evaluation, claims submission or evidence storage.

**Tech Stack:** Existing React 19, TypeScript, Vite, Vitest, Testing Library and Playwright on Node 24; no new dependencies.

**Spec:** [Design specification](2026-10-14-advisory-help-design.md) · [Interactive wireframe](../../wireframes/advisory-help.html)

## Global constraints

- Keep `Notice`, `SourceSnapshot`, API response, storage and parser schemas unchanged.
- The three current finding states remain unchanged. “Lifted” is a historical agency event, not a fourth current safety state.
- General guidance is a curated reference, not a third live feed and never `Notice.guidance`.
- Official source text remains verbatim in its source language.
- No live contact action in sample mode, no contact inference for unknown providers, no success/delivery claims from clicking phone/email.
- Below 760px use one column; at 320px retain readable 16px body text and no horizontal page scrolling. Touch targets are at least 44px.
- Preserve existing ADEQ behavior and the current unavailable/stale/unknown-lift rules, including the 900-second freshness cutoff.
- Preserve existing uncommitted work. Do not commit, deploy, send notifications or publish without authorization.
- Every app implementation batch must add a truthful dated entry under `water-alert/CHANGELOG.md` Unreleased. Until then these documents are proposed work only.
- Contacts and recovery/legal-help steps precede detailed notice facts; compact current-status warning and official link stay first. An advisory alone never establishes liability or guaranteed compensation.

## Existing implementation map

| Existing file | Relevant responsibility |
| --- | --- |
| `water-alert/src/domain.ts` | `statusFor(placeId, source, now)` decides freshness/current finding |
| `water-alert/src/SupplierAlertHistory.tsx` | Screenshot surface; retained ADH/boil/exact-place/exact-source filtering; six-item paging; no sample prop today |
| `water-alert/src/NoticeDetail.tsx` | Full page; linked notices already appear historical; incident guidance gap today |
| `water-alert/src/components.tsx` | `StatusCard` supplier path lacks direct full-detail action; `onView` already exists; modal/SourceLink/DateRow |
| `water-alert/src/App.tsx` | `selected`, `linkedId`, `navigate`; current linked-notice resolution excludes sample mode |
| `water-alert/src/ProviderContact.tsx` | Exact-ID curated phone/email; suppresses real sample/lake contacts |
| `water-alert/src/provider-contacts.ts` | Reuse only, no planned changes |
| `water-alert/src/supplier-display.ts` | Existing conservative area and issue display formatting |
| `water-alert/src/strings.ts`, `supplier-alert-strings.ts` | Existing string composition and history copy |

### New files

- `water-alert/src/boil-guidance.ts`: verified source metadata and excerpt data.
- `water-alert/src/advisory-help.ts`: presentation-context selector and types.
- `water-alert/src/advisory-help-strings.ts`: paired EN/ES labels, disclaimers and qualifiers.
- `water-alert/src/BoilWaterGuidance.tsx`: reference presentation only.
- `water-alert/src/recovery-resources.ts`: checked AG/Law Help/small-claims contact metadata, reference-only; not added to `SOURCES`.
- `water-alert/src/RecoveryActions.tsx`: contact-first request/evidence/complaint/legal-help block, consumes place/language/sample; reuses `ProviderContact` once.
- `water-alert/src/recovery-strings.ts`: EN/ES recovery steps and legal/privacy limitations; no translated legal claims.
- `water-alert/tests/recovery-actions.test.tsx`: order, exact destinations, sample suppression, no uploads or promises.
- `water-alert/src/recovery-drafts.ts`: deterministic request/follow-up/complaint/intake templates and preparation packet from selected notice, with no invented personal facts.
- `water-alert/src/RecoveryDrafts.tsx`: local editor, copy/download and live-only exact-contact email composition; no persistent storage.
- `water-alert/tests/recovery-drafts.test.ts`: exact notice binding, placeholders, email encoding and export content.
- `water-alert/tests/recovery-drafts-ui.test.tsx`: edit retention, clipboard success/failure, downloads, missing email/sample boundaries.
- `water-alert/tests/advisory-help.test.ts`: context gating and source-data contract.
- `water-alert/tests/boil-guidance.test.tsx`: component provenance, disclosures, language.
- `water-alert/tests/advisory-help-ui.test.tsx`: full detail and current/history navigation.
- `water-alert/tests/browser-advisory-help.mjs`: browser evidence, following existing standalone browser scripts.

### Modified files

`NoticeDetail.tsx`, `SupplierAlertHistory.tsx`, `components.tsx`, `App.tsx`, `strings.ts`, `supplier-alert-strings.ts`, `styles.css`; affected existing tests; `README.md`, `CHANGELOG.md`, `docs/GOAL-advisory-alert.md`. Update Sources & Limits in `App.tsx` to name CDC's reference-only role without presenting it as a polled agency feed.

## Task 1 — Curated guidance and conservative context selector

**Files:** Create `src/boil-guidance.ts`, `src/advisory-help.ts`, `tests/advisory-help.test.ts` beneath `water-alert/`. Update required changelog for this batch.

**Interfaces:**

```ts
import type { Notice, Place, SourceSnapshot } from './domain'
export type GuidanceContext = 'current' | 'reference' | 'hidden'
export interface AdvisoryHelpInput {
  place: Place
  source?: SourceSnapshot
  now: number
  linkedNotice?: Notice
}
export function guidanceContext(input: AdvisoryHelpInput): GuidanceContext
// boil-guidance.ts exports BOIL_GUIDANCE with:
// url, title, publishedOn, verifiedOn, sections: [{ id, title, paragraphs: string[] }]
```

- [ ] Read the spec and re-fetch CDC/ADH source pages. Compare every excerpt and date against spec section 2; if changed, revise the proposed wording and source record before implementation. Do not infer restoration estimates.
- [ ] Write selector and provenance tests. Use the fixture below, plus table-driven cases for stale, failure, missing source, no active, explicit lift, linked old notice, ADEQ, wrong-agency record, and `liftStatus: 'unknown'`.

```ts
import { expect, it } from 'vitest'
import { guidanceContext } from '../src/advisory-help'
import { SOURCES, type Notice, type SourceSnapshot } from '../src/domain'
const place = { id: 'ADH:help-test', name: 'Sample supplier', county: 'Benton', kind: 'system' as const }
const now = Date.parse('2026-10-14T20:20:00Z')
const n: Notice = { id: 'test-order', placeId: place.id, name: place.name,
  county: 'Benton', agency: 'ADH', kind: 'boil', area: 'Entire system',
  reason: 'Synthetic outage', issued: '10/14/2026 3:12:14 PM', lifted: null, url: SOURCES.ADH }
const source: SourceSnapshot = { agency: 'ADH', records: [n],
  retrievedAt: '2026-10-14T20:19:00Z', lastSuccessAt: '2026-10-14T20:19:00Z', error: null }
it('offers current guidance only for a fresh matching ADH boil record', () => {
  expect(guidanceContext({ place, source, now })).toBe('current')
  expect(guidanceContext({ place, source: { ...source, error: 'Timeout' }, now })).toBe('reference')
  expect(guidanceContext({ place, source, now, linkedNotice: n })).toBe('reference')
  expect(guidanceContext({ place: { ...place, kind: 'lake' }, source, now })).toBe('hidden')
})
it('treats exactly 900 seconds as stale', () => {
  expect(guidanceContext({ place, source: { ...source,
    lastSuccessAt: new Date(now - 900_000).toISOString() }, now })).toBe('reference')
})
```

- [ ] Run `npm test -- tests/advisory-help.test.ts` from `water-alert/`; verify failure is from missing implementation, not environment/setup.
- [ ] Implement `guidanceContext`: return hidden for non-system; return reference for any linked notice; otherwise call existing `statusFor` and require `source.agency === 'ADH'`, active finding and a matching ADH/boil official-URL record with no lift/unknown-lift. Else reference. Never independently implement freshness.
- [ ] Export `BOIL_GUIDANCE` using the exact seven excerpts in spec section 2; ID values `action`, `boiling`, `filters`, `food`, `teeth`, `bathing`, `pets`; page date `2024-03-04`; verification date is actual recheck date. Tests compare exact excerpt strings, canonical HTTPS URL and date fields; no network calls in tests.
- [ ] Rerun tests and inspect the diff. Acceptance: a reason containing “power outage” never becomes a water-safety diagnosis; guidance context cannot mutate source records or status.

## Task 2 — Accessible reference block and language boundary

**Files:** Create `src/advisory-help-strings.ts`, `src/BoilWaterGuidance.tsx`, `tests/boil-guidance.test.tsx`; modify `src/strings.ts` only to compose the new string records; update changelog.

**Consumes:** `BOIL_GUIDANCE`, `GuidanceContext`, `Language`.

**Produces:**

```ts
export function BoilWaterGuidance(props: {
  context: GuidanceContext
  language: 'en' | 'es'
}): React.JSX.Element | null
```

- [ ] Write rendering tests for `current`, `reference`, `hidden`, EN/ES chrome, `lang="en"` quotations, external CDC link and both source dates. Assert the reference version uses a closed native `<details>` and the current version exposes main action, boiling, food and teeth without a click. Assert there are no call/email/share/push actions in this component.

```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { BoilWaterGuidance } from '../src/BoilWaterGuidance'
it('keeps reference guidance collapsed and attributed', () => {
  render(<BoilWaterGuidance context="reference" language="en" />)
  const summary = screen.getByText('General boil-water information', { selector: 'summary' })
  expect(summary.closest('details')).not.toHaveAttribute('open')
  expect(screen.getByRole('link', { name: 'Read CDC guidance', hidden: true }))
    .toHaveAttribute('href', 'https://www.cdc.gov/water-emergency/about/drinking-water-advisories-an-overview.html')
  for (const quote of document.querySelectorAll('blockquote')) expect(quote).toHaveAttribute('lang', 'en')
})
```

- [ ] Run `npm test -- tests/boil-guidance.test.tsx`; confirm red.
- [ ] Implement one shared block body: source qualifier, action quote, sections, metadata and link. Hide entirely for hidden; wrap the shared body in closed details for reference. Current uses expanded section with `aria-labelledby`/`useId`. Put filters/bathing/pets in native disclosures; no controlled animated accordion.
- [ ] Use EN labels **“What to do now”**, **“General CDC boil-water guidance”**, **“General boil-water information”**, **“English original source text”**, **“Read CDC guidance”**. Use ES labels **“Qué hacer ahora”**, **“Recomendaciones generales de los CDC para avisos de hervir el agua”**, **“Información general sobre avisos de hervir el agua”**, **“Texto original de la fuente en inglés”**, **“Leer las recomendaciones de los CDC”**. Localize the non-incident qualifier and date labels; never auto-translate the quotations.
- [ ] Run component/selector tests. Acceptance: general material cannot be confused with `Notice.guidance`, and no excerpt silently loses the altitude/cooling caveats.

## Task 3 — Full detail hierarchy and provenance

**User-revised subtask: contact-first recovery actions (complete before detail integration).**

**Files:** Create `src/recovery-resources.ts`, `src/RecoveryActions.tsx`, `src/recovery-strings.ts`, `tests/recovery-actions.test.tsx`. Export `RecoveryActions({ place, language, sample }: { place: Place; language: 'en' | 'es'; sample: boolean }): React.JSX.Element | null`; hide for non-system places. Use spec section 2's exact URLs/phones and actual verification date, separately from original source dates.

- [ ] Write component tests and run `npm test -- tests/recovery-actions.test.tsx` red before implementation. Verify one provider contact block, toolkit before collapsed explanations, exact AG and Law Help links/visible phone numbers, qualified $5,000 limit, complaint sharing/public-record warning and AG's attorney/court-action mediation limitation. Verify unknown supplier fallback, no HAB block, no `tel:`/`mailto:` in sample mode, no uploads/submission or payout claim. Add a detail test comparing DOM order: compact current warning, recovery/toolkit block, detailed facts, CDC guidance.
- [ ] Implement static app-authored steps from spec and wireframe: ask for policy/deadline/case number/written decision; retain original notices/bills/receipts privately; external AG complaint route; legal help before deciding to sue. Never determine defendant, liability, eligibility, deadlines or immunity. Real verified public phone links may be enabled in live mode, but all contact calls remain disabled in sample mode. AG/Law Help are resources, not guaranteed providers of representation or compensation.
- [ ] Rerun recovery tests green; add metadata/source disclosure and required changelog. Re-fetch all references before finalizing; request human legal-copy/Spanish review before release. Do not add APSC without verified exact-provider jurisdiction.

**Second user revision: executable draft toolkit, not advice generation.** Complete in this task after the resource component, before full detail integration.

**Files:** Create `src/recovery-drafts.ts`, `src/RecoveryDrafts.tsx`, `tests/recovery-drafts.test.ts`, `tests/recovery-drafts-ui.test.tsx`; compose into `RecoveryActions`. Keep copy/download helpers focused and local; no API or storage changes.

**Interfaces:** `DraftKind = 'request' | 'followup' | 'complaint' | 'legal'`; `buildRecoveryDraft({ kind, notice, sample }: { kind: DraftKind; notice?: Notice; sample: boolean }): { subject: string; body: string }`; `buildPreparationPacket({ draft, notice, sample }: { draft: { subject: string; body: string }; notice?: Notice; sample: boolean }): string`. `RecoveryDrafts` consumes place, exact selected notice (optional), mode, language and curated contact (optional); local reviewed edits keyed by mode/place/notice ID/kind/language. Source facts are published context, not personal experience. Use separate subject and body in production even though the preview's text editor includes both.

- [ ] Write failing pure tests for all four deterministic templates, exact archived ID/source/area/date binding, no incident facts when missing, unknown contact, non-ASCII draft content and sample labels. Personal names, interruption dates, expense amounts, receipts and allegations stay placeholders. Verify `buildPreparationPacket` contains the reviewed draft unchanged, source context, checklist and blank expense/contact logs, with no attachments or automatic claims.
- [ ] Write failing UI tests: edits survive template switching; copy exactly reviewed text; clipboard rejection offers selection/manual copy; `.txt` download uses a Blob and preserves reviewed text; no network/analytics/storage writes on editing/copy/download. Test known verified email encoding via `encodeURIComponent`, no compose for sample/unknown/missing email, oversized message fallback to copy/download and no delivery claim. Do not trigger an actual email client from a test.
- [ ] Run `npm test -- tests/recovery-drafts.test.ts tests/recovery-drafts-ui.test.tsx` red. Implement minimal templates using the wireframe toolkit's reviewed wording and spec boundaries, keeping selected notice context separate from user facts. Add direct AG online/EN PDF/ES PDF, legal-aid intake and court-forms links from spec; do not prefill external forms using personal-data URLs or copy their submission logic.
- [ ] Render toolkit before explanatory advice, with visible privacy/language caveats, labelled editor controls and status messages. In live mode only, “Open email draft” uses the exact curated provider email; fallback is copy/download. No actual email is sent by Water Alert. Sample local exports remain explicitly labelled sample; phone/email actions remain disabled. No evidence upload, auto-attachment, generated pleading or deadline calculator.
- [ ] Rerun tests green, then browser-check clipboard success/fallback and downloaded file contents at 320/390/768/1280. Keep current status/official link immediately reachable. Add dated changelog; document local-memory loss on reload, external privacy, reviewed-English-template limitation and no-submission behavior.

**Files:** Modify `src/NoticeDetail.tsx`, `src/styles.css`, `src/advisory-help-strings.ts`; create `tests/advisory-help-ui.test.tsx`; extend existing provider-contact and ADEQ tests where needed; update changelog.

**Consumes:** `guidanceContext`, `BoilWaterGuidance`, existing `ProviderContact`, `supplierArea`, `SourceCheckHistory`, `DateRow`.

**Produces:** Existing `NoticeDetail` API unchanged; one general reference block per page, consistent current versus historical qualification.

- [ ] Write detail tests using Task 1 fixtures. Test active-without-incident-guidance, valid incident guidance plus separate general block, malformed incident-guidance provenance, failed/stale source with retained record, never checked, no active notice, linked lifted and linked unconfirmed record, multiple partial-area records, unknown contact, sample and HAB. Validate incident guidance only when quote and URL are nonblank and verifiedAt is a finite explicit-offset instant, matching history's provenance rules.
- [ ] Add assertions that original agency dates remain exact strings; a last attempt is never labelled last success after failure; no ETA/duration is generated; `sourceUpdatedAt` and app observation times stay in disclosures. In multiple-notice cases, assert each incident area and instruction stays with its own record.
- [ ] Run `npm test -- tests/advisory-help-ui.test.tsx tests/provider-contact.test.tsx tests/adeq-cards.test.tsx`; confirm new expectations fail before editing implementation.
- [ ] Restructure detail per revised spec section 3. Keep compact current finding/official link first, then `RecoveryActions`, then detailed area/bill-match facts and distinct incident/general guidance. Remove the old standalone provider contact to avoid duplication. Show no-lift wording appropriate to selected record. In historical context retain current finding as a separate, labelled summary, not the selected notice's status.
- [ ] Add scoped `.advisory-help-*` CSS using existing tokens; single-column mobile, existing 760px breakpoint, `min-width:0`, wrap long values, no fixed-height content, native disclosure focus styles. Avoid changing unrelated card/modal typography.
- [ ] Rerun targeted tests plus `npm test -- tests/source-check-ui.test.tsx tests/supplier-info.test.tsx`. Fix semantic assertions rather than replacing tests with snapshots. Acceptance: source failure remains primary even when old content and general advice are available.

## Task 4 — Reachable current detail and exact archived-notice navigation

**Files:** Modify `src/SupplierAlertHistory.tsx`, `src/components.tsx`, `src/App.tsx`, `src/supplier-alert-strings.ts`; extend `tests/advisory-help-ui.test.tsx`, `tests/supplier-alert-history.test.tsx`, `tests/App.test.tsx`; update changelog.

**Interfaces:** Add optional `sample?: boolean` and `onViewNotice?: (notice: Notice) => void` to `SupplierAlertHistory` and optional `onViewNotice?: (notice: Notice) => void` to `StatusCard`. Preserve existing callers. App passes `sample` through `StatusCard` to history and a callback for exact notice navigation.

- [ ] Write integration tests: clicking the supplier's new “What to do / notice details” action opens current detail; clicking “View this notice” in an old record opens that record's ID even when a newer order exists. Test live and sample modes and supplier-switch resets. Do not create a new deep-link URL format.
- [ ] Test the old-notice/new-current case explicitly: old issue/area remains selected; newer active state appears only in its separately labelled current finding; returning home reveals current cards. Simulate a refresh changing archive availability and ensure the selection does not silently swap to the new order.
- [ ] Run new integration tests and existing history tests to confirm red.
- [ ] In App, use existing `selected`/`linkedId` state; resolve `linkedNotice` from the active mode's `archive` instead of live-only lookup. Leave URL `?notice=` ingestion live-only. Callback: setSelected(notice.placeId), navigate('detail'), then setLinkedId(notice.id). Retain unresolved-selection message if a selected archived ID is no longer present; do not silently substitute `status.records`.
- [ ] Pass callback via `StatusCard`; history renders the new button only when callback exists. Keep current card `onView` entry point independent. Keep real provider actions sample-suppressed and never add a phone inside history articles.
- [ ] Replace missing lift/guidance strings contextually per spec. Update tests asserting missing-row counts to instead assert each field's actual meaning; preserve original field-absence assertions for area/reason/issued.
- [ ] Rerun `npm test -- tests/advisory-help-ui.test.tsx tests/supplier-alert-history.test.tsx tests/App.test.tsx tests/provider-contact.test.tsx tests/journey.test.tsx`. Acceptance: exact selection, six-item paging, official-source filtering, failure state and mode isolation all remain intact.

## Task 5 — Browser verification, source disclosure and handoff

**Files:** Create `tests/browser-advisory-help.mjs`; modify `src/App.tsx` Sources & Limits copy, `README.md`, `CHANGELOG.md`, `docs/GOAL-advisory-alert.md`.

**Consumes:** Completed UI and tests; existing standalone Playwright-script pattern in `tests/browser-provider-contact.mjs`. Produces: repeatable browser checks and truthful documentation, no deployed claim.

- [ ] Document the approved reference-only exception in the goal's constraints: ADH/ADEQ remain the only live advisory feeds; CDC and AG/Arkansas Law Help are curated reference resources with their own dates and limitations. If the design has not been approved for implementation, stop before modifying this constraint.
- [ ] In Sources & Limits add CDC URL, page date, verification date and “general guidance, not a live advisory feed or incident-specific instructions.” Also add AG/Law Help/small-claims sources and checked dates, complaint privacy/mediation limits and no-guaranteed-payment/representation wording. Do not add references to `SOURCES` or source freshness checks.
- [ ] Build browser fixtures locally/intercept API responses for all state-table rows. Use only synthetic suppliers/notices. Verify current/history navigation and template editing/copy/download at 320, 390, 768 and 1280px; long names, unknown contact, multiple areas and ES labels. Assert `document.documentElement.scrollWidth <= window.innerWidth` in each viewport. Read actual download bytes and test clipboard rejection, not just click success.
- [ ] Verify keyboard Tab, Enter/Space disclosures, back navigation and preserved info-modal Escape/focus return. Exercise exact archived record, latest-attempt versus last-success labels, sample no-contact behavior and HAB no-boil-guidance. Capture active mobile, active desktop, failure and history views; inspect the images.
- [ ] Run from `water-alert/`: `npm test`, `npm run build`, and `node tests/browser-advisory-help.mjs` against the local server. Record actual counts/outcomes; do not claim delivery or production verification from these tests.
- [ ] Update README with current-detail/history routes and reference/source-language limitations. Add dated Unreleased summary distinguishing local testing from deployment. Recheck CDC excerpts one final time; record actual check date. Seek human Spanish review; if unavailable disclose it as a release limitation.
- [ ] Review `git diff --stat` and affected files. Confirm no schemas, parsers, new runtime dependencies, actual contact values or notification config changed. Leave all unrelated user changes untouched. Present evidence and request separate deployment authorization only if the user asks to release.

## Coverage checklist for review

| Requirement | Tasks |
| --- | --- |
| Practical sourced instructions, caveats and separate incident guidance | 1, 2, 3 |
| Contact-first reimbursement steps, complaint route, legal aid and qualified small claims; no legal case evaluation/evidence storage | 3 revised subtask, 5 |
| Editable deterministic drafts, direct official forms/intake, copy/download/preparation packet, exact email fallback and no automatic send | 3 second revision, 5 |
| Exact supplier contact and unknown/sample fallback | 3, 4, 5 |
| Current/failure/stale/never/no-active/historical/unknown-lift states | 1, 3, 4, 5 |
| Screenshot history improvement and exact-record navigation | 4 |
| Multiple areas, dates, no inferred lift/ETA | 3, 4 |
| ADEQ unchanged and no boiling instructions for lakes | 1, 3, 5 |
| EN/ES chrome, original-language sources and accessibility | 2, 3, 5 |
| Sources & Limits, two-live-source exception, docs and changelog | 5; changelog each implementation batch |

**Handoff:** Review the wireframe before implementation. No implementation, commit or deployment is included in the current planning request.
