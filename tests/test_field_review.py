"""Completeness checks and conservative exact same-site comparison.

Comparison is deliberately narrow: readings compare only when workspace class,
site, parameter, unit, method AND instrument all match exactly (case-sensitive,
edges trimmed). Anything else is excluded with a visible reason — never merged,
never converted (no NTU↔FNU), never guessed.
"""
from datetime import datetime, timezone
from pathlib import Path

import pytest

try:
    from fieldbook import records as R
    from fieldbook import review as RV
    from fieldbook import store as S
except ModuleNotFoundError as exc:
    if exc.name not in {"fieldbook.review", "fieldbook.store", "fieldbook.records"}:
        raise
    pytest.fail("Fieldbook review module is missing (RED)")


TZ = timezone.utc


def dt(hour: int = 9) -> datetime:
    return datetime(2026, 10, 11, hour, 0, tzinfo=TZ)


@pytest.fixture
def store(tmp_path):
    s = S.Store(tmp_path / "data", "working")
    yield s
    s.close()


def seed_site(store: S.Store, name="Shoreline A") -> str:
    site = store.save_site(R.normalize_site(name, "Buffalo National River"))
    return site.site_id


def seed_visit(store: S.Store, site_id: str, hour: int, notes="field notes",
               state="recorded", reviewed=False) -> str:
    visit = R.build_visit(site_id=site_id, observed_at=dt(hour), notes=notes, state=state)
    detail = store.create_visit(visit)
    if reviewed:
        store.revision_visit(detail.visit.visit_id, reason="Reviewed in field",
                             visit_patch={"reviewed_at": dt(hour + 1)})
    return detail.visit.visit_id


def seed_visit_with_measurement(store: S.Store, site_id: str, hour: int,
                                *, value=18.2, unit_code="celsius",
                                method_code="TEMP-IMMERSION-V1", instrument_ref="PROBE-01",
                                parameter_code="temperature", reviewed=False,
                                observed_at=None) -> str:
    visit = R.build_visit(site_id=site_id, observed_at=observed_at or dt(hour),
                          notes="field notes", state="recorded")
    m = R.build_measurement(visit_id="", parameter_code=parameter_code, value=value,
                            unit_code=unit_code, method_code=method_code,
                            instrument_ref=instrument_ref)
    detail = store.create_visit(visit, measurements=[m])
    if reviewed:
        store.revision_visit(detail.visit.visit_id, reason="Reviewed in field",
                             visit_patch={"reviewed_at": dt(hour + 1)})
    return detail.visit.visit_id


class TestVisitIssues:
    def test_flags_missing_measurement_context(self, store):
        site = seed_site(store)
        visit = R.build_visit(site_id=site, observed_at=dt(9), notes="notes")
        m = R.build_measurement(visit_id="", parameter_code="temperature", value=18.2,
                                unit_code=None, method_code="TEMP-IMMERSION-V1",
                                instrument_ref="PROBE-01")
        detail = store.create_visit(visit, measurements=[m])
        issues = RV.visit_issues(detail)
        assert any(i.issue_type == "missing_context" and "unit" in i.label.lower()
                   for i in issues)

    def test_not_measured_is_a_disclosed_missing_context(self, store):
        site = seed_site(store)
        visit = R.build_visit(site_id=site, observed_at=dt(9), notes="notes")
        m = R.build_measurement(visit_id="", parameter_code="turbidity", value=None)
        detail = store.create_visit(visit, measurements=[m])
        issues = RV.visit_issues(detail)
        assert any("not measured" in i.detail.lower() for i in issues)

    def test_unreviewed_recorded_visit_flagged(self, store):
        site = seed_site(store)
        detail = store.get_visit(seed_visit_with_measurement(store, site, 9, reviewed=False))
        issues = RV.visit_issues(detail)
        assert any(i.issue_type == "unreviewed_data" for i in issues)

    def test_reviewed_visit_not_flagged_unreviewed(self, store):
        site = seed_site(store)
        detail = store.get_visit(seed_visit_with_measurement(store, site, 9, reviewed=True))
        issues = RV.visit_issues(detail)
        assert not any(i.issue_type == "unreviewed_data" for i in issues)

    def test_empty_visit_flags_no_measurements_recorded(self, store):
        site = seed_site(store)
        detail = store.get_visit(seed_visit(store, site, 9, reviewed=True))
        issues = RV.visit_issues(detail)
        assert any("no measurements" in i.detail.lower() for i in issues)


class TestComparisonGrouping:
    def test_exact_key_groups_same_site_readings(self, store):
        site = seed_site(store)
        seed_visit_with_measurement(store, site, 9, value=18.2)
        seed_visit_with_measurement(store, site, 10, value=18.9)
        comparison = RV.comparison_for_site(store, site)
        assert len(comparison.groups) == 1
        group = comparison.groups[0]
        assert len(group.readings) == 2
        assert comparison.excluded == ()

    def test_missing_method_excluded_with_reason(self, store):
        site = seed_site(store)
        seed_visit_with_measurement(store, site, 9, method_code=None)
        seed_visit_with_measurement(store, site, 10, value=18.9)
        comparison = RV.comparison_for_site(store, site)
        assert len(comparison.groups) == 1
        assert len(comparison.groups[0].readings) == 1
        assert len(comparison.excluded) == 1
        reason = comparison.excluded[0].exclusion_reason or ""
        assert "method" in reason

    def test_missing_instrument_excluded_with_reason(self, store):
        site = seed_site(store)
        seed_visit_with_measurement(store, site, 9, instrument_ref=None)
        comparison = RV.comparison_for_site(store, site)
        assert len(comparison.excluded) == 1
        assert "instrument" in (comparison.excluded[0].exclusion_reason or "")

    def test_no_implicit_ntu_fnu_conversion(self, store):
        site = seed_site(store)
        seed_visit_with_measurement(store, site, 9, parameter_code="turbidity",
                                    value=3.0, unit_code="ntu")
        seed_visit_with_measurement(store, site, 10, parameter_code="turbidity",
                                    value=3.0, unit_code="fnu")
        comparison = RV.comparison_for_site(store, site)
        assert len(comparison.groups) == 2  # never merged across units

    def test_case_sensitive_matching_after_trim(self, store):
        site = seed_site(store)
        seed_visit_with_measurement(store, site, 9, instrument_ref="PROBE-01")
        seed_visit_with_measurement(store, site, 10, value=18.9, instrument_ref="probe-01")
        comparison = RV.comparison_for_site(store, site)
        assert len(comparison.groups) == 2  # case difference splits the group

    def test_edges_trimmed_but_inner_text_respected(self, store):
        site = seed_site(store)
        seed_visit_with_measurement(store, site, 9, instrument_ref="  PROBE-01  ")
        seed_visit_with_measurement(store, site, 10, value=18.9, instrument_ref="PROBE-01")
        comparison = RV.comparison_for_site(store, site)
        assert len(comparison.groups) == 1  # outer whitespace is not significant
        site2 = seed_site(store, "Other bank B")
        seed_visit_with_measurement(store, site2, 11, value=18.7)
        other = RV.comparison_for_site(store, site2)
        assert len(other.groups) == 1  # same method/instrument but different site

    def test_not_measured_value_excluded_as_not_measured(self, store):
        site = seed_site(store)
        visit = R.build_visit(site_id=site, observed_at=dt(9), notes="notes")
        m = R.build_measurement(visit_id="", parameter_code="temperature", value=None,
                                unit_code="celsius", method_code="TEMP-IMMERSION-V1",
                                instrument_ref="PROBE-01")
        detail = store.create_visit(visit, measurements=[m])
        comparison = RV.comparison_for_site(store, site)
        assert len(comparison.excluded) == 1
        assert "not measured" in (comparison.excluded[0].exclusion_reason or "")

    def test_unknown_observation_time_excluded(self, store):
        # A normal save cannot create a recorded visit without a time, but the
        # comparison guard must still defensively exclude such rows (e.g. future
        # imports must not fabricate a comparison time).
        site_id = "S-X"
        reasons = RV._exclusion_reasons(
            R.build_measurement(visit_id="", parameter_code="temperature", value=18.2,
                                unit_code="celsius", method_code="TEMP-IMMERSION-V1",
                                instrument_ref="PROBE-01"),
            observed_at=None)
        assert "unknown observation time" in reasons

    def test_draft_visits_are_not_compared(self, store):
        site = seed_site(store)
        visit = R.build_visit(site_id=site, observed_at=dt(9), notes="WIP", state="draft")
        m = R.build_measurement(visit_id="", parameter_code="temperature", value=18.2,
                                unit_code="celsius", method_code="TEMP-IMMERSION-V1",
                                instrument_ref="PROBE-01")
        store.create_visit(visit, measurements=[m])
        comparison = RV.comparison_for_site(store, site)
        assert comparison.groups == ()  # drafts never enter comparisons


class TestVerdicts:
    def test_verdict_phrasing_stays_bounded(self, store):
        site = seed_site(store)
        seed_visit_with_measurement(store, site, 9)
        verdicts = RV.verdicts(store, site)
        allowed = {"records site visits", "flags missing measurement context",
                   "compares compatible entered readings"}
        for verdict in verdicts:
            assert verdict in allowed

    def test_no_group_single_reading_does_not_claim_comparison(self, store):
        site = seed_site(store)
        seed_visit_with_measurement(store, site, 9, instrument_ref=None)  # excluded
        verdicts = RV.verdicts(store, site)
        assert "compares compatible entered readings" not in verdicts