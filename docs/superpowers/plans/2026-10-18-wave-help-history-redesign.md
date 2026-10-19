# WAVE contact, history and guided-help redesign plan

**Status:** Proposed for approval; no application code changed in this audit.
**Goal:** Make contact information visible, history scannable, and getting help a guided task rather than a collection of disclosures and links.
**Architecture:** Keep source/status, archive matching, verified supplier IDs and recovery-draft generation authoritative. Redesign their presentation and add a guided entry point into the existing recovery tools, not a second draft engine or a complaint-submission backend.
**Stack:** Existing React/TypeScript/Vite; Node 24 for verification.
**Spec:** User feedback and three supplied screenshots, October 18, 2026.

## Audit results

- Re-ran all 44 guarded Playwright tests: passed. These include active/no-match/failed/stale/unchecked cards at 320, 390 and 1366px; keyboard disclosures; EN/ES interfaces; draft edit/copy/download/email-link/reload flows.
- Re-ran all 270 unit/integration tests across 36 files: passed.
- These are regression passes, NOT approval of the expanded layouts. Current geometry checks mostly cover closed cards. Add expanded-state visual checks before implementing this plan.
- Contact values are currently hidden behind generic labels/tooltips; <=420px hides those labels too. This does not satisfy the user's request for visible numbers/addresses.
- History repeats the provider name, spreads facts vertically, and renders repeated missing-value paragraphs. Provider help mixes facts, provenance, safety limits and navigation without task hierarchy.
- Draft-loss warnings currently describe loss on leaving/reloading/closing. They are informational copy, not an unsaved-changes confirmation dialog. Do not report them as a navigation blocker.
- English/Spanish UI regression tests pass; official source text and generated drafts can remain English with their existing explicit language labels. Fluent human Spanish review remains unverified.

## Design direction

Preserve the WAVE logo, navy/teal shell, sidebar, existing card width and state-specific status/actions. Use existing navy #102E43 and slate #334F60; reuse existing teal, amber and border tokens. Body/actions >=16px, supporting qualifications >=14px, touch targets >=44px. Left-align expanded content. No new decorative dashboard cards or nested accordion maze.

```text
[existing provider/status/check/source]
Contact your provider
  phone icon  (479) 549-2158
  mail icon   LEISUREHILLSWATERCO@GMAIL.COM
  ADH directory · checked date · source
[Get help or file a complaint]
Advisory history                              + / −
Provider information                          + / −
[existing complete safety qualification]
```

### 1. Visible contacts

Files: `water-alert/src/ProviderContact.tsx`, `water-alert/src/styles.css`, `water-alert/tests/provider-contact.test.tsx`, `water-alert/tests/wave-redesign.test.tsx`.

- Show the actual verified phone and email as visible linked text, not just accessible names or hover titles. Keep `tel:` and `mailto:` targets unchanged and matched by exact supplier ID.
- Use stacked contact rows on 320/390px; allow wrapping at desktop as necessary. Full values take priority over the previous compact horizontal bar. Never truncate an address or hide its text to fit.
- Use `overflow-wrap:anywhere` for long email addresses; retain a single link with the complete accessible name. Keep actual email casing/target from the verified record.
- Missing email becomes visible “No verified email available” / “No hay un correo verificado”, not an unexplained disabled icon. Unknown suppliers get the existing water-bill fallback. Sample records never borrow real contact details.
- Keep contact provenance nearby but quiet; directory contact does not mean staffed now or guaranteed response.

### 2. Rebuild expanded advisory history

Files: `water-alert/src/SupplierAlertHistory.tsx`, `water-alert/src/strings.ts`, `water-alert/src/styles.css`, existing supplier-history tests and `water-alert/tests/e2e/journey.spec.ts`.

- Retain the existing keyboard-operable parent disclosure and archive-only matching/status semantics.
- Opening history shows one compact scope note, then dated notice rows. Do not repeat the full uppercase supplier name in every row: the enclosing card already establishes it.
- Each row prioritizes status, agency-issued date, affected area and reason. Use a two-column definition grid on desktop and stacked label/value pairs on mobile, with consistent spacing.
- Put the unabridged supplied fields and observation metadata behind one per-notice “Notice details” control. Do not silently normalize ambiguous agency dates or change source wording.
- Missing lift date is explicitly unknown, never evidence that a notice remains active or was lifted. Group missing optional fields in the detail view instead of filling the main view with repeated “Not provided” paragraphs.
- Provide one prominent “Read official notice” link and a secondary “Open in WAVE” action. Preserve pagination, unknown/unconfirmed/lifted distinctions, archive-start limits and first/last observed evidence.

### 3. Replace provider-help content hierarchy

Files: `water-alert/src/components.tsx`, `water-alert/src/SupplierProfile.tsx`, `water-alert/src/ProviderContact.tsx`, `water-alert/src/strings.ts`, `water-alert/src/styles.css`.

- Rename the factual disclosure “Provider information” / “Información del proveedor”; help must not be buried inside it.
- Organize its contents as a short definition list for verified directory facts, followed by clearly named official-profile and annual-report links, then a compact source/checked/limits note.
- Avoid duplicate contact blocks and redundant provider-title paragraphs. Unknown metadata gets one clear empty state, never invented facts.
- Put the guided-help button directly on the supplier card, above the disclosures, so users do not have to discover “Supplier details & tools”. Preserve the existing detailed route as a secondary destination.

### 4. Guided “Get help or file a complaint” flow

Files: new `water-alert/src/HelpGuide.tsx` and `water-alert/src/help-guide-strings.ts`; integrate with `water-alert/src/App.tsx`, `water-alert/src/NoticeDetail.tsx`, `water-alert/src/RecoveryActions.tsx`; reuse `recovery-drafts.ts`, `recovery-resources.ts` and verified contact records.

Use a full-width in-app flow with a clear Back action, provider context and “Step X of Y”. Do not use a cramped nested disclosure or collect a new server-side complaint record.

1. **Choose what you need.** Large options: service interruption/notice questions; water-quality or health concern; billing/reimbursement complaint; legal help. Separate immediate help from complaint preparation. Immediate medical danger points to emergency services, not a complaint form; follow official notice instructions. No medical diagnosis.
2. **Find the right contact.** Show verified supplier phone/email immediately for operational issues. Water-quality/health concerns need a verified ADH drinking-water reporting route before that branch ships; do not route every issue to the AG or infer jurisdiction. Billing/service consumer disputes can offer AG consumer complaint preparation with scope explained. Legal help uses the existing legal-aid route without promising eligibility.
3. **Prepare your information.** Checklist: provider, service location, dates, what happened, prior contact attempts, desired resolution, copies of relevant bills/receipts/notices. Reuse the existing editable templates and preparation-packet generation. Do not require sensitive identity/account information in WAVE. Preserve all five existing draft kinds and per-template edits.
4. **Review and continue externally.** Copy/download preparation; choose the official online form or English/Spanish PDF. Say “Open official complaint form”, never “Submit complaint” inside WAVE. Warn that the AG shares complaints with the business and records may be publicly disclosable; use official wording/context. Opening the external page is not proof of filing.
5. **Know what happens next.** Ask users to save the agency's confirmation/reference themselves; give follow-up and legal-help options. Explain that the AG decides jurisdiction and mediation eligibility. No fabricated case status, response deadline or guarantee of fast resolution.

Source check on October 18: https://arkansasag.gov/file-a-complaint/ offers an online form, English/Spanish PDFs, and phone (501) 682-2007 for requesting a paper form. It says mediation updates may take 30–40 days; do not label this urgent assistance. https://health.arkansas.gov/Eng/WS.aspx?ID=747 currently confirms the supplier phone (479) 549-2158. The existing email record was checked October 14; this audit's extracted ADH text did not independently expose the email, so retain its actual provenance date rather than claiming a fresh email verification.

### 5. Draft continuity and accessibility

- Keep templates session-only and explicit about their English content. Back/Next within the guide retains edits; copy/download continues to operate locally. Never silently add browser/cloud persistence.
- Retain visible draft-loss warnings near the editor and before external handoff. If adding confirmation on destructive in-app navigation, test Stay/Leave and preserve edits on Stay; this is new behavior, not an existing guarantee. Reload/close protection must not be promised without implementation and browser validation.
- Parent disclosures: Enter/Space, correct `aria-expanded`/`aria-controls`, +/− indicators and visible focus. Native details retain native semantics. Guide changes move focus to the step heading; Back/exit restores a sensible trigger. No focusable controls inside hidden sections.
- Translate all new UI and guidance EN/ES; do not translate actual phone numbers, email addresses or source quotations. Preserve explicit English-only draft/source labels and existing language-change loss warnings.

## Execution and acceptance gates

- [ ] Write failing tests first for visible contact values, missing contacts, expanded-history hierarchy and direct guide entry. Preserve existing network/no-send guards.
- [ ] Implement contacts and expanded disclosures; review actual screenshots at 320/390/1366px in both languages, including long addresses and multiple notices. Check no clipping, horizontal overflow or bottom-nav-obscured reachable content.
- [ ] Verify official ADH reporting route and current complaint/legal-help destinations; record source, check date, scope and hours only when published. Do not ship unverified urgent-routing claims.
- [ ] Implement guide using existing draft helpers; test every branch, Back/Next/exit, five templates, per-template edits, copy/download packets, mailto recipient restrictions and sample separation.
- [ ] Test keyboard-only expanded layouts and guide, draft-loss messaging and any newly implemented Stay/Leave confirmations. Test language switching explicitly, including declared loss behavior.
- [ ] Run Node 24 unit suite, guarded Playwright suite and production build; inspect expanded-state screenshots, not only geometry assertions. Run `git diff --check`. Update only affected README/dated Unreleased changelog after actual implementation; do not claim this plan is shipped.

No deployment, real calls/emails, form submissions, source-status changes, new persistence or automatic jurisdiction decisions are authorized by this plan. Preserve unrelated dirty work.
