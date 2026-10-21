CREATE OR REPLACE FUNCTION public.reopen_cost_invoice(p_id uuid,p_expected_updated_at timestamptz,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v public.cost_invoices;
BEGIN
 IF NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Só gestão ou administração pode reabrir faturas'; END IF;
 IF length(trim(p_reason))<1 OR length(p_reason)>2000 THEN RAISE EXCEPTION 'Indique o motivo'; END IF;
 SELECT * INTO v FROM public.cost_invoices WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR v.status<>'paid' OR v.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'Fatura alterada ou não paga; atualize a página'; END IF;
 UPDATE public.cost_invoices SET status='classified' WHERE id=p_id;
 INSERT INTO public.cost_invoice_events(invoice_id,action,details) VALUES(p_id,'reopened',jsonb_build_object('reason',trim(p_reason)));
END $$;
REVOKE ALL ON FUNCTION public.reopen_cost_invoice(uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reopen_cost_invoice(uuid,timestamptz,text) TO authenticated;