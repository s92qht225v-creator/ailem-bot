-- Check app_settings table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'app_settings'
ORDER BY ordinal_position;

-- Check existing data
SELECT * FROM app_settings;
