"""Run the Watershed Fieldbook local API service.

Localhost only by default: the prototype has no accounts, no shared cloud
workspace and never submits anything to an agency. Start with:

    ./venv/bin/python -m fieldbook.server

Override the port or data directory with FIELDBOOK_PORT / FIELDBOOK_DATA_DIR.
"""
from __future__ import annotations

import os

import uvicorn

HOST = "127.0.0.1"
DEFAULT_PORT = 8765


def main() -> None:
    port = int(os.environ.get("FIELDBOOK_PORT", DEFAULT_PORT))
    uvicorn.run("fieldbook.api:app", host=HOST, port=port, reload=False)


if __name__ == "__main__":
    main()
