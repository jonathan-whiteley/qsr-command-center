-- ============================================================================
-- gold_add_location_name.sql
-- ----------------------------------------------------------------------------
-- Purpose: give ioc_sandbox.ai_strategy.reviews_gold a human `location_name`
-- ("City, ST") so the QSR Command Center "Guest Sentiment" tab can label stores
-- and drive its State filter. This is the ONLY change the tab needs on the data
-- side; all array/struct columns stay NATIVE (the app serializes them to JSON at
-- read time in feedback.py._src()).
--
-- Where this goes: fold this into the gold-building notebook
--   (Ryan Marson's notebook, object id 1840423847936134) as the final step that
--   writes reviews_gold. It is written to be idempotent / re-runnable.
--
-- Source of City/State: ioc_sandbox.ai_strategy.worst_performing_stores, joined on
--   worst_performing_stores.`Location ID` = reviews_gold.locationId
--   (this is the exact join the gold notebook already uses elsewhere).
--
-- IMPORTANT — replace, don't duplicate:
--   reviews_gold ALREADY has a `location_name` column (currently the numeric
--   directory id). You must REPLACE it, not add a second one, or every query that
--   references location_name will fail with AMBIGUOUS_REFERENCE. The
--   `* EXCEPT (location_name)` below handles that.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Option A (recommended): rebuild reviews_gold with location_name replaced.
-- Use this form INSIDE the gold notebook, at the point where reviews_gold is
-- (re)written. It preserves every existing column and its type; only
-- location_name changes from the numeric id to "City, ST".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TABLE ioc_sandbox.ai_strategy.reviews_gold AS
SELECT
  g.* EXCEPT (location_name),
  concat_ws(', ', d.City, d.State) AS location_name
FROM ioc_sandbox.ai_strategy.reviews_gold g
LEFT JOIN ioc_sandbox.ai_strategy.worst_performing_stores d
  ON g.locationId = d.`Location ID`;

-- NOTE: if the gold notebook builds reviews_gold from an upstream dataframe/CTE
-- (not by reading reviews_gold itself), apply the same idea there instead: drop the
-- old numeric location_name and add `concat_ws(', ', d.City, d.State) AS location_name`
-- from the worst_performing_stores join. The CREATE OR REPLACE above is the
-- table-to-table form for when you just want to patch the already-built table.

-- ---------------------------------------------------------------------------
-- Verification (run after the rebuild). All three should look right:
-- ---------------------------------------------------------------------------

-- 1) location_name is now "City, ST", one row per store with counts:
SELECT location_name, count(*) AS reviews
FROM ioc_sandbox.ai_strategy.reviews_gold
GROUP BY location_name
ORDER BY reviews DESC;

-- 2) State parses cleanly off the tail (this is exactly what the app's State filter does):
SELECT trim(element_at(split(location_name, ','), -1)) AS state, count(*) AS n
FROM ioc_sandbox.ai_strategy.reviews_gold
GROUP BY 1
ORDER BY n DESC;

-- 3) No unmatched stores (location_name should never be just an empty ", " or NULL).
--    Any rows here mean a locationId missing from worst_performing_stores — fill the
--    dim or fall back to the id.
SELECT count(*) AS unmatched
FROM ioc_sandbox.ai_strategy.reviews_gold
WHERE location_name IS NULL OR trim(location_name) IN ('', ',');
