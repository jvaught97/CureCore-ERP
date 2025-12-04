-- Payroll module for labor cost transparency and tracking

-- employees table: Employee and contractor records
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'employees'
  ) then
    create table public.employees (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text,
      role text not null,
      department text not null check (department in ('R&D', 'Production', 'Marketing', 'Distribution', 'Admin', 'Other')),
      pay_type text not null check (pay_type in ('hourly', 'salary', 'per_batch', 'contractor')),
      rate numeric(10, 2) not null, -- hourly rate, annual salary, or per-batch rate
      status text not null default 'active' check (status in ('active', 'inactive', 'terminated')),
      hire_date date,
      termination_date date,
      notes text,
      created_by uuid not null,
      created_at timestamptz not null default timezone('utc'::text, now()),
      updated_at timestamptz not null default timezone('utc'::text, now())
    );
    create index employees_status_idx on public.employees(status);
    create index employees_department_idx on public.employees(department);
  end if;
end
$$;

-- timesheets table: Time tracking entries
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'timesheets'
  ) then
    create table public.timesheets (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references public.employees(id) on delete cascade,
      date date not null,
      hours_worked numeric(5, 2) not null default 0,
      overtime_hours numeric(5, 2) not null default 0,
      batch_id uuid, -- optional link to batches table
      notes text,
      approved boolean not null default false,
      approved_by uuid,
      approved_at timestamptz,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index timesheets_employee_idx on public.timesheets(employee_id);
    create index timesheets_date_idx on public.timesheets(date);
    create unique index timesheets_employee_date_idx on public.timesheets(employee_id, date);
  end if;
end
$$;

-- payroll_periods table: Pay period summaries
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'payroll_periods'
  ) then
    create table public.payroll_periods (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      start_date date not null,
      end_date date not null,
      status text not null default 'open' check (status in ('open', 'processing', 'closed', 'exported')),
      total_hours numeric(10, 2) not null default 0,
      total_overtime_hours numeric(10, 2) not null default 0,
      total_gross_pay numeric(12, 2) not null default 0,
      notes text,
      closed_by uuid,
      closed_at timestamptz,
      exported_by uuid,
      exported_at timestamptz,
      created_by uuid not null,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index payroll_periods_status_idx on public.payroll_periods(status);
    create index payroll_periods_dates_idx on public.payroll_periods(start_date, end_date);
  end if;
end
$$;

-- payroll_entries table: Individual payroll calculations
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'payroll_entries'
  ) then
    create table public.payroll_entries (
      id uuid primary key default gen_random_uuid(),
      payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
      employee_id uuid not null references public.employees(id),
      regular_hours numeric(10, 2) not null default 0,
      overtime_hours numeric(10, 2) not null default 0,
      gross_pay numeric(12, 2) not null default 0,
      deductions numeric(12, 2) not null default 0,
      net_pay numeric(12, 2) not null default 0,
      notes text,
      created_at timestamptz not null default timezone('utc'::text, now())
    );
    create index payroll_entries_period_idx on public.payroll_entries(payroll_period_id);
    create index payroll_entries_employee_idx on public.payroll_entries(employee_id);
    create unique index payroll_entries_period_employee_idx on public.payroll_entries(payroll_period_id, employee_id);
  end if;
end
$$;

-- Enable RLS
alter table if exists public.employees enable row level security;
alter table if exists public.timesheets enable row level security;
alter table if exists public.payroll_periods enable row level security;
alter table if exists public.payroll_entries enable row level security;

-- Drop and recreate policies
do $$
begin
  drop policy if exists employees_select on public.employees;
  drop policy if exists employees_insert on public.employees;
  drop policy if exists employees_update on public.employees;
  drop policy if exists employees_delete on public.employees;

  drop policy if exists timesheets_select on public.timesheets;
  drop policy if exists timesheets_mod on public.timesheets;

  drop policy if exists payroll_periods_select on public.payroll_periods;
  drop policy if exists payroll_periods_insert on public.payroll_periods;
  drop policy if exists payroll_periods_update on public.payroll_periods;

  drop policy if exists payroll_entries_select on public.payroll_entries;
  drop policy if exists payroll_entries_mod on public.payroll_entries;
end
$$;

-- Employees policies
create policy employees_select on public.employees
  for select using (true);

create policy employees_insert on public.employees
  for insert with check (created_by = auth.uid());

create policy employees_update on public.employees
  for update using (created_by = auth.uid());

create policy employees_delete on public.employees
  for delete using (created_by = auth.uid());

-- Timesheets policies
create policy timesheets_select on public.timesheets
  for select using (true);

create policy timesheets_mod on public.timesheets
  for all using (true); -- Allow anyone with auth to manage timesheets

-- Payroll periods policies
create policy payroll_periods_select on public.payroll_periods
  for select using (true);

create policy payroll_periods_insert on public.payroll_periods
  for insert with check (created_by = auth.uid());

create policy payroll_periods_update on public.payroll_periods
  for update using (created_by = auth.uid());

-- Payroll entries policies
create policy payroll_entries_select on public.payroll_entries
  for select using (true);

create policy payroll_entries_mod on public.payroll_entries
  for all
  using (
    exists (
      select 1 from public.payroll_periods
      where payroll_periods.id = payroll_entries.payroll_period_id
        and payroll_periods.created_by = auth.uid()
    )
  );

-- Create view for labor cost analysis
create or replace view public.labor_cost_summary as
select
  e.id as employee_id,
  e.name as employee_name,
  e.department,
  e.pay_type,
  e.rate,
  count(t.id) as timesheet_count,
  coalesce(sum(t.hours_worked), 0) as total_hours,
  coalesce(sum(t.overtime_hours), 0) as total_overtime,
  case
    when e.pay_type = 'hourly' then coalesce(sum(t.hours_worked * e.rate + t.overtime_hours * e.rate * 1.5), 0)
    when e.pay_type = 'salary' then e.rate / 12 -- monthly salary approximation
    else 0
  end as estimated_cost
from public.employees e
left join public.timesheets t on t.employee_id = e.id
  and t.date >= date_trunc('month', current_date)
  and t.date < date_trunc('month', current_date) + interval '1 month'
where e.status = 'active'
group by e.id, e.name, e.department, e.pay_type, e.rate;
