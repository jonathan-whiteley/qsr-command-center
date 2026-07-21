-- ============================================================================
-- gold_add_location_name.sql
-- ----------------------------------------------------------------------------
-- Purpose: give ioc_sandbox.ai_strategy.reviews_gold a human `location_name`
-- ("City, ST") so the QSR Command Center "Guest Sentiment" tab can label stores
-- and drive its State filter. This is the ONLY change the tab needs on the data
-- side; all array/struct columns stay NATIVE (the app serializes them to JSON at
-- read time in feedback.py._src()).
--
-- Where this normally lives: this exact logic is a step in the enrich notebook
--   (notebooks/sentiment/02_enrich.ipynb, the cell AFTER the ai_query cell). On a
--   normal pipeline run reviews_gold is already written with the right location_name,
--   so this standalone file is only needed to PATCH an already-built table without
--   re-running the notebook.
--
-- Source of City/State: ioc_sandbox.ai_strategy.worst_performing_stores, joined on
--   worst_performing_stores.`Location ID` = reviews_gold.locationId. Verified unique
--   on `Location ID` (safe for MERGE).
-- ============================================================================

-- In-place update: set location_name = "City, ST" for every review whose store is in
-- the dim. concat_ws skips NULL city/state parts; NULLIF('') leaves rows with no
-- city/state untouched (they keep whatever location_name they had, e.g. the locationId).
-- Idempotent: re-running recomputes from the dim each time.
MERGE INTO ioc_sandbox.ai_strategy.reviews_gold AS g
USING (
  SELECT `Location ID` AS loc_id,
         NULLIF(concat_ws(', ', City, State), '') AS city_state
  FROM ioc_sandbox.ai_strategy.worst_performing_stores
) AS s
ON g.locationId = s.loc_id
WHEN MATCHED AND s.city_state IS NOT NULL
  THEN UPDATE SET g.location_name = s.city_state;

-- ---------------------------------------------------------------------------
-- Verification (run after the MERGE). All three should look right:
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

-- 3) Any store still showing a bare numeric location_name = not matched in the dim.
--    Fill the dim or accept the locationId fallback for those.
SELECT count(*) AS unmatched_reviews
FROM ioc_sandbox.ai_strategy.reviews_gold
WHERE location_name RLIKE '^[0-9]+$';
