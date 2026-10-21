# WAVE logo intro implementation plan

**Goal:** Implement the user's session-only, 2.5–3 second SVG logo drawing intro in the existing React app.

**Architecture:** Trace the supplied transparent PNG contours with Potrace; store outlined paths with the original layout and teal/navy palette. Mount a decorative, non-interactive overlay beside ConnectedApp so loading is not gated. Normalize SVG path lengths for CSS dash drawing; fade fills after drawing, hold, fade the overlay, then unmount with a timer independent of animation events.

**Constraints:** Preserve existing unrelated work and header branding. WAVE remains larger and gets a longer drawing sequence. Use sessionStorage with a safe fallback, reduced-motion static artwork and fade, responsive sizing, and no scroll locking. No deployment or notifications.

## Execution (inline, as requested)
- [x] Add component tests for session persistence, timed removal, reduced motion, unavailable storage and timer cleanup; add browser checks for real drawing, background rendering, responsive layout and post-intro usability.
- [x] Generate faithful SVG contours from the existing PNG, implement LogoIntro and its scoped CSS, and mount alongside the existing app in src/main.tsx.
- [x] Run unit tests, production build and focused synthetic browser checks at desktop/phone/tablet widths. Inspect the running page and amend README/CHANGELOG with actual local verification only.
