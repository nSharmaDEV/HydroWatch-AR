# ADH annual-report review — requested year 2025

Retrieved and reviewed October 19, 2026. This is the dated source archive, not
a live feed. A subsequent local UI update connects these records to Provider
information, with numbered findings and explicit conflict/missing states. No
deployment or live-advisory changes occurred.

## Coverage and result

The scope is all **35 drinking-water systems currently represented** by the
app's persisted ADH observations, the live ADH notice list checked for this
review, and its four catalog city suppliers. Lakes and synthetic samples are
excluded. This is not every water system in Arkansas or every historical year.

| Result | Systems |
| --- | ---: |
| PDF retrieved; violations and/or significant deficiencies reported | 17 |
| PDF retrieved; no violations or significant deficiencies reported | 14 |
| PDF retrieved; conflicting information needs clarification | 2 |
| No matching 2025 PDF located through the searches below | 2 |
| **Total** | **35** |

Thus **33 PDFs were retrieved and examined**, including the two conflicting
documents. “No violations reported” refers only to the document: it is **not** a
present-day safety or compliance assessment. Significant deficiencies are kept
distinct from formal violations. Nothing here establishes that a reported issue
is still open, has been resolved, or caused a current boil-water notice.

## Method and evidence

1. GET the public [ADH CCR search](https://health.arkansas.gov/eng/CCRSearch.aspx)
   using a cookie-preserving HTTP client; collect its hidden ASP.NET form fields.
2. POST the hidden fields plus `ctl00$MainContent$txtName` or
   `ctl00$MainContent$txtID`, `ctl00$MainContent$lstSection=2025`, and
   `ctl00$MainContent$btnSearch=Search`. No account or login was needed.
3. Match the returned system name, PWS ID and county to the app supplier. Follow
   the actual returned `d.aspx?P=...&YEAR=2025` link; do not manufacture a match
   from a similar name. Multiple county rows for one PWS/PDF are one report.
4. Check that the response is a PDF, preserve its bytes, and extract all physical
   pages with `pdftotext -layout`. Review result tables, footnotes, separate
   violation tables and significant-deficiency sections. Selected complex tables
   were also checked as rendered PDF pages.

[manifest.json](manifest.json) records exact app IDs, searches and returned rows,
selected PWS IDs/URLs, download sizes, SHA-256 hashes and physical page counts.
Original public PDFs are under `pdfs/`; extracted text is under `text/`, named by
PWS ID. These are dated source snapshots, not a live feed. Source documents may
change at the same URL. Page links below use **physical PDF pages**: some printed
footers have inconsistent totals (notably Banks, Sylamore Valley and Fort Smith).

Names requiring care: Midway is **PWS 153, Crittenden County**, not Lakeview-Midway
027; Bull Shoals is **352**, not Lake Bull Shoals Estates 031; Glen Acres is
**857**, not Glenwood 422. Cross County, East Johnson, West Stone and Springdale
have repeated search rows for multiple counties, not multiple distinct PDFs.

## Gurdon Waterworks

[Original ADH PDF](https://health.arkansas.gov/eng/d.aspx?P=087&YEAR=2025)
([saved copy](pdfs/087.pdf), [extracted text](text/087.txt)).

- **PWS 087; title: Gurdon Water Department 2025.** Page 1 lists three wells
  drawing from the Nacatoch Sand and Wilcox Group aquifers.
- **Page 2, significant deficiencies:** identified in the **April 22, 2025
  survey**. The grouped finding says: “Several tanks require modifications
  and/or inspections. The Airport Well lubricant should meet food grade
  standards.” These are significant deficiencies, not a measured-contaminant
  exceedance inferred by this review.
- **Reported progress:** “As of this date, we are working to correct the listed
  deficiencies.” No verified completion date or present-day resolution.
- The result tables mark violations **N**. Lead tap monitoring reports **1 of
  10 sites over the action level**, but its reported 90th percentile is
  **0.0112 ppm**, below the **0.015 ppm** action level. Do not convert that
  individual-site result into an additional system-level violation.
- This historical report does not explain or resolve Gurdon's October 2026
  boil-water notice.

## All systems

The PDF links in this table point to preserved local copies. Public URLs and
exact supplier identity mappings are in the manifest. “Findings” includes
significant deficiencies and explicitly attributed supplier findings; it is not
a count of formal enforcement actions.

| App supplier | PWS | PDF | Review outcome |
| --- | --- | --- | --- |
| Banks Waterworks | 068 | [PDF](pdfs/068.pdf) | Public-notice violation, p. 2 |
| Smackover Waterworks | 555 | [PDF](pdfs/555.pdf) | No violations/significant deficiencies reported |
| Waldron Waterworks | 498 | [PDF](pdfs/498.pdf) | Tank/standpipe significant deficiency, p. 2 |
| North Jackson Co Rural Water Assn | 767 | [PDF](pdfs/767.pdf) | No violations/significant deficiencies reported |
| Tuckerman Waterworks | 266 | [PDF](pdfs/266.pdf) | No violations/significant deficiencies reported |
| Cross County Rural Water Sys | 459 | [PDF](pdfs/459.pdf) | Overdue tank-inspection significant deficiency, p. 2 |
| Sylamore Valley Water Assn | 882 | [PDF](pdfs/882.pdf) | Bacteriological monitoring violation, p. 2 |
| Midway Water Association | 153 | [PDF](pdfs/153.pdf) | No violations/significant deficiencies reported |
| Riverside Resort at Kings River | — | Not located | No matching 2025 result; not a no-violations finding |
| Holly Grove Waterworks | 388 | [PDF](pdfs/388.pdf) | Overdue tank-inspection significant deficiency, p. 2 |
| Central Logan County PWFB | 845 | [PDF](pdfs/845.pdf) | Conflicting HAA5 information; also tank significant deficiency, p. 2 |
| South Mountain Water Assn | 815 | [PDF](pdfs/815.pdf) | No violations/significant deficiencies reported |
| Brunner Hill Public Water Authority | 837 | [PDF](pdfs/837.pdf) | Operator-licensing violation, p. 2 |
| Bergman Waterworks | 060 | [PDF](pdfs/060.pdf) | No violations/significant deficiencies reported |
| East Johnson Co Water Assn | 772 | [PDF](pdfs/772.pdf) | HAA5 violation, pp. 2–3 |
| Flippin Waterworks | 351 | [PDF](pdfs/351.pdf) | No violations/significant deficiencies reported |
| Glen Acres | 857 | [PDF](pdfs/857.pdf) | Tank-vent significant deficiency, p. 2 |
| Mockingbird Hill Water Assoc | 042 | [PDF](pdfs/042.pdf) | Tank-inspection deficiency and monitoring violations, p. 3 |
| Leslie Water System | 500 | [PDF](pdfs/500.pdf) | Three local violation rows and supplier turbidity marked Y, p. 2 |
| West Stone County Water Assn | 735 | [PDF](pdfs/735.pdf) | Monitoring violation and supplier turbidity marked Y, p. 2 |
| Lead Hill Waterworks | 063 | [PDF](pdfs/063.pdf) | Licensing and public-education violations, p. 2 |
| Fort Smith Water Utilities | 507 | [PDF](pdfs/507.pdf) | Tank significant deficiency, physical p. 3 |
| Palestine Water Association | 536 | [PDF](pdfs/536.pdf) | No violations/significant deficiencies reported |
| Dover Waterworks | 444 | [PDF](pdfs/444.pdf) | No violations/significant deficiencies reported |
| Texarkana Water Utilities | 360 | [PDF](pdfs/360.pdf) | No violations/significant deficiencies reported; assessment disclosed |
| Salem Water Users LLC | 492 | [PDF](pdfs/492.pdf) | Monitoring violation with two separate periods, p. 3 |
| USCOE OC - Little Fir | — | Not located | No matching 2025 result; not a no-violations finding |
| Gurdon Waterworks | 087 | [PDF](pdfs/087.pdf) | Tank/lubricant significant deficiencies, p. 2 |
| Leisure Hills Mobile Home Park | 747 | [PDF](pdfs/747.pdf) | Four compliance issues, p. 2 |
| Newport Waterworks | 264 | [PDF](pdfs/264.pdf) | No violations/significant deficiencies reported |
| Bull Shoals Water System | 352 | [PDF](pdfs/352.pdf) | Tank significant deficiencies, p. 2 |
| Fayetteville Waterworks | 569 | [PDF](pdfs/569.pdf) | No violations/significant deficiencies reported |
| Springdale Water Utilities | 575 | [PDF](pdfs/575.pdf) | Requested 2025, but title/footer 2024 and results 2025 |
| Rogers Water Utilities | 055 | [PDF](pdfs/055.pdf) | No violations/significant deficiencies reported |
| Bentonville Water Utilities | 041 | [PDF](pdfs/041.pdf) | No violations/significant deficiencies reported |

## Reported findings and actions

Dates below follow the reports' **month/day/year** convention. Survey/inspection
dates identify deficiencies; they are **not** violation start dates. Actions and
progress are what the documents report, not independent checks of resolution.
Where a source groups several deficiencies, preserve that grouping instead of
inventing an enforcement count. Separate date intervals are not continuous.

### Violations and supplier result flags

- **Banks 068, p. 2:** failed to conduct public notice of a total-coliform
  monitoring violation within the mandated timeframe, **5/1/2025–12/31/2025**.
  Action: **“No corrective action taken.”** The referenced monitoring violation
  does not itself supply another dated violation row in this report.
- **Sylamore Valley 882, p. 2:** failed to submit the proper number of valid
  bacteriological samples, **7/1/2025–7/31/2025**. Action: resumed
  bacteriological monitoring as required by state and federal regulations.
- **Brunner Hill 837, p. 2:** state licensing regulations were not met,
  **4/1/2025–5/31/2025**. Action: operator obtained a license in compliance
  with state regulations.
- **East Johnson 772, pp. 2–3:** HAA5 running annual average exceeded **60
  ppb**; **fourth-quarter 61 ppb at site YD008**. Period:
  **10/1/2025–1/1/2026**. Action: reviewing disinfection procedures and working
  on a solution to lower distribution-system disinfection by-products. The
  reported Level 1 coliform assessment was completed; it is not counted here
  as another formal violation.
- **Mockingbird Hill 042, p. 3:** failed to monitor and/or report sample
  results under RTCR, **5/1/2025–5/31/2025** and separately
  **8/1/2025–8/31/2025**. Action: resumed submission of the sampling report as
  required by state and federal regulations. Also has the deficiency below.
- **Leslie 500, p. 2:** three explicit local violation rows:
  1. Failed to monitor/report RTCR sample results,
     **09/01/2025–10/31/2025**. Action: resumed monitoring and submission of
     the sampling report as required by state and federal regulations.
  2. Failed to submit the proper number of valid bacteriological samples,
     **09/01/2025–09/30/2025**. Action: resumed bacteriological monitoring as
     required by state and federal regulations.
  3. State licensing regulations were not met,
     **09/01/2025–10/31/2025**. Action: operator obtained a license in
     compliance with state regulations.
  The table also marks **Community Water's supplied-water turbidity Y**,
  highest yearly sample **2.49 NTU**, with **99.4%** meeting the turbidity
  limit. Preserve the upstream attribution. No exact incident dates or
  corrective action for that supplier row are provided here.
- **West Stone 735, p. 2:** failed to submit valid bacteriological samples,
  **05/01/2025–05/31/2025**. Action: resumed bacteriological monitoring as
  required by state and federal regulations. Also reports **Community Water's
  supplied-water turbidity Y**, **2.49 NTU / 99.4%**, with the same attribution
  and missing-date/action limits as Leslie. Do not imply West Stone operated
  the upstream treatment plant.
- **Lead Hill 063, p. 2:** licensing violation,
  **1/1/2025–4/1/2025**; operator obtained a license in compliance with state
  regulations. Failed public notice concerning operator licensure during
  **3/1/2025–3/31/2025** and separately **5/1/2025–5/31/2025**. Reported action:
  conducted the public notice in **November 2025**. That month is report
  wording, not a verified current completion check.
- **Salem 492, p. 3:** failed to submit the proper number of valid
  bacteriological samples, **4/1/2025–4/30/2025** and separately
  **10/1/2025–12/31/2025**. Action: resumed bacteriological monitoring as
  required by state and federal regulations.
- **Leisure Hills 747, p. 2:** four rows, consistent with the existing app:
  1. Failed to monitor/report RTCR results, **07/11/2025–07/31/2025**;
     resumed submission of required sampling reports.
  2. Failed to submit valid bacteriological samples,
     **10/01/2025–10/31/2025**; resumed required bacteriological monitoring.
  3. State licensing requirements not met, **01/01/2025–12/31/2025**;
     corrective action **“None.”**
  4. Failed Public Education Notice concerning a National Primary Drinking
     Water Regulation violation, **10/01/2025–“Current”** as printed;
     corrective action **“None.”** “Current” is not verified October 2026 status.

### Significant deficiencies

| System / page | Identified in report | Reported deficiency | Reported progress |
| --- | --- | --- | --- |
| Gurdon 087 / 2 | Survey 4/22/2025 | Several tanks require modifications/inspections; Airport Well lubricant should meet food-grade standards | Working to correct the listed deficiencies |
| Waldron 498 / 2 | No date provided | Roof vents on several tanks/standpipes need repair; Brigance standpipe cable float indicator must be removed or repaired | Working to address the deficiency |
| Cross County 459 / 2 | Survey 3/21/2023 | Some tanks overdue for required five-year inspections | Securing funds to rehabilitate tanks, including clearwells |
| Holly Grove 388 / 2 | Inspection 12/8/2023 | Water storage tanks not inspected in more than five years | Submitted a plan to get tanks inspected |
| Glen Acres 857 / 2 | Inspection January 14, 2025 | Tank vent needs #24 mesh screen; color photograph of installation must go to ADH | “No progress reported.” |
| Mockingbird Hill 042 / 3 | Inspection 11/14/2024 | Tanks 1 and 2 overdue for five-year inspections; results must be submitted to ADH | Plan in place to correct the deficiency |
| Fort Smith 507 / physical 3 | Inspection March 25, 2025 | Screening repairs and grading work needed on several tanks | “No corrective action taken.” |
| Bull Shoals 352 / 2 | Survey November 6, 2024 | Tank 2 roof vent must meet standards; roof hatch needs gasket; sheet-metal covering needs proper welding/sealing | Working to correct; **expected May 2026 completion is only the report's projection**, not verified completion |

Central Logan's known tank deficiency is documented in the exception below,
not silently discarded because its contaminant findings are inconsistent.

## Exceptions requiring clarification

### Central Logan County PWFB — PWS 845

Page 2 simultaneously reports:

- **HAA5 violation “Y”**;
- highest running 12-month average **58 ppb**, below the displayed **60 ppb**
  MCL; sample range **16.7–89.9 ppb**;
- a footnote saying only the upper ranges exceeded their MCLs and **“there
  were no violations.”**

These conflict. Do not decide which is authoritative, label the report
“no violations,” or infer an annual-average violation from the maximum sample.
An ADH/provider clarification or corrected report is needed.

The same page separately reports a significant deficiency identified during the
**1/4/2024 inspection**: tank rehabilitation to slow/stop leaks and metal-component
decay, with sediment removal also a priority. Reported progress: sourcing funding
for the needed tank and infrastructure repairs. This finding is explicit even
though the HAA5 interpretation is held for clarification.

### Springdale — PWS 575

The search result and requested URL specify **2025**. The returned document's
title/footer say **2024**, while its test-results period says **2025**. Preserve
the PDF but do not silently assign it a verified report year. The app's existing
unreviewed/year-mismatch note remains appropriate pending clarification.

### No matching 2025 report located

- **Riverside Resort at Kings River:** searches for `Riverside` and `Resort`
  returned no matching report. `Kings` returned Kings Hill 827, Kingsland 108
  and Outside Kingsland 802—none matches this supplier. Do not substitute one.
- **USCOE OC - Little Fir:** searches for `Little Fir` and `Fir` returned no
  matching report.

Additional queries are preserved in [additional-searches.json](additional-searches.json).
These are unsuccessful searches for this requested year, not proof that the
systems have no reports in any year, are exempt, or have no violations.

## Other interpretation checks

- Do not classify a system as violating solely because some individual lead or
  copper samples exceed an action level: preserve the reported 90th-percentile
  result and the report's actual finding. This matters for Gurdon, Holly Grove,
  Leslie, Fort Smith and Palestine.
- A disinfection by-product **range maximum** above an MCL is not automatically
  an annual-average violation. For example, Dover's running averages are HAA5
  **51 ppb** and TTHM **65 ppb**, and its report explicitly says there were no
  violations despite higher range maxima. Fayetteville's TTHM range likewise
  must not be substituted for its running average.
- Texarkana discloses a **Level 1 coliform assessment and one required corrective
  action, completed as reported**. That assessment is retained as context, not
  invented as a separate formal violation. Its report scope must not be expanded
  into a blanket statement about all Texas-side source water.
- Unregulated monitoring results (for example Flippin PFBA or lithium in the
  Jackson County reports) are not converted into regulatory violations. Apparent
  unit/editorial inconsistencies should not be silently corrected into claims.
- Missing monitoring neither proves contamination nor establishes safety.
  Official current advisories remain separate and controlling.

## Application status

Archive checks passed: 35 unique supplier mappings; every persisted system ID
covered; all 33 PDF signatures, byte sizes and SHA-256 hashes verified; extracted
page counts match physical PDF counts; all local review links resolve; coverage
table counts reconcile. These checks validate archive integrity, not regulatory
interpretations or present-day conditions. No app test rerun was needed for this
research-only batch.

This review supplies source evidence and findings for all 35 systems, including
explicit missing/conflicting cases. **It does not modify `src/annual-reports.ts`
or the current UI catalog.** Integrating the additional findings requires
separate UI/data work to distinguish significant deficiencies, upstream-supplier
findings, inspection dates, multiple violation intervals and unresolved source
contradictions without mislabeling them. No automatic retrieval service or
ongoing report monitoring was installed.
