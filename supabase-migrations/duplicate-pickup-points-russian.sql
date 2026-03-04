-- Migration: Duplicate pickup points with Russian translations
-- Date: 2025-11-06
-- Description: Creates Russian versions of all existing Uzbek pickup points

-- First, ensure all existing points are marked as 'uz' language
UPDATE pickup_points
SET language = 'uz'
WHERE language IS NULL OR language = 'uz';

-- Create Russian duplicates with translated state and city names
-- Note: Addresses (street names) kept in Latin as per requirement

INSERT INTO pickup_points (
  courier_service,
  state,
  city,
  address,
  working_hours,
  phone,
  language
)
SELECT
  courier_service,
  CASE state
    -- Translate states to Russian
    WHEN 'Toshkent viloyati' THEN 'Ташкентская область'
    WHEN 'Tashkent Region' THEN 'Ташкентская область'
    WHEN 'Samarqand viloyati' THEN 'Самаркандская область'
    WHEN 'Samarkand Region' THEN 'Самаркандская область'
    WHEN 'Buxoro viloyati' THEN 'Бухарская область'
    WHEN 'Bukhara Region' THEN 'Бухарская область'
    WHEN 'Farg''ona viloyati' THEN 'Ферганская область'
    WHEN 'Fergana Region' THEN 'Ферганская область'
    WHEN 'Andijon viloyati' THEN 'Андижанская область'
    WHEN 'Andijan Region' THEN 'Андижанская область'
    WHEN 'Namangan viloyati' THEN 'Наманганская область'
    WHEN 'Namangan Region' THEN 'Наманганская область'
    WHEN 'Qashqadaryo viloyati' THEN 'Кашкадарьинская область'
    WHEN 'Kashkadarya Region' THEN 'Кашкадарьинская область'
    WHEN 'Surxondaryo viloyati' THEN 'Сурхандарьинская область'
    WHEN 'Surkhandarya Region' THEN 'Сурхандарьинская область'
    WHEN 'Jizzax viloyati' THEN 'Джизакская область'
    WHEN 'Jizzakh Region' THEN 'Джизакская область'
    WHEN 'Sirdaryo viloyati' THEN 'Сырдарьинская область'
    WHEN 'Sirdaryo Region' THEN 'Сырдарьинская область'
    WHEN 'Xorazm viloyati' THEN 'Хорезмская область'
    WHEN 'Khorezm Region' THEN 'Хорезмская область'
    WHEN 'Navoiy viloyati' THEN 'Навоийская область'
    WHEN 'Navoi Region' THEN 'Навоийская область'
    WHEN 'Qoraqalpog''iston Respublikasi' THEN 'Республика Каракалпакстан'
    WHEN 'Karakalpakstan' THEN 'Республика Каракалпакстан'
    WHEN 'Toshkent shahri' THEN 'город Ташкент'
    WHEN 'Tashkent' THEN 'город Ташкент'
    ELSE state -- Keep original if not in translation list
  END,
  CASE city
    -- Translate cities to Russian
    WHEN 'Toshkent' THEN 'Ташкент'
    WHEN 'Tashkent' THEN 'Ташкент'
    WHEN 'Samarqand' THEN 'Самарканд'
    WHEN 'Samarkand' THEN 'Самарканд'
    WHEN 'Buxoro' THEN 'Бухара'
    WHEN 'Bukhara' THEN 'Бухара'
    WHEN 'Farg''ona' THEN 'Фергана'
    WHEN 'Fergana' THEN 'Фергана'
    WHEN 'Andijon' THEN 'Андижан'
    WHEN 'Andijan' THEN 'Андижан'
    WHEN 'Namangan' THEN 'Наманган'
    WHEN 'Qarshi' THEN 'Карши'
    WHEN 'Karshi' THEN 'Карши'
    WHEN 'Nukus' THEN 'Нукус'
    WHEN 'Urganch' THEN 'Ургенч'
    WHEN 'Urgench' THEN 'Ургенч'
    WHEN 'Jizzax' THEN 'Джизак'
    WHEN 'Jizzakh' THEN 'Джизак'
    WHEN 'Navoiy' THEN 'Навои'
    WHEN 'Navoi' THEN 'Навои'
    WHEN 'Termiz' THEN 'Термез'
    WHEN 'Termez' THEN 'Термез'
    WHEN 'Guliston' THEN 'Гулистан'
    WHEN 'Gulistan' THEN 'Гулистан'
    ELSE city -- Keep original if not in translation list
  END,
  address, -- Keep address in Latin as per requirement
  working_hours,
  phone,
  'ru' -- Set language to Russian
FROM pickup_points
WHERE language = 'uz' -- Only duplicate Uzbek entries
  AND NOT EXISTS (
    -- Avoid duplicates if script run multiple times
    SELECT 1 FROM pickup_points ru
    WHERE ru.courier_service = pickup_points.courier_service
      AND ru.address = pickup_points.address
      AND ru.language = 'ru'
  );

-- Create index for language-based filtering if not exists
CREATE INDEX IF NOT EXISTS idx_pickup_points_language ON pickup_points(language);

-- Create composite index for faster queries
CREATE INDEX IF NOT EXISTS idx_pickup_points_courier_lang
  ON pickup_points(courier_service, language);

-- Show summary
SELECT
  language,
  COUNT(*) as total_points,
  COUNT(DISTINCT courier_service) as unique_couriers,
  COUNT(DISTINCT state) as unique_states,
  COUNT(DISTINCT city) as unique_cities
FROM pickup_points
GROUP BY language
ORDER BY language;

-- Show some examples
SELECT
  courier_service,
  state,
  city,
  LEFT(address, 50) as address_preview,
  language
FROM pickup_points
ORDER BY courier_service, language
LIMIT 10;
