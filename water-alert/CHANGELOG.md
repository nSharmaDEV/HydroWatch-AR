# Water Alert changelog

Notable website, backend and hosting-configuration changes for the isolated
`water-alert/` app. This initial entry consolidates work completed locally on
October 13, 2026; it is not a commit-by-commit history or a release announcement.
Earlier unrelated app history is preserved in an external local backup, not in
the current WAVE-only project tree.

## [Unreleased] — 2026-10-13

### 2026-10-25 — Complete-app production deployment

- Pushed app commit `140a511` and deployed to the existing Vercel production project
  with explicit user approval, including approval of unresolved test failures.
  Hosted build passed; production HTML, expected assets and help/push config GET
  checks passed. Accounts/email remain disabled. See `VERCEL.md` for evidence.
- No configuration, scheduler or database changes, migrations or real sends.

### 2026-10-25 — Approved current-app release preflight

- Prepare the complete current app for the user's approved commit/push/Vercel
  release, including the Review refinements and pending map, Home and saved-help work.
- Fix native Node ESM imports in the annual-report evidence dependency chain.
  Node 24 build and 21 focused API/security/Review tests pass. Initial full suite:
  596 passed, 38 failed; the compiled-API failure then passed after the import fix.
  User explicitly approved proceeding with the other 37 failures unresolved.
- No production configuration changes, migrations or notification/email sends
  are authorized as part of this release.

### 2026-10-25 — Keep Review contact fields visible

- Keep name and reply contact permanently expanded in Review, without a collapse
  control. Preserve optional fields, heading styling and the section divider.
  Local change only; not deployed.

### 2026-10-25 — Align Review headings and table controls

- Match the name/reply heading to What you provided and separate the contact
  section with a divider and spacing. Keep information buttons visible beside
  both completed and highlighted missing answers.
- Put Source and Include in email into the source-record table's aligned rows,
  preserving locked historical findings and existing source links.
- Local checks: 34 focused tests and production build passed (existing bundle-size
  warning remains). Not deployed; no messages sent.

### 2026-10-25 — Simplify Review controls (local refinement)

- Use labeled icon actions for updating/downloading, move citations into the email's
  top-right information popup, and highlight clickable missing resident answers.
- Move name/reply fields first, rename source records to Problems, remove source
  detail/delete rows and empty file counts, and simplify the Copy email header.
  Keep source citations in exported email and historical qualifiers in records.
  Local implementation only; no deployment or messages sent.

### 2026-10-25 — Taller Review cards (local refinement)

- Reclaim 80px of unused desktop space beneath the Review cards and remove their
  tall-screen height cap, giving the information list and email more room. Keep
  the existing natural-height mobile layout. Not deployed.

### 2026-10-25 — Include report findings without listed corrective action

- Include exact-provider reviewed historical findings with no corrective action
  listed across generated email categories, preserving report dates, page citations
  and the distinction from current compliance or outage cause. Upgrade saved fact
  selections without replacing manually edited email text.
- Lock those source controls in Review and explain inclusion in English/Spanish.
  Local implementation and tests only; no deployment or messages sent.

### 2026-10-25 — Expand attachment button (local refinement)

- Remove the visible file-types/limits disclosure from the observation screen and
  let the upload button use the full card width. Existing file validation remains.
  No deployment.

### 2026-10-25 — Compact observation form (local refinement)

- Combine observed issues and attachments, remove the observation-step provider/
  safety panel and unused location/prior-contact controls, and expand the details
  card with a full-width frequency field. Existing saved answers remain intact.
- Local implementation only; no deployment.

### 2026-10-25 — Move safety guidance below report details (local refinement)

- Move urgent safety guidance above provider questions, removing the full-width
  strip above the form. Keep it above attachments when provider contact is absent,
  including sample mode. No deployment.

### 2026-10-25 — Reflow resident observation step (local implementation)

- Move urgent safety guidance above the observation form, separate issue choices
  from report details, and place attachments and provider contact in a support row.
- Keep the existing draft fields and controls, with the support panels stacked on
  narrow screens. Local tests and build only; no deployment.

### 2026-10-25 — Arkansas address lookup and location spacing (local implementation)

- Add an opt-in Census Geocoder lookup for structured Arkansas street addresses,
  disclose that the entered query is sent to Census, and keep manual place entry.
- Improve location-panel spacing, field alignment, option-list height and mobile
  action layout. Local API/unit verification only; no deployment.

### 2026-10-25 — Quieter background away from Home

- Keep Home's water effect unchanged; render ripple animation at 18% opacity on
  every other page over the same static gradient, keeping page content primary.

### 2026-10-25 — Shared water background on every page

- Extend the existing water background across all app pages using one persistent
  canvas behind the main content. Preserve page-specific layouts, opaque content
  panels, header/banner separation, input handling and static motion fallback.

### 2026-10-25 — Restore Home content position

- Restore the intro and action cards to their previous top spacing at the user's
  request, keeping the full-height background and bottom-strip removal.

### 2026-10-25 — Center Home and remove bottom strip

- Fill the remaining viewport below the shared header/banner with Home's water
  background, removing the gray bottom gap. Center the intro and two-card group
  vertically and horizontally, preserving mobile scrolling/navigation clearance.

### 2026-10-25 — Ambient ripples match clicks

- Give automatic ripples the same strength, wave profile and fade as click/tap
  ripples, retaining the continuous cadence and random background positions.

### 2026-10-25 — Subtle ambient visibility adjustment

- Increase ambient wave strength by 25%, without changing the continuous cadence,
  wave speed or fade, so the background is easier to see but stays secondary.

### 2026-10-25 — Continuous, soft ambient water

- Start ambient motion promptly and overlap softer drops every 1.1–1.5 seconds
  instead of isolated stronger pulses. Keep reduced-motion and hidden-tab pauses.

### 2026-10-25 — More apparent ambient ripples

- Increase ambient drop strength and shorten its random interval to 1.8–3.6
  seconds, keeping the smooth wave profile and stronger deliberate click response.

### 2026-10-25 — Sporadic ambient Home ripples

- Make background drops visible without pointer input, choosing positions across
  the background and varying the interval from 2.4 to 5 seconds. Keep ambient
  strength below deliberate clicks and preserve motion/visibility safeguards.

### 2026-10-25 — Calmer, input-led Home ripples

- Replace the noisy packed-height simulation with smooth WebGL wave packets:
  circular crests expand at a consistent CSS-pixel speed from a click/tap, fade
  completely, and leave the gradient clean. Limit overlapping waves to eight.
- Space out the weaker cursor wake and ambient drops. Preserve background-only
  rendering below the header, the three-pixel refraction cap, static reduced-motion
  fallback, passive touch handling and cleanup on navigation.
- Local checks: eight focused unit tests, ten desktop/mobile browser checks and
  production build pass. Existing large-bundle warning remains. No deployment.

### 2026-10-25 — Match Home card icon sizes (local implementation)

- Normalize the visible Arkansas outline and droplet artwork to matching
  dimensions within their heading rows. Not deployed.

### 2026-10-25 — More visible Home water

- Increase background ripple light/shadow contrast and pointer/ambient drop
  strength at the user's request. Keep the three-pixel refraction cap, unchanged
  content, reduced-motion fallback and input safeguards.

### 2026-10-25 — Improve resident report dates and locations (local implementation)

- Keep the end-date native calendar picker available even when ongoing status is
  not specified; selecting “ongoing” still clears any saved end date.
- Clarify that residents can report any Arkansas location, not only entries in
  the limited water-place suggestion directory. No deployment performed.

### 2026-10-25 — Align Home card leaders (local implementation)

- Place each fine leader in the heading row between its title and icon, keeping
  both endpoints clear of text and centering the line vertically. Not deployed.

### 2026-10-25 — Enlarge help issue choices (local implementation)

- Increase issue-choice text and icons for easier scanning, and let the five
  choices use more of the available desktop height while retaining a readable,
  single-column mobile layout. No deployment performed.

### 2026-10-25 — Refine Home card markers (local implementation)

- Attach the leader lines horizontally to the Arkansas and droplet icons, and
  remove the inner exclamation mark from the droplet. Not deployed.

### 2026-10-25 — Illustrated Home action cards (local implementation)

- Add an Arkansas outline and water-issue droplet at the top-right of the two
  Home action cards, connected toward each heading with a fine leader line. Markers
  are decorative and hidden from assistive technology; not deployed.

### 2026-10-25 — Isolated Home water background (local implementation)

- Add a light blue-to-white, background-only WebGL water simulation below the
  shared header. Keep existing cards, typography and navigation undistorted.
- Bound simulation/render resolution, throttle pointer input, pause in hidden tabs,
  and release resources on navigation. Use a static gradient for reduced motion,
  unavailable WebGL or context loss; no new dependencies or deployment.
- Local checks: 39 focused component/regression tests and eight synthetic
  desktop/mobile browser checks pass, including touch, context loss and changing
  motion preferences. Build passes with the existing chunk-size warning. This
  is scoped verification, not a claim that the full repository suite is green.

### 2026-10-25 — Remove Home ripple effect

- Remove the Home ripple component and animation stylesheet from the running app
  at the user's request after visual glitches. Keep the Home content unchanged.

### 2026-10-25 — Full-background Home ripples (local implementation)

- Replace the cursor-following masked patch with viewport-wide expanding/fading
  teal rings. Add staggered rings on pointer presses and gentle spaced ambient
  ripples; keep cards opaque and all controls interactive.
- Bound active ripple layers, clean up timers/listeners on navigation, pause ambient
  creation in hidden tabs, and disable the effect for reduced-motion preferences.
- Clip waves below the shared header/marquee. Two component tests and two synthetic
  desktop/mobile browser checks pass; build passes with the existing chunk-size warning.
- Local UI only; no deployment or live notification/email actions.

### 2026-10-25 — Home copy simplification

- Remove the Home-only “About WAVE” paragraph and its attached divider in both
  languages. Keep safety/source guidance elsewhere; ripple redesign is not yet implemented.

### 2026-10-25 — Skip unavailable-account setup screen

- Open device-only drafts and History directly when the session reports accounts
  disabled, in both languages. Keep sending disabled and retain sign-in for configured
  accounts and retry handling for account-check failures. Local implementation only.

### 2026-10-25 — Compact provider contact copy

- Remove the phone/email-app and separate-ADH explanatory paragraph from compact
  provider contacts in both languages, as requested. Contact links are unchanged.

### 2026-10-25 — Reload glyph visual sizing (local implementation)

- Enlarge the `⟳` glyph to compensate for its smaller font rendering and visually
  match the adjacent official-source arrow, keeping it inline and centered.
- Apply an optical upward offset to align the reload glyph with the label rather
  than its font's lower glyph position.

### 2026-10-24 — Check-now icon alignment (local implementation)

- Replace the card refresh SVG with `⟳` beside the label, using the same inline
  treatment as the official-source arrow instead of absolute positioning.
- Preserve checking/disabled behavior; no deployment or live refresh triggered.

### 2026-10-24 — Make saved drafts easier to scan in History (local implementation)

- Reformat History entries as compact, divided rows with the subject as the primary
  title, supplier shown once, a distinct draft/status label and issue category, and a
  consistently formatted saved date beside a prominent Resume draft action.
- Match the supplied wide History wireframe: align Refresh History with the page
  heading, place the explanation below, and separate the saved-draft count from the
  compact list. Render each draft as a restrained rounded card consistent with Places.
  Preserve local records and the existing resume callback; stack row actions on narrow
  screens. Local checks only; not deployed.

### 2026-10-24 — Add Check Now refresh icon (local implementation)

- Add a decorative refresh icon to the existing Check Now buttons, aligned at the
  right edge while keeping the label centered. Existing check behavior and accessible
  button name remain unchanged; no deployment or agency retrieval was performed.

### 2026-10-24 — Refine WAVE home ticker and pointer ripple (local implementation)

- Move the WAVE meaning ticker below navigation and show it only on Home; use
  logo-matched Montserrat, larger circular separators and a seamless continuous
  loop that pauses on hover/focus and becomes readable static text for reduced motion.
- Remove the welcome eyebrow and add a subtle expanding mouse-follow water ripple
  on Home only, disabled for reduced-motion preferences. Local implementation only;
  not deployed.

### 2026-10-24 — Welcome Home and watched dashboard under Places (local implementation)

- Make Home the WAVE welcome page with the requested advisory-map and water-issue
  actions, bilingual safety limits and a pausable/reduced-motion identity marquee.
  Move the existing watched-advisory dashboard to Places; retain watched-place
  removal and addition under Settings.
- Keep the existing help flow, map, history and settings destinations. Local checks
  only; no deployment, notification, email or agency submission.

### 2026-10-24 — Refreshed Get help with a water issue (local implementation)

- Finish visible saved/catalog location autocomplete with arrow/Enter/Escape controls,
  removable selections, manual entry and privacy/boundary reminders. Native optional
  date controls explain browser formatting and reject end-before-start ranges;
  ongoing clears and disables the end date.
- Expose existing exact-ID verified supplier tel/mailto contacts on observations,
  explain native-app behavior and keep ADH separate. Sample records expose no real
  contacts. Add example placeholders without inserting them into draft values;
  tighten attachment spacing and explain context-not-proof limits.
- Keep Review’s two-column answer and official-record tables left aligned, with
  accessible 44px edit/Add targets, explicit missing answers, source links and include
  controls. Collapse full wording under “View source details”; confirm icon-only
  deletion and preserve unrelated stored records and manual email edits.
- Preserve edited source prose, dated historical details and labeled source URLs in
  generated email. Retain all selected actions and stated frequency without inventing
  full-day duration or a default requested action; ask about uncertain notice relevance
  without inventing interruptions or asserting causation.
- Fit all five stages at 1280×800 with the shared header; stack Review naturally on
  narrow screens without overlapping subject, message or actions. Local checks:
  70 focused help unit tests and 44 scoped synthetic Playwright journeys passed;
  TypeScript/Vite build passed with the existing large-chunk warning. The full-suite
  run had 578 passing and 32 failing tests, including stale Home-entry expectations
  and existing notification/contact/report failures; it is not a green full-suite
  result. Synthetic browser checks do not verify production delivery.
- Local checks only; no deployment, commit, real email, notification or submission.

### 2026-10-24 — Compact Review information (local refinement)

- Show resident answers in a two-column table with adjacent ⓘ edit controls, and source-record metadata in a
  separate two-column table. Collapse full source wording, details, and file limits;
  summarize attachments without duplicating filenames.
- Keep the 35/65 Review panels aligned with a viewport-sized composer without page
  scrolling at 1280×800; stack them with natural page scrolling on mobile. Tighten
  generated wording for confirmed intermittent/no-water observations and selected requests.
- Put accessible circular Edit/Add information controls beside answers; keep email
  subjects concise and specific to the selected supplier, with provider-team or neutral
  multi-recipient greetings and clickable citations for included source records.
- Local checks only; no deployment, real email, notification, or agency submission.

### 2026-10-24 — Information-and-email Review (local implementation)

- Split Review into approximately 35% confirmed information and 65% editable email,
  stacking on mobile with natural vertical scrolling and readable editor text.
  Edit/Add links return to the original answer steps without discarding the draft.
- Separate resident answers, official record metadata, attachments and optional
  signature. Keep original source links, include/remove controls and editable source
  wording; mark saved/current-unverified and historical records explicitly.
- Use readable dates, display-case supplier names and concern-specific subjects.
  Ask whether a relevant notice relates to the reported experience without assuming
  causation or current status. Preserve independent manual-edit protection and
  explicit replacement through Update draft from answers.
- Local synthetic checks only; verification is recorded in the implementation plan.
  No deployment, real email, agency submission or delivery verification.

### 2026-10-24 — Complaint-email-first review (local implementation)

- Preserve five Map-aligned stages; replace the earlier Email/Report tabs with one
  email composer, expandable source details and secondary report/email downloads.
  Category changes clear incompatible details while retaining locations and identity.
- Refresh untouched subject/body independently from current confirmed answers,
  recipients, removed facts/files and saved-record status on resume. Protect manual
  edits and legacy drafts; stale warnings and explicit regeneration remain available.
- Use connected English/Spanish observations and selected requests, concern-specific
  subjects, agency/provider or neutral multi-recipient greetings, and role-aware ADH
  guidance requests. Preserve dated source quotations and historical/current limits;
  no complaint filing, investigation, cause, safety or delivery outcome is inferred.
- Local verification: 84 synthetic browser cases passed across categories, English/
  Spanish, 1280×800 and 1440×780 panels, narrow screens and enlarged text. The broader
  unit suite retains nine unrelated baseline failures; build and complaint-flow
  regression checks are recorded in the implementation plan. No deployment or real
  notification/email was performed.

### 2026-10-24 — Confirmed answers, natural email and resident report (local implementation)

- Keep five stages for every category and the approved bounded-panel layout. Add
  approximate dates, relevant service frequency/location followups, optional prior
  provider contact and billing details without inventing experiences or outcomes.
- Keep selected choices stable until explicit Edit wording; use focus-only writing
  prompts and genuine local-catalog states with manual location fallback.
- Derive natural email and a separate structured resident report from one confirmed
  model. Add Email/Report tabs, deliberate optional name/reply contact, distinct
  fact/source counts and separate text downloads that do not bundle attachments.
- Preserve manual email edits, flag meaningful answer/context changes and require
  confirmation before replacing subject/message. Report stays current independently.
  Preserve legacy source references and bounded metadata in existing JSON storage.
- Recheck ADH general-contact instructions read-only; drafts are not filed complaints.
  No deployment, provisioning, real messages, agency submissions or hosted migration.
- Local checks: 89 focused help tests and 84 isolated English/Spanish browser checks
  pass, including Email/Report tabs, saved edits, desktop fit and mobile reflow.
  The Node 24 build passes with the
  existing bundle-size warning; full unit suite: 573 pass and the same nine known
  unrelated notification/contact/report failures. Local checks do not establish
  deployed delivery.

### 2026-10-24 — Bounded help panels and unified composer (local implementation)

- Rebuild the shared help frame with compact Back/progress/save controls, consistent
  heading/leader/action, matching white bordered panels, full-row observation/request
  choices, pill prompts and a large attachment tile. Remove the duplicate area input
  while retaining saved area answers.
- Consolidate Review into one To/Subject/message/source/attachment surface. Keep
  recipient explanations inside the selector, full accessible source attribution,
  attachment removal and a short truthful Send/Copy status. Remove duplicate footer
  navigation and long delivery notes; preserve all save/send and sample safeguards.
- No deployment, provisioning, real messages, agency submissions or hosted migration.
- Local checks: 79 focused help tests, 84 isolated English/Spanish browser checks
  and the Node 24 production build pass. Browser checks include equal-height white
  panels with 24px padding, unified composer geometry, 1280×800 desktop fit including
  the sample banner, mobile and enlarged text. Desktop/mobile captures were inspected.
  The existing bundle-size warning remains. These checks do not verify real delivery.
  Full unit suite: 563 pass with the same nine known unrelated notification,
  contact-copy and historical-report failures.

### 2026-10-24 — Revised help wireframes (local implementation)

- Share heading, leader and primary action across all help screens. Split timing
  and optional locations, observations and description/uploads, and requested
  actions and specific response into balanced desktop columns; stack on mobile.
- Add explicitly selected multi-location descriptions, removable chips, existing
  saved-supplier/catalog suggestions and manual fallback. Preserve bounded location
  metadata in drafts and include confirmed locations in natural email prose/subject,
  without treating descriptions as addresses or supplier boundaries.
- Add safe writing prompts that never insert placeholders, visible calendar
  affordances and a large attachment button with reading/ready status and removal.
  Preserve custom wording, source attribution, historical dates and explicit regeneration.
- Make final Review a composer with header Send only when all selected recipients
  and configuration support it, otherwise Copy email. Preserve original save/auth/
  immutable-send/history safeguards and live/sample isolation. No deployment,
  provisioning, real messages, submissions or hosted migrations performed.
- Local verification: 78 focused tests and 84 isolated English/Spanish browser checks
  pass, including multi-location add/remove/prose, calendar affordances, normal
  1280×800 desktop fit, mobile/enlarged text, attachments and preserved drafts.
  Node 24 build passes with the existing >500 kB warning; full suite has 562 passing
  tests and the same nine unrelated notification/contact/report failures.

### 2026-10-23 — Five-screen help with final Review (local implementation)

- Use Choose, optional dates/area (bill details for billing), observations, requested
  response and final Review. Move chooser Continue beside the heading with a mobile-
  hidden leader, remove the device-only sign-in footer, and make attachments and
  relevant official guidance visible on observations.
- Keep complete editable email, compact verified-recipient multiselect, starred
  recommendation, sources, attachments, record controls, Send/Copy/Download together
  on Review. Preserve saved edits and legacy drafts; report sending outcomes inline.
- Review ADH's public contact instructions and distinguish an Engineering inquiry
  from a formally submitted complaint. Apply ADH wording only to selected ADH routes;
  do not invent an agency email, prior contact or investigation outcome.
- Preserve the Map shell, source/historical distinctions, accountless/live/sample
  isolation and disabled sample sending. No deployment, provisioning, migration,
  real email or agency submission performed.
- Local checks: 72 focused help tests and 84 isolated English/Spanish browser checks
  pass, covering all issue paths, normal desktop fit, visible attachments/guidance,
  mobile/enlarged text, saved edits and final-Review actions. The Node 24 build
  passes with the existing bundle-size warning. Lake HAB context does not receive
  tap-water boil instructions. Full unit suite: 556 pass with the same nine known
  unrelated notification/contact/report failures. These checks do not verify
  deployed delivery.

### 2026-10-23 — Confirmed wording and recipient review (local implementation)

- Replace the issue dropdown with four icon choices plus Other issue. Add service
  date controls, ongoing/end-date behavior, optional area, editable observation and
  requested-response choices. Only selected/supplied wording enters the email.
- Show relevant exact-supplier supporting information with include/edit/remove and
  per-fact sources; keep historical records optional and distinct from current status.
  Generate sectioned emails with separate resident facts, WAVE records and requested
  response, and concise numbered source URLs. Preserve manual edits until explicit
  regeneration, including Back/resume.
- Add directory-only multiple-recipient selection and primary recommendations.
  External-only selections block email rather than being silently dropped. Retain
  all resolved destinations in immutable send/retry snapshots and History; no new
  agency addresses or automatic submissions. Preserve concurrent device-only drafts.
- Keep the Map shell, sample banner, keyboard control focus and mobile reflow;
  remove only programmatic heading outlines. Local synthetic checks do not establish
  deployed delivery. No deployment, provisioning, migration or real messages sent.
- Local checks: 69 focused help tests and 84 isolated English/Spanish browser checks
  pass, including selected wording, sample-banner desktop fit, keyboard focus,
  mobile/enlarged text, saved edits and long final-preview scrolling. Node 24 build
  passes with the bundle-size warning. Full unit suite: 553 pass, the same nine
  unrelated notification/contact/report expectations fail.

### 2026-10-23 — Accountless live Get help drafts (local implementation)

- Allow visitors to use live supplier/advisory context without signing in and keep
  those drafts in a browser-storage key separate from fictional sample drafts and
  account-backed History. Device-only drafts are not transferred or submitted by
  WAVE; the existing copy/download and listed official-channel options remain.
- Include the new live-local key in device-data deletion and explain local versus
  account storage in the privacy screen and help documentation. WAVE-managed sending
  and private account History remain account-only.
- Targeted accountless help/History tests pass. No deployment, real email, agency
  submission or production delivery verification.

### 2026-10-23 — Short guided help flow (local implementation)

- Replace the earlier three-screen/two-column help presentation with one task per
  screen: issue choice, relevant experience, available WAVE records, editable email
  and final confirmation. Billing adds a separate bill-details screen; other issues
  need only a brief description. Supplier identity remains visible and Step n of m
  counts the actual path, skipping absent records without implying an all-clear.
- Keep exact-supplier facts separate from resident experience, with per-fact source,
  editing and removal. Historical findings remain dated, grouped and opt-in; resumed
  facts are saved/unverified, not new live-status checks. Bound initial previews
  without truncating agency quotations. Preserve email edits on Back, fact changes,
  language changes and resume; regeneration still requires confirmation.
- Reuse Map's shell, existing styling, autosave, History, account recovery and send
  safeguards. The typical advisory desktop path fits at 1280×800 with readable
  controls; long final previews scroll internally. Mobile and enlarged text reflow
  naturally. Optional tools expand in place, and sample mode stays visibly fictional
  with sending disabled. Add compatible optional flow/fact JSON metadata and bounded
  validation; no new database migration.
- Local Node 24 build, 62 targeted tests and 84 isolated synthetic browser checks
  pass, covering viewport fit, long preview, keyboard navigation, preserved edits
  and sample-send gates; desktop/mobile captures were inspected. Full unit suite: 546 pass and
  the same nine unrelated notification/contact/report expectations fail. No
  deployment, provisioning, hosted migration or real messages/notifications sent.

### 2026-10-23 — Approved two-column help hierarchy (local implementation)

- Preserve the Map-aligned outer shell and Your issue → Review → Send stages;
  split desktop content into roughly 40% details/references and 60% writing.
  Stack details above writing on narrow screens and enlarged text, using normal
  page scrolling without fixed help panels or internal preview scroll regions.
- Restore the issue-type dropdown, keep short questions and editable/removable
  source facts on the left, and enlarge experience, prior-attempt and email fields
  on the right. Advisory facts start expanded; billing facts may start collapsed.
- Keep recipient, supplied answers, attachments and citations beside the Review
  editor, and sending details beside the full final email preview. Preserve saved
  edits, explicit regeneration, historical opt-in and all existing send safeguards.
- Local Node 24 build, 55 targeted unit/integration tests and 84 synthetic browser
  checks pass; desktop/mobile captures were visually inspected. The build retains
  its bundle-size warning. Full unit suite: 539 pass, with the same nine unrelated
  notification/contact/report expectations failing. No deployment, provisioning
  or real sending.

### 2026-10-23 — Approved help wireframe follow-through (local implementation)

- Complete billing follow-ups with the disputed-charge and prior-attempt fields,
  using the existing answer keys and bilingual message generation.
- Show multiple agency-listed advisory problems as separate concise points.
  Identify each notice citation by available published date and affected area;
  keep links outside the editable email and preserve exact supplier matching.
- Use a neutral included-agency-details heading for saved/editable context, so a
  newer advisory cannot relabel old draft details as current. Preserve existing
  edited bodies, History, storage and unsupported/sample-send safeguards.
- Local Node 24 build, 55 targeted unit/integration tests and 84 synthetic browser
  checks pass; 1280×800 captures were visually inspected. Full suite: 539 pass,
  the same nine unrelated notification/contact/report expectations fail. The build
  retains its bundle-size warning. No deployment, provisioning or real sending.

### 2026-10-23 — Supportive resident help (local implementation)

- Keep the Map-aligned shell and center a readable task column. Replace the issue
  selector with five compact choices, one main experience field and relevant short
  questions; make the desired response optional and collapse dates/photos.
- Generate natural English/Spanish messages from exact-supplier notices, preserving
  original agency quotations and omitting missing facts. Keep per-notice official
  links outside the email instead of raw URL/reference logs. Historical evidence
  retains report year, page, published period/action and its non-current status.
- Allow editing/removing included facts, preserve edited emails across back/resume,
  and retain explicit confirmed regeneration. Store bounded optional citation
  metadata in existing JSON drafts and immutable outgoing copies; no schema change.
  Existing auth, ownership, autosave, delivery, replies and deletion paths remain.
- Local Node 24 production build and 52 targeted unit/integration tests pass. All
  84 synthetic help browser checks pass, including 1280×800 Map geometry, en/es,
  narrow screens, enlarged text, fact edits/removal and saved-draft resume. Full unit
  suite: 536 pass, the same nine unrelated notification/contact/report expectations
  fail. Vite reports a bundle-size warning. No deployment, hosted migration,
  provisioning, real email, notification or submission testing.

### 2026-10-23 — Issue-specific help and Map-aligned layout (local implementation)

- Match the existing Map workspace's outer width, alignment, margins and heading
  scale. Retain three stages, readable controls and natural mobile/enlarged-text
  scrolling; no new demo or unrelated page redesign.
- Add advisory, billing/credit/expenses, interruption/low-pressure, water-quality
  and other issue choices, retaining the existing legal route. Ask only relevant
  optional questions and preserve answers, attachments and edited drafts.
- Build new advisory references from all matching supplier notices, with separate
  agency-reported problems, published areas/dates and source citations. Missing
  facts are omitted; retained notices are not presented as current. Historical
  report evidence remains exact-provider, dated and opt-in.
- Generate issue-specific editable messages that separate resident facts from
  agency references without generic compensation/policy boilerplate. Show the
  complete Send preview openly, with source links and attachment review. Existing
  drafts are preserved rather than silently rewritten; samples still cannot send.
- Local Node 24 build and 46 targeted unit/integration tests pass. All 100 synthetic
  help browser checks pass, including Map geometry at 1280×800, English/Spanish,
  narrow screens, enlarged text and saved-draft resume. Full unit run: 530 pass,
  nine existing notification/contact/report expectations fail. No deployment,
  hosted migration, account provisioning or real email/submission testing.

### 2026-10-22 — Saved help requests and separate Map (local implementation)

- Add a single-column Your issue / Review / Send workspace, durable account-owned
  drafts, editable messages, bounded optional attachments and opt-in historical
  evidence. Sample drafts remain device-only and cannot send.
- Separate Map from private History. History retains original issues, immutable
  outbound copies, delivery events, supported verified replies, follow-ups and
  resident-controlled close/reopen. Include per-request/all-history deletion.
- Add opt-in Supabase account validation and Resend delivery adapters, private
  storage, ownership enforcement, revision conflicts, stable send keys and signed
  webhooks. Unconfigured accounts/delivery are explicitly unavailable. Official
  external channels are never recorded as sent. Enrollment/recovery, mail-domain
  setup and hosted migration remain operator gates; no deployment or real sends.
- Preserve open edits through same-account reauthentication; wait for durable save
  before navigation, warn on unsaved browser exit and offer retry/download on failure.
  Document private storage/deletion, bounded retry and unsupported inbound files in
  `HELP-REQUESTS.md`; update root/app usage and in-app privacy information.
- Local Node 24 production build passes. The help browser matrix passes 68 synthetic
  checks (English/Spanish, active/no-active contexts, four issue types, desktop,
  mobile and enlarged text; saved sample reload/resume). Full unit suite: 525 pass,
  nine existing notification/contact/report expectations fail; no removed copy
  restored. Provider API/auth/webhook tests use injected fixtures, not real sends.

### 2026-10-22 — Advisory map workspace (local implementation)

- Replace History's stacked map/cards with a compact heading, shared supplier/county
  search, My places / All places and Status filters, and a desktop 65/35 map/results
  workspace. Keep unmapped suppliers in the same active-first list with Location
  unavailable; never invent coordinates or affected boundaries.
- Marker and row selection open the same local details panel. Back retains list
  scroll, selection, filters and map position; visiting Sources also retains the
  workspace. Move long map explanations and point attribution to the existing
  Sources and coverage destination. Preserve geometry, reviewed coordinates,
  agency wording/dates, freshness, historical uncertainty and bilingual warnings.
- Mobile uses Map/List tabs and an accessible modal bottom sheet with focus
  containment/restoration, Escape/back/close/backdrop dismissal and scroll handling.
  Short or enlarged-text layouts can scroll naturally; shared header/nav unchanged.
- Local checks under Node 24: 44 targeted unit/history tests and four intercepted
  synthetic browser checks pass
  (two desktop-only checks skipped in the phone project), production build passes.
  Full two-worker unit suite: 508 pass, nine existing notification/contact/report
  expectations fail. No removed copy restored; no deployment, live-state test writes
  or real sends. README updated for the new workspace and Sources entry point.

### 2026-10-22 — Home carousel clearance and ADH contact fallback (local implementation)

- Tighten short-desktop Home spacing so the collapsed long affected-area example
  retains fully visible Previous/Next controls at 1280×650 and 1440×780. Preserve
  full notice wording, readable text and normal scrolling for expanded content.
- Replace the missing-provider-contact paragraph with a right-aligned Contact ADH
  link to the existing Safe Water Engineering reference. Keep verified supplier
  phone/email actions and sample-mode separation unchanged.
- Local checks: 22 targeted browser checks and production build pass. Targeted
  unit run: 42 pass, two existing missing-email-copy expectations fail. Full suites
  not rerun. Nothing deployed or sent.

### 2026-10-22 — Leisure Hills explicit affected-area match (local implementation)

- Fix a missed match when ADH lists VILLAGE WATER LLC in System but explicitly
  names Leisure Hills Mobile Home Park in Area Impacted. Match only the verified
  exact system/area/county/source combination; do not alias all Village Water
  notices or infer service boundaries. Preserve original notice identity,
  wording and dates. Use the same association in supplier advisory history.
- Shared status/history/watch matching changes locally; no past events are
  replayed, no real notifications sent and nothing deployed.
- Local checks: 63 targeted tests and production build pass. Read-only local
  API inspection confirms the ADH snapshot retains the unlifted source row.

### 2026-10-22 — Unified annual-report card (local implementation)

- Move the reviewed report title, year selector and source-link footer inside
  the findings card, including the yellow issue card. Preserve expandable
  findings, source destinations and distinct unavailable/unreviewed states.
- Local checks: six annual-report tests and the production build pass. Not deployed.

### 2026-10-22 — Laptop help workspace proportions (local implementation)

- Keep the desktop help panel and navigation at a consistent viewport-relative
  position across steps instead of shrinking short steps. Allow expanded content
  to grow normally; retain stacked mobile layouts and account for the sample banner.
- Increase the guided draft editor from 96px to at least 160px, growing with
  available height. Group preparation actions and supplementary disclosures;
  replace the full-width heading focus outline with a localized focus marker.
- Local checks: 27 help unit tests and 32 workspace browser tests pass, covering
  every pathway in both languages at 1280×700 and 1440×780, narrow widths and
  enlarged text. Build passes. Six older formatting checks fail before entering
  help because they expect the Home info icon to open the removed checklist
  destination rather than Sources and coverage. Full suites not rerun. Not deployed.

### 2026-10-22 — Compact Home updates section (local implementation)

- Remove the notification-status paragraph and Manage alerts shortcut from the
  Home sidebar. About these results now follows directly below the toggle row
  with the existing section gap. Keep notification controls, feedback on use
  and the full alert settings page unchanged. Local checks: 20 targeted unit
  tests, six bilingual desktop/mobile browser checks and build pass. Not deployed.

### 2026-10-22 — Home alignment and sources shortcut (local implementation)

- Align the desktop Add a place button with the main card's top edge. Keep
  existing colors, typography, card layout and stacked mobile placement.
- Make the card info icon open the existing Sources and coverage destination,
  using the same in-app navigation. Label it “Sources and coverage” (localized
  in Spanish), and remove the separate sidebar text shortcut.
- Local checks: 52 targeted unit tests, six bilingual desktop/mobile browser
  checks and production build pass. Full unit run: 508 pass, four existing
  annual-report disclaimer/provider missing-email failures. Not deployed.

### 2026-10-22 — Record automatic push pipeline audit

- Read production job, source, event and attempt summaries without invoking cron,
  mutating state or sending notifications. Recent source/push job activity and
  successful agency checks were observed, but there were no eligible post-enrollment
  events or push attempts. Automatic event-triggered device delivery remains
  unverified; operational evidence is recorded in `VERCEL.md`, `FREE-HOSTING.md`
  and `PUSH-PLAN.md`.

### 2026-10-22 — Send one authorized Safari push transport test

- After read-only verification isolated the newest user-enrolled Safari
  subscription from one older Apple subscription, sent one explicitly labeled
  non-advisory test notification to the newest device only. Apple returned HTTP
  201 (accepted); no retry, synthetic notice, cron, advisory drain or production
  state mutation occurred. The user confirmed it appeared on their Mac. Tap-through
  and scheduled advisory delivery remain unverified.

### 2026-10-22 — Show push setup failure stage in Settings

- Preserve the typed service-worker, browser-subscription and server-enrollment
  failure details in Alert Options instead of collapsing all setup errors into a
  generic message. Permission denial remains distinct; failed deletion keeps its
  credential-preserving retry message. Deployed October 22 in deployment
  `dpl_zBSRNjkRi6mYqezYLZgqNVeTucNL`; this surfaces the failing stage but is not
  evidence of real-device delivery.

### 2026-10-22 — Deploy push diagnostics to production

- Deployed the Settings push-stage diagnostics to the existing production project.
  Deployment `dpl_zBSRNjkRi6mYqezYLZgqNVeTucNL` is Ready at
  `https://water-alert-cg61nh1de-nirmays06-3523s-projects.vercel.app`, aliased to
  `https://water-alert-blond.vercel.app`. The hosted build passed; the production
  page and enabled push config were checked read-only. No settings, scheduler,
  enrollment or notification delivery was changed or verified.

### 2026-10-22 — Deploy current WAVE checkout to production

- Deployed the complete current checkout, including the observed-supplier map and
  coverage catalog, observed-history navigation, Home push-setup guidance, and
  accompanying documentation/tests. Vercel deployment
  `dpl_8chB59BgZ2Vpj2yusbefVuY1PFZm` is Ready and aliased to
  `https://water-alert-blond.vercel.app`.
- Hosted TypeScript/Vite build passed. Read-only checks confirmed the production
  page responds and `/api/push/config` reports `enabled: true` with a public key.
  The full local test run had 505 passing and four existing report/contact-copy
  assertion failures. No Cloudflare scheduler or Vercel environment settings were
  changed; real-device enrollment and notification delivery remain unverified.

### 2026-10-21 — Reference points for all currently observed suppliers (local)

- Expand the reviewed exact-ID location catalog to cover all 31 suppliers in the
  local observed-history inventory: 26 exact-name historical Arkansas GIS polygon
  centroids, two documented name variants (Brunner Hill and North Jackson), and
  three separately labeled office/site references (Salem, Riverside Resort and
  Little Fir). Retain the earlier Fayetteville entry, for 32 catalog points total.
- Record source names, point types, review dates, public identity evidence and
  review notes. Disclose point types and source links in English/Spanish. These
  points are not affected areas, current service boundaries or water-system assets.
  Future suppliers still require location review and remain discoverable as
  unmapped until then. No new feeds, geocoding, polling, dependencies or deployment.
- Local validation: all 31 reviewed identities have points; 16 map/coverage tests
  and 25 existing history/content tests pass, as do the production build and four
  synthetic desktop/phone browser checks (including the populated catalog).
  Full unit run with two workers: 505 passed/four failed, the same pre-existing
  report/contact-copy failures documented below. No production-feed health or
  device delivery was verified.

### 2026-10-21 — Observed supplier map (local implementation)

- Add Map/List views only under History → All observed places. Preserve the
  existing history cards in List and My places, and leave the Home carousel/layout
  untouched by this feature. Map markers and unmapped supplier buttons reuse
  advisory details, including suppliers present only in saved observations;
  Back returns to the map.
- Use exact observed ADH supplier IDs and existing current-status/freshness logic,
  source timestamps and app clock. Search supplier/county names; keep active
  unmapped suppliers discoverable. Include English/Spanish labels, keyboard
  controls, zoom/reset, reduced-motion handling and safety/coverage limitations.
- Bundle the public-domain Census Arkansas outline and two provenance-backed
  historical polygon-centroid reference points from Arkansas GIS/ADH (Bull
  Shoals and Fayetteville). These are not affected areas or current service
  boundaries; all other suppliers remain unmapped until coordinates are verified.
  No new dependencies, external tiles, geocoding, polling or CSP changes.
- Local validation: 13 new map tests and 25 existing history/content tests pass;
  production build and two synthetic desktop/phone browser checks pass. Browser
  checks used an isolated UI-only server on temporary port 5196 because 5194 was
  already occupied, with external requests and API mutations blocked. Full unit
  run with two workers: 502 passed/four failed; the same four report/contact-copy
  failures reproduce against committed HEAD. Two additional journey failures in
  an earlier full run pass in isolation and the two-worker rerun. This feature was
  subsequently included in the October 22 production deployment; real source-health
  or notification-delivery verification was not performed.

### 2026-10-21 — Guard Home notification setup state (local implementation)

- Keep the Home notification switch disabled while server push configuration is
  loading, and show localized setup status instead of allowing an early click to
  leave a misleading failure message behind.
- Distinguish service-worker, browser-subscription and server-enrollment failures
  while keeping the switch off unless setup succeeds. Local tests cover the
  loading race and each failure stage. Subsequently included in the October 22
  production deployment; device delivery remains unverified.

### 2026-10-21 — Deploy pushed Home and resident-help updates (production)

- The Git push alone did not trigger deployment because this project has no Git
  integration. Deployed the linked `water-alert` project with Vercel CLI after
  verifying its project link. Deployment `BeSgponvYgM4oUH3LZxfnEa2MMaU` is Ready
  at `https://water-alert-ne4zzwc57-nirmays06-3523s-projects.vercel.app` and
  aliased to `https://water-alert-blond.vercel.app`. Hosted build passed, and the
  production alias rendered the updated Home in fictional sample mode. No device
  push delivery was verified.

### 2026-10-21 — Match Home action sizing and sidebar alignment (local implementation)

- Match Add a place button typography, vertical padding, radius, and rendered
  height to the card action buttons while retaining its aqua/navy styling and
  full-width placement. Align Manage alerts with the Get water updates heading
  text, below its bell icon.
- Added responsive Playwright assertions; execution remains blocked by the
  existing process occupying port 5194. Not deployed.

### 2026-10-21 — Always-visible Home sidebar and notification switch (local implementation)

- Align the full-width Add a place action with the main Home card and use aqua
  `#46CDCD` with navy `#082F49`. Keep About these results expanded, with a
  matching outlined information icon, heading typography and divider.
- Replace the sidebar's off sentence with an accessible, keyboard-operable
  notification switch. Enabling uses the existing permission, browser push and
  server-registration flow; the switch turns on only after setup succeeds.
  Blocked permission and setup failures leave it off and explain the next step.
  Manage alerts remains available; delivery is not guaranteed or verified.
- Local checks: 32 focused unit/integration tests and the production build pass.
  Focused Playwright run could not start because the dedicated test port 5194 was
  already occupied by an existing local process. Not deployed; device delivery
  was not tested.

### 2026-10-21 — Two-column help workspace (local implementation)

- Give every active-notice and general-help step paired directions and task work.
  Keep one mounted draft editor, per-template edits and selected historical
  references while navigating; shorten repeated copy and disclose supplementary
  guidance, sending options and privacy detail without clipping expanded content.
- Offer opt-in exact-provider historical findings in both guides. Copy/download
  output retains selected source citations, dates and historical limitations;
  sample mode remains separate. No submissions or persistence were added.
- Local checks: 27 targeted help unit tests and 24 targeted browser tests pass;
  the latter cover all four pathways in both languages at 1280×700, mobile widths
  and enlarged text. Production build passes. Full unit run: 483 pass, four fail
  in annual-report historical-disclaimer and provider missing-email expectations
  outside these help changes. Full browser suite not rerun. Not deployed.

### 2026-10-21 — Trim annual report and profile disclosures (local implementation)

- Remove the manual-review date and historical-compliance disclaimer from annual
  report details, and remove the redundant monitoring safety note. Keep the
  original PDF and ADH annual-report links directly after the findings.
- Remove the ADH directory review-date and limitation paragraph from the supplier
  profile while retaining its ADH profile link. Not deployed.

### 2026-10-21 — Simplified Home sidebar (local implementation)

- Make Add a place a full-sidebar-width teal button with white text. Remove the
  white cards, rounded borders and shadows from Get water updates and About these
  results; align their edges and separate them with a thin horizontal divider.
- Keep the bell beside the heading, move device status before Manage alerts, and
  use compact spacing and slightly smaller supporting text. Preserve notification
  state logic, translated copy, expandable +/− disclosure and existing navigation.
  This change does not modify main status-card sizing or layout rules.
- Local checks: production build and six new synthetic sidebar browser checks pass
  in English/Spanish at 1440/390/320px, including navigation and disclosure behavior.
  Broader checks were not clean: the isolated Home run had 51 passes and three
  failures outside the new sidebar checks while other worktree edits were ongoing;
  unit/integration tests had 483 passes and one timeout (all 15 tests in that file
  passed on retry). No deployment or real notification-delivery verification.

### 2026-10-21 — Show only verified provider contact actions (local implementation)

- Hide unavailable email actions and their fallback text; render the phone/email
  button group only when at least one verified contact method exists. Keep
  available actions right-aligned opposite the left-aligned service heading and
  directory link, preserving the divider and help-button spacing. Not deployed.

### 2026-10-21 — Spaced service-help button (local implementation)

- Set a consistent 24px gap between the visible service-contact row and the
  centered help button. The card grows naturally while retaining equal bottom,
  left and right padding; existing button sizing and the service divider remain.
- Updated synthetic browser layout assertions. Not deployed.

### 2026-10-21 — Restored service-contact divider (local implementation)

- Restore the full-width 1px divider between Advisory history and Service
  questions, using the same border color as the provider/history divider.
  Match the spacing below it to the history row's bottom padding (12px normally,
  9px on short laptop screens). Contact details remain directly visible.
- Synthetic browser checks compare divider width, border and spacing in both
  languages. The added spacing can produce about 9px of natural document scrolling
  at 1280×650; controls remain visible, and content is not clipped. Not deployed.

### 2026-10-21 — Always-visible service contacts (local implementation)

- Replace the Service questions disclosure with the heading, ADH directory
  citation and verified phone/email actions directly visible in the same compact
  row. Keep laptop rows within 48–50px; let narrow layouts wrap naturally without
  clipping contact values. Preserve missing-contact warnings and exact destinations.
- Local checks: 48 synthetic browser layout tests and production build passed,
  including both languages at 1280×650, 1440×700 and mobile widths. Not deployed.

### 2026-10-21 — Consistent header dimensions across tabs (local implementation)

- Apply Home's compact header padding and logo sizing to every page, removing
  the route-dependent jump in header height and logo dimensions.
- Local checks: 42 synthetic browser layout tests and production build passed.
  New checks compare header and logo geometry across Home, Places, History and
  Settings in both languages at laptop and mobile sizes. Not deployed.

### 2026-10-21 — Restored card width with responsive height (local implementation)

- Restore the centered 1160px Home container and previous desktop horizontal
  spacing. Let the carousel and provider card share available vertical space
  through flexible layout rather than fixed heights or spacer elements.
- Keep approximately 24px above the card and below its carousel controls.
  The notice area absorbs spare height with centered text; typography, button
  sizes and horizontal card spacing remain unchanged. Expanded and small-screen
  content scrolls naturally, and the footer remains removed.
- Local checks: 39 synthetic browser layout tests, including 1280×650,
  1440×700, taller and mobile views, plus production build passed. Not deployed.

### 2026-10-21 — Wider responsive Home card (local implementation)

- Remove Home's page width cap and use 24px desktop / 16px mobile outer
  padding. Increase desktop card padding to 24px for comfortable, content-led
  height without stretching the card or adding empty space.
- Preserve equal viewport gaps, natural expanded/mobile scrolling, the current
  header, typography, colors and interactions. The footer remains removed.
- Local checks: 39 synthetic browser layout tests, including 1280×650 and
  1440×700 at normal zoom, plus production build passed. Not deployed.

### 2026-10-21 — Centered Home without a bottom bar (local implementation)

- Delete the footer container and its desktop/mobile styles. Keep the header
  unchanged and share spare viewport height equally above and below Home using
  a flexible column layout and automatic margins, without changing card internals.
- Expanded or shorter views scroll naturally with equal 16px content padding;
  retain only the clearance required by the existing fixed mobile navigation.
- Local checks: 39 synthetic browser layout tests (including 1280×650,
  1440×700, taller and mobile views), 484 unit/integration tests and production
  build passed. Not deployed.

### 2026-10-21 — Combined provider details without duplicate dividers (local implementation)

- Remove the divider immediately below the supplier action buttons. Combine
  water-source context and all six provider facts under the existing Provider
  information toggle, without a nested More provider details disclosure.
- Remove the repeated population sentence, duplicate directory/report links and
  decorative section dividers. Retain distinct source citations, verification
  dates, historical-report qualifications and English/Spanish content.
- Local checks: 484 unit/integration tests, 37 synthetic browser layout tests
  (including expanded laptop/mobile views) and production build passed. Not deployed.

### 2026-10-21 — Matching provider actions and geometric title (local implementation)

- Normalize the button/link pair's inline-flex alignment, 8px icon gap, padding,
  border thickness and typography within the existing equal-width, 12px-gap grid.
  Retain banner-edge alignment, narrow-screen stacking and original actions.
- Use locally hosted Montserrat Bold for every supplier-card title, retaining
  title case, navy and natural wrapping beside the information button. This is
  an approximation: existing logo assets are raster/outlined, with no original
  font supplied. Font provenance and the SIL license accompany the asset in
  `public/fonts/` (no runtime third-party font requests).
- Local synthetic Chromium checks cover normal-zoom laptop/mobile layouts,
  English/Spanish, matching control metrics, font loading and long-title wrapping.
  Not deployed.

### 2026-10-21 — Balanced advisory-banner spacing (local implementation)

- Use 16px above and below the supplier banner in all advisory states. Reset
  text margins and group headline/supporting text with an 8px gap and equal
  vertical padding; retain width, type sizes and natural growth when text wraps.
  Short laptop screens use compact symmetric inner padding to preserve Home fit.
- Local synthetic Chromium checks pass for English/Spanish across all three
  states, laptop viewports, mobile wrapping and expanded sections (31 tests).
  Production build passes. Not deployed.

### 2026-10-21 — Undo the last two Home layout rounds (local implementation)

- At the user's request, restore the footer, earlier header/card/sidebar spacing,
  outlined Check now, filled help action and collapsed Service questions section.
  Remove the extra qualification/source link from About these results. Preserve
  earlier work, including the larger notice banner and popup-only check timestamp.
  Restore the corresponding layout and disclosure regression expectations.
  Not deployed.

### 2026-10-21 — Larger notice banner (local implementation)

- Remove the supplier card's standalone last-successful-check row; retain its
  timestamp and empty-check state in the supplier details dialog.
- Reuse the space for a roomier notice banner with 26px headings and 18px
  explanatory text, preserving notice wording, source links and unavailable states.
- Local checks: 13 synthetic Chromium layout tests (including 1280×650 and
  1440×700, English/Spanish and expanded sections), 484 unit/integration tests,
  and the production build pass. Not deployed.

### 2026-10-21 — Compact Home with bottom carousel controls (local implementation)

- Shorten the Home header with 6px vertical padding and a proportional 200px-wide
  logo; tighten water-update card spacing and advisory/check/action gaps without
  reducing text sizes. Preserve the dotted freshness leader and readable controls.
- Use white, outlined teal Check now buttons. Put carousel controls outside and
  below the provider card, with an 8–12px gap, left/right buttons and centered count.
  Preserve the existing carousel interaction and mounted card state.
- Keep the footer in document flow with 16px bottom padding. Height-based spacing
  lets the collapsed Home, controls and footer fit at 1280×650 and 1440×700 at normal
  browser zoom; expanded sections and smaller screens retain document scrolling.
- Local synthetic Chromium coverage checks English/Spanish, active/no-notice cards,
  expanded sections, footer visibility and reachable bottom controls. No deployment
  or real notifications.

### 2026-10-21 — Consistent supplier-card formatting (local implementation)

- Give active boil notices the same centered headline/body layout and primary
  Check now button as no-notice cards. Keep the warning color, source link and
  advisory wording; use an inline 24px warning icon instead of an oversized icon.
  Area and reason share a wrapping line with a separator, without hiding evidence.
- Reduce the gap between Service questions and the help action from 24px to 8px
  at taller viewport heights too; retain 16px card padding and readable text.
- Local synthetic Chromium checks cover both states in English and Spanish at
  1280×650, 1440×700 and 1440×900, plus expanded sections and smaller screens.
  No deployment or real notifications.

### 2026-10-21 — Home fits short laptop viewports (local implementation)

- Move carousel navigation above the provider card. Use 16px below the header,
  8px between navigation and card, and 16px card padding. Remove Home's inherited
  minimum page height; compact secondary panels and let the footer follow content.
- At desktop widths above 760px and viewport heights up to 750px, reduce header,
  card and footer whitespace without shrinking text or scaling the page. Keep
  primary actions, disclosure controls and carousel buttons at least 44px tall.
  Expanded sections and smaller viewports retain normal document scrolling.
- Local Node 24 checks: 484 unit/integration tests, production build and seven
  isolated Chromium viewport tests pass. At 100% zoom, English and Spanish Home
  fit 1280×650 and 1440×700 CSS pixels without vertical scrolling; expanded
  provider information, history and service sections keep the help action
  reachable. Also checked scrolling at 1280×480, 390×600 and 320×600, without
  horizontal page overflow. Screenshots inspected locally; synthetic status
  responses only, no live API writes, notifications or deployment.

### 2026-10-21 — Watched-place carousel is button-driven (local implementation)

- Remove gesture control from the watched-place carousel. Touch swiping,
  trackpad scrolling, vertical wheel translation and mouse dragging no longer
  move the cards; only Previous/Next and the arrow/Home/End keys do. Keyboard
  navigation remains for accessibility, and the page scrolls normally over the
  cards. Remove the wheel/drag/snap-state machinery and the now-unused
  interaction styles; the track is clipped with `overflow: hidden`.
- Card content, controls, expanded state, indicator, resizing behaviour and
  reduced-motion handling are unchanged. Cards still animate between positions
  when the buttons are used.
- Local Node 24.22.0 checks: `npx tsc --noEmit`, 484 unit/integration tests and
  the production build pass. Local Chromium checks against the running dev
  server confirmed buttons and keyboard navigation, no card movement from
  wheel, trackpad, mouse drag or a 390px CDP touch swipe, working card controls,
  resize realignment and no horizontal page overflow at 1100/390/320px. Not
  deployed.

### 2026-10-20 — Watched-place carousel (local implementation)

- Replace the vertically stacked watched-place cards with a one-at-a-time
  horizontal carousel that keeps the existing supplier/lake cards, colours,
  links, dialogs and expandable sections unchanged. Cards stay mounted, so
  expanded provider information and other card state survive navigation.
- Use native horizontal scrolling and CSS scroll snapping. Support trackpad
  horizontal wheel, proportional vertical wheel, mouse drag and touch swipe;
  disable snapping only while a custom gesture is active, then snap to the
  nearest card. A plain click is never captured, so card buttons, links and
  accordions keep working; vertical drags and text fields are left alone.
  Previous/Next buttons, a "1 of N places" live indicator, arrow/Home/End keys
  and reduced-motion handling are included; no automatic advance.
- Clip neighbouring cards inside the carousel viewport without page-wide
  horizontal overflow from 320px upward, and realign on resize. Page scrolling
  remains available at the first and last cards.
- Local Node 24.22.0 checks: `npx tsc --noEmit`, the production build and 487
  unit/integration tests pass; one unrelated `tests/active-help.test.tsx` case
  timed out once under full-suite load and passes in isolation. Local Chromium
  checks against the running dev
  server covered partial wheel/drag gestures, mid-gesture reversal, snapping,
  390px CDP touch swipe, horizontal wheel, card clicks/expanded state, keyboard
  navigation, resize realignment and no horizontal page overflow at
  320/390/768/1024/1280px. Not deployed, and no hosted or real-device delivery
  was verified.

### 2026-10-20 — Four-step active-advisory help (local implementation)

- Implement Contact, Prepare, Send & record and Follow up for fresh active ADH
  supplier notices, with reversible resident task progress. Keep the original
  five-step guide for no-active, unavailable/stale and historical contexts.
  Official water-use and after-lift references stay available outside task counts.
- Add optional exact-supplier reviewed historical report appendices to copied,
  downloaded and email drafts, preserving dates/page/source/review provenance
  without claiming current noncompliance or compensation entitlement. English/
  Spanish controls remain; sample mode excludes real findings and contacts.
- Record externally completed sending only after attestation and nonfuture-date
  validation. Record resident response notes, follow-up date, closure/reopening
  and deletion separately from advisory status and unverified agency processing.
  Reply/follow-up drafts retain the recorded destination; warn against duplicate
  complaints and replacement of the single sending record/response notes.
- All draft/progress data remains open-guide memory, with loss warnings; no
  server/browser persistence, uploads, automatic sends or reminders added.
- Local Node 24.22.0 checks: 477 unit/integration tests and production build pass;
  16 targeted help browser checks pass, including en/es at 1440/390/320px,
  source-appendix downloads, sending guards, response versus closure, deletion,
  reload reset and no external/API mutation requests. Correct scoped mobile
  contact layout and prevent task navigation inheriting fixed app-nav styling.
  Full browser suite not rerun; earlier unrelated failures remain unverified.
  No deployment, real submission or device-delivery verification performed.

### 2026-10-20 — Four combined help steps (wireframes only)

- Consolidate the proposed help journey into Contact, Prepare, Send & record,
  and Follow up, with a four-item progress bar. Combine recipients with contacts,
  evidence with drafts, external handoff with recording, and responses with
  follow-up. Guidelines remain accessible on every panel outside the task count.
  Follow-up completes only through resident-controlled closure, not a response
  or elapsed time. The actual app is unchanged; the preview remains synthetic
  and page-memory only.

### 2026-10-20 — Visible help checklist progress (wireframes only)

- Add a seven-step progress bar to the proposed comparison panels, with
  completed/to-do labels, step navigation, next unfinished step and reversible
  checkmarks. Visiting a screen never completes it. Sending completion requires
  the user-confirmed external-submission record and clears when that record is
  deleted. Progress is page-memory only, separate from agency status; no actual
  app behavior, persistent storage or delivery verification added.
- Local Playwright checks passed for manual completion/undo, navigation retention,
  sending confirmation, record deletion, all-complete and reload-reset states;
  all 12 comparison screens fit 1440/390/320px viewports without page errors.

### 2026-10-20 — Contact-first help wireframes (design only)

- Reorder the proposed help comparison to put contacts, recipient selection,
  evidence, drafting and follow-up before detailed guideline screens. Update
  action destinations and tracking returns for the new order. Keep guidelines
  directly accessible and retain the immediate official-notice reminder.
  Actual app behavior and original-process comparison content are unchanged.

### 2026-10-20 — Get Help comparison wireframes (design only)

- Add a standalone fictional 12-screen current/proposed comparison under
  `docs/wireframes/`: urgent guidance, recipient routing, opt-in dated report
  citations, draft/response concepts and a self-reported progress log.
- Tracking is page-memory simulation with deletion; no real sending, persistent
  storage, agency status integration or notifications. Keep the no-advisory
  wizard in the proposal and distinguish unavailable data. Avoid universal
  duration/flushing assumptions. No app behavior changed or implementation
  approval implied; no deployment or delivery verification performed.
- Local synthetic Chromium checks passed for all 12 screens at 1440/390/320px,
  citation selection, reply template, submission confirmation guard, text-safe
  reference rendering, response recording, tracking deletion and no persistent
  storage. No page errors or horizontal document overflow in those checks.

### 2026-10-20 — Approved production deployment

- Deployed source `f9e5966` to the existing Vercel production alias after explicit
  approval. Remote build and guarded live desktop/phone/reduced-motion browser
  checks passed, including the 700ms completed-logo hold and session replay skip.
  No notification or scheduler settings changed; real-device delivery is unverified.
  Record evidence in `VERCEL.md` and ignore CLI-created local metadata/environment
  files. Git pushes alone do not deploy this unconnected Vercel project.

### 2026-10-20 — Production-compatible logo timing

- Move SVG timing from inline style attributes to data attributes and external
  CSS so the existing production security policy permits the drawing animation.
  Keep all contours and timing unchanged; add browser coverage that blocks inline
  style attributes. Deployment verification is recorded separately.

### 2026-10-20 — Hold the finished opening logo (local only)

- Keep the completed, filled logo visible for 700ms before its 240ms exit fade.
  Drawing speed is unchanged; total normal-motion intro is now 2510ms. Preserve
  the reduced-motion alternative and once-per-session behavior. Update README
  and timing coverage.

### 2026-10-20 — Shorten the opening to two seconds (local only)

- Retime drawing, fill, hold and fade to finish at 2000ms; keep WAVE's longer
  drawing sequence and the reduced-motion 650ms alternative. Match the independent
  removal timer to the new duration. Update timing tests and README.

### 2026-10-20 — Session-only SVG logo opening (local only)

- Trace the existing PNG into SVG contours, including the wave and original
  outlined lettering; retain the layout, teal/navy palette and larger WAVE word.
  Draw contours using normalized stroke dashes, give WAVE a longer staggered
  sequence, fill the completed outlines, hold, then fade out within 2.9 seconds.
- Mount the website concurrently. Use sessionStorage to skip replay; respect
  reduced motion with completed artwork and a short fade. Remove the overlay via
  an independent cleanup timer, without capturing input or changing scroll styles.
  Storage denial never blocks the page. Keep the existing header PNG unchanged.
- Local verification: 462 unit/integration tests and the production build pass;
  six focused synthetic Chromium checks cover drawing/fill, session reload,
  reduced motion, responsive centering and post-intro clicks/scrolling. Full
  browser suite not rerun. Nothing deployed; no live notifications sent.

### 2026-10-20 — Focus the website on public-water suppliers (local only)

- Remove waterbody entry points from setup, private-well guidance, place management
  and sample mode. Exclude lake watches, HAB records, changes, history and linked
  lake notices from the website; show supplier-only source/catalog coverage.
- Filter new alert saves to supplier choices. Retain existing stored records and
  preferences without deletion; legacy ADEQ backend ingestion and existing server
  subscriptions are unchanged until users save alert choices or disable them.
- Update English/Spanish scope copy, README guidance and affected interface tests.
- Local verification: 457 unit/integration tests pass with two workers; production
  build passes. Browser suite not rerun. Nothing deployed or sent.

### 2026-10-20 — Clarify waterbody notices and feed dates (local only)

- Lead ambiguous HAB records with the notice type and explicit unconfirmed
  active/lifted status. Highlight the runtime ADEQ feed update date as feed-wide,
  not a lake-record update, new advisory, sampling date or condition change.
  Correct that label in notice details and check/history views in both languages.
- Separate Agency record and WAVE check history disclosures; keep the original
  issue date and published location in a simple fact list. Remove the redundant
  place-help section and empty reason field. Preserve failure/staleness warnings,
  source links, explicit lift semantics, coverage and the waterbody/tap-water
  distinction. No live-data/schema migration or notification changes.
- Local checks: 455 unit/integration tests passed (two workers), production build
  passed, and 10 focused synthetic browser checks passed, including English and
  Spanish at 1440/390/320px. Full browser suite not rerun; no deployment or real
  notifications. README documents the feed-level date semantics.

### 2026-10-20 — Shared waterbody advisory formatting (local only)

- Use the supplier advisory-history layout for lakes/waterbodies, with HAB labels,
  ADEQ issued/updated/lift fields and explicit missing-value labels. Keep unknown
  lift status unconfirmed. Retain source checks separately in the compact activity
  disclosure, including the latest attempt. Move repeated notice facts out of the
  place-help section; preserve verified catalog-name matching and source wording.
- Local verification: 453 unit/integration tests passed (two workers), build
  passed, and 10 focused synthetic browser checks passed, including English and
  Spanish advisory layouts at 1440, 390 and 320 pixels. Full browser suite not
  rerun; no deployment or real notifications.

### 2026-10-20 — Home card alignment (local only)

- Remove the visible My Water heading, retaining its screen-reader heading.
  Align the main card column with Add a place on desktop; keep Add a place
  above the cards on phones. Build and six focused English/Spanish browser
  checks at 1440px, 390px and 320px passed; not deployed.

### 2026-10-20 — Larger warning icon (local only)

- Increase the status-card warning icon from 48px to 72px, about three body-text
  line heights, retaining the centered compact grouping. Build and 30 focused
  synthetic browser layout checks passed in English/Spanish at desktop and
  phone widths. The full browser suite was not rerun; not deployed.

### 2026-10-20 — Consistent status summaries on every card (local only)

- Apply the compact, centered status heading and explanation treatment to all
  supplier and lake cards, including active, no active notice found, unavailable
  and never-checked states. Keep agency-specific wording, status colors and
  existing icon presence unchanged.
- Build and 34 focused synthetic browser checks passed, covering supplier and
  lake states in English/Spanish at 1440, 390 and 320 pixels. The full browser
  suite was not rerun. No deployment or external sending.

### 2026-10-20 — Compact centered boil-notice summary (local only)

- Center the warning icon and notice text together, reduce the icon/text and
  heading/details gaps, and size the square icon to two body-text line heights.
  Preserve affected-area wording, reasons, provenance and other status layouts.
- Build and 16 focused synthetic browser checks passed, including six new
  centered-summary cases in English/Spanish at 1440, 390 and 320 pixels.
  The full browser suite was not rerun. No deployment or notifications sent.

### 2026-10-20 — Existing help-step formatting (local only; not deployed)

- Keep the current five-step guide and its behavior; use one consistent existing
  panel for each step's heading, content and navigation. Match the app's narrow
  page width and spacing, and remove the draft editor's nested card treatment.
- Align notice-checklist text and actions without dotted leader lines; stack
  actions below their instructions on phones. Preserve manual progress, source
  facts, contacts, draft edits, English/Spanish behavior and safety warnings.
- Local checks: all 447 tests passed with `npm test -- --maxWorkers=2`, build
  passed, and six new sample-only browser layout cases passed in English and
  Spanish at 1440, 390 and 320 pixels. An initial default-worker test run hit an
  unrelated compiled-API timeout; that test passed independently and in the
  complete two-worker rerun. The full browser suite was not rerun. No deployment
  or external sending.

### 2026-10-20 — Lake card lower-section consistency (local only; not deployed)

- Replace the lake card's nested lower menu with three independent disclosure
  rows and a visible full-width details action. Match supplier row typography,
  dividers, spacing and button treatment; retain lake-specific evidence, coverage,
  uncertainty wording and keyboard focus indicators.
- Keep the lake safety qualification inside its details disclosure, with the
  page-level safety disclaimer unchanged. Extend synthetic layout checks to the
  lower sections in English/Spanish at desktop and phone sizes.
- Local verification: eight browser checks, 41 focused component tests and the
  production build pass. No deployment or live notifications.

### 2026-10-20 — Consistent home status cards (local only; not deployed)

- Align lake and supplier headings, left-aligned status panels, freshness rows and
  action buttons. Use a matching outlined official-source button, and stack both
  cards' actions on narrow screens. Preserve agency-specific notices and details.
- Match unavailable-status wording and avoid duplicate county suffixes in lake
  headings without changing source records. Add synthetic English/Spanish desktop
  and phone layout checks; no live retrieval, notifications or deployment.
- Local verification: eight new browser checks, 44 focused component tests and
  the production build pass. Full unit/integration run: 449 pass, three failures
  in separate help/deletion work; this batch does not repair those paths.

### 2026-10-20 — Withdraw Water Help redesign (local only)

- Remove the local Water Help workspace and saved-communications implementation
  at the user's request; restore the previous guide and preparation tools.
  Preserve separate home-card formatting and repository-cleanup work. No deployment.
- Rollback verification: all 445 unit/integration tests and the production build
  pass; diff whitespace checks pass.

### 2026-10-20 — WAVE-only repository cleanup (local only; not deployed)

- Preserve older Python projects, their tests/dependencies and unrelated research
  in a hash-verified backup outside the repository; remove them from the current
  working tree. Preserve WAVE source, tests, research and deployment paths.
- Replace the root overview and agent guidance with WAVE-only instructions.
  Shorten the app README and retain its full dated evidence in
  `IMPLEMENTATION-NOTES.md`. Exclude development captures and generated output
  from tracked submission files.
- No app behavior, data migration, Git-history rewrite, deployment or competition
  submission is included in this cleanup.
- Cleanup verification under Node 24.22.0: 445 unit/integration tests and the
  TypeScript/Vite production build pass; local Markdown links and diff whitespace
  checks pass. Full synthetic Playwright run: 78 pass, 22 fail on reference-card
  geometry/element expectations and provider/help section-order expectations.
  Runtime source, browser tests and deployment configuration are unchanged;
  these failures were not repaired in the documentation/cleanup batch.

### 2026-10-19 — Supplier section order (local only; not deployed)

- Reorder shared supplier cards to **Provider information → Advisory history → Service questions?**, preserving disclosure content and behavior in English and Spanish.

### 2026-10-19 — Contained report issues and simpler provider information (local only; not deployed)

- Right-align the issue toggle beside the report heading and keep all expanded issues inside the yellow summary panel, with responsive wrapping on narrow screens.
- Remove the redundant **Supplier details & tools** action from the shared provider-information layout across suppliers. Preserve reports, provider facts and direct guided help.
- Verified 443 unit/integration tests, the production build and 10 focused desktop/phone browser cases, including EN/ES alignment, panel containment, 320px overflow and updated sample/deep-link journeys. Inspected desktop/phone renders; full browser suite not rerun. No backend, advisory-data or notification changes; no deployment.

### 2026-10-19 — All-supplier annual reports in Provider information (local only; not deployed)

- Connect the 35 scoped suppliers to exact-ID 2025 report records: 32 reviewed (including explicitly conflicting Central Logan findings), Springdale's year mismatch unreviewed, and two unavailable reports with ADH search/directory provenance. Retain original PDF-page links and document-scoped limits; no live-status, backend or notification changes.
- Keep findings numbered and initially collapsed. Distinguish formal violations, significant deficiencies, upstream supplier results and document conflicts. Show inspection dates/progress rather than invented violation dates; group identical findings with separate reported intervals without inflating counts. Preserve EN/ES, desktop columns and mobile stacking.
- Correct four research-manifest city IDs to the existing app catalog IDs; source PDFs, URLs and hashes are unchanged. Coverage tests compare every manifest record and all four catalog suppliers.
- Verified 373 unit/integration tests in 44 files, production build and 40 focused desktop/phone EN/ES browser cases, including 320px overflow, keyboard disclosure, source links and unchanged synthetic active-notice status. Inspected desktop/mobile renders. Full browser suite not rerun; no deployment.

### 2026-10-19 — All-supplier ADH annual-report research (local archive only)

- Use ADH's public form search to retrieve 33 requested-year 2025 PDFs across all 35 currently represented drinking-water systems; preserve original PDFs, extracted text, exact supplier/PWS mappings, URLs and SHA-256 hashes under `docs/research/adh-ccr-2025/`.
- Document findings, reported dates/actions and significant deficiencies separately from formal violations and upstream-supplier findings. Flag contradictory Central Logan HAA5 information, Springdale's year mismatch and two unmatched searches rather than infer reassuring results or substitute similarly named systems.
- Research/documentation only: no runtime catalog, UI, live advisory, backend or notification changes; no deployment. Verified 35 unique supplier mappings, persisted-system coverage, all 33 PDF signatures/sizes/hashes and extracted page counts, local links and review totals. No app tests rerun for this research-only batch.

### 2026-10-19 — Consistent supplier profiles and reports (local only; not deployed)

- Reuse the source-water and six-fact directory layout across Leisure Hills, Bentonville, Fayetteville, Rogers and Springdale with exact supplier IDs and independently verified facts/provenance. Unknown suppliers show an explicit unverified source-water state.
- Review the 2025 Bentonville, Fayetteville and Rogers reports and display document-scoped no-violations findings. Preserve Leisure Hills' four issues. Flag Springdale's conflicting 2024 title / 2025 results as unreviewed, with the original PDF link rather than inferred findings.
- Keep contacts, history, provider details and guided help available across active, no-notice and unavailable advisory states in EN/ES. Active-notice checklists remain conditional; sample data and lakes do not inherit real supplier records. No live-status, backend, persistence or notification changes.
- Verified 340 unit/integration tests, the production build and 20 focused desktop/phone EN/ES browser cases, including 320px overflow checks and Leisure Hills regressions. Inspected rendered Bentonville/Springdale layouts. Full browser suite not rerun; no deployment or submission.

### 2026-10-19 — Numbered annual-report issues (local only; not deployed)

- Present expanded annual-report problems as a semantic numbered list, preserving the fact hierarchy and report links in both languages.

### 2026-10-19 — Annual-issue fact hierarchy (local only; not deployed)

- Match the notice wireframe for expanded annual issues: short navy headings, dotted leaders to PDF-page links, and labeled start/end dates above the finding and corrective action in a two-column desktop grid. Stack fields and links on phones.
- Preserve full reported findings, report-qualified “Current” wording, the default-collapsed summary, source-water information and independent provider details in English and Spanish.
- Verified 304 unit/integration tests, the production build and four focused EN/ES desktop/phone browser cases, including column/stack geometry and 320px overflow checks. Inspected rendered screenshots; full browser suite not rerun. Not deployed.

### 2026-10-19 — Issues-first annual report (local only; not deployed)

- Lead Provider information with Leisure Hills' manually reviewed 2025 annual report: four collapsed compliance issues, category counts, reported periods/corrective actions and original PDF/page links. Label “Current” as report wording, not a verified current condition.
- Add groundwater/aquifer context and independently expandable six-fact provider details with directory provenance. Preserve EN/ES, sample isolation and live advisory status.
- Offer only the verified provider/year. Unreviewed suppliers link to ADH search without reassuring findings; reviewed-empty and unavailable variants have synthetic component coverage only. No automatic PDF retrieval, new backend or notification behavior.
- Verified 304 unit/integration tests, TypeScript/Vite production build and 16 focused desktop/phone EN/ES browser cases (including 320px). Inspected rendered report layouts; full browser suite not rerun. No deployment or submission.

### 2026-10-19 — Simplified info popup and aligned check date (local only; not deployed)

- Remove all requested lower popup sections: CDC guidance, original source wording, coverage/safety notes, duplicate official/detail links and data-source activity. Preserve the checklist, provider contacts and unavailable states; published wording remains in advisory history/detail views.
- Right-align the popup's last successful check with a dotted leader on desktop and mobile. Other date rows are unchanged.
- Update popup regression/browser checks and retain standalone source-history test coverage. Update README usage; no deployment.
- Verified 298 unit/integration tests, four English/Spanish desktop/mobile popup browser checks, the TypeScript/Vite build, and a clean whitespace diff.

### 2026-10-19 — In-app notice checklist (local only; not deployed)

- Expand the supplier info popup with published area, reason and issue date, plus a three-step English/Spanish checklist with official-notice, affected-area and help actions.
- Show manual completion progress without changing advisory status; progress resets on close/reload. Include the saved successful-check time, provider contacts and general boil-water guidance. Failed/stale checks remain unavailable instead of presenting an active checklist.
- Preserve official external links, original source wording, and keyboard close/return focus. Add unit and guarded desktop/mobile browser coverage.
- Verification: 297 unit/integration tests, all four new English/Spanish desktop/mobile checklist cases, and the TypeScript/Vite build pass. The full browser suite passes 50/60 cases; ten reference-card geometry cases still assume the earlier primary-button class and side-by-side mobile actions, conflicting with the prior action-button redesign.

### 2026-10-19 — Bold supplier check/source actions (local only; not deployed)

- Set “Check now” and “View official source” to bold (700) on supplier cards, preserving colors, layout and behavior.

### 2026-10-19 — Revised action colors (local only; not deployed)

- Change the supplier help button to `#047885` and the light-aqua official-source label and arrow to white as requested. Layout and guide behavior are unchanged. White on light aqua does not meet WCAG AA text contrast.

### 2026-10-19 — Logo-colored supplier actions (local only; not deployed)

- Use the logo's light aqua (`#46cccd`) with navy text for supplier-card “View official source” actions across evidence states.
- Replace the expandable help section and “Open guide” step with a full-width navy (`#02285a`) button at the bottom of the supplier card. Open the existing English/Spanish guide directly and preserve keyboard navigation and return focus. Stack source/check actions below 420px; lake cards are unchanged.
- Verified 294 unit/integration tests, six guarded English/Spanish browser cases at 320/390/1366px, and the TypeScript/Vite build. No deployment.

### 2026-10-19 — Two-line active notice context (local only; not deployed)

- Put affected area and reason on separate lines beneath the active supplier headline, retaining centered alignment, original source content and missing-field handling.

### 2026-10-19 — Source-backed active notice subtext (local only; not deployed)

- Add affected area and reason beneath the linked active supplier headline using each active ADH record, not hardcoded supplier text or generated advice. Preserve specific area/exception wording and reason text, use the existing exact whole-system display normalization, and omit missing fields. Multiple active notices remain separate; failed/stale source states do not present retained details as current.
- Localize labels in English/Spanish while marking unchanged agency text as English. Keep the ADH headline link and existing unavailable/no-notice explanations.
- Verified 294 unit/integration tests, 16 guarded English/Spanish browser cases, and the TypeScript/Vite build. No deployment.

### 2026-10-19 — Linked active supplier headline (local only; not deployed)

- Remove “Follow the official notice for instructions” from supplier cards and their information dialogs. Link the live active boil-water headline directly to ADH with a text fragment using the fetched agency supplier name; fictional sample headlines remain unlinked.
- Compatible browsers can highlight/scroll to the matching supplier; this does not reorder ADH's table or create an individual notice page. Unsupported browsers or missing matches fall back to the official list. Keep unavailable/no-notice explanations and source buttons unchanged.
- Verified 288 unit/integration tests, 16 guarded English/Spanish browser cases, and the TypeScript/Vite build. Read the current ADH page and confirmed its Leisure Hills row; cross-browser text-fragment scrolling is not guaranteed. No deployment.

### 2026-10-19 — Shorter supplier section actions (local only; not deployed)

- Remove the duplicate ADH profile link from the supplier-card Provider information section; retain the same directory destination under Service questions and on the standalone supplier profile. Keep annual reports and advisory-source links.
- Shorten the help section's action to “Open guide” / “Abrir guía” without changing its descriptive section title, navigation or return-focus behavior.
- Verified 285 unit/integration tests, 12 guarded expanded-layout/guide browser cases in English/Spanish at 320/390/1366px, and the TypeScript/Vite build. No deployment or real calls, emails or submissions.

### 2026-10-19 — Remove repeated supplier-card footer (local only; not deployed)

- Remove the requested published-notices/safety footer from supplier cards. Retain state-specific explanations and safety limitations in supplier information dialogs, history limits and other existing guidance; lake cards are unchanged.
- Audited section repetition without removing other content: the directory contact and ADH profile share a destination; history source icons repeat the main official-list destination; service/billing help reuses provider contacts. Verified 283 unit/integration tests and the TypeScript/Vite build.

### 2026-10-19 — Consistent provider disclosure icon (local only; not deployed)

- Replace the Provider information text glyph with the shared disclosure icon so its +/− size, weight and right alignment match the other supplier sections. Preserve visible keyboard focus and expanded-state behavior.
- Verified six disclosure tests, desktop/phone browser checks at 320/390/1366px comparing icon geometry and typography, and the TypeScript/Vite build.

### 2026-10-19 — Title-only supplier sections (local only; not deployed)

- Keep Service questions, water-issue help, Advisory history and Provider information as separate collapsed titles with individual + controls; do not add a More details wrapper. Move provider source links inside its expanded panel, preserving existing facts, provenance, contact destinations and help flow.
- Keep current status, source-check explanation, last successful check, check/source actions and safety caveat visible. Reopen the help section before restoring keyboard focus when returning from the guide. Lake cards and backend behavior are unchanged.
- Verified 283 unit/integration tests, 56 guarded desktop/phone browser cases and the TypeScript/Vite build. No deployment or real calls, emails or submissions. This supersedes the always-visible contact row and provider-header links described in the earlier entry below.

### 2026-10-19 — Approved supplier disclosure wireframes (local only; not deployed)

- Apply the three reviewed wireframes: compact Service questions row with directly linked ADH directory caption; advisory rows with dated facts, dotted-leader source icons and centered status banners; six-fact Provider information with source links visible in its header even when collapsed.
- Show five distinct saved notices at a time, newest agency-issued date first, with undated records last. Replace nested history details with one archive-limits footer. The info icon explicitly opens the general ADH list, not an individual historical notice. Keep supplier tools available separately.
- Preserve exact supplier/contact matching, original agency wording, explicit-lift requirements, unavailable/stale source behavior, fictional sample isolation and English/Spanish controls. No source-fetching, backend, routing, persistence or hosting changes; no real calls, emails or submissions.
- Verified 282 unit/integration tests and 56 guarded desktop/phone Chromium cases, including expanded EN/ES layouts at 320/390/1366px and keyboard disclosures; TypeScript/Vite build passes. Human Spanish review and real-device verification remain outstanding. The October 18 descriptions below record earlier iterations.

### 2026-10-18 — Visible contacts, scannable history and guided help (local only; not deployed)

- Show full verified phone/email links at every width, stacked and wrapping on phones; replace disabled missing-contact icons with visible explanations. Preserve exact supplier IDs, targets, sample isolation and the October 14 contact provenance date. The October 18 supplier-directory check reconfirmed phone only.
- Rebuild expanded advisory history around status, raw agency dates, affected area and reason. Keep one Notice details disclosure for full supplied fields, grouped missing fields and observation evidence; preserve archive filtering, pagination, uncertain status and explicit-lift semantics. Separate Provider information from a direct guided-help entry.
- Add a five-step English/Spanish guide for service, quality/health, consumer disputes and legal help, reusing the existing five draft kinds, per-template edits, local copy/download and preparation packets. Back/Next preserves drafts; context/language changes and leaving/reloading/closing can discard them. Loss warnings are informational, not confirmation dialogs or reload protection.
- Verify the non-emergency ADH Safe Water Engineering phone (501) 661-2623 against its official drinking-water plan-review page on October 18; check AG form/PDF and legal-help destinations read-only. Keep emergency guidance, agency jurisdiction/eligibility limits, AG business-sharing/public-record warnings and external-filing boundaries explicit. No new persistence, automated sending or case tracking.
- Verified under Node 24: 277 unit/integration tests across 37 files, 56 guarded desktop/phone Chromium cases, TypeScript/Vite production build and `git diff --check` pass. Inspected expanded EN/ES history/provider and guide screenshots at 320/390/1366px; tested keyboard focus, full email wrapping and navigation clearing the mobile bottom bar. Checked the running localhost:5178 sample guide without stopping the app.
- Local only: no deployment, real calls/emails, form submissions or notification sends. Human Spanish review and real-device delivery remain unverified. The older horizontal/icon-only contact description below records the prior local iteration, not the current layout.

### 2026-10-18 — Reference-matched supplier cards (local only; not deployed)

- Center supplier findings; use a 56px outline warning only for active notices. Fresh successful no-match findings have specific boil-water copy and no icon; unavailable explanations and retained historical evidence are unchanged.
- Emphasize the official source for active notices and Check now otherwise, with equal-width actions and a 12px gap. Add a dotted successful-check leader on desktop and readable stacked timestamps on phones.
- Replace contact glyphs with outline SVGs; preserve verified targets and accessible disabled explanations. Keep the service bar horizontal, use accessible icon-only contact controls on narrow phones, and remove the doubled history divider.
- Keep the complete water-safety qualification visible in every supplier state. Branding, column proportions, status calculation, persistence, recovery and notification logic are unchanged.
- Verified under Node 24: 270 unit/integration tests, 44 guarded desktop/phone Chromium cases, TypeScript/Vite build and `git diff --check` pass. Synthetic active/no-match/failed/stale/unchecked layouts cover 320/390/1366px; local EN/ES sample views were inspected. No real sends or deployment; human Spanish review and real-device delivery remain unverified.

### 2026-10-18 — Copy-cleanup regression follow-through (local only; not deployed)

- Kept the official-source escape visible for unmatched searches and made missing history issue dates explicitly unknown, without changing matching or observation semantics.
- Removed repeated lake coverage and Sources/notification disclaimers while retaining their distinct non-claims and official links.
- Final local verification: 265 unit/integration tests, 34 guarded desktop/phone Chromium cases, TypeScript/Vite build and `git diff --check` pass. Sequential reruns passed after simultaneous test/build activity hit timeouts; no timeout settings changed. No push or deployment performed.
- Inspected English mobile and Spanish desktop sample views in the local browser. Tests use synthetic records and block external requests/API mutations; real-device notification delivery and human Spanish review remain unverified.

### 2026-10-18 — WAVE concise copy (local only; not deployed)
- Consolidated English/Spanish status headlines, meaningful empty check times,
  notification state copy, and Home/Places/Settings introductions.
- Added closed coverage, observation and notification disclosures; grouped privacy
  facts and platform-relevant installation guidance. Deletion now requires an
  inline confirmation while retaining the existing failure/retry credentials.
- Verification completed as recorded above; no backend, matching, delivery or retention changes.
- Sources now groups live feeds, directory coverage and non-claims ahead of
  curated references. Detail and supplier history retain issue/lift evidence
  while app observation metadata moves into closed disclosures.

### WAVE card hierarchy and consistent disclosures (local only) — 2026-10-18

- Move Add a place to the My Water heading. Preserve the wave logo, navigation,
  language controls and original desktop column proportions. Use system typography,
  #102E43 headings, 16-pixel primary text/actions and 16-pixel white-card corners.
- Lead cards with provider/agency, tinted status and one explanation, actual last
  successful check with timezone, Check now using the existing refresh flow, and
  a prominent outlined official-source link. Never-checked wording is distinct
  from failed/stale sources; no advisory remains explicitly not proof of safety.
- Keep exact-ID verified contacts in one row on phone and desktop. Show a disabled,
  accessibly explained Email control where no email is verified; invent no targets.
  Keep full contact provenance and published facts within Provider details & help.
- Start Advisory history and provider help closed. Use decorative right-aligned
  +/− indicators for native and custom disclosures sitewide, without changing
  navigation, selects or external-link arrows. Keep recovery tasks, drafts,
  historical evidence, sample isolation and notification configuration unchanged.
- Verification: 250 unit/integration tests pass with one worker, 30 guarded browser
  cases pass, and TypeScript/Vite build passes. Review includes 320/390/1366-pixel
  layouts, contact alignment and keyboard disclosure toggles. Default parallel unit
  runs hit existing PGlite test timeouts; test configuration was not changed.
  No deployment, calls, emails, notification sends or delivery verification.
  Human Spanish review and real-device checks remain open.

### Source-first UI and bounded notification configuration (local only) — 2026-10-18

- Simplify onboarding to the published-advisory introduction and immediate supplier/
  lake choices. Keep the water-safety qualification visible; move acronym and
  coverage explanations into closed About WAVE disclosures.
- Put readable names, distinct statuses, last successful check with timezone and
  prominent official-source links ahead of secondary tools. Compact verified
  provider contacts, expand provenance on demand, and remove dotted fact leaders.
  Preserve published facts, unavailable/stale explanations and historical records.
- Reveal service-question, reimbursement, complaint and assistance editors only
  after task selection; retain follow-up, per-task edits, copy/download, draft-loss
  warnings and qualifications. Nothing is automatically sent or filed.
- Bound notification configuration checks to 10 seconds; expose loading, ready,
  unsupported, unavailable and error states with retry where applicable. Separate
  local preferences, browser permission and registration evidence from unverified
  delivery; do not imply connected email alerts.
- Keep persistent sample banners and concise fictional labels. Preserve the logo
  and navy/teal theme; improve phone/laptop alignment and 44-pixel language controls.
- Verification: 242 unit/integration tests, 28 guarded desktop/phone browser cases
  and TypeScript/Vite build pass. Browser checks cover onboarding, add/confirmation,
  navigation/history, template editing/downloads, sample scenarios/exit, source
  failures and 320/390/1366-pixel layouts. No deployment, real notification sends
  or new delivery verification; human Spanish review and real-device checks remain.

### Approved Task 5 production deployment — 2026-10-18

- Deployed the five approved UI/wording fixes to `water-alert-blond.vercel.app`,
  superseding their local-only status below. Isolated release preserves the
  deployed backend/scheduler/configuration and excludes unrelated checkout changes.
- Release snapshot: 219 unit tests, 24 guarded browser cases and local/remote
  builds pass. Public assets match tested bytes; enabled push config fingerprint
  is unchanged. Read-only HTTP and guarded production-browser checks pass.
  Deployment ID, evidence and remaining human/device/link limits are in `VERCEL.md`
  and `CAC-CHECKLIST.md`. No notification sends or scheduler/environment changes.

### Provider-contact disclaimer scope (local only) — 2026-10-17

- With user approval, clarify English/Spanish contact text: the site does not
  automatically call or email the provider. Remove the broader no-messages claim,
  which could contradict separately opted-in push. Contact destinations and push
  behavior are unchanged.
- Both new language regressions failed before the fix. All 232 Vitest tests,
  24 guarded browser tests and TypeScript/Vite build pass; four isolated rendered
  contact checks pass. `CAC-CHECKLIST.md` records the bounded review, retained
  unsaved-edit warning, privacy evidence and unresolved human/device/link limits.
  No deployment, contact actions, notification sends or scheduler changes.

### Missing saved-notice links (local only) — 2026-10-17

- With user approval, show an explicit English/Spanish unavailable panel when a
  saved notice ID or its place cannot be resolved, rather than leaving ordinary
  home/current notices visible. Preserve exact historical-record selection and
  offer return home; do not claim permanent deletion or substitute another notice.
- Missing-ID/place regressions failed before the fix; all 24 guarded E2E cases
  and TypeScript/Vite build pass. All 230 Vitest tests pass on sequential rerun;
  the earlier parallel run had one database-access timeout. Checklist records
  isolated browser evidence and real-device limits. Not deployed; no sends,
  production, scheduler or push changes.

### Spanish continuity into sample mode (local only) — 2026-10-17

- With user approval, preserve the current UI language when entering sample mode.
  Other sample choices stay isolated; exiting restores saved live preferences.
  No live/server push preferences, scheduler settings or production changes.
- New and saved sample-mode browser regressions failed before the fix and pass
  afterward. All 14 guarded E2E cases, 230 Vitest tests and TypeScript/Vite build
  pass. Not deployed. `CAC-CHECKLIST.md` records bounded Spanish UI checks,
  English-template/source distinctions and pending fluent-speaker/device review.

### Mobile keyboard-focus spacing (local only) — 2026-10-17

- With user approval, add bottom scroll margin to mobile input/select/textarea
  controls so keyboard focus clears the fixed navigation, including safe-area inset.
  No redesign, production, scheduler, push or storage changes.
- Added a Tab-to-draft-editor browser regression at 320/390/760px, observed failing
  before the CSS change and passing afterward. All 10 guarded E2E cases, 230 Vitest
  tests and TypeScript/Vite build pass on Node 24; fresh screenshots confirm the
  editor outline clears navigation. Not deployed or verified with a phone keyboard.
- `CAC-CHECKLIST.md` records bounded keyboard/dialog/label/non-color checks and
  remaining real-device, Safari and assistive-technology limitations.

### Tablet header overflow fix (local only) — 2026-10-17

- With user approval, reduce only the logo width at 761–900px to keep desktop
  navigation and language controls inside the header when scrollbars reserve space.
  Phone and full-desktop logo sizes, content, push and scheduler are unchanged.
- Added a browser regression at 761/768/820/900px with a stable scrollbar gutter;
  it failed before the fix and passes afterward. All eight guarded Chromium E2E
  cases, 230 Vitest tests and TypeScript/Vite build pass on Node 24. E2E used
  the existing isolated UI server through a temporary config without a webServer
  launcher. Browser-panel tablet retest no longer shows horizontal scrolling.
- Evidence and real-device/Spanish limitations recorded in `CAC-CHECKLIST.md`.
  No deployment, production changes, notification permissions or sends.

### One approved production-device test arrived and opened the app — 2026-10-17

- Enrollment troubleshooting used read-only verified-TLS queries. A saved-screen
  screenshot corresponded to the isolated test environment: at 21:07:04Z it held
  two subscriptions, production zero. Compared each public source timestamp to
  its database to confirm the environment mapping; no subscriptions were removed.
- After opening the canonical production Home Screen app, verified exactly one
  recent, unexpired Apple subscription at 21:08:59Z, with one watch, one explicit
  lift selection and English. User separately approved one labeled production test.
- Revalidated the exact production key and sole recipient, then attempted exactly
  one direct operator push labeled `WAVE PRODUCTION TEST ONLY`, explicitly not an
  agency advisory, linking to the production home. Apple returned HTTP 201. A
  private mode-0600 attempt receipt was written before sending; no retry, fake
  incident, source mutation, cron execution or advisory-drain invocation occurred.
  User answered “yes” when asked to confirm arrival and tap-through opening WAVE
  Original. Locked/background state was not separately established. This confirms
  this direct transport test, not the scheduled advisory pipeline or reliability.
  No application code changed; no additional send is authorized.

### Production push enabled and deployment verified — 2026-10-17

- User approved the operator contact for production. Generated a new VAPID pair
  distinct from test keys; saved it only in ignored, untracked mode-0600
  `.env.push-production.provisioning` and three sensitive Production-only Vercel
  variables. Enabled the existing production push flag; retained other settings.
- Rebuilt/redeployed the previous production deployment, not the shared dirty
  checkout: `dpl_6LCVnamQNHzqwnxXmwbRSvi3kNoN` is READY at
  `https://water-alert-blond.vercel.app`. Existing UI asset references, local `.env`
  and production project link are unchanged. No application code or guards changed.
- At `2026-10-17T20:52:54Z`, seven read-only checks passed: HTML/worker, enabled
  public config matching the distinct production key, database-backed status,
  no-store, unauthenticated cron 401 and foreign-origin 403. Both sources had
  error-free success timestamps approximately 20:45:19Z (453 seconds old).
  Verified-TLS READ ONLY queries confirmed zero production subscriptions before
  configuration, before deployment and after activation; two existing journal
  events remain. No manual authenticated cron, source mutation, replay or test send.
- Fifteen targeted config/cloud/push tests passed. Existing scheduler was not
  changed; recent job timestamps are point-in-time evidence, not a cadence or
  reliability guarantee. Production-device opt-in/delivery, deployed automatic
  advisory-to-push execution, day-long observation and quota review remain open.

### Production push activation preflight — 2026-10-17

- User authorized production-only push configuration/deployment. Before changing
  settings, verified the existing Hobby project and restricted production database
  with TLS and READ ONLY queries: zero subscription records/recipients, so no
  current broadcast target. Public config was disabled at preflight. Both source snapshots
  had successful checks at approximately 20:45:19Z, no errors, and were about
  four minutes old at inspection. Two existing journal events were not replayed.
- Production VAPID public/private keys and operator contact were absent both locally
  and in hosted variable metadata. The previously supplied email was approved for
  test use only; at this preflight, production contact approval was pending rather
  than silently reusing it. No keys generated, settings changed, deployment, cron
  invocation, source mutation or send at that point. Local `.env` retains its
  differing local origin and was not used as a production configuration bundle.
  Activation/delivery and day-long reliability/quota gates were not marked complete
  at preflight; subsequent activation evidence is recorded above.

### Approved bounded push verification batch results — 2026-10-17

- Extended the local cloud-path test with Spanish preference updates, removed-watch
  and historical replay suppression, failed-source evidence retention, recovery,
  and idempotent device deletion across app instances. Six targeted test files:
  40 passed; TypeScript check passed. No shipped application code changed.
- User approved up to two labeled test notifications plus preference/removal
  verification and cleanup. A private temporary driver uses the actual cloud-app
  cron/parser/drain path with fictional feeds and a private embedded PostgreSQL
  database; hosted advisory history is never populated with fixtures. Test-only
  credentials/subscription are read privately with verified TLS; real production
  push remains disabled. Driver records an attempt before transport, caps the
  batch at two, and will not retry an uncertain/failed send.
- First new-notice rehearsal: one Apple transport attempt accepted with HTTP 201;
  repeated drain produced no duplicate attempt. This is local cloud-code plus
  real provider transport, not deployed Vercel/scheduler end-to-end verification.
  User confirmed first arrival while the phone was locked. Initial lift preflights
  stopped before transport while server choices remained unchanged. After the
  user saved changes, verified Spanish, one watched place and its lift selection;
  sent the second labeled lift test through the same isolated cloud path. Apple
  returned HTTP 201; repeated drain produced no duplicate attempt. Batch transport
  count is two (budget exhausted); user confirmed the second phone arrival and
  subscription removal. Verified zero hosted devices and unchanged hosted advisory
  evidence using read-only TLS queries. Removed the private local fixture database,
  copied subscription, local bearer and temporary sender; retained only a redacted
  mode-0600 result receipt. Test-project credentials are retained privately for
  authorized operations; test push remains configured with no devices. An initial
  local credential-key parsing check stopped before any receipt or send and was
  corrected before the first transport attempt.

### Recording-only cloud alert-flow preparation — 2026-10-17

- Added `tests/cloud-push-flow.test.ts`: local cron authentication, synthetic
  agency-shaped feed parsing, embedded PostgreSQL persistence, device enrollment,
  future new/lift selection and duplicate suppression across independent app
  instances. The sender only records payloads; real `web-push` transport is guarded
  against invocation. No hosted credentials or database are used.
- Targeted rehearsal/PostgreSQL tests: 18 passed; TypeScript check passed. This is
  local preparation, not hosted advisory-triggered or closed-app iPhone delivery
  verification. No deployment, source fetch, hosted mutation or notification send;
  production configuration unchanged.

### One approved iPhone test push accepted by provider — 2026-10-17

- User installed the separate test Home Screen app, selected Leisure Hills Mobile
  Home Park and Bentonville Water Utilities, and provided a screenshot showing
  subscription saved. Read-only TLS checks confirmed exactly one unexpired Apple
  push device with those two choices; catalog entries were resolved alongside
  observed places. An initial preflight stopped before any send on that distinction.
- With explicit single-send approval, made exactly one direct `web-push` transport
  attempt titled `WAVE TEST ONLY`, with a non-advisory body and test-app home link.
  Apple's push service returned HTTP 201. No automatic retry, advisory injection,
  source check, deployment or production send. Private receipt contains no
  subscription endpoints, encryption keys or deletion credentials.
- User subsequently confirmed the notification arrived on the iPhone and tapping
  it opened the test app. This verifies one transport/display/tap-through case,
  not closed-app or locked-screen behavior (not established). It does not validate hosted
  advisory-change matching, scheduled drains, new/lift alerts or failure recovery.
  Updated `PUSH-PLAN.md`; production activation remains separately gated.

### One isolated baseline source check, no sends — 2026-10-17

- With explicit approval, verified zero test devices and no prior source baseline,
  then invoked the isolated test app's authenticated check exactly once. Both
  sources succeeded at `2026-10-17T20:10:07Z`: ADH parsed 30 records and ADEQ 52.
  These are parsed feed records, not counts of active advisories.
- Read-only TLS database/API checks confirmed two schema-validated captures,
  82 archived records, 65 stored places, one successful check per source, zero
  baseline events and zero devices before/after. No notifications were sent.
- No scheduler, enrollment or production changes. Production push remains disabled;
  a single manual check does not establish ongoing checking or delivery. Updated
  `PUSH-PLAN.md`; real iPhone enrollment and controlled arrival testing remain open.

### Push enabled only in isolated test deployment — 2026-10-17

- With explicit approval, enabled the test project's push flag and redeployed the
  same verified application snapshot as `dpl_HRz4e2LSuy2mHPyS35fdFgitXp81` (READY).
  Preflight verified TLS, zero enrolled test devices/captures, valid VAPID inputs,
  Hobby plan and no Vercel cron definitions. No test scheduler was created.
- At `2026-10-17T20:06:58Z`, seven read-only checks passed: test HTML, worker,
  database status, enabled push with the exact test key (compared privately),
  cron 401, foreign-origin 403 and production push still disabled. Test responses
  were no-store; archive/events were empty. Production local link/`.env` unchanged.
- No device enrollment, authenticated source checks or notification sends.
  Device arrival remains unverified. The push-disabled `verify:hosting` command
  no longer applies unchanged to this enabled test deployment. Updated operational
  state and next gates in `PUSH-PLAN.md` and `VERCEL.md`.

### Test-only hosted VAPID configuration, push still disabled — 2026-10-17

- Used the user's approved mailto contact with the previously generated test-only
  keys. Local `web-push.setVapidDetails` validation passed; added the three VAPID
  variables only to the isolated test project's Production environment as sensitive
  values. Retained contact/key material privately, not in tracked documentation.
- Verified variable scope/type, push `false`, unchanged deployment IDs and both
  live apps reporting disabled push with null public keys. No deployment,
  activation, device enrollment or notification sends; production local link and
  `.env` remained unchanged. Updated `PUSH-PLAN.md`; device arrival is unverified.

### Test-only VAPID keys prepared locally — 2026-10-17

- With explicit approval, generated a separate test-only VAPID key pair locally
  using `web-push`; verified P-256 encoding and that the private key derives the
  public key. Saved only to ignored, untracked, owner-only (`0600`)
  `.env.push-test.provisioning`, without printing either key.
- No hosted variables changed, deployment, push enablement or notification sends.
  An approved real contact email/HTTPS URL is still needed before configuration;
  device enrollment and verified arrival remain open. Updated `PUSH-PLAN.md`.

### Isolated test deployment and HTTPS smoke checks — 2026-10-17

- With separate deployment approval, published only `wellpower-wave-push-test` at
  `https://wellpower-wave-push-test.vercel.app`. Deployment
  `dpl_8nCQNq7oWCLUe4bXrFJ5KAwD81dR` is READY in the test project.
- Used an isolated temporary source copy and explicit test project targeting;
  private environment/key/data files were excluded before upload. The production
  checkout's local project link and `.env` hashes remained unchanged.
- Local TypeScript/Vite build and 15 targeted hosting/compiled-API/config/cloud
  tests passed. All six public HTTPS smoke checks passed: HTML, worker JavaScript,
  database-backed status, disabled push, cron 401 and foreign-origin 403, with
  no-store responses. At `2026-10-17T20:00:43Z`, test archive/events were empty;
  production push still reported disabled with a null public key.
- No authenticated cron/source checks, scheduler, VAPID setup, push activation or
  notification sends. Hosted concurrency, failure recovery and real phone delivery
  remain unverified. Updated `VERCEL.md` and `PUSH-PLAN.md` with this deployment gate.

### Isolated Free test hosting configured, not deployed — 2026-10-17

- Reverified Vercel Hobby and created the separate `wellpower-wave-push-test`
  project without Git integration or deployment. Configured Vite, `npm run build`,
  `dist`, Node 24, Fluid compute, `iad1` and a 180-second function timeout.
- Configured six Production-only variables: isolated restricted runtime database
  URL, verified-TLS CA, a new test-only cron secret, cloud enablement, the assigned
  test origin and explicit push `false`. Database/CA/cron values are sensitive;
  the three non-secret settings were independently read back. No VAPID variables.
- Local runtime configuration validation and three targeted configuration/cloud
  tests pass. API inventory confirms zero test deployments; no scheduler or sends.
  Existing production local link/environment stayed unchanged, and its public push
  configuration still reports disabled with no public key. Updated `PUSH-PLAN.md`
  and `VERCEL.md`; HTTPS app/database integration and phone delivery remain untested.

### Isolated test database initialized and verified — 2026-10-17

- With separate setup approval, applied the existing `001-cloud.sql` and
  `runtime-role.sql` only to `WellPower WAVE Push Test`. Four private app tables
  have RLS enabled; the runtime role has CRUD access but no administrative flags,
  table ownership or role memberships. Enabled its login with a separate test-only
  password, using a client-generated SCRAM verifier rather than plaintext SQL.
- Initial TLS verification stopped before changes because the default trust store
  lacked Supabase's CA. Downloaded the official CA from the URL used by Supabase
  Studio; administrative session-pooler and runtime transaction-pooler connections
  then passed certificate/hostname verification. No TLS verification was disabled.
- Hosted checks passed CRUD on all four tables with synthetic writes rolled back;
  denied runtime DDL, TRUNCATE, auth-user reads and administrator-role escalation;
  denied anon/authenticated/service_role access. All four tables remain empty.
  Three targeted local database-access/connection tests also pass.
- Test credentials, URLs and CA material remain in the gitignored, untracked `0600`
  provisioning file. No production changes, hosting deployment, source checks,
  VAPID setup, push activation or notification sends. HTTPS app integration,
  test-hosting isolation and real phone delivery remain unverified.

### Isolated Free test database provisioned — 2026-10-17

- With explicit resource-creation approval, rechecked the Water Alert organization
  as Free and one active visible project, then created `WellPower WAVE Push Test`
  in `us-east-1`. A read-only API check confirmed `ACTIVE_HEALTHY`, the correct
  organization and a project distinct from production.
- Generated a separate test-only database password, stored locally in an untracked,
  gitignored owner-only (`0600`) provisioning file. No credentials were printed.
- Provisioning only: no application schema migration, runtime-role setup, hosting
  deployment, VAPID setup, push activation or notification sends. Production was
  not changed; phone delivery and test database application connectivity are unverified.

### Isolated recording-only push rehearsal — 2026-10-17

- Added a local harness using fresh in-memory stores, clearly synthetic notices,
  fixed subscription fixtures and a recording-only transport. No environment files,
  production data, real subscriptions or notification transport are loaded.
- Added `scripts/rehearse-push.ts` with baseline/failure suppression, future new/lift,
  restart deduplication and removal assertions. Output contains counts/check names,
  not subscription endpoints, keys or bearer credentials. Usage is in `PUSH-PLAN.md`.
- Three new payload-recording assertions failed before transport wiring; 34 targeted
  harness/push/device/API/cloud tests now pass, including 11 new harness cases.
  TypeScript checking and the CLI rehearsal pass. Tests include stale/unknown/missing
  suppression, Spanish updates, unwatched/lift choices, expiry and 50-watch limits.
- Local only: no resources, VAPID setup, deployment, production activation or sends.
  Not an HTTPS/device test harness; real iPhone opt-in/delivery/browser unsubscribe
  and hosted/full-capacity behavior remain unverified. Production push stays disabled.

### Repair Cloudflare scheduler redirect compatibility — 2026-10-17

- Reproduced Cloudflare workerd rejecting `redirect: 'error'` before any outbound
  request. Use supported `manual` mode; existing non-2xx rejection also rejects
  redirects without following them or forwarding the bearer credential.
- Watched two regression assertions fail before the fix. All six scheduler tests,
  all 218 Vitest tests and TypeScript/Vite build pass locally. Ad-hoc workerd checks
  of the actual repaired module pass for 200, five redirect statuses and 503 using
  synthetic responses, with zero external requests. No dependency or UI changes.
- With separate explicit deployment approval, deployed Worker version
  `f3cc8086-68bd-449b-9813-7397fad042cf`. At 18:21:05 UTC, read-only API checks
  confirmed the unchanged five-minute schedule, enabled exact origin, retained
  private secret and disabled public/preview URLs. The natural 18:25 UTC run
  completed `ok` with no exceptions; read-only PostgreSQL checks confirmed new
  successful ADH/ADEQ retrievals and validated captures matching public status.
  Push remains disabled. One run does not establish laptop-off/day-long reliability.

### Approved scheduler activation configuration — 2026-10-17

- Following explicit activation approval, set `ENABLED=true` for the five-minute
  Cloudflare Worker and exact production origin. Public/preview URLs stay disabled;
  no secret is committed. Updated the configuration test after observing its
  expected failure against the disabled setting; all five scheduler tests pass.
- Deployed version `4d16daed-7bcb-4a17-841c-8f42358f4f2f`. At 17:51:07 UTC,
  Cloudflare API confirmed the five-minute schedule, enabled setting, retained
  private secret and disabled public/preview URLs. Production push remains disabled.
  Successful retrieval, laptop-off operation and day-long reliability remain open.

### Prepare disabled scheduler origin — 2026-10-17

- With setup-only approval, set the scheduler's exact production origin to
  `https://water-alert-blond.vercel.app`; retained `ENABLED=false`. No secret is
  stored in tracked configuration. After user login and confirmation of Workers
  Free, uploaded the disabled Worker and secret with no cron triggers. CLI reported
  a partial-trigger/account-setup error; read-only API checks confirmed disabled
  state, zero schedules, private secret binding and disabled public/preview URLs.
  Activation and successful authenticated production invocation remain unverified.

### Repair automated browser journey checks — 2026-10-17

- Added dedicated Playwright discovery/configuration so `npm run test:e2e` no
  longer imports Vitest suites. Starts a separate UI-only Vite server without
  API proxying or env-file loading; no application behavior or logo changes.
- Added deterministic synthetic-incident journey tests at desktop and phone-sized
  Chromium widths: exact supplier confirmation, saved-notice selection, agency
  and provider link targets, copy/download/email draft content, memory-only edits,
  logo loading and page overflow. Failed/stale sources remain unavailable.
- All six browser cases, 217 Vitest tests and TypeScript/Vite build pass locally
  under Node 24. External/unexpected API requests are blocked and asserted absent;
  no private records, production contact, sends, deployment or activation.

### Supplied teal-wave logo integration — 2026-10-16

- Replaced the header's generic water drop/text with the supplied WellPower: WAVE
  logo, keeping its accessible home-button name and responsive sizing. Preserved
  the original image in `assets/wave-logo-source.png`; the source outside this app
  is untouched. Trimmed transparent margins and faint export speckles for display.
- Generated wave-only 32 px favicon, 192/512 px maskable PWA PNGs and 180 px Apple
  touch icon on white backgrounds. `npm run icons` reproduces these from the supplied
  source. Removed the old SVG from manifest references, not from the repository.
- Verified two new tests fail before implementation; all 217 tests and the build
  pass under Node 24. Local browser checks at 320/390/800/1440 px confirmed the logo
  loads, no document overflow and separation from the language controls.
- Local only; no deployment, installed-device icon verification, notification
  activation or sends. Storage keys, manifest identity/scope and source behavior
  are unchanged.

### Read-only release review and logo concepts — 2026-10-16

- Added a dated hosted release/secrets review: six public smoke checks pass, but
  agency observations are stale and opening the app only reads stored observations.
  Recorded bounded secret-scan evidence, zero production dependency advisories and
  remaining hosted verification gates; no credentials are included.
- Added three standalone WellPower: WAVE logo concepts for user selection. Existing
  header, favicon, app/notification icons and manifest remain unchanged.
- Review/design artifacts only; no runtime/config changes, deployment, source-check
  invocation, scheduler activation or notification sends.

### Approved WellPower: WAVE branding — 2026-10-16

- Integrated the approved name and Water Advisory Verification & Empowerment purpose
  into the header, welcome and settings pages, browser/install metadata, share title
  and unreadable-notification fallback title. Added English/Spanish clarification
  that verification is not water testing or safety certification; Spanish review pending.
- Preserved storage keys, saved watches, manifest identity/scope, source guardrails
  and notification configuration. No deployment, activation or notification sends.
- Added five regression tests, including mocked share/worker checks (not delivery
  evidence). All 215 tests pass with `npm test -- --maxWorkers=2`; build passes under
  Node 24. The initial default-parallel run timed out on one existing journey test.
  Local UI-only browser preview confirmed the name and EN/ES purpose at mobile size;
  no hosted or real-device installation/delivery verification is claimed.

### Restore local backend startup — 2026-10-14

- Recovered the missing observation-store implementation from repository history,
  preserving existing records, check evidence and failure handling. Used `.js`
  relative imports for compatibility with emitted native Node ESM.
- Verified all 210 tests and the full TypeScript/Vite build locally under Node 24.
  No deployment or notification-delivery claim.

### Supplier help and preparation toolkit — 2026-10-14

- Added a visible supplier-details/tools entry and exact-record navigation from
  supplier alert history, without replacing current status with an archived notice.
- Added local editable credit/reimbursement, follow-up, AG-complaint and legal-help
  templates, copy/text downloads and a preparation pack. Verified provider email
  drafts open only for provider templates; no automatic sending, filing or uploads.
  Draft edits are memory-only and lost when leaving the page/reloading.
- Added curated official complaint/legal-help/report references, a verified Leisure
  Hills directory profile (not live measurements or compliance findings), and
  separately attributed general CDC boil-water excerpts. English/Spanish controls;
  English templates and quotations remain explicitly labelled originals.
- Local implementation only; not deployed. No compensation, liability, jurisdiction,
  water-safety or notification-delivery guarantees. Existing two-feed status and
  failure rules remain unchanged.

### Initial Vercel deployment and compiled-runtime fix — 2026-10-14

- After confirmed private runtime-password rotation and a verified read-only TLS
  connection, configured six production-only Vercel variables privately. Cloud
  backend enabled; push explicitly disabled. Generated the cron bearer privately
  and retained it only in ignored `.env` plus Vercel's production secret store.
- Initial deployment published the frontend at `https://water-alert-blond.vercel.app`.
  Hosted checks revealed native Node ESM could not resolve extensionless API/backend
  imports, despite the successful Vercel build. Added a regression that emits the
  API with TypeScript and loads it using native Node, reproducing the hosted failure.
  Updated the cloud dependency graph to explicit `.js` specifiers, which resolve
  to TypeScript locally and emitted JavaScript in production.
- Redeployment fixed invocation: all six hosted smoke checks pass, including HTTPS,
  routing/no-store, disabled push, cron 401 and foreign Origin 403. Wrong cron bearer
  returned 401; private authenticated invocation returned 200. Both approved feeds
  parsed successfully at `2026-10-15T01:57:03Z` (Oct 14 local); read-only SQL confirmed
  two validated captures, 82 persisted archive records and zero baseline events.
  Parsed records are not counts of active advisories. Node 24: 195 tests/build pass.
- Updated operation docs with the production URL and actual verification. No
  scheduler activation, VAPID setup, synthetic live notices or external notification
  sends. Cold-start concurrency/load, laptop-off scheduling and device delivery
  remain unverified and separately gated.

### Hosting preflight and upload safeguards — 2026-10-14

- Pinned Node 24 and the Vercel function region to `iad1`, matching the existing
  us-east-1 database. Added explicit Vercel upload exclusions for environment/key
  files, local records and development artifacts.
- Added `npm run verify:hosting -- https://canonical-host`: read-only checks for
  initial HTTPS/HTML/worker/API routing, no-store, push disabled, unauthenticated
  cron rejection and foreign-origin rejection. It sends no bearer credential,
  triggers no source retrieval and prints no upstream bodies/error details.
- Verified locally on Node 24.22.0: 194 tests (11 new smoke-check regressions) and
  production build pass. Dependency lock metadata updated; audit reported no known
  vulnerabilities. No remote settings, deployment, scheduler, VAPID or device sends.
- Initial push-disabled deployment approved conditional on private credential
  rotation after a prior tool-output exposure. User confirmed rotation is not yet
  done and requested deployment be paused;
  corrected operation docs distinguish provisioned resources from pending hosted,
  laptop-off and real-device verification. No secret values were added to docs.

### One-tap provider contact — 2026-10-14

- Added visible **Contact water provider** sections to supplier cards and notice
  details, with call links and organization email links where available, in EN/ES.
- Checked ADH directory contact fields for Leisure Hills, Fayetteville,
  Springdale, Rogers and Bentonville; exact supplier-ID matching, source links and
  check dates prevent guessed contacts. Unknown suppliers get bill/park-management
  guidance. Lakes and sample mode do not show real provider contact actions.
- Links open the user's phone/email app, not an in-site delivery service. Directory
  hours, response times and successful calls/emails are not verified.
- Verified locally: 183 tests and production build pass; browser checks at
  1280/390/320px in EN/ES passed without overflow or page errors. No real calls or
  emails initiated; no deployment performed.

### Compact supplier card refinement — 2026-10-14

- Shortened card labels to **Affected area**, **Reason**, **Issued** and **Active**;
  normalized uppercase county display. Exact matching supplier/whole-system
  wording becomes **Entire system**, without shortening exceptions or other areas.
- Formatted recognized ADH issue date/time fields to short dates and minutes;
  retained explicit source time zones and never inferred an absent zone. Original
  area and issued text remain in the info popup; stored/history text is unchanged.
- Tightened heading spacing, kept 24px desktop padding, used 21px supplier and
  18px alert headings with 15–16px body text and 12px metadata gaps. Dotted leaders,
  right-aligned values, natural wrapping and content-driven height remain.
- Verified locally: 173 tests, production build and supplier/source-activity/journey
  browser checks pass. Reviewed complete Leisure Hills pages including the sidebar
  at normal zoom at 1280/1440/390/320px, with original popup evidence and no overflow.
  No deployment, source/storage changes or real notifications from this work batch.

### My Water layout and supplier info — 2026-10-14

- Matched the approved layout with compact white supplier cards, a top-right info
  button, restrained status treatment and dotted label/value leaders for genuine
  affected-area, reason and agency-issued fields. Unavailable findings retain
  explicitly historical notice facts, never a fabricated active status.
- Moved safety/coverage notes, instructions, the official link, actual saved
  check/attempt time and collapsed technical activity into a native modal.
  Keyboard opening, Escape/Close and focus return are verified. The existing
  detail/share journey remains available through **Notice details** in the modal.
- Kept official **Alert history** collapsed with one left chevron. Unboxed the
  sidebar, added **Manage alerts** and existing device-delivery status, and kept
  **Add a place** directly below the watched cards. Mobile stacks without the
  vertical separator; published text wraps without invented values.
- Verified locally: 163 tests and production build pass; EN/ES supplier browser
  checks cover 1280/390/320px, popup/history keyboard interactions and unavailable,
  empty, lifted and missing-field states. Source-activity and journey browser
  regressions pass. Reviewed saved Leisure Hills ADH facts at 1280/390px with
  unchanged agency dates and retrieval evidence; API responses were intercepted.
  No deployment, live checks, record changes or real notifications.

### Supplier alert history — 2026-10-14

- Replaced the supplier card's primary Check history with collapsed **Alert history**
  from exact supplier/ADH/source-matched retained notices. Shows official facts,
  explicit missing-field labels, sourced guidance when retained, and separate app
  observations; failed/repeated checks and disappearance never become lift events.
- Moved last-success evidence, failures, grouping and retention/storage explanations
  into collapsed **Data-source activity** on cards/details. Current status remains
  fail-closed and the default supplier card stays compact; ADEQ UI is unchanged.
- Added genuine source-specific history-start evidence for new sources; legacy
  state without start/observation evidence shows an unknown start, not a guessed
  date. Existing notice archives are reused without check-log backfill or migration.
  ADH per-notice guidance remains unretained and explicitly missing.
- Verified locally: 161 tests pass with `npm test -- --maxWorkers=2` and the
  production build passes; advisory
  browser checks cover active, lifted, missing, empty, failed and disappeared
  states at 1440/390/320px in EN/ES, with keyboard toggles and no overflow.
  Data-source activity, ADEQ, catalog and journey browser regressions also pass.
  No deployment,
  publication, live record changes or real notifications.

### Supplier check-history polish — 2026-10-14

- Shortened supplier history to one ADH-specific introduction; removed duplicate
  source/retrieval-success lines and moved retention/provenance explanations into
  Supplier details. History and supplier/coverage disclosures remain collapsed.
- Added local date headings and compact expandable saved-success count/time-range
  rows with CDT/CST, readable 15px body text, tighter spacing and right-aligned,
  keyboard-operable full-row disclosures. Individual saved timestamps remain
  available; identical failures never group, nor do successes across a failure,
  changed published result or local-date boundary.
- Current failure remains unavailable; previous successful evidence stays explicitly
  historical. No storage/parser changes, invented evidence, deployment or real sends.
- Verified locally: 152 tests and production build pass; supplier browser checks
  cover 1440/1280/390/320px in EN/ES, keyboard toggles, readable text, wrapping and
  overflow. Saved Bentonville evidence was also reviewed at 1280/390px without
  changing it; ADEQ-card browser checks remain green.

### ADEQ advisory cards and verified guidance — 2026-10-14

- Clarified English/Spanish unknown-lift copy: ADEQ's current table excludes
  `lifted: "N/A"`; this does not establish active or lifted status. Home cards keep
  short copy; history/details explain the exclusion and lack of new/lifted alerts.
- ADEQ history now distinguishes agency-issued/feed-updated dates from genuine
  first/last app observations, explicitly labels the missing N/A lift date, and
  explains that retrieval is not agency reconfirmation. No illustrative counts or
  dates were added; the bounded check journal cannot establish lifetime counts.
- Bundled general ADEQ HAB quotations and reporting/illness contacts, verified
  against the official page on October 14, 2026, with source/date and English
  quotation labels in both languages. Reusable detail/history guidance disclosures
  do not fetch per card or invent advisory-specific reasons.
- Verified locally: `npm test -- --maxWorkers=2` (151 passed), `npm run build`,
  ADEQ-card and source-check browser checks at 1440/390/320px in EN/ES; existing
  journey and catalog browser checks also pass. API-intercepted browser checks
  cover unknown home/detail/history, guidance keyboard disclosure, current HAB,
  provenance and overflow. No deployment, real notification sends or physical-device
  verification. ADH, parser/state semantics, empty-feed guard and live/sample
  isolation unchanged.

### Compact supplier advisory cards — 2026-10-14

- Simplified supplier cards to one finding and saved check/attempt time, county
  and ADH identity, a short water-safety limitation and the official ADH list link.
  Check history and coverage start collapsed; Supplier details opens the existing
  detail view. Added bilingual labels, right-aligned disclosure indicators and
  content-height layout with stacked mobile actions and visible keyboard focus.
- Failed checks remain unavailable, with compact genuine last-success evidence
  and historical caution, or an explicit no-success message. Stale and unknown-lift
  results remain unconfirmed. Preserved evidence retention, exact matching,
  freshness rules, fictional sample isolation and existing waterbody presentation.
- Verified locally: **140 tests passed**, TypeScript/production build, **8** mocked
  browser journeys, **4** catalog journeys and **6** source-history journeys.
  Reviewed desktop/mobile EN/ES screenshots, including compact no-match, active,
  failure and no-success states. No deployment, hosted mutations or real notifications.

### Source-check evidence — 2026-10-14

- Added bilingual watch-card historical-result panels, actual latest-attempt rows,
  collapsed keyboard-accessible source-check timelines, consecutive repeated-check
  groups and progressive reveal. Current unavailable stays neutral and primary;
  official ADH/ADEQ advisory-list links are separate from supplier/coverage details.
  Failed retrieval, invalid format, stale, offline and never-checked explanations
  are distinct. No missing evidence is interpreted as historical no-match.

- Added durable actual success/failure outcomes and complete successful feed evidence
  to the shared local JSON/PostgreSQL JSONB observation store. Each agency retains
  at most 64 checks within 30 days, plus one last-success snapshot; a 1 MB journal
  budget removes older complete checks, always preserving the newest check.
  Pruning occurs on its next check. Legacy records gain empty history fields without invented
  checks or archive-derived no-match results. No SQL/grant changes or hosted migration
  were performed. Notification events and parser/freshness rules remain unchanged.

- Added isolated fictional sample check evidence. Validated captures now persist
  before committing a successful check, preventing contradictory success/failure
  journal entries when capture persistence fails.
- Verified locally: **136 tests passed**, TypeScript/production build, **8** existing
  mocked browser journeys, **4** catalog journeys and **6** source-history journeys
  (desktop/mobile, EN/ES, keyboard expansion, grouping and progressive reveal).
  Restarted the local development servers at the user's request with push disabled.
  Both agency startup checks succeeded and recorded genuine successful evidence.
  No deployment, real notification sending or hosted migration; hosted platform,
  real-device and human Spanish review remain open.

### Verified local place catalog — 2026-10-13

- Added always-selectable Beaver Lake and Buffalo National River/Buffalo River,
  plus ADH-verified Fayetteville, Springdale, Rogers and Bentonville public water
  systems. Linked official identity references in confirmation, cards, details
  and Sources and coverage limits; added EN/ES directory and monitoring limitations.
- Projected the small directory into live UI/API place lists without seeding
  observations, events or timestamps. Sample data and existing observed-place IDs
  remain separate and unchanged; supplier identities match the existing ADH parser.
- Matched catalog waterbody watches only to exact verified ADEQ HAB names, retaining
  each published area and original record identity. Applied matching to status,
  observed history, recent changes, deep links and existing future-only opt-in
  notification validation/matching, without changing transport or freshness gates.
  Overlapping lake/area watches do not duplicate the same event for one device.
- No lake-to-tap advisory inference, bacterial results, water tests, park closures
  or new live feed. Failed/stale/offline sources remain unavailable, and a missing
  notice does not establish safety or monitoring coverage.
- Locally verified: **121 tests passed in 20 files**, TypeScript/production build,
  the existing **8** mocked Chromium journeys, and **4** catalog journeys at
  **1440/390px in EN/ES**. API fixtures and fake notification senders only; no
  backend startup, scheduler activation, real subscription/send, deployment or
  commit occurred. Real-device delivery and human Spanish review remain open.

### Resident journey redesign — 2026-10-13

- Reworked the welcome, typed supplier/waterbody search, no-match and confirmation
  journeys. Selecting a match no longer saves a watch before explicit confirmation.
  Added the private-well path and guided, clearly fictional sample introduction.
- Added desktop home cards with a results/alerts sidebar, mobile bottom navigation,
  focused notice guidance with metadata/published-record/alert disclosures,
  Places removal/undo, my/all observed history with progressive reveal, and grouped
  Settings with separate alerts, sources, privacy and installation sections.
- Reserved purple for active HAB notices; unavailable is neutral gray with a
  question mark. Failed-source records and archived deep links are labelled as
  previously observed or explicitly lifted, never presented as current active
  records. Existing no-safety, unknown-lift and guidance-gap warnings remain.
- Kept agency dates verbatim; known app timestamps are localized in EN/ES with
  `America/Chicago`. Missing record dates are omitted, with no invented publication
  timestamp. Explained retrieval of the two feeds, not individual place checks.
- Preserved separate live/sample preferences, polling, source rules, notification
  transport and server-deletion failure/retry. Removal undo restores the place's
  lift preference; mode changes clear transient undo state. Deletion copy now
  explicitly covers browser preferences and any server notification record.
- Split journey/detail/history views and bilingual journey copy into focused UI
  modules. Vite no longer automatically loads private runtime environment files;
  API configuration and dependencies were not changed.
- Locally verified: **112 tests passed in 19 files**; TypeScript and production
  build passed. Mocked Chromium journeys passed at **1440, 820, 390 and 320px** in
  **English and Spanish**, including keyboard activation/focus, all three states,
  HAB recovery, sample isolation and deletion retry. Screenshots are under ignored
  `test-results/journey/`; real-device and human Spanish/accessibility review
  remain open. No backend startup, deployment, scheduler activation, real
  notification send or commit occurred for this redesign.

### Private database connection — 2026-10-13

- User privately set the runtime-role password and enabled LOGIN. Verified
  transaction-pooler login on port 6543 with certificate-verified TLS in `psql`
  and a read-only Node `pg` query using the app's `databaseOptions` configuration.
- Saved the runtime URL and project CA only in ignored local `.env` with mode
  0600; no administrator credential was saved. Cloud operation and push remain
  disabled. No deployment, scheduler activation or notification send occurred.

### Hosted database setup — 2026-10-13

- Applied the existing `001-cloud.sql` and `runtime-role.sql` scripts to the
  user's Supabase project `WellPower: WAVE` (`eeuknpzklzoijvjsshwx`, us-east-1)
  through authenticated CLI database queries. Created the four private
  `water_alert` tables and restricted `water_alert_runtime` role with RLS.
- Verified hosted table grants/RLS, runtime CRUD in a rolled-back transaction,
  and denial of reads by `anon` and `authenticated`. No test records remain.
  At this step the runtime role was NOLOGIN without elevated privileges or schema
  CREATE; private login and application pooler/TLS were verified subsequently above.
  No deployment, scheduler activation or notification delivery occurred.

### Hosting link — 2026-10-13

- Created a separate Supabase organization named `Water Alert`. At this step,
  project creation awaited the user's private database-password step; database
  setup subsequently completed as recorded above. No app credentials or deployment
  were configured in the organization-creation step.
- Created the `water-alert` Vercel project in the verified Hobby/free workspace
  and linked only this app directory; local `.vercel/` metadata remains ignored.
  No Git integration or deployment was created. Removed the CLI-generated local
  OIDC token file; no application secrets, database or scheduler were configured.

### Added — website

- Independent React + TypeScript + Vite resident app, with setup, My Water,
  notice detail, browse, observed history and settings screens.
- White/light-gray public-service layout with navy/teal controls, orange boil
  notices, purple HAB notices, mobile bottom navigation, desktop top navigation
  and two-column notice detail.
- Explicit supplier and lake selection, limited observed-record name/county
  search, ambiguity explanations and private-well limitations. Supplier coverage
  is never inferred from a town or address.
- English/Spanish interface strings, labelled controls, visible keyboard focus,
  skip link and text/shape status indicators. Agency records stay untranslated.
- Source links and sharing, separate agency and app-observation timestamps,
  first/last observed history and visible official-guidance verification gaps.
- Persistent yellow sample-mode banner and exit control; fictional sample data
  and live preferences are kept separate.
- Live saved-status polling every 30 seconds, optional in Settings, plus manual
  source checking. Sample mode does not poll the live API.
- Watched-place changes since the previous device visit, with per-agency cursors
  and first-visit baseline suppression.
- PWA manifest, PNG installation icons and push-only service worker, including
  notification deep links. No offline caching of advisory/API responses.
- Live device-notification opt-in, saved watch/lift choices, preference mismatch
  warning, disable/remove controls and deletion-failure retry. Sample alerts
  remain disconnected; installed iOS 16.4+ requirements are explained.

### Added — sources, persistence and notifications

- Isolated Express/tsx localhost API and strict parsers for the two approved
  ADH/ADEQ feeds, with authentic offline fixtures and schema-validation captures.
- Concurrent bounded retrieval, 15-second timeouts, redirect rejection,
  60-second manual cooldown and in-flight deduplication.
- Startup and five-minute local scheduled checks, only while the server is
  running and the computer is awake.
- Atomic local observation archive, grouped ADH cross-county duplicates,
  derived stable identities and retained prior records after failures.
- Durable 30-day change journal, first-source-check baseline suppression,
  future-only push enrollment and explicit-lift-only notification events.
- Web Push transport, endpoint/encryption-key validation, hashed deletion
  bearers, retry backoff, durable pre-send claims and attempt deduplication.
  Device records expire 90 days after saving, subject to running cleanup and
  separate operator handling of backups.

### Added — hosting preparation

- Separate Vercel API entry point with PostgreSQL state/captures, shared source
  cooldowns, job leases and mutation rate limits; cloud previews fail closed.
- Private-schema migration and operator-only restricted runtime-role/RLS script;
  verified-TLS connection configuration and single-connection pooling.
- Disabled-by-default Cloudflare scheduled Worker for five-minute authenticated
  checks, replacing paid frequent Vercel cron configuration.
- Free-only hosting plan: Vercel Hobby + Supabase Free + Cloudflare Workers Free.
  Neon Free was replaced after identifying the continuous-check compute quota
  risk. Provider quotas and limitations are documented, not guaranteed away.
- Alternative Docker/Compose configuration and local icon-generation tooling.
- Setup, architecture, privacy, deployment and approval-gate documentation in
  `README.md`, `PLAN.md`, `PUSH-PLAN.md`, `DEPLOYMENT.md`, `VERCEL.md` and
  `FREE-HOSTING.md`.

### Safety and privacy behavior

- Failed or older-than-15-minute sources show Data unavailable, never an
  all-clear. Retained records are explicitly unverified.
- Blank lift fields remain active; explicit agency dates establish lifts.
  Disappearance never implies a lift. ADEQ `N/A` lift fields remain unknown and
  cannot trigger new/lift alerts.
- Malformed, conflicting or unexpectedly empty source responses do not replace
  valid snapshots; genuine empty-feed semantics remain unverified.
- No email, personal address or account collection. Push opt-in collects only
  subscription data, watch choices, language and delivery-attempt state.
- No safety certification, prediction, verified service-area coverage, delivery
  guarantee or storage-security guarantee. Provider acceptance is not device
  delivery; a crash after sending can still cause a duplicate.

### Verification and remaining gates

- Latest local verification: **100 tests passed** with
  `npm test -- --maxWorkers=2`; `npm run build` passed. The default parallel test
  run encountered resource-contention timeouts before the bounded rerun.
- Embedded PostgreSQL tests cover persistence, access restrictions and shared
  claims; they do not verify hosted pooler behavior or real platform concurrency.
- Vercel project linking and the initial hosted Supabase schema/role setup are
  complete as recorded above. No deployment, publication or real notification
  delivery has occurred. Sending and the
  Cloudflare scheduler remain disabled by default.
- Still pending: authorized hosting setup, remote routing/TLS/permissions and
  quota checks, computer-off scheduling and consenting real-device push tests.
- Still pending: verified supplier catalog and agency guidance, human Spanish
  and accessibility review, release/security checks and CAC submission approval.
- Email alerts are not implemented. Docker configuration has not been run in a
  Docker-capable environment.
