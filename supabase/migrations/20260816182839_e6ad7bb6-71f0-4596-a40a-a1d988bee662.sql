create table public.room_typologies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

grant select on public.room_typologies to authenticated;
grant insert, update, delete on public.room_typologies to authenticated;
grant all on public.room_typologies to service_role;

alter table public.room_typologies enable row level security;

create policy "authenticated read room_typologies" on public.room_typologies
  for select to authenticated using (true);
create policy "managers manage room_typologies" on public.room_typologies
  for all to authenticated
  using (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create table public.typology_prices (
  id uuid primary key default gen_random_uuid(),
  typology_id uuid not null references public.room_typologies(id) on delete cascade,
  valid_from date not null,
  list_price numeric(10,2) not null,
  promo_price numeric(10,2),
  created_at timestamptz not null default now(),
  unique (typology_id, valid_from)
);

grant select on public.typology_prices to authenticated;
grant insert, update, delete on public.typology_prices to authenticated;
grant all on public.typology_prices to service_role;

alter table public.typology_prices enable row level security;

create policy "authenticated read typology_prices" on public.typology_prices
  for select to authenticated using (true);
create policy "managers manage typology_prices" on public.typology_prices
  for all to authenticated
  using (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

alter table public.rooms add column typology_id uuid references public.room_typologies(id);

insert into public.room_typologies (code, name, sort_order) values
  ('smart', 'Smart', 1),
  ('standard', 'Standard', 2),
  ('premium', 'Premium', 3),
  ('suite', 'Suite', 4),
  ('master_suite', 'Master Suite', 5);

insert into public.typology_prices (typology_id, valid_from, list_price, promo_price)
select t.id, current_date, v.list_price, v.promo_price
from (values
  ('smart', 650, 600),
  ('standard', 750, 725),
  ('premium', 860, 800),
  ('suite', 920, 850),
  ('master_suite', 1150, 1050)
) as v(code, list_price, promo_price)
join public.room_typologies t on t.code = v.code;