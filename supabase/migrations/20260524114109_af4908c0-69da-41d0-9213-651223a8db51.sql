
-- =========================================================================
-- ENUMS
-- =========================================================================
create type public.supplier_category as enum (
  'plumbing','electrical','cleaning_company','internet','laundry',
  'maintenance','hvac','pest_control','gardening','security','other'
);

create type public.location_kind as enum (
  'room','shared_bathroom','apartment_kitchen','common_kitchen','corridor',
  'balcony','laundry','meeting_room','cowork','terrace','winter_garden',
  'cinema','technical','other'
);

create type public.location_status as enum ('active','out_of_service','under_maintenance');

create type public.request_activity_kind as enum (
  'supplier_assigned','supplier_removed','status_changed',
  'owner_changed','cost_updated','location_changed','created'
);

-- =========================================================================
-- SUPPLIERS
-- =========================================================================
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category supplier_category not null default 'other',
  contact_name text,
  phone text,
  email text,
  website text,
  notes text,
  tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_category_idx on public.suppliers(category);
create index suppliers_active_idx on public.suppliers(active);

alter table public.suppliers enable row level security;

create policy "staff full access suppliers" on public.suppliers
  for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- =========================================================================
-- LOCATIONS
-- =========================================================================
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind location_kind not null default 'other',
  floor int,
  apartment text,
  parent_location_id uuid references public.locations(id) on delete set null,
  status location_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_kind_idx on public.locations(kind);
create index locations_parent_idx on public.locations(parent_location_id);

alter table public.locations enable row level security;

create policy "staff full access locations" on public.locations
  for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy "authenticated read locations" on public.locations
  for select to authenticated using (true);

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

-- =========================================================================
-- ROOMS: add location_id and backfill
-- =========================================================================
alter table public.rooms add column location_id uuid unique;

-- Create one location per existing room and link
do $$
declare r record; new_loc uuid;
begin
  for r in select id, number, floor from public.rooms loop
    insert into public.locations (name, kind, floor)
    values ('Quarto ' || r.number, 'room', r.floor)
    returning id into new_loc;
    update public.rooms set location_id = new_loc where id = r.id;
  end loop;
end $$;

-- =========================================================================
-- REQUESTS: location_id, supplier_id, costs
-- =========================================================================
alter table public.requests
  add column location_id uuid references public.locations(id) on delete set null,
  add column supplier_id uuid references public.suppliers(id) on delete set null,
  add column estimated_cost numeric(10,2),
  add column final_cost numeric(10,2),
  add column cost_currency text not null default 'EUR';

update public.requests r
set location_id = ro.location_id
from public.rooms ro
where r.room_id = ro.id and r.location_id is null;

create index requests_supplier_idx on public.requests(supplier_id);
create index requests_location_idx on public.requests(location_id);

-- =========================================================================
-- OPS_TASKS: location_id, supplier_id, costs
-- =========================================================================
alter table public.ops_tasks
  add column location_id uuid references public.locations(id) on delete set null,
  add column supplier_id uuid references public.suppliers(id) on delete set null,
  add column estimated_cost numeric(10,2),
  add column final_cost numeric(10,2),
  add column cost_currency text not null default 'EUR';

update public.ops_tasks t
set location_id = ro.location_id
from public.rooms ro
where t.room_id = ro.id and t.location_id is null;

create index ops_tasks_supplier_idx on public.ops_tasks(supplier_id);

-- =========================================================================
-- CLEANING_TASKS: location_id, supplier_id
-- =========================================================================
alter table public.cleaning_tasks
  add column location_id uuid references public.locations(id) on delete set null,
  add column supplier_id uuid references public.suppliers(id) on delete set null;

update public.cleaning_tasks c
set location_id = ro.location_id
from public.rooms ro
where c.room_id = ro.id and c.location_id is null;

-- =========================================================================
-- REQUEST_ACTIVITY (activity log)
-- =========================================================================
create table public.request_activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  actor_user_id uuid,
  actor_name text,
  kind request_activity_kind not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index request_activity_request_idx on public.request_activity(request_id, created_at desc);

alter table public.request_activity enable row level security;

create policy "staff full access request_activity" on public.request_activity
  for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- Resident can only see status_changed events for their own requests
create policy "resident read own request_activity status" on public.request_activity
  for select to authenticated
  using (
    kind = 'status_changed'
    and exists (
      select 1 from public.requests r
      where r.id = request_activity.request_id
        and r.resident_id = current_resident_id()
    )
  );

-- =========================================================================
-- Trigger to auto-log request changes
-- =========================================================================
create or replace function public.log_request_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_supplier_name text;
begin
  select coalesce(p.full_name, p.email) into v_actor_name
  from public.profiles p where p.user_id = v_actor;

  if TG_OP = 'INSERT' then
    insert into public.request_activity (request_id, actor_user_id, actor_name, kind, payload)
    values (NEW.id, v_actor, v_actor_name, 'created', jsonb_build_object('status', NEW.status));
    return NEW;
  end if;

  if OLD.status is distinct from NEW.status then
    insert into public.request_activity (request_id, actor_user_id, actor_name, kind, payload)
    values (NEW.id, v_actor, v_actor_name, 'status_changed',
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  end if;

  if OLD.assigned_to_user_id is distinct from NEW.assigned_to_user_id then
    insert into public.request_activity (request_id, actor_user_id, actor_name, kind, payload)
    values (NEW.id, v_actor, v_actor_name, 'owner_changed',
            jsonb_build_object('to_user_id', NEW.assigned_to_user_id, 'to_name', NEW.assigned_to));
  end if;

  if OLD.supplier_id is distinct from NEW.supplier_id then
    select name into v_supplier_name from public.suppliers where id = NEW.supplier_id;
    if NEW.supplier_id is null then
      insert into public.request_activity (request_id, actor_user_id, actor_name, kind, payload)
      values (NEW.id, v_actor, v_actor_name, 'supplier_removed', '{}'::jsonb);
    else
      insert into public.request_activity (request_id, actor_user_id, actor_name, kind, payload)
      values (NEW.id, v_actor, v_actor_name, 'supplier_assigned',
              jsonb_build_object('supplier_id', NEW.supplier_id, 'supplier_name', v_supplier_name));
    end if;
  end if;

  if OLD.location_id is distinct from NEW.location_id then
    insert into public.request_activity (request_id, actor_user_id, actor_name, kind, payload)
    values (NEW.id, v_actor, v_actor_name, 'location_changed',
            jsonb_build_object('to_location_id', NEW.location_id));
  end if;

  if (OLD.estimated_cost is distinct from NEW.estimated_cost)
     or (OLD.final_cost is distinct from NEW.final_cost) then
    insert into public.request_activity (request_id, actor_user_id, actor_name, kind, payload)
    values (NEW.id, v_actor, v_actor_name, 'cost_updated',
            jsonb_build_object(
              'estimated_from', OLD.estimated_cost, 'estimated_to', NEW.estimated_cost,
              'final_from', OLD.final_cost, 'final_to', NEW.final_cost
            ));
  end if;

  return NEW;
end $$;

create trigger requests_log_changes
  after insert or update on public.requests
  for each row execute function public.log_request_changes();
