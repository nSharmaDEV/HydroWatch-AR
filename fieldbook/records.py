"""Typed field records and strict validation for Watershed Fieldbook.

Non-claims: a validated record is user-entered evidence, never an agency record,
measurement of scientific validity, or a safety determination. Missing context is
saved as a disclosed issue; structurally invalid input is rejected, never coerced.
Method codes and instrument references are trimmed ONLY at their edges and matched
exactly/case-sensitively later — no aliases, no model equivalence, no unit guesses.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

WATER_BODIES: tuple[str, ...] = ("Buffalo National River", "Beaver Lake")
VISIT_STATES: tuple[str, ...] = ("draft", "recorded")
PARAMETERS: tuple[str, ...] = ("temperature", "ph", "turbidity")
UNITS_BY_PARAMETER: dict[str, tuple[str, ...]] = {
    "temperature": ("celsius",),
    "ph": ("ph",),
    "turbidity": ("ntu", "fnu"),
}
MEASUREMENT_UNITS: tuple[str, ...] = ("celsius", "ph", "ntu", "fnu")
SAMPLE_STATUSES: tuple[str, ...] = ("planned", "collected", "unknown")


class ValidationError(ValueError):
    """Field-level validation failure; carries per-field messages."""

    def __init__(self, message: str, *, fields: dict[str, str] | None = None):
        super().__init__(message)
        self.fields = fields or {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _blank(value: str | None) -> bool:
    return value is None or not value.strip()


def _require(condition: bool, message: str, *, field: str) -> None:
    if not condition:
        raise ValidationError(message, fields={field: message})


def trim_reference(value: str | None) -> str | None:
    """Edge-trim a method/instrument reference; empty means missing (None)."""
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed if trimmed else None


def parse_iso_dt(value: str) -> datetime:
    """Strict ISO-8601 parse requiring an explicit timezone."""
    try:
        text = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
    except ValueError as exc:
        raise ValidationError(
            "Enter a date/time with an explicit timezone, e.g. 2026-10-11T09:30:00-05:00.",
            fields={"observed_at": "Date/time must include a timezone."},
        ) from exc
    if parsed.tzinfo is None:
        raise ValidationError(
            "Date/time must include an explicit timezone.",
            fields={"observed_at": "Date/time must include a timezone."})
    return parsed


def format_iso_dt(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValidationError("Timestamp must be timezone-aware.", fields={})
    return value.astimezone(timezone.utc).isoformat(timespec="seconds")


# --------------------------------------------------------------------------- sites

@dataclass(frozen=True)
class Site:
    site_id: str
    name: str
    water_body: str
    lat: float | None = None
    lon: float | None = None
    coord_provenance: str | None = None
    origin: str = "user_defined"
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)


def normalize_site(
    name: str,
    water_body: str,
    *,
    lat: float | None = None,
    lon: float | None = None,
    coord_provenance: str | None = None,
    site_id: str = "",
    origin: str = "user_defined",
    created_at: datetime | None = None,
) -> Site:
    """Validate and normalize a user-defined site. Coordinates optional but paired.

    A site with no coordinates creates no map marker; provenance is required when
    coordinates are entered so they stay labeled user-entered.
    """
    clean_name = name.strip()
    _require(bool(clean_name), "Site name is required.", field="name")
    _require(water_body in WATER_BODIES,
             f"Water body must be one of: {', '.join(WATER_BODIES)}.", field="water_body")

    has_lat = lat is not None
    has_lon = lon is not None
    _require(has_lat == has_lon,
             "Enter both latitude and longitude, or neither.",
             field="coordinates")
    if has_lat:
        _require(isinstance(lat, (int, float)) and not isinstance(lat, bool)
                 and math.isfinite(lat) and -90.0 <= lat <= 90.0,
                 "Latitude must be a finite number in [-90, 90].", field="lat")
        _require(isinstance(lon, (int, float)) and not isinstance(lon, bool)
                 and math.isfinite(lon) and -180.0 <= lon <= 180.0,
                 "Longitude must be a finite number in [-180, 180].", field="lon")
        _require(not _blank(coord_provenance),
                 "Enter how these coordinates were obtained (user-entered source).",
                 field="coord_provenance")
    return Site(
        site_id=site_id,
        name=clean_name,
        water_body=water_body,
        lat=float(lat) if has_lat else None,
        lon=float(lon) if has_lon else None,
        coord_provenance=coord_provenance.strip() if coord_provenance else None,
        origin=origin,
        created_at=created_at or _now(),
        updated_at=created_at or _now(),
    )


# --------------------------------------------------------------------------- visits

@dataclass(frozen=True)
class Visit:
    visit_id: str
    site_id: str | None
    observed_at: datetime | None
    notes: str
    state: str
    observer_code: str | None = None
    follow_up_flag: bool = False
    follow_up_note: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


def build_visit(
    *,
    site_id: str | None = None,
    observed_at: datetime | str | None = None,
    notes: str = "",
    state: str = "recorded",
    observer_code: str | None = None,
    follow_up_flag: bool = False,
    follow_up_note: str | None = None,
    reviewed_at: datetime | str | None = None,
    visit_id: str = "",
    created_at: datetime | None = None,
) -> Visit:
    _require(state in VISIT_STATES, f"Visit state must be one of: {', '.join(VISIT_STATES)}.",
             field="state")
    observed = _as_datetime(observed_at, "observed_at")
    review = _as_datetime(reviewed_at, "reviewed_at")
    if observed is not None:
        observed = observed.astimezone(timezone.utc)
    if review is not None:
        review = review.astimezone(timezone.utc)

    if state == "recorded":
        _require(not _blank(site_id), "A recorded visit needs a site.", field="site_id")
        _require(observed is not None,
                 "A recorded visit needs an observation time with timezone.",
                 field="observed_at")
        _require(not _blank(notes), "Enter what you observed (nonblank notes).", field="notes")
    else:  # draft: explicitly saved work in progress; needs at least one piece of context
        _require(bool(site_id or observed is not None or notes.strip()),
                 "Save a draft only when it has some entered context.",
                 field="state")

    return Visit(
        visit_id=visit_id,
        site_id=site_id,
        observed_at=observed,
        notes=notes,
        state=state,
        observer_code=observer_code.strip() if observer_code else None,
        follow_up_flag=bool(follow_up_flag),
        follow_up_note=follow_up_note.strip() if follow_up_note else None,
        reviewed_at=review,
        created_at=created_at or _now(),
        updated_at=created_at or _now(),
    )


def _as_datetime(value: datetime | str | None, field_name: str) -> datetime | None:
    if value is None or value == "":
        return None
    parsed = value if isinstance(value, datetime) else parse_iso_dt(value)
    if parsed.tzinfo is None:
        raise ValidationError(
            f"{field_name} must include an explicit timezone.",
            fields={field_name: "Time must include a timezone."})
    return parsed


# ----------------------------------------------------------------------- readings

@dataclass(frozen=True)
class Measurement:
    measurement_id: str
    visit_id: str
    parameter_code: str
    value: float | None  # None means not measured; never zero-padded
    unit_code: str | None
    method_code: str | None
    instrument_ref: str | None
    note: str | None = None
    created_at: datetime | None = None


def build_measurement(
    *,
    visit_id: str,
    parameter_code: str,
    value: float | None,
    unit_code: str | None = None,
    method_code: str | None = None,
    instrument_ref: str | None = None,
    note: str | None = None,
    measurement_id: str = "",
    created_at: datetime | None = None,
) -> Measurement:
    _require(parameter_code in PARAMETERS,
             f"Parameter must be one of: {', '.join(PARAMETERS)}.", field="parameter_code")
    if value is not None:
        _require(isinstance(value, (int, float)) and not isinstance(value, bool)
                 and math.isfinite(value),
                 "Enter a finite numeric value (or leave it not-measured).",
                 field="value")
    if unit_code is not None:
        allowed = UNITS_BY_PARAMETER.get(parameter_code, ())
        _require(unit_code in allowed,
                 f"Unit for {parameter_code} must be one of: {', '.join(allowed)} or left undeclared.",
                 field="unit_code")
    method = trim_reference(method_code)
    instrument = trim_reference(instrument_ref)
    return Measurement(
        measurement_id=measurement_id,
        visit_id=visit_id,
        parameter_code=parameter_code,
        value=float(value) if value is not None else None,
        unit_code=unit_code,
        method_code=method,
        instrument_ref=instrument,
        note=note.strip() if note else None,
        created_at=created_at or _now(),
    )


# ----------------------------------------------------------------------- samples

@dataclass(frozen=True)
class SampleReference:
    sample_ref_id: str
    visit_id: str
    sample_id: str
    collected_at: datetime | None
    status: str
    created_at: datetime | None = None


def build_sample(
    *,
    visit_id: str,
    sample_id: str,
    collected_at: datetime | str | None = None,
    status: str = "unknown",
    sample_ref_id: str = "",
    created_at: datetime | None = None,
) -> SampleReference:
    clean_id = sample_id.strip()
    _require(bool(clean_id), "Sample ID is required.", field="sample_id")
    _require(status in SAMPLE_STATUSES,
             f"Sample status must be one of: {', '.join(SAMPLE_STATUSES)}.", field="status")
    collected = _as_datetime(collected_at, "collected_at")
    if collected is not None:
        collected = collected.astimezone(timezone.utc)
    return SampleReference(
        sample_ref_id=sample_ref_id,
        visit_id=visit_id,
        sample_id=clean_id,
        collected_at=collected,
        status=status,
        created_at=created_at or _now(),
    )