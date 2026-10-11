"""Official advisory context for Watershed Fieldbook, scoped by workspace class.

The working class reads the live ADH and ADEQ feeds through the existing
``bloom_data`` engine and reports the honest per-feed status. The demo class returns
fixed, synthetic, clearly-labelled rows and never performs a network request. A
failed live fetch is always "Data unavailable" — never an all-clear, never a silent
fallback to demo data. ADH water-body/service-area mapping is never inferred.
"""
from __future__ import annotations

from datetime import datetime, timezone

import bloom_data as bd
from notice_source import SOURCE_URL as ADH_URL

from fieldbook import config
from fieldbook.records import format_iso_dt

ADH_AGENCY = "Arkansas Department of Health (ADH)"
ADEQ_AGENCY = "Arkansas Division of Environmental Quality (ADEQ)"
ADH_COVERAGE = ("Statewide drinking-water boil-water notices (systems, not lakes). "
                "A lake or river has no ADH water-body mapping in this prototype.")
ADEQ_COVERAGE = ("Statewide harmful-algal-bloom advisories for affected water "
                 "bodies. Advisory areas are the agency's own descriptions.")
_DEMO_SOURCE_URL = "synthetic-demo://not-a-real-source"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _row(*, agency, status, checked_at, error, coverage, url, sample) -> dict:
    return {
        "agency": agency,
        "status": status,
        "checked_at": format_iso_dt(checked_at) if checked_at is not None else None,
        "error": error,
        "coverage": coverage,
        "url": url,
        "sample": sample,
    }


class WorkingContext:
    """Live agency context via the unchanged bloom_data engine."""

    def __init__(self, source: "bd.BloomSource | None" = None):
        self._source = source if source is not None else bd.BloomSource()

    def get(self, *, now: datetime | None = None) -> list[dict]:
        now = now or _now()
        adh, adeq = self._source.get()
        return [
            _row(agency=ADH_AGENCY, status=bd.source_status(adh, now),
                 checked_at=adh.snapshot.checked_at if adh.snapshot else None,
                 error=adh.error, coverage=ADH_COVERAGE, url=ADH_URL, sample=False),
            _row(agency=ADEQ_AGENCY, status=bd.source_status(adeq, now),
                 checked_at=adeq.snapshot.checked_at if adeq.snapshot else None,
                 error=adeq.error, coverage=ADEQ_COVERAGE, url=bd.ADEQ_URL,
                 sample=False),
        ]


class DemoContext:
    """Fixed synthetic context. Never fetches; every row is labelled SAMPLE."""

    def get(self, *, now: datetime | None = None) -> list[dict]:
        now = now or _now()
        return [
            _row(agency=ADH_AGENCY,
                 status="SAMPLE — synthetic advisory status (not agency data)",
                 checked_at=now, error=None,
                 coverage="Synthetic demonstration of an ADH boil-water feed row.",
                 url=_DEMO_SOURCE_URL, sample=True),
            _row(agency=ADEQ_AGENCY,
                 status="SAMPLE — synthetic advisory status (not agency data)",
                 checked_at=now, error=None,
                 coverage="Synthetic demonstration of an ADEQ HAB advisory row.",
                 url=_DEMO_SOURCE_URL, sample=True),
        ]


class ContextSource:
    """Route official context by the active workspace class."""

    def __init__(self, active_class: str, *, working=None, demo=None):
        config._require_class(active_class)
        self.active_class = active_class
        self._working = working if working is not None else WorkingContext()
        self._demo = demo if demo is not None else DemoContext()

    def get(self, *, now: datetime | None = None) -> list[dict]:
        impl = self._demo if self.active_class == "demo" else self._working
        return impl.get(now=now)
