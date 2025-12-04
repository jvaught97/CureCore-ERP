-- Launch estimate tables
create table if not exists public.rd_launch_estimates (
  id uuid primary key default gen_random_uuid(),
  rd_formula_id uuid references public.rd_formulas(id) on delete cascade,
  title text not null,
  pack_size_value numeric,
  pack_size_unit text,
  target_launch_volume_units numeric,
  freight numeric,
  duty_tax numeric,
  insurance numeric,
  handling numeric,
  contingency_pct numeric,
  tooling_nre numeric,
  certification_testing numeric,
  label_design numeric,
  material_waste_pct numeric,
  labor_learning_pct numeric,
  labor_rate_per_hour numeric,
  labor_hours_per_unit numeric,
  overhead_allocation_per_unit numeric,
  proposed_price numeric,
  channel_fees_pct numeric,
  labor_cost_per_unit numeric,
  material_cost_per_unit numeric,
  landed_cost_per_unit numeric,
  total_variable_cost_per_unit numeric,
  gross_margin_pct numeric,
  break_even_units numeric,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.rd_estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.rd_launch_estimates(id) on delete cascade,
  item_type text not null check (item_type in ('ingredient','packaging','other')),
  source_type text,
  ingredient_id uuid,
  rd_ingredient_id uuid,
  name text not null,
  need_purchase boolean default true,
  in_stock boolean default false,
  pack_size_value numeric,
  pack_size_unit text,
  pack_price numeric,
  cost_per_base_unit numeric,
  qty_per_unit_base numeric,
  output_unit text,
  waste_pct numeric,
  supplier_id uuid,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists rd_launch_estimates_formula_idx on public.rd_launch_estimates(rd_formula_id);
create index if not exists rd_launch_estimates_created_by_idx on public.rd_launch_estimates(created_by);
create index if not exists rd_estimate_line_items_estimate_idx on public.rd_estimate_line_items(estimate_id);

alter table public.rd_launch_estimates enable row level security;
alter table public.rd_estimate_line_items enable row level security;

create policy rd_launch_estimates_select on public.rd_launch_estimates
  for select using (created_by = auth.uid());

create policy rd_launch_estimates_mod on public.rd_launch_estimates
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy rd_estimate_line_items_select on public.rd_estimate_line_items
  for select using (created_by = auth.uid());

create policy rd_estimate_line_items_mod on public.rd_estimate_line_items
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());
