# Recorded agency responses

`adh-recorded.html` and `adeq-recorded.json` are byte-for-byte copies of the
automatic check captures retrieved on October 13, 2026 from the two approved URLs.
Their `.metadata.json` files preserve the original capture metadata; `verified:
false` describes capture-time state, before parser inspection and tests.
These files are offline test evidence, **not** a live-data fallback or sample data.

Inspected structures:
- ADH: one `GridView1`, six named columns, blank lift cells, explicit lifted dates,
  and duplicate notice rows for different counties. Recorded snapshot: five
  blank-lifted notices after county grouping.
- ADEQ: `updated` and `advisories`; each row has string `waterbody`, `county`,
  `area`, `date`, `lifted`. Recorded snapshot: 52 records, seven blank-lifted.
  `N/A` is preserved as unknown lift status, not inferred active or lifted.

Neither response establishes the agencies' genuine empty-feed output or explains
the meaning of `N/A`/asterisks. Mutated test cases are synthetic robustness tests,
not additional recorded agency evidence. No quoted water-use guidance is invented.

Separate frontend verification on **October 14, 2026** inspected ADEQ's official
`https://adeq.state.ar.us/water/planning/hab/default.js`: the current table filters
with `!advisory.lifted` (blank included; “N/A” and dates excluded). Its
“No advisories are in effect.” filtered-empty branch is distinct from
“Advisories could not be retrieved.” on failure. This verifies rendering behavior,
not the meaning of “N/A”/asterisks or a valid empty backing JSON feed; the parser
still rejects empty feeds. The synthetic cases in `adeq-semantics.test.ts` retain
blank/unknown/dated distinctions and test unknown-event suppression/persistence.

`src/adeq-guidance.ts` bundles verbatim English general guidance and reporting
contacts verified from `https://adeq.state.ar.us/water/planning/hab/default.aspx`
on **October 14, 2026**. It is not extracted from these record fixtures, not a
per-record reason, and not translated into Spanish. UI tests check the English
label, quote language, source, verification date and missing provenance. Browser
card checks use synthetic dates/records, never the proposal's illustrative
observation date or “47 of 47” count as agency evidence.
