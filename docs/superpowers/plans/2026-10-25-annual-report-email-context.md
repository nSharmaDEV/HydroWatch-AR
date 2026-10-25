# Historical Report Findings in Provider Emails Implementation Plan

> **For agentic workers:** Implement inline from the user's requirement; no deployment.

**Goal:** Include reviewed annual-report findings with no corrective action listed in every generated Help email for the exact supplier, including already-saved drafts.

**Architecture:** Derive required findings only from the exact supplier's reviewed annual-report records; never match by name, county, or sample data. Preserve the agency report's wording, year/page and source citation, clearly label it historical, and do not imply current noncompliance or causation. Keep the existing HelpDraft schema unchanged and prevent Review controls from excluding required findings.

**Tech Stack:** React 19, TypeScript, existing annual-report evidence helpers, Vitest/Testing Library.

**Spec:** User request on 2026-10-25: findings like the two Leisure Hills report issues without a corrective action listed should be mentioned in all emails to the provider.

## Global Constraints

- Preserve all existing uncommitted user work; do not stage, commit, or deploy.
- Use exact reviewed supplier IDs and report records; synthetic sample mode never receives live report findings.
- Historical findings remain dated document evidence, not current safety/compliance assessments or proof of outage cause.
- Preserve existing edited email bodies and draft/schema compatibility.
- App implementation requires a dated Unreleased entry in `water-alert/CHANGELOG.md`.

---

### Task 1: Require historical report context in generated emails

**Files:**
- Modify: `water-alert/src/recovery-evidence.ts`
- Modify: `water-alert/src/help-flow.ts`
- Modify: `water-alert/src/RequestWorkspace.tsx`
- Modify: `water-alert/src/GuidedHelp.tsx`
- Modify: `water-alert/src/ReviewEmail.tsx`
- Test: `water-alert/tests/review-information.test.tsx`
- Update: `water-alert/CHANGELOG.md`

**Interfaces:**
- `reportEvidence(place, sample)` remains the source of exact-ID reviewed annual-report records.
- Add a helper returning the keys for reviewed findings whose source reports `issue.action.en === 'None listed'`.
- Keep the `HelpDraft` serialized shape unchanged; use report keys to repair required inclusion in existing fact lists.

- [ ] **Step 1: Add failing tests**

  Use the actual Leisure Hills system ID from `annual-reports.ts`. Assert that only its two findings with no corrective action listed are included by default; both source keys, report-year/page context and citations are present in generated English and Spanish email bodies; neither is phrased as current status or outage cause. Assert the findings remain included for service, billing and other email types; exact unrelated suppliers and sample mode do not receive them. Assert saved drafts with those facts unchecked are upgraded, while manual email edits remain intact.

- [ ] **Step 2: Run the focused test and verify RED**

  Run `npm test -- --run tests/review-information.test.tsx`. Expected: the new required-inclusion assertions fail because all historical facts currently start unchecked and service/billing/other filtering omits them.

- [ ] **Step 3: Implement exact-ID inclusion**

  Derive required keys only from reviewed records for the exact system where the report lists no corrective action. Mark those facts included when creating new drafts and repair their inclusion in saved fact lists, including legacy drafts, without changing stored schemas. Keep required keys in `relevantFacts` across issue types. Preserve the existing historical wording/source metadata and generated-email/manual-edit safeguards.

- [ ] **Step 4: Make required findings visibly non-optional in Review**

  Identify required report keys using the exact place and sample flag. Render them checked and non-removable/non-editable in the source-facts UI with bilingual copy that they are included as historical context; keep ordinary records' existing Include/Edit/Remove controls.

- [ ] **Step 5: Add the dated Unreleased changelog entry**

  State that report findings with no corrective action listed are included in generated messages for exact matching suppliers, with historical qualifiers and source references. Record local verification only and no deployment.

- [ ] **Step 6: Verify**

  Run `npm test -- --run tests/review-information.test.tsx tests/help-flow.test.ts tests/help-refresh.test.tsx tests/complaint-email.test.tsx`, `npm run build`, and `git diff --check`. Report any unrelated existing test failures separately; do not change them as part of this task.
