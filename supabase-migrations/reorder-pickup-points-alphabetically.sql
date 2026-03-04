-- Reorder pickup points alphabetically
-- Run this in Supabase SQL Editor to sort pickup points by courier → state → city → address

-- Update display_order to arrange pickup points alphabetically
WITH ordered_points AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY
        courier_service ASC,
        state ASC,
        city ASC,
        address ASC
    ) as new_order
  FROM pickup_points
)
UPDATE pickup_points
SET display_order = ordered_points.new_order
FROM ordered_points
WHERE pickup_points.id = ordered_points.id;

-- Verify the new order
SELECT
  display_order,
  courier_service,
  state,
  city,
  address
FROM pickup_points
ORDER BY display_order;
