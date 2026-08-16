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
  select full_name into v_actor_name from public.profiles where user_id = v_actor;

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

  return NEW;
end $$;

drop policy if exists "public insert requests" on public.requests;

alter table public.requests
  drop column if exists estimated_cost,
  drop column if exists final_cost,
  drop column if exists cost_currency;

create policy "public insert requests" on public.requests
  for insert to anon
  with check (
    status = 'open'::request_status
    and resident_id is null
    and supplier_id is null
    and assigned_to is null
    and assigned_to_user_id is null
  );

delete from public.request_activity where kind = 'cost_updated';

alter type public.request_activity_kind rename to request_activity_kind_old;

create type public.request_activity_kind as enum (
  'supplier_assigned','supplier_removed','status_changed',
  'owner_changed','location_changed','created'
);

drop policy if exists "resident read own request_activity status" on public.request_activity;

alter table public.request_activity
  alter column kind type public.request_activity_kind
  using kind::text::public.request_activity_kind;

drop type public.request_activity_kind_old;

create policy "resident read own request_activity status" on public.request_activity
  for select to authenticated
  using (
    kind = 'status_changed'::public.request_activity_kind
    and exists (
      select 1 from public.requests r
      where r.id = request_activity.request_id
        and r.resident_id = public.current_resident_id()
    )
  );