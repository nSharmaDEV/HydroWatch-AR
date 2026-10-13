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
