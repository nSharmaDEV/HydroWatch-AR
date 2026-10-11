"""Safe export tests: CSV injection protection + escaped HTML summary.

Non-claims: an export is a faithful copy of user-entered records. It never turns
missing data into zero and never asserts validity, agency status or safety.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

from fieldbook import exports
from fieldbook.records import Measurement, SampleReference, Site, Visit
from fieldbook.store import Revision, VisitDetail

OBS = datetime(2026, 10, 11, 9, 30, tzinfo=timezone.utc)
REVIEW = datetime(2026, 10, 11, 15, 0, tzinfo=timezone.utc)


def make_detail(*, notes="Bank survey, clear water.", workspace="working"):
    site = Site(site_id="S-AB12CD34", name="Ponca access",
                water_body="Buffalo National River", lat=36.03, lon=-93.36,
                coord_provenance="handheld GPS")
    visit = Visit(visit_id="V-AB12CD34", site_id=site.site_id, observed_at=OBS,
                  notes=notes, state="recorded", reviewed_at=REVIEW,
                  created_at=OBS, updated_at=OBS)
    measurements = (
        Measurement(measurement_id="M-1", visit_id=visit.visit_id,
                    parameter_code="temperature", value=18.4, unit_code="celsius",
                    method_code="probe", instrument_ref="YSI ProDSS", note=None),
        Measurement(measurement_id="M-2", visit_id=visit.visit_id,
                    parameter_code="turbidity", value=None, unit_code=None,
                    method_code=None, instrument_ref=None, note="could not read"),
    )
    samples = (
        SampleReference(sample_ref_id="X-1", visit_id=visit.visit_id,
                        sample_id="BNR-2026-10-11-01", collected_at=OBS,
                        status="collected"),
    )
    revisions = (
        Revision(revision_id="R-1", record_kind="visit", record_id=visit.visit_id,
                 revision_num=1, reason="corrected notes",
                 prior_values={"notes": "old"}, created_at=REVIEW),
    )
    return VisitDetail(visit=visit, site=site, measurements=measurements,
                       samples=samples, revisions=revisions, warnings=())


# ------------------------------------------------------------------- safe_cell

def test_safe_cell_passes_finite_numbers_through():
    assert exports.safe_cell(-18.2) == "-18.2"
    assert exports.safe_cell(0.0) == "0.0"
    assert exports.safe_cell(42) == "42"


def test_safe_cell_blank_for_missing():
    assert exports.safe_cell(None) == ""


def test_safe_cell_neutralizes_formula_text():
    assert exports.safe_cell("=cmd|'/c calc'!A1").startswith("'")
    assert exports.safe_cell("+x").startswith("'")
    assert exports.safe_cell("-2+3").startswith("'")
    assert exports.safe_cell("@sum").startswith("'")
    assert exports.safe_cell("\ttab").startswith("'")


def test_safe_cell_keeps_plain_text_unchanged():
    assert exports.safe_cell("probe") == "probe"


# ------------------------------------------------------------------ csv_tables

def _rows(text):
    return list(csv.reader(io.StringIO(text)))


def test_csv_tables_have_expected_tables_and_headers():
    tables = exports.csv_tables(make_detail(), "working")
    assert set(tables) == {"sites", "visits", "measurements", "samples"}
    for name in tables:
        assert name in exports.CSV_HEADERS
        assert _rows(tables[name])[0] == list(exports.CSV_HEADERS[name])


def test_csv_measurements_missing_cell_is_empty_not_zero():
    tables = exports.csv_tables(make_detail(), "working")
    rows = _rows(tables["measurements"])
    header = rows[0]
    body = {r[header.index("parameter_code")]: r for r in rows[1:]}
    assert body["temperature"][header.index("value")] == "18.4"
    assert body["turbidity"][header.index("value")] == ""  # missing, never 0


def test_csv_negative_reading_stays_numeric():
    detail = make_detail()
    m = Measurement(measurement_id="M-3", visit_id=detail.visit.visit_id,
                    parameter_code="temperature", value=-18.2, unit_code="celsius",
                    method_code="probe", instrument_ref="YSI ProDSS")
    detail = VisitDetail(visit=detail.visit, site=detail.site,
                         measurements=detail.measurements + (m,),
                         samples=detail.samples)
    rows = _rows(exports.csv_tables(detail, "working")["measurements"])
    header = rows[0]
    cell = [r[header.index("value")] for r in rows[1:]
            if r[header.index("measurement_id")] == "M-3"][0]
    assert cell == "-18.2"  # untouched, not quoted/neutralized


def test_csv_notes_formula_neutralized():
    detail = make_detail(notes="=1+1")
    rows = _rows(exports.csv_tables(detail, "working")["visits"])
    header = rows[0]
    assert rows[1][header.index("notes")].startswith("'")


# ---------------------------------------------------------------- csv_filename

def test_csv_filename_marks_demo_only():
    assert exports.csv_filename("visits", "V-AB12CD34", "working") == \
        "V-AB12CD34-visits.csv"
    assert exports.csv_filename("visits", "V-AB12CD34", "demo") == \
        "demo-V-AB12CD34-visits.csv"


# ---------------------------------------------------------------- summary_html

def test_summary_html_escapes_hostile_text():
    detail = make_detail(notes='<script>alert("x")</script> <b>bold</b>')
    html = exports.summary_html(detail, "working")
    assert "<script" not in html.lower()
    assert "&lt;script&gt;" in html
    assert "<b>bold</b>" not in html
    assert "&quot;" in html or "&#34;" in html


def test_summary_html_has_no_external_resources():
    html = exports.summary_html(make_detail(), "working")
    assert "http://" not in html and "https://" not in html
    assert "src=" not in html.lower()


def test_summary_html_demo_marker():
    work_html = exports.summary_html(make_detail(), "working")
    demo_html = exports.summary_html(make_detail(), "demo")
    assert "SAMPLE" not in work_html
    assert "SAMPLE" in demo_html
    assert "user-entered" in work_html.lower()
    assert "not a government" in work_html.lower()


def test_summary_html_lists_records_and_issues():
    detail = make_detail()
    html = exports.summary_html(detail, "working")
    assert "V-AB12CD34" in html
    assert "S-AB12CD34" in html
    assert "Not measured" in html or "not measured" in html
    assert "18.4" in html
