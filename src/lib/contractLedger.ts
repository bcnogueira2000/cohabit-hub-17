export interface LedgerEntry {
  contractId: string;
  entryDate: string;
  kind: string;
  source: "rent_charge" | "payment";
  sourceId: string;
  description: string;
  debit: number;
  credit: number;
  countsInBalance: boolean;
  status: "active" | "voided";
  runningBalance: number;
  paymentState: "paid" | "partial" | "overdue" | "due" | null;
  paid: number | null;
  outstanding: number | null;
  method: string | null;
  reference: string | null;
  moloniDocumentNumber: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
  voidReason: string | null;
  rentChargeId: string | null;
}

/** Um único mapa de etiquetas por tipo de linha da conta corrente. */
export const ledgerKindLabels: Record<string, string> = {
  rent: "Renda",
  rent_payment: "Pagamento de renda",
  deposit: "Caução",
  deposit_return: "Devolução de caução",
  booking_fee: "Taxa de reserva",
  extra: "Extra",
  other: "Outro",
};

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Saldo positivo = o residente deve. Só rendas e pagamentos de renda ativos contam. */
export const ledgerSummary = (entries: LedgerEntry[], today = new Date().toISOString().slice(0, 10)) => {
  const active = entries.filter((e) => e.status === "active");
  const balance = r2(active.filter((e) => e.countsInBalance).reduce((s, e) => s + e.debit - e.credit, 0));
  const charges = active.filter((e) => e.source === "rent_charge");
  const open = charges.filter((e) => (e.outstanding ?? 0) > 0.005).sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const overdue = r2(open.filter((e) => e.entryDate < today).reduce((s, e) => s + (e.outstanding ?? 0), 0));
  const next = open.find((e) => e.entryDate >= today) ?? null;
  const depositIn = active.filter((e) => e.kind === "deposit").reduce((s, e) => s + e.credit, 0);
  const depositOut = active.filter((e) => e.kind === "deposit_return").reduce((s, e) => s + e.debit, 0);
  const totalPaid = r2(active.filter((e) => e.kind === "rent_payment").reduce((s, e) => s + e.credit, 0));
  // Mostram-se só as rendas vencidas e a próxima; só a mais antiga em aberto pode ser paga.
  const upcoming = open.filter((e) => e.entryDate < today || e === next);
  const payableId = open[0]?.sourceId ?? null;
  const recent = active.filter((e) => e.kind === "rent_payment").sort((a, b) => b.entryDate.localeCompare(a.entryDate)).slice(0, 3);
  return { balance, overdue, next, open, upcoming, payableId, recent, depositHeld: r2(depositIn - depositOut), totalPaid };
};

export const balanceLabel = (balance: number) =>
  balance > 0.005 ? "por regularizar" : balance < -0.005 ? "crédito a favor" : "em dia";
