export interface LedgerEntry {
  contractId: string;
  entryDate: string;
  kind: string;
  source: "rent_charge" | "extra_charge" | "payment";
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
  extraChargeId?: string | null;
}

/** Um único mapa de etiquetas por tipo de linha da conta corrente. */
export const ledgerKindLabels: Record<string, string> = {
  rent: "Renda",
  rent_payment: "Pagamento de renda",
  deposit: "Caução",
  deposit_return: "Devolução de caução",
  booking_fee: "Taxa de reserva",
  extra: "Serviço extra",
  extra_payment: "Pagamento de extra",
  other: "Outro",
};

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Saldo positivo = o residente deve. Contam rendas, serviços extra e os respetivos pagamentos ativos. */
export const ledgerSummary = (entries: LedgerEntry[], today = new Date().toISOString().slice(0, 10)) => {
  const active = entries.filter((e) => e.status === "active");
  // Rendas futuras ainda não são dívida: o saldo atual só conta o que já venceu.
  const balance = r2(active.filter((e) => e.countsInBalance && (e.debit === 0 || e.entryDate <= today)).reduce((s, e) => s + e.debit - e.credit, 0));
  const charges = active.filter((e) => e.source === "rent_charge" || e.source === "extra_charge");
  const open = charges.filter((e) => (e.outstanding ?? 0) > 0.005).sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const overdue = r2(open.filter((e) => e.entryDate < today).reduce((s, e) => s + (e.outstanding ?? 0), 0));
  const next = open.find((e) => e.entryDate >= today) ?? null;
  const depositIn = active.filter((e) => e.kind === "deposit").reduce((s, e) => s + e.credit, 0);
  const depositOut = active.filter((e) => e.kind === "deposit_return").reduce((s, e) => s + e.debit, 0);
  const isPay = (e: LedgerEntry) => e.kind === "rent_payment" || e.kind === "extra_payment";
  const totalPaid = r2(active.filter(isPay).reduce((s, e) => s + e.credit, 0));
  // Mostram-se só as rendas vencidas e a próxima; só a mais antiga em aberto pode ser paga.
  // Extras em aberto aparecem sempre; nas rendas só vencidas e a próxima.
  const nextRent = open.find((e) => e.source === "rent_charge" && e.entryDate >= today) ?? null;
  const upcoming = open.filter((e) => e.source === "extra_charge" || e.entryDate < today || e === nextRent);
  // Só a renda mais antiga em aberto pode ser paga; extras pagam-se independentemente.
  const payableId = open.find((e) => e.source === "rent_charge")?.sourceId ?? null;
  const canPay = (e: LedgerEntry) => e.source === "extra_charge" || e.sourceId === payableId;
  const recent = active.filter(isPay).sort((a, b) => b.entryDate.localeCompare(a.entryDate)).slice(0, 3);
  return { balance, overdue, next, open, upcoming, payableId, canPay, recent, depositHeld: r2(depositIn - depositOut), totalPaid };
};

export const balanceLabel = (balance: number) =>
  balance > 0.005 ? "por regularizar" : balance < -0.005 ? "crédito a favor" : "em dia";
