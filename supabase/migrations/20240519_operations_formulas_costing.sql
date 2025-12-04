-- Operations formulas costing support

-- Ensure base tables exist
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'formulas'
  ) then
    create table public.formulas (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      version text not null default 'v1.0',
      status text not null default 'draft',
      notes text,
      unit_pack_size_value numeric,
      unit_pack_size_unit text,
      process_yield_pct numeric not null default 100,
      created_by uuid not null,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
  end if;
end
$$;

alter table if exists public.formulas
  add column if not exists unit_pack_size_value numeric;

alter table if exists public.formulas
  add column if not exists unit_pack_size_unit text;

alter table if exists public.formulas
  add column if not exists process_yield_pct numeric;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'formulas'
      and column_name = 'process_yield_pct'
  ) then
    update public.formulas
      set process_yield_pct = 100
      where process_yield_pct is null;
    alter table public.formulas
      alter column process_yield_pct set default 100;
    alter table public.formulas
      alter column process_yield_pct set not null;
  end if;
end
$$;

alter table if exists public.formulas enable row level security;

drop policy if exists formulas_select on public.formulas;
create policy formulas_select on public.formulas
  for select using (created_by = auth.uid());

drop policy if exists formulas_mod on public.formulas;
create policy formulas_mod on public.formulas
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Inventory items
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inventory_items'
  ) then
    create table public.inventory_items (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      base_unit text not null,
      cost_per_base_unit numeric,
      density_g_per_ml numeric,
      created_by uuid not null,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
  end if;
end
$$;

alter table if exists public.inventory_items enable row level security;

drop policy if exists inventory_items_select on public.inventory_items;
create policy inventory_items_select on public.inventory_items
  for select using (created_by = auth.uid());

drop policy if exists inventory_items_mod on public.inventory_items;
create policy inventory_items_mod on public.inventory_items
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Formula ingredients
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'formula_ingredients'
  ) then
    create table public.formula_ingredients (
      id uuid primary key default gen_random_uuid(),
      formula_id uuid not null references public.formulas(id) on delete cascade,
      ingredient_id uuid not null references public.inventory_items(id),
      phase text,
      percentage numeric,
      qty_value numeric,
      qty_unit text,
      created_by uuid not null,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index formula_ingredients_formula_idx on public.formula_ingredients(formula_id);
  end if;
end
$$;

alter table if exists public.formula_ingredients enable row level security;

drop policy if exists formula_ingredients_select on public.formula_ingredients;
create policy formula_ingredients_select on public.formula_ingredients
  for select using (created_by = auth.uid());

drop policy if exists formula_ingredients_mod on public.formula_ingredients;
create policy formula_ingredients_mod on public.formula_ingredients
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Formula packaging
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'formula_packaging'
  ) then
    create table public.formula_packaging (
      id uuid primary key default gen_random_uuid(),
      formula_id uuid not null references public.formulas(id) on delete cascade,
      pack_item_id uuid not null references public.inventory_items(id),
      qty_value numeric,
      qty_unit text,
      created_by uuid not null,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index formula_packaging_formula_idx on public.formula_packaging(formula_id);
  end if;
end
$$;

alter table if exists public.formula_packaging enable row level security;

drop policy if exists formula_packaging_select on public.formula_packaging;
create policy formula_packaging_select on public.formula_packaging
  for select using (created_by = auth.uid());

drop policy if exists formula_packaging_mod on public.formula_packaging;
create policy formula_packaging_mod on public.formula_packaging
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
