-- R&D Test Batches Migration
-- Allows users to run multiple test batches from R&D formulas and record results before graduating to production

-- ============================================================================
-- R&D Test Batches Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rd_test_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rd_formula_id UUID NOT NULL REFERENCES public.rd_formulas(id) ON DELETE CASCADE,
  test_number INTEGER NOT NULL,
  batch_code TEXT NOT NULL UNIQUE,

  -- Batch specifications
  batch_size NUMERIC NOT NULL,
  batch_size_unit TEXT NOT NULL,
  expected_yield NUMERIC,
  expected_yield_unit TEXT,

  -- Execution tracking
  test_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  tester_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'failed')),

  -- Formula snapshot (preserves formula state at test time)
  formula_snapshot JSONB,

  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),

  CONSTRAINT unique_test_number UNIQUE(rd_formula_id, test_number)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS rd_test_batches_formula_idx ON public.rd_test_batches(rd_formula_id);
CREATE INDEX IF NOT EXISTS rd_test_batches_status_idx ON public.rd_test_batches(status);
CREATE INDEX IF NOT EXISTS rd_test_batches_created_by_idx ON public.rd_test_batches(created_by);

-- ============================================================================
-- R&D Test Results Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rd_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_batch_id UUID NOT NULL REFERENCES public.rd_test_batches(id) ON DELETE CASCADE,

  -- Yield outcomes
  actual_yield NUMERIC,
  actual_yield_unit TEXT,
  yield_percentage NUMERIC, -- actual/expected * 100

  -- Quality assessment
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  passed_requirements BOOLEAN DEFAULT false,

  -- Detailed observations
  appearance_notes TEXT,
  viscosity_notes TEXT,
  scent_notes TEXT,
  stability_notes TEXT,
  sensory_notes TEXT,

  -- Issues tracking (JSONB array of {type, severity, description})
  issues JSONB DEFAULT '[]'::jsonb,

  -- Documentation (JSONB arrays)
  photos JSONB DEFAULT '[]'::jsonb, -- [{url, caption, uploaded_at}]
  documents JSONB DEFAULT '[]'::jsonb, -- [{url, name, type, uploaded_at}]

  -- Overall notes
  general_notes TEXT,
  adjustments_needed TEXT,
  next_steps TEXT,

  -- Graduation tracking
  ready_for_production BOOLEAN DEFAULT false,
  graduated_at TIMESTAMPTZ,
  production_formula_id UUID REFERENCES public.formulas(id),

  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),

  CONSTRAINT one_result_per_test UNIQUE(test_batch_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS rd_test_results_test_batch_idx ON public.rd_test_results(test_batch_id);
CREATE INDEX IF NOT EXISTS rd_test_results_quality_idx ON public.rd_test_results(quality_rating);
CREATE INDEX IF NOT EXISTS rd_test_results_production_formula_idx ON public.rd_test_results(production_formula_id);

-- ============================================================================
-- R&D Test Metrics Table (flexible key-value for custom metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rd_test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_batch_id UUID NOT NULL REFERENCES public.rd_test_batches(id) ON DELETE CASCADE,

  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metric_unit TEXT,
  target_value TEXT,
  passed BOOLEAN,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS rd_test_metrics_test_batch_idx ON public.rd_test_metrics(test_batch_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.rd_test_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rd_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rd_test_metrics ENABLE ROW LEVEL SECURITY;

-- rd_test_batches policies
CREATE POLICY rd_test_batches_select
  ON public.rd_test_batches
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY rd_test_batches_insert
  ON public.rd_test_batches
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY rd_test_batches_update
  ON public.rd_test_batches
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY rd_test_batches_delete
  ON public.rd_test_batches
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Anon policies (for bypass auth mode)
CREATE POLICY rd_test_batches_all_anon
  ON public.rd_test_batches
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- rd_test_results policies
CREATE POLICY rd_test_results_select
  ON public.rd_test_results
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY rd_test_results_insert
  ON public.rd_test_results
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY rd_test_results_update
  ON public.rd_test_results
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY rd_test_results_delete
  ON public.rd_test_results
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Anon policies (for bypass auth mode)
CREATE POLICY rd_test_results_all_anon
  ON public.rd_test_results
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- rd_test_metrics policies
CREATE POLICY rd_test_metrics_select
  ON public.rd_test_metrics
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rd_test_batches
    WHERE rd_test_batches.id = rd_test_metrics.test_batch_id
    AND rd_test_batches.created_by = auth.uid()
  ));

CREATE POLICY rd_test_metrics_insert
  ON public.rd_test_metrics
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rd_test_batches
    WHERE rd_test_batches.id = rd_test_metrics.test_batch_id
    AND rd_test_batches.created_by = auth.uid()
  ));

CREATE POLICY rd_test_metrics_update
  ON public.rd_test_metrics
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rd_test_batches
    WHERE rd_test_batches.id = rd_test_metrics.test_batch_id
    AND rd_test_batches.created_by = auth.uid()
  ));

CREATE POLICY rd_test_metrics_delete
  ON public.rd_test_metrics
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rd_test_batches
    WHERE rd_test_batches.id = rd_test_metrics.test_batch_id
    AND rd_test_batches.created_by = auth.uid()
  ));

-- Anon policies (for bypass auth mode)
CREATE POLICY rd_test_metrics_all_anon
  ON public.rd_test_metrics
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to auto-generate batch code
CREATE OR REPLACE FUNCTION generate_rd_batch_code(formula_id UUID, test_num INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  formula_name TEXT;
  abbrev TEXT;
BEGIN
  -- Get formula name
  SELECT name INTO formula_name FROM public.rd_formulas WHERE id = formula_id;

  -- Create abbreviation (first 3 chars uppercase)
  abbrev := UPPER(SUBSTRING(REGEXP_REPLACE(formula_name, '[^a-zA-Z0-9]', '', 'g'), 1, 3));

  -- Return batch code like "ABC-T001"
  RETURN abbrev || '-T' || LPAD(test_num::TEXT, 3, '0');
END;
$$;

-- Function to auto-increment test number
CREATE OR REPLACE FUNCTION get_next_test_number(formula_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(test_number), 0) + 1
  INTO next_num
  FROM public.rd_test_batches
  WHERE rd_formula_id = formula_id;

  RETURN next_num;
END;
$$;

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER rd_test_batches_updated_at
  BEFORE UPDATE ON public.rd_test_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER rd_test_results_updated_at
  BEFORE UPDATE ON public.rd_test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
