-- 1. Drop duplicate triggers on requests
DROP TRIGGER IF EXISTS trg_requests_gen_code ON public.requests;
DROP TRIGGER IF EXISTS trg_requests_auto_create ON public.requests;
DROP TRIGGER IF EXISTS trg_requests_updated_at ON public.requests;

-- 2. Replace gen_request_code() with sequence-based atomic version
CREATE SEQUENCE IF NOT EXISTS public.requests_code_seq;
SELECT setval(
  'public.requests_code_seq',
  GREATEST(
    COALESCE((SELECT MAX(NULLIF(regexp_replace(code,'\D','','g'),'')::INT) FROM public.requests), 0),
    1
  ),
  true
);

CREATE OR REPLACE FUNCTION public.gen_request_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'REQ-' || lpad(nextval('public.requests_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END $$;

-- 3. Same robustness for ops_tasks
CREATE SEQUENCE IF NOT EXISTS public.ops_tasks_code_seq;
SELECT setval(
  'public.ops_tasks_code_seq',
  GREATEST(
    COALESCE((SELECT MAX(NULLIF(regexp_replace(code,'\D','','g'),'')::INT) FROM public.ops_tasks), 0),
    1
  ),
  true
);

CREATE OR REPLACE FUNCTION public.gen_ops_task_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'T-' || lpad(nextval('public.ops_tasks_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END $$;

-- Drop possible duplicates on ops_tasks too
DROP TRIGGER IF EXISTS trg_ops_tasks_gen_code ON public.ops_tasks;

-- 4. Clean up duplicate auto-generated tasks (from the duplicated trigger)
-- ops_tasks: keep oldest per request_id
DELETE FROM public.ops_tasks a
USING public.ops_tasks b
WHERE a.request_id IS NOT NULL
  AND a.request_id = b.request_id
  AND a.created_at > b.created_at;

-- cleaning_tasks: keep oldest per source_ref where source = 'request'
DELETE FROM public.cleaning_tasks a
USING public.cleaning_tasks b
WHERE a.source = 'request'
  AND b.source = 'request'
  AND a.source_ref IS NOT NULL
  AND a.source_ref = b.source_ref
  AND a.created_at > b.created_at;