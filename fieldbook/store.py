"""Durable SQLite storage for Watershed Fieldbook.

Durability contract (from PRD): a save succeeds only after the commit succeeds.
Writes run in a single transaction; any failure rolls back completely and raises
StorageError — the caller must keep the user's edits and never show false success.

Workspace classes are physically isolated files and recorded immutably in the
database's meta table; opening an existing file under the wrong class fails closed.
Deletes are scoped to the active class and remove revisions of the record and its
children.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from pathlib import Path

from fieldbook import config
from fieldbook.records import (
    Measurement,
    SampleReference,
    Site,
    ValidationError,
    Visit,
)


class StorageError(RuntimeError):
    """A write could not be made durable; nothing changed on disk."""


class WorkspaceClassError(StorageError):
    """Attempted to reuse a database file under a different workspace class."""


class NotFoundError(StorageError):
    """The requested record does not exist in this workspace."""


@dataclass(frozen=True)
class Revision:
    revision_id: str
    record_kind: str
    record_id: str
    revision_num: int
    reason: str
    prior_values: dict
    created_at: datetime


@dataclass(frozen=True)
class VisitDetail:
    visit: Visit
    site: Site | None = None
    measurements: tuple[Measurement, ...] = ()
    samples: tuple[SampleReference, ...] = ()
    revisions: tuple[Revision, ...] = ()
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True)
class VisitListItem:
    visit: Visit
    site_name: str | None = None


def new_uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


_VISIT_PATCHABLE = ("site_id", "observed_at", "notes", "state", "observer_code",
                    "follow_up_flag", "follow_up_note", "reviewed_at")
_MEASUREMENT_PATCHABLE = ("value", "unit_code", "method_code", "instrument_ref", "note")
_SAMPLE_PATCHABLE = ("sample_id", "collected_at", "status")


class Store:
    def __init__(self, data_dir, workspace_class, *, db_file=None, schema_version=None):
        config._require_class(workspace_class)
        self._class = workspace_class
        self.data_dir = Path(data_dir)
        self.db_path = Path(db_file) if db_file else config.db_path(self.data_dir, self._class)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._init_schema(schema_version or config.SCHEMA_VERSION)

    # ------------------------------------------------------------------ lifecycle

    def _init_schema(self, schema_version: int) -> None:
        with self._lock:
            cur = self._conn.cursor()
            cur.executescript(
                """
                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sites (
                    site_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    water_body TEXT NOT NULL,
                    lat REAL,
                    lon REAL,
                    coord_provenance TEXT,
                    origin TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS visits (
                    visit_id TEXT PRIMARY KEY,
                    site_id TEXT,
                    observed_at TEXT,
                    notes TEXT NOT NULL,
                    state TEXT NOT NULL,
                    observer_code TEXT,
                    follow_up_flag INTEGER NOT NULL DEFAULT 0,
                    follow_up_note TEXT,
                    reviewed_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (site_id) REFERENCES sites(site_id)
                );
                CREATE TABLE IF NOT EXISTS measurements (
                    measurement_id TEXT PRIMARY KEY,
                    visit_id TEXT NOT NULL,
                    parameter_code TEXT NOT NULL,
                    value REAL,
                    unit_code TEXT,
                    method_code TEXT,
                    instrument_ref TEXT,
                    note TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (visit_id) REFERENCES visits(visit_id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS sample_refs (
                    sample_ref_id TEXT PRIMARY KEY,
                    visit_id TEXT NOT NULL,
                    sample_id TEXT NOT NULL,
                    collected_at TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (visit_id) REFERENCES visits(visit_id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS revisions (
                    revision_id TEXT PRIMARY KEY,
                    record_kind TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    revision_num INTEGER NOT NULL,
                    reason TEXT NOT NULL,
                    prior_values TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE (record_kind, record_id, revision_num)
                );
                """
            )
            row = cur.execute("SELECT value FROM meta WHERE key = 'workspace_class'").fetchone()
            if row is not None:
                if row["value"] != self._class:
                    raise WorkspaceClassError(
                        f"Database {self.db_path} belongs to workspace class "
                        f"'{row['value']}', not '{self._class}'.")
            else:
                cur.execute(
                    "INSERT INTO meta (key, value) VALUES (?, ?)",
                    ("workspace_class", self._class))
                cur.execute(
                    "INSERT INTO meta (key, value) VALUES (?, ?)",
                    ("schema_version", str(schema_version)))
            self._conn.commit()

    def get_class(self) -> str:
        return self._class

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def _commit(self) -> None:
        try:
            self._conn.commit()
        except sqlite3.Error as exc:
            self._conn.rollback()
            raise StorageError(f"Could not save durably: {exc}") from exc

    # ------------------------------------------------------------------- helpers

    def _site_row(self, row) -> Site:
        return Site(
            site_id=row["site_id"], name=row["name"], water_body=row["water_body"],
            lat=row["lat"], lon=row["lon"], coord_provenance=row["coord_provenance"],
            origin=row["origin"],
            created_at=_parse(row["created_at"]), updated_at=_parse(row["updated_at"]))

    def _visit_row(self, row) -> Visit:
        return Visit(
            visit_id=row["visit_id"], site_id=row["site_id"],
            observed_at=_parse(row["observed_at"]), notes=row["notes"], state=row["state"],
            observer_code=row["observer_code"], follow_up_flag=bool(row["follow_up_flag"]),
            follow_up_note=row["follow_up_note"], reviewed_at=_parse(row["reviewed_at"]),
            created_at=_parse(row["created_at"]), updated_at=_parse(row["updated_at"]))

    @staticmethod
    def _measurement_row(row) -> Measurement:
        return Measurement(
            measurement_id=row["measurement_id"], visit_id=row["visit_id"],
            parameter_code=row["parameter_code"], value=row["value"], unit_code=row["unit_code"],
            method_code=row["method_code"], instrument_ref=row["instrument_ref"],
            note=row["note"], created_at=_parse(row["created_at"]))

    @staticmethod
    def _sample_row(row) -> SampleReference:
        return SampleReference(
            sample_ref_id=row["sample_ref_id"], visit_id=row["visit_id"],
            sample_id=row["sample_id"], collected_at=_parse(row["collected_at"]),
            status=row["status"], created_at=_parse(row["created_at"]))

    # --------------------------------------------------------------------- sites

    def save_site(self, site: Site) -> Site:
        with self._lock:
            now = datetime.now(timezone.utc)
            site = Site(
                site_id=site.site_id or new_uid("S"),
                name=site.name, water_body=site.water_body,
                lat=site.lat, lon=site.lon, coord_provenance=site.coord_provenance,
                origin=site.origin,
                created_at=site.created_at or now, updated_at=now)
            try:
                self._conn.execute(
                    """INSERT OR REPLACE INTO sites
                       (site_id, name, water_body, lat, lon, coord_provenance, origin,
                        created_at, updated_at)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (site.site_id, site.name, site.water_body, site.lat, site.lon,
                     site.coord_provenance, site.origin, _fmt(site.created_at),
                     _fmt(site.updated_at)))
                self._commit()
            except sqlite3.Error as exc:
                raise StorageError(f"Could not save site: {exc}") from exc
            return site

    def get_site(self, site_id: str) -> Site | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM sites WHERE site_id = ?", (site_id,)).fetchone()
        return self._site_row(row) if row else None

    def list_sites(self, q: str | None = None) -> list[Site]:
        with self._lock:
            if q:
                rows = self._conn.execute(
                    "SELECT * FROM sites WHERE name LIKE ? ORDER BY name",
                    (f"%{q}%",)).fetchall()
            else:
                rows = self._conn.execute("SELECT * FROM sites ORDER BY name").fetchall()
        return [self._site_row(r) for r in rows]

    # -------------------------------------------------------------------- visits

    def create_visit(self, visit: Visit, *, measurements=(), samples=()) -> VisitDetail:
        with self._lock:
            now = datetime.now(timezone.utc)
            visit = Visit(
                visit_id=visit.visit_id or new_uid("V"),
                site_id=visit.site_id, observed_at=visit.observed_at, notes=visit.notes,
                state=visit.state, observer_code=visit.observer_code,
                follow_up_flag=visit.follow_up_flag, follow_up_note=visit.follow_up_note,
                reviewed_at=visit.reviewed_at,
                created_at=visit.created_at or now, updated_at=visit.created_at or now)
            ms = [Measurement(
                measurement_id=m.measurement_id or new_uid("M"),
                visit_id=visit.visit_id, parameter_code=m.parameter_code, value=m.value,
                unit_code=m.unit_code, method_code=m.method_code, instrument_ref=m.instrument_ref,
                note=m.note, created_at=m.created_at or now) for m in measurements]
            ss = [SampleReference(
                sample_ref_id=s.sample_ref_id or new_uid("X"),
                visit_id=visit.visit_id, sample_id=s.sample_id, collected_at=s.collected_at,
                status=s.status, created_at=s.created_at or now) for s in samples]
            warnings = _duplicate_sample_warnings(ss)
            try:
                self._conn.execute(
                    """INSERT INTO visits
                       (visit_id, site_id, observed_at, notes, state, observer_code,
                        follow_up_flag, follow_up_note, reviewed_at, created_at, updated_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                    (visit.visit_id, visit.site_id, _fmt(visit.observed_at), visit.notes,
                     visit.state, visit.observer_code, int(visit.follow_up_flag),
                     visit.follow_up_note, _fmt(visit.reviewed_at), _fmt(visit.created_at),
                     _fmt(visit.updated_at)))
                for m in ms:
                    self._conn.execute(
                        """INSERT INTO measurements
                           (measurement_id, visit_id, parameter_code, value, unit_code,
                            method_code, instrument_ref, note, created_at)
                           VALUES (?,?,?,?,?,?,?,?,?)""",
                        (m.measurement_id, m.visit_id, m.parameter_code, m.value, m.unit_code,
                         m.method_code, m.instrument_ref, m.note, _fmt(m.created_at)))
                for s in ss:
                    self._conn.execute(
                        """INSERT INTO sample_refs
                           (sample_ref_id, visit_id, sample_id, collected_at, status,
                            created_at)
                           VALUES (?,?,?,?,?,?)""",
                        (s.sample_ref_id, s.visit_id, s.sample_id, _fmt(s.collected_at),
                         s.status, _fmt(s.created_at)))
                self._commit()
            except sqlite3.Error as exc:
                raise StorageError(f"Could not save visit: {exc}") from exc
        updated = self.get_visit(visit.visit_id)
        return replace(updated, warnings=tuple(warnings))

    def get_visit(self, visit_id: str) -> VisitDetail | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM visits WHERE visit_id = ?", (visit_id,)).fetchone()
            if row is None:
                return None
            visit = self._visit_row(row)
            site = None
            if visit.site_id:
                srow = self._conn.execute(
                    "SELECT * FROM sites WHERE site_id = ?", (visit.site_id,)).fetchone()
                if srow:
                    site = self._site_row(srow)
            mrows = self._conn.execute(
                "SELECT * FROM measurements WHERE visit_id = ? ORDER BY created_at",
                (visit_id,)).fetchall()
            srows = self._conn.execute(
                "SELECT * FROM sample_refs WHERE visit_id = ? ORDER BY created_at",
                (visit_id,)).fetchall()
            rrows = self._conn.execute(
                "SELECT * FROM revisions WHERE " + _revision_clause(visit_id, mrows, srows),
                [visit_id] + [r["measurement_id"] for r in mrows]
                + [r["sample_ref_id"] for r in srows]).fetchall()
        return VisitDetail(
            visit=visit, site=site,
            measurements=tuple(self._measurement_row(r) for r in mrows),
            samples=tuple(self._sample_row(r) for r in srows),
            revisions=tuple(_revision_row(r) for r in rrows))

    def list_visits(self, site_id: str | None = None, state: str | None = None) -> list[VisitListItem]:
        with self._lock:
            sql = ("SELECT v.*, s.name AS site_name FROM visits v "
                   "LEFT JOIN sites s ON s.site_id = v.site_id WHERE 1=1")
            params = []
            if site_id is not None:
                sql += " AND v.site_id = ?"
                params.append(site_id)
            if state is not None:
                sql += " AND v.state = ?"
                params.append(state)
            sql += " ORDER BY COALESCE(v.observed_at, v.created_at) DESC"
            rows = self._conn.execute(sql, params).fetchall()
        return [VisitListItem(visit=self._visit_row(r), site_name=r["site_name"]) for r in rows]

    # ----------------------------------------------------------------- revisions

    def revision_visit(self, visit_id: str, *, reason: str, visit_patch=None,
                       measurement_patches=None, sample_patches=None) -> VisitDetail:
        reason = (reason or "").strip()
        if not reason:
            raise StorageError("A revision reason is required to change a saved record.")
        with self._lock:
            current = self.get_visit(visit_id)
            if current is None:
                raise NotFoundError(f"Visit {visit_id} not found.")
            now = datetime.now(timezone.utc)
            try:
                visit_patch = dict(visit_patch or {})
                new_visit = self._apply_visit_patch(current.visit, visit_patch)
                old_ms = dict((m.measurement_id, m) for m in current.measurements)
                new_ms = dict(old_ms)
                for spec in measurement_patches or []:
                    mid = spec["measurement_id"]
                    if mid not in new_ms:
                        raise NotFoundError(f"Measurement {mid} not on visit {visit_id}.")
                    new_ms[mid] = self._apply_measurement_patch(new_ms[mid], spec["patch"])
                old_ss = dict((s.sample_ref_id, s) for s in current.samples)
                new_ss = dict(old_ss)
                for spec in sample_patches or []:
                    sid = spec["sample_ref_id"]
                    if sid not in new_ss:
                        raise NotFoundError(f"Sample {sid} not on visit {visit_id}.")
                    new_ss[sid] = self._apply_sample_patch(new_ss[sid], spec["patch"])

                changed = False
                if new_visit != current.visit:
                    self._write_revision("visit", visit_id, current.visit, reason, now)
                    self._update_visit_row(new_visit, now)
                    changed = True
                for mid, new_m in new_ms.items():
                    if new_m != old_ms[mid]:
                        self._write_revision("measurement", mid, old_ms[mid], reason, now)
                        self._update_measurement_row(new_m, now)
                        changed = True
                for sid, new_s in new_ss.items():
                    if new_s != old_ss[sid]:
                        self._write_revision("sample", sid, old_ss[sid], reason, now)
                        self._update_sample_row(new_s, now)
                        changed = True
                if changed:
                    self._commit()
                else:
                    raise StorageError("No values changed in this edit; nothing to revise.")
            except ValidationError:
                raise
            except StorageError:
                raise
            except sqlite3.Error as exc:
                raise StorageError(f"Could not write revision: {exc}") from exc
        return self.get_visit(visit_id)

    def _apply_visit_patch(self, visit: Visit, patch: dict) -> Visit:
        bad = set(patch) - set(_VISIT_PATCHABLE)
        if bad:
            raise ValidationError("Unknown visit field(s): " + ", ".join(sorted(bad)),
                                  fields={b: "Unknown field." for b in bad})
        merged = dict(
            site_id=visit.site_id, observed_at=visit.observed_at, notes=visit.notes,
            state=visit.state, observer_code=visit.observer_code,
            follow_up_flag=visit.follow_up_flag, follow_up_note=visit.follow_up_note,
            reviewed_at=visit.reviewed_at)
        merged.update(patch)
        return build_visit_for_revision(merged, visit)

    def _apply_measurement_patch(self, m: Measurement, patch: dict) -> Measurement:
        bad = set(patch) - set(_MEASUREMENT_PATCHABLE)
        if bad:
            raise ValidationError("Unknown measurement field(s): " + ", ".join(sorted(bad)),
                                  fields={b: "Unknown field." for b in bad})
        merged = dict(parameter_code=m.parameter_code, value=m.value, unit_code=m.unit_code,
                      method_code=m.method_code, instrument_ref=m.instrument_ref, note=m.note)
        merged.update(patch)
        return build_measurement_for_revision(m.measurement_id, m.visit_id, merged, m.created_at)

    def _apply_sample_patch(self, s: SampleReference, patch: dict) -> SampleReference:
        bad = set(patch) - set(_SAMPLE_PATCHABLE)
        if bad:
            raise ValidationError("Unknown sample field(s): " + ", ".join(sorted(bad)),
                                  fields={b: "Unknown field." for b in bad})
        merged = dict(sample_id=s.sample_id, collected_at=s.collected_at, status=s.status)
        merged.update(patch)
        return build_sample_for_revision(s.sample_ref_id, s.visit_id, merged, s.created_at)

    def _write_revision(self, kind: str, record_id: str, prior: object,
                        reason: str, now: datetime) -> None:
        num = self._next_revision_num(kind, record_id)
        self._conn.execute(
            """INSERT INTO revisions
               (revision_id, record_kind, record_id, revision_num, reason, prior_values,
                created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (new_uid("R"), kind, record_id, num, reason,
             json.dumps(record_to_dict(prior), default=str), _fmt(now)))

    def _next_revision_num(self, kind: str, record_id: str) -> int:
        row = self._conn.execute(
            "SELECT MAX(revision_num) AS n FROM revisions "
            "WHERE record_kind = ? AND record_id = ?", (kind, record_id)).fetchone()
        return (row["n"] or 0) + 1

    def _update_visit_row(self, visit: Visit, now: datetime) -> None:
        self._conn.execute(
            """UPDATE visits SET site_id=?, observed_at=?, notes=?, state=?, observer_code=?,
               follow_up_flag=?, follow_up_note=?, reviewed_at=?, updated_at=?
               WHERE visit_id=?""",
            (visit.site_id, _fmt(visit.observed_at), visit.notes, visit.state,
             visit.observer_code, int(visit.follow_up_flag), visit.follow_up_note,
             _fmt(visit.reviewed_at), _fmt(now), visit.visit_id))

    def _update_measurement_row(self, m: Measurement, now: datetime) -> None:
        self._conn.execute(
            """UPDATE measurements SET parameter_code=?, value=?, unit_code=?, method_code=?,
               instrument_ref=?, note=? WHERE measurement_id=?""",
            (m.parameter_code, m.value, m.unit_code, m.method_code, m.instrument_ref, m.note,
             m.measurement_id))

    def _update_sample_row(self, s: SampleReference, now: datetime) -> None:
        self._conn.execute(
            """UPDATE sample_refs SET sample_id=?, collected_at=?, status=? WHERE sample_ref_id=?""",
            (s.sample_id, _fmt(s.collected_at), s.status, s.sample_ref_id))

    # ------------------------------------------------------------------- delete

    def delete_visit(self, visit_id: str) -> None:
        with self._lock:
            detail = self.get_visit(visit_id)
            if detail is None:
                raise NotFoundError(f"Visit {visit_id} not found.")
            try:
                child_ids = ([m.measurement_id for m in detail.measurements]
                             + [s.sample_ref_id for s in detail.samples])
                clauses = ["(record_kind = 'visit' AND record_id = ?)"]
                params = [visit_id]
                if child_ids:
                    in_clause = f"({' ,'.join('?' * len(child_ids))})"
                    clauses.append(f"(record_kind = 'measurement' AND record_id IN {in_clause})")
                    params.extend(child_ids)
                self._conn.execute(
                    "DELETE FROM revisions WHERE " + " OR ".join(clauses), params)
                if child_ids:
                    in_clause = f"({' ,'.join('?' * len(child_ids))})"
                    self._conn.execute(
                        f"DELETE FROM revisions WHERE record_kind = 'sample' "
                        f"AND record_id IN {in_clause}", child_ids)
                self._conn.execute("DELETE FROM visits WHERE visit_id = ?", (visit_id,))
                self._commit()
            except sqlite3.Error as exc:
                raise StorageError(f"Could not delete visit: {exc}") from exc

    # ------------------------------------------------------------------ counts

    def counts(self) -> dict:
        with self._lock:
            out = {}
            for table in ("sites", "visits", "measurements", "sample_refs", "revisions"):
                row = self._conn.execute(f"SELECT COUNT(*) AS n FROM {table}").fetchone()
                out[table] = row["n"]
            return out


# ---------------------------------------------------------------- rebuild helpers

def build_visit_for_revision(merged: dict, prior: Visit) -> Visit:
    from fieldbook.records import build_visit
    return build_visit(
        site_id=merged["site_id"], observed_at=merged["observed_at"],
        notes=merged["notes"], state=merged["state"], observer_code=merged["observer_code"],
        follow_up_flag=merged["follow_up_flag"], follow_up_note=merged["follow_up_note"],
        reviewed_at=merged["reviewed_at"], visit_id=prior.visit_id,
        created_at=prior.created_at)


def build_measurement_for_revision(measurement_id: str, visit_id: str, merged: dict,
                                   created_at) -> Measurement:
    from fieldbook.records import build_measurement
    return build_measurement(
        visit_id=visit_id, parameter_code=merged["parameter_code"], value=merged["value"],
        unit_code=merged["unit_code"], method_code=merged["method_code"],
        instrument_ref=merged["instrument_ref"], note=merged["note"],
        measurement_id=measurement_id, created_at=created_at)


def build_sample_for_revision(sample_ref_id: str, visit_id: str, merged: dict,
                              created_at) -> SampleReference:
    from fieldbook.records import build_sample
    return build_sample(
        visit_id=visit_id, sample_id=merged["sample_id"], collected_at=merged["collected_at"],
        status=merged["status"], sample_ref_id=sample_ref_id, created_at=created_at)


# --------------------------------------------------------------------- utilities

def _revision_clause(visit_id: str, mrows, srows) -> str:
    """SQL WHERE clause selecting revisions of a visit and its children."""
    clauses = ["(record_kind = 'visit' AND record_id = ?)"]
    if mrows:
        clauses.append(f"(record_kind = 'measurement' AND record_id IN "
                       f"({' ,'.join('?' * len(mrows))}))")
    if srows:
        clauses.append(f"(record_kind = 'sample' AND record_id IN "
                       f"({' ,'.join('?' * len(srows))}))")
    return "(" + " OR ".join(clauses) + ")"


def _parse(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value)


def _fmt(value: datetime | None) -> str | None:
    return value.astimezone(timezone.utc).isoformat(timespec="seconds") if value else None


def _revision_row(row) -> Revision:
    return Revision(
        revision_id=row["revision_id"], record_kind=row["record_kind"],
        record_id=row["record_id"], revision_num=row["revision_num"], reason=row["reason"],
        prior_values=json.loads(row["prior_values"]), created_at=_parse(row["created_at"]))


def record_to_dict(record) -> dict:
    """Serialize a Site/Visit/Measurement/SampleReference for revision history."""
    from dataclasses import fields, is_dataclass
    if not is_dataclass(record):
        return {"value": str(record)}
    out = {}
    for f in fields(record):
        value = getattr(record, f.name)
        if isinstance(value, datetime):
            value = value.astimezone(timezone.utc).isoformat()
        elif isinstance(value, tuple):
            value = [record_to_dict(item) if _is_record(item) else item for item in value]
        out[f.name] = value
    return out


def _is_record(obj) -> bool:
    from dataclasses import is_dataclass
    return is_dataclass(obj)


def _duplicate_sample_warnings(samples: tuple[SampleReference, ...]) -> list[str]:
    seen = {}
    warnings = []
    for s in samples:
        if s.sample_id in seen:
            warnings.append(
                f"Sample ID '{s.sample_id}' is used more than once in this visit.")
        seen[s.sample_id] = True
    return warnings