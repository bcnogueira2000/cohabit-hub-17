ALTER TABLE public.leads ADD COLUMN document_type text;

COMMENT ON COLUMN public.leads.document_type IS 'Tipo de documento de identificação do candidato: Cartão de Cidadão, Passaporte, Título de Residência, Outro';