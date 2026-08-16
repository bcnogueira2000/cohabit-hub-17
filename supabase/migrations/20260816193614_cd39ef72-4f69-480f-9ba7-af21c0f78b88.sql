ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS legacy_space_id uuid;

INSERT INTO public.locations (name, kind, capacity, notes, is_bookable, status, legacy_space_id)
SELECT s.name,
       CASE
         WHEN s.name ILIKE '%reuni%' OR s.name ILIKE '%meeting%' THEN 'meeting_room'
         WHEN s.name ILIKE '%cowork%' THEN 'cowork'
         WHEN s.name ILIKE '%terra%' THEN 'terrace'
         WHEN s.name ILIKE '%cinema%' THEN 'cinema'
         WHEN s.name ILIKE '%jardim%' OR s.name ILIKE '%winter%' THEN 'winter_garden'
         ELSE 'other'
       END::location_kind,
       s.capacity,
       s.description,
       true,
       CASE WHEN s.active THEN 'active' ELSE 'out_of_service' END::location_status,
       s.id
FROM public.spaces s
WHERE NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.legacy_space_id = s.id);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id);

UPDATE public.bookings b
SET location_id = l.id
FROM public.locations l
WHERE l.legacy_space_id = b.space_id AND b.location_id IS NULL;

ALTER TABLE public.bookings ALTER COLUMN space_id DROP NOT NULL;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap_location;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap_location
  EXCLUDE USING gist (location_id WITH =, tstzrange(start_at, end_at) WITH &&)
  WHERE (location_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS bookings_location_id_idx ON public.bookings(location_id);