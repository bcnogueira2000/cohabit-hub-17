ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS code text;
CREATE INDEX IF NOT EXISTS locations_code_idx ON public.locations (code);
ALTER TYPE location_kind ADD VALUE IF NOT EXISTS 'private_bathroom';