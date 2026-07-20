"""/api/writes — Lakebase write-back endpoints.

Three tables (created by the setup job's 02_init_lakebase notebook):
- purchase_orders_released
- review_replies
- schedules_approved

Each endpoint inserts a row and returns the new event_id. The App's SP
authenticates to Lakebase via per-pool OAuth token (see lib/deps.py).
"""
from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from lib.deps import get_lakebase_pool, reset_lakebase_pool

router = APIRouter(prefix="/api/writes", tags=["writes"])


def _actor(request: Request) -> str:
    """Best-effort actor identity. Databricks Apps inject X-Forwarded-Email /
    X-Forwarded-User for OBO requests; fall back to the App's SP name."""
    h = request.headers
    return (
        h.get("x-forwarded-email")
        or h.get("x-forwarded-user")
        or h.get("x-databricks-user-name")
        or "app-sp"
    )


async def _insert(sql: str, params: tuple) -> int:
    try:
        pool = await get_lakebase_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(sql, *params)
            return int(row["event_id"]) if row else 0
    except Exception as e:
        # Token rotates ~1h; drop the pool so the next call mints a fresh one.
        await reset_lakebase_pool()
        raise HTTPException(status_code=502, detail=f"Lakebase write failed: {type(e).__name__}: {str(e)[:200]}")


class ReleasePORequest(BaseModel):
    po_id: str
    store_id: str | None = None
    total_amount: float | None = None


class ReplyReviewRequest(BaseModel):
    feedback_id: str
    store_id: str | None = None
    reply_text: str


class ApproveScheduleRequest(BaseModel):
    schedule_date: str  # YYYY-MM-DD
    store_id: str | None = None
    total_hours: float | None = None


class WriteResult(BaseModel):
    event_id: int
    actor: str


@router.post("/purchase-orders/release", response_model=WriteResult)
async def release_po(body: ReleasePORequest, request: Request) -> WriteResult:
    actor = _actor(request)
    event_id = await _insert(
        """
        INSERT INTO purchase_orders_released
          (po_id, store_id, total_amount, released_by)
        VALUES ($1, $2, $3, $4)
        RETURNING event_id
        """,
        (body.po_id, body.store_id, body.total_amount, actor),
    )
    return WriteResult(event_id=event_id, actor=actor)


@router.post("/reviews/reply", response_model=WriteResult)
async def reply_review(body: ReplyReviewRequest, request: Request) -> WriteResult:
    actor = _actor(request)
    event_id = await _insert(
        """
        INSERT INTO review_replies
          (feedback_id, store_id, reply_text, replied_by)
        VALUES ($1, $2, $3, $4)
        RETURNING event_id
        """,
        (body.feedback_id, body.store_id, body.reply_text, actor),
    )
    return WriteResult(event_id=event_id, actor=actor)


@router.post("/schedules/approve", response_model=WriteResult)
async def approve_schedule(body: ApproveScheduleRequest, request: Request) -> WriteResult:
    actor = _actor(request)
    try:
        sched_date = datetime.strptime(body.schedule_date, "%Y-%m-%d").date()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"schedule_date must be YYYY-MM-DD: {e}")
    event_id = await _insert(
        """
        INSERT INTO schedules_approved
          (schedule_date, store_id, total_hours, approved_by)
        VALUES ($1, $2, $3, $4)
        RETURNING event_id
        """,
        (sched_date, body.store_id, body.total_hours, actor),
    )
    return WriteResult(event_id=event_id, actor=actor)
