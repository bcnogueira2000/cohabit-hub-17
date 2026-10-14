import { describe, it, expect } from "vitest";
import { uniqueServiceCode } from "@/hooks/usePayments";

describe("código de serviço", () => {
  it("gera slug a partir do nome", () => {
    expect(uniqueServiceCode("Lavagem de roupa de cama", [])).toBe("lavagem-de-roupa-de-cama");
  });
  it("acrescenta sufixo numérico se já existir", () => {
    expect(uniqueServiceCode("Limpeza Extra", ["limpeza-extra", "limpeza-extra-2"])).toBe("limpeza-extra-3");
  });
});
