# Observation Step Reflow Implementation Plan

> **For agentic workers:** Implement inline from the approved wireframe; no deployment.

**Goal:** Reflow the resident observation step to match `docs/wireframes/wave-observation-screen-wireframe.html` while preserving existing draft behavior.

**Architecture:** Keep the current React controls and move their containers in `GuidedHelp.tsx`; use scoped rules in `requests.css` for the desktop grid and mobile stack. Do not alter draft schemas, upload handling, provider data, or navigation.

**User refinement:** On this observation step, remove the provider-contact panel and its emergency/CDC guidance, remove the location-difference and prior-provider-contact controls, combine observations and attachments, and expand the details card. Keep existing saved answer data and all unrelated provider/safety surfaces unchanged.

**Tech Stack:** React 19, TypeScript, existing CSS, Vitest/Testing Library, Vite.

**Spec:** `docs/wireframes/wave-observation-screen-wireframe.html`

## Global Constraints

- Preserve existing uncommitted user work; do not reset, stage, commit, or deploy.
- Keep English and Spanish labels and current accessibility semantics.
- Preserve draft field values and file controls/limits; keep provider provenance and safety guidance unchanged outside this observation step.
- App implementation requires a dated Unreleased entry in `water-alert/CHANGELOG.md`.

---

### Task 1: Reflow observation step

**Files:**
- Modify: `water-alert/src/GuidedHelp.tsx`
- Modify: `water-alert/src/requests.css`
- Test: `water-alert/tests/help-wireframes.test.tsx`
- Update: `water-alert/CHANGELOG.md`

**Interfaces:**
- Keep `GuidedHelp` props and step/draft behavior unchanged.
- Keep `ResidentFollowups`, `ConfirmedWording`, `RequestPrompts`, `ProviderContact`, and attachment controls as the existing sources of behavior.

- [x] Add regression tests asserting attachments share the observations panel; location/prior-contact questions and the provider/safety panel are absent; billing details remain; description and frequency controls use the details panel.
- [x] Run the focused test and verify it fails because the current grouping does not match the wireframe.
- [x] Reorganize the experience-step JSX and add scoped responsive CSS; retain two primary panels and stack them on mobile.
- [x] Add the dated Unreleased changelog entry.
- [x] Run focused tests and build; inspect desktop and mobile browser layouts.
