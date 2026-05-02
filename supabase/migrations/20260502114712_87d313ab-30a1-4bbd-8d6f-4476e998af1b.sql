-- 1) Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
CREATE POLICY "users read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "staff manage notifications" ON public.notifications;
CREATE POLICY "staff manage notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 2) Trigger: when request created → notify staff; when status changes → notify resident
CREATE OR REPLACE FUNCTION public.notify_on_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_user UUID;
  v_staff RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify all staff/managers/admins
    FOR v_staff IN
      SELECT DISTINCT user_id FROM public.user_roles
      WHERE role IN ('staff','manager','admin')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_staff.user_id,
        'request_new',
        'Novo pedido: ' || NEW.code,
        NEW.title,
        '/requests/' || NEW.id
      );
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT user_id INTO v_resident_user FROM public.residents WHERE id = NEW.resident_id;
    IF v_resident_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_resident_user,
        'request_status',
        'Pedido ' || NEW.code || ' atualizado',
        'Estado: ' || NEW.status,
        '/app/requests/' || NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_request_insert ON public.requests;
CREATE TRIGGER trg_notify_request_insert
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_request_change();

DROP TRIGGER IF EXISTS trg_notify_request_update ON public.requests;
CREATE TRIGGER trg_notify_request_update
AFTER UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_request_change();

-- 3) Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;

-- 4) Storage bucket for request photos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-photos', 'request-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users upload to their own folder (uid as first path segment)
DROP POLICY IF EXISTS "auth upload own request photos" ON storage.objects;
CREATE POLICY "auth upload own request photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'request-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "auth read own request photos" ON storage.objects;
CREATE POLICY "auth read own request photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'request-photos'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid()))
);

DROP POLICY IF EXISTS "auth delete own request photos" ON storage.objects;
CREATE POLICY "auth delete own request photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'request-photos'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid()))
);

-- 5) Add photos column to requests (array of storage paths)
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

-- 6) RPC to list staff users (id + name) for assignment dropdown
CREATE OR REPLACE FUNCTION public.list_staff_users()
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT, role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id, p.full_name, p.email, ur.role
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('staff','manager','admin')
  ORDER BY p.full_name NULLS LAST
$$;

REVOKE EXECUTE ON FUNCTION public.list_staff_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_staff_users() TO authenticated;