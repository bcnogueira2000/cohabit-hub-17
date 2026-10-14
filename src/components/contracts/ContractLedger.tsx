import { useMemo, useState } from "react";
import { CalendarDays, Check, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PaymentStateBadge } from "@/components/payments/PaymentStateBadge";
import { useContractLedger, useCreatePayment, useCreateExtraPayment, paymentMethodLabels, type PaymentMethod } from "@/hooks/usePayments";
import { useMoloniDocumentPdf } from "@/hooks/useMoloni";
import { balanceLabel, ledgerKindLabels, ledgerSummary, type LedgerEntry } from "@/lib/contractLedger";

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

const Stat = ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) => (
  <div className="rounded-2xl bg-muted/50 px-4 py-5 text-center">
    <span className={cn("font-display text-2xl font-bold block", tone ?? "text-foreground")}>{value}</span>
    <span className="text-xs text-muted-foreground block mt-1.5">{label}</span>
    {hint && <span className="text-[11px] text-muted-foreground/80 block">{hint}</span>}
  </div>
);

const PdfButton = ({ entry }: { entry: LedgerEntry }) => {
  const pdf = useMoloniDocumentPdf();
  const has = !!entry.moloniDocumentNumber && !!entry.rentChargeId;
  if (!has) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span><Button size="sm" variant="ghost" disabled className="h-7 px-2"><FileText className="h-4 w-4" strokeWidth={1.5} /></Button></span>
          </TooltipTrigger>
          <TooltipContent>Sem documento emitido</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <Button size="sm" variant="ghost" className="h-7 px-2" disabled={pdf.isPending} onClick={() => pdf.mutate(entry.rentChargeId!)}>
      <FileText className="h-4 w-4 mr-1" strokeWidth={1.5} /> {entry.moloniDocumentNumber}
    </Button>
  );
};

const PayDialog = ({ contractId, charge, onClose }: { contractId: string; charge: LedgerEntry | null; onClose: () => void }) => {
  const create = useCreatePayment();
  const createExtra = useCreateExtraPayment();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!charge) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    if (!amount || amount <= 0) return toast.error("Indica o valor");
    try {
      const base = { contractId, amount, paidAt: String(fd.get("paidAt")), method: String(fd.get("method")) as PaymentMethod, reference: String(fd.get("reference") || "") };
      if (charge.source === "extra_charge") await createExtra.mutateAsync({ ...base, extraChargeId: charge.sourceId });
      else await create.mutateAsync({ ...base, rentChargeId: charge.sourceId });
      toast.success("Pagamento registado");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao registar pagamento");
    }
  };
  return (
    <Dialog open={!!charge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registar pagamento · {charge?.description}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Valor</Label><Input name="amount" type="number" step="0.01" defaultValue={charge?.outstanding ?? 0} /></div>
          <div><Label>Data</Label><Input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div>
            <Label>Método</Label>
            <select name="method" defaultValue="transfer" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><Label>Referência</Label><Input name="reference" /></div>
          <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "A registar…" : "Registar pagamento"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const ContractLedger = ({ contractId, code }: { contractId: string; code?: string | null }) => {
  const { data: entries = [], isLoading } = useContractLedger(contractId);
  const [kind, setKind] = useState("all");
  const [showVoided, setShowVoided] = useState(false);
  const [paying, setPaying] = useState<LedgerEntry | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const s = useMemo(() => ledgerSummary(entries, today), [entries, today]);

  const rows = entries.filter((e) => (showVoided || e.status === "active") && (kind === "all" || e.kind === kind));
  const kinds = Array.from(new Set(entries.map((e) => e.kind)));

  const exportCsv = () => {
    const head = ["Data", "Tipo", "Descrição", "A pagar", "Pago", "Saldo", "Estado", "Documento", "Conta no saldo"];
    const lines = rows.map((e) => [
      e.entryDate, ledgerKindLabels[e.kind] ?? e.kind, e.description, e.debit.toFixed(2), e.credit.toFixed(2),
      e.runningBalance.toFixed(2), e.status === "voided" ? "Anulado" : e.paymentState ?? "", e.moloniDocumentNumber ?? "",
      e.countsInBalance ? "sim" : "não",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob(["\uFEFF" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `conta-corrente-${code ?? contractId}.csv`;
    a.click();
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">A carregar…</p>;

  const balTone = s.balance > 0.005 ? "text-destructive" : s.balance < -0.005 ? "text-info" : "text-success";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Saldo atual" value={eur(Math.abs(s.balance))} hint={balanceLabel(s.balance)} tone={balTone} />
        <Stat label="Em atraso" value={eur(s.overdue)} tone={s.overdue > 0 ? "text-destructive" : "text-muted-foreground"} />
        <Stat label="Próximo pagamento" value={s.next ? eur(s.next.outstanding ?? 0) : "—"} hint={s.next ? fmtDate(s.next.entryDate) : "sem rendas futuras"} tone="text-warning" />
        <Stat label="Caução retida" value={eur(s.depositHeld)} />
        <Stat label="Total pago" value={eur(s.totalPaid)} tone="text-success" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-primary">
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} /> Próximos pagamentos
            </h3>
            {s.open.length > s.upcoming.length && (
              <span className="text-xs text-muted-foreground">+{s.open.length - s.upcoming.length} rendas futuras no extrato</span>
            )}
          </div>
          {s.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">Nada por pagar. Está tudo em dia.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {s.upcoming.map((e) => {
                const late = e.entryDate < today;
                const canPay = s.canPay(e);
                return (
                  <div key={e.sourceId} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{e.description}</div>
                      <div className={cn("text-xs", late ? "text-destructive" : "text-muted-foreground")}>
                        {late ? `Venceu ${fmtDate(e.entryDate)}` : `Vence ${fmtDate(e.entryDate)}`}
                        {e.paymentState === "partial" && " · parcial"}
                      </div>
                    </div>
                    <span className="font-display text-lg font-bold text-primary">{eur(e.outstanding ?? 0)}</span>
                    {canPay ? (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPaying(e)}>Registar</Button>
                    ) : (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <span><Button size="sm" variant="outline" className="rounded-full" disabled>Registar</Button></span>
                      </TooltipTrigger><TooltipContent>Regista primeiro a renda mais antiga em aberto</TooltipContent></Tooltip></TooltipProvider>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="font-display text-base font-semibold mb-2">Pagamentos recentes</h3>
          {s.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">Ainda sem pagamentos.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {s.recent.map((e) => (
                <div key={e.sourceId} className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                    <Check className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{e.description} · {eur(e.credit)}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(e.entryDate)}</div>
                  </div>
                  <span className="rounded-full bg-success/10 text-success text-xs font-medium px-2.5 py-0.5">Pago</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-display text-base font-semibold">Extrato</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {kinds.map((k) => <SelectItem key={k} value={k}>{ledgerKindLabels[k] ?? k}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm"><Switch checked={showVoided} onCheckedChange={setShowVoided} /> Mostrar anuladas</label>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Exportar CSV</Button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem movimentos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Data</th><th className="pr-3">Tipo</th><th className="pr-3">Descrição</th>
                  <th className="pr-3 text-right">A pagar</th><th className="pr-3 text-right">Pago</th>
                  <th className="pr-3 text-right">Saldo</th><th className="pr-3">Estado</th><th>Documento</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const voided = e.status === "voided";
                  return (
                    <tr key={e.source + e.sourceId} className={cn("border-b border-border/50 align-top", !e.countsInBalance && !voided && "text-muted-foreground")}>
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(e.entryDate)}</td>
                      <td className="pr-3 whitespace-nowrap">{ledgerKindLabels[e.kind] ?? e.kind}</td>
                      <td className="pr-3">
                        <span className={cn(voided && "line-through")}>{e.description}</span>
                        {!e.countsInBalance && !voided && <span className="block text-[11px] italic">não conta no saldo</span>}
                        {voided && (
                          <span className="block text-[11px] text-destructive">
                            Anulado{e.voidedByName ? ` por ${e.voidedByName}` : ""}: {e.voidReason}
                          </span>
                        )}
                      </td>
                      <td className={cn("pr-3 text-right whitespace-nowrap", voided && "line-through")}>{e.debit ? eur(e.debit) : ""}</td>
                      <td className={cn("pr-3 text-right whitespace-nowrap", voided && "line-through")}>{e.credit ? eur(e.credit) : ""}</td>
                      <td className="pr-3 text-right whitespace-nowrap font-medium">{e.countsInBalance ? eur(e.runningBalance) : ""}</td>
                      <td className="pr-3">
                        {voided ? <span className="text-xs text-destructive">Anulado</span>
                          : (e.source === "rent_charge" || e.source === "extra_charge") && e.paymentState ? <PaymentStateBadge state={e.paymentState} /> : null}
                      </td>
                      <td>{(e.kind === "rent" || e.kind === "rent_payment") && <PdfButton entry={e} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PayDialog contractId={contractId} charge={paying} onClose={() => setPaying(null)} />
    </div>
  );
};
