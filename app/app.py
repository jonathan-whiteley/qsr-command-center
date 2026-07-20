"""QSR Command Center app.

FastAPI entry that:
- Serves the Command Center UI as static files (default doc: Home.html)
- Mounts `/api/wiring` so the UI can show a live connectivity banner
- Mounts the module routers (Guest Sentiment, Today, Labor, Inventory, Genie, ...)

A repeatable QSR-brand operational command center over governed Lakehouse data.
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from routers import feedback, genie, inventory, labor, today, wiring, writes

STATIC_DIR = Path(__file__).parent / "static"
DEFAULT_DOC = os.environ.get("DEFAULT_DOC", "Home.html")

app = FastAPI(title="QSR Command Center")

app.include_router(wiring.router)
app.include_router(today.router)
app.include_router(labor.router)
app.include_router(inventory.router)
app.include_router(feedback.router)
app.include_router(genie.router)
app.include_router(writes.router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "command-center"}


@app.get("/")
def root():
    return RedirectResponse(url=f"/{DEFAULT_DOC}")


# Mount the prototype directory as static last so it doesn't shadow /api/*.
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
