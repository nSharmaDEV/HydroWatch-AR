"""Completeness checks and conservative same-site comparison.

Non-claims: compatibility is not validity. A group of matched readings only shows
entered values side by side; it never asserts scientific quality, agency status or
safety. Excluded readings stay visible with their reason in records and exports.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from fieldbook.records import Measurement, Visit

ISSUE_TYPES = ("missing_context", "invalid_entry", "method_mismatch",
               "unreviewed_data", "source_unavailable", "source_stale")


@dataclass(frozen=True)
class Issue:
    issue_type: str
    label: str
    detail: str
    location: str


@dataclass(frozen=True)
class ReadingRow:
    measurement: Measurement
    visit_id: str
    observed_at: datetime | None
    excluded: bool = False
    exclusion_reason: str | None = None


@dataclass(frozen=True)
class GroupKey:
    site_id: str
    parameter_code: str
    unit_code: str
    method_code: str
    instrument_ref: str


@dataclass(frozen=True)
class ComparisonGroup:
    key: GroupKey
    readings: tuple[tuple[ReadingRow, str], ...]  # (reading, visit_id)


@dataclass(frozen=True)
class SiteComparison:
    site_id: str
    workspace_class: str
    groups: tuple[ComparisonGroup, ...]
    excluded: tuple[ReadingRow, ...] = ()


# ------------------------------------------------------------------ visit issues

def visit_issues(detail) -> list[Issue]:
    """Explainable missing-context and review-state checks for one visit."""
    issues: list[Issue] = []
    visit = detail.visit
    if not detail.measurements:
        issues.append(Issue(
            issue_type="missing_context",
            label="No measurements",
            detail="This visit records no measurements — that is fine to save, "
                   "but there is nothing to compare yet.",
            location=f"visit {visit.visit_id}"))
    for m in detail.measurements:
        where = f"measurement {m.measurement_id}"
        if m.value is None:
            issues.append(Issue(
                issue_type="missing_context", label="Not measured",
                detail=f"{m.parameter_code} was not measured — recorded as a "
                       "disclosed gap, never as zero.",
                location=where))
        if m.unit_code is None:
            issues.append(Issue(
                issue_type="missing_context", label="Unit not declared",
                detail=f"{m.parameter_code} reading has no declared unit; it "
                       "cannot be compared without one.",
                location=where))
        if m.method_code is None:
            issues.append(Issue(
                issue_type="missing_context", label="Method not declared",
                detail="This reading cannot be compared until a method is "
                       "entered.",
                location=where))
        if m.instrument_ref is None:
            issues.append(Issue(
                issue_type="missing_context", label="Instrument not declared",
                detail="This reading cannot be compared until a specific "
                       "instrument is entered.",
                location=where))
    if visit.state == "recorded" and visit.reviewed_at is None:
        issues.append(Issue(
            issue_type="unreviewed_data", label="Not reviewed",
            detail="This recorded visit has not been reviewed for corrections.",
            location=f"visit {visit.visit_id}"))
    return issues


# ------------------------------------------------------------ exact comparison

def _exclusion_reasons(m: Measurement, observed_at: datetime | None) -> list[str]:
    reasons = []
    if m.value is None:
        reasons.append("not measured (no finite value)")
    if m.unit_code is None:
        reasons.append("no unit declared")
    if m.method_code is None:
        reasons.append("no method declared")
    if m.instrument_ref is None:
        reasons.append("no instrument declared")
    if observed_at is None:
        reasons.append("unknown observation time")
    return reasons


def comparison_for_site(store, site_id: str) -> SiteComparison:
    """Exact, conservative grouping of recorded readings at one site.

    Group key = (site_id, parameter_code, unit_code, method_code, instrument_ref),
    edge-trimmed and case-sensitive. No aliases, no model equivalence, no unit
    conversion. Draft visits are never compared. Excluded readings are retained
    with their reason.
    """
    site = store.get_site(site_id)
    if site is None:
        return SiteComparison(site_id=site_id, workspace_class=store.get_class(),
                              groups=(), excluded=())
    excluded: list[ReadingRow] = []
    grouped: dict[GroupKey, list[tuple[ReadingRow, str]]] = {}
    for item in store.list_visits(site_id=site_id):
        visit = item.visit
        if visit.state != "recorded":
            continue  # drafts never enter comparisons
        detail = store.get_visit(visit.visit_id)
        for m in detail.measurements:
            reasons = _exclusion_reasons(m, visit.observed_at)
            row = ReadingRow(measurement=m, visit_id=visit.visit_id,
                             observed_at=visit.observed_at,
                             excluded=bool(reasons),
                             exclusion_reason="; ".join(reasons) if reasons else None)
            if reasons:
                excluded.append(row)
                continue
            key = GroupKey(
                site_id=site_id, parameter_code=m.parameter_code, unit_code=m.unit_code,
                method_code=m.method_code, instrument_ref=m.instrument_ref)
            grouped.setdefault(key, []).append((row, visit.visit_id))
    groups = tuple(
        ComparisonGroup(key=key, readings=tuple(rows))
        for key, rows in sorted(grouped.items(),
                                key=lambda kv: (kv[0].parameter_code,
                                                kv[0].unit_code,
                                                kv[0].method_code,
                                                kv[0].instrument_ref)))
    return SiteComparison(site_id=site_id, workspace_class=store.get_class(),
                          groups=groups, excluded=tuple(excluded))


# --------------------------------------------------------------------- verdicts

def verdicts(store, site_id: str) -> list[str]:
    """Short, bounded labels of what this prototype does (never more)."""
    out = []
    recorded = [i for i in store.list_visits(site_id=site_id) if i.visit.state == "recorded"]
    if recorded:
        out.append("records site visits")
    comparison = comparison_for_site(store, site_id)
    has_issues = False
    for item in recorded:
        detail = store.get_visit(item.visit.visit_id)
        if visit_issues(detail):
            has_issues = True
            break
    if comparison.excluded or has_issues:
        out.append("flags missing measurement context")
    if any(len(g.readings) >= 2 for g in comparison.groups):
        out.append("compares compatible entered readings")
    return out