
-- ============================================================
-- ETAPA 1: Ligar triggers das funções já existentes
-- ============================================================

-- requests
DROP TRIGGER IF EXISTS trg_requests_gen_code ON public.requests;
CREATE TRIGGER trg_requests_gen_code
BEFORE INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.gen_request_code();

DROP TRIGGER IF EXISTS trg_requests_updated_at ON public.requests;
CREATE TRIGGER trg_requests_updated_at
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_requests_auto_create ON public.requests;
CREATE TRIGGER trg_requests_auto_create
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.auto_create_from_request();

-- ops_tasks
DROP TRIGGER IF EXISTS trg_ops_tasks_gen_code ON public.ops_tasks;
CREATE TRIGGER trg_ops_tasks_gen_code
BEFORE INSERT ON public.ops_tasks
FOR EACH ROW EXECUTE FUNCTION public.gen_ops_task_code();

DROP TRIGGER IF EXISTS trg_ops_tasks_updated_at ON public.ops_tasks;
CREATE TRIGGER trg_ops_tasks_updated_at
BEFORE UPDATE ON public.ops_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- cleaning_tasks
DROP TRIGGER IF EXISTS trg_cleaning_tasks_updated_at ON public.cleaning_tasks;
CREATE TRIGGER trg_cleaning_tasks_updated_at
BEFORE UPDATE ON public.cleaning_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- residents
DROP TRIGGER IF EXISTS trg_residents_updated_at ON public.residents;
CREATE TRIGGER trg_residents_updated_at
BEFORE UPDATE ON public.residents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_residents_checkout ON public.residents;
CREATE TRIGGER trg_residents_checkout
AFTER INSERT OR UPDATE OF status ON public.residents
FOR EACH ROW EXECUTE FUNCTION public.auto_create_checkout_tasks();

-- rooms
DROP TRIGGER IF EXISTS trg_rooms_updated_at ON public.rooms;
CREATE TRIGGER trg_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ETAPA 2: Tabela stays (estadias / reservas de quarto)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.stay_status AS ENUM ('pending','confirmed','checked_in','checked_out','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stay_source AS ENUM ('manual','public_form','external');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.stays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  room_id UUID NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  status public.stay_status NOT NULL DEFAULT 'pending',
  source public.stay_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read stays" ON public.stays;
CREATE POLICY "auth read stays" ON public.stays
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth write stays" ON public.stays;
CREATE POLICY "auth write stays" ON public.stays
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public insert stays" ON public.stays;
CREATE POLICY "public insert stays" ON public.stays
FOR INSERT TO anon WITH CHECK (source = 'public_form' AND status = 'pending');

DROP TRIGGER IF EXISTS trg_stays_updated_at ON public.stays;
CREATE TRIGGER trg_stays_updated_at
BEFORE UPDATE ON public.stays
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_stays_check_in ON public.stays(check_in);
CREATE INDEX IF NOT EXISTS idx_stays_status ON public.stays(status);
CREATE INDEX IF NOT EXISTS idx_stays_room ON public.stays(room_id);

-- ============================================================
-- Função: ao confirmar/check-in da estadia
--   - upsert do residente
--   - atualiza estado do quarto
--   - cria limpeza pré-entrada e tarefa do kit de boas-vindas
-- ============================================================
CREATE OR REPLACE FUNCTION public.stay_prepare_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_resident_id UUID;
  v_resident_status resident_status;
  v_room_status room_status;
  v_room_number TEXT;
BEGIN
  -- Só age quando estadia passa a confirmed ou checked_in
  IF NEW.status NOT IN ('confirmed','checked_in') THEN
    RETURN NEW;
  END IF;

  -- Evita repetir trabalho se já estava no mesmo estado
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_resident_status := CASE WHEN NEW.status = 'checked_in' THEN 'active'::resident_status ELSE 'upcoming'::resident_status END;
  v_room_status := CASE WHEN NEW.status = 'checked_in' THEN 'occupied'::room_status ELSE 'reserved'::room_status END;

  -- 1) Upsert residente
  IF NEW.resident_id IS NULL THEN
    SELECT id INTO v_resident_id FROM public.residents WHERE email = NEW.email LIMIT 1;
    IF v_resident_id IS NULL THEN
      INSERT INTO public.residents (full_name, email, phone, room_id, move_in, move_out, status, avatar_color)
      VALUES (NEW.full_name, NEW.email, NEW.phone, NEW.room_id, NEW.check_in, NEW.check_out, v_resident_status,
              '#' || lpad(to_hex((random()*16777215)::int),6,'0'))
      RETURNING id INTO v_resident_id;
    ELSE
      UPDATE public.residents
      SET full_name = NEW.full_name, phone = COALESCE(NEW.phone, phone),
          room_id = NEW.room_id, move_in = NEW.check_in, move_out = NEW.check_out,
          status = v_resident_status
      WHERE id = v_resident_id;
    END IF;
    NEW.resident_id := v_resident_id;
  ELSE
    UPDATE public.residents
    SET full_name = NEW.full_name, phone = COALESCE(NEW.phone, phone),
        room_id = NEW.room_id, move_in = NEW.check_in, move_out = NEW.check_out,
        status = v_resident_status
    WHERE id = NEW.resident_id;
    v_resident_id := NEW.resident_id;
  END IF;

  -- 2) Estado do quarto
  IF NEW.room_id IS NOT NULL THEN
    UPDATE public.rooms SET status = v_room_status WHERE id = NEW.room_id;
    SELECT number INTO v_room_number FROM public.rooms WHERE id = NEW.room_id;
  END IF;

  -- 3) Tarefas de preparação (apenas na transição para confirmed; evita duplicar em checked_in)
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed')
     OR (TG_OP = 'UPDATE' AND OLD.status NOT IN ('confirmed','checked_in') AND NEW.status = 'confirmed') THEN

    -- Limpeza pré-entrada
    INSERT INTO public.cleaning_tasks (type, service, source, source_ref, room_id, area, scheduled_for, status, notes)
    VALUES ('room_regular','normal','manual', NEW.id::TEXT, NEW.room_id,
            'Quarto ' || COALESCE(v_room_number,'?') || ' — Preparação entrada',
            NEW.check_in - interval '1 day', 'scheduled',
            'Limpeza de preparação para entrada de ' || NEW.full_name);

    -- Kit de boas-vindas
    INSERT INTO public.ops_tasks (title, description, category, priority, resident_id, room_id, due_date)
    VALUES ('Kit de boas-vindas — ' || NEW.full_name,
            'Preparar kit (chaves, manual, brindes) para entrada no quarto ' || COALESCE(v_room_number,'?'),
            'logistics','medium', v_resident_id, NEW.room_id, NEW.check_in);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stay_prepare_checkin ON public.stays;
CREATE TRIGGER trg_stay_prepare_checkin
BEFORE INSERT OR UPDATE OF status ON public.stays
FOR EACH ROW EXECUTE FUNCTION public.stay_prepare_checkin();

-- ============================================================
-- Função: ao fazer check-out
--   - marca residente como checking_out (dispara o trigger de inspeção/caução)
--   - liberta quarto para limpeza
-- ============================================================
CREATE OR REPLACE FUNCTION public.stay_handle_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'checked_out' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'checked_out') THEN
    IF NEW.resident_id IS NOT NULL THEN
      UPDATE public.residents SET status = 'checking_out', move_out = COALESCE(NEW.check_out, now())
      WHERE id = NEW.resident_id;
    END IF;
    IF NEW.room_id IS NOT NULL THEN
      UPDATE public.rooms SET status = 'cleaning_required' WHERE id = NEW.room_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stay_handle_checkout ON public.stays;
CREATE TRIGGER trg_stay_handle_checkout
AFTER INSERT OR UPDATE OF status ON public.stays
FOR EACH ROW EXECUTE FUNCTION public.stay_handle_checkout();
