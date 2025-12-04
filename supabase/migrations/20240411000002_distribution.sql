create extension if not exists "uuid-ossp";

create table if not exists public.warehouses (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  name text not null,
  code text,
  address jsonb,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.locations (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references public.warehouses(id) on delete cascade,
  org_id uuid,
  code text not null,
  description text,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create type shipment_status as enum ('draft','planned','picking','packed','in_transit','delivered','closed');

create table if not exists public.shipments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  sales_order_id uuid references public.sales_orders(id) on delete set null,
  carrier text,
  service text,
  ship_date date,
  status shipment_status default 'draft',
  tracking_number text,
  notes text,
  total_weight numeric,
  total_cost numeric,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shipment_orders (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid references public.shipments(id) on delete cascade,
  sales_order_id uuid references public.sales_orders(id) on delete set null,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shipment_lines (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid references public.shipments(id) on delete cascade,
  sales_order_line_id uuid references public.sales_order_lines(id) on delete set null,
  qty numeric,
  uom text,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.picks (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid references public.shipments(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  sales_order_line_id uuid references public.sales_order_lines(id) on delete set null,
  qty numeric,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cartons (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid references public.shipments(id) on delete cascade,
  label text,
  weight numeric,
  length numeric,
  width numeric,
  height numeric,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.freight_costs (
  id uuid primary key default uuid_generate_v4(),
  shipment_id uuid references public.shipments(id) on delete cascade,
  cost_type text,
  amount numeric,
  currency text default 'USD',
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists warehouses_org_idx on public.warehouses(org_id);
create index if not exists locations_wh_idx on public.locations(warehouse_id);
create index if not exists shipments_org_idx on public.shipments(org_id);
create index if not exists shipments_status_idx on public.shipments(status);
create index if not exists shipment_orders_shipment_idx on public.shipment_orders(shipment_id);
create index if not exists shipment_lines_shipment_idx on public.shipment_lines(shipment_id);
create index if not exists picks_shipment_idx on public.picks(shipment_id);
create index if not exists cartons_shipment_idx on public.cartons(shipment_id);
create index if not exists freight_costs_shipment_idx on public.freight_costs(shipment_id);

alter table public.warehouses enable row level security;
alter table public.locations enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_orders enable row level security;
alter table public.shipment_lines enable row level security;
alter table public.picks enable row level security;
alter table public.cartons enable row level security;
alter table public.freight_costs enable row level security;

create policy warehouses_policy on public.warehouses using (created_by = auth.uid());
create policy warehouses_policy_mod on public.warehouses for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy locations_policy on public.locations using (created_by = auth.uid());
create policy locations_policy_mod on public.locations for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy shipments_policy on public.shipments using (created_by = auth.uid());
create policy shipments_policy_mod on public.shipments for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy shipment_orders_policy on public.shipment_orders using (created_by = auth.uid());
create policy shipment_orders_policy_mod on public.shipment_orders for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy shipment_lines_policy on public.shipment_lines using (created_by = auth.uid());
create policy shipment_lines_policy_mod on public.shipment_lines for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy picks_policy on public.picks using (created_by = auth.uid());
create policy picks_policy_mod on public.picks for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy cartons_policy on public.cartons using (created_by = auth.uid());
create policy cartons_policy_mod on public.cartons for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy freight_costs_policy on public.freight_costs using (created_by = auth.uid());
create policy freight_costs_policy_mod on public.freight_costs for all using (created_by = auth.uid()) with check (created_by = auth.uid());
