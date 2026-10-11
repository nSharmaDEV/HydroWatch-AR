"""FastAPI service tests: full journeys, failure states, and class isolation.

Non-claims: the API returns user-entered records and honest source status only. A
failed write is 409 and never a fake success; demo and working classes never see
each other's rows.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import fieldbook.store as store_mod
from fieldbook import api
from fieldbook.store import StorageError

NOW = datetime(2026, 10, 11, 9, 30, tzinfo=timezone.utc)
ISO = "2026-10-11T09:30:00-05:00"


@pytest.fixture
def data_dir(tmp_path):
    return tmp_path / "fieldbook-data"


@pytest.fixture
def client(data_dir):
    return TestClient(api.create_app(data_dir))


def _make_site(client, name="Ponca access", water_body="Buffalo National River"):
    r = client.post("/api/sites", json={"name": name, "water_body": water_body})
    assert r.status_code == 201, r.text
    return r.json()


def _record_visit(client, site_id, **over):
    payload = {
        "site_id": site_id,
        "observed_at": ISO,
        "notes": "Clear water at the access.",
        "state": "recorded",
    }
    payload.update(over)
    r = client.post("/api/visits", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# ----------------------------------------------------------------- health/meta

def test_health_and_meta(client, data_dir):
    h = client.get("/api/health")
    assert h.status_code == 200 and h.json()["status"] == "ok"
    m = client.get("/api/meta").json()
    assert m["workspace_class"] == "working"
    assert set(m["workspace_classes"]) == {"working", "demo"}
    assert m["data_dir"] == str(data_dir.resolve())


def test_unknown_workspace_class_rejected(client):
    r = client.post("/api/workspace", json={"class": "production"})
    assert r.status_code == 400


# -------------------------------------------------------------- observation-only

def test_observation_only_journey_survives_restart(client, data_dir):
    site = _make_site(client)
    detail = _record_visit(client, site["site_id"])
    vid = detail["visit"]["visit_id"]

    # restart: a brand-new app instance over the same data dir
    fresh = TestClient(api.create_app(data_dir))
    got = fresh.get(f"/api/visits/{vid}")
    assert got.status_code == 200
    assert got.json()["visit"]["notes"] == "Clear water at the access."
    assert got.json()["measurements"] == []

    review = fresh.get(f"/api/visits/{vid}/review").json()
    assert any(i["issue_type"] == "missing_context" for i in review["issues"])


def test_recorded_visit_requires_notes_and_time(client):
    site = _make_site(client)
    r = client.post("/api/visits", json={
        "site_id": site["site_id"], "observed_at": ISO, "notes": "   ",
        "state": "recorded"})
    assert r.status_code == 400
    assert "notes" in r.json()["fields"]

    missing_time = client.post("/api/visits", json={
        "site_id": site["site_id"], "notes": "saw the river", "state": "recorded"})
    assert missing_time.status_code == 400
    assert "observed_at" in missing_time.json()["fields"]


# ----------------------------------------------------------------- measurements

def test_measurement_journey_and_comparison(client):
    site = _make_site(client)
    for value in (18.4, 18.6):
        payload = {
            "site_id": site["site_id"], "observed_at": ISO,
            "notes": "measurement round", "state": "recorded",
            "measurements": [{
                "parameter_code": "temperature", "value": value, "unit_code": "celsius",
                "method_code": "probe", "instrument_ref": "YSI ProDSS",
            }],
        }
        assert client.post("/api/visits", json=payload).status_code == 201
    comp = client.get(f"/api/sites/{site['site_id']}/compare").json()
    assert comp["groups"] and len(comp["groups"][0]["readings"]) == 2
    assert "compares compatible entered readings" in comp["verdicts"]


def test_missing_value_saved_as_gap_and_excluded(client):
    site = _make_site(client)
    detail = _record_visit(client, site["site_id"], measurements=[{
        "parameter_code": "turbidity", "value": None, "unit_code": "ntu",
        "method_code": "probe", "instrument_ref": "Hach 2100Q"}])
    comp = client.get(f"/api/sites/{site['site_id']}/compare").json()
    assert comp["groups"] == []
    assert comp["excluded"] and "not measured" in comp["excluded"][0]["exclusion_reason"]


# ---------------------------------------------------------------------- drafts

def test_draft_then_revision_to_recorded(client):
    site = _make_site(client)
    r = client.post("/api/visits", json={
        "site_id": site["site_id"], "notes": "started at the bank", "state": "draft"})
    assert r.status_code == 201
    vid = r.json()["visit"]["visit_id"]

    # revision requires a reason
    bad = client.put(f"/api/visits/{vid}", json={
        "visit_patch": {"state": "recorded", "observed_at": ISO}, "reason": " "})
    assert bad.status_code == 409

    ok = client.put(f"/api/visits/{vid}", json={
        "reason": "recorded the visit",
        "visit_patch": {"state": "recorded", "observed_at": ISO}})
    assert ok.status_code == 200
    assert ok.json()["visit"]["state"] == "recorded"
    assert ok.json()["revisions"], "prior values must be preserved"


def test_revision_invalid_patch_rejected(client):
    site = _make_site(client)
    detail = _record_visit(client, site["site_id"], measurements=[{
        "parameter_code": "ph", "value": 7.2, "unit_code": "ph",
        "method_code": "probe", "instrument_ref": "YSI ProDSS"}])
    m = detail["measurements"][0]["measurement_id"]
    r = client.put(f"/api/visits/{detail['visit']['visit_id']}", json={
        "reason": "wrong unit", "measurement_patches": [
            {"measurement_id": m, "patch": {"unit_code": "ntu"}}]})
    assert r.status_code == 400


# ------------------------------------------------------------------ write fails

def test_failed_write_is_409_and_nothing_persists(client, data_dir, monkeypatch):
    def _failing_commit(self):
        self._conn.rollback()
        raise StorageError("simulated disk failure")

    monkeypatch.setattr(store_mod.Store, "_commit", _failing_commit)
    r = client.post("/api/sites", json={"name": "Doomed", "water_body": "Beaver Lake"})
    assert r.status_code == 409
    assert "name" not in r.json()  # no fake success payload

    monkeypatch.undo()
    fresh = TestClient(api.create_app(data_dir))
    assert fresh.get("/api/sites").json() == []


# ---------------------------------------------------------------------- delete

def test_delete_requires_confirmation(client):
    site = _make_site(client)
    vid = _record_visit(client, site["site_id"])["visit"]["visit_id"]
    assert client.request("DELETE", f"/api/visits/{vid}", json={}).status_code == 400
    assert client.request("DELETE", f"/api/visits/{vid}",
                          json={"confirm": True}).status_code == 200
    assert client.get(f"/api/visits/{vid}").status_code == 404


# ----------------------------------------------------------------- isolation

def test_working_and_demo_are_isolated(client, data_dir):
    site = _make_site(client)
    _record_visit(client, site["site_id"])

    # switch class in the same app
    assert client.post("/api/workspace", json={"class": "demo"}).status_code == 200
    assert client.get("/api/sites").json() == []

    # a fresh demo app over the same dir still sees nothing from working
    demo = TestClient(api.create_app(data_dir, workspace_class="demo"))
    assert demo.get("/api/sites").json() == []


def test_demo_export_filename_is_marked(client, data_dir):
    demo = TestClient(api.create_app(data_dir, workspace_class="demo"))
    site = _make_site(demo)
    vid = _record_visit(demo, site["site_id"])["visit"]["visit_id"]
    r = demo.get(f"/api/visits/{vid}/export/visits.csv")
    assert r.status_code == 200
    assert "demo-" in r.headers["content-disposition"]
    assert "attachment" in r.headers["content-disposition"]


# -------------------------------------------------------------------- exports

def test_export_csv_neutralizes_formula_and_keeps_negatives(client):
    site = _make_site(client)
    detail = _record_visit(client, site["site_id"], notes="=cmd|'/c calc'!A1",
                           measurements=[{
                               "parameter_code": "temperature", "value": -18.2,
                               "unit_code": "celsius", "method_code": "probe",
                               "instrument_ref": "YSI ProDSS"}])
    vid = detail["visit"]["visit_id"]
    visits = client.get(f"/api/visits/{vid}/export/visits.csv")
    assert visits.status_code == 200
    assert "'=cmd" in visits.text
    meas = client.get(f"/api/visits/{vid}/export/measurements.csv").text
    assert "-18.2" in meas
    assert "'-18.2" not in meas


def test_summary_html_escapes_and_marks_demo(client, data_dir):
    site = _make_site(client)
    vid = _record_visit(client, site["site_id"], notes="<script>x</script>")["visit"]["visit_id"]
    work = client.get(f"/api/visits/{vid}/summary.html")
    assert work.status_code == 200
    assert "<script>" not in work.text and "&lt;script&gt;" in work.text

    demo = TestClient(api.create_app(data_dir, workspace_class="demo"))
    ds = _make_site(demo)
    dvid = _record_visit(demo, ds["site_id"])["visit"]["visit_id"]
    assert "SAMPLE" in demo.get(f"/api/visits/{dvid}/summary.html").text


def test_export_unknown_table_is_404(client):
    site = _make_site(client)
    vid = _record_visit(client, site["site_id"])["visit"]["visit_id"]
    assert client.get(f"/api/visits/{vid}/export/secrets.csv").status_code == 404


# ------------------------------------------------------------------ context

def test_official_context_demo_is_synthetic(client):
    client.post("/api/workspace", json={"class": "demo"})
    rows = client.get("/api/official-context").json()
    assert rows and all(r["sample"] is True for r in rows)


def test_storage_reports_path_and_counts(client, data_dir):
    _make_site(client)
    body = client.get("/api/storage").json()
    assert body["workspace_class"] == "working"
    assert body["data_dir"] == str(data_dir.resolve())
    assert body["counts"]["sites"] >= 1
