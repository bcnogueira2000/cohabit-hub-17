import { describe, it, expect } from "vitest";
import { isValidPtNif, nextCustomerNumber } from "../../supabase/functions/_shared/ptNif";

describe("isValidPtNif", () => {
  it("aceita NIF com dígito de controlo correto", () => expect(isValidPtNif("501964843")).toBe(true));
  it("rejeita dígito de controlo errado", () => expect(isValidPtNif("501964844")).toBe(false));
  it("rejeita o placeholder 999999990", () => expect(isValidPtNif("999999990")).toBe(false));
  it("rejeita menos de 9 dígitos", () => expect(isValidPtNif("12345678")).toBe(false));
});

describe("nextCustomerNumber", () => {
  it("primeira troca gera -2", () => expect(nextCustomerNumber("LC0014", ["LC0014"])).toBe("LC0014-2"));
  it("troca seguinte gera -3", () => expect(nextCustomerNumber("LC0014", ["LC0014", "LC0014-2"])).toBe("LC0014-3"));
});
