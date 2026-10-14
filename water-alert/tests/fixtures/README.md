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
