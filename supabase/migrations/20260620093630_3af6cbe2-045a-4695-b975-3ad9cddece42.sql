
-- 1. Restrict public (anon) inserts on requests
DROP POLICY IF EXISTS "public insert requests" ON public.requests;
CREATE POLICY "public insert requests"
  ON public.requests FOR INSERT TO anon
  WITH CHECK (
    status = 'open'
    AND resident_id IS NULL
    AND supplier_id IS NULL
    AND assigned_to IS NULL
    AND assigned_to_user_id IS NULL
    AND estimated_cost IS NULL
    AND final_cost IS NULL
  );

-- 2. Server-side enforcement of author_role on request_comments
CREATE OR REPLACE FUNCTION public.set_request_comment_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.author_user_id := auth.uid();
  IF public.is_staff(auth.uid()) THEN
    NEW.author_role := 'staff';
  ELSE
    NEW.author_role := 'resident';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_request_comment_author ON public.request_comments;
CREATE TRIGGER trg_set_request_comment_author
  BEFORE INSERT ON public.request_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_request_comment_author();

-- 3. Restrict rooms visibility: residents only see their own room
DROP POLICY IF EXISTS "authenticated read rooms" ON public.rooms;
CREATE POLICY "staff read all rooms"
  ON public.rooms FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR id = (SELECT r.room_id FROM public.residents r WHERE r.user_id = auth.uid() LIMIT 1)
  );

-- 4. Storage: explicit UPDATE policy on request-photos
DROP POLICY IF EXISTS "auth update own request photos" ON storage.objects;
CREATE POLICY "auth update own request photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'request-photos'
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'request-photos'
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid()))
  );

-- 5. Lock down SECURITY DEFINER function EXECUTE privileges
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_resident_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_resident_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_staff_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_staff_users() TO service_role;
-- Wrap with staff-only guard so authenticated staff can still call it
CREATE OR REPLACE FUNCTION public.list_staff_users()
RETURNS TABLE(user_id uuid, full_name text, email text, role app_role)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT DISTINCT ur.user_id, p.full_name, p.email, ur.role
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role IN ('staff','manager','admin')
    ORDER BY p.full_name NULLS LAST;
END;
$$;
GRANT EXECUTE ON FUNCTION public.list_staff_users() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_cleaning_instances(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_cleaning_instances(uuid, integer) TO authenticated, service_role;
-- Add internal staff guard
CREATE OR REPLACE FUNCTION public.generate_cleaning_instances(p_schedule_id uuid, p_count integer DEFAULT 8)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s public.cleaning_schedules;
  i int := 0;
  base date;
  candidate timestamptz;
  step interval;
  inserted int := 0;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select * into s from public.cleaning_schedules where id = p_schedule_id;
  if s is null or not s.active then return 0; end if;

  step := case s.recurrence
            when 'weekly' then interval '7 days'
            when 'biweekly' then interval '14 days'
            when 'monthly' then interval '1 month'
          end;

  base := greatest(current_date, coalesce(s.last_generated_until::date, current_date));

  while extract(dow from base)::int <> s.day_of_week loop
    base := base + interval '1 day';
  end loop;

  candidate := (base::timestamp + make_interval(hours => s.hour, mins => s.minute)) at time zone 'Europe/Lisbon';

  while i < p_count loop
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
$function$;
