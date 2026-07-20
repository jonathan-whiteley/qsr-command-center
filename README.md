# qsr-review-iq

Google-review sentiment pipeline for QSR locations (Little Caesars demo data). Ingests
reviews, cleans them, and enriches each with a single `ai_query` pass that extracts
classification, sentiment, per-aspect ratings, products mentioned, and **linked
`product_issues`** pairs (each food-quality issue tied to the product it describes).
Feeds the Guest Sentiment "Themes" bubble viz in the command-center app.

## Notebooks (medallion)

| Notebook | Layers | Tables written |
|---|---|---|
| `notebooks/01_ingest_clean.ipynb` | Bronze → Silver | `reviews_bronze`, `reviews_silver` |
| `notebooks/02_enrich.ipynb` | Silver → Gold | `reviews_gold` |

`02_enrich` folds all AI extraction into ONE `ai_query` per review (classification +
sentiment + ratings + product + product_issues) — no second FM pass.

## Environments (widget-driven)

- **Test (default):** `jdub_demo.little_caesars` — sample data in the personal workspace.
- **Prod:** `ioc_sandbox.ai_strategy` — LCE dev environment. Set via Job widget overrides only.

⚠️ **Do not run against the prod LCE schema (`ioc_sandbox.ai_strategy`) ad hoc.** Notebooks
default to the test schema; prod is reached only through an explicit, intentional Job run.

## Run as a Job
Two tasks: `01_ingest_clean` → `02_enrich` (dependency). Set the Uberall API key via a
Databricks secret (`uberall_secret_scope` / `uberall_secret_key` widgets) before scheduling.
