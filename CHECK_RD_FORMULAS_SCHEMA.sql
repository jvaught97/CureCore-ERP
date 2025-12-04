-- ===================================================================
-- DIAGNOSTIC: Check R&D Formulas Schema
-- Run this in Supabase SQL Editor to diagnose the issue
-- ===================================================================

-- Check if rd_formulas table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'rd_formulas'
) as rd_formulas_exists;

-- Check if rd_formula_ingredients table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'rd_formula_ingredients'
) as rd_formula_ingredients_exists;

-- Check columns in rd_formulas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rd_formulas'
ORDER BY ordinal_position;

-- Check columns in rd_formula_ingredients
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rd_formula_ingredients'
ORDER BY ordinal_position;

-- Check foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('rd_formulas', 'rd_formula_ingredients');

-- Try to select one formula with its ingredients
SELECT
  f.id,
  f.name,
  f.version,
  COUNT(fi.id) as ingredient_count
FROM rd_formulas f
LEFT JOIN rd_formula_ingredients fi ON fi.formula_id = f.id
GROUP BY f.id, f.name, f.version
LIMIT 5;
