/** NIF genérico usado quando o candidato não tem NIF português — conta como preenchido. */
export const PLACEHOLDER_NIF = "999999990";

export type PersonalData = {
  fullName?: string | null;
  email?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  documentNumber?: string | null;
  documentValidity?: string | null;
  taxNumber?: string | null;
};

export const PERSONAL_FIELD_LABELS: Record<keyof PersonalData, string> = {
  fullName: "nome",
  email: "email",
  nationality: "nacionalidade",
  dateOfBirth: "data de nascimento",
  address: "morada",
  postalCode: "código postal",
  city: "localidade",
  documentNumber: "nº do documento",
  documentValidity: "validade do documento",
  taxNumber: "NIF",
};

/** Lista (labels) dos dados pessoais obrigatórios para o contrato que estão em falta. */
export const missingPersonalFields = (d: PersonalData): string[] =>
  (Object.keys(PERSONAL_FIELD_LABELS) as (keyof PersonalData)[])
    .filter((k) => !String(d[k] ?? "").trim())
    .map((k) => PERSONAL_FIELD_LABELS[k]);

export type PendingCandidate = {
  id: string;
  fullName: string;
  status: string;
  roomId: string | null;
  plannedCheckIn: string | null;
  plannedCheckOut: string | null;
  reservationDeadline: string | null;
  reservationAgreementGeneratedAt: string | null;
  contractGeneratedAt: string | null;
};

/**
 * Acordo pendente: outra lead ativa (não perdida/reservada/ganha) com acordo ou contrato gerado,
 * no mesmo quarto, com datas sobrepostas e prazo de reserva ainda não passado (sem prazo = pendente).
 */
export const findPendingAgreements = (
  candidates: PendingCandidate[],
  args: { leadId: string; roomId: string; checkIn: string; checkOut: string; today: string }
): PendingCandidate[] =>
  candidates.filter(
    (c) =>
      c.id !== args.leadId &&
      !["lost", "reserved", "won"].includes(c.status) &&
      (!!c.reservationAgreementGeneratedAt || !!c.contractGeneratedAt) &&
      c.roomId === args.roomId &&
      !!c.plannedCheckIn &&
      !!c.plannedCheckOut &&
      c.plannedCheckIn < args.checkOut &&
      c.plannedCheckOut > args.checkIn &&
      (!c.reservationDeadline || c.reservationDeadline >= args.today)
  );

export type SubStateInput = {
  status: string;
  formSentAt: string | null;
  formSubmittedAt: string | null;
  reservationAgreementGeneratedAt: string | null;
  contractGeneratedAt: string | null;
  contractId: string | null;
  contractSignedAt?: string | null;
};

export type LeadSubState =
  | "awaiting_payment"
  | "awaiting_signature"
  | "awaiting_contract"
  | "awaiting_fee"
  | "awaiting_agreement"
  | "awaiting_form"
  | "send_form";

export type PendingExtras = {
  /** undefined = ainda não se sabe (mostra "caução / 1.ª renda"). */
  depositPaid?: boolean;
  firstRentPaid?: boolean;
  /** "Já tenho os dados, avançar na mesma" usado. */
  formBypassed?: boolean;
};

export type PendingStep = { key: LeadSubState; label: string; since: string | null };

/** Próxima ação pendente (só etiqueta, nunca selecionável). Do passo mais avançado para o menos. */
export const leadPendingStep = (l: SubStateInput, x: PendingExtras = {}): PendingStep | null => {
  if (["won", "lost"].includes(l.status)) return null;
  if (l.contractSignedAt) {
    const missing: string[] = [];
    if (x.depositPaid === false) missing.push("caução");
    if (x.firstRentPaid === false) missing.push("1.ª renda");
    const what = missing.length ? missing.join(" e ") : "caução / 1.ª renda";
    return { key: "awaiting_payment", label: `Pendente: ${what}`, since: l.contractSignedAt };
  }
  if (l.contractGeneratedAt)
    return { key: "awaiting_signature", label: "Pendente: assinatura", since: l.contractGeneratedAt };
  if (l.status === "reserved") return { key: "awaiting_contract", label: "Pendente: gerar contrato", since: null };
  if (l.reservationAgreementGeneratedAt)
    return { key: "awaiting_fee", label: "Pendente: pagamento da taxa", since: l.reservationAgreementGeneratedAt };
  if (l.formSubmittedAt || x.formBypassed)
    return { key: "awaiting_agreement", label: "Pendente: gerar acordo de reserva", since: null };
  if (l.formSentAt) return { key: "awaiting_form", label: "Pendente: preenchimento do formulário", since: l.formSentAt };
  if (["proposal_sent", "negotiating"].includes(l.status))
    return { key: "send_form", label: "Pendente: enviar formulário", since: null };
  return null;
};

/** Compatibilidade: só a chave do passo pendente. */
export const leadSubState = (l: SubStateInput, x: PendingExtras = {}): LeadSubState | null =>
  leadPendingStep(l, x)?.key ?? null;

/** "hoje", "há 1 dia", "há N dias". */
export const daysAgoLabel = (iso: string, now: Date = new Date()) => {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return "hoje";
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
};

/** Motivos de perda (lista fixa). */
export const LOST_REASONS = [
  "Preço",
  "Datas incompatíveis",
  "Sem resposta",
  "Escolheu concorrência",
  "Não corresponde ao perfil",
  "Desistência pessoal",
  "Documentação não entregue",
  "Não assinou",
  "Não pagou",
  "Outro",
] as const;

export const formatLostReason = (reason: string, note?: string | null) =>
  note?.trim() ? `${reason} — ${note.trim()}` : reason;

export const parseLostReason = (v: string | null | undefined): { reason: string; note: string } => {
  const s = (v ?? "").trim();
  if (!s) return { reason: "", note: "" };
  const i = s.indexOf(" — ");
  const head = i >= 0 ? s.slice(0, i) : s;
  const tail = i >= 0 ? s.slice(i + 3) : "";
  if ((LOST_REASONS as readonly string[]).includes(head)) return { reason: head, note: tail };
  return { reason: "Outro", note: s };
};

/** Estados que só mudam pelo fluxo (Desistiu, cancelar contrato). */
export const isFlowLockedStatus = (s: string) => s === "reserved" || s === "won";

/** Caução paga: soma dos pagamentos de caução cobre a devida (caução 0 conta como paga). */
export const isDepositPaid = (due: number, paid: number) => due <= 0.005 || paid + 0.005 >= due;

/** Condição para 'won' (espelha evaluate_lead_won na BD). A taxa de reserva não entra. */
export const meetsWonCondition = (x: { signed: boolean; depositPaid: boolean; firstRentPaid: boolean }) =>
  x.signed && x.depositPaid && x.firstRentPaid;

/** Alerta: entrada a menos de 7 dias e a lead ainda não está 'won'. */
export const isCheckInSoonNotWon = (status: string, checkIn: string | null, today: string) => {
  if (!checkIn || ["won", "lost"].includes(status)) return false;
  const days = (new Date(checkIn).getTime() - new Date(today).getTime()) / 86400000;
  return days < 7;
};
