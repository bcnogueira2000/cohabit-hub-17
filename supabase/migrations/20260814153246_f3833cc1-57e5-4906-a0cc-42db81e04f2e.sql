DO $$
DECLARE
  v_active integer;
  v_old_locations uuid[];
  r record;
  v_loc uuid;
BEGIN
  SELECT count(*) INTO v_active
  FROM public.stays
  WHERE status = 'checked_in' AND room_id IS NOT NULL;

  IF v_active > 0 THEN
    RAISE EXCEPTION 'Existem % estadias com check-in feito ligadas a quartos. Migração cancelada para proteger dados reais.', v_active;
  END IF;

  SELECT coalesce(array_agg(location_id), '{}') INTO v_old_locations
  FROM public.rooms WHERE location_id IS NOT NULL;

  UPDATE public.rooms SET current_resident_id = NULL;
  UPDATE public.residents SET room_id = NULL WHERE room_id IS NOT NULL;
  UPDATE public.stays SET room_id = NULL WHERE room_id IS NOT NULL;
  UPDATE public.requests SET room_id = NULL WHERE room_id IS NOT NULL;
  UPDATE public.ops_tasks SET room_id = NULL WHERE room_id IS NOT NULL;
  UPDATE public.cleaning_tasks SET room_id = NULL WHERE room_id IS NOT NULL;
  UPDATE public.cleaning_schedules SET room_id = NULL WHERE room_id IS NOT NULL;

  DELETE FROM public.rooms;

  UPDATE public.requests SET location_id = NULL
  WHERE location_id = ANY(v_old_locations);
  UPDATE public.ops_tasks SET location_id = NULL
  WHERE location_id = ANY(v_old_locations);
  UPDATE public.cleaning_tasks SET location_id = NULL
  WHERE location_id = ANY(v_old_locations);
  UPDATE public.locations SET parent_location_id = NULL
  WHERE parent_location_id = ANY(v_old_locations);

  DELETE FROM public.locations WHERE kind = 'room';

  FOR r IN
    SELECT * FROM (VALUES
      ('5DQ1', 5, '5DT', 'Master Suite'),
      ('5DQ2', 5, '5DT', 'Standard'),
      ('5DQ3', 5, '5DT', 'Premium'),
      ('5DQ4', 5, '5DT', 'Premium'),
      ('5DQ5', 5, '5DT', 'Suite'),
      ('5EQ1', 5, '5ES', 'Suite'),
      ('5EQ2', 5, '5ES', 'Smart'),
      ('5EQ3', 5, '5ES', 'Smart'),
      ('5EQ4', 5, '5ES', 'Standard'),
      ('5EQ5', 5, '5ES', 'Standard'),
      ('5EQ6', 5, '5ES', 'Master Suite'),
      ('5EQ7', 5, '5ES', 'Suite'),
      ('4EQ1', 4, '4ES', 'Suite'),
      ('4EQ2', 4, '4ES', 'Smart'),
      ('4EQ3', 4, '4ES', 'Smart'),
      ('4EQ4', 4, '4ES', 'Standard'),
      ('4EQ5', 4, '4ES', 'Standard'),
      ('4EQ6', 4, '4ES', 'Master Suite'),
      ('4EQ7', 4, '4ES', 'Suite'),
      ('3DQ1', 3, '3DT', 'Master Suite'),
      ('3DQ2', 3, '3DT', 'Standard'),
      ('3DQ3', 3, '3DT', 'Premium'),
      ('3DQ4', 3, '3DT', 'Premium'),
      ('3DQ5', 3, '3DT', 'Suite'),
      ('3EQ1', 3, '3ES', 'Suite'),
      ('3EQ2', 3, '3ES', 'Smart'),
      ('3EQ3', 3, '3ES', 'Smart'),
      ('3EQ4', 3, '3ES', 'Standard'),
      ('3EQ5', 3, '3ES', 'Standard'),
      ('3EQ6', 3, '3ES', 'Master Suite'),
      ('3EQ7', 3, '3ES', 'Suite'),
      ('2DQ1', 2, '2DT', 'Master Suite'),
      ('2DQ2', 2, '2DT', 'Standard'),
      ('2DQ3', 2, '2DT', 'Premium'),
      ('2DQ4', 2, '2DT', 'Premium'),
      ('2DQ5', 2, '2DT', 'Suite'),
      ('2EQ1', 2, '2ES', 'Suite'),
      ('2EQ2', 2, '2ES', 'Smart'),
      ('2EQ3', 2, '2ES', 'Smart'),
      ('2EQ4', 2, '2ES', 'Standard'),
      ('2EQ5', 2, '2ES', 'Standard'),
      ('2EQ6', 2, '2ES', 'Master Suite'),
      ('2EQ7', 2, '2ES', 'Suite'),
      ('1DQ1', 1, '1DT', 'Standard'),
      ('1DQ2', 1, '1DT', 'Standard'),
      ('1DQ3', 1, '1DT', 'Premium'),
      ('1DQ4', 1, '1DT', 'Standard')
    ) AS t(number, floor, zone, typology)
  LOOP
    INSERT INTO public.locations (name, kind, floor, apartment, status)
    VALUES ('Quarto ' || r.number, 'room', r.floor, r.zone, 'active')
    RETURNING id INTO v_loc;

    INSERT INTO public.rooms (number, floor, typology, status, location_id)
    VALUES (r.number, r.floor, r.typology, 'available', v_loc);
  END LOOP;
END $$;