CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (space_id WITH =, tstzrange(start_at, end_at) WITH &&);