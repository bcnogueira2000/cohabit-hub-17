
create type cleaning_recurrence as enum ('weekly', 'biweekly', 'monthly');

create table public.cleaning_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type cleaning_type not null,
  service cleaning_service not null default 'normal',
  area text not null,
  room_id uuid references public.rooms(id) on delete set null,
  recurrence cleaning_recurrence not null default 'weekly',
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  hour smallint not null default 10 check (hour between 0 and 23),
  minute smallint not null default 0 check (minute between 0 and 59),
  assigned_to text,
  assigned_to_user_id uuid,
  notes text,
  active boolean not null default true,
  last_generated_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cleaning_schedules enable row level security;

create policy "staff full access cleaning_schedules"
  on public.cleaning_schedules for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create trigger trg_cleaning_schedules_upd
before update on public.cleaning_schedules
for each row execute function public.set_updated_at();

-- Function: generate the next N occurrences for a schedule
create or replace function public.generate_cleaning_instances(p_schedule_id uuid, p_count int default 8)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.cleaning_schedules;
  i int := 0;
  base date;
  candidate timestamptz;
  step interval;
  inserted int := 0;
begin
  select * into s from public.cleaning_schedules where id = p_schedule_id;
  if s is null or not s.active then return 0; end if;

  step := case s.recurrence
            when 'weekly' then interval '7 days'
            when 'biweekly' then interval '14 days'
            when 'monthly' then interval '1 month'
          end;

  -- start from greater of: today, last_generated_until + step
  base := greatest(current_date, coalesce(s.last_generated_until::date, current_date));

  -- find first occurrence on or after base matching day_of_week
  while extract(dow from base)::int <> s.day_of_week loop
    base := base + interval '1 day';
  end loop;

  candidate := (base::timestamp + make_interval(hours => s.hour, mins => s.minute)) at time zone 'Europe/Lisbon';

  while i < p_count loop
    -- avoid duplicates: same schedule + same scheduled_for
    if not exists (
      select 1 from public.cleaning_tasks
      where source = 'scheduled' and source_ref = s.id::text and scheduled_for = candidate
    ) then
      insert into public.cleaning_tasks (
        type, service, source, source_ref, room_id, area, scheduled_for, status,
        assigned_to, assigned_to_user_id, notes
      )
      values (
        s.type, s.service, 'scheduled', s.id::text, s.room_id, s.area, candidate, 'scheduled',
        s.assigned_to, s.assigned_to_user_id, s.notes
      );
      inserted := inserted + 1;
    end if;
    candidate := candidate + step;
    i := i + 1;
  end loop;

  update public.cleaning_schedules
  set last_generated_until = candidate
  where id = s.id;

  return inserted;
end;
$$;
