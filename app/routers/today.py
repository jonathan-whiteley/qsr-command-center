"""/api/today — headline KPIs the Today screen renders.

Anchored to ANCHOR_DATE and scoped to a single store (default S001) so the
numbers map to the single-store Command Center design. Pass ?store_id=S0NN to
switch stores. All queries cached 24h via sql_utils.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from lib.config import get_settings
from lib.sql_utils import fetch_all, fetch_one

router = APIRouter(prefix="/api/today", tags=["today"])


class KPI(BaseModel):
    label: str
    value: float | None
    sub: str | None = None
    delta_pct: float | None = None
    spark: list[float] = []


class TodayKpis(BaseModel):
    anchor_date: str
    store_id: str
    sales_yesterday: KPI
    forecast_today: KPI
    labor_pct: KPI
    guest_score: KPI
    guests: KPI


def _sparkline(anchor: str, store_id: str, days: int = 12) -> list[float]:
    rows = fetch_all(
        f"""
        SELECT date, SUM(revenue) AS rev
        FROM jdub_demo.vibe_workshop.facts_sales_daypart
        WHERE store_id = :store_id
          AND date BETWEEN date_sub(to_date(:anchor), {days}) AND date_sub(to_date(:anchor), 1)
        GROUP BY date
        ORDER BY date
        """,
        {"anchor": anchor, "store_id": store_id},
    )
    return [float(r["rev"] or 0) for r in rows]


@router.get("/kpis", response_model=TodayKpis)
def kpis(store_id: str = "S001") -> TodayKpis:
    s = get_settings()
    anchor = s.anchor_date
    cat, sch = s.catalog, s.schema_name
    params = {"anchor": anchor, "store_id": store_id}

    sales_row = fetch_one(
        f"""
        WITH a AS (SELECT to_date(:anchor) AS d)
        SELECT
          (SELECT SUM(revenue) FROM {cat}.{sch}.facts_sales_daypart WHERE store_id = :store_id AND date = (SELECT d FROM a) - 1) AS yesterday,
          (SELECT SUM(revenue) FROM {cat}.{sch}.facts_sales_daypart WHERE store_id = :store_id AND date = (SELECT d FROM a) - 8) AS last_week
        """,
        params,
    ) or {}

    fcast_row = fetch_one(
        f"""
        SELECT SUM(forecast_revenue) AS fcast
        FROM {cat}.{sch}.facts_sales_daypart
        WHERE store_id = :store_id AND date = to_date(:anchor)
        """,
        params,
    ) or {}

    labor_row = fetch_one(
        f"""
        WITH a AS (SELECT to_date(:anchor) AS d),
        s AS (SELECT SUM(revenue) AS rev FROM {cat}.{sch}.facts_sales_daypart WHERE store_id = :store_id AND date = (SELECT d FROM a)),
        l AS (SELECT SUM(labor_cost) AS cost FROM {cat}.{sch}.facts_labor_daypart WHERE store_id = :store_id AND date = (SELECT d FROM a))
        SELECT ROUND(l.cost / NULLIF(s.rev, 0) * 100, 1) AS labor_pct
        FROM s, l
        """,
        params,
    ) or {}

    # Guest score comes from location_sentiment (portfolio-wide; this table has no
    # workshop store_id or NPS, so we report the trailing-30d avg rating + review count).
    scfg = get_settings()
    guest_row = fetch_one(
        f"""
        SELECT ROUND(AVG(rating), 2) AS avg_rating,
               COUNT(*) AS review_count
        FROM {scfg.sentiment_catalog}.{scfg.sentiment_schema}.location_sentiment
        WHERE to_date(date) >= date_sub(to_date(:anchor), 30) AND to_date(date) <= to_date(:anchor)
        """,
        params,
    ) or {}

    traffic_row = fetch_one(
        f"""
        WITH a AS (SELECT to_date(:anchor) AS d)
        SELECT
          (SELECT SUM(traffic) FROM {cat}.{sch}.facts_sales_daypart WHERE store_id = :store_id AND date = (SELECT d FROM a)) AS today,
          (SELECT SUM(traffic) FROM {cat}.{sch}.facts_sales_daypart WHERE store_id = :store_id AND date = (SELECT d FROM a) - 7) AS last_week
        """,
        params,
    ) or {}

    def _delta_pct(cur, prev):
        if cur is None or prev is None or float(prev) == 0:
            return None
        return round((float(cur) - float(prev)) / float(prev) * 100, 1)

    spark = _sparkline(anchor, store_id)
    yest = sales_row.get("yesterday")
    last = sales_row.get("last_week")

    return TodayKpis(
        anchor_date=anchor,
        store_id=store_id,
        sales_yesterday=KPI(
            label="Sales yesterday",
            value=float(yest) if yest is not None else None,
            delta_pct=_delta_pct(yest, last),
            spark=spark,
        ),
        forecast_today=KPI(
            label="Forecast today",
            value=float(fcast_row.get("fcast") or 0),
            sub="company forecast",
        ),
        labor_pct=KPI(
            label="Labor % of sales",
            value=float(labor_row.get("labor_pct") or 0),
        ),
        guest_score=KPI(
            label="Guest score",
            value=float(guest_row.get("avg_rating") or 0),
            sub=f"{int(guest_row['review_count'])} reviews · 30d" if guest_row.get("review_count") is not None else None,
        ),
        guests=KPI(
            label="Guests",
            value=float(traffic_row.get("today") or 0),
            delta_pct=_delta_pct(traffic_row.get("today"), traffic_row.get("last_week")),
        ),
    )
