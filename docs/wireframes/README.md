# Water Alert — wireframes (static design)

Static, synthetic wireframes for the **resident water-advisory alert** app
(working name TBD). This is design, **not shipped UI** — no live data, no logic.

Open it:

```sh
cd docs/wireframes && python3 -m http.server 8771
# then http://localhost:8771/advisory-alert-wireframes.html
```

## The one rule every screen protects

The app **only mirrors what an official agency published**, and it never turns the
*absence* of a notice into a claim of safety.

Sources:
- ADH boil-water order list — `health.arkansas.gov/wa_engTraining/boilwaterorder.aspx` (HTML table)
- ADEQ HAB advisories — `adeq.state.ar.us/water/planning/hab/advisories.json` (JSON feed; the page HTML is a JS shell)

## Three honest states, always

| State | Meaning | Never means |
|---|---|---|
| **Active** | An agency record is currently active for the chosen place | — |
| **No active advisory found** | Both sources checked, nothing active | *safe* |
| **Data unavailable** | A source failed or can't be reached | *all clear* |

A blank "date lifted" means the notice is **still active**. Partial-area notices are
shown as written, never narrowed to an address.

## Screens in this set

### Proposed advisory-help flow (October 14, 2026)

[`advisory-help.html`](advisory-help.html) is a separate interactive, synthetic
design preview for richer **Water Alert** advisory information. It covers full
detail and expanded history, general CDC guidance clearly separated from
incident instructions, provider-contact fallbacks, active/unavailable/stale/
not-yet-checked/no-active/lifted/historical/sample/HAB scenarios, EN/ES interface
labels and light/dark inspection. Actions are simulated; no real call, email,
share or notification is sent. ADH/CDC reference links are real external links.
Official quoted guidance stays in English with language markup.

The revised detail puts provider contact and an actionable toolkit before the
detailed notice panels: four editable English templates (request, follow-up,
AG complaint and legal intake), working copy/text-download buttons, preparation
pack with checklist/expense/contact logs, and direct official complaint/PDF/
legal-aid application/court-form links. Explanatory advice is collapsed.
Edits are tab-memory only; reload/close loses them. Use synthetic information.
Copy/download saves text to your device but never sends, files or attaches it.
Public-resource phone numbers are visible, but calls are not launched from this
preview. Compensation and legal liability are not guaranteed; complaint privacy
and legal-aid limits remain explicit. Spanish interface labels do not imply
verified Spanish legal templates; the official Spanish AG PDF is linked.

`advisory-help-toolkit.js` owns the local draft/export interactions.
With the repository-root server running, test the preview using
`node docs/wireframes/advisory-help.test.mjs` (uses the installed Playwright in
`water-alert/`). This checks real copy/download contents, edit retention,
responsive layouts and sample/HAB boundaries; it does not test the working app.

To keep the linked planning documents accessible, serve the repository root
with `python3 -m http.server 8771 --bind 127.0.0.1`, then open
`http://127.0.0.1:8771/docs/wireframes/advisory-help.html`. See the
[design specification](../superpowers/plans/2026-10-14-advisory-help-design.md) and
[implementation plan](../superpowers/plans/2026-10-14-advisory-help.md).
This preview is not shipped UI and does not change the existing app.

### Original whole-app atlas

0. **Notifications** — iPhone lock screen (notice active + lifted), in-app banner, permission + iOS "Add to Home Screen" note
1. **Set your water** — search town/system/lake · ambiguous → choose · private-well path
2. **Home / status** — all three states side by side
3. **Active advisory detail** — record fields verbatim + the agency's own next steps (boil notice + HAB)
4. **History** — "new since your last check" + observed per-county pattern
5. **Browse all Arkansas** — NWA-first, map + list, two official classes kept separate
6. **Sources & limits + privacy** — what is mirrored, retrieved when, and what is never claimed
7. **Sample mode** — clearly-labelled demo data for filming; never a fallback for a failed source
8. **Spanish** — key screens (status, detail, next steps, alerts)

## Labels used in this file

- State/badge colors: **Active** (orange) · **No active found** (slate) · **Data unavailable** (violet, dashed) · **Sample** (gold)
- Color is never the only signal — every state has its own word and shape.
- `[NEEDS: ...]` marks a fact that must be mirrored verbatim from the agency before shipping
  (e.g. ADH's exact boil-water wording).

## What this set deliberately does NOT include

No prediction, no bloom/toxin detection, no "safe," no medical advice, no app-authored
guidance, no account, no claim about private well-water quality.
