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

import { leadSubState } from "@/lib/leadContractRules";
describe("sub-estados derivados", () => {
  const l = { status: "negotiating", formSentAt: null, formSubmittedAt: null, reservationAgreementGeneratedAt: null, contractGeneratedAt: null, contractId: null };
  it("formulário enviado e não preenchido → aguarda formulário", () => {
    expect(leadSubState({ ...l, formSentAt: "x" })).toBe("awaiting_form");
  });
  it("formulário preenchido → formulário recebido", () => {
    expect(leadSubState({ ...l, formSentAt: "x", formSubmittedAt: "y" })).toBe("form_received");
  });
  it("acordo gerado e não reservada → aguarda taxa", () => {
    expect(leadSubState({ ...l, formSubmittedAt: "y", reservationAgreementGeneratedAt: "z" })).toBe("awaiting_fee");
  });
  it("reservada com acordo → sem etiqueta de taxa", () => {
    expect(leadSubState({ ...l, status: "reserved", reservationAgreementGeneratedAt: "z" })).toBeNull();
  });
  it("contrato gerado → em assinatura", () => {
    expect(leadSubState({ ...l, reservationAgreementGeneratedAt: "z", contractGeneratedAt: "c" })).toBe("awaiting_signature");
  });
  it("perdida → sem etiqueta", () => {
    expect(leadSubState({ ...l, status: "lost", formSentAt: "x" })).toBeNull();
  });
});

import { isDepositPaid, meetsWonCondition, isCheckInSoonNotWon } from "@/lib/leadContractRules";
describe("assinado ≠ contratado", () => {
  const base = { status: "reserved", formSentAt: null, formSubmittedAt: "y", reservationAgreementGeneratedAt: "z", contractGeneratedAt: "c", contractId: "k" };
  it("assinado tem prioridade sobre em assinatura", () => {
    expect(leadSubState({ ...base, contractSignedAt: "s" })).toBe("signed_awaiting_payment");
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
