"""/api/genie — discover the reference Genie space + proxy questions to it.

- GET /api/genie         → resolved space info (id, title, discovered).
- POST /api/genie/ask    → start a Genie conversation, poll until done, return
                            the assistant's text + any SQL/result the model
                            attached. This is what the Ask Genie chat panel
                            calls; without it the UI falls back to mock data.

If GENIE_SPACE_ID is set in workspace config, use it directly. Otherwise hit
the Databricks Genie REST API and search by GENIE_TITLE (defaults to
"Command Center reference"). Cached in-process after first successful lookup.
"""
from __future__ import annotations

import os
import time
from typing import Any, Optional

import requests
from fastapi import APIRouter, Request
from pydantic import BaseModel

from lib.config import get_settings
from lib.deps import workspace_client

router = APIRouter(prefix="/api/genie", tags=["genie"])


def _workspace_host() -> str:
    """Databricks Apps injects DATABRICKS_HOST into the runtime."""
    host = os.getenv("DATABRICKS_HOST", "").rstrip("/")
    if host and not host.startswith("http"):
        host = "https://" + host
    return host


class GenieInfo(BaseModel):
    space_id: str
    title: str
    discovered: bool
    error: str | None = None


class AskRequest(BaseModel):
    question: str
    conversation_id: str | None = None  # if set, continues an existing conversation


class AskResponse(BaseModel):
    text: str
    sql: str | None = None
    space_id: str
    conversation_id: str | None = None
    error: str | None = None


_cache: Optional[GenieInfo] = None


def _discover() -> GenieInfo:
    s = get_settings()
    title = os.getenv("GENIE_TITLE", "Command Center reference")
    if s.genie_space_id:
        return GenieInfo(space_id=s.genie_space_id, title=title, discovered=False)
    try:
        w = workspace_client()
        resp = w.api_client.do("GET", "/api/2.0/genie/spaces")
        for sp in (resp or {}).get("spaces", []):
            if sp.get("title") == title:
                return GenieInfo(space_id=sp.get("space_id", ""), title=title, discovered=True)
        return GenieInfo(space_id="", title=title, discovered=False, error="no matching space")
    except Exception as e:
        return GenieInfo(space_id="", title=title, discovered=False, error=f"{type(e).__name__}: {str(e)[:200]}")


@router.get("", response_model=GenieInfo)
def info() -> GenieInfo:
    global _cache
    if _cache and _cache.space_id:
        return _cache
    _cache = _discover()
    return _cache


def _extract_answer(msg: dict[str, Any]) -> tuple[str, str | None]:
    """Pull the assistant's text + first SQL query (if any) from a Genie message."""
    text_parts: list[str] = []
    sql: str | None = None
    for att in msg.get("attachments") or []:
        if "text" in att and att["text"].get("content"):
            text_parts.append(att["text"]["content"])
        if sql is None and "query" in att:
            q = att["query"]
            if q.get("query"):
                sql = q["query"]
            desc = q.get("description")
            if desc:
                text_parts.append(desc)
    if not text_parts and msg.get("content"):
        text_parts.append(str(msg["content"]))
    return ("\n\n".join(p for p in text_parts if p).strip() or "(no answer returned)"), sql


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest, request: Request) -> AskResponse:
    """Run a Genie question on behalf of the logged-in user.

    Databricks Apps forwards the user's identity via `X-Forwarded-Access-Token`.
    Genie spaces are typically user-permissioned (not SP-permissioned), so the
    App's SP would 403 on `start-conversation` while any workspace user with
    CAN_VIEW on the space succeeds. We use the user's token directly.
    """
    g = info()
    if not g.space_id:
        return AskResponse(text="", space_id="", error=g.error or "no Genie space resolved")

    user_token = request.headers.get("x-forwarded-access-token")
    host = _workspace_host()
    if not user_token or not host:
        return AskResponse(
            text="",
            space_id=g.space_id,
            error=f"missing OBO context (token={bool(user_token)}, host={bool(host)})",
        )

    headers = {"Authorization": f"Bearer {user_token}"}
    try:
        # First turn → start a new conversation. Follow-up turns → add a
        # message to the existing conversation so Genie sees prior context.
        if req.conversation_id:
            r = requests.post(
                f"{host}/api/2.0/genie/spaces/{g.space_id}/conversations/{req.conversation_id}/messages",
                json={"content": req.question},
                headers=headers,
                timeout=20,
            )
            conv_id = req.conversation_id
        else:
            r = requests.post(
                f"{host}/api/2.0/genie/spaces/{g.space_id}/start-conversation",
                json={"content": req.question},
                headers=headers,
                timeout=20,
            )
            conv_id = None  # filled in below from response

        if r.status_code >= 400:
            return AskResponse(text="", space_id=g.space_id, conversation_id=conv_id, error=f"send {r.status_code}: {r.text[:300]}")
        start = r.json()
        if conv_id is None:
            conv_id = start.get("conversation_id") or (start.get("conversation") or {}).get("id")
        msg_id = start.get("message_id") or (start.get("message") or {}).get("id") or start.get("id")
        if not conv_id or not msg_id:
            return AskResponse(text="", space_id=g.space_id, conversation_id=conv_id, error=f"send returned no ids: {start}")

        deadline = time.time() + 45
        last: dict[str, Any] = {}
        while time.time() < deadline:
            mr = requests.get(
                f"{host}/api/2.0/genie/spaces/{g.space_id}/conversations/{conv_id}/messages/{msg_id}",
                headers=headers,
                timeout=15,
            )
            if mr.status_code >= 400:
                return AskResponse(text="", space_id=g.space_id, conversation_id=conv_id, error=f"get-message {mr.status_code}: {mr.text[:200]}")
            last = mr.json()
            status = (last.get("status") or "").upper()
            if status in ("COMPLETED", "FAILED", "CANCELLED"):
                break
            time.sleep(1.0)

        if (last.get("status") or "").upper() != "COMPLETED":
            return AskResponse(
                text="",
                space_id=g.space_id,
                conversation_id=conv_id,
                error=f"status={last.get('status')} error={last.get('error')}",
            )

        text, sql = _extract_answer(last)
        return AskResponse(text=text, sql=sql, space_id=g.space_id, conversation_id=conv_id)
    except Exception as e:
        return AskResponse(text="", space_id=g.space_id, conversation_id=req.conversation_id, error=f"{type(e).__name__}: {str(e)[:300]}")
