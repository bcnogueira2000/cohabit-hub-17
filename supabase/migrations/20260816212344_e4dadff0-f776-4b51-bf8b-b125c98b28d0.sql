create type public.payment_kind as enum ('rent','deposit','deposit_return','booking_fee','extra','other');
create type public.payment_method as enum ('transfer','mbway','direct_debit','card','cash','other');

create table public.rent_charges (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  year        int  not null,
  month       int  not null check (month between 1 and 12),
  amount      numeric(10,2) not null,
  due_date    date not null,
  prorated    boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (contract_id, year, month)
);

grant select, insert, update, delete on public.rent_charges to authenticated;
grant all on public.rent_charges to service_role;
alter table public.rent_charges enable row level security;
create policy "managers manage rent_charges" on public.rent_charges for all to authenticated
  using (public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'admin'));

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid not null references public.contracts(id) on delete cascade,
  rent_charge_id uuid references public.rent_charges(id) on delete set null,
  kind           public.payment_kind not null default 'rent',
  amount         numeric(10,2) not null,
  paid_at        date not null default current_date,
  method         public.payment_method,
  reference      text,
  notes          text,
  created_at     timestamptz not null default now()
);

grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "managers manage payments" on public.payments for all to authenticated
  using (public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'admin'));

create index payments_contract_id_idx on public.payments (contract_id);
create index payments_rent_charge_id_idx on public.payments (rent_charge_id);
create index rent_charges_contract_year_month_idx on public.rent_charges (contract_id, year, month);

create view public.rent_charge_balance
with (security_invoker = true) as
select
  rc.*,
  coalesce(sum(p.amount), 0)             as paid,
  rc.amount - coalesce(sum(p.amount), 0) as outstanding,
  case
    when rc.amount - coalesce(sum(p.amount), 0) <= 0.005 then 'paid'
    when coalesce(sum(p.amount), 0) > 0                  then 'partial'
    when rc.due_date < current_date                      then 'overdue'
    else 'due'
  end as payment_state
from public.rent_charges rc
left join public.payments p on p.rent_charge_id = rc.id
group by rc.id;

create view public.contract_balance
with (security_invoker = true) as
select
  c.id as contract_id,
  sum(b.amount)                            as billed,
  sum(b.paid)                              as received,
  sum(case when b.due_date <= current_date then b.outstanding else 0 end) as overdue,
  c.deposit_received - c.deposit_returned  as deposit_held
from public.contracts c
left join public.rent_charge_balance b on b.contract_id = c.id
group by c.id, c.deposit_received, c.deposit_returned;

grant select on public.rent_charge_balance to authenticated;
grant select on public.contract_balance to authenticated;
grant select on public.rent_charge_balance to service_role;
grant select on public.contract_balance to service_role;