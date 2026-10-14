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
  it("a pagar mostra vencidas + próxima e só a mais antiga é pagável", () => {
    const m = ledgerSummary([rent("a", "2026-10-01", 850, 850), rent("b", "2026-11-01", 850, 850), rent("c", "2026-12-01", 850, 850)], "2026-10-15");
    expect(m.upcoming.map((e) => e.sourceId)).toEqual(["a", "b"]);
    expect(m.payableId).toBe("a");
  });
  it("etiqueta do saldo", () => {
    expect(balanceLabel(10)).toBe("por regularizar");
    expect(balanceLabel(0)).toBe("em dia");
    expect(balanceLabel(-5)).toBe("crédito a favor");
  });
});

describe("serviços extra na conta corrente", () => {
  const base = { contractId: "c", countsInBalance: true, status: "active" as const, runningBalance: 0, paid: 0, method: null, reference: null,
    moloniDocumentNumber: null, voidedAt: null, voidedByName: null, voidReason: null, rentChargeId: null };
  const today = "2026-10-14";
  const rentOld = { ...base, entryDate: "2026-10-01", kind: "rent", source: "rent_charge" as const, sourceId: "r1", description: "R", debit: 500, credit: 0, paymentState: "overdue" as const, outstanding: 500 };
  const extra = { ...base, entryDate: "2026-10-10", kind: "extra", source: "extra_charge" as const, sourceId: "e1", description: "Kit", debit: 30, credit: 0, paymentState: "overdue" as const, outstanding: 30 };
  const extraVoid = { ...extra, sourceId: "e2", status: "voided" as const, countsInBalance: false };

  it("extra pendente soma ao saldo e o anulado não", () => {
    expect(ledgerSummary([rentOld, extra, extraVoid], today).balance).toBe(530);
  });
  it("extra pode ser pago mesmo com renda mais antiga em aberto", () => {
    const s = ledgerSummary([rentOld, extra], today);
    expect(s.canPay(extra)).toBe(true);
    expect(s.payableId).toBe("r1");
    expect(s.upcoming.map((e) => e.sourceId)).toContain("e1");
  });
  it("pagamento de extra conta no total pago", () => {
    const p = { ...base, entryDate: "2026-10-11", kind: "extra_payment", source: "payment" as const, sourceId: "p1", description: "P", debit: 0, credit: 30, paymentState: null, outstanding: null };
    expect(ledgerSummary([extra, p], today).totalPaid).toBe(30);
  });
});
