import { describe, it, expect } from "vitest";
import { findPendingAgreements, missingPersonalFields, PLACEHOLDER_NIF, type PendingCandidate } from "@/lib/leadContractRules";

const base: PendingCandidate = {
  id: "other",
  fullName: "Outra",
  status: "negotiating",
  roomId: "r1",
  plannedCheckIn: "2026-11-01",
  plannedCheckOut: "2027-03-01",
  reservationDeadline: null,
  reservationAgreementGeneratedAt: "2026-10-01T10:00:00Z",
  contractGeneratedAt: null,
};
const args = { leadId: "me", roomId: "r1", checkIn: "2027-01-01", checkOut: "2027-06-01", today: "2026-10-12" };

describe("acordos pendentes", () => {
  it("conta lead com acordo gerado, mesmo quarto e datas sobrepostas sem prazo", () => {
    expect(findPendingAgreements([base], args)).toHaveLength(1);
  });
  it("conta lead só com contrato gerado", () => {
    expect(findPendingAgreements([{ ...base, reservationAgreementGeneratedAt: null, contractGeneratedAt: "x" }], args)).toHaveLength(1);
  });
  it("não conta quarto e datas sem acordo nem contrato gerado (dispensa falhada)", () => {
    expect(findPendingAgreements([{ ...base, reservationAgreementGeneratedAt: null }], args)).toHaveLength(0);
  });
  it("não conta prazo de reserva já passado", () => {
    expect(findPendingAgreements([{ ...base, reservationDeadline: "2026-10-11" }], args)).toHaveLength(0);
  });
  it("não conta leads perdidas ou reservadas", () => {
    expect(findPendingAgreements([{ ...base, status: "lost" }, { ...base, status: "reserved" }], args)).toHaveLength(0);
  });
  it("não conta outro quarto nem datas sem sobreposição", () => {
    expect(findPendingAgreements([{ ...base, roomId: "r2" }, { ...base, plannedCheckOut: "2027-01-01" }], args)).toHaveLength(0);
  });
});

describe("dados pessoais do contrato", () => {
  const full = {
    fullName: "A", email: "a@a.pt", nationality: "PT", dateOfBirth: "2000-01-01", address: "Rua",
    postalCode: "1000-001", city: "Lisboa", documentNumber: "123", documentValidity: "2030-01-01", taxNumber: "123456789",
  };
  it("NIF 999999990 conta como preenchido", () => {
    expect(missingPersonalFields({ ...full, taxNumber: PLACEHOLDER_NIF })).toEqual([]);
  });
  it("NIF vazio falta", () => {
    expect(missingPersonalFields({ ...full, taxNumber: "" })).toEqual(["NIF"]);
  });
});

import { leadSubState, leadPendingStep, daysAgoLabel, formatLostReason, parseLostReason, isFlowLockedStatus } from "@/lib/leadContractRules";
describe("próxima ação pendente", () => {
  const l = { status: "negotiating", formSentAt: null, formSubmittedAt: null, reservationAgreementGeneratedAt: null, contractGeneratedAt: null, contractId: null };
  it("sem formulário enviado → enviar formulário", () => {
    expect(leadPendingStep(l)?.label).toBe("Pendente: enviar formulário");
    expect(leadPendingStep({ ...l, status: "proposal_sent" })?.label).toBe("Pendente: enviar formulário");
  });
  it("em contacto sem formulário → sem etiqueta", () => {
    expect(leadSubState({ ...l, status: "contacted" })).toBeNull();
  });
  it("formulário enviado e não preenchido → preenchimento, desde o envio", () => {
    const s = leadPendingStep({ ...l, formSentAt: "2026-10-01" });
    expect(s?.label).toBe("Pendente: preenchimento do formulário");
    expect(s?.since).toBe("2026-10-01");
  });
  it("formulário preenchido → gerar acordo", () => {
    expect(leadPendingStep({ ...l, formSentAt: "x", formSubmittedAt: "y" })?.label).toBe("Pendente: gerar acordo de reserva");
  });
  it("'Já tenho os dados' usado → gerar acordo", () => {
    expect(leadPendingStep({ ...l, formSentAt: "x" }, { formBypassed: true })?.label).toBe("Pendente: gerar acordo de reserva");
  });
  it("acordo gerado e não reservada → pagamento da taxa", () => {
    expect(leadPendingStep({ ...l, formSubmittedAt: "y", reservationAgreementGeneratedAt: "z" })?.label).toBe("Pendente: pagamento da taxa");
  });
  it("reservada sem contrato → gerar contrato", () => {
    expect(leadPendingStep({ ...l, status: "reserved", reservationAgreementGeneratedAt: "z" })?.label).toBe("Pendente: gerar contrato");
  });
  it("contrato gerado → assinatura", () => {
    expect(leadPendingStep({ ...l, reservationAgreementGeneratedAt: "z", contractGeneratedAt: "c" })?.label).toBe("Pendente: assinatura");
  });
  it("assinado → indica o que falta", () => {
    const s = { ...l, status: "reserved", contractGeneratedAt: "c", contractId: "k", contractSignedAt: "s" };
    expect(leadPendingStep(s)?.label).toBe("Pendente: caução / 1.ª renda");
    expect(leadPendingStep(s, { depositPaid: true, firstRentPaid: false })?.label).toBe("Pendente: 1.ª renda");
    expect(leadPendingStep(s, { depositPaid: false, firstRentPaid: true })?.label).toBe("Pendente: caução");
    expect(leadPendingStep(s, { depositPaid: false, firstRentPaid: false })?.label).toBe("Pendente: caução e 1.ª renda");
  });
  it("perdida ou contratada → sem etiqueta", () => {
    expect(leadSubState({ ...l, status: "lost", formSentAt: "x" })).toBeNull();
    expect(leadSubState({ ...l, status: "won", contractSignedAt: "s" })).toBeNull();
  });
  it("há N dias", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    expect(daysAgoLabel("2026-10-12T08:00:00Z", now)).toBe("hoje");
    expect(daysAgoLabel("2026-10-11T08:00:00Z", now)).toBe("há 1 dia");
    expect(daysAgoLabel("2026-10-07T08:00:00Z", now)).toBe("há 5 dias");
  });
});

describe("estado manual e motivo de perda", () => {
  it("reservado e contratado só mudam pelo fluxo", () => {
    expect(isFlowLockedStatus("reserved")).toBe(true);
    expect(isFlowLockedStatus("won")).toBe(true);
    expect(isFlowLockedStatus("negotiating")).toBe(false);
  });
  it("grava 'Motivo — nota' e só 'Motivo' sem nota", () => {
    expect(formatLostReason("Preço", "achou caro")).toBe("Preço — achou caro");
    expect(formatLostReason("Sem resposta", "  ")).toBe("Sem resposta");
  });
  it("lê motivo antigo de texto livre como Outro", () => {
    expect(parseLostReason("Preço — achou caro")).toEqual({ reason: "Preço", note: "achou caro" });
    expect(parseLostReason("foi para outro sítio")).toEqual({ reason: "Outro", note: "foi para outro sítio" });
  });
});

import { isDepositPaid, meetsWonCondition, isCheckInSoonNotWon } from "@/lib/leadContractRules";
describe("assinado ≠ contratado", () => {
  it("assinado tem prioridade sobre assinatura pendente", () => {
    const base = { status: "reserved", formSentAt: null, formSubmittedAt: "y", reservationAgreementGeneratedAt: "z", contractGeneratedAt: "c", contractId: "k" };
    expect(leadSubState({ ...base, contractSignedAt: "s" })).toBe("awaiting_payment");
  });
  it("caução 0 conta como paga", () => {
    expect(isDepositPaid(0, 0)).toBe(true);
  });
  it("caução parcial não conta como paga", () => {
    expect(isDepositPaid(500, 200)).toBe(false);
  });
  it("won exige assinatura, caução e 1.ª renda", () => {
    expect(meetsWonCondition({ signed: true, depositPaid: true, firstRentPaid: false })).toBe(false);
    expect(meetsWonCondition({ signed: true, depositPaid: true, firstRentPaid: true })).toBe(true);
  });
  it("entrada a menos de 7 dias e não won → alerta", () => {
    expect(isCheckInSoonNotWon("reserved", "2026-10-15", "2026-10-12")).toBe(true);
    expect(isCheckInSoonNotWon("won", "2026-10-15", "2026-10-12")).toBe(false);
    expect(isCheckInSoonNotWon("reserved", "2026-10-30", "2026-10-12")).toBe(false);
  });
});
