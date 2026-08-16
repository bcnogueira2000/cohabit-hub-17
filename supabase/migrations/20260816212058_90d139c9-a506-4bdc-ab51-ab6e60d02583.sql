create type public.contract_status as enum ('reserved','active','terminated','cancelled');

create table public.contracts (
  id                uuid primary key default gen_random_uuid(),
  resident_id       uuid not null references public.residents(id),
  lead_id           uuid references public.leads(id),
  start_date        date not null,
  end_date          date not null,
  actual_end_date   date,
  status            public.contract_status not null default 'reserved',
  payment_day       int not null default 1 check (payment_day between 1 and 28),
  auto_renew        boolean not null default false,
  deposit_due       numeric(10,2) not null default 0,
  deposit_received  numeric(10,2) not null default 0,
  deposit_returned  numeric(10,2) not null default 0,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_date >= start_date)
);

grant select, insert, update, delete on public.contracts to authenticated;
grant all on public.contracts to service_role;
alter table public.contracts enable row level security;

create policy "managers manage contracts" on public.contracts for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_contracts_updated_at before update on public.contracts
  for each row execute function public.touch_updated_at();

create table public.contract_rent_periods (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid not null references public.contracts(id) on delete cascade,
  valid_from     date not null,
  monthly_amount numeric(10,2) not null,
  reason         text,
  created_at     timestamptz not null default now(),
  unique (contract_id, valid_from)
);

grant select, insert, update, delete on public.contract_rent_periods to authenticated;
grant all on public.contract_rent_periods to service_role;
alter table public.contract_rent_periods enable row level security;

create policy "managers manage contract rent periods" on public.contract_rent_periods for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

create index idx_contracts_resident on public.contracts(resident_id);
create index idx_contract_rent_periods_contract on public.contract_rent_periods(contract_id);

alter table public.stays add column contract_id uuid references public.contracts(id);
create index idx_stays_contract on public.stays(contract_id);

create extension if not exists btree_gist;

create or replace function public.stay_daterange(_in timestamptz, _out timestamptz)
returns daterange language sql immutable as $$
  select daterange((_in at time zone 'UTC')::date, (_out at time zone 'UTC')::date, '[]')
$$;

alter table public.stays add constraint stays_sem_sobreposicao
  exclude using gist (
    room_id with =,
    public.stay_daterange(check_in, check_out) with &&
  ) where (status in ('confirmed','checked_in'));