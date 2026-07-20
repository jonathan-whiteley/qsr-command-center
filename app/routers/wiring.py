"""/api/wiring — connectivity probe for the published App.

Reads small counts from each workshop table to confirm the App's service
principal can see the data. Returns the Genie space ID + FMAPI endpoint the
App is currently configured to use, so the UI banner can prove that the
"reference build" is actually wired to live infrastructure.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from lib.config import get_settings
from lib.sql_utils import fetch_one
from routers.genie import info as genie_info

router = APIRouter(prefix="/api/wiring", tags=["wiring"])


class TableCounts(BaseModel):
    dims_stores: int = 0
    dims_items: int = 0
    dims_employees: int = 0
    facts_sales_daypart: int = 0
    facts_labor_daypart: int = 0
    facts_sales_inventory_daily: int = 0
    facts_purchase_orders: int = 0
    facts_customer_feedback: int = 0


class WiringStatus(BaseModel):
    connected: bool
    catalog: str
    schema_name: str
    warehouse_id: str
    lakebase_instance: str
    genie_space_id: str
    genie_space_title: str
    fmapi_endpoint: str
    anchor_date: str
    config_source: str
    table_counts: TableCounts
    error: str | None = None


@router.get("", response_model=WiringStatus)
def status() -> WiringStatus:
    s = get_settings()
    counts = TableCounts()
    err: str | None = None
    if s.warehouse_id:
        try:
            for tbl in counts.model_fields.keys():
                row = fetch_one(f"SELECT COUNT(*) AS n FROM {s.catalog}.{s.schema_name}.{tbl}")
                if row and row.get("n") is not None:
                    setattr(counts, tbl, int(row["n"]))
        except Exception as e:
            err = f"{type(e).__name__}: {str(e)[:200]}"
    else:
        err = "DATABRICKS_WAREHOUSE_ID not set"

    any_rows = any(getattr(counts, f) > 0 for f in counts.model_fields)
    # Resolve Genie space — env var wins, else self-discover by title.
    g = genie_info()
    return WiringStatus(
        connected=any_rows and err is None,
        catalog=s.catalog,
        schema_name=s.schema_name,
        warehouse_id=s.warehouse_id,
        lakebase_instance=s.lakebase_instance,
        genie_space_id=g.space_id or s.genie_space_id,
        genie_space_title=g.title,
        fmapi_endpoint=s.fmapi_endpoint,
        anchor_date=s.anchor_date,
        config_source=s.config_source,
        table_counts=counts,
        error=err,
    )
