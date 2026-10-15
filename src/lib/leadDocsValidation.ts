/**
 * Validação de documentos da lead.
 * Mudar para `true` passa o aviso a bloqueio na geração de acordo/contrato.
 */
export const REQUIRE_VALIDATED_DOCS_FOR_CONTRACT = false;

/** Estado devolvido por lead_docs_status (fonte única, na base de dados). */
export type LeadDocsStatus = "none" | "requested" | "received" | "validated" | "stale";

export const LEAD_DOCS_STATUS_LABEL: Record<LeadDocsStatus, string> = {
  none: "Sem pedido",
  requested: "Pedidos",
  received: "Recebidos",
  validated: "Validados",
  stale: "Por validar (novos ficheiros)",
};

export type GeneratedDocKind = "reservation" | "contract";

export const UNVALIDATED_CONFIRM_TEXT: Record<GeneratedDocKind, string> = {
  reservation: "Esta pessoa não tem os documentos validados. Tem a certeza que quer gerar o acordo de reserva?",
  contract: "Esta pessoa não tem os documentos validados. Tem a certeza que quer gerar o contrato?",
};
