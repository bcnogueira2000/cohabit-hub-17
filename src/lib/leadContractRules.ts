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
