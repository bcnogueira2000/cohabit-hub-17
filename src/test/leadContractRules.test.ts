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
