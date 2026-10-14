import { describe, it, expect } from "vitest";
import { ledgerSummary, balanceLabel, type LedgerEntry } from "@/lib/contractLedger";

const base: Omit<LedgerEntry, "kind" | "source" | "debit" | "credit" | "countsInBalance" | "entryDate" | "sourceId"> = {
  contractId: "c", description: "", status: "active", runningBalance: 0, paymentState: null, paid: null,
  outstanding: null, method: null, reference: null, moloniDocumentNumber: null, voidedAt: null,
  voidedByName: null, voidReason: null, rentChargeId: null,
};
const rent = (id: string, date: string, amount: number, outstanding: number): LedgerEntry => ({
  ...base, sourceId: id, entryDate: date, kind: "rent", source: "rent_charge", debit: amount, credit: 0,
  countsInBalance: true, outstanding,
});
const pay = (id: string, kind: string, credit: number, debit = 0, status: "active" | "voided" = "active"): LedgerEntry => ({
  ...base, sourceId: id, entryDate: "2026-10-01", kind, source: "payment", debit, credit,
  countsInBalance: kind === "rent_payment" && status === "active", status,
});

describe("ledgerSummary", () => {
  const entries = [
    rent("r1", "2026-10-01", 850, 0),
    rent("r2", "2026-11-01", 850, 850),
    pay("p1", "rent_payment", 850),
    pay("p2", "rent_payment", 850, 0, "voided"),
    pay("d1", "deposit", 850),
    pay("b1", "booking_fee", 200),
  ];
  const s = ledgerSummary(entries, "2026-11-10");

  it("caução e taxa não contam no saldo; anulados ignorados", () => expect(s.balance).toBe(850));
  it("em atraso soma rendas vencidas por pagar", () => expect(s.overdue).toBe(850));
  it("total pago só conta pagamentos de renda ativos", () => expect(s.totalPaid).toBe(850));
  it("caução retida = recebida - devolvida", () => {
    expect(ledgerSummary([...entries, pay("x", "deposit_return", 0, 300)]).depositHeld).toBe(550);
  });
  it("etiqueta do saldo", () => {
    expect(balanceLabel(10)).toBe("por regularizar");
    expect(balanceLabel(0)).toBe("em dia");
    expect(balanceLabel(-5)).toBe("crédito a favor");
  });
});
