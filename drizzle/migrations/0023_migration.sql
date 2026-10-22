ALTER TABLE public.cost_invoice_events DROP CONSTRAINT IF EXISTS cost_invoice_events_action_check;
ALTER TABLE public.cost_invoice_events ADD CONSTRAINT cost_invoice_events_action_check CHECK (action = ANY (ARRAY['created','extracted','edited','classified','paid','reopened','duplicate_confirmed','file_replaced','moloni_sent']));

CREATE OR REPLACE FUNCTION public.lock_cost_invoice_moloni()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.moloni_document_id IS NOT NULL THEN
    NEW.moloni_document_id := OLD.moloni_document_id;
    NEW.moloni_document_number := OLD.moloni_document_number;
    NEW.moloni_sent_at := OLD.moloni_sent_at;
    NEW.moloni_status := OLD.moloni_status;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lock_cost_invoice_moloni ON public.cost_invoices;
CREATE TRIGGER trg_lock_cost_invoice_moloni BEFORE UPDATE ON public.cost_invoices FOR EACH ROW EXECUTE FUNCTION public.lock_cost_invoice_moloni();