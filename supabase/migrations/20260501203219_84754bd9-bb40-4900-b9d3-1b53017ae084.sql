-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE request_status AS ENUM ('open','in_progress','waiting_resident','waiting_supplier','resolved','closed');
CREATE TYPE request_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE request_category AS ENUM ('maintenance','cleaning','consumables','wifi_tech','noise','billing','lost_found','feedback','other');
CREATE TYPE permission_to_enter AS ENUM ('yes','no','with_notice');

CREATE TYPE room_status AS ENUM ('available','occupied','reserved','maintenance','cleaning_required','out_of_service');
CREATE TYPE resident_status AS ENUM ('upcoming','active','checking_out','past');

CREATE TYPE cleaning_type AS ENUM ('room_regular','room_deep','bathroom','kitchen','common','checkout_inspection');
CREATE TYPE cleaning_service AS ENUM ('normal','simple');
CREATE TYPE cleaning_source AS ENUM ('scheduled','checkout','request','manual');
CREATE TYPE cleaning_status AS ENUM ('scheduled','in_progress','completed','skipped');

CREATE TYPE task_status AS ENUM ('todo','in_progress','done','blocked');
CREATE TYPE task_priority AS ENUM ('low','medium','high');
CREATE TYPE task_category AS ENUM ('maintenance','logistics','admin','supplier','other');

-- =========================================================
-- TABLES
-- =========================================================
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  floor INT NOT NULL,
  typology TEXT NOT NULL,
  status room_status NOT NULL DEFAULT 'available',
  current_resident_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  move_in TIMESTAMPTZ,
  move_out TIMESTAMPTZ,
  status resident_status NOT NULL DEFAULT 'upcoming',
  avatar_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_current_resident_fk FOREIGN KEY (current_resident_id) REFERENCES public.residents(id) ON DELETE SET NULL;

CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category request_category NOT NULL,
  description TEXT,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  location TEXT,
  priority request_priority NOT NULL DEFAULT 'medium',
  status request_status NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  permission_to_enter permission_to_enter NOT NULL DEFAULT 'yes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ops_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category task_category NOT NULL DEFAULT 'other',
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to TEXT,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type cleaning_type NOT NULL,
  service cleaning_service NOT NULL DEFAULT 'normal',
  source cleaning_source NOT NULL DEFAULT 'scheduled',
  source_ref TEXT,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  area TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status cleaning_status NOT NULL DEFAULT 'scheduled',
  assigned_to TEXT,
  notes TEXT,
  checklist JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- updated_at trigger helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_rooms_upd BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_residents_upd BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_requests_upd BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ops_tasks_upd BEFORE UPDATE ON public.ops_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cleaning_tasks_upd BEFORE UPDATE ON public.cleaning_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Code generators
-- =========================================================
CREATE OR REPLACE FUNCTION public.gen_request_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code,'\D','','g'),'')::INT),0)+1 INTO n FROM public.requests;
    NEW.code := 'REQ-' || lpad(n::TEXT,3,'0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_requests_code BEFORE INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.gen_request_code();

CREATE OR REPLACE FUNCTION public.gen_ops_task_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code,'\D','','g'),'')::INT),0)+1 INTO n FROM public.ops_tasks;
    NEW.code := 'T-' || lpad(n::TEXT,3,'0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ops_tasks_code BEFORE INSERT ON public.ops_tasks FOR EACH ROW EXECUTE FUNCTION public.gen_ops_task_code();

-- =========================================================
-- Automation: request -> task / cleaning
-- =========================================================
CREATE OR REPLACE FUNCTION public.auto_create_from_request()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_priority task_priority;
BEGIN
  v_priority := CASE NEW.priority
    WHEN 'urgent' THEN 'high'::task_priority
    WHEN 'high' THEN 'high'::task_priority
    WHEN 'medium' THEN 'medium'::task_priority
    ELSE 'low'::task_priority END;

  IF NEW.category IN ('cleaning','consumables') THEN
    INSERT INTO public.cleaning_tasks (type, service, source, source_ref, room_id, area, scheduled_for, status, notes)
    VALUES (
      CASE WHEN NEW.category='consumables' THEN 'common'::cleaning_type ELSE 'room_regular'::cleaning_type END,
      CASE WHEN NEW.category='consumables' THEN 'simple'::cleaning_service ELSE 'normal'::cleaning_service END,
      'request'::cleaning_source,
      NEW.id::TEXT,
      NEW.room_id,
      COALESCE(NEW.location, NEW.title),
      now() + interval '1 day',
      'scheduled'::cleaning_status,
      'Gerada automaticamente do pedido ' || NEW.code
    );
  ELSE
    INSERT INTO public.ops_tasks (title, description, category, priority, request_id, room_id, resident_id, due_date)
    VALUES (
      NEW.title,
      COALESCE(NEW.description,'') || E'\n\n[Gerada automaticamente do pedido ' || NEW.code || ']',
      CASE NEW.category
        WHEN 'maintenance' THEN 'maintenance'::task_category
        WHEN 'wifi_tech' THEN 'maintenance'::task_category
        WHEN 'lost_found' THEN 'logistics'::task_category
        ELSE 'admin'::task_category END,
      v_priority,
      NEW.id,
      NEW.room_id,
      NEW.resident_id,
      now() + interval '3 days'
    );
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_request_automation AFTER INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.auto_create_from_request();

-- =========================================================
-- Automation: resident -> checkout_inspection + ops_task
-- =========================================================
CREATE OR REPLACE FUNCTION public.auto_create_checkout_tasks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_room_number TEXT;
BEGIN
  IF NEW.status = 'checking_out' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'checking_out') THEN
    SELECT number INTO v_room_number FROM public.rooms WHERE id = NEW.room_id;

    INSERT INTO public.cleaning_tasks (type, service, source, source_ref, room_id, area, scheduled_for, status)
    VALUES ('checkout_inspection','normal','checkout', NEW.id::TEXT, NEW.room_id,
            'Quarto ' || COALESCE(v_room_number,'?') || ' — Inspeção saída',
            COALESCE(NEW.move_out, now() + interval '2 days'), 'scheduled');

    INSERT INTO public.ops_tasks (title, description, category, priority, resident_id, room_id, due_date)
    VALUES ('Devolução de caução — ' || NEW.full_name,
            'Verificar inspeção e processar devolução da caução.',
            'admin','medium', NEW.id, NEW.room_id,
            COALESCE(NEW.move_out, now() + interval '3 days') + interval '2 days');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_resident_checkout AFTER INSERT OR UPDATE OF status ON public.residents FOR EACH ROW EXECUTE FUNCTION public.auto_create_checkout_tasks();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Authenticated staff: full access
CREATE POLICY "auth read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write rooms" ON public.rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read residents" ON public.residents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write residents" ON public.residents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read requests" ON public.requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write requests" ON public.requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read ops_tasks" ON public.ops_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write ops_tasks" ON public.ops_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read cleaning_tasks" ON public.cleaning_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write cleaning_tasks" ON public.cleaning_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read spaces" ON public.spaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write spaces" ON public.spaces FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth read bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write bookings" ON public.bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public submission of requests (anonymous form at /submit)
CREATE POLICY "public insert requests" ON public.requests FOR INSERT TO anon WITH CHECK (true);
