# Guest Sentiment tab — update plan for the deployed LCE app

**Audience:** an AI coding assistant (or engineer) with access to the LCE Databricks
workspace, tasked with updating the **deployed** `rmar-command-center` app so its
**Guest Feedback** tab is replaced by this repo's richer **Guest Sentiment** tab —
wired to real LCE data — while leaving every other part of the app intact.

**Repo this plan ships with:** `qsr-command-center` (the `app/` directory is the
source of truth for the new tab). The exact files to deploy are in
`sentiment_tab_update/code/` and `sentiment_tab_update/sql/` alongside this plan.

---

## 0. TL;DR of the change

1. **Data (one notebook edit):** add a human `location_name` ("City, ST") to
   `ioc_sandbox.ai_strategy.reviews_gold` via a join to
   `ioc_sandbox.ai_strategy.worst_performing_stores`. SQL:
   `sentiment_tab_update/sql/gold_add_location_name.sql`.
2. **App (3 files):** replace the feedback tab's frontend + backend and point config
   at `reviews_gold`. Files: `sentiment_tab_update/code/feedback.jsx`,
   `feedback.py`, `config.py`. Plus one env block in `app.yaml` and one nav-label line
   in `static/app/shell.jsx`.
3. **Deploy:** sync only those files into the app's source path and redeploy.
4. **Leave alone:** every other module (Today, Labor, Inventory, Equipment, Members,
   Genie/Ask), the topbar **NewsDropdown** feature, branding/logo, fonts, CSS.

---

## 1. Deployment facts (verified 2026-07-21)

| Thing | Value |
|---|---|
| Workspace | LCE, `https://adb-30827331698809.9.azuredatabricks.net` (CLI profile `lce`) |
| App name | `rmar-command-center` |
| App URL | https://rmar-command-center-30827331698809.9.azure.databricksapps.com/Homebase.html |
| **Source code path** | `/Workspace/Users/ryan.marson@lcecorp.com/rmar-command-center` |
| Warehouse (from live config) | `610ea94e1066f95b` |
| Live workspace config file | `/Workspace/Shared/command-center/config.json` (catalog/schema/warehouse/genie only) |
| Serving entrypoint | `uvicorn app:app` (FastAPI + no-build React over `static/app/*.jsx`) |

> The app deploys from Ryan Marson's personal workspace folder. You need write access
> to that path (or deploy from a copy — see §6, Option B). Confirm with
> `databricks workspace list "<source path>" -p lce` before starting.

---

## 2. Why this isn't a straight file copy

The repo's tab and the deployed tab have **diverged in both directions**:

- **Repo is newer for the tab:** `feedback.jsx` 789 lines vs deployed 255;
  `feedback.py` 497 lines / 7 endpoints vs deployed 106 / 3. The repo tab adds a
  store×category heatmap, product-sentiment bars, a packed-bubble **Theme Explorer**,
  a sentiment timeline, and a review table with a State filter + view toggle.
- **Deployed is newer elsewhere:** the deployed `shell.jsx` has a **NewsDropdown**
  (`/api/news`) feature and dark-navy topbar branding the repo lacks. **Do not
  overwrite `shell.jsx` wholesale** — you would delete the customer's news feature.
  Only change the single nav-label line (§4, step 3).

So: full-replace the two feedback files, add config plumbing, and make a one-line edit
to `shell.jsx`. Nothing else.

---

## 3. The data problem and its fix (do this FIRST)

The repo tab was written against a demo table
(`jdub_demo.little_caesars.location_sentiment`) that **does not exist in LCE**. The
real LCE source is **`ioc_sandbox.ai_strategy.reviews_gold`**. It has every column the
tab needs, but two differences from the demo table:

| Aspect | Demo table (repo was written for) | `reviews_gold` (LCE) | Handled by |
|---|---|---|---|
| `classification`, `product`, `product_issues` | JSON **strings** | **native** `array` / `array<struct>` | App: `_src()` calls `to_json(...)` (already in `code/feedback.py`) |
| `location_name` | `"City, ST"` string | numeric Google directory id | **Notebook**: join store dim to produce `"City, ST"` |

The app reads `classification`/`product`/`product_issues` as JSON strings and derives
the store label + State filter from `location_name` being `"City, ST"`
(`location_name.split(',')[0]` = store; last segment = state).

- The **array→JSON** difference is absorbed **in the app** by `_src()` (a subquery that
  `to_json()`s the three native columns). No other app query changes.
- The **location_name** difference is fixed **in the notebook** (per decision: keep the
  transform out of the app). `reviews_gold.locationId` joins to
  `worst_performing_stores.`Location ID`` which carries `City` + `State`. Verified: all
  reviewed stores match the dim (0 unmatched), and
  `concat_ws(', ', City, State)` yields e.g. `"Chesapeake, VA"`, from which the State
  filter parses `VA` cleanly.

### 3a. Notebook change (already in the repo pipeline)

This logic now lives in **`notebooks/sentiment/02_enrich.ipynb`** (the Silver → Gold
enrich step), so on a normal pipeline run `reviews_gold` is written with the correct
`location_name` — no separate patch step is needed. Specifics:

- The store-dim join is **widget-driven**. Set the enrich notebook's widgets for the LCE
  (prod) run:
  - `catalog` = `ioc_sandbox`, `schema` = `ai_strategy`
  - `stores_table` = `ioc_sandbox.ai_strategy.worst_performing_stores`
  - `stores_id_col` = `Location ID`
- With `stores_table` set, `location_name` is
  `COALESCE(NULLIF(concat_ws(', ', s.City, s.State), ''), CAST(b.locationId AS STRING))`
  → e.g. `"Chesapeake, VA"`, falling back to the raw `locationId` for any store not in
  the dim. Because the enrich step `CREATE OR REPLACE`s `reviews_gold` fresh from Silver,
  there is no duplicate-`location_name` risk. Leave `stores_table` blank in test and
  `location_name` falls back to the `locationId`.

Verified against live LCE data (2026-07-21): all 12 populated stores resolve to a clean
`"City, ST"` and the State filter parses the trailing 2-letter code for every one.

> `sentiment_tab_update/sql/gold_add_location_name.sql` remains in this package as a
> **standalone patch** for the case where you only want to fix an already-built
> `reviews_gold` without re-running the enrich notebook. It does the same join via
> `CREATE OR REPLACE TABLE ... AS SELECT`; in that path you must **replace, not add** the
> existing numeric `location_name` (a duplicate causes `AMBIGUOUS_REFERENCE`). Prefer the
> notebook path above for normal pipeline runs.

> Data volume note: `reviews_gold` is actively being populated (was 10 rows/7 stores,
> then 20/12 within an hour on 2026-07-21). The tab's heatmap/Theme Explorer use a
> `min_n=5` review threshold per store/cluster, so views will look sparse until volume
> grows. That's expected, not a bug. Nothing to change in code.

---

## 4. App changes (exact steps)

All paths below are relative to the app root
(`/Workspace/Users/ryan.marson@lcecorp.com/rmar-command-center`).

### Step 1 — Replace the feedback frontend
Overwrite `static/app/feedback.jsx` with `sentiment_tab_update/code/feedback.jsx`.
This file is **data-source-agnostic** — it only calls `/api/feedback/*`. It depends on
shared components (`Card`, `Icon`, `PageHead`, `Btn`, `LakebaseTag`, `LaborStat`) that
are **already present** in the deployed app (`shell.jsx` / `labor.jsx`), so no other
frontend file changes. It defines its own `Stars`. Verified against the deployed shell.

### Step 2 — Replace the feedback backend
Overwrite `routers/feedback.py` with `sentiment_tab_update/code/feedback.py`. The only
adaptation vs the repo's own file is `_src()`, which wraps the source table in a
subquery that `to_json()`s the three native array columns. Every endpoint
(`/states`, `/summary`, `/themes`, `/sentiment-timeline`, `/products`,
`/theme-clusters`, `/store-category`, `/reviews`) is otherwise the repo logic.

No router registration change is needed — `routers/feedback.py` already exposes
`router` with prefix `/api/feedback`, and `app.py` already includes it (the deployed
app already serves `/api/feedback/*`, just fewer endpoints).

### Step 3 — Point config at reviews_gold
Overwrite `lib/config.py` with `sentiment_tab_update/code/config.py`. The change vs the
deployed config: the `sentiment_catalog` / `sentiment_schema` / `sentiment_table`
Settings fields + their env fallbacks now default to
`ioc_sandbox` / `ai_strategy` / `reviews_gold` (the deployed config has no
`sentiment_*` fields at all — the deployed tab reads `catalog`/`schema` =
`facts_customer_feedback`).

> If the deployed `lib/config.py` has drifted in ways unrelated to sentiment (it may
> carry other LCE-specific edits), do a **surgical merge instead of overwrite**: add the
> three `sentiment_*` fields to the `Settings` class and the three matching
> `os.getenv("CC_SENTIMENT_*", ...)` lines in `get_settings()`, exactly as shown in
> `code/config.py`. Diff the two files first.

### Step 4 — Nav label (one line in shell.jsx)
In `static/app/shell.jsx`, change the feedback nav entry label from `Guest Feedback` to
`Guest Sentiment`:

```js
// before
{ id:'feedback', label:'Guest Feedback', icon:'feedback' },
// after
{ id:'feedback', label:'Guest Sentiment', icon:'feedback' },
```

**Change nothing else in shell.jsx** (preserve NewsDropdown, branding, TopBar).

### Step 5 — app.yaml env
Add the sentiment source env block to the deployed `app.yaml` `env:` list (bootstrap
defaults; the app also honors a `sentiment_*` key in the workspace config file if you
prefer to set it there):

```yaml
  - name: CC_SENTIMENT_CATALOG
    value: "ioc_sandbox"
  - name: CC_SENTIMENT_SCHEMA
    value: "ai_strategy"
  - name: CC_SENTIMENT_TABLE
    value: "reviews_gold"
```

Leave the existing `CC_CATALOG` / `CC_SCHEMA` (`ioc_sandbox` / `vibe_workshop`),
warehouse binding, `GENIE_SPACE_ID`, `LAKEBASE_INSTANCE`, and everything else as-is —
the other modules still use them.

---

## 5. Files in this package

| File | Role |
|---|---|
| `sentiment_tab_update_plan.md` | This plan |
| `code/feedback.jsx` | Drop-in replacement for `static/app/feedback.jsx` |
| `code/feedback.py` | Drop-in replacement for `routers/feedback.py` (only `_src()` differs from repo) |
| `code/config.py` | Replacement for `lib/config.py` (or merge the `sentiment_*` fields) |
| `sql/gold_add_location_name.sql` | Notebook edit: add `location_name` to `reviews_gold` |

---

## 6. Deploy

Prereq: `databricks auth login --profile lce` (interactive browser login).

### Option A — deploy in place (if you can write to Ryan's folder)
Upload only the changed files, then redeploy:

```bash
BASE="/Workspace/Users/ryan.marson@lcecorp.com/rmar-command-center"

# 1. push changed files (workspace import, OVERWRITE)
databricks workspace import "$BASE/static/app/feedback.jsx" \
  --file sentiment_tab_update/code/feedback.jsx --language PYTHON --format AUTO --overwrite -p lce
databricks workspace import "$BASE/routers/feedback.py" \
  --file sentiment_tab_update/code/feedback.py --language PYTHON --format SOURCE --overwrite -p lce
databricks workspace import "$BASE/lib/config.py" \
  --file sentiment_tab_update/code/config.py --language PYTHON --format SOURCE --overwrite -p lce
# shell.jsx + app.yaml: make the one-line label edit and env edit in place
#   (export → edit → import --overwrite), NOT a wholesale copy from the repo.

# 2. redeploy the app from its existing source path
databricks apps deploy rmar-command-center \
  --source-code-path "$BASE" -p lce
```

> `databricks apps deploy` reads from the app's `source_code_path`. Push files to that
> path first (as above), then deploy. Do **not** rely on `databricks sync` for the
> React `static/` assets if a `.gitignore`/dist rule would skip them — use
> `workspace import` per file, or `import-dir` for the whole tree.

### Option B — deploy from a copy you control (if you lack write access to Ryan's folder)
1. Export the whole deployed app to a folder you own:
   `databricks workspace export-dir "$BASE" ./_deployed -p lce` (or per-file if
   export-dir skips FILE objects — it sometimes does; fall back to `workspace export`).
2. Apply steps 1–5 from §4 to that local copy.
3. Import the copy to a path you own, e.g.
   `/Workspace/Users/<you>/rmar-command-center`.
4. `databricks apps update rmar-command-center --json '{"...": "..."}'` to repoint
   `source_code_path`, or redeploy with `--source-code-path <your path>`. Same app,
   same URL; only the source location moves.

> Option B changes where the app deploys from. Confirm with the app owner (Ryan /
> account team) before repointing a customer-owned app.

---

## 7. Verify after deploy

1. **Backend smoke test** (against the app, authenticated in browser, or curl with a
   token). Each should return JSON, not 500:
   - `/api/feedback/summary`
   - `/api/feedback/states`
   - `/api/feedback/store-category?min_n=5`
   - `/api/feedback/products`
   - `/api/feedback/theme-clusters?min_n=5`
   - `/api/feedback/sentiment-timeline`
   - `/api/feedback/reviews?limit=50`
2. **UI:** open the app, confirm the left-nav item now reads **Guest Sentiment**, and
   the tab shows the Heatmap / Themes / Table view toggle, the State filter populated
   with real states (VA, NY, TX, …), and KPI tiles with real numbers.
3. **Untouched:** click through Today, Labor, Inventory, Equipment, Members, Ask, and
   confirm the topbar **news bell** still opens the NewsDropdown. Nothing else regressed.
4. If a view looks empty: it's almost certainly the `min_n=5` threshold vs current
   review volume (see §3 note), not a wiring error. Confirm by hitting `/summary`
   (should still show totals) and by checking `reviews_gold` row count.

---

## 8. Data-source reference (verified against LCE, 2026-07-21)

`ioc_sandbox.ai_strategy.reviews_gold` columns the tab uses:

| Column | Type | Used for |
|---|---|---|
| `locationId` | bigint | store count (`COUNT(DISTINCT locationId)`), dim join |
| `location_name` | string | store label + State filter (**notebook makes this "City, ST"**) |
| `date` | string | timelines, recency, 7d/30d windows |
| `rating` | double | avg rating KPI, per-cluster avg |
| `directoryType` | string | review "channel" (e.g. GOOGLE) |
| `review_text`, `comment` | string | sample review text, snippets |
| `sentiment` | string | Positive / Negative / Mixed / Neutral splits |
| `speed_rating` … `service_rating` | double (×5) | category heatmap, weakest/strongest KPI |
| `classification` | array<string> | theme rollups (app `to_json`s → `from_json`) |
| `product` | array<string> | product mention bars |
| `product_issues` | array<struct<product,issue>> | Theme Explorer clusters |

Store dimension: `ioc_sandbox.ai_strategy.worst_performing_stores`, join key
`` `Location ID` `` (quoted; has a space) = `reviews_gold.locationId`. Provides
`City`, `State`, `Franchise Name`, `Address`.

Anchor date for 7d/30d windows: `2026-06-22` (app setting `anchor_date`, env
`ANCHOR_DATE` — already set in the deployed `app.yaml`).
