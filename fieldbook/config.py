"""Workspace/class and path configuration for the Fieldbook service.

Physical isolation: working/fieldbook.sqlite3 and demo/fieldbook.sqlite3 are
separate files and the database itself records its immutable workspace class.
Opening a database under the wrong class must fail closed (Store enforces it).
"""
from __future__ import annotations

import os
from pathlib import Path

WORKSPACE_CLASSES: tuple[str, ...] = ("working", "demo")
SCHEMA_VERSION = 1
ENV_DATA_DIR = "FIELDBOOK_DATA_DIR"
DEFAULT_DATA_DIR = "fieldbook-data"


def resolve_data_dir(*, env: str = ENV_DATA_DIR) -> Path:
    """Resolve the local data directory (env override, else repo-relative)."""
    root = Path(__file__).resolve().parent.parent
    override = os.environ.get(env, "").strip()
    if override:
        return Path(override).expanduser().resolve()
    return (root / DEFAULT_DATA_DIR).resolve()


def db_path(data_dir: Path, workspace_class: str) -> Path:
    """Path of the physically separate database for one workspace class."""
    _require_class(workspace_class)
    return data_dir / workspace_class / "fieldbook.sqlite3"


def _require_class(workspace_class: str) -> None:
    if workspace_class not in WORKSPACE_CLASSES:
        raise ValueError(f"Unknown workspace class: {workspace_class!r}")