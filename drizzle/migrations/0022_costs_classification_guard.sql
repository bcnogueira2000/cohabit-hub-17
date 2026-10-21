CREATE OR REPLACE FUNCTION public.validate_cost_classification() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_total numeric; v_count integer; v_bad integer;
BEGIN
 IF NEW.status IN ('classified','paid') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
  SELECT count(*),COALESCE(sum(net+vat_amount),0),count(*) FILTER (WHERE category_code IS NULL OR location_id IS NULL OR net IS NULL OR vat_rate IS NULL OR vat_amount IS NULL) INTO v_count,v_total,v_bad FROM public.cost_invoice_lines WHERE invoice_id=NEW.id;
  IF NEW.supplier_id IS NULL OR NEW.invoice_number IS NULL OR NEW.invoice_date IS NULL OR NEW.due_date IS NULL OR NEW.total_gross IS NULL OR v_count=0 OR v_bad>0 OR abs(v_total-NEW.total_gross)>0.02 OR NEW.duplicate_of IS NOT NULL THEN RAISE EXCEPTION 'Complete e confira a fatura antes de a classificar ou pagar'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_cost_classification BEFORE INSERT OR UPDATE OF status ON public.cost_invoices FOR EACH ROW EXECUTE FUNCTION public.validate_cost_classification();