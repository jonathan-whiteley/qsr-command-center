"""App settings sourced from a workspace config file (preferred) or env vars.

Boot order:
  1. App starts. lib/config.get_settings() runs once (lru_cached).
  2. It tries to read /Workspace/Shared/command-center/config.json via the
     SDK. This file is written by the setup job's 03_create_genie_space
     notebook task. If present, its keys (catalog, schema, warehouse_id,
     genie_space_id) take precedence over env vars.
  3. If the file is missing (App started before the setup job ran), env
     vars from app.yaml are used. Restart the App after the setup job to
     pick up the new config.

The runtime injects DATABRICKS_HOST and (via the `workshop_warehouse` resource
binding) DATABRICKS_WAREHOUSE_ID; Lakebase PG* env vars come from the
`lakebase` resource binding.
"""
from __future__ import annotations

import base64
import json
import os
from functools import lru_cache

from pydantic import BaseModel


CONFIG_PATH = "/Workspace/Shared/command-center/config.json"


class Settings(BaseModel):
    databricks_host: str = ""
    warehouse_id: str = ""
    catalog: str = "ioc_sandbox"
    schema_name: str = "vibe_workshop"
    # Guest Sentiment reads from a separate source table
    # (jdub_demo.little_caesars.location_sentiment), not facts_customer_feedback.
    # That table stores classification + product and the five *_rating columns as
    # STRINGS (product is a JSON array string like classification) — see feedback.py.
    sentiment_catalog: str = "jdub_demo"
    sentiment_schema: str = "little_caesars"
    sentiment_table: str = "location_sentiment"
    lakebase_host: str = ""
    lakebase_db: str = "databricks_postgres"
    lakebase_user: str = ""
    lakebase_password: str = ""
    lakebase_instance: str = ""
    genie_space_id: str = ""
    fmapi_endpoint: str = "databricks-claude-sonnet-4-6"
    anchor_date: str = "2026-06-22"
    config_source: str = "env"  # "env" or "workspace-file"


def _load_workspace_config() -> dict:
    """Try to read CONFIG_PATH via the SDK. Returns {} on any error."""
    try:
        from databricks.sdk import WorkspaceClient
        w = WorkspaceClient()
        resp = w.api_client.do(
            "GET",
            "/api/2.0/workspace/export",
            query={"path": CONFIG_PATH, "format": "SOURCE", "direct_download": False},
        )
        b64 = (resp or {}).get("content") if isinstance(resp, dict) else None
        if not b64:
            return {}
        raw = base64.b64decode(b64).decode("utf-8")
        return json.loads(raw)
    except Exception as e:
        print(f"[config] workspace config not loaded ({CONFIG_PATH}): {type(e).__name__}: {str(e)[:200]}")
        return {}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    ws_cfg = _load_workspace_config()
    source = "workspace-file" if ws_cfg else "env"
    return Settings(
        databricks_host=os.getenv("DATABRICKS_HOST", ""),
        warehouse_id=ws_cfg.get("warehouse_id") or os.getenv("DATABRICKS_WAREHOUSE_ID", ""),
        catalog=ws_cfg.get("catalog") or os.getenv("CC_CATALOG", "ioc_sandbox"),
        schema_name=ws_cfg.get("schema") or os.getenv("CC_SCHEMA", "vibe_workshop"),
        sentiment_catalog=ws_cfg.get("sentiment_catalog") or os.getenv("CC_SENTIMENT_CATALOG", "jdub_demo"),
        sentiment_schema=ws_cfg.get("sentiment_schema") or os.getenv("CC_SENTIMENT_SCHEMA", "little_caesars"),
        sentiment_table=ws_cfg.get("sentiment_table") or os.getenv("CC_SENTIMENT_TABLE", "location_sentiment"),
        lakebase_host=os.getenv("LAKEBASE_HOST") or os.getenv("PGHOST", ""),
        lakebase_db=os.getenv("LAKEBASE_DB") or os.getenv("PGDATABASE", "databricks_postgres"),
        lakebase_user=os.getenv("LAKEBASE_USER") or os.getenv("PGUSER", ""),
        lakebase_password=os.getenv("LAKEBASE_PASSWORD") or os.getenv("PGPASSWORD", ""),
        lakebase_instance=ws_cfg.get("lakebase_instance") or os.getenv("LAKEBASE_INSTANCE", "command-center-lakebase"),
        genie_space_id=ws_cfg.get("genie_space_id") or os.getenv("GENIE_SPACE_ID", ""),
        fmapi_endpoint=ws_cfg.get("fmapi_endpoint") or os.getenv("FMAPI_ENDPOINT", "databricks-claude-sonnet-4-6"),
        anchor_date=ws_cfg.get("anchor_date") or os.getenv("ANCHOR_DATE", "2026-06-22"),
        config_source=source,
    )
