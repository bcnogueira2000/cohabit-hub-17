CREATE TABLE public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  default_price numeric(10,2) NOT NULL DEFAULT 0,
  unit_label text NOT NULL DEFAULT 'unidade',
  vat_rate numeric(5,2),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_catalog TO authenticated;
GRANT ALL ON public.service_catalog TO service_role;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers manage service catalog" ON public.service_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER service_catalog_updated_at BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.service_catalog (code, name, unit_label, sort_order) VALUES
  ('entry_kit','Kit de entrada adicional','unidade',1),
  ('extra_cleaning','Limpeza extra','hora',2),
  ('guest_night','Noite de hóspede / visita','noite',3);

CREATE TABLE public.extra_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  resident_id uuid REFERENCES public.residents(id),
  service_id uuid REFERENCES public.service_catalog(id),
  custom_name text,
  description text,
  notes text,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  amount numeric(10,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  unit_label text,
  vat_rate numeric(5,2),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','voided')),
  void_reason text,
  voided_by uuid,
  voided_by_name text,
  voided_at timestamptz,
  request_id uuid,
  moloni_document_id bigint,
  moloni_document_number text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (service_id IS NOT NULL OR length(trim(coalesce(custom_name,''))) > 0)
);
CREATE INDEX extra_charges_contract_idx ON public.extra_charges(contract_id);
GRANT SELECT, INSERT, UPDATE ON public.extra_charges TO authenticated;
GRANT ALL ON public.extra_charges TO service_role;
ALTER TABLE public.extra_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read extra charges" ON public.extra_charges FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.payments ADD COLUMN extra_charge_id uuid REFERENCES public.extra_charges(id);
CREATE INDEX payments_extra_charge_idx ON public.payments(extra_charge_id);

CREATE OR REPLACE VIEW public.extra_charge_balance WITH (security_invoker = true) AS
SELECT ec.id AS extra_charge_id, ec.amount,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'active'), 0) AS paid,
  GREATEST(ec.amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'active'), 0), 0) AS outstanding,
  CASE
    WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'active'), 0) >= ec.amount THEN 'paid'
    WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'active'), 0) > 0 THEN 'partial'
    WHEN ec.due_date < current_date THEN 'overdue'
    ELSE 'due' END AS payment_state
FROM public.extra_charges ec
LEFT JOIN public.payments p ON p.extra_charge_id = ec.id
GROUP BY ec.id;
GRANT SELECT ON public.extra_charge_balance TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_extra_charge(
  p_contract_id uuid, p_service_id uuid, p_custom_name text, p_quantity numeric, p_unit_price numeric,
  p_due_date date, p_description text, p_notes text, p_pay_now boolean,
  p_method public.payment_method, p_paid_at date, p_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_actor uuid := auth.uid(); v_name text; v_c public.contracts; v_s public.service_catalog; v_id uuid; v_amount numeric;
BEGIN
  IF NOT (public.has_role(v_actor,'admin') OR public.has_role(v_actor,'manager')) THEN
    RAISE EXCEPTION 'Só administradores ou gestores podem lançar extras'; END IF;
  SELECT * INTO v_c FROM public.contracts WHERE id = p_contract_id;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;
  IF v_c.status NOT IN ('active','reserved') THEN RAISE EXCEPTION 'Só se lançam extras em contratos ativos ou reservados'; END IF;
  IF p_service_id IS NOT NULL THEN
    SELECT * INTO v_s FROM public.service_catalog WHERE id = p_service_id;
    IF v_s.id IS NULL THEN RAISE EXCEPTION 'Serviço não encontrado'; END IF;
  ELSIF length(trim(coalesce(p_custom_name,''))) = 0 THEN
    RAISE EXCEPTION 'Indica o serviço ou um nome personalizado'; END IF;
  IF coalesce(p_quantity,0) <= 0 THEN RAISE EXCEPTION 'A quantidade tem de ser maior que zero'; END IF;
  IF coalesce(p_unit_price,-1) < 0 THEN RAISE EXCEPTION 'Preço inválido'; END IF;
  IF p_due_date IS NULL THEN RAISE EXCEPTION 'Indica a data de vencimento'; END IF;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_actor;

  INSERT INTO public.extra_charges (contract_id, resident_id, service_id, custom_name, description, notes,
    quantity, unit_price, unit_label, vat_rate, due_date, created_by, created_by_name)
  VALUES (p_contract_id, v_c.resident_id, p_service_id, NULLIF(trim(coalesce(p_custom_name,'')),''),
    NULLIF(trim(coalesce(p_description,'')),''), NULLIF(trim(coalesce(p_notes,'')),''),
    p_quantity, p_unit_price, v_s.unit_label, v_s.vat_rate, p_due_date, v_actor, v_name)
  RETURNING id, amount INTO v_id, v_amount;

  IF p_pay_now AND v_amount > 0 THEN
    INSERT INTO public.payments (contract_id, extra_charge_id, kind, amount, paid_at, method, reference)
    VALUES (p_contract_id, v_id, 'extra', v_amount, coalesce(p_paid_at, current_date), p_method, NULLIF(trim(coalesce(p_reference,'')),''));
  END IF;

  INSERT INTO public.contract_activity (contract_id, actor_user_id, actor_name, kind, payload)
  VALUES (p_contract_id, v_actor, v_name, 'extra_charge_created',
    jsonb_build_object('extra_charge_id', v_id, 'name', coalesce(v_s.name, p_custom_name), 'amount', v_amount, 'paid_now', p_pay_now));
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_extra_charge(uuid,uuid,text,numeric,numeric,date,text,text,boolean,public.payment_method,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_extra_charge(uuid,uuid,text,numeric,numeric,date,text,text,boolean,public.payment_method,date,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.void_extra_charge(p_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_actor uuid := auth.uid(); v_name text; v_e public.extra_charges; v_pid uuid;
BEGIN
  IF NOT (public.has_role(v_actor,'admin') OR public.has_role(v_actor,'manager')) THEN
    RAISE EXCEPTION 'Só administradores ou gestores podem anular extras'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'Indica o motivo da anulação'; END IF;
  SELECT * INTO v_e FROM public.extra_charges WHERE id = p_id FOR UPDATE;
  IF v_e.id IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado'; END IF;
  IF v_e.status = 'voided' THEN RAISE EXCEPTION 'Este lançamento já foi anulado'; END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE extra_charge_id = p_id AND status = 'active' AND source = 'moloni') THEN
    RAISE EXCEPTION 'Tem pagamentos importados do Moloni: anula-os no Moloni'; END IF;
  FOR v_pid IN SELECT id FROM public.payments WHERE extra_charge_id = p_id AND status = 'active' LOOP
    PERFORM public.void_payment(v_pid, p_reason);
  END LOOP;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_actor;
  UPDATE public.extra_charges SET status='voided', void_reason=trim(p_reason), voided_by=v_actor,
    voided_by_name=v_name, voided_at=now() WHERE id = p_id;
  INSERT INTO public.contract_activity (contract_id, actor_user_id, actor_name, kind, payload)
  VALUES (v_e.contract_id, v_actor, v_name, 'extra_charge_voided',
    jsonb_build_object('extra_charge_id', p_id, 'amount', v_e.amount, 'reason', trim(p_reason)));
END $$;
REVOKE ALL ON FUNCTION public.void_extra_charge(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_extra_charge(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.contract_ledger WITH (security_invoker = true) AS
WITH months(n, label) AS (
  VALUES (1,'janeiro'),(2,'fevereiro'),(3,'março'),(4,'abril'),(5,'maio'),(6,'junho'),
         (7,'julho'),(8,'agosto'),(9,'setembro'),(10,'outubro'),(11,'novembro'),(12,'dezembro')
),
entries AS (
  SELECT rc.contract_id, c.resident_id, rc.due_date AS entry_date, 'rent'::text AS kind,
    'rent_charge'::text AS source, rc.id AS source_id,
    'Renda ' || m.label || ' ' || rc.year || CASE WHEN rc.prorated THEN ' (pro rata)' ELSE '' END AS description,
    rc.amount AS debit, 0::numeric AS credit, true AS counts_in_balance, 'active'::text AS status,
    b.payment_state, b.paid, b.outstanding, NULL::text AS method, NULL::text AS reference,
    rc.moloni_document_id, rc.moloni_document_number, NULL::timestamptz AS voided_at,
    NULL::text AS voided_by_name, NULL::text AS void_reason, rc.id AS rent_charge_id,
    rc.created_at, 0 AS sort_order, NULL::uuid AS extra_charge_id
  FROM public.rent_charges rc
  JOIN public.contracts c ON c.id = rc.contract_id
  JOIN months m ON m.n = rc.month
  LEFT JOIN public.rent_charge_balance b ON b.id = rc.id
  UNION ALL
  SELECT ec.contract_id, c.resident_id, ec.due_date, 'extra', 'extra_charge', ec.id,
    COALESCE(ec.description, COALESCE(s.name, ec.custom_name) ||
      CASE WHEN ec.quantity <> 1 THEN ' × ' || trim(to_char(ec.quantity,'FM999990.##')) || COALESCE(' ' || ec.unit_label, '') ELSE '' END),
    ec.amount, 0, (ec.status = 'active'), ec.status,
    CASE WHEN ec.status = 'active' THEN eb.payment_state END, eb.paid, CASE WHEN ec.status = 'active' THEN eb.outstanding ELSE 0 END,
    NULL, NULL, ec.moloni_document_id, ec.moloni_document_number, ec.voided_at, ec.voided_by_name, ec.void_reason,
    NULL, ec.created_at, 0, ec.id
  FROM public.extra_charges ec
  JOIN public.contracts c ON c.id = ec.contract_id
  LEFT JOIN public.service_catalog s ON s.id = ec.service_id
  LEFT JOIN public.extra_charge_balance eb ON eb.extra_charge_id = ec.id
  UNION ALL
  SELECT p.contract_id, c.resident_id, p.paid_at,
    CASE WHEN p.extra_charge_id IS NOT NULL THEN 'extra_payment' WHEN p.kind = 'rent' THEN 'rent_payment' ELSE p.kind::text END,
    'payment', p.id,
    CASE WHEN p.extra_charge_id IS NOT NULL THEN 'Pagamento de extra: ' || COALESCE(s2.name, ec2.custom_name, '')
    ELSE CASE p.kind
      WHEN 'rent' THEN 'Pagamento de renda ' || COALESCE(m.label || ' ' || rc.year, '')
      WHEN 'deposit' THEN 'Caução recebida'
      WHEN 'deposit_return' THEN 'Devolução de caução'
      WHEN 'booking_fee' THEN 'Taxa de reserva'
      WHEN 'extra' THEN 'Extra'
      ELSE 'Outro pagamento' END END,
    CASE WHEN p.kind = 'deposit_return' THEN p.amount ELSE 0 END,
    CASE WHEN p.kind = 'deposit_return' THEN 0 ELSE p.amount END,
    ((p.kind = 'rent' OR p.extra_charge_id IS NOT NULL) AND p.status = 'active'), p.status,
    NULL, NULL, NULL, p.method::text, p.reference,
    COALESCE(rc.moloni_document_id, ec2.moloni_document_id), COALESCE(rc.moloni_document_number, ec2.moloni_document_number),
    p.voided_at, p.voided_by_name, p.void_reason,
    p.rent_charge_id, p.created_at, 1, p.extra_charge_id
  FROM public.payments p
  JOIN public.contracts c ON c.id = p.contract_id
  LEFT JOIN public.rent_charges rc ON rc.id = p.rent_charge_id
  LEFT JOIN months m ON m.n = rc.month
  LEFT JOIN public.extra_charges ec2 ON ec2.id = p.extra_charge_id
  LEFT JOIN public.service_catalog s2 ON s2.id = ec2.service_id
  WHERE p.contract_id IS NOT NULL
)
SELECT contract_id, resident_id, entry_date, kind, source, source_id, description, debit, credit,
  counts_in_balance, status,
  SUM(CASE WHEN counts_in_balance AND status = 'active' THEN debit - credit ELSE 0 END)
    OVER (PARTITION BY contract_id ORDER BY entry_date, sort_order, created_at, source_id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance,
  payment_state, paid, outstanding, method, reference, moloni_document_id, moloni_document_number,
  voided_at, voided_by_name, void_reason, rent_charge_id, created_at, extra_charge_id
FROM entries;
GRANT SELECT ON public.contract_ledger TO authenticated, service_role;