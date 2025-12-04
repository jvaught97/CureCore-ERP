-- AUDIT LOG
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  entity text not null,
  entity_id uuid,
  input jsonb not null,
  result jsonb,
  created_at timestamptz default now()
);

-- Simple RBAC function placeholder: returns true for now
create or replace function public.can_create_supplier(p_user_id uuid)
returns boolean language sql security definer as $$
  select true;
$$;

-- TODO: align these helper tables with the production schema.
create table if not exists public.supplier_items (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  supplier_sku text,
  pack_size_g numeric not null,
  pack_cost_usd numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (supplier_id, ingredient_id)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete restrict,
  expected_date date,
  status text not null default 'draft',
  created_at timestamptz default now()
);

create table if not exists public.po_lines (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  qty numeric not null,
  uom text not null,
  created_at timestamptz default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  file_url text not null,
  doc_type text not null,
  uploaded_by uuid not null,
  created_at timestamptz default now()
);

-- RLS suggestions (do not enforce here, just doc)
-- alter table public.audit_log enable row level security;
-- create policy "read_own_audit" on public.audit_log
-- for select using (auth.uid() = user_id);
