"""Shared dependencies: SQL warehouse client, Lakebase async pool, workspace client.

Adapted from the lakehouse-market reference build. The Databricks Apps runtime
gives us OAuth tokens via WorkspaceClient; we mint per-pool tokens for Lakebase
because static passwords aren't supported.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

import asyncpg
from databricks import sql as dbsql
from databricks.sdk import WorkspaceClient

from lib.config import get_settings


@lru_cache(maxsize=1)
def workspace_client() -> WorkspaceClient:
    return WorkspaceClient()


@lru_cache(maxsize=1)
def get_warehouse_client():
    s = get_settings()
    w = workspace_client()
    return dbsql.connect(
        server_hostname=s.databricks_host.replace("https://", "").rstrip("/"),
        http_path=f"/sql/1.0/warehouses/{s.warehouse_id}",
        credentials_provider=lambda: w.config.authenticate,
        catalog=s.catalog,
        schema=s.schema_name,
    )


_pool: Optional[asyncpg.Pool] = None


async def _mint_lakebase_token() -> str:
    """Generate a short-lived OAuth token scoped to the Lakebase instance."""
    s = get_settings()
    w = workspace_client()
    resp = w.database.generate_database_credential(instance_names=[s.lakebase_instance])
    token = getattr(resp, "token", None)
    if not token and isinstance(resp, dict):
        token = resp.get("token")
    if not token:
        raise RuntimeError(f"generate_database_credential returned no token: {resp!r}")
    return token


async def get_lakebase_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        s = get_settings()
        password = s.lakebase_password or await _mint_lakebase_token()
        _pool = await asyncpg.create_pool(
            host=s.lakebase_host,
            database=s.lakebase_db,
            user=s.lakebase_user,
            password=password,
            ssl="require",
            min_size=1,
            max_size=4,
        )
    return _pool


async def reset_lakebase_pool() -> None:
    """Drop the pool; the next acquire reconnects (token rotation, ~1h TTL)."""
    global _pool
    if _pool is not None:
        try:
            await _pool.close()
        except Exception:
            pass
        _pool = None
