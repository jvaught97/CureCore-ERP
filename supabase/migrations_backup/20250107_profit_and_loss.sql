-- =====================================================
-- CureCore ERP: Profit & Loss Data Stores
-- Migration: 20250107_profit_and_loss.sql
-- =====================================================

create table if not exists public.pnl_manual_inputs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  created_by uuid not null default auth.uid(),
  month date not null,
  marketing numeric(14,2) not null default 0,
  rnd numeric(14,2) not null default 0,
  equipment numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(created_by, month)
);

create index if not exists pnl_manual_inputs_month_idx
  on public.pnl_manual_inputs(created_by, month);

alter table public.pnl_manual_inputs enable row level security;

create policy "pnl_manual_inputs_select"
  on public.pnl_manual_inputs
  for select
  using (created_by = auth.uid());

create policy "pnl_manual_inputs_upsert"
  on public.pnl_manual_inputs
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create table if not exists public.pnl_monthly_summary (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  created_by uuid not null default auth.uid(),
  month date not null,
  revenue numeric(14,2) not null default 0,
  cogm numeric(14,2) not null default 0,
  finished_goods_delta numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(created_by, month)
);

create index if not exists pnl_monthly_summary_month_idx
  on public.pnl_monthly_summary(created_by, month);

alter table public.pnl_monthly_summary enable row level security;

create policy "pnl_monthly_summary_select"
  on public.pnl_monthly_summary
  for select
  using (created_by = auth.uid());

create policy "pnl_monthly_summary_upsert"
  on public.pnl_monthly_summary
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_pnl_manual_inputs_updated_at'
  ) then
    create trigger trg_pnl_manual_inputs_updated_at
      before update on public.pnl_manual_inputs
      for each row
      execute function update_updated_at_column();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_pnl_monthly_summary_updated_at'
  ) then
    create trigger trg_pnl_monthly_summary_updated_at
      before update on public.pnl_monthly_summary
      for each row
      execute function update_updated_at_column();
  end if;
end $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
