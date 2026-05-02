-- Backfill profiles for any auth.users without one, and promote bcnogueira2000@gmail.com to admin

INSERT INTO public.profiles (user_id, full_name, email, account_status)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.email,
  'active'::public.account_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Auto-link any of those backfilled users to existing residents by email
UPDATE public.profiles p
SET resident_id = r.id
FROM public.residents r
WHERE p.resident_id IS NULL
  AND lower(p.email) = lower(r.email);

UPDATE public.residents r
SET user_id = p.user_id
FROM public.profiles p
WHERE r.user_id IS NULL
  AND p.resident_id = r.id;

-- Give resident role to those auto-linked
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'resident'::public.app_role
FROM public.profiles p
WHERE p.resident_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Promote bcnogueira2000@gmail.com to admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'bcnogueira2000@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;