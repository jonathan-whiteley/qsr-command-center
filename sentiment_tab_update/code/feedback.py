"""/api/feedback — all rollups sourced from the reviews-gold table.

Everything here reads {sentiment_catalog}.{sentiment_schema}.{sentiment_table}
(in LCE: ioc_sandbox.ai_strategy.reviews_gold). Two source facts drive `_src()`:

  1. `location_name` is a human "City, ST" string. In LCE the gold notebook adds this
     column via a store-dim join (see sentiment_tab_update/sql/gold_add_location_name.sql)
     so the app needs no dim knowledge — State is the last comma-separated segment.
  2. `classification`, `product`, `product_issues` are NATIVE array/struct-array
     columns. `_src()` re-emits them as JSON strings via to_json(...), so every query
     below reads them exactly as the original demo contract did:
       - `classification` / `product` → JSON array strings '["Pizza","Cheese"]'
         (parsed with from_json(..., 'ARRAY<STRING>')).
       - `product_issues` → JSON array-of-structs string (see _PI_TYPE).
  Also: the five *_rating columns TRY_CAST to DOUBLE; `sentiment` is capitalized
  (Positive / Negative / Mixed / Neutral); `date` spans years so queries bound by date.

`product` is an enum-constrained concept list (Pizza, Crazy Bread, Wings, Cheese,
Sauce, Crust, Pepperoni, Crazy Puffs, Deep Dish, Stuffed Crust), AI-extracted whenever
a product is named anywhere in the review — it replaces the old app-layer keyword map.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from lib.config import get_settings
from lib.sql_utils import fetch_all

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

# SQL expression that extracts a 2-letter-ish state from the location_name tail.
_STATE_EXPR = "trim(element_at(split(location_name, ','), -1))"


def _src() -> str:
    """Source subquery: the reviews-gold table with its native array/struct columns
    re-emitted as JSON strings, so the rest of this file's from_json(...) logic is
    unchanged. `location_name` is passed through as-is (the gold notebook already
    populates it as "City, ST"). All other columns pass through unchanged."""
    s = get_settings()
    tbl = f"{s.sentiment_catalog}.{s.sentiment_schema}.{s.sentiment_table}"
    return f"""(
      SELECT
        * EXCEPT (classification, product, product_issues),
        to_json(classification) AS classification,
        to_json(product)        AS product,
        to_json(product_issues) AS product_issues
      FROM {tbl}
    )"""


def _state_clause(state: str | None) -> str:
    """Return an AND-clause filtering on derived state, or '' for all states.
    state is validated to be short + alnum before interpolation."""
    if not state or state.lower() == "all":
        return ""
    safe = "".join(ch for ch in state if ch.isalnum() or ch == " ")[:20]
    if not safe:
        return ""
    return f" AND {_STATE_EXPR} = '{safe}'"


def _date_clause(days: int | None) -> str:
    """Trailing-window date filter, or '' for all-time. Guest Sentiment has no date
    restriction by default (reviews span 2014→2026); pass days>0 to bound it."""
    if not days or int(days) <= 0:
        return ""
    return f" AND date >= date_sub(current_date(), {int(days)})"


class ThemeRow(BaseModel):
    theme: str
    count_7d: int
    count_30d: int
    pct_negative_7d: float


class SentimentDay(BaseModel):
    date: str
    pos: int
    neu: int
    neg: int


class StoreCategoryRow(BaseModel):
    location_name: str
    speed: float | None = None
    cleanliness: float | None = None
    order_accuracy: float | None = None
    quality: float | None = None
    service: float | None = None
    n: int
    pct_neg: float
    snippet: str | None = None


class Summary(BaseModel):
    avg_rating: float | None = None
    pct_neg: float
    total_reviews: int
    stores: int
    weakest_category: str | None = None
    weakest_avg: float | None = None
    strongest_category: str | None = None
    strongest_avg: float | None = None


class ProductRow(BaseModel):
    product: str
    mentions: int
    pct_neg: float
    pct_pos: float
    snippet: str | None = None


class ThemeSample(BaseModel):
    location_name: str
    rating: int | None = None
    date: str
    text: str


class ThemeCluster(BaseModel):
    product: str
    attr: str
    count: int
    avg: float | None = None
    trend: int  # pct change 7d vs prior 7d (signed)
    keywords: list[str] = []
    samples: list[ThemeSample] = []


class Review(BaseModel):
    location_name: str
    date: str
    rating: int | None = None
    channel: str
    sentiment: str
    categories: list[str] = []
    products: list[str] = []
    comment: str | None = None


@router.get("/states", response_model=list[str])
def states() -> list[str]:
    """Distinct derived states, ordered by review volume, for the filter dropdown."""
    rows = fetch_all(
        f"""
        SELECT {_STATE_EXPR} AS state, COUNT(*) AS n
        FROM {_src()}
        WHERE {_STATE_EXPR} IS NOT NULL AND length({_STATE_EXPR}) BETWEEN 2 AND 20
        GROUP BY {_STATE_EXPR}
        ORDER BY n DESC
        """,
    )
    return [r["state"] for r in rows if r.get("state")]


@router.get("/summary", response_model=Summary)
def summary(days: int | None = None, state: str | None = None) -> Summary:
    """Top-line KPIs: avg rating, % negative, review and store counts, plus
    weakest/strongest category by avg per-category rating."""
    where = f"WHERE 1=1{_date_clause(days)}{_state_clause(state)}"
    row = fetch_all(
        f"""
        SELECT ROUND(AVG(rating), 2) AS avg_rating,
               ROUND(AVG(CASE WHEN sentiment = 'Negative' THEN 1.0 ELSE 0 END) * 100, 0) AS pct_neg,
               COUNT(*) AS total_reviews,
               COUNT(DISTINCT locationId) AS stores,
               AVG(TRY_CAST(speed_rating          AS DOUBLE)) AS speed,
               AVG(TRY_CAST(cleanliness_rating    AS DOUBLE)) AS cleanliness,
               AVG(TRY_CAST(order_accuracy_rating AS DOUBLE)) AS order_accuracy,
               AVG(TRY_CAST(quality_rating        AS DOUBLE)) AS quality,
               AVG(TRY_CAST(service_rating        AS DOUBLE)) AS service
        FROM {_src()}
        {where}
        """,
    )
    r = row[0] if row else {}
    cats = {
        "Speed": r.get("speed"), "Cleanliness": r.get("cleanliness"),
        "Order Accuracy": r.get("order_accuracy"), "Quality": r.get("quality"),
        "Service": r.get("service"),
    }
    present = {k: float(v) for k, v in cats.items() if v is not None}
    weakest = min(present, key=present.get) if present else None
    strongest = max(present, key=present.get) if present else None
    return Summary(
        avg_rating=float(r["avg_rating"]) if r.get("avg_rating") is not None else None,
        pct_neg=float(r.get("pct_neg") or 0),
        total_reviews=int(r.get("total_reviews") or 0),
        stores=int(r.get("stores") or 0),
        weakest_category=weakest,
        weakest_avg=round(present[weakest], 1) if weakest else None,
        strongest_category=strongest,
        strongest_avg=round(present[strongest], 1) if strongest else None,
    )


@router.get("/themes", response_model=list[ThemeRow])
def themes(state: str | None = None) -> list[ThemeRow]:
    """Theme rollups: each review's classification[] JSON-array string is exploded into
    category themes. Anchored to the dataset's latest date so 7d/30d land on data."""
    rows = fetch_all(
        f"""
        WITH a AS (SELECT to_date(:anchor) AS d),
        recent AS (
          SELECT to_date(ls.date) AS rdate, ls.sentiment, theme
          FROM {_src()} ls, a
          LATERAL VIEW explode(from_json(ls.classification, 'ARRAY<STRING>')) t AS theme
          WHERE to_date(ls.date) >= a.d - 30 AND to_date(ls.date) <= a.d{_state_clause(state)}
        )
        SELECT theme,
               SUM(CASE WHEN rdate >= (SELECT d FROM a) - 7 THEN 1 ELSE 0 END) AS count_7d,
               COUNT(*) AS count_30d,
               ROUND(
                 SUM(CASE WHEN rdate >= (SELECT d FROM a) - 7 AND sentiment = 'Negative' THEN 1 ELSE 0 END)
                 / NULLIF(SUM(CASE WHEN rdate >= (SELECT d FROM a) - 7 THEN 1 ELSE 0 END), 0) * 100,
                 1
               ) AS pct_negative_7d
        FROM recent
        GROUP BY theme
        ORDER BY count_30d DESC
        """,
        {"anchor": get_settings().anchor_date},
    )
    return [
        ThemeRow(
            theme=r["theme"], count_7d=int(r["count_7d"] or 0),
            count_30d=int(r["count_30d"] or 0),
            pct_negative_7d=float(r["pct_negative_7d"] or 0),
        )
        for r in rows
    ]


@router.get("/sentiment-timeline", response_model=list[SentimentDay])
def sentiment_timeline(state: str | None = None) -> list[SentimentDay]:
    rows = fetch_all(
        f"""
        SELECT cast(to_date(date) AS string) AS date,
               SUM(CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END) AS pos,
               SUM(CASE WHEN sentiment IN ('Mixed', 'Neutral') THEN 1 ELSE 0 END) AS neu,
               SUM(CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END) AS neg
        FROM {_src()}
        WHERE to_date(date) >= date_sub(to_date(:anchor), 30) AND to_date(date) <= to_date(:anchor){_state_clause(state)}
        GROUP BY to_date(date)
        ORDER BY to_date(date)
        """,
        {"anchor": get_settings().anchor_date},
    )
    return [
        SentimentDay(date=r["date"], pos=int(r["pos"] or 0), neu=int(r["neu"] or 0), neg=int(r["neg"] or 0))
        for r in rows
    ]


@router.get("/products", response_model=list[ProductRow])
def products(days: int | None = None, state: str | None = None) -> list[ProductRow]:
    """Product mentions with sentiment split, from the extracted product[] JSON-array
    string. Each product carries a representative negative snippet for the tooltip."""
    where = f"WHERE 1=1{_date_clause(days)}{_state_clause(state)}"
    rows = fetch_all(
        f"""
        WITH exploded AS (
          SELECT prod AS product, sentiment, comment
          FROM {_src()}
          LATERAL VIEW explode(from_json(product, 'ARRAY<STRING>')) t AS prod
          {where}
        ),
        agg AS (
          SELECT product,
                 COUNT(*) AS mentions,
                 ROUND(AVG(CASE WHEN sentiment = 'Negative' THEN 1.0 ELSE 0 END) * 100, 0) AS pct_neg,
                 ROUND(AVG(CASE WHEN sentiment = 'Positive' THEN 1.0 ELSE 0 END) * 100, 0) AS pct_pos
          FROM exploded GROUP BY product
        ),
        snip AS (
          SELECT product, comment,
                 ROW_NUMBER() OVER (PARTITION BY product ORDER BY length(comment) DESC) AS rn
          FROM exploded
          WHERE sentiment = 'Negative' AND comment IS NOT NULL AND length(comment) > 0
        )
        SELECT a.product, a.mentions, a.pct_neg, a.pct_pos, sn.comment AS snippet
        FROM agg a
        LEFT JOIN snip sn ON sn.product = a.product AND sn.rn = 1
        ORDER BY a.mentions DESC
        """,
    )
    return [
        ProductRow(
            product=r["product"], mentions=int(r["mentions"] or 0),
            pct_neg=float(r["pct_neg"] or 0), pct_pos=float(r["pct_pos"] or 0),
            snippet=r.get("snippet"),
        )
        for r in rows
    ]


# Highlight keywords per issue (for the frontend to bold the relevant words in a review).
# NOTE: these no longer drive theme detection — the product↔issue pairing now comes from
# the AI-extracted `product_issues` column (see docs/previews/add-product-issues-column.sql).
# They are used ONLY to (a) pick which words to highlight in sample review text and (b)
# fall back to a broad text filter when selecting sample reviews for a cluster.
_ISSUE_KEYWORDS = {
    "Soggy": ["soggy", "mushy", "limp"],
    "Cold": ["cold", "lukewarm", "not hot", "room temp", "stone cold"],
    "Undercooked": ["undercooked", "undercook", "raw dough", "doughy", "not cooked", "underdone", "still raw"],
    "Burnt": ["burnt", "burned", "charred", "overcooked", "overdone"],
    "Greasy": ["greasy", "grease", "oily"],
    "Stale/Dry": ["stale", "dried out", "bone dry", "so dry", "really dry", "tough", "chewy"],
    "Bland": ["bland", "flavorless", "tasteless", "no flavor", "no taste", "flavourless"],
    "Skimpy toppings": ["skimpy", "sparse", "barely any", "light on", "not enough", "hardly any", "few toppings"],
    "Small portion": ["small portion", "tiny", "shrunk", "smaller than", "portion size"],
}

# The struct shape stored in the product_issues JSON column. NOTE: use the space-delimited
# DDL form ("product STRING"), NOT "product:STRING" — render_sql treats ':word' as a bound
# :param placeholder, so a colon here would raise "missing param: STRING".
_PI_TYPE = "ARRAY<STRUCT<product STRING, issue STRING>>"


@router.get("/theme-clusters", response_model=list[ThemeCluster])
def theme_clusters(days: int | None = None, state: str | None = None, min_n: int = 5) -> list[ThemeCluster]:
    """Product × food-quality-issue clusters from NEGATIVE reviews, for the Review Theme
    Explorer. The pairing is AI-extracted per review into the `product_issues` column
    (each {product, issue} genuinely describes that product — no keyword cross-join), so
    here we simply explode it and aggregate: count, avg rating, 7d-vs-prior trend, plus a
    few sample reviews per cluster."""
    min_n = max(1, int(min_n))
    where = f"WHERE sentiment = 'Negative'{_date_clause(days)}{_state_clause(state)}"
    # Explode the AI-extracted pairs; aggregate per (product, issue).
    rows = fetch_all(
        f"""
        WITH a AS (SELECT to_date(:anchor) AS d),
        base AS (
          SELECT rating, to_date(date) AS rdate, product_issues
          FROM {_src()}, a
          {where}
        ),
        pa AS (
          SELECT rating, rdate, pr.product AS product, pr.issue AS attr
          FROM base
          LATERAL VIEW explode(from_json(product_issues, '{_PI_TYPE}')) t AS pr
          WHERE pr.product IS NOT NULL AND pr.issue IS NOT NULL
        )
        SELECT product, attr, COUNT(*) AS cnt, ROUND(AVG(rating), 1) AS avg,
               SUM(CASE WHEN rdate >= (SELECT d FROM a) - 7 THEN 1 ELSE 0 END) AS c7,
               SUM(CASE WHEN rdate < (SELECT d FROM a) - 7 AND rdate >= (SELECT d FROM a) - 14 THEN 1 ELSE 0 END) AS cprev
        FROM pa
        GROUP BY product, attr
        HAVING COUNT(*) >= {min_n}
        ORDER BY cnt DESC
        """,
        {"anchor": get_settings().anchor_date},
    )
    if not rows:
        return []

    # Sample reviews per (product, issue): rows whose product_issues actually contains
    # that exact pair — precise, no keyword matching.
    clusters: list[ThemeCluster] = []
    for r in rows[:40]:  # cap detail fetches to the top clusters by volume
        product, attr = r["product"], r["attr"]
        c7, cprev = int(r["c7"] or 0), int(r["cprev"] or 0)
        trend = 0
        if cprev > 0:
            trend = round((c7 - cprev) / cprev * 100)
        elif c7 > 0:
            trend = 100
        # Escape single quotes so the values are safe to interpolate.
        safe_product = product.replace("'", "''")
        safe_attr = attr.replace("'", "''")
        kws = _ISSUE_KEYWORDS.get(attr, [])
        samples: list[ThemeSample] = []
        srows = fetch_all(
            f"""
            SELECT location_name, rating, cast(to_date(date) AS string) AS d,
                   coalesce(review_text, comment) AS t
            FROM {_src()}
            {where}
              AND review_text IS NOT NULL
              AND exists(
                    from_json(product_issues, '{_PI_TYPE}'),
                    x -> x.product = '{safe_product}' AND x.issue = '{safe_attr}'
                  )
            ORDER BY length(review_text) DESC
            LIMIT 4
            """,
        )
        for sr in srows:
            samples.append(ThemeSample(
                location_name=sr["location_name"],
                rating=int(sr["rating"]) if sr.get("rating") is not None else None,
                date=sr["d"], text=(sr.get("t") or "")[:400],
            ))
        clusters.append(ThemeCluster(
            product=product, attr=attr, count=int(r["cnt"] or 0),
            avg=float(r["avg"]) if r.get("avg") is not None else None,
            trend=trend, keywords=kws, samples=samples,
        ))
    return clusters


@router.get("/store-category", response_model=list[StoreCategoryRow])
def store_category(days: int | None = None, min_n: int = 5, state: str | None = None) -> list[StoreCategoryRow]:
    """Store x category sentiment matrix for the heatmap. Stores sorted worst->best
    (most negative first) with a representative negative comment per store."""
    min_n = max(1, int(min_n))
    where = f"WHERE 1=1{_date_clause(days)}{_state_clause(state)}"
    rows = fetch_all(
        f"""
        WITH scored AS (
          SELECT location_name,
                 TRY_CAST(speed_rating          AS DOUBLE) AS speed,
                 TRY_CAST(cleanliness_rating    AS DOUBLE) AS cleanliness,
                 TRY_CAST(order_accuracy_rating AS DOUBLE) AS order_accuracy,
                 TRY_CAST(quality_rating        AS DOUBLE) AS quality,
                 TRY_CAST(service_rating        AS DOUBLE) AS service,
                 sentiment, comment
          FROM {_src()}
          {where}
        ),
        agg AS (
          SELECT location_name,
                 ROUND(AVG(speed), 2)          AS speed,
                 ROUND(AVG(cleanliness), 2)    AS cleanliness,
                 ROUND(AVG(order_accuracy), 2) AS order_accuracy,
                 ROUND(AVG(quality), 2)        AS quality,
                 ROUND(AVG(service), 2)        AS service,
                 COUNT(*)                      AS n,
                 ROUND(AVG(CASE WHEN sentiment = 'Negative' THEN 1.0 ELSE 0 END) * 100, 0) AS pct_neg
          FROM scored
          GROUP BY location_name
          HAVING COUNT(*) >= {min_n}
        ),
        snip AS (
          SELECT location_name, comment,
                 ROW_NUMBER() OVER (
                   PARTITION BY location_name
                   ORDER BY length(comment) DESC
                 ) AS rn
          FROM scored
          WHERE sentiment = 'Negative' AND comment IS NOT NULL AND length(comment) > 0
        )
        SELECT a.location_name, a.speed, a.cleanliness, a.order_accuracy,
               a.quality, a.service, a.n, a.pct_neg, sn.comment AS snippet
        FROM agg a
        LEFT JOIN snip sn ON sn.location_name = a.location_name AND sn.rn = 1
        ORDER BY a.pct_neg DESC, a.n DESC
        """,
    )
    out: list[StoreCategoryRow] = []
    for r in rows:
        def f(v):
            return float(v) if v is not None else None
        out.append(StoreCategoryRow(
            location_name=r["location_name"],
            speed=f(r["speed"]), cleanliness=f(r["cleanliness"]),
            order_accuracy=f(r["order_accuracy"]), quality=f(r["quality"]),
            service=f(r["service"]), n=int(r["n"] or 0),
            pct_neg=float(r["pct_neg"] or 0), snippet=r.get("snippet"),
        ))
    return out


@router.get("/reviews", response_model=list[Review])
def reviews(limit: int = 200, state: str | None = None) -> list[Review]:
    """Recent reviews for the Table view. classification and product are JSON-array
    strings, parsed into lists here."""
    import json as _json

    limit = max(1, min(int(limit), 1000))
    # Parenthesize the OR so the appended state clause (AND ...) doesn't bind to
    # only the `comment` branch (AND has higher precedence than OR).
    where = "WHERE (review_text IS NOT NULL OR comment IS NOT NULL)"
    where += _state_clause(state)
    rows = fetch_all(
        f"""
        SELECT location_name, cast(to_date(date) AS string) AS date, rating,
               directoryType AS channel, sentiment, classification, product,
               coalesce(comment, review_text) AS comment
        FROM {_src()}
        {where}
        ORDER BY date DESC
        LIMIT {limit}
        """,
    )

    def _parse_json_list(raw) -> list[str]:
        if not raw:
            return []
        try:
            parsed = _json.loads(raw)
            return [str(c) for c in parsed] if isinstance(parsed, list) else []
        except (ValueError, TypeError):
            return []

    out: list[Review] = []
    for r in rows:
        out.append(Review(
            location_name=r["location_name"], date=r["date"],
            rating=int(r["rating"]) if r.get("rating") is not None else None,
            channel=(r.get("channel") or "").title() or "Google",
            sentiment=r.get("sentiment") or "Neutral",
            categories=_parse_json_list(r.get("classification")),
            products=_parse_json_list(r.get("product")),
            comment=r.get("comment"),
        ))
    return out
