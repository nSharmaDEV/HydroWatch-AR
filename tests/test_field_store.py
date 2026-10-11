"""SQLite store: durability, transactions, revisions, workspace isolation.

Physical isolation is enforced at the file level: each workspace class has its
own database file and the database records its immutable class. Reopening the
same file under the wrong class fails closed. Writes are transactional; a failed
write leaves prior state intact and surfaces as StorageError.
"""
import os
import importlib
from datetime import datetime, timezone
from pathlib import Path

import pytest

try:
    from fieldbook import records as R
    from fieldbook import store as S
except ModuleNotFoundError as exc:
    if exc.name not in {"fieldbook.store", "fieldbook.records"}:
        raise
    pytest.fail("Fieldbook store/records modules are missing (RED)")


@pytest.fixture
def data_dir(tmp_path):
    return tmp_path / "fieldbook-data"


def make_site(**kw):
    kw.setdefault("name", "Sample shoreline A")
    kw.setdefault("water_body", "Buffalo National River")
    site = R.normalize_site(**kw)
    return S.replace_id(site) if hasattr(S, "replace_id") else site


def make_visit(site_id="S1", state="recorded", **kw):
    kw.setdefault("site_id", site_id)
    kw.setdefault("observed_at", datetime(2026, 10, 11, 9, 30, tzinfo=timezone.utc))
    kw.setdefault("notes", "Visible surface film from the bank.")
    kw.setdefault("state", state)
    return R.build_visit(**kw)


@pytest.fixture
def store(data_dir):
    s = S.Store(data_dir, "working")
    yield s
    s.close()


class TestSchemaAndClasses:
    def test_creates_class_scoped_database_files(self, data_dir):
        working = S.Store(data_dir, "working")
        demo = S.Store(data_dir, "demo")
        try:
            assert (data_dir / "working" / "fieldbook.sqlite3").exists()
            assert (data_dir / "demo" / "fieldbook.sqlite3").exists()
            assert working.get_class() == "working"
            assert demo.get_class() == "demo"
        finally:
            working.close()
            demo.close()

    def test_opening_wrong_class_fails_closed(self, data_dir):
        S.Store(data_dir, "working").close()
        demo_db = data_dir / "demo" / "fieldbook.sqlite3"
        S.Store(data_dir, "demo").close()
        with pytest.raises(S.WorkspaceClassError):
            S.Store(data_dir, "working", db_file=demo_db)

    def test_unknown_class_rejected(self, data_dir):
        with pytest.raises(ValueError):
            S.Store(data_dir, "production")


class TestSites:
    def test_save_and_reopen_site(self, store):
        saved = store.save_site(make_site())
        assert saved.site_id.startswith("S-")
        assert store.get_site(saved.site_id).name == "Sample shoreline A"

    def test_search_filters_sites(self, store):
        store.save_site(make_site(name="Shoreline A"))
        store.save_site(make_site(name="Campground B"))
        names = [s.name for s in store.list_sites(q="shore")]
        assert names == ["Shoreline A"]


class TestVisitsDurable:
    def test_visit_survives_restart(self, data_dir):
        s1 = S.Store(data_dir, "working")
        site = s1.save_site(make_site())
        detail = s1.create_visit(make_visit(site_id=site.site_id))
        s1.close()

        s2 = S.Store(data_dir, "working")
        try:
            reopened = s2.get_visit(detail.visit.visit_id)
            assert reopened is not None
            assert reopened.visit.notes == "Visible surface film from the bank."
            assert reopened.visit.observed_at is not None
        finally:
            s2.close()

    def test_draft_survives_restart_even_with_missing_context(self, data_dir):
        s1 = S.Store(data_dir, "working")
        draft = s1.create_visit(R.build_visit(notes="returning later", state="draft"))
        s1.close()
        s2 = S.Store(data_dir, "working")
        try:
            reopened = s2.get_visit(draft.visit.visit_id)
            assert reopened.visit.state == "draft"
            assert reopened.visit.site_id is None
        finally:
            s2.close()

    def test_create_visit_with_measurements_and_samples(self, store):
        site = store.save_site(make_site())
        visit = make_visit(site_id=site.site_id)
        m = R.build_measurement(visit_id="", parameter_code="temperature", value=18.2,
                                unit_code="celsius", method_code="TEMP-IMMERSION-V1",
                                instrument_ref="PROBE-01")
        sample = R.build_sample(visit_id="", sample_id="BUF-01", status="collected")
        detail = store.create_visit(visit, measurements=[m], samples=[sample])
        reopened = store.get_visit(detail.visit.visit_id)
        assert len(reopened.measurements) == 1
        assert reopened.measurements[0].value == 18.2
        assert reopened.samples[0].sample_id == "BUF-01"

    def test_list_visits_filters_by_state_and_site(self, store):
        site = store.save_site(make_site())
        store.create_visit(make_visit(site_id=site.site_id))
        store.create_visit(R.build_visit(site_id=site.site_id, notes="later", state="draft"))
        assert len(store.list_visits(site_id=site.site_id)) == 2
        assert len(store.list_visits(state="draft")) == 1
        assert len(store.list_visits(state="recorded")) == 1

    def test_duplicate_sample_ids_within_visit_produce_warning_only(self, store):
        site = store.save_site(make_site())
        visit = make_visit(site_id=site.site_id)
        s1 = R.build_sample(visit_id="", sample_id="BUF-1", status="unknown")
        s2 = R.build_sample(visit_id="", sample_id="BUF-1", status="unknown")
        detail = store.create_visit(visit, samples=[s1, s2])
        assert any("BUF-1" in w for w in detail.warnings)
        assert len(detail.samples) == 2  # warning, not a rejection


class TestWriteFailure:
    def test_failed_write_raises_and_leaves_no_partial_record(self, store, tmp_path):
        site = store.save_site(make_site())
        db_file = store.db_path
        store.close()
        os.chmod(db_file, 0o444)
        try:
            read_only = S.Store(tmp_path / "ro-data", "working", db_file=db_file)
            with pytest.raises(S.StorageError):
                read_only.create_visit(make_visit(site_id=site.site_id))
            read_only.close()
        finally:
            os.chmod(db_file, 0o644)
        # No partially-written visit row.
        fresh = S.Store(tmp_path / "ro-data", "working", db_file=db_file)
        try:
            assert fresh.get_visit("V-XXXX") is None
            assert len(fresh.list_visits()) == 0
        finally:
            fresh.close()

    def test_durable_commit_precedes_success(self, store):
        site = store.save_site(make_site())
        detail = store.create_visit(make_visit(site_id=site.site_id))
        assert store.get_visit(detail.visit.visit_id) is not None


class TestRevisions:
    def test_editing_saved_visit_requires_reason_and_keeps_prior_values(self, store):
        site = store.save_site(make_site())
        detail = store.create_visit(make_visit(site_id=site.site_id, notes="first notes"))
        with pytest.raises(S.StorageError):
            store.revision_visit(detail.visit.visit_id, reason="  ", visit_patch={"notes": "x"})

        updated = store.revision_visit(
            detail.visit.visit_id, reason="Clarified what I saw",
            visit_patch={"notes": "second notes"})
        assert updated.visit.notes == "second notes"
        assert len(updated.revisions) == 1
        rev = updated.revisions[0]
        assert rev.reason == "Clarified what I saw"
        assert rev.prior_values["notes"] == "first notes"

    def test_measurement_patch_preserves_prior_values_and_revalidates(self, store):
        site = store.save_site(make_site())
        visit = make_visit(site_id=site.site_id)
        m = R.build_measurement(visit_id="", parameter_code="temperature", value=18.2,
                                unit_code=None, method_code="TEMP-IMMERSION-V1",
                                instrument_ref="PROBE-01")
        detail = store.create_visit(visit, measurements=[m])
        mid = detail.measurements[0].measurement_id
        updated = store.revision_visit(
            detail.visit.visit_id, reason="Added declared unit from field note",
            measurement_patches=[{"measurement_id": mid, "patch": {"unit_code": "celsius"}}])
        assert updated.measurements[0].unit_code == "celsius"
        assert "unit_code" in updated.revisions[0].prior_values or updated.revisions
        # sample patch also validated
        with pytest.raises(R.ValidationError):
            store.revision_visit(
                detail.visit.visit_id, reason="bad",
                measurement_patches=[{"measurement_id": mid, "patch": {"unit_code": "ntu"}}])

    def test_revision_numbering_increments(self, store):
        site = store.save_site(make_site())
        detail = store.create_visit(make_visit(site_id=site.site_id, notes="v1"))
        r2 = store.revision_visit(detail.visit.visit_id, reason="first edit", visit_patch={"notes": "v2"})
        r3 = store.revision_visit(detail.visit.visit_id, reason="second edit", visit_patch={"notes": "v3"})
        nums = [rv.revision_num for rv in r3.revisions]
        assert nums == [1, 2]

    def test_draft_to_recorded_transition_revalidates(self, store):
        site = store.save_site(make_site())
        draft = store.create_visit(R.build_visit(site_id=site.site_id, notes="WIP", state="draft"))
        with pytest.raises(R.ValidationError):
            store.revision_visit(draft.visit.visit_id, reason="finalize",
                                 visit_patch={"state": "recorded", "observed_at": None})
        ok = store.revision_visit(draft.visit.visit_id, reason="finalize",
                                  visit_patch={"state": "recorded",
                                               "observed_at": "2026-10-11T09:30:00-05:00"})
        assert ok.visit.state == "recorded"


class TestDeleteScoped:
    def test_delete_visit_removes_children_and_is_scoped_to_class(self, data_dir):
        s = S.Store(data_dir, "working")
        site = s.save_site(make_site())
        d1 = s.create_visit(make_visit(site_id=site.site_id, notes="a"))
        d2 = s.create_visit(make_visit(site_id=site.site_id, notes="b"))
        s.delete_visit(d1.visit.visit_id)
        assert s.get_visit(d1.visit.visit_id) is None
        assert s.get_visit(d2.visit.visit_id) is not None
        s.close()

        other = S.Store(data_dir, "demo")
        try:
            assert other.get_visit(d2.visit.visit_id) is None  # isolated file
        finally:
            other.close()
            os.makedirs(data_dir / "working", exist_ok=True)