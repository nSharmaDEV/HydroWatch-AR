"""Safe exports for Watershed Fieldbook: CSV tables and an HTML summary.

Non-claims: an export is a faithful copy of user-entered, unvalidated records. It
never turns a missing value into zero, never implies agency review, scientific
validity or safety, and never introduces scripts or remote resources.
"""
from __future__ import annotations

import csv
import html
import io
from datetime import datetime

from fieldbook import review
from fieldbook.records import format_iso_dt

CSV_HEADERS: dict[str, tuple[str, ...]] = {
    "sites": ("site_id", "name", "water_body", "lat", "lon", "coord_provenance",
              "origin", "created_at", "updated_at"),
    "visits": ("visit_id", "site_id", "observed_at", "notes", "state",
               "observer_code", "follow_up_flag", "follow_up_note", "reviewed_at",
               "created_at", "updated_at"),
    "measurements": ("measurement_id", "visit_id", "parameter_code", "value",
                     "unit_code", "method_code", "instrument_ref", "note", "created_at"),
    "samples": ("sample_ref_id", "visit_id", "sample_id", "collected_at", "status",
                "created_at"),
}

_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value: object) -> str:
    """Render one CSV cell, neutralizing spreadsheet formula injection.

    Finite numbers (including negatives) pass through as numbers. Text that starts
    with a formula trigger is prefixed with an apostrophe so a spreadsheet treats it
    as text. Missing values become an empty cell — never a fabricated zero.
    """
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    if text.startswith(_FORMULA_PREFIXES):
        return "'" + text
    return text


def _dt(value: datetime | None) -> str:
    return format_iso_dt(value) if value is not None else ""


def _write_csv(header: tuple[str, ...], rows: list[tuple]) -> str:
    buf = io.StringIO(newline="")
    writer = csv.writer(buf, lineterminator="\n")
    writer.writerow(list(header))
    for row in rows:
        writer.writerow([safe_cell(cell) for cell in row])
    return buf.getvalue()


def csv_tables(detail, workspace_class: str) -> dict[str, str]:
    """Four single-visit CSV tables as strings, each with a header row."""
    visit = detail.visit
    site = detail.site
    site_rows = []
    if site is not None:
        site_rows.append((site.site_id, site.name, site.water_body, site.lat, site.lon,
                          site.coord_provenance, site.origin, _dt(site.created_at),
                          _dt(site.updated_at)))
    visit_rows = [(visit.visit_id, visit.site_id, _dt(visit.observed_at), visit.notes,
                   visit.state, visit.observer_code, visit.follow_up_flag,
                   visit.follow_up_note, _dt(visit.reviewed_at), _dt(visit.created_at),
                   _dt(visit.updated_at))]
    measurement_rows = [(m.measurement_id, m.visit_id, m.parameter_code, m.value,
                         m.unit_code, m.method_code, m.instrument_ref, m.note,
                         _dt(m.created_at)) for m in detail.measurements]
    sample_rows = [(s.sample_ref_id, s.visit_id, s.sample_id, _dt(s.collected_at),
                    s.status, _dt(s.created_at)) for s in detail.samples]
    return {
        "sites": _write_csv(CSV_HEADERS["sites"], site_rows),
        "visits": _write_csv(CSV_HEADERS["visits"], visit_rows),
        "measurements": _write_csv(CSV_HEADERS["measurements"], measurement_rows),
        "samples": _write_csv(CSV_HEADERS["samples"], sample_rows),
    }


def csv_filename(table: str, visit_id: str, workspace_class: str) -> str:
    """Download filename; demo exports are visibly prefixed."""
    prefix = "demo-" if workspace_class == "demo" else ""
    return f"{prefix}{visit_id}-{table}.csv"


# ------------------------------------------------------------------------ HTML

_CSS = """
body{font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;margin:0;padding:24px;background:#f3f5f7}
main{max-width:820px;margin:0 auto;background:#fff;border:1px solid #c9d1d9;border-radius:8px;padding:24px}
h1{color:#16324f;font-size:22px;margin:0 0 4px}
h2{color:#16324f;font-size:16px;margin:24px 0 8px}
table{border-collapse:collapse;width:100%;margin:8px 0}
th,td{border:1px solid #c9d1d9;padding:6px 8px;font-size:13px;text-align:left;vertical-align:top}
th{background:#f3f5f7;color:#16324f}
.meta{color:#4b5563;font-size:13px}
.sample{background:#fff4da;border:1px solid #d9a300;color:#5a4300;padding:8px 12px;border-radius:6px;font-weight:bold}
.issue{border-left:4px solid #d9a300;padding:4px 10px;margin:6px 0;background:#fffdf5}
footer{margin-top:24px;color:#4b5563;font-size:12px;border-top:1px solid #c9d1d9;padding-top:12px}
""".strip()


def _esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def _num(value: float | None) -> str:
    return "" if value is None else _esc(value)


def _cell_or_gap(value: object | None) -> str:
    return _esc(value) if value not in (None, "") else '<span class="meta">—</span>'


def summary_html(detail, workspace_class: str, source_context=None) -> str:
    """Escaped, self-contained HTML summary of one visit (no scripts or remote URLs)."""
    visit = detail.visit
    site = detail.site
    issues = review.visit_issues(detail)

    parts: list[str] = []
    parts.append("<!DOCTYPE html>")
    parts.append('<html lang="en"><head><meta charset="utf-8">')
    parts.append("<title>Watershed Fieldbook visit summary</title>")
    parts.append(f"<style>{_CSS}</style></head><body><main>")
    parts.append("<h1>Watershed Fieldbook — visit summary</h1>")
    parts.append('<p class="meta">Independent student project — not a government '
                 "website, not agency-approved. All values below are user-entered "
                 "and unvalidated.</p>")
    if workspace_class == "demo":
        parts.append('<p class="sample">SAMPLE — synthetic demonstration data. '
                     "Not a real record and not agency data.</p>")

    parts.append("<h2>Site</h2>")
    if site is not None:
        parts.append("<table><tr><th>Site</th><th>Water body</th><th>Coordinates</th>"
                     "<th>Coordinate source</th></tr>")
        if site.lat is not None:
            coords = f"{_num(site.lat)}, {_num(site.lon)}"
        else:
            coords = '<span class="meta">Coordinates not recorded; no marker shown</span>'
        parts.append(f"<tr><td>{_esc(site.name)} ({_esc(site.site_id)})</td>"
                     f"<td>{_esc(site.water_body)}</td><td>{coords}</td>"
                     f"<td>{_cell_or_gap(site.coord_provenance)}</td></tr></table>")
    else:
        parts.append('<p class="meta">No site linked.</p>')

    parts.append("<h2>Visit</h2>")
    parts.append("<table><tr><th>Visit</th><th>Observed (UTC)</th><th>State</th>"
                 "<th>Reviewed (UTC)</th></tr>")
    parts.append(f"<tr><td>{_esc(visit.visit_id)}</td>"
                 f"<td>{_cell_or_gap(_dt(visit.observed_at))}</td>"
                 f"<td>{_esc(visit.state)}</td>"
                 f"<td>{_cell_or_gap(_dt(visit.reviewed_at))}</td></tr></table>")
    parts.append(f"<p><strong>Notes:</strong> {_esc(visit.notes)}</p>")

    parts.append("<h2>Measurements</h2>")
    if detail.measurements:
        parts.append("<table><tr><th>ID</th><th>Parameter</th><th>Value</th>"
                     "<th>Unit</th><th>Method</th><th>Instrument</th><th>Note</th></tr>")
        for m in detail.measurements:
            parts.append(f"<tr><td>{_esc(m.measurement_id)}</td>"
                         f"<td>{_esc(m.parameter_code)}</td>"
                         f"<td>{_cell_or_gap(_num(m.value))}</td>"
                         f"<td>{_cell_or_gap(m.unit_code)}</td>"
                         f"<td>{_cell_or_gap(m.method_code)}</td>"
                         f"<td>{_cell_or_gap(m.instrument_ref)}</td>"
                         f"<td>{_cell_or_gap(m.note)}</td></tr>")
        parts.append("</table>")
    else:
        parts.append('<p class="meta">No measurements recorded.</p>')

    parts.append("<h2>Sample references</h2>")
    if detail.samples:
        parts.append("<table><tr><th>ID</th><th>Sample</th><th>Collected (UTC)</th>"
                     "<th>Status</th></tr>")
        for s in detail.samples:
            parts.append(f"<tr><td>{_esc(s.sample_ref_id)}</td>"
                         f"<td>{_esc(s.sample_id)}</td>"
                         f"<td>{_cell_or_gap(_dt(s.collected_at))}</td>"
                         f"<td>{_esc(s.status)}</td></tr>")
        parts.append("</table>")
    else:
        parts.append('<p class="meta">No sample references recorded.</p>')

    parts.append("<h2>Corrections / revisions</h2>")
    if detail.revisions:
        parts.append("<table><tr><th>Revision</th><th>Record</th><th>#</th>"
                     "<th>Reason</th><th>When (UTC)</th></tr>")
        for r in detail.revisions:
            parts.append(f"<tr><td>{_esc(r.revision_id)}</td>"
                         f"<td>{_esc(r.record_kind)} {_esc(r.record_id)}</td>"
                         f"<td>{_esc(r.revision_num)}</td>"
                         f"<td>{_esc(r.reason)}</td>"
                         f"<td>{_esc(_dt(r.created_at))}</td></tr>")
        parts.append("</table>")
    else:
        parts.append('<p class="meta">No corrections recorded.</p>')

    parts.append("<h2>Open completeness notes</h2>")
    if issues:
        for issue in issues:
            parts.append(f'<div class="issue"><strong>{_esc(issue.label)}</strong> — '
                         f"{_esc(issue.detail)} <span class=\"meta\">"
                         f"({_esc(issue.location)})</span></div>")
    else:
        parts.append('<p class="meta">No missing-context checks are outstanding for '
                     "this visit.</p>")

    if source_context:
        parts.append("<h2>Official advisory context</h2>")
        parts.append("<table><tr><th>Agency</th><th>Status</th><th>Checked (UTC)</th>"
                     "<th>Coverage</th></tr>")
        for row in source_context:
            parts.append(f"<tr><td>{_esc(row.get('agency', ''))}</td>"
                         f"<td>{_esc(row.get('status', ''))}</td>"
                         f"<td>{_cell_or_gap(row.get('checked_at'))}</td>"
                         f"<td>{_esc(row.get('coverage', ''))}</td></tr>")
        parts.append("</table>")

    parts.append("<footer>Missing values are shown as a dash, never as zero. "
                 "Completeness and compatibility are not evidence of scientific "
                 "validity or safety. Officially issued agency advisories control; "
                 "this summary is an unvalidated staff prototype, not an agency "
                 "determination.</footer>")
    parts.append("</main></body></html>")
    return "".join(parts)
