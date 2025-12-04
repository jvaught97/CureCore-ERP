-- Budgeting module for forward-looking financial planning

-- budgets table: Main budget records
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'budgets'
  ) then
    create table public.budgets (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      fiscal_year integer not null,
      status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
      notes text,
      created_by uuid not null,
      created_at timestamptz not null default timezone('utc'::text, now()),
      updated_at timestamptz not null default timezone('utc'::text, now())
    );
    create index budgets_fiscal_year_idx on public.budgets(fiscal_year);
    create index budgets_status_idx on public.budgets(status);
  end if;
end
$$;

-- budget_lines table: Individual budget line items
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'budget_lines'
  ) then
    create table public.budget_lines (
      id uuid primary key default gen_random_uuid(),
      budget_id uuid not null references public.budgets(id) on delete cascade,
      department text not null check (department in ('R&D', 'Production', 'Marketing', 'Distribution', 'Admin', 'Other')),
      category text not null check (category in ('Labor', 'Ingredients', 'Packaging', 'Marketing', 'Equipment', 'Overhead', 'Other')),
      product_line text,
      month date not null,
      amount numeric(12, 2) not null default 0,
      notes text,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index budget_lines_budget_idx on public.budget_lines(budget_id);
    create index budget_lines_month_idx on public.budget_lines(month);
    create index budget_lines_department_idx on public.budget_lines(department);
  end if;
end
$$;

-- budget_forecasts table: AI/auto-generated forecasts
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'budget_forecasts'
  ) then
    create table public.budget_forecasts (
      id uuid primary key default gen_random_uuid(),
      budget_id uuid not null references public.budgets(id) on delete cascade,
      month date not null,
      forecast_amount numeric(12, 2) not null,
      forecast_method text not null check (forecast_method in ('average', 'linear_growth', 'ai_prediction')),
      confidence_score numeric(3, 2), -- 0.00 to 1.00
      metadata jsonb,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index budget_forecasts_budget_idx on public.budget_forecasts(budget_id);
    create index budget_forecasts_month_idx on public.budget_forecasts(month);
  end if;
end
$$;

-- Enable RLS
alter table if exists public.budgets enable row level security;
alter table if exists public.budget_lines enable row level security;
alter table if exists public.budget_forecasts enable row level security;

-- Drop and recreate policies
do $$
begin
  drop policy if exists budgets_select on public.budgets;
  drop policy if exists budgets_insert on public.budgets;
  drop policy if exists budgets_update on public.budgets;
  drop policy if exists budgets_delete on public.budgets;

  drop policy if exists budget_lines_select on public.budget_lines;
  drop policy if exists budget_lines_mod on public.budget_lines;

  drop policy if exists budget_forecasts_select on public.budget_forecasts;
  drop policy if exists budget_forecasts_mod on public.budget_forecasts;
end
$$;

-- Budgets policies
create policy budgets_select on public.budgets
  for select using (true);

create policy budgets_insert on public.budgets
  for insert with check (created_by = auth.uid());

create policy budgets_update on public.budgets
  for update using (created_by = auth.uid());

create policy budgets_delete on public.budgets
  for delete using (created_by = auth.uid());

-- Budget lines policies
create policy budget_lines_select on public.budget_lines
  for select using (true);

create policy budget_lines_mod on public.budget_lines
  for all
  using (
    exists (
      select 1 from public.budgets
      where budgets.id = budget_lines.budget_id
        and budgets.created_by = auth.uid()
    )
  );

-- Budget forecasts policies
create policy budget_forecasts_select on public.budget_forecasts
  for select using (true);

create policy budget_forecasts_mod on public.budget_forecasts
  for all
  using (
    exists (
      select 1 from public.budgets
      where budgets.id = budget_forecasts.budget_id
        and budgets.created_by = auth.uid()
    )
  );

-- Create view for budget variance analysis
create or replace view public.budget_variance as
select
  bl.id,
  bl.budget_id,
  b.name as budget_name,
  b.fiscal_year,
  bl.department,
  bl.category,
  bl.product_line,
  bl.month,
  bl.amount as budgeted_amount,
  coalesce(actual.total, 0) as actual_amount,
  (coalesce(actual.total, 0) - bl.amount) as variance_amount,
  case
    when bl.amount = 0 then 0
    else round(((coalesce(actual.total, 0) - bl.amount) / bl.amount * 100)::numeric, 2)
  end as variance_percent
from public.budget_lines bl
join public.budgets b on b.id = bl.budget_id
left join lateral (
  -- This would be populated from your actual expense tracking
  -- For now, it's a placeholder that returns 0
  select 0::numeric as total
) actual on true;
