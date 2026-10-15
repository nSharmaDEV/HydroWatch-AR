# Goal — Water Alert (resident water-advisory alert app)

Status: local live ADH/ADEQ parsing, sample journey, durable change journal, per-device visit changes and opt-in PWA push implementation in `water-alert/`; sending disabled by default and real delivery gated.
See `water-alert/README.md` for verified capabilities and remaining gates. Working name **TBD**.
Branch `advisory-alert` · worktree `/Users/nirmay/Documents/advisory-alert` (off `d406832`).

The resident explicitly chooses their public water supplier and/or lake. A town name
does not establish the supplier; private wells are outside notice coverage. The intended
app watches two official sources and implements alerts on verified changes (host/configuration and real device delivery unverified):

- ADH boil-water list: https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx (server-rendered GridView1 HTML)
- ADEQ HAB advisories feed: https://adeq.state.ar.us/water/planning/hab/advisories.json
  (page default.aspx is a JS shell; empty raw HTML is NOT an empty feed)

## Required outcomes

1. Live ingestion via a small **serverless proxy** (browser can't fetch these cross-origin).
   Both sources parsed from recorded offline fixtures.
2. A **place resolver** that maps the resident's town/lake to the correct water SYSTEM or
   waterbody, handling name aliases and partial-area notices ("the area containing X counties").
   Explicit "I'm on a private well" path; when a town is ambiguous, offer a list — never
   silently guess. This, plus item 3, is what makes it a product, not a scraper.
3. **Change detection + local history**: first-seen / last-seen / lifted per record (ADH
   publishes no API and no history), surfacing "new since your last check."
4. Exactly **three honest states**, always: (a) active advisory, (b) no active advisory found,
   (c) Data unavailable. A blank lifted date means STILL ACTIVE (never inferred lifted).
   Absence of a notice is never shown as safety.
5. **Ambient alerts** as an installable PWA using Web Push: a scheduled serverless check detects
   a change and sends a real notification (iPhone lock screen/banner via iOS 16.4+ "Add to Home
   Screen"; Android/desktop via permission). Each alert names the place, the action, the date,
   and links to the official notice + next steps; a second notification fires when it is lifted.
   Document the iOS install requirement in onboarding. Fallback order: email → check-on-open
   ("new since your last check"). [NEEDS: measured delivery reliability and false-alarm
   evaluation.] Neither a false-alarm rate nor delivery is currently claimed.
6. An **official next-steps panel** on every active alert: the agency's own guidance quoted and
   linked only after exact wording is verified; otherwise show a verification gap.
   Report links and contacts require separate approval/verification. Provide a share action
   and a clearly disconnected lift preference until delivery is verified. The app RELAYS
   published guidance; it never authors advice, never says
   "safe," never gives medical advice.
7. A glanceable status view; NWA-first (Benton, Washington, Carroll, Madison) default with
   statewide search.
8. A clearly-labelled, offline, deterministic **sample mode** (physically separate from live
   records, never blended) so the demo video and a judge run are repeatable even when no
   advisory is active.
9. A **Sources & Limits** page listing every source, retrieval timestamps, attribution links,
   the optional-contact retention/unsubscribe note, the iOS-install caveat, and all non-claims.
10. **Spanish** toggle on key screens (status, advisory detail, next steps, alerts settings).
    Status is conveyed by text + shape, never color alone; keyboard navigable.

## Done requires

- A static wireframe pass covering every real state — including Data-unavailable and Sample —
  before implementation. **Done:** `docs/wireframes/advisory-alert-wireframes.html`
- Tests: both parsers; the resolver (aliases, partial areas, private well, ambiguous → list);
  freshness/staleness; failure → Data unavailable; blank-lifted = active.
  Fixtures live in tests/fixtures/ (recorded HTML/JSON).
- `npm run build` passes and the app runs locally for a judge.
- [NEEDS: measured alert frequency over stated observation coverage.]
  No yearly counts or silent-day estimates are established.
- A truthful AI-assistance / student-contribution disclosure.

## Constraints

- Do NOT modify the existing HydroWatch-AR checkout.
- No new data sources; no bloom/prediction model; no sensor; no resident login.
- No personal data beyond an optional alert contact (stored minimally, with stated retention
  and a delete/unsubscribe path).
- No publishing or submission without explicit authorization.
- Claims limited to faithfully mirroring published official records, with timestamps.
  Mark unknowns `[NEEDS: ...]`.

## Iteration policy

(0) Wireframes established. Build the isolated sample resident journey first, then
continue source/proxy, resolver, history and delivery integrations with tests. A blocked
source gates only its affected integration, not independent sample/local work. Preserve
the two-source failure path; no invented fixtures or guidance.

## Stop (blocked) when

Stop only the affected integration when a source changes shape or is unavailable and the honest answer is "Data unavailable"; a claim
can't be made truthfully; the next step requires the student's own CAC eligibility/contribution
verification or any account/publish/submit action (including Web-Push hosting/VAPID keys);
or the app isn't demo-ready as the Oct 26, 2026 deadline nears.

## Confirmed decisions

- Concept: resident water advisory finder/alert. Coverage: statewide, NWA-first.
- Target: a small serverless proxy; React + Vite; installed PWA with Web Push. A separate Vercel-native function path now uses PostgreSQL state, shared job leases/cooldowns, pre-send claims and authenticated cron; local embedded PostgreSQL tests pass. The original local/container service still uses durable disk. Hosted provisioning/costs, platform verification and real-device delivery remain open; see `water-alert/VERCEL.md` and `water-alert/DEPLOYMENT.md`.
- Alerts: iPhone-style Web Push; iOS requires Add to Home Screen (16.4+); fallbacks email →
  check-on-open.
- Spanish on key screens.
- Wireframes first — done.

## Open decisions

- **Working name.**
- **Host for push / VAPID keys** (an account — the student's call).
- **Source for the Arkansas public water system list** (the resolver's main unknown).
- `[NEEDS: ADH's exact published boil-water wording, mirrored verbatim]`

## Personal gates (an agent cannot clear these)

- 2026 CAC eligibility (returning 2025 winner — re-verify rules/eligibility).
- Truthful student-contribution / AI-disclosure.
- Any account / publish / submit action.
