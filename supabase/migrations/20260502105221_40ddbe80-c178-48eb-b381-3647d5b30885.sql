
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('resident', 'staff', 'manager', 'admin');
CREATE TYPE public.account_status AS ENUM ('pending_approval', 'active', 'rejected', 'disabled');

-- ============================================================
-- LINK residents -> auth.users (logical, no FK to auth schema)
-- ============================================================
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- ============================================================
-- USER_ROLES
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT,
  account_status public.account_status NOT NULL DEFAULT 'pending_approval',
  resident_id UUID,
  requested_room_number TEXT,
  expected_move_in TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('staff','manager','admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_resident_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1
$$;

-- ============================================================
-- handle_new_user: auto-link by email
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id UUID;
  v_status public.account_status := 'pending_approval';
BEGIN
  -- try to auto-link by email to an existing active/upcoming resident
  SELECT id INTO v_resident_id
  FROM public.residents
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS NULL
    AND status IN ('active','upcoming','checking_out')
  LIMIT 1;

  IF v_resident_id IS NOT NULL THEN
    UPDATE public.residents SET user_id = NEW.id WHERE id = v_resident_id;
    v_status := 'active';
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'resident')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.profiles (
    user_id, full_name, email, phone, account_status, resident_id,
    requested_room_number, expected_move_in
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    v_status,
    v_resident_id,
    NEW.raw_user_meta_data->>'requested_room_number',
    NULLIF(NEW.raw_user_meta_data->>'expected_move_in','')::TIMESTAMPTZ
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS: user_roles
-- ============================================================
CREATE POLICY "users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "staff manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ============================================================
-- RLS: profiles
-- ============================================================
CREATE POLICY "users read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "staff insert profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff delete profile"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

-- ============================================================
-- REPLACE existing permissive RLS with role-aware policies
-- ============================================================

-- requests
DROP POLICY IF EXISTS "auth read requests" ON public.requests;
DROP POLICY IF EXISTS "auth write requests" ON public.requests;

CREATE POLICY "staff full access requests"
ON public.requests FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "resident read own requests"
ON public.requests FOR SELECT TO authenticated
USING (resident_id = public.current_resident_id());

CREATE POLICY "resident insert own requests"
ON public.requests FOR INSERT TO authenticated
WITH CHECK (resident_id = public.current_resident_id());

-- bookings
DROP POLICY IF EXISTS "auth read bookings" ON public.bookings;
DROP POLICY IF EXISTS "auth write bookings" ON public.bookings;

CREATE POLICY "staff full access bookings"
ON public.bookings FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "resident read own bookings"
ON public.bookings FOR SELECT TO authenticated
USING (resident_id = public.current_resident_id());

CREATE POLICY "resident insert own bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (resident_id = public.current_resident_id());

CREATE POLICY "resident delete own bookings"
ON public.bookings FOR DELETE TO authenticated
USING (resident_id = public.current_resident_id());

-- cleaning_tasks (staff only — residents pedem via requests/services)
DROP POLICY IF EXISTS "auth read cleaning_tasks" ON public.cleaning_tasks;
DROP POLICY IF EXISTS "auth write cleaning_tasks" ON public.cleaning_tasks;

CREATE POLICY "staff full access cleaning_tasks"
ON public.cleaning_tasks FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- ops_tasks (staff only)
DROP POLICY IF EXISTS "auth read ops_tasks" ON public.ops_tasks;
DROP POLICY IF EXISTS "auth write ops_tasks" ON public.ops_tasks;

CREATE POLICY "staff full access ops_tasks"
ON public.ops_tasks FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- residents
DROP POLICY IF EXISTS "auth read residents" ON public.residents;
DROP POLICY IF EXISTS "auth write residents" ON public.residents;

CREATE POLICY "staff full access residents"
ON public.residents FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "resident read own resident"
ON public.residents FOR SELECT TO authenticated
USING (id = public.current_resident_id());

CREATE POLICY "resident update own resident"
ON public.residents FOR UPDATE TO authenticated
USING (id = public.current_resident_id())
WITH CHECK (id = public.current_resident_id());

-- rooms (read-only for residents)
DROP POLICY IF EXISTS "auth read rooms" ON public.rooms;
DROP POLICY IF EXISTS "auth write rooms" ON public.rooms;

CREATE POLICY "staff full access rooms"
ON public.rooms FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "authenticated read rooms"
ON public.rooms FOR SELECT TO authenticated
USING (true);

-- spaces (read-only for residents)
DROP POLICY IF EXISTS "auth read spaces" ON public.spaces;
DROP POLICY IF EXISTS "auth write spaces" ON public.spaces;

CREATE POLICY "staff full access spaces"
ON public.spaces FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "authenticated read spaces"
ON public.spaces FOR SELECT TO authenticated
USING (true);

-- stays
DROP POLICY IF EXISTS "auth read stays" ON public.stays;
DROP POLICY IF EXISTS "auth write stays" ON public.stays;

CREATE POLICY "staff full access stays"
ON public.stays FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "resident read own stays"
ON public.stays FOR SELECT TO authenticated
USING (resident_id = public.current_resident_id());
