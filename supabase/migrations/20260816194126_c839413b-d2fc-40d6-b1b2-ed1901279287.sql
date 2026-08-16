ALTER TABLE public.bookings RENAME COLUMN space_id TO space_id_deprecated;
ALTER TABLE public.spaces RENAME TO spaces_deprecated;