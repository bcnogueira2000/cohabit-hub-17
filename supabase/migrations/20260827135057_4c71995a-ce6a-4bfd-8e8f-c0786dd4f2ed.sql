REVOKE SELECT ON public.moloni_credentials FROM authenticated;

DROP POLICY IF EXISTS "Managers can view moloni credentials" ON public.moloni_credentials;

-- Confirma que service_role mantém acesso total (usado pelas edge functions)
GRANT ALL ON public.moloni_credentials TO service_role;