-- Migration: Convert holiday IDs from strings to integers
-- This updates the settings->holidays->blockedHolidays array in location_state table

-- Mapping:
-- 'new_years' -> 1
-- 'mlk_day' -> 2
-- 'presidents_day' -> 3
-- 'memorial_day' -> 4
-- 'independence_day' -> 5
-- 'labor_day' -> 6
-- 'columbus_day' -> 7
-- 'veterans_day' -> 8
-- 'thanksgiving' -> 9
-- 'christmas_eve' -> 10
-- 'christmas' -> 11
-- 'new_years_eve' -> 12

UPDATE location_state
SET settings = jsonb_set(
  settings,
  '{holidays,blockedHolidays}',
  (
    SELECT COALESCE(
      jsonb_agg(
        CASE elem::text
          WHEN '"new_years"' THEN 1
          WHEN '"mlk_day"' THEN 2
          WHEN '"presidents_day"' THEN 3
          WHEN '"memorial_day"' THEN 4
          WHEN '"independence_day"' THEN 5
          WHEN '"labor_day"' THEN 6
          WHEN '"columbus_day"' THEN 7
          WHEN '"veterans_day"' THEN 8
          WHEN '"thanksgiving"' THEN 9
          WHEN '"christmas_eve"' THEN 10
          WHEN '"christmas"' THEN 11
          WHEN '"new_years_eve"' THEN 12
          ELSE NULL
        END
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements(settings->'holidays'->'blockedHolidays') AS elem
  )
)
WHERE settings->'holidays'->'blockedHolidays' IS NOT NULL
  AND jsonb_array_length(settings->'holidays'->'blockedHolidays') > 0
  AND jsonb_typeof(settings->'holidays'->'blockedHolidays'->0) = 'string';

