"""/api/inventory — stock-health + watched-items for the Inventory module."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from lib.config import get_settings
from lib.sql_utils import fetch_all, fetch_one

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


class StockHealth(BaseModel):
    total_skus: int
    at_par: int
    below_par: int
    pct_at_par: float


class CategoryFill(BaseModel):
    category: str
    sku_count: int
    below_par: int
    pct_at_par: float


class WatchedItem(BaseModel):
    sku: str
    item_name: str
    category: str
    on_hand_eod: int
    reorder_point: int
    days_of_cover: float | None
    vendor_name: str | None = None
    lead_time_days: int | None = None


class POLine(BaseModel):
    sku: str
    item_name: str
    on_hand_eod: int
    reorder_point: int
    qty: int
    unit_cost: float
    line_total: float
    usage_trend: str | None = None


class PurchaseOrder(BaseModel):
    po_id: str
    vendor_name: str
    vendor_category: str
    eta: str
    status: str
    total_amount: float
    lines: list[POLine]


@router.get("/health", response_model=StockHealth)
def health(store_id: str = "S001") -> StockHealth:
    s = get_settings()
    cat, sch = s.catalog, s.schema_name
    row = fetch_one(
        f"""
        WITH latest AS (
          SELECT * FROM {cat}.{sch}.facts_sales_inventory_daily
          WHERE store_id = :store_id
            AND date = (SELECT MAX(date) FROM {cat}.{sch}.facts_sales_inventory_daily)
        )
        SELECT
          COUNT(*) AS total_skus,
          SUM(CASE WHEN on_hand_eod >= reorder_point THEN 1 ELSE 0 END) AS at_par,
          SUM(CASE WHEN on_hand_eod < reorder_point THEN 1 ELSE 0 END) AS below_par
        FROM latest
        """,
        {"store_id": store_id},
    ) or {}
    total = int(row.get("total_skus") or 0)
    at_par = int(row.get("at_par") or 0)
    return StockHealth(
        total_skus=total,
        at_par=at_par,
        below_par=int(row.get("below_par") or 0),
        pct_at_par=round(at_par / total * 100, 1) if total > 0 else 0.0,
    )


@router.get("/by-category", response_model=list[CategoryFill])
def by_category(store_id: str = "S001") -> list[CategoryFill]:
    s = get_settings()
    cat, sch = s.catalog, s.schema_name
    rows = fetch_all(
        f"""
        WITH latest AS (
          SELECT * FROM {cat}.{sch}.facts_sales_inventory_daily
          WHERE store_id = :store_id
            AND date = (SELECT MAX(date) FROM {cat}.{sch}.facts_sales_inventory_daily)
        )
        SELECT i.category,
               COUNT(*) AS sku_count,
               SUM(CASE WHEN l.on_hand_eod < l.reorder_point THEN 1 ELSE 0 END) AS below_par,
               SUM(CASE WHEN l.on_hand_eod >= l.reorder_point THEN 1 ELSE 0 END) AS at_par
        FROM latest l
        JOIN {cat}.{sch}.dims_items i USING (sku)
        GROUP BY i.category
        ORDER BY i.category
        """,
        {"store_id": store_id},
    )
    out = []
    for r in rows:
        total = int(r["sku_count"])
        at_par = int(r["at_par"] or 0)
        out.append(
            CategoryFill(
                category=r["category"],
                sku_count=total,
                below_par=int(r["below_par"] or 0),
                pct_at_par=round(at_par / total * 100, 1) if total > 0 else 0.0,
            )
        )
    return out


@router.get("/watched", response_model=list[WatchedItem])
def watched(store_id: str = "S001", limit: int = 6) -> list[WatchedItem]:
    s = get_settings()
    cat, sch = s.catalog, s.schema_name
    rows = fetch_all(
        f"""
        WITH latest AS (
          SELECT * FROM {cat}.{sch}.facts_sales_inventory_daily
          WHERE store_id = :store_id
            AND date = (SELECT MAX(date) FROM {cat}.{sch}.facts_sales_inventory_daily)
        ),
        usage AS (
          SELECT sku, store_id, AVG(units_sold) AS avg_daily_units
          FROM {cat}.{sch}.facts_sales_inventory_daily
          WHERE store_id = :store_id
            AND date >= date_sub((SELECT MAX(date) FROM {cat}.{sch}.facts_sales_inventory_daily), 7)
          GROUP BY sku, store_id
        ),
        po_vendor AS (
          SELECT sku, vendor_name, lead_time_days,
                 row_number() OVER (PARTITION BY sku ORDER BY created_at DESC) AS rn
          FROM {cat}.{sch}.facts_purchase_orders
        )
        SELECT l.sku, i.item_name, i.category,
               l.on_hand_eod, l.reorder_point,
               CASE WHEN u.avg_daily_units > 0 THEN ROUND(l.on_hand_eod / u.avg_daily_units, 1) END AS days_of_cover,
               pv.vendor_name, pv.lead_time_days
        FROM latest l
        JOIN {cat}.{sch}.dims_items i USING (sku)
        LEFT JOIN usage u ON u.sku = l.sku AND u.store_id = l.store_id
        LEFT JOIN po_vendor pv ON pv.sku = l.sku AND pv.rn = 1
        WHERE l.on_hand_eod < l.reorder_point
        ORDER BY days_of_cover ASC NULLS LAST
        LIMIT {limit}
        """,
        {"store_id": store_id},
    )
    return [WatchedItem(**r) for r in rows]


@router.get("/purchase-orders", response_model=list[PurchaseOrder])
def purchase_orders(store_id: str = "S001") -> list[PurchaseOrder]:
    s = get_settings()
    cat, sch = s.catalog, s.schema_name
    rows = fetch_all(
        f"""
        SELECT po.po_id, po.vendor_name, po.vendor_category,
               cast(po.eta AS string) AS eta, po.status,
               po.sku, i.item_name,
               po.on_hand_at_creation AS on_hand_eod, po.par AS reorder_point,
               po.qty, po.unit_cost, po.line_total, po.usage_trend
        FROM {cat}.{sch}.facts_purchase_orders po
        JOIN {cat}.{sch}.dims_items i USING (sku)
        WHERE po.store_id = :store_id
        ORDER BY po.po_id, po.line_total DESC
        """,
        {"store_id": store_id},
    )
    by_po: dict[str, PurchaseOrder] = {}
    for r in rows:
        po_id = r["po_id"]
        if po_id not in by_po:
            by_po[po_id] = PurchaseOrder(
                po_id=po_id,
                vendor_name=r["vendor_name"] or "",
                vendor_category=r["vendor_category"] or "",
                eta=r["eta"] or "",
                status=r["status"] or "",
                total_amount=0.0,
                lines=[],
            )
        po = by_po[po_id]
        line = POLine(
            sku=r["sku"], item_name=r["item_name"],
            on_hand_eod=int(r["on_hand_eod"] or 0),
            reorder_point=int(r["reorder_point"] or 0),
            qty=int(r["qty"] or 0),
            unit_cost=float(r["unit_cost"] or 0),
            line_total=float(r["line_total"] or 0),
            usage_trend=r.get("usage_trend"),
        )
        po.lines.append(line)
        po.total_amount += line.line_total
    return list(by_po.values())
