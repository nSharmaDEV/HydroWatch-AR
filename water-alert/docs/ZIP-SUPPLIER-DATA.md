# ZIP supplier data

This directory-only feature suggests systems whose mapped service areas have
positive polygon overlap with a Census ZIP Code Tabulation Area (ZCTA). It does
not identify a household's supplier, modify official advisory matching, or prove
that a supplier or advisory is absent. Private wells are outside coverage.

## Pinned inputs and limitations

Snapshot downloaded **2026-11-10 UTC** (November 9 local). Exact input SHA-256 hashes,
source endpoints and directory hash are in `src/directory/zip-suppliers.json` and
`src/directory/zip-supplier-audit.json`. Raw responses remain in an external cache.

- [EPA community-water-system boundaries](https://www.epa.gov/ground-water-and-drinking-water/public-water-system-service-areas),
  [CWS layer 0](https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/Water_System_Boundaries/FeatureServer/0):
  668 features selected by `Primacy_Agency='AR'`. EPA version 3.0 was released March
  17, 2026; its community-system geometry was unchanged from 2.1. The hosted edit
  timestamp does **not** establish recent boundary verification. The overview and
  hosted description differ on the SDWIS universe vintage (2023 Q4 versus 2025 Q2);
  the pinned response hashes identify what this app actually imported.
- [Census TIGERweb ZCTA layer 1](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1):
  **2020 Census / January 1, 2020** geography. The query envelope
  `-94.7,32.9,-89.5,36.6` includes all downloaded Arkansas boundary geometry and
  neighboring ZCTAs: 976 complete polygons. It does not clip those polygons to a
  state/county/city. [Not every postal ZIP has a ZCTA](https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html).
  A missing index entry is not a ZIP-validity decision.
- Existing active community-system directory checked November 8, 2026; all 658 IDs
  were present in the current EPA inventory response downloaded with the geometry.
  Inventory mailing ZIPs are **not** used. Reported `ZIP_CODE_SERVED` supplementation
  is omitted: same-quarter Arkansas completeness has not been established. An
  empty filtered efservice query is not proof that the ECHO quarterly table lacks
  ZIP-served information.

## Reconciliation and audit

- 657 directory systems have geometry; **River Chase Water Association,
  AR0001297**, has none and remains available through name search.
- 11 boundary IDs are absent from the active directory. They are retained in the
  audit, not converted into selectable active suppliers or guessed aliases. Names
  and IDs are not fuzzily joined. Tribal-style `ART001101` is preserved as a valid
  directory identity, not rejected for containing a letter.
- The three modeled systems are AR0000503, AR0000883 and AR0001240. EPA's
  `Symbology_Field` classifies origin; **`Data_Source` is a source URL**, not that
  classification. The modeled boundaries date to June 6, 2024; most sourced
  boundaries have ADH source date July 8, 2023. Missing source dates stay missing.
- 641 ZCTAs have at least one reconciled candidate. These include neighboring
  states where a ZCTA intersects mapped Arkansas-system geometry; no city/county
  heuristic is used to erase cross-border overlap.
- 15 positive overlaps below 100 square meters are explicitly listed for review.
  They remain candidates, not confidence scores. Point/line-only touches do not
  count. Holes and disconnected islands are respected. Input rings/coordinates
  are validated and geometry-processing errors abort generation rather than
  silently publishing partial results; this is not independent field verification
  or a general topology-quality certification.
- 11 active inventory records report wholesale activity. They remain qualified
  candidates because that flag does not establish wholesale-only service. Their
  rows warn users to confirm the billing supplier. No upstream/downstream advisory
  propagation or inferred retail assignment is performed.

Read-only spot audit: 72201 includes Central Arkansas Water; rural 72025 includes
Casa, Conway County Regional and NE Yell County; 72712 retains eight overlapping
records, including a flagged wholesaler; 71601 retains four. These checks inspect
source-derived candidates, **not the supplier for any particular household**.
National population-coverage claims are not Arkansas completeness guarantees.

## Refresh and reproduce

Use Node 24 and installed app dependencies. Turf geometry dependencies are
development-only; raw geometry and geometry-processing libraries are not imported
by the browser. Allow several minutes for full-resolution intersection processing.

```sh
# Download new raw responses into an external cache and print the audit.
npm run directory:zip -- --cache /absolute/external/cache --download
# Review source metadata/terms, counts, unresolved identities, wholesale flags,
# modeled origins, tiny overlaps, source dates and diff before accepting.
npm run directory:zip -- --cache /absolute/external/cache --write
# Without --download, regeneration is offline from the cached inputs.
npm test -- tests/zip-index.test.ts tests/zip-snapshot.test.ts tests/zip-search.test.tsx
npm run build
```

The downloader paginates in stable object-ID order, checks response counts, and
fails on unexpected source counts. Refresh the base directory first if active IDs
have changed. Recheck that the ZCTA query envelope contains the full EPA boundary
extent when sources change. Never overwrite old raw caches without keeping the
previous pinned inputs if exact historical reproduction is needed. Review and
update pinned snapshot assertions alongside a deliberately accepted refresh.

## Attribution and reuse

EPA's [hosted CWS item](https://epa.maps.arcgis.com/sharing/rest/content/items/80c6912ef14f46e480f5afd807767b4b?f=json)
publishes the following license. Original state/utility limitations still apply.
No direct Arkansas geometry export is separately redistributed here. Arkansas
metadata describes its boundaries as informational, not legal descriptions or
authoritative site-specific/service-boundary determinations; maintenance is not
guaranteed. Preserve that limitation:
[ADH/ASDI metadata](https://gis.arkansas.gov/metadata/HTML/asdi.utilities.PUBLIC_WATER_SYSTEMS_export.html).
Census federal materials are freely reproducible with requested attribution and
without accuracy warranty; ZCTAs are statistical approximations, not USPS service
boundaries. WAVE is not endorsed by EPA, ADH or Census.

### EPA hosted-item license

MIT License

Copyright (c) 2025 US EPA

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
