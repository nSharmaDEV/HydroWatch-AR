# Water Alert CAC Competitive Release Plan

**Status:** Proposed roadmap, October 14, 2026. No implementation, deployment,
external contact, notification sending, publication or submission is authorized by
this document. Checkboxes represent future work, not verified accomplishments.

**For implementation:** Work inline, one bounded task at a time. Use the available
test-driven-development skill before code changes, and the applicable UI/React
skills for interface work. Do not delegate unless the user asks. Before a code
task, turn its acceptance criteria into a small test-first implementation plan
against the then-current files; this is a release roadmap, not a patch specification.

**Goal:** Make Water Alert a credible Arkansas District 3 CAC contender through a
complete resident journey, measured user evidence, dependable demonstrations and
a truthful, memorable submission. A win cannot be guaranteed.

**Architecture:** Keep the existing React/TypeScript/Vite app in `water-alert/`.
Reuse its agency parsers, exact place matching, notice history and existing Web
Push path. Verify the approved free-only Vercel/Supabase/Cloudflare architecture
rather than replacing it. Keep fictional demonstrations out of live records and
real subscriptions.

**Tech stack:** React 19, TypeScript, Vite, existing Express/local server and
Vercel function path, PostgreSQL, scheduled Cloudflare Worker, Web Push,
Vitest, Testing Library and existing browser scripts.

**Spec and operational references:**
- `docs/GOAL-advisory-alert.md` — resident product outcomes and personal gates.
- `water-alert/README.md` — current behavior and test commands.
- `water-alert/FREE-HOSTING.md` and `water-alert/VERCEL.md` — hosting gates.
- `docs/SHIP_PLAN_2026-10-14.md` — existing work in progress; coordinate rather
  than duplicate its push work. Its separate photo-service work is not required
  for this CAC release roadmap.

## Global constraints

- Preserve unrelated changes, older apps and the separate HydroWatch checkout.
- No new data feeds, AI/photo feature, native app, accounts or major redesign.
- Three states: active advisory; no active advisory found; data unavailable.
- Absence, disappearance and retrieval failure never establish safety or a lift.
- Preserve ADEQ unknown `N/A` semantics; an explicit lift is different from an
  unknown status. Keep app check times distinct from agency publication times.
- Never guess a supplier from a city. Keep partial affected-area wording intact.
- Preserve official links, source limitations, EN/ES and keyboard access.
- Keep sample data clearly labeled and isolated; never inject fictional notices
  into production or send test alerts to nonconsenting devices.
- No paid plans or automatic upgrades. Secrets stay out of chat, source and video.
- Account changes, VAPID setup, deployment, scheduling, real sends, external
  outreach, publishing and submission require their respective explicit approvals.
- Each implementation batch includes `water-alert/CHANGELOG.md` under Unreleased,
  distinguishing local tests from verified hosted behavior.
- Student eligibility, personal contribution and submission answers are the
  student's responsibility; do not invent interviews, results or authorship.

## Calendar and time budget

Plan for roughly 2–3 focused hours per day, with device/user sessions arranged
early. If time is tighter, cut optional visual polish before validation or video.

| Dates | Outcome | Gate |
| --- | --- | --- |
| Oct 14–15 | Confirm eligibility, scope and baseline; recruit testers | Eligible entry and agreed release claim |
| Oct 15–17 | Verify hosted checking and consenting-device push, if approved | Evidence of actual device arrival, not just provider acceptance |
| Oct 17–18 | Tighten mobile hierarchy and action clarity | Resident sees current finding quickly and knows where to verify instructions |
| Oct 18–20 | Test with 3–5 people and fix observed blockers | Recorded task results plus retest |
| Oct 20–21 | Freeze features; verify release and fallback | Repeatable live/sample demonstrations |
| Oct 21–23 | Record student-led video and complete application draft | Truthful story and accessible video link |
| Oct 24 | Submit after student review and explicit authorization | Confirmation saved |
| Oct 25–26 | Buffer only | No last-minute feature expansion |

Deadline evidence: the official [student registration page](https://www.congressionalappchallenge.us/students/student-registration/)
read October 14 lists **October 26, 2026, 9 p.m. ET / 8 p.m. CDT**. Older repo
guidance says noon ET. Confirm current portal/district requirements and use the
earlier requirement if a conflict remains unresolved. Internal target: October 24.

## File ownership map

Existing files below are investigation targets, not instructions to edit all of
them. Make only changes supported by a failed acceptance test or user finding.

| Area | Existing implementation / tests |
| --- | --- |
| Dashboard and mobile | `water-alert/src/App.tsx`, `water-alert/src/components.tsx`, `water-alert/src/styles.css`; `water-alert/tests/App.test.tsx`, `water-alert/tests/supplier-info.test.tsx` |
| Onboarding and language | `water-alert/src/Journey.tsx`, `water-alert/src/strings.ts`; `water-alert/tests/journey.test.tsx`, `water-alert/tests/catalog.test.tsx` |
| Notice actions | `water-alert/src/NoticeDetail.tsx`, `water-alert/src/ProviderContact.tsx`, `water-alert/src/AdeqGuidance.tsx`; corresponding provider-contact/adeq-card tests |
| Delivery | `water-alert/src/PushPanel.tsx`, `water-alert/src/push.ts`, `water-alert/server/push.ts`, `water-alert/server/cloud.ts`, `water-alert/scheduler/worker.ts`; `water-alert/tests/PushPanel.test.tsx`, `water-alert/tests/push.test.ts`, `water-alert/tests/device-push.test.ts`, `water-alert/tests/cloud.test.ts`, `water-alert/tests/free-scheduler.test.ts` |
| Release operations | `water-alert/README.md`, `water-alert/VERCEL.md`, `water-alert/FREE-HOSTING.md`, `water-alert/CHANGELOG.md` |

Create these evidence files only when there are real observations to record:
- `water-alert/docs/CAC-VERIFICATION.md`: environment, build identifier, timestamps,
  source checks, notification trials, actual results and remaining limitations.
- `water-alert/docs/CAC-USER-TESTS.md`: anonymized consented task observations and retests.
- `water-alert/docs/CAC-DEMO-SCRIPT.md`: final recording sequence, captions and claims.
- `water-alert/docs/CAC-SUBMISSION-CHECKLIST.md`: verified rules and student-reviewed answers.

## Task 1 — Lock the entry and the promise (Oct 14–15)

**Owner:** Student, assisted by agent for repository checks.
**Produces:** A valid-entry checklist, bounded pitch and baseline evidence.

- [ ] Confirm 2026 eligibility, including returning-winner rules, permitted
  development dates, team details and AI disclosure in the official rules/portal.
  Clarify uncertainty with the organizer before assuming eligibility.
- [ ] Confirm deadline, video length/visibility, application fields and any source
  code requirements. Save the authoritative links and date checked.
- [ ] Use this draft promise: “Follow published Arkansas water advisories for your
  exact supplier and chosen lakes, with official sources and clearly labeled
  updates.” Only add a notification claim after Task 2 passes.
- [ ] Run `npm test` and `npm run build` from `water-alert/`; record actual results
  and the working-tree state without claiming an already-dirty tree is a release.
- [ ] Invite 3–5 potential users for Oct 18–20: residents who can identify their
  supplier and, if available, one Spanish-speaking reviewer. Get consent; do not
  request addresses, water bills, medical information or contact-list access.

**Pass:** Student has confirmed eligibility and submission requirements; scope is
frozen to this app; baseline failures are identified rather than hidden.

## Task 2 — Prove the complete checking-and-alert loop (Oct 15–17)

**Owner:** Agent for bounded technical work; student for approvals and devices.
**Consumes:** Existing approved hosting design, not permission to activate it.
**Produces:** Verification log and a decision on the release's alert claim.

- [ ] Read current deployment records; ask for any still-required approvals.
  Reuse existing provisioned resources rather than recreating them.
- [ ] Run existing push/cloud/scheduler tests. For a genuine defect, first add the
  smallest failing regression test, verify failure, fix it, rerun tests/build,
  update the changelog and review only that batch's diff.
- [ ] After approval, verify HTTPS/API routing, protected cron, private credentials,
  durable state, free-plan selection and fresh source checks with the laptop off.
- [ ] Start at least a 24-hour observation window. Record scheduled check gaps and
  source errors. Treat stale data as unavailable; do not claim uptime from a short trial.
- [ ] On a consenting real device, verify installation/permission, opt-in and the
  notice deep link. Test the intended iPhone path if an eligible iPhone is available;
  otherwise state exactly which device/browser was tested.
- [ ] Use an approved isolated test deployment/harness for controlled synthetic
  new/lifted events. Never modify real agency records to manufacture a production
  change. Label the notification and recording TEST; keep production identities,
  subscriptions and data separate. If isolated setup cannot be completed safely
  within this timebox, use the fallback below rather than altering production.
- [ ] Record at least 5 controlled trials: event/check time, send result, observed
  device arrival, open target and any duplicate/miss. Report counts and observed
  timing, not generalized reliability percentages. Verify unsubscribe stops future
  test sends; unchanged checks do not create new events; failure/unknown status
  does not create an all-clear/lift notification.

**Pass:** Hosted checks and actual consenting-device arrival are observed; test
events open the correct notice; limitations and misses are recorded. This does
not prove a naturally occurring agency-change delivery until one is observed.

**Oct 17 cutoff:** If blocked, ship the honest check-on-open/history product and
describe background push as unfinished. Do not add email as a second integration
or pretend sample notifications are real delivery. Reallocate time to Task 4.

## Task 3 — Make the resident journey glanceable (Oct 17–18)

**Consumes:** Existing screens and source semantics.
**Produces:** A smaller, clearer dashboard without a redesign.

- [ ] Capture current 390px and 320px sample/live-state layouts before edits.
- [ ] Sketch the small hierarchy change: place → current finding → affected area
  → official notice/action → secondary history and source details.
- [ ] Add a regression test for removing duplicated sample-dashboard explanation
  while retaining the persistent sample banner and clear record labeling. Verify
  it fails before changing the relevant render/string; do not remove all labels.
- [ ] Adjust only necessary spacing/copy/layout so the first current finding is
  visible in the initial 390×844 dashboard viewport and affected-area text is
  easy to scan. Keep the bottom navigation from obscuring focused controls.
- [ ] Make the official-notice route obvious without opening technical history;
  provider contact remains secondary and never substitutes for official guidance.
  Reuse verified agency guidance; do not write new medical/safety instructions.
- [ ] Verify active, no-match and unavailable states in EN/ES, keyboard operation,
  visible focus, mobile wrapping and supplier-info modal focus return. Update
  tests, README if behavior changes, and changelog.

**Pass:** No horizontal overflow at 320px; no loss of failure/sample disclosures;
current status remains primary; users can reach the official notice directly.

## Task 4 — Collect evidence from people, then fix blockers (Oct 18–20)

**Owner:** Student runs sessions; agent helps analyze anonymized observations.
**Produces:** Honest task results, prioritized fixes and a small retest.

- [ ] Run 15-minute sessions with 3–5 people without demonstrating answers first.
  Explain that this is an advisory-information prototype, not a water test.
- [ ] Ask: “Add your supplier, or use the fictional supplier if you aren't sure.”
  Observe ambiguity handling; never encourage guessing or request a bill upload.
- [ ] Ask: “Who is affected by this notice? Where would you verify instructions?”
- [ ] Show an unavailable state and ask: “What can you conclude about the water?”
- [ ] Ask users to find alert settings and explain whether delivery is enabled.
- [ ] For every task, record completion, assistance, approximate time, wrong
  interpretations and consented exact quotes under anonymous IDs. Do not invent
  quotes or represent this convenience sample as population validation.
- [ ] Prioritize safety misunderstandings, wrong-supplier selection and inability
  to find the official notice above cosmetic preferences. Fix with failing tests
  first; retest changed tasks with at least two people if available.
- [ ] Have a fluent reviewer check key Spanish status/action/limitation strings if
  available. Otherwise explicitly mark Spanish human review incomplete.

**Targets, not claims:** At least 4/5 users (or 3/3 for a three-person sample)
complete supplier and official-link tasks without help. Every tested user should
understand unavailable does not mean safe. Any contrary interpretation is a
release blocker until copy/hierarchy is corrected and retested. If participation
is lower, report the actual denominator instead of fabricating the target.

## Task 5 — Freeze and rehearse a judge-safe release (Oct 20–21)

- [ ] Freeze features on Oct 20. Only demonstrated bugs, misleading copy and
  submission blockers can enter after this date.
- [ ] Run `npm test`, `npm run build` and relevant existing browser scripts from
  the README; cover 320/390px mobile and desktop, EN/ES, active/no-match/failure,
  supplier ambiguity, source links, watch removal/undo and sample isolation.
- [ ] Verify first startup on a clean browser/profile and the exact judge URL or
  documented local command. Check the live page on another device if hosted.
- [ ] Rehearse a two-minute sample journey twice. Separately rehearse any verified
  real notification demonstration. Sample mode must remain usable if agencies or
  the network fail; never substitute fictional data as a live-source fallback.
- [ ] Record a release snapshot/build identifier, test results, known limitations
  and rollback/pause instructions. Review screenshots/video for secrets and
  personal/device identifiers. Keep raw participant data out of public artifacts.

**Pass:** Repeatable judge path, passing relevant tests, no misleading state or
unverified delivery claims. Public hosting is useful, not worth jeopardizing the
working local/sample submission if deployment remains blocked.

## Task 6 — Make the story memorable (Oct 21–23)

**Owner:** Student narrates and owns contribution statements. Agent may help edit
the script; no video production or publication is performed by this plan.

- [ ] Write the script to the portal's verified duration limit; aim for 2–3 minutes
  only if allowed. Use this approximate sequence:
  - 0:00–0:20: a real, consented local problem, or explicitly hypothetical resident
    scenario. No fabricated personal emergency or exaggerated health claim.
  - 0:20–1:15: choose the correct supplier, understand an affected-area notice and
    open the official source. Label fictional scenes throughout.
  - 1:15–1:40: show actual TEST notification arrival if verified; otherwise show
    check-on-open changes and explain the background-delivery limitation.
  - 1:40–2:10: show unavailable status and explain one technical decision: failed
    retrieval is not an all-clear; town name is not supplier identity.
  - Final section: real user-test findings, one change made because of them,
    student learning/contribution, AI disclosure and honest remaining limits.
- [ ] Explain the product difference concretely: saved chosen places, exact-system
  confirmation, retained observed history and, only if verified, opt-in push. Do
  not claim agency/supplier alternatives lack features without checking them.
- [ ] Record readable phone/desktop footage and clear student narration. Add
  accurate captions; keep sample/test labels visible and source attribution intact.
- [ ] Ask one person unfamiliar with the app to watch once and explain the problem,
  solution and limitation. Revise if they cannot distinguish real from test data.

**Pass:** A viewer understands who it helps, why this implementation is useful,
what the student contributed and what the app cannot establish.

## Task 7 — Submit early, with truthful evidence (Oct 24)

- [ ] Student reviews eligibility, originality, team attribution and AI disclosure.
  Clearly distinguish this app's work from previous entries and reused components.
- [ ] Fill application fields with actual capabilities and measured results; do
  not advertise planned photo analysis, prediction, guaranteed alerts or safety.
- [ ] With approval, publish the video at the visibility required by the portal.
  Verify it opens without the creator's login and plays on another device.
- [ ] Recheck every submitted link and any required code access; run the judge
  journey from a clean session. Include installation requirements where relevant.
- [ ] Student authorizes and completes submission, confirms all required survey/
  finalization steps, and saves the confirmation privately.

## What to cut first

1. Cosmetic animation, extra branding work and additional screens.
2. Extra device/browser breadth beyond the explicitly tested target.
3. Background push if the Oct 17 verification gate fails; retain truthful settings.

Never cut honest status handling, exact supplier confirmation, core tests,
student contribution disclosure, the working demo or submission buffer. Do not
spend the final days inventing AI, building email delivery or moving stacks.

## Finish line

- [ ] Eligibility and current submission requirements confirmed by the student.
- [ ] One complete, understandable resident journey works from a clean start.
- [ ] Delivery claim matches device evidence, or the limitation is explicit.
- [ ] Real user findings and resulting improvements are documented.
- [ ] Mobile, EN/ES and unavailable/sample states survive release checks.
- [ ] Student can explain parsing, matching, freshness and change detection.
- [ ] Video and application tell the same truthful story.
- [ ] Submission confirmation is saved before the internal deadline.
