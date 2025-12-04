-- Ensure supplier contact fields exist in environments that were created
-- before the suppliers table included the extended columns used by the UI.
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS terms TEXT;
