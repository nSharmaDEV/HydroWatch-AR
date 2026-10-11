"""Localhost FastAPI service for Watershed Fieldbook.

The service is bound to one active workspace class at a time (switchable via
``POST /api/workspace``); every read, write, selection and download is scoped to
that class. It never fabricates data: validation failures are 400 with field
messages, a write that cannot be made durable is 409 and leaves records unchanged,
and a failed official source is reported as "Data unavailable".
"""
from __future__ import annotations

import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Body, FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response

from fieldbook import config, exports, records, review, sources
from fieldbook.store import NotFoundError, StorageError, Store


def _iso(value):
    return records.format_iso_dt(value) if value is not None else None


def _site_dict(site) -> dict:
    if site is None:
        return None
    return {
        "site_id": site.site_id, "name": site.name, "water_body": site.water_body,
        "lat": site.lat, "lon": site.lon, "coord_provenance": site.coord_provenance,
        "origin": site.origin, "created_at": _iso(site.created_at),
        "updated_at": _iso(site.updated_at),
    }


def _visit_dict(v) -> dict:
    return {
        "visit_id": v.visit_id, "site_id": v.site_id, "observed_at": _iso(v.observed_at),
        "notes": v.notes, "state": v.state, "observer_code": v.observer_code,
        "follow_up_flag": v.follow_up_flag, "follow_up_note": v.follow_up_note,
        "reviewed_at": _iso(v.reviewed_at), "created_at": _iso(v.created_at),
        "updated_at": _iso(v.updated_at),
    }


def _measurement_dict(m) -> dict:
    return {
        "measurement_id": m.measurement_id, "visit_id": m.visit_id,
        "parameter_code": m.parameter_code, "value": m.value, "unit_code": m.unit_code,
        "method_code": m.method_code, "instrument_ref": m.instrument_ref, "note": m.note,
        "created_at": _iso(m.created_at),
    }


def _sample_dict(s) -> dict:
    return {
        "sample_ref_id": s.sample_ref_id, "visit_id": s.visit_id,
        "sample_id": s.sample_id, "collected_at": _iso(s.collected_at),
        "status": s.status, "created_at": _iso(s.created_at),
    }


def _revision_dict(r) -> dict:
    return {
        "revision_id": r.revision_id, "record_kind": r.record_kind,
        "record_id": r.record_id, "revision_num": r.revision_num, "reason": r.reason,
        "prior_values": r.prior_values, "created_at": _iso(r.created_at),
    }


def _issue_dict(i) -> dict:
    return {"issue_type": i.issue_type, "label": i.label, "detail": i.detail,
            "location": i.location}


def _detail_dict(detail) -> dict:
    return {
        "visit": _visit_dict(detail.visit), "site": _site_dict(detail.site),
        "measurements": [_measurement_dict(m) for m in detail.measurements],
        "samples": [_sample_dict(s) for s in detail.samples],
        "revisions": [_revision_dict(r) for r in detail.revisions],
        "warnings": list(detail.warnings),
    }


def _reading_dict(row) -> dict:
    m = row.measurement
    out = _measurement_dict(m)
    out.update({
        "observed_at": _iso(row.observed_at), "excluded": row.excluded,
        "exclusion_reason": row.exclusion_reason,
    })
    return out


def _comparison_dict(store: Store, site_id: str) -> dict:
    comp = review.comparison_for_site(store, site_id)
    return {
        "site_id": comp.site_id, "workspace_class": comp.workspace_class,
        "groups": [
            {"key": {"site_id": g.key.site_id, "parameter_code": g.key.parameter_code,
                     "unit_code": g.key.unit_code, "method_code": g.key.method_code,
                     "instrument_ref": g.key.instrument_ref},
             "readings": [_reading_dict(r) for r, _vid in g.readings]}
            for g in comp.groups],
        "excluded": [_reading_dict(r) for r in comp.excluded],
        "verdicts": review.verdicts(store, site_id),
    }


# ------------------------------------------------------------------ build inputs

def _visit_from_payload(payload: dict):
    return records.build_visit(
        site_id=payload.get("site_id"),
        observed_at=payload.get("observed_at"),
        notes=payload.get("notes", ""),
        state=payload.get("state", "recorded"),
        observer_code=payload.get("observer_code"),
        follow_up_flag=payload.get("follow_up_flag", False),
        follow_up_note=payload.get("follow_up_note"),
        reviewed_at=payload.get("reviewed_at"),
    )


def _measurements_from_payload(items):
    out = []
    for it in items or []:
        out.append(records.build_measurement(
            visit_id="",
            parameter_code=it.get("parameter_code", ""),
            value=it.get("value"),
            unit_code=it.get("unit_code"),
            method_code=it.get("method_code"),
            instrument_ref=it.get("instrument_ref"),
            note=it.get("note"),
        ))
    return out


def _samples_from_payload(items):
    out = []
    for it in items or []:
        out.append(records.build_sample(
            visit_id="",
            sample_id=it.get("sample_id", ""),
            collected_at=it.get("collected_at"),
            status=it.get("status", "unknown"),
        ))
    return out


class _State:
    """Holds the active workspace class and one lazily opened store per class."""

    def __init__(self, data_dir, workspace_class):
        config._require_class(workspace_class)
        self.data_dir = Path(data_dir).resolve()
        self.active_class = workspace_class
        self._stores: dict[str, Store] = {}
        self._lock = threading.Lock()
        self.working = sources.WorkingContext()
        self.demo = sources.DemoContext()
        self.context_cache: dict[str, list] = {}

    def store(self, workspace_class: str | None = None) -> Store:
        cls = workspace_class or self.active_class
        config._require_class(cls)
        with self._lock:
            if cls not in self._stores:
                self._stores[cls] = Store(self.data_dir, cls)
            return self._stores[cls]

    def switch(self, workspace_class: str) -> None:
        config._require_class(workspace_class)
        self.active_class = workspace_class

    def context(self) -> list:
        ctx = sources.ContextSource(self.active_class, working=self.working, demo=self.demo)
        rows = ctx.get()
        self.context_cache[self.active_class] = rows
        return rows

    def close(self) -> None:
        with self._lock:
            for store in self._stores.values():
                store.close()
            self._stores.clear()


def create_app(data_dir=None, *, workspace_class: str = "working") -> FastAPI:
    config._require_class(workspace_class)
    resolved = Path(data_dir).resolve() if data_dir is not None else config.resolve_data_dir()
    state = _State(resolved, workspace_class)

    @asynccontextmanager
    async def _lifespan(_app: FastAPI):
        yield
        state.close()

    app = FastAPI(title="Watershed Fieldbook (local prototype)",
                  description="Unvalidated staff field-record prototype. Localhost only.",
                  lifespan=_lifespan)
    app.state.fb = state

    # ------------------------------------------------------------- error shapes

    @app.exception_handler(records.ValidationError)
    async def _validation(_request: Request, exc: records.ValidationError):
        return JSONResponse(status_code=400,
                            content={"detail": str(exc), "fields": exc.fields})

    @app.exception_handler(NotFoundError)
    async def _not_found(_request: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(StorageError)
    async def _storage(_request: Request, exc: StorageError):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(ValueError)
    async def _value(_request: Request, exc: ValueError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    # -------------------------------------------------------------- health/meta

    @app.get("/api/health")
    def health():
        return {"status": "ok", "schema_version": config.SCHEMA_VERSION}

    @app.get("/api/meta")
    def meta():
        return {
            "workspace_class": state.active_class,
            "workspace_classes": list(config.WORKSPACE_CLASSES),
            "data_dir": str(state.data_dir),
            "schema_version": config.SCHEMA_VERSION,
            "prototype": True,
        }

    @app.post("/api/workspace")
    def set_workspace(payload: dict = Body(default=None)):
        payload = payload or {}
        cls = payload.get("class")
        config._require_class(cls)
        state.switch(cls)
        return {"workspace_class": state.active_class}

    @app.get("/api/storage")
    def storage():
        store = state.store()
        return {
            "workspace_class": state.active_class,
            "data_dir": str(state.data_dir),
            "db_path": str(store.db_path),
            "counts": store.counts(),
        }

    # -------------------------------------------------------------------- sites

    @app.get("/api/sites")
    def list_sites(q: str | None = None):
        return [_site_dict(s) for s in state.store().list_sites(q)]

    @app.post("/api/sites", status_code=201)
    def create_site(payload: dict = Body(...)):
        site = records.normalize_site(
            name=payload.get("name", ""),
            water_body=payload.get("water_body", ""),
            lat=payload.get("lat"), lon=payload.get("lon"),
            coord_provenance=payload.get("coord_provenance"))
        return _site_dict(state.store().save_site(site))

    @app.get("/api/sites/{site_id}")
    def get_site(site_id: str):
        site = state.store().get_site(site_id)
        if site is None:
            raise NotFoundError(f"Site {site_id} not found.")
        return _site_dict(site)

    @app.get("/api/sites/{site_id}/visits")
    def site_visits(site_id: str, visit_state: str | None = None):
        if state.store().get_site(site_id) is None:
            raise NotFoundError(f"Site {site_id} not found.")
        items = state.store().list_visits(site_id=site_id, state=visit_state)
        return [{"visit": _visit_dict(i.visit), "site_name": i.site_name} for i in items]

    @app.get("/api/sites/{site_id}/compare")
    def compare_site(site_id: str):
        store = state.store()
        if store.get_site(site_id) is None:
            raise NotFoundError(f"Site {site_id} not found.")
        return _comparison_dict(store, site_id)

    # ------------------------------------------------------------------- visits

    @app.get("/api/visits")
    def list_visits(site_id: str | None = None, visit_state: str | None = None):
        items = state.store().list_visits(site_id=site_id, state=visit_state)
        return [{"visit": _visit_dict(i.visit), "site_name": i.site_name} for i in items]

    @app.post("/api/visits", status_code=201)
    def create_visit(payload: dict = Body(...)):
        visit = _visit_from_payload(payload)
        measurements = _measurements_from_payload(payload.get("measurements"))
        samples = _samples_from_payload(payload.get("samples"))
        detail = state.store().create_visit(visit, measurements=measurements, samples=samples)
        return _detail_dict(detail)

    @app.get("/api/visits/{visit_id}")
    def get_visit(visit_id: str):
        detail = state.store().get_visit(visit_id)
        if detail is None:
            raise NotFoundError(f"Visit {visit_id} not found.")
        return _detail_dict(detail)

    @app.put("/api/visits/{visit_id}")
    def revise_visit(visit_id: str, payload: dict = Body(...)):
        detail = state.store().revision_visit(
            visit_id,
            reason=payload.get("reason", ""),
            visit_patch=payload.get("visit_patch"),
            measurement_patches=payload.get("measurement_patches"),
            sample_patches=payload.get("sample_patches"))
        return _detail_dict(detail)

    @app.delete("/api/visits/{visit_id}")
    def delete_visit(visit_id: str, payload: dict = Body(default=None)):
        payload = payload or {}
        if payload.get("confirm") is not True:
            return JSONResponse(status_code=400,
                                content={"detail": "Deleting a saved visit requires "
                                                   '{"confirm": true}.'})
        state.store().delete_visit(visit_id)
        return {"deleted": visit_id}

    @app.get("/api/visits/{visit_id}/review")
    def visit_review(visit_id: str):
        store = state.store()
        detail = store.get_visit(visit_id)
        if detail is None:
            raise NotFoundError(f"Visit {visit_id} not found.")
        issues = [_issue_dict(i) for i in review.visit_issues(detail)]
        verdicts = review.verdicts(store, detail.visit.site_id) if detail.visit.site_id else []
        return {"issues": issues, "verdicts": verdicts}

    # ------------------------------------------------------------------ context

    @app.get("/api/official-context")
    def official_context():
        return state.context()

    # ------------------------------------------------------------------ exports

    @app.get("/api/visits/{visit_id}/export/{table}.csv")
    def export_csv(visit_id: str, table: str):
        if table not in exports.CSV_HEADERS:
            raise NotFoundError(f"Unknown export table '{table}'.")
        detail = state.store().get_visit(visit_id)
        if detail is None:
            raise NotFoundError(f"Visit {visit_id} not found.")
        body = exports.csv_tables(detail, state.active_class)[table]
        filename = exports.csv_filename(table, visit_id, state.active_class)
        return Response(
            content=body, media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    @app.get("/api/visits/{visit_id}/summary.html")
    def export_summary(visit_id: str):
        detail = state.store().get_visit(visit_id)
        if detail is None:
            raise NotFoundError(f"Visit {visit_id} not found.")
        context = state.context_cache.get(state.active_class)
        html = exports.summary_html(detail, state.active_class, source_context=context)
        return HTMLResponse(content=html)

    return app


app = create_app()
