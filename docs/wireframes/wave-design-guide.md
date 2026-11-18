# WAVE design guide

**Working standard for future UI changes · November 17, 2026.** Use this guide
before designing or implementing a WAVE screen. It captures the existing local
app's visual language and sets practical rules for extending it; it is not a
claim that every existing screen already follows them. The
[interface reference](wave-interface-reference.md) maps the current pages and
known inconsistencies. The working app remains the source of truth for behavior.

## 1. Design intent

WAVE is a practical, independent student tool for Arkansas residents, not an
agency dashboard. The interface should feel **calm, trustworthy and helpful**.
Make the next action easy to find, keep the agency's information distinguishable
from the resident's own words, and explain uncertainty plainly. Use the existing
logo and shared app shell. Do not give a new feature its own unrelated palette,
type system, navigation, or decorative style.

## 2. Foundations

Use existing CSS and components before introducing new ones. Values below are
from `water-alert/src/styles.css` and `typography.css`; component-specific styles
may differ. Check computed styles where rules overlap.

| Role | Existing baseline | Use |
| --- | --- | --- |
| Main text | `#102e43` (`--navy`) | Headings and primary text |
| Supporting text | `#354f60` (`--muted`) | Secondary information, still readable |
| Main action | `#087f83` (`--teal`) | Primary buttons and selected controls; check text contrast |
| Page / panel | `#f4f6f8` / `#fff` | Quiet page background / content surface |
| Border | `#dce3e9` (`--line`) | Panels, dividers, input groups |
| Link / focus | `#066d73` / `#145fc0` | Underlined links / visible focus outline |

Status colors have specific meanings: boil notices use orange, HAB notices
purple, unavailable/neutral states slate, and sample labels gold in relevant
components. **Never rely on color alone** and do not introduce a new status
meaning through color. Verify the contrast of every actual foreground/background
pair; an existing token is not automatic proof of accessibility.

Body text uses local Noto Sans with system fallbacks; headings use system sans.
Keep labels and body text readable at normal and enlarged sizes. Existing base
type is 16px with 1.55 line height; the base desktop H1 is 2.05rem, H2 1.15rem,
and H3 1rem. Follow the surrounding page's established sizes rather than
introducing display-sized headings or tiny decorative labels.

Use the existing spacious-but-compact rhythm: common gaps are 8, 12, 16, 20,
24 and 28px; panels generally use 20–25px padding and 8–12px corners, while
buttons and fields commonly use 6–8px corners. These are starting points, not
a mandate to wrap every item in a card. Use dividers and whitespace to group
related information; avoid nested boxes and excessive shadows.

## 3. Page and component rules

**Viewport fit:** Design each screen or step so all of its content fits within
the available viewport without vertical or horizontal scrolling at ordinary
desktop and mobile sizes. Plan the content and layout around that constraint;
use concise copy and, where needed, meaningful steps or disclosures rather than
shrinking text or hiding essential information. Verify the entire screen,
including navigation and actions, at both sizes. Content must remain reachable
when enlarged text, zoom, long translations, user-generated content or a small
viewport makes fitting impossible: allow scrolling as an accessibility fallback,
never clip content or disable scrolling to simulate a fit.

1. **Hierarchy:** one clear page title, a short explanation when needed, then
   the resident's primary task. Use headings for real sections, not decoration.
   Keep source, date and uncertainty next to the information they qualify.
2. **Layout:** reuse the shared header, navigation, content widths and nearby
   component patterns. Existing main content has a 1160px maximum; narrow
   task pages may use a smaller measure. At the existing 760px breakpoint,
   multi-column content generally stacks and navigation moves to the bottom.
   Make room for navigation and safe areas; never hide essential content behind it.
3. **Actions:** one visually primary next action per section; secondary and
   destructive actions must be distinct. Use existing `.primary`, `.secondary`,
   `.danger`, and text-link patterns where appropriate. Action labels say what
   happens, especially when opening an external app or leaving the site. Do not
   show an action-looking label that cannot be operated.
4. **Forms:** persistent labels above or beside controls, optional fields
   identified as optional, relevant help near the field, and actionable errors
   associated with it. Don't use placeholder text as the only label. Use native
   controls where practical, visible focus, and touch targets of at least 44px.
5. **Grouped summaries:** align each heading, content and edit action as a
   deliberate unit; never insert edit buttons into running sentences. Do not
   show empty headings: omit the group or explain its empty state. If a summary
   reflects form answers rather than the manually edited draft, say so.
6. **Review and sending:** make the editable message the main artifact; keep
   supporting answers and sources subordinate. Preserve manual edits, source
   references, attachment behavior, back navigation and stale-draft warnings.
   Make clear what the next action does and that nothing is sent automatically.
7. **Content:** use plain, direct language and sentence case. Reuse existing
   wording for the same action. Keep citations, dates and official wording
   intact; never create a causal, safety, entitlement or delivery claim.

## 4. Required states and trust boundaries

Design and check the states relevant to the feature, not just a populated
desktop example: loading, empty, selected, unavailable, stale, error, long
content, and return/resume. Distinguish **active**, **no active advisory found**
and **data unavailable** in text as well as appearance; absence is not proof of
safety. Historical reports are dated context, not proof of present conditions
or cause. Preserve exact source provenance and freshness; never imply that
disappearance is a lift, infer service boundaries, or mix tap-water notices and
lake HAB notices. Private wells are outside coverage. Label all sample content
as fictional and keep it separate from live data and notification flows.

## 5. Before calling a design done

- Inspect the actual entry point, surrounding screens, component styles and
  existing translations; make a small design plan using these patterns first.
- Render the complete affected journey at desktop and narrow mobile sizes;
  check that each normal screen fits without scrolling, including fixed mobile
  navigation and actions. Inspect spacing, hierarchy, long names and overflow;
  verify the accessibility fallback when content cannot fit.
- Exercise empty, error and long-content cases, keyboard focus and order, screen
  reader labels, zoom/enlarged text and reduced motion as applicable. Check
  contrast, and check both English and Spanish for wrapping and equivalent meaning.
- Verify actual behavior: navigation, editable and saved drafts, citations,
  files, and explicit actions where relevant. Synthetic tests do not establish
  production status or delivery.
- Compare the rendered result to this guide and adjacent pages; fix mismatches
  before presenting it. Show the user material visual changes for approval.
  Record actual checks and update the app changelog for implementation changes.

This guide reduces avoidable inconsistency; it cannot replace visual inspection
or guarantee that a new design will need no feedback.
