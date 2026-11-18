# WAVE interface reference

**Local source reference · November 17, 2026.** This is an inventory and a
design-review guide, not an approved redesign or a claim about the hosted site.
The running app and its source are authoritative; the HTML files in this folder
are earlier, synthetic design explorations. Update this reference when a UI
change actually lands. Do not replace those historical previews.

## Purpose and visual character

WAVE helps residents find published information and prepare a next step. Its
interface should feel calm, legible and practical: navy text, teal actions,
light surfaces, recognizable icons and straightforward language. Trust and
clarity matter more than decorative effects. Keep the existing WAVE logo and
visual identity; a feature should look like part of the same product, not a
separate mini-app.

The current styles are distributed, not a single complete design system:
`water-alert/src/styles.css` defines base colors including `--teal: #087f83`,
`--navy: #102e43`, `--muted: #354f60` and `--line: #dce3e9`;
`water-alert/src/typography.css` supplies Noto Sans body text and system-font
headings. Some components have specific overrides. Consult the actual styles and
rendered page rather than assuming every component uses the same values.

## Current page inventory

The following summarizes representative local desktop states inspected on
November 17. It is not an exhaustive audit of every state, translation, size or
interaction; live data and saved drafts may differ on another device.

| Area | Existing experience | Relevant implementation |
| --- | --- | --- |
| Shared navigation | Logo, Home, Places, Map, History, Settings and EN/ES controls. | `src/App.tsx`, `src/styles.css` |
| Home | Supplier/county/ZIP search and routes to places, map and help. | `src/home-hero.css`, `src/home-water.css` |
| Places | Supplier card, advisory status and source, expandable provider information and history, contact actions and Help entry. | `src/styles.css`, `src/AnnualWaterReport.tsx` |
| Map | Search and status filters, map and supplier results, source/freshness and boundary cautions. | `src/observed-map.css`, `src/MapSupplierDetails.tsx` |
| Help | Existing guided form: issue, experience, details, request, response details, anything else, then review. The progress indicator calls the input screens six steps; review follows. | `src/GuidedHelp.tsx`, `src/help-flow.ts`, `src/help-four-screen.css`, `src/requests.css` |
| Review | Editable email with recipient, subject and message, source access, sending choices, files and next steps. A new answers summary sits above the email. | `src/ReviewEmail.tsx`, `src/ReviewFiles.tsx`, `src/SendOptions.tsx` |
| History | Saved request and progress, message, details, contact information and actions; device/account behavior depends on configuration. | `src/RequestHistory.tsx`, `src/history.css` |
| Settings | A list of settings for alerts, places, source limits, privacy, installation and sample mode. | `src/App.tsx`, `src/styles.css` |

Paths above are relative to `water-alert/`. The Help and review implementation
currently includes uncommitted local work; it has not been established as an
approved design.

## Known review-screen issue

The newly added “Summary of form answers” is visually unfinished: edit buttons
interrupt running text, spacing and alignment do not match the rest of the
composer, and an empty “Report context” heading can appear without explaining
that no finding is selected. The user's screenshot confirms this problem. Do
not treat that arrangement as the design to repeat.

Before implementing a replacement, create a reviewable desktop and mobile
design in the context of the whole Help journey. It should make the email the
primary artifact, group answers and edit actions clearly, handle no selected
finding explicitly or omit the empty group, and avoid implying that the summary
always matches a manually edited message. Show source and historical caveats
when findings are included. Confirm the direction with the user rather than
assuming this brief is an approved layout.

## Consistency and release checklist

For each new or changed interface:

1. **See the surrounding journey first.** Inspect the actual entry point,
   adjacent screens and reusable components. Match their hierarchy, wording,
   spacing, button roles, icon treatment and responsive behavior; don't invent a
   parallel visual language for one feature.
2. **Design the states, not only the happy path.** Include empty, selected,
   loading, unavailable, stale, error and long-content states where relevant;
   consider existing and manually edited drafts, attachments and return paths.
3. **Preserve meaning.** Active, no active notice found and unavailable are
   distinct. Historical reports do not establish current status or cause. Keep
   official provenance, freshness, uncertainty and explicit sending boundaries.
   Never show examples as live information.
4. **Use realistic synthetic content.** Check long supplier names, report
   citations, multiple findings and no findings. Keep previews clearly labeled;
   avoid real private data, live messages or automatic submissions.
5. **Check English and Spanish and keyboard access.** Use meaningful labels,
   visible focus, usable controls and sufficient contrast. Check enlarged text
   and reduced motion as applicable; do not rely on color alone.
6. **Inspect the rendered result.** Compare desktop and narrow mobile views in a
   browser, including a complete relevant journey. Check overflow, wrapping,
   alignment, focus order and visual hierarchy. Automated tests complement,
   but do not replace, visual review.
7. **Keep behavior connected.** Verify edits and back navigation, saved-draft
   resumption, relevant citations and file handling. Preserve manual edits and
   warn when a generated draft is out of date. Check actual local and hosted
   storage paths where the change touches them; do not infer delivery from a
   synthetic test.
8. **Record and review.** Update the affected design reference and app changelog
   when appropriate; state what was actually checked and whether anything was
   deployed. Get user approval for a material visual redesign before treating
   it as the new standard.
