-- R&D formulas schema
create table if not exists public.rd_formulas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  notes text,
  manufacturing_steps jsonb not null default '[]'::jsonb,
  packaging_materials jsonb default '[]'::jsonb,
  packaging_steps jsonb default '[]'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.rd_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_unit text,
  est_unit_cost numeric,
  supplier_id uuid,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.rd_formula_ingredients (
  id uuid primary key default gen_random_uuid(),
  rd_formula_id uuid not null references public.rd_formulas(id) on delete cascade,
  source_type text not null check (source_type in ('inventory','rd')),
  ingredient_id uuid,
  rd_ingredient_id uuid references public.rd_ingredients(id) on delete set null,
  qty numeric not null,
  unit text not null,
  in_stock boolean default false,
  need_purchase boolean default false,
  est_unit_cost numeric,
  supplier_id uuid,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists rd_formulas_created_by_idx on public.rd_formulas (created_by);
create index if not exists rd_ingredients_created_by_idx on public.rd_ingredients (created_by);
create index if not exists rd_formula_ingredients_formula_idx on public.rd_formula_ingredients (rd_formula_id);

alter table public.rd_formula_ingredients
  add constraint formula_ingredient_source check (
    (source_type = 'inventory' and ingredient_id is not null)
    or
    (source_type = 'rd' and rd_ingredient_id is not null)
  );

-- RLS policies
alter table public.rd_formulas enable row level security;
alter table public.rd_ingredients enable row level security;
alter table public.rd_formula_ingredients enable row level security;

create policy rd_formulas_select on public.rd_formulas
  for select using (created_by = auth.uid());

create policy rd_formulas_mod on public.rd_formulas
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy rd_ingredients_select on public.rd_ingredients
  for select using (created_by = auth.uid());

create policy rd_ingredients_mod on public.rd_ingredients
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy rd_formula_ingredients_select on public.rd_formula_ingredients
  for select using (created_by = auth.uid());

create policy rd_formula_ingredients_mod on public.rd_formula_ingredients
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());
