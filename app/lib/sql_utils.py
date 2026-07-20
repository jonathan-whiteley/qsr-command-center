"""SQL helpers: param substitution, dict-row fetch, TTL cache.

We render server-side (no bound parameters) because databricks-sql-connector's
async story is limited. Callers must validate input types (int/date) before
passing them in.
"""
from __future__ import annotations

import os
import re
import time
from typing import Any, Mapping

from lib.deps import get_warehouse_client

_PARAM = re.compile(r":(\w+)")
_TTL_SECONDS = int(os.getenv("QUERY_CACHE_TTL", "86400"))  # 24h: data only changes on redeploy
_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}


def render_sql(sql: str, params: Mapping[str, Any]) -> str:
    def sub(m: re.Match[str]) -> str:
        key = m.group(1)
        if key not in params:
            raise KeyError(f"missing param: {key}")
        v = params[key]
        if isinstance(v, (int, float)):
            return str(v)
        escaped = str(v).replace("'", "''")
        return f"'{escaped}'"

    return _PARAM.sub(sub, sql)


def _execute(rendered: str) -> list[dict[str, Any]]:
    with get_warehouse_client().cursor() as cur:
        cur.execute(rendered)
        cols = [d[0] for d in cur.description or []]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def _execute_with_retry(rendered: str) -> list[dict[str, Any]]:
    """Run the query; on any connection-shape error, drop the cached client
    and retry exactly once. Covers SQL warehouse auto-stop, session expiry,
    transient network blips (RequestError / Connection / Thrift)."""
    try:
        return _execute(rendered)
    except Exception as e:
        msg = str(e)
        retryable = (
            "SessionHandle" in msg
            or ("Session" in msg and "closed" in msg)
            or "BAD_REQUEST" in msg
            or "RequestError" in msg
            or "Error during request" in msg
            or "Connection" in msg
            or "broken pipe" in msg.lower()
            or "thrift" in msg.lower()
        ) or isinstance(e, (ConnectionError, BrokenPipeError))
        if retryable:
            get_warehouse_client.cache_clear()
            return _execute(rendered)
        raise


def fetch_all(sql: str, params: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
    rendered = render_sql(sql, params or {})
    if _TTL_SECONDS > 0:
        now = time.time()
        cached = _CACHE.get(rendered)
        if cached and now - cached[0] < _TTL_SECONDS:
            return cached[1]
        result = _execute_with_retry(rendered)
        _CACHE[rendered] = (now, result)
        return result
    return _execute_with_retry(rendered)


def fetch_one(sql: str, params: Mapping[str, Any] | None = None) -> dict[str, Any] | None:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def clear_cache() -> int:
    n = len(_CACHE)
    _CACHE.clear()
    return n
