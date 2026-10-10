# Recorded household sample — CC BY 4.0

`site032_summer.csv.gz` contains measured observations from **Cache County High Resolution Residential Water Use Data**, Camilo J. Bastidas Pacheco, Tarek Atallah and Jeffery S. Horsburgh (2023), DOI [10.4211/hs.0b72cddfc51c45b188e0e6cd8927227e](https://doi.org/10.4211/hs.0b72cddfc51c45b188e0e6cd8927227e).

Source: https://www.hydroshare.org/resource/0b72cddfc51c45b188e0e6cd8927227e/
License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). Attribution applies to this redistributed subset and chart transformations. The source authors do not endorse this app.

## Modifications and reproduction

Downloaded `3_QC_Data/site032qc_data.csv` on October 9, 2026. Verified original SHA-256 `27e38f3794b1335bd32cc011d1c2e09c9e93b8a4fe48033d0178cc723fb6753f`. Retained only observations with `2020-08-12 09:41:00 <= Time < 2020-08-28 09:34:00`, the summer window from `2_LogFiles/site032qc_log.csv`. No observation values changed. Header and selected lines were normalized to UTF-8 with LF endings and a final newline, then compressed with Python `gzip.compress(data, mtime=0)`.

Uncompressed fixture: 7,631,994 bytes; SHA-256 `e52624a3736a7cbd8d219060c821b12f4a5e885541d062f4cb584861565dcd80`; 345,491 observations, 1,668,299 pulses. Site032 metadata from `1_SecondaryData/sites.csv` supplies 0.008699 gallons/pulse. UI grouping sums pulses by original timestamp hour and multiplies by that factor; no imputation, timezone conversion or classification.

Run `venv/bin/python -m pytest tests/test_sample_data.py -q` to reproduce the audit offline. Full original metadata fingerprints and measured meter/logger differences are in `RESEARCH_REPORT.md`.

## Limitations

This is a Utah household, not the user's meter or evidence of Arkansas household patterns. Raw timestamps are naive: timezone and interval-start/end interpretation remain unverified. Partial opening/closing hours are retained. All adjacent summer observations are four seconds apart; a measured zero pulse reading is not missing. No documented physical leak labels are included; leak status is unknown. Do not join this selection to winter observations or infer continuous flow or local overnight usage.
