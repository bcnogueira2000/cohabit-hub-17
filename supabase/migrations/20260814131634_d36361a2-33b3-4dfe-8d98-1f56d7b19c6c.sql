ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS checkin_checklist JSONB NOT NULL DEFAULT '[]'::jsonb;