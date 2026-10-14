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
    rc.created_at, 0 AS sort_order
  FROM public.rent_charges rc
  JOIN public.contracts c ON c.id = rc.contract_id
  JOIN months m ON m.n = rc.month
  LEFT JOIN public.rent_charge_balance b ON b.id = rc.id
  UNION ALL
  SELECT p.contract_id, c.resident_id, p.paid_at,
    CASE p.kind WHEN 'rent' THEN 'rent_payment' ELSE p.kind::text END,
    'payment', p.id,
    CASE p.kind
      WHEN 'rent' THEN 'Pagamento de renda ' || COALESCE(m.label || ' ' || rc.year, '')
      WHEN 'deposit' THEN 'Caução recebida'
      WHEN 'deposit_return' THEN 'Devolução de caução'
      WHEN 'booking_fee' THEN 'Taxa de reserva'
      WHEN 'extra' THEN 'Extra'
      ELSE 'Outro pagamento' END,
    CASE WHEN p.kind = 'deposit_return' THEN p.amount ELSE 0 END,
    CASE WHEN p.kind = 'deposit_return' THEN 0 ELSE p.amount END,
    (p.kind = 'rent' AND p.status = 'active'), p.status,
    NULL, NULL, NULL, p.method::text, p.reference,
    rc.moloni_document_id, rc.moloni_document_number, p.voided_at, p.voided_by_name, p.void_reason,
    p.rent_charge_id, p.created_at, 1
  FROM public.payments p
  JOIN public.contracts c ON c.id = p.contract_id
  LEFT JOIN public.rent_charges rc ON rc.id = p.rent_charge_id
  LEFT JOIN months m ON m.n = rc.month
  WHERE p.contract_id IS NOT NULL
)
SELECT contract_id, resident_id, entry_date, kind, source, source_id, description, debit, credit,
  counts_in_balance, status,
  SUM(CASE WHEN counts_in_balance AND status = 'active' THEN debit - credit ELSE 0 END)
    OVER (PARTITION BY contract_id ORDER BY entry_date, sort_order, created_at, source_id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance,
  payment_state, paid, outstanding, method, reference, moloni_document_id, moloni_document_number,
  voided_at, voided_by_name, void_reason, rent_charge_id, created_at
FROM entries;

GRANT SELECT ON public.contract_ledger TO authenticated;
GRANT SELECT ON public.contract_ledger TO service_role;