create extension if not exists "uuid-ossp";

create type sales_order_status as enum ('draft','confirmed','picking','shipped','closed');

create table if not exists public.sales_orders (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  quote_id uuid references public.crm_quotes(id) on delete set null,
  account_id uuid references public.crm_accounts(id) on delete set null,
  status sales_order_status not null default 'draft',
  currency text default 'USD',
  subtotal numeric,
  tax_total numeric,
  total numeric,
  notes text,
  reserved_at timestamptz,
  confirmed_at timestamptz,
  picking_started_at timestamptz,
  shipped_at timestamptz,
  closed_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sales_order_lines (
  id uuid primary key default uuid_generate_v4(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  sku_id uuid,
  description text,
  qty_ordered numeric,
  qty_allocated numeric,
  qty_shipped numeric,
  uom text,
  unit_price numeric,
  discount_pct numeric,
  tax_code text,
  created_by uuid not null,
  org_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sales_orders_org_idx on public.sales_orders(org_id);
create index if not exists sales_orders_status_idx on public.sales_orders(status);
create index if not exists sales_order_lines_order_idx on public.sales_order_lines(sales_order_id);

alter table public.sales_orders enable row level security;
alter table public.sales_order_lines enable row level security;

create policy sales_orders_policy on public.sales_orders using (created_by = auth.uid());
create policy sales_orders_policy_mod on public.sales_orders for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy sales_order_lines_policy on public.sales_order_lines using (created_by = auth.uid());
create policy sales_order_lines_policy_mod on public.sales_order_lines for all using (created_by = auth.uid()) with check (created_by = auth.uid());
