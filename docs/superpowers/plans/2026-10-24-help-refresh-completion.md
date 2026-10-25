# Get help refresh completion

**Goal:** Finish the agreed refresh inside the existing five-stage WAVE flow, not History or a parallel prototype.

**Constraints:** Preserve all existing work and local servers (5178/8788), exact supplier IDs, source provenance, draft/history/files, English/Spanish and sample isolation. No commit, deployment, real email, notification or agency submission. Native calendar controls; optional answers never invented.

**Design:** Retain the existing WAVE font, white panels, navy #102e43, teal #087f83, pale teal #edf6f6 and subtle #dce3e9 borders. Use Map's current width/margins and shared heading/leader/action frame. Desktop has paired panels; mobile stacks. Review keeps resident answers and agency records separate from the editable email. No new branding or decorative chrome.

## Inline implementation / verification

- [x] Add regression tests, run them failing, then implement visible saved/catalog location suggestions, arrow/Enter/Escape navigation, manual entry and removable chips in `RequestLocations.tsx`.
- [x] Add failing tests for invalid date ranges, then implement inline date guidance/error and block Continue until corrected in `IssueQuestions.tsx` / `GuidedHelp.tsx`. Ongoing clears/disables the end date; legacy answers survive.
- [x] Test and expose exact-ID supplier contacts in observations, with native-app explanation and separate ADH fallback. Sample shows no real contacts.
- [x] Test and finish Review Add controls, source disclosure/trash confirmation, metadata alignment, and attachment spacing in `ReviewEmail.tsx` / `requests.css`.
- [x] Add failing email regressions: no inferred full-day duration, no dropped selected actions, no unselected request boilerplate, preserve edited/quoted source wording and historical details, unknown relation without invented interruptions, source attribution/URLs.
- [x] Run targeted and full unit suites plus build; run scoped synthetic Playwright desktop/mobile/history/files/send-guard journeys. Inspect actual browser at 1280×800 and mobile, keeping captures ignored. Fix help regressions, report wider-suite failures honestly.
- [x] Replace the premature changelog entry with actual changes/check results and update relevant README text only where needed. No commit or publish.

## Local verification outcome

- Nine focused help test files: 70 passing; final email-regression file rerun: 9 passing.
- Scoped Playwright (`help-workspace.spec.ts`, `saved-help.spec.ts`, `--grep '1280|saved'`): 44 passing, English/Spanish and all five issue categories, including 1280×800 fit, 640/390/320px stacking, saved drafts, history, files, and sample/send guards. Captures inspected outside the repository. These are synthetic local checks, not production/device delivery verification.
- Final `npm run build`: passed (existing >500kB JavaScript chunk warning). `git diff --check`: clean.
- Wider unit-suite run: 578 passing / 32 failing across the shared checkout, including outdated Home-entry fixtures and existing notification/contact/report failures. The focused help suite is green; the full suite is not. Shared Home work was preserved rather than rewritten to satisfy unrelated fixtures.
- No commit, deployment, real email, notification or agency submission.
