CREATE UNIQUE INDEX IF NOT EXISTS cost_invoices_unique_hash ON public.cost_invoices(file_hash);
CREATE OR REPLACE FUNCTION public.save_cost_invoice(p_id uuid, p_expected_updated_at timestamptz, p_header jsonb, p_lines jsonb, p_status text DEFAULT 'to_classify') RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_old public.cost_invoices; v_line jsonb; v_net numeric:=0; v_vat numeric:=0; v_count integer:=0;
BEGIN
 IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Acesso reservado à equipa'; END IF;
 SELECT * INTO v_old FROM public.cost_invoices WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Fatura não encontrada'; END IF;
 IF v_old.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'A fatura foi alterada por outra pessoa. Atualize antes de guardar.'; END IF;
 IF v_old.status='paid' THEN RAISE EXCEPTION 'Reabra a fatura antes de editar'; END IF;
 IF p_status NOT IN ('to_classify','classified') OR jsonb_typeof(p_header)<>'object' OR jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)>200 THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
 FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  IF (v_line->>'vat_rate')::numeric NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'IVA deve estar entre 0 e 100'; END IF;
  IF p_status='classified' AND (NULLIF(v_line->>'category_code','') IS NULL OR NULLIF(v_line->>'location_id','') IS NULL OR NULLIF(v_line->>'net','') IS NULL OR NULLIF(v_line->>'vat_rate','') IS NULL OR NULLIF(v_line->>'vat_amount','') IS NULL) THEN RAISE EXCEPTION 'Preencha categoria, local, base e IVA de cada linha'; END IF;
  v_net:=v_net+COALESCE((v_line->>'net')::numeric,0); v_vat:=v_vat+COALESCE((v_line->>'vat_amount')::numeric,0); v_count:=v_count+1;
 END LOOP;
 IF p_status='classified' AND (v_count=0 OR NULLIF(p_header->>'supplier_id','') IS NULL OR NULLIF(p_header->>'invoice_number','') IS NULL OR NULLIF(p_header->>'invoice_date','') IS NULL OR NULLIF(p_header->>'due_date','') IS NULL OR NULLIF(p_header->>'total_gross','') IS NULL OR abs(v_net+v_vat-(p_header->>'total_gross')::numeric)>0.02) THEN RAISE EXCEPTION 'Complete os dados e confira o total das linhas'; END IF;
 DELETE FROM public.cost_invoice_lines WHERE invoice_id=p_id;
 INSERT INTO public.cost_invoice_lines(invoice_id,description,category_code,location_id,net,vat_rate,vat_amount,sort)
 SELECT p_id,x.description,NULLIF(x.category_code,''),NULLIF(x.location_id,'')::uuid,x.net,x.vat_rate,x.vat_amount,(ordinality-1)::integer FROM jsonb_array_elements(p_lines) WITH ORDINALITY e(value,ordinality) CROSS JOIN LATERAL jsonb_to_record(e.value) AS x(description text,category_code text,location_id text,net numeric,vat_rate numeric,vat_amount numeric);
 UPDATE public.cost_invoices SET supplier_id=NULLIF(p_header->>'supplier_id','')::uuid,supplier_name=NULLIF(p_header->>'supplier_name',''),supplier_nif=NULLIF(p_header->>'supplier_nif',''),invoice_number=NULLIF(p_header->>'invoice_number',''),invoice_date=NULLIF(p_header->>'invoice_date','')::date,due_date=NULLIF(p_header->>'due_date','')::date,notes=NULLIF(p_header->>'notes',''),atcud=NULLIF(p_header->>'atcud',''),total_net=NULLIF(p_header->>'total_net','')::numeric,total_vat=NULLIF(p_header->>'total_vat','')::numeric,total_gross=NULLIF(p_header->>'total_gross','')::numeric,duplicate_of=NULLIF(p_header->>'duplicate_of','')::uuid,status=p_status WHERE id=p_id;
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.save_cost_invoice(uuid,timestamptz,jsonb,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_cost_invoice(uuid,timestamptz,jsonb,jsonb,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_cost_line_edit() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
 v_id:=CASE WHEN TG_OP='DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;
 PERFORM 1 FROM public.cost_invoices WHERE id=v_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.cost_invoices WHERE id=v_id AND status='paid') THEN RAISE EXCEPTION 'Reabra a fatura antes de editar linhas'; END IF;
 IF TG_OP='UPDATE' AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN RAISE EXCEPTION 'Não é permitido mover linhas entre faturas'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER guard_cost_line_edit BEFORE INSERT OR UPDATE OR DELETE ON public.cost_invoice_lines FOR EACH ROW EXECUTE FUNCTION public.guard_cost_line_edit();
CREATE OR REPLACE FUNCTION public.generate_cost_alerts() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer; v_today date:=(now() AT TIME ZONE 'Europe/Lisbon')::date;
BEGIN
 WITH candidates AS (SELECT id,CASE WHEN due_date=v_today+3 THEN 'due_in_3d' WHEN due_date=v_today THEN 'due_today' ELSE 'overdue' END AS type FROM public.cost_invoices WHERE status<>'paid' AND duplicate_of IS NULL AND (due_date=v_today+3 OR due_date<=v_today)), claimed AS (INSERT INTO public.cost_invoice_alerts(invoice_id,type) SELECT id,type FROM candidates ON CONFLICT DO NOTHING RETURNING invoice_id,type)
 INSERT INTO public.notifications(user_id,type,title,body,link)
 SELECT DISTINCT ur.user_id,'cost_'||cl.type,CASE cl.type WHEN 'due_in_3d' THEN 'Custo a vencer em 3 dias' WHEN 'due_today' THEN 'Custo vence hoje' ELSE 'Custo em atraso' END,COALESCE(i.supplier_name,'Fornecedor por identificar')||' · '||COALESCE(i.invoice_number,i.file_name)||' · '||to_char(i.due_date,'DD/MM/YYYY'),'/finance/costs/'||i.id FROM claimed cl JOIN public.cost_invoices i ON i.id=cl.invoice_id CROSS JOIN public.user_roles ur JOIN public.profiles p ON p.user_id=ur.user_id WHERE ur.role IN ('staff','manager','admin') AND p.account_status='active';
 GET DIAGNOSTICS v_count=ROW_COUNT; RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.generate_cost_alerts() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.generate_cost_alerts() TO service_role;