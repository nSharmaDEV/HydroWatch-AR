"""Official-context tests: working live shapes vs isolated synthetic demo rows.

Non-claims: source status describes the agency feed, not any particular site's
safety. A failed fetch is always "Data unavailable" — never an all-clear and never
a fallback to demo data.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import httpx
import pytest

import bloom_data as bd
from notice_source import NoticeSource
from fieldbook import sources

FIXTURES = Path(__file__).parent / "fixtures"
NOW = datetime(2026, 10, 11, 5, tzinfo=timezone.utc)


def _html(name):
    return (FIXTURES / name).read_text()


def _snapshot(active=(), url="https://example.gov/x"):
    return bd.BloomSnapshot(notices=tuple(active), active_notices=tuple(active),
                            checked_at=NOW, source_url=url)


def _active_result():
    return bd.BloomResult(_snapshot(active=("synthetic",)), None, NOW, NOW)


def _empty_result():
    return bd.BloomResult(_snapshot(active=()), None, NOW, NOW)


def _failed_result(msg="Unable to check current advisories."):
    return bd.BloomResult(None, msg, NOW, NOW)


class _FakeBloomSource:
    def __init__(self, adh, adeq):
        self._adh, self._adeq = adh, adeq
        self.calls = 0

    def get(self, *, force=False):
        self.calls += 1
        return (self._adh, self._adeq)


def test_working_context_maps_feed_statuses():
    ctx = sources.WorkingContext(_FakeBloomSource(_active_result(), _empty_result()))
    rows = ctx.get(now=NOW)
    agencies = [r["agency"] for r in rows]
    assert any("Health" in a for a in agencies)
    assert any("Environmental" in a for a in agencies)
    adh = next(r for r in rows if "Health" in r["agency"])
    adeq = next(r for r in rows if "Environmental" in r["agency"])
    assert adh["status"] == "Active advisory"
    assert adeq["status"] == "No active advisory found"
    assert all(r["sample"] is False for r in rows)
    assert all(r["checked_at"] for r in rows)


def test_working_context_failed_source_is_data_unavailable_never_all_clear():
    ctx = sources.WorkingContext(_FakeBloomSource(_failed_result(), _failed_result()))
    rows = ctx.get(now=NOW)
    assert all(r["status"] == "Data unavailable" for r in rows)
    assert all(r["status"] != "No active advisory found" for r in rows)
    assert all(r["error"] for r in rows)


def test_working_context_uses_real_parsers_on_fixtures():
    bloom = bd.BloomSource(
        adh_source=NoticeSource(lambda: _html("adh_notices_sample.html"), lambda: NOW),
        adeq_source=bd.AdeqSource(fetch_html=lambda: _html("adeq_hab_sample.html"),
                                  clock=lambda: NOW),
    )
    rows = sources.WorkingContext(bloom).get(now=NOW)
    assert len(rows) == 2
    assert all(r["status"] in ("Active advisory", "No active advisory found")
               for r in rows)


def test_demo_context_is_synthetic_and_offline(monkeypatch):
    def _boom(*a, **k):
        raise AssertionError("demo context must not touch the network")

    monkeypatch.setattr(httpx, "Client", _boom)
    rows = sources.DemoContext().get(now=NOW)
    assert rows
    assert all(r["sample"] is True for r in rows)
    assert all(r["status"].startswith("SAMPLE") for r in rows)


def test_context_source_routes_by_class():
    demo = sources.DemoContext()
    working = sources.WorkingContext(_FakeBloomSource(_active_result(), _empty_result()))

    class _Never:
        def get(self, *, now=None, force=False):
            raise AssertionError("working context must not run for the demo class")

    demo_ctx = sources.ContextSource("demo", working=_Never(), demo=demo)
    rows = demo_ctx.get(now=NOW)
    assert all(r["sample"] is True for r in rows)

    work_ctx = sources.ContextSource("working", working=working, demo=demo)
    rows = work_ctx.get(now=NOW)
    assert all(r["sample"] is False for r in rows)
