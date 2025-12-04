-- R&D Formula Versioning and Cost Tracking Migration
-- This migration adds version control and cost tracking to the R&D system

-- ============================================================================
-- STEP 1: Add versioning columns to rd_formulas
-- ============================================================================

ALTER TABLE rd_formulas
  ADD COLUMN version_major INTEGER,
  ADD COLUMN version_minor INTEGER,
  ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN parent_version_id UUID REFERENCES rd_formulas(id);

-- Add comment to explain the columns
COMMENT ON COLUMN rd_formulas.version_major IS 'Major version number (e.g., 1 in v1.2)';
COMMENT ON COLUMN rd_formulas.version_minor IS 'Minor version number (e.g., 2 in v1.2)';
COMMENT ON COLUMN rd_formulas.is_locked IS 'When true, this version cannot be edited (historical version)';
COMMENT ON COLUMN rd_formulas.parent_version_id IS 'References the previous version this was created from';

-- ============================================================================
-- STEP 2: Add cost tracking columns to rd_test_batches
-- ============================================================================

ALTER TABLE rd_test_batches
  ADD COLUMN ingredient_cost DECIMAL(10,2),
  ADD COLUMN packaging_cost DECIMAL(10,2),
  ADD COLUMN labor_cost DECIMAL(10,2),
  ADD COLUMN overhead_cost DECIMAL(10,2),
  ADD COLUMN total_batch_cost DECIMAL(10,2);

-- Add comments to explain the columns
COMMENT ON COLUMN rd_test_batches.ingredient_cost IS 'Auto-calculated from formula snapshot ingredient costs';
COMMENT ON COLUMN rd_test_batches.packaging_cost IS 'Optional: User-entered packaging costs for this batch';
COMMENT ON COLUMN rd_test_batches.labor_cost IS 'Optional: User-entered labor costs for this batch';
COMMENT ON COLUMN rd_test_batches.overhead_cost IS 'Optional: User-entered overhead costs for this batch';
COMMENT ON COLUMN rd_test_batches.total_batch_cost IS 'Auto-calculated: ingredient_cost + packaging_cost + labor_cost + overhead_cost';

-- ============================================================================
-- STEP 3: Add unique constraint on formula name + version
-- ============================================================================

ALTER TABLE rd_formulas
  ADD CONSTRAINT rd_formulas_name_version_unique UNIQUE (name, version);

-- ============================================================================
-- STEP 4: Create indexes for efficient queries
-- ============================================================================

CREATE INDEX idx_rd_formulas_name ON rd_formulas(name);
CREATE INDEX idx_rd_formulas_version_major_minor ON rd_formulas(version_major, version_minor);
CREATE INDEX idx_rd_formulas_parent_version ON rd_formulas(parent_version_id);
CREATE INDEX idx_rd_formulas_is_locked ON rd_formulas(is_locked);

-- ============================================================================
-- STEP 5: Create function to parse version string into integers
-- ============================================================================

CREATE OR REPLACE FUNCTION parse_version_to_integers()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract major and minor version from version string (e.g., "v1.2" -> 1, 2)
  IF NEW.version IS NOT NULL AND NEW.version ~ '^v?\d+\.\d+$' THEN
    -- Remove 'v' prefix if present and split by '.'
    NEW.version_major := CAST(split_part(regexp_replace(NEW.version, '^v', ''), '.', 1) AS INTEGER);
    NEW.version_minor := CAST(split_part(regexp_replace(NEW.version, '^v', ''), '.', 2) AS INTEGER);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically parse version on insert/update
CREATE TRIGGER trg_parse_version_to_integers
  BEFORE INSERT OR UPDATE OF version ON rd_formulas
  FOR EACH ROW
  EXECUTE FUNCTION parse_version_to_integers();

-- ============================================================================
-- STEP 6: Create function to get next version number
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_formula_version(
  p_formula_name TEXT,
  p_change_type TEXT
) RETURNS TEXT AS $$
DECLARE
  v_current_major INTEGER;
  v_current_minor INTEGER;
  v_next_major INTEGER;
  v_next_minor INTEGER;
BEGIN
  -- Get the highest version for this formula name
  SELECT version_major, version_minor
  INTO v_current_major, v_current_minor
  FROM rd_formulas
  WHERE name = p_formula_name
  ORDER BY version_major DESC, version_minor DESC
  LIMIT 1;

  -- If no versions exist, start at v1.0
  IF v_current_major IS NULL THEN
    RETURN 'v1.0';
  END IF;

  -- Calculate next version based on change type
  IF p_change_type = 'major' THEN
    v_next_major := v_current_major + 1;
    v_next_minor := 0;
  ELSE -- minor change
    v_next_major := v_current_major;
    v_next_minor := v_current_minor + 1;
  END IF;

  RETURN 'v' || v_next_major || '.' || v_next_minor;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: Create function to calculate ingredient cost from snapshot
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_ingredient_cost_from_snapshot(
  p_formula_snapshot JSONB
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total_cost DECIMAL(10,2) := 0;
  v_ingredient JSONB;
BEGIN
  -- Loop through each ingredient in the snapshot
  FOR v_ingredient IN SELECT * FROM jsonb_array_elements(p_formula_snapshot->'ingredients')
  LOOP
    -- Add up: (quantity * cost_per_unit) for each ingredient
    -- Handle null cost_per_unit as 0
    v_total_cost := v_total_cost + (
      CAST(v_ingredient->>'quantity' AS DECIMAL(10,2)) *
      COALESCE(CAST(v_ingredient->>'cost_per_unit' AS DECIMAL(10,2)), 0)
    );
  END LOOP;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: Create trigger function to auto-calculate total batch cost
-- ============================================================================

CREATE OR REPLACE FUNCTION update_test_batch_total_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total cost as sum of all cost components
  NEW.total_batch_cost :=
    COALESCE(NEW.ingredient_cost, 0) +
    COALESCE(NEW.packaging_cost, 0) +
    COALESCE(NEW.labor_cost, 0) +
    COALESCE(NEW.overhead_cost, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate total cost on insert/update
CREATE TRIGGER trg_update_test_batch_total_cost
  BEFORE INSERT OR UPDATE OF ingredient_cost, packaging_cost, labor_cost, overhead_cost
  ON rd_test_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_test_batch_total_cost();

-- ============================================================================
-- STEP 9: Backfill existing formulas with v1.0
-- ============================================================================

-- Set all existing formulas to v1.0 if they don't have a version
UPDATE rd_formulas
SET version = 'v1.0'
WHERE version IS NULL OR version = '';

-- For formulas that already have a version string but no integers
UPDATE rd_formulas
SET version_major = CAST(split_part(regexp_replace(version, '^v', ''), '.', 1) AS INTEGER),
    version_minor = CAST(split_part(regexp_replace(version, '^v', ''), '.', 2) AS INTEGER)
WHERE version IS NOT NULL
  AND version ~ '^v?\d+\.\d+$'
  AND (version_major IS NULL OR version_minor IS NULL);

-- ============================================================================
-- STEP 10: Backfill test batch ingredient costs from formula snapshots
-- ============================================================================

-- Calculate ingredient costs for existing test batches that have formula snapshots
UPDATE rd_test_batches
SET ingredient_cost = calculate_ingredient_cost_from_snapshot(formula_snapshot)
WHERE formula_snapshot IS NOT NULL
  AND ingredient_cost IS NULL;

-- ============================================================================
-- STEP 11: Add RLS policies for versioning
-- ============================================================================

-- Users can view all versions of formulas they created
-- (existing SELECT policy should already cover this)

-- Users can only update formulas that are not locked
DROP POLICY IF EXISTS rd_formulas_update ON rd_formulas;
CREATE POLICY rd_formulas_update ON rd_formulas
  FOR UPDATE
  USING (created_by = auth.uid() AND is_locked = FALSE)
  WITH CHECK (created_by = auth.uid() AND is_locked = FALSE);

-- Users can only delete formulas that are not locked
DROP POLICY IF EXISTS rd_formulas_delete ON rd_formulas;
CREATE POLICY rd_formulas_delete ON rd_formulas
  FOR DELETE
  USING (created_by = auth.uid() AND is_locked = FALSE);

-- ============================================================================
-- STEP 12: Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION get_next_formula_version IS 'Returns the next version string (e.g., v1.1 or v2.0) for a formula';
COMMENT ON FUNCTION calculate_ingredient_cost_from_snapshot IS 'Calculates total ingredient cost from a formula snapshot JSONB';
COMMENT ON FUNCTION parse_version_to_integers IS 'Trigger function to parse version string into version_major and version_minor';
COMMENT ON FUNCTION update_test_batch_total_cost IS 'Trigger function to auto-calculate total_batch_cost from all cost components';
