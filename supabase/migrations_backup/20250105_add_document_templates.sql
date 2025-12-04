-- Add document template columns to org_settings
ALTER TABLE org_settings
ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'Standard Invoice',
ADD COLUMN IF NOT EXISTS po_template TEXT DEFAULT 'Standard PO',
ADD COLUMN IF NOT EXISTS coa_template TEXT DEFAULT 'Standard COA',
ADD COLUMN IF NOT EXISTS batch_record_template TEXT DEFAULT 'Standard Batch Record';
