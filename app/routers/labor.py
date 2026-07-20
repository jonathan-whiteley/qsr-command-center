"""/api/labor — daypart planner data for the Labor module."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from lib.config import get_settings
from lib.sql_utils import fetch_all

router = APIRouter(prefix="/api/labor", tags=["labor"])


class DaypartCard(BaseModel):
    daypart: str
    hour_start: int
    hour_end: int
    forecast_revenue: float
    forecast_traffic: int
    headcount: dict[str, int]
    forecast_labor_cost: float


class TomorrowPlan(BaseModel):
    anchor_date: str
    cards: list[DaypartCard]
    total_forecast_revenue: float
    total_forecast_labor_cost: float
    labor_pct: float


@router.get("/tomorrow", response_model=TomorrowPlan)
def tomorrow(store_id: str = "S001") -> TomorrowPlan:
    s = get_settings()
    cat, sch = s.catalog, s.schema_name
    anchor = s.anchor_date

    # Forecast: use latest available date in the table as "tomorrow", scoped to a single store.
    sales_rows = fetch_all(
        f"""
        SELECT daypart, hour_start, hour_end,
               SUM(forecast_revenue) AS revenue,
               SUM(forecast_traffic) AS traffic
        FROM {cat}.{sch}.facts_sales_daypart
        WHERE date = to_date(:anchor) AND store_id = :store_id
        GROUP BY daypart, hour_start, hour_end
        ORDER BY hour_start
        """,
        {"anchor": anchor, "store_id": store_id},
    )

    labor_rows = fetch_all(
        f"""
        SELECT daypart, role,
               SUM(forecast_headcount) AS hc,
               SUM(forecast_labor_cost) AS cost
        FROM {cat}.{sch}.facts_labor_daypart
        WHERE date = to_date(:anchor) AND store_id = :store_id
        GROUP BY daypart, role
        """,
        {"anchor": anchor, "store_id": store_id},
    )

    by_dp: dict[str, dict[str, int]] = {}
    cost_by_dp: dict[str, float] = {}
    for r in labor_rows:
        by_dp.setdefault(r["daypart"], {})[r["role"]] = int(r["hc"] or 0)
        cost_by_dp[r["daypart"]] = cost_by_dp.get(r["daypart"], 0) + float(r["cost"] or 0)

    cards = []
    for s_row in sales_rows:
        dp = s_row["daypart"]
        cards.append(
            DaypartCard(
                daypart=dp,
                hour_start=int(s_row["hour_start"]),
                hour_end=int(s_row["hour_end"]),
                forecast_revenue=float(s_row["revenue"] or 0),
                forecast_traffic=int(s_row["traffic"] or 0),
                headcount=by_dp.get(dp, {}),
                forecast_labor_cost=float(cost_by_dp.get(dp, 0)),
            )
        )

    total_rev = sum(c.forecast_revenue for c in cards)
    total_cost = sum(c.forecast_labor_cost for c in cards)
    labor_pct = round(total_cost / total_rev * 100, 1) if total_rev > 0 else 0.0

    return TomorrowPlan(
        anchor_date=anchor,
        cards=cards,
        total_forecast_revenue=total_rev,
        total_forecast_labor_cost=total_cost,
        labor_pct=labor_pct,
    )
