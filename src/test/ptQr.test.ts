import { describe, expect, it } from "vitest";
import { findQrText, mergeQrWithAi, parsePtQr } from "../../supabase/functions/_shared/ptQr";

const SAMPLE = "A:503600380*B:999999990*C:PT*D:FT*E:N*F:20240915*G:FT 2024/123*H:CSDF7T5H-123*I1:PT*I7:100.00*I8:23.00*N:23.00*O:123.00*Q:abcd*R:9999";

describe("parsePtQr", () => {
  it("extrai os campos fiscais de um QR real", () => {
    const d = parsePtQr(SAMPLE)!;
    expect(d.supplier_nif).toBe("503600380");
    expect(d.buyer_nif).toBe("999999990");
    expect(d.invoice_number).toBe("FT 2024/123");
    expect(d.invoice_date).toBe("2024-09-15");
    expect(d.atcud).toBe("CSDF7T5H-123");
    expect(d.total_net).toBe(100);
    expect(d.total_vat).toBe(23);
    expect(d.total_gross).toBe(123);
    expect(d.vat_rate).toBe(23);
    expect(d.vat_lines).toEqual([{ rate: 23, base: 100, vat: 23 }]);
  });

  it("lê bases isentas e várias taxas", () => {
    const d = parsePtQr("A:123456789*F:20240101*G:FT 1/1*I1:PT*I2:50.00*I3:100.00*I4:6.00*I7:200.00*I8:46.00*N:52.00*O:402.00*Q:zzzz*R:1")!;
    expect(d.vat_lines).toEqual([
      { rate: 0, base: 50, vat: 0 },
      { rate: 6, base: 100, vat: 6 },
      { rate: 23, base: 200, vat: 46 },
    ]);
    expect(d.vat_rate).toBe(23);
    expect(d.total_net).toBe(350);
  });

  it("calcula o total sem IVA a partir das bases quando faltam os totais", () => {
    const d = parsePtQr("A:123456789*F:20240101*G:FT 1/2*I1:PT*I7:80.00*I8:18.40*Q:zzzz*R:1")!;
    expect(d.total_net).toBe(80);
    expect(d.total_gross).toBeNull();
  });

  it("rejeita texto que não é QR fiscal", () => {
    expect(findQrText("hello world")).toBeNull();
    expect(parsePtQr("A:123*X:y")).toBeNull();
    expect(parsePtQr(null)).toBeNull();
  });
});

describe("mergeQrWithAi", () => {
  it("o QR ganha nos campos fiscais e sinaliza divergências", () => {
    const qr = parsePtQr(SAMPLE)!;
    const { data, uncertain, source } = mergeQrWithAi(qr, {
      supplier_nif: "999999999", invoice_number: "FT 2024/999", total_gross: 130,
      supplier_name: "Fornecedor Lda", due_date: "2024-10-15", confidence: "high",
    });
    expect(source).toBe("qr");
    expect(data.supplier_nif).toBe("503600380");
    expect(data.invoice_number).toBe("FT 2024/123");
    expect(data.total_gross).toBe(123);
    expect(data.supplier_name).toBe("Fornecedor Lda");
    expect(data.due_date).toBe("2024-10-15");
    expect(uncertain).toEqual(expect.arrayContaining(["supplier_nif", "invoice_number", "total_gross"]));
    expect(uncertain).not.toContain("supplier_name");
  });

  it("sem QR, confiança baixa sinaliza os campos lidos", () => {
    const { uncertain, source } = mergeQrWithAi(null, { supplier_name: "X", total_gross: 10, confidence: "low" });
    expect(source).toBe("ai");
    expect(uncertain).toEqual(expect.arrayContaining(["supplier_name", "total_gross"]));
  });

  it("sem QR e confiança alta não sinaliza nada", () => {
    const { uncertain } = mergeQrWithAi(null, { supplier_name: "X", confidence: "high" });
    expect(uncertain).toEqual([]);
  });
});
