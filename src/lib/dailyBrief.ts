import type { LeadSubState } from "@/lib/leadContractRules";

/** Dados mínimos de uma lead para o Daily Brief (passo pendente já calculado). */
export type BriefLead = {
  id: string;
  status: string;
  createdAt: string;
  nextActionDate: string | null;
  step: { key: LeadSubState; since: string | null } | null;
  docs: "requested" | "to_validate" | null;
};

export type BriefItemKey =
  | "docs_validate"
  | "ready_agreement"
  | "ready_contract"
  | "send_form"
  | "overdue"
  | "new_leads"
  | "fee_waiting"
  | "signature_waiting"
  | "form_waiting"
  | "docs_waiting"
  | "payment_waiting";

export type BriefItem = { key: BriefItemKey; side: "team" | "client"; label: string; ids: string[] };

/** Limites (dias) a partir dos quais um passo do lado do cliente entra no follow-up. */
export const BRIEF_THRESHOLDS = { fee: 2, signature: 3, form: 3 } as const;

const LABELS: Record<BriefItemKey, [string, string]> = {
  docs_validate: ["documentos por validar", "documentos por validar"],
  ready_agreement: ["candidatura pronta para acordo", "candidaturas prontas para acordo"],
  ready_contract: ["reserva pronta para gerar contrato", "reservas prontas para gerar contrato"],
  send_form: ["formulário por enviar", "formulários por enviar"],
  overdue: ["ação agendada em atraso", "ações agendadas em atraso"],
  new_leads: ["lead nova por contactar", "leads novas por contactar"],
  fee_waiting: [`acordo sem taxa paga há mais de ${BRIEF_THRESHOLDS.fee} dias`, `acordos sem taxa paga há mais de ${BRIEF_THRESHOLDS.fee} dias`],
  signature_waiting: [`contrato por assinar há mais de ${BRIEF_THRESHOLDS.signature} dias`, `contratos por assinar há mais de ${BRIEF_THRESHOLDS.signature} dias`],
  form_waiting: [`formulário por preencher há mais de ${BRIEF_THRESHOLDS.form} dias`, `formulários por preencher há mais de ${BRIEF_THRESHOLDS.form} dias`],
  docs_waiting: ["pedido de documentos sem resposta", "pedidos de documentos sem resposta"],
  payment_waiting: ["contrato assinado à espera de caução / 1.ª renda", "contratos assinados à espera de caução / 1.ª renda"],
};

const daysSince = (iso: string | null, now: Date) =>
  iso ? (now.getTime() - new Date(iso).getTime()) / 86400000 : 0;

export const buildDailyBrief = (leads: BriefLead[], now: Date = new Date()): BriefItem[] => {
  const today = now.toISOString().slice(0, 10);
  const buckets = new Map<BriefItemKey, string[]>();
  const add = (k: BriefItemKey, id: string) => buckets.set(k, [...(buckets.get(k) ?? []), id]);

  for (const l of leads) {
    if (["won", "lost"].includes(l.status)) {
      continue;
    }
    if (l.docs === "to_validate") add("docs_validate", l.id);
    if (l.docs === "requested") add("docs_waiting", l.id);
    if (l.nextActionDate && l.nextActionDate.slice(0, 10) < today) add("overdue", l.id);
    if (l.status === "new") add("new_leads", l.id);
    const s = l.step;
    if (!s) continue;
    if (s.key === "awaiting_agreement") add("ready_agreement", l.id);
    else if (s.key === "awaiting_contract") add("ready_contract", l.id);
    else if (s.key === "send_form") add("send_form", l.id);
    else if (s.key === "awaiting_fee" && daysSince(s.since, now) > BRIEF_THRESHOLDS.fee) add("fee_waiting", l.id);
    else if (s.key === "awaiting_signature" && daysSince(s.since, now) > BRIEF_THRESHOLDS.signature) add("signature_waiting", l.id);
    else if (s.key === "awaiting_form" && daysSince(s.since, now) > BRIEF_THRESHOLDS.form) add("form_waiting", l.id);
    else if (s.key === "awaiting_payment") add("payment_waiting", l.id);
  }

  const order: BriefItemKey[] = [
    "docs_validate", "ready_contract", "ready_agreement", "send_form", "overdue", "new_leads",
    "payment_waiting", "signature_waiting", "fee_waiting", "form_waiting", "docs_waiting",
  ];
  const team = new Set<BriefItemKey>(["docs_validate", "ready_contract", "ready_agreement", "send_form", "overdue", "new_leads"]);
  return order
    .filter((k) => buckets.get(k)?.length)
    .map((k) => {
      const ids = buckets.get(k)!;
      return { key: k, side: team.has(k) ? "team" : "client", ids, label: `${ids.length} ${LABELS[k][ids.length === 1 ? 0 : 1]}` };
    });
};
