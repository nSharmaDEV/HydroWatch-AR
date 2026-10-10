# HydroWatch AR — research findings

**Checked:** October 9, 2026. **Scope:** research and planning only; no application implementation, deployment, utility-account access, or leak-detection accuracy evaluation.

**Subsequent implementation:** After this research, the user explicitly approved the narrower sample-only MVP. `sample_app.py` and `sample_data.py` now implement it with a bundled site032 summer subset, chart/day selection, totals, coverage and attribution. This report preserves the research findings as recorded; statements below about awaiting approval describe the research-stage recommendation, not the current build status. No unresolved evidence was converted into a diagnostic claim, and neither existing app was modified.

## Recommendation

Use **Utah State University's Cache County High Resolution Residential Water Use Data**, household **site032, summer collection period only**, for an illustrative measured-usage explorer. It is publicly accessible and licensed CC BY 4.0. None of the candidates checked supplies suitable documented, measured household leak ground truth. This is not a claim that no such dataset exists anywhere.

The smallest evidence-supported MVP is a **separate, sample-only usage chart and data-quality summary**. Defer uploads, overnight rules, ML, risk scores, leak classifications, alerts, and savings claims. Preserve the implemented `notice_app.py` and legacy `app.py`. The explorer is not built, and this report does not authorize implementation.

## 1. Dataset comparison

| Candidate / authoritative source | Access and license | Household readings and intervals | Documented labels / decision |
| --- | --- | --- | --- |
| [USU Cache County](https://www.hydroshare.org/resource/0b72cddfc51c45b188e0e6cd8927227e/) — DOI `10.4211/hs.0b72cddfc51c45b188e0e6cd8927227e` | Published HydroShare resource; anonymous API and actual CSV downloads succeeded; CC BY 4.0; approximately 1.1 GB overall | 31 measured whole-home Utah residences; 4-second pulses; summer and winter collection periods; per-site gallons/pulse metadata | Faucet, toilet, shower, irrigation, clotheswasher, bathtub, unclassified/unknown end-use labels, **not documented leak truth**. Recommended only for illustrative usage. |
| [USU Water Conservation Project](https://www.hydroshare.org/resource/fe0377e960b741c4a52dc6ea49db7d80/) | Published March 2026; public metadata and file listing; CC BY 4.0; approximately 7.6 GB. Individual raw files not audited | Approximately 78 Logan/Hyde Park households; 5-second Flume measurements, summer/fall 2022 | Irrigation training labels, not documented leaks. Larger and unnecessary for the first sample. |
| [German Smart Meter Water Consumption Measurements](https://zenodo.org/records/7506076) — DOI `10.5281/zenodo.7506076` | Anonymous household ZIP download succeeded; CC BY 4.0 | 17 households; cumulative `total_m3`, timestamps and Unix time. Audited `hh-04` contains irregular sub-minute observations and long gaps. Record describes September 2021–September 2022, but sampled file includes earlier observations | No leak-label file in audited archive or leak labels in record documentation. Requires cumulative differencing, reset/gap treatment. Publisher article was inaccessible; fixed cadence not confirmed. |
| [Aalborg Residential Household Dataset](https://zenodo.org/records/15180141) — DOI `10.5281/zenodo.15180141` | Anonymous `final_data.zip` download succeeded; CC BY 4.0 | Hourly liters: 10 Danish single-family homes for one year; separate eight-building diary subset totals 122 days. Audited both CSVs; representative per-building timestamp differences are 3,600 seconds | Occupancy and appliance context, not leaks. Good alternative for hourly visualization, not leak evaluation. `daily_data.csv` means daily occupancy labels, **not daily water cadence**. |
| [DAIAD data](https://github.com/DAIAD/data), [repository catalog](https://hardmin.heal-link.gr/dataset/700cde6f-ef69-41f0-8fec-9c3f74ae38d4) | Research repository ZIP responded to anonymous byte-range request; full archive not audited. Repository says CC-BY-SA; catalog specifies CC BY-SA 4.0 | 1,007 Alicante utility meters; hourly records January 2015–May 2017; documented meter ID, timestamp, cumulative liters, liters since preceding reading | No documented leak-label column. Database/export timezone interpretation and DST still need verification. Catalog's separate “Average” CSV is not assumed household-level. |
| LBNL candidate | No specific suitable publicly downloadable, licensed water-interval dataset verified | Official [Residential Leakage Database](https://homes.lbl.gov/residential-leakage-database) concerns **building air/duct leakage**, not household water consumption | Reject that particular candidate; do not conclude LBNL has no water research or datasets. |
| [KIOS Water-Usage-Dataset](https://github.com/KIOS-Research/Water-Usage-Dataset) | Public repository; EUPL 1.2 repository license; dataset-specific scope requires care | STREaM **synthetic** two-person household; 10-second total and five appliance readings; 90/45/45 train/validation/test days | Not measured household leak ground truth. Could only support explicitly synthetic software tests. |
| [LeakDB](https://github.com/KIOS-Research/LeakDB) | Public simulated benchmark. Paper DOI `10.5281/zenodo.1313116` is not the dataset license; README links [dataset record](https://zenodo.org/records/13985057) | Simulated water-distribution **networks**, not measured household meter series | Leak scenarios do not establish household applicability. Reject domain mismatch; do not transfer the paper's license to the dataset. |

Access checks distinguish a metadata page from an actual file download. Only the recommended full household file was completely audited for parsing and cadence; other checks have the limitations shown above. End-use, occupancy, and synthetic scenario labels cannot be relabeled as confirmed physical household leaks.

## 2. Complete recommended-household audit

Source authors: Camilo J. Bastidas Pacheco, Tarek Atallah, and Jeffery S. Horsburgh (2023). Read the source's anonymization and limitations; public household data still concerns private routines.

Actual source paths under the [resource contents](https://www.hydroshare.org/resource/0b72cddfc51c45b188e0e6cd8927227e/data/contents/):

- `1_SecondaryData/sites.csv`: site032 `MeterResolution = 0.008699` gallons per pulse.
- `2_LogFiles/site032qc_log.csv`: collection boundaries and logger/meter quality-control totals.
- `3_QC_Data/site032qc_data.csv`: `Time,Pulses`; complete file downloaded and audited in memory, not saved to the repository.
- `5_EnventFiles_Processed/Events_site_FV_032.csv`: actual folder spelling differs from README description. Complete site032 event-label column was inspected: irrigation, faucet, toilet, bathtub, shower, clotheswasher, unclassified; no leak class.

### Findings

| Check | Result |
| --- | --- |
| Entire QC CSV | 694,507 rows; all timestamps parse; all pulses nonnegative integers; no duplicate timestamps or non-increasing observations |
| Summer selection | Log window `2020-08-12 09:41:00 <= Time < 2020-08-28 09:34:00` |
| Actual summer observations | 345,491 rows; first `2020-08-12 09:41:17`, last `2020-08-28 09:33:57` |
| Summer cadence | All 345,490 adjacent differences exactly 4 seconds; no interior timestamp gaps |
| Summer pulse total | 1,668,299 pulses; 322,070 rows have measured zero pulses, which are not missing rows |
| Conversion | `sum(Pulses) × 0.008699 = 14,512.533001 gallons`, exactly matching the published logger total |
| Independent meter comparison | Published meter volume 15,263 gallons; logger difference −4.9169%. This is an instrument-volume comparison, **not leak-detection accuracy** |
| Log expected vs actual | 345,495 expected vs 345,491 actual. The shortfall is at the opening edge, not an interior gap |
| Timestamp-hour grouping | 385 buckets: 383 contain 900 observations, opening bucket 281, closing bucket 510. Regrouped volume still totals 14,512.533001 gallons |
| Boundary bucket sums | Opening 53.003007 gallons; closing 12.213396 gallons. Both must be marked partial |
| Winter cross-check | Half-open log window gives 349,015 rows with uninterrupted 4-second differences and 1,513.338933 gallons. A zero-pulse row exactly at `2020-12-03 15:25:00` explains the log's 349,016 actual rows when included |

Do not join summer and winter as continuous history: the intervening months are unobserved. This single-household audit does not establish quality or representativeness for every household in the resource.

### Unresolved clock and interval ownership

Raw timestamps lack timezone offsets. Processed event timestamps append `Z` to matching clock values; that alone does not prove the raw observations are UTC. The linked [supporting analysis resource](https://www.hydroshare.org/resource/379d9e7037f04478a99d5aec22e841e6/) was checked, including its `DataHandler.R` and `DataAnalysis.R`; no explicit timezone resolution was found. No author was contacted.

Whether each pulse count's timestamp denotes an interval start or end is also not established. A count of 900 observations in an hour establishes timestamp-grid completeness, not exact physical interval ownership. Do not silently assume UTC, Utah local time, or Arkansas local time; do not implement a local 01:00–05:00 rule using these values.

### Source fingerprints

SHA-256 of downloaded source bytes (for later fixture reproducibility):

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `sites.csv` | 3,961 | `f8456b2c973e0b9130edd9c225b14c2cdb786e1d09647bfcb83595a2c813d9bf` |
| `site032qc_log.csv` | 421 | `d8fa75fbc0c034d9ab96413cb53b47c3b601955f4133151d7fc7aba1c64e4e7c` |
| `site032qc_data.csv` | 15,317,769 | `27e38f3794b1335bd32cc011d1c2e09c9e93b8a4fe48033d0178cc723fb6753f` |

## 3. Proposed sample data contract — approval still required

- Bundle only the summer site032 selection or its derived timestamp-hour sums, not the entire resource. Identify measured Utah data, site, collection window, source DOI, authors, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), and all transformations.
- Preserve the original timestamp text. Store/display timezone as **unknown source clock**, and interval timestamp meaning as **unverified**. Do not append `Z` or perform timezone conversion.
- Retain raw integer pulses and the site's explicit conversion factor. Compute with adequate precision; round only display values.
- If grouping, describe values as **gallons grouped by recorded timestamp hour**, not confirmed local hourly consumption or continuous flow. Retain observation count, expected count (900 for a full timestamp hour), partial-edge status, source period, and known gaps.
- Never zero-fill absent observations. Measured zero pulses are valid observations. Reject malformed/negative pulses and duplicates rather than silently merging them. Keep collection periods separate.
- Present raw timestamp range, total recorded gallons, source-clock chart, completeness, partial boundaries, and caveats. Daily groups must similarly identify partial days and unknown clock basis.
- Persistent notice: **“Recorded Utah household sample—not your meter. Leak status unknown. Source timezone unverified.”**
- Before a future fixture is accepted, reproduce hashes, row counts, conversion and regrouping totals; test duplicate/malformed/gap handling and partial edges. These are software/data-integrity tests, not detection validation.

The summer period exceeds 14 calendar days, but that does not validate a 14-day ML threshold. No minimum ML history or coverage requirement has been established; ML is excluded from this MVP.

## 4. Northwest Arkansas utility-export feasibility

Public documentation was reviewed, not private customer portals. No provider was contacted and no consenting customer's actual export was obtained. None of the reviewed primary sources established a usable hourly CSV schema. This means **compatibility unverified**, not “exports do not exist.”

| Provider | Primary-source evidence | Remaining gate / public contact |
| --- | --- | --- |
| Fayetteville | [Billing](https://www.fayetteville-ar.gov/419/Water-Service-and-Billing) describes UtilityAccess consumption/account views and downloading past bills. [Meter reading](https://www.fayetteville-ar.gov/435/Meter-Read) describes AMR and cellular-endpoint testing; undated rollout figures are not current coverage evidence | Obtain documented interval export, not bill PDF; 479-521-1258, `utilitybill@fayetteville-ar.gov` |
| Rogers | [Online account help](https://www.rogerswaterar.gov/new-customers/online-account-management/online-account-help/) covers accounts/payments/connections; [FAQs](https://www.rogerswaterar.gov/business/services-and-information/faqs/) discuss meters and services | Export schema/cadence unknown; 479-621-1142 |
| Bentonville | [Payments](https://www.bentonville.ar.gov/244/Online-Payments---Updated-Website) describes InvoiceCloud and bill PDFs; [meter reading](https://www.bentonville.ar.gov/240/Meter-Reading) describes automatic reading conversion | AMI does not prove a customer CSV interface; 479-271-3100, `utilitybilling@bentonville.ar.gov` |
| Springdale | [Official site](https://springdalewaterar.gov/) offers billing, e-statements, and leak reporting | No public hourly-export specification found; 479-751-5751. Do not confuse it with Springdale, Utah |

To reopen uploads, obtain a consenting customer's redacted file plus provider documentation for units, cadence, timezone/DST, start/end meaning, cumulative versus interval totals, estimated/missing readings, meter resets, and a single-household meter context. Do not request credentials, address, or account number. Support only the tested variant; no generic Green Button or statewide compatibility promise.

Local relevance is supported by providers' published usage and inspection advice, not by evidence of this app's effectiveness. [Rogers' high-usage guidance](https://www.rogerswaterar.gov/your-water/efficiency-and-leak-detection-tips/possible-causes-of-higher-than-average-water-usage/) lists explanations such as visitors, irrigation, and pool filling. [Fayetteville's inspection guidance](https://www.fayetteville-ar.gov/447/Water-Leak-Check) warns not to operate the valve in the meter box. Link to provider guidance; suggest reviewing expected use, visible drips/running toilets, or contacting a utility/plumber. Do not instruct users to manipulate utility valves or pressure-relief equipment.

## 5. Current Congressional App Challenge requirements

Primary authority: complete [2026 national rules PDF](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf), [student rules](https://www.congressionalappchallenge.us/students/rules/), and [participating districts](https://www.congressionalappchallenge.us/students/participating-districts/).

- **Deadline: Monday, October 26, 2026, noon EDT — 11:00 a.m. Arkansas CDT.**
- Middle/high-school enrollment at submission and U.S. residency requirements apply. One entry per student in one eligible district; teams up to four, with at least half meeting the district's residence/school requirement. Individual eligibility was not checked.
- Arkansas District 3 / Steve Womack appears on the national participating-district list. The [district-office page](https://womack.house.gov/constituentservices/app-challenge.htm) still gives 2025 dates and a 2024 rules link: **do not use its stale deadline**. Additional current district instructions remain unverified; public contact Chris Bader, 479-424-1146.
- Relevant new technical work must follow the rules' post–October 30, 2025 requirement; prior projects enter under the 2.0 provisions for new work. Do not submit unchanged old work as newly built.
- AI assistance is allowed with full disclosure and significant student contributions/understanding. It may support specific aspects, not replace the entire technical development. The rules require student/team coding and technical development; authorship compliance cannot be established by this research. Disclose tools, libraries, and actual assistance honestly.
- Demonstration video: **1–3 minutes, maximum three**, including participants, app title, purpose, audience, languages/tools, and working functionality. Upload to YouTube/Vimeo **publicly**, not unlisted.
- Judges can request app/source access in a reasonable manner. No national requirement was found for a public GitHub repository or hosted URL; a working local demonstration is not inherently excluded. ML is not required.
- Complete registration/eligibility steps using a personal email, required submission answers, and teammates' exit questionnaires. The actual submission portal and current district instructions should be checked before submission.

`SUBMISSION_CHECKLIST.md` already reflects the national deadline, video and disclosure requirements and preserves the notice-finder submission path. A new explorer is not necessary merely to satisfy a supposed ML requirement.

## 6. Hosting and privacy

Streamlit Community Cloud is a feasible hosting option in principle, not a tested deployment for this proposed explorer. [Deployment documentation](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app) and [platform status/limitations](https://docs.streamlit.io/deploy/streamlit-community-cloud/status) describe GitHub-based deployment, repository-root working directories and shared environment selection. A separate entry point must not break the existing notice finder or its dependencies.

- [Uploader documentation](https://docs.streamlit.io/knowledge-base/using-streamlit/where-file-uploader-store-when-deleted) says uploaded files are copied to **backend memory**, with the uploader buffer removed on replacement, clearing, or tab closure. This is not a guarantee about derived data, caches, backups, or platform logs.
- [Caching documentation](https://docs.streamlit.io/develop/concepts/architecture/caching) describes cross-user caches/global resources. Never place private household uploads in shared caches.
- [Configuration documentation](https://docs.streamlit.io/develop/concepts/configuration/options) provides a local usage-statistics opt-out, but Community Cloud's status page explicitly says it overrides `browser.gatherUsageStats` to `true`. Do not promise “zero telemetry,” even with a local configuration set to false.
- Exact platform log/backup retention and end-to-end deletion guarantees were not verified. Claims such as “closing the tab deletes everything” or “data never leaves your device” would be unsupported for a hosted uploader.

**Recommendation:** local demo/recording or public-sample-only hosting, with no uploads, personal identifiers, accounts, database, or application persistence. Public hosting remains optional and would require separate authorization and deployment verification. Private-upload retention is an unresolved gate, not a blocker for a public sample-only explorer.

## 7. Research gate disposition and smallest MVP

| Original PRD gate | Evidence-supported disposition |
| --- | --- |
| Dataset/access/license | Resolved for illustrative Cache County site032 summer sample; not a leak benchmark |
| Documented leak labels | None suitable among checked candidates; exclude leak performance claims |
| NWA utility exports | Unverified from public sources; real consented/redacted export and provider semantics required |
| Timezone/DST | Unresolved for selected source; source-clock visualization only; exclude overnight scoring |
| 14-day ML coverage | Not established; irrelevant to chart-only MVP |
| ML benefit/evaluation split | No suitable leak truth; no comparative benefit established; exclude ML |
| Hosting privacy/retention | Public-sample-only path feasible in principle; upload guarantees unresolved; no deployment tested |
| CAC requirements | National 2026 rules verified; individual eligibility, student authorship, submission portal and current district-specific details require participant checks |

**Proposed build, only after approval:** one independent Streamlit entry point; one measured sample; persistent provenance/limitations; recorded-usage chart; total volume and row/coverage summary; explicit partial boundaries; provider-guidance links. No classification, anomaly scoring, uploads, live connections, alerting, or mandatory export/report feature.

Acceptance is limited to reproducing this source audit, preserving missingness and partial edges, displaying correct units/provenance, and avoiding diagnostic language. Do not claim Arkansas representativeness, leak detection, safety, savings, or community impact. Existing notice finder and legacy prototype remain unchanged.

**Research completion boundary:** all planned public-source checks are reported above. Unavailable private exports, undocumented timestamp semantics, individual eligibility/authorship, platform retention details, and direct provider/author answers remain explicitly unresolved. Completing research is not the same as establishing unsupported facts. The next decision is approval or rejection of this narrower sample-only MVP—not immediate implementation of the original broader PRD.
