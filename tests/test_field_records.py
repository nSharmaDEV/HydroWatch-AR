"""Domain validation for Watershed Fieldbook records.

The Iron Rule: missing is not zero; missing context saves as disclosed, structural
invalidity is rejected. Method and instrument are separate and trimmed only at edges.
"""
import math
import importlib
from datetime import datetime, timezone

import pytest

try:
    from fieldbook import records as R
except ModuleNotFoundError as exc:
    if exc.name != "fieldbook.records":
        raise
    pytest.fail("Fieldbook records module is missing (RED)")

TZ = timezone.utc


def dt(iso: str) -> datetime:
    return datetime.fromisoformat(iso)


class TestSites:
    def test_accepts_user_defined_site_without_coordinates(self):
        site = R.normalize_site("  Sample shoreline A  ", "Buffalo National River")
        assert site.name == "Sample shoreline A"
        assert site.water_body == "Buffalo National River"
        assert site.lat is None and site.lon is None
        assert site.origin == "user_defined"

    def test_rejects_unknown_water_body(self):
        with pytest.raises(R.ValidationError):
            R.normalize_site("X", "Lake Almanor")

    def test_rejects_empty_site_name(self):
        with pytest.raises(R.ValidationError):
            R.normalize_site("   ", "Beaver Lake")

    def test_requires_both_or_neither_coordinates(self):
        with pytest.raises(R.ValidationError):
            R.normalize_site("Half", "Beaver Lake", lat=36.1)
        site = R.normalize_site("Both", "Beaver Lake", lat=36.1, lon=-93.5,
                                coord_provenance="hand-held GPS, user-entered")
        assert site.lat == 36.1 and site.lon == -93.5

    def test_coordinate_ranges_and_finite(self):
        with pytest.raises(R.ValidationError):
            R.normalize_site("X", "Beaver Lake", lat=95.0, lon=0.0, coord_provenance="p")
        with pytest.raises(R.ValidationError):
            R.normalize_site("X", "Beaver Lake", lat=0.0, lon=-190.0, coord_provenance="p")
        with pytest.raises(R.ValidationError):
            R.normalize_site("X", "Beaver Lake", lat=float("nan"), lon=0.0, coord_provenance="p")

    def test_requires_coordinate_provenance_when_coords_present(self):
        with pytest.raises(R.ValidationError):
            R.normalize_site("X", "Beaver Lake", lat=36.1, lon=-93.5)


class TestVisits:
    def test_recorded_visit_requires_site_time_and_notes(self):
        R.build_visit(site_id="S1", observed_at=dt("2026-10-11T09:30:00-05:00"),
                      notes="Visible surface film from the bank.")
        with pytest.raises(R.ValidationError):
            R.build_visit(site_id="S1", observed_at=dt("2026-10-11T09:30:00-05:00"), notes="   ")
        with pytest.raises(R.ValidationError):
            R.build_visit(site_id="S1", observed_at=None, notes="notes")
        with pytest.raises(R.ValidationError):
            R.build_visit(site_id=None, observed_at=dt("2026-10-11T09:30:00-05:00"), notes="notes")

    def test_observation_time_must_be_timezone_aware(self):
        with pytest.raises(R.ValidationError):
            R.build_visit(site_id="S1", observed_at=datetime(2026, 10, 11, 9, 30), notes="n")

    def test_draft_only_needs_some_entered_context(self):
        draft = R.build_visit(site_id="S1", observed_at=None, notes="", state="draft")
        assert draft.state == "draft"
        # A fully empty draft is nothing worth saving.
        with pytest.raises(R.ValidationError):
            R.build_visit(site_id=None, observed_at=None, notes="", state="draft")

    def test_unknown_state_rejected(self):
        with pytest.raises(R.ValidationError):
            R.build_visit(site_id="S1", observed_at=dt("2026-10-11T09:30:00-05:00"),
                          notes="n", state="archived")


class TestMeasurements:
    def test_zero_is_a_real_value_and_missing_is_not_zero(self):
        zero = R.build_measurement(visit_id="V1", parameter_code="temperature", value=0.0,
                                   unit_code="celsius")
        assert zero.value == 0.0
        absent = R.build_measurement(visit_id="V1", parameter_code="temperature", value=None)
        assert absent.value is None
        assert absent.unit_code is None

    def test_rejects_non_finite_values(self):
        for bad in (float("nan"), float("inf"), float("-inf")):
            with pytest.raises(R.ValidationError):
                R.build_measurement(visit_id="V1", parameter_code="ph", value=bad)

    def test_rejects_text_instead_of_number(self):
        with pytest.raises(R.ValidationError):
            R.build_measurement(visit_id="V1", parameter_code="ph", value="7.2")

    def test_unit_must_match_parameter_contract(self):
        with pytest.raises(R.ValidationError):
            R.build_measurement(visit_id="V1", parameter_code="ph", value=7.2, unit_code="ntu")
        ok = R.build_measurement(visit_id="V1", parameter_code="ph", value=7.2, unit_code="ph")
        assert ok.unit_code == "ph"
        turb = R.build_measurement(visit_id="V1", parameter_code="turbidity", value=3.0,
                                   unit_code="fnu")
        assert turb.unit_code == "fnu"

    def test_unknown_parameter_rejected(self):
        with pytest.raises(R.ValidationError):
            R.build_measurement(visit_id="V1", parameter_code="dissolved_oxygen", value=6.0)

    def test_method_and_instrument_trimmed_only_at_edges(self):
        m = R.build_measurement(visit_id="V1", parameter_code="temperature", value=18.2,
                                unit_code="celsius", method_code="  TEMP-IMMERSION-V1  ",
                                instrument_ref="\tPROBE-01\n")
        assert m.method_code == "TEMP-IMMERSION-V1"
        assert m.instrument_ref == "PROBE-01"
        # Missing means None, not "".
        bare = R.build_measurement(visit_id="V1", parameter_code="temperature", value=18.2,
                                   unit_code="celsius", method_code="   ", instrument_ref="")
        assert bare.method_code is None and bare.instrument_ref is None
        # Interior whitespace survives (no internal normalization).
        inner = R.build_measurement(visit_id="V1", parameter_code="temperature", value=18.2,
                                    unit_code="celsius", method_code="TEMP IMMERSION V1")
        assert inner.method_code == "TEMP IMMERSION V1"


class TestSamples:
    def test_requires_nonblank_sample_id(self):
        with pytest.raises(R.ValidationError):
            R.build_sample(visit_id="V1", sample_id="   ", status="unknown")

    def test_status_must_be_user_controlled_set(self):
        with pytest.raises(R.ValidationError):
            R.build_sample(visit_id="V1", sample_id="SB-1", status="analyzed")
        s = R.build_sample(visit_id="V1", sample_id="SB-1", status="collected",
                           collected_at=dt("2026-10-11T09:35:00-05:00"))
        assert s.status == "collected"

    def test_collection_time_requires_timezone(self):
        with pytest.raises(R.ValidationError):
            R.build_sample(visit_id="V1", sample_id="SB-1", status="collected",
                           collected_at=datetime(2026, 10, 11, 9, 35))


class TestIsoHelpers:
    def test_parse_requires_timezone(self):
        assert R.parse_iso_dt("2026-10-11T09:30:00-05:00").utcoffset() is not None
        assert R.parse_iso_dt("2026-10-11T09:30:00Z").tzinfo is not None
        with pytest.raises(R.ValidationError):
            R.parse_iso_dt("2026-10-11T09:30:00")

    def test_round_trip(self):
        value = dt("2026-10-11T09:30:00-05:00").astimezone(timezone.utc)
        assert R.parse_iso_dt(R.format_iso_dt(value)) == value