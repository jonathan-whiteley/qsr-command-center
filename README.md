# QSR Command Center

A repeatable, QSR-specific command-center application on Databricks: one operational
cockpit for a restaurant brand, built as a set of modules over governed Lakehouse data,
plus the data pipeline that feeds it. Little Caesars is the current reference dataset;
the app and pipeline are meant to be re-pointed at any QSR brand.

## Layout

| Path | What |
|---|---|
| `app/` | The Databricks App — FastAPI backend + no-build React, one module per operational surface |
| `notebooks/` | The medallion data pipeline (bronze → silver → gold) that produces the app's tables |

## App (`app/`)

FastAPI backend (`app.py`, `routers/`, `lib/`) serving a no-build-step React UI (in-browser
Babel over `static/app/*.jsx`). Reads governed data via a SQL warehouse; source
catalog/schema/table are config-driven (`CC_*` env vars / a workspace config file), so the
same app re-points across brands and environments.

### Modules
- **Guest Sentiment** — the enhanced surface. Sentiment-by-store heatmap, product mention
  bars, and the **Theme Explorer** bubble viz of linked product × food-quality-issue
  clusters, all driven by the pipeline's AI extraction (`product_issues`).
- **Today**, **Sales/Reports**, **Labor**, **Inventory/Reorders**, **Equipment**,
  **Members win-back** — operational modules.
- **Ask (Genie)** — natural-language Q&A slide-over over the brand's data.

New modules follow the same pattern: a router in `routers/`, a view in `static/app/`, and a
nav entry in `shell.jsx`.

### Deploy
Workspace-import the `app/` files to the App's source path, then `apps deploy` (this app
does not deploy cleanly via `bundle deploy`). `Homebase.html` is the entrypoint
(`DEFAULT_DOC` in `app.yaml`) — a legacy filename retained to avoid breaking the deployed URL.

## Data pipeline (`notebooks/`)

Medallion pipeline that ingests + AI-enriches Google reviews into the tables the Guest
Sentiment module reads.

| Notebook | Layers | Tables written |
|---|---|---|
| `notebooks/01_ingest_clean.ipynb` | Bronze → Silver | `reviews_bronze`, `reviews_silver` |
| `notebooks/02_enrich.ipynb` | Silver → Gold | `reviews_gold` |

`02_enrich` folds all AI extraction into ONE `ai_query` per review (classification +
sentiment + per-aspect ratings + product + `product_issues`) — no second FM pass.

### Environments (widget-driven)
- **Test (default):** `jdub_demo.little_caesars` — sample data in the personal workspace.
- **Prod:** `ioc_sandbox.ai_strategy` — LCE dev environment. Set via Job widget overrides only.

⚠️ **Do not run against the prod LCE schema (`ioc_sandbox.ai_strategy`) ad hoc.** Notebooks
default to the test schema; prod is reached only through an explicit, intentional Job run.

### Run as a Job
Two tasks: `01_ingest_clean` → `02_enrich` (dependency). Set the Uberall API key via a
Databricks secret (`uberall_secret_scope` / `uberall_secret_key` widgets) before scheduling.
