create extension if not exists "uuid-ossp";

create table if not exists public.crm_accounts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  name text not null,
  website text,
  phone text,
  billing_address jsonb,
  shipping_address jsonb,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crm_contacts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  account_id uuid references public.crm_accounts(id) on delete set null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  title text,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crm_leads (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  account_id uuid references public.crm_accounts(id) on delete set null,
  name text not null,
  email text,
  phone text,
  source text,
  status text,
  owner_id uuid,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crm_opportunities (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  account_id uuid references public.crm_accounts(id) on delete set null,
  name text not null,
  value_currency text,
  value_amount numeric,
  stage text,
  close_date date,
  owner_id uuid,
  probability_pct numeric,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crm_activities (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  account_id uuid references public.crm_accounts(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  opp_id uuid references public.crm_opportunities(id) on delete set null,
  type text check (type in ('call','email','meeting','task')),
  subject text,
  body text,
  due_at timestamptz,
  done boolean default false,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crm_quotes (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid,
  account_id uuid references public.crm_accounts(id) on delete set null,
  currency text,
  status text check (status in ('draft','sent','accepted','rejected')) default 'draft',
  valid_until date,
  notes text,
  totals jsonb,
  created_by uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crm_quote_lines (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references public.crm_quotes(id) on delete cascade,
  sku_id uuid,
  description text,
  qty numeric,
  uom text,
  unit_price numeric,
  discount_pct numeric,
  tax_code text,
  created_by uuid not null,
  org_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_accounts_org_idx on public.crm_accounts(org_id);
create index if not exists crm_contacts_org_idx on public.crm_contacts(org_id);
create index if not exists crm_leads_org_idx on public.crm_leads(org_id);
create index if not exists crm_opportunities_org_idx on public.crm_opportunities(org_id);
create index if not exists crm_activities_org_idx on public.crm_activities(org_id);
create index if not exists crm_quotes_org_idx on public.crm_quotes(org_id);
create index if not exists crm_quote_lines_org_idx on public.crm_quote_lines(org_id);
create index if not exists crm_opportunities_stage_idx on public.crm_opportunities(stage);
create index if not exists crm_opportunities_close_idx on public.crm_opportunities(close_date);
create index if not exists crm_leads_status_idx on public.crm_leads(status);

alter table public.crm_accounts enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_opportunities enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_quotes enable row level security;
alter table public.crm_quote_lines enable row level security;

create policy crm_accounts_policy on public.crm_accounts using (created_by = auth.uid());
create policy crm_accounts_policy_mod on public.crm_accounts for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy crm_contacts_policy on public.crm_contacts using (created_by = auth.uid());
create policy crm_contacts_policy_mod on public.crm_contacts for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy crm_leads_policy on public.crm_leads using (created_by = auth.uid());
create policy crm_leads_policy_mod on public.crm_leads for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy crm_opportunities_policy on public.crm_opportunities using (created_by = auth.uid());
create policy crm_opportunities_policy_mod on public.crm_opportunities for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy crm_activities_policy on public.crm_activities using (created_by = auth.uid());
create policy crm_activities_policy_mod on public.crm_activities for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy crm_quotes_policy on public.crm_quotes using (created_by = auth.uid());
create policy crm_quotes_policy_mod on public.crm_quotes for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy crm_quote_lines_policy on public.crm_quote_lines using (created_by = auth.uid());
create policy crm_quote_lines_policy_mod on public.crm_quote_lines for all using (created_by = auth.uid()) with check (created_by = auth.uid());
