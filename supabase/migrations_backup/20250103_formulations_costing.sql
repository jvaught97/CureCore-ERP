-- Add costing support to formulations table

-- Ensure formulations table exists
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'formulations'
  ) then
    create table public.formulations (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      version text not null default 'v1.0',
      status text not null default 'draft',
      notes text,
      steps text,
      packaging_steps text,
      created_by uuid not null,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
  end if;
end
$$;

-- Add costing-related columns
alter table if exists public.formulations
  add column if not exists unit_pack_size_value numeric;

alter table if exists public.formulations
  add column if not exists unit_pack_size_unit text;

alter table if exists public.formulations
  add column if not exists process_yield_pct numeric;

alter table if exists public.formulations
  add column if not exists total_manufacturing_cost numeric;

-- Set default yield percentage to 100%
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'formulations'
      and column_name = 'process_yield_pct'
  ) then
    update public.formulations
      set process_yield_pct = 100
      where process_yield_pct is null;
    alter table public.formulations
      alter column process_yield_pct set default 100;
  end if;
end
$$;

-- Ensure formulation_ingredients table exists
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'formulation_ingredients'
  ) then
    create table public.formulation_ingredients (
      id uuid primary key default gen_random_uuid(),
      formulation_id uuid not null references public.formulations(id) on delete cascade,
      ingredient_id uuid not null references public.ingredients(id),
      phase text,
      percentage numeric not null,
      sort_order integer,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index formulation_ingredients_formulation_idx on public.formulation_ingredients(formulation_id);
  end if;
end
$$;

-- Ensure formulation_packaging table exists
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'formulation_packaging'
  ) then
    create table public.formulation_packaging (
      id uuid primary key default gen_random_uuid(),
      formulation_id uuid not null references public.formulations(id) on delete cascade,
      packaging_id uuid not null references public.packaging(id),
      quantity_per_unit numeric not null,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index formulation_packaging_formulation_idx on public.formulation_packaging(formulation_id);
  end if;
end
$$;

-- Add density column to ingredients if not exists (for unit conversion)
alter table if exists public.ingredients
  add column if not exists density_g_per_ml numeric;

-- Enable RLS on formulations
alter table if exists public.formulations enable row level security;

create policy if not exists formulations_select on public.formulations
  for select using (true); -- Adjust based on your auth requirements

create policy if not exists formulations_insert on public.formulations
  for insert with check (created_by = auth.uid());

create policy if not exists formulations_update on public.formulations
  for update using (created_by = auth.uid());

create policy if not exists formulations_delete on public.formulations
  for delete using (created_by = auth.uid());

-- Enable RLS on formulation_ingredients
alter table if exists public.formulation_ingredients enable row level security;

create policy if not exists formulation_ingredients_select on public.formulation_ingredients
  for select using (true);

create policy if not exists formulation_ingredients_mod on public.formulation_ingredients
  for all
  using (
    exists (
      select 1 from public.formulations
      where formulations.id = formulation_ingredients.formulation_id
        and formulations.created_by = auth.uid()
    )
  );

-- Enable RLS on formulation_packaging
alter table if exists public.formulation_packaging enable row level security;

create policy if not exists formulation_packaging_select on public.formulation_packaging
  for select using (true);

create policy if not exists formulation_packaging_mod on public.formulation_packaging
  for all
  using (
    exists (
      select 1 from public.formulations
      where formulations.id = formulation_packaging.formulation_id
        and formulations.created_by = auth.uid()
    )
  );
